/**
 * Thalamic findings of the clinical-detail audit, cluster C9: the paramedian territory and the
 * artery of Percheron with and without the midbrain, the four thalamic vascular syndromes, the
 * cognitive and side-dependent picture of paramedian strokes, thalamic aphasia and the posterior
 * choroidal territory. Each block names the finding it covers; the citations are next to the code
 * (regions.ts, variants.ts, symptoms.ts, syndromes.ts, redundancy.ts) and in REFERENCES.md.
 */
import { describe, expect, it } from 'vitest';
import REFERENCES_MD from '../../REFERENCES.md?raw';
import { REGION_DEFS } from '../anatomy/regions';
import { REDUNDANCY } from '../anatomy/redundancy';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SCIENTIFIC_REFERENCES } from '../anatomy/sources';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { VARIANT_BY_ID } from '../anatomy/variants';
import type { Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const base: SimInput = { occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false };
const occ = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) => simulate({ ...base, occlusions, tH, ...over });
const one = (vessel: string, tH: number, over: Partial<SimInput> = {}) => occ([{ vessel, severity: 1 }], tH, over);
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
const syn = (r: SimResult) => r.syndromes.map((m) => m.def.id + (m.side ? `_${m.side}` : ''));
const ids = (r: SimResult) => r.symptoms.map((s) => s.id);
const sym = (r: SimResult, id: string) => r.symptoms.filter((s) => s.id === id);
const desc = (id: string) => SYNDROMES.find((s) => s.id === id)!.desc;
const ref = (needle: string) => SCIENTIFIC_REFERENCES.filter((r) => r.includes(needle));
const region = (id: string) => REGION_DEFS.find((r) => r.id === id)!;
const inf = (r: SimResult, id: string) => r.regions[id]?.infarct ?? 0;
const MIDBRAIN_SIGNS = ['cn3_palsy', 'cn4_palsy', 'skew_deviation'];
const THALAMIC_LABELS = [
  'thalamic_tuberothalamic',
  'thalamic_paramedian_unilateral',
  'thalamic_posterior_choroidal',
  'thalamomesencephalic',
  'thalamomesencephalic_bilateral',
];

