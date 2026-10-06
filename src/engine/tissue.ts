/**
 * Tissue fate as a function of residual perfusion and time.
 *
 * Relative CBF thresholds (fraction of normal):
 *   < 0.30   ischaemic core (CT-perfusion rCBF < 30 %; Campbell et al. Stroke 2011) — all of it is
 *            lost if flow never returns, but not at once: an end-artery territory without any
 *            flow within about half an hour, tissue that collaterals reach over hours, the faster
 *            the less flow it gets (tissueParams.ts, Y1-0)
 *   < 0.55   penumbra — functionally impaired (symptomatic) but salvageable; converts to infarct
 *            over hours, faster the lower the flow. The concept is Astrup, Siesjö & Symon's
 *            (Stroke 1981): tissue whose electrical function has failed while its ion pumps still
 *            work, viable for hours. The 0.55 bound is a model calibration of the operational
 *            (perfusion-imaging) penumbra, not an Astrup number: the classic absolute thresholds
 *            are about 20 (electrical failure) and 10 (infarction) mL/100 g/min (as summarised by
 *            Regenhardt et al., Front Neurol 2017; Astrup's own figures not checked against its
 *            full text), i.e. about 0.44 and 0.22 of this model's 45 mL cortex baseline. Reversible
 *            paralysis below about 23 mL/100 g/min in awake monkeys (about 0.5 of 45) is closer to
 *            the bound used here (Jones et al., J Neurosurg 1981).
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

/**
 * hours until 63 % of a unit at this perfusion has infarcted (after the lag, if any): below the core
 * threshold from coreTauH at no flow to coreTauH · coreTauSpan just below the threshold, in the
 * penumbra from penumbraTauMinH at its bottom to penumbraTauMinH · penumbraTauSpan at its top
 */
export function tauHours(rel: number, p: TissueParams = DEFAULT_TISSUE): number {
  if (rel < p.coreRel) return p.coreTauSpan === 1 ? p.coreTauH : p.coreTauH * Math.pow(p.coreTauSpan, Math.max(0, rel) / p.coreRel);
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
 *     but functioning, i.e. "oligemia", with `stabilisedH` the hours since it stabilised);
 *   • "salvaged" when the flow was below the penumbra threshold in an earlier phase and is above
 *     it now, with `reflowH` the hours since blood returned and `ischaemicH` the hours of ischaemia
 *     beyond the lag before that (see ischaemicHours): the caller lets it regain its function over
 *     the following hours to days (silentAfterReflow, Y1-12);
 *   • otherwise "oligemia" or "normal" by the current flow.
 * The current phase is the last one with fromH ≤ t; before the first phase, flow is normal.
 */
export function tissueCourse(
  history: readonly FlowPhase[],
  tH: number,
  p: TissueParams = DEFAULT_TISSUE,
): { f: number; rest: TissueState; stabilisedH?: number; reflowH?: number; ischaemicH?: number } {
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
    // partly reopened): hypoperfused but functioning — regaining function from then on, which
    // `stabilisedH` (the hours since) lets the caller spread out (R6-11)
    const resolveH = penumbraResolveH(cur, p);
    if (since < resolveH) rest = 'penumbra';
    else return { f, rest: 'oligemia', stabilisedH: since - resolveH };
  } else if (wasIschaemic(history, c, p)) {
    // blood has returned since the last ischaemic phase (Y1-12)
    let j = c;
    while (j > 0 && history[j - 1].rel >= p.penumbraRel) j--;
    return { f, rest: 'salvaged', reflowH: tH - history[j].fromH, ischaemicH: ischaemicHours(history, j, p) };
  } else rest = cur < p.oligemiaRel ? 'oligemia' : 'normal';
  return { f, rest };
}

/**
 * Hours of ischaemia (flow below the penumbra threshold) before phase `end`, beyond the lag: the
 * time in which the tissue was dying, added up over every ischaemic phase. Nothing counts within
 * the lag, so a TIA of minutes gives 0.
 */
export function ischaemicHours(history: readonly FlowPhase[], end: number, p: TissueParams = DEFAULT_TISSUE): number {
  let budget = p.lagH;
  let h = 0;
  for (let i = 0; i < end && i + 1 < history.length; i++) {
    if (!(history[i].rel < p.penumbraRel)) continue;
    const dt = history[i + 1].fromH - history[i].fromH;
    const used = Math.min(budget, dt);
    budget -= used;
    h += dt - used;
  }
  return h;
}

/**
 * Function returns gradually after reperfusion (Y1-12). Of the tissue that survives `ischaemicH`
 * hours of ischaemia beyond the lag (ischaemicHours), this share is still silent `sinceH` hours
 * after blood returned. A part returns at once — all of it when nothing had begun to die (within
 * the lag: a TIA of minutes), about a quarter after an hour of ischaemia, almost none after two
 * hours or more — and the rest in two steps: most of it with a time constant that grows with how
 * long the ischaemia lasted (about 2 h after an hour of it, about 16 h after 6 h: half back by
 * about 2 h and by about a day), and a slower quarter (eight times slower) that is back within
 * weeks. The time constant follows how long the ischaemia lasted, not how deep it was at each
 * spot: how deep it was mostly decides how much of the tissue dies (the tissue model), and all the
 * rescued tissue of a territory regains its function at one pace, so the deficits shrink towards
 * the final picture without new combinations appearing on the way (an aphasia type changing from
 * fluent to non-fluent, which does not happen: X3-14).
 *
 * TODO(medical-review): an illustrative shape. Only about 1 in 4 thrombectomy patients has an
 * NIHSS below 6 within 30 min of successful recanalisation (Desai SM et al. Stroke Vasc Interv
 * Neurol 2022;2:e000138); 54 % of the functional benefit of recanalisation is apparent in the
 * NIHSS at 24 h and 75 % at discharge (Kniep H et al. Stroke 2022;53:2828–2837); the benefit
 * falls with every hour of delay to reperfusion (Fransen PS et al. JAMA Neurol 2016;73:190–196)
 * and recovery can be delayed (the "stunned brain": Klapproth S et al. J Neurol 2025;272:313).
 * Rescued penumbra can still lose neurons in proportion to how deep its hypoperfusion was
 * (Guadagno JV et al. Brain 2008;131:2666–2678): the model takes that lasting loss to be zero, so
 * all of the rescued function returns in the end.
 */
export function silentAfterReflow(sinceH: number, ischaemicH: number): number {
  if (!(ischaemicH > 0)) return 0;
  const later = 1 - Math.exp(-ischaemicH / REFLOW_AT_ONCE_H);
  const tau = REFLOW_TAU_PER_ISCHAEMIC_H * ischaemicH;
  const s = Math.max(0, sinceH);
  return later * (REFLOW_FAST_SHARE * Math.exp(-s / tau) + (1 - REFLOW_FAST_SHARE) * Math.exp(-s / (REFLOW_SLOW_FACTOR * tau)));
}

/**
 * Hours after blood returned by which less than `below` of the rescued tissue is still silent, after
 * `ischaemicH` hours of ischaemia beyond the lag (silentAfterReflow): when a deficit of tissue that
 * was all ischaemic clears (0 when it clears at once).
 */
export function regainedAfterH(ischaemicH: number, below = 0.25): number {
  if (!(silentAfterReflow(0, ischaemicH) >= below)) return 0;
  let lo = 0;
  let hi = 1;
  while (silentAfterReflow(hi, ischaemicH) >= below) hi *= 2;
  for (let k = 0; k < 40; k++) {
    const m = (lo + hi) / 2;
    if (silentAfterReflow(m, ischaemicH) >= below) lo = m;
    else hi = m;
  }
  return hi;
}

/** hours of ischaemia beyond the lag after which e^−1 of the rescued function returns at the instant of reflow */
const REFLOW_AT_ONCE_H = 0.5;
/** the main time constant of the return, per hour of ischaemia beyond the lag */
const REFLOW_TAU_PER_ISCHAEMIC_H = 2.8;
/** the share that returns with the main time constant … */
const REFLOW_FAST_SHARE = 0.75;
/** … and how many times slower the rest returns */
const REFLOW_SLOW_FACTOR = 8;

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
  const { f, rest } = tissueCourse(twoPhase(rel, reperfusionH, relAfter), tH, p);
  return { f, rest };
}

/** Neurons lost per mL of infarcted tissue (Saver 2006: ~1.2 billion in a typical 54 mL infarct). */
export const NEURONS_PER_ML = 22e6;

