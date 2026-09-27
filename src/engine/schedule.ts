/**
 * Occlusion schedules: when each occlusion is in effect.
 *
 * An occlusion begins at `fromH` (default 0) and lasts until it reopens by itself at `toH`
 * (default never) or is reopened by treatment. Treatment at `reperfusionH` (thrombolysis /
 * thrombectomy) reopens the complete, non-branch occlusions that are in effect at that moment;
 * stenoses, lacunar (single-branch) occlusions and occlusions that begin later stay.
 *
 * The same vessel may be listed more than once with non-overlapping windows, e.g. a 90 %
 * stenosis over 0–72 h followed by a complete occlusion from 72 h. Nothing is in effect before
 * its start, so between events the set of active occlusions is constant: the timeline breaks at
 * every start, reopening and treatment time, and each piece is one steady-state flow problem.
 */

import type { Occlusion } from './hemodynamics';

/** start (h) of an occlusion; negative or missing values mean 0 */
export const startOf = (o: Occlusion): number => Math.max(0, o.fromH ?? 0);
/** time (h) at which an occlusion reopens by itself, or null (never) */
export const endOf = (o: Occlusion): number | null => (o.toH === undefined || o.toH === null ? null : o.toH);

/** thrombolysis / thrombectomy reopens complete (thrombo-embolic) occlusions; a stenosis and a lacunar occlusion stay */
export const isTreatable = (o: Occlusion): boolean => o.severity >= 1 && !o.branch;

/** the occlusion is in effect at time t, ignoring treatment */
export function inWindow(o: Occlusion, tH: number): boolean {
  const e = endOf(o);
  return tH >= startOf(o) && (e === null || tH < e);
}

/** treatment at `reperfusionH` reopens this occlusion (it is complete and in effect at that moment) */
export const reopenedByTreatment = (o: Occlusion, reperfusionH: number | null): boolean =>
  reperfusionH !== null && isTreatable(o) && inWindow(o, reperfusionH);

/** the occlusion is in effect at time t */
export const isActiveAt = (o: Occlusion, tH: number, reperfusionH: number | null): boolean =>
  inWindow(o, tH) && !(reperfusionH !== null && tH >= reperfusionH && reopenedByTreatment(o, reperfusionH));

/** the occlusions in effect at time t (input order) */
export const activeAt = (occlusions: readonly Occlusion[], tH: number, reperfusionH: number | null): Occlusion[] =>
  occlusions.filter((o) => isActiveAt(o, tH, reperfusionH));

export type OcclusionStatus = 'pending' | 'active' | 'reopened' | 'treated';

/** where an occlusion stands at time t: not yet begun, in effect, reopened by itself, or reopened by treatment */
export function statusAt(o: Occlusion, tH: number, reperfusionH: number | null): OcclusionStatus {
  if (tH < startOf(o)) return 'pending';
  if (isActiveAt(o, tH, reperfusionH)) return 'active';
  return reperfusionH !== null && tH >= reperfusionH && reopenedByTreatment(o, reperfusionH) ? 'treated' : 'reopened';
}

/** any occlusion that does not simply start at 0 and last */
export const hasSchedule = (occlusions: readonly Occlusion[]): boolean =>
  occlusions.some((o) => startOf(o) > 0 || endOf(o) !== null);

/**
 * Times (h, sorted, unique, starting with 0) at which the set of active occlusions can change:
 * every start, every spontaneous reopening and the treatment.
 */
export function breakpoints(occlusions: readonly Occlusion[], reperfusionH: number | null): number[] {
  const s = new Set<number>([0]);
  for (const o of occlusions) {
    s.add(startOf(o));
    const e = endOf(o);
    if (e !== null && e > startOf(o)) s.add(e);
  }
  if (reperfusionH !== null && reperfusionH >= 0) s.add(reperfusionH);
  return [...s].sort((a, b) => a - b);
}

/** do two occlusions of the same vessel overlap in time? */
export function overlap(a: Occlusion, b: Occlusion): boolean {
  if (a.vessel !== b.vessel) return false;
  const ea = endOf(a) ?? Infinity;
  const eb = endOf(b) ?? Infinity;
  return startOf(a) < eb && startOf(b) < ea;
}

/** a valid window: a finite start ≥ 0 and, if it reopens, a later finite end */
export const validWindow = (o: Occlusion): boolean => {
  const f = o.fromH ?? 0;
  const e = endOf(o);
  return Number.isFinite(f) && f >= 0 && (e === null || (Number.isFinite(e) && e > f));
};

