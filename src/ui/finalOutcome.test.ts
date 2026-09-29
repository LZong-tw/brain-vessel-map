/**
 * The end-of-course numbers of the Outcome tab (ui/finalOutcome.ts): 3- and 6-month results,
 * the untreated counterpart, the lasting-deficit groups, the late course and the "not settled"
 * flag for a late event.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import type { SymptomItem } from '../engine/clinical';
import type { Occlusion } from '../engine/hemodynamics';
import { simulate } from '../engine/simulate';
import {
  FINAL_REGION_MIN,
  H_3M,
  H_6M,
  I_3M,
  I_6M,
  LARGELY_FROM,
  PARTIAL_FROM,
  deficitGroup,
  finalOutcome,
  groupDeficits,
  type OutcomeInput,
} from './finalOutcome';

/** the input the store builds when a scenario is loaded */
function scenarioInput(id: string): OutcomeInput {
  const s = SCENARIO_BY_ID[id];
  expect(s, id).toBeDefined();
  return {
    occlusions: s.occlusions.map((o) => ({ ...o })) as Occlusion[],
    variants: s.variants ?? [],
    map: s.map ?? 93,
    collateral: s.collateral ?? 'good',
    reperfusionH: s.reperfusionH ?? null,
    decompression: s.decompression ?? false,
  };
}
const plain = (occlusions: Occlusion[], reperfusionH: number | null = null): OutcomeInput => ({
  occlusions,
  variants: [],
  map: 93,
  collateral: 'good',
  reperfusionH,
  decompression: false,
});
const sym = (id: string, compensated: number | null, sev: 1 | 2 | 3 = 1): SymptomItem => ({
  id,
  side: null,
  sev,
  sources: [],
  delayed: false,
  ...(compensated === null ? {} : { recovery: { kind: 'partial' as const, compensated, bilateral: false, bottleneck: false } }),
});

describe('time stops', () => {
  it('uses the timeline’s 3- and 6-month stops, the last being 6 months', () => {
    expect(H_3M).toBe(2160);
    expect(H_6M).toBe(4320);
    expect(I_6M).toBe(TIME_STOPS.length - 1);
    expect(TIME_STOPS[I_3M].h).toBe(2160);
  });
});

describe('treated vs untreated', () => {
  const input = scenarioInput('l_m1_thrombectomy');
  const out = finalOutcome(input);

  it('compares with the untreated course, which ends with at least as large an infarct', () => {
    expect(input.reperfusionH).toBe(2);
    expect(out.untreated).not.toBeNull();
    expect(out.untreated!.finalInfarct).toBeGreaterThanOrEqual(out.course.finalInfarct);
    // for an M1 opened at 2 h the difference is large, not a rounding artefact
    expect(out.untreated!.finalInfarct - out.course.finalInfarct).toBeGreaterThan(20);
    expect(out.course.m6.volumes.saved).toBeGreaterThan(0.5);
  });

  it('takes the 3- and 6-month NIHSS from simulations at 2160 h and 4320 h, treated and untreated', () => {
    const at = (tH: number, reperfusionH: number | null) => simulate({ ...input, tH, reperfusionH });
    expect(out.course.m3.nihss.total).toBe(at(2160, 2).nihss.total);
    expect(out.course.m6.nihss.total).toBe(at(4320, 2).nihss.total);
    expect(out.untreated!.m3.nihss.total).toBe(at(2160, null).nihss.total);
    expect(out.untreated!.m6.nihss.total).toBe(at(4320, null).nihss.total);
    expect(out.untreated!.m6.input.reperfusionH).toBeNull();
    expect(out.course.m3.input.tH).toBe(2160);
    expect(out.course.m6.input.tH).toBe(4320);
    // lasting deficits = symptoms still present at 6 months
    expect(out.course.lasting).toBe(at(4320, 2).symptoms.length);
    expect(out.untreated!.lasting).toBe(at(4320, null).symptoms.length);
    expect(out.untreated!.finalInfarct).toBeCloseTo(at(4320, null).volumes.finalInfarct, 6);
  });

  it('reuses 3- and 6-month simulations handed to it', () => {
    const m3 = simulate({ ...input, tH: 2160 });
    const m6 = simulate({ ...input, tH: 4320 });
    const again = finalOutcome(input, { m3, m6 });
    expect(again.course.m3).toBe(m3);
    expect(again.course.m6).toBe(m6);
  });

  it('has no untreated column without treatment', () => {
    const untreatedCase = finalOutcome(scenarioInput('l_m1'));
    expect(untreatedCase.untreated).toBeNull();
    expect(untreatedCase.course.finalInfarct).toBeCloseTo(out.untreated!.finalInfarct, 6);
  });
});

