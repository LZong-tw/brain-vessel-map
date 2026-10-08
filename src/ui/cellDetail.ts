import type { SymptomSystem } from '../anatomy';
import { PART_OF, type SymptomItem } from '../engine/clinical';
import { consciousnessFromShift, symptomsAddedAt, type CascadeEvent } from '../engine/cascade';
import type { SimResult } from '../engine/simulate';
import { symptomKey, systemOf } from './format';
import { foldedInto } from './recoveryFormat';

/** `again`: listed again now that it can be examined, after a stop at which it could not be (X1-2) */
export type SymptomChange = 'new' | 'worse' | 'better' | 'same' | 'again';

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
  /** given by the lesion now but not examinable (SimResult.unexaminable), worst first, each with why */
  unexaminable: { id: string; side: SymptomItem['side']; sev: number; why?: SymptomItem['why'] }[];
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
  const prevHidden = new Map((prev?.unexaminable ?? []).filter(inSystem).map((s) => [symptomKey(s), s] as const));
  const hiddenNow = now.unexaminable.filter(inSystem);
  const hiddenKeys = new Set(hiddenNow.map(symptomKey));
  const tH = now.input.tH;
  // the swelling of both hemispheres together, on the scale of the midline shift (Y2-13)
  const shift = now.edema.massEffectMm;
  const byShift = consciousnessFromShift(shift);
  // an event explains its own symptoms when simulate() adds them, by the same rule (a herniation
  // coma only while the shift is in the coma range; R6-9), and the consciousness level its
  // swelling sets through the mass effect while it is active; the drowsiness of both hemispheres
  // largely out of action is explained by the event that says so (Y2-13)
  const adds = (e: CascadeEvent) => symptomsAddedAt(e, tH, shift);
  const swells = (e: CascadeEvent) => !!e.shiftSymptoms && e.onsetH <= tH && tH < (e.endH ?? Infinity);
  const activeEvents = now.cascade.events.filter((e) => adds(e).length > 0 || swells(e));
  const explains = (e: CascadeEvent, id: string) =>
    adds(e).some((x) => x.id === id) || (swells(e) && (byShift?.id === id || (e.id === 'bilateral_hemispheres' && id === 'somnolence')));
  // a part of a broader deficit of the same side was listed as that deficit, at its severity (U3-7)
  const prevAll = prev ? [...prev.symptoms, ...prev.unexaminable] : [];
  const foldedSev = (s: SymptomItem) => (foldedInto(s, prevAll) ? prevAll.find((x) => x.id === PART_OF[s.id] && x.side === s.side)!.sev : 0);
  const items: CellSymptom[] = now.symptoms
    .filter(inSystem)
    .map((s) => {
      const shownBefore = prevByKey.get(symptomKey(s));
      const hiddenBefore = prevHidden.get(symptomKey(s))?.sev ?? 0;
      const prevSev = shownBefore?.sev ?? (hiddenBefore || foldedSev(s));
      const change: SymptomChange =
        !shownBefore && hiddenBefore > 0 ? 'again' : prevSev === 0 ? 'new' : s.sev > prevSev ? 'worse' : s.sev < prevSev ? 'better' : 'same';
      return {
        id: s.id,
        side: s.side,
        sev: s.sev,
        prevSev,
        change,
        regions: s.sources.filter((r) => r !== ''),
        events: activeEvents.filter((e) => explains(e, s.id)).map((e) => e.id),
        compensated: s.recovery?.compensated ?? 0,
      };
    })
    .sort((a, b) => b.sev - a.sev || a.id.localeCompare(b.id));
  const nowKeys = new Set(items.map((s) => symptomKey(s)));
  // what cannot be examined now has not resolved (X1-2), nor has a part now listed as the broader
  // deficit of the same side that takes it in (U3-7)
  const resolved = [...prevByKey.values()]
    .filter((s) => !nowKeys.has(symptomKey(s)) && !hiddenKeys.has(symptomKey(s)) && !foldedInto(s, [...now.symptoms, ...now.unexaminable]))
    .map((s) => ({ id: s.id, side: s.side, prevSev: s.sev }));
  const unexaminable = hiddenNow.map((s) => ({ id: s.id, side: s.side, sev: s.sev, why: s.why })).sort((a, b) => b.sev - a.sev || a.id.localeCompare(b.id));
  return { system, index, items, resolved, unexaminable };
}
