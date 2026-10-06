/**
 * How much backup each function has once the tissue that served it is dead, keyed by symptom id.
 * The recovery model (engine/recovery.ts) and the symptom aggregation (engine/clinical.ts) use it
 * to let deficits caused by dead tissue lessen over weeks–months, by how far spared pathways can
 * take the function over.
 *
 * Redundancy types:
 *   • bilateral — bilaterally innervated or paired functions (upper face, jaw, swallowing,
 *     partly speech articulation, vestibular balance, gaze control): the other hemisphere / other
 *     side can drive or recalibrate them, so a one-sided lesion compensates well and a lesion of
 *     both sides poorly.
 *   • parallel — limb movement: after corticospinal loss the reticulospinal (and in monkeys the
 *     rubrospinal) systems can take over proximal and gross movement, not fine finger control;
 *     spasticity and synergies follow. Bilateral pyramidotomy in monkeys: gross movement
 *     recovers, independent finger movement is lost for good (Lawrence & Kuypers, Brain 1968;
 *     91:1–14). Reticulospinal contribution to recovery: Baker, J Physiol 2011; 589:5603–12.
 *   • fine — fractionated finger movement, which depends on the corticospinal tract itself.
 *   • partial — cortical networks and long tracts that partly reorganise (perilesional cortex,
 *     the other hemisphere). The default for any symptom not listed here, unilateral only.
 *   • fcp — final common pathway: a cranial-nerve motor nucleus or its fascicle (abducens →
 *     horizontal gaze to that side, facial nucleus → peripheral facial palsy, hypoglossal …) or
 *     lower motor neurons. There is no other route to the muscle, so once the nucleus is dead
 *     the function does not come back.
 *   • none — the only route for that function (primary visual cortex, retina, the descending
 *     sympathetic pathway): other areas cannot take it over, only strategies (turning the head,
 *     scanning) make up for it. (Hearing lost to inner-ear ischaemia often does come back, a
 *     profound loss less often: `partial` with a `profound` share.)
 *   • exempt — not a lost function but a late consequence or a descriptor (spasticity, central
 *     pain, palatal tremor, macular sparing, double vision that follows an eye palsy, the cold
 *     paretic limb); left as is.
 *
 * Bottleneck: in the ventral pons (and the cerebral peduncles) both corticospinal tracts, both
 * corticobulbar tracts and many cortico-reticular fibres run together, so a lesion of both sides
 * there removes the main pathway and its backup at once, the more so the more of both sides is lost
 * (BOTTLENECK_FULL, W1-7). BOTTLENECK_FACTOR is a model assumption built on that anatomy, not a
 * measured figure. The review of 139 locked-in cases compared
 * vascular with non-vascular causes, not with hemispheric strokes: vascular cases recovered later
 * and less completely, and survivors beyond 4 months generally recovered well (Patterson &
 * Grabois, Stroke 1986; 17:758–64). In a selected series of 14 patients after early intensive
 * rehabilitation a minority regained swallowing (42 %) or speech (28 %) (Casanova et al., Arch
 * Phys Med Rehabil 2003; 84:862–7).
 *
 * `uni` / `bi` are the share of the deficit caused by dead tissue that is typically taken over
 * at the plateau (months) after a one-sided / two-sided lesion. They describe an average group
 * pattern for teaching, not a prognosis for anyone.
 * TODO(medical-review): every magnitude in this file is an illustrative estimate.
 */

import { LOCKED_IN_CLASSICAL_BASES, MCA_CORTEX } from './syndromes';

export type RedundancyKind = 'bilateral' | 'parallel' | 'fine' | 'partial' | 'fcp' | 'none' | 'exempt';

export interface Redundancy {
  kind: RedundancyKind;
  /** share of the lost function taken over at the plateau after a one-sided lesion (0–1) */
  uni: number;
  /** … after a lesion of the same pathway on both sides (0–1) */
  bi: number;
  /** most of the compensation happens within ~1–2 weeks rather than ~3 months */
  fast?: boolean;
  /**
   * a severe (profound, severity 3 before compensation) deficit is taken over less often: these
   * shares replace `uni` / `bi` then
   */
  profound?: { uni: number; bi: number };
  /**
   * source regions (base ids) where this symptom comes from a nucleus or fascicle, i.e. the
   * final common pathway: no compensation from those sources
   */
  fcpSources?: string[];
  /**
   * the deficit from this source is a passing effect on a neighbouring pathway, not its loss (the
   * mild weakness of an inferolateral thalamic infarct, from the internal capsule beside it): it
   * does not count as a lesion of that pathway on its side, so it does not make another region's
   * deficit a two-sided one (recovery.lesionSides, W1-0)
   */
  passing?: boolean;
  /**
   * a different redundancy when the symptom comes from this source region (base id), for a
   * lesion on one side ('r' / 'l') or on either ('any'); e.g. the cognitive deficits of a
   * right-sided paramedian thalamic stroke recover much better than those of a left-sided one
   */
  bySource?: Record<string, Partial<Record<'r' | 'l' | 'any', Redundancy>>>;
}

