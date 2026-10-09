export interface DeficitSeverity {
  sev: number;
  continuousSeverity?: number;
}

const clampSeverity = (value: number) => Math.min(3, Math.max(0, value));

/** Continuous model deficit severity, not a measured muscle-strength scale. */
export function continuousSeverity(symptom: DeficitSeverity): number {
  const value = Number.isFinite(symptom.continuousSeverity) ? symptom.continuousSeverity! : symptom.sev;
  return Number.isFinite(value) ? clampSeverity(value) : 0;
}

/**
 * Project model severity through its existing motor-score anchors to the nearest
 * ordinal score. A listed positive deficit retains at least its mild score.
 * NIHSS motor items define observed scores 0–4, with 4 meaning no movement:
 * https://www.ninds.nih.gov/sites/default/files/2025-03/KnowStroke_NIHStrokeScale_March2025_508c.pdf
 * This interpolation is a model projection, not a validated lesion-to-examination
 * relationship: score 4 does not require complete anatomical tract loss. The
 * continuous model value survives this separate ordinal quantization.
 */
export function deficitOrdinalMotorPoints(symptom: DeficitSeverity, pts: readonly [number, number, number]): number {
  const severity = continuousSeverity(symptom);
  // Legacy ordinal fixtures retain their existing catalog scores.
  if (!Number.isFinite(symptom.continuousSeverity)) {
    return severity === 0 ? 0 : pts[Math.max(0, Math.round(severity) - 1)];
  }
  if (severity === 0) return 0;
  const anchors = [0, ...pts];
  const lower = Math.floor(severity);
  if (lower === 3) return anchors[3];
  return Math.max(pts[0], Math.round(anchors[lower] + (anchors[lower + 1] - anchors[lower]) * (severity - lower)));
}
