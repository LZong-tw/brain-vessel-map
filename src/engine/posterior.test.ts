/**
 * Posterior-circulation calibration: basilar artery occlusion has a time window that depends on
 * the collaterals, while the anterior circulation keeps its behaviour; brief occlusions (TIAs)
 * cause symptoms without infarction. The targets are qualitative trends, not predictions.
 */
import { describe, expect, it } from 'vitest';
import { BEDS, REGION_BY_ID } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import type { CollateralGrade } from './hemodynamics';
import { simulate, type SimInput } from './simulate';
import { infarctFraction } from './tissue';
import { DEFAULT_TISSUE, tissueParamsForBed } from './tissueParams';

const GRADES: CollateralGrade[] = ['good', 'moderate', 'poor'];
const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false, ...over });
const occl = (vessel: string) => [{ vessel, severity: 1 }];
const basilar = (vessel: string, collateral: CollateralGrade, over: Partial<SimInput> = {}) =>
  sim({ occlusions: occl(vessel), collateral, ...over });
/** final infarct (mL) of an occlusion reopened at `reperfusionH` (null = never) */
const finalInfarct = (vessel: string, collateral: CollateralGrade, reperfusionH: number | null) =>
  basilar(vessel, collateral, { tH: 96, reperfusionH }).volumes.finalInfarct;
const syndromeIds = (r: ReturnType<typeof simulate>) => r.syndromes.map((s) => s.def.id);

describe('basilar artery occlusion leaves salvageable brainstem for hours (goal 1)', () => {
  it.each(['basilar_mid', 'basilar_lower', 'basilar_upper'])('%s, moderate collaterals', (vessel) => {
    const at = (tH: number) => basilar(vessel, 'moderate', { tH }).volumes;
    // mostly penumbra early on, still a substantial part after 6 h
    expect(at(1).penumbra).toBeGreaterThan(3 * at(1).core);
    expect(at(3).penumbra).toBeGreaterThan(at(3).core);
    expect(at(6).penumbra).toBeGreaterThan(0.3 * (at(6).core + at(6).penumbra));
    // and the core grows over those hours instead of being complete within minutes
    expect(at(6).core).toBeGreaterThan(2 * at(1).core);
  });

  it('the paramedian pons is penumbra, not core, behind a mid-basilar occlusion with moderate collaterals', () => {
    const r = basilar('basilar_mid', 'moderate', { tH: 1 });
    for (const s of ['r', 'l']) {
      const rel = r.hemo.unitRel[`pons_caudal_basis_${s}#pontine_paramedian_caudal_${s}`];
      expect(rel).toBeGreaterThan(DEFAULT_TISSUE.coreRel);
      expect(rel).toBeLessThan(DEFAULT_TISSUE.penumbraRel);
    }
  });

  it('an occluded perforator group stays an end-artery territory (the collaterals enter the perforators)', () => {
    const r = sim({ occlusions: occl('pontine_paramedian_caudal_l'), collateral: 'good', tH: 1 });
    expect(r.hemo.unitRel['pons_caudal_basis_l#pontine_paramedian_caudal_l']).toBeLessThan(0.05);
  });
});

describe('reperfusion of a mid-basilar occlusion (goal 2)', () => {
  /** share of the tissue at risk that reopening at `h` saves, per collateral grade */
  const savedShare = (collateral: CollateralGrade) => {
    const untreated = finalInfarct('basilar_mid', collateral, null);
    const atRisk = untreated - finalInfarct('basilar_mid', collateral, 0);
    return (h: number) => (untreated - finalInfarct('basilar_mid', collateral, h)) / atRisk;
  };

  it('saves most of the tissue at risk early, a meaningful part at 6–12 h and some at 24 h (moderate collaterals)', () => {
    const share = savedShare('moderate');
    expect(share(1)).toBeGreaterThan(0.8);
    expect(share(3)).toBeGreaterThan(0.6);
    expect(share(6)).toBeGreaterThan(0.5);
    expect(share(12)).toBeGreaterThan(0.2);
    expect(share(12)).toBeLessThan(share(6));
    expect(share(24)).toBeGreaterThan(0.05);
    expect(share(24)).toBeLessThan(share(12));
  });

  it('late reperfusion still helps with good collaterals but hardly with poor ones', () => {
    const good = savedShare('good');
    const poor = savedShare('poor');
    expect(good(12)).toBeGreaterThan(0.4);
    expect(good(24)).toBeGreaterThan(0.25);
    expect(poor(12)).toBeLessThan(0.05);
    expect(poor(24)).toBeLessThan(0.05);
  });

  it('the saving shrinks the later the vessel is reopened', () => {
    for (const c of GRADES) {
      const vols = [1, 3, 6, 12, 24].map((h) => finalInfarct('basilar_mid', c, h));
      for (let i = 1; i < vols.length; i++) expect(vols[i], c).toBeGreaterThanOrEqual(vols[i - 1] - 1e-9);
    }
  });
});

