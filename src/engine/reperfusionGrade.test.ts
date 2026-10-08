/**
 * Z2-3 (and the reperfusion part of Z2-6): the recanalisation event is graded by what the treatment
 * avoids, not only by the NIHSS at 3 months, and never prints the same NIHSS as a difference.
 *
 *   • The model's 3-month NIHSS of a course that usually ends in death (a herniation, a brainstem
 *     compression, an unreopened basilar occlusion with coma) is that of a survivor, so a treatment
 *     that avoids that course can leave about the same NIHSS.
 *   • For the same NIHSS a right-hemisphere infarct is about twice as large as a left one (median
 *     133 vs 48 mL for an NIHSS of 16–20 at 24 h: Woo D et al. Stroke 1999;30:2355–2359, PMID
 *     10548670), and the final infarct volume predicts the functional outcome on its own (odds of a
 *     better modified Rankin score 0.88 per 10 mL in 1665 patients of seven trials: Boers AMM et
 *     al. J Neurointerv Surg 2018;10:1137–1142, PMID 29627794).
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import type { CollateralGrade } from './hemodynamics';
import { simulate, type SimInput } from './simulate';
import type { TreatmentOptions } from './treatment';

const one = (vessel: string, collateral: CollateralGrade, reperfusionH: number | null, over: Partial<SimInput> = {}): SimInput => ({
  occlusions: [{ vessel, severity: 1 }],
  variants: [],
  collateral,
  map: 93,
  tH: 2160,
  reperfusionH,
  decompression: false,
  ...over,
});
const scenario = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return {
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH: 2160,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  };
};
const event = (input: SimInput) => simulate({ ...input, tH: 2160 }).cascade.events.find((e) => e.id === 'reperfusion');
const outcome = (input: SimInput) => {
  const t = simulate({ ...input, tH: 2160 });
  const u = simulate({ ...input, tH: 2160, reperfusionH: null, treatment: undefined });
  return { t, u, saved: u.cascade.volumes.total - t.cascade.volumes.total };
};
/** "about 13 instead of 13", "約 13 分（不治療約 13 分）": the same number written as a difference */
const SAME_AS_DIFFERENCE_EN = /about (\d+) instead of \1 /;
const SAME_AS_DIFFERENCE_ZH = /約 (\d+) 分（不治療約 \1 分）/;

describe('a reopening that avoids a fatal course is a benefit (Z2-3)', () => {
  it.each([4.5, 6])('a right ICA-T occlusion (moderate collaterals) reopened at %s h avoids the herniation: a benefit, said so', (h) => {
    const input = one('ica_terminal_r', 'moderate', h);
    const { t, u } = outcome(input);
    expect(u.cascade.fatalRisk).toContain('herniation');
    expect(t.cascade.fatalRisk).not.toContain('herniation');
    const ev = event(input)!;
    expect(ev.severity).toBe('good');
    expect(ev.desc.en).toMatch(/herniation, which is often fatal; with it the model does not expect one/);
    expect(ev.desc.zh).toContain('很可能造成疝脫，常會致命');
    // the untreated NIHSS is a survivor's
    expect(ev.desc.en).toMatch(/without treatment about \d+, if the patient survives/);
    expect(ev.desc.zh).toMatch(/不治療時假如病人存活/);
  });

  it('a right M1 with decompression (no fatal course either way) reopened at 6 h spares about 70 mL: a benefit the scale shows little of', () => {
    const input = one('mca_m1_r', 'poor', 6, { decompression: true });
    const { t, u, saved } = outcome(input);
    expect(saved).toBeGreaterThan(50);
    expect(u.nihss.total - t.nihss.total).toBeLessThan(2);
    const ev = event(input)!;
    expect(ev.severity).toBe('good');
    expect(ev.desc.en).toMatch(/The scale shows little of the difference, but the treatment spared about \d+ mL of brain/);
    expect(ev.desc.en).toMatch(/right-hemisphere infarct lower than a left one/);
    expect(ev.desc.zh).toMatch(/NIHSS 看不太出差別，但治療保住了約 \d+ mL 的腦組織/);
  });

  it('a reopening too late to change the deficit, the course or much volume is told, but not as a benefit', () => {
    for (const input of [scenario('r_m1_malignant', { reperfusionH: 24 }), one('ica_terminal_l', 'moderate', 24)]) {
      const { saved } = outcome(input);
      expect(saved).toBeLessThan(50);
      expect(event(input)!.severity).toBe('info');
    }
  });
});

describe('the recanalisation text never writes the same NIHSS as a difference (Z2-3, Z2-6)', () => {
  const METHODS: (TreatmentOptions | undefined)[] = [
    undefined,
    { method: 'ivt', grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 },
    { method: 'bridging', grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 },
  ];
  it.each(['ica_terminal_l', 'ica_terminal_r', 'mca_m1_l', 'mca_m1_r', 'basilar_mid', 'pca_p2_l'])('%s, every grade, reopened from 1 to 24 h', (vessel) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      for (const h of [1, 3, 4.5, 6, 12, 24])
        for (const treatment of METHODS) {
          const input = one(vessel, collateral, h, treatment ? { treatment } : {});
          const ev = event(input);
          if (!ev) continue;
          const where = `${vessel} ${collateral} ${h} h ${treatment?.method ?? 'default'}`;
          expect(ev.desc.en, where).not.toMatch(SAME_AS_DIFFERENCE_EN);
          expect(ev.desc.zh, where).not.toMatch(SAME_AS_DIFFERENCE_ZH);
          // never 'info' when the treatment avoids a fatal course or spares 50 mL or more, or avoids
          // 2 NIHSS points by saving more than a sliver of tissue: a sliver (under 0.5 mL and a tenth
          // of the untreated infarct) that tips a grade is not a benefit (T3-11; a margin is left
          // around the limits)
          const { t, u, saved } = outcome(input);
          const avoided = u.cascade.fatalRisk.some((k) => !t.cascade.fatalRisk.includes(k));
          const sliver = saved < 0.55 && saved < 0.11 * u.cascade.volumes.total;
          if (avoided || saved >= 50 || (u.nihss.total - t.nihss.total >= 2 && !sliver)) expect(ev.severity, where).toBe('good');
        }
  });
});
