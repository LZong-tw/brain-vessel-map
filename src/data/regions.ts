/**
 * TODO(medical-review): All region descriptions are simplified for lay audiences
 * and require review by medical professionals.
 */

import type { BrainRegion } from '../types/vessel';

export const brainRegions: Record<string, BrainRegion> = {
  // Cerebrum - Frontal
  frontal_lobe_lateral_r: {
    id: 'frontal_lobe_lateral_r',
    nameZh: '右側額葉外側',
    nameEn: 'Right Lateral Frontal Lobe',
    descriptionZh: '負責計劃、決策、和部分語言功能',
    category: 'cerebrum',
  },
  frontal_lobe_lateral_l: {
    id: 'frontal_lobe_lateral_l',
    nameZh: '左側額葉外側',
    nameEn: 'Left Lateral Frontal Lobe',
    descriptionZh: '負責計劃、決策、和語言表達（布洛卡區）',
    category: 'cerebrum',
  },
  frontal_lobe_medial_r: {
    id: 'frontal_lobe_medial_r',
    nameZh: '右側額葉內側',
    nameEn: 'Right Medial Frontal Lobe',
    descriptionZh: '負責動機和情緒調節',
    category: 'cerebrum',
  },
  frontal_lobe_medial_l: {
    id: 'frontal_lobe_medial_l',
    nameZh: '左側額葉內側',
    nameEn: 'Left Medial Frontal Lobe',
    descriptionZh: '負責動機和情緒調節',
    category: 'cerebrum',
  },

  // Cerebrum - Motor Cortex
  motor_cortex_leg_r: {
    id: 'motor_cortex_leg_r',
    nameZh: '右側運動皮質（腿部區）',
    nameEn: 'Right Motor Cortex (Leg)',
    descriptionZh: '控制左腿的運動',
    category: 'cerebrum',
  },
  motor_cortex_leg_l: {
    id: 'motor_cortex_leg_l',
    nameZh: '左側運動皮質（腿部區）',
    nameEn: 'Left Motor Cortex (Leg)',
    descriptionZh: '控制右腿的運動',
    category: 'cerebrum',
  },
  motor_cortex_face_arm_r: {
    id: 'motor_cortex_face_arm_r',
    nameZh: '右側運動皮質（臉和手臂區）',
    nameEn: 'Right Motor Cortex (Face/Arm)',
    descriptionZh: '控制左側臉部和手臂的運動',
    category: 'cerebrum',
  },
  motor_cortex_face_arm_l: {
    id: 'motor_cortex_face_arm_l',
    nameZh: '左側運動皮質（臉和手臂區）',
    nameEn: 'Left Motor Cortex (Face/Arm)',
    descriptionZh: '控制右側臉部和手臂的運動',
    category: 'cerebrum',
  },

  // Cerebrum - Temporal
  temporal_lobe_r: {
    id: 'temporal_lobe_r',
    nameZh: '右側顳葉',
    nameEn: 'Right Temporal Lobe',
    descriptionZh: '負責聽覺處理和記憶',
    category: 'cerebrum',
  },
  temporal_lobe_l: {
    id: 'temporal_lobe_l',
    nameZh: '左側顳葉',
    nameEn: 'Left Temporal Lobe',
    descriptionZh: '負責聽覺處理、語言理解（韋尼克區）和記憶',
    category: 'cerebrum',
  },

  // Cerebrum - Parietal
  parietal_lobe_r: {
    id: 'parietal_lobe_r',
    nameZh: '右側頂葉',
    nameEn: 'Right Parietal Lobe',
    descriptionZh: '負責觸覺和空間感知',
    category: 'cerebrum',
  },
  parietal_lobe_l: {
    id: 'parietal_lobe_l',
    nameZh: '左側頂葉',
    nameEn: 'Left Parietal Lobe',
    descriptionZh: '負責觸覺和數學運算',
    category: 'cerebrum',
  },

  // Cerebrum - Occipital
  occipital_lobe_r: {
    id: 'occipital_lobe_r',
    nameZh: '右側枕葉',
    nameEn: 'Right Occipital Lobe',
    descriptionZh: '負責處理左側視野',
    category: 'cerebrum',
  },
  occipital_lobe_l: {
    id: 'occipital_lobe_l',
    nameZh: '左側枕葉',
    nameEn: 'Left Occipital Lobe',
    descriptionZh: '負責處理右側視野',
    category: 'cerebrum',
  },

  // Deep Structures
  internal_capsule_r: {
    id: 'internal_capsule_r',
    nameZh: '右側內囊',
    nameEn: 'Right Internal Capsule',
    descriptionZh: '連接大腦皮質和脊髓的神經通道',
    category: 'cerebrum',
  },
  internal_capsule_l: {
    id: 'internal_capsule_l',
    nameZh: '左側內囊',
    nameEn: 'Left Internal Capsule',
    descriptionZh: '連接大腦皮質和脊髓的神經通道',
    category: 'cerebrum',
  },
  basal_ganglia_r: {
    id: 'basal_ganglia_r',
    nameZh: '右側基底核',
    nameEn: 'Right Basal Ganglia',
    descriptionZh: '協調運動和習慣行為',
    category: 'cerebrum',
  },
  basal_ganglia_l: {
    id: 'basal_ganglia_l',
    nameZh: '左側基底核',
    nameEn: 'Left Basal Ganglia',
    descriptionZh: '協調運動和習慣行為',
    category: 'cerebrum',
  },
  thalamus_posterior_r: {
    id: 'thalamus_posterior_r',
    nameZh: '右側視丘後部',
    nameEn: 'Right Posterior Thalamus',
    descriptionZh: '感覺訊息的轉運站',
    category: 'cerebrum',
  },
  thalamus_posterior_l: {
    id: 'thalamus_posterior_l',
    nameZh: '左側視丘後部',
    nameEn: 'Left Posterior Thalamus',
    descriptionZh: '感覺訊息的轉運站',
    category: 'cerebrum',
  },

  // Cerebellum
  cerebellum_superior_r: {
    id: 'cerebellum_superior_r',
    nameZh: '右側小腦上部',
    nameEn: 'Right Superior Cerebellum',
    descriptionZh: '協調運動和平衡',
    category: 'cerebellum',
  },
  cerebellum_superior_l: {
    id: 'cerebellum_superior_l',
    nameZh: '左側小腦上部',
    nameEn: 'Left Superior Cerebellum',
    descriptionZh: '協調運動和平衡',
    category: 'cerebellum',
  },
  cerebellum_anterior_inferior_r: {
    id: 'cerebellum_anterior_inferior_r',
    nameZh: '右側小腦前下部',
    nameEn: 'Right Anterior Inferior Cerebellum',
    descriptionZh: '協調運動和聽覺',
    category: 'cerebellum',
  },
  cerebellum_anterior_inferior_l: {
    id: 'cerebellum_anterior_inferior_l',
    nameZh: '左側小腦前下部',
    nameEn: 'Left Anterior Inferior Cerebellum',
    descriptionZh: '協調運動和聽覺',
    category: 'cerebellum',
  },
  cerebellum_inferior_r: {
    id: 'cerebellum_inferior_r',
    nameZh: '右側小腦下部',
    nameEn: 'Right Inferior Cerebellum',
    descriptionZh: '協調平衡和姿勢',
    category: 'cerebellum',
  },
  cerebellum_inferior_l: {
    id: 'cerebellum_inferior_l',
    nameZh: '左側小腦下部',
    nameEn: 'Left Inferior Cerebellum',
    descriptionZh: '協調平衡和姿勢',
    category: 'cerebellum',
  },

  // Brainstem
  midbrain: {
    id: 'midbrain',
    nameZh: '中腦',
    nameEn: 'Midbrain',
    descriptionZh: '控制眼球運動和部分聽覺反射',
    category: 'brainstem',
  },
  pons: {
    id: 'pons',
    nameZh: '橋腦',
    nameEn: 'Pons',
    descriptionZh: '連接大腦和小腦，調節呼吸和睡眠',
    category: 'brainstem',
  },
  medulla_lateral_r: {
    id: 'medulla_lateral_r',
    nameZh: '右側延髓外側',
    nameEn: 'Right Lateral Medulla',
    descriptionZh: '控制吞嚥、聲音和身體左側的感覺',
    category: 'brainstem',
  },
  medulla_lateral_l: {
    id: 'medulla_lateral_l',
    nameZh: '左側延髓外側',
    nameEn: 'Left Lateral Medulla',
    descriptionZh: '控制吞嚥、聲音和身體右側的感覺',
    category: 'brainstem',
  },
  medulla_medial: {
    id: 'medulla_medial',
    nameZh: '延髓內側',
    nameEn: 'Medial Medulla',
    descriptionZh: '控制運動通路',
    category: 'brainstem',
  },
};
