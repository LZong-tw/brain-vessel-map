/**
 * Lumped-parameter (0-D) cerebral blood-flow model.
 *
 * The arterial tree is an electrical-style resistor network:
 *   • each vessel segment is a Poiseuille conductance  G = K·n·r⁴ / L
 *   • leptomeningeal / extracranial anastomoses are small conductances scaled by the
 *     chosen collateral grade; the pial collaterals of the brainstem are part of the network
 *     without being drawn (see BRAINSTEM_PIAL)
 *   • tissue is divided into perfusion "units": the part of a bed fed by one supplying artery.
 *     Each unit drains to the venous side through a microvascular conductance calibrated so
 *     that normal flow matches its metabolic demand. Units never pass blood between arterial
 *     trees — only real anastomoses (collateral vessels) do.
 *   • cerebral autoregulation: unit conductance dilates (up to ×D_MAX) to defend flow when
 *     perfusion pressure falls, and constricts when it rises
 *   • a complete occlusion also blocks the origins of branches that arise from the occluded
 *     segment (a thrombus covers their orifices)
 *
 * The idea follows classic 1-D/0-D circle-of-Willis models (Alastruey et al. 2007; openBF,
 * Apache-2.0) but is deliberately simplified: steady state, rigid vessels, no pulsatility.
 * It reproduces qualitative behaviour (collateral compensation, flow reversal, steal,
 * watershed vulnerability) — NOT patient-specific numbers.
 */

import { BEDS, REGION_BY_ID, VESSELS, VESSEL_BY_ID } from '../anatomy';
import type { SupplyDef, Vessel } from '../anatomy';
import { VARIANT_BY_ID } from '../anatomy/variants';
import { SymmetricSystem } from './solver';

export type CollateralGrade = 'good' | 'moderate' | 'poor';

export interface Occlusion {
  vessel: string;
  /** 1 = complete occlusion; <1 = diameter stenosis fraction (e.g. 0.7 = 70 %) */
  severity: number;
  /**
   * only ONE branch of a perforator bundle is blocked (a lacune): no measurable change in
   * flow, handled by the tissue model (see anatomy/lacunes.ts)
   */
  branch?: boolean;
  /**
   * with `branch`: where in that bundle's territory the lacune lies and so which presentation it
   * gives (a site id of anatomy/lacunes.ts LACUNE_SITES); absent or unknown: the bundle's first,
   * classic site
   */
  lacuneSite?: string;
  /**
   * hours after the start of the timeline at which this occlusion begins (default 0). The same
   * vessel may be listed more than once with non-overlapping windows (e.g. a stenosis that later
   * occludes). simulateHemodynamics ignores the timing: it treats every occlusion it is given as
   * present, so callers pass the set active at one moment (see engine/schedule.ts).
   */
  fromH?: number;
  /** hours at which it reopens by itself (spontaneous recanalisation); null / absent = never */
  toH?: number | null;
}

export interface HemoInput {
  occlusions: Occlusion[];
  variants: string[];
  /** mean arterial pressure, mmHg */
  map: number;
  collateral: CollateralGrade;
}

/** Part of a bed supplied by one artery. */
export interface Unit {
  id: string;
  bed: string;
  node: string;
  vessel: string;
  /** fraction of the bed */
  frac: number;
  distal: boolean;
  baseFlow: number;
}

export interface HemoResult {
  /** mL/min, positive = nominal direction (from → to) */
  vesselFlow: Record<string, number>;
  baselineFlow: Record<string, number>;
  /** flow / baseline flow per unit */
  unitRel: Record<string, number>;
  /** volume-weighted flow / baseline per bed */
  bedRel: Record<string, number>;
  /** mean pressure at the distal end of each vessel, mmHg */
  vesselPressure: Record<string, number>;
  /** vessels whose flow direction reversed compared with baseline */
  reversed: string[];
  /** vessels with no flow because they are occluded or their origin is blocked */
  totalCbf: number;
  baselineCbf: number;
  iterations: number;
}

// ── model constants ───────────────────────────────────────────────
/** Poiseuille scale (mL/min/mmHg for r, L in mm). Physical value ≈ 900; lowered to lump
 * non-Poiseuille losses (curvature, branching, pulsatility) into the large arteries. */
export const K_POISEUILLE = 150;
/** cortical/cerebellar "branches" stand for several parallel arteries of that name */
const KIND_FACTOR: Partial<Record<Vessel['kind'], number>> = { branch: 3 };
export const MAP_REF = 93;
/** effective outflow pressure (venous / intracranial) */
export const P_OUT = 10;
/** design pressure drop across a unit's feeding pial/penetrating arterioles at baseline */
const DP_LINK = 12;
/** border-zone (distal field) units sit at the far end of their tree: a larger share of their
 * resistance lies in long pial vessels that cannot dilate further, so they have less
 * autoregulatory reserve and fail first when perfusion pressure falls (watershed infarcts) */
