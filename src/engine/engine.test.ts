import { describe, expect, it } from 'vitest';
import { BEDS } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { dropEmbolus } from './embolus';
import { simulateHemodynamics, type HemoInput } from './hemodynamics';
import { simulate, type SimInput } from './simulate';
import { infarctFraction, tauHours } from './tissue';

const base: HemoInput = { occlusions: [], variants: [], map: 93, collateral: 'good' };
const occl = (...ids: string[]) => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (over: Partial<SimInput>) =>
  simulate({ ...base, tH: 24, reperfusionH: null, decompression: false, ...over });
const syndromeIds = (r: ReturnType<typeof simulate>) => r.syndromes.map((s) => s.def.id + (s.side ? `_${s.side}` : ''));

describe('baseline haemodynamics', () => {
  const h = simulateHemodynamics(base);

  it('perfuses every bed normally', () => {
    for (const b of BEDS) expect(h.bedRel[b.id], b.id).toBeGreaterThan(0.97);
  });

  it('produces physiological flow magnitudes (mL/min)', () => {
    expect(h.vesselFlow.ica_cervical_r).toBeGreaterThan(180);
    expect(h.vesselFlow.ica_cervical_r).toBeLessThan(320);
    expect(h.vesselFlow.basilar_lower).toBeGreaterThan(70);
    expect(h.vesselFlow.basilar_lower).toBeLessThan(160);
    expect(h.vesselFlow.mca_m1_l).toBeGreaterThan(h.vesselFlow.aca_a1_l);
    expect(Math.abs(h.vesselFlow.acomm)).toBeLessThan(10);
    expect(h.totalCbf).toBeGreaterThan(450);
    expect(h.totalCbf).toBeLessThan(900);
  });

  it('autoregulates within the normal MAP range (border zones are the least protected)', () => {
    const lo = simulateHemodynamics({ ...base, map: 70 });
    for (const b of BEDS) expect(lo.bedRel[b.id], b.id).toBeGreaterThan(b.terr.length === 2 ? 0.75 : 0.9);
  });

  it('severe hypotension infarcts border zones before core territories', () => {
    const r = sim({ map: 50 });
    let border = 0;
    let other = 0;
    for (const b of BEDS) {
      const v = r.beds[b.id].infarct * b.volume;
      if (b.terr.length === 2) border += v;
      else other += v;
    }
    expect(border).toBeGreaterThan(10);
    expect(other).toBeLessThan(border * 0.2);
  });
});

describe('collateral circulation', () => {
  it('reverses AComm / PComm / ophthalmic flow after ICA occlusion', () => {
    const h = simulateHemodynamics({ ...base, occlusions: occl('ica_cervical_r') });
    expect(h.reversed).toEqual(expect.arrayContaining(['acomm', 'pcomm_r', 'ophthalmic_r']));
  });

  it('compensates an ICA occlusion when the circle of Willis is complete but not when isolated', () => {
    const complete = sim({ occlusions: occl('ica_cervical_r') });
    const isolated = sim({ occlusions: occl('ica_cervical_r'), variants: ['acomm_absent', 'pcomm_absent_r'] });
    expect(complete.volumes.core).toBeLessThan(40);
    expect(isolated.volumes.core).toBeGreaterThan(250);
  });

  it('orders infarct size by collateral grade', () => {
    const v = (c: 'good' | 'moderate' | 'poor') => sim({ occlusions: occl('mca_m1_r'), collateral: c, tH: 1 }).volumes.core;
    expect(v('good')).toBeLessThan(v('moderate'));
    expect(v('moderate')).toBeLessThan(v('poor'));
  });

  it('shows subclavian steal', () => {
    const r = sim({ occlusions: occl('subclavian_prox_l'), tH: 1 });
    expect(r.hemo.reversed).toContain('va_extracranial_l');
    expect(syndromeIds(r)).toContain('subclavian_steal_l');
  });

  it('keeps the basilar perfused when one vertebral artery is lost proximally', () => {
    const r = sim({ occlusions: occl('va_extracranial_l') });
    expect(r.volumes.core).toBeLessThan(2);
  });
});

describe('tissue fate over time', () => {
  it('core dies within minutes, penumbra over hours', () => {
    expect(infarctFraction(0.1, 0.25, null)).toBeGreaterThan(0.8);
    expect(tauHours(0.45)).toBeGreaterThan(3);
    expect(infarctFraction(0.45, 1, null)).toBeLessThan(0.3);
    expect(infarctFraction(0.45, 48, null)).toBeGreaterThan(0.9);
    expect(infarctFraction(0.7, 48, null)).toBe(0);
  });

  it('early reperfusion saves tissue that late reperfusion does not', () => {
    const early = sim({ occlusions: occl('mca_m1_l'), reperfusionH: 1 });
    const late = sim({ occlusions: occl('mca_m1_l'), reperfusionH: 12 });
    const none = sim({ occlusions: occl('mca_m1_l') });
    expect(early.volumes.core).toBeLessThan(late.volumes.core);
    expect(late.volumes.core).toBeLessThanOrEqual(none.volumes.core + 1e-6);
    expect(early.volumes.saved).toBeGreaterThan(50);
  });

  it('infarct grows between 1 h and 24 h when untreated', () => {
    expect(sim({ occlusions: occl('mca_m1_l'), tH: 1 }).volumes.core).toBeLessThan(
      sim({ occlusions: occl('mca_m1_l'), tH: 24 }).volumes.core,
    );
  });
});

