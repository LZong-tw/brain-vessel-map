/**
 * Z2-6: how much of an aphasia or a neglect spared cortex takes over depends on how much of the
 * hemisphere's language or attention cortex is left, as Y1-1 made the arm's recovery depend on how
 * much of the corticospinal tract is lost.
 *
 *   • Proportional recovery: about 70 % of the possible improvement by 90 days in 21 patients with
 *     aphasia (Lazar RM et al. Stroke 2010;41:1485–1488, PMID 20538700), and in 80 of 90 patients
 *     with neglect; those who did not follow it had the most severe neglect at onset (Winters C et
 *     al. Neurorehabil Neural Repair 2017;31:334–342, PMID 27913798).
 *   • Language outcome depends on the initial severity of the aphasia and of the stroke; global
 *     aphasia went from 32 % acutely to 7 % at 1 year (Pedersen PM et al. Cerebrovasc Dis
 *     2004;17:35–43, PMID 14530636). Persistent moderate or severe aphasia was common only with
 *     extensive damage throughout the MCA distribution or extensive temporoparietal damage (Wilson
 *     SM et al. Brain 2023;146:1021–1039, PMID 35388420); undamaged left-hemisphere areas give a
 *     better recovery than the right-hemisphere homologues (Heiss WD, Thiel A. Brain Lang
 *     2006;98:118–123, PMID 16564566).
 *   • Chronic neglect in about a third of patients with acute neglect, predicted by damage to the
 *     superior and middle temporal gyri, the basal ganglia and the fibre tracts beneath (Karnath HO
 *     et al. Brain 2011;134:903–912, PMID 21156661).
 *   • Conjugate eye deviation subsided within 5 days in 38 of 42 one-sided hemispheric strokes; it
 *     lasted weeks only with earlier damage to the other frontal lobe (Steiner I, Melamed E. Ann
 *     Neurol 1984;16:509–511, PMID 6497357): the other hemisphere takes it over, so its recovery
 *     does not depend on how much of the damaged hemisphere is lost.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { simulate, type SimInput } from './simulate';

const scenario = (id: string, over: Partial<SimInput> = {}): SimInput => {
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
const one = (vessel: string, collateral: SimInput['collateral'], over: Partial<SimInput> = {}): SimInput => ({
  occlusions: [{ vessel, severity: 1 }],
  variants: [],
  collateral,
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
  ...over,
});
const items = (input: SimInput, tH: number) => simulate({ ...input, tH }).nihss.items;

describe('an aphasia after near-total destruction of the language cortex stays severe (Z2-6)', () => {
  it.each([
    ['left ICA-T, moderate collaterals', one('ica_terminal_l', 'moderate')],
    ['left ICA-T, poor collaterals', one('ica_terminal_l', 'poor')],
    ['left M1, moderate collaterals', one('mca_m1_l', 'moderate')],
    ['left M1, poor collaterals', one('mca_m1_l', 'poor')],
  ] as const)('%s, untreated: severe aphasia with poor comprehension at 3 and 6 months', (_name, input) => {
    for (const tH of [2160, 4320]) {
      const it9 = items(input, tH);
      expect(it9['9'] ?? 0, `${tH} h`).toBeGreaterThanOrEqual(2);
      expect(it9['1b'] ?? 0, `${tH} h`).toBeGreaterThanOrEqual(1);
      expect(it9['1c'] ?? 0, `${tH} h`).toBeGreaterThanOrEqual(1);
    }
  });

  it('the same occlusion reopened at 4.5 h (a third of the infarct) ends with a much better NIHSS than without treatment', () => {
    const untreated = one('ica_terminal_l', 'moderate');
    const treated = one('ica_terminal_l', 'moderate', {
      reperfusionH: 4.5,
      treatment: { method: 'bridging', grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 },
    });
    const n = (input: SimInput) => simulate({ ...input, tH: 2160 }).nihss.total;
    expect(n(untreated) - n(treated)).toBeGreaterThanOrEqual(4);
  });

  // (W1-6: those that take most of Wernicke's area keep a severe Wernicke type: below)
  it('smaller infarcts recover as before: a mild-to-moderate aphasia at 3 months', () => {
    const it9 = items(scenario('l_m2_sup'), 2160);
    expect(it9['9'] ?? 0).toBe(1);
    expect(it9['1c'] ?? 0).toBe(0);
    expect(items(one('mca_m2_sup_l', 'poor'), 2160)['9'] ?? 0).toBe(1);
  });
});

/**
 * W1-6: comprehension recovers through what is left of Wernicke's area. The severity of the
 * comprehension deficit in Wernicke's aphasia followed the amount of Wernicke's area (the posterior
 * two-thirds of the superior temporal gyrus) lesioned, not the size of the whole temporoparietal
 * lesion: with half of it or less comprehension was good at 6 months, with more than half it was
 * poor even at 1 year, worse still with the middle temporal gyrus (Naeser MA et al. Arch Neurol
 * 1987;44:73–82, PMID 3800725); a persisting Wernicke's aphasia usually also involved the
 * supramarginal and angular gyri (Kertesz A et al. Brain Lang 1993;44:153–164, PMID 8428309); global
 * aphasics with more than half of Wernicke's area lesioned kept a moderate-to-severe comprehension
 * deficit at 1–2 years (Naeser MA et al. Arch Neurol 1990;47:425–432, PMID 2322136).
 */
