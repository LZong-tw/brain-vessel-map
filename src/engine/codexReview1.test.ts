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
const bothSwellMax = (occ: unknown[], decompression: boolean, from: number, to: number) => {
  let shown = 0;
  let both = false;
  for (let t = from; t <= to; t += 1) {
    const e = sim(occ, t, decompression).edema;
    const swelling = e.ownShiftMm.r > 0.05 && e.ownShiftMm.l > 0.05;
    if (swelling) {
      both = true;
      shown = Math.max(shown, e.midlineShiftMm);
    } else if (both) break;
  }
  return { shown, both };
};
const coreQuote = (occ: unknown[]) => {
  const events = sim(occ, 4320).cascade.events;
  const en = /Large core \(about (\d+) mL/.exec(events.map((e) => e.desc.en).join('\n'));
  const zh = /大核心（決定治療時約 (\d+) mL）/.exec(events.map((e) => e.desc.zh).join('\n'));
  return { en: en?.[1] ?? null, zh: zh?.[1] ?? null };
};
const shownMax = (occ: unknown[], from: number, to: number, decompression: boolean) => {
  let shown = 0;
  for (let t = from; t <= to; t += 1) shown = Math.max(shown, sim(occ, t, decompression).edema.midlineShiftMm);
  return shown;
};

describe('codex review 1', () => {
  it('quotes the real midline shift for simultaneous asymmetric bilateral lesions', () => {
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m2_sup_l', severity: 1 }];
    const { quoted } = bilateralQuote(occ, true);
    expect(quoted).not.toBeNull();
    const shown = shownMax(occ, 0, 240, true);
    expect(shown).toBeGreaterThan(0.5);
    expect(Math.abs(quoted! - shown)).toBeLessThanOrEqual(0.3);
  });

  it('quotes no more midline shift than shown once a late second hemisphere swells', () => {
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 200 }];
    const { quoted } = bilateralQuote(occ, false);
    expect(quoted).not.toBeNull();
    // while both swell: from the later lesion, until either side's own shift drops to <= 0.05 mm
    let shown = 0;
    let both = false;
    for (let t = 200; t <= 600; t += 1) {
      const e = sim(occ, t, false).edema;
      const swelling = e.ownShiftMm.r > 0.05 && e.ownShiftMm.l > 0.05;
      if (swelling) both = true;
      else if (both) break;
      if (swelling) shown = Math.max(shown, e.midlineShiftMm);
    }
    expect(both).toBe(true);
    expect(quoted!).toBeLessThanOrEqual(shown + 0.3);
    expect(quoted!).toBeGreaterThanOrEqual(shown - 0.3);
  });

  it('with decompression, quotes the shift only while both sides still swell', () => {
    // right M1 at 0, left M1 at 300 h: after the right side stops swelling the left alone reaches ~3.5 mm
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 300 }];
    const { quoted, zh } = bilateralQuote(occ, true);
    expect(quoted).not.toBeNull();
    const { shown, both } = bothSwellMax(occ, true, 300, 900);
    expect(both).toBe(true);
    expect(quoted!).toBeLessThanOrEqual(shown + 0.3);
    expect(quoted!).toBeGreaterThanOrEqual(shown - 0.3);
    expect(zh).toContain(`最多約 ${quoted} mm`);
  });

  it('starts the quoted window when the second side is swelling, not at its onset', () => {
    // right M1 at 0, left M2 superior at 200 h: at 201 h the left own shift is still 0 and the midline is ~10.8 mm
    const occ = [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m2_sup_l', severity: 1, fromH: 200 }];
    const { quoted, zh } = bilateralQuote(occ, false);
    expect(quoted).not.toBeNull();
    const at201 = sim(occ, 201, false).edema;
    expect(at201.ownShiftMm.l).toBe(0);
    const { shown, both } = bothSwellMax(occ, false, 200, 600);
    expect(both).toBe(true);
    expect(quoted!).toBeLessThanOrEqual(shown + 0.3);
    expect(quoted!).toBeGreaterThanOrEqual(shown - 0.3);
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
