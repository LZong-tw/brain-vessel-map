/**
 * UI strings for the treatment details (how the artery is reopened and how well), the published
 * figures shown next to them and the one-line treatment summary. Traditional Chinese first,
 * English second.
 */

import type { Lang } from '../anatomy/types';
import type { SiteGroup } from '../anatomy/recanalisation';
import type { TreatmentMethod } from '../engine/treatment';

export interface TreatmentStrings {
  /** heading of the details block under the reperfusion select */
  title: string;
  method: string;
  methods: Record<TreatmentMethod, string>;
  /** short method names for the summary line */
  methodShort: Record<TreatmentMethod, string>;
  grade: string;
  gradeHint: string;
  /** option labels by eTICI grade */
  grades: {
    '3': string;
    '2c': string;
    /** optgroup label for 2b50 / 2b67 */
    '2b': string;
    '2b67': string;
    '2b50': string;
    '2a': string;
    '1': string;
    '0': string;
  };
  reocclusion: string;
  reocclusionNever: string;
  reocclusionAfter: (h: string) => string;
  distal: string;
  distalNone: string;
  distalHint: string;
  /** under the distal-embolus select when the method is IV thrombolysis alone */
  distalHintIvt: string;
  /** optgroup labels of the distal-embolus select */
  distalDownstream: string;
  distalNewTerritory: string;
  noReflow: string;
  limitedEvidence: string;
  noReflowHint: string;
  /** shown when the chosen time reopens no complete occlusion */
  nothingReopened: string;
  /** shown when a lacunar (single-branch) occlusion is in effect at the treatment time */
  lacunarNote: string;
  /** evidence box */
  evidenceTitle: string;
  evidenceChoice: string;
  evidenceNone: string;
  sites: Record<SiteGroup, string>;
  rows: {
    success: (site: string) => string;
    sich: string;
    sichMevo: string;
    sichLargeCore: string;
    tnkSich: string;
    tnkReperfusion: string;
    lateIvt: string;
    reocclusion: string;
    distal: string;
    newTerritory: string;
    noReflow: string;
  };
  /** "about 12 % (5–20 %)" */
  range: (typical: string | null, low: string, high: string) => string;
  source: string;
  /** warnings */
  /**
   * IV thrombolysis alone with flow back so late that the drug start (`start`, after onset) was
   * most likely beyond the window; `lag`: how long the artery must have taken to reopen for the
   * start to fall within it, when the range straddles the window (X3-6)
   */
  warnIvtWindow: (window: string, delay: string, start: string, lag: string | null) => string;
  /** beyond the standard window but within a guideline's consensus window (basilar) */
  warnIvtWindowConsensus: (window: string, consensusWindow: string, delay: string) => string;
  /** note: flow back after the window, but early enough for a drug most likely started within it (`lag` as for warnIvtWindow) */
  noteIvtWindowFits: (window: string, delay: string, start: string, lag: string | null) => string;
  /** IV thrombolysis alone with flow back within about 1 h of onset */
  warnIvtTooEarly: (delay: string) => string;
  /** note for bridging after the window: thrombectomy sets the time (`consensusWindow`: basilar) */
  noteBridgingDrugStart: (window: string, consensusWindow: string | null, delay: string) => string;
  warnEvtWindow: (window: string, delay: string) => string;
  warnIvtLargeVessel: (site: string, chance: string) => string;
  warnIvtBasilar: (chance: string) => string;
  /** thrombectomy at a site no randomised trial enrolled */
  warnEvtNoTrial: string;
  /** thrombectomy for a perforator, the ophthalmic artery or a communicating artery */
  warnEvtNotApplicable: string;
  /** thrombectomy for a medium/distal vessel occlusion */
  warnEvtMevo: string;
  /** summary line in the results */
  summaryLabel: string;
  summaryGrade: (g: string) => string;
  /** the grade the final angiogram shows when a downstream branch is blocked, beside the grade chosen for the rest (U2-9) */
  summaryGradeShown: (shown: string, chosen: string) => string;
  /** under the distal-embolus select: the grade the final angiogram shows with that branch blocked (U2-9) */
  distalGradeNote: (shown: string, chosen: string) => string;
  summaryReocclusion: (h: string) => string;
  summaryDistal: (v: string) => string;
  summaryNoReflow: (p: string) => string;
}

