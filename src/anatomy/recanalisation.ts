/**
 * Published figures about recanalisation treatment, shown next to the treatment options so that
 * a chosen result can be read against how often it happens. They inform; they never decide the
 * simulated outcome (the model is deterministic and the user picks the result).
 *
 * Every number carries its source. Proportions are 0–1.
 */

import type { L } from './types';
import type { TreatmentMethod } from '../engine/treatment';

export interface EvidenceRange {
  /** proportion (0–1) */
  low: number;
  high: number;
  /** a representative value if the sources give one */
  typical?: number;
  /** what exactly was measured (definition, population) */
  note: L;
  /** short citation(s) */
  source: string;
}

/** occlusion sites the evidence is reported by */
export type SiteGroup = 'ica' | 'm1' | 'm2' | 'distal' | 'basilar' | 'vertebral' | 'other';

export interface RecanalisationEvidence {
  /** chance of successful reperfusion (recanalisation after IVT; eTICI/mTICI ≥ 2b after EVT) */
  success: Partial<Record<SiteGroup, Partial<Record<TreatmentMethod, EvidenceRange>>>>;
  /** symptomatic intracranial haemorrhage */
  sich: Partial<Record<TreatmentMethod, EvidenceRange>>;
  /** early reocclusion after successful recanalisation */
  reocclusion: Partial<Record<TreatmentMethod, EvidenceRange>>;
  /** emboli to new territories or distal branches during thrombectomy */
  distalEmbolization: EvidenceRange | null;
  /** incomplete microvascular reperfusion despite a reopened artery ("no-reflow") */
  noReflow: EvidenceRange | null;
  /** usual time limit for IV thrombolysis after onset (h) */
  ivtWindowH: number;
  /** usual time limit for thrombectomy after onset with favourable imaging (h) */
  evtWindowH: number;
}

/** which site group an occluded artery (base id) belongs to; filled in with the evidence */
export function siteGroupOf(vesselBaseId: string): SiteGroup {
  void vesselBaseId;
  return 'other';
}

export const RECANALISATION_EVIDENCE: RecanalisationEvidence = {
  success: {},
  sich: {},
  reocclusion: {},
  distalEmbolization: null,
  noReflow: null,
  ivtWindowH: 4.5,
  evtWindowH: 24,
};
