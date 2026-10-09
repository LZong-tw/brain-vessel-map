/**
 * UI strings for the case (病例) tab — conditions before onset, occlusion events and treatment —
 * the templates hint and the one-line case summary above the timeline.
 * Traditional Chinese first, English second.
 */

import type { Lang } from '../anatomy/types';
import type { CollateralGrade } from '../engine/hemodynamics';

export interface CaseStrings {
  /** card titles */
  conditionsTitle: string;
  eventsTitle: string;
  treatmentTitle: string;
  /** conditions summary */
  collateralShort: Record<CollateralGrade, string>;
  mapShort: (mmHg: number) => string;
  noVariants: string;
  variantCount: (n: number) => string;
  /** nested toggle over the variants list */
  variantsToggle: (n: number) => string;
  /** events summary */
  notSet: string;
  joinVessels: string;
  /** more than three vessels: the first two, then the total */
  moreVessels: (firstTwo: string, total: number) => string;
  /** qualifiers after a vessel name, joined by `tagSep` inside `tagged` */
  complete: string;
  staged: string;
  phases: (n: number) => string;
  from: (at: string) => string;
  reopensAfter: (d: string) => string;
  tagged: (name: string, tags: string) => string;
  tagSep: string;
  /** no occlusion but the mean arterial pressure is low enough to simulate */
  hypoperfusion: string;
  /** treatment summary */
  untreated: string;
  noReperfusion: string;
  reopenedAt: (at: string) => string;
  /** an attempt that reopened nothing (eTICI 0) */
  attemptedAt: (at: string) => string;
  /** a treatment given for a lacunar occlusion, which the model does not reopen (U2-8) */
  lacunarTreatedAt: (method: string, at: string) => string;
  /** a treatment time when nothing complete is occluded (U2-8) */
  nothingToReopenAt: (at: string) => string;
  /** reperfusion time with its details in brackets (summary line) */
  withDetails: (when: string, details: string) => string;
  decompressionShort: string;
  /** summary line */
  occludedLine: (events: string) => string;
  emptyLine: string;
  caseLabel: string;
  /** events card */
  emptyEvents: string;
  startFromTemplate: string;
  addFromVessels: string;
  stackTemplate: string;
  addVessel: string;
  combineHint: string;
  embolusToggle: string;
  /** templates tab */
  templatesHint: string;
}

const zh: CaseStrings = {
  conditionsTitle: '發病前條件',
  eventsTitle: '阻塞事件',
  treatmentTitle: '治療',
  collateralShort: { good: '側枝良好', moderate: '側枝中等', poor: '側枝差' },
  mapShort: (v) => `平均動脈壓 ${v}`,
  noVariants: '無解剖變異',
  variantCount: (n) => `${n} 項變異`,
  variantsToggle: (n) => (n ? `解剖變異（已選 ${n} 項）` : '解剖變異（未選）'),
  notSet: '尚未設定',
  joinVessels: ' + ',
  moreVessels: (first, n) => `${first} 等 ${n} 條`,
  complete: '完全阻塞',
  staged: '分段',
  phases: (n) => `分段：${n} 個階段`,
  from: (at) => `${at}起`,
  reopensAfter: (d) => `${d}後自行再通`,
  tagged: (name, tags) => `${name}（${tags}）`,
  tagSep: '，',
  hypoperfusion: '無阻塞（全腦低灌流）',
  untreated: '未治療',
  noReperfusion: '未再通',
  reopenedAt: (at) => `${at}再通`,
  attemptedAt: (at) => `${at}嘗試、未再通`,
  lacunarTreatedAt: (method, at) => `${at}${method}（模型不模擬它對腔隙性阻塞的效果）`,
  nothingToReopenAt: (at) => `${at}治療：沒有可打通的阻塞`,
  withDetails: (when, details) => `${when}（${details}）`,
  decompressionShort: '必要時減壓手術',
  occludedLine: (events) => `${events} 阻塞`,
  emptyLine: '尚未設定阻塞 — 從範本開始',
  caseLabel: '病例',
  emptyEvents: '還沒有阻塞的血管。',
  startFromTemplate: '從範本開始',
  addFromVessels: '在血管列表加入',
  stackTemplate: '疊加範本',
  addVessel: '加入血管',
  combineHint: '可以疊加範本或再加入血管，組合多條血管的阻塞（例如基底動脈中段＋右小腦後下動脈）。',
  embolusToggle: '放一顆栓子（隨機）',
  templatesHint: '點範本會取代目前的病例；按「疊加」則把範本的阻塞加到目前的病例上。',
};

const en: CaseStrings = {
  conditionsTitle: 'Before onset',
  eventsTitle: 'Occlusion events',
  treatmentTitle: 'Treatment',
  collateralShort: { good: 'good collaterals', moderate: 'moderate collaterals', poor: 'poor collaterals' },
  mapShort: (v) => `MAP ${v}`,
  noVariants: 'no variants',
  variantCount: (n) => (n === 1 ? '1 variant' : `${n} variants`),
  variantsToggle: (n) => (n ? `Anatomical variants (${n} selected)` : 'Anatomical variants (none)'),
  notSet: 'Not set',
  joinVessels: ' + ',
  moreVessels: (first, n) => `${first} + ${n - 2} more`,
  complete: 'complete',
  staged: 'staged',
  phases: (n) => `staged: ${n} phases`,
  from: (at) => `from ${at}`,
  reopensAfter: (d) => `reopens after ${d}`,
  tagged: (name, tags) => `${name} (${tags})`,
  tagSep: ', ',
  hypoperfusion: 'No occlusion (global hypoperfusion)',
  untreated: 'untreated',
  noReperfusion: 'no recanalisation',
  reopenedAt: (at) => `reopened at ${at}`,
  attemptedAt: (at) => `attempted at ${at}, not reopened`,
  lacunarTreatedAt: (method, at) => `${method} at ${at} (not simulated for a lacunar occlusion)`,
  nothingToReopenAt: (at) => `treatment at ${at}: nothing to reopen`,
  withDetails: (when, details) => `${when} (${details})`,
  decompressionShort: 'decompression if needed',
  occludedLine: (events) => `Occluded: ${events}`,
  emptyLine: 'No occlusion set — start from a template',
  caseLabel: 'Case',
  emptyEvents: 'No artery is blocked yet.',
  startFromTemplate: 'Start from a template',
  addFromVessels: 'Add from the vessel list',
  stackTemplate: 'Add a template',
  addVessel: 'Add a vessel',
  combineHint: 'Add a template or another vessel to combine occlusions (e.g. mid-basilar + right PICA).',
  embolusToggle: 'Release an embolus (random)',
  templatesHint: 'Choosing a template replaces the current case; its "Add" button adds its occlusions to the case instead.',
};

const cn: CaseStrings = {
  conditionsTitle: '发病前条件', eventsTitle: '闭塞事件', treatmentTitle: '治疗',
  collateralShort: { good: '侧支循环良好', moderate: '侧支循环中等', poor: '侧支循环差' },
  mapShort: (v) => `平均动脉压 ${v}`, noVariants: '无解剖变异',
  variantCount: (n) => `${n} 项变异`, variantsToggle: (n) => n ? `解剖变异（已选 ${n} 项）` : '解剖变异（未选）',
  notSet: '尚未设置', joinVessels: ' + ', moreVessels: (first, n) => `${first} 等 ${n} 条`,
  complete: '完全闭塞', staged: '分阶段', phases: (n) => `分阶段：${n} 个阶段`,
  from: (at) => `从${at}起`, reopensAfter: (d) => `${d}后自行再通`, tagged: (name, tags) => `${name}（${tags}）`, tagSep: '，',
  hypoperfusion: '无闭塞（全脑低灌注）', untreated: '未治疗', noReperfusion: '未再通',
  reopenedAt: (at) => `${at}再通`, attemptedAt: (at) => `${at}尝试治疗，未再通`,
  lacunarTreatedAt: (method, at) => `${at}${method}（模型不模拟其对腔隙性闭塞的效果）`,
  nothingToReopenAt: (at) => `${at}治疗：没有可再通的闭塞`, withDetails: (when, details) => `${when}（${details}）`,
  decompressionShort: '必要时行减压手术', occludedLine: (events) => `${events} 闭塞`,
  emptyLine: '尚未设置闭塞 — 从模板开始', caseLabel: '病例', emptyEvents: '尚无闭塞的动脉。',
  startFromTemplate: '从模板开始', addFromVessels: '从血管列表添加', stackTemplate: '叠加模板', addVessel: '添加血管',
  combineHint: '可叠加模板或添加血管，组合多条血管的闭塞（例如基底动脉中段＋右侧小脑下后动脉（PICA））。',
  embolusToggle: '释放一枚栓子（随机）', templatesHint: '选择模板会替换当前病例；点击“叠加”可将模板的闭塞添加到当前病例。',
};

const de: CaseStrings = {
  conditionsTitle: 'Vor Erkrankungsbeginn', eventsTitle: 'Gefäßverschlüsse', treatmentTitle: 'Behandlung',
  collateralShort: { good: 'gute Kollateralen', moderate: 'mäßige Kollateralen', poor: 'schlechte Kollateralen' },
  mapShort: (v) => `Mittlerer arterieller Druck ${v}`, noVariants: 'keine anatomischen Varianten',
  variantCount: (n) => n === 1 ? '1 Variante' : `${n} Varianten`,
  variantsToggle: (n) => n ? `Anatomische Varianten (${n} ausgewählt)` : 'Anatomische Varianten (keine)',
  notSet: 'Nicht eingestellt', joinVessels: ' + ', moreVessels: (first, n) => `${first} + ${n - 2} weitere`,
  complete: 'vollständig', staged: 'mehrphasig', phases: (n) => `${n} Phasen`, from: (at) => `ab ${at}`,
  reopensAfter: (d) => `spontane Rekanalisation nach ${d}`, tagged: (name, tags) => `${name} (${tags})`, tagSep: ', ',
  hypoperfusion: 'Kein Verschluss (globale Hypoperfusion)', untreated: 'unbehandelt', noReperfusion: 'keine Rekanalisation',
  reopenedAt: (at) => `Rekanalisation bei ${at}`, attemptedAt: (at) => `Behandlungsversuch bei ${at}, ohne Rekanalisation`,
  lacunarTreatedAt: (method, at) => `${method} bei ${at} (Wirkung bei lakunärem Verschluss nicht simuliert)`,
  nothingToReopenAt: (at) => `Behandlung bei ${at}: kein rekanalisierbarer Verschluss`,
  withDetails: (when, details) => `${when} (${details})`, decompressionShort: 'Dekompression bei Bedarf',
  occludedLine: (events) => `Verschlossen: ${events}`, emptyLine: 'Kein Verschluss eingestellt — mit einer Vorlage beginnen',
  caseLabel: 'Fall', emptyEvents: 'Noch keine Arterie verschlossen.', startFromTemplate: 'Mit einer Vorlage beginnen',
  addFromVessels: 'Aus der Gefäßliste hinzufügen', stackTemplate: 'Vorlage hinzufügen', addVessel: 'Gefäß hinzufügen',
  combineHint: 'Vorlage oder Gefäß hinzufügen, um Verschlüsse zu kombinieren (z. B. mittlere A. basilaris + rechte PICA).',
  embolusToggle: 'Embolus freisetzen (zufällig)',
  templatesHint: 'Die Auswahl einer Vorlage ersetzt den aktuellen Fall; „Hinzufügen“ ergänzt deren Verschlüsse im aktuellen Fall.',
};

const ja: CaseStrings = {
  conditionsTitle: '発症前の条件', eventsTitle: '閉塞イベント', treatmentTitle: '治療',
  collateralShort: { good: '側副血行良好', moderate: '側副血行中等度', poor: '側副血行不良' },
  mapShort: (v) => `平均動脈圧 ${v}`, noVariants: '解剖学的変異なし', variantCount: (n) => `${n} 件の変異`,
  variantsToggle: (n) => n ? `解剖学的変異（${n} 件選択）` : '解剖学的変異（未選択）',
  notSet: '未設定', joinVessels: ' + ', moreVessels: (first, n) => `${first} など ${n} 本`,
  complete: '完全閉塞', staged: '段階的', phases: (n) => `${n} 段階`, from: (at) => `${at}から`,
  reopensAfter: (d) => `${d}後に自然再開通`, tagged: (name, tags) => `${name}（${tags}）`, tagSep: '、',
  hypoperfusion: '閉塞なし（全脳低灌流）', untreated: '未治療', noReperfusion: '再開通なし',
  reopenedAt: (at) => `${at}に再開通`, attemptedAt: (at) => `${at}に治療を試行、再開通なし`,
  lacunarTreatedAt: (method, at) => `${at}に${method}（ラクナ性閉塞への効果はモデルで再現しない）`,
  nothingToReopenAt: (at) => `${at}に治療：再開通の対象となる閉塞なし`, withDetails: (when, details) => `${when}（${details}）`,
  decompressionShort: '必要時に減圧術', occludedLine: (events) => `閉塞：${events}`, emptyLine: '閉塞未設定 — テンプレートから開始',
  caseLabel: '症例', emptyEvents: '閉塞した動脈はまだありません。', startFromTemplate: 'テンプレートから開始',
  addFromVessels: '血管一覧から追加', stackTemplate: 'テンプレートを追加', addVessel: '血管を追加',
  combineHint: 'テンプレートや血管を追加して複数の閉塞を組み合わせられます（例：脳底動脈中部＋右後下小脳動脈（PICA））。',
  embolusToggle: '塞栓を放出（ランダム）', templatesHint: 'テンプレートを選ぶと現在の症例を置き換えます。「追加」ではその閉塞を現在の症例に追加します。',
};
export const CASE_UI: Record<Lang, CaseStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };
