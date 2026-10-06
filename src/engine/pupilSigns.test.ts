/**
 * W1-4, W1-11: the signs of the descending sympathetic fibres in the midbrain.
 *
 *   • W1-4: one pupil cannot be wide (a third-nerve palsy) and small (a Horner syndrome) at once. With
 *     both its constrictor and its dilator denervated it is mid-position and unreactive, and the
 *     complete ptosis of the third-nerve palsy covers the mild ptosis of the Horner syndrome: an
 *     oculomotor palsy with a Horner syndrome on the same side can look pupil-sparing (Serdaru M,
 *     Schaison M, Lhermitte F. Ann Neurol 1983;14:697–698). So the eye of a third-nerve palsy shows no
 *     Horner syndrome of its own; the sweating loss of the same lesion stays.
 *   • W1-11: a posterior cerebral artery occlusion usually gives a field defect, a hemisensory loss and
 *     neuropsychological deficits, and a Horner syndrome with it had not been reported before a case
 *     of proximal PCA occlusion that infarcted the anterolateral midbrain and the thalamus (Bassetti C,
 *     Staikov IN. Stroke 1995;26:702–704); in 407 patients with posterior circulation ischaemia a
 *     Horner syndrome went with the proximal (medullary) territory, a field defect with the distal one
 *     (Searls DE et al. Arch Neurol 2012;69:346–351). The P2 segment's share of the lateral midbrain
 *     tegmentum does not by itself give them.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import { simulate, type SimInput, type SimResult } from './simulate';

const scenario = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return {
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH: sc.tH ?? 24,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  };
};
const input = (occlusions: string[], collateral: SimInput['collateral'], over: Partial<SimInput> = {}): SimInput => ({
  occlusions: occlusions.map((vessel) => ({ vessel, severity: 1 })),
  variants: [],
  collateral,
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
  ...over,
});
const STOPS = TIME_STOPS.map((s) => s.h);
const all = (r: SimResult) => [...r.symptoms, ...r.unexaminable];
const on = (r: SimResult, id: string, side: 'r' | 'l') => all(r).some((s) => s.id === id && s.side === side);

describe('an eye with a third-nerve palsy shows no Horner syndrome of its own (W1-4)', () => {
  it.each([
    ['r_m1_malignant', scenario('r_m1_malignant'), 'r'],
    ['r_ica_t', scenario('r_ica_t'), 'r'],
    ['ica_isolated', scenario('ica_isolated'), 'r'],
    ['left M1, poor collaterals, reopened at 24 h', input(['mca_m1_l'], 'poor', { reperfusionH: 24 }), 'l'],
  ] as const)('%s, herniated: the third-nerve palsy stays, without a Horner syndrome on that eye; the half-body sweating loss stays', (_name, i, side) => {
    for (const tH of [72, 720, 2160, 4320]) {
      const r = simulate({ ...i, tH });
      expect(on(r, 'cn3_palsy', side), `${tH} h`).toBe(true);
      expect(on(r, 'horner', side), `${tH} h`).toBe(false);
      expect(on(r, 'hypohidrosis', side), `${tH} h`).toBe(true);
    }
  });

  it('both M1: third-nerve palsies on both sides, no Horner syndrome on either', () => {
    const r = simulate({ ...input(['mca_m1_r', 'mca_m1_l'], 'good'), tH: 2160 });
    for (const side of ['r', 'l'] as const) {
      expect(on(r, 'cn3_palsy', side), side).toBe(true);
      expect(on(r, 'horner', side), side).toBe(false);
    }
  });

  it('the top of the basilar: the eye of the third-nerve palsy has no Horner syndrome at any time', () => {
    for (const tH of STOPS) {
      const r = simulate({ ...scenario('basilar_tip'), tH });
      for (const side of ['r', 'l'] as const) if (on(r, 'cn3_palsy', side)) expect(on(r, 'horner', side), `${side} ${tH} h`).toBe(false);
    }
  });

  it('a Horner syndrome without a third-nerve palsy is still listed (lateral medulla, SCA)', () => {
    expect(on(simulate({ ...input(['pica_l'], 'good'), tH: 2160 }), 'horner', 'l')).toBe(true);
    expect(on(simulate({ ...input(['sca_r'], 'good'), tH: 2160 }), 'horner', 'r')).toBe(true);
  });
});

describe('a P2 occlusion gives no Horner syndrome or half-body sweating loss (W1-11)', () => {
  it.each([
    ['l_pca', scenario('l_pca'), ['l']],
    ['fetal_pca', scenario('fetal_pca'), ['r']],
    ['right P2, good collaterals', input(['pca_p2_r'], 'good'), ['r']],
    ['right P2, poor collaterals', input(['pca_p2_r'], 'poor'), ['r']],
    ['both P2, good collaterals', input(['pca_p2_r', 'pca_p2_l'], 'good'), ['r', 'l']],
    ['both P2, poor collaterals', input(['pca_p2_r', 'pca_p2_l'], 'poor'), ['r', 'l']],
  ] as const)('%s: at no time', (_name, i, sides) => {
    for (const tH of STOPS) {
      const r = simulate({ ...i, tH });
      for (const side of sides) {
        expect(on(r, 'horner', side), `horner ${side} ${tH} h`).toBe(false);
        expect(on(r, 'hypohidrosis', side), `hypohidrosis ${side} ${tH} h`).toBe(false);
      }
    }
  });

  it('a proximal PCA (P1) occlusion with poor collaterals, which infarcts more of the lateral midbrain, still can (Bassetti 1995)', () => {
    const r = simulate({ ...input(['pca_p1_l'], 'poor'), tH: 2160 });
    expect(r.regions.midbrain_lateral_l.infarct).toBeGreaterThan(0.35);
    expect(on(r, 'horner', 'l')).toBe(true);
    expect(on(r, 'hypohidrosis', 'l')).toBe(true);
  });
});
