import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { VESSELS, VESSEL_BY_ID } from '../anatomy';
import type { Vessel } from '../anatomy';
import { parseBrain, type Manifest, type MeshData } from './brainData';
import { SCALE, toThree } from './coords';

/**
 * The vessels as the 3D view draws them, checked against the brain meshes it draws them on. Found
 * while checking the view after the ventricles were reported to show through the cortex: thin
 * surface arteries and the leptomeningeal collaterals kept sinking under the cortex and showed as
 * dashes.
 */

// ─────────────────────────── the drawn vessels ───────────────────────────
const drawn = (v: Vessel) => v.renderPath ?? v.path;
const dist = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const lengthOf = (p: number[][]) => p.slice(1).reduce((s, q, i) => s + dist(q, p[i]), 0);
function midpoint(p: number[][]): number[] {
  const half = lengthOf(p) / 2;
  let run = 0;
  for (let i = 1; i < p.length; i++) {
    const seg = dist(p[i], p[i - 1]);
    if (run + seg >= half) {
      const t = (half - run) / seg;
      return p[i - 1].map((x, k) => x + (p[i][k] - x) * t);
    }
    run += seg;
  }
  return p[p.length - 1];
}

describe('drawn vessels', () => {
  it('only surface vessels are drawn off their modelled course', () => {
    const lifted = VESSELS.filter((v) => v.renderPath);
    expect(lifted.length).toBeGreaterThan(20);
    for (const v of lifted) expect(v.pathMode, v.id).toBe('surface');
  });

  it.each([
    ['drawn', drawn],
    ['modelled', (v: Vessel) => v.path],
  ] as const)('the %s network stays connected: vessels meet where they join', (_label, pathOf) => {
    const at = new Map<string, number[][]>();
    const add = (node: string, p: number[]) => at.set(node, [...(at.get(node) ?? []), p]);
    for (const v of VESSELS) {
      const p = pathOf(v);
      if (!v.from.endsWith('@mid')) add(v.from, p[0]);
      add(v.to, p[p.length - 1]);
    }
    let worst = 0;
    let where = '';
    for (const [node, pts] of at)
      for (const p of pts) {
        const d = dist(p, pts[0]);
        if (d > worst) [worst, where] = [d, node];
      }
    for (const v of VESSELS) {
      if (!v.from.endsWith('@mid')) continue;
      const parent = VESSEL_BY_ID[v.from.slice(0, -4)];
      if (!parent) continue;
      const d = dist(pathOf(v)[0], midpoint(pathOf(parent)));
      if (d > worst) [worst, where] = [d, v.from];
    }
    expect(worst, `gap at ${where}`).toBeLessThan(1);
  });
});

// ─────────────────────────── against the brain meshes ───────────────────────────
const buf = readFileSync(new URL('../../public/data/brain.bin', import.meta.url));
const manifest = JSON.parse(new TextDecoder().decode(readFileSync(new URL('../../public/data/brain.json', import.meta.url)))) as Manifest;
const brain = parseBrain(manifest, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
const MESH = Object.fromEntries(brain.meshes.map((m) => [m.name, m])) as Record<string, MeshData>;

/** nearest-vertex lookup on a 3 mm grid */
function surfaceOf(m: MeshData) {
  const pos = m.geometry.getAttribute('position').array as Float32Array;
  const nor = m.geometry.getAttribute('normal').array as Float32Array;
  const cell = 3 * SCALE;
  const key = (x: number, y: number, z: number) => `${Math.floor(x / cell)},${Math.floor(y / cell)},${Math.floor(z / cell)}`;
  const grid = new Map<string, number[]>();
  for (let i = 0; i < pos.length / 3; i++) {
    const k = key(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    grid.set(k, [...(grid.get(k) ?? []), i]);
  }
  /** signed height (mm) above the surface: from the nearest vertex along its normal */
  return (p: Vector3): number => {
    let best = -1;
    let bestD = Infinity;
    for (let ring = 1; best < 0 && ring <= 4; ring++)
      for (let dx = -ring; dx <= ring; dx++)
        for (let dy = -ring; dy <= ring; dy++)
          for (let dz = -ring; dz <= ring; dz++)
            for (const i of grid.get(key(p.x + dx * cell, p.y + dy * cell, p.z + dz * cell)) ?? []) {
              const d = (pos[i * 3] - p.x) ** 2 + (pos[i * 3 + 1] - p.y) ** 2 + (pos[i * 3 + 2] - p.z) ** 2;
              if (d < bestD) [bestD, best] = [d, i];
            }
    if (best < 0) return Infinity;
    const h = (p.x - pos[best * 3]) * nor[best * 3] + (p.y - pos[best * 3 + 1]) * nor[best * 3 + 1] + (p.z - pos[best * 3 + 2]) * nor[best * 3 + 2];
    return h / SCALE;
  };
}
const SURFACE = { hemi_l: surfaceOf(MESH.hemi_l), hemi_r: surfaceOf(MESH.hemi_r), cerebellum: surfaceOf(MESH.cerebellum) };
const CEREBELLAR = ['pica', 'aica', 'sca', 'lepto_pica', 'lepto_aica', 'lepto_sca'];
const targetOf = (v: Vessel) => (CEREBELLAR.some((c) => v.baseId.startsWith(c)) ? 'cerebellum' : v.side === 'l' ? 'hemi_l' : 'hemi_r');

/** the part of a surface vessel meant to lie on the surface, 1 mm apart, as heights above it (mm) */
function drapedHeights(v: Vessel, path: number[][]): number[] {
  const len = lengthOf(path);
  const out: number[] = [];
  const surf = SURFACE[targetOf(v)];
  let run = 0;
  let next = (v.surfaceFrom ?? 0) * len + 6;
  for (let i = 1; i < path.length; i++) {
    const seg = dist(path[i], path[i - 1]);
    while (next <= run + seg && next < len - 3) {
      const t = (next - run) / seg;
      out.push(surf(toThree(path[i - 1].map((x, k) => x + (path[i][k] - x) * t))));
      next += 1;
    }
    run += seg;
  }
  return out;
}
/** separate runs below the surface after the vessel first reaches it (a branch may still be leaving a fissure) */
function dives(h: number[], below = -0.5): number {
  const first = h.findIndex((x) => x >= 0);
  if (first < 0) return 0;
  let n = 0;
  for (let i = first + 1; i < h.length; i++) if (h[i] < below && h[i - 1] >= below) n++;
  return n;
}
const collaterals = VESSELS.filter((v) => v.pathMode === 'surface' && v.kind === 'collateral');
const branches = VESSELS.filter((v) => v.pathMode === 'surface' && v.kind !== 'collateral');
const insideShare = (h: number[]) => h.filter((x) => x < -0.5).length / Math.max(1, h.length);

describe('surface vessels lie on the surface', () => {
  it('the check finds the problem on the modelled (unlifted) course, so it is not vacuous', () => {
    const bad = collaterals.filter((v) => insideShare(drapedHeights(v, v.path)) > 0.2);
    expect(bad.length).toBeGreaterThan(3);
  });

  it('leptomeningeal collaterals run over the cortex and cerebellum, not through them', () => {
    const worst = collaterals
      .map((v) => [v.id, insideShare(drapedHeights(v, drawn(v)))] as const)
      .sort((a, b) => b[1] - a[1]);
    expect(collaterals.length).toBeGreaterThan(20);
    expect(worst[0][1], worst[0][0]).toBeLessThan(0.1);
  });

  it('once on the surface, branches do not keep diving under it', () => {
    const before = branches.reduce((s, v) => s + dives(drapedHeights(v, v.path)), 0);
    const after = branches.reduce((s, v) => s + dives(drapedHeights(v, drawn(v))), 0);
    for (const v of branches) expect(dives(drapedHeights(v, drawn(v))), v.id).toBeLessThanOrEqual(2);
    expect(after).toBeLessThan(before / 2);
  });
});

/** vertex positions of a mesh in scene units */
const vertices = (m: MeshData) => {
  const a = m.geometry.getAttribute('position').array as Float32Array;
  return Array.from({ length: a.length / 3 }, (_, i) => new Vector3(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]));
};

describe('the cerebrum and the cerebellum', () => {
  // reported: the hemispheric branches of the superior cerebellar artery were buried, because the
  // occipital and temporal lobes reached 2–3 mm into the top of the cerebellum
  it('are kept apart by a tentorial gap', () => {
    const cb = vertices(MESH.cerebellum);
    for (const side of ['hemi_l', 'hemi_r'] as const) {
      const heights = cb.map((p) => SURFACE[side](p)).filter((h) => h < 10);
      expect(heights.length, side).toBeGreaterThan(200);
      // no cerebellar vertex inside the hemisphere, and at least 2.5 mm of room almost everywhere
      expect(Math.min(...heights), side).toBeGreaterThan(1.5);
      expect(heights.filter((h) => h < 2.5).length / heights.length, side).toBeLessThan(0.02);
    }
  });

  it('the superior cerebellar artery runs over the cerebellum, outside the occipital lobe', () => {
    const sca = VESSELS.filter((v) => v.baseId === 'sca_lateral' || v.baseId === 'sca_medial');
    expect(sca).toHaveLength(4);
    for (const v of sca)
      for (const q of drawn(v)) {
        const p = toThree(q);
        for (const side of ['hemi_l', 'hemi_r'] as const) expect(SURFACE[side](p), `${v.id} in ${side}`).toBeGreaterThan(v.r);
      }
  });
});