/** functions that cannot be taken over by other pathways once their tissue is dead */
export const NO_BACKUP_KINDS: ReadonlySet<RedundancyKind> = new Set(['fcp', 'none']);

/** regions where the main descending pathways of both sides and their backups run together */
export const BOTTLENECK_REGIONS: readonly string[] = ['midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis'];
/** where each bottleneck region lies: the cerebral peduncles of the midbrain, or the ventral pons (Z2-10) */
export type BottleneckSite = 'midbrain' | 'pons';
export const BOTTLENECK_SITE: Readonly<Record<string, BottleneckSite>> = {
  midbrain_peduncle: 'midbrain',
  pons_rostral_basis: 'pons',
  pons_caudal_basis: 'pons',
};
/**
 * The descending motor pathways of the face and limbs, for which the side of a lesion in the
 * both-sides test (recovery.lesionSides) is that of the hemisphere whose tract it cuts, the side
 * opposite the weak half of the body, wherever along the tract it lies (W1-0). Every source gives
 * them on the opposite side of the body except the lateral medulla, whose ipsilateral facial
 * weakness comes from the corticobulbar fibres of the other hemisphere that loop down into the
 * medulla after crossing (Kanbayashi T, Sonoo M. BMC Neurol 2021;21:214): with an infarct of the
 * other hemisphere's motor cortex it is a second lesion of the same pathway, not a lesion of both
 * sides. It cuts that hemisphere's fibres to the face on its own side only, after they have crossed
 * and on their way up to the facial nucleus (in some people the corticofacial fibres loop down into
 * the upper medulla, cross and ascend in its dorsolateral part: Urban PP et al. Brain
 * 2001;124:1866–1876, PMID 11522588), so it counts for a weakness of that face alone (V2-0): every
 * other source cuts a hemisphere's tract before its fibres part for the two sides of the body.
 */
export const MOTOR_TRACT_SYMPTOMS: readonly string[] = ['face_weak', 'arm_weak', 'arm_weak_proximal', 'leg_weak', 'hand_clumsy', 'spasticity'];
/** compensation left after a two-sided lesion at a bottleneck, relative to `bi` (in full: BOTTLENECK_FULL) */
export const BOTTLENECK_FACTOR = 0.25;
/**
 * The bottleneck is graded by how much of both sides is lost there (W1-7): the less infarcted of
 * the two sides (each side's most infarcted bottleneck region giving the deficit) counts. At the
 * symptom threshold (a quarter of each side) the lesion is two-sided (`bi`) but most of the tracts
 * and of the cortico-reticular fibres beside them are left, so the bottleneck takes nothing more
 * away; it acts in full from the share of both ventral pontine halves at which the model names the
 * classical locked-in syndrome, every limb paralysed (LOCKED_IN_CLASSICAL_BASES), and linearly in
 * between. A small infarct of both cerebral peduncles or of the ventral pons after a reopening is
 * therefore not treated as a locked-in syndrome: bilateral pontine infarcts leave a worse outcome
 * than one-sided ones (Kumral E et al. J Neurol 2002;249:1659–1670), but even extensive bilateral
 * pontine lesions on DWI do not always mean a poor outcome after a reopening (Haussen DC et al.
 * Interv Neurol 2016;5:179–184, PMID 27781047). A model assumption, like BOTTLENECK_FACTOR.
 * TODO(medical-review): the range
 */
export const BOTTLENECK_FULL = LOCKED_IN_CLASSICAL_BASES;
/**
 * the bottleneck is named (the Outcome tag, the notes, the sentence of "what is happening now")
 * once it acts at least this much (its share of the full effect, 0–1): both sides about a third
 * infarcted; below it the deficit is named as two-sided (`bilateral`)
 */
export const BOTTLENECK_SHOWN = 0.5;

