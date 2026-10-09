import { describe, expect, it } from 'vitest';
import { ichExpansionRisk, type IchExpansionInput } from './ichExpansion';

const example: IchExpansionInput = {
  baselineVolumeMl: 25, onsetToImagingHours: 2,
  antiplatelet: false, anticoagulant: false, eligiblePopulation: true,
};
const odds = (p: number) => p / (1 - p);

describe('published four-predictor ICH expansion model', () => {
  it('reproduces the published equation with independent arithmetic', () => {
    // sqrt(25)=5; PI=-4.426-.46-1.94+5.98=-.846.
    expect(ichExpansionRisk(example)).toBeCloseTo(1 / (1 + Math.exp(0.846)), 14);
    expect(ichExpansionRisk({ ...example, antiplatelet: true, anticoagulant: true }))
      .toBeCloseTo(1 / (1 + Math.exp(-0.529)), 14);
  });
  it.each(['antiplatelet', 'anticoagulant'] as const)('uses the independent %s coefficient', (therapy) => {
    const base = ichExpansionRisk(example)!;
    const treated = ichExpansionRisk({ ...example, [therapy]: true })!;
    expect(odds(treated) / odds(base)).toBeCloseTo(Math.exp(therapy === 'antiplatelet' ? 0.310 : 1.065), 12);
  });
  it('uses time in hours', () => {
    expect(odds(ichExpansionRisk({ ...example, onsetToImagingHours: 3 })!) / odds(ichExpansionRisk(example)!))
      .toBeCloseTo(Math.exp(-0.230), 12);
  });
  it.each([0.5, 24])('includes the published time boundary %s', (onsetToImagingHours) => {
    const p = ichExpansionRisk({ ...example, onsetToImagingHours });
    expect(p).not.toBeNull();
    expect(p!).toBeGreaterThan(0);
    expect(p!).toBeLessThan(1);
  });
  it.each([0.499, 24.001, -1, NaN, Infinity])('rejects time outside the source domain: %s', (onsetToImagingHours) => {
    expect(ichExpansionRisk({ ...example, onsetToImagingHours })).toBeNull();
  });
  it.each([0, -1, 150, 151, NaN, Infinity])('rejects invalid or excluded volume: %s', (baselineVolumeMl) => {
    expect(ichExpansionRisk({ ...example, baselineVolumeMl })).toBeNull();
  });
  it.each([0.001, 149.999])('accepts positive volume below 150 mL: %s', (baselineVolumeMl) => {
    expect(ichExpansionRisk({ ...example, baselineVolumeMl })).not.toBeNull();
  });
  it('refuses unknown medication or unconfirmed population instead of treating it as absence', () => {
    expect(ichExpansionRisk({ ...example, antiplatelet: null })).toBeNull();
    expect(ichExpansionRisk({ ...example, anticoagulant: null })).toBeNull();
    expect(ichExpansionRisk({ ...example, eligiblePopulation: false })).toBeNull();
  });
});
