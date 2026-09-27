/**
 * Orchestrates one simulation: haemodynamics → tissue fate at time t → downstream cascade
 * → symptoms, NIHSS estimate and syndromes. Pure function of its input (memoised).
 */

import { BEDS, BED_BY_ID, REGIONS, REGION_BY_ID, VESSEL_BY_ID } from '../anatomy';
import type { Side } from '../anatomy';
import { computeCascade, type BedEffectKind, type CascadeOutput } from './cascade';
import { aggregateSymptoms, detectSyndromes, estimateNihss, type NihssResult, type SymptomItem, type SyndromeMatch } from './clinical';
import { getUnits, hemoKey, simulateHemodynamics, type HemoInput, type HemoResult, type Occlusion } from './hemodynamics';
import { computeEdema, type EdemaBedInput } from './edema';
import type { EdemaState } from './edemaTypes';
import { computeRecovery, type RecoveryBedInput } from './recovery';
import type { RecoveryState } from './recoveryTypes';
import { tissueParamsForBed } from './tissueParams';
import { LACUNE_DYSFUNCTION, LACUNE_ML, LACUNE_TARGET, canBeLacunar } from '../anatomy/lacunes';
import { NEURONS_PER_ML, PENUMBRA_REL, unitState, infarctFraction, type TissueState } from './tissue';

export interface SimInput extends HemoInput {
  tH: number;
  reperfusionH: number | null;
  decompression: boolean;
}

export interface BedTimeState {
  rel: number;
  /** volume fractions by tissue state */
  frac: Record<TissueState, number>;
  /** infarcted fraction including secondary infarcts */
  infarct: number;
  /** dysfunctional fraction (core + penumbra + compressed) */
  dys: number;
  effect: BedEffectKind | null;
}

export interface RegionTimeState {
  rel: number;
  infarct: number;
  dys: number;
  dominant: TissueState | BedEffectKind;
  effect: BedEffectKind | null;
}

export interface SimResult {
  input: SimInput;
  /** blood flow at the displayed time (after recanalisation if it has happened) */
  hemo: HemoResult;
  /** occlusions still in effect at the displayed time */
  activeOcclusions: Occlusion[];
  /** the occlusions have been reopened by the displayed time */
  recanalized: boolean;
  beds: Record<string, BedTimeState>;
  regions: Record<string, RegionTimeState>;
  symptoms: SymptomItem[];
  nihss: NihssResult;
  syndromes: SyndromeMatch[];
  cascade: CascadeOutput;
  volumes: { core: number; penumbra: number; finalInfarct: number; saved: number };
  neuronsLost: number;
  hydrocephalus: boolean;
  /** swelling / oedema at the displayed time (see engine/edemaTypes.ts) */
  edema: EdemaState;
  /** temporary dysfunction and compensation at the displayed time (see engine/recoveryTypes.ts) */
  recovery: RecoveryState;
}

const BRAIN = new Set(['cortex', 'deep', 'brainstem', 'cerebellum']);
const FINAL_H = 96;

const cascadeCache = new Map<string, CascadeOutput>();

function bedInfarctAt(units: ReturnType<typeof getUnits>, hemo: HemoResult, after: HemoResult, tH: number, reperf: number | null) {
  const out: Record<string, number> = {};
  for (const u of units) {
    const f = infarctFraction(hemo.unitRel[u.id] ?? 1, tH, reperf, after.unitRel[u.id] ?? 1, tissueParamsForBed(u.bed));
    out[u.bed] = (out[u.bed] ?? 0) + f * u.frac;
  }
  return out;
}

/** target regions of lacunar (single-branch) occlusions */
function lacuneRegions(occlusions: Occlusion[]): string[] {
  const out: string[] = [];
  for (const o of occlusions) {
    const v = VESSEL_BY_ID[o.vessel];
    if (!o.branch || !v || !canBeLacunar(v.baseId, v.n) || v.side === 'm') continue;
    const rid = `${LACUNE_TARGET[v.baseId]}_${v.side}`;
    if (REGION_BY_ID[rid] && !out.includes(rid)) out.push(rid);
  }
  return out.sort();
}

/** fraction of a region occupied by one lacune */
const lacuneFraction = (rid: string) => Math.min(1, LACUNE_ML / Math.max(REGION_BY_ID[rid].volume, LACUNE_ML));

function addLacunes(bedInfarct: Record<string, number>, lacunes: string[], loss: number): Record<string, number> {
  if (!lacunes.length) return bedInfarct;
  const out = { ...bedInfarct };
  for (const rid of lacunes) {
    const x = lacuneFraction(rid) * loss;
    for (const bid of REGION_BY_ID[rid].beds) out[bid] = (out[bid] ?? 0) + x * (1 - (out[bid] ?? 0));
  }
  return out;
}