describe('C9-F1: the midbrain is an explicit part of the paramedian pattern, not a threshold accident', () => {
  it('one paramedian thalamic artery: thalamic infarct only, no oculomotor palsy and no Claude label', () => {
    for (const s of ['l', 'r'] as const) {
      const r = one(`thalamoperforator_${s}`, 24);
      expect(inf(r, `thalamus_paramedian_${s}`)).toBeGreaterThan(0.9);
      expect(inf(r, `midbrain_paramedian_${s}`)).toBeLessThan(0.25);
      for (const id of MIDBRAIN_SIGNS) expect(ids(r), `${s} ${id}`).not.toContain(id);
      expect(syn(r)).not.toContain(`claude_${s}`);
      expect(syn(r)).toContain(`thalamic_paramedian_unilateral_${s}`);
    }
  });

  it('with a paramedian artery that also feeds the midbrain: the same occlusion gives a thalamomesencephalic infarct', () => {
    const r = one('thalamoperforator_l', 24, { variants: ['thalamomesencephalic_l'] });
    expect(inf(r, 'midbrain_paramedian_l')).toBeGreaterThan(0.35);
    expect(sym(r, 'cn3_palsy').map((s) => s.side)).toEqual(['l']);
    expect(syn(r)).toContain('thalamomesencephalic_l');
    expect(syn(r)).not.toContain('claude_l');
    expect(syn(r)).not.toContain('thalamic_paramedian_unilateral_l');
  });

  it('Percheron (default pattern, as its summary says): both paramedian thalami, drowsiness, amnesia, vertical gaze palsy, no midbrain', () => {
    const r = scenario('percheron', 24);
    expect(inf(r, 'midbrain_paramedian_r')).toBeLessThan(0.25);
    expect(inf(r, 'midbrain_paramedian_l')).toBeLessThan(0.25);
    for (const id of MIDBRAIN_SIGNS) expect(ids(r), id).not.toContain(id);
    expect(ids(r)).toContain('amnesia');
    expect(ids(r)).toContain('vertical_gaze_palsy');
    expect(syn(r)).toEqual(['thalamic_paramedian_bilateral']);
  });

  it('Percheron with the midbrain (the commonest pattern): a second scenario with oculomotor palsies on both sides and its own label', () => {
    const sc = SCENARIO_BY_ID.percheron_midbrain;
    expect(sc).toBeDefined();
    expect(sc.variants).toEqual(['percheron_mid_r']);
    const r = scenario('percheron_midbrain', 24);
    expect(inf(r, 'midbrain_paramedian_r')).toBeGreaterThan(0.35);
    expect(inf(r, 'midbrain_paramedian_l')).toBeGreaterThan(0.35);
    expect(sym(r, 'cn3_palsy').map((s) => s.side).sort()).toEqual(['l', 'r']);
    expect(syn(r)).toEqual(['thalamomesencephalic_bilateral']);
    // the outcome is worse than without the midbrain (Arauz 2014: good outcome 25% vs 67%)
    for (const lang of ['zh', 'en'] as const) {
      expect(sc.summary[lang]).toMatch(/25%/);
      expect(sc.summary[lang]).toMatch(/67%/);
      expect(desc('thalamomesencephalic_bilateral')[lang]).toMatch(/25%/);
    }
    expect(scenario('percheron_midbrain', 4320).nihss.total).toBeGreaterThan(scenario('percheron', 4320).nihss.total);
    // the swelling of days 2–5 does not deepen the coma to unrousable (1a = 3), and by 3 months
    // the coma has given way to hypersomnia, not a disorder of consciousness (C3-F2)
    for (const tH of [48, 72, 120, 168]) expect(scenario('percheron_midbrain', tH).nihss.items['1a'], `${tH} h`).toBeLessThanOrEqual(2);
    expect(ids(scenario('percheron_midbrain', 2160))).not.toContain('disorder_of_consciousness');
  });

  it('the four imaging patterns of Lazzaro 2010 can all be built from the Percheron variants', () => {
    const run = (variants: string[]) => one('thalamoperforator_r', 24, { variants });
    const pattern = (r: SimResult) => ({
      anterior: inf(r, 'thalamus_anterior_r') > 0.5 && inf(r, 'thalamus_anterior_l') > 0.5,
      midbrain: inf(r, 'midbrain_paramedian_r') > 0.35 && inf(r, 'midbrain_paramedian_l') > 0.35,
      paramedian: inf(r, 'thalamus_paramedian_r') > 0.9 && inf(r, 'thalamus_paramedian_l') > 0.9,
    });
    expect(pattern(run(['percheron_r']))).toEqual({ anterior: false, midbrain: false, paramedian: true });
    expect(pattern(run(['percheron_mid_r']))).toEqual({ anterior: false, midbrain: true, paramedian: true });
    expect(pattern(run(['percheron_ant_r']))).toEqual({ anterior: true, midbrain: false, paramedian: true });
    expect(pattern(run(['percheron_mid_r', 'percheron_ant_r']))).toEqual({ anterior: true, midbrain: true, paramedian: true });
    for (const id of ['percheron_r', 'percheron_mid_r', 'percheron_ant_r']) {
      expect(VARIANT_BY_ID[id].prevalence.en, id).toMatch(/%/);
      expect(VARIANT_BY_ID[id].prevalence.zh, id).toMatch(/%/);
    }
    expect(VARIANT_BY_ID.percheron_r.prevalence.en).toMatch(/38%/);
    expect(VARIANT_BY_ID.percheron_mid_r.prevalence.en).toMatch(/43%/);
    expect(VARIANT_BY_ID.percheron_ant_r.prevalence.en).toMatch(/14%/);
    expect(VARIANT_BY_ID.percheron_ant_r.prevalence.en).toMatch(/5%/);
    expect(ref('Lazzaro NA')).toHaveLength(1);
  });

  it('the Percheron and thalamomesencephalic variants exclude each other both ways where their supplies clash', () => {
    const ids = ['percheron', 'percheron_mid', 'percheron_ant', 'thalamomesencephalic'].flatMap((b) => [`${b}_r`, `${b}_l`]);
    for (const a of ids)
      for (const b of VARIANT_BY_ID[a].excludes ?? []) expect(VARIANT_BY_ID[b].excludes ?? [], `${a} ↔ ${b}`).toContain(a);
    // the two add-on patterns of one trunk can be combined
    expect(VARIANT_BY_ID.percheron_mid_r.excludes).not.toContain('percheron_ant_r');
  });
});

