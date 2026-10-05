/**
 * Recovery of function after stroke (see recoveryTypes.ts): why the deficit is first worse than
 * the dead tissue, and later better.
 *
 *   • Temporary dysfunction (`extraDys`) — tissue that is alive but silent:
 *       – perilesional oedema: once the blood–brain barrier opens (vasogenic oedema, from ~6–12 h),
 *         a rim of surviving tissue around the infarct stops working; the rim is proportional to
 *         the infarct in the bed and larger when the bed swells. It follows the vasogenic oedema of
 *         the oedema model (engine/edema.ts): peaks around days 2–5, resolves over ~1–3 weeks and is
 *         gone by ~1 month.
 *       – diaschisis: depressed function of intact but connected remote tissue (Feeney & Baron,
 *         Stroke 1986; 17:817–30). The cascade marks crossed cerebellar diaschisis beds; they get a
 *         mild depression that fades over weeks — kept below the symptom threshold, as crossed
 *         cerebellar diaschisis is usually clinically silent (the PET/SPECT change can last longer).
 *     In the first hours the penumbra already accounts for the silent-but-alive tissue, so none of
 *     this is added before 6 h.
 *   • Compensation — spared pathways taking over functions lost to dead tissue, by the redundancy
 *     of each function (anatomy/redundancy.ts) and by whether the lesion is one- or two-sided.
 *     Applied per symptom in clinical.aggregateSymptoms; summarised per region here. Time course:
 *     starts after the first day, fastest over the first weeks, mostly done by ~3 months, then
 *     slower to ~6 months with some later gains (time explains much of the improvement in the first
 *     ~10 weeks: Kwakkel et al., Stroke 2006; 37:2348–53; review: Langhorne et al., Lancet 2011;
 *     377:1693–702).
 *
 * Illustrative group-level behaviour, not a prognosis.
 * TODO(medical-review): every magnitude and time constant in this file.
 */

import { BED_BY_ID, REGIONS } from '../anatomy';
import type { Region, Side } from '../anatomy';
import { LACUNE_DYSFUNCTION } from '../anatomy/lacunes';
import { BOTTLENECK_FACTOR, BOTTLENECK_REGIONS, NO_BACKUP_KINDS, redundancyFor } from '../anatomy/redundancy';
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
/** regions with less dead tissue than this get no compensation summary */
const SUMMARY_THR = 0.05;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smoothstep = (e0: number, e1: number, x: number) => {
  const u = clamp01((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};

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
  /** … counting only bottleneck regions (ventral pons, cerebral peduncles) */
  bottleneckBySymptom: Map<string, Set<Side>>;
}

export function lesionSides(regionInf: Record<string, number>, thr = DEAD_THR): LesionSides {
  const bySymptom = new Map<string, Set<Side>>();
  const bottleneckBySymptom = new Map<string, Set<Side>>();
  const put = (m: Map<string, Set<Side>>, id: string, r: Region) => {
    let set = m.get(id);
    if (!set) m.set(id, (set = new Set()));
    if (r.side === 'm') {
      set.add('r');
      set.add('l');
    } else set.add(r.side);
  };
  for (const r of REGIONS) {
    if ((regionInf[r.id] ?? 0) < thr) continue;
    const bottleneck = BOTTLENECK_REGIONS.includes(r.baseId);
    for (const d of r.deficits) {
      if (d.only && r.side !== d.only) continue;
      if (d.minLevel && (regionInf[r.id] ?? 0) < d.minLevel) continue;
      put(bySymptom, d.s, r);
      if (bottleneck) put(bottleneckBySymptom, d.s, r);
    }
  }
  return { bySymptom, bottleneckBySymptom };
}

/**
 * Compensation of one symptom caused by `region` at `tH`: its redundancy, whether the pathway is
 * damaged on both sides, and the fraction of the deficit that spared pathways have taken over.
 * Only the part of the region's dysfunction that is dead tissue (`inf` / `level`) is compensated;
 * penumbra and oedema recover (or not) through the tissue and oedema models.
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
): SymptomRecovery {
  const red = redundancyFor(symptomId, region.baseId);
  const bilateral = region.side === 'm' || (lesions.bySymptom.get(symptomId)?.size ?? 0) >= 2;
  const bottleneck = bilateral && (lesions.bottleneckBySymptom.get(symptomId)?.size ?? 0) >= 2;
  let compensated = 0;
  if (red.kind !== 'exempt' && !NO_BACKUP_KINDS.has(red.kind) && level > 0) {
    const gain = bilateral ? red.bi * (bottleneck ? BOTTLENECK_FACTOR : 1) : red.uni;
    compensated = gain * compensationProgress(tH, red.fast || fast) * clamp01(inf / level);
  }
  return { kind: red.kind, compensated, bilateral, bottleneck };
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
      regionInf[rid] = Math.max(regionInf[rid] ?? 0, LACUNE_DYSFUNCTION * (input.lacuneLoss?.[rid] ?? 0));
    const lesions = lesionSides(regionInf);
    for (const r of REGIONS) {
      const inf = regionInf[r.id] ?? 0;
      if (inf < SUMMARY_THR) continue;
      let sum = 0;
      let weight = 0;
      for (const d of r.deficits) {
        if (d.only && r.side !== d.only) continue;
        if (d.bilateralOnly && (lesions.bySymptom.get(d.s)?.size ?? 0) < 2) continue;
        if (d.minLevel && inf < d.minLevel) continue;
        const c = symptomCompensation(d.s, r, inf, inf, lesions, tH, d.fast);
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
