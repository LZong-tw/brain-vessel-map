import { describe, expect, it } from 'vitest';
import { simulate, type SimInput } from './simulate';

const input = (tH: number): SimInput =>
  ({
    occlusions: [
      { vessel: 'mca_m1_r', severity: 1 },
      { vessel: 'mca_m1_l', severity: 1, fromH: 24 },
    ],
    variants: [],
    collateral: 'moderate',
    map: 93,
    tH,
    reperfusionH: null,
    decompression: true,
  }) as SimInput;

describe('two swelling hemispheres after decompression', () => {
  it('quotes the midline shift shown while both swell instead of only saying it moves little', () => {
    const r = simulate(input(4320));
    const note = r.cascade.events.map((e) => e.desc.en).find((d) => /other hemisphere is infarcted too/.test(d));
    expect(note).toBeDefined();
    let shown = 0;
    for (let tH = 24; tH <= 424; tH += 3) shown = Math.max(shown, simulate(input(tH)).edema.midlineShiftMm);
    const quoted = /at most about ([\d.]+) mm/.exec(note!);
    expect(quoted).not.toBeNull();
    expect(Number(quoted![1])).toBeGreaterThanOrEqual(shown - 0.3);
    const zh = r.cascade.events.map((e) => e.desc.zh).find((d) => /另一側半球也梗塞了/.test(d));
    expect(zh).toContain(`最多約 ${quoted![1]} mm`);
  });
});
