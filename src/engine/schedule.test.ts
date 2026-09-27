/**
 * Occlusion schedules: occlusions that begin later, reopen by themselves, progress from a
 * stenosis to an occlusion, and treatment that reopens only what is occluded at that moment.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BEDS } from '../anatomy';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import { useApp } from '../state/store';
import { applyHash, encodeState } from '../state/urlState';
import { getUnits, simulateHemodynamics, type Occlusion } from './hemodynamics';
import { activeAt, breakpoints, fitSchedule, scheduleEvents, statusAt } from './schedule';
import { simulate, type SimInput } from './simulate';
import { finalInfarctProb, infarctFraction, lossSteps, penumbraResolveH, tauHours, tissueCourse, unitState, type TissueState } from './tissue';
import { DEFAULT_TISSUE, tissueParamsForBed, type TissueParams } from './tissueParams';

const base: SimInput = { occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false };
const sim = (over: Partial<SimInput>) => simulate({ ...base, ...over });
const acuteSymptoms = (r: ReturnType<typeof simulate>) => r.symptoms.filter((s) => !s.delayed);

// ── the two-phase tissue model exactly as it was before schedules (reference) ──
function legacyLossAt(rel: number, tH: number, p: TissueParams): number {
  const tau = tauHours(rel, p);
  if (!Number.isFinite(tau)) return 0;
  return finalInfarctProb(rel, p) * (1 - Math.exp(-Math.max(tH - p.lagH, 0) / tau));
}
function legacyInfarctFraction(rel: number, tH: number, reperfusionH: number | null, relAfter: number, p: TissueParams): number {
  if (reperfusionH === null || tH <= reperfusionH) return legacyLossAt(rel, tH, p);
  const f1 = legacyLossAt(rel, reperfusionH, p);
  const pf = finalInfarctProb(relAfter, p);
  const tau = tauHours(relAfter, p);
  if (f1 >= pf || !Number.isFinite(tau)) return f1;
  const tEquivalent = f1 > 0 ? p.lagH - tau * Math.log(1 - f1 / pf) : Math.min(reperfusionH, p.lagH);
  return legacyLossAt(relAfter, tEquivalent + (tH - reperfusionH), p);
}
function legacyUnitState(rel: number, tH: number, reperfusionH: number | null, relAfter: number, p: TissueParams) {
  const f = legacyInfarctFraction(rel, tH, reperfusionH, relAfter, p);
  const reperfused = reperfusionH !== null && tH >= reperfusionH;
  const cur = reperfused ? relAfter : rel;
  const since = reperfused ? tH - (reperfusionH as number) : tH;
  let rest: TissueState;
  if (cur < p.penumbraRel) rest = since < penumbraResolveH(cur, p) ? 'penumbra' : 'oligemia';
  else if (reperfused && rel < p.penumbraRel) rest = 'salvaged';
  else rest = cur < p.oligemiaRel ? 'oligemia' : 'normal';
  return { f, rest };
}

/**
 * The old model's state with the one intended change since: tissue whose current flow is below
 * the core threshold keeps its not-yet-dead remainder as dying penumbra instead of "stabilised"
 * oligaemia (the infarct fraction itself is unchanged).
 */
function expectedUnitState(rel: number, tH: number, reperfusionH: number | null, relAfter: number, p: TissueParams) {
  const s = legacyUnitState(rel, tH, reperfusionH, relAfter, p);
  const cur = reperfusionH !== null && tH >= reperfusionH ? relAfter : rel;
  return cur < p.coreRel ? { ...s, rest: 'penumbra' as TissueState } : s;
}

const RELS = [0, 0.05, 0.12, 0.2, 0.29, 0.3, 0.31, 0.35, 0.4, 0.45, 0.5, 0.549, 0.55, 0.6, 0.8, 0.85, 1, 1.3];
const TIMES = [...new Set([...TIME_STOPS.map((s) => s.h), 0.05, 0.1, 0.36, 0.9, 7, 30, 96, 200, 1000])];
const REPERF = [null, 0, 0.25, 0.5, 1, 2, 3, 4.5, 6, 12, 24];

