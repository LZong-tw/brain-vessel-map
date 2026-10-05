/**
 * Downstream consequences of an infarct over time — including effects on brain regions
 * OUTSIDE the occluded artery's territory (mass effect, herniation, hydrocephalus,
 * diaschisis, Wallerian and trans-synaptic degeneration) and systemic complications.
 *
 * Rule thresholds are simplified from the literature:
 *   • malignant MCA infarction: DWI volume > 145 mL (Oppenheim et al., Stroke 2000);
 *     decompressive hemicraniectomy pooled analysis (Vahedi et al., Lancet Neurol 2007)
 *   • space-occupying cerebellar infarction (Wijdicks et al., AHA/ASA statement, Stroke 2014)
 *   • crossed cerebellar diaschisis (Pantano, Baron et al., Brain 1986)
 *   • Wallerian degeneration on MRI (Kuhn et al., Radiology 1989; Thomalla et al., NeuroImage 2004)
 *   • hypertrophic olivary degeneration (Goto & Kaneko 1981; Kitajima et al., Radiology 1994)
 * TODO(medical-review): thresholds and timings are educational approximations.
 */

import { BEDS, REGIONS, REGION_BY_ID, VESSEL_BY_ID, vesselName } from '../anatomy';
import type { DeficitRef, L, Region, Side } from '../anatomy';
import { SYMPTOM_BY_ID, symptomOnsetH } from '../anatomy/symptoms';
import { formatHours } from '../anatomy/timeline';
import type { HemoResult, Occlusion } from './hemodynamics';
import type { ReperfusionGrade, TreatmentMethod } from './treatment';
import { isTreatable } from './schedule';

export type EventKind = 'mechanism' | 'imaging' | 'treatment' | 'secondary' | 'complication' | 'recovery';
export type EventSeverity = 'info' | 'warn' | 'danger' | 'good';

export interface CascadeEvent {
  id: string;
  kind: EventKind;
  severity: EventSeverity;
  onsetH: number;
  peakH?: number;
  endH?: number;
  title: L;
  desc: L;
  /** regions involved (ids) */
  regions: string[];
  /** symptoms produced by this event while active (e.g. coma from brainstem compression) */
  symptoms?: { id: string; side: Side | 'both' | null; sev: 1 | 2 | 3 }[];
}

export type BedEffectKind = 'secondary' | 'compressed' | 'diaschisis' | 'degeneration';

export interface BedEffect {
  kind: BedEffectKind;
  onsetH: number;
  /** effect disappears after this time (compression resolves as oedema subsides — if survived) */
  endH?: number;
  event: string;
}

/**
 * All times in and out of the cascade are hours after the onset of ONE ischaemic event. With an
 * occlusion schedule, simulate() passes the index event's clock (t − onset) and shifts the
 * output onto the timeline for display.
 */
export interface CascadeInput {
  /** recanalisation, hours after onset (null: never, or treatment before this event) */
  reperfusionH: number | null;
  decompression: boolean;
  occlusions: Occlusion[];
  hemo: HemoResult;
  /** eventual infarcted fraction per bed (with the chosen treatment) */
  bedFinal: Record<string, number>;
  /** eventual infarcted fraction per bed if nothing were done */
  bedFinalUntreated: Record<string, number>;
  /** infarcted fraction per bed at 14 h (≈ the early DWI lesion used to predict malignant oedema) */
  bedEarly: Record<string, number>;
  /** fraction of each region that is dysfunctional in the first hours (core + penumbra) */
  regionAcute: Record<string, number>;
  /**
   * regions hit by a lacunar (single-branch) occlusion in effect at onset: ischaemic although the
   * flow the model sees is unchanged (C6-F2)
   */
  lacuneIschaemia?: string[];
  /**
   * regions whose final damage is a lacune alone: the infarct level the symptoms see there and the
   * lacune site's own deficit list, if it has one — so a late event follows its late symptom
   * exactly, small infarcts and lacunes included (C10-F2)
   */
  lacuneFinal?: Record<string, { level: number; deficits?: DeficitRef[] }>;
  /**
   * when blood returns to the index territory (hours after onset): treatment that reopened the
   * artery, or an occlusion reopening by itself; null or left out when it never does
   */
  flowReturnsH?: number | null;
  /**
   * how the treatment at reperfusionH went (engine/treatment.ts); left out for the default
   * treatment (complete, lasting reperfusion), which keeps the general event texts
   */
  treatment?: CascadeTreatment;
}

/** The treatment details the event texts need (times on the clinical clock, like reperfusionH). */
export interface CascadeTreatment {
  method: TreatmentMethod;
  grade: ReperfusionGrade;
  /** share of the reperfused territory whose microcirculation still does not reperfuse */
  noReflow: number;
  /** share of the territory that gets its flow back (grade less no-reflow) */
  reperfusedFraction: number;
  /** eTICI 0: the attempt reopened nothing */
  failed: boolean;
  /** when the reopened artery closes again (h after onset), or null */
  reocclusionH: number | null;
  /** the branch a clot fragment blocked during the treatment (vessel id), or null */
  distalEmbolus: string | null;
  /** regions supplied by that branch */
  embolusRegions: string[];
}

const METHOD_NAME: Record<TreatmentMethod, L> = {
  evt: { zh: '動脈取栓', en: 'thrombectomy' },
  ivt: { zh: '靜脈血栓溶解', en: 'IV thrombolysis' },
  bridging: { zh: '靜脈血栓溶解＋動脈取栓', en: 'IV thrombolysis + thrombectomy' },
};

/** what each expanded-TICI grade means (the ranges of treatment.GRADE_REPERFUSED) */
const GRADE_MEANING: Record<ReperfusionGrade, L> = {
  '0': { zh: '沒有再灌流', en: 'no reperfusion' },
  '1': { zh: '血流通過血栓，但遠端幾乎沒有灌流', en: 'flow past the clot, but hardly any distal filling' },
  '2a': { zh: '下游區域有 1–49 % 恢復灌流', en: '1–49 % of the downstream territory reperfused' },
  '2b50': { zh: '下游區域有 50–66 % 恢復灌流', en: '50–66 % of the downstream territory reperfused' },
  '2b67': { zh: '下游區域有 67–89 % 恢復灌流', en: '67–89 % of the downstream territory reperfused' },
  '2c': { zh: '下游區域有 90–99 % 恢復灌流', en: '90–99 % of the downstream territory reperfused' },
  '3': { zh: '完全再灌流', en: 'complete reperfusion' },
};

const pct = (x: number) => `${Math.round(x * 100)} %`;
const hoursZh = (h: number) => `${+h.toFixed(1)} 小時`;
const hoursEn = (h: number) => `${+h.toFixed(1)} h`;
/** "Left MCA …" → "left MCA …" inside a sentence (acronyms stay) */
const lowerFirst = (n: string) => (/^[A-Z][a-z]/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n);

/**
 * The recanalisation event when the treatment details differ from the default: it names the
 * method and the eTICI grade, says how much of the territory got its flow back, and says so when
 * the attempt failed.
 */
function reperfusionEvent(t: CascadeTreatment, reperfusionH: number, savedVolume: number): CascadeEvent {
  const m = METHOD_NAME[t.method];
  const g = GRADE_MEANING[t.grade];
  // eTICI is read on an angiogram; after IV thrombolysis alone it stands for the reperfused share
  const ivtNote: L =
    t.method === 'ivt'
      ? { zh: '（eTICI 是血管攝影的分級；只打靜脈血栓溶解時，這裡代表下游區域恢復灌流的比例）', en: ' (eTICI is graded on angiography; after IV thrombolysis alone it stands for how much of the territory is reperfused)' }
      : { zh: '', en: '' };
  if (t.failed) {
    return {
      id: 'reperfusion',
      kind: 'treatment',
      severity: 'warn',
      onsetH: reperfusionH,
      title: { zh: `再通失敗：${m.zh}（eTICI 0）`, en: `Recanalisation failed: ${m.en} (eTICI 0)` },
      desc: {
        zh: `${m.zh}沒有打通阻塞的血管（eTICI 0，${g.zh}）：血栓留在原處，組織的結果和沒有治療時一樣。這次嘗試本身仍可能帶來出血等併發症。`,
        en: `${m.en.charAt(0).toUpperCase()}${m.en.slice(1)} did not reopen the occluded artery (eTICI 0, ${g.en}): the clot stays, and the tissue fares as it would without treatment. The attempt itself can still bring complications such as bleeding.`,
      },
      regions: [],
    };
  }
  const late = reperfusionH > 6;
  const partial = t.reperfusedFraction < 1;
  const noReflowZh = t.noReflow > 0 ? `其中約 ${pct(t.noReflow)} 的組織大血管雖通、微血管仍不通（無再流現象）。` : '';
  const noReflowEn = t.noReflow > 0 ? ` In about ${pct(t.noReflow)} of it the microcirculation stays shut although the artery is open (no-reflow).` : '';
  const shareZh = partial ? `模型讓約 ${pct(t.reperfusedFraction)} 的下游區域恢復血流，其餘仍照未治療的病程。` : '';
  const shareEn = partial ? ` The model gives about ${pct(t.reperfusedFraction)} of the downstream territory its flow back; the rest follows the untreated course.` : '';
  const reclosesZh = t.reocclusionH !== null ? '（血管之後又再阻塞，見「再阻塞」）' : '';
  const reclosesEn = t.reocclusionH !== null ? ' in the end (the artery later closes again: see "Reocclusion")' : '';
  return {
    id: 'reperfusion',
    kind: 'treatment',
    severity: savedVolume > 5 ? 'good' : 'info',
    onsetH: reperfusionH,
    title: { zh: `血管再通：${m.zh}，eTICI ${t.grade}`, en: `Recanalisation: ${m.en}, eTICI ${t.grade}` },
    desc: {
      zh: `eTICI ${t.grade}：${g.zh}${ivtNote.zh}。${noReflowZh}${shareZh}血流恢復時尚未壞死的半影區被救回，模型估計少了約 ${savedVolume.toFixed(0)} mL 的梗塞${reclosesZh}。已經壞死的核心不會恢復；${late ? '較晚再通時，' : ''}再灌流也可能帶來出血轉化與再灌流傷害。`,
      en: `eTICI ${t.grade}: ${g.en}${ivtNote.en}.${noReflowEn}${shareEn} Restored flow rescues penumbra that has not yet died — the model estimates ~${savedVolume.toFixed(0)} mL less infarct${reclosesEn}. The dead core does not recover; ${late ? 'with late recanalisation ' : ''}reperfusion can also bring haemorrhagic transformation and reperfusion injury.`,
    },
    regions: [],
  };
}

