/**
 * TODO(medical-review): All syndrome descriptions are simplified for lay audiences
 * and require review by medical professionals.
 */

export interface Syndrome {
  id: string;
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  /** 觸發此症候群的血管 ID 列表 */
  triggerVessels: string[];
}

export const syndromes: Syndrome[] = [
  {
    id: 'wallenberg',
    nameZh: '華倫堡氏症候群（外側延髓症候群）',
    nameEn: 'Wallenberg Syndrome (Lateral Medullary Syndrome)',
    descriptionZh: '可能出現眩暈、難以吞嚥、聲音沙啞、臉部或身體一側感覺異常。這是延髓外側受損的典型表現。',
    triggerVessels: ['pica_r', 'pica_l', 'vertebral_r', 'vertebral_l'],
  },
  {
    id: 'mca_syndrome',
    nameZh: '中大腦動脈症候群',
    nameEn: 'MCA Syndrome',
    descriptionZh: '可能出現對側（身體另一側）臉部和手臂無力、感覺喪失、視野缺損。若左側受影響，可能無法說話或理解語言。',
    triggerVessels: ['mca_m1_r', 'mca_m1_l'],
  },
  {
    id: 'basilar_occlusion',
    nameZh: '基底動脈阻塞',
    nameEn: 'Basilar Artery Occlusion',
    descriptionZh: '極為嚴重，可能導致雙側無力、意識改變、眼球運動障礙，甚至危及生命。需要立即急救。',
    triggerVessels: ['basilar'],
  },
];
