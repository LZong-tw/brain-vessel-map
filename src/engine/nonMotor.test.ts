/**
 * Localised non-motor symptoms (sleep, emotional expression, temperature regulation and sweating,
 * taste, bladder): where they come from, on which side, when they appear and how they settle.
 * Citations are next to each symptom in src/anatomy/symptoms.ts and each deficit in
 * src/anatomy/regions.ts. None of them is scored by the NIHSS, and none changes a named syndrome.
 */
import { describe, expect, it } from 'vitest';
import { REDUNDANCY } from '../anatomy/redundancy';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { aggregateSymptoms, type SymptomItem } from './clinical';
import type { Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const NEW_SYMPTOMS = [
  'hypersomnia',
  'rbd',
  'central_sleep_apnoea',
  'emotionalism',
  'hypohidrosis',
  'hyperhidrosis',
  'cold_limb',
  'urinary_retention',
  'taste_loss',
] as const;
/** present only from the chronic phase on (`delayed`) */
const CHRONIC = ['hypersomnia', 'rbd', 'emotionalism', 'cold_limb'];

const inputOf = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc) throw new Error(`no scenario ${id}`);
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
const occlusion = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'good', map: 93, tH, reperfusionH: null, decompression: false, ...over });
const find = (r: SimResult | SymptomItem[], id: string) => (Array.isArray(r) ? r : r.symptoms).filter((s) => s.id === id);
const ids = (r: SimResult) => r.symptoms.map((s) => s.id);

describe('localised non-motor symptoms: catalogue', () => {
  it('are defined in the new systems, without NIHSS points, with a deliberate recovery behaviour', () => {
    const system: Record<string, string> = {
      hypersomnia: 'sleep',
      rbd: 'sleep',
      central_sleep_apnoea: 'sleep',
      emotionalism: 'mood',
      emotional: 'mood',
      hypohidrosis: 'thermo',
      hyperhidrosis: 'thermo',
      cold_limb: 'thermo',
      urinary_retention: 'autonomic',
      taste_loss: 'cranial',
    };
    for (const [id, sys] of Object.entries(system)) {
      const def = SYMPTOM_BY_ID[id];
      expect(def, id).toBeDefined();
      expect(def.system, id).toBe(sys);
      // the NIHSS does not score any of these
      expect(def.nihss, id).toBeUndefined();
    }
    for (const id of NEW_SYMPTOMS) {
      expect(REDUNDANCY[id], `${id} needs an entry in redundancy.ts`).toBeDefined();
      expect(!!SYMPTOM_BY_ID[id].delayed, id).toBe(CHRONIC.includes(id));
    }
  });
});

