/**
 * The end of the course, independent of the displayed time: what the 最終 (Outcome) tab of the
 * right panel shows. Pure (no React, no store): the simulation at the timeline's last two stops
 * (3 and 6 months), the same course without treatment for comparison, the deficits that remain
 * grouped by how far other pathways have taken them over, the late course of the cascade and
 * the regions that end up infarcted. Illustrative, not a prognosis.
 */

import { REGION_BY_ID } from '../anatomy';
import { TIME_STOPS, phaseOf } from '../anatomy/timeline';
import type { CascadeEvent, FatalRisk } from '../engine/cascade';
import type { SymptomItem } from '../engine/clinical';
import { simulate, type SimInput, type SimResult } from '../engine/simulate';

export type OutcomeInput = Omit<SimInput, 'tH'>;

/** timeline index of the 3-month stop */
export const I_3M = TIME_STOPS.findIndex((s) => s.h === 2160);
/** timeline index of the 6-month stop (the last one) */
export const I_6M = TIME_STOPS.length - 1;
export const H_3M = TIME_STOPS[I_3M].h;
export const H_6M = TIME_STOPS[I_6M].h;

/**
 * The final infarct is evaluated 6 months after the last occlusion start or reopening
 * (`schedule.finalH`). A course whose last change comes later than the start of the timeline
 * has not settled by the timeline's 6-month stop. The slack keeps a TIA that reopens after five
 * minutes (finalH = 4320 h 5 min) from being called "unsettled" — nothing changes in its last
 * five minutes — while any change a day or more after onset is reported.
 */
export const UNSETTLED_SLACK_H = 24;

/**
 * Deficit groups by the share of the lost function other pathways have taken over
 * (`SymptomItem.recovery.compensated`). Every listed symptom is still noticeable (the engine
 * drops one once compensation brings it below its visibility threshold), so the groups describe
 * how much of it is left:
 *   • marked (仍明顯): < 25 % taken over, no backup at all (visual cortex, cranial-nerve nuclei),
 *     no recovery data (merged symptoms such as global aphasia) or a late consequence
 *     (spasticity, central pain) — roughly the remaining severity is most of the original;
 *   • partial (部分代償): 25 – 60 %;
 *   • largely (大致代償): ≥ 60 % — on the engine's curve only well-backed functions (e.g. one-
 *     sided face weakness, vertigo, swallowing after a one-sided lesion) get there by 6 months,
 *     and such a deficit is at most mild (severity 1).
 */
export const PARTIAL_FROM = 0.25;
export const LARGELY_FROM = 0.6;
export type DeficitGroup = 'marked' | 'partial' | 'largely';
export const DEFICIT_GROUPS: DeficitGroup[] = ['marked', 'partial', 'largely'];

export function deficitGroup(s: SymptomItem): DeficitGroup {
  const c = s.recovery?.compensated ?? 0;
  if (c >= LARGELY_FROM) return 'largely';
  if (c >= PARTIAL_FROM) return 'partial';
  return 'marked';
}

/** Symptoms by group, worst first within a group. */
export function groupDeficits(symptoms: SymptomItem[]): Record<DeficitGroup, SymptomItem[]> {
  const out: Record<DeficitGroup, SymptomItem[]> = { marked: [], partial: [], largely: [] };
  for (const s of symptoms) out[deficitGroup(s)].push(s);
  for (const g of DEFICIT_GROUPS) out[g].sort((a, b) => b.sev - a.sev || (a.recovery?.compensated ?? 0) - (b.recovery?.compensated ?? 0));
  return out;
}

/**
 * The late course starts one week after the index onset: by then the ischaemic core is final,
 * the oedema has peaked and the early complications (herniation, haemorrhagic transformation,
 * aspiration) have either happened or not; what starts later — secondary degeneration, scar,
 * spasticity, post-stroke depression, compensation — belongs to the long term.
 */
export const LATE_FROM_H = 168;

/**
 * Cascade events of the long-term course: those starting at least LATE_FROM_H after the index
 * onset, plus lasting states that began in the acute phase and are still active at the 6-month
 * stop (crossed cerebellar diaschisis, a secondary infarct from herniation). Left out:
 *   • events of the hyperacute phase (first 6 h) even when open-ended — they describe the
 *     ischaemia and its risks (e.g. "risk of locked-in syndrome" from the acute pontine
 *     dysfunction, which the cascade never closes even when early treatment leaves no deficit);
 *     what actually remains is in the 6-month deficits and syndromes;
 *   • treatment events — reperfusion is part of the case, not an outcome; the treated/untreated
 *     comparison covers it.
 */
