/**
 * Third-party data and scientific sources used by the app. Rendered in the in-app
 * "Sources & licences" dialog and mirrored in THIRD_PARTY_NOTICES.md.
 */

import type { L } from './types';

export interface DataSource {
  id: string;
  name: string;
  use: L;
  licence: string;
  licenceUrl?: string;
  attribution: string;
  url: string;
  modified: boolean;
  /** licence text that must accompany copies */
  notice?: string;
}

/** Verbatim from the template's LICENSE file; required in all copies. */
export const MNI_NOTICE =
  'Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Permission to use, copy, modify, and distribute this software and its documentation for any purpose and without fee is hereby granted, provided that the above copyright notice appear in all copies. The authors and McGill University make no representations about the suitability of this software for any purpose. It is provided “as is” without express or implied warranty. The authors are not responsible for any data loss, equipment damage, property loss, or injury to subjects or patients resulting from the use or misuse of this software package.';

export const DATA_SOURCES: DataSource[] = [
  {
    id: 'icbm152',
    name: 'MNI ICBM 152 Nonlinear Asymmetric 2009c template (via TemplateFlow)',
    use: {
      zh: '大腦、小腦、腦幹與深部核團的 3D 表面（由機率圖與分割結果以 marching cubes 產生、簡化）。',
      en: 'Surfaces of the cerebrum, cerebellum, brainstem and deep nuclei (marching-cubes meshes, decimated).',
    },
    licence: 'McGill/MNI permissive licence (copyright notice required)',
    attribution:
      'Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University. Fonov V et al., NeuroImage 2011;54:313–327; Fonov V et al., NeuroImage 2009;47:S102. Distributed through TemplateFlow (Ciric R et al., Nat Methods 2022).',
    url: 'https://www.templateflow.org/ · http://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/',
    modified: true,
    notice: MNI_NOTICE,
  },
  {
    id: 'dkt',
    name: 'DKT31 cortical labels in MNI152NLin2009cAsym (Mindboggle OASIS-TRT-20 joint fusion)',
    use: {
      zh: '皮質腦迴分區（決定每個表面點屬於哪個功能腦區）。',
      en: 'Cortical gyral parcellation (assigns each surface point to a functional region).',
    },
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol. Front Neurosci 2012;6:171. Mindboggle-101 (Zenodo).',
    url: 'https://mindboggle.info/data',
    modified: true,
  },
  {
    id: 'aseg',
    name: 'FreeSurfer aseg segmentation of MNI152NLin2009cAsym (TemplateFlow)',
    use: {
      zh: '深部構造（視丘、尾狀核、殼核、蒼白球、海馬迴、杏仁核）與腦幹、小腦的分割。',
      en: 'Segmentation of deep nuclei, brainstem and cerebellum.',
    },
    licence: 'Template licence (McGill/MNI notice)',
    attribution: 'Fischl B et al. Neuron 2002;33:341–355 (FreeSurfer). Provided by TemplateFlow.',
    url: 'https://www.templateflow.org/',
    modified: true,
  },
  {
    id: 'mial',
    name: 'MIAL67 probabilistic atlas of thalamic nuclei',
    use: {
      zh: '把視丘分成前部、旁正中、腹外側、後部等血管供應區。',
      en: 'Splits the thalamus into anterior, paramedian, ventrolateral and posterior vascular territories.',
    },
    licence: 'CC BY 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    attribution: 'Najdenovska E et al. In-vivo probabilistic atlas of human thalamic nuclei based on diffusion-weighted MRI. Sci Data 2018;5:180270.',
    url: 'https://doi.org/10.5281/zenodo.1241074',
    modified: true,
  },
  {
    id: 'liu',
    name: 'Digital 3D Brain MRI Arterial Territories Atlas',
    use: {
      zh: '每個腦組織體素的動脈供應區（前、中、後大腦動脈各分部、豆紋、脈絡叢、小腦動脈），並據此找出分水嶺區。',
      en: 'Arterial territory of every tissue voxel (ACA, MCA and PCA subdivisions, lenticulostriate, choroidal, cerebellar), and the border zones between them.',
    },
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
    attribution:
      'Digital 3D Brain MRI Arterial Territories Atlas © 2021 The Johns Hopkins University. Liu CF, Hsu J, Xu X, et al. Sci Data 2023;10:74.',
    url: 'https://github.com/Chin-Fu-Liu/Arterial_Atlas',
    modified: true,
  },
  {
    id: 'mouches',
    name: 'Statistical atlas of cerebral arteries (multi-centre MRA)',
    use: {
      zh: '把手繪的血管中心線校正到統計上真實的血管位置（Willis 環、基底動脈、椎動脈、M1、A1/A2、P1/P2 等）。',
      en: 'Snaps hand-authored centrelines onto statistically real artery positions (circle of Willis, basilar, vertebral, M1, A1/A2, P1/P2 …).',
    },
    licence: 'CC0 1.0',
    licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    attribution: 'Mouches P, Forkert ND. A statistical atlas of cerebral arteries generated using multi-center MRA datasets from healthy subjects. Sci Data 2019;6:29.',
    url: 'https://doi.org/10.6084/m9.figshare.c.4215089',
    modified: true,
  },
];

