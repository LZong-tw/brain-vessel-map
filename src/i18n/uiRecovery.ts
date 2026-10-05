/**
 * UI strings for temporary dysfunction (oedema, remote depression) and compensation of lost
 * functions. Traditional Chinese first, English second.
 */

import type { Lang } from '../anatomy/types';
import type { RedundancyKind } from '../anatomy/redundancy';

export interface RecoveryStrings {
  // ── region panel: status of the region's function now ──
  statusTitle: string;
  dead: string;
  deadNote: string;
  silenced: string;
  silencedNote: (edema: boolean, remote: boolean) => string;
  compensated: string;
  compensatedNote: (pct: string) => string;
  compensatedLittle: string;
  compensatedLittleNote: (pct: string | null) => string;
  noBackup: string;
  noBackupNote: string;
  bilateralNote: string;
  bottleneckNote: string;
  /** shown wherever recovery is displayed */
  caveat: string;
  // ── per-symptom tags ──
  tagNoBackup: string;
  tagCompensated: (pct: string) => string;
  tagEased: (from: number, to: number) => string;
  tagEasedNoBackup: (from: number, to: number) => string;
  kindExplain: Record<RedundancyKind, string>;
  // ── function groups ──
  funcDeadAndSilenced: string;
  funcSilenced: string;
  funcLostCompensating: string;
  funcCompensatedGone: string;
  // ── time strips ──
  rowSilenced: string;
  rowSilencedTitle: string;
  rowCompensated: string;
  rowCompensatedTitle: string;
  silencedCell: (pct: string) => string;
  compensatedCell: (pct: string) => string;
  // ── function heat-map ──
  rowNihss: string;
  nihssCell: (n: number) => string;
  hatchLegend: string;
  hatchCell: string;
  // ── "what is happening now" ──
  nowSilenced: (ml: string) => string;
  nowRemote: string;
  nowCompensating: (pct: string) => string;
  nowCompensatingLittle: (pct: string) => string;
  nowNihssTrend: (peak: number, at: string, now: number) => string;
  improvedLabel: (since: string) => string;
  noBackupLabel: string;
  goneWord: string;
}

