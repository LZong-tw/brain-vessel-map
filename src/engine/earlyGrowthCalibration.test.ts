import { describe, expect, it } from 'vitest';
import { diagnoseEarlyGrowthCalibration, EARLY_GROWTH_REFERENCE, EARLY_GROWTH_SOURCE } from './earlyGrowthCalibration';
import { simulateHemodynamics } from './hemodynamics';
import { infarctFractionOf } from './tissue';
import { DEFAULT_TISSUE, DEEP_WHITE_MATTER_TISSUE, PERFORATOR_TISSUE } from './tissueParams';

describe('rejected early-growth calibration diagnostic', () => {
  it('retains the published target and explicitly assumed clock', () => {
    expect(EARLY_GROWTH_SOURCE).toContain('PMC4478123');
    expect(EARLY_GROWTH_REFERENCE.targetMlH).toBe(2.9);
    expect(EARLY_GROWTH_REFERENCE.iqrMlH).toEqual([1.3, 7.6]);
    expect(EARLY_GROWTH_REFERENCE.clockH).toBe(3.7);
    expect(EARLY_GROWTH_REFERENCE.assumptions[0]).toContain('Whole-cohort');
  });
  it('reproduces numerical agreement while rejecting regional timing transfer', () => {
    const r = diagnoseEarlyGrowthCalibration();
    expect(r.status).toBe('rejected');
    expect(r.currentM1RateMlH).toBeCloseTo(24.7284565, 6);
    expect(r.allTimes.status).toBe('rejected-structural-transfer');
    expect(r.allTimes.timeFactor).toBeCloseTo(10.2843948, 6);
    expect(r.allTimes.rateMlH).toBeCloseTo(2.9, 10);
    expect(r.allTimes.baselineMl).toBeCloseTo(10.73, 10);
    expect(r.defaultOnly.status).toBe('rejected-unreachable');
    expect(r.defaultOnly.floorMlH).toBeCloseTo(3.7792993, 6);
    expect(r.defaultOnly.floorMlH).toBeGreaterThan(EARLY_GROWTH_REFERENCE.targetMlH);
  });
  it('reports subtype comparisons as holdouts with mismatched-geometry limitations', () => {
    const r = diagnoseEarlyGrowthCalibration();
    expect(r.holdouts.map((h) => h.targetMlH)).toEqual([6.2, 0.4]);
    expect(r.holdouts[0].modeledMlH).toBeCloseTo(4.4331518, 6);
    expect(r.holdouts[1].modeledMlH).toBeCloseTo(0.0972423, 6);
    expect(r.holdouts.every((h) => h.limitation.includes('not validation'))).toBe(true);
    r.holdouts[0].modeledMlH = -1;
    expect(diagnoseEarlyGrowthCalibration().holdouts[0].modeledMlH).toBeGreaterThan(0);
  });
  it('leaves ordinary hemodynamics, injury outputs and regional constants unchanged', () => {
    const input = { occlusions: [{ vessel: 'mca_m1_r', severity: 1 }], variants: [], map: 93, collateral: 'moderate' as const };
    const before = structuredClone(simulateHemodynamics(input));
    const params = [DEFAULT_TISSUE, DEEP_WHITE_MATTER_TISSUE, PERFORATOR_TISSUE].map((p) => ({ ...p }));
    const injury = infarctFractionOf([{ fromH: 0, rel: 0 }], 4, DEEP_WHITE_MATTER_TISSUE);
    diagnoseEarlyGrowthCalibration();
    expect(simulateHemodynamics(input)).toEqual(before);
    expect([DEFAULT_TISSUE, DEEP_WHITE_MATTER_TISSUE, PERFORATOR_TISSUE]).toEqual(params);
    expect(DEEP_WHITE_MATTER_TISSUE.lagH).toBe(2.5);
    expect(DEEP_WHITE_MATTER_TISSUE.coreTauH).toBe(1.75);
    expect(infarctFractionOf([{ fromH: 0, rel: 0 }], 4, DEEP_WHITE_MATTER_TISSUE)).toBe(injury);
  });
});