/** The complications the treatment itself caused: the artery closing again, a clot fragment in a branch. */
function pushTreatmentComplications(events: CascadeEvent[], t: CascadeTreatment, reperfusionH: number): void {
  if (t.reocclusionH !== null) {
    const after = t.reocclusionH - reperfusionH;
    events.push({
      id: 'reocclusion',
      kind: 'complication',
      severity: 'danger',
      onsetH: t.reocclusionH,
      title: { zh: '再阻塞：打通的血管又塞住了', en: 'Reocclusion: the reopened artery closes again' },
      desc: {
        zh: `再通約 ${hoursZh(after)}後，同一條血管又完全阻塞（例如在殘餘狹窄或受損的血管壁上再形成血栓）。這區組織再度缺血，症狀常再次惡化。在模型裡，側枝撐不住的組織最後仍會壞死，和從未打通時差不多：再通只是把損失延後。越晚再阻塞，梗塞長得越慢；但只要血管沒有再打開，最終梗塞就和沒有治療時相當。`,
        en: `About ${hoursEn(after)} after reperfusion the same artery occludes completely again (e.g. new thrombus on a residual stenosis or a damaged vessel wall). Its territory becomes ischaemic again and the deficit often worsens again. In the model, tissue that collaterals cannot sustain is still lost in the end, about as much as if the artery had never been opened: reopening only postponed the loss. The later it recloses, the more slowly the infarct grows, but unless the artery is opened again the final infarct is about that of no treatment.`,
      },
      regions: [],
    });
  }
  if (t.distalEmbolus !== null && VESSEL_BY_ID[t.distalEmbolus]) {
    const v = VESSEL_BY_ID[t.distalEmbolus];
    const zh = vesselName(v, 'zh-TW');
    const en = vesselName(v, 'en');
    events.push({
      id: 'distal_embolus',
      kind: 'complication',
      severity: 'warn',
      onsetH: reperfusionH,
      title: { zh: `遠端栓塞：${zh}`, en: `Distal embolus: ${en}` },
      desc: {
        zh: `血栓被取出或溶解時，一小塊碎片被沖到下游，塞住了${zh}。主幹雖然打通，這條分支供應的區域仍然缺血，側枝循環補不上的部分會梗塞（血管攝影上這常是只達 eTICI 2b、而非 3 的原因）。有時還能再取出，但細小的遠端分支常只能靠側枝循環。`,
        en: `While the clot was retrieved or dissolved, a fragment was carried downstream and blocked the ${lowerFirst(en)}. The main artery is open, but the territory of this branch stays ischaemic, and what collaterals cannot make up for infarcts (on angiography such a cut-off branch is often why the result is eTICI 2b rather than 3). It can sometimes be retrieved too, but small distal branches often have to rely on collaterals.`,
      },
      regions: t.embolusRegions,
    });
  }
}

export interface CascadeOutput {
  events: CascadeEvent[];
  bedEffects: Record<string, BedEffect[]>;
  /** mL, eventual infarct volume per compartment */
  /** eventual infarct volumes of the arterial occlusion itself (mL); `withSecondary` adds tissue lost to herniation etc. */
  volumes: { supra: Record<Side, number>; cerebellum: Record<Side, number>; brainstem: number; total: number; withSecondary: number };
  savedVolume: number;
  hydrocephalusOnsetH: number | null;
  /** when the acute obstructive episode is over (the 'hydrocephalus' event's endH) */
  hydrocephalusEndH: number | null;
  midlineShift: { side: Side; peakMm: number; onsetH: number } | null;
}

/**
 * Only the retina is ischaemic (an ophthalmic or central retinal artery embolus): the brain-stroke
 * story (brain DWI, thrombolysis windows for brain tissue) does not apply as such.
 * Retinal survival time: Hayreh SS et al. Exp Eye Res 2004;78:723–736 (about 240 min in primates).
 * Management as a stroke equivalent: Mac Grory B et al. Stroke 2021;52:e282–e294 (AHA scientific
 * statement on central retinal artery occlusion).
 */
function pushEyeEvents(events: CascadeEvent[]): void {
  events.push({
    id: 'retinal_ischaemia',
    kind: 'mechanism',
    severity: 'danger',
    onsetH: 0,
    endH: 6,
    title: { zh: '視網膜缺血（數秒內失明）', en: 'Retinal ischaemia (vision lost within seconds)' },
    desc: {
      zh: '視網膜是中樞神經的一部分，由眼動脈分出的視網膜中央動脈單獨供應，沒有側枝。血流一中斷，數秒內那隻眼睛就看不見。若栓子在幾分鐘內被沖走，視力恢復，稱為「一過性黑矇」；若持續阻塞，視網膜內層約在數小時內（動物研究約 4 小時，人類可能更短）開始不可逆壞死。本模型沿用腦組織的時間常數，視網膜實際能撐得稍久。這裡沒有腦組織缺血。',
      en: 'The retina is part of the central nervous system and is fed by the central retinal artery, a branch of the ophthalmic artery with no collaterals. When flow stops, that eye goes blind within seconds. If the embolus clears within minutes, vision returns (amaurosis fugax); if it stays, the inner retina begins to die irreversibly within hours (about 4 h in primate studies, possibly less in people). The model uses brain-tissue time constants; the retina actually tolerates somewhat longer. No brain tissue is ischaemic here.',
    },
    regions: [],
  });
  events.push({
    id: 'eye_stroke_workup',
    kind: 'treatment',
    severity: 'warn',
    onsetH: 0,
    endH: 24,
    title: { zh: '眼中風是腦中風的警訊', en: 'An eye stroke is a brain-stroke warning' },
    desc: {
      zh: '一過性黑矇與視網膜中央動脈阻塞都應視同中風急症：立即送有中風團隊的急診，而不是只看眼科門診。要找栓子來源（頸動脈狹窄、心房顫動等），並做腦部 MRI——部分病人會發現同時發生、沒有症狀的腦梗塞；接下來數週腦中風的風險最高。靜脈血栓溶解對視網膜中央動脈阻塞的效益仍在臨床試驗中。',
      en: 'Amaurosis fugax and central retinal artery occlusion should be treated as stroke emergencies: go straight to an emergency department with a stroke team, not only to an eye clinic. The source of the embolus must be found (carotid stenosis, atrial fibrillation …) and a brain MRI done — some patients have silent brain infarcts at the same time, and the risk of a brain stroke is highest in the following weeks. Whether IV thrombolysis helps central retinal artery occlusion is still being tested in trials.',
    },
    regions: [],
  });
  events.push({
    id: 'imaging_retina',
    kind: 'imaging',
    severity: 'info',
    onsetH: 0.1,
    endH: 336,
    title: { zh: '檢查：看眼底，不是腦部 DWI', en: 'Examination: the fundus, not brain DWI' },
    desc: {
      zh: '腦部 DWI 看不到視網膜的缺血（它只用來找同時發生的腦梗塞）。持續阻塞時，眼底鏡在數小時內可見視網膜變白與黃斑「櫻桃紅斑」，光學同調斷層掃描（OCT）可見內層視網膜水腫增厚；栓子本身有時也看得到。',
      en: 'Brain DWI does not show retinal ischaemia (it is used to look for concurrent brain infarcts). With a persistent occlusion the fundus shows a whitened retina and a macular "cherry-red spot" within hours, and optical coherence tomography (OCT) shows a swollen, thickened inner retina; sometimes the embolus itself is visible.',
    },
    regions: [],
  });
}

/**
 * Only the inner ear is infarcted (a labyrinthine artery occlusion): an end-organ infarct that
 * brain DWI does not show, and a warning of AICA or basilar stroke — not a TIA, although no brain
 * tissue dies (C7-F7). A vascular cause usually takes hearing and the vestibule together (49 of
 * 82 AICA infarcts), and 13 of those 82 had transient vertigo or hearing episodes within the month
 * before (Lee H et al. Stroke 2009;40:3745–3751, PMID 19797177); 9 of 29 people with sudden
 * deafness from vertebrobasilar ischaemia first had only the ear symptoms, the brain signs coming
 * later (Lee H, Baloh RW. J Neurol Sci 2005;228:99–104, PMID 15607217); a unilateral canal paresis
 * on the deaf side in 56 of 62 (Kim HA et al. J Neurol Sci 2014;339:176–182, PMID 24581671); an
 * abnormal head-impulse test wrongly suggested a peripheral cause in lateral pontine strokes, and
 * the first DWI missed 12 % of strokes within 48 h (Kattah JC et al. Stroke 2009;40:3504–3510,
 * PMID 19762709).
 */
function pushEarEvents(events: CascadeEvent[]): void {
  events.push({
    id: 'labyrinthine_infarction',
    kind: 'mechanism',
    severity: 'warn',
    onsetH: 0,
    endH: 6,
    title: { zh: '內耳梗塞（數分鐘內失去聽覺與平衡）', en: 'Inner-ear infarction (hearing and balance lost within minutes)' },
    desc: {
      zh: '迷路動脈是供應耳蝸與前庭的終末動脈，通常由小腦前下動脈（AICA）分出。阻塞時，這一側的聽覺與平衡器官一起失去功能——血管性的原因通常兩者都受影響，和病毒性的不同（82 例 AICA 梗塞中 60% 聽覺與前庭功能一起喪失）。內耳不是腦組織：壞死的是器官本身，所以耳聾可能留下來，但常在幾個月內改善（見「突發性聽力喪失」）。這裡沒有腦組織缺血。',
      en: 'The labyrinthine artery is an end artery to the cochlea and the vestibule, usually a branch of the AICA. When it closes, hearing and the balance organ on that side fail together — a vascular cause usually takes both, unlike a viral one (combined loss in 60 % of 82 AICA infarcts). The inner ear is not brain tissue: what dies is the organ itself, so the deafness can last, although it often improves over months (see sudden hearing loss). No brain tissue is ischaemic here.',
    },
    regions: [],
  });
  events.push({
    id: 'ear_stroke_workup',
    kind: 'treatment',
    severity: 'warn',
    onsetH: 0,
    endH: 168,
    title: { zh: '內耳中風是腦中風的警訊', en: 'An inner-ear stroke is a brain-stroke warning' },
    desc: {
      zh: '突發單側耳聾合併眩暈，可能是小腦前下動脈或基底動脈中風的第一個徵兆：82 例 AICA 梗塞中，有 13 例在之前一個月內出現過短暫的眩暈或聽覺症狀；另一系列 29 位椎基底動脈缺血造成突發耳聾的人中，9 位一開始只有耳朵的症狀，腦部的徵象之後才出現。要當成中風急症處理：盡快做腦部與血管影像，並開始中風預防。床邊的甩頭測試在這類中風也可能異常、看起來像內耳炎，所以不能只靠它排除中風。',
      en: 'Sudden one-sided deafness with vertigo can be the first sign of an AICA or basilar stroke: 13 of 82 AICA infarcts were preceded by transient vertigo or hearing episodes within the month before, and of 29 people with sudden deafness from vertebrobasilar ischaemia, 9 first had only the ear symptoms and the brain signs came later. Treat it as a stroke emergency: urgent imaging of the brain and its arteries, and stroke prevention. The bedside head-impulse test can be abnormal in such strokes and look like vestibular neuritis, so it cannot rule a stroke out on its own.',
    },
    regions: [],
  });
  events.push({
    id: 'imaging_labyrinth',
    kind: 'imaging',
    severity: 'info',
    onsetH: 0.1,
    endH: 336,
    title: { zh: '檢查：聽力與前庭功能，腦部 DWI 看不到內耳', en: 'Examination: hearing and balance tests; brain DWI does not show the inner ear' },
    desc: {
      zh: '腦部擴散加權 MRI 看不到內耳本身；它用來找腦幹與小腦的梗塞，而早期掃描可能漏掉小病灶（發病 48 小時內約 12% 為假陰性）。聽力的喪失用純音聽力檢查記錄，前庭功能用溫差測試等檢查——血管性的突發耳聾，同側前庭功能也常變弱（62 人中 56 人）。',
      en: 'Brain diffusion MRI does not show the inner ear itself; it is used to look for infarcts in the brainstem and cerebellum, and an early scan can miss small ones (about 12 % false negatives within 48 h). The hearing loss is documented with a pure-tone audiogram and the vestibule with caloric and similar tests — with sudden deafness of vascular cause the vestibule on the same side is usually weak too (56 of 62).',
    },
    regions: [],
  });
}

/**
 * Brain ischaemia that leaves no infarct: the flow came back in time (a TIA) or collaterals held.
 * Tissue-based definition of TIA: Easton JD et al. Stroke 2009;40:2276–2293. Short-term dual
 * antiplatelet therapy after a high-risk TIA or minor stroke: CHANCE (Wang Y et al. N Engl J Med
 * 2013;369:11–19) and POINT (Johnston SC et al. N Engl J Med 2018;379:215–225).
 */
