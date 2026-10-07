import { describe, expect, it } from 'vitest';
import { BEDS, REGION_BY_ID, VESSELS } from '../anatomy';
import { LACUNE_SITES } from '../anatomy/lacunes';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYNDROMES, haemodynamicSetting, type SymptomQuery } from '../anatomy/syndromes';
import { REPERFUSION_STOPS, TIME_STOPS } from '../anatomy/timeline';
import { consciousnessFromShift, symptomsAddedAt } from './cascade';
import { AKINETIC_OBSERVED, NEEDS_AWAKE, NEEDS_SIGHT, PART_OF, SPEECH_SIGNS, aggregateSymptoms, estimateNihss, isBlind } from './clinical';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { isOccludable, simulate, type SimInput, type SimResult } from './simulate';
import { endOf, progressed, startOf, successorOf } from './schedule';
import { DEFAULT_TREATMENT, downstreamBranches, type TreatmentOptions } from './treatment';
import { ALL_STOPS, noUnexplainedReturn } from './testing/courseChecks';
import { unitState } from './tissue';
import { DEFAULT_TISSUE } from './tissueParams';
import { fmtMl, pctShare, regionComposition } from '../ui/format';
import { deficitGroup, finalOutcome, finalRegions } from '../ui/finalOutcome';
import { regionFunctionGroup, regionRecovery } from '../ui/recoveryFormat';
import { treatmentLine } from '../ui/caseSummary';

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

  // V1-6: what treatment saves is what the untreated course loses in the end and this one does not,
  // the infarcts of a herniation that the reopening prevents included (the brain's, as the saved
  // volume counts it)
  it.each(withComplete.map((s) => [s.id]))('%s: the saved volume is the untreated final infarct less the treated one (V1-6)', (id) => {
    const brain = (r: SimResult) => r.volumes.finalInfarct - r.volumes.cord.final;
    for (const reperfusionH of [1, 4.5, 12]) {
      const treated = simulate(inputOf(id, { reperfusionH, tH: 4320 }));
      const untreated = simulate(inputOf(id, { reperfusionH: null, tH: 4320 }));
      expect(treated.volumes.saved, `${id} reopened at ${reperfusionH} h`).toBeCloseTo(Math.max(0, brain(untreated) - brain(treated)), 1);
    }
  });

  // Z1-7: what a reopening saves shrinks with every hour of delay, in every region, and so does
  // what it spares of a limb (the internal capsule beside an infarcted striatum was lost within
  // 30 min, so reopening at 30 min, 6 h or never left the same arm)
  const LATER: [string, Occlusion[]][] = [
    ...withComplete.map((s) => [s.id, s.occlusions] as [string, Occlusion[]]),
    ...['mca_m1_l', 'ica_terminal_r', 'lenticulostriate_l', 'acha_r', 'mca_m2_sup_r', 'mca_precentral_l'].map((v) => [v, [{ vessel: v, severity: 1 }]] as [string, Occlusion[]]),
  ];
  // (Z2-6: nor a milder aphasia or neglect: what spared cortex takes over shrinks as more of it is lost)
  it.each(LATER.map(([name, occ]) => [name, occ] as const))('%s: a later reopening never leaves less infarct in any region, nor a stronger arm or leg, nor better language or attention', (name, occlusions) => {
    const sc = SCENARIOS.find((s) => s.id === name);
    const limbs = (r: SimResult) => ['5r', '5l', '6r', '6l', '9', '11'].map((k) => r.nihss.items[k] ?? 0);
    for (const collateral of ['good', 'moderate', 'poor'] as const) {
      let prev: SimResult[] | null = null;
      let prevH: number | null = null;
      for (const reperfusionH of [...REPERFUSION_STOPS, null]) {
        const now = [2160, 4320].map((tH) =>
          simulate({ occlusions, variants: sc?.variants ?? [], collateral, map: sc?.map ?? 93, tH, reperfusionH, decompression: sc?.decompression ?? false }),
        );
        if (prev) {
          const where = `${name} ${collateral}: reopened at ${prevH} h, then ${reperfusionH ?? 'never'}`;
          for (const [k, v] of Object.entries(now[1].regions)) expect(v.infarct, `${where}: ${k}`).toBeGreaterThanOrEqual((prev[1].regions[k]?.infarct ?? 0) - 0.005);
          for (const i of [0, 1]) limbs(now[i]).forEach((x, j) => expect(x, `${where}: limb item ${j} at ${[3, 6][i]} months`).toBeGreaterThanOrEqual(limbs(prev![i])[j]));
        }
        prev = now;
        prevH = reperfusionH;
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
    const at = (x: number) => aggregateSymptoms({ postcentral_face_arm_r: x }, { postcentral_face_arm_r: 0 }, 1).map((s) => s.id);
    expect(at(0.25)).toContain('sens_face_arm');
    expect(at(0.25 - 1e-12)).toContain('sens_face_arm');
    expect(at(0.2)).not.toContain('sens_face_arm');
    // a region of compact tracts and nuclei is graded on below the threshold, down to 15 % of it
    // (Z2-8): the same rounding holds at the threshold, and the deficit is milder below it
    const pons = (x: number) => aggregateSymptoms({ pons_caudal_lateral_r: x }, { pons_caudal_lateral_r: 0 }, 1).find((s) => s.id === 'hearing_loss');
    expect(pons(0.25)?.sev).toBe(1);
    expect(pons(0.25 - 1e-12)?.sev).toBe(1);
    expect(pons(0.2)?.sev).toBe(1);
    expect(pons(0.15)).toBeUndefined();
  });
});


const comaLike = (s: { id: string; sev: number }) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness';
/** the warnings that read the symptom list agree with the list at `tH` (Y3-5, Y3-6, Y3-7, Y3-19) */
function warningsFollowList(where: string, r: SimResult, tH: number) {
  const running = (re: RegExp) => r.cascade.events.filter((e) => re.test(e.id) && e.onsetH <= tH + 1e-9 && tH < (e.endH ?? Infinity));
  const has = (f: (s: SimResult['symptoms'][number]) => boolean) => r.symptoms.some(f);
  const dysphagia = has((s) => s.id === 'dysphagia');
  const drowsy = has((s) => ['coma', 'somnolence', 'disorder_of_consciousness'].includes(s.id));
  const asp = running(/^aspiration(_\d+)?$/);
  expect(asp.length, `${where}: aspiration`).toBeLessThanOrEqual(1);
  for (const e of asp) {
    if (e.title.en.startsWith('Dysphagia')) expect(dysphagia, `${where}: ${e.title.en}`).toBe(true);
    if (e.title.en.startsWith('Reduced consciousness')) expect(!dysphagia && drowsy, `${where}: ${e.title.en}`).toBe(true);
    if (e.title.en.startsWith('Aspiration risk')) expect(dysphagia || drowsy, `${where}: ${e.title.en}`).toBe(false);
  }
  const immobile = has((s) => (s.id === 'leg_weak' && s.sev >= 2) || comaLike(s) || (s.id === 'akinetic_mutism' && s.sev >= 2));
  if (running(/^dvt(_\d+)?$/).length) expect(immobile, `${where}: venous thrombosis while mobile`).toBe(true);
  const cardiac = running(/^cardiac(_\d+)?$/);
  expect(cardiac.length, `${where}: cardiac`).toBeLessThanOrEqual(1);
  const severe = r.nihss.total >= 16 || has(comaLike);
  for (const c of cardiac) {
    const now = c.desc.en.includes('This is a severe stroke');
    if (now) expect(r.nihss.total, `${where}: "severe" at NIHSS 0`).toBeGreaterThan(0);
    if (/The stroke was severe/.test(c.desc.en)) expect(severe, `${where}: "was severe" while severe`).toBe(false);
    if (severe) expect(now, `${where}: severe (NIHSS ${r.nihss.total}) but not said`).toBe(true);
  }
  if (r.nihss.posteriorCaveat) {
    expect(r.nihss.total, `${where}: posterior caveat`).toBeLessThanOrEqual(6);
    expect(r.symptoms.length + r.unexaminable.length, `${where}: posterior caveat without a symptom`).toBeGreaterThan(0);
  }
}

