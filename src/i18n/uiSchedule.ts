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

export const SCHEDULE_UI: Record<Lang, ScheduleStrings> = { 'zh-TW': zh, en };
