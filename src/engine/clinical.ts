/**
 * Turns regional dysfunction into symptoms, an educational NIHSS estimate and named syndromes.
 */

import { REGIONS, REGION_BY_ID } from '../anatomy';
import type { DeficitRef, NihssItem, Region, Side } from '../anatomy';
import { REGION_DEFS } from '../anatomy/regions';
import { DELAYED_ONSET_H, SYMPTOM_BY_ID, symptomOnsetH } from '../anatomy/symptoms';
import { MCA_CORTEX, SYNDROMES, type SymptomQuery, type SyndromeCtx, type SyndromeDef } from '../anatomy/syndromes';
import { indexById } from '../anatomy/indexById';
import { COMPACT_FROM, NOTICEABLE, corticospinalLoss, gradeFactor, initialSeverity, isCompact, lesionSides, symptomCompensation, tapers as tapersBelow } from './recovery';
import type { SymptomRecovery } from './recoveryTypes';

export interface SymptomItem {
  id: string;
  /** body side ('r'/'l'), both sides, or null for non-lateralised symptoms */
  side: Side | 'both' | null;
  sev: 1 | 2 | 3;
  sources: string[];
  delayed: boolean;
  /** how far spared pathways have taken this deficit over (from its dominant source), if it comes from a region */
  recovery?: SymptomRecovery;
  /** set on the signs that cannot be examined now (SimResult.unexaminable): why not (see examinability) */
  why?: UnexaminableWhy;
}

/**
 * Why a sign the lesion gives cannot be examined now: the level of consciousness (stupor, coma, a
 * disorder of consciousness: X1), blindness (no sight to test recognition, reading or reaching by:
 * Y2-14), or akinetic mutism (an awake patient without spontaneous action or speech: Y2-15).
 */
export type UnexaminableWhy = 'consciousness' | 'blind' | 'akinetic';

export interface NihssResult {
  total: number;
  items: Partial<Record<string, number>>;
  category: 'none' | 'minor' | 'moderate' | 'moderate_severe' | 'severe';
  posteriorCaveat: boolean;
  /**
   * total is 0, but there are symptoms the NIHSS simply does not score (e.g. monocular vision
   * loss, isolated vertigo). A 0 here means "no NIHSS-captured deficit", not "no symptoms".
   */
  uncaptured: boolean;
}

export interface SyndromeMatch {
  def: SyndromeDef;
  side: Side | null;
  /**
   * a label named for its vascular pattern (`def.pattern`) whose side has no symptom left (for a
   * bilateral label: no symptom from any region): the tissue is still damaged, but clinically
   * silent — compensated, or never noticeable
   */
  silent?: true;
}

const DEF_BY_BASE = indexById(REGION_DEFS, (d) => d.id);
const opp = (s: Side): Side => (s === 'r' ? 'l' : 'r');
/** the share of a region that must be dysfunctional (or infarcted) before its deficits are listed */
export const DYS_THR = 0.25;
/** a region counts as affected at DYS_THR; fractions are sums of exponentials, so a region that
 * is exactly at the threshold (e.g. one quarter-share artery lost) must not flicker on and off
 * with floating-point rounding */
const reaches = (x: number | undefined, thr = DYS_THR) => (x ?? 0) >= thr - 1e-6;
/** a deficit compensated below this (continuous) severity is no longer noticeable */
const COMPENSATED_OUT = NOTICEABLE;
/** from two weeks on a region's coma and drowsiness are listed as what follows them (C3-F2) */
const COMA_RELABEL_H = DELAYED_ONSET_H;
/** infarcted share of both sides from which tegmental damage counts as extensive (C3-F2) */
const EXTENSIVE = 0.5;
/** regions whose coma, after extensive damage on both sides, becomes a disorder of consciousness */
const DOC_SOURCES = ['pons_rostral_tegmentum', 'midbrain_paramedian'];
/** regions whose coma otherwise becomes persistent hypersomnia (the paramedian arousal system) */
const HYPERSOMNIA_SOURCES = ['thalamus_paramedian', 'midbrain_paramedian'];

/**
 * What a region's coma becomes from two weeks on, or null when it simply resolves. Coma rarely
 * lasts more than about two weeks: the person wakes into an unresponsive wakefulness or minimally
 * conscious state (O'Donnell JC et al. Neurosci Biobehav Rev 2019;98:336–346, definitions) or,
 * after ventral pontine damage, wakes up locked-in (Laureys S et al. Prog Brain Res
 * 2005;150:495–511) — the lesion map cannot tell these apart, so extensive bilateral tegmental
 * damage gives 'disorder_of_consciousness'. After paramedian thalamic and limited midbrain
 * damage the lasting problem is hypersomnia, a "dearoused" state, not coma (Castaigne P et al.
 * Ann Neurol 1981;10:127–148; Bassetti C et al. Ann Neurol 1996;39:471–480). The loss of
 * consciousness of bilateral pontine infarcts is otherwise transient (Kumral E et al. J Neurol
 * 2002;249:1659–1670).
 */
function comaBecomes(baseId: string, side: Side | 'm', regionInf: Record<string, number>): string | null {
  const extensive =
    side !== 'm' &&
    DOC_SOURCES.includes(baseId) &&
    reaches(regionInf[`${baseId}_r`], EXTENSIVE) &&
    reaches(regionInf[`${baseId}_l`], EXTENSIVE);
  if (extensive) return 'disorder_of_consciousness';
  return HYPERSOMNIA_SOURCES.includes(baseId) ? 'hypersomnia' : null;
}

/**
 * Both hemispheres largely out of action (Y2-13): at least two-thirds of the cortical areas of each
 * MCA territory dysfunctional, the extent that defines a large hemispheric infarction ("at least
 * two-thirds of the MCA territory": Huang H et al. Neurocrit Care 2020;33:376-388, PMID 32705419,
 * which puts early disorders of consciousness at about 77 % of such patients, whose infarct is
 * usually in one hemisphere). Simultaneous occlusion of both MCAs is rare and usually devastating, a high
 * NIHSS with a lowered level of consciousness being a clue to it (Phuyal S et al. J Neurosci Rural
 * Pract 2024;15:381-383, PMID 38746493, a case and a review of the literature). The model lists
 * at least drowsiness then (NIHSS 1a = 1), whatever the swelling, in the first two weeks of the
 * newer of the two lesions, like the drowsiness of a region (somnolence is the acute picture);
 * how much the level falls beyond that follows the swelling of both hemispheres together
 * (edema.massEffectMm). A model choice: no series gives the level of consciousness by extent.
 */
const LARGE_HEMISPHERIC_SHARE = 2 / 3;
export const BILATERAL_DROWSY_UNTIL_H = DELAYED_ONSET_H;
export function bilateralHemispheric(regionDys: Record<string, number>, ageOfRegion: (rid: string) => number = () => 0): boolean {
  let newest = Infinity;
  for (const side of ['r', 'l'] as Side[]) {
    const hit = MCA_CORTEX.map((b) => `${b}_${side}`).filter((rid) => reaches(regionDys[rid]));
    if (hit.length < LARGE_HEMISPHERIC_SHARE * MCA_CORTEX.length - 1e-9) return false;
    // when this hemisphere's lesion began (its oldest involved area)
    newest = Math.min(newest, Math.max(...hit.map(ageOfRegion)));
  }
  return newest < BILATERAL_DROWSY_UNTIL_H;
}

/**
 * The dysfunction of a region's ACA–MCA border-zone beds (the strip of the motor cortex next to
 * the vertex, between the ACA and MCA territories), for regions with `borderDeficits`.
 */
