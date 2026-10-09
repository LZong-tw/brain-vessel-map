import type { L, Lang } from '../anatomy/types';
import { CONTENT_TRANSLATIONS } from './contentCatalog';

export type AdditionalLang = Exclude<Lang, 'zh-TW' | 'en'>;
export type ContentTranslations = Record<string, Record<AdditionalLang, string>>;

/** Renderers are metadata: localized strings retain their original value/JSON shape. */
export function withLocalized<T extends L>(value: T): T {
  if (value.localized) Object.defineProperty(value, 'localized', { value: value.localized, enumerable: false });
  return value;
}

export function contentText(key: string, lang: AdditionalLang): string {
  const value = CONTENT_TRANSLATIONS[key]?.[lang];
  if (value === undefined) throw new Error(`Missing ${lang} content translation: ${key}`);
  return value;
}

export function localizedContent(value: L, lang: Lang): string {
  if (value.en === '' && value.zh === '') return '';
  if (lang === 'en') return value.en;
  if (lang === 'zh-TW') return value.zh;
  return value.localized ? value.localized(lang) : contentText(value.en, lang);
}

export function contentList(values: readonly L[], lang: AdditionalLang): string {
  return values.map((value) => localizedContent(value, lang)).join(lang === 'de' ? ', ' : '、');
}

/** Interpolations have already been localized; only their positions are rearranged here. */
export function contentTemplate(key: string, values: readonly string[], lang: AdditionalLang): string {
  return contentText(key, lang).replace(/⟪(\d+)⟫/g, (_, n: string) => {
    if (values[Number(n)] === undefined) throw new Error(`Missing interpolation ${n}: ${key}`);
    return values[Number(n)];
  });
}

/** For numbers, units, sides and generated vessel labels used inside legacy clinical prose. */
export function contentFragment(value: string | number, lang: AdditionalLang): string {
  const text = String(value);
  if (!text || /^[\d\s.,%≈~+−–—/<>():;-]+$/.test(text)) return text;
  if (/^(?:0|1|2a|2b50|2b67|2c|3)$/.test(text)) return text;
  if (/^[\d\s.,≈~+−–—/<>-]+(?:mL|mm|h|min|%|mmHg)$/.test(text)) return text;
  if (CONTENT_TRANSLATIONS[text]) return contentText(text, lang);
  const firstUpper = text.charAt(0).toUpperCase() + text.slice(1);
  if (CONTENT_TRANSLATIONS[firstUpper]) return contentText(firstUpper, lang);
  const side = /^(Right|Left|right|left) (.+)$/.exec(text);
  if (side) {
    const label = contentFragment(side[2], lang);
    const prefix = lang === 'de' ? (side[1].toLowerCase() === 'right' ? 'Rechts: ' : 'Links: ') : side[1].toLowerCase() === 'right' ? '右' : '左';
    return prefix + label;
  }
  throw new Error(`Missing ${lang} interpolation translation: ${text}`);
}

export function inlineText(lang: Lang, zh: string, en: string, cn: string, de: string, ja: string): string {
  return { 'zh-TW': zh, en, 'zh-CN': cn, de, ja }[lang];
}
