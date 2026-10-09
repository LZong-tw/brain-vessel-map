/**
 * Reperfusion, the circle of Willis and the treatment windows (ninth review round, group T2): an
 * artery that reopens by itself late ends no larger than had it stayed closed, as a thrombectomy at
 * the same hour does (T2-2); the circle of Willis is said to be enough only where its territory
 * stayed working (T2-4); and a second occlusion's treatment windows quote its own core and the
 * recent infarct that counts against IV thrombolysis (T2-8).
 */
import { describe, expect, it } from 'vitest';
import { BEDS, REGION_BY_ID } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';
import type { TreatmentOptions } from './treatment';

const input = (occlusions: Occlusion[], collateral: CollateralGrade = 'good', over: Partial<SimInput> = {}): SimInput => ({
  occlusions,
  variants: [],
  collateral,
  map: 93,
  tH: 4320,
  reperfusionH: null,
  decompression: false,
  ...over,
});
const o = (vessel: string, over: Partial<Occlusion> = {}): Occlusion => ({ vessel, severity: 1, ...over });
const evt: TreatmentOptions = { method: 'evt', grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 };
const at = (i: SimInput, tH: number) => simulate({ ...i, tH });
const event = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);

describe('T2-2: an artery that reopens by itself late ends no larger than had it stayed closed', () => {
  // the reviewer's cases: malignant infarcts (poor collaterals) whose herniation infarcts the
  // border zones the reopening had partly saved, so the spontaneous reopening ended 16-32 mL larger
  // than the closed artery while a thrombectomy at the same hour ended smaller
  const CASES: [string, CollateralGrade, number][] = [
    ['mca_m1_l', 'poor', 12],
    ['mca_m1_l', 'poor', 24],
    ['mca_m1_r', 'poor', 12],
    ['ica_terminal_l', 'poor', 12],
    ['ica_terminal_l', 'good', 48],
  ];
  it.each(CASES)('%s, %s collaterals, reopening by itself at %s h: no larger than closed, and as a thrombectomy then', (v, c, h) => {
    const closed = at(input([o(v)], c), 4320).volumes.finalInfarct;
    const self = at(input([o(v, { toH: h })], c), 4320);
    const treated = at(input([o(v)], c, { reperfusionH: h, treatment: evt }), 4320).volumes.finalInfarct;
    expect(self.volumes.finalInfarct, 'against the closed artery').toBeLessThanOrEqual(closed + 0.01);
    expect(self.volumes.finalInfarct, 'against a thrombectomy at the same hour').toBeCloseTo(treated, 1);
    // what the event says it saved is what it saved
    const e = event(self, 'spontaneous_recanalisation')!;
    const saved = closed - self.volumes.finalInfarct;
    expect(self.cascade.spontaneous!.saved).toBeCloseTo(saved, 1);
    if (saved >= 1) expect(e.desc.en).toMatch(new RegExp(`~${saved.toFixed(0)} mL less infarct`));
  });
});

describe('T2-4: the circle of Willis is enough only where its territory stays working', () => {
  const willis = (r: SimResult) => event(r, 'willis_compensation');

  it.each([
    ['the basilar artery closed for 5 min', [o('basilar_mid', { toH: 1 / 12 })]],
    ['the top of the basilar closed for 5 min', [o('basilar_tip', { toH: 1 / 12 })]],
    ['the left carotid T closed for 5 min', [o('ica_terminal_l', { toH: 1 / 12 })]],
    ['the right carotid T closed for 5 min', [o('ica_terminal_r', { toH: 1 / 12 })]],
  ] as [string, Occlusion[]][])('%s: the deficits of the attack come from beyond the block; no green "enough"', (_name, occ) => {
    const r0 = at(input(occ), 0);
    expect(r0.nihss.total).toBeGreaterThan(10);
    const e = willis(r0)!;
    expect(e).toBeDefined();
    expect(e.severity).not.toBe('good');
    expect(e.desc.en).not.toMatch(/enough to prevent an infarct/);
    expect(e.desc.en).not.toMatch(/no symptoms at all/);
    expect(e.desc.en).toMatch(/not enough to keep their territory working/);
    expect(e.desc.zh).not.toContain('完全沒有症狀');
    expect(e.desc.zh).toContain('還不夠讓');
    // the same text at the end, when nothing has infarcted
    expect(willis(at(input(occ), 4320))!.desc).toEqual(e.desc);
  });

  it('a cervical carotid that the circle compensates fully, for 5 min or for good, is still told as enough', () => {
    for (const occ of [[o('ica_cervical_l', { toH: 1 / 12 })], [o('ica_cervical_l')]]) {
      const r = at(input(occ), 0);
      expect(r.nihss.total).toBe(0);
      expect(willis(r)!.severity).toBe('good');
      expect(willis(r)!.desc.en).toMatch(/enough to prevent an infarct/);
    }
  });

  it('the stuttering basilar template: one severity before and after the occlusion on day 3, never green beside the attack', () => {
    const sc = SCENARIOS.find((s) => s.id === 'basilar_stuttering')!;
    const run = (tH: number) => at(input(sc.occlusions), tH);
    const first = willis(run(0))!;
    const later = willis(run(72))!;
    expect(first.severity).toBe('info');
    expect(later.severity).toBe(first.severity);
    expect(later.onsetH).toBe(first.onsetH);
    expect(later.title).toEqual(first.title);
  });
});

