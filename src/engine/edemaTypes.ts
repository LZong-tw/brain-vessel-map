/**
 * Shared contract for brain swelling / oedema at the displayed time. Produced by
 * engine/edema.ts (via simulate), consumed by the 3D scene and the panels.
 */
import type { Side } from '../anatomy/types';

export type EdemaPhase =
  /** nothing to show (no ischaemia yet, or none at all) */
  | 'none'
  /** minutes–hours: cells swell (water moves into cells), little net volume change; DWI-bright */
  | 'cytotoxic'
  /** hours: net water uptake from the blood (ionic oedema); CT darkening, sulcal effacement */
  | 'ionic'
  /** ~day 1–5: blood–brain barrier leaks (vasogenic oedema); mass effect peaks */
  | 'vasogenic'
  /** week 1–3: oedema resorbs */
  | 'resolving'
  /** months: dead tissue is cleared and shrinks (encephalomalacia), ventricles enlarge ex vacuo */
  | 'atrophy';

export interface EdemaState {
  phase: EdemaPhase;
  /** per bed: fractional tissue volume change at time t (+0.12 = swollen by 12 %, −0.3 = shrunk) */
  swelling: Record<string, number>;
  /** per bed: 0–1 diffusion restriction (low ADC; cytotoxic oedema) */
  cytotoxic: Record<string, number>;
  /** per bed: 0–1 vasogenic oedema intensity (the oedema itself; it resolves over weeks) */
  vasogenic: Record<string, number>;
  /**
   * per bed: 0–1 brightness of the DWI (trace) image: restricted diffusion in the first ~10 days,
   * then T2 shine-through that fades over weeks (C4-F5)
   */
  dwi: Record<string, number>;
  /**
   * per bed: 0–1 brightness on T2/FLAIR: vasogenic oedema, then the gliotic scar that stays bright
   * for good (C4-F5)
   */
  flair: Record<string, number>;
  /** net volume change (mL) by compartment: positive = mass effect, negative = tissue loss */
  extraVolume: { supra: Record<Side, number>; infra: number };
  /** supratentorial midline shift at t (mm) */
  midlineShiftMm: number;
  /** hemisphere the midline is pushed AWAY from (the swollen side), or null */
  shiftFrom: Side | null;
  /**
   * the swelling of both hemispheres together as the midline shift it would give on one side (mm):
   * what the level of consciousness and an uncal herniation follow (Y2-13). Equal to the midline
   * shift when only one hemisphere swells; swelling of both pushes the brain down rather than
   * across, so it adds up here while the midline hardly moves.
   */
  massEffectMm: number;
  /**
   * the midline shift each hemisphere's own swelling would give if the other did not swell (mm): what
   * decides whether that hemisphere herniates, and when, so that the swelling of the other one never
   * takes its herniation away (U1-0). Equal to the midline shift when only one hemisphere swells
   */
  ownShiftMm: Record<Side, number>;
  /** relative change of ventricle size: < 0 compressed by swelling, > 0 enlarged (hydrocephalus / ex vacuo) */
  ventricleChange: number;
}

export const NO_EDEMA: EdemaState = {
  phase: 'none',
  swelling: {},
  cytotoxic: {},
  vasogenic: {},
  dwi: {},
  flair: {},
  extraVolume: { supra: { r: 0, l: 0 }, infra: 0 },
  midlineShiftMm: 0,
  shiftFrom: null,
  massEffectMm: 0,
  ownShiftMm: { r: 0, l: 0 },
  ventricleChange: 0,
};
