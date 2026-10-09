import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { inventory } from '../../tools/localizationInventory.mjs';
import { CONTENT_TRANSLATIONS } from './contentCatalog';
import { contentFragment, contentList, contentTemplate, localizedContent, withLocalized } from './content';
import { VESSEL_BY_ID, vesselName } from '../anatomy';
import { formatHours } from '../anatomy/timeline';
import { formatClock } from '../ui/scheduleFormat';
import { UI } from './ui';

const authored = inventory(fileURLToPath(new URL('../', import.meta.url)));
const locales = ['zh-CN', 'de', 'ja'] as const;
const holes = (text: string) => [...text.matchAll(/⟪\d+⟫/g)].map((m) => m[0]).sort();

describe('authored content translation coverage', () => {
  for (const lang of locales) {
    it(`${lang}: every authored anatomy, clinical and diagram key is translated`, () => {
      for (const { key, file, line } of authored) {
        const translated = CONTENT_TRANSLATIONS[key]?.[lang];
        expect.soft(translated, `${file}:${line}: ${lang}: ${key}`).toBeDefined();
        if (translated === undefined) continue;
        if (key.trim() && key !== 's' && key !== 'S') expect.soft(translated.trim(), `${file}:${line}: ${lang}`).not.toBe('');
        expect.soft(holes(translated), `${file}:${line}: ${lang} interpolation positions`).toEqual(holes(key));
        if (key.length > 100) expect.soft(translated, `${file}:${line}: ${lang} prose must not fall back to English`).not.toBe(key);
      }
    });
    it(`${lang}: retains conventional anatomical and clinical abbreviations`, () => {
      const identifiers = ['MCA', 'ICA', 'ACA', 'PCA', 'PICA', 'AICA', 'SCA', 'MLF', 'NIHSS', 'eTICI', 'mTICI'];
      for (const [key, translated] of Object.entries(CONTENT_TRANSLATIONS)) {
        for (const identifier of identifiers) {
          if (new RegExp(`\\b${identifier}s?\\b`).test(key)) expect.soft(translated[lang], `${lang}: ${identifier} in ${key}`).toContain(identifier);
        }
      }
    });
  }

  it('rejects missing translations rather than silently falling back', () => {
    expect(() => localizedContent({ zh: '測試', en: 'unregistered text' }, 'de')).toThrow('Missing de');
    expect(() => contentFragment('unregistered fragment', 'ja')).toThrow('Missing ja');
    expect(localizedContent({ zh: '', en: '' }, 'zh-CN')).toBe('');
  });

  it('keeps dynamic renderers out of localized string value equality and serialization', () => {
    const make = () => withLocalized({ zh: '數值 12', en: 'Value 12', localized: (lang: 'zh-CN' | 'de' | 'ja') => ({ 'zh-CN': '数值 12', de: 'Wert 12', ja: '値 12' })[lang] });
    const value = make();
    expect(value).toEqual(make());
    expect(value).toEqual({ zh: '數值 12', en: 'Value 12' });
    expect(Object.keys(value)).toEqual(['zh', 'en']);
    expect(JSON.stringify(value)).toBe('{"zh":"數值 12","en":"Value 12"}');
    expect(localizedContent(value, 'de')).toBe('Wert 12');
  });

  it('keeps numbers and units intact and fills the exact translated template positions', () => {
    expect(contentFragment('12.5', 'ja')).toBe('12.5');
    expect(contentFragment('~32 mL', 'de')).toBe('~32 mL');
    expect(contentTemplate('⟪0⟫ min', ['15'], 'de')).toBe('15 min');
    expect(() => contentTemplate('⟪0⟫ min', [], 'de')).toThrow('Missing interpolation');
  });

  it('preserves every conventional eTICI grade in each added language', () => {
    for (const lang of locales) {
      for (const grade of ['0', '1', '2a', '2b50', '2b67', '2c', '3']) expect(contentFragment(grade, lang)).toBe(grade);
    }
    expect(() => contentFragment('2unknown', 'ja')).toThrow('Missing ja');
  });

  it('uses standard regional vessel terminology without changing conventional abbreviations', () => {
    const key = VESSEL_BY_ID.mca_m1_r.name.en;
    expect(CONTENT_TRANSLATIONS[key]['zh-CN']).toContain('大脑中动脉');
    expect(CONTENT_TRANSLATIONS[key].de).toContain('cerebri media');
    expect(CONTENT_TRANSLATIONS[key].ja).toContain('中大脳動脈');
    for (const lang of locales) expect(vesselName(VESSEL_BY_ID.mca_m1_r, lang)).toContain('M1');
  });

  it('distinguishes neurological stupor from coma using the documented regional terms', () => {
    expect(UI['zh-CN'].midlineShiftNote).toContain('6 mm 起昏睡、8 mm 起昏迷');
    expect(UI.de.midlineShiftNote).toContain('Sopor bei 6 mm und Koma bei 8 mm');
    expect(UI.ja.midlineShiftNote).toContain('6 mm から昏迷、8 mm から昏睡');
  });

  it('translates every combination of affected deep structures individually', () => {
    const structures = [
      { zh: '殼核', en: 'putamen' }, { zh: '尾狀核', en: 'caudate' },
      { zh: '蒼白球', en: 'globus pallidus' }, { zh: '內囊', en: 'internal capsule' },
    ];
    for (const lang of locales) {
      for (let mask = 1; mask < 16; mask++) {
        const selected = structures.filter((_, index) => mask & (1 << index));
        expect(contentList(selected, lang)).toBe(selected.map((value) => localizedContent(value, lang)).join(lang === 'de' ? ', ' : '、'));
      }
    }
    expect(contentList(structures.slice(0, 2), 'zh-CN')).toBe('壳核、尾状核');
    expect(contentList(structures.slice(0, 2), 'ja')).toBe('被殻、尾状核');
  });

  it('formats time and laterality for all added languages', () => {
    expect(formatHours(168, 'de')).toBe('7 Tage');
    expect(formatHours(168, 'ja')).toBe('7 日');
    expect(formatHours(168, 'zh-CN')).toBe('7 天');
    expect(formatClock(78, 'de')).toBe('3 Tage 6 h');
    expect(formatClock(78, 'ja')).toBe('3 日 6 時間');
    expect(formatClock(78, 'zh-CN')).toBe('3 天 6 小时');
    expect(vesselName(VESSEL_BY_ID.mca_m1_r, 'de')).toMatch(/^Rechts: /);
    expect(vesselName(VESSEL_BY_ID.mca_m1_r, 'ja')).toMatch(/^右/);
  });
});
