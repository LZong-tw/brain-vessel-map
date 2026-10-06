/**
 * Brain oedema and swelling over time: what DWI, CT and T2/FLAIR would show at the displayed
 * time, how much each perfusion bed has swollen (or, months later, shrunk), and the mass effect
 * that results (midline shift, ventricle size). Pure, deterministic and cheap (one pass over
 * the beds).
 *
 * Simplified physiology (the phases overlap; every curve is per unit of affected tissue):
 *   • cytotoxic oedema — failing ion pumps move water from the extracellular space INTO cells
 *     within minutes where flow is below the core threshold (less so in the penumbra). Diffusion
 *     is restricted (DWI-bright) but net tissue volume hardly changes. ADC falls further over the
 *     first days, then pseudonormalises at ~1–2 weeks and is raised afterwards (Schlaug G et al.
 *     Neurology 1997;49:113–119; Lansberg MG et al. AJNR Am J Neuroradiol 2001;22:637–644).
 *   • what MRI shows is not the same as the oedema (C4-F5): the DWI image stays bright after the
 *     ADC has pseudonormalised (T2 shine-through) and fades only over weeks, and T2/FLAIR stays
 *     bright for good once the oedema gives way to gliosis — in Lansberg's series all signal
 *     intensities remained high throughout follow-up, SI(DWI) falling after week 1, SI(T2) dipping
 *     slightly in week 2 and rising again after day 14, SI(FLAIR) stable. The `dwi` and `flair`
 *     maps carry the image; `cytotoxic` and `vasogenic` stay the oedema itself (recovery.ts reads
 *     the vasogenic oedema for perilesional dysfunction).
 *   • ionic oedema — while some blood still reaches the ischaemic tissue, sodium and water are
 *     drawn in FROM THE BLOOD across an intact barrier over the first hours (CT hypodensity,
 *     sulcal effacement; Simard et al., Lancet Neurol 2007). On CT the lesion's net water uptake
 *     rises with time: 11.5 % separated scans within 4.5 h of onset from later ones (Minnerup et
 *     al., Ann Neurol 2016). The model's ionic term (ION_MAX, at most 4 % of the infarct's volume)
 *     is deliberately smaller than that density-based measure, because here it only adds volume
 *     and so drives mass effect; raising it would break the midline-shift calibration below.
 *     Restoring flow to already-dead tissue supplies more water and can transiently worsen oedema.
 *   • vasogenic oedema — the blood–brain barrier breaks down from ~6–12 h and plasma leaks into
 *     the infarct; mass effect peaks around days 2–5 and resorbs over ~2–3 weeks (cytotoxic vs
 *     vasogenic: Klatzo, J Neuropathol Exp Neurol 1967; review: Ayata & Ropper, J Clin Neurosci
 *     2002). Large (malignant) MCA infarcts swell disproportionately and herniate (Hacke et al.,
 *     Arch Neurol 1996); here that is a size factor on the vasogenic component.
 *   • atrophy — dead tissue is cleared by macrophages and shrinks (encephalomalacia), by roughly
 *     half its volume over 3–6 months; the ventricles enlarge ex vacuo.
 *   • mass effect — the extra supratentorial volume of the more swollen hemisphere pushes the
 *     midline across (pineal shift ~3–4 mm → drowsy, ~8–13 mm → coma: Ropper, N Engl J Med 1986). A
 *     decompressive craniectomy does not stop the swelling but lets it expand outwards
 *     (Vahedi et al., Lancet Neurol 2007). Swelling in the tight posterior fossa blocks the
 *     4th ventricle → obstructive hydrocephalus (Wijdicks et al., Stroke 2014).
 *
 * Calibration: a malignant right M1 infarct with poor collaterals (~300 mL) swells by ~30 %
 * (~90 mL, ~15 % of the hemisphere) and shifts the midline ~12–13 mm around day 3; an untreated
 * left M1 with good collaterals (~150 mL) only a few mm. This is the model's only midline shift:
 * simulate() reads the level of consciousness from it (cascade.consciousnessFromShift, C4-F2),
 * counting the swelling of both hemispheres together when both swell (massEffectMm, Y2-13).
 * TODO(medical-review): all magnitudes and time constants are educational approximations.
 */

