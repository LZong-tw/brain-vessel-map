import { describe, expect, it } from 'vitest';
import { BEDS } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { aggregateSymptoms } from './clinical';
import { dropEmbolus } from './embolus';
import { simulateHemodynamics, type HemoInput } from './hemodynamics';
import { simulate, type SimInput } from './simulate';
import { finalInfarctProb, infarctFraction, tauHours } from './tissue';

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
    expect(infarctFraction(0.32, 48, null)).toBeGreaterThan(0.9);
    // untreated penumbra is partly lost, the more the lower its flow
    expect(infarctFraction(0.45, 240, null)).toBeGreaterThan(0.4);
    expect(infarctFraction(0.45, 240, null)).toBeLessThan(0.7);
    expect(finalInfarctProb(0.35)).toBeGreaterThan(finalInfarctProb(0.5));
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

  it('recanalisation reopens the vessel at the chosen time, not before', () => {
    const before = sim({ occlusions: occl('mca_m1_l'), reperfusionH: 2, tH: 1 });
    const after = sim({ occlusions: occl('mca_m1_l'), reperfusionH: 2, tH: 24 });
    expect(before.recanalized).toBe(false);
    expect(before.activeOcclusions).toHaveLength(1);
    expect(before.hemo.totalCbf).toBeLessThan(before.hemo.baselineCbf * 0.95);
    expect(after.recanalized).toBe(true);
    expect(after.activeOcclusions).toHaveLength(0);
    expect(after.hemo.totalCbf).toBeCloseTo(after.hemo.baselineCbf, 0);
    expect(after.volumes.penumbra).toBeLessThan(1);
  });

  it('"reperfusion" does not remove a stenosis', () => {
    const occ = [{ vessel: 'ica_cervical_r', severity: 0.85 }];
    const untreated = sim({ occlusions: occ, map: 60, tH: 2160 });
    const treated = sim({ occlusions: occ, map: 60, tH: 2160, reperfusionH: 2 });
    expect(treated.activeOcclusions).toEqual(occ);
    expect(treated.volumes.core).toBeCloseTo(untreated.volumes.core, 5);
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
    ['left M2 superior', { occlusions: occl('mca_m2_sup_l'), collateral: 'moderate' }, 'mca_superior_l'],
    ['left M2 inferior', { occlusions: occl('mca_m2_inf_l') }, 'mca_inferior_l'],
    ['right vertebral V4', { occlusions: occl('va_v4_dist_r') }, 'wallenberg_r'],
    ['right ASA root', { occlusions: occl('asa_root_r') }, 'dejerine_r'],
    ['mid basilar', { occlusions: occl('basilar_mid') }, 'locked_in'],
    ['left AICA', { occlusions: occl('aica_l'), collateral: 'moderate' }, 'aica_l'],
    ['right SCA', { occlusions: occl('sca_r'), collateral: 'poor' }, 'sca_r'],
    ['left lenticulostriate group', { occlusions: occl('lenticulostriate_l') }, 'striatocapsular_l'],
    ['left thalamogeniculate', { occlusions: occl('thalamogeniculate_l') }, 'thalamic_sensory_l'],
    ['right AChA', { occlusions: occl('acha_r') }, 'acha_r'],
    ['Percheron', { occlusions: occl('thalamoperforator_r'), variants: ['percheron_r'] }, 'thalamic_paramedian_bilateral'],
    ['right ophthalmic', { occlusions: occl('ophthalmic_r') }, 'amaurosis_r'],
    ['left pontine perforator', { occlusions: occl('pontine_paramedian_caudal_l') }, 'foville_l'],
    ['right pontine circumferential', { occlusions: occl('pontine_circumferential_r') }, 'one_and_half_r'],
    // R2-7: a vertebral occlusion that takes its own ASA root too; with the whole ASA hanging on
    // that vertebral, both medial medullae are lost: one bilateral label, not a hemimedullary one
    ['right VA with its ASA root', { occlusions: occl('va_v4_dist_r', 'asa_root_r') }, 'hemimedullary_r'],
    ['right VA with a unilateral ASA', { occlusions: occl('va_v4_dist_r'), variants: ['asa_unilateral_r'] }, 'bilateral_medial_medullary'],
    ['one lenticulostriate branch', { occlusions: [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }] }, 'lacunar_pure_motor_l'],
    ['one rostral pontine branch', { occlusions: [{ vessel: 'pontine_paramedian_rostral_r', severity: 1, branch: true }] }, 'pontine_lacunar_r'],
    ['one caudal pontine branch', { occlusions: [{ vessel: 'pontine_paramedian_caudal_l', severity: 1, branch: true }] }, 'pontine_ventral_l'],
    [
      'thalamic + capsular lacunes',
      {
        occlusions: [
          { vessel: 'thalamogeniculate_l', severity: 1, branch: true },
          { vessel: 'lenticulostriate_l', severity: 1, branch: true },
        ],
      },
      'lacunar_sensorimotor_l',
    ],
    ['right mesencephalic perforators', { occlusions: occl('mesencephalic_perf_r') }, 'weber_benedikt_r'],
    ['right ACA, poor collaterals', { occlusions: occl('aca_a2_r'), collateral: 'poor' }, 'aca_r'],
  ];
  it.each(cases)('%s', (_n, input, expected) => {
    expect(syndromeIds(sim(input))).toContain(expected);
  });

  it('flags that NIHSS underestimates posterior strokes', () => {
    const r = sim({ occlusions: occl('va_v4_dist_r') });
    // (Y2-8: the ataxia of the arm and the leg counts as two limbs: 5)
    expect(r.nihss.total).toBeLessThanOrEqual(5);
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

describe('clinical details that are easy to get wrong', () => {
  const symptomIds = (r: ReturnType<typeof simulate>) => r.symptoms.map((x) => x.id + (x.side ? `(${x.side})` : ''));

  it('a lacune is tiny but strategic, and spares sensation when it is pure motor', () => {
    const r = sim({ occlusions: [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }] });
    expect(r.volumes.finalInfarct).toBeLessThan(2);
    const ids = symptomIds(r);
    expect(ids).toEqual(expect.arrayContaining(['face_weak(r)', 'arm_weak(r)', 'leg_weak(r)']));
    expect(ids.some((x) => x.startsWith('sens_'))).toBe(false);
    // flow is unchanged and recanalisation does not remove it
    expect(r.hemo.totalCbf).toBeCloseTo(r.hemo.baselineCbf, 0);
    const late = sim({ occlusions: [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }], reperfusionH: 1 });
    expect(late.activeOcclusions).toHaveLength(1);
  });

  it('PCA infarcts can spare central vision (dual supply of the occipital pole)', () => {
    const ids = symptomIds(sim({ occlusions: occl('pca_p2_l'), collateral: 'poor' }));
    expect(ids).toEqual(expect.arrayContaining(['hemianopia(r)', 'macular_sparing']));
  });

  it('a proximal basilar occlusion still cuts off the lowest pontine perforators', () => {
    const r = sim({ occlusions: occl('basilar_lower') });
    expect(r.regions.pons_caudal_basis_r.dys).toBeGreaterThan(0.25);
    expect(r.regions.pons_caudal_basis_l.dys).toBeGreaterThan(0.25);
  });

  it('a capsular infarct causes no visual field loss', () => {
    expect(symptomIds(sim({ occlusions: occl('lenticulostriate_l') })).some((x) => x.startsWith('hemianopia'))).toBe(false);
  });

  it('locked-in patients are awake', () => {
    const r = sim({ occlusions: occl('basilar_mid') });
    expect(syndromeIds(r)).toContain('locked_in');
    expect(r.symptoms.map((x) => x.id)).not.toContain('coma');
  });

  it('midbrain crossed syndrome: ipsilateral CN III, contralateral limbs', () => {
    const ids = symptomIds(sim({ occlusions: occl('mesencephalic_perf_r') }));
    expect(ids).toEqual(expect.arrayContaining(['cn3_palsy(r)', 'arm_weak(l)', 'leg_weak(l)']));
  });

  it('an occipital-pole lesion alone gives a central scotoma, not a hemianopia', () => {
    // (a P2 occlusion with moderate collaterals served here before; it now infarcts the calcarine
    // cortex and gives a hemianopia, C1-F3)
    const pole = { occipital_pole_l: 0.9 };
    const ids = aggregateSymptoms(pole, pole, 24).map((x) => x.id + (x.side ? `(${x.side})` : ''));
    expect(ids).toContain('central_scotoma(r)');
    expect(ids.some((x) => x.startsWith('hemianopia'))).toBe(false);
  });

  it('hydrocephalus causes drowsiness and upgaze palsy, not bilateral horizontal gaze palsy', () => {
    // a cerebellar infarct of ≥ 38 mL (PICA + SCA) swells; a PICA infarct alone is only watched (C4-F3)
    const r = sim({ occlusions: occl('pica_r', 'sca_r'), collateral: 'poor', tH: 48 });
    const ids = symptomIds(r);
    expect(ids).toEqual(expect.arrayContaining(['coma', 'upgaze_palsy']));
    expect(ids).not.toContain('gaze_palsy_horizontal(l)');
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

  it('midline shift peaks around day 3 and is largely relieved by decompression', () => {
    // the oedema model's shift is the only one (C4-F2: the cascade no longer keeps its own)
    const at = (tH: number, decompression = false) => sim({ occlusions: occl('mca_m1_r'), collateral: 'poor', tH, decompression }).edema.midlineShiftMm;
    expect(at(12)).toBeLessThan(3);
    expect(at(72)).toBeGreaterThan(at(36));
    expect(at(72)).toBeGreaterThan(at(720));
    expect(at(72, true)).toBeLessThan(at(72) / 2);
  });

  it('good collaterals keep an untreated M1 infarct below the malignant range', () => {
    const good = sim({ occlusions: occl('mca_m1_l'), collateral: 'good', tH: 96 });
    const ids = good.cascade.events.map((e) => e.id);
    expect(ids).not.toContain('malignant_edema_l');
    expect(ids).toContain('mass_effect_l');
    expect(good.volumes.finalInfarct).toBeLessThan(sim({ occlusions: occl('mca_m1_l'), collateral: 'moderate' }).volumes.finalInfarct);
  });

  it('describes the primary vascular syndrome, not the herniation-related secondary infarcts', () => {
    const r = sim({ occlusions: occl('mca_m1_r'), collateral: 'poor', tH: 120 });
    const ids = syndromeIds(r);
    expect(ids).toContain('mca_complete_r');
    expect(ids).not.toContain('ica_territory_r');
  });

  it('large cerebellar infarcts cause hydrocephalus', () => {
    const r = sim({ occlusions: occl('pica_r', 'sca_r'), collateral: 'poor', tH: 48 });
    expect(r.hydrocephalus).toBe(true);
    // a full PICA infarct (~34 mL) is space-occupying but under the 38 mL of a likely malignant swelling (C4-F3)
    expect(sim({ occlusions: occl('pica_r'), collateral: 'poor', tH: 48 }).hydrocephalus).toBe(false);
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
    // the olive lies in the anterior (medial) medullary territory
    expect(r.regions.medulla_medial_l.effect).toBe('degeneration');
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
