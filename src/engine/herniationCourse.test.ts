/**
 * The herniation and the swelling of several lesions (eighth review round, group U1): a smaller
 * swelling of the other hemisphere never takes a malignant infarct's own herniation and its
 * secondary infarcts away (U1-0); both MCA territories destroyed end in a disorder of
 * consciousness, whether or not a herniation adds infarcts (U1-4); tissue a herniation has killed
 * stays dead when a later occlusion begins (U1-3); an earlier lesion keeps its fatal herniation and
 * is not joined with a lesion months later (U1-14); and a later occlusion in the same hemisphere
 * does not relabel the earlier swelling or swell it at once (U1-2). Ninth round (T1): staged
 * cerebellar infarcts, the bilateral shift text and the clock of a herniation’s end (below).
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

/**
 * U3-13 (the class "adding an occlusion never lowers the recovery of a deficit it does not cause"): a
 * herniation's secondary infarct, which no occlusion start dates, has the age of the swelling lesion
 * that herniated, the hemisphere on its own side. Dated from the index onset instead, a malignant
 * right M1 infarct's herniation infarcts started over when a left M1 occlusion a month later became
 * the index event: the left leg weakness lost all its compensation and became plegic the moment the
 * left M1 closed, before any left tissue had died.
 */
describe('U3-13: a herniation infarct keeps the age of the lesion whose swelling caused it', () => {
  const STAGED: [string, Occlusion[], CollateralGrade][] = [
    ['right M1, then left M1 at 1 month, poor', [o('mca_m1_r'), o('mca_m1_l', 720)], 'poor'],
    ['right M1, then left M1 at 48 h, poor', [o('mca_m1_r'), o('mca_m1_l', 48)], 'poor'],
  ];
  it.each(STAGED)('%s: as the later occlusion begins, the earlier lesion’s deficits are no worse and recover no less than alone', (_name, occ, collateral) => {
    const later = occ[1].fromH!;
    for (const tH of [later, later + 0.5]) {
      const alone = at(input([occ[0]], collateral), tH);
      const both = at(input(occ, collateral), tH);
      for (const s of alone.symptoms.filter((x) => ['arm_weak', 'leg_weak', 'face_weak'].includes(x.id) && x.side === 'l')) {
        const w = both.symptoms.find((x) => x.id === s.id && x.side === 'l');
        expect(w?.sev ?? 0, `${s.id} at ${tH} h`).toBeLessThanOrEqual(s.sev);
        // (no less: the later occlusion may shift the flow to the earlier infarct a little)
        expect(w?.recovery?.compensated ?? 0, `${s.id} at ${tH} h`).toBeGreaterThanOrEqual(s.recovery!.compensated - 1e-3);
      }
      expect(both.nihss.items['6l'] ?? 0, `${tH} h`).toBeLessThanOrEqual(alone.nihss.items['6l'] ?? 0);
    }
  });
  it('the herniation infarct of a later lesion is as young as that lesion, as it would be alone', () => {
    // left M1, then right M1 at 48 h: the right hemisphere's herniation infarcts date from 48 h, and
    // the spasticity they give on the left begins two weeks after them, as with the right M1 alone
    const pair = input([o('mca_m1_l'), o('mca_m1_r', 48)], 'moderate');
    const alone = input([o('mca_m1_r', 48)], 'moderate');
    const spastic = (r: SimResult) => r.symptoms.some((s) => s.id === 'spasticity' && s.side === 'l');
    expect(spastic(at(alone, 336))).toBe(false);
    expect(spastic(at(pair, 336))).toBe(false);
    expect(spastic(at(pair, 720))).toBe(spastic(at(alone, 720)));
  });
});

/**
 * The posterior-fossa staging and the herniation texts (ninth review round, group T1): two
 * cerebellar infarcts whose swelling overlaps swell together whichever began first, from the
 * later one's onset (T1-0); the "at most about X mm" of two hemispheres swelling unequally is the
 * midline shift the Now tab shows (T1-1); and a herniation's end is told on the clock of the
 * hemisphere that herniated, never as negative hours (T1-3), nor moved by when the other
 * hemisphere's artery closed (T1-12).
 */