const DP_LINK_DISTAL = 30;
/** autoregulation limits (microvascular conductance multipliers) */
export const D_MAX = 1.8;
export const D_MIN = 0.6;
const COLL_GRADE: Record<CollateralGrade, number> = { good: 1.5, moderate: 0.8, poor: 0.15 };
/** overall anastomotic capacity (mL/min/mmHg per mL/min of territory flow) */
const COLL_SCALE = 1 / 36;
/** stenosis: length of the narrowed segment (mm); the jet through a tight stenosis follows the
 * physical Poiseuille scale much better than the lumped large-artery scale */
const STENOSIS_LEN = 4;
const K_PHYSICAL = 900;
const G_LEAK = 1e-9;
const FIXED = 'arch';

/**
 * Pial collaterals of the pons and midbrain (not drawn as vessels).
 *
 * The long circumferential arteries (AICA and SCA; PICA near the pontomedullary junction; the
 * collicular artery around the midbrain) wind around the brainstem and supply its lateral
 * surface. The model assumes that they anastomose on the pial surface with the short
 * (paramedian and circumferential) branches of the basilar artery before these penetrate, so
 * that when a basilar thrombus covers the origins of those branches, blood can still enter them
 * beyond their origin. Proposed reasons why brainstem tissue can stay salvageable for many
 * hours in basilar artery occlusion are the collateral network of the posterior circulation,
 * retrograde filling of the distal basilar artery (here: through the PComms, already in the
 * vessel network) and residual flow past the clot, which may keep the brainstem perforators
 * marginally patent (Lindsberg PJ et al. Time window for recanalization in basilar artery
 * occlusion: speculative synthesis. Neurology 2015;85:1806–1815); posterior-circulation
 * collateral status predicts outcome (posterior circulation collateral score: van der Hoeven
 * EJRJ et al. Int J Stroke 2016;11:768–775; BATMAN score, which combines thrombus burden and
 * collaterals: Alemseged F et al. Stroke 2017;48:631–637). The medulla is left out: its
 * perforators come from the vertebral arteries.
 *
 * Each link joins a donor node (mid-course or end of the circumferential artery) to the
 * mid-course node of a perforator group; a group near two donors shares the link between them.
 * An occlusion of the perforator group itself (branch disease) therefore closes this route too,
 * and its territory stays an end-artery territory. The conductance is proportional to the
 * baseline flow of the perforator's territory and has two parts in series: the anastomotic
 * channels, which scale with the collateral grade, and a fixed limit on how much blood can
 * reach the deep perforator territory this way. The fixed part keeps even good collaterals from
 * fully replacing the basilar supply, so an untreated mid-basilar occlusion still leaves the
 * ventral pons ischaemic.
 */
const BRAINSTEM_PIAL: { perforator: string; from: string; share: number }[] = [
  { perforator: 'pontine_paramedian_inferior_{s}', from: 'aica_{s}@mid', share: 0.6 },
  { perforator: 'pontine_paramedian_inferior_{s}', from: 'pica_{s}@mid', share: 0.4 },
  { perforator: 'pontine_paramedian_caudal_{s}', from: 'aica_{s}@mid', share: 0.7 },
  { perforator: 'pontine_paramedian_caudal_{s}', from: 'sca_{s}@mid', share: 0.3 },
  { perforator: 'pontine_circumferential_{s}', from: 'aica_{s}@mid', share: 0.5 },
  { perforator: 'pontine_circumferential_{s}', from: 'sca_{s}@mid', share: 0.5 },
  { perforator: 'pontine_paramedian_rostral_{s}', from: 'sca_{s}@mid', share: 0.7 },
  { perforator: 'pontine_paramedian_rostral_{s}', from: 'aica_{s}@mid', share: 0.3 },
  { perforator: 'mesencephalic_perf_{s}', from: 'sca_{s}@mid', share: 0.5 },
  { perforator: 'mesencephalic_perf_{s}', from: 'quad_end_{s}', share: 0.5 },
];
/** TODO(medical-review): anastomotic conductance per mL/min of territory flow at grade factor 1
 * (tuned so that a mid-basilar occlusion leaves the paramedian pons at about 50 % / 40 % / 33 %
 * of normal flow with good / moderate / poor collaterals, i.e. slowly dying penumbra, faster
 * dying penumbra and penumbra close to the core threshold that is lost within hours — a
 * qualitative target, not a measurement; see PIAL_GRADE) */
