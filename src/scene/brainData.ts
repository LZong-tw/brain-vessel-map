/**
 * Loads the pre-built brain meshes (public/data/brain.{json,bin}) produced by
 * tools/build_assets.py from the MNI ICBM152 2009c template.
 */

import { useEffect, useState } from 'react';
import { BufferAttribute, BufferGeometry } from 'three';
import { SCALE } from './coords';

export interface MeshData {
  name: string;
  kind: 'cortex' | 'cerebellum' | 'brainstem' | 'deep' | 'ventricle';
  geometry: BufferGeometry;
  /** bed index per vertex (−1 = none) */
  bed: Int32Array | null;
}

export interface BrainData {
  meshes: MeshData[];
  beds: string[];
}

interface ManifestMesh {
  name: string;
  kind: MeshData['kind'];
  vertexCount: number;
  indexCount: number;
  position: number;
  index: number;
  indexType: 'u16' | 'u32';
  bed?: number;
}

interface Manifest {
  positionScale: number;
  meshes: ManifestMesh[];
  beds: string[];
}

let cache: Promise<BrainData> | null = null;

export function loadBrain(): Promise<BrainData> {
  if (cache) return cache;
  const base = import.meta.env.BASE_URL;
  cache = Promise.all([
    fetch(`${base}data/brain.json`).then((r) => {
      if (!r.ok) throw new Error(`brain.json ${r.status}`);
      return r.json() as Promise<Manifest>;
    }),
    fetch(`${base}data/brain.bin`).then((r) => {
      if (!r.ok) throw new Error(`brain.bin ${r.status}`);
      return r.arrayBuffer();
    }),
  ]).then(([m, buf]) => parse(m, buf));
  cache.catch(() => (cache = null));
  return cache;
}

function parse(m: Manifest, buf: ArrayBuffer): BrainData {
  const meshes: MeshData[] = m.meshes.map((mm) => {
    const q = new Int16Array(buf, mm.position, mm.vertexCount * 3);
    const pos = new Float32Array(mm.vertexCount * 3);
    const s = m.positionScale * SCALE;
    for (let i = 0; i < mm.vertexCount; i++) {
      const x = q[i * 3];
      const y = q[i * 3 + 1];
      const z = q[i * 3 + 2];
      pos[i * 3] = -x * s;
      pos[i * 3 + 1] = z * s;
      pos[i * 3 + 2] = y * s;
    }
    const index =
      mm.indexType === 'u16'
        ? new Uint16Array(buf.slice(mm.index, mm.index + mm.indexCount * 2))
        : new Uint32Array(buf.slice(mm.index, mm.index + mm.indexCount * 4));
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setIndex(new BufferAttribute(index, 1));
    g.computeVertexNormals();
    g.setAttribute('color', new BufferAttribute(new Float32Array(mm.vertexCount * 3).fill(0.8), 3));
    g.computeBoundingSphere();
    let bed: Int32Array | null = null;
    if (mm.bed !== undefined) {
      const raw = new Uint16Array(buf, mm.bed, mm.vertexCount);
      bed = new Int32Array(mm.vertexCount);
      for (let i = 0; i < raw.length; i++) bed[i] = raw[i] === 65535 ? -1 : raw[i];
    }
    return { name: mm.name, kind: mm.kind, geometry: g, bed };
  });
  return { meshes, beds: m.beds };
}

export function useBrainData() {
  const [data, setData] = useState<BrainData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadBrain()
      .then((d) => alive && setData(d))
      .catch((e: unknown) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);
  return { data, error };
}
