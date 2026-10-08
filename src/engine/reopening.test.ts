/**
 * X2-9: after the artery is reopened, a deficit that cleared when blood returned is not brought
 * back by the swelling of the following days (simulate.heldReference). Over the whole course, at
 * every treatment time for the scenarios, no symptom goes and comes back without a reason the
 * model has (testing/courseChecks.ts); reopeningSingles.test.ts does the same for every occludable
 * vessel. Kept apart from invariants.test.ts so that the long sweeps run in parallel.
 */
import { describe, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { REPERFUSION_STOPS } from '../anatomy/timeline';
import { simulate, type SimInput } from './simulate';
import { ALL_STOPS, noUnexplainedReturn } from './testing/courseChecks';

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
/** scenarios whose occlusions all start at onset and last (a schedule has its own attacks) */
const SINGLE_ONSET = SCENARIOS.filter((s) => s.occlusions.every((o) => !o.fromH && o.toH == null)).map((s) => s.id);

describe('X2-9: reopened, no deficit comes back with the swelling alone', () => {
  it.each(SINGLE_ONSET.map((id) => [id]))('%s reopened at every treatment time: no symptom switches off and back on without a reason', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      for (const reperfusionH of REPERFUSION_STOPS)
        noUnexplainedReturn(`${id} ${collateral} reopened ${reperfusionH} h`, ALL_STOPS.map((tH) => simulate(inputOf(id, { collateral, reperfusionH, tH }))));
  });
});