export interface BorderLevel {
  /** dysfunctional fraction of the border-zone beds */
  dys: number;
  /** infarcted fraction of the border-zone beds */
  inf: number;
  /** share of the region's dysfunctional volume that lies in them (0–1) */
  share: number;
}
/**
 * the region's dysfunction "lies mainly" in its border-zone beds from this share: a border-zone
 * (watershed) picture, not a territorial infarct that also reaches the border (an M1 occlusion
 * whose collaterals rescue the core of the motor strip, an ACA infarct)
 */
const BORDER_MAIN = 2 / 3;

/**
 * Aphasia types (C1-F1). Every patient has one type, assigned from fluency, comprehension and
 * repetition (Kertesz A, Poole E. The aphasia quotient: the taxonomic approach to measurement of
 * aphasic disability. Can J Neurol Sci 1974, reprinted 2004;31:175-184, PMID 15198441); a
 * transcortical sensory aphasia keeps repetition (Heilman KM et al. Arch Neurol 1981;38:236-239,
 * PMID 7213147), so it cannot coexist with a global or conduction aphasia. Each region-level
 * component adds features; the listed type follows from all of them, and changes as components
 * are compensated away (59 % of patients changed type within the first year, most in the first
 * two weeks: Pashek GV, Holland AL. Cortex 1988;24:411-423, PMID 3191724; global aphasia has the
 * worst outlook: Kertesz A, McCabe P. Brain 1977;100:1-18, PMID 861709).
 */
const APHASIA_FEATURES: Record<string, { nonfluent?: true; comprehension?: true; repetition?: true }> = {
  aphasia_broca: { nonfluent: true, repetition: true },
  aphasia_wernicke: { comprehension: true, repetition: true },
  aphasia_conduction: { repetition: true },
  aphasia_tc_motor: { nonfluent: true },
  aphasia_tc_sensory: { comprehension: true },
  aphasia_mixed_tc: { nonfluent: true, comprehension: true },
  aphasia_global: { nonfluent: true, comprehension: true, repetition: true },
};
const aphasiaType = (f: { nonfluent?: boolean; comprehension?: boolean; repetition?: boolean }): string => {
  if (f.nonfluent) {
    if (f.comprehension) return f.repetition ? 'aphasia_global' : 'aphasia_mixed_tc';
    return f.repetition ? 'aphasia_broca' : 'aphasia_tc_motor';
  }
  if (f.comprehension) return f.repetition ? 'aphasia_wernicke' : 'aphasia_tc_sensory';
  return 'aphasia_conduction';
};
/** aphasia types whose patient does not comprehend well (NIHSS 1b, 1c and 7; Gerstmann testing) */
export const POOR_COMPREHENSION_APHASIA = ['aphasia_global', 'aphasia_wernicke', 'aphasia_mixed_tc'];
const FIELD_DEFECTS = ['hemianopia', 'quadrant_sup', 'quadrant_inf', 'central_scotoma'];
/**
 * Spasticity grading (C10-F1). Spasticity was present in 42.6 % of patients with a central paresis
 * at 6 months, severe in 15.6 %, and predicted by a severe paresis and hemihypesthesia at onset
 * (Urban PP et al. Stroke 2010;41:2016-2020, PMID 20705930; 19 % of all first strokes at 3 months:
 * Sommerfeld DK et al. Stroke 2004;35:134-139, PMID 14684785). So it reaches severity 2 only on a
 * body side that had a severe (severity-3) arm or leg weakness, or a hemisensory loss, early on;
 * otherwise it stays mild (1). It is not capped by the later weakness (a modelling choice the
 * evidence does not support), and does not fade (redundancy EXEMPT).
 */
const SPASTICITY_PARESIS = ['arm_weak', 'leg_weak', 'arm_weak_proximal'];
/**
 * What can be examined depends on the level of consciousness. A sign that cannot be examined at
 * the patient's level is not listed then; the engine names it in `SimResult.unexaminable`, so it
 * is not mistaken for one that has gone (X1-2), and it is listed again once it can be examined.
 * Whether a sign can be examined is decided by how it is elicited, and for the signs the NIHSS
 * scores by the scale's own instructions (Torab-Miandoab A et al. Turk J Emerg Med 2020;20:118-134,
 * Appendix 3; PMID 32832731).
 *
 * Signs that only an awake, cooperating patient can show, report or be examined for: not listed
 * while the patient is stuporous or comatose (NIHSS 1a ≥ 2) or in a disorder of consciousness. A
 * stuporous patient "requires repeated stimulation to attend" (item 1a = 2) and cannot be tested
 * for any of them. The NIHSS scores none of them in such a patient: limb ataxia is scored absent
 * in a patient who cannot understand, and an arm by its drift and weakness (arm_weak, which stays
 * listed), not by the skill of the hand.
 */
export const NEEDS_AWAKE = [
  // behaviour, executive function, gait and emotional expression (R5-7)
  'disinhibition',
  'executive',
  'ataxia_gait',
  'emotionalism',
  'emotional_facial_paresis',
  // colour vision, reading, writing, calculation and finger naming (R1-5, R1-9 with R5-7): colour
  // loss is already left out where nothing is seen; "alexia without agraphia" and the Gerstmann
  // tetrad are named for what the patient reads and writes
  'achromatopsia',
  'hemiachromatopsia',
  'alexia',
  'agraphia',
  'acalculia',
  'finger_agnosia',
  // the other higher cortical signs (X1-12): recognising faces and objects, reaching under sight,
  // awareness of the deficit, praxis, spatial and route finding, the melody of speech and speech
  // planning, keeping a posture, the hand that acts on its own, recognising objects by touch,
  // memory, initiative and mood
  'prosopagnosia',
  'visual_agnosia',
  'simultanagnosia',
  'optic_ataxia',
  'anosognosia',
  'apraxia',
  'callosal_apraxia',
  'visuospatial',
  'topographic',
  'aprosodia',
  'apraxia_of_speech',
  'motor_impersistence',
  'alien_hand',
  'cortical_sensory',
  'amnesia',
  'abulia',
  'emotional',
  // akinetic mutism is a state of an awake patient: in stupor or coma it cannot be told apart from
  // the unresponsiveness (Y2-15)
  'akinetic_mutism',
  // what only the patient can report (X1-12); the signs the examiner sees (nystagmus, misaligned
  // eyes, the pupils) stay listed
  'vertigo',
  'diplopia',
  'hearing_loss',
  'taste_loss',
  'monocular_blind',
  'macular_sparing',
  'proprio_loss',
  'central_pain',
  'central_pain_face',
  // movements made on request: the finger–nose test (the scale scores limb ataxia as absent in a
  // patient who cannot understand), fine finger movements, an intention tremor, the late jerky and
  // unsteady hand; the weakness of the same arm stays listed and scored
  'ataxia_limb',
  'hand_clumsy',
  'tremor',
  'jerky_dystonic_hand',
];
/**
 * What is heard in the patient's speech, language (NIHSS item 9) and articulation (item 10): "The
 * examiner must choose a score for the patient with stupor or limited cooperation", and
 * articulation is rated from whatever speech there is, so an aphasia, a dysarthria and a hoarse
 * voice are listed and scored through stupor. In coma (1a = 3) the scale scores item 9 as 3
 * itself, and the comatose patient, being mute, scores 2 on item 10; a disorder of consciousness
 * is scored as a mute patient who follows no command (estimateNihss). None of them is listed then:
 * an aphasia type would claim fluent speech or good repetition, and a slurred or hoarse voice
 * speech that is not there (X1-5, X1-12). Anarthria, no speech at all from the bilateral ventral
 * pons, says nothing more than that and stays listed.
 */
export const SPEECH_SIGNS = [...Object.keys(APHASIA_FEATURES), 'aphasia_thalamic', 'dysarthria', 'hoarseness'];
/**
 * Attention (NIHSS item 11): "Since the abnormality is scored only if present, the item is never
 * untestable", so a neglect is listed while it can be seen, a disorder of consciousness included
 * (orienting to one side of space only). In coma it cannot be told apart from the unresponsiveness:
 * no neglect is listed then (X1-12), and estimateNihss scores the item by its convention for the
 * comatose patient (11 = 2).
 */
