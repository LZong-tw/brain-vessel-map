/**
 * Treatment details (engine/treatment.ts): partial reperfusion (eTICI grade) and no-reflow,
 * reocclusion, a distal embolus and the method. The default treatment must reproduce the model
 * as it was before these options existed, number for number.
 */
import { describe, expect, it } from 'vitest';
import { BEDS, REGION_BY_ID, VESSEL_BY_ID, vesselName } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { simulate, type SimInput, type SimResult } from './simulate';
import { DEFAULT_TREATMENT, GRADE_REPERFUSED, REPERFUSION_GRADES, downstreamBranches, reperfusedFraction, type TreatmentOptions } from './treatment';

const base: SimInput = { occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false };
const sim = (over: Partial<SimInput>) => simulate({ ...base, ...over });
const withT = (over: Partial<SimInput>, t: Partial<TreatmentOptions>) => sim({ ...over, treatment: { ...DEFAULT_TREATMENT, ...t } });
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
/** everything but the echo of the input and the treatment summary */
const outputs = (r: SimResult) => ({ ...r, input: undefined, treatment: undefined });
const tissue = (r: SimResult) => ({ beds: r.beds, regions: r.regions, volumes: r.volumes, edema: r.edema, recovery: r.recovery, hemo: r.hemo });
const final = (r: SimResult) => r.volumes.finalInfarct;
const eventOf = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
const BRAIN = new Set(['cortex', 'deep', 'brainstem', 'cerebellum']);
const salvagedMl = (r: SimResult) =>
  BEDS.filter((b) => BRAIN.has(REGION_BY_ID[b.region].category)).reduce((a, b) => a + r.beds[b.id].frac.salvaged * b.volume, 0);

const M1 = { occlusions: [{ vessel: 'mca_m1_l', severity: 1 }], reperfusionH: 2 };
const M1_UNTREATED = { ...M1, reperfusionH: null };
const BASILAR = { occlusions: [{ vessel: 'basilar_mid', severity: 1 }], reperfusionH: 6 };
const BASILAR_UNTREATED = { ...BASILAR, reperfusionH: null };

