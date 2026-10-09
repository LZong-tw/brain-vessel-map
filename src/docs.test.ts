import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import readmeZhRaw from '../README.md?raw';
import readmeEnRaw from '../README.en.md?raw';
import roadmapRaw from '../ROADMAP.md?raw';
import { BEDS, REGIONS, VESSELS } from './anatomy';
import { SCENARIOS } from './anatomy/scenarios';
import { SYNDROMES } from './anatomy/syndromes';
import { VARIANTS } from './anatomy/variants';
import { CEREBELLAR_MALIGNANT_ML, CEREBELLAR_SPACE_ML } from './engine/cascade';
import { LANGUAGES, LANGUAGE_NAMES } from './i18n/locales';
import type { Lang } from './anatomy/types';

// a Windows checkout (core.autocrlf) hands ?raw imports CRLF; the checks read lines
const lf = (text: string) => text.replace(/\r\n/g, '\n');
const readmeZh = lf(readmeZhRaw);
const readmeEn = lf(readmeEnRaw);
const roadmap = lf(roadmapRaw);

/**
 * The documentation quotes counts from the data. The original two languages both drifted
 * before (the roadmap still said 29 scenarios when there were 31, and the English README stopped
 * at the first version), so the numbers, the sections of the two READMEs and the local links are
 * checked here.
 */

