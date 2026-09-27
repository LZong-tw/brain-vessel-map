/**
 * Lumped-parameter (0-D) cerebral blood-flow model.
 *
 * The arterial tree is an electrical-style resistor network:
 *   • each vessel segment is a Poiseuille conductance  G = K·n·r⁴ / L
 *   • leptomeningeal / extracranial anastomoses are small conductances scaled by the
 *     chosen collateral grade
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

interface Config {
  key: string;
  vesselG: Map<string, number>;
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
          id: `${bed.id}#${s.v}`,
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

export function variantOverrides(variants: string[]): { scale: Map<string, number>; overrides: Map<string, SupplyDef[]> } {
  const scale = new Map<string, number>();
  const overrides = new Map<string, SupplyDef[]>();
  for (const id of variants) {
    const v = VARIANT_BY_ID[id];
    if (!v) continue;
    for (const [vid, f] of Object.entries(v.vesselScale ?? {})) scale.set(vid, (scale.get(vid) ?? 1) * f);
    for (const [rid, sup] of Object.entries(v.supplyOverride ?? {})) overrides.set(rid, sup);
  }
  // absent PComm: the polar (tuberothalamic) artery then arises from the P1 perforators
  for (const s of ['r', 'l']) {
    if ((scale.get(`pcomm_${s}`) ?? 1) === 0 && !overrides.has(`thalamus_anterior_${s}`)) {
      overrides.set(`thalamus_anterior_${s}`, [{ v: `thalamoperforator_${s}`, share: 1 }]);
    }
  }
  return { scale, overrides };
}

function buildConfig(variants: string[], collateral: CollateralGrade): Config {
  const key = `${[...variants].sort().join(',')}|${collateral}`;
  const cached = configCache.get(key);
  if (cached) return cached;

  const { scale, overrides } = variantOverrides(variants);
  const units = buildUnits(overrides);

  const midNeeded = new Set<string>();
  for (const v of FLOW_VESSELS) {
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

  const cfg: Config = {
    key,
    vesselG,
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