describe('the warnings that read the symptom list, with each collateral grade (Y3)', () => {
  it.each(SCENARIOS.map((s) => [s.id]))('%s', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      for (const stop of TIME_STOPS) warningsFollowList(`${id} ${collateral} ${stop.h} h`, simulate(inputOf(id, { collateral, tH: stop.h })), stop.h);
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
  const EXTRA: [string, Occlusion[], CollateralGrade, (number | null)?, number?][] = [
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
    // Z1-7: the capsule spared by an early reopening, partly lost by a later one; the whole
    // lenticulostriate group reopened while the capsule is still alive
    ['mca_m1_l poor reopened 1 h', [{ vessel: 'mca_m1_l', severity: 1 }], 'poor', 1],
    ['mca_m1_l moderate reopened 4.5 h', [{ vessel: 'mca_m1_l', severity: 1 }], 'moderate', 4.5],
    ['lenticulostriate_l reopened 1 h', [{ vessel: 'lenticulostriate_l', severity: 1 }], 'good', 1],
    // Z1-15, Z1-1: the precentral branch with moderate collaterals; the superior division with good ones
    ['mca_precentral_r moderate', [{ vessel: 'mca_precentral_r', severity: 1 }], 'moderate'],
    ['mca_m2_sup_l good', [{ vessel: 'mca_m2_sup_l', severity: 1 }], 'good'],
    // Z2-8, Z2-0: a mid-basilar occlusion reopened while most of the pons is still alive, and after
    // 12 h, when both caudal tegmenta are about a quarter infarcted
    ['basilar_mid good reopened 4.5 h', [{ vessel: 'basilar_mid', severity: 1 }], 'good', 4.5],
    ['basilar_mid good reopened 12 h', [{ vessel: 'basilar_mid', severity: 1 }], 'good', 12],
    // Z3-2: a basilar occlusion before or after a swollen hemisphere's coma, and with it
    [
      'mca_m1_r, then basilar_mid at 1 month, poor',
      [
        { vessel: 'mca_m1_r', severity: 1, fromH: 0 },
        { vessel: 'basilar_mid', severity: 1, fromH: 720 },
      ],
      'poor',
    ],
    [
      'basilar_mid, then mca_m1_r at 1 month, poor',
      [
        { vessel: 'basilar_mid', severity: 1, fromH: 0 },
        { vessel: 'mca_m1_r', severity: 1, fromH: 720 },
      ],
      'poor',
    ],
    [
      'mca_m1_l, then basilar_lower at 1 month, good',
      [
        { vessel: 'mca_m1_l', severity: 1, fromH: 0 },
        { vessel: 'basilar_lower', severity: 1, fromH: 720 },
      ],
      'good',
    ],
    // Z3-4: two hemispheres infarcted outside the MCA territory; Z3-12: both MCA territories, the
    // second two days after the first
    ['both A2 poor', [{ vessel: 'aca_a2_r', severity: 1 }, { vessel: 'aca_a2_l', severity: 1 }], 'poor'],
    ['pca_p2_r + aca_a2_l poor', [{ vessel: 'pca_p2_r', severity: 1 }, { vessel: 'aca_a2_l', severity: 1 }], 'poor'],
    [
      'mca_m1_l, then mca_m1_r at 48 h, moderate',
      [
        { vessel: 'mca_m1_l', severity: 1, fromH: 0 },
        { vessel: 'mca_m1_r', severity: 1, fromH: 48 },
      ],
      'moderate',
    ],
    // Z4-11: an M1 attack of 5 minutes, and a mid-basilar occlusion reopened at 30 min before
    // anything died (locked-in for the first hours after the reopening): no infarct, a TIA
    ['mca_m1_l 5 min', [{ vessel: 'mca_m1_l', severity: 1, toH: 1 / 12 }], 'good'],
    ['basilar_mid good reopened 30 min', [{ vessel: 'basilar_mid', severity: 1 }], 'good', 0.5],
    // Z4-14: an A2 infarct that spares the paracentral lobule, and a pericallosal infarct in
    // border-zone beds (each was labelled watershed), beside the haemodynamic watershed template
    ['aca_a2_l moderate', [{ vessel: 'aca_a2_l', severity: 1 }], 'moderate'],
    ['aca_pericallosal_l good', [{ vessel: 'aca_pericallosal_l', severity: 1 }], 'good'],
    // W2-1: both carotid territories swelling together into coma; one hemisphere of about 245 mL
    // whose own swelling shifts the midline into the coma range. W2-3: a larger occlusion a week
    // after a first infarct, which becomes the index event
    ['both cervical ICAs good', [{ vessel: 'ica_cervical_r', severity: 1 }, { vessel: 'ica_cervical_l', severity: 1 }], 'good'],
    ['ica_cervical_r + aca_a1_l moderate', [{ vessel: 'ica_cervical_r', severity: 1 }, { vessel: 'aca_a1_l', severity: 1 }], 'moderate'],
    [
      'mca_m2_inf_l, then mca_m2_sup_l at 1 week, poor',
      [
        { vessel: 'mca_m2_inf_l', severity: 1, fromH: 0 },
        { vessel: 'mca_m2_sup_l', severity: 1, fromH: 168 },
      ],
      'poor',
    ],
    // W3-8: the anterior spinal artery itself; W3-9: the superior division of the right side, and a
    // tight left carotid stenosis at a low blood pressure (a haemodynamic picture of the whole territory)
    ['anterior spinal artery good', [{ vessel: 'asa', severity: 1 }], 'good'],
    ['mca_m2_sup_r good', [{ vessel: 'mca_m2_sup_r', severity: 1 }], 'good'],
    ['ica_cervical_l 90 % at MAP 60', [{ vessel: 'ica_cervical_l', severity: 0.9 }], 'good', null, 60],
    // V1-1: a larger occlusion of the other hemisphere a week after a malignant (poor) or a moderate
    // (good) right M1 infarct; V1-4: both M1 arteries, which swell alike; V1-11: a left M1 that
    // reopens by itself after 45 min, leaving an infarct
    [
      'mca_m1_r, then mca_m1_l at 1 week, poor',
      [
        { vessel: 'mca_m1_r', severity: 1, fromH: 0 },
        { vessel: 'mca_m1_l', severity: 1, fromH: 168 },
      ],
      'poor',
    ],
    [
      'mca_m1_r, then mca_m1_l at 1 week, good',
      [
        { vessel: 'mca_m1_r', severity: 1, fromH: 0 },
        { vessel: 'mca_m1_l', severity: 1, fromH: 168 },
      ],
      'good',
    ],
    ['both M1 moderate', [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1 }], 'moderate'],
    ['mca_m1_l moderate reopened by itself at 45 min', [{ vessel: 'mca_m1_l', severity: 1, toH: 0.75 }], 'moderate'],
    // V2-0: a lateral medullary infarct on the same side as a hemispheric one; V2-3: a Heubner
    // branch, and an inferior paramedian pontine branch (a quarter of the caudal basis)
    ['mca_m2_sup_r + va_v4_dist_r moderate', [{ vessel: 'mca_m2_sup_r', severity: 1 }, { vessel: 'va_v4_dist_r', severity: 1 }], 'moderate'],
    ['mca_m1_l + pica_l moderate', [{ vessel: 'mca_m1_l', severity: 1 }, { vessel: 'pica_l', severity: 1 }], 'moderate'],
    ['heubner_r lacune', [{ vessel: 'heubner_r', severity: 1, branch: true }], 'good'],
    ['pontine_paramedian_inferior_l lacune', [{ vessel: 'pontine_paramedian_inferior_l', severity: 1, branch: true }], 'good'],
    // V3-2: the right mirror of the tight carotid stenosis at a low blood pressure; V3-14: a right M1
    // reopened at 4.5 h, its neglect compensated by 3 months
    ['ica_cervical_r 90 % at MAP 60', [{ vessel: 'ica_cervical_r', severity: 0.9 }], 'good', null, 60],
    ['mca_m1_r reopened 4.5 h', [{ vessel: 'mca_m1_r', severity: 1 }], 'good', 4.5],
    // U1-0: a malignant right M1 (poor) or carotid T (good) infarct beside a smaller infarct of the
    // other hemisphere; U1-4: both M1 arteries (poor), together and the left two days later; U1-3:
    // a left A2 a week after a left M1 that herniated; U1-14: the right carotid T a week after it, and a
    // left M1 three months after a right one (good); U1-2: a left P2 a week after a left M2 infarct
    ['mca_m1_r + mca_m2_sup_l poor', [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m2_sup_l', severity: 1 }], 'poor'],
    ['ica_terminal_r + mca_m1_l good', [{ vessel: 'ica_terminal_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1 }], 'good'],
    ['both M1 poor', [{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1 }], 'poor'],
    [
      'mca_m1_r, then mca_m1_l at 48 h, poor',
      [
        { vessel: 'mca_m1_r', severity: 1, fromH: 0 },
        { vessel: 'mca_m1_l', severity: 1, fromH: 48 },
      ],
      'poor',
    ],
    [
      'mca_m1_l, then aca_a2_l at 1 week, moderate',
      [
        { vessel: 'mca_m1_l', severity: 1, fromH: 0 },
        { vessel: 'aca_a2_l', severity: 1, fromH: 168 },
      ],
      'moderate',
    ],
    [
      'mca_m1_l, then ica_terminal_r at 1 week, moderate',
      [
        { vessel: 'mca_m1_l', severity: 1, fromH: 0 },
        { vessel: 'ica_terminal_r', severity: 1, fromH: 168 },
      ],
      'moderate',
    ],
    [
      'mca_m1_r, then mca_m1_l at 3 months, good',
      [
        { vessel: 'mca_m1_r', severity: 1, fromH: 0 },
        { vessel: 'mca_m1_l', severity: 1, fromH: 2000 },
      ],
      'good',
    ],
    [
      'mca_m2_inf_l, then pca_p2_l at 1 week, moderate',
      [
        { vessel: 'mca_m2_inf_l', severity: 1, fromH: 0 },
        { vessel: 'pca_p2_l', severity: 1, fromH: 168 },
      ],
      'moderate',
    ],
  ];
  const STOPS = TIME_STOPS.map((s) => s.h);
  const memo = new Map<string, SimResult[]>();
  const series = (name: string): SimResult[] => {
    let got = memo.get(name);
    if (!got) {
      const extra = EXTRA.find((e) => e[0] === name);
      got = STOPS.map((tH) =>
        extra
          ? simulate({ occlusions: extra[1], variants: [], collateral: extra[2], map: extra[4] ?? 93, tH, reperfusionH: extra[3] ?? null, decompression: false })
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
        // U3-11: monocular vision loss and one-sided deafness, which only the patient can tell
        'amaurosis',
        'labyrinthine',
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

  // U3-7: one deficit of one side is listed once: a part of a broader deficit of the same side (the
  // shoulder of a weak arm, one modality or part of the body of an all-modality hemisensory loss,
  // the lower face of a whole-face palsy, a quadrant of a hemianopia) is not listed beside it unless
  // it is the more severe of the two, listed or not examinable
  const PARTS: [string, string][] = [
    ['arm_weak_proximal', 'arm_weak'],
    ['sens_face_arm', 'sens_hemibody'],
    ['sens_leg', 'sens_hemibody'],
    ['pain_temp_body', 'sens_hemibody'],
    ['pain_temp_face', 'sens_hemibody'],
    ['proprio_loss', 'sens_hemibody'],
    ['sens_face_all', 'sens_hemibody'],
    ['face_weak', 'face_weak_peripheral'],
    ['quadrant_sup', 'hemianopia'],
    ['quadrant_inf', 'hemianopia'],
    ['central_scotoma', 'hemianopia'],
  ];
  it.each(CASES)('%s: no part of a broader deficit of the same side is listed beside it, unless more severe (U3-7)', (name) => {
    series(name).forEach((r, i) => {
      const given = [...r.symptoms, ...r.unexaminable];
      for (const [part, whole] of PARTS)
        for (const side of ['r', 'l'] as const) {
          const p = given.find((s) => s.id === part && s.side === side);
          const w = given.find((s) => s.id === whole && s.side === side);
          if (p && w) expect(p.sev, `${name} ${STOPS[i]} h: ${part}/${side} beside ${whole}/${side}`).toBeGreaterThan(whole === 'hemianopia' ? 3 : w.sev);
        }
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
      const all = estimateNihss([...r.symptoms, ...r.unexaminable]);
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

  // Y3-5, Y3-6, Y3-7, Y3-19: the warnings that read the symptom list say only what it shows — the
  // aspiration title what is listed, the venous-thrombosis warning only for an immobile patient,
  // the cardiac warning "severe" by clinical severity (and not in the present tense at NIHSS 0),
  // the posterior-stroke caveat only with a symptom and a low NIHSS
  it.each(CASES)('%s: the aspiration, cardiac and venous-thrombosis warnings and the posterior caveat follow the list (Y3)', (name) => {
    series(name).forEach((r, i) => warningsFollowList(`${name} ${STOPS[i]} h`, r, STOPS[i]));
  });

  // Z2-8, Z2-9: the brainstem is graded by how much of it is lost, so its signs do not all switch
  // off together in one step, and the passing perilesional depression of the first days does not by
  // itself give a new limb weakness from it. A step with an occlusion starting or ending, or a
  // reopening, in between has a reason of its own.
  const fromBrainstem = (s: SimResult['symptoms'][number]) => s.sources.length > 0 && s.sources.every((src) => REGION_BY_ID[src]?.category === 'brainstem');
  const changedBetween = (r: SimResult, a: number, b: number) => r.schedule.events.some((e) => e.h > a - 1e-9 && e.h <= b + 1e-9);
  it.each(CASES)('%s: a locked-in picture does not give way to no brainstem sign at all in one step (Z2-8)', (name) => {
    const runs = series(name);
    for (let i = 1; i < runs.length; i++) {
      if (STOPS[i - 1] < 24 || changedBetween(runs[i], STOPS[i - 1], STOPS[i])) continue;
      if (!runs[i - 1].syndromes.some((m) => m.def.id.startsWith('locked_in'))) continue;
      const left = [...runs[i].symptoms, ...runs[i].unexaminable].filter((s) => s.sources.some((src) => REGION_BY_ID[src]?.category === 'brainstem'));
      expect(left.length, `${name}: ${STOPS[i - 1]} → ${STOPS[i]} h`).toBeGreaterThan(0);
    }
  });
  it.each(CASES)('%s: after the first day, no limb weakness from the brainstem alone rises by more than one grade without a new occlusion (Z2-9)', (name) => {
    const runs = series(name);
    for (let i = 1; i < runs.length; i++) {
      if (STOPS[i - 1] < 24 || changedBetween(runs[i], STOPS[i - 1], STOPS[i])) continue;
      for (const s of runs[i].symptoms.filter((x) => ['arm_weak', 'leg_weak', 'face_weak'].includes(x.id) && fromBrainstem(x))) {
        // (a part listed before as the broader deficit of the same side that took it in was there at
        // that deficit's severity: U3-7)
        const prior = runs[i - 1].symptoms;
        const before = (prior.find((x) => x.id === s.id && x.side === s.side) ?? prior.find((x) => x.id === PART_OF[s.id] && x.side === s.side))?.sev ?? 0;
        expect(s.sev - before, `${name} ${s.id} ${s.side}: ${STOPS[i - 1]} → ${STOPS[i]} h`).toBeLessThanOrEqual(1);
      }
    }
  });

  // Z3-2: the basilar "often fatal" risk is that of an unreopened basilar occlusion with a coma it
  // causes itself: never before that occlusion starts, and with a coma from the brainstem or the
  // thalamus listed when it begins
  it.each(CASES)('%s: the basilar fatal risk starts with a brainstem coma, never before the basilar artery closes (Z3-2)', (name) => {
    const r = series(name)[STOPS.length - 1];
    const e = r.cascade.events.find((x) => x.id === 'basilar_fatal');
    if (!e) return;
    const starts = r.input.occlusions.filter((x) => /^basilar_(lower|mid|upper|tip)$/.test(x.vessel) && x.severity >= 1).map((x) => x.fromH ?? 0);
    expect(starts.length, name).toBeGreaterThan(0);
    expect(e.onsetH, name).toBeGreaterThanOrEqual(Math.min(...starts));
    const then = simulate({ ...r.input, tH: e.onsetH + 0.01 });
    expect(
      then.symptoms.some((s) => ['coma', 'disorder_of_consciousness'].includes(s.id) && s.sources.some((src) => REGION_BY_ID[src]?.category === 'brainstem' || /^thalamus_/.test(src))),
      name,
    ).toBe(true);
  });

  // Z3-12: a survivor of the destruction of both hemispheres is never scored awake, and a cerebral
  // peduncle mostly infarcted (its medial part, which the oculomotor fascicles cross, included)
  // keeps the third-nerve palsy of that side
  it.each(CASES)('%s: no alert survivor of both hemispheres destroyed, and no infarcted peduncle without its third-nerve palsy (Z3-12)', (name) => {
    series(name).forEach((r, i) => {
      const where = `${name} ${STOPS[i]} h`;
      const destroyed = r.cascade.events.find((e) => e.id === 'hemispheres_destroyed');
      if (destroyed && STOPS[i] >= destroyed.onsetH - 1e-9) expect(r.nihss.items['1a'], where).toBe(3);
      for (const side of ['r', 'l'] as const) {
        if ((r.regions[`midbrain_peduncle_${side}`]?.infarct ?? 0) < 0.75) continue;
        expect([...r.symptoms, ...r.unexaminable].some((s) => s.id === 'cn3_palsy' && s.side === side), `${where} ${side}`).toBe(true);
      }
    });
  });

  // W1-4: one pupil is not wide (a third-nerve palsy) and small (a Horner syndrome) at once: the eye of
  // a third-nerve palsy shows no Horner syndrome of its own, listed or not examinable
  it.each(CASES)('%s: no third-nerve palsy and Horner syndrome on the same eye (W1-4)', (name) => {
    series(name).forEach((r, i) => {
      const all = [...r.symptoms, ...r.unexaminable];
      for (const side of ['r', 'l'] as const)
        expect(
          all.some((s) => s.id === 'cn3_palsy' && s.side === side) && all.some((s) => s.id === 'horner' && s.side === side),
          `${name} ${STOPS[i]} h ${side}`,
        ).toBe(false);
    });
  });

  // V2-10: what is shown by moving a limb (the finger–nose and heel–shin tests, a tremor of the
  // moving arm, fine finger movements) is not listed on a side whose limb is too weak to make the
  // movement, as the NIHSS leaves the ataxia of a paralysed limb unscored: it is named apart
  it.each(CASES)('%s: no limb ataxia, tremor or clumsy hand listed in a limb too weak to show it (V2-10)', (name) => {
    series(name).forEach((r, i) => {
      for (const side of ['r', 'l'] as const) {
        const pts = (id: string, scale: number[]) =>
          r.symptoms.filter((s) => s.id === id && !s.delayed && (s.side === side || s.side === 'both')).reduce((m, s) => Math.max(m, scale[s.sev - 1]), 0);
        const hand = pts('arm_weak', [1, 3, 4]);
        const arm = Math.max(hand, pts('arm_weak_proximal', [1, 2, 3]));
        const listed = (id: string) => r.symptoms.some((s) => s.id === id && s.side === side);
        const where = `${name} ${STOPS[i]} h ${side}`;
        if (arm >= 3 || pts('leg_weak', [1, 3, 4]) >= 4) expect(listed('ataxia_limb'), where).toBe(false);
        if (arm >= 3) expect(listed('tremor') || listed('holmes_tremor'), where).toBe(false);
        if (hand >= 3) expect(listed('hand_clumsy') || listed('jerky_dystonic_hand'), where).toBe(false);
        // and it is named, not lost
        for (const u of r.unexaminable.filter((x) => x.why === 'paralysed' && x.side === side))
          expect(['ataxia_limb', 'tremor', 'holmes_tremor', 'hand_clumsy', 'jerky_dystonic_hand', 'alien_hand', 'callosal_apraxia'], where).toContain(u.id);
      }
      // U3-12: nor a gait or truncal ataxia while neither leg can move against gravity (the patient
      // can neither stand nor sit unsupported); it is named apart, and only then
      const legs = (['r', 'l'] as const).map((side) =>
        r.symptoms.filter((s) => s.id === 'leg_weak' && !s.delayed && (s.side === side || s.side === 'both')).reduce((m, s) => Math.max(m, [1, 3, 4][s.sev - 1]), 0),
      );
      const where = `${name} ${STOPS[i]} h`;
      if (Math.min(...legs) >= 3) expect(r.symptoms.some((s) => s.id === 'ataxia_gait'), where).toBe(false);
      for (const u of r.unexaminable.filter((x) => x.why === 'paralysed' && x.side === null)) {
        expect(u.id, where).toBe('ataxia_gait');
        expect(Math.min(...legs), where).toBeGreaterThanOrEqual(3);
      }
    });
  });

  // T3-5: the alien hand and the callosal apraxia and agraphia of the left hand are movements of a
  // hand: neither is listed in a hand whose arm cannot move against gravity (NIHSS 5 ≥ 3); the
  // callosal signs of the left hand (the left hand working against the right, failing commands and
  // writing that the right hand performs) are told against the right hand, so not while the right
  // arm cannot move against gravity either; and the apraxia, asked for in words and in writing, not
  // beside an aphasia that leaves too little comprehension. Each is named apart then, with why
  it.each(CASES)('%s: no alien hand or callosal apraxia listed in a hand too weak to show it, nor the apraxia beside an aphasia of comprehension (T3-5)', (name) => {
    series(name).forEach((r, i) => {
      const noComprehension = r.symptoms.some((s) => ['aphasia_global', 'aphasia_wernicke', 'aphasia_mixed_tc'].includes(s.id) && s.sev >= 2 && !s.delayed);
      const handOf = (side: 'r' | 'l') =>
        r.symptoms.filter((s) => s.id === 'arm_weak' && !s.delayed && (s.side === side || s.side === 'both')).reduce((m, s) => Math.max(m, [1, 3, 4][s.sev - 1]), 0);
      for (const side of ['r', 'l'] as const) {
        // the hand the sign needs that moves least: its own, and on the left the right one too
        const hand = side === 'l' ? Math.max(handOf('l'), handOf('r')) : handOf('r');
        const where = `${name} ${STOPS[i]} h ${side}`;
        for (const id of ['alien_hand', 'callosal_apraxia']) {
          const listed = r.symptoms.some((s) => s.id === id && s.side === side);
          if (hand >= 3) expect(listed, `${where} ${id}`).toBe(false);
          if (id === 'callosal_apraxia' && noComprehension) expect(listed, `${where} ${id}`).toBe(false);
        }
        for (const u of r.unexaminable.filter((x) => ['alien_hand', 'callosal_apraxia'].includes(x.id) && x.side === side))
          expect(u.why === 'paralysed' ? hand >= 3 : u.why === 'aphasia' ? u.id === 'callosal_apraxia' && noComprehension : true, `${where} ${u.id} ${u.why}`).toBe(true);
      }
    });
  });

  // W1-7: the bottleneck is named only when both sides are substantially lost there: for each side,
  // a bottleneck region (cerebral peduncle, ventral pons) about a third infarcted or more (its
  // function lost to dead tissue, a lacune's included: W3-5)
  const BOTTLENECK = ['midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis'];
  it.each(CASES)('%s: a deficit is named a bottleneck one only with both sides about a third lost there (W1-7)', (name) => {
    series(name).forEach((r, i) => {
      if (!r.symptoms.some((s) => s.recovery?.bottleneck)) return;
      const lost = (side: 'r' | 'l') => Math.max(...BOTTLENECK.map((b) => r.regions[`${b}_${side}`]?.lost ?? 0));
      expect(Math.min(lost('r'), lost('l')), `${name} ${STOPS[i]} h`).toBeGreaterThanOrEqual(0.32);
    });
  });

  // Z3-4: the malignant-oedema text never quotes the 145 mL threshold beside a smaller volume of the
  // hemisphere it names (a side at risk only together with the other says so)
  it.each(CASES)('%s: the malignant-oedema text quotes the 145 mL threshold only beside a volume that reaches it (Z3-4)', (name) => {
    const r = series(name)[STOPS.length - 1];
    for (const e of r.cascade.events.filter((x) => x.id.startsWith('malignant_edema'))) {
      for (const m of e.desc.en.matchAll(/≈ (\d+) mL within 14 h \(> 145 mL carries high risk\)/g)) expect(Number(m[1]), `${name} ${e.id}`).toBeGreaterThanOrEqual(145);
      for (const m of e.desc.zh.matchAll(/約 (\d+) mL（> 145 mL 為惡性水腫高風險）/g)) expect(Number(m[1]), `${name} ${e.id}`).toBeGreaterThanOrEqual(145);
    }
  });

  // Z3-16: reading, writing, calculation, finger naming, verbal memory and what only the patient
  // can report are tested through language: not listed beside an aphasia that leaves too little
  // comprehension (moderate or severe global, Wernicke or mixed transcortical)
  it.each(CASES)('%s: nothing tested through language is listed beside a moderate or severe aphasia of comprehension (Z3-16)', (name) => {
    series(name).forEach((r, i) => {
      if (!r.symptoms.some((s) => ['aphasia_global', 'aphasia_wernicke', 'aphasia_mixed_tc'].includes(s.id) && s.sev >= 2 && !s.delayed)) return;
      const listed = r.symptoms
        .filter((s) => ['alexia', 'agraphia', 'acalculia', 'finger_agnosia', 'amnesia', 'diplopia', 'vertigo', 'taste_loss', 'proprio_loss', 'callosal_apraxia'].includes(s.id))
        .map((s) => s.id);
      expect(listed, `${name} ${STOPS[i]} h`).toEqual([]);
    });
  });

  // Z3-17: the consciousness items of the NIHSS agree: a stuporous patient (1a = 2), who does not
  // comprehend the questions (1b = 2), performs at most one command; severe aphasia or little speech
  // (item 9 ≥ 2) answers at most one question
  it.each(CASES)('%s: the NIHSS consciousness items agree with each other (Z3-17)', (name) => {
    series(name).forEach((r, i) => {
      const items = r.nihss.items;
      const where = `${name} ${STOPS[i]} h`;
      if ((items['1a'] ?? 0) >= 2) expect([items['1b'], (items['1c'] ?? 0) >= 1], where).toEqual([2, true]);
      if ((items['9'] ?? 0) >= 2) expect(items['1b'] ?? 0, where).toBeGreaterThanOrEqual(1);
    });
  });

  // Z4-11: nobody can tell at the bedside that a deficit will clear. While a deficit of the brain
  // or the inner ear is listed, the TIA story ("symptoms gone does not mean safe", the antiplatelet
  // advice) is not told; within a day of the occlusion's start the treatment windows are
  const TIA_STORY = ['ischemia_no_infarct', 'imaging_no_infarct', 'tia_urgent'];
  it.each(CASES)('%s: no TIA story while a deficit is listed, and the treatment windows within a day of its start (Z4-11)', (name) => {
    series(name).forEach((r, i) => {
      const tH = STOPS[i];
      const active = r.cascade.events.filter((e) => e.onsetH <= tH && tH < (e.endH ?? Infinity)).map((e) => e.id);
      const deficit = [...r.symptoms, ...r.unexaminable].some((s) => s.sources.some((src) => ['cortex', 'deep', 'brainstem', 'cerebellum', 'ear'].includes(REGION_BY_ID[src]?.category)));
      if (!deficit || !TIA_STORY.some((id) => r.cascade.events.some((e) => e.id === id))) return;
      for (const id of TIA_STORY) expect(active, `${name} ${tH} h: ${id}`).not.toContain(id);
      const since = tH - Math.max(...r.input.occlusions.map((o) => Math.max(0, o.fromH ?? 0)).filter((h) => h <= tH));
      // (until a treatment has reopened the artery: V1-11)
      const treated = r.input.reperfusionH !== null && tH >= r.input.reperfusionH && !!r.treatment && !r.treatment.failed && r.treatment.reopened.length > 0;
      if (since < 24) expect(active.filter((id) => id === 'treatment_window' || id === 'ear_stroke_workup'), `${name} ${tH} h`).toHaveLength(treated ? 0 : 1);
    });
  });

  // Z4-14: a watershed label names a border-zone infarct of haemodynamic origin, as its text says:
  // low blood pressure, or a tight stenosis or occlusion of the carotid or M1 on its side (not a
  // single distal branch whose territory happens to lie in border-zone beds)
  it.each(CASES)('%s: a watershed label only with low blood pressure or a tight carotid or M1 lesion on its side (Z4-14)', (name) => {
    series(name).forEach((r, i) => {
      for (const m of r.syndromes.filter((x) => x.def.id === 'watershed' || x.def.id === 'man_in_barrel'))
        for (const side of m.side ? [m.side] : (['r', 'l'] as const)) {
          const proximal = new RegExp(`^(aortic_arch|cca_${side}|ica_[a-z_]+_${side}|mca_m1_${side}${side === 'r' ? '|brachiocephalic' : ''})$`);
          const setting = r.input.map < 70 || r.input.occlusions.some((o) => (o.fromH ?? 0) <= STOPS[i] && o.severity >= 0.7 && proximal.test(o.vessel));
          expect(setting, `${name} ${STOPS[i]} h: ${m.def.id}/${side}`).toBe(true);
        }
    });
  });

  it.each(CASES)('%s: every active cascade event that adds a symptom has it in the symptom list', (name) => {
    series(name).forEach((r, i) => {
      const tH = STOPS[i];
      for (const e of r.cascade.events) {
        // (a herniation coma lasts while the midline shift is in the coma range, C4-F1, R6-5; a
        // level of consciousness that follows a swelling, for its own part of the event, R6-1)
        for (const s of symptomsAddedAt(e, tH, r.edema.massEffectMm)) {
          // drowsiness is listed as coma when the patient is also comatose; an aphasia is one type at
          // a time, combined from every source (the subcortical aphasia of a striatocapsular infarct
          // within the global aphasia of a cortex that is still ischaemic: Z1-7 brought such a case)
          // (Z3-12: a coma and the disorder of consciousness that follows it are one state, listed as
          // the deeper of the two)
          const ids =
            s.id === 'somnolence'
              ? ['somnolence', 'coma', 'disorder_of_consciousness']
              : s.id === 'coma' || s.id === 'disorder_of_consciousness'
                ? ['coma', 'disorder_of_consciousness']
                : [s.id];
          const aphasia = s.id.startsWith('aphasia_');
          expect(
            r.symptoms.some((x) => ids.includes(x.id) || (aphasia && x.id.startsWith('aphasia_'))),
            `${name} ${tH} h: event ${e.id} adds ${s.id}`,
          ).toBe(true);
        }
      }
    });
  });

  /**
   * W3: what is shown about the same lesion agrees with itself. Classes of contradiction: a region
   * list that holds more infarct than the final infarct above it, or none beside one (W3-5: a lacune
   * listed at 80 % of its structure; W3-8: a spinal cord infarct left out of the final infarct); an
   * infarct of the spinal cord without its own story or label (W3-8); and an MCA division label beside
   * an aphasia of the other division (W3-9).
   */
  it.each(CASES)('%s: the regions listed at the end hold no more than the final infarct, and a final infarct lists its region (W3-5, W3-8)', (name) => {
    const m6 = series(name)[STOPS.length - 1];
    const fin = m6.volumes.finalInfarct;
    const listed = finalRegions(m6);
    expect(listed.reduce((a, r) => a + r.ml, 0), name).toBeLessThanOrEqual(fin + 0.01);
    if (fin >= 0.05) expect(listed.length, name).toBeGreaterThan(0);
  });

  it.each(CASES)('%s: an infarct of the spinal cord has its own story and label (W3-8)', (name) => {
    series(name).forEach((r, i) => {
      const cord = Object.entries(r.regions).some(([rid, x]) => REGION_BY_ID[rid]?.category === 'spinal' && x.dys >= 0.25);
      if (!cord) return;
      const where = `${name} ${STOPS[i]} h`;
      expect(r.cascade.events.some((e) => e.id === 'spinal_cord_infarction'), where).toBe(true);
      expect(r.syndromes.some((m) => m.def.id === 'anterior_spinal'), where).toBe(true);
      expect(r.volumes.cord.core + r.volumes.cord.penumbra, where).toBeGreaterThan(0);
    });
  });

  // the aphasia of the superior division is a non-fluent (Broca or transcortical motor) one, that of
  // the inferior division a fluent one with impaired comprehension or repetition; a global or mixed
  // transcortical aphasia belongs to neither
  const NOT_SUPERIOR = ['aphasia_wernicke', 'aphasia_tc_sensory', 'aphasia_conduction', 'aphasia_global', 'aphasia_mixed_tc'];
  const NOT_INFERIOR = ['aphasia_broca', 'aphasia_tc_motor', 'aphasia_global', 'aphasia_mixed_tc'];
  it.each(CASES)('%s: an MCA division label never sits beside the aphasia of the other division (W3-9)', (name) => {
    series(name).forEach((r, i) => {
      const listed = r.symptoms.map((s) => s.id);
      const labels = r.syndromes.map((m) => `${m.def.id}_${m.side ?? ''}`);
      if (labels.includes('mca_superior_l')) expect(listed.filter((id) => NOT_SUPERIOR.includes(id)), `${name} ${STOPS[i]} h`).toEqual([]);
      if (labels.includes('mca_inferior_l')) expect(listed.filter((id) => NOT_INFERIOR.includes(id)), `${name} ${STOPS[i]} h`).toEqual([]);
    });
  });

  // a label names no arterial segment (W3-9: 'Complete MCA syndrome (M1)' for a carotid stenosis at
  // low blood pressure)
  it('no label names an arterial segment the case need not have occluded (W3-9)', () => {
    for (const d of SYNDROMES) {
      expect(d.name.en, d.id).not.toMatch(/\((M1|M2|A1|A2|P1|P2|V4)\)/);
      expect(d.name.zh, d.id).not.toMatch(/（(M1|M2|A1|A2|P1|P2|V4)）/);
    }
  });

  /**
   * V3: the labels and the Outcome text agree with what is shown. Classes of contradiction: a label
   * of the whole MCA territory for a haemodynamic border-zone picture of that territory (V3-2: which
   * one the circle of Willis decided, by how much of the ACA territory of that side it left
   * underperfused); an MCA division label without any of the signs it names (V3-14); and a course
   * called unsettled at the 6-month stop although nothing the Outcome shows changes by its final
   * evaluation, or not called so although something does (V3-13).
   */
  /**
   * a border-zone picture of the MCA territory (the primary pattern, as the engine reads it): of the
   * affected mL within the MCA territory and its borders at least 4 mL and 35 % in the border zones,
   * and the ACA's and the PCA's own beds affected at most half as densely as the border zones
   */
  const mcaBorderZones = (r: SimResult, side: 'r' | 'l') => {
    const mca = { border: 0, total: 0 };
    const dens = { border: [0, 0], ACA: [0, 0], PCA: [0, 0] };
    for (const b of BEDS) {
      if (!b.region.endsWith(`_${side}`) || !['cortex', 'deep', 'brainstem', 'cerebellum'].includes(REGION_BY_ID[b.region].category)) continue;
      const x = r.beds[b.id];
      const v = (x.frac.core + x.frac.penumbra + x.regaining + x.holding) * b.volume;
      const key = b.terr.length === 2 ? 'border' : b.terr[0] === 'ACA' ? 'ACA' : b.terr[0]?.startsWith('PCA') ? 'PCA' : null;
      if (key) {
        dens[key][0] += v;
        dens[key][1] += b.volume;
      }
      if (!b.terr.some((t) => t.startsWith('MCA') || t === 'LLS')) continue;
      mca.total += v;
      if (b.terr.length === 2) mca.border += v;
    }
    const d = (k: keyof typeof dens) => (dens[k][1] > 0 ? dens[k][0] / dens[k][1] : 0);
    return { ...mca, picture: mca.border >= 4 && mca.border / mca.total >= 0.35 && Math.max(d('ACA'), d('PCA')) <= 0.5 * d('border') };
  };
  it.each(CASES)('%s: no complete-MCA label for a haemodynamic border-zone picture of the MCA territory (V3-2)', (name) => {
    series(name).forEach((r, i) => {
      // (a secondary infarct overwrites the primary pattern the labels read)
      if (Object.values(r.beds).some((b) => b.effect === 'secondary')) return;
      for (const m of r.syndromes.filter((x) => x.def.id === 'mca_complete')) {
        const side = m.side!;
        if (!haemodynamicSetting(r.input.map, r.input.occlusions.filter((o) => startOf(o) <= STOPS[i]), side)) continue;
        const z = mcaBorderZones(r, side);
        expect(z.picture, `${name} ${STOPS[i]} h: ${side}, ${z.border.toFixed(1)} of ${z.total.toFixed(1)} mL in the border zones`).toBe(false);
      }
    });
  });

  // T3-9: the complete-MCA label names the picture of the whole territory, the face and arm weakness
  // and sensory loss of the other side among it: it is not shown (other than as clinically silent)
  // beside no weakness of the face, arm or leg and no hemisensory loss of that side, listed or not
  // examinable. A thrombectomy whose clot fragment blocks a downstream branch leaves the striatum and
  // that branch's cortex infarcted: four cortical areas and the striatum, with no weakness at all
  const MOTOR_SENSORY = ['face_weak', 'arm_weak', 'arm_weak_proximal', 'leg_weak', 'sens_face_arm', 'sens_hemibody'];
  const completeMcaWithSigns = (r: SimResult, where: string) => {
    for (const m of r.syndromes.filter((x) => x.def.id === 'mca_complete' && !x.silent)) {
      const body = m.side === 'r' ? 'l' : 'r';
      const signs = [...r.symptoms, ...r.unexaminable].some((s) => MOTOR_SENSORY.includes(s.id) && (s.side === body || s.side === 'both'));
      expect(signs, `${where} ${m.side}`).toBe(true);
    }
  };
  it.each(CASES)('%s: a complete-MCA label only beside a weakness or a hemisensory loss of the other side (T3-9)', (name) => {
    series(name).forEach((r, i) => completeMcaWithSigns(r, `${name} ${STOPS[i]} h`));
  });
  const FRAGMENTS = (['l', 'r'] as const).flatMap((side) => downstreamBranches(`mca_m1_${side}`).map((d) => [`mca_m1_${side}`, d] as [string, string]));
  it.each(FRAGMENTS)('%s reopened with a clot fragment in the %s: a complete-MCA label only beside a weakness or a hemisensory loss (T3-9)', (v, d) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      for (const reperfusionH of [1, 2])
        for (const tH of [6, 24, 336, 2160, 4320]) {
          const treatment: TreatmentOptions = { method: 'evt', grade: '3', reocclusionAfterH: null, distalEmbolus: d, noReflow: 0 };
          const r = simulate({ occlusions: [{ vessel: v, severity: 1 }], variants: [], collateral, map: 93, tH, reperfusionH, decompression: false, treatment });
          completeMcaWithSigns(r, `${collateral}, reopened at ${reperfusionH} h, ${tH} h`);
        }
  });

  // what each MCA division label names (its text): the superior division face and arm weakness and
  // sensory loss, gaze deviation and on the left an expressive aphasia; the inferior division on the
  // left a fluent aphasia with poor comprehension or repetition, on the right left neglect and
  // visuospatial problems, on either side often a field defect
  const DIVISION_SIGNS: Record<string, string[]> = {
    mca_superior_l: ['face_weak', 'arm_weak', 'arm_weak_proximal', 'sens_face_arm', 'gaze_deviation', 'aphasia_broca', 'aphasia_tc_motor'],
    mca_superior_r: ['face_weak', 'arm_weak', 'arm_weak_proximal', 'sens_face_arm', 'gaze_deviation'],
    mca_inferior_l: ['aphasia_wernicke', 'aphasia_conduction', 'aphasia_tc_sensory', 'hemianopia', 'quadrant_sup', 'quadrant_inf'],
    mca_inferior_r: ['neglect', 'visuospatial', 'hemianopia', 'quadrant_sup', 'quadrant_inf'],
  };
  it.each(CASES)('%s: an MCA division label is shown only beside one of the signs it names, listed or not examinable (V3-14)', (name) => {
    series(name).forEach((r, i) => {
      for (const m of r.syndromes) {
        const signs = DIVISION_SIGNS[`${m.def.id}_${m.side ?? ''}`];
        if (!signs) continue;
        const there = [...r.symptoms, ...r.unexaminable].some(
          (s) => signs.includes(s.id) && !s.delayed && s.sources.some((src) => REGION_BY_ID[src]?.side === m.side),
        );
        expect(there, `${name} ${STOPS[i]} h: ${m.def.id}_${m.side}`).toBe(true);
      }
    });
  });

  /** what the Outcome shows of the infarct and of the deficits at one time */
  const outcomeShows = (r: SimResult) => ({
    infarct: [fmtMl(r.volumes.core), ...finalRegions(r).map((x) => `${x.id}:${fmtMl(x.ml)}:${pctShare(x.infarct)}`)].join('|'),
    deficits: [
      `NIHSS ${r.nihss.total}`,
      ...r.syndromes.map((m) => `${m.def.id}_${m.side ?? ''}${m.silent ? '*' : ''}`),
      ...r.symptoms.map((x) => `${x.id}/${x.side ?? ''}:${x.sev}${x.delayed ? 'd' : ''}:${deficitGroup(x)}`),
      ...r.unexaminable.map((x) => `?${x.id}/${x.side ?? ''}:${x.sev}:${x.why}`),
    ]
      .sort()
      .join('|'),
  });
  it.each(CASES)('%s: called unsettled at the 6-month stop exactly when what the Outcome shows still changes by the final evaluation (V3-13)', (name) => {
    const m6 = series(name)[STOPS.length - 1];
    const out = finalOutcome(m6.input, { m6 });
    expect(out.lateBy, name).toBeCloseTo(Math.max(0, m6.schedule.finalH - 4320), 6);
    if (out.lateBy === 0) return expect(out.unsettled, name).toBe(false);
    const now = outcomeShows(m6);
    const end = outcomeShows(simulate({ ...m6.input, tH: out.finalH }));
    expect(out.changesAfter, name).toEqual({ infarct: now.infarct !== end.infarct, deficits: now.deficits !== end.deficits });
    expect(out.unsettled, name).toBe(now.infarct !== end.infarct || now.deficits !== end.deficits);
  });

  /**
   * V1: the swelling and the treatment course. Classes of contradiction: dead tissue coming back, or
   * an earlier infarct's swelling and herniation vanishing, when a later occlusion begins (V1-1); a
   * herniation to one side beside a midline that the swelling does not push across (V1-4); a story
   * of blood returning when nothing reopened (V1-7); and the treatment windows offered for an artery
   * that has been reopened (V1-11).
   */
  it.each(CASES)('%s: the core never shrinks, and a later occlusion leaves the earlier swelling and its herniation in place as it begins (V1-1)', (name) => {
    const rs = series(name);
    rs.forEach((r, i) => {
      if (i) expect(r.volumes.core, `${name} ${STOPS[i]} h`).toBeGreaterThanOrEqual(rs[i - 1].volumes.core - 0.5);
    });
    const { input } = rs[0];
    for (const s of [...new Set(input.occlusions.map(startOf))].filter((h) => h > 0)) {
      const before = simulate({ ...input, tH: s - 0.1 });
      const now = simulate({ ...input, tH: s });
      expect(now.volumes.core, `${name} at ${s} h`).toBeGreaterThanOrEqual(before.volumes.core - 0.5);
      expect(now.edema.massEffectMm, `${name} at ${s} h`).toBeGreaterThanOrEqual(before.edema.massEffectMm - 0.5);
      if (before.cascade.fatalRisk.includes('herniation')) expect(now.cascade.fatalRisk, `${name} at ${s} h`).toContain('herniation');
    }
  });

  it.each(CASES)('%s: a herniation to one side only where that side pushes the midline across (V1-4)', (name) => {
    const rs = series(name);
    const last = rs[rs.length - 1];
    for (const side of ['r', 'l'] as const) {
      const uncal = last.cascade.events.find((e) => e.id === `uncal_${side}`);
      if (!uncal && !last.cascade.events.some((e) => e.id === `subfalcine_${side}`)) continue;
      // (the stops, and the herniation itself, which may fall between them)
      const at = uncal ? [uncal.onsetH, uncal.onsetH + 24, ...(uncal.endH !== undefined ? [(uncal.onsetH + uncal.endH) / 2] : [])] : [];
      const shifts = [...rs, ...at.map((tH) => simulate({ ...last.input, tH }))];
      const across = Math.max(...shifts.map((r) => (r.edema.shiftFrom === side ? r.edema.midlineShiftMm : 0)));
      expect(across, `${name}: ${side}`).toBeGreaterThanOrEqual(4);
    }
  });

  it.each(CASES)('%s: a malignant oedema is told one way: not pushed across and down at once, nor at high risk while said to be malignant (V1-4)', (name) => {
    for (const e of series(name)[STOPS.length - 1].cascade.events.filter((x) => x.id.startsWith('malignant_edema_'))) {
      expect(/The swollen hemisphere pushes the midline across/.test(e.desc.en) && /push the brain down rather than across/.test(e.desc.en), `${name}: ${e.id}`).toBe(false);
      expect(/腫脹的半球把中線推向對側/.test(e.desc.zh) && /把腦往下擠而不是推向對側/.test(e.desc.zh), `${name}: ${e.id}`).toBe(false);
      if (/high risk/.test(e.title.en)) expect(e.desc.en, `${name}: ${e.id}`).not.toMatch(/is a malignant oedema/);
    }
  });

  it.each(CASES)('%s: no event tells of blood returning when nothing reopened (V1-7)', (name) => {
    const r = series(name)[STOPS.length - 1];
    const { occlusions, reperfusionH } = r.input;
    if (reperfusionH !== null || occlusions.some((o) => endOf(o) !== null && !progressed(occlusions, o))) return;
    for (const e of r.cascade.events) {
      expect(e.desc.en, `${name}: ${e.id}`).not.toMatch(/[Bb]lood returned/);
      expect(e.desc.zh, `${name}: ${e.id}`).not.toContain('血流在發作後');
    }
  });

  it.each(CASES)('%s: no treatment windows once a treatment has reopened the artery, or once an infarct\'s artery has reopened (V1-11)', (name) => {
    series(name).forEach((r, i) => {
      const tH = STOPS[i];
      const { occlusions, reperfusionH } = r.input;
      if (!occlusions.every((o) => startOf(o) === 0)) return;
      const active = r.cascade.events.filter((e) => e.onsetH <= tH && tH < (e.endH ?? Infinity)).map((e) => e.id);
      // (U2-1: a treated artery that has closed again is offered the windows again)
      const reclosed = r.treatment?.reocclusionH != null && tH >= r.treatment.reocclusionH;
      const treated = reperfusionH !== null && tH >= reperfusionH && !!r.treatment && !r.treatment.failed && r.treatment.reopened.length > 0 && !reclosed;
      const infarctOpen = r.recanalized && !r.cascade.events.some((e) => e.id === 'ischemia_no_infarct');
      if (treated || infarctOpen) expect(active, `${name} ${tH} h`).not.toContain('treatment_window');
    });
  });

  /**
   * U1: adding an occlusion and the course of the swelling. Classes of contradiction: an occlusion
   * added that leaves less infarct, in all or in any region, than either occlusion alone (U1-0: a
   * smaller swelling of the other hemisphere took a malignant infarct's herniation and its 188 mL
   * of secondary infarct away); the core falling from one stop to the next or as a later occlusion
   * begins (U1-3: tissue a herniation had killed came back as penumbra); an event of the swelling
   * course that has begun removed, retitled or ended before a later occlusion began (U1-14, U1-2);
   * and a survivor of both MCA territories mostly infarcted scored awake (U1-4). Over every
   * scenario and the cases above, and these stacked pairs: [first, second, collaterals, when the
   * second begins (h)].
   */
  describe('adding an occlusion and the swelling course (U1)', () => {
    const PAIRS: [string, string, CollateralGrade, number][] = [
      // a malignant infarct beside a smaller infarct of the other hemisphere, and two alike
      ['mca_m1_r', 'mca_m2_sup_l', 'poor', 0],
      ['ica_terminal_r', 'mca_m1_l', 'good', 0],
      ['mca_m1_r', 'mca_m1_l', 'poor', 0],
      ['mca_m1_r', 'mca_m1_l', 'good', 0],
      ['ica_cervical_r', 'ica_cervical_l', 'moderate', 0],
      ['mca_m2_sup_r', 'mca_m2_sup_l', 'poor', 0],
      ['mca_m1_r', 'pca_p2_l', 'poor', 0],
      ['ica_terminal_r', 'aca_a2_l', 'moderate', 0],
      // a later occlusion of the same hemisphere, the other one or the posterior fossa
      ['mca_m1_l', 'aca_a2_l', 'moderate', 168],
      ['mca_m1_r', 'pca_p2_r', 'moderate', 168],
      ['ica_terminal_r', 'pca_p2_r', 'moderate', 168],
      ['ica_terminal_r', 'ica_cervical_l', 'moderate', 168],
      ['mca_m1_l', 'ica_terminal_r', 'moderate', 168],
      ['mca_m1_r', 'va_v4_dist_l', 'moderate', 168],
      ['mca_m1_r', 'mca_m1_l', 'good', 2000],
      ['mca_m1_r', 'mca_m1_l', 'poor', 48],
      ['mca_m1_r', 'mca_m1_l', 'good', 168],
      ['mca_m1_r', 'mca_m1_l', 'poor', 720],
      ['mca_m2_inf_l', 'pca_p2_l', 'moderate', 168],
      ['mca_m2_inf_l', 'mca_m2_sup_l', 'moderate', 168],
      ['mca_m2_sup_r', 'mca_m1_r', 'moderate', 168],
      ['aca_a2_l', 'mca_m1_l', 'poor', 168],
      ['mca_m2_inf_l', 'mca_m1_r', 'moderate', 168],
      ['pica_r', 'sca_l', 'moderate', 168],
      ['mca_m1_l', 'mca_m2_sup_r', 'moderate', 24],
      // U3: a lateral medullary infarct beside a hemispheric one of the same side or the other, both
      // vertebral arteries, and pairs whose sensory and motor deficits overlap
      ['va_v4_dist_r', 'mca_m2_sup_r', 'moderate', 0],
      ['pica_r', 'mca_m2_sup_r', 'good', 0],
      ['pica_l', 'mca_m1_l', 'moderate', 0],
      ['va_v4_dist_r', 'ica_terminal_r', 'good', 0],
      ['va_v4_dist_r', 'mca_m2_sup_l', 'moderate', 0],
      ['va_v4_dist_r', 'va_v4_dist_l', 'good', 0],
      ['pica_l', 'pontine_paramedian_rostral_l', 'moderate', 0],
      ['thalamogeniculate_l', 'pica_l', 'good', 0],
      ['va_v4_dist_l', 'mca_m2_sup_l', 'moderate', 168],
      // T1-0: two cerebellar infarcts whose swelling overlaps, mirrored and reversed
      ['sca_l', 'pica_r', 'moderate', 168],
      ['pica_r', 'sca_l', 'moderate', 72],
      ['sca_l', 'pica_r', 'moderate', 72],
      ['pica_r', 'pica_l', 'moderate', 168],
      ['pica_l', 'pica_r', 'moderate', 168],
    ];
    const occ = (vessel: string, fromH: number): Occlusion => (fromH ? { vessel, severity: 1, fromH } : { vessel, severity: 1 });
    const inputs = new Map<string, SimInput>();
    const pairName = ([a, b, c, t]: (typeof PAIRS)[number]) => `${a} + ${b}${t ? ` at ${t} h` : ''}, ${c}`;
    for (const p of PAIRS) {
      const [a, b, c, t] = p;
      inputs.set(pairName(p), { occlusions: [occ(a, 0), occ(b, t)], variants: [], collateral: c, map: 93, tH: 0, reperfusionH: null, decompression: false });
    }
    const end = new Map<string, SimResult>();
    const endOfCase = (key: string, input: SimInput) => {
      let r = end.get(key);
      if (!r) end.set(key, (r = simulate({ ...input, tH: STOPS[STOPS.length - 1] })));
      return r;
    };
    const single = (vessel: string, c: CollateralGrade, fromH: number) =>
      endOfCase(`${vessel}@${fromH} ${c}`, { occlusions: [occ(vessel, fromH)], variants: [], collateral: c, map: 93, tH: 0, reperfusionH: null, decompression: false });

    /** the dead tissue of each hemisphere (mL) */
    const hemisphere = (r: SimResult, side: 'r' | 'l') =>
      BEDS.reduce((a, b) => (REGION_BY_ID[b.region].compartment === 'supra' && REGION_BY_ID[b.region].side === side ? a + r.beds[b.id].frac.core * b.volume : a), 0);
    // (a region's share may fall by a little: in a flow network, closing one artery can raise the
    // pressure that feeds a collateral elsewhere, and a bed that the added lesion has mostly
    // infarcted counts as its primary infarct, whose surviving rest a herniation does not kill; the
    // herniation infarcts that U1-0 took away were whole regions)
    it.each(PAIRS.map((p) => [pairName(p), p] as const))('%s: no less infarct, in all, in either hemisphere or in any region, than either occlusion alone', (name, [a, b, c, t]) => {
      const both = endOfCase(name, inputs.get(name)!);
      for (const alone of [single(a, c, 0), single(b, c, t)]) {
        const what = alone.input.occlusions[0].vessel;
        expect(both.volumes.finalInfarct, `${name}: than ${what} alone`).toBeGreaterThanOrEqual(alone.volumes.finalInfarct - 0.5);
        for (const side of ['r', 'l'] as const) expect(hemisphere(both, side), `${name}: ${side} hemisphere than ${what} alone`).toBeGreaterThanOrEqual(hemisphere(alone, side) - 2);
        for (const [rid, st] of Object.entries(alone.regions)) expect(both.regions[rid].infarct, `${name}: ${rid} than ${what} alone`).toBeGreaterThanOrEqual(st.infarct - 0.1);
      }
    });

    // U3-13: adding an occlusion never lowers the recovery of a deficit it does not cause: one whose
    // pathway its lesion does not reach (no region of the pair is a dead source of it that is not one
    // with the first occlusion alone) keeps its two-sidedness and, while its own sources are as
    // infarcted as alone, its compensation. The face weakness of a lateral medullary infarct, which
    // cuts only part of one hemisphere's fibres to that face (most cross in the pons: Kanbayashi &
    // Sonoo 2021), recovers as it would alone beside any other occlusion.
    const atMemo = new Map<string, SimResult>();
    const runAt = (occs: Occlusion[], c: CollateralGrade, tH: number) => {
      const key = `${occs.map((o) => `${o.vessel}@${startOf(o)}`).join('+')} ${c} ${tH}`;
      let r = atMemo.get(key);
      if (!r) atMemo.set(key, (r = simulate({ occlusions: occs, variants: [], collateral: c, map: 93, tH, reperfusionH: null, decompression: false })));
      return r;
    };
    const given = (r: SimResult) => [...r.symptoms, ...r.unexaminable];
    const medullary = (s: { id: string; sources: string[] }) => s.id === 'face_weak' && s.sources.length > 0 && s.sources.every((src) => REGION_BY_ID[src]?.baseId === 'medulla_lateral');
    /** the regions whose dead tissue (from the symptom threshold) serves a deficit, but for the lateral medulla's share of the facial fibres */
    const deadSources = (r: SimResult, id: string) =>
      Object.entries(r.regions)
        .filter(([rid, st]) => {
          const reg = REGION_BY_ID[rid];
          if (st.lost < 0.25 - 1e-6 || (id === 'face_weak' && reg.baseId === 'medulla_lateral')) return false;
          return reg.deficits.some((d) => d.s === id && (!d.only || reg.side === d.only) && (!d.minLevel || st.lost >= d.minLevel));
        })
        .map(([rid]) => rid);
    it.each(PAIRS.map((p) => [pairName(p), p] as const))('%s: neither occlusion lowers the recovery of a deficit it does not cause, nor of a lateral medullary face weakness (U3-13)', (name, [a, b, c, t]) => {
      const pair = [occ(a, 0), occ(b, t)];
      for (const self of pair) {
        const other = pair.find((o) => o !== self)!;
        const ownMedulla = new Set(STOPS.flatMap((tH) => given(runAt([self], c, tH)).filter(medullary).map((s) => s.side)));
        for (const tH of [720, 2160, 4320]) {
          const one = runAt([self], c, tH);
          const both = runAt(pair, c, tH);
          for (const s of given(one)) {
            const w = given(both).find((x) => x.id === s.id && x.side === s.side);
            if (!w?.recovery || !s.recovery) continue;
            // (the other occlusion causes it when its lesion is a dead source of it, alone or by what
            // the two do together: a herniation of their joint swelling)
            const before = new Set(deadSources(one, s.id));
            if (deadSources(both, s.id).some((rid) => !before.has(rid)) || deadSources(runAt([other], c, tH), s.id).length > 0) continue;
            const where = `${name} at ${tH} h: ${s.id}/${s.side} of ${self.vessel}`;
            expect(w.recovery.bilateral, where).toBe(s.recovery.bilateral);
            if (s.sources.every((src) => Math.abs((both.regions[src]?.lost ?? 0) - (one.regions[src]?.lost ?? 0)) < 0.005) && w.sources.length === s.sources.length)
              expect(w.recovery.compensated, where).toBeGreaterThanOrEqual(s.recovery.compensated - 1e-3);
          }
          for (const w of given(both).filter((x) => medullary(x) && ownMedulla.has(x.side))) {
            const where = `${name} at ${tH} h: the medullary face_weak/${w.side} of ${self.vessel}`;
            const s = given(one).find((x) => x.id === w.id && x.side === w.side);
            expect(s, `${where}, gone alone`).toBeDefined();
            expect(w.recovery?.bilateral, where).toBe(s!.recovery?.bilateral);
            expect(w.recovery?.compensated ?? 0, where).toBeGreaterThanOrEqual((s!.recovery?.compensated ?? 0) - 1e-3);
          }
        }
      }
    });

    /** the events of the swelling course: a hemisphere's oedema, its herniation and the fatal event, the cerebellar swelling */
    const SWELLING = /^(malignant_edema|mass_effect)_[rl](_\d+)?$|^(subfalcine|uncal)_[rl]$|^central_herniation$|^herniation_fatal_(r|l|central)$|^cerebellar_edema(_\d+)?$/;
    const STAGED_CASES: [string, SimInput][] = [
      ...SCENARIOS.filter((sc) => sc.occlusions.some((x) => startOf(x) > 0)).flatMap((sc) =>
        (['good', 'moderate', 'poor'] as const).map((c) => [`${sc.id} ${c}`, inputOf(sc.id, { collateral: c })] as [string, SimInput]),
      ),
      ...EXTRA.filter((e) => e[1].some((x) => startOf(x) > 0)).map(
        ([n, o, c, rh, map]) => [n, { occlusions: o, variants: [], collateral: c, map: map ?? 93, tH: 0, reperfusionH: rh ?? null, decompression: false }] as [string, SimInput],
      ),
      ...[...inputs].filter(([, i]) => i.occlusions.some((x) => startOf(x) > 0)),
    ];
    it.each(STAGED_CASES)('%s: as a later occlusion begins, the core does not fall and the swelling course begun stays: not removed, retitled or ended before then', (name, input) => {
      for (const s of [...new Set(input.occlusions.map(startOf))].filter((h) => h > 0)) {
        const before = simulate({ ...input, tH: s - 0.01 });
        const now = simulate({ ...input, tH: s });
        expect(now.volumes.core, `${name} at ${s} h`).toBeGreaterThanOrEqual(before.volumes.core - 0.5);
        for (const e of before.cascade.events.filter((x) => SWELLING.test(x.id) && x.onsetH < s - 1e-9)) {
          const where = `${name} at ${s} h: ${e.id}`;
          const kept = now.cascade.events.find((x) => x.id === e.id);
          expect(kept, where).toBeDefined();
          expect(kept!.title, where).toEqual(e.title);
          expect(kept!.onsetH, where).toBeCloseTo(e.onsetH, 6);
          expect(kept!.endH ?? Infinity, where).toBeGreaterThanOrEqual(Math.min(e.endH ?? Infinity, s) - 1e-6);
        }
      }
    });

    it.each([...inputs])('%s: the core never shrinks from one stop to the next', (name, input) => {
      let prev = 0;
      for (const tH of STOPS) {
        const core = simulate({ ...input, tH }).volumes.core;
        expect(core, `${name} ${tH} h`).toBeGreaterThanOrEqual(prev - 0.5);
        prev = core;
      }
    });

    /** the share of a hemisphere's MCA territory (its cortical branches and the lenticulostriate arteries) that is dead */
    const mcaDead = (r: SimResult, side: 'r' | 'l') => {
      let all = 0;
      let dead = 0;
      for (const b of BEDS) {
        const reg = REGION_BY_ID[b.region];
        if (reg.compartment !== 'supra' || reg.side !== side) continue;
        const mca = b.supply.reduce((a, x) => a + (/^(mca_|lenticulostriate_)/.test(x.v) ? x.share : 0), 0);
        all += mca * b.volume;
        dead += mca * r.beds[b.id].frac.core * b.volume;
      }
      return dead / (all || 1);
    };
    it.each([...CASES.map(([n]) => [n, null] as [string, SimInput | null]), ...inputs])(
      '%s: both MCA territories mostly infarcted end in a disorder of consciousness, scored as unresponsive',
      (name, input) => {
        const r = input ? endOfCase(name, input) : series(name)[STOPS.length - 1];
        if (mcaDead(r, 'r') < 0.67 || mcaDead(r, 'l') < 0.67) return;
        expect(r.symptoms.find((x) => x.id === 'disorder_of_consciousness')?.sev, name).toBe(3);
        expect(r.nihss.items['1a'], name).toBe(3);
        expect(r.cascade.survivalCaveat, name).toContain('bilateral_hemispheres');
      },
    );

    /**
     * T1: the posterior fossa's staged swelling and the herniation texts. Classes of contradiction:
     * the order in which two cerebellar infarcts whose swelling overlaps began deciding whether, or
     * when, their swelling is malignant, or a malignant course told before the infarcts that make it
     * malignant began (T1-0: malignant with coma in one order, an alert patient in the other); a peak
     * midline shift a text quotes that the Now tab exceeds (T1-1: "at most about 7.5 mm" beside a
     * shown 9.35 mm, across the 8 mm coma band); and a time a text gives on a clock other than the
     * one it names, or before that clock began (T1-3: "about -441 h after onset"; T1-12: a right
     * herniation's end moved by when the left artery closed).
     */
    const CEREBELLAR: [string, string][] = [
      ['pica_r', 'sca_l'],
      ['pica_r', 'pica_l'],
      ['sca_r', 'pica_l'],
      ['aica_r', 'pica_l'],
      ['sca_r', 'sca_l'],
    ];
    const compression = (r: SimResult) => r.cascade.events.find((e) => e.id === 'brainstem_compression')?.onsetH ?? null;
    it.each(CEREBELLAR.flatMap(([a, b]) => [72, 168].flatMap((t) => (['moderate', 'poor'] as const).map((c) => [`${a} + ${b}, ${t} h apart, ${c}`, a, b, t, c] as const))))(
      '%s: the order does not decide whether or when their swelling is malignant, nor is it malignant before the infarcts that make it so began (T1-0)',
      (name, a, b, t, c) => {
        const ab = endOfCase(`T1 ${a}+${b}@${t} ${c}`, { occlusions: [occ(a, 0), occ(b, t)], variants: [], collateral: c, map: 93, tH: 0, reperfusionH: null, decompression: false });
        const ba = endOfCase(`T1 ${b}+${a}@${t} ${c}`, { occlusions: [occ(b, 0), occ(a, t)], variants: [], collateral: c, map: 93, tH: 0, reperfusionH: null, decompression: false });
        expect(ab.cascade.fatalRisk.includes('posterior_fossa'), name).toBe(ba.cascade.fatalRisk.includes('posterior_fossa'));
        expect(compression(ab), name).toBe(compression(ba));
        for (const [first, pair] of [[a, ab], [b, ba]] as const) {
          const alone = compression(single(first, c, 0));
          const now = compression(pair);
          if (alone === null && now !== null) expect(now, `${name}: ${first} first`).toBeGreaterThanOrEqual(t + 48 - 1e-6);
        }
      },
    );

    /** every case whose texts describe the midline shift of two hemispheres swelling together */
    const BILATERAL_NOTE = /at most about [\d.]+ mm|so the midline moves little/;
    const quoting = () =>
      [...CASES.map(([n]) => [n, series(n)[STOPS.length - 1].input] as [string, SimInput]), ...inputs].filter(([n, i]) =>
        (inputs.has(n) ? endOfCase(n, i) : series(n)[STOPS.length - 1]).cascade.events.some((e) => BILATERAL_NOTE.test(e.desc.en)),
      );
    it('the cases that tell how far two hemispheres push the midline across are there to check (T1-1)', () => {
      expect(quoting().filter(([n]) => /at most about/.test((inputs.has(n) ? endOfCase(n, inputs.get(n)!) : series(n)[STOPS.length - 1]).cascade.events.map((e) => e.desc.en).join())).length).toBeGreaterThanOrEqual(3);
    });
    it.each(quoting())('%s: how far two hemispheres swelling together push the midline across, as a text tells it, is what the Now tab shows (T1-1)', (name, input) => {
      const r = inputs.has(name) ? endOfCase(name, input) : series(name)[STOPS.length - 1];
      const starts = input.occlusions.map(startOf);
      // (the largest shift shown at all, and once both lesions have begun, which the text is about:
      // before the later occlusion begins the Now tab shows the case as it stood then)
      let shown = 0;
      let both = 0;
      for (let tH = Math.min(...starts) + 12; tH <= Math.max(...starts) + 400; tH += 3) {
        const x = simulate({ ...input, tH }).edema.midlineShiftMm;
        shown = Math.max(shown, x);
        if (tH >= Math.max(...starts)) both = Math.max(both, x);
      }
      for (const e of r.cascade.events.filter((x) => BILATERAL_NOTE.test(x.desc.en))) {
        const where = `${name}: ${e.id}, the Now tab shows up to ${shown.toFixed(2)} mm (${both.toFixed(2)} mm once both have begun)`;
        if (/so the midline moves little/.test(e.desc.en)) {
          expect(e.desc.zh, where).toContain('中線移動不多');
          expect(both, where).toBeLessThan(4.2);
          continue;
        }
        const x = +/at most about ([\d.]+) mm/.exec(e.desc.en)![1];
        expect(+/這裡最多約 ([\d.]+) mm/.exec(e.desc.zh)![1], where).toBe(x);
        expect(x, where).toBeGreaterThanOrEqual(both - 0.2);
        expect(x, where).toBeLessThanOrEqual(shown + 0.2);
      }
    });

    /**
     * the time (on the simulation clock) a herniation text's "(here about N h after …)" counts from:
     * the index onset ("onset"), the herniating hemisphere's infarct, or the cerebellar infarct whose
     * malignant swelling it tells
     */
    const clockOf = (r: SimResult, id: string, clock: string): number | null => {
      if (clock === 'onset' || clock === '發病') return r.schedule.onsetH;
      if (clock === "this hemisphere's infarct began" || clock === '這一側梗塞開始') {
        const swelling = r.cascade.events.filter((e) => e.id.startsWith(`malignant_edema_${id.slice(-1)}`));
        return swelling.length ? Math.max(...swelling.map((e) => e.onsetH)) - 24 : null;
      }
      if (/cerebellar infarct began$|小腦梗塞開始$/.test(clock)) {
        const swelling = r.cascade.events.filter((e) => /^cerebellar_edema/.test(e.id) && e.severity === 'danger');
        return swelling.length ? Math.max(...swelling.map((e) => e.onsetH)) - 24 : null;
      }
      return null;
    };
    const TOLD_END = /^(uncal_[rl]|central_herniation|posterior_fossa_fatal)$/;
    it.each([...CASES.map(([n]) => [n, null] as [string, SimInput | null]), ...inputs])(
      '%s: a herniation text gives its end on the clock it names, never before that clock began (T1-3, T1-12)',
      (name, input) => {
        const r = input ? endOfCase(name, input) : series(name)[STOPS.length - 1];
        for (const e of r.cascade.events) {
          for (const text of [e.desc.en, e.desc.zh]) {
            expect(text, `${name}: ${e.id}`).not.toMatch(/-\d+(\.\d+)?(–\d+)? h after|後 -\d|約 -\d/);
          }
          if (!TOLD_END.test(e.id) || e.endH === undefined) continue;
          const en = /\(here about (\d+) h after ([^)]*)\)/.exec(e.desc.en);
          const zh = /（這裡約在(.*?)後 (\d+) 小時）/.exec(e.desc.zh);
          if (!en) continue;
          const where = `${name}: ${e.id} "${en[0]}"`;
          expect(zh, where).not.toBeNull();
          expect(+zh![2], where).toBe(+en[1]);
          const clock = clockOf(r, e.id, en[2]);
          expect(clock, where).not.toBeNull();
          expect(clockOf(r, e.id, zh![1]), where).toBe(clock);
          expect(Math.abs(+en[1] - (e.endH - clock!)), where).toBeLessThanOrEqual(0.5 + 1e-6);
        }
        // (the coma of a malignant cerebellar swelling, on the clock its text names)
        const bc = r.cascade.events.find((e) => e.id === 'brainstem_compression');
        const fatal = r.cascade.events.find((e) => e.id === 'posterior_fossa_fatal');
        if (bc && fatal) {
          const m = /\(here about (\d+)–(\d+) h after ([^)]*)\)/.exec(bc.desc.en)!;
          const clock = clockOf(r, bc.id, m[3])!;
          expect(Math.abs(+m[1] - (fatal.onsetH - clock)), `${name}: ${m[0]}`).toBeLessThanOrEqual(0.5 + 1e-6);
          expect(Math.abs(+m[2] - (fatal.endH! - clock)), `${name}: ${m[0]}`).toBeLessThanOrEqual(0.5 + 1e-6);
        }
      },
    );
  });

  /**
   * W2: the swelling and the timing of tissue loss. Classes of contradiction: an occlusion that has
   * not begun yet changing what is shown (W2-3); a coma from the swelling without the malignant
   * course and its herniation risk (W2-1); one branch of a perforator bundle leaving more infarct in
   * a structure than the whole bundle closed for as long (W2-2); and, two days into a lesion, more
   * penumbra than the course will still lose (W2-10).
   */
  /**
   * U2: the treatment and reopening texts. Classes of contradiction: no treatment windows while a
   * treated artery is closed again within the first day (U2-1); the circle of Willis said to help
   * where it carries no blood beyond an occlusion, differently on the two sides, or through an
   * artery that is absent (U2-5); an event decided by the final infarct told before the course has
   * decided it, beside signs it contradicts (U2-6); a treatment that reopens nothing summarised as a
   * reopening (U2-8); eTICI 3 beside a branch the treatment blocked (U2-9); an artery that reopens by
   * itself, leaving an infarct, without a word (U2-10); and the events of a treatment or reopening
   * that have begun removed, retitled or ended before a later occlusion began.
   */
  describe('the treatment and reopening texts (U2)', () => {
    const TXD = (method: 'evt' | 'ivt' | 'bridging', over: Partial<TreatmentOptions> = {}): TreatmentOptions => ({ method, grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0, ...over });
    const run = (occlusions: Occlusion[], collateral: CollateralGrade, over: Partial<SimInput> = {}): SimInput => ({
      occlusions,
      variants: [],
      collateral,
      map: 93,
      tH: 0,
      reperfusionH: null,
      decompression: false,
      ...over,
    });
    const activeAt = (r: SimResult, tH: number) => r.cascade.events.filter((e) => e.onsetH <= tH && tH < (e.endH ?? Infinity));

    // (a reopened artery that closes again: by IV thrombolysis, thrombectomy and both, early and late)
    const REOCCLUDED: [string, SimInput][] = [];
    for (const v of ['mca_m1_l', 'mca_m1_r', 'ica_terminal_l', 'basilar_mid', 'mca_m2_sup_r'])
      for (const c of ['good', 'moderate', 'poor'] as const)
        for (const [m, at, after] of [['ivt', 2, 2], ['evt', 4.5, 6], ['bridging', 1, 12], ['ivt', 12, 4]] as const)
          REOCCLUDED.push([`${v} ${c} ${m} at ${at} h, closed again ${after} h later`, run([{ vessel: v, severity: 1 }], c, { reperfusionH: at, treatment: TXD(m, { reocclusionAfterH: after }) })]);
    it.each(REOCCLUDED)('%s: the treatment windows are offered again while it is closed within the first day, and not while it is open', (name, input) => {
      for (const tH of STOPS) {
        const r = simulate({ ...input, tH });
        const windows = activeAt(r, tH).some((e) => e.id === 'treatment_window');
        const reclosed = r.treatment!.reocclusionH !== null && tH >= r.treatment!.reocclusionH;
        if (tH >= input.reperfusionH! && !reclosed) expect(windows, `${name} ${tH} h: open`).toBe(false);
        if (reclosed && tH < 24) expect(windows, `${name} ${tH} h: closed again`).toBe(true);
        if (tH >= 24) expect(windows, `${name} ${tH} h`).toBe(false);
      }
    });

    // every occludable artery alone, and with the communicating arteries absent
    const OCCLUDABLE = VESSELS.filter((v) => isOccludable(v.id));
    const willis = (r: SimResult) => r.cascade.events.find((e) => e.id === 'willis_compensation');
    /** beyond the circle: the MCA, the ACA beyond the anterior communicating artery and the PCA beyond the posterior one */
    const BEYOND = (v: (typeof OCCLUDABLE)[number]) => v.family === 'MCA' || /^aca_(a2|pericallosal|callosomarginal|frontopolar|paracentral)/.test(v.id) || /^pca_(p2|calcarine|parieto|temporal|ant_temporal|post_temporal)/.test(v.id);
    it.each((['good', 'poor'] as const).map((c) => [c]))('every artery alone, %s collaterals: no circle collaterals beyond the circle, the same on both sides, and the help told as it is', (c) => {
      const seen = new Map<string, boolean>();
      for (const v of OCCLUDABLE) {
        const r = simulate(run([{ vessel: v.id, severity: 1 }], c, { tH: 24 }));
        const e = willis(r);
        seen.set(v.id, !!e);
        if (BEYOND(v)) expect(e, `${v.id} ${c}`).toBeUndefined();
        if (!e) continue;
        // a green "it helps" only when nothing infarcts, and the shortfall in both languages
        const short = /not enough/.test(e.desc.en);
        expect(/還不夠/.test(e.desc.zh), `${v.id} ${c}`).toBe(short);
        expect(e.severity === 'good', `${v.id} ${c}`).toBe(!short);
        if (!short) expect(r.volumes.finalInfarct, `${v.id} ${c}`).toBeLessThan(1);
      }
      for (const v of OCCLUDABLE) {
        const mirror = v.side === 'l' ? v.id.replace(/_l$/, '_r') : null;
        if (mirror && seen.has(mirror)) expect(seen.get(v.id), `${v.id} vs ${mirror} ${c}`).toBe(seen.get(mirror));
      }
    });
    it.each([['acomm_absent'], ['pcomm_absent_r'], ['acomm_absent+pcomm_absent_r']])('with %s: no route named through an absent artery', (vs) => {
      const variants = vs.split('+');
      for (const v of ['ica_cervical_r', 'ica_terminal_r', 'aca_a1_r', 'pca_p1_r', 'cca_r', 'basilar_mid'])
        for (const c of ['good', 'poor'] as const) {
          const e = willis(simulate(run([{ vessel: v, severity: 1 }], c, { tH: 24, variants })));
          if (!e) continue;
          if (variants.includes('acomm_absent')) expect(e.desc.en, `${v} ${c}`).not.toContain('anterior communicating');
          if (variants.includes('pcomm_absent_r') && v.endsWith('_r') && !v.startsWith('basilar')) expect(e.desc.en, `${v} ${c}`).not.toContain('posterior communicating');
        }
    });

    // the cortical signs of a striatocapsular infarct never beside the cortex still out of action
    // (U2-6), over every case above and the M1 and lenticulostriate occlusions reopened early
    const EARLY: [string, SimInput][] = [];
    for (const v of ['mca_m1_l', 'mca_m1_r', 'lenticulostriate_l', 'lenticulostriate_r'])
      for (const c of ['good', 'moderate', 'poor'] as const) {
        for (const toH of [0.5, 1, 2]) EARLY.push([`${v} ${c} reopening by itself at ${toH} h`, run([{ vessel: v, severity: 1, toH }], c)]);
        for (const [m, at] of [['ivt', 1], ['evt', 0.5], ['evt', 1], ['ivt', 2]] as const) EARLY.push([`${v} ${c} ${m} at ${at} h`, run([{ vessel: v, severity: 1 }], c, { reperfusionH: at, treatment: TXD(m) })]);
      }
    it.each([...CASES.map(([n]) => [n, null] as [string, SimInput | null]), ...EARLY])(
      '%s: the cortical signs of a striatocapsular infarct only once blood is back in a cortex that was ischaemic, and beside the complete MCA syndrome or a global aphasia only as the cortex regains its function',
      (name, input) => {
        STOPS.forEach((tH, i) => {
          const r = input ? simulate({ ...input, tH }) : series(name)[i];
          for (const e of activeAt(r, tH).filter((x) => x.id.startsWith('striatocapsular_cortical_'))) {
            const side = e.id.slice(-1);
            const whole = r.symptoms.some((x) => x.id === 'aphasia_global') || r.syndromes.some((m) => m.def.id === 'mca_complete' && m.side === side);
            if (!whole) continue;
            expect(r.recanalized, `${name} ${tH} h`).toBe(true);
            expect(e.desc.en, `${name} ${tH} h`).toMatch(/regains its function/);
            expect(e.desc.zh, `${name} ${tH} h`).toContain('逐漸恢復功能');
          }
        });
      },
    );

    // what the summary line says the treatment did, over every scenario and treatment (U2-8)
    const TREATED: [string, SimInput][] = [];
    for (const sc of SCENARIOS)
      for (const [m, at] of [['ivt', 1], ['evt', 4.5], ['ivt', 12]] as const) TREATED.push([`${sc.id} ${m} at ${at} h`, inputOf(sc.id, { reperfusionH: at, treatment: TXD(m) })]);
    for (const v of ['lenticulostriate_l', 'pontine_paramedian_caudal_r', 'thalamogeniculate_r'])
      TREATED.push([`${v} lacune ivt at 2 h`, run([{ vessel: v, severity: 1, branch: true }], 'good', { reperfusionH: 2, treatment: TXD('ivt') })]);
    TREATED.push(['basilar_mid 70 % ivt at 2 h', run([{ vessel: 'basilar_mid', severity: 0.7 }], 'good', { reperfusionH: 2, treatment: TXD('ivt') })]);
    it.each(TREATED)('%s: told as reopened, with an eTICI grade, only when the treatment reopens something; and told as saving tissue only then', (name, input) => {
      const r = simulate({ ...input, tH: 4320 });
      const reopens = !!r.treatment && r.treatment.reopened.length > 0;
      const state = { occlusions: input.occlusions, reperfusionH: input.reperfusionH, treatment: input.treatment ?? DEFAULT_TREATMENT, decompression: input.decompression };
      const en = treatmentLine(state, 'en', true);
      const zh = treatmentLine(state, 'zh-TW', true);
      expect(en.startsWith('reopened at'), `${name}: ${en}`).toBe(reopens && !r.treatment!.failed);
      if (!reopens) {
        expect(en, name).not.toContain('eTICI');
        expect(zh, name).not.toContain('eTICI');
        expect(zh, name).not.toContain('再通');
      }
      expect(finalOutcome(input).untreated === null, name).toBe(!reopens);
    });

    // eTICI 3 never beside a branch the treatment's clot fragment blocks downstream (U2-9)
    it.each(['mca_m1_l', 'mca_m1_r', 'ica_terminal_r', 'basilar_mid', 'mca_m2_sup_l'].map((v) => [v]))('%s: thrombectomy with each downstream distal embolus is never "eTICI 3"', (v) => {
      for (const d of downstreamBranches(v).slice(0, 8))
        for (const g of ['3', '2c'] as const) {
          const r = simulate(run([{ vessel: v, severity: 1 }], 'moderate', { tH: 24, reperfusionH: 2, treatment: TXD('evt', { grade: g, distalEmbolus: d }) }));
          const e = r.cascade.events.find((x) => x.id === 'reperfusion')!;
          expect(e.title.en, `${v} → ${d} ${g}`).not.toMatch(/eTICI 3$/);
          expect(e.desc.en, `${v} → ${d} ${g}`).not.toMatch(/complete reperfusion\./);
        }
    });

    // an artery that reopens by itself, leaving an infarct, is told then (U2-10)
    const SELF: [string, SimInput][] = [];
    for (const v of OCCLUDABLE.filter((x) => x.family === 'MCA' || x.family === 'BA' || x.family === 'PCA' || x.family === 'ACA' || x.family === 'ICA').map((x) => x.id))
      SELF.push([`${v} reopening by itself at 2 h`, run([{ vessel: v, severity: 1, toH: 2 }], 'good')]);
    for (const v of ['mca_m1_l', 'basilar_mid', 'pca_p2_r']) for (const toH of [0.5, 6, 30]) SELF.push([`${v} reopening by itself at ${toH} h, poor`, run([{ vessel: v, severity: 1, toH }], 'poor')]);
    it.each(SELF)('%s: an event at the reopening when it leaves an infarct, saying no treatment was given', (name, input) => {
      const r = simulate({ ...input, tH: 4320 });
      const toH = endOf(input.occlusions[0])!;
      const e = r.cascade.events.find((x) => x.id === 'spontaneous_recanalisation');
      // (a reopening that leaves no infarct is told as a TIA; and a tiny infarct that the case tells
      // no story of, from tissue that was hardly ischaemic, has none to add it to)
      if (r.volumes.finalInfarct < 0.05 || !r.cascade.events.some((x) => x.id === 'ischemic_cascade')) {
        expect(e, name).toBeUndefined();
        return;
      }
      expect(e, name).toBeDefined();
      expect(e!.onsetH, name).toBeCloseTo(toH, 6);
      expect(e!.desc.en, name).toMatch(/without any treatment/);
      expect(e!.desc.zh, name).toContain('沒有任何治療');
    });

    // the events of a treatment or a reopening, once begun, stay as a later occlusion begins
    const STORY = /^(treatment_window|reperfusion|reocclusion|distal_embolus|spontaneous_recanalisation|willis_compensation|striatocapsular_cortical_[rl])$/;
    const LATER: [string, SimInput][] = [
      ['mca_m1_r reopening by itself at 2 h, then mca_m1_l at 1 week, poor', run([{ vessel: 'mca_m1_r', severity: 1, toH: 2 }, { vessel: 'mca_m1_l', severity: 1, fromH: 168 }], 'poor')],
      ['mca_m1_r thrombectomy at 2 h, then mca_m1_l at 1 week, poor', run([{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 168 }], 'poor', { reperfusionH: 2, treatment: TXD('evt') })],
      ['mca_m1_r IV thrombolysis at 2 h closed again 2 h later, then mca_m1_l at 12 h, poor', run([{ vessel: 'mca_m1_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 12 }], 'poor', { reperfusionH: 2, treatment: TXD('ivt', { reocclusionAfterH: 2 }) })],
      ['mca_m1_l reopening by itself at 2 h, then mca_m2_sup_r at 24 h, moderate', run([{ vessel: 'mca_m1_l', severity: 1, toH: 2 }, { vessel: 'mca_m2_sup_r', severity: 1, fromH: 24 }], 'moderate')],
      ['mca_m1_l reopening by itself at 30 min, then basilar_mid at 6 h, moderate', run([{ vessel: 'mca_m1_l', severity: 1, toH: 0.5 }, { vessel: 'basilar_mid', severity: 1, fromH: 6 }], 'moderate')],
      ['ica_cervical_r, then mca_m1_l at 1 week, good', run([{ vessel: 'ica_cervical_r', severity: 1 }, { vessel: 'mca_m1_l', severity: 1, fromH: 168 }], 'good')],
      ['mca_m1_l thrombectomy at 2 h with a distal embolus, then pca_p2_r at 48 h, moderate', run([{ vessel: 'mca_m1_l', severity: 1 }, { vessel: 'pca_p2_r', severity: 1, fromH: 48 }], 'moderate', { reperfusionH: 2, treatment: TXD('evt', { distalEmbolus: 'mca_m2_inf_l' }) })],
    ];
    const STAGED: [string, SimInput][] = [
      ...SCENARIOS.filter((sc) => sc.occlusions.some((x) => startOf(x) > 0)).map((sc) => [sc.id, inputOf(sc.id, { tH: 0 })] as [string, SimInput]),
      ...EXTRA.filter((e) => e[1].some((x) => startOf(x) > 0)).map(([n, occ, c, rh, map]) => [n, run(occ, c, { reperfusionH: rh ?? null, map: map ?? 93 })] as [string, SimInput]),
      ...LATER,
    ];
    it.each(STAGED)('%s: the treatment and reopening events begun stay as a later occlusion begins: not removed, retitled or ended before then', (name, input) => {
      for (const s of [...new Set(input.occlusions.map(startOf))].filter((h) => h > 0)) {
        const before = simulate({ ...input, tH: s - 0.01 });
        const now = simulate({ ...input, tH: s });
        for (const e of before.cascade.events.filter((x) => STORY.test(x.id) && x.onsetH < s - 1e-9)) {
          const where = `${name} at ${s} h: ${e.id} from ${e.onsetH} h`;
          const kept = now.cascade.events.find((x) => x.id === e.id && Math.abs(x.onsetH - e.onsetH) < 1e-6);
          expect(kept, where).toBeDefined();
          expect(kept!.title, where).toEqual(e.title);
          expect(kept!.endH ?? Infinity, where).toBeGreaterThanOrEqual(Math.min(e.endH ?? Infinity, s) - 1e-6);
        }
      }
    });
  });

  describe('the swelling and the timing of tissue loss (W2)', () => {
    const STOPS = TIME_STOPS.map((s) => s.h);
    const base = (occlusions: Occlusion[], collateral: CollateralGrade, reperfusionH: number | null = null): SimInput => ({
      occlusions,
      variants: [],
      collateral,
      map: 93,
      tH: 0,
      reperfusionH,
      decompression: false,
    });
    /** the schedule as it stands at `tH`: what has begun, a phase that becomes a worse one later lasting */
    const soFar = (occlusions: Occlusion[], tH: number): Occlusion[] =>
      occlusions
        .filter((o) => startOf(o) <= tH)
        .map((o) => {
          const next = successorOf(occlusions, o);
          return next && startOf(next) > tH && progressed(occlusions, o) ? { ...o, toH: null } : o;
        });
    /** everything a result says about the displayed time and before, and its forecast */
    const shown = (r: SimResult) => ({
      symptoms: r.symptoms,
      unexaminable: r.unexaminable,
      nihss: r.nihss,
      syndromes: r.syndromes.map((m) => `${m.def.id}_${m.side ?? ''}${m.silent ? '*' : ''}`),
      regions: r.regions,
      volumes: r.volumes,
      edema: r.edema,
      recovery: r.recovery,
      onsetH: r.schedule.onsetH,
      events: r.cascade.events.map((e) => ({ id: e.id, onsetH: e.onsetH, endH: e.endH, title: e.title, desc: e.desc })),
      fatal: r.cascade.fatalRisk,
      caveats: r.cascade.survivalCaveat,
    });

    const STAGED: [string, SimInput][] = [
      ...SCENARIOS.filter((s) => s.occlusions.some((o) => startOf(o) > 0)).flatMap((s) =>
        (['good', 'poor'] as const).map((c) => [`${s.id} ${c}`, inputOf(s.id, { collateral: c })] as [string, SimInput]),
      ),
      ...EXTRA.filter((e) => e[1].some((o) => startOf(o) > 0)).map(([name, occ, c, r]) => [name, base(occ, c, r ?? null)] as [string, SimInput]),
      ['left M1, then the right P2 at 3 days', base([{ vessel: 'mca_m1_l', severity: 1 }, { vessel: 'pca_p2_r', severity: 1, fromH: 72 }], 'good')],
      ['left M1, then the left PICA at 1 week', base([{ vessel: 'mca_m1_l', severity: 1 }, { vessel: 'pica_l', severity: 1, fromH: 168 }], 'good')],
      ['left M1 reopened at 4.5 h, then the right M1 at 2 days', base([{ vessel: 'mca_m1_l', severity: 1 }, { vessel: 'mca_m1_r', severity: 1, fromH: 48 }], 'moderate', 4.5)],
    ];
    it.each(STAGED)('%s: an occlusion that has not begun changes nothing at the displayed time', (_name, input) => {
      for (const tH of STOPS) {
        const known = soFar(input.occlusions, tH);
        if (known.length === input.occlusions.length && known.every((o, i) => o === input.occlusions[i])) continue;
        expect(shown(simulate({ ...input, tH })), `${tH} h`).toEqual(shown(simulate({ ...input, occlusions: known, tH })));
      }
    });

    // a coma from the swelling (the mass effect alone in the coma range) is the malignant course
    // with its herniation risk, whatever the size of the infarct
    it.each(CASES)('%s: a coma from the swelling comes with the malignant course and its herniation risk', (name) => {
      series(name).forEach((r, i) => {
        if (r.input.decompression || (consciousnessFromShift(r.edema.massEffectMm)?.sev ?? 0) < 3) return;
        expect(r.cascade.events.some((e) => /^malignant_edema_[rl]$/.test(e.id)), `${name} ${STOPS[i]} h`).toBe(true);
        expect(r.cascade.fatalRisk, `${name} ${STOPS[i]} h`).toContain('herniation');
      });
    });

    // a branch feeds part of its bundle's territory: closed for as long, it never leaves more infarct
    // in its structure than the whole bundle
    const BUNDLES = VESSELS.filter((v) => v.id.endsWith('_l') && LACUNE_SITES[v.baseId] && isOccludable(v.id));
    it.each(BUNDLES.map((v) => [v.id]))('%s: one branch never leaves more infarct in its structure than the whole bundle closed for as long', (vessel) => {
      const v = VESSELS.find((x) => x.id === vessel)!;
      for (const site of LACUNE_SITES[v.baseId])
        for (const collateral of ['good', 'poor'] as const)
          for (const toH of [0.5, 2, 4, null])
            for (const tH of [6, 2160]) {
              const w = toH === null ? {} : { toH };
              const trunk = simulate({ ...base([{ vessel, severity: 1, ...w }], collateral), tH });
              const branch = simulate({ ...base([{ vessel, severity: 1, branch: true, lacuneSite: site.id, ...w }], collateral), tH });
              const rid = `${site.region}_l`;
              expect(branch.regions[rid].infarct, `${site.id} ${collateral} closed ${toH ?? 'for good'} at ${tH} h`).toBeLessThanOrEqual(trunk.regions[rid].infarct + 1e-9);
            }
    });

    // two days into a lesion, the penumbra (tissue at risk) is no more than what the course still loses
    it.each(CASES)('%s: from two days after the last occlusion begins, the penumbra is no more than the course still loses', (name) => {
      series(name).forEach((r, i) => {
        const tH = STOPS[i];
        const changes = r.input.occlusions.flatMap((o) => [startOf(o), o.toH ?? 0]).concat(r.input.reperfusionH ?? 0);
        if (tH < Math.max(...changes) + 48) return;
        expect(r.volumes.penumbra, `${name} ${tH} h`).toBeLessThanOrEqual(r.volumes.finalInfarct - r.volumes.core + 0.5);
      });
    });

    // the tissue that survives (past the time it is at risk, or rescued by a reopening: W2-10,
    // Y1-12) is still silent while it regains its function: the region details never tell the
    // deficits of a region that is mostly such living tissue as those of dead tissue
    const REOPENED: [string, SimInput][] = [
      ['left M1 reopened at 3 h', base([{ vessel: 'mca_m1_l', severity: 1 }], 'good', 3)],
      ['left M1 reopened at 6 h, moderate', base([{ vessel: 'mca_m1_l', severity: 1 }], 'moderate', 6)],
      ['mid-basilar reopened at 4.5 h', base([{ vessel: 'basilar_mid', severity: 1 }], 'good', 4.5)],
    ];
    const living = (r: SimResult, rid: string) => {
      const comp = regionComposition(r, rid);
      const rr = regionRecovery(r, rid);
      return { comp, rr, alive: comp.penumbra + rr.regaining + rr.silenced };
    };
    it.each([...CASES.map(([n]) => [n, null] as [string, SimInput | null]), ...REOPENED])(
      '%s: a region whose deficits come mostly from living tissue is not told as dead tissue',
      (name, input) => {
        const runs = input ? STOPS.map((tH) => simulate({ ...input, tH })) : series(name);
        runs.forEach((r, i) => {
          for (const [rid, st] of Object.entries(r.regions)) {
            if (st.dys < 0.25) continue;
            const { comp, rr, alive } = living(r, rid);
            if (comp.core >= 0.15 || alive < 0.5) continue;
            expect(regionFunctionGroup(comp, rr), `${name} ${STOPS[i]} h ${rid}`).not.toMatch(/^lost/);
          }
        });
      },
    );
  });
});

/**
 * Y1: classes of contradiction the tissue and recovery calibration must not bring back, over every
 * scenario with a complete occlusion and each collateral grade.
 */
describe('tissue and recovery calibration (Y1)', () => {
  const COMPLETE = SCENARIOS.filter((s) => s.occlusions.every((o) => !o.fromH && o.toH == null) && s.occlusions.some((o) => o.severity >= 1 && !o.branch));
  const BRAIN_CATEGORIES = new Set(['cortex', 'deep', 'brainstem', 'cerebellum']);
  const brainMl = (r: SimResult, pick: (b: SimResult['beds'][string]) => number) =>
    BEDS.filter((b) => BRAIN_CATEGORIES.has(REGION_BY_ID[b.region].category)).reduce((a, b) => a + pick(r.beds[b.id]) * b.volume, 0);

  // Y1-12: the tissue that survives does not work again at the instant blood returns: at most about
  // a quarter of it at once after an hour of ischaemia, less after longer
  it.each(COMPLETE.map((s) => [s.id]))('%s: reopened at 1, 2 or 6 h, at most about 30 % of the ischaemic tissue still alive works again at once', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      for (const reperfusionH of [1, 2, 6]) {
        const before = simulate(inputOf(id, { collateral, reperfusionH, tH: reperfusionH - 1e-3 }));
        const after = simulate(inputOf(id, { collateral, reperfusionH, tH: reperfusionH }));
        const atRisk = brainMl(before, (b) => b.frac.penumbra);
        if (atRisk < 1) continue;
        const silent = brainMl(after, (b) => b.frac.penumbra + b.regaining);
        expect(silent, `${id} ${collateral} reopened ${reperfusionH} h`).toBeGreaterThanOrEqual(0.7 * atRisk - 0.5);
      }
  });

  // Y1-0: the infarct never grows faster than the fastest growth measured in large-vessel occlusion
  // (about 74 mL/h averaged from onset to imaging: Desai SM et al. Stroke 2019;50:34–37), from 1 h on.
  // Not for an isolated hemisphere (no communicating arteries: ica_isolated), which with poor pial
  // collaterals gets almost no flow at all and loses about 100 mL in the first hour, beyond that range
  it.each(COMPLETE.filter((s) => !s.variants?.length).map((s) => [s.id]))('%s: the untreated infarct grows by at most about 75 mL/h, averaged from onset', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      for (const tH of [1, 2, 3, 4.5, 6, 12])
        expect(simulate(inputOf(id, { collateral, reperfusionH: null, tH })).volumes.core / tH, `${id} ${collateral} ${tH} h`).toBeLessThanOrEqual(76);
  });

  // Y1-1: a limb made plegic by an infarct of half or more of a corticospinal convergence site (the
  // posterior limb of the internal capsule, the cerebral peduncle, the basis pontis) keeps a
  // moderate weakness at 3 months, not a drift (Shelton & Reding 2001; Feng 2015)
  const CST = ['ic_posterior_limb', 'midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis'];
  it.each(SCENARIOS.map((s) => [s.id]))('%s: an arm plegic at 3 days from a corticospinal convergence site half infarcted is not a mere drift at 3 months', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const) {
      const d3 = simulate(inputOf(id, { collateral, tH: 72 }));
      const m3 = simulate(inputOf(id, { collateral, tH: 2160 }));
      for (const side of ['r', 'l'] as const) {
        const lesion = side === 'r' ? 'l' : 'r';
        const cut = CST.some((b) => (m3.regions[`${b}_${lesion}`]?.infarct ?? 0) >= 0.5 && !(SCENARIOS.find((s) => s.id === id)!.occlusions.every((o) => o.branch)));
        if (!cut || d3.nihss.items[`5${side}`] !== 4) continue;
        expect(m3.nihss.items[`5${side}`] ?? 0, `${id} ${collateral} arm ${side}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('reperfusion, the circle of Willis and the treatment windows (T2)', () => {
  const run = (occlusions: Occlusion[], collateral: CollateralGrade, over: Partial<SimInput> = {}): SimInput => ({
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
  const EVT: TreatmentOptions = { method: 'evt', grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 };

  // T2-2: an artery that reopens by itself is judged as a treated reopening is: what a herniation
  // finds alive is that of the same case had the artery stayed closed. So it never ends larger than
  // had it stayed closed, and ends as a complete thrombectomy at the same hour does
  const SELF: [string, CollateralGrade, number][] = [];
  for (const v of ['mca_m1_l', 'mca_m1_r', 'ica_terminal_l', 'ica_terminal_r', 'mca_m2_sup_l', 'basilar_mid', 'pca_p2_l', 'aca_a2_l'])
    for (const c of ['good', 'moderate', 'poor'] as const) for (const h of [6, 12, 24]) SELF.push([v, c, h]);
  it.each(SELF)('%s, %s collaterals, reopening by itself at %s h: never larger than closed, and as a thrombectomy then', (v, c, h) => {
    const closed = simulate(run([o(v)], c)).volumes.finalInfarct;
    const self = simulate(run([o(v, { toH: h })], c)).volumes.finalInfarct;
    expect(self).toBeLessThanOrEqual(closed + 0.01);
    expect(self).toBeCloseTo(simulate(run([o(v)], c, { reperfusionH: h, treatment: EVT })).volumes.finalInfarct, 1);
  });

  // T2-4: the circle of Willis is told as enough (green) only when the territory beyond the block
  // shows no deficit while the artery is closed, for an occlusion of a few minutes as for a lasting one
  const BEFORE_CIRCLE = VESSELS.filter((v) => isOccludable(v.id) && /^(brachiocephalic|cca_|ica_|aca_a1_|pca_p1_|basilar_|va_)/.test(v.id)).map((v) => v.id);
  it.each(BEFORE_CIRCLE.map((v) => [v]))('%s, closed for 5 min, 2 h or for good: a green circle of Willis only beside no deficit', (v) => {
    for (const c of ['good', 'moderate', 'poor'] as const)
      for (const toH of [1 / 12, 2, null]) {
        const occ = [o(v, toH === null ? {} : { toH })];
        const e = simulate(run(occ, c)).cascade.events.find((x) => x.id === 'willis_compensation');
        if (e?.severity !== 'good') continue;
        const onset = simulate(run(occ, c, { tH: 0 }));
        expect(onset.symptoms.map((s) => s.id), `${v} ${c} ${toH ?? 'lasting'}`).toEqual([]);
        expect(onset.nihss.total, `${v} ${c} ${toH ?? 'lasting'}`).toBe(0);
      }
  });

  // T2-8: a treatment window quotes as its core only what the lesion it is for has killed by the
  // decision, never an earlier infarct; and within 3 months of an earlier infarct (from a day before
  // on) IV thrombolysis is not offered as standard
  const SECOND: [string, SimInput][] = [];
  for (const [a, b] of [['mca_m1_l', 'mca_m1_r'], ['mca_m1_r', 'mca_m1_l'], ['ica_terminal_r', 'mca_m1_l'], ['mca_m2_sup_l', 'mca_m1_r'], ['pca_p2_l', 'mca_m2_sup_r'], ['mca_m1_l', 'basilar_mid']])
    for (const t of [24, 48, 168, 720, 2400])
      for (const c of ['good', 'poor'] as const) SECOND.push([`${a}, then ${b} at ${t} h, ${c}`, run([o(a), o(b, { fromH: t })], c)]);
  it.each(SECOND)('%s: the window of the later lesion quotes its own core, and no standard IV thrombolysis within 3 months of an infarct', (_name, input) => {
    const r = simulate({ ...input, tH: 2400 + 24 });
    const onsetH = startOf(input.occlusions[1]);
    if (r.schedule.onsetH !== onsetH) return;
    const w = r.cascade.events.find((e) => e.id === 'treatment_window' && Math.abs(e.onsetH - onsetH) < 1e-6);
    if (!w) return;
    const own = simulate({ ...input, tH: onsetH + 6 }).volumes.core - simulate({ ...input, tH: onsetH }).volumes.core;
    const quoted = /Large core \(about (\d+) mL/.exec(w.desc.en);
    if (quoted) expect(Number(quoted[1]), w.desc.en).toBeLessThanOrEqual(own + 0.5);
    const earlier = startOf(input.occlusions[0]);
    const leftInfarct = simulate({ ...input, tH: onsetH - 1e-3 }).volumes.finalInfarct >= 0.05;
    const recent = leftInfarct && onsetH - earlier >= 24 && onsetH - earlier <= 2160;
    expect(/standard when started within 4\.5 h/.test(w.desc.en), w.desc.en).toBe(!recent);
    expect(/previous 3 months/.test(w.desc.en)).toBe(recent);
    expect(w.desc.zh.includes('3 個月內')).toBe(recent);
  });
});

describe('a reopening is credited only with what it saves (T3)', () => {
  // T3-11: deficits are graded in whole steps, so a sliver of tissue at the edge between two grades
  // can tip one (a known limitation). A reopening that saves a sliver (under half a millilitre and
  // under a tenth of the infarct the course would leave without it) is graded a benefit only for a
  // fatal course it avoids, is not credited with the 3-month NIHSS it tips ("about 20 instead of 24
  // without treatment"), and no locked-in text says that it saved part of the ventral pons; the
  // saving it quotes is "~0 mL" only when it is under 0.05 mL. Whether it is a sliver is judged
  // on what it saved bed by bed (a clot fragment's infarct elsewhere does not make it one). Nor is a
  // reopening credited with limb movement that comes back no sooner than it would have without it
  const brain = (r: SimResult) => r.volumes.finalInfarct - r.volumes.cord.final;
  const tx = (method: TreatmentOptions['method']): TreatmentOptions => ({ method, grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 });
  const REOPENED: [string, SimInput][] = [];
  for (const s of SCENARIOS.filter((x) => x.occlusions.some((o) => o.severity >= 1 && !o.branch)))
    for (const method of ['ivt', 'evt'] as const)
      for (const h of [1, 4.5, 12]) REOPENED.push([`${s.id} ${method} at ${h} h`, inputOf(s.id, { tH: 4320, reperfusionH: h, treatment: tx(method) })]);
  for (const v of ['basilar_mid', 'basilar_lower', 'basilar_upper', 'basilar_tip'])
    for (const c of ['good', 'moderate', 'poor'] as const)
      for (const h of [6, 8, 12, 24, 48]) {
        const base: SimInput = { occlusions: [{ vessel: v, severity: 1 }], variants: [], collateral: c, map: 93, tH: 4320, reperfusionH: null, decompression: false };
        REOPENED.push([`${v} ${c} evt at ${h} h`, { ...base, reperfusionH: h, treatment: tx('evt') }]);
        REOPENED.push([`${v} ${c} reopening by itself at ${h} h`, { ...base, occlusions: [{ vessel: v, severity: 1, toH: h }] }]);
      }
  it.each(REOPENED)('%s: a sliver saved earns no grade it tips (T3-11)', (_name, input) => {
    const r = simulate(input);
    // (with a margin below the engine's limits: 0.5 mL and a tenth)
    const sliver = (saved: number, without: number) => saved < 0.45 && saved < 0.09 * without;
    const rep = r.cascade.events.find((e) => e.id === 'reperfusion');
    let credit = true;
    if (rep) {
      if (r.volumes.saved >= 0.05) {
        expect(rep.desc.en).not.toMatch(/~0 mL less infarct/);
        expect(rep.desc.zh).not.toMatch(/少了約 0 mL/);
      }
      const untreated = simulate({ ...input, reperfusionH: null, treatment: undefined });
      if (sliver(r.volumes.saved, brain(untreated))) {
        credit = false;
        expect(rep.desc.en).not.toMatch(/instead of/);
        if (rep.severity === 'good') expect(rep.desc.en).toMatch(/Without treatment the [^;]*; with it/);
      }
    }
    const sp = r.cascade.spontaneous;
    if (sp) {
      const closed = simulate({ ...input, occlusions: input.occlusions.map((o) => ({ ...o, toH: null })) });
      if (sliver(sp.saved, brain(closed))) credit = false;
    }
    const credited = r.cascade.events.filter((x) => x.id.startsWith('locked_in_incomplete') && /saved part of the ventral pons/.test(x.desc.en));
    for (const e of credited) expect(e.desc.zh).toMatch(/救回部分橋腦腹側/);
    if (!credit) expect(credited.map((e) => e.id)).toEqual([]);
    // nor is it credited with limb movement that would have come back by then without it: the same
    // case untreated, or with the artery left closed, is still classically locked in a day later
    if (input.occlusions.every((o) => !o.fromH))
      for (const e of credited) {
        const without: SimInput = input.treatment
          ? { ...input, reperfusionH: null, treatment: undefined }
          : { ...input, occlusions: input.occlusions.map((o) => ({ ...o, toH: null })) };
        expect(simulate({ ...without, tH: e.onsetH + 24 }).syndromes.some((m) => m.def.id === 'locked_in'), `${e.id} at ${e.onsetH} h`).toBe(true);
      }
  });
});
