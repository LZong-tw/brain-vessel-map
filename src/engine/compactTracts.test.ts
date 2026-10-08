/**
 * Z2-8, Z2-9, Z2-0: the brainstem is made of compact tracts and nuclei, so a deficit from it is
 * graded by how much of the region is lost, below the symptom threshold too, instead of all its
 * signs switching on and off together at that threshold; and the passing perilesional depression
 * of the first days does not, by itself, give a new hemiparesis there.
 *
 *   • Bilateral pontine infarcts (11 % of 150 isolated pontine infarcts) came with tetraparesis and
 *     pseudobulbar palsy and always severe deficits; the outcome was good except after bilateral
 *     lesions (Kumral E et al. J Neurol 2002;249:1659–1670, PMID 12529787).
 *   • A PCA occlusion beyond the posterior communicating artery can infarct the lateral midbrain
 *     and cause a hemiparesis (Hommel M et al. Neurology 1990;40:1496–1499, PMID 2215937).
 *   • After thrombolysis of a basilar occlusion without extensive early ischaemia, half had a good
 *     outcome whatever the time to treatment, up to 48 h (Strbian D et al. Ann Neurol
 *     2013;73:688–694, PMID 23536323): what decides is how much of the brainstem has infarcted,
 *     not the hours alone, so the model keeps no separate cap on recovery after long ischaemia.
 */
import { describe, expect, it } from 'vitest';
import { REGION_BY_ID } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import { simulate, type SimInput, type SimResult } from './simulate';

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
const one = (vessel: string, over: Partial<SimInput> = {}): SimInput => ({
  occlusions: [{ vessel, severity: 1 }],
  variants: [],
  collateral: 'good',
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
  ...over,
});
const at = (input: SimInput, tH: number) => simulate({ ...input, tH });
const limbs = (r: SimResult, side: 'r' | 'l') => (r.nihss.items[`5${side}`] ?? 0) + (r.nihss.items[`6${side}`] ?? 0);
/** listed signs and those not examinable now that come from the brainstem */
const brainstemSigns = (r: SimResult) =>
  [...r.symptoms, ...r.unexaminable].filter((s) => s.sources.some((src) => REGION_BY_ID[src]?.category === 'brainstem'));

describe('a bilateral pontine infarct just under the threshold is not a full recovery (Z2-8)', () => {
  // the persistent trigeminal artery feeds the basilar from the carotid: the same caudal pontine
  // basis is infarcted 24 % instead of 29 %
  const lower = one('basilar_lower');
  const trigeminal = one('basilar_lower', { variants: ['persistent_trigeminal_r'] });

  it('both give a bilateral deficit; the smaller infarct a milder one (a dysarthria instead of the anarthria)', () => {
    const a = at(lower, 168);
    const b = at(trigeminal, 168);
    expect(b.regions.pons_caudal_basis_r.infarct).toBeLessThan(0.25);
    expect(b.nihss.total).toBeGreaterThanOrEqual(a.nihss.total / 2);
    expect(b.nihss.total).toBeLessThanOrEqual(a.nihss.total);
    expect(b.symptoms.some((s) => s.id === 'dysarthria')).toBe(true);
    expect(b.symptoms.some((s) => s.id === 'anarthria')).toBe(false);
  });

  // W1-0: below the symptom threshold each side keeps most of its tract, so each side's deficit is
  // taken over as a one-sided one (lesionSides): the smaller infarct recovers more, but a mild
  // weakness of both sides remains (extensive bilateral pontine lesions on DWI do not always mean a
  // poor outcome after a reopening either: Haussen DC et al. Interv Neurol 2016;5:179–184)
  it('the smaller infarct recovers more, but leaves a mild weakness of both sides at 1, 3 and 6 months (W1-0)', () => {
    for (const tH of [720, 2160, 4320]) {
      const a = at(lower, tH);
      const b = at(trigeminal, tH);
      expect(b.nihss.total, `${tH} h`).toBeLessThan(a.nihss.total);
      expect(limbs(b, 'r'), `${tH} h`).toBeGreaterThan(0);
      expect(limbs(b, 'l'), `${tH} h`).toBeGreaterThan(0);
    }
  });
});

