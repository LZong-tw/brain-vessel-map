/**
 * UI strings for temporary dysfunction (oedema, remote depression) and compensation of lost
 * functions. Traditional Chinese first, English second.
 */

import type { Lang } from '../anatomy/types';
import type { BottleneckSite, RedundancyKind } from '../anatomy/redundancy';
import type { UnexaminableWhy } from '../engine/clinical';

export interface RecoveryStrings {
  // ── region panel: status of the region's function now ──
  statusTitle: string;
  dead: string;
  deadNote: string;
  /** a lacune: a small dead share that costs most of the structure's function (W3-5) */
  deadLacuneNote: (lost: string) => string;
  silenced: string;
  silencedNote: (edema: boolean, remote: boolean) => string;
  /** alive, still regaining its function: after a reopening, or penumbra that survives (Y1-12, W2-10) */
  regaining: string;
  regainingNote: string;
  compensated: string;
  compensatedNote: (pct: string) => string;
  compensatedLittle: string;
  compensatedLittleNote: (pct: string | null) => string;
  noBackup: string;
  noBackupNote: string;
  bilateralNote: string;
  /** why little is taken over, by where both sides were cut (the sites of SymptomRecovery.bottleneckSites, Z2-10) */
  bottleneckNote: (sites: BottleneckSite[]) => string;
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
  funcDeadAndRegaining: string;
  funcRegaining: string;
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
  /** tissue that survived, still regaining its function after blood returned (Y1-12) */
  nowRegaining: (ml: string) => string;
  nowRemote: string;
  nowCompensating: (pct: string) => string;
  nowCompensatingLittle: (pct: string, sites: BottleneckSite[]) => string;
  nowNihssTrend: (peak: number, at: string, now: number) => string;
  improvedLabel: (since: string) => string;
  noBackupLabel: string;
  goneWord: string;
  /** signs the lesion gives that cannot be examined at the patient's level of consciousness (X1-2) */
  unexaminableLabel: string;
  unexaminableTitle: string;
  /**
   * the same for each reason a sign cannot be examined (Y2-14, Y2-15): `label` and `title` when it
   * is the only reason, `tag` after each sign when there are several
   */
  unexaminableBy: Record<UnexaminableWhy, { label: string; title: string; tag: string }>;
  /** the heading when signs cannot be examined for more than one reason */
  unexaminableMixedLabel: string;
}

/** where both sides' main motor pathways and their backups were cut together (Z2-10) */
const zhSite = (sites: BottleneckSite[]) =>
  sites.includes('midbrain') && sites.includes('pons') ? '中腦的大腦腳與腹側橋腦' : sites.includes('midbrain') ? '中腦的大腦腳' : '腹側橋腦';
const enSite = (sites: BottleneckSite[]) =>
  sites.includes('midbrain') && sites.includes('pons')
    ? 'the cerebral peduncles of the midbrain and the ventral pons'
    : sites.includes('midbrain')
      ? 'the cerebral peduncles of the midbrain'
      : 'the ventral pons';

