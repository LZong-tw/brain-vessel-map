import { describe, expect, it } from 'vitest';
import { regionAffectedPct } from './regionLabel';

describe('regionAffectedPct', () => {
  it('shows no badge for an effect-only region (e.g. Wallerian degeneration, diaschisis)', () => {
    expect(regionAffectedPct({ dys: 0, infarct: 0, effect: 'degeneration' })).toBeNull();
    expect(regionAffectedPct({ dys: 0, infarct: 0, effect: 'diaschisis' })).toBeNull();
  });

  it('shows "0%" for a region with genuinely zero involvement and no effect', () => {
    expect(regionAffectedPct({ dys: 0, infarct: 0, effect: null })).toBe('0%');
  });

  it('shows "<1%" instead of rounding a tiny non-zero share down to "0%"', () => {
    expect(regionAffectedPct({ dys: 0.003, infarct: 0, effect: null })).toBe('<1%');
    expect(regionAffectedPct({ dys: 0, infarct: 0.004, effect: 'compressed' })).toBe('<1%');
  });

  it('rounds an ordinary share to the nearest percent', () => {
    expect(regionAffectedPct({ dys: 0.42, infarct: 0, effect: null })).toBe('42%');
    expect(regionAffectedPct({ dys: 0.2, infarct: 0.35, effect: 'secondary' })).toBe('35%');
  });

  it('uses the larger of dys/infarct', () => {
    expect(regionAffectedPct({ dys: 0.1, infarct: 0.6, effect: null })).toBe('60%');
  });
});