import { BEDS, REGION_BY_ID } from '../anatomy';
import type { Side } from '../anatomy';
import type { CascadeOutput } from './cascade';
import { NO_EDEMA, type EdemaPhase, type EdemaState } from './edemaTypes';
import { CORE_REL } from './tissue';

/** per-bed tissue state at the displayed time, as computed by simulate() */
export interface EdemaBedInput {
  /**
   * when this bed's lesion began, on the clock of `tH` (0 when left out): every lesion swells,
   * resolves and shrinks on its own clock (V1-1). A bed whose lesion has not begun yet at `tH` is
   * still on the clock of `tH` (what an earlier occlusion did to it)
   */
  onsetH?: number;
  /** fraction infarcted by the arterial occlusion itself (incl. lacunes), before secondary effects */
  infarct: number;
  /**
   * the fraction that the arterial occlusions infarct in the end (before secondary effects): with
   * lesions on more than one clock, each lesion's swelling is sized by the lesions swelling with it
   * (lesionSizes), not at once by the hemisphere's final infarct, which counts a lesion that begins
   * later (U1-2). Left out, the compartment's final infarct (cascade.volumes) sizes every lesion
   */
  final?: number;
  /** fraction still in the penumbra (ischaemic, alive) */
  penumbra: number;
  /** fraction rescued by reperfusion */
  salvaged: number;
  /** relative flow before recanalisation */
  relAcute: number;
  /** relative flow after recanalisation (= relAcute if the vessel is never reopened) */
  relAfter: number;
  /** onset (h) of a herniation-related secondary infarct of the rest of the bed, or null */
  secondaryOnsetH: number | null;
}

export interface EdemaInput {
  /** hours after onset; with an occlusion schedule, after the index onset (see simulate.ts) */
  tH: number;
  /** first reopening of the occlusion(s), on the same clock */
  reperfusionH: number | null;
  decompression: boolean;
  beds: Record<string, EdemaBedInput>;
  /** (a decompressive hemicraniectomy acts from its event, at the latest DECOMPRESSION_H after onset) */
  cascade: Pick<CascadeOutput, 'volumes' | 'hydrocephalusOnsetH' | 'events'>;
}

// ── time constants & magnitudes ──────────────────────────────────────
/** DWI appears within minutes (time constant, h) … */
const DWI_APPEAR_H = 0.1;
/** … and deepens towards its maximum over the first day(s) */
const DWI_DEEPEN_H = 12;
/** ADC pseudonormalisation: midpoint and width (h) */
const DWI_PSEUDONORMAL_H = 240;
const DWI_PSEUDONORMAL_W = 30;
/** T2 shine-through on the DWI image once the ADC has pseudonormalised (share of full brightness) … */
const DWI_SHINE = 0.5;
/** … fading with this time constant (h) after the pseudonormalisation midpoint */
const DWI_SHINE_TAU_H = 720;
/** T2/FLAIR brightness of the gliotic scar of infarcted tissue, and when it builds up (h) */
const GLIOSIS_FLAIR = 0.6;
const GLIOSIS_FROM_H = 120;
const GLIOSIS_FULL_H = 400;
/** relative DWI restriction of penumbra / salvaged tissue */
const PENUMBRA_DWI = 0.3;
/** DWI of rescued tissue reverses after reperfusion (time constant, h) */
const SALVAGED_DWI_DECAY_H = 3;

/** net ionic water uptake of infarcted tissue (volume fraction) and its time constant (h) */
const ION_MAX = 0.04;
const ION_TAU_H = 4;
/** penumbra takes up proportionally less water; rescued tissue gives it back */
const PENUMBRA_ION = 0.4;
const SALVAGED_ION_DECAY_H = 12;

/** vasogenic swelling of fully infarcted tissue in a large (malignant) lesion */
const VASO_MAX = 0.26;
/** blood–brain barrier breakdown: logistic midpoint and width (h) */
const VASO_MID_H = 36;
const VASO_W_H = 10;
/** tissue infarcted secondarily by compression has little room to swell */
const SECONDARY_VASO = 0.15;
/** oedema resorption: starts after the peak, Gaussian decay (h) */
const RESOLVE_START_H = 72;
const RESOLVE_H = 260;

