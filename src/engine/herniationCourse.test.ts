/**
 * The herniation and the swelling of several lesions (eighth review round, group U1): a smaller
 * swelling of the other hemisphere never takes a malignant infarct's own herniation and its
 * secondary infarcts away (U1-0); both MCA territories destroyed end in a disorder of
 * consciousness, whether or not a herniation adds infarcts (U1-4); tissue a herniation has killed
 * stays dead when a later occlusion begins (U1-3); an earlier lesion keeps its fatal herniation and
 * is not joined with a lesion months later (U1-14); and a later occlusion in the same hemisphere
 * does not relabel the earlier swelling or swell it at once (U1-2).
 */
import { describe, expect, it } from 'vitest';
import { BEDS, REGION_BY_ID } from '../anatomy';
import { TIME_STOPS } from '../anatomy/timeline';
import { finalOutcome } from '../ui/finalOutcome';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const input = (occlusions: Occlusion[], collateral: CollateralGrade = 'good', over: Partial<SimInput> = {}): SimInput => ({
  occlusions,
  variants: [],
  collateral,
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
  ...over,
});
const o = (vessel: string, fromH?: number): Occlusion => (fromH === undefined ? { vessel, severity: 1 } : { vessel, severity: 1, fromH });
const at = (i: SimInput, tH: number) => simulate({ ...i, tH });
const STOPS = TIME_STOPS.map((s) => s.h);
const ids = (r: SimResult) => r.cascade.events.map((e) => e.id);
const event = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
/** the dead tissue of each hemisphere (mL) */
const hemisphere = (r: SimResult, side: 'r' | 'l') =>
  BEDS.reduce((a, b) => {
    const reg = REGION_BY_ID[b.region];
    return reg.compartment === 'supra' && reg.side === side ? a + r.beds[b.id].frac.core * b.volume : a;
  }, 0);

describe('U1-0: a smaller swelling of the other hemisphere does not take a malignant infarct’s herniation and its infarcts away', () => {
  // [name, the malignant infarct alone, with the other hemisphere's smaller infarct, its side]
  const PAIRS: [string, SimInput, SimInput, 'r' | 'l'][] = [
    ['right M1 (poor) + left M2 superior (poor)', input([o('mca_m1_r')], 'poor'), input([o('mca_m1_r'), o('mca_m2_sup_l')], 'poor'), 'r'],
    ['right carotid T (good) + left M1 (good)', input([o('ica_terminal_r')]), input([o('ica_terminal_r'), o('mca_m1_l')]), 'r'],
    ['right M1 (poor) + left M1 (poor)', input([o('mca_m1_r')], 'poor'), input([o('mca_m1_r'), o('mca_m1_l')], 'poor'), 'r'],
  ];
  it.each(PAIRS)('%s: the final infarct, that of the first hemisphere and of every region are no smaller than with the first alone', (_n, alone, both, side) => {
    const a = at(alone, 4320);
    const b = at(both, 4320);
    expect(b.volumes.finalInfarct).toBeGreaterThanOrEqual(a.volumes.finalInfarct - 0.5);
    expect(hemisphere(b, side)).toBeGreaterThanOrEqual(hemisphere(a, side) - 0.5);
    for (const [rid, st] of Object.entries(a.regions)) expect(b.regions[rid].infarct, rid).toBeGreaterThanOrEqual(st.infarct - 0.01);
  });

  it('right M1 (poor) + left M2 superior (poor): the right hemisphere herniates to its own side, as alone, and is not told as staying in place', () => {
    const i = input([o('mca_m1_r'), o('mca_m2_sup_l')], 'poor');
    const r = at(i, 96);
    expect(ids(r)).toEqual(expect.arrayContaining(['subfalcine_r', 'uncal_r']));
    expect(ids(r)).not.toContain('central_herniation');
    expect(r.edema.midlineShiftMm).toBeGreaterThanOrEqual(4);
    for (const e of r.cascade.events.filter((x) => /^(malignant_edema|mass_effect)_[rl]$/.test(x.id))) {
      expect(e.desc.en, e.id).not.toContain('so the midline moves little');
      expect(e.desc.zh, e.id).not.toContain('中線移動不多');
    }
    expect(finalOutcome(i).regions.map((x) => x.id)).toEqual(expect.arrayContaining(['cuneus_r', 'lingual_r']));
  });

  it('right A1 + left cervical ICA (moderate): a herniation whose other hemisphere swells too little to be told ends as the coma lifts, as its text says', () => {
    const i = input([o('aca_a1_r'), o('ica_cervical_l')], 'moderate');
    const uncal = event(at(i, 4320), 'uncal_l')!;
    expect(ids(at(i, 4320))).not.toContain('mass_effect_r');
    expect(uncal.desc.en).toContain('the midline shift falls below 8 mm');
    // (the small swelling of the right hemisphere adds to the mass that keeps the left one herniated)
    expect(at(i, uncal.endH! - 1).nihss.items['1a']).toBe(3);
  });

  it('both M1 arteries (poor): a decompression, which prevents the herniation, leaves less infarct', () => {
    const both = input([o('mca_m1_r'), o('mca_m1_l')], 'poor');
    expect(at({ ...both, decompression: true }, 4320).volumes.finalInfarct).toBeLessThan(at(both, 4320).volumes.finalInfarct - 50);
  });
});

