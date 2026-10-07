import { describe, expect, it } from 'vitest';
import { simulate, type SimInput } from './simulate';

const sim = (occlusions: unknown[], tH: number, decompression = false) =>
  simulate({ occlusions, variants: [], collateral: 'moderate', map: 93, tH, reperfusionH: null, decompression } as unknown as SimInput);

const QUOTE = /at most about ([\d.]+) mm|(?:here at most|this shift is at most) ?(?:about )?([\d.]+) mm/;
const bilateralQuote = (occ: unknown[], decompression: boolean) => {
  const note = sim(occ, 4320, decompression).cascade.events.map((e) => e.desc.en).find((d) => /other hemisphere is infarcted too/.test(d));
  const q = QUOTE.exec(note ?? '');
  return q ? Number(q[1] ?? q[2]) : null;
};
const shownMax = (occ: unknown[], from: number, to: number, decompression: boolean) => {
  let shown = 0;
  for (let t = from; t <= to; t += 1) shown = Math.max(shown, sim(occ, t, decompression).edema.midlineShiftMm);
  return shown;
};

describe('codex review 1', () => {
  it('quotes the real midline shift for simultaneous asymmetric bilateral lesions', () => {
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m2_sup_l', severity: 1 }];
    const quoted = bilateralQuote(occ, true);
    expect(quoted).not.toBeNull();
    const shown = shownMax(occ, 0, 240, true);
    expect(shown).toBeGreaterThan(0.5);
    expect(quoted!).toBeGreaterThan(0.5);
    expect(quoted!).toBeLessThanOrEqual(shown + 0.3);
  });

  it('quotes no more midline shift than shown once a late second hemisphere swells', () => {
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 200 }];
    const quoted = bilateralQuote(occ, false);
    expect(quoted).not.toBeNull();
    const shown = shownMax(occ, 200, 600, false);
    expect(quoted!).toBeLessThanOrEqual(shown + 0.3);
  });
});
