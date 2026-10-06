/**
 * The treatment and reopening texts (eighth review round, group U2): the treatment windows come back
 * when a treated artery closes again (U2-1); the circle of Willis is said to help only where it
 * carries blood into the territory beyond an occlusion, and to fall short where an infarct still
 * develops (U2-5); the cortical signs of a striatocapsular infarct begin when the cortex has its
 * blood back and name the deep structures that die (U2-6); a distal embolus lowers the eTICI grade
 * the angiogram shows (U2-9); and an artery that reopens by itself is told (U2-10).
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';
import { angiographicGrade, embolusShare, type TreatmentOptions } from './treatment';

const input = (occlusions: Occlusion[], collateral: CollateralGrade = 'good', over: Partial<SimInput> = {}): SimInput => ({
  occlusions,
  variants: [],
  collateral,
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
  ...over,
});
const o = (vessel: string, over: Partial<Occlusion> = {}): Occlusion => ({ vessel, severity: 1, ...over });
const tx = (method: TreatmentOptions['method'], over: Partial<TreatmentOptions> = {}): TreatmentOptions => ({
  method,
  grade: '3',
  reocclusionAfterH: null,
  distalEmbolus: null,
  noReflow: 0,
  ...over,
});
const at = (i: SimInput, tH: number) => simulate({ ...i, tH });
const active = (r: SimResult, tH: number) => r.cascade.events.filter((e) => e.onsetH <= tH && (e.endH === undefined || tH < e.endH)).map((e) => e.id);
const scenario = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return input(sc.occlusions, sc.collateral ?? 'good', { variants: sc.variants ?? [], map: sc.map ?? 93, reperfusionH: sc.reperfusionH ?? null, ...over });
};

describe('U2-1: the treatment windows come back while a treated artery is closed again', () => {
  // a left M1 (moderate) opened by IV thrombolysis at 2 h that closes again 2 h later
  const ivt = input([o('mca_m1_l')], 'moderate', { reperfusionH: 2, treatment: tx('ivt', { reocclusionAfterH: 2 }) });

  it('closed again at 4 h: no windows while it is open, windows again from the reocclusion to the end of the first day', () => {
    expect(active(at(ivt, 3), 3)).not.toContain('treatment_window');
    for (const tH of [4, 6, 12]) expect(active(at(ivt, tH), tH), `${tH} h`).toContain('treatment_window');
    expect(active(at(ivt, 24), 24)).not.toContain('treatment_window');
    const again = at(ivt, 12).cascade.events.filter((e) => e.id === 'treatment_window').find((e) => e.onsetH > 2)!;
    expect(again.onsetH).toBeCloseTo(4, 6);
    expect(again.endH).toBeCloseTo(24, 6);
    // it says why they are offered again, in both languages
    expect(again.desc.en).toMatch(/closed again/);
    expect(again.desc.zh).toContain('又塞住');
  });

  it('thrombectomy at 4.5 h that closes again 6 h later: windows again from 10.5 h', () => {
    const evt = input([o('mca_m1_l')], 'good', { reperfusionH: 4.5, treatment: tx('evt', { reocclusionAfterH: 6 }) });
    expect(active(at(evt, 6), 6)).not.toContain('treatment_window');
    expect(active(at(evt, 12), 12)).toContain('treatment_window');
  });

  it('a reocclusion after the first day brings no windows back', () => {
    const late = input([o('mca_m1_l')], 'good', { reperfusionH: 12, treatment: tx('ivt', { reocclusionAfterH: 12 }) });
    expect(late.reperfusionH! + late.treatment!.reocclusionAfterH!).toBe(24);
    expect(at(late, 48).cascade.events.filter((e) => e.id === 'treatment_window').every((e) => (e.endH ?? Infinity) <= 12 + 1e-9)).toBe(true);
  });
});

describe('U2-5: the circle of Willis helps only where it carries blood beyond an occlusion', () => {
  const willis = (r: SimResult) => r.cascade.events.find((e) => e.id === 'willis_compensation');
  const single = (v: string, c: CollateralGrade, variants: string[] = []) => at(input([o(v)], c, { variants }), 24);

  it('an occlusion beyond the circle (M1, M2, A2) has no circle collaterals, on either side', () => {
    for (const v of ['mca_m1', 'mca_m2_sup', 'mca_m2_inf', 'aca_a2'])
      for (const s of ['r', 'l'])
        for (const c of ['good', 'moderate', 'poor'] as const) expect(willis(single(`${v}_${s}`, c)), `${v}_${s} ${c}`).toBeUndefined();
  });

  it('the carotid T: the anterior communicating artery feeds the ACA beyond the clot on both sides, but not the MCA, which infarcts', () => {
    for (const s of ['r', 'l']) {
      const r = single(`ica_terminal_${s}`, 'moderate');
      const e = willis(r)!;
      expect(e, s).toBeDefined();
      expect(e.desc.en, s).toContain('anterior communicating');
      expect(e.desc.en, s).not.toContain('posterior communicating');
      expect(e.severity, s).not.toBe('good');
      // the infarct it does not prevent, in the text
      expect(e.desc.en, s).toMatch(/not enough: about \d+ mL/);
      expect(e.desc.en, s).not.toMatch(/no symptoms/);
      expect(e.desc.zh, s).toMatch(/還不夠：.*約 \d+ mL/);
    }
  });

  it('a carotid occlusion without the communicating arteries names the ophthalmic route only, which falls short', () => {
    const r = at(scenario('ica_isolated'), 24);
    const e = willis(r)!;
    expect(r.volumes.finalInfarct).toBeGreaterThan(100);
    expect(e.desc.en).toContain('ophthalmic');
    expect(e.desc.en).not.toMatch(/communicating/);
    expect(e.desc.zh).not.toMatch(/交通動脈/);
    expect(e.severity).not.toBe('good');
  });

  it('a cervical carotid occlusion that the circle compensates fully is told as such, on both sides', () => {
    for (const s of ['r', 'l']) {
      const r = single(`ica_cervical_${s}`, 'good');
      const e = willis(r)!;
      expect(r.volumes.finalInfarct, s).toBeLessThan(0.5);
      expect(e.severity, s).toBe('good');
      expect(e.desc.en, s).toContain('anterior communicating');
      expect(e.desc.en, s).toContain('posterior communicating');
      expect(e.desc.en, s).toMatch(/no symptoms/);
    }
  });

  it('both cervical carotids: the posterior communicating arteries are the route, and they fall short', () => {
    const r = at(input([o('ica_cervical_r'), o('ica_cervical_l')], 'moderate'), 24);
    const e = willis(r)!;
    expect(e.desc.en).toContain('posterior communicating arteries');
    expect(e.severity).not.toBe('good');
    expect(e.desc.en).toMatch(/not enough/);
  });

  it('an A1 or P1 occlusion is bridged by its communicating artery', () => {
    expect(willis(single('aca_a1_l', 'good'))!.desc.en).toContain('anterior communicating');
    expect(willis(single('aca_a1_r', 'good'))!.desc.en).toContain('anterior communicating');
    expect(willis(single('pca_p1_l', 'good'))!.desc.en).toContain('posterior communicating');
  });

  it('the event follows the anatomy, not a side: an occlusion has it exactly when its mirror image does', () => {
    for (const v of ['ica_cervical', 'ica_petrous_cavernous', 'ica_ophthalmic_seg', 'ica_terminal', 'cca', 'aca_a1', 'pca_p1', 'pca_p2', 'mca_m1', 'mca_m2_inf', 'aca_a2', 'va_v4_dist'])
      for (const c of ['good', 'poor'] as const) expect(!!willis(single(`${v}_l`, c)), `${v} ${c}`).toBe(!!willis(single(`${v}_r`, c)));
  });
});

describe('U2-6: the cortical signs of a striatocapsular infarct begin when the cortex has its blood back', () => {
  // the reviewer's case: a left M1 (moderate) reopened by IV thrombolysis at 1 h
  const ivt1 = input([o('mca_m1_l')], 'moderate', { reperfusionH: 1, treatment: tx('ivt') });
  const event = (r: SimResult) => r.cascade.events.find((e) => e.id === 'striatocapsular_cortical_l');

  it('not at onset, beside the complete MCA syndrome and its global aphasia, but from the reopening, as the cortex regains its function', () => {
    const e = event(at(ivt1, 24))!;
    expect(e.onsetH).toBeCloseTo(1, 6);
    for (const tH of [0, 0.5]) {
      const r = at(ivt1, tH);
      expect(active(r, tH), `${tH} h`).not.toContain('striatocapsular_cortical_l');
      expect(r.symptoms.map((s) => s.id), `${tH} h`).not.toContain('aphasia_tc_motor');
    }
    expect(active(at(ivt1, 1), 1)).toContain('striatocapsular_cortical_l');
    expect(e.desc.en).toMatch(/regains its function over the following hours/);
    expect(e.desc.zh).toContain('皮質在接下來數小時逐漸恢復功能');
  });

  it('it names the deep structures that die: not the internal capsule, which survives here', () => {
    const r = at(ivt1, 4320);
    expect(Math.max(...['ic_posterior_limb_l', 'ic_genu_l', 'ic_anterior_limb_l'].map((k) => r.regions[k]?.infarct ?? 0))).toBeLessThan(0.2);
    const e = event(r)!;
    expect(e.desc.en).not.toMatch(/internal capsule/);
    expect(e.desc.zh).not.toContain('內囊');
    expect(e.desc.en).toMatch(/putamen/);
    expect(e.desc.zh).toContain('殼核');
    expect(e.regions.some((x) => x.startsWith('ic_'))).toBe(false);
  });

  it('a left M1 that reopens by itself at 30 min: the same, from 30 min', () => {
    expect(event(at(input([o('mca_m1_l', { toH: 0.5 })], 'moderate'), 24))!.onsetH).toBeCloseTo(0.5, 6);
  });

  it('the whole lenticulostriate group, whose occlusion never reached the cortex: from onset, with the capsule it infarcts', () => {
    const r = at(input([o('lenticulostriate_l')], 'good'), 4320);
    const e = event(r)!;
    expect(e.onsetH).toBe(0);
    expect(e.desc.en).toMatch(/internal capsule/);
    expect(e.desc.zh).toContain('內囊');
  });
});

describe('U2-9: a distal embolus lowers the eTICI grade the final angiogram shows', () => {
  it('the share of the territory a branch supplies, and the grade it leaves', () => {
    const inf = embolusShare(['mca_m1_l'], 'mca_m2_inf_l');
    expect(inf).toBeGreaterThan(0.2);
    expect(inf).toBeLessThan(0.7);
    // a new territory (the ACA during an MCA thrombectomy) is reported apart from the eTICI grade
    expect(embolusShare(['mca_m1_l'], 'aca_a2_l')).toBe(0);
    expect(angiographicGrade(tx('evt', { distalEmbolus: 'aca_a2_l' }), ['mca_m1_l'])).toBe('3');
    // never better than chosen, never 3 beside a blocked downstream branch
    for (const g of ['3', '2c', '2b67', '2b50', '2a', '1'] as const)
      for (const d of ['mca_m2_inf_l', 'mca_m2_sup_l', 'mca_angular_l']) {
        const shown = angiographicGrade(tx('evt', { grade: g, distalEmbolus: d }), ['mca_m1_l']);
        expect(['0', '1', '2a', '2b50', '2b67', '2c', '3'].indexOf(shown), `${g} ${d}`).toBeLessThanOrEqual(['0', '1', '2a', '2b50', '2b67', '2c', '3'].indexOf(g));
        expect(shown, `${g} ${d}`).not.toBe('3');
      }
  });

  it('thrombectomy at 2 h with a fragment in the inferior division: the recanalisation is not "eTICI 3: complete reperfusion"', () => {
    const r = at(input([o('mca_m1_l')], 'moderate', { reperfusionH: 2, treatment: tx('evt', { distalEmbolus: 'mca_m2_inf_l' }) }), 24);
    const e = r.cascade.events.find((x) => x.id === 'reperfusion')!;
    expect(e.title.en).not.toMatch(/eTICI 3\b/);
    expect(e.desc.en).not.toMatch(/^eTICI 3: complete reperfusion/);
    expect(e.desc.en).toMatch(/inferior division/);
    expect(e.title.zh).not.toMatch(/eTICI 3(?![0-9a-z])/);
    // the grade the angiogram shows is the one SimResult reports
    expect(e.title.en).toContain(`eTICI ${angiographicGrade(r.treatment!.options, r.treatment!.reopened)}`);
  });

  it('an embolus to a new territory leaves the grade of the target territory as chosen', () => {
    const r = at(input([o('mca_m1_l')], 'moderate', { reperfusionH: 2, treatment: tx('evt', { distalEmbolus: 'aca_a2_l' }) }), 24);
    expect(r.cascade.events.find((x) => x.id === 'reperfusion')!.title.en).toMatch(/eTICI 3$/);
  });
});

describe('U2-10: an artery that reopens by itself is told', () => {
  // a left M1 (good) that reopens by itself at 2 h: the course of a thrombectomy at 2 h
  const self = input([o('mca_m1_l', { toH: 2 })], 'good');
  const closed = input([o('mca_m1_l')], 'good');
  const event = (r: SimResult) => r.cascade.events.find((e) => e.id === 'spontaneous_recanalisation');

  it('an event at the reopening says that it reopened without treatment and what it saved', () => {
    const r = at(self, 24);
    const e = event(r)!;
    expect(e.onsetH).toBeCloseTo(2, 6);
    expect(e.severity).toBe('good');
    const saved = at(closed, 4320).volumes.finalInfarct - at(self, 4320).volumes.finalInfarct;
    expect(saved).toBeGreaterThan(100);
    const said = Number(/~(\d+) mL less infarct/.exec(e.desc.en)?.[1]);
    expect(Math.abs(said - saved)).toBeLessThanOrEqual(2);
    expect(e.desc.en).toMatch(/without any treatment/);
    expect(e.desc.zh).toContain('沒有任何治療');
    expect(e.desc.zh).toContain(`${said} mL`);
    expect(active(at(self, 2), 2)).toContain('spontaneous_recanalisation');
    expect(active(at(self, 1), 1)).not.toContain('spontaneous_recanalisation');
  });

  it('no such event when nothing reopens, when the reopening leaves no infarct (a TIA, told as such) or when a treatment reopened the artery first', () => {
    expect(event(at(closed, 24))).toBeUndefined();
    const tia = at(input([o('mca_m1_l', { toH: 1 / 12 })], 'good'), 24);
    expect(event(tia)).toBeUndefined();
    expect(tia.cascade.events.map((e) => e.id)).toContain('ischemia_no_infarct');
    const treated = at(input([o('mca_m1_l', { toH: 6 })], 'good', { reperfusionH: 2, treatment: tx('evt') }), 24);
    expect(event(treated)).toBeUndefined();
  });

  it('a stenosis that closes completely is not a reopening', () => {
    const r = at(input([o('basilar_mid', { severity: 0.7, toH: 6 }), o('basilar_mid', { fromH: 6 })], 'good'), 48);
    expect(event(r)).toBeUndefined();
  });
});
