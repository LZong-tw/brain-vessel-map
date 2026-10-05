/**
 * Downstream consequences of an infarct over time — including effects on brain regions
 * OUTSIDE the occluded artery's territory (mass effect, herniation, hydrocephalus,
 * diaschisis, Wallerian and trans-synaptic degeneration) and systemic complications.
 *
 * Rule thresholds are simplified from the literature:
 *   • malignant MCA infarction: DWI volume > 145 mL (Oppenheim et al., Stroke 2000);
 *     decompressive hemicraniectomy pooled analysis (Vahedi et al., Lancet Neurol 2007)
 *   • space-occupying cerebellar infarction (Wijdicks et al., AHA/ASA statement, Stroke 2014)
 *   • ischaemic cascade: energy failure, excitotoxicity, peri-infarct depolarisations,
 *     inflammation (Dirnagl, Iadecola & Moskowitz, Trends Neurosci 1999)
 *   • crossed cerebellar diaschisis (Pantano, Baron et al., Brain 1986)
 *   • Wallerian degeneration on MRI (Kuhn et al., Radiology 1989; Thomalla et al., NeuroImage 2004)
 *   • hypertrophic olivary degeneration (Goto & Kaneko 1981; Kitajima et al., Radiology 1994;
 *     Goyal et al., AJNR 2000)
 *   • locked-in syndrome and basilar coma (Bauer et al., J Neurol 1979; Laureys et al., Prog Brain
 *     Res 2005; Patterson & Grabois, Stroke 1986)
 *   • central hyperthermia as a risk after brainstem coma (Parvizi & Damasio, Brain 2003; Sung et
 *     al., Eur Neurol 2009)
 * TODO(medical-review): thresholds and timings are educational approximations.
 */

import { BEDS, REGION_BY_ID, VESSEL_BY_ID, vesselName } from '../anatomy';
import type { L, Side } from '../anatomy';
import { formatHours } from '../anatomy/timeline';
import type { HemoResult, Occlusion } from './hemodynamics';
import type { ReperfusionGrade, TreatmentMethod } from './treatment';

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
   * when blood returns to the index territory (hours after onset): treatment that reopened the
   * artery, or an occlusion reopening by itself; null or left out when it never does
   */
  flowReturnsH?: number | null;
  /**
   * how the treatment at reperfusionH went (engine/treatment.ts); left out for the default
   * treatment (complete, lasting reperfusion), which keeps the general event texts
   */
  treatment?: CascadeTreatment;
  /**
   * target regions of the lacunar (single-branch) occlusions; when nothing else is ischaemic the
   * course is told as a lacunar stroke
   */
  lacunes?: string[];
  /**
   * infarcted fraction per bed when treatment is decided: at reperfusionH, or 6 h after onset
   * without treatment (the large-core thrombectomy trials select on the core at that point)
   */
  bedAtDecision?: Record<string, number>;
  /** mean arterial pressure (mmHg); left out, no blood-pressure note */
  map?: number;
}

/** mean arterial pressure from which the high-blood-pressure note is shown (≈ 170/95 mmHg) */
export const HIGH_MAP = 120;

/**
 * when a palatal tremor may be listed after a clear trigger (h): weeks to months after the lesion
 * (Tilikete C, Desestret V. Front Neurol 2017;8:302; 1 and 3 months in Chang YY et al. Gaoxiong
 * Yi Xue Ke Xue Za Zhi 1993;9:371–376)
 */
const PALATAL_TREMOR_H = 2160;

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
  /** the branch lies outside the reopened artery's own tree (a new territory, e.g. the ACA for an M1) */
  embolusNewTerritory?: boolean;
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
      ? {
          // the window refers to drug start; recanalisation after alteplase accrues over 1–3 h
          // (INTERRSeCT: Menon BK et al. JAMA 2018;320:1017–1026; Seners P et al. Stroke 2016;47:2409–2412)
          zh: '（eTICI 是血管攝影的分級；只打靜脈血栓溶解時，這裡代表下游區域恢復灌流的比例。這個時間是血流恢復的時間：用藥後動脈通常在 1–3 小時內才逐漸打通，所以藥物大約早 1–3 小時就已開始）',
          en: ' (eTICI is graded on angiography; after IV thrombolysis alone it stands for how much of the territory is reperfused. This is when flow returns: after the drug the artery usually reopens gradually over 1–3 h, so the drug was started about 1–3 h earlier)',
        }
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
    // a fragment reaching a previously unaffected territory (most often the ACA during MCA
    // thrombectomy: Singh N et al. Stroke 2023;54:1477–1483; Beyeler M et al. J Neurointerv Surg 2022)
    if (t.embolusNewTerritory) {
      events.push({
        id: 'distal_embolus',
        kind: 'complication',
        severity: 'warn',
        onsetH: reperfusionH,
        title: { zh: `新區域栓塞：${zh}`, en: `Embolus to a new territory: ${en}` },
        desc: {
          zh: `治療時一小塊血栓碎片跑到原本沒有受影響的區域，塞住了${zh}。這是另一條動脈的供血區，原本的阻塞打通了，這裡卻出現新的缺血，側枝循環補不上的部分會梗塞。取栓研究中這類新區域栓塞約 5–9%（最常見於前大腦動脈區），多半在血管攝影上看不到阻塞，並與較差的預後與較高的死亡率有關。`,
          en: `During the treatment a fragment of the clot reached a previously unaffected territory and blocked the ${lowerFirst(en)}. This is another artery's territory: the original occlusion is open, but new ischaemia appears here, and what collaterals cannot make up for infarcts. In thrombectomy studies such new-territory emboli occur in about 5–9% (most often in the ACA territory); most show no visible occlusion on angiography, and they are associated with worse outcome and higher mortality.`,
        },
        regions: t.embolusRegions,
      });
      return;
    }
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
  /**
   * from when a palatal tremor may be listed (h), or null: only after a clear infarct of the
   * dentate nucleus, the red nucleus region or the pontine tegmentum (C3-F11)
   */
  palatalTremorFromH: number | null;
}

