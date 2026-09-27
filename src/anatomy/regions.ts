/**
 * Functional brain regions.
 *
 * Cortical regions follow the DKT gyral atlas (Klein & Tourville 2012) with a few
 * functional subdivisions (e.g. the leg area of the motor strip). Their arterial supply is
 * derived voxel-by-voxel from the Liu et al. (2023) arterial territory atlas — see
 * `territories.ts`. Deep, brainstem and cerebellar regions carry hand-authored supply based
 * on Tatu et al. (1996, 1998), Schmahmann (2003) and Fiester et al. (2019).
 *
 * Deficit laterality: 'contra' = body side opposite the lesion, 'ipsi' = same side.
 * TODO(medical-review): simplified for lay education.
 */

import type { RegionDef } from './types';

const bi = (r: Omit<RegionDef, 'bilateral'>): RegionDef => ({ ...r, bilateral: true });
const mid = (r: Omit<RegionDef, 'bilateral'>): RegionDef => ({ ...r, bilateral: false });

const CORTEX_CBF = 45;
const DEEP_CBF = 50;
const WM_CBF = 22;
const BS_CBF = 38;
const CB_CBF = 48;

export const REGION_DEFS: RegionDef[] = [
  // ═══════════════════════ Frontal lobe ═══════════════════════
  bi({
    id: 'frontopolar_orbital_medial',
    name: { zh: '額極與內側眼眶額葉', en: 'Frontal pole & medial orbitofrontal cortex' },
    func: {
      zh: '整合情緒與獎賞、做決定、調節社會行為。',
      en: 'Integrates emotion and reward, decision-making and social behaviour.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'disinhibition', lat: 'none', sev: 1 },
      { s: 'executive', lat: 'none', sev: 1 },
      { s: 'disinhibition', lat: 'none', sev: 3, bilateralOnly: true },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'orbitofrontal_lateral',
    name: { zh: '外側眼眶額葉', en: 'Lateral orbitofrontal cortex' },
    func: {
      zh: '衝動抑制、情緒調節，把感覺與價值連結。',
      en: 'Impulse control, emotional regulation, linking sensation with value.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [{ s: 'disinhibition', lat: 'none', sev: 1 }],
    compartment: 'supra',
  }),
  bi({
    id: 'prefrontal_dorsolateral',
    name: { zh: '背外側前額葉（含額葉眼動區）', en: 'Dorsolateral prefrontal cortex (incl. frontal eye field)' },
    func: {
      zh: '工作記憶、計畫與注意力；後部的額葉眼動區負責把雙眼轉向對側。',
      en: 'Working memory, planning and attention; the frontal eye field at its back turns both eyes to the opposite side.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'executive', lat: 'none', sev: 2 },
      { s: 'gaze_deviation', lat: 'ipsi', sev: 2 },
      { s: 'aphasia_tc_motor', lat: 'none', only: 'l', sev: 1 },
      { s: 'abulia', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'broca',
    name: { zh: '額下迴（島蓋部、三角部）', en: 'Inferior frontal gyrus (opercular & triangular parts)' },
    nameBySide: {
      l: { zh: '左額下迴（布洛卡區）', en: "Left inferior frontal gyrus (Broca's area)" },
      r: { zh: '右額下迴（布洛卡對應區）', en: 'Right inferior frontal gyrus (Broca homologue)' },
    },
    func: {
      zh: '左側：說話的語言產出與文法；右側：語調與情緒的表達。',
      en: 'Left: speech production and grammar. Right: prosody and emotional expression.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'aphasia_broca', lat: 'none', only: 'l', sev: 2 },
      { s: 'apraxia_of_speech', lat: 'none', only: 'l', sev: 1 },
      { s: 'aprosodia', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'medial_frontal',
    name: { zh: '額上迴與輔助運動區', en: 'Superior frontal gyrus & supplementary motor area' },
    func: {
      zh: '啟動與規劃動作、雙手協調、主動性。',
      en: 'Initiating and sequencing movement, bimanual coordination, drive.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'abulia', lat: 'none', sev: 1 },
      { s: 'leg_weak', lat: 'contra', sev: 1 },
      { s: 'arm_weak_proximal', lat: 'contra', sev: 1 },
      { s: 'alien_hand', lat: 'contra', sev: 1 },
      { s: 'aphasia_tc_motor', lat: 'none', only: 'l', sev: 1 },
      { s: 'incontinence', lat: 'none', sev: 1 },
      { s: 'akinetic_mutism', lat: 'none', sev: 3, bilateralOnly: true },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'cingulate',
    name: { zh: '扣帶迴', en: 'Cingulate gyrus' },
    func: {
      zh: '動機、情緒、注意力與疼痛的情緒面；後扣帶與記憶有關。',
      en: 'Motivation, emotion, attention and the affective side of pain; the posterior part supports memory.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'abulia', lat: 'none', sev: 2 },
      { s: 'emotional', lat: 'none', sev: 1 },
      { s: 'akinetic_mutism', lat: 'none', sev: 3, bilateralOnly: true },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'precentral_face_arm',
    name: { zh: '中央前迴（臉、手、手臂運動區）', en: 'Precentral gyrus (face, hand & arm motor area)' },
    func: {
      zh: '初級運動皮質：控制對側下半臉、舌頭、手與手臂的自主運動。',
      en: 'Primary motor cortex for the opposite lower face, tongue, hand and arm.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'face_weak', lat: 'contra', sev: 3 },
      { s: 'arm_weak', lat: 'contra', sev: 3 },
      { s: 'hand_clumsy', lat: 'contra', sev: 2 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'spasticity', lat: 'contra', sev: 2 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'postcentral_face_arm',
    name: { zh: '中央後迴（臉與手臂感覺區）', en: 'Postcentral gyrus (face & arm sensory area)' },
    func: {
      zh: '初級體感覺皮質：感受對側臉與手臂的觸覺、位置感。',
      en: 'Primary somatosensory cortex for touch and position sense of the opposite face and arm.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'sens_face_arm', lat: 'contra', sev: 3 },
      { s: 'cortical_sensory', lat: 'contra', sev: 2 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'paracentral',
    name: { zh: '旁中央小葉（腿部運動與感覺區）', en: 'Paracentral lobule (leg motor & sensory area)' },
    func: {
      zh: '控制並感受對側腿與腳；也參與排尿的自主控制。',
      en: 'Moves and feels the opposite leg and foot; also involved in voluntary bladder control.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'leg_weak', lat: 'contra', sev: 3 },
      { s: 'sens_leg', lat: 'contra', sev: 2 },
      { s: 'incontinence', lat: 'none', sev: 1 },
      { s: 'spasticity', lat: 'contra', sev: 2 },
    ],
    compartment: 'supra',
  }),

  // ═══════════════════════ Parietal lobe ═══════════════════════
  bi({
    id: 'superior_parietal',
    name: { zh: '頂上小葉', en: 'Superior parietal lobule' },
    func: {
      zh: '整合感覺與視覺，引導伸手與手眼協調、身體與空間定位。',
      en: 'Integrates touch and vision to guide reaching; body and spatial orientation.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'cortical_sensory', lat: 'contra', sev: 1 },
      { s: 'optic_ataxia', lat: 'none', sev: 1 },
      { s: 'neglect', lat: 'none', only: 'r', sev: 1 },
      { s: 'visuospatial', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'supramarginal',
    name: { zh: '緣上迴', en: 'Supramarginal gyrus' },
    func: {
      zh: '左側：語音處理、句子複誦與動作規劃；右側：空間注意力與身體覺察。',
      en: 'Left: phonological processing, repetition and praxis. Right: spatial attention and body awareness.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'aphasia_conduction', lat: 'none', only: 'l', sev: 2 },
      { s: 'apraxia', lat: 'none', only: 'l', sev: 2 },
      { s: 'neglect', lat: 'none', only: 'r', sev: 2 },
      { s: 'anosognosia', lat: 'none', only: 'r', sev: 1 },
      { s: 'cortical_sensory', lat: 'contra', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'angular',
    name: { zh: '角迴（頂下小葉）', en: 'Angular gyrus (inferior parietal lobule)' },
    func: {
      zh: '左側：閱讀、書寫、計算、手指與左右辨識；右側：空間注意力。',
      en: 'Left: reading, writing, calculation, finger and left–right knowledge. Right: spatial attention.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'alexia', lat: 'none', only: 'l', sev: 2 },
      { s: 'agraphia', lat: 'none', only: 'l', sev: 2 },
      { s: 'acalculia', lat: 'none', only: 'l', sev: 2 },
      { s: 'finger_agnosia', lat: 'none', only: 'l', sev: 2 },
      { s: 'aphasia_tc_sensory', lat: 'none', only: 'l', sev: 1 },
      { s: 'neglect', lat: 'none', only: 'r', sev: 2 },
      { s: 'visuospatial', lat: 'none', only: 'r', sev: 2 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'precuneus',
    name: { zh: '楔前葉', en: 'Precuneus' },
    func: {
      zh: '心像、自我相關處理與情節記憶的提取、空間想像。',
      en: 'Mental imagery, self-referential processing, episodic memory retrieval and spatial imagery.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'visuospatial', lat: 'none', sev: 1 },
      { s: 'topographic', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),

  // ═══════════════════════ Temporal lobe & insula ═══════════════════════
  bi({
    id: 'superior_temporal_posterior',
    name: { zh: '顳上迴後部與聽覺皮質', en: 'Posterior superior temporal gyrus & auditory cortex' },
    nameBySide: {
      l: { zh: '左顳上迴後部（韋尼克區）與聽覺皮質', en: "Left posterior STG (Wernicke's area) & auditory cortex" },
      r: { zh: '右顳上迴後部與聽覺皮質', en: 'Right posterior STG & auditory cortex' },
    },
    func: {
      zh: '聽覺處理；左側為理解語言的中樞，右側處理語氣與音樂。',
      en: 'Hearing; the left side decodes language, the right side tone of voice and music.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'aphasia_wernicke', lat: 'none', only: 'l', sev: 2 },
      { s: 'aprosodia', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'temporal_lateral',
    name: { zh: '顳葉外側（顳上、中、下迴）', en: 'Lateral temporal cortex (superior, middle, inferior gyri)' },
    func: {
      zh: '聽覺聯合與語意記憶；深部白質有視放射的 Meyer 環（對側上方視野）。',
      en: "Auditory association and semantic memory; the optic radiation's Meyer loop (opposite upper visual field) runs beneath it.",
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'quadrant_sup', lat: 'contra', sev: 1 },
      { s: 'aphasia_wernicke', lat: 'none', only: 'l', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'temporal_pole',
    name: { zh: '顳極', en: 'Temporal pole' },
    func: {
      zh: '人與事物的語意知識、社會與情緒認知。',
      en: 'Semantic knowledge about people and things; social and emotional cognition.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [{ s: 'emotional', lat: 'none', sev: 1 }],
    compartment: 'supra',
  }),
  bi({
    id: 'insula',
    name: { zh: '島葉', en: 'Insula' },
    func: {
      zh: '身體內在感受（心跳、疼痛、飢餓）、味覺、自主神經（心律、血壓）控制；左前島葉參與說話的動作規劃。',
      en: 'Interoception (heartbeat, pain, hunger), taste and autonomic control of heart rate and blood pressure; the left anterior insula helps plan speech movements.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'autonomic_cardiac', lat: 'none', only: 'r', sev: 2 },
      { s: 'autonomic_cardiac', lat: 'none', only: 'l', sev: 1 },
      { s: 'apraxia_of_speech', lat: 'none', only: 'l', sev: 1 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'anosognosia', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'inferior_temporal_fusiform',
    name: { zh: '梭狀迴與顳葉下表面', en: 'Fusiform gyrus & inferior temporal surface' },
    func: {
      zh: '辨識物體、臉孔（右側為主）與顏色；左側的「視覺字形區」負責辨認文字。',
      en: 'Recognising objects, faces (mainly right) and colour; the left "visual word form area" recognises written words.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'prosopagnosia', lat: 'none', only: 'r', sev: 1 },
      { s: 'prosopagnosia', lat: 'none', sev: 3, bilateralOnly: true },
      { s: 'visual_agnosia', lat: 'none', sev: 2, bilateralOnly: true },
      { s: 'achromatopsia', lat: 'none', sev: 1 },
      { s: 'alexia', lat: 'none', only: 'l', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'parahippocampal',
    name: { zh: '海馬旁迴與內嗅皮質', en: 'Parahippocampal & entorhinal cortex' },
    func: {
      zh: '記憶進出海馬迴的門戶，也處理場景與方向感。',
      en: 'Gateway of memory to the hippocampus; also processes scenes and navigation.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'amnesia', lat: 'none', sev: 1 },
      { s: 'amnesia', lat: 'none', sev: 3, bilateralOnly: true },
      { s: 'topographic', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),

  // ═══════════════════════ Occipital lobe ═══════════════════════
  bi({
    id: 'cuneus',
    name: { zh: '楔葉（距狀溝上唇）', en: 'Cuneus (upper bank of the calcarine fissure)' },
    func: {
      zh: '初級視覺皮質的上半：看見對側「下方」的視野。',
      en: 'Upper half of primary visual cortex: sees the opposite LOWER visual quadrant.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [{ s: 'quadrant_inf', lat: 'contra', sev: 2 }],
    compartment: 'supra',
  }),
  bi({
    id: 'lingual',
    name: { zh: '舌迴（距狀溝下唇）', en: 'Lingual gyrus (lower bank of the calcarine fissure)' },
    func: {
      zh: '初級視覺皮質的下半：看見對側「上方」的視野；也參與顏色知覺。',
      en: 'Lower half of primary visual cortex: sees the opposite UPPER visual quadrant; also colour perception.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'quadrant_sup', lat: 'contra', sev: 2 },
      { s: 'achromatopsia', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'occipital_pole',
    name: { zh: '枕極（黃斑中心視力區）', en: 'Occipital pole (macular / central vision)' },
    func: {
      zh: '處理視野正中央的細節（閱讀、辨識臉孔所需）。',
      en: 'Processes the centre of the visual field (needed for reading and faces).',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [{ s: 'central_scotoma', lat: 'contra', sev: 2 }],
    compartment: 'supra',
  }),
  bi({
    id: 'lateral_occipital',
    name: { zh: '外側枕葉（視覺聯合區）', en: 'Lateral occipital cortex (visual association)' },
    func: {
      zh: '把線條組合成物體，並感知動作（V5 區）。',
      en: 'Assembles contours into objects and perceives motion (area V5).',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'visual_agnosia', lat: 'none', sev: 2, bilateralOnly: true },
      { s: 'simultanagnosia', lat: 'none', sev: 2, bilateralOnly: true },
      { s: 'optic_ataxia', lat: 'none', sev: 2, bilateralOnly: true },
    ],
    compartment: 'supra',
  }),

  // ═══════════════════════ Commissures ═══════════════════════
  bi({
    id: 'corpus_callosum',
    name: { zh: '胼胝體（膝部與體部）', en: 'Corpus callosum (genu & body)' },
    func: {
      zh: '連接左右大腦的最大纖維束，協調雙手與左右半球的資訊。',
      en: 'The largest fibre bundle linking the hemispheres; coordinates the two hands and shares information.',
    },
    category: 'deep',
    cbf: WM_CBF,
    supply: [{ v: 'aca_pericallosal_{s}', share: 1 }],
    deficits: [
      { s: 'apraxia', lat: 'none', sev: 1 },
      { s: 'alien_hand', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'splenium',
    name: { zh: '胼胝體壓部', en: 'Splenium of the corpus callosum' },
    func: {
      zh: '把右半球的視覺資訊傳到左半球的語言區。',
      en: 'Carries visual information from the right hemisphere to the left-hemisphere language areas.',
    },
    category: 'deep',
    cbf: WM_CBF,
    supply: [
      { v: 'pca_splenial_{s}', share: 0.7 },
      { v: 'aca_pericallosal_{s}', share: 0.3 },
    ],
    deficits: [],
    compartment: 'supra',
  }),

  bi({
    id: 'corona_radiata',
    name: { zh: '放射冠與深部白質', en: 'Corona radiata & deep white matter' },
    func: {
      zh: '皮質與深部結構之間的纖維通道，運動與感覺纖維在此匯集後進入內囊。由豆紋動脈與皮質動脈的髓質支共同供應，兩者交界是「內分水嶺」。',
      en: 'Fibre highway between the cortex and deep nuclei; motor and sensory fibres converge here before entering the internal capsule. Fed by lenticulostriate and cortical medullary branches — their meeting line is the "internal watershed".',
    },
    category: 'deep',
    cbf: WM_CBF,
    deficits: [
      { s: 'face_weak', lat: 'contra', sev: 2 },
      { s: 'arm_weak', lat: 'contra', sev: 2 },
      { s: 'leg_weak', lat: 'contra', sev: 2 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'hand_clumsy', lat: 'contra', sev: 1 },
      { s: 'sens_hemibody', lat: 'contra', sev: 1 },
      { s: 'spasticity', lat: 'contra', sev: 1 },
    ],
    compartment: 'supra',
  }),

  // ═══════════════════════ Deep grey & internal capsule ═══════════════════════
  bi({
    id: 'caudate_head',
    name: { zh: '尾狀核頭（含依核）', en: 'Caudate head (incl. nucleus accumbens)' },
    func: {
      zh: '額葉—基底核迴路的一環：動機、學習、認知控制。',
      en: 'Part of frontal–basal ganglia loops: motivation, learning and cognitive control.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'heubner_{s}', share: 0.7 },
      { v: 'lenticulostriate_{s}', share: 0.3 },
    ],
    deficits: [
      { s: 'abulia', lat: 'none', sev: 2 },
      { s: 'executive', lat: 'none', sev: 1 },
      { s: 'movement_disorder', lat: 'contra', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'caudate_body',
    name: { zh: '尾狀核體部', en: 'Caudate body' },
    func: { zh: '與認知及動作學習有關。', en: 'Cognitive and motor learning loops.' },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'lenticulostriate_{s}', share: 0.8 },
      { v: 'acha_{s}', share: 0.2 },
    ],
    deficits: [
      { s: 'executive', lat: 'none', sev: 1 },
      { s: 'abulia', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'putamen',
    name: { zh: '殼核', en: 'Putamen' },
    func: {
      zh: '基底核的運動入口：動作的選擇與流暢度。',
      en: 'Motor input nucleus of the basal ganglia: selection and fluency of movement.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'lenticulostriate_{s}', share: 0.9 },
      { v: 'heubner_{s}', share: 0.1 },
    ],
    deficits: [
      { s: 'movement_disorder', lat: 'contra', sev: 1 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'globus_pallidus',
    name: { zh: '蒼白球', en: 'Globus pallidus' },
    func: { zh: '基底核的輸出站，調節動作的幅度。', en: 'Output station of the basal ganglia, scaling movement.' },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'lenticulostriate_{s}', share: 0.5 },
      { v: 'acha_{s}', share: 0.5 },
    ],
    deficits: [
      { s: 'movement_disorder', lat: 'contra', sev: 1 },
      { s: 'abulia', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'ic_anterior_limb',
    name: { zh: '內囊前肢', en: 'Internal capsule, anterior limb' },
    func: {
      zh: '額葉與視丘、橋腦之間的纖維通道。',
      en: 'Fibres linking the frontal lobe with the thalamus and pons.',
    },
    category: 'deep',
    cbf: WM_CBF,
    supply: [
      { v: 'heubner_{s}', share: 0.5 },
      { v: 'lenticulostriate_{s}', share: 0.5 },
    ],
    deficits: [
      { s: 'executive', lat: 'none', sev: 1 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'ic_genu',
    name: { zh: '內囊膝部', en: 'Internal capsule, genu' },
    func: {
      zh: '皮質延髓徑通過處：控制對側臉部、舌頭與吞嚥的運動指令。',
      en: 'Corticobulbar fibres: motor commands for the opposite face, tongue and swallowing.',
    },
    category: 'deep',
    cbf: WM_CBF,
    supply: [
      { v: 'lenticulostriate_{s}', share: 0.6 },
      { v: 'acha_{s}', share: 0.4 },
    ],
    deficits: [
      { s: 'face_weak', lat: 'contra', sev: 3 },
      { s: 'dysarthria', lat: 'none', sev: 2 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'ic_posterior_limb',
    name: { zh: '內囊後肢', en: 'Internal capsule, posterior limb' },
    func: {
      zh: '皮質脊髓徑高度集中處：很小的梗塞就能造成對側臉、手、腳同等程度的癱瘓（純運動性中風）。',
      en: 'The corticospinal tract is tightly packed here: a tiny infarct can paralyse the opposite face, arm and leg equally (pure motor stroke).',
    },
    category: 'deep',
    cbf: WM_CBF,
    supply: [
      { v: 'lenticulostriate_{s}', share: 0.5 },
      { v: 'acha_{s}', share: 0.5 },
    ],
    deficits: [
      { s: 'face_weak', lat: 'contra', sev: 3 },
      { s: 'arm_weak', lat: 'contra', sev: 3 },
      { s: 'leg_weak', lat: 'contra', sev: 3 },
      // thalamocortical fibres run in the posterior third; the classic lacune spares them
      { s: 'sens_hemibody', lat: 'contra', sev: 1, spareInLacune: true },
      { s: 'spasticity', lat: 'contra', sev: 2 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'thalamus_anterior',
    name: { zh: '視丘前部（前核、腹前核）', en: 'Anterior thalamus (anterior & ventral anterior nuclei)' },
    func: {
      zh: '記憶迴路（Papez 迴路）的中繼站，也參與動機與語言。',
      en: 'Relay of the Papez memory circuit; also drive and language.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [{ v: 'tuberothalamic_{s}', share: 1 }],
    deficits: [
      { s: 'amnesia', lat: 'none', sev: 2 },
      { s: 'abulia', lat: 'none', sev: 1 },
      { s: 'aphasia_tc_sensory', lat: 'none', only: 'l', sev: 1 },
      { s: 'neglect', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'thalamus_paramedian',
    name: { zh: '視丘旁正中（內背核、板內核）', en: 'Paramedian thalamus (mediodorsal & intralaminar nuclei)' },
    func: {
      zh: '維持清醒（網狀活化系統的一部分）、記憶與執行功能、垂直眼動。',
      en: 'Arousal (part of the reticular activating system), memory, executive function and vertical gaze.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [{ v: 'thalamoperforator_{s}', share: 1 }],
    deficits: [
      { s: 'somnolence', lat: 'none', sev: 2 },
      { s: 'amnesia', lat: 'none', sev: 2 },
      { s: 'vertical_gaze_palsy', lat: 'none', sev: 1 },
      { s: 'abulia', lat: 'none', sev: 1 },
      { s: 'coma', lat: 'none', sev: 2, bilateralOnly: true },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'thalamus_ventrolateral',
    name: { zh: '視丘腹外側（感覺轉運核 VPL/VPM 與 VL）', en: 'Ventrolateral thalamus (VPL/VPM sensory relay & VL)' },
    func: {
      zh: '全身感覺傳到大腦皮質的轉運站；VL 核轉送小腦的協調訊號。',
      en: 'Relays all body sensation to the cortex; the VL nucleus relays cerebellar coordination signals.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [{ v: 'thalamogeniculate_{s}', share: 1 }],
    deficits: [
      { s: 'sens_hemibody', lat: 'contra', sev: 3 },
      // a sensory lacune sits in VPL/VPM; the motor thalamus (VL) is usually spared
      { s: 'ataxia_limb', lat: 'contra', sev: 1, spareInLacune: true },
      { s: 'movement_disorder', lat: 'contra', sev: 1, spareInLacune: true },
      { s: 'central_pain', lat: 'contra', sev: 2 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'thalamus_posterior',
    name: { zh: '視丘後部（視丘枕、外側膝狀體）', en: 'Posterior thalamus (pulvinar & lateral geniculate body)' },
    func: {
      zh: '外側膝狀體是視覺轉運站；視丘枕參與視覺注意力。',
      en: 'The lateral geniculate body relays vision; the pulvinar supports visual attention.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'posterior_choroidal_{s}', share: 0.8 },
      { v: 'acha_{s}', share: 0.2 },
    ],
    deficits: [
      { s: 'hemianopia', lat: 'contra', sev: 1 },
      { s: 'neglect', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'hippocampus',
    name: { zh: '海馬迴', en: 'Hippocampus' },
    func: {
      zh: '形成新記憶；左側偏語言記憶、右側偏空間記憶。',
      en: 'Forms new memories; left for verbal, right for spatial memory.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'pca_temporal_{s}', share: 0.7 },
      { v: 'acha_{s}', share: 0.3 },
    ],
    deficits: [
      { s: 'amnesia', lat: 'none', sev: 2 },
      { s: 'amnesia', lat: 'none', sev: 3, bilateralOnly: true },
      { s: 'topographic', lat: 'none', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'amygdala',
    name: { zh: '杏仁核', en: 'Amygdala' },
    func: { zh: '恐懼與情緒記憶。', en: 'Fear and emotional memory.' },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'acha_{s}', share: 0.6 },
      { v: 'mca_temporal_anterior_{s}', share: 0.4 },
    ],
    deficits: [{ s: 'emotional', lat: 'none', sev: 1 }],
    compartment: 'supra',
  }),
  bi({
    id: 'optic_tract',
    name: { zh: '視徑', en: 'Optic tract' },
    func: {
      zh: '視交叉之後的視覺纖維，攜帶雙眼對側半邊視野的資訊。',
      en: 'Visual fibres behind the chiasm carrying the opposite half of the visual field from both eyes.',
    },
    category: 'deep',
    cbf: WM_CBF,
    fixedVolume: 0.4,
    supply: [{ v: 'acha_{s}', share: 1 }],
    deficits: [{ s: 'hemianopia', lat: 'contra', sev: 2 }],
    compartment: 'supra',
  }),

  // ═══════════════════════ Midbrain ═══════════════════════
  bi({
    id: 'midbrain_peduncle',
    name: { zh: '中腦：大腦腳', en: 'Midbrain: cerebral peduncle' },
    func: {
      zh: '所有下行運動纖維通過處；動眼神經纖維也從這裡穿出。',
      en: 'All descending motor fibres pass here; oculomotor nerve fibres exit through it.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'mesencephalic_perf_{s}', share: 0.4 },
      { v: 'pca_p2_{s}', share: 0.2, at: 'mid' },
      { v: 'acha_{s}', share: 0.4 },
    ],
    structures: [
      { name: { zh: '皮質脊髓徑', en: 'Corticospinal tract' }, role: { zh: '對側肢體運動', en: 'Movement of the opposite limbs' } },
      { name: { zh: '皮質延髓徑', en: 'Corticobulbar tract' }, role: { zh: '臉、舌、吞嚥的運動指令', en: 'Face, tongue and swallowing commands' } },
      { name: { zh: '動眼神經纖維', en: 'Oculomotor (CN III) fascicles' }, role: { zh: '同側眼球運動、眼瞼、瞳孔', en: 'Same-side eye movement, eyelid, pupil' } },
      { name: { zh: '黑質', en: 'Substantia nigra' }, role: { zh: '多巴胺神經元，動作啟動', en: 'Dopamine neurons for movement initiation' } },
    ],
    deficits: [
      { s: 'face_weak', lat: 'contra', sev: 3 },
      { s: 'arm_weak', lat: 'contra', sev: 3 },
      { s: 'leg_weak', lat: 'contra', sev: 3 },
      { s: 'spasticity', lat: 'contra', sev: 2 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'midbrain_paramedian',
    name: { zh: '中腦：旁正中被蓋', en: 'Midbrain: paramedian tegmentum' },
    func: {
      zh: '動眼神經核、紅核、垂直眼動中樞與維持清醒的網狀結構。',
      en: 'Oculomotor nucleus, red nucleus, vertical gaze centres and the arousal (reticular) system.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'mesencephalic_perf_{s}', share: 0.7 },
      { v: 'thalamoperforator_{s}', share: 0.3 },
    ],
    structures: [
      { name: { zh: '動眼神經核', en: 'Oculomotor nucleus' }, role: { zh: '眼球上下內轉、提眼瞼、縮瞳', en: 'Up/down/in eye movement, lid, pupil' } },
      { name: { zh: '紅核', en: 'Red nucleus' }, role: { zh: '小腦訊號中繼，受損造成對側顫抖', en: 'Cerebellar relay; lesions cause opposite-side tremor' } },
      { name: { zh: '內側縱束嘴側間質核（riMLF）', en: 'rostral interstitial nucleus of MLF' }, role: { zh: '垂直眼動', en: 'Vertical gaze' } },
      { name: { zh: '中腦網狀結構', en: 'Mesencephalic reticular formation' }, role: { zh: '維持清醒', en: 'Arousal' } },
      { name: { zh: '滑車神經核（下丘高度）', en: 'Trochlear nucleus (inferior-colliculus level)' }, role: { zh: '對側眼向下內看', en: 'Opposite eye looking down & in' } },
    ],
    deficits: [
      { s: 'cn3_palsy', lat: 'ipsi', sev: 3 },
      { s: 'cn4_palsy', lat: 'contra', sev: 1 },
      { s: 'tremor', lat: 'contra', sev: 2 },
      { s: 'ataxia_limb', lat: 'contra', sev: 1 },
      { s: 'vertical_gaze_palsy', lat: 'none', sev: 2 },
      { s: 'somnolence', lat: 'none', sev: 2 },
      { s: 'diplopia', lat: 'none', sev: 2 },
      { s: 'coma', lat: 'none', sev: 3, bilateralOnly: true },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'midbrain_lateral',
    name: { zh: '中腦：外側被蓋', en: 'Midbrain: lateral tegmentum' },
    func: {
      zh: '上行感覺路徑（痛溫覺、本體覺）與下行交感纖維通過。',
      en: 'Ascending sensory pathways (pain, temperature, position) and descending sympathetic fibres.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'quadrigeminal_{s}', share: 0.4 },
      { v: 'sca_{s}', share: 0.3, at: 'mid' },
      { v: 'pca_p2_{s}', share: 0.3, at: 'mid' },
    ],
    structures: [
      { name: { zh: '脊髓視丘徑', en: 'Spinothalamic tract' }, role: { zh: '對側身體痛溫覺', en: 'Opposite-side pain & temperature' } },
      { name: { zh: '內側蹄系', en: 'Medial lemniscus' }, role: { zh: '對側本體覺', en: 'Opposite-side position sense' } },
      { name: { zh: '下行交感纖維', en: 'Descending sympathetic fibres' }, role: { zh: '同側瞳孔與流汗', en: 'Same-side pupil & sweating' } },
    ],
    deficits: [
      { s: 'pain_temp_body', lat: 'contra', sev: 2 },
      { s: 'pain_temp_face', lat: 'contra', sev: 1 },
      { s: 'proprio_loss', lat: 'contra', sev: 1 },
      { s: 'horner', lat: 'ipsi', sev: 1 },
      { s: 'ataxia_limb', lat: 'contra', sev: 1 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'midbrain_tectum',
    name: { zh: '中腦：頂蓋（上丘、下丘、頂蓋前區）', en: 'Midbrain: tectum (colliculi & pretectum)' },
    func: {
      zh: '視覺與聽覺反射、眼球定向、瞳孔對光反射與向上看。',
      en: 'Visual and auditory reflexes, orienting, pupillary light reflex and upgaze.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'quadrigeminal_{s}', share: 0.6 },
      { v: 'sca_{s}', share: 0.2, at: 'mid' },
      { v: 'posterior_choroidal_{s}', share: 0.2 },
    ],
    structures: [
      { name: { zh: '上丘', en: 'Superior colliculus' }, role: { zh: '視覺定向、眼球快速轉向', en: 'Visual orienting, saccades' } },
      { name: { zh: '下丘', en: 'Inferior colliculus' }, role: { zh: '聽覺中繼', en: 'Auditory relay' } },
      { name: { zh: '頂蓋前區', en: 'Pretectal area' }, role: { zh: '瞳孔對光反射、向上凝視', en: 'Pupillary light reflex, upgaze' } },
    ],
    deficits: [
      { s: 'upgaze_palsy', lat: 'none', sev: 2 },
      { s: 'nystagmus', lat: 'none', sev: 1 },
      { s: 'diplopia', lat: 'none', sev: 1 },
    ],
    compartment: 'infra',
  }),

  // ═══════════════════════ Pons ═══════════════════════
  bi({
    id: 'pons_rostral_basis',
    name: { zh: '橋腦上部：腹側基底部', en: 'Upper pons: ventral basis' },
    func: {
      zh: '下行運動纖維與把大腦訊息轉到小腦的橋核。',
      en: 'Descending motor fibres and the pontine nuclei relaying cortex to cerebellum.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [{ v: 'pontine_paramedian_rostral_{s}', share: 1 }],
    structures: [
      { name: { zh: '皮質脊髓徑', en: 'Corticospinal tract' }, role: { zh: '對側肢體運動', en: 'Opposite limb movement' } },
      { name: { zh: '皮質延髓徑', en: 'Corticobulbar tract' }, role: { zh: '臉與吞嚥', en: 'Face & swallowing' } },
      { name: { zh: '橋核與橋小腦纖維', en: 'Pontine nuclei & pontocerebellar fibres' }, role: { zh: '大腦→小腦的協調資訊', en: 'Cortex→cerebellum coordination' } },
    ],
    deficits: [
      { s: 'arm_weak', lat: 'contra', sev: 3 },
      { s: 'leg_weak', lat: 'contra', sev: 3 },
      { s: 'face_weak', lat: 'contra', sev: 2 },
      { s: 'dysarthria', lat: 'none', sev: 2 },
      { s: 'ataxia_limb', lat: 'contra', sev: 1 },
      { s: 'hand_clumsy', lat: 'contra', sev: 1 },
      { s: 'spasticity', lat: 'contra', sev: 2 },
      // both corticobulbar tracts cut together (not just one) is anarthria + severe dysphagia,
      // not merely a worse version of the unilateral picture (Bauer et al. 1979; Patterson &
      // Grabois 1986)
      { s: 'anarthria', lat: 'none', sev: 3, bilateralOnly: true },
      { s: 'dysphagia', lat: 'none', sev: 3, bilateralOnly: true },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'pons_rostral_tegmentum',
    name: { zh: '橋腦上部：旁正中被蓋', en: 'Upper pons: paramedian tegmentum' },
    func: {
      zh: '內側縱束（協調雙眼）、橋腦網狀活化系統與藍斑核（清醒）。',
      en: 'MLF (yokes the eyes), pontine reticular activating system and locus coeruleus (arousal).',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'pontine_paramedian_rostral_{s}', share: 0.7 },
      { v: 'sca_{s}', share: 0.3, at: 'mid' },
    ],
    structures: [
      { name: { zh: '內側縱束（MLF）', en: 'Medial longitudinal fasciculus' }, role: { zh: '雙眼水平同向運動', en: 'Yokes horizontal eye movements' } },
      { name: { zh: '橋腦嘴側網狀結構', en: 'Rostral pontine reticular formation' }, role: { zh: '維持清醒', en: 'Arousal' } },
      { name: { zh: '內側蹄系', en: 'Medial lemniscus' }, role: { zh: '對側本體覺', en: 'Opposite position sense' } },
    ],
    deficits: [
      { s: 'ino', lat: 'ipsi', sev: 2 },
      { s: 'proprio_loss', lat: 'contra', sev: 1 },
      { s: 'diplopia', lat: 'none', sev: 1 },
      { s: 'coma', lat: 'none', sev: 3, bilateralOnly: true },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'pons_rostral_lateral',
    name: { zh: '橋腦上部：外側', en: 'Upper pons: lateral' },
    func: {
      zh: '三叉神經核（臉部感覺與咀嚼）、上小腦腳（小腦輸出）與上行感覺路徑。',
      en: 'Trigeminal nuclei (facial sensation, chewing), superior cerebellar peduncle (cerebellar output) and ascending sensory tracts.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      // the lateral tegmentum (trigeminal, vestibular and cochlear nuclei, spinothalamic tract) is
      // the territory of the long circumferential arteries; the short circumferential branches of
      // the basilar mainly supply the anterolateral basis, so a basilar occlusion with patent
      // AICA/SCA spares it (Tatu L et al. Neurology 1996;47:1125–1135). TODO(medical-review): share
      { v: 'sca_{s}', share: 0.9, at: 'mid' },
      { v: 'pontine_circumferential_{s}', share: 0.1 },
    ],
    structures: [
      { name: { zh: '三叉神經主感覺核與運動核', en: 'Trigeminal principal sensory & motor nuclei' }, role: { zh: '同側臉部感覺、咀嚼', en: 'Same-side facial sensation, chewing' } },
      { name: { zh: '上小腦腳', en: 'Superior cerebellar peduncle' }, role: { zh: '小腦輸出（協調）', en: 'Cerebellar output' } },
      { name: { zh: '脊髓視丘徑', en: 'Spinothalamic tract' }, role: { zh: '對側身體痛溫覺', en: 'Opposite pain & temperature' } },
      { name: { zh: '下行交感纖維', en: 'Descending sympathetic fibres' }, role: { zh: '同側霍納氏症候群', en: 'Same-side Horner' } },
    ],
    deficits: [
      { s: 'ataxia_limb', lat: 'ipsi', sev: 2 },
      { s: 'sens_face_all', lat: 'ipsi', sev: 2 },
      { s: 'jaw_weak', lat: 'ipsi', sev: 1 },
      { s: 'pain_temp_body', lat: 'contra', sev: 2 },
      { s: 'pain_temp_face', lat: 'contra', sev: 1 },
      { s: 'horner', lat: 'ipsi', sev: 1 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'pons_caudal_basis',
    name: { zh: '橋腦下部：腹側基底部', en: 'Lower pons: ventral basis' },
    func: {
      zh: '下行運動纖維；外展神經纖維從這裡穿出。',
      en: 'Descending motor fibres; the abducens nerve fascicles exit through here.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'pontine_paramedian_caudal_{s}', share: 0.65 },
      { v: 'pontine_paramedian_inferior_{s}', share: 0.35 },
    ],
    structures: [
      { name: { zh: '皮質脊髓徑', en: 'Corticospinal tract' }, role: { zh: '對側肢體運動', en: 'Opposite limb movement' } },
      { name: { zh: '外展神經纖維', en: 'Abducens (CN VI) fascicles' }, role: { zh: '同側眼球外展', en: 'Same-side eye abduction' } },
      { name: { zh: '橋小腦纖維', en: 'Pontocerebellar fibres' }, role: { zh: '協調', en: 'Coordination' } },
    ],
    deficits: [
      { s: 'arm_weak', lat: 'contra', sev: 3 },
      { s: 'leg_weak', lat: 'contra', sev: 3 },
      { s: 'face_weak', lat: 'contra', sev: 2 },
      { s: 'cn6_palsy', lat: 'ipsi', sev: 2 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'ataxia_limb', lat: 'contra', sev: 1 },
      { s: 'spasticity', lat: 'contra', sev: 2 },
      // both corticobulbar tracts cut together (not just one) is anarthria + severe dysphagia,
      // not merely a worse version of the unilateral picture (Bauer et al. 1979; Patterson &
      // Grabois 1986)
      { s: 'anarthria', lat: 'none', sev: 3, bilateralOnly: true },
      { s: 'dysphagia', lat: 'none', sev: 3, bilateralOnly: true },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'pons_caudal_tegmentum',
    name: { zh: '橋腦下部：旁正中被蓋', en: 'Lower pons: paramedian tegmentum' },
    func: {
      zh: '水平眼動中樞（外展神經核、PPRF）與顏面神經膝部（「顏面丘」）。',
      en: 'Horizontal gaze centre (abducens nucleus, PPRF) and the facial nerve genu (facial colliculus).',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'pontine_paramedian_caudal_{s}', share: 0.45 },
      { v: 'pontine_paramedian_inferior_{s}', share: 0.15 },
      { v: 'pontine_circumferential_{s}', share: 0.4 },
    ],
    structures: [
      { name: { zh: '外展神經核與 PPRF', en: 'Abducens nucleus & PPRF' }, role: { zh: '雙眼水平轉向同側', en: 'Horizontal gaze to the same side' } },
      { name: { zh: '內側縱束', en: 'MLF' }, role: { zh: '協調雙眼', en: 'Yokes the eyes' } },
      { name: { zh: '顏面神經膝部', en: 'Facial nerve genu' }, role: { zh: '同側整側臉運動', en: 'Same-side whole-face movement' } },
      { name: { zh: '內側蹄系', en: 'Medial lemniscus' }, role: { zh: '對側本體覺', en: 'Opposite position sense' } },
    ],
    deficits: [
      { s: 'gaze_palsy_horizontal', lat: 'ipsi', sev: 3 },
      { s: 'ino', lat: 'ipsi', sev: 2 },
      { s: 'face_weak_peripheral', lat: 'ipsi', sev: 2 },
      { s: 'proprio_loss', lat: 'contra', sev: 1 },
      { s: 'diplopia', lat: 'none', sev: 2 },
      // extending into the caudal pontine tegmentum on both sides can also disturb automatic
      // (non-volitional) breathing — apneustic or cluster patterns (Plum & Posner, The
      // Diagnosis of Stupor and Coma). TODO(medical-review): "moderate" (sev 2) is an
      // educational approximation; real severity ranges from mild irregularity to
      // ventilator dependence and is not captured by this model.
      { s: 'respiratory', lat: 'none', sev: 2, bilateralOnly: true },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'pons_caudal_lateral',
    name: { zh: '橋腦下部：外側', en: 'Lower pons: lateral' },
    func: {
      zh: '顏面神經核、前庭與耳蝸神經核、三叉神經脊髓束核、小腦中腳。',
      en: 'Facial nucleus, vestibular and cochlear nuclei, spinal trigeminal nucleus, middle cerebellar peduncle.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      // the lateral tegmentum (trigeminal, vestibular and cochlear nuclei, spinothalamic tract) is
      // the territory of the long circumferential arteries; the short circumferential branches of
      // the basilar mainly supply the anterolateral basis, so a basilar occlusion with patent
      // AICA/SCA spares it (Tatu L et al. Neurology 1996;47:1125–1135). TODO(medical-review): share
      { v: 'aica_{s}', share: 0.9, at: 'mid' },
      { v: 'pontine_circumferential_{s}', share: 0.1 },
    ],
    structures: [
      { name: { zh: '顏面神經核', en: 'Facial nucleus' }, role: { zh: '同側整側臉運動', en: 'Same-side whole-face movement' } },
      { name: { zh: '前庭與耳蝸神經核', en: 'Vestibular & cochlear nuclei' }, role: { zh: '平衡與聽覺', en: 'Balance & hearing' } },
      { name: { zh: '三叉神經脊髓束核', en: 'Spinal trigeminal nucleus' }, role: { zh: '同側臉部痛溫覺', en: 'Same-side facial pain & temperature' } },
      { name: { zh: '小腦中腳', en: 'Middle cerebellar peduncle' }, role: { zh: '進入小腦的主要通道', en: 'Main input to the cerebellum' } },
    ],
    deficits: [
      { s: 'face_weak_peripheral', lat: 'ipsi', sev: 3 },
      { s: 'hearing_loss', lat: 'ipsi', sev: 2 },
      { s: 'vertigo', lat: 'none', sev: 2 },
      { s: 'nystagmus', lat: 'none', sev: 2 },
      { s: 'nausea_vomiting', lat: 'none', sev: 1 },
      { s: 'pain_temp_face', lat: 'ipsi', sev: 2 },
      { s: 'pain_temp_body', lat: 'contra', sev: 2 },
      { s: 'horner', lat: 'ipsi', sev: 1 },
      { s: 'ataxia_limb', lat: 'ipsi', sev: 2 },
    ],
    compartment: 'infra',
  }),

  // ═══════════════════════ Medulla ═══════════════════════
  bi({
    id: 'medulla_medial',
    name: { zh: '延髓內側', en: 'Medial medulla' },
    func: {
      zh: '錐體（運動纖維，尚未交叉）、內側蹄系與舌下神經核；腹外側的下橄欖核也由前方的脊髓前動脈／椎動脈分支供應。',
      en: 'Pyramid (motor fibres before they cross), medial lemniscus and hypoglossal nucleus; the inferior olive, ventrolaterally, is also fed from the front (anterior spinal / vertebral branches).',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'asa_root_{s}', share: 0.8, at: 'mid' },
      { v: 'va_v4_dist_{s}', share: 0.2, at: 'mid' },
    ],
    structures: [
      { name: { zh: '錐體', en: 'Pyramid' }, role: { zh: '對側手腳運動（臉部已在上方分出）', en: 'Opposite arm & leg movement (face fibres already left)' } },
      { name: { zh: '內側蹄系', en: 'Medial lemniscus' }, role: { zh: '對側本體與振動覺', en: 'Opposite position & vibration sense' } },
      { name: { zh: '舌下神經核', en: 'Hypoglossal nucleus' }, role: { zh: '同側舌頭運動', en: 'Same-side tongue movement' } },
      { name: { zh: '下橄欖核', en: 'Inferior olive' }, role: { zh: '運動學習；齒狀核或紅核受損後可能肥大退化', en: 'Motor learning; may degenerate after dentate or red nucleus lesions' } },
    ],
    deficits: [
      { s: 'arm_weak', lat: 'contra', sev: 3 },
      { s: 'leg_weak', lat: 'contra', sev: 3 },
      { s: 'proprio_loss', lat: 'contra', sev: 2 },
      { s: 'tongue_weak', lat: 'ipsi', sev: 2 },
      { s: 'spasticity', lat: 'contra', sev: 2 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'medulla_lateral',
    name: { zh: '延髓外側', en: 'Lateral medulla' },
    func: {
      zh: '吞嚥與發聲（疑核）、臉與身體痛溫覺路徑、平衡（前庭核）、交感神經、打嗝與嘔吐中樞——位在下橄欖核後方的楔形區。',
      en: 'Swallowing and voice (nucleus ambiguus), pain/temperature pathways, balance (vestibular nuclei), sympathetic fibres, hiccup and vomiting centres — a wedge lying behind the inferior olive.',
    },
    category: 'brainstem',
    cbf: BS_CBF,
    supply: [
      { v: 'lat_medullary_perf_{s}', share: 0.72 },
      { v: 'pica_{s}', share: 0.28, at: 'mid' },
    ],
    structures: [
      { name: { zh: '疑核（IX、X）', en: 'Nucleus ambiguus (IX, X)' }, role: { zh: '吞嚥、聲帶、軟顎', en: 'Swallowing, vocal cord, palate' } },
      { name: { zh: '三叉神經脊髓束核', en: 'Spinal trigeminal nucleus' }, role: { zh: '同側臉部痛溫覺', en: 'Same-side facial pain & temperature' } },
      { name: { zh: '脊髓視丘徑', en: 'Spinothalamic tract' }, role: { zh: '對側身體痛溫覺', en: 'Opposite body pain & temperature' } },
      { name: { zh: '前庭神經核', en: 'Vestibular nuclei' }, role: { zh: '平衡、眼震、眩暈', en: 'Balance, nystagmus, vertigo' } },
      { name: { zh: '下小腦腳', en: 'Inferior cerebellar peduncle' }, role: { zh: '同側協調', en: 'Same-side coordination' } },
      { name: { zh: '下行交感纖維', en: 'Descending sympathetic fibres' }, role: { zh: '同側霍納氏症候群', en: 'Same-side Horner' } },
    ],
    deficits: [
      { s: 'dysphagia', lat: 'none', sev: 3 },
      { s: 'hoarseness', lat: 'ipsi', sev: 2 },
      { s: 'pain_temp_face', lat: 'ipsi', sev: 2 },
      { s: 'pain_temp_body', lat: 'contra', sev: 2 },
      { s: 'vertigo', lat: 'none', sev: 2 },
      { s: 'nystagmus', lat: 'none', sev: 2 },
      { s: 'nausea_vomiting', lat: 'none', sev: 2 },
      { s: 'horner', lat: 'ipsi', sev: 2 },
      { s: 'ataxia_limb', lat: 'ipsi', sev: 2 },
      { s: 'hiccups', lat: 'none', sev: 1 },
      { s: 'central_pain', lat: 'contra', sev: 1 },
      { s: 'respiratory', lat: 'none', sev: 2, bilateralOnly: true },
    ],
    compartment: 'infra',
  }),

  // ═══════════════════════ Cerebellum ═══════════════════════
  bi({
    id: 'cerebellum_superior',
    name: { zh: '小腦半球上部', en: 'Superior cerebellar hemisphere' },
    func: {
      zh: '協調同側手腳的精細動作與說話。',
      en: 'Coordinates fine movements of the same-side limbs and speech.',
    },
    category: 'cerebellum',
    cbf: CB_CBF,
    supply: [{ v: 'sca_lateral_{s}', share: 1 }],
    deficits: [
      { s: 'ataxia_limb', lat: 'ipsi', sev: 3 },
      { s: 'dysarthria', lat: 'none', sev: 2 },
      { s: 'ataxia_gait', lat: 'none', sev: 1 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'vermis_superior',
    name: { zh: '小腦上蚓部', en: 'Superior vermis' },
    func: { zh: '軀幹平衡與步態。', en: 'Trunk balance and gait.' },
    category: 'cerebellum',
    cbf: CB_CBF,
    supply: [{ v: 'sca_medial_{s}', share: 1 }],
    deficits: [
      { s: 'ataxia_gait', lat: 'none', sev: 2 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'dentate',
    name: { zh: '齒狀核', en: 'Dentate nucleus' },
    func: {
      zh: '小腦最大的輸出核，把協調訊號送回大腦（經紅核與視丘）。',
      en: 'Main output nucleus of the cerebellum, sending coordination signals back to the cortex (via red nucleus and thalamus).',
    },
    category: 'cerebellum',
    cbf: CB_CBF,
    supply: [
      { v: 'sca_medial_{s}', share: 0.8 },
      { v: 'sca_lateral_{s}', share: 0.2 },
    ],
    deficits: [
      { s: 'ataxia_limb', lat: 'ipsi', sev: 2 },
      { s: 'tremor', lat: 'ipsi', sev: 2 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'cerebellum_anterior_inferior',
    name: { zh: '小腦前下部（絨球與岩骨面）', en: 'Anterior-inferior cerebellum (flocculus & petrosal surface)' },
    func: {
      zh: '絨球穩定眼球與前庭反射，其餘部分協調同側動作。',
      en: 'The flocculus stabilises gaze and vestibular reflexes; the rest coordinates same-side movement.',
    },
    category: 'cerebellum',
    cbf: CB_CBF,
    supply: [{ v: 'aica_{s}', share: 1 }],
    deficits: [
      { s: 'vertigo', lat: 'none', sev: 2 },
      { s: 'nystagmus', lat: 'none', sev: 2 },
      { s: 'ataxia_limb', lat: 'ipsi', sev: 2 },
      { s: 'nausea_vomiting', lat: 'none', sev: 1 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'cerebellum_posterior_inferior',
    name: { zh: '小腦半球下部', en: 'Inferior cerebellar hemisphere' },
    func: { zh: '協調同側肢體與步態、平衡。', en: 'Coordination of same-side limbs, gait and balance.' },
    category: 'cerebellum',
    cbf: CB_CBF,
    supply: [{ v: 'pica_lateral_{s}', share: 1 }],
    deficits: [
      { s: 'ataxia_limb', lat: 'ipsi', sev: 2 },
      { s: 'ataxia_gait', lat: 'none', sev: 2 },
      { s: 'vertigo', lat: 'none', sev: 2 },
      { s: 'nausea_vomiting', lat: 'none', sev: 2 },
      { s: 'nystagmus', lat: 'none', sev: 1 },
    ],
    compartment: 'infra',
  }),
  bi({
    id: 'vermis_inferior',
    name: { zh: '小腦下蚓部與扁桃體', en: 'Inferior vermis & tonsil' },
    func: {
      zh: '前庭—小腦功能：姿勢、平衡與眼動控制。',
      en: 'Vestibulocerebellar function: posture, balance and eye-movement control.',
    },
    category: 'cerebellum',
    cbf: CB_CBF,
    supply: [{ v: 'pica_medial_{s}', share: 1 }],
    deficits: [
      { s: 'vertigo', lat: 'none', sev: 3 },
      { s: 'ataxia_gait', lat: 'none', sev: 3 },
      { s: 'nystagmus', lat: 'none', sev: 2 },
      { s: 'nausea_vomiting', lat: 'none', sev: 2 },
    ],
    compartment: 'infra',
  }),

  // ═══════════════════════ Non-brain beds ═══════════════════════
  bi({
    id: 'retina',
    name: { zh: '視網膜與眼球', en: 'Retina & eye' },
    func: { zh: '感光並把影像傳給大腦。', en: 'Senses light and sends images to the brain.' },
    category: 'eye',
    cbf: 0,
    flow: 12,
    fixedVolume: 0,
    // the central retinal artery arises early from the ophthalmic artery (end artery)
    supply: [{ v: 'ophthalmic_{s}', share: 1, at: 'mid' }],
    deficits: [{ s: 'monocular_blind', lat: 'ipsi', sev: 3 }],
    compartment: 'none',
  }),
  bi({
    id: 'inner_ear',
    name: { zh: '內耳（耳蝸與前庭）', en: 'Inner ear (cochlea & vestibule)' },
    func: { zh: '聽覺與頭部平衡感。', en: 'Hearing and head-motion sense.' },
    category: 'ear',
    cbf: 0,
    flow: 0.5,
    fixedVolume: 0,
    supply: [{ v: 'labyrinthine_{s}', share: 1 }],
    deficits: [
      { s: 'hearing_loss', lat: 'ipsi', sev: 3 },
      { s: 'vertigo', lat: 'none', sev: 3 },
      { s: 'nausea_vomiting', lat: 'none', sev: 1 },
    ],
    compartment: 'none',
  }),
  mid({
    id: 'cervical_cord',
    name: { zh: '頸髓前部', en: 'Anterior cervical spinal cord' },
    func: {
      zh: '上下肢運動纖維與痛溫覺路徑。前脊髓動脈只在頂端由椎動脈供血，下方另有根動脈補充（本模型未納入）。',
      en: 'Motor fibres and pain/temperature pathways for all limbs. The ASA is fed from the vertebrals only at its top; radicular arteries join lower down (not modelled).',
    },
    category: 'spinal',
    cbf: 20,
    fixedVolume: 3,
    supply: [{ v: 'asa', share: 1 }],
    deficits: [
      { s: 'arm_weak', lat: 'none', sev: 2 },
      { s: 'leg_weak', lat: 'none', sev: 2 },
      { s: 'pain_temp_body', lat: 'none', sev: 2 },
    ],
    compartment: 'none',
  }),
  bi({
    id: 'scalp_face',
    name: { zh: '臉部與頭皮（外頸動脈區）', en: 'Face & scalp (external carotid territory)' },
    func: { zh: '顱外組織；本身不是腦，但可提供側枝循環。', en: 'Extracranial tissue; not brain, but a source of collateral flow.' },
    category: 'extracranial',
    cbf: 0,
    flow: 110,
    fixedVolume: 0,
    supply: [
      { v: 'eca_facial_{s}', share: 0.35 },
      { v: 'eca_sta_{s}', share: 0.3 },
      { v: 'eca_maxillary_{s}', share: 0.25 },
      { v: 'eca_occipital_{s}', share: 0.1 },
    ],
    deficits: [],
    compartment: 'none',
  }),
  bi({
    id: 'arm',
    name: { zh: '手臂', en: 'Arm' },
    func: { zh: '休息時約需 100 mL/min 的血流，用力時會增加。', en: 'About 100 mL/min at rest, more with exercise.' },
    category: 'extracranial',
    cbf: 0,
    flow: 100,
    fixedVolume: 0,
    supply: [{ v: 'subclavian_dist_{s}', share: 1 }],
    deficits: [{ s: 'arm_claudication', lat: 'ipsi', sev: 2 }],
    compartment: 'none',
  }),
];
