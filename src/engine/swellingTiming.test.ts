/**
 * The swelling and the timing of tissue loss (sixth review round, group W2): a swelling that
 * puts the patient into a coma takes the malignant course and herniates, with its fatal risk
 * (W2-1); an occlusion that has not begun yet changes nothing at the displayed time (W2-3); one
 * branch of a perforator bundle never leaves more infarct in its structure than the whole bundle
 * closed for as long (W2-2); and from two days after an occlusion begins, the penumbra is only
 * the tissue that the course still loses (W2-10).
 */
import { describe, expect, it } from 'vitest';
import { TIME_STOPS } from '../anatomy/timeline';
import { finalOutcome } from '../ui/finalOutcome';
import { regainingVolume } from '../ui/recoveryFormat';
import { consciousnessFromShift } from './cascade';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';
import { SCENARIOS } from '../anatomy/scenarios';

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
const sym = (r: SimResult) => r.symptoms.map((s) => `${s.id}/${s.side ?? ''}:${s.sev}`).sort();
const active = (r: SimResult, tH: number) => r.cascade.events.filter((e) => e.onsetH <= tH && (e.endH === undefined || tH < e.endH)).map((e) => e.id);
const scenario = (id: string, collateral?: CollateralGrade): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return input(sc.occlusions, collateral ?? sc.collateral ?? 'good', { variants: sc.variants ?? [], map: sc.map ?? 93 });
};

/** everything a result says about the displayed time and before, and its forecast of the course */
const shown = (r: SimResult) => ({
  symptoms: r.symptoms,
  unexaminable: r.unexaminable,
  nihss: r.nihss,
  syndromes: r.syndromes.map((m) => `${m.def.id}_${m.side ?? ''}${m.silent ? '*' : ''}`),
  regions: r.regions,
  volumes: r.volumes,
  edema: r.edema,
  recovery: r.recovery,
  hydrocephalus: r.hydrocephalus,
  onsetH: r.schedule.onsetH,
  events: r.cascade.events.map((e) => ({ id: e.id, onsetH: e.onsetH, endH: e.endH, severity: e.severity, title: e.title, desc: e.desc })),
  fatal: r.cascade.fatalRisk,
});

describe('W2-3: an occlusion that has not begun yet changes nothing at the displayed time', () => {
  it('a left M1 (good) with a lower basilar occlusion from 1 month: at 72 h the swelling, the consciousness and the NIHSS are those of the M1 alone', () => {
    const alone = at(input([o('mca_m1_l')]), 72);
    const later = at(input([o('mca_m1_l'), o('basilar_lower', { fromH: 720 })]), 72);
    expect(later.edema.massEffectMm).toBeCloseTo(alone.edema.massEffectMm, 6);
    expect(later.nihss.items['1a'] ?? 0).toBe(alone.nihss.items['1a'] ?? 0);
    expect(later.nihss.items).toEqual(alone.nihss.items);
    expect(sym(later)).toEqual(sym(alone));
  });

  // the later occlusion is larger and becomes the index event: before it begins, the first
  // infarct still swells, and its own events run, on its own clock
  it('a left inferior M2 (poor) with the superior division from 1 week: at 3 days the first infarct swells and has its own events', () => {
    const alone = at(input([o('mca_m2_inf_l')], 'poor'), 72);
    const later = at(input([o('mca_m2_inf_l'), o('mca_m2_sup_l', { fromH: 168 })], 'poor'), 72);
    expect(alone.edema.massEffectMm).toBeGreaterThan(1);
    expect(shown(later)).toEqual(shown(alone));
    expect(active(later, 72)).toEqual(expect.arrayContaining(['vasogenic_edema', 'mass_effect_l']));
  });

  const PAIRS: [string, SimInput, number][] = [
    ['left M1, then the lower basilar', input([o('mca_m1_l'), o('basilar_lower', { fromH: 720 })]), 720],
    ['left M1, then the right P2', input([o('mca_m1_l'), o('pca_p2_r', { fromH: 72 })]), 72],
    ['left M1, then the left PICA', input([o('mca_m1_l'), o('pica_l', { fromH: 168 })]), 168],
    ['left inferior M2 (poor), then the superior division', input([o('mca_m2_inf_l'), o('mca_m2_sup_l', { fromH: 24 })], 'poor'), 24],
    ['right M1 (moderate), then the left M1', input([o('mca_m1_r'), o('mca_m1_l', { fromH: 120 })], 'moderate'), 120],
    ['the mid-basilar, then the right M1', input([o('basilar_mid'), o('mca_m1_r', { fromH: 720 })], 'poor'), 720],
    ['a left lenticulostriate lacune, then the left M1', input([o('lenticulostriate_l', { branch: true }), o('mca_m1_l', { fromH: 168 })]), 168],
  ];
  it.each(PAIRS)('%s: at every stop before the second occlusion, the result is that of the first alone', (_n, i, from) => {
    const first = { ...i, occlusions: i.occlusions.filter((x) => (x.fromH ?? 0) < from) };
    for (const tH of STOPS.filter((h) => h < from)) expect(shown(at(i, tH)), `${tH} h`).toEqual(shown(at(first, tH)));
  });

  it('the schedule still shows the later occlusion as pending, and the outcome is that of the whole schedule', () => {
    const i = input([o('mca_m1_l'), o('basilar_lower', { fromH: 720 })]);
    const r = at(i, 72);
    expect(r.input).toEqual({ ...i, tH: 72 });
    expect(r.schedule.status).toEqual(['active', 'pending']);
    expect(r.schedule.events.map((e) => `${e.kind}@${e.h}`)).toEqual(['onset@0', 'onset@720']);
    // the Outcome tab is the whole schedule's, larger than the first occlusion's own forecast
    expect(finalOutcome(i).course.finalInfarct).toBeGreaterThan(r.volumes.finalInfarct + 30);
  });

  it('a stenosis that occludes later is, before then, a stenosis that lasts (its end is the occlusion it has not become yet)', () => {
    const i = scenario('basilar_stuttering');
    const progression = i.occlusions.find((x) => (x.fromH ?? 0) > 1)!.fromH!;
    const lasting = { ...i, occlusions: i.occlusions.filter((x) => (x.fromH ?? 0) < progression).map((x) => (x.toH === progression ? { ...x, toH: null } : x)) };
    for (const tH of STOPS.filter((h) => h < progression)) expect(shown(at(i, tH)), `${tH} h`).toEqual(shown(at(lasting, tH)));
  });
});

describe('W2-1: a swelling that reaches the coma range takes the malignant course and herniates', () => {
  const bilateralIca = input([o('ica_cervical_l'), o('ica_cervical_r')], 'good');
  it('both cervical ICAs (good collaterals): comatose from the swelling of both hemispheres, which herniate, with the fatal risk', () => {
    const r = at(bilateralIca, 72);
    expect(consciousnessFromShift(r.edema.massEffectMm)?.sev).toBe(3);
    expect(active(r, 72).some((id) => /^uncal_/.test(id))).toBe(true);
    expect(active(r, 72).some((id) => /^malignant_edema_/.test(id))).toBe(true);
    expect(active(r, 72).some((id) => /^mass_effect_/.test(id))).toBe(false);
    expect(finalOutcome(bilateralIca).fatal).toContain('herniation');
  });

  it('a right cervical ICA with the left A1 (moderate): the right hemisphere alone shifts the midline into the coma range, and herniates', () => {
    const i = input([o('ica_cervical_r'), o('aca_a1_l')], 'moderate');
    const r = at(i, 72);
    expect(r.edema.midlineShiftMm).toBeGreaterThanOrEqual(8);
    expect(r.edema.shiftFrom).toBe('r');
    expect(active(r, 72)).toEqual(expect.arrayContaining(['malignant_edema_r', 'uncal_r']));
    expect(finalOutcome(i).fatal).toContain('herniation');
  });

  it('both A2 arteries (poor collaterals): stuporous from the swelling, not comatose, and no herniation (Z3-4 kept)', () => {
    const i = input([o('aca_a2_r'), o('aca_a2_l')], 'poor');
    const peak = Math.max(...STOPS.map((h) => at(i, h).edema.massEffectMm));
    expect(peak).toBeLessThan(8);
    expect(finalOutcome(i).fatal).not.toContain('herniation');
  });
});

describe('W2-2: one branch never leaves more infarct in its structure than its whole bundle', () => {
  const capsule = (r: SimResult) => r.regions.ic_posterior_limb_l.infarct;
  it.each([1, 2])('the left lenticulostriate trunk or one of its branches closed for %s h: neither infarcts the posterior limb', (h) => {
    const trunk = at(input([o('lenticulostriate_l', { toH: h })]), 2160);
    const branch = at(input([o('lenticulostriate_l', { toH: h, branch: true })]), 2160);
    expect(capsule(trunk)).toBe(0);
    expect(capsule(branch)).toBe(0);
    // a capsular TIA: nothing listed three months later
    expect(branch.symptoms).toEqual([]);
  });

  it('closed for 4 h, and for good: the branch leaves no more of the posterior limb than the trunk', () => {
    for (const toH of [4, undefined]) {
      const trunk = at(input([o('lenticulostriate_l', toH ? { toH } : {})]), 2160);
      const branch = at(input([o('lenticulostriate_l', { branch: true, ...(toH ? { toH } : {}) })]), 2160);
      expect(capsule(branch), `${toH}`).toBeGreaterThan(0);
      expect(capsule(branch), `${toH}`).toBeLessThanOrEqual(capsule(trunk) + 1e-9);
    }
  });

  it('a permanent capsular lacune still gives its pure motor hemiparesis, from the moment the branch closes', () => {
    const i = input([o('lenticulostriate_l', { branch: true })]);
    for (const tH of [0.5, 24, 2160]) {
      const r = at(i, tH);
      expect(r.syndromes.map((m) => m.def.id), `${tH} h`).toContain('lacunar_pure_motor');
    }
    // the lacune is still alive in the first hours (the capsule's white matter dies later)
    expect(at(i, 1).regions.ic_posterior_limb_l.infarct).toBe(0);
  });
});

describe('W2-10: from two days on, the penumbra is the tissue the course still loses', () => {
  it.each([
    ['l_m1', 48],
    ['l_m1', 72],
    ['l_m2_inf', 48],
    ['basilar_tip', 48],
    ['basilar_tip', 72],
    ['watershed', 48],
    ['ica_isolated', 72],
  ] as [string, number][])('%s at %s h', (id, tH) => {
    const r = at(scenario(id), tH);
    const still = r.volumes.finalInfarct - r.volumes.core;
    expect(r.volumes.penumbra).toBeLessThanOrEqual(still + 0.5);
    expect(r.volumes.penumbra).toBeGreaterThanOrEqual(still - 0.5);
  });

  it('the left M1 at 48 h: the tissue that survives is not lost but still silent, regaining its function', () => {
    const r = at(scenario('l_m1'), 48);
    const before = at(scenario('l_m1'), 24);
    expect(regainingVolume(r)).toBeGreaterThan(50);
    // the deficit does not change for it
    expect(r.nihss.total).toBeGreaterThanOrEqual(before.nihss.total);
  });
});
