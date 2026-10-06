/**
 * Parameters of the tissue-fate model (see tissue.ts), per perfusion unit (the part of a bed fed
 * by one artery).
 *
 * A unit uses its bed's own entry if the bed has one (the basilar brainstem, the retina), else,
 * when an end-artery perforator feeds it, DEEP_WHITE_MATTER_TISSUE in the internal capsule and
 * corona radiata and PERFORATOR_TISSUE elsewhere, else DEFAULT_TISSUE (tissue that collaterals can
 * reach): this is where regional differences in ischaemic tolerance or in how fast the core and
 * the penumbra are lost are calibrated.
 */

import { BEDS, BED_BY_ID, REGION_BY_ID, VESSEL_BY_ID } from '../anatomy';
import type { Bed } from '../anatomy';

export interface TissueParams {
  /** relative flow below which tissue is ischaemic core */
  coreRel: number;
  /** relative flow below which tissue is penumbra (functionally impaired, at risk; a model calibration) */
  penumbraRel: number;
  /** relative flow below which tissue is oligaemic (functioning, not at risk) */
  oligemiaRel: number;
  /** time constant (h) of the loss of tissue that gets no flow at all */
  coreTauH: number;
  /**
   * how many times slower the loss is just below the core threshold than at no flow (1: the same
   * time constant everywhere below the threshold); in between it changes geometrically with the flow
   */
  coreTauSpan: number;
  /** time constant (h) of penumbra loss just above the core threshold */
  penumbraTauMinH: number;
  /** how many times slower the loss is at the top of the penumbra than at its bottom */
  penumbraTauSpan: number;
  /** fraction of the best-perfused penumbra that survives if flow is never restored */
  penumbraSurvivalMax: number;
  /** hours of ischaemia before any tissue is lost (0 = loss starts at once) */
  lagH: number;
  /**
   * hours of ischaemia that do not count towards how slowly the rescued tissue regains its
   * function once blood returns (tissue.ischaemicHours, silentAfterReflow); absent: `lagH`.
   * Differs from it only where infarction starts late but function fails as early as in the
   * tissue around it (DEEP_WHITE_MATTER_TISSUE)
   */
  reflowLagH?: number;
}

/**
 * The former single model, kept for end-artery perforator territories (PERFORATOR_TISSUE) and as
 * the base of the brainstem and retina calibrations: no tissue is lost during the first 6 min
 * below the penumbra threshold; below the core threshold it is then lost with a 0.09 h time
 * constant (more than 80 % at 15 min).
 */
const FAST_CORE: TissueParams = {
  coreRel: 0.3,
  penumbraRel: 0.55,
  oligemiaRel: 0.85,
  coreTauH: 0.09,
  coreTauSpan: 1,
  penumbraTauMinH: 1.5,
  penumbraTauSpan: 20,
  penumbraSurvivalMax: 0.85,
  lagH: 0.1,
};

