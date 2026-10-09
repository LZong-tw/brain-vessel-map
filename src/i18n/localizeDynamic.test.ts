import { describe, expect, it } from 'vitest';
import { localizeDynamic } from '../../tools/localizeDynamic.mjs';

describe('dynamic clinical localization generation', () => {
  it('translates nested parenthesized branches rather than their assembled English', () => {
    const source = "const value = { zh: '', en: 'Prefix' + (flag ? `After ${count} h` : '') };";
    const output = localizeDynamic('fixture.ts', source);
    expect(output).toContain('contentTemplate("After ⟪0⟫ h"');
    expect(output).not.toContain('contentFragment((flag');
    expect(output).toContain("en: 'Prefix' + (flag ? `After ${count} h` : '')");
  });

  it('localizes a capitalized label as a whole', () => {
    const output = localizeDynamic('fixture.ts', "const value = { zh: '', en: `${method.en.charAt(0).toUpperCase()}${method.en.slice(1)}` };");
    expect(output).toContain("[localizedContent(method, contentLang), '']");
  });

  it('preserves hand-written callbacks when run again', () => {
    const source = "const value = withLocalized({ zh: '', en: parts.join(' '), localized: lang => translateParts(lang) });";
    expect(localizeDynamic('fixture.ts', source)).toBe(source);
  });

  it('registers generated renderers as non-enumerable metadata', () => {
    expect(localizeDynamic('fixture.ts', "const value = { zh: '', en: `${count} h` };" )).toContain('const value = withLocalized({');
  });

  it('registers existing callbacks without regenerating their hand-written expression', () => {
    const output = localizeDynamic('fixture.ts', "const value = { zh: '', en: parts.join(' '), localized: lang => translateParts(lang) };");
    expect(output).toContain('const value = withLocalized({');
    expect(output).toContain('localized: lang => translateParts(lang)');
    expect(output).not.toContain('contentFragment(parts.join');
  });

  it('retains imports used by existing callbacks when adding another callback', () => {
    const source = "import { localizedContent } from '../i18n/content';\nconst old = { zh: '', en: parts.join(' '), localized: lang => localizedContent(part, lang) };\nconst next = { zh: '', en: `${count} h` };";
    expect(localizeDynamic('fixture.ts', source)).toMatch(/import \{[^\n]*localizedContent[^\n]*\}/);
  });
});