const PIAL_ANAST = 0.02;
/**
 * Grade factor of the brainstem pial collaterals: as for the other collaterals, except 'poor'.
 *
 * TODO(medical-review): with the leptomeningeal factor (0.15) a mid-basilar occlusion with poor
 * collaterals left the paramedian pons at about 15 % of normal flow, i.e. core within minutes,
 * so reopening the artery even after 1 h changed nothing. The evidence describes a graded
 * disadvantage, not futility: in the BASILAR registry (n = 828) thrombectomy was associated with
 * better outcomes in every BATMAN stratum (interaction p = 0.52), and the ESO/ESMINT guideline
 * suggests reperfusion therapy irrespective of the collateral score (Strbian D et al. Eur Stroke J
 * 2024;9:835–884); with unfavourable BATMAN or PC-CS, revascularisation within 6 h, but not
 * later, was associated with good outcome, whereas favourable collaterals benefited even after
 * 6 h (Alemseged F et al. Response to late-window endovascular revascularization is associated
 * with collateral status in basilar artery occlusion. Stroke 2019;50:1415–1422). BATMAN combines
 * thrombus burden with collaterals, so it is not a pure collateral grade. The target applies to
 * every basilar segment (the evidence concerns basilar artery occlusion in general): the
 * paramedian pons cut off by a lower, mid or upper basilar occlusion sits at about a third of
 * normal flow (low penumbra), so reopening within a few hours saves part of it, the benefit
 * fades towards 12 h and is gone at 24 h. 0.5 meets it for the caudal group (mid basilar); see
 * PIAL_POOR_BY_GROUP for the others. Good and moderate keep the common factors, so their
 * calibration is unchanged.
 */
const PIAL_GRADE: Record<CollateralGrade, number> = { ...COLL_GRADE, poor: 0.5 };
/**
 * TODO(medical-review): the poor-grade factor of the perforator groups for which 0.5 misses the
 * PIAL_GRADE target. In this network the inferior paramedian perforators (cut off by a lower
 * basilar occlusion) and the rostral ones (upper basilar) receive less through their donors at
 * the same factor than the caudal group: with 0.5 they sat at about 28 % of normal flow, below
 * the core threshold, so reopening a lower or upper basilar occlusion with poor collaterals saved
 * nothing even at 15 min. With these factors they sit at about a third of normal flow, like the
 * caudal group. A calibration, not a measurement; good and moderate are unchanged.
 * Known limitation (X2-17, in both READMEs): the targets are for one basilar segment. When the
 * lower basilar is occluded together with another segment (a long clot that also covers the AICA
 * origins, the donors of most of these links), moderate or poor collaterals leave the paramedian
 * groups of the occluded segments at about 6–23 % of normal flow, below the core threshold, so
 * reopening even at 30 min saves almost nothing — against the evidence of a graded disadvantage
 * above. Recalibrating it would move every single-segment, AICA and PICA calibration with it.
 */
const PIAL_POOR_BY_GROUP: Record<string, number> = {
  'pontine_paramedian_inferior_{s}': 0.75,
  'pontine_paramedian_rostral_{s}': 0.75,
};
const pialGrade = (perforator: string, collateral: CollateralGrade) =>
  collateral === 'poor' ? PIAL_POOR_BY_GROUP[perforator] ?? PIAL_GRADE.poor : PIAL_GRADE[collateral];
/** TODO(medical-review): fixed series limit of the surface-to-perforator entry (same units) */
const PIAL_ENTRY = 0.015;
/**
 * Above normal pressure the pial collaterals, like other small arteries, constrict (myogenic
 * tone), so hypertension adds only a little collateral flow instead of pushing it up in step
 * with the pressure. Without this, a complete mid-basilar occlusion with good collaterals caused
 * no ischaemia at all from a mean pressure of ~110 mmHg, which is not how acute basilar
 * occlusion behaves. At or below normal pressure the conductance is unchanged (hypotension
 * still starves the collateral territory).
 * TODO(medical-review): the exponent is tuned so that good collaterals stay in the penumbra range
 * over the whole blood-pressure slider; it is not a measured value.
 */
const PIAL_PRESSURE_EXP = 1.4;
export const pialPressureFactor = (map: number) => (map <= MAP_REF ? 1 : Math.pow(MAP_REF / map, PIAL_PRESSURE_EXP));

