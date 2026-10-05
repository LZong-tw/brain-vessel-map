/**
 * Orchestrates one simulation: haemodynamics → tissue fate at time t → downstream cascade
 * → symptoms, NIHSS estimate and syndromes. Pure function of its input (memoised).
 *
 * Occlusions may follow a schedule (engine/schedule.ts): begin later, reopen by themselves, or
 * turn from a stenosis into an occlusion, and treatment reopens whatever complete occlusion is
 * in effect when it is given. The timeline is cut at every such event, each piece gets its own
 * steady-state flow solution (memoised per set of active occlusions), and every perfusion unit
 * gets a piecewise-constant flow history that the tissue model integrates (engine/tissue.ts).
 * When every occlusion starts at 0 and lasts, this is exactly the former two-phase model (flow
 * before and after treatment), number for number.
 *
 * Clocks. The cascade (cascade.ts), the oedema model (edema.ts), the recovery hook and delayed
 * symptoms describe ONE ischaemic event that starts at t = 0. For a schedule they run on a
 * clinical clock, t − onset, where the index onset is the start of the occlusion phase that
 * produces most of the final infarct (if nothing dies: the first start that causes ischaemia).
 * The cascade is shifted back onto the simulation clock for display. Approximations:
 *   • one index event: infarcts from other episodes add to the volumes and the oedema, but
 *     swell and evolve on the index clock (nothing before the index onset);
 *   • the final infarct is taken FINAL_H after the last occlusion start or reopening;
 *   • the acute deficit pattern and the flow the cascade sees are those of the index onset, and
 *     "reperfusion" for the oedema model is the first reopening (treatment or spontaneous) of
 *     that episode;
 *   • treatment given before the index onset does not count as treating it.
 * With a single onset at 0 these reduce to the former behaviour exactly.
 *
 * Treatment details (engine/treatment.ts). `reperfusionH` is when flow returns; `treatment` says
 * how and how well. With the default (complete, lasting reperfusion) everything above holds
 * unchanged, number for number. Otherwise:
 *   • two courses are built: the treated one (the reopened occlusions open at reperfusionH, plus
 *     the phases the treatment itself causes: the reopened artery closing again at
 *     reperfusionH + reocclusionAfterH until it would have cleared by itself, and a clot fragment
 *     blocking `distalEmbolus` for good from reperfusionH) and the untreated one;
 *   • a share x = reperfusedFraction (eTICI grade, less no-reflow) of every perfusion unit follows
 *     the treated course and the rest the untreated one (the clot stays for it): tissue fractions,
 *     the final and early infarcts, the flow shown and the flow the cascade and the oedema model
 *     see are all x·treated + (1 − x)·untreated. Units the treatment does not touch have the
 *     same history in both, so they are unchanged. "Salvaged" is untreated − mixed per unit;
 *   • eTICI 0 is an attempt that reopens nothing: the tissue follows the untreated course exactly,
 *     the occlusions stay in effect, and the cascade says the attempt failed;
 *   • the phases the treatment causes do not start new episodes: the index onset and the final
 *     horizon come from the input schedule only;
 *   • after a lasting reocclusion the flow ends where it would have been untreated, and the
 *     tissue model's eventual loss depends only on that flow: the final infarct is the untreated
 *     one, reached later (the reopening postponed the loss; the course over time shows it).
 * Approximations: the x-share is the same for every unit behind every reopened occlusion (an
 * embolus into a territory NOT behind the reopened artery is weighted by x too), and the oedema
 * model still sees one reopening (a reocclusion does not take its extra water supply away).
 */

import { BEDS, BED_BY_ID, REGIONS, REGION_BY_ID, VESSEL_BY_ID } from '../anatomy';
import type { Side } from '../anatomy';
import { computeCascade, consciousnessFromShift, noInfarctEvents, type BedEffectKind, type CascadeEvent, type CascadeOutput, type CascadeTreatment } from './cascade';
import { aggregateSymptoms, detectSyndromes, estimateNihss, type NihssResult, type SymptomItem, type SyndromeMatch } from './clinical';
import { getUnits, simulateHemodynamics, type HemoInput, type HemoResult, type Occlusion, type Unit } from './hemodynamics';
import { computeEdema, type EdemaBedInput } from './edema';
import type { EdemaState } from './edemaTypes';
import { computeRecovery, type RecoveryBedInput } from './recovery';
import type { RecoveryState } from './recoveryTypes';
import {
  activeAt,
  breakpoints,
  causeOf,
  endOf,
  inWindow,
  isTreatable,
  reopenedByTreatment,
  scheduleEvents,
  startOf,
  statusAt,
  type OcclusionStatus,
  type ScheduleEvent,
  type TreatmentPhase,
} from './schedule';
import { tissueParamsForBed, type TissueParams } from './tissueParams';
import {
  DEFAULT_TREATMENT,
  GRADE_REPERFUSED,
  REPERFUSION_GRADES,
  downstreamBranches,
  isDefaultTreatment,
  reperfusedFraction,
  type TreatmentOptions,
} from './treatment';
import { LACUNE_DYSFUNCTION, LACUNE_ML, LACUNE_TARGET, canBeLacunar } from '../anatomy/lacunes';
import { NEURONS_PER_ML, infarctFractionOf, lossSteps, tissueCourse, type FlowPhase, type TissueState } from './tissue';

export interface SimInput extends HemoInput {
  tH: number;
  reperfusionH: number | null;
  decompression: boolean;
  /** how and how well the artery is reopened at reperfusionH (see treatment.ts); default: completely */
  treatment?: TreatmentOptions;
}

export interface BedTimeState {
  rel: number;
  /** volume fractions by tissue state */
  frac: Record<TissueState, number>;
  /** infarcted fraction including secondary infarcts */
  infarct: number;
  /** dysfunctional fraction (core + penumbra + compressed) */
  dys: number;
  effect: BedEffectKind | null;
}

export interface RegionTimeState {
  rel: number;
  infarct: number;
  dys: number;
  dominant: TissueState | BedEffectKind;
  effect: BedEffectKind | null;
}

