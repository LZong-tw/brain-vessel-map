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

import { BEDS, REGION_BY_ID } from '../anatomy';
import type { L, Side } from '../anatomy';
import type { HemoResult, Occlusion } from './hemodynamics';

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
  const occludedBases = new Set(input.occlusions.filter((o) => o.severity >= 1).map((o) => baseOf(o.vessel)));
  const isLvo = LVO.some((b) => occludedBases.has(b));
  const isMevo = !isLvo && MEVO.some((b) => occludedBases.has(b));

  // ── 1. hyperacute mechanisms ───────────────────────────────────
  if (anyIschemia) {
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
  }

  // ── 2. treatment windows & reperfusion ────────────────────────
  if (anyIschemia) {
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
  if (reperfusionH !== null && anyIschemia && input.occlusions.some((o) => o.severity >= 1)) {
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
          (b) => b.region.endsWith(`_${s}`) && b.supply.some((x) => /^aca_(callosomarginal|pericallosal|paracentral|frontopolar)/.test(x.v)) && (bedFinal[b.id] ?? 0) < 0.5,
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
          (b) => b.region.endsWith(`_${s}`) && b.supply.some((x) => /^pca_(temporal|calcarine|parietooccipital|splenial|p2)/.test(x.v)) && (bedFinal[b.id] ?? 0) < 0.5,
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
    let level = vol.total > 100 ? 2 : vol.total > 30 ? 1 : 0;
    if (reperfusionH !== null && (reperfusionH > 6 || vol.total > 70)) level = Math.min(2, level + 1);
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
        zh: '壞死組織裡受損的小血管在血流恢復後可能滲血，多發生在 1–7 天內。梗塞越大、再通越晚、使用血栓溶解劑，風險越高；症狀性出血在靜脈血栓溶解後約 2–7%。',
        en: 'Damaged small vessels inside dead tissue may bleed once flow returns, usually within 1–7 days. Larger infarcts, late recanalisation and thrombolytics raise the risk; symptomatic haemorrhage occurs in roughly 2–7% after IV thrombolysis.',
      },
      regions: infarctedRegions.filter((r) => REGION_BY_ID[r]?.category === 'cortex' || REGION_BY_ID[r]?.category === 'deep'),
    });
  }

  // ── 5. brainstem-specific ──────────────────────────────────────
  const acute = (rid: string, thr = 0.3) => (regionAcute[rid] ?? 0) >= thr;
  const lockedIn =
    (acute('pons_rostral_basis_r') && acute('pons_rostral_basis_l')) || (acute('pons_caudal_basis_r') && acute('pons_caudal_basis_l'));
  if (lockedIn) {
    events.push({
      id: 'locked_in',
      kind: 'secondary',
      severity: 'danger',
      onsetH: 0,
      title: { zh: '雙側橋腦腹側受損：閉鎖症候群風險', en: 'Bilateral ventral pons: risk of locked-in syndrome' },
      desc: {
        zh: '四肢與臉部完全癱瘓、無法說話吞嚥，但意識清楚，只能用垂直眼動與眨眼溝通（控制垂直眼動的中腦未受損）。',
        en: 'Total paralysis of limbs and face with no speech or swallowing, yet fully conscious — communication is only by vertical eye movements and blinking (the midbrain gaze centres are spared).',
      },
      regions: ['pons_rostral_basis_r', 'pons_rostral_basis_l', 'pons_caudal_basis_r', 'pons_caudal_basis_l'].filter((r) => acute(r)),
    });
  }
  if ((acute('medulla_lateral_r') && acute('medulla_lateral_l')) || (acute('medulla_medial_r') && acute('medulla_medial_l'))) {
    events.push({
      id: 'respiratory_failure',
      kind: 'complication',
      severity: 'danger',
      onsetH: 0,
      endH: 168,
      title: { zh: '雙側延髓受損：呼吸衰竭風險', en: 'Bilateral medulla: risk of respiratory failure' },
      desc: {
        zh: '延髓的呼吸節律中樞與吞嚥反射受損，可能需要插管與呼吸器。',
        en: 'Medullary respiratory rhythm and airway reflexes fail; intubation and ventilation may be needed.',
      },
      regions: ['medulla_lateral_r', 'medulla_lateral_l', 'medulla_medial_r', 'medulla_medial_l'].filter((r) => acute(r)),
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
      desc: {
        zh: '中風後最常見的致死併發症之一。進食前需做吞嚥篩檢，必要時暫時以鼻胃管餵食。',
        en: 'One of the commonest fatal complications after stroke. A swallow screen is needed before eating; temporary tube feeding may be required.',
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
      const mcp = BEDS.filter((b) => /^cerebellum_anterior_inferior_/.test(b.region) && (bedFinal[b.id] ?? 0) < 0.5);
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
      const thal = BEDS.filter((b) => /^thalamus_/.test(b.region) && b.region.endsWith(`_${s}`) && (bedFinal[b.id] ?? 0) < 0.5);
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
        zh: '約三分之一的中風者會出現憂鬱；關鍵位置（視丘、角迴、海馬迴、額葉）或多次梗塞會增加血管性認知障礙的風險。',
        en: 'About a third of stroke survivors develop depression; strategically placed (thalamus, angular gyrus, hippocampus, frontal) or multiple infarcts raise the risk of vascular cognitive impairment.',
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
