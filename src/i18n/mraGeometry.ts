import type { Lang } from '../anatomy/types';

export const MRA_GEOMETRY: Record<Lang, { notice: string; source: string }> = {
  en: { notice: '3 communicating vessels: MRA-derived shapes; placement unvalidated; distal branches authored.', source: 'TopCoW MRA 008 · CC BY-NC 4.0' },
  'zh-TW': { notice: '3 條交通動脈：形狀源自 MRA；位置尚未驗證；遠端分支為人工繪製。', source: 'TopCoW MRA 008 資料來源 · CC BY-NC 4.0' },
  'zh-CN': { notice: '3 条交通动脉：形状源自 MRA；位置尚未验证；远端分支为人工绘制。', source: 'TopCoW MRA 008 数据来源 · CC BY-NC 4.0' },
  de: { notice: '3 kommunizierende Arterien: Formen aus MRA; Platzierung nicht validiert; distale Äste manuell erstellt.', source: 'TopCoW MRA 008 · Datenquelle · CC BY-NC 4.0' },
  ja: { notice: '3 本の交通動脈：形状は MRA 由来。配置は未検証。遠位分枝は手作業で作成。', source: 'TopCoW MRA 008 データ出典 · CC BY-NC 4.0' },
};
