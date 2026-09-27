import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { REPERFUSION_STOPS, TIME_STOPS } from '../anatomy/timeline';
import { simulate, type SimInput } from './simulate';

/** Relations between outputs that must hold for every scenario at every displayed time. */
const inputOf = (id: string, over: Partial<SimInput> = {}): SimInput => {
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

describe('output invariants', () => {
  it.each(SCENARIOS.map((s) => [s.id]))('%s: the current infarct never exceeds the predicted final infarct', (id) => {
    for (const reperfusionH of [inputOf(id).reperfusionH, null]) {
      for (const stop of TIME_STOPS) {
        const r = simulate(inputOf(id, { tH: stop.h, reperfusionH }));
        expect(r.volumes.core, `${id} t=${stop.h} h reperfusion=${reperfusionH}`).toBeLessThanOrEqual(r.volumes.finalInfarct + 0.01);
      }
    }
  });

  // reopening an artery can only save tissue: the dead core stays dead, and secondary damage
  // (herniation, compression) follows the final infarct, which treatment cannot enlarge
  const withComplete = SCENARIOS.filter((s) => s.occlusions.some((o) => o.severity >= 1 && !o.branch));
  it.each(withComplete.map((s) => [s.id]))('%s: treatment never makes the final infarct larger than no treatment', (id) => {
    for (const collateral of ['good', 'poor'] as const) {
      const untreated = simulate(inputOf(id, { collateral, reperfusionH: null, tH: 24 })).volumes.finalInfarct;
      for (const reperfusionH of REPERFUSION_STOPS) {
        const treated = simulate(inputOf(id, { collateral, reperfusionH, tH: 24 })).volumes.finalInfarct;
        expect(treated, `${id} ${collateral} reperfusion ${reperfusionH} h`).toBeLessThanOrEqual(untreated + 0.01);
      }
    }
  });

  it('a left M1 with poor collaterals opened at 1 h is not worse than untreated (border-zone rounding)', () => {
    const run = (reperfusionH: number | null) =>
      simulate({ occlusions: [{ vessel: 'mca_m1_l', severity: 1 }], variants: [], collateral: 'poor', map: 93, tH: 72, reperfusionH, decompression: false });
    expect(run(1).volumes.finalInfarct).toBeLessThanOrEqual(run(null).volumes.finalInfarct + 0.01);
  });
});
