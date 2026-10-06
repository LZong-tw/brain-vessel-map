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
 * produces most of the final infarct (if nothing dies: the latest start that causes ischaemia,
 * the attacks before it told as attacks of their own). The cascade is shifted back onto the
 * simulation clock for display. A result describes the schedule as it stands at the displayed
 * time (knownAt, W2-3): an occlusion that begins later is not known yet and changes nothing before
 * it begins — the index onset, the swelling, the events and the forecast of the course are those
 * of the occlusions that have begun; only the schedule's own events and statuses show the later
 * ones (pending). Approximations:
 *   • one index event: infarcts from other episodes add to the volumes and the oedema; each
 *     lesion swells on its own clock (every bed from the occlusion start credited with most of its
 *     loss: lesionOnsetsOf), and each hemisphere and the posterior fossa have their early (14 h)
 *     volume and their oedema, herniation and diaschisis events from their own lesion's onset,
 *     before the index onset too (Z3-4, V1-1: when a larger occlusion began a week after a
 *     malignant infarct of the other hemisphere, the first infarct's swelling, its herniation
 *     infarct and its events vanished for days), and a basilar occlusion's fatal risk starts
 *     with the coma it causes itself, never before it closes (Z3-2); only each region's
 *     late symptoms, compensation and coma relabelling count from when that region itself became
 *     ischaemic (R6-6), and the brainstem consciousness events follow the labels these give, so
 *     they run on that clock too (brainstemCourse, X2-11); so do the warnings that follow the
 *     symptom list (aspiration, cardiac, venous thrombosis) and the central-fever risk, from the
 *     onset of each lesion that leaves an infarct (listedCourse, Y3-19);
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
  attackWindow,
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
  type ListedWindow,
  type ReperfusionOutcome,
  type SwallowStretch,
} from './cascade';
import {
  DYS_THR,
  bilateralHemispheric,
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
  progressed,
  reopenedByTreatment,
  scheduleEvents,
  startOf,
  statusAt,
  successorOf,
  type OcclusionStatus,
  type ScheduleEvent,
  type TreatmentPhase,
} from './schedule';
import { PERFORATOR_TISSUE, tissueParamsForUnit, type TissueParams } from './tissueParams';
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
import { LOCKED_IN_BASES_FLOOR, haemodynamicSetting, isWatershedPicture } from '../anatomy/syndromes';
import { NEURONS_PER_ML, infarctFractionOf, ischaemicHours, lossSteps, silentAfterReflow, tissueCourse, type FlowPhase, type TissueState } from './tissue';

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
  /**
   * share of the bed whose penumbra is past the time it is at risk (tissue.PENUMBRA_AT_RISK_H) and
   * will survive, but is still silent until its own window has passed (counted as oligaemia in
   * `frac`; W2-10)
   */
  holding: number;
  /** infarcted fraction including secondary infarcts */
  infarct: number;
  /** dysfunctional fraction (core + penumbra + compressed) */
  dys: number;
  effect: BedEffectKind | null;
}

export interface RegionTimeState {
  rel: number;
  /**
   * the infarcted share of the region's volume (with its volume, the mL it adds to the infarct): a
   * lacune counts at its own volume, about 0.8 mL, however much of the structure's function it
   * costs (W3-5)
   */
  infarct: number;
  /**
   * the share of the region's function lost to dead tissue, as the symptoms and their recovery count
   * it: its infarct, or for a lacune (a small infarct in a compact fibre tract) most of the function
   * of the structure it lies in (LACUNE_DYSFUNCTION of the share of the lacune that has died)
   */
  lost: number;
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
   * what the lesion gives but cannot be examined now, so is not in `symptoms`, each with why
   * (`why`): the level of consciousness (stupor, coma, a disorder of consciousness), blindness
   * (recognition by sight, reading, reaching: Y2-14) or akinetic mutism (what needs the patient to
   * act, answer or report: Y2-15); clinical.byConsciousness. It has not gone: it is listed again
   * once it can be examined (X1-2).
   */
  unexaminable: SymptomItem[];
  nihss: NihssResult;
  syndromes: SyndromeMatch[];
  cascade: CascadeOutput;
  /**
   * infarct core, penumbra and final infarct (mL) of the brain and the spinal cord; `cord` is the
   * spinal cord's part of each (W3-8: an anterior spinal artery infarct was left out of all three
   * beside a cord infarct listed at 2 mL). `saved` is the brain tissue a reopening spares: the
   * untreated final infarct less this one, the infarcts of a herniation included (V1-6), of which
   * `savedSecondary` is what that herniation would have infarcted.
   */
  volumes: {
    core: number;
    penumbra: number;
    finalInfarct: number;
    saved: number;
    savedSecondary: number;
    cord: { core: number; penumbra: number; final: number };
  };
  /** neurons lost in the dead brain tissue (the estimate per mL is the brain's: Saver 2006; the spinal cord is not counted) */
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
/** the spinal cord (the upper cervical cord of the anterior spinal artery): counted in the infarct volumes with the brain, and named apart (W3-8) */
const SPINAL = 'spinal';
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
    const p = tissueParamsForUnit(u);
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
 * `saved` (per unit of this share) is "salvaged". Tissue that blood has reached again regains its
 * function over hours to days (tissue.silentAfterReflow, Y1-12), unless `settled`: then it works
 * again at once, as the model had it before (what simulate.heldReference compares with).
 */
function addUnitShare(bs: BedTimeState, frac: number, history: FlowPhase[], saved: number, tH: number, p: TissueParams, settled = false): void {
  const { f, rest, stabilisedH, reflowH, ischaemicH, dying, held } = tissueCourse(history, tH, p);
  bs.frac.core += f * frac;
  // the part of stabilised penumbra that is still dying is penumbra, not working tissue (Z2-8)
  const still = Math.min(1 - f, dying ?? 0);
  bs.frac.penumbra += still * frac;
  // past the time it is at risk, the part that survives is no longer penumbra but still silent (W2-10)
  if (held) bs.holding += (1 - f - still) * frac;
  if (stabilisedH !== undefined) bs.regaining += (1 - f - still) * frac * (1 - smoothstep(0, REGAIN_H, stabilisedH));
  if (rest === 'salvaged') {
    // "salvaged" is only what treatment saved (would have died untreated); the rest of the
    // reperfused tissue would have survived on its collaterals anyway and is simply perfused
    // again — calling all of it salvaged made a late recanalisation look like a rescue
    const s = Math.min(1 - f, saved);
    bs.frac.salvaged += s * frac;
    bs.frac[currentRel(history, tH) < p.oligemiaRel ? 'oligemia' : 'normal'] += (1 - f - s) * frac;
    // all of it was ischaemic, and silent; it works again gradually
    if (!settled && reflowH !== undefined && ischaemicH !== undefined) bs.regaining += (1 - f) * frac * silentAfterReflow(reflowH, ischaemicH);
  } else bs.frac[rest] += (1 - f - still) * frac;
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
  for (const o of course.lacunes.get(rid) ?? []) loss = Math.max(loss, lacuneLossOf(o, rid, tH));
  return loss;
}

/**
 * share of a lacune of region `rid` that survived its branch's closure and is still silent at time t
 * after the branch reopened (tissue.silentAfterReflow, as for the tissue behind a reopened bundle:
 * Y1-12, W2-2); a closure within the lag (minutes) clears at once
 */
function lacuneRegainAt(course: Course, rid: string, tH: number): number {
  let silent = 0;
  for (const o of course.lacunes.get(rid) ?? []) {
    const e = endOf(o);
    if (e === null || tH < e) continue;
    const h = branchHistory(o);
    const p = bundleIn(o.vessel, rid).tissue;
    silent = Math.max(silent, (1 - infarctFractionOf(h, tH, p)) * silentAfterReflow(tH - e, ischaemicHours(h, h.length - 1, p)));
  }
  return silent;
}

/** fraction of the lacune of single-branch occlusion `o` in region `rid` that has died by time t */
const lacuneLossOf = (o: Occlusion, rid: string, tH: number): number => infarctFractionOf(branchHistory(o), tH, bundleIn(o.vessel, rid).tissue);

const bundleCache = new Map<string, { share: number; tissue: TissueParams }>();
/**
 * What the bundle `vessel` feeds of region `rid` (W2-2): its share of the region (bed volumes
 * weighted as regionAgg weighs them) and the tissue there, that of the bundle's own units (in the
 * bed it feeds most). One branch of the bundle feeds part of the same tissue: its lacune is lost
 * on the same course (the deep white matter of the capsule and the corona radiata on that of
 * DEEP_WHITE_MATTER_TISSUE, Z1-7) and takes no more of the region than the whole bundle feeds, so
 * a branch never leaves more infarct there than its trunk closed for as long.
 */
function bundleIn(vessel: string, rid: string): { share: number; tissue: TissueParams } {
  const key = `${vessel}|${rid}`;
  let hit = bundleCache.get(key);
  if (hit) return hit;
  let fed = 0;
  let total = 0;
  let best: { bed: string; w: number } | null = null;
  for (const bid of REGION_BY_ID[rid].beds) {
    const b = BED_BY_ID[bid];
    const w = b.volume > 0 ? b.volume : 1;
    const own = b.supply.filter((x) => x.v === vessel).reduce((a, x) => a + x.share, 0);
    fed += own * w;
    total += w;
    if (own > 0 && (!best || own * w > best.w)) best = { bed: bid, w: own * w };
  }
  hit = {
    share: total > 0 ? fed / total : 0,
    tissue: best ? tissueParamsForUnit({ bed: best.bed, vessel }) : PERFORATOR_TISSUE,
  };
  bundleCache.set(key, hit);
  return hit;
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

/**
 * fraction of region `rid` occupied by one lacune of the bundle `vessel`: its typical volume, but no
 * more than the bundle feeds there (W2-2)
 */
const lacuneFractionOf = (vessel: string, rid: string) => Math.min(LACUNE_ML / Math.max(REGION_BY_ID[rid].volume, LACUNE_ML), bundleIn(vessel, rid).share);
/** … of the lacunes the course has in region `rid` (one lacune, of the largest bundle among them) */
const lacuneFraction = (course: Course, rid: string) => Math.max(0, ...(course.lacunes.get(rid) ?? []).map((o) => lacuneFractionOf(o.vessel, rid)));

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
  return lacuneFractionOf(o.vessel, rid) * REGION_BY_ID[rid].volume * lacuneLossOf(o, rid, e) < NO_INFARCT_ML;
}

function addLacunes(bedInfarct: Record<string, number>, course: Course, tH: number): Record<string, number> {
  if (!course.lacunes.size) return bedInfarct;
  const out = { ...bedInfarct };
  for (const rid of course.lacunes.keys()) {
    const x = lacuneFraction(course, rid) * lacuneLossAt(course, rid, tH);
    for (const bid of REGION_BY_ID[rid].beds) out[bid] = (out[bid] ?? 0) + x * (1 - (out[bid] ?? 0));
  }
  return out;
}

/**
 * The index onset: the start of the occlusion phase that produces most of the final infarct.
 * Each unit's loss in each phase of its flow history is credited to the latest occlusion start
 * at or before that phase began (so treatment or a reopening does not start a new event). If
 * nothing (much) dies, it is the latest start that makes brain (or inner-ear) tissue ischaemic,
 * so that the attacks before it are told as attacks of their own (prodromalAttacks): with the
 * schedule known at the displayed time (W2-3), a run of attacks is the attack in progress, or the
 * last one, after the earlier ones. Only the input's starts count: a phase the treatment caused
 * (reocclusion, distal embolus) belongs to the event it treated. With partial reperfusion the loss
 * of each course counts by its share.
 */
function indexOnset(input: SimInput, course: Course, finalH: number, other: Course | null = null, x = 1): number {
  const starts = [...new Set(input.occlusions.map(startOf))].sort((a, b) => a - b);
  if (starts.length <= 1) return starts[0] ?? 0;
  const credit = startCredits(input, course, finalH, other, x);
  let best = starts[0];
  for (const s of starts) if (credit.get(s)! > credit.get(best)! + 1e-9) best = s;
  if (credit.get(best)! >= ONSET_MIN_ML) return best;
  for (const s of [...starts].reverse()) if (ischaemiaBeginsAt(course, s)) return s;
  return starts[0];
}

/** brain or inner-ear tissue is ischaemic in the piece that starts at `h`: behind a vessel, or behind a single branch that closes then */
const ischaemiaBeginsAt = (course: Course, h: number): boolean =>
  ischaemicAt(course, h) ||
  [...course.lacunes].some(
    ([rid, list]) => (BRAIN.has(REGION_BY_ID[rid].category) || REGION_BY_ID[rid].category === 'ear') && list.some((o) => startOf(o) === h && inWindow(o, h)),
  );

/** some brain tissue is ischaemic (below the penumbra threshold) in the piece that starts at `h` */
function ischaemicAt(course: Course, h: number): boolean {
  const hemo = course.pieces[pieceIndex(course.pieces, h)].hemo;
  return course.units.some(
    (u) => BRAIN.has(REGION_BY_ID[BED_BY_ID[u.bed].region].category) && (hemo.unitRel[u.id] ?? 1) < tissueParamsForUnit(u).penumbraRel,
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
      lossSteps(h, finalH, tissueParamsForUnit(u)).forEach((f, k) => {
        if (f > prev) add(h[k].fromH, (f - prev) * u.frac * bed.volume * w);
        prev = f;
      });
    });
  }
  for (const [rid, list] of course.lacunes)
    for (const o of list) add(startOf(o), lacuneFractionOf(o.vessel, rid) * REGION_BY_ID[rid].volume * lacuneLossOf(o, rid, finalH));
  return credit;
}

