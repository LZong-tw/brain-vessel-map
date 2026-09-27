/**
 * NIHSS total vs. "uncaptured" symptoms: the NIHSS does not score everything (e.g. monocular
 * vision loss), so a total of 0 must not be read as "no symptoms" when some exist.
 */
import { describe, expect, it } from 'vitest';
import type { HemoInput } from './hemodynamics';
import { simulate, type SimInput } from './simulate';

const base: HemoInput = { occlusions: [], variants: [], map: 93, collateral: 'good' };
const occl = (...ids: string[]) => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (over: Partial<SimInput>) => simulate({ ...base, tH: 24, reperfusionH: null, decompression: false, ...over });

describe('NIHSS "uncaptured" flag', () => {
  it('a right ophthalmic occlusion (amaurosis): NIHSS total is 0, but uncaptured is true', () => {
    const r = sim({ occlusions: occl('ophthalmic_r'), tH: 1 });
    expect(r.symptoms.some((s) => s.id === 'monocular_blind')).toBe(true);
    expect(r.nihss.total).toBe(0);
    expect(r.nihss.uncaptured).toBe(true);
  });

  it('no occlusion: NIHSS total is 0 and uncaptured is false (there is genuinely nothing to score)', () => {
    const r = sim({});
    expect(r.symptoms).toEqual([]);
    expect(r.nihss.total).toBe(0);
    expect(r.nihss.uncaptured).toBe(false);
  });

  it('a symptomatic occlusion that does score on the NIHSS: uncaptured is false', () => {
    const r = sim({ occlusions: occl('mca_m1_l') });
    expect(r.nihss.total).toBeGreaterThan(0);
    expect(r.nihss.uncaptured).toBe(false);
  });
});
