/**
 * The acute course after a large infarct (cluster C4): what happens to consciousness as the
 * swollen hemisphere shifts the midline, the likely death after herniation without
 * decompression, space-occupying cerebellar oedema, post-stroke seizures, what MRI shows weeks
 * later and crossed cerebellar diaschisis. Sources are cited next to the code in cascade.ts,
 * edema.ts and simulate.ts.
 */
import { describe, expect, it } from 'vitest';
import { BEDS } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { REDUNDANCY } from '../anatomy/redundancy';
import { EDEMA_UI } from '../i18n/uiEdema';
import { edemaColor, hex, EDEMA_COLORS } from '../ui/colors';
import type { Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const inputOf = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc) throw new Error(`no scenario ${id}`);
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
const scenario = (id: string, tH: number, over: Partial<SimInput> = {}) => simulate(inputOf(id, { ...over, tH }));
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const plain = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'poor', map: 93, tH, reperfusionH: null, decompression: false, ...over });
const sev = (r: SimResult, id: string) => r.symptoms.filter((s) => s.id === id).reduce((m, s) => Math.max(m, s.sev), 0);
const item1a = (r: SimResult) => r.nihss.items['1a'] ?? 0;
const event = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
const activeAt = (r: SimResult, id: string, tH: number) => {
  const e = event(r, id);
  return !!e && e.onsetH <= tH && tH < (e.endH ?? Infinity);
};
const PICA_SCA = occl('pica_r', 'sca_r');

describe('C4-F2: consciousness follows the midline shift (Ropper 1986)', () => {
  it('malignant right M1: alert at 3–4 mm, stuporous at 6–8 mm, comatose from 8 mm, before the uncal herniation', () => {
    const at = (tH: number) => scenario('r_m1_malignant', tH);
    // 24 h: 3.4 mm — under the drowsy band the model uses (≥ 4 mm)
    expect(at(24).edema.midlineShiftMm).toBeLessThan(4);
    expect(item1a(at(24))).toBe(0);
    // 36 h: 6.7 mm — stupor (1a = 2)
    const s36 = at(36);
    expect(s36.edema.midlineShiftMm).toBeGreaterThanOrEqual(6);
    expect(s36.edema.midlineShiftMm).toBeLessThan(8);
    expect(item1a(s36)).toBe(2);
    // 48 h: 9.9 mm — coma (1a = 3), a day before the uncal herniation (72 h)
    const s48 = at(48);
    expect(s48.edema.midlineShiftMm).toBeGreaterThanOrEqual(8);
    expect(sev(s48, 'coma')).toBe(3);
    expect(activeAt(s48, 'uncal_r', 48)).toBe(false);
  });

  it('a larger hemispheric infarct deteriorates earlier (isolated ICA: drowsy already at 24 h)', () => {
    const s = scenario('ica_isolated', 24);
    expect(s.edema.midlineShiftMm).toBeGreaterThanOrEqual(4);
    expect(item1a(s)).toBe(1);
  });

  it('a moderate mass effect under 4 mm leaves the patient alert (left M1, 3.1–3.8 mm)', () => {
    for (const tH of [24, 48, 72, 96, 168]) {
      const s = scenario('l_m1', tH);
      expect(s.edema.midlineShiftMm, `${tH} h`).toBeLessThan(4);
      expect(item1a(s), `${tH} h`).toBe(0);
    }
  });

  it('the malignant-oedema event no longer adds a fixed drowsiness: after decompression the patient stays alert', () => {
    const r = scenario('r_m1_malignant', 72);
    expect(event(r, 'malignant_edema_r')?.symptoms ?? []).toEqual([]);
    for (const tH of [24, 48, 72, 168, 335]) {
      const s = scenario('r_m1_decompression', tH);
      expect(s.edema.midlineShiftMm, `${tH} h`).toBeLessThan(4);
      expect(item1a(s), `${tH} h`).toBe(0);
    }
  });

  it('the cascade keeps no second midline-shift model of its own', () => {
    const r = scenario('r_m1_malignant', 72);
    expect('midlineShift' in r.cascade).toBe(false);
  });
});

