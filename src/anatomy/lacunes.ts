/**
 * Lacunar infarcts: the occlusion of ONE small branch of a perforator bundle (the model
 * otherwise treats e.g. the eight lenticulostriate arteries as a single vessel). A lacune is
 * small (< 15 mm, ≈ 0.2–1.5 mL) but sits where fibres are tightly packed, so it knocks out most
 * of the function of that part of the structure.
 *
 * Each bundle maps to the structures its lacunes classically involve (Fisher 1982; Bamford et
 * al. 1991, Oxfordshire Community Stroke Project classification) — its lacune sites. Where one
 * branch can give different classic syndromes depending on where it lands, a site carries its
 * own deficit list, which replaces the region's own while the lacune is all that damages the
 * region (simulate → clinical.aggregateSymptoms); the region's list still describes a larger
 * infarct of the same structure. A site without a list uses the region's, without the functions
 * marked `spareInLacune`.
 *
 * How severe (C6-F1). Lacunar infarcts are small (median 0.73 mL) and mostly mild: a median NIHSS
 * of 4 (IQR 3–6) on arrival in 224 lacunar infarcts of the WAKE-UP trial (Barow E et al. Neurol
 * Res Pract 2020;2:21, PMID 33324925) and of 3 in 365 lacunar strokes (Vynckier J et al.
 * Neurology 2021;97:e1437-e1446, PMID 34400585). In capsular pure motor stroke the severity
 * follows the lesion volume, except in the lowest part of the posterior limb, where even a small
 * infarct can cause a dense hemiplegia (Chamorro A et al. Stroke 1991;22:175-181, PMID 2003281):
 * the sites below give the typical mild-to-moderate picture.
 *
 * Which presentation (C6-F5). Of 316 classic lacunar syndromes, 57 % were pure motor, 20 %
 * sensorimotor, 10 % ataxic hemiparesis, 7 % pure sensory and 6 % dysarthria–clumsy hand, and
 * most CT lesions lay in the internal capsule and corona radiata (Chamorro 1991). Ataxic
 * hemiparesis (weakness with incoordination of the same limbs, no sensory loss) came from the
 * internal capsule in 39 %, the pons in 19 %, the thalamus and the corona radiata in 13 % each,
 * with almost identical features (Moulin T et al. J Neurol Neurosurg Psychiatry 1995;58:422-427,
 * PMID 7738547); on diffusion MRI mainly from the pons or the internal capsule / corona radiata
 * (Hiraga A et al. J Neurol Neurosurg Psychiatry 2007;78:1260-1262, PMID 17550988). The
 * dysarthria–clumsy hand syndrome lay in the internal capsule in 40 %, the pons in 17 % and the
 * corona radiata in 8.6 %, with limb weakness but not cerebellar-type ataxia (Arboix A et al.
 * J Neurol Neurosurg Psychiatry 2004;75:231-234, PMID 14742595). In the basis pontis, pure motor
 * hemiparesis was the commonest picture (17 of 37), and rostral paramedian lesions tended to give
 * dysarthria–clumsy hand (Kim JS et al. Stroke 1995;26:950-955, PMID 7762044); a basis pontis
 * lesion gives ataxia on the side of the weakness (Fisher CM. Arch Neurol 1978;35:126-128, PMID
 * 629655). The posterior paraventricular corona radiata belongs to the anterior choroidal
 * territory (Hupperts RM et al. Brain 1994;117:825-834, PMID 7922468).
 */

import { LACUNAR_CLUMSY_HAND, RIGHT_GENU_AMNESIA } from './redundancy';
import type { DeficitRef, L } from './types';

/** typical lacune volume, mL */
export const LACUNE_ML = 0.8;

/**
 * fraction of the structure's function lost by a lacune (compact fibre tracts): at a site with a
 * deficit list of its own; at a site that uses the region's own deficits, no more than the whole
 * bundle feeds there, as one branch cannot cost a structure more than all of its bundle does
 * (simulate.lacuneShareOf, V2-3)
 */