const ATTENTION_SIGNS = ['neglect'];
/**
 * Reported by a drowsy, not a comatose patient: hallucinations (C3-F10; the release
 * hallucinations of a blind half-field, C1-F11, as much as the peduncular ones) and a tremor of
 * the arm the person moves (R5-2): not listed while there is any coma or a disorder of
 * consciousness.
 */
const NEEDS_ALERT = ['peduncular_hallucinosis', 'visual_release_hallucinations', 'holmes_tremor'];

/**
 * Higher visual functions that need sight to be tested: recognising faces and objects by sight,
 * reading, finding the way by landmarks, seeing a scene as a whole, reaching under visual guidance
 * and the visuospatial (constructional) tasks. They are disorders of the higher visual system
 * (visual agnosia and Balint syndrome: Heutink J et al. Neuropsychol Rehabil 2019;29:1489-1508,
 * PMID 29366371) and presuppose sight: failing to recognise what is not seen at all is no agnosia.
 * So in a blind patient (cortical blindness, or both half-fields lost without spared central
 * vision) none of them can be tested (Y2-14): they are named apart, as for reduced consciousness,
 * and listed again once vision partly returns. Release hallucinations, seen in the blind field
 * itself, stay listed; colour is already left out where nothing is seen.
 */
export const NEEDS_SIGHT = ['prosopagnosia', 'visual_agnosia', 'simultanagnosia', 'optic_ataxia', 'visuospatial', 'topographic', 'alexia'];
/**
 * Akinetic mutism (bilateral medial frontal and anterior cingulate cortex): awake, eyes open and
 * following, but almost no spontaneous movement or speech, and no response to commands (Y2-15).
 * From moderate severity on, nothing that needs the patient to act on request, answer or report
 * can be examined (praxis, the alien hand, reaching, recognition, reading, writing and calculation,
 * memory, the finger–nose test, the aphasia type, what only the patient can tell): those signs are
 * named apart, as for reduced consciousness. What the examiner sees stays listed (the behaviour
 * itself: abulia, disinhibition, emotional expression; neglect, which the NIHSS scores whenever it
 * is seen). Mute (severity 3), the dysarthria and the hoarse voice cannot be heard either. The NIHSS
 * items are scored from the state itself (estimateNihss).
 */
export const AKINETIC_OBSERVED = ['akinetic_mutism', 'disinhibition', 'emotionalism', 'emotional_facial_paresis', 'abulia', 'emotional'];
const APHASIA_TYPES = [...Object.keys(APHASIA_FEATURES), 'aphasia_thalamic'];
/**
 * the severity of a listed (non-delayed) akinetic mutism in an awake patient, 0 without one (in
 * stupor, coma or a disorder of consciousness it cannot be examined, and the scale's own rules for
 * those states apply)
 */
const akineticLevel = (symptoms: SymptomItem[]) =>
  consciousnessItem(symptoms) >= 2 || symptoms.some((s) => s.id === 'disorder_of_consciousness')
    ? 0
    : symptoms.reduce((m, s) => (s.id === 'akinetic_mutism' && !s.delayed ? Math.max(m, s.sev) : m), 0);
/**
 * Nothing is seen: cortical blindness, or both half-fields lost without spared central vision (the
 * same rule that leaves colour out, lesionSymptoms).
 */
export const isBlind = (symptoms: SymptomItem[]) =>
  symptoms.some((s) => s.id === 'cortical_blindness') ||
  (symptoms.some((s) => s.id === 'hemianopia' && s.side === 'r') &&
    symptoms.some((s) => s.id === 'hemianopia' && s.side === 'l') &&
    !symptoms.some((s) => s.id === 'macular_sparing'));

/** NIHSS item 1a given by the listed level-of-consciousness symptoms (0 alert … 3 coma) */
function consciousnessItem(symptoms: SymptomItem[]): number {
  let loc = 0;
  for (const s of symptoms) {
    const n = SYMPTOM_BY_ID[s.id]?.nihss;
    if (n?.item === '1a' && !s.delayed) loc = Math.max(loc, n.pts[s.sev - 1]);
  }
  return loc;
}

/**
 * Why a sign cannot be examined in a patient whose lesion gives `symptoms` (the symptom list it
 * would join), or null when it can: the level of consciousness (NEEDS_AWAKE, SPEECH_SIGNS,
 * ATTENTION_SIGNS and NEEDS_ALERT), blindness (NEEDS_SIGHT) or akinetic mutism (see
 * AKINETIC_OBSERVED). The first reason that applies is given.
 */
export function examinability(id: string, symptoms: SymptomItem[]): UnexaminableWhy | null {
  const doc = symptoms.some((s) => s.id === 'disorder_of_consciousness');
  const loc = consciousnessItem(symptoms);
  if (NEEDS_ALERT.includes(id)) {
    if (doc || symptoms.some((s) => s.id === 'coma')) return 'consciousness';
  } else if (NEEDS_AWAKE.includes(id)) {
    if (loc >= 2 || doc) return 'consciousness';
  } else if (SPEECH_SIGNS.includes(id)) {
    if (loc >= 3 || doc) return 'consciousness';
  } else if (ATTENTION_SIGNS.includes(id) && loc >= 3) return 'consciousness';
  if (NEEDS_SIGHT.includes(id) && isBlind(symptoms)) return 'blind';
  const akinetic = akineticLevel(symptoms);
  if (akinetic >= 2) {
    if (NEEDS_AWAKE.includes(id) && !AKINETIC_OBSERVED.includes(id)) return 'akinetic';
    if (APHASIA_TYPES.includes(id)) return 'akinetic';
    if (akinetic >= 3 && SPEECH_SIGNS.includes(id)) return 'akinetic';
  }
  return null;
}

/** Whether a sign cannot be examined now (examinability), and so is not listed. */
export function unexaminable(id: string, symptoms: SymptomItem[]): boolean {
  return examinability(id, symptoms) !== null;
}

/**
 * The symptom list as shown (what can be examined now) and what is left out of it, each with why:
 * the level of consciousness, blindness or akinetic mutism (examinability).
 */
export function byConsciousness(symptoms: SymptomItem[]): { shown: SymptomItem[]; unexaminable: SymptomItem[] } {
  const shown: SymptomItem[] = [];
  const hidden: SymptomItem[] = [];
  for (const s of symptoms) {
    const why = examinability(s.id, symptoms);
    if (why) hidden.push({ ...s, why });
    else shown.push(s);
  }
  return { shown, unexaminable: hidden };
}
const SPASTICITY_SENSORY = ['sens_face_arm', 'sens_leg', 'sens_hemibody', 'pain_temp_body', 'proprio_loss'];

/**
 * After an artery has reopened (simulate.ts, X2-9): a deficit that cleared when blood returned is
 * listed again only when the region's tissue itself gives it, not through the passing
 * perilesional depression of the following days (recovery.extraDys). Keys are `symptom|side` as a
 * region gives the deficit, before the merges (two quadrantanopias into a hemianopia …).
 */
export interface SymptomHold {
  /** the deficits that cleared when blood last returned */
  keys?: Set<string>;
  /** per region, its level without the passing depression */
  base?: Record<string, number>;
  /** per region with border-zone deficits, the level of those beds without it */
  borderBase?: Record<string, number>;
  /** regions that became ischaemic again since: a new lesion, not held */
  fresh?: Set<string>;
  /** when given, filled with the key of every deficit a region gives */
  trace?: Set<string>;
}