describe('C9-F2: the four thalamic vascular syndromes', () => {
  it('tuberothalamic (anterior): its own label, with executive problems and emotional facial paresis', () => {
    for (const s of ['l', 'r'] as const) {
      const r = one(`tuberothalamic_${s}`, 24);
      expect(syn(r)).toContain(`thalamic_tuberothalamic_${s}`);
      expect(ids(r)).toContain('executive');
      expect(ids(r)).toContain('abulia');
      expect(sym(r, 'emotional_facial_paresis').map((x) => x.side)).toEqual([s === 'l' ? 'r' : 'l']);
    }
    const efp = SYMPTOM_BY_ID.emotional_facial_paresis;
    expect(efp.system).toBe('motor');
    expect(efp.lateralised).toBe(true);
    // voluntary facial movement, which the NIHSS tests, is normal
    expect(efp.nihss).toBeUndefined();
    expect(REDUNDANCY.emotional_facial_paresis).toBeDefined();
    // perseveration and apathy, not disinhibition, is the anterior pattern (Carrera & Bogousslavsky 2006)
    expect(region('thalamus_anterior').deficits.map((d) => d.s)).not.toContain('disinhibition');
  });

  it('paramedian on one side: its own label, which the bilateral label replaces', () => {
    expect(syn(one('thalamoperforator_r', 24))).toEqual(['thalamic_paramedian_unilateral_r']);
    const both = occ(
      [
        { vessel: 'thalamoperforator_r', severity: 1 },
        { vessel: 'thalamoperforator_l', severity: 1 },
      ],
      24,
    );
    expect(syn(both)).toEqual(['thalamic_paramedian_bilateral']);
  });

  it('posterior choroidal: its own label with any collaterals; a PCA cortical infarct hides it', () => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      expect(syn(one('posterior_choroidal_l', 24, { collateral })), collateral).toContain('thalamic_posterior_choroidal_l');
    expect(desc('pca').en).toBeDefined();
    expect(SYNDROMES.find((s) => s.id === 'pca')!.supersedes ?? []).toContain('thalamic_posterior_choroidal');
  });

  it('inferolateral: mild weakness of the opposite side early on (not in a sensory lacune), gone within weeks', () => {
    const acute = scenario('l_thalamic', 24);
    expect(sym(acute, 'arm_weak').map((s) => [s.side, s.sev])).toEqual([['r', 1]]);
    expect(syn(acute)).toContain('thalamic_sensory_l');
    // a pure sensory stroke has no weakness
    expect(syn(acute)).not.toContain('lacunar_pure_sensory_l');
    const later = scenario('l_thalamic', 2160);
    expect(ids(later)).not.toContain('arm_weak');
    const lacune = occ([{ vessel: 'thalamogeniculate_l', severity: 1, branch: true }], 24);
    expect(ids(lacune)).not.toContain('arm_weak');
    expect(syn(lacune)).toContain('lacunar_pure_sensory_l');
    for (const lang of ['zh', 'en'] as const) expect(desc('thalamic_sensory')[lang]).toMatch(lang === 'en' ? /weakness/ : /無力/);
  });

  it('the top-of-the-basilar label hides the single-territory thalamic labels', () => {
    for (const tH of [24, 2160]) {
      const got = syn(scenario('basilar_tip', tH));
      for (const id of THALAMIC_LABELS) expect(got.some((g) => g.startsWith(id)), `${tH} h ${id}`).toBe(false);
    }
    expect(ref('Bogousslavsky J, Regli F, Uske A')).toHaveLength(1);
  });
});