/** when each lesion began, on the clinical clock (see lesionOnsetsOf) */
interface LesionOnsets {
  /** per bed: the start credited with most of its loss (beds that lose nothing are left out) */
  bed: Record<string, number>;
  /** per hemisphere (supratentorial beds) and for the posterior fossa: the start credited with most of its loss */
  compartment: Partial<Record<Side | 'infra', number>>;
}

/**
 * When each lesion began (V1-1), on the clinical clock (hours after the index onset; before it, a
 * negative number): for each bed, the occlusion start credited with most of its loss, as
 * startCredits credits it, and for each hemisphere and the posterior fossa the start credited with
 * most of theirs. Each lesion swells, herniates and has its oedema events on its own clock: when a
 * larger occlusion of the other hemisphere began a week after a malignant right M1 infarct and
 * became the index event, the right hemisphere's swelling, its herniation infarct and its events
 * vanished at that moment and came back days later. With one start, every lesion dates from the
 * index onset (left empty).
 */
function lesionOnsetsOf(input: SimInput, course: Course, finalH: number, other: Course | null, x: number, onsetH: number): LesionOnsets {
  const starts = [...new Set(input.occlusions.map(startOf))].sort((a, b) => a - b);
  if (starts.length <= 1) return { bed: {}, compartment: {} };
  const startAt = (h: number) => {
    let s = starts[0];
    for (const y of starts) if (y <= h) s = y;
    return s;
  };
  const byBed = new Map<string, Map<number, number>>();
  const add = (bedId: string, h: number, ml: number) => {
    if (!(ml > 0)) return;
    let m = byBed.get(bedId);
    if (!m) byBed.set(bedId, (m = new Map()));
    const s = startAt(h);
    m.set(s, (m.get(s) ?? 0) + ml);
  };
  const shares: [Course, number][] = !other || x === 1 ? [[course, 1]] : x === 0 ? [[other, 1]] : [[course, x], [other, 1 - x]];
  for (const [c, w] of shares)
    c.units.forEach((u, i) => {
      const bed = BED_BY_ID[u.bed];
      if (REGION_BY_ID[bed.region].compartment === 'none') return;
      const h = c.histories[i];
      let prev = 0;
      lossSteps(h, finalH, tissueParamsForUnit(u)).forEach((f, k) => {
        if (f > prev) add(u.bed, h[k].fromH, (f - prev) * u.frac * bed.volume * w);
        prev = f;
      });
    });
  for (const [rid, list] of course.lacunes) {
    const reg = REGION_BY_ID[rid];
    if (reg.compartment === 'none') continue;
    const vol = reg.beds.reduce((a, b) => a + BED_BY_ID[b].volume, 0) || 1;
    for (const o of list) {
      const ml = lacuneFractionOf(o.vessel, rid) * reg.volume * lacuneLossOf(o, rid, finalH);
      for (const b of reg.beds) add(b, startOf(o), (ml * BED_BY_ID[b].volume) / vol);
    }
  }
  // (the earlier start on a tie)
  const top = (m: Map<number, number>) => {
    let best: number | null = null;
    for (const st of [...m.keys()].sort((a, b) => a - b)) if (best === null || m.get(st)! > m.get(best)! + 1e-9) best = st;
    return best;
  };
  const bed: Record<string, number> = {};
  const comp = new Map<Side | 'infra', Map<number, number>>();
  for (const [bedId, m] of byBed) {
    const b = top(m);
    if (b !== null) bed[bedId] = b - onsetH;
    const reg = REGION_BY_ID[BED_BY_ID[bedId].region];
    const key: Side | 'infra' | null = reg.compartment === 'infra' ? 'infra' : reg.side === 'm' ? null : reg.side;
    if (!key) continue;
    let cm = comp.get(key);
    if (!cm) comp.set(key, (cm = new Map()));
    for (const [st, ml] of m) cm.set(st, (cm.get(st) ?? 0) + ml);
  }
  const compartment: Partial<Record<Side | 'infra', number>> = {};
  for (const [key, m] of comp) {
    const b = top(m);
    if (b !== null) compartment[key] = b - onsetH;
  }
  return { bed, compartment };
}

/** an attack before the index onset that reopened by itself and left no infarct (simulation clock) */
interface Prodrome {
  fromH: number;
  /** when the next attack (or the index event) begins */
  untilH: number;
  /** when its occlusions reopened (the flow came back) */
  flowBackH: number;
  /** its occlusions */
  occlusions: Occlusion[];
  /** only the inner ear is ischaemic (a labyrinthine branch) */
  earOnly: boolean;
}

