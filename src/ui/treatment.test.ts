import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { REPERFUSION_STOPS } from '../anatomy/timeline';
import { simulate } from '../engine/simulate';
import { DEFAULT_TREATMENT } from '../engine/treatment';
import { reopenedVesselIds } from './treatment';

/**
 * The settings panel works out which arteries a treatment reopens from the store alone; the
 * engine decides the same thing when it simulates. The two must never disagree, or the panel
 * would offer distal-embolus choices and evidence for the wrong artery.
 */
describe('the settings panel and the engine agree on what treatment reopens', () => {
  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s', (_id, sc) => {
    const times = [...REPERFUSION_STOPS, ...(sc.reperfusionH != null ? [sc.reperfusionH] : [])];
    for (const reperfusionH of times) {
      const r = simulate({
        occlusions: sc.occlusions,
        variants: sc.variants ?? [],
        collateral: sc.collateral ?? 'good',
        map: sc.map ?? 93,
        tH: 24,
        reperfusionH,
        decompression: false,
        // a non-default treatment, so that the engine reports what it reopened
        treatment: { ...DEFAULT_TREATMENT, grade: '2b67' },
      });
      expect([...reopenedVesselIds(sc.occlusions, reperfusionH)].sort(), `reperfusion ${reperfusionH} h`).toEqual([...(r.treatment?.reopened ?? [])].sort());
    }
  });
});
