/**
 * Y1-0: how fast the infarct grows behind a large-vessel occlusion, against the measured growth
 * of the ischaemic core in anterior-circulation large-vessel occlusion.
 *
 *   • Median growth 3.1 mL/h (IQR 0.7–10.7; DEFUSE 2: Wheeler HM et al. Int J Stroke
 *     2015;10:723–729, PMID 25580662) and 4.74 mL/h (IQR 1.25–14.84; ESCAPE-NA1: Ospel JM et al.
 *     J Neurointerv Surg 2022;14:886–891, PMID 34493575); "fast progressors" from 10 mL/h (SELECT:
 *     Sarraj A et al. Stroke 2021;52:57–69, PMID 33280550), 77 % of the patients with the worst
 *     collaterals (Seners P et al. Neurology 2023;101:e2126–e2137, PMID 37813579).
 *   • The fastest loss among 415 ICA or M1 occlusions, > 27 million neurons per minute (Desai SM et
 *     al. Stroke 2019;50:34–37, PMID 30566036), is about 74 mL/h at the model's 22 million neurons
 *     per mL.
 *   • A DWI lesion > 82 mL within 6 h (Thomalla G et al. Ann Neurol 2010;68:435–445, PMID
 *     20865766) or > 145 mL within 14 h (Oppenheim C et al. Stroke 2000;31:2175–2181) predicts a
 *     malignant course: the poor-collateral template must still get there.
 *   • Tissue without flow is not dead within minutes: after 15–30 min of MCA occlusion awake
 *     monkeys had only microscopic infarcts (Jones TH et al. J Neurosurg 1981;54:773–782, PMID
 *     7241187); in patients reperfused early only flow below about 7–9 mL/100 g/min went on to
 *     infarct (d'Esterre CD et al. Stroke 2015;46:3390–3397, PMID 26514186), and the early
 *     perfusion "core" often survives reperfusion (Boned S et al. J Neurointerv Surg 2017;9:66–69,
 *     PMID 27566491).
 *   • The benefit of thrombectomy grows with the collateral grade; with poor collaterals it is
 *     smaller, and with absent collaterals none was shown (MR CLEAN: Berkhemer OA et al. Stroke
 *     2016;47:768–776, PMID 26903582). Reopening within 1–2 h must still save tissue, as every
 *     hour of delay costs benefit (Fransen PS et al. JAMA Neurol 2016;73:190–196).
 */
import { describe, expect, it } from 'vitest';
import type { CollateralGrade } from './hemodynamics';
import { simulate, type SimInput } from './simulate';
import { BEDS, REGION_BY_ID, VESSEL_BY_ID } from '../anatomy';
import { getUnits } from './hemodynamics';
import { infarctFraction } from './tissue';
import { BASILAR_BRAINSTEM_TISSUE, DEFAULT_TISSUE, PERFORATOR_TISSUE, RETINA_TISSUE, tissueParamsForBed, tissueParamsForUnit } from './tissueParams';

const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false, ...over });
const occl = (vessel: string) => [{ vessel, severity: 1 }];
const core = (vessel: string, collateral: CollateralGrade, tH: number) => sim({ occlusions: occl(vessel), collateral, tH }).volumes.core;
const final = (vessel: string, collateral: CollateralGrade, reperfusionH: number | null) =>
  sim({ occlusions: occl(vessel), collateral, reperfusionH, tH: 4320 }).volumes.finalInfarct;

/**
 * the fastest growth observed, averaged from onset to imaging (Desai 2019); patients are rarely
 * imaged within the first hour, so the bound applies from 1 h on
 */
const FASTEST_ML_H = 75;
const ANTERIOR_LVO = ['mca_m1_r', 'mca_m1_l', 'ica_terminal_r', 'ica_terminal_l'];

describe('poor collaterals: the infarct grows by tens of mL per hour, not hundreds', () => {
  it.each(ANTERIOR_LVO)('%s: never faster than the fastest measured growth', (vessel) => {
    for (const tH of [1, 2, 3, 6, 12]) expect(core(vessel, 'poor', tH) / tH, `${tH} h`).toBeLessThanOrEqual(FASTEST_ML_H);
    // in the first half hour only the end-artery perforator territories die (as in experimental MCA
    // occlusion: Memezawa H et al. Stroke 1992;23:552–559), not the cortex
    expect(core(vessel, 'poor', 0.5)).toBeLessThan(40);
  });

  it.each(['mca_m1_r', 'mca_m1_l'])('%s: about 60 mL or less at 1 h', (vessel) => {
    expect(core(vessel, 'poor', 1)).toBeLessThanOrEqual(65);
  });

  it.each(ANTERIOR_LVO)('%s: still a fast progressor, large enough by 6 h and 14 h to predict a malignant course', (vessel) => {
    // at least 15 mL/h from onset, above the 10 mL/h line of the fast progressors
    expect(core(vessel, 'poor', 6)).toBeGreaterThanOrEqual(90);
    expect(core(vessel, 'poor', 14)).toBeGreaterThanOrEqual(145);
  });

  it.each(ANTERIOR_LVO)('%s: the whole territory is infarcted only after 6–12 h', (vessel) => {
    const day = core(vessel, 'poor', 24);
    expect(core(vessel, 'poor', 3)).toBeLessThan(0.75 * day);
    expect(core(vessel, 'poor', 6)).toBeLessThan(0.9 * day);
    expect(core(vessel, 'poor', 12)).toBeGreaterThan(0.8 * day);
  });

  it('an anterior cerebral artery with poor collaterals also grows over hours', () => {
    for (const tH of [0.5, 1, 2, 6]) expect(core('aca_a2_r', 'poor', tH) / tH, `${tH} h`).toBeLessThanOrEqual(30);
  });
});