const zh: RecoveryStrings = {
  statusTitle: '功能狀態',
  dead: '壞死',
  deadNote: '這部分組織已經死亡，不會再長回來。',
  deadLacuneNote: (lost) => `這部分組織已經死亡，不會再長回來；它雖小（腔隙），卻落在神經纖維密集的地方，讓這個構造失去約 ${lost} 的功能。`,
  silenced: '暫時受抑制（水腫／遠端抑制）',
  silencedNote: (edema, remote) =>
    `組織還活著，只是被${edema && remote ? '周圍水腫與遠端抑制' : edema ? '周圍水腫' : '遠端抑制（相連腦區受損後的功能下降）'}暫時關掉；${
      edema ? '水腫約 1–3 週消退後' : '數週內'
    }這部分功能會回來。`,
  regaining: '存活，仍在恢復功能',
  regainingNote: '這部分組織存活下來，不會壞死，只是還沒恢復運作；它會在數小時到數天內逐漸恢復功能，缺血越久越慢。',
  compensated: '已部分代償',
  compensatedNote: (pct) => `其他神經路徑已接手約 ${pct} 因壞死而失去的功能；大部分代償在前 3 個月發生，之後變慢，但仍可能進步。`,
  compensatedLittle: '預期代償很有限',
  compensatedLittleNote: (pct) => (pct ? `其他路徑目前只接手約 ${pct}。` : ''),
  noBackup: '此功能沒有備援',
  noBackupNote: '這些功能只有一條路（例如腦神經核、視覺皮質）；組織壞死後，其他路徑無法接手，只能靠策略（例如轉頭）彌補。',
  bilateralNote: '同一條路徑兩側都受損：原本可以接手的另一側也壞了，代償有限。',
  bottleneckNote: (sites) =>
    [
      sites.includes('midbrain')
        ? '中腦的大腦腳是瓶頸：每一側的皮質脊髓徑與皮質延髓徑都擠在同側大腦腳裡，兩側一起受損時，主要路徑和備援一起被截斷——所以恢復遠比症狀相近的半球中風差。'
        : '',
      sites.includes('pons') || sites.length === 0
        ? '腹側橋腦是瓶頸：兩側的皮質脊髓徑、皮質延髓徑與許多皮質網狀纖維都擠在這裡，主要路徑和備援一起被截斷——所以閉鎖症候群的恢復遠比症狀相近的半球中風差。'
        : '',
    ].join(''),
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
  funcDeadAndRegaining: '已受損：部分組織壞死；其餘的組織存活下來，仍在逐漸恢復功能，這部分會恢復',
  funcRegaining: '暫停中，會恢復：組織存活下來，仍在逐漸恢復功能',
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
  nowRegaining: (ml) =>
    `約 ${ml} mL 存活下來的組織仍在恢復功能：血流恢復（或側枝撐住半影區）之後，組織要幾小時到幾天才重新運作，不是立刻恢復；缺血越久，恢復越慢。`,
  nowRemote: '與受損區相連的遠處腦區（例如對側小腦）功能也暫時下降（遠端抑制），通常沒有明顯症狀，會在數週內淡去。',
  nowCompensating: (pct) => `其他神經路徑正逐漸接手部分失去的功能（典型的代償進程已走了約 ${pct}）；大部分發生在前 3 個月，之後變慢。`,
  nowCompensatingLittle: (pct, sites) =>
    `典型的代償進程已走了約 ${pct}，但這裡兩側的主要運動路徑和它們的備援在${zhSite(sites)}一起被截斷，能被接手的很少：四肢與說話的功能多半只有很有限的恢復。`,
  nowNihssTrend: (peak, at, now) => `NIHSS 估計從最高的 ${peak}（${at}）降到 ${now}。`,
  improvedLabel: (since) => `比 ${since} 改善`,
  noBackupLabel: '沒有備援、不會再改善',
  goneWord: '消失',
  unexaminableLabel: '意識下降，目前無法檢查',
  unexaminableTitle:
    '病灶仍會造成這些缺損，只是病人昏睡、昏迷或處於意識障礙時檢查不出來（需要病人清醒、配合或自己說出來），所以暫時不列在症狀清單裡，也不算改善；能檢查時會再列出。',
  unexaminableBy: {
    consciousness: {
      label: '意識下降，目前無法檢查',
      title:
        '病灶仍會造成這些缺損，只是病人昏睡、昏迷或處於意識障礙時檢查不出來（需要病人清醒、配合或自己說出來），所以暫時不列在症狀清單裡，也不算改善；能檢查時會再列出。',
      tag: '意識下降',
    },
    blind: {
      label: '看不見，目前無法檢查',
      title:
        '病灶仍會造成這些缺損，但認臉、認物、閱讀、看路、伸手拿看到的東西與視覺空間能力，都要先看得見才能檢查；病人目前看不見（皮質盲，或兩側半邊視野都看不到、中心視力也沒保留），所以暫時不列在症狀清單裡，也不算改善。視力部分恢復時會再列出。',
      tag: '看不見',
    },
    akinetic: {
      label: '無動性緘默，目前無法檢查',
      title:
        '病灶仍會造成這些缺損，但病人雖然清醒，卻幾乎不會自己動、不說話，也不照指令做，所以需要病人動手、回答或自己說出來的檢查（失用、異己手、伸手、認物、讀寫算、記憶、失語的類型等）都做不了；暫時不列在症狀清單裡，也不算改善。看得到的表現（意志缺失、情緒等）仍會列出。',
      tag: '無動性緘默',
    },
    aphasia: {
      label: '聽不懂話（失語），目前無法檢查',
      title:
        '病灶仍會造成這些缺損，但病人聽不懂話（中度以上的全面性、接受性或混合型經皮質失語），而閱讀、書寫、計算、說出手指名稱、語文記憶、對自身缺損的覺察，以及只能靠病人自己說出來的症狀（眩暈、複視、聽力、味覺、位置感、疼痛等），都要透過語言才能檢查，和失語本身分不開；所以暫時不列在症狀清單裡，也不算改善。兩手的失用症可以請病人模仿檢查者的動作來檢查，不需要語言，所以仍會列出；但胼胝體斷聯造成的左手失用與失寫，要看左手做不出指令、寫不出字而右手可以，這要透過語言，也暫時不列。理解力恢復時會再列出。',
      tag: '失語',
    },
    paralysed: {
      label: '肢體癱瘓，目前無法檢查',
      title:
        '病灶仍會造成這些缺損，但肢體運動失調（指鼻、跟膝脛測試）、手臂動作時的顫抖、手指的精細動作與異己手（手自己做出抓握、摸索等動作），都要病人能移動那一側的手腳才看得出來；胼胝體斷聯造成的左手症狀（左手和右手互相作對；左手的失用與失寫，也就是右手做得到的指令動作與寫字，左手做不到）要和右手比較，所以兩手都要能動。這裡需要的手臂無法對抗重力抬起（或腿完全不能動），所以暫時不列在症狀清單裡，也不算改善（NIHSS 也不計分癱瘓那一側的運動失調）。步態與軀幹不穩要看病人走路、站立與坐直：兩腿都無法對抗重力抬起時，病人站不起來，軀幹兩側也無力、無法自己坐穩，不穩分不出是失調還是無力，所以也暫時不列（只有一腿無力時仍可讓病人坐著檢查軀幹）。無力本身仍會列出並計分；手腳能動到可以檢查時會再列出。',
      tag: '肢體癱瘓',
    },
  },
  unexaminableMixedLabel: '目前無法檢查',
};