describe('T1-0: two cerebellar infarcts whose swelling overlaps swell together in either order, from when the later one began', () => {
  /** the course of a malignant cerebellar swelling: its events and their times */
  const course = (r: SimResult) =>
    r.cascade.events
      .filter((e) => /^(brainstem_compression|hydrocephalus|posterior_fossa_fatal)$/.test(e.id))
      .map((e) => `${e.id} ${e.onsetH.toFixed(1)}–${e.endH?.toFixed(1)}`)
      .sort();
  // [one, the other, how far apart they begin (h)]: none of these infarcts reaches 38 mL alone
  const PAIRS: [string, string, number][] = [
    ['pica_r', 'sca_l', 72],
    ['pica_r', 'sca_l', 168],
    ['pica_r', 'pica_l', 168],
    ['pica_l', 'pica_r', 24],
  ];
  it.each(PAIRS)('%s and %s, %s h apart (moderate): malignant in both orders, on the same course from the later onset', (a, b, t) => {
    const ab = input([o(a), o(b, t)], 'moderate');
    const ba = input([o(b), o(a, t)], 'moderate');
    const [x, y] = [at(ab, 4320), at(ba, 4320)];
    expect(x.cascade.fatalRisk).toContain('posterior_fossa');
    expect(y.cascade.fatalRisk).toContain('posterior_fossa');
    expect(course(x)).toEqual(course(y));
    // (deterioration from day 3 of the later infarct: never before it began)
    expect(event(x, 'brainstem_compression')!.onsetH).toBeCloseTo(t + 48, 6);
    for (const tH of [t + 72, t + 120, t + 168]) expect(at(ab, tH).nihss.items['1a'] ?? 0, `${tH} h`).toBe(at(ba, tH).nihss.items['1a'] ?? 0);
  });

  it('right PICA, then the left SCA at 72 h (moderate): the swelling told before the SCA began stays, the joint one follows from its first day', () => {
    const i = input([o('pica_r'), o('sca_l', 72)], 'moderate');
    const begun = event(at(i, 71), 'cerebellar_edema')!;
    expect(begun.title.en).toMatch(/risk of swelling/);
    const r = at(i, 4320);
    expect(event(r, 'cerebellar_edema')).toMatchObject({ onsetH: begun.onsetH, title: begun.title, endH: 96 });
    const joint = event(r, 'cerebellar_edema_2')!;
    expect(joint.onsetH).toBeCloseTo(96, 6);
    expect(joint.title.en).toMatch(/malignant swelling likely/);
    expect(joint.desc.en).toMatch(/≈ 59 mL together/);
    expect(joint.desc.zh).toMatch(/合計約 59 mL/);
    // (the coma times on the clock they name: the later infarct's)
    expect(event(r, 'brainstem_compression')!.desc.en).toContain('(here about 58–160 h after the later cerebellar infarct began)');
    expect(event(r, 'brainstem_compression')!.desc.zh).toContain('（這裡約較晚的小腦梗塞開始後 58–160 小時）');
    expect(event(r, 'posterior_fossa_fatal')!.onsetH).toBeCloseTo(72 + 57.5, 0);
    expect(at(i, 192).nihss.items['1a']).toBe(3);
  });
});

describe('T1-1: the most two hemispheres swelling unequally push the midline across is the shift the Now tab shows', () => {
  const PAIRS: [string, SimInput][] = [
    ['right M1 + left M2 superior (poor)', input([o('mca_m1_r'), o('mca_m2_sup_l')], 'poor')],
    ['right carotid T + left M2 inferior (moderate)', input([o('ica_terminal_r'), o('mca_m2_inf_l')], 'moderate')],
    ['left carotid T + right M2 superior (good)', input([o('ica_terminal_l'), o('mca_m2_sup_r')])],
  ];
  it.each(PAIRS)('%s: "at most about X mm" is the largest midline shift shown, in both languages', (_n, i) => {
    let shown = 0;
    for (let tH = 24; tH <= 336; tH += 2) shown = Math.max(shown, at(i, tH).edema.midlineShiftMm);
    const r = at(i, 4320);
    const told = r.cascade.events.filter((e) => /at most about/.test(e.desc.en));
    expect(told.length).toBeGreaterThan(0);
    for (const e of told) {
      const x = +/at most about ([\d.]+) mm/.exec(e.desc.en)![1];
      expect(+/這裡最多約 ([\d.]+) mm/.exec(e.desc.zh)![1], e.id).toBe(x);
      expect(x, e.id).toBeCloseTo(shown, 0);
      expect(x, e.id).toBeGreaterThanOrEqual(shown - 0.15);
    }
  });
});

describe('T1-3, T1-12: a herniation’s end is told on the clock of the hemisphere that herniated', () => {
  const end = (r: SimResult, id: string) => {
    const e = event(r, id)!;
    const en = /\(here about (-?\d+) h after ([^)]*)\)/.exec(e.desc.en)!;
    const zh = /（這裡約在(.*?)後 (-?\d+) 小時）/.exec(e.desc.zh)!;
    return { endH: e.endH!, n: +en[1], clock: en[2], nZh: +zh[2], clockZh: zh[1] };
  };
  it.each([48, 60, 72, 96, 120, 720])('the right M1 (poor), then the left M1 at %s h: the right uncal herniation eases about 279 h after the right infarct began', (t) => {
    const r = at(input([o('mca_m1_r'), o('mca_m1_l', t)], 'poor'), 4320);
    const u = end(r, 'uncal_r');
    expect(u.endH).toBeCloseTo(278.5, 0);
    expect(u.n).toBe(Math.round(u.endH));
    expect(u.clock).toBe("this hemisphere's infarct began");
    expect(u.nZh).toBe(u.n);
    expect(u.clockZh).toBe('這一側梗塞開始');
  });
  it('the right M1 (poor), then the left M1 at 1 month: the later left herniation, the index lesion, keeps "after onset"', () => {
    const r = at(input([o('mca_m1_r'), o('mca_m1_l', 720)], 'poor'), 4320);
    const u = end(r, 'uncal_l');
    expect(u.clock).toBe('onset');
    expect(u.n).toBe(Math.round(u.endH - 720));
  });
});
