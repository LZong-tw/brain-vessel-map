import { describe, expect, it } from 'vitest';
import { calibratePublicM1, publicM1Growth, PUBLIC_GROWTH_TARGETS } from './publicCalibration';
import { hemoKey, simulateHemodynamics, simulateResearchHemodynamics } from './hemodynamics';

describe('experimental public aggregate calibration', () => {
  it('preserves source targets and distinct imaging/randomization clocks', () => {
    const result = calibratePublicM1();
    expect(PUBLIC_GROWTH_TARGETS.map(x => x.targetGrowthMl)).toEqual([21.7, 40.9, 108.2]);
    expect(result.baselineImagingH).toBe(9 + 55 / 60);
    expect(result.followupH).toBe(10 + 44 / 60 + 24);
    expect(result.referenceBaselineCoreMl).toBe(10.1);
  });
  it('fits reproducibly and reports actual residuals and held-out baseline mismatch', () => {
    const result = calibratePublicM1();
    expect(calibratePublicM1()).toEqual(result);
    expect(Math.abs(result.fits[0].residualMl)).toBeLessThan(0.001);
    expect(Math.abs(result.fits[1].residualMl)).toBeLessThan(0.001);
    // This fixed-time-constant late M1 case cannot reach the third source target.
    // Low conductance also saturates before baseline, so fitted factors are not clinical grades.
    expect(result.fits[2].residualMl).toBeLessThan(-20);
    for (const fit of result.fits) {
      const actual = publicM1Growth(fit.collateralFactor);
      expect(actual).toEqual({ baselineCoreMl: fit.baselineCoreMl, growthMl: fit.growthMl });
      expect(fit.residualMl).toBe(fit.growthMl - fit.targetGrowthMl);
      expect(Number.isFinite(fit.baselineCoreMl)).toBe(true);
      expect(Number.isFinite(fit.growthMl)).toBe(true);
      expect(fit.baselineCoreMl).not.toBe(result.referenceBaselineCoreMl);
    }
    result.fits[0].growthMl = -1;
    expect(calibratePublicM1().fits[0].growthMl).toBeGreaterThanOrEqual(0);
  });
  it('validates overrides before cache access and separates default keys', () => {
    const input = { occlusions: [], variants: [], map: 93, collateral: 'moderate' as const };
    expect(hemoKey(input)).not.toBe(hemoKey({ ...input, collateralFactor: 0.8 }));
    const accidentalOverride = { ...input, collateralFactor: 0.0001 };
    expect(simulateHemodynamics(accidentalOverride)).toEqual(simulateHemodynamics(input));
    for (const value of [0, -1, NaN, Infinity]) {
      expect(() => hemoKey({ ...input, collateralFactor: value })).toThrow(RangeError);
      expect(() => simulateResearchHemodynamics(input, value)).toThrow(RangeError);
    }
    expect(simulateHemodynamics(input)).toEqual(simulateResearchHemodynamics(input, 0.8));
  });
});