describe('default treatment = the model before treatment details', () => {
  // outputs of the model at the commit that introduced the treatment contract (before any of it
  // was implemented): the default treatment must keep them exactly. The l_m1 and basilar values
  // moved in the 7th significant digit when the two inferior pontine paramedian arteries got their
  // refined centrelines (the generated paths had been missing them; their length enters the flow
  // model), and in the 4th–5th when the subclavian arteries got their chest-wall and neck
  // collaterals (C8-F5): they carry a trickle at baseline, which shifts the vertebral and
  // communicating flows of the calibration slightly. They moved again in the 3rd–4th significant
  // digit when the cuneus was given its calcarine supply (C1-F3: the new perfusion units shift the
  // PCA branch flows and, through the circle of Willis, the rest of the network) and when half of
  // the posterior thalamus was attached to the posterior choroidal artery before its choroidal
  // anastomosis with the AChA (C9-F5: the posterior choroidal artery now carries more of its own
  // territory at baseline, 0.13 → 0.33 mL/min, and the AChA less); the smaller paramedian midbrain
  // share of the thalamoperforating arteries (C9-F1) moves the basilar values in the 5th, and so,
  // by about 1e-5 mL, do the weaker PICA-to-PICA anastomosis and the smaller vertebral share of the
  // medial medulla (C7-F2, C7-F3). They moved again in the 4th significant digit when the PICA's
  // hemispheric anastomoses with the AICA and the SCA were strengthened (R4-3: 0.08 → 0.105; with
  // good collaterals they carry a little more at baseline, which shifts the vertebrobasilar flows
  // of the calibration). The values below are those of all of these together (l_m1 core
  // 59.006 → 59.267 mL: about +0.156 from C1-F3, +0.097 from C8-F5 and C9-F5 and +0.009 from
  // R4-3, which add up). NIHSS and event texts did not change. X3-0: they moved again when the
  // flow model mirrored the pial arteries of the hemispheres (the mean of the two sides' lengths
  // and baseline flows for A2, M2, P2 and their branches): l_m1 core 59.267 → 58.046 mL (the left
  // M2 branches are traced longer than the right ones), the basilar values in the 4th significant
  // digit through the P2 branches; NIHSS and event texts did not change. Y2-17: the cervical cord
  // region is now the upper cervical cord (C1–C3) that an occlusion at the origin of the anterior
  // spinal artery threatens, 2 mL instead of 3, which lowers the flow the ASA draws: l_m1 core
  // 58.046 → 58.030 mL, the basilar values in the 4th significant digit; NIHSS and event texts did
  // not change.
  const GOLDEN: [string, Partial<SimInput>, { core: number; finalInfarct: number; saved: number; nihss: number; reperfusion: string }][] = [
    ['l_m1 opened at 2 h, 24 h', { reperfusionH: 2, tH: 24 }, { core: 58.02959827117762, finalInfarct: 58.02959827117762, saved: 89.32210056740406, nihss: 15, reperfusion: 'good|Recanalisation (thrombolysis / thrombectomy)' }],
    ['basilar_mid opened at 6 h, 72 h', { reperfusionH: 6, tH: 72 }, { core: 0.548183407798022, finalInfarct: 0.548183407798022, saved: 2.2891834072667288, nihss: 0, reperfusion: 'info|Recanalisation (thrombolysis / thrombectomy)' }],
    ['r_m1_malignant opened at 3 h, 72 h', { reperfusionH: 3, tH: 72 }, { core: 485.13835470147296, finalInfarct: 485.13835470147296, saved: 3.0127011996228248e-12, nihss: 37, reperfusion: 'info|Recanalisation (thrombolysis / thrombectomy)' }],
    ['basilar_stuttering opened at 78 h, 168 h', { reperfusionH: 78, tH: 168 }, { core: 0.555090683882325, finalInfarct: 0.555090683882325, saved: 2.282276131182426, nihss: 0, reperfusion: 'info|Recanalisation (thrombolysis / thrombectomy)' }],
  ];
  it.each(GOLDEN)('%s: exactly as before', (label, over, want) => {
    const id = label.split(' ')[0];
    for (const treatment of [undefined, DEFAULT_TREATMENT, { ...DEFAULT_TREATMENT }]) {
      const r = simulate({ ...scenario(id, over), treatment });
      const rep = eventOf(r, 'reperfusion');
      expect({
        core: r.volumes.core,
        finalInfarct: r.volumes.finalInfarct,
        saved: r.volumes.saved,
        nihss: r.nihss.total,
        reperfusion: `${rep?.severity}|${rep?.title.en}`,
      }).toEqual(want);
    }
  });

  it('leaving the treatment out, passing the default and passing a copy of it give identical results', () => {
    for (const id of ['l_m1', 'basilar_mid', 'basilar_stuttering', 'r_m1_malignant', 'tia_l_mca', 'l_lacune'])
      for (const reperfusionH of [0.5, 2, 6, 24])
        for (const tH of [1, 24, 4320]) {
          const ref = outputs(simulate(scenario(id, { reperfusionH, tH })));
          expect(outputs(simulate(scenario(id, { reperfusionH, tH, treatment: DEFAULT_TREATMENT })))).toEqual(ref);
          expect(outputs(simulate(scenario(id, { reperfusionH, tH, treatment: { ...DEFAULT_TREATMENT } })))).toEqual(ref);
        }
  });

  // a non-default option that does not touch the tissue (the method) goes through the general
  // path (two courses, blending); it must reproduce the default tissue exactly
  it('the general path reproduces the default tissue exactly when nothing changes the flow', () => {
    for (const [over, tH] of [
      [M1, 24],
      [M1, 4320],
      [BASILAR, 72],
    ] as const) {
      const ref = tissue(sim({ ...over, tH }));
      expect(tissue(withT({ ...over, tH }, { method: 'bridging' }))).toEqual(ref);
      // an id that is not a vessel is ignored
      expect(tissue(withT({ ...over, tH }, { distalEmbolus: 'no_such_vessel' }))).toEqual(ref);
    }
  });
});

