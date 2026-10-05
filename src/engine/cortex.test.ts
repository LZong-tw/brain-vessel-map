/**
 * Hemispheric (MCA / ACA / PCA) syndromes as the clinical-detail audit (cluster C1) asked for
 * them: one aphasia type at a time, the field defects of MCA and PCA strokes, swallowing after a
 * hemispheric stroke, where neglect comes from, the border-zone (watershed) motor pattern,
 * cortical blindness, colour vision, alien hand and callosal apraxia, motor impersistence and
 * release hallucinations. The sources are next to the data (src/anatomy/regions.ts, symptoms.ts,
 * syndromes.ts, territories.ts, vessels.ts) and in REFERENCES.md.
 */
import { describe, expect, it } from 'vitest';
import { REDUNDANCY } from '../anatomy/redundancy';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { aggregateSymptoms, estimateNihss, type SymptomItem } from './clinical';
import type { CollateralGrade, Occlusion } from './hemodynamics';
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
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'good', map: 93, tH, reperfusionH: null, decompression: false, ...over });
/** symptoms as "id(side)" */
const sym = (r: SimResult | SymptomItem[]) => (Array.isArray(r) ? r : r.symptoms).map((s) => `${s.id}(${s.side ?? '-'})`);
const has = (r: SimResult | SymptomItem[], id: string) => (Array.isArray(r) ? r : r.symptoms).some((s) => s.id === id);
const get = (r: SimResult | SymptomItem[], id: string) => (Array.isArray(r) ? r : r.symptoms).filter((s) => s.id === id);
const labels = (r: SimResult) => r.syndromes.map((m) => m.def.id + (m.side ? `_${m.side}` : ''));
const aphasias = (r: SimResult | SymptomItem[]) => (Array.isArray(r) ? r : r.symptoms).filter((s) => s.id.startsWith('aphasia_')).map((s) => s.id);
const FIELD = ['hemianopia', 'quadrant_sup', 'quadrant_inf', 'central_scotoma', 'cortical_blindness'];

