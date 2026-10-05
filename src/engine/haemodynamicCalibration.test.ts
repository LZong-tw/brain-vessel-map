import { describe, expect, it } from 'vitest';
import readmeZh from '../../README.md?raw';
import readmeEn from '../../README.en.md?raw';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { UI } from '../i18n/ui';
import { simulateHemodynamics, type CollateralGrade } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

/**
 * Calibration of the haemodynamic and tissue model against the evidence it cites (clinical-detail
 * audit, cluster C8): retinal survival time, poor collaterals in basilar artery occlusion, blood
 * pressure, and subclavian steal.
 */
const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false, ...over });
const occl = (...ids: string[]) => ids.map((vessel) => ({ vessel, severity: 1 }));
const has = (r: SimResult, id: string) => r.symptoms.some((s) => s.id === id);
const event = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
const syndromes = (r: SimResult) => r.syndromes.map((m) => m.def.id);

describe('C8-F1: retinal survival time', () => {
  const eye = (reperfusionH: number | null) => sim({ occlusions: occl('ophthalmic_r'), reperfusionH, tH: 720 });

  it('an ophthalmic embolus that clears within ~10 min (amaurosis fugax) leaves no retinal infarct', () => {
    for (const reperfusionH of [0.1, 0.15, 0.19]) {
      const r = eye(reperfusionH);
      expect(r.regions.retina_r.infarct, `${reperfusionH} h`).toBeLessThan(0.02);
      expect(has(r, 'monocular_blind'), `${reperfusionH} h`).toBe(false);
    }
  });

  it('a complete occlusion lasting half an hour or more still infarcts the retina (the shorter human estimate)', () => {
    expect(eye(0.5).regions.retina_r.infarct).toBeGreaterThan(0.5);
    expect(has(eye(0.5), 'monocular_blind')).toBe(true);
    expect(eye(null).regions.retina_r.infarct).toBeGreaterThan(0.95);
  });

  it('while the artery is blocked the eye is blind, however briefly', () => {
    expect(has(sim({ occlusions: occl('ophthalmic_r'), reperfusionH: 0.15, tH: 0.1 }), 'monocular_blind')).toBe(true);
  });

  it('the texts give both estimates instead of claiming the retina lasts longer than the model', () => {
    const d = event(sim({ occlusions: occl('ophthalmic_r'), tH: 1 }), 'retinal_ischaemia')!.desc;
    expect(d.en).toContain('97 min');
    expect(d.en).toContain('12–15 min');
    expect(d.zh).toContain('97 分鐘');
    expect(d.zh).toContain('12–15 分鐘');
    expect(d.en).not.toContain('tolerates somewhat longer');
    const s = SCENARIO_BY_ID.amaurosis.summary;
    expect(s.en).not.toContain('tolerates somewhat longer');
    expect(s.zh).not.toContain('視網膜實際能撐得稍久');
    expect(s.en).toContain('12–15 min');
    expect(s.zh).toContain('12–15 分鐘');
  });
});

describe('C8-F2: poor collaterals in mid-basilar occlusion are a disadvantage, not futility', () => {
  const BASILAR_MID = occl('basilar_mid');
  const run = (collateral: CollateralGrade, reperfusionH: number | null) => sim({ occlusions: BASILAR_MID, collateral, reperfusionH, tH: 4320 });
  const paramedian = (collateral: CollateralGrade) =>
    simulateHemodynamics({ occlusions: BASILAR_MID, variants: [], map: 93, collateral }).unitRel['pons_caudal_basis_l#pontine_paramedian_caudal_l'];

  it('poor collaterals leave the paramedian pons in the low penumbra, not in the core', () => {
    expect(paramedian('poor')).toBeGreaterThan(0.31);
    expect(paramedian('poor')).toBeLessThan(0.38);
    // good and moderate are unchanged
    expect(paramedian('good')).toBeCloseTo(0.49, 2);
    expect(paramedian('moderate')).toBeCloseTo(0.41, 2);
  });

  it('reopening within a few hours saves part of the pons and lowers the NIHSS', () => {
    const untreated = run('poor', null);
    for (const reperfusionH of [1, 3]) {
      const r = run('poor', reperfusionH);
      expect(r.volumes.finalInfarct, `${reperfusionH} h`).toBeLessThan(0.75 * untreated.volumes.finalInfarct);
      expect(r.nihss.total, `${reperfusionH} h`).toBeLessThan(untreated.nihss.total);
    }
  });

  it('the benefit fades by about 12 h and is gone at 24 h', () => {
    const untreated = run('poor', null).volumes.finalInfarct;
    expect(run('poor', 12).volumes.finalInfarct).toBeGreaterThan(0.85 * untreated);
    expect(run('poor', 24).volumes.finalInfarct).toBeGreaterThan(0.95 * untreated);
    expect(run('poor', 24).nihss.total).toBeGreaterThanOrEqual(run('poor', null).nihss.total - 2);
  });

  it('untreated, it still ends with a locked-in syndrome', () => {
    expect(syndromes(run('poor', null))).toContain('locked_in');
  });
});

