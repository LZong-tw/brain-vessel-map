import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TIME_STOPS } from '../anatomy/timeline';
import type { CollateralGrade, Occlusion } from '../engine/hemodynamics';
import { simulate, type SimResult } from '../engine/simulate';
import type { TreatmentOptions } from '../engine/treatment';
import { useApp } from '../state/store';

type SeriesDeps = [Occlusion[], string[], number, CollateralGrade, number | null, boolean, TreatmentOptions];

// one shared entry: the details and results panels ask for the same series
let last: { deps: SeriesDeps; series: SimResult[] } | null = null;

function seriesFor(deps: SeriesDeps): SimResult[] {
  if (last && last.deps.every((d, i) => d === deps[i])) return last.series;
  const [occlusions, variants, map, collateral, reperfusionH, decompression, treatment] = deps;
  const series = TIME_STOPS.map((stop) =>
    simulate({ occlusions, variants, map, collateral, tH: stop.h, reperfusionH, decompression, treatment }),
  );
  last = { deps, series };
  return series;
}

/**
 * The simulation at every time stop, for panels that show a whole course at once (time strips,
 * the function heat-map). Haemodynamics and the cascade are cached inside the engine, so the
 * ~20 calls are cheap; the series is memoised on everything except the displayed time.
 */
export function useSimSeries(): SimResult[] {
  const s = useApp(
    useShallow((st) => ({
      occlusions: st.occlusions,
      variants: st.variants,
      map: st.map,
      collateral: st.collateral,
      reperfusionH: st.reperfusionH,
      decompression: st.decompression,
      treatment: st.treatment,
    })),
  );
  return useMemo(
    () => seriesFor([s.occlusions, s.variants, s.map, s.collateral, s.reperfusionH, s.decompression, s.treatment]),
    [s.occlusions, s.variants, s.map, s.collateral, s.reperfusionH, s.decompression, s.treatment],
  );
}
