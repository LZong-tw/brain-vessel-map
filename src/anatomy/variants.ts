/**
 * Common anatomical variants of the circle of Willis and posterior circulation.
 * Prevalence figures are approximate ranges from MRA / autopsy series
 * (Krabbe-Hartkamp et al. Radiology 1998; Hindenes et al. PLoS One 2020).
 */

import type { L, Side, SupplyDef } from './types';
import { indexById } from './indexById';

export interface VariantDef {
  id: string;
  name: L;
  desc: L;
  prevalence: L;
  /** radius multipliers by vessel id (0 = absent) */
  vesselScale?: Record<string, number>;
  /** replace the supply of whole regions (all their beds) */
  supplyOverride?: Record<string, SupplyDef[]>;
  /** variants that cannot be combined with this one */
  excludes?: string[];
}

const sideZh = (s: Side) => (s === 'r' ? '右' : '左');
const sideEn = (s: Side) => (s === 'r' ? 'Right' : 'Left');
const o = (s: Side): Side => (s === 'r' ? 'l' : 'r');

function perSide(make: (s: Side) => VariantDef): VariantDef[] {
  return [make('r'), make('l')];
}

export const VARIANTS: VariantDef[] = [
  {
    id: 'acomm_absent',
    name: { zh: '前交通動脈缺如／極細', en: 'Absent / hypoplastic AComm' },
    desc: {
      zh: '左右前循環無法互相支援；一側內頸動脈阻塞時代償能力大減。',
      en: 'The two anterior circulations cannot support each other; compensation after ICA occlusion is much poorer.',
    },
    prevalence: { zh: '約 1–10%', en: '≈1–10%' },
    vesselScale: { acomm: 0 },
  },
  ...perSide((s) => ({
    id: `a1_hypoplastic_${s}`,
    name: { zh: `${sideZh(s)}側 A1 發育不良`, en: `${sideEn(s)} A1 hypoplasia` },
    desc: {
      zh: `${sideZh(s)}側前大腦動脈主要靠對側經前交通動脈供血；對側 A1 或內頸動脈阻塞時，可能雙側前大腦動脈區同時梗塞。`,
      en: `The ${sideEn(s).toLowerCase()} ACA is fed mainly from the other side through the AComm; if the other A1 or ICA fails, both ACA territories can infarct.`,
    },
    prevalence: { zh: '約 5–10%', en: '≈5–10%' },
    vesselScale: { [`aca_a1_${s}`]: 0.45 },
  })),
  ...perSide((s) => ({
    id: `pcomm_absent_${s}`,
    name: { zh: `${sideZh(s)}側後交通動脈缺如`, en: `${sideEn(s)} PComm absent` },
    desc: {
      zh: '前後循環在這一側不相通。',
      en: 'The anterior and posterior circulations are not connected on this side.',
    },
    prevalence: { zh: '單側約 20–30%', en: '≈20–30% (one side)' },
    vesselScale: { [`pcomm_${s}`]: 0 },
    excludes: [`fetal_pca_${s}`],
  })),
  ...perSide((s) => ({
    id: `fetal_pca_${s}`,
    name: { zh: `${sideZh(s)}側胚胎型後大腦動脈`, en: `${sideEn(s)} fetal-type PCA` },
    desc: {
      zh: '後大腦動脈主要由內頸動脈經粗大的後交通動脈供血，P1 很細。內頸動脈的栓子因此可能造成枕葉梗塞。',
      en: 'The PCA is supplied mainly by the ICA through a large PComm with a tiny P1, so carotid emboli can reach the occipital lobe.',
    },
    prevalence: { zh: '約 10–30%', en: '≈10–30%' },
    vesselScale: { [`pcomm_${s}`]: 1.6, [`pca_p1_${s}`]: 0.3 },
    excludes: [`pcomm_absent_${s}`],
  })),
  ...perSide((s) => ({
    id: `va_hypoplastic_${s}`,
    name: { zh: `${sideZh(s)}側椎動脈發育不良`, en: `${sideEn(s)} vertebral hypoplasia` },
    desc: {
      zh: `基底動脈主要靠${o(s) === 'r' ? '右' : '左'}側椎動脈；優勢側阻塞時後循環代償困難。`,
      en: `The basilar artery depends mainly on the ${o(s) === 'r' ? 'right' : 'left'} vertebral artery; occlusion of the dominant side is poorly tolerated.`,
    },
    prevalence: { zh: '約 5–15%', en: '≈5–15%' },
    vesselScale: {
      [`va_extracranial_${s}`]: 0.55,
      [`va_v4_prox_${s}`]: 0.55,
      [`va_v4_dist_${s}`]: 0.55,
    },
  })),
  ...perSide((s) => ({
    id: `percheron_${s}`,
    name: { zh: `Percheron 動脈（起自${sideZh(s)}側 P1）`, en: `Artery of Percheron (from ${sideEn(s).toLowerCase()} P1)` },
    desc: {
      zh: '單一條視丘穿通動脈同時供應雙側視丘旁正中與中腦上部；它一旦阻塞就會雙側梗塞，造成昏睡、記憶與垂直眼動障礙。',
      en: 'A single thalamoperforating trunk feeds both paramedian thalami and the upper midbrain; its occlusion causes bilateral infarcts with stupor, amnesia and vertical gaze palsy.',
    },
    prevalence: { zh: '約 4–12%', en: '≈4–12%' },
    supplyOverride: {
      [`thalamus_paramedian_${s}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`thalamus_paramedian_${o(s)}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`midbrain_paramedian_${o(s)}`]: [
        { v: `mesencephalic_perf_${o(s)}`, share: 0.7 },
        { v: `thalamoperforator_${s}`, share: 0.3 },
      ],
    },
    excludes: [`percheron_${o(s)}`],
  })),
];

export const VARIANT_BY_ID: Record<string, VariantDef> = indexById(VARIANTS, (v) => v.id);
