/**
 * Symptom catalogue.
 *
 * NIHSS mapping: `pts` gives the item score for [mild, moderate, severe] involvement.
 * These are EDUCATIONAL approximations used to illustrate relative severity; the real
 * NIHSS is a bedside examination and cannot be derived from a lesion map.
 * References: the scale goes back to Brott T, et al. Stroke. 1989;20:864-870, the
 * original 15-item scale (it still had a pupil item). The item codes used here (1a … 11) and their
 * point ranges follow the NIHSS as used in the NINDS t-PA trial
 * (Lyden P et al. Stroke. 1994;25:2220-2226) and the current NIH Stroke Scale form (NINDS).
 */

import type { SymptomDef } from './types';
import { indexById } from './indexById';

export const SYMPTOMS: SymptomDef[] = [
  // ── Consciousness ────────────────────────────────────────────────
  {
    // One-sided lesions: Parvizi J, Damasio AR. Brain 2003;126:1524–1536 (of 9 brainstem-coma
    // patients the tegmental lesion was bilateral in 7 and one-sided in 2; 9 patients with a very
    // small one-sided tegmental lesion were not comatose). Course: coma rarely lasts more than two
    // weeks and is followed by wakefulness without, or with fluctuating, awareness (O'Donnell JC et
    // al. Neurosci Biobehav Rev 2019;98:336–346, a review of traumatic coma, for the definitions);
    // ventral pontine lesions often leave the person comatose for days to weeks before they wake
    // up locked-in (Laureys S et al. Prog Brain Res 2005;150:495–511); the loss of consciousness
    // of bilateral pontine infarcts is transient (Kumral E et al. J Neurol 2002;249:1659–1670).
    // clinical.ts turns a region's coma into what follows it from two weeks on.
    id: 'coma',
    name: { zh: '意識障礙／昏迷', en: 'Reduced consciousness / coma' },
    desc: {
      zh: '維持清醒的網狀活化系統（腦幹上部、雙側視丘）受損，可能叫不醒。通常要兩側都受損；單側的上橋腦或中腦被蓋病灶偶爾也會造成昏迷（一項腦幹中風研究的昏迷病人 9 位中有 2 位是單側），範圍大時也可能只是嗜睡。昏迷很少超過約兩週：之後會醒來，模型改列接下來的狀態——視丘或範圍有限的中腦病灶之後是長期嗜睡；兩側上橋腦或中腦被蓋大範圍梗塞之後，是意識障礙（或其實清醒、但被閉鎖）。',
      en: 'The arousal network (upper brainstem reticular formation, both thalami) is damaged; the person may be unrousable. It usually takes damage on both sides; a one-sided upper pontine or midbrain tegmental lesion occasionally causes coma (2 of 9 comatose patients in a study of brainstem strokes) and, when extensive, can cause drowsiness instead. Coma rarely lasts more than about two weeks: the person then wakes, and the model lists what follows — persistent hypersomnia after thalamic or limited midbrain lesions, and after extensive damage to the upper pontine or midbrain tegmentum on both sides a disorder of consciousness (or awareness hidden by a locked-in state).',
    },
    system: 'consciousness',
    lateralised: false,
    nihss: { item: '1a', pts: [1, 2, 3] },
  },
  {
    // What follows coma after extensive bilateral tegmental damage (clinical.ts, from two weeks).
    // O'Donnell JC et al. Neurosci Biobehav Rev 2019;98:336–346 (unresponsive wakefulness vs
    // minimally conscious state; the diagnoses are often inaccurate, recovery unpredictable).
    // Laureys S et al. Prog Brain Res 2005;150:495–511 (locked-in patients superficially resemble a
    // vegetative state or akinetic mutism; diagnosis took 2.5 months on average).
    // Castaigne P et al. Ann Neurol 1981;10:127–148 (paramedian thalamopeduncular infarcts:
    // hypersomnia, deep coma, akinetic mutism).
    id: 'disorder_of_consciousness',
    name: {
      zh: '昏迷之後的意識障礙（無反應覺醒、最小意識狀態），或其實清醒（閉鎖）',
      en: 'Disorder of consciousness after coma (unresponsive wakefulness, minimally conscious state) — or awareness hidden by paralysis',
    },
    desc: {
      zh: '昏迷之後眼睛會睜開、恢復睡醒週期，但覺察能力可能沒有回來（無反應覺醒症候群，舊稱植物人狀態）、時有時無（最小意識狀態），或中腦大範圍受損後呈無動性緘默。也可能其實完全清醒，只是全身癱瘓、無法表達（閉鎖症候群）——外觀相近、常被誤判：要請病人用上下看或眨眼回答問題來確認。模型分不出是哪一種；意識能否恢復、何時恢復都難以預測。',
      en: 'After coma the eyes open and sleep–wake cycles return, but awareness may not have returned (unresponsive wakefulness syndrome, formerly the vegetative state), may come and go (minimally conscious state), or the person may be in akinetic mutism after extensive midbrain damage. Or they may be fully aware but paralysed and unable to show it (locked-in syndrome) — the states look alike and are often confused: ask for answers by looking up or blinking. The model cannot tell which; whether and when awareness returns is hard to predict.',
    },
    system: 'consciousness',
    lateralised: false,
    nihss: { item: '1a', pts: [1, 2, 3] },
  },
  {
    id: 'somnolence',
    name: { zh: '嗜睡、反應遲鈍', en: 'Drowsiness / hypersomnolence' },
    desc: {
      zh: '一直想睡、叫醒後很快又睡著，常見於視丘旁正中或中腦受損，單側上橋腦被蓋大範圍梗塞也可能出現。這是急性期的表現：約兩週後仍持續的睡眠需求增加，改列為「長期嗜睡」。',
      en: 'Excessive sleepiness, drifting off after being roused; typical of paramedian thalamic or midbrain lesions, and possible with an extensive one-sided upper pontine tegmental infarct. This is the acute picture: a raised need for sleep that persists beyond about two weeks is listed as persistent hypersomnia instead.',
    },
    system: 'consciousness',
    lateralised: false,
    nihss: { item: '1a', pts: [1, 1, 2] },
  },

  // ── Motor ────────────────────────────────────────────────────────
  {
    id: 'face_weak',
    name: { zh: '下半臉無力（中樞性）', en: 'Lower facial weakness (central)' },
    desc: {
      zh: '嘴角歪斜、鼻唇溝變淺，但額頭還能皺（額頭有雙側神經支配）。',
      en: 'Drooping mouth corner and flattened nasolabial fold; the forehead is spared because it has bilateral innervation.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '4', pts: [1, 2, 2] },
  },
  {
    id: 'face_weak_peripheral',
    name: { zh: '整側臉無力（周邊型顏面神經麻痺）', en: 'Whole-face weakness (peripheral facial palsy)' },
    desc: {
      zh: '顏面神經核或其纖維受損：連額頭都不能皺、眼睛閉不緊。',
      en: 'Facial nucleus or fascicle damaged: the forehead is also weak and the eye cannot close tightly.',
    },
    system: 'cranial',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '4', pts: [2, 3, 3] },
  },
  {
    id: 'arm_weak',
    name: { zh: '手臂無力', en: 'Arm weakness' },
    desc: {
      zh: '手舉不起來、拿不住東西，嚴重時完全癱瘓。',
      en: 'Cannot lift the arm or hold objects; complete paralysis when severe.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '5', pts: [2, 3, 4] },
  },
  {
    id: 'arm_weak_proximal',
    name: { zh: '肩膀與上臂近端無力', en: 'Proximal arm / shoulder weakness' },
    desc: {
      zh: '分水嶺區受損的典型表現：手指還能動，但肩膀抬不起來。',
      en: 'Typical of border-zone infarcts: fingers move, but the shoulder and upper arm are weak.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '5', pts: [1, 1, 2] },
  },
  {
    id: 'leg_weak',
    name: { zh: '腿部無力', en: 'Leg weakness' },
    desc: {
      zh: '腿抬不起來、站不穩、走路拖行。',
      en: 'Cannot lift the leg, unstable standing, dragging gait.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '6', pts: [2, 3, 4] },
  },
  {
    id: 'hand_clumsy',
    name: { zh: '手部精細動作笨拙', en: 'Clumsy hand' },
    desc: {
      zh: '扣釦子、寫字變得困難，力氣卻還算可以。',
      en: 'Buttoning and writing become difficult though strength is relatively preserved.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '5', pts: [1, 1, 1] },
  },
  {
    id: 'dysarthria',
    name: { zh: '構音障礙（口齒不清）', en: 'Dysarthria (slurred speech)' },
    desc: {
      zh: '說話含糊、像喝醉，但語言內容正確。',
      en: 'Slurred, "drunk-sounding" speech with correct language content.',
    },
    system: 'motor',
    lateralised: false,
    nihss: { item: '10', pts: [1, 1, 2] },
  },
  {
    id: 'anarthria',
    name: { zh: '構音不能（完全無法發聲說話）', en: 'Anarthria (unable to produce any speech)' },
    desc: {
      zh: '雙側橋腦腹側的皮質延髓徑一起受損，發聲與構音的肌肉完全癱瘓：清醒、聽得懂，卻連一個音也發不出來，是閉鎖症候群的特徵。與構音障礙（口齒不清但仍能發聲）不同，這是完全的失聲。',
      en: 'Both corticobulbar tracts in the ventral pons are cut, paralysing the muscles of speech entirely: the person is awake and understands language but cannot produce any sound at all — the hallmark of locked-in syndrome. This is not merely worse dysarthria (slurred but present speech); it is a total loss of speech output.',
    },
    // Bauer G, Gerstenbrand F, Rumpl E. Varieties of the locked-in syndrome. J Neurol. 1979;221:77-91.
    // Patterson JR, Grabois M. Locked-in syndrome: a review of 139 cases. Stroke. 1986;17:758-764.
    system: 'motor',
    lateralised: false,
    nihss: { item: '10', pts: [2, 2, 2] },
  },
  {
    id: 'dysphagia',
    name: { zh: '吞嚥困難', en: 'Dysphagia (swallowing difficulty)' },
    desc: {
      zh: '喝水嗆咳、食物卡住；會大幅增加吸入性肺炎風險。',
      en: 'Choking on liquids, food sticking; greatly increases the risk of aspiration pneumonia.',
    },
    system: 'cranial',
    lateralised: false,
  },
  {
    id: 'hoarseness',
    name: { zh: '聲音沙啞', en: 'Hoarseness' },
    desc: {
      zh: '疑核受損使同側聲帶與軟顎麻痺。',
      en: 'Nucleus ambiguus damage paralyses the vocal cord and palate on the same side.',
    },
    system: 'cranial',
    lateralised: true,
    sideWord: 'body',
  },
  {
    id: 'tongue_weak',
    name: { zh: '舌頭偏向患側（舌下神經麻痺）', en: 'Tongue deviates to the lesion side (CN XII)' },
    desc: {
      zh: '伸舌時舌頭偏向受損的同一側。',
      en: 'On protrusion the tongue deviates towards the side of the lesion.',
    },
    system: 'cranial',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '10', pts: [1, 1, 1] },
  },
  {
    id: 'jaw_weak',
    name: { zh: '咀嚼肌無力（三叉神經運動支）', en: 'Jaw weakness (CN V motor)' },
    desc: {
      zh: '咬合無力，張口時下巴偏向患側。',
      en: 'Weak bite; the jaw deviates to the lesion side on opening.',
    },
    system: 'cranial',
    lateralised: true,
    sideWord: 'body',
  },
  {
    id: 'apraxia',
    name: { zh: '失用症', en: 'Apraxia' },
    desc: {
      zh: '力氣正常，卻做不出指定的動作（例如假裝刷牙）。',
      en: 'Cannot carry out learned movements on command (e.g. pretend to brush teeth) despite normal strength.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'abulia',
    name: { zh: '意志缺失（主動性降低）', en: 'Abulia (loss of initiative)' },
    desc: {
      zh: '變得被動、反應慢、不主動說話或做事。',
      en: 'Passive and slow, rarely initiating speech or action.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'akinetic_mutism',
    name: { zh: '無動性緘默', en: 'Akinetic mutism' },
    desc: {
      zh: '雙側內側額葉或前扣帶迴受損：清醒但幾乎不動、不說話。',
      en: 'Bilateral medial frontal / anterior cingulate damage: awake but almost motionless and mute.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'incontinence',
    name: { zh: '尿失禁', en: 'Urinary incontinence' },
    desc: {
      zh: '內側額葉的排尿控制中樞受損。',
      en: 'The medial frontal micturition control area is affected.',
    },
    system: 'autonomic',
    lateralised: false,
  },
  {
    id: 'alien_hand',
    name: { zh: '異己手症候群', en: 'Alien hand' },
    desc: {
      zh: '一隻手好像有自己的意志，會做出不受控制的動作。',
      en: 'One hand performs purposeful-looking movements outside voluntary control.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
  },
  {
    id: 'ataxia_limb',
    name: { zh: '肢體運動失調（辨距不良）', en: 'Limb ataxia (dysmetria)' },
    desc: {
      zh: '手指碰鼻子會偏掉、動作不協調；力氣可能正常。',
      en: 'Finger-to-nose overshoots, movements are uncoordinated; strength may be normal.',
    },
    system: 'balance',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '7', pts: [1, 1, 2] },
  },
  {
    id: 'ataxia_gait',
    name: { zh: '步態／軀幹不穩', en: 'Gait / truncal ataxia' },
    desc: {
      zh: '坐不穩、走路像喝醉。NIHSS 幾乎不計分，因此容易被低估。',
      en: 'Unsteady sitting and a drunken gait. NIHSS barely scores this, so it is easily underestimated.',
    },
    system: 'balance',
    lateralised: false,
  },
  {
    id: 'tremor',
    name: { zh: '意向性顫抖', en: 'Intention / rubral tremor' },
    desc: {
      zh: '接近目標時手抖得更厲害（小腦—紅核路徑受損）。',
      en: 'Tremor worsening near a target (cerebellar–rubral pathway damage).',
    },
    system: 'balance',
    lateralised: true,
    sideWord: 'body',
  },
  {
    // Raina GB et al. Neurology 2016;86:931–938 (29 patients, 48 % vascular: median 2 months from
    // the lesion to the tremor, 7 days to 228 months; levodopa helped 13 of 24). Castaigne P et al.
    // Ann Neurol 1981;10:127–148 (paramedian thalamopeduncular infarcts: abnormal movements always
    // delayed). Deuschl G, Bain P, Brin M. Mov Disord 1998;13 Suppl 3:2–23 (Holmes tremor as a
    // tremor syndrome of its own, apart from cerebellar tremor).
    id: 'holmes_tremor',
    name: { zh: '霍姆斯（Holmes）顫抖（紅核性顫抖，數週至數月後）', en: 'Holmes (rubral) tremor (weeks to months later)' },
    desc: {
      zh: '中腦紅核一帶（或視丘）受損後，對側手臂出現緩慢、不規則的抖動，靜止、維持姿勢和動作時都會抖，動作時最明顯。它不是一開始就出現：中位數約在受損後 2 個月（7 天到數年都有），常合併無力或運動失調。約一半的病人用 levodopa 有幫助；模型讓它只自行減輕一點，這是假設。',
      en: 'After damage around the red nucleus in the midbrain (or the thalamus), the arm on the opposite side develops a slow, irregular tremor at rest, when holding a posture and during movement, worst with movement. It does not start at once: a median of about 2 months after the lesion (from 7 days to years), often with weakness or ataxia. Levodopa helps about half; the model lets it settle only a little by itself, which is an assumption.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
    delayed: true,
  },
  {
    id: 'movement_disorder',
    name: { zh: '不自主運動（舞蹈症／肌張力異常）', en: 'Involuntary movements (chorea / dystonia)' },
    desc: {
      zh: '基底核受損可能出現不自主的甩動或扭轉。',
      en: 'Basal ganglia damage can produce flinging or twisting involuntary movements.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
  },
  {
    // Ghika-Schmid F, Ghika J, Regli F, Bogousslavsky J. J Neurol Sci 1997;146:109–116 (Lausanne
    // Stroke Registry: 3 of 29 post-stroke hyperkinetic movement disorders; specifically with a
    // small posterior choroidal infarct; such movements usually regress). Neau JP, Bogousslavsky J.
    // Ann Neurol 1996;39:779–788 (late disability from pain and delayed abnormal movements).
    id: 'jerky_dystonic_hand',
    name: {
      zh: '可能出現：抽動、扭轉、不穩的手（數週後）',
      en: 'Possible: jerky, dystonic, unsteady hand (weeks later)',
    },
    desc: {
      zh: '後脈絡叢動脈區（視丘後部）的小梗塞之後，對側的手可能出現不規則的抽動、扭轉姿勢與不穩，常合併位置感覺變差。這是少見的晚期表現（一個中風登錄中只有 3 位），通常會自行減輕。',
      en: 'After a small infarct in the posterior choroidal territory (posterior thalamus) the opposite hand may develop irregular jerks, twisted postures and unsteadiness, often with poor position sense. An uncommon late feature (3 patients in one stroke registry) that usually settles by itself.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
    delayed: true,
  },
  {
    // Schmahmann JD. Stroke 2003;34:2264–2278 (tuberothalamic infarcts: emotional facial paresis).
    // Voluntary facial movement, which NIHSS item 4 tests, is normal, so it is not scored.
    id: 'emotional_facial_paresis',
    name: { zh: '情緒性臉部無力', en: 'Emotional facial paresis' },
    desc: {
      zh: '照指示做表情（齜牙、閉眼）時臉部正常，但自然地笑或哭時，對側下半臉動得比較少。視丘前部（結節視丘動脈區）受損的特徵之一；NIHSS 不計分。',
      en: 'The face moves normally on command (showing the teeth, closing the eyes), but the lower face on the opposite side moves less in spontaneous smiling or crying. A feature of anterior (tuberothalamic) thalamic infarcts; not scored by the NIHSS.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
  },
  {
    id: 'spasticity',
    name: { zh: '肌肉痙攣、僵硬（數週後）', en: 'Spasticity (weeks later)' },
    desc: {
      zh: '運動路徑受損後，數週到數月逐漸出現肌張力增加與攣縮。',
      en: 'After motor pathway damage, increased tone and contractures develop over weeks to months.',
    },
    system: 'motor',
    lateralised: true,
    sideWord: 'body',
    delayed: true,
  },

  // ── Sensory ──────────────────────────────────────────────────────
  {
    id: 'sens_face_arm',
    name: { zh: '臉部與手臂感覺減退', en: 'Face & arm sensory loss' },
    desc: {
      zh: '麻木、觸覺變鈍。',
      en: 'Numbness and reduced touch sensation.',
    },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '8', pts: [1, 1, 2] },
  },
  {
    id: 'sens_leg',
    name: { zh: '腿部感覺減退', en: 'Leg sensory loss' },
    desc: { zh: '腿部麻木、觸覺變鈍。', en: 'Numbness of the leg.' },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '8', pts: [1, 1, 2] },
  },
  {
    id: 'sens_hemibody',
    name: { zh: '半側全身感覺喪失', en: 'Hemibody sensory loss (all modalities)' },
    desc: {
      zh: '臉、手、腳整側感覺都消失——視丘的感覺轉運站受損。',
      en: 'Face, arm and leg on one side lose all sensation — the thalamic sensory relay is damaged.',
    },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '8', pts: [1, 2, 2] },
  },
  {
    id: 'pain_temp_body',
    name: { zh: '身體痛覺與溫度覺喪失', en: 'Loss of pain & temperature (body)' },
    desc: {
      zh: '脊髓視丘徑受損：摸得到，卻感覺不到燙或痛。',
      en: 'Spinothalamic tract damage: touch is felt, but heat and pain are not.',
    },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
    nihss: { item: '8', pts: [1, 1, 1] },
  },
  {
    id: 'pain_temp_face',
    name: { zh: '臉部痛覺與溫度覺喪失', en: 'Loss of pain & temperature (face)' },
    desc: {
      zh: '延髓與橋腦下部的三叉神經脊髓束核受損時，症狀在病灶同側臉；橋腦中段以上的病灶因痛溫覺纖維已交叉，症狀在對側臉。',
      en: 'In the medulla and lower pons (spinal trigeminal nucleus/tract) the face on the same side as the lesion is affected; above the mid-pons the pain/temperature fibres have crossed, so the opposite side of the face is affected.',
    },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
  },
  {
    id: 'proprio_loss',
    name: { zh: '本體感覺與振動覺喪失', en: 'Loss of position & vibration sense' },
    desc: {
      zh: '內側蹄系受損：閉眼時不知道手腳在哪裡。',
      en: 'Medial lemniscus damage: with eyes closed the person cannot tell where the limbs are.',
    },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
    // not scored: NIHSS item 8 tests pinprick only
  },
  {
    id: 'sens_face_all',
    name: { zh: '同側臉部感覺喪失（三叉神經）', en: 'Facial sensory loss (CN V nucleus)' },
    desc: {
      zh: '三叉神經主感覺核受損。',
      en: 'Principal trigeminal sensory nucleus damage.',
    },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
  },
  {
    id: 'cortical_sensory',
    name: { zh: '皮質感覺障礙（實體覺失認）', en: 'Cortical sensory loss (astereognosis)' },
    desc: {
      zh: '閉眼摸不出手中是鑰匙還是硬幣。',
      en: 'With eyes closed cannot identify a key or a coin in the hand.',
    },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
  },
  {
    id: 'central_pain',
    name: { zh: '中樞性中風後疼痛（數週至數月後）', en: 'Central post-stroke pain (weeks–months later)' },
    desc: {
      zh: '感覺路徑受損後出現燒灼、刺痛的慢性疼痛，典型見於視丘（Dejerine–Roussy）或延髓外側。',
      en: 'Burning, lancinating chronic pain after sensory pathway damage, classically thalamic (Dejerine–Roussy) or lateral medullary.',
    },
    system: 'sensory',
    lateralised: true,
    sideWord: 'body',
    delayed: true,
  },

  // ── Vision ───────────────────────────────────────────────────────
  {
    id: 'hemianopia',
    name: { zh: '同側偏盲', en: 'Homonymous hemianopia' },
    desc: {
      zh: '兩眼都看不到同一側的視野，常撞到那一側的東西。',
      en: 'Both eyes lose the same half of the visual field; people bump into things on that side.',
    },
    system: 'vision',
    lateralised: true,
    sideWord: 'field',
    // 1 = partial hemianopia, 2 = complete
    nihss: { item: '3', pts: [1, 2, 2] },
  },
  {
    id: 'quadrant_sup',
    name: { zh: '上象限偏盲', en: 'Superior quadrantanopia' },
    desc: {
      zh: '看不到一側上方的視野（「天上的派」）。',
      en: 'Loss of one upper quarter of the visual field ("pie in the sky").',
    },
    system: 'vision',
    lateralised: true,
    sideWord: 'field',
    nihss: { item: '3', pts: [1, 1, 1] },
  },
  {
    id: 'quadrant_inf',
    name: { zh: '下象限偏盲', en: 'Inferior quadrantanopia' },
    desc: {
      zh: '看不到一側下方的視野（「地上的派」）。',
      en: 'Loss of one lower quarter of the visual field ("pie on the floor").',
    },
    system: 'vision',
    lateralised: true,
    sideWord: 'field',
    nihss: { item: '3', pts: [1, 1, 1] },
  },
  {
    id: 'central_scotoma',
    name: { zh: '同側中心暗點', en: 'Homonymous central scotoma' },
    desc: {
      zh: '枕極負責中心視野：只傷到枕極時，兩眼正中央同一側出現盲點，看字、看臉會缺一塊，周邊視野卻正常。',
      en: 'The occipital pole serves central vision: a lesion confined to it blanks the same central patch in both eyes — reading and faces are affected while the periphery is normal.',
    },
    system: 'vision',
    lateralised: true,
    sideWord: 'field',
    nihss: { item: '3', pts: [1, 1, 1] },
  },
  {
    id: 'macular_sparing',
    name: { zh: '中心視力保留（黃斑迴避）', en: 'Macular sparing' },
    desc: {
      zh: '枕極有中大腦動脈側枝供血，中心視野常被保留。',
      en: 'The occipital pole often receives MCA collateral supply, so central vision can be spared.',
    },
    system: 'vision',
    lateralised: false,
  },
  {
    id: 'cortical_blindness',
    name: { zh: '皮質盲', en: 'Cortical blindness' },
    desc: {
      zh: '雙側視覺皮質受損：眼睛正常、瞳孔反射正常，卻看不見。',
      en: 'Both visual cortices damaged: eyes and pupil reflexes are normal, yet nothing is seen.',
    },
    system: 'vision',
    lateralised: false,
    nihss: { item: '3', pts: [3, 3, 3] },
  },
  {
    id: 'anton',
    name: { zh: '否認失明（Anton 症候群）', en: 'Denial of blindness (Anton syndrome)' },
    desc: {
      zh: '看不見卻堅稱自己看得到，並編造所見。',
      en: 'Blind but insists on seeing, confabulating descriptions.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'monocular_blind',
    name: { zh: '單眼視力喪失（一過性黑矇）', en: 'Monocular vision loss (amaurosis fugax)' },
    desc: {
      zh: '像一片窗簾從上往下遮住一隻眼睛；是頸動脈疾病的重要警訊。',
      en: 'Like a curtain falling over one eye; an important warning sign of carotid disease.',
    },
    system: 'vision',
    lateralised: true,
    sideWord: 'eye',
  },
  {
    id: 'prosopagnosia',
    name: { zh: '臉孔失認', en: 'Prosopagnosia' },
    desc: {
      zh: '認不出熟人的臉，要靠聲音或衣著辨認。',
      en: 'Cannot recognise familiar faces; relies on voice or clothing.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'achromatopsia',
    name: { zh: '後天性色盲', en: 'Achromatopsia' },
    desc: { zh: '世界變成灰階。', en: 'The world looks grey.' },
    system: 'vision',
    lateralised: false,
  },
  {
    id: 'visual_agnosia',
    name: { zh: '視覺失認', en: 'Visual agnosia' },
    desc: {
      zh: '看得到東西，卻認不出是什麼；摸了才知道。',
      en: 'Sees objects but cannot recognise them until touching them.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'simultanagnosia',
    name: { zh: '同時性失認（Balint）', en: 'Simultanagnosia (Balint)' },
    desc: {
      zh: '一次只能看到一樣東西，無法把整個畫面拼起來。',
      en: 'Can only perceive one object at a time and cannot assemble the whole scene.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'optic_ataxia',
    name: { zh: '視覺性運動失調', en: 'Optic ataxia' },
    desc: {
      zh: '看得到杯子，但伸手去拿會抓偏。',
      en: 'Sees the cup, but reaching for it misses.',
    },
    system: 'cognition',
    lateralised: false,
  },

  // ── Eye movements ────────────────────────────────────────────────
  {
    id: 'gaze_deviation',
    name: { zh: '雙眼偏向病灶側', en: 'Gaze deviation towards the lesion' },
    desc: {
      zh: '額葉眼動區受損：眼睛「看著」受損的那一側（看向病灶）。',
      en: 'Frontal eye field damage: the eyes "look at" the side of the lesion.',
    },
    system: 'eye',
    lateralised: true,
    sideWord: 'gaze',
    nihss: { item: '2', pts: [1, 1, 2] },
  },
  {
    id: 'gaze_palsy_horizontal',
    name: { zh: '向患側水平凝視麻痺', en: 'Horizontal gaze palsy towards the lesion' },
    desc: {
      zh: '橋腦旁正中網狀結構或外展神經核受損：雙眼無法轉向受損側。',
      en: 'PPRF or abducens nucleus damage: both eyes cannot turn towards the lesion side.',
    },
    system: 'eye',
    lateralised: true,
    sideWord: 'gaze',
    nihss: { item: '2', pts: [1, 2, 2] },
  },
  {
    id: 'ino',
    name: { zh: '核間性眼肌麻痺（MLF）', en: 'Internuclear ophthalmoplegia (MLF)' },
    desc: {
      zh: '內側縱束受損：往對側看時，同側眼睛無法向內轉，另一眼出現眼振。常合併眼球垂直偏斜（skew deviation），也就是 HINTS 床邊檢查的「S」。',
      en: 'MLF lesion: on looking away, the eye on the lesion side fails to adduct and the other eye shows nystagmus. It often comes with a skew deviation, the "S" of the HINTS bedside examination.',
    },
    system: 'eye',
    lateralised: true,
    sideWord: 'eye',
    nihss: { item: '2', pts: [1, 1, 1] },
  },
  {
    id: 'cn3_palsy',
    name: { zh: '動眼神經麻痺', en: 'Oculomotor (CN III) palsy' },
    desc: {
      zh: '眼瞼下垂、瞳孔放大、眼球偏向外下方，造成複視。',
      en: 'Ptosis, dilated pupil and a "down and out" eye causing double vision.',
    },
    system: 'eye',
    lateralised: true,
    sideWord: 'eye',
    nihss: { item: '2', pts: [1, 1, 1] },
  },
  {
    id: 'cn4_palsy',
    name: { zh: '滑車神經麻痺', en: 'Trochlear (CN IV) palsy' },
    desc: {
      zh: '往下往內看時複視（下樓梯最明顯）；核的受損影響對側眼。',
      en: 'Vertical double vision looking down and in (worst on stairs); a nuclear lesion affects the opposite eye.',
    },
    system: 'eye',
    lateralised: true,
    sideWord: 'eye',
  },
  {
    id: 'cn6_palsy',
    name: { zh: '外展神經麻痺', en: 'Abducens (CN VI) palsy' },
    desc: {
      zh: '同側眼睛無法向外轉，往那一側看時出現水平複視。',
      en: 'The eye cannot turn outward; horizontal double vision looking to that side.',
    },
    system: 'eye',
    lateralised: true,
    sideWord: 'eye',
    nihss: { item: '2', pts: [1, 1, 1] },
  },
  {
    id: 'vertical_gaze_palsy',
    name: { zh: '垂直凝視麻痺', en: 'Vertical gaze palsy' },
    desc: {
      zh: '眼睛無法往上或往下看（中腦垂直眼動中樞受損）。',
      en: 'Cannot look up or down (midbrain vertical gaze centres).',
    },
    system: 'eye',
    lateralised: false,
    // not scored: NIHSS item 2 tests horizontal gaze only
  },
  {
    id: 'upgaze_palsy',
    name: { zh: '向上凝視麻痺、瞳孔光-近反射分離', en: 'Upgaze palsy, light-near dissociation' },
    desc: {
      zh: '背側中腦（頂蓋前區）受損的 Parinaud 表現。',
      en: 'Parinaud features of dorsal midbrain (pretectal) damage.',
    },
    system: 'eye',
    lateralised: false,
  },
  {
    id: 'nystagmus',
    name: { zh: '眼球震顫', en: 'Nystagmus' },
    desc: {
      zh: '眼球不自主地來回跳動，看東西會晃。',
      en: 'Involuntary rhythmic eye movements; the world seems to jump.',
    },
    system: 'eye',
    lateralised: false,
  },
  {
    // Brandt T, Dieterich M. Ann Neurol 1993;33:528–534 (56 one-sided brainstem infarcts: the
    // lesion-side eye lower with caudal pontomedullary lesions, the opposite eye lower with rostral
    // pontomesencephalic ones; always with ocular torsion and a tilted subjective vertical).
    // Kattah JC et al. Stroke 2009;40:3504–3510 (HINTS: skew in 17 % of acute vestibular syndrome,
    // 30 % with brainstem involvement, 4 % peripheral; it flagged a lateral pontine stroke when the
    // head impulse test falsely looked peripheral).
    id: 'skew_deviation',
    name: { zh: '眼球垂直偏斜（skew deviation，此眼較低）', en: 'Skew deviation (this eye lower)' },
    desc: {
      zh: '前庭到眼球的重力路徑在腦幹受損，兩眼上下不對齊：一眼較高、一眼較低，伴隨眼球旋轉與主觀垂直線傾斜，造成上下錯開的複視，頭常歪向較低的一眼。延髓與橋腦下部的病灶是病灶側的眼睛較低；橋腦上部與中腦的病灶則是對側眼較低。它是 HINTS 床邊檢查的「S」（Test of Skew）：急性眩暈病人有腦幹受損時約三成看得到，內耳問題只有約 4%。不是每個人都有。',
      en: 'The gravity pathway from the vestibular system to the eyes is damaged in the brainstem, so the eyes are out of vertical alignment: one sits higher, one lower, with the eyes rotated and the subjective vertical tilted, giving vertical double vision and often a head tilt towards the lower eye. With medullary and lower pontine lesions the eye on the lesion side is lower; with upper pontine and midbrain lesions the opposite eye is lower. It is the "S" of the HINTS bedside examination (Test of Skew): seen in about a third of people with acute vertigo whose brainstem is involved, against about 4 % with an inner-ear cause. Not everyone has it.',
    },
    system: 'eye',
    lateralised: true,
    sideWord: 'eye',
  },
  {
    id: 'diplopia',
    name: { zh: '複視', en: 'Double vision' },
    desc: {
      zh: '兩眼無法對齊，看東西有兩個影像。',
      en: 'The eyes are misaligned and see two images.',
    },
    system: 'eye',
    lateralised: false,
  },
  {
    id: 'horner',
    name: { zh: '霍納氏症候群', en: 'Horner syndrome' },
    desc: {
      zh: '下行交感神經受損：同側眼瞼輕度下垂、瞳孔縮小、臉部少汗。',
      en: 'Descending sympathetic fibres damaged: mild ptosis, small pupil and reduced facial sweating on the same side.',
    },
    system: 'eye',
    lateralised: true,
    sideWord: 'eye',
  },
  {
    // Brainstem compression by a swollen cerebellum: "a decrease in level of consciousness occurs
    // as a result of brainstem compression and therefore may include early loss of corneal
    // reflexes and the development of miosis" (Wijdicks EF et al. Stroke 2014;45:1222–1238).
    // Only the cascade's brainstem-compression event produces it (C4-F3); not scored by the NIHSS.
    id: 'miosis',
    name: { zh: '兩側瞳孔縮小（腦幹受壓）', en: 'Small pupils on both sides (brainstem compression)' },
    desc: {
      zh: '腫脹的小腦壓迫腦幹時，兩側瞳孔變小，常和意識下降、角膜反射消失一起出現——是後顱窩占位惡化的警訊。',
      en: 'When a swollen cerebellum compresses the brainstem both pupils become small, often together with falling consciousness and lost corneal reflexes — a warning sign of a worsening posterior-fossa mass.',
    },
    system: 'eye',
    lateralised: false,
  },

  // ── Cranial / vestibular ─────────────────────────────────────────
  {
    // see 'miosis' (Wijdicks 2014; C4-F3); the NIHSS does not test the corneal reflex
    id: 'corneal_reflex_loss',
    name: { zh: '角膜反射消失（腦幹受壓）', en: 'Corneal reflexes lost (brainstem compression)' },
    desc: {
      zh: '輕觸角膜卻不眨眼：反射弧經過橋腦（三叉神經進、顏面神經出）。小腦腫脹壓迫腦幹時，這常是早期的表現之一。',
      en: 'Touching the cornea no longer makes the eye blink: the reflex runs through the pons (in by the trigeminal, out by the facial nerve). It is often among the early signs when a swollen cerebellum compresses the brainstem.',
    },
    system: 'cranial',
    lateralised: false,
  },
  {
    id: 'hearing_loss',
    name: { zh: '突發性聽力喪失', en: 'Sudden hearing loss' },
    desc: {
      zh: '內耳或耳蝸神經核缺血。突發單耳聽力喪失合併眩暈，可能是小腦前下動脈中風的前兆。',
      en: 'Ischaemia of the inner ear or cochlear nuclei. Sudden unilateral deafness with vertigo can herald AICA stroke.',
    },
    system: 'cranial',
    lateralised: true,
    sideWord: 'body',
  },
  {
    // Taste is a special sense carried by cranial nerves VII and IX, hence 'cranial'. Side rule
    // (regions.ts): ipsilateral below the upper pons, no fixed side above it.
    // Heckmann JG et al. Stroke 2005;36:1690–1694 (30 % of 102 acute strokes; good prognosis).
    // Onoda K et al. J Neurol 2012;259:261–266 (38 central cases: ipsilateral from the medulla to
    // the pons, mostly bilateral above the midbrain; 80 % improved by 24 weeks).
    // Landis BN et al. J Neurol Neurosurg Psychiatry 2006;77:680–683 (ipsilateral hemiageusia,
    // lateral pontine infarct — a case report).
    id: 'taste_loss',
    name: { zh: '味覺減退', en: 'Reduced taste' },
    desc: {
      zh: '舌頭的味覺先到延髓的孤束核，在同一側腦幹往上走到中腦附近，再經視丘（VPM 核）送到島葉與額葉島蓋的味覺皮質。延髓或橋腦外側的病灶使同側半邊舌頭嘗不出味道；更高位置（視丘、島葉）的病灶常是兩側都變差，側別不固定。急性中風約三成有味覺減退，多數在幾個月內改善。',
      en: 'Taste travels from the tongue to the solitary tract nucleus in the medulla, up the same side of the brainstem to about the midbrain, then through the thalamus (VPM nucleus) to the taste cortex in the insula and frontal operculum. A lateral medullary or pontine lesion dulls taste on the same half of the tongue; higher lesions (thalamus, insula) more often dull it on both sides, with no fixed side. About a third of people with an acute stroke have reduced taste, and most improve within months.',
    },
    system: 'cranial',
    lateralised: true,
    sideWord: 'body',
  },
  {
    id: 'vertigo',
    name: { zh: '眩暈', en: 'Vertigo' },
    desc: {
      zh: '天旋地轉。後循環中風常以眩暈表現，容易被誤認為耳石症或內耳炎。',
      en: 'Spinning sensation. Posterior-circulation strokes often present this way and are mistaken for inner-ear problems.',
    },
    system: 'balance',
    lateralised: false,
  },
  {
    id: 'nausea_vomiting',
    name: { zh: '噁心、嘔吐', en: 'Nausea & vomiting' },
    desc: {
      zh: '前庭核、最後區或小腦受影響。',
      en: 'Vestibular nuclei, area postrema or cerebellum involved.',
    },
    system: 'autonomic',
    lateralised: false,
  },
  {
    id: 'hiccups',
    name: { zh: '頑固性打嗝', en: 'Intractable hiccups' },
    desc: { zh: '延髓外側受損的常見表現。', en: 'A common feature of lateral medullary lesions.' },
    system: 'autonomic',
    lateralised: false,
  },

  // ── Language ─────────────────────────────────────────────────────
  {
    id: 'aphasia_broca',
    name: { zh: '表達性失語（布洛卡）', en: "Expressive aphasia (Broca's)" },
    desc: {
      zh: '聽得懂，但說話費力、斷斷續續、找不到字。',
      en: 'Comprehension is good, but speech is effortful, halting and telegraphic.',
    },
    system: 'language',
    lateralised: false,
    nihss: { item: '9', pts: [1, 2, 2] },
  },
  {
    id: 'aphasia_wernicke',
    name: { zh: '接受性失語（韋尼克）', en: "Receptive aphasia (Wernicke's)" },
    desc: {
      zh: '說話流利但內容沒有意義，也聽不懂別人說話，且常不自覺。',
      en: 'Fluent but meaningless speech with poor comprehension, often without awareness.',
    },
    system: 'language',
    lateralised: false,
    nihss: { item: '9', pts: [2, 2, 2] },
  },
  {
    id: 'aphasia_global',
    name: { zh: '全面性失語', en: 'Global aphasia' },
    desc: {
      zh: '說與聽都嚴重受損，幾乎無法溝通。',
      en: 'Both expression and comprehension are severely impaired.',
    },
    system: 'language',
    lateralised: false,
    nihss: { item: '9', pts: [3, 3, 3] },
  },
  {
    id: 'aphasia_conduction',
    name: { zh: '傳導性失語', en: 'Conduction aphasia' },
    desc: {
      zh: '聽得懂也說得出來，但無法複誦句子。',
      en: 'Understands and speaks, but cannot repeat sentences.',
    },
    system: 'language',
    lateralised: false,
    nihss: { item: '9', pts: [1, 1, 1] },
  },
  {
    id: 'aphasia_tc_motor',
    name: { zh: '經皮質運動性失語', en: 'Transcortical motor aphasia' },
    desc: {
      zh: '主動說話很少，但能複誦。',
      en: 'Very little spontaneous speech, but repetition is preserved.',
    },
    system: 'language',
    lateralised: false,
    nihss: { item: '9', pts: [1, 1, 1] },
  },
  {
    id: 'aphasia_tc_sensory',
    name: { zh: '經皮質感覺性失語', en: 'Transcortical sensory aphasia' },
    desc: {
      zh: '能複誦但不懂意思，說話流利卻空洞。',
      en: 'Repeats but does not understand; fluent yet empty speech.',
    },
    system: 'language',
    lateralised: false,
    nihss: { item: '9', pts: [1, 1, 1] },
  },
  {
    // Ghika-Schmid F, Bogousslavsky J. Ann Neurol 2000;48:220–227 (12 anterior thalamic infarcts:
    // word-finding difficulty in all, impaired naming in 7, dysarthria in 8, hypophonia in 5;
    // comprehension, repetition and writing preserved; spectacular improvement within months).
    // Schmahmann JD. Stroke 2003;34:2264–2278 (language deficits after left paramedian lesions and
    // left tuberothalamic lesions). Comprehension of complex speech can still suffer, so the text
    // says "largely". Scored like the other mild aphasias (item 9), without the item 1b penalty
    // that clinical.ts adds for poor comprehension.
    id: 'aphasia_thalamic',
    name: { zh: '視丘性失語（找字困難）', en: 'Thalamic aphasia (word-finding difficulty)' },
    desc: {
      zh: '左側視丘前部或旁正中受損：說話變少、聲音小，常想不起字、叫不出物品名稱，但複誦正常，理解大致保留（複雜的句子仍可能聽不懂）。通常在數月內明顯改善。',
      en: 'Left anterior or paramedian thalamus: speaks less and more softly, with word-finding and naming difficulty, but repetition is normal and comprehension largely preserved (complex sentences may still be hard to follow). Usually improves markedly within months.',
    },
    system: 'language',
    lateralised: false,
    nihss: { item: '9', pts: [1, 1, 1] },
  },
  {
    id: 'apraxia_of_speech',
    name: { zh: '言語失用', en: 'Apraxia of speech' },
    desc: {
      zh: '知道要說什麼，但嘴巴的發音動作規劃錯亂。',
      en: 'Knows what to say, but the motor planning of articulation fails.',
    },
    system: 'language',
    lateralised: false,
  },
  {
    id: 'aprosodia',
    name: { zh: '語調障礙（失韻律）', en: 'Aprosodia' },
    desc: {
      zh: '說話平板、沒有情緒起伏，或聽不出別人語氣中的情緒（右半球）。',
      en: 'Flat, emotionless speech or inability to read emotional tone (right hemisphere).',
    },
    system: 'language',
    lateralised: false,
  },
  {
    id: 'alexia',
    name: { zh: '失讀', en: 'Alexia (reading loss)' },
    desc: { zh: '看得到字，卻讀不懂。', en: 'Sees letters but cannot read.' },
    system: 'language',
    lateralised: false,
  },
  {
    id: 'agraphia',
    name: { zh: '失寫', en: 'Agraphia (writing loss)' },
    desc: { zh: '無法寫出文字。', en: 'Cannot write.' },
    system: 'language',
    lateralised: false,
  },
  {
    id: 'acalculia',
    name: { zh: '失算', en: 'Acalculia' },
    desc: { zh: '簡單加減法都有困難。', en: 'Difficulty with simple arithmetic.' },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'finger_agnosia',
    name: { zh: '手指失認、左右混淆', en: 'Finger agnosia, left–right confusion' },
    desc: {
      zh: '分不清是哪根手指、分不清左右。',
      en: 'Cannot name or identify fingers; confuses left and right.',
    },
    system: 'cognition',
    lateralised: false,
  },

  // ── Cognition ────────────────────────────────────────────────────
  {
    id: 'neglect',
    name: { zh: '左側半側忽略', en: 'Left hemispatial neglect' },
    desc: {
      zh: '右頂葉受損：完全忽略左邊的空間與身體，只吃盤子右半邊的食物。',
      en: 'Right parietal damage: ignores the left side of space and body, e.g. eats only the right half of the plate.',
    },
    system: 'cognition',
    lateralised: false,
    nihss: { item: '11', pts: [1, 2, 2] },
  },
  {
    id: 'anosognosia',
    name: { zh: '病覺缺失', en: 'Anosognosia' },
    desc: {
      zh: '不承認自己癱瘓或生病。',
      en: 'Unaware of, or denies, the paralysis or illness.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'visuospatial',
    name: { zh: '視覺空間障礙（穿衣、建構失用）', en: 'Visuospatial deficits (dressing / constructional apraxia)' },
    desc: {
      zh: '畫不出時鐘、穿衣服穿錯邊。',
      en: 'Cannot draw a clock; puts clothes on wrongly.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    // after one-sided anterior thalamic infarcts the memory loss is mainly verbal after left and
    // visuospatial after right lesions (Ghika-Schmid & Bogousslavsky, Ann Neurol 2000)
    id: 'amnesia',
    name: { zh: '記憶障礙', en: 'Memory impairment' },
    desc: {
      zh: '記不住新的事情（海馬迴、視丘前部／旁正中受損）。單側受損時，左側主要影響語言記憶，右側主要影響視覺空間記憶。',
      en: 'Cannot form new memories (hippocampus, anterior / paramedian thalamus). After a one-sided lesion, mainly verbal memory if it is on the left and visuospatial memory if it is on the right.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'executive',
    name: { zh: '執行功能障礙', en: 'Executive dysfunction' },
    desc: {
      zh: '計畫、組織、判斷變差，做事沒有條理。',
      en: 'Impaired planning, organisation and judgement.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'disinhibition',
    name: { zh: '個性改變、去抑制', en: 'Personality change / disinhibition' },
    desc: {
      zh: '眼眶額葉受損：衝動、不得體、情緒控制變差。',
      en: 'Orbitofrontal damage: impulsive, socially inappropriate, poor emotional control.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    id: 'topographic',
    name: { zh: '方向感喪失', en: 'Topographic disorientation' },
    desc: {
      zh: '在熟悉的地方也會迷路。',
      en: 'Gets lost even in familiar places.',
    },
    system: 'cognition',
    lateralised: false,
  },
  {
    // Caplan LR. Neurology 1980;30:72–79 (rostral brainstem infarction: somnolence, vivid
    // hallucinations and dreamlike behaviour). Benke T. J Neurol 2006;253:1561–1571 (5 patients,
    // otherwise single case reports; midbrain, thalamic or pontine lesions; naturalistic, mostly
    // visual hallucinations that recurred over months and were taken as real). Uncommon, hence
    // only after damage on both sides (regions.ts) and named as possible; no onset time is fixed.
    id: 'peduncular_hallucinosis',
    name: { zh: '可能出現：大腦腳幻覺症（鮮明的視幻覺）', en: 'Possible: peduncular hallucinosis (vivid visual hallucinations)' },
    desc: {
      zh: '上腦幹（中腦）或視丘旁正中受損後，少數人會看到鮮明、像真的一樣、常是整個場景的幻覺，多半是視覺，有時也有聲音或觸感，常伴隨嗜睡、睡醒週期紊亂與夢境般的行為。病人常信以為真，分不清幻覺與現實；可能在數月內反覆出現。只見於病例報告與小型病例系列，多數病人不會有。',
      en: 'After damage to the upper brainstem (midbrain) or the paramedian thalamus a few people have vivid, lifelike hallucinations, often whole scenes, mostly visual but sometimes with sounds or touch, often together with drowsiness, a disturbed sleep–wake cycle and dreamlike behaviour. They often take them as real and cannot tell them from reality; the scenes can recur over months. Known only from case reports and a small case series; most patients never have it.',
    },
    system: 'cognition',
    lateralised: false,
  },

  // ── Mood & emotional expression ─────────────────────────────────
  // Only what a lesion SITE produces. Post-stroke depression, anxiety and fatigue are common but
  // weakly tied to the site; they are population figures, never symptoms of the case
  // (postStrokeRisks.ts).
  {
    id: 'emotional',
    name: { zh: '情緒改變', en: 'Emotional change' },
    desc: {
      zh: '邊緣系統（扣帶迴、杏仁核、顳極）受損後的冷漠、焦慮等情緒變化。突然停不下來的哭或笑另列為「病理性哭笑」。',
      en: 'Apathy, anxiety and similar changes in mood after damage to the limbic system (cingulate, amygdala, temporal pole). Sudden crying or laughing that cannot be stopped is listed separately as pathological crying or laughing.',
    },
    system: 'mood',
    lateralised: false,
  },
  {
    // Post-stroke emotionalism / emotional incontinence / pseudobulbar affect.
    // Kim JS, Choi-Kwon S. Neurology 2000;54:1805–1810 (148 single unilateral strokes at 2–4
    // months: 34 % overall; 45 % lenticulocapsular, 53 % pontine base, 40 % frontal-MCA, 100 % of a
    // small frontal-ACA group; none after temporal, occipital, parietal or dorsal pontine lesions;
    // also 55 % after medullary lesions — not modelled, the mechanism is unclear).
    // Kim JS. J Neurol 2002;249:805–810 (52 % after small lenticulocapsular strokes; dorsal pallidum).
    // House A et al. BMJ 1989;298:991–994 (15 % at 1 month, 21 % at 6, 11 % at 12; not mostly
    // bilateral; episodes provoked by real emotional cues).
    // Sacco S et al. Arch Phys Med Rehabil 2008;89:775–778 (locked-in syndrome — 4 cases).
    id: 'emotionalism',
    name: { zh: '病理性哭笑（情緒失禁）', en: 'Pathological crying or laughing (emotionalism)' },
    desc: {
      zh: '突然哭出來（較少是笑）、停不下來，強度遠超過當下的感受；常被一點小事（一句關心、一個悲傷的畫面）引發。中風後幾週到幾個月常見，與豆狀核—內囊、橋腦腹側與額葉的病灶有關；兩側橋腦腹側受損（閉鎖症候群）時特別明顯。常隨時間減輕。',
      en: 'Sudden bouts of crying (less often laughing) that are hard to stop and far stronger than what the person feels, often set off by something small — a kind word, a sad picture. Common in the weeks to months after a stroke and linked to lesions of the lentiform nucleus and internal capsule, the ventral pons and the frontal lobe; especially marked when the ventral pons is damaged on both sides (locked-in syndrome). It often lessens over time.',
    },
    system: 'mood',
    lateralised: false,
    delayed: true,
  },

  // ── Sleep & breathing in sleep ───────────────────────────────────
  {
    // Persistent hypersomnia; the acute drowsiness is `somnolence` (NIHSS 1a), unchanged.
    // Bassetti C et al. Ann Neurol 1996;39:471–480 (12 isolated paramedian thalamic strokes,
    // 10 to > 20 h of sleep behaviour a day).
    // Hermann DM et al. Stroke 2008;39:62–68 (46 patients: hypersomnia in all at first; sleep
    // needs improved with bilateral and almost disappeared with unilateral lesions by 1 year).
    // Bassetti CL. Semin Neurol 2005;25:19–32 (persisting sleep–wake disorders from thalamic or
    // brainstem damage).
    id: 'hypersomnia',
    name: { zh: '長期嗜睡（睡眠需求增加）', en: 'Persistent hypersomnia (increased sleep need)' },
    desc: {
      zh: '急性期過後仍然一天睡很久（最嚴重時 10 到 20 小時以上）、白天難以保持清醒。視丘旁正中（尤其兩側）受損時最典型，上腦幹的病灶也可能出現；單側病灶多在一年內接近恢復，兩側病灶改善較少。',
      en: 'Weeks after the acute phase the person still sleeps much longer than before (10 to over 20 hours a day at worst) and struggles to stay awake in the daytime. Typical of paramedian thalamic lesions, especially on both sides, and possible with upper brainstem lesions; after a one-sided lesion it has almost gone within a year, after a two-sided one it improves less.',
    },
    system: 'sleep',
    lateralised: false,
    delayed: true,
  },
  {
    // Loss of REM-sleep atonia. Evidence is thin, hence severity 1 everywhere (regions.ts):
    // case reports (Kimura K et al. Neurology 2000;55:894–895; Xi Z, Luning W. Sleep Med
    // 2009;10:143–146 — a unilateral paramedian pontine tegmental lacune), a questionnaire study
    // at 3 months (Tang WK et al. BMC Neurol 2014;14:88 — brainstem infarcts predicted RBD, OR 3.7)
    // and lesion network mapping of 25 published cases (Odd H et al. Neuroimage Clin
    // 2025;45:103751 — along the tract from the rostral locus coeruleus to the medulla). Against:
    // Tellenbach N et al. J Sleep Res 2023;32:e13640 (15 brainstem strokes on polysomnography:
    // less, not more, muscle activity in REM sleep).
    id: 'rbd',
    name: { zh: '快速動眼期睡眠行為障礙（夢境演出）', en: 'REM sleep behaviour disorder (acting out dreams)' },
    desc: {
      zh: '做夢（快速動眼期）時肌肉本該放鬆不動；負責這件事的橋腦被蓋路徑受損後，肌肉仍會動，人可能在夢中說話、大叫、揮拳或踢腳，傷到自己或枕邊人。中風後並不常見：證據來自個案報告、一項 3 個月時的問卷研究與病灶網路分析，而一項腦幹中風的睡眠檢查研究並沒有看到這種現象。',
      en: 'During dreaming (REM) sleep the muscles are normally switched off; when the pontine tegmental pathway that does this is damaged they are not, and the person may talk, shout, punch or kick while dreaming and hurt themselves or a bed partner. Uncommon after stroke: the evidence comes from case reports, a questionnaire study at 3 months and a lesion-network analysis, while a sleep-laboratory study of brainstem strokes did not find it.',
    },
    system: 'sleep',
    lateralised: false,
    delayed: true,
  },
  {
    // Central sleep apnoea after a ONE-sided lateral medullary infarct. The severe form —
    // automatic breathing failing outright (Ondine's curse) — is `respiratory` (autonomic), which
    // the regions give for lesions of both sides; clinical.ts lists only that one when both apply.
    // Pavšič K et al. Sleep Breath 2020;24:1557–1563 (28 acute unilateral lateral medullary
    // infarcts on polysomnography: central apnoea in 43 %, central events fewer at 3–6 months;
    // respiratory failure complicates 2–6 %).
    // Bogousslavsky J et al. Ann Neurol 1990;28:668–673 (loss of automatic breathing from a
    // unilateral caudal brainstem infarct — 2 cases).
    // Mendoza M, Latorre JG. Neurology 2013;80:e13–e16 (reversible Ondine's curse — a case).
    id: 'central_sleep_apnoea',
    name: { zh: '睡眠中呼吸暫停（中樞型）', en: 'Central sleep apnoea (pauses in breathing during sleep)' },
    desc: {
      zh: '延髓外側有讓呼吸自動進行的神經網路。單側梗塞的急性期，睡著時常出現呼吸停頓——不是呼吸道塞住，而是大腦沒有送出呼吸的指令；幾週到幾個月內通常會減少。少數人（約 2–6%）連自動呼吸都會失去：清醒時能呼吸，睡著就停（「Ondine 詛咒」），需要呼吸器。這種嚴重型另列為「呼吸節律異常」，本模型只在兩側受損時顯示。',
      en: 'The lateral medulla holds the network that keeps breathing going automatically. In the acute phase of a one-sided infarct, breathing often pauses during sleep — not because the airway is blocked but because the brain stops sending the signal to breathe; these pauses usually become fewer over weeks to months. In a few (about 2–6 %) automatic breathing fails outright: the person breathes while awake but stops when asleep ("Ondine\'s curse") and needs a ventilator. That severe form is listed separately as abnormal breathing control, which this model shows only when both sides are damaged.',
    },
    system: 'sleep',
    lateralised: false,
  },

  // ── Autonomic ────────────────────────────────────────────────────
  {
    id: 'autonomic_cardiac',
    name: { zh: '心律不整、自主神經失調', en: 'Arrhythmia / autonomic instability' },
    desc: {
      zh: '島葉（尤其右側）與延髓參與心臟自主神經控制，中風後可能出現心律不整、血壓波動。',
      en: 'The insula (especially right) and medulla regulate cardiac autonomic tone; arrhythmias and blood-pressure swings can follow.',
    },
    system: 'autonomic',
    lateralised: false,
  },
  {
    id: 'respiratory',
    name: { zh: '呼吸節律異常', en: 'Abnormal breathing control' },
    desc: {
      zh: '延髓與橋腦呼吸中樞受損：自動呼吸的節律亂掉，睡著時可能停止呼吸，可能需要呼吸器。',
      en: 'Medullary and pontine respiratory centres are damaged: the automatic rhythm of breathing fails and may stop during sleep; ventilatory support may be needed.',
    },
    system: 'autonomic',
    lateralised: false,
  },
  {
    // Pontine micturition centre (Barrington's nucleus, next to the locus coeruleus). The existing
    // `incontinence` is the medial frontal (storage) side of bladder control.
    // Sakakibara R et al. J Neurol Sci 1996;141:105–110 (39 acute brainstem strokes: 49 % had
    // urinary symptoms within 3 months, retention 21 %; lesions of the symptomatic patients in the
    // dorsolateral pontine tegmentum).
    id: 'urinary_retention',
    name: { zh: '排尿困難、尿液滯留', en: 'Difficulty passing urine / urinary retention' },
    desc: {
      zh: '橋腦背外側被蓋（藍斑核旁）有協調膀胱收縮與括約肌放鬆的排尿中樞：受損時尿解不出來或解不乾淨，也可能夜尿、急尿。腦幹中風後 3 個月內約一半有排尿問題，約五分之一出現尿滯留。',
      en: 'The dorsolateral pontine tegmentum (next to the locus coeruleus) holds the micturition centre that makes the bladder contract while its sphincter relaxes: when it is damaged, urine will not come or the bladder does not empty, and night-time frequency or urgency can also occur. Within 3 months of a brainstem stroke about half have bladder symptoms and about one in five urinary retention.',
    },
    system: 'autonomic',
    lateralised: false,
  },

  // ── Temperature regulation & sweating ────────────────────────────
  // The hypothalamus (temperature set point) is not a region of this model, so only the
  // descending sympathetic pathway (brainstem) and the cortical control of sweating are mapped.
  // Central ("neurogenic") fever is not a symptom here: fever early after an ischaemic stroke is
  // mostly infection or aspiration (Grau AJ et al. J Neurol Sci 1999;171:115–120 — 25 % febrile
  // within 48 h, most explained by infection), and of 74 patients with early central hyperthermia
  // only 4 % had a large cortical infarct and 3 % a basilar occlusion, the rest haemorrhages, all
  // with brainstem involvement (Sung CY et al. Eur Neurol 2009;62:86–92). Its risk after extensive
  // bilateral pontine (or paramedian midbrain–thalamic) infarction with coma is shown instead as a
  // cascade warning, 'central_hyperthermia' (engine/cascade.ts).
  // Temperature SENSATION is a different thing: pain_temp_body / pain_temp_face.
  {
    // Korpelainen JT, Sotaniemi KA, Myllylä VV. Stroke 1993;24:100–104 (18 brainstem infarcts:
    // heat-induced sweating lower over the whole ipsilateral body in 83 % acutely, 100 % at 1
    // month, 76 % at 6 months; medullary and pontine alike).
    id: 'hypohidrosis',
    name: { zh: '流汗減少（整個半身）', en: 'Reduced sweating (whole half of the body)' },
    desc: {
      zh: '控制流汗的下行交感神經從下視丘出發（本模型未納入下視丘），經過腦幹外側：這裡受損時，病灶同側的臉、手、軀幹與腳流汗變少，熱的時候最明顯，常與霍納氏症候群同時出現。多半自己不會察覺，卻可能持續數月（約四分之三的人 6 個月時仍有）。',
      en: 'The descending sympathetic pathway that drives sweating starts in the hypothalamus (not included in this model) and runs through the lateral brainstem: when it is damaged there, the face, arm, trunk and leg on the same side as the lesion sweat less, most obviously in the heat, often together with Horner syndrome. People often do not notice it, but it can last for months (still present in about three quarters at 6 months).',
    },
    system: 'thermo',
    lateralised: true,
    sideWord: 'body',
  },
  {
    // Labar DR et al. Neurology 1988;38:1679–1682 (6 cases contralateral to acute infarcts: 2
    // opercular, 4 large cortical–subcortical; face and arm; lasted 1–3 days).
    // Kim BS et al. Stroke 1995;26:896–899 (5 cases; 2 large MCA, 2 medullary; 2 days–2 months).
    // Korpelainen JT et al. Stroke 1992;23:1271–1275 and Neurology 1993;43:1211–1214 (measured:
    // more sweating on the paretic side in most hemispheric infarcts, tracking the paresis, still
    // present at 6 months). Brainstem hyperhidrosis (late, after lateral medullary infarcts:
    // Rousseaux M et al. Stroke 1996;27:991–995) is not modelled.
    id: 'hyperhidrosis',
    name: { zh: '多汗（臉與手臂為主）', en: 'Excess sweating (mainly face and arm)' },
    desc: {
      zh: '大腦皮質（島蓋、島葉一帶）被認為有一條抑制對側流汗的路徑：大範圍或島蓋的梗塞後，癱瘓那一側的臉與手臂可能大量出汗，通常只持續幾天到幾週。用儀器測量時，癱瘓側流汗較多的不對稱更常見、也更持久，但多半不明顯。',
      en: 'A pathway from the cortex (around the operculum and insula) is thought to hold back sweating on the opposite side: after a large or opercular infarct the face and arm on the paralysed side can sweat heavily, usually for a few days to weeks. Measured with instruments, more sweating on the paralysed side is commoner and lasts longer, but is mostly not noticed.',
    },
    system: 'thermo',
    lateralised: true,
    sideWord: 'body',
    // the reports describe it after infarcts, not during passing ischaemia such as a TIA
    fromInfarct: true,
  },
  {
    // Korpelainen JT, Sotaniemi KA, Myllylä VV. Stroke 1995;26:1543–1547 (63 infarcts: forearm,
    // leg and foot cooler on the side opposite the infarct throughout 6 months; with pyramidal
    // signs in hemispheric and with Wallenberg syndrome in brainstem infarcts).
    // Wanklyn P et al. Stroke 1994;25:1765–1770 (symptomatic cold hemiplegic hand: lower finger
    // temperature, 35 % less hand blood flow).
    // Wanklyn P et al. Stroke 1995;26:1867–1870 (53 % of 75 at ≥ 12 months; median onset 1 month).
    id: 'cold_limb',
    name: { zh: '手腳發冷（數週後）', en: 'Cold arm and leg (weeks later)' },
    desc: {
      zh: '癱瘓那一側的手腳皮膚溫度較低、摸起來冰冷，手部血流也減少；常在中風後約一個月開始、可持續一年以上，有些人覺得很困擾。與運動路徑受損（調節皮膚血管的自主神經可能跟著受影響）有關，延髓外側中風則出現在病灶對側。這是血管調節的改變，和感覺不到冷熱的「溫度覺喪失」不同。',
      en: 'The skin of the arm and leg on the paralysed side is cooler and feels cold, with less blood flow to the hand; it often starts about a month after the stroke, can last more than a year and troubles some people a lot. Linked to damage of the motor pathways (probably because the autonomic control of skin blood vessels is affected with them) and, after a lateral medullary stroke, found on the side opposite the lesion. This is a change in blood-vessel control, not the loss of temperature sensation.',
    },
    system: 'thermo',
    lateralised: true,
    sideWord: 'body',
    delayed: true,
  },

  {
    // Shown only as possible, after a clear infarct of the dentate nucleus, the red nucleus region
    // or the pontine tegmentum (engine/cascade.ts). Schaller-Paule MA et al. Front Neurol
    // 2021;12:675123 (olivary degeneration after posterior-fossa stroke in an unknown share);
    // Tilikete C, Desestret V. Front Neurol 2017;8:302 (palatal or oculopalatal tremor weeks to
    // months after the lesion, after haemorrhage more often than infarction); Deuschl G, Toro C,
    // Hallett M. Mov Disord 1994;9:676–678 (ear clicks are a cardinal sign of essential palatal
    // tremor and do not occur in the symptomatic form); Chang YY et al. Gaoxiong Yi Xue Ke Xue Za
    // Zhi 1993;9:371–376 (oculopalatal myoclonus 1 and 3 months after the lesion).
    id: 'palatal_tremor',
    name: { zh: '可能出現：軟顎顫抖（數月後，少數人）', en: 'Possible: palatal tremor (months later, a minority)' },
    desc: {
      zh: '下橄欖核肥大性退化可能讓軟顎規律地抽動，有時合併雙眼上下擺動的眼振（眼軟顎顫抖），在受損後數週到數月出現。只有少數病人會有，出血後比梗塞後常見。中風後這種「症狀性」軟顎顫抖不會有耳內喀喀聲——那是原因不明的「原發性」軟顎顫抖的特徵。',
      en: 'Hypertrophic olivary degeneration can make the soft palate jerk rhythmically, sometimes with a vertical pendular nystagmus (oculopalatal tremor), appearing weeks to months after the lesion. Only a minority develop it, more often after haemorrhage than after infarction. This symptomatic palatal tremor after a stroke has no ear click — ear clicks belong to the essential palatal tremor, which has no known cause.',
    },
    system: 'cranial',
    lateralised: false,
    delayed: true,
  },

  // ── Non-brain beds ───────────────────────────────────────────────
  {
    id: 'arm_claudication',
    name: { zh: '手臂運動時痠痛無力、脈搏減弱', en: 'Arm claudication, weak pulse' },
    desc: {
      zh: '鎖骨下動脈近端阻塞：手臂用力時缺血，兩側血壓相差很多。',
      en: 'Proximal subclavian occlusion: the arm becomes ischaemic with exertion and blood pressure differs between arms.',
    },
    system: 'limb',
    lateralised: true,
    sideWord: 'body',
  },
];

export const SYMPTOM_BY_ID: Record<string, SymptomDef> = indexById(SYMPTOMS, (s) => s.id);
