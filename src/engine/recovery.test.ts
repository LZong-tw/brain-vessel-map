import { describe, expect, it } from 'vitest';
import { BED_BY_ID, BEDS, REGIONS, REGION_BY_ID } from '../anatomy';
import { DEFAULT_REDUNDANCY, redundancyFor } from '../anatomy/redundancy';
import { aggregateSymptoms, estimateNihss, type SymptomItem } from './clinical';
import { compensationProgress, lesionSides, symptomCompensation } from './recovery';
import { simulate, type SimInput, type SimResult } from './simulate';

const occl = (...ids: string[]) => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false, ...over });
const find = (r: SimResult, id: string, side: SymptomItem['side']) => r.symptoms.find((s) => s.id === id && s.side === side);
const sev = (r: SimResult, id: string, side: SymptomItem['side']) => find(r, id, side)?.sev ?? 0;
const maxOf = (m: Record<string, number>) => Object.values(m).reduce((a, x) => Math.max(a, x), 0);

const L_M1 = { occlusions: occl('mca_m1_l') };
const BASILAR = { occlusions: occl('basilar_mid') };
const FOVILLE = { occlusions: occl('pontine_paramedian_caudal_l') };

describe('compensation of lost function', () => {
  // Y1-1: the arm's weakness comes from half of the posterior limb of the internal capsule, where the
  // corticospinal tract converges: plegic in the first week, it recovers to a moderate weakness, not
  // to a drift (Shelton & Reding 2001), while the leg recovers further
  it('an untreated left M1 infarct improves by 3 months, the leg more than the arm, the arm more than fine finger control', () => {
    const d1 = sim({ ...L_M1, tH: 24 });
    const d3 = sim({ ...L_M1, tH: 72 });
    const m3 = sim({ ...L_M1, tH: 2160 });
    expect(m3.nihss.total).toBeLessThan(d1.nihss.total);
    expect(sev(m3, 'arm_weak', 'r')).toBeLessThan(sev(d3, 'arm_weak', 'r'));
    expect(sev(m3, 'arm_weak', 'r')).toBe(2);
    expect(sev(m3, 'leg_weak', 'r')).toBeLessThan(sev(d1, 'leg_weak', 'r'));
    expect(sev(m3, 'leg_weak', 'r')).toBeLessThan(sev(m3, 'arm_weak', 'r'));
    const arm = find(m3, 'arm_weak', 'r')?.recovery;
    expect(arm?.kind).toBe('parallel');
    expect(arm?.bilateral).toBe(false);
    // where the symptom list tells gross arm weakness from a clumsy hand, the hand lags behind
    if (find(d1, 'hand_clumsy', 'r')) {
      const hand = find(m3, 'hand_clumsy', 'r');
      expect(hand, 'the clumsy hand is still there').toBeDefined();
      expect(hand!.recovery?.kind).toBe('fine');
      expect(arm!.compensated).toBeGreaterThan(hand!.recovery!.compensated);
    }
  });

  it('gross arm movement is taken over better than fine finger control', () => {
    const region = REGION_BY_ID.precentral_face_arm_l;
    const lesions = lesionSides({ precentral_face_arm_l: 1 });
    const arm = symptomCompensation('arm_weak', region, 1, 1, lesions, 2160);
    const hand = symptomCompensation('hand_clumsy', region, 1, 1, lesions, 2160);
    const leg = symptomCompensation('leg_weak', REGION_BY_ID.paracentral_l, 1, 1, lesionSides({ paracentral_l: 1 }), 2160);
    expect(arm.compensated).toBeGreaterThan(2 * hand.compensated);
    expect(leg.compensated).toBeGreaterThan(arm.compensated);
  });

  it('keeps improving, most of it by 3 months', () => {
    const at = (tH: number) => sim({ ...L_M1, tH }).nihss.total;
    expect(at(720)).toBeLessThanOrEqual(at(336));
    expect(at(2160)).toBeLessThanOrEqual(at(720));
    expect(at(4320)).toBeLessThanOrEqual(at(2160));
    expect(compensationProgress(2160)).toBeGreaterThan(0.8);
    expect(compensationProgress(4320)).toBeGreaterThan(compensationProgress(2160));
    expect(compensationProgress(4320)).toBeLessThan(1);
  });

  it('a bilateral ventral pontine infarct (locked-in) recovers little', () => {
    // poor collaterals: the pons is fully infarcted within the first hours, so any later change
    // is compensation (with better collaterals part of the 24 h deficit is penumbra that survives)
    const d1 = sim({ ...BASILAR, collateral: 'poor', tH: 24 });
    const m3 = sim({ ...BASILAR, collateral: 'poor', tH: 2160 });
    expect(m3.nihss.total).toBeGreaterThanOrEqual(0.8 * d1.nihss.total);
    for (const side of ['r', 'l'] as const) {
      const arm = find(m3, 'arm_weak', side)?.recovery;
      expect(arm?.bilateral).toBe(true);
      expect(arm?.bottleneck).toBe(true);
      expect(arm!.compensated).toBeLessThan(0.1);
    }
    // relative recovery is far smaller than after a hemispheric stroke
    const lm1 = (tH: number) => sim({ ...L_M1, tH }).nihss.total;
    expect(m3.nihss.total / d1.nihss.total).toBeGreaterThan(lm1(2160) / lm1(24));
  });

  it('Foville: the abducens / gaze palsy does not improve, the contralateral hemiparesis does', () => {
    const d1 = sim({ ...FOVILLE, tH: 24 });
    for (const tH of [2160, 4320]) {
      const late = sim({ ...FOVILLE, tH });
      for (const id of ['cn6_palsy', 'gaze_palsy_horizontal']) {
        const s = find(late, id, 'l');
        expect(s, `${id} at ${tH} h`).toBeDefined();
        expect(s!.sev).toBeGreaterThanOrEqual(sev(d1, id, 'l'));
        expect(s!.recovery?.kind).toBe('fcp');
        expect(s!.recovery?.compensated).toBe(0);
      }
      expect(sev(late, 'arm_weak', 'r')).toBeLessThan(sev(d1, 'arm_weak', 'r'));
      expect(find(late, 'arm_weak', 'r')?.recovery?.bilateral).toBe(false);
    }
  });

  it('one-sided loss compensates better than loss on both sides', () => {
    const region = REGION_BY_ID.precentral_face_arm_l;
    const one = lesionSides({ precentral_face_arm_l: 1 });
    const both = lesionSides({ precentral_face_arm_l: 1, precentral_face_arm_r: 1 });
    const uni = symptomCompensation('arm_weak', region, 1, 1, one, 2160);
    const bi = symptomCompensation('arm_weak', region, 1, 1, both, 2160);
    expect(uni.bilateral).toBe(false);
    expect(bi.bilateral).toBe(true);
    expect(bi.bottleneck).toBe(false);
    expect(uni.compensated).toBeGreaterThan(2 * bi.compensated);
    // only the dead part of a region's dysfunction is compensated
    expect(symptomCompensation('arm_weak', region, 1, 0.5, one, 2160).compensated).toBeCloseTo(uni.compensated / 2, 6);
  });

  it('unknown symptoms default to partial, unilateral-only compensation; nuclei are the final common pathway', () => {
    expect(redundancyFor('some_new_symptom')).toEqual(DEFAULT_REDUNDANCY);
    expect(DEFAULT_REDUNDANCY.kind).toBe('partial');
    expect(DEFAULT_REDUNDANCY.bi).toBe(0);
    expect(DEFAULT_REDUNDANCY.uni).toBeGreaterThan(0);
    // jaw muscles are bilaterally innervated, but the trigeminal motor nucleus has no backup
    expect(redundancyFor('jaw_weak').kind).toBe('bilateral');
    expect(redundancyFor('jaw_weak', 'pons_rostral_lateral').kind).toBe('fcp');
  });
});

describe('temporary dysfunction (oedema, diaschisis)', () => {
  it('silences surviving tissue while the oedema lasts, and is gone by 1 month', () => {
    const d3 = sim({ ...L_M1, tH: 72 });
    expect(maxOf(d3.recovery.extraDys)).toBeGreaterThan(0.05);
    // it is dysfunction on top of the core, the penumbra and the stabilised penumbra still
    // regaining function (R6-11) or still silent past the time it is at risk (W2-10), of tissue
    // that is alive
    for (const b of BEDS) {
      const bs = d3.beds[b.id];
      const x = d3.recovery.extraDys[b.id] ?? 0;
      expect(bs.dys, b.id).toBeCloseTo(Math.min(1, bs.frac.core + bs.frac.penumbra + bs.regaining + bs.holding + x), 9);
      expect(x, b.id).toBeLessThanOrEqual(Math.max(0, 1 - bs.infarct - bs.frac.penumbra - bs.regaining - bs.holding) + 1e-9);
    }
    const m1 = sim({ ...L_M1, tH: 720 });
    expect(maxOf(m1.recovery.extraDys)).toBeLessThan(0.02);
    // what remains at 1 month is the fading remote depression, not oedema
    for (const [bed, x] of Object.entries(m1.recovery.extraDys)) expect(x - (m1.recovery.diaschisisDys[bed] ?? 0), bed).toBeLessThan(1e-3);
    expect(maxOf(sim({ ...L_M1, tH: 2160 }).recovery.extraDys)).toBe(0);
  });

  it('makes the early deficit worse than the infarct alone', () => {
    const d3 = sim({ ...L_M1, tH: 72 });
    // the same state without the temporarily silenced tissue
    const dysWithout: Record<string, number> = {};
    const inf: Record<string, number> = {};
    for (const r of REGIONS) {
      let d = 0;
      let w = 0;
      for (const bid of r.beds) {
        const vol = BED_BY_ID[bid].volume || 1;
        d += (d3.beds[bid].frac.core + d3.beds[bid].frac.penumbra) * vol;
        w += vol;
      }
      dysWithout[r.id] = d / (w || 1);
      inf[r.id] = d3.regions[r.id].infarct;
    }
    const without = aggregateSymptoms(dysWithout, inf, 72);
    expect(d3.nihss.total).toBeGreaterThan(estimateNihss(without).total);
    // … and it is gone once the oedema has settled
    const w4 = sim({ ...L_M1, tH: 720 });
    for (const r of REGIONS) expect(w4.regions[r.id].dys, r.id).toBeLessThan(w4.regions[r.id].infarct + 0.02);
  });

  it('adds mild, silent crossed cerebellar diaschisis after a motor infarct', () => {
    const d3 = sim({ ...L_M1, tH: 72 });
    const ccd = BEDS.filter((b) => (d3.cascade.bedEffects[b.id] ?? []).some((e) => e.kind === 'diaschisis'));
    expect(ccd.length).toBeGreaterThan(0);
    for (const b of ccd) {
      expect(d3.recovery.diaschisisDys[b.id] ?? 0, b.id).toBeGreaterThan(0.05);
      expect(d3.regions[b.region].dys, b.region).toBeLessThan(0.25);
    }
    expect(d3.symptoms.some((s) => s.sources.some((r) => ccd.some((b) => b.region === r)))).toBe(false);
  });
});

describe('the hyperacute phase is unchanged', () => {
  const cases: Partial<SimInput>[] = [
    L_M1,
    BASILAR,
    FOVILLE,
    { occlusions: occl('mca_m1_r'), collateral: 'poor' },
    { occlusions: occl('mca_m1_l'), reperfusionH: 2 },
    { occlusions: occl('pica_r'), collateral: 'poor' },
    { occlusions: [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }] },
  ];
  it.each([0, 0.25, 1, 3, 4.5, 6])('at %s h: no temporary dysfunction or compensation', (tH) => {
    expect(compensationProgress(tH)).toBe(0);
    for (const c of cases) {
      const r = sim({ ...c, tH });
      expect(r.recovery.extraDys).toEqual({});
      expect(r.recovery.compensated).toEqual({});
      expect(r.recovery.progress).toBe(0);
      // dysfunction is exactly core + penumbra (with the stabilised penumbra still regaining its
      // function, R6-11), as before the recovery model
      for (const b of BEDS) {
        const bs = r.beds[b.id];
        expect(bs.dys).toBe(Math.min(1, bs.frac.core + bs.frac.penumbra + bs.regaining));
      }
      for (const s of r.symptoms) expect(s.recovery?.compensated ?? 0).toBe(0);
    }
  });
});
