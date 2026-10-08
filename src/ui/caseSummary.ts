/**
 * One-line summaries of the case being simulated — the conditions before onset, the occlusion
 * events and the treatment — for the case card headers and the summary line above the timeline.
 * Pure: takes the relevant state, returns strings.
 */

import { VESSEL_BY_ID, tr, vesselName } from '../anatomy';
import { lacuneSitesOf } from '../anatomy/lacunes';
import { LOW_MAP } from '../anatomy/syndromes';
import { REPERFUSION_STOPS, formatHours } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import type { CollateralGrade, Occlusion } from '../engine/hemodynamics';
import { endOf, inWindow, phasesOf, startOf } from '../engine/schedule';
import { GRADE_REPERFUSED, type TreatmentOptions } from '../engine/treatment';
import { UI } from '../i18n/ui';
import { CASE_UI } from '../i18n/uiCase';
import { STACK_UI } from '../i18n/uiStack';
import { TREATMENT_UI } from '../i18n/uiTreatment';
import { formatClock } from './scheduleFormat';
import { reopenedVesselIds, treatmentSummary } from './treatment';

/** the parts of the app state that make up a case */
export interface CaseState {
  occlusions: readonly Occlusion[];
  variants: readonly string[];
  map: number;
  collateral: CollateralGrade;
  reperfusionH: number | null;
  treatment: TreatmentOptions;
  decompression: boolean;
}

/** below this mean arterial pressure the whole brain is underperfused: a case even without an occlusion (the watershed label's setting too) */
export { LOW_MAP };

const SEP = ' · ';
/** English summaries that start a header begin with a capital */
const cap = (s: string, lang: Lang) => (lang === 'en' && s ? s[0].toUpperCase() + s.slice(1) : s);

/** there is something to simulate: an occlusion, or a pressure low enough to underperfuse the brain */
export const hasCase = (s: Pick<CaseState, 'occlusions' | 'map'>): boolean => s.occlusions.length > 0 || s.map < LOW_MAP;

/** "側枝良好 · 平均動脈壓 93 · 無解剖變異" */
export function conditionsSummary(s: Pick<CaseState, 'collateral' | 'map' | 'variants'>, lang: Lang): string {
  const c = CASE_UI[lang];
  const variants = s.variants.length ? c.variantCount(s.variants.length) : c.noVariants;
  return cap([c.collateralShort[s.collateral], c.mapShort(s.map), variants].join(SEP), lang);
}

/** the occluded vessels in list order, each once */
export const occludedVessels = (occlusions: readonly Occlusion[]): string[] => [...new Set(occlusions.map((o) => o.vessel))];

const nameOf = (id: string, lang: Lang) => (VESSEL_BY_ID[id] ? vesselName(VESSEL_BY_ID[id], lang) : id);

/** how a single occlusion narrows its vessel, or '' for a complete occlusion */
function degree(o: Occlusion, lang: Lang): string {
  if (o.branch) {
    // a lacune at a site other than the bundle's classic one says where (C6-F5)
    const v = VESSEL_BY_ID[o.vessel];
    const sites = v ? lacuneSitesOf(v.baseId) : [];
    const site = sites.find((x) => x.id === o.lacuneSite);
    return site && site !== sites[0] ? `${UI[lang].lacuneTag}${SEP}${tr(site.name, lang)}` : UI[lang].lacuneTag;
  }
  return o.severity < 1 ? STACK_UI[lang].partial(Math.round(o.severity * 100)) : '';
}

/** the tag next to a vessel in the events card: its degree, or the number of phases */
export function severityTag(occlusions: readonly Occlusion[], vessel: string, lang: Lang): string {
  const idx = phasesOf(occlusions, vessel);
  if (idx.length > 1) return CASE_UI[lang].phases(idx.length);
  if (!idx.length) return '';
  return degree(occlusions[idx[0]], lang) || CASE_UI[lang].complete;
}

/**
 * A vessel with what is unusual about its occlusion: "右小腦後下動脈", "基底動脈中段（狹窄 70%，
 * 3 天起）", "…（5 分鐘後自行再通）" (a TIA), "…（分段）" for a vessel with several phases.
 */