describe('sleep', () => {
  it('mid-basilar occlusion: REM sleep behaviour disorder in the chronic phase, not acutely; none after a left M1', () => {
    expect(ids(scenario('basilar_mid', 24))).not.toContain('rbd');
    for (const tH of [720, 2160, 4320]) expect(ids(scenario('basilar_mid', tH)), `${tH} h`).toContain('rbd');
    for (const tH of [24, 2160, 4320]) expect(ids(scenario('l_m1', tH)), `${tH} h`).not.toContain('rbd');
  });

  it('Percheron (both paramedian thalami): hypersomnia persists at 1–3 months, worse than after one thalamus', () => {
    // the acute phase is drowsiness / reduced consciousness (NIHSS 1a), not this
    expect(ids(scenario('percheron', 24))).not.toContain('hypersomnia');
    const m1 = find(scenario('percheron', 720), 'hypersomnia');
    const m3 = find(scenario('percheron', 2160), 'hypersomnia');
    expect(m1).toHaveLength(1);
    expect(m3).toHaveLength(1);
    expect(m1[0].side).toBeNull();
    expect(m1[0].sev).toBe(2);
    // improves, but is still there (Hermann et al. 2008)
    expect(m3[0].sev).toBeLessThanOrEqual(m1[0].sev);
    const oneSide = find(occlusion([{ vessel: 'thalamoperforator_l', severity: 1 }], 720), 'hypersomnia');
    expect(oneSide).toHaveLength(1);
    expect(oneSide[0].sev).toBeLessThan(m1[0].sev);
    expect(oneSide[0].recovery?.bilateral).toBe(false);
    expect(m1[0].recovery?.bilateral).toBe(true);
  });

  it('no separate hypersomnia in an unrousable patient', () => {
    const inf = { thalamus_paramedian_r: 1, thalamus_paramedian_l: 1 };
    const coma = (sev: 1 | 2 | 3): SymptomItem => ({ id: 'coma', side: null, sev, sources: ['herniation'], delayed: false });
    expect(find(aggregateSymptoms(inf, inf, 720, [coma(2)]), 'hypersomnia')).toHaveLength(1);
    expect(find(aggregateSymptoms(inf, inf, 720, [coma(3)]), 'hypersomnia')).toHaveLength(0);
  });

  it('one-sided lateral medulla: central sleep apnoea; both sides: listed once, as abnormal breathing control', () => {
    const wall = scenario('r_wallenberg', 24);
    expect(ids(wall)).toContain('central_sleep_apnoea');
    expect(ids(wall)).not.toContain('respiratory');
    const one = { medulla_lateral_r: 0.9 };
    expect(aggregateSymptoms(one, one, 24).map((s) => s.id)).toContain('central_sleep_apnoea');
    const both = { medulla_lateral_r: 0.9, medulla_lateral_l: 0.9 };
    const got = aggregateSymptoms(both, both, 24).map((s) => s.id);
    expect(got).toContain('respiratory');
    expect(got).not.toContain('central_sleep_apnoea');
    // central events become fewer over months (Pavšič et al. 2020)
    expect(ids(scenario('r_wallenberg', 4320))).not.toContain('central_sleep_apnoea');
  });
});

describe('temperature regulation and sweating', () => {
  it('Wallenberg: reduced sweating on the lesion side with Horner on the same side; hiccups still there; taste on the lesion side', () => {
    const r = scenario('r_wallenberg', 24);
    expect(find(r, 'hypohidrosis').map((s) => s.side)).toEqual(['r']);
    expect(find(r, 'horner').map((s) => s.side)).toEqual(['r']);
    expect(ids(r)).toContain('hiccups');
    expect(find(r, 'taste_loss').map((s) => s.side)).toEqual(['r']);
    expect(ids(r)).not.toContain('hyperhidrosis');
    // the descending sympathetic pathway has no backup: still there at 6 months (Korpelainen 1993)
    expect(find(scenario('r_wallenberg', 4320), 'hypohidrosis').map((s) => s.side)).toEqual(['r']);
  });

  it('left MCA (insula): excess sweating on the right, transient; colder right limbs later', () => {
    const acute = scenario('l_m1', 24);
    expect(find(acute, 'hyperhidrosis').map((s) => s.side)).toEqual(['r']);
    expect(ids(acute)).not.toContain('cold_limb');
    // days to a few weeks (Labar et al. 1988; Kim et al. 1995)
    expect(ids(scenario('l_m1', 720))).not.toContain('hyperhidrosis');
    const late = scenario('l_m1', 2160);
    expect(find(late, 'cold_limb').map((s) => s.side)).toEqual(['r']);
    expect(ids(late)).not.toContain('hypohidrosis');
  });

  it('the sympathetic pathway in the lateral pons: reduced sweating on the lesion side (AICA, SCA)', () => {
    expect(find(scenario('l_aica', 24), 'hypohidrosis').map((s) => s.side)).toEqual(['l']);
    expect(find(scenario('r_sca', 24), 'hypohidrosis').map((s) => s.side)).toEqual(['r']);
  });
});

describe('emotional expression', () => {
  it('bilateral ventral pons: pathological crying or laughing in the chronic phase, worse than one side', () => {
    expect(ids(scenario('basilar_mid', 24))).not.toContain('emotionalism');
    expect(ids(scenario('basilar_mid', 2160))).toContain('emotionalism');
    const both = { pons_caudal_basis_r: 1, pons_caudal_basis_l: 1 };
    const one = { pons_caudal_basis_r: 1 };
    const sevBoth = find(aggregateSymptoms(both, both, 2160), 'emotionalism')[0]?.sev;
    const sevOne = find(aggregateSymptoms(one, one, 2160), 'emotionalism')[0]?.sev;
    expect(sevBoth).toBe(2);
    expect(sevOne).toBe(1);
  });

  it('lenticulocapsular and pontine lacunes produce it too; the limbic `emotional` change is a separate item', () => {
    expect(ids(scenario('l_lsa', 2160))).toContain('emotionalism');
    expect(ids(scenario('r_pontine_lacune', 2160))).toContain('emotionalism');
    // a hemispheric M1 stroke shows both, once each
    const late = scenario('l_m1', 2160);
    expect(find(late, 'emotionalism')).toHaveLength(1);
    expect(find(late, 'emotional')).toHaveLength(1);
  });
});

describe('bladder and taste', () => {
  it('pontine tegmentum: urinary retention (not frontal incontinence)', () => {
    const teg = { pons_rostral_tegmentum_l: 0.8 };
    const got = aggregateSymptoms(teg, teg, 24).map((s) => s.id);
    expect(got).toContain('urinary_retention');
    expect(got).not.toContain('incontinence');
    expect(ids(scenario('r_sca', 24))).toContain('urinary_retention');
    // medial frontal lesions give incontinence, not retention
    const aca = scenario('r_aca', 24);
    expect(ids(aca)).toContain('incontinence');
    expect(ids(aca)).not.toContain('urinary_retention');
  });

  it('taste: the lesion side below the upper pons, no fixed side from the thalamus up', () => {
    expect(find(scenario('l_aica', 24), 'taste_loss').map((s) => s.side)).toEqual(['l']);
    expect(find(scenario('l_m1', 24), 'taste_loss').map((s) => s.side)).toEqual([null]);
    expect(find(scenario('l_thalamic', 24), 'taste_loss').map((s) => s.side)).toEqual([null]);
  });
});

describe('a TIA leaves none of them', () => {
  it('tia_l_mca: taste during the attack, no sweating change, no non-motor symptom at 1, 3 or 6 months', () => {
    // the ischaemic insula and operculum during the five minutes
    const attack = scenario('tia_l_mca', 0);
    expect(ids(attack)).toContain('taste_loss');
    // excess sweating is described after infarcts, not during passing ischaemia
    expect(ids(attack)).not.toContain('hyperhidrosis');
    for (const tH of [720, 2160, 4320]) {
      const left = ids(scenario('tia_l_mca', tH)).filter((id) => (NEW_SYMPTOMS as readonly string[]).includes(id) || id === 'emotional');
      expect(left, `${tH} h`).toEqual([]);
    }
  });
});

describe('every new symptom can occur', () => {
  // one input that produces each (reachability.test.ts checks the whole catalogue too)
  const CASES: [string, Occlusion[], number, Partial<SimInput>][] = [
    ['hypersomnia', [{ vessel: 'thalamoperforator_l', severity: 1 }], 720, {}],
    ['rbd', [{ vessel: 'pontine_paramedian_caudal_l', severity: 1 }], 2160, {}],
    ['central_sleep_apnoea', [{ vessel: 'va_v4_dist_r', severity: 1 }], 24, {}],
    ['emotionalism', [{ vessel: 'lenticulostriate_l', severity: 1 }], 2160, {}],
    ['hypohidrosis', [{ vessel: 'va_v4_dist_r', severity: 1 }], 24, {}],
    ['hyperhidrosis', [{ vessel: 'mca_m1_l', severity: 1 }], 24, {}],
    ['cold_limb', [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }], 2160, {}],
    ['urinary_retention', [{ vessel: 'sca_r', severity: 1 }], 24, { collateral: 'poor' }],
    ['taste_loss', [{ vessel: 'aica_l', severity: 1 }], 24, { collateral: 'moderate' }],
  ];
  it.each(CASES)('%s', (id, occ, tH, over) => {
    expect(ids(occlusion(occ, tH, over))).toContain(id);
  });
  it('covers every new symptom', () => {
    expect(CASES.map((c) => c[0]).sort()).toEqual([...NEW_SYMPTOMS].sort());
  });
});