describe('C1-F1: one aphasia type at a time (Kertesz & Poole taxonomy)', () => {
  const EXTRA: [string, Occlusion[], CollateralGrade][] = [
    ['mca_m1_l poor', occl('mca_m1_l'), 'poor'],
    ['ica_terminal_l moderate', occl('ica_terminal_l'), 'moderate'],
    ['aca_a2_l poor', occl('aca_a2_l'), 'poor'],
    ['mca_angular_l moderate', occl('mca_angular_l'), 'moderate'],
    ['mca_ant_parietal_l', occl('mca_ant_parietal_l'), 'good'],
    ['tuberothalamic_l', occl('tuberothalamic_l'), 'good'],
  ];
  it.each(SCENARIOS.map((s) => [s.id]))('%s: never more than one aphasia type listed', (id) => {
    for (const tH of [6, 24, 168, 720, 2160, 4320]) expect(aphasias(scenario(id, tH)).length, `${id} ${tH} h`).toBeLessThanOrEqual(1);
  });
  it.each(EXTRA)('%s: never more than one aphasia type listed', (_n, o, c) => {
    for (const tH of [24, 720, 2160]) expect(aphasias(sim(o, tH, { collateral: c })).length, `${tH} h`).toBeLessThanOrEqual(1);
  });

  it('left M1: global aphasia, which takes in the conduction and transcortical components', () => {
    const r = scenario('l_m1', 24);
    expect(aphasias(r)).toEqual(['aphasia_global']);
    // global severity comes from its components, not a fixed "maximum + 1"
    expect(get(r, 'aphasia_global')[0].sev).toBe(2);
    expect(r.nihss.items['9']).toBe(3);
    // mute and following no command (R1-1)
    expect(r.nihss.items).toMatchObject({ '1c': 2, '10': 2 });
  });

  it('left superior division: Broca aphasia (repetition is impaired, so no conduction or transcortical label)', () => {
    const r = scenario('l_m2_sup', 24);
    expect(aphasias(r)).toEqual(['aphasia_broca']);
    // a non-fluent aphasia may come with apraxia of speech
    expect(has(r, 'apraxia_of_speech')).toBe(true);
  });

  it('left inferior division: Wernicke aphasia, without transcortical sensory aphasia or apraxia of speech', () => {
    const r = scenario('l_m2_inf', 24);
    expect(aphasias(r)).toEqual(['aphasia_wernicke']);
    expect(has(r, 'apraxia_of_speech')).toBe(false);
  });

  it('transcortical motor + transcortical sensory alone is a mixed transcortical (isolation) aphasia', () => {
    // (the left anterior thalamus served as the sensory component here before; it now gives a
    // thalamic aphasia, C9-F4, so the angular gyrus does)
    const lvl = { prefrontal_dorsolateral_l: 0.9, angular_l: 0.9 };
    const got = aggregateSymptoms(lvl, lvl, 24);
    expect(aphasias(got)).toEqual(['aphasia_mixed_tc']);
    const def = SYMPTOM_BY_ID.aphasia_mixed_tc;
    expect(def.system).toBe('language');
    expect(def.nihss?.item).toBe('9');
    expect(REDUNDANCY.aphasia_mixed_tc).toBeDefined();
  });

  it('the type changes as components are compensated: global is graded, compensated like global aphasia, and no longer scores as mute', () => {
    // one month: still global, graded from its compensated components
    const m1 = scenario('l_m1', 720);
    const g = get(m1, 'aphasia_global');
    expect(g).toHaveLength(1);
    expect(g[0].sev).toBe(2);
    expect(g[0].recovery?.compensated ?? 0).toBeGreaterThan(0);
    // three months: mild, so no longer global (R1-2) — a milder type, no longer mute
    const m3 = scenario('l_m1', 2160);
    expect(aphasias(m3)).toHaveLength(1);
    expect(get(m3, 'aphasia_global')).toEqual([]);
    expect(m3.nihss.items['9']).toBeLessThan(3);
    expect(m3.nihss.items['1b'] ?? 0).toBeLessThan(2);
  });

  it('Wernicke aphasia is graded on item 9: a mild one scores 1', () => {
    const items = estimateNihss([{ id: 'aphasia_wernicke', side: null, sev: 1, sources: [], delayed: false }], []).items;
    expect(items['9']).toBe(1);
    const m3 = scenario('l_m2_inf', 2160);
    expect(get(m3, 'aphasia_wernicke')[0]?.sev).toBe(1);
    expect(m3.nihss.items['9']).toBe(1);
  });

  it('Gerstmann is not named when global or Wernicke aphasia prevents testing it; the angular deficits stay listed', () => {
    for (const id of ['l_m1', 'l_m2_inf']) {
      const r = scenario(id, 24);
      expect(labels(r), id).not.toContain('gerstmann_l');
      expect(sym(r), id).toEqual(expect.arrayContaining(['agraphia(-)', 'acalculia(-)', 'finger_agnosia(-)']));
    }
    // an angular-gyrus infarct without them keeps the label
    expect(labels(sim(occl('mca_angular_l'), 24, { collateral: 'moderate' }))).toContain('gerstmann_l');
  });
});

describe('C1-F2: MCA strokes give the field defect the MCA syndrome texts promise', () => {
  it('left M1: a complete right hemianopia (NIHSS 3 = 2) from Meyer loop + parietal optic radiation', () => {
    const r = scenario('l_m1', 24);
    expect(sym(r)).toContain('hemianopia(r)');
    expect(sym(r)).not.toContain('quadrant_sup(r)');
    expect(r.nihss.items['3']).toBe(2);
  });

  it('inferior division (either side): hemianopia', () => {
    expect(sym(scenario('l_m2_inf', 24))).toContain('hemianopia(r)');
    expect(sym(sim(occl('mca_m2_inf_r'), 24))).toContain('hemianopia(l)');
  });

  it('the superior division has no field cut', () => {
    const r = scenario('l_m2_sup', 24);
    expect(r.symptoms.some((s) => FIELD.includes(s.id))).toBe(false);
  });

  it('the parietal optic radiation needs a large parietal lesion, not cortical spill-over', () => {
    expect(sym(aggregateSymptoms({ angular_l: 0.3 }, { angular_l: 0.3 }, 24))).not.toContain('quadrant_inf(r)');
    expect(sym(aggregateSymptoms({ angular_l: 0.7 }, { angular_l: 0.7 }, 24))).toContain('quadrant_inf(r)');
  });
});

describe('C1-F3: PCA occlusion gives the classic hemianopia', () => {
  const final = (vessel: string, c: CollateralGrade, region: string) => sim(occl(vessel), 2160, { collateral: c }).regions[region].infarct;
  it.each(['r', 'l'])('side %s: a P2 occlusion never leaves less calcarine infarct than its calcarine branch', (s) => {
    for (const c of ['good', 'moderate', 'poor'] as CollateralGrade[])
      for (const reg of [`lingual_${s}`, `cuneus_${s}`])
        expect(final(`pca_p2_${s}`, c, reg), `${c} ${reg}`).toBeGreaterThanOrEqual(final(`pca_calcarine_${s}`, c, reg) - 0.01);
  });

  it('the calcarine artery feeds both banks of the calcarine fissure: its occlusion gives a hemianopia', () => {
    const r = sim(occl('pca_calcarine_l'), 24, { collateral: 'moderate' });
    expect(r.regions.cuneus_l.dys).toBeGreaterThan(0.25);
    expect(sym(r)).toContain('hemianopia(r)');
  });

  it('the left PCA scenario shows the right hemianopia its summary promises, acutely and at 3 months', () => {
    for (const tH of [24, 2160]) {
      const r = scenario('l_pca', tH);
      expect(sym(r), `${tH} h`).toContain('hemianopia(r)');
      expect(labels(r), `${tH} h`).toContain('pca_l');
    }
  });

  it('untreated P2 occlusion with moderate collaterals: a field defect on both sides', () => {
    expect(sym(sim(occl('pca_p2_r'), 24, { collateral: 'moderate' }))).toContain('hemianopia(l)');
    expect(sym(sim(occl('pca_p2_l'), 24, { collateral: 'moderate' }))).toContain('hemianopia(r)');
  });
});

describe('C1-F4: swallowing after a hemispheric stroke', () => {
  it('large MCA strokes and opercular/insular infarcts are dysphagic', () => {
    for (const id of ['l_m1', 'r_m1_malignant', 'l_m2_sup']) expect(has(scenario(id, 24), 'dysphagia'), id).toBe(true);
    expect(has(sim(occl('mca_m2_sup_r'), 24, { collateral: 'moderate' }), 'dysphagia')).toBe(true);
  });

  it('small or non-opercular strokes are not', () => {
    for (const id of ['l_lacune', 'l_thalamic', 'tia_l_mca', 'r_aca']) expect(has(scenario(id, 24), 'dysphagia'), id).toBe(false);
  });

  it('one hemisphere: mild, and mostly gone within weeks; both hemispheres: worse', () => {
    expect(get(scenario('l_m1', 24), 'dysphagia')[0].sev).toBe(1);
    expect(has(scenario('l_m1', 720), 'dysphagia')).toBe(false);
    const both = { insula_r: 0.9, insula_l: 0.9 };
    expect(get(aggregateSymptoms(both, both, 24), 'dysphagia')[0]?.sev).toBe(2);
  });

  it('the aspiration warning follows the dysphagia and starts at onset (swallow screen before oral intake)', () => {
    for (const s of SCENARIOS) {
      const r = scenario(s.id, 24);
      const asp = r.cascade.events.find((e) => e.id === 'aspiration');
      if (has(r, 'dysphagia')) {
        expect(asp, `${s.id}: dysphagia without the aspiration warning`).toBeDefined();
        expect(asp!.onsetH, s.id).toBe(r.schedule.onsetH);
      }
    }
    expect(sim(occl('mca_m2_sup_r'), 24, { collateral: 'moderate' }).cascade.events.map((e) => e.id)).toContain('aspiration');
    expect(scenario('l_lacune', 24).cascade.events.map((e) => e.id)).not.toContain('aspiration');
  });
});

