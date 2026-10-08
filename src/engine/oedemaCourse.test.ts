/**
 * The swelling and the treatment course (seventh review round, group V1): an earlier infarct keeps
 * its swelling, its herniation infarct and its events when a later, larger occlusion begins (V1-1);
 * two hemispheres that swell alike herniate downward, not to one side (V1-4); what a reopening
 * saves includes the herniation infarcts it prevents (V1-6); a stenosis that closes completely is
 * not told as blood returning (V1-7); and the treatment windows end when the artery reopens (V1-11).
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
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
const o = (vessel: string, over: Partial<Occlusion> = {}): Occlusion => ({ vessel, severity: 1, ...over });
const at = (i: SimInput, tH: number) => simulate({ ...i, tH });
const STOPS = TIME_STOPS.map((s) => s.h);
const active = (r: SimResult, tH: number) => r.cascade.events.filter((e) => e.onsetH <= tH && (e.endH === undefined || tH < e.endH)).map((e) => e.id);
const scenario = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return input(sc.occlusions, sc.collateral ?? 'good', {
    variants: sc.variants ?? [],
    map: sc.map ?? 93,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  });
};

describe('V1-1: an earlier infarct keeps its swelling, its herniation infarct and its events when a later occlusion begins', () => {
  // the second occlusion is the larger one, so it becomes the index event when it begins (W2-3)
  const PAIRS: [string, SimInput, number][] = [
    ['right M1 (poor), then the left M1 from 1 week', input([o('mca_m1_r'), o('mca_m1_l', { fromH: 168 })], 'poor'), 168],
    ['right M1 (poor), then the left M1 from 1 month', input([o('mca_m1_r'), o('mca_m1_l', { fromH: 720 })], 'poor'), 720],
    ['right M1 (good), then the left M1 from 1 week', input([o('mca_m1_r'), o('mca_m1_l', { fromH: 168 })], 'good'), 168],
  ];
  /** the events of the first infarct's swelling, which run on its own clock */
  const OWN = /^(malignant_edema|mass_effect|subfalcine|uncal|herniation_fatal|ccd)_r$|^vasogenic_edema$/;

  it.each(PAIRS)('%s: as the second occlusion begins, the core, the swelling, the consciousness and the events of the first carry on', (_n, i, from) => {
    const before = at(i, from - 0.1);
    const now = at(i, from);
    expect(now.volumes.core).toBeGreaterThanOrEqual(before.volumes.core - 0.5);
    expect(now.edema.massEffectMm).toBeGreaterThanOrEqual(before.edema.massEffectMm - 0.5);
    expect(now.edema.midlineShiftMm).toBeGreaterThanOrEqual(before.edema.midlineShiftMm - 0.5);
    expect(now.nihss.items['1a'] ?? 0).toBeGreaterThanOrEqual(before.nihss.items['1a'] ?? 0);
    const kept = active(before, from - 0.1).filter((id) => OWN.test(id));
    expect(kept.length).toBeGreaterThan(0);
    // (a moderate mass effect may now be told as part of the malignant course of both hemispheres)
    const shownNow = active(now, from);
    for (const id of kept) expect(shownNow, id).toContain(shownNow.includes(id) ? id : id.replace(/^mass_effect_/, 'malignant_edema_'));
  });

  it.each(PAIRS)('%s: the core never shrinks from one stop to the next, and the fatal risk of the first herniation stays', (_n, i) => {
    let prev: SimResult | null = null;
    for (const tH of STOPS) {
      const r = at(i, tH);
      if (prev) expect(r.volumes.core, `${tH} h`).toBeGreaterThanOrEqual(prev.volumes.core - 0.5);
      if (prev?.cascade.fatalRisk.includes('herniation')) expect(r.cascade.fatalRisk, `${tH} h`).toContain('herniation');
      prev = r;
    }
  });

  it('the right M1 (poor) herniates on day 2–3 of its own lesion, before and after the left M1 begins', () => {
    const i = PAIRS[0][1];
    const uncal = (r: SimResult) => r.cascade.events.find((e) => e.id === 'uncal_r')!;
    const early = uncal(at(i, 120));
    const late = uncal(at(i, 336));
    expect(early.onsetH).toBeLessThan(96);
    expect(late.onsetH).toBeCloseTo(early.onsetH, 0);
  });
});