describe('partial reperfusion (eTICI grade) and no-reflow', () => {
  it.each([
    ['left M1 opened at 2 h', M1, M1_UNTREATED],
    ['mid-basilar, good collaterals, opened at 6 h', BASILAR, BASILAR_UNTREATED],
  ] as const)('%s: the final infarct falls monotonically from eTICI 0 to 3', (_label, over, untreatedOver) => {
    const untreated = final(sim({ ...untreatedOver, tH: 4320 }));
    const complete = final(sim({ ...over, tH: 4320 }));
    const byGrade = REPERFUSION_GRADES.map((grade) => final(withT({ ...over, tH: 4320 }, { grade })));
    for (let k = 1; k < byGrade.length; k++) expect(byGrade[k], REPERFUSION_GRADES[k]).toBeLessThanOrEqual(byGrade[k - 1] + 1e-9);
    expect(byGrade[0]).toBe(untreated);
    expect(byGrade[byGrade.length - 1]).toBe(complete);
    expect(byGrade[0] - byGrade[byGrade.length - 1]).toBeGreaterThan(1);
    // the reperfused share is a straight blend of the two courses (no secondary infarcts here)
    for (const [k, grade] of REPERFUSION_GRADES.entries()) {
      const x = GRADE_REPERFUSED[grade];
      expect(byGrade[k], grade).toBeCloseTo(x * complete + (1 - x) * untreated, 6);
    }
  });

  it('eTICI 0: exactly the untreated tissue, but the event says the attempt failed', () => {
    for (const tH of [1, 3, 24, 4320]) {
      const failed = withT({ ...M1, tH }, { grade: '0' });
      const untreated = sim({ ...M1_UNTREATED, tH });
      expect(tissue(failed)).toEqual(tissue(untreated));
      expect(failed.activeOcclusions).toEqual(untreated.activeOcclusions);
      expect(failed.recanalized).toBe(false);
      expect(failed.schedule.status).toEqual(['active']);
      const ev = eventOf(failed, 'reperfusion')!;
      expect(ev.severity).toBe('warn');
      expect(ev.title.en).toMatch(/failed/i);
      expect(ev.title.zh).toContain('失敗');
      expect(failed.volumes.saved).toBe(0);
    }
    // the timeline still shows the attempt, reopening nothing
    const failed = withT({ ...M1, tH: 24 }, { grade: '0' });
    expect(failed.schedule.events.find((e) => e.kind === 'treatment')).toMatchObject({ h: 2, reopens: [] });
  });

  it('no-reflow: 0.3 saves less than 0.15, which saves less than none; each lies between complete and untreated', () => {
    const untreated = final(sim({ ...M1_UNTREATED, tH: 4320 }));
    const saved = [0, 0.15, 0.3].map((noReflow) => withT({ ...M1, tH: 4320 }, { noReflow }));
    expect(saved[1].volumes.saved).toBeLessThan(saved[0].volumes.saved);
    expect(saved[2].volumes.saved).toBeLessThan(saved[1].volumes.saved);
    for (const r of saved) {
      expect(final(r)).toBeGreaterThanOrEqual(final(saved[0]) - 1e-9);
      expect(final(r)).toBeLessThanOrEqual(untreated + 1e-9);
    }
    expect(eventOf(saved[2], 'reperfusion')!.desc.en).toContain('no-reflow');
    expect(eventOf(saved[2], 'reperfusion')!.desc.zh).toContain('無再流');
  });

  it('only the share that treatment saved is "salvaged", also with partial reperfusion', () => {
    for (const t of [{ grade: '2b50' as const }, { grade: '2a' as const, noReflow: 0.3 }]) {
      const r = withT({ ...M1, tH: 4320 }, t);
      expect(salvagedMl(r)).toBeCloseTo(r.volumes.saved, 0);
      expect(salvagedMl(r)).toBeLessThan(salvagedMl(sim({ ...M1, tH: 4320 })));
    }
  });

  it('with partial reperfusion every bed still adds up to 1 and the flow shown is the blend', () => {
    const x = GRADE_REPERFUSED['2b50'];
    for (const tH of [0.5, 2, 3, 12, 72]) {
      const r = withT({ ...M1, tH }, { grade: '2b50' });
      for (const b of BEDS) expect(Object.values(r.beds[b.id].frac).reduce((a, v) => a + v, 0), `${b.id} t=${tH}`).toBeCloseTo(1, 9);
      const open = sim({ ...M1, tH }).hemo.vesselFlow.mca_m1_l;
      const shut = sim({ ...M1_UNTREATED, tH }).hemo.vesselFlow.mca_m1_l;
      expect(r.hemo.vesselFlow.mca_m1_l).toBeCloseTo(tH >= 2 ? x * open + (1 - x) * shut : shut, 9);
    }
  });

  // the invariant the grade and no-reflow must keep for every scenario
  const withComplete = SCENARIOS.filter((s) => s.occlusions.some((o) => o.severity >= 1 && !o.branch));
  it.each(withComplete.map((s) => [s.id]))('%s: a partial result lies between complete reperfusion and none', (id) => {
    for (const collateral of ['good', 'poor'] as const)
      for (const reperfusionH of [2, 6]) {
        const over = { collateral, reperfusionH, tH: 24 };
        const untreated = final(simulate(scenario(id, { ...over, reperfusionH: null })));
        const complete = final(simulate(scenario(id, over)));
        for (const t of [{ grade: '2a' }, { grade: '2b67' }, { grade: '3', noReflow: 0.3 }] as Partial<TreatmentOptions>[]) {
          const r = final(simulate(scenario(id, { ...over, treatment: { ...DEFAULT_TREATMENT, ...t } })));
          const label = `${id} ${collateral} ${reperfusionH} h ${JSON.stringify(t)}`;
          expect(r, label).toBeGreaterThanOrEqual(Math.min(complete, untreated) - 0.01);
          expect(r, label).toBeLessThanOrEqual(untreated + 0.01);
          expect(r, label).toBeGreaterThanOrEqual(complete - 0.01);
        }
        // a lasting reocclusion never does worse than no treatment
        const reoccluded = final(simulate(scenario(id, { ...over, treatment: { ...DEFAULT_TREATMENT, reocclusionAfterH: 1 } })));
        expect(reoccluded, `${id} ${collateral} ${reperfusionH} h reocclusion`).toBeLessThanOrEqual(untreated + 0.01);
      }
  });
});