describe('tissue: the piecewise model reduces exactly to the two-phase model', () => {
  const paramSets: [string, TissueParams][] = [
    // lag 0 explicitly: with a lag the two models differ by design when flow is normal first and
    // ischaemic after "reperfusion" (tested separately below)
    ['defaults', { ...DEFAULT_TISSUE, lagH: 0 }],
    ['other constants', { ...DEFAULT_TISSUE, lagH: 0, coreRel: 0.25, penumbraRel: 0.6, coreTauH: 0.3, penumbraTauMinH: 0.8, penumbraTauSpan: 12, penumbraSurvivalMax: 0.7 }],
  ];
  it.each(paramSets)('infarctFraction and unitState match over a grid (%s, lag 0)', (_name, p) => {
    let n = 0;
    for (const rel of RELS)
      for (const relAfter of RELS)
        for (const r of REPERF)
          for (const t of TIMES) {
            expect(infarctFraction(rel, t, r, relAfter, p)).toBe(legacyInfarctFraction(rel, t, r, relAfter, p));
            expect(unitState(rel, t, r, relAfter, p)).toEqual(expectedUnitState(rel, t, r, relAfter, p));
            n++;
          }
    expect(n).toBeGreaterThan(30000);
  });

  it('matches with a lag too whenever the tissue is ischaemic before reperfusion', () => {
    // (lagH counts time below the penumbra threshold only, so the one case that differs by design
    // is flow that is normal first and ischaemic after "reperfusion")
    const p = { ...DEFAULT_TISSUE, lagH: 0.2 };
    for (const rel of RELS.filter((x) => x < p.penumbraRel))
      for (const relAfter of RELS)
        for (const r of REPERF)
          for (const t of TIMES) {
            expect(infarctFraction(rel, t, r, relAfter, p)).toBe(legacyInfarctFraction(rel, t, r, relAfter, p));
            expect(unitState(rel, t, r, relAfter, p)).toEqual(expectedUnitState(rel, t, r, relAfter, p));
          }
  });

  it('simulate() with treatment is the two-phase model unit by unit', () => {
    const occlusions: Occlusion[] = [
      { vessel: 'mca_m1_l', severity: 1 },
      { vessel: 'ica_cervical_l', severity: 0.9 },
    ];
    const acute = simulateHemodynamics({ ...base, occlusions });
    const after = simulateHemodynamics({ ...base, occlusions: [occlusions[1]] });
    const units = getUnits([], 'good');
    for (const tH of [0, 1, 2, 3, 24, 2160]) {
      const r = sim({ occlusions, reperfusionH: 2, tH });
      const expected: Record<string, Record<TissueState, number>> = {};
      for (const b of BEDS) expected[b.id] = { normal: 0, oligemia: 0, penumbra: 0, core: 0, salvaged: 0 };
      for (const u of units) {
        const { f, rest } = expectedUnitState(acute.unitRel[u.id] ?? 1, tH, 2, after.unitRel[u.id] ?? 1, tissueParamsForBed(u.bed));
        expected[u.bed].core += f * u.frac;
        expected[u.bed][rest] += (1 - f) * u.frac;
      }
      for (const b of BEDS) {
        if (r.beds[b.id].effect === 'secondary') continue;
        const sum = Object.values(expected[b.id]).reduce((a, x) => a + x, 0);
        if (sum === 0) expected[b.id].normal = 1;
        expect(r.beds[b.id].frac, `${b.id} @${tH}`).toEqual(expected[b.id]);
      }
    }
  });

  it('writing out the default timing changes nothing', () => {
    const plain = sim({ occlusions: [{ vessel: 'mca_m1_r', severity: 1 }], collateral: 'poor', reperfusionH: 3, tH: 72 });
    const timed = sim({ occlusions: [{ vessel: 'mca_m1_r', severity: 1, fromH: 0, toH: null }], collateral: 'poor', reperfusionH: 3, tH: 72 });
    const strip = (r: ReturnType<typeof simulate>) => JSON.stringify({ ...r, input: null, activeOcclusions: null });
    expect(strip(timed)).toBe(strip(plain));
    expect(plain.schedule.onsetH).toBe(0);
  });
});

describe('tissue: piecewise flow histories', () => {
  const p = DEFAULT_TISSUE;
  it('damage is monotone and an unchanged flow continues the same curve', () => {
    const split = lossSteps(
      [
        { fromH: 0, rel: 0.4 },
        { fromH: 3, rel: 0.4 },
      ],
      10,
      p,
    );
    expect(split[1]).toBeCloseTo(lossSteps([{ fromH: 0, rel: 0.4 }], 10, p)[0], 12);
    const h = [
      { fromH: 0, rel: 0.2 },
      { fromH: 0.5, rel: 1 },
      { fromH: 5, rel: 0.45 },
      { fromH: 9, rel: 1 },
    ];
    let prev = 0;
    for (const t of [0, 0.2, 0.5, 1, 5, 6, 9, 20, 100]) {
      const f = tissueCourse(h, t, p).f;
      expect(f).toBeGreaterThanOrEqual(prev);
      prev = f;
    }
    // flow above the penumbra threshold stops the damage
    expect(tissueCourse(h, 4, p).f).toBe(tissueCourse(h, 0.6, p).f);
  });

  it('lagH is a budget of cumulative ischaemic time', () => {
    const tia = (from: number) => [
      { fromH: from, rel: 0.1 },
      { fromH: from + 1 / 6, rel: 1 },
    ];
    const lag = { ...p, lagH: 0.25 };
    // one 10-minute event inside a 15-minute budget: nothing dies; without a lag some does
    expect(tissueCourse([{ fromH: 0, rel: 1 }, ...tia(1)], 48, lag).f).toBe(0);
    expect(tissueCourse([{ fromH: 0, rel: 1 }, ...tia(1)], 48, p).f).toBeGreaterThan(0.5);
    // a second 10-minute event a day later uses up the rest of the budget
    const twice = [{ fromH: 0, rel: 1 }, ...tia(1), ...tia(24)];
    expect(tissueCourse(twice, 20, lag).f).toBe(0);
    expect(tissueCourse(twice, 48, lag).f).toBeGreaterThan(0);
  });

  it('remainder: penumbra during ischaemia, salvaged after it, then oligaemia once the window has passed', () => {
    const h = [
      { fromH: 0, rel: 1 },
      { fromH: 2, rel: 0.45 },
      { fromH: 3, rel: 1 },
    ];
    expect(tissueCourse(h, 1, p).rest).toBe('normal');
    expect(tissueCourse(h, 2.5, p).rest).toBe('penumbra');
    expect(tissueCourse(h, 5, p).rest).toBe('salvaged');
    const stays = [
      { fromH: 0, rel: 1 },
      { fromH: 2, rel: 0.45 },
    ];
    expect(tissueCourse(stays, 2 + penumbraResolveH(0.45, p) + 1, p).rest).toBe('oligemia');
  });
});

