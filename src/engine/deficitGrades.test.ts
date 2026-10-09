import { describe, expect, it } from 'vitest';
import { continuousSeverity, deficitOrdinalMotorPoints } from './deficitGrades';

describe('continuous deficit model projection', () => {
  const motor = [1, 3, 4] as const;

  it('retains the existing anchors and the minimum score of a listed positive deficit', () => {
    for (const pts of [motor, [1, 2, 3] as const]) {
      for (let severity = 0; severity <= 3; severity++) {
        expect(deficitOrdinalMotorPoints({ sev: 1, continuousSeverity: severity }, pts)).toBe(severity === 0 ? 0 : pts[severity - 1]);
      }
    }
    expect(deficitOrdinalMotorPoints({ sev: 1, continuousSeverity: 1.5 }, motor)).toBe(2);
    expect(deficitOrdinalMotorPoints({ sev: 1, continuousSeverity: 1e-8 }, motor)).toBe(1);
    expect(deficitOrdinalMotorPoints({ sev: 3, continuousSeverity: 3 - 1e-8 }, motor)).toBe(4);
    expect(deficitOrdinalMotorPoints({ sev: 3, continuousSeverity: 3 }, motor)).toBe(4);
  });

  it('clamps continuous bounds and falls back safely for nonfinite values', () => {
    expect(continuousSeverity({ sev: 2, continuousSeverity: -1 })).toBe(0);
    expect(continuousSeverity({ sev: 2, continuousSeverity: 4 })).toBe(3);
    for (const value of [NaN, Infinity, -Infinity]) {
      expect(continuousSeverity({ sev: 2, continuousSeverity: value })).toBe(2);
      expect(deficitOrdinalMotorPoints({ sev: 2, continuousSeverity: value }, motor)).toBe(3);
      expect(continuousSeverity({ sev: value })).toBe(0);
      expect(deficitOrdinalMotorPoints({ sev: value }, motor)).toBe(0);
    }
  });

  it('preserves legacy ordinal scores without a continuous value', () => {
    for (const pts of [motor, [1, 2, 3] as const]) {
      for (const sev of [1, 2, 3]) expect(deficitOrdinalMotorPoints({ sev }, pts)).toBe(pts[sev - 1]);
    }
  });

  it('is monotonic and bounded on a dense grid', () => {
    for (const pts of [motor, [1, 2, 3] as const]) {
      let previous = 0;
      for (let step = 0; step <= 3000; step++) {
        const score = deficitOrdinalMotorPoints({ sev: 3, continuousSeverity: step / 1000 }, pts);
        expect(Number.isInteger(score)).toBe(true);
        expect(score).toBeGreaterThanOrEqual(previous);
        expect(score).toBeLessThanOrEqual(4);
        previous = score;
      }
    }
  });

  it('preserves small continuous differences independently of ordinal boundaries', () => {
    const before = { sev: 2, continuousSeverity: 2.499 };
    const after = { sev: 3, continuousSeverity: 2.501 };
    expect(deficitOrdinalMotorPoints(before, motor)).toBe(3);
    expect(deficitOrdinalMotorPoints(after, motor)).toBe(4);
    expect(continuousSeverity(after) - continuousSeverity(before)).toBeCloseTo(0.002);
    for (const severity of [1.499, 1.501]) expect(deficitOrdinalMotorPoints({ sev: Math.round(severity), continuousSeverity: severity }, motor)).toBe(2);
  });
});