export const LACUNE_DYSFUNCTION = 0.8;

export interface LacuneSite {
  /** unique within its bundle (in links: `<vessel>:b:<id>`) */
  id: string;
  /** region (base id) the lacune lies in */
  region: string;
  /** where it lies and what it gives, for the picker */
  name: L;
  /**
   * what a lacune here does, in place of the region's own deficits while the lacune is all that
   * damages the region; left out: the region's deficits without those marked `spareInLacune`
   */
  deficits?: DeficitRef[];
}

// ── deficit lists of the sites that have their own ──

/**
 * the posterior limb of the internal capsule: face, arm and leg weak to a similar degree, mildly
 * to moderately; the thalamocortical (sensory) fibres behind it are spared. The non-motor items
 * are the region's.
 */
const CAPSULAR_PURE_MOTOR: DeficitRef[] = [
  { s: 'face_weak', lat: 'contra', sev: 1 },
  { s: 'arm_weak', lat: 'contra', sev: 1 },
  { s: 'leg_weak', lat: 'contra', sev: 1 },
  { s: 'spasticity', lat: 'contra', sev: 2 },
  { s: 'cold_limb', lat: 'contra', sev: 1 },
];

/**
 * the corona radiata (the lenticulostriate fields, or the AChA's posterior paraventricular part):
 * mild weakness with ataxia of the same limbs out of proportion to it (Moulin 1995: almost the
 * same picture from every site; dysarthria or nystagmus point to the pons or cerebellum instead)
 */
const SUPRATENTORIAL_ATAXIC_HEMIPARESIS: DeficitRef[] = [
  { s: 'face_weak', lat: 'contra', sev: 1 },
  { s: 'arm_weak', lat: 'contra', sev: 1 },
  { s: 'leg_weak', lat: 'contra', sev: 1 },
  { s: 'ataxia_limb', lat: 'contra', sev: 2 },
  { s: 'spasticity', lat: 'contra', sev: 1 },
  { s: 'cold_limb', lat: 'contra', sev: 1 },
];

/**
 * the corticobulbar fibres at the genu: slurred speech, a clumsy hand, a mild facial weakness. The
 * hand recovers well, within weeks (Arboix 2004: 45.7 % symptom-free at discharge; R2-1)
 */
const CAPSULAR_DYSARTHRIA_CLUMSY_HAND: DeficitRef[] = [
  { s: 'dysarthria', lat: 'none', sev: 2 },
  { s: 'hand_clumsy', lat: 'contra', sev: 2, redundancy: LACUNAR_CLUMSY_HAND },
  { s: 'face_weak', lat: 'contra', sev: 1 },
  { s: 'dysphagia', lat: 'none', sev: 1, minLevel: 0.5, fast: true },
  { s: 'emotionalism', lat: 'none', sev: 1 },
];

/**
 * the lower genu (C6-F8): an abrupt behavioural change — fluctuating alertness, inattention,
 * memory loss, apathy, abulia and psychomotor slowing — with mild hemiparesis and dysarthria;
 * severe verbal memory loss after left-sided infarcts (dementia in 4 of 6), only a transient
 * visuospatial memory impairment after a right-sided one. Proposed mechanism: the infarct cuts
 * the inferior and anterior thalamic peduncles and deactivates the frontal cortex of that side
 * (Tatemichi TK et al. Neurology 1992;42:1966-1979, PMID 1407580; six patients). Here only as a
 * lacune of the genu: a larger infarct that reaches the genu keeps the region's list.
 */
