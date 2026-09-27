/**
 * Parameters of the tissue-fate model (see tissue.ts), per perfusion bed.
 *
 * Every bed uses DEFAULT_TISSUE unless it has its own entry: this is where regional
 * differences in ischaemic tolerance or in how fast the penumbra is lost are calibrated.
 */

export interface TissueParams {
  /** relative flow below which tissue is ischaemic core */
  coreRel: number;
  /** relative flow below which tissue is penumbra (electrically silent, at risk) */
  penumbraRel: number;
  /** relative flow below which tissue is oligaemic (functioning, not at risk) */
  oligemiaRel: number;
  /** time constant (h) of core loss */
  coreTauH: number;
  /** time constant (h) of penumbra loss just above the core threshold */
  penumbraTauMinH: number;
  /** how many times slower the loss is at the top of the penumbra than at its bottom */
  penumbraTauSpan: number;
  /** fraction of the best-perfused penumbra that survives if flow is never restored */
  penumbraSurvivalMax: number;
  /** hours of ischaemia before any tissue is lost (0 = loss starts at once) */
  lagH: number;
}

export const DEFAULT_TISSUE: TissueParams = {
  coreRel: 0.3,
  penumbraRel: 0.55,
  oligemiaRel: 0.85,
  coreTauH: 0.12,
  penumbraTauMinH: 1.5,
  penumbraTauSpan: 20,
  penumbraSurvivalMax: 0.85,
  lagH: 0,
};

/** beds whose parameters differ from the defaults */
const BED_TISSUE: Record<string, TissueParams> = {};

export const tissueParamsForBed = (bedId: string): TissueParams => BED_TISSUE[bedId] ?? DEFAULT_TISSUE;
