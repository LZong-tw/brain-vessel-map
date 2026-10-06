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

  it('smaller infarcts recover as before: a mild-to-moderate aphasia at 3 months', () => {
    for (const id of ['l_m1', 'l_m2_sup', 'l_m2_inf']) {
      const it9 = items(scenario(id), 2160);
      expect(it9['9'] ?? 0, id).toBe(1);
      expect(it9['1c'] ?? 0, id).toBe(0);
    }
    for (const [vessel, collateral] of [
      ['mca_m2_sup_l', 'poor'],
      ['mca_m2_inf_l', 'poor'],
    ] as const)
      expect(items(one(vessel, collateral), 2160)['9'] ?? 0, `${vessel} ${collateral}`).toBe(1);
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
