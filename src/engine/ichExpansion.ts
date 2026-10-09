export interface IchExpansionInput {
  baselineVolumeMl: number;
  onsetToImagingHours: number;
  antiplatelet: boolean | null;
  anticoagulant: boolean | null;
  eligiblePopulation: boolean;
}

// Al-Shahi Salman et al. 2018, Table 2 four-predictor model.
// DOI: 10.1016/S1474-4422(18)30253-9. Outcome: >6 mL growth on
// protocol repeat imaging (<6 days), not a fixed 24-hour probability.
export function ichExpansionRisk(input: IchExpansionInput): number | null {
  const { baselineVolumeMl: volume, onsetToImagingHours: time, antiplatelet, anticoagulant } = input;
  if (input.eligiblePopulation !== true || !Number.isFinite(volume) || volume <= 0 || volume >= 150
    || !Number.isFinite(time) || time < 0.5 || time > 24
    || typeof antiplatelet !== 'boolean' || typeof anticoagulant !== 'boolean') return null;
  const predictor = -4.426 - 0.230 * time - 0.0776 * volume + 1.196 * Math.sqrt(volume)
    + 0.310 * Number(antiplatelet) + 1.065 * Number(anticoagulant);
  return 1 / (1 + Math.exp(-predictor));
}
