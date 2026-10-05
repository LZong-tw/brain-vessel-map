/**
 * Named stroke syndromes, detected from which regions are dysfunctional (not merely from
 * which vessel is blocked — the same vessel can produce different syndromes depending on
 * collaterals and anatomy). Sources: Caplan's Stroke (5th ed.); Tatu et al., Neurology 1996
 * (brainstem territories); Sciacca et al., Radiographics 2019 (general review of brainstem
 * anatomy and syndromes; its full text was not checked rule by rule); Schmahmann, Stroke 2003
 * and Bogousslavsky, Regli & Uske, Neurology 1988 (thalamus: four arterial territories, four
 * syndromes); Lazzaro et al., AJNR 2010 and Arauz et al., J Stroke Cerebrovasc Dis 2014 (artery of
 * Percheron with and without the midbrain). Pontine patterns: Kumral et al., J Neurol 2002 (150 isolated pontine infarcts) and
 * Bassetti et al., Neurology 1996 (36); locked-in varieties: Bauer et al., J Neurol 1979.
 *
 * Two kinds of label. One named for its signs (neglect, Wallenberg, pure sensory stroke,
 * locked-in …) also needs those signs in the symptom list shown at the same time (`requires`):
 * the regions alone do not decide it, because weeks later spared pathways may have taken a sign
 * over while the region stays damaged, and the region rules use their own thresholds. One named
 * for the vascular pattern of the damaged tissue (a territory, a watershed infarct: `pattern`)
 * stays while the tissue is damaged, and is marked clinically silent when no symptom from that
 * side is left.
 * TODO(medical-review)
 */

import type { L, Side } from './types';

export interface SyndromeCtx {
  /** dysfunctional fraction (0–1) of region `base` on `side` */
  f(base: string, side: Side): number;
  has(base: string, side: Side, thr?: number): boolean;
  hasAny(bases: string[], side: Side, thr?: number): boolean;
  both(base: string, thr?: number): boolean;
  occluded(base: string, side?: Side | 'm'): boolean;
  reversed(base: string, side?: Side | 'm'): boolean;
  /** affected mL in border-zone beds of a hemisphere and in total */
  border(side: Side): { border: number; total: number; kinds: string[] };
  /** number of dysfunctional cortical regions on a side */
  cortexCount(side: Side, thr?: number): number;
  map: number;
  /** region `base` on `side` is damaged by a lacune (one branch of a perforator bundle) alone */
  lacune(base: string, side: Side): boolean;
  /**
   * the single-branch (lacunar) occlusions of perforator bundle `base` on `side` that have begun
   * by the displayed time, in time order: when each began and when it reopened by itself (null:
   * it lasts)
   */
  branchEpisodes(base: string, side: Side): { fromH: number; toH: number | null }[];
  /** the displayed time (h, on the timeline clock) */
  tH: number;
  /**
   * severity (0 when absent) of a current, non-delayed symptom: on body side `side` (a symptom
   * listed for both sides counts for each), or its highest severity anywhere when `side` is left out
   */
  sym(id: string, side?: Side): number;
}

/** What the symptom list shown at the same time contains (for the signs a label needs). */
export interface SymptomQuery {
  /** present at all */
  has(id: string): boolean;
  /** present on this body side (a symptom of both sides counts for each) */
  on(id: string, bodySide: Side): boolean;
  /** produced by a region on this side of the brain (for symptoms without a body side) */
  from(id: string, lesionSide: Side): boolean;
}

export type SyndromeGroup = 'anterior' | 'posterior' | 'brainstem' | 'cerebellar' | 'lacunar' | 'watershed' | 'other';

export interface SyndromeDef {
  id: string;
  group: SyndromeGroup;
  name: L;
  desc: L;
  /** evaluated per side (lesion side) */
  lateral: boolean;
  test: (c: SyndromeCtx, side: Side) => boolean;
  /**
   * a label named for its signs: those signs must be in the symptom list shown at the same time
   * (`side` is the lesion side; 'r' for labels that are not lateral)
   */
  requires?: (q: SymptomQuery, side: Side) => boolean;
  /**
   * a label named for the vascular pattern of the damaged tissue (territory, watershed): it stays
   * while the tissue is damaged and is marked clinically silent when no symptom from that side
   * (from any region, for a bilateral label) is left
   */
  pattern?: boolean;
  /** hides these syndromes when this one matches on the same side */
  supersedes?: string[];
}

const other = (s: Side): Side => (s === 'r' ? 'l' : 'r');
/** any weakness or incoordination of a body side: what a "pure sensory" stroke does not have */
const MOTOR_OR_ATAXIC = ['face_weak', 'arm_weak', 'arm_weak_proximal', 'leg_weak', 'hand_clumsy', 'ataxia_limb'];
const weakOn = (q: SymptomQuery, bodySide: Side) => ['arm_weak', 'leg_weak'].some((id) => q.on(id, bodySide));

const MCA_CORTEX = [
  'precentral_face_arm',
  'postcentral_face_arm',
  'broca',
  'prefrontal_dorsolateral',
  'insula',
  'supramarginal',
  'angular',
  'superior_temporal_posterior',
  'temporal_lateral',
];

const mcaCount = (c: SyndromeCtx, s: Side) => MCA_CORTEX.filter((b) => c.has(b, s, 0.3)).length;

/** perforator bundles whose single-branch attacks make up a capsular or pontine warning syndrome */
const WARNING_BUNDLES = ['lenticulostriate', 'acha', 'pontine_paramedian_rostral', 'pontine_paramedian_caudal', 'pontine_paramedian_inferior'];
/** a second attack within this many hours of one that cleared (Paul 2012: all within 24 h) */
const WARNING_WITHIN_H = 24;
/** the label stays this long after the latest attack or occlusion of that branch (7-day stroke risk, Paul 2012) */
const WARNING_SHOWN_H = 168;
/**
 * from the start of a second attack of the same branch within a day of one that had cleared, for
 * a week after its latest attack (or the lasting occlusion that followed): a crescendo of
 * stereotyped lacunar TIAs
 */
function crescendo(episodes: { fromH: number; toH: number | null }[], tH: number): boolean {
  for (let j = 1; j < episodes.length; j++) {
    const a = episodes[j - 1];
    const b = episodes[j];
    if (a.toH !== null && a.toH <= b.fromH && b.fromH - a.fromH <= WARNING_WITHIN_H) {
      const last = episodes[episodes.length - 1].fromH;
      return tH >= b.fromH && tH < last + WARNING_SHOWN_H;
    }
  }
  return false;
}

/**
 * A hemisphere whose dysfunction is a border-zone (watershed) picture: at least 4 mL in border-zone
 * beds, and at least 35 % of all its dysfunctional tissue. The watershed label uses it, and so does
 * the border-zone motor pattern of the motor strip (simulate → clinical.aggregateSymptoms).
 */
export const isWatershedPicture = (b: { border: number; total: number }) => b.border >= 4 && b.border / Math.max(b.total, 1e-6) >= 0.35;

/** both sides of the ventral pons (upper or lower) involved, at least `thr` */
const bothBases = (c: SyndromeCtx, thr: number) => c.both('pons_rostral_basis', thr) || c.both('pons_caudal_basis', thr);
/** not awake: coma, or a disorder of consciousness after it (C3-F1, C3-F2) */
const unaware = (c: SyndromeCtx) => c.sym('coma') > 0 || c.sym('disorder_of_consciousness') > 0;
/** nothing moves in any limb (Bauer's classical locked-in syndrome) */
const limbsParalysed = (c: SyndromeCtx) =>
  (['r', 'l'] as Side[]).every((sd) => c.sym('arm_weak', sd) >= 3 && c.sym('leg_weak', sd) >= 3);
/**
 * classical locked-in: both ventral pons, awake, every limb paralysed (the label also needs the
 * anarthria, `requires`)
 */
const classicalLockedIn = (c: SyndromeCtx) => bothBases(c, 0.4) && !unaware(c) && limbsParalysed(c);
/** the other side of the ventral pons is spared (below the symptom threshold) */
const otherBasesSpared = (c: SyndromeCtx, s: Side) => {
  const o: Side = s === 'r' ? 'l' : 'r';
  return !c.has('pons_rostral_basis', o, 0.25) && !c.has('pons_caudal_basis', o, 0.25);
};
/** what a bilateral ventral pontine label hides: the one-sided pontine and lateral syndromes */
const PONTINE_ONE_SIDED = ['pontine_ventral', 'pontine_anteromedial', 'pontine_lacunar', 'foville', 'one_and_half', 'aica', 'sca'];

