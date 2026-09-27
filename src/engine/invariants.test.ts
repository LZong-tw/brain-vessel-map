import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { REPERFUSION_STOPS, TIME_STOPS } from '../anatomy/timeline';
import { aggregateSymptoms } from './clinical';
import { simulate, type SimInput } from './simulate';
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