/** files in the repository that the docs may link to (only whether they exist matters) */
const FILES = new Set(
  Object.keys(import.meta.glob(['../*.md', '../LICENSE', '../public/data/LICENSE.txt', '../docs/*'], { query: '?url', import: 'default' })).map((p) =>
    p.replace(/^\.\.\//, ''),
  ),
);

const COUNTS = {
  arteries: VESSELS.length,
  collaterals: VESSELS.filter((v) => v.group === 'collateral').length,
  regions: REGIONS.length,
  units: BEDS.length,
  syndromes: SYNDROMES.length,
  variants: VARIANTS.length,
  templates: SCENARIOS.length,
};

/** where each document states each count */
const CLAIMS: [string, string, RegExp, keyof typeof COUNTS][] = [
  ['README.md', readmeZh, /(\d+) 段動脈/g, 'arteries'],
  ['README.md', readmeZh, /其中 (\d+) 段是軟腦膜/g, 'collaterals'],
  ['README.md', readmeZh, /(\d+) 個功能腦區/g, 'regions'],
  ['README.md', readmeZh, /(\d+) 個「腦區 × 供應區」單位/g, 'units'],
  ['README.md', readmeZh, /共 (\d+) 條規則/g, 'syndromes'],
  ['README.md', readmeZh, /(\d+) 種解剖變異/g, 'variants'],
  ['README.md', readmeZh, /(\d+) 個教學範本/g, 'templates'],
  ['README.en.md', readmeEn, /(\d+) arterial segments/g, 'arteries'],
  ['README.en.md', readmeEn, /(\d+) of them are leptomeningeal/g, 'collaterals'],
  ['README.en.md', readmeEn, /(\d+) functional regions/g, 'regions'],
  ['README.en.md', readmeEn, /(\d+) "region × territory" units/g, 'units'],
  ['README.en.md', readmeEn, /(\d+) rules/g, 'syndromes'],
  ['README.en.md', readmeEn, /(\d+) anatomical variants/g, 'variants'],
  ['README.en.md', readmeEn, /(\d+) teaching templates/g, 'templates'],
  ['ROADMAP.md', roadmap, /(\d+) 段動脈/g, 'arteries'],
  ['ROADMAP.md', roadmap, /(\d+) arterial segments/g, 'arteries'],
  ['ROADMAP.md', roadmap, /(\d+) 段側枝/g, 'collaterals'],
  ['ROADMAP.md', roadmap, /(\d+) collaterals/g, 'collaterals'],
  ['ROADMAP.md', roadmap, /(\d+) 種解剖變異/g, 'variants'],
  ['ROADMAP.md', roadmap, /(\d+) anatomical variants/g, 'variants'],
  ['ROADMAP.md', roadmap, /(\d+) 條具名症候群/g, 'syndromes'],
  ['ROADMAP.md', roadmap, /(\d+) named-syndrome rules/g, 'syndromes'],
  ['ROADMAP.md', roadmap, /(\d+) 個教學範本/g, 'templates'],
  ['ROADMAP.md', roadmap, /(\d+) teaching templates/g, 'templates'],
];

const headings = (md: string, level: number) => md.split('\n').filter((l) => l.startsWith(`${'#'.repeat(level)} `));
/** rows of the first table under `## <title>` (the feature table) */
const featureRows = (md: string, title: string) => {
  const section = md.slice(md.indexOf(`\n## ${title}\n`));
  return section.split('\n').filter((l) => l.startsWith('| **'));
};
const localLinks = (md: string) =>
  [...md.matchAll(/\]\(([^)#\s]+)\)/g)].map((m) => m[1]).filter((href) => !/^[a-z]+:/.test(href));

describe('documentation', () => {
  it('reads the real files', () => {
    for (const md of [readmeZh, readmeEn, roadmap]) expect(md.length).toBeGreaterThan(1000);
  });

  it.each(CLAIMS.map(([file, md, re, key]) => [`${file} ${re.source}`, md, re, key] as const))('%s matches the data', (_name, md, re, key) => {
    const found = [...md.matchAll(re)].map((m) => Number(m[1]));
    expect(found.length, 'the statement is missing').toBeGreaterThan(0);
    for (const n of found) expect(n).toBe(COUNTS[key]);
  });

  it('the Chinese and English READMEs have the same sections and feature rows', () => {
    expect(headings(readmeEn, 2).length).toBe(headings(readmeZh, 2).length);
    expect(headings(readmeEn, 3).length).toBe(headings(readmeZh, 3).length);
    expect(featureRows(readmeEn, 'Features').length).toBe(featureRows(readmeZh, '功能').length);
    expect(featureRows(readmeZh, '功能').length).toBeGreaterThan(10);
  });

  it('each README shows the interface in its own language', () => {
    // the screenshots (the badges are images too, but not of the interface)
    const images = (md: string) => [...md.matchAll(/!\[[^\]]*\]\((docs\/[^)]+)\)/g)].map((m) => m[1]);
    expect(images(readmeZh).length).toBeGreaterThan(0);
    expect(images(readmeEn).length).toBe(images(readmeZh).length);
    for (const src of images(readmeEn)) expect(src).toMatch(/-en\.jpg$/);
    for (const src of images(readmeZh)) expect(src).not.toMatch(/-en\.jpg$/);
  });

  it('each README links to the other', () => {
    expect(readmeZh).toContain('](README.en.md)');
    expect(readmeEn).toContain('](README.md)');
  });

  it.each([
    ['README.md', readmeZh],
    ['README.en.md', readmeEn],
  ])('%s links only to files that exist', (_file, md) => {
    const links = localLinks(md);
    expect(links.length).toBeGreaterThan(0);
    for (const href of links) expect(FILES, href).toContain(href);
  });
});

const DOC_FAMILIES = ['README', 'ROADMAP', 'REFERENCES', 'MEDICAL_VALUES_AUDIT', 'THIRD_PARTY_NOTICES',
  'docs/contralateral-pressure', 'docs/deficit-grading', 'docs/ich-expansion',
  'docs/mra-communicating-shapes', 'docs/mra-distal', 'docs/public-calibration',
  'docs/slices', 'docs/terminology', 'docs/venous-hemorrhage'] as const;
const rawDocuments = import.meta.glob<string>(['../*.md', '../docs/*.md'], { eager: true, query: '?raw', import: 'default' });
const documents = Object.fromEntries(Object.entries(rawDocuments).map(([path, text]) => [path.slice(3), lf(text)]));
const docPath = (family: string, lang: Lang) => {
  if (family === 'README') return lang === 'zh-TW' ? 'README.md' : `README.${lang}.md`;
  if (family === 'ROADMAP' && (lang === 'zh-TW' || lang === 'en')) return 'ROADMAP.md';
  return lang === 'en' ? `${family}.md` : `${family}.${lang}.md`;
};
const docBody = (text: string) => text.replace(/^<!-- source-doc: .* -->\n?/gm, '')
  .replace(/^<a id="[^"]+"><\/a>\n/gm, '')
  .split('\n').filter(line => !(line.includes('[繁體中文]') && line.includes('[English]'))).join('\n').trim() + '\n';
const numbers = (text: string) => [...text.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)*|\.\d+|[¼½⅓⅔¾]/g)].map(match => match[0]).sort();
const numericProse = (text: string) => {
  let body = docBody(text);
  for (const url of urls(text)) body = body.split(url).join('');
  return numbers(body);
};
const numericDifference = (actual: string[], expected: string[]) => {
  const counts = (tokens: string[]) => tokens.reduce<Record<string, number>>((result, token) => { result[token] = (result[token] ?? 0) + 1; return result; }, {});
  const a = counts(actual), e = counts(expected);
  return [...new Set([...actual, ...expected])].sort().filter(token => a[token] !== e[token]).map(token => ({ token, expected: e[token] ?? 0, actual: a[token] ?? 0 }));
};
const codeBlocks = (text: string) => [...text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map(match => match[1].trim());
const tableRows = (text: string) => text.split('\n').filter(line => line.startsWith('|'));
const urls = (text: string) => [...new Set([
  ...[...text.matchAll(/\]\((https?:\/\/(?:[^()\s]|\([^()\s]*\))*)\)/g)].map(match => match[1]),
  ...[...text.matchAll(/<(https?:\/\/[^<>\s]+)>/g)].map(match => match[1]),
  ...[...text.matchAll(/^\[[^\]]+\]: (https?:\/\/\S+)$/gm)].map(match => match[1]),
])].sort();
const resolveDocLink = (file: string, href: string) => {
  const parts = file.split('/').slice(0, -1);
  for (const part of href.split('/')) {
    if (part === '..') parts.pop();
    else if (part && part !== '.') parts.push(part);
  }
  return parts.join('/');
};
const localizedDocuments = DOC_FAMILIES.flatMap(family => LANGUAGES.map(lang => ({ family, lang, file: docPath(family, lang) })));