const zh: TreatmentStrings = {
  title: '治療細節',
  method: '方式',
  methods: { evt: '取栓', ivt: '靜脈血栓溶解', bridging: '兩者（橋接）' },
  methodShort: { evt: '取栓', ivt: '靜脈血栓溶解', bridging: '橋接（溶栓＋取栓）' },
  grade: '結果（eTICI 再灌流分級）',
  gradeHint: '打通後，原本缺血的區域有多少恢復血流。',
  grades: {
    '3': '3：完全再灌流',
    '2c': '2c：幾乎完全（90–99%）',
    '2b': '2b：一半到九成',
    '2b67': '2b67：三分之二到九成（67–89%）',
    '2b50': '2b50：一半到三分之二（50–66%）',
    '2a': '2a：不到一半',
    '1': '1：只通過血栓，遠端幾乎沒血流',
    '0': '0：沒有打通',
  },
  reocclusion: '再阻塞',
  reocclusionNever: '不會',
  reocclusionAfter: (h) => `${h}後`,
  distal: '遠端栓塞',
  distalNone: '無',
  distalHint: '取栓時血栓碎片可能卡進下游分支，或跑到原本沒受影響的區域（最常是前大腦動脈）。',
  distalHintIvt: '靜脈血栓溶解後血栓也可能碎裂、往遠端移動；這裡沒有附比例，因為已發表的栓塞數字都來自取栓。',
  distalDownstream: '下游分支',
  distalNewTerritory: '新區域（同側前大腦動脈）',
  noReflow: '無再流（no-reflow）',
  limitedEvidence: '證據有限',
  noReflowHint: '大血管通了，但部分微血管仍沒有血流；比例是估計值。',
  nothingReopened: '這個時間沒有可打通的完全阻塞，治療細節不會改變結果。',
  lacunarNote:
    '腔隙性（單一穿通支）阻塞也用靜脈血栓溶解治療（發作 4.5 小時內開始，和其他缺血性中風相同；不做取栓），但模型沒有模擬藥物打通這類阻塞，治療細節不會改變它的病程。',
  evidenceTitle: '文獻數字',
  evidenceChoice: '模擬顯示的是你選擇的結果，不是機率；下面的數字只供對照實際上多常發生。',
  evidenceNone: 'App 內沒有這個部位與方式的已發表數據。',
  sites: {
    ica: '內頸動脈',
    m1: '中大腦動脈 M1',
    m2: '中大腦動脈 M2',
    distal: '遠端分支',
    basilar: '基底動脈',
    vertebral: '椎動脈',
    other: '其他部位',
  },
  rows: {
    success: (site) => `成功打通（${site}）`,
    sich: '症狀性腦出血',
    sichMevo: '症狀性腦出血（中型／遠端血管取栓）',
    sichLargeCore: '症狀性腦出血（大核心取栓）',
    tnkSich: '症狀性腦出血（tenecteplase）',
    tnkReperfusion: '取栓前已再灌流（tenecteplase）',
    lateIvt: '超過 4.5 小時的血栓溶解：90 天無失能',
    reocclusion: '早期再阻塞',
    distal: '遠端分支栓塞',
    newTerritory: '新區域栓塞',
    noReflow: '無再流',
  },
  range: (typical, low, high) => (typical ? `約 ${typical}（${low}–${high}）` : `${low}–${high}`),
  source: '來源',
  warnIvtWindow: (w, d, start, lag) =>
    `靜脈血栓溶解須在發作後 ${w}內開始用藥（更晚只在影像篩選後：WAKE-UP、EXTEND 試驗；無法取栓的大血管阻塞可在 24 小時內用 tenecteplase：TRACE-III，中國病人）。這裡選的是血流恢復的時間：發作後 ${d}；用藥後動脈通常在接下來 1–3 小時內才逐漸打通，所以藥物是在發作後約 ${start}開始的，多半已超過時限${
      lag ? `：只有動脈在用藥後 ${lag}以上才打通，才可能是在 ${w}內開始` : ''
    }。`,
  warnIvtWindowConsensus: (w, cw, d) =>
    `靜脈血栓溶解的標準是發作後 ${w}內開始用藥；這裡是發作後 ${d}（血流恢復的時間）。基底動脈阻塞時，ESO/ESMINT 指引依專家共識建議可用到 ${cw}，但證據確定性非常低。`,
  noteIvtWindowFits: (w, d, start, lag) =>
    `發作後 ${d}血流恢復，和 ${w}內開始用藥相符：用藥後動脈通常在接下來 1–3 小時內才逐漸打通，所以藥物是在發作後約 ${start}開始的${
      lag ? `（動脈在用藥後 ${lag}以上才打通時，是在 ${w}內開始；打通得更快，就是超過時限才用藥）` : ''
    }。`,
  warnIvtTooEarly: (d) =>
    `發作後才 ${d}就恢復血流，比靜脈血栓溶解通常能做到的更快：要先做腦部影像才能用藥，用藥後動脈通常在接下來 1–3 小時內才逐漸打通（INTERRSeCT 世代研究中，從開始用藥到評估再通的中位數約 2 小時）。`,
  noteBridgingDrugStart: (w, cw, d) =>
    `橋接治療的靜脈血栓溶解也須在發作後 ${w}內開始用藥${cw ? `（基底動脈阻塞時，ESO/ESMINT 指引依專家共識建議可用到 ${cw}）` : ''}；這裡選的時間（發作後 ${d}）是取栓恢復血流的時間，看不出藥物是何時給的。`,
  warnEvtWindow: (w, d) => `取栓通常只在發作後 ${w}內（且影像條件合適）進行；這裡是發作後 ${d}。`,
  warnIvtLargeVessel: (site, chance) => `${site}這類大血管阻塞，只用靜脈血栓溶解在數小時內早期打通的機會低（${chance}），通常會再取栓。`,
  warnIvtBasilar: (chance) =>
    `基底動脈阻塞只用靜脈血栓溶解，數小時內早期再通的機會低（${chance}）；較晚判定的病例系列約 50%。ESO 指引建議靜脈血栓溶解之後，NIHSS ≥ 10 時再加取栓。`,
  warnEvtNoTrial: '這個阻塞部位的取栓沒有經過隨機試驗驗證（試驗收的是顱內 ICA、M1 與基底動脈阻塞），只能個別決定。',
  warnEvtNotApplicable: '取栓不處理這類動脈（穿通支、眼動脈或交通動脈）；這裡的再灌流治療是靜脈血栓溶解。',
  warnEvtMevo:
    '中型／遠端血管阻塞：2025 年 ESCAPE-MeVO 與 DISTAL 試驗中取栓沒有改善預後；症狀性出血在 ESCAPE-MeVO 為 5.4% vs 2.2%、在 DISTAL 為 5.9% vs 2.6%（作者認為相近），只有 ESCAPE-MeVO 的死亡率較高——模型裡救回的組織，在試驗中並沒有變成較好的結果。優勢側近端 M2 沒有納入 DISTAL，仍不確定。',
  summaryLabel: '治療',
  summaryGrade: (g) => `eTICI ${g}`,
  summaryGradeShown: (shown, chosen) => `eTICI ${shown}（栓塞分支以外為 ${chosen}）`,
  distalGradeNote: (shown, chosen) =>
    `eTICI 依整個下游區域有多少恢復灌流來分級，被碎片塞住的分支算作沒有再灌流：有這個遠端栓塞，最後的血管攝影是 eTICI ${shown}；上面選的分級（${chosen}）是其餘區域的結果。`,
  summaryReocclusion: (h) => `${h}後再阻塞`,
  summaryDistal: (v) => `遠端栓塞：${v}`,
  summaryNoReflow: (p) => `無再流 ${p}`,
};