describe('reocclusion', () => {
  it.each([1, 12])('the artery closes again %s h after reperfusion: worse than staying open, never worse than no treatment', (after) => {
    const open = final(sim({ ...M1, tH: 4320 }));
    const untreated = final(sim({ ...M1_UNTREATED, tH: 4320 }));
    const r = withT({ ...M1, tH: 4320 }, { reocclusionAfterH: after });
    expect(final(r)).toBeGreaterThan(open + 1);
    expect(final(r)).toBeLessThanOrEqual(untreated + 0.01);
    expect(r.treatment?.reocclusionH).toBe(2 + after);
    const ev = eventOf(r, 'reocclusion')!;
    expect(ev.onsetH).toBe(2 + after);
    expect(ev.title.en).toMatch(/reocclusion/i);
    expect(ev.title.zh).toContain('再阻塞');
  });

  it('the later it recloses, the later the infarct grows', () => {
    const core = (after: number | null, tH: number) => withT({ ...M1, tH }, { reocclusionAfterH: after }).volumes.core;
    expect(core(12, 24)).toBeLessThan(core(1, 24) - 1);
    expect(core(1, 24)).toBeGreaterThan(core(null, 24) + 1);
    expect(core(12, 12)).toBeCloseTo(core(null, 12), 9);
  });

  it('the reopened occlusion is in effect again after the reocclusion, and the vessel shows as occluded', () => {
    const at = (tH: number) => withT({ ...M1, tH }, { reocclusionAfterH: 1 });
    expect(at(2.5).schedule.status).toEqual(['treated']);
    expect(at(2.5).recanalized).toBe(true);
    expect(at(2.5).activeOcclusions).toEqual([]);
    expect(at(6).schedule.status).toEqual(['active']);
    expect(at(6).recanalized).toBe(false);
    expect(at(6).activeOcclusions.map((o) => o.vessel)).toEqual(['mca_m1_l']);
    expect(at(6).hemo.vesselFlow.mca_m1_l).toBe(sim({ ...M1_UNTREATED, tH: 6 }).hemo.vesselFlow.mca_m1_l);
  });

  it('an occlusion that would have cleared by itself does not come back after it would have cleared', () => {
    const occlusions = [{ vessel: 'mca_m1_l', severity: 1, toH: 10 }];
    const untreated = final(sim({ occlusions, reperfusionH: null, tH: 4320 }));
    const late = withT({ occlusions, reperfusionH: 2, tH: 4320 }, { reocclusionAfterH: 12 });
    expect(late.treatment?.reocclusionH).toBeNull();
    expect(eventOf(late, 'reocclusion')).toBeUndefined();
    expect(final(late)).toBe(final(sim({ occlusions, reperfusionH: 2, tH: 4320 })));
    const early = withT({ occlusions, reperfusionH: 2, tH: 4320 }, { reocclusionAfterH: 4 });
    expect(early.treatment?.reocclusionH).toBe(6);
    expect(final(early)).toBeLessThanOrEqual(untreated + 0.01);
    expect(withT({ occlusions, reperfusionH: 2, tH: 12 }, { reocclusionAfterH: 4 }).activeOcclusions).toEqual([]);
  });
});