const en: RecoveryStrings = {
  statusTitle: 'Function status',
  dead: 'Dead',
  deadNote: 'This tissue has died and will not grow back.',
  deadLacuneNote: (lost) => `This tissue has died and will not grow back; small as it is (a lacune), it lies among tightly packed fibres and costs the structure about ${lost} of its function.`,
  silenced: 'Temporarily silenced (oedema / remote depression)',
  silencedNote: (edema, remote) =>
    `The tissue is alive but switched off by ${
      edema && remote ? 'the surrounding oedema and remote depression' : edema ? 'the surrounding oedema' : 'remote depression (a connected region was damaged)'
    }; this function comes back ${edema ? 'as the oedema settles over ~1–3 weeks' : 'over weeks'}.`,
  regaining: 'Survived, still regaining function',
  regainingNote: 'This tissue survived and will not die, but it is not working yet; it regains its function over hours to days, more slowly the longer the ischaemia lasted.',
  compensated: 'Partly compensated',
  compensatedNote: (pct) =>
    `Other pathways have taken over about ${pct} of the function lost to dead tissue; most compensation happens in the first 3 months, then more slowly, and later gains are possible.`,
  compensatedLittle: 'Little compensation expected',
  compensatedLittleNote: (pct) => (pct ? `Other pathways have taken over only about ${pct} so far.` : ''),
  noBackup: 'No backup for this function',
  noBackupNote:
    'These functions have a single route (e.g. a cranial-nerve nucleus, the visual cortex); once that tissue is dead no other pathway can take over — only strategies such as turning the head help.',
  bilateralNote: 'The same pathway is damaged on both sides, so the side that could take over is damaged too: compensation is limited.',
  bottleneckNote: (sites) =>
    [
      sites.includes('midbrain')
        ? 'The cerebral peduncles of the midbrain are a bottleneck: the corticospinal and corticobulbar tracts of each side run together through its peduncle, so when both are damaged the main pathway and its backup are cut at once — why recovery is far poorer than after a hemispheric stroke with a similar deficit.'
        : '',
      sites.includes('pons') || sites.length === 0
        ? 'The ventral pons is a bottleneck: both corticospinal tracts, both corticobulbar tracts and many cortico-reticular fibres run through it together, so the main pathway and its backup are cut at once — why locked-in syndrome recovers far less than a hemispheric stroke with a similar deficit.'
        : '',
    ]
      .filter(Boolean)
      .join(' '),
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
  funcDeadAndRegaining: 'Impaired — part of the tissue has died; the rest survived and is still regaining its function, and that part will recover',
  funcRegaining: 'Switched off but recovering — the tissue survived and is regaining its function',
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
  nowRegaining: (ml) =>
    `About ${ml} mL of tissue that survived is still regaining its function: once blood returns (or collaterals hold the penumbra), it works again over hours to days rather than at once, more slowly the longer the ischaemia lasted.`,
  nowRemote:
    'Connected regions further away (e.g. the opposite cerebellum) are temporarily depressed too (diaschisis); this is usually silent and fades over weeks.',
  nowCompensatingLittle: (pct, sites) =>
    `The typical course of compensation is about ${pct} complete, but here the main motor pathways of both sides and their backups were cut together in ${enSite(sites)}, so little can be taken over: limb movement and speech usually recover only to a limited extent.`,
  nowCompensating: (pct) =>
    `Other pathways are gradually taking over part of the lost functions (the typical course of compensation is about ${pct} complete); most of it happens in the first 3 months, then more slowly.`,
  nowNihssTrend: (peak, at, now) => `The NIHSS estimate has fallen from its highest, ${peak} (${at}), to ${now}.`,
  improvedLabel: (since) => `Better than at ${since}`,
  noBackupLabel: 'No backup — will not improve',
  goneWord: 'gone',
  unexaminableLabel: 'Cannot be examined at this level of consciousness',
  unexaminableTitle:
    'The lesion still causes these deficits, but they cannot be examined while the patient is stuporous, comatose or in a disorder of consciousness (they need an awake, cooperating patient, or the patient’s own report), so they are left out of the symptom list for now and do not count as improved; they are listed again once they can be examined.',
  unexaminableBy: {
    consciousness: {
      label: 'Cannot be examined at this level of consciousness',
      title:
        'The lesion still causes these deficits, but they cannot be examined while the patient is stuporous, comatose or in a disorder of consciousness (they need an awake, cooperating patient, or the patient’s own report), so they are left out of the symptom list for now and do not count as improved; they are listed again once they can be examined.',
      tag: 'reduced consciousness',
    },
    blind: {
      label: 'Cannot be tested: the patient cannot see',
      title:
        'The lesion still causes these deficits, but recognising faces and objects, reading, finding the way, reaching for what is seen and visuospatial tasks can only be tested in someone who sees; the patient is blind now (cortical blindness, or both half-fields lost without spared central vision), so they are left out of the symptom list for now and do not count as improved. They are listed again once vision partly returns.',
      tag: 'blind',
    },
    akinetic: {
      label: 'Cannot be examined: akinetic mutism',
      title:
        'The lesion still causes these deficits, but the patient, although awake, hardly moves or speaks and does not act on request, so nothing that needs the patient to act, answer or report can be tested (praxis, the alien hand, reaching, recognition, reading, writing and calculation, memory, the type of aphasia …); they are left out of the symptom list for now and do not count as improved. What can be seen (abulia, emotional expression) is still listed.',
      tag: 'akinetic mutism',
    },
    aphasia: {
      label: 'Cannot be examined: the patient does not understand speech (aphasia)',
      title:
        'The lesion still causes these deficits, but the patient does not understand speech (a moderate or severe global, Wernicke or mixed transcortical aphasia), and reading, writing, calculation, naming the fingers, verbal memory, awareness of the deficit and what only the patient can report (vertigo, double vision, hearing, taste, position sense, pain …) are tested through language and cannot be told apart from the aphasia; they are left out of the symptom list for now and do not count as improved. The apraxia of both hands is tested by imitating the examiner’s gestures, which needs no language, so it is still listed; the apraxia and agraphia of the left hand from a callosal disconnection is told by the left hand failing commands and writing that the right hand performs, which needs language, so it is left out too. They are listed again as comprehension returns.',
      tag: 'aphasia',
    },
    paralysed: {
      label: 'Cannot be examined: the limb is paralysed',
      title:
        'The lesion still causes these deficits, but limb ataxia (the finger–nose and heel–shin tests), a tremor of the moving arm, fine finger movements and an alien hand (grasping and groping of its own) only show when the patient can move that arm or leg, and the signs of a callosal disconnection in the left hand (the left hand working against the right; its apraxia and agraphia, failing movements on command and writing that the right hand performs) are told against the right hand, so both hands must move. Here an arm they need cannot move against gravity (or the leg cannot move at all), so they are left out of the symptom list for now and do not count as improved (the NIHSS does not score the ataxia of a paralysed side either). Gait and truncal ataxia are seen walking, standing and sitting upright: with neither leg able to move against gravity the patient cannot stand and, the trunk being weak from both sides, cannot sit unsupported, so the unsteadiness cannot be told from the weakness and it is left out too (with one weak leg the trunk can still be tested sitting). The weakness itself is still listed and scored; they are listed again once the limb moves enough to test them.',
      tag: 'paralysed limb',
    },
  },
  unexaminableMixedLabel: 'Cannot be examined now',
};


const cnSite = (sites: BottleneckSite[]) => sites.includes('midbrain') && sites.includes('pons') ? '中脑的大脑脚与腹侧脑桥' : sites.includes('midbrain') ? '中脑的大脑脚' : '腹侧脑桥';

