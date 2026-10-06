/**
 * UI strings for the right panel's tabs and its Outcome tab (the end of the course: final
 * infarct, treated vs untreated, lasting deficits, late course). Traditional Chinese first,
 * English second.
 */

import type { BottleneckSite } from '../anatomy/redundancy';
import type { Lang } from '../anatomy/types';
import type { FatalRisk, SurvivalCaveat } from '../engine/cascade';
import type { DeficitGroup } from '../ui/finalOutcome';

export interface OutcomeStrings {
  tabNow: string;
  tabFinal: string;
  tabDetails: string;
  /** the link on the Now tab that opens the Outcome tab */
  finalLink: (ml: string) => string;
  // ── header ──
  when: string;
  /** the index onset is later than 0: where the timeline's 6 months fall on the patient's clock */
  whenOnset: (onset: string, since: string) => string;
  unsettled: (lastChange: string, finalAt: string) => string;
  jump6m: string;
  // ── numbers ──
  finalInfarct: string;
  neuronsLost: string;
  saved: string;
  savedNote: string;
  // ── treated vs untreated ──
  compareTitle: string;
  colTreated: string;
  colUntreated: string;
  rowFinal: string;
  rowNihss3: string;
  rowNihss6: string;
  /** after the NIHSS of a column whose course usually or often ends in death: a survivor's score (Z2-3) */
  ifSurvivesCell: string;
  rowLasting: string;
  /** what the deficit count includes (X1-2) */
  rowLastingNote: string;
  /**
   * a row of the comparison per risk (C4-F1): herniation without decompression usually ends in
   * death; a swollen cerebellum in coma without surgery is life-threatening, with no reliable
   * mortality figure (R6-8, R6-13)
   */
  rowFatal: Record<FatalRisk, string>;
  fatalYes: Record<FatalRisk, string>;
  fatalNo: string;
  items: (n: number) => string;
  compareNote: string;
  treatmentLabel: string;
  noTreatmentHint: string;
  setTreatment: string;
  // ── NIHSS ──
  nihssTitle: string;
  at3m: string;
  at6m: string;
  /** the NIHSS lines when the course usually ends in death (C4-F1) */
  at3mIfSurvives: string;
  at6mIfSurvives: string;
  /** shown next to the NIHSS: what usually happens instead, and that the figures assume survival */
  fatal: Record<FatalRisk, string>;
  /** shown next to the NIHSS: a state with a substantial mortality of its own, the figures a survivor's (Y3-11) */
  survival: Record<SurvivalCaveat, string>;
  // ── deficits ──
  deficitsTitle: string;
  deficitsAt: string;
  groups: Record<DeficitGroup, string>;
  groupNotes: Record<DeficitGroup, string>;
  noDeficits: string;
  tagBilateral: string;
  /** where both sides were cut together (Z2-10) */
  tagBottleneck: (sites: BottleneckSite[]) => string;
  // ── late course ──
  lateTitle: string;
  lateNote: string;
  lateNone: string;
  hydrocephalus: string;
  // ── regions ──
  regionsTitle: string;
  regionsNone: string;
  more: (n: number) => string;
  caveat: string;
}

const zh: OutcomeStrings = {
  tabNow: '此刻',
  tabFinal: '最終',
  tabDetails: '詳細',
  finalLink: (ml) => `最終梗塞 ${ml} mL · 看最終結果 →`,
  when: '這裡看的是病程的結尾，與目前顯示的時間無關：時間軸最後兩站（3 個月、6 個月）的狀態；最終梗塞在最後一次血管變化（阻塞開始或再通）後 6 個月評估。',
  whenOnset: (onset, since) => `主要發作在 ${onset}，所以時間軸上的「6 個月」是發作後約 ${since}。`,
  unsettled: (lastChange, finalAt) =>
    `最後一次血管變化在 ${lastChange}，最終梗塞要到 ${finalAt} 才評估：到時間軸上的 6 個月時，病程還沒有完全穩定，組織與代償都可能繼續變化。`,
  jump6m: '跳到 6 個月',
  finalInfarct: '最終梗塞',
  neuronsLost: '損失神經元（6 個月）',
  saved: '治療救回',
  savedNote: '「治療救回」只計算不治療就會壞死、因治療而活下來的組織。',
  compareTitle: '治療與未治療比較',
  colTreated: '治療後',
  colUntreated: '未治療',
  rowFinal: '最終梗塞',
  rowNihss3: 'NIHSS（3 個月）',
  rowNihss6: 'NIHSS（6 個月）',
  ifSurvivesCell: '（假如存活）',
  rowLasting: '6 個月時的缺損',
  rowLastingNote: '列出的缺損，加上意識下降、目前無法檢查但仍存在的缺損；標示「可能出現」的晚期表現不算在內',
  rowFatal: { herniation: '很可能死亡（疝脫）', posterior_fossa: '危及生命（腦幹受壓、未手術）', basilar: '常會死亡（基底動脈未打通、昏迷）' },
  fatalYes: { herniation: '很可能', posterior_fossa: '是', basilar: '常會' },
  fatalNo: '—',
  items: (n) => `${n} 項`,
  compareNote: '「未治療」是同樣的阻塞、但沒有打通血管的模擬。',
  treatmentLabel: '治療',
  noTreatmentHint: '目前沒有設定治療。在「病例 → 治療」設定再通時間，就能在這裡比較治療與未治療的結果。',
  setTreatment: '設定治療',
  nihssTitle: 'NIHSS 估計',
  at3m: '3 個月',
  at6m: '6 個月',
  at3mIfSurvives: '3 個月（假如存活）',
  at6mIfSurvives: '6 個月（假如存活）',
  fatal: {
    herniation:
      '未減壓的天幕切跡疝脫通常致命：完整中大腦動脈區梗塞的 55 位病人中 78% 因疝脫與腦死而死亡（Hacke 1996）；三個隨機試驗的合併分析中，沒有手術的一年存活率只有 29%（手術 78%；Vahedi 2007）。模型不模擬死亡：下面 3 個月與 6 個月的 NIHSS 是假如病人存活（少數）的結果；存活者多數仍可達 mRS 0–4。',
    posterior_fossa:
      '小腦腫脹壓迫腦幹而昏迷、又沒有枕下減壓，會危及生命；AHA/ASA 2014 建議對惡化的病人做枕下減壓顱骨切除。不手術的死亡率沒有可靠的數字（研究沒有未手術的昏迷對照組）。模型不模擬死亡：下面的 NIHSS 是假如病人存活的結果。',
    basilar:
      '基底動脈阻塞沒有打通、又有木僵、昏迷或意識障礙時，常會致命：兩個取栓試驗中只接受內科治療的對照組，90 天死亡率是 55%（ATTENTION）與 42%（BAOCHE）；一個病例系列的系統性分析中，沒有再通的病人幾乎沒有好的預後（約 2%）。模型不模擬死亡：下面 3 個月與 6 個月的 NIHSS 是假如病人存活的結果。',
  },
  survival: {
    locked_in:
      '閉鎖症候群的死亡率不低：早年 139 例的文獻回顧中報告的死亡率約 60%，血管性病因的存活預後比非血管性的差，呼吸與肺部照護不可少。這不是「通常致命」，但下面 3 個月與 6 個月的 NIHSS 是假如病人存活的結果，不是確定的結局。',
    bilateral_medulla:
      '雙側延髓內側梗塞的預後差：38 例的系統性回顧中，住院死亡率 23.8%、需要他人照顧 61.9%（呼吸衰竭是風險之一）。下面 3 個月與 6 個月的 NIHSS 是假如病人存活的結果，不是確定的結局。',
  },
  deficitsTitle: '留下的缺損',
  deficitsAt: '時間點',
  groups: { marked: '仍明顯', partial: '部分代償', largely: '大致代償' },
  groupNotes: {
    marked: '其他路徑接手不到 1/4，或這個功能沒有備援、是晚期才出現的後果',
    partial: '其他路徑已接手約 1/4 到 6 成',
    largely: '其他路徑已接手 6 成以上，只剩輕微的缺損',
  },
  noDeficits: '沒有留下症狀。',
  tagBilateral: '兩側受損',
  tagBottleneck: (sites) =>
    sites.includes('midbrain') && sites.includes('pons') ? '大腦腳與腹側橋腦瓶頸' : sites.includes('midbrain') ? '大腦腳瓶頸' : '腹側橋腦瓶頸',
  lateTitle: '長期併發症與後期病程',
  lateNote: '發作一週後才開始，或到 6 個月仍持續的變化。',
  lateNone: '沒有一週後的後續變化。',
  hydrocephalus: '6 個月時仍有阻塞性水腦（腦室擴大）。',
  regionsTitle: '最終梗塞的腦區',
  regionsNone: '沒有腦區留下梗塞。',
  more: (n) => `還有 ${n} 個腦區`,
  caveat:
    '這些數字來自依組織與神經路徑推算的示意模型，不是預後，數值大小也沒有經過臨床驗證。真實的結果差異很大（後循環中風尤其如此），取決於側枝循環、併發症、復健與照護決定。',
};