describe('distal embolus', () => {
  const branch = 'mca_m2_sup_l';

  it('a clot fragment in a downstream branch adds infarct in the territory that branch supplies, and only there', () => {
    expect(downstreamBranches('mca_m1_l')).toContain(branch);
    const clean = sim({ ...M1, tH: 4320 });
    const r = withT({ ...M1, tH: 4320 }, { distalEmbolus: branch });
    expect(final(r)).toBeGreaterThan(final(clean) + 5);
    // the insular cortex fed by the superior division …
    const fed = 'insula_l__MCAF';
    expect(BEDS.find((b) => b.id === fed)!.supply.map((s) => s.v)).toContain(branch);
    expect(r.beds[fed].infarct).toBeGreaterThan(clean.beds[fed].infarct + 0.2);
    // … but not the temporal cortex of the inferior division
    const other = BEDS.find((b) => b.supply.length === 1 && b.supply[0].v === 'mca_temporal_middle_l')!;
    expect(r.beds[other.id].infarct).toBeCloseTo(clean.beds[other.id].infarct, 9);
    // the branch shows as occluded from the treatment on, and it is not "reopened" by it
    expect(r.activeOcclusions.map((o) => o.vessel)).toEqual([branch]);
    expect(r.recanalized).toBe(true);
    expect(withT({ ...M1, tH: 1 }, { distalEmbolus: branch }).activeOcclusions.map((o) => o.vessel)).toEqual(['mca_m1_l']);
  });

  it('names the branch in the event (zh-TW and en) and lists the regions it supplies', () => {
    const r = withT({ ...M1, tH: 24 }, { distalEmbolus: branch });
    const ev = eventOf(r, 'distal_embolus')!;
    expect(ev.onsetH).toBe(2);
    expect(ev.title.en).toContain(vesselName(VESSEL_BY_ID[branch], 'en'));
    expect(ev.title.zh).toContain(vesselName(VESSEL_BY_ID[branch], 'zh-TW'));
    expect(ev.regions).toContain('insula_l');
    expect(r.treatment?.distalEmbolus).toBe(branch);
  });

  it('is ignored when the id is not an occludable vessel, is the reopened artery itself, or nothing was reopened', () => {
    for (const id of ['no_such_vessel', 'mca_m1_l']) {
      const r = withT({ ...M1, tH: 4320 }, { distalEmbolus: id });
      expect(r.treatment?.distalEmbolus).toBeNull();
      expect(eventOf(r, 'distal_embolus')).toBeUndefined();
      expect(final(r)).toBe(final(sim({ ...M1, tH: 4320 })));
    }
    const failed = withT({ ...M1, tH: 4320 }, { grade: '0', distalEmbolus: branch });
    expect(failed.treatment?.distalEmbolus).toBeNull();
    expect(final(failed)).toBe(final(sim({ ...M1_UNTREATED, tH: 4320 })));
  });
});