const cn: RecoveryStrings = {
  statusTitle: '功能状态',
  dead: '坏死',
  deadNote: '这部分组织已经死亡，不会再长回来。',
  deadLacuneNote: (lost) => `这部分组织已经死亡，不会再长回来；它虽小（腔隙），却落在神经纤维密集的地方，让这个构造失去约 ${lost} 的功能。`,
  silenced: '暂时受抑制（水肿／远端抑制）',
  silencedNote: (edema, remote) =>
    `组织还活着，只是被${edema && remote ? '周围水肿与远端抑制' : edema ? '周围水肿' : '远端抑制（相连脑区受损后的功能下降）'}暂时关掉；${
      edema ? '水肿约 1–3 周消退后' : '数周内'
    }这部分功能会回来。`,
  regaining: '存活，仍在恢复功能',
  regainingNote: '这部分组织存活下来，不会坏死，只是还没恢复运作；它会在数小时到数天内逐渐恢复功能，缺血越久越慢。',
  compensated: '已部分代偿',
  compensatedNote: (pct) => `其他神经路径已接手约 ${pct} 因坏死而失去的功能；大部分代偿在前 3 个月发生，之后变慢，但仍可能进步。`,
  compensatedLittle: '预期代偿很有限',
  compensatedLittleNote: (pct) => (pct ? `其他路径目前只接手约 ${pct}。` : ''),
  noBackup: '此功能没有备援',
  noBackupNote: '这些功能只有一条路（例如脑神经核、视觉皮质）；组织坏死后，其他路径无法接手，只能靠策略（例如转头）弥补。',
  bilateralNote: '同一条路径两侧都受损：原本可以接手的另一侧也坏了，代偿有限。',
  bottleneckNote: (sites) =>
    [
      sites.includes('midbrain')
        ? '中脑的大脑脚是瓶颈：每一侧的皮质脊髓束与皮质核束都挤在同侧大脑脚里，两侧一起受损时，主要路径和备援一起被截断——所以恢复远比症状相近的半球脑卒中差。'
        : '',
      sites.includes('pons') || sites.length === 0
        ? '腹侧脑桥是瓶颈：两侧的皮质脊髓束、皮质核束与许多皮质网状纤维都挤在这里，主要路径和备援一起被截断——所以闭锁综合征的恢复远比症状相近的半球脑卒中差。'
        : '',
    ].join(''),
  caveat: '恢复曲线只是示意的群体平均，不是预后；真实的恢复因人而异，差异很大。',
  tagNoBackup: '没有备援',
  tagCompensated: (pct) => `已代偿 ${pct}`,
  tagEased: (from, to) => `较最严重时减轻 ${from}→${to}`,
  tagEasedNoBackup: (from, to) => `较最严重时减轻 ${from}→${to}：是暂时受抑制的组织恢复了，坏死的部分不会再改善`,
  kindExplain: {
    bilateral: '双侧支配：另一侧大脑也能驱动这些肌肉或功能，单侧受损通常恢复得不错，两侧都受损就很难。',
    parallel: '平行路径：网状脊髓束等可以接手近端与粗大动作，但精细动作回不来，并常伴随痉挛与协同动作。',
    fine: '精细动作（手指独立运动）几乎只靠皮质脊髓束，其他路径难以取代，恢复有限。',
    partial: '周围或对侧脑区可以重组、部分接手。',
    fcp: '最后共同路径：脑神经运动核或其纤维是通往肌肉的唯一出口，坏死后没有其他路径能接手。',
    none: '这个功能只有这一条路（例如视觉皮质、视网膜），坏死后无法由其他路径取代。',
    exempt: '这是晚期出现的后果或描述，不是可以代偿的功能。',
  },
  funcDeadAndSilenced: '已受损：部分组织坏死；周围还活着的组织也被水肿暂时抑制，这部分会恢复',
  funcSilenced: '暂时受抑制：组织还活着，被水肿或远端抑制暂时关掉，会随之恢复',
  funcDeadAndRegaining: '已受损：部分组织坏死；其余的组织存活下来，仍在逐渐恢复功能，这部分会恢复',
  funcRegaining: '暂停中，会恢复：组织存活下来，仍在逐渐恢复功能',
  funcLostCompensating: '已受损：组织坏死；部分功能正由其他路径代偿',
  funcCompensatedGone: '已代偿：组织已坏死，但其他路径接手后已不明显',
  rowSilenced: '抑制',
  rowSilencedTitle: '暂时受抑制（水肿／远端抑制）',
  rowCompensated: '代偿',
  rowCompensatedTitle: '已部分代偿',
  silencedCell: (pct) => `暂时受抑制 ${pct}`,
  compensatedCell: (pct) => `其他路径已接手约 ${pct}`,
  rowNihss: 'NIHSS',
  nihssCell: (n) => `NIHSS 估计 ${n}`,
  hatchLegend: '斜线：部分已代偿',
  hatchCell: '部分已由其他路径代偿',
  nowSilenced: (ml) =>
    `水肿让病灶周围约 ${ml} mL 还活着的组织暂时停摆，所以此刻的功能缺损比坏死范围更大；水肿约 1–3 周消退后，这部分功能会回来。`,
  nowRegaining: (ml) =>
    `约 ${ml} mL 存活下来的组织仍在恢复功能：血流恢复（或侧支撑住半影区）之后，组织要几小时到几天才重新运作，不是立刻恢复；缺血越久，恢复越慢。`,
  nowRemote: '与受损区相连的远处脑区（例如对侧小脑）功能也暂时下降（远端抑制），通常没有明显症状，会在数周内淡去。',
  nowCompensating: (pct) => `其他神经路径正逐渐接手部分失去的功能（典型的代偿进程已走了约 ${pct}）；大部分发生在前 3 个月，之后变慢。`,
  nowCompensatingLittle: (pct, sites) =>
    `典型的代偿进程已走了约 ${pct}，但这里两侧的主要运动路径和它们的备援在${cnSite(sites)}一起被截断，能被接手的很少：四肢与说话的功能多半只有很有限的恢复。`,
  nowNihssTrend: (peak, at, now) => `NIHSS 估计从最高的 ${peak}（${at}）降到 ${now}。`,
  improvedLabel: (since) => `比 ${since} 改善`,
  noBackupLabel: '没有备援、不会再改善',
  goneWord: '消失',
  unexaminableLabel: '意识下降，目前无法检查',
  unexaminableTitle:
    '病灶仍会造成这些缺损，只是病人昏睡、昏迷或处于意识障碍时检查不出来（需要病人清醒、配合或自己说出来），所以暂时不列在症状清单里，也不算改善；能检查时会再列出。',
  unexaminableBy: {
    consciousness: {
      label: '意识下降，目前无法检查',
      title:
        '病灶仍会造成这些缺损，只是病人昏睡、昏迷或处于意识障碍时检查不出来（需要病人清醒、配合或自己说出来），所以暂时不列在症状清单里，也不算改善；能检查时会再列出。',
      tag: '意识下降',
    },
    blind: {
      label: '看不见，目前无法检查',
      title:
        '病灶仍会造成这些缺损，但认脸、认物、阅读、看路、伸手拿看到的东西与视觉空间能力，都要先看得见才能检查；病人目前看不见（皮质盲，或两侧半边视野都看不到、中心视力也没保留），所以暂时不列在症状清单里，也不算改善。视力部分恢复时会再列出。',
      tag: '看不见',
    },
    akinetic: {
      label: '无动性缄默，目前无法检查',
      title:
        '病灶仍会造成这些缺损，但病人虽然清醒，却几乎不会自己动、不说话，也不照指令做，所以需要病人动手、回答或自己说出来的检查（失用、异己手、伸手、认物、读写算、记忆、失语的类型等）都做不了；暂时不列在症状清单里，也不算改善。看得到的表现（意志缺失、情绪等）仍会列出。',
      tag: '无动性缄默',
    },
    aphasia: {
      label: '听不懂话（失语），目前无法检查',
      title:
        '病灶仍会造成这些缺损，但病人听不懂话（中度以上的全面性、接受性或混合型经皮质失语），而阅读、书写、计算、说出手指名称、语文记忆、对自身缺损的觉察，以及只能靠病人自己说出来的症状（眩晕、复视、听力、味觉、位置感、疼痛等），都要透过语言才能检查，和失语本身分不开；所以暂时不列在症状清单里，也不算改善。两手的失用症可以请病人模仿检查者的动作来检查，不需要语言，所以仍会列出；但胼胝体断联造成的左手失用与失写，要看左手做不出指令、写不出字而右手可以，这要透过语言，也暂时不列。理解力恢复时会再列出。',
      tag: '失语',
    },
    paralysed: {
      label: '肢体瘫痪，目前无法检查',
      title:
        '病灶仍会造成这些缺损，但肢体共济失调（指鼻、跟膝胫测试）、手臂动作时的颤抖、手指的精细动作与异己手（手自己做出抓握、摸索等动作），都要病人能移动那一侧的手脚才看得出来；胼胝体断联造成的左手症状（左手和右手互相作对；左手的失用与失写，也就是右手做得到的指令动作与写字，左手做不到）要和右手比较，所以两手都要能动。这里需要的手臂无法对抗重力抬起（或腿完全不能动），所以暂时不列在症状清单里，也不算改善（NIHSS 也不计分瘫痪那一侧的共济失调）。步态与躯干不稳要看病人走路、站立与坐直：两腿都无法对抗重力抬起时，病人站不起来，躯干两侧也无力、无法自己坐稳，不稳分不出是失调还是无力，所以也暂时不列（只有一腿无力时仍可让病人坐著检查躯干）。无力本身仍会列出并计分；手脚能动到可以检查时会再列出。',
      tag: '肢体瘫痪',
    },
  },
  unexaminableMixedLabel: '目前无法检查',
};

