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
 * there removes the main pathway and its backup at once — why locked-in syndrome of vascular
 * origin recovers far less than a hemispheric stroke with a similar deficit (review of 139 cases:
 * Patterson & Grabois, Stroke 1986; 17:758–64; some functional gains with early intensive
 * rehabilitation: Casanova et al., Arch Phys Med Rehabil 2003; 84:862–7).
 *
 * `uni` / `bi` are the share of the deficit caused by dead tissue that is typically taken over
 * at the plateau (months) after a one-sided / two-sided lesion. They describe an average group
 * pattern for teaching, not a prognosis for anyone.
 * TODO(medical-review): every magnitude in this file is an illustrative estimate.
 */

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
}

/** functions that cannot be taken over by other pathways once their tissue is dead */
export const NO_BACKUP_KINDS: ReadonlySet<RedundancyKind> = new Set(['fcp', 'none']);

/** regions where the main descending pathways of both sides and their backups run together */
export const BOTTLENECK_REGIONS: readonly string[] = ['midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis'];
/** compensation left after a two-sided lesion at a bottleneck, relative to `bi` */
export const BOTTLENECK_FACTOR = 0.25;

/** unknown / unlisted symptoms: partial compensation, unilateral only */
export const DEFAULT_REDUNDANCY: Redundancy = { kind: 'partial', uni: 0.4, bi: 0 };

const bilateral = (uni: number, bi: number, extra: Partial<Redundancy> = {}): Redundancy => ({ kind: 'bilateral', uni, bi, ...extra });
const parallel = (uni: number, bi: number): Redundancy => ({ kind: 'parallel', uni, bi });
const partial = (uni: number, bi: number, extra: Partial<Redundancy> = {}): Redundancy => ({ kind: 'partial', uni, bi, ...extra });
const FCP: Redundancy = { kind: 'fcp', uni: 0, bi: 0 };
const NONE: Redundancy = { kind: 'none', uni: 0, bi: 0 };
const EXEMPT: Redundancy = { kind: 'exempt', uni: 0, bi: 0 };

// TODO(medical-review): all `uni` / `bi` values below
export const REDUNDANCY: Record<string, Redundancy> = {
  // ── consciousness: the arousal system is a bilateral network; arousal often returns over
  //    days–weeks, attention and drive less completely ──
  coma: partial(0.5, 0.3),
  somnolence: partial(0.7, 0.4),

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
  face_weak: bilateral(0.75, 0.2),
  // facial nucleus / fascicle
  face_weak_peripheral: FCP,
  // corticospinal loss: reticulospinal takeover of gross and proximal movement
  arm_weak: parallel(0.5, 0.12),
  arm_weak_proximal: parallel(0.65, 0.2),
  // proximal and axial control, walking: typically better than the arm
  leg_weak: parallel(0.65, 0.15),
  // independent finger movement: poor
  hand_clumsy: { kind: 'fine', uni: 0.2, bi: 0.05 },
  // articulation is partly bilaterally controlled
  dysarthria: bilateral(0.7, 0.15),
  alien_hand: partial(0.5, 0.2),
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
  // 2014;339:176–182, PMID 24581671). The inner-ear infarct is a profound loss. C7-F8
  hearing_loss: partial(0.6, 0.3, { profound: { uni: 0.25, bi: 0.1 } }),
  palatal_tremor: EXEMPT,
  // TODO(medical-review): above the upper pons the taste pathway runs on both sides; 80 % of central taste disorders
  // improved by 24 weeks (Onoda et al., J Neurol 2012; 259:261–6)
  taste_loss: bilateral(0.8, 0.4),

  // ── cognition / behaviour ──
  apraxia: partial(0.5, 0.2),
  callosal_apraxia: partial(0.5, 0.2),
  // TODO(medical-review): no data on its course after stroke
  motor_impersistence: partial(0.5, 0.2),
  abulia: partial(0.5, 0.3),
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
  neglect: partial(0.6, 0.2),
  anosognosia: partial(0.6, 0.3),
  visuospatial: partial(0.45, 0.15),
  // one hippocampus / thalamus: partly; both: dense amnesia persists
  amnesia: partial(0.5, 0.1),
  executive: partial(0.45, 0.2),
  disinhibition: partial(0.4, 0.15),
  emotional: partial(0.5, 0.3),
  topographic: partial(0.5, 0.2),

  // ── balance & coordination: cerebellar and vestibular compensation ──
  ataxia_limb: partial(0.6, 0.3),
  ataxia_gait: partial(0.55, 0.3),
  tremor: partial(0.3, 0.1),
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
  // abducens nucleus (and the pontine gaze centre next to it)
  gaze_palsy_horizontal: FCP,
  // medial longitudinal fasciculus: no parallel tract, but often improves
  ino: partial(0.4, 0.15),
  cn3_palsy: FCP,
  cn4_palsy: FCP,
  cn6_palsy: FCP,
  vertical_gaze_palsy: partial(0.4, 0.25),
  upgaze_palsy: partial(0.4, 0.25),
  // follows the eye-movement deficit that causes it
  diplopia: EXEMPT,
  horner: NONE,

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
 * e.g. 'pons_rostral_lateral'). A nucleus / fascicle source turns it into the final common
 * pathway.
 */
export function redundancyFor(symptomId: string, sourceBase?: string): Redundancy {
  const r = REDUNDANCY[symptomId] ?? DEFAULT_REDUNDANCY;
  if (sourceBase && r.fcpSources?.includes(sourceBase)) return FCP;
  return r;
}
