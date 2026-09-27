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

/**
 * Infarcted fraction of a unit at time t (hours). Perfusion is `rel` until the occlusion is
 * reopened at `reperfusionH`, and `relAfter` from then on — full recanalisation stops the
 * damage, but tissue that stays under-perfused (e.g. behind a residual stenosis) keeps dying.
 */
export function infarctFraction(
  rel: number,
  tH: number,
  reperfusionH: number | null,
  relAfter = 1,
  p: TissueParams = DEFAULT_TISSUE,
): number {
  if (reperfusionH === null || tH <= reperfusionH) return lossAt(rel, tH, p);
  const f1 = lossAt(rel, reperfusionH, p);
  // continue on the post-reperfusion curve from the point that matches the damage so far,
  // so an unchanged flow gives exactly the untreated course
  const pf = finalInfarctProb(relAfter, p);
  const tau = tauHours(relAfter, p);
  if (f1 >= pf || !Number.isFinite(tau)) return f1;
  const tEquivalent = f1 > 0 ? p.lagH - tau * Math.log(1 - f1 / pf) : Math.min(reperfusionH, p.lagH);
  return lossAt(relAfter, tEquivalent + (tH - reperfusionH), p);
}

/**
 * Split a unit at time t into its infarcted fraction `f` (state "core") and the state of the
 * surviving remainder.
 */
export function unitState(
  rel: number,
  tH: number,
  reperfusionH: number | null,
  relAfter = 1,
  p: TissueParams = DEFAULT_TISSUE,
): { f: number; rest: TissueState } {
  const f = infarctFraction(rel, tH, reperfusionH, relAfter, p);
  const reperfused = reperfusionH !== null && tH >= reperfusionH;
  const cur = reperfused ? relAfter : rel;
  const since = reperfused ? tH - (reperfusionH as number) : tH;
  let rest: TissueState;
  if (cur < p.penumbraRel) {
    // penumbra that outlived its time window has stabilised (collaterals held or the vessel
    // partly reopened): hypoperfused but functioning
    rest = since < penumbraResolveH(cur, p) ? 'penumbra' : 'oligemia';
  } else if (reperfused && rel < p.penumbraRel) rest = 'salvaged';
  else rest = cur < p.oligemiaRel ? 'oligemia' : 'normal';
  return { f, rest };
}

/** Neurons lost per mL of infarcted tissue (Saver 2006: ~1.2 billion in a typical 54 mL infarct). */
export const NEURONS_PER_ML = 22e6;
