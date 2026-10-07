import { describe, expect, it } from 'vitest';
import { simulate } from './simulate';

const cores = (occlusions: unknown[]) => {
  const r = simulate({ occlusions, variants: [], collateral: 'moderate', map: 93, tH: 4, reperfusionH: null, decompression: false } as never);
  return new Set(r.cascade.events.flatMap((e) => [...e.desc.en.matchAll(/Large core \(about (\d+) mL/g)].map((m) => m[1])));
};

describe('treatment window core of a later occlusion (T3)', () => {
  it('a basilar occlusion 2 h after a left M1 does not count the M1 infarct still growing as its own core', () => {
    const m1 = { vessel: 'mca_m1_l', severity: 1, fromH: 0 };
    const alone = cores([m1]);
    const both = cores([m1, { vessel: 'basilar_mid', severity: 1, fromH: 2 }]);
    // the only large core quoted is the M1's own story, told before the basilar occlusion began
    expect([...both].every((c) => alone.has(c))).toBe(true);
  });
});
