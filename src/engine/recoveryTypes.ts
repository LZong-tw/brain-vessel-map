/**
 * Contract between the recovery model (recovery.ts) and the rest of the app.
 *
 * Functional deficit is not the same as dead tissue: early on, oedema and remote depression
 * (diaschisis) silence tissue that is alive, so the deficit is worse than the infarct; later,
 * spared pathways partly take over lost functions. This state describes both at the displayed
 * time. It is illustrative, not a prognosis.
 */
import type { RedundancyKind } from '../anatomy/redundancy';

export interface RecoveryState {
  /** temporary dysfunction per bed on top of core + penumbra, as a fraction of the bed (0–1) */
  extraDys: Record<string, number>;
  /** the part of `extraDys` caused by remote depression (diaschisis); the rest is perilesional oedema */
  diaschisisDys: Record<string, number>;
  /** per region: fraction of the function lost to infarction that has been compensated (0–1) */
  compensated: Record<string, number>;
  /** how far the typical compensation time course has run at the displayed time (0–1) */
  progress: number;
}

export const NO_RECOVERY: RecoveryState = { extraDys: {}, diaschisisDys: {}, compensated: {}, progress: 0 };

/** Recovery outlook of one symptom (attached by clinical.aggregateSymptoms). */
export interface SymptomRecovery {
  /** redundancy of the function (see anatomy/redundancy.ts) */
  kind: RedundancyKind;
  /** fraction of the deficit taken over by other pathways at the displayed time (0–1) */
  compensated: number;
  /** the same pathway is damaged on both sides, so its backup is (partly) gone too */
  bilateral: boolean;
  /** … and both sides are cut where the main pathways and their backups run together (ventral pons) */
  bottleneck: boolean;
}