describe('lasting-deficit groups', () => {
  it('splits by the compensated share at 25 % and 60 %', () => {
    expect(PARTIAL_FROM).toBe(0.25);
    expect(LARGELY_FROM).toBe(0.6);
    expect(deficitGroup(sym('a', 0))).toBe('marked');
    expect(deficitGroup(sym('a', 0.24))).toBe('marked');
    expect(deficitGroup(sym('a', 0.25))).toBe('partial');
    expect(deficitGroup(sym('a', 0.59))).toBe('partial');
    expect(deficitGroup(sym('a', 0.6))).toBe('largely');
    expect(deficitGroup(sym('a', 0.9))).toBe('largely');
    // no recovery data (a merged symptom such as global aphasia) is not assumed to recover
    expect(deficitGroup(sym('a', null))).toBe('marked');
  });

  it('keeps every symptom once, worst first within a group', () => {
    const list = [sym('a', 0.3, 1), sym('b', 0.1, 1), sym('c', 0.4, 2), sym('d', 0.7)];
    const g = groupDeficits(list);
    expect(g.marked.map((s) => s.id)).toEqual(['b']);
    expect(g.partial.map((s) => s.id)).toEqual(['c', 'a']);
    expect(g.largely.map((s) => s.id)).toEqual(['d']);
  });

  it('groups a real course: nothing compensates through the ventral-pons bottleneck, a one-sided PICA largely does', () => {
    const basilar = finalOutcome(scenarioInput('basilar_mid'));
    const g = basilar.deficits.m6;
    expect(g.marked.length).toBeGreaterThan(0);
    for (const s of [...g.partial, ...g.largely]) expect(s.recovery?.bottleneck, s.id).toBeFalsy();
    expect(g.marked.some((s) => s.id === 'arm_weak')).toBe(true);

    const pica = finalOutcome(plain([{ vessel: 'pica_r', severity: 1 }]));
    const all = [...pica.deficits.m6.marked, ...pica.deficits.m6.partial, ...pica.deficits.m6.largely];
    expect(all.length).toBe(pica.course.m6.symptoms.length);
    expect(pica.deficits.m6.largely.map((s) => s.id)).toContain('vertigo');
    // compensation only grows between 3 and 6 months, so nothing moves to a worse group
    const rank = { marked: 0, partial: 1, largely: 2 } as const;
    for (const s of pica.course.m6.symptoms) {
      const before = pica.course.m3.symptoms.find((x) => x.id === s.id && x.side === s.side);
      if (before) expect(rank[deficitGroup(s)], s.id).toBeGreaterThanOrEqual(rank[deficitGroup(before)]);
    }
  });

  it('a TIA ends with no lasting deficit and no infarct — and is not called unsettled', () => {
    const tia = finalOutcome(scenarioInput('tia_l_mca'));
    expect(tia.course.m3.symptoms).toEqual([]);
    expect(tia.course.m6.symptoms).toEqual([]);
    expect(tia.course.lasting).toBe(0);
    expect(tia.course.finalInfarct).toBeLessThan(0.05);
    expect(tia.regions).toEqual([]);
    expect(tia.course.m6.nihss.total).toBe(0);
    // it reopens after 5 min, so the final infarct is evaluated 5 min after 6 months
    expect(tia.finalH).toBeGreaterThan(H_6M);
    expect(tia.unsettled).toBe(false);
  });
});

