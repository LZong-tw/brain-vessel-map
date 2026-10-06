/**
 * W1-0, W1-7: when a brainstem lesion counts as the loss of a pathway on its side, and when the two
 * sides together are the bottleneck that leaves little to take over.
 *
 *   • W1-0: the brainstem's compact tracts and nuclei grade their own deficits below the symptom
 *     threshold (Z2-8), but a region counts as a dead source of a function — a lesion of that
 *     pathway on its side, for whether the deficit is one- or two-sided — from the symptom threshold,
 *     as every other region does. The posterior cerebral artery's fifth of a cerebral peduncle or the
 *     vertebral artery's edge of the medial medulla (meant to stay silent, C7-F3) on one side does
 *     not stop the other hemisphere's limb weakness from recovering as a one-sided one.
 *   • W1-7: the bottleneck (both corticospinal tracts and their cortico-reticular backups cut
 *     together in the cerebral peduncles or the ventral pons) is graded by how much of both sides is
 *     infarcted: none at the symptom threshold, in full where the model calls the classical
 *     locked-in syndrome (both ventral pontine halves 40 % infarcted). Bilateral pontine infarcts
 *     leave severe deficits and a poorer outcome (Kumral E et al. J Neurol 2002;249:1659–1670), but
 *     a small infarct of both peduncles or of the ventral pons after a reopening is not a locked-in
 *     syndrome.
 */
import { describe, expect, it } from 'vitest';
import { REGION_BY_ID } from '../anatomy';
import type { Occlusion } from './hemodynamics';
import { lesionSides, symptomCompensation } from './recovery';
import { simulate, type SimInput, type SimResult } from './simulate';

const input = (occlusions: string[], collateral: SimInput['collateral'], over: Partial<SimInput> = {}): SimInput => ({
  occlusions: occlusions.map((vessel): Occlusion => ({ vessel, severity: 1 })),
  variants: [],
  collateral,
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
  ...over,
});
const at = (i: SimInput, tH: number) => simulate({ ...i, tH });
const weak = (r: SimResult, side: 'r' | 'l') => r.symptoms.filter((s) => ['face_weak', 'arm_weak', 'leg_weak'].includes(s.id) && s.side === side);

describe('a small brainstem edge on the other side does not slow a hemispheric limb weakness (W1-0)', () => {
  // [name, hemispheric occlusion, the other side's posterior occlusion, collaterals, the body side of the hemispheric weakness]
  const PAIRS: [string, string, string, SimInput['collateral'], 'r' | 'l'][] = [
    ['left A2 + right P2, poor', 'aca_a2_l', 'pca_p2_r', 'poor', 'r'],
    ['right A2 + left P2, poor', 'aca_a2_r', 'pca_p2_l', 'poor', 'l'],
    ['right M2 superior + left P2, moderate', 'mca_m2_sup_r', 'pca_p2_l', 'moderate', 'l'],
    ['right M2 superior + left P2, poor', 'mca_m2_sup_r', 'pca_p2_l', 'poor', 'l'],
    ['right M2 superior + left V4, moderate', 'mca_m2_sup_r', 'va_v4_dist_l', 'moderate', 'l'],
    ['left M2 superior + right V4, moderate', 'mca_m2_sup_l', 'va_v4_dist_r', 'moderate', 'r'],
    ['right M1 + left P2, poor (herniated)', 'mca_m1_r', 'pca_p2_l', 'poor', 'l'],
    ['left A2 + right P2, good', 'aca_a2_l', 'pca_p2_r', 'good', 'r'],
  ];
  // (the NIHSS at 3 months, when the reviewers found it; at other times a posterior occlusion can
  // change the hemispheric infarct itself by a percent through the collaterals, and a severity just
  // at a rounding step with it)
  it.each(PAIRS)('%s: the hemispheric face, arm and leg weakness recover as without the posterior occlusion', (_name, hemi, post, collateral, side) => {
    for (const tH of [720, 2160, 4320]) {
      const alone = at(input([hemi], collateral), tH);
      const both = at(input([hemi, post], collateral), tH);
      if (tH === 2160)
        for (const item of ['4', `5${side}`, `6${side}`]) expect(both.nihss.items[item] ?? 0, `${item} at ${tH} h`).toBeLessThanOrEqual(alone.nihss.items[item] ?? 0);
      for (const s of weak(alone, side)) {
        const with2 = weak(both, side).find((x) => x.id === s.id);
        expect(with2?.recovery?.bilateral ?? false, `${s.id} ${side} at ${tH} h`).toBe(s.recovery?.bilateral ?? false);
        expect(with2?.recovery?.compensated ?? 1, `${s.id} ${side} at ${tH} h`).toBeGreaterThanOrEqual((s.recovery?.compensated ?? 0) - 1e-3);
      }
    }
  });

  it('a compact region below the symptom threshold is not a dead source of its functions for the other side', () => {
    const cortex = REGION_BY_ID.paracentral_l;
    for (const edge of [0.15, 0.2, 0.24]) {
      const lesions = lesionSides({ paracentral_l: 1, midbrain_peduncle_r: edge, medulla_medial_r: edge });
      const leg = symptomCompensation('leg_weak', cortex, 1, 1, lesions, 2160);
      expect(leg.bilateral, `edge ${edge}`).toBe(false);
    }
    // from the threshold it is (a hemispheric infarct with a peduncle infarct on the other side)
    expect(symptomCompensation('leg_weak', cortex, 1, 1, lesionSides({ paracentral_l: 1, midbrain_peduncle_r: 0.25 }), 2160).bilateral).toBe(true);
  });

  it('nor is the passing weakness of a thalamic infarct, nor a lateral medullary infarct for the facial weakness of the other hemisphere', () => {
    const motor = REGION_BY_ID.precentral_face_arm_r;
    const thalamus = lesionSides({ precentral_face_arm_r: 1, thalamus_ventrolateral_l: 1 });
    expect(symptomCompensation('arm_weak', motor, 1, 1, thalamus, 2160).bilateral).toBe(false);
    expect(symptomCompensation('face_weak', motor, 1, 1, thalamus, 2160).bilateral).toBe(false);
    // the left lateral medulla weakens the left face, as the right motor cortex does: one pathway
    expect(symptomCompensation('face_weak', motor, 1, 1, lesionSides({ precentral_face_arm_r: 1, medulla_lateral_l: 1 }), 2160).bilateral).toBe(false);
    // the right one weakens the right face: the left hemisphere's pathway, so both sides
    expect(symptomCompensation('face_weak', motor, 1, 1, lesionSides({ precentral_face_arm_r: 1, medulla_lateral_r: 1 }), 2160).bilateral).toBe(true);
  });
});