/**
 * Chest-wall and neck collaterals of the subclavian artery (not drawn as vessels).
 *
 * When the subclavian artery is blocked proximal to the vertebral origin, the arm is fed not
 * only by the reversed vertebral artery but also through the branches of the first part of the
 * subclavian artery, which reverse too: the internal thoracic artery from the intercostal
 * arteries of the descending aorta, and the thyrocervical trunk from the superior thyroid branch
 * of the external carotid artery. Each link joins a donor (the aorta, here the arch node, or the
 * carotid bifurcation) to the vertebral origin of the subclavian artery, with a fixed
 * conductance (mL/min/mmHg) that does not depend on the leptomeningeal collateral grade. At
 * baseline the pressures at both ends are almost equal and they carry next to nothing.
 *
 * TODO(medical-review): the conductances are a qualitative calibration, not measurements.
 * Without them the whole arm was fed by the reversed vertebral artery, which drained the
 * vertebrobasilar junction so much that the basilar tip and both P1 segments reversed and the
 * carotids fed the upper basilar artery through the PComms in every steal. In patients with
 * retrograde vertebral flow, 76 % (19/25) had antegrade basilar flow at rest, unchanged by arm
 * ischaemia, and fewer than 25 % reversed (Harper C et al. Transcranial Doppler ultrasonography of
 * the basilar artery in patients with retrograde vertebral artery flow. J Vasc Surg
 * 2008;48:859–864). Tuned so that with a normal opposite vertebral artery the basilar artery and
 * the P1 segments stay antegrade at rest and the arm's mean pressure is about 25 mmHg below the
 * other arm (steal is found with arm pressure differences above 20 mmHg and is mostly silent;
 * symptoms are more frequent above 40–50 mmHg: Labropoulos N et al. Prevalence and impact of the
 * subclavian steal syndrome. Ann Surg 2010;252:166–170). With a hypoplastic or occluded opposite
 * vertebral artery the carotids still have to feed the basilar artery, which then reverses.
 *
 * The same links are also the collateral supply of a common carotid or brachiocephalic occlusion
 * (R4-6). After a common carotid occlusion the cervical ICA is often patent, fed through a
 * reversed external carotid artery from the thyrocervical or costocervical trunk and the superior
 * thyroid artery (16 of 16 patients: Wang J et al. Four collateral circulation pathways were
 * observed after common carotid artery occlusion. BMC Neurol 2019;19:201): here the cca_bif link.
 * Around a brachiocephalic occlusion the aortic link feeds the reversed right subclavian artery,
 * which feeds the right common carotid. With them these occlusions are much better compensated
 * than without (with poor collaterals, 24 h: NIHSS 0 and about 5 mL instead of 9 points and
 * 34 mL for a right CCA occlusion; pinned in haemodynamicCalibration.test.ts). The model still
 * shows a slightly reversed cervical ICA where the patients had it antegrade.
 */
const ARM_COLLATERALS: { from: string; g: number }[] = [
  { from: 'arch', g: 1.8 },
  { from: 'cca_bif_{s}', g: 1.2 },
];

const BRAIN_CATEGORIES = new Set(['cortex', 'deep', 'brainstem', 'cerebellum']);

const pathLength = (v: Vessel): number => {
  let s = 0;
  for (let i = 1; i < v.path.length; i++) {
    const a = v.path[i - 1];
    const b = v.path[i];
    s += Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }
  return Math.max(s, 2);
};

const nodeOf = (s: SupplyDef): string => (s.at === 'mid' ? `${s.v}@mid` : VESSEL_BY_ID[s.v].to);

const FLOW_VESSELS = VESSELS.filter((v) => !v.visualOnly);

interface CollateralLink {
  id: string;
  a: string;
  b: string;
  g: number;
}

interface Config {
  key: string;
  vesselG: Map<string, number>;
  /** anastomoses that are part of the flow network but not drawn (see BRAINSTEM_PIAL) */
  hiddenLinks: CollateralLink[];
  midNeeded: Set<string>;
  units: Unit[];
  /** calibrated conductances per unit: feeding link and microvascular bed (in series) */
  gLink: Map<string, number>;
  gTissue: Map<string, number>;
  baselineFlow: Record<string, number>;
  baselineCbf: number;
}

function buildUnits(overrides: Map<string, SupplyDef[]>): Unit[] {
  const units: Unit[] = [];
  for (const bed of BEDS) {
    if (bed.baseFlow <= 0) continue;
    const supply = overrides.get(bed.region) ?? bed.supply;
    const total = supply.reduce((a, s) => a + s.share, 0) || 1;
    const merged = new Map<string, Unit>();
    for (const s of supply) {
      const node = nodeOf(s);
      const frac = s.share / total;
      const prev = merged.get(node);
      if (prev) {
        prev.frac += frac;
        prev.baseFlow += frac * bed.baseFlow;
      } else {
        merged.set(node, {
          // one artery can feed a bed at two points (its middle and its end): one unit for each
          id: `${bed.id}#${s.v}${s.at === 'mid' && supply.some((x) => x.v === s.v && x.at !== 'mid') ? '@mid' : ''}`,
          bed: bed.id,
          node,
          vessel: s.v,
          frac,
          distal: !!s.distal,
          baseFlow: frac * bed.baseFlow,
        });
      }
    }
    units.push(...merged.values());
  }
  return units;
}