describe('C4-F1: herniation without decompression is usually fatal', () => {
  it('flags the likely death after uncal herniation, open-ended, citing Hacke and the pooled trials', () => {
    const r = scenario('r_m1_malignant', 72);
    expect(r.cascade.fatalRisk).toEqual(['herniation']);
    const e = event(r, 'herniation_fatal_r');
    expect(e).toBeDefined();
    expect(e!.endH).toBeUndefined();
    expect(e!.onsetH).toBeLessThanOrEqual(96);
    expect(e!.desc.en).toMatch(/78%/);
    expect(e!.desc.en).toMatch(/29%/);
    expect(e!.desc.zh).toMatch(/78%/);
    // the decompressed course does not carry it
    const d = scenario('r_m1_decompression', 72);
    expect(d.cascade.fatalRisk).toEqual([]);
    expect(event(d, 'herniation_fatal_r')).toBeUndefined();
  });

  it('the herniation coma does not stop at a fixed two weeks: it lifts gradually as the shift resolves', () => {
    const s335 = scenario('r_m1_malignant', 335);
    const s336 = scenario('r_m1_malignant', 336);
    expect(item1a(s336)).toBe(item1a(s335));
    // comatose while the midline is still in the coma range …
    expect(sev(scenario('r_m1_malignant', 168), 'coma')).toBe(3);
    // … then the survivor's consciousness follows the shift down (no step from coma to alert)
    const levels = [168, 200, 240, 280, 320, 360, 400, 500].map((tH) => item1a(scenario('r_m1_malignant', tH)));
    for (let i = 1; i < levels.length; i++) expect(levels[i - 1] - levels[i]).toBeLessThanOrEqual(1);
    expect(item1a(scenario('r_m1_malignant', 720))).toBe(0);
  });

  it('labels the recovery of an untreated herniation as the course if the patient survives', () => {
    const r = scenario('r_m1_malignant', 720);
    expect(event(r, 'recovery')!.desc.en).toMatch(/if the patient survives/i);
    expect(event(scenario('l_m1', 720), 'recovery')!.desc.en).not.toMatch(/survives/i);
  });

  it('cerebellar: only an untreated course that reaches coma is flagged life-threatening, with no invented mortality figure', () => {
    const untreated = plain(PICA_SCA, 72);
    expect(sev(untreated, 'coma')).toBeGreaterThanOrEqual(2);
    expect(untreated.cascade.fatalRisk).toEqual(['posterior_fossa']);
    const e = event(untreated, 'posterior_fossa_fatal')!;
    expect(e.endH).toBeUndefined();
    expect(e.desc.en).toMatch(/suboccipital/i);
    expect(e.desc.en).not.toMatch(/\d+ ?% (of )?(untreated|die)/i);
    const operated = plain(PICA_SCA, 72, { decompression: true });
    expect(operated.cascade.fatalRisk).toEqual([]);
    expect(sev(operated, 'coma')).toBe(0);
    // after suboccipital decompression the pooled mortality is still about 20% (Ayling 2018)
    expect(event(operated, 'cerebellar_edema')!.desc.en).toMatch(/20%/);
    // a non-comatose course is not flagged, treated or not (Jauss 1999)
    expect(plain(occl('pica_r'), 72).cascade.fatalRisk).toEqual([]);
  });
});