describe('after an early basilar reopening the brainstem signs taper over several stops (Z2-8)', () => {
  const ivt = one('basilar_mid', {
    reperfusionH: 4.5,
    treatment: { method: 'ivt', grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 },
  });
  const series = TIME_STOPS.filter((s) => s.h >= 24).map((s) => at(ivt, s.h));

  /** the summed severity of the signs from the brainstem */
  const load = (r: SimResult) => brainstemSigns(r).reduce((a, s) => a + s.sev, 0);

  it('no stop at which a locked-in picture is followed by no sign at all', () => {
    expect(series[0].syndromes.some((m) => m.def.id.startsWith('locked_in'))).toBe(true);
    for (let i = 1; i < series.length; i++)
      if (load(series[i - 1]) >= 10) expect(load(series[i]), `${series[i - 1].input.tH} → ${series[i].input.tH} h`).toBeGreaterThan(0);
  });

  it('the signs fade over several stops, and the small infarcts (6 and 10 %) leave none in the end', () => {
    const nihss = series.map((r) => r.nihss.total);
    for (let i = 1; i < nihss.length; i++) expect(nihss[i]).toBeLessThanOrEqual(nihss[i - 1]);
    expect(nihss.filter((n, i) => i > 0 && n > 0 && n < nihss[0]).length).toBeGreaterThanOrEqual(2);
    expect(at(ivt, 2160).nihss.total).toBe(0);
  });
});

describe('a mid-basilar occlusion reopened at 12 h with good collaterals (Z2-0)', () => {
  const input = scenario('basilar_mid', { reperfusionH: 12 });

  it('leaves the deficit its infarct gives: both caudal tegmenta about a quarter infarcted, so not NIHSS 0', () => {
    const r = at(input, 2160);
    expect(r.regions.pons_caudal_tegmentum_r.infarct).toBeGreaterThan(0.15);
    expect(r.nihss.total).toBeGreaterThan(0);
    expect(r.symptoms.some((s) => s.id === 'gaze_palsy_horizontal')).toBe(true);
  });

  it('but recovers far more than a reopening at 24 h, which leaves a quarter of the ventral pons infarcted', () => {
    expect(at(input, 2160).nihss.total).toBeLessThan(at(scenario('basilar_mid', { reperfusionH: 24 }), 2160).nihss.total - 4);
  });
});

describe('a PCA infarct reaching the cerebral peduncle (Z2-9)', () => {
  const bothP2: SimInput = { ...one('pca_p2_r'), occlusions: [{ vessel: 'pca_p2_r', severity: 1 }, { vessel: 'pca_p2_l', severity: 1 }] };
  it.each([
    ['l_pca', scenario('l_pca'), ['r']],
    ['right P2, good collaterals', one('pca_p2_r'), ['l']],
    ['both P2, good collaterals', bothP2, ['r', 'l']],
  ] as [string, SimInput, ('r' | 'l')[]][])('%s: no new hemiparesis on days 2–7 without a midline shift', (_name, input, sides) => {
    const day1 = at(input, 24);
    for (const tH of [48, 72, 120, 168]) {
      const r = at(input, tH);
      expect(r.edema.midlineShiftMm, `${tH} h`).toBeLessThan(1);
      for (const side of sides) expect(limbs(r, side), `${side} ${tH} h`).toBeLessThanOrEqual(limbs(day1, side));
    }
  });

  it.each([
    ['l_pca', scenario('l_pca'), 'r'],
    ['right P2, good collaterals', one('pca_p2_r'), 'l'],
  ] as const)('%s: a fifth of the peduncle infarcted leaves a mild weakness, not none and not a severe one', (_name, input, side) => {
    for (const tH of [2160, 4320]) {
      const r = at(input, tH);
      expect(r.regions[`midbrain_peduncle_${side === 'r' ? 'l' : 'r'}`].infarct, `${tH} h`).toBeGreaterThan(0.15);
      expect(r.nihss.items[`5${side}`] ?? 0, `${tH} h`).toBeGreaterThanOrEqual(1);
      expect(r.nihss.items[`5${side}`] ?? 0, `${tH} h`).toBeLessThanOrEqual(2);
    }
  });
});
