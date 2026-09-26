import { useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry } from 'three';
import { BED_BY_ID, VESSEL_BY_ID } from '../anatomy';
import type { Vec3 } from '../anatomy/types';
import { TIME_STOPS } from '../anatomy/timeline';
import type { SimResult } from '../engine/simulate';
import { useApp } from '../state/store';
import { stateColor, territoryColor, regionColor, toHex } from '../ui/colors';
import { SCALE, toThree, toThreeArr, vesselCurve } from './coords';

/** Small structures not in the MNI mesh set: eyes, inner ears, optic tracts. */
const EXTRA: { region: string; kind: 'sphere' | 'tube'; at?: Vec3; r: number; path?: Vec3[] }[] = [];
for (const s of ['r', 'l'] as const) {
  const k = s === 'r' ? 1 : -1;
  EXTRA.push({ region: `retina_${s}`, kind: 'sphere', at: [31 * k, 58, -37], r: 11 });
  EXTRA.push({ region: `inner_ear_${s}`, kind: 'sphere', at: [35 * k, -17, -38], r: 3.5 });
  EXTRA.push({
    region: `optic_tract_${s}`,
    kind: 'tube',
    r: 1.4,
    path: [
      [4 * k, 3, -15],
      [11 * k, -5, -14],
      [18 * k, -15, -10],
      [22 * k, -24, -5],
    ],
  });
}

export function ExtraStructures({ sim }: { sim: SimResult }) {
  const colorMode = useApp((s) => s.colorMode);
  const layers = useApp((s) => s.layers);
  const tH = TIME_STOPS[useApp((s) => s.tIndex)].h;
  const select = useApp((s) => s.select);
  const hover = useApp((s) => s.hover);
  const geoms = useMemo(
    () =>
      EXTRA.map((e) =>
        e.kind === 'tube' ? new TubeGeometry(new CatmullRomCurve3(e.path!.map(toThree)), 24, e.r * SCALE, 8, false) : null,
      ),
    [],
  );
  return (
    <group>
      {EXTRA.map((e, i) => {
        if (e.region.startsWith('optic') && !layers.deep) return null;
        const bed = BED_BY_ID[e.region];
        if (!bed) return null;
        const c =
          colorMode === 'territory' ? territoryColor(bed) : colorMode === 'anatomy' ? regionColor(bed.region) : stateColor(bed, sim.beds[bed.id], tH);
        const handlers = {
          onPointerMove: (ev: { stopPropagation: () => void }) => {
            ev.stopPropagation();
            hover({ kind: 'region', id: e.region });
          },
          onPointerOut: () => hover(null),
          onClick: (ev: { stopPropagation: () => void; delta: number }) => {
            if (ev.delta > 4) return;
            ev.stopPropagation();
            select({ kind: 'region', id: e.region });
          },
        };
        if (e.kind === 'sphere') {
          const eye = e.region.startsWith('retina');
          return (
            <mesh key={e.region} position={toThreeArr(e.at!)} {...handlers}>
              <sphereGeometry args={[e.r * SCALE, 24, 16]} />
              <meshStandardMaterial color={toHex(c)} transparent opacity={eye ? 0.55 : 0.9} roughness={0.4} depthWrite={!eye} />
            </mesh>
          );
        }
        return (
          <mesh key={e.region} geometry={geoms[i]!} {...handlers}>
            <meshStandardMaterial color={toHex(c)} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Clots (complete occlusions) and stenoses still in place at the simulated time. */
export function ClotMarkers({ sim }: { sim: SimResult }) {
  const occlusions = sim.activeOcclusions;
  const layers = useApp((s) => s.layers);
  if (!layers.vessels) return null;
  return (
    <group>
      {occlusions.map((o) => {
        const v = VESSEL_BY_ID[o.vessel];
        if (!v) return null;
        if (v.group === 'extracranial' && !layers.neck) return null;
        const p = vesselCurve(v).getPointAt(0.5);
        const r = Math.max(v.r * 1.6, 0.9) * SCALE;
        return o.severity >= 1 ? (
          <mesh key={o.vessel} position={p} renderOrder={4}>
            <sphereGeometry args={[r, 20, 14]} />
            <meshStandardMaterial color="#5c0a14" emissive="#ff2a4a" emissiveIntensity={0.55} roughness={0.6} />
          </mesh>
        ) : (
          <mesh key={o.vessel} position={p} renderOrder={4}>
            <torusGeometry args={[r * 0.9, r * 0.25, 10, 24]} />
            <meshStandardMaterial color="#f28c28" emissive="#f28c28" emissiveIntensity={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}
