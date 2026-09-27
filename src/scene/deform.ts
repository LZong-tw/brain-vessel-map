/**
 * Swelling / oedema deformation of the brain meshes.
 *
 * Every mesh keeps its template positions; whenever the oedema state (or the display
 * multiplier) changes, only the meshes whose inputs changed are rebuilt from them:
 *
 *  1. Swelling — each vertex moves along a smoothed normal by the surface displacement that
 *     its bed's volume change implies (outward when swollen, inward when shrunk). The
 *     displacement is diffused over the surface first, so neighbouring beds blend into one
 *     continuous bulge or dent: no steps and, as vertices are shared, no cracks.
 *  2. Midline shift — supratentorial structures are pushed across the midline away from the
 *     swollen hemisphere: fully at the midline and in the deep structures (septum, ventricles,
 *     thalami), fading towards the skull (the lateral convexity cannot move) and above the
 *     free edge of the rigid falx (subfalcine herniation).
 *  3. Ventricles — shrink (compressed, mostly on the swollen side) or enlarge (hydrocephalus,
 *     ex-vacuo dilatation) about their own axis, then follow the midline shift.
 *
 * The template itself is untouched, so going back in time restores the original shape exactly.
 */

import type { BufferAttribute } from 'three';
import type { Side } from '../anatomy/types';
import type { EdemaState } from '../engine/edemaTypes';
import type { BrainData, MeshData } from './brainData';
import { SCALE } from './coords';

export interface DeformInput {
  edema: EdemaState;
  /** display multiplier: 1 = true scale, > 1 exaggerated for teaching */
  exaggeration: number;
}

/**
 * Depth (mm) of tissue under a cortical / cerebellar surface whose volume change shows up as
 * movement of that surface (the skull and falx keep it from expanding sideways): +15 % over
 * 20 mm of cortex and white matter ≈ 3 mm outward. Shrinkage uses a thinner slab because much
 * of the lost volume is taken up by the ventricles enlarging ex vacuo (shown separately).
 */
const SLAB_MM: Partial<Record<MeshData['kind'], { out: number; in: number }>> = {
  cortex: { out: 20, in: 10 },
  cerebellum: { out: 15, in: 8 },
};
/**
 * Limits on what is displayed (after exaggeration), so surfaces do not fold: true values up to
 * the knee, then easing towards the maximum. The midline-shift profile below stays fold-free
 * up to about 30 mm (its steepest lateral slope is 0.86 × shift / SHIFT_SIGMA_OTHER).
 */
const OUT_KNEE_MM = 8;
const OUT_MAX_MM = 18;
const IN_KNEE_MM = 5;
const IN_MAX_MM = 9;
const SHIFT_KNEE_MM = 14;
const SHIFT_MAX_MM = 22;
/** width (1 sd, mm) over which the displacement blends across bed borders */
const BLEND_MM = 4;
/**
 * width (1 sd, mm) over which the normals are averaged into the displacement direction: wider
 * than a gyrus, so gyri move as a whole instead of folding into each other at several mm
 */
const NORMAL_BLEND_MM = 8;
/** midline-shift fall-off (1/e distance from the midline, mm) on the swollen / the other side */
const SHIFT_SIGMA_SWOLLEN = 38;
const SHIFT_SIGMA_OTHER = 28;

/**
 * Outward surface displacement (mm) of tissue whose volume changes by the fraction `swelling`:
 * slab model (only the outer surface moves) when `slabMm` is given, otherwise a closed structure
 * that grows or shrinks like a sphere of radius `radiusMm`.
 */
export function swellingToMm(swelling: number, slabMm: { out: number; in: number } | undefined, radiusMm: number): number {
  const s = Math.max(-0.7, Math.min(1, swelling));
  if (slabMm) return (s >= 0 ? slabMm.out : slabMm.in) * s;
  return radiusMm * (Math.cbrt(1 + s) - 1);
}

/** `x` up to `knee`, then easing smoothly towards `max` (for x ≥ 0) */
const softKnee = (x: number, knee: number, max: number) => (x <= knee ? x : knee + (max - knee) * Math.tanh((x - knee) / (max - knee)));
/** displayed surface displacement (mm) */
const softLimit = (mm: number) => (mm >= 0 ? softKnee(mm, OUT_KNEE_MM, OUT_MAX_MM) : -softKnee(-mm, IN_KNEE_MM, IN_MAX_MM));