export function lateEvents(sim: SimResult): CascadeEvent[] {
  const onset = sim.schedule.onsetH;
  return sim.cascade.events
    .filter((e) => e.kind !== 'treatment')
    .filter((e) => {
      const since = e.onsetH - onset;
      if (since >= LATE_FROM_H - 1e-6) return true;
      return phaseOf(Math.max(0, since)) !== 'hyperacute' && e.onsetH <= H_6M && H_6M < (e.endH ?? Infinity);
    })
    .sort((a, b) => a.onsetH - b.onsetH);
}

/** a region counts as infarcted at the end from this fraction */
export const FINAL_REGION_MIN = 0.05;

export interface FinalRegion {
  id: string;
  /** infarcted fraction of the region */
  infarct: number;
  /** infarcted volume (mL) */
  ml: number;
}

/** Regions infarcted at the 6-month stop, largest fraction first. */
export function finalRegions(sim: SimResult): FinalRegion[] {
  return Object.entries(sim.regions)
    .filter(([, r]) => r.infarct >= FINAL_REGION_MIN)
    .map(([id, r]) => ({ id, infarct: r.infarct, ml: r.infarct * (REGION_BY_ID[id]?.volume ?? 0) }))
    .sort((a, b) => b.infarct - a.infarct || b.ml - a.ml);
}

export interface CourseEnd {
  m3: SimResult;
  m6: SimResult;
  /** the final infarct volume (mL), evaluated at schedule.finalH */
  finalInfarct: number;
  /** deficits still present at 6 months */
  lasting: number;
  /**
   * the course usually ends in death, which the model does not represent; the 3- and 6-month
   * results then assume survival (C4-F1)
   */
  fatal: FatalRisk[];
}

export interface FinalOutcome {
  /** the case as set (with its treatment, if any) */
  course: CourseEnd;
  /** the same case without treatment; null when no treatment is set */
  untreated: CourseEnd | null;
  /** index onset (h on the simulation clock) */
  onsetH: number;
  /** when the final infarct is evaluated (h on the simulation clock) */
  finalH: number;
  /** the course has not settled by the timeline's 6-month stop (a late event) */
  unsettled: boolean;
  /** the case as set usually ends in death (course.fatal): the 3- and 6-month results assume survival */
  fatal: FatalRisk[];
  /** deficits at 3 and 6 months by group */
  deficits: { m3: Record<DeficitGroup, SymptomItem[]>; m6: Record<DeficitGroup, SymptomItem[]> };
  late: CascadeEvent[];
  regions: FinalRegion[];
}

/** The simulation of `input` at 3 and 6 months (pass them when already computed, e.g. from the series). */
export function courseEnd(input: OutcomeInput, known?: { m3?: SimResult; m6?: SimResult }): CourseEnd {
  const m3 = known?.m3 ?? simulate({ ...input, tH: H_3M });
  const m6 = known?.m6 ?? simulate({ ...input, tH: H_6M });
  return { m3, m6, finalInfarct: m6.volumes.finalInfarct, lasting: m6.symptoms.length, fatal: m6.cascade.fatalRisk };
}

/** Everything the Outcome tab shows, from one simulation input (the displayed time is ignored). */
export function finalOutcome(input: OutcomeInput, known?: { m3?: SimResult; m6?: SimResult }): FinalOutcome {
  const course = courseEnd(input, known);
  const untreated = input.reperfusionH !== null ? courseEnd({ ...input, reperfusionH: null, treatment: undefined }) : null;
  const { onsetH, finalH } = course.m6.schedule;
  return {
    course,
    untreated,
    onsetH,
    finalH,
    unsettled: finalH > H_6M + UNSETTLED_SLACK_H,
    fatal: course.fatal,
    deficits: { m3: groupDeficits(course.m3.symptoms), m6: groupDeficits(course.m6.symptoms) },
    late: lateEvents(course.m6),
    regions: finalRegions(course.m6),
  };
}
