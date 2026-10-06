/**
 * Checks on a case's course over the time stops, shared by the invariant tests
 * (invariants.test.ts, reopening.test.ts). Test-only: nothing in the app imports this.
 */
import { expect } from 'vitest';
import { TIME_STOPS } from '../../anatomy/timeline';
import type { SimResult } from '../simulate';

/** the displayed times, in order */
export const ALL_STOPS = TIME_STOPS.map((s) => s.h);

const keyOf = (x: { id: string; side: string | null }) => `${x.id}|${x.side}`;
const unexaminableNow = (r: SimResult, key: string) => r.unexaminable.some((x) => keyOf(x) === key);
const oedema = (r: SimResult, tH: number) => r.cascade.events.some((e) => e.id === 'vasogenic_edema' && e.onsetH <= tH && tH < (e.endH ?? Infinity));
/** the level of consciousness has its own course (coma, its relabelling, drowsiness from a shift) */
const CONSCIOUSNESS = ['coma', 'somnolence', 'disorder_of_consciousness', 'hypersomnia'];
/** the symptom is listed and comes from a region with a secondary infarct (a herniation compressing an artery) */
const fromSecondary = (r: SimResult, key: string) =>
  r.symptoms.some((x) => keyOf(x) === key && x.sources.some((src) => r.regions[src]?.effect === 'secondary'));

/**
 * R6-11, X2-9: over a course sampled at ALL_STOPS (`runs`, one per stop), a symptom may go and come
 * back only for a reason the model has: a sign that cannot be examined at the patient's level of
 * consciousness is not listed then (R5-7, X1-12: the engine names it in `unexaminable`); the
 * sparing of central vision is lost while the oedema of days 1–2 weeks silences the occipital pole
 * too; or it comes back from new damage, a secondary infarct in a region it comes from. A deficit
 * that cleared when blood returned is not brought back by the swelling alone (X2-9).
 */
export function noUnexplainedReturn(name: string, runs: SimResult[]): void {
  const keys = new Set(runs.flatMap((r) => r.symptoms.filter((x) => !CONSCIOUSNESS.includes(x.id)).map(keyOf)));
  for (const key of keys) {
    const id = key.split('|')[0];
    const on = runs.map((r) => r.symptoms.some((x) => keyOf(x) === key));
    const first = on.indexOf(true);
    const last = on.lastIndexOf(true);
    for (let i = first + 1; i < last; i++) {
      if (on[i]) continue;
      const back = on.indexOf(true, i);
      const why = unexaminableNow(runs[i], key) || (id === 'macular_sparing' && oedema(runs[i], ALL_STOPS[i])) || fromSecondary(runs[back], key);
      expect(why, `${name}: ${key} is ${on.map((x) => (x ? '■' : '□')).join('')}`).toBe(true);
    }
  }
}