export interface SimResult {
  input: SimInput;
  /** blood flow at the displayed time (after recanalisation if it has happened) */
  hemo: HemoResult;
  /** occlusions still in effect at the displayed time */
  activeOcclusions: Occlusion[];
  /** the occlusions have been reopened by the displayed time */
  recanalized: boolean;
  beds: Record<string, BedTimeState>;
  regions: Record<string, RegionTimeState>;
  symptoms: SymptomItem[];
  nihss: NihssResult;
  syndromes: SyndromeMatch[];
  cascade: CascadeOutput;
  volumes: { core: number; penumbra: number; finalInfarct: number; saved: number };
  neuronsLost: number;
  hydrocephalus: boolean;
  /** swelling / oedema at the displayed time (see engine/edemaTypes.ts) */
  edema: EdemaState;
  /** temporary dysfunction and compensation at the displayed time (see engine/recoveryTypes.ts) */
  recovery: RecoveryState;
  /** the occlusion schedule: its events, the index onset and where each occlusion stands now */
  schedule: ScheduleInfo;
  /** what the treatment at reperfusionH did (null without treatment) */
  treatment: TreatmentInfo | null;
}

/**
 * The treatment as the simulation applied it. `activeOcclusions` also lists the phases it caused
 * (a reocclusion, a distal embolus) while they are in effect.
 */
export interface TreatmentInfo {
  /** the options in effect: `input.treatment`, or DEFAULT_TREATMENT; values outside the contract are replaced by the default's */
  options: TreatmentOptions;
  /** share of the territory of each reopened occlusion that follows the treated course (reperfusedFraction(options)) */
  reperfusedFraction: number;
  /**
   * vessel ids of the occlusions this treatment reopens (complete, not lacunar, in effect at
   * reperfusionH), in input order. The options act on them: the grade is the reperfusion of their
   * territory, a reocclusion closes them again, and a distal embolus comes from their clot (offer
   * downstreamBranches(id)). With eTICI 0 they stay closed (`failed`).
   */
  reopened: string[];
  /** eTICI 0: the attempt reopened nothing; the tissue follows the untreated course */
  failed: boolean;
  /** when the reopened artery closes again (h, simulation clock), or null (it stays open, or nothing was reopened) */
  reocclusionH: number | null;
  /**
   * the branch blocked from reperfusionH on, or null: none requested, or the id was ignored (not
   * an occludable vessel, one of the reopened vessels, or nothing was reopened)
   */
  distalEmbolus: string | null;
}

export interface ScheduleInfo {
  /** index onset (h): the cascade, oedema, recovery and delayed symptoms run on t − onsetH */
  onsetH: number;
  /** when the final infarct is evaluated (h): FINAL_H after the last occlusion start or reopening */
  finalH: number;
  /** what happens to the vessels when, in time order */
  events: ScheduleEvent[];
  /** per occlusion of the input (same order): where it stands at the displayed time */
  status: OcclusionStatus[];
}

const BRAIN = new Set(['cortex', 'deep', 'brainstem', 'cerebellum']);
/** the final infarct is the course's end point: slow penumbra (flow just under the threshold,
 * brainstem with collaterals) is still being lost days after the event, so a 96 h horizon let
 * the displayed core overtake the "final" volume */
const FINAL_H = 4320;
/**
 * A unit's flow history gets a new phase only where its flow changes by more than this — or at
 * treatment, where the two-phase model always started one — so that an event elsewhere in the
 * brain does not restart the penumbra time window of tissue it barely affects.
 */
const REL_EPS = 0.01;
/** below this (mL) nothing died that could decide the index onset */
const ONSET_MIN_ML = 0.05;

/** A stretch of the timeline with a constant set of active occlusions. */
interface Piece {
  fromH: number;
  active: Occlusion[];
  hemo: HemoResult;
}

/** Flow over time for one schedule (with or without treatment). */
interface Course {
  pieces: Piece[];
  units: Unit[];
  /** flow history of each unit (same order as `units`) */
  histories: FlowPhase[][];
  /** lacune target region → the lacunar (single-branch) occlusions that hit it (sorted by region) */
  lacunes: Map<string, Occlusion[]>;
}

/** index of the piece that contains time t */
function pieceIndex(pieces: Piece[], tH: number): number {
  let k = 0;
  while (k + 1 < pieces.length && pieces[k + 1].fromH <= tH) k++;
  return k;
}

/**
 * Flow over time when treatment at `reperfusionH` (null: none) reopens what is occluded then.
 * `occlusions` is the schedule to follow: the input's, plus, for the treated course, the phases
 * the treatment causes (appended, so that such a complete occlusion overrides an input stenosis
 * of the same vessel in the flow model).
 */
function buildCourse(input: SimInput, reperfusionH: number | null, occlusions: Occlusion[] = input.occlusions): Course {
  const pieces = breakpoints(occlusions, reperfusionH).map((fromH) => {
    const active = activeAt(occlusions, fromH, reperfusionH);
    return { fromH, active, hemo: simulateHemodynamics({ ...input, occlusions: active }) };
  });
  const units = getUnits(input.variants, input.collateral);
  const histories = units.map((u) => {
    const h: FlowPhase[] = [];
    for (const p of pieces) {
      const rel = p.hemo.unitRel[u.id] ?? 1;
      const last = h[h.length - 1];
      if (!last || p.fromH === reperfusionH || Math.abs(rel - last.rel) > REL_EPS) h.push({ fromH: p.fromH, rel });
    }
    return h;
  });
  return { pieces, units, histories, lacunes: lacuneRegions(input.occlusions) };
}

/** a unit's relative flow at time t (1 before its history starts) */
function currentRel(history: FlowPhase[], tH: number): number {
  let rel = 1;
  for (const ph of history) if (ph.fromH <= tH) rel = ph.rel;
  return rel;
}

/**
 * x·a + (1 − x)·b: a share x follows the treated course, the rest the untreated one. Exact when
 * x is 1 or 0, or when both courses agree (units the treatment does not touch stay as they are).
 */
const blend = (a: number, b: number, x: number): number => (x === 1 || a === b ? a : x === 0 ? b : x * a + (1 - x) * b);

/** per bed: infarcted fraction at time t; with `other`, blended with that course (share 1 − x) unit by unit */
function bedInfarctAt(course: Course, tH: number, other: Course | null = null, x = 1) {
  const out: Record<string, number> = {};
  course.units.forEach((u, i) => {
    const p = tissueParamsForBed(u.bed);
    let f = infarctFractionOf(course.histories[i], tH, p);
    if (other && x !== 1) f = blend(f, infarctFractionOf(other.histories[i], tH, p), x);
    out[u.bed] = (out[u.bed] ?? 0) + f * u.frac;
  });
  return out;
}

/**
 * The flow of partial reperfusion: every flow, pressure and relative perfusion blended as
 * x·treated + (1 − x)·untreated, so that what is shown matches the blended tissue.
 */
function blendHemo(a: HemoResult, b: HemoResult, x: number): HemoResult {
  if (a === b || x === 1) return a;
  if (x === 0) return b;
  const rec = (ra: Record<string, number>, rb: Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const k of Object.keys(ra)) out[k] = blend(ra[k], rb[k] ?? ra[k], x);
    return out;
  };
  const vesselFlow = rec(a.vesselFlow, b.vesselFlow);
  // a vessel counts as reversed by the rule of simulateHemodynamics, applied to the blended flow;
  // only one that is reversed in either course can be
  const reversed = [...new Set([...a.reversed, ...b.reversed])].filter((v) => {
    const b0 = a.baselineFlow[v] ?? 0;
    const f = vesselFlow[v] ?? 0;
    return Math.abs(f) > Math.max(0.5, 0.05 * Math.abs(b0)) && Math.abs(b0) > 0.5 && Math.sign(f) !== Math.sign(b0);
  });
  return {
    ...a,
    vesselFlow,
    unitRel: rec(a.unitRel, b.unitRel),
    bedRel: rec(a.bedRel, b.bedRel),
    vesselPressure: rec(a.vesselPressure, b.vesselPressure),
    reversed,
    totalCbf: blend(a.totalCbf, b.totalCbf, x),
  };
}

/**
 * Add one share of a unit's tissue state at time t to its bed; `frac` is the share's fraction of
 * the bed (the unit's fraction times the share). Of the tissue that survives reperfusion, only
 * `saved` (per unit of this share) is "salvaged".
 */
function addUnitShare(bs: BedTimeState, frac: number, history: FlowPhase[], saved: number, tH: number, p: TissueParams): void {
  const { f, rest } = tissueCourse(history, tH, p);
  bs.frac.core += f * frac;
  if (rest === 'salvaged') {
    // "salvaged" is only what treatment saved (would have died untreated); the rest of the
    // reperfused tissue would have survived on its collaterals anyway and is simply perfused
    // again — calling all of it salvaged made a late recanalisation look like a rescue
    const s = Math.min(1 - f, saved);
    bs.frac.salvaged += s * frac;
    bs.frac[currentRel(history, tH) < p.oligemiaRel ? 'oligemia' : 'normal'] += (1 - f - s) * frac;
  } else bs.frac[rest] += (1 - f) * frac;
  bs.infarct += f * frac;
}

/** target regions of lacunar (single-branch) occlusions */
function lacuneRegions(occlusions: Occlusion[]): Map<string, Occlusion[]> {
  const out = new Map<string, Occlusion[]>();
  for (const o of occlusions) {
    const v = VESSEL_BY_ID[o.vessel];
    if (!o.branch || !v || !canBeLacunar(v.baseId, v.n) || v.side === 'm') continue;
    const rid = `${LACUNE_TARGET[v.baseId]}_${v.side}`;
    if (!REGION_BY_ID[rid]) continue;
    const list = out.get(rid);
    if (list) list.push(o);
    else out.set(rid, [o]);
  }
  return new Map([...out.keys()].sort().map((rid) => [rid, out.get(rid)!]));
}

/** flow history of the tissue behind a lacunar occlusion (none before it, none once it reopens) */
function branchHistory(o: Occlusion): FlowPhase[] {
  const s = startOf(o);
  const e = endOf(o);
  const h: FlowPhase[] = s > 0 ? [{ fromH: 0, rel: 1 }, { fromH: s, rel: 0 }] : [{ fromH: 0, rel: 0 }];
  if (e !== null && e > s) h.push({ fromH: e, rel: 1 });
  return h;
}

/** fraction of one lacune that has died by time t in region `rid` */
function lacuneLossAt(course: Course, rid: string, tH: number): number {
  let loss = 0;
  for (const o of course.lacunes.get(rid) ?? []) loss = Math.max(loss, infarctFractionOf(branchHistory(o), tH));
  return loss;
}

/** fraction of a region occupied by one lacune */
const lacuneFraction = (rid: string) => Math.min(1, LACUNE_ML / Math.max(REGION_BY_ID[rid].volume, LACUNE_ML));

function addLacunes(bedInfarct: Record<string, number>, course: Course, tH: number): Record<string, number> {
  if (!course.lacunes.size) return bedInfarct;
  const out = { ...bedInfarct };
  for (const rid of course.lacunes.keys()) {
    const x = lacuneFraction(rid) * lacuneLossAt(course, rid, tH);
    for (const bid of REGION_BY_ID[rid].beds) out[bid] = (out[bid] ?? 0) + x * (1 - (out[bid] ?? 0));
  }
  return out;
}

/**
 * The index onset: the start of the occlusion phase that produces most of the final infarct.
 * Each unit's loss in each phase of its flow history is credited to the latest occlusion start
 * at or before that phase began (so treatment or a reopening does not start a new event). If
 * nothing (much) dies, it is the first start that makes brain tissue ischaemic. Only the input's
 * starts count: a phase the treatment caused (reocclusion, distal embolus) belongs to the event
 * it treated. With partial reperfusion the loss of each course counts by its share.
 */
function indexOnset(input: SimInput, course: Course, finalH: number, other: Course | null = null, x = 1): number {
  const starts = [...new Set(input.occlusions.map(startOf))].sort((a, b) => a - b);
  if (starts.length <= 1) return starts[0] ?? 0;
  const credit = startCredits(input, course, finalH, other, x);
  let best = starts[0];
  for (const s of starts) if (credit.get(s)! > credit.get(best)! + 1e-9) best = s;
  if (credit.get(best)! >= ONSET_MIN_ML) return best;
  for (const s of starts) if (ischaemicAt(course, s)) return s;
  return starts[0];
}

/** some brain tissue is ischaemic (below the penumbra threshold) in the piece that starts at `h` */
function ischaemicAt(course: Course, h: number): boolean {
  const hemo = course.pieces[pieceIndex(course.pieces, h)].hemo;
  return course.units.some(
    (u) => BRAIN.has(REGION_BY_ID[BED_BY_ID[u.bed].region].category) && (hemo.unitRel[u.id] ?? 1) < tissueParamsForBed(u.bed).penumbraRel,
  );
}

