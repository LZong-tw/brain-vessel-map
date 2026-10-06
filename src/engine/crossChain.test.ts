/**
 * Where the two chains of the clinical-detail audit meet. Each chain fixed its own findings
 * without seeing the other's; these are the combinations that needed a rule of their own once
 * both were in. Each block names the findings it joins.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID, symptomOnsetH } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { aggregateSymptoms, estimateNihss, symptomQuery, type SymptomItem } from './clinical';
import type { Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const scenario = (id: string, tH: number, over: Partial<SimInput> = {}) => {
  const sc = SCENARIO_BY_ID[id];
  return simulate({
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  });
};
const occ = (occlusions: Occlusion[], tH: number) =>
  simulate({ occlusions, variants: [], collateral: 'good', map: 93, tH, reperfusionH: null, decompression: false });
const one = (vessel: string, tH: number) => occ([{ vessel, severity: 1 }], tH);
const ids = (r: SimResult) => r.symptoms.map((s) => s.id);
const labels = (r: SimResult) => r.syndromes.map((m) => m.def.id);
/** events in effect at the displayed time */
const active = (r: SimResult) => r.cascade.events.filter((e) => e.onsetH <= r.input.tH && r.input.tH < (e.endH ?? Infinity)).map((e) => e.id);
const aphasias = (s: SymptomItem[]) => s.filter((x) => x.id.startsWith('aphasia_')).map((x) => x.id);

describe('REM sleep behaviour disorder (C10-F7) after the coma changes (C3-F2)', () => {
  it('is not offered to a person left in a disorder of consciousness', () => {
    // extensive tegmental damage on both sides: a disorder of consciousness after the coma
    for (const doc of [one('basilar_upper', 720), one('basilar_upper', 2160)]) {
      expect(ids(doc)).toContain('disorder_of_consciousness');
      expect(labels(doc)).toContain('pontine_doc');
      expect(active(doc)).not.toContain('rbd');
    }
  });

  it('stays a possibility after other pontine and medullary infarcts, the incomplete locked-in syndrome included', () => {
    for (const id of ['l_pontine', 'r_pontine_lacune', 'r_wallenberg', 'r_asa', 'l_aica', 'basilar_mid']) expect(active(scenario(id, 2160)), id).toContain('rbd');
  });
});

describe('hallucinations need a patient who can report them (C3-F10 × C1-F11)', () => {
  it('no release hallucinations of the blind half-field while the patient is comatose from the midline shift (C4-F2)', () => {
    for (const tH of [48, 72, 168]) {
      const r = scenario('r_m1_malignant', tH);
      expect(ids(r), `${tH} h`).toContain('coma');
      expect(ids(r), `${tH} h`).not.toContain('visual_release_hallucinations');
    }
    // awake again, with the left hemianopia: possible again
    expect(ids(scenario('r_m1_malignant', 2160))).toContain('visual_release_hallucinations');
  });

  it('neither kind is listed with a disorder of consciousness', () => {
    const blind: SymptomItem = { id: 'hemianopia', side: 'l', sev: 2, sources: ['cuneus_r'], delayed: false };
    const doc: SymptomItem = { id: 'disorder_of_consciousness', side: null, sev: 2, sources: ['pons_rostral_tegmentum_r'], delayed: false };
    const release: SymptomItem = { id: 'visual_release_hallucinations', side: 'l', sev: 1, sources: ['cuneus_r'], delayed: false };
    expect(aggregateSymptoms({}, {}, 720, [blind, release]).map((s) => s.id)).toContain('visual_release_hallucinations');
    expect(aggregateSymptoms({}, {}, 720, [blind, release, doc]).map((s) => s.id)).not.toContain('visual_release_hallucinations');
  });
});

describe('Holmes tremor (C3-F7) starts at its own time, as the other late symptoms do (C10-F2)', () => {
  it('from its median onset of about 2 months, not from two weeks', () => {
    expect(symptomOnsetH(SYMPTOM_BY_ID.holmes_tremor)).toBe(1440);
    for (const tH of [336, 720]) expect(ids(one('mesencephalic_perf_l', tH)), `${tH} h`).not.toContain('holmes_tremor');
    for (const tH of [1440, 2160]) expect(ids(one('mesencephalic_perf_l', tH)), `${tH} h`).toContain('holmes_tremor');
  });

  it('counts as the tremor of a Claude syndrome, whose label needs its signs (C5-F2)', () => {
    const claude = SYNDROMES.find((d) => d.id === 'claude')!;
    const cn3: SymptomItem = { id: 'cn3_palsy', side: 'l', sev: 2, sources: ['midbrain_paramedian_l'], delayed: false };
    const holmes: SymptomItem = { id: 'holmes_tremor', side: 'r', sev: 1, sources: ['midbrain_paramedian_l'], delayed: true };
    expect(claude.requires!(symptomQuery([cn3, holmes]), 'l')).toBe(true);
    expect(claude.requires!(symptomQuery([cn3]), 'l')).toBe(false);
  });
});

