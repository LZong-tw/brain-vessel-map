import { describe, expect, it } from 'vitest';
import { REGION_BY_ID, VESSELS } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYNDROMES, type SymptomQuery } from '../anatomy/syndromes';
import { REPERFUSION_STOPS, TIME_STOPS } from '../anatomy/timeline';
import { symptomsAddedAt } from './cascade';
import { AKINETIC_OBSERVED, NEEDS_AWAKE, NEEDS_SIGHT, SPEECH_SIGNS, aggregateSymptoms, estimateNihss, isBlind } from './clinical';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { isOccludable, simulate, type SimInput, type SimResult } from './simulate';
import { ALL_STOPS, noUnexplainedReturn } from './testing/courseChecks';
import { unitState } from './tissue';
import { DEFAULT_TISSUE } from './tissueParams';

/** Relations between outputs that must hold for every scenario at every displayed time. */
const inputOf = (id: string, over: Partial<SimInput> = {}): SimInput => {
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

describe('output invariants', () => {
  it.each(SCENARIOS.map((s) => [s.id]))('%s: the current infarct never exceeds the predicted final infarct', (id) => {
    for (const reperfusionH of [inputOf(id).reperfusionH, null]) {
      for (const stop of TIME_STOPS) {
        const r = simulate(inputOf(id, { tH: stop.h, reperfusionH }));
        expect(r.volumes.core, `${id} t=${stop.h} h reperfusion=${reperfusionH}`).toBeLessThanOrEqual(r.volumes.finalInfarct + 0.01);
      }
    }
  });

  // reopening an artery can only save tissue: the dead core stays dead, and secondary damage
  // (herniation, compression) follows the final infarct, which treatment cannot enlarge
  const withComplete = SCENARIOS.filter((s) => s.occlusions.some((o) => o.severity >= 1 && !o.branch));
  it.each(withComplete.map((s) => [s.id]))('%s: treatment never makes the final infarct larger than no treatment', (id) => {
    for (const collateral of ['good', 'poor'] as const) {
      const untreated = simulate(inputOf(id, { collateral, reperfusionH: null, tH: 24 })).volumes.finalInfarct;
      for (const reperfusionH of REPERFUSION_STOPS) {
        const treated = simulate(inputOf(id, { collateral, reperfusionH, tH: 24 })).volumes.finalInfarct;
        expect(treated, `${id} ${collateral} reperfusion ${reperfusionH} h`).toBeLessThanOrEqual(untreated + 0.01);
      }
    }
  });

  it('a left M1 with poor collaterals opened at 1 h is not worse than untreated (border-zone rounding)', () => {
    const run = (reperfusionH: number | null) =>
      simulate({ occlusions: [{ vessel: 'mca_m1_l', severity: 1 }], variants: [], collateral: 'poor', map: 93, tH: 72, reperfusionH, decompression: false });
    expect(run(1).volumes.finalInfarct).toBeLessThanOrEqual(run(null).volumes.finalInfarct + 0.01);
  });

  // a symptom that is present, then gone, then back within the first hours has no physiological
  // reason here (no reopening, no new event): it was a threshold artefact (reported at
  // #o=basilar_mid&p=135&r=24, where one row of the function heat-map had four empty cells)
  const HYPERACUTE = TIME_STOPS.filter((s) => s.h <= 12);
  const untreatedSingleOnset = SCENARIOS.filter((s) => s.occlusions.every((o) => !o.fromH && o.toH == null));
  it.each(untreatedSingleOnset.map((s) => [s.id]))('%s: no symptom switches off and back on in the first 12 h', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const) {
      for (const map of [inputOf(id).map, 135]) {
        const lists = HYPERACUTE.map((st) => simulate(inputOf(id, { collateral, map, reperfusionH: null, tH: st.h })).symptoms.map((x) => `${x.id}|${x.side}`));
        const all = new Set(lists.flat());
        for (const key of all) {
          const on = lists.map((l) => l.includes(key));
          const first = on.indexOf(true);
          const gap = on.indexOf(false, first);
          const back = gap >= 0 ? on.indexOf(true, gap) : -1;
          expect(back, `${id} ${collateral} MAP ${map}: ${key} is ${on.map((x) => (x ? '■' : '□')).join('')}`).toBe(-1);
        }
      }
    }
  });

  // R6-11: the same over the whole course, for single occlusions too. A symptom may go and come
  // back only for a reason the model has: a sign that cannot be examined at the patient's level of
  // consciousness is not listed then (R5-7, X1-12: the engine names it in `unexaminable`), and the
  // sparing of central vision is lost while the oedema of days 1–2 weeks silences the occipital
  // pole too; or it comes back from new damage (testing/courseChecks.ts)
  it.each(untreatedSingleOnset.map((s) => [s.id]))('%s: no symptom switches off and back on over the whole course without a reason (R6-11)', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      noUnexplainedReturn(`${id} ${collateral}`, ALL_STOPS.map((tH) => simulate(inputOf(id, { collateral, reperfusionH: null, tH }))));
  });
  const SINGLE = VESSELS.filter((v) => isOccludable(v.id)).map((v) => v.id);
  it.each(SINGLE.map((v) => [v]))('%s alone: no symptom switches off and back on over the whole course without a reason (R6-11)', (vessel) => {
    for (const collateral of ['good', 'poor'] as const)
      noUnexplainedReturn(
        `${vessel} ${collateral}`,
        ALL_STOPS.map((tH) => simulate({ occlusions: [{ vessel, severity: 1 }], variants: [], collateral, map: 93, tH, reperfusionH: null, decompression: false })),
      );
  });

  // the two halves of that artefact, pinned directly (no scenario sits exactly on the line now)
  it('tissue below the core threshold stays fully dysfunctional while it dies', () => {
    for (const rel of [0, 0.1, 0.2, DEFAULT_TISSUE.coreRel - 0.01])
      for (const st of TIME_STOPS) {
        const { f, rest } = unitState(rel, st.h, null, 1);
        const dysfunctional = f + (rest === 'penumbra' ? 1 - f : 0);
        expect(dysfunctional, `rel ${rel} t ${st.h} h (${rest})`).toBeCloseTo(1, 12);
      }
  });

  it('a region exactly at the symptom threshold counts, whatever the rounding', () => {
    const at = (x: number) => aggregateSymptoms({ pons_caudal_lateral_r: x }, { pons_caudal_lateral_r: 0 }, 1).map((s) => s.id);
    expect(at(0.25)).toContain('hearing_loss');
    expect(at(0.25 - 1e-12)).toContain('hearing_loss');
    expect(at(0.2)).not.toContain('hearing_loss');
  });
});