/** baseline downstream flow of each vessel (used to size collaterals) */
function subtreeFlows(units: Unit[]): Map<string, number> {
  const direct = new Map<string, number>();
  for (const u of units) direct.set(u.vessel, (direct.get(u.vessel) ?? 0) + u.baseFlow);
  const memo = new Map<string, number>();
  const visit = (id: string): number => {
    if (memo.has(id)) return memo.get(id)!;
    memo.set(id, 0);
    let s = direct.get(id) ?? 0;
    for (const c of VESSEL_BY_ID[id].children) s += visit(c);
    memo.set(id, s);
    return s;
  };
  for (const v of FLOW_VESSELS) visit(v.id);
  return memo;
}

function ownerFlow(node: string, sub: Map<string, number>): number {
  if (node.endsWith('@mid')) return sub.get(node.slice(0, -4)) ?? 0;
  let best = 0;
  for (const v of FLOW_VESSELS) if (v.kind !== 'collateral' && v.to === node) best = Math.max(best, sub.get(v.id) ?? 0);
  return best;
}

// ── configuration (variants + collateral grade) ───────────────────
const configCache = new Map<string, Config>();

/** vessels only some people have (absent unless a chosen variant adds them) */
const VARIANT_ONLY = VESSELS.filter((v) => v.variantOnly).map((v) => v.id);

export function variantOverrides(variants: readonly string[]): { scale: Map<string, number>; overrides: Map<string, SupplyDef[]> } {
  const scale = new Map<string, number>();
  const overrides = new Map<string, SupplyDef[]>();
  for (const id of variants) {
    const v = VARIANT_BY_ID[id];
    if (!v) continue;
    for (const [vid, f] of Object.entries(v.vesselScale ?? {})) {
      // a vessel a variant adds starts from 0, so its scale is set rather than multiplied
      if (VESSEL_BY_ID[vid]?.variantOnly) scale.set(vid, Math.max(scale.get(vid) ?? 0, f));
      else scale.set(vid, (scale.get(vid) ?? 1) * f);
    }
    for (const [rid, sup] of Object.entries(v.supplyOverride ?? {})) overrides.set(rid, sup);
  }
  for (const vid of VARIANT_ONLY) if (!scale.has(vid)) scale.set(vid, 0);
  // absent PComm: the polar (tuberothalamic) artery then arises from the P1 perforators
  for (const s of ['r', 'l']) {
    if ((scale.get(`pcomm_${s}`) ?? 1) === 0 && !overrides.has(`thalamus_anterior_${s}`)) {
      overrides.set(`thalamus_anterior_${s}`, [{ v: `thalamoperforator_${s}`, share: 1 }]);
    }
  }
  return { scale, overrides };
}

/**
 * Vessels that do not exist in this anatomy: removed by a chosen variant (scale 0, e.g. an
 * absent AComm) or only present with a variant that is not chosen (e.g. a persistent trigeminal
 * artery). They carry no flow, and the views do not draw or list them.
 */
export function absentVessels(variants: readonly string[]): Set<string> {
  const { scale } = variantOverrides(variants);
  return new Set([...scale].filter(([, f]) => f === 0).map(([id]) => id));
}

function buildConfig(variants: string[], collateral: CollateralGrade): Config {
  const key = `${[...variants].sort().join(',')}|${collateral}`;
  const cached = configCache.get(key);
  if (cached) return cached;

  const { scale, overrides } = variantOverrides(variants);
  const units = buildUnits(overrides);

  const midNeeded = new Set<string>();
  for (const v of FLOW_VESSELS) {
    // a vessel only some people have does not split its parent when it is absent
    if (v.variantOnly && scale.get(v.id) === 0) continue;
    for (const end of [v.from, v.to]) if (end.endsWith('@mid')) midNeeded.add(end.slice(0, -4));
  }
  for (const u of units) if (u.node.endsWith('@mid')) midNeeded.add(u.node.slice(0, -4));

  const sub = subtreeFlows(units);
  const vesselG = new Map<string, number>();
  for (const v of FLOW_VESSELS) {
    const f = scale.get(v.id) ?? 1;
    if (f === 0) {
      vesselG.set(v.id, 0);
      continue;
    }
    if (v.kind === 'collateral') {
      const fref = (ownerFlow(v.from, sub) + ownerFlow(v.to, sub)) / 2;
      vesselG.set(v.id, (v.collStrength ?? 1) * COLL_GRADE[collateral] * Math.max(fref, 5) * COLL_SCALE);
    } else {
      const r = v.r * f;
      vesselG.set(v.id, (K_POISEUILLE * (KIND_FACTOR[v.kind] ?? 1) * (v.n ?? 1) * r ** 4) / (v.len ?? pathLength(v)));
    }
  }

  const hiddenLinks = [...brainstemPialLinks(units, vesselG, midNeeded, collateral), ...armCollateralLinks()];
  const cfg: Config = {
    key,
    vesselG,
    hiddenLinks,
    midNeeded,
    units,
    gLink: new Map(),
    gTissue: new Map(),
    baselineFlow: {},
    baselineCbf: 0,
  };
  calibrate(cfg);
  configCache.set(key, cfg);
  return cfg;
}