describe('one aphasia type at a time (C1-F1) with the thalamic aphasia (C9-F4)', () => {
  it('a thalamic aphasia alone is listed; next to a cortical type it is part of that type', () => {
    const at = (lvl: Record<string, number>) => aphasias(aggregateSymptoms(lvl, lvl, 24));
    expect(at({ thalamus_anterior_l: 0.9 })).toEqual(['aphasia_thalamic']);
    expect(at({ thalamus_anterior_l: 0.9, broca_l: 0.9 })).toEqual(['aphasia_broca']);
    expect(at({ thalamus_paramedian_l: 0.9, superior_temporal_posterior_l: 0.9 })).toEqual(['aphasia_wernicke']);
  });
});

describe('the TIA story (C3-F8) for the single-branch attacks of a capsular warning syndrome (C6-F2)', () => {
  it('each crescendo attack before the lacunar stroke is a TIA, an emergency', () => {
    for (const tH of [0, 1, 3.5]) {
      const ev = active(scenario('capsular_warning', tH));
      expect(ev, `${tH} h`).toContain('tia_urgent');
      expect(ev, `${tH} h`).toContain('ischemia_no_infarct');
    }
    // the lasting occlusion from 6 h is the stroke itself, told as a lacunar stroke
    for (const tH of [6, 24]) {
      const ev = active(scenario('capsular_warning', tH));
      expect(ev, `${tH} h`).not.toContain('tia_urgent');
      expect(ev, `${tH} h`).toContain('treatment_window');
    }
  });

  it('so does a pontine warning attack before a pontine lacune', () => {
    const lacune = (fromH: number, toH?: number): Occlusion => ({ vessel: 'pontine_paramedian_rostral_r', severity: 1, branch: true, fromH, ...(toH !== undefined ? { toH } : {}) });
    const r = occ([lacune(0, 1 / 12), lacune(2)], 1);
    expect(active(r)).toContain('tia_urgent');
  });
});

describe('the second chain’s new labels follow the first chain’s label rules (C5-F2)', () => {
  it('the thalamic territory labels are vascular-pattern labels; the coma and pontine labels need their signs', () => {
    for (const id of ['thalamic_tuberothalamic', 'thalamic_paramedian_unilateral', 'thalamomesencephalic', 'thalamic_posterior_choroidal', 'thalamomesencephalic_bilateral'])
      expect(SYNDROMES.find((d) => d.id === id)!.pattern, id).toBe(true);
    for (const id of ['locked_in', 'locked_in_incomplete', 'basilar_coma', 'pontine_doc', 'pontine_anteromedial'])
      expect(SYNDROMES.find((d) => d.id === id)!.requires, id).toBeDefined();
    // one incomplete locked-in rule, not two
    expect(SYNDROMES.filter((d) => d.id === 'locked_in_incomplete')).toHaveLength(1);
  });

  it('a paramedian thalamic label keeps its place while its gaze palsy lasts, and is not marked silent', () => {
    const r = one('thalamoperforator_r', 4320);
    const m = r.syndromes.find((x) => x.def.id === 'thalamic_paramedian_unilateral');
    expect(m?.side).toBe('r');
    expect(ids(r)).toContain('vertical_gaze_palsy');
    expect(m?.silent ?? false).toBe(false);
  });
});

describe('SeLECT predictors (C4-F4) with the larger PCA infarct (C1-F3)', () => {
  it('a PCA infarct that reaches the PCA share of the occipital pole’s MCA–PCA border bed is not an MCA-territory infarct', () => {
    const late = scenario('l_pca', 720).cascade.events.find((e) => e.id === 'seizure_late')!;
    expect(late.desc.en).toMatch(/This case shows cortical involvement;/);
    expect(scenario('l_m1', 720).cascade.events.find((e) => e.id === 'seizure_late')!.desc.en).toMatch(/territory of the middle cerebral artery;/);
  });
});