describe('U1-4: both MCA territories destroyed end in a disorder of consciousness', () => {
  const CASES: [string, SimInput][] = [
    ['both M1 (poor)', input([o('mca_m1_r'), o('mca_m1_l')], 'poor')],
    ['both M1 (moderate)', input([o('mca_m1_r'), o('mca_m1_l')], 'moderate')],
    ['both M1 (poor), decompressed', input([o('mca_m1_r'), o('mca_m1_l')], 'poor', { decompression: true })],
    ['the right M1 (poor), then the left M1 from 48 h', input([o('mca_m1_r'), o('mca_m1_l', 48)], 'poor')],
    ['both carotid T (good)', input([o('ica_terminal_r'), o('ica_terminal_l')])],
  ];
  it.each(CASES)('%s: a disorder of consciousness at 1, 3 and 6 months, scored as unresponsive, with the survivor’s note', (_n, i) => {
    for (const tH of [720, 2160, 4320]) {
      const r = at(i, tH);
      expect(r.symptoms.find((s) => s.id === 'disorder_of_consciousness')?.sev, `${tH} h`).toBe(3);
      expect(r.nihss.items['1a'], `${tH} h`).toBe(3);
    }
    const out = finalOutcome(i);
    expect(out.caveats).toContain('bilateral_hemispheres');
    // not the outcome of the survivors of one hemisphere
    const fatal = at(i, 4320).cascade.events.find((e) => e.id.startsWith('herniation_fatal'));
    if (fatal) {
      expect(fatal.desc.en).not.toMatch(/mRS 0–4/);
      expect(fatal.desc.zh).not.toMatch(/mRS 0–4/);
    }
  });
});

describe('U1-3: tissue a herniation has killed stays dead when a later occlusion begins', () => {
  const PAIRS: [string, SimInput, number][] = [
    ['left M1 (moderate), then the left A2 at 1 week', input([o('mca_m1_l'), o('aca_a2_l', 168)], 'moderate'), 168],
    ['right M1 (moderate), then the right P2 at 1 week', input([o('mca_m1_r'), o('pca_p2_r', 168)], 'moderate'), 168],
    ['right carotid T (moderate), then the right P2 at 1 week', input([o('ica_terminal_r'), o('pca_p2_r', 168)], 'moderate'), 168],
    ['right carotid T (moderate), then the left cervical ICA at 1 week', input([o('ica_terminal_r'), o('ica_cervical_l', 168)], 'moderate'), 168],
  ];
  it.each(PAIRS)('%s: the core does not fall as the second occlusion begins, nor from one stop to the next', (_n, i, from) => {
    const before = at(i, from - 0.1);
    const now = at(i, from);
    expect(now.volumes.core).toBeGreaterThanOrEqual(before.volumes.core - 0.5);
    for (const [id, b] of Object.entries(before.beds)) if (b.effect === 'secondary') expect(now.beds[id].frac.core, id).toBeGreaterThan(0.99);
    let prev = 0;
    for (const tH of STOPS) {
      const c = at(i, tH).volumes.core;
      expect(c, `${tH} h`).toBeGreaterThanOrEqual(prev - 0.5);
      prev = c;
    }
  });
});

