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
 * (for example any vertebral-artery figure, or bridging therapy for M2/distal occlusions) are
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

/** thrombectomy for anterior-circulation large-vessel occlusion (ICA/M1), not reported by site */
const EVT_ANTERIOR_LVO: EvidenceRange = {
  low: 0.71,
  high: 0.91,
  note: {
    zh:
      '取栓後成功再灌流（最後一次血管攝影 TICI ≥ 2b）的比例，來自前循環大血管阻塞（多為 ICA 與 M1）的隨機試驗，各試驗自行判讀，未依阻塞部位分開報告。' +
      'HERMES（五項 2010–2014 年試驗匯總，mTICI 2b–3）：570 位導管時仍有可及阻塞者中 402 位（71%）；該取栓組 83% 也先打了靜脈 alteplase。' +
      '直接取栓（未先打血栓溶解劑）組：DIRECT-MT 79.4%、SWIFT DIRECT 91%（182/201）。',
    en:
      'Successful reperfusion (TICI ≥ 2b on the final angiogram) after thrombectomy in randomised trials of anterior-circulation large-vessel occlusion (mostly ICA and M1), graded by each trial; not reported separately by site. ' +
      'HERMES (5 trials, 2010–2014, mTICI 2b–3): 402 of 570 (71%) with a persisting, accessible occlusion at catheterisation; 83% of that thrombectomy arm had also received IV alteplase. ' +
      'Thrombectomy without prior thrombolysis: DIRECT-MT 79.4%, SWIFT DIRECT 91% (182/201).',
  },
  source:
    'Goyal M et al. Lancet 2016;387:1723–1731 (HERMES); Yang P et al. N Engl J Med 2020;382:1981–1993 (DIRECT-MT); Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT)',
};

/** IV thrombolysis followed by thrombectomy, from the trials that randomised against direct EVT */
const BRIDGING_ANTERIOR_LVO: EvidenceRange = {
  low: 0.845,
  high: 0.96,
  note: {
    zh:
      '先靜脈 alteplase 再取栓（橋接治療）的整體成功再灌流比例，來自比較「直接取栓」與「橋接」的前循環大血管阻塞（多為 ICA 與 M1）隨機試驗，未依部位分開：' +
      'DIRECT-MT 84.5%（直接取栓 79.4%）、SWIFT DIRECT 96%（199/207；直接取栓 91%）。',
    en:
      'Overall successful reperfusion with IV alteplase followed by thrombectomy (bridging), from randomised trials of direct versus bridging thrombectomy in anterior-circulation large-vessel occlusion (mostly ICA and M1), not reported by site: ' +
      'DIRECT-MT 84.5% (direct thrombectomy 79.4%); SWIFT DIRECT 96% (199/207; direct 91%).',
  },
  source: 'Yang P et al. N Engl J Med 2020;382:1981–1993 (DIRECT-MT); Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT)',
};