describe('C1-F5: where neglect comes from', () => {
  it('a superior parietal lesion alone (right ACA) is not a neglect syndrome', () => {
    const r = scenario('r_aca', 24);
    expect(has(r, 'neglect')).toBe(false);
    expect(labels(r)).not.toContain('neglect_r');
  });

  it('right superior temporal, parahippocampal and inferior frontal lesions can give left neglect', () => {
    for (const reg of ['superior_temporal_posterior_r', 'parahippocampal_r', 'broca_r']) {
      const got = aggregateSymptoms({ [reg]: 0.9 }, { [reg]: 0.9 }, 24);
      expect(sym(got), reg).toContain('neglect(l)');
    }
    expect(labels(sim(occl('mca_temporal_posterior_r'), 24))).toContain('neglect_r');
  });

  // R2-4: the neglect of a right deep infarct comes with cortical hypoperfusion (Hillis 2002), so
  // the putamen and caudate do not carry it themselves: a right striatocapsular infarct shows it
  // with its cortical signs, for three months
  it('right putamen and caudate: neglect with a striatocapsular infarct, not from the deep nuclei alone', () => {
    for (const reg of ['putamen_r', 'caudate_head_r']) {
      const got = aggregateSymptoms({ [reg]: 0.9 }, { [reg]: 0.9 }, 24);
      expect(sym(got), reg).not.toContain('neglect(l)');
    }
    const r = sim(occl('lenticulostriate_r'), 24);
    expect(sym(r.symptoms)).toContain('neglect(l)');
    expect(r.cascade.events.map((e) => e.id)).toContain('striatocapsular_cortical_r');
  });

  it('a left inferior parietal lesion gives a milder right neglect, scored on NIHSS item 11', () => {
    const got = get(aggregateSymptoms({ angular_l: 0.9 }, { angular_l: 0.9 }, 24), 'neglect');
    expect(got.map((s) => s.side)).toEqual(['r']);
    expect(got[0].sev).toBe(1);
    expect(scenario('l_m1', 24).nihss.items['11'] ?? 0).toBeGreaterThanOrEqual(1);
    // neglect after a right-hemisphere stroke is of the left side
    expect(get(scenario('r_m1_malignant', 24), 'neglect').map((s) => s.side)).toEqual(['l']);
  });

  it('the syndrome is named for the hemisphere, not the parietal lobe alone', () => {
    const def = SYNDROMES.find((d) => d.id === 'neglect')!;
    expect(def.name.en.toLowerCase()).not.toContain('parietal');
    expect(def.name.zh).not.toContain('頂葉');
  });
});

describe('C1-F6: border-zone (watershed) motor pattern', () => {
  it('a one-sided anterior border-zone lesion of the motor strip weakens the proximal arm, sparing face and hand', () => {
    const border = { precentral_face_arm_r: { dys: 0.9, inf: 0.9, share: 1 } };
    const lvl = { precentral_face_arm_r: 0.17 };
    const got = aggregateSymptoms(lvl, lvl, 24, [], [], border);
    expect(sym(got)).toContain('arm_weak_proximal(l)');
    for (const id of ['face_weak', 'hand_clumsy', 'arm_weak']) expect(has(got, id), id).toBe(false);
    // the watershed scenario (right ICA stenosis, low blood pressure)
    expect(sym(scenario('watershed', 24))).toContain('arm_weak_proximal(l)');
  });

  it('global hypoperfusion that fails both anterior border zones: man-in-the-barrel, legs spared', () => {
    const r = sim([], 24, { map: 50 });
    expect(sym(r)).toEqual(expect.arrayContaining(['arm_weak_proximal(r)', 'arm_weak_proximal(l)']));
    expect(labels(r)).toContain('man_in_barrel');
    expect(get(r, 'leg_weak').every((s) => s.sev <= 1)).toBe(true);
    for (const id of ['face_weak', 'hand_clumsy']) expect(has(r, id), id).toBe(false);
  });

  it('a watershed label is marked silent exactly when its hemisphere has no symptom', () => {
    // right carotid stenosis with low pressure also starves the left border zone (through the
    // anterior communicating artery): its label is shown with the right proximal arm weakness
    const r = sim([{ vessel: 'ica_cervical_r', severity: 0.95 }], 24, { map: 58 });
    for (const m of r.syndromes.filter((x) => x.def.id === 'watershed')) {
      const symptomatic = r.symptoms.some((s) => s.sources.some((src) => src.endsWith(`_${m.side}`)));
      expect(m.silent ?? false, `watershed_${m.side}`).toBe(!symptomatic);
    }
  });
});