/**
 * Tissue that collaterals can reach: the cortex, the white matter and the cerebellum behind a
 * pial or trunk artery (Y1-0). How fast it is lost depends on how deep the ischaemia is and how
 * long it lasts: nothing is lost in the first 20 min, then tissue without any flow is lost with a
 * 3 h time constant (about a fifth by the end of the first hour, half by about 2½ h), tissue just
 * below the core threshold with an 8 h one, and penumbra more slowly still, up to 30 h at its top
 * (as before). Untreated,
 * everything below the core threshold still dies (finalInfarctProb), so final infarcts are those
 * of the former model; only the time course is slower.
 *
 * TODO(medical-review): calibrated to the measured growth of the ischaemic core in
 * anterior-circulation large-vessel occlusion, not to a measured time-to-infarction curve. Median
 * growth was 3.1 mL/h (IQR 0.7–10.7; Wheeler HM et al. Int J Stroke 2015;10:723–729) and 4.74
 * mL/h (IQR 1.25–14.84; Ospel JM et al. J Neurointerv Surg 2022;14:886–891); "fast progressors"
 * grow by 10 mL/h or more (Sarraj A et al. Stroke 2021;52:57–69), 77 % of those with the worst
 * collaterals (Seners P et al. Neurology 2023;101:e2126–e2137); the fastest of 415 ICA or M1
 * occlusions lost about 27 million neurons per minute, about 74 mL/h (Desai SM et al. Stroke
 * 2019;50:34–37). With poor collaterals the model puts most of the MCA territory at 5–15 % of
 * normal flow, and the former 0.09 h time constant killed it within 30 min (about 1000 mL/h). In
 * awake monkeys 15–30 min of MCA occlusion left only microscopic infarcts, flow below 10–12
 * mL/100 g/min for 2–3 h moderate to large ones (Jones TH et al. J Neurosurg 1981;54:773–782); in
 * patients reperfused early only flow below about 7–9 mL/100 g/min went on to infarct
 * (d'Esterre CD et al. Stroke 2015;46:3390–3397), and the perfusion "core" of the first hours
 * often survives reperfusion (Boned S et al. J Neurointerv Surg 2017;9:66–69). The model follows
 * the slower human course: about 60 mL at 1 h and 35–55 mL/h over the first 6 h behind an M1
 * occlusion with poor collaterals (about 70 mL at 1 h behind a carotid T occlusion, close to the
 * fastest measured), 20–30 mL/h with moderate collaterals and 10–20 mL/h with good ones. The
 * moderate and good figures stay above the median growth because the end-artery perforator
 * territories (PERFORATOR_TISSUE) and the anterior temporal cortex, which the model leaves without
 * flow, die early. The bottom of the penumbra had to slow down with the core (from 1.5 h to 8 h),
 * or tissue with more flow would have died faster than tissue with less.
 */
export const DEFAULT_TISSUE: TissueParams = {
  coreRel: 0.3,
  penumbraRel: 0.55,
  oligemiaRel: 0.85,
  coreTauH: 3,
  coreTauSpan: 8 / 3,
  penumbraTauMinH: 8,
  penumbraTauSpan: 30 / 8,
  penumbraSurvivalMax: 0.85,
  lagH: 1 / 3,
};

/**
 * End-artery perforator territories (the lenticulostriate, thalamic, choroidal and brainstem
 * perforators; anatomy/vessels.ts kind 'perforator'), and every lacune: no collateral reaches
 * them, so behind an occlusion they get no flow at all and keep the former fast course (Y1-0);
 * the deep white matter of the hemisphere they feed has its own, slower one
 * (DEEP_WHITE_MATTER_TISSUE, Z1-7).
 * In rats the lateral striatum, supplied by end arteries, was infarcted after 30 min of MCA
 * occlusion, the cortex only after 60 min (Memezawa H et al. Stroke 1992;23:552–559); with a
 * permanent occlusion irreversible change appears first in the caudoputamen and then spreads to
 * the cortex (Garcia JH et al. Stroke 1995;26:636–642).
 * TODO(medical-review): the 0.09 h time constant itself; a brief closure of a perforator (a
 * capsular TIA of minutes) still leaves nothing (Easton JD et al. Stroke 2009;40:2276–2293).
 */
export const PERFORATOR_TISSUE: TissueParams = { ...FAST_CORE };