/** drop default timing (start 0, never reopens) so that plain occlusions stay `{ vessel, severity }` */
export function tidy(o: Occlusion): Occlusion {
  const out: Occlusion = { ...o };
  if (!out.branch) delete out.branch;
  if (!out.fromH) delete out.fromH;
  if (out.toH === null || out.toH === undefined) delete out.toH;
  return out;
}

/**
 * Make one vessel's phases consistent after an edit: each phase ends when the next one begins
 * (a stenosis that "becomes" an occlusion). Returns null if that is impossible (two phases
 * starting together, or a phase left without any duration).
 */
export function fitSchedule(occlusions: readonly Occlusion[], vessel: string): Occlusion[] | null {
  const idx = phasesOf(occlusions, vessel);
  const out = [...occlusions];
  for (let k = 0; k < idx.length; k++) {
    const o = out[idx[k]];
    if (k + 1 < idx.length) {
      const next = startOf(out[idx[k + 1]]);
      if (next <= startOf(o)) return null;
      const e = endOf(o);
      if (e === null || e > next) out[idx[k]] = tidy({ ...o, toH: next });
    }
    if (!validWindow(out[idx[k]])) return null;
  }
  return out;
}

/** the phases of one vessel, sorted by start (indexes into `occlusions`) */
export function phasesOf(occlusions: readonly Occlusion[], vessel: string): number[] {
  return occlusions
    .map((o, i) => [o, i] as const)
    .filter(([o]) => o.vessel === vessel)
    .sort((a, b) => startOf(a[0]) - startOf(b[0]))
    .map(([, i]) => i);
}

/** the phase of the same vessel that begins exactly when this one ends, if any */
export function successorOf(occlusions: readonly Occlusion[], o: Occlusion): Occlusion | null {
  const e = endOf(o);
  if (e === null) return null;
  return occlusions.find((p) => p !== o && p.vessel === o.vessel && startOf(p) === e) ?? null;
}

/** how much an occlusion narrows its vessel: complete > lacunar branch ≈ tight stenosis > stenosis */
const narrowing = (o: Occlusion) => (o.branch ? 0.9 : o.severity);

/** the phase ended because the vessel got worse (a stenosis that occluded), not because it reopened */
export const progressed = (occlusions: readonly Occlusion[], o: Occlusion): boolean => {
  const next = successorOf(occlusions, o);
  return !!next && narrowing(next) > narrowing(o);
};

export type ScheduleEventKind = 'onset' | 'progression' | 'reopen' | 'treatment';

export interface ScheduleEvent {
  h: number;
  kind: ScheduleEventKind;
  /** index into the occlusion list (-1 for treatment) */
  index: number;
  vessel: string | null;
  /** for treatment: the occlusions it reopens */
  reopens?: number[];
}

/**
 * Everything that happens to the vessels, in time order: an occlusion begins ('onset'), a
 * vessel narrows further or occludes as its previous phase ends ('progression'), an occlusion
 * clears by itself, fully or to a milder narrowing ('reopen'), or treatment reopens occlusions.
 */
export function scheduleEvents(occlusions: readonly Occlusion[], reperfusionH: number | null): ScheduleEvent[] {
  const out: ScheduleEvent[] = [];
  occlusions.forEach((o, i) => {
    const prev = occlusions.find((p) => p !== o && successorOf(occlusions, p) === o);
    if (!prev) out.push({ h: startOf(o), kind: 'onset', index: i, vessel: o.vessel });
    else if (progressed(occlusions, prev)) out.push({ h: startOf(o), kind: 'progression', index: i, vessel: o.vessel });
    const e = endOf(o);
    // an occlusion that treatment reopens earlier never reaches its own reopening
    if (e !== null && !progressed(occlusions, o) && !reopenedByTreatment(o, reperfusionH))
      out.push({ h: e, kind: 'reopen', index: i, vessel: o.vessel });
  });
  if (reperfusionH !== null) {
    const reopens = occlusions.map((o, i) => [o, i] as const).filter(([o]) => reopenedByTreatment(o, reperfusionH)).map(([, i]) => i);
    out.push({ h: reperfusionH, kind: 'treatment', index: -1, vessel: null, reopens });
  }
  const rank: Record<ScheduleEventKind, number> = { reopen: 0, treatment: 1, progression: 2, onset: 3 };
  return out.sort((a, b) => a.h - b.h || rank[a.kind] - rank[b.kind] || a.index - b.index);
}
