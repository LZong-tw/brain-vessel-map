import { BED_BY_ID } from '../anatomy';
import { getUnits, simulateResearchHemodynamics } from './hemodynamics';
import { infarctFractionOf } from './tissue';
import { tissueParamsForUnit } from './tissueParams';

// MacLellan et al., DOI 10.1016/j.jstrokecerebrovasdis.2021.106208:
// non-reperfused DEFUSE3 perfusion-profile median growth, not CTA grades.
export const PUBLIC_GROWTH_TARGETS = [
  { id: 'both', targetGrowthMl: 21.7 },
  { id: 'one', targetGrowthMl: 40.9 },
  { id: 'neither', targetGrowthMl: 108.2 },
] as const;
// Borrowed whole medical-arm medians, NOT the MacLellan subgroup:
// Albers et al., DOI 10.1056/NEJMoa1713973, Table 1.
export const BASELINE_IMAGING_H = 9 + 55 / 60;
export const FOLLOWUP_H = 10 + 44 / 60 + 24;
export const REFERENCE_BASELINE_CORE_ML = 10.1;
// Numerical search limits, not physiological bounds or patient distributions.
export const FACTOR_SEARCH_BOUNDS = [0.0001, 100] as const;

export function publicM1Growth(collateralFactor: number) {
  const hemo = simulateResearchHemodynamics({ occlusions: [{ vessel: 'mca_m1_r', severity: 1 }], variants: [], map: 93, collateral: 'moderate' }, collateralFactor);
  let baselineCoreMl = 0;
  let followupCoreMl = 0;
  for (const unit of getUnits([], 'moderate')) {
    const history = [{ fromH: 0, rel: hemo.unitRel[unit.id] ?? 0 }];
    const volume = BED_BY_ID[unit.bed].volume * unit.frac;
    const params = tissueParamsForUnit(unit);
    baselineCoreMl += volume * infarctFractionOf(history, BASELINE_IMAGING_H, params);
    followupCoreMl += volume * infarctFractionOf(history, FOLLOWUP_H, params);
  }
  return { baselineCoreMl, growthMl: followupCoreMl - baselineCoreMl };
}

function fit(targetGrowthMl: number) {
  const low = Math.log(FACTOR_SEARCH_BOUNDS[0]);
  const high = Math.log(FACTOR_SEARCH_BOUNDS[1]);
  let bestLog = low;
  let best = publicM1Growth(Math.exp(low));
  let error = (best.growthMl - targetGrowthMl) ** 2;
  const consider = (x: number) => {
    const value = publicM1Growth(Math.exp(x));
    const e = (value.growthMl - targetGrowthMl) ** 2;
    if (e < error) { bestLog = x; best = value; error = e; }
  };
  // Global grid followed by local grids: no assumption of monotonic growth.
  let step = (high - low) / 80;
  for (let i = 1; i <= 80; i++) consider(low + i * step);
  for (let pass = 0; pass < 5; pass++) {
    const center = bestLog;
    for (let i = -10; i <= 10; i++) consider(Math.max(low, Math.min(high, center + i * step / 10)));
    step /= 10;
  }
  return { targetGrowthMl, collateralFactor: Math.exp(bestLog), ...best, residualMl: best.growthMl - targetGrowthMl };
}

let cached: ReturnType<typeof calculate> | undefined;
function calculate() {
  return { fits: PUBLIC_GROWTH_TARGETS.map(target => ({ id: target.id, ...fit(target.targetGrowthMl) })), baselineImagingH: BASELINE_IMAGING_H, followupH: FOLLOWUP_H, referenceBaselineCoreMl: REFERENCE_BASELINE_CORE_ML };
}
/** Experimental fit of three aggregate outputs in one assumed M1 case; not population validation. */
export function calibratePublicM1() {
  cached ??= calculate();
  return { ...cached, fits: cached.fits.map(value => ({ ...value })) };
}