/**
 * Everything the regional dysfunction gives, at every level of consciousness: aggregateSymptoms
 * without leaving out what cannot be examined (byConsciousness).
 */
export function lesionSymptoms(
  regionDys: Record<string, number>,
  regionInf: Record<string, number>,
  tH: number,
  extra: SymptomItem[] = [],
  /** regions damaged only by a lacune (functions marked spareInLacune are kept) */
  lacuneOnly: string[] = [],
  /** border-zone levels of the regions with `borderDeficits` (see BorderLevel) */
  border: Record<string, BorderLevel> = {},
  /**
   * what the lacune does in a region of `lacuneOnly` whose lacune site has its own deficit list
   * (anatomy/lacunes.ts): it replaces the region's deficits there
   */
  lacuneDeficits: Record<string, DeficitRef[]> = {},
  /**
   * the region dysfunction at onset (core + penumbra in the first hour; a lacune at its level),
   * for what the early picture predicts (spasticity, C10-F1); left out, the levels at `tH` are used
   */
  acuteDys?: Record<string, number>,
  /**
   * hours since each region became ischaemic, when that differs from `tH` (an occlusion that
   * starts after the index event, R6-6): a region's late symptoms, the relabelling of its coma and
   * drowsiness and its compensation follow the age of its own lesion. Regions left out use `tH`.
   */
  regionAgeH?: Record<string, number>,
  /** after an artery has reopened: the deficits held back (see SymptomHold) and a trace of what is given */
  hold?: SymptomHold,
  /**
   * per region, two levels below `regionDys` (Y1-12): `steady`, from dead and still ischaemic tissue
   * alone (without the tissue regaining its function after a reopening, or penumbra that collaterals
   * held, and without the passing perilesional depression), above which what a region gives fades;
   * and `base`, without the passing depression only, from which a global aphasia is graded
   */
  levels?: { steady: Record<string, number>; base: Record<string, number> },
): SymptomItem[] {
  const steady = levels?.steady;
  const map = new Map<string, SymptomItem>();
  const add = (id: string, side: SymptomItem['side'], sev: number, src: string, delayed: boolean, recovery?: SymptomRecovery) => {
    const key = `${id}|${side ?? ''}`;
    const s = Math.max(1, Math.min(3, Math.round(sev))) as 1 | 2 | 3;
    const prev = map.get(key);
    if (prev) {
      // the outlook follows the source that sets the severity (on a tie, the less compensated one)
      if (recovery && (!prev.recovery || s > prev.sev || (s === prev.sev && recovery.compensated < prev.recovery.compensated)))
        prev.recovery = recovery;
      prev.sev = Math.max(prev.sev, s) as 1 | 2 | 3;
      if (!prev.sources.includes(src)) prev.sources.push(src);
    } else {
      map.set(key, recovery ? { id, side, sev: s, sources: [src], delayed, recovery } : { id, side, sev: s, sources: [src], delayed });
    }
  };
  // which sides have dead tissue serving each function: a one-sided loss compensates better
  const lesions = lesionSides(regionInf);
  /** the strongest region source of each aphasia component before compensation (for a global aphasia) */
  /** (`rawBase`: the same without the passing perilesional depression: what grades a global aphasia) */
  const aphasiaRaw = new Map<string, { raw: number; rawBase: number; r: Region; level: number; inf: number }>();
  /** each listed aphasia component's severity after its own compensation (not rounded) */
  const aphasiaNow = new Map<string, number>();
  /**
   * a symptom fades: no region it comes from gives it by its dead or still ischaemic tissue alone
   * (`steady`), only through tissue regaining its function after a reopening (Y1-12) or the passing
   * perilesional depression, so it will go; one from dead tissue, or from a lasting event (no
   * region), stays
   */
  const fading = (x: SymptomItem) => !!steady && !x.sources.some((src) => !REGION_BY_ID[src] || reaches(steady[src] ?? 0));
  /** per body side: the worst early limb weakness (before rounding) and any early hemisensory loss */
  const earlyParesis: Record<Side, number> = { r: 0, l: 0 };
  const earlySensory: Record<Side, boolean> = { r: false, l: false };

  /** the age of a region's lesion (R6-6) */
  const ageOf = (rid: string) => regionAgeH?.[rid] ?? tH;
  for (const r of REGIONS) {
    const def = DEF_BY_BASE[r.baseId];
    const age = ageOf(r.id);
    // a region whose dysfunction lies mainly in its ACA–MCA border-zone beds does what that
    // strip does (C1-F6), at the level of those beds
    const b = def.borderDeficits ? border[r.id] : undefined;
    const inBorder = !!b && b.share >= BORDER_MAIN && (reaches(b.dys) || reaches(b.inf));
    // a region of compact tracts and nuclei (the brainstem) whose own tissue (dead, still
    // ischaemic, still regaining its function) is below the symptom threshold is graded by that
    // tissue (Z2-8), not pushed over the threshold by the passing perilesional depression of the
    // first days: a small infarct of the cerebral peduncle gave a new dense hemiparesis on day 2
    // with no mass effect, which then went again (Z2-9). From the threshold the depression deepens
    // its deficits as elsewhere.
    const compact = isCompact(r);
    const own = (x: string) => {
      const all = regionDys[x] ?? 0;
      const tissue = levels?.base[x] ?? all;
      return compact && !reaches(tissue) ? Math.min(all, tissue) : all;
    };
    const inf = inBorder ? b!.inf : regionInf[r.id] ?? 0;
    const dys = inBorder ? b!.dys : own(r.id);
    /** this region's level gives a deficit: from the threshold, or graded below it (compact) */
    const gives = (x: number, thr = DYS_THR, taper = compact) => reaches(x, thr) || (taper && x > COMPACT_FROM);
    if (!gives(dys) && !gives(inf)) continue;
    const lacune = lacuneOnly.includes(r.id);
    const list = inBorder ? def.borderDeficits! : (lacune && lacuneDeficits[r.id]) || def.deficits;
    for (const d of list) {
      const sym = SYMPTOM_BY_ID[d.s];
      if (!sym) continue;
      if (d.only && r.side !== d.only) continue;
      if (d.spareInLacune && lacune) continue;
      const paresis = SPASTICITY_PARESIS.includes(d.s);
      if ((paresis || SPASTICITY_SENSORY.includes(d.s)) && r.side !== 'm' && !d.bilateralOnly) {
        const early = acuteDys ? Math.max(acuteDys[r.id] ?? 0, inf) : Math.max(dys, inf);
        if (reaches(early, Math.max(DYS_THR, d.minLevel ?? 0))) {
          const bodySide = d.lat === 'ipsi' ? r.side : opp(r.side);
          if (paresis) earlyParesis[bodySide] = Math.max(earlyParesis[bodySide], (d.sev ?? 2) * (0.35 + 0.65 * Math.min(1, early / 0.8)));
          else earlySensory[bodySide] = true;
        }
      }
      const delayed = !!sym.delayed;
      const byInfarct = delayed || !!sym.fromInfarct;
      const level = byInfarct ? inf : dys;
      const thr = Math.max(DYS_THR, d.minLevel ?? 0);
      // graded below the threshold (recovery.tapers, Z2-8)
      const tapers = tapersBelow(r, d);
      // a deep tract that a large lesion reached at onset stays cut where that lesion left an
      // infarct, whether or not the cortex above it has recovered (R1-6)
      const tractCut = () => {
        const onset = acuteDys ? Math.max(acuteDys[r.id] ?? 0, inf) : Math.max(dys, inf);
        return reaches(onset, thr) && reaches(inf);
      };
      if (!gives(level, thr, tapers) && !(d.deepTract && tractCut())) continue;
      // each late symptom from its own onset (C10-F2), counted from the region's own lesion (R6-6)
      if (age < symptomOnsetH(sym)) continue;
      // drowsiness is the acute picture: a raised need for sleep that lasts beyond two weeks is
      // listed as persistent hypersomnia (C3-F2)
      if (d.s === 'somnolence' && age >= COMA_RELABEL_H) continue;
      if (d.bilateralOnly) {
        if (r.side === 'm') continue;
        const other = `${r.baseId}_${opp(r.side)}`;
        const lvl2 = byInfarct ? regionInf[other] ?? 0 : own(other);
        if (!reaches(lvl2, thr)) continue;
      }
      let side: SymptomItem['side'] = null;
      if (sym.lateralised) {
        if (r.side === 'm' || d.lat === 'none') side = r.side === 'm' ? 'both' : null;
        else side = d.lat === 'contra' ? opp(r.side) : r.side;
      }
      // a deficit that cleared when blood returned comes back only from the tissue itself, not
      // through the perilesional depression of the following days (X2-9)
      const key = `${d.s}|${side ?? ''}`;
      if (!byInfarct && hold?.keys?.has(key) && !hold.fresh?.has(r.id)) {
        const self = (inBorder ? hold.borderBase?.[r.id] : hold.base?.[r.id]) ?? 0;
        const other = d.bilateralOnly && r.side !== 'm' ? hold.base?.[`${r.baseId}_${opp(r.side)}`] ?? 0 : thr;
        if (!(gives(self, thr, tapers) && reaches(other, thr)) && !(d.deepTract && tractCut())) continue;
      }
      // from two weeks on a region's coma is listed as what follows it (C3-F2)
      let id = d.s;
      let shownDelayed = delayed;
      if (d.s === 'coma' && age >= COMA_RELABEL_H) {
        const next = comaBecomes(r.baseId, r.side, regionInf);
        if (!next) continue;
        id = next;
        shownDelayed = !!SYMPTOM_BY_ID[next]?.delayed;
      }
      const peak = sym.peakH && age >= sym.peakH[0] && age < sym.peakH[1] ? 1 : 0;
      const raw = ((d.sev ?? 2) + peak) * gradeFactor(level, tapers);
      let sevEff = raw;
      // graded below the threshold, a deficit too slight to notice is not listed
      if (tapers && !reaches(level, thr) && raw < COMPENSATED_OUT) continue;
      // the hypersomnia that follows coma is a sleep disorder, never worse than moderate
      if (id === 'hypersomnia' && d.s === 'coma') sevEff = Math.min(sevEff, 2);
      // weeks–months later, spared pathways take over part of what the dead tissue did; a coma
      // that became a disorder of consciousness keeps the arousal system's (coma's) redundancy
      // a limb weakness from where the corticospinal fibres converge recovers little once most of
      // the tract there is lost under a weakness that was plegic at first (Y1-1)
      const early = acuteDys ? Math.max(acuteDys[r.id] ?? 0, inf) : Math.max(dys, inf);
      const tract = corticospinalLoss(d.s, r.baseId, inf, initialSeverity(d.sev ?? 2, early), lacune);
      const rec = symptomCompensation(id === 'hypersomnia' ? id : d.s, r, level, inf, lesions, age, d.fast, Math.round(raw) >= 3, d.redundancy, tract);
      if (rec.compensated > 0) {
        sevEff *= 1 - rec.compensated;
        if (sevEff < COMPENSATED_OUT) continue;
      }
      if (APHASIA_FEATURES[id]) {
        const baseLevel = inBorder || !levels ? level : Math.min(level, levels.base[r.id] ?? level);
        const rawBase = ((d.sev ?? 2) + peak) * (0.35 + 0.65 * Math.min(1, baseLevel / 0.8));
        if (raw > (aphasiaRaw.get(id)?.raw ?? 0)) aphasiaRaw.set(id, { raw, rawBase, r, level, inf });
        aphasiaNow.set(id, Math.max(aphasiaNow.get(id) ?? 0, sevEff));
      }
      hold?.trace?.add(key);
      add(id, side, sevEff, r.id, shownDelayed, rec);
    }
  }
  for (const e of extra) add(e.id, e.side, e.sev, e.sources[0] ?? '', e.delayed);

  // merges
  const get = (id: string, side: SymptomItem['side']) => map.get(`${id}|${side ?? ''}`);
  const del = (id: string, side: SymptomItem['side']) => map.delete(`${id}|${side ?? ''}`);
  // a deficit of both body sides (from a midline region: the upper cervical cord) and the same
  // deficit of one side (from another region) are one deficit of each side, at the worse
  // severity, not a third entry beside them (Y2-17)
  for (const both of [...map.values()].filter((s) => s.side === 'both')) {
    if (!get(both.id, 'r') && !get(both.id, 'l')) continue;
    for (const fs of ['r', 'l'] as Side[]) {
      const one = get(both.id, fs);
      if (!one) {
        map.set(`${both.id}|${fs}`, { ...both, side: fs, sources: [...both.sources] });
        continue;
      }
      if (both.sev > one.sev) {
        one.sev = both.sev;
        if (both.recovery) one.recovery = both.recovery;
      }
      for (const src of both.sources) if (!one.sources.includes(src)) one.sources.push(src);
    }
    del(both.id, 'both');
  }
  // Each frontal eye field turns the eyes towards its own side; it disengages fixation and
  // triggers voluntary saccades (Pierrot-Deseilligny C et al. Ann Neurol 1995;37:557-567, PMID
  // 7755349). With both lost the eyes cannot deviate to the right and to the left at once: the
  // pulls cancel, and what is left is a voluntary gaze paresis to both sides, which the
  // oculocephalic manoeuvre overcomes (acquired ocular motor apraxia after bilateral frontoparietal
  // infarcts: Pierrot-Deseilligny C et al. Ann Neurol 1988;23:199-202, PMID 3270327). When one side
  // is the worse, the other still pulls a little harder: the eyes deviate towards the worse side,
  // less forcefully (Y2-13).
  const gazeR = get('gaze_deviation', 'r');
  const gazeL = get('gaze_deviation', 'l');
  if (gazeR && gazeL) {
    const [hi, lo] = gazeR.sev >= gazeL.sev ? [gazeR, gazeL] : [gazeL, gazeR];
    const sources = [...new Set([...hi.sources, ...lo.sources])];
    del('gaze_deviation', 'r');
    del('gaze_deviation', 'l');
    if (hi.sev > lo.sev) map.set(`gaze_deviation|${hi.side}`, { ...hi, sev: (hi.sev - lo.sev) as 1 | 2 | 3, sources });
    else map.set('gaze_paresis_bilateral|', { ...hi, id: 'gaze_paresis_bilateral', side: null, sources });
  }
  for (const fs of ['r', 'l'] as Side[]) {
    const sup = get('quadrant_sup', fs);
    const inf = get('quadrant_inf', fs);
    if (sup && inf) {
      add('hemianopia', fs, Math.max(sup.sev, inf.sev, 2), sup.sources[0], false);
      const h = get('hemianopia', fs)!;
      for (const src of inf.sources) if (!h.sources.includes(src)) h.sources.push(src);
      del('quadrant_sup', fs);
      del('quadrant_inf', fs);
    }
    if (get('hemianopia', fs)) {
      del('quadrant_sup', fs);
      del('quadrant_inf', fs);
      // a central scotoma is part of a complete hemianopia
      del('central_scotoma', fs);
    }
  }
  // cortical blindness (C1-F7) needs both banks of the calcarine fissure on both sides, and
  // central vision lost too: one bank on each side leaves bilateral quadrantic (altitudinal)
  // defects, and spared poles a bilateral hemianopia with central ("keyhole") vision
  const occip = (h: Side) => reaches(regionDys[`cuneus_${h}`]) || reaches(regionDys[`lingual_${h}`]);
  const banks = (h: Side) => reaches(regionDys[`cuneus_${h}`]) && reaches(regionDys[`lingual_${h}`]);
  // the pole (central vision) has dual PCA + MCA supply: when it is clearly less damaged than
  // the calcarine cortex, the centre of the field is (at least partly) spared
  const calcarine = (h: Side) => Math.min(regionDys[`cuneus_${h}`] ?? 0, regionDys[`lingual_${h}`] ?? 0);
  const poleSpared = (h: Side) => (regionDys[`occipital_pole_${h}`] ?? 0) < 0.75 * calcarine(h);
  if (banks('r') && banks('l') && !(poleSpared('r') && poleSpared('l'))) {
    const srcs = ['cuneus_r', 'lingual_r', 'cuneus_l', 'lingual_l'];
    for (const fs of ['r', 'l'] as Side[]) for (const id of FIELD_DEFECTS) del(id, fs);
    for (const src of srcs) add('cortical_blindness', null, 3, src, false);
  } else {
    for (const h of ['r', 'l'] as Side[]) {
      if (occip(h) && get('hemianopia', opp(h)) && poleSpared(h)) add('macular_sparing', null, 1, `occipital_pole_${h}`, false);
    }
  }
  // release hallucinations are seen in a blind part of the field (C1-F11)
  for (const fs of ['r', 'l'] as Side[]) {
    if (get('visual_release_hallucinations', fs) && !map.has('cortical_blindness|') && !FIELD_DEFECTS.some((id) => get(id, fs)))
      del('visual_release_hallucinations', fs);
  }
  // spasticity is mild unless that side had a severe weakness or a hemisensory loss early (C10-F1)
  for (const fs of ['r', 'l'] as Side[]) {
    const sp = get('spasticity', fs);
    if (sp && sp.sev > 1 && earlyParesis[fs] < 2.5 - 1e-9 && !earlySensory[fs]) sp.sev = 1;
  }
  // colour lost in the whole field takes in the half-field loss (C1-F8)
  if (map.has('achromatopsia|')) for (const fs of ['r', 'l'] as Side[]) del('hemiachromatopsia', fs);
  // colour cannot be lost, or tested, where nothing is seen (R1-5): no half-field colour loss in
  // a hemianopic half-field, and no colour loss at all when the whole field is blind (cortical
  // blindness, or both half-fields lost without spared central vision)
  const allBlind = map.has('cortical_blindness|') || (!!get('hemianopia', 'r') && !!get('hemianopia', 'l') && !map.has('macular_sparing|'));
  for (const fs of ['r', 'l'] as Side[]) if (allBlind || get('hemianopia', fs)) del('hemiachromatopsia', fs);
  if (allBlind) del('achromatopsia', null);

  // one aphasia type (C1-F1), from the features of the components still listed
  const components = [...map.values()].filter((s) => APHASIA_FEATURES[s.id]);
  if (components.length > 0) {
    const features = (list: SymptomItem[]) => Object.assign({}, ...list.map((s) => APHASIA_FEATURES[s.id]));
    // apraxia of speech makes speech effortful and non-fluent: with only mild fluent components left
    // that fade as their tissue regains its function (Y1-12), the picture stays a non-fluent one;
    // otherwise the type would turn fluent, drop the apraxia of speech, and give it back once those
    // components are gone
    const aos = map.get('apraxia_of_speech|');
    const aosOverFading = !!aos && components.every((s) => s.sev < 2 && !APHASIA_FEATURES[s.id].nonfluent && fading(s));
    let type = aphasiaType(aosOverFading ? { ...features(components), nonfluent: true } : features(components));
    let sev = Math.max(...components.map((s) => s.sev));
    let recovery = components.find((s) => s.sev === sev)?.recovery;
    if (type === 'aphasia_global') {
      // graded from its components, without a fixed step up, and compensated as a global
      // aphasia (the poorest outlook), so that it can become a Broca or Wernicke type later; the
      // passing perilesional depression of days 2–5 deepens its components but does not make a
      // global aphasia of one that had become milder (after a reopening, as the rescued cortex
      // regains its function: Y1-12)
      let best = -1;
      for (const s of components) {
        const c = aphasiaRaw.get(s.id);
        if (!c) continue;
        const rec = symptomCompensation('aphasia_global', c.r, c.level, c.inf, lesions, ageOf(c.r.id));
        const v = c.rawBase * (1 - rec.compensated);
        if (v > best) {
          best = v;
          recovery = rec;
        }
      }
      if (best > 0) sev = Math.max(1, Math.min(3, Math.round(best))) as 1 | 2 | 3;
      // Global aphasia is the most severe type by definition (Kertesz & Poole), so a mild one
      // is no longer global. In the first year the type always changed to a less severe form, and
      // a fluent aphasia never became non-fluent (global to Wernicke's, Broca's to anomic;
      // Copenhagen aphasia study: Pedersen PM et al. Cerebrovasc Dis 2004;17:35-43, PMID
      // 14530636). The type follows the components still at moderate severity (R1-2). When all
      // are mild, comprehension or fluency, whichever is now the less impaired, has recovered
      // first: a Broca type (comprehension recovered) or a Wernicke type (fluency recovered), both
      // keeping the impaired repetition; when the two are equally impaired it stays a Broca type,
      // as the rule before gave for components of equal severity (X3-14). Taking instead the one
      // component most severe after its own compensation let the type swing between a fluent and
      // a non-fluent one when two components of almost the same severity recovered at slightly
      // different rates (a conduction type, then Broca's, then a conduction type again).
      if (sev < 2) {
        const strong = components.filter((s) => s.sev >= 2);
        const strongType = strong.length > 0 ? aphasiaType(features(strong)) : 'aphasia_global';
        const now = (s: SymptomItem) => aphasiaNow.get(s.id) ?? s.sev;
        const strongest = (f: 'nonfluent' | 'comprehension') => Math.max(0, ...components.filter((s) => APHASIA_FEATURES[s.id][f]).map(now));
        // what lasts decides first: while tissue regains its function after a reopening, the
        // components it gives fade, and those of dead tissue (or of a lasting event, the
        // subcortical aphasia of a striatocapsular infarct) stay; a type that follows the fading
        // ones would turn fluent and then non-fluent again (Y1-12)
        const lasting = components.filter((s) => !fading(s));
        // (a listed apraxia of speech keeps the speech non-fluent)
        const lastingNonfluent = lasting.some((s) => APHASIA_FEATURES[s.id].nonfluent) || !!aos;
        const lastingComprehension = lasting.some((s) => APHASIA_FEATURES[s.id].comprehension);
        type =
          strongType !== 'aphasia_global'
            ? strongType
            : lastingNonfluent !== lastingComprehension
              ? lastingNonfluent
                ? 'aphasia_broca'
                : 'aphasia_wernicke'
              : strongest('comprehension') <= strongest('nonfluent')
                ? 'aphasia_broca'
                : 'aphasia_wernicke';
        const shares = (s: SymptomItem) => (Object.keys(APHASIA_FEATURES[s.id]) as (keyof (typeof APHASIA_FEATURES)[string])[]).some((f) => APHASIA_FEATURES[type][f]);
        const kept = strongType !== 'aphasia_global' ? strong : components.filter(shares);
        sev = Math.max(...kept.map((s) => s.sev)) as 1 | 2 | 3;
        recovery = kept.reduce((a, b) => (now(b) > now(a) ? b : a)).recovery;
      }
    }
    const sources = [...new Set(components.flatMap((s) => s.sources))];
    for (const s of components) del(s.id, null);
    map.set(`${type}|`, recovery ? { id: type, side: null, sev: sev as 1 | 2 | 3, sources, delayed: false, recovery } : { id: type, side: null, sev: sev as 1 | 2 | 3, sources, delayed: false });
    // apraxia of speech is a non-fluent motor-speech disorder: a fluent aphasia type contradicts it
    if (!APHASIA_FEATURES[type].nonfluent) del('apraxia_of_speech', null);
    // the word-finding difficulty of a thalamic aphasia (C9-F4) is part of the cortical type
    // listed with it: one aphasia type at a time (C1-F1)
    del('aphasia_thalamic', null);
  }
  // swallowing has a bilateral cortical representation (Hamdy S et al. Nat Med 1996;2:1217-1224,
  // PMID 8898748): a lesion of both hemispheres leaves less to take over
  const dysphagia = get('dysphagia', null);
  if (dysphagia && dysphagia.sev < 2) {
    const sides = new Set(dysphagia.sources.map((src) => REGION_BY_ID[src]?.side));
    if (sides.has('r') && sides.has('l')) dysphagia.sev = 2;
  }
  // bilateral ventral pons: anarthria (no speech at all) replaces, rather than adds to, the
  // milder unilateral dysarthria picture
  if (map.has('anarthria|')) del('dysarthria', null);
  // with horizontal gaze palsies to both sides no horizontal eye movement is left at all, so a
  // separate abducens palsy or INO can no longer be seen (a one-sided gaze palsy keeps them)
  if (get('gaze_palsy_horizontal', 'r') && get('gaze_palsy_horizontal', 'l')) {
    for (const fs of ['r', 'l'] as Side[]) {
      del('cn6_palsy', fs);
      del('ino', fs);
    }
  }
  if (map.has('coma|')) del('somnolence', null);
  // a sleep disorder cannot be told apart from coma or from a disorder of consciousness (C3-F2)
  if (map.has('coma|') || map.has('disorder_of_consciousness|')) del('hypersomnia', null);
  // central sleep apnoea after a one-sided lateral medullary lesion is the mild end of what
  // `respiratory` (automatic breathing failing, including in sleep) describes: list it once
  if (map.has('respiratory|')) del('central_sleep_apnoea', null);
  // the side of a skew deviation is that of the lower eye, known for one-sided lesions (Brandt &
  // Dieterich 1993); lesions of both sides have no single lower eye, so none is listed (C3-F5)
  if (get('skew_deviation', 'r') && get('skew_deviation', 'l')) {
    del('skew_deviation', 'r');
    del('skew_deviation', 'l');
  }
  // an emotional facial paresis is a face that moves normally on command: not on a side whose face
  // is weak on command (R5-7)
  for (const fs of ['r', 'l'] as Side[])
    if (['face_weak', 'face_weak_peripheral'].some((id) => get(id, fs) || get(id, 'both'))) del('emotional_facial_paresis', fs);
  // misaligned eyes see double; a skew deviation gives vertical double vision (C3-F5)
  const eye = ['cn3_palsy', 'cn4_palsy', 'cn6_palsy', 'ino', 'skew_deviation'];
  if ([...map.values()].some((s) => eye.includes(s.id)) && !map.has('diplopia|')) {
    add('diplopia', null, 2, [...map.values()].find((s) => eye.includes(s.id))!.sources[0], false);
  }
  return [...map.values()];
}

