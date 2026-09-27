/**
 * UI strings for the treatment details (how the artery is reopened and how well), the published
 * figures shown next to them and the one-line treatment summary. Traditional Chinese first,
 * English second.
 */

import type { Lang } from '../anatomy/types';
import type { SiteGroup } from '../anatomy/recanalisation';
import type { TreatmentMethod } from '../engine/treatment';

export interface TreatmentStrings {
  /** heading of the details block under the reperfusion select */
  title: string;
  method: string;
  methods: Record<TreatmentMethod, string>;
  /** short method names for the summary line */
  methodShort: Record<TreatmentMethod, string>;
  grade: string;
  gradeHint: string;
  /** option labels by eTICI grade */
  grades: {
    '3': string;
    '2c': string;
    /** optgroup label for 2b50 / 2b67 */
    '2b': string;
    '2b67': string;
    '2b50': string;
    '2a': string;
    '1': string;
    '0': string;
  };
  reocclusion: string;
  reocclusionNever: string;
  reocclusionAfter: (h: string) => string;
  distal: string;
  distalNone: string;
  distalHint: string;
  noReflow: string;
  limitedEvidence: string;
  noReflowHint: string;
  /** shown when the chosen time reopens no complete occlusion */
  nothingReopened: string;
  /** evidence box */
  evidenceTitle: string;
  evidenceChoice: string;
  evidenceNone: string;
  sites: Record<SiteGroup, string>;
  rows: {
    success: (site: string) => string;
    sich: string;
    reocclusion: string;
    distal: string;
    noReflow: string;
  };
  /** "about 12 % (5–20 %)" */
  range: (typical: string | null, low: string, high: string) => string;
  source: string;
  /** warnings */
  warnIvtWindow: (window: string, delay: string) => string;
  warnEvtWindow: (window: string, delay: string) => string;
  warnIvtLargeVessel: (site: string, chance: string) => string;
  /** summary line in the results */
  summaryLabel: string;
  summaryGrade: (g: string) => string;
  summaryReocclusion: (h: string) => string;
  summaryDistal: (v: string) => string;
  summaryNoReflow: (p: string) => string;
}

const zh: TreatmentStrings = {
  title: '治療細節',
  method: '方式',
  methods: { evt: '取栓', ivt: '靜脈血栓溶解', bridging: '兩者（橋接）' },
  methodShort: { evt: '取栓', ivt: '靜脈血栓溶解', bridging: '橋接（溶栓＋取栓）' },
  grade: '結果（eTICI 再灌流分級）',
  gradeHint: '打通後，原本缺血的區域有多少恢復血流。',
  grades: {
    '3': '3：完全再灌流',
    '2c': '2c：幾乎完全（90–99%）',
    '2b': '2b：一半到九成',
    '2b67': '2b67：三分之二到九成（67–89%）',
    '2b50': '2b50：一半到三分之二（50–66%）',
    '2a': '2a：不到一半',
    '1': '1：只通過血栓，遠端幾乎沒血流',
    '0': '0：沒有打通',
  },
  reocclusion: '再阻塞',
  reocclusionNever: '不會',
  reocclusionAfter: (h) => `${h}後`,
  distal: '遠端栓塞',
  distalNone: '無',
  distalHint: '取栓時血栓碎片可能卡進下游分支。',
  noReflow: '無再流（no-reflow）',
  limitedEvidence: '證據有限',
  noReflowHint: '大血管通了，但部分微血管仍沒有血流；比例是估計值。',
  nothingReopened: '這個時間沒有可打通的完全阻塞，治療細節不會改變結果。',
  evidenceTitle: '文獻數字',
  evidenceChoice: '模擬顯示的是你選擇的結果，不是機率；下面的數字只供對照實際上多常發生。',
  evidenceNone: 'App 內沒有這個部位與方式的已發表數據。',
  sites: {
    ica: '內頸動脈',
    m1: '中大腦動脈 M1',
    m2: '中大腦動脈 M2',
    distal: '遠端分支',
    basilar: '基底動脈',
    vertebral: '椎動脈',
    other: '其他部位',
  },
  rows: {
    success: (site) => `成功打通（${site}）`,
    sich: '症狀性腦出血',
    reocclusion: '早期再阻塞',
    distal: '遠端或新區域栓塞',
    noReflow: '無再流',
  },
  range: (typical, low, high) => (typical ? `約 ${typical}（${low}–${high}）` : `${low}–${high}`),
  source: '來源',
  warnIvtWindow: (w, d) => `靜脈血栓溶解通常只在發作後 ${w}內使用；這裡是發作後 ${d}。`,
  warnEvtWindow: (w, d) => `取栓通常只在發作後 ${w}內（且影像條件合適）進行；這裡是發作後 ${d}。`,
  warnIvtLargeVessel: (site, chance) => `${site}這類大血管阻塞，只用靜脈血栓溶解打通的機會低（${chance}），通常會再取栓。`,
  summaryLabel: '治療',
  summaryGrade: (g) => `eTICI ${g}`,
  summaryReocclusion: (h) => `${h}後再阻塞`,
  summaryDistal: (v) => `遠端栓塞：${v}`,
  summaryNoReflow: (p) => `無再流 ${p}`,
};

