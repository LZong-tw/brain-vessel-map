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
 *     swell and evolve on the index clock (nothing before the index onset); only each region's
 *     late symptoms, compensation and coma relabelling count from when that region itself became
 *     ischaemic (R6-6), and the brainstem consciousness events follow the labels these give, so
 *     they run on that clock too (brainstemCourse, X2-11);
 *   • the final infarct is taken FINAL_H after the last occlusion start or reopening;
 *   • the acute deficit pattern and the flow the cascade sees are those of the index onset, and
 *     "reperfusion" for the oedema model is the first reopening (treatment or spontaneous) of
 *     that episode;
 *   • treatment given before the index onset does not count as treating it.
 * With a single onset at 0 these reduce to the former behaviour exactly.
 *
 * After a reopening (treatment, or an occlusion that ends), a deficit that cleared when blood
 * returned is not brought back by the swelling of the following days (heldReference, X2-9).
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
import type { DeficitRef, Side } from '../anatomy';
import {
  COMA_SHIFT_MM,
  UNCAL_ONSET_H,
  computeCascade,
  consciousnessFromShift,
  noInfarctEvents,
  symptomsAddedAt,
  type BedEffect,
  type BedEffectKind,
  type BrainstemCourse,
  type BrainstemSegment,
  type BrainstemState,
  type CascadeEvent,
  type CascadeInput,
  type CascadeOutput,
  type CascadeTreatment,
  type HerniationShift,
  type ListedCourse,
} from './cascade';
import {
  DYS_THR,
  byConsciousness,
  detectSyndromes,
  estimateNihss,
  lesionSymptoms,
  type BorderLevel,
  type NihssResult,
  type SymptomItem,
  type SyndromeMatch,
} from './clinical';
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
import { LACUNE_DYSFUNCTION, LACUNE_ML, canBeLacunar, lacuneSiteOf } from '../anatomy/lacunes';
import { DELAYED_ONSET_H } from '../anatomy/symptoms';
import { TIME_STOPS } from '../anatomy/timeline';
import { LOCKED_IN_BASES_FLOOR, isWatershedPicture } from '../anatomy/syndromes';
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
  /**
   * share of the bed whose penumbra has stabilised on collaterals (counted as oligaemia in
   * `frac`) and is still silent while it regains function (R6-11)
   */
  regaining: number;
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
  /**
   * what the lesion gives but cannot be examined at the patient's level of consciousness, so is
   * not in `symptoms` (stupor, coma, a disorder of consciousness: clinical.byConsciousness). It has
   * not gone: it is listed again once it can be examined (X1-2).
   */
  unexaminable: SymptomItem[];
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
 * Penumbra that survives on its collaterals without reperfusion regains its function over about
 * this many hours after it stabilises, rather than at once: an illustrative spread, so that a
 * region whose penumbra stabilises just before the perilesional oedema of the following days
 * silences it again does not lose and regain its deficit within a day (R6-11).
 */
const REGAIN_H = 12;
const smoothstep = (e0: number, e1: number, x: number) => {
  const u = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return u * u * (3 - 2 * u);
};

/**
 * Add one share of a unit's tissue state at time t to its bed; `frac` is the share's fraction of
 * the bed (the unit's fraction times the share). Of the tissue that survives reperfusion, only
 * `saved` (per unit of this share) is "salvaged".
 */