describe('R4-1: the poor-collateral calibration holds for every basilar segment, not only the mid basilar', () => {
  /** the paramedian perforator group that each single-segment occlusion cuts off */
  const SEGMENTS: [string, string][] = [
    ['basilar_lower', 'pons_caudal_basis_l#pontine_paramedian_inferior_l'],
    ['basilar_mid', 'pons_caudal_basis_l#pontine_paramedian_caudal_l'],
    ['basilar_upper', 'pons_rostral_basis_l#pontine_paramedian_rostral_l'],
  ];
  const flow = (segment: string, unit: string, collateral: CollateralGrade) =>
    simulateHemodynamics({ occlusions: occl(segment), variants: [], map: 93, collateral }).unitRel[unit];
  const run = (segment: string, reperfusionH: number | null) =>
    sim({ occlusions: occl(segment), collateral: 'poor', reperfusionH, tH: 4320 });

  it('poor collaterals leave each paramedian group in the low penumbra, not in the core', () => {
    for (const [segment, unit] of SEGMENTS) {
      expect(flow(segment, unit, 'poor'), segment).toBeGreaterThan(0.31);
      expect(flow(segment, unit, 'poor'), segment).toBeLessThan(0.38);
    }
  });

  it('good and moderate collaterals keep their calibration', () => {
    expect(flow('basilar_lower', SEGMENTS[0][1], 'good')).toBeCloseTo(0.431, 2);
    expect(flow('basilar_lower', SEGMENTS[0][1], 'moderate')).toBeCloseTo(0.352, 2);
    expect(flow('basilar_upper', SEGMENTS[2][1], 'good')).toBeCloseTo(0.432, 2);
    expect(flow('basilar_upper', SEGMENTS[2][1], 'moderate')).toBeCloseTo(0.352, 2);
  });

  it('reopening at 1 h and 3 h saves part of the pons and lowers the NIHSS in every segment', () => {
    for (const [segment] of SEGMENTS) {
      const untreated = run(segment, null);
      for (const reperfusionH of [1, 3]) {
        const r = run(segment, reperfusionH);
        expect(r.volumes.finalInfarct, `${segment} ${reperfusionH} h`).toBeLessThan(0.75 * untreated.volumes.finalInfarct);
        expect(r.nihss.total, `${segment} ${reperfusionH} h`).toBeLessThan(untreated.nihss.total);
      }
    }
  });

  it('by about 12 h reopening is close to no treatment in every segment', () => {
    for (const [segment] of SEGMENTS) {
      expect(run(segment, 12).volumes.finalInfarct, segment).toBeGreaterThan(0.85 * run(segment, null).volumes.finalInfarct);
    }
  });
});

describe('C8-F3: blood pressure', () => {
  const m1 = (map: number) => sim({ occlusions: occl('mca_m1_l'), map });

  it('a high mean pressure in acute stroke gets a note on what high blood pressure is associated with', () => {
    for (const map of [120, 130, 160]) expect(event(m1(map), 'high_blood_pressure'), `MAP ${map}`).toBeDefined();
    for (const map of [93, 119]) expect(event(m1(map), 'high_blood_pressure'), `MAP ${map}`).toBeUndefined();
    // nothing ischaemic: no stroke to comment on
    expect(event(sim({ occlusions: [], map: 140 }), 'high_blood_pressure')).toBeUndefined();
    // a TIA and a lacune are strokes (or their warning) too
    expect(event(sim({ occlusions: [{ vessel: 'mca_m1_l', severity: 1, toH: 0.1 }], map: 130 }), 'high_blood_pressure')).toBeDefined();
  });

  it('the note reports associations, the thrombolysis limit and the model assumption, and no haemorrhage link', () => {
    const d = event(m1(130), 'high_blood_pressure')!.desc;
    for (const s of ['U-shaped', '150 mmHg', 'recurrent', 'oedema', 'associations', '185/110', '180/105', 'model assumption', '153', 'below 120']) expect(d.en).toContain(s);
    expect(d.en).toContain('not related to symptomatic haemorrhage');
    for (const s of ['U 型', '150 mmHg', '復發', '水腫', '相關', '185/110', '180/105', '模型的假設', '153', '120']) expect(d.zh).toContain(s);
    expect(d.zh).toContain('與症狀性出血無關');
  });

  it('the blood-pressure hint does not present 70–105 mmHg as a range where nothing changes', () => {
    expect(UI.en.mapHint).toContain('model assumption');
    expect(UI['zh-TW'].mapHint).toContain('模型的假設');
    expect(UI.en.mapHint).toContain('both high and low');
    expect(UI['zh-TW'].mapHint).toContain('過高與過低');
  });

  it('calibration (documented, not evidence-derived): above the default pressure, more pressure never enlarges an M1 infarct', () => {
    const vol = (map: number) => sim({ occlusions: occl('mca_m1_l'), map, tH: 4320 }).volumes.finalInfarct;
    expect(vol(160)).toBeLessThanOrEqual(vol(110) + 0.5);
    expect(vol(110)).toBeLessThanOrEqual(vol(93) + 0.5);
  });
});

