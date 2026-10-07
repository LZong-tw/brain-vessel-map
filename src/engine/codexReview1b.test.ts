import { describe, expect, it } from 'vitest';
import { BEDS, REGION_BY_ID } from '../anatomy';
import { simulate, type SimInput, type SimResult } from './simulate';

const sim = (occlusions: unknown[], tH: number) =>
  simulate({ occlusions, variants: [], collateral: 'moderate', map: 93, tH, reperfusionH: null, decompression: false } as unknown as SimInput);

/** supratentorial dead volume (mL) of the larger hemisphere, as the Now tab adds the beds */
const deadMl = (r: SimResult) => {
  const side = { r: 0, l: 0 };
  for (const b of BEDS) {
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment !== 'supra' || (reg.side !== 'r' && reg.side !== 'l')) continue;
    side[reg.side] += r.beds[b.id].infarct * b.volume;
  }
  return Math.max(side.r, side.l);
};

describe('codex review 1: worsening stenosis', () => {
  it.each([0.84, 0.9])('severity %s for 2 h, then occlusion: the large-core quote is the dead volume when treatment is decided', (severity) => {
    const occ = [
      { vessel: 'mca_m1_l', severity, toH: 2 },
      { vessel: 'mca_m1_l', severity: 1, fromH: 2 },
    ];
    // the occlusion at 2 h is the index onset, so the decision is 6 h later
    const r = sim(occ, 8);
    expect(r.schedule.onsetH).toBe(2);
    const en = r.cascade.events.map((e) => e.desc.en).join('\n');
    const zh = r.cascade.events.map((e) => e.desc.zh).join('\n');
    const qEn = /Large core \(about (\d+) mL/.exec(en);
    const qZh = /大核心（決定治療時約 (\d+) mL）/.exec(zh);
    expect(qEn).not.toBeNull();
    expect(qZh?.[1]).toBe(qEn![1]);
    expect(Math.abs(Number(qEn![1]) - deadMl(r))).toBeLessThanOrEqual(3);
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
