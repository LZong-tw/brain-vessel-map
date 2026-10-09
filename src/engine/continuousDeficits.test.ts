import { describe, expect, it } from 'vitest';
import { estimateNihss, lesionSymptoms, symptomNihssPoints, type SymptomItem } from './clinical';
import { simulate } from './simulate';

const arm = (severity: number, source = 'fixture'): SymptomItem => ({
  id: 'arm_weak', side: 'r', sev: Math.max(1, Math.min(3, Math.round(severity))) as 1 | 2 | 3,
  continuousSeverity: severity, sources: [source], delayed: false,
});

describe('continuous deficits and separate ordinal grades', () => {
  it('retains the strongest continuous source even within one ordinal category', () => {
    const symptoms = lesionSymptoms({}, {}, 0, [arm(2.01, 'weaker'), arm(2.49, 'stronger')]);
    const symptom = symptoms.find((s) => s.id === 'arm_weak')!;
    expect(symptom.sev).toBe(2);
    expect(symptom.continuousSeverity).toBe(2.49);
    expect(symptom.sources).toEqual(['weaker', 'stronger']);
  });

  it('keeps the dominant partial deficit recovery when its magnitude is merged into a broader deficit', () => {
    const partialRegion = { medial_frontal_l: 0.8 };
    const wholeRegion = { thalamus_ventrolateral_l: 0.3 };
    const age = 72;
    const partial = lesionSymptoms(partialRegion, partialRegion, age).find((s) => s.id === 'arm_weak_proximal')!;
    const whole = lesionSymptoms(wholeRegion, wholeRegion, age).find((s) => s.id === 'arm_weak')!;
    const regions = { ...partialRegion, ...wholeRegion };
    const merged = lesionSymptoms(regions, regions, age).find((s) => s.id === 'arm_weak')!;
    expect(partial.sev).toBe(whole.sev);
    expect(partial.continuousSeverity).toBeGreaterThan(whole.continuousSeverity!);
    expect(partial.recovery).toBeDefined();
    expect(partial.recovery).not.toEqual(whole.recovery);
    expect(merged.continuousSeverity).toBe(partial.continuousSeverity);
    expect(merged.recovery).toEqual(partial.recovery);
    expect(merged.sources).toContain('medial_frontal_l');
    expect(merged.sources).toContain('thalamus_ventrolateral_l');
    expect(lesionSymptoms(regions, regions, age).some((s) => s.id === 'arm_weak_proximal')).toBe(false);
  });

  it('uses the intermediate established motor grade instead of skipping from 1 to 3', () => {
    for (const severity of [1.499, 1.501]) {
      const symptoms = lesionSymptoms({}, {}, 0, [arm(severity)]);
      expect(symptomNihssPoints(symptoms[0])).toBe(2);
      expect(estimateNihss(symptoms).items['5r']).toBe(2);
      expect(symptoms[0].continuousSeverity).toBe(severity);
    }
  });

  it('retains continuous severity when a both-sided deficit merges into one-sided records', () => {
    const both = { ...arm(2.49), side: 'both' as const };
    const symptoms = lesionSymptoms({}, {}, 0, [both, arm(2.01)]);
    expect(symptoms.filter((s) => s.id === 'arm_weak')).toHaveLength(2);
    for (const symptom of symptoms) expect(symptom.continuousSeverity).toBe(2.49);
  });

  it('keeps a tiny simulated treatment difference separate from whole NIHSS grades', () => {
    const input = { occlusions: [{ vessel: 'basilar_mid', severity: 1 }], variants: [], map: 93, collateral: 'poor' as const, tH: 2160, reperfusionH: null };
    const untreated = simulate(input);
    const treated = simulate({ ...input, reperfusionH: 12 });
    const before = untreated.symptoms.find((s) => s.id === 'arm_weak' && s.side === 'r')!;
    const after = treated.symptoms.find((s) => s.id === 'arm_weak' && s.side === 'r')!;
    expect(before.continuousSeverity).toBeGreaterThan(after.continuousSeverity!);
    expect(before.continuousSeverity! - after.continuousSeverity!).toBeLessThan(1);
    expect(before.deadContinuousSeverity).toBeDefined();
    expect(Number.isInteger(untreated.nihss.total)).toBe(true);
    expect(Number.isInteger(treated.nihss.total)).toBe(true);
    expect(treated.cascade.events.find((e) => e.id === 'reperfusion')!.severity).toBe('info');
  });
});
