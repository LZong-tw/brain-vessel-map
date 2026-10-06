/**
 * Labels, NIHSS items and what can be examined (Y2): the label of the deep infarct an early M1
 * reopening leaves, the superior-division TIA template, item 7 by the number of ataxic limbs,
 * bilateral frontal eye fields, recognition signs in a blind patient, akinetic mutism, the Foville
 * template text, a deficit of both sides listed once per side, and the cortical-blindness label.
 */
import { describe, expect, it } from 'vitest';
import { REGION_BY_ID } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYNDROMES } from '../anatomy/syndromes';
import { TIME_STOPS } from '../anatomy/timeline';
import { NEEDS_SIGHT, aggregateSymptoms, estimateNihss, isBlind, type SymptomItem } from './clinical';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const STOPS = TIME_STOPS.map((s) => s.h);
const inputOf = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return {
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH: sc.tH ?? 24,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  };
};
const scenario = (id: string, tH: number) => simulate(inputOf(id, { tH }));
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const run = (occlusions: Occlusion[], tH: number, collateral: CollateralGrade = 'good', over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral, map: 93, tH, reperfusionH: null, decompression: false, ...over });
const labels = (r: SimResult) => r.syndromes.map((s) => s.def.id + (s.side ? `_${s.side}` : ''));
const sev = (r: SimResult, id: string, side: SymptomItem['side'] = null) =>
  r.symptoms.filter((s) => s.id === id && (side === null || s.side === side)).reduce((m, s) => Math.max(m, s.sev), 0);
const item = (r: SimResult, k: string) => r.nihss.items[k] ?? 0;
const sym = (id: string, side: SymptomItem['side'], s: 1 | 2 | 3, sources: string[] = []): SymptomItem => ({ id, side, sev: s, sources, delayed: false });

describe('Y2-2: the deep infarct an early M1 reopening leaves is named for it', () => {
  // after an M1 occlusion reopened at 2 h the residual infarct is mainly striatocapsular (putamen,
  // caudate, posterior limb), with the temporal pole, insula and part of the superior temporal gyrus
  const cases: [string, () => (tH: number) => SimResult, 'r' | 'l'][] = [
    ['l_m1_thrombectomy', () => (tH) => scenario('l_m1_thrombectomy', tH), 'l'],
    ['left M1 reopened at 6 h', () => (tH) => run(occl('mca_m1_l'), tH, 'good', { reperfusionH: 6 }), 'l'],
    ['right M1 reopened at 2 h', () => (tH) => run(occl('mca_m1_r'), tH, 'good', { reperfusionH: 2 }), 'r'],
    ['left M1 reopened at 1 h (no label before)', () => (tH) => run(occl('mca_m1_l'), tH, 'good', { reperfusionH: 1 }), 'l'],
    [
      'left M1 reopened at 2 h, a fragment in the A2',
      () => (tH) =>
        run(occl('mca_m1_l'), tH, 'good', {
          reperfusionH: 2,
          treatment: { method: 'evt', grade: '3', reocclusionAfterH: null, distalEmbolus: 'aca_a2_l', noReflow: 0 },
        }),
      'l',
    ],
  ];
  // Y1-12: the rescued cortex regains its function over the first day or two after the reopening
  // (later the later it is), so the complete-MCA picture lasts until then; the deep infarct is
  // named once it is what is left
  it.each(cases)('%s: the striatocapsular label is shown with the hemiparesis once the rescued cortex works again, to 6 months', (_, make, side) => {
    const at = make();
    const body = side === 'l' ? 'r' : 'l';
    for (const tH of STOPS.filter((h) => h >= 72)) {
      const r = at(tH);
      if (sev(r, 'arm_weak', body) === 0) continue;
      expect(labels(r), `${tH} h`).toContain(`striatocapsular_${side}`);
    }
    // until then, the whole territory's picture
    expect(labels(at(2))).toContain(`mca_complete_${side}`);
  });

  it('the inferior-division label, shown with it, says where a hemiparesis comes from', () => {
    // (Y1-0: after a reopening at 2 h the cortical infarct is now too small for the inferior-division
    // label; reopened at 6 h it is not)
    // (Z1-7: reopened at 6 h the capsule has lost most, not all, of its lenticulostriate part, so
    // the arm is moderately weak at a week: 2, was 3)
    const r = run(occl('mca_m1_l'), 168, 'good', { reperfusionH: 6 });
    expect(sev(r, 'arm_weak', 'r')).toBeGreaterThanOrEqual(2);
    expect(labels(r)).toEqual(expect.arrayContaining(['mca_inferior_l', 'striatocapsular_l']));
    const inferior = SYNDROMES.find((d) => d.id === 'mca_inferior')!;
    expect(inferior.desc.en).toMatch(/hemiparesis means the deep \(lenticulostriate\) territory/);
    expect(inferior.desc.zh).toMatch(/豆紋動脈區/);
  });

  it('a lenticulostriate group occlusion is still a striatocapsular infarct, and a complete MCA infarct is not one', () => {
    expect(labels(scenario('l_lsa', 24))).toContain('striatocapsular_l');
    for (const tH of [24, 2160]) expect(labels(scenario('l_m1', tH)), `${tH} h`).not.toContain('striatocapsular_l');
  });
});

describe('Y2-4: the superior-division TIA shows the classic picture during the attack', () => {
  it('face and arm weakness with the Broca aphasia and the superior-division label; nothing left after it', () => {
    const attack = scenario('tia_l_mca', 0);
    expect(sev(attack, 'face_weak', 'r')).toBeGreaterThanOrEqual(2);
    expect(sev(attack, 'arm_weak', 'r')).toBeGreaterThanOrEqual(2);
    expect(attack.symptoms.some((s) => s.id === 'aphasia_broca')).toBe(true);
    expect(labels(attack)).toContain('mca_superior_l');
    for (const tH of [24, 2160]) {
      const r = scenario('tia_l_mca', tH);
      expect(r.nihss.total, `${tH} h`).toBe(0);
      expect(r.volumes.finalInfarct, `${tH} h`).toBeLessThan(0.05);
    }
  });

  it('the summary names the weakness, in both languages', () => {
    const sc = SCENARIOS.find((s) => s.id === 'tia_l_mca')!;
    expect(sc.collateral).toBe('moderate');
    expect(sc.summary.en).toMatch(/right face and arm go weak and numb/);
    expect(sc.summary.zh).toMatch(/右臉與右手無力/);
  });
});

describe('Y2-8: NIHSS item 7 counts ataxic limbs', () => {
  const only = (...s: SymptomItem[]) => estimateNihss(s).items['7'] ?? 0;
  it('a mild ataxia of one side is one limb (1), a moderate or marked one the arm and the leg (2)', () => {
    expect(only(sym('ataxia_limb', 'l', 1))).toBe(1);
    expect(only(sym('ataxia_limb', 'l', 2))).toBe(2);
    expect(only(sym('ataxia_limb', 'l', 3))).toBe(2);
    // two sides add up, to at most 2
    expect(only(sym('ataxia_limb', 'l', 1), sym('ataxia_limb', 'r', 1))).toBe(2);
    expect(only(sym('ataxia_limb', 'l', 2), sym('ataxia_limb', 'r', 2))).toBe(2);
    // not out of proportion to a paralysed arm: not scored on that side
    expect(only(sym('ataxia_limb', 'l', 2), sym('arm_weak', 'l', 3))).toBe(0);
  });

  it('the templates that describe ataxia of the arm and the leg score 2', () => {
    // "marked ataxia of the same limbs", "clumsy, uncoordinated right limbs"
    for (const id of ['r_pontine_lacune', 'l_cr_lacune', 'r_pica', 'r_wallenberg']) expect(item(scenario(id, 24), '7'), id).toBe(2);
  });
});

describe('Y2-13: both frontal eye fields', () => {
  it('both M1 arteries: no opposite gaze deviations at once, but a voluntary gaze paresis to both sides (item 2 = 1)', () => {
    for (const tH of STOPS) {
      const r = run(occl('mca_m1_r', 'mca_m1_l'), tH);
      const dev = r.symptoms.filter((s) => s.id === 'gaze_deviation').map((s) => s.side);
      expect(dev.length, `${tH} h: ${dev.join('+')}`).toBeLessThan(2);
      if (tH === 24) {
        expect(r.symptoms.some((s) => s.id === 'gaze_paresis_bilateral')).toBe(true);
        expect(item(r, '2')).toBe(1);
      }
    }
  });

  it('the merge itself: one side deviates the eyes, equal pulls cancel, a much stronger one still deviates them, less', () => {
    // the frontal eye field lies in the dorsolateral prefrontal region (gaze_deviation, severity 2)
    const gaze = (dys: Record<string, number>) =>
      aggregateSymptoms(dys, {}, 24)
        .filter((s) => s.id.startsWith('gaze_'))
        .map((s) => `${s.id}${s.side ? `/${s.side}` : ''}:${s.sev}`);
    expect(gaze({ prefrontal_dorsolateral_l: 1 })).toEqual(['gaze_deviation/l:2']);
    expect(gaze({ prefrontal_dorsolateral_l: 1, prefrontal_dorsolateral_r: 1 })).toEqual(['gaze_paresis_bilateral:2']);
    // a moderate left against a mild right one: towards the left, mildly
    expect(gaze({ prefrontal_dorsolateral_l: 1, prefrontal_dorsolateral_r: 0.26 })).toEqual(['gaze_deviation/l:1']);
  });
});

describe('Y2-13: both hemispheres and the level of consciousness', () => {
  const bothM1 = (tH: number, collateral: CollateralGrade = 'good', over: Partial<SimInput> = {}) => run(occl('mca_m1_r', 'mca_m1_l'), tH, collateral, over);
  it('both MCA territories out of action: at least drowsy from the start, without any swelling, and the event says why', () => {
    const r = bothM1(0);
    expect(r.edema.massEffectMm).toBe(0);
    expect(item(r, '1a')).toBeGreaterThanOrEqual(1);
    expect(r.cascade.events.some((e) => e.id === 'bilateral_hemispheres')).toBe(true);
  });

  it('the swelling of both hemispheres counts together: stupor and then coma and a herniation although the midline does not move', () => {
    const at = (tH: number) => bothM1(tH);
    expect(at(48).edema.midlineShiftMm).toBe(0);
    expect(item(at(48), '1a')).toBeGreaterThanOrEqual(2);
    const r = at(72);
    expect(r.edema.midlineShiftMm).toBe(0);
    expect(r.edema.massEffectMm).toBeGreaterThanOrEqual(8);
    expect(item(r, '1a')).toBe(3);
    // (they swell alike, so the brain herniates downward, centrally: V1-4)
    expect(r.cascade.events.some((e) => e.id === 'central_herniation')).toBe(true);
    expect(r.cascade.events.some((e) => /^(uncal|subfalcine)_/.test(e.id))).toBe(false);
    expect(r.cascade.fatalRisk).toContain('herniation');
    // one fatal row, not one per hemisphere
    expect(r.cascade.events.filter((e) => e.id.startsWith('herniation_fatal_'))).toHaveLength(1);
    // the malignant-oedema text says why the midline does not move
    const mal = r.cascade.events.find((e) => e.id === 'malignant_edema_r')!;
    expect(mal.desc.en).toMatch(/push the brain down rather than across/);
    expect(mal.desc.zh).toMatch(/把腦往下擠而不是推向對側/);
  });

  // (Y1-12: the rescued cortex works again within hours, not at the instant of the reopening)
  it('reopened at 1 h: no lasting drowsiness once both hemispheres work again', () => {
    expect(item(bothM1(0.5, 'good', { reperfusionH: 1 }), '1a')).toBe(1);
    for (const tH of [12, 24, 168]) expect(item(bothM1(tH, 'good', { reperfusionH: 1 }), '1a'), `${tH} h`).toBe(0);
  });

  it('one hemisphere: the mass effect is the midline shift, as before', () => {
    for (const id of ['r_m1_malignant', 'l_m1', 'r_ica_t', 'ica_isolated'])
      for (const tH of [24, 72, 168]) {
        const r = scenario(id, tH);
        expect(r.edema.massEffectMm, `${id} ${tH} h`).toBeCloseTo(r.edema.midlineShiftMm, 9);
      }
  });

  it('both A2 arteries: the akinetic mutism is not listed while the swelling of both makes the patient stuporous', () => {
    const r = run(occl('aca_a2_r', 'aca_a2_l'), 72, 'poor');
    expect(item(r, '1a')).toBe(2);
    expect(r.symptoms.some((s) => s.id === 'akinetic_mutism')).toBe(false);
    expect(r.unexaminable.find((s) => s.id === 'akinetic_mutism')?.why).toBe('consciousness');
  });
});

describe('Y2-14: recognition by sight is not examined in a blind patient', () => {
  // [case, the lesion gives some of them]
  const blindCases: [string, (tH: number) => SimResult, boolean][] = [
    ['both P2, moderate collaterals', (tH) => run(occl('pca_p2_r', 'pca_p2_l'), tH, 'moderate'), true],
    ['both P2, good collaterals', (tH) => run(occl('pca_p2_r', 'pca_p2_l'), tH, 'good'), false],
    ['both P2, poor collaterals', (tH) => run(occl('pca_p2_r', 'pca_p2_l'), tH, 'poor'), true],
    ['both M1 (both half-fields lost)', (tH) => run(occl('mca_m1_r', 'mca_m1_l'), tH, 'good'), true],
  ];
  it.each(blindCases)('%s: none of them listed while blind, each named apart as not examinable for blindness; no Balint label', (_, at, gives) => {
    let named = 0;
    for (const tH of STOPS) {
      const r = at(tH);
      if (!isBlind(r.symptoms)) continue;
      for (const id of NEEDS_SIGHT) expect(r.symptoms.some((s) => s.id === id), `${tH} h: ${id}`).toBe(false);
      expect(labels(r), `${tH} h`).not.toContain('balint');
      expect(labels(r), `${tH} h`).not.toContain('alexia_without_agraphia_l');
      for (const s of r.unexaminable.filter((x) => NEEDS_SIGHT.includes(x.id))) {
        // a stuporous patient's are not examinable for that reason first
        expect(['blind', 'consciousness'], `${tH} h: ${s.id}`).toContain(s.why);
        if (s.why === 'blind') named++;
      }
    }
    expect(named > 0).toBe(gives);
  });

  it('both P2 (moderate collaterals): prosopagnosia and visual agnosia are there but cannot be tested', () => {
    const r = run(occl('pca_p2_r', 'pca_p2_l'), 24, 'moderate');
    expect(r.symptoms.some((s) => s.id === 'cortical_blindness')).toBe(true);
    expect(r.unexaminable.filter((s) => s.why === 'blind').map((s) => s.id)).toEqual(expect.arrayContaining(['prosopagnosia', 'visual_agnosia']));
    // the release hallucinations of the blind field stay listed
    expect(run(occl('pca_p2_r', 'pca_p2_l'), 336, 'moderate').symptoms.some((s) => s.id === 'visual_release_hallucinations')).toBe(true);
  });

  it('with central vision spared the same signs can be tested', () => {
    const list = [sym('hemianopia', 'r', 2), sym('hemianopia', 'l', 2), sym('macular_sparing', null, 1), sym('prosopagnosia', null, 2)];
    expect(isBlind(list)).toBe(false);
    expect(isBlind(list.filter((s) => s.id !== 'macular_sparing'))).toBe(true);
  });
});

describe('Y2-15: akinetic mutism is scored as what the patient does', () => {
  const both = (tH: number) => run(occl('aca_a2_r', 'aca_a2_l'), tH, 'moderate');
  it('severe: awake, mute and following no command (9 = 3, 10 = 2, 1c = 2), unable to answer for a reason other than aphasia (1b = 1)', () => {
    const r = both(24);
    expect(sev(r, 'akinetic_mutism')).toBe(3);
    expect(item(r, '1a')).toBe(0);
    expect([item(r, '9'), item(r, '10'), item(r, '1c'), item(r, '1b')]).toEqual([3, 2, 2, 1]);
    expect(labels(r)).toContain('aca_bilateral');
  });

  it('severe: praxis, the alien hand, reaching, visuospatial tasks and the aphasia type are named apart as not examinable', () => {
    const r = both(24);
    for (const id of ['alien_hand', 'callosal_apraxia', 'optic_ataxia', 'visuospatial', 'aphasia_tc_motor']) {
      expect(r.symptoms.some((s) => s.id === id), id).toBe(false);
      expect(r.unexaminable.find((s) => s.id === id)?.why, id).toBe('akinetic');
    }
    // what the examiner sees stays listed
    expect(r.symptoms.some((s) => s.id === 'abulia')).toBe(true);
  });

  it('moderate, months later: little speech (9 = 2) and one command (1c = 1)', () => {
    const r = both(2160);
    expect(sev(r, 'akinetic_mutism')).toBe(2);
    expect([item(r, '9'), item(r, '1c')]).toEqual([2, 1]);
  });

  it('the scale is not lowered by what cannot be examined', () => {
    for (const tH of STOPS) {
      const r = both(tH);
      expect(estimateNihss([...r.symptoms, ...r.unexaminable]).items, `${tH} h`).toEqual(r.nihss.items);
    }
  });
});

