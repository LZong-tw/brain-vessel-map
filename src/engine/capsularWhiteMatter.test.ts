/**
 * Z1-7: behind a proximal MCA occlusion the striatum (end-artery grey matter) is lost early, the
 * internal capsule beside it only over hours.
 *
 *   • Proximal MCA occlusions that block the lenticulostriate arteries almost always infarct the
 *     striatum even when thrombectomy reopens the artery (Kleine JF et al. J Neurointerv Surg
 *     2017;9:234–239, PMID 26940316); in the rat the caudoputamen is lost first (Memezawa 1992,
 *     Garcia 1995).
 *   • The capsule beside it is often spared: of 92 patients with a proximal MCA occlusion reopened
 *     by thrombectomy, all had striatal ischaemia but only 45 (48.9 %) the corticospinal part of
 *     the internal capsule (median onset to reperfusion of the lenticulostriate arteries 234 min);
 *     every hour of delay to that reperfusion raised the odds about 3.5-fold (aOR 3.47 per hour),
 *     beyond 5 h capsular infarction was likely (> 80 %), the collateral grade made no
 *     difference, and the patients whose capsule was spared had less arm weakness and were more
 *     often independent (Kaesmacher J et al. Stroke 2021;52:1570–1579, PMID 33827247).
 *   • White matter infarction commonly begins later than grey matter infarction after MCA
 *     occlusion (Kleine JF et al. Stroke 2017;48:2776–2783, PMID 28855390).
 */
import { describe, expect, it } from 'vitest';
import type { CollateralGrade } from './hemodynamics';
import { simulate, type SimInput } from './simulate';
import { DEFAULT_TREATMENT } from './treatment';

const GRADES: CollateralGrade[] = ['good', 'moderate', 'poor'];
const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 2160, reperfusionH: null, decompression: false, ...over });
/** an M1 occlusion reopened completely by thrombectomy at `reperfusionH` (null: never) */
const m1 = (side: 'r' | 'l', collateral: CollateralGrade, reperfusionH: number | null, tH = 2160) =>
  sim({ occlusions: [{ vessel: `mca_m1_${side}`, severity: 1 }], collateral, reperfusionH, tH, ...(reperfusionH === null ? {} : { treatment: DEFAULT_TREATMENT }) });
const inf = (side: 'r' | 'l', collateral: CollateralGrade, reperfusionH: number | null, region: string) =>
  m1(side, collateral, reperfusionH, 72).regions[`${region}_${side}`].infarct;
const opp = (s: 'r' | 'l') => (s === 'r' ? 'l' : 'r');

describe('the striatum is lost early, the internal capsule over hours (Z1-7)', () => {
  for (const side of ['r', 'l'] as const) {
    it.each(GRADES)(`${side} M1, %s collaterals: reopened at 30 min the putamen is largely infarcted, the posterior limb of the capsule is not`, (c) => {
      expect(inf(side, c, 0.5, 'putamen')).toBeGreaterThan(0.6);
      expect(inf(side, c, 0.5, 'ic_posterior_limb')).toBeLessThan(0.02);
      expect(inf(side, c, 0.5, 'ic_genu')).toBeLessThan(0.02);
    });

    it.each(GRADES)(`${side} M1, %s collaterals: the capsular infarct grows with every hour of delay to reopening, as in thrombectomy series`, (c) => {
      const untreated = inf(side, c, null, 'ic_posterior_limb');
      // untreated, its lenticulostriate half is lost as before (the anterior choroidal half is not behind the clot)
      expect(untreated).toBeGreaterThan(0.45);
      const share = (h: number) => inf(side, c, h, 'ic_posterior_limb') / untreated;
      // spared when reopened within 2 h, about half lost by 4 h (half of the patients reopened at a
      // median of 3.9 h had capsular infarction), most by 5 h and nearly all by 6 h
      expect(share(1)).toBeLessThan(0.02);
      expect(share(2)).toBeLessThan(0.2);
      expect(share(4)).toBeGreaterThan(0.35);
      expect(share(4)).toBeLessThan(0.75);
      expect(share(5)).toBeGreaterThan(0.7);
      expect(share(6)).toBeGreaterThan(0.85);
      let prev = 0;
      for (const h of [1, 2, 3, 4, 5, 6, 8]) {
        expect(share(h), `${h} h`).toBeGreaterThanOrEqual(prev);
        prev = share(h);
      }
    });
  }

  it('the collateral grade does not change when the capsule is lost (no collaterals reach it)', () => {
    for (const h of [2, 3, 4, 5, 6]) {
      const [g, m, p] = GRADES.map((c) => inf('r', c, h, 'ic_posterior_limb'));
      expect(Math.abs(g - p), `${h} h`).toBeLessThan(0.02);
      expect(Math.abs(g - m), `${h} h`).toBeLessThan(0.02);
    }
  });
});

