/**
 * Common anatomical variants of the circle of Willis and posterior circulation.
 * Prevalence figures are approximate ranges from MRA / autopsy series
 * (Krabbe-Hartkamp et al. Radiology 1998; Hindenes et al. PLoS One 2020).
 *
 * The default anatomy is a complete circle, which MRA series find in a minority of adults:
 * 42 % of 150 volunteers at 1.5 T (Krabbe-Hartkamp MJ et al. Radiology 1998;207:103–111) and
 * 11.9 % of 1,864 adults at 3 T, where the left and right PComm were missing or under 1 mm in
 * 60.6 % and 53.6 %, the AComm in 22.7 %, and both PComms in 27.8 % (the commonest variant;
 * Hindenes LB et al. The Tromsø Study. PLoS One 2020;15:e0241373). "Missing" on time-of-flight MRA
 * includes hypoplastic vessels that may still carry some flow; the variants here remove the vessel
 * (scale 0), the more extreme case.
 */

import type { L, Side, SupplyDef } from './types';
import { indexById } from './indexById';

export interface VariantDef {
  id: string;
  name: L;
  desc: L;
  prevalence: L;
  /**
   * radius multipliers by vessel id (0 = absent); for a vessel that only some people have
   * (`variantOnly`), the value is its radius scale when this variant adds it
   */
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
      zh: '左右前循環無法互相支援；一側內頸動脈阻塞時代償能力大減。MRA 研究中的「缺如」也包含直徑 < 1 mm、可能仍有少量血流的血管；模型則把它完全移除。',
      en: 'The two anterior circulations cannot support each other; compensation after ICA occlusion is much poorer. In MRA studies "missing" includes vessels under 1 mm that may still carry some flow; the model removes the vessel completely.',
    },
    prevalence: { zh: '約 20–25%（MRA）', en: '≈20–25% (MRA)' },
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
      zh: '前後循環在這一側不相通。MRA 研究中的「缺如」也包含直徑 < 1 mm、可能仍有少量血流的血管；模型則把它完全移除。',
      en: 'The anterior and posterior circulations are not connected on this side. In MRA studies "missing" includes vessels under 1 mm that may still carry some flow; the model removes the vessel completely.',
    },
    prevalence: { zh: '每側約 50–60%，雙側約 28%（MRA）', en: '≈50–60% per side; both ≈28% (MRA)' },
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
      zh: `基底動脈主要靠${o(s) === 'r' ? '右' : '左'}側椎動脈。優勢側阻塞時能否撐住，取決於後交通動脈能否從頸動脈逆向供應基底動脈：Willis 環完整時（本模型的預設，但只是少數人的解剖）可能沒有症狀；兩側後交通動脈都缺如或極細時（約 28% 的人）則可能造成嚴重的腦幹與小腦缺血。近端（頸部）阻塞時，頸部肌肉的側枝常還能部分補充。`,
      en: `The basilar artery depends mainly on the ${o(s) === 'r' ? 'right' : 'left'} vertebral artery. Whether occlusion of the dominant side is tolerated depends on the PComms filling the basilar artery backwards from the carotids: with a complete circle (the model's default, a minority anatomy) it can be silent; with both PComms missing or hypoplastic (about 28% of people) it can cause severe brainstem and cerebellar ischaemia. A proximal (neck) occlusion is often partly refilled through neck-muscle collaterals.`,
    },
    prevalence: { zh: '約 5–15%', en: '≈5–15%' },
    vesselScale: {
      [`va_extracranial_${s}`]: 0.55,
      [`va_v4_prox_${s}`]: 0.55,
      [`va_v4_dist_${s}`]: 0.55,
    },
  })),
  ...perSide((s) => ({
    // Huang W et al. Surg Radiol Anat 2023;45:947–957; Triantafyllou G et al. Neuroradiology
    // 2026;68:1607–1617 (see the vessel in vessels.ts)
    id: `persistent_trigeminal_${s}`,
    name: { zh: `${sideZh(s)}側永存三叉動脈`, en: `${sideEn(s)} persistent trigeminal artery` },
    desc: {
      zh: `胚胎時期的頸動脈—基底動脈吻合沒有消失：${sideZh(s)}側海綿竇段內頸動脈直接接上基底動脈中上段，接點以下的基底動脈較細（模型把它縮小）。基底動脈上段因此大多由這條內頸動脈供應，頸動脈的栓子可能經由它造成腦幹或小腦梗塞。`,
      en: `The embryonic carotid–basilar anastomosis persists: the ${sideEn(s).toLowerCase()} cavernous ICA joins the basilar artery directly, and the basilar artery below the junction is small (the model narrows it). The upper basilar artery is then fed largely by this ICA, and carotid emboli can reach the brainstem or cerebellum through it.`,
    },
    prevalence: { zh: '約 0.06–0.2%', en: '≈0.06–0.2%' },
    vesselScale: { [`trigeminal_persistent_${s}`]: 1, basilar_lower: 0.7, basilar_mid: 0.7 },
    excludes: [`persistent_trigeminal_${o(s)}`],
  })),
  ...perSide((s) => ({
    id: `asa_unilateral_${s}`,
    name: { zh: `前脊髓動脈只由${sideZh(s)}側椎動脈發出`, en: `Anterior spinal artery from the ${sideEn(s).toLowerCase()} vertebral only` },
    desc: {
      zh: `${o(s) === 'r' ? '右' : '左'}側的前脊髓動脈根部缺如，整條前脊髓動脈只靠${sideZh(s)}側椎動脈。${sideZh(s)}側椎動脈顱內段阻塞時，延髓外側與內側會一起梗塞（半側延髓／Babinski–Nageotte 症候群），甚至雙側延髓內側。`,
      en: `The ${o(s) === 'r' ? 'right' : 'left'} ASA root is missing, so the whole anterior spinal artery hangs on the ${sideEn(s).toLowerCase()} vertebral. Occluding that vertebral then infarcts both the lateral and medial medulla (hemimedullary / Babinski–Nageotte syndrome), sometimes both medial medullae.`,
    },
    prevalence: { zh: '常見，但各研究比例差異很大', en: 'Common; reported frequencies vary widely' },
    vesselScale: { [`asa_root_${o(s)}`]: 0 },
    supplyOverride: {
      [`medulla_medial_${o(s)}`]: [
        { v: 'asa', share: 0.8, at: 'mid' },
        { v: `va_v4_dist_${o(s)}`, share: 0.2, at: 'mid' },
      ],
    },
    excludes: [`asa_unilateral_${o(s)}`],
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
