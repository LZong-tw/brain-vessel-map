import { describe, expect, it } from 'vitest';
import { REGION_BY_ID, VESSELS } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYNDROMES, type SymptomQuery } from '../anatomy/syndromes';
import { REPERFUSION_STOPS, TIME_STOPS } from '../anatomy/timeline';
import { symptomsAddedAt } from './cascade';
import { aggregateSymptoms } from './clinical';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { isOccludable, simulate, type SimInput, type SimResult } from './simulate';
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
  // back only for a reason the model has: a sign that needs an awake patient is not listed while
  // the patient is stuporous, comatose or in a disorder of consciousness (R5-7), and the sparing of
  // central vision is lost while the oedema of days 1–2 weeks silences the occipital pole too
  const ALL_STOPS = TIME_STOPS.map((s) => s.h);
  const AWAKE_ONLY = ['disinhibition', 'executive', 'ataxia_gait', 'aphasia_thalamic', 'emotionalism', 'emotional_facial_paresis', 'holmes_tremor'];
  const unaware = (r: SimResult) => r.symptoms.some((x) => (x.id === 'coma' && x.sev >= 2) || x.id === 'disorder_of_consciousness');
  const oedema = (r: SimResult, tH: number) => r.cascade.events.some((e) => e.id === 'vasogenic_edema' && e.onsetH <= tH && tH < (e.endH ?? Infinity));
  const CONSCIOUSNESS = ['coma', 'somnolence', 'disorder_of_consciousness', 'hypersomnia'];
  const noUnexplainedReturn = (name: string, runs: SimResult[]) => {
    const keys = new Set(runs.flatMap((r) => r.symptoms.filter((x) => !CONSCIOUSNESS.includes(x.id)).map((x) => `${x.id}|${x.side}`)));
    for (const key of keys) {
      const id = key.split('|')[0];
      const on = runs.map((r) => r.symptoms.some((x) => `${x.id}|${x.side}` === key));
      const first = on.indexOf(true);
      const last = on.lastIndexOf(true);
      for (let i = first + 1; i < last; i++) {
        if (on[i]) continue;
        const why = AWAKE_ONLY.includes(id) ? unaware(runs[i]) : id === 'macular_sparing' ? oedema(runs[i], ALL_STOPS[i]) : false;
        expect(why, `${name}: ${key} is ${on.map((x) => (x ? '■' : '□')).join('')}`).toBe(true);
      }
    }
  };
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
    [
      'both mesencephalic perforators',
      [
        { vessel: 'mesencephalic_perf_r', severity: 1 },
        { vessel: 'mesencephalic_perf_l', severity: 1 },
      ],
      'good',
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
    on: (id, side) => r.symptoms.some((s) => s.id === id && (s.side === side || s.side === 'both')),
    from: (id, side) => r.symptoms.some((s) => s.id === id && s.sources.some((src) => REGION_BY_ID[src]?.side === side)),
  });
  /** a symptom produced by a region on this side (lateral labels) or by any region (bilateral ones) */
  const anyFrom = (r: SimResult, side: 'r' | 'l' | null) =>
    r.symptoms.some((s) => s.sources.some((src) => REGION_BY_ID[src] && (side === null || REGION_BY_ID[src].side === side)));

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

  it.each(CASES)('%s: a pattern label is marked silent exactly when no symptom from its side is left', (name) => {
    series(name).forEach((r, i) => {
      for (const m of r.syndromes) {
        const where = `${name} ${STOPS[i]} h: ${m.def.id}_${m.side ?? ''}`;
        if (m.def.pattern) expect(m.silent ?? false, where).toBe(!anyFrom(r, m.side));
        else expect(m.silent ?? false, where).toBe(false);
      }
    });
  });

  it.each(CASES)('%s: no bilateral lesion is named as two one-sided crossed brainstem syndromes', (name) => {
    series(name).forEach((r, i) => {
      // C7-F6: both medial medullae are one bilateral medial medullary infarction, not two Dejerine;
      // MERGE: nor two anteromedial pontine syndromes (C3-F4); R5-1: nor two Claude or Weber
      // syndromes; R5-3: nor two one-and-a-half syndromes (that is a horizontal gaze palsy to both sides)
      for (const id of ['pontine_ventral', 'pontine_anteromedial', 'pontine_lacunar', 'foville', 'dejerine', 'claude', 'weber_benedikt', 'one_and_half']) {
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
  // consciousness, is not listed then; an emotional facial paresis needs a face that moves on command
  const NEEDS_AWAKE = ['disinhibition', 'executive', 'ataxia_gait', 'aphasia_thalamic', 'emotionalism', 'emotional_facial_paresis', 'holmes_tremor'];
  it.each(CASES)('%s: no sign that needs an awake patient while stuporous, comatose or in a disorder of consciousness (R5-2, R5-7)', (name) => {
    series(name).forEach((r, i) => {
      const unaware = r.symptoms.some((s) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness');
      const holmesUnaware = r.symptoms.some((s) => s.id === 'coma' || s.id === 'disorder_of_consciousness');
      for (const s of r.symptoms) {
        if (s.id === 'holmes_tremor') expect(holmesUnaware, `${name} ${STOPS[i]} h: holmes_tremor`).toBe(false);
        else if (NEEDS_AWAKE.includes(s.id)) expect(unaware, `${name} ${STOPS[i]} h: ${s.id}`).toBe(false);
      }
      for (const e of r.symptoms.filter((s) => s.id === 'emotional_facial_paresis'))
        expect(
          r.symptoms.some((s) => (s.id === 'face_weak' || s.id === 'face_weak_peripheral') && (s.side === e.side || s.side === 'both')),
          `${name} ${STOPS[i]} h: emotional_facial_paresis_${e.side} with a weak face on that side`,
        ).toBe(false);
    });
  });

  it.each(CASES)('%s: every active cascade event that adds a symptom has it in the symptom list', (name) => {
    series(name).forEach((r, i) => {
      const tH = STOPS[i];
      for (const e of r.cascade.events) {
        // (a herniation coma lasts while the midline shift is in the coma range, C4-F1, R6-5; a
        // level of consciousness that follows a swelling, for its own part of the event, R6-1)
        for (const s of symptomsAddedAt(e, tH, r.edema.midlineShiftMm)) {
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
