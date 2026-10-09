/**
 * UI strings for the detail shown under the function heat-map when a cell is clicked.
 * Traditional Chinese first, English second.
 */

import type { Lang } from '../anatomy/types';

export interface CellDetailStrings {
  hint: string;
  close: string;
  none: string;
  change: { new: string; worse: string; better: string; same: string; again: string };
  resolved: string;
  /**
   * present, but cannot be examined now (X1-2; at the patient's level of consciousness, in a blind
   * patient or in akinetic mutism: Y2-14, Y2-15), given the heading for the reason
   */
  unexaminable: (label: string) => string;
  from: string;
  fromEvent: string;
  compensated: (pct: number) => string;
  swelling: (mm: string, ml: string) => string;
  nihss: (total: number) => string;
}

const zh: CellDetailStrings = {
  hint: '點任一格，可在下方看到那個時間點的症狀、來自哪些腦區，以及和前一個時間點相比的變化。',
  close: '關閉',
  none: '這個時間點沒有這個系統的症狀。',
  change: { new: '新出現', worse: '加重', better: '減輕', same: '與前一時間點相同', again: '又可以檢查' },
  resolved: '已消失',
  unexaminable: (label) => `${label}（不是消失）`,
  from: '來自',
  fromEvent: '連鎖反應',
  compensated: (pct) => `已代償 ${pct}%`,
  swelling: (mm, ml) => `中線偏移 ${mm} mm · 腫脹約 ${ml} mL`,
  nihss: (total) => `NIHSS 估計 ${total} 分；各項分數見下方「NIHSS 估計」。`,
};

const en: CellDetailStrings = {
  hint: 'Click any cell to see below which symptoms were present at that time, which regions they come from, and how they changed since the previous time point.',
  close: 'Close',
  none: 'No symptoms in this system at this time.',
  change: { new: 'new', worse: 'worse', better: 'better', same: 'unchanged', again: 'can be examined again' },
  resolved: 'Resolved',
  unexaminable: (label) => `${label} (not resolved)`,
  from: 'From',
  fromEvent: 'Course event',
  compensated: (pct) => `${pct}% compensated`,
  swelling: (mm, ml) => `Midline shift ${mm} mm · swelling ≈ ${ml} mL`,
  nihss: (total) => `NIHSS estimate ${total}; see "NIHSS estimate" below for the items.`,
};

const cn: CellDetailStrings = {
  hint: '点击任意单元格，可查看该时间点的症状、来源脑区及相较于前一时间点的变化。',
  close: '关闭', none: '该时间点此系统无症状。',
  change: { new: '新出现', worse: '加重', better: '减轻', same: '与前一时间点相同', again: '可再次检查' },
  resolved: '已消失', unexaminable: (label) => `${label}（并非消失）`, from: '来源', fromEvent: '病程事件',
  compensated: (pct) => `已代偿 ${pct}%`, swelling: (mm, ml) => `中线移位 ${mm} mm · 肿胀约 ${ml} mL`,
  nihss: (total) => `NIHSS 估计 ${total} 分；各项评分见下方“NIHSS 估计”。`,
};
const de: CellDetailStrings = {
  hint: 'Eine Zelle auswählen, um Symptome, betroffene Hirnregionen und Veränderungen gegenüber dem vorherigen Zeitpunkt anzuzeigen.',
  close: 'Schließen', none: 'Zu diesem Zeitpunkt keine Symptome in diesem System.',
  change: { new: 'neu', worse: 'verstärkt', better: 'gebessert', same: 'unverändert', again: 'erneut untersuchbar' },
  resolved: 'Abgeklungen', unexaminable: (label) => `${label} (nicht abgeklungen)`, from: 'Ursprung', fromEvent: 'Ereignis im Verlauf',
  compensated: (pct) => `${pct}% kompensiert`, swelling: (mm, ml) => `Mittellinienverlagerung ${mm} mm · Schwellung ≈ ${ml} mL`,
  nihss: (total) => `NIHSS-Schätzung ${total}; Einzelwerte siehe unten unter „NIHSS-Schätzung“.`,
};
const ja: CellDetailStrings = {
  hint: 'セルを選ぶと、その時点の症状、原因となる脳領域、前の時点からの変化を下に表示します。',
  close: '閉じる', none: 'この時点で、この系統の症状はありません。',
  change: { new: '新規出現', worse: '増悪', better: '改善', same: '変化なし', again: '再び診察可能' },
  resolved: '消失', unexaminable: (label) => `${label}（消失ではない）`, from: '原因領域', fromEvent: '経過中のイベント',
  compensated: (pct) => `${pct}% 代償`, swelling: (mm, ml) => `正中偏位 ${mm} mm · 腫脹 約 ${ml} mL`,
  nihss: (total) => `NIHSS 推定 ${total} 点；項目別の点数は下の「NIHSS 推定」を参照。`,
};
export const CELL_DETAIL_UI: Record<Lang, CellDetailStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };
