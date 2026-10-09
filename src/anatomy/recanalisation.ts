import {type AdditionalLang, contentFragment, localizedContent, withLocalized } from '../i18n/content';
/**
 * Published figures about recanalisation treatment, shown next to the treatment options so that
 * a chosen result can be read against how often it happens. They inform; they never decide the
 * simulated outcome (the model is deterministic and the user picks the result).
 *
 * Every number carries its source. Proportions are 0–1.
 *
 * `low`/`high` span the values reported by the cited studies (not confidence intervals), so a
 * range mixes populations, eras and definitions; each `note` says which value comes from where.
 * Where a paper gives n/N, the bound is n/N (it may differ from the paper's rounded percentage,
 * e.g. SWIFT DIRECT's "5 (2%) of 201" is entered as 0.025). Combinations with no source found
 * (for example any vertebral-artery figure, or the reperfusion rate of bridging therapy for M2/distal occlusions) are
 * left out on purpose.
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
  /** symptomatic intracranial haemorrhage (large-vessel trials) */
  sich: Partial<Record<TreatmentMethod, EvidenceRange>>;
  /**
   * symptomatic intracranial haemorrhage in the medium/distal-vessel trials, shown instead of
   * `sich` for the 'm2' and 'distal' site groups
   */
  sichMevo: Partial<Record<TreatmentMethod, EvidenceRange>>;
  /** symptomatic haemorrhage with thrombectomy for a large ischaemic core (anterior LVO trials) */
  sichLargeCore: EvidenceRange | null;
  /** IV thrombolysis with tenecteplase instead of alteplase */
  tenecteplase: {
    /** symptomatic haemorrhage */
    sich: EvidenceRange | null;
    /** reperfusion at the first angiogram before thrombectomy (large-vessel occlusion) */
    reperfusionBeforeEvt: EvidenceRange | null;
  };
  /** IV thrombolysis started beyond `ivtWindowH` after imaging selection: outcome trials */
  lateIvt: EvidenceRange | null;
  /** early reocclusion after successful recanalisation */
  reocclusion: Partial<Record<TreatmentMethod, EvidenceRange>>;
  /** emboli to distal branches of the treated artery during thrombectomy */
  distalEmbolization: EvidenceRange | null;
  /** emboli or infarcts in a new (previously unaffected) territory after thrombectomy */
  newTerritoryEmbolization: EvidenceRange | null;
  /** incomplete microvascular reperfusion despite a reopened artery ("no-reflow") */
  noReflow: EvidenceRange | null;
  /** usual time limit for starting IV thrombolysis after onset (h) */
  ivtWindowH: number;
  /**
   * sites where a guideline suggests IV thrombolysis beyond `ivtWindowH` by expert consensus
   * only (h after onset); outside `ivtWindowH` the warning stays, worded as consensus
   */
  ivtConsensusWindowH: Partial<Record<SiteGroup, number>>;
  /** usual time limit for thrombectomy after onset with favourable imaging (h) */
  evtWindowH: number;
}

/**
 * Vessel base id → site group. The groups follow how the cited studies report occlusion sites:
 * intracranial ICA; M1; M2 (the two MCA divisions); "distal" = MCA cortical branches (M3 and
 * beyond) and ACA/PCA (the medium/distal-vessel trials and INTERRSeCT's "M3, ACA and PCA" group);
 * basilar; intracranial vertebral (V4).
 *
 * Mapped to 'other' on purpose: the cervical ICA, CCA and extracranial vertebral artery (the
 * figures here are for intracranial occlusions), cerebellar arteries (PICA/AICA/SCA), the
 * ophthalmic artery, perforators, communicating arteries, collaterals and extracranial branches.
 */
const SITE_GROUP_BY_BASE: Record<string, Exclude<SiteGroup, 'other'>> = {
  ica_petrous_cavernous: 'ica',
  ica_ophthalmic_seg: 'ica',
  ica_terminal: 'ica',

  mca_m1: 'm1',

  mca_m2_sup: 'm2',
  mca_m2_inf: 'm2',

  mca_temporal_anterior: 'distal',
  mca_orbitofrontal: 'distal',
  mca_prefrontal: 'distal',
  mca_precentral: 'distal',
  mca_central: 'distal',
  mca_ant_parietal: 'distal',
  mca_post_parietal: 'distal',
  mca_angular: 'distal',
  mca_temporooccipital: 'distal',
  mca_temporal_posterior: 'distal',
  mca_temporal_middle: 'distal',
  aca_a1: 'distal',
  aca_a2: 'distal',
  aca_frontopolar: 'distal',
  aca_callosomarginal: 'distal',
  aca_pericallosal: 'distal',
  aca_paracentral: 'distal',
  pca_p1: 'distal',
  pca_p2: 'distal',
  pca_temporal: 'distal',
  pca_calcarine: 'distal',
  pca_parietooccipital: 'distal',
  pca_splenial: 'distal',

  basilar_lower: 'basilar',
  basilar_mid: 'basilar',
  basilar_upper: 'basilar',
  basilar_tip: 'basilar',

  va_v4_prox: 'vertebral',
  va_v4_dist: 'vertebral',
};

/** which site group an occluded artery (base id) belongs to */
export function siteGroupOf(vesselBaseId: string): SiteGroup {
  return Object.prototype.hasOwnProperty.call(SITE_GROUP_BY_BASE, vesselBaseId)
    ? SITE_GROUP_BY_BASE[vesselBaseId]
    : 'other';
}

// ─── shared entries ───────────────────────────────────────────────────────────────────────

/**
 * What the two 2025 medium/distal-vessel thrombectomy trials found besides reperfusion: no better
 * outcome, more symptomatic haemorrhage, and higher mortality in ESCAPE-MeVO only (DISTAL's was
 * similar). Goyal M et al. N Engl J Med 2025;392:1385–1395 (ESCAPE-MeVO); Psychogios M et al.
 * N Engl J Med 2025;392:1374–1384 (DISTAL).
 */
