/**
 * Medulla, cerebellum and inner ear (vertebral, PICA, AICA and labyrinthine territories): the
 * breathing risk of a one-sided lateral medullary infarct, the isolated-vertigo PICA stroke, the
 * Wallenberg picture without a contralateral hemiparesis, gait ataxia and lateropulsion, bilateral
 * medial medullary infarction, the labyrinthine infarct and its warning, hearing recovery, the
 * medial medullary vertigo and pain, and the cerebellar cognitive affective syndrome. Sources are
 * next to the data (src/anatomy/regions.ts, symptoms.ts, syndromes.ts, scenarios.ts,
 * redundancy.ts, vessels.ts; src/engine/cascade.ts) and in REFERENCES.md.
 */
import { describe, expect, it } from 'vitest';
import { REGION_BY_ID } from '../anatomy';
import { REDUNDANCY } from '../anatomy/redundancy';
import { SCENARIO_BY_ID, SCENARIOS } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { TIME_STOPS } from '../anatomy/timeline';
import { VARIANTS } from '../anatomy/variants';
import { aggregateSymptoms, type SymptomItem } from './clinical';
import type { CollateralGrade, Occlusion } from './hemodynamics';
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
const scenario = (id: string, tH: number) => simulate(inputOf(id, { tH }));
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'good' as CollateralGrade, map: 93, tH, reperfusionH: null, decompression: false, ...over });
const has = (r: SimResult, id: string) => r.symptoms.some((s) => s.id === id);
const get = (r: SimResult, id: string, side?: SymptomItem['side']) =>
  r.symptoms.find((s) => s.id === id && (side === undefined || s.side === side));
const labels = (r: SimResult) => r.syndromes.map((m) => m.def.id + (m.side ? `_${m.side}` : ''));
const events = (r: SimResult) => r.cascade.events.map((e) => e.id);
const event = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
const desc = (id: string) => SYNDROMES.find((s) => s.id === id)!.desc;
const STOPS = TIME_STOPS.map((s) => s.h).filter((h) => h > 0);