/** the undrawn chest-wall and neck collaterals of each subclavian artery (see ARM_COLLATERALS) */
function armCollateralLinks(): CollateralLink[] {
  const links: CollateralLink[] = [];
  for (const s of ['r', 'l']) {
    for (const l of ARM_COLLATERALS) {
      const a = l.from.replace('{s}', s);
      links.push({ id: `arm:${a}>sub_va_${s}`, a, b: `sub_va_${s}`, g: l.g });
    }
  }
  return links;
}

/**
 * Conductances of the brainstem pial collaterals (see BRAINSTEM_PIAL). Adds the mid-course
 * nodes of the perforators they enter to `midNeeded`.
 */
function brainstemPialLinks(
  units: Unit[],
  vesselG: Map<string, number>,
  midNeeded: Set<string>,
  collateral: CollateralGrade,
): CollateralLink[] {
  const territoryFlow = new Map<string, number>();
  for (const u of units) territoryFlow.set(u.node, (territoryFlow.get(u.node) ?? 0) + u.baseFlow);
  const links: CollateralLink[] = [];
  for (const s of ['r', 'l']) {
    for (const l of BRAINSTEM_PIAL) {
      const perf = VESSEL_BY_ID[l.perforator.replace('{s}', s)];
      const a = l.from.replace('{s}', s);
      const mid = a.endsWith('@mid');
      const donor = mid ? a.slice(0, -4) : FLOW_VESSELS.find((v) => v.to === a)?.id;
      const q = perf ? territoryFlow.get(perf.to) ?? 0 : 0;
      // both arteries must exist in this anatomy, and a donor's mid-course node must be in the network
      if (!perf || !(q > 0) || !((vesselG.get(perf.id) ?? 0) > 0)) continue;
      if (!donor || (mid && !midNeeded.has(donor)) || !((vesselG.get(donor) ?? 0) > 0)) continue;
      const gAnast = pialGrade(l.perforator, collateral) * PIAL_ANAST * q;
      const gEntry = PIAL_ENTRY * q;
      const g = (l.share * gAnast * gEntry) / (gAnast + gEntry);
      links.push({ id: `pial:${a}>${perf.id}`, a, b: `${perf.id}@mid`, g });
    }
  }
  for (const l of links) midNeeded.add(l.b.slice(0, -4));
  return links;
}

// ── network assembly ─────────────────────────────────────────────
interface Edge {
  vessel: string;
  a: string;
  b: string;
  g: number;
  first: boolean;
}

function vesselEdges(cfg: Config, gOverride: Map<string, number>, dead: Set<string>): Edge[] {
  const edges: Edge[] = [];
  for (const v of FLOW_VESSELS) {
    const g = gOverride.get(v.id) ?? cfg.vesselG.get(v.id)!;
    if (!(g > 0)) continue;
    const push = (a: string, b: string, gg: number, first: boolean) => {
      if (dead.has(a) || dead.has(b)) return;
      edges.push({ vessel: v.id, a, b, g: gg, first });
    };
    if (cfg.midNeeded.has(v.id)) {
      const m = `${v.id}@mid`;
      push(v.from, m, 2 * g, true);
      push(m, v.to, 2 * g, false);
    } else {
      push(v.from, v.to, g, true);
    }
  }
  // undrawn anastomoses carry flow but are not reported as vessels (first = false)
  for (const l of cfg.hiddenLinks) {
    if (!dead.has(l.a) && !dead.has(l.b)) edges.push({ vessel: l.id, a: l.a, b: l.b, g: l.g, first: false });
  }
  return edges;
}

interface Assembled {
  sys: SymmetricSystem;
  idx: Map<string, number>;
  edges: Edge[];
}

function assemble(edges: Edge[], units: Unit[]): Assembled {
  const idx = new Map<string, number>();
  const add = (n: string) => {
    if (n !== FIXED && !idx.has(n)) idx.set(n, idx.size);
  };
  for (const e of edges) {
    add(e.a);
    add(e.b);
  }
  for (const u of units) if (idx.has(u.node)) add(u.node);
  const sys = new SymmetricSystem(idx.size);
  for (const e of edges) {
    if (e.a === FIXED) sys.addFixed(idx.get(e.b)!, e.g, NaN);
    else if (e.b === FIXED) sys.addFixed(idx.get(e.a)!, e.g, NaN);
    else sys.addEdge(idx.get(e.a)!, idx.get(e.b)!, e.g);
  }
  for (let i = 0; i < sys.n; i++) sys.addFixed(i, G_LEAK, P_OUT);
  return { sys, idx, edges };
}

