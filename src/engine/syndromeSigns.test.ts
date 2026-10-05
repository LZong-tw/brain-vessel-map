/**
 * Named syndromes and the symptom list must agree. A syndrome named for its signs (neglect,
 * Wallenberg, pure sensory stroke, locked-in …) is shown only while those signs are, and a
 * bilateral ventral pontine lesion is one bilateral picture (incomplete locked-in syndrome when
 * some movement remains; Bauer G et al., J Neurol 1979;221:77-91, PMID 92545), not two one-sided
 * crossed syndromes. A label named for the vascular pattern of the damaged tissue (territory,
 * watershed) stays while the tissue is damaged, but is marked clinically silent once no symptom
 * from that side remains.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const inputOf = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return {
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH: sc.tH ?? 24,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  };
};
const scenario = (id: string, tH: number) => simulate(inputOf(id, { tH }));
const occlusion = (occlusions: Occlusion[], tH: number, collateral: CollateralGrade = 'good') =>
  simulate({ occlusions, variants: [], collateral, map: 93, tH, reperfusionH: null, decompression: false });
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const labels = (r: SimResult) => r.syndromes.map((s) => s.def.id + (s.side ? `_${s.side}` : ''));
const sym = (r: SimResult) => r.symptoms.map((s) => `${s.id}(${s.side ?? '-'})`);

describe('a syndrome named for its signs is shown only with them', () => {
  it('right ACA: the neglect label follows the neglect, while the ACA territory label stays', () => {
    const d1 = scenario('r_aca', 24);
    expect(d1.symptoms.some((s) => s.id === 'neglect')).toBe(true);
    expect(labels(d1)).toEqual(expect.arrayContaining(['aca_r', 'neglect_r']));
    // three months on the neglect has been compensated away, so "ignores the left side … denies
    // the paralysis" no longer describes the patient
    const m3 = scenario('r_aca', 2160);
    expect(m3.symptoms.some((s) => s.id === 'neglect')).toBe(false);
    expect(labels(m3)).toContain('aca_r');
    expect(labels(m3)).not.toContain('neglect_r');
  });

  it('a PICA occlusion that gives the lateral medullary signs is named a Wallenberg syndrome too', () => {
    for (const tH of [24, 2160]) {
      const r = scenario('r_pica', tH);
      // ipsilateral Horner and facial pain/temperature loss, contralateral body pain/temperature loss
      expect(sym(r)).toEqual(expect.arrayContaining(['horner(r)', 'pain_temp_face(r)', 'pain_temp_body(l)']));
      expect(labels(r), `${tH} h`).toEqual(expect.arrayContaining(['pica_cerebellar_r', 'wallenberg_r']));
    }
    // the vertebral (classic) Wallenberg keeps its label
    expect(labels(scenario('r_wallenberg', 24))).toContain('wallenberg_r');
  });

  it('thalamogeniculate occlusion with ataxia and involuntary movements is not a "pure sensory" stroke', () => {
    const r = occlusion(occl('thalamogeniculate_l'), 24);
    expect(sym(r)).toEqual(expect.arrayContaining(['sens_hemibody(r)', 'ataxia_limb(r)', 'movement_disorder(r)']));
    expect(labels(r)).toContain('thalamic_sensory_l');
    expect(labels(r)).not.toContain('lacunar_pure_sensory_l');
    // a single-branch thalamic lacune spares those functions and is a pure sensory stroke
    const lacune = occlusion([{ vessel: 'thalamogeniculate_l', severity: 1, branch: true }], 24);
    expect(sym(lacune).some((s) => s.startsWith('ataxia_limb') || s.startsWith('movement_disorder'))).toBe(false);
    expect(labels(lacune)).toContain('lacunar_pure_sensory_l');
    // bilateral P2 occlusion: never two "pure sensory lacunar strokes"
    const p2 = occlusion(occl('pca_p2_r', 'pca_p2_l'), 24);
    expect(labels(p2).some((l) => l.startsWith('lacunar_pure_sensory'))).toBe(false);
  });
});

describe('bilateral ventral pons', () => {
  it.each(['good', 'moderate', 'poor'] as CollateralGrade[])(
    'lower basilar occlusion (%s collaterals): one incomplete locked-in label, not two Millard–Gubler syndromes',
    (collateral) => {
      for (const tH of [24, 2160]) {
        const r = occlusion(occl('basilar_lower'), tH, collateral);
        // quadriparesis with some movement left, no speech
        expect(sym(r)).toEqual(expect.arrayContaining(['anarthria(-)', 'arm_weak(r)', 'arm_weak(l)']));
        expect(r.symptoms.filter((s) => s.id === 'arm_weak').every((s) => s.sev < 3)).toBe(true);
        expect(labels(r), `${collateral} ${tH} h`).toContain('locked_in_incomplete');
        expect(labels(r).filter((l) => l.startsWith('pontine_ventral')), `${collateral} ${tH} h`).toEqual([]);
      }
    },
  );

  it('the classic (mid-basilar) locked-in syndrome is not also called incomplete', () => {
    const r = scenario('basilar_mid', 24);
    expect(labels(r)).toEqual(['locked_in']);
  });

  it('a one-sided ventral pontine lesion keeps its crossed syndrome', () => {
    const r = occlusion([{ vessel: 'pontine_paramedian_caudal_l', severity: 1, branch: true }], 24);
    expect(labels(r)).toContain('pontine_ventral_l');
    expect(labels(r)).not.toContain('locked_in_incomplete');
  });
});

describe('a label named for the vascular pattern is marked clinically silent when no symptom is left', () => {
  it('watershed (border-zone) infarct: symptomatic at 24 h, silent at 3 months', () => {
    const d1 = scenario('watershed', 24);
    const w1 = d1.syndromes.find((s) => s.def.id === 'watershed');
    expect(w1?.side).toBe('r');
    expect(w1?.silent ?? false).toBe(false);
    const m3 = scenario('watershed', 2160);
    expect(m3.symptoms).toEqual([]);
    const w3 = m3.syndromes.find((s) => s.def.id === 'watershed');
    expect(w3).toBeDefined();
    expect(w3?.silent).toBe(true);
  });

  it('a syndrome named for its signs is never "silent": it is simply not shown', () => {
    for (const id of ['r_aca', 'r_pica', 'l_thalamic']) {
      for (const tH of [24, 2160]) {
        for (const m of scenario(id, tH).syndromes) if (!m.def.pattern) expect(m.silent ?? false, `${id} ${tH} ${m.def.id}`).toBe(false);
      }
    }
  });
});