/**
 * Each attack that began before the index onset, reopened by itself and left no infarct while it
 * made brain tissue ischaemic (such as the prodromal attack of a progressive basilar thrombosis:
 * Ferbert A et al. Stroke 1990;21:1135–1142; von Campe G et al. J Neurol Neurosurg Psychiatry
 * 2003;74:1621–1626). An attack is a complete occlusion (C3-F8) or one of a single branch, which
 * the flow model does not see but whose tissue stops working while it is shut (C6-F2): the
 * crescendo of capsular or pontine attacks before a lacunar stroke (Donnan GA et al. Neurology
 * 1993;43:957–962) is a run of TIAs, each an emergency. Each lasts until the next attack begins.
 */
function prodromalAttacks(input: SimInput, course: Course, finalH: number, onsetH: number, other: Course | null, x: number): Prodrome[] {
  const credit = startCredits(input, course, finalH, other, x);
  const attack = (o: Occlusion) => isTreatable(o) || (!!o.branch && o.severity >= 1);
  const attackStarts = [...new Set(input.occlusions.filter(attack).map(startOf))].sort((a, b) => a - b);
  // a single branch shut at `h` whose tissue the brain story covers (as for lacuneIschaemia)
  const branchIschaemicAt = (h: number) =>
    [...course.lacunes].some(
      ([rid, list]) => (BRAIN.has(REGION_BY_ID[rid].category) || REGION_BY_ID[rid].category === 'ear') && list.some((o) => startOf(o) === h && inWindow(o, h)),
    );
  const out: Prodrome[] = [];
  for (const s of attackStarts) {
    if (s >= onsetH) break;
    const own = input.occlusions.filter((o) => attack(o) && startOf(o) === s);
    const ends = own.map(endOf).filter((e): e is number => e !== null);
    if (!ends.length || (credit.get(s) ?? 0) >= ONSET_MIN_ML || !(ischaemicAt(course, s) || branchIschaemicAt(s))) continue;
    const earOnly = !ischaemicAt(course, s) && [...course.lacunes].every(([rid, list]) => REGION_BY_ID[rid].category === 'ear' || !list.some((o) => startOf(o) === s && inWindow(o, s)));
    out.push({ fromH: s, untilH: attackStarts.find((h) => h > s) ?? onsetH, flowBackH: Math.min(...ends), occlusions: own, earOnly });
  }
  return out;
}

/**
 * The story of each prodromal attack (simulation clock): its treatment windows while its deficit
 * lasts, the TIA story once the deficit has cleared (cascade.noInfarctEvents, Z4-11), `clearsAt`
 * telling when that is.
 */
function prodromalEvents(attacks: Prodrome[], clearsAt: (a: Prodrome) => number | null): CascadeEvent[] {
  return attacks.flatMap((a) =>
    noInfarctEvents(a.fromH, a.untilH, { clearsH: clearsAt(a), window: attackWindow(a.occlusions), thrombolysed: false, earOnly: a.earOnly }),
  );
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
   * something), an occlusion (or a phase the treatment caused) that ends, unless it ends because
   * the vessel closes further (V1-7); after each, a deficit that cleared then is not brought back
   * by the swelling (heldReference, X2-9)
   */
  reopenings: number[];
  /** the deficits that cleared at each reopening, filled in when first needed (heldReference) */
  heldAt: Map<number, HeldReference>;
  /**
   * per region, every start of an occlusion phase (the input's and those the treatment caused,
   * simulation clock) at which it became ischaemic: a new lesion, which the hold does not cover
   */
  ischaemiaStarts: Record<string, number[]>;
  /**
   * the lesions (simulation clock, sorted): the index onset and every other occlusion start whose
   * own loss is an infarct (startCredits ≥ ONSET_MIN_ML). Each has its own two weeks of aspiration
   * and cardiac warnings, and its own days 2–30 of venous-thrombosis risk (Y3-19)
   */
  lesionStarts: number[];
  /**
   * the occlusion starts (simulation clock) at which tissue of the vertebrobasilar circulation
   * becomes ischaemic: the NIHSS caveat for posterior strokes applies from the first (Y3-6)
   */
  posteriorStarts: number[];
  /** the spinal cord's final infarct (mL), counted with the brain's (W3-8) */
  cordFinal: number;
  /**
   * when each bed's lesion began, on the clinical clock (lesionOnsetsOf; 0 when left out): its
   * oedema runs on that clock (V1-1)
   */
  bedOnsetH: Record<string, number>;
  /** when each hemisphere's and the posterior fossa's lesion began, on the clinical clock (V1-1) */
  hemiOnsetH: Partial<Record<Side | 'infra', number>>;
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
  // the untreated course's final infarct with its own herniation infarcts: what the treatment saves
  // is counted against it (V1-6)
  const untreatedEnd = reperf !== null ? modelFor({ ...input, reperfusionH: null, treatment: undefined }).cascade.volumes.withSecondary : undefined;
  // a failed attempt changes nothing: the treated course is the untreated one
  const course = plan?.failed ? untreated! : buildCourse(input, reperf, occlusions);
  const x = plan ? plan.x : 1;
  const opensH = plan ? plan.opensH : null;
  const { units } = course;
  let lastChange = 0;
  for (const o of input.occlusions) lastChange = Math.max(lastChange, startOf(o), endOf(o) ?? 0);
  const finalH = lastChange + FINAL_H;
  const onsetH = indexOnset(input, course, finalH, untreated, x);
  // each lesion swells and herniates on its own clock (V1-1)
  const lesions = lesionOnsetsOf(input, course, finalH, untreated, x, onsetH);
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
  // the index episode ends at treatment (unless it fails) or when one of its occlusions reopens by
  // itself (not when it closes further: V1-7)
  const ends: number[] = [];
  for (const o of onsetPiece.active) {
    const e = endOf(o);
    if (e !== null && e > onsetH && !progressed(occlusions, o)) ends.push(e);
  }
  // (when the index occlusion is first reopened: the treatment counts only when it reopens something)
  const reopenedAtH = Math.min(opensH !== null && opensH >= onsetH && plan!.reopened.length ? opensH : Infinity, ...ends);
  if (opensH !== null && opensH >= onsetH) ends.push(opensH);
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
      const p = tissueParamsForUnit(u);
      return Math.max(0, infarctFractionOf(untreated.histories[i], finalH, p) - infarctFractionOf(course.histories[i], finalH, p));
    });
  }
  const acute: Record<string, number> = {};
  for (const u of units) {
    // dysfunctional (core or penumbra) in the first hour
    if ((hemoAcute.unitRel[u.id] ?? 1) < tissueParamsForUnit(u).penumbraRel) acute[u.bed] = (acute[u.bed] ?? 0) + u.frac;
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
  // a treatment counts as treating the index event when it is given at or after its onset and finds
  // something to reopen: given after an attack has cleared, or with only a stenosis in effect, it
  // reopens nothing and tells no recanalisation (the attack in progress before a later occlusion
  // is the index event of the schedule so far: W2-3)
  const treats = !!plan && plan.reopened.length > 0 && reperf !== null && reperf >= onsetH;
  const cascadeTreatment: CascadeTreatment | undefined =
    plan && treats && !isDefaultTreatment(plan.options)
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
    reperfusionH: treats ? reperf! - onsetH : null,
    decompression: input.decompression,
    occlusions: onsetPiece.active,
    hemo: hemoAcute,
    bedFinal,
    bedFinalUntreated,
    ...(untreatedEnd !== undefined ? { untreatedWithSecondary: untreatedEnd } : {}),
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
    // … but the artery was reopened then, which ends the treatment windows (V1-11)
    reopensH: Number.isFinite(reopenedAtH) ? reopenedAtH - onsetH : null,
    // left out for the default treatment, which keeps the former event texts exactly
    ...(cascadeTreatment ? { treatment: cascadeTreatment } : {}),
    bedAtDecision: bedInfarctAt(untreated ?? course, decisionH),
    map: input.map,
  };
  const edemaReperfusionH = episodeEndH === null ? null : episodeEndH - onsetH;
  const allStarts = [...new Set(occlusions.map(startOf))].sort((a, b) => a - b);
  const ischaemiaStarts = ischaemiaStartsOf(allStarts, course, hemoAtT);
  // when each region first became ischaemic, on the clinical clock (Y3-19)
  const regionOnsetH: Record<string, number> = {};
  for (const [rid, list] of Object.entries(ischaemiaStarts)) regionOnsetH[rid] = list[0] - onsetH;
  cascadeInput.regionOnsetH = regionOnsetH;
  cascadeInput.hemiOnsetH = lesions.compartment;
  // each region's early lesion is measured 14 h after its own onset (Z3-4): the other hemisphere
  // occluded two days after the index onset had "≈ 0 mL within 14 h" beside the malignant course
  // of its own final infarct
  const earlyAt = new Map<number, Record<string, number>>();
  const earlyBeds = (h: number) => {
    let m = earlyAt.get(h);
    if (!m) earlyAt.set(h, (m = addLacunes(bedInfarctAt(course, h + 14, untreated, x), course, h + 14)));
    return m;
  };
  const bedEarly: Record<string, number> = {};
  // (a bed that loses tissue: from the start of the lesion that kills most of it, also before the
  // index onset: V1-1)
  for (const b of BEDS) {
    const own = lesions.bed[b.id];
    bedEarly[b.id] = earlyBeds(own !== undefined ? onsetH + own : (ischaemiaStarts[b.region] ?? []).find((h) => h >= onsetH - 1e-9) ?? onsetH)[b.id] ?? 0;
  }
  cascadeInput.bedEarly = bedEarly;
  cascadeInput.basilarNotReopened = basilarNotReopened(input, plan);
  // first pass: everything but what reads the symptom list (the aspiration warning and the
  // cardiac severity carry no symptoms, so the list sampled below is the same with either pass),
  // with the uncal herniations timed by the oedema model's midline shift (R6-5)
  const { cascade, input: shiftedInput } = herniationFollowsShift(
    computeCascade(cascadeInput),
    cascadeInput,
    { course, untreated, x, unitSaved, hemoAcute, hemoAfter, onsetH, edemaReperfusionH, bedOnsetH: lesions.bed, hemiOnsetH: lesions.compartment },
    input.decompression,
  );
  const prodromes = onsetH > 0 ? prodromalAttacks(input, course, finalH, onsetH, untreated, x) : [];
  // (the first pass: an attack's deficit counts as cleared when its flow comes back)
  const prodromal = prodromalEvents(prodromes, (a) => a.flowBackH);
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
    ischaemiaStarts,
    lesionStarts: lesionStartsOf(input, course, finalH, untreated, x, onsetH),
    posteriorStarts: allStarts.filter((h) => posteriorIschaemiaAt(input, course, hemoAtT, h)),
    cordFinal: BEDS.reduce((a, b) => a + (REGION_BY_ID[b.region].category === SPINAL ? (bedFinal[b.id] ?? 0) * b.volume : 0), 0),
    bedOnsetH: lesions.bed,
    hemiOnsetH: lesions.compartment,
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
    const listAt = listMemo(input);
    const second = computeCascade({
      ...shiftedInput,
      listed: { ...listedCourse(input, model, listAt), brainstem: brainstemCourse(input, model) },
      ...(cascadeInput.reperfusionH !== null && plan && !plan.failed && plan.reopened.length ? { reperfusionOutcome: reperfusionOutcomeOf(input, model) } : {}),
    });
    model.cascade = second;
    // each prodromal attack's TIA story from when the list shows its deficit cleared (Z4-11)
    const clears = deficitClearing(input, listAt);
    model.shownCascade = shownCascadeOf(second, onsetH, prodromalEvents(prodromes, (a) => clears(a.fromH, a.untilH, [a.flowBackH])));
  };
  return model;
}