const deSite = (sites: BottleneckSite[]) => sites.includes('midbrain') && sites.includes('pons') ? 'den Hirnschenkeln des Mittelhirns und der ventralen Brücke' : sites.includes('midbrain') ? 'den Hirnschenkeln des Mittelhirns' : 'der ventralen Brücke';

const de: RecoveryStrings = {
  statusTitle: 'Funktionszustand', dead: 'Abgestorben', deadNote: 'Dieses Gewebe ist abgestorben und wächst nicht nach.',
  deadLacuneNote: (lost) => `Dieses Gewebe ist abgestorben und wächst nicht nach; obwohl der Infarkt klein ist (eine Lakune), liegt er zwischen dicht gebündelten Fasern und kostet die Struktur etwa ${lost} ihrer Funktion.`,
  silenced: 'Vorübergehend gehemmt (Ödem / Diaschisis)',
  silencedNote: (edema, remote) => `Das Gewebe lebt, ist aber durch ${edema && remote ? 'das umgebende Ödem und Diaschisis' : edema ? 'das umgebende Ödem' : 'Diaschisis (Schädigung einer verbundenen Region)'} funktionell ausgeschaltet; die Funktion kehrt ${edema ? 'mit dem Abklingen des Ödems über etwa 1–3 Wochen' : 'im Laufe von Wochen'} zurück.`,
  regaining: 'Überlebt, Funktion noch in Erholung',
  regainingNote: 'Dieses Gewebe hat überlebt und wird nicht absterben, arbeitet aber noch nicht; seine Funktion kehrt über Stunden bis Tage zurück, bei längerer Ischämie langsamer.',
  compensated: 'Teilweise kompensiert',
  compensatedNote: (pct) => `Andere Nervenbahnen haben etwa ${pct} der durch abgestorbenes Gewebe verlorenen Funktion übernommen; die meiste Kompensation erfolgt in den ersten 3 Monaten, danach langsamer, wobei spätere Fortschritte möglich sind.`,
  compensatedLittle: 'Nur geringe Kompensation zu erwarten', compensatedLittleNote: (pct) => pct ? `Andere Bahnen haben bisher nur etwa ${pct} übernommen.` : '',
  noBackup: 'Kein Ersatzweg für diese Funktion',
  noBackupNote: 'Diese Funktionen haben nur einen Weg (z. B. einen Hirnnervenkern oder den visuellen Kortex); nach dessen Absterben kann keine andere Bahn übernehmen. Nur Strategien wie das Drehen des Kopfes helfen.',
  bilateralNote: 'Dieselbe Bahn ist beidseitig geschädigt; auch die Seite, die übernehmen könnte, ist betroffen. Die Kompensation ist begrenzt.',
  bottleneckNote: (sites) => [
    sites.includes('midbrain') ? 'Die Hirnschenkel des Mittelhirns bilden einen Engpass: Kortikospinale und kortikonukleäre Bahnen jeder Seite verlaufen gemeinsam durch den jeweiligen Hirnschenkel. Bei beidseitiger Schädigung sind Hauptbahn und Ersatzwege zugleich unterbrochen; deshalb ist die Erholung deutlich schlechter als nach einem hemisphärischen Schlaganfall mit ähnlichem Defizit.' : '',
    sites.includes('pons') || sites.length === 0 ? 'Die ventrale Brücke bildet einen Engpass: Beide kortikospinalen und kortikonukleären Bahnen sowie viele kortikoretikuläre Fasern verlaufen dort gemeinsam. Hauptbahnen und Ersatzwege werden zugleich unterbrochen; deshalb ist die Erholung beim Locked-in-Syndrom deutlich schlechter als nach einem hemisphärischen Schlaganfall mit ähnlichem Defizit.' : '',
  ].filter(Boolean).join(' '),
  caveat: 'Die Erholung zeigt nur ein beispielhaftes mittleres Muster, keine Prognose; die tatsächliche Erholung ist individuell sehr unterschiedlich.',
  tagNoBackup: 'kein Ersatzweg', tagCompensated: (pct) => `${pct} kompensiert`, tagEased: (from, to) => `gegenüber dem schwersten Zustand gebessert ${from}→${to}`,
  tagEasedNoBackup: (from, to) => `gebessert ${from}→${to}, da gehemmtes Gewebe sich erholt hat; der abgestorbene Anteil bessert sich nicht`,
  kindExplain: {
    bilateral: 'Beidseitige Steuerung: Auch die andere Hemisphäre kann diese Muskeln oder Funktionen aktivieren; einseitige Läsionen erholen sich meist gut, beidseitige schlecht.',
    parallel: 'Parallele Bahnen: Das retikulospinale System kann proximale und grobe Bewegungen übernehmen, aber keine Feinmotorik; häufig bleiben Spastik und Bewegungssynergien.',
    fine: 'Feinmotorik (unabhängige Fingerbewegungen) beruht fast ausschließlich auf der kortikospinalen Bahn; andere Bahnen können sie kaum ersetzen.',
    partial: 'Benachbarte oder gegenüberliegende Regionen können sich reorganisieren und einen Teil übernehmen.',
    fcp: 'Gemeinsame Endstrecke: Der motorische Hirnnervenkern oder seine Fasern sind der einzige Weg zum Muskel; nach ihrem Absterben kann keine andere Bahn übernehmen.',
    none: 'Diese Funktion hat nur einen Weg (z. B. visueller Kortex oder Netzhaut); nach dessen Absterben kann ihn nichts ersetzen.',
    exempt: 'Eine Spätfolge oder Beschreibung, keine kompensierbare Funktion.',
  },
  funcDeadAndSilenced: 'Beeinträchtigt: Gewebe teilweise abgestorben; überlebendes umgebendes Gewebe ist zusätzlich durch Ödem gehemmt und wird sich erholen',
  funcSilenced: 'Vorübergehend gehemmt: Das Gewebe lebt, ist durch Ödem oder Diaschisis ausgeschaltet und wird sich erholen',
  funcDeadAndRegaining: 'Beeinträchtigt: Gewebe teilweise abgestorben; der überlebende Rest gewinnt seine Funktion noch zurück und wird sich erholen',
  funcRegaining: 'Ausgeschaltet, aber in Erholung: Das Gewebe hat überlebt und gewinnt seine Funktion zurück',
  funcLostCompensating: 'Beeinträchtigt: Das Gewebe ist abgestorben; andere Bahnen übernehmen einen Teil der Funktion',
  funcCompensatedGone: 'Kompensiert: Das Gewebe ist abgestorben, aber andere Bahnen haben genug übernommen, sodass das Defizit nicht mehr auffällt',
  rowSilenced: 'Gehemmt', rowSilencedTitle: 'Vorübergehend gehemmt (Ödem / Diaschisis)', rowCompensated: 'Kompensiert', rowCompensatedTitle: 'Teilweise kompensiert',
  silencedCell: (pct) => `${pct} vorübergehend gehemmt`, compensatedCell: (pct) => `Andere Bahnen haben etwa ${pct} übernommen`,
  rowNihss: 'NIHSS', nihssCell: (n) => `NIHSS-Schätzung ${n}`, hatchLegend: 'Schraffiert: teilweise kompensiert', hatchCell: 'teilweise durch andere Bahnen kompensiert',
  nowSilenced: (ml) => `Das Ödem hat etwa ${ml} mL lebendes Gewebe um die Läsion vorübergehend ausgeschaltet; das Defizit ist daher größer als durch das abgestorbene Gewebe allein. Mit dem Abklingen des Ödems über etwa 1–3 Wochen kehrt diese Funktion zurück.`,
  nowRegaining: (ml) => `Etwa ${ml} mL überlebendes Gewebe gewinnt seine Funktion noch zurück: Nach Rückkehr des Blutflusses (oder Stabilisierung der Penumbra durch Kollateralen) arbeitet es erst nach Stunden bis Tagen wieder, nicht sofort; bei längerer Ischämie langsamer.`,
  nowRemote: 'Auch verbundene entfernte Regionen (z. B. das gegenüberliegende Kleinhirn) sind vorübergehend funktionell gehemmt (Diaschisis); dies bleibt meist klinisch unauffällig und klingt über Wochen ab.',
  nowCompensating: (pct) => `Andere Bahnen übernehmen allmählich einen Teil der verlorenen Funktionen (der typische Kompensationsverlauf ist etwa zu ${pct} abgeschlossen); der größte Anteil erfolgt in den ersten 3 Monaten, danach langsamer.`,
  nowCompensatingLittle: (pct, sites) => `Der typische Kompensationsverlauf ist etwa zu ${pct} abgeschlossen, doch hier wurden die motorischen Hauptbahnen beider Seiten und ihre Ersatzwege gemeinsam in ${deSite(sites)} unterbrochen. Es kann wenig übernommen werden; Extremitätenbewegungen und Sprechen erholen sich meist nur begrenzt.`,
  nowNihssTrend: (peak, at, now) => `Die NIHSS-Schätzung ist vom Höchstwert ${peak} (${at}) auf ${now} gesunken.`,
  improvedLabel: (since) => `Besser als bei ${since}`, noBackupLabel: 'Kein Ersatzweg: keine weitere Besserung', goneWord: 'verschwunden',
  unexaminableLabel: 'Bei dieser Bewusstseinslage nicht untersuchbar',
  unexaminableTitle: 'Die Läsion verursacht diese Defizite weiterhin, doch bei Sopor, Koma oder Bewusstseinsstörung lassen sie sich nicht untersuchen (ein wacher, kooperierender Patient oder dessen eigener Bericht ist nötig). Sie fehlen daher vorübergehend in der Symptomliste und gelten nicht als gebessert; sobald sie untersuchbar sind, werden sie wieder aufgeführt.',
  unexaminableBy: {
    consciousness: { label: 'Bei dieser Bewusstseinslage nicht untersuchbar', title: 'Die Läsion verursacht diese Defizite weiterhin, doch bei Sopor, Koma oder Bewusstseinsstörung lassen sie sich nicht untersuchen (ein wacher, kooperierender Patient oder dessen eigener Bericht ist nötig). Sie fehlen daher vorübergehend in der Symptomliste und gelten nicht als gebessert; sobald sie untersuchbar sind, werden sie wieder aufgeführt.', tag: 'Bewusstsein vermindert' },
    blind: { label: 'Nicht prüfbar: Der Patient sieht nicht', title: 'Die Läsion verursacht diese Defizite weiterhin, doch Gesichter- und Objekterkennung, Lesen, Orientierung, Greifen nach gesehenen Objekten und visuell-räumliche Aufgaben setzen Sehvermögen voraus. Der Patient ist derzeit blind (kortikale Blindheit oder Verlust beider Gesichtsfeldhälften ohne erhaltenes zentrales Sehen). Diese Defizite fehlen daher vorübergehend in der Symptomliste und gelten nicht als gebessert; bei teilweiser Rückkehr des Sehvermögens werden sie wieder aufgeführt.', tag: 'blind' },
    akinetic: { label: 'Nicht untersuchbar: akinetischer Mutismus', title: 'Die Läsion verursacht diese Defizite weiterhin, doch der wache Patient bewegt sich oder spricht kaum und folgt keinen Aufforderungen. Untersuchungen, die Handeln, Antworten oder eigene Angaben erfordern (Praxis, Alien-Hand-Phänomen, Greifen, Erkennen, Lesen, Schreiben, Rechnen, Gedächtnis, Aphasieform usw.), sind nicht möglich. Sie fehlen vorübergehend in der Symptomliste und gelten nicht als gebessert. Beobachtbare Befunde (Abulie, emotionaler Ausdruck) werden weiterhin aufgeführt.', tag: 'akinetischer Mutismus' },
    aphasia: { label: 'Nicht untersuchbar: fehlendes Sprachverständnis (Aphasie)', title: 'Die Läsion verursacht diese Defizite weiterhin, doch der Patient versteht Sprache nicht (mittelschwere oder schwere globale, Wernicke- oder gemischte transkortikale Aphasie). Lesen, Schreiben, Rechnen, Fingerbenennung, verbales Gedächtnis, Defizitbewusstsein und nur subjektiv berichtbare Symptome (Schwindel, Doppelbilder, Hören, Geschmack, Lagesinn, Schmerz usw.) werden sprachlich geprüft und lassen sich von der Aphasie nicht trennen. Sie fehlen vorübergehend und gelten nicht als gebessert. Beidseitige Handapraxie ist durch Nachahmen von Gesten sprachfrei prüfbar und bleibt aufgeführt. Linksseitige Apraxie und Agraphie durch Balkendiskonnektion erfordern den sprachlichen Vergleich von links nicht ausgeführten Befehlen und Schreibaufgaben mit der rechten Hand und fehlen ebenfalls vorübergehend. Mit besserem Sprachverständnis werden die Befunde wieder aufgeführt.', tag: 'Aphasie' },
    paralysed: { label: 'Nicht untersuchbar: Extremität gelähmt', title: 'Die Läsion verursacht diese Defizite weiterhin, doch Extremitätenataxie (Finger-Nase- und Knie-Hacke-Versuch), Bewegungstremor des Arms, Fingerfeinmotorik und das Alien-Hand-Phänomen (selbstständiges Greifen und Tasten) sind nur erkennbar, wenn die betreffende Extremität beweglich ist. Linksseitige Zeichen einer Balkendiskonnektion (Gegeneinanderarbeiten der Hände; Apraxie und Agraphie bei Befehlen und Schreibaufgaben, die rechts gelingen) erfordern bewegliche Hände auf beiden Seiten. Hier kann ein benötigter Arm nicht gegen die Schwerkraft bewegt werden (oder das Bein gar nicht); die Befunde fehlen daher vorübergehend und gelten nicht als gebessert (auch der NIHSS bewertet keine Ataxie der gelähmten Seite). Gang- und Rumpfataxie erfordern Gehen, Stehen und aufrechtes Sitzen: Bei beidseitig fehlender Beinbewegung gegen die Schwerkraft kann der Patient nicht stehen und wegen beidseitiger Rumpfschwäche nicht frei sitzen; Unsicherheit ist dann nicht von Schwäche zu trennen und fehlt ebenfalls (bei nur einem schwachen Bein ist der Rumpf im Sitzen prüfbar). Die Schwäche selbst bleibt aufgeführt und bewertet. Sobald genügend Bewegung möglich ist, erscheinen die übrigen Befunde wieder.', tag: 'gelähmte Extremität' },
  },
  unexaminableMixedLabel: 'Derzeit nicht untersuchbar',
};

