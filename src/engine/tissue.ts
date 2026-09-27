/**
 * Tissue fate as a function of residual perfusion and time.
 *
 * Relative CBF thresholds (fraction of normal):
 *   < 0.30   ischaemic core — irreversible within minutes (CT-perfusion rCBF < 30 %;
 *            Campbell et al. Stroke 2011)
 *   < 0.55   penumbra — electrically silent (symptomatic) but salvageable; converts to infarct
 *            over hours, faster the lower the flow (Astrup, Siesjö & Symon, Stroke 1981)
 *   < 0.85   benign oligaemia — functioning, not at risk unless flow falls further
 *
 * Untreated penumbra does not all die: the lower its flow, the more of it is eventually lost
 * (in non-reperfused patients a large part — but not all — of the perfusion/diffusion mismatch
 * is incorporated into the final infarct; Davis et al. EPITHET, Lancet Neurol 2008; Albers et
 * al. DEFUSE, Ann Neurol 2006). `finalInfarctProb` encodes that as a smooth function of flow.
 *
 * Flow may change over time (an occlusion that comes and goes, a stenosis that later occludes,
 * treatment): the model takes a piecewise-constant flow history per unit (lossSteps,
 * tissueCourse). `infarctFraction` / `unitState` are the classic two-phase case (flow `rel` from
 * onset, `relAfter` after recanalisation) and give exactly the same numbers as before.
 *
 * The parameters live in tissueParams.ts (per bed). The time constants and probabilities are
 * illustrative ("time is brain": Saver, Stroke 2006) and are not a prediction for any individual.
 */

import { DEFAULT_TISSUE, type TissueParams } from './tissueParams';

export type TissueState = 'normal' | 'oligemia' | 'penumbra' | 'core' | 'salvaged';

export const CORE_REL = DEFAULT_TISSUE.coreRel;
export const PENUMBRA_REL = DEFAULT_TISSUE.penumbraRel;
export const OLIGEMIA_REL = DEFAULT_TISSUE.oligemiaRel;

/** hours until 63 % of a unit at this perfusion has infarcted (after the lag, if any) */
export function tauHours(rel: number, p: TissueParams = DEFAULT_TISSUE): number {
  if (rel < p.coreRel) return p.coreTauH;
  if (rel >= p.penumbraRel) return Infinity;
  const x = (rel - p.coreRel) / (p.penumbraRel - p.coreRel);
  return p.penumbraTauMinH * Math.pow(p.penumbraTauSpan, x);
}

/** fraction of a unit at this perfusion that is eventually lost if flow is never restored */
export function finalInfarctProb(rel: number, p: TissueParams = DEFAULT_TISSUE): number {
  if (rel < p.coreRel) return 1;
  if (rel >= p.penumbraRel) return 0;
  const x = (rel - p.coreRel) / (p.penumbraRel - p.coreRel);
  return 1 - p.penumbraSurvivalMax * Math.pow(x, 1.3);
}

/** the penumbra "resolves" (dies or stabilises) after about three time constants */
export const penumbraResolveH = (rel: number, p: TissueParams = DEFAULT_TISSUE) => p.lagH + 3 * tauHours(rel, p);

function lossAt(rel: number, tH: number, p: TissueParams): number {
  const tau = tauHours(rel, p);
  if (!Number.isFinite(tau)) return 0;
  return finalInfarctProb(rel, p) * (1 - Math.exp(-Math.max(tH - p.lagH, 0) / tau));
}

/** One step of a piecewise-constant flow history: perfusion is `rel` from `fromH` until the next step. */
export interface FlowPhase {
  /** hours on the simulation clock */
  fromH: number;
  /** flow / baseline flow */
  rel: number;
}

/**
 * Infarcted fraction at the end of each phase of a flow history, evaluated up to time t.
 *
 * Each phase continues on its own loss curve from the point that matches the damage so far (the
 * "equivalent time"), so an unchanged flow gives exactly the uninterrupted course, damage never
 * shrinks, and flow above the penumbra threshold stops it. `lagH` is a budget of cumulative time
 * below the penumbra threshold: nothing is lost until it is used up, and it is not refilled when
 * flow returns (repeated short events add up).
 *
 * Phases must be sorted by `fromH`; the first one normally starts at 0. A phase counts once it
 * has begun (fromH < t). Returns one value per phase that has begun: the infarcted fraction at
 * the end of that phase, or at t for the last one.
 */