const MEVO_OUTCOME: L = withLocalized({
  zh:
    '兩項 2025 年試驗都沒有改善 90 天預後：ESCAPE-MeVO mRS 0–1 為 41.6% vs 43.1%，取栓組死亡率反而較高（13.3% vs 8.4%），症狀性出血 5.4% vs 2.2%；' +
    'DISTAL（排除優勢側 M2）mRS 分布沒有差別（common OR 0.90），死亡率相近（15.5% vs 14.0%），症狀性出血 5.9% vs 2.6%。',
  en:
    'Neither 2025 trial improved 90-day outcome: ESCAPE-MeVO mRS 0–1 41.6% vs 43.1%, with higher mortality after thrombectomy (13.3% vs 8.4%) and symptomatic haemorrhage 5.4% vs 2.2%; ' +
    'DISTAL (dominant M2 excluded) showed no shift in mRS (common OR 0.90), similar mortality (15.5% vs 14.0%) and symptomatic haemorrhage 5.9% vs 2.6%.', localized: (contentLang: AdditionalLang) => (contentFragment('Neither 2025 trial improved 90-day outcome: ESCAPE-MeVO mRS 0–1 41.6% vs 43.1%, with higher mortality after thrombectomy (13.3% vs 8.4%) and symptomatic haemorrhage 5.4% vs 2.2%; ', contentLang) + contentFragment('DISTAL (dominant M2 excluded) showed no shift in mRS (common OR 0.90), similar mortality (15.5% vs 14.0%) and symptomatic haemorrhage 5.9% vs 2.6%.', contentLang)),
});

/** symptomatic haemorrhage in the medium/distal-vessel trials (both arms partly had IV thrombolysis) */
const SICH_MEVO: EvidenceRange = {
  low: 0.054,
  high: 0.059,
  note: withLocalized({
    zh:
      '中型／遠端血管阻塞取栓後的症狀性顱內出血（取栓組 vs 內科治療組）：ESCAPE-MeVO 5.4% vs 2.2%（14/257 vs 6/272）；DISTAL 5.9% vs 2.6%。' +
      '兩試驗的取栓組都有不少人也打了靜脈血栓溶解（ESCAPE-MeVO 56.5%；DISTAL 全體 65.4%）。大血管阻塞試驗的出血數字不適用於這些部位。',
    en:
      'Symptomatic intracranial haemorrhage after thrombectomy for medium/distal vessel occlusion (thrombectomy vs medical care): ESCAPE-MeVO 5.4% vs 2.2% (14/257 vs 6/272); DISTAL 5.9% vs 2.6%. ' +
      'Many in both thrombectomy arms also had IV thrombolysis (ESCAPE-MeVO 56.5%; DISTAL 65.4% overall). The large-vessel trial figures do not apply to these sites.', localized: (contentLang: AdditionalLang) => (contentFragment('Symptomatic intracranial haemorrhage after thrombectomy for medium/distal vessel occlusion (thrombectomy vs medical care): ESCAPE-MeVO 5.4% vs 2.2% (14/257 vs 6/272); DISTAL 5.9% vs 2.6%. ', contentLang) + contentFragment('Many in both thrombectomy arms also had IV thrombolysis (ESCAPE-MeVO 56.5%; DISTAL 65.4% overall). The large-vessel trial figures do not apply to these sites.', contentLang)),
  }),
  source: 'Goyal M et al. N Engl J Med 2025;392:1385–1395 (ESCAPE-MeVO); Psychogios M et al. N Engl J Med 2025;392:1374–1384 (DISTAL)',
};

/** thrombectomy for anterior-circulation large-vessel occlusion (ICA/M1), not reported by site */
const EVT_ANTERIOR_LVO: EvidenceRange = {
  low: 0.71,
  high: 0.91,
  note: withLocalized({
    zh:
      '取栓後成功再灌流（最後一次血管攝影 TICI ≥ 2b）的比例，來自前循環大血管阻塞（多為 ICA 與 M1）的隨機試驗，各試驗自行判讀，未依阻塞部位分開報告。' +
      'HERMES（五項 2010–2014 年試驗匯總，mTICI 2b–3）：570 位導管時仍有可及阻塞者中 402 位（71%）；該取栓組 83% 也先打了靜脈 alteplase。' +
      '直接取栓（未先打血栓溶解劑）組：DIRECT-MT 79.4%、SWIFT DIRECT 91%（182/201）。',
    en:
      'Successful reperfusion (TICI ≥ 2b on the final angiogram) after thrombectomy in randomised trials of anterior-circulation large-vessel occlusion (mostly ICA and M1), graded by each trial; not reported separately by site. ' +
      'HERMES (5 trials, 2010–2014, mTICI 2b–3): 402 of 570 (71%) with a persisting, accessible occlusion at catheterisation; 83% of that thrombectomy arm had also received IV alteplase. ' +
      'Thrombectomy without prior thrombolysis: DIRECT-MT 79.4%, SWIFT DIRECT 91% (182/201).', localized: (contentLang: AdditionalLang) => ((contentFragment('Successful reperfusion (TICI ≥ 2b on the final angiogram) after thrombectomy in randomised trials of anterior-circulation large-vessel occlusion (mostly ICA and M1), graded by each trial; not reported separately by site. ', contentLang) + contentFragment('HERMES (5 trials, 2010–2014, mTICI 2b–3): 402 of 570 (71%) with a persisting, accessible occlusion at catheterisation; 83% of that thrombectomy arm had also received IV alteplase. ', contentLang)) + contentFragment('Thrombectomy without prior thrombolysis: DIRECT-MT 79.4%, SWIFT DIRECT 91% (182/201).', contentLang)),
  }),
  source:
    'Goyal M et al. Lancet 2016;387:1723–1731 (HERMES); Yang P et al. N Engl J Med 2020;382:1981–1993 (DIRECT-MT); Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT)',
};

/** IV thrombolysis followed by thrombectomy, from the trials that randomised against direct EVT */
const BRIDGING_ANTERIOR_LVO: EvidenceRange = {
  low: 0.845,
  high: 0.96,
  note: withLocalized({
    zh:
      '先靜脈 alteplase 再取栓（橋接治療）的整體成功再灌流比例，來自比較「直接取栓」與「橋接」的前循環大血管阻塞（多為 ICA 與 M1）隨機試驗，未依部位分開：' +
      'DIRECT-MT 84.5%（直接取栓 79.4%）、SWIFT DIRECT 96%（199/207；直接取栓 91%）。',
    en:
      'Overall successful reperfusion with IV alteplase followed by thrombectomy (bridging), from randomised trials of direct versus bridging thrombectomy in anterior-circulation large-vessel occlusion (mostly ICA and M1), not reported by site: ' +
      'DIRECT-MT 84.5% (direct thrombectomy 79.4%); SWIFT DIRECT 96% (199/207; direct 91%).', localized: (contentLang: AdditionalLang) => (contentFragment('Overall successful reperfusion with IV alteplase followed by thrombectomy (bridging), from randomised trials of direct versus bridging thrombectomy in anterior-circulation large-vessel occlusion (mostly ICA and M1), not reported by site: ', contentLang) + contentFragment('DIRECT-MT 84.5% (direct thrombectomy 79.4%); SWIFT DIRECT 96% (199/207; direct 91%).', contentLang)),
  }),
  source: 'Yang P et al. N Engl J Med 2020;382:1981–1993 (DIRECT-MT); Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT)',
};