/** reperfusion of already-dead tissue: transient extra oedema (volume, FLAIR), larger when late */
const REPERF_BOOST = 0.05;
const REPERF_FLAIR = 0.5;
const REPERF_RISE_H = 3;
const REPERF_DECAY_H = 72;

/** chronic shrinkage of infarcted tissue (fraction), onset and time constant (h) */
const ATROPHY_MAX = 0.5;
const ATROPHY_START_H = 300;
const ATROPHY_TAU_H = 700;

/** midline shift per mL of net extra hemispheric volume, CSF reserve, cap */
const SHIFT_MM_PER_ML = 0.15;
const SHIFT_RESERVE_ML = 5;
const SHIFT_MAX_MM = 20;
/** decompressive craniectomy */
const DECOMPRESSION_H = 36;
const DECOMPRESSION_SHIFT = 0.3;
const DECOMPRESSION_VENTRICLE = 0.4;

/** ventricle compression / ex-vacuo enlargement / hydrocephalus */
const VENT_COMPRESS_MAX = 0.85;
const VENT_COMPRESS_ML = 45;
const EX_VACUO_MAX = 1;
const EX_VACUO_ML = 120;
const HYDRO_MAX = 0.8;
const HYDRO_RAMP_H = 12;
/** some ventricular enlargement persists after obstructive hydrocephalus */
const HYDRO_RESIDUAL = 0.2;

/** below this (mL), nothing is worth showing */
const NEGLIGIBLE_ML = 0.05;
/** per-bed values below this are left out of the maps */
const NEGLIGIBLE = 1e-4;

// ── helpers ──────────────────────────────────────────────────────────
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const smoothstep = (e0: number, e1: number, x: number) => {
  const u = clamp((x - e0) / (e1 - e0), 0, 1);
  return u * u * (3 - 2 * u);
};
const logistic = (x: number, mid: number, w: number) => 1 / (1 + Math.exp(-(x - mid) / w));

/** DWI restriction (0–1) of tissue `a` hours after it became ischaemic */
export function dwiCurve(a: number): number {
  if (a <= 0) return 0;
  const appear = 1 - Math.exp(-a / DWI_APPEAR_H);
  const deepen = 0.65 + 0.35 * (1 - Math.exp(-a / DWI_DEEPEN_H));
  return appear * deepen * (1 - logistic(a, DWI_PSEUDONORMAL_H, DWI_PSEUDONORMAL_W));
}

/**
 * Brightness (0–1) of the DWI image of tissue infarcted `a` hours ago: the restriction, then T2
 * shine-through that takes over as the ADC pseudonormalises and fades over weeks (C4-F5).
 */
export function dwiTraceCurve(a: number): number {
  if (a <= 0) return 0;
  const shine = DWI_SHINE * logistic(a, DWI_PSEUDONORMAL_H, DWI_PSEUDONORMAL_W) * Math.exp(-Math.max(0, a - DWI_PSEUDONORMAL_H) / DWI_SHINE_TAU_H);
  return Math.min(1, dwiCurve(a) + shine);
}

/** T2/FLAIR brightness (0–1) of the gliotic scar of tissue infarcted `a` hours ago (C4-F5) */
export function gliosisCurve(a: number): number {
  return GLIOSIS_FLAIR * smoothstep(GLIOSIS_FROM_H, GLIOSIS_FULL_H, a);
}

const VASO_0 = logistic(0, VASO_MID_H, VASO_W_H);
/** blood–brain barrier breakdown (0–1), `a` hours after the tissue became ischaemic */
export function vasoRise(a: number): number {
  if (a <= 0) return 0;
  return Math.max(0, (logistic(a, VASO_MID_H, VASO_W_H) - VASO_0) / (1 - VASO_0));
}

/** fraction of the acute oedema still present `a` hours after onset */
export function resolveCurve(a: number): number {
  if (a <= RESOLVE_START_H) return 1;
  const x = (a - RESOLVE_START_H) / RESOLVE_H;
  return Math.exp(-x * x);
}

/** fractional shrinkage of infarcted tissue `a` hours after onset */
export function atrophyCurve(a: number): number {
  if (a <= ATROPHY_START_H) return 0;
  return ATROPHY_MAX * (1 - Math.exp(-(a - ATROPHY_START_H) / ATROPHY_TAU_H));
}

/** water supply for ionic oedema: slower where (almost) no blood arrives */
const delivery = (rel: number) => 0.5 + 0.5 * clamp(rel / CORE_REL, 0, 1);

