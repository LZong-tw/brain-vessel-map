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
    // Liebeskind 2019, https://doi.org/10.1136/neurintsurg-2018-014127.
    '1': '1：血栓減少，沒有遠端再灌流',
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
    // Liebeskind 2019, https://doi.org/10.1136/neurintsurg-2018-014127.
    '1': '1: thrombus reduction, no distal reperfusion',
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

const de: TreatmentStrings = {
  title: 'Behandlungsdetails',
  method: 'Verfahren',
  methods: { evt: 'Thrombektomie', ivt: 'Intravenöse Thrombolyse', bridging: 'Beides (Bridging)' },
  methodShort: { evt: 'Thrombektomie', ivt: 'Intravenöse Thrombolyse', bridging: 'Bridging (IVT + Thrombektomie)' },
  grade: 'Ergebnis (eTICI-Reperfusionsgrad)',
  gradeHint: 'Anteil des ischämischen Gebietes, der wieder durchblutet wird.',
  grades: {
    '3': '3: vollständige Reperfusion', '2c': '2c: nahezu vollständig (90–99%)',
    '2b': '2b: die Hälfte bis neun Zehntel', '2b67': '2b67: zwei Drittel bis neun Zehntel (67–89%)',
    '2b50': '2b50: die Hälfte bis zwei Drittel (50–66%)', '2a': '2a: weniger als die Hälfte',
    '1': '1: Thrombusreduktion ohne distale Reperfusion', '0': '0: keine Rekanalisation',
  },
  reocclusion: 'Erneuter Verschluss', reocclusionNever: 'Nein', reocclusionAfter: (h) => `nach ${h}`,
  distal: 'Distale Embolie', distalNone: 'Keine',
  distalHint: 'Bei der Thrombektomie kann ein Thrombusfragment einen nachgeschalteten Ast verschließen oder ein zuvor nicht betroffenes Versorgungsgebiet erreichen (meist die ACA).',
  distalHintIvt: 'Auch nach intravenöser Thrombolyse kann der Thrombus zerfallen und distal wandern; eine Häufigkeit wird nicht angegeben, da die veröffentlichten Emboliezahlen aus Thrombektomien stammen.',
  distalDownstream: 'Nachgeschaltete Äste', distalNewTerritory: 'Neues Versorgungsgebiet (ipsilaterale ACA)',
  noReflow: 'No-Reflow-Phänomen', limitedEvidence: 'Begrenzte Evidenz',
  noReflowHint: 'Die Arterie ist offen, aber ein Teil der Mikrozirkulation bleibt ohne Blutfluss; der Anteil ist geschätzt.',
  nothingReopened: 'Zu diesem Zeitpunkt liegt kein vollständiger Verschluss vor, der eröffnet werden könnte; die Behandlungsdetails ändern das Ergebnis nicht.',
  lacunarNote: 'Ein lakunärer Verschluss (eines einzelnen perforierenden Astes) wird ebenfalls mit intravenöser Thrombolyse behandelt (Beginn innerhalb von 4.5 h wie bei anderen ischämischen Schlaganfällen; keine Thrombektomie). Das Modell simuliert jedoch keine medikamentöse Wiedereröffnung dieses Verschlusses; die Behandlungsdetails ändern seinen Verlauf daher nicht.',
  evidenceTitle: 'Veröffentlichte Zahlen',
  evidenceChoice: 'Die Simulation zeigt das gewählte Ergebnis, keine Wahrscheinlichkeit; die folgenden Zahlen dienen nur zum Vergleich mit der tatsächlichen Häufigkeit.',
  evidenceNone: 'Für diesen Ort und dieses Verfahren sind in der App keine veröffentlichten Daten hinterlegt.',
  sites: { ica: 'Arteria carotis interna', m1: 'MCA M1', m2: 'MCA M2', distal: 'distale Äste', basilar: 'Arteria basilaris', vertebral: 'Arteria vertebralis', other: 'andere Orte' },
  rows: {
    success: (site) => `Erfolgreiche Rekanalisation (${site})`, sich: 'Symptomatische Hirnblutung',
    sichMevo: 'Symptomatische Hirnblutung (Thrombektomie mittelgroßer/distaler Gefäße)',
    sichLargeCore: 'Symptomatische Hirnblutung (Thrombektomie bei großem Infarktkern)',
    tnkSich: 'Symptomatische Hirnblutung unter Tenecteplase', tnkReperfusion: 'Reperfusion vor der Thrombektomie (Tenecteplase)',
    lateIvt: 'Thrombolyse nach 4.5 h: keine Behinderung nach 90 Tagen', reocclusion: 'Früher erneuter Verschluss',
    distal: 'Embolien in nachgeschaltete Äste', newTerritory: 'Embolien in ein neues Versorgungsgebiet', noReflow: 'No-Reflow-Phänomen',
  },
  range: (typical, low, high) => typical ? `etwa ${typical} (${low}–${high})` : `${low}–${high}`,
  source: 'Quelle',
  warnIvtWindow: (w, d, start, lag) =>
    `Die intravenöse Thrombolyse muss innerhalb von ${w} nach Symptombeginn eingeleitet werden (später nur nach bildgebender Auswahl: WAKE-UP und EXTEND; oder Tenecteplase bis 24 h bei großem Gefäßverschluss ohne Zugang zur Thrombektomie: TRACE-III, chinesische Patienten). Hier wurde der Zeitpunkt der wiederhergestellten Durchblutung gewählt: ${d} nach Symptombeginn. Nach Medikamentengabe öffnet sich die Arterie meist schrittweise innerhalb der folgenden 1–3 h; der Behandlungsbeginn lag somit etwa ${start} nach Symptombeginn, wahrscheinlich außerhalb des Zeitfensters${lag ? `: innerhalb von ${w} nur dann, wenn die Wiedereröffnung mindestens ${lag} dauerte` : ''}.`,
  warnIvtWindowConsensus: (w, cw, d) => `Die intravenöse Thrombolyse ist bei Beginn innerhalb von ${w} nach Symptombeginn Standard; hier beträgt die Zeit bis zur wiederhergestellten Durchblutung ${d}. Bei Basilarisverschluss schlägt die ESO/ESMINT-Leitlinie aufgrund eines Expertenkonsenses eine Anwendung bis ${cw} vor, bei sehr geringer Evidenzsicherheit.`,
  noteIvtWindowFits: (w, d, start, lag) => `Wiederhergestellte Durchblutung ${d} nach Symptombeginn ist mit einem Medikamentenbeginn innerhalb von ${w} vereinbar: Nach Gabe öffnet sich die Arterie meist schrittweise innerhalb der folgenden 1–3 h, sodass der Beginn etwa ${start} nach Symptombeginn lag${lag ? ` — innerhalb von ${w}, wenn die Wiedereröffnung mindestens ${lag} dauerte; später, wenn sie schneller erfolgte` : ''}.`,
  warnIvtTooEarly: (d) => `Wiederhergestellte Durchblutung bereits ${d} nach Symptombeginn ist schneller als mit intravenöser Thrombolyse üblich: Das Medikament wird erst nach Hirnbildgebung gegeben, und die Arterie öffnet sich meist schrittweise innerhalb der folgenden 1–3 h (in der INTERRSeCT-Kohorte wurde die Rekanalisation im Median etwa 2 h nach Behandlungsbeginn beurteilt).`,
  noteBridgingDrugStart: (w, cw, d) => `Auch beim Bridging muss die intravenöse Thrombolyse innerhalb von ${w} nach Symptombeginn eingeleitet werden${cw ? ` (bei Basilarisverschluss schlägt die ESO/ESMINT-Leitlinie aufgrund eines Expertenkonsenses bis ${cw} vor)` : ''}; der hier gewählte Zeitpunkt (${d} nach Symptombeginn) bezeichnet die Wiederherstellung des Blutflusses durch die Thrombektomie und lässt den Zeitpunkt der Medikamentengabe offen.`,
  warnEvtWindow: (w, d) => `Eine Thrombektomie erfolgt üblicherweise nur innerhalb von ${w} nach Symptombeginn (bei geeigneter Bildgebung); hier sind ${d} vergangen.`,
  warnIvtLargeVessel: (site, chance) => `Bei einem großen Gefäßverschluss wie im Bereich ${site} ist eine frühe Rekanalisation durch alleinige intravenöse Thrombolyse selten (${chance} innerhalb von Stunden); meist wird eine Thrombektomie ergänzt.`,
  warnIvtBasilar: (chance) => `Bei Basilarisverschluss ist eine frühe Rekanalisation durch alleinige intravenöse Thrombolyse selten (${chance} innerhalb von Stunden); später beurteilte Fallserien berichten etwa 50%. Die ESO-Leitlinie schlägt nach intravenöser Thrombolyse bei NIHSS ≥ 10 zusätzlich eine Thrombektomie vor.`,
  warnEvtNoTrial: 'Die Thrombektomie bei einem Verschluss an dieser Stelle wurde nicht in randomisierten Studien untersucht (eingeschlossen waren intrakranielle ICA-, M1- und Basilarisverschlüsse); die Entscheidung erfolgt individuell.',
  warnEvtNotApplicable: 'Solche Arterien (perforierende Äste, Arteria ophthalmica oder kommunizierende Arterien) werden nicht mittels Thrombektomie behandelt; Reperfusionstherapie bedeutet hier intravenöse Thrombolyse.',
  warnEvtMevo: 'Verschluss mittelgroßer/distaler Gefäße: In den Studien ESCAPE-MeVO und DISTAL von 2025 verbesserte die Thrombektomie das Ergebnis nicht. Symptomatische Blutungen traten in ESCAPE-MeVO bei 5.4% gegenüber 2.2% und in DISTAL bei 5.9% gegenüber 2.6% auf (von den Autoren als ähnlich beurteilt); nur ESCAPE-MeVO zeigte eine höhere Sterblichkeit. Im Modell gerettetes Gewebe führte in diesen Studien nicht zu besseren Ergebnissen. Ein dominanter proximaler M2-Ast war aus DISTAL ausgeschlossen; hier bleibt die Evidenz unsicher.',
  summaryLabel: 'Behandlung', summaryGrade: (g) => `eTICI ${g}`,
  summaryGradeShown: (shown, chosen) => `eTICI ${shown} (${chosen} außerhalb des embolisierten Astes)`,
  distalGradeNote: (shown, chosen) => `eTICI bewertet den reperfundierten Anteil des gesamten nachgeschalteten Versorgungsgebietes; ein durch ein Fragment verschlossener Ast gilt als nicht reperfundiert. Mit dieser distalen Embolie zeigt die abschließende Angiographie eTICI ${shown}; der oben gewählte Grad (${chosen}) gilt für das übrige Gebiet.`,
  summaryReocclusion: (h) => `erneuter Verschluss nach ${h}`, summaryDistal: (v) => `distale Embolie: ${v}`, summaryNoReflow: (p) => `No-Reflow ${p}`,
};


