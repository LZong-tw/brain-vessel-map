import { useEffect, useMemo } from 'react';
import { BufferGeometry, Color, Float32BufferAttribute, type Plane } from 'three';
import { toThreeArr } from './coords';
import type { MraDistalData, MraFamilyId } from './mraDistalData';

export const MRA_FAMILY_COLORS: Record<MraFamilyId, string> = {
  1: '#afb9c4', 2: '#9bc6df', 3: '#b9a9d7', 4: '#b9a9d7',
  5: '#9bc6df', 6: '#a8cbbd', 7: '#a8cbbd',
};
export interface MraDistalVesselsProps {
  data: MraDistalData;
  clipPlanes: Plane[];
  hemis: { l: boolean; r: boolean };
  selectedFamily: MraFamilyId | null;
}

export function buildMraDistalGeometry(data: MraDistalData, hemis: { l: boolean; r: boolean }, selectedFamily: MraFamilyId | null) {
  const visible = (index: number) => {
    const family = data.labels[index];
    if (family === 1) return true;
    return family === 2 || family === 3 || family === 6 ? hemis.l : hemis.r;
  };
  const color = (index: number) => new Color(selectedFamily === data.labels[index] ? '#fff0b0' : MRA_FAMILY_COLORS[data.labels[index]]);
  const linePositions: number[] = [];
  const lineColors: number[] = [];
  for (const [first, second] of data.segments) {
    if (!visible(first) || !visible(second)) continue;
    for (const index of [first, second]) {
      linePositions.push(...toThreeArr(data.points[index]));
      lineColors.push(...color(index).toArray());
    }
  }
  const isolatedPositions: number[] = [];
  const isolatedColors: number[] = [];
  for (const index of data.isolatedPointIndices) {
    if (!visible(index)) continue;
    isolatedPositions.push(...toThreeArr(data.points[index]));
    isolatedColors.push(...color(index).toArray());
  }
  const lines = new BufferGeometry();
  lines.setAttribute('position', new Float32BufferAttribute(linePositions, 3));
  lines.setAttribute('color', new Float32BufferAttribute(lineColors, 3));
  const points = new BufferGeometry();
  points.setAttribute('position', new Float32BufferAttribute(isolatedPositions, 3));
  points.setAttribute('color', new Float32BufferAttribute(isolatedColors, 3));
  return { lines, points };
}

/** Source-family colors and selection are independent of simulated perfusion or occlusion. */
export function MraDistalVessels({ data, clipPlanes, hemis, selectedFamily }: MraDistalVesselsProps) {
  const { l, r } = hemis;
  const geometry = useMemo(() => buildMraDistalGeometry(data, { l, r }, selectedFamily), [data, l, r, selectedFamily]);
  useEffect(() => () => { geometry.lines.dispose(); geometry.points.dispose(); }, [geometry]);
  return (
    <group>
      <lineSegments geometry={geometry.lines}>
        <lineBasicMaterial vertexColors clippingPlanes={clipPlanes} />
      </lineSegments>
      <points geometry={geometry.points}>
        <pointsMaterial vertexColors size={0.06} sizeAttenuation clippingPlanes={clipPlanes} />
      </points>
    </group>
  );
}