/**
 * Only the retina is ischaemic (an ophthalmic or central retinal artery embolus): the brain-stroke
 * story (brain DWI, thrombolysis windows for brain tissue) does not apply as such.
 * Retinal survival time: Hayreh SS et al. Exp Eye Res 2004;78:723–736 (no detectable damage after
 * 97 min, massive damage after about 240 min, in old hypertensive monkeys); Tobalem S et al. BMC
 * Ophthalmol 2018;18:101 (in people probably about 12–15 min of complete occlusion; the shorter
 * estimate is the one the model uses, see RETINA_TISSUE in tissueParams.ts).
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
      zh: '視網膜是中樞神經的一部分，由眼動脈分出的視網膜中央動脈單獨供應，沒有側枝。血流一中斷，數秒內那隻眼睛就看不見。若栓子在幾分鐘內被沖走，視力恢復，稱為「一過性黑矇」；若持續阻塞，視網膜內層會不可逆壞死，但多快並不確定：在年老、有動脈硬化與高血壓的猴子，完全阻塞 97 分鐘幾乎看不到損傷、約 4 小時則大範圍壞死；一篇回顧認為這些實驗有重要缺陷，人類完全阻塞約 12–15 分鐘後就可能開始梗塞，而許多阻塞並不完全，所以較晚治療仍偶有效果。模型採用較短的估計：完全阻塞約 12 分鐘後視網膜開始壞死；部分阻塞（程度 < 100%）撐得較久。這裡沒有腦組織缺血。',
      en: 'The retina is part of the central nervous system and is fed by the central retinal artery, a branch of the ophthalmic artery with no collaterals. When flow stops, that eye goes blind within seconds. If the embolus clears within minutes, vision returns (amaurosis fugax); if it stays, the inner retina dies irreversibly, but how fast is uncertain: in old, atherosclerotic, hypertensive monkeys 97 min of complete occlusion left practically no detectable damage and about 4 h massive damage, while a review argues that these experiments are flawed, that in people the inner retina probably starts to infarct after about 12–15 min of complete occlusion, and that many occlusions are incomplete, which is why later treatment sometimes still helps. The model follows the shorter estimate: the retina starts to die after about 12 min of complete occlusion; a partial occlusion (severity < 100%) lasts longer. No brain tissue is ischaemic here.',
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
 * Brain ischaemia that leaves no infarct: the flow came back in time (a TIA) or collaterals held.
 * Tissue-based definition of TIA: Easton JD et al. Stroke 2009;40:2276–2293. Short-term dual
 * antiplatelet therapy after a high-risk TIA or minor stroke: CHANCE (Wang Y et al. N Engl J Med
 * 2013;369:11–19) and POINT (Johnston SC et al. N Engl J Med 2018;379:215–225).
 */
function pushNoInfarctEvents(events: CascadeEvent[]): void {
  events.push(...noInfarctEvents(0, Infinity));
}

/**
 * The TIA story for brain ischaemia that began at `fromH` and left no infarct, cut off at `untilH`
 * (when a later occlusion starts a new episode). simulate() also tells it for a reopened phase
 * before the index event, such as the prodromal attack of a progressive basilar thrombosis (C3-F8).
 */