describe('C7-F1: one lateral medulla is enough to put breathing at risk', () => {
  it('a one-sided lateral medullary infarct carries a 10-day breathing warning, not the bilateral danger event', () => {
    for (const id of ['r_wallenberg', 'r_pica']) {
      const r = scenario(id, 24);
      const e = event(r, 'lateral_medullary_breathing');
      expect(e, id).toBeDefined();
      expect(e!.severity).toBe('warn');
      expect(e!.kind).toBe('complication');
      expect(e!.onsetH).toBe(0);
      // the 10-day window in which the fatal respiratory failures occurred (Saito 2022)
      expect(e!.endH).toBe(240);
      expect(e!.regions).toEqual(['medulla_lateral_r']);
      expect(events(r)).not.toContain('respiratory_failure');
      // the risk markers, and the ipsilateral hemiparesis the model does not reproduce (C7-F11)
      expect(e!.desc.en).toMatch(/severe dysphagia/);
      expect(e!.desc.en).toMatch(/same side as the infarct/);
      expect(e!.desc.zh).toMatch(/同側/);
    }
  });

  it('a single lateral medullary perforator (the lacune option) carries it too', () => {
    const r = sim([{ vessel: 'lat_medullary_perf_r', severity: 1, branch: true }], 24);
    expect(labels(r)).toContain('wallenberg_r');
    expect(event(r, 'lateral_medullary_breathing')?.regions).toEqual(['medulla_lateral_r']);
  });

  it('both sides keep the danger event alone; a vertebral TIA that leaves no infarct carries no breathing warning', () => {
    const both = sim(occl('va_v4_dist_r', 'va_v4_dist_l'), 24, { collateral: 'moderate' });
    expect(events(both)).toContain('respiratory_failure');
    expect(events(both)).not.toContain('lateral_medullary_breathing');
    const tia = sim(occl('va_v4_dist_r'), 24, { reperfusionH: 5 / 60 });
    expect(tia.volumes.finalInfarct).toBeLessThan(0.05);
    expect(events(tia)).not.toContain('lateral_medullary_breathing');
  });

  it('the lateral medulla gives reduced cardiac vagal function (autonomic_cardiac), from the medulla itself', () => {
    const r = scenario('r_wallenberg', 24);
    const s = get(r, 'autonomic_cardiac', null);
    expect(s).toBeDefined();
    expect(s!.sev).toBe(1);
    expect(s!.sources).toEqual(['medulla_lateral_r']);
    expect(REGION_BY_ID.medulla_lateral_r.deficits.find((d) => d.s === 'autonomic_cardiac')).toMatchObject({ lat: 'none', sev: 1 });
    expect(SYMPTOM_BY_ID.autonomic_cardiac.desc.en).toMatch(/lateral medullary/);
  });

  it('central sleep apnoea rises to a peak around day 7 and fades over months', () => {
    const sev = (tH: number) => get(scenario('r_wallenberg', tH), 'central_sleep_apnoea', null)?.sev ?? 0;
    expect(sev(24)).toBe(1);
    // worst at a median of day 7, range 3–14 (Pavšič 2020)
    expect(sev(72)).toBe(2);
    expect(sev(168)).toBe(2);
    expect(sev(720)).toBe(1);
    expect(sev(4320)).toBe(0);
    // one side can be enough to lose automatic breathing (Bogousslavsky 1990): the text no longer
    // says the severe form needs both sides
    const d = SYMPTOM_BY_ID.central_sleep_apnoea.desc;
    expect(d.en).not.toMatch(/only when both sides are damaged/);
    expect(d.en).toMatch(/even when only one side/i);
    expect(d.zh).toMatch(/即使只有一側/);
  });

  it('the NIHSS does not score any of it', () => {
    for (const id of ['autonomic_cardiac', 'central_sleep_apnoea']) expect(SYMPTOM_BY_ID[id].nihss, id).toBeUndefined();
  });
});

describe('C7-F2: the medial (vermian) PICA branch gives the isolated-vertigo cerebellar stroke', () => {
  it('with the default (good) collaterals: an inferior vermis infarct with vertigo and gait ataxia, NIHSS 0, no swelling', () => {
    const acute = sim(occl('pica_medial_r'), 24);
    expect(acute.regions.vermis_inferior_r.dys).toBeGreaterThanOrEqual(0.5);
    expect(has(acute, 'vertigo')).toBe(true);
    expect(has(acute, 'ataxia_gait')).toBe(true);
    expect(acute.nihss.total).toBe(0);
    expect(acute.nihss.uncaptured).toBe(true);
    expect(labels(acute)).toContain('pica_cerebellar_r');
    const later = sim(occl('pica_medial_r'), 72);
    expect(later.regions.vermis_inferior_r.infarct).toBeGreaterThanOrEqual(0.5);
    // small and benign (Amarenco 1990): no space-occupying oedema, no hydrocephalus
    expect(later.volumes.finalInfarct).toBeLessThan(10);
    for (const id of ['cerebellar_edema', 'hydrocephalus']) expect(events(later)).not.toContain(id);
  });

  it('the lateral branch and the PICA trunk keep their territorial infarcts', () => {
    // (about 0.92 now: a calibration change that takes the lateral branch below 0.9 must be
    // deliberate, as the margin is small; X2-17)
    expect(sim(occl('pica_lateral_r'), 72).regions.cerebellum_posterior_inferior_r.infarct).toBeGreaterThan(0.9);
    const r = scenario('r_pica', 72);
    expect(r.regions.vermis_inferior_r.infarct).toBeGreaterThan(0.9);
    expect(events(r)).toContain('cerebellar_edema');
  });

  it('the PICA syndrome text teaches the pseudo-vestibular presentation: NIHSS 0, HINTS, an early DWI that can miss it', () => {
    const d = desc('pica_cerebellar');
    expect(d.en).toMatch(/HINTS/);
    expect(d.en).toMatch(/12 %/);
    expect(d.zh).toMatch(/HINTS/);
    expect(d.zh).toMatch(/12%|12 %/);
  });
});

