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
  /**
   * the final infarct is evaluated after the timeline's 6-month stop (by `lastChange`, the time of
   * the last change of the vessels, as the evaluation is 6 months after it) and what the Outcome
   * shows still changes in between: the infarct, the deficits or both (V3-13)
   */
  unsettled: (lastChange: string, changes: { infarct: boolean; deficits: boolean }) => string;
  /** … and nothing it shows changes in between: the exact offset (V3-13) */
  settledLate: (lastChange: string) => string;
  jump6m: string;
  // ── numbers ──
  finalInfarct: string;
  /** the spinal cord's part of the final infarct (W3-8) */
  finalCordNote: (ml: string) => string;
  neuronsLost: string;
  /** when the spinal cord is part of the infarct: the estimate is the brain's (W3-8) */
  neuronsLostBrain: string;
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
  /**
   * shown instead of `fatal.herniation` when both hemispheres are destroyed (Z3-12): the figures of
   * one hemisphere do not apply, and a survivor stays in a disorder of consciousness
   */
  fatalBilateral: string;
  /** both hemispheres swelling alike herniate downward (central herniation, V1-4): not one hemisphere's figures */
  fatalCentral: string;
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
  unsettled: (lastChange, c) =>
    `最終梗塞在最後一次血管變化後 6 個月評估；最後一次變化在 ${lastChange}，所以比時間軸上的 6 個月晚 ${lastChange}。到時間軸上的 6 個月時病程還沒有穩定：${
      c.infarct && c.deficits ? '梗塞還在擴大，缺損也還在變化' : c.infarct ? '梗塞還在擴大' : '缺損還在變化'
    }。`,
  settledLate: (lastChange) =>
    `最終梗塞在最後一次血管變化後 6 個月評估；最後一次變化在 ${lastChange}，所以比時間軸上的 6 個月晚 ${lastChange}。這段期間梗塞與列出的缺損（連同嚴重度與分組）都不變。`,
  jump6m: '跳到 6 個月',
  finalInfarct: '最終梗塞',
  finalCordNote: (ml) => `其中上段頸髓約 ${ml} mL`,
  neuronsLost: '損失神經元（6 個月）',
  neuronsLostBrain: '損失的腦神經元（6 個月）',
  saved: '治療救回',
  savedNote: '「治療救回」只計算不治療就會壞死、因治療而活下來的組織，包括不治療時腫脹造成疝脫、壓迫而梗塞的區域。',
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
  fatalBilateral:
    '兩側大腦半球大多梗塞（至少兩側的中大腦動脈區大多梗塞），又有未減壓的天幕切跡疝脫：死亡是通常的結局。單側完整中大腦動脈區梗塞的數字（55 位病人中 78% 死亡：Hacke 1996；未手術的一年存活率 29%：Vahedi 2007）講的是一側，不是兩側；兩側中大腦動脈同時梗塞通常後果嚴重。兩側大腦半球都被破壞的存活者不會恢復覺察，會停留在植物人狀態，最好也只是最小意識狀態（Adams 2000；Multi-Society Task Force 1994）。模型不模擬死亡：下面 3 個月與 6 個月的 NIHSS 是這樣一位存活者的結果。',
  fatalCentral:
    '兩側大腦半球一起腫脹、把腦往下擠的中央型天幕切跡疝脫，未減壓時通常致命。常引用的數字（完整中大腦動脈區梗塞的 55 位病人中 78% 因疝脫與腦死而死亡：Hacke 1996；未手術的一年存活率 29%：Vahedi 2007）講的是一側，不是兩側；兩側同時大範圍梗塞通常後果嚴重。模型不模擬死亡：下面 3 個月與 6 個月的 NIHSS 是假如病人存活的結果。',
  survival: {
    bilateral_hemispheres:
      '兩側大腦半球大多梗塞，至少兩側的中大腦動脈區大多梗塞，連同大腦皮質和視丘之間很大一部分的白質連結。兩側大腦半球都被破壞的存活者不會恢復覺察，會停留在意識障礙：植物人狀態，最好也只是最小意識狀態（Adams 2000）；非外傷造成的植物人狀態超過 3 個月後恢復極為罕見，多數病人的餘命約 2–5 年（Multi-Society Task Force 1994）。下面 3 個月與 6 個月的 NIHSS 是這樣一位存活者的結果，不是確定的結局。',
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
  unsettled: (lastChange, c) =>
    `The final infarct is evaluated 6 months after the last change of the vessels, which is at ${lastChange}: ${lastChange} after the timeline's 6-month stop. At that stop the course has not settled: ${
      c.infarct && c.deficits ? 'the infarct is still growing and the deficits are still changing' : c.infarct ? 'the infarct is still growing' : 'the deficits are still changing'
    }.`,
  settledLate: (lastChange) =>
    `The final infarct is evaluated 6 months after the last change of the vessels, which is at ${lastChange}: ${lastChange} after the timeline's 6-month stop. In between, the infarct and the deficits listed (with their severity and group) stay the same.`,
  jump6m: 'Jump to 6 months',
  finalInfarct: 'Final infarct',
  finalCordNote: (ml) => `of which ${ml} mL in the upper cervical cord`,
  neuronsLost: 'Neurons lost (6 months)',
  neuronsLostBrain: 'Brain neurons lost (6 months)',
  saved: 'Saved by treatment',
  savedNote: '"Saved by treatment" counts only tissue that would have died without treatment and survived because of it, including the territories that a herniation of the untreated swelling would have infarcted.',
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
  fatalBilateral:
    'Both hemispheres are mostly infarcted (at least both MCA territories), with transtentorial herniation and no decompression: death is the usual end. The figures for complete MCA-territory infarction of one hemisphere (78% of 55 patients died: Hacke 1996; 1-year survival 29% without surgery: Vahedi 2007) describe one hemisphere, not both; simultaneous infarction of both MCA territories is usually devastating. A survivor of the destruction of both hemispheres does not regain awareness: he or she stays in a vegetative or at best a minimally conscious state (Adams 2000; Multi-Society Task Force 1994). The model does not represent death: the 3- and 6-month NIHSS below are those of such a survivor.',
  fatalCentral:
    'Central transtentorial herniation, both hemispheres swelling together and pushing the brain down, is usually fatal without decompression. The figures usually quoted (78% of 55 patients with complete MCA-territory infarction died of herniation and brain death: Hacke 1996; 1-year survival 29% without surgery: Vahedi 2007) describe one hemisphere, not both; extensive infarction of both hemispheres at once is usually devastating. The model does not represent death: the 3- and 6-month NIHSS below are those of a patient who survives.',
  survival: {
    bilateral_hemispheres:
      'Both hemispheres are mostly infarcted, at least both MCA territories, with much of the white matter that links the cortex to the thalamus. A survivor of the destruction of both hemispheres does not regain awareness: he or she stays in a disorder of consciousness, a vegetative or at best a minimally conscious state (Adams 2000); recovery from a vegetative state of non-traumatic cause after 3 months is exceedingly rare, and life expectancy is mostly 2–5 years (Multi-Society Task Force 1994). The 3- and 6-month NIHSS below are those of such a survivor, not a certain outcome.',
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

const de: OutcomeStrings = {
  tabNow: 'Jetzt', tabFinal: 'Ergebnis', tabDetails: 'Details',
  finalLink: (ml) => `Endgültiger Infarkt ${ml} mL · Ergebnis ansehen →`,
  when: 'Hier wird unabhängig vom angezeigten Zeitpunkt das Ende des Verlaufs gezeigt: der Zustand an den letzten beiden Stationen der Zeitleiste (3 und 6 Monate). Der endgültige Infarkt wird 6 Monate nach der letzten Gefäßveränderung (Beginn eines Verschlusses oder Rekanalisation) beurteilt.',
  whenOnset: (onset, since) => `Der maßgebliche Symptombeginn liegt bei ${onset}; „6 Monate“ auf der Zeitleiste entspricht daher etwa ${since} nach Symptombeginn.`,
  unsettled: (lastChange, c) => `Der endgültige Infarkt wird 6 Monate nach der letzten Gefäßveränderung bei ${lastChange} beurteilt: ${lastChange} nach der 6-Monats-Station der Zeitleiste. Dort ist der Verlauf noch nicht stabil: ${c.infarct && c.deficits ? 'der Infarkt wächst noch und die Defizite verändern sich noch' : c.infarct ? 'der Infarkt wächst noch' : 'die Defizite verändern sich noch'}.`,
  settledLate: (lastChange) => `Der endgültige Infarkt wird 6 Monate nach der letzten Gefäßveränderung bei ${lastChange} beurteilt: ${lastChange} nach der 6-Monats-Station der Zeitleiste. In der Zwischenzeit bleiben der Infarkt und die aufgeführten Defizite mit Schweregrad und Gruppe unverändert.`,
  jump6m: 'Zu 6 Monaten springen', finalInfarct: 'Endgültiger Infarkt',
  finalCordNote: (ml) => `davon ${ml} mL im oberen Halsmark`,
  neuronsLost: 'Verlorene Neuronen (6 Monate)', neuronsLostBrain: 'Verlorene Hirnneuronen (6 Monate)',
  saved: 'Durch Behandlung gerettet',
  savedNote: '„Durch Behandlung gerettet“ zählt nur Gewebe, das ohne Behandlung abgestorben wäre und durch sie überlebt hat, einschließlich der Gebiete, die durch eine Herniation bei unbehandelter Schwellung infarziert wären.',
  compareTitle: 'Behandelt gegenüber unbehandelt', colTreated: 'Behandelt', colUntreated: 'Unbehandelt',
  rowFinal: 'Endgültiger Infarkt', rowNihss3: 'NIHSS (3 Monate)', rowNihss6: 'NIHSS (6 Monate)',
  ifSurvivesCell: ' (bei Überleben)', rowLasting: 'Defizite nach 6 Monaten',
  rowLastingNote: 'Aufgeführte Defizite sowie weiterhin bestehende Defizite, die aufgrund der Bewusstseinslage nicht untersucht werden können; als „Möglich“ gekennzeichnete Spätfolgen werden nicht gezählt',
  rowFatal: { herniation: 'Tod wahrscheinlich (Herniation)', posterior_fossa: 'Lebensbedrohlich (Hirnstammkompression, keine Operation)', basilar: 'Häufig tödlich (Basilaris nicht rekanalisiert, Koma)' },
  fatalYes: { herniation: 'wahrscheinlich', posterior_fossa: 'ja', basilar: 'häufig' }, fatalNo: '—', items: (n) => `${n} Befunde`,
  compareNote: '„Unbehandelt“ simuliert denselben Verschluss ohne Wiedereröffnung der Arterie.', treatmentLabel: 'Behandlung',
  noTreatmentHint: 'Es ist keine Behandlung eingestellt. Unter Fall → Behandlung einen Rekanalisationszeitpunkt wählen, um hier die Ergebnisse mit und ohne Behandlung zu vergleichen.',
  setTreatment: 'Behandlung einstellen', nihssTitle: 'NIHSS-Schätzung', at3m: '3 Monate', at6m: '6 Monate',
  at3mIfSurvives: '3 Monate (bei Überleben)', at6mIfSurvives: '6 Monate (bei Überleben)',
  fatal: {
    herniation: 'Eine transtentorielle Herniation ohne Dekompression verläuft meist tödlich: Von 55 Patienten mit vollständigem MCA-Territorialinfarkt starben 78% an Herniation und Hirntod (Hacke 1996). In der gepoolten Analyse dreier randomisierter Studien betrug das 1-Jahres-Überleben ohne Operation nur 29% (mit Operation 78%; Vahedi 2007). Das Modell bildet den Tod nicht ab: Die folgenden NIHSS-Werte nach 3 und 6 Monaten beziehen sich auf einen überlebenden Patienten (eine Minderheit); die meisten Überlebenden erreichen weiterhin mRS 0–4.',
    posterior_fossa: 'Ein Koma durch ein geschwollenes Kleinhirn mit Hirnstammkompression ist ohne subokzipitale Dekompression lebensbedrohlich. Die AHA/ASA-Stellungnahme (2014) empfiehlt eine subokzipitale dekompressive Kraniektomie bei klinischer Verschlechterung. Für die Sterblichkeit ohne Operation gibt es keine verlässliche Zahl (die Studien hatten keine unbehandelte komatöse Kontrollgruppe). Das Modell bildet den Tod nicht ab: Der folgende NIHSS-Wert bezieht sich auf einen überlebenden Patienten.',
    basilar: 'Ein nicht rekanalisierter Basilarisverschluss mit Sopor, Koma oder Bewusstseinsstörung verläuft häufig tödlich: In den Kontrollarmen zweier Thrombektomiestudien betrug die 90-Tage-Sterblichkeit unter alleiniger medizinischer Behandlung 55% (ATTENTION) und 42% (BAOCHE). In einer systematischen Analyse von Fallserien war ein gutes Ergebnis ohne Rekanalisation nahezu ausgeschlossen (etwa 2%). Das Modell bildet den Tod nicht ab: Die folgenden NIHSS-Werte nach 3 und 6 Monaten beziehen sich auf einen überlebenden Patienten.',
  },
  fatalBilateral: 'Beide Hemisphären sind überwiegend infarziert (mindestens beide MCA-Versorgungsgebiete), mit transtentorieller Herniation und ohne Dekompression: Der Verlauf endet gewöhnlich tödlich. Die Zahlen zum vollständigen MCA-Territorialinfarkt einer Hemisphäre (78% von 55 Patienten starben: Hacke 1996; 1-Jahres-Überleben ohne Operation 29%: Vahedi 2007) beschreiben eine Hemisphäre, nicht beide. Gleichzeitige Infarkte beider MCA-Gebiete sind meist verheerend. Wer die Zerstörung beider Hemisphären überlebt, erlangt kein bewusstes Erleben zurück und verbleibt im vegetativen oder bestenfalls minimal bewussten Zustand (Adams 2000; Multi-Society Task Force 1994). Das Modell bildet den Tod nicht ab: Die folgenden NIHSS-Werte nach 3 und 6 Monaten beziehen sich auf einen solchen Überlebenden.',
  fatalCentral: 'Eine zentrale transtentorielle Herniation, bei der beide Hemisphären zugleich anschwellen und das Gehirn nach unten verdrängen, verläuft ohne Dekompression meist tödlich. Die üblicherweise genannten Zahlen (78% von 55 Patienten mit vollständigem MCA-Territorialinfarkt starben an Herniation und Hirntod: Hacke 1996; 1-Jahres-Überleben ohne Operation 29%: Vahedi 2007) beschreiben eine Hemisphäre, nicht beide. Gleichzeitige ausgedehnte Infarkte beider Hemisphären sind meist verheerend. Das Modell bildet den Tod nicht ab: Die folgenden NIHSS-Werte nach 3 und 6 Monaten beziehen sich auf einen überlebenden Patienten.',
  survival: {
    bilateral_hemispheres: 'Beide Hemisphären sind überwiegend infarziert, mindestens beide MCA-Versorgungsgebiete einschließlich großer Anteile der weißen Substanz zwischen Kortex und Thalamus. Wer die Zerstörung beider Hemisphären überlebt, erlangt kein bewusstes Erleben zurück und verbleibt in einer Bewusstseinsstörung, im vegetativen oder bestenfalls minimal bewussten Zustand (Adams 2000). Eine Erholung aus einem vegetativen Zustand nichttraumatischer Ursache nach 3 Monaten ist äußerst selten; die Lebenserwartung beträgt meist 2–5 Jahre (Multi-Society Task Force 1994). Die folgenden NIHSS-Werte nach 3 und 6 Monaten beziehen sich auf einen solchen Überlebenden und sind kein gesicherter Verlauf.',
    locked_in: 'Das Locked-in-Syndrom geht mit erheblicher Sterblichkeit einher: Eine frühe Übersicht über 139 Fälle berichtete etwa 60% Sterblichkeit, mit schlechterer Überlebensprognose bei vaskulärer als bei nichtvaskulärer Ursache; die Atemwegspflege ist wesentlich. Es ist nicht „meist tödlich“, doch die folgenden NIHSS-Werte nach 3 und 6 Monaten beziehen sich auf einen überlebenden Patienten und sind kein gesicherter Verlauf.',
    bilateral_medulla: 'Ein beidseitiger medialer Medulla-oblongata-Infarkt hat eine ungünstige Prognose: In einer systematischen Übersicht über 38 Fälle betrugen die Krankenhaussterblichkeit 23.8% und die Pflegeabhängigkeit 61.9% (zu den Risiken gehört Atemversagen). Die folgenden NIHSS-Werte nach 3 und 6 Monaten beziehen sich auf einen überlebenden Patienten und sind kein gesicherter Verlauf.',
  },
  deficitsTitle: 'Bleibende Defizite', deficitsAt: 'Zeitpunkt',
  groups: { marked: 'Weiterhin ausgeprägt', partial: 'Teilweise kompensiert', largely: 'Weitgehend kompensiert' },
  groupNotes: { marked: 'Andere Bahnen haben weniger als ein Viertel übernommen, oder die Funktion hat keinen Ersatzweg bzw. ist eine Spätfolge', partial: 'Andere Bahnen haben etwa ein Viertel bis 60 % übernommen', largely: 'Andere Bahnen haben 60 % oder mehr übernommen; nur ein leichtes Defizit bleibt' },
  noDeficits: 'Keine bleibenden Symptome.', tagBilateral: 'beidseitig',
  tagBottleneck: (sites) => sites.includes('midbrain') && sites.includes('pons') ? 'Engpass in Hirnschenkeln und ventraler Brücke' : sites.includes('midbrain') ? 'Engpass in den Hirnschenkeln' : 'Engpass in der ventralen Brücke',
  lateTitle: 'Langzeitkomplikationen und später Verlauf', lateNote: 'Veränderungen, die eine Woche oder später nach Symptombeginn einsetzen oder nach 6 Monaten noch bestehen.',
  lateNone: 'Nach der ersten Woche treten keine weiteren Veränderungen auf.', hydrocephalus: 'Nach 6 Monaten besteht weiterhin ein obstruktiver Hydrozephalus (erweiterte Ventrikel).',
  regionsTitle: 'Am Ende infarzierte Regionen',
  regionsNone: 'Keine Region bleibt infarziert.', more: (n) => `${n} weitere Regionen`,
  caveat: 'Diese Zahlen stammen aus einem anschaulichen Modell von Gewebe und Nervenbahnen, sind keine Prognose und wurden in ihrer Größenordnung nicht klinisch validiert. Tatsächliche Ergebnisse variieren stark (besonders bei Schlaganfällen der hinteren Zirkulation) mit Kollateralen, Komplikationen, Rehabilitation und Versorgungsentscheidungen.',
};


const cn: OutcomeStrings = {
  tabNow: '此刻',
  tabFinal: '最终',
  tabDetails: '详细',
  finalLink: (ml) => `最终梗死 ${ml} mL · 看最终结果 →`,
  when: '这里看的是病程的结尾，与目前显示的时间无关：时间轴最后两站（3 个月、6 个月）的状态；最终梗死在最后一次血管变化（阻塞开始或再通）后 6 个月评估。',
  whenOnset: (onset, since) => `主要发作在 ${onset}，所以时间轴上的「6 个月」是发作后约 ${since}。`,
  unsettled: (lastChange, c) =>
    `最终梗死在最后一次血管变化后 6 个月评估；最后一次变化在 ${lastChange}，所以比时间轴上的 6 个月晚 ${lastChange}。到时间轴上的 6 个月时病程还没有稳定：${
      c.infarct && c.deficits ? '梗死还在扩大，缺损也还在变化' : c.infarct ? '梗死还在扩大' : '缺损还在变化'
    }。`,
  settledLate: (lastChange) =>
    `最终梗死在最后一次血管变化后 6 个月评估；最后一次变化在 ${lastChange}，所以比时间轴上的 6 个月晚 ${lastChange}。这段期间梗死与列出的缺损（连同严重度与分组）都不变。`,
  jump6m: '跳到 6 个月',
  finalInfarct: '最终梗死',
  finalCordNote: (ml) => `其中上段颈髓约 ${ml} mL`,
  neuronsLost: '损失神经元（6 个月）',
  neuronsLostBrain: '损失的脑神经元（6 个月）',
  saved: '治疗救回',
  savedNote: '「治疗救回」只计算不治疗就会坏死、因治疗而活下来的组织，包括不治疗时肿胀造成脑疝、压迫而梗死的区域。',
  compareTitle: '治疗与未治疗比较',
  colTreated: '治疗后',
  colUntreated: '未治疗',
  rowFinal: '最终梗死',
  rowNihss3: 'NIHSS（3 个月）',
  rowNihss6: 'NIHSS（6 个月）',
  ifSurvivesCell: '（假如存活）',
  rowLasting: '6 个月时的缺损',
  rowLastingNote: '列出的缺损，加上意识下降、目前无法检查但仍存在的缺损；标示「可能出现」的晚期表现不算在内',
  rowFatal: { herniation: '很可能死亡（脑疝）', posterior_fossa: '危及生命（脑干受压、未手术）', basilar: '常会死亡（基底动脉未打通、昏迷）' },
  fatalYes: { herniation: '很可能', posterior_fossa: '是', basilar: '常会' },
  fatalNo: '—',
  items: (n) => `${n} 项`,
  compareNote: '「未治疗」是同样的阻塞、但没有打通血管的模拟。',
  treatmentLabel: '治疗',
  noTreatmentHint: '目前没有设定治疗。在「病例 → 治疗」设定再通时间，就能在这里比较治疗与未治疗的结果。',
  setTreatment: '设定治疗',
  nihssTitle: 'NIHSS 估计',
  at3m: '3 个月',
  at6m: '6 个月',
  at3mIfSurvives: '3 个月（假如存活）',
  at6mIfSurvives: '6 个月（假如存活）',
  fatal: {
    herniation:
      '未减压的天幕切迹脑疝通常致命：完整大脑中动脉（MCA）区梗死的 55 位病人中 78% 因脑疝与脑死而死亡（Hacke 1996）；三个随机试验的合并分析中，没有手术的一年存活率只有 29%（手术 78%；Vahedi 2007）。模型不模拟死亡：下面 3 个月与 6 个月的 NIHSS 是假如病人存活（少数）的结果；存活者多数仍可达 mRS 0–4。',
    posterior_fossa:
      '小脑肿胀压迫脑干而昏迷、又没有枕下减压，会危及生命；AHA/ASA 2014 建议对恶化的病人做枕下减压颅骨切除。不手术的死亡率没有可靠的数字（研究没有未手术的昏迷对照组）。模型不模拟死亡：下面的 NIHSS 是假如病人存活的结果。',
    basilar:
      '基底动脉阻塞没有打通、又有昏睡、昏迷或意识障碍时，常会致命：两个取栓试验中只接受内科治疗的对照组，90 天死亡率是 55%（ATTENTION）与 42%（BAOCHE）；一个病例系列的系统性分析中，没有再通的病人几乎没有好的预后（约 2%）。模型不模拟死亡：下面 3 个月与 6 个月的 NIHSS 是假如病人存活的结果。',
  },
  fatalBilateral:
    '两侧大脑半球大多梗死（至少两侧的大脑中动脉（MCA）区大多梗死），又有未减压的天幕切迹脑疝：死亡是通常的结局。单侧完整大脑中动脉区梗死的数字（55 位病人中 78% 死亡：Hacke 1996；未手术的一年存活率 29%：Vahedi 2007）讲的是一侧，不是两侧；两侧大脑中动脉同时梗死通常后果严重。两侧大脑半球都被破坏的存活者不会恢复觉察，会停留在植物人状态，最好也只是最小意识状态（Adams 2000；Multi-Society Task Force 1994）。模型不模拟死亡：下面 3 个月与 6 个月的 NIHSS 是这样一位存活者的结果。',
  fatalCentral:
    '两侧大脑半球一起肿胀、把脑往下挤的中央型天幕切迹脑疝，未减压时通常致命。常引用的数字（完整大脑中动脉（MCA）区梗死的 55 位病人中 78% 因脑疝与脑死而死亡：Hacke 1996；未手术的一年存活率 29%：Vahedi 2007）讲的是一侧，不是两侧；两侧同时大范围梗死通常后果严重。模型不模拟死亡：下面 3 个月与 6 个月的 NIHSS 是假如病人存活的结果。',
  survival: {
    bilateral_hemispheres:
      '两侧大脑半球大多梗死，至少两侧的大脑中动脉（MCA）区大多梗死，连同大脑皮质和丘脑之间很大一部分的白质连结。两侧大脑半球都被破坏的存活者不会恢复觉察，会停留在意识障碍：植物人状态，最好也只是最小意识状态（Adams 2000）；非外伤造成的植物人状态超过 3 个月后恢复极为罕见，多数病人的余命约 2–5 年（Multi-Society Task Force 1994）。下面 3 个月与 6 个月的 NIHSS 是这样一位存活者的结果，不是确定的结局。',
    locked_in:
      '闭锁综合征的死亡率不低：早年 139 例的文献回顾中报告的死亡率约 60%，血管性病因的存活预后比非血管性的差，呼吸与肺部照护不可少。这不是「通常致命」，但下面 3 个月与 6 个月的 NIHSS 是假如病人存活的结果，不是确定的结局。',
    bilateral_medulla:
      '双侧延髓内侧梗死的预后差：38 例的系统性回顾中，住院死亡率 23.8%、需要他人照顾 61.9%（呼吸衰竭是风险之一）。下面 3 个月与 6 个月的 NIHSS 是假如病人存活的结果，不是确定的结局。',
  },
  deficitsTitle: '留下的缺损',
  deficitsAt: '时间点',
  groups: { marked: '仍明显', partial: '部分代偿', largely: '大致代偿' },
  groupNotes: {
    marked: '其他路径接手不到 1/4，或这个功能没有备援、是晚期才出现的后果',
    partial: '其他路径已接手约 1/4 到 6 成',
    largely: '其他路径已接手 6 成以上，只剩轻微的缺损',
  },
  noDeficits: '没有留下症状。',
  tagBilateral: '两侧受损',
  tagBottleneck: (sites) =>
    sites.includes('midbrain') && sites.includes('pons') ? '大脑脚与腹侧脑桥瓶颈' : sites.includes('midbrain') ? '大脑脚瓶颈' : '腹侧脑桥瓶颈',
  lateTitle: '长期并发症与后期病程',
  lateNote: '发作一周后才开始，或到 6 个月仍持续的变化。',
  lateNone: '没有一周后的后续变化。',
  hydrocephalus: '6 个月时仍有阻塞性脑积水（脑室扩大）。',
  regionsTitle: '最终梗死的脑区',
  regionsNone: '没有脑区留下梗死。',
  more: (n) => `还有 ${n} 个脑区`,
  caveat:
    '这些数字来自依组织与神经路径推算的示意模型，不是预后，数值大小也没有经过临床验证。真实的结果差异很大（后循环脑卒中尤其如此），取决于侧支循环、并发症、康复与照护决定。',
};

const ja: OutcomeStrings = {
  tabNow: '現在', tabFinal: '最終結果', tabDetails: '詳細', finalLink: (ml) => `最終梗塞 ${ml} mL · 最終結果を見る →`,
  when: '表示中の時点に関係なく、病程の結末を示します。タイムライン最後の 2 時点（3、6 か月）の状態で、最終梗塞は最後の血管変化（閉塞開始または再開通）から 6 か月後に評価します。',
  whenOnset: (onset, since) => `主要な発症時点は ${onset}で、タイムラインの「6 か月」は発症後約 ${since}です。`,
  unsettled: (lastChange, c) => `最終梗塞は最後の血管変化から 6 か月後に評価します。最後の変化は ${lastChange}で、タイムラインの 6 か月より ${lastChange}後です。その 6 か月時点では経過は未安定です：${c.infarct && c.deficits ? '梗塞が拡大し、機能障害も変化中' : c.infarct ? '梗塞が拡大中' : '機能障害が変化中'}。`,
  settledLate: (lastChange) => `最終梗塞は最後の血管変化から 6 か月後に評価します。最後の変化は ${lastChange}で、タイムラインの 6 か月より ${lastChange}後です。その間、梗塞と表示された機能障害（重症度と分類を含む）は変化しません。`,
  jump6m: '6 か月へ移動', finalInfarct: '最終梗塞', finalCordNote: (ml) => `うち上部頸髄 約 ${ml} mL`,
  neuronsLost: '失われたニューロン（6 か月）', neuronsLostBrain: '失われた脳のニューロン（6 か月）', saved: '治療による救済',
  savedNote: '治療による救済は、無治療なら壊死し、治療により生存した組織のみを数えます。無治療の腫脹による脳ヘルニア・圧迫で梗塞する領域も含みます。',
  compareTitle: '治療あり／なしの比較', colTreated: '治療あり', colUntreated: '治療なし', rowFinal: '最終梗塞',
  rowNihss3: 'NIHSS（3 か月）', rowNihss6: 'NIHSS（6 か月）', ifSurvivesCell: '（生存した場合）', rowLasting: '6 か月時点の機能障害',
  rowLastingNote: '表示された障害と、意識低下で診察できなくても残存する障害を含みます。「出現の可能性」と表示する遅発症状は数えません',
  rowFatal: { herniation: '死亡の可能性が高い（脳ヘルニア）', posterior_fossa: '生命の危険（脳幹圧迫、手術なし）', basilar: 'しばしば致死的（脳底動脈未再開通、昏睡）' },
  fatalYes: { herniation: '可能性が高い', posterior_fossa: 'あり', basilar: 'しばしば' }, fatalNo: '—', items: (n) => `${n} 項目`,
  compareNote: '「治療なし」は同じ閉塞で動脈を再開通させないシミュレーションです。', treatmentLabel: '治療',
  noTreatmentHint: '治療未設定です。「症例 → 治療」で再開通時点を設定すると、治療あり／なしの結果を比較できます。', setTreatment: '治療を設定',
  nihssTitle: 'NIHSS 推定', at3m: '3 か月', at6m: '6 か月', at3mIfSurvives: '3 か月（生存した場合）', at6mIfSurvives: '6 か月（生存した場合）',
  fatal: {
    herniation: '減圧しないテント切痕ヘルニアは通常致死的です。MCA 領域全体の梗塞患者 55 人中 78% が脳ヘルニアと脳死で死亡（Hacke 1996）。3 無作為化試験の統合解析では非手術群の 1 年生存率は 29%（手術群 78%；Vahedi 2007）。モデルは死亡を再現しません。下の 3、6 か月の NIHSS は少数の生存者を仮定した結果で、生存者の多くは mRS 0–4 に達し得ます。',
    posterior_fossa: '小脳腫脹による脳幹圧迫で昏睡し、後頭下減圧術を行わない場合は生命の危険があります。AHA/ASA 2014 は悪化する患者に後頭下減圧開頭術を推奨しています。手術しない場合の死亡率には信頼できる数値がありません（非手術の昏睡対照群がないため）。モデルは死亡を再現せず、下の NIHSS は生存を仮定しています。',
    basilar: '脳底動脈閉塞が再開通せず、昏迷・昏睡・意識障害を伴うとしばしば致死的です。2 血栓回収試験の内科治療対照群の 90 日死亡率は 55%（ATTENTION）と 42%（BAOCHE）。症例集積の系統的解析では未再開通患者の良好転帰は約 2% のみでした。モデルは死亡を再現せず、下の 3、6 か月の NIHSS は生存を仮定しています。',
  },
  fatalBilateral: '両大脳半球の大部分（少なくとも両側 MCA 領域の大部分）が梗塞し、減圧されないテント切痕ヘルニアを伴う場合、通常の結末は死亡です。片側 MCA 全領域梗塞の数値（55 人中 78% 死亡：Hacke 1996；非手術の 1 年生存率 29%：Vahedi 2007）は両側には適用できません。両側同時の MCA 梗塞は通常重篤です。両半球が破壊された生存者は意識内容を回復せず、植物状態、よくても最小意識状態にとどまります（Adams 2000；Multi-Society Task Force 1994）。モデルは死亡を再現せず、下の NIHSS はこのような生存者の結果です。',
  fatalCentral: '両半球の腫脹が脳を下方に押す中心性テント切痕ヘルニアは、減圧しないと通常致死的です。よく引用される数値（MCA 全領域梗塞 55 人中 78% が脳ヘルニア・脳死で死亡：Hacke 1996；非手術の 1 年生存率 29%：Vahedi 2007）は片側のデータであり、両側ではありません。両側の広範梗塞は通常重篤です。モデルは死亡を再現せず、下の NIHSS は生存を仮定しています。',
  survival: {
    bilateral_hemispheres: '両大脳半球の大部分、少なくとも両側 MCA 領域の大部分と皮質・視床間の白質結合が梗塞しています。両半球が破壊された生存者は意識内容を回復せず、植物状態、よくても最小意識状態にとどまります（Adams 2000）。非外傷性植物状態が 3 か月を超えた後の回復は極めてまれで、多くの余命は約 2–5 年です（Multi-Society Task Force 1994）。下の NIHSS はこのような生存者の結果で、確実な結末ではありません。',
    locked_in: '閉じ込め症候群の死亡率は低くありません。初期の 139 例の文献レビューでは約 60% で、血管性原因の生存予後は非血管性より不良でした。呼吸・肺の管理が不可欠です。「通常致死的」ではありませんが、下の NIHSS は生存を仮定した結果で、確実な結末ではありません。',
    bilateral_medulla: '両側内側延髄梗塞の予後は不良です。38 例の系統的レビューでは院内死亡率 23.8%、介助が必要な割合 61.9%（呼吸不全もリスク）。下の NIHSS は生存を仮定した結果で、確実な結末ではありません。',
  },
  deficitsTitle: '残存する機能障害', deficitsAt: '時点', groups: { marked: '依然明らか', partial: '部分的代償', largely: 'おおむね代償' },
  groupNotes: { marked: '他の経路による代償が 1/4 未満、代替経路がない機能、または遅発の後遺症', partial: '他の経路が約 1/4 から 6 割を代償', largely: '他の経路が 6 割以上を代償し、軽い障害のみ残存' },
  noDeficits: '症状の残存なし。', tagBilateral: '両側損傷', tagBottleneck: (sites) => sites.includes('midbrain') && sites.includes('pons') ? '大脳脚と橋腹側のボトルネック' : sites.includes('midbrain') ? '大脳脚のボトルネック' : '橋腹側のボトルネック',
  lateTitle: '長期合併症と後期経過', lateNote: '発症 1 週以降に始まる、または 6 か月まで続く変化。', lateNone: '1 週以降の変化なし。',
  hydrocephalus: '6 か月時点で閉塞性水頭症（脳室拡大）が残存。', regionsTitle: '最終梗塞の脳領域', regionsNone: '梗塞が残る脳領域なし。', more: (n) => `他 ${n} 領域`,
  caveat: 'これらの数値は組織と神経経路に基づく模式モデルの推定であり、予後ではなく、数値は臨床検証されていません。実際の結果には大きな差があり（特に後方循環脳卒中）、側副血行、合併症、リハビリテーション、ケアの判断に依存します。',
};
export const OUTCOME_UI: Record<Lang, OutcomeStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };
