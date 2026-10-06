/**
 * Recovery of function after stroke (see recoveryTypes.ts): why the deficit is first worse than
 * the dead tissue, and later better.
 *
 *   • Temporary dysfunction (`extraDys`) — tissue that is alive but silent:
 *       – perilesional oedema: once the blood–brain barrier opens (vasogenic oedema, from ~6–12 h),
 *         a rim of surviving tissue around the infarct stops working; the rim is proportional to
 *         the infarct in the bed and larger when the bed swells. It follows the vasogenic oedema of
 *         the oedema model (engine/edema.ts): peaks around days 2–5, resolves over ~1–3 weeks and is
 *         gone by ~1 month. After an artery has reopened it keeps (and can deepen) a deficit
 *         still present when blood returned, but does not bring back one that cleared then
 *         (simulate.ts heldReference, X2-9).
 *       – diaschisis: depressed function of intact but connected remote tissue (Feeney & Baron,
 *         Stroke 1986; 17:817–30). The cascade marks crossed cerebellar diaschisis beds; they get a
 *         mild depression that fades over weeks — kept below the symptom threshold, as crossed
 *         cerebellar diaschisis is usually clinically silent (the PET/SPECT change can last longer).
 *     In the first hours the penumbra already accounts for the silent-but-alive tissue, so none of
 *     this is added before 6 h.
 *   • Compensation — spared pathways taking over functions lost to dead tissue, by the redundancy
 *     of each function (anatomy/redundancy.ts) and by whether the lesion is one- or two-sided.
 *     Applied per symptom in clinical.aggregateSymptoms; summarised per region here. A limb
 *     weakness from where the corticospinal tract converges is taken over less once that tract is
 *     lost (Y1-1), an aphasia or a neglect less the less of the hemisphere's MCA cortex is left
 *     (redundancy.NETWORK_LOSS, Z2-6), a Wernicke aphasia less the less of Wernicke's area is left
 *     (redundancy.AREA_LOSS, W1-6), and a deficit of both sides at the ventral pons or the
 *     cerebral peduncles hardly at all (the bottleneck, whose site is named: Z2-10; graded by how
 *     much of both sides is lost there: W1-7). Time course:
 *     starts after the first day, fastest over the first weeks, mostly done by ~3 months, then
 *     slower to ~6 months with some later gains (time explains much of the improvement in the first
 *     ~10 weeks: Kwakkel et al., Stroke 2006; 37:2348–53; review: Langhorne et al., Lancet 2011;
 *     377:1693–702).
 *
 *   • Grading below the threshold: the brainstem's compact tracts and nuclei give their deficits
 *     in proportion to the share lost down to COMPACT_FROM, so they taper rather than switch
 *     (gradeFactor, Z2-8). Below the symptom threshold such a region is not a dead source of its
 *     functions, so it does not make another region's deficit a two-sided one (lesionSides, W1-0).
 *
 * Illustrative group-level behaviour, not a prognosis.
 * TODO(medical-review): every magnitude and time constant in this file.
 */

import { BED_BY_ID, REGIONS, REGION_BY_ID } from '../anatomy';
import type { DeficitRef, Region, Side } from '../anatomy';
import { LACUNE_DYSFUNCTION } from '../anatomy/lacunes';
import {
  AREA_LOSS,
  BOTTLENECK_FACTOR,
  BOTTLENECK_FULL,
  BOTTLENECK_REGIONS,
  BOTTLENECK_SHOWN,
  BOTTLENECK_SITE,
  CST_CONVERGENCE,
  CST_LOST_SHARE,
  MOTOR_TRACT_SYMPTOMS,
  NETWORK_CORTEX,
  NETWORK_LOSS,
  NO_BACKUP_KINDS,
  areaLossOf,
  networkLossOf,
  redundancyFor,
  type BottleneckSite,
  type Redundancy,
} from '../anatomy/redundancy';
import type { CascadeOutput } from './cascade';
import type { EdemaState } from './edemaTypes';
import { NO_RECOVERY, type RecoveryState, type SymptomRecovery } from './recoveryTypes';