/**
 * how long (h) after a lesion began a later one of the same compartment still swells together with
 * it: until the earlier one's swelling has largely resolved (its swelling events run from day 1 to
 * two weeks)
 */
const LESION_OVERLAP_H = 312;

/** large lesions (as a share of their compartment) swell disproportionately — malignant course */
const sizeFactor = (share: number) => 0.3 + 0.7 * smoothstep(0.05, 0.5, share);

// compartment volumes (mL) for the size factor
const COMPARTMENT_ML = (() => {
  const v = { r: 0, l: 0, infra: 0 };
  for (const b of BEDS) {
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment === 'supra' && reg.side !== 'm') v[reg.side] += b.volume;
    else if (reg.compartment === 'infra') v.infra += b.volume;
  }
  return v;
})();

type Compartment = Side | 'infra';

/**
 * The size factor of each compartment's lesion on each clock at time `t` (compartment → bed onset →
 * factor), from the beds' final infarct. Lesions of a compartment that swell at the same time make
 * one larger swollen lesion, which swells as one (the size factor: large lesions swell
 * disproportionately): a lesion is sized with those of the compartment that began before it and are
 * still swelling (within LESION_OVERLAP_H), and with those that begin after it as they swell
 * themselves (by their own barrier breakdown, vasoRise), never before they begin (U1-2: a left M2
 * infarct's swelling jumped by a third at the very moment a second left occlusion began, before any
 * of its tissue had died, because it was sized by the hemisphere's final infarct with the new
 * lesion's). Null when the beds do not give their final infarct, or when every infarcted bed is on
 * one clock (the compartment's final infarct, cascade.volumes, then sizes it, as it always did). The
 * compartments are counted as the cascade counts them: the supratentorial midline with the right
 * hemisphere, the brainstem with the cerebellum.
 */
function lesionSizes(beds: Record<string, EdemaBedInput>, t: number): Map<Compartment, Map<number, number>> | null {
  const ml = new Map<Compartment, Map<number, number>>();
  const onsets = new Set<number>();
  for (const b of BEDS) {
    const st = beds[b.id];
    if (!st || st.final === undefined || !(st.final > 0)) continue;
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment === 'none') continue;
    const comp: Compartment = reg.compartment === 'infra' ? 'infra' : reg.side === 'm' ? 'r' : reg.side;
    const onset = st.onsetH ?? 0;
    onsets.add(onset);
    let m = ml.get(comp);
    if (!m) ml.set(comp, (m = new Map()));
    m.set(onset, (m.get(onset) ?? 0) + st.final * b.volume);
  }
  if (onsets.size <= 1) return null;
  const out = new Map<Compartment, Map<number, number>>();
  for (const [comp, m] of ml) {
    const sized = new Map<number, number>();
    for (const o of m.keys()) {
      let v = 0;
      for (const [o2, v2] of m) if (Math.abs(o - o2) < LESION_OVERLAP_H) v += o2 <= o ? v2 : v2 * vasoRise(t - o2);
      sized.set(o, sizeFactor(v / (COMPARTMENT_ML[comp] || 1)));
    }
    out.set(comp, sized);
  }
  return out;
}

/**
 * Oedema / swelling at time `tH` from the per-bed tissue state simulate() has computed.
 * Per-bed maps are sparse: beds without any change are left out (read them with `?? 0`).
 */
export function computeEdema(input: EdemaInput): EdemaState {
  const { tH: t, reperfusionH: tr, decompression, beds, cascade } = input;

  const vol = cascade.volumes;
  const size: Record<Compartment, number> = {
    r: sizeFactor(vol.supra.r / (COMPARTMENT_ML.r || 1)),
    l: sizeFactor(vol.supra.l / (COMPARTMENT_ML.l || 1)),
    infra: sizeFactor((vol.cerebellum.r + vol.cerebellum.l + vol.brainstem) / (COMPARTMENT_ML.infra || 1)),
  };
  // With lesions on more than one clock, each lesion is sized by the lesions swelling with it, a later
  // one only as it swells (lesionSizes, U1-2): a left M2 infarct swelled at once by a third more, its
  // midline shift jumping from 1.6 to 3.4 mm, as a second left occlusion began a week later, before
  // any of its tissue had died, because the size was read from the hemisphere's final infarct with
  // the new lesion's. The secondary infarcts of a herniation swell by the largest size in their
  // compartment.
  const sizeOn = lesionSizes(beds, t);
  const sizeOf = (comp: Compartment, onset: number) => sizeOn?.get(comp)?.get(onset) ?? (sizeOn ? sizeFactor(0) : size[comp]);
  const secondarySize = (comp: Compartment) => {
    const m = sizeOn?.get(comp);
    return m && m.size ? Math.max(...m.values()) : size[comp];
  };

  // time curves shared by all primary lesions of the same onset (their clock starts at that onset;
  // with one index event every bed is on the clock of `t`): V1-1
  const curvesAt = new Map<number, ReturnType<typeof curvesOf>>();
  const curvesOf = (onset: number) => {
    const a = t - onset;
    // the first reopening counts for a lesion that had begun by then
    const recanalized = tr !== null && tr >= onset && t >= tr;
    const trA = recanalized ? (tr as number) - onset : 0;
    // reperfusion of dead tissue: transient, and worse the later it comes
    const since = recanalized ? t - (tr as number) : 0;
    return {
      a,
      recanalized,
      trA,
      since,
      dwi: dwiCurve(a),
      rise: vasoRise(a),
      resolve: resolveCurve(a),
      atrophy: atrophyCurve(a),
      appear: 1 - Math.exp(-a / DWI_APPEAR_H),
      reperfPulse: recanalized ? smoothstep(0.5, 6, trA) * (1 - Math.exp(-since / REPERF_RISE_H)) * Math.exp(-since / REPERF_DECAY_H) : 0,
      dwiTrace: dwiTraceCurve(a),
      gliosis: gliosisCurve(a),
    };
  };
  const curves = (onset: number) => {
    let c = curvesAt.get(onset);
    if (!c) curvesAt.set(onset, (c = curvesOf(onset)));
    return c;
  };

  const swelling: Record<string, number> = {};
  const cytotoxic: Record<string, number> = {};
  const vasogenic: Record<string, number> = {};
  const dwiImg: Record<string, number> = {};
  const flairImg: Record<string, number> = {};
  const extra: Record<Compartment, number> = { r: 0, l: 0, infra: 0 };
  let cytoMl = 0;
  let ionMl = 0;
  let vasoMl = 0;
  let atrophyMl = 0;
  /** infarcted volume per lesion onset, overall and in the posterior fossa: whose clock names the phase */
  const byOnset = new Map<number, number>();
  const infraByOnset = new Map<number, number>();

  for (const b of BEDS) {
    const st = beds[b.id];
    if (!st) continue;
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment === 'none' || reg.side === 'm') continue;
    const comp: Compartment = reg.compartment === 'infra' ? 'infra' : reg.side;
    const inf = clamp(st.infarct, 0, 1);
    // the bed's own clock, or that of `t` while its lesion has not begun; before either began (or at
    // its onset) nothing primary has swollen yet, while a secondary infarct swells on its own clock
    const own = st.onsetH ?? 0;
    const onset = t - own > 0 ? own : 0;
    const secondary = st.secondaryOnsetH !== null && t >= st.secondaryOnsetH;
    if (!(t - onset > 0) && !secondary) continue;
    const { recanalized, trA, since, dwi, rise, resolve, atrophy, appear, reperfPulse, dwiTrace, gliosis, a } = curves(onset);
    // (the primary terms below are all 0 at a = 0; before it they are left out)
    const primaryOn = a > 0;
    if (inf > 0 && primaryOn) {
      byOnset.set(onset, (byOnset.get(onset) ?? 0) + inf * b.volume);
      if (comp === 'infra') infraByOnset.set(onset, (infraByOnset.get(onset) ?? 0) + inf * b.volume);
    }

    // ionic water uptake: driven by whatever flow reaches the tissue, before and after reopening
    const reflowed = recanalized && st.relAfter > st.relAcute + 0.05;
    const d0 = delivery(st.relAcute);
    const dose = recanalized ? d0 * trA + delivery(st.relAfter) * since : d0 * a;
    const ionProg = 1 - Math.exp(-dose / ION_TAU_H);

    // ── primary infarct ──
    const pulse = reflowed ? reperfPulse : 0;
    const ion = ION_MAX * ionProg * resolve;
    const vaso = VASO_MAX * sizeOf(comp, own) * rise * resolve + REPERF_BOOST * pulse;
    const pi = primaryOn ? inf : 0;
    let sw = pi * (ion + vaso - atrophy);
    let cy = pi * dwi;
    let vg = pi * (rise * resolve + REPERF_FLAIR * pulse);
    // the image: DWI with its T2 shine-through, T2/FLAIR with the scar (C4-F5)
    let dImg = pi * dwiTrace;
    let fImg = pi * Math.max(rise * resolve + REPERF_FLAIR * pulse, gliosis);
    let ionV = pi * ion;
    let vasoV = pi * vaso;
    let atroV = pi * atrophy;

    if (secondary) {
      const sOn = st.secondaryOnsetH as number;
      // ── the rest of the bed died later from compression (herniation): its own clock ──
      const a2 = t - sOn;
      const rest = 1 - inf;
      const r2 = resolveCurve(a2);
      const ion2 = ION_MAX * (1 - Math.exp(-(delivery(0) * a2) / ION_TAU_H)) * r2;
      const vaso2 = SECONDARY_VASO * VASO_MAX * secondarySize(comp) * vasoRise(a2) * r2;
      const atro2 = atrophyCurve(a2);
      sw += rest * (ion2 + vaso2 - atro2);
      cy += rest * dwiCurve(a2);
      vg += rest * SECONDARY_VASO * vasoRise(a2) * r2;
      dImg += rest * dwiTraceCurve(a2);
      fImg += rest * Math.max(SECONDARY_VASO * vasoRise(a2) * r2, gliosisCurve(a2));
      ionV += rest * ion2;
      vasoV += rest * vaso2;
      atroV += rest * atro2;
    } else if (primaryOn) {
      // ── ischaemic but alive: penumbra, and tissue rescued by reperfusion ──
      const pen = clamp(st.penumbra, 0, 1);
      const penIon = pen * PENUMBRA_ION * ION_MAX * ionProg;
      sw += penIon;
      ionV += penIon;
      cy += pen * PENUMBRA_DWI * appear;
      dImg += pen * PENUMBRA_DWI * appear;
      const salv = clamp(st.salvaged, 0, 1);
      if (salv > 0 && recanalized) {
        const ionAtReopen = 1 - Math.exp(-(d0 * trA) / ION_TAU_H);
        const back = salv * PENUMBRA_ION * ION_MAX * ionAtReopen * Math.exp(-since / SALVAGED_ION_DECAY_H);
        sw += back;
        ionV += back;
        const back2 = salv * PENUMBRA_DWI * (1 - Math.exp(-trA / DWI_APPEAR_H)) * Math.exp(-since / SALVAGED_DWI_DECAY_H);
        cy += back2;
        dImg += back2;
      }
    }

    cy = clamp(cy, 0, 1);
    vg = clamp(vg, 0, 1);
    dImg = clamp(dImg, 0, 1);
    fImg = clamp(fImg, 0, 1);
    const v = b.volume;
    extra[comp] += sw * v;
    cytoMl += cy * v;
    ionMl += ionV * v;
    vasoMl += vasoV * v;
    atrophyMl += atroV * v;
    if (Math.abs(sw) > NEGLIGIBLE || cy > NEGLIGIBLE || vg > NEGLIGIBLE || dImg > NEGLIGIBLE || fImg > NEGLIGIBLE) {
      swelling[b.id] = sw;
      cytotoxic[b.id] = cy;
      vasogenic[b.id] = vg;
      dwiImg[b.id] = dImg;
      flairImg[b.id] = fImg;
    }
  }
  /** the onset of the largest infarct among `m` (the earlier on a tie), or the clock of `t` */
  const dominant = (m: Map<number, number>) => {
    let best = 0;
    let ml = -1;
    for (const o of [...m.keys()].sort((x, y) => x - y)) if (m.get(o)! > ml + 1e-9) [best, ml] = [o, m.get(o)!];
    return best;
  };
  const main = curves(dominant(byOnset));
  const resolve = main.resolve;

  const oedemaMl = ionMl + vasoMl;
  if (cytoMl + oedemaMl + atrophyMl < NEGLIGIBLE_ML) return NO_EDEMA;

  // ── phase: the dominant process for the brain as a whole ──
  let phase: EdemaPhase;
  if (atrophyMl > oedemaMl) phase = 'atrophy';
  else if (resolve < 0.95) phase = 'resolving';
  else if (vasoMl >= ionMl) phase = 'vasogenic';
  else if (1 - Math.exp(-main.a / ION_TAU_H) >= 0.3) phase = 'ionic';
  else phase = 'cytotoxic';

  // ── midline shift: net extra volume of the more swollen hemisphere ──
  // (from the first hemicraniectomy, when the swelling of a lesion that began earlier is decompressed: V1-1)
  const decompressionH = Math.min(DECOMPRESSION_H, ...cascade.events.filter((e) => e.id.startsWith('hemicraniectomy_')).map((e) => e.onsetH));
  const decompressed = decompression && t >= decompressionH;
  const push = { r: Math.max(0, extra.r), l: Math.max(0, extra.l) };
  const diff = push.r - push.l;
  let midlineShiftMm = Math.min(SHIFT_MAX_MM, SHIFT_MM_PER_ML * Math.max(0, Math.abs(diff) - SHIFT_RESERVE_ML));
  if (decompressed) midlineShiftMm *= DECOMPRESSION_SHIFT;
  const shiftFrom: Side | null = midlineShiftMm > 0 ? (diff > 0 ? 'r' : 'l') : null;
  // ── mass effect: the swelling of both hemispheres together, on the same scale (Y2-13) ──
  // Ropper related consciousness to the lateral shift of one-sided masses. Two swollen hemispheres
  // push the brain down rather than across (central rather than lateral displacement), so a
  // symmetric swelling leaves the midline in place while it compresses the diencephalon and
  // midbrain all the same. The model counts the swelling of both together, as it would one
  // hemisphere's: a model choice, equal to the midline shift when only one hemisphere swells.
  let massEffectMm = Math.min(SHIFT_MAX_MM, SHIFT_MM_PER_ML * Math.max(0, push.r + push.l - SHIFT_RESERVE_ML));
  if (decompressed) massEffectMm *= DECOMPRESSION_SHIFT;
  // ── each hemisphere's own push: the shift its swelling alone would give (U1-0) ──
  const ownShiftMm = { r: 0, l: 0 };
  for (const sd of ['r', 'l'] as Side[]) {
    ownShiftMm[sd] = Math.min(SHIFT_MAX_MM, SHIFT_MM_PER_ML * Math.max(0, push[sd] - SHIFT_RESERVE_ML));
    if (decompressed) ownShiftMm[sd] *= DECOMPRESSION_SHIFT;
  }

  // ── ventricles ──
  // supratentorial swelling compresses the lateral ventricle(s) …
  let compress = 0;
  for (const s of ['r', 'l'] as Side[]) compress += VENT_COMPRESS_MAX * (1 - Math.exp(-push[s] / VENT_COMPRESS_ML));
  if (decompressed) compress *= DECOMPRESSION_VENTRICLE;
  // … lost tissue is replaced by CSF (ex vacuo) …
  const loss = Math.max(0, -extra.r) + Math.max(0, -extra.l) + Math.max(0, -extra.infra);
  const exVacuo = EX_VACUO_MAX * (1 - Math.exp(-loss / EX_VACUO_ML));
  // … and a swollen posterior fossa blocks the 4th ventricle (obstructive hydrocephalus)
  const hOnset = cascade.hydrocephalusOnsetH;
  const hydro =
    hOnset !== null && t >= hOnset
      ? HYDRO_MAX * Math.min(1, 0.25 + (0.75 * (t - hOnset)) / HYDRO_RAMP_H) * Math.max(HYDRO_RESIDUAL, curves(dominant(infraByOnset)).resolve)
      : 0;
  const ventricleChange = clamp(hydro + exVacuo - Math.min(0.9, compress), -0.9, 1.5);

  return {
    phase,
    swelling,
    cytotoxic,
    vasogenic,
    dwi: dwiImg,
    flair: flairImg,
    extraVolume: { supra: { r: extra.r, l: extra.l }, infra: extra.infra },
    midlineShiftMm,
    shiftFrom,
    massEffectMm,
    ownShiftMm,
    ventricleChange,
  };
}
