/**
 * UI strings for occlusion schedules (when an occlusion begins, reopens by itself or turns from
 * a stenosis into an occlusion). Traditional Chinese first, English second.
 */

import type { Lang } from '../anatomy/types';
import type { OcclusionStatus } from '../engine/schedule';

export interface ScheduleStrings {
  /** heading of the timing controls in the vessel details */
  timing: string;
  timingHint: string;
  phase: (k: number) => string;
  starts: string;
  reopens: string;
  never: string;
  /** reopening option: "after 5 min" */
  after: (d: string) => string;
  untilNext: string;
  severity: string;
  /** "later becomes a complete occlusion at …" */
  laterOcclusion: string;
  add: string;
  removePhase: string;
  status: Record<OcclusionStatus, string>;
  /** a phase that ended because the vessel's next phase began */
  progressed: string;
  /** occlusion chips: "from 3 days", "0–5 min" */
  chipFrom: (a: string) => string;
  chipRange: (a: string, b: string) => string;
  /** results: the clock of the oedema and cascade when the schedule has a later index event */
  indexOnset: (at: string) => string;
  /** treatment select */
  treatAfterFirst: string;
  treatAfter: (what: string, at: string) => string;
  plus: (d: string) => string;
  /** timeline marker legend */
  markOnset: string;
  markReopen: string;
  markTreatment: string;
}

const zh: ScheduleStrings = {
  timing: '時程',
  timingHint: '時間以時間軸為準（0 = 第一個事件）。治療只會打通當下存在的完全阻塞；狹窄與之後才發生的阻塞不受影響。',
  phase: (k) => `第 ${k} 階段`,
  starts: '開始',
  reopens: '自行再通',
  never: '不會',
  after: (d) => `${d}後`,
  untilNext: '直到下一階段',
  severity: '程度',
  laterOcclusion: '之後變成完全阻塞於',
  add: '加入',
  removePhase: '移除此階段',
  status: { pending: '尚未發生', active: '進行中', reopened: '已自行再通', treated: '已治療再通' },
  progressed: '已進展',
  chipFrom: (a) => `${a}起`,
  chipRange: (a, b) => `${a}–${b}`,
  indexOnset: (at) => `水腫與後續併發症從 ${at} 起算（造成最多梗塞的那次阻塞開始時）。`,
  treatAfterFirst: '第一個事件後',
  treatAfter: (what, at) => `${what}阻塞（${at}）後`,
  plus: (d) => `+${d}`,
  markOnset: '阻塞開始',
  markReopen: '自行再通',
  markTreatment: '治療',
};

const en: ScheduleStrings = {
  timing: 'Timing',
  timingHint:
    'Times are on the timeline (0 = the first event). Treatment reopens only the complete occlusions present at that moment; stenoses and occlusions that begin later stay.',
  phase: (k) => `Phase ${k}`,
  starts: 'Starts',
  reopens: 'Reopens by itself',
  never: 'Never',
  after: (d) => `after ${d}`,
  untilNext: 'Until the next phase',
  severity: 'Degree',
  laterOcclusion: 'Later becomes a complete occlusion at',
  add: 'Add',
  removePhase: 'Remove this phase',
  status: { pending: 'not yet', active: 'in effect', reopened: 'reopened by itself', treated: 'reopened by treatment' },
  progressed: 'progressed',
  chipFrom: (a) => `from ${a}`,
  chipRange: (a, b) => `${a}–${b}`,
  indexOnset: (at) => `Oedema and complications are timed from ${at} (the start of the occlusion that causes most of the infarct).`,
  treatAfterFirst: 'After the first event',
  treatAfter: (what, at) => `After ${what} occludes (${at})`,
  plus: (d) => `+${d}`,
  markOnset: 'Occlusion begins',
  markReopen: 'Reopens by itself',
  markTreatment: 'Treatment',
};