export interface RecoveryBedInput {
  /** infarcted fraction (including secondary infarcts) */
  infarct: number;
  /** fraction still in the penumbra */
  penumbra: number;
}

export interface RecoveryInput {
  tH: number;
  beds: Record<string, RecoveryBedInput>;
  edema: EdemaState;
  cascade: CascadeOutput;
  /** regions hit by a lacune (small, but it knocks out most of a compact tract) */
  lacunes?: string[];
  /** fraction of each lacune that is infarcted at tH (lacunes can start at different times) */
  lacuneLoss?: Record<string, number>;
  /** share of its region's function each lacune silences once dead (simulate.lacuneShareOf, V2-3); left out, LACUNE_DYSFUNCTION */
  lacuneShare?: Record<string, number>;
  /** hours since each region became ischaemic, when that differs from tH (clinical.aggregateSymptoms; R6-6) */
  regionAgeH?: Record<string, number>;
  /**
   * each region's dysfunction at onset (simulate's regionAcute): how severe a limb weakness was at
   * first, for the corticospinal convergence sites (Y1-1). Left out, the infarct level stands in.
   */
  regionAcute?: Record<string, number>;
}

// ── temporary dysfunction ────────────────────────────────────────────
/** perilesional depression is added from here … */
const PERI_ONSET_H = 6;
/** … and reaches its full weight here (the oedema curve itself then sets the course) */
const PERI_FULL_H = 24;
/** silenced perilesional tissue per unit of infarct at full vasogenic oedema */
const PERI_RIM = 0.35;
/** extra silenced tissue per unit of swelling (fractional volume gain) of the infarct */
const PERI_SWELL = 0.7;
/** depth of remote (diaschisis) depression: keep it below the symptom threshold (0.25) */
const DIA_DEPTH = 0.2;
/** diaschisis builds over ~half a day and fades with this time constant (h) */
const DIA_RISE_H = 12;
const DIA_TAU_H = 240;
const NEGLIGIBLE = 1e-4;

// ── compensation ─────────────────────────────────────────────────────
/** compensation starts after the first day … */
const COMP_START_H = 24;
/** … most of it with this time constant (h, ~1 month; ~90 % of the plateau by 3 months) … */
const COMP_TAU_H = 720;
/** … the rest slowly (h, ~4 months), so gains continue to ~6 months and beyond */
const COMP_SLOW_TAU_H = 2880;
const COMP_SLOW_SHARE = 0.15;
/** functions that settle within ~1–2 weeks (gaze deviation, vertigo, nausea …) */
const COMP_FAST_TAU_H = 168;
/** a region counts as a dead source of its functions from this infarcted fraction (= symptom threshold) */
export const DEAD_THR = 0.25;
/**
 * The brainstem is made of compact tracts and nuclei: the corticospinal and corticobulbar fibres of
 * one side fill the basis pontis and the middle of the cerebral peduncle, and a cranial-nerve
 * nucleus is a few millimetres across, so an infarct there cuts a share of the fibres in proportion
 * to its size instead of sparing a region that still works around it (Z2-8). Its deficits are
 * graded continuously below the symptom threshold, down to this infarcted (or, while it regains its
 * function after a reopening, dysfunctional) share, rather than all switching on and off together
 * at the threshold (clinical.lesionSymptoms). Bilateral pontine infarcts leave severe deficits more
 * often than any other pontine pattern (150 patients: Kumral E et al. J Neurol 2002;249:1659–1670),
 * and a PCA occlusion beyond the posterior communicating artery can infarct the lateral midbrain
 * and cause a hemiparesis (Hommel M et al. Neurology 1990;40:1496–1499). The floor is the largest
 * share of a brainstem region that a neighbouring artery supplies in the model and that is meant to
 * stay silent, the edge of the region rather than its tract: the vertebral artery's 15 % of the
 * medial medulla (no hemiparesis with a Wallenberg syndrome, C7-F3) and the paramedian thalamic
 * artery's 15 % of the paramedian midbrain (no oculomotor palsy with a Percheron infarct, C9-F1).
 * It grades a region's own deficits only: whether a deficit is one- or two-sided still follows the
 * dead sources, from the symptom threshold (lesionSides, W1-0).
 * TODO(medical-review): 0.15
 */
export const COMPACT_FROM = 0.15;
/** a region of compact tracts and nuclei (COMPACT_FROM) */
export const isCompact = (r: Region) => r.category === 'brainstem';
/**
 * the level of consciousness is not a tract that a small infarct cuts in proportion: coma and
 * drowsiness keep their threshold (they follow the arousal network of both sides, C3-F2)
 */
const NO_TAPER = ['coma', 'somnolence'];
/**
 * A deficit of a compact region is graded below the symptom threshold (Z2-8): a one-sided one
 * without a higher threshold of its own (minLevel) or of a part of the region alone (wholeRegion),
 * but not the level of consciousness. The signs
 * of both sides together (bilateralOnly: anarthria, the bilateral dysphagia, the failure of
 * automatic breathing) keep the threshold on both sides: below it what is left of a small infarct
 * on each side is the one-sided picture (a dysarthria, a weakness of each side).
 */
export const tapers = (r: Region, d: DeficitRef) => isCompact(r) && !d.minLevel && !d.bilateralOnly && !d.wholeRegion && !NO_TAPER.includes(d.s);
/** a deficit below this continuous severity (1–3 scale, after compensation) is no longer noticeable */
export const NOTICEABLE = 0.35;
/** the severity factor a deficit has at the symptom threshold (see `gradeFactor`) */
const AT_THRESHOLD = 0.35 + (0.65 * DEAD_THR) / 0.8;
/**
 * How severe a deficit is, relative to its nominal severity, from a region affected to `level`:
 * about 0.55 at the symptom threshold, rising to 1 at 80 %. Graded below the threshold
 * (`tapered`, see `tapers`), it falls on linearly to 0 at COMPACT_FROM, so the deficits of a compact
 * region taper as it regains its function and a small infarct there leaves a deficit in proportion
 * to its size (Z2-8).
 */