describe('C7-F3: the Wallenberg scenario has no contralateral hemiparesis', () => {
  it('no weakness, position-sense loss or tongue palsy from the medial medulla at any time; the NIHSS does not jump on day 3', () => {
    const at24 = scenario('r_wallenberg', 24).nihss.total;
    for (const tH of STOPS) {
      const r = scenario('r_wallenberg', tH);
      for (const id of ['arm_weak', 'leg_weak', 'proprio_loss']) expect(get(r, id, 'l'), `${id} at ${tH} h`).toBeUndefined();
      expect(get(r, 'tongue_weak'), `tongue at ${tH} h`).toBeUndefined();
      expect(r.regions.medulla_medial_r.dys, `${tH} h`).toBeLessThan(0.25);
      expect(r.nihss.total, `${tH} h`).toBeLessThanOrEqual(at24);
      expect(labels(r)).toContain('wallenberg_r');
    }
  });

  it('the text says a contralateral hemiparesis means medial extension, and that LMI weakness is ipsilateral', () => {
    const d = desc('wallenberg');
    expect(d.en).toMatch(/Babinski–Nageotte/);
    expect(d.en).toMatch(/same side/);
    expect(d.zh).toMatch(/Babinski–Nageotte/);
  });
});

describe('C7-F4: gait ataxia and lateropulsion, facial weakness and dysarthria', () => {
  it('Wallenberg: gait ataxia, a mild facial weakness on the lesion side and dysarthria; the NIHSS still low', () => {
    const r = scenario('r_wallenberg', 24);
    expect(has(r, 'ataxia_gait')).toBe(true);
    expect(get(r, 'face_weak', 'r')?.sev).toBe(1);
    expect(get(r, 'face_weak', 'l')).toBeUndefined();
    expect(get(r, 'dysarthria', null)?.sev).toBe(1);
    // (Y2-8: the ataxia of the right arm and leg is two limbs on item 7: 5, not 4)
    expect(r.nihss.total).toBeLessThanOrEqual(5);
    expect(r.nihss.posteriorCaveat).toBe(true);
    // the summary states what the model shows
    expect(SCENARIO_BY_ID.r_wallenberg.summary.en).toContain(`NIHSS may be only ${r.nihss.total}`);
    expect(SCENARIO_BY_ID.r_wallenberg.summary.zh).toContain(`NIHSS 可能只有 ${r.nihss.total} 分`);
  });

  it('AICA: stance and gait impaired', () => {
    for (const r of [scenario('l_aica', 24), sim(occl('aica_r'), 24, { collateral: 'moderate' })]) expect(has(r, 'ataxia_gait')).toBe(true);
    expect(has(scenario('l_aica', 720), 'ataxia_gait')).toBe(true);
  });

  it('the texts name the ipsiversive lateropulsion and the gait ataxia of AICA strokes', () => {
    expect(desc('wallenberg').en).toMatch(/lateropulsion/);
    expect(desc('wallenberg').zh).toMatch(/側傾/);
    expect(desc('aica').en).toMatch(/gait/);
    expect(SYMPTOM_BY_ID.ataxia_gait.desc.en).toMatch(/towards the side of the lesion/);
  });
});

describe('C7-F5: a PICA trunk occlusion that reaches the lateral medulla is named Wallenberg too', () => {
  it('r_pica: lateral medullary signs and both labels; the summary and the PICA text say so', () => {
    const r = scenario('r_pica', 24);
    expect(labels(r)).toEqual(expect.arrayContaining(['pica_cerebellar_r', 'wallenberg_r']));
    expect(get(r, 'horner', 'r')).toBeDefined();
    expect(SCENARIO_BY_ID.r_pica.summary.en).toMatch(/Wallenberg/);
    expect(SCENARIO_BY_ID.r_pica.summary.zh).toMatch(/華倫堡/);
    expect(desc('pica_cerebellar').en).toMatch(/lateral medulla/);
    expect(desc('pica_cerebellar').zh).toMatch(/延髓外側/);
  });
});

describe('C7-F6: bilateral medial medullary infarction is one picture', () => {
  it('both ASA roots: one bilateral label (not two Dejerine), dysarthria, and the respiratory event', () => {
    const r = sim(occl('asa_root_r', 'asa_root_l'), 24);
    expect(labels(r)).toContain('bilateral_medial_medullary');
    expect(labels(r).filter((l) => l.startsWith('dejerine'))).toEqual([]);
    expect(get(r, 'dysarthria', null)?.sev).toBe(2);
    expect(events(r)).toContain('respiratory_failure');
    const d = desc('bilateral_medial_medullary');
    expect(d.en).toMatch(/23\.8 %/);
    expect(d.zh).toMatch(/23\.8%|23\.8 %/);
  });

  it('one ASA root stays a Dejerine syndrome without dysarthria from the medulla', () => {
    const r = scenario('r_asa', 24);
    expect(labels(r)).toEqual(['dejerine_r']);
    expect(get(r, 'dysarthria', null)?.sources ?? []).not.toContain('medulla_medial_r');
  });
});

describe('C7-F7: a labyrinthine infarct is an end-organ infarct and a warning, not a TIA', () => {
  it('labyrinthine artery occlusion: the inner-ear story, no TIA or "no infarct" events, no brain-stroke story', () => {
    for (const tH of [1, 24, 720]) {
      const ids = events(sim(occl('labyrinthine_r'), tH));
      expect(ids, `${tH} h`).toEqual(expect.arrayContaining(['labyrinthine_infarction', 'ear_stroke_workup', 'imaging_labyrinth']));
      for (const id of ['ischemia_no_infarct', 'imaging_no_infarct', 'tia_urgent', 'ischemic_cascade', 'imaging_dwi'])
        expect(ids, `${tH} h: ${id}`).not.toContain(id);
    }
    // reopened too late to save it: no brain-tissue "penumbra saved" story either
    const late = events(sim(occl('labyrinthine_r'), 24, { reperfusionH: 2 }));
    expect(late).toContain('labyrinthine_infarction');
    expect(late).not.toContain('reperfusion');
    const workup = event(sim(occl('labyrinthine_r'), 24), 'ear_stroke_workup')!;
    expect(workup.severity).toBe('warn');
    expect(workup.desc.en).toMatch(/13 of 82/);
  });

  it('one labyrinthine branch (the lacune option) is told the same way, and a 5-minute one as a TIA', () => {
    const branch = events(sim([{ vessel: 'labyrinthine_r', severity: 1, branch: true }], 24));
    expect(branch).toEqual(expect.arrayContaining(['labyrinthine_infarction', 'ear_stroke_workup', 'imaging_labyrinth']));
    expect(branch).not.toContain('ischemia_no_infarct');
    const brief = events(sim([{ vessel: 'labyrinthine_r', severity: 1, branch: true, toH: 5 / 60 }], 24));
    expect(brief).toContain('ischemia_no_infarct');
    expect(brief).not.toContain('labyrinthine_infarction');
  });

  it('a labyrinthine artery that reopens within minutes is still told as a TIA; AICA keeps the brain story', () => {
    const tia = events(sim(occl('labyrinthine_r'), 24, { reperfusionH: 5 / 60 }));
    expect(tia).toContain('ischemia_no_infarct');
    expect(tia).not.toContain('labyrinthine_infarction');
    const aica = events(scenario('l_aica', 24));
    expect(aica).toContain('ischemic_cascade');
    expect(aica).not.toContain('labyrinthine_infarction');
  });
});