const zh: RecoveryStrings = {
  statusTitle: '功能狀態',
  dead: '壞死',
  deadNote: '這部分組織已經死亡，不會再長回來。',
  silenced: '暫時受抑制（水腫／遠端抑制）',
  silencedNote: (edema, remote) =>
    `組織還活著，只是被${edema && remote ? '周圍水腫與遠端抑制' : edema ? '周圍水腫' : '遠端抑制（相連腦區受損後的功能下降）'}暫時關掉；${
      edema ? '水腫約 1–3 週消退後' : '數週內'
    }這部分功能會回來。`,
  compensated: '已部分代償',
  compensatedNote: (pct) => `其他神經路徑已接手約 ${pct} 因壞死而失去的功能；大部分代償在前 3 個月發生，之後變慢，但仍可能進步。`,
  compensatedLittle: '預期代償很有限',
  compensatedLittleNote: (pct) => (pct ? `其他路徑目前只接手約 ${pct}。` : ''),
  noBackup: '此功能沒有備援',
  noBackupNote: '這些功能只有一條路（例如腦神經核、視覺皮質）；組織壞死後，其他路徑無法接手，只能靠策略（例如轉頭）彌補。',
  bilateralNote: '同一條路徑兩側都受損：原本可以接手的另一側也壞了，代償有限。',
  bottleneckNote:
    '腹側橋腦是瓶頸：兩側的皮質脊髓徑、皮質延髓徑與許多皮質網狀纖維都擠在這裡，主要路徑和備援一起被截斷——所以閉鎖症候群的恢復遠比症狀相近的半球中風差。',
  caveat: '恢復曲線只是示意的群體平均，不是預後；真實的恢復因人而異，差異很大。',
  tagNoBackup: '沒有備援',
  tagCompensated: (pct) => `已代償 ${pct}`,
  tagEased: (from, to) => `較最嚴重時減輕 ${from}→${to}`,
  tagEasedNoBackup: (from, to) => `較最嚴重時減輕 ${from}→${to}：是暫時受抑制的組織恢復了，壞死的部分不會再改善`,
  kindExplain: {
    bilateral: '雙側支配：另一側大腦也能驅動這些肌肉或功能，單側受損通常恢復得不錯，兩側都受損就很難。',
    parallel: '平行路徑：網狀脊髓徑等可以接手近端與粗大動作，但精細動作回不來，並常伴隨痙攣與協同動作。',
    fine: '精細動作（手指獨立運動）幾乎只靠皮質脊髓徑，其他路徑難以取代，恢復有限。',
    partial: '周邊或對側腦區可以重組、部分接手。',
    fcp: '最後共同路徑：腦神經運動核或其纖維是通往肌肉的唯一出口，壞死後沒有其他路徑能接手。',
    none: '這個功能只有這一條路（例如視覺皮質、視網膜），壞死後無法由其他路徑取代。',
    exempt: '這是晚期出現的後果或描述，不是可以代償的功能。',
  },
  funcDeadAndSilenced: '已受損：部分組織壞死；周圍還活著的組織也被水腫暫時抑制，這部分會恢復',
  funcSilenced: '暫時受抑制：組織還活著，被水腫或遠端抑制暫時關掉，會隨之恢復',
  funcLostCompensating: '已受損：組織壞死；部分功能正由其他路徑代償',
  funcCompensatedGone: '已代償：組織已壞死，但其他路徑接手後已不明顯',
  rowSilenced: '抑制',
  rowSilencedTitle: '暫時受抑制（水腫／遠端抑制）',
  rowCompensated: '代償',
  rowCompensatedTitle: '已部分代償',
  silencedCell: (pct) => `暫時受抑制 ${pct}`,
  compensatedCell: (pct) => `其他路徑已接手約 ${pct}`,
  rowNihss: 'NIHSS',
  nihssCell: (n) => `NIHSS 估計 ${n}`,
  hatchLegend: '斜線：部分已代償',
  hatchCell: '部分已由其他路徑代償',
  nowSilenced: (ml) =>
    `水腫讓病灶周圍約 ${ml} mL 還活著的組織暫時停擺，所以此刻的功能缺損比壞死範圍更大；水腫約 1–3 週消退後，這部分功能會回來。`,
  nowRemote: '與受損區相連的遠處腦區（例如對側小腦）功能也暫時下降（遠端抑制），通常沒有明顯症狀，會在數週內淡去。',
  nowCompensating: (pct) => `其他神經路徑正逐漸接手部分失去的功能（典型的代償進程已走了約 ${pct}）；大部分發生在前 3 個月，之後變慢。`,
  nowCompensatingLittle: (pct) =>
    `典型的代償進程已走了約 ${pct}，但這裡兩側的主要運動路徑和它們的備援在腹側橋腦一起被截斷，能被接手的很少：四肢與說話的功能多半只有很有限的恢復。`,
  nowNihssTrend: (peak, at, now) => `NIHSS 估計從最高的 ${peak}（${at}）降到 ${now}。`,
  improvedLabel: (since) => `比 ${since} 改善`,
  noBackupLabel: '沒有備援、不會再改善',
  goneWord: '消失',
};