describe('Y2-16: the Foville template says what the output shows', () => {
  it('the left face is weak, of the peripheral type, milder than the limbs at first', () => {
    const sc = SCENARIOS.find((s) => s.id === 'l_pontine')!;
    expect(sc.summary.en).not.toMatch(/whole left face paralysed/);
    expect(sc.summary.zh).not.toMatch(/左臉整側麻痺/);
    expect(sc.summary.en).toMatch(/peripheral type/);
    expect(sc.summary.zh).toMatch(/周邊型/);
    const r = scenario('l_pontine', 24);
    expect(sev(r, 'face_weak_peripheral', 'l')).toBeGreaterThanOrEqual(1);
    expect(sev(r, 'face_weak', 'r')).toBeGreaterThanOrEqual(1);
  });
});

describe('Y2-17: a deficit of both sides is listed once per side', () => {
  it('both vertebral arteries: arm and leg weakness and pain/temperature loss once per side, at the worse severity', () => {
    for (const tH of STOPS) {
      const r = run(occl('va_v4_dist_r', 'va_v4_dist_l'), tH);
      expect(r.symptoms.filter((s) => s.side === 'both').map((s) => s.id), `${tH} h`).toEqual([]);
      for (const id of ['arm_weak', 'leg_weak', 'pain_temp_body'])
        for (const side of ['r', 'l'] as const) expect(r.symptoms.filter((s) => s.id === id && s.side === side), `${tH} h ${id} ${side}`).toHaveLength(1);
      if (tH === 24) {
        expect(sev(r, 'arm_weak', 'r')).toBe(3);
        // the cord's loss of both sides joins each side's loss from the medulla: still a bilateral
        // brainstem sensory loss (item 8 = 2)
        expect(item(r, '8')).toBe(2);
      }
    }
  });

  it('the cord at risk is the upper cervical cord', () => {
    expect(REGION_BY_ID.cervical_cord.name.en).toMatch(/Upper anterior cervical cord \(C1–C3\)/);
    expect(REGION_BY_ID.cervical_cord.name.zh).toMatch(/上段頸髓/);
  });
});

describe('Y2-18: the cortical-blindness label follows the blindness', () => {
  it.each(['good', 'moderate', 'poor'] as const)('both P2, %s collaterals: the label exactly when the blindness is listed, never two one-sided PCA labels with it', (c) => {
    for (const tH of STOPS) {
      const r = run(occl('pca_p2_r', 'pca_p2_l'), tH, c);
      const blind = r.symptoms.some((s) => s.id === 'cortical_blindness');
      expect(labels(r).includes('cortical_blindness'), `${tH} h`).toBe(blind);
      if (blind) expect(labels(r).filter((l) => l.startsWith('pca_')), `${tH} h`).toEqual([]);
    }
  });
});

describe('W3-9: the MCA territory labels agree with the signs listed beside them', () => {
  // a superior-division infarct with good collaterals keeps its Broca aphasia and its face and arm
  // weakness (from Broca's area and the prefrontal cortex about 28 % infarcted, the motor strip 37 %):
  // its label stays as long as they do, as the symptoms' own threshold (25 %) has them
  it.each([
    ['l', 'aphasia_broca'],
    ['r', 'arm_weak'],
  ] as const)('the %s superior division with good collaterals keeps its label while its deficits last', (side, sign) => {
    const body = side === 'l' ? 'r' : 'l';
    for (const tH of STOPS.filter((h) => h >= 72)) {
      const r = run(occl(`mca_m2_sup_${side}`), tH);
      if (sev(r, 'arm_weak', body) === 0 || (sign === 'aphasia_broca' && sev(r, sign) === 0)) continue;
      expect(labels(r), `${tH} h`).toContain(`mca_superior_${side}`);
    }
    expect(labels(run(occl(`mca_m2_sup_${side}`), 2160))).toContain(`mca_superior_${side}`);
  });

  // 12 h after a thrombectomy of the left M1 the whole territory is still regaining its function: an
  // expressive aphasia with face and arm weakness is not the receptive picture of the inferior division
  it('the left M1 reopened by thrombectomy is not named an inferior-division infarct beside a Broca aphasia', () => {
    for (const tH of STOPS) {
      const r = scenario('l_m1_thrombectomy', tH);
      if (r.symptoms.some((s) => s.id === 'aphasia_broca')) expect(labels(r), `${tH} h`).not.toContain('mca_inferior_l');
    }
  });

  // the complete-MCA label names the picture, not a segment, and a tight carotid stenosis at a low
  // blood pressure that leaves border-zone infarcts is named by the watershed label from day 5, not
  // by the territory's
  it('names no M1 segment, and gives way to the watershed label in a haemodynamic border-zone picture', () => {
    const def = SYNDROMES.find((d) => d.id === 'mca_complete')!;
    expect(def.name.en).not.toMatch(/M1/);
    expect(def.name.zh).not.toMatch(/M1/);
    expect(def.desc.en).toMatch(/M1/);
    expect(def.desc.zh).toMatch(/M1/);
    for (const tH of STOPS.filter((h) => h >= 120)) {
      const r = run([{ vessel: 'ica_cervical_l', severity: 0.9 }], tH, 'good', { map: 60 });
      expect(labels(r), `${tH} h`).toContain('watershed_l');
      expect(labels(r), `${tH} h`).not.toContain('mca_complete_l');
    }
    // an M1 occlusion keeps its territory's label
    expect(labels(run(occl('mca_m1_l'), 2160))).toContain('mca_complete_l');
  });
});