function pushNoInfarctEvents(events: CascadeEvent[]): void {
  events.push({
    id: 'ischemia_no_infarct',
    kind: 'mechanism',
    severity: 'warn',
    onsetH: 0,
    endH: 6,
    title: { zh: '缺血但沒有梗塞', en: 'Ischaemia without infarction' },
    desc: {
      zh: '血流中斷約 10 秒內神經元停止放電而出現症狀。這次在組織壞死之前，血流就恢復了（或側枝循環撐住），所以症狀可以完全消失、沒有留下梗塞——這就是暫時性腦缺血（TIA）。',
      en: 'Within ~10 s of lost flow neurons stop firing and symptoms begin. This time flow came back (or collaterals held) before tissue died, so the symptoms can clear completely without an infarct — a transient ischaemic attack (TIA).',
    },
    regions: [],
  });
  events.push({
    id: 'imaging_no_infarct',
    kind: 'imaging',
    severity: 'info',
    onsetH: 0.1,
    endH: 336,
    title: { zh: '影像：預期 DWI 沒有梗塞', en: 'Imaging: DWI expected to show no infarct' },
    desc: {
      zh: '模型裡沒有組織壞死，所以擴散加權 MRI 預期是陰性。真實世界裡，持續較久的 TIA 常在 DWI 上看得到小病灶——那時依定義就算輕微中風，而不是 TIA。',
      en: 'No tissue died in the model, so diffusion MRI is expected to be negative. In real patients longer attacks often leave a small DWI lesion — by definition that is then a minor stroke, not a TIA.',
    },
    regions: [],
  });
  events.push({
    id: 'tia_urgent',
    kind: 'treatment',
    severity: 'warn',
    onsetH: 0,
    endH: 168,
    title: { zh: '症狀消失不代表沒事', en: 'Symptoms gone does not mean safe' },
    desc: {
      zh: 'TIA 後最初幾天發生真正中風的風險最高，應當天就醫、盡快完成腦與血管檢查。醫師通常會立即開始抗血小板藥物（高風險者短期併用兩種：CHANCE、POINT 試驗），並找出頸動脈狹窄、心房顫動等原因。反覆、越來越頻繁的發作（尤其後循環）可能是大血管即將完全阻塞的前兆。',
      en: 'The risk of a real stroke is highest in the first days after a TIA: seek care the same day and complete brain and vessel imaging promptly. Antiplatelet treatment is usually started at once (two drugs for a short time in high-risk cases: the CHANCE and POINT trials), and causes such as carotid stenosis or atrial fibrillation are sought. Repeated, increasingly frequent attacks (especially in the posterior circulation) can herald a complete large-vessel occlusion.',
    },
    regions: [],
  });
}

/**
 * A bed counts as living tissue that a secondary process (herniation, compression) can kill when
 * less than half of it would be infarcted without treatment. Deciding this on the untreated
 * course keeps the targets fixed when treatment saves a sliver of a bed — otherwise saving 1 % of
 * a half-infarcted border-zone bed pushed it under the line and the whole bed died secondarily,
 * so early treatment looked worse than none. The tolerance keeps beds that are exactly half
 * infarcted (one of two supplying arteries lost) from being decided by floating-point rounding.
 */
const stillAlive = (finalFraction: number | undefined) => (finalFraction ?? 0) < 0.5 - 1e-6;

/**
 * Midline shift (mm) at time t: builds from the onset of oedema to a peak around day 3–5 and
 * resolves over the following weeks; a decompressive craniectomy lets the swelling expand
 * outwards and largely removes the shift.
 */
export function midlineShiftAt(ms: CascadeOutput['midlineShift'], tH: number, decompression: boolean): number {
  if (!ms || tH < ms.onsetH) return 0;
  const peakH = 72;
  const plateauEndH = 120;
  const goneH = 500;
  const f =
    tH <= peakH ? (tH - ms.onsetH) / (peakH - ms.onsetH) : tH <= plateauEndH ? 1 : Math.max(0, 1 - (tH - plateauEndH) / (goneH - plateauEndH));
  return ms.peakMm * f * (decompression && tH >= 36 ? 0.3 : 1);
}

const LVO = [
  'ica_cervical',
  'ica_petrous_cavernous',
  'ica_ophthalmic_seg',
  'ica_terminal',
  'mca_m1',
  'basilar_lower',
  'basilar_mid',
  'basilar_upper',
  'basilar_tip',
  'va_v4_prox',
  'va_v4_dist',
];

/** medium / distal vessel occlusions (MeVO) */
const MEVO = ['mca_m2_sup', 'mca_m2_inf', 'aca_a1', 'aca_a2', 'pca_p1', 'pca_p2'];

const baseOf = (id: string) => id.replace(/_(r|l)$/, '');
const sideOf = (id: string): Side | 'm' => (id.endsWith('_r') ? 'r' : id.endsWith('_l') ? 'l' : 'm');
const opp = (s: Side): Side => (s === 'r' ? 'l' : 'r');

const MOTOR_SUPRA = ['precentral_face_arm', 'paracentral', 'ic_posterior_limb', 'ic_genu'];
const FRONTO_MOTOR = [...MOTOR_SUPRA, 'medial_frontal', 'prefrontal_dorsolateral', 'thalamus_ventrolateral', 'ic_anterior_limb'];

function regionFinal(bedFinal: Record<string, number>): Record<string, number> {
  const acc: Record<string, [number, number]> = {};
  for (const b of BEDS) {
    const a = (acc[b.region] ??= [0, 0]);
    a[0] += (bedFinal[b.id] ?? 0) * b.volume;
    a[1] += b.volume;
  }
  const out: Record<string, number> = {};
  for (const [r, [v, t]] of Object.entries(acc)) out[r] = t > 0 ? v / t : bedFinal[r] ?? 0;
  return out;
}

