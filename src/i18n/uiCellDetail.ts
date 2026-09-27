/**
 * UI strings for the detail shown under the function heat-map when a cell is clicked.
 * Traditional Chinese first, English second.
 */

import type { Lang } from '../anatomy/types';

export interface CellDetailStrings {
  hint: string;
  close: string;
  none: string;
  change: { new: string; worse: string; better: string; same: string };
  resolved: string;
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
  change: { new: '新出現', worse: '加重', better: '減輕', same: '與前一時間點相同' },
  resolved: '已消失',
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
  change: { new: 'new', worse: 'worse', better: 'better', same: 'unchanged' },
  resolved: 'Resolved',
  from: 'From',
  fromEvent: 'Course event',
  compensated: (pct) => `${pct}% compensated`,
  swelling: (mm, ml) => `Midline shift ${mm} mm · swelling ≈ ${ml} mL`,
  nihss: (total) => `NIHSS estimate ${total}; see "NIHSS estimate" below for the items.`,
};

export const CELL_DETAIL_UI: Record<Lang, CellDetailStrings> = { 'zh-TW': zh, en };