const cn: ScheduleStrings = {
  timing: '时程', timingHint: '时间以时间轴为准（0 = 第一个事件）。治疗仅使当时已存在的完全闭塞再通；狭窄和之后发生的闭塞不受影响。',
  phase: (k) => `第 ${k} 阶段`, starts: '开始', reopens: '自行再通', never: '不会', after: (d) => `${d}后`,
  untilNext: '直至下一阶段', severity: '程度', laterOcclusion: '之后完全闭塞的时间', add: '添加', removePhase: '移除此阶段',
  status: { pending: '尚未发生', active: '进行中', reopened: '已自行再通', treated: '已治疗再通' }, progressed: '已进展',
  chipFrom: (a) => `从${a}起`, chipRange: (a, b) => `${a}–${b}`,
  indexOnset: (at) => `脑水肿与后续并发症从 ${at} 起算（导致最大梗死的闭塞开始时）。`,
  treatAfterFirst: '第一个事件后', treatAfter: (what, at) => `${what}闭塞（${at}）后`, plus: (d) => `+${d}`,
  markOnset: '闭塞开始', markReopen: '自行再通', markTreatment: '治疗',
};
const de: ScheduleStrings = {
  timing: 'Zeitverlauf', timingHint: 'Die Zeiten beziehen sich auf die Zeitachse (0 = erstes Ereignis). Die Behandlung rekanalisiert nur zu diesem Zeitpunkt bestehende vollständige Verschlüsse; Stenosen und spätere Verschlüsse bleiben bestehen.',
  phase: (k) => `Phase ${k}`, starts: 'Beginn', reopens: 'Spontane Rekanalisation', never: 'Nie', after: (d) => `nach ${d}`,
  untilNext: 'Bis zur nächsten Phase', severity: 'Schweregrad', laterOcclusion: 'Späterer vollständiger Verschluss bei', add: 'Hinzufügen', removePhase: 'Diese Phase entfernen',
  status: { pending: 'noch nicht eingetreten', active: 'bestehend', reopened: 'spontan rekanalisiert', treated: 'durch Behandlung rekanalisiert' },
  progressed: 'fortgeschritten', chipFrom: (a) => `ab ${a}`, chipRange: (a, b) => `${a}–${b}`,
  indexOnset: (at) => `Hirnödem und Komplikationen werden ab ${at} berechnet (Beginn des Verschlusses, der den größten Infarkt verursacht).`,
  treatAfterFirst: 'Nach dem ersten Ereignis', treatAfter: (what, at) => `Nach Verschluss von ${what} (${at})`, plus: (d) => `+${d}`,
  markOnset: 'Verschlussbeginn', markReopen: 'Spontane Rekanalisation', markTreatment: 'Behandlung',
};
const ja: ScheduleStrings = {
  timing: '時間経過', timingHint: '時間はタイムラインに基づきます（0 = 最初のイベント）。治療はその時点で存在する完全閉塞のみを再開通させ、狭窄や後から生じる閉塞には影響しません。',
  phase: (k) => `第 ${k} 段階`, starts: '開始', reopens: '自然再開通', never: 'なし', after: (d) => `${d}後`,
  untilNext: '次の段階まで', severity: '程度', laterOcclusion: '後に完全閉塞となる時点', add: '追加', removePhase: 'この段階を削除',
  status: { pending: '未発生', active: '持続中', reopened: '自然再開通済み', treated: '治療で再開通済み' }, progressed: '進行済み',
  chipFrom: (a) => `${a}から`, chipRange: (a, b) => `${a}–${b}`,
  indexOnset: (at) => `脳浮腫と合併症は ${at} から計算します（最大の梗塞を生じる閉塞の開始時点）。`,
  treatAfterFirst: '最初のイベント後', treatAfter: (what, at) => `${what}の閉塞（${at}）後`, plus: (d) => `+${d}`,
  markOnset: '閉塞開始', markReopen: '自然再開通', markTreatment: '治療',
};
export const SCHEDULE_UI: Record<Lang, ScheduleStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };
