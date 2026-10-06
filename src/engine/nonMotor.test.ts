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

// REM sleep behaviour disorder is no longer a symptom of one site but a possible late problem of
// any pontine or medullary infarct, shown as a cascade event (C10-F7; lateEffects.test.ts)
const NEW_SYMPTOMS = [
  'hypersomnia',
  'central_sleep_apnoea',
  'emotionalism',
  'hypohidrosis',
  'hyperhidrosis',
  'cold_limb',
  'urinary_retention',
  'taste_loss',
] as const;
/** present only from the chronic phase on (`delayed`) */
const CHRONIC = ['hypersomnia', 'emotionalism', 'cold_limb'];

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
  it('mid-basilar occlusion: a possible REM sleep behaviour disorder from 1 month (an event, C10-F7), not acutely; none after a left M1', () => {
    const rbd = (id: string, tH: number) => {
      const e = scenario(id, tH).cascade.events.find((ev) => ev.id === 'rbd');
      return !!e && e.onsetH <= tH && tH < (e.endH ?? Infinity);
    };
    expect(rbd('basilar_mid', 24)).toBe(false);
    for (const tH of [720, 2160, 4320]) expect(rbd('basilar_mid', tH), `${tH} h`).toBe(true);
    for (const tH of [24, 2160, 4320]) expect(rbd('l_m1', tH), `${tH} h`).toBe(false);
    for (const tH of [24, 2160]) expect(ids(scenario('basilar_mid', tH))).not.toContain('rbd');
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

  it('no separate hypersomnia while the patient is in coma, however deep (C3-F2)', () => {
    const inf = { thalamus_paramedian_r: 1, thalamus_paramedian_l: 1 };
    const coma = (sev: 1 | 2 | 3): SymptomItem => ({ id: 'coma', side: null, sev, sources: ['herniation'], delayed: false });
    // without coma, the hypersomnia of both paramedian thalami is listed
    expect(find(aggregateSymptoms(inf, inf, 720), 'hypersomnia')).toHaveLength(1);
    expect(find(aggregateSymptoms(inf, inf, 720, [coma(2)]), 'hypersomnia')).toHaveLength(0);
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
 * as it was. [total, items > 0, syndromes (with lesion side)]
 * Re-baselined on purpose for the clinical-detail audit, each changed row commented with the
 * finding that explains it: C5-F1 (the NIHSS item rules: mild weakness is drift = 1; stupor
 * scores 1b = 2 and no ataxia; anarthria scores 1b = 1), C5-F2 (a syndrome named for its signs is
 * shown only with them), C1 (hemispheric syndromes: F1 one aphasia type, graded; F2 the MCA
 * hemianopia; F3 the PCA hemianopia; F5 where neglect comes from; F6 the border-zone arm
 * weakness), C6 (lacunar and deep syndromes: F1 a single lacune is mild to moderate; F6 the
 * cortical signs of a striatocapsular infarct; the capsular warning and corona radiata scenarios
 * are new), C7 (medulla and cerebellum: F4 the lateral medulla's facial weakness and
 * dysarthria), C3 (F1 incomplete locked-in syndrome; F2 the time course of coma), C9 (F1 to F4:
 * the thalamus), C4 (F2 consciousness from the midline shift; F3 graded cerebellar swelling),
 * MERGE (where findings of the two audit chains meet, as explained at the row) and the review of
 * the cortex fixes, R1 (1: a mute global aphasia follows no command; 2: a mild global aphasia
 * changes type; 3: shoulder weakness on item 5; 6: the parietal field cut; 7: left-hemisphere
 * neglect clears), and the fresh-eyes review, Y2 (2: the deep infarct of an early M1 reopening is
 * named a striatocapsular infarct; 8: item 7 counts ataxic limbs, a moderate hemiataxia two), Y1
 * (0: the infarct grows over hours; 1: a plegic arm from where the corticospinal tract converges
 * stays moderately weak; 12: rescued tissue regains its function over hours to days).
 */
const PINNED: Record<string, [number, Record<string, number>, string[]]> = {
  // C1-F2: Meyer loop + parietal optic radiation make a hemianopia (3: 1 → 2); C1-F5: a milder
  // right neglect after a left-hemisphere stroke (11: 0 → 1); C1-F1: Gerstmann cannot be tested
  // with a global aphasia, so it is not named (was 19, ['gerstmann_l', 'mca_complete_l']);
  // R1-1: item 9 = 3 is a mute patient who follows no command (1c: 1 → 2, 10: 1 → 2; was 21)
  'l_m1@24': [23, { '1b': 2, '1c': 2, 2: 1, 3: 2, 4: 2, '5r': 3, '6r': 3, 8: 2, 9: 3, 10: 2, 11: 1 }, ['mca_complete_l']],
  // C5-F1 drift: was 14 (5r 2, 6r 2); C1-F1: the global aphasia is graded from its compensated
  // components (sev 1): 9: 3 → 2, 1b: 2 → 1, 1c: 1 → 0 (was 12). R1-2: a mild global aphasia is
  // no longer global but a mild Wernicke type (9: 2 → 1); R1-6: the parietal optic radiation
  // stays cut where the infarct is, so the hemianopia stays (3: 1 → 2); still 9
  // Y1-1: the arm weakness comes from half of the posterior limb, where the corticospinal tract
  // converges; plegic in the first week, it recovers to a moderate weakness, not a drift (5r: 1 → 3;
  // was 9)
  'l_m1@2160': [11, { '1b': 1, 3: 2, 4: 1, '5r': 3, '6r': 1, 8: 1, 9: 1, 10: 1 }, ['mca_complete_l']],
  // Y2-2: the deep infarct the reopening at 2 h leaves (putamen, caudate, posterior limb) is named
  // a striatocapsular infarct next to the inferior-division label of its temporal part (was
  // ['mca_inferior_l'] alone, whose text describes little weakness beside a hemiparesis)
  // Y1-0: the cortex that collaterals reach is lost over hours, so the reopening at 2 h leaves 34 mL
  // (was 58), mostly the end-artery deep territory; Y1-12: by 24 h most of the rescued cortex works
  // again: a milder aphasia (9: 2 → 1, 1b: 2 → 1, 1c: 1 → 0) and too little cortical infarct for the
  // inferior-division label (was 15, ['mca_inferior_l', 'striatocapsular_l'])
  'l_m1_thrombectomy@24': [12, { '1b': 1, 4: 2, '5r': 3, '6r': 3, 8: 1, 9: 1, 10: 1 }, ['striatocapsular_l']],
  // C5-F1 drift: was 12; C1-F1: a mild (sev 1) Wernicke aphasia scores 9 = 1 and 1b = 1, 1c = 0 (was
  // 10); Y2-2: as at 24 h (was ['mca_inferior_l'])
  // Y1-0: no lasting aphasia from the smaller cortical infarct (9: 1 → 0, 1b: 1 → 0), no
  // inferior-division label; Y1-1: the arm, cut in the posterior limb, stays moderately weak (5r: 1
  // → 3); still 7
  'l_m1_thrombectomy@2160': [7, { 4: 1, '5r': 3, '6r': 1, 8: 1, 10: 1 }, ['striatocapsular_l']],
  // C1-F2: hemianopia (3: 1 → 2); C4-F2: consciousness follows the midline shift, 3.4 mm at 24 h
  // (alert), not a fixed drowsiness (1a: 1 → 0); was 17
  'r_m1_malignant@24': [17, { 2: 1, 3: 2, 4: 2, '5l': 4, '6l': 3, 8: 2, 10: 1, 11: 2 }, ['mca_complete_r', 'neglect_r']],
  // C5-F1 drift: was 11 (6l 2); Y1-1: the cerebral peduncle, infarcted by the herniation, has lost
  // its whole corticospinal tract: the arm stays plegic and the leg barely moves (5l: 3 → 4, 6l: 1
  // → 3; was 10)
  'r_m1_malignant@2160': [13, { 3: 2, 4: 1, '5l': 4, '6l': 3, 8: 1, 10: 1, 11: 1 }, ['mca_complete_r', 'neglect_r']],
  // C1-F2: hemianopia (3: 1 → 2); C4-F2: as r_m1_malignant@24 (1a: 1 → 0); was 17
  'r_m1_decompression@24': [17, { 2: 1, 3: 2, 4: 2, '5l': 4, '6l': 3, 8: 2, 10: 1, 11: 2 }, ['mca_complete_r', 'neglect_r']],
  // C5-F1 drift: was 10 (6l 2); C1-F2: hemianopia (3: 1 → 2; was 9)
  'r_m1_decompression@2160': [10, { 3: 2, 4: 1, '5l': 3, '6l': 1, 8: 1, 10: 1, 11: 1 }, ['mca_complete_r', 'neglect_r']],
  // C4-F2: 3.5 mm of midline shift at 24 h, alert (1a: 1 → 0; was 19)
  'r_ica_t@24': [18, { 2: 1, 3: 2, 4: 2, '5l': 4, '6l': 4, 8: 2, 10: 1, 11: 2 }, ['mca_complete_r', 'neglect_r']],
  // C5-F1 drift: was 11 (6l 2); Y1-1: as r_m1_malignant (5l: 3 → 4, 6l: 1 → 3; was 10)
  'r_ica_t@2160': [13, { 3: 2, 4: 1, '5l': 4, '6l': 3, 8: 1, 10: 1, 11: 1 }, ['mca_complete_r', 'neglect_r']],
  // C1-F5: right neglect from the left supramarginal gyrus (11: 0 → 1; was 13)
  'l_m2_sup@24': [14, { '1b': 1, 2: 1, 4: 2, '5r': 4, 8: 2, 9: 2, 10: 1, 11: 1 }, ['mca_superior_l']],
  // C5-F1 drift: was 6 (5r 2); C1-F5: the right neglect of a large supramarginal infarct is still
  // there (11: 0 → 1; was 5). R1-7: neglect after a left-hemisphere stroke clears within weeks
  // (11: 1 → 0; was 6)
  'l_m2_sup@2160': [5, { '1b': 1, 4: 1, '5r': 1, 8: 1, 9: 1 }, ['mca_superior_l']],
  // C1-F2: hemianopia (3: 1 → 2); C1-F5: right neglect (11: 0 → 1); C1-F1: no Gerstmann label
  // with a Wernicke aphasia (was 7, ['gerstmann_l', 'mca_inferior_l'])
  'l_m2_inf@24': [9, { '1b': 2, '1c': 1, 3: 2, 9: 2, 10: 1, 11: 1 }, ['mca_inferior_l']],
  // C1-F1: a mild (sev 1) Wernicke aphasia scores 9 = 1 and 1b = 1, 1c = 0 (was 6). R1-6: the
  // hemianopia stays where the infarct cut the parietal optic radiation (3: 1 → 2; was 3)
  'l_m2_inf@2160': [4, { '1b': 1, 3: 2, 9: 1 }, ['mca_inferior_l']],
  'tia_l_mca@24': [0, {}, []],
  'tia_l_mca@2160': [0, {}, []],
  // C1-F5: the superior parietal lobule alone gives no neglect (was 7, 11: 1, ['aca_r', 'neglect_r'])
  'r_aca@24': [6, { '5l': 1, '6l': 4, 8: 1 }, ['aca_r']],
  // C5-F1 drift: was 4 (6l 2); C5-F2: the neglect has resolved, so its label goes (aca_r stays)
  'r_aca@2160': [3, { '5l': 1, '6l': 1, 8: 1 }, ['aca_r']],
  'l_acha@24': [12, { 3: 2, 4: 2, '5r': 3, '6r': 3, 8: 1, 10: 1 }, ['acha_l']],
  // C5-F1 drift: was 9; Y1-1: half of the posterior limb infarcted under a plegic arm: a moderate
  // weakness, not a drift (5r: 1 → 3; was 7)
  'l_acha@2160': [9, { 3: 2, 4: 1, '5r': 3, '6r': 1, 8: 1, 10: 1 }, ['acha_l']],
  // C6-F6: a subcortical (transcortical motor) aphasia from cortical hypoperfusion (9: 0 → 1; was 10)
  'l_lsa@24': [11, { 4: 2, '5r': 3, '6r': 3, 8: 1, 9: 1, 10: 1 }, ['striatocapsular_l']],
  // C5-F1 drift: was 7; Y1-1: as l_acha (5r: 1 → 3; was 5)
  'l_lsa@2160': [7, { 4: 1, '5r': 3, '6r': 1, 8: 1, 10: 1 }, ['striatocapsular_l']],
  // C6-F1: a lacune weakens face, arm and leg mildly (sev 1 each), not to a plegia (was 10, 4: 2, 5r: 4, 6r: 4)
  'l_lacune@24': [3, { 4: 1, '5r': 1, '6r': 1 }, ['lacunar_pure_motor_l']],
  // C5-F1 drift: was 6 (6r 2); C6-F1: drift of arm and leg left, the face compensated (was 5, 4: 1, 5r: 3)
  'l_lacune@2160': [2, { '5r': 1, '6r': 1 }, ['lacunar_pure_motor_l']],
  // C6-F5: ataxic hemiparesis from a lenticulostriate branch in the corona radiata (new scenario).
  // Y2-8: item 7 counts limbs, and a moderate ataxia of the right side is its arm and its leg (7:
  // 1 → 2; was 4); mild by 3 months, one limb (7 = 1)
  'l_cr_lacune@24': [5, { 4: 1, '5r': 1, '6r': 1, 7: 2 }, ['lacunar_ataxic_hemiparesis_l']],
  'l_cr_lacune@2160': [3, { '5r': 1, '6r': 1, 7: 1 }, ['lacunar_ataxic_hemiparesis_l']],
  // C6-F2: three 5-minute attacks of one branch, then a lasting occlusion from 6 h (new scenario)
  'capsular_warning@24': [3, { 4: 1, '5r': 1, '6r': 1 }, ['capsular_warning_l', 'lacunar_pure_motor_l']],
  'capsular_warning@2160': [2, { '5r': 1, '6r': 1 }, ['lacunar_pure_motor_l']],
  // C5-F2, C6-F7: with limb ataxia it is not a pure sensory stroke; C9-F2: the inferolateral
  // thalamus also gives a mild, passing weakness (4: 1, 5r: 1 — drift, C5-F1); was 3
  'l_thalamic@24': [5, { 4: 1, '5r': 1, 7: 1, 8: 2 }, ['thalamic_sensory_l']],
  'l_thalamic@2160': [3, { 7: 1, 8: 2 }, ['thalamic_sensory_l']],
  // C5-F1: stuporous (1a = 2), so the questions score 2 and the ataxia is not scored; C9-F1: the
  // default Percheron pattern spares the midbrain (no CN III/IV palsy, item 2); C9-F3/F4: thalamic
  // aphasia from the left (9) and neglect from the right (11) paramedian thalamus (was 5); R5-7: the
  // thalamic word-finding difficulty cannot be examined in a stuporous patient (9: 1 → 0; was 6).
  // X1-5: the scale has the examiner choose a language score in stupor, so the thalamic aphasia is
  // listed and scored again (9: 0 → 1; was 5)
  'percheron@24': [6, { '1a': 2, '1b': 2, 9: 1, 11: 1 }, ['thalamic_paramedian_bilateral']],
  // C3-F2: the coma of the paramedian thalami has given way to persistent hypersomnia by 3 months
  // (1a 1 → 0); C9-F1, C9-F3/F4: as at 24 h, the neglect has recovered (was 4)
  'percheron@2160': [1, { 9: 1 }, ['thalamic_paramedian_bilateral']],
  // C9-F1: the Percheron pattern with the midbrain (a scenario of its own). MERGE: stuporous
  // (1a = 2), so C5-F1 scores the questions 2 and not the ataxia (1b: 2 in place of 7: 2); R5-7:
  // stuporous, so no thalamic word-finding difficulty is listed (9: 1 → 0; was 7). X1-5: listed and
  // scored again in stupor, as for percheron@24 (9: 0 → 1; was 6)
  'percheron_midbrain@24': [7, { '1a': 2, '1b': 2, 2: 1, 9: 1, 11: 1 }, ['thalamomesencephalic_bilateral']],
  'percheron_midbrain@2160': [4, { 2: 1, 7: 2, 9: 1 }, ['thalamomesencephalic_bilateral']],
  // C1-F3: the untreated P2 occlusion infarcts the calcarine cortex: a hemianopia (3: 1 → 2; was 4),
  // still there at 3 months with its PCA label (was 3, no field defect, ['thalamic_sensory_l']);
  // C9-F2: a mild, passing weakness from the inferolateral thalamus (4: 1, 5r: 1, drift)
  'l_pca@24': [7, { 3: 2, 4: 1, '5r': 1, 7: 1, 8: 2 }, ['pca_l', 'thalamic_sensory_l']],
  'l_pca@2160': [5, { 3: 2, 7: 1, 8: 2 }, ['pca_l', 'thalamic_sensory_l']],
  // C1-F3: the calcarine artery also feeds the cuneus, so the left PCA's both banks fail: a
  // hemianopia (3: 1 → 2; was 36)
  'basilar_tip@24': [37, { '1a': 3, '1b': 2, '1c': 2, 2: 1, 3: 2, 4: 2, '5l': 4, '5r': 4, '6l': 4, '6r': 4, 8: 2, 9: 3, 10: 2, 11: 2 }, ['pca_l', 'top_of_basilar']],
  // C3-F2: the coma has become a disorder of consciousness (1a stays 2); C5-F1 stupor: 1b 1 → 2;
  // C1-F3: an upper quadrantanopia stays (3: 0 → 1); C9-F4: the left anterior thalamus gives a
  // thalamic aphasia and dysarthria (10: 0 → 1); was 21 (R6-12: not 22). R5-7: in a disorder of
  // consciousness the thalamic aphasia is not listed (9: 1 → 0); R5-9: the soft speech of the
  // anterior thalamic infarct has improved by 3 months (10: 1 → 0); was 24. MERGE (R1-1 with R5-7):
  // a disorder of consciousness is mute and follows no command (9: 0 → 3, 1c: 0 → 2, 10: 0 → 2); was 22.
  // X3-0: with the pial arteries of the hemispheres mirrored in the flow model, the left lingual
  // gyrus keeps less infarct (0.27 → 0.23 of the region), so the upper quadrantanopia has gone by
  // 3 months (3: 1 → 0); was 29
  'basilar_tip@2160': [28, { '1a': 2, '1b': 2, '1c': 2, 2: 1, 4: 2, '5l': 3, '5r': 3, '6l': 3, '6r': 3, 8: 2, 9: 3, 10: 2 }, ['top_of_basilar']],
  // C5-F1: anarthric, so cannot answer the questions aloud: 1b = 1
  'basilar_mid@24': [24, { '1b': 1, 2: 2, 4: 3, '5l': 4, '5r': 4, '6l': 4, '6r': 4, 10: 2 }, ['locked_in']],
  // C3-F1: some limb movement has returned (5 and 6 score 3, not 4): incomplete locked-in syndrome
  'basilar_mid@2160': [20, { '1b': 1, 2: 2, 4: 3, '5l': 3, '5r': 3, '6l': 3, '6r': 3, 10: 2 }, ['locked_in_incomplete']],
  'basilar_stuttering@24': [0, {}, []],
  // C5-F1 anarthria: 1b = 1; C3-F1: as basilar_mid@2160
  'basilar_stuttering@2160': [20, { '1b': 1, 2: 2, 4: 3, '5l': 3, '5r': 3, '6l': 3, '6r': 3, 10: 2 }, ['locked_in_incomplete']],
  // C7-F4: a mild facial weakness on the lesion side and dysarthria (4: 0 → 1, 10: 0 → 1; was 2).
  // Y2-8: the moderate ataxia of the right arm and leg is two limbs (7: 1 → 2; was 4)
  'r_wallenberg@24': [5, { 4: 1, 7: 2, 8: 1, 10: 1 }, ['wallenberg_r']],
  // C7-F4: the dysarthria is not yet fully compensated at 3 months (10: 0 → 1; was 2)
  'r_wallenberg@2160': [3, { 7: 1, 8: 1, 10: 1 }, ['wallenberg_r']],
  // C5-F2: its lateral medullary signs (Horner, crossed pain/temperature loss) are named too;
  // C7-F4: the lateral medulla adds a mild facial weakness and dysarthria (4: 0 → 1, 10: 0 → 1);
  // C4-F3: a 34 mL cerebellar infarct is a warning to monitor, with no brainstem compression
  // (gaze palsy, 2: 1 → 0); was 3. Y2-8: a moderate hemiataxia is two limbs (7: 1 → 2; was 4)
  'r_pica@24': [5, { 4: 1, 7: 2, 8: 1, 10: 1 }, ['pica_cerebellar_r', 'wallenberg_r']],
  'r_pica@2160': [2, { 7: 1, 8: 1 }, ['pica_cerebellar_r', 'wallenberg_r']],
  // C4-F3: new template, PICA + SCA (58 mL) swells on day 2–3. MERGE: its lateral medulla gives
  // the mild facial weakness of C7-F4 (4: 1 at 24 h) and the Wallenberg signs that name it (C5-F2)
  'cerebellar_swelling@24': [6, { 2: 1, 4: 1, 7: 2, 8: 1, 10: 1 }, ['pica_cerebellar_r', 'sca_r', 'wallenberg_r']],
  'cerebellar_swelling@2160': [4, { 2: 1, 7: 1, 8: 1, 10: 1 }, ['pica_cerebellar_r', 'sca_r', 'wallenberg_r']],
  // Y2-8: a moderate hemiataxia is two limbs (7: 1 → 2; was 5)
  'l_aica@24': [6, { 4: 3, 7: 2, 8: 1 }, ['aica_l', 'labyrinthine_l']],
  'l_aica@2160': [5, { 4: 3, 7: 1, 8: 1 }, ['aica_l', 'labyrinthine_l']],
  'r_sca@24': [5, { 2: 1, 7: 2, 8: 1, 10: 1 }, ['sca_r']],
  'r_sca@2160': [4, { 2: 1, 7: 1, 8: 1, 10: 1 }, ['sca_r']],
  'l_pontine@24': [13, { 2: 2, 4: 2, '5r': 4, '6r': 4, 10: 1 }, ['foville_l']],
  // C5-F1 drift: was 9; Y1-1: 65 % of the left basis pontis infarcted under a plegic arm and leg: a
  // moderate weakness of both at 3 months (5r: 1 → 3, 6r: 1 → 3; the leg recovers further by 6
  // months), too weak for the ataxia to be scored (7: 1 → 0; was 7)
  'l_pontine@2160': [10, { 2: 2, 4: 2, '5r': 3, '6r': 3 }, ['foville_l']],
  // C6-F1: ataxic hemiparesis — mild weakness, so the ataxia is scored (was 11, 4: 2, 5l: 4, 6l: 4, no 7).
  // Y2-8: "marked ataxia of the same limbs", the arm and the leg (7: 1 → 2; was 5)
  'r_pontine_lacune@24': [6, { 4: 1, '5l': 1, '6l': 1, 7: 2, 10: 1 }, ['pontine_lacunar_r']],
  // C5-F1 drift: was 7 (6l 2); C6-F1: (was 6, 4: 1, 5l: 3, no 7)
  'r_pontine_lacune@2160': [4, { '5l': 1, '6l': 1, 7: 1, 10: 1 }, ['pontine_lacunar_r']],
  'r_asa@24': [9, { '5l': 4, '6l': 4, 10: 1 }, ['dejerine_r']],
  'r_asa@2160': [5, { '5l': 3, '6l': 1, 10: 1 }, ['dejerine_r']], // C5-F1 drift: was 6 (6l 2)
  'ica_silent@24': [0, {}, ['carotid_compensated_r']],
  'ica_silent@2160': [0, {}, ['carotid_compensated_r']],
  // Y1-0: the infarct grows over hours, about 300 mL at 24 h instead of 334, so the midline shift is
  // just under 4 mm then and the patient still alert (1a: 1 → 0; drowsy from about 26 h; was 19)
  'ica_isolated@24': [18, { 2: 1, 3: 2, 4: 2, '5l': 4, '6l': 4, 8: 2, 10: 1, 11: 2 }, ['ica_territory_r', 'neglect_r']],
  // C5-F1 drift: was 11 (6l 2); Y1-1: as r_m1_malignant (5l: 3 → 4, 6l: 1 → 3; was 10)
  'ica_isolated@2160': [13, { 3: 2, 4: 1, '5l': 4, '6l': 3, 8: 1, 10: 1, 11: 1 }, ['ica_territory_r', 'neglect_r']],
  // C9-F2: the PComm feeds the tuberothalamic artery, so the anterior thalamus is infarcted too and
  // has its own label; C9-F4: its dysarthria (10); C9-F2: mild, passing weakness from the
  // inferolateral thalamus (4, 5l: drift, C5-F1); was 6
  'fetal_pca@24': [9, { 3: 2, 4: 1, '5l': 1, 7: 1, 8: 2, 10: 1, 11: 1 }, ['pca_r', 'thalamic_sensory_r', 'thalamic_tuberothalamic_r']],
  // R5-9: the dysarthria and neglect of the anterior thalamic infarct have improved by 3 months
  // with its other deficits (10: 1 → 0, 11: 1 → 0; was 7)
  'fetal_pca@2160': [5, { 3: 2, 7: 1, 8: 2 }, ['pca_r', 'thalamic_sensory_r', 'thalamic_tuberothalamic_r']],
  // C5-F1 drift: was 7; R1-3: a moderate proximal (shoulder) weakness is some effort against
  // gravity, not drift (5l: 1 → 2; was 5). X3-0: with the pial arteries of the hemispheres mirrored
  // in the flow model, the right occipital pole loses more of its MCA–PCA border zone at the low
  // pressure, giving a central scotoma (3: 0 → 1; was 6)
  'watershed@24': [7, { 3: 1, 4: 1, '5l': 2, '6l': 1, 8: 1, 10: 1 }, ['watershed_r']],
  // C1-F6: the anterior border zone of the motor strip leaves a mild proximal arm weakness, so
  // the label is no longer clinically silent (was 0, {}; the silent case is now at 65 mmHg,
  // syndromeSigns.test.ts)
  'watershed@2160': [1, { '5l': 1 }, ['watershed_r']],
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