/** the outcome a recanalisation is graded by: 3 months after the index onset (Y1-12) */
const OUTCOME_H = 2160;

/**
 * The NIHSS 3 months after the index onset with the treatment and without it (the same schedule,
 * nothing reopened by treatment), and the fatal risks of the untreated course: the recanalisation
 * event is graded by the deficit it avoids (Y1-12) and by the fatal course it avoids (Z2-3). Runs
 * on cached models; the untreated one is the comparison the Outcome tab shows too.
 */
function reperfusionOutcomeOf(input: SimInput, model: Model): ReperfusionOutcome {
  const tH = model.onsetH + OUTCOME_H;
  const untreated = run({ ...input, reperfusionH: null, treatment: undefined, tH }, false);
  return {
    treatedNihss: run({ ...input, tH }, false).nihss.total,
    untreatedNihss: untreated.nihss.total,
    // (the untreated course reopens nothing, so reading its cascade does not come back here)
    untreatedFatal: untreated.cascade.fatalRisk,
  };
}

/** what makes swallowing unsafe: a reduced level of consciousness */
const DROWSY_IDS = ['coma', 'somnolence', 'disorder_of_consciousness'];
/** … of which stupor or coma (NIHSS 1a ≥ 2), or a disorder of consciousness */
const comaLike = (s: SymptomItem) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness';
/**
 * a severe stroke, the predictor of cardiac events in Prosser J et al. Stroke 2007;38:2295-2302
 * (a clinical, not a volume, measure; Y3-5): an NIHSS of 16 or more (the scale's
 * moderate-to-severe and severe bands here), or stupor, coma or a disorder of consciousness
 */
export const SEVERE_NIHSS = 16;
/**
 * immobile, the patients at risk of venous thrombosis (CLOTS 3: who cannot walk to the toilet
 * unaided; Y3-7): a leg barely or not lifted against gravity, stupor or coma, a disorder of
 * consciousness, or a moderate or severe akinetic mutism
 */
const immobileSign = (s: SymptomItem) =>
  (s.id === 'leg_weak' && s.sev >= 2) || comaLike(s) || (s.id === 'akinetic_mutism' && s.sev >= 2);
/** the first two weeks of a lesion, in which the aspiration and cardiac warnings run */
const LISTED_WINDOW_H = 336;
/** the venous-thrombosis warning runs from day 2 to day 30 of a lesion */
const DVT_FROM_H = 48;
const DVT_UNTIL_H = 720;

/** a change in what the list shows between two samples is placed to within (gap / 2^LISTED_BISECT) */
const LISTED_BISECT = 8;

/** the intervals, overlapping ones merged, in time order */
function mergeIntervals(list: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const [a, b] of [...list].sort((x, y) => x[0] - y[0])) {
    const last = out[out.length - 1];
    if (last && a <= last[1]) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

/**
 * The lesions of a schedule (simulation clock, sorted; Y3-19): the index onset, and every other
 * occlusion start whose own loss is an infarct (startCredits ≥ ONSET_MIN_ML) — not a TIA that
 * reopened before any tissue died (the prodromal attacks have their own story).
 */
function lesionStartsOf(input: SimInput, course: Course, finalH: number, other: Course | null, x: number, onsetH: number): number[] {
  const starts = new Set<number>([onsetH]);
  if (new Set(input.occlusions.map(startOf)).size > 1)
    for (const [s, ml] of startCredits(input, course, finalH, other, x)) if (ml >= ONSET_MIN_ML) starts.add(s);
  return [...starts].sort((a, b) => a - b);
}

/** the arterial families of the vertebrobasilar circulation (Y3-6) */
const VERTEBROBASILAR: ReadonlySet<string> = new Set(['VA', 'BA', 'PCA', 'THAL', 'PICA', 'AICA', 'SCA', 'ASA']);

/**
 * a vessel of the vertebrobasilar circulation; with a fetal-type PCA the PCA beyond the PComm, and
 * the thalamogeniculate artery from it, are fed by the carotid instead (anterior circulation)
 */
function vertebrobasilar(vesselId: string, variants: readonly string[]): boolean {
  const v = VESSEL_BY_ID[vesselId];
  if (!v || !VERTEBROBASILAR.has(v.family)) return false;
  const fetal = variants.includes(`fetal_pca_${v.side}`);
  return !(fetal && ((v.family === 'PCA' && v.baseId !== 'pca_p1') || v.baseId === 'thalamogeniculate'));
}

/**
 * Tissue of the vertebrobasilar circulation (brain or inner ear) becomes ischaemic at the
 * occlusion start `h`: a unit fed by such an artery falls below the penumbra threshold, or a single
 * branch of one closes then. An MCA or carotid infarct that reaches the occipital pole is not a
 * posterior-circulation stroke (Y3-6).
 */
function posteriorIschaemiaAt(input: SimInput, course: Course, hemoAt: (tH: number) => HemoResult, h: number): boolean {
  const hemo = hemoAt(h);
  const tissue = (bed: string) => {
    const c = REGION_BY_ID[BED_BY_ID[bed].region].category;
    return BRAIN.has(c) || c === 'ear';
  };
  if (
    course.units.some(
      (u) => tissue(u.bed) && vertebrobasilar(u.vessel, input.variants) && (hemo.unitRel[u.id] ?? 1) < tissueParamsForUnit(u).penumbraRel,
    )
  )
    return true;
  return [...course.lacunes.values()].some((list) => list.some((o) => startOf(o) === h && vertebrobasilar(o.vessel, input.variants)));
}

const BASILAR_TRUNK = ['basilar_lower', 'basilar_mid', 'basilar_upper', 'basilar_tip'];

/**
 * a complete basilar occlusion of the case is never reopened lastingly (Y3-11): it lasts (no
 * reopening by itself) and no treatment reopens it, or the treatment failed (eTICI 0) or the
 * artery closed again
 */
function basilarNotReopened(input: SimInput, plan: TreatmentPlan | null): boolean {
  return input.occlusions.some((o) => unreopenedBasilar(o, plan));
}
const unreopenedBasilar = (o: Occlusion, plan: TreatmentPlan | null) =>
  BASILAR_TRUNK.includes(o.vessel) &&
  o.severity >= 1 &&
  !o.branch &&
  endOf(o) === null &&
  !(plan && !plan.failed && plan.reocclusionH === null && plan.reopened.includes(o));

/**
 * The regions whose stupor, coma or disorder of consciousness is the basilar lesion's own (Z3-2):
 * the brainstem and the thalamus, while their tissue, not the swelling of a herniation that
 * compresses them (or the secondary infarct it leaves), makes them dysfunctional. The coma of a
 * swollen hemisphere is listed without a region, or from the midbrain it compresses.
 */
function ownBasilarSource(model: Model, src: string, t: number): boolean {
  const reg = REGION_BY_ID[src];
  if (!reg || !(reg.category === 'brainstem' || reg.baseId.startsWith('thalamus'))) return false;
  return !reg.beds.some((b) => effectsAt(model.cascade, b, t).some((e) => e.kind === 'compressed' || e.kind === 'secondary'));
}

/** the symptom list at each time (simulation clock), each computed once */
function listMemo(input: SimInput): (tAbs: number) => SymptomItem[] {
  const memo = new Map<number, SymptomItem[]>();
  return (tAbs) => {
    let l = memo.get(tAbs);
    if (!l) memo.set(tAbs, (l = symptomsAt({ ...input, tH: tAbs })));
    return l;
  };
}

/** the tissue whose deficit a TIA is about: the brain and the inner ear (not the retina, spinal cord, an arm or the face) */
const ATTACK_TISSUE: ReadonlySet<string> = new Set([...BRAIN, 'ear']);
/** a listed deficit of the brain or the inner ear (one an event adds, without a region, counts too) */
const attackDeficit = (list: SymptomItem[]) => list.some((x) => !x.sources.length || x.sources.some((src) => ATTACK_TISSUE.has(REGION_BY_ID[src]?.category)));

/**
 * When, in [a, b) on the simulation clock, the symptom list first shows no deficit of the brain or
 * the inner ear, or null if it always does (Z4-11). Sampled at a, at the time stops of the
 * simulation clock and of a's own clock, and at `extra` (when the flow comes back), with the edge
 * between the last sample with a deficit and the first without one found by bisection.
 */
function deficitClearing(input: SimInput, listAt: (tAbs: number) => SymptomItem[] = listMemo(input)) {
  return (a: number, b: number, extra: number[] = []): number | null => {
    const times = new Set<number>([a, ...extra.filter((h) => h >= a && h < b)]);
    for (const st of TIME_STOPS) {
      if (st.h >= a && st.h < b) times.add(st.h);
      if (a + st.h < b) times.add(a + st.h);
    }
    let prev: number | null = null;
    for (const t of [...times].sort((x, y) => x - y)) {
      if (!attackDeficit(listAt(t))) {
        if (prev === null) return t;
        let lo = prev;
        let hi = t;
        for (let k = 0; k < LISTED_BISECT; k++) {
          const m = (lo + hi) / 2;
          if (attackDeficit(listAt(m))) lo = m;
          else hi = m;
        }
        return hi;
      }
      prev = t;
    }
    return null;
  };
}

/**
 * What the symptom list shows after each lesion (clinical clock): in its first two weeks the
 * stretches with dysphagia or, without it, a reduced level of consciousness (X3-1, X3-3), when
 * stupor or coma is first listed (X3-4) and how severe the stroke is (Y3-5); from day 2 to day 30
 * the stretches of immobility (Y3-7). Each lesion counts from its own onset (Y3-19), the windows of
 * lesions less than two weeks apart merged. Sampled at the time stops a learner can see — those of
 * each lesion's clock and those of the simulation clock — with a change between two samples found
 * by bisection, so that the warnings that follow the list also agree with it between the stops.
 * Runs on a cached model (its first-pass cascade), so each sample costs only the per-time part.
 */
function listedCourse(input: SimInput, model: Model, listAt: (tAbs: number) => SymptomItem[] = listMemo(input)): ListedCourse {
  const { onsetH, lesionStarts } = model;
  const swallowAt = (tAbs: number): SwallowStretch['kind'] | null => {
    const l = listAt(tAbs);
    return l.some((s) => s.id === 'dysphagia') ? 'dysphagia' : l.some((s) => DROWSY_IDS.includes(s.id)) ? 'drowsy' : null;
  };
  const comaAt = (tAbs: number) => listAt(tAbs).some(comaLike);
  const severeAt = (tAbs: number) => comaAt(tAbs) || estimateNihss(listAt(tAbs)).total >= SEVERE_NIHSS;
  const immobileAt = (tAbs: number) => listAt(tAbs).some(immobileSign);
  /** the first time in (a, b] at which f has the value it has at b, where f(a) differs from it */
  const edge = <T>(f: (t: number) => T, a: number, b: number) => {
    const before = f(a);
    for (let k = 0; k < LISTED_BISECT; k++) {
      const m = (a + b) / 2;
      if (f(m) === before) a = m;
      else b = m;
    }
    return b;
  };
  /** the time stops in [a, b) on the simulation clock and on each lesion's clock, and a itself */
  const stopsIn = (a: number, b: number) => {
    const times = new Set<number>([a]);
    for (const st of TIME_STOPS) {
      if (st.h >= a && st.h < b) times.add(st.h);
      for (const l of lesionStarts) if (l + st.h >= a && l + st.h < b) times.add(l + st.h);
    }
    return [...times].sort((x, y) => x - y);
  };
  /** the stretches over [a, b) in which f keeps one value, with the samples in each */
  const runs = <T>(f: (t: number) => T, a: number, b: number) => {
    const out: { v: T; from: number; until: number; at: number[] }[] = [];
    let prev: number | null = null;
    for (const t of stopsIn(a, b)) {
      const v = f(t);
      if (prev === null || v !== f(prev)) {
        const from = prev === null ? t : edge(f, prev, t);
        if (out.length) out[out.length - 1].until = from;
        out.push({ v, from, until: b, at: [] });
      }
      out[out.length - 1].at.push(t);
      prev = t;
    }
    return out;
  };
  const swallow: SwallowStretch[] = [];
  const windows: ListedWindow[] = [];
  for (const [a, b] of mergeIntervals(lesionStarts.map((l) => [l, l + LISTED_WINDOW_H]))) {
    for (const r of runs(swallowAt, a, b)) {
      if (!r.v) continue;
      const regions: string[] = [];
      if (r.v === 'dysphagia')
        for (const t of r.at) for (const s of listAt(t)) if (s.id === 'dysphagia') for (const src of s.sources) if (!regions.includes(src)) regions.push(src);
      swallow.push({ kind: r.v, fromH: r.from - onsetH, untilH: r.until - onsetH, regions });
    }
    const coma = runs(comaAt, a, b).find((r) => r.v);
    const severe = runs(severeAt, a, b);
    const first = severe.find((r) => r.v);
    const last = severe[severe.length - 1];
    const insula = new Set<string>();
    for (const l of lesionStarts.filter((x) => x >= a && x < b)) {
      const lv = ischaemicLevels(model.course, model.hemoAt, l);
      for (const r of ['insula_r', 'insula_l']) if ((lv[r] ?? 0) >= 0.3) insula.add(r);
    }
    windows.push({
      fromH: a - onsetH,
      untilH: b - onsetH,
      comaFromH: coma ? coma.from - onsetH : null,
      severeFromH: first ? first.from - onsetH : null,
      severeByComa: first ? comaAt(first.from) : false,
      severeEndH: first && !last.v ? last.from - onsetH : null,
      insula: ['insula_r', 'insula_l'].filter((r) => insula.has(r)),
    });
  }
  const immobile: ListedCourse['immobile'] = [];
  for (const [a, b] of mergeIntervals(lesionStarts.map((l) => [l + DVT_FROM_H, l + DVT_UNTIL_H])))
    for (const r of runs(immobileAt, a, b)) if (r.v) immobile.push({ fromH: r.from - onsetH, untilH: r.until - onsetH });
  // the first stupor, coma or disorder of consciousness that a basilar occlusion never reopened
  // causes itself, from when it begins (Z3-2): one from a swollen hemisphere, before or after it,
  // is not the comatose basilar occlusion of the trials
  const basilarStarts = input.occlusions.filter((x) => unreopenedBasilar(x, model.plan)).map(startOf);
  let basilarComaFromH: number | null = null;
  if (basilarStarts.length) {
    const from = Math.min(...basilarStarts);
    const basilarComaAt = (tAbs: number) => listAt(tAbs).some((x) => comaLike(x) && x.sources.some((src) => ownBasilarSource(model, src, tAbs - onsetH)));
    for (const [a, b] of mergeIntervals(lesionStarts.map((l) => [l, l + LISTED_WINDOW_H]))) {
      if (b <= from) continue;
      const first = runs(basilarComaAt, Math.max(a, from), b).find((r) => r.v);
      if (first) {
        basilarComaFromH = first.from - onsetH;
        break;
      }
    }
  }
  // when the deficit of the index event is first gone (Z4-11): the TIA story of brain ischaemia
  // that leaves no infarct begins then, not while the deficit lasts
  // (a later start that brings no ischaemia of its own, e.g. the milder narrowing an occlusion
  // reopens to, does not end the search: the deficit may clear just as it begins)
  const nextStart = [...new Set(input.occlusions.map(startOf))].filter((h) => h > onsetH && ischaemiaBeginsAt(model.course, h));
  const clearUntil = Math.min(onsetH + LISTED_WINDOW_H, ...nextStart);
  const flowBack = model.edemaReperfusionH === null ? [] : [onsetH + model.edemaReperfusionH];
  const cleared = deficitClearing(input, listAt)(onsetH, clearUntil, flowBack);
  return { swallow, windows, immobile, basilarComaFromH, deficitClearsH: cleared === null ? null : cleared - onsetH };
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
type ShiftModel = TissueModel & Pick<Model, 'hemoAcute' | 'hemoAfter' | 'onsetH' | 'edemaReperfusionH' | 'bedOnsetH' | 'hemiOnsetH'>;

/**
 * the oedema model's mass effect (mm: the swelling of both hemispheres together as the midline
 * shift it would give on one side, which equals the midline shift when only one swells; Y2-13) and
 * the side it pushes from: the side of the midline shift, or both when the hemispheres swell alike
 * and the midline stays in place, `t` h after the index onset
 */
function shiftAt(model: ShiftModel, cascade: CascadeOutput, decompression: boolean, t: number): { mm: number; lateral: number; from: Side | 'both' | null } {
  const { beds } = tissueAt(model, t + model.onsetH, null);
  const edemaBeds: Record<string, EdemaBedInput> = {};
  for (const b of BEDS) edemaBeds[b.id] = edemaBedOf(model, b.id, beds[b.id], effectsAt(cascade, b.id, t));
  const e = computeEdema({ tH: t, reperfusionH: model.edemaReperfusionH, decompression, beds: edemaBeds, cascade });
  return { mm: e.massEffectMm, lateral: e.midlineShiftMm, from: e.shiftFrom ?? (e.massEffectMm > 0 ? 'both' : null) };
}

/** the shift is sampled this often (h, clinical clock) up to the horizon, and the crossings refined to about 0.1 h */
const SHIFT_STEP_H = 6;
const SHIFT_HORIZON_H = 720;
const SHIFT_BISECT = 6;

/**
 * For each side whose oedema may herniate (a malignant one, or one with a moderate mass effect:
 * W2-1): the largest mass effect, when it first reaches the coma range pushing from that side (or
 * from both, Y2-13), when, after the herniation began, it falls below it again (cascade.CascadeInput.shift;
 * R6-5, R6-2), and the largest midline shift pushing from that side (V1-4); each side over the
 * weeks after its own lesion began (V1-1). With both sides, the same for the swelling of both
 * together, from whichever side it pushes (the central herniation, V1-4).
 */
function herniationShifts(
  model: ShiftModel,
  cascade: CascadeOutput,
  decompression: boolean,
  sides: Side[],
): { sides: Partial<Record<Side, HerniationShift>>; central: HerniationShift | null } {
  const memo = new Map<number, { mm: number; lateral: number; from: Side | 'both' | null }>();
  const at = (t: number) => {
    let v = memo.get(t);
    if (!v) memo.set(t, (v = shiftAt(model, cascade, decompression, t)));
    return v;
  };
  /** the course of one swelling: `inComa` decides, over the weeks from `from` (clinical clock), the herniation from `floor` on */
  const course = (inComa: (t: number) => boolean, from: number, floor: number, pushes: (t: number) => boolean): HerniationShift => {
    const horizon = from + SHIFT_HORIZON_H;
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
    let peakT = from;
    let lateralPeakMm = 0;
    let comaFromH: number | null = null;
    // (the peak of the mass effect, from whichever side: when the other hemisphere pushes harder,
    // the text says it herniates instead)
    for (let t = from + SHIFT_STEP_H; t <= horizon; t += SHIFT_STEP_H) {
      const v = at(t);
      if (v.from !== null && v.mm > peakMm) [peakMm, peakT] = [v.mm, t];
      if (pushes(t) && v.lateral > lateralPeakMm) lateralPeakMm = v.lateral;
      if (comaFromH === null && inComa(t)) comaFromH = edge(t - SHIFT_STEP_H, t);
    }
    // the peak between the samples, near enough for the text (a tenth of a millimetre)
    if (peakT > from)
      for (const d of [-SHIFT_STEP_H / 2, SHIFT_STEP_H / 2, -SHIFT_STEP_H / 4, SHIFT_STEP_H / 4]) {
        const v = at(peakT + d);
        if (v.from !== null && v.mm > peakMm) peakMm = v.mm;
        if (pushes(peakT + d) && v.lateral > lateralPeakMm) lateralPeakMm = v.lateral;
      }
    let comaUntilH: number | null = null;
    if (comaFromH !== null) {
      const onset = Math.max(floor, comaFromH);
      if (!inComa(onset)) comaUntilH = onset;
      else
        for (let t = from + Math.ceil((onset - from) / SHIFT_STEP_H) * SHIFT_STEP_H; t <= horizon; t += SHIFT_STEP_H)
          if (t > onset && !inComa(t)) {
            comaUntilH = edge(Math.max(onset, t - SHIFT_STEP_H), t);
            break;
          }
    }
    return { peakMm, comaFromH, comaUntilH, lateralPeakMm };
  };
  const onsetOf = (sd: Side) => model.hemiOnsetH[sd] ?? 0;
  const out: Partial<Record<Side, HerniationShift>> = {};
  for (const s of sides) {
    const pushes = (t: number) => at(t).from === s || at(t).from === 'both';
    out[s] = course((t) => pushes(t) && at(t).mm >= COMA_SHIFT_MM, onsetOf(s), onsetOf(s) + UNCAL_ONSET_H, (t) => at(t).from === s);
  }
  // both hemispheres together: from the first lesion's onset, the herniation from day 3 of the newer
  const central =
    sides.includes('r') && sides.includes('l')
      ? course(
          (t) => at(t).from !== null && at(t).mm >= COMA_SHIFT_MM,
          Math.min(onsetOf('r'), onsetOf('l')),
          Math.max(onsetOf('r'), onsetOf('l')) + UNCAL_ONSET_H,
          () => false,
        )
      : null;
  return { sides: out, central };
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
  // the sides that herniate by the size of their infarct, and those with a moderate mass effect,
  // whose swelling may still reach the coma range and then herniates too (W2-1)
  const sides = (['r', 'l'] as Side[]).filter((s) => cascade.events.some((e) => e.id === `uncal_${s}` || e.id === `mass_effect_${s}`));
  if (!sides.length) return { cascade, input };
  const herniation = /^(uncal|subfalcine)_/;
  const bedEffects: Record<string, BedEffect[]> = {};
  for (const [id, list] of Object.entries(cascade.bedEffects)) bedEffects[id] = list.filter((e) => !herniation.test(e.event));
  const primary = herniationShifts(model, { ...cascade, bedEffects }, decompression, sides);
  const firstInput: CascadeInput = { ...input, shift: primary.sides, ...(primary.central ? { centralShift: primary.central } : {}) };
  const next = computeCascade(firstInput);
  const still = sides.filter((s) => next.events.some((e) => e.id === `uncal_${s}`));
  if (!still.length) return { cascade: next, input: firstInput };
  // the input is returned too, so that the second pass (R3-1) keeps the same herniation timing
  // (whether one side herniates or both herniate centrally is decided on the first timing: a
  // central herniation adds no secondary infarct)
  const timed = herniationShifts(model, next, decompression, still).sides;
  const shift = { ...primary.sides };
  for (const s of still) shift[s] = { ...timed[s]!, lateralPeakMm: primary.sides[s]!.lateralPeakMm };
  const finalInput: CascadeInput = { ...firstInput, shift };
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
  for (const u of course.units) if ((hemo.unitRel[u.id] ?? 1) < tissueParamsForUnit(u).penumbraRel) acute[u.bed] = (acute[u.bed] ?? 0) + u.frac;
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

/**
 * when blood returns (see Model.reopenings): the treatment's reopening (null: it reopens nothing),
 * and the end of every phase that ends, but not a phase that ends because the vessel gets worse (a
 * stenosis that occludes: V1-7, the stuttering basilar was told "blood returned 0 min after onset"
 * at the moment it closed completely)
 */
function reopeningTimes(occlusions: Occlusion[], opensH: number | null): number[] {
  const out = new Set<number>();
  if (opensH !== null) out.add(opensH);
  for (const o of occlusions) {
    const e = endOf(o);
    if (e !== null && e > startOf(o) && !progressed(occlusions, o)) out.add(e);
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
  /** share of each lacune that survived its branch's closure and is still silent after it reopened (W2-2) */
  lacuneRegain: Record<string, number>;
  /** regions whose damage comes from the lacune alone */
  lacuneOnly: string[];
}

/**
 * The tissue of every bed at `tAbs` (simulation clock): each unit's share on the treated and
 * untreated courses, then the lacunes. `hemo` gives the flow shown (null: not needed).
 */
function tissueAt(model: TissueModel, tAbs: number, hemo: HemoResult | null, settled = false): TissueSnapshot {
  const { course, x, untreated } = model;
  const beds: Record<string, BedTimeState> = {};
  for (const b of BEDS) {
    beds[b.id] = {
      rel: hemo?.bedRel[b.id] ?? 1,
      frac: { normal: 0, oligemia: 0, penumbra: 0, core: 0, salvaged: 0 },
      regaining: 0,
      holding: 0,
      infarct: 0,
      dys: 0,
      effect: null,
    };
  }
  // the reperfused share x of each unit follows the treated course; the rest keeps its clot and
  // follows the untreated course, where nothing is salvaged by treatment
  course.units.forEach((u, i) => {
    const bs = beds[u.bed];
    const p = tissueParamsForUnit(u);
    if (x > 0) addUnitShare(bs, u.frac * x, course.histories[i], model.unitSaved[i], tAbs, p, settled);
    if (x < 1 && untreated) addUnitShare(bs, u.frac * (1 - x), untreated.histories[i], 0, tAbs, p, settled);
  });
  const lacunes = [...course.lacunes.keys()];
  const lacuneLoss: Record<string, number> = {};
  const lacuneIsch: Record<string, number> = {};
  const lacuneRegain: Record<string, number> = {};
  for (const rid of lacunes) {
    lacuneLoss[rid] = lacuneLossAt(course, rid, tAbs);
    lacuneIsch[rid] = lacuneActiveAt(course, rid, tAbs) ? 1 - lacuneLoss[rid] : 0;
    lacuneRegain[rid] = settled || lacuneIsch[rid] > 0 ? 0 : lacuneRegainAt(course, rid, tAbs);
  }
  // regions whose damage comes from the lacune alone (before it is added)
  const lacuneOnly = lacunes.filter((rid) => {
    const r = REGION_BY_ID[rid];
    let d = 0;
    let w = 0;
    for (const bid of r.beds) {
      const bs = beds[bid];
      const vol = BED_BY_ID[bid].volume || 1;
      d += Math.max(bs.frac.core + bs.frac.penumbra + bs.holding, bs.infarct) * vol;
      w += vol;
    }
    return d / (w || 1) < 0.25;
  });
  for (const rid of lacunes) {
    const xl = lacuneFraction(course, rid) * lacuneLoss[rid];
    // the part of the lacune that is ischaemic but still alive while its branch is closed
    const p = lacuneFraction(course, rid) * lacuneIsch[rid];
    for (const bid of REGION_BY_ID[rid].beds) {
      const bs = beds[bid];
      for (const k of Object.keys(bs.frac) as TissueState[]) bs.frac[k] *= 1 - xl - p;
      bs.regaining *= 1 - xl - p;
      bs.holding *= 1 - xl - p;
      bs.frac.core += xl;
      bs.frac.penumbra += p;
      bs.regaining = Math.min(1 - bs.frac.core - bs.frac.penumbra, bs.regaining + lacuneFraction(course, rid) * lacuneRegain[rid]);
      bs.infarct += xl * (1 - bs.infarct);
    }
  }
  for (const b of BEDS) {
    const bs = beds[b.id];
    if (Object.values(bs.frac).reduce((a, v) => a + v, 0) === 0) bs.frac.normal = 1;
  }
  return { beds, lacuneLoss, lacuneIsch, lacuneRegain, lacuneOnly };
}

/** the cascade's effects on one bed in force at `t` (clinical clock) */
const effectsAt = (cascade: CascadeOutput, bedId: string, t: number) =>
  (cascade.bedEffects[bedId] ?? []).filter((e) => e.onsetH <= t && t < (e.endH ?? Infinity));

/** one bed's input to the oedema model, from its tissue before secondary infarcts overwrite it */
const edemaBedOf = (model: Pick<Model, 'hemoAcute' | 'hemoAfter' | 'bedOnsetH'>, bedId: string, bs: BedTimeState, effects: BedEffect[]): EdemaBedInput => ({
  // (each lesion swells on its own clock: V1-1)
  onsetH: model.bedOnsetH[bedId] ?? 0,
  infarct: bs.infarct,
  // (the surviving tissue past the time it is at risk still takes up water as before: W2-10)
  penumbra: bs.frac.penumbra + bs.holding,
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
  /**
   * the infarcted share of each region's volume (RegionTimeState.infarct): the dead tissue of its
   * beds, a lacune at its own volume (W3-5); `rInf` is what that costs of the region's function
   */
  rInfShown: Record<string, number>;
  rRel: Record<string, number>;
  /** rDys without the passing perilesional and remote depression (secondary infarcts included) */
  rBase: Record<string, number>;
  /** each region's level from dead and still ischaemic tissue alone (no regaining, no passing depression; a lacune at its level) */
  rSteady: Record<string, number>;
  lacuneLoss: Record<string, number>;
  lacuneIsch: Record<string, number>;
  lacuneOnly: string[];
  borderBySide: Record<Side, { border: number; total: number; kinds: string[] }>;
  /** every region with border-zone deficits (C1-F6), whatever the picture of its hemisphere */
  border: Record<string, BorderBeds>;
}

function levelsAt(model: Model, input: SimInput, tAbs: number, hemo: HemoResult | null, settled = false): Levels {
  const { course } = model;
  const cascade = model.cascade;
  const t = Math.max(0, tAbs - model.onsetH);
  const lacunes = [...course.lacunes.keys()];
  const { beds, lacuneLoss, lacuneIsch, lacuneRegain, lacuneOnly } = tissueAt(model, tAbs, hemo, settled);
  // dysfunction caused directly by the arterial occlusion(s), before secondary effects
  // (herniation etc.) are overlaid — syndromes describe the primary vascular pattern,
  // the secondary damage is reported as cascade events instead
  const primaryDys: Record<string, number> = {};
  // tissue state for the oedema model, captured before secondary infarcts overwrite it
  const edemaBeds: Record<string, EdemaBedInput> = {};
  for (const b of BEDS) {
    const bs = beds[b.id];
    primaryDys[b.id] = bs.frac.core + bs.frac.penumbra + bs.regaining + bs.holding;
    const effects = effectsAt(cascade, b.id, t);
    const eff = EFFECT_PRIORITY.find((k) => effects.some((e) => e.kind === k)) ?? null;
    edemaBeds[b.id] = edemaBedOf(model, b.id, bs, effects);
    bs.effect = eff;
    if (eff === 'secondary') {
      bs.infarct = 1;
      bs.frac = { normal: 0, oligemia: 0, penumbra: 0, core: 1, salvaged: 0 };
      bs.regaining = 0;
      bs.holding = 0;
    }
  }
  const edema = computeEdema({ tH: t, reperfusionH: model.edemaReperfusionH, decompression: input.decompression, beds: edemaBeds, cascade });
  const recoveryBeds: Record<string, RecoveryBedInput> = {};
  // (the stabilised penumbra still regaining function is silent, as the penumbra is)
  for (const b of BEDS) recoveryBeds[b.id] = { infarct: beds[b.id].infarct, penumbra: beds[b.id].frac.penumbra + beds[b.id].regaining + beds[b.id].holding };
  // each region's lesion has its own age when a later occlusion caused it (R6-6)
  const regionAgeH = regionAgesAt(model.regionStarts, tAbs);
  const recovery = computeRecovery({ tH: t, beds: recoveryBeds, edema, cascade, lacunes, lacuneLoss, regionAgeH, regionAcute: model.regionAcute });
  const baseMap: Record<string, number> = {};
  for (const b of BEDS) {
    const bs = beds[b.id];
    baseMap[b.id] = Math.min(1, bs.frac.core + bs.frac.penumbra + bs.regaining + bs.holding);
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
  const steadyMap: Record<string, number> = {};
  // (the surviving tissue past the time it is at risk still counts as ischaemic here, as before: W2-10)
  for (const b of BEDS) steadyMap[b.id] = Math.min(1, beds[b.id].frac.core + beds[b.id].frac.penumbra + beds[b.id].holding);
  const rSteady = regionAgg(steadyMap);
  // a lacune is small but sits in a compact fibre tract: it knocks out most of its function, from
  // the moment its branch closes (ischaemic tissue is silent too) — so a branch that reopens
  // within minutes gives a fully reversible deficit, a capsular TIA (C6-F2). The region shows as
  // infarcted the lacune's own share of its volume, already in its beds (tissueAt: its typical
  // volume, no more than its bundle feeds there, W2-2), so the region list and the final infarct
  // agree; the function it costs is `rInf` (W3-5)
  const rInfShown = { ...rInf };
  for (const rid of lacunes) {
    const dead = LACUNE_DYSFUNCTION * lacuneLoss[rid];
    // (after its branch reopens, what survived regains its function over hours, as tissue rescued
    // behind the whole bundle does: Y1-12, W2-2; a closure of minutes still clears at once)
    const level = LACUNE_DYSFUNCTION * (lacuneLoss[rid] + lacuneIsch[rid] + lacuneRegain[rid]);
    rDys[rid] = Math.max(rDys[rid] ?? 0, level);
    rPrim[rid] = Math.max(rPrim[rid] ?? 0, level);
    rBase[rid] = Math.max(rBase[rid] ?? 0, level);
    rSteady[rid] = Math.max(rSteady[rid] ?? 0, LACUNE_DYSFUNCTION * (lacuneLoss[rid] + lacuneIsch[rid]));
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
  return { t, beds, edema, recovery, regionAgeH, rDys, rPrim, rInf, rInfShown, rRel, rBase, rSteady, lacuneLoss, lacuneIsch, lacuneOnly, borderBySide, border };
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
function lesionListAt(
  model: Model,
  input: SimInput,
  tAbs: number,
  hemo: HemoResult | null,
  ref: HeldReference | null,
  trace?: Set<string>,
  settled = false,
): LesionList {
  const lv = levelsAt(model, input, tAbs, hemo, settled);
  const { t, edema } = lv;
  const cascade = model.cascade;
  const extra: SymptomItem[] = [];
  // only after a clear trigger, and only as possible (C3-F11)
  if (cascade.palatalTremorFromH !== null && t >= cascade.palatalTremorFromH) {
    extra.push({ id: 'palatal_tremor', side: null, sev: 1, sources: [], delayed: true });
  }
  for (const e of cascade.events) {
    // a herniation coma lasts, after the oedema peak, only while the mass effect is still in the
    // coma range: a survivor wakes as the swelling subsides (C4-F1)
    for (const sy of symptomsAddedAt(e, t, edema.massEffectMm)) {
      const sides: (Side | null)[] = sy.side === 'both' ? ['r', 'l'] : [sy.side];
      for (const sd of sides) extra.push({ id: sy.id, side: sd, sev: sy.sev, sources: [], delayed: false });
    }
  }
  // the level of consciousness follows the horizontal midline shift of a swollen hemisphere
  // (Ropper 1986; cascade.consciousnessFromShift), whatever event caused the swelling (C4-F2), and
  // the swelling of both hemispheres counted together when both swell (Y2-13)
  const byShift = consciousnessFromShift(edema.massEffectMm);
  if (byShift) extra.push({ id: byShift.id, side: null, sev: byShift.sev, sources: [], delayed: false });
  // both hemispheres largely out of action lower consciousness before any swelling (Y2-13)
  if (bilateralHemispheric(lv.rDys, (rid) => lv.regionAgeH?.[rid] ?? t)) extra.push({ id: 'somnolence', side: null, sev: 1, sources: [], delayed: false });
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
  const all = lesionSymptoms(lv.rDys, lv.rInf, t, extra, lv.lacuneOnly, border, lacuneDeficitsOf(model.course), model.regionAcute, lv.regionAgeH, hold, { steady: lv.rSteady, base: lv.rBase });
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
 * before it and no longer once the rescued tissue works again (taken as if at once: the tissue
 * regains its function over hours to days, tissue.silentAfterReflow, Y1-12, and a deficit that
 * clears then is held like one that cleared at the reopening), with those held at the reopening
 * before (computed once per model). Such a deficit is listed again only when a region's tissue itself (its level without
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
    // what the tissue gives once blood has returned, as if the rescued tissue worked again at once:
    // a deficit that clears when it has regained its function (Y1-12) is held as one that cleared
    // at the reopening was
    lesionListAt(model, input, tr, null, prev, after, true);
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

/**
 * The schedule as it stands at the displayed time (W2-3): the occlusions that have begun by
 * input.tH. One that begins later is not known yet, so it changes nothing at that time: not the
 * index onset, the swelling (the oedema model's size factor and the malignant course are read from
 * the final infarct of what has begun), the events or the forecast of the course. A phase whose
 * end is the start of a worse phase of the same vessel that has not begun (a stenosis that occludes
 * later) lasts, as far as is known then; an end that is a reopening, to nothing or to a milder
 * narrowing, is the phase's own. Null when nothing is pending; else the schedule so far and,
 * per occlusion of it, its index in the input.
 */
function knownAt(input: SimInput): { known: SimInput; index: number[] } | null {
  const tH = input.tH;
  if (input.occlusions.every((o) => startOf(o) <= tH)) return null;
  const index: number[] = [];
  const occlusions: Occlusion[] = [];
  input.occlusions.forEach((o, i) => {
    if (startOf(o) > tH) return;
    const next = successorOf(input.occlusions, o);
    index.push(i);
    occlusions.push(next && startOf(next) > tH && progressed(input.occlusions, o) ? { ...o, toH: null } : o);
  });
  return { known: { ...input, occlusions }, index };
}

function run(input: SimInput, symptomsOnly: true): SymptomItem[];
function run(input: SimInput, symptomsOnly: false): SimResult;
function run(input: SimInput, symptomsOnly: boolean): SimResult | SymptomItem[] {
  // an occlusion that begins later is not known at the displayed time (W2-3): the result is that
  // of the schedule so far, with the whole schedule's events and the later occlusions pending
  const pending = knownAt(input);
  if (pending) {
    if (symptomsOnly) return run(pending.known, true);
    const r = run(pending.known, false);
    const plan = planTreatment(input);
    r.input = input;
    r.schedule = {
      ...r.schedule,
      events: scheduleEvents(input.occlusions, input.reperfusionH, plan?.failed ?? false),
      status: input.occlusions.map((_, i) => {
        const k = pending.index.indexOf(i);
        return k < 0 ? 'pending' : r.schedule.status[k];
      }),
    };
    r.treatment = treatmentInfoOf(plan);
    return r;
  }
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
  const { beds, rDys, rPrim, rInf, rInfShown, rRel, lacuneLoss, lacuneIsch, lacuneOnly, borderBySide } = lv;
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
    regions[r.id] = { rel: rRel[r.id], infarct: rInfShown[r.id], lost: rInf[r.id], dys: rDys[r.id], dominant, effect };
  }

  for (const rid of lacunes) {
    if (!regions[rid] || regions[rid].effect) continue;
    if (lacuneLoss[rid] >= 0.5) regions[rid].dominant = 'core';
    else if (lacuneIsch[rid] > 0 && ['normal', 'oligemia', 'salvaged'].includes(regions[rid].dominant)) regions[rid].dominant = 'penumbra';
  }

  // ── symptoms, NIHSS, syndromes ──
  // what cannot be examined at the patient's level of consciousness, in a blind patient or in
  // akinetic mutism is left out of the list and named apart (R5-7, X1-2, X1-12, Y2-14, Y2-15)
  const { shown: symptoms, unexaminable } = byConsciousness(all);
  if (symptomsOnly) return symptoms;
  // the NIHSS caveat for posterior strokes (Y3-6): tissue of the vertebrobasilar circulation has
  // become ischaemic by now, and the patient has a symptom (listed, or there but not examinable)
  const posterior = model.posteriorStarts.some((h) => h <= tAbs + 1e-9) && symptoms.length + unexaminable.length > 0;
  const nihss = estimateNihss(symptoms, posterior);

  const occl = new Set(episode.active.filter((o) => o.severity >= 1).map((o) => o.vessel));
  const rev = new Set(episodeHemo.reversed);
  const idOf = (base: string, side?: Side | 'm') => (side && side !== 'm' ? `${base}_${side}` : base);
  // the region rules read the primary vascular pattern; a label named for its signs also needs
  // them in the symptom list just computed
  // (a midline region, the upper cervical cord, is read from either side: W3-8)
  const prim = (base: string, side: Side) => rPrim[`${base}_${side}`] ?? rPrim[base] ?? 0;
  const syndromes = detectSyndromes({
    f: prim,
    acute: (base, side) => (tAbs >= model.onsetH ? model.regionAcute[`${base}_${side}`] ?? model.regionAcute[base] ?? 0 : 0),
    has: (base, side, thr = 0.25) => prim(base, side) >= thr,
    hasAny: (bases, side, thr = 0.25) => bases.some((b) => prim(b, side) >= thr),
    both: (base, thr = 0.25) => prim(base, 'r') >= thr && prim(base, 'l') >= thr,
    occluded: (base, side) => occl.has(idOf(base, side)) || (!side && (occl.has(`${base}_r`) || occl.has(`${base}_l`))),
    reversed: (base, side) => rev.has(idOf(base, side)),
    border: (side) => borderBySide[side],
    haemodynamic: (side) => haemodynamicSetting(input.map, input.occlusions.filter((o) => startOf(o) <= tAbs), side),
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
  const cord = { core: 0, penumbra: 0, final: model.cordFinal };
  for (const b of BEDS) {
    const cat = REGION_BY_ID[b.region].category;
    if (cat === SPINAL) {
      cord.core += beds[b.id].infarct * b.volume;
      cord.penumbra += beds[b.id].frac.penumbra * b.volume;
    }
    if (!BRAIN.has(cat)) continue;
    core += beds[b.id].infarct * b.volume;
    pen += beds[b.id].frac.penumbra * b.volume;
  }
  const brainCore = core;
  // the spinal cord's part is counted with the brain's and named apart (W3-8)
  core += cord.core;
  pen += cord.penumbra;
  // everything that will eventually be dead, including secondary (herniation) infarcts
  const finalInfarct = cascade.volumes.withSecondary + cord.final;
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
    volumes: { core, penumbra: pen, finalInfarct, saved: cascade.savedVolume, savedSecondary: cascade.savedSecondary, cord },
    neuronsLost: brainCore * NEURONS_PER_ML,
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
    treatment: treatmentInfoOf(plan),
  };
}

/** what the treatment does, as SimResult.treatment reports it */
const treatmentInfoOf = (plan: TreatmentPlan | null): TreatmentInfo | null =>
  plan
    ? {
        options: plan.options,
        reperfusedFraction: plan.x,
        reopened: [...new Set(plan.reopened.map((o) => o.vessel))],
        failed: plan.failed,
        reocclusionH: plan.reocclusionH,
        distalEmbolus: plan.distalEmbolus,
      }
    : null;

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