describe('C7-F8: hearing lost to a vascular cause often comes back, a profound loss less often', () => {
  it('no longer "no backup"; a profound (inner-ear) loss is taken over less than a lesser one', () => {
    expect(REDUNDANCY.hearing_loss.kind).toBe('partial');
    const one = (rid: string) => {
      const m = { [rid]: 1 };
      return aggregateSymptoms(m, m, 4320).find((s) => s.id === 'hearing_loss')!;
    };
    const profound = one('inner_ear_r');
    const lesser = one('pons_caudal_lateral_r');
    expect(profound.recovery!.compensated).toBeGreaterThan(0);
    expect(profound.recovery!.compensated).toBeLessThan(lesser.recovery!.compensated);
  });

  // R2-8: only about 40 % of profound losses improve, so the one course shown is the commoner one
  it('labyrinthine and AICA infarcts: the profound deafness stays profound at 3 and 6 months', () => {
    for (const r of [(tH: number) => sim(occl('labyrinthine_r'), tH), (tH: number) => scenario('l_aica', tH), (tH: number) => sim(occl('aica_r'), tH)]) {
      const sev = (tH: number) => r(tH).symptoms.find((s) => s.id === 'hearing_loss')?.sev ?? 0;
      for (const tH of [24, 720, 2160, 4320]) expect(sev(tH), `${tH} h`).toBe(3);
    }
    // below the rounding step: a profound (3) loss is never shown as improved
    const p = REDUNDANCY.hearing_loss.profound!;
    expect(3 * (1 - Math.max(p.uni, p.bi))).toBeGreaterThanOrEqual(2.5);
    // a lesser loss (the cochlear nucleus, partly affected) still improves, by 3 months
    const lesser = (tH: number) => {
      const m = { pons_caudal_lateral_r: 0.5 };
      return aggregateSymptoms(m, m, tH).find((s) => s.id === 'hearing_loss')?.sev ?? 0;
    };
    expect(lesser(2160)).toBeLessThan(lesser(24));
    const d = SYMPTOM_BY_ID.hearing_loss.desc;
    expect(d.en).toMatch(/40 %/);
    expect(d.zh).toMatch(/40%/);
    expect(d.en).toMatch(/commoner course/);
    expect(d.zh).toMatch(/較常見的病程/);
    // the inner-ear infarction story says the same
    const e = event(sim(occl('labyrinthine_r'), 24), 'labyrinthine_infarction')!;
    expect(e.desc.en).toMatch(/about 40 %/);
    expect(e.desc.en).not.toMatch(/often improves/);
    expect(e.desc.zh).toMatch(/約 40%/);
  });
});

describe('R2-6: the Wallenberg texts include the bilateral trigeminal pattern the model shows', () => {
  it('the right vertebral scenario lists the opposite face, and its summary says so', () => {
    const r = scenario('r_wallenberg', 24);
    expect(get(r, 'pain_temp_face', 'r')).toBeDefined();
    expect(get(r, 'pain_temp_face', 'l')).toBeDefined();
    const s = SCENARIO_BY_ID.r_wallenberg.summary;
    expect(s.en).toMatch(/left face/);
    expect(s.zh).toMatch(/左臉/);
  });

  it('the label text gives the classic crossed pattern as the less common one (Kim 1997)', () => {
    const d = desc('wallenberg');
    expect(d.en).toMatch(/13 of 50/);
    expect(d.en).toMatch(/12 of 50/);
    expect(d.zh).toMatch(/50 人中 13 人/);
    expect(d.zh).toMatch(/12 人/);
  });
});

describe('R2-7: both vertebral arteries blocked: one bilateral medullary label', () => {
  it('no one-sided hemimedullary or Wallenberg syndrome next to the bilateral label', () => {
    for (const tH of [0.1, 24, 4320]) expect(labels(sim(occl('va_v4_dist_r', 'va_v4_dist_l'), tH)), `${tH} h`).toEqual(['bilateral_medial_medullary']);
    const d = desc('bilateral_medial_medullary');
    expect(d.en).toMatch(/lateral medulla/);
    expect(d.zh).toMatch(/延髓外側/);
    // one side alone is still named as it was
    expect(labels(sim(occl('va_v4_dist_r'), 24))).toEqual(['wallenberg_r']);
  });

  it('a vertebral occlusion with a unilateral ASA: both medial medullae, one bilateral label, as the variant text says', () => {
    const r = sim(occl('va_v4_dist_r'), 24, { variants: ['asa_unilateral_r'] });
    expect(labels(r)).toEqual(['bilateral_medial_medullary']);
    for (const fs of ['r', 'l'] as const) expect(get(r, 'arm_weak', fs)?.sev, fs).toBe(3);
    const v = VARIANTS.find((x) => x.id === 'asa_unilateral_r')!.desc;
    expect(v.en).toMatch(/medial medulla on both sides/);
    expect(v.zh).toMatch(/兩側延髓內側都梗塞/);
    // the hemimedullary syndrome: the vertebral together with the ASA root of its own side
    expect(labels(sim(occl('va_v4_dist_r', 'asa_root_r'), 24))).toEqual(['hemimedullary_r']);
  });
});

describe('C7-F9: medial medullary infarction also gives vertigo and central pain', () => {
  it('Dejerine: vertigo acutely, central post-stroke pain on the weak side later; the NIHSS and label unchanged', () => {
    const acute = scenario('r_asa', 24);
    expect(get(acute, 'vertigo', null)?.sources).toContain('medulla_medial_r');
    expect(labels(acute)).toEqual(['dejerine_r']);
    expect(get(scenario('r_asa', 2160), 'central_pain', 'l')?.sources).toContain('medulla_medial_r');
    expect(get(acute, 'central_pain')).toBeUndefined();
    const d = desc('dejerine');
    expect(d.en).toMatch(/59 %/);
    expect(d.en).toMatch(/21 of 86/);
  });
});

describe('C7-F10: the cerebellar cognitive affective syndrome', () => {
  it('posterior-lobe infarct: mild executive and visuospatial deficits; inferior vermis: a mild affective change', () => {
    const lateral = sim(occl('pica_lateral_r'), 24);
    for (const id of ['executive', 'visuospatial']) {
      expect(get(lateral, id, null)?.sev, id).toBe(1);
      expect(get(lateral, id, null)?.sources, id).toContain('cerebellum_posterior_inferior_r');
    }
    const medial = sim(occl('pica_medial_r'), 24);
    expect(get(medial, 'emotional', null)?.sources).toContain('vermis_inferior_r');
    // the anterior lobe (the SCA's upper surface) gives only minor changes
    expect(has(sim(occl('sca_lateral_r'), 24, { collateral: 'poor' }), 'executive')).toBe(false);
  });

  it('the PICA and SCA texts mention it and that MMSE / MoCA can be normal', () => {
    for (const id of ['pica_cerebellar', 'sca']) {
      expect(desc(id).en, id).toMatch(/cerebellar cognitive affective syndrome/);
      expect(desc(id).zh, id).toMatch(/小腦認知情感症候群/);
    }
    expect(desc('pica_cerebellar').en).toMatch(/MoCA/);
  });
});

describe('C7-F11: ipsilateral hemiparesis with a lateral medullary infarct (Opalski)', () => {
  it('the Wallenberg text names it, its risk, and that the model does not reproduce it', () => {
    const d = desc('wallenberg');
    expect(d.en).toMatch(/Opalski/);
    expect(d.en).toMatch(/not reproduced/);
    expect(d.zh).toMatch(/Opalski/);
    // and indeed: no weakness on the lesion side
    for (const tH of [24, 2160]) {
      const r = scenario('r_wallenberg', tH);
      for (const id of ['arm_weak', 'leg_weak']) expect(get(r, id, 'r')).toBeUndefined();
    }
  });
});
