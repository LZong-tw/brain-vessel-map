import { describe, expect, it } from 'vitest';
import { simulateHemorrhagePressure, type HemorrhagePressureInput } from './intracranialPressure';
const base: HemorrhagePressureInput = { addedVolumeMl: 0, baselineIcpMmHg: 10, pviMl: 25, mapMmHg: 90 };
const solve = (over: Partial<HemorrhagePressureInput> = {}) => {
  const result = simulateHemorrhagePressure({ ...base, ...over });
  if (result.status !== 'ok') throw new Error(result.status);
  return result;
};
describe('illustrative pressure-volume relationship', () => {
  it('retains baseline at zero volume', () => {
    expect(solve()).toEqual({ status: 'ok', icpMmHg: 10, cppMmHg: 80 });
  });
  it('increases pressure tenfold at one PVI and preserves negative CPP', () => {
    expect(solve({ addedVolumeMl: 25 })).toEqual({ status: 'ok', icpMmHg: 100, cppMmHg: -10 });
  });
  it('satisfies the independently stated inverse source equation', () => {
    const result = solve({ addedVolumeMl: 13 });
    expect(25 * (Math.log10(result.icpMmHg) - Math.log10(10))).toBeCloseTo(13, 12);
    expect(result.cppMmHg).toBe(90 - result.icpMmHg);
  });
  it('is monotonic in added volume and distinguishes user PVI', () => {
    expect(solve({ addedVolumeMl: 20 }).icpMmHg).toBeGreaterThan(solve({ addedVolumeMl: 10 }).icpMmHg);
    expect(solve({ addedVolumeMl: 20, pviMl: 50 }).icpMmHg).toBeLessThan(solve({ addedVolumeMl: 20 }).icpMmHg);
  });
  it('rejects invalid inputs and reports overflow without a pressure cap', () => {
    for (const over of [{ addedVolumeMl: -1 }, { addedVolumeMl: NaN }, { baselineIcpMmHg: 0 }, { baselineIcpMmHg: -1 }, { pviMl: 0 }, { pviMl: Infinity }, { mapMmHg: 0 }, { mapMmHg: NaN }])
      expect(simulateHemorrhagePressure({ ...base, ...over }).status).toBe('invalid');
    expect(simulateHemorrhagePressure({ ...base, addedVolumeMl: 10000 }).status).toBe('overflow');
  });
});