describe('U1-14: a later occlusion leaves an earlier lesion’s herniation in place, and lesions months apart swell apart', () => {
  it('left M1 (moderate), then the right carotid T at 1 week: the left herniation’s fatal event and its course stay', () => {
    const i = input([o('mca_m1_l'), o('ica_terminal_r', 168)], 'moderate');
    const before = at(i, 167.9);
    const now = at(i, 168);
    const fatal = event(before, 'herniation_fatal_l')!;
    expect(fatal.onsetH).toBeCloseTo(72, 0);
    expect(event(now, 'herniation_fatal_l')?.onsetH).toBeCloseTo(72, 0);
    const uncal = event(before, 'uncal_l')!;
    expect(event(now, 'uncal_l')!.endH!).toBeGreaterThanOrEqual(uncal.endH! - 1);
  });

  it('the right M1 (good), then the left M1 three months later: each swells as alone, neither is told as the malignant course of both', () => {
    const i = input([o('mca_m1_r'), o('mca_m1_l', 2000)]);
    const before = at(i, 1999);
    const now = at(i, 2200);
    expect(event(before, 'mass_effect_r')?.title.en).toBe('Moderate mass effect (right hemisphere)');
    expect(event(now, 'mass_effect_r')?.title.en).toBe('Moderate mass effect (right hemisphere)');
    expect(ids(now)).not.toContain('malignant_edema_r');
    expect(ids(now)).not.toContain('malignant_edema_l');
    expect(event(now, 'mass_effect_l')?.onsetH).toBeCloseTo(2024, 0);
    expect(event(now, 'mass_effect_l')!.desc.en).not.toContain('swell together');
  });
});

describe('U1-2: a later occlusion in the same hemisphere neither relabels the earlier swelling nor swells it at once', () => {
  it('right PICA (moderate), then the left SCA at 1 week: the first cerebellar swelling is not retold as malignant from its first days', () => {
    const i = input([o('pica_r'), o('sca_l', 168)], 'moderate');
    const before = at(i, 167);
    const now = at(i, 168);
    expect(event(now, 'cerebellar_edema')?.title.en).toBe(event(before, 'cerebellar_edema')!.title.en);
    for (const id of ['brainstem_compression', 'hydrocephalus', 'posterior_fossa_fatal']) {
      expect(ids(before), id).not.toContain(id);
      expect(now.cascade.events.filter((e) => e.id === id && e.onsetH < 168), id).toEqual([]);
    }
  });

  it('left SCA (moderate), then the right PICA at 1 week: the swelling begun stays as told until the later infarct’s first day, both together from then', () => {
    const i = input([o('sca_l'), o('pica_r', 168)], 'moderate');
    const begun = event(at(i, 167), 'cerebellar_edema')!;
    const now = at(i, 4320);
    expect(event(now, 'cerebellar_edema')).toMatchObject({ onsetH: begun.onsetH, title: begun.title });
    const later = now.cascade.events.find((e) => /^cerebellar_edema_\d$/.test(e.id))!;
    expect(later.onsetH).toBeCloseTo(192, 0);
    expect(later.title.en).toMatch(/malignant swelling likely/);
  });

  it('left M2 inferior, then the left M1 at 1 week (moderate): the later swelling is told by its own infarct, the earlier one’s beside it', () => {
    const r = at(input([o('mca_m2_inf_l'), o('mca_m1_l', 168)], 'moderate'), 4320);
    const e = event(r, 'malignant_edema_l')!;
    expect(e.onsetH).toBeCloseTo(192, 0);
    expect(e.desc.en).toContain('with an infarct that began at another time');
    expect(e.desc.zh).toContain('另一次在不同時間開始的梗塞');
    expect(e.desc.en).not.toContain('(> 145 mL carries high risk)');
  });

  it('left M2 inferior (moderate), then the left P2 at 1 week: the moderate mass effect that began on day 1 keeps its title', () => {
    const i = input([o('mca_m2_inf_l'), o('pca_p2_l', 168)], 'moderate');
    const before = at(i, 167);
    const now = at(i, 168);
    expect(event(before, 'mass_effect_l')?.title.en).toBe('Moderate mass effect (left hemisphere)');
    expect(event(now, 'mass_effect_l')?.title.en).toBe('Moderate mass effect (left hemisphere)');
    expect(event(now, 'mass_effect_l')?.onsetH).toBeCloseTo(24, 0);
    // (no other title for the same swelling from the same time)
    expect(now.cascade.events.filter((e) => /^malignant_edema_l/.test(e.id) && e.onsetH < 168)).toEqual([]);
  });

  it.each(['moderate', 'poor'] as const)('left M2 inferior, then the left M2 superior at 1 week (%s): the swelling does not jump as the second begins', (c) => {
    const i = input([o('mca_m2_inf_l'), o('mca_m2_sup_l', 168)], c);
    const before = at(i, 167.9);
    const now = at(i, 168);
    expect(now.volumes.core).toBeCloseTo(before.volumes.core, 0);
    expect(now.edema.midlineShiftMm).toBeLessThanOrEqual(before.edema.midlineShiftMm + 0.3);
    expect(now.nihss.items['1a'] ?? 0).toBe(before.nihss.items['1a'] ?? 0);
  });
});
