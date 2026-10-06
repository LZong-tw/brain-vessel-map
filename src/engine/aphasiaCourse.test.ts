import { describe, expect, it } from 'vitest';
import readmeZh from '../../README.md?raw';
import readmeEn from '../../README.en.md?raw';
import { VESSELS } from '../anatomy';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SCENARIOS, SCENARIO_BY_ID } from '../anatomy/scenarios';
import { ALL_STOPS } from './testing/courseChecks';
import type { CollateralGrade } from './hemodynamics';
import { isOccludable, simulate, type SimInput, type SimResult } from './simulate';

/**
 * X3-14: the aphasia type of one lesion changes only towards a less severe form, and a fluent
 * aphasia never becomes non-fluent. In the Copenhagen aphasia study the type always changed to a
 * less severe form during the first year, and a fluent aphasia never evolved into a non-fluent one
 * (Pedersen PM et al. Cerebrovasc Dis 2004;17:35-43, PMID 14530636). A type that loses a feature
 * (non-fluent speech, poor comprehension, poor repetition) cannot gain one back later; the type is
 * read from the symptom list or, when the patient cannot be examined, from `unexaminable`.
 */
const FEATURES: Record<string, string> = {
  aphasia_global: 'NCR',
  aphasia_mixed_tc: 'NC',
  aphasia_broca: 'NR',
  aphasia_wernicke: 'CR',
  aphasia_tc_motor: 'N',
  aphasia_tc_sensory: 'C',
  aphasia_conduction: 'R',
};
const GRADES: CollateralGrade[] = ['good', 'moderate', 'poor'];
const typeOf = (r: SimResult) => [...r.symptoms, ...r.unexaminable].find((s) => FEATURES[s.id])?.id ?? null;
const aosOf = (r: SimResult) => [...r.symptoms, ...r.unexaminable].some((s) => s.id === 'apraxia_of_speech');

function checkCourse(name: string, input: Omit<SimInput, 'tH'>) {
  const runs = ALL_STOPS.map((tH) => simulate({ ...input, tH }));
  const types = runs.map(typeOf);
  const shown = types.map((t, i) => `${ALL_STOPS[i]}:${t?.replace('aphasia_', '') ?? '-'}`).join(' ');
  let seen = false;
  let allowed = 'NCR';
  for (const t of types) {
    if (!t) {
      // once the aphasia has gone, it does not come back
      if (seen) allowed = '';
      continue;
    }
    const f = FEATURES[t];
    expect([...f].every((c) => allowed.includes(c)), `${name}: ${shown}`).toBe(true);
    seen = true;
    allowed = f;
  }
  // apraxia of speech, a non-fluent motor-speech disorder, does not come back once it has gone
  const aos = runs.map(aosOf);
  const first = aos.indexOf(true);
  if (first >= 0) {
    const gone = aos.indexOf(false, first);
    expect(gone < 0 || aos.indexOf(true, gone) < 0, `${name}: apraxia of speech ${aos.map((x) => (x ? '■' : '□')).join('')}`).toBe(true);
  }
}

const base = (id: string, collateral: CollateralGrade, over: Partial<SimInput> = {}): Omit<SimInput, 'tH'> => {
  const sc = SCENARIO_BY_ID[id];
  return {
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral,
    map: sc.map ?? 93,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  };
};

describe('X3-14: the aphasia type only moves towards a less severe form', () => {
  it('the watershed at a mean pressure of 45 mmHg with good collaterals: global, then Broca, never a conduction type in between', () => {
    const input = base('watershed', 'good', { map: 45, reperfusionH: null });
    checkCourse('watershed MAP 45 good', input);
    const types = ALL_STOPS.map((tH) => typeOf(simulate({ ...input, tH })));
    expect(types.slice(0, ALL_STOPS.indexOf(72) + 1).every((t) => t === 'aphasia_global')).toBe(true);
    for (const tH of [120, 168, 336]) expect(types[ALL_STOPS.indexOf(tH)], `${tH} h`).toBe('aphasia_broca');
  });

  // only scenarios whose occlusions all start at once: a later occlusion is new damage
  const singleOnset = SCENARIOS.filter((s) => s.occlusions.every((o) => !o.fromH));
  it.each(singleOnset.map((s) => [s.id]))('%s, at every collateral grade, treated as given and untreated', (id) => {
    for (const collateral of GRADES)
      for (const reperfusionH of [...new Set([SCENARIO_BY_ID[id].reperfusionH ?? null, null])]) checkCourse(`${id} ${collateral} r${reperfusionH}`, base(id, collateral, { reperfusionH }));
  });

  it.each([45, 50, 55])('the watershed at a mean pressure of %i mmHg, at every collateral grade', (map) => {
    for (const collateral of GRADES) checkCourse(`watershed MAP ${map} ${collateral}`, base('watershed', collateral, { map, reperfusionH: null }));
  });

  const language = VESSELS.filter((v) => v.side === 'l' && ['ICA', 'MCA', 'ACA', 'PCA'].includes(v.family) && isOccludable(v.id));
  it.each(language.map((v) => [v.id]))('a single %s occlusion, at every collateral grade', (vessel) => {
    for (const collateral of GRADES)
      checkCourse(`${vessel} ${collateral}`, { occlusions: [{ vessel, severity: 1 }], variants: [], collateral, map: 93, reperfusionH: null, decompression: false });
  });

  it('the README and the global aphasia text say so, in both languages', () => {
    expect(readmeEn).toMatch(/only towards a milder type, and a fluent aphasia does not become non-fluent again/);
    expect(readmeZh).toMatch(/只往較輕的類型變、說話流暢的失語不會再變回不流暢/);
    expect(SYMPTOM_BY_ID.aphasia_global.desc.en).toMatch(/a fluent aphasia does not become non-fluent again/);
    expect(SYMPTOM_BY_ID.aphasia_global.desc.zh).toMatch(/說話流暢的失語不會再變回不流暢/);
  });
});
