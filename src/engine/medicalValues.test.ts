import { describe, expect, it } from 'vitest';
import { DEFAULT_TREATMENT, GRADE_REPERFUSED, reperfusedFraction } from './treatment';
import { DEFAULT_TISSUE, PERFORATOR_TISSUE, DEEP_WHITE_MATTER_TISSUE, BASILAR_BRAINSTEM_TISSUE, RETINA_TISSUE } from './tissueParams';
import { COMA_SHIFT_MM, DROWSY_SHIFT_MM, STUPOR_SHIFT_MM, consciousnessFromShift } from './cascade';
import { dwiCurve, decompressionAtH } from './edema';
import { simulate, type SimInput } from './simulate';
import { TREATMENT_UI } from '../i18n/uiTreatment';

const input: SimInput = {
  occlusions: [{ vessel: 'mca_m1_l', severity: 1 }],
  collateral: 'poor', variants: [], map: 93, tH: 72,
  reperfusionH: null, decompression: false,
};

describe('medical values with independently cited bounds', () => {
  // Liebeskind 2019, https://doi.org/10.1136/neurintsurg-2018-014127
  it.each([
    ['0', 0, 0], ['1', 0, 0], ['2a', 0.01, 0.49], ['2b50', 0.5, 0.66],
    ['2b67', 0.67, 0.89], ['2c', 0.9, 0.99], ['3', 1, 1],
  ] as const)('eTICI %s stays within its published reperfusion range', (grade, low, high) => {
    expect(GRADE_REPERFUSED[grade]).toBeGreaterThanOrEqual(low);
    expect(GRADE_REPERFUSED[grade]).toBeLessThanOrEqual(high);
  });

  it('eTICI 1 does not rescue tissue or create distal reperfusion', () => {
    const t = { ...DEFAULT_TREATMENT, grade: '1' as const };
    expect(reperfusedFraction(t)).toBe(0);
    const untreated = simulate(input);
    const attempted = simulate({ ...input, reperfusionH: 2, treatment: t });
    expect(attempted.volumes.core).toBe(untreated.volumes.core);
    expect(attempted.volumes.finalInfarct).toBe(untreated.volumes.finalInfarct);
    expect(attempted.volumes.saved).toBe(0);
    expect(TREATMENT_UI.en.grades['1']).toContain('no distal reperfusion');
    expect(TREATMENT_UI['zh-TW'].grades['1']).toContain('沒有遠端再灌流');
  });

  // SELECT2 protocol: https://pubmed.ncbi.nlm.nih.gov/34282987/
  // This pins the operational rCBF cutoff, NOT irreversible cell death or Tmax > 6 s.
  it.each([DEFAULT_TISSUE, PERFORATOR_TISSUE, DEEP_WHITE_MATTER_TISSUE, BASILAR_BRAINSTEM_TISSUE, RETINA_TISSUE])(
    'retains the operational CTP core cutoff of 30 percent', (params) => {
      expect(params.coreRel).toBe(0.3);
    },
  );

  // Ropper 1986: https://pubmed.ncbi.nlm.nih.gov/3960059/
  // Observed bands in mixed hemispheric masses, not validated herniation criteria.
  it('places illustrative consciousness transitions inside the observed shift bands', () => {
    for (const [value, low, high] of [[DROWSY_SHIFT_MM, 3, 4], [STUPOR_SHIFT_MM, 6, 8.5], [COMA_SHIFT_MM, 8, 13]]) {
      expect(value).toBeGreaterThanOrEqual(low);
      expect(value).toBeLessThanOrEqual(high);
    }
    expect(consciousnessFromShift(DROWSY_SHIFT_MM - 0.01)).toBeNull();
    expect(consciousnessFromShift(DROWSY_SHIFT_MM)?.sev).toBe(1);
    expect(consciousnessFromShift(STUPOR_SHIFT_MM)?.sev).toBe(2);
    expect(consciousnessFromShift(COMA_SHIFT_MM)?.sev).toBe(3);
  });

  // Lansberg 2001: https://pmc.ncbi.nlm.nih.gov/articles/PMC7976036/
  it('loses half of peak diffusion restriction during the reported 5–14 day interval', () => {
    const peak = Math.max(...Array.from({ length: 97 }, (_, h) => dwiCurve(h)));
    const half = Array.from({ length: 14 * 24 }, (_, h) => h + 24).find((h) => dwiCurve(h) <= peak / 2)!;
    expect(half).toBeGreaterThanOrEqual(5 * 24);
    expect(half).toBeLessThanOrEqual(14 * 24);
  });

  // Vahedi pooled DECIMAL/DESTINY/HAMLET: https://pubmed.ncbi.nlm.nih.gov/17303527/
  it('schedules illustrative early decompression inside the studied 48-hour window', () => {
    expect(decompressionAtH(true, [])).toBeGreaterThan(0);
    expect(decompressionAtH(true, [])).toBeLessThanOrEqual(48);
    expect(decompressionAtH(false, [])).toBeNull();
    expect(decompressionAtH(true, [{ id: 'hemicraniectomy_l', onsetH: 18 }])).toBe(18);
  });

  // SELECT2: https://doi.org/10.1056/NEJMoa2214403 (no upper core-volume limit).
  it('does not turn 100 mL into a universal thrombectomy trial ceiling in either language', () => {
    const r = simulate({ ...input, tH: 24, reperfusionH: 12 });
    const text = r.cascade.events.find((e) => e.id === 'treatment_window')!.desc;
    expect(text.en).toContain('SELECT2 also had no upper core-volume limit');
    expect(text.zh).toContain('SELECT2 也沒有核心體積上限');
  });

  // AAN 2018: https://doi.org/10.1212/WNL.0000000000005926
  it('does not make three months a categorical recovery deadline or predict a fixed lifespan', () => {
    const r = simulate({ ...input, tH: 4320, occlusions: [
      { vessel: 'ica_terminal_l', severity: 1 }, { vessel: 'ica_terminal_r', severity: 1 },
    ] });
    const text = r.cascade.events.find((e) => e.id === 'hemispheres_destroyed')!.desc;
    expect(text.en).toContain('recovery after 3 months remains possible');
    expect(text.zh).toContain('3 個月後仍可能恢復');
    expect(text.en).not.toMatch(/2–5 years|exceedingly rare/);
    expect(text.zh).not.toContain('2–5 年');
  });

  // STRIVE-2: https://discovery.ucl.ac.uk/10173196/1/STRIVE-2_Manuscript_accepted.pdf
  it('distinguishes the 20 mm acute subcortical infarct convention from a chronic lacune', () => {
    const r = simulate({ ...input, occlusions: [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }] });
    const text = r.cascade.events.find((e) => e.id === 'imaging_dwi')!.desc;
    expect(text.en).toContain('2 cm in axial diameter');
    expect(text.zh).toContain('2 公分');
    expect(text.en).not.toContain('1.5 cm');
  });

  // AHA/ASA 2026: https://doi.org/10.1161/STR.0000000000000513
  it('keeps standard IVT and selected extended EVT windows consistent in both languages', () => {
    const text = simulate(input).cascade.events.find((e) => e.id === 'treatment_window')!.desc;
    expect(text.en).toContain('within 4.5 h');
    expect(text.zh).toContain('4.5 小時');
    expect(text.en).toContain('within 6 h, extendable to 24 h when imaging');
    expect(text.zh).toContain('6 小時內');
    expect(text.zh).toContain('24 小時');
  });
});
