import { describe, expect, it } from 'vitest';
import { tr } from '../anatomy';
import { SCENARIOS, SCENARIO_BY_ID, type Scenario } from '../anatomy/scenarios';
import { REPERFUSION_STOPS, TIME_STOPS } from '../anatomy/timeline';
import type { L } from '../anatomy/types';
import { VARIANTS } from '../anatomy/variants';
import { simulate, type SimInput } from '../engine/simulate';
import { DEFAULT_TREATMENT, downstreamBranches, REPERFUSION_GRADES, type TreatmentOptions } from '../engine/treatment';
import { contentTemplate } from './content';
import { ENGINE_TRANSLATIONS } from './engineTranslations';

const locales = ['zh-CN', 'de', 'ja'] as const;
const neutral = (text: string) => !/[\p{L}]/u.test(text) || /^(?:[A-Z\d²+\-/ ]+|mL(?:\/min)?|mmHg|mm|h|min|%)$/.test(text);

function inputOf(scenario: Scenario, overrides: Partial<SimInput> = {}): SimInput {
  return {
    occlusions: scenario.occlusions,
    variants: scenario.variants ?? [],
    collateral: scenario.collateral ?? 'good',
    map: scenario.map ?? 93,
    tH: scenario.tH ?? TIME_STOPS[0].h,
    reperfusionH: scenario.reperfusionH ?? null,
    decompression: scenario.decompression ?? false,
    ...overrides,
  };
}

function localizedLeaves(value: unknown, path = '', seen = new Set<object>()): [string, L][] {
  if (!value || typeof value !== 'object' || seen.has(value)) return [];
  seen.add(value);
  const record = value as Record<string, unknown>;
  if (typeof record.zh === 'string' && typeof record.en === 'string') return [[path, value as L]];
  return Object.entries(record).flatMap(([key, child]) => localizedLeaves(child, path ? `${path}.${key}` : key, seen));
}

