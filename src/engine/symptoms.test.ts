/**
 * Clinical picture of bilateral vs. unilateral ventral pontine damage, and the hydrocephalus
 * flag's time window. See src/anatomy/symptoms.ts and src/anatomy/regions.ts for citations.
 */
import { describe, expect, it } from 'vitest';
import { simulate, type SimInput } from './simulate';
import type { HemoInput } from './hemodynamics';

const base: HemoInput = { occlusions: [], variants: [], map: 93, collateral: 'good' };
const occl = (...ids: string[]) => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (over: Partial<SimInput>) =>
  simulate({ ...base, tH: 24, reperfusionH: null, decompression: false, ...over });
const syndromeIds = (r: ReturnType<typeof simulate>) => r.syndromes.map((s) => s.def.id + (s.side ? `_${s.side}` : ''));
const symptom = (r: ReturnType<typeof simulate>, id: string) => r.symptoms.find((s) => s.id === id);

describe('bilateral ventral pons (locked-in syndrome)', () => {
  it('basilar_mid at 24h: anarthria, severe dysphagia, abnormal breathing control, locked-in', () => {
    const r = sim({ occlusions: occl('basilar_mid') });

    // both nucleus ambiguus supply is intact here (that is medullary); the swallowing/speech
    // deficit comes from bilateral corticobulbar tract damage in the ventral pons
    const dysphagia = symptom(r, 'dysphagia');
    expect(dysphagia?.sev).toBeGreaterThanOrEqual(2);

    const anarthria = symptom(r, 'anarthria');
    expect(anarthria).toBeDefined();
    expect(anarthria?.sev).toBe(3);
    // anarthria replaces plain dysarthria in the aggregated list
    expect(symptom(r, 'dysarthria')).toBeUndefined();
    // the NIHSS dysarthria/speech item (10) tops out at 2 (anarthric / unintelligible)
    expect(r.nihss.items['10']).toBe(2);

    expect(symptom(r, 'respiratory')).toBeDefined();

    expect(syndromeIds(r)).toContain('locked_in');
  });

  it('the Foville scenario (one-sided) has none of the bilateral-only deficits', () => {
    const r = sim({ occlusions: occl('pontine_paramedian_caudal_l') });
    const ids = r.symptoms.map((s) => s.id);
    expect(ids).not.toContain('anarthria');
    expect(ids).not.toContain('respiratory');
    const dysphagia = symptom(r, 'dysphagia');
    expect(dysphagia === undefined || dysphagia.sev < 3).toBe(true);
    // the unilateral picture is unchanged: mild dysarthria only
    expect(symptom(r, 'dysarthria')?.sev).toBe(1);
    expect(syndromeIds(r)).toContain('foville_l');
    expect(syndromeIds(r)).not.toContain('locked_in');
  });
});

describe('hydrocephalus flag follows the acute event window', () => {
  it('a large cerebellar infarct without decompression: true at 72h, resolved by 2160h (90 days)', () => {
    const acute = sim({ occlusions: occl('pica_r'), collateral: 'poor', tH: 72 });
    expect(acute.hydrocephalus).toBe(true);
    const chronic = sim({ occlusions: occl('pica_r'), collateral: 'poor', tH: 2160 });
    expect(chronic.hydrocephalus).toBe(false);
    // chronic ventricular enlargement is still tracked separately by the oedema model
    expect(chronic.edema.ventricleChange).toBeGreaterThan(0);
  });
});