describe('a Wernicke aphasia recovers by how much of Wernicke\'s area is left (W1-6)', () => {
  const wernicke = (input: SimInput) => simulate({ ...input, tH: 2160 }).regions.superior_temporal_posterior_l.infarct;

  it.each([
    ['l_m2_inf (85 % of Wernicke\'s area)', scenario('l_m2_inf')],
    ['l_m1 (92 %)', scenario('l_m1')],
    ['left inferior division, poor collaterals', one('mca_m2_inf_l', 'poor')],
    ['left inferior division, moderate collaterals', one('mca_m2_inf_l', 'moderate')],
  ] as const)('%s: more than half of it infarcted, so comprehension stays poor (9 ≥ 2, 1b = 2) at 1, 3 and 6 months', (_name, input) => {
    expect(wernicke(input)).toBeGreaterThan(0.6);
    for (const tH of [720, 2160, 4320]) {
      const it9 = items(input, tH);
      expect(it9['9'] ?? 0, `${tH} h`).toBeGreaterThanOrEqual(2);
      expect(it9['1b'] ?? 0, `${tH} h`).toBe(2);
      const aphasia = simulate({ ...input, tH }).symptoms.find((s) => s.id.startsWith('aphasia_'));
      expect(['aphasia_wernicke', 'aphasia_global', 'aphasia_mixed_tc'], `${tH} h`).toContain(aphasia?.id);
    }
  });

  it.each([
    ['left inferior division reopened at 4.5 h', one('mca_m2_inf_l', 'good', { reperfusionH: 4.5 })],
    ['left M1 reopened at 6 h', one('mca_m1_l', 'good', { reperfusionH: 6 })],
  ] as const)('%s: half of it or less infarcted, so comprehension recovers to a mild deficit by 3 months', (_name, input) => {
    expect(wernicke(input)).toBeLessThanOrEqual(0.5);
    expect(items(input, 2160)['9'] ?? 0).toBeLessThanOrEqual(1);
    expect(items(input, 4320)['9'] ?? 0).toBeLessThanOrEqual(1);
  });

  it('more of Wernicke\'s area infarcted never leaves better comprehension at 3 and 6 months', () => {
    const runs = [1, 2, 3, 4.5, 6, 12, null].map((reperfusionH) => one('mca_m2_inf_l', 'moderate', { reperfusionH }));
    const sorted = runs.map((input) => ({ w: wernicke(input), at: [2160, 4320].map((tH) => items(input, tH)['9'] ?? 0) })).sort((a, b) => a.w - b.w);
    for (let i = 1; i < sorted.length; i++)
      sorted[i].at.forEach((x, j) => expect(x, `${sorted[i].w.toFixed(2)} vs ${sorted[i - 1].w.toFixed(2)}`).toBeGreaterThanOrEqual(sorted[i - 1].at[j]));
  });
});

describe('a neglect after near-total destruction of the right hemisphere stays severe (Z2-6)', () => {
  it.each([
    ['r_ica_t', scenario('r_ica_t')],
    ['r_m1_malignant', scenario('r_m1_malignant')],
    ['right M1, moderate collaterals', one('mca_m1_r', 'moderate')],
  ] as const)('%s: profound inattention (item 11 = 2) at 3 and 6 months', (_name, input) => {
    for (const tH of [2160, 4320]) expect(items(input, tH)['11'] ?? 0, `${tH} h`).toBe(2);
  });

  it('a right M1 infarct with good collaterals (about a third of the cortex) still recovers to a mild neglect', () => {
    expect(items(one('mca_m1_r', 'good'), 2160)['11'] ?? 0).toBeLessThanOrEqual(1);
  });

  it('the gaze deviation of a one-sided hemispheric infarct passes as it did, whatever its size (the other frontal eye field takes over)', () => {
    // (item 2 also scores an isolated third-nerve palsy, which the right ICA-T keeps from the cerebral
    // peduncle its herniation infarcted, Z3-12: no gaze deviation is listed then)
    for (const input of [scenario('r_ica_t'), one('ica_terminal_l', 'moderate'), scenario('l_m1')]) {
      expect(items(input, 336)['2'] ?? 0).toBeLessThanOrEqual(1);
      const m1 = simulate({ ...input, tH: 720 });
      expect(m1.symptoms.filter((s) => s.id === 'gaze_deviation' || s.id === 'gaze_paresis_bilateral')).toEqual([]);
      expect(m1.nihss.items['2'] ?? 0).toBe(m1.symptoms.some((s) => s.id === 'cn3_palsy') ? 1 : 0);
    }
  });
});