describe('C9-F3: paramedian thalamic stroke depends on the side', () => {
  it('acute: executive problems, disinhibition and mild gait ataxia on either side; language on the left, neglect on the right', () => {
    const l = one('thalamoperforator_l', 24);
    const r = one('thalamoperforator_r', 24);
    for (const x of [l, r]) for (const id of ['executive', 'disinhibition', 'ataxia_gait', 'amnesia']) expect(ids(x), id).toContain(id);
    expect(ids(l)).toContain('aphasia_thalamic');
    expect(ids(l)).not.toContain('neglect');
    expect(ids(r)).toContain('neglect');
    expect(ids(r)).not.toContain('aphasia_thalamic');
    expect(sym(l, 'executive')[0].sev).toBeGreaterThan(sym(r, 'executive')[0].sev);
  });

  it('at 6 months the right-sided stroke has largely recovered; the left-sided and the bilateral keep executive and memory deficits', () => {
    const COG = ['amnesia', 'executive', 'abulia', 'disinhibition', 'neglect'];
    const r = one('thalamoperforator_r', 4320);
    for (const id of COG) expect(ids(r), `right ${id}`).not.toContain(id);
    expect(ids(r)).not.toContain('ataxia_gait');
    const l = one('thalamoperforator_l', 4320);
    expect(ids(l)).toContain('amnesia');
    expect(ids(l)).toContain('executive');
    const both = scenario('percheron', 4320);
    expect(ids(both)).toContain('amnesia');
    expect(ids(both)).toContain('executive');
    expect(ref('Carrera E, Bogousslavsky J')).toHaveLength(1);
  });

  it('the side-dependent recovery is a property of the paramedian thalamus, not of every source of the symptom', () => {
    expect(REDUNDANCY.amnesia.bySource?.thalamus_paramedian?.r).toBeDefined();
    expect(REDUNDANCY.amnesia.bySource?.thalamus_paramedian?.l).toBeUndefined();
    // a right hippocampus is not affected by the rule
    expect(REDUNDANCY.amnesia.uni).toBe(0.5);
  });
});

describe('C9-F4: thalamic aphasia is anomic with preserved comprehension and repetition', () => {
  it('left anterior thalamus: thalamic aphasia (item 9), not transcortical sensory aphasia; no comprehension penalty; dysarthria', () => {
    const r = one('tuberothalamic_l', 24);
    expect(ids(r)).toContain('aphasia_thalamic');
    expect(ids(r)).not.toContain('aphasia_tc_sensory');
    expect(ids(r)).toContain('dysarthria');
    expect(r.nihss.items['9']).toBe(1);
    expect(r.nihss.items['1b'] ?? 0).toBe(0);
    expect(r.nihss.items['10']).toBe(1);
    const def = SYMPTOM_BY_ID.aphasia_thalamic;
    expect(def.system).toBe('language');
    expect(def.nihss?.item).toBe('9');
    expect(def.desc.en).toMatch(/repetition/);
    expect(def.desc.en).toMatch(/comprehension/);
    expect(REDUNDANCY.aphasia_thalamic).toBeDefined();
    expect(ref('Ghika-Schmid F, Bogousslavsky J')).toHaveLength(1);
  });

  it('anterior thalamus: word-finding and executive problems settle within months, memory loss and apathy stay', () => {
    const r = one('tuberothalamic_l', 4320);
    expect(ids(r)).not.toContain('aphasia_thalamic');
    expect(ids(r)).not.toContain('executive');
    expect(ids(r)).toContain('amnesia');
    expect(ids(r)).toContain('abulia');
  });

  it('the memory text says verbal after left and visuospatial after right thalamic lesions', () => {
    const a = SYMPTOM_BY_ID.amnesia.desc;
    expect(a.en).toMatch(/verbal/);
    expect(a.en).toMatch(/visuospatial/);
    expect(a.zh).toContain('語言');
    expect(a.zh).toContain('視覺空間');
  });
});

