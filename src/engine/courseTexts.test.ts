/**
 * Review round Y3: what the course events and the Outcome tab say agrees with the case. The
 * malignant-oedema text quotes the final infarct the Outcome tab shows (Y3-3); the cardiac warning
 * calls a stroke severe by its clinical severity, not by its volume (Y3-5); the posterior-stroke
 * caveat follows the circulation (Y3-6); the venous-thrombosis warning follows immobility (Y3-7);
 * pathological crying is a possibility, not a certain deficit (Y3-9); a subclavian steal without
 * symptoms is not called a syndrome (Y3-10); a comatose basilar occlusion that is not reopened,
 * a locked-in syndrome and a bilateral medial medullary infarct do not read as certain survival
 * (Y3-11); and with stacked occlusions the aspiration, cardiac and central-fever warnings run from
 * the onset of the lesion that causes them (Y3-19).
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { TIME_STOPS } from '../anatomy/timeline';
import type { CascadeEvent } from './cascade';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';
import { finalOutcome } from '../ui/finalOutcome';
import { caseNotes } from '../ui/postStrokeRisks';
import { POST_STROKE_RISKS } from '../anatomy/postStrokeRisks';

const inputOf = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc) throw new Error(`no scenario ${id}`);
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
const occInput = (occlusions: Occlusion[], collateral: CollateralGrade = 'good', over: Partial<SimInput> = {}): SimInput => ({
  occlusions,
  variants: [],
  collateral,
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
  ...over,
});
const at = (input: SimInput, tH: number) => simulate({ ...input, tH });
const STOPS = TIME_STOPS.map((s) => s.h);
const runningAt = (r: SimResult, h: number, re: RegExp): CascadeEvent[] =>
  r.cascade.events.filter((e) => re.test(e.id) && e.onsetH <= h + 1e-9 && h < (e.endH ?? Infinity));

// the custom cases of the review
const C07 = occInput([{ vessel: 'basilar_mid', severity: 1 }], 'good', { reperfusionH: 2 });
const C33 = occInput([{ vessel: 'basilar_mid', severity: 1 }], 'good', { reperfusionH: 12 });
const C19 = occInput([{ vessel: 'mca_m2_inf_r', severity: 1 }]);
const C22 = occInput([{ vessel: 'mca_m2_inf_r', severity: 1, toH: 1 / 12 }]);
const BOTH_A2 = occInput(
  [
    { vessel: 'aca_a2_r', severity: 1 },
    { vessel: 'aca_a2_l', severity: 1 },
  ],
  'moderate',
);
const C17 = occInput([{ vessel: 'lenticulostriate_l', severity: 1, branch: true, lacuneSite: 'dch' }]);
const BOTH_V4 = occInput([
  { vessel: 'va_v4_dist_r', severity: 1 },
  { vessel: 'va_v4_dist_l', severity: 1 },
]);
const BA_THEN_M1 = occInput(
  [
    { vessel: 'basilar_upper', severity: 1, fromH: 0 },
    { vessel: 'mca_m1_l', severity: 1, fromH: 720 },
  ],
  'poor',
);
const M1_THEN_BA = occInput(
  [
    { vessel: 'mca_m1_l', severity: 1, fromH: 0 },
    { vessel: 'basilar_upper', severity: 1, fromH: 720 },
  ],
  'poor',
);

describe('Y3-3: the malignant-oedema text quotes the final infarct the Outcome tab shows', () => {
  it.each(['r_m1_malignant', 'r_ica_t', 'ica_isolated'])('%s: primary infarct, then with the secondary infarcts of the herniation', (id) => {
    const r = at(inputOf(id), 72);
    const e = r.cascade.events.find((x) => /^malignant_edema_/.test(x.id))!;
    const final = finalOutcome(inputOf(id)).course.finalInfarct;
    expect(final).toBeGreaterThan(r.cascade.volumes.total + 50);
    const y = final.toFixed(0);
    expect(e.desc.en).toMatch(/^Primary infarct ≈ \d+ mL within 14 h/);
    expect(e.desc.en).toContain(`with the secondary infarcts from the herniation ≈ ${y} mL in the end`);
    expect(e.desc.zh).toMatch(/^發病 14 小時內的原發梗塞已約 \d+ mL/);
    expect(e.desc.zh).toContain(`加上疝脫造成的續發梗塞，最終約 ${y} mL`);
  });

  it('with both hemispheres infarcted, each side gives its own figures and the whole brain’s, the Outcome tab’s', () => {
    const input = occInput([
      { vessel: 'mca_m1_r', severity: 1 },
      { vessel: 'mca_m1_l', severity: 1 },
    ]);
    const y = finalOutcome(input).course.finalInfarct.toFixed(0);
    for (const s of ['r', 'l']) {
      const e = at(input, 72).cascade.events.find((x) => x.id === `malignant_edema_${s}`)!;
      expect(e.desc.en).toMatch(/mL in this hemisphere in the end; with the secondary infarcts from the herniation ≈ \d+ mL in this hemisphere in the end/);
      expect(e.desc.en).toContain(`(≈ ${y} mL in the whole brain, the final infarct on the Outcome tab)`);
      expect(e.desc.zh).toContain(`（全腦合計約 ${y} mL，即「最終」頁的最終梗塞）`);
    }
  });

  it('after decompression nothing is added, and the one final figure is the Outcome tab’s', () => {
    const input = inputOf('r_m1_decompression');
    const e = at(input, 72).cascade.events.find((x) => x.id === 'malignant_edema_r')!;
    const y = finalOutcome(input).course.finalInfarct.toFixed(0);
    expect(e.desc.en).toContain(`≈ ${y} mL in the end.`);
    expect(e.desc.en).not.toMatch(/secondary infarcts/);
    expect(e.desc.zh).toContain(`最終約 ${y} mL。`);
    expect(e.desc.zh).not.toMatch(/續發梗塞/);
  });
});

/** the cardiac warning running at `h` (simulation clock) */
const cardiacAt = (r: SimResult, h: number) => runningAt(r, h, /^cardiac(_\d+)?$/)[0];
const SEVERE_NOW = 'This is a severe stroke';
const SEVERE_PAST = /The stroke was severe/;
const severeNow = (r: SimResult) => r.nihss.total >= 16 || r.symptoms.some((s) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness');

describe('Y3-5: the cardiac warning calls a stroke severe by its clinical severity (Prosser 2007), not by its volume', () => {
  it('a large infarct with a moderate deficit is not called a severe stroke (ACA, fetal PCA, both A2)', () => {
    for (const [name, input] of [
      ['r_aca', inputOf('r_aca')],
      ['fetal_pca', inputOf('fetal_pca')],
      ['both A2 moderate', BOTH_A2],
    ] as [string, SimInput][]) {
      expect(at(input, 24).cascade.volumes.total, name).toBeGreaterThan(60);
      for (const h of STOPS.filter((x) => x < 336)) {
        const r = at(input, h);
        expect(severeNow(r), `${name} ${h} h`).toBe(false);
        const c = cardiacAt(r, h)!;
        expect(c.desc.en, `${name} ${h} h`).not.toMatch(/severe stroke|was severe/);
        expect(c.desc.zh, `${name} ${h} h`).not.toMatch(/嚴重的中風|很嚴重/);
      }
    }
  });

  // Y1-12: the rescued cortex regains its function over the first day, so the NIHSS falls from 23
  // to 12–15 after 6 h (was 17 throughout); the text follows it at every stop
  it('a severe deficit is called severe whatever the volume (left M1 opened at 2 h: NIHSS 23 at onset, lower once the rescued cortex works again)', () => {
    const input = inputOf('l_m1_thrombectomy');
    expect(at(input, 24).cascade.volumes.total).toBeLessThan(60);
    expect(at(input, 0).nihss.total).toBeGreaterThanOrEqual(16);
    let severe = 0;
    for (const h of STOPS.filter((x) => x < 336)) {
      const r = at(input, h);
      const c = cardiacAt(r, h)!;
      if (r.nihss.total >= 16) {
        severe++;
        expect(c.desc.en, `${h} h`).toContain(SEVERE_NOW);
        expect(c.desc.zh, `${h} h`).toContain('這是嚴重的中風');
      } else expect(c.desc.en, `${h} h`).toMatch(SEVERE_PAST);
      expect(c.severity).toBe('warn');
    }
    expect(severe).toBeGreaterThanOrEqual(6);
  });

  // Y1-12: reopened at 2 h the pons recovers within the first day; reopened at 12 h it stays
  // locked-in for days (still severe then), and the deficit clears only over weeks
  it('after a reopening that clears the deficit, it was severe at onset (mid-basilar reopened at 2 h; at 12 h severe while the locked-in picture lasts)', () => {
    for (const h of [24, 48, 72]) expect(cardiacAt(at(C33, h), h)!.desc.en, `c33 ${h} h`).toContain(SEVERE_NOW);
    for (const [name, input, opened] of [['c07', C07, 2]] as [string, SimInput, number][]) {
      expect(at(input, 0).nihss.total, name).toBeGreaterThanOrEqual(16);
      expect(cardiacAt(at(input, 0), 0)!.desc.en, name).toContain(SEVERE_NOW);
      // (Z2-8: the gaze palsy of the caudal tegmentum still tapers off at 24 h)
      for (const h of STOPS.filter((x) => x >= opened + 46 && x < 336)) {
        const r = at(input, h);
        expect(r.nihss.total, `${name} ${h} h`).toBe(0);
        const c = cardiacAt(r, h)!;
        expect(c.desc.en, `${name} ${h} h`).not.toContain(SEVERE_NOW);
        expect(c.desc.en, `${name} ${h} h`).toMatch(/The stroke was severe at onset, which carries a higher risk\./);
        expect(c.desc.zh, `${name} ${h} h`).toContain('這次中風在發作時很嚴重，風險較高。');
      }
    }
  });
});

/** every scenario, the review's custom cases and the stacked cases */
const CASES: [string, SimInput][] = [
  ...SCENARIOS.map((s) => [s.id, inputOf(s.id)] as [string, SimInput]),
  ['c07', C07],
  ['c33', C33],
  ['c19', C19],
  ['c22', C22],
  ['both A2 moderate', BOTH_A2],
  ['c17', C17],
  ['both V4', BOTH_V4],
  ['basilar_upper, then mca_m1_l at 1 month, poor', BA_THEN_M1],
  ['mca_m1_l, then basilar_upper at 1 month, poor', M1_THEN_BA],
];

describe('Y3-5: the severe wording follows the listed course at every stop', () => {
  it.each(CASES.map(([n]) => [n]))('%s', (name) => {
    const input = CASES.find((c) => c[0] === name)![1];
    for (const h of STOPS) {
      const r = at(input, h);
      const c = cardiacAt(r, h);
      if (!c) continue;
      // the present tense only while the stroke is severe or has been so in this stretch; never at NIHSS 0
      if (c.desc.en.includes(SEVERE_NOW)) expect(r.nihss.total, `${name} ${h} h`).toBeGreaterThan(0);
      // the past tense never while it is severe
      if (SEVERE_PAST.test(c.desc.en)) expect(severeNow(r), `${name} ${h} h`).toBe(false);
      // severe now: the warning says so
      if (severeNow(r)) expect(c.desc.en, `${name} ${h} h`).toContain(SEVERE_NOW);
      expect(/嚴重的中風|很嚴重/.test(c.desc.zh), `${name} ${h} h`).toBe(/severe stroke|was severe/.test(c.desc.en));
    }
  });
});

describe('Y3-6: the posterior-circulation caveat follows the circulation and needs a symptom', () => {
  it('not for an MCA branch, its TIA or a carotid border-zone infarct that reaches the occipital pole', () => {
    for (const [name, input] of [
      ['c19', C19],
      ['c22', C22],
      ['watershed', inputOf('watershed')],
    ] as [string, SimInput][])
      for (const h of STOPS) expect(at(input, h).nihss.posteriorCaveat, `${name} ${h} h`).toBe(false);
  });

  it('not without a symptom (mid-basilar reopened at 2 h, NIHSS 0 later)', () => {
    for (const input of [C07, C33])
      for (const h of STOPS) {
        const r = at(input, h);
        if (r.symptoms.length + r.unexaminable.length === 0) expect(r.nihss.posteriorCaveat, `${h} h`).toBe(false);
      }
    expect(at(C07, 2160).symptoms).toEqual([]);
    expect(at(C07, 2160).nihss.posteriorCaveat).toBe(false);
    // (Z2-0, Z2-8: reopened at 12 h, both caudal tegmenta are about a quarter infarcted and leave a
    // lasting gaze palsy, which the scale underrates; was: symptom-free from 3 months)
    expect(at(C33, 2160).symptoms.length).toBeGreaterThan(0);
    expect(at(C33, 2160).nihss.posteriorCaveat).toBe(true);
  });

  it('a thalamic (Percheron, thalamogeniculate) stroke with a low NIHSS gets it from onset', () => {
    for (const id of ['percheron', 'l_thalamic']) {
      const input = inputOf(id);
      for (const h of STOPS) {
        const r = at(input, h);
        const want = r.nihss.total <= 6 && r.symptoms.length + r.unexaminable.length > 0;
        expect(r.nihss.posteriorCaveat, `${id} ${h} h (NIHSS ${r.nihss.total})`).toBe(want);
      }
    }
    // (Z3-17: the stuporous Percheron patient performs at most one command, 1c = 1, so its NIHSS is
    // 7 in the first week and the caveat comes once it falls to 6 or less, at 2 weeks; was 6 with
    // the caveat from onset)
    expect(at(inputOf('l_thalamic'), 0).nihss.posteriorCaveat).toBe(true);
    expect(at(inputOf('percheron'), 0).nihss.total).toBe(7);
    expect(at(inputOf('percheron'), 336).nihss.posteriorCaveat).toBe(true);
  });

  it('a vertebral or PICA stroke keeps it', () => {
    expect(at(inputOf('r_wallenberg'), 24).nihss.posteriorCaveat).toBe(true);
    expect(at(inputOf('r_pica'), 24).nihss.posteriorCaveat).toBe(true);
  });

  it.each(CASES.map(([n]) => [n]))('%s: the caveat only with a symptom and an NIHSS of 6 or less', (name) => {
    const input = CASES.find((c) => c[0] === name)![1];
    for (const h of STOPS) {
      const r = at(input, h);
      if (!r.nihss.posteriorCaveat) continue;
      expect(r.nihss.total, `${name} ${h} h`).toBeLessThanOrEqual(6);
      expect(r.symptoms.length + r.unexaminable.length, `${name} ${h} h`).toBeGreaterThan(0);
    }
  });
});

/** what makes a patient immobile: a leg that hardly moves, stupor or coma, a disorder of consciousness, akinetic mutism */
const immobile = (r: SimResult) =>
  r.symptoms.some(
    (s) =>
      (s.id === 'leg_weak' && s.sev >= 2) ||
      (s.id === 'coma' && s.sev >= 2) ||
      s.id === 'disorder_of_consciousness' ||
      (s.id === 'akinetic_mutism' && s.sev >= 2),
  );
const dvtAt = (r: SimResult, h: number) => runningAt(r, h, /^dvt(_\d+)?$/);

describe('Y3-7: the venous-thrombosis warning follows immobility (CLOTS 3)', () => {
  it('none after a full recovery before day 2 (mid-basilar reopened at 2 h)', () => {
    const r = at(C07, 48);
    expect(immobile(r)).toBe(false);
    expect(r.cascade.events.filter((e) => /^dvt/.test(e.id))).toEqual([]);
  });

  // Y1-12: reopened at 12 h the pons regains its function only over days, so the patient is still
  // locked-in, and immobile, on day 2 (was: recovered at the reopening)
  it('kept while a rescued pons is still recovering (mid-basilar reopened at 12 h)', () => {
    const r = at(C33, 48);
    expect(immobile(r)).toBe(true);
    expect(dvtAt(r, 48).map((e) => e.id)).toEqual(['dvt']);
    expect(dvtAt(r, 48)[0].endH).toBeLessThan(720);
  });

  it('kept for a paralysed leg (untreated anterior choroidal and M1 occlusions)', () => {
    for (const [name, input] of [
      ['l_acha', inputOf('l_acha')],
      ['l_m1', inputOf('l_m1')],
    ] as [string, SimInput][]) {
      const r = at(input, 48);
      expect(immobile(r), name).toBe(true);
      expect(dvtAt(r, 48).map((e) => e.id), name).toEqual(['dvt']);
      expect(dvtAt(r, 48)[0].desc.en).toMatch(/cannot walk to the toilet unaided/);
      expect(dvtAt(r, 48)[0].desc.zh).toMatch(/無法自己走到廁所/);
    }
  });

  it.each(CASES.map(([n]) => [n]))('%s: running from day 2 to day 30 of a lesion exactly while the patient is immobile', (name) => {
    const input = CASES.find((c) => c[0] === name)![1];
    const first = at(input, 0);
    const starts = [...new Set(input.occlusions.map((o) => o.fromH ?? 0))];
    const tia = first.volumes.finalInfarct < 0.05;
    for (const h of [...new Set([...STOPS, ...starts.flatMap((s) => STOPS.map((x) => s + x))])].sort((a, b) => a - b)) {
      const r = at(input, h);
      const running = dvtAt(r, h).length > 0;
      if (running) expect(immobile(r), `${name} ${h} h`).toBe(true);
      const inWindow = starts.some((s) => h >= s + 48 && h < s + 720) && h >= first.schedule.onsetH + 48 - 1e-9;
      if (!tia && inWindow && immobile(r) && starts.length === 1) expect(running, `${name} ${h} h`).toBe(true);
    }
  });
});

describe('Y3-9: pathological crying is listed as a possibility and not counted as a lasting deficit', () => {
  it('is named as possible, like the other late signs only some patients develop', () => {
    expect(SYMPTOM_BY_ID.emotionalism.name.en).toBe('Possible: pathological crying or laughing (emotionalism)');
    expect(SYMPTOM_BY_ID.emotionalism.name.zh).toBe('可能出現：病理性哭笑（情緒失禁）');
    for (const id of ['emotionalism', 'central_pain', 'central_pain_face', 'palatal_tremor', 'holmes_tremor', 'peduncular_hallucinosis', 'visual_release_hallucinations', 'jerky_dystonic_hand'])
      expect(SYMPTOM_BY_ID[id].possible, id).toBe(true);
  });

  it('the Outcome count of lasting deficits leaves the possible ones out (a 0.5-mL genu lacune: dysarthria only)', () => {
    const o = finalOutcome(C17);
    expect(o.course.m6.symptoms.map((s) => s.id).sort()).toEqual(['dysarthria', 'emotionalism']);
    expect(o.course.lasting).toBe(1);
    for (const id of ['l_m1', 'basilar_mid', 'r_pontine_lacune', 'l_lsa']) {
      const c = finalOutcome(inputOf(id)).course;
      const definite = [...c.m6.symptoms, ...c.m6.unexaminable].filter((s) => !SYMPTOM_BY_ID[s.id].possible).length;
      expect(c.lasting, id).toBe(definite);
    }
  });

  it('the population entry says when the case lists it at a site associated with a higher risk', () => {
    const emo = POST_STROKE_RISKS.find((r) => r.id === 'emotionalism')!;
    const m6 = at(inputOf('l_lsa'), 4320);
    expect(m6.symptoms.map((s) => s.id)).toContain('emotionalism');
    const notes = caseNotes(emo, m6);
    expect(notes).toHaveLength(1);
    expect(notes[0].en).toMatch(/associated with a higher risk/);
    expect(notes[0].zh).toMatch(/較高的風險相關/);
    // a case that does not list it gets no note
    const pica = at(inputOf('r_pica'), 4320);
    expect(pica.symptoms.map((s) => s.id)).not.toContain('emotionalism');
    expect(caseNotes(emo, pica)).toEqual([]);
  });
});

describe('Y3-10: a subclavian steal without symptoms is a flow reversal, not a syndrome', () => {
  const def = SYNDROMES.find((d) => d.id === 'subclavian_steal')!;
  it('is named for the flow reversal and marked clinically silent while nothing is listed', () => {
    expect(def.name.en).toBe('Subclavian steal (flow reversal)');
    expect(def.name.zh).toBe('鎖骨下動脈竊血（血流反轉）');
    expect(def.pattern).toBe(true);
    for (const h of STOPS) {
      const r = at(inputOf('subclavian_steal'), h);
      expect(r.symptoms, `${h} h`).toEqual([]);
      const m = r.syndromes.find((s) => s.def.id === 'subclavian_steal')!;
      expect(m.silent, `${h} h`).toBe(true);
    }
  });

  it('separates the phenomenon from the syndrome, and the clue to a stenosis from the difference that brings symptoms', () => {
    expect(def.desc.en).toMatch(/steal phenomenon/);
    expect(def.desc.en).toMatch(/Only with symptoms is it called subclavian steal syndrome/);
    expect(def.desc.en).toMatch(/more than 20 mmHg/);
    expect(def.desc.en).toMatch(/more than 40–50 mmHg/);
    expect(def.desc.zh).toMatch(/竊血「現象」/);
    expect(def.desc.zh).toMatch(/有症狀時才稱為鎖骨下動脈竊血「症候群」/);
    expect(def.desc.zh).toMatch(/20 mmHg/);
    expect(def.desc.zh).toMatch(/40–50 mmHg/);
  });
});

describe('Y3-11: the Outcome tab does not assume survival quietly', () => {
  it('a comatose basilar occlusion that is not reopened carries the trial mortality, and its NIHSS assumes survival', () => {
    for (const input of [inputOf('basilar_tip'), occInput([{ vessel: 'basilar_upper', severity: 1 }], 'moderate')]) {
      const o = finalOutcome(input);
      expect(o.fatal).toContain('basilar');
      const e = at(input, 24).cascade.events.find((x) => x.id === 'basilar_fatal')!;
      expect(e.desc.en).toMatch(/55%/);
      expect(e.desc.en).toMatch(/42%/);
      expect(e.desc.en).toMatch(/about 2%/);
      expect(e.desc.zh).toMatch(/55%/);
      expect(e.desc.zh).toMatch(/42%/);
      expect(at(input, 4320).cascade.events.find((x) => x.id === 'recovery')!.desc.en).toMatch(/^If the patient survives/);
    }
  });

  it('reopened in time, or awake, it does not', () => {
    const tip = finalOutcome({ ...inputOf('basilar_tip'), reperfusionH: 4 });
    expect(tip.fatal).not.toContain('basilar');
    expect(tip.untreated!.fatal).toContain('basilar');
    // locked-in, awake: no "often fatal" row
    expect(finalOutcome(inputOf('basilar_mid')).fatal).toEqual([]);
  });

  it('a locked-in syndrome and a bilateral medial medullary infarct carry a lighter survival caveat with their own mortality', () => {
    const lis = finalOutcome(inputOf('basilar_mid'));
    expect(lis.caveats).toEqual(['locked_in']);
    for (const input of [BOTH_V4, occInput([{ vessel: 'asa_root_r', severity: 1 }, { vessel: 'asa_root_l', severity: 1 }])]) {
      const o = finalOutcome(input);
      expect(o.fatal).toEqual([]);
      expect(o.caveats).toEqual(['bilateral_medulla']);
    }
    // a locked-in state that clears when blood returns leaves no caveat
    expect(finalOutcome(C07).caveats).toEqual([]);
    expect(finalOutcome(inputOf('l_m1')).caveats).toEqual([]);
  });

  it('both hemispheres infarcted take the herniation course (Y2-13)', () => {
    const o = finalOutcome(occInput([{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1 }]));
    expect(o.fatal).toEqual(['herniation']);
  });
});

/** the aspiration warnings running at `h` */
const aspirationsAt = (r: SimResult, h: number) => runningAt(r, h, /^aspiration(_\d+)?$/);
const UNSAFE = ['dysphagia', 'coma', 'somnolence', 'disorder_of_consciousness'];

describe('Y3-19: with stacked occlusions the warnings run from the onset of the lesion that causes them', () => {
  it.each([
    ['basilar first', BA_THEN_M1, 0],
    ['basilar second', M1_THEN_BA, 720],
  ] as [string, SimInput, number][])('%s: aspiration and cardiac warnings while the basilar lesion lists dysphagia and coma', (name, input, ba) => {
    for (const x of STOPS.filter((s) => s < 336)) {
      const h = ba + x;
      const r = at(input, h);
      const dysphagia = r.symptoms.some((s) => s.id === 'dysphagia');
      expect(dysphagia || r.symptoms.some((s) => UNSAFE.includes(s.id)), `${name} ${h} h`).toBe(true);
      const asp = aspirationsAt(r, h);
      expect(asp.map((e) => e.title.en), `${name} ${h} h`).toEqual([dysphagia ? 'Dysphagia → aspiration pneumonia' : 'Reduced consciousness → aspiration pneumonia']);
      expect(cardiacAt(r, h), `${name} ${h} h`).toBeDefined();
      // and the venous-thrombosis warning from day 2 of the basilar lesion, the patient immobile
      if (x >= 48) {
        expect(immobile(r), `${name} ${h} h`).toBe(true);
        expect(dvtAt(r, h).length, `${name} ${h} h`).toBe(1);
      }
    }
  });

  it('central hyperthermia from the onset of the tegmental lesion', () => {
    for (const [input, ba] of [
      [BA_THEN_M1, 0],
      [M1_THEN_BA, 720],
    ] as [SimInput, number][]) {
      const e = at(input, ba + 24).cascade.events.find((x) => x.id === 'central_hyperthermia')!;
      expect(e).toBeDefined();
      expect(e.onsetH).toBe(ba);
      expect(e.endH).toBe(ba + 336);
    }
  });

  it('one stretch of each warning per lesion, none overlapping', () => {
    for (const input of [BA_THEN_M1, M1_THEN_BA]) {
      const ev = at(input, 0).cascade.events;
      for (const re of [/^aspiration(_\d+)?$/, /^cardiac(_\d+)?$/, /^dvt(_\d+)?$/]) {
        const list = ev.filter((e) => re.test(e.id)).sort((a, b) => a.onsetH - b.onsetH);
        for (let i = 1; i < list.length; i++) expect(list[i].onsetH, `${re} ${list[i].id}`).toBeGreaterThanOrEqual(list[i - 1].endH! - 1e-9);
      }
    }
  });
});