const cn: TreatmentStrings = {
  title: '治疗细节',
  method: '方式',
  methods: { evt: '取栓', ivt: '静脉血栓溶解', bridging: '两者（桥接）' },
  methodShort: { evt: '取栓', ivt: '静脉血栓溶解', bridging: '桥接（溶栓＋取栓）' },
  grade: '结果（eTICI 再灌注分级）',
  gradeHint: '打通后，原本缺血的区域有多少恢复血流。',
  grades: {
    '3': '3：完全再灌注',
    '2c': '2c：几乎完全（90–99%）',
    '2b': '2b：一半到九成',
    '2b67': '2b67：三分之二到九成（67–89%）',
    '2b50': '2b50：一半到三分之二（50–66%）',
    '2a': '2a：不到一半',
    // Liebeskind 2019, https://doi.org/10.1136/neurintsurg-2018-014127.
    '1': '1：血栓减少，没有远端再灌注',
    '0': '0：没有打通',
  },
  reocclusion: '再阻塞',
  reocclusionNever: '不会',
  reocclusionAfter: (h) => `${h}后`,
  distal: '远端栓塞',
  distalNone: '无',
  distalHint: '取栓时血栓碎片可能卡进下游分支，或跑到原本没受影响的区域（最常是大脑前动脉（ACA））。',
  distalHintIvt: '静脉血栓溶解后血栓也可能碎裂、往远端移动；这里没有附比例，因为已发表的栓塞数字都来自取栓。',
  distalDownstream: '下游分支',
  distalNewTerritory: '新区域（同侧大脑前动脉（ACA））',
  noReflow: '无再流（no-reflow）',
  limitedEvidence: '证据有限',
  noReflowHint: '大血管通了，但部分微血管仍没有血流；比例是估计值。',
  nothingReopened: '这个时间没有可打通的完全阻塞，治疗细节不会改变结果。',
  lacunarNote:
    '腔隙性（单一穿通支）阻塞也用静脉血栓溶解治疗（发作 4.5 小时内开始，和其他缺血性脑卒中相同；不做取栓），但模型没有模拟药物打通这类阻塞，治疗细节不会改变它的病程。',
  evidenceTitle: '文献数字',
  evidenceChoice: '模拟显示的是你选择的结果，不是概率；下面的数字只供对照实际上多常发生。',
  evidenceNone: 'App 内没有这个部位与方式的已发表数据。',
  sites: {
    ica: '颈内动脉',
    m1: '大脑中动脉（MCA） M1',
    m2: '大脑中动脉（MCA） M2',
    distal: '远端分支',
    basilar: '基底动脉',
    vertebral: '椎动脉',
    other: '其他部位',
  },
  rows: {
    success: (site) => `成功打通（${site}）`,
    sich: '症状性脑出血',
    sichMevo: '症状性脑出血（中型／远端血管取栓）',
    sichLargeCore: '症状性脑出血（大核心取栓）',
    tnkSich: '症状性脑出血（tenecteplase）',
    tnkReperfusion: '取栓前已再灌注（tenecteplase）',
    lateIvt: '超过 4.5 小时的血栓溶解：90 天无残疾',
    reocclusion: '早期再阻塞',
    distal: '远端分支栓塞',
    newTerritory: '新区域栓塞',
    noReflow: '无再流',
  },
  range: (typical, low, high) => (typical ? `约 ${typical}（${low}–${high}）` : `${low}–${high}`),
  source: '来源',
  warnIvtWindow: (w, d, start, lag) =>
    `静脉血栓溶解须在发作后 ${w}内开始用药（更晚只在影像筛选后：WAKE-UP、EXTEND 试验；无法取栓的大血管阻塞可在 24 小时内用 tenecteplase：TRACE-III，中国病人）。这里选的是血流恢复的时间：发作后 ${d}；用药后动脉通常在接下来 1–3 小时内才逐渐打通，所以药物是在发作后约 ${start}开始的，多半已超过时限${
      lag ? `：只有动脉在用药后 ${lag}以上才打通，才可能是在 ${w}内开始` : ''
    }。`,
  warnIvtWindowConsensus: (w, cw, d) =>
    `静脉血栓溶解的标准是发作后 ${w}内开始用药；这里是发作后 ${d}（血流恢复的时间）。基底动脉阻塞时，ESO/ESMINT 指引依专家共识建议可用到 ${cw}，但证据确定性非常低。`,
  noteIvtWindowFits: (w, d, start, lag) =>
    `发作后 ${d}血流恢复，和 ${w}内开始用药相符：用药后动脉通常在接下来 1–3 小时内才逐渐打通，所以药物是在发作后约 ${start}开始的${
      lag ? `（动脉在用药后 ${lag}以上才打通时，是在 ${w}内开始；打通得更快，就是超过时限才用药）` : ''
    }。`,
  warnIvtTooEarly: (d) =>
    `发作后才 ${d}就恢复血流，比静脉血栓溶解通常能做到的更快：要先做脑部影像才能用药，用药后动脉通常在接下来 1–3 小时内才逐渐打通（INTERRSeCT 队列研究中，从开始用药到评估再通的中位数约 2 小时）。`,
  noteBridgingDrugStart: (w, cw, d) =>
    `桥接治疗的静脉血栓溶解也须在发作后 ${w}内开始用药${cw ? `（基底动脉阻塞时，ESO/ESMINT 指引依专家共识建议可用到 ${cw}）` : ''}；这里选的时间（发作后 ${d}）是取栓恢复血流的时间，看不出药物是何时给的。`,
  warnEvtWindow: (w, d) => `取栓通常只在发作后 ${w}内（且影像条件合适）进行；这里是发作后 ${d}。`,
  warnIvtLargeVessel: (site, chance) => `${site}这类大血管阻塞，只用静脉血栓溶解在数小时内早期打通的机会低（${chance}），通常会再取栓。`,
  warnIvtBasilar: (chance) =>
    `基底动脉阻塞只用静脉血栓溶解，数小时内早期再通的机会低（${chance}）；较晚判定的病例系列约 50%。ESO 指引建议静脉血栓溶解之后，NIHSS ≥ 10 时再加取栓。`,
  warnEvtNoTrial: '这个阻塞部位的取栓没有经过随机试验验证（试验收的是颅内 ICA、M1 与基底动脉阻塞），只能个别决定。',
  warnEvtNotApplicable: '取栓不处理这类动脉（穿通支、眼动脉或交通动脉）；这里的再灌注治疗是静脉血栓溶解。',
  warnEvtMevo:
    '中型／远端血管阻塞：2025 年 ESCAPE-MeVO 与 DISTAL 试验中取栓没有改善预后；症状性出血在 ESCAPE-MeVO 为 5.4% vs 2.2%、在 DISTAL 为 5.9% vs 2.6%（作者认为相近），只有 ESCAPE-MeVO 的死亡率较高——模型里救回的组织，在试验中并没有变成较好的结果。优势侧近端 M2 没有纳入 DISTAL，仍不确定。',
  summaryLabel: '治疗',
  summaryGrade: (g) => `eTICI ${g}`,
  summaryGradeShown: (shown, chosen) => `eTICI ${shown}（栓塞分支以外为 ${chosen}）`,
  distalGradeNote: (shown, chosen) =>
    `eTICI 依整个下游区域有多少恢复灌注来分级，被碎片塞住的分支算作没有再灌注：有这个远端栓塞，最后的血管造影是 eTICI ${shown}；上面选的分级（${chosen}）是其余区域的结果。`,
  summaryReocclusion: (h) => `${h}后再阻塞`,
  summaryDistal: (v) => `远端栓塞：${v}`,
  summaryNoReflow: (p) => `无再流 ${p}`,
};

