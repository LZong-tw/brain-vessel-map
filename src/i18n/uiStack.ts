/**
 * UI strings for combining occlusions (several blocked arteries at once).
 * Traditional Chinese first, English second.
 */

import type { Lang } from '../anatomy/types';

export interface StackStrings {
  currentTitle: string;
  none: string;
  hint: string;
  occlude: string;
  occluded: string;
  occludeAria: (name: string) => string;
  unoccludeAria: (name: string) => string;
  remove: (name: string) => string;
  stack: string;
  stackTitle: string;
  stackAria: (title: string) => string;
  supplyHint: string;
  partial: (pct: number) => string;
  /** prefix for a supplier's parent artery in the region details */
  upstream: string;
  branch: string;
}

const zh: StackStrings = {
  currentTitle: '目前阻塞',
  none: '目前沒有阻塞的血管。',
  hint: '可以同時阻塞多條血管：在下方清單按「＋ 阻塞」加入。點情境會取代目前的阻塞；按情境旁的「疊加」則保留目前的阻塞並加上它的。',
  occlude: '＋ 阻塞',
  occluded: '已阻塞',
  occludeAria: (n) => `阻塞${n}（加到目前的阻塞上）`,
  unoccludeAria: (n) => `解除${n}的阻塞`,
  remove: (n) => `移除${n}的阻塞`,
  stack: '疊加',
  stackTitle: '把這個情境的阻塞加到目前的阻塞上，保留目前的設定',
  stackAria: (t) => `疊加情境：${t}`,
  supplyHint: '按「＋ 阻塞」可把供應這裡的動脈加到目前的阻塞上。',
  partial: (pct) => `狹窄 ${pct}%`,
  upstream: '上游：',
  branch: '一條分支',
};

const en: StackStrings = {
  currentTitle: 'Current occlusions',
  none: 'No artery is blocked.',
  hint: 'Several arteries can be blocked at once: press "+ Block" in the list below. Choosing a scenario replaces the current occlusions; its "Add" button keeps them and adds the scenario\'s.',
  occlude: '+ Block',
  occluded: 'Blocked',
  occludeAria: (n) => `Block ${n} (added to the current occlusions)`,
  unoccludeAria: (n) => `Unblock ${n}`,
  remove: (n) => `Remove the occlusion of ${n}`,
  stack: 'Add',
  stackTitle: "Add this scenario's occlusions to the current ones, keeping the current settings",
  stackAria: (t) => `Add scenario: ${t}`,
  supplyHint: 'Press "+ Block" to add an artery that supplies this region to the current occlusions.',
  partial: (pct) => `${pct}% stenosis`,
  upstream: 'Upstream:',
  branch: 'one branch',
};

export const STACK_UI: Record<Lang, StackStrings> = { 'zh-TW': zh, en };
