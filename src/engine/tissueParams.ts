/**
 * Parameters of the tissue-fate model (see tissue.ts), per perfusion bed.
 *
 * Every bed uses DEFAULT_TISSUE unless it has its own entry: this is where regional
 * differences in ischaemic tolerance or in how fast the penumbra is lost are calibrated.
 */

import { BEDS, REGION_BY_ID, VESSEL_BY_ID } from '../anatomy';
import type { Bed } from '../anatomy';

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

/**
 * Ischaemic lag and core loss.
 *
 * TODO(medical-review): no tissue is lost during the first 6 min below the penumbra threshold;
 * core loss then runs with a 0.09 h time constant (63 % lost about 11 min after onset instead of
 * about 7 min, and still more than 80 % at 15 min). A brief complete occlusion — a transient
 * ischaemic attack of a few minutes — thus causes symptoms but no infarct. Clinically, brief
 * episodes usually leave no DWI lesion while longer ones often do, which underlies the
 * tissue-based definition of TIA (Easton JD et al. Stroke 2009;40:2276–2293); in awake monkeys
 * a 15–30 min MCA occlusion left only microscopic foci of infarction, 2–3 h moderate to large
 * infarcts (Jones TH et al. J Neurosurg 1981;54:773–782). The loss at 15 min is kept close to
 * the previous model because the existing calibration relies on it, although the monkey data
 * suggest that even this is on the fast side.
 */
export const DEFAULT_TISSUE: TissueParams = {
  coreRel: 0.3,
  penumbraRel: 0.55,
  oligemiaRel: 0.85,
  coreTauH: 0.09,
  penumbraTauMinH: 1.5,
  penumbraTauSpan: 20,
  penumbraSurvivalMax: 0.85,
  lagH: 0.1,
};

/**
 * Brainstem supplied by the basilar artery (pons and midbrain).
 *
 * A calibration to what is seen in basilar artery occlusion, not measured physiological
 * constants. Thresholds, core loss and the ischaemic lag are the defaults.
 *
 * TODO(medical-review): penumbra lost half as fast as in the default (hemispheric) model.
 * Thrombectomy was clearly beneficial both within 12 h of onset (ATTENTION: Tao C et al.
 * N Engl J Med 2022;387:1361–1372) and 6–24 h after onset (BAOCHE: Jovin TG et al. N Engl J Med
 * 2022;387:1373–1384), i.e. salvageable brainstem often persists for many hours, far longer than
 * the hemispheric penumbra of this model would allow at the same flow. Proposed reasons are the
 * collateral network of the posterior circulation, retrograde filling of the distal basilar
 * artery and residual flow past a thrombus that grows stepwise, keeping the brainstem
 * perforators marginally patent (Lindsberg PJ et al. Time window for recanalization in basilar
 * artery occlusion: speculative synthesis. Neurology 2015;85:1806–1815). The steady flow model
 * captures the collaterals (hemodynamics.ts, BRAINSTEM_PIAL) but not the fluctuating residual
 * flow, for which this slower loss stands in. How long the tissue lasts still depends on the
 * residual flow, i.e. on the collaterals.
 *
 * TODO(medical-review): less of the untreated penumbra survives in the end (at most 40 % instead
 * of 85 %). Without recanalisation a good outcome of basilar artery occlusion is rare: in a
 * systematic analysis of 420 patients treated with thrombolysis, about 2 % of those whose artery
 * did not reopen (Lindsberg PJ, Mattle HP. Stroke 2006;37:922–928). Collaterals buy time
 * rather than a good outcome, and a thrombus that keeps
 * growing eventually closes the perforators they sustain. So even with good collaterals an
 * untreated mid-basilar occlusion still ends with the ventral pons largely infarcted.
 *
 * Applies only to brainstem beds supplied entirely by the basilar artery and its branches,
 * because that is what the calibration is about: the medulla (vertebral arteries, PICA, anterior
 * spinal artery) and the cerebral peduncle (partly fed by the anterior choroidal artery) keep
 * the defaults. So does the cerebellum: nothing here calibrates a different cerebellar time
 * course.
 */
const BASILAR_BRAINSTEM_TISSUE: TissueParams = {
  ...DEFAULT_TISSUE,
  penumbraTauMinH: 3,
  penumbraSurvivalMax: 0.4,
};

/** arterial families of the basilar artery and its branches */
const BASILAR_FAMILIES = new Set<string>(['BA', 'SCA', 'AICA', 'PCA', 'THAL']);

const basilarOnly = (supply: Bed['supply']) =>
  supply.length > 0 && supply.every((s) => BASILAR_FAMILIES.has(VESSEL_BY_ID[s.v]?.family ?? ''));

/** beds whose parameters differ from the defaults */
const BED_TISSUE: Record<string, TissueParams> = Object.fromEntries(
  BEDS.filter((b) => REGION_BY_ID[b.region]?.category === 'brainstem' && basilarOnly(b.supply)).map((b) => [
    b.id,
    BASILAR_BRAINSTEM_TISSUE,
  ]),
);

export const tissueParamsForBed = (bedId: string): TissueParams => BED_TISSUE[bedId] ?? DEFAULT_TISSUE;
