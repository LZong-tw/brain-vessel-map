/**
 * Symptom catalogue.
 *
 * NIHSS mapping: `pts` gives the item score for [mild, moderate, severe] involvement.
 * These are EDUCATIONAL approximations used to illustrate relative severity; the real
 * NIHSS is a bedside examination and cannot be derived from a lesion map.
 * Reference: Brott T, et al. Stroke. 1989;20:864-870.
 */

import type { SymptomDef } from './types';
import { indexById } from './indexById';

export const SYMPTOMS: SymptomDef[] = [
  // ── Consciousness ────────────────────────────────────────────────
  {
    id: 'coma',
    name: { zh: '意識障礙／昏迷', en: 'Reduced consciousness / coma' },
    desc: {
      zh: '維持清醒的網狀活化系統（腦幹上部、雙側視丘）受損，可能叫不醒。',
      en: 'The arousal network (upper brainstem reticular formation, both thalami) is damaged; the person may be unrousable.',
    },
    system: 'consciousness',
    lateralised: false,
    nihss: { item: '1a', pts: [1, 2, 3] },
  },
  {
    id: 'somnolence',
    name: { zh: '嗜睡、反應遲鈍', en: 'Drowsiness / hypersomnolence' },
    desc: {
      zh: '一直想睡、叫醒後很快又睡著，常見於視丘旁正中或中腦受損。',
      en: 'Excessive sleepiness, drifting off after being roused; typical of paramedian thalamic or midbrain lesions.',
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
      zh: '內側縱束受損：往對側看時，同側眼睛無法向內轉，另一眼出現眼振。',
      en: 'MLF lesion: on looking away, the eye on the lesion side fails to adduct and the other eye shows nystagmus.',
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

  // ── Cranial / vestibular ─────────────────────────────────────────
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
    id: 'amnesia',
    name: { zh: '記憶障礙', en: 'Memory impairment' },
    desc: {
      zh: '記不住新的事情（海馬迴、視丘前部／旁正中受損）。',
      en: 'Cannot form new memories (hippocampus, anterior / paramedian thalamus).',
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
    id: 'emotional',
    name: { zh: '情緒改變', en: 'Emotional change' },
    desc: {
      zh: '冷漠、焦慮或情緒失控。',
      en: 'Apathy, anxiety or emotional lability.',
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
      zh: '延髓與橋腦呼吸中樞受損，可能需要呼吸器。',
      en: 'Medullary and pontine respiratory centres are damaged; ventilatory support may be needed.',
    },
    system: 'autonomic',
    lateralised: false,
  },

  {
    id: 'palatal_tremor',
    name: { zh: '軟顎顫抖（數月後）', en: 'Palatal tremor (months later)' },
    desc: {
      zh: '下橄欖核肥大性退化造成軟顎規律抽動，有時聽得到耳內喀喀聲，也可能合併眼球擺動。',
      en: 'Hypertrophic olivary degeneration causes rhythmic palatal jerks, sometimes an audible ear click, and may be accompanied by pendular eye oscillations.',
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
