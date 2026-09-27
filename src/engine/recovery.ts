/**
 * Recovery of function after stroke (see recoveryTypes.ts). Not modelled yet: every bed's
 * function follows its tissue state exactly.
 */

import type { CascadeOutput } from './cascade';
import type { EdemaState } from './edemaTypes';
import { NO_RECOVERY, type RecoveryState } from './recoveryTypes';

export interface RecoveryBedInput {
  /** infarcted fraction (including secondary infarcts) */
  infarct: number;
  /** fraction still in the penumbra */
  penumbra: number;
}

export interface RecoveryInput {
  tH: number;
  beds: Record<string, RecoveryBedInput>;
  edema: EdemaState;
  cascade: CascadeOutput;
}

export function computeRecovery(input: RecoveryInput): RecoveryState {
  void input;
  return NO_RECOVERY;
}
