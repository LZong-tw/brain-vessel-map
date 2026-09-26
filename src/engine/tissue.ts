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
 * The time constants are illustrative ("time is brain": Saver, Stroke 2006) and are not a
 * prediction for any individual.
 */

export type TissueState = 'normal' | 'oligemia' | 'penumbra' | 'core' | 'salvaged';

export const CORE_REL = 0.3;
export const PENUMBRA_REL = 0.55;
export const OLIGEMIA_REL = 0.85;

/** hours until 63 % of a unit at this perfusion has infarcted */
export function tauHours(rel: number): number {
  if (rel < CORE_REL) return 0.12;
  if (rel >= PENUMBRA_REL) return Infinity;
  const x = (rel - CORE_REL) / (PENUMBRA_REL - CORE_REL);
  return 1.5 * Math.pow(20, x);
}

/** infarcted fraction of a unit at time t (hours) with optional reperfusion time */
export function infarctFraction(rel: number, tH: number, reperfusionH: number | null): number {
  const tau = tauHours(rel);
  if (!Number.isFinite(tau)) return 0;
  const tEff = reperfusionH !== null ? Math.min(tH, reperfusionH) : tH;
  return 1 - Math.exp(-Math.max(tEff, 0) / tau);
}

export function unitState(rel: number, tH: number, reperfusionH: number | null): { f: number; state: TissueState } {
  const f = infarctFraction(rel, tH, reperfusionH);
  if (f >= 0.5) return { f, state: 'core' };
  const reperfused = reperfusionH !== null && tH >= reperfusionH;
  if (rel < PENUMBRA_REL) return { f, state: reperfused ? 'salvaged' : 'penumbra' };
  if (rel < OLIGEMIA_REL && !reperfused) return { f, state: 'oligemia' };
  return { f, state: 'normal' };
}

/** Neurons lost per mL of infarcted tissue (Saver 2006: ~1.2 billion in a typical 54 mL infarct). */
export const NEURONS_PER_ML = 22e6;
