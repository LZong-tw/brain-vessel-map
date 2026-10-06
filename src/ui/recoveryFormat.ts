/**
 * Panel helpers for temporary dysfunction and compensation (engine/recovery.ts): per-region
 * status, per-symptom outlook, what improved since the previous time stop, heat-map fills.
 */

import { BED_BY_ID, BEDS, REGION_BY_ID } from '../anatomy';
import { NO_BACKUP_KINDS, redundancyFor, type RedundancyKind } from '../anatomy/redundancy';
import type { NihssResult, SymptomItem, UnexaminableWhy } from '../engine/clinical';
import type { SimResult } from '../engine/simulate';
import type { Lang } from '../anatomy/types';
import { RECOVERY_UI } from '../i18n/uiRecovery';
import { SEV_FILL, SYSTEM_ORDER, symptomKey, systemOf } from './format';

/** a symptom counts as "partly compensated" from this share */
export const COMPENSATION_SHOWN = 0.1;
/** a region counts as "temporarily silenced" from this share */
export const SILENCED_SHOWN = 0.02;

const BRAIN = new Set(['cortex', 'deep', 'brainstem', 'cerebellum']);

export interface RegionRecovery {
  /** infarcted fraction */
  dead: number;
  /** alive but temporarily silenced (oedema + remote depression) */
  silenced: number;
  /** … of which remote depression (diaschisis) */
  remote: number;
  /** share of the function lost to dead tissue that other pathways have taken over */
  compensated: number;
}

/** Volume-weighted recovery status of a region at the simulated time. */
export function regionRecovery(sim: SimResult, regionId: string): RegionRecovery {
  const r = REGION_BY_ID[regionId];
  const out: RegionRecovery = { dead: 0, silenced: 0, remote: 0, compensated: sim.recovery.compensated[regionId] ?? 0 };
  if (!r) return out;
  let tot = 0;
  for (const bid of r.beds) {
    const w = BED_BY_ID[bid]?.volume || 1;
    out.dead += (sim.beds[bid]?.infarct ?? 0) * w;
    out.silenced += (sim.recovery.extraDys[bid] ?? 0) * w;
    out.remote += (sim.recovery.diaschisisDys[bid] ?? 0) * w;
    tot += w;
  }
  if (tot > 0) {
    out.dead = Math.max(out.dead / tot, sim.regions[regionId]?.infarct ?? 0);
    out.silenced /= tot;
    out.remote /= tot;
  }
  return out;
}

/** Redundancy of a symptom (from its dominant source when the engine attached it). */
export const symptomBackup = (s: SymptomItem): RedundancyKind => s.recovery?.kind ?? redundancyFor(s.id).kind;
export const hasNoBackup = (s: SymptomItem) => NO_BACKUP_KINDS.has(symptomBackup(s));
export const compensatedShare = (s: SymptomItem) => s.recovery?.compensated ?? 0;

/** Living brain tissue (mL) silenced by oedema and by remote depression at the simulated time. */
export function silencedVolume(sim: SimResult): { edemaMl: number; remoteMl: number } {
  let edemaMl = 0;
  let remoteMl = 0;
  for (const b of BEDS) {
    const x = sim.recovery.extraDys[b.id];
    if (!x || !BRAIN.has(REGION_BY_ID[b.region].category)) continue;
    const remote = sim.recovery.diaschisisDys[b.id] ?? 0;
    edemaMl += (x - remote) * b.volume;
    remoteMl += remote * b.volume;
  }
  return { edemaMl, remoteMl };
}

/** mL of brain tissue that survived and is still regaining its function (after a reopening, or penumbra that collaterals held; Y1-12) */
export function regainingVolume(sim: SimResult): number {
  let ml = 0;
  for (const b of BEDS) if (BRAIN.has(REGION_BY_ID[b.region].category)) ml += (sim.beds[b.id]?.regaining ?? 0) * b.volume;
  return ml;
}

const APHASIA_TYPES = [
  'aphasia_global',
  'aphasia_broca',
  'aphasia_wernicke',
  'aphasia_conduction',
  'aphasia_tc_motor',
  'aphasia_tc_sensory',
  'aphasia_mixed_tc',
];
// symptoms that "disappear" only because they were merged into a larger one
const MERGED_INTO: Record<string, string[]> = {
  quadrant_sup: ['hemianopia', 'cortical_blindness'],
  quadrant_inf: ['hemianopia', 'cortical_blindness'],
  central_scotoma: ['hemianopia', 'cortical_blindness'],
  hemianopia: ['cortical_blindness'],
  // colour loss is not listed in a blind (half-)field (R1-5)
  hemiachromatopsia: ['achromatopsia', 'hemianopia', 'cortical_blindness'],
  achromatopsia: ['cortical_blindness', 'hemianopia'],
  // one aphasia type at a time: a type that is no longer listed has changed into another one
  // (e.g. global → Broca) rather than gone, as long as some aphasia is still listed (C1-F1)
  ...Object.fromEntries(APHASIA_TYPES.map((id) => [id, APHASIA_TYPES.filter((o) => o !== id)])),
  // drowsiness gives way to persistent hypersomnia after two weeks; coma after extensive
  // tegmental damage continues as a disorder of consciousness (C3-F2)
  somnolence: ['coma', 'hypersomnia', 'disorder_of_consciousness'],
  hypersomnia: ['coma', 'disorder_of_consciousness'],
  coma: ['disorder_of_consciousness'],
  // when both lateral medullas fail, the breathing problem is no longer only one of sleep
  central_sleep_apnoea: ['respiratory'],
  // with both frontal eye fields lost the two deviations become one gaze paresis to both sides,
  // and it becomes a deviation again when one side recovers more (Y2-13)
  gaze_deviation: ['gaze_paresis_bilateral'],
  gaze_paresis_bilateral: ['gaze_deviation'],
};