describe('V1-4: two hemispheres that swell alike herniate downward (central herniation), not to one side', () => {
  const bilateralIca = input([o('ica_cervical_r'), o('ica_cervical_l')], 'good');

  it('both cervical ICAs (good): a central herniation, with no subfalcine or uncal herniation and no one-sided secondary infarct', () => {
    const r = at(bilateralIca, 120);
    const ids = r.cascade.events.map((e) => e.id);
    expect(r.edema.midlineShiftMm).toBeLessThan(4);
    expect(r.nihss.items['1a']).toBe(3);
    expect(active(r, 120)).toContain('central_herniation');
    expect(ids.filter((id) => /^(subfalcine|uncal)_/.test(id))).toEqual([]);
    expect(r.symptoms.filter((s) => s.id === 'cn3_palsy' && s.side !== 'both')).toEqual([]);
    const end = at(bilateralIca, 4320);
    expect(Object.entries(end.beds).filter(([, b]) => b.effect === 'secondary').map(([id]) => id)).toEqual([]);
    expect(finalOutcome(bilateralIca).fatal).toContain('herniation');
  });

  it('both cervical ICAs (good): both hemispheres are told the same, without a one-sided push across or one hemisphere’s outcome', () => {
    const r = at(bilateralIca, 120);
    const malignant = r.cascade.events.filter((e) => /^malignant_edema_/.test(e.id));
    expect(malignant.map((e) => e.id).sort()).toEqual(['malignant_edema_l', 'malignant_edema_r']);
    for (const e of malignant) {
      expect(e.title.en).toMatch(/^Malignant/);
      expect(e.title.zh).not.toContain('高風險');
      expect(e.desc.en).not.toContain('The swollen hemisphere pushes the midline across');
      expect(e.desc.zh).not.toContain('腫脹的半球把中線推向對側');
      expect(e.desc.en).toContain('central herniation');
    }
    const fatal = r.cascade.events.filter((e) => /^herniation_fatal/.test(e.id));
    expect(fatal).toHaveLength(1);
    expect(fatal[0].desc.en).not.toContain('mRS 0–4');
    expect(fatal[0].desc.zh).not.toContain('mRS 0–4');
    expect(fatal[0].desc.en).toContain('describe one hemisphere, not both');
  });

  it('one hemisphere that swells alone still herniates to its own side (uncal and subfalcine), as before', () => {
    const r = at(scenario('r_m1_malignant'), 120);
    expect(active(r, 120)).toEqual(expect.arrayContaining(['uncal_r', 'subfalcine_r', 'herniation_fatal_r']));
    expect(r.cascade.events.some((e) => e.id === 'central_herniation')).toBe(false);
  });
});

describe('V1-6: what a reopening saves includes the herniation infarcts it prevents', () => {
  const CASES: [string, SimInput][] = [
    ['the malignant right M1 reopened at 2 h', scenario('r_m1_malignant', { reperfusionH: 2 })],
    ['the right carotid T reopened by thrombectomy at 3 h', scenario('r_ica_t', { reperfusionH: 3, treatment: { method: 'evt', grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 } })],
  ];
  it.each(CASES)('%s: saved = untreated final infarct − treated final infarct, and the recanalisation event says the same', (_n, i) => {
    const fo = finalOutcome(i);
    expect(fo.untreated!.fatal).toContain('herniation');
    const saved = fo.course.m6.volumes.saved;
    expect(saved).toBeCloseTo(fo.untreated!.finalInfarct - fo.course.finalInfarct, 1);
    const ev = at(i, 24).cascade.events.find((e) => e.id === 'reperfusion')!;
    expect(ev.desc.en).toContain(`${saved.toFixed(0)} mL less infarct`);
    expect(ev.desc.zh).toContain(`${saved.toFixed(0)} mL 的梗塞`);
    // the part that the herniation would have infarcted is named
    expect(ev.desc.en).toContain('herniation');
  });
});

describe('V1-7: a stenosis that closes completely is not told as blood returning', () => {
  it('the stuttering basilar: some limb movement comes back, with no reopening that never happened', () => {
    const r = at(scenario('basilar_stuttering'), 2160);
    const incomplete = r.cascade.events.find((e) => e.id === 'locked_in_incomplete')!;
    expect(incomplete.desc.en).not.toContain('Blood returned');
    expect(incomplete.desc.zh).not.toContain('血流在發作後');
    expect(incomplete.desc.en).toContain('Some limb movement has come back');
  });
});

describe('V1-11: the treatment windows end when the artery reopens', () => {
  it('the left M1 opened by thrombectomy at 2 h: the windows are offered until then, not after', () => {
    const i = scenario('l_m1_thrombectomy');
    expect(active(at(i, 1), 1)).toContain('treatment_window');
    for (const tH of [2, 3, 12]) expect(active(at(i, tH), tH), `${tH} h`).not.toContain('treatment_window');
  });

  it('a left M1 (moderate) that reopens by itself at 45 min: the windows end then', () => {
    const i = input([o('mca_m1_l', { toH: 0.75 })], 'moderate');
    const r = at(i, 12);
    expect(r.volumes.finalInfarct).toBeGreaterThan(0.05);
    expect(active(at(i, 0.5), 0.5)).toContain('treatment_window');
    expect(r.cascade.events.find((e) => e.id === 'treatment_window')!.endH).toBeCloseTo(0.75, 6);
  });

  it('a failed thrombectomy (eTICI 0) leaves the artery closed: the windows stay', () => {
    const i = input([o('mca_m1_l')], 'moderate', { reperfusionH: 3, treatment: { method: 'evt', grade: '0', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 } });
    expect(active(at(i, 6), 6)).toContain('treatment_window');
  });
});
