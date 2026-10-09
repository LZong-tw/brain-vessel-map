/**
 * UI strings for the Outcome tab's list of problems after stroke that the lesion site does not
 * determine (population figures, see ui/postStrokeRisks.ts). Traditional Chinese first, English
 * second.
 */

import type { RiskGroupId } from '../anatomy/postStrokeRisks';
import type { Lang } from '../anatomy/types';

export interface RiskStrings {
  title: string;
  /** one line: what the figures are and that the model cannot predict them for this case */
  intro: string;
  /** group headings (only the systems the list uses; `general` has no symptom-system label) */
  groups: Partial<Record<RiskGroupId, string>> & { general: string };
  /** "of stroke survivors" after the figure (unless the risk names its own population) */
  ofSurvivors: string;
  factors: string;
  sources: string;
}

const zh: RiskStrings = {
  title: '中風後的其他問題',
  intro: '這些是中風後的比率（來自系統性回顧、中風登錄與單一世代研究；單一世代的數字會註明是哪些人），模型無法預測這個病例會不會發生；它們不是此病例的症狀，也不算在上面的 NIHSS 或缺損裡。',
  groups: { motor: '動作', cognition: '認知', mood: '情緒與動機', sleep: '睡眠、精神與體力', autonomic: '膀胱控制', general: '感染與再次中風' },
  ofSurvivors: '的中風存活者',
  factors: '相關因素與病灶位置',
  sources: '來源',
};

const en: RiskStrings = {
  title: 'Other problems after stroke',
  intro:
    'These are figures after stroke (from systematic reviews, stroke registries and single cohorts; a single-cohort figure says whom it counts); the model cannot predict whether this case will develop them. They are not symptoms of this case and are not counted in the NIHSS or the deficits above.',
  groups: {
    motor: 'Movement',
    cognition: 'Cognition',
    mood: 'Mood & motivation',
    sleep: 'Sleep, alertness & energy',
    autonomic: 'Bladder control',
    general: 'Infections & recurrent stroke',
  },
  ofSurvivors: 'of stroke survivors',
  factors: 'Risk factors and lesion site',
  sources: 'Sources',
};

const cn: RiskStrings = {
  title: '脑卒中后的其他问题',
  intro: '这些是脑卒中后的发生比例（来自系统综述、脑卒中登记及单一队列研究；单一队列数据会注明研究人群），模型无法预测此病例是否会发生。这些并非此病例的症状，也不计入上方 NIHSS 或功能缺损。',
  groups: { motor: '运动', cognition: '认知', mood: '情绪与动机', sleep: '睡眠、警觉性与精力', autonomic: '膀胱控制', general: '感染与脑卒中复发' },
  ofSurvivors: '的脑卒中存活者', factors: '相关因素与病灶部位', sources: '来源',
};
const de: RiskStrings = {
  title: 'Weitere Probleme nach einem Schlaganfall',
  intro: 'Dies sind Häufigkeiten nach einem Schlaganfall aus systematischen Übersichtsarbeiten, Schlaganfallregistern und einzelnen Kohorten; bei Kohortenangaben wird die untersuchte Gruppe genannt. Das Modell kann ihr Auftreten in diesem Fall nicht vorhersagen. Sie sind keine Symptome dieses Falls und gehen nicht in den NIHSS oder die oben aufgeführten Defizite ein.',
  groups: { motor: 'Motorik', cognition: 'Kognition', mood: 'Stimmung und Motivation', sleep: 'Schlaf, Wachheit und Energie', autonomic: 'Blasenkontrolle', general: 'Infektionen und erneuter Schlaganfall' },
  ofSurvivors: 'der Schlaganfallüberlebenden', factors: 'Risikofaktoren und Läsionsort', sources: 'Quellen',
};
const ja: RiskStrings = {
  title: '脳卒中後のその他の問題',
  intro: 'これらは脳卒中後の発生割合です（系統的レビュー、脳卒中登録、単一コホート研究に基づき、単一コホートでは対象集団を明記）。モデルはこの症例で発生するかを予測できません。この症例の症状ではなく、上記の NIHSS や機能障害には含めません。',
  groups: { motor: '運動', cognition: '認知', mood: '気分と意欲', sleep: '睡眠・覚醒・活力', autonomic: '排尿制御', general: '感染と脳卒中再発' },
  ofSurvivors: 'の脳卒中生存者', factors: '関連因子と病変部位', sources: '出典',
};
export const RISKS_UI: Record<Lang, RiskStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };
