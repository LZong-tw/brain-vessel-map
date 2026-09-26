/**
 * Embolus travel simulation.
 *
 * An embolus is carried by blood flow: at every bifurcation it follows one of the outgoing
 * branches with probability proportional to that branch's flow (so emboli favour the MCA,
 * which carries most of the carotid flow). It lodges in the first vessel whose lumen is
 * narrower than the embolus. Perforators are rarely entered by emboli (they leave at right
 * angles and are tiny), and a clot much wider than a side branch's mouth is usually swept
 * past it, so both are strongly down-weighted.
 */

import { VESSELS, VESSEL_BY_ID } from '../anatomy';
import type { HemoResult } from './hemodynamics';

export type EmbolusSource = 'heart' | 'carotid_r' | 'carotid_l' | 'vertebral_r' | 'vertebral_l';

export interface EmbolusStep {
  vessel: string;
  /** 1 = travelling from → to, -1 = against the nominal direction */
  dir: 1 | -1;
  /** fraction of the vessel travelled (1 = whole, 0.5 = up to the midpoint) */
  upto: number;
  /** starts at the vessel's midpoint (branch arising mid-segment) */
  fromMid?: boolean;
}

export interface EmbolusResult {
  steps: EmbolusStep[];
  lodged: string;
  /** true when the embolus ended outside the brain (arm, face) */
  systemic: boolean;
}

export const EMBOLUS_SIZES = [
  { id: 'large', mm: 4.2 },
  { id: 'medium', mm: 2.9 },
  { id: 'small', mm: 1.6 },
  { id: 'tiny', mm: 0.9 },
] as const;

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLOW = VESSELS.filter((v) => !v.visualOnly && v.kind !== 'collateral');
const byFrom = new Map<string, string[]>();
const byTo = new Map<string, string[]>();
for (const v of FLOW) {
  (byFrom.get(v.from) ?? byFrom.set(v.from, []).get(v.from)!).push(v.id);
  (byTo.get(v.to) ?? byTo.set(v.to, []).get(v.to)!).push(v.id);
}

const EXTRACRANIAL_END = /^(subclavian_dist|eca|eca_)/;

/**
 * Branch-angle preference: emboli tend to continue straight (ICA → MCA) rather than
 * turning sharply into the A1 or the communicating arteries.
 */
const BIAS: Record<string, number> = { aca_a1: 0.3, pcomm: 0.5, acomm: 0.5 };
const bias = (id: string) => {
  const v = VESSEL_BY_ID[id];
  return (BIAS[v.baseId] ?? 1) * (v.kind === 'perforator' ? 0.02 : 1);
};

function pick<T>(items: { item: T; w: number }[], rand: () => number): T | null {
  const total = items.reduce((a, x) => a + Math.max(0, x.w), 0);
  if (total <= 1e-9) return null;
  let r = rand() * total;
  for (const x of items) {
    r -= Math.max(0, x.w);
    if (r <= 0) return x.item;
  }
  return items[items.length - 1].item;
}

export function dropEmbolus(source: EmbolusSource, diameterMm: number, hemo: HemoResult, seed: number): EmbolusResult {
  const rand = rng(seed);
  const flow = (id: string) => hemo.vesselFlow[id] ?? 0;
  const steps: EmbolusStep[] = [];
  const fits = (id: string) => 2 * VESSEL_BY_ID[id].r * 1.05 >= diameterMm;
  // a clot much wider than a side branch's mouth is swept past it by the main stream
  const mouth = (id: string) => (2 * VESSEL_BY_ID[id].r < 0.6 * diameterMm ? 0.05 : 1);

  // candidate exits from a node: vessels carrying flow away from it
  const exits = (node: string, cameFrom: string | null) => {
    const out: { item: { vessel: string; dir: 1 | -1 }; w: number }[] = [];
    for (const id of byFrom.get(node) ?? []) {
      if (id === cameFrom) continue;
      const f = flow(id);
      if (f > 0.2) out.push({ item: { vessel: id, dir: 1 }, w: f * bias(id) * mouth(id) });
    }
    for (const id of byTo.get(node) ?? []) {
      if (id === cameFrom) continue;
      const f = flow(id);
      if (f < -0.2) out.push({ item: { vessel: id, dir: -1 }, w: -f * bias(id) * mouth(id) });
    }
    return out;
  };

  let current: { vessel: string; dir: 1 | -1 } | null;
  if (source === 'heart') {
    current = pick(exits('arch', null), rand);
  } else {
    const side = source.endsWith('_r') ? 'r' : 'l';
    current = { vessel: source.startsWith('carotid') ? `ica_cervical_${side}` : `va_extracranial_${side}`, dir: 1 };
  }
  let fromMid = false;
  for (let guard = 0; guard < 60 && current; guard++) {
    const v = VESSEL_BY_ID[current.vessel];
    if (!fits(v.id)) {
      steps.push({ ...current, upto: 0.5, fromMid });
      return { steps, lodged: v.id, systemic: false };
    }
    // branches leaving from the midpoint of this vessel (only when travelling forward)
    const midKids = current.dir === 1 ? FLOW.filter((c) => c.from === `${v.id}@mid` && flow(c.id) > 0.2) : [];
    if (midKids.length) {
      const through = Math.max(0, flow(v.id) - midKids.reduce((a, c) => a + flow(c.id), 0));
      const choice = pick(
        [
          { item: '__through', w: through },
          ...midKids.map((c) => ({ item: c.id, w: flow(c.id) * bias(c.id) * mouth(c.id) })),
        ],
        rand,
      );
      if (choice && choice !== '__through') {
        steps.push({ ...current, upto: 0.5, fromMid });
        current = { vessel: choice, dir: 1 };
        fromMid = true;
        continue;
      }
    }
    steps.push({ ...current, upto: 1, fromMid });
    fromMid = false;
    const node = current.dir === 1 ? v.to : v.from;
    const next = pick(exits(node, v.id), rand);
    if (!next) {
      return { steps, lodged: v.id, systemic: EXTRACRANIAL_END.test(v.id) };
    }
    current = next;
  }
  const last = steps[steps.length - 1];
  return { steps, lodged: last.vessel, systemic: EXTRACRANIAL_END.test(last.vessel) };
}
