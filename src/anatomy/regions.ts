/**
 * Functional brain regions.
 *
 * Cortical regions follow the DKT gyral atlas (Klein & Tourville 2012) with a few
 * functional subdivisions (e.g. the leg area of the motor strip). Their arterial supply is
 * derived voxel-by-voxel from the Liu et al. (2023) arterial territory atlas — see
 * `territories.ts`. Deep, brainstem and cerebellar regions carry hand-authored supply based
 * on Tatu et al. (1996, 1998), Schmahmann (2003) and the brainstem review of Sciacca et al. (2019).
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
      // right frontal and central lesions (Kertesz A et al., Neurology 1985;35:662-666, PMID 3990966)
      { s: 'motor_impersistence', lat: 'none', only: 'r', sev: 1 },
      // pathological crying after frontal lesions of the MCA territory: 40 % (Kim JS, Choi-Kwon S.
      // Neurology 2000;54:1805-1810, PMID 10802788); House A et al. (BMJ 1989;298:991-994, PMID
      // 2499390) also link it to left frontal and temporal lesions, while Kim found none after
      // temporal ones, so the temporal cortex is not mapped. C10-F8. TODO(medical-review): sev
      { s: 'emotionalism', lat: 'none', sev: 1 },
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
      // the frontal operculum: sweating on the opposite side (Labar et al., Neurology 1988) and
      // the taste cortex next to the insula, without a fixed side (Onoda et al., J Neurol 2012).
      // TODO(medical-review): sev
      { s: 'hyperhidrosis', lat: 'contra', sev: 1 },
      { s: 'taste_loss', lat: 'none', sev: 1 },
      // the frontal operculum: swallowing (see the precentral gyrus)
      { s: 'dysphagia', lat: 'none', sev: 1, minLevel: 0.5, fast: true },
      // right inferior frontal gyrus (BA 44): Husain M, Kennard C, J Neurol 1996;243:652-657 (PMID 8892067)
      { s: 'neglect', lat: 'contra', only: 'r', sev: 1 },
      { s: 'motor_impersistence', lat: 'none', only: 'r', sev: 1 },
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
      // frontal alien hand: the dominant (right) hand, after dominant medial frontal damage
      // (Feinberg TE et al., Neurology 1992;42:19-24, PMID 1734302)
      { s: 'alien_hand', lat: 'contra', only: 'l', sev: 1 },
      { s: 'aphasia_tc_motor', lat: 'none', only: 'l', sev: 1 },
      { s: 'incontinence', lat: 'none', sev: 1 },
      { s: 'akinetic_mutism', lat: 'none', sev: 3, bilateralOnly: true },
      // frontal ACA-territory lesions (Kim & Choi-Kwon, Neurology 2000). TODO(medical-review): sev
      { s: 'emotionalism', lat: 'none', sev: 1 },
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
      zh: '初級運動皮質：控制對側下半臉、舌頭、手與手臂的自主運動。靠近頭頂、前與中大腦動脈交界（前分水嶺）的上段管肩膀與上臂。',
      en: 'Primary motor cortex for the opposite lower face, tongue, hand and arm. Its upper part near the vertex, in the ACA–MCA border zone (anterior watershed), serves the shoulder and upper arm.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'face_weak', lat: 'contra', sev: 3 },
      { s: 'arm_weak', lat: 'contra', sev: 3 },
      { s: 'hand_clumsy', lat: 'contra', sev: 2 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'spasticity', lat: 'contra', sev: 2 },
      // vasomotor asymmetry with pyramidal signs (Korpelainen et al., Stroke 1995).
      // TODO(medical-review): sev
      { s: 'cold_limb', lat: 'contra', sev: 1 },
      // frontal operculum, insula, motor cortex and the corticobulbar white matter: swallowing
      // after a one-sided hemispheric stroke (anterior insula: Daniels SK, Foundas AL, Dysphagia
      // 1997;12:146-156, PMID 9190100; pre/postcentral, opercular and subcortical white matter:
      // Suntrup S et al., Eur J Neurol 2015;22:832-838, PMID 25677582). Only a large lesion
      // (minLevel), so that it tracks the facial weakness and speech problems it comes with
      // (Barer 1989), and it mostly settles within one to two weeks (fast; Gordon et al. 1987).
      { s: 'dysphagia', lat: 'none', sev: 1, minLevel: 0.5, fast: true },
      // right central lesions (Kertesz et al. 1985)
      { s: 'motor_impersistence', lat: 'none', only: 'r', sev: 1 },
    ],
    // anterior border zone (ACA–MCA) only: proximal arm and shoulder weakness with the face and
    // hand relatively spared; on both sides the bilateral brachial paralysis of the
    // "man-in-the-barrel" (Martí-Vilalta JL, Arboix A, Garcia JH. J Stroke Cerebrovasc Dis
    // 1994;4:114-120, PMID 26487612; Sage JI, Van Uitert RL. Neurology 1986;36:1102-1103,
    // PMID 3736874). TODO(medical-review): the one-sided pattern follows the same anatomy; no
    // series of one-sided cases was verified.
    borderDeficits: [{ s: 'arm_weak_proximal', lat: 'contra', sev: 2 }],
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
      // swallowing: see the precentral gyrus (Suntrup et al. 2015)
      { s: 'dysphagia', lat: 'none', sev: 1, minLevel: 0.5, fast: true },
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
      // TODO(medical-review): sev
      { s: 'cold_limb', lat: 'contra', sev: 1 },
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
      // no neglect from here: the critical sites lie in the inferior parietal lobule, superior
      // temporal and inferior frontal cortex and basal ganglia (Mort DJ et al., Brain
      // 2003;126:1986-1997, PMID 12821519; Karnath HO et al., Nature 2001;411:950-953, PMID 11418859)
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
      { s: 'neglect', lat: 'contra', only: 'r', sev: 2 },
      // after a left-hemisphere stroke neglect of the right side is rarer, milder and clears
      // sooner (20 % acutely, 5 % at 3 months vs 43 % and 17 % on the right: Ringman et al. 2004;
      // its higher plateau of compensation is redundancy.ts LEFT_NEGLECT, R1-7)
      { s: 'neglect', lat: 'contra', only: 'l', sev: 1, fast: true },
      { s: 'anosognosia', lat: 'none', only: 'r', sev: 1 },
      { s: 'cortical_sensory', lat: 'contra', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'angular',
    name: { zh: '角迴（頂下小葉）', en: 'Angular gyrus (inferior parietal lobule)' },
    func: {
      zh: '左側：閱讀、書寫、計算、手指與左右辨識；右側：空間注意力。深部白質有視放射的頂葉部分（對側下方視野）。',
      en: "Left: reading, writing, calculation, finger and left–right knowledge. Right: spatial attention. The parietal part of the optic radiation (opposite lower visual field) runs deep to it.",
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'alexia', lat: 'none', only: 'l', sev: 2 },
      { s: 'agraphia', lat: 'none', only: 'l', sev: 2 },
      { s: 'acalculia', lat: 'none', only: 'l', sev: 2 },
      { s: 'finger_agnosia', lat: 'none', only: 'l', sev: 2 },
      { s: 'aphasia_tc_sensory', lat: 'none', only: 'l', sev: 1 },
      // the critical site of neglect in MCA strokes (Mort et al. 2003)
      { s: 'neglect', lat: 'contra', only: 'r', sev: 2 },
      { s: 'neglect', lat: 'contra', only: 'l', sev: 1, fast: true },
      { s: 'visuospatial', lat: 'none', only: 'r', sev: 2 },
      // the optic radiation, the second commonest lesion site of homonymous hemianopia after the
      // occipital lobe (32 % of 904: Zhang X et al., Neurology 2006;66:906-910, PMID 16567710),
      // runs deep to the parietal cortex; reached only by a large (deep) lesion, not by cortical
      // spill-over. With Meyer's loop (temporal) it makes the hemianopia of a large MCA infarct.
      // A field cut caused by the infarct does not end when the penumbral cortex above the tract
      // recovers its function (R1-6): `deepTract`.
      { s: 'quadrant_inf', lat: 'contra', sev: 2, minLevel: 0.5, deepTract: true },
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
      // right superior temporal cortex (Karnath et al. 2001; disputed as the critical site by
      // Mort et al. 2003, so milder than the inferior parietal sources)
      { s: 'neglect', lat: 'contra', only: 'r', sev: 1 },
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
      // the evidence on the side is mixed: the right dorsal anterior insula is linked to a troponin
      // rise (Krause T et al. Ann Neurol 2017;81:502-511, PMID 28253544), the left insula to later
      // adverse cardiac events (Laowattana S et al. Neurology 2006;66:477-483, PMID 16505298), so
      // both sides carry the same weight. C10-F5
      { s: 'autonomic_cardiac', lat: 'none', sev: 1 },
      { s: 'apraxia_of_speech', lat: 'none', only: 'l', sev: 1 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'anosognosia', lat: 'none', only: 'r', sev: 1 },
      // insular–opercular cortex: sweating on the opposite side (Labar et al. 1988; Kim et al.,
      // Stroke 1995) and primary taste cortex, without a fixed side (Onoda et al. 2012).
      // TODO(medical-review): sev
      { s: 'hyperhidrosis', lat: 'contra', sev: 1 },
      { s: 'taste_loss', lat: 'none', sev: 1 },
      // the anterior insula (Daniels & Foundas 1997): see the precentral gyrus
      { s: 'dysphagia', lat: 'none', sev: 1, minLevel: 0.5, fast: true },
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
      // colour: full achromatopsia needs both sides; one side loses colour in the opposite
      // field, and only from a large (posterior) lesion, not MCA spill-over into the gyrus
      { s: 'achromatopsia', lat: 'none', sev: 1, bilateralOnly: true },
      { s: 'hemiachromatopsia', lat: 'contra', sev: 1, minLevel: 0.5 },
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
      // damaged in every patient with neglect after a PCA stroke (Mort et al. 2003); visual
      // neglect in 9 of 117 superficial PCA infarcts on the right, 2 on the left (Cals et al. 2002)
      { s: 'neglect', lat: 'contra', only: 'r', sev: 1 },
    ],
    compartment: 'supra',
  }),

  // ═══════════════════════ Occipital lobe ═══════════════════════
  bi({
    id: 'cuneus',
    name: { zh: '楔葉（距狀溝上唇）', en: 'Cuneus (upper bank of the calcarine fissure)' },
    func: {
      zh: '初級視覺皮質的上半：看見對側「下方」的視野。由距狀動脈與頂枕動脈共同供應。',
      en: 'Upper half of primary visual cortex: sees the opposite LOWER visual quadrant. Fed by both the calcarine and the parieto-occipital artery.',
    },
    category: 'cortex',
    cbf: CORTEX_CBF,
    deficits: [
      { s: 'quadrant_inf', lat: 'contra', sev: 2 },
      { s: 'visual_release_hallucinations', lat: 'contra', sev: 1 },
    ],
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
      // see the fusiform gyrus
      { s: 'achromatopsia', lat: 'none', sev: 1, bilateralOnly: true },
      { s: 'hemiachromatopsia', lat: 'contra', sev: 1 },
      { s: 'visual_release_hallucinations', lat: 'contra', sev: 1 },
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
    deficits: [
      { s: 'central_scotoma', lat: 'contra', sev: 2 },
      { s: 'visual_release_hallucinations', lat: 'contra', sev: 1 },
    ],
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
    // callosal disconnection affects the left hand, whichever side the lesion is on: the
    // intermanual conflict of the callosal alien hand (Feinberg et al. 1992) and apraxia with
    // apraxic agraphia (Watson RT, Heilman KM, Brain 1983;106:391-403, PMID 6850274)
    deficits: [
      { s: 'callosal_apraxia', lat: 'contra', only: 'r', sev: 1 },
      { s: 'callosal_apraxia', lat: 'ipsi', only: 'l', sev: 1 },
      { s: 'alien_hand', lat: 'contra', only: 'r', sev: 1 },
      { s: 'alien_hand', lat: 'ipsi', only: 'l', sev: 1 },
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
      // TODO(medical-review): sev
      { s: 'cold_limb', lat: 'contra', sev: 1 },
      // corticobulbar fibres to the swallowing muscles (subcortical white matter: Suntrup et al.
      // 2015); see the precentral gyrus
      { s: 'dysphagia', lat: 'none', sev: 1, minLevel: 0.5, fast: true },
    ],
    compartment: 'supra',
  }),

  // ═══════════════════════ Deep grey & internal capsule ═══════════════════════
  bi({
    id: 'caudate_head',
    name: { zh: '尾狀核頭（含依核）', en: 'Caudate head (incl. nucleus accumbens)' },
    func: {
      zh: '額葉—基底核迴路的一環：動機、學習、認知控制。尾狀核梗塞主要造成行為改變（意志缺失、躁動），常有構音障礙；不自主運動很少見。同時出現的輕微、短暫偏癱多半來自延伸到鄰近的內囊。',
      en: 'Part of frontal–basal ganglia loops: motivation, learning and cognitive control. Caudate infarcts mainly change behaviour (abulia, agitation), often with dysarthria; involuntary movements are rare. The slight, transient hemiparesis that often comes with them is mostly from extension into the adjacent internal capsule.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'heubner_{s}', share: 0.7 },
      { v: 'lenticulostriate_{s}', share: 0.3 },
    ],
    // Caplan LR et al. Caudate infarcts. Arch Neurol 1990;47:133-143 (PMID 2405818): of 18,
    // dysarthria in 11, abulia in 10, agitation and hyperactivity in 7, motor signs (mostly a
    // slight transient hemiparesis) in 13 — half extended into the anterior limb of the capsule;
    // neglect in 3 (all right caudate), language abnormalities in 2 (both left). Bhatia KP,
    // Marsden CD. Brain 1994;117:859-876 (PMID 7922471; published cases): caudate lesions rarely
    // caused movement disorders (chorea 6 %, dystonia 9 %) but often abulia (28 %), sometimes
    // alternating with disinhibition (11 %); aphasia was extremely rare with lesions confined to
    // the basal ganglia, so none is listed here (C6-F9). Movement disorders: postStrokeRisks.ts.
    // No neglect of its own (R2-4): the right caudate is part of the network whose damage goes with
    // neglect (Karnath HO, Himmelbach M, Rorden C, Brain 2002;125:350-360, PMID 11844735), but only 3
    // of Caplan's 8 right caudate infarcts had it, and among 44 acute strokes with only subcortical
    // lesions every patient with aphasia or neglect had concurrent cortical hypoperfusion (Hillis AE
    // et al. Brain 2002;125:1094-1104, PMID 11960898). It is shown with the cortical signs of a
    // striatocapsular infarct (cascade.ts) instead.
    deficits: [
      { s: 'abulia', lat: 'none', sev: 2 },
      { s: 'executive', lat: 'none', sev: 1 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'disinhibition', lat: 'none', sev: 1 },
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
      zh: '基底核的運動入口：動作的選擇與流暢度。少數中風（約 1%）之後會出現不自主運動（偏側舞蹈—投擲症、肌張力異常），多半在基底核與鄰近白質梗塞之後，通常會自行消退。',
      en: 'Motor input nucleus of the basal ganglia: selection and fluency of movement. In a few strokes (about 1 %) involuntary movements follow (hemichorea–hemiballism, dystonia), mostly after infarcts of the basal ganglia and the adjacent white matter; they usually subside.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [
      { v: 'lenticulostriate_{s}', share: 0.9 },
      { v: 'heubner_{s}', share: 0.1 },
    ],
    // involuntary movements are not a symptom of every putaminal infarct: 29 of 2500 first strokes,
    // mostly hemichorea–hemiballism and hemidystonia, usually regressing (Ghika-Schmid F et al.
    // J Neurol Sci 1997;146:109-116, PMID 9077506); listed with the problems after stroke
    // (postStrokeRisks.ts, C6-F3)
    // the right putamen is a critical subcortical site of neglect (Karnath et al. 2002), but the
    // neglect of an acute subcortical infarct comes with cortical hypoperfusion (Hillis et al. 2002):
    // it is shown with the cortical signs of a striatocapsular infarct (cascade.ts), not as a
    // deficit of the putamen itself (R2-4)
    deficits: [
      { s: 'dysarthria', lat: 'none', sev: 1 },
      // lenticulocapsular strokes (Kim & Choi-Kwon, Neurology 2000; Kim, J Neurol 2002).
      // TODO(medical-review): sev
      { s: 'emotionalism', lat: 'none', sev: 1 },
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
    // involuntary movements: postStrokeRisks.ts (C6-F3)
    deficits: [
      { s: 'abulia', lat: 'none', sev: 1 },
      // the dorsal pallidum especially (Kim, J Neurol 2002). TODO(medical-review): sev
      { s: 'emotionalism', lat: 'none', sev: 1 },
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
      zh: '皮質延髓徑通過處：控制對側臉部、舌頭與吞嚥的運動指令。膝部下方還有視丘通往額葉的纖維（視丘下腳與前腳）：這裡的小梗塞可造成突然的意識混亂、冷漠與失憶（「策略性梗塞」），無力反而輕微。',
      en: 'Corticobulbar fibres: motor commands for the opposite face, tongue and swallowing. Below them run thalamic fibres to the frontal lobe (inferior and anterior thalamic peduncles): a small infarct here can cause sudden confusion, apathy and memory loss (a "strategic infarct") with only mild weakness.',
    },
    category: 'deep',
    cbf: WM_CBF,
    supply: [
      { v: 'lenticulostriate_{s}', share: 0.6 },
      { v: 'acha_{s}', share: 0.4 },
    ],
    // facial weakness from the genu alone is mild to moderate (Tatemichi TK et al. Neurology
    // 1992;42:1966-1979, PMID 1407580: mild unless the infarct reaches the posterior limb; C6-F8),
    // so the face is no weaker than the arm in a striatocapsular infarct (C6-F6). The cognitive
    // syndrome of a lower-genu lacune: lacunes.ts
    deficits: [
      { s: 'face_weak', lat: 'contra', sev: 2 },
      { s: 'dysarthria', lat: 'none', sev: 2 },
      // corticobulbar fibres to the swallowing muscles (Suntrup et al. 2015); see the precentral gyrus
      { s: 'dysphagia', lat: 'none', sev: 1, minLevel: 0.5, fast: true },
      // corticobulbar fibres, part of the lenticulocapsular group (Kim & Choi-Kwon 2000).
      // TODO(medical-review): sev
      { s: 'emotionalism', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'ic_posterior_limb',
    name: { zh: '內囊後肢', en: 'Internal capsule, posterior limb' },
    func: {
      zh: '皮質脊髓徑高度集中處：很小的梗塞就能讓對側臉、手、腳無力，程度相近（純運動性中風），多為輕到中度；位在內囊最下方的小梗塞也可能造成嚴重偏癱。',
      en: 'The corticospinal tract is tightly packed here: a tiny infarct can weaken the opposite face, arm and leg to a similar degree (pure motor stroke), usually mildly to moderately; a small infarct in the lowest part of the capsule can still cause a dense hemiplegia.',
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
      // TODO(medical-review): sev
      { s: 'cold_limb', lat: 'contra', sev: 1 },
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
    // Tuberothalamic syndrome (Bogousslavsky et al., Neurology 1988; Schmahmann, Stroke 2003):
    // arousal and orientation, memory, personality and executive deficits, emotional facial
    // paresis. In 12 anterior thalamic infarcts (Ghika-Schmid & Bogousslavsky, Ann Neurol 2000):
    // perseveration and dysexecutive features in all, apathy usual, word-finding difficulty in all,
    // dysarthria in 8 and hypophonia in 5, with comprehension and repetition preserved; memory loss
    // verbal after left and visuospatial after right infarcts; within months only the memory loss
    // and apathy were left (see redundancy.ts). Perseveration and apathy, not disinhibition, are the
    // anterior pattern (Carrera & Bogousslavsky, Neurology 2006).
    deficits: [
      { s: 'amnesia', lat: 'none', sev: 2 },
      { s: 'abulia', lat: 'none', sev: 1 },
      { s: 'executive', lat: 'none', sev: 1 },
      { s: 'aphasia_thalamic', lat: 'none', only: 'l', sev: 1 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'emotional_facial_paresis', lat: 'contra', sev: 1 },
      { s: 'neglect', lat: 'contra', only: 'r', sev: 1 },
      // extensive bilateral thalamic infarcts (e.g. a Percheron trunk that also feeds both anterior
      // thalami): thalamic "dementia" (Carrera & Bogousslavsky 2006). TODO(medical-review): sev
      { s: 'executive', lat: 'none', sev: 3, bilateralOnly: true },
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
    // Acute picture of 46 paramedian thalamic strokes (Hermann et al., Stroke 2008): oculomotor
    // (mostly vertical gaze) palsy 76%, mild gait ataxia 67%, attention 63%, fluency and error
    // control 59%, learning and memory 67%, behaviour 67%. Persistent frontal and cognitive deficits
    // in 100% of bilateral, 90% of left- and 33% of right-sided strokes; the right-sided recovery is
    // in redundancy.ts. Disinhibition, personality change and loss of self-activation are the
    // paramedian behavioural pattern (Carrera & Bogousslavsky, Neurology 2006). Language deficits
    // follow left and neglect right paramedian lesions (Schmahmann, Stroke 2003).
    deficits: [
      { s: 'somnolence', lat: 'none', sev: 2 },
      { s: 'amnesia', lat: 'none', sev: 2 },
      { s: 'vertical_gaze_palsy', lat: 'none', sev: 1 },
      { s: 'abulia', lat: 'none', sev: 1 },
      { s: 'executive', lat: 'none', only: 'l', sev: 2 },
      { s: 'executive', lat: 'none', only: 'r', sev: 1 },
      { s: 'disinhibition', lat: 'none', sev: 1 },
      { s: 'ataxia_gait', lat: 'none', sev: 1 },
      { s: 'aphasia_thalamic', lat: 'none', only: 'l', sev: 1 },
      { s: 'neglect', lat: 'contra', only: 'r', sev: 1 },
      { s: 'coma', lat: 'none', sev: 2, bilateralOnly: true },
      // sleep needs stay raised for months, more after bilateral lesions (Bassetti et al., Ann
      // Neurol 1996; Hermann et al., Stroke 2008). TODO(medical-review): sev
      { s: 'hypersomnia', lat: 'none', sev: 1 },
      { s: 'hypersomnia', lat: 'none', sev: 2, bilateralOnly: true },
      // vivid hallucinations after rostral brainstem / paramedian thalamic damage (Caplan,
      // Neurology 1980; Benke, J Neurol 2006): uncommon, so only when both sides are hit.
      // TODO(medical-review): sev
      { s: 'peduncular_hallucinosis', lat: 'none', sev: 1, bilateralOnly: true },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'thalamus_ventrolateral',
    name: { zh: '視丘腹外側（感覺轉運核 VPL/VPM 與 VL）', en: 'Ventrolateral thalamus (VPL/VPM sensory relay & VL)' },
    func: {
      zh: '全身感覺傳到大腦皮質的轉運站（VPM 也轉送味覺）；VL 核轉送小腦的協調訊號。',
      en: 'Relays all body sensation (and, in VPM, taste) to the cortex; the VL nucleus relays cerebellar coordination signals.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    supply: [{ v: 'thalamogeniculate_{s}', share: 1 }],
    deficits: [
      { s: 'sens_hemibody', lat: 'contra', sev: 3 },
      // inferolateral territory: hemisensory loss, hemiparesis and hemiataxia (Schmahmann, Stroke
      // 2003); the weakness is mild and passes within weeks (it settles fast in redundancy.ts), and
      // a sensory lacune has none
      { s: 'face_weak', lat: 'contra', sev: 1, spareInLacune: true },
      { s: 'arm_weak', lat: 'contra', sev: 1, spareInLacune: true },
      // a sensory lacune sits in VPL/VPM; the motor thalamus (VL) is usually spared
      { s: 'ataxia_limb', lat: 'contra', sev: 1, spareInLacune: true },
      // the delayed involuntary movements of lateral thalamic strokes (weeks to months, with severe
      // position-sense loss and ataxia: Kim JS. Brain 2001;124:299-309, PMID 11157557) are listed
      // with the problems after stroke (postStrokeRisks.ts, C6-F3)
      // central pain is possible, not certain: 14 % after any thalamic stroke, 24 % after a
      // geniculothalamic one (Nasreddine ZS, Saver JL. Neurology 1997;48:1196-1199, PMID 9153442;
      // published cases, right > left, shown in the text only), 3 of 40 thalamic infarcts
      // (Bogousslavsky 1988) — hence severity 1, labelled as possible. C10-F1
      { s: 'central_pain', lat: 'contra', sev: 1 },
      // VPM relays taste; side not fixed above the midbrain (Onoda et al., J Neurol 2012).
      // TODO(medical-review): sev
      { s: 'taste_loss', lat: 'none', sev: 1 },
    ],
    compartment: 'supra',
  }),
  bi({
    id: 'thalamus_posterior',
    name: { zh: '視丘後部（視丘枕、外側膝狀體）', en: 'Posterior thalamus (pulvinar & lateral geniculate body)' },
    func: {
      zh: '外側膝狀體是視覺轉運站；視丘枕參與視覺注意力。這裡梗塞常造成同側象限偏盲；水平扇形偏盲很少見，但提示外側膝狀體受損。',
      en: 'The lateral geniculate body relays vision; the pulvinar supports visual attention. An infarct here typically gives a homonymous quadrantanopia; a horizontal sectoranopia is rare but points to the lateral geniculate body.',
    },
    category: 'deep',
    cbf: DEEP_CBF,
    // The thalamic branches of the lateral posterior choroidal artery leave it before it reaches the
    // choroid plexus, where it meets the AChA, so the plexus anastomosis does not protect all of the
    // territory: half of it hangs on the artery's proximal course (@mid). Isolated posterior
    // choroidal infarcts are real, if rare: 10 of 2,925 stroke patients (Neau & Bogousslavsky, Ann
    // Neurol 1996). TODO(medical-review): the shares
    supply: [
      { v: 'posterior_choroidal_{s}', share: 0.5, at: 'mid' },
      { v: 'posterior_choroidal_{s}', share: 0.3 },
      { v: 'acha_{s}', share: 0.2 },
    ],
    // Lateral posterior choroidal infarcts: homonymous quadrantanopia (the partial field defect
    // below) with or without hemisensory loss and neuropsychological deficits (transcortical aphasia,
    // memory); late disability from pain and delayed abnormal movements (Neau & Bogousslavsky 1996).
    // The jerky dystonic unsteady hand is specific to small posterior choroidal infarcts (Ghika-Schmid
    // et al., J Neurol Sci 1997). Field defects, variable sensory loss, weakness, dystonia, tremor,
    // occasionally amnesia and language impairment (Schmahmann, Stroke 2003).
    deficits: [
      { s: 'hemianopia', lat: 'contra', sev: 1 },
      { s: 'sens_hemibody', lat: 'contra', sev: 1 },
      // "occasionally amnesia and language impairment" (Schmahmann): only when the posterior
      // choroidal territory itself is infarcted, not from the AChA's share and the swelling around it
      { s: 'aphasia_tc_sensory', lat: 'none', only: 'l', sev: 1, minLevel: 0.4 },
      { s: 'amnesia', lat: 'none', sev: 1, minLevel: 0.4 },
      { s: 'neglect', lat: 'contra', only: 'r', sev: 1 },
      { s: 'jerky_dystonic_hand', lat: 'contra', sev: 1 },
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
    // The paramedian (thalamoperforating) arteries feed the rostral midbrain in some people and
    // not in others: by default they give only a small share, below the symptom threshold, and the
    // variants `thalamomesencephalic_{s}` and `percheron_mid_{s}` make the midbrain part of their
    // territory (Lazzaro et al., AJNR 2010: Percheron infarcts with midbrain 57%, without 43%).
    supply: [
      { v: 'mesencephalic_perf_{s}', share: 0.85 },
      { v: 'thalamoperforator_{s}', share: 0.15 },
    ],
    structures: [
      { name: { zh: '動眼神經核', en: 'Oculomotor nucleus' }, role: { zh: '眼球上下內轉、提眼瞼、縮瞳', en: 'Up/down/in eye movement, lid, pupil' } },
      { name: { zh: '紅核', en: 'Red nucleus' }, role: { zh: '小腦訊號中繼；受損數週到數月後對側可能出現顫抖', en: 'Cerebellar relay; weeks to months after a lesion the opposite arm may develop a tremor' } },
      { name: { zh: '內側縱束嘴側間質核（riMLF）', en: 'rostral interstitial nucleus of MLF' }, role: { zh: '垂直眼動', en: 'Vertical gaze' } },
      { name: { zh: '中腦網狀結構', en: 'Mesencephalic reticular formation' }, role: { zh: '維持清醒', en: 'Arousal' } },
      { name: { zh: 'Cajal 間質核', en: 'Interstitial nucleus of Cajal' }, role: { zh: '垂直與旋轉眼動、頭眼的重力定向', en: 'Vertical and torsional eye movement, head and eye orientation to gravity' } },
      { name: { zh: '滑車神經核（下丘高度）', en: 'Trochlear nucleus (inferior-colliculus level)' }, role: { zh: '對側眼向下內看', en: 'Opposite eye looking down & in' } },
    ],
    deficits: [
      { s: 'cn3_palsy', lat: 'ipsi', sev: 3 },
      { s: 'cn4_palsy', lat: 'contra', sev: 1 },
      // the ataxia is acute; the rubral (Holmes) tremor comes weeks to months later (Raina et al.,
      // Neurology 2016; Castaigne et al., Ann Neurol 1981)
      { s: 'holmes_tremor', lat: 'contra', sev: 2 },
      { s: 'ataxia_limb', lat: 'contra', sev: 1 },
      // a rostral (pontomesencephalic) lesion lowers the opposite eye (Brandt & Dieterich, Ann
      // Neurol 1993). TODO(medical-review): sev
      { s: 'skew_deviation', lat: 'contra', sev: 1 },
      { s: 'vertical_gaze_palsy', lat: 'none', sev: 2 },
      { s: 'somnolence', lat: 'none', sev: 2 },
      { s: 'diplopia', lat: 'none', sev: 2 },
      { s: 'coma', lat: 'none', sev: 3, bilateralOnly: true },
      // upper brainstem damage can leave a lasting sleep–wake disorder (Bassetti, Semin Neurol
      // 2005). TODO(medical-review): sev
      { s: 'hypersomnia', lat: 'none', sev: 1 },
      // vivid hallucinations after rostral brainstem damage (Caplan, Neurology 1980; Benke,
      // J Neurol 2006): uncommon, so only when both sides are hit. TODO(medical-review): sev
      { s: 'peduncular_hallucinosis', lat: 'none', sev: 1, bilateralOnly: true },
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
      // the same descending sympathetic fibres (Korpelainen et al., Stroke 1993 studied pontine and
      // medullary infarcts; the midbrain is assumed). TODO(medical-review): sev
      { s: 'hypohidrosis', lat: 'ipsi', sev: 1 },
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
      // pontine base: 53 % after one-sided lesions (Kim & Choi-Kwon, Neurology 2000); frequent in
      // locked-in syndrome (Sacco et al., Arch Phys Med Rehabil 2008). TODO(medical-review): sev
      { s: 'emotionalism', lat: 'none', sev: 1 },
      { s: 'emotionalism', lat: 'none', sev: 2, bilateralOnly: true },
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
      { name: { zh: '藍斑核與藍斑下區', en: 'Locus coeruleus & subcoeruleus area' }, role: { zh: '做夢（REM）時讓肌肉放鬆', en: 'Switches the muscles off in dreaming (REM) sleep' } },
      { name: { zh: '橋腦排尿中樞（Barrington 核）', en: "Pontine micturition centre (Barrington's nucleus)" }, role: { zh: '協調膀胱收縮與括約肌放鬆', en: 'Bladder contraction with sphincter relaxation' } },
      { name: { zh: '內側蹄系', en: 'Medial lemniscus' }, role: { zh: '對側本體覺', en: 'Opposite position sense' } },
    ],
    deficits: [
      { s: 'ino', lat: 'ipsi', sev: 2 },
      // an upper pontine (MLF) lesion lowers the opposite eye (Brandt & Dieterich, Ann Neurol
      // 1993). TODO(medical-review): sev
      { s: 'skew_deviation', lat: 'contra', sev: 1 },
      { s: 'proprio_loss', lat: 'contra', sev: 1 },
      { s: 'diplopia', lat: 'none', sev: 1 },
      { s: 'coma', lat: 'none', sev: 3, bilateralOnly: true },
      // coma lesions were bilateral in 7 of 9 and one-sided in 2, while 9 patients with a very
      // small one-sided tegmental lesion were not comatose (Parvizi & Damasio, Brain 2003): an
      // extensive one-sided lesion lowers arousal (drowsiness), a small one does not.
      // TODO(medical-review): sev and minLevel
      { s: 'somnolence', lat: 'none', sev: 1, minLevel: 0.5 },
      // the pontine micturition centre (Sakakibara et al., J Neurol Sci 1996). Severity 1: small
      // series. TODO(medical-review): sev. (REM sleep behaviour disorder is a possible late problem
      // of any pontine or medullary infarct, shown as a cascade event: C10-F7.)
      { s: 'urinary_retention', lat: 'none', sev: 1 },
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
      // descending sympathetic fibres (Korpelainen et al., Stroke 1993); the dorsolateral
      // tegmentum by the parabrachial nucleus (Sakakibara et al., J Neurol Sci 1996).
      // TODO(medical-review): sev
      { s: 'hypohidrosis', lat: 'ipsi', sev: 1 },
      { s: 'urinary_retention', lat: 'none', sev: 1 },
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
      // pontine base: 53 % after one-sided lesions (Kim & Choi-Kwon, Neurology 2000); frequent in
      // locked-in syndrome (Sacco et al., Arch Phys Med Rehabil 2008). TODO(medical-review): sev
      { s: 'emotionalism', lat: 'none', sev: 1 },
      { s: 'emotionalism', lat: 'none', sev: 2, bilateralOnly: true },
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
      // the medial vestibular nucleus and the MLF lie in the floor of the fourth ventricle next to
      // the abducens nucleus: tegmental pontine infarcts present with vertigo and dizziness
      // (Kumral et al., J Neurol 2002). TODO(medical-review): sev
      { s: 'vertigo', lat: 'none', sev: 1 },
      { s: 'nystagmus', lat: 'none', sev: 1 },
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
      // vestibular nuclei: a caudal pontomedullary lesion lowers the eye on its own side (Brandt &
      // Dieterich, Ann Neurol 1993). TODO(medical-review): sev
      { s: 'skew_deviation', lat: 'ipsi', sev: 1 },
      { s: 'nausea_vomiting', lat: 'none', sev: 1 },
      { s: 'pain_temp_face', lat: 'ipsi', sev: 2 },
      { s: 'pain_temp_body', lat: 'contra', sev: 2 },
      { s: 'horner', lat: 'ipsi', sev: 1 },
      { s: 'ataxia_limb', lat: 'ipsi', sev: 2 },
      // the middle cerebellar peduncle: standing and walking were impaired in all of 7 AICA
      // infarcts, 6 of them in the peduncle (Ogawa K et al. J Stroke Cerebrovasc Dis
      // 2017;26:574–581, PMID 27989483). C7-F4. TODO(medical-review): sev
      { s: 'ataxia_gait', lat: 'none', sev: 2 },
      // descending sympathetic fibres (Korpelainen et al., Stroke 1993); the taste pathway still
      // ascends on the same side (Landis et al., J Neurol Neurosurg Psychiatry 2006 — a case
      // report). TODO(medical-review): sev
      { s: 'hypohidrosis', lat: 'ipsi', sev: 1 },
      { s: 'taste_loss', lat: 'ipsi', sev: 1 },
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
      // the vertebral's own direct branches feed only a small part: kept below what, with the
      // perilesional rim of oedema on days 2–7, would reach the symptom threshold (0.25), so a
      // vertebral occlusion (Wallenberg) does not also give a transient contralateral hemiparesis —
      // weakness is not part of the lateral medullary syndrome (Sacco RL et al. Arch Neurol
      // 1993;50:609–614, PMID 8503798), and the hemiparesis reported with it is on the side of the
      // infarct (Saito T et al. J Neurol Sci 2022;434:120167, PMID 35091384). C7-F3.
      // TODO(medical-review): share
      { v: 'asa_root_{s}', share: 0.85, at: 'mid' },
      { v: 'va_v4_dist_{s}', share: 0.15, at: 'mid' },
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
      // 86 consecutive medial medullary infarcts: vertigo or dizziness in 59 %, with dorsal
      // involvement; central post-stroke pain in 21, linked to a poor outcome (Kim JS, Han YS.
      // Stroke 2009;40:3221–3225, PMID 19628797). C7-F9. TODO(medical-review): sev
      { s: 'vertigo', lat: 'none', sev: 1 },
      { s: 'central_pain', lat: 'contra', sev: 1 },
      // both sides: weak tongue and dysarthria (dysarthria 48.6 %, hypoglossal palsy 40.5 % in 38
      // bilateral cases: Pongmoragot J et al. J Stroke Cerebrovasc Dis 2013;22:775–780, PMID
      // 22541608). No swallowing or breathing symptom: the review gives no figure for them, and
      // case reports differ (respiratory failure in Kobayashi S et al. Brain Nerve 2020;72:901–905,
      // PMID 32741771; none in Takano K, Takasugi K. No To Shinkei 2003;55:879–883, PMID 14635516),
      // so breathing is left to the bilateral-medulla complication (cascade.ts). C7-F6
      { s: 'dysarthria', lat: 'none', sev: 2, bilateralOnly: true },
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
      { name: { zh: '下行交感纖維', en: 'Descending sympathetic fibres' }, role: { zh: '同側霍納氏症候群、同側半身少汗', en: 'Same-side Horner and reduced sweating' } },
      { name: { zh: '孤束核', en: 'Solitary tract nucleus' }, role: { zh: '同側舌頭味覺；呼吸與心血管反射', en: 'Same-side taste; breathing and cardiovascular reflexes' } },
      { name: { zh: '腹外側呼吸網路', en: 'Ventrolateral respiratory network' }, role: { zh: '自動呼吸（睡著時也要呼吸）', en: 'Automatic breathing (including during sleep)' } },
    ],
    deficits: [
      { s: 'dysphagia', lat: 'none', sev: 3 },
      { s: 'hoarseness', lat: 'ipsi', sev: 2 },
      { s: 'pain_temp_face', lat: 'ipsi', sev: 2 },
      { s: 'pain_temp_body', lat: 'contra', sev: 2 },
      { s: 'vertigo', lat: 'none', sev: 2 },
      { s: 'nystagmus', lat: 'none', sev: 2 },
      // vestibular nuclei: the eye on the lesion side is lower (Brandt & Dieterich, Ann Neurol
      // 1993); diplopia or blurred vision in 11 of 33 (Sacco et al., Arch Neurol 1993).
      // TODO(medical-review): sev
      { s: 'skew_deviation', lat: 'ipsi', sev: 1 },
      { s: 'nausea_vomiting', lat: 'none', sev: 2 },
      { s: 'horner', lat: 'ipsi', sev: 2 },
      { s: 'ataxia_limb', lat: 'ipsi', sev: 2 },
      // gait and truncal ataxia with the body pulled towards the lesion (ipsiversive
      // lateropulsion: Cnyrim CD et al. J Neurol Neurosurg Psychiatry 2007;78:527–528, PMID
      // 17435189); ataxia was the commonest onset symptom (70 %: Sacco RL et al. Arch Neurol
      // 1993;50:609–614, PMID 8503798), and severe gait ataxia commoner with caudal lesions (Kim JS.
      // Brain 2003;126:1864–1872, PMID 12805095). C7-F4
      { s: 'ataxia_gait', lat: 'none', sev: 2 },
      // facial weakness in 42 % (Sacco 1993), central and on the side of the infarct in 8 of 33
      // (the corticobulbar fibres to the facial nucleus loop down into the medulla: Kanbayashi T,
      // Sonoo M. BMC Neurol 2021;21:214, PMID 34058995); dysarthria in 56 % of those who did not
      // die of respiratory failure (Saito T et al. J Neurol Sci 2022;434:120167, PMID 35091384);
      // both commoner with rostral lesions (Kim 2003). C7-F4. TODO(medical-review): sev
      { s: 'face_weak', lat: 'ipsi', sev: 1 },
      { s: 'dysarthria', lat: 'none', sev: 1 },
      { s: 'hiccups', lat: 'none', sev: 1 },
      // central pain after a lateral medullary infarct (25 %, all within 6 months) most often
      // affects the face around the eye on the side of the infarct, alone or with the opposite
      // limbs (MacGowan DJ et al. Neurology 1997;49:120-125, PMID 9222179): both are listed as
      // possible. C10-F3
      { s: 'central_pain', lat: 'contra', sev: 1 },
      { s: 'central_pain_face', lat: 'ipsi', sev: 1 },
      // a large infarct also reaches the crossed trigeminothalamic tract, medial to the lateral
      // medulla: pain and temperature dulled on the other side of the face too (a bilateral
      // trigeminal pattern, frequent with the "large" type: Kim JS. Brain 2003;126:1864-1872, PMID
      // 12805095; in 12 of 50, with large, ventrally extending lesions, against the classic crossed
      // pattern in 13: Kim JS et al. Neurology 1997;49:1557-1563, PMID 9409346). Sensory loss, not
      // pain; not from a single perforator lacune. C10-F3, R2-6
      { s: 'pain_temp_face', lat: 'contra', sev: 1, minLevel: 0.6, spareInLacune: true },
      // one side can be enough to lose automatic breathing (Bogousslavsky J et al. Ann Neurol
      // 1990;28:668–673, PMID 2260854): shown as a complication warning for the first 10 days
      // (cascade.ts, C7-F1); this symptom is for lesions of both sides
      { s: 'respiratory', lat: 'none', sev: 2, bilateralOnly: true },
      // reduced cardiac vagal (parasympathetic) function on testing in 14 of 25, against 4 of 29
      // controls, linked to ventral involvement (Hong JM et al. Neurol Sci 2013;34:1963–1969,
      // PMID 23543393); the study gives no arrhythmia rate. C7-F1
      { s: 'autonomic_cardiac', lat: 'none', sev: 1 },
      // TODO(medical-review): every sev below
      // whole-body ipsilateral hypohidrosis (Korpelainen et al., Stroke 1993)
      { s: 'hypohidrosis', lat: 'ipsi', sev: 1 },
      // central apnoea in sleep after a one-sided infarct, worst around day 7 (Pavšič et al., Sleep
      // Breath 2020; symptoms.ts); two sides → `respiratory` above, which replaces it (clinical.ts)
      { s: 'central_sleep_apnoea', lat: 'none', sev: 1 },
      // the solitary tract nucleus: taste on the same side (Onoda et al., J Neurol 2012)
      { s: 'taste_loss', lat: 'ipsi', sev: 1 },
      // cooler limbs on the opposite side with Wallenberg syndrome (Korpelainen et al., Stroke 1995)
      { s: 'cold_limb', lat: 'contra', sev: 1 },
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
      // standing and walking impaired in all of 7 AICA infarcts, 4 of them in the cerebellum
      // (Ogawa K et al. J Stroke Cerebrovasc Dis 2017;26:574–581, PMID 27989483). C7-F4.
      // TODO(medical-review): sev
      { s: 'ataxia_gait', lat: 'none', sev: 2 },
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
      // the cerebellar cognitive affective syndrome: executive and visuospatial deficits with
      // posterior-lobe lesions, only minor changes with anterior-lobe ones (20 patients with
      // disease confined to the cerebellum: Schmahmann JD, Sherman JC. Brain 1998;121:561–579,
      // PMID 9577385); MMSE and MoCA can be normal (Hoche F et al. Brain 2018;141:248–270, PMID
      // 29206893). Series of mixed cerebellar disease, not stroke-specific frequencies: mild
      // (sev 1). C7-F10. TODO(medical-review): sev
      { s: 'executive', lat: 'none', sev: 1 },
      { s: 'visuospatial', lat: 'none', sev: 1 },
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
      // the affective part of the cerebellar cognitive affective syndrome: blunted affect or
      // disinhibited behaviour with vermis lesions (Schmahmann & Sherman 1998, as above). C7-F10.
      // TODO(medical-review): sev
      { s: 'emotional', lat: 'none', sev: 1 },
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
