import type { ContentTranslations } from './content';

export const INLINE_TRANSLATIONS = {
  Right: { 'zh-CN': '右', de: 'Rechts', ja: '右' },
  Left: { 'zh-CN': '左', de: 'Links', ja: '左' },
  right: { 'zh-CN': '右', de: 'rechts', ja: '右' },
  left: { 'zh-CN': '左', de: 'links', ja: '左' },
  s: { 'zh-CN': '', de: '', ja: '' },
  S: { 'zh-CN': '', de: '', ja: '' },
  '': { 'zh-CN': '', de: '', ja: '' },
} satisfies ContentTranslations;