describe('C4-F3: space-occupying cerebellar oedema', () => {
  it('a full PICA infarct (~34 mL) is a warning to monitor, not a deterministic malignant course', () => {
    const r = plain(occl('pica_r'), 72);
    const cb = r.cascade.volumes.cerebellum.r + r.cascade.volumes.cerebellum.l;
    expect(cb).toBeGreaterThanOrEqual(25);
    expect(cb).toBeLessThan(38);
    const e = event(r, 'cerebellar_edema')!;
    expect(e.severity).toBe('warn');
    expect(e.desc.en).toMatch(/day 3/);
    expect(r.hydrocephalus).toBe(false);
    expect(event(r, 'hydrocephalus')).toBeUndefined();
    expect(event(r, 'brainstem_compression')).toBeUndefined();
    expect(sev(r, 'coma')).toBe(0);
  });

  it('≥ 38 mL (PICA + SCA): malignant swelling likely, peaking on day 3, with hydrocephalus and brainstem compression from day 2', () => {
    const r = plain(PICA_SCA, 72);
    const cb = r.cascade.volumes.cerebellum.r + r.cascade.volumes.cerebellum.l;
    expect(cb).toBeGreaterThanOrEqual(38);
    const e = event(r, 'cerebellar_edema')!;
    expect(e.severity).toBe('danger');
    expect(e.peakH).toBe(72);
    expect(event(r, 'hydrocephalus')!.onsetH).toBe(48);
    const bc = event(r, 'brainstem_compression')!;
    expect(bc.onsetH).toBe(48);
    // brainstem compression lowers consciousness by itself and adds miosis and corneal-reflex loss
    const ids = (bc.symptoms ?? []).map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['coma', 'miosis', 'corneal_reflex_loss']));
    expect(sev(r, 'miosis')).toBeGreaterThan(0);
    expect(sev(r, 'corneal_reflex_loss')).toBeGreaterThan(0);
    expect(sev(plain(PICA_SCA, 36), 'coma')).toBe(0);
    expect(sev(plain(PICA_SCA, 36), 'miosis')).toBe(0);
  });

  it('ventricular drainage is not offered as an alternative to decompression: it risks upward herniation', () => {
    const e = event(plain(PICA_SCA, 72), 'cerebellar_edema')!;
    expect(e.desc.en).toMatch(/upward/i);
    expect(e.desc.en).not.toMatch(/decompression or ventricular drainage/);
    expect(e.desc.zh).toMatch(/向上/);
    expect(e.desc.en).toMatch(/40%|after day 3/);
  });

  it('the cerebellar syndrome text no longer limits swelling to days 1–3', () => {
    const text = SYNDROMES.find((s) => s.id === 'pica_cerebellar')!;
    expect(text.desc.en).not.toMatch(/after 1–3 days/);
    expect(text.desc.en).toMatch(/day 3/);
    expect(text.desc.zh).not.toMatch(/1–3 天後/);
  });

  it('miosis and corneal-reflex loss are defined, not scored by the NIHSS, and have a recovery entry', () => {
    for (const id of ['miosis', 'corneal_reflex_loss']) {
      const def = SYMPTOM_BY_ID[id];
      expect(def, id).toBeDefined();
      expect(def.nihss, id).toBeUndefined();
      expect(REDUNDANCY[id], id).toBeDefined();
    }
  });

  it('suboccipital decompression removes the compression signs and the hydrocephalus', () => {
    const r = plain(PICA_SCA, 72, { decompression: true });
    expect(r.hydrocephalus).toBe(false);
    expect(sev(r, 'miosis')).toBe(0);
  });
});

describe('C4-F4: early and late seizures are told apart', () => {
  it('a cortical infarct gets an early (acute symptomatic) event from onset and a late one from day 7 that does not end at 6 months', () => {
    const r = scenario('l_m2_inf', 48);
    expect(event(r, 'seizure')).toBeUndefined();
    const early = event(r, 'seizure_early')!;
    expect(early.onsetH).toBe(0);
    expect(early.endH).toBe(168);
    expect(early.desc.en).toMatch(/acute symptomatic/i);
    expect(early.desc.en).toMatch(/5\.9%/);
    expect(early.desc.en).toMatch(/0\.6%/);
    expect(early.desc.en).toMatch(/status epilepticus/);
    expect(early.desc.en).toMatch(/not from a scar/);
    const late = event(r, 'seizure_late')!;
    expect(late.onsetH).toBe(168);
    expect(late.endH).toBeUndefined();
    expect(late.desc.en).toMatch(/4% at 1 year/);
    expect(late.desc.en).toMatch(/8% at 5 years/);
    expect(late.desc.en).toMatch(/scar/i);
  });

  it('names the SeLECT predictors the case has: MCA territory and cortex for an M1, cortex but not the MCA for a PCA infarct', () => {
    expect(event(scenario('l_m1', 720), 'seizure_late')!.desc.en).toMatch(/This case shows cortical involvement and the territory of the middle cerebral artery;/);
    const pca = event(scenario('l_pca', 720), 'seizure_late')!.desc.en;
    expect(pca).toMatch(/This case shows cortical involvement;/);
  });

  it('a deep (lacunar) infarct gets no seizure event', () => {
    const r = scenario('l_lacune', 48);
    expect(event(r, 'seizure_early')).toBeUndefined();
    expect(event(r, 'seizure_late')).toBeUndefined();
  });
});