describe('untreated mid-basilar occlusion still ends in locked-in syndrome (goal 3)', () => {
  it.each(GRADES)('locked-in at 24 h with %s collaterals', (c) => {
    const r = basilar('basilar_mid', c);
    expect(syndromeIds(r)).toContain('locked_in');
    expect(r.symptoms.map((x) => x.id)).not.toContain('coma');
  });

  it.each(GRADES)('the ventral pons is infarcted on both sides in the end (%s collaterals)', (c) => {
    for (const tH of [96, 720]) {
      const r = basilar('basilar_mid', c, { tH });
      expect(syndromeIds(r)).toContain('locked_in');
      for (const s of ['r', 'l']) expect(r.regions[`pons_caudal_basis_${s}`].infarct).toBeGreaterThanOrEqual(0.4);
    }
  });

  it('collaterals buy time, not a good untreated outcome: much of the pons is still penumbra at 24 h with good ones', () => {
    const r = basilar('basilar_mid', 'good');
    for (const s of ['r', 'l']) expect(r.regions[`pons_caudal_basis_${s}`].infarct).toBeLessThan(0.4);
    expect(syndromeIds(r)).toContain('locked_in');
  });
});

describe('collateral grade matters in basilar occlusion (goal 4)', () => {
  it.each(['basilar_mid', 'basilar_lower', 'basilar_upper', 'basilar_tip'])('%s: good < moderate < poor final infarct', (vessel) => {
    const [good, moderate, poor] = GRADES.map((c) => finalInfarct(vessel, c, null));
    expect(good).toBeLessThan(moderate);
    expect(moderate).toBeLessThan(poor);
  });

  it('good collaterals keep the pons mostly alive for a day, poor ones do not', () => {
    const good = basilar('basilar_mid', 'good').volumes;
    const poor = basilar('basilar_mid', 'poor').volumes;
    expect(good.penumbra).toBeGreaterThan(good.core);
    expect(poor.penumbra).toBeLessThan(0.1 * poor.core);
  });
});

describe('the anterior circulation is unchanged (goal 5)', () => {
  it('only brainstem beds fed entirely by the basilar artery have their own tissue parameters', () => {
    for (const b of BEDS) {
      if (tissueParamsForBed(b.id) === DEFAULT_TISSUE) continue;
      expect(REGION_BY_ID[b.region].category, b.id).toBe('brainstem');
      expect(b.region, b.id).toMatch(/^(pons|midbrain)_/);
      expect(b.region, b.id).not.toMatch(/^midbrain_peduncle/);
    }
  });

  // final infarct (mL) of every scenario outside the posterior group before the posterior
  // calibration; the small shifts allowed come from the ischaemic lag (goal 7)
  const BEFORE: Record<string, number> = {
    l_m1: 148.916,
    l_m1_thrombectomy: 60.198,
    r_m1_malignant: 485.138,
    r_m1_decompression: 296.726,
    r_ica_t: 493.241,
    l_m2_sup: 124.637,
    l_m2_inf: 58.628,
    r_aca: 135.779,
    l_acha: 8.621,
    l_lsa: 16.581,
    l_lacune: 0.8,
    l_thalamic: 3.431,
    percheron: 2.91,
    ica_silent: 0,
    ica_isolated: 428.8,
    fetal_pca: 76.199,
    watershed: 17.861,
    subclavian_steal: 0,
    amaurosis: 0,
  };
  it.each(SCENARIOS.filter((s) => s.group !== 'posterior').map((s) => [s.id, s] as const))('%s', (id, sc) => {
    const r = sim({
      occlusions: sc.occlusions,
      variants: sc.variants ?? [],
      map: sc.map ?? 93,
      collateral: sc.collateral ?? 'good',
      tH: 24,
      reperfusionH: sc.reperfusionH ?? null,
      decompression: sc.decompression ?? false,
    });
    expect(BEFORE[id], `add ${id} to BEFORE`).toBeDefined();
    expect(Math.abs(r.volumes.finalInfarct - BEFORE[id])).toBeLessThanOrEqual(0.03 * BEFORE[id] + 0.01);
  });
});

describe('a brief complete occlusion is a TIA (goal 7)', () => {
  it('no tissue is lost during the ischaemic lag', () => {
    expect(infarctFraction(0, DEFAULT_TISSUE.lagH, null)).toBe(0);
    expect(infarctFraction(0, 1, null)).toBeGreaterThan(0.99);
  });

  it.each([
    ['mca_m1_l', 'good'],
    ['mca_m2_sup_l', 'moderate'],
    ['basilar_mid', 'moderate'],
  ] as const)('%s reopened after 5 min: symptoms, then recovery without infarction', (vessel, c) => {
    const tia = { occlusions: occl(vessel), collateral: c, reperfusionH: 5 / 60 };
    expect(sim({ ...tia, tH: 2 / 60 }).nihss.total).toBeGreaterThan(4);
    const later = sim({ ...tia, tH: 24 });
    expect(later.volumes.finalInfarct).toBeLessThan(0.05);
    expect(later.nihss.total).toBe(0);
  });

  it('a longer occlusion (1 h) leaves an infarct', () => {
    expect(sim({ occlusions: occl('mca_m1_l'), reperfusionH: 1 }).volumes.finalInfarct).toBeGreaterThan(10);
  });
});
