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
        // the same shares as the region's own supply (regions.ts, C7-F3)
        { v: 'asa', share: 0.85, at: 'mid' },
        { v: `va_v4_dist_${o(s)}`, share: 0.15, at: 'mid' },
      ],
    },
    excludes: [`asa_unilateral_${o(s)}`],
  })),
  // Artery of Percheron: one paramedian trunk from one P1 feeds both paramedian thalami. Its
  // infarcts come in four imaging patterns (37 patients, Lazzaro NA et al. AJNR 2010;31:1283–1289):
  // both paramedian thalami with the rostral midbrain 43%, without it 38%, with the anterior
  // thalami and the midbrain 14%, with the anterior thalami without the midbrain 5%. With the
  // midbrain, eye-movement and mental-status disturbances dominate and 25% had a good outcome
  // (mRS ≤ 2); without it, amnesia and mental-status changes, and 67% did well (15 patients, Arauz A
  // et al. J Stroke Cerebrovasc Dis 2014;23:1083–1088). `percheron_{s}` is the pattern without the
  // midbrain; `percheron_mid_{s}` and `percheron_ant_{s}` add the midbrain and the anterior thalami
  // and can be combined.
  ...perSide((s) => ({
    id: `percheron_${s}`,
    name: { zh: `Percheron 動脈（起自${sideZh(s)}側 P1）`, en: `Artery of Percheron (from ${sideEn(s).toLowerCase()} P1)` },
    desc: {
      zh: '單一條視丘穿通動脈同時供應雙側視丘旁正中；它一旦阻塞就會雙側梗塞，造成嗜睡、記憶障礙與垂直眼動障礙。這是不含中腦的型態；中腦或視丘前部也由它供應時，另見「含中腦」「含視丘前部」兩個變異。',
      en: 'A single thalamoperforating trunk feeds both paramedian thalami; its occlusion causes bilateral infarcts with drowsiness, amnesia and vertical gaze palsy. This is the pattern without the midbrain; when the trunk also feeds the midbrain or the anterior thalami, see the "with midbrain" and "with anterior thalamus" variants.',
    },
    prevalence: {
      zh: '一般人約 4–12% 有 Percheron 動脈；其梗塞中約 38% 不含中腦',
      en: '≈4–12% of people have an artery of Percheron; ≈38% of its infarcts spare the midbrain',
    },
    supplyOverride: {
      [`thalamus_paramedian_${s}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`thalamus_paramedian_${o(s)}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`midbrain_paramedian_${o(s)}`]: [
        { v: `mesencephalic_perf_${o(s)}`, share: 0.85 },
        { v: `thalamoperforator_${s}`, share: 0.15 },
      ],
    },
    excludes: [`percheron_${o(s)}`, `percheron_mid_${s}`, `percheron_mid_${o(s)}`, `percheron_ant_${s}`, `percheron_ant_${o(s)}`, `thalamomesencephalic_${o(s)}`],
  })),
  ...perSide((s) => ({
    id: `percheron_mid_${s}`,
    name: {
      zh: `Percheron 動脈含中腦分支（起自${sideZh(s)}側 P1）`,
      en: `Artery of Percheron with midbrain branches (from ${sideEn(s).toLowerCase()} P1)`,
    },
    desc: {
      zh: '同一條主幹除了雙側視丘旁正中，也供應兩側中腦上部的旁正中被蓋，是 Percheron 梗塞最常見的型態。阻塞時除了嗜睡、記憶障礙，還有動眼神經麻痺等眼球運動障礙與更深的意識障礙；長期功能良好的比例只有約 25%（不含中腦時約 67%）。可與「含視丘前部」合併。',
      en: 'The same trunk feeds both paramedian thalami and the paramedian tegmentum of the upper midbrain on both sides, the commonest pattern of Percheron infarction. Besides drowsiness and amnesia its occlusion gives oculomotor palsies and other eye-movement disorders and deeper impairment of consciousness; only about 25% do well in the long term (about 67% without the midbrain). Can be combined with "with anterior thalamus".',
    },
    prevalence: {
      zh: 'Percheron 梗塞中約 43% 含中腦（再加上視丘前部的約 14%）',
      en: '≈43% of Percheron infarcts include the midbrain (another ≈14% with the anterior thalami too)',
    },
    supplyOverride: {
      [`thalamus_paramedian_${s}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`thalamus_paramedian_${o(s)}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`midbrain_paramedian_${s}`]: [
        { v: `mesencephalic_perf_${s}`, share: 0.6 },
        { v: `thalamoperforator_${s}`, share: 0.4 },
      ],
      [`midbrain_paramedian_${o(s)}`]: [
        { v: `mesencephalic_perf_${o(s)}`, share: 0.6 },
        { v: `thalamoperforator_${s}`, share: 0.4 },
      ],
    },
    excludes: [
      `percheron_${s}`,
      `percheron_${o(s)}`,
      `percheron_mid_${o(s)}`,
      `percheron_ant_${o(s)}`,
      `thalamomesencephalic_${s}`,
      `thalamomesencephalic_${o(s)}`,
    ],
  })),
  ...perSide((s) => ({
    id: `percheron_ant_${s}`,
    name: {
      zh: `Percheron 動脈含視丘前部（起自${sideZh(s)}側 P1）`,
      en: `Artery of Percheron with anterior thalamus (from ${sideEn(s).toLowerCase()} P1)`,
    },
    desc: {
      zh: '結節視丘動脈缺如時，由同一條主幹供應雙側視丘前部與旁正中。阻塞時記憶與執行功能受損更廣，可能造成「視丘性失智」。單獨使用是不含中腦的型態；與「含中腦分支」合併則是視丘前部加中腦的型態。',
      en: 'When the tuberothalamic arteries are missing, the same trunk feeds both anterior and both paramedian thalami. Its occlusion damages memory and executive function more widely and can cause "thalamic dementia". On its own this is the pattern without the midbrain; combined with "with midbrain branches" it is the pattern with anterior thalami and midbrain.',
    },
    prevalence: {
      zh: 'Percheron 梗塞中約 14% 含視丘前部與中腦、約 5% 含視丘前部而不含中腦',
      en: '≈14% of Percheron infarcts include the anterior thalami and the midbrain, ≈5% the anterior thalami without the midbrain',
    },
    supplyOverride: {
      [`thalamus_paramedian_${s}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`thalamus_paramedian_${o(s)}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`thalamus_anterior_${s}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      [`thalamus_anterior_${o(s)}`]: [{ v: `thalamoperforator_${s}`, share: 1 }],
      // the midbrain is left to `percheron_mid_{s}`, so that the two combine in either order
    },
    excludes: [`percheron_${s}`, `percheron_${o(s)}`, `percheron_mid_${o(s)}`, `percheron_ant_${o(s)}`, `thalamomesencephalic_${o(s)}`],
  })),
  // A one-sided paramedian artery can also feed the rostral paramedian midbrain: a paramedian
  // thalamopeduncular (thalamomesencephalic) infarct (Castaigne P et al. Ann Neurol 1981;10:127–148).
  // Oculomotor palsy, mostly of vertical gaze, followed 76% of paramedian thalamic strokes (Hermann
  // DM et al. Stroke 2008;39:62–68), so midbrain extension is common.
  ...perSide((s) => ({
    id: `thalamomesencephalic_${s}`,
    name: {
      zh: `${sideZh(s)}側旁正中動脈也供應中腦`,
      en: `${sideEn(s)} paramedian artery also feeding the midbrain`,
    },
    desc: {
      zh: `${sideZh(s)}側視丘穿通動脈除了視丘旁正中，也供應同側中腦上部的旁正中被蓋。阻塞時視丘與中腦一起梗塞（視丘中腦旁正中梗塞）：除了嗜睡與記憶障礙，還有同側動眼神經麻痺與對側運動失調。`,
      en: `The ${sideEn(s).toLowerCase()} thalamoperforating artery feeds the paramedian tegmentum of the upper midbrain on the same side as well as the paramedian thalamus. Its occlusion infarcts both (a paramedian thalamomesencephalic infarct): drowsiness and amnesia plus a same-side oculomotor palsy and opposite-side ataxia.`,
    },
    prevalence: {
      zh: '常見：旁正中視丘梗塞約 76% 有眼動障礙（多為垂直眼動）',
      en: 'Common: eye-movement palsies (mostly vertical) in ≈76% of paramedian thalamic strokes',
    },
    supplyOverride: {
      [`midbrain_paramedian_${s}`]: [
        { v: `mesencephalic_perf_${s}`, share: 0.6 },
        { v: `thalamoperforator_${s}`, share: 0.4 },
      ],
    },
    excludes: [`percheron_${o(s)}`, `percheron_mid_${s}`, `percheron_mid_${o(s)}`, `percheron_ant_${o(s)}`],
  })),
];

export const VARIANT_BY_ID: Record<string, VariantDef> = indexById(VARIANTS, (v) => v.id);