/**
 * NIHSS (total and items) and named syndromes of every teaching scenario at 24 h and 3 months,
 * computed at commit 54e06e5 — before any of these symptoms existed — and pinned here. The new
 * symptoms carry no NIHSS points, and no syndrome rule reads them (rules read regions, and the
 * signs a sign-named syndrome requires are not among them), so adding them must leave every value
 * as it was. Re-baselined on purpose for the clinical-detail audit, each changed row commented
 * with the finding that explains it: C5-F1 (the NIHSS item rules: mild weakness is drift = 1;
 * stupor scores 1b = 2 and no ataxia; anarthria scores 1b = 1) and C5-F2 (a syndrome named for
 * its signs is shown only with them). [total, items > 0, syndromes (with lesion side)]
 */
const PINNED: Record<string, [number, Record<string, number>, string[]]> = {
  'l_m1@24': [19, { '1b': 2, '1c': 1, 2: 1, 3: 1, 4: 2, '5r': 3, '6r': 3, 8: 2, 9: 3, 10: 1 }, ['gerstmann_l', 'mca_complete_l']],
  'l_m1@2160': [12, { '1b': 2, '1c': 1, 3: 1, 4: 1, '5r': 1, '6r': 1, 8: 1, 9: 3, 10: 1 }, ['mca_complete_l']], // C5-F1 drift: was 14 (5r 2, 6r 2)
  'l_m1_thrombectomy@24': [15, { '1b': 2, '1c': 1, 4: 2, '5r': 3, '6r': 3, 8: 1, 9: 2, 10: 1 }, ['mca_inferior_l']],
  'l_m1_thrombectomy@2160': [10, { '1b': 2, '1c': 1, 4: 1, '5r': 1, '6r': 1, 8: 1, 9: 2, 10: 1 }, ['mca_inferior_l']], // C5-F1 drift: was 12
  'r_m1_malignant@24': [17, { '1a': 1, 2: 1, 3: 1, 4: 2, '5l': 4, '6l': 3, 8: 2, 10: 1, 11: 2 }, ['mca_complete_r', 'neglect_r']],
  'r_m1_malignant@2160': [10, { 3: 2, 4: 1, '5l': 3, '6l': 1, 8: 1, 10: 1, 11: 1 }, ['mca_complete_r', 'neglect_r']], // C5-F1 drift: was 11 (6l 2)
  'r_m1_decompression@24': [17, { '1a': 1, 2: 1, 3: 1, 4: 2, '5l': 4, '6l': 3, 8: 2, 10: 1, 11: 2 }, ['mca_complete_r', 'neglect_r']],
  'r_m1_decompression@2160': [9, { 3: 1, 4: 1, '5l': 3, '6l': 1, 8: 1, 10: 1, 11: 1 }, ['mca_complete_r', 'neglect_r']], // C5-F1 drift: was 10 (6l 2)
  'r_ica_t@24': [19, { '1a': 1, 2: 1, 3: 2, 4: 2, '5l': 4, '6l': 4, 8: 2, 10: 1, 11: 2 }, ['mca_complete_r', 'neglect_r']],
  'r_ica_t@2160': [10, { 3: 2, 4: 1, '5l': 3, '6l': 1, 8: 1, 10: 1, 11: 1 }, ['mca_complete_r', 'neglect_r']], // C5-F1 drift: was 11 (6l 2)
  'l_m2_sup@24': [13, { '1b': 1, 2: 1, 4: 2, '5r': 4, 8: 2, 9: 2, 10: 1 }, ['mca_superior_l']],
  'l_m2_sup@2160': [5, { '1b': 1, 4: 1, '5r': 1, 8: 1, 9: 1 }, ['mca_superior_l']], // C5-F1 drift: was 6 (5r 2)
  'l_m2_inf@24': [7, { '1b': 2, '1c': 1, 3: 1, 9: 2, 10: 1 }, ['gerstmann_l', 'mca_inferior_l']],
  'l_m2_inf@2160': [6, { '1b': 2, '1c': 1, 3: 1, 9: 2 }, ['mca_inferior_l']],
  'tia_l_mca@24': [0, {}, []],
  'tia_l_mca@2160': [0, {}, []],
  'r_aca@24': [7, { '5l': 1, '6l': 4, 8: 1, 11: 1 }, ['aca_r', 'neglect_r']],
  // C5-F1 drift: was 4 (6l 2); C5-F2: the neglect has resolved, so its label goes (aca_r stays)
  'r_aca@2160': [3, { '5l': 1, '6l': 1, 8: 1 }, ['aca_r']],
  'l_acha@24': [12, { 3: 2, 4: 2, '5r': 3, '6r': 3, 8: 1, 10: 1 }, ['acha_l']],
  'l_acha@2160': [7, { 3: 2, 4: 1, '5r': 1, '6r': 1, 8: 1, 10: 1 }, ['acha_l']], // C5-F1 drift: was 9
  'l_lsa@24': [10, { 4: 2, '5r': 3, '6r': 3, 8: 1, 10: 1 }, ['striatocapsular_l']],
  'l_lsa@2160': [5, { 4: 1, '5r': 1, '6r': 1, 8: 1, 10: 1 }, ['striatocapsular_l']], // C5-F1 drift: was 7
  'l_lacune@24': [10, { 4: 2, '5r': 4, '6r': 4 }, ['lacunar_pure_motor_l']],
  'l_lacune@2160': [5, { 4: 1, '5r': 3, '6r': 1 }, ['lacunar_pure_motor_l']], // C5-F1 drift: was 6 (6r 2)
  // C5-F2: with limb ataxia and involuntary movements it is not a pure sensory stroke
  'l_thalamic@24': [3, { 7: 1, 8: 2 }, ['thalamic_sensory_l']],
  'l_thalamic@2160': [3, { 7: 1, 8: 2 }, ['thalamic_sensory_l']],
  // C5-F1: stuporous (1a = 2), so the questions score 2 and the ataxia is not scored (was 7: 2)
  'percheron@24': [5, { '1a': 2, '1b': 2, 2: 1 }, ['thalamic_paramedian_bilateral']],
  'percheron@2160': [4, { '1a': 1, 2: 1, 7: 2 }, ['thalamic_paramedian_bilateral']],
  'l_pca@24': [4, { 3: 1, 7: 1, 8: 2 }, ['pca_l', 'thalamic_sensory_l']],
  'l_pca@2160': [3, { 7: 1, 8: 2 }, ['thalamic_sensory_l']],
  'basilar_tip@24': [36, { '1a': 3, '1b': 2, '1c': 2, 2: 1, 3: 1, 4: 2, '5l': 4, '5r': 4, '6l': 4, '6r': 4, 8: 2, 9: 3, 10: 2, 11: 2 }, ['pca_l', 'top_of_basilar']],
  'basilar_tip@2160': [22, { '1a': 2, '1b': 2, 2: 1, 4: 2, '5l': 3, '5r': 3, '6l': 3, '6r': 3, 8: 2, 9: 1 }, ['top_of_basilar']], // C5-F1 stupor: 1b 1 → 2
  // C5-F1: anarthric, so cannot answer the questions aloud: 1b = 1
  'basilar_mid@24': [24, { '1b': 1, 2: 2, 4: 3, '5l': 4, '5r': 4, '6l': 4, '6r': 4, 10: 2 }, ['locked_in']],
  'basilar_mid@2160': [20, { '1b': 1, 2: 2, 4: 3, '5l': 3, '5r': 3, '6l': 3, '6r': 3, 10: 2 }, ['locked_in']],
  'basilar_stuttering@24': [0, {}, []],
  'basilar_stuttering@2160': [20, { '1b': 1, 2: 2, 4: 3, '5l': 3, '5r': 3, '6l': 3, '6r': 3, 10: 2 }, ['locked_in']], // C5-F1 anarthria: 1b = 1
  'r_wallenberg@24': [2, { 7: 1, 8: 1 }, ['wallenberg_r']],
  'r_wallenberg@2160': [2, { 7: 1, 8: 1 }, ['wallenberg_r']],
  // C5-F2: its lateral medullary signs (Horner, crossed pain/temperature loss) are named too
  'r_pica@24': [3, { 2: 1, 7: 1, 8: 1 }, ['pica_cerebellar_r', 'wallenberg_r']],
  'r_pica@2160': [2, { 7: 1, 8: 1 }, ['pica_cerebellar_r', 'wallenberg_r']],
  'l_aica@24': [5, { 4: 3, 7: 1, 8: 1 }, ['aica_l', 'labyrinthine_l']],
  'l_aica@2160': [5, { 4: 3, 7: 1, 8: 1 }, ['aica_l', 'labyrinthine_l']],
  'r_sca@24': [5, { 2: 1, 7: 2, 8: 1, 10: 1 }, ['sca_r']],
  'r_sca@2160': [4, { 2: 1, 7: 1, 8: 1, 10: 1 }, ['sca_r']],
  'l_pontine@24': [13, { 2: 2, 4: 2, '5r': 4, '6r': 4, 10: 1 }, ['foville_l']],
  'l_pontine@2160': [7, { 2: 2, 4: 2, '5r': 1, '6r': 1, 7: 1 }, ['foville_l']], // C5-F1 drift: was 9
  'r_pontine_lacune@24': [11, { 4: 2, '5l': 4, '6l': 4, 10: 1 }, ['pontine_lacunar_r']],
  'r_pontine_lacune@2160': [6, { 4: 1, '5l': 3, '6l': 1, 10: 1 }, ['pontine_lacunar_r']], // C5-F1 drift: was 7 (6l 2)
  'r_asa@24': [9, { '5l': 4, '6l': 4, 10: 1 }, ['dejerine_r']],
  'r_asa@2160': [5, { '5l': 3, '6l': 1, 10: 1 }, ['dejerine_r']], // C5-F1 drift: was 6 (6l 2)
  'ica_silent@24': [0, {}, ['carotid_compensated_r']],
  'ica_silent@2160': [0, {}, ['carotid_compensated_r']],
  'ica_isolated@24': [19, { '1a': 1, 2: 1, 3: 2, 4: 2, '5l': 4, '6l': 4, 8: 2, 10: 1, 11: 2 }, ['ica_territory_r', 'neglect_r']],
  'ica_isolated@2160': [10, { 3: 2, 4: 1, '5l': 3, '6l': 1, 8: 1, 10: 1, 11: 1 }, ['ica_territory_r', 'neglect_r']], // C5-F1 drift: was 11 (6l 2)
  'fetal_pca@24': [6, { 3: 2, 7: 1, 8: 2, 11: 1 }, ['pca_r', 'thalamic_sensory_r']],
  'fetal_pca@2160': [6, { 3: 2, 7: 1, 8: 2, 11: 1 }, ['pca_r', 'thalamic_sensory_r']],
  'watershed@24': [5, { 4: 1, '5l': 1, '6l': 1, 8: 1, 10: 1 }, ['watershed_r']], // C5-F1 drift: was 7
  // the border-zone infarct stays named, marked clinically silent (syndromeSigns.test.ts)
  'watershed@2160': [0, {}, ['watershed_r']],
  'subclavian_steal@24': [0, {}, ['subclavian_steal_l']],
  'subclavian_steal@2160': [0, {}, ['subclavian_steal_l']],
  'amaurosis@24': [0, {}, ['amaurosis_r']],
  'amaurosis@2160': [0, {}, ['amaurosis_r']],
};

describe('NIHSS and named syndromes are unchanged by the non-motor symptoms', () => {
  it('every teaching scenario is pinned at 24 h and 3 months', () => {
    const want = SCENARIOS.flatMap((s) => [`${s.id}@24`, `${s.id}@2160`]).sort();
    expect(Object.keys(PINNED).sort()).toEqual(want);
  });

  it.each(Object.entries(PINNED))('%s', (key, [total, items, syndromes]) => {
    const [id, h] = key.split('@');
    const r = scenario(id, Number(h));
    expect(r.nihss.total).toBe(total);
    const got = Object.fromEntries(Object.entries(r.nihss.items).filter(([, v]) => (v ?? 0) > 0));
    expect(got).toEqual(Object.fromEntries(Object.entries(items).map(([k, v]) => [String(k), v])));
    expect(r.syndromes.map((s) => s.def.id + (s.side ? `_${s.side}` : '')).sort()).toEqual(syndromes);
  });
});
