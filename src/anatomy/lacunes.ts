/**
 * Lacunar infarcts: the occlusion of ONE small branch of a perforator bundle (the model
 * otherwise treats e.g. the eight lenticulostriate arteries as a single vessel). A lacune is
 * small (< 15 mm, ≈ 0.2–1.5 mL) but sits where fibres are tightly packed, so it produces the
 * full deficit of that structure — e.g. a posterior-limb lacune paralyses face, arm and leg.
 *
 * Each bundle maps to the structure its lacunes classically involve
 * (Fisher 1982; Bamford et al. 1991, Oxfordshire Community Stroke Project classification).
 */

/** typical lacune volume, mL */
export const LACUNE_ML = 0.8;

/** fraction of the structure's function lost by a lacune (compact fibre tracts) */
export const LACUNE_DYSFUNCTION = 0.8;

/** perforator bundle (base id) → region (base id) hit by one of its branches */
export const LACUNE_TARGET: Record<string, string> = {
  lenticulostriate: 'ic_posterior_limb', // pure motor hemiparesis
  acha: 'ic_posterior_limb', // capsular lacune from an AChA branch
  heubner: 'caudate_head',
  thalamogeniculate: 'thalamus_ventrolateral', // pure sensory stroke
  thalamoperforator: 'thalamus_paramedian',
  mesencephalic_perf: 'midbrain_paramedian',
  pontine_paramedian_rostral: 'pons_rostral_basis', // pure motor / ataxic hemiparesis
  pontine_paramedian_caudal: 'pons_caudal_basis', // + CN VI fascicle: Raymond (Millard–Gubler only with the facial fascicle)
  pontine_paramedian_inferior: 'pons_caudal_basis',
  pontine_circumferential: 'pons_caudal_tegmentum',
  lat_medullary_perf: 'medulla_lateral',
  asa_root: 'medulla_medial',
  labyrinthine: 'inner_ear',
};

export const canBeLacunar = (baseId: string, n: number | undefined) => (n ?? 1) > 1 && baseId in LACUNE_TARGET;
