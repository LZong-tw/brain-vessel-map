import { describe, expect, it } from 'vitest';
import type { SymptomItem } from '../engine/clinical';
import { improvedSince } from './recoveryFormat';

const item = (id: string, sev: 1 | 2 | 3, side: SymptomItem['side'] = null): SymptomItem => ({ id, side, sev, sources: ['x'], delayed: false });

describe('improvedSince', () => {
  it('reports a symptom that is gone as improved', () => {
    expect(improvedSince([item('hiccups', 2)], []).map((x) => [x.s.id, x.to])).toEqual([['hiccups', 0]]);
  });

  // a symptom absorbed into a larger one has not improved: the patient got worse
  it.each([
    ['central_sleep_apnoea', 'respiratory'],
    ['hypersomnia', 'coma'],
    ['somnolence', 'coma'],
    // C3-F2: from two weeks on, drowsiness is listed as persistent hypersomnia and coma after
    // extensive tegmental damage as a disorder of consciousness — neither is an improvement
    ['somnolence', 'hypersomnia'],
    ['coma', 'disorder_of_consciousness'],
  ])('%s replaced by %s is not an improvement', (from, into) => {
    expect(improvedSince([item(from, 1)], [item(into, 3)])).toEqual([]);
  });
});