describe('schedule bookkeeping', () => {
  const occ: Occlusion[] = [
    { vessel: 'mca_m1_l', severity: 1 },
    { vessel: 'mca_m1_r', severity: 1, fromH: 24 },
    { vessel: 'ica_cervical_r', severity: 0.7 },
    { vessel: 'pca_p2_l', severity: 1, toH: 0.5 },
  ];
  it('breaks the timeline at every start, reopening and treatment', () => {
    expect(breakpoints(occ, 2)).toEqual([0, 0.5, 2, 24]);
  });

  it('treatment reopens only the complete occlusions in effect at that moment', () => {
    expect(activeAt(occ, 1, 2).map((o) => o.vessel)).toEqual(['mca_m1_l', 'ica_cervical_r']);
    expect(activeAt(occ, 30, 2).map((o) => o.vessel)).toEqual(['mca_m1_r', 'ica_cervical_r']);
    expect(occ.map((o) => statusAt(o, 30, 2))).toEqual(['treated', 'active', 'active', 'reopened']);
    expect(occ.map((o) => statusAt(o, 30, 26))).toEqual(['treated', 'treated', 'active', 'reopened']);
    expect(occ.map((o) => statusAt(o, 12, 26))).toEqual(['active', 'pending', 'active', 'reopened']);
    const ev = scheduleEvents(occ, 2);
    expect(ev.find((e) => e.kind === 'treatment')?.reopens).toEqual([0]);
    expect(ev.filter((e) => e.kind === 'reopen').map((e) => e.index)).toEqual([3]);
  });

  it('keeps one vessel’s phases in order without overlaps', () => {
    const phases: Occlusion[] = [
      { vessel: 'basilar_mid', severity: 0.9 },
      { vessel: 'basilar_mid', severity: 1, fromH: 72 },
    ];
    expect(fitSchedule(phases, 'basilar_mid')).toEqual([
      { vessel: 'basilar_mid', severity: 0.9, toH: 72 },
      { vessel: 'basilar_mid', severity: 1, fromH: 72 },
    ]);
    expect(fitSchedule([phases[0], { ...phases[1], fromH: 0 }], 'basilar_mid')).toBeNull();
    const ev = scheduleEvents(fitSchedule(phases, 'basilar_mid')!, null);
    expect(ev.map((e) => e.kind)).toEqual(['onset', 'progression']);
    // a transient occlusion that clears to a stenosis, which later occludes
    const stutter = scheduleEvents(SCENARIO_BY_ID.basilar_stuttering.occlusions, null);
    expect(stutter.map((e) => [e.kind, e.h, e.index])).toEqual([
      ['onset', 0, 0],
      ['reopen', 1 / 12, 0],
      ['progression', 72, 2],
    ]);
  });

  it('the simulation reports which occlusions are in effect and the events', () => {
    const r = sim({ occlusions: occ, reperfusionH: 2, tH: 30 });
    expect(r.activeOcclusions).toEqual([occ[1], occ[2]]);
    expect(r.schedule.status).toEqual(['treated', 'active', 'active', 'reopened']);
    expect(r.recanalized).toBe(false);
    expect(r.schedule.events.map((e) => `${e.kind}@${e.h}`)).toEqual(['onset@0', 'onset@0', 'onset@0', 'reopen@0.5', 'treatment@2', 'onset@24']);
  });
});

describe('stenosis, then occlusion', () => {
  const phases: Occlusion[] = [
    { vessel: 'basilar_mid', severity: 0.9, toH: 72 },
    { vessel: 'basilar_mid', severity: 1, fromH: 72 },
  ];
  it('no infarct before the occlusion, infarct after it', () => {
    for (const tH of [0, 1, 24, 48]) {
      const r = sim({ occlusions: phases, tH });
      expect(r.volumes.core, `t=${tH}`).toBeLessThan(0.05);
      expect(r.cascade.events.filter((e) => e.onsetH <= tH)).toEqual([]);
    }
    const after = sim({ occlusions: phases, tH: 120 });
    expect(after.volumes.core).toBeGreaterThan(1);
    expect(after.schedule.onsetH).toBe(72);
    expect(acuteSymptoms(after).length).toBeGreaterThan(0);
  });

  it('the occlusion alone, started at 72 h, is the same stroke moved 72 h later', () => {
    const plain = sim({ occlusions: [{ vessel: 'basilar_mid', severity: 1 }], tH: 48 });
    const late = sim({ occlusions: phases, tH: 120 });
    expect(late.volumes.core).toBeCloseTo(plain.volumes.core, 6);
    expect(late.volumes.finalInfarct).toBeCloseTo(plain.volumes.finalInfarct, 6);
    expect(late.syndromes.map((s) => s.def.id)).toEqual(plain.syndromes.map((s) => s.def.id));
  });
});

