import type { SymptomSystem } from '../anatomy';
import type { SymptomItem } from '../engine/clinical';
import type { SimResult } from '../engine/simulate';
import { symptomKey, systemOf } from './format';

export type SymptomChange = 'new' | 'worse' | 'better' | 'same';

export interface CellSymptom {
  id: string;
  side: SymptomItem['side'];
  sev: number;
  /** severity at the previous time stop (0 = absent) */
  prevSev: number;
  change: SymptomChange;
  /** regions whose damage produces it */
  regions: string[];
  /** ids of the course events that produce it (e.g. hydrocephalus → drowsiness) */
  events: string[];
  /** share of the deficit taken over by spared pathways (0–1) */
  compensated: number;
}

export interface CellDetail {
  system: SymptomSystem;
  index: number;
  items: CellSymptom[];
  /** present at the previous stop, gone now */
  resolved: { id: string; side: SymptomItem['side']; prevSev: number }[];
}

/**
 * What lies behind one cell of the function heat-map: the symptoms of `system` at time stop
 * `index`, where each comes from, and how it changed since the previous stop.
 */
export function systemCellDetail(series: SimResult[], index: number, system: SymptomSystem): CellDetail {
  const now = series[index];
  const prev = index > 0 ? series[index - 1] : null;
  const inSystem = (s: SymptomItem) => systemOf(s.id) === system;
  const prevByKey = new Map((prev?.symptoms ?? []).filter(inSystem).map((s) => [symptomKey(s), s] as const));
  const tH = now.input.tH;
  const activeEvents = now.cascade.events.filter((e) => e.symptoms && e.onsetH <= tH && tH < (e.endH ?? Infinity));
  const items: CellSymptom[] = now.symptoms
    .filter(inSystem)
    .map((s) => {
      const prevSev = prevByKey.get(symptomKey(s))?.sev ?? 0;
      const change: SymptomChange = prevSev === 0 ? 'new' : s.sev > prevSev ? 'worse' : s.sev < prevSev ? 'better' : 'same';
      return {
        id: s.id,
        side: s.side,
        sev: s.sev,
        prevSev,
        change,
        regions: s.sources.filter((r) => r !== ''),
        events: activeEvents.filter((e) => e.symptoms!.some((x) => x.id === s.id)).map((e) => e.id),
        compensated: s.recovery?.compensated ?? 0,
      };
    })
    .sort((a, b) => b.sev - a.sev || a.id.localeCompare(b.id));
  const nowKeys = new Set(items.map((s) => symptomKey(s)));
  const resolved = [...prevByKey.values()].filter((s) => !nowKeys.has(symptomKey(s))).map((s) => ({ id: s.id, side: s.side, prevSev: s.sev }));
  return { system, index, items, resolved };
}