const en: TreatmentStrings = {
  title: 'Treatment details',
  method: 'Method',
  methods: { evt: 'Thrombectomy', ivt: 'IV thrombolysis', bridging: 'Both (bridging)' },
  methodShort: { evt: 'Thrombectomy', ivt: 'IV thrombolysis', bridging: 'Bridging (IVT + thrombectomy)' },
  grade: 'Result (eTICI reperfusion grade)',
  gradeHint: 'How much of the ischaemic area gets its blood flow back.',
  grades: {
    '3': '3: complete reperfusion',
    '2c': '2c: nearly complete (90–99%)',
    '2b': '2b: half to nine tenths',
    '2b67': '2b67: two thirds to nine tenths (67–89%)',
    '2b50': '2b50: half to two thirds (50–66%)',
    '2a': '2a: less than half',
    '1': '1: past the clot, hardly any distal flow',
    '0': '0: not reopened',
  },
  reocclusion: 'Reocclusion',
  reocclusionNever: 'No',
  reocclusionAfter: (h) => `after ${h}`,
  distal: 'Distal embolus',
  distalNone: 'None',
  distalHint: 'A fragment of the clot may lodge in a downstream branch during thrombectomy.',
  noReflow: 'No-reflow',
  limitedEvidence: 'limited evidence',
  noReflowHint: 'The artery is open but part of the microcirculation still gets no flow; the share is an estimate.',
  nothingReopened: 'Nothing complete is occluded at this time, so the treatment details change nothing.',
  evidenceTitle: 'Published figures',
  evidenceChoice: 'The simulation shows the result you chose, not a probability; the figures below only show how often it happens.',
  evidenceNone: 'No published figure in the app for this site and method.',
  sites: {
    ica: 'internal carotid artery',
    m1: 'MCA M1',
    m2: 'MCA M2',
    distal: 'distal branches',
    basilar: 'basilar artery',
    vertebral: 'vertebral artery',
    other: 'other sites',
  },
  rows: {
    success: (site) => `Successful reopening (${site})`,
    sich: 'Symptomatic haemorrhage',
    reocclusion: 'Early reocclusion',
    distal: 'Distal or new-territory emboli',
    noReflow: 'No-reflow',
  },
  range: (typical, low, high) => (typical ? `about ${typical} (${low}–${high})` : `${low}–${high}`),
  source: 'Source',
  warnIvtWindow: (w, d) => `IV thrombolysis is usually given only within ${w} of onset; this is ${d} after onset.`,
  warnEvtWindow: (w, d) => `Thrombectomy is usually done only within ${w} of onset (with favourable imaging); this is ${d} after onset.`,
  warnIvtLargeVessel: (site, chance) => `For a large-vessel occlusion such as the ${site}, IV thrombolysis alone rarely reopens it (${chance}); thrombectomy is usually added.`,
  summaryLabel: 'Treatment',
  summaryGrade: (g) => `eTICI ${g}`,
  summaryReocclusion: (h) => `reoccludes after ${h}`,
  summaryDistal: (v) => `distal embolus: ${v}`,
  summaryNoReflow: (p) => `no-reflow ${p}`,
};

export const TREATMENT_UI: Record<Lang, TreatmentStrings> = { 'zh-TW': zh, en };