/**
 * Named syndromes and cascade events must agree with the symptom list shown at the same time:
 * a syndrome named for its signs only with those signs, a label named for the vascular pattern
 * marked clinically silent when no symptom from its side is left, an event that adds a symptom
 * together with it, and a bilateral lesion as one bilateral picture rather than two one-sided
 * crossed syndromes.
 */
describe('syndromes and events agree with the symptoms', () => {
  /** every scenario at every displayed time, plus single occlusions that reach the gated labels */
  const EXTRA: [string, Occlusion[], CollateralGrade, number?][] = [
    ['aca_a2_r poor', [{ vessel: 'aca_a2_r', severity: 1 }], 'poor'],
    ['aca_pericallosal_r moderate', [{ vessel: 'aca_pericallosal_r', severity: 1 }], 'moderate'],
    ['mca_post_parietal_r poor', [{ vessel: 'mca_post_parietal_r', severity: 1 }], 'poor'],
    ['pica_l moderate', [{ vessel: 'pica_l', severity: 1 }], 'moderate'],
    ['va_v4_dist_l', [{ vessel: 'va_v4_dist_l', severity: 1 }], 'good'],
    ['thalamogeniculate_r', [{ vessel: 'thalamogeniculate_r', severity: 1 }], 'good'],
    ['thalamogeniculate_r lacune', [{ vessel: 'thalamogeniculate_r', severity: 1, branch: true }], 'good'],
    ['pca_p2_r + pca_p2_l', [{ vessel: 'pca_p2_r', severity: 1 }, { vessel: 'pca_p2_l', severity: 1 }], 'good'],
    ['basilar_lower good', [{ vessel: 'basilar_lower', severity: 1 }], 'good'],
    ['basilar_lower poor', [{ vessel: 'basilar_lower', severity: 1 }], 'poor'],
    ['basilar_upper', [{ vessel: 'basilar_upper', severity: 1 }], 'moderate'],
    [
      'both caudal pontine perforator groups',
      [
        { vessel: 'pontine_paramedian_caudal_r', severity: 1 },
        { vessel: 'pontine_paramedian_caudal_l', severity: 1 },
      ],
      'good',
    ],
    ['pontine_paramedian_caudal_r lacune', [{ vessel: 'pontine_paramedian_caudal_r', severity: 1, branch: true }], 'good'],
    ['pontine_circumferential_l', [{ vessel: 'pontine_circumferential_l', severity: 1 }], 'good'],
    ['mesencephalic_perf_l', [{ vessel: 'mesencephalic_perf_l', severity: 1 }], 'good'],
    ['brachiocephalic moderate', [{ vessel: 'brachiocephalic', severity: 1 }], 'moderate'],
    // MERGE: the second chain's brainstem labels (C3-F1, C3-F4): coma and the disorder of
    // consciousness after it, and a one-sided paramedian upper pontine infarct
    [
      'both rostral pontine perforator groups',
      [
        { vessel: 'pontine_paramedian_rostral_r', severity: 1 },
        { vessel: 'pontine_paramedian_rostral_l', severity: 1 },
      ],
      'good',
    ],
    ['pontine_paramedian_rostral_l', [{ vessel: 'pontine_paramedian_rostral_l', severity: 1 }], 'good'],
    // MERGE: the thalamic territory labels of C9-F2 are vascular-pattern labels (C5-F2)
    ['thalamoperforator_r', [{ vessel: 'thalamoperforator_r', severity: 1 }], 'good'],
    ['posterior_choroidal_l', [{ vessel: 'posterior_choroidal_l', severity: 1 }], 'good'],
    // C7-F6: both medial medullae
    [
      'both ASA roots',
      [
        { vessel: 'asa_root_r', severity: 1 },
        { vessel: 'asa_root_l', severity: 1 },
      ],
      'good',
    ],
    // R1-9: a left PCA infarct with the angular gyrus (alexia with agraphia), and without it
    [
      'pca_p2_l + mca_angular_l poor',
      [
        { vessel: 'pca_p2_l', severity: 1 },
        { vessel: 'mca_angular_l', severity: 1 },
      ],
      'poor',
    ],
    ['pca_p2_l poor', [{ vessel: 'pca_p2_l', severity: 1 }], 'poor'],
    // R2-7: both distal vertebral arteries (the whole medulla on both sides)
    [
      'both V4',
      [
        { vessel: 'va_v4_dist_r', severity: 1 },
        { vessel: 'va_v4_dist_l', severity: 1 },
      ],
      'good',
    ],
    // R1-5: both calcarine arteries (cortical blindness)
    [
      'both calcarine arteries',
      [
        { vessel: 'pca_calcarine_r', severity: 1 },
        { vessel: 'pca_calcarine_l', severity: 1 },
      ],
      'moderate',
    ],
    // R5-1, R5-10: both paramedian midbrain halves infarcted, the peduncles recovering
    ['basilar_tip good', [{ vessel: 'basilar_tip', severity: 1 }], 'good'],
    ['basilar_tip moderate reopened 6 h', [{ vessel: 'basilar_tip', severity: 1 }], 'moderate', 6],
    ['basilar_tip poor reopened 2 h', [{ vessel: 'basilar_tip', severity: 1 }], 'poor', 2],
    // R5-3: both caudal tegmenta infarcted, the ventral pons only partly
    ['basilar_mid poor reopened 2 h', [{ vessel: 'basilar_mid', severity: 1 }], 'poor', 2],
    ['basilar_mid moderate reopened 6 h', [{ vessel: 'basilar_mid', severity: 1 }], 'moderate', 6],
    // R5-4, R5-5: reopened after the ventral pons has infarcted on both sides
    ['basilar_mid good reopened 24 h', [{ vessel: 'basilar_mid', severity: 1 }], 'good', 24],
    ['basilar_upper moderate reopened 6 h', [{ vessel: 'basilar_upper', severity: 1 }], 'moderate', 6],
    ['basilar_upper good reopened 8 h', [{ vessel: 'basilar_upper', severity: 1 }], 'good', 8],
    // X2-7, X2-9, X2-10: woken by an early reopening, and rescued before anything infarcted
    ['basilar_upper good reopened 6 h', [{ vessel: 'basilar_upper', severity: 1 }], 'good', 6],
    ['basilar_upper moderate reopened 2 h', [{ vessel: 'basilar_upper', severity: 1 }], 'moderate', 2],
    ['basilar_upper poor reopened 1 h', [{ vessel: 'basilar_upper', severity: 1 }], 'poor', 1],
    ['basilar_mid good reopened 1 h', [{ vessel: 'basilar_mid', severity: 1 }], 'good', 1],
    // X2-8, X2-11: a basilar occlusion before and after a later index event
    [
      'basilar_upper, then mca_m1_l at 1 month, poor',
      [
        { vessel: 'basilar_upper', severity: 1, fromH: 0 },
        { vessel: 'mca_m1_l', severity: 1, fromH: 720 },
      ],
      'poor',
    ],
    [
      'mca_m1_l, then basilar_upper at 1 month, poor',
      [
        { vessel: 'mca_m1_l', severity: 1, fromH: 0 },
        { vessel: 'basilar_upper', severity: 1, fromH: 720 },
      ],
      'poor',
    ],
    [
      'both mesencephalic perforators',
      [
        { vessel: 'mesencephalic_perf_r', severity: 1 },
        { vessel: 'mesencephalic_perf_l', severity: 1 },
      ],
      'good',
    ],
    // Y2-13, Y2-14: both M1 arteries (both frontal eye fields, both half-fields lost); Y2-14, Y2-18:
    // both P2 arteries with moderate and poor collaterals (blind, then sight partly back); Y2-15:
    // both A2 arteries (akinetic mutism); Y2-2: a right M1 reopened at 2 h (the deep infarct)
    [
      'both M1',
      [
        { vessel: 'mca_m1_r', severity: 1 },
        { vessel: 'mca_m1_l', severity: 1 },
      ],
      'good',
    ],
    ['pca_p2_r + pca_p2_l moderate', [{ vessel: 'pca_p2_r', severity: 1 }, { vessel: 'pca_p2_l', severity: 1 }], 'moderate'],
    ['pca_p2_r + pca_p2_l poor', [{ vessel: 'pca_p2_r', severity: 1 }, { vessel: 'pca_p2_l', severity: 1 }], 'poor'],
    [
      'both A2 moderate',
      [
        { vessel: 'aca_a2_r', severity: 1 },
        { vessel: 'aca_a2_l', severity: 1 },
      ],
      'moderate',
    ],
    ['mca_m1_r reopened 2 h', [{ vessel: 'mca_m1_r', severity: 1 }], 'good', 2],
  ];
  const STOPS = TIME_STOPS.map((s) => s.h);
  const memo = new Map<string, SimResult[]>();
  const series = (name: string): SimResult[] => {
    let got = memo.get(name);
    if (!got) {
      const extra = EXTRA.find((e) => e[0] === name);
      got = STOPS.map((tH) =>
        extra
          ? simulate({ occlusions: extra[1], variants: [], collateral: extra[2], map: 93, tH, reperfusionH: extra[3] ?? null, decompression: false })
          : simulate(inputOf(name, { tH })),
      );
      memo.set(name, got);
    }
    return got;
  };
  const CASES = [...SCENARIOS.map((s) => s.id), ...EXTRA.map((e) => e[0])].map((n) => [n]);

  /** the same questions the engine asks, answered here from the symptom list itself */
  const query = (r: SimResult): SymptomQuery => ({
    has: (id) => r.symptoms.some((s) => s.id === id),
    on: (id, side, minSev = 1) => r.symptoms.some((s) => s.id === id && (s.side === side || s.side === 'both') && s.sev >= minSev),
    from: (id, side, base) =>
      r.symptoms.some((s) => s.id === id && s.sources.some((src) => REGION_BY_ID[src]?.side === side && (!base || REGION_BY_ID[src].baseId === base))),
  });
  /**
   * a symptom produced by a region on this side (lateral labels) or by any region (bilateral
   * ones), listed or there but not examinable at the patient's level of consciousness (X1-2)
   */
  const anyFrom = (r: SimResult, side: 'r' | 'l' | null) =>
    [...r.symptoms, ...r.unexaminable].some((s) => s.sources.some((src) => REGION_BY_ID[src] && (side === null || REGION_BY_ID[src].side === side)));

  it('the syndromes named for their signs carry the signs they need', () => {
    const gated = SYNDROMES.filter((d) => d.requires).map((d) => d.id);
    expect(gated).toEqual(
      expect.arrayContaining([
        'neglect',
        'gerstmann',
        'wallenberg',
        'lacunar_pure_sensory',
        'locked_in',
        'locked_in_incomplete',
        'pontine_ventral',
        'one_and_half',
        'weber_benedikt',
        'claude',
        // C1-F6, C1-F7
        'man_in_barrel',
        'cortical_blindness',
        // R1-9: alexia, with writing spared
        'alexia_without_agraphia',
        // Y2-14: simultanagnosia or optic ataxia, which need sight to be tested
        'balint',
        // the second audit chain's brainstem labels, gated the same way (MERGE: C3-F1, C3-F4 × C5-F2)
        'basilar_coma',
        'pontine_doc',
        'pontine_anteromedial',
      ]),
    );
    // a label is either named for its signs or for its vascular pattern
    for (const d of SYNDROMES) expect(!!d.requires && !!d.pattern, d.id).toBe(false);
  });

  it.each(CASES)('%s: every shown syndrome named for its signs has them, at every time', (name) => {
    series(name).forEach((r, i) => {
      for (const m of r.syndromes) {
        if (!m.def.requires) continue;
        expect(m.def.requires(query(r), m.side ?? 'r'), `${name} ${STOPS[i]} h: ${m.def.id}_${m.side ?? ''}`).toBe(true);
      }
    });
  });

  it.each(CASES)('%s: a pattern label is marked silent exactly when no symptom from its side is left, listed or not examinable (X1-2)', (name) => {
    series(name).forEach((r, i) => {
      for (const m of r.syndromes) {
        const where = `${name} ${STOPS[i]} h: ${m.def.id}_${m.side ?? ''}`;
        if (m.def.pattern) expect(m.silent ?? false, where).toBe(!anyFrom(r, m.side));
        else expect(m.silent ?? false, where).toBe(false);
      }
    });
  });

  // R1-1: item 9 = 3 is "mute and follows no one-step commands" (the scale's instructions); a
  // disorder of consciousness is such a patient (R1-1 with R5-7)
  it.each(CASES)('%s: a mute global aphasia (item 9 = 3) follows no command and is scored mute', (name) => {
    series(name).forEach((r, i) => {
      if (r.symptoms.some((s) => s.id === 'disorder_of_consciousness')) expect(r.nihss.items['9'], `${name} ${STOPS[i]} h: DoC`).toBe(3);
      if (r.nihss.items['9'] !== 3) return;
      expect([r.nihss.items['1c'], r.nihss.items['10']], `${name} ${STOPS[i]} h`).toEqual([2, 2]);
    });
  });

  // Y2-18: the cortical-blindness label is named for the blindness: it is shown exactly when the
  // blindness is listed (the converse of the rule above)
  it.each(CASES)('%s: the cortical-blindness label is shown exactly when cortical blindness is listed (Y2-18)', (name) => {
    series(name).forEach((r, i) => {
      const listed = r.symptoms.some((s) => s.id === 'cortical_blindness');
      expect(r.syndromes.some((m) => m.def.id === 'cortical_blindness'), `${name} ${STOPS[i]} h`).toBe(listed);
    });
  });

  // Y2-14: recognising faces and objects by sight, reading, finding the way, seeing a whole scene,
  // reaching under sight and visuospatial tasks need sight to be tested; nor is a Balint syndrome
  // named in a blind patient
  it.each(CASES)('%s: no recognition by sight, reading or reaching listed, and no Balint label, in a blind patient (Y2-14)', (name) => {
    series(name).forEach((r, i) => {
      if (!isBlind(r.symptoms)) return;
      const where = `${name} ${STOPS[i]} h`;
      for (const s of r.symptoms) expect(NEEDS_SIGHT.includes(s.id), `${where}: ${s.id}`).toBe(false);
      expect(r.syndromes.some((m) => m.def.id === 'balint'), where).toBe(false);
    });
  });

  // Y2-15: in a moderate or severe akinetic mutism nothing that needs the patient to act on request,
  // answer or report is listed (named apart, as not examinable), nor an aphasia type; mute, no
  // dysarthria or hoarse voice either
  it.each(CASES)('%s: akinetic mutism lists only what the examiner sees (Y2-15)', (name) => {
    series(name).forEach((r, i) => {
      const am = r.symptoms.filter((s) => s.id === 'akinetic_mutism').reduce((m, s) => Math.max(m, s.sev), 0);
      if (am < 2) return;
      const where = `${name} ${STOPS[i]} h`;
      for (const s of r.symptoms) {
        if (NEEDS_AWAKE.includes(s.id)) expect(AKINETIC_OBSERVED, `${where}: ${s.id}`).toContain(s.id);
        expect(s.id.startsWith('aphasia_'), `${where}: ${s.id}`).toBe(false);
        if (am >= 3) expect(SPEECH_SIGNS.includes(s.id), `${where}: ${s.id}`).toBe(false);
      }
    });
  });

  // Y2-13, Y2-17: one entry per deficit and side. A deficit of both sides is not listed beside the
  // same deficit of one side, and the eyes cannot deviate to the right and to the left at once
  it.each(CASES)('%s: no deficit listed for both sides and for one side, and no opposite gaze deviations (Y2-13, Y2-17)', (name) => {
    series(name).forEach((r, i) => {
      const where = `${name} ${STOPS[i]} h`;
      for (const s of r.symptoms.filter((x) => x.side === 'both'))
        expect(r.symptoms.some((x) => x.id === s.id && (x.side === 'r' || x.side === 'l')), `${where}: ${s.id}`).toBe(false);
      expect(r.symptoms.filter((x) => x.id === 'gaze_deviation').length, where).toBeLessThan(2);
    });
  });

  // R1-5: colour can be neither lost nor tested where nothing is seen
  it.each(CASES)('%s: no colour loss is listed in a blind field', (name) => {
    series(name).forEach((r, i) => {
      const has = (id: string, side: 'r' | 'l' | null = null) => r.symptoms.some((s) => s.id === id && (side === null || s.side === side));
      const where = `${name} ${STOPS[i]} h`;
      if (has('cortical_blindness')) expect(has('achromatopsia') || has('hemiachromatopsia'), where).toBe(false);
      for (const fs of ['r', 'l'] as const) if (has('hemianopia', fs)) expect(has('hemiachromatopsia', fs), `${where} (${fs})`).toBe(false);
    });
  });

  it.each(CASES)('%s: no bilateral lesion is named as two one-sided crossed brainstem syndromes', (name) => {
    series(name).forEach((r, i) => {
      // C7-F6: both medial medullae are one bilateral medial medullary infarction, not two Dejerine;
      // MERGE: nor two anteromedial pontine syndromes (C3-F4); R2-7: nor two hemimedullary or two
      // Wallenberg syndromes; R5-1: nor two Claude or Weber syndromes; R5-3: nor two
      // one-and-a-half syndromes (that is a horizontal gaze palsy to both sides)
      for (const id of [
        'pontine_ventral',
        'pontine_anteromedial',
        'pontine_lacunar',
        'foville',
        'dejerine',
        'hemimedullary',
        'wallenberg',
        'claude',
        'weber_benedikt',
        'one_and_half',
      ]) {
        const sides = r.syndromes.filter((m) => m.def.id === id).map((m) => m.side);
        expect(sides.length, `${name} ${STOPS[i]} h: ${id} ${sides.join('+')}`).toBeLessThan(2);
      }
      // R5-1, R5-10: nor a Weber on one side and a Claude on the other
      const midbrain = new Set(r.syndromes.filter((m) => m.def.id === 'claude' || m.def.id === 'weber_benedikt').map((m) => m.side));
      expect(midbrain.size, `${name} ${STOPS[i]} h: crossed midbrain syndromes on both sides`).toBeLessThan(2);
    });
  });

  it.each(CASES)('%s: a one-and-a-half syndrome has no limb weakness and a horizontal gaze palsy to one side only (R5-3)', (name) => {
    series(name).forEach((r, i) => {
      for (const m of r.syndromes.filter((x) => x.def.id === 'one_and_half')) {
        const where = `${name} ${STOPS[i]} h: one_and_half_${m.side}`;
        expect(r.symptoms.some((s) => s.id === 'arm_weak' || s.id === 'leg_weak'), where).toBe(false);
        expect(r.symptoms.filter((s) => s.id === 'gaze_palsy_horizontal').map((s) => s.side), where).toEqual([m.side]);
      }
    });
  });

  // R5-7: what cannot be shown or examined in a stuporous or comatose patient, or in a disorder of
  // consciousness, is not listed then (colour, reading and writing too: R1-5 and R1-9 with R5-7;
  // the other higher cortical signs, what only the patient can report, and the finger–nose test:
  // X1-12). Speech and attention, which the NIHSS scores in a stuporous patient (items 9, 10 and
  // 11), are listed through stupor and not in coma, where the scale scores those items itself;
  // nor is an aphasia type, a slurred or a hoarse voice in a disorder of consciousness, which is
  // scored as mute (X1-5, X1-12). An emotional facial paresis needs a face that moves on command.
  it.each(CASES)('%s: no sign that needs an awake patient while stuporous, comatose or in a disorder of consciousness (R5-2, R5-7, X1-5, X1-12)', (name) => {
    series(name).forEach((r, i) => {
      const doc = r.symptoms.some((s) => s.id === 'disorder_of_consciousness');
      const loc = r.nihss.items['1a'] ?? 0;
      const unaware = loc >= 2 || doc;
      const holmesUnaware = r.symptoms.some((s) => s.id === 'coma' || s.id === 'disorder_of_consciousness');
      for (const s of r.symptoms) {
        const where = `${name} ${STOPS[i]} h: ${s.id}`;
        if (s.id === 'holmes_tremor') expect(holmesUnaware, where).toBe(false);
        else if (NEEDS_AWAKE.includes(s.id)) expect(unaware, where).toBe(false);
        else if (SPEECH_SIGNS.includes(s.id)) expect(loc >= 3 || doc, where).toBe(false);
        else if (s.id === 'neglect') expect(loc, where).toBeLessThan(3);
      }
      for (const e of r.symptoms.filter((s) => s.id === 'emotional_facial_paresis'))
        expect(
          r.symptoms.some((s) => (s.id === 'face_weak' || s.id === 'face_weak_peripheral') && (s.side === e.side || s.side === 'both')),
          `${name} ${STOPS[i]} h: emotional_facial_paresis_${e.side} with a weak face on that side`,
        ).toBe(false);
    });
  });

  // X1-5: a sign that cannot be examined at the patient's level of consciousness is not listed,
  // but the NIHSS does not drop for it: the scale has its own rules for the stuporous and the
  // comatose patient (the examiner must still choose a language score in stupor; limb ataxia is
  // absent in a patient who cannot understand; coma sets items 9 and 11), and a disorder of
  // consciousness is scored as a mute patient who follows no command
  it.each(CASES)('%s: leaving out what cannot be examined never changes the NIHSS (X1-5)', (name) => {
    series(name).forEach((r, i) => {
      const all = estimateNihss([...r.symptoms, ...r.unexaminable], []);
      expect(r.nihss.items, `${name} ${STOPS[i]} h: ${r.unexaminable.map((s) => s.id).join(', ')}`).toEqual(all.items);
    });
  });

  // X2-7, X2-8, X2-10, X2-11, X2-15: the brainstem consciousness events follow the labels of the
  // bilateral ventral pons: each label shown has its event running, titled for it, and no such
  // event runs without its label (a coma event without stupor or coma least of all)
  const BRAINSTEM_FAMILY = ['basilar_coma', 'pontine_doc', 'locked_in', 'locked_in_incomplete'];
  it.each(CASES)('%s: the brainstem consciousness events follow the labels shown (X2-10, X2-11, X2-15)', (name) => {
    series(name).forEach((r, i) => {
      const tH = STOPS[i];
      const shown = r.syndromes.map((m) => m.def.id).filter((id) => BRAINSTEM_FAMILY.includes(id));
      const running = r.cascade.events
        .filter((e) => e.onsetH <= tH && tH < (e.endH ?? Infinity))
        .map((e) => e.id.replace(/_\d+$/, ''))
        .filter((id) => BRAINSTEM_FAMILY.includes(id));
      expect(running.sort(), `${name} ${tH} h`).toEqual(shown.sort());
      if (running.includes('basilar_coma'))
        expect(r.symptoms.some((s) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness'), `${name} ${tH} h`).toBe(true);
    });
  });

  it.each(CASES)('%s: every active cascade event that adds a symptom has it in the symptom list', (name) => {
    series(name).forEach((r, i) => {
      const tH = STOPS[i];
      for (const e of r.cascade.events) {
        // (a herniation coma lasts while the midline shift is in the coma range, C4-F1, R6-5; a
        // level of consciousness that follows a swelling, for its own part of the event, R6-1)
        for (const s of symptomsAddedAt(e, tH, r.edema.massEffectMm)) {
          // drowsiness is listed as coma when the patient is also comatose
          const ids = s.id === 'somnolence' ? ['somnolence', 'coma'] : [s.id];
          expect(
            r.symptoms.some((x) => ids.includes(x.id)),
            `${name} ${tH} h: event ${e.id} adds ${s.id}`,
          ).toBe(true);
        }
      }
    });
  });
});