describe('V2-10: limb ataxia and the clumsy hand are not examined in a paralysed limb', () => {
  // NIHSS: ataxia is absent in a patient who is paralysed, and the scale's item 7 already leaves it
  // out on a side whose arm cannot move against gravity or whose leg cannot move at all; the list
  // names it apart, as the signs that cannot be examined at other levels of consciousness
  /** NIHSS points of the arm (item 5: arm_weak, and the proximal weakness of a border-zone infarct), of the hand's own weakness and of the leg (item 6) */
  const paralysedSide = (r: SimResult, sd: 'r' | 'l') => {
    const pts = (id: string, scale: number[]) =>
      r.symptoms.filter((s) => s.id === id && !s.delayed && (s.side === sd || s.side === 'both')).reduce((m, s) => Math.max(m, scale[s.sev - 1]), 0);
    const hand = pts('arm_weak', [1, 3, 4]);
    return { arm: Math.max(hand, pts('arm_weak_proximal', [1, 2, 3])), hand, leg: pts('leg_weak', [1, 3, 4]) };
  };
  it.each([
    ['basilar_mid', 0],
    ['basilar_mid', 4320],
    ['basilar_stuttering', 0],
    ['basilar_stuttering', 4320],
  ] as [string, number][])('%s at %s h: the dysmetria of the paralysed limbs is named as not examinable', (id, tH) => {
    for (const collateral of ['good', 'moderate', 'poor'] as CollateralGrade[]) {
      const r = simulate(inputOf(id, { tH, collateral }));
      for (const sd of ['r', 'l'] as const) {
        expect(r.symptoms.some((s) => s.id === 'ataxia_limb' && s.side === sd), `${collateral} ${sd}`).toBe(false);
        const hidden = r.unexaminable.find((s) => s.id === 'ataxia_limb' && s.side === sd);
        expect(hidden?.why, `${collateral} ${sd}`).toBe('paralysed');
      }
      expect(item(r, '7')).toBe(0);
    }
  });

  it('an ataxic hemiparesis with a mild weakness keeps its ataxia, scored', () => {
    for (const id of ['r_pontine_lacune', 'l_cr_lacune']) {
      const r = scenario(id, 24);
      expect(r.symptoms.some((s) => s.id === 'ataxia_limb'), id).toBe(true);
      expect(item(r, '7'), id).toBeGreaterThan(0);
    }
  });

  it.each(SCENARIOS.map((s) => [s.id]))('%s: no limb ataxia, clumsy hand or intention tremor listed on a side too weak to test it', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as CollateralGrade[])
      for (const tH of STOPS) {
        const r = simulate(inputOf(id, { tH, collateral }));
        for (const sd of ['r', 'l'] as const) {
          const p = paralysedSide(r, sd);
          const listed = (sid: string) => r.symptoms.some((s) => s.id === sid && s.side === sd);
          if (p.arm >= 3 || p.leg >= 4) expect(listed('ataxia_limb'), `${collateral} ${tH} h ${sd}`).toBe(false);
          if (p.arm >= 3) for (const sid of ['tremor', 'holmes_tremor']) expect(listed(sid), `${sid} ${collateral} ${tH} h ${sd}`).toBe(false);
          if (p.hand >= 3) for (const sid of ['hand_clumsy', 'jerky_dystonic_hand']) expect(listed(sid), `${sid} ${collateral} ${tH} h ${sd}`).toBe(false);
        }
      }
  });
});
