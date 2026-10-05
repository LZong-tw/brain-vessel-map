/**
 * Details of the recanalisation treatment (contract shared by the engine and the UI).
 *
 * `SimInput.reperfusionH` stays the time at which flow returns; `SimInput.treatment` says how
 * and how well. Leaving it out means DEFAULT_TREATMENT, which reproduces the model before these
 * options existed: complete reperfusion (eTICI 3) that stays open, with no complications.
 */

import { VESSELS, VESSEL_BY_ID } from '../anatomy';
import type { Vessel } from '../anatomy';

export type TreatmentMethod = 'evt' | 'ivt' | 'bridging';

/** expanded TICI (eTICI) grade of the reperfusion achieved */
export type ReperfusionGrade = '0' | '1' | '2a' | '2b50' | '2b67' | '2c' | '3';

export const REPERFUSION_GRADES: ReperfusionGrade[] = ['0', '1', '2a', '2b50', '2b67', '2c', '3'];

export interface TreatmentOptions {
  method: TreatmentMethod;
  grade: ReperfusionGrade;
  /** hours after reperfusion at which the reopened artery closes again; null = it stays open */
  reocclusionAfterH: number | null;
  /** a downstream branch blocked by a fragment of the clot during treatment (null = none) */
  distalEmbolus: string | null;
  /** share of the reperfused territory whose microcirculation still does not reperfuse (0–0.5) */
  noReflow: number;
}

export const DEFAULT_TREATMENT: TreatmentOptions = {
  method: 'evt',
  grade: '3',
  reocclusionAfterH: null,
  distalEmbolus: null,
  noReflow: 0,
};

/**
 * Share of the occluded artery's downstream territory that is reperfused, by eTICI grade (the
 * middle of each grade's range: 0; 1 = past the clot but hardly any distal filling; 2a = 1–49 %;
 * 2b50 = 50–66 %; 2b67 = 67–89 %; 2c = 90–99 %; 3 = complete).
 */
export const GRADE_REPERFUSED: Record<ReperfusionGrade, number> = {
  '0': 0,
  '1': 0.05,
  '2a': 0.25,
  '2b50': 0.58,
  '2b67': 0.78,
  '2c': 0.95,
  '3': 1,
};

/** share of the territory that actually gets its flow back (grade, minus no-reflow) */
export const reperfusedFraction = (t: TreatmentOptions): number => GRADE_REPERFUSED[t.grade] * (1 - t.noReflow);

export const isDefaultTreatment = (t: TreatmentOptions | undefined): boolean =>
  !t ||
  (t.method === DEFAULT_TREATMENT.method &&
    t.grade === DEFAULT_TREATMENT.grade &&
    t.reocclusionAfterH === null &&
    t.distalEmbolus === null &&
    t.noReflow === 0);

/**
 * Branches downstream of an occluded artery that a clot fragment could block during treatment
 * (cortical/cerebellar branches and trunks; not perforators, collaterals or communicating
 * arteries), nearest first. Downstream means both the branches that arise from the artery and
 * the segments that continue it (the basilar artery is modelled as consecutive segments, so a
 * mid-basilar clot can embolise to the SCA and PCA); the walk stops at communicating arteries
 * and collaterals so that it never crosses into another circulation.
 */
export function downstreamBranches(vesselId: string, limit = Infinity): string[] {
  const start = VESSEL_BY_ID[vesselId];
  if (!start) return [];
  const next = (v: Vessel) => [...v.children, ...(CONTINUATIONS.get(v.to) ?? [])];
  const out: string[] = [];
  const queue = next(start);
  const seen = new Set<string>([vesselId]);
  while (queue.length && out.length < limit) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const v = VESSEL_BY_ID[id];
    if (!v || v.kind === 'communicating' || v.kind === 'collateral') continue;
    if ((v.kind === 'branch' || v.kind === 'trunk') && !v.visualOnly && !v.notOccludable) out.push(id);
    queue.push(...next(v));
  }
  return out;
}

/**
 * Ipsilateral ACA branches: the commonest new territory for emboli during thrombectomy of an
 * MCA occlusion (ACA 27.8% of new-territory infarcts in ESCAPE-NA1: Singh N et al. Stroke
 * 2023;54:1477–1483). An ICA-terminus clot reaches the ACA downstream anyway.
 */
const NEW_TERRITORY_BY_BASE: Record<string, string[]> = {
  mca_m1: ['aca_a2', 'aca_frontopolar', 'aca_callosomarginal', 'aca_pericallosal', 'aca_paracentral'],
  mca_m2_sup: ['aca_a2', 'aca_frontopolar', 'aca_callosomarginal', 'aca_pericallosal', 'aca_paracentral'],
  mca_m2_inf: ['aca_a2', 'aca_frontopolar', 'aca_callosomarginal', 'aca_pericallosal', 'aca_paracentral'],
};

/**
 * Branches of a previously unaffected territory that a clot fragment could reach while this
 * artery is treated (outside its own downstream tree, which downstreamBranches does not leave).
 */
export function newTerritoryBranches(vesselId: string): string[] {
  const v = VESSEL_BY_ID[vesselId];
  if (!v || v.side === 'm') return [];
  const down = new Set(downstreamBranches(vesselId));
  return (NEW_TERRITORY_BY_BASE[v.baseId] ?? [])
    .map((b) => `${b}_${v.side}`)
    .filter((id) => VESSEL_BY_ID[id] && !VESSEL_BY_ID[id].visualOnly && !VESSEL_BY_ID[id].notOccludable && !down.has(id));
}

/** every branch a fragment of this clot could block: downstream, then a new territory */
export const embolusTargets = (vesselId: string): string[] => [...downstreamBranches(vesselId), ...newTerritoryBranches(vesselId)];

/** vessels by the node they start from (a segment's end node → the segments that continue it) */
const CONTINUATIONS = new Map<string, string[]>();
for (const v of VESSELS) CONTINUATIONS.set(v.from, [...(CONTINUATIONS.get(v.from) ?? []), v.id]);