const en: OutcomeStrings = {
  tabNow: 'Now',
  tabFinal: 'Outcome',
  tabDetails: 'Details',
  finalLink: (ml) => `Final infarct ${ml} mL · See the outcome →`,
  when: "This is the end of the course, whatever time is displayed: the state at the timeline's last two stops (3 and 6 months); the final infarct is evaluated 6 months after the last change of the vessels (an occlusion starting or reopening).",
  whenOnset: (onset, since) => `The index onset is at ${onset}, so "6 months" on the timeline is about ${since} after onset.`,
  unsettled: (lastChange, finalAt) =>
    `The last change of the vessels is at ${lastChange} and the final infarct is evaluated at ${finalAt}: at 6 months on the timeline the course has not fully settled — tissue and compensation may still change.`,
  jump6m: 'Jump to 6 months',
  finalInfarct: 'Final infarct',
  neuronsLost: 'Neurons lost (6 months)',
  saved: 'Saved by treatment',
  savedNote: '"Saved by treatment" counts only tissue that would have died without treatment and survived because of it.',
  compareTitle: 'Treated vs untreated',
  colTreated: 'Treated',
  colUntreated: 'Untreated',
  rowFinal: 'Final infarct',
  rowNihss3: 'NIHSS (3 months)',
  rowNihss6: 'NIHSS (6 months)',
  ifSurvivesCell: ' (if the patient survives)',
  rowLasting: 'Deficits at 6 months',
  rowLastingNote: 'The deficits listed, plus those still there that cannot be examined at the patient’s level of consciousness; late signs listed as “Possible” are not counted',
  rowFatal: {
    herniation: 'Death likely (herniation)',
    posterior_fossa: 'Life-threatening (brainstem compression, no surgery)',
    basilar: 'Often fatal (basilar not reopened, coma)',
  },
  fatalYes: { herniation: 'likely', posterior_fossa: 'yes', basilar: 'often' },
  fatalNo: '—',
  items: (n) => `${n}`,
  compareNote: '"Untreated" is the same occlusion simulated without reopening the artery.',
  treatmentLabel: 'Treatment',
  noTreatmentHint: 'No treatment is set. Set a recanalisation time in Case → Treatment to compare the treated and untreated outcome here.',
  setTreatment: 'Set a treatment',
  nihssTitle: 'NIHSS estimate',
  at3m: '3 months',
  at6m: '6 months',
  at3mIfSurvives: '3 months (if the patient survives)',
  at6mIfSurvives: '6 months (if the patient survives)',
  fatal: {
    herniation:
      'Transtentorial herniation without decompression is usually fatal: of 55 patients with complete MCA-territory infarction 78% died of herniation and brain death (Hacke 1996); in the pooled analysis of three randomised trials 1-year survival without surgery was only 29% (78% with it; Vahedi 2007). The model does not represent death: the 3- and 6-month NIHSS below are those of a patient who survives (a minority); most survivors still reach mRS 0–4.',
    posterior_fossa:
      'Coma from a swollen cerebellum compressing the brainstem, without suboccipital decompression, is life-threatening; the AHA/ASA statement (2014) recommends suboccipital decompressive craniectomy for patients who deteriorate. There is no reliable figure for mortality without surgery (the studies had no untreated comatose control group). The model does not represent death: the NIHSS below is that of a patient who survives.',
    basilar:
      'A basilar-artery occlusion that is not reopened, with stupor, coma or a disorder of consciousness, is often fatal: in the control arms of two thrombectomy trials, with medical care alone, 90-day mortality was 55% (ATTENTION) and 42% (BAOCHE); in a systematic analysis of case series a good outcome without recanalisation was close to nil (about 2%). The model does not represent death: the 3- and 6-month NIHSS below are those of a patient who survives.',
  },
  survival: {
    locked_in:
      'Locked-in syndrome carries a substantial mortality: the reported mortality was about 60% in an early review of 139 cases, with a worse outlook for survival when the cause was vascular than when it was not, and pulmonary care is essential. It is not "usually fatal", but the 3- and 6-month NIHSS below are those of a patient who survives, not a certain outcome.',
    bilateral_medulla:
      'Bilateral medial medullary infarction has a poor outcome: in a systematic review of 38 cases inpatient mortality was 23.8% and dependency 61.9% (respiratory failure is one of the risks). The 3- and 6-month NIHSS below are those of a patient who survives, not a certain outcome.',
  },
  deficitsTitle: 'Lasting deficits',
  deficitsAt: 'Time point',
  groups: { marked: 'Still marked', partial: 'Partly compensated', largely: 'Largely compensated' },
  groupNotes: {
    marked: 'Other pathways have taken over less than a quarter, or the function has no backup or is a late consequence',
    partial: 'Other pathways have taken over about a quarter to 60 %',
    largely: 'Other pathways have taken over 60 % or more; only a mild deficit is left',
  },
  noDeficits: 'No lasting symptoms.',
  tagBilateral: 'both sides',
  tagBottleneck: (sites) =>
    sites.includes('midbrain') && sites.includes('pons')
      ? 'peduncle and ventral-pons bottleneck'
      : sites.includes('midbrain')
        ? 'midbrain-peduncle bottleneck'
        : 'ventral-pons bottleneck',
  lateTitle: 'Long-term complications and late course',
  lateNote: 'Changes that start a week or more after onset, or are still present at 6 months.',
  lateNone: 'Nothing further happens after the first week.',
  hydrocephalus: 'Obstructive hydrocephalus (enlarged ventricles) is still present at 6 months.',
  regionsTitle: 'Regions infarcted at the end',
  regionsNone: 'No region is left infarcted.',
  more: (n) => `${n} more regions`,
  caveat:
    'These numbers come from an illustrative model of tissue and pathways, not a prognosis, and their magnitudes are not clinically validated. Real outcomes vary widely (especially after posterior-circulation strokes) with collaterals, complications, rehabilitation and care decisions.',
};

export const OUTCOME_UI: Record<Lang, OutcomeStrings> = { 'zh-TW': zh, en };
