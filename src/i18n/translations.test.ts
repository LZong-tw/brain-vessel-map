import { describe, expect, it } from 'vitest';
import type { Lang } from '../anatomy/types';
import { UI } from './ui';
import { CASE_UI } from './uiCase';
import { CELL_DETAIL_UI } from './uiCellDetail';
import { EDEMA_UI } from './uiEdema';
import { OUTCOME_UI } from './uiOutcome';
import { RECOVERY_UI } from './uiRecovery';
import { RISKS_UI } from './uiRisks';
import { SCHEDULE_UI } from './uiSchedule';
import { STACK_UI } from './uiStack';
import { TREATMENT_UI } from './uiTreatment';

const catalogs = { UI, CASE_UI, CELL_DETAIL_UI, EDEMA_UI, OUTCOME_UI, RECOVERY_UI, RISKS_UI, SCHEDULE_UI, STACK_UI, TREATMENT_UI };
const added = ['zh-CN', 'de', 'ja'] as const;
function leaves(value: unknown, prefix = ''): Record<string, unknown> {
  if (value && typeof value === 'object') return Object.assign({}, ...Object.entries(value).map(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key)));
  return { [prefix]: value };
}
const neutral = (text: string) => !/[\p{L}]/u.test(text) || /^(?:[A-Z\d²+\-/ ]+|mL(?:\/min)?|mmHg|mm|kg|mg|h|min|%|eTICI|mTICI|NIHSS|ABCD²)$/.test(text);

describe('complete new UI locales', () => {
  for (const [name, catalog] of Object.entries(catalogs)) {
    const locales = catalog as unknown as Record<Lang, unknown>;
    const english = leaves(locales.en);
    for (const lang of added) {
      const translated = leaves(locales[lang]);
      it(`${name}: ${lang} translates every key`, () => {
        expect(Object.keys(translated).sort()).toEqual(Object.keys(english).sort());
        for (const [key, original] of Object.entries(english)) {
          const value = translated[key];
          expect(typeof value, `${name}.${lang}.${key}`).toBe(typeof original);
          if (typeof original === 'function') expect(value, `${name}.${lang}.${key} must provide a localized formatter`).not.toBe(original);
          if (typeof original === 'string') {
            expect(typeof value === 'string').toBe(true);
            if (original.trim()) expect((value as string).trim(), `${name}.${lang}.${key}`).not.toBe('');
            const sharedGermanWord = lang === 'de' && ['Details', 'blind', 'Sagittal', 'Axial', 'normal', 'Normal', 'Perfusion', 'Penumbra', '11 Neglect', 'A Arm'].includes(original);
            if (!neutral(original) && !sharedGermanWord) expect.soft(value, `${name}.${lang}.${key} must not fall back to English`).not.toBe(original);
            for (const identifier of ['MCA', 'ICA', 'ACA', 'PCA', 'PICA', 'AICA', 'SCA', 'MLF', 'NIHSS', 'eTICI', 'mTICI']) {
              if (new RegExp(`\\b${identifier}s?\\b`).test(original)) expect.soft(value, `${name}.${lang}.${key} retains ${identifier}`).toContain(identifier);
            }
          }
        }
      });
    }
  }
});
