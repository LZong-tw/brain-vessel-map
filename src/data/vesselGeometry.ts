/**
 * TODO(medical-review): All vessel geometries are placeholder procedural paths
 * and do not represent accurate anatomical positions.
 * 
 * 幾何介面卡模式
 * Geometry Adapter Pattern
 * 
 * 這個檔案使用簡單的程序化幾何。要替換成真實網格：
 * 1. 保持相同的 VesselGeometry 介面
 * 2. 載入 GLB/GLTF 檔案（例如 BodyParts3D 4.0）
 * 3. 建立一個新的 geometry provider 返回實際的網格資料
 * 4. 更新 Scene 元件使用新的 provider
 */

import type { VesselGeometry } from '../types/vessel';

/**
 * 生成沿著路徑的樣條曲線（簡化版）
 */
function createSplinePath(
  start: [number, number, number],
  end: [number, number, number],
  _controlPoints: [number, number, number][] = []
): [number, number, number][] {
  const points: [number, number, number][] = [start];
  
  // 簡單的線性插值（真實實作應該使用 Catmull-Rom 或 B-spline）
  const segments = 8;
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const x = start[0] + (end[0] - start[0]) * t;
    const y = start[1] + (end[1] - start[1]) * t;
    const z = start[2] + (end[2] - start[2]) * t;
    points.push([x, y, z]);
  }
  
  return points;
}

/**
 * TODO(medical-review): These are rough placeholder positions
 * based on typical Circle of Willis topology, not precise anatomy.
 */
export const vesselGeometry: Record<string, VesselGeometry> = {
  // Internal Carotid Arteries (coming up from below)
  ica_r: {
    points: createSplinePath([1.5, -3, 0], [1.5, 0, 0]),
    radius: 0.15,
  },
  ica_l: {
    points: createSplinePath([-1.5, -3, 0], [-1.5, 0, 0]),
    radius: 0.15,
  },

  // Anterior Cerebral Artery A1
  aca_a1_r: {
    points: createSplinePath([1.5, 0, 0], [0.5, 0.2, 0.5]),
    radius: 0.1,
  },
  aca_a1_l: {
    points: createSplinePath([-1.5, 0, 0], [-0.5, 0.2, 0.5]),
    radius: 0.1,
  },

  // Anterior Communicating Artery
  acomm: {
    points: createSplinePath([0.5, 0.2, 0.5], [-0.5, 0.2, 0.5]),
    radius: 0.08,
  },

  // ACA A2 (going up and forward)
  aca_a2_r: {
    points: createSplinePath([0.5, 0.2, 0.5], [1.0, 2.5, 1.5]),
    radius: 0.1,
  },
  aca_a2_l: {
    points: createSplinePath([-0.5, 0.2, 0.5], [-1.0, 2.5, 1.5]),
    radius: 0.1,
  },

  // Middle Cerebral Artery M1 (going lateral)
  mca_m1_r: {
    points: createSplinePath([1.5, 0, 0], [3.0, 0.5, 0]),
    radius: 0.12,
  },
  mca_m1_l: {
    points: createSplinePath([-1.5, 0, 0], [-3.0, 0.5, 0]),
    radius: 0.12,
  },

  // Lenticulostriate arteries (small perforators going up)
  lenticulostriate_r: {
    points: createSplinePath([2.0, 0.2, 0], [1.8, 1.0, 0.2]),
    radius: 0.05,
  },
  lenticulostriate_l: {
    points: createSplinePath([-2.0, 0.2, 0], [-1.8, 1.0, 0.2]),
    radius: 0.05,
  },

  // Posterior Communicating Artery
  pcomm_r: {
    points: createSplinePath([1.5, -0.3, 0], [1.0, -0.5, -0.8]),
    radius: 0.08,
  },
  pcomm_l: {
    points: createSplinePath([-1.5, -0.3, 0], [-1.0, -0.5, -0.8]),
    radius: 0.08,
  },

  // Vertebral arteries (coming up from spine)
  vertebral_r: {
    points: createSplinePath([0.5, -4, -1.5], [0.3, -1.5, -1.2]),
    radius: 0.12,
  },
  vertebral_l: {
    points: createSplinePath([-0.5, -4, -1.5], [-0.3, -1.5, -1.2]),
    radius: 0.12,
  },

  // Basilar artery (fusion of vertebrals)
  basilar: {
    points: createSplinePath([0, -1.5, -1.2], [0, 0, -0.8]),
    radius: 0.13,
  },

  // Posterior Cerebral Arteries
  pca_r: {
    points: createSplinePath([1.0, -0.5, -0.8], [2.0, 0, -2.5]),
    radius: 0.11,
  },
  pca_l: {
    points: createSplinePath([-1.0, -0.5, -0.8], [-2.0, 0, -2.5]),
    radius: 0.11,
  },

  // Cerebellar arteries
  pica_r: {
    points: createSplinePath([0.3, -1.5, -1.2], [1.5, -2.0, -2.5]),
    radius: 0.09,
  },
  pica_l: {
    points: createSplinePath([-0.3, -1.5, -1.2], [-1.5, -2.0, -2.5]),
    radius: 0.09,
  },
  aica_r: {
    points: createSplinePath([0.1, -0.8, -1.0], [1.2, -1.2, -1.8]),
    radius: 0.08,
  },
  aica_l: {
    points: createSplinePath([-0.1, -0.8, -1.0], [-1.2, -1.2, -1.8]),
    radius: 0.08,
  },
  sca_r: {
    points: createSplinePath([0.1, -0.3, -0.9], [1.5, -0.5, -1.5]),
    radius: 0.09,
  },
  sca_l: {
    points: createSplinePath([-0.1, -0.3, -0.9], [-1.5, -0.5, -1.5]),
    radius: 0.09,
  },

  // Perforators
  pontine_perforators: {
    points: createSplinePath([0, -0.8, -1.0], [0, -0.5, -0.7]),
    radius: 0.05,
  },
  anterior_spinal: {
    points: createSplinePath([0, -1.5, -1.2], [0, -3.0, -1.3]),
    radius: 0.07,
  },
};

/**
 * TODO(medical-review): These are very rough placeholder positions.
 * Real brain regions should use proper anatomical meshes.
 */
export const regionGeometry: Record<
  string,
  { position: [number, number, number]; size: [number, number, number] }
> = {
  // Cerebrum - lateral surfaces
  frontal_lobe_lateral_r: { position: [2.5, 1.5, 1], size: [1.5, 2, 2] },
  frontal_lobe_lateral_l: { position: [-2.5, 1.5, 1], size: [1.5, 2, 2] },
  frontal_lobe_medial_r: { position: [0.8, 2, 1.5], size: [1, 1.5, 1.5] },
  frontal_lobe_medial_l: { position: [-0.8, 2, 1.5], size: [1, 1.5, 1.5] },
  
  temporal_lobe_r: { position: [3, -0.5, -0.5], size: [1.5, 1.5, 2] },
  temporal_lobe_l: { position: [-3, -0.5, -0.5], size: [1.5, 1.5, 2] },
  
  parietal_lobe_r: { position: [2.5, 0.5, -0.5], size: [1.5, 1.5, 1.5] },
  parietal_lobe_l: { position: [-2.5, 0.5, -0.5], size: [1.5, 1.5, 1.5] },
  
  occipital_lobe_r: { position: [1.5, 0, -2.5], size: [1.5, 1.5, 1.5] },
  occipital_lobe_l: { position: [-1.5, 0, -2.5], size: [1.5, 1.5, 1.5] },
  
  motor_cortex_leg_r: { position: [0.8, 2.5, 0.8], size: [0.6, 0.8, 0.8] },
  motor_cortex_leg_l: { position: [-0.8, 2.5, 0.8], size: [0.6, 0.8, 0.8] },
  motor_cortex_face_arm_r: { position: [2.8, 1, 0.5], size: [0.8, 1, 1] },
  motor_cortex_face_arm_l: { position: [-2.8, 1, 0.5], size: [0.8, 1, 1] },
  
  // Deep structures
  internal_capsule_r: { position: [1.2, 0.3, 0.2], size: [0.3, 0.8, 0.6] },
  internal_capsule_l: { position: [-1.2, 0.3, 0.2], size: [0.3, 0.8, 0.6] },
  basal_ganglia_r: { position: [1.5, 0.2, 0], size: [0.6, 0.6, 0.6] },
  basal_ganglia_l: { position: [-1.5, 0.2, 0], size: [0.6, 0.6, 0.6] },
  thalamus_posterior_r: { position: [0.8, -0.2, -0.5], size: [0.5, 0.6, 0.7] },
  thalamus_posterior_l: { position: [-0.8, -0.2, -0.5], size: [0.5, 0.6, 0.7] },
  
  // Cerebellum
  cerebellum_superior_r: { position: [1.2, -0.8, -1.5], size: [1, 0.8, 1] },
  cerebellum_superior_l: { position: [-1.2, -0.8, -1.5], size: [1, 0.8, 1] },
  cerebellum_anterior_inferior_r: { position: [1.2, -1.5, -1.8], size: [0.8, 0.7, 0.8] },
  cerebellum_anterior_inferior_l: { position: [-1.2, -1.5, -1.8], size: [0.8, 0.7, 0.8] },
  cerebellum_inferior_r: { position: [1.2, -2.2, -2.2], size: [1, 0.8, 1] },
  cerebellum_inferior_l: { position: [-1.2, -2.2, -2.2], size: [1, 0.8, 1] },
  
  // Brainstem
  midbrain: { position: [0, -0.3, -0.8], size: [0.8, 0.5, 0.6] },
  pons: { position: [0, -0.9, -1.1], size: [1, 0.6, 0.7] },
  medulla_lateral_r: { position: [0.3, -1.6, -1.3], size: [0.4, 0.5, 0.4] },
  medulla_lateral_l: { position: [-0.3, -1.6, -1.3], size: [0.4, 0.5, 0.4] },
  medulla_medial: { position: [0, -1.7, -1.3], size: [0.4, 0.6, 0.4] },
};