/**
 * Where the corticospinal fibres of one side converge: the posterior limb of the internal capsule,
 * the cerebral peduncle and the basis pontis (Y1-1). An arm made plegic by an infarct that takes
 * most of the tract there recovers little: only 1 of 28 patients with the posterior limb and the
 * structures next to it involved regained isolated arm movement, against 3 of 4 with purely
 * cortical strokes (cortex > corona radiata > posterior limb; small lacunes of the posterior limb
 * alone left too little weakness to be included: Shelton FN, Reding MJ. Stroke 2001;32:107–112);
 * a corticospinal lesion load of 7 cc or more left every patient with a poor arm at 3 months (Feng W
 * et al. Ann Neurol 2015;78:860–870); about 70 % of the impairment resolves only while the
 * corticomotor pathway still works (Byblow WD et al. Ann Neurol 2015;78:848–859; the PREP2
 * algorithm predicts the arm's outcome from it: Stinear CM et al. Ann Clin Transl Neurol
 * 2017;4:811–820); without finger extension or shoulder abduction on day 2 only a quarter regained
 * any dexterity (Nijland RH et al. Stroke 2010;41:745–750).
 */
export const CST_CONVERGENCE: readonly string[] = ['ic_posterior_limb', 'midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis'];
/**
 * the one-sided share of the limb weakness that is taken over when a convergence site has lost
 * most of its tract (half or more of the region infarcted) under a weakness that was plegic at
 * first: the arm's falls from 0.5 towards this, the leg's less (walking recovers better through
 * the reticulospinal pathways: Baker 2011, above). A lacune is small and spares part of the tract
 * (Shelton & Reding 2001), so it keeps the usual share. TODO(medical-review): both values
 */
export const CST_LOST_SHARE: Readonly<Record<string, number>> = { arm_weak: 0.15, leg_weak: 0.45 };

/**
 * Language and spatial attention recover through the spared cortex of the same network, more
 * through the undamaged areas of the same hemisphere than through the homologues of the other
 * (Heiss WD, Thiel A. Brain Lang 2006;98:118–123, PMID 16564566), so how much of an aphasia or a
 * neglect is taken over depends on how much of that cortex is left (Z2-6), as the arm's recovery
 * depends on how much of the corticospinal tract is lost (CST_LOST_SHARE, Y1-1).
 *
 *   • Aphasia improved by about 70 % of the possible amount by 90 days in 21 patients, in
 *     proportion to the initial deficit (Lazar RM et al. Stroke 2010;41:1485–1488, PMID 20538700);
 *     the outcome depended on the initial severity of the aphasia and of the stroke, and global
 *     aphasia fell from 32 % acutely to 7 % at one year (Pedersen PM et al. Cerebrovasc Dis
 *     2004;17:35–43, PMID 14530636). In 218 patients followed for a year, most recovered well,
 *     large frontal lesions reaching the parietal or temporal lobe included; persistent moderate
 *     or severe deficits were common only with extensive damage throughout the MCA distribution or
 *     extensive temporoparietal damage (Wilson SM et al. Brain 2023;146:1021–1039, PMID 35388420).
 *   • Neglect recovered in proportion in 80 of 90 patients; the 10 who did not had the most severe
 *     neglect at onset, and their arm did not recover in proportion either (Winters C et al.
 *     Neurorehabil Neural Repair 2017;31:334–342, PMID 27913798). Chronic neglect, in about a third
 *     of those with acute neglect, was predicted by damage to the superior and middle temporal
 *     gyri, the basal ganglia and the fibre tracts beneath them (Karnath HO et al. Brain
 *     2011;134:903–912, PMID 21156661).
 *
 * The measure is the infarcted share of the hemisphere's MCA cortex (MCA_CORTEX, by volume): a
 * division (M2) infarct leaves at most about half of it, a whole-territory infarct almost none.
 * From `from` to `to` the one-sided share taken over falls linearly from the deficit's own (`uni`)
 * to `lost`. A global aphasia already has the poorest outlook of the types, which reflects the
 * large lesions that cause it (Kertesz A, McCabe P. Brain 1977;100:1–18), so its own share falls
 * only once the destruction is near total: with the cortex mostly gone it stays global (item 9 =
 * 3), with somewhat more left it becomes a severe Broca or Wernicke type (9 = 2), and with half or
 * more left the recovery is as before. Gaze deviation is not listed: it passes within days after a
 * one-sided lesion of any size, through the other hemisphere's frontal eye field (Steiner I,
 * Melamed E. Ann Neurol 1984;16:509–511, PMID 6497357). Neglect after a left-sided lesion is not
 * listed either: the right hemisphere attends to both sides, and it mostly clears (LEFT_NEGLECT).
 * TODO(medical-review): `lost`, `from` and `to`.
 */
