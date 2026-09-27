/**
 * Contract between the recovery model (recovery.ts) and the rest of the app.
 *
 * Functional deficit is not the same as dead tissue: early on, oedema and remote depression
 * (diaschisis) silence tissue that is alive, so the deficit is worse than the infarct; later,
 * spared pathways partly take over lost functions. This state describes both at the displayed
 * time. It is illustrative, not a prognosis.
 */

export interface RecoveryState {
  /** temporary dysfunction per bed on top of core + penumbra, as a fraction of the bed (0–1) */
  extraDys: Record<string, number>;
  /** per region: fraction of the function lost to infarction that has been compensated (0–1) */
  compensated: Record<string, number>;
}

export const NO_RECOVERY: RecoveryState = { extraDys: {}, compensated: {} };