describe('the bottleneck is graded by how much of both sides is infarcted (W1-7)', () => {
  const TIP_BRIDGED = input(['basilar_tip'], 'moderate', {
    reperfusionH: 4.5,
    treatment: { method: 'bridging', grade: '2c', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 },
  });
  const SMALL: [string, SimInput][] = [
    ['top of the basilar, moderate collaterals, bridging eTICI 2c at 4.5 h (both peduncles about a quarter infarcted)', TIP_BRIDGED],
    ['upper basilar, good collaterals, thrombectomy at 4.5 h (a fifth of both rostral bases)', input(['basilar_upper'], 'good', { reperfusionH: 4.5 })],
    ['both P2, good collaterals (a fifth of both peduncles)', input(['pca_p2_r', 'pca_p2_l'], 'good')],
    ['mid-basilar, moderate collaterals, thrombectomy at 4.5 h (a fifth of both caudal bases)', input(['basilar_mid'], 'moderate', { reperfusionH: 4.5 })],
  ];
  it.each(SMALL)('%s: no bottleneck, and no limb that cannot lift against gravity at 3 and 6 months', (_name, i) => {
    for (const tH of [720, 2160, 4320]) {
      const r = at(i, tH);
      expect(
        r.symptoms.filter((s) => s.recovery?.bottleneck).map((s) => `${s.id}/${s.side}`),
        `${tH} h`,
      ).toEqual([]);
      if (tH >= 2160) for (const item of ['5r', '5l', '6r', '6l']) expect(r.nihss.items[item] ?? 0, `${item} at ${tH} h`).toBeLessThanOrEqual(2);
    }
  });

  it('the bridged top of the basilar (0.8 mL) recovers about as a small one-sided infarct would, not to a lasting quadriparesis', () => {
    const r = at(TIP_BRIDGED, 2160);
    expect(r.volumes.finalInfarct).toBeLessThan(1);
    for (const item of ['5r', '5l', '6r', '6l']) expect(r.nihss.items[item] ?? 0, item).toBeLessThanOrEqual(1);
  });

  it.each([
    ['locked-in (mid-basilar, poor collaterals)', input(['basilar_mid'], 'poor')],
    ['incomplete locked-in (mid-basilar, good collaterals)', input(['basilar_mid'], 'good')],
    ['top of the basilar, poor collaterals', input(['basilar_tip'], 'poor')],
    ['both caudal pontine perforator groups', input(['pontine_paramedian_caudal_r', 'pontine_paramedian_caudal_l'], 'good')],
  ])('%s: both sides mostly infarcted keep the bottleneck', (_name, i) => {
    const r = at(i, 2160);
    for (const side of ['r', 'l'] as const) {
      const arm = r.symptoms.find((s) => s.id === 'arm_weak' && s.side === side);
      expect(arm?.recovery?.bottleneck, side).toBe(true);
    }
  });

  it('the bottleneck takes away more as more of both sides is lost', () => {
    const basis = REGION_BY_ID.pons_caudal_basis_l;
    const share = (x: number) => symptomCompensation('arm_weak', basis, x, x, lesionSides({ pons_caudal_basis_l: x, pons_caudal_basis_r: x }), 4320).compensated;
    expect(share(0.3)).toBeGreaterThan(share(0.35));
    expect(share(0.35)).toBeGreaterThan(share(0.4));
    expect(share(0.4)).toBeCloseTo(share(0.6), 9);
    // at the symptom threshold both sides are a two-sided lesion, but not yet a bottleneck
    const thr = symptomCompensation('arm_weak', basis, 0.25, 0.25, lesionSides({ pons_caudal_basis_l: 0.25, pons_caudal_basis_r: 0.25 }), 4320);
    expect([thr.bilateral, thr.bottleneck]).toEqual([true, false]);
  });
});
