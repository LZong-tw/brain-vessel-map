import { describe, expect, it } from 'vitest';
import { BEDS, REGION_BY_ID, VESSELS } from '../anatomy';
import { getUnits, simulateHemodynamics, type CollateralGrade } from './hemodynamics';
import { simulate, type SimResult } from './simulate';

const input = (vessels: string[], collateral: CollateralGrade = 'good') => ({
  occlusions: vessels.map((vessel) => ({ vessel, severity: 1 })), variants: [], map: 93,
  collateral, tH: 24, reperfusionH: null, decompression: false,
});
const infarct = (result: SimResult, side: 'l' | 'r') => BEDS.filter((b) => REGION_BY_ID[b.region].side === side)
  .reduce((sum, b) => sum + b.volume * (result.beds[b.id]?.infarct ?? 0), 0);

describe('numerical safeguard against contralateral collateral pressure gain', () => {
  it.each(['l', 'r'] as const)('adding opposite A2/P2 occlusion cannot spare the existing %s MCA infarct', (side) => {
    const other = side === 'l' ? 'r' : 'l';
    for (const collateral of ['good', 'moderate', 'poor'] as const) for (const map of [60, 93, 130]) {
      const original = simulate({ ...input([`mca_m1_${side}`], collateral), map });
      for (const extra of [`aca_a2_${other}`, `pca_p2_${other}`, `pca_p1_${other}`]) {
        const combined = simulate({ ...input([`mca_m1_${side}`, extra], collateral), map });
        // Allow 0.1 microlitre for the finite circuit/autoregulation iterations;
        // the reproduced artifact was several millilitres.
        expect(infarct(combined, side), `${map} ${collateral} ${extra}`).toBeGreaterThanOrEqual(infarct(original, side) - 1e-4);
      }
    }
  });

  it('keeps a newly reversed communicating route available', () => {
    const h = simulateHemodynamics(input(['ica_cervical_l', 'pca_p2_r']));
    // This callosal route is newly forward relative to the isolated left-ICA reference.
    expect(h.vesselFlow.lepto_aca_pca_callosal_l).toBeGreaterThan(0.01);
    expect(h.collateralPressureGuard).not.toContain('lepto_aca_pca_callosal_l');
  });

  it('labels an applied guard and leaves isolated cases unguarded', () => {
    const original = simulateHemodynamics(input(['mca_m1_l']));
    const combined = simulateHemodynamics(input(['mca_m1_l', 'aca_a2_r']));
    expect(original.collateralPressureGuard ?? []).toEqual([]);
    expect(combined.collateralPressureGuard?.length).toBeGreaterThan(0);
  });

  it('conserves circuit inflow rather than clipping reported tissue flows after solving', () => {
    const h = simulateHemodynamics(input(['mca_m1_l', 'aca_a2_r']));
    const inflow = VESSELS.filter((v) => v.from === 'arch').reduce((sum, v) => sum + h.vesselFlow[v.id], 0);
    const outflow = getUnits([], 'good').reduce((sum, u) => sum + h.unitRel[u.id] * u.baseFlow, 0);
    // Undrawn arch-to-arm links are additional boundary inflow, and the circuit
    // includes tiny G_LEAK sinks to prevent singular matrices.
    expect(h.boundaryInflow).toBeGreaterThan(inflow);
    expect(Math.abs(h.boundaryInflow! - outflow)).toBeLessThan(1e-3);
  });
});