/** brain tissue lost (mL) by `finalH`, credited to the occlusion start that caused it (see indexOnset) */
function startCredits(input: SimInput, course: Course, finalH: number, other: Course | null = null, x = 1): Map<number, number> {
  const starts = [...new Set(input.occlusions.map(startOf))].sort((a, b) => a - b);
  const credit = new Map<number, number>(starts.map((s) => [s, 0]));
  const add = (h: number, ml: number) => {
    let s = starts[0];
    for (const x of starts) if (x <= h) s = x;
    credit.set(s, credit.get(s)! + ml);
  };
  const shares: [Course, number][] = !other || x === 1 ? [[course, 1]] : x === 0 ? [[other, 1]] : [[course, x], [other, 1 - x]];
  for (const [c, w] of shares) {
    c.units.forEach((u, i) => {
      const bed = BED_BY_ID[u.bed];
      if (!BRAIN.has(REGION_BY_ID[bed.region].category)) return;
      const h = c.histories[i];
      let prev = 0;
      lossSteps(h, finalH, tissueParamsForBed(u.bed)).forEach((f, k) => {
        if (f > prev) add(h[k].fromH, (f - prev) * u.frac * bed.volume * w);
        prev = f;
      });
    });
  }
  for (const [rid, list] of course.lacunes)
    for (const o of list) add(startOf(o), lacuneFraction(rid) * REGION_BY_ID[rid].volume * infarctFractionOf(branchHistory(o), finalH));
  return credit;
}

/**
 * The TIA story for each complete occlusion that began before the index onset, reopened by
 * itself and left no infarct while it made brain tissue ischaemic (such as the prodromal attack of
 * a progressive basilar thrombosis: Ferbert A et al. Stroke 1990;21:1135–1142; von Campe G et al.
 * J Neurol Neurosurg Psychiatry 2003;74:1621–1626). Each story is cut off where the next complete
 * occlusion begins. Simulation clock (C3-F8).
 */
function prodromalEvents(input: SimInput, course: Course, finalH: number, onsetH: number, other: Course | null, x: number): CascadeEvent[] {
  const credit = startCredits(input, course, finalH, other, x);
  const completeStarts = [...new Set(input.occlusions.filter(isTreatable).map(startOf))].sort((a, b) => a - b);
  const out: CascadeEvent[] = [];
  for (const s of completeStarts) {
    if (s >= onsetH) break;
    const reopens = input.occlusions.some((o) => isTreatable(o) && startOf(o) === s && endOf(o) !== null);
    if (!reopens || (credit.get(s) ?? 0) >= ONSET_MIN_ML || !ischaemicAt(course, s)) continue;
    const next = completeStarts.find((h) => h > s) ?? onsetH;
    out.push(...noInfarctEvents(s, next));
  }
  return out;
}

/**
 * Shift every time of the cascade (every numeric field whose name ends in "H": onsetH, peakH,
 * endH, hydrocephalusOnsetH …) from the clinical clock onto the simulation clock.
 */
function shiftTimes<T>(x: T, dh: number): T {
  if (Array.isArray(x)) return x.map((y) => shiftTimes(y, dh)) as T;
  if (x && typeof x === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) out[k] = typeof v === 'number' && k.endsWith('H') ? v + dh : shiftTimes(v, dh);
    return out as T;
  }
  return x;
}

/**
 * The treatment options in effect: DEFAULT_TREATMENT when none are given (or they equal it); a
 * value outside the contract falls back to the default's (no-reflow is kept within 0–0.5).
 */
function treatmentOptions(t: TreatmentOptions | undefined): TreatmentOptions {
  if (!t) return DEFAULT_TREATMENT;
  const out: TreatmentOptions = {
    method: t.method === 'ivt' || t.method === 'bridging' ? t.method : 'evt',
    grade: REPERFUSION_GRADES.includes(t.grade) ? t.grade : DEFAULT_TREATMENT.grade,
    reocclusionAfterH:
      typeof t.reocclusionAfterH === 'number' && Number.isFinite(t.reocclusionAfterH) && t.reocclusionAfterH >= 0 ? t.reocclusionAfterH : null,
    distalEmbolus: typeof t.distalEmbolus === 'string' && t.distalEmbolus ? t.distalEmbolus : null,
    noReflow: typeof t.noReflow === 'number' && Number.isFinite(t.noReflow) ? Math.min(0.5, Math.max(0, t.noReflow)) : 0,
  };
  return isDefaultTreatment(out) ? DEFAULT_TREATMENT : out;
}

/** How the treatment at reperfusionH is applied (see the header). */
interface TreatmentPlan {
  options: TreatmentOptions;
  /** share of each unit that follows the treated course (0 when the attempt fails) */
  x: number;
  /** eTICI 0: nothing is reopened */
  failed: boolean;
  /** when the treatment reopens occlusions: reperfusionH, or null if it fails */
  opensH: number | null;
  /** the input occlusions it reopens (complete, not lacunar, in effect at reperfusionH) */
  reopened: Occlusion[];
  /** the phases it causes: reocclusion(s), then the distal embolus */
  phases: TreatmentPhase[];
  reocclusionH: number | null;
  distalEmbolus: string | null;
}

function planTreatment(input: SimInput): TreatmentPlan | null {
  const reperf = input.reperfusionH;
  if (reperf === null) return null;
  const options = treatmentOptions(input.treatment);
  const reopened = input.occlusions.filter((o) => reopenedByTreatment(o, reperf));
  const failed = GRADE_REPERFUSED[options.grade] === 0;
  const phases: TreatmentPhase[] = [];
  let reocclusionH: number | null = null;
  let distalEmbolus: string | null = null;
  if (!failed && reopened.length) {
    if (options.reocclusionAfterH !== null) {
      const fromH = reperf + options.reocclusionAfterH;
      for (const o of reopened) {
        // the reopened artery closes again completely, until the original clot would have
        // cleared by itself (so a reocclusion can never do worse than no treatment)
        const e = endOf(o);
        if (e !== null && e <= fromH) continue;
        phases.push({ vessel: o.vessel, severity: 1, fromH, ...(e === null ? {} : { toH: e }), causedByTreatment: 'reocclusion' });
        reocclusionH = fromH;
      }
    }
    // a fragment of the clot lodges in a branch and stays: the same treatment does not reopen it
    const id = options.distalEmbolus;
    if (id !== null && isOccludable(id) && !reopened.some((o) => o.vessel === id)) {
      phases.push({ vessel: id, severity: 1, fromH: reperf, causedByTreatment: 'distal_embolus' });
      distalEmbolus = id;
    }
  }
  return {
    options,
    x: failed ? 0 : reperfusedFraction(options),
    failed,
    opensH: failed ? null : reperf,
    reopened,
    phases,
    reocclusionH,
    distalEmbolus,
  };
}