describe('C1-F7: cortical blindness and Anton syndrome', () => {
  it('both lower banks only (bilateral lingual): bilateral upper field defects, not blindness', () => {
    const lvl = { lingual_r: 0.9, lingual_l: 0.9 };
    const got = aggregateSymptoms(lvl, lvl, 24);
    expect(has(got, 'cortical_blindness')).toBe(false);
    expect(sym(got)).toEqual(expect.arrayContaining(['quadrant_sup(r)', 'quadrant_sup(l)']));
  });

  it('both banks on both sides with the poles spared: bilateral hemianopia with central (keyhole) vision', () => {
    const lvl = { cuneus_r: 0.9, lingual_r: 0.9, cuneus_l: 0.9, lingual_l: 0.9, occipital_pole_r: 0.1, occipital_pole_l: 0.1 };
    const got = aggregateSymptoms(lvl, lvl, 24);
    expect(has(got, 'cortical_blindness')).toBe(false);
    expect(sym(got)).toEqual(expect.arrayContaining(['hemianopia(r)', 'hemianopia(l)', 'macular_sparing(-)']));
    expect(estimateNihss(got, []).items['3']).toBe(3);
  });

  it('both occipital lobes including the poles: cortical blindness, without an automatic Anton syndrome', () => {
    const r = sim(occl('pca_p2_r', 'pca_p2_l'), 24, { collateral: 'moderate' });
    expect(has(r, 'cortical_blindness')).toBe(true);
    expect(labels(r)).toContain('cortical_blindness');
    expect(SYMPTOM_BY_ID.anton).toBeUndefined();
    expect(SYMPTOM_BY_ID.cortical_blindness.desc.en).toContain('Anton');
    // poor collaterals: the calcarine cortex is lost on both sides, the poles keep their MCA
    // share: bilateral hemianopia with central vision, not total blindness
    const poor = sim(occl('pca_p2_r', 'pca_p2_l'), 24, { collateral: 'poor' });
    expect(has(poor, 'cortical_blindness')).toBe(false);
    expect(sym(poor)).toEqual(expect.arrayContaining(['hemianopia(r)', 'hemianopia(l)', 'macular_sparing(-)']));
    expect(poor.nihss.items['3']).toBe(3);
  });

  it('the cortical blindness label needs the blindness', () => {
    const lvl = { lingual_r: 0.9, lingual_l: 0.9 };
    const def = SYNDROMES.find((d) => d.id === 'cortical_blindness')!;
    expect(def.requires).toBeDefined();
    expect(has(aggregateSymptoms(lvl, lvl, 24), 'cortical_blindness')).toBe(false);
  });
});