/** (re)apply the arch boundary pressure — assemble() stamps NaN placeholders. */
function setArch(asm: Assembled, map: number) {
  const { sys, idx } = asm;
  sys.b.fill(0);
  for (let i = 0; i < sys.n; i++) sys.b[i] += G_LEAK * P_OUT;
  for (const e of asm.edges) {
    if (e.a === FIXED) sys.b[idx.get(e.b)!] += e.g * map;
    else if (e.b === FIXED) sys.b[idx.get(e.a)!] += e.g * map;
  }
}

function edgeFlows(asm: Assembled, p: Float64Array, map: number): Record<string, number> {
  const out: Record<string, number> = {};
  const P = (n: string) => (n === FIXED ? map : p[asm.idx.get(n)!]);
  for (const e of asm.edges) if (e.first) out[e.vessel] = e.g * (P(e.a) - P(e.b));
  return out;
}

const dpDesign = (u: Unit) => (u.distal ? DP_LINK_DISTAL : DP_LINK);

/** Baseline: impose each unit's demand as a sink, solve pressures, derive unit conductances. */
function calibrate(cfg: Config) {
  const edges = vesselEdges(cfg, new Map(), new Set());
  const reach = reachable(edges);
  cfg.units = cfg.units.filter((u) => reach.has(u.node));
  const asm = assemble(edges, cfg.units);
  setArch(asm, MAP_REF);
  const { sys, idx } = asm;
  for (const u of cfg.units) sys.addSource(idx.get(u.node)!, -u.baseFlow);
  const p = sys.solve();
  for (const u of cfg.units) {
    const pNode = p[idx.get(u.node)!];
    // link (arterioles, fixed design drop) in series with capillary/venous side
    const pBed = pNode - dpDesign(u);
    cfg.gLink.set(u.id, u.baseFlow / dpDesign(u));
    cfg.gTissue.set(u.id, u.baseFlow / Math.max(pBed - P_OUT, 5));
  }
  cfg.baselineFlow = edgeFlows(asm, p, MAP_REF);
  cfg.baselineCbf = cfg.units
    .filter((u) => BRAIN_CATEGORIES.has(REGION_BY_ID[bedRegion(u.bed)].category))
    .reduce((a, u) => a + u.baseFlow, 0);
}

const BED_REGION = new Map(BEDS.map((b) => [b.id, b.region]));
const bedRegion = (bed: string) => BED_REGION.get(bed)!;

function reachable(edges: Edge[]): Set<string> {
  const adj = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    let l = adj.get(a);
    if (!l) adj.set(a, (l = []));
    l.push(b);
  };
  for (const e of edges) {
    link(e.a, e.b);
    link(e.b, e.a);
  }
  const seen = new Set<string>([FIXED]);
  const stack = [FIXED];
  while (stack.length) {
    const n = stack.pop()!;
    for (const m of adj.get(n) ?? []) {
      if (!seen.has(m)) {
        seen.add(m);
        stack.push(m);
      }
    }
  }
  return seen;
}

/** unit conductance at dilation d (distal pial links dilate less) */
function unitG(cfg: Config, u: Unit, d: number): number {
  const gl = cfg.gLink.get(u.id)! * (u.distal ? Math.sqrt(d) : d);
  const gt = cfg.gTissue.get(u.id)! * d;
  return (gl * gt) / (gl + gt);
}

function stenosedG(v: Vessel, g0: number, severity: number, radiusScale: number): number {
  const rs = v.r * radiusScale * (1 - severity);
  const gSten = (K_PHYSICAL * (v.n ?? 1) * rs ** 4) / STENOSIS_LEN;
  return 1 / (1 / g0 + 1 / gSten);
}

// ── public API ───────────────────────────────────────────────────
const resultCache = new Map<string, HemoResult>();

export function hemoKey(input: HemoInput): string {
  const occ = input.occlusions
    .filter((o) => !o.branch)
    .sort((a, b) => a.vessel.localeCompare(b.vessel))
    .map((o) => `${o.vessel}:${o.severity}`)
    .join(',');
  return `${occ}|${[...input.variants].sort().join(',')}|${input.map}|${input.collateral}`;
}

/** Units of the current configuration (for tissue-state bookkeeping). */
export function getUnits(variants: string[], collateral: CollateralGrade): Unit[] {
  return buildConfig(variants, collateral).units;
}

