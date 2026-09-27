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
 *     first days, then pseudonormalises at ~1–2 weeks (Schlaug et al., Neurology 1997; Lansberg
 *     et al., AJNR 2001).
 *   • ionic oedema — while some blood still reaches the ischaemic tissue, sodium and water are
 *     drawn in FROM THE BLOOD across an intact barrier: a net gain of a few per cent over the
 *     first hours (CT hypodensity, sulcal effacement; Simard et al., Lancet Neurol 2007; CT net
 *     water uptake: Minnerup et al., Ann Neurol 2016). Restoring flow to already-dead tissue
 *     supplies more water and can transiently worsen oedema.
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
 * (~90 mL, ~15 % of the hemisphere) and shifts the midline ~12–13 mm around day 3, in line with
 * cascade.midlineShift / midlineShiftAt; an untreated left M1 with good collaterals (~150 mL)
 * only a few mm.
 * TODO(medical-review): all magnitudes and time constants are educational approximations.
 */

import { BEDS, REGION_BY_ID } from '../anatomy';
import type { Side } from '../anatomy';
import type { CascadeOutput } from './cascade';
import { NO_EDEMA, type EdemaPhase, type EdemaState } from './edemaTypes';
import { CORE_REL } from './tissue';

/** per-bed tissue state at the displayed time, as computed by simulate() */
export interface EdemaBedInput {
  /** fraction infarcted by the arterial occlusion itself (incl. lacunes), before secondary effects */
  infarct: number;
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
  tH: number;
  reperfusionH: number | null;
  decompression: boolean;
  beds: Record<string, EdemaBedInput>;
  cascade: Pick<CascadeOutput, 'volumes' | 'hydrocephalusOnsetH'>;
}

// ── time constants & magnitudes ──────────────────────────────────────
/** DWI appears within minutes (time constant, h) … */
const DWI_APPEAR_H = 0.1;
/** … and deepens towards its maximum over the first day(s) */
const DWI_DEEPEN_H = 12;
/** ADC pseudonormalisation: midpoint and width (h) */
const DWI_PSEUDONORMAL_H = 240;
const DWI_PSEUDONORMAL_W = 30;
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
/** decompressive craniectomy (as in cascade.midlineShiftAt) */
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
 * Oedema / swelling at time `tH` from the per-bed tissue state simulate() has computed.
 * Per-bed maps are sparse: beds without any change are left out (read them with `?? 0`).
 */
export function computeEdema(input: EdemaInput): EdemaState {
  const { tH: t, reperfusionH: tr, decompression, beds, cascade } = input;
  if (!(t > 0)) return NO_EDEMA;
  const recanalized = tr !== null && t >= tr;

  const vol = cascade.volumes;
  const size: Record<Compartment, number> = {
    r: sizeFactor(vol.supra.r / (COMPARTMENT_ML.r || 1)),
    l: sizeFactor(vol.supra.l / (COMPARTMENT_ML.l || 1)),
    infra: sizeFactor((vol.cerebellum.r + vol.cerebellum.l + vol.brainstem) / (COMPARTMENT_ML.infra || 1)),
  };

  // time curves shared by all primary lesions (their clock starts at onset)
  const dwi = dwiCurve(t);
  const rise = vasoRise(t);
  const resolve = resolveCurve(t);
  const atrophy = atrophyCurve(t);
  const appear = 1 - Math.exp(-t / DWI_APPEAR_H);
  // reperfusion of dead tissue: transient, and worse the later it comes
  const since = recanalized ? t - (tr as number) : 0;
  const reperfPulse = recanalized
    ? smoothstep(0.5, 6, tr as number) * (1 - Math.exp(-since / REPERF_RISE_H)) * Math.exp(-since / REPERF_DECAY_H)
    : 0;

  const swelling: Record<string, number> = {};
  const cytotoxic: Record<string, number> = {};
  const vasogenic: Record<string, number> = {};
  const extra: Record<Compartment, number> = { r: 0, l: 0, infra: 0 };
  let cytoMl = 0;
  let ionMl = 0;
  let vasoMl = 0;
  let atrophyMl = 0;

  for (const b of BEDS) {
    const st = beds[b.id];
    if (!st) continue;
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment === 'none' || reg.side === 'm') continue;
    const comp: Compartment = reg.compartment === 'infra' ? 'infra' : reg.side;
    const inf = clamp(st.infarct, 0, 1);

    // ionic water uptake: driven by whatever flow reaches the tissue, before and after reopening
    const reflowed = recanalized && st.relAfter > st.relAcute + 0.05;
    const d0 = delivery(st.relAcute);
    const dose = recanalized ? d0 * (tr as number) + delivery(st.relAfter) * since : d0 * t;
    const ionProg = 1 - Math.exp(-dose / ION_TAU_H);

    // ── primary infarct ──
    const pulse = reflowed ? reperfPulse : 0;
    const ion = ION_MAX * ionProg * resolve;
    const vaso = VASO_MAX * size[comp] * rise * resolve + REPERF_BOOST * pulse;
    let sw = inf * (ion + vaso - atrophy);
    let cy = inf * dwi;
    let vg = inf * (rise * resolve + REPERF_FLAIR * pulse);
    let ionV = inf * ion;
    let vasoV = inf * vaso;
    let atroV = inf * atrophy;

    if (st.secondaryOnsetH !== null && t >= st.secondaryOnsetH) {
      // ── the rest of the bed died later from compression (herniation): its own clock ──
      const a = t - st.secondaryOnsetH;
      const rest = 1 - inf;
      const r2 = resolveCurve(a);
      const ion2 = ION_MAX * (1 - Math.exp(-(delivery(0) * a) / ION_TAU_H)) * r2;
      const vaso2 = SECONDARY_VASO * VASO_MAX * size[comp] * vasoRise(a) * r2;
      const atro2 = atrophyCurve(a);
      sw += rest * (ion2 + vaso2 - atro2);
      cy += rest * dwiCurve(a);
      vg += rest * SECONDARY_VASO * vasoRise(a) * r2;
      ionV += rest * ion2;
      vasoV += rest * vaso2;
      atroV += rest * atro2;
    } else {
      // ── ischaemic but alive: penumbra, and tissue rescued by reperfusion ──
      const pen = clamp(st.penumbra, 0, 1);
      const penIon = pen * PENUMBRA_ION * ION_MAX * ionProg;
      sw += penIon;
      ionV += penIon;
      cy += pen * PENUMBRA_DWI * appear;
      const salv = clamp(st.salvaged, 0, 1);
      if (salv > 0 && recanalized) {
        const ionAtReopen = 1 - Math.exp(-(d0 * (tr as number)) / ION_TAU_H);
        const back = salv * PENUMBRA_ION * ION_MAX * ionAtReopen * Math.exp(-since / SALVAGED_ION_DECAY_H);
        sw += back;
        ionV += back;
        cy += salv * PENUMBRA_DWI * (1 - Math.exp(-(tr as number) / DWI_APPEAR_H)) * Math.exp(-since / SALVAGED_DWI_DECAY_H);
      }
    }

    cy = clamp(cy, 0, 1);
    vg = clamp(vg, 0, 1);
    const v = b.volume;
    extra[comp] += sw * v;
    cytoMl += cy * v;
    ionMl += ionV * v;
    vasoMl += vasoV * v;
    atrophyMl += atroV * v;
    if (Math.abs(sw) > NEGLIGIBLE || cy > NEGLIGIBLE || vg > NEGLIGIBLE) {
      swelling[b.id] = sw;
      cytotoxic[b.id] = cy;
      vasogenic[b.id] = vg;
    }
  }

  const oedemaMl = ionMl + vasoMl;
  if (cytoMl + oedemaMl + atrophyMl < NEGLIGIBLE_ML) return NO_EDEMA;

  // ── phase: the dominant process for the brain as a whole ──
  let phase: EdemaPhase;
  if (atrophyMl > oedemaMl) phase = 'atrophy';
  else if (resolve < 0.95) phase = 'resolving';
  else if (vasoMl >= ionMl) phase = 'vasogenic';
  else if (1 - Math.exp(-t / ION_TAU_H) >= 0.3) phase = 'ionic';
  else phase = 'cytotoxic';

  // ── midline shift: net extra volume of the more swollen hemisphere ──
  const decompressed = decompression && t >= DECOMPRESSION_H;
  const push = { r: Math.max(0, extra.r), l: Math.max(0, extra.l) };
  const diff = push.r - push.l;
  let midlineShiftMm = Math.min(SHIFT_MAX_MM, SHIFT_MM_PER_ML * Math.max(0, Math.abs(diff) - SHIFT_RESERVE_ML));
  if (decompressed) midlineShiftMm *= DECOMPRESSION_SHIFT;
  const shiftFrom: Side | null = midlineShiftMm > 0 ? (diff > 0 ? 'r' : 'l') : null;

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
      ? HYDRO_MAX * Math.min(1, 0.25 + (0.75 * (t - hOnset)) / HYDRO_RAMP_H) * Math.max(HYDRO_RESIDUAL, resolve)
      : 0;
  const ventricleChange = clamp(hydro + exVacuo - Math.min(0.9, compress), -0.9, 1.5);

  return {
    phase,
    swelling,
    cytotoxic,
    vasogenic,
    extraVolume: { supra: { r: extra.r, l: extra.l }, infra: extra.infra },
    midlineShiftMm,
    shiftFrom,
    ventricleChange,
  };
}