/**
 * The symptoms of the regional dysfunction as listed: what can be examined at the patient's level
 * of consciousness (byConsciousness; R5-7, X1-5, X1-12). The parameters are lesionSymptoms'.
 */
export function aggregateSymptoms(...args: Parameters<typeof lesionSymptoms>): SymptomItem[] {
  return byConsciousness(lesionSymptoms(...args)).shown;
}

/**
 * The item rules follow the NIH Stroke Scale instructions (reproduced in Torab-Miandoab A et al.
 * Turk J Emerg Med 2020;20:118-134, Appendix 3; PMID 32832731): 1b scores 2 for aphasic and
 * stuporous patients who do not comprehend and 1 for those unable to speak because of severe
 * dysarthria; ataxia (7) is absent in a patient who cannot understand or is paralysed; a
 * brainstem stroke with bilateral loss of sensation scores 2 on item 8; a 3 on item 9 means mute
 * and following no one-step command, so 1c and 10 score 2 with it.
 */
export function estimateNihss(symptoms: SymptomItem[], posteriorCirculation = false): NihssResult {
  const items: Record<string, number> = {};
  const set = (k: string, v: number, cap: number) => (items[k] = Math.min(cap, Math.max(items[k] ?? 0, v)));
  const pts = (id: string, sev: number) => {
    const n = SYMPTOM_BY_ID[id]?.nihss;
    return n ? n.pts[sev - 1] : 0;
  };
  const armSide = { r: 0, l: 0 };
  const legSide = { r: 0, l: 0 };
  const ataxia = { r: 0, l: 0 };
  /** body sides with pinprick-type (item 8) loss that comes from the brainstem alone */
  const brainstemSensory = new Set<Side>();
  // akinetic mutism (Y2-15): no aphasia type can be graded in a patient who speaks too little to
  // grade it (moderate) or not at all (severe); items 9, 1b and 1c are scored from the state itself
  const akinetic = akineticLevel(symptoms);
  for (const s of symptoms) {
    if (s.delayed) continue;
    if (akinetic >= 2 && APHASIA_TYPES.includes(s.id)) continue;
    const n = SYMPTOM_BY_ID[s.id]?.nihss;
    if (!n) continue;
    const p = pts(s.id, s.sev);
    const sides: Side[] = s.side === 'both' ? ['r', 'l'] : s.side === 'r' || s.side === 'l' ? [s.side] : [];
    switch (n.item as NihssItem) {
      case '5':
        for (const sd of sides) {
          set(`5${sd}`, p, 4);
          armSide[sd] = Math.max(armSide[sd], p);
        }
        break;
      case '6':
        for (const sd of sides) {
          set(`6${sd}`, p, 4);
          legSide[sd] = Math.max(legSide[sd], p);
        }
        break;
      case '7':
        // item 7 counts limbs: a mild ataxia is one limb (1), a moderate or marked one the arm and
        // the leg of that side (2: symptoms.ts, Y2-8); both sides add up, to at most 2
        for (const sd of sides) ataxia[sd] = Math.max(ataxia[sd], Math.min(2, p));
        break;
      case '1a':
        set('1a', p, 3);
        break;
      case '2':
        set('2', p, 2);
        break;
      case '3':
        set('3', p, 3);
        break;
      case '4':
        set('4', p, 3);
        break;
      case '8':
        set('8', p, 2);
        // (the upper cervical cord just below the medulla may share it: Y2-17 merges its loss of
        // both sides into each side's loss from the medulla)
        if (
          s.sources.some((src) => REGION_BY_ID[src]?.category === 'brainstem') &&
          s.sources.every((src) => ['brainstem', 'spinal'].includes(REGION_BY_ID[src]?.category))
        )
          for (const sd of sides) brainstemSensory.add(sd);
        break;
      case '9':
        set('9', p, 3);
        break;
      case '10':
        set('10', p, 2);
        break;
      case '11':
        set('11', p, 2);
        break;
      default:
        break;
    }
  }
  const has = (id: string) => symptoms.some((s) => s.id === id && !s.delayed);
  // the aphasia type with poor comprehension (global, Wernicke, mixed transcortical), if any (none
  // can be graded in a moderate or severe akinetic mutism)
  const poorComprehension = akinetic >= 2 ? undefined : symptoms.find((s) => !s.delayed && POOR_COMPREHENSION_APHASIA.includes(s.id));
  // limb ataxia is scored only if out of proportion to weakness, and is absent in a patient who
  // cannot understand or is paralysed: not on a side whose arm cannot move against gravity or
  // whose leg cannot move at all, and not at all in a stuporous patient (1a ≥ 2, who cannot do
  // the finger-nose test), one in a disorder of consciousness (who follows no command, below), one
  // whose aphasia leaves too little comprehension to follow it, or one in akinetic mutism, who
  // does not act on request (Y2-15)
  const cannotCooperate = (items['1a'] ?? 0) >= 2 || has('disorder_of_consciousness') || (poorComprehension?.sev ?? 0) >= 2 || akinetic >= 2;
  const ax = cannotCooperate
    ? 0
    : (['r', 'l'] as Side[]).reduce((a, sd) => a + (armSide[sd] >= 3 || legSide[sd] >= 4 ? 0 : ataxia[sd]), 0);
  if (ax) set('7', ax, 2);
  // a brainstem stroke with loss of (pinprick) sensation on both sides scores 2
  if (brainstemSensory.size === 2) set('8', 2, 2);
  // hemianopia on both sides without explicit cortical blindness
  if (symptoms.filter((s) => s.id === 'hemianopia').length >= 2) set('3', 3, 3);
  // questions / commands depend on language and consciousness: an aphasic patient who does not
  // comprehend the questions scores 2, one who answers one of them 1 (C1-F1: graded by the
  // severity of the aphasia, so a compensated global or Wernicke aphasia no longer scores as one
  // that does not comprehend at all)
  if (poorComprehension && poorComprehension.sev >= 2) {
    set('1b', 2, 2);
    set('1c', 1, 2);
  } else if (akinetic < 2 && (poorComprehension || has('aphasia_broca') || has('aphasia_tc_sensory'))) {
    set('1b', 1, 2);
  }
  // a disorder of consciousness after coma (unresponsive wakefulness, a minimally conscious state,
  // akinetic mutism, or awareness hidden by a locked-in state; the model cannot tell them apart) is
  // scored as the bedside examination records it: a patient who is mute and follows no one-step
  // command reliably, so item 9 is 3, and 1c and 10 follow from it (the next rule); such a patient
  // does not comprehend the questions either (1b = 2, as for the stuporous patient below). Without
  // this, the language and dysarthria items read normal once no aphasia is listed in it (R5-7 with
  // R1-1, X1-5). The state also covers awareness hidden by a locked-in state (X1-16): such awareness
  // goes unrecognised for weeks to months (Laureys S et al. Prog Brain Res 2005;150:495–511: 2.5
  // months on average), and until it is found the examiner records what is scored here. Once answers
  // by eye movement are found, the patient follows the eye commands and would be scored as alert;
  // the model cannot simulate that finding (its locked-in syndromes, with the tegmentum spared, are
  // alert patients and scored as such).
  if (has('disorder_of_consciousness')) {
    set('9', 3, 3);
    set('1b', 2, 2);
  }
  // Akinetic mutism (Y2-15): awake (1a = 0), but almost no speech and no response to commands. The
  // scale scores what the patient does: severe, mute, so item 9 is 3 ("mute"; 1c and 10 follow from
  // it below) and, unable to speak for a reason other than aphasia, 1b is 1; moderate, little speech
  // (9 = 2) and only one of the two commands performed (1c = 1). (Torab-Miandoab 2020, Appendix 3:
  // 1b scores 1 for a patient who cannot speak for any reason not secondary to aphasia, 2 only for
  // an aphasic or stuporous patient who does not comprehend; 1c is scored on what is performed.)
  if (akinetic >= 3) {
    set('9', 3, 3);
    set('1b', 1, 2);
  } else if (akinetic === 2) {
    set('9', 2, 3);
    set('1c', 1, 2);
  }
  // "a score of 3 [on item 9] should be used only if the patient is mute and follows no one-step
  // commands": such a patient performs neither command (1c = 2) and, being mute, scores 2 on
  // dysarthria ("mute/anarthric"). The comatose patient (1a = 3) is scored below.
  if ((items['9'] ?? 0) >= 3) {
    set('1c', 2, 2);
    set('10', 2, 2);
  }
  // a stuporous patient does not comprehend the questions: 2. The scale gives no such rule for
  // the commands (1c), which can still be shown by pantomime, so 1c keeps what language gives it.
  if ((items['1a'] ?? 0) === 2) set('1b', 2, 2);
  // unable to answer aloud because speech is unintelligible or absent (item 10 = 2: severe
  // dysarthria or anarthria): 1. Eye opening and closing still works as a command, so 1c is not
  // touched (a locked-in patient can follow it).
  if ((items['10'] ?? 0) >= 2) set('1b', 1, 2);
  if ((items['1a'] ?? 0) >= 3) {
    Object.assign(items, { '1b': 2, '1c': 2, '5r': 4, '5l': 4, '6r': 4, '6l': 4, '7': 0, '8': 2, '9': 3, '10': 2, '11': 2 });
  }
  const total = Object.values(items).reduce((a, b) => a + b, 0);
  const category: NihssResult['category'] =
    total === 0 ? 'none' : total <= 4 ? 'minor' : total <= 15 ? 'moderate' : total <= 20 ? 'moderate_severe' : 'severe';
  // the caveat that the scale underrates posterior strokes: the cut-off for a good outcome was an
  // NIHSS of 5 or less after posterior- and 8 or less after anterior-circulation strokes (Sato S et
  // al. Neurology 2008;70:2371-2377, PMID 18434640). Whether the stroke is in the posterior
  // circulation is the caller's (simulate: ischaemic tissue of a vertebrobasilar artery and a
  // symptom; Y3-6) — not an occipital region, which an MCA infarct can reach too
  return { total, items, category, posteriorCaveat: posteriorCirculation && total <= 6, uncaptured: total === 0 && symptoms.length > 0 };
}