const CAPSULAR_GENU: DeficitRef[] = [
  { s: 'face_weak', lat: 'contra', sev: 1 },
  { s: 'arm_weak', lat: 'contra', sev: 1 },
  { s: 'leg_weak', lat: 'contra', sev: 1 },
  { s: 'dysarthria', lat: 'none', sev: 1 },
  { s: 'abulia', lat: 'none', sev: 1 },
  { s: 'executive', lat: 'none', sev: 1 },
  { s: 'amnesia', lat: 'none', only: 'l', sev: 2 },
  // transient after a right-sided lacune (R2-3)
  { s: 'amnesia', lat: 'none', only: 'r', sev: 1, redundancy: RIGHT_GENU_AMNESIA },
  { s: 'emotionalism', lat: 'none', sev: 1 },
];

/**
 * what every lacune of the basis pontis shares with the region: emotionalism after one-sided
 * pontine base lesions, more after two-sided ones. The region's anarthria and severe dysphagia of
 * both whole corticobulbar tracts cut are not given to two single-branch lacunes, one on each
 * side: their mild weakness is not the quadriplegia of a locked-in syndrome either.
 */
const PONTINE_BASE_SHARED: DeficitRef[] = [
  { s: 'emotionalism', lat: 'none', sev: 1 },
  { s: 'emotionalism', lat: 'none', sev: 2, bilateralOnly: true },
];

/** basis pontis, pure motor: dysarthria is commoner with infratentorial lacunes (Barow 2020) */
const PONTINE_PURE_MOTOR: DeficitRef[] = [
  { s: 'face_weak', lat: 'contra', sev: 1 },
  { s: 'arm_weak', lat: 'contra', sev: 1 },
  { s: 'leg_weak', lat: 'contra', sev: 1 },
  { s: 'dysarthria', lat: 'none', sev: 1 },
  { s: 'spasticity', lat: 'contra', sev: 2 },
  ...PONTINE_BASE_SHARED,
];

/** basis pontis, ataxic hemiparesis: the pontocerebellar fibres cross, so the ataxia is on the side of the weakness */
const PONTINE_ATAXIC_HEMIPARESIS: DeficitRef[] = [
  { s: 'face_weak', lat: 'contra', sev: 1 },
  { s: 'arm_weak', lat: 'contra', sev: 1 },
  { s: 'leg_weak', lat: 'contra', sev: 1 },
  { s: 'ataxia_limb', lat: 'contra', sev: 2 },
  { s: 'dysarthria', lat: 'none', sev: 1 },
  { s: 'spasticity', lat: 'contra', sev: 2 },
  ...PONTINE_BASE_SHARED,
];

/** basis pontis, dysarthria–clumsy hand (rostral paramedian lesions, Kim 1995); the hand recovers as above */
const PONTINE_DYSARTHRIA_CLUMSY_HAND: DeficitRef[] = [
  { s: 'dysarthria', lat: 'none', sev: 2 },
  { s: 'hand_clumsy', lat: 'contra', sev: 2, redundancy: LACUNAR_CLUMSY_HAND },
  { s: 'face_weak', lat: 'contra', sev: 1 },
  ...PONTINE_BASE_SHARED,
];

const site = (id: string, region: string, name: L, deficits?: DeficitRef[]): LacuneSite => (deficits ? { id, region, name, deficits } : { id, region, name });

const CAPSULE_PURE_MOTOR_SITE = site(
  'pure_motor',
  'ic_posterior_limb',
  { zh: '內囊後肢：純運動性', en: 'Posterior limb of the internal capsule: pure motor' },
  CAPSULAR_PURE_MOTOR,
);
const CORONA_ATAXIC_SITE = site(
  'ataxic',
  'corona_radiata',
  { zh: '放射冠：運動失調性偏癱', en: 'Corona radiata: ataxic hemiparesis' },
  SUPRATENTORIAL_ATAXIC_HEMIPARESIS,
);

/**
 * perforator bundle (base id) → the sites one of its branches can hit; the first is the classic
 * one, used when an occlusion names none
 */