describe('clocks: cascade and oedema run from the index onset', () => {
  const R_M1 = { collateral: 'poor' as const, decompression: false };
  it('events and oedema are shifted by the onset', () => {
    const plain = (tH: number) => sim({ ...R_M1, occlusions: [{ vessel: 'mca_m1_r', severity: 1 }], tH });
    const late = (tH: number) => sim({ ...R_M1, occlusions: [{ vessel: 'mca_m1_r', severity: 1, fromH: 24 }], tH });
    const p = plain(48);
    const l = late(72);
    expect(l.schedule.onsetH).toBe(24);
    expect(l.cascade.events.map((e) => [e.id, e.onsetH, e.peakH, e.endH])).toEqual(
      p.cascade.events.map((e) => [e.id, e.onsetH + 24, e.peakH === undefined ? undefined : e.peakH + 24, e.endH === undefined ? undefined : e.endH + 24]),
    );
    expect(l.cascade.midlineShift?.onsetH).toBe((p.cascade.midlineShift?.onsetH ?? NaN) + 24);
    expect(l.edema.phase).toBe(p.edema.phase);
    expect(l.edema.midlineShiftMm).toBeCloseTo(p.edema.midlineShiftMm, 6);
    expect(l.volumes.finalInfarct).toBeCloseTo(p.volumes.finalInfarct, 6);
    expect(l.symptoms.map((s) => s.id)).toEqual(p.symptoms.map((s) => s.id));
    // nothing yet before the occlusion
    const before = late(12);
    expect(before.edema.phase).toBe('none');
    expect(before.symptoms).toEqual([]);
    expect(before.volumes.core).toBe(0);
    // delayed consequences keep their distance from the onset
    expect(late(2160 + 24).hydrocephalus).toBe(plain(2160).hydrocephalus);
    expect(late(720).symptoms.some((s) => s.delayed)).toBe(plain(696).symptoms.some((s) => s.delayed));
  });

  it('hydrocephalus and its symptoms follow the onset of a late cerebellar infarct', () => {
    const plain = (tH: number) => sim({ occlusions: [{ vessel: 'pica_r', severity: 1 }], collateral: 'poor', tH });
    const late = (tH: number) => sim({ occlusions: [{ vessel: 'pica_r', severity: 1, fromH: 48 }], collateral: 'poor', tH });
    expect(plain(48).hydrocephalus).toBe(true);
    expect(late(48).hydrocephalus).toBe(false);
    expect(late(96).hydrocephalus).toBe(true);
    expect(late(96).symptoms.map((s) => s.id)).toEqual(plain(48).symptoms.map((s) => s.id));
    expect(late(96).cascade.hydrocephalusOnsetH).toBe((plain(48).cascade.hydrocephalusOnsetH ?? NaN) + 48);
    expect(late(96).edema.ventricleChange).toBeCloseTo(plain(48).edema.ventricleChange, 6);
  });

  it('treatment given before a later occlusion does not treat it', () => {
    const occ: Occlusion[] = [{ vessel: 'mca_m1_r', severity: 1, fromH: 24 }];
    const untreated = sim({ occlusions: occ, tH: 72 });
    const early = sim({ occlusions: occ, reperfusionH: 2, tH: 72 });
    expect(early.volumes.core).toBeCloseTo(untreated.volumes.core, 9);
    expect(early.activeOcclusions).toHaveLength(1);
    const treated = sim({ occlusions: occ, reperfusionH: 26, tH: 72 });
    expect(treated.activeOcclusions).toHaveLength(0);
    expect(treated.volumes.core).toBeLessThan(untreated.volumes.core);
    expect(treated.cascade.events.find((e) => e.id === 'reperfusion')?.onsetH).toBe(26);
  });
});

