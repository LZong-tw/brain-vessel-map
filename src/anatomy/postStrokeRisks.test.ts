import { describe, expect, it } from 'vitest';
import { POST_STROKE_RISKS } from './postStrokeRisks';
import { SCIENTIFIC_REFERENCES } from './sources';
import type { L } from './types';
import { RISK_GROUP_ORDER } from '../ui/postStrokeRisks';
import REFERENCES_MDRaw from '../../REFERENCES.md?raw';

// a Windows checkout (core.autocrlf) hands ?raw imports CRLF; the checks read lines
const lf = (text: string) => text.replace(/\r\n/g, '\n');
const REFERENCES_MD = lf(REFERENCES_MDRaw);

const filled = (l: L) => l.zh.trim().length > 0 && l.en.trim().length > 0;

describe('POST_STROKE_RISKS', () => {
  it('is not empty and the ids are unique', () => {
    expect(POST_STROKE_RISKS.length).toBeGreaterThanOrEqual(5);
    const ids = POST_STROKE_RISKS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(POST_STROKE_RISKS.map((r) => [r.id, r] as const))('%s has zh/en text, a valid figure and a known system', (_, r) => {
    for (const l of [r.name, r.desc, r.window, r.factors]) expect(filled(l)).toBe(true);
    // Chinese text is Chinese, English text is English
    for (const l of [r.name, r.desc, r.window, r.factors]) {
      expect(l.zh).toMatch(/[一-鿿]/);
      expect(l.en).not.toMatch(/[一-鿿]/);
    }
    const { value, low, high } = r.prevalence;
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(1);
    // a confidence interval comes in pairs and contains the estimate
    expect(low === undefined).toBe(high === undefined);
    if (low !== undefined && high !== undefined) {
      expect(low).toBeGreaterThan(0);
      expect(high).toBeLessThanOrEqual(1);
      expect(low).toBeLessThanOrEqual(value);
      expect(value).toBeLessThanOrEqual(high);
    }
    expect(RISK_GROUP_ORDER).toContain(r.system);
    expect(r.typicalOnsetH).toBeGreaterThanOrEqual(0);
  });

  it('every risk cites at least one source, each listed in SCIENTIFIC_REFERENCES exactly', () => {
    for (const r of POST_STROKE_RISKS) {
      expect(r.sources.length, r.id).toBeGreaterThan(0);
      for (const s of r.sources) expect(SCIENTIFIC_REFERENCES, `${r.id}: ${s}`).toContain(s);
    }
  });

  it('every source is also a bullet under its heading in REFERENCES.md', () => {
    const start = REFERENCES_MD.indexOf('### 中風後常見、但與病灶部位關聯有限的問題');
    expect(start).toBeGreaterThan(0);
    const end = REFERENCES_MD.indexOf('\n#', start + 4);
    const section = REFERENCES_MD.slice(start, end < 0 ? undefined : end);
    for (const s of new Set(POST_STROKE_RISKS.flatMap((r) => r.sources))) expect(section).toContain(`- ${s}\n`);
  });

  it('keeps the lesion-site evidence honest for depression (Carson 2000: no site effect)', () => {
    const dep = POST_STROKE_RISKS.find((r) => r.id === 'depression')!;
    expect(dep.sources.some((s) => s.startsWith('Carson AJ'))).toBe(true);
    expect(dep.factors.en).toMatch(/no support/);
  });
});