function addUnitShare(bs: BedTimeState, frac: number, history: FlowPhase[], saved: number, tH: number, p: TissueParams): void {
  const { f, rest, stabilisedH } = tissueCourse(history, tH, p);
  bs.frac.core += f * frac;
  if (stabilisedH !== undefined) bs.regaining += (1 - f) * frac * (1 - smoothstep(0, REGAIN_H, stabilisedH));
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

/** the region a lacunar (single-branch) occlusion hits: its lacune site's (anatomy/lacunes.ts), or null */
function lacuneRegionOf(o: Occlusion): string | null {
  const v = VESSEL_BY_ID[o.vessel];
  if (!o.branch || !v || !canBeLacunar(v.baseId, v.n) || v.side === 'm') return null;
  const rid = `${lacuneSiteOf(v.baseId, o.lacuneSite)!.region}_${v.side}`;
  return REGION_BY_ID[rid] ? rid : null;
}

/** target regions of lacunar (single-branch) occlusions */
function lacuneRegions(occlusions: Occlusion[]): Map<string, Occlusion[]> {
  const out = new Map<string, Occlusion[]>();
  for (const o of occlusions) {
    const rid = lacuneRegionOf(o);
    if (!rid) continue;
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

/**
 * a lacunar occlusion of region `rid` is in effect at time t: its tissue is ischaemic, and silent,
 * from the moment the branch closes, not only once it has died (C6-F2). A treatment never reopens
 * a single branch (schedule.isTreatable), so only its own window counts.
 */
const lacuneActiveAt = (course: Course, rid: string, tH: number): boolean => (course.lacunes.get(rid) ?? []).some((o) => inWindow(o, tH));

/**
 * the deficit lists of the lacune sites that have their own (anatomy/lacunes.ts), per target
 * region; two lacunes at different sites of one region add up
 */
function lacuneDeficitsOf(course: Course): Record<string, DeficitRef[]> {
  const out: Record<string, DeficitRef[]> = {};
  for (const [rid, list] of course.lacunes) {
    const lists = list.map((o) => lacuneSiteOf(VESSEL_BY_ID[o.vessel].baseId, o.lacuneSite)!.deficits);
    // a site without a list of its own uses the region's (with the functions spared in a lacune)
    if (lists.some((l) => !l)) continue;
    out[rid] = [...new Set(lists.flatMap((l) => l!))];
  }
  return out;
}

/** fraction of a region occupied by one lacune */
const lacuneFraction = (rid: string) => Math.min(1, LACUNE_ML / Math.max(REGION_BY_ID[rid].volume, LACUNE_ML));

/** dead tissue (mL) below which an attack left no infarct (as the cascade's "ischaemia without infarct") */
const NO_INFARCT_ML = 0.05;
/**
 * a single-branch occlusion that reopens by itself before its lacune has died: a TIA, not an
 * infarcting attack (R2-2). The tissue stops dying once the branch reopens.
 */
function transientBranch(o: Occlusion): boolean {
  const rid = lacuneRegionOf(o);
  const e = endOf(o);
  if (!rid || e === null) return false;
  return lacuneFraction(rid) * REGION_BY_ID[rid].volume * infarctFractionOf(branchHistory(o), e) < NO_INFARCT_ML;
}

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
 * The TIA story for each attack that began before the index onset, reopened by itself and left no
 * infarct while it made brain tissue ischaemic (such as the prodromal attack of a progressive
 * basilar thrombosis: Ferbert A et al. Stroke 1990;21:1135–1142; von Campe G et al. J Neurol
 * Neurosurg Psychiatry 2003;74:1621–1626). An attack is a complete occlusion (C3-F8) or one of a
 * single branch, which the flow model does not see but whose tissue stops working while it is shut
 * (C6-F2): the crescendo of capsular or pontine attacks before a lacunar stroke (Donnan GA et al.
 * Neurology 1993;43:957–962) is a run of TIAs, each an emergency. Each story is cut off where the
 * next attack begins. Simulation clock.
 */
function prodromalEvents(input: SimInput, course: Course, finalH: number, onsetH: number, other: Course | null, x: number): CascadeEvent[] {
  const credit = startCredits(input, course, finalH, other, x);
  const attack = (o: Occlusion) => isTreatable(o) || (!!o.branch && o.severity >= 1);
  const attackStarts = [...new Set(input.occlusions.filter(attack).map(startOf))].sort((a, b) => a - b);
  // a single branch shut at `h` whose tissue the brain story covers (as for lacuneIschaemia)
  const branchIschaemicAt = (h: number) =>
    [...course.lacunes].some(
      ([rid, list]) => (BRAIN.has(REGION_BY_ID[rid].category) || REGION_BY_ID[rid].category === 'ear') && list.some((o) => startOf(o) === h && inWindow(o, h)),
    );
  const out: CascadeEvent[] = [];
  for (const s of attackStarts) {
    if (s >= onsetH) break;
    const reopens = input.occlusions.some((o) => attack(o) && startOf(o) === s && endOf(o) !== null);
    if (!reopens || (credit.get(s) ?? 0) >= ONSET_MIN_ML || !(ischaemicAt(course, s) || branchIschaemicAt(s))) continue;
    const next = attackStarts.find((h) => h > s) ?? onsetH;
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
  /**
   * the region dysfunction at the index onset (core + penumbra in the first hour; a lacune whose
   * branch is closed then, at its level): the early picture that predicts late consequences
   */
  regionAcute: Record<string, number>;
  /**
   * replaces `cascade` and `shownCascade` with the second pass, whose aspiration warning and
   * cardiac severity read the sampled symptom list (R3-1, R3-4) and whose brainstem consciousness
   * events follow the sampled labels (X2-10); nothing per-time depends on what it changes (those
   * events add no symptoms), so the per-time state may use the first pass
   */
  finish: () => void;
  /**
   * per region, the occlusion starts (simulation clock) at which it became ischaemic, when the
   * schedule has more than one start; null otherwise (every lesion then dates from the index onset)
   */
  regionStarts: Record<string, number[]> | null;
  /**
   * when blood returns (simulation clock, sorted): the treatment reopening (when it reopens
   * something), an occlusion (or a phase the treatment caused) that ends; after each, a deficit
   * that cleared then is not brought back by the swelling (heldReference, X2-9)
   */
  reopenings: number[];
  /** the deficits that cleared at each reopening, filled in when first needed (heldReference) */
  heldAt: Map<number, HeldReference>;
  /**
   * per region, every start of an occlusion phase (the input's and those the treatment caused,
   * simulation clock) at which it became ischaemic: a new lesion, which the hold does not cover
   */
  ischaemiaStarts: Record<string, number[]>;
}

const modelCache = new Map<string, Model>();

function modelKey(input: SimInput): string {
  const occ = input.occlusions.map((o) => `${o.vessel}:${o.severity}:${o.branch ? `b${o.lacuneSite ?? ''}` : ''}:${startOf(o)}:${endOf(o)}`).join(',');
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

  const bedFinalNoLacune = bedInfarctAt(course, finalH, untreated, x);
  const bedFinal = addLacunes(bedFinalNoLacune, course, finalH);
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
  const regionAcute = regionAgg(acute);
  // regions whose final damage is a lacune alone: the level the symptoms see there, and the
  // site's own deficit list (so a late event follows the late symptom exactly, C10-F2)
  const finalNoLacune = regionAgg(bedFinalNoLacune);
  const siteLists = lacuneDeficitsOf(course);
  const lacuneFinal: Record<string, { level: number; deficits?: DeficitRef[] }> = {};
  for (const rid of course.lacunes.keys()) {
    const loss = lacuneLossAt(course, rid, finalH);
    if (loss <= 0 || finalNoLacune[rid] >= 0.25) continue;
    lacuneFinal[rid] = siteLists[rid] ? { level: LACUNE_DYSFUNCTION * loss, deficits: siteLists[rid] } : { level: LACUNE_DYSFUNCTION * loss };
  }
  const acuteDys = { ...regionAcute };
  for (const rid of course.lacunes.keys()) if (lacuneActiveAt(course, rid, onsetH)) acuteDys[rid] = Math.max(acuteDys[rid] ?? 0, LACUNE_DYSFUNCTION);
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
  const cascadeInput: CascadeInput = {
    reperfusionH: reperf !== null && reperf >= onsetH ? reperf - onsetH : null,
    decompression: input.decompression,
    occlusions: onsetPiece.active,
    hemo: hemoAcute,
    bedFinal,
    bedFinalUntreated,
    bedEarly: addLacunes(bedInfarctAt(course, onsetH + 14, untreated, x), course, onsetH + 14),
    regionAcute,
    lacuneFinal,
    // a single branch changes no flow the model sees, yet its brain tissue is ischaemic (C6-F2);
    // so is the inner ear behind one labyrinthine branch, which gets the inner-ear story (C7-F7)
    lacuneIschaemia: [...course.lacunes.keys()].filter(
      (rid) => (BRAIN.has(REGION_BY_ID[rid].category) || REGION_BY_ID[rid].category === 'ear') && lacuneActiveAt(course, rid, onsetH),
    ),
    // a reocclusion closes the artery again, so the flow does not stay back
    flowReturnsH: episodeEndH === null || plan?.reocclusionH != null ? null : episodeEndH - onsetH,
    // left out for the default treatment, which keeps the former event texts exactly
    ...(cascadeTreatment ? { treatment: cascadeTreatment } : {}),
    bedAtDecision: bedInfarctAt(untreated ?? course, decisionH),
    map: input.map,
  };
  const edemaReperfusionH = episodeEndH === null ? null : episodeEndH - onsetH;
  // first pass: everything but what reads the symptom list (the aspiration warning and the
  // cardiac severity carry no symptoms, so the list sampled below is the same with either pass),
  // with the uncal herniations timed by the oedema model's midline shift (R6-5)
  const { cascade, input: shiftedInput } = herniationFollowsShift(
    computeCascade(cascadeInput),
    cascadeInput,
    { course, untreated, x, unitSaved, hemoAcute, hemoAfter, onsetH, edemaReperfusionH },
    input.decompression,
  );
  const prodromal = onsetH > 0 ? prodromalEvents(input, course, finalH, onsetH, untreated, x) : [];
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
    edemaReperfusionH,
    cascade,
    unitSaved,
    shownCascade: shownCascadeOf(cascade, onsetH, prodromal),
    hemoAt: hemoAtT,
    regionAcute: acuteDys,
    finish: () => {},
    regionStarts: regionIschaemiaStarts(input, course, hemoAtT),
    reopenings: reopeningTimes(occlusions, plan && plan.reopened.length ? opensH : null),
    heldAt: new Map(),
    ischaemiaStarts: ischaemiaStartsOf([...new Set(occlusions.map(startOf))].sort((a, b) => a - b), course, hemoAtT),
  };
  if (modelCache.size > 200) modelCache.clear();
  modelCache.set(key, model);
  // second pass (R3-1): the events that follow the symptom list, read from the list itself; made
  // when a result's cascade is first read, since sampling the list costs about as much as the rest
  // of the model and many callers need only the symptoms
  let done = false;
  model.finish = () => {
    if (done) return;
    done = true;
    const second = computeCascade({ ...shiftedInput, listed: { ...listedCourse(input, onsetH), brainstem: brainstemCourse(input, model) } });
    model.cascade = second;
    model.shownCascade = shownCascadeOf(second, onsetH, prodromal);
  };
  return model;
}

/** what makes swallowing unsafe: a reduced level of consciousness */
const DROWSY_IDS = ['coma', 'somnolence', 'disorder_of_consciousness'];
/** … of which stupor or coma (NIHSS 1a ≥ 2), or a disorder of consciousness, is a severe stroke */
const comaLike = (s: SymptomItem) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness';
/** the first two weeks, in which the aspiration and cardiac warnings run */
const LISTED_WINDOW_H = 336;

/**
 * When the symptom list first shows dysphagia, reduced consciousness, or stupor and coma in the
 * first two weeks after the index onset (clinical clock), sampled at the time stops a learner can
 * see: those of the clinical clock and those of the simulation clock from the onset on. Runs on a
 * cached model (its first-pass cascade), so each sample costs only the per-time part.
 */
function listedCourse(input: SimInput, onsetH: number): ListedCourse {
  const times = new Set<number>();
  for (const s of TIME_STOPS) {
    if (s.h < LISTED_WINDOW_H) times.add(onsetH + s.h);
    if (s.h >= onsetH && s.h - onsetH < LISTED_WINDOW_H) times.add(s.h);
  }
  const out: ListedCourse = { dysphagiaFromH: null, drowsyFromH: null, comaFromH: null, dysphagiaRegions: [] };
  const regions = new Set<string>();
  for (const tAbs of [...times].sort((a, b) => a - b)) {
    const h = tAbs - onsetH;
    for (const s of symptomsAt({ ...input, tH: tAbs })) {
      if (s.id === 'dysphagia') {
        out.dysphagiaFromH ??= h;
        for (const r of s.sources) regions.add(r);
      }
      if (DROWSY_IDS.includes(s.id)) out.drowsyFromH ??= h;
      if (comaLike(s)) out.comaFromH ??= h;
    }
  }
  out.dysphagiaRegions = [...regions];
  return out;
}

/** the labels of the bilateral ventral pons and the state of the brainstem course each names (cascade.brainstemEvents) */
const BRAINSTEM_LABELS: [string, BrainstemState][] = [
  ['basilar_coma', 'coma'],
  ['pontine_doc', 'doc'],
  ['locked_in', 'classical'],
  ['locked_in_incomplete', 'incomplete'],
];
const PONS_BASES: [string, string][] = [
  ['pons_rostral_basis_r', 'pons_rostral_basis_l'],
  ['pons_caudal_basis_r', 'pons_caudal_basis_l'],
];
/** the arousal network whose coma is relabelled two weeks after its own lesion began (clinical.ts) */
const AROUSAL = ['pons_rostral_tegmentum_r', 'pons_rostral_tegmentum_l', 'midbrain_paramedian_r', 'midbrain_paramedian_l'];
/** a change of state between two samples is placed to within (gap / 2^BRAINSTEM_BISECT) */
const BRAINSTEM_BISECT = 8;

/**
 * The brainstem consciousness course the labels show (X2-7, X2-10, X2-11, X2-15), for the second
 * pass of the cascade: which of coma with quadriplegia, a disorder of consciousness, classical and
 * incomplete locked-in syndrome the labels name, and from when to when. Sampled at the time stops
 * of both clocks, when blood returns, and when the ventral pons and the arousal network became
 * ischaemic and two weeks later (when a coma is relabelled, by the lesion's own age: R6-6); a
 * change between two samples is found by bisection. Null when the ventral pons is never
 * ischaemic on both sides as far as these labels reach (no such label, no sampling).
 */
function brainstemCourse(input: SimInput, model: Model): BrainstemCourse | null {
  const starts = model.ischaemiaStarts;
  // both ventral halves ischaemic at some start, at least as far as the incomplete locked-in label reaches
  const allStarts = [...new Set(model.occlusions.map(startOf))].sort((a, b) => a - b);
  const bilateralAt = allStarts.filter((s) => {
    const lv = ischaemicLevels(model.course, model.hemoAt, s);
    return PONS_BASES.some(([r, l]) => (lv[r] ?? 0) >= LOCKED_IN_BASES_FLOOR - 1e-6 && (lv[l] ?? 0) >= LOCKED_IN_BASES_FLOOR - 1e-6);
  });
  if (!bilateralAt.length) return null;
  const lesionStarts = [...new Set([...bilateralAt, ...PONS_BASES.flat().flatMap((rid) => starts[rid] ?? [])])].sort((a, b) => a - b);
  const times = new Set<number>([0, ...model.reopenings]);
  for (const s of [...lesionStarts, ...AROUSAL.flatMap((rid) => starts[rid] ?? [])]) {
    times.add(s);
    times.add(s + DELAYED_ONSET_H);
  }
  for (const s of TIME_STOPS) {
    times.add(s.h);
    times.add(model.onsetH + s.h);
  }
  const memo = new Map<number, BrainstemState | null>();
  const stateAt = (h: number): BrainstemState | null => {
    if (!memo.has(h)) {
      const r = run({ ...input, tH: h }, false);
      memo.set(h, BRAINSTEM_LABELS.find(([id]) => r.syndromes.some((m) => m.def.id === id))?.[1] ?? null);
    }
    return memo.get(h)!;
  };
  const sorted = [...times].filter((h) => h >= 0).sort((a, b) => a - b);
  const points: [number, BrainstemState | null][] = [];
  for (const h of sorted) {
    const st = stateAt(h);
    const last = points[points.length - 1];
    if (last && last[1] !== st) {
      // the change lies in (last, h]: found by bisection (a change at a sampled reopening or at a
      // lesion's two weeks stays exactly there)
      let lo = last[0];
      let hi = h;
      for (let k = 0; k < BRAINSTEM_BISECT; k++) {
        const m = (lo + hi) / 2;
        if (stateAt(m) === last[1]) lo = m;
        else hi = m;
      }
      if (hi < h) points.push([hi, stateAt(hi)]);
    }
    points.push([h, st]);
  }
  const segments: BrainstemSegment[] = [];
  for (let i = 0; i < points.length; i++) {
    const [h, st] = points[i];
    if (i > 0 && points[i - 1][1] === st) continue;
    const open = segments[segments.length - 1];
    if (open && open.untilH === null) open.untilH = h - model.onsetH;
    if (st === null) continue;
    const lesion = lesionStarts.filter((s) => s <= h).pop() ?? lesionStarts[0];
    segments.push({ state: st, fromH: h - model.onsetH, untilH: null, lesionOnsetH: lesion - model.onsetH });
  }
  return { segments, reopenH: model.reopenings.map((h) => h - model.onsetH) };
}

/** what the oedema model needs of a model to give the midline shift at any time */
type ShiftModel = TissueModel & Pick<Model, 'hemoAcute' | 'hemoAfter' | 'onsetH' | 'edemaReperfusionH'>;

/** the oedema model's midline shift (mm) and the side it comes from, `t` h after the index onset */
function shiftAt(model: ShiftModel, cascade: CascadeOutput, decompression: boolean, t: number): { mm: number; from: Side | null } {
  const { beds } = tissueAt(model, t + model.onsetH, null);
  const edemaBeds: Record<string, EdemaBedInput> = {};
  for (const b of BEDS) edemaBeds[b.id] = edemaBedOf(model, b.id, beds[b.id], effectsAt(cascade, b.id, t));
  const e = computeEdema({ tH: t, reperfusionH: model.edemaReperfusionH, decompression, beds: edemaBeds, cascade });
  return { mm: e.midlineShiftMm, from: e.shiftFrom };
}

/** the shift is sampled this often (h, clinical clock) up to the horizon, and the crossings refined to about 0.1 h */
const SHIFT_STEP_H = 6;
const SHIFT_HORIZON_H = 720;
const SHIFT_BISECT = 6;

/**
 * For each side whose malignant oedema the cascade lets herniate: the largest midline shift, when
 * it first reaches the coma range and when, after the herniation began, it falls below it again
 * (cascade.CascadeInput.shift; R6-5, R6-2).
 */
function herniationShifts(model: ShiftModel, cascade: CascadeOutput, decompression: boolean, sides: Side[]): Partial<Record<Side, HerniationShift>> {
  const memo = new Map<number, { mm: number; from: Side | null }>();
  const at = (t: number) => {
    let v = memo.get(t);
    if (!v) memo.set(t, (v = shiftAt(model, cascade, decompression, t)));
    return v;
  };
  const out: Partial<Record<Side, HerniationShift>> = {};
  for (const s of sides) {
    const inComa = (t: number) => at(t).from === s && at(t).mm >= COMA_SHIFT_MM;
    // the first time in (a, b] with the value inComa(b) has, where inComa(a) differs from it
    const edge = (a: number, b: number) => {
      const before = inComa(a);
      for (let k = 0; k < SHIFT_BISECT; k++) {
        const m = (a + b) / 2;
        if (inComa(m) === before) a = m;
        else b = m;
      }
      return b;
    };
    let peakMm = 0;
    let peakT = 0;
    let comaFromH: number | null = null;
    for (let t = SHIFT_STEP_H; t <= SHIFT_HORIZON_H; t += SHIFT_STEP_H) {
      const v = at(t);
      if (v.from === s && v.mm > peakMm) [peakMm, peakT] = [v.mm, t];
      if (comaFromH === null && inComa(t)) comaFromH = edge(t - SHIFT_STEP_H, t);
    }
    // the peak between the samples, near enough for the text (a tenth of a millimetre)
    if (peakT > 0)
      for (const d of [-SHIFT_STEP_H / 2, SHIFT_STEP_H / 2, -SHIFT_STEP_H / 4, SHIFT_STEP_H / 4]) {
        const v = at(peakT + d);
        if (v.from === s && v.mm > peakMm) peakMm = v.mm;
      }
    let comaUntilH: number | null = null;
    if (comaFromH !== null) {
      const onset = Math.max(UNCAL_ONSET_H, comaFromH);
      if (!inComa(onset)) comaUntilH = onset;
      else
        for (let t = Math.ceil(onset / SHIFT_STEP_H) * SHIFT_STEP_H; t <= SHIFT_HORIZON_H; t += SHIFT_STEP_H)
          if (t > onset && !inComa(t)) {
            comaUntilH = edge(Math.max(onset, t - SHIFT_STEP_H), t);
            break;
          }
    }
    out[s] = { peakMm, comaFromH, comaUntilH };
  }
  return out;
}

/**
 * The cascade with its uncal herniations timed by the oedema model's midline shift: none without
 * a shift into the coma range, later when the shift gets there later, ending when it leaves it
 * (R6-5, R6-2). Whether it herniates is read from the swelling of the infarct itself (without the
 * herniation's own secondary infarcts); the timing, once it does, from the swelling with them.
 */
function herniationFollowsShift(
  cascade: CascadeOutput,
  input: CascadeInput,
  model: ShiftModel,
  decompression: boolean,
): { cascade: CascadeOutput; input: CascadeInput } {
  const sides = (['r', 'l'] as Side[]).filter((s) => cascade.events.some((e) => e.id === `uncal_${s}`));
  if (!sides.length) return { cascade, input };
  const herniation = /^(uncal|subfalcine)_/;
  const bedEffects: Record<string, BedEffect[]> = {};
  for (const [id, list] of Object.entries(cascade.bedEffects)) bedEffects[id] = list.filter((e) => !herniation.test(e.event));
  const primary = herniationShifts(model, { ...cascade, bedEffects }, decompression, sides);
  const firstInput = { ...input, shift: primary };
  const next = computeCascade(firstInput);
  const still = sides.filter((s) => next.events.some((e) => e.id === `uncal_${s}`));
  if (!still.length) return { cascade: next, input: firstInput };
  // the input is returned too, so that the second pass (R3-1) keeps the same herniation timing
  const finalInput = { ...input, shift: { ...primary, ...herniationShifts(model, next, decompression, still) } };
  return { cascade: computeCascade(finalInput), input: finalInput };
}

/**
 * When each region became ischaemic (R6-6): the occlusion starts of the input schedule at which
 * its acutely dysfunctional share (core + penumbra; a lacune whose branch closes) rises from below
 * the symptom threshold to above it. Only for a schedule with more than one start: with one, every
 * lesion dates from the index onset.
 */
function regionIschaemiaStarts(input: SimInput, course: Course, hemoAt: (tH: number) => HemoResult): Record<string, number[]> | null {
  const starts = [...new Set(input.occlusions.map(startOf))].sort((a, b) => a - b);
  if (starts.length <= 1) return null;
  return ischaemiaStartsOf(starts, course, hemoAt);
}

/** per region, its acutely dysfunctional share at `h` (core + penumbra; a lacune whose branch is closed) */
function ischaemicLevels(course: Course, hemoAt: (tH: number) => HemoResult, h: number): Record<string, number> {
  if (h < 0) return {};
  const hemo = hemoAt(h);
  const acute: Record<string, number> = {};
  for (const u of course.units) if ((hemo.unitRel[u.id] ?? 1) < tissueParamsForBed(u.bed).penumbraRel) acute[u.bed] = (acute[u.bed] ?? 0) + u.frac;
  const out = regionAgg(acute);
  for (const rid of course.lacunes.keys()) if (lacuneActiveAt(course, rid, h)) out[rid] = Math.max(out[rid] ?? 0, LACUNE_DYSFUNCTION);
  return out;
}

/** per region, the times among `starts` at which its acutely dysfunctional share rises from below the symptom threshold to above it */
function ischaemiaStartsOf(starts: number[], course: Course, hemoAt: (tH: number) => HemoResult): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const s of starts) {
    const before = ischaemicLevels(course, hemoAt, s - 1e-6);
    const now = ischaemicLevels(course, hemoAt, s);
    for (const [rid, v] of Object.entries(now)) if (v >= DYS_THR - 1e-6 && (before[rid] ?? 0) < DYS_THR - 1e-6) (out[rid] ??= []).push(s);
  }
  return out;
}

/** when blood returns (see Model.reopenings): the treatment's reopening (null: it reopens nothing), and the end of every phase that ends */
function reopeningTimes(occlusions: Occlusion[], opensH: number | null): number[] {
  const out = new Set<number>();
  if (opensH !== null) out.add(opensH);
  for (const o of occlusions) {
    const e = endOf(o);
    if (e !== null && e > startOf(o)) out.add(e);
  }
  return [...out].sort((a, b) => a - b);
}

/** hours since each region last became ischaemic, at `tAbs` (simulation clock; R6-6) */
function regionAgesAt(starts: Record<string, number[]> | null, tAbs: number): Record<string, number> | undefined {
  if (!starts) return undefined;
  const out: Record<string, number> = {};
  for (const [rid, list] of Object.entries(starts)) {
    const s = list.filter((h) => h <= tAbs).pop();
    if (s !== undefined) out[rid] = tAbs - s;
  }
  return out;
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

/** what the model's courses and lacunes need to give the tissue at any time */
type TissueModel = Pick<Model, 'course' | 'untreated' | 'x' | 'unitSaved'>;

interface TissueSnapshot {
  /** per bed, before any cascade effect (secondary infarcts, compression) is overlaid */
  beds: Record<string, BedTimeState>;
  /** dead share of each lacune */
  lacuneLoss: Record<string, number>;
  /** ischaemic but not (yet) dead share of each lacune: its branch is closed now */
  lacuneIsch: Record<string, number>;
  /** regions whose damage comes from the lacune alone */
  lacuneOnly: string[];
}

/**
 * The tissue of every bed at `tAbs` (simulation clock): each unit's share on the treated and
 * untreated courses, then the lacunes. `hemo` gives the flow shown (null: not needed).
 */
function tissueAt(model: TissueModel, tAbs: number, hemo: HemoResult | null): TissueSnapshot {
  const { course, x, untreated } = model;
  const beds: Record<string, BedTimeState> = {};
  for (const b of BEDS) {
    beds[b.id] = {
      rel: hemo?.bedRel[b.id] ?? 1,
      frac: { normal: 0, oligemia: 0, penumbra: 0, core: 0, salvaged: 0 },
      regaining: 0,
      infarct: 0,
      dys: 0,
      effect: null,
    };
  }
  // the reperfused share x of each unit follows the treated course; the rest keeps its clot and
  // follows the untreated course, where nothing is salvaged by treatment
  course.units.forEach((u, i) => {
    const bs = beds[u.bed];
    const p = tissueParamsForBed(u.bed);
    if (x > 0) addUnitShare(bs, u.frac * x, course.histories[i], model.unitSaved[i], tAbs, p);
    if (x < 1 && untreated) addUnitShare(bs, u.frac * (1 - x), untreated.histories[i], 0, tAbs, p);
  });
  const lacunes = [...course.lacunes.keys()];
  const lacuneLoss: Record<string, number> = {};
  const lacuneIsch: Record<string, number> = {};
  for (const rid of lacunes) {
    lacuneLoss[rid] = lacuneLossAt(course, rid, tAbs);
    lacuneIsch[rid] = lacuneActiveAt(course, rid, tAbs) ? 1 - lacuneLoss[rid] : 0;
  }
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
    const xl = lacuneFraction(rid) * lacuneLoss[rid];
    // the part of the lacune that is ischaemic but still alive while its branch is closed
    const p = lacuneFraction(rid) * lacuneIsch[rid];
    for (const bid of REGION_BY_ID[rid].beds) {
      const bs = beds[bid];
      for (const k of Object.keys(bs.frac) as TissueState[]) bs.frac[k] *= 1 - xl - p;
      bs.regaining *= 1 - xl - p;
      bs.frac.core += xl;
      bs.frac.penumbra += p;
      bs.infarct += xl * (1 - bs.infarct);
    }
  }
  for (const b of BEDS) {
    const bs = beds[b.id];
    if (Object.values(bs.frac).reduce((a, v) => a + v, 0) === 0) bs.frac.normal = 1;
  }
  return { beds, lacuneLoss, lacuneIsch, lacuneOnly };
}

/** the cascade's effects on one bed in force at `t` (clinical clock) */
const effectsAt = (cascade: CascadeOutput, bedId: string, t: number) =>
  (cascade.bedEffects[bedId] ?? []).filter((e) => e.onsetH <= t && t < (e.endH ?? Infinity));

/** one bed's input to the oedema model, from its tissue before secondary infarcts overwrite it */
const edemaBedOf = (model: Pick<Model, 'hemoAcute' | 'hemoAfter'>, bedId: string, bs: BedTimeState, effects: BedEffect[]): EdemaBedInput => ({
  infarct: bs.infarct,
  penumbra: bs.frac.penumbra,
  salvaged: bs.frac.salvaged,
  relAcute: model.hemoAcute.bedRel[bedId] ?? 1,
  relAfter: model.hemoAfter.bedRel[bedId] ?? 1,
  secondaryOnsetH: effects.find((e) => e.kind === 'secondary')?.onsetH ?? null,
});

/** the ACA–MCA border-zone beds of one region (C1-F6): their levels, and their share of its dysfunction */
interface BorderBeds {
  dys: number;
  inf: number;
  share: number;
  /** dysfunction from the tissue itself, without the passing perilesional and remote depression */
  base: number;
}

/** What every region does at one time, before the symptom list is made from it (see run). */
interface Levels {
  /** clinical clock */
  t: number;
  beds: Record<string, BedTimeState>;
  edema: EdemaState;
  recovery: RecoveryState;
  regionAgeH: Record<string, number> | undefined;
  /** dysfunction (core, penumbra, still regaining, a lacune, and the passing depression of recovery.extraDys) */
  rDys: Record<string, number>;
  /** the primary vascular pattern (before secondary infarcts) the syndrome rules read */
  rPrim: Record<string, number>;
  rInf: Record<string, number>;
  rRel: Record<string, number>;
  /** rDys without the passing perilesional and remote depression (secondary infarcts included) */
  rBase: Record<string, number>;
  lacuneLoss: Record<string, number>;
  lacuneIsch: Record<string, number>;
  lacuneOnly: string[];
  borderBySide: Record<Side, { border: number; total: number; kinds: string[] }>;
  /** every region with border-zone deficits (C1-F6), whatever the picture of its hemisphere */
  border: Record<string, BorderBeds>;
}

function levelsAt(model: Model, input: SimInput, tAbs: number, hemo: HemoResult | null): Levels {
  const { course } = model;
  const cascade = model.cascade;
  const t = Math.max(0, tAbs - model.onsetH);
  const lacunes = [...course.lacunes.keys()];
  const { beds, lacuneLoss, lacuneIsch, lacuneOnly } = tissueAt(model, tAbs, hemo);
  // dysfunction caused directly by the arterial occlusion(s), before secondary effects
  // (herniation etc.) are overlaid — syndromes describe the primary vascular pattern,
  // the secondary damage is reported as cascade events instead
  const primaryDys: Record<string, number> = {};
  // tissue state for the oedema model, captured before secondary infarcts overwrite it
  const edemaBeds: Record<string, EdemaBedInput> = {};
  for (const b of BEDS) {
    const bs = beds[b.id];
    primaryDys[b.id] = bs.frac.core + bs.frac.penumbra + bs.regaining;
    const effects = effectsAt(cascade, b.id, t);
    const eff = EFFECT_PRIORITY.find((k) => effects.some((e) => e.kind === k)) ?? null;
    edemaBeds[b.id] = edemaBedOf(model, b.id, bs, effects);
    bs.effect = eff;
    if (eff === 'secondary') {
      bs.infarct = 1;
      bs.frac = { normal: 0, oligemia: 0, penumbra: 0, core: 1, salvaged: 0 };
      bs.regaining = 0;
    }
  }
  const edema = computeEdema({ tH: t, reperfusionH: model.edemaReperfusionH, decompression: input.decompression, beds: edemaBeds, cascade });
  const recoveryBeds: Record<string, RecoveryBedInput> = {};
  // (the stabilised penumbra still regaining function is silent, as the penumbra is)
  for (const b of BEDS) recoveryBeds[b.id] = { infarct: beds[b.id].infarct, penumbra: beds[b.id].frac.penumbra + beds[b.id].regaining };
  // each region's lesion has its own age when a later occlusion caused it (R6-6)
  const regionAgeH = regionAgesAt(model.regionStarts, tAbs);
  const recovery = computeRecovery({ tH: t, beds: recoveryBeds, edema, cascade, lacunes, lacuneLoss, regionAgeH });
  const baseMap: Record<string, number> = {};
  for (const b of BEDS) {
    const bs = beds[b.id];
    baseMap[b.id] = Math.min(1, bs.frac.core + bs.frac.penumbra + bs.regaining);
    bs.dys = Math.min(1, baseMap[b.id] + (recovery.extraDys[b.id] ?? 0));
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
  const rBase = regionAgg(baseMap);
  // a lacune is small but sits in a compact fibre tract: it knocks out most of its function, from
  // the moment its branch closes (ischaemic tissue is silent too) — so a branch that reopens
  // within minutes gives a fully reversible deficit, a capsular TIA (C6-F2)
  for (const rid of lacunes) {
    const dead = LACUNE_DYSFUNCTION * lacuneLoss[rid];
    const level = LACUNE_DYSFUNCTION * (lacuneLoss[rid] + lacuneIsch[rid]);
    rDys[rid] = Math.max(rDys[rid] ?? 0, level);
    rPrim[rid] = Math.max(rPrim[rid] ?? 0, level);
    rBase[rid] = Math.max(rBase[rid] ?? 0, level);
    rInf[rid] = Math.max(rInf[rid] ?? 0, dead);
  }
  // affected volume in border-zone beds of a hemisphere and in total (primary vascular pattern)
  const borderOf = (side: Side) => {
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
  };
  const borderBySide = { r: borderOf('r'), l: borderOf('l') };
  const border: Record<string, BorderBeds> = {};
  for (const r of REGIONS) {
    if (!r.borderDeficits || r.side === 'm') continue;
    let vol = 0;
    let dysVol = 0;
    let infVol = 0;
    let baseVol = 0;
    let allDysVol = 0;
    for (const bid of r.beds) {
      const bed = BED_BY_ID[bid];
      const w = bed.volume || 1;
      allDysVol += beds[bid].dys * w;
      if (bed.terr.length === 2 && bed.terr.includes('ACA') && bed.terr.some((x) => x.startsWith('MCA'))) {
        vol += w;
        dysVol += beds[bid].dys * w;
        infVol += beds[bid].infarct * w;
        baseVol += baseMap[bid] * w;
      }
    }
    if (vol > 0) border[r.id] = { dys: dysVol / vol, inf: infVol / vol, share: allDysVol > 0 ? dysVol / allDysVol : 0, base: baseVol / vol };
  }
  return { t, beds, edema, recovery, regionAgeH, rDys, rPrim, rInf, rRel, rBase, lacuneLoss, lacuneIsch, lacuneOnly, borderBySide, border };
}

/** the deficits that cleared when blood last returned (see heldReference) */
interface HeldReference {
  /** when blood returned (simulation clock) */
  tr: number;
  /** `symptom|side` as each region gives it (clinical.SymptomHold) */
  keys: Set<string>;
}

/** what the symptom list is made from at one time (see lesionListAt) */
interface LesionList {
  lv: Levels;
  /** the ACA–MCA border-zone levels of the regions in a watershed picture (C1-F6) */
  border: Record<string, BorderLevel>;
  /** everything the lesion gives, at every level of consciousness (clinical.lesionSymptoms) */
  all: SymptomItem[];
}

/**
 * The lesion's symptom list at `tAbs`: the region levels, the symptoms the cascade events and the
 * midline shift add, the border-zone picture, and every deficit the regions give, with `ref`'s
 * deficits held (X2-9). `trace`, when given, is filled with every deficit the regions give.
 */
function lesionListAt(model: Model, input: SimInput, tAbs: number, hemo: HemoResult | null, ref: HeldReference | null, trace?: Set<string>): LesionList {
  const lv = levelsAt(model, input, tAbs, hemo);
  const { t, edema } = lv;
  const cascade = model.cascade;
  const extra: SymptomItem[] = [];
  // only after a clear trigger, and only as possible (C3-F11)
  if (cascade.palatalTremorFromH !== null && t >= cascade.palatalTremorFromH) {
    extra.push({ id: 'palatal_tremor', side: null, sev: 1, sources: [], delayed: true });
  }
  for (const e of cascade.events) {
    // a herniation coma lasts, after the oedema peak, only while the midline is still shifted
    // into the coma range: a survivor wakes as the swelling subsides (C4-F1)
    for (const sy of symptomsAddedAt(e, t, edema.midlineShiftMm)) {
      const sides: (Side | null)[] = sy.side === 'both' ? ['r', 'l'] : [sy.side];
      for (const sd of sides) extra.push({ id: sy.id, side: sd, sev: sy.sev, sources: [], delayed: false });
    }
  }
  // the level of consciousness follows the horizontal midline shift of a swollen hemisphere
  // (Ropper 1986; cascade.consciousnessFromShift), whatever event caused the swelling (C4-F2)
  const byShift = consciousnessFromShift(edema.midlineShiftMm);
  if (byShift) extra.push({ id: byShift.id, side: null, sev: byShift.sev, sources: [], delayed: false });
  // the ACA–MCA border-zone beds of regions that act differently when only they fail (C1-F6), in
  // a hemisphere whose dysfunction is a border-zone picture (not a territorial infarct whose
  // collaterals happen to rescue the core of the motor strip but not its edge)
  const border: Record<string, BorderLevel> = {};
  const borderBase: Record<string, number> = {};
  for (const [rid, b] of Object.entries(lv.border)) {
    const r = REGION_BY_ID[rid];
    borderBase[rid] = b.base;
    if (r.side !== 'm' && isWatershedPicture(lv.borderBySide[r.side])) border[rid] = { dys: b.dys, inf: b.inf, share: b.share };
  }
  const fresh = new Set<string>();
  if (ref) for (const [rid, list] of Object.entries(model.ischaemiaStarts)) if (list.some((s) => s > ref.tr && s <= tAbs)) fresh.add(rid);
  const hold = ref || trace ? { keys: ref?.keys, base: lv.rBase, borderBase, fresh, trace } : undefined;
  const all = lesionSymptoms(lv.rDys, lv.rInf, t, extra, lv.lacuneOnly, border, lacuneDeficitsOf(model.course), model.regionAcute, lv.regionAgeH, hold);
  return { lv, border, all };
}

/**
 * After an artery has reopened, the swelling of the following days does not bring back a deficit
 * that cleared when blood returned (X2-9). The perilesional depression of recovery.ts makes a
 * deficit worse than the dead tissue alone and keeps it longer, but tissue that works again once
 * blood has returned does not stop working because of the oedema around a small infarct: in the
 * model it did, so a rescued upper basilar occlusion gave NIHSS 0 for two days, then an incomplete
 * locked-in syndrome on days 3–5, then NIHSS 0 again, with no event to explain it (deterioration
 * after reperfusion has causes of its own: reocclusion, haemorrhage, a space-occupying oedema,
 * which the model tells through the midline shift and herniation).
 *
 * The reference at `tAbs`: the deficits the regions gave just before the latest reopening at or
 * before it and no longer just after it, with those held at the reopening before (computed once
 * per model). Such a deficit is listed again only when a region's tissue itself (its level without
 * the passing perilesional and remote depression) reaches the deficit's threshold, or from a region
 * that became ischaemic again since (clinical.SymptomHold). A deficit still present when blood
 * returned is kept and may worsen while the swelling peaks, and one the case never gave may still
 * appear with it, as without reopening. Null before any reopening.
 */
function heldReference(model: Model, input: SimInput, tAbs: number, strict = false): HeldReference | null {
  const tr = model.reopenings.filter((h) => (strict ? h < tAbs : h <= tAbs)).pop();
  if (tr === undefined) return null;
  let ref = model.heldAt.get(tr);
  if (!ref) {
    const prev = heldReference(model, input, tr, true);
    const before = new Set<string>();
    const after = new Set<string>();
    lesionListAt(model, input, tr - 1e-6, null, prev, before);
    lesionListAt(model, input, tr, null, prev, after);
    ref = { tr, keys: new Set([...(prev?.keys ?? []), ...before].filter((k) => !after.has(k))) };
    model.heldAt.set(tr, ref);
  }
  return ref;
}

export function simulate(input: SimInput): SimResult {
  return run(input, false);
}

/** the symptom list at input.tH alone (no NIHSS, syndromes or volumes) */
function symptomsAt(input: SimInput): SymptomItem[] {
  return run(input, true);
}

function run(input: SimInput, symptomsOnly: true): SymptomItem[];
function run(input: SimInput, symptomsOnly: false): SimResult;
function run(input: SimInput, symptomsOnly: boolean): SimResult | SymptomItem[] {
  // ── schedule, flow per piece of the timeline, index onset and cascade (independent of t; cached) ──
  const model = modelFor(input);
  const { course, plan } = model;
  const tAbs = input.tH;
  const reperf = input.reperfusionH;
  // when the treatment reopens occlusions (never, if it fails)
  const opensH = plan ? plan.opensH : null;
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
  // the clinical clock: hours since the index onset (see the header); the cascade runs on it
  const t = Math.max(0, tAbs - model.onsetH);
  const cascade = model.cascade;

  // ── per-bed and per-region state at time t, and the lesion's symptom list ──
  // (after a reopening, the swelling does not bring back a deficit that had cleared: X2-9)
  const { lv, all } = lesionListAt(model, input, tAbs, hemo, heldReference(model, input, tAbs));
  const { beds, rDys, rPrim, rInf, rRel, lacuneLoss, lacuneIsch, lacuneOnly, borderBySide } = lv;
  const edema = lv.edema;
  const recovery = lv.recovery;
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
    if (!regions[rid] || regions[rid].effect) continue;
    if (lacuneLoss[rid] >= 0.5) regions[rid].dominant = 'core';
    else if (lacuneIsch[rid] > 0 && ['normal', 'oligemia', 'salvaged'].includes(regions[rid].dominant)) regions[rid].dominant = 'penumbra';
  }

  // ── symptoms, NIHSS, syndromes ──
  // what cannot be examined at the patient's level of consciousness is left out of the list and
  // named apart (R5-7, X1-2, X1-12)
  const { shown: symptoms, unexaminable } = byConsciousness(all);
  if (symptomsOnly) return symptoms;
  const affected = REGIONS.filter((r) => rDys[r.id] >= 0.2 || rInf[r.id] >= 0.2).map((r) => r.id);
  const nihss = estimateNihss(symptoms, affected);

  const occl = new Set(episode.active.filter((o) => o.severity >= 1).map((o) => o.vessel));
  const rev = new Set(episodeHemo.reversed);
  const idOf = (base: string, side?: Side | 'm') => (side && side !== 'm' ? `${base}_${side}` : base);
  // the region rules read the primary vascular pattern; a label named for its signs also needs
  // them in the symptom list just computed
  const syndromes = detectSyndromes({
    f: (base, side) => rPrim[`${base}_${side}`] ?? 0,
    acute: (base, side) => (tAbs >= model.onsetH ? model.regionAcute[`${base}_${side}`] ?? 0 : 0),
    has: (base, side, thr = 0.25) => (rPrim[`${base}_${side}`] ?? 0) >= thr,
    hasAny: (bases, side, thr = 0.25) => bases.some((b) => (rPrim[`${b}_${side}`] ?? 0) >= thr),
    both: (base, thr = 0.25) => (rPrim[`${base}_r`] ?? 0) >= thr && (rPrim[`${base}_l`] ?? 0) >= thr,
    occluded: (base, side) => occl.has(idOf(base, side)) || (!side && (occl.has(`${base}_r`) || occl.has(`${base}_l`))),
    reversed: (base, side) => rev.has(idOf(base, side)),
    border: (side) => borderBySide[side],
    cortexCount: (side, thr = 0.2) =>
      REGIONS.filter((r) => r.side === side && r.category === 'cortex' && rPrim[r.id] >= thr).length,
    map: input.map,
    lacune: (base, side) => lacuneOnly.includes(`${base}_${side}`),
    branchEpisodes: (base, side) =>
      input.occlusions
        .filter((o) => o.branch && o.vessel === `${base}_${side}` && startOf(o) <= tAbs)
        .map((o) => ({ fromH: startOf(o), toH: endOf(o), transient: transientBranch(o) }))
        .sort((a, b) => a.fromH - b.fromH),
    tH: tAbs,
    sym: (id, side) =>
      symptoms
        .filter((x) => x.id === id && !x.delayed && (side === undefined || x.side === side || x.side === 'both'))
        .reduce((m, x) => Math.max(m, x.sev), 0),
  }, symptoms, unexaminable);

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
    unexaminable,
    nihss,
    syndromes,
    // on the simulation clock, like the timeline (the second pass, made on first reading)
    get cascade() {
      model.finish();
      return model.shownCascade;
    },
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