/** regions supplied by a vessel and everything downstream of it (in this anatomy) */
function territoryRegions(vesselId: string, units: Unit[]): string[] {
  const tree = new Set<string>();
  const stack = [vesselId];
  while (stack.length) {
    const id = stack.pop()!;
    if (tree.has(id)) continue;
    tree.add(id);
    stack.push(...(VESSEL_BY_ID[id]?.children ?? []));
  }
  return [...new Set(units.filter((u) => tree.has(u.vessel)).map((u) => BED_BY_ID[u.bed].region))];
}

/** Everything about one input that does not depend on the displayed time (cached). */
interface Model {
  /** the treated course (without treatment the only one; if the attempt fails, the untreated one) */
  course: Course;
  /** the untreated course when there is treatment, else null */
  untreated: Course | null;
  /** share of each unit that follows `course`; the rest follows `untreated` (1 without treatment) */
  x: number;
  plan: TreatmentPlan | null;
  /** the treated course's schedule: the input's occlusions, then the phases the treatment caused */
  occlusions: Occlusion[];
  onsetH: number;
  finalH: number;
  /** flow at the index onset, and after that episode first reopens */
  hemoAcute: HemoResult;
  hemoAfter: HemoResult;
  /** first reopening of the index episode on the clinical clock (for the oedema model), or null */
  edemaReperfusionH: number | null;
  /** the cascade on the clinical clock … */
  cascade: CascadeOutput;
  /** … and on the simulation clock, for display */
  shownCascade: CascadeOutput;
  /**
   * per unit (same order as course.units): the fraction of the treated share that treatment
   * saves, i.e. that would be lost by the end of the untreated course but survives the treated
   * one (0 without treatment)
   */
  unitSaved: number[];
  /** the (blended) flow at time t */
  hemoAt: (tH: number) => HemoResult;
}

const modelCache = new Map<string, Model>();

function modelKey(input: SimInput): string {
  const occ = input.occlusions.map((o) => `${o.vessel}:${o.severity}:${o.branch ? 'b' : ''}:${startOf(o)}:${endOf(o)}`).join(',');
  const key = `${occ}|${[...input.variants].sort().join(',')}|${input.map}|${input.collateral}|${input.reperfusionH}|${input.decompression}`;
  const t = input.reperfusionH === null ? DEFAULT_TREATMENT : treatmentOptions(input.treatment);
  return t === DEFAULT_TREATMENT ? key : `${key}|${t.method}:${t.grade}:${t.reocclusionAfterH}:${t.distalEmbolus}:${t.noReflow}`;
}

function modelFor(input: SimInput): Model {
  const key = modelKey(input);
  const hit = modelCache.get(key);
  if (hit) return hit;
  const reperf = input.reperfusionH;
  const plan = planTreatment(input);
  const occlusions = plan && plan.phases.length ? [...input.occlusions, ...plan.phases] : input.occlusions;
  const untreated = reperf !== null ? buildCourse(input, null) : null;
  // a failed attempt changes nothing: the treated course is the untreated one
  const course = plan?.failed ? untreated! : buildCourse(input, reperf, occlusions);
  const x = plan ? plan.x : 1;
  const opensH = plan ? plan.opensH : null;
  const { units } = course;
  let lastChange = 0;
  for (const o of input.occlusions) lastChange = Math.max(lastChange, startOf(o), endOf(o) ?? 0);
  const finalH = lastChange + FINAL_H;
  const onsetH = indexOnset(input, course, finalH, untreated, x);
  const hemoCache = new Map<string, HemoResult>();
  const hemoAtT = (tH: number): HemoResult => {
    const i = pieceIndex(course.pieces, tH);
    const a = course.pieces[i].hemo;
    if (!untreated || x === 1) return a;
    const j = pieceIndex(untreated.pieces, tH);
    const k = `${i}|${j}`;
    let h = hemoCache.get(k);
    if (!h) hemoCache.set(k, (h = blendHemo(a, untreated.pieces[j].hemo, x)));
    return h;
  };
  const onsetPiece = course.pieces[pieceIndex(course.pieces, onsetH)];
  // the index episode ends at treatment (unless it fails) or when one of its occlusions reopens by itself
  const ends: number[] = [];
  if (opensH !== null && opensH >= onsetH) ends.push(opensH);
  for (const o of onsetPiece.active) {
    const e = endOf(o);
    if (e !== null && e > onsetH) ends.push(e);
  }
  const episodeEndH = ends.length ? Math.min(...ends) : null;
  const hemoAcute = hemoAtT(onsetH);
  const hemoAfter = episodeEndH === null ? hemoAcute : hemoAtT(episodeEndH);

  const bedFinal = addLacunes(bedInfarctAt(course, finalH, untreated, x), course, finalH);
  let bedFinalUntreated = bedFinal;
  let unitSaved: number[] = units.map(() => 0);
  if (untreated) {
    bedFinalUntreated = addLacunes(bedInfarctAt(untreated, finalH), untreated, finalH);
    unitSaved = units.map((u, i) => {
      const p = tissueParamsForBed(u.bed);
      return Math.max(0, infarctFractionOf(untreated.histories[i], finalH, p) - infarctFractionOf(course.histories[i], finalH, p));
    });
  }
  const acute: Record<string, number> = {};
  for (const u of units) {
    // dysfunctional (core or penumbra) in the first hour
    if ((hemoAcute.unitRel[u.id] ?? 1) < tissueParamsForBed(u.bed).penumbraRel) acute[u.bed] = (acute[u.bed] ?? 0) + u.frac;
  }
  const cascadeTreatment: CascadeTreatment | undefined =
    plan && reperf !== null && reperf >= onsetH && !isDefaultTreatment(plan.options)
      ? {
          method: plan.options.method,
          grade: plan.options.grade,
          noReflow: plan.options.noReflow,
          reperfusedFraction: plan.x,
          failed: plan.failed,
          reocclusionH: plan.reocclusionH === null ? null : plan.reocclusionH - onsetH,
          distalEmbolus: plan.distalEmbolus,
          embolusRegions: plan.distalEmbolus === null ? [] : territoryRegions(plan.distalEmbolus, units),
          embolusNewTerritory: plan.distalEmbolus !== null && !plan.reopened.some((o) => downstreamBranches(o.vessel).includes(plan.distalEmbolus!)),
        }
      : undefined;
  // the core when treatment is decided: at the treatment, or 6 h after onset without one (text only)
  const decisionH = onsetH + (reperf !== null && reperf >= onsetH ? reperf - onsetH : 6);
  const cascade = computeCascade({
    reperfusionH: reperf !== null && reperf >= onsetH ? reperf - onsetH : null,
    decompression: input.decompression,
    occlusions: onsetPiece.active,
    hemo: hemoAcute,
    bedFinal,
    bedFinalUntreated,
    bedEarly: addLacunes(bedInfarctAt(course, onsetH + 14, untreated, x), course, onsetH + 14),
    regionAcute: regionAgg(acute),
    // a reocclusion closes the artery again, so the flow does not stay back
    flowReturnsH: episodeEndH === null || plan?.reocclusionH != null ? null : episodeEndH - onsetH,
    // left out for the default treatment, which keeps the former event texts exactly
    ...(cascadeTreatment ? { treatment: cascadeTreatment } : {}),
    lacunes: [...course.lacunes].filter(([, list]) => list.some((o) => o.severity >= 1)).map(([rid]) => rid),
    bedAtDecision: bedInfarctAt(untreated ?? course, decisionH),
    map: input.map,
  });
  const model: Model = {
    course,
    untreated,
    x,
    plan,
    occlusions,
    onsetH,
    finalH,
    hemoAcute,
    hemoAfter,
    edemaReperfusionH: episodeEndH === null ? null : episodeEndH - onsetH,
    cascade,
    unitSaved,
    shownCascade: shownCascadeOf(cascade, onsetH, onsetH > 0 ? prodromalEvents(input, course, finalH, onsetH, untreated, x) : []),
    hemoAt: hemoAtT,
  };
  if (modelCache.size > 200) modelCache.clear();
  modelCache.set(key, model);
  return model;
}