export interface NetworkLoss {
  /** the hemisphere of the network (language: left; spatial attention: right) */
  side: 'r' | 'l';
  /** the share taken over once the network's cortex is (nearly) all infarcted */
  lost: number;
  /** infarcted share of the hemisphere's MCA cortex from which the share starts to fall … */
  from: number;
  /** … and at which it has reached `lost` */
  to: number;
}
const LANGUAGE_NETWORK: NetworkLoss = { side: 'l', lost: 0.1, from: 0.6, to: 0.9 };
export const NETWORK_LOSS: Readonly<Record<string, NetworkLoss>> = {
  aphasia_broca: LANGUAGE_NETWORK,
  aphasia_wernicke: LANGUAGE_NETWORK,
  aphasia_conduction: LANGUAGE_NETWORK,
  aphasia_tc_motor: LANGUAGE_NETWORK,
  aphasia_tc_sensory: LANGUAGE_NETWORK,
  aphasia_mixed_tc: LANGUAGE_NETWORK,
  apraxia_of_speech: LANGUAGE_NETWORK,
  aphasia_global: { side: 'l', lost: 0.1, from: 0.8, to: 0.95 },
  neglect: { side: 'r', lost: 0.15, from: 0.6, to: 0.9 },
};
/** the cortex whose infarcted share NETWORK_LOSS reads (per hemisphere) */
export const NETWORK_CORTEX: readonly string[] = MCA_CORTEX;

/**
 * Comprehension recovers through what is left of Wernicke's area itself, whatever the size of the
 * whole infarct (W1-6). The severity of the comprehension deficit in Wernicke's aphasia followed the
 * amount of Wernicke's area (the posterior two-thirds of the superior temporal gyrus) lesioned and
 * not the total temporoparietal lesion size: with half of it or less, comprehension was good at six
 * months; with more than half, it was poor even one year after onset, worse still when the lesion
 * reached the middle temporal gyrus (Naeser MA et al. Arch Neurol 1987;44:73–82, PMID 3800725). A
 * persisting Wernicke's aphasia usually also involved the supramarginal and angular gyri, and the
 * good-recovery group had less of the superior and middle temporal gyri involved (22 patients:
 * Kertesz A, Lau WK, Polk M. Brain Lang 1993;44:153–164, PMID 8428309). Global aphasics with more
 * than half of Wernicke's area lesioned kept a moderate-to-severe comprehension deficit at 1–2
 * years (8 of 9: Naeser MA et al. Arch Neurol 1990;47:425–432, PMID 2322136).
 *
 * So the share of a Wernicke-type aphasia taken over falls from its own `uni` to `lost` as the
 * infarcted share of the left posterior superior temporal gyrus (the model's Wernicke's area) rises
 * from `from` (half) to `to`: from about three-fifths of it lost, the aphasia stays moderate to
 * severe (NIHSS 9 = 2) at 3 and 6 months. It is applied to the Wernicke component only, so a global
 * aphasia that improves after such an infarct becomes a severe Wernicke type rather than a mild one.
 * The extension into the middle temporal gyrus and the angular and supramarginal gyri is not
 * weighed separately. TODO(medical-review): `lost`, `from` and `to`.
 */
export interface AreaLoss {
  /** the hemisphere of the area */
  side: 'r' | 'l';
  /** the area (a region base id) whose infarcted share counts */
  area: string;
  /** the share taken over once (nearly) all of the area is infarcted */
  lost: number;
  /** infarcted share of the area from which the share starts to fall … */
  from: number;
  /** … and at which it has reached `lost` */
  to: number;
}
export const AREA_LOSS: Readonly<Record<string, AreaLoss>> = {
  aphasia_wernicke: { side: 'l', area: 'superior_temporal_posterior', lost: 0.1, from: 0.5, to: 0.6 },
};

/** How far the share of `symptomId` taken over has fallen towards its AREA_LOSS `lost` value (0–1), for a source on `side`, with this infarcted share of the area. */
export function areaLossOf(symptomId: string, side: 'r' | 'l' | 'm', areaInfarct: number): number {
  const a = AREA_LOSS[symptomId];
  if (!a || side !== a.side) return 0;
  return Math.min(1, Math.max(0, (areaInfarct - a.from) / (a.to - a.from)));
}

/** How far the share of `symptomId` taken over has fallen towards its `lost` value (0–1), for a source on `side` with this infarcted share of its hemisphere's MCA cortex. */
export function networkLossOf(symptomId: string, side: 'r' | 'l' | 'm', cortexInfarct: number): number {
  const net = NETWORK_LOSS[symptomId];
  if (!net || side !== net.side) return 0;
  return Math.min(1, Math.max(0, (cortexInfarct - net.from) / (net.to - net.from)));
}