describe('all supported documentation languages', () => {
  it.each(localizedDocuments)('$file covers $lang with a five-language switcher', ({ family, lang, file }) => {
    const text = documents[file];
    expect(text, `missing ${lang} documentation`).toBeDefined();
    expect(text.length).toBeGreaterThan(1000);
    const nav = text.split('\n')[0];
    for (const targetLang of LANGUAGES) {
      const target = docPath(family, targetLang).split('/').pop()!;
      expect(nav).toContain(`[${LANGUAGE_NAMES[targetLang]}](${target})`);
    }
  });

  it.each(localizedDocuments)('$file has existing local file and fragment targets', ({ file }) => {
    for (const href of localLinks(documents[file])) {
      const target = resolveDocLink(file, href);
      expect(FILES, `${file}: ${href}`).toContain(target);
    }
    for (const match of documents[file].matchAll(/\]\(([^)\s]+\.md)#([^)]*)\)/g)) {
      const target = resolveDocLink(file, match[1]);
      const text = documents[target];
      expect(text, `${file}: ${match[0]}`).toBeDefined();
      const fragment = decodeURIComponent(match[2]);
      const slug = (heading: string) => heading.toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu, '').trim().replace(/\s/g, '-');
      const ids = [...text.matchAll(/<a id="([^"]+)"><\/a>/g)].map(entry => entry[1]);
      const titles = [...text.matchAll(/^#+ (.+)$/gm)].map(entry => slug(entry[1]));
      expect([...ids, ...titles], `${file}: #${fragment}`).toContain(fragment);
    }
  });

  it.each(localizedDocuments.filter(({ file, family, lang }) => file !== `${family}.md` && !(family === 'README' && (lang === 'zh-TW' || lang === 'en'))))
    ('$file retains source citations, structure and a source revision guard', ({ family, lang, file }) => {
      const sourceFile = family === 'README' ? lang === 'zh-CN' ? 'README.md' : 'README.en.md' : `${family}.md`;
      const source = documents[sourceFile], text = documents[file];
      const hash = createHash('sha256').update(new TextEncoder().encode(docBody(source))).digest('hex');
      expect(text).toContain(`<!-- source-doc: ${sourceFile}; sha256: ${hash} -->`);
      expect(urls(text)).toEqual(urls(source));
      for (const level of [1, 2, 3]) expect(headings(text, level).length).toBe(headings(source, level).length);
      expect(tableRows(text).length).toBe(tableRows(source).length);
      if (family === 'README') {
        const blocks = codeBlocks(text), original = codeBlocks(source);
        expect(blocks.length).toBe(original.length);
        // Translate shell comments and directory descriptions, preserving executable commands and paths.
        const commands = (block: string) => block.split('\n').map(line => line.split(' #')[0].trim());
        for (const index of [0, 1]) expect(commands(blocks[index])).toEqual(commands(original[index]));
        const paths = (block: string) => block.split('\n').map(line => line.trim().split(/\s+/)[0]);
        expect(paths(blocks[2])).toEqual(paths(original[2]));
      } else expect(codeBlocks(text)).toEqual(codeBlocks(source));
      if (family.startsWith('docs/') || family === 'MEDICAL_VALUES_AUDIT') {
        expect(numericDifference(numericProse(text), numericProse(source))).toEqual([]);
        tableRows(source).forEach((row, index) => expect(numbers(tableRows(text)[index])).toEqual(numbers(row)));
      } else {
        // Bilingual roots may merge duplicated passages; every quoted numeric token must survive.
        expect(numericDifference([...new Set(numericProse(text))], [...new Set(numericProse(source))])).toEqual([]);
      }
      if (family === 'ROADMAP') expect([...text.matchAll(/^-\s*\[([ x])\]/gm)].map(match => match[1]))
        .toEqual([...source.matchAll(/^-\s*\[([ x])\]/gm)].map(match => match[1]));
      if (family === 'REFERENCES') {
        for (const match of source.matchAll(/^- ([^\[*].+? \d{4};\d+(?::[A-Za-z]?\d+(?:[–-][A-Za-z]?\d+)?)?)(?=[. (])/gm)) expect(text.includes(match[1]), `citation changed: ${match[1]}`).toBe(true);
      }
      if (family === 'MEDICAL_VALUES_AUDIT') {
        const definitions = (md: string) => [...md.matchAll(/^\[[^\]]+\]: .+$/gm)].map(match => match[0]);
        expect(definitions(text)).toEqual(definitions(source));
      }
    });
});

const limitationWords: Record<Lang, RegExp> = {
  'zh-TW': /未驗證|未經.*驗證|沒有自己的校正|存疑/,
  'zh-CN': /未验证|未经.*验证|没有自己的校正|存疑/,
  en: /unvalidated|not validated|no calibration of their own|questionable/i,
  de: /unvalidiert|nicht validiert|keine eigene Kalibrierung|fragwürdig/i,
  ja: /未検証|検証されていない|独自の校正.*ない|疑義|疑問/,
};
const rejectionWords: Record<Lang, RegExp> = {
  'zh-TW': /否決|未採用/, 'zh-CN': /否决|未采用|拒绝/,
  en: /reject|not adopted/i, de: /verworfen|abgelehnt|nicht übernommen/i, ja: /棄却|却下|採用しない|不採用/,
};
describe('technical translations retain safety and model meaning', () => {
  it.each(localizedDocuments.filter(({ family }) => ['docs/mra-distal', 'docs/mra-communicating-shapes', 'docs/public-calibration', 'docs/venous-hemorrhage', 'MEDICAL_VALUES_AUDIT'].includes(family)))
    ('$file keeps explicit unvalidated limitations', ({ file, lang }) => expect(docBody(documents[file])).toMatch(limitationWords[lang]));
  it.each(LANGUAGES)('%s keeps the rejected calibration and both unsupported timing fits', lang => {
    const text = documents[docPath('docs/public-calibration', lang)];
    expect(text).toMatch(rejectionWords[lang]);
    for (const token of ['0.097422832', '0.259092893', '0.819373662', '10.284395', '3.779299', '25.7', '18.0']) expect(text).toContain(token);
  });
  it.each(LANGUAGES)('%s keeps source masks distinct from pressure-derived lesions', lang => {
    const text = documents[docPath('docs/venous-hemorrhage', lang)];
    for (const token of ['ICP = baselineICP × 10^(observedAddedHematomaVolume / enteredPVI)', 'CPP = enteredMAP − ICP', '10.265945434570312', '2026-10-09', 'CVST']) expect(text).toContain(token);
    const meanings: Record<Lang, RegExp> = { 'zh-TW': /不是血液體積.*不是淨新增水量/, 'zh-CN': /不是血液体积.*不是净(?:新增|增加)水量/, en: /neither blood volume nor net added water/, de: /weder Blutvolumen noch netto hinzugefügtes Wasser/, ja: /血液(?:量|体積).*?(?:正味|純).*?水(?:分)?.*?ありません/ };
    expect(text.replace(/\s+/g, ' ')).toMatch(meanings[lang]);
  });
  it.each(LANGUAGES)('%s preserves conventional identifiers and regional terminology references', lang => {
    const text = documents[docPath('docs/terminology', lang)];
    for (const token of ['MCA', 'ICA', 'ACA', 'PCA', 'PICA', 'AICA', 'SCA', 'MLF', 'NIHSS', 'Sopor', '022-016']) expect(text).toContain(token);
    for (const url of ['https://www.cnterm.cn/sd/yxjk/zwh/rtjp/', 'https://www.anatomy.or.jp/file/pdf/yougo/kaibo6.pdf', 'https://www.anatomy.or.jp/file/pdf/yougo/kaibo7.pdf']) expect(text).toContain(url);
  });
});

describe('what the READMEs say about the acute course', () => {
  it('state the cerebellar thresholds the engine uses (R6-3)', () => {
    const zh = [...readmeZh.matchAll(/(\d+) mL 起要觀察|小腦梗塞 ≥ (\d+) mL 要觀察/g)].map((m) => Number(m[1] ?? m[2]));
    const en = [...readmeEn.matchAll(/watched from (\d+) mL|cerebellar infarct ≥ (\d+) mL/g)].map((m) => Number(m[1] ?? m[2]));
    expect(zh).toEqual([CEREBELLAR_SPACE_ML, CEREBELLAR_SPACE_ML]);
    expect(en).toEqual([CEREBELLAR_SPACE_ML, CEREBELLAR_SPACE_ML]);
    expect([...readmeZh.matchAll(/(\d+) mL 起可能惡性腫脹|≥ (\d+) mL 惡性腫脹可能/g)].map((m) => Number(m[1] ?? m[2]))).toEqual([CEREBELLAR_MALIGNANT_ML, CEREBELLAR_MALIGNANT_ML]);
    expect([...readmeEn.matchAll(/malignant swelling likely from (\d+) mL|≥ (\d+) mL → malignant swelling likely/g)].map((m) => Number(m[1] ?? m[2]))).toEqual([
      CEREBELLAR_MALIGNANT_ML,
      CEREBELLAR_MALIGNANT_ML,
    ]);
  });

  it('do not call a swollen cerebellum in coma usually fatal: life-threatening, with no reliable figure (R6-13)', () => {
    const deathEn = readmeEn.split('\n').find((l) => l.includes('never represents death'))!;
    const deathZh = readmeZh.split('\n').find((l) => l.includes('模型不模擬死亡'))!;
    expect(deathEn).not.toMatch(/\(or a swollen cerebellum[^)]*\) is usually fatal/);
    expect(deathEn).toMatch(/cerebell[^.;]*life-threatening/);
    expect(deathEn).toMatch(/no reliable/);
    expect(deathZh).not.toMatch(/（或小腦腫脹昏迷而未手術）通常致命/);
    expect(deathZh).toMatch(/小腦[^。；]*危及生命/);
    expect(deathZh).toMatch(/沒有可靠/);
  });

  it('the Chinese README says death is likely (很可能), not merely possible (可能), after herniation (R6-14)', () => {
    expect(readmeZh).not.toMatch(/[^很]可能死亡/);
    expect(readmeZh).toMatch(/很可能死亡/);
  });
});

describe('what the READMEs say about tissue timing (Z1)', () => {
  it('the internal capsule is lost hours after the striatum beside it, in both languages (Z1-7)', () => {
    expect(readmeEn).toMatch(/the internal capsule and corona radiata\) holds out longer: nothing is lost for about 2½ hours/);
    expect(readmeZh).toMatch(/內囊與放射冠）撐得比較久：約 2\.5 小時內不會壞死/);
    expect(roadmap).toMatch(/internal capsule and corona radiata lost hours after the striatum/);
    expect(roadmap).toMatch(/內囊與放射冠比旁邊的紋狀體晚幾小時才壞死/);
  });

  it('the cerebellum and medulla have no time course of their own, and the basilar calibration was kept as fitted (Z1-5)', () => {
    expect(readmeEn).toMatch(/The cerebellum and the parts of the medulla that no perforator feeds follow the general course[^.]*no calibration of their own/);
    expect(readmeZh).toMatch(/小腦與延髓中沒有穿通支供應的部分沿用側枝供應組織的一般時程，沒有自己的校正/);
    expect(roadmap).toMatch(/time course of the cerebellum and the medulla/);
    expect(roadmap).toMatch(/小腦與延髓的壞死時程/);
  });

  it('the strengths of the leptomeningeal anastomoses are stated as hand-set, with the branches they leave silent (Z1-15)', () => {
    expect(readmeEn).toMatch(/Each leptomeningeal anastomosis has a hand-set strength/);
    expect(readmeZh).toMatch(/每一條軟腦膜側枝的強度是手動設定的/);
  });
});