const jaSite = (sites: BottleneckSite[]) => sites.includes('midbrain') && sites.includes('pons') ? '中脳の大脳脚と橋腹側' : sites.includes('midbrain') ? '中脳の大脳脚' : '橋腹側';
const ja: RecoveryStrings = {
  statusTitle: '機能の状態', dead: '壊死', deadNote: 'この組織は死滅しており、再生しません。',
  deadLacuneNote: (lost) => `この組織は死滅し再生しません。小さい梗塞（ラクナ）でも密集した神経線維に位置し、この構造の機能を約 ${lost}失わせます。`,
  silenced: '一時的抑制（浮腫／遠隔機能抑制）',
  silencedNote: (edema, remote) => `組織は生存していますが、${edema && remote ? '周囲の浮腫と遠隔機能抑制' : edema ? '周囲の浮腫' : '遠隔機能抑制（結合する領域の損傷による機能低下）'}で一時的に機能を停止しています。${edema ? '約 1–3 週で浮腫が軽減すると' : '数週のうちに'}機能が回復します。`,
  regaining: '生存し、機能回復中', regainingNote: '組織は生存し壊死しませんが、まだ機能していません。数時間から数日かけて回復し、虚血が長いほど遅くなります。',
  compensated: '部分的に代償', compensatedNote: (pct) => `他の神経経路が、壊死によって失われた機能の約 ${pct}を代償しています。代償の大部分は最初の 3 か月に進み、その後は遅くなりますが、さらなる改善もあり得ます。`,
  compensatedLittle: '代償は限定的と予想', compensatedLittleNote: (pct) => pct ? `他の経路が代償したのは、現在約 ${pct}のみです。` : '',
  noBackup: 'この機能に代替経路なし', noBackupNote: 'この機能には経路が 1 本しかありません（例：脳神経核、視覚皮質）。壊死すると他の経路では代償できず、頭を回すなどの戦略で補います。',
  bilateralNote: '同じ経路が両側で損傷し、代償を担う反対側も損傷しているため、代償は限定的です。',
  bottleneckNote: (sites) => [
    sites.includes('midbrain') ? '中脳の大脳脚はボトルネックです。各側の皮質脊髄路と皮質核路が同側の大脳脚に密集し、両側損傷では主要経路と代替経路が同時に遮断されます。同程度の障害を伴う半球脳卒中より回復は不良です。' : '',
    sites.includes('pons') || sites.length === 0 ? '橋腹側はボトルネックです。両側の皮質脊髄路、皮質核路、多くの皮質網様体線維が密集し、主要経路と代替経路が同時に遮断されます。閉じ込め症候群の回復は同程度の障害を伴う半球脳卒中より不良です。' : '',
  ].filter(Boolean).join(' '),
  caveat: '回復曲線は模式的な集団平均であり、予後ではありません。実際の回復には大きな個人差があります。',
  tagNoBackup: '代替経路なし', tagCompensated: (pct) => `${pct} 代償`, tagEased: (from, to) => `最重症時から改善 ${from}→${to}`,
  tagEasedNoBackup: (from, to) => `最重症時から改善 ${from}→${to}：一時的に抑制された組織が回復したためで、壊死部分は改善しません`,
  kindExplain: {
    bilateral: '両側性支配：反対側の半球も筋や機能を制御でき、片側損傷では比較的よく回復しますが、両側では困難です。',
    parallel: '並行経路：網様体脊髄路などが近位・粗大運動を代償できますが、巧緻運動は戻らず、痙縮や共同運動を伴うことが多いです。',
    fine: '巧緻運動（指の独立運動）はほぼ皮質脊髄路に依存し、他の経路では代替しにくく、回復は限定的です。',
    partial: '周囲または反対側の領域が再編成して一部を代償できます。',
    fcp: '最終共通路：脳神経運動核やその線維が筋への唯一の出口で、壊死すると他の経路は代替できません。',
    none: 'この機能は経路が 1 本のみです（例：視覚皮質、網膜）。壊死すると他の経路は代替できません。',
    exempt: 'これは遅発の結果や記述であり、代償できる機能ではありません。',
  },
  funcDeadAndSilenced: '障害あり：一部が壊死し、周囲の生存組織も浮腫で一時的に抑制；生存部分は回復',
  funcSilenced: '一時的抑制：組織は生存し、浮腫や遠隔機能抑制で機能停止；回復します',
  funcDeadAndRegaining: '障害あり：一部が壊死し、残りは生存して機能回復中；生存部分は回復',
  funcRegaining: '一時停止、回復します：組織は生存し機能回復中', funcLostCompensating: '障害あり：組織は壊死し、他の経路が一部を代償中',
  funcCompensatedGone: '代償済み：組織は壊死していますが、他の経路が代償し障害は目立たなくなっています',
  rowSilenced: '抑制', rowSilencedTitle: '一時的抑制（浮腫／遠隔機能抑制）', rowCompensated: '代償', rowCompensatedTitle: '部分的に代償',
  silencedCell: (pct) => `${pct} 一時的抑制`, compensatedCell: (pct) => `他の経路が約 ${pct}代償`, rowNihss: 'NIHSS', nihssCell: (n) => `NIHSS 推定 ${n}`,
  hatchLegend: '斜線：部分的代償', hatchCell: '他の経路が部分的に代償',
  nowSilenced: (ml) => `浮腫により病変周囲の生存組織約 ${ml} mL が一時的に機能停止し、現在の障害は壊死範囲より大きくなっています。約 1–3 週で浮腫が軽減すると、この機能は回復します。`,
  nowRegaining: (ml) => `生存組織約 ${ml} mL は機能回復中です。血流回復（または側副血行がペナンブラを維持）後も、機能再開には数時間から数日かかり、直ちには回復しません。虚血が長いほど遅くなります。`,
  nowRemote: '損傷領域と結合する遠方の領域（例：対側小脳）も一時的に機能低下します（遠隔機能抑制）。通常は明らかな症状なく、数週で軽減します。',
  nowCompensating: (pct) => `他の神経経路が失われた機能の一部を徐々に代償しています（典型的な代償過程の約 ${pct}まで進行）。大部分は最初の 3 か月に起こり、その後は遅くなります。`,
  nowCompensatingLittle: (pct, sites) => `典型的な代償過程の約 ${pct}まで進みましたが、両側の主要運動経路と代替経路が${jaSite(sites)}で同時に遮断されています。代償できる機能は少なく、四肢と発話の回復は通常限定的です。`,
  nowNihssTrend: (peak, at, now) => `NIHSS 推定は最大 ${peak}（${at}）から ${now}に低下。`, improvedLabel: (since) => `${since}より改善`, noBackupLabel: '代替経路なし、さらなる改善なし', goneWord: '消失',
  unexaminableLabel: '意識低下により現在診察不能', unexaminableTitle: '病変による障害は残っていますが、昏迷・昏睡・意識障害では診察できません（覚醒・協力または本人の訴えが必要）。症状一覧から一時的に除外しますが、改善ではなく、診察可能になると再表示します。',
  unexaminableBy: {
    consciousness: { label: '意識低下により現在診察不能', title: '病変による障害は残っていますが、昏迷・昏睡・意識障害では診察できません（覚醒・協力または本人の訴えが必要）。症状一覧から一時的に除外しますが、改善ではなく、診察可能になると再表示します。', tag: '意識低下' },
    blind: { label: '視覚喪失により現在診察不能', title: '障害は残っていますが、顔・物体認知、読字、道の認識、見た物へのリーチ、視空間機能には視覚が必要です。現在は見えません（皮質盲、または両側の半視野喪失で中心視力も残存せず）。症状一覧から一時的に除外しますが、改善ではなく、視覚が一部回復すると再表示します。', tag: '視覚喪失' },
    akinetic: { label: '無動性無言により現在診察不能', title: '障害は残っていますが、覚醒していても自発運動・発話がほぼなく、指示に従いません。動作、回答、本人の訴えが必要な検査（失行、他人の手、リーチ、物体認知、読み書き計算、記憶、失語型など）は行えません。一時的に除外しますが改善ではありません。観察可能な所見（無為、情動など）は表示します。', tag: '無動性無言' },
    aphasia: { label: '言語理解障害（失語）により現在診察不能', title: '障害は残っていますが、言語を理解できません（中等度以上の全失語、感覚性失語、混合型超皮質性失語）。読み書き計算、指の命名、言語性記憶、障害の認識、本人のみが訴える症状（めまい、複視、聴覚、味覚、位置覚、痛みなど）は言語を介するため失語と区別できず、一時的に除外しますが改善ではありません。両手の失行は動作模倣で言語なしに検査できるため表示します。脳梁離断による左手の失行・失書は、右手との指示動作・書字の比較が必要で一時的に除外します。理解が回復すると再表示します。', tag: '失語' },
    paralysed: { label: '四肢麻痺により現在診察不能', title: '障害は残っていますが、四肢失調（指鼻・踵膝試験）、動作時振戦、指の巧緻運動、他人の手（自発的把握・探索）はその四肢が動かなければ評価できません。脳梁離断による左手の症状（両手の拮抗、右手では可能な指示動作・書字が左手では不可）には両手の運動が必要です。必要な腕が重力に抗して挙上できない（または脚が全く動かない）ため、一時的に除外しますが改善ではありません（NIHSS も麻痺側の失調は評価しません）。歩行・体幹失調は歩行、立位、座位を評価します。両脚を重力に抗して挙上できず立てない場合、両側体幹も弱く自力で座位を保てず、失調と筋力低下を区別できないため除外します（片脚のみの筋力低下なら座位で体幹を評価可能）。筋力低下自体は表示・採点し、運動が回復すると他の所見を再表示します。', tag: '四肢麻痺' },
  }, unexaminableMixedLabel: '現在診察不能',
};
export const RECOVERY_UI: Record<Lang, RecoveryStrings> = { 'zh-TW': zh, en, 'zh-CN': cn, de, ja };
