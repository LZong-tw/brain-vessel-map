import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { TIME_STOPS } from '../anatomy/timeline';
import { simulate, type SimResult } from '../engine/simulate';
import { UI, type Strings } from '../i18n/ui';
import { useApp } from './store';

export function useT(): Strings {
  return UI[useApp((s) => s.lang)];
}

export function useSimulation(): SimResult {
  const s = useApp(
    useShallow((st) => ({
      occlusions: st.occlusions,
      variants: st.variants,
      map: st.map,
      collateral: st.collateral,
      tIndex: st.tIndex,
      reperfusionH: st.reperfusionH,
      decompression: st.decompression,
    })),
  );
  return useMemo(
    () =>
      simulate({
        occlusions: s.occlusions,
        variants: s.variants,
        map: s.map,
        collateral: s.collateral,
        tH: TIME_STOPS[s.tIndex].h,
        reperfusionH: s.reperfusionH,
        decompression: s.decompression,
      }),
    [s.occlusions, s.variants, s.map, s.collateral, s.tIndex, s.reperfusionH, s.decompression],
  );
}
