import { VESSEL_BY_ID } from '../anatomy';
import type { Occlusion } from '../engine/hemodynamics';
import type { SimResult } from '../engine/simulate';
import { VESSEL_COLORS, hex, mix, toHex } from './colors';

export type VesselVisualState =
  | 'occluded'
  | 'stenosed'
  | 'noflow'
  | 'reversed'
  | 'reduced'
  | 'normal'
  | 'collateral_active'
  | 'collateral_idle';

export interface VesselVisual {
  state: VesselVisualState;
  flow: number;
  baseline: number;
  /** |flow| / |baseline| */
  ratio: number;
  color: string;
}

export function vesselVisual(id: string, sim: SimResult, occlusions: Occlusion[]): VesselVisual {
  const v = VESSEL_BY_ID[id];
  const occ = occlusions.find((o) => o.vessel === id);
  const flow = sim.hemo.vesselFlow[id] ?? 0;
  const baseline = sim.hemo.baselineFlow[id] ?? 0;
  const ratio = Math.abs(baseline) > 0.2 ? Math.abs(flow) / Math.abs(baseline) : Math.abs(flow) > 0.2 ? 2 : 1;
  if (v?.visualOnly) return { state: 'normal', flow, baseline, ratio: 1, color: VESSEL_COLORS.artery };
  if (occ && occ.severity >= 1) return { state: 'occluded', flow, baseline, ratio: 0, color: VESSEL_COLORS.occluded };
  if (v?.kind === 'collateral') {
    // collaterals carry a trickle at baseline; "active" means recruited well beyond that
    const active = Math.abs(flow) > 1 && Math.abs(flow - baseline) > 1;
    return {
      state: active ? 'collateral_active' : 'collateral_idle',
      flow,
      baseline,
      ratio,
      color: active ? VESSEL_COLORS.collateral : '#b89b5e',
    };
  }
  if (Math.abs(baseline) > 0.3 && Math.abs(flow) < 0.05 * Math.abs(baseline))
    return { state: 'noflow', flow, baseline, ratio, color: VESSEL_COLORS.noFlow };
  if (sim.hemo.reversed.includes(id)) return { state: 'reversed', flow, baseline, ratio, color: VESSEL_COLORS.reversed };
  if (occ) return { state: 'stenosed', flow, baseline, ratio, color: '#f28c28' };
  if (ratio < 0.7) {
    const c = mix(hex(VESSEL_COLORS.noFlow), hex(VESSEL_COLORS.artery), Math.max(0, (ratio - 0.05) / 0.65));
    return { state: 'reduced', flow, baseline, ratio, color: toHex(c) };
  }
  return { state: 'normal', flow, baseline, ratio, color: VESSEL_COLORS.artery };
}
