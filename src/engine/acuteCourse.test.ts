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
import { UI } from '../i18n/ui';
import { edemaColor, hex, EDEMA_COLORS } from '../ui/colors';
import type { Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';
import { lateEvents } from '../ui/finalOutcome';

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

  // Y1-0: the infarct now grows over hours rather than minutes, so at 24 h it is about 300 mL
  // instead of 334 and the shift just under 4 mm; drowsy from about 26 h (was: already at 24 h)
  it('a larger hemispheric infarct deteriorates earlier (isolated ICA: drowsy by 30 h)', () => {
    expect(scenario('ica_isolated', 24).edema.midlineShiftMm).toBeGreaterThan(3);
    const s = scenario('ica_isolated', 30);
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
    // R6-14: 'likely' in Chinese too (很可能), not 'possible' (可能)
    expect(e!.title.zh).toBe('疝脫後很可能死亡（未減壓）');
    expect(event(r, 'malignant_edema_r')!.desc.zh).toContain('見「疝脫後很可能死亡」');
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
    // R6-1: the course reaches true coma (1a = 3), and the flag's event lasts while the coma does
    expect(sev(untreated, 'coma')).toBe(3);
    expect(untreated.cascade.fatalRisk).toEqual(['posterior_fossa']);
    const e = event(untreated, 'posterior_fossa_fatal')!;
    expect(e.endH).toBeDefined();
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

describe('R6-5: an uncal herniation follows the midline shift of the oedema model, not the infarct volume alone', () => {
  it('a large superior-division infarct whose shift stays under 8 mm is not comatose and does not herniate', () => {
    for (const s of ['r', 'l'] as const) {
      const v = `mca_m2_sup_${s}`;
      const stops = [24, 48, 72, 96, 120, 168];
      const runs = stops.map((tH) => plain(occl(v), tH));
      runs.forEach((r, i) => {
        const where = `${v} ${stops[i]} h`;
        expect(r.edema.midlineShiftMm, where).toBeLessThan(8);
        expect(sev(r, 'coma'), where).toBeLessThan(3);
        expect(sev(r, 'cn3_palsy'), where).toBe(0);
        expect(activeAt(r, `uncal_${s}`, stops[i]), where).toBe(false);
        // consciousness follows the shift: drowsy from 4 mm, stuporous from 6 mm
        const want = r.edema.midlineShiftMm >= 6 ? 2 : r.edema.midlineShiftMm >= 4 ? 1 : 0;
        expect(item1a(r), where).toBe(want);
      });
      const r72 = runs[2];
      expect(event(r72, `uncal_${s}`)).toBeUndefined();
      expect(event(r72, `subfalcine_${s}`)).toBeUndefined();
      expect(event(r72, `herniation_fatal_${s}`)).toBeUndefined();
      expect(r72.cascade.fatalRisk).toEqual([]);
      // the risk from the early volume is still named, with the shift the model reaches, when the
      // infarct reaches 145 mL within 14 h (Oppenheim 2000; Y1-0: about 141 mL on the right, 149
      // mL on the left now that the infarct grows over hours)
      const mal = event(r72, `malignant_edema_${s}`);
      if (plain(occl(v), 14).volumes.core < 145) {
        expect(mal, v).toBeUndefined();
        continue;
      }
      expect(mal!.desc.en).toMatch(/peaks at about \d+(\.\d)? mm/);
      expect(mal!.desc.en).not.toMatch(/Death likely after herniation/);
      expect(mal!.desc.zh).toMatch(/約 \d+(\.\d)? mm/);
    }
  });

  it('across M1, M2 and ICA occlusions, collaterals and blood pressures: an uncal herniation only with a shift in the coma range, and no lighter consciousness while the shift still rises', () => {
    const stops = [24, 48, 72, 96, 120, 168, 240, 336];
    for (const v of ['mca_m1_r', 'mca_m1_l', 'mca_m2_sup_r', 'ica_terminal_r', 'ica_terminal_l'])
      for (const collateral of ['good', 'moderate', 'poor'] as const)
        for (const map of [70, 93, 120]) {
          const runs = stops.map((tH) => plain(occl(v), tH, { collateral, map }));
          runs.forEach((r, i) => {
            const where = `${v} ${collateral} MAP ${map} ${stops[i]} h`;
            for (const s of ['r', 'l'])
              if (activeAt(r, `uncal_${s}`, stops[i])) expect(r.edema.midlineShiftMm, where).toBeGreaterThanOrEqual(8 - 0.05);
            if (i > 0 && r.edema.midlineShiftMm > runs[i - 1].edema.midlineShiftMm + 0.05)
              expect(item1a(r), where).toBeGreaterThanOrEqual(item1a(runs[i - 1]));
          });
        }
  });
});

describe('R6-2, R6-7: the uncal herniation ends when the midline shift leaves the coma range', () => {
  it('has an end time where the shift falls under 8 mm, is not active or listed as a late consequence months later, and is ongoing while the coma lasts', () => {
    for (const id of ['r_m1_malignant', 'r_ica_t']) {
      const e = event(scenario(id, 72), 'uncal_r')!;
      expect(e.endH, id).toBeDefined();
      expect(e.endH!, id).toBeGreaterThan(168);
      expect(e.endH!, id).toBeLessThan(336);
      expect(scenario(id, e.endH! - 1).edema.midlineShiftMm, id).toBeGreaterThanOrEqual(8);
      expect(scenario(id, e.endH! + 1).edema.midlineShiftMm, id).toBeLessThan(8);
      for (const tH of [720, 2160, 4320]) expect(activeAt(scenario(id, tH), 'uncal_r', tH), `${id} ${tH} h`).toBe(false);
      expect(lateEvents(scenario(id, 4320)).map((x) => x.id), id).not.toContain('uncal_r');
      // the death after herniation stays a lasting flag
      expect(lateEvents(scenario(id, 4320)).map((x) => x.id), id).toContain('herniation_fatal_r');
      // NowSummary lists an event as ongoing while it has an end still ahead: at 5 days the coma lasts
      const r120 = scenario(id, 120);
      expect(sev(r120, 'coma'), id).toBe(3);
      expect(activeAt(r120, 'uncal_r', 120), id).toBe(true);
    }
  });
});

describe('R6-1: a malignant cerebellar swelling without surgery reaches true coma before it is flagged life-threatening, and consciousness follows the swelling', () => {
  const at = (tH: number) => plain(PICA_SCA, tH);
  it('stuporous on day 3, comatose (NIHSS 1a = 3) near the swelling peak, and flagged life-threatening only from then', () => {
    expect(item1a(at(48))).toBe(2);
    for (const tH of [72, 96, 120]) {
      expect(sev(at(tH), 'coma'), `${tH} h`).toBe(3);
      expect(item1a(at(tH)), `${tH} h`).toBe(3);
    }
    const e = event(at(72), 'posterior_fossa_fatal')!;
    expect(e.title.en).toMatch(/coma/);
    // the flag is set when the coma begins, and the coma lifts with the swelling
    expect(e.onsetH).toBeGreaterThan(48);
    expect(item1a(at(e.onsetH - 0.5))).toBe(2);
    expect(item1a(at(e.onsetH + 0.5))).toBe(3);
    expect(e.endH).toBeDefined();
    expect(item1a(at(e.endH! - 0.5))).toBe(3);
    expect(item1a(at(e.endH! + 0.5))).toBe(2);
    expect(activeAt(at(4320), 'posterior_fossa_fatal', 4320)).toBe(false);
    expect(at(4320).cascade.fatalRisk).toEqual(['posterior_fossa']);
  });

  it('no fixed step at two weeks: consciousness lightens one level at a time as the swelling subsides', () => {
    const stops = [120, 168, 200, 240, 260, 280, 300, 320, 335, 336, 360, 400, 500];
    const levels = stops.map((tH) => item1a(at(tH)));
    for (let i = 1; i < levels.length; i++) expect(levels[i - 1] - levels[i], `${stops[i - 1]}→${stops[i]} h: ${levels.join(',')}`).toBeLessThanOrEqual(1);
    expect(levels).toContain(1);
    expect(item1a(at(335))).toBe(item1a(at(336)));
    expect(item1a(at(720))).toBe(0);
    // the compression signs and the hydrocephalus go with the compression, not at a fixed day 14
    const bc = event(at(72), 'brainstem_compression')!;
    expect(bc.endH).not.toBe(336);
    expect(event(at(72), 'hydrocephalus')!.endH).not.toBe(336);
  });
});

describe('R6-3: a complete SCA-territory infarct gets the warning to watch for swelling', () => {
  it('the SCA template (about 24 mL of cerebellum) is a warning to monitor, without a malignant course', () => {
    const r = scenario('r_sca', 72);
    const cb = r.cascade.volumes.cerebellum.r + r.cascade.volumes.cerebellum.l;
    expect(cb).toBeLessThan(25);
    const e = event(r, 'cerebellar_edema')!;
    expect(e).toBeDefined();
    expect(e.severity).toBe('warn');
    expect(e.desc.en).toMatch(/PICA and SCA infarcts can both swell/);
    expect(event(r, 'brainstem_compression')).toBeUndefined();
    expect(event(r, 'hydrocephalus')).toBeUndefined();
    expect(sev(r, 'coma')).toBe(0);
  });
});

describe('R6-4: the crossed cerebellar diaschisis text names what triggered it', () => {
  it('a PCA infarct reaching the ventrolateral thalamus: the thalamic pathway and the thalamic figures, not the carotid PET study', () => {
    for (const [id, tH] of [['l_pca', 24], ['basilar_tip', 24]] as const) {
      const e = event(scenario(id, tH), 'ccd_l')!;
      expect(e, id).toBeDefined();
      expect(e.desc.en, id).toMatch(/thalam/i);
      expect(e.desc.en, id).toMatch(/9 of 39/);
      expect(e.desc.en, id).not.toMatch(/carotid|58%|any lobe/);
      expect(e.desc.zh, id).toMatch(/視丘/);
      expect(e.desc.zh, id).not.toMatch(/頸動脈|58%|任何腦葉/);
    }
  });

  it('a carotid-territory infarct: the capsule or carotid-territory cortex and the PET figure, not "any lobe"', () => {
    for (const [id, tH] of [['l_m2_inf', 48], ['l_m1', 24]] as const) {
      const e = event(scenario(id, tH), 'ccd_l')!;
      expect(e.desc.en, id).toMatch(/carotid-territory cortex/);
      expect(e.desc.en, id).toMatch(/58%/);
      expect(e.desc.en, id).not.toMatch(/any lobe/);
      expect(e.desc.zh, id).toMatch(/頸動脈供應區的皮質/);
      expect(e.desc.zh, id).not.toMatch(/任何腦葉/);
    }
  });
});

describe('R6-10: the midline-shift tooltip gives the bands the model uses', () => {
  it('drowsy from about 4 mm, stupor from 6 mm, coma from 8 mm (Ropper 1986), in both languages', () => {
    const en = UI.en.midlineShiftNote;
    const zh = UI['zh-TW'].midlineShiftNote;
    for (const mm of ['4 mm', '6 mm', '8 mm']) {
      expect(en).toContain(mm);
      expect(zh).toContain(mm);
    }
    expect(en).not.toMatch(/~5 mm/);
    expect(zh).not.toMatch(/約 5 mm/);
    expect(en).toMatch(/Ropper/);
    expect(zh).toMatch(/Ropper/);
  });
});

describe("R6-15: the PICA + SCA template gives the model's volume as the model's, in both languages", () => {
  it('says "here" for the 58 mL in Chinese too', () => {
    const sc = SCENARIOS.find((s) => s.id === 'cerebellar_swelling')!;
    expect(sc.summary.en).toContain('about 58 mL here');
    expect(sc.summary.zh).toContain('（解剖病理系列中常見；這裡約 58 mL）');
    const r = scenario('cerebellar_swelling', 72);
    expect(Math.round(r.cascade.volumes.cerebellum.r + r.cascade.volumes.cerebellum.l)).toBe(58);
  });
});


describe("R6-6: a stroke's coma and late signs follow the age of its own lesion, not the first stroke's clock", () => {
  const stack = (a: string, ta: number, b: string, tb: number, tH: number) =>
    simulate({
      occlusions: [
        { vessel: a, severity: 1, fromH: ta },
        { vessel: b, severity: 1, fromH: tb },
      ],
      variants: [],
      collateral: 'poor',
      map: 93,
      tH,
      reperfusionH: null,
      decompression: false,
    });
  const basilarAlone = (tH: number) => plain(occl('basilar_upper'), tH);

  it('a basilar occlusion a month after an M1 stroke: comatose first, a disorder of consciousness only two weeks later', () => {
    for (const tH of [721, 744, 900]) {
      const r = stack('mca_m1_l', 0, 'basilar_upper', 720, tH);
      expect(r.schedule.onsetH, `${tH} h`).toBe(0);
      expect(sev(r, 'coma'), `${tH} h`).toBe(sev(basilarAlone(tH - 720), 'coma'));
      expect(sev(r, 'coma'), `${tH} h`).toBeGreaterThanOrEqual(2);
      expect(sev(r, 'disorder_of_consciousness'), `${tH} h`).toBe(0);
      // the spasticity of the new pontine lesion (left body) has not begun; the M1's (right) has
      expect(r.symptoms.some((s) => s.id === 'spasticity' && s.side === 'l'), `${tH} h`).toBe(false);
      expect(r.symptoms.some((s) => s.id === 'spasticity' && s.side === 'r'), `${tH} h`).toBe(true);
    }
    const later = stack('mca_m1_l', 0, 'basilar_upper', 720, 720 + 340);
    expect(sev(later, 'coma')).toBe(0);
    expect(sev(later, 'disorder_of_consciousness')).toBeGreaterThan(0);
  });

  it('an M1 stroke a month after a basilar occlusion: the earlier coma is relabelled on its own clock, as without the M1', () => {
    for (const tH of [340, 720]) {
      const r = stack('basilar_upper', 0, 'mca_m1_l', 720, tH);
      expect(r.schedule.onsetH).toBe(720);
      expect(sev(r, 'coma'), `${tH} h`).toBe(0);
      expect(sev(basilarAlone(tH), 'coma'), `${tH} h`).toBe(0);
      // (its severity can differ: the earlier lesion's perilesional swelling still runs on the index
      // clock, a documented approximation of stacked strokes)
      expect(sev(r, 'disorder_of_consciousness'), `${tH} h`).toBeGreaterThan(0);
      expect(sev(basilarAlone(tH), 'disorder_of_consciousness'), `${tH} h`).toBeGreaterThan(0);
    }
  });
});
