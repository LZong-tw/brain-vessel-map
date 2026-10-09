import { useEffect, useMemo } from 'react';
import type { Plane } from 'three';
import { buildMraDistalGeometry } from './mraDistalGeometry';
import type { MraDistalData, MraFamilyId } from './mraDistalData';

export interface MraDistalVesselsProps {
  data: MraDistalData;
  clipPlanes: Plane[];
  hemis: { l: boolean; r: boolean };
  selectedFamily: MraFamilyId | null;
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