export function noInfarctEvents(fromH: number, untilH: number): CascadeEvent[] {
  const at = (h: number) => fromH + h;
  const until = (h: number) => Math.min(at(h), untilH);
  const events: CascadeEvent[] = [];
  events.push({
    id: 'ischemia_no_infarct',
    kind: 'mechanism',
    severity: 'warn',
    onsetH: at(0),
    endH: until(6),
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
    onsetH: at(0.1),
    endH: until(336),
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
    onsetH: at(0),
    endH: until(168),
    title: { zh: '症狀消失不代表沒事', en: 'Symptoms gone does not mean safe' },
    desc: {
      zh: 'TIA 後最初幾天發生真正中風的風險最高，應當天就醫、盡快完成腦與血管檢查。醫師通常會立即開始抗血小板藥物（高風險者短期併用兩種：CHANCE、POINT 試驗），並找出頸動脈狹窄、心房顫動等原因。反覆、越來越頻繁的發作（尤其後循環）可能是大血管即將完全阻塞的前兆。',
      en: 'The risk of a real stroke is highest in the first days after a TIA: seek care the same day and complete brain and vessel imaging promptly. Antiplatelet treatment is usually started at once (two drugs for a short time in high-risk cases: the CHANCE and POINT trials), and causes such as carotid stenosis or atrial fibrillation are sought. Repeated, increasingly frequent attacks (especially in the posterior circulation) can herald a complete large-vessel occlusion.',
    },
    regions: [],
  });
  return events;
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

/**
 * The occlusion sites each treatment-window story is for. The thrombectomy trials enrolled
 * intracranial ICA and M1 (anterior) or basilar occlusions; an isolated cervical ICA occlusion
 * and an intracranial vertebral (V4) occlusion were not randomised (Kargiotis O et al. Ther Adv
 * Neurol Disord 2022;15:17562864221136335; de Bastos Maximiano ML et al. Neuroradiol J
 * 2026;39:557–566).
 */
const ANTERIOR_LVO = ['ica_petrous_cavernous', 'ica_ophthalmic_seg', 'ica_terminal', 'mca_m1'];
const BASILAR = ['basilar_lower', 'basilar_mid', 'basilar_upper', 'basilar_tip'];
const VERTEBRAL_V4 = ['va_v4_prox', 'va_v4_dist'];

/** medium / distal vessel occlusions (MeVO) */
const MEVO = ['mca_m2_sup', 'mca_m2_inf', 'aca_a1', 'aca_a2', 'pca_p1', 'pca_p2'];

/** an anterior large-vessel core from which the large-core thrombectomy trials apply (mL) */
const LARGE_CORE_ML = 70;
/** above this the core is larger than most of those trials enrolled (mL) */
const BEYOND_TRIALS_ML = 100;

interface WindowStory {
  /** intracranial ICA or M1 occluded (with or without a cervical ICA occlusion: a tandem lesion) */
  anterior: boolean;
  basilar: boolean;
  /** the top of the basilar: the distal location of the ESO guideline */
  basilarTip: boolean;
  /** a cervical ICA occlusion without an intracranial anterior occlusion on its side */
  cervicalIsolated: boolean;
  /** an intracranial vertebral occlusion without a basilar occlusion */
  v4: boolean;
  /** a medium/distal vessel occlusion without an anterior or basilar large-vessel occlusion */
  mevo: boolean;
  /** largest supratentorial core of one side when treatment is decided (mL), if known */
  coreMl: number | null;
}

const IVT_INTRO: L = {
  // alteplase within 4.5 h (ECASS III); tenecteplase as an alternative (AcT; ESO 2023); beyond
  // 4.5 h only after imaging selection (WAKE-UP; EXTEND)
  zh: '靜脈血栓溶解（alteplase，或以 tenecteplase 替代）：標準是發作 4.5 小時內開始用藥；更晚或醒來才發現時，只在 MRI 或灌流影像篩選後使用（WAKE-UP、EXTEND 試驗）。',
  en: 'IV thrombolysis (alteplase, or tenecteplase as an alternative): standard when started within 4.5 h of onset; later, or on waking with symptoms, only after MRI or perfusion imaging selects the patient (WAKE-UP, EXTEND trials).',
};
const SAVER: L = {
  zh: '每延遲一分鐘，典型大血管中風約多死亡 190 萬個神經元（Saver 2006）。',
  en: 'Each minute of delay in a typical large-vessel stroke costs ~1.9 million neurons (Saver 2006).',
};

/** what fits this occlusion site: thrombolysis, thrombectomy and the trials behind them */
function treatmentWindowDesc(w: WindowStory): L {
  const zh: string[] = [IVT_INTRO.zh];
  const en: string[] = [IVT_INTRO.en];
  const core = w.coreMl === null ? null : Math.round(w.coreMl);
  if (w.anterior) {
    // TRACE-III: Xiong Y et al. N Engl J Med 2024;391:203–212
    zh.push(
      '這是大血管阻塞，適合動脈取栓：6 小時內效果最明確，影像顯示仍有可救組織時可延長到 24 小時。無法取栓時，TRACE-III 試驗（中國病人、ICA／MCA 阻塞且灌流影像有可救組織）中發作 4.5–24 小時用 tenecteplase 改善了預後。',
    );
    en.push(
      'This is a large-vessel occlusion suited to mechanical thrombectomy: clearest benefit within 6 h, extendable to 24 h when imaging shows salvageable tissue. Without access to thrombectomy, tenecteplase 4.5–24 h after onset improved outcome in TRACE-III (Chinese patients with ICA/MCA occlusion and salvageable tissue on perfusion imaging).',
    );
    // SELECT2, ANGEL-ASPECT, RESCUE-Japan LIMIT, TENSION, LASTE (sources.ts): selected by ASPECTS
    // 3–5, a core ≥ 50 mL (SELECT2) or 70–100 mL (ANGEL-ASPECT), or ASPECTS ≤ 5 of any size (LASTE)
    if (core !== null && core >= LARGE_CORE_ML) {
      zh.push(
        `大核心（決定治療時約 ${core} mL）：五項前循環大血管阻塞大核心隨機試驗（SELECT2、ANGEL-ASPECT、RESCUE-Japan LIMIT、TENSION、LASTE）中取栓仍改善功能，TENSION 與 LASTE 也降低死亡率（SELECT2 沒有）；任何顱內出血與血管併發症較多，症狀性出血在部分試驗較高（ANGEL-ASPECT 6.1% vs 2.7%、LASTE 9.6% vs 5.7%），其他試驗則沒有（SELECT2、TENSION）。` +
          (core > BEYOND_TRIALS_ML ? '這個核心比多數試驗的病人大（ASPECTS 3–5 或核心約 100 mL 以內；只有 LASTE 不設上限）。' : ''),
      );
      en.push(
        `Large core (about ${core} mL when treatment is decided): in five randomised trials of anterior large-vessel occlusion with a large core (SELECT2, ANGEL-ASPECT, RESCUE-Japan LIMIT, TENSION, LASTE) thrombectomy still improved function, with lower mortality in TENSION and LASTE (not in SELECT2); any intracranial haemorrhage and vascular complications were more frequent, and symptomatic haemorrhage was higher in some trials (ANGEL-ASPECT 6.1% vs 2.7%, LASTE 9.6% vs 5.7%) but not in others (SELECT2, TENSION).` +
          (core > BEYOND_TRIALS_ML ? ' This core is larger than in most of these trials (ASPECTS 3–5 or cores up to about 100 mL; only LASTE set no upper limit).' : ''),
      );
    }
  }
  if (w.basilar) {
    // ATTENTION (Tao C et al. 2022), BAOCHE (Jovin TG et al. 2022), ESO/ESMINT (Strbian D et al.
    // 2024), Lindsberg PJ & Mattle HP 2006
    zh.push(
      `基底動脈阻塞：ATTENTION 試驗中發作 12 小時內取栓、BAOCHE 試驗中 6–24 小時取栓都改善了預後；效益見於 NIHSS ≥ 10（ESO/ESMINT 2024 指引：低於 10 分沒有證據），遠端（頂端）阻塞的效果比近端或中段弱${w.basilarTip ? '，這裡正是遠端（頂端）阻塞' : ''}。` +
        '指引依專家共識（證據確定性非常低）建議靜脈血栓溶解可用到發作後 24 小時，並建議先打靜脈血栓溶解再取栓，而非直接取栓。' +
        '試驗中（多為 NIHSS ≥ 10 的中國病人；對照組 34% 與 21% 也打了靜脈血栓溶解）90 天死亡率：ATTENTION 取栓 37% vs 內科 55%，BAOCHE 31% vs 42%（差異未達統計顯著）。沒有再通時，只有約 2% 預後良好（Lindsberg 與 Mattle 2006，病例系列）。',
    );
    en.push(
      `Basilar-artery occlusion: in ATTENTION thrombectomy within 12 h of onset, and in BAOCHE thrombectomy 6–24 h after onset, improved outcome; the benefit was shown for NIHSS ≥ 10 (ESO/ESMINT 2024: no evidence below 10), and the effect was weaker for distal than for proximal or middle occlusions${w.basilarTip ? '; this is a distal (tip) occlusion' : ''}. ` +
        'The guideline suggests IV thrombolysis up to 24 h after onset, by expert consensus at very low certainty, and IV thrombolysis plus thrombectomy over direct thrombectomy. ' +
        'In the trials (mostly Chinese patients with NIHSS ≥ 10; IV thrombolysis in 34% and 21% of the control arms) 90-day mortality was 37% with thrombectomy vs 55% with medical care (ATTENTION) and 31% vs 42% (BAOCHE; not statistically significant). Without recanalisation only about 2% have a good outcome (Lindsberg & Mattle 2006, case series).',
    );
  }
  if (w.cervicalIsolated) {
    const large = core !== null && core >= LARGE_CORE_ML;
    zh.push(
      '單純頸部內頸動脈阻塞（同側沒有顱內阻塞）：取栓隨機試驗大多排除這類病人，沒有經過驗證；觀察性研究統合分析中血管內治療沒有明顯優於內科治療（調整後 OR 1.22，95% CI 0.82–1.82），因此是個別決定（例如嚴重缺損持續時）。若合併顱內阻塞（串聯病灶），則適用大血管阻塞試驗。' +
        (large ? `已形成的大核心（約 ${core} mL）讓任何效益更不確定。` : ''),
    );
    en.push(
      'Isolated cervical ICA occlusion (no intracranial occlusion on this side): not tested in the randomised thrombectomy trials, which largely excluded it; in an observational meta-analysis endovascular treatment was not clearly better than medical treatment (adjusted OR 1.22, 95% CI 0.82–1.82), so it is an individual decision (e.g. for persisting severe deficits). With a tandem lesion (cervical ICA plus an intracranial occlusion) the large-vessel trials apply.' +
        (large ? ` With a large established core (about ${core} mL) any benefit is even less certain.` : ''),
    );
  }
  if (w.v4) {
    zh.push('顱內椎動脈（V4）阻塞：沒有隨機試驗測試過這裡的取栓；主要在血栓延伸進基底動脈時才考慮。');
    en.push('Intracranial vertebral artery (V4) occlusion: no randomised trial has tested thrombectomy here; it is mainly considered when the clot extends into the basilar artery.');
  }
  if (w.mevo) {
    // ESCAPE-MeVO (Goyal M et al. 2025), DISTAL (Psychogios M et al. 2025)
    zh.push(
      '這是中型／遠端血管阻塞：靜脈血栓溶解是標準治療。2025 年 ESCAPE-MeVO 與 DISTAL 試驗中常規取栓沒有改善預後，症狀性出血較多（5.4% vs 2.2%；5.9% vs 2.6%），ESCAPE-MeVO 的死亡率也較高（13.3% vs 8.4%）；近端、優勢側的 M2（DISTAL 未納入）仍不確定，個別考慮。',
    );
    en.push(
      'This is a medium/distal vessel occlusion: IV thrombolysis is standard. Routine thrombectomy did not improve outcome in the 2025 ESCAPE-MeVO and DISTAL trials, with more symptomatic haemorrhage (5.4% vs 2.2%; 5.9% vs 2.6%) and higher mortality in ESCAPE-MeVO (13.3% vs 8.4%); a proximal, dominant M2 (excluded from DISTAL) remains uncertain and is considered case by case.',
    );
  }
  if (!w.anterior && !w.basilar && !w.cervicalIsolated && !w.v4 && !w.mevo) {
    zh.push('此處不是大血管阻塞，一般不做取栓。');
    en.push('This is not a large-vessel occlusion; thrombectomy is not usually done.');
  }
  zh.push(SAVER.zh);
  en.push(SAVER.en);
  return { zh: zh.join(''), en: en.join(' ') };
}

/**
 * A lacunar (single-perforator) occlusion: IV thrombolysis applies as in other ischaemic strokes
 * (Barow E et al. JAMA Neurol 2019;76:641–649, post hoc WAKE-UP: 59% vs 46%, aOR 1.67,
 * 0.77–3.64); the model does not reopen lacunar occlusions (engine/schedule.ts isTreatable).
 */
const LACUNAR_WINDOW: L = {
  zh: '小血管（腔隙性）阻塞：和其他缺血性中風一樣，發作 4.5 小時內開始的靜脈血栓溶解適用；WAKE-UP 試驗的事後分析中，alteplase 對腔隙性梗塞的效果與其他中風沒有差別（無失能 59% vs 46%，信賴區間跨過 1）。單一穿通支阻塞不做取栓。模型沒有模擬血栓溶解打通腔隙性阻塞。',
  en: 'Small-vessel (lacunar) occlusion: IV thrombolysis started within 4.5 h of onset applies as in other ischaemic strokes; in a post hoc analysis of the WAKE-UP trial the effect of alteplase did not differ for lacunar infarcts (no disability 59% vs 46%, confidence interval crossing 1), and thrombectomy does not apply to a single perforator. The model does not simulate thrombolysis reopening a lacunar occlusion.',
};

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
  const anyIschemia = Object.values(regionAcute).some((x) => x >= 0.05);
  // lacunar (single-branch) occlusions do not enter regionAcute; alone they get their own story
  const lacunarOnly = !anyIschemia && (input.lacunes?.length ?? 0) > 0;
  const occluded = input.occlusions.filter((o) => o.severity >= 1);
  const occludedBases = new Set(occluded.map((o) => baseOf(o.vessel)));
  const anteriorSides = new Set(occluded.filter((o) => ANTERIOR_LVO.includes(baseOf(o.vessel))).map((o) => sideOf(o.vessel)));
  const basilar = BASILAR.some((b) => occludedBases.has(b));
  const anterior = anteriorSides.size > 0;
  const decisionSupra: Record<Side, number> = { r: 0, l: 0 };
  if (input.bedAtDecision)
    for (const b of BEDS) {
      const reg = REGION_BY_ID[b.region];
      if (reg.compartment === 'supra') decisionSupra[reg.side === 'm' ? 'r' : reg.side] += (input.bedAtDecision[b.id] ?? 0) * b.volume;
    }
  const story: WindowStory = {
    anterior,
    basilar,
    basilarTip: occludedBases.has('basilar_tip'),
    cervicalIsolated: occluded.some((o) => baseOf(o.vessel) === 'ica_cervical' && !anteriorSides.has(sideOf(o.vessel))),
    v4: !basilar && VERTEBRAL_V4.some((b) => occludedBases.has(b)),
    mevo: !anterior && !basilar && MEVO.some((b) => occludedBases.has(b)),
    coreMl: input.bedAtDecision ? Math.max(decisionSupra.r, decisionSupra.l) : null,
  };

  // ── 1–2. hyperacute mechanisms, imaging and treatment windows ──────
  // which story fits: only the retina is ischaemic (eye stroke), brain ischaemia that leaves no
  // infarct (a TIA, or tissue held by collaterals), or a brain infarct
  const ischaemicRegions = Object.keys(regionAcute).filter((rid) => regionAcute[rid] >= 0.05);
  const eyeOnly = anyIschemia && ischaemicRegions.every((rid) => REGION_BY_ID[rid]?.category === 'eye');
  const noInfarct = anyIschemia && !eyeOnly && vol.total < 0.05;
  if (eyeOnly) pushEyeEvents(events);
  else if (noInfarct) pushNoInfarctEvents(events);
  else if (anyIschemia || lacunarOnly) {
    // energy failure → excitotoxicity → calcium, free radicals, inflammation
    // (Dirnagl, Iadecola & Moskowitz, Trends Neurosci 1999)
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
      regions: lacunarOnly ? [...input.lacunes!] : infarctedRegions,
    });
    events.push({
      id: 'imaging_dwi',
      kind: 'imaging',
      severity: 'info',
      onsetH: 0.1,
      endH: 336,
      title: { zh: '影像：MRI 擴散加權在數分鐘內就看得到', en: 'Imaging: diffusion MRI positive within minutes' },
      desc: lacunarOnly
        ? {
            zh: 'DWI 很早就能顯示小小的腔隙性梗塞（直徑約 1.5 公分以下）；CT 常看不出來（腦幹尤其如此），但能先排除腦出血——這是血栓溶解治療前必做的檢查。',
            en: 'DWI shows the small lacunar infarct (under about 1.5 cm across) early; CT is often normal (especially in the brainstem) but excludes haemorrhage, which is required before thrombolysis.',
          }
        : {
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
      desc: lacunarOnly ? LACUNAR_WINDOW : treatmentWindowDesc(story),
      regions: [],
    });
  }

  const treatment = input.treatment;
  if (reperfusionH !== null && anyIschemia && !eyeOnly && input.occlusions.some((o) => o.severity >= 1) && treatment) {
    events.push(reperfusionEvent(treatment, reperfusionH, savedVolume));
    pushTreatmentComplications(events, treatment, reperfusionH);
  } else if (reperfusionH !== null && anyIschemia && !eyeOnly && input.occlusions.some((o) => o.severity >= 1)) {
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
  let palatalTremorFromH: number | null = null;
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
    // A thrombolytic drug (IV thrombolysis alone, or before thrombectomy) raises the bleeding
    // risk. Against no thrombolytic the rise is several-fold (NINDS 1995: 6.4% vs 0.6% within
    // 36 h; ECASS III 2008: 2.4% vs 0.2%); against direct thrombectomy, IV thrombolysis first adds
    // little (SWIFT DIRECT 2022: 3.5% vs 2.5%). Conservatively, the drug lowers the infarct-volume
    // thresholds of the risk steps by a quarter: an infarct near a threshold moves up by one step,
    // never more, and one under 22.5 mL does not move at all.
    // Published rates are shown next to the treatment options (anatomy/recanalisation.ts). An
    // attempt that reopened nothing (eTICI 0) brings no blood back into dead tissue, so late or
    // large reperfusion adds nothing then.
    // Timing: bleeding after a thrombolytic comes early, at a median of 470 min after the drug is
    // started (Yaghi S et al. JAMA Neurol 2015;72:1451–1457), and the trial rates are counted in
    // the first 24–36 h, so with a lytic the window starts at the treatment (reperfusionH stands
    // in for the drug start) and peaks within hours. Without a lytic, haemorrhagic transformation
    // follows the 1–7 day course. Only a parenchymal haematoma type 2 clearly changes the course
    // (Fiorelli M et al. Stroke 1999;30:2280–2284), so the event carries no symptom: a risk is not
    // an occurrence.
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
    const drugH = reperfusionH ?? 0;
    const methodZh =
      treatment?.method === 'ivt'
        ? '這次只用了靜脈血栓溶解：和沒有用血栓溶解劑相比，症狀性出血多了數倍（NINDS 6.4% vs 0.6%；ECASS III 2.4% vs 0.2%）。'
        : treatment?.method === 'bridging'
          ? '這次在取栓前先打了靜脈血栓溶解：和直接取栓相比差距不大（SWIFT DIRECT 3.5% vs 2.5%）。'
          : '';
    const methodEn =
      treatment?.method === 'ivt'
        ? ' IV thrombolysis alone was given: compared with no thrombolytic it raises symptomatic haemorrhage several-fold (NINDS 6.4% vs 0.6%; ECASS III 2.4% vs 0.2%).'
        : treatment?.method === 'bridging'
          ? ' IV thrombolysis was given before thrombectomy: compared with direct thrombectomy the difference is small (SWIFT DIRECT 3.5% vs 2.5%).'
          : '';
    events.push({
      id: 'hemorrhagic_transformation',
      kind: 'complication',
      severity: level === 2 ? 'danger' : 'warn',
      onsetH: lytic ? drugH : 24,
      peakH: lytic ? drugH + 8 : 72,
      endH: 336,
      title: { zh: `出血轉化風險：${lv.zh}`, en: `Haemorrhagic transformation risk: ${lv.en}` },
      desc: {
        zh:
          `壞死組織裡受損的小血管在血流恢復後可能滲血，多發生在 1–7 天內（用了血栓溶解劑會更早）。梗塞越大、再通越晚、使用血栓溶解劑，風險越高。大多沒有症狀（ECASS III 任何顱內出血 27.0% vs 安慰劑 17.6%）；只有第 2 型實質血腫明顯改變病程（ECASS I：早期惡化 OR 32.3、3 個月死亡 OR 18.0）。` +
          `靜脈血栓溶解後的症狀性出血約 2–7%，是在最初 24–36 小時內計算的（Cochrane 定義算到 7 天）。` +
          (lytic
            ? `${methodZh}血栓溶解後的症狀性出血來得早：從開始用藥算起中位數約 8 小時，症狀性出血的病人約一半死亡。模型把這段風險從治療時開始算，風險等級最多調高一級。`
            : ''),
        en:
          'Damaged small vessels inside dead tissue may bleed once flow returns, usually within 1–7 days (earlier after a thrombolytic). Larger infarcts, late recanalisation and thrombolytics raise the risk. Most of it causes no symptoms (any intracranial haemorrhage in ECASS III: 27.0% vs 17.6% with placebo); only a parenchymal haematoma type 2 clearly changes the course (ECASS I: odds ratio 32.3 for early deterioration, 18.0 for death at 3 months). ' +
          'Symptomatic haemorrhage after IV thrombolysis is roughly 2–7%, counted in the first 24–36 h (up to 7 days with the Cochrane definition).' +
          (lytic
            ? `${methodEn} Symptomatic bleeding after a thrombolytic comes early, at a median of about 8 h after the drug is started, and about half of the patients with a symptomatic bleed die. The model starts this risk at the treatment and raises its level by one step at most.`
            : ''),
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
  // the arousal network of the upper pontine and paramedian midbrain tegmentum (coma when both
  // sides fail: Parvizi J, Damasio AR. Brain 2003;126:1524–1536)
  const PONS_TEG_ROSTRAL: [string, string][] = [['pons_rostral_tegmentum_r', 'pons_rostral_tegmentum_l']];
  const MIDBRAIN_PARAMEDIAN: [string, string][] = [['midbrain_paramedian_r', 'midbrain_paramedian_l']];
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
  // the tegmentum (arousal) fails on both sides as well: coma, not locked-in (C3-F1)
  const tegmentalComa = bilateral(acute, PONS_TEG_ROSTRAL) || bilateral(acute, MIDBRAIN_PARAMEDIAN);
  // locked-in once the ventral pons is infarcted on both sides; with less, an incomplete picture
  const classicalRisk = bilateral((r) => infarcted(r, 0.4), PONS_BASIS);
  // Locked-in syndrome: Bauer G et al. J Neurol 1979;221:77–91 (classical, incomplete, total);
  // comatose first: Laureys S et al. Prog Brain Res 2005;150:495–511; prognosis and care: Patterson
  // JR, Grabois M. Stroke 1986;17:758–764 (139 cases, mortality 60 %, lung care and a communication
  // system); Casanova E et al. Arch Phys Med Rehabil 2003;84:862–867 (14 selected patients).
  const LIS_CARE: L = {
    zh: '早年 139 例文獻回顧的死亡率約 60%：要積極照護呼吸與肺部（吸入、肺炎），並及早建立溝通方式（眨眼或眼動字母表、眼控電腦）。恢復差異很大：一個早期密集復健的小型選擇性系列（14 人）中，42% 恢復吞嚥、28% 恢復說話；病情穩定後可存活數十年。',
    en: ' Mortality was about 60% in an early review of 139 cases: breathing and lung care (aspiration, pneumonia) and an early communication system (an eye-coded or blink alphabet, eye-controlled computers) are essential. Recovery varies widely: in a small selected series of 14 patients after early intensive rehabilitation 42% regained swallowing and 28% speech; once medically stable, people can live for decades.',
  };
  if (lockedIn && tegmentalComa) {
    const until = transientUntil(PONS_BASIS);
    const note = clears(until);
    events.push({
      id: 'basilar_coma',
      kind: 'secondary',
      severity: 'danger',
      onsetH: 0,
      ...(until !== undefined ? { endH: until } : {}),
      title: { zh: '雙側橋腦腹側與被蓋受損：昏迷合併四肢癱瘓', en: 'Bilateral ventral pons and tegmentum: coma with quadriplegia' },
      desc: {
        zh: `四肢與臉部癱瘓，維持清醒的被蓋網狀結構也兩側受損：病人現在昏迷，不是閉鎖症候群，常需要呼吸器。這類病人常昏迷數天到數週後才逐漸醒來：有些人醒來是閉鎖的（清醒但不能動，只能用垂直眼動與眨眼溝通），有些人停在意識障礙（無反應覺醒或最小意識狀態），兩者外觀相近、容易誤判。${LIS_CARE.zh}${note.zh}`,
        en: `Limbs and face are paralysed and the arousal network of the tegmentum has failed on both sides as well: the person is comatose now, not locked-in, and often needs ventilation. Such patients often stay comatose for days to weeks and then gradually wake: some wake up locked-in (aware but unable to move, communicating by vertical eye movements and blinking), others remain in a disorder of consciousness (unresponsive wakefulness or a minimally conscious state); the two look alike and are easily confused.${LIS_CARE.en}${note.en}`,
      },
      regions: [...PONS_BASIS, ...PONS_TEG_ROSTRAL, ...MIDBRAIN_PARAMEDIAN].flat().filter((r) => acute(r)),
    });
  } else if (lockedIn) {
    const until = transientUntil(PONS_BASIS);
    const note = clears(until);
    const partial = until === undefined && !classicalRisk;
    events.push({
      id: 'locked_in',
      kind: 'secondary',
      severity: 'danger',
      onsetH: 0,
      ...(until !== undefined ? { endH: until } : {}),
      // reopened in time: a passing risk; infarcted on both sides: locked-in; less: incomplete
      title:
        until !== undefined
          ? { zh: '雙側橋腦腹側受損：閉鎖症候群風險', en: 'Bilateral ventral pons: risk of locked-in syndrome' }
          : classicalRisk
            ? { zh: '雙側橋腦腹側受損：閉鎖症候群', en: 'Bilateral ventral pons: locked-in syndrome' }
            : { zh: '雙側橋腦腹側部分受損：不完全閉鎖（雙側橋腦症候群）', en: 'Bilateral ventral pons, partly: incomplete locked-in (bilateral pontine syndrome)' },
      desc: {
        zh: `${partial ? '兩側都受損但不完全：' : '一開始常是'}四肢與臉部${partial ? '嚴重' : '完全'}癱瘓、無法說話吞嚥，但意識清楚，用垂直眼動與眨眼溝通（控制垂直眼動的中腦未受損）。還能有其他動作時稱為「不完全」閉鎖；典型閉鎖症候群在數週到數月後恢復部分動作時也會變成不完全。${LIS_CARE.zh}${note.zh}`,
        en: `${partial ? 'Both sides, but not completely: severe' : 'Often at first total'} paralysis of limbs and face with no speech or swallowing, yet conscious — communication by vertical eye movements and blinking (the midbrain gaze centres are spared). With any other movement left it is incomplete locked-in syndrome; classical locked-in syndrome becomes incomplete when some movement returns over weeks to months.${LIS_CARE.en}${note.en}`,
      },
      regions: PONS_BASIS.flat().filter((r) => acute(r)),
    });
  }
  // Central hyperthermia (S2, C3-F9): of 9 brainstem-coma patients, 4 developed hyperthermia and
  // died without infection, the lesions centred on the core of the pontine tegmentum (Parvizi J,
  // Damasio AR. Brain 2003;126:1524–1536; the stroke type is not given in the abstract); ischaemic
  // case reports after bilateral paramedian midbrain–thalamic infarction (Alemdar M. J Stroke
  // Cerebrovasc Dis 2012;21:907.e13–907.e15: 39.3 °C, no infection) and after basilar occlusion
  // (Huang YS et al. Acta Neurol Taiwan 2009;18:118–122: "not uncommon in severe brainstem stroke",
  // poor prognosis); of 74 patients with central hyperthermia in the first 24 h only 4 % had a large
  // cortical infarct and 3 % a basilar occlusion, the rest haemorrhages, all with brainstem
  // involvement; most peaked within 24 h and nearly 70 % died within a month (Sung CY et al. Eur
  // Neurol 2009;62:86–92). A risk, not a symptom: fever after a stroke is mostly infection (Grau AJ
  // et al. J Neurol Sci 1999;171:115–120).
  const extensive = (r: string) => infarcted(r, 0.5);
  const hyperthermiaRisk = tegmentalComa && (bilateral(extensive, PONS_TEG_ROSTRAL) || bilateral(extensive, MIDBRAIN_PARAMEDIAN));
  if (hyperthermiaRisk) {
    events.push({
      id: 'central_hyperthermia',
      kind: 'complication',
      severity: 'warn',
      onsetH: 0,
      peakH: 24,
      endH: 336,
      title: { zh: '中樞性高熱的風險（腦幹被蓋兩側受損）', en: 'Risk of central hyperthermia (brainstem tegmentum on both sides)' },
      desc: {
        zh: '上橋腦（或中腦—視丘旁正中）被蓋兩側大範圍受損又昏迷時，體溫調節可能失控：發病頭一天內體溫急升到 39 °C 以上、劇烈起伏，退燒藥可能無效。缺血性中風後這很少見（74 位中樞性高熱病人中只有 4% 是大範圍皮質梗塞、3% 是基底動脈阻塞，其餘是出血），而且是排除診斷：中風後發燒要先找感染（肺炎、尿路感染），找過都沒有才考慮中樞性。預後很差：一項腦幹昏迷研究的 9 位中有 4 位出現高熱、在沒有感染下死亡；另一個系列近 70% 在一個月內死亡。',
        en: 'When the upper pontine (or paramedian midbrain–thalamic) tegmentum is extensively damaged on both sides and the person is comatose, temperature control can fail: within the first day the temperature shoots above 39 °C and swings widely, and antipyretics may not help. This is rare after an ischaemic stroke (of 74 patients with central hyperthermia only 4% had a large cortical infarct and 3% a basilar occlusion, the rest haemorrhages), and it is a diagnosis of exclusion: fever after a stroke means looking for infection first (pneumonia, urinary tract), and only when none is found is a central cause considered. The prognosis is poor: in a study of brainstem coma 4 of 9 patients developed hyperthermia and died without infection; in another series nearly 70% died within a month.',
      },
      regions: [...PONS_TEG_ROSTRAL, ...MIDBRAIN_PARAMEDIAN].flat().filter((r) => extensive(r)),
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

  // ── 6. systemic complications ──────────────────────────────────
  const dysphagiaRisk =
    acute('medulla_lateral_r') ||
    acute('medulla_lateral_l') ||
    (acute('ic_genu_r') && acute('ic_genu_l')) ||
    vol.supra.r + vol.supra.l > 60 ||
    lockedIn;
  if (dysphagiaRisk) {
    events.push({
      id: 'aspiration',
      kind: 'complication',
      severity: 'warn',
      onsetH: 24,
      endH: 336,
      title: { zh: '吞嚥困難 → 吸入性肺炎', en: 'Dysphagia → aspiration pneumonia' },
      // fever early after an ischaemic stroke is mostly infection or aspiration (Grau AJ et al.,
      // J Neurol Sci 1999;171:115–120); central fever is described mostly with haemorrhage and
      // brainstem involvement (Sung CY et al., Eur Neurol 2009;62:86–92), so it is shown only as a
      // risk after extensive bilateral tegmental infarction with coma ('central_hyperthermia'
      // above; see the temperature section of anatomy/symptoms.ts)
      desc: {
        zh: '中風後最常見的致死併發症之一。進食前需做吞嚥篩檢，必要時暫時以鼻胃管餵食。中風後發燒要先找感染（肺炎、尿路感染）；腦部本身引起的「中樞性發燒」在缺血性中風很少見（主要是兩側腦幹被蓋大範圍受損又昏迷時，見「中樞性高熱的風險」），只有排除感染後才考慮。',
        en: 'One of the commonest fatal complications after stroke. A swallow screen is needed before eating; temporary tube feeding may be required. Fever after a stroke means looking for infection first (pneumonia, urinary tract); fever caused by the brain injury itself ("central fever") is rare after an ischaemic stroke (mainly with extensive bilateral damage to the brainstem tegmentum and coma: see "Risk of central hyperthermia") and is considered only once infection has been ruled out.',
      },
      regions: [],
    });
  }
  const insulaR = acute('insula_r', 0.3);
  if (insulaR || acute('insula_l', 0.5)) {
    events.push({
      id: 'cardiac',
      kind: 'complication',
      severity: 'warn',
      onsetH: 0,
      endH: 168,
      title: { zh: '島葉中風 → 心律不整／心肌受損', en: 'Insular stroke → arrhythmia / cardiac injury' },
      desc: {
        zh: '島葉（尤其右側）調節心臟自主神經，受損後可出現心律不整、QT 延長、心肌酵素上升，甚至猝死——「腦」影響到「心」。',
        en: 'The insula (especially the right) regulates cardiac autonomic tone; damage can cause arrhythmias, QT prolongation, troponin rise or even sudden death — the brain affecting the heart.',
      },
      regions: ['insula_r', 'insula_l'].filter((r) => acute(r, 0.3)),
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
      desc: {
        zh: '皮質受損的疤痕可能成為異常放電來源：早發性（1 週內）或晚發性（數月後，較容易變成慢性癲癇）。',
        en: 'Scarred cortex can become a seizure focus: early (within a week) or late (months later, more likely to become chronic epilepsy).',
      },
      regions: infarctedRegions.filter((r) => REGION_BY_ID[r]?.category === 'cortex'),
    });
  }

  // ── 7. remote effects: diaschisis & degeneration ──────────────
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
        // shrinkage of the brainstem over several years (Kuhn MJ et al. Radiology 1989;172:179–182)
        events.push({
          id: `wallerian_${s}`,
          kind: 'secondary',
          severity: 'info',
          onsetH: 336,
          title: { zh: '皮質脊髓徑的沃勒氏退化', en: 'Wallerian degeneration of the corticospinal tract' },
          desc: {
            zh: '運動神經元的細胞本體或纖維被切斷後，下游的軸突會一路往下退化：大腦腳 → 橋腦 → 延髓錐體（在延髓下端交叉到對側脊髓）。擴散張量影像約 1–2 週可見，傳統 MRI 約 4 週後出現訊號變化，腦幹在數年間逐漸萎縮。',
            en: 'Once motor neurons or their fibres are cut, the axons below degenerate all the way down: peduncle → pons → medullary pyramid (crossing to the opposite spinal cord at the bottom of the medulla). Diffusion-tensor imaging shows it after ~1–2 weeks, conventional MRI after ~4 weeks, and the brainstem shrinks over years.',
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
    // a palatal tremor is listed (as possible) only after a clear infarct of a trigger: the dentate
    // nucleus, the red nucleus region or the central tegmental tract in the pontine tegmentum
    const clearTrigger = ['dentate', 'midbrain_paramedian', 'pons_rostral_tegmentum', 'pons_caudal_tegmentum'].some((b) =>
      infarcted(`${b}_${s}`, 0.5),
    );
    if (hod.length && clearTrigger) palatalTremorFromH = PALATAL_TREMOR_H;
    if (hod.length) {
      hod.forEach((rid) =>
        BEDS.filter((b) => b.region === rid).forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 720, event: `hod_${s}` })),
      );
      // how often: unknown (Schaller-Paule MA et al. Front Neurol 2021;12:675123); 38–67 % of 15
      // patients on MRI, by sequence and rater (Steidl E et al. Front Neurol 2022;13:950191). MRI
      // course: T2 signal from 1 month for years, enlargement from 6 months resolving by 3–4 years
      // (Goyal M et al. AJNR Am J Neuroradiol 2000;21:1073–1077; Kitajima et al. 1994: T2 from
      // 3 weeks, enlargement at 5–15 months). Palatal or oculopalatal tremor weeks to months later,
      // more often after haemorrhage (Tilikete C, Desestret V. Front Neurol 2017;8:302).
      events.push({
        id: `hod_${s}`,
        kind: 'secondary',
        severity: 'warn',
        onsetH: 720,
        peakH: 4320,
        title: { zh: '下橄欖核肥大性退化可能發生（遠隔的延髓變化）', en: 'Hypertrophic olivary degeneration may develop (remote medullary change)' },
        desc: {
          zh: '齒狀核—紅核—下橄欖核組成 Guillain–Mollaret 三角。齒狀核（影響對側橄欖核）或紅核／中央被蓋徑（影響同側）受損後，下橄欖核可能失去抑制而退化肥大——多少人會發生並不清楚：一個 15 人的前瞻性 MRI 研究依序列與判讀者不同，在 38–67% 看到它。MRI 上約 1 個月出現 T2 高訊號（持續數年），約 6 個月開始變大，3–4 年內消退，之後萎縮。少數人在數週到數月後出現軟顎顫抖（出血後比梗塞後常見）。',
          en: 'Dentate nucleus, red nucleus and inferior olive form the Guillain–Mollaret triangle. After damage to the dentate (affects the opposite olive) or red nucleus / central tegmental tract (same side), the deafferented olive may degenerate and enlarge — how often is not known: a prospective MRI study of 15 patients saw it in 38–67%, depending on sequence and rater. On MRI the T2 signal rises from about 1 month (and stays for years), the olive enlarges from about 6 months and this resolves by 3–4 years, followed by shrinkage. A minority develop a palatal tremor weeks to months later (more often after haemorrhage than infarction).',
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
    const motor = MOTOR_SUPRA.concat(['midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis', 'medulla_medial']).some(
      (b) => infarcted(`${b}_r`) || infarcted(`${b}_l`),
    );
    if (motor) {
      events.push({
        id: 'spasticity',
        kind: 'complication',
        severity: 'info',
        onsetH: 336,
        endH: 4320,
        title: { zh: '痙攣與攣縮', en: 'Spasticity & contractures' },
        desc: {
          zh: '上運動神經元受損後，脊髓反射失去抑制，數週到數月逐漸出現肌肉僵硬、手肘手腕屈曲、足下垂；復健與肉毒桿菌注射可改善。',
          en: 'Loss of upper-motor-neuron control releases spinal reflexes: over weeks to months stiffness, a flexed elbow/wrist and foot drop develop; rehabilitation and botulinum toxin help.',
        },
        regions: [],
      });
    }
    const sensoryPain = ['thalamus_ventrolateral', 'medulla_lateral', 'midbrain_lateral', 'pons_rostral_lateral'].some(
      (b) => infarcted(`${b}_r`) || infarcted(`${b}_l`),
    );
    if (sensoryPain) {
      events.push({
        id: 'central_pain',
        kind: 'complication',
        severity: 'warn',
        onsetH: 720,
        title: { zh: '中樞性中風後疼痛', en: 'Central post-stroke pain' },
        desc: {
          zh: '感覺路徑受損數週至數月後，原本麻木的區域反而出現燒灼、刺痛或觸摸誘發的劇痛（視丘痛 Dejerine–Roussy；延髓外側中風也常見）。',
          en: 'Weeks to months after sensory-pathway damage, the numb area can develop burning, lancinating or touch-evoked pain (Dejerine–Roussy thalamic pain; also common after lateral medullary stroke).',
        },
        regions: [],
      });
    }
    events.push({
      id: 'depression_cognition',
      kind: 'complication',
      severity: 'info',
      onsetH: 720,
      title: { zh: '中風後憂鬱與認知障礙', en: 'Post-stroke depression & cognitive impairment' },
      desc: {
        zh: '任一時間點約三分之一的中風者有憂鬱（統合分析 31%），5 年內累積有 39–52% 出現過，與病灶位置沒有一致的關聯。首次中風後一年內約 7% 出現失智，再次中風後超過三分之一；關鍵位置（視丘、角迴、海馬迴、額葉）或多次梗塞會增加血管性認知障礙的風險。這些是族群數字，「最終」頁有出處與相關因素。',
        en: 'At any time about a third of stroke survivors have depression (31 % in a meta-analysis) and 39–52 % have had it within 5 years, with no consistent link to the lesion site. About 7 % develop dementia within a year of a first stroke, more than a third after a recurrent one; strategically placed (thalamus, angular gyrus, hippocampus, frontal) or multiple infarcts raise the risk of vascular cognitive impairment. These are population figures — the Outcome tab lists their sources and the factors involved.',
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

  // ── 8b. blood pressure ────────────────────────────────────────
  // IST: Leonardi-Bee J et al. Stroke 2002;33:1315–1320 (associations in 17,398 patients);
  // thrombolysis limits: Sandset EC et al. 2025 update to the ESO guideline on blood pressure
  // management, Eur Stroke J 2026;11:aakag004; induced hypertension: Bang OY et al. Neurology
  // 2019;93:e1955–e1963 (n = 153, Class III); ENCHANTED2/MT: Yang P et al. Lancet 2022;400:1585–1596
  if (input.map !== undefined && input.map >= HIGH_MAP && ((anyIschemia && !eyeOnly) || lacunarOnly)) {
    events.push({
      id: 'high_blood_pressure',
      kind: 'treatment',
      severity: 'warn',
      onsetH: 0,
      endH: 336,
      title: { zh: '急性期血壓偏高', en: 'High blood pressure in the acute phase' },
      desc: {
        zh: '平均動脈壓 120 mmHg 以上，約相當於 170/95 mmHg 或更高。國際中風試驗（IST）的 17,398 名病人中，收縮壓與早期死亡呈 U 型關係，約 150 mmHg 時最低：血壓高時，兩週內中風復發（每高 10 mmHg 增加 4.2%）與疑似腦水腫造成的死亡較多，血壓則與症狀性出血無關；血壓低時，嚴重中風與心臟病死亡較多。這些是相關，不能證明降壓有益。血栓溶解前血壓須低於 185/110 mmHg，溶栓或取栓期間與之後 24 小時維持低於 180/105 mmHg（歐洲中風組織 ESO 2025）。本模型裡血壓越高，只會把更多血推過側枝、讓梗塞變小——這是模型的假設：用藥物升壓只在小型試驗中測試過（一個 153 人的隨機試驗，對象是非心因性栓塞、不適合再灌流治療的病人），ESO 也不建議對沒有接受再灌流治療的病人常規使用升壓藥；成功取栓後把收縮壓壓到 120 mmHg 以下，預後反而較差（ENCHANTED2/MT）。',
        en: 'A mean arterial pressure of 120 mmHg or more corresponds to roughly 170/95 mmHg or higher. In 17,398 patients of the International Stroke Trial (IST), the relation of systolic pressure to early death was U-shaped, lowest around 150 mmHg: with high pressure, recurrent stroke within two weeks (+4.2% per 10 mmHg) and death from presumed brain oedema were more common, and the pressure was not related to symptomatic haemorrhage; with low pressure, severe strokes and cardiac deaths were more common. These are associations, not proof that lowering the pressure helps. Before thrombolysis the pressure must be below 185/110 mmHg, and it is kept below 180/105 mmHg during and for 24 h after thrombolysis or thrombectomy (European Stroke Organisation, ESO 2025). In this model a higher pressure only pushes more blood through the collaterals and shrinks the infarct: that is a model assumption. Raising the pressure with drugs has been tested in small trials only (one randomised trial of 153 patients with non-cardioembolic stroke who were not eligible for reperfusion), and the ESO discourages routine vasopressors in patients not treated with reperfusion; after successful thrombectomy, lowering systolic pressure below 120 mmHg led to worse outcome (ENCHANTED2/MT).',
      },
      regions: [],
    });
  }

  // ── 9. flow redistribution notes ──────────────────────────────
  // subclavian steal: basilar flow at rest (Harper C et al. J Vasc Surg 2008;48:859–864) and
  // symptoms by arm pressure difference (Labropoulos N et al. Ann Surg 2010;252:166–170)
  const rev = hemo.reversed;
  if (rev.some((v) => v.startsWith('va_'))) {
    events.push({
      id: 'steal',
      kind: 'mechanism',
      severity: 'warn',
      onsetH: 0,
      title: { zh: '血流反轉：竊血現象', en: 'Flow reversal: steal' },
      desc: {
        zh: '椎動脈血流倒流去供應手臂（鎖骨下竊血）。超音波上很常見，多半沒有症狀：手臂也能經胸壁與頸部的側枝得到血液，基底動脈通常仍由另一側椎動脈供應、維持順向。兩手血壓差超過 40–50 mmHg 時較常出現症狀——手臂用力時後循環血流被「偷走」而頭暈、視力模糊、走不穩，或手臂痠痛無力。',
        en: 'Vertebral flow reverses to feed the arm (subclavian steal). It is common on ultrasound and usually without symptoms: the arm is also fed through chest-wall and neck collaterals, and the basilar artery usually keeps flowing forwards, fed by the other vertebral artery. Symptoms are more frequent when the arm pressures differ by more than 40–50 mmHg: exercising that arm "steals" posterior-circulation blood, causing dizziness, blurred vision or unsteadiness, or the arm itself tires and aches.',
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
    palatalTremorFromH,
  };
}

export { baseOf, sideOf };