describe('C4-F5: the infarct stays visible on MRI after the oedema resolves', () => {
  const lm1 = (tH: number) => scenario('l_m1', tH);
  const fullBeds = (r: SimResult) => BEDS.filter((b) => r.beds[b.id].infarct > 0.95).map((b) => b.id);
  const maxOf = (m: Record<string, number>, ids: string[]) => ids.reduce((a, id) => Math.max(a, m[id] ?? 0), 0);

  it('T2/FLAIR stays bright in the infarct for months (gliosis), while the oedema itself resolves', () => {
    for (const tH of [336, 504, 720, 2160, 4320]) {
      const r = lm1(tH);
      const ids = fullBeds(r);
      expect(ids.length).toBeGreaterThan(0);
      expect(maxOf(r.edema.flair, ids), `${tH} h`).toBeGreaterThan(0.4);
    }
    // the oedema channel (which drives perilesional dysfunction) still resolves
    expect(maxOf(lm1(720).edema.vasogenic, fullBeds(lm1(720)))).toBeLessThan(0.1);
  });

  it('DWI (trace) fades gradually over weeks rather than vanishing at ~10 days; restricted diffusion (low ADC) still pseudonormalises', () => {
    const at = (tH: number) => {
      const r = lm1(tH);
      return { dwi: maxOf(r.edema.dwi, fullBeds(r)), adcLow: maxOf(r.edema.cytotoxic, fullBeds(r)) };
    };
    expect(at(72).dwi).toBeGreaterThan(0.9);
    expect(at(336).dwi).toBeGreaterThan(0.3);
    expect(at(336).adcLow).toBeLessThan(0.2);
    expect(at(720).dwi).toBeGreaterThan(0.15);
    expect(at(720).dwi).toBeLessThan(at(336).dwi);
    expect(at(2160).dwi).toBeLessThan(0.1);
  });

  it('in the imaging colour mode a 3-week-old infarct is not normal grey', () => {
    const r = lm1(504);
    const id = fullBeds(r)[0];
    const bed = BEDS.find((b) => b.id === id)!;
    const c = edemaColor(bed, r.edema.dwi[id], r.edema.flair[id], r.edema.swelling[id]);
    const normal = hex(EDEMA_COLORS.normal);
    const dist = Math.hypot(c[0] - normal[0], c[1] - normal[1], c[2] - normal[2]);
    expect(dist).toBeGreaterThan(0.25);
  });

  it('the legend says which sequence the chronic colour stands for', () => {
    expect(EDEMA_UI.en.legend.chronic).toMatch(/FLAIR/);
    expect(EDEMA_UI['zh-TW'].legend.chronic).toMatch(/FLAIR/);
  });
});

describe('C4-F6: crossed cerebellar diaschisis', () => {
  it('follows an extensive carotid-territory cortical infarct in any lobe, from the first hours', () => {
    const r = scenario('l_m2_inf', 48);
    const e = event(r, 'ccd_l');
    expect(e).toBeDefined();
    expect(e!.onsetH).toBeLessThanOrEqual(6);
    expect(e!.desc.en).toMatch(/sometimes/i);
    expect(r.regions.cerebellum_posterior_inferior_r.effect).toBe('diaschisis');
    // silent: the remote depression stays under the symptom threshold
    expect(r.regions.cerebellum_posterior_inferior_r.dys).toBeLessThan(0.25);
  });

  it('starts within hours for the fronto-motor trigger too', () => {
    expect(event(scenario('l_m1', 24), 'ccd_l')!.onsetH).toBeLessThanOrEqual(6);
  });
});