/** unknown / unlisted symptoms: partial compensation, unilateral only */
export const DEFAULT_REDUNDANCY: Redundancy = { kind: 'partial', uni: 0.4, bi: 0 };

const bilateral = (uni: number, bi: number, extra: Partial<Redundancy> = {}): Redundancy => ({ kind: 'bilateral', uni, bi, ...extra });
const parallel = (uni: number, bi: number): Redundancy => ({ kind: 'parallel', uni, bi });
const partial = (uni: number, bi: number, extra: Partial<Redundancy> = {}): Redundancy => ({ kind: 'partial', uni, bi, ...extra });
const FCP: Redundancy = { kind: 'fcp', uni: 0, bi: 0 };
const NONE: Redundancy = { kind: 'none', uni: 0, bi: 0 };
const EXEMPT: Redundancy = { kind: 'exempt', uni: 0, bi: 0 };
/** the same kind of deficit, but one that passes within days to weeks: a passing effect, not a loss of the pathway */
const transient = (r: Redundancy): Redundancy => ({ ...r, uni: 0.95, bi: 0.6, fast: true, passing: true });
/**
 * Paramedian thalamic stroke: outcome excellent after right-sided infarcts; persistent frontal
 * and cognitive deficits in 100% of bilateral, 90% of left-sided and 33% of right-sided strokes
 * (46 patients, Hermann DM et al. Stroke 2008;39:62–68). A right-sided lesion compensates almost
 * fully; a bilateral one keeps the symptom's own `bi`. TODO(medical-review): 0.9
 */
const RIGHT_PARAMEDIAN = (bi: number) => ({ r: partial(0.9, bi) });
/**
 * Anterior thalamic infarcts: "spectacular improvement within a few months, with the only
 * significant persisting abnormalities being memory dysfunction and apathy" (12 patients,
 * Ghika-Schmid F, Bogousslavsky J. Ann Neurol 2000;48:220–227). TODO(medical-review): 0.9
 */
const ANTERIOR_THALAMUS = (bi: number) => ({ any: partial(0.9, bi) });
/**
 * Neglect of the right side after a left-hemisphere stroke: in 20 % of left-lesioned patients
 * acutely but 5 % at 3 months, against 43 % and 17 % after right-hemisphere strokes (1281
 * patients, Ringman JM et al. Neurology 2004;63:468–474, PMID 15304577) — rarer and mostly
 * resolved. The left-hemisphere sources therefore compensate almost fully, within weeks (their
 * deficits are `fast`), rather than to the right-hemisphere plateau (R1-7). TODO(medical-review): 0.85
 */
const LEFT_NEGLECT = { l: partial(0.85, 0.2) };

/**
 * Lacunes whose deficit has a course of its own (DeficitRef.redundancy, used in lacunes.ts).
 *
 * The clumsy hand of a dysarthria–clumsy hand lacune: a small lacune spares part of the tract, and
 * the outcome is good, "symptom free at discharge 45.7 %" (35 patients, Arboix A et al. J Neurol
 * Neurosurg Psychiatry 2004;75:231–234, PMID 14742595) — not the poor recovery of fractionated
 * finger movement after the corticospinal tract is lost. Spared and reorganised fibres take most
 * of it over within weeks (R2-1). TODO(medical-review): 0.9
 */
export const LACUNAR_CLUMSY_HAND: Redundancy = partial(0.9, 0.3, { fast: true });
/**
 * The memory problem of a right capsular genu lacune: "A right-sided infarct caused transient
 * impairment in visuospatial memory" (Tatemichi TK et al. Neurology 1992;42:1966–1979, PMID
 * 1407580), against the lasting verbal memory loss of the left-sided ones (R2-3).
 * TODO(medical-review): 0.9
 */
export const RIGHT_GENU_AMNESIA: Redundancy = partial(0.9, 0.1, { fast: true });