describe('early reopening spares the arm (Z1-7)', () => {
  /** the NIHSS motor-arm item of the arm opposite the occlusion, at 3 months */
  const arm = (side: 'r' | 'l', c: CollateralGrade, h: number | null) => m1(side, c, h).nihss.items[`5${opp(side)}`] ?? 0;

  for (const side of ['r', 'l'] as const) {
    it.each(GRADES)(`${side} M1, %s collaterals: reopened within 1 h the arm is much better at 3 months than reopened at 6 h or never`, (c) => {
      const early = Math.max(arm(side, c, 0.5), arm(side, c, 1));
      const late = arm(side, c, 6);
      const never = arm(side, c, null);
      expect(early).toBeLessThanOrEqual(1);
      expect(late).toBeGreaterThanOrEqual(early + 2);
      expect(never).toBeGreaterThanOrEqual(early + 2);
    });
  }

  it('the template reopened at 2 h keeps the arm better than the untreated template', () => {
    expect(arm('l', 'good', 2)).toBeLessThan(arm('l', 'good', null));
  });

  it('the rescued capsule regains its function over hours, like the tissue around it, not at the instant of reopening', () => {
    const just = m1('r', 'moderate', 1, 1.05);
    const day = m1('r', 'moderate', 1, 24);
    expect(just.regions.ic_posterior_limb_r.dys).toBeGreaterThan(0.25);
    expect(day.regions.ic_posterior_limb_r.dys).toBeLessThan(just.regions.ic_posterior_limb_r.dys);
  });
});

describe('what the capsular course leaves alone (Z1-7)', () => {
  it('an M1 occlusion that clears by itself within 15 min leaves the capsule intact but the striatum not', () => {
    const r = sim({ occlusions: [{ vessel: 'mca_m1_r', severity: 1, fromH: 0, toH: 0.25 }], collateral: 'moderate', tH: 72 });
    expect(r.regions.ic_posterior_limb_r.infarct).toBe(0);
    expect(r.regions.putamen_r.infarct).toBeGreaterThan(0.3);
  });

  // W2-2: one branch feeds part of the same white matter, which is lost on the same course behind
  // it as behind the whole bundle (the former fast course of a single perforator left a capsular
  // infarct after 30 min where the whole bundle closed for 2 h left none)
  it('a capsular lacune is lost on the capsule\'s own course: closed for 30 min or 2 h it leaves nothing, for 4 h it leaves its infarct', () => {
    const lacune = (toH: number) => sim({ occlusions: [{ vessel: 'lenticulostriate_r', severity: 1, branch: true, fromH: 0, toH }], tH: 72 });
    expect(lacune(0.5).regions.ic_posterior_limb_r.infarct).toBe(0);
    expect(lacune(2).regions.ic_posterior_limb_r.infarct).toBe(0);
    expect(lacune(4).regions.ic_posterior_limb_r.infarct).toBeGreaterThan(0);
  });
});
