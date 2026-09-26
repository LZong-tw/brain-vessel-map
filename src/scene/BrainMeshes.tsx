import { useEffect, useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { DoubleSide, FrontSide, type BufferAttribute, type Plane } from 'three';
import { BED_BY_ID } from '../anatomy';
import { TIME_STOPS } from '../anatomy/timeline';
import type { SimResult } from '../engine/simulate';
import { useApp } from '../state/store';
import { hex, mix, regionColor, stateColor, territoryColor, type RGB } from '../ui/colors';
import type { BrainData, MeshData } from './brainData';

interface Props {
  data: BrainData;
  sim: SimResult;
  clipPlanes: Plane[];
}

const HIGHLIGHT: RGB = [1, 0.95, 0.75];

export function BrainMeshes({ data, sim, clipPlanes }: Props) {
  const layers = useApp((s) => s.layers);
  const hemis = useApp((s) => s.hemis);
  const opacity = useApp((s) => s.cortexOpacity);
  const colorMode = useApp((s) => s.colorMode);
  // only region highlights matter here; hovering a vessel must not recolour the brain
  const hoveredRegion = useApp((s) => (s.hovered?.kind === 'region' ? s.hovered.id : null));
  const selectedRegion = useApp((s) => (s.selected?.kind === 'region' ? s.selected.id : null));
  const invalidate = useThree((s) => s.invalidate);
  const lastColors = useRef<RGB[] | null>(null);
  const tIndex = useApp((s) => s.tIndex);
  const hover = useApp((s) => s.hover);
  const select = useApp((s) => s.select);
  const tH = TIME_STOPS[tIndex].h;

  // per-bed colour table
  const bedColors = useMemo(() => {
    const cols: RGB[] = [];
    for (const id of data.beds) {
      const bed = BED_BY_ID[id];
      if (!bed) {
        cols.push([0.7, 0.7, 0.7]);
        continue;
      }
      let c: RGB;
      if (colorMode === 'territory') c = territoryColor(bed);
      else if (colorMode === 'anatomy') c = regionColor(bed.region);
      else c = stateColor(bed, sim.beds[id], tH);
      const hl = hoveredRegion === bed.region || selectedRegion === bed.region;
      cols.push(hl ? mix(c, HIGHLIGHT, 0.45) : c);
    }
    return cols;
  }, [data.beds, colorMode, sim, tH, hoveredRegion, selectedRegion]);

  useEffect(() => {
    // re-upload only the meshes that contain a bed whose colour actually changed
    const prev = lastColors.current;
    const changed = bedColors.map((c, i) => !prev || !prev[i] || c[0] !== prev[i][0] || c[1] !== prev[i][1] || c[2] !== prev[i][2]);
    lastColors.current = bedColors;
    for (const m of data.meshes) {
      const attr = m.geometry.getAttribute('color') as BufferAttribute;
      const arr = attr.array as Float32Array;
      if (m.kind === 'ventricle') {
        if (prev) continue;
        const c = hex('#5aa7ff');
        for (let i = 0; i < arr.length; i += 3) arr.set(c, i);
        attr.needsUpdate = true;
      } else if (m.bed) {
        let dirty = !prev;
        for (let i = 0; i < m.bed.length; i++) {
          const b = m.bed[i];
          if (prev && (b < 0 || !changed[b])) continue;
          const c = b >= 0 ? bedColors[b] : ([0.75, 0.68, 0.64] as RGB);
          arr[i * 3] = c[0];
          arr[i * 3 + 1] = c[1];
          arr[i * 3 + 2] = c[2];
          dirty = true;
        }
        if (dirty) attr.needsUpdate = true;
      }
    }
    invalidate();
  }, [data, bedColors, invalidate]);

  const regionAt = (m: MeshData, e: ThreeEvent<PointerEvent> | ThreeEvent<MouseEvent>): string | null => {
    if (!m.bed || !e.face) return null;
    const b = m.bed[e.face.a];
    if (b < 0) return null;
    return BED_BY_ID[data.beds[b]]?.region ?? null;
  };

  const visible = (m: MeshData) => {
    switch (m.kind) {
      case 'cortex':
        return layers.cortex && hemis[m.name.endsWith('_r') ? 'r' : 'l'];
      case 'cerebellum':
        return layers.cerebellum;
      case 'brainstem':
        return layers.brainstem;
      case 'deep':
        return layers.deep;
      case 'ventricle':
        return layers.ventricles || sim.hydrocephalus;
      default:
        return true;
    }
  };

  return (
    <group>
      {data.meshes.map((m) => {
        if (!visible(m)) return null;
        const isCortex = m.kind === 'cortex';
        const transparent = (isCortex && opacity < 0.99) || m.kind === 'ventricle';
        const op = m.kind === 'ventricle' ? 0.45 : isCortex ? opacity : 1;
        const scale = m.kind === 'ventricle' && sim.hydrocephalus ? 1.18 : 1;
        return (
          <mesh
            key={m.name}
            geometry={m.geometry}
            scale={scale}
            renderOrder={transparent ? 2 : 0}
            onPointerMove={(e) => {
              if (m.kind === 'ventricle') return;
              e.stopPropagation();
              const r = regionAt(m, e);
              hover(r ? { kind: 'region', id: r } : null);
            }}
            onPointerOut={() => hover(null)}
            onClick={(e) => {
              if (m.kind === 'ventricle' || e.delta > 4) return;
              e.stopPropagation();
              const r = regionAt(m, e);
              if (r) select({ kind: 'region', id: r });
            }}
          >
            <meshStandardMaterial
              vertexColors
              roughness={m.kind === 'deep' ? 0.55 : 0.72}
              metalness={0}
              transparent={transparent}
              opacity={op}
              depthWrite={!transparent}
              side={clipPlanes.length ? DoubleSide : FrontSide}
              clippingPlanes={clipPlanes}
            />
          </mesh>
        );
      })}
    </group>
  );
}
