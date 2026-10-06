/**
 * The review of the hemispheric (cortex) and NIHSS audit fixes (group R1): a mute global aphasia
 * scored as the scale says, a compensated global aphasia that changes type, the man-in-the-barrel
 * signs, release hallucinations listed as possible, no colour loss inside a blind field, a
 * parietal field cut that does not hang on the penumbra, left-hemisphere neglect that clears, the
 * PCA vessel texts, the pure-alexia label and the hemiachromatopsia text. Each block names the
 * review entry it answers.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS, SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { TIME_STOPS } from '../anatomy/timeline';
import { VESSEL_BY_ID } from '../anatomy';
import { aggregateSymptoms, estimateNihss, symptomQuery, type SymptomItem } from './clinical';
import type { CollateralGrade, Occlusion } from './hemodynamics';
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
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'good', map: 93, tH, reperfusionH: null, decompression: false, ...over });
const sym = (r: SimResult) => r.symptoms.map((s) => `${s.id}(${s.side ?? '-'})`);
const get = (r: SimResult, id: string) => r.symptoms.filter((s) => s.id === id);
const labels = (r: SimResult) => r.syndromes.map((m) => m.def.id + (m.side ? `_${m.side}` : ''));
const aphasias = (r: SimResult) => r.symptoms.filter((s) => s.id.startsWith('aphasia_'));
const GRADES: CollateralGrade[] = ['good', 'moderate', 'poor'];
const STOPS = TIME_STOPS.map((s) => s.h);
const items = (...list: Pick<SymptomItem, 'id' | 'side' | 'sev'>[]) =>
  estimateNihss(list.map((s) => ({ ...s, sources: [], delayed: false }))).items;

describe('R1-1: a score of 3 on item 9 is a mute patient who follows no command', () => {
  // NIHSS instructions (Torab-Miandoab et al. 2020, Appendix 3): item 9 "a score of 3 should be
  // used only if the patient is mute and follows no one-step commands"; item 10 "2 = … is
  // mute/anarthric"; item 1c "2 = performs neither task correctly"
  it('the item rules: 9 = 3 gives 1c = 2 and 10 = 2', () => {
    const got = items({ id: 'aphasia_global', side: null, sev: 2 }, { id: 'dysarthria', side: null, sev: 1 });
    expect(got).toMatchObject({ '9': 3, '1b': 2, '1c': 2, '10': 2 });
    // a severe aphasia that is not mute (9 = 2) keeps the commands it follows
    expect(items({ id: 'aphasia_wernicke', side: null, sev: 2 })).toMatchObject({ '9': 2, '1b': 2, '1c': 1 });
  });

  it('the left M1 template and every large left MCA/ICA occlusion: never 9 = 3 with 1c or 10 below 2', () => {
    const runs: [string, SimResult][] = [];
    for (const tH of [1, 24, 72, 336, 720]) runs.push([`l_m1@${tH}`, scenario('l_m1', tH)]);
    runs.push(['l_m1_thrombectomy@1', scenario('l_m1_thrombectomy', 1)]);
    for (const v of ['mca_m1_l', 'ica_terminal_l']) for (const c of GRADES) for (const tH of [24, 720]) runs.push([`${v} ${c}@${tH}`, sim(occl(v), tH, { collateral: c })]);
    let mute = 0;
    for (const [name, r] of runs) {
      if (r.nihss.items['9'] !== 3) continue;
      mute++;
      expect(r.nihss.items['1c'], `${name} 1c`).toBe(2);
      expect(r.nihss.items['10'], `${name} 10`).toBe(2);
    }
    expect(mute).toBeGreaterThan(10);
    // Z1-15: 24 (was 23): with the motor strip no longer the best-collateralised part of the
    // territory, the right arm is plegic at 24 h (5r: 3 → 4)
    expect(scenario('l_m1', 24).nihss.total).toBe(24);
  });
});

describe('R1-2: a global aphasia that has become mild changes type', () => {
  it('never listed as a mild (severity 1) global aphasia, in any template or large left occlusion', () => {
    for (const s of SCENARIOS)
      for (const tH of [24, 720, 2160, 4320]) {
        const g = get(scenario(s.id, tH), 'aphasia_global');
        expect(g.every((x) => x.sev >= 2), `${s.id} ${tH} h`).toBe(true);
      }
    for (const v of ['mca_m1_l', 'ica_terminal_l'])
      for (const c of GRADES)
        for (const tH of [2160, 4320]) {
          const r = sim(occl(v), tH, { collateral: c });
          expect(get(r, 'aphasia_global'), `${v} ${c} ${tH} h`).toEqual([]);
          // still one (milder) aphasia type, not none
          expect(aphasias(r), `${v} ${c} ${tH} h`).toHaveLength(1);
        }
  });

  it('left M1 at 3 and 6 months: the dominant remaining component sets the type (global → Wernicke, Copenhagen aphasia study)', () => {
    for (const tH of [2160, 4320]) {
      const r = scenario('l_m1', tH);
      expect(aphasias(r).map((s) => `${s.id}${s.sev}`), `${tH} h`).toEqual(['aphasia_wernicke1']);
      // a mild Wernicke aphasia: item 9 = 1, the questions 1, the commands followed
      expect(r.nihss.items['9'], `${tH} h`).toBe(1);
      expect(r.nihss.items['1b'], `${tH} h`).toBe(1);
      expect(r.nihss.items['1c'] ?? 0, `${tH} h`).toBe(0);
      // a fluent type: apraxia of speech is not listed with it (C1-F1)
      expect(sym(r), `${tH} h`).not.toContain('apraxia_of_speech(-)');
    }
    // one month: still a (moderate) global aphasia
    expect(aphasias(scenario('l_m1', 720)).map((s) => `${s.id}${s.sev}`)).toEqual(['aphasia_global2']);
  });
});

describe('R1-3: man-in-the-barrel needs, and scores, real weakness of both shoulders', () => {
  it('proximal arm weakness is graded on item 5 like the arm it is: moderate = some effort against gravity, severe = none', () => {
    expect(items({ id: 'arm_weak_proximal', side: 'l', sev: 1 })['5l']).toBe(1);
    expect(items({ id: 'arm_weak_proximal', side: 'l', sev: 2 })['5l']).toBe(2);
    expect(items({ id: 'arm_weak_proximal', side: 'l', sev: 3 })['5l']).toBe(3);
  });

  it('wherever man-in-the-barrel is named, both arms score at least 2 (not drift)', () => {
    let named = 0;
    for (const map of [40, 45, 50, 55])
      for (const c of GRADES)
        for (const tH of STOPS) {
          const r = sim([], tH, { map, collateral: c });
          if (!labels(r).includes('man_in_barrel')) continue;
          named++;
          expect(r.nihss.items['5r'] ?? 0, `MAP ${map} ${c} ${tH} h`).toBeGreaterThanOrEqual(2);
          expect(r.nihss.items['5l'] ?? 0, `MAP ${map} ${c} ${tH} h`).toBeGreaterThanOrEqual(2);
        }
    expect(named).toBeGreaterThan(0);
    // the global hypoperfusion of the cortex test: named, with both arms at 2
    const r = sim([], 24, { map: 50 });
    expect(labels(r)).toContain('man_in_barrel');
    expect(r.nihss.items).toMatchObject({ '5r': 2, '5l': 2 });
  });

  it('a drift of both arms alone is not named man-in-the-barrel', () => {
    const def = SYNDROMES.find((d) => d.id === 'man_in_barrel')!;
    const drift: SymptomItem[] = (['r', 'l'] as const).map((side) => ({ id: 'arm_weak_proximal', side, sev: 1, sources: [], delayed: false }));
    expect(def.requires!(symptomQuery(drift), 'r')).toBe(false);
    expect(def.requires!(symptomQuery(drift.map((s) => ({ ...s, sev: 2 as const }))), 'r')).toBe(true);
  });

  it('the text does not promise paralysis and a poor prognosis for every case; it says where the poor outcome was seen', () => {
    const def = SYNDROMES.find((d) => d.id === 'man_in_barrel')!;
    expect(def.desc.en).not.toMatch(/prognosis is usually poor/);
    expect(def.desc.en).not.toMatch(/upper arms are paralysed/);
    expect(def.desc.en).toMatch(/1 of 11/);
    expect(def.desc.zh).not.toContain('預後通常很差');
    expect(def.desc.zh).toContain('11 人中只有 1 人');
  });

  it('the watershed template: a moderate proximal weakness scores 2, not drift', () => {
    const r = scenario('watershed', 24);
    expect(get(r, 'arm_weak_proximal').map((s) => `${s.side}${s.sev}`)).toEqual(['l2']);
    expect(r.nihss.items['5l']).toBe(2);
  });
});

describe('R1-4: release hallucinations are listed as possible, not predicted', () => {
  it('named and described as possible, like central post-stroke pain', () => {
    const def = SYMPTOM_BY_ID.visual_release_hallucinations;
    expect(def.name.en).toMatch(/^Possible: /);
    expect(def.name.zh).toMatch(/^可能出現：/);
    expect(def.desc.en).toContain('It is listed as possible, not predicted.');
    expect(def.desc.zh).toContain('這裡列出的是「可能」，不是預測。');
    // the figure behind "possible": about one in eight to ten patients
    expect(def.desc.en).toMatch(/16 of 120/);
    expect(def.desc.zh).toContain('120 人中 16 人');
  });
});

describe('R1-5: no colour loss inside a field that is completely blind', () => {
  const blindColour = (r: SimResult) => {
    const bad: string[] = [];
    const blind = r.symptoms.some((s) => s.id === 'cortical_blindness');
    for (const s of r.symptoms) {
      if (s.id === 'achromatopsia' && blind) bad.push('achromatopsia with cortical blindness');
      if (s.id === 'hemiachromatopsia' && (blind || r.symptoms.some((h) => h.id === 'hemianopia' && h.side === s.side)))
        bad.push(`hemiachromatopsia(${s.side}) in a blind half-field`);
    }
    return bad;
  };

  it('every template at every time', () => {
    for (const s of SCENARIOS) for (const tH of [1, 24, 72, 336, 2160, 4320]) expect(blindColour(scenario(s.id, tH)), `${s.id} ${tH} h`).toEqual([]);
  });

  it('one-sided and two-sided PCA occlusions at every collateral grade', () => {
    const cases: Occlusion[][] = [occl('pca_p2_l'), occl('pca_p2_r'), occl('pca_calcarine_l'), occl('pca_calcarine_r'), occl('pca_p2_r', 'pca_p2_l'), occl('pca_calcarine_r', 'pca_calcarine_l')];
    for (const o of cases) for (const c of GRADES) for (const tH of [24, 2160]) expect(blindColour(sim(o, tH, { collateral: c })), `${o.map((x) => x.vessel).join('+')} ${c} ${tH} h`).toEqual([]);
  });

  it('the colour loss of Paulson’s pattern (below an upper quadrantanopia) is still listed', () => {
    // the lower bank and the colour area of one side, in an awake patient (the top-of-the-basilar
    // template has this pattern only while comatose or in a disorder of consciousness, where colour
    // vision cannot be tested: crossChain.test.ts)
    const lvl = { lingual_l: 0.9, inferior_temporal_fusiform_l: 0.9 };
    const got = aggregateSymptoms(lvl, lvl, 2160).map((s) => `${s.id}(${s.side ?? '-'})`);
    expect(got).toEqual(expect.arrayContaining(['quadrant_sup(r)', 'hemiachromatopsia(r)']));
  });
});

describe('R1-6: the parietal field cut of an MCA infarct does not depend on the penumbra', () => {
  it('left M1: the right hemianopia stays from day 3 to 6 months (no reperfusion, the deficit is infarct)', () => {
    for (const tH of [72, 336, 2160, 4320]) {
      const r = scenario('l_m1', tH);
      expect(sym(r), `${tH} h`).toContain('hemianopia(r)');
      expect(r.nihss.items['3'], `${tH} h`).toBe(2);
    }
  });

  it('the inferior division: the same field defect on either side, at 3 days and 3 months', () => {
    for (const tH of [72, 2160]) {
      expect(sym(sim(occl('mca_m2_inf_l'), tH)), `left ${tH} h`).toContain('hemianopia(r)');
      expect(sym(sim(occl('mca_m2_inf_r'), tH)), `right ${tH} h`).toContain('hemianopia(l)');
      expect(sym(scenario('l_m2_inf', tH)), `l_m2_inf ${tH} h`).toContain('hemianopia(r)');
    }
  });

  // Y1-12: the rescued tissue regains its function over the first day or two, not at the instant
  // of reopening (a mild upper quadrantanopia is still listed at 24 h)
  it('a field cut whose tissue is saved recovers: thrombectomy at 2 h leaves none once it works again', () => {
    for (const tH of [48, 168, 2160]) {
      const r = scenario('l_m1_thrombectomy', tH);
      expect(r.symptoms.filter((s) => ['hemianopia', 'quadrant_sup', 'quadrant_inf'].includes(s.id)), `${tH} h`).toEqual([]);
    }
  });
});

describe('R1-7: right-sided neglect after a left-hemisphere stroke clears within weeks', () => {
  it('left superior division: listed early, gone by 3 and 6 months (NIHSS 11 = 0)', () => {
    expect(get(scenario('l_m2_sup', 24), 'neglect').map((s) => s.side)).toEqual(['r']);
    for (const tH of [2160, 4320]) {
      const r = scenario('l_m2_sup', tH);
      expect(get(r, 'neglect'), `${tH} h`).toEqual([]);
      expect(r.nihss.items['11'] ?? 0, `${tH} h`).toBe(0);
    }
  });

  it('left parietal branch occlusions: no right neglect at 3 months; right-hemisphere neglect still can persist', () => {
    for (const v of ['mca_angular_l', 'mca_ant_parietal_l']) expect(get(sim(occl(v), 2160, { collateral: 'poor' }), 'neglect'), v).toEqual([]);
    expect(get(scenario('r_m1_malignant', 2160), 'neglect').map((s) => s.side)).toEqual(['l']);
  });
});

describe('R1-8: the PCA vessel texts do not promise a lasting hemianopia for every occlusion', () => {
  it('P2 and calcarine: "often", in both languages', () => {
    const p2 = VESSEL_BY_ID.pca_p2_l.desc;
    const calc = VESSEL_BY_ID.pca_calcarine_l.desc;
    expect(p2.en).toContain('Untreated occlusion often leaves a contralateral homonymous hemianopia');
    expect(calc.en).toContain('occlusion often gives a contralateral homonymous hemianopia');
    expect(p2.zh).toContain('未治療的阻塞常造成對側同側偏盲');
    expect(calc.zh).toContain('阻塞常造成對側同側偏盲');
  });
});

describe('R1-9: "alexia without agraphia" is named only without agraphia', () => {
  it('a left PCA infarct that also takes the angular gyrus: alexia with agraphia, not pure alexia', () => {
    for (const v of ['mca_angular_l', 'mca_m2_inf_l'])
      for (const tH of [24, 2160]) {
        const r = sim(occl('pca_p2_l', v), tH, { collateral: 'poor' });
        expect(sym(r), `${v} ${tH} h`).toContain('agraphia(-)');
        expect(labels(r), `${v} ${tH} h`).not.toContain('alexia_without_agraphia_l');
      }
  });

  it('the left P2 alone with poor collaterals keeps the label, with its alexia', () => {
    const r = sim(occl('pca_p2_l'), 24, { collateral: 'poor' });
    expect(sym(r)).toContain('alexia(-)');
    expect(labels(r)).toContain('alexia_without_agraphia_l');
    expect(SYNDROMES.find((d) => d.id === 'alexia_without_agraphia')!.requires).toBeDefined();
  });
});

describe('R1-10: the hemiachromatopsia text does not draw a proportion from two patients', () => {
  it('"may not notice it", found by testing each part of the field', () => {
    const d = SYMPTOM_BY_ID.hemiachromatopsia.desc;
    expect(d.en).not.toMatch(/Most patients/);
    expect(d.en).toContain('Patients may not notice it');
    expect(d.en).toContain('neither of the two patients in one case report was aware of it');
    expect(d.zh).not.toContain('病人多半');
    expect(d.zh).toContain('病人可能自己沒有察覺');
  });
});