export function computeCascade(input: CascadeInput): CascadeOutput {
  const { hemo, bedFinal, bedFinalUntreated, regionAcute, decompression, reperfusionH } = input;
  const events: CascadeEvent[] = [];
  const bedEffects: Record<string, BedEffect[]> = {};
  const addEffect = (bedId: string, e: BedEffect) => (bedEffects[bedId] ??= []).push(e);
  const rf = regionFinal(bedFinal);
  const infarcted = (rid: string, thr = 0.3) => (rf[rid] ?? 0) >= thr;
  const infarctedRegions = Object.keys(rf).filter((r) => rf[r] >= 0.2);
  const lacuneFinal = input.lacuneFinal ?? {};
  /** the final infarct level of a region as the symptoms see it (a lacune at its own level) */
  const finalLevel = (rid: string) => Math.max(rf[rid] ?? 0, lacuneFinal[rid]?.level ?? 0);
  /**
   * the regions that will produce the late symptom `id`: its deficit entry (or the lacune site's)
   * at its own threshold, on the final infarct — the same rule as clinical.aggregateSymptoms, so a
   * late event is shown exactly when its symptom is (C10-F2)
   */
  const lateSources = (id: string): Region[] =>
    REGIONS.filter((r) => {
      const lac = lacuneFinal[r.id];
      const list = lac?.deficits ?? r.deficits;
      return list.some(
        (d) =>
          d.s === id &&
          (!d.only || r.side === d.only) &&
          !(lac && d.spareInLacune) &&
          !d.bilateralOnly &&
          finalLevel(r.id) >= Math.max(0.25, d.minLevel ?? 0) - 1e-6,
      );
    });

  const vol = { supra: { r: 0, l: 0 } as Record<Side, number>, cerebellum: { r: 0, l: 0 } as Record<Side, number>, brainstem: 0, total: 0 };
  let untreatedTotal = 0;
  for (const b of BEDS) {
    const reg = REGION_BY_ID[b.region];
    // the compartment decides where swelling goes: above the tentorium (hemispheric mass
    // effect, herniation) or in the tight posterior fossa (brainstem compression, hydrocephalus)
    if (reg.compartment === 'none') continue;
    const v = (bedFinal[b.id] ?? 0) * b.volume;
    untreatedTotal += (bedFinalUntreated[b.id] ?? 0) * b.volume;
    vol.total += v;
    const s = reg.side === 'm' ? 'r' : reg.side;
    if (reg.compartment === 'supra') vol.supra[s] += v;
    else if (reg.category === 'brainstem') vol.brainstem += v;
    else vol.cerebellum[s] += v;
  }
  const savedVolume = Math.max(0, untreatedTotal - vol.total);
  const earlySupra: Record<Side, number> = { r: 0, l: 0 };
  for (const b of BEDS) {
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment !== 'supra') continue;
    earlySupra[reg.side === 'm' ? 'r' : reg.side] += (input.bedEarly[b.id] ?? 0) * b.volume;
  }
  const lacuneIschaemia = input.lacuneIschaemia ?? [];
  const anyIschemia = Object.values(regionAcute).some((x) => x >= 0.05) || lacuneIschaemia.length > 0;
  const occludedBases = new Set(input.occlusions.filter((o) => o.severity >= 1).map((o) => baseOf(o.vessel)));
  const isLvo = LVO.some((b) => occludedBases.has(b));
  const isMevo = !isLvo && MEVO.some((b) => occludedBases.has(b));

  // ── 1–2. hyperacute mechanisms, imaging and treatment windows ──────
  // which story fits: only the retina is ischaemic (eye stroke), brain ischaemia that leaves no
  // infarct (a TIA, or tissue held by collaterals), or a brain infarct
  const ischaemicRegions = [...new Set([...Object.keys(regionAcute).filter((rid) => regionAcute[rid] >= 0.05), ...lacuneIschaemia])];
  const eyeOnly = anyIschemia && ischaemicRegions.every((rid) => REGION_BY_ID[rid]?.category === 'eye');
  // only the inner ear, and it infarcts (C7-F7): an end-organ infarct that the brain volume does
  // not count; a labyrinthine artery that reopens in time stays a TIA
  const earInfarct =
    anyIschemia && ischaemicRegions.every((rid) => REGION_BY_ID[rid]?.category === 'ear') && ischaemicRegions.some((rid) => infarcted(rid, 0.25));
  const noInfarct = anyIschemia && !eyeOnly && !earInfarct && vol.total < 0.05;
  if (eyeOnly) pushEyeEvents(events);
  else if (earInfarct) pushEarEvents(events);
  else if (noInfarct) pushNoInfarctEvents(events);
  else if (anyIschemia) {
    events.push({
      id: 'ischemic_cascade',
      kind: 'mechanism',
      severity: 'danger',
      onsetH: 0,
      endH: 6,
      title: { zh: '缺血連鎖反應（數秒至數分鐘）', en: 'Ischaemic cascade (seconds to minutes)' },
      desc: {
        zh: '血流中斷約 10 秒內神經元停止放電而出現症狀；數分鐘內能量（ATP）耗盡 → 鈉鉀幫浦失效 → 細胞腫脹（細胞毒性水腫）→ 麩胺酸大量釋放造成興奮毒性 → 鈣離子湧入、自由基與發炎反應 → 細胞死亡。核心區在數分鐘內壞死；周邊的「缺血半影區」靠側枝循環勉強存活，是治療要搶救的目標。',
        en: 'Within ~10 s of lost flow neurons stop firing and symptoms begin. Within minutes ATP runs out → ion pumps fail → cells swell (cytotoxic oedema) → glutamate floods out (excitotoxicity) → calcium overload, free radicals and inflammation → cell death. The core dies within minutes; the surrounding penumbra survives on collateral flow and is what treatment tries to rescue.',
      },
      regions: infarctedRegions,
    });
    events.push({
      id: 'imaging_dwi',
      kind: 'imaging',
      severity: 'info',
      onsetH: 0.1,
      endH: 336,
      title: { zh: '影像：MRI 擴散加權在數分鐘內就看得到', en: 'Imaging: diffusion MRI positive within minutes' },
      desc: {
        zh: 'DWI 可在數分鐘內顯示梗塞核心；CT 在最初幾小時常看不出來（約 6 小時後才逐漸變暗），但能先排除腦出血——這是血栓溶解治療前必做的檢查。',
        en: 'DWI shows the core within minutes; CT is often normal for the first hours (hypodensity appears after ~6 h) but excludes haemorrhage, which is required before thrombolysis.',
      },
      regions: [],
    });
    events.push({
      id: 'treatment_window',
      kind: 'treatment',
      severity: 'warn',
      onsetH: 0,
      endH: 24,
      title: { zh: '治療時間窗', en: 'Treatment windows' },
      desc: {
        zh: `靜脈血栓溶解劑：一般在發作 4.5 小時內。${
          isLvo
            ? '這是大血管阻塞，適合動脈取栓：6 小時內效果最明確，影像顯示仍有可救組織時可延長到 24 小時。'
            : isMevo
              ? '這是中型／遠端血管阻塞：靜脈血栓溶解是標準治療；2025 年 ESCAPE-MeVO 與 DISTAL 試驗顯示常規取栓沒有額外好處，只在個別情況（例如近端、優勢側的 M2）考慮。'
              : '此處不是大血管阻塞，一般不做取栓。'
        }每延遲一分鐘，典型大血管中風約多死亡 190 萬個神經元（Saver 2006）。`,
        en: `IV thrombolysis: generally within 4.5 h of onset. ${
          isLvo
            ? 'This is a large-vessel occlusion suited to mechanical thrombectomy: clearest benefit within 6 h, extendable to 24 h when imaging shows salvageable tissue.'
            : isMevo
              ? 'This is a medium/distal vessel occlusion: IV thrombolysis is standard; routine thrombectomy showed no benefit in the ESCAPE-MeVO and DISTAL trials (2025) and is considered case by case (e.g. a proximal, dominant M2).'
              : 'This is not a large-vessel occlusion; thrombectomy is not usually done.'
        } Each minute of delay in a typical large-vessel stroke costs ~1.9 million neurons (Saver 2006).`,
      },
      regions: [],
    });
  }

  const treatment = input.treatment;
  // only an occlusion that treatment can reopen: a single branch (lacune) or a stenosis stays
  const reopenable = input.occlusions.some(isTreatable);
  // the brain-tissue reperfusion story (penumbra saved, in mL) does not fit an eye or inner-ear
  // infarct, whose end organ the brain volumes do not count
  if (reperfusionH !== null && anyIschemia && !eyeOnly && !earInfarct && reopenable && treatment) {
    events.push(reperfusionEvent(treatment, reperfusionH, savedVolume));
    pushTreatmentComplications(events, treatment, reperfusionH);
  } else if (reperfusionH !== null && anyIschemia && !eyeOnly && !earInfarct && reopenable) {
    const late = reperfusionH > 6;
    events.push({
      id: 'reperfusion',
      kind: 'treatment',
      severity: savedVolume > 5 ? 'good' : 'info',
      onsetH: reperfusionH,
      title: { zh: '血管再通（血栓溶解／取栓）', en: 'Recanalisation (thrombolysis / thrombectomy)' },
      desc: {
        zh: `血流恢復時尚未壞死的半影區被救回，模型估計少了約 ${savedVolume.toFixed(0)} mL 的梗塞。已經壞死的核心不會恢復；${late ? '較晚再通時，' : ''}再灌流也可能帶來出血轉化與再灌流傷害。`,
        en: `Restored flow rescues penumbra that has not yet died — the model estimates ~${savedVolume.toFixed(0)} mL less infarct. The dead core does not recover; ${late ? 'with late recanalisation ' : ''}reperfusion can also bring haemorrhagic transformation and reperfusion injury.`,
      },
      regions: [],
    });
  }

  // ── 3. oedema & mass effect ────────────────────────────────────
  let hydrocephalusOnsetH: number | null = null;
  let hydrocephalusEndH: number | null = null;
  let midlineShift: CascadeOutput['midlineShift'] = null;
  if (vol.total >= 3) {
    events.push({
      id: 'vasogenic_edema',
      kind: 'mechanism',
      severity: 'warn',
      onsetH: 12,
      peakH: 84,
      endH: 400,
      title: { zh: '血管性水腫（第 2–5 天達高峰）', en: 'Vasogenic oedema (peaks day 2–5)' },
      desc: {
        zh: '血腦屏障受損，液體滲入梗塞組織，腦組織腫脹。小梗塞影響不大；大梗塞會擠壓周圍與遠處的腦組織，約 2–3 週後消退。',
        en: 'The blood–brain barrier breaks down and fluid leaks into the infarct, which swells. Small infarcts cope; large ones compress nearby and distant brain. Oedema resolves over ~2–3 weeks.',
      },
      regions: infarctedRegions,
    });
  }
  for (const s of ['r', 'l'] as Side[]) {
    const v = vol.supra[s];
    const sideZh = s === 'r' ? '右' : '左';
    const sideEn = s === 'r' ? 'right' : 'left';
    // malignant course: early (≤ 14 h) lesion > 145 mL (Oppenheim 2000) or a very large final infarct
    if (earlySupra[s] >= 145 || v >= 250) {
      midlineShift = { side: s, peakMm: Math.min(15, 5 + (v - 145) / 20), onsetH: 24 };
      events.push({
        id: `malignant_edema_${s}`,
        kind: 'secondary',
        severity: 'danger',
        onsetH: 24,
        peakH: 72,
        endH: 336,
        title: { zh: `${sideZh}大腦半球惡性腦水腫`, en: `Malignant ${sideEn}-hemisphere oedema` },
        desc: {
          zh: `發病 14 小時內的梗塞已約 ${earlySupra[s].toFixed(0)} mL（> 145 mL 為惡性水腫高風險），最終約 ${v.toFixed(0)} mL。腫脹的半球把中線推向對側，造成意識變差。${decompression ? '已施行減壓性顱骨切除，讓腦組織向外膨出而不壓迫腦幹。' : '若未減壓，死亡率可高達約 70–80%。'}`,
          en: `Infarct ≈ ${earlySupra[s].toFixed(0)} mL within 14 h (> 145 mL carries high risk), ≈ ${v.toFixed(0)} mL in the end. The swollen hemisphere pushes the midline across and consciousness falls. ${decompression ? 'Decompressive craniectomy lets the brain swell outward instead of into the brainstem.' : 'Without decompression mortality can reach ~70–80%.'}`,
        },
        regions: infarctedRegions.filter((r) => r.endsWith(`_${s}`)),
        symptoms: [{ id: 'somnolence', side: null, sev: 2 }],
      });
      if (decompression) {
        events.push({
          id: `hemicraniectomy_${s}`,
          kind: 'treatment',
          severity: 'good',
          onsetH: 36,
          title: { zh: '減壓性半側顱骨切除術', en: 'Decompressive hemicraniectomy' },
          desc: {
            zh: '在 48 小時內（60 歲以下證據最強）移除一大片頭骨並擴大硬腦膜，死亡率可從約 70% 降到約 20–30%，但存活者常留下中重度失能（Vahedi 2007 合併分析）。',
            en: 'Removing a large bone flap and opening the dura within 48 h (strongest evidence under age 60) lowers mortality from ~70% to ~20–30%, although survivors often remain moderately–severely disabled (Vahedi 2007 pooled analysis).',
          },
          regions: [],
        });
      } else {
        const aca = BEDS.filter(
          (b) => b.region.endsWith(`_${s}`) && b.supply.some((x) => /^aca_(callosomarginal|pericallosal|paracentral|frontopolar)/.test(x.v)) && stillAlive(bedFinalUntreated[b.id]),
        );
        aca.forEach((b) => addEffect(b.id, { kind: 'secondary', onsetH: 60, event: `subfalcine_${s}` }));
        events.push({
          id: `subfalcine_${s}`,
          kind: 'secondary',
          severity: 'danger',
          onsetH: 60,
          title: { zh: '大腦鐮下疝脫 → 同側前大腦動脈被壓迫', en: 'Subfalcine herniation → ipsilateral ACA compressed' },
          desc: {
            zh: '扣帶迴被擠到大腦鐮下方，夾住胼胝體周／胼胝體緣動脈，原本沒有阻塞的前大腦動脈區也發生「續發性梗塞」（腿無力加重、意志缺失）。',
            en: 'The cingulate gyrus is pushed under the falx and pinches the pericallosal/callosomarginal arteries, causing a secondary infarct in the previously normal ACA territory (worse leg weakness, abulia).',
          },
          regions: [...new Set(aca.map((b) => b.region))],
        });
        const pca = BEDS.filter(
          (b) => b.region.endsWith(`_${s}`) && b.supply.some((x) => /^pca_(temporal|calcarine|parietooccipital|splenial|p2)/.test(x.v)) && stillAlive(bedFinalUntreated[b.id]),
        );
        pca.forEach((b) => addEffect(b.id, { kind: 'secondary', onsetH: 72, event: `uncal_${s}` }));
        const mid = BEDS.filter((b) => /^midbrain_/.test(b.region));
        mid.forEach((b) => addEffect(b.id, { kind: 'compressed', onsetH: 72, endH: 336, event: `uncal_${s}` }));
        const pons = BEDS.filter((b) => /^pons_rostral_(tegmentum|basis)/.test(b.region));
        pons.forEach((b) => addEffect(b.id, { kind: 'compressed', onsetH: 84, endH: 336, event: `uncal_${s}` }));
        events.push({
          id: `uncal_${s}`,
          kind: 'secondary',
          severity: 'danger',
          onsetH: 72,
          title: { zh: '顳葉鉤迴疝脫 → 壓迫中腦與後大腦動脈', en: 'Uncal (transtentorial) herniation → midbrain & PCA compressed' },
          desc: {
            zh: `內側顳葉從小腦天幕切跡擠下去：壓迫同側動眼神經（${sideZh}側瞳孔放大）、壓扁中腦（昏迷、去大腦姿勢）、夾住${sideZh}側後大腦動脈造成枕葉續發梗塞；對側大腦腳被頂到天幕邊緣（Kernohan 切跡）會讓「同側」肢體也無力。腦幹被往下拉扯可撕裂橋腦穿通動脈（Duret 出血），常致命。`,
            en: `The medial temporal lobe slides through the tentorial notch: it compresses the ${sideEn} oculomotor nerve (dilated ${sideEn} pupil), squeezes the midbrain (coma, posturing) and kinks the ${sideEn} PCA causing a secondary occipital infarct; the opposite peduncle pressed on the tentorium (Kernohan notch) weakens the SAME-side limbs. Downward stretch can tear pontine perforators (Duret haemorrhage), often fatal.`,
          },
          regions: [...new Set([...pca.map((b) => b.region), ...mid.map((b) => b.region)])],
          endH: 336,
          symptoms: [
            { id: 'coma', side: null, sev: 3 },
            { id: 'cn3_palsy', side: s, sev: 3 },
            { id: 'arm_weak', side: s, sev: 2 },
            { id: 'leg_weak', side: s, sev: 2 },
          ],
        });
      }
    } else if (v >= 70) {
      midlineShift = midlineShift ?? { side: s, peakMm: 2 + (v - 70) / 25, onsetH: 24 };
      events.push({
        id: `mass_effect_${s}`,
        kind: 'secondary',
        severity: 'warn',
        onsetH: 24,
        peakH: 72,
        endH: 336,
        title: { zh: `${sideZh}半球中度占位效應`, en: `Moderate mass effect (${sideEn} hemisphere)` },
        desc: {
          zh: `梗塞約 ${v.toFixed(0)} mL，水腫可擠壓側腦室並造成數毫米的中線偏移；需密切觀察意識與瞳孔，多數不會形成疝脫。`,
          en: `Infarct ≈ ${v.toFixed(0)} mL; oedema can compress the lateral ventricle and shift the midline a few millimetres. Consciousness and pupils need close watching; most patients do not herniate.`,
        },
        regions: infarctedRegions.filter((r) => r.endsWith(`_${s}`)),
      });
    }
  }

  const cbTotal = vol.cerebellum.r + vol.cerebellum.l;
  if (cbTotal >= 25) {
    const bs = BEDS.filter((b) => /^(pons|medulla)_/.test(b.region));
    events.push({
      id: 'cerebellar_edema',
      kind: 'secondary',
      severity: 'danger',
      onsetH: 24,
      peakH: 60,
      endH: 336,
      title: { zh: '占位性小腦梗塞：水腫擠壓第四腦室與腦幹', en: 'Space-occupying cerebellar infarct: oedema compresses the 4th ventricle and brainstem' },
      desc: {
        zh: `小腦梗塞約 ${cbTotal.toFixed(0)} mL。後顱窩空間很小，第 1–3 天腫脹會壓住第四腦室造成阻塞性水腦（整個腦室系統擴大、頭痛嘔吐、意識下降），並直接壓迫橋腦與延髓；嚴重時小腦扁桃體向下疝脫壓迫延髓呼吸中樞。${decompression ? '已施行枕下減壓（± 腦室外引流），預後通常不錯。' : '需要神經外科評估枕下減壓或腦室外引流——及時處理時存活者功能常相當好。'}`,
        en: `Cerebellar infarct ≈ ${cbTotal.toFixed(0)} mL. The posterior fossa is tight: over days 1–3 swelling blocks the 4th ventricle, causing obstructive hydrocephalus (all ventricles enlarge; headache, vomiting, drowsiness) and compresses the pons and medulla; tonsillar herniation can then compress the medullary respiratory centre. ${decompression ? 'Suboccipital decompression (± external ventricular drain) has been performed; outcomes are often good.' : 'Neurosurgical suboccipital decompression or ventricular drainage is needed — when done in time, survivors often recover well.'}`,
      },
      regions: [...new Set(bs.map((b) => b.region))],
      // direct pressure on the pontine tegmentum: gaze / VI palsy on the side of the infarct
      symptoms: decompression
        ? []
        : [
            { id: 'nausea_vomiting', side: null, sev: 2 },
            { id: 'gaze_palsy_horizontal', side: vol.cerebellum.r >= vol.cerebellum.l ? 'r' : 'l', sev: 1 },
          ],
    });
    if (!decompression) {
      hydrocephalusOnsetH = 36;
      hydrocephalusEndH = 336;
      bs.forEach((b) => addEffect(b.id, { kind: 'compressed', onsetH: 48, endH: 336, event: 'cerebellar_edema' }));
      events.push({
        id: 'hydrocephalus',
        kind: 'secondary',
        severity: 'danger',
        onsetH: 36,
        endH: hydrocephalusEndH,
        symptoms: [
          // raised pressure and a dilated aqueduct: drowsiness and upgaze palsy
          { id: 'coma', side: null, sev: 2 },
          { id: 'upgaze_palsy', side: null, sev: 1 },
        ],
        title: { zh: '阻塞性水腦症', en: 'Obstructive hydrocephalus' },
        desc: {
          zh: '腦脊髓液出不去，側腦室與第三腦室脹大，顱內壓上升——遠離小腦的大腦也因此受影響（頭痛、嘔吐、嗜睡）。',
          en: 'CSF cannot drain, the lateral and third ventricles balloon and intracranial pressure rises — affecting the cerebrum far from the cerebellar infarct (headache, vomiting, drowsiness).',
        },
        regions: [],
      });
    }
  }

  // ── 4. haemorrhagic transformation ─────────────────────────────
  if (vol.total >= 1) {
    // A thrombolytic drug (IV thrombolysis alone, or before thrombectomy) raises the bleeding risk
    // modestly compared with thrombectomy alone. In the trials of thrombectomy with or without
    // IV thrombolysis first, intracranial haemorrhage was somewhat more frequent with the drug but
    // symptomatic haemorrhage differed only slightly. Conservatively, the drug lowers the
    // infarct-volume thresholds of the risk steps by a quarter: an infarct near a threshold moves
    // up by one step, never more, and one under 22.5 mL does not move at all.
    // Published rates are shown next to the treatment options (anatomy/recanalisation.ts). An
    // attempt that reopened nothing (eTICI 0) brings no blood back into dead tissue, so late or
    // large reperfusion adds nothing then.
    const lytic = !!treatment && treatment.method !== 'evt';
    const k = lytic ? 0.75 : 1;
    const reperfused = reperfusionH !== null && !treatment?.failed;
    let level = vol.total > 100 * k ? 2 : vol.total > 30 * k ? 1 : 0;
    if (reperfused && ((reperfusionH as number) > 6 || vol.total > 70 * k)) level = Math.min(2, level + 1);
    const lv = [
      { zh: '低', en: 'low' },
      { zh: '中等', en: 'moderate' },
      { zh: '高', en: 'high' },
    ][level];
    events.push({
      id: 'hemorrhagic_transformation',
      kind: 'complication',
      severity: level === 2 ? 'danger' : 'warn',
      onsetH: 24,
      peakH: 72,
      endH: 336,
      title: { zh: `出血轉化風險：${lv.zh}`, en: `Haemorrhagic transformation risk: ${lv.en}` },
      desc: {
        zh: `壞死組織裡受損的小血管在血流恢復後可能滲血，多發生在 1–7 天內。梗塞越大、再通越晚、使用血栓溶解劑，風險越高；症狀性出血在靜脈血栓溶解後約 2–7%。${
          lytic ? `這次用了血栓溶解劑（${METHOD_NAME[treatment.method].zh}），模型把風險略為調高；與單純取栓相比，差距不大。` : ''
        }`,
        en: `Damaged small vessels inside dead tissue may bleed once flow returns, usually within 1–7 days. Larger infarcts, late recanalisation and thrombolytics raise the risk; symptomatic haemorrhage occurs in roughly 2–7% after IV thrombolysis.${
          lytic ? ` A thrombolytic was given (${METHOD_NAME[treatment.method].en}), so the model raises the risk a little; the difference from thrombectomy alone is small.` : ''
        }`,
      },
      regions: infarctedRegions.filter((r) => REGION_BY_ID[r]?.category === 'cortex' || REGION_BY_ID[r]?.category === 'deep'),
    });
  }

  // ── 5. brainstem-specific ──────────────────────────────────────
  const acute = (rid: string, thr = 0.3) => (regionAcute[rid] ?? 0) >= thr;
  const bilateral = (test: (rid: string) => boolean, pairs: [string, string][]) => pairs.some(([r, l]) => test(r) && test(l));
  const PONS_BASIS: [string, string][] = [
    ['pons_rostral_basis_r', 'pons_rostral_basis_l'],
    ['pons_caudal_basis_r', 'pons_caudal_basis_l'],
  ];
  const MEDULLA: [string, string][] = [
    ['medulla_lateral_r', 'medulla_lateral_l'],
    ['medulla_medial_r', 'medulla_medial_l'],
  ];
  // Both states come from the acute dysfunction. When blood returns before the tissue on both
  // sides dies, the state lasts only until then (the symptoms clear with reperfusion); without
  // that, it stays for as long as the dysfunction does.
  const transientUntil = (pairs: [string, string][]) =>
    input.flowReturnsH != null && !bilateral(infarcted, pairs) ? input.flowReturnsH : undefined;
  const clears = (h: number | undefined) =>
    h === undefined
      ? { zh: '', en: '' }
      : {
          zh: `血流在發作後 ${formatHours(h, 'zh-TW')}恢復，兩側沒有形成梗塞：這個狀態隨之解除。`,
          en: ` Blood returned ${formatHours(h, 'en')} after onset before both sides infarcted, so the state resolves then.`,
        };
  const lockedIn = bilateral(acute, PONS_BASIS);
  if (lockedIn) {
    const until = transientUntil(PONS_BASIS);
    const note = clears(until);
    events.push({
      id: 'locked_in',
      kind: 'secondary',
      severity: 'danger',
      onsetH: 0,
      ...(until !== undefined ? { endH: until } : {}),
      title: { zh: '雙側橋腦腹側受損：閉鎖症候群風險', en: 'Bilateral ventral pons: risk of locked-in syndrome' },
      desc: {
        zh: `四肢與臉部完全癱瘓、無法說話吞嚥，但意識清楚，只能用垂直眼動與眨眼溝通（控制垂直眼動的中腦未受損）。${note.zh}`,
        en: `Total paralysis of limbs and face with no speech or swallowing, yet fully conscious — communication is only by vertical eye movements and blinking (the midbrain gaze centres are spared).${note.en}`,
      },
      regions: PONS_BASIS.flat().filter((r) => acute(r)),
    });
  }
  if (bilateral(acute, MEDULLA)) {
    const until = transientUntil(MEDULLA);
    const note = clears(until);
    events.push({
      id: 'respiratory_failure',
      kind: 'complication',
      severity: 'danger',
      onsetH: 0,
      endH: Math.min(168, until ?? Infinity),
      title: { zh: '雙側延髓受損：呼吸衰竭風險', en: 'Bilateral medulla: risk of respiratory failure' },
      desc: {
        zh: `延髓的呼吸節律中樞與吞嚥反射受損，可能需要插管與呼吸器。${note.zh}`,
        en: `Medullary respiratory rhythm and airway reflexes fail; intubation and ventilation may be needed.${note.en}`,
      },
      regions: MEDULLA.flat().filter((r) => acute(r)),
    });
  }

  // one lateral medulla (C7-F1): one side of the pontomedullary reticular formation and nucleus
  // ambiguus is enough to lose automatic breathing (Bogousslavsky J et al. Ann Neurol
  // 1990;28:668–673, PMID 2260854). Overt respiratory failure complicates 2–6 % of one-sided
  // lateral medullary infarcts (Pavšič K et al. Sleep Breath 2020;24:1557–1563, PMID 32064553);
  // 8 of 102 died of respiratory failure within 10 days, more often with severe dysphagia,
  // dysarthria, ipsilateral hemiparesis, urinary retention, disability before the stroke or lung
  // disease (Saito T et al. J Neurol Sci 2022;434:120167, PMID 35091384); 5 of 43 died of
  // respiratory or cardiovascular complications in the acute phase of a population series
  // (Norrving B, Cronqvist S. Neurology 1991;41:244–248, PMID 1992369); the ipsilateral
  // hemiparesis comes from the crossed pyramidal tract in the lowest medulla (Uemura M et al. J
  // Neurol Sci 2016;365:40–45, PMID 27206871) and is not reproduced by this model (C7-F11);
  // lost automatic breathing can recover (Mendoza M, Latorre JG. Neurology 2013;80:e13–e16,
  // PMID 23296134). From the threshold at which the region's symptoms appear (or a single
  // lateral medullary perforator closing), for tissue that infarcts (a vertebral TIA carries no
  // such risk); when both medullae are involved the danger event above says it.
  const lateralMedulla = (['r', 'l'] as Side[])
    .map((s) => `medulla_lateral_${s}`)
    .filter((rid) => (acute(rid, 0.25) || lacuneIschaemia.includes(rid)) && infarcted(rid, 0.25));
  if (lateralMedulla.length > 0 && !bilateral(acute, MEDULLA)) {
    events.push({
      id: 'lateral_medullary_breathing',
      kind: 'complication',
      severity: 'warn',
      onsetH: 0,
      endH: 240,
      title: { zh: '延髓外側梗塞：前 10 天呼吸可能衰竭', en: 'Lateral medullary infarct: breathing may fail in the first 10 days' },
      desc: {
        zh: '延髓外側有讓呼吸自動進行的神經網路，以及呼吸道、心跳與血壓的反射；只壞一側就可能失去自動呼吸（睡著就停，「Ondine 詛咒」）。前約 10 天呼吸可能變慢或停止，多半在睡眠中：單側延髓外側梗塞約 2–6% 出現明顯的呼吸衰竭；一個醫院的系列 102 人中有 8 人在 10 天內死於呼吸衰竭，一個較早的族群研究 43 人中有 5 人在急性期死於呼吸或心血管併發症。嚴重吞嚥困難、構音障礙、病灶同側的手腳無力、尿液滯留、中風前已失能或有肺病時風險較高——病灶同側的無力（Opalski 變異型，延髓最下段已交叉的錐體徑受損）本模型沒有重現。這段期間要密切觀察呼吸，包括睡眠中；失去的自動呼吸有時會恢復。',
        en: 'The lateral medulla holds the network that keeps breathing going automatically, and the reflexes of the airway, heart rate and blood pressure; losing one side can be enough to lose automatic breathing (breathing stops in sleep: "Ondine\'s curse"). For about the first 10 days breathing can slow or stop, mostly in sleep: overt respiratory failure complicates about 2–6 % of one-sided lateral medullary infarcts; in one hospital series 8 of 102 died of respiratory failure within 10 days, and in an older population series 5 of 43 died of respiratory or cardiovascular complications in the acute phase. The risk is higher with severe dysphagia, dysarthria, weakness of the limbs on the same side as the infarct, urinary retention, disability before the stroke or lung disease — the same-side weakness (Opalski variant, from the crossed pyramidal tract in the lowest medulla) is not reproduced by this model. Breathing is watched closely during this time, including in sleep; lost automatic breathing sometimes recovers.',
      },
      regions: lateralMedulla,
    });
  }

  // ── 6. systemic complications ──────────────────────────────────
  // the aspiration risk follows the swallowing deficit (C1-F4): the regions that produce
  // dysphagia (one-sided hemispheric ones included), reduced consciousness, or — as before — a
  // large supratentorial infarct. Dysphagia roughly triples the risk of pneumonia, and aspiration
  // multiplies it by about 11 (Martino R et al. Stroke 2005;36:2756-2763, PMID 16269630); it is
  // present from the start, so the swallow screen comes before any oral intake (onset 0 h).
  const affects = (r: (typeof REGIONS)[number], ids: string[]) =>
    r.deficits.some((d) => {
      if (!ids.includes(d.s) || (d.only && r.side !== d.only)) return false;
      // the threshold at which the symptom itself appears
      const thr = Math.max(0.25, d.minLevel ?? 0);
      if (!acute(r.id, thr)) return false;
      return !d.bilateralOnly || (r.side !== 'm' && acute(`${r.baseId}_${r.side === 'r' ? 'l' : 'r'}`, thr));
    });
  const swallowing = REGIONS.filter((r) => affects(r, ['dysphagia'])).map((r) => r.id);
  const drowsy = REGIONS.some((r) => affects(r, ['coma', 'somnolence']));
  const dysphagiaRisk = swallowing.length > 0 || drowsy || vol.supra.r + vol.supra.l > 60 || lockedIn;
  if (dysphagiaRisk) {
    events.push({
      id: 'aspiration',
      kind: 'complication',
      severity: 'warn',
      onsetH: 0,
      endH: 336,
      title: { zh: '吞嚥困難 → 吸入性肺炎', en: 'Dysphagia → aspiration pneumonia' },
      // fever early after an ischaemic stroke is mostly infection or aspiration (Grau AJ et al.,
      // J Neurol Sci 1999;171:115–120); central fever is described mostly with haemorrhage and
      // brainstem involvement (Sung CY et al., Eur Neurol 2009;62:86–92), so it is not a symptom
      // of this model (see the temperature section of anatomy/symptoms.ts)
      desc: {
        zh: '中風後最常見的致死併發症之一。進食前需做吞嚥篩檢，必要時暫時以鼻胃管餵食。中風後發燒要先找感染（肺炎、尿路感染）；腦部本身引起的「中樞性發燒」在缺血性中風很少見，只有排除感染後才考慮。',
        en: 'One of the commonest fatal complications after stroke. A swallow screen is needed before eating; temporary tube feeding may be required. Fever after a stroke means looking for infection first (pneumonia, urinary tract); fever caused by the brain injury itself ("central fever") is rare after an ischaemic stroke and is considered only once infection has been ruled out.',
      },
      regions: swallowing,
    });
  }
  // the heart after any stroke (C10-F5): serious cardiac adverse events in 19 % of 846 ischaemic
  // strokes within 3 months and cardiac death in 4.1 %, the first-event hazard peaking on days 2–3
  // and cardiac death in week 2; predictors heart failure, diabetes, creatinine, stroke severity
  // and QTc — lesion site not analysed (Prosser J et al. Stroke 2007;38:2295-2302, PMID 17569877);
  // the stroke–heart syndrome (Scheitz JF et al. Lancet Neurol 2018;17:1109-1120, PMID 30509695).
  // The insula of either side adds to it, with the same threshold: the evidence on the side is
  // mixed (right dorsal anterior insula and troponin dynamics: Krause T et al. Ann Neurol
  // 2017;81:502-511, PMID 28253544; left insula and adverse cardiac outcome at 1 year: Laowattana S
  // et al. Neurology 2006;66:477-483, PMID 16505298). Prolonged monitoring newly finds atrial
  // fibrillation in 23.7 % (Sposato LA et al. Lancet Neurol 2015;14:377-387, PMID 25748102) —
  // cause-finding, not a complication. "Severe" here is a volume proxy for stroke severity.
  const brainInfarct = anyIschemia && !eyeOnly && !earInfarct && !noInfarct;
  if (brainInfarct) {
    const insula = (['insula_r', 'insula_l'] as const).filter((r) => acute(r, 0.3));
    const severe = vol.total >= 60 || lockedIn;
    const sideZh = (r: string) => (r.endsWith('_r') ? '右' : '左');
    const sideEn = (r: string) => (r.endsWith('_r') ? 'right' : 'left');
    events.push({
      id: 'cardiac',
      kind: 'complication',
      severity: severe || insula.length > 0 ? 'warn' : 'info',
      onsetH: 0,
      endH: 336,
      title: { zh: '中風後的心臟：心律不整、心肌受損', en: 'The heart after a stroke: arrhythmia, cardiac injury' },
      desc: {
        zh: `中風後最初幾天常出現心臟併發症（「中風—心臟症候群」）：心律不整、心肌旋轉蛋白（troponin）上升、心臟功能變差。一個 846 人的試驗資料中，19% 在 3 個月內發生嚴重的心臟不良事件、4.1% 死於心臟原因；第一次事件最常在第 2–3 天，心臟死亡最常在第 2 週。預測因子是心衰竭病史、糖尿病、腎功能較差、中風嚴重度與心電圖 QT 延長（該研究沒有分析病灶位置）。所以急性期會監測心電圖；較長時間的心律監測約可新發現四分之一的心房顫動——這是在找中風的原因，不是中風造成的併發症。${
          severe ? '這是嚴重的中風，風險較高。' : ''
        }${
          insula.length
            ? `梗塞包含${insula.map(sideZh).join('、')}側島葉：島葉參與心臟的自主神經控制，但哪一側比較重要，證據不一致——右側背前島葉與 troponin 上升有關，左側島葉與之後一年的心臟事件有關。`
            : ''
        }`,
        en: `Cardiac complications are common in the first days after a stroke (the "stroke–heart syndrome"): arrhythmias, a troponin rise, reduced cardiac function. In trial data of 846 patients, 19 % had a serious cardiac adverse event within 3 months and 4.1 % died of cardiac causes; first events peaked on days 2–3 and cardiac deaths in the second week. The predictors were heart failure, diabetes, poorer kidney function, stroke severity and a long QT interval on the ECG (lesion site was not analysed). The heart rhythm is therefore monitored in the acute phase; longer rhythm monitoring newly finds atrial fibrillation in about a quarter — a search for the cause of the stroke, not a complication of it.${
          severe ? ' This is a severe stroke, which carries a higher risk.' : ''
        }${
          insula.length
            ? ` The infarct involves the ${insula.map(sideEn).join(' and ')} insula, which helps control the heart's autonomic tone; the evidence on the side is mixed — the right dorsal anterior insula is linked to a troponin rise, the left insula to cardiac events over the following year.`
            : ''
        }`,
      },
      regions: [...insula],
    });
  }
  const legWeak = ['paracentral', 'ic_posterior_limb', 'midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis', 'medulla_medial'].some(
    (b) => acute(`${b}_r`) || acute(`${b}_l`),
  );
  if (legWeak || lockedIn) {
    events.push({
      id: 'dvt',
      kind: 'complication',
      severity: 'warn',
      onsetH: 48,
      endH: 720,
      title: { zh: '深部靜脈血栓與肺栓塞', en: 'Deep-vein thrombosis & pulmonary embolism' },
      desc: {
        zh: '癱瘓的腿不動，靜脈血流停滯形成血栓，可能流到肺部。需早期活動與間歇性氣動加壓。',
        en: 'A paralysed leg does not pump venous blood; clots can form and travel to the lungs. Early mobilisation and intermittent pneumatic compression help.',
      },
      regions: [],
    });
  }
  const corticalInfarct = infarctedRegions.some((r) => REGION_BY_ID[r]?.category === 'cortex');
  if (corticalInfarct) {
    events.push({
      id: 'seizure',
      kind: 'complication',
      severity: 'info',
      onsetH: 24,
      endH: 4320,
      title: { zh: '中風後癲癇', en: 'Post-stroke seizures' },
      // late (> 7 days) seizures after an ischaemic stroke: 4 % at 1 year and 8 % at 5 years; the
      // SeLECT score (severity, large-artery atherosclerosis, early seizure, cortical involvement,
      // MCA territory) ranges from 0.7 % to 63 % at 1 year (Galovic M et al. Lancet Neurol
      // 2018;17:143-152, PMID 29413315). C10-F4
      desc: {
        zh: '皮質受損的疤痕可能成為異常放電來源：早發性（1 週內）或晚發性（數月後，較容易變成慢性癲癇）。缺血性中風後晚發性發作（7 天後）的風險：1 年約 4%、5 年約 8%。SeLECT 分數列出的危險因子是中風嚴重度、大動脈粥狀硬化的病因、早發性發作、皮質受累與中大腦動脈區受累；最低分時 1 年風險不到 1%，最高分時約 63%。',
        en: 'Scarred cortex can become a seizure focus: early (within a week) or late (months later, more likely to become chronic epilepsy). The risk of late seizures (after 7 days) after an ischaemic stroke is about 4 % at 1 year and 8 % at 5 years. The SeLECT score lists the factors: stroke severity, large-artery atherosclerosis as the cause, early seizures, cortical involvement and MCA-territory involvement; the 1-year risk ranges from under 1 % at the lowest score to about 63 % at the highest.',
      },
      regions: infarctedRegions.filter((r) => REGION_BY_ID[r]?.category === 'cortex'),
    });
  }

  // ── 7. remote effects: diaschisis & degeneration ──────────────
  // striatocapsular infarction (putamen, caudate and internal capsule, the cortex spared): the
  // commonest presentation has cortical signs — dysphasia, neglect or dyspraxia — acutely from
  // cortical hypoperfusion, chronically attributed to diaschisis (Donnan GA et al. Brain
  // 1991;114:51-70, PMID 1998890); aphasia is extremely rare with lesions confined to the basal
  // ganglia (Bhatia KP, Marsden CD. Brain 1994;117:859-876, PMID 7922471), so these signs come
  // with the whole striatocapsular pattern only, not with a putaminal or caudate lacune. On the
  // left a non-fluent aphasia with preserved repetition (listed as transcortical motor) and limb
  // apraxia, on the right neglect; shown for the first three months (illustrative: the paper gives
  // no time course). C6-F6.
  for (const s of ['r', 'l'] as Side[]) {
    const deep =
      acute(`putamen_${s}`, 0.4) &&
      (acute(`caudate_body_${s}`) || acute(`caudate_head_${s}`)) &&
      ['ic_posterior_limb', 'ic_genu', 'ic_anterior_limb'].some((b) => acute(`${b}_${s}`)) &&
      infarcted(`putamen_${s}`, 0.3);
    if (!deep || REGIONS.some((r) => r.side === s && r.category === 'cortex' && infarcted(r.id, 0.3))) continue;
    const left = s === 'l';
    events.push({
      id: `striatocapsular_cortical_${s}`,
      kind: 'secondary',
      severity: 'warn',
      onsetH: 0,
      endH: 2160,
      title: { zh: '紋狀體內囊梗塞的皮質徵象', en: 'Cortical signs of a striatocapsular infarct' },
      desc: {
        zh: `梗塞只在深部（殼核、尾狀核、內囊），${left ? '左' : '右'}側大腦皮質沒有壞死，卻常出現皮質徵象：${
          left ? '說話少而費力但能複誦的失語（皮質下失語，這裡列為經皮質運動性失語）與失用' : '左側空間忽略'
        }。急性期歸因於皮質灌流不足（堵住豆紋動脈開口的 M1 起始處血栓或狹窄，也會減少皮質的血流），之後則歸因於深部與皮質之間的連結中斷（遠隔效應，diaschisis）。常在數週到數月內改善，部分會留下來；模型顯示前三個月。只有手臂或手臂加臉無力、沒有皮質徵象的病人，恢復通常最好。`,
        en: `The infarct is deep (putamen, caudate, internal capsule) and the ${left ? 'left' : 'right'} cortex has not died, yet cortical signs are common: ${
          left ? 'an aphasia with sparse, effortful speech but preserved repetition (a subcortical aphasia, listed here as transcortical motor aphasia) and apraxia' : 'neglect of the left side'
        }. Acutely they are attributed to cortical hypoperfusion (the clot or stenosis at the MCA origin that blocks the lenticulostriate openings can also reduce cortical flow); later to the lost connections between the deep structures and the cortex (diaschisis). They often improve over weeks to months, and some remain; the model shows them for the first three months. Patients with arm or arm-and-face weakness alone and no cortical signs usually recover best.`,
      },
      regions: REGIONS.filter((r) => r.side === s && ['putamen', 'caudate_head', 'caudate_body', 'ic_posterior_limb', 'ic_genu', 'ic_anterior_limb'].includes(r.baseId) && acute(r.id)).map((r) => r.id),
      symptoms: left
        ? [
            { id: 'aphasia_tc_motor', side: null, sev: 1 },
            { id: 'apraxia', side: null, sev: 1 },
          ]
        : [{ id: 'neglect', side: 'l', sev: 1 }],
    });
  }
  for (const s of ['r', 'l'] as Side[]) {
    const drivers = FRONTO_MOTOR.map((b) => `${b}_${s}`).filter((r) => infarcted(r, 0.3));
    if (drivers.length && vol.supra[s] >= 8) {
      const cb = BEDS.filter((b) => /^cerebellum_(superior|posterior_inferior|anterior_inferior)_/.test(b.region) && b.region.endsWith(`_${opp(s)}`));
      cb.forEach((b) => addEffect(b.id, { kind: 'diaschisis', onsetH: 24, event: `ccd_${s}` }));
      events.push({
        id: `ccd_${s}`,
        kind: 'secondary',
        severity: 'info',
        onsetH: 24,
        title: { zh: '交叉性小腦功能抑制（遠隔效應）', en: 'Crossed cerebellar diaschisis (remote effect)' },
        desc: {
          zh: `${s === 'r' ? '右' : '左'}側大腦的額葉／運動區受損，經皮質—橋腦—小腦路徑的輸入中斷，對側（${s === 'r' ? '左' : '右'}側）小腦半球的血流與代謝跟著下降。小腦本身沒有梗塞、通常沒有症狀，PET／SPECT 上看得到，可持續數月。`,
          en: `Damage to the ${s === 'r' ? 'right' : 'left'} frontal/motor cortex removes input through the cortico-ponto-cerebellar pathway, so blood flow and metabolism fall in the opposite (${s === 'r' ? 'left' : 'right'}) cerebellar hemisphere. It is not infarcted and usually silent, but visible on PET/SPECT for months.`,
        },
        regions: [...new Set(cb.map((b) => b.region))],
      });
    }

    // Wallerian degeneration of the corticospinal tract
    const levels = ['midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis', 'medulla_medial'];
    let startIdx = -1;
    if (MOTOR_SUPRA.some((b) => infarcted(`${b}_${s}`, 0.3))) startIdx = 0;
    else {
      for (let i = 0; i < levels.length - 1; i++) {
        if (infarcted(`${levels[i]}_${s}`, 0.3)) {
          startIdx = i + 1;
          break;
        }
      }
    }
    if (startIdx >= 0) {
      const down = levels.slice(startIdx).map((b) => `${b}_${s}`).filter((r) => !infarcted(r, 0.5));
      down.forEach((rid) =>
        BEDS.filter((b) => b.region === rid).forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 336, event: `wallerian_${s}` })),
      );
      if (down.length) {
        events.push({
          id: `wallerian_${s}`,
          kind: 'secondary',
          severity: 'info',
          onsetH: 336,
          title: { zh: '皮質脊髓徑的沃勒氏退化', en: 'Wallerian degeneration of the corticospinal tract' },
          desc: {
            zh: '運動神經元的細胞本體或纖維被切斷後，下游的軸突會一路往下退化：大腦腳 → 橋腦 → 延髓錐體（在延髓下端交叉到對側脊髓）。擴散張量影像約 1–2 週可見，傳統 MRI 約 4 週後出現訊號變化，數月後萎縮。',
            en: 'Once motor neurons or their fibres are cut, the axons below degenerate all the way down: peduncle → pons → medullary pyramid (crossing to the opposite spinal cord at the bottom of the medulla). Diffusion-tensor imaging shows it after ~1–2 weeks, conventional MRI after ~4 weeks, with atrophy over months.',
          },
          regions: down,
        });
      }
    }
    // pontine basis → bilateral middle cerebellar peduncle degeneration
    if (infarcted(`pons_rostral_basis_${s}`, 0.4) || infarcted(`pons_caudal_basis_${s}`, 0.4)) {
      const mcp = BEDS.filter((b) => /^cerebellum_anterior_inferior_/.test(b.region) && stillAlive(bedFinalUntreated[b.id]));
      mcp.forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 720, event: `mcp_${s}` }));
      events.push({
        id: `mcp_${s}`,
        kind: 'secondary',
        severity: 'info',
        onsetH: 720,
        title: { zh: '橋小腦纖維退化（小腦中腳）', en: 'Pontocerebellar fibre degeneration (middle cerebellar peduncles)' },
        desc: {
          zh: '橋核的纖維交叉後經小腦中腳進入小腦；橋腦腹側梗塞數週後，雙側小腦中腳可出現退化訊號，加重協調障礙。',
          en: 'Pontine nuclei send crossing fibres through the middle cerebellar peduncles; weeks after a ventral pontine infarct both peduncles can degenerate, adding to incoordination.',
        },
        regions: [...new Set(mcp.map((b) => b.region))],
      });
    }
    // hypertrophic olivary degeneration (Guillain–Mollaret triangle)
    const hodTargets: string[] = [];
    if (infarcted(`dentate_${s}`, 0.3)) hodTargets.push(`medulla_medial_${opp(s)}`);
    if (infarcted(`midbrain_paramedian_${s}`, 0.3) || infarcted(`pons_rostral_tegmentum_${s}`, 0.3) || infarcted(`pons_caudal_tegmentum_${s}`, 0.3))
      hodTargets.push(`medulla_medial_${s}`);
    const hod = [...new Set(hodTargets)].filter((r) => !infarcted(r, 0.5));
    if (hod.length) {
      hod.forEach((rid) =>
        BEDS.filter((b) => b.region === rid).forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 720, event: `hod_${s}` })),
      );
      events.push({
        id: `hod_${s}`,
        kind: 'secondary',
        severity: 'warn',
        onsetH: 720,
        peakH: 3000,
        title: { zh: '下橄欖核肥大性退化（遠隔的延髓變化）', en: 'Hypertrophic olivary degeneration (remote medullary change)' },
        desc: {
          zh: '齒狀核—紅核—下橄欖核組成 Guillain–Mollaret 三角。齒狀核（影響對側橄欖核）或紅核／中央被蓋徑（影響同側）受損後，下橄欖核失去抑制而肥大，約 1 個月開始、4–6 個月最明顯，可能出現軟顎顫抖。',
          en: 'Dentate nucleus, red nucleus and inferior olive form the Guillain–Mollaret triangle. After damage to the dentate (affects the opposite olive) or red nucleus / central tegmental tract (same side), the deafferented olive enlarges — starting ~1 month, most visible at 4–6 months — and palatal tremor may appear.',
        },
        regions: hod,
      });
    }
    // secondary thalamic degeneration after large cortical infarcts
    const cortexVol = BEDS.filter((b) => b.region.endsWith(`_${s}`) && REGION_BY_ID[b.region].category === 'cortex').reduce(
      (a, b) => a + (bedFinal[b.id] ?? 0) * b.volume,
      0,
    );
    if (cortexVol >= 30) {
      const thal = BEDS.filter((b) => /^thalamus_/.test(b.region) && b.region.endsWith(`_${s}`) && stillAlive(bedFinalUntreated[b.id]));
      thal.forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 1440, event: `thalamic_atrophy_${s}` }));
      events.push({
        id: `thalamic_atrophy_${s}`,
        kind: 'secondary',
        severity: 'info',
        onsetH: 1440,
        title: { zh: '同側視丘的續發性萎縮', en: 'Secondary ipsilateral thalamic atrophy' },
        desc: {
          zh: '視丘與皮質互相連結；大片皮質梗塞後，失去連結的視丘神經元逐漸凋亡，數月後同側視丘縮小，與認知功能下降有關。',
          en: 'The thalamus and cortex are reciprocally connected; after a large cortical infarct the disconnected thalamic neurons gradually die and the same-side thalamus shrinks over months, which is linked to cognitive decline.',
        },
        regions: [...new Set(thal.map((b) => b.region))],
      });
    }
  }

  // ── 8. subacute / chronic course ──────────────────────────────
  if (vol.total >= 1) {
    events.push({
      id: 'subacute_remodelling',
      kind: 'imaging',
      severity: 'info',
      onsetH: 168,
      endH: 720,
      title: { zh: '亞急性期：清除壞死組織', en: 'Subacute phase: clearing dead tissue' },
      desc: {
        zh: '巨噬細胞清除壞死組織，新生血管長入（CT 上梗塞在 2–3 週時可能暫時「變淡」，稱為起霧效應）。水腫消退後，許多功能障礙會部分改善。',
        en: 'Macrophages clear the necrotic tissue and new vessels grow in (on CT the infarct may transiently fade at 2–3 weeks — the "fogging effect"). As oedema settles many deficits partly improve.',
      },
      regions: infarctedRegions,
    });
    events.push({
      id: 'chronic_scar',
      kind: 'imaging',
      severity: 'info',
      onsetH: 720,
      title: { zh: '慢性期：腦軟化與膠質疤痕', en: 'Chronic phase: encephalomalacia & gliosis' },
      desc: {
        zh: '壞死組織被液化吸收，留下充滿腦脊髓液的空腔與膠質疤痕，鄰近腦室會被「拉」大。',
        en: 'The necrotic tissue liquefies and is resorbed, leaving a CSF-filled cavity and glial scar; the adjacent ventricle is pulled larger.',
      },
      regions: infarctedRegions,
    });
    events.push({
      id: 'depression_cognition',
      kind: 'complication',
      severity: 'info',
      onsetH: 720,
      title: { zh: '中風後憂鬱與認知障礙', en: 'Post-stroke depression & cognitive impairment' },
      // lesion site: Carson 2000 tested the hemisphere and left-anterior hypotheses only (C10-F10);
      // depressive symptoms and right amygdala / pallidum infarcts (Weaver NA et al. Biol
      // Psychiatry Cogn Neurosci Neuroimaging 2023;8:387-396, PMID 34547548); cognitive impairment
      // and left frontotemporal, left thalamic and right parietal infarcts in 2950 patients from 12
      // cohorts (Weaver NA et al. Lancet Neurol 2021;20:448-459, PMID 33901427) — in place of an
      // uncited list of "strategic" sites (C10-F9)
      desc: {
        zh: '任一時間點約三分之一的中風者有憂鬱（統合分析 31%），5 年內累積有 39–52% 出現過。系統性回顧沒有找到一致的左右半球或左額葉效應（Carson 2000）；一個大型病灶定位研究則發現右側杏仁核與蒼白球的梗塞與憂鬱症狀有關（Weaver 2023）。中風後第一年約一半有某種認知障礙；12 個世代、2950 人的病灶定位分析中，左側額顳葉、左側視丘與右側頂葉的梗塞關聯最強（Weaver 2021）。首次中風後一年內約 7% 出現失智，再次中風後超過三分之一，多發梗塞也會增加風險。這些是族群數字，「最終」頁有出處與相關因素。',
        en: 'At any time about a third of stroke survivors have depression (31 % in a meta-analysis) and 39–52 % have had it within 5 years. A systematic review found no consistent hemispheric or left-frontal effect (Carson 2000); one large lesion-mapping study links depressive symptoms to infarcts of the right amygdala and pallidum (Weaver 2023). About half have some cognitive impairment in the first year; in a lesion-mapping analysis of 2950 patients from 12 cohorts, infarcts of the left frontotemporal lobes, left thalamus and right parietal lobe were the most strongly associated with it (Weaver 2021). About 7 % develop dementia within a year of a first stroke, more than a third after a recurrent one, and multiple infarcts raise the risk. These are population figures — the Outcome tab lists their sources and the factors involved.',
      },
      regions: [],
    });
    events.push({
      id: 'recovery',
      kind: 'recovery',
      severity: 'good',
      onsetH: 168,
      endH: 4320,
      title: { zh: '神經可塑性與復原', en: 'Neuroplasticity & recovery' },
      desc: {
        zh: '周圍與對側的腦區會重新分工，大部分自發性恢復發生在前 3 個月，之後仍可透過密集復健緩慢進步。死掉的神經元不會再生，恢復靠的是「重新接線」。',
        en: 'Surrounding and opposite-side regions take over functions; most spontaneous recovery happens in the first 3 months, with slower gains from intensive rehabilitation afterwards. Dead neurons do not regrow — recovery is re-wiring.',
      },
      regions: [],
    });
  }

  // ── 8b. late consequences that follow their symptoms (C10-F1, F2, F3, F7) ───
  // shown exactly when the late symptom is (same regions, thresholds and onset), small brainstem
  // infarcts and lacunes included
  const bodySide = (r: Region, lat: 'ipsi' | 'contra'): Side => (lat === 'ipsi' ? (r.side as Side) : opp(r.side as Side));
  const spast = lateSources('spasticity');
  if (spast.length) {
    events.push({
      id: 'spasticity',
      kind: 'complication',
      severity: 'info',
      onsetH: symptomOnsetH(SYMPTOM_BY_ID.spasticity),
      title: { zh: '痙攣與攣縮', en: 'Spasticity & contractures' },
      // Sommerfeld 2004 (19 % at 3 months), Urban 2010 (42.6 % with a paresis at 6 months, 15.6 %
      // severe; severe paresis and hemihypesthesia predict it), Wissel 2010 (24.5 % within 2 weeks)
      desc: {
        zh: '上運動神經元受損後，脊髓反射失去抑制，數週到數月逐漸出現肌肉僵硬、手肘手腕屈曲、足下垂；復健與肉毒桿菌注射可改善。不是每個人都會：中風後 3 個月約 19%，有肢體無力的人 6 個月時約 43%（嚴重的約 16%）；早期無力嚴重或半身感覺減退時較常見，約四分之一在 2 週內就出現肌張力增加。',
        en: 'Loss of upper-motor-neuron control releases spinal reflexes: over weeks to months stiffness, a flexed elbow/wrist and foot drop develop; rehabilitation and botulinum toxin help. Not everyone gets it: about 19 % of people 3 months after a stroke, and about 43 % of those with a weak limb at 6 months (severe in about 16 %); it is commoner after severe early weakness or loss of sensation, and about a quarter show increased tone within 2 weeks.',
      },
      regions: spast.map((r) => r.id),
    });
  }
  const painBody = lateSources('central_pain');
  const painFace = lateSources('central_pain_face');
  if (painBody.length || painFace.length) {
    const zhSide = (s: Side) => (s === 'r' ? '右' : '左');
    const enSide = (s: Side) => (s === 'r' ? 'right' : 'left');
    const thal = painBody.filter((r) => r.baseId === 'thalamus_ventrolateral');
    const lmi = [...new Set([...painBody, ...painFace].filter((r) => r.baseId === 'medulla_lateral'))];
    const other = painBody.filter((r) => r.baseId !== 'thalamus_ventrolateral' && r.baseId !== 'medulla_lateral');
    const zh: string[] = ['感覺路徑受損後，原本麻木的地方可能出現燒灼、刺痛或一碰就痛的慢性疼痛。這是可能的後果，不是必然：所有中風合計一年內約 8%。'];
    const en: string[] = ['After sensory pathway damage, the numb area can develop burning, lancinating or touch-evoked chronic pain. It is possible, not certain: about 8 % of all strokes within a year.'];
    for (const r of thal) {
      const b = bodySide(r, 'contra');
      zh.push(`視丘中風後約七分之一、視丘膝狀體動脈區中風後約四分之一會出現，在身體的對側（這裡是身體的${zhSide(b)}側）；已發表的病例中右側視丘病灶較多（可能有報告偏差），約三分之一在第一週就開始。`);
      en.push(`After a thalamic stroke about 1 in 7 develop it (about 1 in 4 after the geniculothalamic territory), on the opposite side of the body — here the ${enSide(b)} side of the body; among published cases right-sided thalamic lesions are more frequent (possibly reporting bias), and about a third start in the first week.`);
    }
    for (const r of lmi) {
      const s0 = r.side as Side;
      zh.push(`延髓外側梗塞後約四分之一在 6 個月內出現，最常在病灶同側（這裡是${zhSide(s0)}側）的眼睛周圍，可以單獨出現，也可以合併對側（${zhSide(opp(s0))}側）手腳的疼痛。`);
      en.push(`After a lateral medullary infarct about 1 in 4 develop it within 6 months, most often around the eye on the side of the infarct (here the ${enSide(s0)}), alone or with pain in the opposite (${enSide(opp(s0))}) arm and leg.`);
    }
    for (const r of other) {
      const b = bodySide(r, 'contra');
      zh.push(`這個病灶的疼痛會在身體的對側（這裡是身體的${zhSide(b)}側）。`);
      en.push(`From this lesion it would affect the opposite side of the body — here the ${enSide(b)} side of the body.`);
    }
    zh.push('後島葉與頂葉島蓋內側的病灶也可能造成中樞性疼痛，但很少見（模型沒有把它列為症狀）。');
    en.push('Lesions of the posterior insula and inner parietal operculum can also cause central pain, rarely (not listed as a symptom by the model).');
    events.push({
      id: 'central_pain',
      kind: 'complication',
      severity: 'warn',
      onsetH: symptomOnsetH(SYMPTOM_BY_ID.central_pain),
      title: { zh: '可能出現的中樞性中風後疼痛', en: 'Possible central post-stroke pain' },
      desc: { zh: zh.join(''), en: en.join(' ') },
      regions: [...new Set([...painBody, ...painFace].map((r) => r.id))],
    });
  }
  // REM sleep behaviour disorder (C10-F7): 6 of 27 brainstem infarcts on a questionnaire at 3
  // months, 5 ventral pontine and 1 medullary, none tegmental (Tang WK et al. BMC Neurol 2014;14:88,
  // PMID 24758223); not confirmed on polysomnography in 15 brainstem strokes (Tellenbach N et al. J
  // Sleep Res 2023;32:e13640, PMID 35609965); lesion network mapping: the tract from the locus
  // coeruleus to the medulla (Odd H et al. Neuroimage Clin 2025;45:103751, PMID 39954565); case
  // reports describe pontine lesions (Kimura K et al. Neurology 2000;55:894-895; Xi Z, Luning W.
  // Sleep Med 2009;10:143-146). So any
  // pontine or medullary infarct, as a possibility from about 1 month (the study asked at 3 months)
  const rbd = REGIONS.filter((r) => /^(pons|medulla)_/.test(r.baseId) && finalLevel(r.id) >= 0.25 - 1e-6);
  if (rbd.length) {
    events.push({
      id: 'rbd',
      kind: 'complication',
      severity: 'info',
      onsetH: 720,
      title: { zh: '可能出現：快速動眼期睡眠行為障礙（夢境演出）', en: 'Possible REM sleep behaviour disorder (acting out dreams)' },
      desc: {
        zh: '做夢（快速動眼期）時，肌肉本該被一條從橋腦藍斑核一帶延伸到延髓的路徑關掉；這條路徑受損時，人可能在夢中說話、大叫、揮拳或踢腳，傷到自己或枕邊人。一項問卷研究中，腦幹梗塞的人 3 個月時約五分之一（27 人中 6 人）描述這種情形——5 人是橋腦腹側、1 人是延髓，橋腦被蓋部沒有；但一個小型的睡眠檢查（多項睡眠生理檢查）研究（15 位腦幹中風）沒有證實，反而看到快速動眼期的肌肉活動較少。病灶網路分析指向從藍斑核到延髓的路徑。這裡列出的是可能，不是預測。',
        en: 'During dreaming (REM) sleep the muscles are normally switched off by a pathway that runs from around the locus coeruleus in the pons down to the medulla; when it is damaged the person may talk, shout, punch or kick while dreaming and hurt themselves or a bed partner. In a questionnaire study about 1 in 5 people with a brainstem infarct (6 of 27) reported acting out dreams at 3 months — 5 with a ventral pontine and 1 with a medullary infarct, none in the pontine tegmentum; a small sleep-laboratory (polysomnography) study of 15 brainstem strokes did not confirm it, finding less muscle activity in REM sleep instead. Lesion-network mapping points to the tract from the locus coeruleus to the medulla. Listed as a possibility, not a prediction.',
      },
      regions: rbd.map((r) => r.id),
    });
  }

  // ── 9. flow redistribution notes ──────────────────────────────
  const rev = hemo.reversed;
  if (rev.some((v) => v.startsWith('va_'))) {
    events.push({
      id: 'steal',
      kind: 'mechanism',
      severity: 'warn',
      onsetH: 0,
      title: { zh: '血流反轉：竊血現象', en: 'Flow reversal: steal' },
      desc: {
        zh: '椎動脈血流倒流去供應手臂（鎖骨下竊血）：手臂用力時後循環血流被「偷走」，可能出現頭暈、視力模糊、走不穩。',
        en: 'Vertebral flow reverses to feed the arm (subclavian steal): exercising that arm "steals" posterior-circulation blood, causing dizziness, blurred vision or unsteadiness.',
      },
      regions: [],
    });
  }
  if (rev.some((v) => /^(acomm|pcomm_|aca_a1_|ophthalmic_)/.test(v))) {
    events.push({
      id: 'willis_compensation',
      kind: 'mechanism',
      severity: 'good',
      onsetH: 0,
      title: { zh: 'Willis 環側枝代償啟動', en: 'Circle of Willis collaterals switched on' },
      desc: {
        zh: '血液改走前交通、後交通動脈或經眼動脈逆流，從其他動脈「借血」給缺血區——這就是有些人頸動脈完全阻塞卻沒有症狀的原因。',
        en: 'Blood reroutes through the communicating arteries or backwards through the ophthalmic artery, borrowing from other trunks — why some people with a completely blocked carotid have no symptoms.',
      },
      regions: [],
    });
  }

  events.sort((a, b) => a.onsetH - b.onsetH);
  // tissue that dies later from herniation / compression of other arteries (permanent effects)
  let secondaryLoss = 0;
  for (const b of BEDS) {
    if (REGION_BY_ID[b.region].compartment === 'none') continue;
    if ((bedEffects[b.id] ?? []).some((e) => e.kind === 'secondary' && e.endH === undefined))
      secondaryLoss += (1 - (bedFinal[b.id] ?? 0)) * b.volume;
  }
  return {
    events,
    bedEffects,
    volumes: { ...vol, withSecondary: vol.total + secondaryLoss },
    savedVolume,
    hydrocephalusOnsetH,
    hydrocephalusEndH,
    midlineShift,
  };
}

export { baseOf, sideOf };
