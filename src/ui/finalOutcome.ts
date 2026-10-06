/**
 * The end of the course, independent of the displayed time: what the 最終 (Outcome) tab of the
 * right panel shows. Pure (no React, no store): the simulation at the timeline's last two stops
 * (3 and 6 months), the same course without treatment for comparison, the deficits that remain
 * grouped by how far other pathways have taken them over, the late course of the cascade and
 * the regions that end up infarcted. Illustrative, not a prognosis.
 */

import { REGION_BY_ID } from '../anatomy';
import { TIME_STOPS, phaseOf } from '../anatomy/timeline';
import { SYMPTOM_BY_ID, isQualifier } from '../anatomy/symptoms';
import type { CascadeEvent, FatalRisk, SurvivalCaveat } from '../engine/cascade';
import type { SymptomItem } from '../engine/clinical';
import { simulate, type SimInput, type SimResult } from '../engine/simulate';
import { fmtMl, pctShare } from './format';

export type OutcomeInput = Omit<SimInput, 'tH'>;

/** timeline index of the 3-month stop */
export const I_3M = TIME_STOPS.findIndex((s) => s.h === 2160);
/** timeline index of the 6-month stop (the last one) */
export const I_6M = TIME_STOPS.length - 1;
export const H_3M = TIME_STOPS[I_3M].h;
export const H_6M = TIME_STOPS[I_6M].h;

/**
 * The final infarct is evaluated 6 months after the last occlusion start or reopening
 * (`schedule.finalH`), so a course whose last change comes later than the start of the timeline is
 * evaluated that long after the timeline's 6-month stop. It is called unsettled only when what the
 * Outcome shows still changes in between (changesAfter, V3-13: the stuttering basilar template was
 * told "evaluated at 6 months: at 6 months the course has not fully settled" with its infarct fixed
 * since the first week and nothing else changing in its last 3 days). Otherwise the Outcome states
 * the offset, from this much on: a TIA that reopens after five minutes (finalH = 4320 h 5 min) needs
 * no note.
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

/**
 * Symptoms by group, worst first within a group; not a finding that only describes another deficit
 * (macular sparing: isQualifier, V2-9), which the Outcome names with the deficit it describes.
 */