const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// ───────────────────────── per-mesh preparation (lazy, once) ─────────────────────────

interface Prep {
  base: Float32Array;
  baseNormal: Float32Array;
  /** vertex adjacency in CSR form (each edge listed once per adjacent triangle) */
  start: Int32Array;
  nbr: Int32Array;
  /** mean edge length (mm) */
  edgeMm: number;
  /** unit displacement direction per vertex (built on first use: only swelling needs it) */
  dir: Float32Array | null;
  /** radius (mm) of a sphere with the mesh's volume */
  radiusMm: number;
  /** smoothing iterations for the displacement field */
  iters: number;
  /** ventricles: smoothed "axis" point per vertex that the wall scales about */
  centre: Float32Array | null;
  /** ventricles: 1 = fourth ventricle (posterior fossa, does not follow the supratentorial shift) */
  infra: Uint8Array | null;
}

const preps = new WeakMap<MeshData, Prep>();
const bedLists = new WeakMap<MeshData, Int32Array>();
/** parameters last applied to each mesh (absent = template shape) */
const applied = new WeakMap<MeshData, Float64Array>();

function bedList(m: MeshData): Int32Array {
  let l = bedLists.get(m);
  if (!l) {
    const seen = new Set<number>();
    if (m.bed) for (let i = 0; i < m.bed.length; i++) if (m.bed[i] >= 0) seen.add(m.bed[i]);
    l = Int32Array.from([...seen].sort((a, b) => a - b));
    bedLists.set(m, l);
  }
  return l;
}

/**
 * Jacobi smoothing of a per-vertex scalar (stride 1) or vector (stride 3) field: each step mixes
 * a vertex's value (weight `keep`) with the mean of its neighbours.
 */
function smoothField(src: Float32Array, stride: 1 | 3, start: Int32Array, nbr: Int32Array, iters: number, keep = 0.5): Float32Array {
  const n = start.length - 1;
  let a = src.slice();
  let b = new Float32Array(src.length);
  for (let it = 0; it < iters; it++) {
    for (let i = 0; i < n; i++) {
      const s0 = start[i];
      const s1 = start[i + 1];
      const w = s1 > s0 ? (1 - keep) / (s1 - s0) : 0;
      const own = s1 > s0 ? keep : 1;
      if (stride === 1) {
        let sum = 0;
        for (let j = s0; j < s1; j++) sum += a[nbr[j]];
        b[i] = own * a[i] + w * sum;
      } else {
        let sx = 0;
        let sy = 0;
        let sz = 0;
        for (let j = s0; j < s1; j++) {
          const v = nbr[j] * 3;
          sx += a[v];
          sy += a[v + 1];
          sz += a[v + 2];
        }
        b[i * 3] = own * a[i * 3] + w * sx;
        b[i * 3 + 1] = own * a[i * 3 + 1] + w * sy;
        b[i * 3 + 2] = own * a[i * 3 + 2] + w * sz;
      }
    }
    const t = a;
    a = b;
    b = t;
  }
  return a;
}

/** Area-weighted vertex normals (what BufferGeometry.computeVertexNormals does, on plain arrays). */
function vertexNormals(pos: Float32Array, index: ArrayLike<number>, out: Float32Array) {
  out.fill(0);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3;
    const b = index[t + 1] * 3;
    const c = index[t + 2] * 3;
    const e1x = pos[b] - pos[a];
    const e1y = pos[b + 1] - pos[a + 1];
    const e1z = pos[b + 2] - pos[a + 2];
    const e2x = pos[c] - pos[a];
    const e2y = pos[c + 1] - pos[a + 1];
    const e2z = pos[c + 2] - pos[a + 2];
    const nx = e1y * e2z - e1z * e2y;
    const ny = e1z * e2x - e1x * e2z;
    const nz = e1x * e2y - e1y * e2x;
    out[a] += nx;
    out[a + 1] += ny;
    out[a + 2] += nz;
    out[b] += nx;
    out[b + 1] += ny;
    out[b + 2] += nz;
    out[c] += nx;
    out[c + 1] += ny;
    out[c + 2] += nz;
  }
  for (let i = 0; i < out.length; i += 3) {
    const l = Math.hypot(out[i], out[i + 1], out[i + 2]) || 1;
    out[i] /= l;
    out[i + 1] /= l;
    out[i + 2] /= l;
  }
}

/**
 * iterations of smoothField whose kernel spreads about `sigmaMm` (1 sd per axis) on a mesh with
 * this mean edge length: every step adds (1 − keep) · edge² of variance over the two surface axes
 */
const itersFor = (sigmaMm: number, edgeMm: number, keep = 0.5) =>
  clamp(Math.round((2 * (sigmaMm / edgeMm) ** 2) / (1 - keep)), 2, 80);

function prepare(m: MeshData): Prep {
  const cached = preps.get(m);
  if (cached) return cached;
  const g = m.geometry;
  const pos = g.getAttribute('position') as BufferAttribute;
  const base = (pos.array as Float32Array).slice();
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const baseNormal = (g.getAttribute('normal').array as Float32Array).slice();
  const n = pos.count;
  const index = g.getIndex()!.array;

  // adjacency (CSR), mean edge length and enclosed volume in one pass over the triangles
  const deg = new Int32Array(n + 1);
  let edgeSum = 0;
  let vol = 0;
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t];
    const b = index[t + 1];
    const c = index[t + 2];
    deg[a] += 2;
    deg[b] += 2;
    deg[c] += 2;
    const ax = base[a * 3], ay = base[a * 3 + 1], az = base[a * 3 + 2];
    const bx = base[b * 3], by = base[b * 3 + 1], bz = base[b * 3 + 2];
    const cx = base[c * 3], cy = base[c * 3 + 1], cz = base[c * 3 + 2];
    edgeSum += Math.hypot(ax - bx, ay - by, az - bz);
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  const start = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
  const fill = start.slice(0, n);
  const nbr = new Int32Array(start[n]);
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t];
    const b = index[t + 1];
    const c = index[t + 2];
    nbr[fill[a]++] = b;
    nbr[fill[a]++] = c;
    nbr[fill[b]++] = c;
    nbr[fill[b]++] = a;
    nbr[fill[c]++] = a;
    nbr[fill[c]++] = b;
  }
  const edgeMm = edgeSum / Math.max(1, index.length / 3) / SCALE;
  const radiusMm = Math.cbrt((3 * Math.abs(vol)) / (4 * Math.PI)) / SCALE;

  let centre: Float32Array | null = null;
  let infra: Uint8Array | null = null;
  if (m.kind === 'ventricle') {
    // heavy smoothing shrinks each ventricle towards its own axis; the wall scales about that
    centre = smoothField(base, 3, start, nbr, 40);
    infra = fourthVentricle(base, start, nbr);
  }
  const prep: Prep = { base, baseNormal, start, nbr, edgeMm, dir: null, radiusMm, iters: itersFor(BLEND_MM, edgeMm, 0), centre, infra };
  preps.set(m, prep);
  return prep;
}

/** displacement direction: the normal averaged over the neighbourhood */
function directions(p: Prep): Float32Array {
  if (p.dir) return p.dir;
  // plain neighbour means (keep = 0) spread twice as fast per step as half-weighted ones
  const dir = smoothField(p.baseNormal, 3, p.start, p.nbr, itersFor(NORMAL_BLEND_MM, p.edgeMm, 0), 0);
  for (let i = 0; i < dir.length; i += 3) {
    const l = Math.hypot(dir[i], dir[i + 1], dir[i + 2]) || 1;
    dir[i] /= l;
    dir[i + 1] /= l;
    dir[i + 2] /= l;
  }
  p.dir = dir;
  return dir;
}

/** Flags the connected pieces of the ventricle mesh that lie in the posterior fossa. */
function fourthVentricle(base: Float32Array, start: Int32Array, nbr: Int32Array): Uint8Array {
  const n = start.length - 1;
  const comp = new Int32Array(n).fill(-1);
  const out = new Uint8Array(n);
  const stack: number[] = [];
  for (let seed = 0; seed < n; seed++) {
    if (comp[seed] >= 0) continue;
    const members: number[] = [];
    comp[seed] = seed;
    stack.push(seed);
    let sy = 0;
    let sz = 0;
    while (stack.length) {
      const v = stack.pop()!;
      members.push(v);
      sy += base[v * 3 + 1];
      sz += base[v * 3 + 2];
      for (let j = start[v]; j < start[v + 1]; j++) {
        const w = nbr[j];
        if (comp[w] < 0) {
          comp[w] = seed;
          stack.push(w);
        }
      }
    }
    // centroid below the tentorium and behind the brainstem (MNI z < −25 mm, y < −30 mm)
    const zMni = sy / members.length / SCALE;
    const yMni = sz / members.length / SCALE;
    if (zMni < -25 && yMni < -30) for (const v of members) out[v] = 1;
  }
  return out;
}

// ───────────────────────── applying the deformation ─────────────────────────

interface Shift {
  /** displayed midline shift (mm) */
  mm: number;
  /** direction of the push along MNI x (+1 = towards the patient's right) */
  dir: number;
}

const SUPRA_DEEP_EXCLUDE = /^dentate_/;

function isSupratentorial(m: MeshData): boolean {
  if (m.kind === 'cortex' || m.kind === 'ventricle') return true;
  return m.kind === 'deep' && !SUPRA_DEEP_EXCLUDE.test(m.name);
}

/** 0–1 share of the midline shift at an (MNI mm) position */
function shiftWeight(xMni: number, yMni: number, zMni: number, dir: number): number {
  const u = xMni * dir; // > 0: on the side the midline is pushed towards
  const sigma = u >= 0 ? SHIFT_SIGMA_OTHER : SHIFT_SIGMA_SWOLLEN;
  const lateral = Math.exp(-((u / sigma) ** 2));
  // Nothing crosses the rigid falx: only tissue below its free edge herniates under it
  // (cingulate gyrus, corpus callosum, septum, deep nuclei). The free edge lies ~30 mm above
  // the AC–PC plane in front and sinks to the splenium behind, where the falx meets the
  // tentorium; the convexity at the vertex stays in place.
  const edge = 10 + 20 * smoothstep(-40, 10, yMni);
  const vertical = 1 - smoothstep(edge - 5, edge + 25, zMni);
  const back = 1 - 0.6 * smoothstep(-45, -80, yMni);
  return lateral * vertical * back;
}

function sameParams(a: Float64Array | undefined, b: Float64Array): boolean {
  if (!a) return b.every((x) => x === 0);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 1e-6) return false;
  return true;
}

/**
 * Deforms `data`'s meshes to show `input`. Meshes whose inputs did not change since the last
 * call are left alone. Returns true when any geometry changed (the caller should re-render).
 */
export function applyEdemaDeformation(data: BrainData, input: DeformInput): boolean {
  const { edema } = input;
  const k = Math.max(0, input.exaggeration);
  const side: Side | null = edema.shiftFrom;
  const shift: Shift | null =
    side && edema.midlineShiftMm > 0 ? { mm: softKnee(edema.midlineShiftMm * k, SHIFT_KNEE_MM, SHIFT_MAX_MM), dir: side === 'r' ? -1 : 1 } : null;
  const vc = clamp((edema.ventricleChange || 0) * k, -0.9, 2);

  let changed = false;
  for (const m of data.meshes) {
    const supra = isSupratentorial(m);
    const sh = supra && shift ? shift : null;
    let params: Float64Array;
    if (m.kind === 'ventricle') {
      params = Float64Array.of(vc, vc < 0 && side ? (side === 'r' ? -1 : 1) : 0, sh?.mm ?? 0, sh?.dir ?? 0);
    } else {
      const beds = bedList(m);
      params = new Float64Array(beds.length + 2);
      for (let i = 0; i < beds.length; i++) params[i] = (edema.swelling[data.beds[beds[i]]] ?? 0) * k;
      params[beds.length] = sh?.mm ?? 0;
      params[beds.length + 1] = sh?.dir ?? 0;
    }
    const prev = applied.get(m);
    if (sameParams(prev, params)) continue;
    changed = true;
    if (params.every((x) => x === 0)) {
      restore(m);
      applied.delete(m);
      continue;
    }
    const prep = prepare(m);
    if (m.kind === 'ventricle') deformVentricles(m, prep, vc, side, sh);
    else deformSurface(m, prep, data, edema, k, sh);
    finish(m);
    applied.set(m, params);
  }
  return changed;
}

function restore(m: MeshData) {
  const prep = preps.get(m);
  if (!prep) return;
  const g = m.geometry;
  (g.getAttribute('position').array as Float32Array).set(prep.base);
  (g.getAttribute('normal').array as Float32Array).set(prep.baseNormal);
  g.getAttribute('position').needsUpdate = true;
  g.getAttribute('normal').needsUpdate = true;
  g.computeBoundingSphere();
  g.computeBoundingBox();
}

function finish(m: MeshData) {
  const g = m.geometry;
  const pos = g.getAttribute('position') as BufferAttribute;
  const nrm = g.getAttribute('normal') as BufferAttribute;
  vertexNormals(pos.array as Float32Array, g.getIndex()!.array, nrm.array as Float32Array);
  pos.needsUpdate = true;
  nrm.needsUpdate = true;
  // raycasting (hover / click) culls with these
  g.computeBoundingSphere();
  g.computeBoundingBox();
}

function deformSurface(m: MeshData, prep: Prep, data: BrainData, edema: EdemaState, k: number, sh: Shift | null) {
  const { base } = prep;
  const n = base.length / 3;
  const out = m.geometry.getAttribute('position').array as Float32Array;

  // per-vertex displacement (mm), blended across bed borders
  let disp: Float32Array | null = null;
  if (m.bed) {
    const slab = SLAB_MM[m.kind];
    const perBed = new Float32Array(data.beds.length);
    let any = false;
    let first = NaN;
    let uniform = true;
    for (const b of bedList(m)) {
      const mm = k * swellingToMm(edema.swelling[data.beds[b]] ?? 0, slab, prep.radiusMm);
      perBed[b] = mm;
      if (mm !== 0) any = true;
      if (Number.isNaN(first)) first = mm;
      else if (mm !== first) uniform = false;
    }
    if (any) {
      disp = new Float32Array(n);
      let unlabelled = false;
      for (let i = 0; i < n; i++) {
        const b = m.bed[i];
        if (b < 0) unlabelled = true;
        disp[i] = b >= 0 ? perBed[b] : 0;
      }
      if (!uniform || unlabelled) disp = smoothField(disp, 1, prep.start, prep.nbr, prep.iters, 0);
    }
  }

  const cortex = m.kind === 'cortex';
  const dir = disp ? directions(prep) : null;
  for (let i = 0; i < n; i++) {
    const bx = base[i * 3];
    const by = base[i * 3 + 1];
    const bz = base[i * 3 + 2];
    let x = bx;
    let y = by;
    let z = bz;
    const xMni = -bx / SCALE;
    if (disp && dir) {
      const d = softLimit(disp[i]) * SCALE;
      let dx = dir[i * 3] * d;
      // the falx stops a swollen medial surface from bulging into the other hemisphere:
      // there the swelling is passed on as midline shift instead
      if (cortex && dx * bx < 0) dx *= smoothstep(2, 14, Math.abs(xMni));
      x += dx;
      y += dir[i * 3 + 1] * d;
      z += dir[i * 3 + 2] * d;
    }
    if (sh) {
      const w = shiftWeight(xMni, bz / SCALE, by / SCALE, sh.dir);
      x -= sh.dir * sh.mm * w * SCALE; // three.x = −MNI x
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
}

function deformVentricles(m: MeshData, prep: Prep, vc: number, side: Side | null, sh: Shift | null) {
  const { base, centre, infra } = prep;
  const n = base.length / 3;
  const out = m.geometry.getAttribute('position').array as Float32Array;
  const swollenDir = side === 'r' ? 1 : side === 'l' ? -1 : 0; // MNI x sign of the swollen side
  for (let i = 0; i < n; i++) {
    const bx = base[i * 3];
    const by = base[i * 3 + 1];
    const bz = base[i * 3 + 2];
    const xMni = -bx / SCALE;
    const post = infra![i] === 1;
    // compression is the swollen side's lateral ventricle being squeezed (the other one only
    // a little); enlargement (hydrocephalus, ex vacuo) is global
    let share = 1;
    if (vc < 0) {
      if (post) share = 0;
      else if (swollenDir) share = 0.25 + 0.75 * smoothstep(-6, 6, xMni * swollenDir);
    } else if (post) share = 0.5;
    // a ventricle is tube-like: its cross-section (not its length) carries the volume change
    const s = Math.sqrt(Math.max(0.04, 1 + vc * share));
    const cx = centre![i * 3];
    const cy = centre![i * 3 + 1];
    const cz = centre![i * 3 + 2];
    let x = cx + (bx - cx) * s;
    const y = cy + (by - cy) * s;
    const z = cz + (bz - cz) * s;
    if (sh && !post) x -= sh.dir * sh.mm * shiftWeight(xMni, bz / SCALE, by / SCALE, sh.dir) * SCALE;
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
}
