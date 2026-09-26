import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { TubeGeometry, type CatmullRomCurve3, type Plane, type Vector3 } from 'three';
import { VESSELS, tr, vesselName } from '../anatomy';
import type { Vessel } from '../anatomy';
import type { SimResult } from '../engine/simulate';
import { useApp } from '../state/store';
import { VESSEL_COLORS } from '../ui/colors';
import { vesselVisual } from '../ui/vesselState';
import { SCALE, vesselCurve } from './coords';

interface Built {
  v: Vessel;
  curve: CatmullRomCurve3;
  geom: TubeGeometry;
  hit: TubeGeometry;
  mid: Vector3;
}

const MIN_R_MM = 0.28;

function build(v: Vessel): Built {
  const curve = vesselCurve(v);
  const lenMm = curve.getLength() / SCALE;
  const segs = Math.max(8, Math.min(160, Math.round(lenMm / 1.2)));
  const rMm = Math.max(v.r, MIN_R_MM) * (v.kind === 'collateral' ? 0.8 : 1);
  const radial = rMm > 1.2 ? 12 : 8;
  const geom = new TubeGeometry(curve, segs, rMm * SCALE, radial, false);
  const hit = new TubeGeometry(curve, Math.max(6, Math.round(segs / 3)), Math.max(rMm * 2.2, 1.3) * SCALE, 6, false);
  return { v, curve, geom, hit, mid: curve.getPointAt(0.5) };
}

let builtCache: Built[] | null = null;
function allBuilt(): Built[] {
  if (!builtCache) builtCache = VESSELS.map(build);
  return builtCache;
}

const LABELLED = new Set([
  'ica_cervical', 'ica_petrous_cavernous', 'mca_m1', 'mca_m2_sup', 'mca_m2_inf', 'aca_a1', 'aca_a2', 'acomm', 'pcomm',
  'pca_p1', 'pca_p2', 'basilar_mid', 'va_v4_dist', 'pica', 'aica', 'sca', 'acha', 'lenticulostriate', 'ophthalmic',
  'aca_pericallosal', 'aca_callosomarginal', 'pca_calcarine',
]);

/** families whose surface branches lie on the cerebral hemispheres */
const CEREBRAL = new Set(['ACA', 'MCA', 'PCA', 'COLL']);

export function Vessels({ sim, clipPlanes }: { sim: SimResult; clipPlanes: Plane[] }) {
  const layers = useApp((s) => s.layers);
  const hemis = useApp((s) => s.hemis);
  const hovered = useApp((s) => s.hovered);
  const selected = useApp((s) => s.selected);
  const lang = useApp((s) => s.lang);
  const hover = useApp((s) => s.hover);
  const select = useApp((s) => s.select);
  const built = useMemo(allBuilt, []);

  if (!layers.vessels) return null;
  return (
    <group>
      {built.map((b) => {
        const { v } = b;
        const vis = vesselVisual(v.id, sim);
        if (v.group === 'extracranial' && !layers.neck) return null;
        if (v.kind === 'collateral' && !layers.collaterals && vis.state !== 'collateral_active') return null;
        // cortical branches lying on a hidden hemisphere would float in the air
        if (v.pathMode === 'surface' && CEREBRAL.has(v.family) && !/pica|aica|sca/.test(v.baseId) && v.side !== 'm' && !hemis[v.side]) return null;
        const isHover = hovered?.kind === 'vessel' && hovered.id === v.id;
        const isSel = selected?.kind === 'vessel' && selected.id === v.id;
        const color = isSel ? VESSEL_COLORS.selected : vis.color;
        const showLabel = (layers.labels && LABELLED.has(v.baseId) && v.side !== 'l') || isSel;
        return (
          <group key={v.id}>
            <mesh geometry={b.geom} renderOrder={1}>
              <meshStandardMaterial
                color={color}
                emissive={isHover || isSel ? '#ffcf70' : vis.state === 'collateral_active' ? '#806000' : '#000000'}
                emissiveIntensity={isHover || isSel ? 0.55 : 0.4}
                roughness={0.38}
                metalness={0.05}
                clippingPlanes={clipPlanes}
              />
            </mesh>
            {!v.visualOnly && (
              <mesh
                geometry={b.hit}
                visible={false}
                onPointerMove={(e) => {
                  e.stopPropagation();
                  hover({ kind: 'vessel', id: v.id });
                }}
                onPointerOut={() => hover(null)}
                onClick={(e) => {
                  if (e.delta > 4) return;
                  e.stopPropagation();
                  select({ kind: 'vessel', id: v.id });
                }}
              />
            )}
            {showLabel && (
              <Html position={b.mid} center distanceFactor={18} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
                <div className={`vessel-label${isSel ? ' selected' : ''}`}>
                  {isSel ? vesselName(v, lang) : v.abbr ?? tr(v.name, lang)}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}