const ja: TreatmentStrings = {
  title: '治療の詳細', method: '方法', methods: { evt: '血栓回収療法', ivt: '静脈内血栓溶解療法', bridging: '両方（ブリッジング療法）' },
  methodShort: { evt: '血栓回収', ivt: '静脈内血栓溶解', bridging: 'ブリッジング（血栓溶解＋血栓回収）' },
  grade: '結果（eTICI 再灌流グレード）', gradeHint: '虚血領域のうち、血流が回復した割合。',
  grades: { '3': '3：完全再灌流', '2c': '2c：ほぼ完全（90–99%）', '2b': '2b：半分から9割', '2b67': '2b67：3分の2から9割（67–89%）', '2b50': '2b50：半分から3分の2（50–66%）', '2a': '2a：半分未満', '1': '1：血栓減少、遠位再灌流なし', '0': '0：再開通なし' },
  reocclusion: '再閉塞', reocclusionNever: 'なし', reocclusionAfter: (h) => `${h}後`,
  distal: '遠位塞栓', distalNone: 'なし',
  distalHint: '血栓回収中、血栓片が下流の分枝や、それまで影響のなかった領域（多くは ACA）に流入することがあります。',
  distalHintIvt: '静脈内血栓溶解後も血栓が分裂し遠位へ移動することがあります。公表された塞栓の頻度は血栓回収療法のデータのため、ここでは割合を示しません。',
  distalDownstream: '下流の分枝', distalNewTerritory: '新たな領域（同側 ACA）', noReflow: '無再灌流（no-reflow）', limitedEvidence: '根拠は限定的',
  noReflowHint: '動脈は開通しても、一部の微小循環に血流が戻らない状態です。割合は推定値です。',
  nothingReopened: 'この時点で再開通の対象となる完全閉塞はなく、治療の詳細は結果に影響しません。',
  lacunarNote: 'ラクナ性（単一穿通枝）閉塞にも静脈内血栓溶解療法を行います（他の虚血性脳卒中と同様、発症から 4.5 時間以内に開始；血栓回収は対象外）。ただしモデルでは薬剤によるこの種の閉塞の再開通を再現せず、治療の詳細はその経過に影響しません。',
  evidenceTitle: '公表されたデータ', evidenceChoice: 'シミュレーションは選択した結果を示し、確率を示すものではありません。下の数値は実際の発生頻度の参考です。',
  evidenceNone: 'この部位と方法の公表データはアプリにありません。',
  sites: { ica: '内頸動脈', m1: '中大脳動脈（MCA） M1', m2: '中大脳動脈（MCA） M2', distal: '遠位分枝', basilar: '脳底動脈', vertebral: '椎骨動脈', other: 'その他の部位' },
  rows: { success: (site) => `再開通成功（${site}）`, sich: '症候性頭蓋内出血', sichMevo: '症候性頭蓋内出血（中径／遠位血管の血栓回収）', sichLargeCore: '症候性頭蓋内出血（大きな梗塞コアの血栓回収）', tnkSich: '症候性頭蓋内出血（テネクテプラーゼ）', tnkReperfusion: '血栓回収前の再灌流（テネクテプラーゼ）', lateIvt: '4.5 時間を超えた血栓溶解：90 日時点で障害なし', reocclusion: '早期再閉塞', distal: '下流分枝への塞栓', newTerritory: '新たな領域への塞栓', noReflow: '無再灌流' },
  range: (typical, low, high) => typical ? `約 ${typical}（${low}–${high}）` : `${low}–${high}`, source: '出典',
  warnIvtWindow: (w, d, start, lag) => `静脈内血栓溶解は発症後 ${w}以内に開始します（遅い開始は画像による選択後：WAKE-UP、EXTEND 試験；血栓回収を受けられない大血管閉塞では 24 時間までのテネクテプラーゼ：TRACE-III、中国人患者）。ここで選ぶのは血流回復時点、発症後 ${d}です。薬剤投与後、動脈は通常 1–3 時間かけて徐々に再開通するため、投与開始は発症後約 ${start}で、時間枠を超えている可能性が高いです${lag ? `。${w}以内の開始となるのは、再開通まで ${lag}以上かかった場合のみです` : ''}。`,
  warnIvtWindowConsensus: (w, cw, d) => `静脈内血栓溶解の標準的な開始は発症後 ${w}以内です。ここでは発症後 ${d}に血流が回復します。脳底動脈閉塞では ESO/ESMINT ガイドラインが専門家合意により ${cw}まで提案していますが、根拠の確実性は非常に低いです。`,
  noteIvtWindowFits: (w, d, start, lag) => `発症後 ${d}の血流回復は ${w}以内の投与開始と整合します。投与後、動脈は通常 1–3 時間かけて再開通し、投与開始は発症後約 ${start}です${lag ? `（再開通まで ${lag}以上なら ${w}以内の開始；より速ければ時間枠を超えた開始）` : ''}。`,
  warnIvtTooEarly: (d) => `発症後わずか ${d}での血流回復は、通常の静脈内血栓溶解より速いです。脳画像検査後に投与を開始し、その後通常 1–3 時間かけて再開通します（INTERRSeCT コホートでは投与開始から再開通評価までの中央値は約 2 時間）。`,
  noteBridgingDrugStart: (w, cw, d) => `ブリッジング療法でも静脈内血栓溶解は発症後 ${w}以内に開始します${cw ? `（脳底動脈閉塞では ESO/ESMINT が専門家合意により ${cw}まで提案）` : ''}。選択した時点（発症後 ${d}）は血栓回収による血流回復時点であり、投与開始時点はわかりません。`,
  warnEvtWindow: (w, d) => `血栓回収は通常、画像条件が適切な場合に発症後 ${w}以内で行います。ここでは発症後 ${d}です。`,
  warnIvtLargeVessel: (site, chance) => `${site}などの大血管閉塞では、静脈内血栓溶解のみで数時間以内に早期再開通する割合は低く（${chance}）、通常は血栓回収を追加します。`,
  warnIvtBasilar: (chance) => `脳底動脈閉塞では、静脈内血栓溶解のみの早期再開通は少なく（数時間以内 ${chance}）、より遅い評価の症例集積では約 50% です。ESO は NIHSS ≥ 10 の場合に静脈内血栓溶解後の血栓回収追加を提案しています。`,
  warnEvtNoTrial: 'この部位の血栓回収は無作為化試験で検証されていません（試験対象は頭蓋内 ICA、M1、脳底動脈閉塞）。個別の判断が必要です。',
  warnEvtNotApplicable: 'この種の動脈（穿通枝、眼動脈、交通動脈）は血栓回収の対象外です。ここでの再灌流治療は静脈内血栓溶解療法を指します。',
  warnEvtMevo: '中径／遠位血管閉塞：2025 年 ESCAPE-MeVO と DISTAL 試験で血栓回収による転帰改善は認められませんでした。症候性出血は ESCAPE-MeVO で 5.4% 対 2.2%、DISTAL で 5.9% 対 2.6%（著者は同程度と評価）で、死亡率上昇は ESCAPE-MeVO のみでした。モデルで救済される組織は、試験では転帰改善につながりませんでした。優位な近位 M2 は DISTAL から除外され、未確定です。',
  summaryLabel: '治療', summaryGrade: (g) => `eTICI ${g}`, summaryGradeShown: (shown, chosen) => `eTICI ${shown}（閉塞分枝以外は ${chosen}）`,
  distalGradeNote: (shown, chosen) => `eTICI は下流領域全体の再灌流割合で評価し、血栓片で閉塞した分枝は再灌流なしと数えます。この遠位塞栓がある最終血管造影は eTICI ${shown}で、上で選択したグレード（${chosen}）はその他の領域の結果です。`,
  summaryReocclusion: (h) => `${h}後に再閉塞`, summaryDistal: (v) => `遠位塞栓：${v}`, summaryNoReflow: (p) => `無再灌流 ${p}`,
};
export const TREATMENT_UI: Record<Lang, TreatmentStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };
