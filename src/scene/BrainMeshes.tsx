import { useEffect, useMemo, useRef } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { DoubleSide, FrontSide, type BufferAttribute, type Plane } from 'three';
import { BED_BY_ID } from '../anatomy';
import { TIME_STOPS } from '../anatomy/timeline';
import type { SimResult } from '../engine/simulate';
import { useApp } from '../state/store';
import { edemaColor, hex, mix, regionColor, stateColor, territoryColor, type RGB } from '../ui/colors';
import type { BrainData, MeshData } from './brainData';
import { applyEdemaDeformation } from './deform';

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
  const edemaScale = useApp((s) => s.edemaScale);
  // only region highlights matter here; hovering a vessel must not recolour the brain
  const hoveredRegion = useApp((s) => (s.hovered?.kind === 'region' ? s.hovered.id : null));
  const selectedRegion = useApp((s) => (s.selected?.kind === 'region' ? s.selected.id : null));
  const hoveredStructure = useApp((s) => (s.hovered?.kind === 'structure' ? s.hovered.id : null));
  const selectedStructure = useApp((s) => (s.selected?.kind === 'structure' ? s.selected.id : null));
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
      else if (colorMode === 'edema') c = edemaColor(bed, sim.edema.cytotoxic[id], sim.edema.vasogenic[id], sim.edema.swelling[id]);
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

  // swelling, midline shift and ventricle size reshape the meshes; applyEdemaDeformation only
  // touches meshes whose inputs actually changed, so a new sim with the same oedema is free
  useEffect(() => {
    if (applyEdemaDeformation(data, { edema: sim.edema, exaggeration: edemaScale })) invalidate();
  }, [data, sim.edema, edemaScale, invalidate]);

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
        // enlarged or compressed ventricles are part of what the oedema view is about
        return layers.ventricles || sim.hydrocephalus || (colorMode === 'edema' && sim.edema.phase !== 'none');
      default:
        return true;
    }
  };

  return (
    <group>
      {data.meshes.map((m) => {
        if (!visible(m)) return null;
        const isCortex = m.kind === 'cortex';
        const isVentricle = m.kind === 'ventricle';
        const transparent = (isCortex && opacity < 0.99) || isVentricle;
        const op = isVentricle ? 0.45 : isCortex ? opacity : 1;
        const side = clipPlanes.length ? DoubleSide : FrontSide;
        // a see-through cortex should not block clicks on what is visible inside it
        const passThrough = isCortex && opacity < 0.6;
        const ventHighlight = isVentricle && (hoveredStructure === 'ventricles' || selectedStructure === 'ventricles');
        return (
          <group key={m.name}>
            {/* A see-through cortex is a folded surface that overlaps itself many times; blending
                every layer in arbitrary order gives flickering dark patches. Write its depth
                first (invisible pass) so only the outermost layer is blended over what lies inside. */}
            {/* The ventricles sit inside the thalami and basal ganglia, so from most angles the
                opaque deep nuclei hide them completely. A faint x-ray pass keeps their outline
                visible through whatever is in front. */}
            {isVentricle && (
              <mesh geometry={m.geometry} renderOrder={5} raycast={() => null}>
                <meshBasicMaterial
                  color="#5aa7ff"
                  transparent
                  opacity={ventHighlight ? 0.35 : 0.18}
                  depthTest={false}
                  depthWrite={false}
                  side={side}
                  clippingPlanes={clipPlanes}
                />
              </mesh>
            )}
            {isCortex && transparent && (
              <mesh geometry={m.geometry} renderOrder={3} raycast={() => null}>
                <meshBasicMaterial colorWrite={false} transparent opacity={0} depthWrite side={side} clippingPlanes={clipPlanes} />
              </mesh>
            )}
            <mesh
              geometry={m.geometry}
              renderOrder={isCortex && transparent ? 4 : transparent ? 2 : 0}
              onPointerMove={(e) => {
                if (passThrough) return;
                e.stopPropagation();
                if (isVentricle) {
                  hover({ kind: 'structure', id: 'ventricles' });
                  return;
                }
                const r = regionAt(m, e);
                hover(r ? { kind: 'region', id: r } : null);
              }}
              onPointerOut={() => !passThrough && hover(null)}
              onClick={(e) => {
                if (passThrough || e.delta > 4) return;
                e.stopPropagation();
                if (isVentricle) {
                  select({ kind: 'structure', id: 'ventricles' });
                  return;
                }
                const r = regionAt(m, e);
                if (r) select({ kind: 'region', id: r });
              }}
            >
            <meshStandardMaterial
              // three.js bakes "opaque" into the compiled shader; recreate the material when the
              // cortex switches between opaque and see-through or the alpha stays locked at 1
              key={transparent ? 'transparent' : 'opaque'}
              vertexColors
              roughness={m.kind === 'deep' ? 0.55 : 0.72}
              metalness={0}
              transparent={transparent}
              opacity={ventHighlight ? 0.7 : op}
              emissive={ventHighlight ? '#3a6ea8' : '#000000'}
              depthWrite={!transparent}
              side={side}
              clippingPlanes={clipPlanes}
            />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