// ── behaviour that depends on how long ischaemic tissue survives (lagH), whatever it is set to ──
async function simulateWithLag(lagH: number): Promise<typeof simulate> {
  vi.resetModules();
  vi.doMock('./tissueParams', async (importOriginal) => {
    const orig = await importOriginal<typeof import('./tissueParams')>();
    const withLag = (p: TissueParams): TissueParams => ({ ...p, lagH });
    return { ...orig, DEFAULT_TISSUE: withLag(orig.DEFAULT_TISSUE), tissueParamsForBed: (bed: string) => withLag(orig.tissueParamsForBed(bed)) };
  });
  const mod = await import('./simulate');
  return mod.simulate;
}

describe('transient occlusions (relative to the tissue parameters)', () => {
  afterEach(() => {
    vi.doUnmock('./tissueParams');
    vi.resetModules();
  });
  const tia: Occlusion[] = [{ vessel: 'mca_m2_sup_l', severity: 1, toH: 1 / 6 }];

  it('with enough lag, symptoms only while it lasts and no infarct', async () => {
    const run = await simulateWithLag(0.5);
    const at = (tH: number) => run({ ...base, occlusions: tia, tH });
    const during = at(0);
    expect(acuteSymptoms(during).length).toBeGreaterThan(0);
    expect(during.nihss.total).toBeGreaterThan(0);
    for (const tH of [0.25, 1, 24, 168]) {
      const r = at(tH);
      expect(r.symptoms, `t=${tH}`).toEqual([]);
      expect(r.volumes.core).toBe(0);
      expect(r.volumes.finalInfarct).toBe(0);
      expect(r.recanalized).toBe(true);
      expect(r.schedule.status).toEqual(['reopened']);
    }
  });

  it('without a lag, the same 10 minutes leave an infarct', async () => {
    const run = await simulateWithLag(0);
    const r = run({ ...base, occlusions: tia, tH: 24 });
    expect(r.volumes.core).toBeGreaterThan(0.5);
    expect(r.volumes.core).toBeCloseTo(r.volumes.finalInfarct, 6);
  });

  it('prodromal basilar TIA → silent stenosis → occlusion on day 3 (scenario)', async () => {
    const run = await simulateWithLag(0.5);
    const sc = SCENARIO_BY_ID.basilar_stuttering;
    const at = (tH: number) => run({ ...base, occlusions: sc.occlusions, tH });
    expect(acuteSymptoms(at(0)).length).toBeGreaterThan(0);
    for (const tH of [0.25, 24, 48]) {
      expect(at(tH).symptoms, `t=${tH}`).toEqual([]);
      expect(at(tH).volumes.core).toBe(0);
    }
    const day3 = at(72);
    expect(day3.schedule.onsetH).toBe(72);
    expect(day3.syndromes.map((s) => s.def.id)).toContain('locked_in');
    expect(at(120).volumes.core).toBeGreaterThan(1);
    expect(at(120).cascade.events.every((e) => e.onsetH >= 72)).toBe(true);
  });
});

describe('scenarios with a schedule', () => {
  it('the TIA scenario resolves, whatever the tissue parameters', () => {
    const sc = SCENARIO_BY_ID.tia_l_mca;
    const at = (tH: number) => sim({ occlusions: sc.occlusions, tH });
    expect(at(0).nihss.total).toBeGreaterThan(0);
    expect(at(0.25).activeOcclusions).toEqual([]);
    expect(at(0.25).nihss.total).toBeLessThan(at(0).nihss.total);
    expect(at(24).volumes.penumbra).toBe(0);
  });

  it('round-trips through a link', () => {
    for (const id of ['tia_l_mca', 'basilar_stuttering']) {
      useApp.getState().loadScenario(id);
      const st = useApp.getState();
      const occ = st.occlusions;
      const enc = encodeState({ ...st, scenario: null });
      applyHash('#o=aca_a1_r');
      applyHash(`#${enc}`);
      expect(useApp.getState().occlusions).toEqual(occ);
      expect(encodeState(useApp.getState())).toBe(enc);
    }
  });
});