describe('C1-F8: colour vision', () => {
  it('a one-sided lesion: a lateralised hemiachromatopsia, not a grey world', () => {
    // Paulson's pattern: lower bank and colour area of one side, the colour loss below an upper
    // quadrantanopia
    const lvl = { lingual_l: 0.9, inferior_temporal_fusiform_l: 0.9 };
    const got = aggregateSymptoms(lvl, lvl, 24);
    expect(sym(got)).toEqual(expect.arrayContaining(['quadrant_sup(r)', 'hemiachromatopsia(r)']));
    expect(has(got, 'achromatopsia')).toBe(false);
    // R1-5: not inside a half-field that is blind (both banks: a hemianopia)
    const r = sim(occl('pca_calcarine_l'), 24, { collateral: 'moderate' });
    expect(sym(r)).toContain('hemianopia(r)');
    expect(has(r, 'hemiachromatopsia')).toBe(false);
    expect(has(r, 'achromatopsia')).toBe(false);
    expect(SYMPTOM_BY_ID.hemiachromatopsia.sideWord).toBe('field');
    expect(SYMPTOM_BY_ID.hemiachromatopsia.nihss).toBeUndefined();
    expect(REDUNDANCY.hemiachromatopsia).toBeDefined();
  });

  it('MCA spill-over into the fusiform gyrus gives neither', () => {
    for (const id of ['l_m1', 'r_m1_malignant', 'l_m2_inf']) {
      const r = scenario(id, 24);
      expect(has(r, 'achromatopsia'), id).toBe(false);
      expect(has(r, 'hemiachromatopsia'), id).toBe(false);
    }
  });

  it('both sides: full achromatopsia, listed once', () => {
    const r = sim(occl('pca_p2_r', 'pca_p2_l'), 24, { collateral: 'poor' });
    expect(has(r, 'achromatopsia')).toBe(true);
    expect(has(r, 'hemiachromatopsia')).toBe(false);
  });
});

describe('C1-F9: alien hand and callosal apraxia', () => {
  it('right ACA: one alien (left) hand, from the corpus callosum, and a left-hand callosal apraxia', () => {
    const r = scenario('r_aca', 24);
    expect(get(r, 'alien_hand').map((s) => s.side)).toEqual(['l']);
    expect(sym(r)).toContain('callosal_apraxia(l)');
  });

  it('left ACA: the frontal type in the right (dominant) hand', () => {
    const r = sim(occl('aca_a2_l'), 24, { collateral: 'poor' });
    expect(get(r, 'alien_hand').map((s) => s.side)).toContain('r');
    expect(get(r, 'callosal_apraxia').map((s) => s.side)).toEqual(['l']);
  });

  it('never an alien hand without a side', () => {
    for (const id of ['r_aca', 'r_m1_malignant', 'ica_isolated', 'r_ica_t'])
      for (const tH of [24, 2160]) expect(get(scenario(id, tH), 'alien_hand').every((s) => s.side === 'r' || s.side === 'l'), id).toBe(true);
  });
});

describe('C1-F10: motor impersistence', () => {
  it('a right-hemisphere sign, not scored by the NIHSS', () => {
    expect(has(scenario('r_m1_malignant', 24), 'motor_impersistence')).toBe(true);
    expect(has(scenario('l_m1', 24), 'motor_impersistence')).toBe(false);
    const def = SYMPTOM_BY_ID.motor_impersistence;
    expect(def.system).toBe('cognition');
    expect(def.nihss).toBeUndefined();
    expect(REDUNDANCY.motor_impersistence).toBeDefined();
  });
});

describe('C1-F11: release hallucinations in the blind field', () => {
  it('after an occipital infarct, in the hemianopic field, after a latent period; not during a TIA', () => {
    expect(has(scenario('l_pca', 24), 'visual_release_hallucinations')).toBe(false);
    const later = scenario('l_pca', 720);
    expect(get(later, 'visual_release_hallucinations').map((s) => s.side)).toEqual(['r']);
    expect(sym(later)).toContain('hemianopia(r)');
    const def = SYMPTOM_BY_ID.visual_release_hallucinations;
    expect(def.system).toBe('vision');
    expect(def.nihss).toBeUndefined();
    expect(REDUNDANCY.visual_release_hallucinations).toBeDefined();
  });

  it('needs a field defect on that side', () => {
    // an infarcted pole whose field loss is part of nothing else still has its central scotoma
    const got = aggregateSymptoms({ cuneus_l: 0.9 }, { cuneus_l: 0.9 }, 720);
    expect(sym(got)).toEqual(expect.arrayContaining(['quadrant_inf(r)', 'visual_release_hallucinations(r)']));
    expect(has(aggregateSymptoms({}, {}, 720), 'visual_release_hallucinations')).toBe(false);
  });
});
