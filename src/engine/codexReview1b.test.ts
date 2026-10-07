import { describe, expect, it } from 'vitest';
import { simulate, type SimInput } from './simulate';

const sim = (occlusions: unknown[], tH: number) =>
  simulate({ occlusions, variants: [], collateral: 'moderate', map: 93, tH, reperfusionH: null, decompression: false } as unknown as SimInput);

describe('codex review 1: worsening stenosis', () => {
  it('counts the damage a worsening stenosis adds toward the large-core warning', () => {
    const occ = [
      { vessel: 'mca_m1_l', severity: 0.84, toH: 2 },
      { vessel: 'mca_m1_l', severity: 1, fromH: 2 },
    ];
    const texts = sim(occ, 480).cascade.events.map((e) => e.desc.en).join('\n');
    const m = /core[^.]*?about (\d+) mL/.exec(texts);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThan(100);
  });
});

describe('codex review 1: swelling warning gap', () => {
  it('keeps the cerebellar swelling warning without a gap after a third occlusion', () => {
    const occ = [
      { vessel: 'pica_r', severity: 1 },
      { vessel: 'sca_l', severity: 1, fromH: 12 },
      { vessel: 'mca_m1_l', severity: 1, fromH: 30 },
    ];
    const rows = sim(occ, 4320)
      .cascade.events.filter((e) => /^cerebellar_edema(_\d+)?$/.test(e.id))
      .map((e) => [e.onsetH, e.endH ?? Infinity] as const)
      .sort((a, b) => a[0] - b[0]);
    expect(rows.length).toBeGreaterThan(0);
    let reach = rows[0][1];
    for (const [on, end] of rows.slice(1)) {
      expect(on).toBeLessThanOrEqual(reach + 1e-6);
      reach = Math.max(reach, end);
    }
  });
});