export function groupDeficits(symptoms: SymptomItem[]): Record<DeficitGroup, SymptomItem[]> {
  const out: Record<DeficitGroup, SymptomItem[]> = { marked: [], partial: [], largely: [] };
  for (const s of symptoms) if (!isQualifier(s.id)) out[deficitGroup(s)].push(s);
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
 *     comparison covers it; and so is an artery that reopens by itself (U2-10).
 */
export function lateEvents(sim: SimResult): CascadeEvent[] {
  const onset = sim.schedule.onsetH;
  return sim.cascade.events
    .filter((e) => e.kind !== 'treatment' && e.id !== 'spontaneous_recanalisation')
    .filter((e) => {
      const since = e.onsetH - onset;
      if (since >= LATE_FROM_H - 1e-6) return true;
      return phaseOf(Math.max(0, since)) !== 'hyperacute' && e.onsetH <= H_6M && H_6M < (e.endH ?? Infinity);
    })
    .sort((a, b) => a.onsetH - b.onsetH);
}

/** a region counts as infarcted at the end from this fraction */
export const FINAL_REGION_MIN = 0.05;
/**
 * … or when it holds at least this share of the final infarct, however small a share of its own
 * volume that is: a lacune that died only in part, a small branch infarct of a large region, the
 * small pontine infarct a basilar occlusion reopened at 1 h leaves. So a final infarct is not shown
 * beside an empty region list (W3-5).
 */
export const FINAL_REGION_SHARE_OF_INFARCT = 0.1;
/** … of a final infarct that shows as one (0.05 mL, shown as more than 0; less is no infarct, as in the cascade) */
const FINAL_INFARCT_SHOWN = 0.05;

export interface FinalRegion {
  id: string;
  /** infarcted fraction of the region's volume (a lacune at its own volume: W3-5) */
  infarct: number;
  /** infarcted volume (mL) */
  ml: number;
}

/**
 * Regions infarcted at the 6-month stop, largest fraction first: from FINAL_REGION_MIN of their
 * volume, or holding FINAL_REGION_SHARE_OF_INFARCT of the final infarct. Their volumes are part of
 * the final infarct (the spinal cord's included: W3-8).
 */
export function finalRegions(sim: SimResult): FinalRegion[] {
  const fin = sim.volumes.finalInfarct;
  return Object.entries(sim.regions)
    .map(([id, r]) => ({ id, infarct: r.infarct, ml: r.infarct * (REGION_BY_ID[id]?.volume ?? 0) }))
    .filter((r) => r.infarct >= FINAL_REGION_MIN || (fin >= FINAL_INFARCT_SHOWN && r.ml > 0 && r.ml >= FINAL_REGION_SHARE_OF_INFARCT * fin))
    .sort((a, b) => b.infarct - a.infarct || b.ml - a.ml);
}

export interface CourseEnd {
  m3: SimResult;
  m6: SimResult;
  /** the final infarct volume (mL), evaluated at schedule.finalH */
  finalInfarct: number;
  /**
   * deficits still present at 6 months: those listed and those the lesion still gives that cannot
   * be examined at the patient's level of consciousness (SimResult.unexaminable), which have not
   * gone (X1-2) — but not a late sign listed only as possible (Y3-9), nor a finding that describes
   * another deficit (macular sparing, V2-9)
   */
  lasting: number;
  /**
   * the course usually or often ends in death, which the model does not represent; the 3- and
   * 6-month results then assume survival (C4-F1, Y3-11)
   */
  fatal: FatalRisk[];
  /** a state with a substantial mortality of its own: the 3- and 6-month results are a survivor's (Y3-11) */
  caveats: SurvivalCaveat[];
}

export interface FinalOutcome {
  /** the case as set (with its treatment, if any) */
  course: CourseEnd;
  /**
   * the same case without treatment; null when no treatment is set, or when it reopens nothing (a
   * lacunar occlusion, which the model does not reopen, or nothing complete occluded then: U2-8)
   */
  untreated: CourseEnd | null;
  /** index onset (h on the simulation clock) */
  onsetH: number;
  /** when the final infarct is evaluated (h on the simulation clock) */
  finalH: number;
  /**
   * how long after the timeline's 6-month stop the final infarct is evaluated (h; 0 when not after
   * it): the time of the last change of the vessels, as the evaluation is 6 months after it
   */
  lateBy: number;
  /**
   * what the Outcome shows that still changes between the 6-month stop and the final evaluation
   * (V3-13): the infarct (its volume, the regions listed), the deficits (the NIHSS, the labels, each
   * deficit listed with its severity and group, those that cannot be examined)
   */
  changesAfter: { infarct: boolean; deficits: boolean };
  /** the course has not settled by the timeline's 6-month stop: something it shows still changes (changesAfter) */
  unsettled: boolean;
  /** the case as set usually ends in death (course.fatal): the 3- and 6-month results assume survival */
  fatal: FatalRisk[];
  /** the case as set has a substantial mortality (course.caveats): the 3- and 6-month results are a survivor's */
  caveats: SurvivalCaveat[];
  /**
   * its herniation is the central one of two hemispheres swelling alike (V1-4): the figures of one
   * swollen hemisphere are named as such, without its outcome of survivors
   */
  centralHerniation: boolean;
  /** deficits at 3 and 6 months by group */
  deficits: { m3: Record<DeficitGroup, SymptomItem[]>; m6: Record<DeficitGroup, SymptomItem[]> };
  late: CascadeEvent[];
  regions: FinalRegion[];
}

/** The simulation of `input` at 3 and 6 months (pass them when already computed, e.g. from the series). */
export function courseEnd(input: OutcomeInput, known?: { m3?: SimResult; m6?: SimResult }): CourseEnd {
  const m3 = known?.m3 ?? simulate({ ...input, tH: H_3M });
  const m6 = known?.m6 ?? simulate({ ...input, tH: H_6M });
  const definite = [...m6.symptoms, ...m6.unexaminable].filter((s) => !SYMPTOM_BY_ID[s.id]?.possible && !isQualifier(s.id));
  return { m3, m6, finalInfarct: m6.volumes.finalInfarct, lasting: definite.length, fatal: m6.cascade.fatalRisk, caveats: m6.cascade.survivalCaveat };
}

/**
 * What the Outcome shows at one time, at the resolution it shows it (V3-13): the infarct (its volume
 * and the regions listed) and the deficits (the NIHSS, the labels, every deficit listed with its
 * severity and its group, and those that cannot be examined). The share of a deficit that other
 * pathways have taken over still creeps up by about a point a month at 6 months; it counts when it
 * moves the deficit to another group.
 */
function shownAt(sim: SimResult): { infarct: string; deficits: string } {
  const infarct = [fmtMl(sim.volumes.core), ...finalRegions(sim).map((r) => `${r.id}:${fmtMl(r.ml)}:${pctShare(r.infarct)}`)];
  const deficits = [
    `NIHSS ${sim.nihss.total}`,
    ...sim.syndromes.map((m) => `${m.def.id}_${m.side ?? ''}${m.silent ? '*' : ''}`),
    ...sim.symptoms.map((s) => `${s.id}/${s.side ?? ''}:${s.sev}${s.delayed ? 'd' : ''}:${deficitGroup(s)}`),
    ...sim.unexaminable.map((s) => `?${s.id}/${s.side ?? ''}:${s.sev}:${s.why}`),
  ].sort();
  return { infarct: infarct.join('|'), deficits: deficits.join('|') };
}

/** what the Outcome shows of the 6-month stop `m6` that still changes by the final evaluation at `finalH` (V3-13) */
function changesAfter(input: OutcomeInput, m6: SimResult, finalH: number): { infarct: boolean; deficits: boolean } {
  if (finalH <= H_6M) return { infarct: false, deficits: false };
  const now = shownAt(m6);
  const end = shownAt(simulate({ ...input, tH: finalH }));
  return { infarct: now.infarct !== end.infarct, deficits: now.deficits !== end.deficits };
}

/** Everything the Outcome tab shows, from one simulation input (the displayed time is ignored). */
export function finalOutcome(input: OutcomeInput, known?: { m3?: SimResult; m6?: SimResult }): FinalOutcome {
  const course = courseEnd(input, known);
  // (a treatment that reopens nothing has no untreated course to compare with: U2-8)
  const reopens = !!course.m6.treatment && course.m6.treatment.reopened.length > 0;
  const untreated = input.reperfusionH !== null && reopens ? courseEnd({ ...input, reperfusionH: null, treatment: undefined }) : null;
  const { onsetH, finalH } = course.m6.schedule;
  const changes = changesAfter(input, course.m6, finalH);
  return {
    course,
    untreated,
    onsetH,
    finalH,
    lateBy: Math.max(0, finalH - H_6M),
    changesAfter: changes,
    unsettled: changes.infarct || changes.deficits,
    fatal: course.fatal,
    caveats: course.caveats,
    centralHerniation: course.m6.cascade.events.some((e) => e.id === 'central_herniation'),
    deficits: { m3: groupDeficits(course.m3.symptoms), m6: groupDeficits(course.m6.symptoms) },
    late: lateEvents(course.m6),
    regions: finalRegions(course.m6),
  };
}
