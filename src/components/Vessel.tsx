/**
 * 血管 3D 元件
 * Vessel 3D Component
 */

import { useMemo } from 'react';
import { TubeGeometry, CatmullRomCurve3, Vector3 } from 'three';
import type { VesselGeometry } from '../types/vessel';
import { useAppStore } from '../store/appStore';

interface VesselProps {
  vesselId: string;
  geometry: VesselGeometry;
  name: string;
}

export function Vessel({ vesselId, geometry, name }: VesselProps) {
  const blockedVessels = useAppStore((state) => state.blockedVessels);
  const hoveredVessel = useAppStore((state) => state.hoveredVessel);
  const toggleVesselBlock = useAppStore((state) => state.toggleVesselBlock);
  const setHoveredVessel = useAppStore((state) => state.setHoveredVessel);

  const isBlocked = blockedVessels.has(vesselId);
  const isHovered = hoveredVessel === vesselId;

  const tubeGeometry = useMemo(() => {
    const points = geometry.points.map((p) => new Vector3(...p));
    const curve = new CatmullRomCurve3(points);
    return new TubeGeometry(curve, 20, geometry.radius, 8, false);
  }, [geometry]);

  const color = isBlocked ? '#ff0000' : isHovered ? '#ffaa00' : '#ff6666';

  return (
    <mesh
      geometry={tubeGeometry}
      onClick={(e) => {
        e.stopPropagation();
        toggleVesselBlock(vesselId);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredVessel(vesselId);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHoveredVessel(null);
        document.body.style.cursor = 'default';
      }}
    >
      <meshStandardMaterial
        color={color}
        emissive={isHovered ? '#aa5500' : '#000000'}
        emissiveIntensity={isHovered ? 0.3 : 0}
        transparent
        opacity={isBlocked ? 0.9 : 0.7}
      />
      {isHovered && (
        <Html position={[0, 0, 0]}>
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {name}
          </div>
        </Html>
      )}
    </mesh>
  );
}

// Simple HTML overlay for tooltips - placeholder for future drei Html integration
function Html({ children: _children, position: _position }: { children: React.ReactNode; position: [number, number, number] }) {
  return null; // Simplified - in full version would use drei's Html
}