/** the cascade on the simulation clock, with the TIA stories of earlier, reopened attacks */
function shownCascadeOf(cascade: CascadeOutput, onsetH: number, earlier: CascadeEvent[]): CascadeOutput {
  const shown = onsetH === 0 ? cascade : shiftTimes(cascade, onsetH);
  if (!earlier.length) return shown;
  return { ...shown, events: [...earlier, ...shown.events].sort((a, b) => a.onsetH - b.onsetH) };
}

/** piece in which the latest occlusion start at or before t began (the episode in progress) */
function episodeIndex(input: SimInput, pieces: Piece[], tH: number): number {
  let s = -Infinity;
  for (const o of input.occlusions) if (startOf(o) <= tH) s = Math.max(s, startOf(o));
  return s === -Infinity ? 0 : pieceIndex(pieces, s);
}

function regionAgg(values: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of REGIONS) {
    let v = 0;
    let t = 0;
    for (const bid of r.beds) {
      const b = BED_BY_ID[bid];
      const w = b.volume > 0 ? b.volume : 1;
      v += (values[bid] ?? 0) * w;
      t += w;
    }
    out[r.id] = t > 0 ? v / t : 0;
  }
  return out;
}

const EFFECT_PRIORITY: BedEffectKind[] = ['secondary', 'compressed', 'degeneration', 'diaschisis'];

