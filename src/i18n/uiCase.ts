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

export const CASE_UI: Record<Lang, CaseStrings> = { 'zh-TW': zh, en };