export const SYNDROMES: SyndromeDef[] = [
  // ─────────────── anterior circulation ───────────────
  {
    id: 'ica_territory',
    pattern: true,
    group: 'anterior',
    lateral: true,
    name: { zh: '內頸動脈供應區梗塞（前＋中大腦動脈區）', en: 'ICA-territory infarction (ACA + MCA territories)' },
    desc: {
      zh: '前、中大腦動脈區同時受損：對側完全偏癱（腿也重）、半身感覺喪失、偏盲、雙眼偏向病灶側；左側常合併全面性失語，右側合併嚴重忽略。水腫風險極高。',
      en: 'Both ACA and MCA territories: dense contralateral hemiplegia including the leg, hemisensory loss, hemianopia, gaze deviation; global aphasia (left) or severe neglect (right). Very high oedema risk.',
    },
    test: (c, s) => mcaCount(c, s) >= 4 && c.has('paracentral', s, 0.3) && c.hasAny(['medial_frontal', 'cingulate'], s, 0.3),
    supersedes: ['mca_complete', 'mca_superior', 'mca_inferior', 'aca'],
  },
  {
    id: 'mca_complete',
    pattern: true,
    group: 'anterior',
    lateral: true,
    name: { zh: '完全性中大腦動脈症候群（M1）', en: 'Complete MCA syndrome (M1)' },
    desc: {
      zh: '對側臉與手臂重於腿的偏癱與感覺喪失、對側同側偏盲、雙眼偏向病灶側。左側（優勢半球）：全面性失語；右側：左側忽略、病覺缺失。豆紋動脈區（基底核、內囊）因沒有側枝，常最先壞死。',
      en: 'Contralateral face/arm > leg weakness and sensory loss, homonymous hemianopia, gaze deviation towards the lesion. Left (dominant): global aphasia; right: left neglect and anosognosia. The lenticulostriate territory (basal ganglia, capsule) has no collaterals and usually dies first.',
    },
    test: (c, s) => mcaCount(c, s) >= 4 && c.hasAny(['putamen', 'ic_posterior_limb', 'ic_genu'], s, 0.3),
    supersedes: ['mca_superior', 'mca_inferior'],
  },
  {
    id: 'mca_superior',
    pattern: true,
    group: 'anterior',
    lateral: true,
    name: { zh: '中大腦動脈上分支症候群', en: 'MCA superior-division syndrome' },
    desc: {
      zh: '對側臉與手臂無力及感覺喪失（腿較輕），雙眼偏向病灶側；左側受損時為表達性（布洛卡）失語——聽得懂但說不出來。',
      en: "Contralateral face and arm weakness and sensory loss (leg spared), gaze deviation; on the left, expressive (Broca's) aphasia — understands but cannot speak fluently.",
    },
    test: (c, s) =>
      c.has('precentral_face_arm', s, 0.3) &&
      c.hasAny(['broca', 'prefrontal_dorsolateral'], s, 0.3) &&
      !c.has('superior_temporal_posterior', s, 0.3),
  },
  {
    id: 'mca_inferior',
    pattern: true,
    group: 'anterior',
    lateral: true,
    name: { zh: '中大腦動脈下分支症候群', en: 'MCA inferior-division syndrome' },
    desc: {
      zh: '通常沒有明顯無力。左側：接受性（韋尼克）失語——說話流利卻聽不懂、答非所問，常被誤以為精神錯亂；右側：左側忽略、空間障礙。常合併視野缺損：顳葉的視放射（Meyer 環）造成對側上象限偏盲，頂葉深部的視放射也受損時則為同側偏盲。',
      en: "Usually little weakness. Left: receptive (Wernicke's) aphasia — fluent but meaningless speech, often mistaken for confusion; right: left neglect and visuospatial problems. Often a field defect: an upper quadrantanopia from the temporal optic radiation (Meyer's loop), or a hemianopia when the deep parietal radiation is hit too.",
    },
    test: (c, s) =>
      c.hasAny(['superior_temporal_posterior', 'angular'], s, 0.3) && !c.has('precentral_face_arm', s, 0.3),
  },
  {
    id: 'aca',
    pattern: true,
    group: 'anterior',
    lateral: true,
    name: { zh: '前大腦動脈症候群', en: 'ACA syndrome' },
    desc: {
      zh: '對側腿明顯無力與感覺喪失（手臂較輕、臉通常正常）、尿失禁、意志缺失；可能出現異己手、左側受損時經皮質運動性失語。',
      en: 'Contralateral leg weakness and sensory loss (arm milder, face spared), urinary incontinence, abulia; possibly alien hand and, on the left, transcortical motor aphasia.',
    },
    test: (c, s) => c.has('paracentral', s, 0.3) && c.hasAny(['medial_frontal', 'cingulate'], s, 0.3),
  },
  {
    id: 'aca_bilateral',
    pattern: true,
    group: 'anterior',
    lateral: false,
    name: { zh: '雙側前大腦動脈梗塞', en: 'Bilateral ACA infarction' },
    desc: {
      zh: '雙腿無力（易誤以為脊髓病變）、無動性緘默、尿失禁。常見於一側 A1 發育不良、兩側前大腦動脈都靠同一條 A1 供血時。',
      en: 'Weakness of both legs (mimicking a spinal lesion), akinetic mutism and incontinence. Typical when one A1 is hypoplastic and both ACAs depend on a single A1.',
    },
    test: (c) => c.both('paracentral', 0.3) || c.both('medial_frontal', 0.4),
  },
  {
    id: 'acha',
    pattern: true,
    group: 'anterior',
    lateral: true,
    name: { zh: '前脈絡叢動脈症候群', en: 'Anterior choroidal artery syndrome' },
    // Palomeras E et al. Acta Neurol Scand 2008;118:42-47 (PMID 18205882): of 42 consecutive
    // AChA infarcts 83.3 % presented with a lacunar syndrome, though often not a lacunar infarct;
    // 10 had an NIHSS > 7; involvement of the superficial territory meant a more severe stroke and
    // a worse outcome. Hupperts RM et al. Brain 1994;117:825-834 (PMID 7922468): lacunar or
    // cortical syndromes as often as with other small deep infarcts (C6-F4).
    desc: {
      zh: '完整的三「偏」——對側偏癱（內囊後肢）、偏身感覺減退、同側偏盲（視徑／外側膝狀體）——是整條動脈阻塞的典型，但並不常見：大多數前脈絡叢動脈梗塞以腔隙症候群表現（83%，常是單純無力或感覺運動型），即使梗塞範圍比腔隙大。梗塞延伸到表淺區域（顳葉內側、視徑）時較嚴重、失能較多。',
      en: 'The full triad — contralateral hemiplegia (posterior limb of the internal capsule), hemisensory loss and homonymous hemianopia (optic tract / LGB) — is the classic picture of the whole artery blocked, but uncommon: most AChA infarcts present with a lacunar syndrome (83 %, often pure motor or sensorimotor), even when the infarct is larger than a lacune. Infarcts that reach the superficial territory (medial temporal lobe, optic tract) are more severe and more disabling.',
    },
    test: (c, s) => c.has('ic_posterior_limb', s, 0.3) && c.has('optic_tract', s, 0.3) && mcaCount(c, s) < 3,
    // the AChA also feeds part of the lateral geniculate body
    supersedes: ['thalamic_posterior_choroidal'],
  },
  {
    id: 'gerstmann',
    group: 'anterior',
    lateral: true,
    name: { zh: 'Gerstmann 症候群', en: 'Gerstmann syndrome' },
    desc: {
      zh: '左角迴受損的四聯症：失寫、失算、手指失認、左右混淆，常合併失讀。',
      en: 'Left angular gyrus tetrad: agraphia, acalculia, finger agnosia and left–right confusion, often with alexia.',
    },
    test: (c, s) => s === 'l' && c.has('angular', 'l', 0.4),
    // the modelled parts of the tetrad (left–right confusion is not a separate symptom); the
    // tetrad cannot be tested in a patient whose aphasia leaves too little comprehension (global,
    // Wernicke or mixed transcortical aphasia), so the label is not given then (C1-F1)
    requires: (q) =>
      ['agraphia', 'acalculia', 'finger_agnosia'].every((id) => q.from(id, 'l')) &&
      !['aphasia_global', 'aphasia_wernicke', 'aphasia_mixed_tc'].some((id) => q.has(id)),
  },
  {
    // the critical sites: the angular gyrus in MCA strokes and the parahippocampal region in PCA
    // strokes (Mort DJ et al. Brain 2003;126:1986-1997, PMID 12821519), the superior temporal
    // cortex (Karnath HO et al. Nature 2001;411:950-953, PMID 11418859; disputed by Mort), the
    // inferior frontal gyrus (Husain M, Kennard C. J Neurol 1996;243:652-657, PMID 8892067) and
    // the basal ganglia (Karnath HO et al. Brain 2002;125:350-360, PMID 11844735). A superior
    // parietal lesion alone is not one (C1-F5).
    id: 'neglect',
    group: 'anterior',
    lateral: true,
    name: { zh: '右半球症候群：左側忽略', en: 'Right-hemisphere syndrome: left neglect' },
    desc: {
      zh: '忽略左半邊的空間與身體、否認自己癱瘓（病覺缺失）、穿衣與建構失用。常見於右頂下小葉（角迴、緣上迴）、顳上迴、額下迴或基底核受損，後大腦動脈中風則與海馬旁迴有關。患者常不覺得自己有問題，是跌倒與復健困難的主要原因。',
      en: 'Ignores the left side of space and body, denies the paralysis (anosognosia), dressing and constructional apraxia. Typical of right inferior parietal (angular, supramarginal), superior temporal, inferior frontal or basal ganglia lesions, and of the parahippocampal region in PCA strokes. Patients often feel nothing is wrong — a major cause of falls and poor rehabilitation.',
    },
    test: (c, s) => s === 'r' && c.hasAny(['angular', 'supramarginal', 'superior_temporal_posterior', 'parahippocampal'], 'r', 0.35),
    requires: (q) => q.from('neglect', 'r'),
  },

  // ─────────────── posterior cerebral ───────────────
  {
    id: 'pca',
    pattern: true,
    group: 'posterior',
    lateral: true,
    name: { zh: '後大腦動脈皮質症候群', en: 'PCA cortical syndrome' },
    desc: {
      zh: '對側同側偏盲（常保留中心視力），可合併記憶障礙（海馬迴）、顏色或臉孔辨識障礙。病人常只抱怨「看東西怪怪的」，容易延誤就醫。',
      en: 'Contralateral homonymous hemianopia (often macular-sparing), sometimes with memory loss (hippocampus) and colour or face recognition problems. Patients may only say "vision feels odd" — easy to miss.',
    },
    test: (c, s) => c.hasAny(['cuneus', 'lingual'], s, 0.3),
    supersedes: ['thalamic_posterior_choroidal'],
  },
  {
    id: 'alexia_without_agraphia',
    group: 'posterior',
    lateral: true,
    name: { zh: '失讀不失寫（純失讀症）', en: 'Alexia without agraphia (pure alexia)' },
    desc: {
      zh: '左枕葉＋胼胝體壓部受損：右側偏盲，而左視野的文字資訊無法經壓部傳到左半球語言區。病人能寫字，卻讀不出自己剛寫的字。',
      en: 'Left occipital lobe + splenium: right hemianopia, and words seen in the left field cannot cross the splenium to the language areas. The patient can write but cannot read what they just wrote.',
    },
    test: (c, s) => s === 'l' && c.hasAny(['cuneus', 'lingual', 'occipital_pole'], 'l', 0.3) && c.has('splenium', 'l', 0.3),
  },
  {
    // both banks of the calcarine fissure on both sides (one bank on each side leaves bilateral
    // quadrantic defects; spared poles leave central vision); named for the blindness itself
    // (C1-F7). Anton syndrome: 3 of 25 in Aldrich MS et al. Ann Neurol 1987;21:149-158 (PMID 3827223).
    id: 'cortical_blindness',
    group: 'posterior',
    lateral: false,
    name: { zh: '皮質盲（可合併 Anton 症候群）', en: 'Cortical blindness (± Anton syndrome)' },
    desc: {
      zh: '雙側枕葉受損：完全看不見但瞳孔反射正常。少數病人（25 人中約 3 人）堅稱自己看得到並編造所見（Anton 症候群）。常見於基底動脈頂端栓塞；中風造成的皮質盲恢復通常很差。',
      en: 'Both occipital lobes: complete blindness with normal pupillary reflexes. A few patients (about 3 in 25) insist they can see and confabulate (Anton syndrome). Typical of basilar-tip emboli; cortical blindness from stroke usually recovers poorly.',
    },
    test: (c) => (['r', 'l'] as Side[]).every((s) => c.has('cuneus', s, 0.3) && c.has('lingual', s, 0.3)),
    requires: (q) => q.has('cortical_blindness'),
    supersedes: ['pca'],
  },
  {
    id: 'balint',
    group: 'posterior',
    lateral: false,
    name: { zh: 'Balint 症候群', en: 'Balint syndrome' },
    desc: {
      zh: '雙側頂枕交界受損：一次只能看到一樣東西（同時性失認）、伸手抓不準（視覺性運動失調）、眼睛無法自主移向目標。常見於雙側分水嶺梗塞。',
      en: 'Bilateral parieto-occipital damage: sees only one object at a time (simultanagnosia), misreaches (optic ataxia) and cannot voluntarily direct gaze (ocular apraxia). Often from bilateral watershed infarcts.',
    },
    test: (c) =>
      c.hasAny(['superior_parietal', 'lateral_occipital', 'angular'], 'r', 0.35) &&
      c.hasAny(['superior_parietal', 'lateral_occipital', 'angular'], 'l', 0.35),
  },
  {
    id: 'thalamic_sensory',
    group: 'posterior',
    lateral: true,
    name: { zh: '視丘感覺症候群（Dejerine–Roussy）', en: 'Thalamic sensory syndrome (Dejerine–Roussy)' },
    // pain after thalamic stroke: 14 % after any, 24 % after a geniculothalamic one, onset in the
    // first week in 36 % (Nasreddine ZS, Saver JL. Neurology 1997;48:1196-1199, PMID 9153442); the
    // central_pain symptom is listed as possible from 2 weeks (C10-F1, F2)
    desc: {
      zh: '視丘下外側（視丘膝狀體動脈）區：對側半身（臉、手、腳）所有感覺減退，加上運動失調，起初常有輕微、數週內消失的無力。之後可能出現頑固的燒灼痛（視丘痛）：任何視丘中風後約七分之一，視丘膝狀體動脈區中風後約四分之一，右側病灶比較常見；約三分之一在第一週就開始，其他在幾週到幾個月後。',
      en: 'Inferolateral (thalamogeniculate) territory: loss of all sensation over the opposite half of the body (face, arm, leg) with ataxia, and at first often a mild weakness that passes within weeks. Intractable burning pain (thalamic pain) may follow: about 1 in 7 after any thalamic stroke, about 1 in 4 after a stroke in the geniculothalamic territory, more often after right-sided lesions; about a third start in the first week, the rest weeks to months later.',
    },
    // the inferolateral (thalamogeniculate) territory: hemisensory loss, hemiparesis, hemiataxia
    // and pain (Schmahmann JD. Stroke 2003;34:2264-2278, PMID 12933968); one branch alone is a
    // pure sensory lacune, named as such (C6-F7)
    test: (c, s) => c.has('thalamus_ventrolateral', s, 0.3) && !c.lacune('thalamus_ventrolateral', s),
    supersedes: ['lacunar_pure_sensory'],
  },
  {
    id: 'thalamic_tuberothalamic',
    pattern: true,
    group: 'posterior',
    lateral: true,
    name: { zh: '視丘前部（結節視丘動脈）梗塞', en: 'Anterior (tuberothalamic) thalamic infarction' },
    desc: {
      zh: '意識清醒但淡漠、缺乏主動，思考與動作一再重複（固著），新事物記不住（左側偏語言、右側偏視覺空間），個性改變；左側另有找字困難、說話小聲，理解與複誦保留。照指示做表情正常，自然地笑時對側臉卻動得少（情緒性臉部無力）。數月內多明顯改善，記憶障礙與淡漠最常留下。',
      en: 'Awake but apathetic and lacking initiative, with perseveration in thinking and action, poor new learning (verbal after left, visuospatial after right lesions) and personality change; on the left also word-finding difficulty and soft speech with comprehension and repetition preserved. The face moves on command but less on the opposite side in a spontaneous smile (emotional facial paresis). Most improves within months; memory loss and apathy are what most often remain.',
    },
    test: (c, s) => c.has('thalamus_anterior', s, 0.3),
  },
  {
    id: 'thalamic_paramedian_unilateral',
    pattern: true,
    group: 'posterior',
    lateral: true,
    name: { zh: '單側視丘旁正中梗塞', en: 'Unilateral paramedian thalamic infarction' },
    desc: {
      zh: '起初嗜睡，記憶、注意力與執行功能變差，去抑制或個性改變、主動性降低，常有垂直眼動障礙與輕微步態不穩。左側另有語言障礙，右側可能有左側忽略。右側病灶的預後很好；左側病灶常留下額葉型認知障礙（一項 46 人研究：左側 90%、右側 33%、雙側 100%）。',
      en: 'Drowsy at first, with impaired memory, attention and executive function, disinhibition or personality change, loss of initiative, often vertical gaze palsy and mild gait ataxia. Language problems on the left, possible left neglect on the right. Outcome is excellent after right-sided lesions; left-sided ones often leave frontal-type cognitive deficits (in a study of 46 patients: 90% of left, 33% of right and 100% of bilateral strokes).',
    },
    test: (c, s) => {
      const o: Side = s === 'r' ? 'l' : 'r';
      return c.has('thalamus_paramedian', s, 0.3) && !c.has('thalamus_paramedian', o, 0.3) && !c.has('midbrain_paramedian', s, 0.3);
    },
  },
  {
    id: 'thalamomesencephalic',
    pattern: true,
    group: 'posterior',
    lateral: true,
    name: { zh: '旁正中視丘中腦梗塞', en: 'Paramedian thalamomesencephalic infarction' },
    desc: {
      zh: '同一條旁正中動脈也供應中腦上部時，視丘與中腦一起梗塞：嗜睡、記憶障礙、垂直眼動障礙，加上同側動眼神經麻痺與對側運動失調（中腦）。對側手臂的顫抖可能在數週到數月後才出現。',
      en: 'When the same paramedian artery also feeds the upper midbrain, thalamus and midbrain infarct together: drowsiness, amnesia and vertical gaze palsy plus a same-side oculomotor palsy and opposite-side ataxia (midbrain). A tremor of the opposite arm may follow weeks to months later.',
    },
    test: (c, s) => c.has('thalamus_paramedian', s, 0.3) && c.has('midbrain_paramedian', s, 0.3),
    supersedes: ['claude'],
  },
  {
    id: 'thalamic_posterior_choroidal',
    pattern: true,
    group: 'posterior',
    lateral: true,
    name: { zh: '視丘後部（後脈絡叢動脈）梗塞', en: 'Posterior (posterior choroidal) thalamic infarction' },
    desc: {
      zh: '外側膝狀體與視丘枕：對側的象限偏盲（水平扇形偏盲很少見，但提示外側膝狀體受損），有時合併半身感覺減退；左側可能有經皮質失語，也可能有記憶障礙。數週後少數人出現對側手的抽動、扭轉與不穩，或疼痛。這種梗塞少見，多由小血管疾病造成，長期失能通常輕微。',
      en: 'Lateral geniculate body and pulvinar: a quadrantanopia on the opposite side (a horizontal sectoranopia is rare but points to the lateral geniculate body), sometimes with hemisensory loss; on the left possibly a transcortical aphasia, and memory problems. Weeks later a few develop a jerky, dystonic, unsteady opposite hand, or pain. These infarcts are rare, mostly from small-vessel disease, and late disability is usually slight.',
    },
    test: (c, s) => c.has('thalamus_posterior', s, 0.3) && !c.hasAny(['cuneus', 'lingual', 'occipital_pole'], s, 0.3),
  },
  {
    id: 'thalamic_paramedian_bilateral',
    pattern: true,
    group: 'posterior',
    lateral: false,
    name: { zh: '雙側視丘旁正中梗塞（Percheron 動脈）', en: 'Bilateral paramedian thalamic infarction (artery of Percheron)' },
    desc: {
      zh: '嗜睡甚至昏迷、嚴重記憶障礙、垂直凝視麻痺，執行功能與行為改變常持續；昏迷之後留下的是長期嗜睡（睡眠需求增加），而不是昏迷。當雙側視丘穿通動脈來自同一條 Percheron 動脈時，一個小栓子就能造成雙側梗塞。不含中腦時長期預後通常不錯（一個 15 人的系列中，不含中腦者 6 人中 4 人、含中腦者 8 人中 2 人在約 4.5 年後達 mRS ≤ 2）；中腦也梗塞時另列為「雙側旁正中視丘中腦梗塞」。視丘前部也梗塞時，記憶與執行功能受損更廣。',
      en: 'Hypersomnolence up to coma, severe amnesia and vertical gaze palsy, with executive and behavioural changes that often persist; what remains after the coma is persistent hypersomnia (a raised need for sleep), not coma. When both thalamoperforators come from a single artery of Percheron, one small embolus infarcts both sides. Without the midbrain the long-term outcome is usually good (in one series of 15 patients, 4 of 6 without and 2 of 8 with midbrain involvement reached mRS ≤ 2 after about 4.5 years); with the midbrain infarcted too it is listed as bilateral paramedian thalamomesencephalic infarction. When the anterior thalami are infarcted as well, memory and executive function suffer more widely.',
    },
    test: (c) => c.both('thalamus_paramedian', 0.3),
    supersedes: ['claude', 'weber_benedikt', 'thalamic_paramedian_unilateral', 'thalamomesencephalic', 'thalamic_tuberothalamic'],
  },
  {
    id: 'thalamomesencephalic_bilateral',
    pattern: true,
    group: 'posterior',
    lateral: false,
    name: {
      zh: '雙側旁正中視丘中腦梗塞（Percheron 動脈含中腦）',
      en: 'Bilateral paramedian thalamomesencephalic infarction (artery of Percheron with midbrain)',
    },
    desc: {
      zh: '雙側視丘旁正中加上中腦上部，是 Percheron 動脈梗塞最常見的型態（43%，連同視丘前部再 14%）。以眼球運動障礙（兩側動眼神經麻痺、垂直凝視麻痺）與意識障礙為主，加上記憶障礙。在一個小系列中預後比不含中腦時差：15 人中，含中腦者 8 人中 2 人（25%）、不含中腦者 6 人中 4 人（67%）在約 4.5 年後達 mRS ≤ 2。',
      en: 'Both paramedian thalami plus the upper midbrain, the commonest pattern of Percheron infarction (43%, another 14% with the anterior thalami). Eye-movement disorders (bilateral oculomotor palsies, vertical gaze palsy) and impaired consciousness dominate, with amnesia. The outlook was worse than without the midbrain in one small series: of 15 patients, 2 of 8 (25%) with midbrain involvement and 4 of 6 (67%) without reached mRS ≤ 2 after about 4.5 years.',
    },
    test: (c) => c.both('thalamus_paramedian', 0.3) && c.both('midbrain_paramedian', 0.3),
    supersedes: [
      'thalamic_paramedian_bilateral',
      'thalamic_paramedian_unilateral',
      'thalamomesencephalic',
      'thalamic_tuberothalamic',
      'claude',
      'weber_benedikt',
    ],
  },
  {
    id: 'top_of_basilar',
    pattern: true,
    group: 'posterior',
    lateral: false,
    name: { zh: '基底動脈頂端症候群', en: 'Top-of-the-basilar syndrome' },
    desc: {
      zh: '中腦與視丘旁正中（意識改變、垂直眼動障礙、瞳孔異常、記憶障礙）加上枕葉（視野缺損、皮質盲）。可能出現鮮明的幻覺與夢境般的行為（大腦腳幻覺症，Caplan 1980）。意識障礙通常要兩側都受損，單側病灶偶爾也會造成昏迷。常由心因性或椎動脈來源的栓子卡在基底動脈分叉處造成。',
      en: 'Midbrain and paramedian thalami (altered consciousness, vertical gaze and pupil abnormalities, amnesia) plus occipital lobes (field loss, cortical blindness). Vivid hallucinations and dreamlike behaviour can occur (peduncular hallucinosis; Caplan 1980). Reduced consciousness usually needs damage on both sides, though a one-sided lesion occasionally causes coma. Usually an embolus lodged at the basilar bifurcation.',
    },
    test: (c) =>
      (c.both('midbrain_paramedian', 0.3) || c.both('thalamus_paramedian', 0.3)) &&
      (c.hasAny(['cuneus', 'lingual', 'occipital_pole'], 'r', 0.2) ||
        c.hasAny(['cuneus', 'lingual', 'occipital_pole'], 'l', 0.2) ||
        c.both('midbrain_peduncle', 0.3)),
    supersedes: [
      'thalamic_paramedian_bilateral',
      'thalamomesencephalic_bilateral',
      'thalamomesencephalic',
      'thalamic_paramedian_unilateral',
      'thalamic_tuberothalamic',
      'thalamic_posterior_choroidal',
      'weber_benedikt',
      'claude',
      'parinaud',
      'thalamic_sensory',
      'lacunar_pure_sensory',
      'lacunar_pure_motor',
      'lacunar_sensorimotor',
    ],
  },

  // ─────────────── midbrain ───────────────
  {
    id: 'weber_benedikt',
    group: 'brainstem',
    lateral: true,
    name: { zh: 'Weber／Benedikt 症候群（中腦腹側＋旁正中）', en: 'Weber / Benedikt syndrome (ventral + paramedian midbrain)' },
    desc: {
      zh: '同側動眼神經麻痺（眼瞼下垂、瞳孔放大、眼球外下斜）＋對側偏癱：典型的「交叉性」腦幹中風。只傷到大腦腳與動眼神經束是 Weber；紅核也受損時對側再加上運動失調，以及在數週到數月後才出現的顫抖與不自主運動（霍姆斯顫抖），稱為 Benedikt。本模型的中腦分區無法把紅核和動眼神經束完全分開。',
      en: 'Ipsilateral oculomotor palsy (ptosis, dilated pupil, eye down-and-out) + contralateral hemiparesis — the classic "crossed" brainstem stroke. Peduncle and CN III fascicles alone is Weber; when the red nucleus is also hit, contralateral ataxia is added, and tremor and involuntary movements (Holmes tremor) follow weeks to months later (Benedikt). The model\'s midbrain sectors cannot fully separate the red nucleus from the CN III fascicles.',
    },
    test: (c, s) => c.has('midbrain_peduncle', s, 0.3) && c.has('midbrain_paramedian', s, 0.25),
    requires: (q, s) => q.on('cn3_palsy', s) && ['face_weak', 'arm_weak', 'leg_weak'].some((id) => q.on(id, other(s))),
    supersedes: ['claude'],
  },
  {
    id: 'claude',
    group: 'brainstem',
    lateral: true,
    name: { zh: 'Claude 症候群（中腦被蓋）', en: 'Claude syndrome (midbrain tegmentum)' },
    desc: {
      zh: '同側動眼神經麻痺＋對側運動失調（紅核與上小腦腳傳出纖維），沒有偏癱。對側手臂的顫抖（霍姆斯顫抖）可能在數週到數月後才出現。',
      en: 'Ipsilateral oculomotor palsy + contralateral ataxia (red nucleus and superior cerebellar peduncle outflow), without hemiparesis. A tremor of the opposite arm (Holmes tremor) may follow weeks to months later.',
    },
    test: (c, s) => c.has('midbrain_paramedian', s, 0.3) && !c.has('midbrain_peduncle', s, 0.3),
    // the rubral tremor of a midbrain lesion is the delayed Holmes tremor (C3-F7)
    requires: (q, s) => q.on('cn3_palsy', s) && ['ataxia_limb', 'tremor', 'holmes_tremor'].some((id) => q.on(id, other(s))),
  },
  {
    id: 'parinaud',
    group: 'brainstem',
    lateral: false,
    name: { zh: 'Parinaud 症候群（背側中腦）', en: 'Parinaud syndrome (dorsal midbrain)' },
    desc: {
      zh: '無法向上看、瞳孔對光反應差但看近物時會縮小（光—近反射分離）、嘗試向上看時眼球內縮抽動。',
      en: 'Upgaze palsy, pupils that react poorly to light but constrict to near (light–near dissociation), and convergence–retraction nystagmus on attempted upgaze.',
    },
    test: (c) => c.has('midbrain_tectum', 'r', 0.3) || c.has('midbrain_tectum', 'l', 0.3),
  },

  // ─────────────── pons ───────────────
  // Locked-in syndrome and its relatives (C3-F1): Bauer G et al. J Neurol 1979;221:77–91
  // (classical: nothing moves but the eyes vertically and the lids; incomplete: other movement
  // remains; total: not even the eyes, with both cerebral peduncles); Laureys S et al. Prog Brain
  // Res 2005;150:495–511 (comatose for days to weeks before waking up locked-in); Kumral E et al.
  // J Neurol 2002;249:1659–1670 (bilateral pontine infarcts 11 %: transient loss of consciousness,
  // tetraparesis, pseudobulbar palsy). Prognosis and care (C3-F6): Patterson JR, Grabois M. Stroke
  // 1986;17:758–764 (139 cases: mortality 60 %; lung care and a communication system essential);
  // Casanova E et al. Arch Phys Med Rehabil 2003;84:862–867 (14 selected patients after early
  // intensive rehabilitation).
  {
    id: 'locked_in',
    group: 'brainstem',
    lateral: false,
    name: { zh: '閉鎖症候群', en: 'Locked-in syndrome' },
    desc: {
      zh: '雙側橋腦腹側受損：四肢癱瘓、不能說話與吞嚥，但意識清楚，只能用垂直眼動和眨眼溝通（由中腦控制）。水平眼動常一起喪失，因為外展神經核與 PPRF 就在旁邊的橋腦被蓋。感覺通常保留；病灶延伸到被蓋時可能有部分感覺異常。常見於基底動脈中段阻塞，常被誤認為昏迷。除眼睛以外完全不能動是「典型」；還有其他動作是「不完全」；連眼睛都不能動（兩側大腦腳／中腦也受損）是「完全型」（Bauer 1979）。早年文獻回顧的死亡率約 60%（139 例）：要積極照護呼吸與肺部（吸入、肺炎），並及早建立溝通方式（眨眼或眼動字母表、眼控電腦）。恢復差異很大：一個早期密集復健的小型選擇性系列（14 人）中，42% 恢復吞嚥、28% 恢復說話；病情穩定後可存活數十年。',
      en: 'Bilateral ventral pons: quadriplegia, no speech or swallowing, yet awake and aware, communicating only by vertical eye movements and blinking (controlled by the midbrain). Horizontal gaze is usually lost too, because the abducens nuclei and PPRF lie in the adjacent pontine tegmentum. Sensation is usually preserved; it can be partly affected when the lesion extends into the tegmentum. Typical of mid-basilar occlusion; easily mistaken for coma. Nothing moving but the eyes is the classical form; with other movement left it is incomplete; with not even the eyes moving (both cerebral peduncles / the midbrain also damaged) it is total (Bauer 1979). Mortality was about 60% in an early review of 139 cases: breathing and lung care (aspiration, pneumonia) and an early communication system (an eye-coded or blink alphabet, eye-controlled computers) are essential. Recovery varies widely: in a small selected series of 14 patients after early intensive rehabilitation 42% regained swallowing and 28% speech; once medically stable, people can live for decades.',
    },
    test: (c) => classicalLockedIn(c),
    requires: (q) => q.has('anarthria') && weakOn(q, 'r') && weakOn(q, 'l'),
    supersedes: ['locked_in_incomplete', ...PONTINE_ONE_SIDED],
  },
  {
    // Bauer G, Gerstenbrand F, Rumpl E. Varieties of the locked-in syndrome. J Neurol
    // 1979;221:77-91 (PMID 92545): classical locked-in is total immobility except vertical eye
    // movements and blinking; any other movement left makes it incomplete. Both ventral pontine
    // halves damaged from the threshold at which their bilateral signs (anarthria, weakness on
    // both sides) appear: one bilateral picture, not two crossed syndromes (C5-F2, C3-F1).
    id: 'locked_in_incomplete',
    group: 'brainstem',
    lateral: false,
    name: { zh: '不完全閉鎖症候群（雙側橋腦症候群）', en: 'Incomplete locked-in syndrome (bilateral pontine syndrome)' },
    desc: {
      zh: '兩側橋腦腹側都受損，但還有一些動作：四肢無力仍能稍微動、幾乎不能說話、吞嚥嚴重困難，意識清楚。Bauer（1979）把除了垂直眼動與眨眼以外還能動的閉鎖症候群稱為「不完全」；典型閉鎖症候群在數週到數月後恢復部分動作時也會變成這樣。孤立橋腦梗塞中約 11% 是雙側，可在發作時短暫失去意識，留下四肢無力與假性延髓麻痺（Kumral 2002）。照護重點與閉鎖症候群相同：呼吸與肺部照護、及早建立溝通方式。這是一個雙側的表現，不是兩個單側的交叉性症候群。',
      en: 'Both sides of the ventral pons are damaged, but some movement is left: weak limbs that still move a little, little or no speech and severe swallowing difficulty, with consciousness preserved. Bauer (1979) calls locked-in syndrome incomplete when anything besides vertical eye movements and blinking remains; classical locked-in syndrome becomes incomplete when some movement returns over weeks to months. About 11% of isolated pontine infarcts are bilateral; they can begin with a transient loss of consciousness and leave tetraparesis and pseudobulbar palsy (Kumral 2002). Care is as for locked-in syndrome: breathing and lung care and an early communication system. It is one bilateral picture, not two one-sided crossed syndromes.',
    },
    test: (c) => bothBases(c, 0.25) && !unaware(c) && !classicalLockedIn(c),
    requires: (q) => q.has('anarthria') && weakOn(q, 'r') && weakOn(q, 'l'),
    supersedes: PONTINE_ONE_SIDED,
  },
  {
    id: 'basilar_coma',
    group: 'brainstem',
    lateral: false,
    name: { zh: '基底動脈（橋腦）昏迷合併四肢癱瘓', en: 'Basilar (pontine) coma with quadriplegia' },
    desc: {
      zh: '橋腦腹側兩側受損（四肢癱瘓）再加上上橋腦或中腦被蓋兩側受損（維持清醒的網狀結構）：病人昏迷，不是閉鎖症候群。腹側橋腦病灶的病人常昏迷數天到數週、需要呼吸器，之後才逐漸醒來：有些人醒來是閉鎖的（清醒但不能動），有些人停在意識障礙（無反應覺醒或最小意識狀態），兩者外觀相近、容易誤判。',
      en: 'Both sides of the ventral pons (quadriplegia) plus both sides of the upper pontine or midbrain tegmentum (the arousal network): the person is comatose, not locked-in. With ventral pontine lesions people often stay comatose for days to weeks, needing ventilation, and then gradually wake: some wake up locked-in (aware but unable to move), others remain in a disorder of consciousness (unresponsive wakefulness or a minimally conscious state); the two look alike and are easily confused.',
    },
    test: (c) => bothBases(c, 0.25) && c.sym('coma') > 0,
    // named for its signs: coma with weakness of all four limbs
    requires: (q) => q.has('coma') && weakOn(q, 'r') && weakOn(q, 'l'),
    supersedes: PONTINE_ONE_SIDED,
  },
  {
    id: 'pontine_doc',
    group: 'brainstem',
    lateral: false,
    name: { zh: '基底動脈昏迷之後：意識障礙或閉鎖', en: 'After basilar coma: disorder of consciousness or locked-in' },
    desc: {
      zh: '昏迷很少超過約兩週。兩側橋腦（或中腦）被蓋大範圍梗塞、又有四肢癱瘓的病人醒來後，眼睛會睜開、有睡醒週期，但可能沒有覺察（無反應覺醒症候群）、時有時無（最小意識狀態），也可能其實完全清醒、只是被閉鎖。閉鎖症候群的診斷平均要 2.5 個月以上，常是家屬先發現病人是清醒的：要反覆請病人用上下看或眨眼回答問題。',
      en: 'Coma rarely lasts more than about two weeks. After extensive infarction of the pontine (or midbrain) tegmentum on both sides with quadriplegia, the eyes open and sleep–wake cycles return, but awareness may be absent (unresponsive wakefulness syndrome), fluctuating (minimally conscious state) — or fully present in a locked-in state. Locked-in syndrome takes over 2.5 months to diagnose on average, and it is often the family who first notices that the person is aware: ask repeatedly for answers by looking up or blinking.',
    },
    test: (c) => bothBases(c, 0.25) && c.sym('disorder_of_consciousness') > 0 && c.sym('coma') === 0,
    requires: (q) => q.has('disorder_of_consciousness') && weakOn(q, 'r') && weakOn(q, 'l'),
    supersedes: PONTINE_ONE_SIDED,
  },
  {
    // Kumral E et al. J Neurol 2002;249:1659–1670 (anteromedial pontine syndrome 58 % of 150:
    // motor deficit with dysarthria and ataxia, mild tegmental signs in a third); Bassetti C et al.
    // Neurology 1996;46:165–175 (21 of 36 ventral: from mild hemiparesis to severe hemiparesis with
    // bilateral ataxia and dysarthria)
    id: 'pontine_anteromedial',
    group: 'brainstem',
    lateral: true,
    name: { zh: '橋腦前內側（旁正中）症候群', en: 'Anteromedial (paramedian) pontine syndrome' },
    desc: {
      zh: '最常見的橋腦梗塞型態（150 例孤立橋腦梗塞中占 58%）：旁正中穿通支區域的對側偏癱，合併構音障礙與運動失調，約三分之一有輕微的被蓋徵象（例如核間性眼肌麻痺）。常見原因是基底動脈分支病變（穿通支開口被基底動脈的斑塊堵住；兩個系列的孤立橋腦梗塞中占 39–44%，與大的腹側梗塞特別相關），可能逐步惡化。',
      en: 'The commonest pattern of pontine infarction (58% of 150 isolated pontine infarcts): contralateral hemiparesis from the territory of the paramedian perforators, with dysarthria and ataxia, and mild tegmental signs (such as an internuclear ophthalmoplegia) in about a third. Often from basilar artery branch disease (plaque in the basilar artery blocking a perforator\'s origin; 39–44% of isolated pontine infarcts in these series, linked especially to large ventral infarcts), and it can worsen stepwise.',
    },
    test: (c, s) => (c.has('pons_rostral_basis', s, 0.3) || c.has('pons_caudal_basis', s, 0.3)) && otherBasesSpared(c, s),
    // named for its signs: the opposite-side weakness of the paramedian territory
    requires: (q, s) => weakOn(q, other(s)),
  },
  {
    id: 'pontine_ventral',
    group: 'brainstem',
    lateral: true,
    name: { zh: 'Raymond 症候群（橋腦下部腹側）', en: 'Raymond syndrome (ventral caudal pons)' },
    desc: {
      zh: '同側外展神經麻痺（眼睛無法向外轉）＋對側偏癱。顏面神經纖維也受損、多了同側周邊型顏面麻痺時稱為 Millard–Gubler；本模型的橋腦下部腹側不含顏面神經纖維。這些「經典」交叉症候群在 MRI 時代並不常見：孤立橋腦梗塞的病人 36 位中只有 4 位有交叉性缺損，而且沒有一位符合經典症候群（Bassetti 1996）。',
      en: 'Ipsilateral abducens palsy (the eye cannot turn out) + contralateral hemiplegia. With the facial fascicle also involved (an ipsilateral peripheral facial palsy) it is Millard–Gubler syndrome; the model\'s ventral caudal pons does not include the facial fascicle. Such classic crossed syndromes are uncommon on MRI: only 4 of 36 patients with isolated pontine infarcts had crossed deficits, and none matched a classic syndrome (Bassetti 1996).',
    },
    // one-sided: the other half counts as involved from the threshold at which the bilateral
    // signs appear (then the lesion is bilateral: locked_in_incomplete)
    test: (c, s) => c.has('pons_caudal_basis', s, 0.3) && otherBasesSpared(c, s),
    requires: (q, s) => weakOn(q, other(s)),
    supersedes: ['pontine_lacunar', 'pontine_anteromedial'],
  },
  {
    id: 'foville',
    group: 'brainstem',
    lateral: true,
    name: { zh: 'Foville 症候群（橋腦下部）', en: 'Foville syndrome (caudal pons)' },
    desc: {
      zh: '同側水平凝視麻痺（雙眼無法轉向病灶側）＋同側周邊型顏面麻痺＋對側偏癱：旁正中被蓋與腹側基底部同時受損。這些「經典」交叉症候群在 MRI 時代並不常見：孤立橋腦梗塞的病人 36 位中只有 4 位有交叉性缺損，而且沒有一位符合經典症候群（Bassetti 1996）。',
      en: 'Ipsilateral horizontal gaze palsy (neither eye turns towards the lesion) + ipsilateral peripheral facial palsy + contralateral hemiparesis: paramedian tegmentum and ventral basis both involved. Such classic crossed syndromes are uncommon on MRI: only 4 of 36 patients with isolated pontine infarcts had crossed deficits, and none matched a classic syndrome (Bassetti 1996).',
    },
    test: (c, s) => c.has('pons_caudal_tegmentum', s, 0.3) && c.has('pons_caudal_basis', s, 0.3),
    supersedes: ['pontine_ventral', 'pontine_anteromedial', 'one_and_half', 'pontine_lacunar'],
  },
  {
    id: 'one_and_half',
    group: 'brainstem',
    lateral: true,
    name: { zh: '一個半症候群／八個半症候群（橋腦下部背側）', en: 'One-and-a-half / eight-and-a-half syndrome (dorsal caudal pons)' },
    desc: {
      zh: '外展神經核／PPRF 加上內側縱束受損：雙眼都無法轉向病灶側，轉向另一側時也只剩對側眼能外轉（一個半）；再加上同側顏面神經膝部受損就是「八個半」（1½ + 7）。沒有肢體無力。',
      en: 'Abducens nucleus/PPRF plus MLF: neither eye looks towards the lesion, and looking away only the opposite eye abducts ("one-and-a-half"); add the ipsilateral facial genu and it becomes "eight-and-a-half" (1½ + 7). No limb weakness.',
    },
    test: (c, s) => c.has('pons_caudal_tegmentum', s, 0.3) && !c.has('pons_caudal_basis', s, 0.3),
    requires: (q, s) => q.on('gaze_palsy_horizontal', s),
    supersedes: ['pontine_anteromedial'],
  },
  {
    id: 'pontine_lacunar',
    group: 'lacunar',
    lateral: true,
    name: { zh: '橋腦腔隙性中風（純運動／運動失調性偏癱／構音障礙—笨拙手）', en: 'Pontine lacune (pure motor / ataxic hemiparesis / dysarthria–clumsy hand)' },
    desc: {
      zh: '單一穿通動脈阻塞造成的小梗塞，依切斷哪些纖維而有不同表現：對側輕到中度無力（純運動性，最常見）；無力加上同一側肢體不協調（運動失調性偏癱）；或只有口齒不清與手笨拙（構音障礙—笨拙手）。與高血壓小血管病變有關。',
      en: 'A small infarct from one perforator, whose picture depends on which fibres it cuts: mild-to-moderate weakness of the opposite side (pure motor, the commonest); weakness with incoordination of the same limbs (ataxic hemiparesis); or just slurred speech and a clumsy hand (dysarthria–clumsy hand). Linked to hypertensive small-vessel disease.',
    },
    test: (c, s) =>
      c.has('pons_rostral_basis', s, 0.3) &&
      !c.has('pons_rostral_tegmentum', s, 0.3) &&
      !c.has('pons_rostral_basis', s === 'r' ? 'l' : 'r', 0.3),
    supersedes: ['pontine_anteromedial'],
  },
  {
    id: 'aica',
    group: 'brainstem',
    lateral: true,
    name: { zh: '小腦前下動脈症候群（外側橋腦下部）', en: 'AICA syndrome (lateral inferior pons)' },
    // standing and gait impaired in all of 7 AICA infarcts (Ogawa K et al. J Stroke Cerebrovasc
    // Dis 2017;26:574–581, PMID 27989483); an abnormal head-impulse test can wrongly point to a
    // peripheral cause in a lateral pontine stroke (Kattah JC et al. Stroke 2009;40:3504–3510,
    // PMID 19762709). C7-F4
    desc: {
      zh: '眩暈、嘔吐、同側突發耳聾與耳鳴（迷路動脈）、同側周邊型顏面麻痺、同側臉部痛溫覺喪失、霍納氏症候群與肢體運動失調，對側身體痛溫覺喪失；站立與走路不穩（一系列 7 人全都有）。突發單耳聽力喪失合併眩暈要想到它。內耳也缺血時，床邊的甩頭測試可能像內耳炎一樣異常，讓人誤以為只是內耳的問題；這時 HINTS 的「S」——眼球垂直偏斜——可能是指向中風的線索（Kattah 2009 這樣的 3 例中有 2 例）。',
      en: 'Vertigo, vomiting, sudden ipsilateral deafness and tinnitus (labyrinthine artery), ipsilateral peripheral facial palsy, facial pain/temperature loss, Horner and limb ataxia, with contralateral body pain/temperature loss; standing and gait are unsteady (in all of 7 patients in one series). Think of it with sudden one-sided deafness plus vertigo. With the inner ear ischaemic too, the bedside head-impulse test can look peripheral and wrongly suggest a purely inner-ear cause; the "S" of HINTS, a skew deviation, can then be the clue to a stroke (2 of 3 such cases in Kattah 2009).',
    },
    test: (c, s) => c.has('pons_caudal_lateral', s, 0.3),
  },
  {
    id: 'sca',
    group: 'cerebellar',
    lateral: true,
    name: { zh: '小腦上動脈症候群', en: 'Superior cerebellar artery syndrome' },
    // Schmahmann JD, Sherman JC. Brain 1998;121:561–579 (PMID 9577385): the cerebellar cognitive
    // affective syndrome after posterior-lobe and vermis lesions, only minor changes after
    // anterior-lobe ones (C7-F10)
    desc: {
      zh: '同側肢體運動失調與意向性顫抖、構音障礙、走路不穩；累及橋腦上部外側時再加上同側霍納氏症候群與對側痛溫覺喪失。小腦認知情感症候群（計畫、視覺空間與情緒的改變）主要來自小腦後葉與蚓部；小腦上表面的前葉受損只造成輕微的變化（資料來自各種小腦疾病，不只是中風）。',
      en: 'Ipsilateral limb ataxia with intention tremor, dysarthria and gait ataxia; with lateral upper-pons involvement, ipsilateral Horner and contralateral pain/temperature loss. The cerebellar cognitive affective syndrome (planning, visuospatial and emotional changes) comes mainly from the posterior lobe and vermis; damage to the anterior lobe, on the upper surface, gives only minor changes (series of mixed cerebellar disease, not stroke alone).',
    },
    test: (c, s) => c.hasAny(['cerebellum_superior', 'dentate'], s, 0.3) || c.has('pons_rostral_lateral', s, 0.3),
  },

  // ─────────────── medulla ───────────────
  {
    id: 'wallenberg',
    group: 'brainstem',
    lateral: true,
    name: { zh: '華倫堡氏症候群（延髓外側）', en: 'Wallenberg (lateral medullary) syndrome' },
    // the triad of Horner, ipsilateral ataxia and contralateral hypalgesia; facial weakness in 42 %
    // (Sacco RL et al. Arch Neurol 1993;50:609–614, PMID 8503798); ipsiversive lateropulsion
    // (Cnyrim CD et al. J Neurol Neurosurg Psychiatry 2007;78:527–528, PMID 17435189); the
    // hemiparesis reported with it is ipsilateral, in 50 % of fatal respiratory failures against
    // 5.3 % of the others (Saito T et al. J Neurol Sci 2022;434:120167, PMID 35091384), from the
    // crossed pyramidal tract in the lower medulla (Uemura M et al. J Neurol Sci 2016;365:40–45,
    // PMID 27206871); vertebral disease in 67 %, PICA disease in 10 % (Kim JS. Brain
    // 2003;126:1864–1872, PMID 12805095). C7-F3, C7-F4, C7-F11
    desc: {
      zh: '眩暈、嘔吐、眼振、吞嚥困難與聲音沙啞、同側霍納氏症候群與肢體運動失調、走路不穩且身體被拉向病灶側（同側側傾），以及「交叉性」感覺喪失（同側臉＋對側身體的痛溫覺）；常有輕度臉部無力與構音障礙。霍納氏症候群、同側運動失調與對側痛覺減退三者並存即可辨認。病灶側眼睛可能較低（眼球垂直偏斜，HINTS 的「S」）：33 位病人中有 11 位有複視或視力模糊，這不一定代表梗塞超出延髓外側（Sacco 1993）。手腳通常不會無力：對側手腳無力表示梗塞延伸到延髓內側（半側延髓，Babinski–Nageotte 症候群）；延髓外側梗塞報告中的偏癱在病灶同側（Opalski 變異型，延髓最下段已交叉的錐體徑受損）；一個系列中存活者約 5% 有，死於呼吸衰竭者則有一半，代表呼吸衰竭的風險較高——本模型沒有重現這一型。最常見原因是椎動脈（約 67%，而非單純 PICA，約 10%）阻塞或剝離。',
      en: 'Vertigo, vomiting, nystagmus, dysphagia and hoarseness, ipsilateral Horner and limb ataxia, gait ataxia with the body pulled towards the lesion (ipsiversive lateropulsion), and "crossed" sensory loss (pain/temperature on the same-side face and opposite body); a mild facial weakness and dysarthria are common. The triad of Horner, ipsilateral ataxia and contralateral loss of pain sensation identifies it. The eye on the lesion side may sit lower (skew deviation, the "S" of HINTS): 11 of 33 patients had double or blurred vision, which does not necessarily mean the infarct extends beyond the lateral medulla (Sacco 1993). Usually no weakness of the limbs: weakness of the opposite limbs means the infarct reaches the medial medulla (hemimedullary, Babinski–Nageotte syndrome); the hemiparesis reported with lateral medullary infarcts is on the same side (Opalski variant, from the crossed pyramidal tract in the lowest medulla); in one series 5 % of the survivors had it against half of those who died of respiratory failure, so it marks a higher risk — that variant is not reproduced by this model. Most often due to vertebral (about 67 %; not isolated PICA, about 10 %) occlusion or dissection.',
    },
    // the region threshold is the one the symptoms use (0.25), so that a lateral medulla whose
    // signs are listed (e.g. behind a PICA occlusion) is also named; the label needs the crossed
    // sensory loss with an ipsilateral Horner or facial pain/temperature loss
    test: (c, s) => c.has('medulla_lateral', s, 0.25),
    requires: (q, s) => q.on('pain_temp_body', other(s)) && (q.on('horner', s) || q.on('pain_temp_face', s)),
  },
  {
    id: 'dejerine',
    group: 'brainstem',
    lateral: true,
    name: { zh: 'Dejerine 症候群（延髓內側）', en: 'Dejerine (medial medullary) syndrome' },
    // Kim JS, Han YS. Stroke 2009;40:3221–3225 (PMID 19628797): 86 consecutive patients (C7-F9)
    desc: {
      zh: '對側手腳無力（臉部通常不受影響）、對側本體覺喪失、伸舌偏向病灶側。59% 有眩暈或頭暈（梗塞延伸到延髓背側時）；之後約四分之一（86 人中 21 人）出現中樞性中風後疼痛，與較差的預後有關。',
      en: 'Contralateral arm and leg weakness (face spared), contralateral loss of position sense, and tongue deviation towards the lesion. Vertigo or dizziness in 59 % (when the infarct reaches the dorsal medulla); central post-stroke pain later in about a quarter (21 of 86), linked to a poorer outcome.',
    },
    test: (c, s) => c.has('medulla_medial', s, 0.3) && !c.has('medulla_lateral', s, 0.3),
  },
  {
    // Pongmoragot J et al. J Stroke Cerebrovasc Dis 2013;22:775–780 (PMID 22541608): systematic
    // review of 38 cases; Kobayashi S et al. Brain Nerve 2020;72:901–905 (PMID 32741771): a case
    // mimicking Guillain–Barré syndrome with a normal first MRI and respiratory failure. One
    // bilateral picture, not two one-sided Dejerine syndromes (C7-F6).
    id: 'bilateral_medial_medullary',
    group: 'brainstem',
    lateral: false,
    name: { zh: '雙側延髓內側梗塞', en: 'Bilateral medial medullary infarction' },
    desc: {
      zh: '兩側延髓內側都受損：四肢無力（臉部常不受影響）、兩側舌頭無力與構音障礙，常合併本體覺喪失。一篇 38 例的系統性回顧：肢體無力 78.4%、構音障礙 48.6%、舌下神經麻痺 40.5%；病灶多在延髓上段；預後差，住院死亡率 23.8%、需要他人照顧 61.9%。可能在幾天內逐漸惡化、看起來像格林–巴利症候群，第一次 MRI 可能正常；部分個案出現延髓麻痺與呼吸衰竭（呼吸的風險另列為併發症）。',
      en: 'Both medial medullae: weakness of all four limbs (the face often spared), weak tongue on both sides and dysarthria, often with loss of position sense. In a systematic review of 38 cases: limb weakness 78.4 %, dysarthria 48.6 %, hypoglossal palsy 40.5 %; mostly rostral lesions; a poor outcome, with inpatient mortality 23.8 % and dependency 61.9 %. It can worsen over days and mimic Guillain–Barré syndrome, with a first MRI that is normal; bulbar palsy and respiratory failure occur in some cases (the breathing risk is listed as a complication).',
    },
    // both sides from the threshold at which the bilateral sign (dysarthria) appears
    test: (c) => c.both('medulla_medial', 0.25),
    supersedes: ['dejerine'],
  },
  {
    id: 'hemimedullary',
    group: 'brainstem',
    lateral: true,
    name: { zh: 'Babinski–Nageotte 症候群（半側延髓）', en: 'Babinski–Nageotte (hemimedullary) syndrome' },
    desc: {
      zh: '延髓外側＋內側同時受損：華倫堡氏症候群的表現再加上對側偏癱。',
      en: 'Lateral + medial medulla together: Wallenberg features plus contralateral hemiparesis.',
    },
    test: (c, s) => c.has('medulla_lateral', s, 0.3) && c.has('medulla_medial', s, 0.3),
    supersedes: ['wallenberg', 'dejerine'],
  },

  // ─────────────── cerebellar & ear ───────────────
  {
    id: 'pica_cerebellar',
    group: 'cerebellar',
    lateral: true,
    name: { zh: 'PICA 小腦梗塞', en: 'PICA cerebellar infarction' },
    // pseudo-vestibular neuritis: 25 of 240 isolated cerebellar infarcts, 24 of them in the medial
    // PICA territory (Lee H et al. Neurology 2006;67:1178–1183, PMID 17030749); HINTS 100 %
    // sensitive, first DWI falsely negative in 12 %, all within 48 h (Kattah JC et al. Stroke
    // 2009;40:3504–3510, PMID 19762709); medial-branch infarcts reach the lateral and dorsal medulla
    // when the branch supplies it (Amarenco P et al. J Neurol Neurosurg Psychiatry 1990;53:731–735,
    // PMID 2246654; 5 of 9 at autopsy, 4 presenting as Wallenberg syndrome: Amarenco P et al. Rev
    // Neurol (Paris) 1989;145:277–286, PMID 2660219); vertebral disease in 67 % and PICA disease in
    // 10 % of lateral medullary infarcts (Kim JS. Brain 2003;126:1864–1872, PMID 12805095); the
    // cerebellar cognitive affective syndrome (Schmahmann JD, Sherman JC. Brain 1998;121:561–579,
    // PMID 9577385; MMSE and MoCA normal: Hoche F et al. Brain 2018;141:248–270, PMID 29206893).
    // C7-F2, C7-F5, C7-F10
    desc: {
      zh: '眩暈、嘔吐、走不穩、眼振，可能沒有任何肢體無力——很容易被當成內耳眩暈或腸胃炎。「頭暈合併無法站立或行走」要高度警覺。只有內側（蚓部）分支梗塞時，可以和前庭神經炎一模一樣（這類小腦中風 25 例中 24 例在此），NIHSS 為 0：床邊的 HINTS 檢查（甩頭測試、眼振型態、眼球偏斜測試）對中風的敏感度達 100%，而 48 小時內的第一次 DWI 有 12% 看不到梗塞。PICA 主幹阻塞常同時波及延髓外側（解剖研究中 9 例內側分支梗塞有 5 例，其中 4 例表現為華倫堡氏症候群）；不過延髓外側梗塞大多來自椎動脈（67%），單純 PICA 只占 10%。小腦後葉與蚓部受損可能出現小腦認知情感症候群（計畫、視覺空間與情緒的改變），因為 MMSE、MoCA 可能正常而容易被忽略（資料來自各種小腦疾病，不只是中風）。大範圍梗塞可能腫脹壓迫第四腦室與腦幹，最常在第 3 天，但約 40% 在第 3 天之後，所以要觀察數天。',
      en: 'Vertigo, vomiting, unsteadiness and nystagmus, possibly with no limb weakness — easily mistaken for inner-ear vertigo or gastroenteritis. Dizziness with inability to stand or walk is a red flag. An infarct of the medial (vermian) branch alone can look exactly like vestibular neuritis (24 of 25 such cerebellar strokes) with an NIHSS of 0: the bedside HINTS examination (head impulse, nystagmus, test of skew) was 100 % sensitive for stroke, while the first DWI within 48 h missed 12 %. A PICA trunk occlusion often reaches the lateral medulla too (5 of 9 medial-branch infarcts at autopsy, 4 of them presenting as Wallenberg syndrome), although most lateral medullary infarcts come from the vertebral artery (67 %) rather than the PICA (10 %). Damage to the posterior lobe and vermis can bring the cerebellar cognitive affective syndrome (planning, visuospatial and emotional changes), easily missed because MMSE and MoCA can be normal (series of mixed cerebellar disease, not stroke alone). Large infarcts can swell and compress the 4th ventricle and brainstem, most often on day 3 but in about 40% after day 3, so monitoring has to continue for days.',
    },
    test: (c, s) => c.hasAny(['cerebellum_posterior_inferior', 'vermis_inferior'], s, 0.3),
  },
  {
    id: 'labyrinthine',
    group: 'cerebellar',
    lateral: true,
    name: { zh: '迷路動脈梗塞（內耳中風）', en: 'Labyrinthine artery infarction (inner-ear stroke)' },
    // Lee H et al. Stroke 2009;40:3745–3751 (PMID 19797177): combined audiovestibular loss in 60 %
    // of 82 AICA infarcts, 13 with transient episodes within the month before (C7-F7)
    desc: {
      zh: '突發單側耳聾合併嚴重眩暈；血管性的原因通常聽覺與前庭一起受損，和病毒性的不同。內耳是終末器官，腦部 DWI 看不到它的梗塞。可能是小腦前下動脈中風的前兆，數天到數週內接著出現更大範圍梗塞（82 例 AICA 梗塞中有 13 例在之前一個月內有過短暫發作）。',
      en: 'Sudden one-sided deafness with severe vertigo; a vascular cause usually takes hearing and the vestibule together, unlike a viral one. The inner ear is an end organ whose infarct brain DWI does not show. It can herald a larger AICA infarct within days to weeks (13 of 82 AICA infarcts had transient episodes within the month before).',
    },
    test: (c, s) => c.has('inner_ear', s, 0.3),
  },

  // ─────────────── lacunar (supratentorial) ───────────────
  {
    id: 'striatocapsular',
    pattern: true,
    group: 'lacunar',
    lateral: true,
    name: { zh: '紋狀體內囊梗塞', en: 'Striatocapsular infarction' },
    desc: {
      zh: '整群豆紋動脈（或 M1 起始處阻塞、皮質靠側枝撐住）造成殼核、尾狀核與內囊的逗點狀梗塞，比腔隙大（> 1.5 cm）。最常見的是以手臂為主的對側偏癱，合併皮質徵象（左側失語、右側忽略、失用）：急性期來自皮質灌流不足，之後則歸因於遠隔效應（diaschisis）。只有手臂或手臂加臉無力、沒有皮質徵象時，通常恢復得很好。',
      en: 'Several lenticulostriate arteries at once (or an M1-origin occlusion with the cortex rescued by collaterals) give a comma-shaped infarct of putamen, caudate and internal capsule, larger than a lacune (> 1.5 cm). Most often an arm-predominant contralateral hemiparesis with cortical signs (aphasia on the left, neglect on the right, dyspraxia): acutely from cortical hypoperfusion, later attributed to diaschisis. With arm or arm-and-face weakness alone and no cortical signs, recovery is usually excellent — Donnan et al., Brain 1991.',
    },
    test: (c, s) =>
      c.has('putamen', s, 0.4) &&
      c.hasAny(['caudate_body', 'caudate_head'], s, 0.3) &&
      c.hasAny(['ic_posterior_limb', 'ic_genu', 'ic_anterior_limb'], s, 0.3) &&
      c.cortexCount(s, 0.3) === 0,
    supersedes: ['lacunar_pure_motor', 'lacunar_sensorimotor'],
  },
  {
    id: 'lacunar_pure_motor',
    group: 'lacunar',
    lateral: true,
    name: { zh: '純運動性腔隙中風', en: 'Pure motor lacunar stroke' },
    // the commonest lacunar syndrome (57 %); severity follows the infarct volume, except in the
    // lowest part of the internal capsule (Chamorro A et al. Stroke 1991;22:175-181, PMID 2003281);
    // lacunar strokes have a median NIHSS of 3-4 (Barow 2020; Vynckier 2021). C6-F1.
    desc: {
      zh: '內囊後肢小梗塞：對側臉、手、腳無力程度相近，多為輕到中度，沒有感覺、視野或語言障礙。位在內囊最下方的小梗塞也可能造成嚴重偏癱。',
      en: 'Small infarct in the posterior limb of the internal capsule: weakness of the opposite face, arm and leg to a similar degree, usually mild to moderate, with no sensory, visual or language deficit. A small infarct in the lowest part of the internal capsule can still cause a dense hemiplegia.',
    },
    test: (c, s) =>
      c.hasAny(['ic_posterior_limb', 'ic_genu'], s, 0.3) &&
      !c.has('thalamus_ventrolateral', s, 0.3) &&
      !c.has('optic_tract', s, 0.3) &&
      c.cortexCount(s) === 0,
    // named for its signs: a weak arm or leg on the opposite side
    requires: (q, s) => weakOn(q, other(s)),
  },
  {
    id: 'lacunar_pure_sensory',
    group: 'lacunar',
    lateral: true,
    name: { zh: '純感覺性腔隙中風', en: 'Pure sensory lacunar stroke' },
    desc: {
      zh: '視丘腹後核小梗塞：對側半身麻木，沒有無力。',
      en: 'Small infarct in the ventral posterior thalamus: numbness of the opposite half of the body without weakness.',
    },
    // a lacune: the whole inferolateral territory is the thalamic sensory syndrome (C6-F7)
    test: (c, s) =>
      c.has('thalamus_ventrolateral', s, 0.3) && c.lacune('thalamus_ventrolateral', s) && !c.has('ic_posterior_limb', s, 0.3) && c.cortexCount(s) === 0,
    // "pure": no weakness or ataxia on that body side (with them, the thalamic sensory syndrome
    // describes it)
    requires: (q, s) => !MOTOR_OR_ATAXIC.some((id) => q.on(id, other(s))),
  },
  {
    id: 'lacunar_sensorimotor',
    group: 'lacunar',
    lateral: true,
    name: { zh: '感覺運動性腔隙中風', en: 'Sensorimotor lacunar stroke' },
    desc: {
      zh: '視丘與鄰近內囊同時受損：對側無力加上麻木。',
      en: 'Thalamus and adjacent internal capsule: contralateral weakness plus numbness.',
    },
    test: (c, s) => c.has('thalamus_ventrolateral', s, 0.3) && c.has('ic_posterior_limb', s, 0.3) && c.cortexCount(s) === 0,
    supersedes: ['lacunar_pure_motor', 'lacunar_pure_sensory'],
  },
  {
    // Moulin T et al. J Neurol Neurosurg Psychiatry 1995;58:422-427 (PMID 7738547): 100 patients
    // with hemiparesis and ipsilateral incoordination without sensory loss — internal capsule
    // 39 %, pons 19 %, thalamus 13 %, corona radiata 13 %, lentiform nucleus 8 %, with almost
    // identical features; Hiraga A et al. J Neurol Neurosurg Psychiatry 2007;78:1260-1262 (PMID
    // 17550988): on DWI mainly pontine or internal capsule / corona radiata; Gorman MJ et al.
    // Stroke 1998;29:2549-2555 (PMID 9836766): sensory loss points to the capsule. 10 % of
    // lacunar syndromes (Chamorro 1991). The pontine form is the pontine lacune (C6-F5).
    id: 'lacunar_ataxic_hemiparesis',
    group: 'lacunar',
    lateral: true,
    name: { zh: '運動失調性偏癱（腔隙性）', en: 'Ataxic hemiparesis (lacunar)' },
    desc: {
      zh: '一側輕度無力，同一側手腳又笨拙、不協調（比無力本身更明顯），沒有感覺障礙。同樣的表現可以來自內囊（39%）、橋腦（19%）、視丘與放射冠（各 13%）或豆狀核（8%），各處幾乎無法從症狀區分。',
      en: 'Mild weakness of one side with clumsy, uncoordinated movements of the same limbs, out of proportion to the weakness, and no sensory loss. The same picture comes from the internal capsule (39 %), pons (19 %), thalamus and corona radiata (13 % each) or lentiform nucleus (8 %), and the sites can hardly be told apart by the signs.',
    },
    test: (c, s) =>
      c.hasAny(['ic_posterior_limb', 'corona_radiata'], s, 0.3) &&
      !c.has('thalamus_ventrolateral', s, 0.3) &&
      !c.has('optic_tract', s, 0.3) &&
      c.cortexCount(s) === 0,
    requires: (q, s) => weakOn(q, other(s)) && q.on('ataxia_limb', other(s)),
    supersedes: ['lacunar_pure_motor'],
  },
  {
    // Arboix A et al. J Neurol Neurosurg Psychiatry 2004;75:231-234 (PMID 14742595): 35 of 570
    // lacunar syndromes (6.1 %); internal capsule 40 %, pons 17 %, corona radiata 8.6 %; limb
    // weakness but not cerebellar-type ataxia; 45.7 % symptom-free at discharge (C6-F5)
    id: 'lacunar_dysarthria_clumsy_hand',
    group: 'lacunar',
    lateral: true,
    name: { zh: '構音障礙—笨拙手症候群（腔隙性）', en: 'Dysarthria–clumsy hand syndrome (lacunar)' },
    desc: {
      zh: '口齒不清加上一隻手笨拙、略無力（寫字、扣釦子困難），常有輕微的臉部無力，沒有感覺障礙。約占腔隙症候群的 6%；病灶多在內囊（40%）、橋腦（17%）或放射冠（9%）。預後通常很好，近半數出院時已無症狀。',
      en: 'Slurred speech with a clumsy, slightly weak hand (writing, buttoning), often a mild facial weakness, and no sensory loss. About 6 % of lacunar syndromes; mostly in the internal capsule (40 %), pons (17 %) or corona radiata (9 %). The outlook is usually good: nearly half are symptom-free at discharge.',
    },
    test: (c, s) =>
      c.hasAny(['ic_genu', 'ic_posterior_limb', 'corona_radiata'], s, 0.3) &&
      !c.has('thalamus_ventrolateral', s, 0.3) &&
      !c.has('optic_tract', s, 0.3) &&
      c.cortexCount(s) === 0,
    requires: (q, s) => q.from('dysarthria', s) && q.on('hand_clumsy', other(s)) && !weakOn(q, other(s)),
    supersedes: ['lacunar_pure_motor'],
  },
  {
    // Tatemichi TK et al. Neurology 1992;42:1966-1979 (PMID 1407580): six patients with inferior
    // genu infarcts — fluctuating alertness, inattention, memory loss, apathy, abulia and
    // psychomotor slowing with mild hemiparesis and dysarthria; severe verbal memory loss after
    // left-sided infarcts, dementia in four; thalamocortical disconnection (C6-F8)
    id: 'capsular_genu',
    group: 'lacunar',
    lateral: true,
    name: { zh: '內囊膝部梗塞（策略性梗塞）', en: 'Capsular genu infarct (strategic infarct)' },
    desc: {
      zh: '內囊膝部下方的小梗塞切斷視丘通往額葉的纖維，使同側額葉功能下降：突然的意識混亂、清醒程度起伏、注意力差、冷漠與意志缺失、反應變慢與失憶；左側梗塞造成嚴重的語言記憶障礙，有時達到失智（「策略性梗塞失智」），右側則只有短暫的空間記憶障礙。無力與口齒不清通常輕微。根據小型病例系列。',
      en: 'A small infarct in the lower genu of the internal capsule cuts the thalamic fibres to the frontal lobe and depresses that frontal lobe: sudden confusion with fluctuating alertness, inattention, apathy and abulia, slowness and memory loss — severe verbal memory loss after a left-sided infarct, sometimes amounting to dementia ("strategic-infarct dementia"), only a transient visuospatial memory problem after a right-sided one. Weakness and dysarthria are usually mild. From a small case series.',
    },
    test: (c, s) => c.has('ic_genu', s, 0.3) && !c.has('ic_posterior_limb', s, 0.3) && !c.has('putamen', s, 0.4) && c.cortexCount(s) === 0,
    requires: (q, s) => q.from('amnesia', s),
    supersedes: ['lacunar_pure_motor', 'lacunar_dysarthria_clumsy_hand'],
  },
  {
    // Donnan GA et al. Neurology 1993;43:957-962 (PMID 8492952): crescendo capsular TIAs in 50
    // patients, 4.5 % of TIAs, mostly face, arm and leg, from one small penetrating vessel; 42 %
    // had an early capsular stroke; resistant to treatment. Paul NL et al. Neurology
    // 2012;79:1356-1362 (PMID 22972645): 1.5 % of TIAs in a population, 7-day stroke risk 60 %,
    // the recurrent TIA always within 24 h of the first. Vynckier 2021: early neurological
    // deterioration in lacunar stroke, adjusted odds ratio 7.0. Saposnik G et al. Arch Neurol
    // 2008;65:1375-1377 (PMID 18852355): the pontine warning syndrome (C6-F2).
    id: 'capsular_warning',
    group: 'lacunar',
    lateral: true,
    name: { zh: '內囊／橋腦警訊症候群（反覆發作的腔隙性 TIA）', en: 'Capsular / pontine warning syndrome (crescendo lacunar TIAs)' },
    desc: {
      zh: '同一條小穿通動脈反覆、刻板地發作：對側臉、手、腳無力，每次幾分鐘內就恢復，一天內再發。約占 TIA 的 4.5%（人口研究中 1.5%）；42% 很快就變成內囊（腔隙性）中風，人口研究中 7 天內中風風險 60%。橋腦旁正中穿通支也會這樣發作（橋腦警訊症候群）。即使發作停了也要當急症處理；它也預示腔隙性中風早期惡化。',
      en: 'Repeated, stereotyped attacks from one small penetrating artery: weakness of the opposite face, arm and leg, clearing within minutes each time, and recurring within a day. About 4.5 % of TIAs (1.5 % in a population study); 42 % soon went on to a capsular (lacunar) stroke, and the 7-day stroke risk was 60 % in the population study. A paramedian pontine branch can do the same (pontine warning syndrome). An emergency even when the attacks have stopped; it also predicts early worsening of a lacunar stroke.',
    },
    test: (c, s) => WARNING_BUNDLES.some((b) => crescendo(c.branchEpisodes(b, s), c.tH)),
  },

  // ─────────────── watershed & haemodynamic ───────────────
  {
    id: 'watershed',
    pattern: true,
    group: 'watershed',
    lateral: true,
    name: { zh: '分水嶺（邊界區）缺血', en: 'Watershed (border-zone) ischaemia' },
    desc: {
      zh: '兩條動脈末梢交界處血壓最低，當血壓下降或頸動脈嚴重狹窄時最先缺血。前分水嶺（前／中大腦動脈之間）位在運動區管肩膀與上臂的上段，可造成對側近端手臂無力、臉與手相對保留；雙側時為雙臂無力而雙腿能動的「桶中人」；後分水嶺（中／後大腦動脈之間）影響視覺與語言理解；內分水嶺在深部白質呈串珠狀。單側分水嶺梗塞多半發生在頸動脈阻塞或嚴重狹窄再加上血壓下降等血流因素時，發作時常有昏厥（37%）或局部肢體抖動（12%）。',
      en: 'Where two arterial trees meet, pressure is lowest, so these zones fail first when blood pressure drops or the carotid is severely narrowed. The anterior watershed (ACA–MCA) lies over the shoulder and upper-arm part of the motor strip and can weaken the opposite proximal arm with face and hand relatively spared; on both sides it gives the "man in a barrel" (both arms weak, legs moving); the posterior (MCA–PCA) affects vision and comprehension; the internal watershed forms a string of deep white-matter lesions. One-sided watershed infarcts mostly come with carotid occlusion or tight stenosis plus a haemodynamic factor such as low blood pressure; syncope (37 %) or focal limb shaking (12 %) at onset are frequent.',
    },
    // Bogousslavsky J, Regli F. Unilateral watershed cerebral infarcts. Neurology 1986;36:373-377
    // (PMID 3951705): 51 patients, a characteristic picture per type, syncope 37 %, limb shaking
    // 12 %, 75 % with ICA occlusion or tight stenosis plus a haemodynamic factor
    test: (c, s) => isWatershedPicture(c.border(s)),
  },
  {
    // bilateral anterior border-zone infarcts: bilateral brachial paralysis, worst proximally
    // (Martí-Vilalta JL, Arboix A, Garcia JH. J Stroke Cerebrovasc Dis 1994;4:114-120, PMID
    // 26487612); after hypotension, 11 of 34 comatose patients moved their legs but not their
    // arms, with a poor prognosis (Sage JI, Van Uitert RL. Neurology 1986;36:1102-1103, PMID
    // 3736874). Named for its signs: proximal arm weakness on both sides, with the leg area of
    // both paracentral lobules spared (C1-F6).
    id: 'man_in_barrel',
    group: 'watershed',
    lateral: false,
    name: { zh: '雙側前分水嶺梗塞（桶中人症候群）', en: 'Bilateral anterior watershed infarction (man-in-the-barrel)' },
    desc: {
      zh: '全身血壓過低（例如心跳停止、休克）後，兩側前／中大腦動脈交界區同時缺血：兩側肩膀與上臂癱瘓、雙腿卻能動，好像被套在桶子裡。預後通常很差。',
      en: 'After a profound fall in blood pressure (cardiac arrest, shock) both ACA–MCA border zones fail together: both shoulders and upper arms are paralysed while the legs still move, as if the person were standing in a barrel. The prognosis is usually poor.',
    },
    test: (c) =>
      (['r', 'l'] as Side[]).every((s) => {
        const b = c.border(s);
        return isWatershedPicture(b) && b.kinds.some((k) => k.startsWith('ACA|MCA')) && !c.has('paracentral', s, 0.3);
      }),
    requires: (q) => q.on('arm_weak_proximal', 'r') && q.on('arm_weak_proximal', 'l'),
    supersedes: ['watershed'],
  },
  {
    id: 'subclavian_steal',
    group: 'other',
    lateral: true,
    name: { zh: '鎖骨下動脈竊血症候群', en: 'Subclavian steal syndrome' },
    desc: {
      zh: '鎖骨下動脈近端阻塞，同側椎動脈血流反轉去供應手臂。手臂用力時可能頭暈、視力模糊、走不穩；兩手血壓差超過 15–20 mmHg 是重要線索。',
      en: 'The proximal subclavian is blocked, so the same-side vertebral artery flows backwards to feed the arm. Arm exercise can trigger dizziness, blurred vision or unsteadiness; a > 15–20 mmHg difference in arm blood pressures is a key clue.',
    },
    test: (c, s) => c.occluded('subclavian_prox', s) && (c.reversed('va_extracranial', s) || c.reversed('va_v4_prox', s)),
  },
  {
    id: 'amaurosis',
    group: 'other',
    lateral: true,
    name: { zh: '視網膜缺血（一過性黑矇／視網膜中央動脈阻塞）', en: 'Retinal ischaemia (amaurosis fugax / CRAO)' },
    desc: {
      zh: '單眼視力突然變暗或全黑，是「眼睛的中風」，同時也是同側頸動脈疾病的警訊，需要與腦中風同等緊急處理。',
      en: 'Sudden darkening or loss of vision in one eye — a "stroke of the eye" and a warning sign of same-side carotid disease; as urgent as a brain stroke.',
    },
    test: (c, s) => c.has('retina', s, 0.3),
  },
  {
    id: 'carotid_compensated',
    group: 'other',
    lateral: true,
    name: { zh: '頸動脈閉塞但側枝代償良好', en: 'Carotid occlusion with good compensation' },
    desc: {
      zh: '內頸動脈雖然完全阻塞，血液經前交通動脈、後交通動脈與眼動脈逆流補足，腦組織沒有明顯缺血——這就是有些人頸動脈塞住卻毫無症狀的原因。但代償區在血壓下降時仍很脆弱。',
      en: 'The ICA is completely blocked yet blood arrives through the AComm, PComm and backwards through the ophthalmic artery, so tissue is spared — why some carotid occlusions are silent. The compensated territory remains fragile if blood pressure falls.',
    },
    test: (c, s) =>
      (c.occluded('ica_cervical', s) || c.occluded('ica_petrous_cavernous', s)) && c.cortexCount(s, 0.2) === 0 && c.border(s).total < 3,
  },
];