export function lossSteps(history: readonly FlowPhase[], tH: number, p: TissueParams = DEFAULT_TISSUE): number[] {
  const steps: number[] = [];
  let f = 0;
  /** cumulative time below the penumbra threshold so far */
  let ischaemicH = 0;
  for (let i = 0; i < history.length; i++) {
    const { fromH, rel } = history[i];
    if (!(fromH < tH)) break;
    const endH = i + 1 < history.length ? Math.min(history[i + 1].fromH, tH) : tH;
    const dt = endH - fromH;
    const tau = tauHours(rel, p);
    if (Number.isFinite(tau)) {
      const pf = finalInfarctProb(rel, p);
      if (f < pf) {
        // the time on this phase's curve that gives the damage so far; while nothing has died
        // yet, that is the part of the lag already used up
        const tEquivalent = f > 0 ? p.lagH - tau * Math.log(1 - f / pf) : Math.min(ischaemicH, p.lagH);
        f = lossAt(rel, tEquivalent + dt, p);
      }
      ischaemicH += dt;
    }
    steps.push(f);
  }
  return steps;
}

/** Infarcted fraction at time t for a piecewise-constant flow history (see lossSteps). */
export function infarctFractionOf(history: readonly FlowPhase[], tH: number, p: TissueParams = DEFAULT_TISSUE): number {
  const steps = lossSteps(history, tH, p);
  return steps.length ? steps[steps.length - 1] : 0;
}

/**
 * Split a unit at time t into its infarcted fraction `f` (state "core") and the state of the
 * surviving remainder, for a piecewise-constant flow history (see lossSteps):
 *   • "penumbra" while the current flow is below the penumbra threshold and less than the resolve
 *     window has passed since the current phase began (after that it has stabilised: hypoperfused
 *     but functioning, i.e. "oligemia");
 *   • "salvaged" when the flow was below the penumbra threshold in an earlier phase and is above
 *     it now;
 *   • otherwise "oligemia" or "normal" by the current flow.
 * The current phase is the last one with fromH ≤ t; before the first phase, flow is normal.
 */
export function tissueCourse(history: readonly FlowPhase[], tH: number, p: TissueParams = DEFAULT_TISSUE): { f: number; rest: TissueState } {
  const f = infarctFractionOf(history, tH, p);
  let c = -1;
  while (c + 1 < history.length && history[c + 1].fromH <= tH) c++;
  const cur = c >= 0 ? history[c].rel : 1;
  const since = c >= 0 ? tH - history[c].fromH : tH;
  let rest: TissueState;
  if (cur < p.coreRel) {
    // below the core threshold nothing functions: the last of the unit that has not died yet is
    // still dying, not "stabilised" (letting it count as functioning made a region's deficit dip
    // by a few per cent after half an hour and symptoms at the threshold flicker off and on)
    rest = 'penumbra';
  } else if (cur < p.penumbraRel) {
    // penumbra that outlived its time window has stabilised (collaterals held or the vessel
    // partly reopened): hypoperfused but functioning
    rest = since < penumbraResolveH(cur, p) ? 'penumbra' : 'oligemia';
  } else if (wasIschaemic(history, c, p)) rest = 'salvaged';
  else rest = cur < p.oligemiaRel ? 'oligemia' : 'normal';
  return { f, rest };
}

/** was any phase before phase `c` below the penumbra threshold? */
function wasIschaemic(history: readonly FlowPhase[], c: number, p: TissueParams): boolean {
  for (let i = 0; i < c; i++) if (history[i].rel < p.penumbraRel) return true;
  return false;
}

/** The classic two-phase history: `rel` from onset, `relAfter` once the vessel is reopened. */
const twoPhase = (rel: number, reperfusionH: number | null, relAfter: number): FlowPhase[] =>
  reperfusionH === null
    ? [{ fromH: 0, rel }]
    : [
        { fromH: 0, rel },
        { fromH: reperfusionH, rel: relAfter },
      ];

/**
 * Infarcted fraction of a unit at time t (hours). Perfusion is `rel` until the occlusion is
 * reopened at `reperfusionH`, and `relAfter` from then on — full recanalisation stops the
 * damage, but tissue that stays under-perfused (e.g. behind a residual stenosis) keeps dying.
 * The two-phase special case of infarctFractionOf.
 */
export function infarctFraction(
  rel: number,
  tH: number,
  reperfusionH: number | null,
  relAfter = 1,
  p: TissueParams = DEFAULT_TISSUE,
): number {
  return infarctFractionOf(twoPhase(rel, reperfusionH, relAfter), tH, p);
}

/**
 * Split a unit at time t into its infarcted fraction `f` (state "core") and the state of the
 * surviving remainder. The two-phase special case of tissueCourse.
 */
export function unitState(
  rel: number,
  tH: number,
  reperfusionH: number | null,
  relAfter = 1,
  p: TissueParams = DEFAULT_TISSUE,
): { f: number; rest: TissueState } {
  return tissueCourse(twoPhase(rel, reperfusionH, relAfter), tH, p);
}

/** Neurons lost per mL of infarcted tissue (Saver 2006: ~1.2 billion in a typical 54 mL infarct). */
export const NEURONS_PER_ML = 22e6;
