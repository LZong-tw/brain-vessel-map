import { describe, expect, it } from 'vitest';
import { SCENARIO_BY_ID, SCENARIOS } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import { NEEDS_AWAKE, type SymptomItem } from '../engine/clinical';
import { simulate, type SimResult } from '../engine/simulate';
import { improvedSince, unexaminableHeading } from './recoveryFormat';

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
    // Y2-13: both frontal eye fields
    ['gaze_deviation', 'gaze_paresis_bilateral'],
  ])('%s replaced by %s is not an improvement', (from, into) => {
    expect(improvedSince([item(from, 1)], [item(into, 3)])).toEqual([]);
  });

  // one aphasia type at a time (C1-F1): a global aphasia that has become a Broca aphasia has not
  // "gone"; one that has left no aphasia behind has
  it('an aphasia that changes type is not listed as gone', () => {
    expect(improvedSince([item('aphasia_global', 2)], [item('aphasia_broca', 1)])).toEqual([]);
    expect(improvedSince([item('aphasia_global', 2)], []).map((x) => [x.s.id, x.to])).toEqual([['aphasia_global', 0]]);
  });
});

// X1-2: a sign that cannot be examined at the patient's level of consciousness is left out of the
// list (R5-7, X1-12); that is not an improvement — the patient has got worse
describe('improvedSince and signs that cannot be examined now', () => {
  it('does not report as gone a sign that the engine says cannot be examined now', () => {
    const before = [item('executive', 2), item('alexia', 2)];
    const now = [item('coma', 3)];
    expect(improvedSince(before, now, [item('executive', 2), item('alexia', 2)])).toEqual([]);
    // one that has really gone still counts
    expect(improvedSince(before, now, [item('alexia', 2)]).map((x) => [x.s.id, x.to])).toEqual([['executive', 0]]);
  });

  /** stuporous or comatose (coma at least 2), or in a disorder of consciousness */
  const unaware = (r: SimResult) => r.symptoms.some((s) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness');
  it.each(SCENARIOS.map((s) => [s.id]))('%s: no awake-only sign is "better" or "gone" when the patient falls into stupor or coma', (id) => {
    const sc = SCENARIO_BY_ID[id];
    for (const collateral of ['good', 'moderate', 'poor'] as const) {
      const runs = TIME_STOPS.map((st) =>
        simulate({
          occlusions: sc.occlusions,
          variants: sc.variants ?? [],
          collateral,
          map: sc.map ?? 93,
          tH: st.h,
          reperfusionH: sc.reperfusionH ?? null,
          decompression: sc.decompression ?? false,
        }),
      );
      for (let i = 1; i < runs.length; i++) {
        const now = runs[i];
        for (const x of improvedSince(runs[i - 1].symptoms, now.symptoms, now.unexaminable)) {
          const where = `${id} ${collateral} ${TIME_STOPS[i].h} h: ${x.s.id} ${x.from}→${x.to}`;
          expect(NEEDS_AWAKE.includes(x.s.id) && unaware(now), where).toBe(false);
          expect(now.unexaminable.some((u) => u.id === x.s.id && u.side === x.s.side), where).toBe(false);
        }
      }
    }
  });
});

// Y2-14, Y2-15: the heading of what cannot be examined names the reason
describe('unexaminableHeading', () => {
  const why = (w?: SymptomItem['why']) => ({ ...item('prosopagnosia', 2), why: w });
  it('one reason: its own heading, no tag', () => {
    expect(unexaminableHeading([why('blind')], 'en').label).toBe('Cannot be tested: the patient cannot see');
    expect(unexaminableHeading([why('akinetic')], 'zh-TW').label).toBe('無動性緘默，目前無法檢查');
    // the level of consciousness when no reason is given (X1)
    const c = unexaminableHeading([why()], 'en');
    expect(c.label).toBe('Cannot be examined at this level of consciousness');
    expect(c.tag(why())).toBe('');
  });
  it('several reasons: a general heading, every reason explained, and a tag on each sign', () => {
    const h = unexaminableHeading([why('blind'), why('consciousness')], 'en');
    expect(h.label).toBe('Cannot be examined now');
    expect(h.title).toMatch(/blind: .*reduced consciousness: /);
    expect(h.tag(why('blind'))).toBe('blind');
    const zh = unexaminableHeading([why('blind'), why('akinetic')], 'zh-TW');
    expect(zh.label).toBe('目前無法檢查');
    expect(zh.tag(why('akinetic'))).toBe('無動性緘默');
  });
});

describe('improvedSince: a deficit of both sides now listed per side has not gone (Y2-17)', () => {
  it('arm weakness of both sides, then of each side', () => {
    expect(improvedSince([item('arm_weak', 2, 'both')], [item('arm_weak', 3, 'r'), item('arm_weak', 2, 'l')])).toEqual([]);
  });
});