describe('method and events', () => {
  it('the reperfusion event names the method and the grade', () => {
    const r = withT({ ...M1, tH: 24 }, { method: 'bridging', grade: '2b67' });
    const ev = eventOf(r, 'reperfusion')!;
    expect(ev.title.en).toContain('thrombectomy');
    expect(ev.title.en).toContain('thrombolysis');
    expect(ev.title.en).toContain('eTICI 2b67');
    expect(ev.title.zh).toContain('eTICI 2b67');
    expect(ev.title.zh).toContain('取栓');
    expect(eventOf(withT({ ...M1, tH: 24 }, { method: 'ivt' }), 'reperfusion')!.title.en).toContain('IV thrombolysis');
  });

  it('thrombolysis raises the haemorrhagic-transformation risk modestly, never below thrombectomy alone', () => {
    const LEVELS = ['low', 'moderate', 'high'];
    const level = (r: SimResult) => LEVELS.findIndex((l) => eventOf(r, 'hemorrhagic_transformation')!.title.en.endsWith(l));
    // a 59 mL infarct: moderate after thrombectomy alone, one step higher with the drug
    const evt = withT({ ...M1, tH: 24 }, { method: 'evt', grade: '3', noReflow: 0.01 });
    expect(level(evt)).toBe(1);
    expect(level(withT({ ...M1, tH: 24 }, { method: 'ivt' }))).toBe(2);
    expect(level(withT({ ...M1, tH: 24 }, { method: 'bridging' }))).toBe(2);
    for (const id of ['l_m2_sup', 'l_m2_inf', 'r_aca', 'l_pca', 'r_pica', 'l_m1'])
      for (const reperfusionH of [2, 6, 12]) {
        const over = scenario(id, { reperfusionH, tH: 24 });
        const e = level(simulate({ ...over, treatment: { ...DEFAULT_TREATMENT, noReflow: 0.01 } }));
        const i = level(simulate({ ...over, treatment: { ...DEFAULT_TREATMENT, noReflow: 0.01, method: 'ivt' } }));
        expect(i, `${id} ${reperfusionH} h`).toBeGreaterThanOrEqual(e);
        expect(i - e, `${id} ${reperfusionH} h`).toBeLessThanOrEqual(1);
      }
  });

  it('the treatment complication events carry their ids and both languages', () => {
    const r = withT({ ...M1, tH: 24 }, { reocclusionAfterH: 12, distalEmbolus: 'mca_m2_sup_l', grade: '2c' });
    const ids = r.cascade.events.map((e) => e.id);
    for (const id of ['reperfusion', 'reocclusion', 'distal_embolus']) {
      expect(ids).toContain(id);
      const ev = eventOf(r, id)!;
      expect(ev.title.zh.length).toBeGreaterThan(0);
      expect(ev.desc.zh.length).toBeGreaterThan(0);
      expect(ev.title.en.length).toBeGreaterThan(0);
      expect(ev.desc.en.length).toBeGreaterThan(0);
    }
    // the default treatment adds none of them
    const plain = sim({ ...M1, tH: 24 }).cascade.events.map((e) => e.id);
    expect(plain).not.toContain('reocclusion');
    expect(plain).not.toContain('distal_embolus');
  });
});