describe('classic syndromes', () => {
  const cases: [string, Partial<SimInput>, string][] = [
    ['left M1', { occlusions: occl('mca_m1_l') }, 'mca_complete_l'],
    ['left M2 superior', { occlusions: occl('mca_m2_sup_l') }, 'mca_superior_l'],
    ['left M2 inferior', { occlusions: occl('mca_m2_inf_l') }, 'mca_inferior_l'],
    ['right vertebral V4', { occlusions: occl('va_v4_dist_r') }, 'wallenberg_r'],
    ['right ASA root', { occlusions: occl('asa_root_r') }, 'dejerine_r'],
    ['mid basilar', { occlusions: occl('basilar_mid') }, 'locked_in'],
    ['left AICA', { occlusions: occl('aica_l'), collateral: 'moderate' }, 'aica_l'],
    ['right SCA', { occlusions: occl('sca_r'), collateral: 'poor' }, 'sca_r'],
    ['left lenticulostriate', { occlusions: occl('lenticulostriate_l') }, 'lacunar_pure_motor_l'],
    ['left thalamogeniculate', { occlusions: occl('thalamogeniculate_l') }, 'thalamic_sensory_l'],
    ['right AChA', { occlusions: occl('acha_r') }, 'acha_r'],
    ['Percheron', { occlusions: occl('thalamoperforator_r'), variants: ['percheron_r'] }, 'thalamic_paramedian_bilateral'],
    ['right ophthalmic', { occlusions: occl('ophthalmic_r') }, 'amaurosis_r'],
    ['left pontine perforator', { occlusions: occl('pontine_paramedian_caudal_l') }, 'pontine_ventral_l'],
  ];
  it.each(cases)('%s', (_n, input, expected) => {
    expect(syndromeIds(sim(input))).toContain(expected);
  });

  it('flags that NIHSS underestimates posterior strokes', () => {
    const r = sim({ occlusions: occl('va_v4_dist_r') });
    expect(r.nihss.total).toBeLessThanOrEqual(4);
    expect(r.nihss.posteriorCaveat).toBe(true);
  });

  it('merges quadrantanopias into hemianopia and aphasias into global aphasia', () => {
    const r = sim({ occlusions: occl('mca_m1_l'), collateral: 'poor' });
    const ids = r.symptoms.map((s) => s.id);
    expect(ids).toContain('aphasia_global');
    expect(ids).not.toContain('aphasia_broca');
  });

  it('places crossed signs correctly (ipsilateral cranial nerve, contralateral limbs)', () => {
    const r = sim({ occlusions: occl('pontine_paramedian_caudal_l') });
    expect(r.symptoms.find((s) => s.id === 'cn6_palsy')?.side).toBe('l');
    expect(r.symptoms.find((s) => s.id === 'arm_weak')?.side).toBe('r');
  });
});

describe('downstream cascade', () => {
  it('malignant MCA oedema herniates into ACA/PCA territories without surgery', () => {
    const r = sim({ occlusions: occl('mca_m1_r'), collateral: 'poor', tH: 96 });
    const ids = r.cascade.events.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['malignant_edema_r', 'subfalcine_r', 'uncal_r']));
    const withSurgery = sim({ occlusions: occl('mca_m1_r'), collateral: 'poor', tH: 96, decompression: true });
    expect(withSurgery.cascade.events.map((e) => e.id)).not.toContain('uncal_r');
    expect(withSurgery.volumes.core).toBeLessThan(r.volumes.core);
  });

  it('large cerebellar infarcts cause hydrocephalus', () => {
    const r = sim({ occlusions: occl('pica_r'), collateral: 'poor', tH: 48 });
    expect(r.hydrocephalus).toBe(true);
  });

  it('predicts crossed cerebellar diaschisis and Wallerian degeneration after motor infarcts', () => {
    const r = sim({ occlusions: occl('mca_m1_l'), tH: 720 });
    const ids = r.cascade.events.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['ccd_l', 'wallerian_l']));
    expect(r.regions.cerebellum_superior_r.effect).toBe('diaschisis');
    expect(r.regions.pons_caudal_basis_l.effect).toBe('degeneration');
  });

  it('predicts hypertrophic olivary degeneration after dentate infarction', () => {
    const r = sim({ occlusions: occl('sca_r'), collateral: 'poor', tH: 2160 });
    expect(r.cascade.events.map((e) => e.id)).toContain('hod_r');
    expect(r.regions.medulla_lateral_l.effect).toBe('degeneration');
  });
});

describe('embolus', () => {
  const h = simulateHemodynamics(base);
  it('is deterministic for a seed', () => {
    expect(dropEmbolus('heart', 2.9, h, 42)).toEqual(dropEmbolus('heart', 2.9, h, 42));
  });
  it('large cardiac emboli mostly lodge at the carotid T or proximal trunks', () => {
    const hits: Record<string, number> = {};
    for (let s = 1; s <= 200; s++) {
      const e = dropEmbolus('carotid_l', 4.2, h, s);
      hits[e.lodged] = (hits[e.lodged] ?? 0) + 1;
    }
    const top = Object.entries(hits).sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toMatch(/^ica_/);
  });
  it('small carotid emboli favour MCA branches over the ACA', () => {
    let mca = 0;
    let aca = 0;
    for (let s = 1; s <= 300; s++) {
      const e = dropEmbolus('carotid_r', 1.6, h, s);
      if (e.lodged.startsWith('mca_')) mca++;
      if (e.lodged.startsWith('aca_')) aca++;
    }
    expect(mca).toBeGreaterThan(aca * 2);
  });
});

describe('scenarios', () => {
  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s runs', (_id, sc) => {
    const r = sim({
      occlusions: sc.occlusions,
      variants: sc.variants ?? [],
      map: sc.map ?? 93,
      collateral: sc.collateral ?? 'good',
      tH: sc.tH ?? 24,
      reperfusionH: sc.reperfusionH ?? null,
      decompression: sc.decompression ?? false,
    });
    expect(r.nihss.total).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(r.volumes.core)).toBe(true);
  });
});
