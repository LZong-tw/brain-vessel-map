import { BED_BY_ID } from '../anatomy';
import { getUnits, simulateHemodynamics } from './hemodynamics';
import { infarctFractionOf } from './tissue';
import { DEFAULT_TISSUE, tissueParamsForUnit } from './tissueParams';

export const EARLY_GROWTH_SOURCE = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4478123/';
// Wheeler 2015: M1 n=33 median (IQR). The 3.7 h clock belongs to the
// whole n=65 cohort, not this M1 subgroup; pairing them is an assumption.
export const EARLY_GROWTH_REFERENCE = {
  clockH: 3.7, targetMlH: 2.9, iqrMlH: [1.3, 7.6], mapMmHg: 93,
  collateral: 'moderate', vessel: 'mca_m1_r',
  assumptions: ['Whole-cohort clock applied to M1 subgroup', 'Representative right M1 without variants', 'Aggregate imaging volume treated as modeled injury'],
} as const;
const CASES = [
  { id: 'M1', vessel: 'mca_m1_r', targetMlH: 2.9 },
  { id: 'ICA', vessel: 'ica_terminal_r', targetMlH: 6.2 },
  { id: 'distalMCA', vessel: 'mca_m2_sup_r', targetMlH: 0.4 },
] as const;
type Mode = 'all' | 'defaultOnly';
function calculate() {
  const units = getUnits([], 'moderate');
  const contexts = CASES.map((c) => ({ ...c, hemo: simulateHemodynamics({ occlusions: [{ vessel: c.vessel, severity: 1 }], variants: [], map: 93, collateral: 'moderate' }) }));
  const volume = (context: (typeof contexts)[number], factor: number, mode: Mode, floor = false) => {
    let total = 0;
    for (const unit of units) {
      const original = tissueParamsForUnit(unit);
      const apply = mode === 'all' || original === DEFAULT_TISSUE;
      if (floor && apply) continue; // Infinite slowing leaves only unchanged units.
      const p = apply ? {
        ...original, coreTauH: original.coreTauH * factor,
        penumbraTauMinH: original.penumbraTauMinH * factor,
        lagH: original.lagH * factor,
        reflowLagH: original.reflowLagH === undefined ? undefined : original.reflowLagH * factor,
      } : original;
      total += BED_BY_ID[unit.bed].volume * unit.frac * infarctFractionOf([{ fromH: 0, rel: context.hemo.unitRel[unit.id] ?? 0 }], EARLY_GROWTH_REFERENCE.clockH, p);
    }
    return total;
  };
  const rate = (c: (typeof contexts)[number], f: number, m: Mode, floor = false) => volume(c, f, m, floor) / EARLY_GROWTH_REFERENCE.clockH;
  // Numerical search bounds, not published physiological parameter bounds.
  let lower = 0.001;
  let upper = 10000;
  for (let i = 0; i < 80; i++) {
    const middle = Math.sqrt(lower * upper);
    if (rate(contexts[0], middle, 'all') > EARLY_GROWTH_REFERENCE.targetMlH) lower = middle;
    else upper = middle;
  }
  const timeFactor = Math.sqrt(lower * upper);
  return {
    status: 'rejected' as const,
    currentM1RateMlH: rate(contexts[0], 1, 'all'),
    allTimes: {
      status: 'rejected-structural-transfer' as const, timeFactor,
      baselineMl: volume(contexts[0], timeFactor, 'all'),
      rateMlH: rate(contexts[0], timeFactor, 'all'),
      reason: 'A shared multiplier changes independently supported regional injury timings; aggregate agreement is not physiological calibration.',
    },
    defaultOnly: {
      status: 'rejected-unreachable' as const,
      floorMlH: rate(contexts[0], 1, 'defaultOnly', true),
      reason: 'Unchanged deep and perforator injury exceeds the target even with infinitely slow default tissue.',
    },
    holdouts: contexts.slice(1).map((c) => ({ id: c.id, targetMlH: c.targetMlH, modeledMlH: rate(c, timeFactor, 'all'), limitation: 'Published aggregate subtype differs from this representative vessel and shares an assumed clock; not validation.' })),
  };
}
let cached: ReturnType<typeof calculate> | undefined;
/** Diagnostic only: local parameter copies never update any simulation default. */
export function diagnoseEarlyGrowthCalibration() {
  cached ??= calculate();
  return { ...cached, allTimes: { ...cached.allTimes }, defaultOnly: { ...cached.defaultOnly }, holdouts: cached.holdouts.map((h) => ({ ...h })) };
}