function regionAgg(values: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of REGIONS) {
    let v = 0;
    let t = 0;
    for (const bid of r.beds) {
      const b = BED_BY_ID[bid];
      const w = b.volume > 0 ? b.volume : 1;
      v += (values[bid] ?? 0) * w;
      t += w;
    }
    out[r.id] = t > 0 ? v / t : 0;
  }
  return out;
}

const EFFECT_PRIORITY: BedEffectKind[] = ['secondary', 'compressed', 'degeneration', 'diaschisis'];

export function simulate(input: SimInput): SimResult {
  const hemoAcute = simulateHemodynamics(input);
  const units = getUnits(input.variants, input.collateral);
  const t = input.tH;
  const reperf = input.reperfusionH;
  // lacunes: one branch of a perforator bundle → a small infarct in its target structure
  const lacunes = lacuneRegions(input.occlusions);
  // thrombolysis / thrombectomy reopens complete (thrombo-embolic) occlusions; a stenosis and
  // a small-vessel (lacunar) occlusion stay
  const remaining = input.occlusions.filter((o) => o.severity < 1 || o.branch);
  const hemoAfter = reperf !== null ? simulateHemodynamics({ ...input, occlusions: remaining }) : hemoAcute;
  const recanalized = reperf !== null && t >= reperf;
  const hemo = recanalized ? hemoAfter : hemoAcute;

  // ── cascade (independent of t; cached) ──
  const ckey = `${hemoKey(input)}|${lacunes.join(',')}|${reperf}|${input.decompression}`;
  let cascade = cascadeCache.get(ckey);
  if (!cascade) {
    const bedFinal = addLacunes(bedInfarctAt(units, hemoAcute, hemoAfter, FINAL_H, reperf), lacunes, 1);
    const bedFinalUntreated =
      reperf === null ? bedFinal : addLacunes(bedInfarctAt(units, hemoAcute, hemoAcute, FINAL_H, null), lacunes, 1);
    const acute: Record<string, number> = {};
    for (const u of units) {
      // dysfunctional (core or penumbra) in the first hour
      if ((hemoAcute.unitRel[u.id] ?? 1) < PENUMBRA_REL) acute[u.bed] = (acute[u.bed] ?? 0) + u.frac;
    }
    cascade = computeCascade({
      reperfusionH: reperf,
      decompression: input.decompression,
      occlusions: input.occlusions,
      hemo: hemoAcute,
      bedFinal,
      bedFinalUntreated,
      bedEarly: addLacunes(bedInfarctAt(units, hemoAcute, hemoAfter, 14, reperf), lacunes, 1),
      regionAcute: regionAgg(acute),
    });
    if (cascadeCache.size > 200) cascadeCache.clear();
    cascadeCache.set(ckey, cascade);
  }

  // ── per-bed state at time t ──
  const beds: Record<string, BedTimeState> = {};
  for (const b of BEDS) {
    beds[b.id] = {
      rel: hemo.bedRel[b.id] ?? 1,
      frac: { normal: 0, oligemia: 0, penumbra: 0, core: 0, salvaged: 0 },
      infarct: 0,
      dys: 0,
      effect: null,
    };
  }
  for (const u of units) {
    const bs = beds[u.bed];
    const { f, rest } = unitState(hemoAcute.unitRel[u.id] ?? 1, t, reperf, hemoAfter.unitRel[u.id] ?? 1, tissueParamsForBed(u.bed));
    bs.frac.core += f * u.frac;
    bs.frac[rest] += (1 - f) * u.frac;
    bs.infarct += f * u.frac;
  }
  const lacuneLoss = infarctFraction(0, t, null);
  // regions whose damage comes from the lacune alone (before it is added)
  const lacuneOnly = lacunes.filter((rid) => {
    const r = REGION_BY_ID[rid];
    let d = 0;
    let w = 0;
    for (const bid of r.beds) {
      const bs = beds[bid];
      const vol = BED_BY_ID[bid].volume || 1;
      d += Math.max(bs.frac.core + bs.frac.penumbra, bs.infarct) * vol;
      w += vol;
    }
    return d / (w || 1) < 0.25;
  });
  for (const rid of lacunes) {
    const x = lacuneFraction(rid) * lacuneLoss;
    for (const bid of REGION_BY_ID[rid].beds) {
      const bs = beds[bid];
      for (const k of Object.keys(bs.frac) as TissueState[]) bs.frac[k] *= 1 - x;
      bs.frac.core += x;
      bs.infarct += x * (1 - bs.infarct);
    }
  }
  // dysfunction caused directly by the arterial occlusion(s), before secondary effects
  // (herniation etc.) are overlaid — syndromes describe the primary vascular pattern,
  // the secondary damage is reported as cascade events instead
  const primaryDys: Record<string, number> = {};
  // tissue state for the oedema model, captured before secondary infarcts overwrite it
  const edemaBeds: Record<string, EdemaBedInput> = {};
  for (const b of BEDS) {
    const bs = beds[b.id];
    const sum = Object.values(bs.frac).reduce((a, x) => a + x, 0);
    if (sum === 0) bs.frac.normal = 1;
    primaryDys[b.id] = bs.frac.core + bs.frac.penumbra;
    const effects = (cascade.bedEffects[b.id] ?? []).filter((e) => e.onsetH <= t && t < (e.endH ?? Infinity));
    const eff = EFFECT_PRIORITY.find((k) => effects.some((e) => e.kind === k)) ?? null;
    edemaBeds[b.id] = {
      infarct: bs.infarct,
      penumbra: bs.frac.penumbra,
      salvaged: bs.frac.salvaged,
      relAcute: hemoAcute.bedRel[b.id] ?? 1,
      relAfter: hemoAfter.bedRel[b.id] ?? 1,
      secondaryOnsetH: effects.find((e) => e.kind === 'secondary')?.onsetH ?? null,
    };
    bs.effect = eff;
    if (eff === 'secondary') {
      bs.infarct = 1;
      bs.frac = { normal: 0, oligemia: 0, penumbra: 0, core: 1, salvaged: 0 };
    }
  }
  const edema = computeEdema({ tH: t, reperfusionH: reperf, decompression: input.decompression, beds: edemaBeds, cascade });
  const recoveryBeds: Record<string, RecoveryBedInput> = {};
  for (const b of BEDS) recoveryBeds[b.id] = { infarct: beds[b.id].infarct, penumbra: beds[b.id].frac.penumbra };
  const recovery = computeRecovery({ tH: t, beds: recoveryBeds, edema, cascade, lacunes, lacuneLoss });
  for (const b of BEDS) {
    const bs = beds[b.id];
    bs.dys = Math.min(1, bs.frac.core + bs.frac.penumbra + (recovery.extraDys[b.id] ?? 0));
  }

  // ── per-region ──
  const dysMap: Record<string, number> = {};
  const infMap: Record<string, number> = {};
  const relMap: Record<string, number> = {};
  for (const b of BEDS) {
    dysMap[b.id] = beds[b.id].dys;
    infMap[b.id] = beds[b.id].infarct;
    relMap[b.id] = beds[b.id].rel;
  }
  const rDys = regionAgg(dysMap);
  const rPrim = regionAgg(primaryDys);
  const rInf = regionAgg(infMap);
  const rRel = regionAgg(relMap);
  // a lacune is small but sits in a compact fibre tract: it knocks out most of its function
  for (const rid of lacunes) {
    const level = LACUNE_DYSFUNCTION * lacuneLoss;
    rDys[rid] = Math.max(rDys[rid] ?? 0, level);
    rPrim[rid] = Math.max(rPrim[rid] ?? 0, level);
    rInf[rid] = Math.max(rInf[rid] ?? 0, level);
  }
  const regions: Record<string, RegionTimeState> = {};
  for (const r of REGIONS) {
    const acc: Record<string, number> = {};
    let effect: BedEffectKind | null = null;
    for (const bid of r.beds) {
      const bs = beds[bid];
      const w = BED_BY_ID[bid].volume || 1;
      for (const [k, v] of Object.entries(bs.frac)) acc[k] = (acc[k] ?? 0) + v * w;
      if (bs.effect && (!effect || EFFECT_PRIORITY.indexOf(bs.effect) < EFFECT_PRIORITY.indexOf(effect))) effect = bs.effect;
    }
    const order: TissueState[] = ['core', 'penumbra', 'salvaged', 'oligemia', 'normal'];
    const tot = Object.values(acc).reduce((a, x) => a + x, 0) || 1;
    let dominant: TissueState | BedEffectKind = 'normal';
    for (const k of order) {
      if ((acc[k] ?? 0) / tot >= (k === 'normal' ? 0 : 0.2)) {
        dominant = k;
        break;
      }
    }
    if (effect && (effect === 'secondary' || effect === 'compressed' || dominant === 'normal' || dominant === 'oligemia')) dominant = effect;
    regions[r.id] = { rel: rRel[r.id], infarct: rInf[r.id], dys: rDys[r.id], dominant, effect };
  }

  for (const rid of lacunes) {
    if (lacuneLoss >= 0.5 && regions[rid] && !regions[rid].effect) regions[rid].dominant = 'core';
  }

  // ── symptoms, NIHSS, syndromes ──
  const extra: SymptomItem[] = [];
  if (cascade.events.some((e) => e.id.startsWith('hod_')) && t >= 2160) {
    extra.push({ id: 'palatal_tremor', side: null, sev: 1, sources: [], delayed: true });
  }
  for (const e of cascade.events) {
    if (!e.symptoms || e.onsetH > t || t >= (e.endH ?? Infinity)) continue;
    for (const sy of e.symptoms) {
      const sides: (Side | null)[] = sy.side === 'both' ? ['r', 'l'] : [sy.side];
      for (const sd of sides) extra.push({ id: sy.id, side: sd, sev: sy.sev, sources: [], delayed: false });
    }
  }
  const symptoms = aggregateSymptoms(rDys, rInf, t, extra, lacuneOnly);
  const affected = REGIONS.filter((r) => rDys[r.id] >= 0.2 || rInf[r.id] >= 0.2).map((r) => r.id);
  const nihss = estimateNihss(symptoms, affected);

  const occl = new Set(input.occlusions.filter((o) => o.severity >= 1).map((o) => o.vessel));
  const rev = new Set(hemoAcute.reversed);
  const idOf = (base: string, side?: Side | 'm') => (side && side !== 'm' ? `${base}_${side}` : base);
  const syndromes = detectSyndromes({
    f: (base, side) => rPrim[`${base}_${side}`] ?? 0,
    has: (base, side, thr = 0.25) => (rPrim[`${base}_${side}`] ?? 0) >= thr,
    hasAny: (bases, side, thr = 0.25) => bases.some((b) => (rPrim[`${b}_${side}`] ?? 0) >= thr),
    both: (base, thr = 0.25) => (rPrim[`${base}_r`] ?? 0) >= thr && (rPrim[`${base}_l`] ?? 0) >= thr,
    occluded: (base, side) => occl.has(idOf(base, side)) || (!side && (occl.has(`${base}_r`) || occl.has(`${base}_l`))),
    reversed: (base, side) => rev.has(idOf(base, side)),
    border: (side) => {
      let border = 0;
      let total = 0;
      const kinds = new Set<string>();
      for (const b of BEDS) {
        if (!b.region.endsWith(`_${side}`)) continue;
        const reg = REGION_BY_ID[b.region];
        if (!BRAIN.has(reg.category)) continue;
        const v = primaryDys[b.id] * b.volume;
        total += v;
        if (b.terr.length === 2 && v > 0) {
          border += v;
          kinds.add(b.terr.join('|'));
        }
      }
      return { border, total, kinds: [...kinds] };
    },
    cortexCount: (side, thr = 0.2) =>
      REGIONS.filter((r) => r.side === side && r.category === 'cortex' && rPrim[r.id] >= thr).length,
    map: input.map,
  });

  // ── volumes ──
  let core = 0;
  let pen = 0;
  for (const b of BEDS) {
    if (!BRAIN.has(REGION_BY_ID[b.region].category)) continue;
    core += beds[b.id].infarct * b.volume;
    pen += beds[b.id].frac.penumbra * b.volume;
  }
  // everything that will eventually be dead, including secondary (herniation) infarcts
  const finalInfarct = cascade.volumes.withSecondary;
  return {
    input,
    hemo,
    activeOcclusions: recanalized ? remaining : input.occlusions,
    recanalized,
    beds,
    regions,
    symptoms,
    nihss,
    syndromes,
    cascade,
    volumes: { core, penumbra: pen, finalInfarct, saved: cascade.savedVolume },
    neuronsLost: core * NEURONS_PER_ML,
    hydrocephalus: cascade.hydrocephalusOnsetH !== null && t >= cascade.hydrocephalusOnsetH && (cascade.hydrocephalusEndH === null || t < cascade.hydrocephalusEndH),
    edema,
    recovery,
  };
}

/** Quick "what happens if this vessel is blocked?" preview (24 h, untreated). */
export function previewOcclusion(vessel: string, base: Omit<SimInput, 'tH' | 'reperfusionH' | 'decompression'>): SimResult {
  const occ = base.occlusions.filter((o) => o.vessel !== vessel).concat([{ vessel, severity: 1 }]);
  return simulate({ ...base, occlusions: occ, tH: 24, reperfusionH: null, decompression: false });
}

export const isOccludable = (id: string) => {
  const v = VESSEL_BY_ID[id];
  return !!v && !v.visualOnly && !v.notOccludable;
};