/**
 * The deep white matter of the hemisphere behind an end-artery perforator: the internal capsule
 * (anterior limb, genu, posterior limb) and the corona radiata where the lenticulostriate,
 * Heubner, anterior or posterior choroidal arteries feed them (Z1-7). White matter tolerates
 * ischaemia better than grey matter, and its infarction commonly begins later (Kleine JF et al.
 * Tissue-selective salvage of the white matter by successful endovascular stroke therapy. Stroke
 * 2017;48:2776–2783), so behind a proximal MCA occlusion the striatum (PERFORATOR_TISSUE) is lost
 * early but the capsule beside it only over hours: in 92 patients reopened by thrombectomy all had
 * striatal ischaemia, only 45 (48.9 %) the corticospinal part of the capsule; each hour from onset
 * to reperfusion of the lenticulostriate arteries (median 234 min) raised the odds of capsular
 * infarction 3.47-fold, beyond 5 h it was likely (> 80 %), the collateral grade made no
 * difference, and sparing the capsule meant less arm weakness and more independence (Kaesmacher J
 * et al. Early thrombectomy protects the internal capsule in patients with proximal middle
 * cerebral artery occlusion. Stroke 2021;52:1570–1579).
 *
 * TODO(medical-review): fitted (least squares over 2–6 h, rounded) to a logistic curve of the
 * probability of capsular infarction by time to reperfusion with that cohort's odds ratio (3.47
 * per hour) and its 50 % point at the median time (3.9 h, when about half had it), read as the
 * share of the capsule that is lost — the model has one typical patient, not a distribution:
 * nothing is lost in the first 2½ h, then tissue without flow is lost with a 1¾ h time constant
 * (about 58 % by 4 h, 76 % by 5 h and 86 % by 6 h, against 53 %, 80 % and 93 % on the curve).
 * Untreated it all dies in the end, as before. Function fails at once and, after reopening,
 * returns at the pace of the end-artery tissue around it (`reflowLagH` of the perforators), so a
 * capsule rescued at 1 h is still silent for some hours. Below the core threshold the flow makes
 * no difference (as in FAST_CORE); the penumbra is lost no faster than the core. Lacunes keep the
 * fast course of a single perforator (PERFORATOR_TISSUE): this calibration is about the whole
 * perforator group behind a trunk occlusion.
 */
export const DEEP_WHITE_MATTER_TISSUE: TissueParams = {
  ...FAST_CORE,
  coreTauH: 1.75,
  penumbraTauMinH: 1.75,
  lagH: 2.5,
  reflowLagH: FAST_CORE.lagH,
};

/** the deep white matter of the hemisphere (DEEP_WHITE_MATTER_TISSUE where a perforator feeds it) */
const DEEP_WHITE_MATTER = new Set(['ic_anterior_limb', 'ic_genu', 'ic_posterior_limb', 'corona_radiata']);

/**
 * Brainstem supplied by the basilar artery (pons and midbrain).
 *
 * A calibration to what is seen in basilar artery occlusion, not measured physiological
 * constants. Thresholds, core loss and the ischaemic lag are those of the former single model
 * (FAST_CORE, as in PERFORATOR_TISSUE): the basilar calibration (posterior.test.ts) was made with
 * them and is kept as it was when the collateral-fed tissue was slowed down (Y1-0).
 *
 * TODO(medical-review): penumbra lost half as fast as in the former single model (from 3 h
 * instead of 1.5 h just above the core threshold). Thrombectomy was clearly beneficial both within
 * 12 h of onset (ATTENTION: Tao C et al. N Engl J Med 2022;387:1361–1372) and 6–24 h after onset
 * (BAOCHE: Jovin TG et al. N Engl J Med 2022;387:1373–1384), i.e. salvageable brainstem often
 * persists for many hours, far longer than the former single model allowed at the same flow; the
 * slower penumbra was fitted to that, on the former single model. Proposed reasons are the
 * collateral network of the posterior circulation, retrograde filling of the distal basilar
 * artery and residual flow past a thrombus that grows stepwise, keeping the brainstem
 * perforators marginally patent (Lindsberg PJ et al. Time window for recanalization in basilar
 * artery occlusion: speculative synthesis. Neurology 2015;85:1806–1815). The steady flow model
 * captures the collaterals (hemodynamics.ts, BRAINSTEM_PIAL) but not the fluctuating residual
 * flow, for which this slower loss stands in. How long the tissue lasts still depends on the
 * residual flow, i.e. on the collaterals.
 *
 * Since Y1-0 the hemispheric tissue that collaterals reach (DEFAULT_TISSUE) is the slower one:
 * without flow it loses a fifth in the first hour where the basilar brainstem here loses
 * everything within half an hour, and its penumbra starts from 8 h, not 3 h. The basilar
 * calibration was kept as fitted (its time windows are pinned in posterior.test.ts), not because
 * the brainstem is known to tolerate ischaemia less than the cortex (Z1-5).
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
 * the general parameters (PERFORATOR_TISSUE where a perforator feeds them, else
 * DEFAULT_TISSUE). So does the cerebellum.
 *
 * TODO(medical-review): the time course of the cerebellum and of the parts of the medulla that
 * no perforator feeds is not calibrated on its own: it is the general course of tissue that
 * collaterals reach (DEFAULT_TISSUE, Y1-0), so at equal flow they now outlast the pons (a PICA
 * occlusion with poor collaterals has no core at 15 min, where the former single model had
 * about 28 mL, and reopened at 1 h it ends with about 6 mL instead of 34). No study here gives
 * the time to infarction of the cerebellum, or of the medulla, after an occlusion (Z1-5).
 */
