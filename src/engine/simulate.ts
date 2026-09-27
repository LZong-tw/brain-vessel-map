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
 */

import { BEDS, BED_BY_ID, REGIONS, REGION_BY_ID, VESSEL_BY_ID } from '../anatomy';
import type { Side } from '../anatomy';
import { computeCascade, type BedEffectKind, type CascadeOutput } from './cascade';
import { aggregateSymptoms, detectSyndromes, estimateNihss, type NihssResult, type SymptomItem, type SyndromeMatch } from './clinical';
import { getUnits, simulateHemodynamics, type HemoInput, type HemoResult, type Occlusion, type Unit } from './hemodynamics';
import { computeEdema, type EdemaBedInput } from './edema';
import type { EdemaState } from './edemaTypes';
import { computeRecovery, type RecoveryBedInput } from './recovery';
import type { RecoveryState } from './recoveryTypes';
import {
  activeAt,
  breakpoints,
  endOf,
  isTreatable,
  scheduleEvents,
  startOf,
  statusAt,
  type OcclusionStatus,
  type ScheduleEvent,
} from './schedule';
import { tissueParamsForBed } from './tissueParams';
import type { TreatmentOptions } from './treatment';
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

function buildCourse(input: SimInput, reperfusionH: number | null): Course {
  const pieces = breakpoints(input.occlusions, reperfusionH).map((fromH) => {
    const active = activeAt(input.occlusions, fromH, reperfusionH);
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

function bedInfarctAt(course: Course, tH: number) {
  const out: Record<string, number> = {};
  course.units.forEach((u, i) => {
    const f = infarctFractionOf(course.histories[i], tH, tissueParamsForBed(u.bed));
    out[u.bed] = (out[u.bed] ?? 0) + f * u.frac;
  });
  return out;
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
 * nothing (much) dies, it is the first start that makes brain tissue ischaemic.
 */
function indexOnset(input: SimInput, course: Course, finalH: number): number {
  const starts = [...new Set(input.occlusions.map(startOf))].sort((a, b) => a - b);
  if (starts.length <= 1) return starts[0] ?? 0;
  const credit = new Map<number, number>(starts.map((s) => [s, 0]));
  const add = (h: number, ml: number) => {
    let s = starts[0];
    for (const x of starts) if (x <= h) s = x;
    credit.set(s, credit.get(s)! + ml);
  };
  course.units.forEach((u, i) => {
    const bed = BED_BY_ID[u.bed];
    if (!BRAIN.has(REGION_BY_ID[bed.region].category)) return;
    const h = course.histories[i];
    let prev = 0;
    lossSteps(h, finalH, tissueParamsForBed(u.bed)).forEach((f, k) => {
      if (f > prev) add(h[k].fromH, (f - prev) * u.frac * bed.volume);
      prev = f;
    });
  });
  for (const [rid, list] of course.lacunes)
    for (const o of list) add(startOf(o), lacuneFraction(rid) * REGION_BY_ID[rid].volume * infarctFractionOf(branchHistory(o), finalH));
  let best = starts[0];
  for (const s of starts) if (credit.get(s)! > credit.get(best)! + 1e-9) best = s;
  if (credit.get(best)! >= ONSET_MIN_ML) return best;
  for (const s of starts) {
    const hemo = course.pieces[pieceIndex(course.pieces, s)].hemo;
    const ischaemic = course.units.some(
      (u) => BRAIN.has(REGION_BY_ID[BED_BY_ID[u.bed].region].category) && (hemo.unitRel[u.id] ?? 1) < tissueParamsForBed(u.bed).penumbraRel,
    );
    if (ischaemic) return s;
  }
  return starts[0];
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

/** Everything about one input that does not depend on the displayed time (cached). */
interface Model {
  course: Course;
  onsetH: number;
  finalH: number;
  /** piece of the index onset, and the piece after that episode first reopens */
  onsetIdx: number;
  afterIdx: number;
  /** first reopening of the index episode on the clinical clock (for the oedema model), or null */
  edemaReperfusionH: number | null;
  /** the cascade on the clinical clock … */
  cascade: CascadeOutput;
  /** … and on the simulation clock, for display */
  shownCascade: CascadeOutput;
  /**
   * per unit (same order as course.units): the fraction that treatment saves, i.e. that would be
   * lost by the end of the untreated course but survives this one (0 without treatment)
   */
  unitSaved: number[];
}

const modelCache = new Map<string, Model>();

function modelKey(input: SimInput): string {
  const occ = input.occlusions.map((o) => `${o.vessel}:${o.severity}:${o.branch ? 'b' : ''}:${startOf(o)}:${endOf(o)}`).join(',');
  return `${occ}|${[...input.variants].sort().join(',')}|${input.map}|${input.collateral}|${input.reperfusionH}|${input.decompression}`;
}

function modelFor(input: SimInput): Model {
  const key = modelKey(input);
  const hit = modelCache.get(key);
  if (hit) return hit;
  const reperf = input.reperfusionH;
  const course = buildCourse(input, reperf);
  const { pieces, units } = course;
  let lastChange = 0;
  for (const o of input.occlusions) lastChange = Math.max(lastChange, startOf(o), endOf(o) ?? 0);
  const finalH = lastChange + FINAL_H;
  const onsetH = indexOnset(input, course, finalH);
  const onsetIdx = pieceIndex(pieces, onsetH);
  // the index episode ends at treatment or when one of its occlusions reopens by itself
  const ends: number[] = [];
  if (reperf !== null && reperf >= onsetH) ends.push(reperf);
  for (const o of pieces[onsetIdx].active) {
    const e = endOf(o);
    if (e !== null && e > onsetH) ends.push(e);
  }
  const episodeEndH = ends.length ? Math.min(...ends) : null;
  const afterIdx = episodeEndH === null ? onsetIdx : pieceIndex(pieces, episodeEndH);
  const hemoAcute = pieces[onsetIdx].hemo;

  const bedFinal = addLacunes(bedInfarctAt(course, finalH), course, finalH);
  let bedFinalUntreated = bedFinal;
  let unitSaved: number[] = units.map(() => 0);
  if (reperf !== null) {
    const untreated = buildCourse(input, null);
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
  const cascade = computeCascade({
    reperfusionH: reperf !== null && reperf >= onsetH ? reperf - onsetH : null,
    decompression: input.decompression,
    occlusions: pieces[onsetIdx].active,
    hemo: hemoAcute,
    bedFinal,
    bedFinalUntreated,
    bedEarly: addLacunes(bedInfarctAt(course, onsetH + 14), course, onsetH + 14),
    regionAcute: regionAgg(acute),
  });
  const model: Model = {
    course,
    onsetH,
    finalH,
    onsetIdx,
    afterIdx,
    edemaReperfusionH: episodeEndH === null ? null : episodeEndH - onsetH,
    cascade,
    unitSaved,
    shownCascade: onsetH === 0 ? cascade : shiftTimes(cascade, onsetH),
  };
  if (modelCache.size > 200) modelCache.clear();
  modelCache.set(key, model);
  return model;
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
  const { course } = model;
  const units = course.units;
  const tAbs = input.tH;
  const reperf = input.reperfusionH;
  // flow at the index onset, and after that episode first reopens (treatment or by itself)
  const hemoAcute = course.pieces[model.onsetIdx].hemo;
  const hemoAfter = course.pieces[model.afterIdx].hemo;
  const hemo = course.pieces[pieceIndex(course.pieces, tAbs)].hemo;
  // the episode in progress: its occlusions and flow name the vascular syndrome
  const episode = course.pieces[episodeIndex(input, course.pieces, tAbs)];
  const activeOcclusions = activeAt(input.occlusions, tAbs, reperf);
  // reopened (by treatment, or a complete occlusion by itself) and no complete occlusion left
  const recanalized =
    ((reperf !== null && tAbs >= reperf) || input.occlusions.some((o) => isTreatable(o) && statusAt(o, tAbs, reperf) === 'reopened')) &&
    !activeOcclusions.some(isTreatable);
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
  units.forEach((u, i) => {
    const bs = beds[u.bed];
    const p = tissueParamsForBed(u.bed);
    const { f, rest } = tissueCourse(course.histories[i], tAbs, p);
    bs.frac.core += f * u.frac;
    if (rest === 'salvaged') {
      // "salvaged" is only what treatment saved (would have died untreated); the rest of the
      // reperfused tissue would have survived on its collaterals anyway and is simply perfused
      // again — calling all of it salvaged made a late recanalisation look like a rescue
      const saved = Math.min(1 - f, model.unitSaved[i]);
      bs.frac.salvaged += saved * u.frac;
      bs.frac[currentRel(course.histories[i], tAbs) < p.oligemiaRel ? 'oligemia' : 'normal'] += (1 - f - saved) * u.frac;
    } else bs.frac[rest] += (1 - f) * u.frac;
    bs.infarct += f * u.frac;
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
  if (cascade.events.some((e) => e.id.startsWith('hod_')) && t >= 2160) {
    extra.push({ id: 'palatal_tremor', side: null, sev: 1, sources: [], delayed: true });
  }
  for (const e of cascade.events) {
    if (!e.symptoms || e.onsetH > t || t >= (e.endH ?? Infinity)) continue;
    for (const sy of e.symptoms) {
      const sides: (Side | null)[] = sy.side === 'both' ? ['r', 'l'] : [sy.side];
      for (const sd of sides) extra.push({ id: sy.id, side: sd, sev: sy.sev, sources: [], delayed: false });
    }
  }
  const symptoms = aggregateSymptoms(rDys, rInf, t, extra, lacuneOnly);
  const affected = REGIONS.filter((r) => rDys[r.id] >= 0.2 || rInf[r.id] >= 0.2).map((r) => r.id);
  const nihss = estimateNihss(symptoms, affected);

  const occl = new Set(episode.active.filter((o) => o.severity >= 1).map((o) => o.vessel));
  const rev = new Set(episode.hemo.reversed);
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
      events: scheduleEvents(input.occlusions, reperf),
      status: input.occlusions.map((o) => statusAt(o, tAbs, reperf)),
    },
  };
}

/** Quick "what happens if this vessel is blocked?" preview (24 h, untreated). */
export function previewOcclusion(vessel: string, base: Omit<SimInput, 'tH' | 'reperfusionH' | 'decompression'>): SimResult {
  const occ = base.occlusions.filter((o) => o.vessel !== vessel).concat([{ vessel, severity: 1 }]);
  return simulate({ ...base, occlusions: occ, tH: 24, reperfusionH: null, decompression: false });
}

export const isOccludable = (id: string) => {
  const v = VESSEL_BY_ID[id];
  return !!v && !v.visualOnly && !v.notOccludable;
};