export function simulate(input: SimInput): SimResult {
  // ── schedule, flow per piece of the timeline, index onset and cascade (independent of t; cached) ──
  const model = modelFor(input);
  const { course, plan } = model;
  const units = course.units;
  const tAbs = input.tH;
  const reperf = input.reperfusionH;
  // when the treatment reopens occlusions (never, if it fails)
  const opensH = plan ? plan.opensH : null;
  // flow at the index onset, and after that episode first reopens (treatment or by itself)
  const { hemoAcute, hemoAfter } = model;
  const hemo = model.hemoAt(tAbs);
  // the episode in progress: its occlusions and flow name the vascular syndrome
  const episode = course.pieces[episodeIndex(input, course.pieces, tAbs)];
  const episodeHemo = model.hemoAt(episode.fromH);
  let activeOcclusions = activeAt(model.occlusions, tAbs, opensH);
  // a phase the treatment caused replaces an input phase of the same vessel in effect at the same time
  if (plan && plan.phases.length)
    activeOcclusions = activeOcclusions.filter((o) => causeOf(o) !== null || !activeOcclusions.some((p) => causeOf(p) !== null && p.vessel === o.vessel));
  // reopened (by treatment, or a complete occlusion by itself) and no complete occlusion left
  // (a branch blocked by a clot fragment does not undo the reopening of its parent)
  const recanalized =
    ((opensH !== null && tAbs >= opensH) || input.occlusions.some((o) => isTreatable(o) && statusAt(o, tAbs, opensH) === 'reopened')) &&
    !activeOcclusions.some((o) => isTreatable(o) && causeOf(o) !== 'distal_embolus');
  // lacunes: one branch of a perforator bundle → a small infarct in its target structure
  const lacunes = [...course.lacunes.keys()];
  const lacuneLoss: Record<string, number> = {};
  for (const rid of lacunes) lacuneLoss[rid] = lacuneLossAt(course, rid, tAbs);
  // the clinical clock: hours since the index onset (see the header); the cascade runs on it
  const t = Math.max(0, tAbs - model.onsetH);
  const cascade = model.cascade;

  // ── per-bed state at time t ──
  const beds: Record<string, BedTimeState> = {};
  for (const b of BEDS) {
    beds[b.id] = {
      rel: hemo.bedRel[b.id] ?? 1,
      frac: { normal: 0, oligemia: 0, penumbra: 0, core: 0, salvaged: 0 },
      infarct: 0,
      dys: 0,
      effect: null,
    };
  }
  // the reperfused share x of each unit follows the treated course; the rest keeps its clot and
  // follows the untreated course, where nothing is salvaged by treatment
  const { x, untreated } = model;
  units.forEach((u, i) => {
    const bs = beds[u.bed];
    const p = tissueParamsForBed(u.bed);
    if (x > 0) addUnitShare(bs, u.frac * x, course.histories[i], model.unitSaved[i], tAbs, p);
    if (x < 1 && untreated) addUnitShare(bs, u.frac * (1 - x), untreated.histories[i], 0, tAbs, p);
  });
  // regions whose damage comes from the lacune alone (before it is added)
  const lacuneOnly = lacunes.filter((rid) => {
    const r = REGION_BY_ID[rid];
    let d = 0;
    let w = 0;
    for (const bid of r.beds) {
      const bs = beds[bid];
      const vol = BED_BY_ID[bid].volume || 1;
      d += Math.max(bs.frac.core + bs.frac.penumbra, bs.infarct) * vol;
      w += vol;
    }
    return d / (w || 1) < 0.25;
  });
  for (const rid of lacunes) {
    const x = lacuneFraction(rid) * lacuneLoss[rid];
    for (const bid of REGION_BY_ID[rid].beds) {
      const bs = beds[bid];
      for (const k of Object.keys(bs.frac) as TissueState[]) bs.frac[k] *= 1 - x;
      bs.frac.core += x;
      bs.infarct += x * (1 - bs.infarct);
    }
  }
  // dysfunction caused directly by the arterial occlusion(s), before secondary effects
  // (herniation etc.) are overlaid — syndromes describe the primary vascular pattern,
  // the secondary damage is reported as cascade events instead
  const primaryDys: Record<string, number> = {};
  // tissue state for the oedema model, captured before secondary infarcts overwrite it
  const edemaBeds: Record<string, EdemaBedInput> = {};
  for (const b of BEDS) {
    const bs = beds[b.id];
    const sum = Object.values(bs.frac).reduce((a, x) => a + x, 0);
    if (sum === 0) bs.frac.normal = 1;
    primaryDys[b.id] = bs.frac.core + bs.frac.penumbra;
    const effects = (cascade.bedEffects[b.id] ?? []).filter((e) => e.onsetH <= t && t < (e.endH ?? Infinity));
    const eff = EFFECT_PRIORITY.find((k) => effects.some((e) => e.kind === k)) ?? null;
    edemaBeds[b.id] = {
      infarct: bs.infarct,
      penumbra: bs.frac.penumbra,
      salvaged: bs.frac.salvaged,
      relAcute: hemoAcute.bedRel[b.id] ?? 1,
      relAfter: hemoAfter.bedRel[b.id] ?? 1,
      secondaryOnsetH: effects.find((e) => e.kind === 'secondary')?.onsetH ?? null,
    };
    bs.effect = eff;
    if (eff === 'secondary') {
      bs.infarct = 1;
      bs.frac = { normal: 0, oligemia: 0, penumbra: 0, core: 1, salvaged: 0 };
    }
  }
  const edema = computeEdema({ tH: t, reperfusionH: model.edemaReperfusionH, decompression: input.decompression, beds: edemaBeds, cascade });
  const recoveryBeds: Record<string, RecoveryBedInput> = {};
  for (const b of BEDS) recoveryBeds[b.id] = { infarct: beds[b.id].infarct, penumbra: beds[b.id].frac.penumbra };
  const recovery = computeRecovery({ tH: t, beds: recoveryBeds, edema, cascade, lacunes, lacuneLoss });
  for (const b of BEDS) {
    const bs = beds[b.id];
    bs.dys = Math.min(1, bs.frac.core + bs.frac.penumbra + (recovery.extraDys[b.id] ?? 0));
  }

  // ── per-region ──
  const dysMap: Record<string, number> = {};
  const infMap: Record<string, number> = {};
  const relMap: Record<string, number> = {};
  for (const b of BEDS) {
    dysMap[b.id] = beds[b.id].dys;
    infMap[b.id] = beds[b.id].infarct;
    relMap[b.id] = beds[b.id].rel;
  }
  const rDys = regionAgg(dysMap);
  const rPrim = regionAgg(primaryDys);
  const rInf = regionAgg(infMap);
  const rRel = regionAgg(relMap);
  // a lacune is small but sits in a compact fibre tract: it knocks out most of its function
  for (const rid of lacunes) {
    const level = LACUNE_DYSFUNCTION * lacuneLoss[rid];
    rDys[rid] = Math.max(rDys[rid] ?? 0, level);
    rPrim[rid] = Math.max(rPrim[rid] ?? 0, level);
    rInf[rid] = Math.max(rInf[rid] ?? 0, level);
  }
  const regions: Record<string, RegionTimeState> = {};
  for (const r of REGIONS) {
    const acc: Record<string, number> = {};
    let effect: BedEffectKind | null = null;
    for (const bid of r.beds) {
      const bs = beds[bid];
      const w = BED_BY_ID[bid].volume || 1;
      for (const [k, v] of Object.entries(bs.frac)) acc[k] = (acc[k] ?? 0) + v * w;
      if (bs.effect && (!effect || EFFECT_PRIORITY.indexOf(bs.effect) < EFFECT_PRIORITY.indexOf(effect))) effect = bs.effect;
    }
    const order: TissueState[] = ['core', 'penumbra', 'salvaged', 'oligemia', 'normal'];
    const tot = Object.values(acc).reduce((a, x) => a + x, 0) || 1;
    let dominant: TissueState | BedEffectKind = 'normal';
    for (const k of order) {
      if ((acc[k] ?? 0) / tot >= (k === 'normal' ? 0 : 0.2)) {
        dominant = k;
        break;
      }
    }
    if (effect && (effect === 'secondary' || effect === 'compressed' || dominant === 'normal' || dominant === 'oligemia')) dominant = effect;
    regions[r.id] = { rel: rRel[r.id], infarct: rInf[r.id], dys: rDys[r.id], dominant, effect };
  }

  for (const rid of lacunes) {
    if (lacuneLoss[rid] >= 0.5 && regions[rid] && !regions[rid].effect) regions[rid].dominant = 'core';
  }

  // ── symptoms, NIHSS, syndromes ──
  const extra: SymptomItem[] = [];
  // only after a clear trigger, and only as possible (C3-F11)
  if (cascade.palatalTremorFromH !== null && t >= cascade.palatalTremorFromH) {
    extra.push({ id: 'palatal_tremor', side: null, sev: 1, sources: [], delayed: true });
  }
  for (const e of cascade.events) {
    if (!e.symptoms || e.onsetH > t || t >= (e.endH ?? Infinity)) continue;
    // a herniation coma lasts, after the oedema peak, only while the midline is still shifted
    // into the coma range: a survivor wakes as the swelling subsides (C4-F1)
    if (e.symptomsWhileShiftMm !== undefined && t >= (e.peakH ?? e.onsetH) && edema.midlineShiftMm < e.symptomsWhileShiftMm) continue;
    for (const sy of e.symptoms) {
      const sides: (Side | null)[] = sy.side === 'both' ? ['r', 'l'] : [sy.side];
      for (const sd of sides) extra.push({ id: sy.id, side: sd, sev: sy.sev, sources: [], delayed: false });
    }
  }
  // the level of consciousness follows the horizontal midline shift of a swollen hemisphere
  // (Ropper 1986; cascade.consciousnessFromShift), whatever event caused the swelling (C4-F2)
  const byShift = consciousnessFromShift(edema.midlineShiftMm);
  if (byShift) extra.push({ id: byShift.id, side: null, sev: byShift.sev, sources: [], delayed: false });
  const symptoms = aggregateSymptoms(rDys, rInf, t, extra, lacuneOnly);
  const affected = REGIONS.filter((r) => rDys[r.id] >= 0.2 || rInf[r.id] >= 0.2).map((r) => r.id);
  const nihss = estimateNihss(symptoms, affected);

  const occl = new Set(episode.active.filter((o) => o.severity >= 1).map((o) => o.vessel));
  const rev = new Set(episodeHemo.reversed);
  const idOf = (base: string, side?: Side | 'm') => (side && side !== 'm' ? `${base}_${side}` : base);
  const syndromes = detectSyndromes({
    f: (base, side) => rPrim[`${base}_${side}`] ?? 0,
    has: (base, side, thr = 0.25) => (rPrim[`${base}_${side}`] ?? 0) >= thr,
    hasAny: (bases, side, thr = 0.25) => bases.some((b) => (rPrim[`${b}_${side}`] ?? 0) >= thr),
    both: (base, thr = 0.25) => (rPrim[`${base}_r`] ?? 0) >= thr && (rPrim[`${base}_l`] ?? 0) >= thr,
    occluded: (base, side) => occl.has(idOf(base, side)) || (!side && (occl.has(`${base}_r`) || occl.has(`${base}_l`))),
    reversed: (base, side) => rev.has(idOf(base, side)),
    border: (side) => {
      let border = 0;
      let total = 0;
      const kinds = new Set<string>();
      for (const b of BEDS) {
        if (!b.region.endsWith(`_${side}`)) continue;
        const reg = REGION_BY_ID[b.region];
        if (!BRAIN.has(reg.category)) continue;
        const v = primaryDys[b.id] * b.volume;
        total += v;
        if (b.terr.length === 2 && v > 0) {
          border += v;
          kinds.add(b.terr.join('|'));
        }
      }
      return { border, total, kinds: [...kinds] };
    },
    cortexCount: (side, thr = 0.2) =>
      REGIONS.filter((r) => r.side === side && r.category === 'cortex' && rPrim[r.id] >= thr).length,
    map: input.map,
    sym: (id, side) =>
      symptoms
        .filter((x) => x.id === id && !x.delayed && (side === undefined || x.side === side || x.side === 'both'))
        .reduce((m, x) => Math.max(m, x.sev), 0),
  });

  // ── volumes ──
  let core = 0;
  let pen = 0;
  for (const b of BEDS) {
    if (!BRAIN.has(REGION_BY_ID[b.region].category)) continue;
    core += beds[b.id].infarct * b.volume;
    pen += beds[b.id].frac.penumbra * b.volume;
  }
  // everything that will eventually be dead, including secondary (herniation) infarcts
  const finalInfarct = cascade.volumes.withSecondary;
  return {
    input,
    hemo,
    activeOcclusions,
    recanalized,
    beds,
    regions,
    symptoms,
    nihss,
    syndromes,
    // on the simulation clock, like the timeline
    cascade: model.shownCascade,
    volumes: { core, penumbra: pen, finalInfarct, saved: cascade.savedVolume },
    neuronsLost: core * NEURONS_PER_ML,
    hydrocephalus: cascade.hydrocephalusOnsetH !== null && t >= cascade.hydrocephalusOnsetH && (cascade.hydrocephalusEndH === null || t < cascade.hydrocephalusEndH),
    edema,
    recovery,
    schedule: {
      onsetH: model.onsetH,
      finalH: model.finalH,
      events: scheduleEvents(input.occlusions, reperf, plan?.failed ?? false),
      status: input.occlusions.map((o) => {
        const s = statusAt(o, tAbs, opensH);
        // reopened by treatment, then closed again: in effect once more
        return s === 'treated' && reoccluded(plan, o, tAbs) ? 'active' : s;
      }),
    },
    treatment: plan
      ? {
          options: plan.options,
          reperfusedFraction: plan.x,
          reopened: [...new Set(plan.reopened.map((o) => o.vessel))],
          failed: plan.failed,
          reocclusionH: plan.reocclusionH,
          distalEmbolus: plan.distalEmbolus,
        }
      : null,
  };
}

/** the treatment reopened this occlusion and it has closed again by time t */
const reoccluded = (plan: TreatmentPlan | null, o: Occlusion, tH: number): boolean =>
  !!plan && plan.phases.some((p) => causeOf(p) === 'reocclusion' && p.vessel === o.vessel && inWindow(p, tH));

/** Quick "what happens if this vessel is blocked?" preview (24 h, untreated). */
export function previewOcclusion(vessel: string, base: Omit<SimInput, 'tH' | 'reperfusionH' | 'decompression'>): SimResult {
  const occ = base.occlusions.filter((o) => o.vessel !== vessel).concat([{ vessel, severity: 1 }]);
  return simulate({ ...base, occlusions: occ, tH: 24, reperfusionH: null, decompression: false });
}

export const isOccludable = (id: string) => {
  const v = VESSEL_BY_ID[id];
  return !!v && !v.visualOnly && !v.notOccludable;
};