describe('C8-F5: subclavian steal', () => {
  const steal = (variants: string[] = [], extra: string[] = []) =>
    simulateHemodynamics({ occlusions: occl('subclavian_prox_l', ...extra), variants, map: 93, collateral: 'good' });

  it('with a normal right vertebral artery the steal is fed across the vertebrobasilar junction: the basilar artery and both P1 stay antegrade', () => {
    const h = steal();
    expect(h.reversed).toContain('va_extracranial_l');
    for (const v of ['basilar_lower', 'basilar_mid', 'basilar_upper', 'basilar_tip', 'pca_p1_r', 'pca_p1_l']) expect(h.reversed, v).not.toContain(v);
    expect(h.vesselFlow.basilar_tip).toBeGreaterThan(0);
  });

  it('the scenario still shows the steal and its syndrome, with a brain that stays perfused', () => {
    const r = sim({ occlusions: occl('subclavian_prox_l'), tH: 1 });
    expect(syndromes(r)).toContain('subclavian_steal');
    expect(r.nihss.total).toBe(0);
  });

  it('with a hypoplastic right vertebral artery the carotids have to help: the basilar tip reverses', () => {
    expect(steal(['va_hypoplastic_r']).reversed).toContain('basilar_tip');
  });

  it('the steal note says that it is usually silent and when it is not', () => {
    const d = event(sim({ occlusions: occl('subclavian_prox_l'), tH: 1 }), 'steal')!.desc;
    expect(d.en).toContain('usually without symptoms');
    expect(d.en).toContain('40–50 mmHg');
    expect(d.zh).toContain('多半沒有症狀');
    expect(d.zh).toContain('40–50 mmHg');
  });
});

describe('R4-3: a PICA trunk occlusion depends on the collaterals and on early reopening', () => {
  const PICA = occl('pica_r');
  const run = (collateral: CollateralGrade, reperfusionH: number | null) => sim({ occlusions: PICA, collateral, reperfusionH, tH: 4320 });
  const flow = (unit: string) => simulateHemodynamics({ occlusions: PICA, variants: [], map: 93, collateral: 'good' }).unitRel[unit];

  it('good collaterals hold the PICA territory in the penumbra', () => {
    expect(flow('vermis_inferior_r#pica_medial_r')).toBeGreaterThanOrEqual(0.31);
    expect(flow('cerebellum_posterior_inferior_r#pica_lateral_r')).toBeGreaterThanOrEqual(0.31);
  });

  it('with good collaterals, reopening at 1 h leaves less than half the untreated infarct', () => {
    expect(run('good', 1).volumes.finalInfarct).toBeLessThan(0.5 * run('good', null).volumes.finalInfarct);
  });

  it('untreated, good collaterals leave a smaller infarct than poor ones', () => {
    expect(run('good', null).volumes.finalInfarct).toBeLessThan(run('poor', null).volumes.finalInfarct);
  });

  it('the medial and the lateral branch alone still infarct their territories with good collaterals', () => {
    const medial = sim({ occlusions: occl('pica_medial_r'), tH: 72 });
    expect(medial.regions.vermis_inferior_r.infarct).toBeGreaterThanOrEqual(0.5);
    const lateral = sim({ occlusions: occl('pica_lateral_r'), tH: 72 });
    expect(lateral.regions.cerebellum_posterior_inferior_r.infarct).toBeGreaterThan(0.9);
  });
});

describe('R4-6: the chest-wall and neck collaterals also compensate CCA and brachiocephalic occlusions', () => {
  // Pinned so that a later calibration change to these links shows up here. With poor collaterals
  // the brain is fed through the undrawn subclavian links (thyrocervical trunk / superior thyroid
  // → external carotid → carotid bifurcation; around an innominate occlusion also from the aorta
  // through the internal thoracic artery into the reversed subclavian and on into the carotid).
  const PINNED: [string, number][] = [
    ['cca_r', 5.1],
    ['cca_l', 4.47],
    ['brachiocephalic', 7.57],
  ];
  it.each(PINNED)('%s with poor collaterals at 24 h: NIHSS 0 and a small infarct', (vessel, finalInfarct) => {
    const r = sim({ occlusions: occl(vessel), collateral: 'poor', tH: 24 });
    expect(r.nihss.total).toBe(0);
    expect(r.volumes.finalInfarct).toBeCloseTo(finalInfarct, 1);
  });

  it('around an innominate occlusion the right carotid is fed from the aorta through the reversed subclavian', () => {
    const h = simulateHemodynamics({ occlusions: occl('brachiocephalic'), variants: [], map: 93, collateral: 'poor' });
    expect(h.vesselFlow.subclavian_prox_r).toBeLessThan(-50);
    expect(h.vesselFlow.cca_r).toBeGreaterThan(50);
  });

  it('the README says so in both languages', () => {
    expect(readmeEn).toMatch(/common carotid or the brachiocephalic trunk is blocked/);
    expect(readmeZh).toMatch(/頸總動脈或頭臂動脈幹阻塞/);
  });
});