export const SCIENTIFIC_REFERENCES: string[] = [
  'Alastruey J, Parker KH, Peiró J, Byrd SM, Sherwin SJ. Modelling the circle of Willis to assess the effects of anatomical variations and occlusions on cerebral flows. J Biomech 2007;40:1794–1805. (Vessel dimensions; also the openBF implementation, Apache-2.0.)',
  'Astrup J, Siesjö BK, Symon L. Thresholds in cerebral ischemia – the ischemic penumbra. Stroke 1981;12:723–725.',
  'Campbell BCV et al. Cerebral blood flow is the optimal CT perfusion parameter for assessing infarct core. Stroke 2011;42:3435–3440.',
  'Saver JL. Time is brain—quantified. Stroke 2006;37:263–266.',
  'Albers GW et al. Magnetic resonance imaging profiles predict clinical response to early reperfusion: the DEFUSE study. Ann Neurol 2006;60:508–517.',
  'Davis SM et al. Effects of alteplase beyond 3 h after stroke in the Echoplanar Imaging Thrombolytic Evaluation Trial (EPITHET). Lancet Neurol 2008;7:299–309.',
  'Oppenheim C et al. Prediction of malignant middle cerebral artery infarction by diffusion-weighted imaging. Stroke 2000;31:2175–2181.',
  'Vahedi K et al. Early decompressive surgery in malignant infarction of the middle cerebral artery: a pooled analysis of three randomised controlled trials. Lancet Neurol 2007;6:215–222.',
  'Wijdicks EFM et al. Recommendations for the management of cerebral and cerebellar infarction with swelling. Stroke 2014;45:1222–1238.',
  'Krabbe-Hartkamp MJ et al. Circle of Willis: morphologic variation on three-dimensional time-of-flight MR angiograms. Radiology 1998;207:103–111.',
  'Hindenes LB et al. Variations in the circle of Willis in a large population sample using 3D TOF angiography: the Tromsø Study. PLoS One 2020;15:e0241373.',
  'Dirnagl U, Iadecola C, Moskowitz MA. Pathobiology of ischaemic stroke: an integrated view. Trends Neurosci 1999;22:391–397.',
  'Pantano P, Baron JC et al. Crossed cerebellar diaschisis. Brain 1986;109:677–694.',
  'Kuhn MJ et al. Wallerian degeneration after cerebral infarction: evaluation with sequential MR imaging. Radiology 1989;172:179–182.',
  'Thomalla G et al. DTI detects early Wallerian degeneration of the pyramidal tract after ischemic stroke. NeuroImage 2004;22:1767–1774.',
  'Goto N, Kaneko M. Olivary enlargement: chronological and morphometric analyses. Acta Neuropathol 1981;54:275–282.',
  'Kitajima M et al. Hypertrophic olivary degeneration: MR imaging and pathologic findings. Radiology 1994;192:539–543.',
  'Tatu L, Moulin T, Bogousslavsky J, Duvernoy H. Arterial territories of the human brain. Neurology 1998;50:1699–1708 (and brainstem & cerebellum, Neurology 1996;47:1125–1135).',
  'Schmahmann JD. Vascular syndromes of the thalamus. Stroke 2003;34:2264–2278.',
  'Fiester P, Rao D, Soule E et al. Anatomic, functional, and radiographic review of the brainstem. RadioGraphics 2019 (brainstem syndrome framing, also used by neuroaxis-atlas, MIT).',
  'Brott T et al. Measurements of acute cerebral infarction: a clinical examination scale (NIHSS). Stroke 1989;20:864–870.',
  'Donnan GA et al. Striatocapsular infarction: clinical and radiological features. Brain 1991;114:51–70.',
  'Parvizi J, Damasio AR. Neuroanatomical correlates of brainstem coma. Brain 2003;126:1524–1536.',
  'Goyal M et al. Endovascular treatment of stroke due to medium-vessel occlusion (ESCAPE-MeVO). N Engl J Med 2025;392:1385–1395.',
  'Psychogios M et al. Endovascular treatment for stroke due to occlusion of medium or distal vessels (DISTAL). N Engl J Med 2025;392:1374–1384.',
];

export const INSPIRATIONS: { name: string; licence: string; url: string; note: L }[] = [
  {
    name: 'openBF (INSIGNEO)',
    licence: 'Apache-2.0',
    url: 'https://github.com/INSIGNEO/openBF',
    note: { zh: '參考其 Alastruey 2007 Willis 環模型的血管半徑與長度；未複製程式碼。', en: 'Vessel radii/lengths of its Alastruey 2007 circle-of-Willis model used as reference; no code copied.' },
  },
  {
    name: 'WillisWorks',
    licence: 'GPL-3.0',
    url: 'https://github.com/abhogal-lab/WillisWorks',
    note: { zh: '啟發了自動調節、竊血與側枝的教學呈現方式；因授權不相容，只參考概念、未使用任何程式碼。', en: 'Inspired the teaching presentation of autoregulation, steal and collaterals; concepts only — no code used (licence incompatible).' },
  },
  {
    name: 'neuroaxis-atlas',
    licence: 'MIT',
    url: 'https://github.com/linkbag/neuroaxis-atlas',
    note: { zh: '參考其腦幹症候群卡片與資料來源標示方式。', en: 'Its brainstem syndrome cards and attribution practice informed ours.' },
  },
  {
    name: 'brain-game',
    licence: 'MIT (code)',
    url: 'https://github.com/Rickaym/brain-game',
    note: { zh: '參考其腦區—動脈對照與中風模擬的教學構想；其 3D 模型為 CC BY-SA 2.1 JP，本專案未使用。', en: 'Its region–artery mapping and stroke-simulator ideas informed ours; its 3D model (CC BY-SA 2.1 JP) is not used here.' },
  },
];