describe('a TIA carries no complications of a lasting deficit (C1-F4 with the TIA story)', () => {
  it('no aspiration or venous-thrombosis warning once the symptoms have cleared with the flow', () => {
    const tias: [string, SimResult][] = [
      ['tia_l_mca', scenario('tia_l_mca', 24)],
      ['5-minute mid-basilar occlusion', occ([{ vessel: 'basilar_mid', severity: 1, toH: 1 / 12 }], 72)],
      ['5-minute M1 occlusion', occ([{ vessel: 'mca_m1_l', severity: 1, toH: 1 / 12 }], 72)],
    ];
    for (const [name, r] of tias) {
      const ev = r.cascade.events.map((e) => e.id);
      expect(ev, name).toContain('tia_urgent');
      expect(ev, name).not.toContain('aspiration');
      expect(ev, name).not.toContain('dvt');
    }
  });

  it('a stroke keeps them', () => {
    for (const id of ['l_m1', 'basilar_mid']) {
      const ev = scenario(id, 72).cascade.events.map((e) => e.id);
      expect(ev, id).toContain('aspiration');
      expect(ev, id).toContain('dvt');
    }
  });
});

// ── second round: the cortex, lacunar and event fixes (R1–R3) with the treatment, brainstem and
// acute-course fixes (R4–R6) ──