function translationErrors(value: unknown, label: string): string[] {
  const errors: string[] = [];
  const leaves = localizedLeaves(value);
  expect(leaves.length, `${label}: exercise localized runtime output`).toBeGreaterThan(0);
  for (const [path, original] of leaves) {
    for (const lang of locales) {
      const context = `${label} ${path} ${lang}`;
      try {
        const rendered = tr(original, lang);
        if (original.en.trim() && !rendered.trim()) errors.push(`${context}: empty translation`);
        if (/⟪\d+⟫|\bundefined\b|\[object Object\]/.test(rendered)) errors.push(`${context}: unresolved interpolation: ${rendered}`);
        if (original.en.split(/\s+/).length > 3 && !neutral(original.en) && rendered === original.en) errors.push(`${context}: unchanged English prose`);
      } catch (error) {
        errors.push(`${context}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  return errors;
}

function verifyCourse(input: SimInput, label: string, hours = TIME_STOPS.map((stop) => stop.h)): void {
  const errors = new Set<string>();
  for (const tH of hours) {
    // The engine is language independent: simulate once, then render that result in all three locales.
    const result = simulate({ ...input, tH });
    for (const error of translationErrors(result, `${label} ${tH} h`)) errors.add(error);
  }
  expect([...errors].slice(0, 6), `${label}: ${errors.size} locale errors`).toEqual([]);
}

describe('localized clinical output across the existing scenario courses', () => {
  it.each(SCENARIOS.map((scenario) => [scenario.id, scenario] as const))('%s: every timeline stop in all three locales', (id, scenario) => {
    expect(translationErrors({ title: scenario.title, summary: scenario.summary }, id)).toEqual([]);
    verifyCourse(inputOf(scenario), id);
  }, 30_000);

  it.each(VARIANTS.map((variant) => [variant.id, variant] as const))('%s: variant anatomy and its clinical course', (id, variant) => {
    expect(translationErrors(variant, id)).toEqual([]);
    verifyCourse(inputOf(SCENARIO_BY_ID.l_m1, { variants: [id] }), id);
  }, 30_000);
});

describe('localized treatment branches', () => {
  const treatedScenario = SCENARIO_BY_ID.l_m1_thrombectomy;
  const methods = ['evt', 'ivt', 'bridging'] as const;

  for (const method of methods) {
    it.each(REPERFUSION_GRADES)('%s reperfusion grade with ' + method, (grade) => {
      const treatment: TreatmentOptions = { ...DEFAULT_TREATMENT, method, grade };
      verifyCourse(inputOf(treatedScenario, { treatment }), `${method} eTICI ${grade}`);
    }, 30_000);

    it.each(REPERFUSION_STOPS)('%s h reperfusion with ' + method, (reperfusionH) => {
      verifyCourse(inputOf(treatedScenario, { reperfusionH, treatment: { ...DEFAULT_TREATMENT, method } }), `${method} ${reperfusionH} h`);
    }, 30_000);
  }

  it.each(downstreamBranches(treatedScenario.occlusions[0].vessel))('%s distal embolus', (distalEmbolus) => {
    verifyCourse(inputOf(treatedScenario, { treatment: { ...DEFAULT_TREATMENT, distalEmbolus } }), distalEmbolus);
  }, 30_000);

  // Existing treatment.test.ts fixtures exercise reocclusion, no-reflow and new-territory emboli.
  const complications: [string, Partial<TreatmentOptions>][] = [
    ['reocclusion', { reocclusionAfterH: 1 }],
    ['no-reflow', { noReflow: 0.15 }],
    ['new-territory embolus', { distalEmbolus: 'aca_a2_l' }],
    ['combined bridging complications', { method: 'bridging', grade: '2b50', reocclusionAfterH: 12, distalEmbolus: 'mca_angular_l', noReflow: 0.15 }],
  ];
  it.each(complications)('%s', (label, complication) => {
    verifyCourse(inputOf(treatedScenario, { treatment: { ...DEFAULT_TREATMENT, ...complication } }), label);
  }, 30_000);
});

describe('Chinese clinical interpolation meanings', () => {
  const cases = [
    {
      prefix: '≈ ⟪0⟫ mL⟪1⟫ in the end',
      values: ['FINAL_VOLUME', 'VOLUME_QUALIFIER'],
      expected: ['最终约 FINAL_VOLUME mLVOLUME_QUALIFIER'],
    },
    {
      prefix: '; with the secondary infarcts from the herniation',
      values: ['FINAL_VOLUME', 'VOLUME_QUALIFIER', 'END_NOTE'],
      expected: ['最终约 FINAL_VOLUME mLVOLUME_QUALIFIEREND_NOTE'],
    },
    {
      prefix: 'The swollen cerebellum presses directly',
      values: ['START_HOURS', 'END_HOURS', 'ONSET_REFERENCE', 'ALERT_HOURS'],
      expected: ['ONSET_REFERENCE后 START_HOURS–END_HOURS 小时', 'ALERT_HOURS 小时后清醒'],
    },
    {
      prefix: 'Swelling of the cerebellum has brought',
      values: ['COMA_END_HOURS', 'ONSET_REFERENCE'],
      expected: ['ONSET_REFERENCE后 COMA_END_HOURS 小时'],
    },
    {
      prefix: '⟪0⟫⟪1⟫ ⟪2⟫ (eTICI ⟪3⟫',
      values: ['OPENING', 'METHOD', 'ACTION', 'GRADE', 'GRADE_DESCRIPTION', 'PERFUSION_RESULT'],
      expected: ['OPENINGMETHOD ACTION', 'eTICI GRADE', 'GRADE_DESCRIPTION', 'PERFUSION_RESULT'],
    },
    {
      prefix: 'IV thrombolysis (alteplase or tenecteplase): not standard here.',
      values: ['ELAPSED_DAYS', 'DAY_SUFFIX'],
      expected: ['ELAPSED_DAYS 天DAY_SUFFIX'],
    },
    {
      prefix: 'The medial temporal lobe slides',
      values: ['NERVE_SIDE', 'PUPIL_SIDE', 'ARTERY_SIDE', 'RECOVERY_DESCRIPTION'],
      expected: ['NERVE_SIDE动眼神经', 'PUPIL_SIDE瞳孔', 'ARTERY_SIDE PCA', 'RECOVERY_DESCRIPTION'],
    },
    {
      prefix: '⟪0⟫⟪1⟫PICA and SCA infarcts',
      values: ['VOLUME_DESCRIPTION', 'OTHER_INFARCT_NOTE', 'TIMING_NOTE', 'TREATMENT_NOTE', 'OUTCOME_NOTE'],
      expected: ['VOLUME_DESCRIPTIONOTHER_INFARCT_NOTEPICA', 'TIMING_NOTETREATMENT_NOTEOUTCOME_NOTE'],
    },
    {
      prefix: '⟪0⟫ Here ⟪1⟫ up ⟪2⟫infarcted',
      values: ['PRIOR_DESCRIPTION', 'HEMISPHERES', 'EXTENT', 'EVENT_REFERENCE'],
      expected: ['PRIOR_DESCRIPTION这里HEMISPHERES最终EXTENT梗死', 'EVENT_REFERENCE'],
    },
  ];
  it.each(cases)('$prefix', ({ prefix, values, expected }) => {
    const keys = Object.keys(ENGINE_TRANSLATIONS).filter((key) => key.startsWith(prefix));
    expect(keys).toHaveLength(1);
    const rendered = contentTemplate(keys[0], values, 'zh-CN');
    for (const fragment of expected) expect(rendered).toContain(fragment);
  });
});