describe('T2-8: a second occlusion is decided on its own core, and a recent infarct counts against IV thrombolysis', () => {
  const window = (r: SimResult, fromH: number) => r.cascade.events.find((e) => e.id === 'treatment_window' && Math.abs(e.onsetH - fromH) < 1e-6);

  it.each([48, 720])('a right M1 that closes %s h after a left M1 infarct: the right side\'s own core, and IV thrombolysis not standard', (t) => {
    const r = at(input([o('mca_m1_l'), o('mca_m1_r', { fromH: t })]), t + 6);
    const w = window(r, t)!;
    expect(w).toBeDefined();
    // The remaining donor circulation changes this new core relative to an isolated M1.
    // Its actual right-sided infarct is quoted, without the old left-sided infarct.
    const quoted = /Large core \(about (\d+) mL/.exec(w.desc.en);
    expect(quoted).not.toBeNull();
    const coreOn = (side: 'l' | 'r') => BEDS.filter((bed) => REGION_BY_ID[bed.region].side === side)
      .reduce((sum, bed) => sum + bed.volume * r.beds[bed.id].infarct, 0);
    const own = coreOn('r');
    const old = coreOn('l');
    expect(old).toBeGreaterThan(0);
    expect(Number(quoted![1])).toBe(Math.round(own));
    expect(Number(quoted![1])).not.toBe(Math.round(own + old));
    expect(w.desc.en).not.toMatch(/larger than in most of these trials/);
    // an ischaemic stroke within 3 months: IV thrombolysis is not offered as standard
    expect(w.desc.en).not.toMatch(/standard when started within 4\.5 h/);
    expect(w.desc.en).toMatch(/previous 3 months/);
    expect(w.desc.en).toMatch(/thrombectomy/i);
    expect(w.desc.zh).toContain('3 個月內');
    expect(w.desc.zh).not.toContain('標準是發作 4.5 小時內開始用藥');
  });

  it('more than 3 months later, or after a TIA, IV thrombolysis is standard again', () => {
    const late = window(at(input([o('mca_m1_l'), o('mca_m1_r', { fromH: 2400 })]), 2406), 2400)!;
    expect(late.desc.en).toMatch(/standard when started within 4\.5 h/);
    expect(late.desc.en).not.toMatch(/previous 3 months/);
    const tia = window(at(input([o('mca_m1_l', { toH: 1 / 12 }), o('mca_m1_r', { fromH: 48 })]), 54), 48)!;
    expect(tia.desc.en).toMatch(/standard when started within 4\.5 h/);
  });

  it('a medium-vessel occlusion after a recent infarct is not told that IV thrombolysis is its standard treatment', () => {
    // (a left PCA infarct, then a right upper-division M2 a week later, which infarcts more and is
    // the index event)
    const w = window(at(input([o('pca_p2_l'), o('mca_m2_sup_r', { fromH: 168 })]), 174), 168)!;
    expect(w.desc.en).not.toMatch(/IV thrombolysis is standard/);
    expect(w.desc.en).toMatch(/previous 3 months/);
  });
});