const translatedCountPatterns: Record<'zh-CN' | 'de' | 'ja', Record<keyof typeof COUNTS, RegExp>> = {
  'zh-CN': { arteries: /(\d+) 段动脉/, collaterals: /其中 (\d+) 段是软脑膜/, regions: /(\d+) 个功能脑区/, units: /(\d+) 个「脑区 × 供应区」单位/, syndromes: /共 (\d+) 条规则/, variants: /(\d+) 种解剖变异/, templates: /(\d+) 个教学范本/ },
  de: { arteries: /(\d+) Arteriensegmente/, collaterals: /davon (\d+) leptomeningeale/, regions: /(\d+) Funktionsregionen/, units: /(\d+) Einheiten/, syndromes: /insgesamt (\d+) Regeln/, variants: /(\d+) anatomische Varianten/, templates: /(\d+) Lehrvorlagen/ },
  ja: { arteries: /(\d+) 動脈区間/, collaterals: /(\d+) 区間は軟膜/, regions: /(\d+) 機能領域/, units: /(\d+)「領域 × 灌流域」単位/, syndromes: /(\d+) 規則/, variants: /(\d+) 解剖学的変異/, templates: /(\d+) 教材テンプレート/ },
};
describe('translated READMEs match live model data', () => {
  for (const lang of ['zh-CN', 'de', 'ja'] as const) {
    for (const key of Object.keys(COUNTS) as (keyof typeof COUNTS)[]) {
      it(`${lang} ${key} matches the data`, () => {
        const match = documents[docPath('README', lang)].match(translatedCountPatterns[lang][key]);
        expect(match, 'the translated count statement is missing').not.toBeNull();
        expect(Number(match![1])).toBe(COUNTS[key]);
      });
    }
  }
  it.each(LANGUAGES)('%s keeps the acute-course uncertainty and hand-set model warning', lang => {
    const text = documents[docPath('README', lang)];
    const warnings: Record<Lang, RegExp[]> = {
      'zh-TW': [/危及生命/, /沒有可靠/, /沒有自己的校正/, /手動設定/],
      'zh-CN': [/危及生命/, /没有可靠/, /没有自己的校正/, /手动设定/],
      en: [/life-threatening/, /no reliable/, /no calibration of their own/, /hand-set/],
      de: [/lebensbedrohlich/, /verlässliche.*Sterblichkeit|keine verlässlichen/, /ohne eigene Kalibrierung|keine eigene Kalibrierung/, /manuell|handgesetzt/],
      ja: [/生命を脅かす/, /信頼.*死亡|信頼.*数値|信頼.*数字/, /校正がない/, /手動/],
    };
    for (const warning of warnings[lang]) expect(warning.test(text.replace(/\s+/g, ' ')), `${lang}: missing ${warning.source}`).toBe(true);
  });
});

describe('translated legal notices remain verbatim', () => {
  it.each(LANGUAGES)('%s retains the original MNI/McGill licence text', lang => {
    const original = documents['THIRD_PARTY_NOTICES.md'].split('\n').filter(line => line.startsWith('> ') && /Copyright|Montreal Neurological|McGill|Permission|without fee|suitability|provided|loss|The authors/.test(line));
    expect(original.length).toBeGreaterThan(4);
    for (const line of original) expect(documents[docPath('THIRD_PARTY_NOTICES', lang)]).toContain(line);
  });
});
