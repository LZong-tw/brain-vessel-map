import { describe, expect, it } from 'vitest';
import { BEDS, REGION_BY_ID } from '../anatomy';
import { REPERFUSION_STOPS } from '../anatomy/timeline';
import { SCENARIOS } from '../anatomy/scenarios';
import { simulate, type SimInput } from './simulate';

/**
 * "Salvaged" (已救回) is the tissue that treatment saved: it would have been lost by the end of
 * the untreated course and survives this one. Reperfused tissue that would have survived on its
 * collaterals anyway is not a rescue.
 */
const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false, ...over });
const BRAIN = new Set(['cortex', 'deep', 'brainstem', 'cerebellum']);
const salvagedMl = (r: ReturnType<typeof simulate>) =>
  BEDS.filter((b) => BRAIN.has(REGION_BY_ID[b.region].category)).reduce((a, b) => a + r.beds[b.id].frac.salvaged * b.volume, 0);

describe('salvaged tissue', () => {
  // reported: #o=basilar_mid,pica_r&p=124&t=2160&r=24 coloured most of the right cerebellum as
  // salvaged at 3 months, although opening at 24 h saved only a few per cent of it
  it('a late recanalisation is not shown as rescuing tissue that would have survived anyway', () => {
    const occlusions = [
      { vessel: 'basilar_mid', severity: 1 },
      { vessel: 'pica_r', severity: 1 },
    ];
    const treated = sim({ occlusions, map: 124, reperfusionH: 24, tH: 2160 });
    const untreated = sim({ occlusions, map: 124, reperfusionH: null, tH: 2160 });
    const id = 'cerebellum_posterior_inferior_r';
    const f = treated.beds[id].frac;
    const savedByTreatment = untreated.beds[id].frac.core - f.core;
    expect(f.salvaged).toBeCloseTo(savedByTreatment, 6);
    expect(f.salvaged).toBeLessThan(0.15);
    expect(Object.values(f).reduce((a, x) => a + x, 0)).toBeCloseTo(1, 9);
  });

  it.each(SCENARIOS.filter((s) => s.occlusions.some((o) => o.severity >= 1 && !o.branch)).map((s) => [s.id, s] as const))(
    '%s: the salvaged volume is the volume treatment saved',
    (_id, sc) => {
      for (const reperfusionH of [REPERFUSION_STOPS[0], 6, 24]) {
        const r = sim({ occlusions: sc.occlusions, variants: sc.variants ?? [], collateral: sc.collateral ?? 'good', map: sc.map ?? 93, reperfusionH, tH: 4320 });
        // tissue that treatment saved but that later dies from herniation is not salvaged, so the
        // salvaged volume can only fall short of the saved volume when there are secondary infarcts
        const secondary = BEDS.some((b) => r.beds[b.id].effect === 'secondary');
        if (secondary) expect(salvagedMl(r), `reperfusion ${reperfusionH} h`).toBeLessThanOrEqual(r.volumes.saved + 0.5);
        else expect(salvagedMl(r), `reperfusion ${reperfusionH} h`).toBeCloseTo(r.volumes.saved, 0);
      }
    },
  );

  it('a spontaneously resolving TIA leaves normal tissue, not "salvaged" tissue', () => {
    const tia = SCENARIOS.find((s) => s.id === 'tia_l_mca')!;
    const r = sim({ occlusions: tia.occlusions, tH: 24 });
    expect(salvagedMl(r)).toBe(0);
  });
});
