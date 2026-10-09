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
  hint: '可以同時阻塞多條血管：在下方清單按「＋ 阻塞」加入。點範本會取代目前的病例；按範本旁的「疊加」則保留目前的阻塞並加上它的。',
  occlude: '＋ 阻塞',
  occluded: '已阻塞',
  occludeAria: (n) => `阻塞${n}（加到目前的阻塞上）`,
  unoccludeAria: (n) => `解除${n}的阻塞`,
  remove: (n) => `移除${n}的阻塞`,
  stack: '疊加',
  stackTitle: '把這個範本的阻塞加到目前的阻塞上，保留目前的條件與治療',
  stackAria: (t) => `疊加範本：${t}`,
  supplyHint: '按「＋ 阻塞」可把供應這裡的動脈加到目前的阻塞上。',
  partial: (pct) => `狹窄 ${pct}%`,
  upstream: '上游：',
  branch: '一條分支',
};

const en: StackStrings = {
  currentTitle: 'Current occlusions',
  none: 'No artery is blocked.',
  hint: 'Several arteries can be blocked at once: press "+ Block" in the list below. Choosing a template replaces the current case; its "Add" button keeps the current occlusions and adds the template\'s.',
  occlude: '+ Block',
  occluded: 'Blocked',
  occludeAria: (n) => `Block ${n} (added to the current occlusions)`,
  unoccludeAria: (n) => `Unblock ${n}`,
  remove: (n) => `Remove the occlusion of ${n}`,
  stack: 'Add',
  stackTitle: "Add this template's occlusions to the current ones, keeping the current conditions and treatment",
  stackAria: (t) => `Add template: ${t}`,
  supplyHint: 'Press "+ Block" to add an artery that supplies this region to the current occlusions.',
  partial: (pct) => `${pct}% stenosis`,
  upstream: 'Upstream:',
  branch: 'one branch',
};

const cn: StackStrings = {
  currentTitle: '当前闭塞', none: '当前无闭塞的动脉。',
  hint: '可同时闭塞多条动脉：在下方列表点击“＋ 闭塞”。选择模板会替换当前病例；点击模板旁的“叠加”可保留当前闭塞并添加模板的闭塞。',
  occlude: '＋ 闭塞', occluded: '已闭塞', occludeAria: (n) => `闭塞${n}（添加到当前闭塞）`,
  unoccludeAria: (n) => `解除${n}的闭塞`, remove: (n) => `移除${n}的闭塞`, stack: '叠加',
  stackTitle: '将模板的闭塞添加到当前闭塞，保留当前条件与治疗', stackAria: (t) => `叠加模板：${t}`,
  supplyHint: '点击“＋ 闭塞”可将供应此脑区的动脉添加到当前闭塞。', partial: (pct) => `狭窄 ${pct}%`, upstream: '上游：', branch: '一条分支',
};
const de: StackStrings = {
  currentTitle: 'Aktuelle Verschlüsse', none: 'Keine Arterie verschlossen.',
  hint: 'Mehrere Arterien können gleichzeitig verschlossen werden: unten „+ Verschließen“ wählen. Die Auswahl einer Vorlage ersetzt den Fall; „Hinzufügen“ behält bestehende Verschlüsse und ergänzt die der Vorlage.',
  occlude: '+ Verschließen', occluded: 'Verschlossen', occludeAria: (n) => `${n} verschließen (zu aktuellen Verschlüssen hinzufügen)`,
  unoccludeAria: (n) => `Verschluss von ${n} aufheben`, remove: (n) => `Verschluss von ${n} entfernen`, stack: 'Hinzufügen',
  stackTitle: 'Verschlüsse dieser Vorlage hinzufügen und bestehende Bedingungen und Behandlung beibehalten',
  stackAria: (t) => `Vorlage hinzufügen: ${t}`, supplyHint: '„+ Verschließen“ fügt eine versorgende Arterie zu den aktuellen Verschlüssen hinzu.',
  partial: (pct) => `${pct}% Stenose`, upstream: 'Proximal:', branch: 'ein Ast',
};
const ja: StackStrings = {
  currentTitle: '現在の閉塞', none: '閉塞した動脈はありません。',
  hint: '複数の動脈を同時に閉塞できます。下の一覧で「＋ 閉塞」を選びます。テンプレートの選択は現在の症例を置き換え、「追加」は現在の閉塞を残してテンプレートの閉塞を追加します。',
  occlude: '＋ 閉塞', occluded: '閉塞中', occludeAria: (n) => `${n}を閉塞（現在の閉塞に追加）`,
  unoccludeAria: (n) => `${n}の閉塞を解除`, remove: (n) => `${n}の閉塞を削除`, stack: '追加',
  stackTitle: '現在の条件と治療を保ち、このテンプレートの閉塞を追加', stackAria: (t) => `テンプレートを追加：${t}`,
  supplyHint: '「＋ 閉塞」で、この領域に血液を供給する動脈を現在の閉塞に追加できます。',
  partial: (pct) => `狭窄 ${pct}%`, upstream: '上流：', branch: '分枝 1 本',
};
export const STACK_UI: Record<Lang, StackStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };
