import { describe, expect, it } from 'vitest';
import { simulate, type SimInput } from './simulate';

const run = (occlusions: unknown[], decompression = false) =>
  simulate({ occlusions, variants: [], collateral: 'moderate', map: 93, tH: 4320, reperfusionH: null, decompression } as unknown as SimInput);

describe('stacked swelling stories (T3)', () => {
  it("keeps the first cerebellar infarct's own risk-of-swelling warning when a second begins within a day", () => {
    const first = { vessel: 'pica_r', severity: 1 };
    const warning = (r: ReturnType<typeof run>) => r.cascade.events.filter((e) => /^cerebellar_edema/.test(e.id) && /risk of swelling/.test(e.title.en));
    expect(warning(run([first])).length).toBeGreaterThan(0);
    expect(warning(run([first, { vessel: 'sca_l', severity: 1, fromH: 12 }])).length).toBeGreaterThan(0);
  });

  it('quotes the midline shift shown while two hemispheres swell one after the other', () => {
    const occ = (tH: number) =>
      simulate({
        occlusions: [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 24 }],
        variants: [], collateral: 'moderate', map: 93, tH, reperfusionH: null, decompression: false,
      } as unknown as SimInput);
    const note = occ(4320).cascade.events.map((e) => e.desc.en).find((d) => /other hemisphere is infarcted too/.test(d));
    const quoted = /at most about ([\d.]+) mm|(?:here at most|this shift is at most) ?(?:about )?([\d.]+) mm/.exec(note ?? '');
    if (!quoted) return;
    const end = occ(4320).cascade.events.find((e) => /herniation/.test(e.id))?.onsetH ?? 400;
    let shown = 0;
    for (let tH = 24; tH <= Math.min(424, 24 + end); tH += 3) shown = Math.max(shown, occ(tH).edema.midlineShiftMm);
    expect(Number(quoted[1] ?? quoted[2])).toBeLessThanOrEqual(shown + 0.3);
  });
});
