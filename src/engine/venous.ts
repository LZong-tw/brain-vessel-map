// Marcotti et al. 2015, doi:10.1186/s12883-015-0352-y, supplement geometry.
// Reduced rigid-tube network; omitted alternative drainage is not calibrated.
export const VENOUS_VESSELS = [
  { id: 'sss', lengthCm: 19.22, diameterCm: 0.45 },
  { id: 'straight', lengthCm: 3.96, diameterCm: 0.17 },
  { id: 'transverse_l', lengthCm: 5.25, diameterCm: 0.88 },
  { id: 'transverse_r', lengthCm: 5.25, diameterCm: 0.88 },
  { id: 'sigmoid_l', lengthCm: 12.25, diameterCm: 0.53 },
  { id: 'sigmoid_r', lengthCm: 12.25, diameterCm: 0.53 },
  { id: 'jugular_l', lengthCm: 15, diameterCm: 1.7 },
  { id: 'jugular_r', lengthCm: 15, diameterCm: 1.7 },
] as const;
export type VenousVesselId = (typeof VENOUS_VESSELS)[number]['id'];
export interface VenousInput {
  cerebralFlowMlMin: number;
  deepFraction: number;
  outletPressureMmHg: number;
  radiusRatios?: Partial<Record<VenousVesselId, number>>;
}
type VesselValues = Record<VenousVesselId, number>;
export type VenousResult =
  | {
      status: 'ok' | 'undetermined';
      pressuresMmHg: { sss: number | null; straight: number | null; confluence: number | null };
      flowsMlMin: VesselValues;
      conductanceRatios: VesselValues;
    }
  | { status: 'invalid' | 'disconnected' | 'overflow' };
const PA_PER_MMHG = 133.322387415;
const FLOW_TO_SI = 1e-6 / 60;
const MU = 0.003; // Published viscosity: 3 cP.
const values = (fn: (id: VenousVesselId) => number): VesselValues =>
  Object.fromEntries(VENOUS_VESSELS.map(({ id }) => [id, fn(id)])) as VesselValues;

export function simulateVenousOutflow(input: VenousInput): VenousResult {
  const { cerebralFlowMlMin: q, deepFraction: f, outletPressureMmHg: outlet } = input;
  if (!Number.isFinite(q) || q < 0 || !Number.isFinite(f) || f < 0 || f > 1 || !Number.isFinite(outlet))
    return { status: 'invalid' };
  for (const [id, ratio] of Object.entries(input.radiusRatios ?? {})) {
    if (!VENOUS_VESSELS.some((v) => v.id === id) || typeof ratio !== 'number' || !Number.isFinite(ratio) || ratio < 0 || ratio > 1)
      return { status: 'invalid' };
  }
  const conductanceRatios = values((id) => (input.radiusRatios?.[id] ?? 1) ** 4);
  const resistance = values((id) => {
    const v = VENOUS_VESSELS.find((v) => v.id === id)!;
    return (128 * MU * v.lengthCm * 0.01) / (Math.PI * (v.diameterCm * 0.01) ** 4);
  });
  const connected = (id: VenousVesselId) => (input.radiusRatios?.[id] ?? 1) > 0;
  const branchIds = (side: 'l' | 'r'): VenousVesselId[] => [`transverse_${side}`, `sigmoid_${side}`, `jugular_${side}`];
  const branch = (side: 'l' | 'r') => {
    const ids = branchIds(side);
    if (ids.some((id) => !connected(id))) return 0;
    return 1 / ids.reduce((sum, id) => sum + resistance[id] / conductanceRatios[id], 0);
  };
  const gl = branch('l');
  const gr = branch('r');
  const qs = q * (1 - f);
  const qd = q * f;
  const hasOutlet = branchIds('l').every(connected) || branchIds('r').every(connected);
  if ((qs > 0 && !connected('sss')) || (qd > 0 && !connected('straight')) || (q > 0 && !hasOutlet))
    return { status: 'disconnected' };
  if (q > 0 && gl + gr === 0) return { status: 'overflow' };
  const pressureRise = q === 0 ? 0 : (q * FLOW_TO_SI) / (gl + gr) / PA_PER_MMHG;
  const pc = hasOutlet ? outlet + pressureRise : null;
  const pl = q === 0 ? 0 : q * (gl / (gl + gr));
  const pr = q === 0 ? 0 : q * (gr / (gl + gr));
  const upstream = (id: 'sss' | 'straight', flow: number) => {
    if (!connected(id) || pc === null) return null;
    return flow === 0 ? pc : pc + (flow * FLOW_TO_SI * resistance[id]) / conductanceRatios[id] / PA_PER_MMHG;
  };
  const pressuresMmHg = { sss: upstream('sss', qs), straight: upstream('straight', qd), confluence: pc };
  const flowsMlMin = values((id) => id === 'sss' ? qs : id === 'straight' ? qd : id.endsWith('_l') ? pl : pr);
  if (Object.values(pressuresMmHg).some((p) => p !== null && !Number.isFinite(p)) || Object.values(flowsMlMin).some((flow) => !Number.isFinite(flow)))
    return { status: 'overflow' };
  return { status: hasOutlet ? 'ok' : 'undetermined', pressuresMmHg, flowsMlMin, conductanceRatios };
}
