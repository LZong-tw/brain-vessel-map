import { describe, expect, it } from 'vitest';
import readmeZh from '../README.md?raw';
import readmeEn from '../README.en.md?raw';
import roadmap from '../ROADMAP.md?raw';
import { BEDS, REGIONS, VESSELS } from './anatomy';
import { SCENARIOS } from './anatomy/scenarios';
import { SYNDROMES } from './anatomy/syndromes';
import { VARIANTS } from './anatomy/variants';
import { CEREBELLAR_MALIGNANT_ML, CEREBELLAR_SPACE_ML } from './engine/cascade';

/**
 * The documentation quotes counts from the data and exists in two languages. Both drifted
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
