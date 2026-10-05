/**
 * UI strings for the Outcome tab's list of common problems after stroke that the lesion site does
 * not determine (population figures, see ui/postStrokeRisks.ts). Traditional Chinese first,
 * English second.
 */

import type { Lang, SymptomSystem } from '../anatomy/types';

export interface RiskStrings {
  title: string;
  /** one line: what the figures are and that the model cannot predict them for this case */
  intro: string;
  /** group headings (only the systems the list uses) */
  groups: Partial<Record<SymptomSystem, string>>;
  /** "of stroke survivors" after the figure */
  ofSurvivors: string;
  factors: string;
  sources: string;
}

const zh: RiskStrings = {
  title: '中風後常見的其他問題',
  intro: '這些是中風存活者整體的比率（來自系統性回顧），模型無法預測這個病例會不會發生；它們不是此病例的症狀，也不算在上面的 NIHSS 或缺損裡。',
  groups: { cognition: '認知', mood: '情緒與動機', sleep: '睡眠、精神與體力' },
  ofSurvivors: '的中風存活者',
  factors: '相關因素與病灶位置',
  sources: '來源',
};

const en: RiskStrings = {
  title: 'Other common problems after stroke',
  intro:
    'These are figures for stroke survivors as a whole (from systematic reviews); the model cannot predict whether this case will develop them. They are not symptoms of this case and are not counted in the NIHSS or the deficits above.',
  groups: { cognition: 'Cognition', mood: 'Mood & motivation', sleep: 'Sleep, alertness & energy' },
  ofSurvivors: 'of stroke survivors',
  factors: 'Risk factors and lesion site',
  sources: 'Sources',
};

export const RISKS_UI: Record<Lang, RiskStrings> = { 'zh-TW': zh, en };
