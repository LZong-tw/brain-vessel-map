/**
 * Consciousness, the courses of both hemispheres and the NIHSS consciousness items (fifth review
 * round, group Z3): the basilar "often fatal" risk is that of a coma the basilar lesion itself
 * causes, never one from a swollen hemisphere or before the basilar artery closes (Z3-2); the
 * malignant-oedema course of two infarcted hemispheres counts their MCA infarcts, as the evidence
 * for it does (Z3-4); a survivor of the destruction of both hemispheres stays in a disorder of
 * consciousness, a cerebral peduncle the herniation infarcted keeps the third-nerve palsy of the
 * oculomotor fascicles that cross it, and both hemispheres have their own survival note (Z3-12);
 * what is tested through language cannot be examined in a patient who does not understand speech
 * (Z3-16); and the NIHSS consciousness items agree with each other (Z3-17).
 */
import { describe, expect, it } from 'vitest';
import { TIME_STOPS } from '../anatomy/timeline';
import { RECOVERY_UI } from '../i18n/uiRecovery';
import { OUTCOME_UI } from '../i18n/uiOutcome';
import { finalOutcome } from '../ui/finalOutcome';
import { improvedSince } from '../ui/recoveryFormat';
import { estimateNihss, examinability, type SymptomItem } from './clinical';
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
const o = (vessel: string, fromH?: number): Occlusion => (fromH === undefined ? { vessel, severity: 1 } : { vessel, severity: 1, fromH });
const scenario = (id: string): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return input(sc.occlusions, sc.collateral ?? 'good', { variants: sc.variants ?? [], map: sc.map ?? 93, reperfusionH: sc.reperfusionH ?? null, decompression: sc.decompression ?? false });
};
const at = (i: SimInput, tH: number) => simulate({ ...i, tH });
const STOPS = TIME_STOPS.map((s) => s.h);
const ids = (r: SimResult) => r.cascade.events.map((e) => e.id);
const has = (r: SimResult, id: string, side?: 'r' | 'l' | null) => r.symptoms.some((s) => s.id === id && (side === undefined || s.side === side));
const sym = (id: string, sev: 1 | 2 | 3, side: SymptomItem['side'] = null, sources: string[] = []): SymptomItem => ({ id, side, sev, sources, delayed: false });

describe('Z3-2: the basilar "often fatal" risk is that of a coma from the basilar lesion itself', () => {
  // the coma of a swollen hemisphere, before or after the basilar artery closes, is the
  // herniation's own fatal risk, not that of an unreopened basilar occlusion with coma
  const HEMISPHERIC_COMA: [string, SimInput][] = [
    ['right M1 (poor), then the mid-basilar at 1 month', input([o('mca_m1_r', 0), o('basilar_mid', 720)], 'poor')],
    ['left M1 (poor), then the lower basilar at 1 month', input([o('mca_m1_l', 0), o('basilar_lower', 720)], 'poor')],
    ['the mid-basilar, then the right M1 at 1 month (poor)', input([o('basilar_mid', 0), o('mca_m1_r', 720)], 'poor')],
    ['the right M1 and the mid-basilar together (good)', input([o('mca_m1_r'), o('basilar_mid')], 'good')],
    ['the lower basilar, then the right M1 at 1 month (moderate)', input([o('basilar_lower', 0), o('mca_m1_r', 720)], 'moderate')],
  ];
  it.each(HEMISPHERIC_COMA)('%s: no basilar fatal risk, the herniation is the fatal risk', (_name, i) => {
    const out = finalOutcome(i);
    expect(out.fatal).toEqual(['herniation']);
    expect(ids(at(i, 4320))).not.toContain('basilar_fatal');
  });

  it('a left M1 (good collaterals) drowsy from its swelling, then a lower basilar locked-in state: no fatal risk, the locked-in caveat kept', () => {
    const i = input([o('mca_m1_l', 0), o('basilar_lower', 720)], 'good');
    const out = finalOutcome(i);
    expect(out.fatal).toEqual([]);
    expect(out.caveats).toEqual(['locked_in']);
  });

  it('a coma from the basilar lesion itself keeps the risk, from when it is first listed and never before the artery closes', () => {
    for (const [i, start] of [
      [scenario('basilar_tip'), 0],
      [input([o('basilar_upper')], 'moderate'), 0],
      [input([o('mca_m1_l', 0), o('basilar_upper', 720)], 'poor'), 720],
      [input([o('basilar_upper', 0), o('mca_m1_l', 720)], 'poor'), 0],
    ] as [SimInput, number][]) {
      const e = at(i, 4320).cascade.events.find((x) => x.id === 'basilar_fatal');
      expect(e, JSON.stringify(i.occlusions)).toBeDefined();
      expect(e!.onsetH).toBeGreaterThanOrEqual(start);
      // the coma is listed then, from the brainstem
      const r = at(i, e!.onsetH + 0.01);
      expect(r.symptoms.some((s) => ['coma', 'disorder_of_consciousness'].includes(s.id) && s.sources.some((src) => /^(pons|midbrain|medulla|thalamus)_/.test(src)))).toBe(true);
    }
  });
});

