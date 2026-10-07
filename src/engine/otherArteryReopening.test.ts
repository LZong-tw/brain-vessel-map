import { describe, expect, it } from 'vitest';
import { simulate, type SimInput } from './simulate';

const input = (basilarToH?: number): SimInput =>
  ({
    occlusions: [
      { vessel: 'mca_m1_l', severity: 1 },
      { vessel: 'basilar_mid', severity: 1, fromH: 48, ...(basilarToH !== undefined ? { toH: basilarToH } : {}) },
    ],
    variants: [],
    collateral: 'moderate',
    map: 93,
    tH: 4320,
    reperfusionH: null,
    decompression: false,
  }) as SimInput;

describe('an artery other than the index one that reopens by itself (T3)', () => {
  it('never ends with more infarct than had it stayed closed', () => {
    const closed = simulate(input()).cascade.volumes.withSecondary;
    for (const toH of [56, 68]) expect(simulate(input(toH)).cascade.volumes.withSecondary).toBeLessThanOrEqual(closed + 0.5);
  });
});