export const RECANALISATION_EVIDENCE: RecanalisationEvidence = {
  success: {
    ica: {
      ivt: {
        low: 0.042,
        high: 0.13,
        note: {
          zh:
            '僅靜脈血栓溶解（alteplase）後，阻塞的顱內頸動脈再通的比例（以經顱都卜勒、CTA 或取栓前第一張血管攝影判定，數小時內）。' +
            'Calgary 世代：遠端 ICA 1/24；INTERRSeCT：10/92（10.9%，rAOL 2b–3）；統合分析：部分或完全早期再通 13%（95% CI 6–22%），完全再通僅 4%。',
          en:
            'Recanalisation of an occluded intracranial ICA after IV thrombolysis (alteplase) alone, assessed within hours by transcranial Doppler, CTA or the first run of a thrombectomy angiogram. ' +
            'Calgary cohort: distal ICA 1 of 24; INTERRSeCT: 10/92 (10.9%, rAOL 2b–3); meta-analysis: partial or complete early recanalisation 13% (95% CI 6–22%), complete only 4%.',
        },
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
        note: {
          zh:
            '僅靜脈血栓溶解後 M1 再通的比例（數小時內以 TCD／CTA／血管攝影判定）。INTERRSeCT：近端 M1 21.6%（24/111）、遠端 M1 46.4%（39/84）；' +
            'Calgary 世代 M1 32.3%（21/65）；統合分析「近端 MCA」部分或完全早期再通 35%（完全 21%）。' +
            '血栓長度：一項 138 位 MCA 中風的研究中，所有再通者的血栓都不超過 8 mm（非顯影 CT 量測）。',
          en:
            'Recanalisation of an M1 occlusion after IV thrombolysis alone (TCD/CTA/angiography within hours). INTERRSeCT: proximal M1 21.6% (24/111), distal M1 46.4% (39/84); ' +
            'Calgary cohort M1 32.3% (21/65); meta-analysis, "proximal MCA": partial or complete early recanalisation 35% (complete 21%). ' +
            'Clot length: in 138 MCA strokes, no thrombus longer than 8 mm (non-contrast CT) recanalised.',
        },
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
        note: {
          zh:
            '僅靜脈血栓溶解後 M2 再通的比例。Calgary 世代 M2 30.8%（4/13）；INTERRSeCT M2 37.1%（53/143，rAOL 2b–3）；' +
            '統合分析中作者歸為「遠端 MCA」者部分或完全早期再通 52%（95% CI 39–64%，完全 38%）。',
          en:
            'Recanalisation of an M2 occlusion after IV thrombolysis alone. Calgary cohort M2 30.8% (4/13); INTERRSeCT M2 37.1% (53/143, rAOL 2b–3); ' +
            'meta-analysis, occlusions the authors grouped as "distal MCA": partial or complete early recanalisation 52% (95% CI 39–64%; complete 38%).',
        },
        source:
          'Bhatia R et al. Stroke 2010;41:2254–2258; Menon BK et al. JAMA 2018;320:1017–1026 (INTERRSeCT); Seners P et al. Stroke 2016;47:2409–2412',
      },
      evt: {
        low: 0.592,
        high: 0.751,
        note: {
          zh:
            '取栓後成功再灌流的比例。HERMES 中 130 位 M2 阻塞者，取栓組 mTICI 2b–3 為 59.2%；' +
            'ESCAPE-MeVO（中型血管阻塞：約一半為 M2，其餘 M3、ACA、PCA）MeVO-eTICI 2b–3 為 75.1%（190/253），該組 56.5% 也接受靜脈血栓溶解。',
          en:
            'Successful reperfusion after thrombectomy. HERMES, 130 patients with M2 occlusion: mTICI 2b–3 in 59.2% of the thrombectomy arm; ' +
            'ESCAPE-MeVO (medium-vessel occlusions: about half M2, the rest M3, ACA, PCA): MeVO-eTICI 2b–3 in 75.1% (190/253); 56.5% of that arm also received IV thrombolysis.',
        },
        source:
          'Menon BK et al. J Neurointerv Surg 2019;11:1065–1069 (HERMES M2); Goyal M et al. N Engl J Med 2025;392:1385–1395 (ESCAPE-MeVO)',
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
        note: {
          zh:
            'ESCAPE-MeVO 取栓組最終 MeVO-eTICI 2b–3 為 75.1%（190/253）；阻塞部位約一半為 M2、36% 為 M3、其餘為 ACA／PCA；56.5% 也接受靜脈血栓溶解。' +
            '該試驗與 DISTAL 試驗都未顯示取栓比內科治療改善 90 天功能。',
          en:
            'ESCAPE-MeVO thrombectomy arm: final MeVO-eTICI 2b–3 in 75.1% (190/253); occlusions about half M2, 36% M3, the rest ACA/PCA; 56.5% also received IV thrombolysis. ' +
            'Neither this trial nor DISTAL showed better 90-day function with thrombectomy than with medical care.',
        },
        source:
          'Goyal M et al. N Engl J Med 2025;392:1385–1395 (ESCAPE-MeVO); Psychogios M et al. N Engl J Med 2025;392:1374–1384 (DISTAL)',
      },
    },
    basilar: {
      ivt: {
        low: 0.04,
        high: 0.13,
        note: {
          zh: '僅靜脈血栓溶解後基底動脈再通的比例：Calgary 世代 1/25（4%）；統合分析部分或完全早期再通 13%（95% CI 0–35%，完全 4%）。資料很少。',
          en: 'Recanalisation of the basilar artery after IV thrombolysis alone: Calgary cohort 1 of 25 (4%); meta-analysis, partial or complete early recanalisation 13% (95% CI 0–35%; complete 4%). Few data.',
        },
        source: 'Bhatia R et al. Stroke 2010;41:2254–2258; Seners P et al. Stroke 2016;47:2409–2412',
      },
      evt: {
        low: 0.73,
        high: 0.93,
        note: {
          zh:
            '基底動脈阻塞取栓後成功再灌流（mTICI ≥ 2b）。ATTENTION 試驗 93.0%（該組 31% 也接受靜脈血栓溶解；數值引自 ATTENTION 研究者的事後分析）；' +
            'VERITAS 四項隨機試驗（ATTENTION、BEST、BAOCHE、BASICS）匯總中直接取栓者 73%（182 位，部分血管攝影資料缺漏）；' +
            'ESO 指引統合觀察性研究中直接取栓 80.1%（604/754）。',
          en:
            'Successful reperfusion (mTICI ≥ 2b) after thrombectomy for basilar-artery occlusion. ATTENTION trial 93.0% (31% of that arm also had IV thrombolysis; figure as restated by the ATTENTION investigators); ' +
            'VERITAS pooled 4 RCTs (ATTENTION, BEST, BAOCHE, BASICS): 73% (182 patients) with thrombectomy alone, with angiographic data missing for some; ' +
            'ESO guideline pooling of observational studies: direct thrombectomy 80.1% (604/754).',
        },
        source:
          'Tao C et al. N Engl J Med 2022;387:1361–1372 (ATTENTION), as restated in Yi T et al. Front Neurol 2023;14:1308036; Knapen RRMM et al. Cardiovasc Intervent Radiol 2025;48:1869–1877 (VERITAS); Strbian D et al. Eur Stroke J 2024;9:835–884 (ESO/ESMINT)',
      },
      bridging: {
        low: 0.67,
        high: 0.83,
        note: {
          zh:
            '基底動脈阻塞先靜脈血栓溶解再取栓的成功再灌流（mTICI ≥ 2b）：VERITAS 四項隨機試驗匯總 67%（82 位，部分資料缺漏；與直接取栓無顯著差異）；' +
            'ESO 指引統合觀察性研究 83.0%（308/371）。',
          en:
            'Successful reperfusion (mTICI ≥ 2b) with IV thrombolysis before thrombectomy for basilar-artery occlusion: VERITAS pooled 4 RCTs 67% (82 patients, some data missing; no significant difference from direct thrombectomy); ' +
            'ESO guideline pooling of observational studies 83.0% (308/371).',
        },
        source:
          'Knapen RRMM et al. Cardiovasc Intervent Radiol 2025;48:1869–1877 (VERITAS); Strbian D et al. Eur Stroke J 2024;9:835–884 (ESO/ESMINT)',
      },
    },
  },

  sich: {
    ivt: {
      low: 0.017,
      high: 0.073,
      note: {
        zh:
          '靜脈 alteplase 後症狀性顱內出血，數值高度取決於定義。NINDS（發病 3 小時內治療，36 小時內）6.4%（安慰劑 0.6%）；' +
          'ECASS III（3–4.5 小時，試驗自身定義）2.4%（安慰劑 0.2%）；SITS-MOST 登錄（3 小時內）：SITS-MOST 定義（24 小時內 PH2 且 NIHSS 惡化 ≥ 4）1.7%，Cochrane 定義（7 天內）7.3%。',
        en:
          'Symptomatic intracranial haemorrhage after IV alteplase; the figure depends heavily on the definition. NINDS (treated within 3 h of onset; within 36 h) 6.4% (placebo 0.6%); ' +
          'ECASS III (3–4.5 h, trial definition) 2.4% (placebo 0.2%); SITS-MOST registry (within 3 h): SITS-MOST definition (PH2 with NIHSS worsening ≥ 4 at 24 h) 1.7%, Cochrane definition (7 days) 7.3%.',
      },
      source:
        'NINDS rt-PA Stroke Study Group. N Engl J Med 1995;333:1581–1587; Hacke W et al. N Engl J Med 2008;359:1317–1329 (ECASS III); Wahlgren N et al. Lancet 2007;369:275–282 (SITS-MOST)',
    },
    evt: {
      low: 0.025,
      high: 0.059,
      typical: 0.044,
      note: {
        zh:
          'HERMES 取栓組 4.4%（28/634），對照組 4.3%（28/653），各試驗自身定義；取栓組 83% 也打了 alteplase。' +
          '直接取栓組：SWIFT DIRECT 2.5%（5/201）、MR CLEAN-NO IV 5.9%。基底動脈試驗：ATTENTION 5%（12/226）、BAOCHE 6%（6/102）。',
        en:
          'HERMES thrombectomy arm 4.4% (28/634) vs control 4.3% (28/653), each trial\'s own definition; 83% of the thrombectomy arm also received alteplase. ' +
          'Thrombectomy without prior thrombolysis: SWIFT DIRECT 2.5% (5/201), MR CLEAN-NO IV 5.9%. Basilar trials: ATTENTION 5% (12/226), BAOCHE 6% (6/102).',
      },
      source:
        'Goyal M et al. Lancet 2016;387:1723–1731 (HERMES); Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT); LeCouffe NE et al. N Engl J Med 2021;385:1833–1844 (MR CLEAN-NO IV); Tao C et al. N Engl J Med 2022;387:1361–1372 (ATTENTION); Jovin TG et al. N Engl J Med 2022;387:1373–1384 (BAOCHE)',
    },
    bridging: {
      low: 0.035,
      high: 0.053,
      note: {
        zh: '先靜脈 alteplase 再取栓的症狀性顱內出血（各試驗自身定義）：SWIFT DIRECT 3.5%（7/202）、MR CLEAN-NO IV 5.3%；兩試驗中與直接取栓無顯著差異。',
        en: 'Symptomatic intracranial haemorrhage with IV alteplase before thrombectomy (each trial\'s definition): SWIFT DIRECT 3.5% (7/202), MR CLEAN-NO IV 5.3%; not significantly different from direct thrombectomy in either trial.',
      },
      source: 'Fischer U et al. Lancet 2022;400:104–115 (SWIFT DIRECT); LeCouffe NE et al. N Engl J Med 2021;385:1833–1844 (MR CLEAN-NO IV)',
    },
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
    low: 0.05,
    high: 0.42,
    note: {
      zh:
        '取栓時血栓碎片造成新區域或遠端栓塞，數值依偵測方式差很多：核心實驗室判讀血管攝影上的新區域栓塞 5%（瑞士 1264 位取栓病人）；' +
        'ESCAPE-NA1 試驗追蹤影像上新血管區域梗塞 9.3%（103/1092，最常見於 ACA 區）；' +
        '取栓前後都做 MRI 的小型研究（50 位）有 42% 出現任何術中栓塞證據（遠端區域 SWI 新血栓約 22%、新區域 DWI 梗塞約 22%）。',
      en:
        'Clot fragments lodging in a new territory or distal branches during thrombectomy; the figure depends on how it is detected. Core-lab angiographic emboli to a new territory: 5% (1264 thrombectomy patients in Switzerland); ' +
        'infarcts in a new vascular territory on follow-up imaging in the ESCAPE-NA1 trial: 9.3% (103/1092; ACA territory most often); ' +
        'a small study with MRI before and after thrombectomy (50 patients): any periprocedural embolic evidence in 42% (new distal-territory clot on susceptibility imaging about 22%, new-territory DWI infarcts about 22%).',
    },
    source:
      'Beyeler M et al. J Neurointerv Surg 2022;14:326–332; Singh N et al. Stroke 2023;54:1477–1483 (ESCAPE-NA1); Wong GJ et al. Stroke 2021;52:2241–2249',
  },

  noReflow: {
    low: 0.03,
    high: 0.253,
    note: {
      zh:
        '血管已完全打通（eTICI／mTICI 2c–3）但梗塞區組織仍低灌流（no-reflow）的比例。定義不一，證據有限：' +
        'EXTEND-IA 系列試驗匯總，24 小時灌流影像梗塞區內 >15% 左右差異的持續低灌流 25.3%（33/130）；' +
        '一項以動脈自旋標記 MRI、要求 ≥ 40% 低灌流且有新梗塞的嚴格定義研究，只有 1/33（3%）符合。',
      en:
        'Tissue that stays hypoperfused inside the infarct although the artery was fully reopened (eTICI/mTICI 2c–3), "no-reflow". Definitions vary and evidence is limited: ' +
        'pooled EXTEND-IA trials, persistent hypoperfusion with > 15% interside asymmetry on 24 h perfusion imaging in 25.3% (33/130); ' +
        'an arterial-spin-labelling MRI study from a prospective thrombectomy database, with a strict definition (≥ 40% hypoperfusion plus new infarction) found it in only 1 of 33 (3%).',
    },
    source:
      'Ng FC et al. Neurology 2022;98:e790–e801; ter Schiphorst A et al. J Cereb Blood Flow Metab 2021;41:253–266',
  },

  /** alteplase benefit shown up to 4.5 h after onset: ECASS III, Hacke W et al. N Engl J Med 2008;359:1317–1329 */
  ivtWindowH: 4.5,
  /** thrombectomy benefit shown 6–24 h after onset with clinical–imaging mismatch: DAWN, Nogueira RG et al. N Engl J Med 2018;378:11–21 */
  evtWindowH: 24,
};
