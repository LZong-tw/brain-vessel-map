/**
 * Pre-built teaching scenarios.
 */

import type { L } from './types';

export type CameraView = 'left' | 'right' | 'top' | 'bottom' | 'front' | 'back' | 'brainstem';

export interface Scenario {
  id: string;
  group: 'anterior' | 'posterior' | 'deep' | 'haemodynamic';
  title: L;
  summary: L;
  occlusions: { vessel: string; severity: number }[];
  variants?: string[];
  collateral?: 'good' | 'moderate' | 'poor';
  map?: number;
  tH?: number;
  reperfusionH?: number | null;
  decompression?: boolean;
  view?: CameraView;
}

export const SCENARIOS: Scenario[] = [
  // ─────────── anterior circulation ───────────
  {
    id: 'l_m1',
    group: 'anterior',
    title: { zh: '左中大腦動脈 M1 栓塞', en: 'Left MCA M1 embolism' },
    summary: {
      zh: '最常見的大血管中風（常來自心房顫動）。看右側偏癱、全面性失語，以及時間拉長時半影區如何變成梗塞。',
      en: 'The commonest large-vessel stroke (often from atrial fibrillation). Watch right hemiplegia, global aphasia, and penumbra turning into infarct as time passes.',
    },
    occlusions: [{ vessel: 'mca_m1_l', severity: 1 }],
    tH: 3,
    view: 'left',
  },
  {
    id: 'l_m1_thrombectomy',
    group: 'anterior',
    title: { zh: '同上：2 小時內取栓', en: 'Same, with thrombectomy at 2 h' },
    summary: {
      zh: '把血管打通的時間點設在 2 小時，比較 24 小時後救回了多少腦組織。',
      en: 'Recanalisation at 2 h — compare how much brain is saved at 24 h.',
    },
    occlusions: [{ vessel: 'mca_m1_l', severity: 1 }],
    tH: 24,
    reperfusionH: 2,
    view: 'left',
  },
  {
    id: 'r_m1_malignant',
    group: 'anterior',
    title: { zh: '右 M1 阻塞＋側枝不良 → 惡性腦水腫', en: 'Right M1 + poor collaterals → malignant oedema' },
    summary: {
      zh: '側枝循環差時整個中大腦動脈區壞死；第 2–5 天水腫把腦往下擠，壓迫前、後大腦動脈與中腦——梗塞「擴散」到原本沒有阻塞的地方。',
      en: 'With poor collaterals the whole MCA territory dies; on days 2–5 oedema pushes the brain down, compressing the ACA, PCA and midbrain — the damage spreads to territories that were never occluded.',
    },
    occlusions: [{ vessel: 'mca_m1_r', severity: 1 }],
    collateral: 'poor',
    tH: 72,
    view: 'top',
  },
  {
    id: 'r_m1_decompression',
    group: 'anterior',
    title: { zh: '同上：減壓性顱骨切除', en: 'Same, with decompressive craniectomy' },
    summary: {
      zh: '打開頭骨讓腫脹的腦向外膨出，避免疝脫與續發梗塞。',
      en: 'Removing bone lets the swollen brain expand outward, preventing herniation and secondary infarcts.',
    },
    occlusions: [{ vessel: 'mca_m1_r', severity: 1 }],
    collateral: 'poor',
    tH: 72,
    decompression: true,
    view: 'top',
  },
  {
    id: 'r_ica_t',
    group: 'anterior',
    title: { zh: '右內頸動脈末端（T 型）栓塞', en: 'Right carotid-T embolism' },
    summary: {
      zh: '大型栓子卡在分叉處，同時堵住前與中大腦動脈的入口。前交通動脈若通暢，對側會經它逆流救回前大腦動脈區（看 Willis 環裡 AComm 的血流方向）；若沒有，前＋中大腦動脈區一起梗塞。',
      en: 'A large embolus straddles the bifurcation, blocking both ACA and MCA origins. If the anterior communicating artery is open, the other side refills the ACA territory through it (see the AComm flow in the circle-of-Willis view); if not, ACA and MCA territories infarct together.',
    },
    occlusions: [{ vessel: 'ica_terminal_r', severity: 1 }],
    collateral: 'moderate',
    tH: 24,
    view: 'right',
  },
  {
    id: 'l_m2_sup',
    group: 'anterior',
    title: { zh: '左 MCA 上分支：布洛卡失語', en: "Left MCA superior division: Broca's aphasia" },
    summary: {
      zh: '聽得懂但說不出來，右臉與右手無力，腿相對保留。',
      en: 'Understands but cannot speak fluently; right face and arm weak, leg relatively spared.',
    },
    occlusions: [{ vessel: 'mca_m2_sup_l', severity: 1 }],
    collateral: 'moderate',
    tH: 24,
    view: 'left',
  },
  {
    id: 'l_m2_inf',
    group: 'anterior',
    title: { zh: '左 MCA 下分支：韋尼克失語', en: "Left MCA inferior division: Wernicke's aphasia" },
    summary: {
      zh: '說話流利卻沒有意義、聽不懂，幾乎不無力——常被誤認為意識混亂。',
      en: 'Fluent but meaningless speech with poor comprehension and hardly any weakness — often mistaken for confusion.',
    },
    occlusions: [{ vessel: 'mca_m2_inf_l', severity: 1 }],
    tH: 24,
    view: 'left',
  },
  {
    id: 'r_aca',
    group: 'anterior',
    title: { zh: '右前大腦動脈 A2 阻塞', en: 'Right ACA (A2) occlusion' },
    summary: {
      zh: '左腿比左手嚴重的無力、尿失禁、意志缺失。NIHSS 分數偏低卻很失能。',
      en: 'Left leg weaker than arm, incontinence, abulia. Low NIHSS yet disabling.',
    },
    occlusions: [{ vessel: 'aca_a2_r', severity: 1 }],
    collateral: 'moderate',
    tH: 24,
    view: 'top',
  },
  {
    id: 'l_acha',
    group: 'deep',
    title: { zh: '左前脈絡叢動脈阻塞', en: 'Left anterior choroidal artery occlusion' },
    summary: {
      zh: '小血管、大影響：右側偏癱、偏身麻木、右側偏盲。',
      en: 'Small vessel, big effect: right hemiplegia, hemisensory loss and right hemianopia.',
    },
    occlusions: [{ vessel: 'acha_l', severity: 1 }],
    tH: 24,
    view: 'bottom',
  },
  {
    id: 'l_lsa',
    group: 'deep',
    title: { zh: '左豆紋動脈：腔隙性純運動中風', en: 'Left lenticulostriate: pure motor lacune' },
    summary: {
      zh: '高血壓小血管病變的典型：右臉、手、腳同等無力，沒有失語或感覺障礙。',
      en: 'Classic hypertensive small-vessel disease: equal right face–arm–leg weakness, no aphasia or sensory loss.',
    },
    occlusions: [{ vessel: 'lenticulostriate_l', severity: 1 }],
    tH: 24,
    view: 'left',
  },
  {
    id: 'l_thalamic',
    group: 'deep',
    title: { zh: '左視丘膝狀體動脈：視丘感覺中風', en: 'Left thalamogeniculate: thalamic sensory stroke' },
    summary: {
      zh: '右半身全部麻木；把時間拉到 1–3 個月，看中樞性疼痛如何出現。',
      en: 'Numbness of the whole right side; move the timeline to 1–3 months to see central pain appear.',
    },
    occlusions: [{ vessel: 'thalamogeniculate_l', severity: 1 }],
    tH: 24,
    view: 'bottom',
  },
  {
    id: 'percheron',
    group: 'deep',
    title: { zh: 'Percheron 動脈阻塞（雙側視丘）', en: 'Artery of Percheron occlusion (both thalami)' },
    summary: {
      zh: '一條小動脈同時供應雙側視丘：嗜睡、記憶喪失、無法上下看。',
      en: 'One small artery feeds both thalami: drowsiness, amnesia, vertical gaze palsy.',
    },
    occlusions: [{ vessel: 'thalamoperforator_r', severity: 1 }],
    variants: ['percheron_r'],
    tH: 24,
    view: 'bottom',
  },

  // ─────────── posterior circulation ───────────
  {
    id: 'l_pca',
    group: 'posterior',
    title: { zh: '左後大腦動脈 P2 阻塞', en: 'Left PCA (P2) occlusion' },
    summary: {
      zh: '右側偏盲（常保留中心視力）、視丘感覺障礙、記憶問題。',
      en: 'Right hemianopia (often macular-sparing), thalamic sensory loss, memory problems.',
    },
    occlusions: [{ vessel: 'pca_p2_l', severity: 1 }],
    collateral: 'moderate',
    tH: 24,
    view: 'back',
  },
  {
    id: 'basilar_tip',
    group: 'posterior',
    title: { zh: '基底動脈頂端栓塞', en: 'Top-of-the-basilar embolism' },
    summary: {
      zh: '中腦與視丘旁正中缺血：意識障礙、眼球運動異常；後交通動脈越細，枕葉越容易一起梗塞。',
      en: 'Paramedian midbrain and thalamic ischaemia: impaired consciousness and eye movements; the smaller the PComms, the more the occipital lobes infarct too.',
    },
    occlusions: [{ vessel: 'basilar_tip', severity: 1 }],
    variants: ['pcomm_absent_l'],
    collateral: 'moderate',
    tH: 24,
    view: 'brainstem',
  },
  {
    id: 'basilar_mid',
    group: 'posterior',
    title: { zh: '基底動脈中段阻塞：閉鎖症候群', en: 'Mid-basilar occlusion: locked-in' },
    summary: {
      zh: '雙側橋腦腹側梗塞：清醒但全身癱瘓，只能用眼睛溝通。',
      en: 'Bilateral ventral pontine infarction: awake but paralysed, communicating only with the eyes.',
    },
    occlusions: [{ vessel: 'basilar_mid', severity: 1 }],
    tH: 24,
    view: 'brainstem',
  },
  {
    id: 'r_wallenberg',
    group: 'posterior',
    title: { zh: '右椎動脈阻塞：華倫堡氏症候群', en: 'Right vertebral occlusion: Wallenberg' },
    summary: {
      zh: '眩暈、吞嚥困難、聲音沙啞、右側霍納、「右臉左身」痛溫覺喪失——NIHSS 可能只有 1–2 分。',
      en: 'Vertigo, dysphagia, hoarseness, right Horner, pain/temperature loss on the right face and left body — NIHSS may be only 1–2.',
    },
    occlusions: [{ vessel: 'va_v4_dist_r', severity: 1 }],
    tH: 24,
    view: 'brainstem',
  },
  {
    id: 'r_pica',
    group: 'posterior',
    title: { zh: '右 PICA 小腦梗塞 → 水腦', en: 'Right PICA cerebellar infarct → hydrocephalus' },
    summary: {
      zh: '一開始只有頭暈嘔吐，第 1–3 天小腦腫脹壓迫第四腦室與腦幹。',
      en: 'Starts as dizziness and vomiting; over days 1–3 the swollen cerebellum compresses the 4th ventricle and brainstem.',
    },
    occlusions: [{ vessel: 'pica_r', severity: 1 }],
    collateral: 'poor',
    tH: 48,
    view: 'back',
  },
  {
    id: 'l_aica',
    group: 'posterior',
    title: { zh: '左 AICA：突發耳聾＋眩暈', en: 'Left AICA: sudden deafness + vertigo' },
    summary: {
      zh: '內耳與外側橋腦一起缺血：左耳聽不見、左臉麻痺、走不穩。',
      en: 'Inner ear and lateral pons together: deaf left ear, left facial palsy, unsteadiness.',
    },
    occlusions: [{ vessel: 'aica_l', severity: 1 }],
    collateral: 'moderate',
    tH: 24,
    view: 'brainstem',
  },
  {
    id: 'r_sca',
    group: 'posterior',
    title: { zh: '右 SCA 阻塞 → 數月後軟顎顫抖', en: 'Right SCA occlusion → palatal tremor months later' },
    summary: {
      zh: '右手腳協調障礙；齒狀核受損後，對側延髓的下橄欖核會在數月後肥大退化。',
      en: 'Right limb ataxia; after dentate damage the opposite inferior olive in the medulla degenerates over months.',
    },
    occlusions: [{ vessel: 'sca_r', severity: 1 }],
    collateral: 'poor',
    tH: 2160,
    view: 'back',
  },
  {
    id: 'l_pontine',
    group: 'posterior',
    title: { zh: '左橋腦旁正中穿通支：交叉性癱瘓', en: 'Left pontine perforator: crossed paralysis' },
    summary: {
      zh: '左眼無法外轉、左臉麻痺，右側手腳癱瘓——腦神經在病灶側、肢體在對側。',
      en: 'Left eye cannot abduct, left face palsy, right limbs paralysed — cranial nerves on the lesion side, limbs on the other.',
    },
    occlusions: [{ vessel: 'pontine_paramedian_caudal_l', severity: 1 }],
    tH: 24,
    view: 'brainstem',
  },
  {
    id: 'r_asa',
    group: 'posterior',
    title: { zh: '右延髓內側：Dejerine 症候群', en: 'Right medial medulla: Dejerine syndrome' },
    summary: {
      zh: '左側手腳無力（臉不受影響）、左側本體覺喪失、舌頭偏向右側。',
      en: 'Left arm and leg weak (face spared), left position-sense loss, tongue deviates to the right.',
    },
    occlusions: [{ vessel: 'asa_root_r', severity: 1 }],
    tH: 24,
    view: 'brainstem',
  },

  // ─────────── haemodynamic ───────────
  {
    id: 'ica_silent',
    group: 'haemodynamic',
    title: { zh: '右內頸動脈閉塞＋完整 Willis 環', en: 'Right ICA occlusion with complete circle of Willis' },
    summary: {
      zh: '血液經前交通、後交通動脈與眼動脈逆流補足，大多沒有症狀——打開「血流」圖層看方向反轉。',
      en: 'Blood arrives via the AComm, PComm and reversed ophthalmic flow, so there are few symptoms — turn on the flow layer to see reversals.',
    },
    occlusions: [{ vessel: 'ica_cervical_r', severity: 1 }],
    tH: 24,
    view: 'bottom',
  },
  {
    id: 'ica_isolated',
    group: 'haemodynamic',
    title: { zh: '同樣的內頸動脈閉塞，但沒有交通動脈', en: 'Same ICA occlusion without communicating arteries' },
    summary: {
      zh: '個體差異決定命運：缺少前、後交通動脈時，同一條血管阻塞會造成整個半球梗塞。',
      en: 'Anatomy decides: without AComm and PComm the same occlusion infarcts the whole hemisphere.',
    },
    occlusions: [{ vessel: 'ica_cervical_r', severity: 1 }],
    variants: ['acomm_absent', 'pcomm_absent_r'],
    tH: 24,
    view: 'right',
  },
  {
    id: 'fetal_pca',
    group: 'haemodynamic',
    title: { zh: '胚胎型後大腦動脈：頸動脈栓塞也會傷到枕葉', en: 'Fetal PCA: a carotid embolus can hit the occipital lobe' },
    summary: {
      zh: '後大腦動脈主要由內頸動脈經粗大的後交通動脈供血時，來自頸動脈的栓子卡在後交通動脈，就會造成枕葉（後循環區）梗塞。',
      en: 'When the PCA is fed mainly from the ICA through a large PComm, a carotid embolus lodging there infarcts the occipital lobe (a "posterior" territory).',
    },
    occlusions: [{ vessel: 'pcomm_r', severity: 1 }],
    variants: ['fetal_pca_r'],
    collateral: 'poor',
    tH: 24,
    view: 'right',
  },
  {
    id: 'watershed',
    group: 'haemodynamic',
    title: { zh: '頸動脈重度狹窄＋低血壓：分水嶺梗塞', en: 'Severe carotid stenosis + hypotension: watershed infarction' },
    summary: {
      zh: '血管沒有完全塞住，但血壓一降，最末梢的邊界區先缺血。',
      en: 'No vessel is fully blocked, but when blood pressure falls the most distal border zones fail first.',
    },
    occlusions: [{ vessel: 'ica_cervical_r', severity: 0.85 }],
    map: 60,
    tH: 24,
    view: 'top',
  },
  {
    id: 'subclavian_steal',
    group: 'haemodynamic',
    title: { zh: '左鎖骨下動脈近端阻塞：竊血', en: 'Proximal left subclavian occlusion: steal' },
    summary: {
      zh: '左椎動脈血流倒流去供應左手；腦部多半由其他血管補足。',
      en: 'The left vertebral artery reverses to feed the left arm; the brain is usually covered by other vessels.',
    },
    occlusions: [{ vessel: 'subclavian_prox_l', severity: 1 }],
    tH: 1,
    view: 'front',
  },
  {
    id: 'amaurosis',
    group: 'haemodynamic',
    title: { zh: '右眼動脈栓塞：一過性黑矇', en: 'Right ophthalmic embolism: amaurosis fugax' },
    summary: {
      zh: '頸動脈的小栓子先到眼睛：右眼突然看不見，是腦中風的警訊。',
      en: 'A small carotid embolus reaches the eye first: sudden right-eye blindness, a warning of stroke.',
    },
    occlusions: [{ vessel: 'ophthalmic_r', severity: 1 }],
    tH: 1,
    view: 'front',
  },
];

export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(SCENARIOS.map((s) => [s.id, s]));