const en: RecoveryStrings = {
  statusTitle: 'Function status',
  dead: 'Dead',
  deadNote: 'This tissue has died and will not grow back.',
  silenced: 'Temporarily silenced (oedema / remote depression)',
  silencedNote: (edema, remote) =>
    `The tissue is alive but switched off by ${
      edema && remote ? 'the surrounding oedema and remote depression' : edema ? 'the surrounding oedema' : 'remote depression (a connected region was damaged)'
    }; this function comes back ${edema ? 'as the oedema settles over ~1–3 weeks' : 'over weeks'}.`,
  compensated: 'Partly compensated',
  compensatedNote: (pct) =>
    `Other pathways have taken over about ${pct} of the function lost to dead tissue; most compensation happens in the first 3 months, then more slowly, and later gains are possible.`,
  compensatedLittle: 'Little compensation expected',
  compensatedLittleNote: (pct) => (pct ? `Other pathways have taken over only about ${pct} so far.` : ''),
  noBackup: 'No backup for this function',
  noBackupNote:
    'These functions have a single route (e.g. a cranial-nerve nucleus, the visual cortex); once that tissue is dead no other pathway can take over — only strategies such as turning the head help.',
  bilateralNote: 'The same pathway is damaged on both sides, so the side that could take over is damaged too: compensation is limited.',
  bottleneckNote:
    'The ventral pons is a bottleneck: both corticospinal tracts, both corticobulbar tracts and many cortico-reticular fibres run through it together, so the main pathway and its backup are cut at once — why locked-in syndrome recovers far less than a hemispheric stroke with a similar deficit.',
  caveat: 'Recovery is shown as an illustrative average pattern, not a prognosis; real recovery varies widely between people.',
  tagNoBackup: 'no backup',
  tagCompensated: (pct) => `compensated ${pct}`,
  tagEased: (from, to) => `eased since its worst ${from}→${to}`,
  tagEasedNoBackup: (from, to) => `eased ${from}→${to} because silenced tissue recovered; the dead part will not improve`,
  kindExplain: {
    bilateral:
      'Bilateral control: the other hemisphere can also drive these muscles or functions, so a one-sided lesion usually recovers well and a two-sided one poorly.',
    parallel:
      'Parallel pathways: the reticulospinal system can take over proximal and gross movement, but not fine control; spasticity and synergies often follow.',
    fine: 'Fine (independent finger) movement relies almost entirely on the corticospinal tract; other pathways barely replace it.',
    partial: 'Nearby or opposite-side areas can reorganise and take part of it over.',
    fcp: 'Final common pathway: the cranial-nerve motor nucleus or its fibres are the only way to the muscle, so nothing can take over once it is dead.',
    none: 'This function has a single route (e.g. the visual cortex, the retina); nothing else can replace it once it is dead.',
    exempt: 'A late consequence or a descriptor, not a function that is compensated.',
  },
  funcDeadAndSilenced: 'Impaired — part of the tissue has died; surviving tissue around it is also silenced by oedema, and that part will recover',
  funcSilenced: 'Temporarily silenced — the tissue is alive but switched off by oedema or remote depression, and will recover',
  funcLostCompensating: 'Impaired — the tissue has died; other pathways are taking part of the function over',
  funcCompensatedGone: 'Compensated — the tissue is dead, but other pathways have taken over enough that it no longer shows',
  rowSilenced: 'Silenced',
  rowSilencedTitle: 'Temporarily silenced (oedema / remote depression)',
  rowCompensated: 'Compens.',
  rowCompensatedTitle: 'Partly compensated',
  silencedCell: (pct) => `Temporarily silenced ${pct}`,
  compensatedCell: (pct) => `Other pathways have taken over about ${pct}`,
  rowNihss: 'NIHSS',
  nihssCell: (n) => `NIHSS estimate ${n}`,
  hatchLegend: 'Hatched: partly compensated',
  hatchCell: 'partly compensated by other pathways',
  nowSilenced: (ml) =>
    `Oedema has switched off about ${ml} mL of living tissue around the lesion, so the deficit is larger than the dead tissue alone; as the oedema settles over ~1–3 weeks, this function comes back.`,
  nowRemote:
    'Connected regions further away (e.g. the opposite cerebellum) are temporarily depressed too (diaschisis); this is usually silent and fades over weeks.',
  nowCompensatingLittle: (pct) =>
    `The typical course of compensation is about ${pct} complete, but here the main motor pathways of both sides and their backups were cut together in the ventral pons, so little can be taken over: limb movement and speech usually recover only to a limited extent.`,
  nowCompensating: (pct) =>
    `Other pathways are gradually taking over part of the lost functions (the typical course of compensation is about ${pct} complete); most of it happens in the first 3 months, then more slowly.`,
  nowNihssTrend: (peak, at, now) => `The NIHSS estimate has fallen from its highest, ${peak} (${at}), to ${now}.`,
  improvedLabel: (since) => `Better than at ${since}`,
  noBackupLabel: 'No backup — will not improve',
  goneWord: 'gone',
};

export const RECOVERY_UI: Record<Lang, RecoveryStrings> = { 'zh-TW': zh, en };
