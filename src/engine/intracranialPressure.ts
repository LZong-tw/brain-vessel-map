export interface HemorrhagePressureInput {
  addedVolumeMl: number;
  baselineIcpMmHg: number;
  pviMl: number;
  mapMmHg: number;
}
export type HemorrhagePressureResult =
  | { status: 'ok'; icpMmHg: number; cppMmHg: number }
  | { status: 'invalid' | 'overflow' };

// Marmarou et al. 1978, doi:10.3171/jns.1978.48.3.0332:
// PVI = added volume / (log10(P) - log10(P0)). Immediate fixed-compartment
// application to observed hematoma increment is unvalidated, not a growth forecast.
export function simulateHemorrhagePressure(input: HemorrhagePressureInput): HemorrhagePressureResult {
  const { addedVolumeMl: v, baselineIcpMmHg: p0, pviMl: pvi, mapMmHg: map } = input;
  if (![v, p0, pvi, map].every(Number.isFinite) || v < 0 || p0 <= 0 || pvi <= 0 || map <= 0)
    return { status: 'invalid' };
  const icpMmHg = p0 * 10 ** (v / pvi);
  const cppMmHg = map - icpMmHg;
  if (!Number.isFinite(icpMmHg) || !Number.isFinite(cppMmHg)) return { status: 'overflow' };
  return { status: 'ok', icpMmHg, cppMmHg };
}
