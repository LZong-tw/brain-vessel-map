import { describe, expect, it } from 'vitest';
import { simulateVenousOutflow, VENOUS_VESSELS, type VenousInput } from './venous';
const base: VenousInput = { cerebralFlowMlMin: 600, deepFraction: 0.2, outletPressureMmHg: 5 };
const solve = (over: Partial<VenousInput> = {}) => {
  const result = simulateVenousOutflow({ ...base, ...over });
  if (result.status !== 'ok' && result.status !== 'undetermined') throw new Error(result.status);
  return result;
};
describe('reduced published venous network', () => {
  it('preserves source geometry and independently calculated Poiseuille pressure', () => {
    expect(VENOUS_VESSELS).toHaveLength(8);
    const r = (l: number, d: number) => 128 * 0.003 * l * 0.01 / (Math.PI * (d * 0.01) ** 4);
    const rb = r(5.25, 0.88) + r(12.25, 0.53) + r(15, 1.7);
    const pc = 5 + (600 * 1e-6 / 60) * rb / 2 / 133.322387415;
    const result = solve();
    expect(result.pressuresMmHg.confluence).toBeCloseTo(pc, 12);
    expect(result.pressuresMmHg.sss).toBeCloseTo(pc + (480 * 1e-6 / 60) * r(19.22, 0.45) / 133.322387415, 12);
    expect(result.pressuresMmHg.straight).toBeCloseTo(pc + (120 * 1e-6 / 60) * r(3.96, 0.17) / 133.322387415, 12);
  });
  it('conserves flow with symmetric outlets and series branches', () => {
    const { flowsMlMin: q } = solve();
    expect(q.sss + q.straight).toBeCloseTo(q.jugular_l + q.jugular_r, 12);
    expect(q.jugular_l).toBe(300);
    expect(q.jugular_r).toBe(300);
    expect(q.transverse_l).toBe(q.sigmoid_l);
    expect(q.sigmoid_l).toBe(q.jugular_l);
    expect(q.transverse_r).toBe(q.sigmoid_r);
    expect(q.sigmoid_r).toBe(q.jugular_r);
  });
  it('uses radius to the fourth power and reroutes a unilateral block', () => {
    const half = solve({ radiusRatios: { sss: 0.5 } });
    expect(half.conductanceRatios.sss).toBe(1 / 16);
    const normal = solve();
    expect(half.pressuresMmHg.sss! - half.pressuresMmHg.confluence!).toBeCloseTo(16 * (normal.pressuresMmHg.sss! - normal.pressuresMmHg.confluence!), 10);
    const block = solve({ radiusRatios: { transverse_l: 0 } });
    expect(block.flowsMlMin.jugular_l).toBe(0);
    expect(block.flowsMlMin.jugular_r).toBe(600);
  });
  it('rejects a positive imposed flow without a route', () => {
    expect(simulateVenousOutflow({ ...base, radiusRatios: { transverse_l: 0, transverse_r: 0 } }).status).toBe('disconnected');
    expect(simulateVenousOutflow({ ...base, radiusRatios: { sss: 0 } }).status).toBe('disconnected');
    expect(simulateVenousOutflow({ ...base, radiusRatios: { straight: 0 } }).status).toBe('disconnected');
  });
  it('permits blocked zero-input branches without assigning their pressure', () => {
    const result = solve({ deepFraction: 1, radiusRatios: { sss: 0 } });
    expect(result.pressuresMmHg.sss).toBeNull();
    expect(result.flowsMlMin.sss).toBe(0);
    const zero = solve({ cerebralFlowMlMin: 0, radiusRatios: { transverse_l: 0, transverse_r: 0 } });
    expect(zero.status).toBe('undetermined');
    expect(Object.values(zero.pressuresMmHg)).toEqual([null, null, null]);
    expect(Object.values(zero.flowsMlMin).every((q) => q === 0)).toBe(true);
  });
  it('shifts pressure by common outlet pressure without changing flow', () => {
    const first = solve();
    const second = solve({ outletPressureMmHg: 12 });
    expect(second.flowsMlMin).toEqual(first.flowsMlMin);
    for (const id of ['sss', 'straight', 'confluence'] as const)
      expect(second.pressuresMmHg[id]! - first.pressuresMmHg[id]!).toBeCloseTo(7, 12);
  });
  it('rejects invalid inputs and reports finite-precision overflow', () => {
    for (const over of [{ cerebralFlowMlMin: -1 }, { cerebralFlowMlMin: NaN }, { deepFraction: 1.1 }, { deepFraction: -0.1 }, { outletPressureMmHg: Infinity }, { radiusRatios: { sss: -1 } }, { radiusRatios: { sss: 1.1 } }, { radiusRatios: { sss: NaN } }])
      expect(simulateVenousOutflow({ ...base, ...over }).status).toBe('invalid');
    expect(simulateVenousOutflow({ ...base, radiusRatios: { sss: 1e-100 } }).status).toBe('overflow');
  });
});