/** stuporous or comatose (NIHSS 1a ≥ 2), or in a disorder of consciousness */
const unaware = (r: SimResult) => r.symptoms.some((s) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness');
const sided = (s: SymptomItem[]) => s.map((x) => `${x.id}(${x.side ?? '-'})`);

describe('colour, reading and writing need an awake patient (R1-5, R1-9 with R5-7)', () => {
  it('no colour loss while the top-of-the-basilar patient is comatose or in a disorder of consciousness', () => {
    for (const tH of [120, 168, 336, 720, 2160]) {
      const r = scenario('basilar_tip', tH);
      expect(unaware(r), `${tH} h`).toBe(true);
      expect(ids(r), `${tH} h`).not.toContain('hemiachromatopsia');
      expect(ids(r), `${tH} h`).not.toContain('achromatopsia');
    }
    // the field defect is still there while it lasts (to two weeks since the pial arteries are
    // mirrored in the flow model, X3-0); the colour vision inside the part still seen cannot be tested
    for (const tH of [120, 168, 336]) {
      const r = scenario('basilar_tip', tH);
      expect(sided(r.symptoms), `${tH} h`).toContain('quadrant_sup(r)');
      expect(sided(r.unexaminable), `${tH} h`).toContain('hemiachromatopsia(r)');
    }
  });

  it('the same lesion in an awake patient keeps it, and loses it under coma', () => {
    // Paulson's pattern: the lower bank and the colour area of one side
    const lvl = { lingual_l: 0.9, inferior_temporal_fusiform_l: 0.9 };
    expect(sided(aggregateSymptoms(lvl, lvl, 24))).toContain('hemiachromatopsia(r)');
    const comatose = aggregateSymptoms(lvl, lvl, 24, [{ id: 'coma', side: null, sev: 3, sources: [], delayed: false }]);
    expect(sided(comatose)).toContain('quadrant_sup(r)');
    expect(sided(comatose)).not.toContain('hemiachromatopsia(r)');
  });

  it('no "alexia without agraphia" label, and no alexia, in a comatose patient', () => {
    for (const tH of [0, 1, 6]) {
      const r = scenario('basilar_tip', tH, { collateral: 'poor' });
      expect(ids(r), `${tH} h`).toContain('coma');
      expect(r.nihss.items['1a'], `${tH} h`).toBe(3);
      expect(ids(r), `${tH} h`).not.toContain('alexia');
      expect(labels(r), `${tH} h`).not.toContain('alexia_without_agraphia');
    }
    // awake, the left PCA infarct keeps both (R1-9)
    const awake = occ([{ vessel: 'pca_p2_l', severity: 1 }], 24);
    const poor = simulate({ ...awake.input, collateral: 'poor' });
    expect(unaware(poor)).toBe(false);
    expect(ids(poor)).toContain('alexia');
    expect(labels(poor)).toContain('alexia_without_agraphia');
  });

  it('the reading, writing and calculation signs of a left M1 infarct pause during the herniation coma and return after it', () => {
    const at = (tH: number) => scenario('l_m1', tH, { collateral: 'poor' });
    const GERSTMANN = ['alexia', 'agraphia', 'acalculia', 'finger_agnosia'];
    for (const tH of [72, 168]) {
      const r = at(tH);
      expect(r.nihss.items['1a'], `${tH} h`).toBe(3);
      for (const id of GERSTMANN) expect(ids(r), `${tH} h`).not.toContain(id);
    }
    for (const tH of [24, 336, 2160]) for (const id of GERSTMANN) expect(ids(at(tH)), `${tH} h`).toContain(id);
    // awake at 3 months with a mild Broca aphasia: the Gerstmann label (R1-2)
    expect(labels(at(2160))).toContain('gerstmann');
  });
});

describe('a disorder of consciousness is scored as a mute patient who follows no command (R1-1 with R5-7)', () => {
  it('items 9, 1c and 10 in the top-of-the-basilar and upper-basilar disorders of consciousness', () => {
    const cases: [string, SimResult][] = [
      ['basilar_tip 720 h', scenario('basilar_tip', 720)],
      ['basilar_tip 2160 h', scenario('basilar_tip', 2160)],
      ['basilar_tip 4320 h', scenario('basilar_tip', 4320)],
      ['basilar_upper moderate 2160 h', simulate({ ...one('basilar_upper', 2160).input, collateral: 'moderate' })],
    ];
    for (const [name, r] of cases) {
      expect(ids(r), name).toContain('disorder_of_consciousness');
      // not comatose (1a = 2), so the scale's coma rule does not set these items
      expect(r.nihss.items['1a'], name).toBe(2);
      // the thalamic word-finding difficulty is not listed in it (R5-7) ...
      expect(ids(r), name).not.toContain('aphasia_thalamic');
      // ... and the language, command and speech items do not read normal (R1-1)
      expect([r.nihss.items['9'], r.nihss.items['1c'], r.nihss.items['10']], name).toEqual([3, 2, 2]);
    }
  });

  it('an awake patient after a Percheron infarct is not scored so', () => {
    const r = scenario('percheron', 2160);
    expect(ids(r)).not.toContain('disorder_of_consciousness');
    expect(r.nihss.items['9'] ?? 0).toBeLessThan(3);
  });
});

// ── third round: what cannot be examined under reduced consciousness (X1) ──

const items = (r: SimResult) => r.nihss.items;
const hidden = (r: SimResult) => (r.unexaminable ?? []).map((s) => s.id);

describe('a stuporous patient’s language is scored and listed; in coma or a disorder of consciousness no aphasia type is (X1-5)', () => {
  // the NIHSS: "The examiner must choose a score for the patient with stupor or limited
  // cooperation"; "the patient in a coma (item 1a = 3) will automatically score 3 on this item"
  it('the thalamic aphasia of the stuporous Percheron patient stays listed and scores item 9', () => {
    for (const id of ['percheron', 'percheron_midbrain'])
      for (const collateral of ['good', 'moderate', 'poor'] as const)
        for (const tH of [0, 1, 24, 168]) {
          const r = scenario(id, tH, { collateral });
          const where = `${id} ${collateral} ${tH} h`;
          expect(items(r)['1a'], where).toBe(2);
          expect(ids(r), where).toContain('aphasia_thalamic');
          expect(items(r)['9'], where).toBe(1);
        }
    expect(scenario('percheron', 24).nihss.total).toBe(6);
    expect(scenario('percheron_midbrain', 24).nihss.total).toBe(7);
  });

  it('no aphasia type is listed in a comatose patient or a disorder of consciousness, and item 9 is 3', () => {
    const cases: [string, SimResult][] = [
      ['l_m1 moderate 72 h (herniation coma)', scenario('l_m1', 72, { collateral: 'moderate' })],
      ['l_m1 poor 168 h', scenario('l_m1', 168, { collateral: 'poor' })],
      ['basilar_tip poor 6 h (coma)', scenario('basilar_tip', 6, { collateral: 'poor' })],
      ['basilar_tip poor 720 h (disorder of consciousness)', scenario('basilar_tip', 720, { collateral: 'poor' })],
    ];
    for (const [name, r] of cases) {
      expect(unaware(r), name).toBe(true);
      expect(aphasias(r.symptoms), name).toEqual([]);
      expect(items(r)['9'], name).toBe(3);
    }
    // a transcortical sensory aphasia (fluent, repeats well) is not listed beside a mute patient
    expect(hidden(cases[3][1])).toContain('aphasia_tc_sensory');
    // awake again, the left M1 patient's aphasia is listed once more
    expect(aphasias(scenario('l_m1', 336, { collateral: 'moderate' }).symptoms)).toEqual(['aphasia_global']);
  });
});

describe('the other higher cortical signs need an awake patient too (X1-12)', () => {
  it('no recognition, praxis, awareness, memory or initiative signs while comatose, and no neglect label', () => {
    for (const tH of [48, 72, 168]) {
      const r = scenario('r_m1_malignant', tH, { collateral: 'poor' });
      expect(items(r)['1a'], `${tH} h`).toBe(3);
      for (const id of ['prosopagnosia', 'anosognosia', 'amnesia', 'abulia', 'neglect']) expect(ids(r), `${tH} h ${id}`).not.toContain(id);
      expect(labels(r), `${tH} h`).not.toContain('neglect');
      // the scale still scores extinction and inattention in coma (item 11 = 2)
      expect(items(r)['11'], `${tH} h`).toBe(2);
    }
    for (const tH of [72, 120]) {
      const r = scenario('l_m1', tH, { collateral: 'moderate' });
      for (const id of ['apraxia', 'callosal_apraxia', 'alien_hand', 'cortical_sensory', 'apraxia_of_speech', 'visuospatial'])
        expect(ids(r), `${tH} h ${id}`).not.toContain(id);
    }
    // awake at 3 months, the right-hemisphere picture is listed and named again
    const late = scenario('r_m1_malignant', 2160, { collateral: 'poor' });
    for (const id of ['prosopagnosia', 'anosognosia', 'neglect']) expect(ids(late), id).toContain(id);
    expect(labels(late)).toContain('neglect');
  });

  it('the stuporous Percheron patient: no memory or initiative testing, but the neglect the scale scores is listed', () => {
    const r = scenario('percheron', 24);
    expect(items(r)['1a']).toBe(2);
    for (const id of ['amnesia', 'abulia']) {
      expect(ids(r), id).not.toContain(id);
      expect(hidden(r), id).toContain(id);
    }
    expect(sided(r.symptoms)).toContain('neglect(l)');
    // the amnesia of the summary is listed once the patient is awake
    expect(ids(scenario('percheron', 336))).toContain('amnesia');
  });

  it('a disorder of consciousness lists no memory, initiative or reported pain', () => {
    const r = scenario('basilar_tip', 2160);
    expect(ids(r)).toContain('disorder_of_consciousness');
    for (const id of ['amnesia', 'abulia', 'central_pain', 'proprio_loss']) expect(ids(r), id).not.toContain(id);
  });

  it('what only the patient can report is not listed while stuporous or comatose; what the examiner sees is', () => {
    for (const tH of [48, 72]) {
      const r = scenario('cerebellar_swelling', tH);
      expect(unaware(r), `${tH} h`).toBe(true);
      for (const id of ['vertigo', 'diplopia']) expect(ids(r), `${tH} h ${id}`).not.toContain(id);
      // misaligned eyes and nystagmus can be seen
      for (const id of ['nystagmus', 'gaze_palsy_horizontal']) expect(ids(r), `${tH} h ${id}`).toContain(id);
      // the finger–nose test needs a patient who understands: the scale scores no limb ataxia then
      expect(ids(r), `${tH} h`).not.toContain('ataxia_limb');
      expect(items(r)['7'] ?? 0, `${tH} h`).toBe(0);
    }
    // alert again: vertigo and double vision are reported
    const awake = scenario('cerebellar_swelling', 336);
    for (const id of ['vertigo', 'diplopia', 'ataxia_limb']) expect(ids(awake), id).toContain(id);
  });
});

describe('speech is rated only while the patient speaks, and a clumsy hand only in a patient who moves on request (X1-12)', () => {
  // the NIHSS rates articulation from the patient's speech, in a stuporous patient too; in coma
  // the scale scores item 10 as 2 itself, and a disorder of consciousness is scored as mute
  it('no slurred speech or hoarseness is listed in coma or a disorder of consciousness; the scale scores item 10 = 2', () => {
    const cases: [string, SimResult][] = [
      ['r_m1_malignant poor 48 h (herniation coma)', scenario('r_m1_malignant', 48, { collateral: 'poor' })],
      ['cerebellar_swelling 72 h (coma)', scenario('cerebellar_swelling', 72)],
      ['basilar_tip 336 h (disorder of consciousness)', scenario('basilar_tip', 336)],
    ];
    for (const [name, r] of cases) {
      expect(unaware(r), name).toBe(true);
      for (const id of ['dysarthria', 'hoarseness']) expect(ids(r), `${name} ${id}`).not.toContain(id);
      expect(hidden(r), name).toContain('dysarthria');
      expect(items(r)['10'], name).toBe(2);
    }
    expect(hidden(cases[1][1])).toContain('hoarseness');
    // stuporous, the patient's speech is still rated
    const stupor = scenario('cerebellar_swelling', 48);
    expect(items(stupor)['1a']).toBe(2);
    for (const id of ['dysarthria', 'hoarseness']) expect(ids(stupor), id).toContain(id);
  });

  it('no clumsy hand is listed while the patient is stuporous, comatose or in a disorder of consciousness', () => {
    const cases: [string, SimResult][] = [
      ['basilar_upper 24 h (coma)', one('basilar_upper', 24)],
      ['basilar_upper 2160 h (disorder of consciousness)', one('basilar_upper', 2160)],
      ['basilar_upper reopened at 24 h, 24 h (stupor)', simulate({ ...one('basilar_upper', 24).input, reperfusionH: 24 })],
      ['r_m1_malignant poor 48 h (coma)', scenario('r_m1_malignant', 48, { collateral: 'poor' })],
    ];
    expect(items(cases[2][1])['1a']).toBe(2);
    for (const [name, r] of cases) {
      expect(unaware(r) || (items(r)['1a'] ?? 0) >= 2, name).toBe(true);
      expect(ids(r), name).not.toContain('hand_clumsy');
      expect(hidden(r), name).toContain('hand_clumsy');
      // the weak arm is still scored
      expect(ids(r), name).toContain('arm_weak');
    }
    // awake at 1 day, the right M1 patient's clumsy hand is listed
    expect(ids(scenario('r_m1_malignant', 24, { collateral: 'poor' }))).toContain('hand_clumsy');
  });
});

describe('a disorder of consciousness is scored as the examination records an unresponsive patient (X1-16)', () => {
  it('the symptom text says how the scale scores it, and that eye answers make it a locked-in syndrome', () => {
    const d = SYMPTOM_BY_ID.disorder_of_consciousness.desc;
    expect(d.en).toMatch(/NIHSS/);
    expect(d.en).toMatch(/locked-in/);
    expect(d.zh).toMatch(/NIHSS/);
    expect(d.zh).toMatch(/閉鎖/);
    // the recognised locked-in syndrome is a different, awake patient (basilar_mid)
    const li = scenario('basilar_mid', 2160);
    expect(ids(li)).not.toContain('disorder_of_consciousness');
    expect(items(li)['1a'] ?? 0).toBe(0);
    expect(items(li)['9'] ?? 0).toBe(0);
  });
});

describe('what cannot be examined follows the level of consciousness of stacked lesions too (X1-5, X1-12)', () => {
  it('a left M1 infarct, then an upper basilar occlusion a month later: its higher cortical signs go with the coma and the disorder of consciousness, without changing the NIHSS', () => {
    const run = (tH: number) =>
      simulate({
        occlusions: [
          { vessel: 'mca_m1_l', severity: 1 },
          { vessel: 'basilar_upper', severity: 1, fromH: 720 },
        ],
        variants: [],
        collateral: 'poor',
        map: 93,
        tH,
        reperfusionH: null,
        decompression: false,
      });
    // awake between the herniation coma and the second stroke
    expect(ids(run(336))).toContain('executive');
    for (const tH of [720, 2160]) {
      const r = run(tH);
      expect(unaware(r), `${tH} h`).toBe(true);
      for (const id of ['executive', 'alexia', 'amnesia']) {
        expect(ids(r), `${tH} h ${id}`).not.toContain(id);
        expect(hidden(r), `${tH} h ${id}`).toContain(id);
      }
      expect(aphasias(r.symptoms), `${tH} h`).toEqual([]);
      expect(estimateNihss([...r.symptoms, ...r.unexaminable]).items, `${tH} h`).toEqual(r.nihss.items);
    }
  });
});
