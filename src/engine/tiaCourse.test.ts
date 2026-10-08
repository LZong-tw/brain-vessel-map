/**
 * Z4-11: the transient-ischaemic-attack story while the deficit lasts and after it has cleared.
 * Nobody can know at the bedside that a deficit will clear: while it is there it is an acute stroke
 * (brain imaging at once, reperfusion treatment for a disabling deficit; antiplatelet drugs only
 * once a scan has excluded a bleed: Powers WJ et al. Stroke 2019;50:e344–e418). "Symptoms gone
 * does not mean safe" and the antiplatelet advice of a TIA (Easton JD et al. Stroke 2009;40:
 * 2276–2293) belong to the time after it has cleared.
 */
import { describe, expect, it } from 'vitest';
import { REGION_BY_ID } from '../anatomy';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { startOf } from './schedule';
import { simulate, type SimInput, type SimResult } from './simulate';
import { DEFAULT_TREATMENT } from './treatment';

const TIA = ['ischemia_no_infarct', 'imaging_no_infarct', 'tia_urgent'];
const STOPS = TIME_STOPS.map((s) => s.h);
const run = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'good', map: 93, tH, reperfusionH: null, decompression: false, ...over });
const scenario = (id: string, tH: number) => {
  const sc = SCENARIO_BY_ID[id];
  return run(sc.occlusions, tH, { collateral: sc.collateral ?? 'good', variants: sc.variants ?? [], map: sc.map ?? 93 });
};
/** events in effect at the displayed time */
const active = (r: SimResult) => r.cascade.events.filter((e) => e.onsetH <= r.input.tH && r.input.tH < (e.endH ?? Infinity));
const activeIds = (r: SimResult) => active(r).map((e) => e.id);
/** a deficit of the brain or the inner ear is listed (or there but not examinable) */
const deficit = (r: SimResult) =>
  [...r.symptoms, ...r.unexaminable].some((s) => s.sources.some((src) => !['eye', 'spinal', 'extracranial'].includes(REGION_BY_ID[src]?.category ?? '')));

/** attacks that leave no infarct: the templates, single attacks of each circulation, and an attack ended by treatment */
const CASES: [string, (tH: number) => SimResult][] = [
  ['tia_l_mca', (t) => scenario('tia_l_mca', t)],
  ['capsular_warning', (t) => scenario('capsular_warning', t)],
  ['basilar_stuttering', (t) => scenario('basilar_stuttering', t)],
  ...(['good', 'moderate', 'poor'] as CollateralGrade[]).map(
    (c) => [`M1 5 min ${c}`, (t: number) => run([{ vessel: 'mca_m1_l', severity: 1, toH: 1 / 12 }], t, { collateral: c })] as [string, (tH: number) => SimResult],
  ),
  ['P2 6 min', (t) => run([{ vessel: 'pca_p2_r', severity: 1, toH: 0.1 }], t)],
  ['mid basilar 5 min', (t) => run([{ vessel: 'basilar_mid', severity: 1, toH: 1 / 12 }], t)],
  ['M2 attack at 2 h', (t) => run([{ vessel: 'mca_m2_sup_l', severity: 1, fromH: 2, toH: 2.2 }], t)],
  ['pontine branch, 5 min, then a lacune', (t) => run([{ vessel: 'pontine_paramedian_rostral_r', severity: 1, branch: true, fromH: 0, toH: 1 / 12 }, { vessel: 'pontine_paramedian_rostral_r', severity: 1, branch: true, fromH: 2 }], t)],
  ['labyrinthine branch, 5 min', (t) => run([{ vessel: 'labyrinthine_r', severity: 1, branch: true, toH: 5 / 60 }], t)],
  // reopened by thrombectomy at 30 min before anything died: locked-in until hours after the reopening
  ['mid basilar reopened at 30 min', (t) => run([{ vessel: 'basilar_mid', severity: 1 }], t, { reperfusionH: 0.5 })],
];
/** the stops, and times between them while an attack lasts or its deficit fades */
const TIMES = [...new Set([...STOPS.filter((h) => h <= 336), 0.05, 0.1, 1.05, 2.1, 3.05, 72.02, 0.75, 1.5, 2.5])].sort((a, b) => a - b);

describe('Z4-11: the TIA story begins once the deficit has cleared', () => {
  it.each(CASES)('%s: no "symptoms gone" or antiplatelet advice while a deficit is listed; the treatment windows instead', (name, at) => {
    let cleared = 0;
    for (const t of TIMES) {
      const r = at(t);
      const ids = activeIds(r);
      if (deficit(r)) {
        for (const id of TIA) expect(ids, `${name} @${t} h: ${id}`).not.toContain(id);
        // within a day of its start a deficit is an acute stroke, with its treatment windows (an
        // attack of the inner ear alone: the inner-ear stroke emergency), until a treatment has
        // reopened the artery (V1-11)
        const treated = r.input.reperfusionH !== null && t >= r.input.reperfusionH && !!r.treatment && !r.treatment.failed && r.treatment.reopened.length > 0;
        if (t - Math.max(...r.input.occlusions.map(startOf).filter((h) => h <= t)) < 24)
          expect(ids.filter((id) => id === 'treatment_window' || id === 'ear_stroke_workup'), `${name} @${t} h`).toHaveLength(treated ? 0 : 1);
      } else if (ids.includes('tia_urgent')) cleared++;
    }
    // and the TIA story is told once it has cleared
    expect(cleared, name).toBeGreaterThan(0);
  });

  it('the onset of the TIA template is an acute stroke: the treatment windows, no TIA story, no antiplatelet advice', () => {
    const onset = scenario('tia_l_mca', 0);
    expect(onset.nihss.total).toBeGreaterThan(10);
    expect(activeIds(onset)).toContain('treatment_window');
    for (const id of TIA) expect(activeIds(onset)).not.toContain(id);
    const w = active(onset).find((e) => e.id === 'treatment_window')!;
    expect(w.desc.en).toMatch(/cannot be known|Nobody can tell/);
    expect(w.desc.en).toMatch(/without waiting/);
    expect(w.desc.zh).toContain('不等著看');
    // 15 min later the attack is over and the TIA story is told
    const after = scenario('tia_l_mca', 0.25);
    expect(after.nihss.total).toBe(0);
    for (const id of TIA) expect(activeIds(after)).toContain(id);
    expect(activeIds(after)).not.toContain('treatment_window');
  });

  it('the locked-in attack of the progressive basilar thrombosis is an acute stroke while it lasts', () => {
    const onset = scenario('basilar_stuttering', 0);
    expect(onset.nihss.total).toBeGreaterThan(20);
    expect(activeIds(onset)).toContain('treatment_window');
    expect(active(onset).find((e) => e.id === 'treatment_window')!.desc.en).toMatch(/Basilar-artery occlusion/);
    expect(activeIds(onset)).not.toContain('tia_urgent');
  });

  it('antiplatelet drugs come after imaging has excluded a bleed, and after thrombolysis only from 24 h', () => {
    const urgent = (r: SimResult) => r.cascade.events.find((e) => e.id === 'tia_urgent')!;
    const plain = urgent(scenario('tia_l_mca', 24));
    expect(plain.desc.en).toMatch(/excluded a bleed/);
    expect(plain.desc.zh).toContain('排除出血');
    expect(plain.desc.en).not.toMatch(/thrombolysis/);
    const lysed = urgent(run([{ vessel: 'basilar_mid', severity: 1 }], 24, { reperfusionH: 0.5, treatment: { ...DEFAULT_TREATMENT, method: 'ivt' } }));
    expect(lysed.desc.en).toMatch(/after thrombolysis[^.]*24 h/);
    expect(lysed.desc.zh).toContain('24 小時');
  });

  it('an attack of the inner ear alone is the inner-ear stroke emergency while the deafness and vertigo last', () => {
    const r = run([{ vessel: 'labyrinthine_r', severity: 1, branch: true, toH: 5 / 60 }], 0);
    expect(r.symptoms.map((s) => s.id)).toContain('hearing_loss');
    expect(activeIds(r)).toContain('ear_stroke_workup');
    expect(activeIds(r)).not.toContain('treatment_window');
    expect(active(r).find((e) => e.id === 'ear_stroke_workup')!.desc.en).toMatch(/stroke emergency/);
  });

  it('ischaemia of the spinal cord, an arm or the face is not told as a TIA of the brain', () => {
    for (const vessel of ['asa', 'eca_r', 'subclavian_dist_r'])
      for (const t of [0, 24]) {
        const ids = run([{ vessel, severity: 1 }], t).cascade.events.map((e) => e.id);
        for (const id of [...TIA, 'ischemic_cascade', 'treatment_window']) expect(ids, `${vessel} @${t}: ${id}`).not.toContain(id);
      }
  });
});