const en: TreatmentStrings = {
  title: 'Treatment details',
  method: 'Method',
  methods: { evt: 'Thrombectomy', ivt: 'IV thrombolysis', bridging: 'Both (bridging)' },
  methodShort: { evt: 'Thrombectomy', ivt: 'IV thrombolysis', bridging: 'Bridging (IVT + thrombectomy)' },
  grade: 'Result (eTICI reperfusion grade)',
  gradeHint: 'How much of the ischaemic area gets its blood flow back.',
  grades: {
    '3': '3: complete reperfusion',
    '2c': '2c: nearly complete (90–99%)',
    '2b': '2b: half to nine tenths',
    '2b67': '2b67: two thirds to nine tenths (67–89%)',
    '2b50': '2b50: half to two thirds (50–66%)',
    '2a': '2a: less than half',
    '1': '1: past the clot, hardly any distal flow',
    '0': '0: not reopened',
  },
  reocclusion: 'Reocclusion',
  reocclusionNever: 'No',
  reocclusionAfter: (h) => `after ${h}`,
  distal: 'Distal embolus',
  distalNone: 'None',
  distalHint: 'During thrombectomy a fragment of the clot may lodge in a downstream branch or reach a previously unaffected territory (most often the ACA).',
  distalHintIvt: 'After IV thrombolysis the clot can also break up and move downstream; no rate is shown because the published embolus figures come from thrombectomy.',
  distalDownstream: 'Downstream branches',
  distalNewTerritory: 'New territory (same-side ACA)',
  noReflow: 'No-reflow',
  limitedEvidence: 'limited evidence',
  noReflowHint: 'The artery is open but part of the microcirculation still gets no flow; the share is an estimate.',
  nothingReopened: 'Nothing complete is occluded at this time, so the treatment details change nothing.',
  lacunarNote:
    'A lacunar (single perforator) occlusion is also treated with IV thrombolysis (started within 4.5 h, like other ischaemic strokes; thrombectomy does not apply), but the model does not simulate the drug reopening it, so the treatment details do not change its course.',
  evidenceTitle: 'Published figures',
  evidenceChoice: 'The simulation shows the result you chose, not a probability; the figures below only show how often it happens.',
  evidenceNone: 'No published figure in the app for this site and method.',
  sites: {
    ica: 'internal carotid artery',
    m1: 'MCA M1',
    m2: 'MCA M2',
    distal: 'distal branches',
    basilar: 'basilar artery',
    vertebral: 'vertebral artery',
    other: 'other sites',
  },
  rows: {
    success: (site) => `Successful reopening (${site})`,
    sich: 'Symptomatic haemorrhage',
    sichMevo: 'Symptomatic haemorrhage (medium/distal-vessel thrombectomy)',
    sichLargeCore: 'Symptomatic haemorrhage (large-core thrombectomy)',
    tnkSich: 'Symptomatic haemorrhage with tenecteplase',
    tnkReperfusion: 'Reperfusion before thrombectomy (tenecteplase)',
    lateIvt: 'Thrombolysis beyond 4.5 h: no disability at 90 days',
    reocclusion: 'Early reocclusion',
    distal: 'Emboli to downstream branches',
    newTerritory: 'Emboli to a new territory',
    noReflow: 'No-reflow',
  },
  range: (typical, low, high) => (typical ? `about ${typical} (${low}–${high})` : `${low}–${high}`),
  source: 'Source',
  warnIvtWindow: (w, d, start, lag) =>
    `IV thrombolysis must be started within ${w} of onset (later only after imaging selection: the WAKE-UP and EXTEND trials; or tenecteplase up to 24 h for a large-vessel occlusion without access to thrombectomy: TRACE-III, Chinese patients). The time chosen here is when flow returns, ${d} after onset; after the drug the artery usually reopens gradually over the next 1–3 h, so it was started about ${start} after onset, most likely after the window${
      lag ? `: within ${w} only if the artery took ${lag} or longer to reopen` : ''
    }.`,
  warnIvtWindowConsensus: (w, cw, d) =>
    `IV thrombolysis is standard when started within ${w} of onset; this is ${d} after onset (when flow returns). For basilar-artery occlusion the ESO/ESMINT guideline suggests it up to ${cw}, by expert consensus at very low certainty of evidence.`,
  noteIvtWindowFits: (w, d, start, lag) =>
    `Flow returning ${d} after onset fits a drug started within ${w}: after the drug the artery usually reopens gradually over the next 1–3 h, so it was started about ${start} after onset${
      lag ? ` — within ${w} if the artery took ${lag} or longer to reopen, later if it reopened faster` : ''
    }.`,
  warnIvtTooEarly: (d) =>
    `Flow returning only ${d} after onset is faster than IV thrombolysis usually achieves: the drug is started only after brain imaging, and the artery then usually reopens gradually over the next 1–3 h (in the INTERRSeCT cohort recanalisation was assessed a median of about 2 h after the drug was started).`,
  noteBridgingDrugStart: (w, cw, d) =>
    `With bridging, IV thrombolysis too must be started within ${w} of onset${cw ? ` (for a basilar-artery occlusion the ESO/ESMINT guideline suggests up to ${cw}, by expert consensus)` : ''}; the time chosen here (${d} after onset) is when thrombectomy restores flow, which does not tell when the drug was given.`,
  warnEvtWindow: (w, d) => `Thrombectomy is usually done only within ${w} of onset (with favourable imaging); this is ${d} after onset.`,
  warnIvtLargeVessel: (site, chance) =>
    `For a large-vessel occlusion such as the ${site}, early reopening with IV thrombolysis alone is uncommon (${chance} within hours); thrombectomy is usually added.`,
  warnIvtBasilar: (chance) =>
    `For a basilar-artery occlusion, early recanalisation with IV thrombolysis alone is uncommon (${chance} within hours); later case-series rates are about 50%. The ESO guideline suggests adding thrombectomy after IV thrombolysis for NIHSS ≥ 10.`,
  warnEvtNoTrial:
    'Thrombectomy for an occlusion at this site has not been tested in randomised trials (they enrolled intracranial ICA, M1 and basilar occlusions); it is an individual decision.',
  warnEvtNotApplicable: 'Thrombectomy does not treat this kind of artery (a perforator, the ophthalmic artery or a communicating artery); reperfusion treatment here means IV thrombolysis.',
  warnEvtMevo:
    'Medium/distal vessel occlusion: in the 2025 ESCAPE-MeVO and DISTAL trials thrombectomy did not improve outcome; symptomatic haemorrhage was 5.4% vs 2.2% in ESCAPE-MeVO and 5.9% vs 2.6% in DISTAL (judged similar by its authors), with higher mortality only in ESCAPE-MeVO. Tissue saved in the model did not translate into better outcomes in these trials. A dominant proximal M2 was excluded from DISTAL and remains uncertain.',
  summaryLabel: 'Treatment',
  summaryGrade: (g) => `eTICI ${g}`,
  summaryGradeShown: (shown, chosen) => `eTICI ${shown} (${chosen} apart from the blocked branch)`,
  distalGradeNote: (shown, chosen) =>
    `eTICI grades how much of the whole downstream territory is reperfused, and a branch blocked by a fragment counts as not reperfused: with this distal embolus the final angiogram reads eTICI ${shown}; the grade chosen above (${chosen}) is that of the rest of the territory.`,
  summaryReocclusion: (h) => `reoccludes after ${h}`,
  summaryDistal: (v) => `distal embolus: ${v}`,
  summaryNoReflow: (p) => `no-reflow ${p}`,
};

export const TREATMENT_UI: Record<Lang, TreatmentStrings> = { 'zh-TW': zh, en };
