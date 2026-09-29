/**
 * UI strings for the right panel's tabs and its Outcome tab (the end of the course: final
 * infarct, treated vs untreated, lasting deficits, late course). Traditional Chinese first,
 * English second.
 */

import type { Lang } from '../anatomy/types';
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
  rowLasting: string;
  items: (n: number) => string;
  compareNote: string;
  treatmentLabel: string;
  noTreatmentHint: string;
  setTreatment: string;
  // ── NIHSS ──
  nihssTitle: string;
  at3m: string;
  at6m: string;
  // ── deficits ──
  deficitsTitle: string;
  deficitsAt: string;
  groups: Record<DeficitGroup, string>;
  groupNotes: Record<DeficitGroup, string>;
  noDeficits: string;
  tagBilateral: string;
  tagBottleneck: string;
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
  rowLasting: '6 個月時的缺損',
  items: (n) => `${n} 項`,
  compareNote: '「未治療」是同樣的阻塞、但沒有打通血管的模擬。',
  treatmentLabel: '治療',
  noTreatmentHint: '目前沒有設定治療。在「病例 → 治療」設定再通時間，就能在這裡比較治療與未治療的結果。',
  setTreatment: '設定治療',
  nihssTitle: 'NIHSS 估計',
  at3m: '3 個月',
  at6m: '6 個月',
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
  tagBottleneck: '腹側橋腦瓶頸',
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
  rowLasting: 'Deficits at 6 months',
  items: (n) => `${n}`,
  compareNote: '"Untreated" is the same occlusion simulated without reopening the artery.',
  treatmentLabel: 'Treatment',
  noTreatmentHint: 'No treatment is set. Set a recanalisation time in Case → Treatment to compare the treated and untreated outcome here.',
  setTreatment: 'Set a treatment',
  nihssTitle: 'NIHSS estimate',
  at3m: '3 months',
  at6m: '6 months',
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
  tagBottleneck: 'ventral-pons bottleneck',
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
