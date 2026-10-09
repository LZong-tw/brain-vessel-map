import type { Lang } from '../anatomy/types';

export const LANGUAGES: readonly Lang[] = ['zh-TW', 'zh-CN', 'en', 'de', 'ja'];
export const LANGUAGE_NAMES: Record<Lang, string> = {
  'zh-TW': '繁體中文', 'zh-CN': '简体中文', en: 'English', de: 'Deutsch', ja: '日本語',
};
export const LANGUAGE_LABELS: Record<Lang, string> = {
  'zh-TW': '語言', 'zh-CN': '语言', en: 'Language', de: 'Sprache', ja: '言語',
};
export const isChinese = (lang: Lang) => lang === 'zh-TW' || lang === 'zh-CN';
export const usesLatinSpacing = (lang: Lang) => lang === 'en' || lang === 'de';

export function preferredLanguage(saved: string | null, browser: string): Lang {
  if (LANGUAGES.includes(saved as Lang)) return saved as Lang;
  const tag = browser.toLowerCase();
  if (tag === 'de' || tag.startsWith('de-')) return 'de';
  if (tag === 'ja' || tag.startsWith('ja-')) return 'ja';
  if (tag.startsWith('zh')) {
    if (tag.includes('hant')) return 'zh-TW';
    return tag.includes('hans') || /(?:^|-)cn(?:-|$)|(?:^|-)sg(?:-|$)/.test(tag) ? 'zh-CN' : 'zh-TW';
  }
  return 'en';
}