export const BASILAR_BRAINSTEM_TISSUE: TissueParams = {
  ...FAST_CORE,
  penumbraTauMinH: 3,
  penumbraSurvivalMax: 0.4,
};

/**
 * Inner retina (central retinal artery, a branch of the ophthalmic artery).
 *
 * TODO(medical-review): how long the inner retina survives a complete central retinal artery
 * occlusion is uncertain. In old, atherosclerotic, hypertensive rhesus monkeys 97 min of clamping
 * left practically no detectable damage and about 240 min massive irreversible damage (Hayreh SS
 * et al. Central retinal artery occlusion. Retinal survival time. Exp Eye Res 2004;78:723–736);
 * a review argues that these experiments are flawed in important ways, that in people the inner
 * retina probably infarcts after about 12–15 min of complete occlusion, and that many occlusions
 * are incomplete, which would explain benefit after longer intervals (Tobalem S et al. Central
 * retinal artery occlusion – rethinking retinal survival time. BMC Ophthalmol 2018;18:101). The
 * model follows the shorter estimate and only lengthens the lag before loss begins from 6 to
 * 12 min, so that amaurosis fugax lasting minutes leaves no infarct (retinal ischaemia without
 * infarction is a TIA: Easton JD et al. Stroke 2009;40:2276–2293); after that the retina is lost
 * as fast as brain tissue without flow behind an end artery (FAST_CORE). Not calibrated to the 97-min primate figure. An incomplete occlusion
 * (severity < 1) leaves residual flow and lasts longer, as in the brain.
 */
export const RETINA_TISSUE: TissueParams = {
  ...FAST_CORE,
  lagH: 0.2,
};

/** arterial families of the basilar artery and its branches */
const BASILAR_FAMILIES = new Set<string>(['BA', 'SCA', 'AICA', 'PCA', 'THAL']);

const basilarOnly = (supply: Bed['supply']) =>
  supply.length > 0 && supply.every((s) => BASILAR_FAMILIES.has(VESSEL_BY_ID[s.v]?.family ?? ''));

/** beds whose parameters differ from the defaults */
const BED_TISSUE: Record<string, TissueParams> = Object.fromEntries([
  ...BEDS.filter((b) => REGION_BY_ID[b.region]?.category === 'brainstem' && basilarOnly(b.supply)).map((b) => [b.id, BASILAR_BRAINSTEM_TISSUE]),
  ...BEDS.filter((b) => REGION_BY_ID[b.region]?.category === 'eye').map((b) => [b.id, RETINA_TISSUE]),
]);

/**
 * The parameters of a bed that has its own (the basilar brainstem, the retina), else the default.
 * The simulation uses tissueParamsForUnit, which also tells perforator-fed units apart.
 */
export const tissueParamsForBed = (bedId: string): TissueParams => BED_TISSUE[bedId] ?? DEFAULT_TISSUE;

/**
 * The parameters of one perfusion unit (the part of a bed fed by one artery): its bed's own if it
 * has them, else, when an end-artery perforator feeds it, those of the deep white matter (Z1-7)
 * or of the other perforator territories, else the default (Y1-0).
 */
export const tissueParamsForUnit = (u: { bed: string; vessel: string }): TissueParams => {
  const own = BED_TISSUE[u.bed];
  if (own) return own;
  if (VESSEL_BY_ID[u.vessel]?.kind !== 'perforator') return DEFAULT_TISSUE;
  const region = REGION_BY_ID[BED_BY_ID[u.bed]?.region ?? ''];
  return region && DEEP_WHITE_MATTER.has(region.baseId) ? DEEP_WHITE_MATTER_TISSUE : PERFORATOR_TISSUE;
};
