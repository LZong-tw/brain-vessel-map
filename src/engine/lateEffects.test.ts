/**
 * Late and non-motor consequences (clinical-detail audit, cluster C10): spasticity and central
 * post-stroke pain as graded, possible late consequences rather than certainties; when each late
 * symptom starts; the lateral medullary pain pattern; the general stroke–heart complication; the
 * possible REM sleep behaviour disorder after a brainstem infarct; pathological crying from the
 * frontal MCA cortex; and the wording of the cognitive, mood and sleep-apnoea population figures.
 * Sources are next to the data (src/anatomy/symptoms.ts, regions.ts, postStrokeRisks.ts,
 * scenarios.ts, syndromes.ts; src/engine/cascade.ts) and in REFERENCES.md.
 */
import { describe, expect, it } from 'vitest';
import { REGION_BY_ID } from '../anatomy';
import { POST_STROKE_RISKS } from '../anatomy/postStrokeRisks';
import { REDUNDANCY } from '../anatomy/redundancy';
import { SCENARIO_BY_ID, SCENARIOS } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID, symptomOnsetH } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { caseNotes } from '../ui/postStrokeRisks';
import { aggregateSymptoms, type SymptomItem } from './clinical';
import type { Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

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
const scenario = (id: string, tH: number) => simulate(inputOf(id, { tH }));
const sim = (occlusions: Occlusion[], tH: number) =>
  simulate({ occlusions, variants: [], collateral: 'good', map: 93, tH, reperfusionH: null, decompression: false });
const get = (r: SimResult | SymptomItem[], id: string, side?: SymptomItem['side']) =>
  (Array.isArray(r) ? r : r.symptoms).find((s) => s.id === id && (side === undefined || s.side === side));
const ids = (r: SimResult) => r.symptoms.map((s) => s.id);
const event = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
/** events in effect at the simulated time */
const activeEvents = (r: SimResult) =>
  r.cascade.events.filter((e) => e.onsetH <= r.input.tH && r.input.tH < (e.endH ?? Infinity)).map((e) => e.id);
const risk = (id: string) => POST_STROKE_RISKS.find((r) => r.id === id);

describe('C10-F1: spasticity is graded by the early weakness and sensory loss', () => {
  it('a pure motor lacune with mild weakness and no sensory loss: mild spasticity (sev 1), not sev 2', () => {
    // Urban 2010: severe paresis and hemihypesthesia at onset predict spasticity
    for (const id of ['l_lacune', 'r_pontine_lacune']) {
      const s = get(scenario(id, 2160), 'spasticity');
      expect(s, id).toBeDefined();
      expect(s!.sev, id).toBe(1);
    }
  });

  it('severe early weakness or hemisensory loss keeps sev 2 (pontine infarct, lenticulostriate infarct, M2)', () => {
    // l_pontine: arm and leg 3 at 24 h, no sensory loss; l_lsa: hemisensory loss; l_m2_sup: both
    for (const id of ['l_pontine', 'l_lsa', 'l_m2_sup', 'r_asa']) expect(get(scenario(id, 2160), 'spasticity')?.sev, id).toBe(2);
  });

  it('spasticity does not fade once present (a late consequence, not a lost function)', () => {
    expect(REDUNDANCY.spasticity.kind).toBe('exempt');
    expect(get(scenario('l_lsa', 4320), 'spasticity')?.sev).toBe(get(scenario('l_lsa', 720), 'spasticity')?.sev);
  });

  it('the symptom text gives how often it happens', () => {
    const d = SYMPTOM_BY_ID.spasticity.desc;
    expect(d.en).toMatch(/19 %/);
    expect(d.en).toMatch(/43 %|4 in 10/);
    expect(d.zh).toMatch(/19%/);
  });
});

describe('C10-F1: central post-stroke pain is a possible late consequence, not a certainty', () => {
  it('thalamic stroke: listed as possible, at severity 1, not 2', () => {
    const p = get(scenario('l_thalamic', 2160), 'central_pain', 'r');
    expect(p).toBeDefined();
    expect(p!.sev).toBe(1);
    expect(SYMPTOM_BY_ID.central_pain.name.en).toMatch(/^Possible/);
    expect(SYMPTOM_BY_ID.central_pain.name.zh).toMatch(/^可能/);
    expect(REGION_BY_ID.thalamus_ventrolateral_l.deficits.find((d) => d.s === 'central_pain')?.sev).toBe(1);
  });

  it('the texts give the risk (Nasreddine & Saver 1997; MacGowan 1997; Andersen 1995) and agree with each other', () => {
    const d = SYMPTOM_BY_ID.central_pain.desc;
    expect(d.en).toMatch(/1 in 7/);
    expect(d.en).toMatch(/1 in 4/);
    expect(d.en).toMatch(/right/);
    expect(d.zh).toMatch(/七分之一/);
    // the scenario no longer promises that pain appears, and the syndrome no longer says "a quarter to a third"
    const sum = SCENARIO_BY_ID.l_thalamic.summary;
    expect(sum.en).not.toMatch(/to see central pain appear/);
    expect(sum.en).toMatch(/one in four/);
    expect(sum.zh).toMatch(/四分之一/);
    const syn = SYNDROMES.find((s) => s.id === 'thalamic_sensory')!.desc;
    expect(syn.en).not.toMatch(/a quarter to a third/);
    expect(syn.en).toMatch(/1 in 7/);
    expect(syn.zh).toMatch(/七分之一/);
  });
});

describe('C10-F2: each late symptom starts when the evidence says, and its event starts with it', () => {
  it('per-symptom onsets: spasticity and central pain from 2 weeks, emotionalism about 3 weeks, a cold limb about 1 month', () => {
    expect(symptomOnsetH(SYMPTOM_BY_ID.spasticity)).toBe(336);
    expect(symptomOnsetH(SYMPTOM_BY_ID.central_pain)).toBe(336);
    expect(symptomOnsetH(SYMPTOM_BY_ID.emotionalism)).toBe(504);
    expect(symptomOnsetH(SYMPTOM_BY_ID.cold_limb)).toBe(720);
    // l_m1: the cold limb felt from about a month (Wanklyn 1995), not at 2 weeks
    expect(ids(scenario('l_m1', 336))).not.toContain('cold_limb');
    expect(ids(scenario('l_m1', 720))).toContain('cold_limb');
    // pathological crying after the first weeks (House 1989: 15 % at 1 month)
    expect(ids(scenario('l_lsa', 336))).not.toContain('emotionalism');
    expect(ids(scenario('l_lsa', 720))).toContain('emotionalism');
    // increased tone within 2 weeks in a quarter (Wissel 2010)
    expect(ids(scenario('l_lsa', 336))).toContain('spasticity');
    expect(ids(scenario('l_thalamic', 336))).toContain('central_pain');
    // the cold limb text separates measured cooling (from the acute phase) from felt coldness
    expect(SYMPTOM_BY_ID.cold_limb.desc.en).toMatch(/first days/);
  });

  it('the spasticity and central-pain events start with their symptoms', () => {
    const lsa = scenario('l_lsa', 2160);
    expect(event(lsa, 'spasticity')?.onsetH).toBe(symptomOnsetH(SYMPTOM_BY_ID.spasticity));
    const th = scenario('l_thalamic', 2160);
    expect(event(th, 'central_pain')?.onsetH).toBe(symptomOnsetH(SYMPTOM_BY_ID.central_pain));
  });

  it('every scenario: the late events are shown exactly when their symptoms are (small infarcts and lacunes included)', () => {
    for (const sc of SCENARIOS) {
      const r = scenario(sc.id, 2160);
      // a pain that a patient in a disorder of consciousness cannot report is still a possibility
      // to look for (X1-12): listed, or there but not examinable
      const pain = [...r.symptoms, ...r.unexaminable].some((s) => s.id === 'central_pain' || s.id === 'central_pain_face');
      expect(activeEvents(r).includes('central_pain'), `${sc.id}: central_pain`).toBe(pain);
      expect(activeEvents(r).includes('spasticity'), `${sc.id}: spasticity`).toBe(ids(r).includes('spasticity'));
    }
    // the cases that used to miss the event (vol < 1 mL, or an infarct fraction of 0.25–0.3)
    for (const id of ['r_wallenberg', 'r_pica']) expect(activeEvents(scenario(id, 2160)), id).toContain('central_pain');
    for (const id of ['l_lacune', 'r_pontine_lacune']) expect(activeEvents(scenario(id, 2160)), id).toContain('spasticity');
    // and the one that had the event without the symptom
    expect(activeEvents(scenario('r_sca', 2160))).not.toContain('central_pain');
  });
});

describe('C10-F3: the lateral medullary pain pattern', () => {
  it('Wallenberg: possible facial pain on the lesion side (periorbital), body pain on the other', () => {
    const r = scenario('r_wallenberg', 2160);
    expect(get(r, 'central_pain_face', 'r')).toBeDefined();
    expect(get(r, 'central_pain', 'l')).toBeDefined();
    expect(get(r, 'central_pain_face', 'l')).toBeUndefined();
    expect(scenario('r_wallenberg', 24).symptoms.some((s) => s.id === 'central_pain_face')).toBe(false);
    expect(SYMPTOM_BY_ID.central_pain_face.desc.en).toMatch(/around the eye/);
    expect(REDUNDANCY.central_pain_face.kind).toBe('exempt');
    expect(SYMPTOM_BY_ID.central_pain_face.nihss).toBeUndefined();
  });

  it('a large lateral medullary infarct also dulls pain and temperature on the other side of the face (Kim 2003)', () => {
    expect(get(scenario('r_wallenberg', 24), 'pain_temp_face', 'l')).toBeDefined();
    expect(get(scenario('r_wallenberg', 24), 'pain_temp_face', 'r')).toBeDefined();
    // a partial (PICA-only) lateral medulla, and a single perforator lacune, do not
    expect(get(scenario('r_pica', 24), 'pain_temp_face', 'l')).toBeUndefined();
    expect(get(sim([{ vessel: 'lat_medullary_perf_r', severity: 1, branch: true }], 24), 'pain_temp_face', 'l')).toBeUndefined();
  });

  it('no central pain from the insula region (operculo-insular pain is rare: text only)', () => {
    const one = { insula_l: 1 };
    expect(get(aggregateSymptoms(one, one, 2160), 'central_pain')).toBeUndefined();
    expect(SYMPTOM_BY_ID.central_pain.desc.en).toMatch(/operculum/);
  });

  it('the event names the side and the lateral medullary pattern', () => {
    const e = event(scenario('r_wallenberg', 2160), 'central_pain')!;
    expect(e.desc.en).toMatch(/around the eye/);
    expect(e.desc.en).toMatch(/right/);
    expect(e.regions).toContain('medulla_lateral_r');
    const t = event(scenario('l_thalamic', 2160), 'central_pain')!;
    expect(t.desc.en).toMatch(/right side of the body/);
    expect(t.regions).toEqual(['thalamus_ventrolateral_l']);
  });
});

describe('C10-F4: the commonest complications after stroke are in the outcome list', () => {
  it('falls, shoulder pain, infections and recurrence, with their figures', () => {
    expect(risk('falls')?.prevalence.value).toBeCloseTo(0.73, 2);
    expect(risk('shoulder_pain')?.prevalence.value).toBeCloseTo(0.22, 2);
    expect(risk('infections')?.prevalence.value).toBeCloseTo(0.24, 2);
    const rec = risk('recurrence')!;
    expect(rec.prevalence).toEqual({ value: 0.111, low: 0.09, high: 0.133 });
    expect(rec.factors.en).toMatch(/5\.1 %/);
    // the population of each figure is stated
    expect(risk('falls')!.window.en).toMatch(/60/);
    expect(risk('infections')!.window.en).toMatch(/hospital/);
  });

  it('late seizures: the figures and the SeLECT factors are in the seizure event (Galovic 2018)', () => {
    // the late-seizure event of C4-F4 (seizure_early / seizure_late) carries them
    const e = event(scenario('l_m1', 2160), 'seizure_late')!;
    expect(e.desc.en).toMatch(/4 ?%/);
    expect(e.desc.en).toMatch(/8 ?%/);
    expect(e.desc.en).toMatch(/SeLECT/);
    expect(e.desc.zh).toMatch(/SeLECT/);
  });

  it('shoulder pain: a note for a case with arm weakness, none without', () => {
    expect(caseNotes(risk('shoulder_pain')!, scenario('l_m1', 4320)).length).toBe(1);
    expect(caseNotes(risk('shoulder_pain')!, scenario('l_thalamic', 4320))).toEqual([]);
  });
});

describe('C10-F5: the heart after any stroke', () => {
  it('a stroke–heart event for every brain infarct, not only insular ones, for 2 weeks', () => {
    for (const id of ['l_lsa', 'l_thalamic', 'l_pontine', 'l_pca', 'r_wallenberg', 'l_m1']) {
      const e = event(scenario(id, 24), 'cardiac');
      expect(e, id).toBeDefined();
      expect(e!.endH, id).toBe(336);
    }
    // no infarct, no event
    expect(event(scenario('tia_l_mca', 24), 'cardiac')).toBeUndefined();
    expect(event(scenario('amaurosis', 24), 'cardiac')).toBeUndefined();
  });

  it('insula of either side is an added factor, with mixed evidence on the side', () => {
    const e = event(scenario('l_m2_sup', 24), 'cardiac')!;
    expect(e.regions).toEqual(['insula_l']);
    expect(e.desc.en).toMatch(/troponin/);
    expect(e.desc.en).toMatch(/mixed/);
    expect(e.desc.en).not.toMatch(/especially the right/);
    expect(event(scenario('l_lsa', 24), 'cardiac')!.regions).toEqual([]);
    const ins = REGION_BY_ID.insula_r.deficits.filter((d) => d.s === 'autonomic_cardiac');
    expect(ins).toHaveLength(1);
    expect(ins[0].sev).toBe(REGION_BY_ID.insula_l.deficits.find((d) => d.s === 'autonomic_cardiac')!.sev);
    expect(SYMPTOM_BY_ID.autonomic_cardiac.desc.en).not.toMatch(/especially right/);
  });
});

describe('C10-F6: urinary incontinence after stroke is mostly not a frontal sign', () => {
  it('an outcome entry with the course (Patel 2001) and a case note from the early picture', () => {
    const inc = risk('incontinence')!;
    expect(inc.prevalence.value).toBeCloseTo(0.4, 2);
    expect(inc.window.en).toMatch(/19 %/);
    // l_m1: weakness with a field defect and dysphagia early on
    expect(caseNotes(inc, scenario('l_m1', 4320)).length).toBe(1);
    // a lacune: less common after lacunar infarcts
    expect(caseNotes(inc, scenario('l_lacune', 4320))).toEqual([]);
    expect(SYMPTOM_BY_ID.incontinence.desc.en).toMatch(/most/i);
  });
});

describe('C10-F7: REM sleep behaviour disorder is a possible late problem of any brainstem infarct', () => {
  it('no longer a symptom of the pontine tegmentum', () => {
    expect(SYMPTOM_BY_ID.rbd).toBeUndefined();
    expect(ids(scenario('basilar_mid', 2160))).not.toContain('rbd');
  });

  it('an information event from about 1 month after pontine (basis or tegmentum) and medullary infarcts', () => {
    for (const id of ['l_pontine', 'r_pontine_lacune', 'basilar_mid', 'r_wallenberg', 'r_asa', 'r_sca']) {
      const e = event(scenario(id, 2160), 'rbd');
      expect(e, id).toBeDefined();
      expect(e!.severity).toBe('info');
      expect(e!.onsetH).toBe(720);
    }
    for (const id of ['l_m1', 'l_thalamic', 'l_lacune']) expect(event(scenario(id, 2160), 'rbd'), id).toBeUndefined();
    const e = event(scenario('l_pontine', 2160), 'rbd')!;
    expect(e.desc.en).toMatch(/1 in 5/);
    expect(e.desc.en).toMatch(/polysomnograph|sleep-laboratory/);
  });
});

describe('C10-F8: pathological crying after frontal MCA infarcts', () => {
  it('the dorsolateral prefrontal cortex produces it: the superior-division M2 infarct shows it', () => {
    expect(REGION_BY_ID.prefrontal_dorsolateral_l.deficits.some((d) => d.s === 'emotionalism')).toBe(true);
    expect(ids(scenario('l_m2_sup', 2160))).toContain('emotionalism');
    expect(ids(scenario('l_m2_sup', 24))).not.toContain('emotionalism');
  });

  it('episodes follow a real emotional cue, out of proportion (House 1989)', () => {
    expect(SYMPTOM_BY_ID.emotionalism.desc.en).toMatch(/real emotional/);
  });
});

describe('C10-F9 / F10 / F11: the population-figure wording follows the sources', () => {
  it('F9: the cognitive impairment sites come from a lesion-mapping study (Weaver 2021)', () => {
    const e = event(scenario('l_m1', 2160), 'depression_cognition')!;
    expect(e.desc.en).toMatch(/left frontotemporal/);
    expect(e.desc.en).toMatch(/right parietal/);
    expect(e.desc.en).not.toMatch(/angular gyrus/);
    expect(risk('dementia')!.sources.some((s) => s.startsWith('Weaver NA') && s.includes('2021'))).toBe(true);
  });

  it('F10: depression and lesion site, and no anxiety attributed to limbic lesions', () => {
    const e = event(scenario('l_m1', 2160), 'depression_cognition')!;
    expect(e.desc.en).toMatch(/no consistent hemispheric or left-frontal effect/);
    expect(e.desc.en).toMatch(/right amygdala/);
    expect(risk('depression')!.sources.some((s) => s.startsWith('Weaver NA') && s.includes('2023'))).toBe(true);
    // anxiety is no longer attributed to limbic lesions; the text says it is not tied to a site
    expect(SYMPTOM_BY_ID.emotional.desc.en).not.toMatch(/Apathy, anxiety/);
    expect(SYMPTOM_BY_ID.emotional.desc.en).toMatch(/not tied to a lesion site/);
    expect(SYMPTOM_BY_ID.emotional.desc.zh).not.toMatch(/冷漠、焦慮/);
  });

  it('F11: sleep apnoea: a combined risk of stroke or death, and the cardioembolic exception', () => {
    const f = risk('sleep_apnoea')!.factors;
    expect(f.en).toMatch(/combined risk of stroke or death/);
    expect(f.en).toMatch(/cardioembolic/);
    expect(f.zh).toMatch(/心因性栓塞/);
  });
});