describe('late course', () => {
  const m1 = finalOutcome(scenarioInput('l_m1'));
  const ids = (list: { id: string }[]) => list.map((e) => e.id);

  it('keeps events from a week on and lasting states, drops the hyperacute and acute ones', () => {
    const all = ids(m1.course.m6.cascade.events);
    const late = ids(m1.late);
    // sanity: the events this test relies on exist in the model
    for (const id of ['wallerian_l', 'thalamic_atrophy_l', 'ccd_l', 'ischemic_cascade', 'vasogenic_edema', 'hemorrhagic_transformation']) expect(all).toContain(id);
    // starts ≥ 1 week after onset
    expect(late).toContain('wallerian_l');
    expect(late).toContain('thalamic_atrophy_l');
    // starts on day 1 but is still present at 6 months (crossed cerebellar diaschisis)
    expect(late).toContain('ccd_l');
    // hyperacute / acute and over by 6 months
    expect(late).not.toContain('ischemic_cascade');
    expect(late).not.toContain('treatment_window');
    expect(late).not.toContain('vasogenic_edema');
    expect(late).not.toContain('hemorrhagic_transformation');
    const onsets = m1.late.map((e) => e.onsetH);
    expect(onsets).toEqual([...onsets].sort((a, b) => a - b));
  });

  it('leaves out open-ended hyperacute risks: the locked-in risk after early reopening of the basilar artery', () => {
    const early = finalOutcome(plain([{ vessel: 'basilar_mid', severity: 1 }], 1));
    // the cascade keeps its acute "risk of locked-in syndrome" open-ended …
    const risk = early.course.m6.cascade.events.find((e) => e.id === 'locked_in');
    expect(risk).toBeDefined();
    expect(risk!.onsetH).toBe(0);
    expect(risk!.endH).toBeUndefined();
    // … although nothing is left at 6 months, so it is not part of the late course
    expect(early.course.m6.symptoms).toEqual([]);
    expect(ids(early.late)).not.toContain('locked_in');
    // untreated, the locked-in state itself is what remains at 6 months
    const untreated = finalOutcome(plain([{ vessel: 'basilar_mid', severity: 1 }]));
    expect(untreated.course.m6.syndromes.map((s) => s.def.id)).toContain('locked_in');
  });

  it('leaves out treatment events such as the reperfusion itself', () => {
    const treated = finalOutcome(scenarioInput('l_m1_thrombectomy'));
    const reperf = treated.course.m6.cascade.events.find((e) => e.id === 'reperfusion');
    expect(reperf).toBeDefined();
    expect(reperf!.endH).toBeUndefined(); // still "active", yet not an outcome
    expect(ids(treated.late)).not.toContain('reperfusion');
  });

  it('counts the week from the index onset, not from the start of the timeline', () => {
    const late = finalOutcome(plain([{ vessel: 'mca_m1_l', severity: 1, fromH: 720 }]));
    expect(late.onsetH).toBe(720);
    const cascade = late.course.m6.cascade.events.find((e) => e.id === 'ischemic_cascade')!;
    expect(cascade.onsetH).toBe(720); // ≥ 1 week on the timeline, but hyperacute for the patient
    expect(ids(late.late)).not.toContain('ischemic_cascade');
    expect(ids(late.late)).toContain('wallerian_l');
  });
});

describe('a late event is not settled at 6 months', () => {
  it('flags an occlusion that starts at 1 month', () => {
    const late = finalOutcome(plain([{ vessel: 'mca_m1_l', severity: 1, fromH: 720 }]));
    expect(late.finalH).toBe(720 + 4320);
    expect(late.unsettled).toBe(true);
  });

  it('does not flag one that starts at onset', () => {
    const early = finalOutcome(plain([{ vessel: 'mca_m1_l', severity: 1 }]));
    expect(early.finalH).toBe(4320);
    expect(early.unsettled).toBe(false);
  });
});

describe('final regions', () => {
  it('lists the regions infarcted at 6 months, largest share first', () => {
    const out = finalOutcome(scenarioInput('l_m1'));
    expect(out.regions.length).toBeGreaterThan(3);
    for (const r of out.regions) {
      expect(r.infarct).toBeGreaterThanOrEqual(FINAL_REGION_MIN);
      expect(r.infarct).toBeCloseTo(out.course.m6.regions[r.id].infarct, 9);
    }
    const shares = out.regions.map((r) => r.infarct);
    expect(shares).toEqual([...shares].sort((a, b) => b - a));
    expect(out.regions.map((r) => r.id)).toContain('insula_l');
  });
});
