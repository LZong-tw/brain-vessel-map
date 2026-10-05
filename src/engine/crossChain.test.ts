/**
 * Where the two chains of the clinical-detail audit meet. Each chain fixed its own findings
 * without seeing the other's; these are the combinations that needed a rule of their own once
 * both were in. Each block names the findings it joins.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID, symptomOnsetH } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { aggregateSymptoms, symptomQuery, type SymptomItem } from './clinical';
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