export const RECANALISATION_EVIDENCE: RecanalisationEvidence = {
  success: {
    ica: {
      ivt: {
        low: 0.042,
        high: 0.13,
        note: withLocalized({
          zh:
            '僅靜脈血栓溶解（alteplase）後，阻塞的顱內頸動脈再通的比例（以經顱都卜勒、CTA 或取栓前第一張血管攝影判定，數小時內）。' +
            'Calgary 世代：遠端 ICA 1/24；INTERRSeCT：10/92（10.9%，rAOL 2b–3）；統合分析：部分或完全早期再通 13%（95% CI 6–22%），完全再通僅 4%。',
          en:
            'Recanalisation of an occluded intracranial ICA after IV thrombolysis (alteplase) alone, assessed within hours by transcranial Doppler, CTA or the first run of a thrombectomy angiogram. ' +
            'Calgary cohort: distal ICA 1 of 24; INTERRSeCT: 10/92 (10.9%, rAOL 2b–3); meta-analysis: partial or complete early recanalisation 13% (95% CI 6–22%), complete only 4%.', localized: (contentLang: AdditionalLang) => (contentFragment('Recanalisation of an occluded intracranial ICA after IV thrombolysis (alteplase) alone, assessed within hours by transcranial Doppler, CTA or the first run of a thrombectomy angiogram. ', contentLang) + contentFragment('Calgary cohort: distal ICA 1 of 24; INTERRSeCT: 10/92 (10.9%, rAOL 2b–3); meta-analysis: partial or complete early recanalisation 13% (95% CI 6–22%), complete only 4%.', contentLang)),
        }),
        source:
          'Bhatia R et al. Stroke 2010;41:2254–2258; Menon BK et al. JAMA 2018;320:1017–1026 (INTERRSeCT); Seners P et al. Stroke 2016;47:2409–2412',
      },
      evt: EVT_ANTERIOR_LVO,
      bridging: BRIDGING_ANTERIOR_LVO,
    },
    m1: {
      ivt: {
        low: 0.216,
        high: 0.464,
        note: withLocalized({
          zh:
            '僅靜脈血栓溶解後 M1 再通的比例（數小時內以 TCD／CTA／血管攝影判定）。INTERRSeCT：近端 M1 21.6%（24/111）、遠端 M1 46.4%（39/84）；' +
            'Calgary 世代 M1 32.3%（21/65）；統合分析「近端 MCA」部分或完全早期再通 35%（完全 21%）。' +
            '血栓長度：一項 138 位 MCA 中風的研究中，所有再通者的血栓都不超過 8 mm（非顯影 CT 量測）。',
          en:
            'Recanalisation of an M1 occlusion after IV thrombolysis alone (TCD/CTA/angiography within hours). INTERRSeCT: proximal M1 21.6% (24/111), distal M1 46.4% (39/84); ' +
            'Calgary cohort M1 32.3% (21/65); meta-analysis, "proximal MCA": partial or complete early recanalisation 35% (complete 21%). ' +
            'Clot length: in 138 MCA strokes, no thrombus longer than 8 mm (non-contrast CT) recanalised.', localized: (contentLang: AdditionalLang) => ((contentFragment('Recanalisation of an M1 occlusion after IV thrombolysis alone (TCD/CTA/angiography within hours). INTERRSeCT: proximal M1 21.6% (24/111), distal M1 46.4% (39/84); ', contentLang) + contentFragment('Calgary cohort M1 32.3% (21/65); meta-analysis, "proximal MCA": partial or complete early recanalisation 35% (complete 21%). ', contentLang)) + contentFragment('Clot length: in 138 MCA strokes, no thrombus longer than 8 mm (non-contrast CT) recanalised.', contentLang)),
        }),
        source:
          'Menon BK et al. JAMA 2018;320:1017–1026 (INTERRSeCT); Bhatia R et al. Stroke 2010;41:2254–2258; Seners P et al. Stroke 2016;47:2409–2412; Riedel CH et al. Stroke 2011;42:1775–1777',
      },
      evt: EVT_ANTERIOR_LVO,
      bridging: BRIDGING_ANTERIOR_LVO,
    },
    m2: {
      ivt: {
        low: 0.308,
        high: 0.52,
        note: withLocalized({
          zh:
            '僅靜脈血栓溶解後 M2 再通的比例。Calgary 世代 M2 30.8%（4/13）；INTERRSeCT M2 37.1%（53/143，rAOL 2b–3）；' +
            '統合分析中作者歸為「遠端 MCA」者部分或完全早期再通 52%（95% CI 39–64%，完全 38%）。',
          en:
            'Recanalisation of an M2 occlusion after IV thrombolysis alone. Calgary cohort M2 30.8% (4/13); INTERRSeCT M2 37.1% (53/143, rAOL 2b–3); ' +
            'meta-analysis, occlusions the authors grouped as "distal MCA": partial or complete early recanalisation 52% (95% CI 39–64%; complete 38%).', localized: (contentLang: AdditionalLang) => (contentFragment('Recanalisation of an M2 occlusion after IV thrombolysis alone. Calgary cohort M2 30.8% (4/13); INTERRSeCT M2 37.1% (53/143, rAOL 2b–3); ', contentLang) + contentFragment('meta-analysis, occlusions the authors grouped as "distal MCA": partial or complete early recanalisation 52% (95% CI 39–64%; complete 38%).', contentLang)),
        }),
        source:
          'Bhatia R et al. Stroke 2010;41:2254–2258; Menon BK et al. JAMA 2018;320:1017–1026 (INTERRSeCT); Seners P et al. Stroke 2016;47:2409–2412',
      },
      evt: {
        low: 0.592,
        high: 0.751,
        note: withLocalized({
          zh:
            '取栓後成功再灌流的比例。HERMES 中 130 位 M2 阻塞者，取栓組 mTICI 2b–3 為 59.2%；' +
            'ESCAPE-MeVO（中型血管阻塞：約一半為 M2，其餘 M3、ACA、PCA）MeVO-eTICI 2b–3 為 75.1%（190/253），該組 56.5% 也接受靜脈血栓溶解。' +
            MEVO_OUTCOME.zh,
          en:
            'Successful reperfusion after thrombectomy. HERMES, 130 patients with M2 occlusion: mTICI 2b–3 in 59.2% of the thrombectomy arm; ' +
            'ESCAPE-MeVO (medium-vessel occlusions: about half M2, the rest M3, ACA, PCA): MeVO-eTICI 2b–3 in 75.1% (190/253); 56.5% of that arm also received IV thrombolysis. ' +
            MEVO_OUTCOME.en, localized: (contentLang: AdditionalLang) => ((contentFragment('Successful reperfusion after thrombectomy. HERMES, 130 patients with M2 occlusion: mTICI 2b–3 in 59.2% of the thrombectomy arm; ', contentLang) + contentFragment('ESCAPE-MeVO (medium-vessel occlusions: about half M2, the rest M3, ACA, PCA): MeVO-eTICI 2b–3 in 75.1% (190/253); 56.5% of that arm also received IV thrombolysis. ', contentLang)) + localizedContent(MEVO_OUTCOME, contentLang)),
        }),
        source:
          'Menon BK et al. J Neurointerv Surg 2019;11:1065–1069 (HERMES M2); Goyal M et al. N Engl J Med 2025;392:1385–1395 (ESCAPE-MeVO); Psychogios M et al. N Engl J Med 2025;392:1374–1384 (DISTAL)',
      },
    },
    distal: {
      ivt: {
        low: 0.425,
        high: 0.425,
        typical: 0.425,
        note: {
          zh: '僅靜脈血栓溶解後遠端阻塞（M3、ACA、PCA 合併報告）再通的比例：INTERRSeCT 17/40（42.5%，rAOL 2b–3），單一研究、人數少。',
          en: 'Recanalisation of distal occlusions (M3, ACA and PCA reported together) after IV thrombolysis alone: INTERRSeCT 17/40 (42.5%, rAOL 2b–3); a single, small group.',
        },
        source: 'Menon BK et al. JAMA 2018;320:1017–1026 (INTERRSeCT)',
      },
      evt: {
        low: 0.751,
        high: 0.751,
        typical: 0.751,
        note: withLocalized({
          zh:
            'ESCAPE-MeVO 取栓組最終 MeVO-eTICI 2b–3 為 75.1%（190/253）；阻塞部位約一半為 M2、36% 為 M3、其餘為 ACA／PCA；56.5% 也接受靜脈血栓溶解。' +
            MEVO_OUTCOME.zh,
          en:
            'ESCAPE-MeVO thrombectomy arm: final MeVO-eTICI 2b–3 in 75.1% (190/253); occlusions about half M2, 36% M3, the rest ACA/PCA; 56.5% also received IV thrombolysis. ' +
            MEVO_OUTCOME.en, localized: (contentLang: AdditionalLang) => (contentFragment('ESCAPE-MeVO thrombectomy arm: final MeVO-eTICI 2b–3 in 75.1% (190/253); occlusions about half M2, 36% M3, the rest ACA/PCA; 56.5% also received IV thrombolysis. ', contentLang) + localizedContent(MEVO_OUTCOME, contentLang)),
        }),
        source:
          'Goyal M et al. N Engl J Med 2025;392:1385–1395 (ESCAPE-MeVO); Psychogios M et al. N Engl J Med 2025;392:1374–1384 (DISTAL)',
      },
    },
    basilar: {
      ivt: {
        low: 0.04,
        high: 0.13,
        note: withLocalized({
          zh:
            '僅靜脈血栓溶解後基底動脈「早期」再通的比例（開始用藥後約 3 小時內，或取栓前第一張血管攝影）：Calgary 世代 1/25（4%）；統合分析部分或完全早期再通 13%（95% CI 0–35%，完全 4%）。資料很少。' +
            '較晚判定的數字高得多：一項基底動脈阻塞病例系列的系統性分析中，靜脈血栓溶解後再通 53%（40/76），動脈內溶栓 65%；判定時間不一、多半較晚，不能與早期數字直接比較；兩種治療的死亡或依賴相近（78% vs 76%）。',
          en:
            'Early recanalisation of the basilar artery after IV thrombolysis alone (within about 3 h of starting the drug, or on the first angiogram before thrombectomy): Calgary cohort 1 of 25 (4%); meta-analysis, partial or complete early recanalisation 13% (95% CI 0–35%; complete 4%). Few data. ' +
            'Later assessments give much higher figures: a systematic analysis of basilar-occlusion case series found recanalisation in 53% (40/76) after IV thrombolysis (65% after intra-arterial thrombolysis), assessed at variable, mostly later times, so not comparable with the early figure; death or dependency was similar with the two treatments (78% vs 76%).', localized: (contentLang: AdditionalLang) => (contentFragment('Early recanalisation of the basilar artery after IV thrombolysis alone (within about 3 h of starting the drug, or on the first angiogram before thrombectomy): Calgary cohort 1 of 25 (4%); meta-analysis, partial or complete early recanalisation 13% (95% CI 0–35%; complete 4%). Few data. ', contentLang) + contentFragment('Later assessments give much higher figures: a systematic analysis of basilar-occlusion case series found recanalisation in 53% (40/76) after IV thrombolysis (65% after intra-arterial thrombolysis), assessed at variable, mostly later times, so not comparable with the early figure; death or dependency was similar with the two treatments (78% vs 76%).', contentLang)),
        }),
        source: 'Bhatia R et al. Stroke 2010;41:2254–2258; Seners P et al. Stroke 2016;47:2409–2412; Lindsberg PJ, Mattle HP. Stroke 2006;37:922–928',
      },
      evt: {
        low: 0.73,
        high: 0.93,
        note: withLocalized({
          zh:
            '基底動脈阻塞取栓後成功再灌流（mTICI ≥ 2b）。ATTENTION 試驗 93.0%（該組 31% 也接受靜脈血栓溶解）；同一試驗的事後分析自行計數為 92.0%（208/226）。' +
            '再灌流不等於預後良好：病前沒有失能、且成功再灌流的病人中，48.1% 在 90 天仍未達 mRS 0–3（「無效再通」；整個取栓組達 mRS 0–3 的是 46%）。' +
            'VERITAS 四項隨機試驗（ATTENTION、BEST、BAOCHE、BASICS）匯總中直接取栓者 73%（約 250 位有血管攝影資料者中的 182 位；556 位中 183 位缺這項資料）；' +
            'ESO 指引統合觀察性研究中直接取栓 80.1%（604/754）。',
          en:
            'Successful reperfusion (mTICI ≥ 2b) after thrombectomy for basilar-artery occlusion. ATTENTION trial 93.0% (31% of that arm also had IV thrombolysis); a post hoc analysis of the same trial counted 92.0% (208/226). ' +
            'Reperfusion is not the same as a good outcome: of the reperfused patients with no disability before the stroke, 48.1% still did not reach mRS 0–3 at 90 days ("futile recanalisation"; in the whole thrombectomy arm 46% reached mRS 0–3). ' +
            'VERITAS pooled 4 RCTs (ATTENTION, BEST, BAOCHE, BASICS): 73% (182 of about 250 with angiographic data; data missing for 183 of the 556) with thrombectomy alone; ' +
            'ESO guideline pooling of observational studies: direct thrombectomy 80.1% (604/754).', localized: (contentLang: AdditionalLang) => (((contentFragment('Successful reperfusion (mTICI ≥ 2b) after thrombectomy for basilar-artery occlusion. ATTENTION trial 93.0% (31% of that arm also had IV thrombolysis); a post hoc analysis of the same trial counted 92.0% (208/226). ', contentLang) + contentFragment('Reperfusion is not the same as a good outcome: of the reperfused patients with no disability before the stroke, 48.1% still did not reach mRS 0–3 at 90 days ("futile recanalisation"; in the whole thrombectomy arm 46% reached mRS 0–3). ', contentLang)) + contentFragment('VERITAS pooled 4 RCTs (ATTENTION, BEST, BAOCHE, BASICS): 73% (182 of about 250 with angiographic data; data missing for 183 of the 556) with thrombectomy alone; ', contentLang)) + contentFragment('ESO guideline pooling of observational studies: direct thrombectomy 80.1% (604/754).', contentLang)),
        }),
        source:
          'Tao C et al. N Engl J Med 2022;387:1361–1372 (ATTENTION: 31% IV thrombolysis and 46% mRS 0–3 from its abstract; 93.0% as restated in the introduction of Yi et al.); Yi T et al. Front Neurol 2023;14:1308036 (post hoc ATTENTION analysis: 92.0% reperfused, 48.1% futile recanalisation); Knapen RRMM et al. Cardiovasc Intervent Radiol 2025;48:1869–1877 (VERITAS); Strbian D et al. Eur Stroke J 2024;9:835–884 (ESO/ESMINT)',
      },
      bridging: {
        low: 0.67,
        high: 0.83,
        note: withLocalized({
          zh:
            '基底動脈阻塞先靜脈血栓溶解再取栓的成功再灌流（mTICI ≥ 2b）：VERITAS 四項隨機試驗匯總 67%（約 122 位有資料者中的 82 位），與直接取栓無顯著差異；' +
            'ESO 指引統合觀察性研究 83.0%（308/371）。',
          en:
            'Successful reperfusion (mTICI ≥ 2b) with IV thrombolysis before thrombectomy for basilar-artery occlusion: VERITAS pooled 4 RCTs 67% (82 of about 122 with angiographic data), not significantly different from direct thrombectomy; ' +
            'ESO guideline pooling of observational studies 83.0% (308/371).', localized: (contentLang: AdditionalLang) => (contentFragment('Successful reperfusion (mTICI ≥ 2b) with IV thrombolysis before thrombectomy for basilar-artery occlusion: VERITAS pooled 4 RCTs 67% (82 of about 122 with angiographic data), not significantly different from direct thrombectomy; ', contentLang) + contentFragment('ESO guideline pooling of observational studies 83.0% (308/371).', contentLang)),
        }),
        source:
          'Knapen RRMM et al. Cardiovasc Intervent Radiol 2025;48:1869–1877 (VERITAS); Strbian D et al. Eur Stroke J 2024;9:835–884 (ESO/ESMINT)',
      },
    },
  },

  sich: {
    ivt: {
      low: 0.017,
      high: 0.073,
      note: withLocalized({
        zh:
          '靜脈 alteplase 後症狀性顱內出血，數值高度取決於定義。NINDS（發病 3 小時內治療，36 小時內）6.4%（安慰劑 0.6%）；' +
          'ECASS III（3–4.5 小時，試驗自身定義）2.4%（安慰劑 0.2%）；SITS-MOST 登錄（3 小時內）：SITS-MOST 定義（24 小時內 PH2 且 NIHSS 惡化 ≥ 4）1.7%，Cochrane 定義（7 天內）7.3%。',
        en:
          'Symptomatic intracranial haemorrhage after IV alteplase; the figure depends heavily on the definition. NINDS (treated within 3 h of onset; within 36 h) 6.4% (placebo 0.6%); ' +
          'ECASS III (3–4.5 h, trial definition) 2.4% (placebo 0.2%); SITS-MOST registry (within 3 h): SITS-MOST definition (PH2 with NIHSS worsening ≥ 4 at 24 h) 1.7%, Cochrane definition (7 days) 7.3%.', localized: (contentLang: AdditionalLang) => (contentFragment('Symptomatic intracranial haemorrhage after IV alteplase; the figure depends heavily on the definition. NINDS (treated within 3 h of onset; within 36 h) 6.4% (placebo 0.6%); ', contentLang) + contentFragment('ECASS III (3–4.5 h, trial definition) 2.4% (placebo 0.2%); SITS-MOST registry (within 3 h): SITS-MOST definition (PH2 with NIHSS worsening ≥ 4 at 24 h) 1.7%, Cochrane definition (7 days) 7.3%.', contentLang)),
      }),
      source:
        'NINDS rt-PA Stroke Study Group. N Engl J Med 1995;333:1581–1587; Hacke W et al. N Engl J Med 2008;359:1317–1329 (ECASS III); Wahlgren N et al. Lancet 2007;369:275–282 (SITS-MOST)',
    },
    evt: {
      low: 0.025,
      high: 0.059,
      typical: 0.044,
      note: withLocalized({
        zh:
          'HERMES 取栓組 4.4%（28/634），對照組 4.3%（28/653），各試驗自身定義；取栓組 83% 也打了 alteplase。' +
          '直接取栓組：SWIFT DIRECT 2.5%（5/201）、MR CLEAN-NO IV 5.9%。基底動脈試驗：ATTENTION 5%（12/226）、BAOCHE 6%（6/102）；' +
          'VERITAS 四項基底動脈試驗匯總中直接取栓 4.9%、先打靜脈血栓溶解再取栓 6.3%（調整後 OR 1.87，95% CI 0.77–4.57，無顯著差異）。',
        en:
          'HERMES thrombectomy arm 4.4% (28/634) vs control 4.3% (28/653), each trial\'s own definition; 83% of the thrombectomy arm also received alteplase. ' +
          'Thrombectomy without prior thrombolysis: SWIFT DIRECT 2.5% (5/201), MR CLEAN-NO IV 5.9%. Basilar trials: ATTENTION 5% (12/226), BAOCHE 6% (6/102); ' +
          'VERITAS pooled 4 basilar trials: direct thrombectomy 4.9% vs IV thrombolysis first 6.3% (adjusted OR 1.87, 95% CI 0.77–4.57, not significant).', localized: (contentLang: AdditionalLang) => ((contentFragment('HERMES thrombectomy arm 4.4% (28/634) vs control 4.3% (28/653), each trial\'s own definition; 83% of the thrombectomy arm also received alteplase. ', contentLang) + contentFragment('Thrombectomy without prior thrombolysis: SWIFT DIRECT 2.5% (5/201), MR CLEAN-NO IV 5.9%. Basilar trials: ATTENTION 5% (12/226), BAOCHE 6% (6/102); ', contentLang)) + contentFragment('VERITAS pooled 4 basilar trials: direct thrombectomy 4.9% vs IV thrombolysis first 6.3% (adjusted OR 1.87, 95% CI 0.77–4.57, not significant).', contentLang)),
      }),
      source:
        'Goyal M et al. Lancet 2016;387:1723–1731 (HERMES); Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT); LeCouffe NE et al. N Engl J Med 2021;385:1833–1844 (MR CLEAN-NO IV); Tao C et al. N Engl J Med 2022;387:1361–1372 (ATTENTION); Jovin TG et al. N Engl J Med 2022;387:1373–1384 (BAOCHE); Knapen RRMM et al. Cardiovasc Intervent Radiol 2025;48:1869–1877 (VERITAS)',
    },
    bridging: {
      low: 0.035,
      high: 0.063,
      note: withLocalized({
        zh:
          '先靜脈 alteplase 再取栓的症狀性顱內出血（各試驗自身定義）：SWIFT DIRECT 3.5%（7/202）、MR CLEAN-NO IV 5.3%；兩試驗中與直接取栓無顯著差異。' +
          '基底動脈：VERITAS 四項試驗匯總，直接取栓 4.9% vs 先打靜脈血栓溶解 6.3%（調整後 OR 1.87，95% CI 0.77–4.57，無顯著差異）。',
        en:
          'Symptomatic intracranial haemorrhage with IV alteplase before thrombectomy (each trial\'s definition): SWIFT DIRECT 3.5% (7/202), MR CLEAN-NO IV 5.3%; not significantly different from direct thrombectomy in either trial. ' +
          'Basilar artery: VERITAS pooled 4 trials, direct thrombectomy 4.9% vs IV thrombolysis first 6.3% (adjusted OR 1.87, 95% CI 0.77–4.57, not significant).', localized: (contentLang: AdditionalLang) => (contentFragment('Symptomatic intracranial haemorrhage with IV alteplase before thrombectomy (each trial\'s definition): SWIFT DIRECT 3.5% (7/202), MR CLEAN-NO IV 5.3%; not significantly different from direct thrombectomy in either trial. ', contentLang) + contentFragment('Basilar artery: VERITAS pooled 4 trials, direct thrombectomy 4.9% vs IV thrombolysis first 6.3% (adjusted OR 1.87, 95% CI 0.77–4.57, not significant).', contentLang)),
      }),
      source:
        'Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT); LeCouffe NE et al. N Engl J Med 2021;385:1833–1844 (MR CLEAN-NO IV); Knapen RRMM et al. Cardiovasc Intervent Radiol 2025;48:1869–1877 (VERITAS)',
    },
  },

  sichMevo: { evt: SICH_MEVO, bridging: SICH_MEVO },

  sichLargeCore: {
    low: 0.0056,
    high: 0.096,
    note: withLocalized({
      zh:
        '大核心（ASPECTS 3–5，或核心 ≥ 50 mL；LASTE 為 ASPECTS ≤ 5 不限大小）的前循環大血管阻塞取栓後症狀性出血（取栓 vs 內科）：' +
        'ANGEL-ASPECT 6.1% vs 2.7%（任何顱內出血 49.1% vs 17.3%）；LASTE 9.6% vs 5.7%（調整後差異不顯著）；TENSION 6% vs 5%；SELECT2 只有 1 位 vs 2 位；' +
        'RESCUE-Japan LIMIT 任何顱內出血 58.0% vs 31.4%。這五項試驗中取栓仍改善功能，TENSION 與 LASTE 也降低死亡率（SELECT2 死亡率相近）。',
      en:
        'Symptomatic haemorrhage after thrombectomy for anterior large-vessel occlusion with a large core (ASPECTS 3–5 or core ≥ 50 mL; LASTE: ASPECTS ≤ 5 of any size), thrombectomy vs medical care: ' +
        'ANGEL-ASPECT 6.1% vs 2.7% (any intracranial haemorrhage 49.1% vs 17.3%); LASTE 9.6% vs 5.7% (adjusted difference not significant); TENSION 6% vs 5%; SELECT2 1 patient vs 2; ' +
        'RESCUE-Japan LIMIT any intracranial haemorrhage 58.0% vs 31.4%. In all five trials thrombectomy still improved function, and TENSION and LASTE also showed lower mortality (similar in SELECT2).', localized: (contentLang: AdditionalLang) => ((contentFragment('Symptomatic haemorrhage after thrombectomy for anterior large-vessel occlusion with a large core (ASPECTS 3–5 or core ≥ 50 mL; LASTE: ASPECTS ≤ 5 of any size), thrombectomy vs medical care: ', contentLang) + contentFragment('ANGEL-ASPECT 6.1% vs 2.7% (any intracranial haemorrhage 49.1% vs 17.3%); LASTE 9.6% vs 5.7% (adjusted difference not significant); TENSION 6% vs 5%; SELECT2 1 patient vs 2; ', contentLang)) + contentFragment('RESCUE-Japan LIMIT any intracranial haemorrhage 58.0% vs 31.4%. In all five trials thrombectomy still improved function, and TENSION and LASTE also showed lower mortality (similar in SELECT2).', contentLang)),
    }),
    source:
      'Sarraj A et al. N Engl J Med 2023;388:1259–1271 (SELECT2); Huo X et al. N Engl J Med 2023;388:1272–1283 (ANGEL-ASPECT); Yoshimura S et al. N Engl J Med 2022;386:1303–1313 (RESCUE-Japan LIMIT); Bendszus M et al. Lancet 2023;402:1753–1763 (TENSION); Costalat V et al. N Engl J Med 2024;390:1677–1689 (LASTE)',
  },

  tenecteplase: {
    sich: {
      low: 0.034,
      high: 0.034,
      note: withLocalized({
        zh:
          'Tenecteplase（0.25 mg/kg，單次推注）取代 alteplase：AcT 試驗（發病 4.5 小時內）24 小時內症狀性腦出血 3.4%（27/800），alteplase 3.2%；功能結果不劣於 alteplase。' +
          'ESO 2023 建議把它當作 alteplase 的替代，大血管阻塞時優先使用。模擬中兩種藥的結果相同（結果由你選）。',
        en:
          'Tenecteplase (0.25 mg/kg, single bolus) instead of alteplase: in the AcT trial (within 4.5 h of onset) symptomatic intracerebral haemorrhage within 24 h was 3.4% (27/800) vs 3.2% with alteplase; function was non-inferior. ' +
          'The ESO (2023) recommends it as an alternative to alteplase, and over alteplase for large-vessel occlusion. The simulation does not distinguish the two drugs (you choose the result).', localized: (contentLang: AdditionalLang) => (contentFragment('Tenecteplase (0.25 mg/kg, single bolus) instead of alteplase: in the AcT trial (within 4.5 h of onset) symptomatic intracerebral haemorrhage within 24 h was 3.4% (27/800) vs 3.2% with alteplase; function was non-inferior. ', contentLang) + contentFragment('The ESO (2023) recommends it as an alternative to alteplase, and over alteplase for large-vessel occlusion. The simulation does not distinguish the two drugs (you choose the result).', contentLang)),
      }),
      source:
        'Menon BK et al. Lancet 2022;400:161–169 (AcT); Alamowitch S et al. Eur Stroke J 2023;8:8–54 (ESO tenecteplase recommendation)',
    },
    reperfusionBeforeEvt: {
      low: 0.22,
      high: 0.22,
      note: {
        zh:
          '準備取栓的 ICA、M1 或基底動脈阻塞，在第一張血管攝影時已有 > 50% 再灌流或已無可取血栓：tenecteplase 22%，alteplase 10%（EXTEND-IA TNK，4.5 小時內）；症狀性出血兩組都是 1%。',
        en:
          'Reperfusion of > 50% of the territory, or no retrievable clot, at the first angiogram in ICA, M1 or basilar occlusions due for thrombectomy: tenecteplase 22% vs alteplase 10% (EXTEND-IA TNK, within 4.5 h); symptomatic haemorrhage 1% in each group.',
      },
      source: 'Campbell BCV et al. N Engl J Med 2018;378:1573–1582 (EXTEND-IA TNK)',
    },
  },

  lateIvt: {
    low: 0.33,
    high: 0.533,
    note: withLocalized({
      zh:
        '發病超過 4.5 小時（或醒來才發現）的靜脈血栓溶解，只在影像篩選後有試驗支持；90 天沒有失能（mRS 0–1）的比例：' +
        'WAKE-UP（發病時間不明，MRI DWI–FLAIR 不吻合，alteplase）53.3% vs 41.8%，症狀性出血 2.0% vs 0.4%；' +
        'EXTEND（4.5–9 小時或醒來發現，灌流影像有可救組織，alteplase）35.4% vs 29.5%，症狀性出血 6.2% vs 0.9%；' +
        'TRACE-III（4.5–24 小時、ICA／MCA 大血管阻塞且無法取栓，tenecteplase，中國病人）33.0% vs 24.2%，36 小時內症狀性出血 3.0% vs 0.8%。' +
        'ESO 建議不要只用非顯影 CT 篩選醒來才發現的中風就打 tenecteplase。',
      en:
        'IV thrombolysis started more than 4.5 h after onset (or on waking with symptoms) has trial support only after imaging selection; no disability (mRS 0–1) at 90 days: ' +
        'WAKE-UP (unknown onset, MRI DWI–FLAIR mismatch, alteplase) 53.3% vs 41.8%, symptomatic haemorrhage 2.0% vs 0.4%; ' +
        'EXTEND (4.5–9 h or on waking, salvageable tissue on perfusion imaging, alteplase) 35.4% vs 29.5%, symptomatic haemorrhage 6.2% vs 0.9%; ' +
        'TRACE-III (4.5–24 h, ICA/MCA large-vessel occlusion without access to thrombectomy, tenecteplase, Chinese patients) 33.0% vs 24.2%, symptomatic haemorrhage within 36 h 3.0% vs 0.8%. ' +
        'The ESO recommends against tenecteplase for stroke on waking selected with non-contrast CT alone.', localized: (contentLang: AdditionalLang) => ((((contentFragment('IV thrombolysis started more than 4.5 h after onset (or on waking with symptoms) has trial support only after imaging selection; no disability (mRS 0–1) at 90 days: ', contentLang) + contentFragment('WAKE-UP (unknown onset, MRI DWI–FLAIR mismatch, alteplase) 53.3% vs 41.8%, symptomatic haemorrhage 2.0% vs 0.4%; ', contentLang)) + contentFragment('EXTEND (4.5–9 h or on waking, salvageable tissue on perfusion imaging, alteplase) 35.4% vs 29.5%, symptomatic haemorrhage 6.2% vs 0.9%; ', contentLang)) + contentFragment('TRACE-III (4.5–24 h, ICA/MCA large-vessel occlusion without access to thrombectomy, tenecteplase, Chinese patients) 33.0% vs 24.2%, symptomatic haemorrhage within 36 h 3.0% vs 0.8%. ', contentLang)) + contentFragment('The ESO recommends against tenecteplase for stroke on waking selected with non-contrast CT alone.', contentLang)),
    }),
    source:
      'Thomalla G et al. N Engl J Med 2018;379:611–622 (WAKE-UP); Ma H et al. N Engl J Med 2019;380:1795–1803 (EXTEND); Xiong Y et al. N Engl J Med 2024;391:203–212 (TRACE-III); Alamowitch S et al. Eur Stroke J 2023;8:8–54 (ESO)',
  },

  reocclusion: {
    ivt: {
      low: 0.22,
      high: 0.41,
      typical: 0.34,
      note: {
        zh:
          '靜脈 alteplase 後已再通的 M1／M2 在 2 小時內經顱都卜勒監測下再阻塞的比例：任何再通者 34%（16/47），完全再通者 22%，部分再通者 41%（29 位中 12 位）。共 60 位病人。',
        en:
          'Reocclusion of a recanalised M1/M2 during transcranial Doppler monitoring up to 2 h after IV alteplase: 34% of any recanalisation (16/47); 22% after complete and 41% (12/29) after partial recanalisation. 60 patients.',
      },
      source: 'Alexandrov AV, Grotta JC. Neurology 2002;59:862–867',
    },
    evt: {
      low: 0.023,
      high: 0.066,
      note: {
        zh:
          '取栓成功（mTICI 2b–3）後 24–48 小時追蹤影像上的再阻塞：前瞻性世代 2.3%（16/711，24–48 小時）；Lausanne 登錄 6.6%（28/423，24 小時，含前後循環）。',
        en:
          'Reocclusion on follow-up imaging after successful thrombectomy (mTICI 2b–3): prospective cohort 2.3% (16/711, 24–48 h); Lausanne registry 6.6% (28/423, 24 h, anterior and posterior circulation).',
      },
      source: 'Mosimann PJ et al. Stroke 2018;49:2643–2651; Marto JP et al. Stroke 2019;50:2960–2963',
    },
  },

  distalEmbolization: {
    low: 0.22,
    high: 0.22,
    note: withLocalized({
      zh:
        '取栓後在原阻塞處更遠端的分支出現新血栓：取栓前後都做 MRI 的小型研究（50 位），磁化率加權影像上 11 位（22%；其中 1 位同時有新區域梗塞）。' +
        '這類遠端栓塞與影像或功能結果無關。事先打 alteplase 與它有關聯，但不顯著（OR 5.54，95% CI 0.94–32.49）。',
      en:
        'New clot in branches beyond the treated occlusion after thrombectomy: in a small study with MRI before and after thrombectomy (50 patients), 11 (22%) on susceptibility-weighted imaging (1 of them also with new-territory infarcts). ' +
        'These downstream emboli were not associated with imaging or functional outcome. Alteplase before thrombectomy was associated with them, but not statistically significantly (OR 5.54, 95% CI 0.94–32.49).', localized: (contentLang: AdditionalLang) => (contentFragment('New clot in branches beyond the treated occlusion after thrombectomy: in a small study with MRI before and after thrombectomy (50 patients), 11 (22%) on susceptibility-weighted imaging (1 of them also with new-territory infarcts). ', contentLang) + contentFragment('These downstream emboli were not associated with imaging or functional outcome. Alteplase before thrombectomy was associated with them, but not statistically significantly (OR 5.54, 95% CI 0.94–32.49).', contentLang)),
    }),
    source: 'Wong GJ et al. Stroke 2021;52:2241–2249',
  },

  newTerritoryEmbolization: {
    low: 0.05,
    high: 0.22,
    note: withLocalized({
      zh:
        '取栓時血栓碎片跑到原本沒有受影響的血管區域，數值依偵測方式差很多：核心實驗室判讀血管攝影上的新區域栓塞 5%（瑞士 1264 位取栓病人；與較高的長期死亡率有關，aHR 2.3）；' +
        'ESCAPE-NA1 試驗追蹤影像上新區域梗塞 9.3%（103/1092），最常見於 ACA 區（27.8%），88.3% 在血管攝影上看不到阻塞，43.5% 為多發，與較差的預後有關；' +
        'MRI 研究（50 位）新區域 DWI 梗塞約 22%，依原阻塞部位：ICA 5%、MCA 25%、椎基底動脈 57%。',
      en:
        'Clot fragments reaching a previously unaffected territory during thrombectomy; the figure depends on how it is detected. Core-lab angiographic emboli to a new territory: 5% (1264 thrombectomy patients in Switzerland; associated with higher long-term mortality, aHR 2.3); ' +
        'infarcts in a new territory on follow-up imaging in the ESCAPE-NA1 trial: 9.3% (103/1092), most often in the ACA territory (27.8%), 88.3% without a visible occlusion on angiography, 43.5% multiple, and associated with worse outcome; ' +
        'MRI study (50 patients): new-territory DWI infarcts in about 22%, by target occlusion ICA 5%, MCA 25%, vertebrobasilar 57%.', localized: (contentLang: AdditionalLang) => ((contentFragment('Clot fragments reaching a previously unaffected territory during thrombectomy; the figure depends on how it is detected. Core-lab angiographic emboli to a new territory: 5% (1264 thrombectomy patients in Switzerland; associated with higher long-term mortality, aHR 2.3); ', contentLang) + contentFragment('infarcts in a new territory on follow-up imaging in the ESCAPE-NA1 trial: 9.3% (103/1092), most often in the ACA territory (27.8%), 88.3% without a visible occlusion on angiography, 43.5% multiple, and associated with worse outcome; ', contentLang)) + contentFragment('MRI study (50 patients): new-territory DWI infarcts in about 22%, by target occlusion ICA 5%, MCA 25%, vertebrobasilar 57%.', contentLang)),
    }),
    source:
      'Beyeler M et al. J Neurointerv Surg 2022;14:326–332; Singh N et al. Stroke 2023;54:1477–1483 (ESCAPE-NA1); Wong GJ et al. Stroke 2021;52:2241–2249',
  },

  noReflow: {
    low: 0.03,
    high: 0.253,
    note: withLocalized({
      zh:
        '血管已完全打通（eTICI／mTICI 2c–3）但梗塞區組織仍低灌流（no-reflow）的比例。定義不一，證據有限：' +
        'EXTEND-IA 系列試驗匯總，24 小時灌流影像梗塞區內 >15% 左右差異的持續低灌流 25.3%（33/130）；' +
        '一項以動脈自旋標記 MRI、要求 ≥ 40% 低灌流且有新梗塞的嚴格定義研究，只有 1/33（3%）符合。',
      en:
        'Tissue that stays hypoperfused inside the infarct although the artery was fully reopened (eTICI/mTICI 2c–3), "no-reflow". Definitions vary and evidence is limited: ' +
        'pooled EXTEND-IA trials, persistent hypoperfusion with > 15% interside asymmetry on 24 h perfusion imaging in 25.3% (33/130); ' +
        'an arterial-spin-labelling MRI study from a prospective thrombectomy database, with a strict definition (≥ 40% hypoperfusion plus new infarction) found it in only 1 of 33 (3%).', localized: (contentLang: AdditionalLang) => ((contentFragment('Tissue that stays hypoperfused inside the infarct although the artery was fully reopened (eTICI/mTICI 2c–3), "no-reflow". Definitions vary and evidence is limited: ', contentLang) + contentFragment('pooled EXTEND-IA trials, persistent hypoperfusion with > 15% interside asymmetry on 24 h perfusion imaging in 25.3% (33/130); ', contentLang)) + contentFragment('an arterial-spin-labelling MRI study from a prospective thrombectomy database, with a strict definition (≥ 40% hypoperfusion plus new infarction) found it in only 1 of 33 (3%).', contentLang)),
    }),
    source:
      'Ng FC et al. Neurology 2022;98:e790–e801; ter Schiphorst A et al. J Cereb Blood Flow Metab 2021;41:253–266',
  },

  /**
   * alteplase benefit shown when started up to 4.5 h after onset (the window refers to drug start;
   * median start in ECASS III 3 h 59 min): Hacke W et al. N Engl J Med 2008;359:1317–1329
   */
  ivtWindowH: 4.5,
  /**
   * basilar artery: IV thrombolysis up to 24 h by expert consensus at very low certainty of
   * evidence (ESO/ESMINT, Strbian D et al. Eur Stroke J 2024;9:835–884)
   */
  ivtConsensusWindowH: { basilar: 24 },
  /** thrombectomy benefit shown 6–24 h after onset with clinical–imaging mismatch: DAWN, Nogueira RG et al. N Engl J Med 2018;378:11–21 */
  evtWindowH: 24,
};