describe('collaterals set the pace', () => {
  it('good < moderate < poor at every time in the first day', () => {
    for (const tH of [0.5, 1, 2, 6, 12]) {
      const [good, moderate, poor] = (['good', 'moderate', 'poor'] as const).map((c) => core('mca_m1_r', c, tH));
      expect(good, `${tH} h`).toBeLessThan(moderate);
      expect(moderate, `${tH} h`).toBeLessThan(poor);
    }
  });

  it('moderate collaterals grow at most half as fast as poor ones over the first 6 h', () => {
    expect(core('mca_m1_r', 'moderate', 6)).toBeLessThan(0.6 * core('mca_m1_r', 'poor', 6));
  });
});

describe('reopening still saves tissue when collaterals are poor', () => {
  it('a poor-collateral M1 reopened at 1–2 h leaves at most 70 % of the untreated infarct, and a lower NIHSS', () => {
    const untreated = final('mca_m1_r', 'poor', null);
    const nihss = (reperfusionH: number | null) =>
      sim({ occlusions: occl('mca_m1_r'), collateral: 'poor', reperfusionH, tH: 2160 }).nihss.total;
    for (const h of [1, 2]) {
      expect(final('mca_m1_r', 'poor', h), `${h} h`).toBeLessThanOrEqual(0.7 * untreated);
      expect(nihss(h), `${h} h`).toBeLessThan(nihss(null));
    }
  });

  it('the saving shrinks with time, faster with poor than with good collaterals', () => {
    const share = (c: CollateralGrade) => {
      const untreated = final('mca_m1_r', c, null);
      return (h: number) => (untreated - final('mca_m1_r', c, h)) / untreated;
    };
    const poor = share('poor');
    const good = share('good');
    expect(poor(1)).toBeGreaterThan(poor(3));
    expect(poor(3)).toBeGreaterThan(poor(6));
    expect(poor(6) / poor(1)).toBeLessThan(good(6) / good(1));
  });
});

describe('tissue fed by collaterals is not lost at once', () => {
  it('without any flow: nothing lost in the first 15 min, less than half within the first hour, most within hours', () => {
    expect(infarctFraction(0, 0.25, null)).toBe(0);
    expect(infarctFraction(0, 1, null)).toBeLessThan(0.5);
    expect(infarctFraction(0, 6, null)).toBeGreaterThan(0.8);
  });

  it('at 20–30 % of normal flow it takes hours', () => {
    expect(infarctFraction(0.25, 1, null)).toBeLessThan(0.25);
    expect(infarctFraction(0.25, 12, null)).toBeGreaterThan(0.75);
  });

  it('the less flow, the faster: deeper ischaemia is never lost more slowly', () => {
    for (const tH of [0.5, 1, 2, 4, 8, 16, 48]) {
      let prev = 1;
      for (let rel = 0; rel < DEFAULT_TISSUE.penumbraRel; rel += 0.01) {
        const f = infarctFraction(rel, tH, null);
        expect(f, `rel ${rel.toFixed(2)} at ${tH} h`).toBeLessThanOrEqual(prev + 1e-12);
        prev = f;
      }
    }
  });
});

describe('end arteries keep the fast course; the calibrated beds keep their constants', () => {
  /** the single model before Y1-0, which every bed used */
  const FORMER = { coreRel: 0.3, penumbraRel: 0.55, oligemiaRel: 0.85, coreTauH: 0.09, coreTauSpan: 1, penumbraTauMinH: 1.5, penumbraTauSpan: 20, penumbraSurvivalMax: 0.85, lagH: 0.1 };

  it('end-artery perforator territories (and lacunes) are lost as fast as before: most of it at 15 min', () => {
    expect(PERFORATOR_TISSUE).toEqual(FORMER);
    expect(infarctFraction(0, 0.1, null, 1, PERFORATOR_TISSUE)).toBe(0);
    expect(infarctFraction(0, 0.25, null, 1, PERFORATOR_TISSUE)).toBeGreaterThan(0.8);
  });

  it('the retina and the basilar brainstem keep their calibration (C8-F1, posterior goals 1–4)', () => {
    expect(RETINA_TISSUE).toEqual({ ...FORMER, lagH: 0.2 });
    expect(BASILAR_BRAINSTEM_TISSUE).toEqual({ ...FORMER, penumbraTauMinH: 3, penumbraSurvivalMax: 0.4 });
  });

  it('a unit fed by a perforator gets the perforator course, unless its bed has its own', () => {
    const units = getUnits([], 'good');
    let perforators = 0;
    for (const u of units) {
      const own = tissueParamsForBed(u.bed);
      const p = tissueParamsForUnit(u);
      if (own !== DEFAULT_TISSUE) expect(p, u.id).toBe(own);
      else if (VESSEL_BY_ID[u.vessel]?.kind === 'perforator') {
        expect(p, u.id).toBe(PERFORATOR_TISSUE);
        perforators++;
      } else expect(p, u.id).toBe(DEFAULT_TISSUE);
    }
    expect(perforators).toBeGreaterThan(10);
    // the lenticulostriate part of the putamen is an end-artery territory
    expect(tissueParamsForUnit(units.find((u) => u.id === 'putamen_l#lenticulostriate_l')!)).toBe(PERFORATOR_TISSUE);
    // every bed with its own constants is brainstem or retina
    for (const b of BEDS) if (tissueParamsForBed(b.id) !== DEFAULT_TISSUE) expect(['brainstem', 'eye']).toContain(REGION_BY_ID[b.region].category);
  });
});