// TODO(medical-review): all `uni` / `bi` values below
export const REDUNDANCY: Record<string, Redundancy> = {
  // ── consciousness: the arousal system is a bilateral network; arousal often returns over
  //    days–weeks, attention and drive less completely. Coma and drowsiness are acute states:
  //    from two weeks on clinical.ts lists what follows them instead (hypersomnia, or a disorder
  //    of consciousness after extensive bilateral tegmental damage) ──
  coma: partial(0.5, 0.3),
  somnolence: partial(0.7, 0.4),
  // awareness after coma: recovery is unpredictable (O'Donnell et al., Neurosci Biobehav Rev 2019).
  // TODO(medical-review): uni / bi
  disorder_of_consciousness: partial(0.5, 0.3),

  // ── sleep ── TODO(medical-review): uni / bi
  // persistent hypersomnia after paramedian thalamic stroke: sleep needs almost normal by a year
  // after a one-sided lesion, only improved after a two-sided one (Hermann et al., Stroke 2008;
  // 39:62–8)
  hypersomnia: partial(0.7, 0.35),
  // central apnoea after a one-sided lateral medullary infarct: the other side's respiratory
  // network takes over; central events fewer at 3–6 months (Pavšič et al., Sleep Breath 2020;
  // 24:1557–63). Two-sided lesions are listed as `respiratory`.
  central_sleep_apnoea: bilateral(0.7, 0.3),

  // ── mood ── TODO(medical-review): uni / bi
  // emotionalism: 21 % at 6 months, 11 % at 12 (House et al., BMJ 1989; 298:991–4)
  emotionalism: partial(0.5, 0.3),

  // ── motor ──
  // corticobulbar: the upper face is bilaterally innervated and central facial weakness
  // usually improves a lot
  face_weak: bilateral(0.75, 0.2, { bySource: { thalamus_ventrolateral: { any: transient(bilateral(0.75, 0.2)) } } }),
  // facial nucleus / fascicle
  face_weak_peripheral: FCP,
  // corticospinal loss: reticulospinal takeover of gross and proximal movement; the mild weakness
  // of an inferolateral thalamic infarct (from the neighbouring capsule) passes within weeks
  arm_weak: { ...parallel(0.5, 0.12), bySource: { thalamus_ventrolateral: { any: transient(parallel(0.5, 0.12)) } } },
  arm_weak_proximal: parallel(0.65, 0.2),
  // proximal and axial control, walking: typically better than the arm
  leg_weak: parallel(0.65, 0.15),
  // independent finger movement: poor
  hand_clumsy: { kind: 'fine', uni: 0.2, bi: 0.05 },
  // articulation is partly bilaterally controlled; the soft speech of an anterior thalamic
  // infarct improves with its other deficits (R5-9)
  dysarthria: bilateral(0.7, 0.15, { bySource: { thalamus_anterior: ANTERIOR_THALAMUS(0.15) } }),
  alien_hand: partial(0.5, 0.2),
  // usually regresses (Ghika-Schmid et al., J Neurol Sci 1997). TODO(medical-review): uni / bi
  jerky_dystonic_hand: partial(0.6, 0.3),
  // TODO(medical-review): uni / bi; no data on its course. After an anterior thalamic infarct it
  // improves with the rest of the picture, memory loss and apathy being what persists (R5-9)
  emotional_facial_paresis: partial(0.6, 0.3, { bySource: { thalamus_anterior: ANTERIOR_THALAMUS(0.2) } }),
  // a result of the lesion and of the recovery process itself
  spasticity: EXEMPT,

  // ── cranial ──
  // swallowing is driven by paired brainstem pattern generators with bilateral cortical input;
  // after a one-sided lesion the other side usually takes over within weeks
  dysphagia: bilateral(0.75, 0.15),
  // vocal-fold paralysis: nucleus ambiguus
  hoarseness: FCP,
  // hypoglossal nucleus / fascicle
  tongue_weak: FCP,
  // jaw muscles are bilaterally innervated from the cortex, but the trigeminal motor nucleus is
  // the final common pathway
  jaw_weak: bilateral(0.75, 0.2, { fcpSources: ['pons_rostral_lateral'] }),
  // hearing lost to vertebrobasilar ischaemia came back partly or completely in 81 % at ≥ 1 year
  // — 40 % with a profound loss, 89 % with a lesser one (Lee H, Baloh RW. J Neurol Sci
  // 2005;228:99–104, PMID 15607217) — and in 65 % of 62 (Kim HA et al. J Neurol Sci
  // 2014;339:176–182, PMID 24581671). The inner-ear infarct is a profound loss. C7-F8. The model
  // shows one course: for a profound loss the commoner one, in which it does not improve, so its
  // share stays below the rounding step (3 × 0.85 still rounds to 3; R2-8)
  hearing_loss: partial(0.6, 0.3, { profound: { uni: 0.15, bi: 0.1 } }),
  palatal_tremor: EXEMPT,
  // TODO(medical-review): above the upper pons the taste pathway runs on both sides; 80 % of central taste disorders
  // improved by 24 weeks (Onoda et al., J Neurol 2012; 259:261–6)
  taste_loss: bilateral(0.8, 0.4),

  // ── cognition / behaviour ──
  apraxia: partial(0.5, 0.2),
  callosal_apraxia: partial(0.5, 0.2),
  // TODO(medical-review): no data on its course after stroke
  motor_impersistence: partial(0.5, 0.2),
  abulia: partial(0.5, 0.3, { bySource: { thalamus_paramedian: RIGHT_PARAMEDIAN(0.3) } }),
  akinetic_mutism: partial(0.5, 0.3),
  // bladder control is represented on both sides
  incontinence: bilateral(0.7, 0.2),
  // the pontine micturition centres are paired. TODO(medical-review)
  urinary_retention: bilateral(0.75, 0.3),
  prosopagnosia: partial(0.4, 0.15),
  visual_agnosia: partial(0.4, 0.15),
  simultanagnosia: partial(0.4, 0.15),
  optic_ataxia: partial(0.4, 0.15),
  acalculia: partial(0.5, 0.2),
  finger_agnosia: partial(0.5, 0.2),
  neglect: partial(0.6, 0.2, {
    bySource: {
      thalamus_paramedian: RIGHT_PARAMEDIAN(0.2),
      thalamus_anterior: ANTERIOR_THALAMUS(0.2),
      supramarginal: LEFT_NEGLECT,
      angular: LEFT_NEGLECT,
    },
  }),
  anosognosia: partial(0.6, 0.3),
  visuospatial: partial(0.45, 0.15),
  // one hippocampus / thalamus: partly; both: dense amnesia persists
  amnesia: partial(0.5, 0.1, { bySource: { thalamus_paramedian: RIGHT_PARAMEDIAN(0.1) } }),
  executive: partial(0.45, 0.2, {
    bySource: { thalamus_paramedian: RIGHT_PARAMEDIAN(0.2), thalamus_anterior: ANTERIOR_THALAMUS(0.2) },
  }),
  disinhibition: partial(0.4, 0.15, { bySource: { thalamus_paramedian: RIGHT_PARAMEDIAN(0.15) } }),
  emotional: partial(0.5, 0.3),
  topographic: partial(0.5, 0.2),
  // recurring over months (Benke, J Neurol 2006). TODO(medical-review): uni / bi
  peduncular_hallucinosis: partial(0.5, 0.3),

  // ── balance & coordination: cerebellar and vestibular compensation ──
  ataxia_limb: partial(0.6, 0.3),
  // the mild gait ataxia of paramedian thalamic strokes (67% acutely) is among the neurological
  // deficits that recover to a large extent (Hermann et al., Stroke 2008)
  ataxia_gait: partial(0.55, 0.3, { bySource: { thalamus_paramedian: { any: partial(0.9, 0.8) } } }),
  tremor: partial(0.3, 0.1),
  // Holmes tremor once it has appeared: little spontaneous settling is an assumption (levodopa
  // helped 13 of 24 treated: Raina et al., Neurology 2016). TODO(medical-review): uni / bi
  holmes_tremor: partial(0.2, 0.1),
  // central vestibular compensation recalibrates a one-sided imbalance
  vertigo: bilateral(0.85, 0.3, { fast: true }),
  nystagmus: bilateral(0.8, 0.3),
  nausea_vomiting: bilateral(0.95, 0.6, { fast: true }),
  hiccups: partial(0.9, 0.6, { fast: true }),

  // ── sensation ──
  sens_face_arm: partial(0.45, 0.2),
  sens_leg: partial(0.45, 0.2),
  sens_hemibody: partial(0.45, 0.2),
  pain_temp_body: partial(0.4, 0.15),
  pain_temp_face: partial(0.4, 0.15),
  proprio_loss: partial(0.4, 0.15),
  sens_face_all: partial(0.4, 0.15),
  cortical_sensory: partial(0.45, 0.2),
  central_pain: EXEMPT,
  // the facial (periorbital) central pain of a lateral medullary infarct, likewise (C10-F3)
  central_pain_face: EXEMPT,

  // ── vision: primary visual cortex / radiation / retina is the only route ──
  hemianopia: NONE,
  quadrant_sup: NONE,
  quadrant_inf: NONE,
  central_scotoma: NONE,
  cortical_blindness: NONE,
  monocular_blind: NONE,
  macular_sparing: EXEMPT,
  achromatopsia: partial(0.4, 0.15),
  hemiachromatopsia: partial(0.4, 0.15),
  // a positive phenomenon of the blind field, not a lost function: shown while the field defect
  // is; its own course over time is not modelled (not given in the sources)
  visual_release_hallucinations: EXEMPT,

  // ── eye movements ──
  // the other hemisphere's frontal eye field takes over within days–weeks
  gaze_deviation: bilateral(0.9, 0.4, { fast: true }),
  // both frontal eye fields: made from the two deviations after each one's own compensation
  // (clinical.ts, Y2-13), so it follows theirs; given here for completeness
  gaze_paresis_bilateral: bilateral(0.9, 0.4, { fast: true }),
  // abducens nucleus (and the pontine gaze centre next to it)
  gaze_palsy_horizontal: FCP,
  // medial longitudinal fasciculus: no parallel tract, but often improves
  ino: partial(0.4, 0.15),
  cn3_palsy: FCP,
  cn4_palsy: FCP,
  cn6_palsy: FCP,
  vertical_gaze_palsy: partial(0.4, 0.25),
  upgaze_palsy: partial(0.4, 0.25),
  // a vestibular tone imbalance in the roll plane, recalibrated like the other vestibular signs
  // (Brandt & Dieterich, Ann Neurol 1993). TODO(medical-review): uni / bi
  skew_deviation: bilateral(0.8, 0.3),
  // follows the eye-movement deficit that causes it
  diplopia: EXEMPT,
  horner: NONE,
  // signs of brainstem compression by a swollen cerebellum: they last as long as the compression
  // (the cascade event), so nothing compensates them (C4-F3)
  miosis: EXEMPT,
  corneal_reflex_loss: EXEMPT,

  // ── temperature regulation & sweating ── TODO(medical-review): uni / bi
  // the descending sympathetic pathway, as for Horner: hypohidrosis still in 76 % at 6 months
  // (Korpelainen et al., Stroke 1993; 24:100–4)
  hypohidrosis: NONE,
  // clinically visible hemihyperhidrosis lasts days to weeks (Labar et al., Neurology 1988;
  // 38:1679–82; Kim et al., Stroke 1995; 26:896–9)
  hyperhidrosis: partial(0.9, 0.6, { fast: true }),
  // a late vasomotor consequence that persists (Korpelainen et al., Stroke 1995; 26:1543–7;
  // Wanklyn et al., Stroke 1995; 26:1867–70)
  cold_limb: EXEMPT,

  // ── language (left hemisphere): perilesional and right-hemisphere reorganisation ──
  aphasia_broca: partial(0.45, 0.15),
  aphasia_wernicke: partial(0.45, 0.15),
  // the poorest outlook of the aphasia types (Kertesz A, McCabe P, Brain 1977;100:1-18); applied
  // when the components resolve to a global type (clinical.aggregateSymptoms)
  aphasia_global: partial(0.3, 0.1),
  aphasia_conduction: partial(0.6, 0.2),
  aphasia_tc_motor: partial(0.6, 0.2),
  aphasia_tc_sensory: partial(0.6, 0.2),
  aphasia_mixed_tc: partial(0.6, 0.2),
  // left anterior thalamus: improves markedly within months (Ghika-Schmid & Bogousslavsky 2000)
  aphasia_thalamic: partial(0.6, 0.2, { bySource: { thalamus_anterior: ANTERIOR_THALAMUS(0.2) } }),
  apraxia_of_speech: partial(0.45, 0.15),
  aprosodia: partial(0.45, 0.15),
  alexia: partial(0.4, 0.15),
  agraphia: partial(0.4, 0.15),

  // ── autonomic ──
  autonomic_cardiac: bilateral(0.9, 0.4, { fast: true }),
  // automatic breathing needs the medullary centres of both sides
  respiratory: bilateral(0.8, 0.15),
  // not neural
  arm_claudication: EXEMPT,
};

/**
 * Redundancy of `symptomId` when it is caused by a lesion of `sourceBase` (a region base id,
 * e.g. 'pons_rostral_lateral') on `sourceSide`. A nucleus / fascicle source turns it into the final
 * common pathway; some sources have a redundancy of their own (`bySource`).
 */
export function redundancyFor(symptomId: string, sourceBase?: string, sourceSide?: 'r' | 'l' | 'm'): Redundancy {
  const r = REDUNDANCY[symptomId] ?? DEFAULT_REDUNDANCY;
  if (sourceBase && r.fcpSources?.includes(sourceBase)) return FCP;
  const by = sourceBase ? r.bySource?.[sourceBase] : undefined;
  const special = by && ((sourceSide === 'r' || sourceSide === 'l' ? by[sourceSide] : undefined) ?? by.any);
  return special ?? r;
}
