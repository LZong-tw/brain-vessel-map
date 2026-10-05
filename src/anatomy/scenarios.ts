/**
 * Pre-built teaching scenarios.
 */

import type { L } from './types';
import { indexById } from './indexById';

export type CameraView = 'left' | 'right' | 'top' | 'bottom' | 'front' | 'back' | 'brainstem';

export interface Scenario {
  id: string;
  group: 'anterior' | 'posterior' | 'deep' | 'haemodynamic';
  title: L;
  summary: L;
  /**
   * fromH / toH: when an occlusion begins and when it reopens by itself (hours; default 0 and
   * never). A vessel may appear more than once with non-overlapping windows.
   */
  occlusions: { vessel: string; severity: number; branch?: boolean; fromH?: number; toH?: number | null }[];
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
    // a classic carotid-territory TIA; whether any tissue dies in 5 min is decided by the
    // tissue parameters (lagH) — the text covers both outcomes
    id: 'tia_l_mca',
    group: 'anterior',
    title: { zh: '暫時性腦缺血發作（TIA）：左 MCA 上分支 5 分鐘', en: 'Transient ischaemic attack (TIA): left MCA superior division for 5 minutes' },
    summary: {
      zh: '小栓子卡住左中大腦動脈上分支，約 5 分鐘後自行溶解。發作當下說不出話、右臉右手出現症狀；血流一恢復症狀就消失（把時間軸從「發生時」往後拉）。依組織學定義，TIA 不留下梗塞；若缺血期間已有組織壞死（擴散加權 MRI 看得到），就算是小中風——模型會不會留下病灶，取決於組織能撐多久的參數。TIA 後幾天內中風風險最高，要當急症處理。',
      en: 'A small embolus lodges in the left MCA superior division and breaks up after about 5 minutes. During the attack speech fails and the right face and arm are affected; once flow returns the symptoms are gone (move the timeline on from "Onset"). By the tissue-based definition a TIA leaves no infarct; if tissue died during the ischaemia (visible on diffusion MRI) it is a minor stroke — whether the model leaves a lesion depends on how long its tissue parameters let ischaemic tissue survive. Stroke risk is highest in the days after a TIA, so it is an emergency.',
    },
    occlusions: [{ vessel: 'mca_m2_sup_l', severity: 1, fromH: 0, toH: 1 / 12 }],
    tH: 0,
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
    collateral: 'poor',
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
    title: { zh: '左豆紋動脈群：紋狀體內囊梗塞', en: 'Left lenticulostriate arteries: striatocapsular infarct' },
    summary: {
      zh: '這裡把整群豆紋動脈一起阻塞：殼核、尾狀核與內囊梗塞，右側偏癱為主。只塞住其中一條小分支則是下一個情境的「腔隙性」中風。',
      en: 'Here the whole lenticulostriate group is blocked: putamen, caudate and internal capsule infarct with mainly right hemiparesis. Blocking just one small branch gives the lacunar stroke of the next scenario.',
    },
    occlusions: [{ vessel: 'lenticulostriate_l', severity: 1 }],
    tH: 24,
    view: 'left',
  },
  {
    id: 'l_lacune',
    group: 'deep',
    title: { zh: '左豆紋動脈單一分支：純運動性腔隙中風', en: 'One left lenticulostriate branch: pure motor lacune' },
    summary: {
      zh: '高血壓小血管病變的典型：梗塞不到 1 mL，卻因內囊後肢的運動纖維非常密集，右臉、手、腳同等無力；沒有失語、視野或感覺障礙。',
      en: 'Classic hypertensive small-vessel disease: an infarct under 1 mL, yet because motor fibres are packed tightly in the posterior limb, the right face, arm and leg are equally weak — no aphasia, field or sensory loss.',
    },
    occlusions: [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }],
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
      zh: '雙側橋腦腹側缺血：清醒但四肢癱瘓、不能說話與吞嚥，只能用垂直眼動和眨眼溝通。側枝循環決定組織能撐多久——在「設定」改變側枝等級或再通時間比較看看。',
      en: 'Bilateral ventral pontine ischaemia: awake but quadriplegic, unable to speak or swallow, communicating only by vertical eye movements and blinking. Collaterals decide how long the tissue holds out — compare collateral grades or recanalisation times in Settings.',
    },
    occlusions: [{ vessel: 'basilar_mid', severity: 1 }],
    tH: 24,
    view: 'brainstem',
  },
  {
    // prodromes: Ferbert A, Brückmann H, Drummen R, Stroke 1990;21:1135–42 (vertigo, nausea and
    // headache were the commonest, in the 2 weeks before); von Campe G, Regli F, Bogousslavsky J,
    // J Neurol Neurosurg Psychiatry 2003;74:1621–6 (warning signs in 22 of 24 patients)
    id: 'basilar_stuttering',
    group: 'posterior',
    title: { zh: '進展性基底動脈血栓：前驅 TIA → 閉鎖症候群', en: 'Progressive basilar thrombosis: prodromal TIA → locked-in syndrome' },
    summary: {
      zh: '基底動脈中段重度狹窄。第 0 天血栓暫時完全塞住約 5 分鐘：頭暈、複視、講話不清、肢體無力，隨後消失（前驅 TIA）；之後只剩 90% 狹窄，沒有症狀。第 3 天完全阻塞：雙側橋腦腹側梗塞 → 閉鎖症候群。後循環的短暫症狀常被當成「頭暈」忽略，卻可能是基底動脈閉塞的警訊：Ferbert 等（Stroke 1990）的病人最常見的前驅症狀是眩暈、噁心與頭痛，多在中風前 2 週內；von Campe 等（J Neurol Neurosurg Psychiatry 2003）的 24 位重度或致死的基底動脈閉塞病人中，只有 2 位事前沒有警訊。',
      en: 'Severe stenosis of the mid basilar artery. On day 0 a thrombus blocks it completely for about 5 minutes: dizziness, double vision, slurred speech, limb weakness — then everything clears (a prodromal TIA), leaving a silent 90 % stenosis. On day 3 it occludes completely: bilateral ventral pontine infarction → locked-in syndrome. Transient posterior-circulation symptoms are easily dismissed as "dizziness" but can herald basilar occlusion: in Ferbert et al. (Stroke 1990) the commonest prodromes were vertigo, nausea and headache, mostly in the 2 weeks before the stroke; of 24 patients with severe or fatal basilar occlusion in von Campe et al. (J Neurol Neurosurg Psychiatry 2003), only 2 had no warning signs.',
    },
    occlusions: [
      { vessel: 'basilar_mid', severity: 1, fromH: 0, toH: 1 / 12 },
      { vessel: 'basilar_mid', severity: 0.9, fromH: 1 / 12, toH: 72 },
      { vessel: 'basilar_mid', severity: 1, fromH: 72 },
    ],
    tH: 0,
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
    title: { zh: '左橋腦旁正中穿通支：交叉性癱瘓（Foville）', en: 'Left pontine perforator: crossed paralysis (Foville)' },
    summary: {
      zh: '雙眼無法看向左邊（水平凝視麻痺）、左臉整側麻痺，右側手腳癱瘓——腦神經徵象在病灶側、肢體在對側。',
      en: 'Neither eye can look to the left (horizontal gaze palsy), whole left face paralysed, right limbs weak — cranial-nerve signs on the lesion side, limbs on the other.',
    },
    occlusions: [{ vessel: 'pontine_paramedian_caudal_l', severity: 1 }],
    tH: 24,
    view: 'brainstem',
  },
  {
    id: 'r_pontine_lacune',
    group: 'posterior',
    title: { zh: '右橋腦小穿通支：運動失調性偏癱', en: 'Small right pontine branch: ataxic hemiparesis' },
    summary: {
      zh: '一條橋腦旁正中小分支阻塞：左側無力加上同側的笨拙與運動失調（或構音障礙—笨拙手）。和內囊腔隙一樣是小血管病，但位置在腦幹。',
      en: 'One small paramedian pontine branch: left-sided weakness with clumsiness and ataxia on the same side (or dysarthria–clumsy hand). Small-vessel disease like a capsular lacune, but in the brainstem.',
    },
    occlusions: [{ vessel: 'pontine_paramedian_rostral_r', severity: 1, branch: true }],
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
      zh: '血液經前交通、後交通動脈與眼動脈逆流補足，大多沒有症狀——打開「血流」圖層看方向反轉。但這樣完整的 Willis 環在 MRA 研究中只見於約 12–42% 的成人；少了前交通動脈，同樣的阻塞就會造成大範圍梗塞（打開「前交通動脈缺如」變異試試）。',
      en: 'Blood arrives via the AComm, PComm and reversed ophthalmic flow, so there are few symptoms — turn on the flow layer to see reversals. But MRA studies find such a complete circle in only about 12–42% of adults; without the AComm the same occlusion leaves a large infarct (turn on the absent-AComm variant to see it).',
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
      zh: '左椎動脈血流倒流去供應左手，血液經椎基底動脈交會處由右椎動脈補上；基底動脈仍順向流動，腦部不受影響，多半沒有症狀——打開「血流」圖層看方向反轉。',
      en: 'The left vertebral artery reverses to feed the left arm, drawing on the right vertebral artery across the vertebrobasilar junction; the basilar artery keeps flowing forwards and the brain is unaffected, so it is usually silent — turn on the flow layer to see the reversal.',
    },
    occlusions: [{ vessel: 'subclavian_prox_l', severity: 1 }],
    tH: 1,
    view: 'front',
  },
  {
    id: 'amaurosis',
    group: 'haemodynamic',
    title: { zh: '右眼動脈栓塞：單眼突然失明', en: 'Right ophthalmic embolism: sudden monocular blindness' },
    summary: {
      zh: '頸動脈的小栓子先到眼睛：右眼突然看不見。幾分鐘內自行恢復叫「一過性黑矇」（眼睛的暫時性缺血），持續不退則是視網膜中央動脈阻塞——兩者都是腦中風的警訊，要當急症處理。視網膜能撐多久並不確定（猴子實驗約 1.5–4 小時，人類可能只有 12–15 分鐘）；模型採用較短的估計。',
      en: 'A small carotid embolus reaches the eye first: sudden right-eye blindness. If it clears within minutes it is amaurosis fugax (a TIA of the eye); if it persists it is a central retinal artery occlusion — both are stroke warnings and emergencies. How long the retina survives is uncertain (about 1.5–4 h in monkey experiments, perhaps only 12–15 min in people); the model uses the shorter estimate.',
    },
    occlusions: [{ vessel: 'ophthalmic_r', severity: 1 }],
    tH: 1,
    view: 'front',
  },
];

export const SCENARIO_BY_ID: Record<string, Scenario> = indexById(SCENARIOS, (s) => s.id);