/** The symptom list as the syndrome rules ask about it (see SymptomQuery). */
export function symptomQuery(symptoms: SymptomItem[]): SymptomQuery {
  return {
    has: (id) => symptoms.some((s) => s.id === id),
    on: (id, side, minSev = 1) => symptoms.some((s) => s.id === id && (s.side === side || s.side === 'both') && s.sev >= minSev),
    from: (id, side, base) =>
      symptoms.some((s) => s.id === id && s.sources.some((src) => REGION_BY_ID[src]?.side === side && (!base || REGION_BY_ID[src].baseId === base))),
  };
}

/**
 * Named syndromes: the region rules (on the primary vascular dysfunction), gated for a label
 * named for its signs by those signs being in `symptoms` (shown at the same time); a label named
 * for its vascular pattern is marked silent when no symptom from its side is left, listed or there
 * but not examinable at the patient's level of consciousness (`unexaminable`, which has not gone:
 * X1-2).
 */
export function detectSyndromes(ctx: SyndromeCtx, symptoms: SymptomItem[] = [], unexaminable: SymptomItem[] = []): SyndromeMatch[] {
  const q = symptomQuery(symptoms);
  const signs = (def: SyndromeDef, s: Side) => !def.requires || def.requires(q, s);
  const found: SyndromeMatch[] = [];
  for (const def of SYNDROMES) {
    if (def.lateral) {
      for (const s of ['r', 'l'] as Side[]) if (def.test(ctx, s) && signs(def, s)) found.push({ def, side: s });
    } else if (def.test(ctx, 'r') && signs(def, 'r')) {
      found.push({ def, side: null });
    }
  }
  // a symptom produced by a region on that side (any region, for a bilateral label)
  const fromSide = (side: Side | null) =>
    [...symptoms, ...unexaminable].some((s) => s.sources.some((src) => !!REGION_BY_ID[src] && (side === null || REGION_BY_ID[src].side === side)));
  return found
    .filter(
      (m) =>
        !found.some(
          (o) => o !== m && o.def.supersedes?.includes(m.def.id) && (o.side === m.side || o.side === null || m.side === null),
        ),
    )
    .map((m) => (m.def.pattern && !fromSide(m.side) ? { ...m, silent: true as const } : m));
}
