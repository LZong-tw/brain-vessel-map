import { describe, expect, it } from 'vitest';
import readmeZh from '../../README.md?raw';
import readmeEn from '../../README.en.md?raw';
import { VESSELS } from '../anatomy';
import { isMirroredInFlow, simulateHemodynamics, type CollateralGrade } from './hemodynamics';
import { isOccludable, simulate, type SimResult } from './simulate';

/**
 * X3-0, X3-13 (R1-8): the template brain and its territory atlas are not mirror images, and the
 * flow model took each artery's length and demand from them as they are. Where collaterals decide
 * the outcome, a left and a right occlusion of the same artery then ended differently: with good
 * collaterals a right calcarine occlusion left no lasting field defect and a right P2 occlusion a
 * quadrantanopia, while the left ones left a hemianopia. The flow model now mirrors the pial
 * arteries of the cerebral hemispheres (hemodynamics.ts, isMirroredInFlow).
 */
const GRADES: CollateralGrade[] = ['good', 'moderate', 'poor'];
const mirrorSide = (s: string | null) => (s === 'r' ? 'l' : s === 'l' ? 'r' : s);
const run = (vessel: string, collateral: CollateralGrade, tH: number) =>
  simulate({ occlusions: [{ vessel, severity: 1 }], variants: [], collateral, map: 93, tH, reperfusionH: null, decompression: false });
/** the listed signs among `ids`, with the body side seen from a left-sided lesion */
const signs = (r: SimResult, ids: string[], flip: boolean) =>
  r.symptoms
    .filter((s) => ids.includes(s.id))
    .map((s) => `${s.id}(${(flip ? mirrorSide(s.side) : s.side) ?? '-'})`)
    .sort();
const FIELD = ['hemianopia', 'quadrant_sup', 'quadrant_inf'];
const MOTOR = ['face_weak', 'arm_weak', 'leg_weak', 'arm_weak_proximal'];
/** the first day and the settled course; between them the time a deficit takes to settle can differ by a stop (see the README) */
const STOPS = [0.5, 3, 24, 720, 2160, 4320];

const MIRRORED_ARTERIES = VESSELS.filter((v) => v.side === 'r' && isMirroredInFlow(v) && v.kind !== 'collateral').map((v) => v.baseId);

describe('X3-0/13: a left and a right occlusion of the same cerebral pial artery end the same way', () => {
  it('the pial arteries of the hemispheres and their anastomoses are mirrored; the circle of Willis, the perforators and the posterior fossa are not', () => {
    const mirrored = VESSELS.filter((v) => v.side === 'r' && isMirroredInFlow(v)).map((v) => v.baseId);
    for (const id of ['aca_a2', 'aca_pericallosal', 'mca_m2_inf', 'mca_temporooccipital', 'pca_p2', 'pca_calcarine', 'lepto_pca_mca_occipital', 'lepto_aca_pca_callosal'])
      expect(mirrored, id).toContain(id);
    for (const id of ['mca_m1', 'pcomm', 'pca_p1', 'aca_a1', 'ica_terminal', 'lenticulostriate', 'acha', 'thalamogeniculate', 'pica', 'aica', 'sca', 'lepto_pica_aica', 'pontine_paramedian_caudal'])
      expect(mirrored, id).not.toContain(id);
  });

  // the pressure where each mirrored artery ends, for the mirrored occlusion: at HEAD the left
  // temporo-occipital artery (115 mm traced, against 98 mm on the right, feeding 26 % more tissue)
  // ended 7 mmHg lower than the right one with good collaterals after a calcarine occlusion. What
  // is left comes from the circle of Willis upstream, which keeps its traced lengths (~1.5 mmHg).
  it.each(GRADES)('mirrored occlusions give the same pressure at the end of every mirrored artery (%s collaterals)', (collateral) => {
    const hemo = (vessel: string | null, s: 'r' | 'l', map: number) =>
      simulateHemodynamics({ occlusions: vessel ? [{ vessel: `${vessel}_${s}`, severity: 1 }] : [], variants: [], map, collateral });
    for (const base of [null, ...MIRRORED_ARTERIES.filter((b) => isOccludable(`${b}_r`))]) {
      for (const map of [93, 60]) {
        const r = hemo(base, 'r', map);
        const l = hemo(base, 'l', map);
        for (const a of MIRRORED_ARTERIES) {
          const d = Math.abs(r.vesselPressure[`${a}_r`] - l.vesselPressure[`${a}_l`]);
          expect(d, `${base ?? 'no occlusion'} MAP ${map}: ${a} ends at ${r.vesselPressure[`${a}_r`].toFixed(1)} / ${l.vesselPressure[`${a}_l`].toFixed(1)} mmHg`).toBeLessThan(2);
        }
      }
    }
  });

  it.each(MIRRORED_ARTERIES.filter((b) => isOccludable(`${b}_r`)))('%s: the same field defect and weakness on both sides, at every grade, on the first day and once settled', (base) => {
    for (const collateral of GRADES) {
      for (const tH of STOPS) {
        const right = signs(run(`${base}_r`, collateral, tH), [...FIELD, ...MOTOR], true);
        const left = signs(run(`${base}_l`, collateral, tH), [...FIELD, ...MOTOR], false);
        expect(right, `${base} ${collateral} ${tH} h (right occlusion, sides mirrored)`).toEqual(left);
      }
    }
  });

  it('the calcarine artery and P2 with good collaterals: a lasting field defect on either side (R1-8)', () => {
    for (const s of ['r', 'l'] as const) {
      const contra = s === 'r' ? 'l' : 'r';
      for (const tH of [2160, 4320]) {
        const calcarine = run(`pca_calcarine_${s}`, 'good', tH);
        expect(signs(calcarine, FIELD, false), `calcarine ${s} ${tH} h`).toEqual([`quadrant_sup(${contra})`]);
        const p2 = run(`pca_p2_${s}`, 'good', tH);
        expect(signs(p2, FIELD, false), `P2 ${s} ${tH} h`).toEqual([`hemianopia(${contra})`]);
      }
    }
  });

  it('both calcarine arteries with good collaterals: the field defect is on both sides (upper quadrants, colour lost), not on one', () => {
    const r = simulate({
      occlusions: [
        { vessel: 'pca_calcarine_r', severity: 1 },
        { vessel: 'pca_calcarine_l', severity: 1 },
      ],
      variants: [],
      collateral: 'good',
      map: 93,
      tH: 2160,
      reperfusionH: null,
      decompression: false,
    });
    expect(signs(r, FIELD, false)).toEqual(['quadrant_sup(l)', 'quadrant_sup(r)']);
    expect(r.symptoms.map((s) => s.id)).toContain('achromatopsia');
    expect(r.syndromes.map((m) => `${m.def.id}_${m.side}`).sort()).toEqual(['pca_l', 'pca_r']);
  });

  it('the README says what is mirrored and what can still differ, in both languages', () => {
    expect(readmeEn).toMatch(/Left and right are mirror images for the cerebral pial arteries/);
    expect(readmeEn).not.toMatch(/a right calcarine or P2 occlusion leaves less lasting field loss than the left one/);
    expect(readmeZh).toMatch(/大腦表面的軟腦膜動脈左右對稱/);
    expect(readmeZh).not.toMatch(/右側距狀動脈或 P2 阻塞留下的永久視野缺損比左側少/);
  });
});