export interface Improvement {
  s: SymptomItem;
  from: number;
  /** 0 = no longer present */
  to: number;
}

/**
 * Symptoms that are milder (or gone) now than in `before`, worst first. A symptom left out of the
 * list because it cannot be examined at the patient's level of consciousness now (`unexaminable`,
 * SimResult.unexaminable) has not improved (X1-2).
 */
export function improvedSince(before: SymptomItem[], now: SymptomItem[], unexaminable: SymptomItem[] = []): Improvement[] {
  const nowByKey = new Map(now.map((s) => [symptomKey(s), s]));
  const nowIds = new Set(now.map((s) => s.id));
  const hidden = new Set(unexaminable.map(symptomKey));
  const out: Improvement[] = [];
  for (const b of before) {
    if (b.delayed) continue;
    const n = nowByKey.get(symptomKey(b));
    if (n) {
      if (n.sev < b.sev) out.push({ s: n, from: b.sev, to: n.sev });
    } else if (
      !hidden.has(symptomKey(b)) &&
      !(MERGED_INTO[b.id] ?? []).some((id) => nowIds.has(id)) &&
      // a deficit of both sides now listed once per side (Y2-17) has not gone
      !(b.side === 'both' && now.some((x) => x.id === b.id))
    ) {
      out.push({ s: b, from: b.sev, to: 0 });
    }
  }
  return out.sort((a, b) => b.from - b.to - (a.from - a.to) || b.from - a.from);
}

/**
 * What the lesion gives but cannot be examined now (SimResult.unexaminable: at the patient's level
 * of consciousness, in a blind patient, in akinetic mutism), worst first, then in the order of the
 * function systems.
 */
export function unexaminableNow(sim: SimResult): SymptomItem[] {
  const rank = (s: SymptomItem) => SYSTEM_ORDER.indexOf(systemOf(s.id));
  return [...sim.unexaminable].sort((a, b) => b.sev - a.sev || rank(a) - rank(b));
}

/**
 * The heading and explanation of a list of signs that cannot be examined (Y2-14, Y2-15): the
 * reason's own when they share one, otherwise a general heading with each reason explained;
 * `tag(s)` names a sign's reason when there are several (empty otherwise).
 */
export function unexaminableHeading(items: { why?: UnexaminableWhy }[], lang: Lang): { label: string; title: string; tag: (s: { why?: UnexaminableWhy }) => string } {
  const rt = RECOVERY_UI[lang];
  const whys = [...new Set(items.map((s) => s.why ?? 'consciousness'))];
  if (whys.length <= 1) {
    const one = rt.unexaminableBy[whys[0] ?? 'consciousness'];
    return { label: one.label, title: one.title, tag: () => '' };
  }
  return {
    label: rt.unexaminableMixedLabel,
    title: whys.map((w) => `${rt.unexaminableBy[w].tag}${lang === 'en' ? ': ' : '：'}${rt.unexaminableBy[w].title}`).join(lang === 'en' ? ' ' : ''),
    tag: (s) => rt.unexaminableBy[s.why ?? 'consciousness'].tag,
  };
}

/** Highest severity each symptom (id + side) has reached in `series`. */
export function peakSeverity(series: SimResult[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of series) for (const sy of s.symptoms) out.set(symptomKey(sy), Math.max(out.get(symptomKey(sy)) ?? 0, sy.sev));
  return out;
}

// ── heat-map fills ──
/** diagonal stripes laid over a severity fill: "partly compensated" */
const HATCH = 'repeating-linear-gradient(135deg, rgba(150, 235, 190, 0.8) 0 1.5px, transparent 1.5px 5px)';
export const withHatch = (color: string) => `${HATCH}, ${color}`;
/**
 * a heat-map cell whose deficits are all there but cannot be examined at the patient's level of
 * consciousness (SimResult.unexaminable): grey dots, neither a severity nor "no loss" (X1-2)
 */
export const UNEXAMINABLE_FILL = 'radial-gradient(circle, rgba(160, 160, 175, 0.85) 0 1px, transparent 1.4px) 0 0 / 4px 4px';
/** fills of the "temporarily silenced" and "compensated" strips (index 1–3 = intensity) */
export const SILENCED_FILL: (string | null)[] = [null, 'rgba(110, 168, 255, 0.35)', 'rgba(110, 168, 255, 0.62)', 'rgba(110, 168, 255, 0.9)'];
export const COMPENSATED_FILL: (string | null)[] = [null, 'rgba(67, 181, 129, 0.35)', 'rgba(67, 181, 129, 0.62)', 'rgba(67, 181, 129, 0.9)'];
export const shareLevel = (x: number) => (x >= 0.3 ? 3 : x >= 0.12 ? 2 : x >= SILENCED_SHOWN ? 1 : 0);

/** fill of an NIHSS cell by category */
export function nihssFill(n: NihssResult): string | null {
  switch (n.category) {
    case 'none':
      return null;
    case 'minor':
      return SEV_FILL[1];
    case 'moderate':
      return SEV_FILL[2];
    default:
      return SEV_FILL[3];
  }
}