export function simulateHemodynamics(input: HemoInput): HemoResult {
  const key = hemoKey(input);
  const hit = resultCache.get(key);
  if (hit) return hit;

  const cfg = buildConfig(input.variants, input.collateral);
  const { scale } = variantOverrides(input.variants);
  const gOverride = new Map<string, number>();
  const dead = new Set<string>();
  for (const o of input.occlusions) {
    if (o.branch) continue;
    const g0 = cfg.vesselG.get(o.vessel);
    const v = VESSEL_BY_ID[o.vessel];
    if (g0 === undefined || !v) continue;
    if (o.severity >= 1) {
      gOverride.set(o.vessel, 0);
      if (cfg.midNeeded.has(o.vessel)) dead.add(`${o.vessel}@mid`);
      if (v.occludesDistalJunction) dead.add(v.to);
    } else if (g0 > 0 && v.kind !== 'collateral') {
      gOverride.set(o.vessel, stenosedG(v, g0, o.severity, scale.get(v.id) ?? 1));
    }
  }
  const edges = vesselEdges(cfg, gOverride, dead);
  const pialFactor = pialPressureFactor(input.map);
  if (pialFactor !== 1) for (const e of edges) if (e.vessel.startsWith('pial:')) e.g *= pialFactor;
  const live = cfg.units.filter((u) => !dead.has(u.node));
  const asm = assemble(edges, live);
  const base = Float64Array.from(asm.sys.a);
  const { idx } = asm;

  const dil = new Map<string, number>();
  for (const u of live) dil.set(u.id, 1);
  const unitFlow: Record<string, number> = {};
  let p: Float64Array = new Float64Array(0);
  let iterations = 0;
  for (let it = 0; it < 40; it++) {
    iterations = it + 1;
    asm.sys.a.set(base);
    setArch(asm, input.map);
    for (const u of live) {
      const i = idx.get(u.node);
      if (i === undefined) continue;
      asm.sys.addFixed(i, unitG(cfg, u, dil.get(u.id)!), P_OUT);
    }
    p = asm.sys.solve();
    let maxChange = 0;
    for (const u of live) {
      const i = idx.get(u.node);
      const d = dil.get(u.id)!;
      const f = i === undefined ? 0 : Math.max(0, unitG(cfg, u, d) * (p[i] - P_OUT));
      unitFlow[u.id] = f;
      const rel = f / u.baseFlow;
      const target = rel > 1e-6 ? d * Math.pow(1 / rel, 0.7) : D_MAX;
      const nd = Math.min(D_MAX, Math.max(D_MIN, target));
      maxChange = Math.max(maxChange, Math.abs(nd - d) / d);
      dil.set(u.id, nd);
    }
    if (maxChange < 0.002) break;
  }

  const vesselFlow = edgeFlows(asm, p, input.map);
  for (const v of FLOW_VESSELS) if (!(v.id in vesselFlow)) vesselFlow[v.id] = 0;
  const vesselPressure: Record<string, number> = {};
  for (const v of FLOW_VESSELS) {
    const i = idx.get(v.to);
    vesselPressure[v.id] = v.to === FIXED ? input.map : i === undefined ? P_OUT : p[i];
  }
  const unitRel: Record<string, number> = {};
  const bedAcc = new Map<string, [number, number]>();
  for (const u of cfg.units) {
    const rel = Math.min((unitFlow[u.id] ?? 0) / u.baseFlow, 2);
    unitRel[u.id] = rel;
    const acc = bedAcc.get(u.bed) ?? [0, 0];
    acc[0] += rel * u.frac;
    acc[1] += u.frac;
    bedAcc.set(u.bed, acc);
  }
  const bedRel: Record<string, number> = {};
  for (const b of BEDS) {
    const acc = bedAcc.get(b.id);
    bedRel[b.id] = acc ? acc[0] / acc[1] : 1;
  }
  const reversed: string[] = [];
  for (const v of FLOW_VESSELS) {
    const b0 = cfg.baselineFlow[v.id] ?? 0;
    const f = vesselFlow[v.id];
    const thr = Math.max(0.5, 0.05 * Math.abs(b0));
    if (Math.abs(f) > thr && Math.abs(b0) > 0.5 && Math.sign(f) !== Math.sign(b0)) reversed.push(v.id);
  }
  const totalCbf = cfg.units
    .filter((u) => BRAIN_CATEGORIES.has(REGION_BY_ID[bedRegion(u.bed)].category))
    .reduce((a, u) => a + (unitFlow[u.id] ?? 0), 0);

  const result: HemoResult = {
    vesselFlow,
    baselineFlow: cfg.baselineFlow,
    unitRel,
    bedRel,
    vesselPressure,
    reversed,
    totalCbf,
    baselineCbf: cfg.baselineCbf,
    iterations,
  };
  if (resultCache.size > 300) resultCache.clear();
  resultCache.set(key, result);
  return result;
}
