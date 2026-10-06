/**
 * Y1-1: how much of a hemiparesis spared pathways take over depends on how much of the
 * corticospinal tract is lost where its fibres converge (the posterior limb of the internal
 * capsule, the cerebral peduncle, the basis pontis) and on how severe the weakness was at first.
 *
 *   • Isolated arm movement returned in 3 of 4 purely cortical strokes but in 1 of 28 with the
 *     posterior limb and adjacent structures involved: cortex > corona radiata > posterior limb
 *     (Shelton FN, Reding MJ. Stroke 2001;32:107–112, PMID 11136923).
 *   • A corticospinal lesion load of 7 cc or more left every patient with an upper-limb Fugl-Meyer
 *     of 25 or less at 3 months (Feng W et al. Ann Neurol 2015;78:860–870, PMID 26289123).
 *   • Without finger extension or shoulder abduction on day 2, only a quarter regained any
 *     dexterity (Nijland RH et al. Stroke 2010;41:745–750, PMID 20167916); the PREP2 "poor" group
 *     ended with a median upper-limb Fugl-Meyer of 9 (Stinear CM et al. Ann Clin Transl Neurol
 *     2017;4:811–820, PMID 29159193); proportional (about 70 %) recovery holds only while the
 *     corticomotor pathway is intact (Byblow WD et al. Ann Neurol 2015;78:848–859, PMID 26150318).
 *   • Small lacunes have a good motor outcome and stay mild (C6).
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
const custom = (vessel: string, collateral: SimInput['collateral']): SimInput => ({
  occlusions: [{ vessel, severity: 1 }],
  variants: [],
  collateral,
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
});
const item = (input: SimInput, tH: number, key: string) => simulate({ ...input, tH }).nihss.items[key] ?? 0;

describe('a plegic arm from a corticospinal infarct where the tract converges stays weak', () => {
  // (Z1-7: l_m1_thrombectomy is no longer one of them: reopened at 2 h, the capsule beside the
  // infarcted striatum is spared and the arm recovers; capsularWhiteMatter.test.ts)
  it.each([
    ['l_m1', scenario('l_m1'), 'r'],
    ['l_acha', scenario('l_acha'), 'r'],
    ['l_lsa', scenario('l_lsa'), 'r'],
    ['l_pontine (basis pontis)', scenario('l_pontine'), 'r'],
  ] as const)('%s: plegic at 3 days, NIHSS item 5 still 3 or more at 3 and 6 months (not a drift)', (_name, input, side) => {
    expect(item(input, 72, `5${side}`)).toBe(4);
    for (const tH of [2160, 4320]) expect(item(input, tH, `5${side}`), `${tH} h`).toBeGreaterThanOrEqual(3);
  });

  it('the leg recovers better than the arm after a capsular infarct (reticulospinal gait)', () => {
    for (const id of ['l_acha', 'l_lsa', 'l_m1']) expect(item(scenario(id), 2160, '6r'), id).toBeLessThanOrEqual(item(scenario(id), 2160, '5r'));
  });

  it('a peduncle infarcted completely (herniation) leaves more than a drift of the leg too', () => {
    for (const id of ['r_m1_malignant', 'r_ica_t']) expect(item(scenario(id), 2160, '6l'), id).toBeGreaterThanOrEqual(2);
  });

  it('a cortical source does not end worse than a capsular one of similar initial severity', () => {
    const cortical = custom('mca_m2_sup_l', 'poor');
    expect(item(cortical, 72, '5r')).toBe(4);
    expect(item(cortical, 2160, '5r')).toBeLessThanOrEqual(item(scenario('l_acha'), 2160, '5r'));
  });

  it('pure motor lacunes stay mild', () => {
    for (const id of ['l_lacune', 'l_cr_lacune', 'capsular_warning'])
      for (const tH of [72, 2160]) expect(item(scenario(id), tH, '5r'), `${id} ${tH} h`).toBeLessThanOrEqual(1);
    expect(item(scenario('r_pontine_lacune'), 2160, '5l')).toBeLessThanOrEqual(1);
  });
});
