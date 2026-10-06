/**
 * NIHSS total vs. "uncaptured" symptoms: the NIHSS does not score everything (e.g. monocular
 * vision loss), so a total of 0 must not be read as "no symptoms" when some exist. Below: the
 * scale's own item rules (drift, stupor, anarthria, ataxia, bilateral brainstem sensory loss).
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import type { Side } from '../anatomy/types';
import { estimateNihss } from './clinical';
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

/**
 * The NIHSS item rules, as written in the scale's own instructions (reproduced in Appendix 3 of
 * Torab-Miandoab et al., Turk J Emerg Med 2020;20:118-134, PMID 32832731):
 *   • motor arm / leg: 1 = drift, 2 = some effort against gravity, 3 = none, 4 = no movement;
 *   • 1b: "Aphasic and stuporous patients who do not comprehend the questions will score 2.
 *     Patients unable to speak because of … severe dysarthria from any cause … are given a 1";
 *   • 7: "Ataxia is absent in the patient who cannot understand or is paralyzed";
 *   • 8: "The patient with brainstem stroke who has bilateral loss of sensation is scored 2".
 */
describe('NIHSS item rules', () => {
  type Sym = { id: string; side: Side | 'both' | null; sev: 1 | 2 | 3; sources?: string[] };
  const items = (...list: Sym[]) =>
    estimateNihss(list.map((s) => ({ id: s.id, side: s.side, sev: s.sev, sources: s.sources ?? [], delayed: false }))).items;
  const scenario = (id: string, tH: number) => {
    const sc = SCENARIOS.find((s) => s.id === id)!;
    return simulate({
      occlusions: sc.occlusions,
      variants: sc.variants ?? [],
      collateral: sc.collateral ?? 'good',
      map: sc.map ?? 93,
      tH,
      reperfusionH: sc.reperfusionH ?? null,
      decompression: sc.decompression ?? false,
    });
  };

  it('the mildest arm or leg weakness scores as drift (1), not as effort against gravity (2)', () => {
    expect(items({ id: 'arm_weak', side: 'r', sev: 1 }, { id: 'leg_weak', side: 'r', sev: 1 })).toMatchObject({ '5r': 1, '6r': 1 });
    // the moderate and severe grades keep their meaning: no effort against gravity, no movement
    expect(items({ id: 'arm_weak', side: 'l', sev: 2 }, { id: 'leg_weak', side: 'l', sev: 3 })).toMatchObject({ '5l': 3, '6l': 4 });
    // through the engine: a sev-1 weakness three months after a pure motor lacune is drift (Y1-1:
    // after a left M1 stroke the arm, cut in the internal capsule, stays moderately weak; Z1-15: the
    // superior-division template, which used to show the drift here, now loses most of the motor
    // strip and keeps a moderate weakness)
    const m3 = scenario('l_lacune', 2160);
    expect(m3.symptoms.find((s) => s.id === 'arm_weak' && s.side === 'r')?.sev).toBe(1);
    expect(m3.nihss.items['5r']).toBe(1);
    expect(m3.nihss.items['6r']).toBe(1);
  });

  it('ataxia is not scored in a stuporous patient (1a = 2)', () => {
    const it7 = items({ id: 'coma', side: null, sev: 2 }, { id: 'ataxia_limb', side: 'r', sev: 1 }, { id: 'ataxia_limb', side: 'l', sev: 1 });
    expect(it7['1a']).toBe(2);
    expect(it7['7'] ?? 0).toBe(0);
    // a drowsy patient (1a = 1) who can still do the finger-nose test keeps the score
    expect(items({ id: 'somnolence', side: null, sev: 1 }, { id: 'ataxia_limb', side: 'r', sev: 1 })['7']).toBe(1);
    // the Percheron scenario: stuporous at 24 h, so its bilateral ataxia is not scored
    const per = scenario('percheron', 24);
    expect(per.nihss.items['1a']).toBe(2);
    expect(per.nihss.items['7'] ?? 0).toBe(0);
  });

  it('ataxia is not scored when the patient cannot understand the test (global or Wernicke aphasia)', () => {
    for (const aphasia of ['aphasia_global', 'aphasia_wernicke']) {
      expect(items({ id: aphasia, side: null, sev: 3 }, { id: 'ataxia_limb', side: 'r', sev: 1 })['7'] ?? 0, aphasia).toBe(0);
    }
    // an expressive aphasia does not stop the patient from following the demonstration
    expect(items({ id: 'aphasia_broca', side: null, sev: 2 }, { id: 'ataxia_limb', side: 'r', sev: 1 })['7']).toBe(1);
  });

  it('ataxia is not scored on a paralysed side', () => {
    // arm with no effort against gravity (existing rule) or a leg with no movement
    expect(items({ id: 'arm_weak', side: 'r', sev: 2 }, { id: 'ataxia_limb', side: 'r', sev: 1 })['7'] ?? 0).toBe(0);
    expect(items({ id: 'leg_weak', side: 'r', sev: 3 }, { id: 'ataxia_limb', side: 'r', sev: 1 })['7'] ?? 0).toBe(0);
    // paralysis of the other side does not hide it
    expect(items({ id: 'leg_weak', side: 'l', sev: 3 }, { id: 'ataxia_limb', side: 'r', sev: 1 })['7']).toBe(1);
  });

  it('a stuporous patient scores 2 on the questions (1b); the commands item has no stupor rule', () => {
    const st = items({ id: 'coma', side: null, sev: 2 });
    expect(st['1b']).toBe(2);
    expect(st['1c'] ?? 0).toBe(0);
    const per = scenario('percheron', 24);
    expect(per.nihss.items['1b']).toBe(2);
  });

  it('a patient who cannot speak because of anarthria or severe dysarthria scores 1 on the questions', () => {
    expect(items({ id: 'anarthria', side: null, sev: 3 })['1b']).toBe(1);
    expect(items({ id: 'dysarthria', side: null, sev: 3 })['1b']).toBe(1);
    // the commands can be followed with the eyes (open and close them), so 1c stays 0
    expect(items({ id: 'anarthria', side: null, sev: 3 })['1c'] ?? 0).toBe(0);
    // intelligible (mild-to-moderate) dysarthria does not stop the answer
    expect(items({ id: 'dysarthria', side: null, sev: 2 })['1b'] ?? 0).toBe(0);
    // aphasia that already scores 2 keeps its score
    expect(items({ id: 'anarthria', side: null, sev: 3 }, { id: 'aphasia_global', side: null, sev: 3 })['1b']).toBe(2);
    // the mid-basilar (locked-in) scenario: anarthric and awake
    const mid = scenario('basilar_mid', 24);
    expect(mid.symptoms.some((s) => s.id === 'anarthria')).toBe(true);
    expect(mid.nihss.items['1b']).toBe(1);
  });

  it('bilateral pinprick loss from a brainstem lesion scores 2 on sensation', () => {
    const lateralMedulla = items(
      { id: 'pain_temp_body', side: 'l', sev: 1, sources: ['medulla_lateral_r'] },
      { id: 'pain_temp_body', side: 'r', sev: 1, sources: ['medulla_lateral_l'] },
    );
    expect(lateralMedulla['8']).toBe(2);
    // one side only, or a side whose loss comes from above the brainstem, keeps the per-side score
    expect(items({ id: 'pain_temp_body', side: 'l', sev: 1, sources: ['medulla_lateral_r'] })['8']).toBe(1);
    expect(
      items(
        { id: 'pain_temp_body', side: 'l', sev: 1, sources: ['medulla_lateral_r'] },
        { id: 'sens_face_arm', side: 'r', sev: 1, sources: ['postcentral_face_arm_l'] },
      )['8'],
    ).toBe(1);
    // item 8 tests pinprick: position-sense loss is not scored, on one side or both
    expect(
      items({ id: 'proprio_loss', side: 'l', sev: 2, sources: ['medulla_medial_r'] }, { id: 'proprio_loss', side: 'r', sev: 2, sources: ['medulla_medial_l'] })['8'] ?? 0,
    ).toBe(0);
    // through the engine: both lateral medullary perforator groups blocked
    const both = sim({ occlusions: occl('lat_medullary_perf_r', 'lat_medullary_perf_l') });
    expect(both.symptoms.filter((s) => s.id === 'pain_temp_body').map((s) => s.side).sort()).toEqual(['l', 'r']);
    expect(both.nihss.items['8']).toBe(2);
  });
});
