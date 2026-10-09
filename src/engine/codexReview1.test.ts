import { describe, expect, it } from 'vitest';
import { simulate, type SimInput } from './simulate';

const sim = (occlusions: unknown[], tH: number, decompression = false) =>
  simulate({ occlusions, variants: [], collateral: 'moderate', map: 93, tH, reperfusionH: null, decompression } as unknown as SimInput);

const QUOTE = /at most about ([\d.]+) mm|(?:here at most|this shift is at most) ?(?:about )?([\d.]+) mm/;
const bilateralQuote = (occ: unknown[], decompression: boolean) => {
  const events = sim(occ, 4320, decompression).cascade.events;
  const note = events.map((e) => e.desc.en).find((d) => /other hemisphere is infarcted too/.test(d));
  const zh = events.map((e) => e.desc.zh).find((d) => /另一側半球也梗塞了/.test(d)) ?? null;
  const q = QUOTE.exec(note ?? '');
  return { quoted: q ? Number(q[1] ?? q[2]) : null, zh };
};
/** largest midline shift while both hemispheres' own shifts exceed 0.05 mm, from `from` until one stops */
const bothSwellMax = (occ: unknown[], decompression: boolean, from: number, to: number, step = 1) => {
  let shown = 0;
  let peakTime = from;
  let both = false;
  for (let t = from; t <= to; t += step) {
    const e = sim(occ, t, decompression).edema;
    const swelling = e.ownShiftMm.r > 0.05 && e.ownShiftMm.l > 0.05;
    if (swelling) {
      if (!both && t > from) {
        // Independently locate the first instant both sides cross the displayed
        // swelling threshold; a regular sample grid can miss the boundary peak.
        let lo = t - step;
        let hi = t;
        for (let iteration = 0; iteration < 24; iteration++) {
          const mid = (lo + hi) / 2;
          const edge = sim(occ, mid, decompression).edema;
          if (edge.ownShiftMm.r > 0.05 && edge.ownShiftMm.l > 0.05) hi = mid;
          else lo = mid;
        }
        const boundaryPeak = sim(occ, hi, decompression).edema.midlineShiftMm;
        if (boundaryPeak > shown) [shown, peakTime] = [boundaryPeak, hi];
      }
      both = true;
      if (e.midlineShiftMm > shown) [shown, peakTime] = [e.midlineShiftMm, t];
    } else if (both) break;
  }
  // Resolve a peak just before a treatment discontinuity as well as the first
  // swelling boundary; use the displayed simulation rather than its quoted value.
  for (let t = Math.max(from, peakTime - step); t <= Math.min(to, peakTime + step); t += 0.001) {
    const e = sim(occ, t, decompression).edema;
    if (e.ownShiftMm.r > 0.05 && e.ownShiftMm.l > 0.05) shown = Math.max(shown, e.midlineShiftMm);
  }
  return { shown, both };
};
const coreQuote = (occ: unknown[]) => {
  const events = sim(occ, 4320).cascade.events;
  const en = /Large core \(about (\d+) mL/.exec(events.map((e) => e.desc.en).join('\n'));
  const zh = /大核心（決定治療時約 (\d+) mL）/.exec(events.map((e) => e.desc.zh).join('\n'));
  return { en: en?.[1] ?? null, zh: zh?.[1] ?? null };
};

describe('codex review 1', () => {
  it('quotes the real midline shift for simultaneous asymmetric bilateral lesions', () => {
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m2_sup_l', severity: 1 }];
    const { quoted } = bilateralQuote(occ, true);
    expect(quoted).not.toBeNull();
    // quarter-hours: decompression drops the shift between whole hours, and that instant is the peak
    const { shown, both } = bothSwellMax(occ, true, 0, 400, 0.25);
    expect(both).toBe(true);
    expect(quoted!).toBe(+shown.toFixed(1));
  });

  it('quotes no more midline shift than shown once a late second hemisphere swells', () => {
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 200 }];
    const { quoted } = bilateralQuote(occ, false);
    expect(quoted).not.toBeNull();
    // while both swell: from the later lesion, until either side's own shift drops to <= 0.05 mm
    const { shown, both } = bothSwellMax(occ, false, 200, 600);
    expect(both).toBe(true);
    expect(quoted!).toBe(+shown.toFixed(1));
  });

  it('with decompression, quotes the shift only while both sides still swell', () => {
    // right M1 at 0, left M1 at 300 h: after the right side stops swelling the left alone reaches ~3.5 mm
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 300 }];
    const { quoted, zh } = bilateralQuote(occ, true);
    expect(quoted).not.toBeNull();
    const { shown, both } = bothSwellMax(occ, true, 300, 900);
    expect(both).toBe(true);
    expect(Math.abs(quoted! - shown)).toBeLessThanOrEqual(0.1);
    expect(zh).toContain(`最多約 ${quoted} mm`);
  });

  it('starts the quoted window when the second side is swelling, not at its onset', () => {
    // right M1 at 0, left M2 superior at 200 h: at 201 h the left own shift is still 0 and the midline is ~10.8 mm
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m2_sup_l', severity: 1, fromH: 200 }];
    const { quoted, zh } = bilateralQuote(occ, false);
    expect(quoted).not.toBeNull();
    const at201 = sim(occ, 201, false).edema;
    expect(at201.ownShiftMm.l).toBe(0);
    // half-hours: the shift peaks between whole hours, as the second side begins to swell
    const { shown, both } = bothSwellMax(occ, false, 200, 600, 0.5);
    expect(both).toBe(true);
    expect(quoted!).toBe(+shown.toFixed(1));
    expect(zh).toContain(`最多約 ${quoted} mm`);
  });
});

describe('codex review 1: an old infarct on the worsening side', () => {
  it('a month-old left ACA infarct is not counted in a later worsening left M1 core', () => {
    const month = 720;
    const aca = { vessel: 'aca_a2_l', severity: 1, toH: 48 };
    const worsening = [
      { vessel: 'mca_m1_l', severity: 0.84, fromH: month - 2, toH: month },
      { vessel: 'mca_m1_l', severity: 1, fromH: month },
    ];
    const withOld = coreQuote([aca, ...worsening]);
    const alone = coreQuote([
      { vessel: 'mca_m1_l', severity: 0.84, toH: 2 },
      { vessel: 'mca_m1_l', severity: 1, fromH: 2 },
    ]);
    expect(withOld.en).not.toBeNull();
    expect(withOld.zh).toBe(withOld.en);
    expect(alone.en).not.toBeNull();
    // the old ACA (~92 mL) stays out: the quote matches the M1 lesion alone (~140 mL), not ~232 mL
    expect(Math.abs(Number(withOld.en) - Number(alone.en))).toBeLessThanOrEqual(3);
  });
});