export function vesselSummary(occlusions: readonly Occlusion[], vessel: string, lang: Lang): string {
  const c = CASE_UI[lang];
  const idx = phasesOf(occlusions, vessel);
  const name = nameOf(vessel, lang);
  if (!idx.length) return name;
  const tags: string[] = [];
  if (idx.length > 1) tags.push(c.staged);
  else {
    const o = occlusions[idx[0]];
    const from = startOf(o);
    const to = endOf(o);
    const d = degree(o, lang);
    if (d) tags.push(d);
    if (from > 0) tags.push(c.from(formatClock(from, lang)));
    if (to !== null) tags.push(c.reopensAfter(formatClock(to - from, lang)));
  }
  return tags.length ? c.tagged(name, tags.join(c.tagSep)) : name;
}

/** "基底動脈中段 + 右小腦後下動脈"; more than three: the first two and the total; none: not set (or global hypoperfusion) */
export function eventsSummary(s: Pick<CaseState, 'occlusions' | 'map'>, lang: Lang): string {
  const c = CASE_UI[lang];
  const vessels = occludedVessels(s.occlusions);
  if (!vessels.length) return s.map < LOW_MAP ? c.hypoperfusion : c.notSet;
  const names = vessels.map((v) => vesselSummary(s.occlusions, v, lang));
  return names.length > 3 ? c.moreVessels(names.slice(0, 2).join(c.joinVessels), names.length) : names.join(c.joinVessels);
}

/** a treatment time as the treatment select shows it: "24 小時" after onset, "3 天 6 小時" otherwise */
const treatmentTime = (h: number, lang: Lang) => (REPERFUSION_STOPS.includes(h) ? formatHours(h, lang) : formatClock(h, lang));

/**
 * "未治療", "24 小時再通 · 取栓 · eTICI 2b67", plus decompression when chosen. `compact` puts the
 * treatment details in brackets after the time, for the summary line. An attempt that reopens
 * nothing (eTICI 0) is an attempt at that time, not a reopening (V1-12): the recanalisation event
 * of the same case says it failed. A treatment that finds nothing it can reopen is no reopening
 * either and has no eTICI grade (U2-8): IV thrombolysis for a lacunar occlusion, which the model
 * does not reopen, is named as given then; a time when nothing complete is occluded (a stenosis,
 * an occlusion not begun or already reopened) has nothing to reopen. With a downstream distal
 * embolus the grade is the one the final angiogram shows (U2-9).
 */
export function treatmentLine(s: Pick<CaseState, 'occlusions' | 'reperfusionH' | 'treatment' | 'decompression'>, lang: Lang, compact = false): string {
  const c = CASE_UI[lang];
  const parts: string[] = [];
  const reopened = s.reperfusionH === null ? [] : reopenedVesselIds(s.occlusions, s.reperfusionH);
  if (s.reperfusionH === null) parts.push(s.decompression ? c.noReperfusion : c.untreated);
  else if (!reopened.length) {
    const at = treatmentTime(s.reperfusionH, lang);
    const lacunar = s.occlusions.some((o) => o.branch && o.severity >= 1 && inWindow(o, s.reperfusionH!));
    parts.push(lacunar ? c.lacunarTreatedAt(TREATMENT_UI[lang].methodShort[s.treatment.method], at) : c.nothingToReopenAt(at));
  } else {
    const failed = !!s.treatment && GRADE_REPERFUSED[s.treatment.grade] === 0;
    const when = (failed ? c.attemptedAt : c.reopenedAt)(treatmentTime(s.reperfusionH, lang));
    const details = treatmentSummary(s.treatment, lang, reopened);
    if (!details) parts.push(when);
    else if (compact) parts.push(c.withDetails(when, details));
    else parts.push(when, details);
  }
  if (s.decompression) parts.push(c.decompressionShort);
  const line = parts.join(SEP);
  return compact ? line : cap(line, lang);
}

/**
 * The whole case as segments of one line (join with " · "): what is occluded, the conditions
 * that differ between people and the treatment. A case with nothing to simulate is one segment
 * that says so.
 */
export function caseSummary(s: CaseState, lang: Lang): string[] {
  const c = CASE_UI[lang];
  if (!hasCase(s)) return [c.emptyLine];
  const events = s.occlusions.length ? c.occludedLine(eventsSummary(s, lang)) : c.hypoperfusion;
  const out = [events, c.collateralShort[s.collateral], c.mapShort(s.map)];
  if (s.variants.length) out.push(c.variantCount(s.variants.length));
  out.push(treatmentLine(s, lang, true));
  return out;
}