describe('Z3-4: the malignant course of two hemispheres counts their MCA infarcts', () => {
  const NON_MCA: [string, SimInput][] = [
    ['both A2 (poor)', input([o('aca_a2_r'), o('aca_a2_l')], 'poor')],
    ['both P2 (poor)', input([o('pca_p2_r'), o('pca_p2_l')], 'poor')],
    ['right P2 and left A2 (poor)', input([o('pca_p2_r'), o('aca_a2_l')], 'poor')],
  ];
  it.each(NON_MCA)('%s: a moderate mass effect on each side, no malignant course, no herniation', (_name, i) => {
    const r = at(i, 72);
    const events = ids(r);
    expect(events.filter((id) => id.startsWith('malignant_edema'))).toEqual([]);
    expect(events.filter((id) => /^(uncal|subfalcine|herniation_fatal)_/.test(id))).toEqual([]);
    expect(events.filter((id) => id.startsWith('mass_effect')).length).toBeGreaterThan(0);
    expect(finalOutcome(i).fatal).toEqual([]);
    // the swelling of both hemispheres is still counted together for the level of consciousness
    const both = r.cascade.events.find((e) => e.id.startsWith('mass_effect'))!;
    expect(both.desc.en).toMatch(/counts their swelling together/);
  });

  it('two MCA infarcts still take the malignant course together; an ACA infarct beside a malignant MCA infarct does not', () => {
    for (const i of [input([o('mca_m1_r'), o('mca_m1_l')]), input([o('mca_m2_sup_r'), o('mca_m2_sup_l')], 'poor')]) {
      const events = ids(at(i, 72));
      expect(events).toContain('malignant_edema_r');
      expect(events).toContain('malignant_edema_l');
    }
    const mixed = ids(at(input([o('mca_m1_r'), o('aca_a2_l')], 'poor'), 72));
    expect(mixed).toContain('malignant_edema_r');
    expect(mixed).not.toContain('malignant_edema_l');
    expect(mixed).toContain('mass_effect_l');
  });

  it('a side at risk only with the other hemisphere says that the two are counted together, not "> 145 mL" beside a smaller volume', () => {
    // (each superior division ≈ 95 mL within 14 h with moderate collaterals)
    const r = at(input([o('mca_m2_sup_r'), o('mca_m2_sup_l')], 'moderate'), 72);
    for (const s of ['r', 'l']) {
      const e = r.cascade.events.find((x) => x.id === `malignant_edema_${s}`)!;
      expect(e.desc.en).not.toMatch(/\(> 145 mL carries high risk\)/);
      expect(e.desc.en).toMatch(/On its own this hemisphere's early infarct is under the 145 mL/);
      expect(e.desc.en).toMatch(/both hemispheres together/);
      expect(e.desc.zh).toMatch(/單看這一側，早期的梗塞不到惡性梗塞的 145 mL/);
      expect(e.desc.zh).toMatch(/兩側合計/);
      expect(e.desc.zh).not.toMatch(/（> 145 mL 為惡性水腫高風險）/);
    }
  });
});

describe('Z3-4 with stacked occlusions: each hemisphere swells from its own lesion', () => {
  it('a right M1 occluded two days after a left one: its oedema from its own onset, its early volume 14 h after it', () => {
    const r = at(input([o('mca_m1_l', 0), o('mca_m1_r', 48)], 'moderate'), 4320);
    const right = r.cascade.events.find((e) => e.id === 'malignant_edema_r')!;
    const left = r.cascade.events.find((e) => e.id === 'malignant_edema_l')!;
    expect(left.onsetH).toBe(24);
    expect(right.onsetH).toBe(48 + 24);
    expect(right.endH).toBe(48 + 336);
    // (was "≈ 0 mL within 14 h": the index onset's 14 h, before the right M1 closed)
    const early = Number(/≈ (\d+) mL within 14 h/.exec(right.desc.en)![1]);
    expect(early).toBeGreaterThanOrEqual(145);
  });
});

describe('Z3-12: survivors of the destruction of both hemispheres', () => {
  // (V1-4, U1-0: two hemispheres that swell alike herniate downward together; each keeps the
  // secondary infarcts its own swelling causes. U1-4: both MCA territories mostly infarcted, two-thirds
  // or more of each, are enough, with or without a herniation's infarcts)
  const Z28 = input([o('ica_terminal_l', 0), o('ica_terminal_r', 48)], 'moderate');
  const BOTH_ICAT = input([o('ica_terminal_r'), o('ica_terminal_l')], 'good');
  // the right M1, then the left one a week later (poor): each herniates to its own side
  const SEQ = input([o('mca_m1_r', 0), o('mca_m1_l', 168)], 'poor');

  it.each([
    ['left carotid T, then right carotid T at 48 h (moderate)', Z28, 384],
    ['both carotid T (good)', BOTH_ICAT, 336],
  ] as const)('%s: a disorder of consciousness from two weeks after the newer lesion, scored as unresponsive (1a = 3)', (_name, i, from) => {
    for (const tH of STOPS.filter((h) => h >= from)) {
      const r = at(i, tH);
      const doc = r.symptoms.find((s) => s.id === 'disorder_of_consciousness');
      // (or, while the swelling keeps the patient in its coma, that coma, which it follows: both
      // carotid T swell into the third week)
      const coma = r.symptoms.some((s) => s.id === 'coma' && s.sev === 3) && r.edema.massEffectMm >= 8;
      expect(doc?.sev ?? (coma ? 3 : undefined), `${tH} h`).toBe(3);
      expect(r.nihss.items['1a'], `${tH} h`).toBe(3);
      expect([r.nihss.items['1b'], r.nihss.items['1c']], `${tH} h`).toEqual([2, 2]);
    }
    expect(at(i, 720).symptoms.find((s) => s.id === 'disorder_of_consciousness')?.sev).toBe(3);
    const ev = at(i, 4320).cascade.events.find((e) => e.id === 'hemispheres_destroyed')!;
    expect(ev.onsetH).toBeCloseTo(from, 0);
    expect(ev.desc.en).toMatch(/Adams 2000|vegetative/);
    expect(ev.desc.zh).toMatch(/植物人/);
  });

  it('the coma of the herniation gives way to the disorder of consciousness, not to an alert patient', () => {
    const before = at(Z28, 336);
    const after = at(Z28, 720);
    expect(before.symptoms.some((s) => s.id === 'coma' && s.sev === 3)).toBe(true);
    const gone = improvedSince(before.symptoms, after.symptoms, after.unexaminable).filter((x) => x.to === 0).map((x) => x.s.id);
    expect(gone).not.toContain('coma');
    expect(gone).not.toContain('cn3_palsy');
  });

  it('a cerebral peduncle the herniation infarcted keeps the third-nerve palsy of the fascicles that cross it', () => {
    for (const tH of [720, 2160]) {
      const z = at(SEQ, tH);
      expect(z.regions.midbrain_peduncle_r.infarct).toBeGreaterThan(0.9);
      expect(z.regions.midbrain_peduncle_l.infarct).toBeGreaterThan(0.9);
      expect(has(z, 'cn3_palsy', 'r') && has(z, 'cn3_palsy', 'l'), `${tH} h`).toBe(true);
    }
    const m = at(scenario('r_m1_malignant'), 2160);
    expect(m.regions.midbrain_peduncle_r.infarct).toBeGreaterThan(0.9);
    expect(has(m, 'cn3_palsy', 'r')).toBe(true);
    expect(has(m, 'cn3_palsy', 'l')).toBe(false);
    // a peduncle infarct of its lateral part alone (the anterior choroidal share) spares them
    for (const tH of [24, 2160]) expect(has(at(scenario('l_acha'), tH), 'cn3_palsy'), `${tH} h`).toBe(false);
  });

  it('the Outcome tab gives both hemispheres their own survival note, not the figures of one hemisphere', () => {
    for (const i of [Z28, BOTH_ICAT]) {
      const out = finalOutcome(i);
      expect(out.fatal).toEqual(['herniation']);
      expect(out.caveats).toEqual(['bilateral_hemispheres']);
      const ev = at(i, 4320).cascade.events.find((e) => e.id.startsWith('herniation_fatal'))!;
      expect(ev.desc.en).not.toMatch(/most untreated survivors were still mRS 0–4/);
      expect(ev.desc.en).toMatch(/both hemispheres/);
      expect(ev.desc.zh).toMatch(/兩側/);
    }
    for (const lang of ['en', 'zh-TW'] as const) {
      expect(OUTCOME_UI[lang].fatalBilateral).toBeTruthy();
      expect(OUTCOME_UI[lang].survival.bilateral_hemispheres).toBeTruthy();
    }
    expect(OUTCOME_UI.en.fatalBilateral).not.toMatch(/mRS 0–4/);
  });

  it('one hemisphere, or two that are not destroyed, keep the picture they had', () => {
    for (const [i, tH] of [
      [scenario('r_m1_malignant'), 2160],
      // (both M1 arteries with good collaterals infarct about half of each MCA territory: U1-4)
      [input([o('mca_m1_r'), o('mca_m1_l')], 'good', { decompression: true }), 2160],
      [input([o('mca_m2_sup_r'), o('mca_m2_sup_l')], 'good'), 2160],
    ] as [SimInput, number][]) {
      expect(has(at(i, tH), 'disorder_of_consciousness')).toBe(false);
      expect(finalOutcome(i).caveats).not.toContain('bilateral_hemispheres');
    }
  });
});

describe('Z3-16: what is tested through language cannot be examined in a patient who does not understand speech', () => {
  const LANGUAGE_TESTED = ['alexia', 'agraphia', 'acalculia', 'finger_agnosia', 'amnesia'];

  it('a moderate or severe global, Wernicke or mixed transcortical aphasia: reading, writing, calculation, finger naming and memory are named apart', () => {
    for (const type of ['aphasia_global', 'aphasia_wernicke', 'aphasia_mixed_tc'])
      for (const id of [...LANGUAGE_TESTED, 'diplopia', 'vertigo'])
        expect(examinability(id, [sym(type, 2), sym(id, 2)]), `${type} ${id}`).toBe('aphasia');
  });

  it('apraxia is tested by imitation and stays listed; a mild aphasia or one that comprehends leaves them testable', () => {
    expect(examinability('apraxia', [sym('aphasia_global', 3), sym('apraxia', 2)])).toBeNull();
    for (const aphasia of [sym('aphasia_wernicke', 1), sym('aphasia_broca', 3), sym('aphasia_conduction', 2)])
      for (const id of LANGUAGE_TESTED) expect(examinability(id, [aphasia, sym(id, 2)]), `${aphasia.id} ${aphasia.sev} ${id}`).toBeNull();
  });

  it('the left M1 template at onset lists the global aphasia and names the language-tested signs apart', () => {
    const r = at(scenario('l_m1'), 0);
    expect(has(r, 'aphasia_global')).toBe(true);
    for (const id of LANGUAGE_TESTED) {
      expect(has(r, id), id).toBe(false);
      expect(r.unexaminable.find((s) => s.id === id)?.why, id).toBe('aphasia');
    }
    expect(has(r, 'apraxia')).toBe(true);
  });

  it('the reason has its own words in both languages', () => {
    for (const lang of ['en', 'zh-TW'] as const) {
      const w = RECOVERY_UI[lang].unexaminableBy.aphasia;
      expect(w.label && w.title && w.tag).toBeTruthy();
    }
    expect(RECOVERY_UI.en.unexaminableBy.aphasia.title).toMatch(/imitating/);
    expect(RECOVERY_UI['zh-TW'].unexaminableBy.aphasia.title).toMatch(/模仿/);
  });
});

describe('Z3-17: the NIHSS consciousness items agree with each other', () => {
  it('a stuporous patient, who does not comprehend the questions (1b = 2), performs at most one command (1c ≥ 1)', () => {
    const n = estimateNihss([sym('coma', 2)]);
    expect(n.items['1a']).toBe(2);
    expect(n.items['1b']).toBe(2);
    expect(n.items['1c']).toBe(1);
  });

  it('a moderate akinetic mutism, with little speech (9 = 2), answers at most one question (1b ≥ 1)', () => {
    const n = estimateNihss([sym('akinetic_mutism', 2)]);
    expect(n.items['9']).toBe(2);
    expect(n.items['1b']).toBe(1);
    expect(n.items['1c']).toBe(1);
  });

  it('the templates: the stuporous thalamic and cerebellar cases score the commands too', () => {
    expect(at(scenario('percheron'), 0).nihss.items['1c']).toBe(1);
    expect(at(scenario('cerebellar_swelling'), 48).nihss.items['1c']).toBe(1);
  });
});
