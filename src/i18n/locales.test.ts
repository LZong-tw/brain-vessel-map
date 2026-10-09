import { describe, expect, it } from 'vitest';
import { LANGUAGES, preferredLanguage } from './locales';

describe('language preference', () => {
  it.each(LANGUAGES)('restores the explicit %s preference', (lang) => {
    expect(preferredLanguage(lang, 'en-US')).toBe(lang);
  });
  it.each([
    ['zh-CN', 'zh-CN'], ['zh-SG', 'zh-CN'], ['zh-Hans', 'zh-CN'],
    ['zh-TW', 'zh-TW'], ['zh-Hant-HK', 'zh-TW'], ['zh-Hant-CN', 'zh-TW'], ['zh', 'zh-TW'],
    ['de-AT', 'de'], ['ja-JP', 'ja'], ['fr-FR', 'en'],
  ])('recognizes browser locale %s', (browser, lang) => {
    expect(preferredLanguage(null, browser)).toBe(lang);
    expect(preferredLanguage('unsupported', browser)).toBe(lang);
  });
});