describe('C9-F5: posterior choroidal territory', () => {
  it('an occlusion infarcts part of the pulvinar and lateral geniculate body even with good collaterals', () => {
    for (const collateral of ['good', 'moderate'] as const) {
      const r = one('posterior_choroidal_l', 24, { collateral });
      expect(inf(r, 'thalamus_posterior_l'), collateral).toBeGreaterThan(0.3);
    }
  });

  it('field defect, variable sensory loss, transcortical aphasia on the left and memory problems; later a jerky dystonic hand', () => {
    const r = one('posterior_choroidal_l', 24);
    expect(sym(r, 'hemianopia').map((s) => [s.side, s.sev])).toEqual([['r', 1]]);
    expect(sym(r, 'sens_hemibody').map((s) => s.side)).toEqual(['r']);
    expect(ids(r)).toContain('aphasia_tc_sensory');
    expect(ids(r)).toContain('amnesia');
    expect(ids(r)).not.toContain('jerky_dystonic_hand');
    const late = one('posterior_choroidal_l', 2160);
    expect(sym(late, 'jerky_dystonic_hand').map((s) => [s.side, s.delayed])).toEqual([['r', true]]);
    const def = SYMPTOM_BY_ID.jerky_dystonic_hand;
    expect(def.delayed).toBe(true);
    expect(def.nihss).toBeUndefined();
    expect(def.name.en).toMatch(/^Possible/);
    expect(REDUNDANCY.jerky_dystonic_hand).toBeDefined();
    expect(ref('Neau JP, Bogousslavsky J')).toHaveLength(1);
    expect(ref('Ghika-Schmid F, Ghika J')).toHaveLength(1);
  });

  it('the region text names quadrantanopia and the rare horizontal sectoranopia', () => {
    const f = region('thalamus_posterior').func;
    expect(f.en).toMatch(/quadrantanopia/);
    expect(f.en).toMatch(/sectoranopia/);
    expect(f.zh).toContain('象限');
    expect(f.zh).toContain('扇形');
  });

  it('the AChA scenario gains neither a posterior choroidal label nor its aphasia (the AChA feeds a fifth of the posterior thalamus)', () => {
    for (const tH of [24, 72, 120, 2160]) {
      const r = scenario('l_acha', tH);
      expect(syn(r).some((s) => s.startsWith('thalamic_posterior_choroidal')), `${tH} h`).toBe(false);
      expect(ids(r), `${tH} h`).not.toContain('aphasia_tc_sensory');
    }
  });
});

describe('C9 references', () => {
  it('every new reference is in REFERENCES.md', () => {
    for (const n of ['Lazzaro NA', 'Bogousslavsky J, Regli F, Uske A', 'Carrera E, Bogousslavsky J', 'Ghika-Schmid F, Bogousslavsky J', 'Neau JP, Bogousslavsky J', 'Ghika-Schmid F, Ghika J'])
      for (const r of ref(n)) expect(REFERENCES_MD).toContain(`- ${r}`);
  });
});

describe('R4-9: the Percheron outcome figures come from a series of 15', () => {
  const texts = () => [
    SCENARIO_BY_ID.percheron_midbrain.summary,
    desc('thalamic_paramedian_bilateral'),
    desc('thalamomesencephalic_bilateral'),
  ];
  it('every text gives the series size and the counts, not bare percentages', () => {
    for (const t of texts()) {
      expect(t.en).toMatch(/15 patients/);
      expect(t.en).toMatch(/2 of 8/);
      expect(t.en).toMatch(/4 of 6/);
      expect(t.en).toMatch(/mRS ≤ 2/);
      expect(t.en).not.toMatch(/about 67% do well/);
      expect(t.en).not.toMatch(/much worse/);
      expect(t.zh).toMatch(/15 人/);
      expect(t.zh).toMatch(/8 人中 2 人/);
      expect(t.zh).toMatch(/6 人中 4 人/);
      expect(t.zh).not.toMatch(/差很多/);
    }
    expect(SCENARIO_BY_ID.percheron_midbrain.summary.en).toMatch(/small series/);
    expect(SCENARIO_BY_ID.percheron_midbrain.summary.zh).toMatch(/小系列/);
  });
  it('the reference note gives the counts too', () => {
    const a = ref('Arauz A');
    expect(a).toHaveLength(1);
    expect(a[0]).toMatch(/2 of 8.*4 of 6/);
  });
});