export function gradeFactor(level: number, tapered = false): number {
  if (level >= DEAD_THR - 1e-6 || !tapered) return 0.35 + 0.65 * Math.min(1, level / 0.8);
  return AT_THRESHOLD * clamp01((level - COMPACT_FROM) / (DEAD_THR - COMPACT_FROM));
}
/** regions with less dead tissue than this get no compensation summary */
const SUMMARY_THR = 0.05;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (e0: number, e1: number, x: number) => {
  const u = clamp01((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};

/** the severity (1–3, not rounded) a deficit of nominal severity `sev` has from a region affected to `level`, as clinical.aggregateSymptoms grades it */
export const initialSeverity = (sev: number, level: number) => sev * (0.35 + 0.65 * Math.min(1, level / 0.8));

/**
 * A deficit of nominal severity `sev` from a region affected to `level` is severe (profound)
 * before compensation: as clinical.aggregateSymptoms grades it, it rounds to 3.
 */
export const isProfound = (sev: number, level: number) => Math.round(initialSeverity(sev, level)) >= 3;

/** Share of the eventual compensation reached `tH` hours after onset (0 until day 1). */
export function compensationProgress(tH: number, fast = false): number {
  const a = tH - COMP_START_H;
  if (!(a > 0)) return 0;
  if (fast) return 1 - Math.exp(-a / COMP_FAST_TAU_H);
  return (1 - COMP_SLOW_SHARE) * (1 - Math.exp(-a / COMP_TAU_H)) + COMP_SLOW_SHARE * (1 - Math.exp(-a / COMP_SLOW_TAU_H));
}

/** Remote (diaschisis) depression `a` hours after it began, relative to its depth (0–1). */
export function diaschisisCurve(a: number): number {
  if (!(a > 0)) return 0;
  return (1 - Math.exp(-a / DIA_RISE_H)) * Math.exp(-a / DIA_TAU_H);
}

/** Which hemispheric sides have dead tissue serving each symptom (a midline region counts for both). */
export interface LesionSides {
  bySymptom: Map<string, Set<Side>>;
  /**
   * … counting only bottleneck regions (ventral pons, cerebral peduncles): on each side, the
   * infarcted share of the most infarcted one (W1-7)
   */
  bottleneckBySymptom: Map<string, Partial<Record<Side, number>>>;
  /** … and where those bottleneck regions lie (Z2-10) */
  bottleneckSites: Map<string, Set<BottleneckSite>>;
  /** infarcted share of each hemisphere's MCA cortex, by volume (NETWORK_CORTEX, Z2-6) */
  cortexInfarct: Record<Side, number>;
  /** infarcted share of each region that an AREA_LOSS reads, by region id (Wernicke's area, W1-6) */
  areaInfarct: Record<string, number>;
}

/**
 * The dead sources of each symptom: regions infarcted from the symptom threshold (`thr`), and the
 * infarcted share of each hemisphere's MCA cortex. A deficit counts as two-sided when its pathway is
 * lost on both sides (W1-0):
 *   • a region of compact tracts and nuclei grades its own deficits below the threshold (Z2-8), but
 *     counts as a lesion of their pathway on its side only from it, as every other region: the
 *     posterior cerebral artery's fifth of a cerebral peduncle, or the vertebral artery's edge of
 *     the medial medulla that is meant to stay silent (C7-F3), leaves most of that side's tract;
 *   • a deficit that is a passing effect on a neighbouring pathway (Redundancy.passing: the mild
 *     weakness of an inferolateral thalamic infarct) is not a lesion of that pathway;
 *   • a lesion of a motor pathway lies on the side of the hemisphere whose tract it cuts: it takes
 *     away that hemisphere's tract before its fibres part for the two sides of the body, both the
 *     main pathway of the other side and the backup of its own side (how a lesion of both
 *     hemispheres leaves a face weakness of both sides that hardly recovers);
 *   • a lateral medullary infarct, whose facial weakness is on its own side (MOTOR_TRACT_SYMPTOMS,
 *     the only motor deficit a source gives on its own side), is no lesion of a pathway at all
 *     (V2-0, U3-13): it cuts only those of the other hemisphere's corticobulbar fibres to that face
 *     that loop down into the medulla after crossing, while most cross in the pons at the level of
 *     the facial nucleus (Urban PP et al. Brain 2001;124:1866–1876). Its central facial paresis was
 *     mild in all 8 of 33 patients who had it, and none kept it at discharge, suggesting that only
 *     part of the tract descends to the medulla (Kanbayashi T, Sonoo M. BMC Neurol 2021;21:214,
 *     PMID 34058995). So it makes neither the other face's weakness (W1-0) nor its own two-sided:
 *     beside a motor-cortex infarct of the same side, that face keeps the other hemisphere's fibres
 *     that cross in the pons, and recovers as it would alone.
 */
export function lesionSides(regionInf: Record<string, number>, thr = DEAD_THR): LesionSides {
  const bySymptom = new Map<string, Set<Side>>();
  const bottleneckBySymptom = new Map<string, Partial<Record<Side, number>>>();
  const bottleneckSites = new Map<string, Set<BottleneckSite>>();
  /** a source that cuts only part of one hemisphere's fibres, after they have crossed (the lateral medulla's facial weakness: V2-0, U3-13) */
  const partOfCrossedFibres = (r: Region, d: DeficitRef) => r.side !== 'm' && d.lat === 'ipsi' && MOTOR_TRACT_SYMPTOMS.includes(d.s);
  const sidesOf = (r: Region): Side[] => (r.side === 'm' ? ['r', 'l'] : [r.side]);
  for (const r of REGIONS) {
    const inf = regionInf[r.id] ?? 0;
    if (inf < thr) continue;
    const site = BOTTLENECK_REGIONS.includes(r.baseId) ? BOTTLENECK_SITE[r.baseId] : undefined;
    for (const d of r.deficits) {
      if (d.only && r.side !== d.only) continue;
      if (d.minLevel && inf < d.minLevel) continue;
      if ((d.redundancy ?? redundancyFor(d.s, r.baseId, r.side)).passing) continue;
      if (partOfCrossedFibres(r, d)) continue;
      let set = bySymptom.get(d.s);
      if (!set) bySymptom.set(d.s, (set = new Set()));
      for (const sd of sidesOf(r)) set.add(sd);
      if (site) {
        let lv = bottleneckBySymptom.get(d.s);
        if (!lv) bottleneckBySymptom.set(d.s, (lv = {}));
        for (const sd of sidesOf(r)) lv[sd] = Math.max(lv[sd] ?? 0, inf);
        let sites = bottleneckSites.get(d.s);
        if (!sites) bottleneckSites.set(d.s, (sites = new Set()));
        sites.add(site);
      }
    }
  }
  const cortexInfarct = { r: 0, l: 0 };
  for (const side of ['r', 'l'] as Side[]) {
    let v = 0;
    let w = 0;
    for (const b of NETWORK_CORTEX) {
      const reg = REGION_BY_ID[`${b}_${side}`];
      if (!reg) continue;
      v += (regionInf[reg.id] ?? 0) * reg.volume;
      w += reg.volume;
    }
    cortexInfarct[side] = w > 0 ? v / w : 0;
  }
  const areaInfarct: Record<string, number> = {};
  for (const a of Object.values(AREA_LOSS)) {
    const id = `${a.area}_${a.side}`;
    areaInfarct[id] = regionInf[id] ?? 0;
  }
  return { bySymptom, bottleneckBySymptom, bottleneckSites, cortexInfarct, areaInfarct };
}

/** The hemispheres whose pathway of `symptomId` is lost (LesionSides.bySymptom). */
export const lostSides = (lesions: LesionSides, symptomId: string): ReadonlySet<Side> => lesions.bySymptom.get(symptomId) ?? new Set();

/**
 * How much of its corticospinal tract a convergence site (CST_CONVERGENCE) has lost for a limb
 * weakness it gives (Y1-1), 0–1: by how much of the region is infarcted (from the symptom
 * threshold, 25 %, to half of it) and by how severe the weakness from it was at first
 * (`initialSev`, on the 1–3 scale before compensation: from between mild and moderate, 1.5, to
 * between moderate and severe, 2.5; a mild weakness recovers in proportion, about 70 %). 0 for any
 * other source, any other symptom, and a lacune (small: it spares part of the tract).
 */
export function corticospinalLoss(symptomId: string, regionBase: string, inf: number, initialSev: number, lacune = false): number {
  if (lacune || !CST_LOST_SHARE[symptomId] || !CST_CONVERGENCE.includes(regionBase)) return 0;
  return clamp01((inf - DEAD_THR) / DEAD_THR) * clamp01(initialSev - 1.5);
}

/**
 * How far the bottleneck acts on a symptom (0–1, W1-7): not at all until the bottleneck regions
 * giving it are infarcted beyond the symptom threshold on both sides, in full once the less
 * infarcted side reaches BOTTLENECK_FULL (the share at which the model names the classical locked-in
 * syndrome), linearly in between.
 */
export function bottleneckDepth(lesions: LesionSides, symptomId: string): number {
  const lv = lesions.bottleneckBySymptom.get(symptomId);
  if (lv?.r === undefined || lv.l === undefined) return 0;
  return clamp01((Math.min(lv.r, lv.l) - DEAD_THR) / (BOTTLENECK_FULL - DEAD_THR));
}

/**
 * Compensation of one symptom caused by `region` at `tH`: its redundancy, whether the pathway is
 * damaged on both sides, and the fraction of the deficit that spared pathways have taken over.
 * Only the part of the region's dysfunction that is dead tissue (`inf` / `level`) is compensated;
 * penumbra and oedema recover (or not) through the tissue and oedema models. A limb weakness from a
 * corticospinal convergence site that has lost its tract (`tractLoss`, corticospinalLoss) is taken
 * over less after a one-sided lesion (CST_LOST_SHARE, Y1-1).
 */
export function symptomCompensation(
  symptomId: string,
  region: Region,
  level: number,
  inf: number,
  lesions: LesionSides,
  tH: number,
  /** this source settles within ~1–2 weeks (DeficitRef.fast) */
  fast = false,
  /** the deficit from this source is severe (profound) before compensation (Redundancy.profound) */
  profound = false,
  /** this source's own redundancy, in place of the symptom's (DeficitRef.redundancy) */
  own?: Redundancy,
  /** how much of the corticospinal tract this source has lost (corticospinalLoss, Y1-1) */
  tractLoss = 0,
): SymptomRecovery {
  const red = own ?? redundancyFor(symptomId, region.baseId, region.side);
  const base = profound && red.profound ? red.profound : red;
  const lost = CST_LOST_SHARE[symptomId];
  let share = tractLoss > 0 && lost !== undefined && lost < base.uni ? { ...base, uni: base.uni - (base.uni - lost) * clamp01(tractLoss) } : base;
  // an aphasia or a neglect from the network's own cortex is taken over less the less of that
  // cortex is left (Z2-6)
  const net = NETWORK_LOSS[symptomId];
  const netLoss = net && NETWORK_CORTEX.includes(region.baseId) ? networkLossOf(symptomId, region.side, lesions.cortexInfarct[net.side]) : 0;
  if (netLoss > 0) {
    const fall = (x: number) => (x > net.lost ? x - (x - net.lost) * netLoss : x);
    share = { ...share, uni: fall(share.uni), bi: fall(share.bi) };
  }
  // a Wernicke aphasia is taken over less the more of Wernicke's area itself is lost (W1-6)
  const area = AREA_LOSS[symptomId];
  const areaLoss =
    area && NETWORK_CORTEX.includes(region.baseId) ? areaLossOf(symptomId, region.side, lesions.areaInfarct[`${area.area}_${area.side}`] ?? 0) : 0;
  if (areaLoss > 0) {
    const fall = (x: number) => (x > area.lost ? x - (x - area.lost) * areaLoss : x);
    share = { ...share, uni: fall(share.uni), bi: fall(share.bi) };
  }
  const bilateral = region.side === 'm' || lostSides(lesions, symptomId).size >= 2;
  // the bottleneck acts in proportion to how much of both sides is lost there, and is named once it
  // acts substantially (W1-7)
  const depth = bilateral ? bottleneckDepth(lesions, symptomId) : 0;
  const bottleneck = depth >= BOTTLENECK_SHOWN;
  let compensated = 0;
  if (red.kind !== 'exempt' && !NO_BACKUP_KINDS.has(red.kind) && level > 0) {
    const gain = bilateral ? share.bi * (1 - (1 - BOTTLENECK_FACTOR) * depth) : share.uni;
    compensated = gain * compensationProgress(tH, red.fast || fast) * clamp01(inf / level);
  }
  if (!bottleneck) return { kind: red.kind, compensated, bilateral, bottleneck };
  const sites = lesions.bottleneckSites.get(symptomId);
  return { kind: red.kind, compensated, bilateral, bottleneck, bottleneckSites: (['pons', 'midbrain'] as BottleneckSite[]).filter((x) => sites?.has(x)) };
}

/**
 * Temporary dysfunction and compensation at `tH`. Per-bed maps are sparse (read with `?? 0`).
 */
export function computeRecovery(input: RecoveryInput): RecoveryState {
  const { tH, beds, edema, cascade } = input;
  if (!(tH > 0)) return NO_RECOVERY;

  // ── temporary dysfunction of surviving tissue ──
  const extraDys: Record<string, number> = {};
  const diaschisisDys: Record<string, number> = {};
  const periWeight = smoothstep(PERI_ONSET_H, PERI_FULL_H, tH);
  if (tH > PERI_ONSET_H) {
    for (const [id, st] of Object.entries(beds)) {
      const inf = clamp01(st.infarct);
      const alive = Math.max(0, 1 - inf - clamp01(st.penumbra));
      if (alive <= NEGLIGIBLE) continue;
      let peri = 0;
      const vg = edema.vasogenic[id] ?? 0;
      if (inf > NEGLIGIBLE && vg > 0) {
        // how active the oedema of this bed's infarct is now (0–1), and how far it spreads
        const activity = clamp01(vg / inf);
        const swell = Math.max(0, edema.swelling[id] ?? 0) / inf;
        peri = Math.min(alive, inf * (PERI_RIM + PERI_SWELL * swell)) * activity * periWeight;
      }
      let dia = 0;
      const remote = (cascade.bedEffects[id] ?? []).find((e) => e.kind === 'diaschisis' && e.onsetH <= tH && tH < (e.endH ?? Infinity));
      if (remote) dia = (alive - peri) * DIA_DEPTH * diaschisisCurve(tH - remote.onsetH);
      if (peri + dia > NEGLIGIBLE) extraDys[id] = peri + dia;
      if (dia > NEGLIGIBLE) diaschisisDys[id] = dia;
    }
  }

  // ── compensation, summarised per region ──
  const progress = compensationProgress(tH);
  const compensated: Record<string, number> = {};
  if (progress > 0) {
    const regionInf: Record<string, number> = {};
    for (const r of REGIONS) {
      let v = 0;
      let w = 0;
      for (const bid of r.beds) {
        const vol = BED_BY_ID[bid]?.volume || 1;
        v += (beds[bid]?.infarct ?? 0) * vol;
        w += vol;
      }
      regionInf[r.id] = w > 0 ? v / w : 0;
    }
    // a lacune is small but knocks out most of its tract (as in simulate)
    for (const rid of input.lacunes ?? [])
      regionInf[rid] = Math.max(regionInf[rid] ?? 0, (input.lacuneShare?.[rid] ?? LACUNE_DYSFUNCTION) * (input.lacuneLoss?.[rid] ?? 0));
    const lesions = lesionSides(regionInf);
    for (const r of REGIONS) {
      const inf = regionInf[r.id] ?? 0;
      if (inf < SUMMARY_THR) continue;
      let sum = 0;
      let weight = 0;
      for (const d of r.deficits) {
        if (d.only && r.side !== d.only) continue;
        if (d.bilateralOnly && lostSides(lesions, d.s).size < 2) continue;
        if (d.minLevel && inf < d.minLevel) continue;
        const early = Math.max(input.regionAcute?.[r.id] ?? 0, inf);
        const tract = corticospinalLoss(d.s, r.baseId, inf, initialSeverity(d.sev ?? 2, early), input.lacunes?.includes(r.id));
        const c = symptomCompensation(d.s, r, inf, inf, lesions, input.regionAgeH?.[r.id] ?? tH, d.fast, isProfound(d.sev ?? 2, inf), d.redundancy, tract);
        if (c.kind === 'exempt') continue;
        const w = d.sev ?? 2;
        sum += c.compensated * w;
        weight += w;
      }
      if (weight > 0 && sum > 0) compensated[r.id] = sum / weight;
    }
  }

  return { extraDys, diaschisisDys, compensated, progress };
}
