/**
 * Z1-15, Z1-1: the prerolandic (precentral) branch of the MCA feeds the motor cortex of the
 * opposite face and arm. An occlusion of it classically weakens the face and hand with dysarthria
 * (and, on the left, may disturb speech output); as for the other distal MCA branches, how much
 * of that the collaterals prevent depends on their grade, not on the branch.
 *
 * Its leptomeningeal anastomosis joins the end of the callosomarginal artery, whose whole
 * territory (about three times the precentral artery's) set half of the anastomosis's capacity
 * (hemodynamics.ts), so the motor strip received far more collateral blood per mL/min of its own
 * territory than its neighbours on the same ACA–MCA border: with moderate collaterals a precentral
 * occlusion left no deficit at all, and with good ones the motor strip was the best-perfused part
 * of the superior-division territory, so a superior-division occlusion gave a Broca aphasia
 * without weakness.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { simulateHemodynamics, type CollateralGrade } from './hemodynamics';
import { simulate, type SimInput } from './simulate';

const GRADES: CollateralGrade[] = ['good', 'moderate', 'poor'];
const SIDES = ['r', 'l'] as const;
const opp = (s: 'r' | 'l') => (s === 'r' ? 'l' : 'r');
const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 0, reperfusionH: null, decompression: false, ...over });
const sev = (r: ReturnType<typeof simulate>, id: string, side: string | null) => r.symptoms.find((s) => s.id === id && s.side === side)?.sev ?? 0;
const labels = (r: ReturnType<typeof simulate>) => r.syndromes.filter((m) => !m.silent).map((m) => `${m.def.id}_${m.side ?? ''}`);
/** relative flow of a branch's own cortical bed (region × atlas territory) when that branch is occluded */
const ownRel = (branch: string, region: string, terr: string, side: 'r' | 'l', collateral: CollateralGrade) =>
  simulateHemodynamics({ occlusions: [{ vessel: `${branch}_${side}`, severity: 1 }], variants: [], map: 93, collateral }).bedRel[`${region}_${side}__${terr}`];

describe('Z1-15: an occlusion of the precentral branch behaves like the other distal MCA branches', () => {
  for (const side of SIDES) {
    it.each(GRADES)(`${side}, %s collaterals: its motor strip gets about the flow its neighbours get behind their own occlusions`, (c) => {
      const precentral = ownRel('mca_precentral', 'precentral_face_arm', 'MCAF', side, c);
      const neighbours = [
        ownRel('mca_central', 'postcentral_face_arm', 'MCAP', side, c),
        ownRel('mca_ant_parietal', 'supramarginal', 'MCAP', side, c),
        ownRel('mca_prefrontal', 'prefrontal_dorsolateral', 'MCAF', side, c),
      ];
      const mean = neighbours.reduce((a, b) => a + b, 0) / neighbours.length;
      expect(Math.abs(precentral - mean), `${precentral.toFixed(2)} vs ${neighbours.map((x) => x.toFixed(2)).join(', ')}`).toBeLessThan(0.07);
    });

    it(`${side}, moderate collaterals: weakness of the opposite face and arm with dysarthria at onset`, () => {
      const r = sim({ occlusions: [{ vessel: `mca_precentral_${side}`, severity: 1 }], collateral: 'moderate' });
      expect(sev(r, 'face_weak', opp(side))).toBeGreaterThanOrEqual(2);
      expect(sev(r, 'arm_weak', opp(side))).toBeGreaterThanOrEqual(2);
      expect(r.symptoms.some((s) => s.id === 'dysarthria')).toBe(true);
      expect(r.nihss.items[`5${opp(side)}`] ?? 0).toBeGreaterThanOrEqual(2);
      // the leg area (paracentral lobule, ACA) is spared
      expect(r.nihss.items[`6${opp(side)}`] ?? 0).toBe(0);
    });
  }

  it('moderate collaterals leave part of the motor strip alive, poor ones lose more of it', () => {
    const fin = (c: CollateralGrade) => sim({ occlusions: [{ vessel: 'mca_precentral_r', severity: 1 }], collateral: c, tH: 72 }).regions.precentral_face_arm_r.infarct;
    expect(fin('moderate')).toBeLessThan(fin('poor'));
    expect(fin('good')).toBeLessThan(fin('moderate'));
  });
});

describe('Z1-1: a superior-division occlusion weakens the face and arm whatever the collateral grade', () => {
  for (const side of SIDES) {
    it.each(GRADES)(`${side}, %s collaterals: face and arm weakness with the superior-division label at onset`, (c) => {
      const r = sim({ occlusions: [{ vessel: `mca_m2_sup_${side}`, severity: 1 }], collateral: c });
      expect(sev(r, 'face_weak', opp(side))).toBeGreaterThanOrEqual(2);
      expect(sev(r, 'arm_weak', opp(side))).toBeGreaterThanOrEqual(2);
      expect(labels(r)).toContain(`mca_superior_${side}`);
    });
  }
  it('on the left, with the Broca aphasia', () => {
    const r = sim({ occlusions: [{ vessel: 'mca_m2_sup_l', severity: 1 }], collateral: 'good' });
    expect(r.symptoms.some((s) => s.id === 'aphasia_broca')).toBe(true);
  });
  it('the superior-division TIA template no longer says good collaterals would spare the weakness, and they do not', () => {
    const sc = SCENARIOS.find((x) => x.id === 'tia_l_mca')!;
    expect(sc.summary.en).not.toMatch(/with good ones/);
    expect(sc.summary.zh).not.toMatch(/側枝很好時/);
    const attack = sim({ occlusions: sc.occlusions, collateral: 'good', tH: 0 });
    expect(sev(attack, 'arm_weak', 'r')).toBeGreaterThanOrEqual(2);
    expect(sim({ occlusions: sc.occlusions, collateral: 'good', tH: 24 }).nihss.total).toBe(0);
  });
});
