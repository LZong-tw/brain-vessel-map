/**
 * 3D 場景元件
 * 3D Scene Component
 */

import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Vessel } from './Vessel';
import { BrainRegion } from './BrainRegion';
import { vessels } from '../data/vessels';
import { brainRegions } from '../data/regions';
import { vesselGeometry, regionGeometry } from '../data/vesselGeometry';
import { useAppStore } from '../store/appStore';

export function Scene() {
  const layers = useAppStore((state) => state.layers);
  const occlusionResult = useAppStore((state) => state.occlusionResult);
  const language = useAppStore((state) => state.language);

  const affectedFullSet = new Set(occlusionResult?.affectedRegionsFull || []);
  const affectedPartialSet = new Set(occlusionResult?.affectedRegionsPartial || []);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 10]} />
        <OrbitControls enableDamping dampingFactor={0.05} />
        
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        {/* Vessels */}
        {layers.vessels &&
          Object.entries(vessels).map(([vesselId, vessel]) => {
            const geometry = vesselGeometry[vesselId];
            if (!geometry) return null;

            return (
              <Vessel
                key={vesselId}
                vesselId={vesselId}
                geometry={geometry}
                name={language === 'zh-TW' ? vessel.nameZh : vessel.nameEn}
              />
            );
          })}

        {/* Brain Regions */}
        {Object.entries(brainRegions).map(([regionId, region]) => {
          // Filter by category
          if (region.category === 'cerebrum' && !layers.cerebrum) return null;
          if (region.category === 'cerebellum' && !layers.cerebellum) return null;
          if (region.category === 'brainstem' && !layers.brainstem) return null;

          const geometry = regionGeometry[regionId];
          if (!geometry) return null;

          const affectedLevel = affectedFullSet.has(regionId)
            ? 'full'
            : affectedPartialSet.has(regionId)
            ? 'partial'
            : 'none';

          return (
            <BrainRegion
              key={regionId}
              region={region}
              position={geometry.position}
              size={geometry.size}
              affectedLevel={affectedLevel}
            />
          );
        })}
      </Canvas>
    </div>
  );
}
