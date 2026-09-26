/**
 * 腦區 3D 元件
 * Brain Region 3D Component
 */

import type { BrainRegion as BrainRegionType } from '../types/vessel';

interface BrainRegionProps {
  region: BrainRegionType;
  position: [number, number, number];
  size: [number, number, number];
  affectedLevel: 'none' | 'partial' | 'full';
}

export function BrainRegion({
  position,
  size,
  affectedLevel,
}: BrainRegionProps) {
  const getColor = () => {
    switch (affectedLevel) {
      case 'full':
        return '#ff0000';
      case 'partial':
        return '#ffaa00';
      default:
        return '#cccccc';
    }
  };

  const getOpacity = () => {
    switch (affectedLevel) {
      case 'full':
        return 0.6;
      case 'partial':
        return 0.4;
      default:
        return 0.15;
    }
  };

  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={getColor()}
        transparent
        opacity={getOpacity()}
        wireframe={affectedLevel === 'none'}
      />
    </mesh>
  );
}
