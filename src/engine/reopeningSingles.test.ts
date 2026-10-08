/**
 * X2-9 for every occludable vessel alone, reopened at 1 h and at 6 h (with good and poor
 * collaterals): no symptom goes and comes back without a reason the model has
 * (testing/courseChecks.ts). The scenarios at every treatment time are in reopening.test.ts.
 */
import { describe, it } from 'vitest';
import { VESSELS } from '../anatomy';
import { isOccludable, simulate } from './simulate';
import { ALL_STOPS, noUnexplainedReturn } from './testing/courseChecks';

const SINGLE = VESSELS.filter((v) => isOccludable(v.id)).map((v) => v.id);

describe('X2-9: one vessel reopened, no deficit comes back with the swelling alone', () => {
  it.each(SINGLE.map((v) => [v]))('%s alone, reopened at 1 h and at 6 h: no symptom switches off and back on without a reason', (vessel) => {
    for (const collateral of ['good', 'poor'] as const)
      for (const reperfusionH of [1, 6])
        noUnexplainedReturn(
          `${vessel} ${collateral} reopened ${reperfusionH} h`,
          ALL_STOPS.map((tH) => simulate({ occlusions: [{ vessel, severity: 1 }], variants: [], collateral, map: 93, tH, reperfusionH, decompression: false })),
        );
  });
});