describe('R5-7: thalamic signs that need an awake patient, or a face that moves on command, are not listed against them', () => {
  /** items that cannot be shown or examined in a stuporous or comatose patient, or in a disorder of consciousness */
  const NEEDS_AWAKE = ['disinhibition', 'executive', 'ataxia_gait', 'aphasia_thalamic', 'emotionalism', 'emotional_facial_paresis'];
  const unaware = (r: SimResult) => sym(r, 'coma').some((s) => s.sev >= 2) || ids(r).includes('disorder_of_consciousness');
  const CASES: [string, () => SimResult[]][] = [
    ['basilar_tip', () => [24, 336, 2160, 4320].map((tH) => scenario('basilar_tip', tH))],
    ['basilar_tip good', () => [24, 336, 4320].map((tH) => scenario('basilar_tip', tH, { collateral: 'good' }))],
    ['percheron', () => [1, 24, 168].map((tH) => scenario('percheron', tH))],
    ['percheron_midbrain', () => [1, 24, 168].map((tH) => scenario('percheron_midbrain', tH))],
    ['basilar_upper', () => [24, 720, 4320].map((tH) => one('basilar_upper', tH, { collateral: 'moderate' }))],
  ];
  it.each(CASES)('%s: none of them while stuporous, comatose or in a disorder of consciousness', (_, runs) => {
    const rs = runs();
    expect(rs.some(unaware)).toBe(true);
    for (const r of rs) if (unaware(r)) for (const id of NEEDS_AWAKE) expect(ids(r), `${r.input.tH} h ${id}`).not.toContain(id);
  });

  it('emotional facial paresis is not listed on a side whose face is weak on command', () => {
    for (const r of [scenario('basilar_tip', 24), scenario('basilar_tip', 4320), scenario('fetal_pca', 24), scenario('fetal_pca', 168)])
      for (const e of sym(r, 'emotional_facial_paresis'))
        expect(r.symptoms.some((s) => (s.id === 'face_weak' || s.id === 'face_weak_peripheral') && (s.side === e.side || s.side === 'both')), `${r.input.tH} h ${e.side}`).toBe(false);
    // with the face moving on command it stays (an anterior thalamic infarct alone)
    expect(sym(one('tuberothalamic_r', 24), 'emotional_facial_paresis').map((s) => s.side)).toEqual(['l']);
  });

  it('awake patients keep them (Percheron after two weeks: hypersomnia, not coma)', () => {
    const r = scenario('percheron', 336);
    expect(ids(r)).not.toContain('coma');
    for (const id of ['executive', 'disinhibition', 'aphasia_thalamic']) expect(ids(r), id).toContain(id);
  });
});

describe('R5-8: the Percheron-with-midbrain summary does not promise deeper impairment of consciousness', () => {
  it('names the oculomotor palsies on both sides beside impaired consciousness and amnesia, and drops "deeper"', () => {
    const s = SCENARIO_BY_ID.percheron_midbrain.summary;
    expect(s.en).not.toMatch(/deeper/);
    expect(s.en).toMatch(/Besides impaired consciousness and amnesia there are oculomotor palsies on both sides/);
    expect(s.zh).not.toContain('更深的意識障礙');
    expect(s.zh).toContain('除了意識障礙與記憶障礙，還有兩側動眼神經麻痺');
    // the model agrees: the same level of consciousness with and without the midbrain
    for (const tH of [1, 24, 168]) expect(scenario('percheron_midbrain', tH).nihss.items['1a'], `${tH} h`).toBe(scenario('percheron', tH).nihss.items['1a']);
  });
});

describe('R5-9: an anterior (tuberothalamic) thalamic infarct leaves memory loss and apathy at 6 months, as its label says', () => {
  it('right and left: only amnesia and abulia at 6 months, NIHSS 0', () => {
    for (const s of ['r', 'l'] as const) {
      const r = one(`tuberothalamic_${s}`, 4320);
      expect([...ids(r)].sort(), s).toEqual(['abulia', 'amnesia']);
      expect(r.nihss.total, s).toBe(0);
    }
  });

  it('neglect, emotional facial paresis and dysarthria from the anterior thalamus recover like its other deficits', () => {
    for (const id of ['neglect', 'emotional_facial_paresis', 'dysarthria']) expect(REDUNDANCY[id].bySource?.thalamus_anterior?.any, id).toBeDefined();
    // the same symptoms from elsewhere keep their own redundancy
    expect(REDUNDANCY.neglect.uni).toBe(0.6);
    expect(REDUNDANCY.dysarthria.kind).toBe('bilateral');
  });
});

describe('R5-11: the thalamic pain texts agree that the right-sided excess may be reporting bias', () => {
  it('the Dejerine–Roussy text says "among published cases … (possibly reporting bias)"', () => {
    const d = desc('thalamic_sensory');
    expect(d.en).toMatch(/among published cases right-sided lesions are more frequent \(possibly reporting bias\)/);
    expect(d.en).not.toMatch(/more often after right-sided lesions/);
    expect(d.zh).toContain('已發表的病例中右側病灶較多（可能有報告偏差）');
    expect(d.zh).not.toContain('右側病灶比較常見');
  });
});