describe('SimResult.treatment', () => {
  it('is null without treatment', () => {
    expect(sim({ ...M1_UNTREATED, tH: 24 }).treatment).toBeNull();
  });

  it('describes the default treatment', () => {
    expect(sim({ ...M1, tH: 24 }).treatment).toEqual({
      options: DEFAULT_TREATMENT,
      reperfusedFraction: 1,
      reopened: ['mca_m1_l'],
      failed: false,
      reocclusionH: null,
      distalEmbolus: null,
    });
  });

  it('reports the options in effect, the reperfused share and what was reopened', () => {
    const t: TreatmentOptions = { method: 'bridging', grade: '2b50', reocclusionAfterH: 12, distalEmbolus: 'mca_angular_l', noReflow: 0.15 };
    const r = sim({ ...M1, tH: 24, treatment: t });
    expect(r.treatment).toEqual({
      options: t,
      reperfusedFraction: reperfusedFraction(t),
      reopened: ['mca_m1_l'],
      failed: false,
      reocclusionH: 14,
      distalEmbolus: 'mca_angular_l',
    });
    expect(r.treatment!.reperfusedFraction).toBeCloseTo(0.58 * 0.85, 12);
  });

  it('lists only the occlusions in effect at the treatment (a stenosis stays, a later occlusion is not reopened)', () => {
    const occlusions = [
      { vessel: 'mca_m1_l', severity: 1 },
      { vessel: 'ica_cervical_r', severity: 0.7 },
      { vessel: 'mca_m2_sup_r', severity: 1, fromH: 12 },
    ];
    const r = sim({ occlusions, reperfusionH: 2, tH: 24, treatment: { ...DEFAULT_TREATMENT, grade: '2b67' } });
    expect(r.treatment?.reopened).toEqual(['mca_m1_l']);
  });

  it('replaces values outside the contract', () => {
    const r = sim({ ...M1, tH: 24, treatment: { method: 'laser' as never, grade: '4' as never, reocclusionAfterH: -1, distalEmbolus: null, noReflow: 3 } });
    expect(r.treatment?.options).toEqual({ ...DEFAULT_TREATMENT, noReflow: 0.5 });
    expect(r.treatment?.reperfusedFraction).toBe(0.5);
  });
});

describe('downstreamBranches (distal-embolus choices)', () => {
  it('follows the artery past its own segment ends: a mid-basilar clot can embolise to the SCA and PCA', () => {
    const d = downstreamBranches('basilar_mid', 40);
    expect(d).toEqual(expect.arrayContaining(['sca_l', 'sca_r', 'pca_p1_l', 'pca_p1_r']));
  });

  it('lists branches, not perforators, communicating arteries or collaterals', () => {
    const m1 = downstreamBranches('mca_m1_l', 40);
    expect(m1).toEqual(expect.arrayContaining(['mca_m2_sup_l', 'mca_m2_inf_l']));
    expect(m1).not.toContain('lenticulostriate_l');
    for (const id of m1) expect(['branch', 'trunk']).toContain(VESSEL_BY_ID[id].kind);
  });

  it('does not cross into another circulation through a communicating artery', () => {
    // the PCA connects back to the carotid through the PComm, the ACA to the other side through the AComm
    expect(downstreamBranches('basilar_mid', 60).some((id) => /^(ica|mca|aca)_/.test(id))).toBe(false);
    expect(downstreamBranches('mca_m1_l', 60).some((id) => id.endsWith('_r'))).toBe(false);
  });

  it('an ICA-terminus clot can embolise to a new territory (ACA)', () => {
    expect(downstreamBranches('ica_terminal_l', 40)).toEqual(expect.arrayContaining(['aca_a1_l', 'mca_m1_l']));
  });
});