export const LACUNE_SITES: Record<string, LacuneSite[]> = {
  lenticulostriate: [
    CAPSULE_PURE_MOTOR_SITE,
    CORONA_ATAXIC_SITE,
    site(
      'dch',
      'ic_genu',
      { zh: '內囊膝部：構音障礙—笨拙手', en: 'Genu of the internal capsule: dysarthria–clumsy hand' },
      CAPSULAR_DYSARTHRIA_CLUMSY_HAND,
    ),
    site(
      'genu',
      'ic_genu',
      { zh: '內囊膝部下方：意識混亂與失憶（策略性梗塞）', en: 'Lower genu of the internal capsule: confusion and memory loss (strategic infarct)' },
      CAPSULAR_GENU,
    ),
  ],
  // capsular lacune from an AChA branch; the AChA also feeds the posterior paraventricular corona radiata (Hupperts 1994)
  acha: [CAPSULE_PURE_MOTOR_SITE, CORONA_ATAXIC_SITE],
  heubner: [site('caudate', 'caudate_head', { zh: '尾狀核頭', en: 'Caudate head' })],
  // pure sensory stroke
  thalamogeniculate: [site('pure_sensory', 'thalamus_ventrolateral', { zh: '視丘腹外側：純感覺性', en: 'Ventrolateral thalamus: pure sensory' })],
  thalamoperforator: [site('paramedian', 'thalamus_paramedian', { zh: '視丘旁正中', en: 'Paramedian thalamus' })],
  mesencephalic_perf: [site('paramedian', 'midbrain_paramedian', { zh: '中腦旁正中', en: 'Paramedian midbrain' })],
  pontine_paramedian_rostral: [
    site('pure_motor', 'pons_rostral_basis', { zh: '橋腦基底部：純運動性', en: 'Basis pontis: pure motor' }, PONTINE_PURE_MOTOR),
    site('ataxic', 'pons_rostral_basis', { zh: '橋腦基底部：運動失調性偏癱', en: 'Basis pontis: ataxic hemiparesis' }, PONTINE_ATAXIC_HEMIPARESIS),
    site('dch', 'pons_rostral_basis', { zh: '橋腦基底部：構音障礙—笨拙手', en: 'Basis pontis: dysarthria–clumsy hand' }, PONTINE_DYSARTHRIA_CLUMSY_HAND),
  ],
  // + CN VI fascicle: Raymond (Millard–Gubler only with the facial fascicle)
  pontine_paramedian_caudal: [site('basis', 'pons_caudal_basis', { zh: '橋腦下部基底部', en: 'Lower basis pontis' })],
  pontine_paramedian_inferior: [site('basis', 'pons_caudal_basis', { zh: '橋腦下部基底部', en: 'Lower basis pontis' })],
  pontine_circumferential: [site('tegmentum', 'pons_caudal_tegmentum', { zh: '橋腦下部被蓋', en: 'Lower pontine tegmentum' })],
  lat_medullary_perf: [site('lateral', 'medulla_lateral', { zh: '延髓外側', en: 'Lateral medulla' })],
  asa_root: [site('medial', 'medulla_medial', { zh: '延髓內側', en: 'Medial medulla' })],
  labyrinthine: [site('inner_ear', 'inner_ear', { zh: '內耳', en: 'Inner ear' })],
};

/** perforator bundle (base id) → the region (base id) its classic lacune lies in */
export const LACUNE_TARGET: Record<string, string> = Object.fromEntries(Object.entries(LACUNE_SITES).map(([b, s]) => [b, s[0].region]));

export const canBeLacunar = (baseId: string, n: number | undefined) => (n ?? 1) > 1 && baseId in LACUNE_SITES;

/** the sites a branch of this bundle can hit ([] if it cannot be lacunar) */
export const lacuneSitesOf = (baseId: string): LacuneSite[] => LACUNE_SITES[baseId] ?? [];

/** the site a lacune of this bundle lies in: the named one, or the classic first one */
export function lacuneSiteOf(baseId: string, siteId?: string): LacuneSite | undefined {
  const sites = lacuneSitesOf(baseId);
  return sites.find((s) => s.id === siteId) ?? sites[0];
}
