/**
 * Helpers for the treatment details UI: which occlusions the treatment reopens, the branches a
 * clot fragment could block, the published figures to show and the warnings, and the one-line
 * summary for the results.
 */

import { VESSEL_BY_ID, tr, vesselName } from '../anatomy';
import { formatHours } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import type { EvidenceRange, RecanalisationEvidence, SiteGroup } from '../anatomy/recanalisation';
import type { Occlusion } from '../engine/hemodynamics';
import { inWindow, reopenedByTreatment, startOf } from '../engine/schedule';
import { downstreamBranches, isDefaultTreatment, type TreatmentMethod, type TreatmentOptions } from '../engine/treatment';
import { TREATMENT_UI } from '../i18n/uiTreatment';
import { formatClock } from './scheduleFormat';

/** reocclusion choices (hours after reperfusion; null = stays open) */
export const REOCCLUSION_OPTIONS: (number | null)[] = [null, 1, 6, 24];
/** no-reflow choices (share of the reperfused territory) */
export const NO_REFLOW_OPTIONS = [0, 0.15, 0.3];

/**
 * The vessels whose occlusion the treatment at `reperfusionH` reopens: the complete, non-branch
 * occlusions in effect at that moment (engine/schedule.ts), in list order, without duplicates.
 *
 * This is the one place to switch to the engine's own answer once the simulation reports it
 * (`SimResult.treatment?.reopened`); everything else in the treatment UI derives from it.
 */
export function reopenedVesselIds(occlusions: readonly Occlusion[], reperfusionH: number | null): string[] {
  return [...new Set(occlusions.filter((o) => reopenedByTreatment(o, reperfusionH)).map((o) => o.vessel))];
}

/**
 * Hours from the onset of the (most recent) reopened occlusion to the treatment, i.e. the
 * "time since onset" that treatment windows are measured against. Without a reopened occlusion,
 * the treatment time itself.
 */
export function treatmentDelayH(occlusions: readonly Occlusion[], reperfusionH: number, reopened: readonly string[]): number {
  const starts = occlusions.filter((o) => reopened.includes(o.vessel) && inWindow(o, reperfusionH)).map(startOf);
  return starts.length ? reperfusionH - Math.max(...starts) : reperfusionH;
}

/** branches downstream of the reopened occlusions that a clot fragment could block, nearest first */
export function distalOptions(reopened: readonly string[]): string[] {
  const out: string[] = [];
  for (const id of reopened) for (const b of downstreamBranches(id)) if (!out.includes(b) && !reopened.includes(b)) out.push(b);
  return out;
}

/** the site groups of the reopened occlusions (evidence is reported by site) */
export function sitesOf(reopened: readonly string[], siteGroupOf: (baseId: string) => SiteGroup): SiteGroup[] {
  const out: SiteGroup[] = [];
  for (const id of reopened) {
    const v = VESSEL_BY_ID[id];
    if (!v) continue;
    const g = siteGroupOf(v.baseId);
    if (!out.includes(g)) out.push(g);
  }
  return out;
}

/** a proportion in percent without the sign: one decimal below 10 ("2.4"), whole numbers above */
const percent = (x: number): string => (x < 0.1 && x > 0 ? `${+(x * 100).toFixed(1)}` : `${Math.round(x * 100)}`);
/** a proportion as a percentage ("2.4%", "15%") */
export const fmtShare = (x: number): string => `${percent(x)}%`;

/** "about 12% (5–20%)" or "5–20%" */
export function fmtRange(r: EvidenceRange, lang: Lang): string {
  return TREATMENT_UI[lang].range(r.typical === undefined ? null : fmtShare(r.typical), percent(r.low), fmtShare(r.high));
}

export interface EvidenceRow {
  key: string;
  label: string;
  value: string;
  note: string;
  source: string;
}

/** the published figures for these sites and this method; entries the evidence lacks are left out */
export function evidenceRows(ev: RecanalisationEvidence, sites: readonly SiteGroup[], method: TreatmentMethod, lang: Lang): EvidenceRow[] {
  const s = TREATMENT_UI[lang];
  const rows: EvidenceRow[] = [];
  const add = (key: string, label: string, r: EvidenceRange | null | undefined) => {
    if (r) rows.push({ key, label, value: fmtRange(r, lang), note: tr(r.note, lang), source: r.source });
  };
  for (const g of sites) add(`success-${g}`, s.rows.success(s.sites[g]), ev.success[g]?.[method]);
  add('sich', s.rows.sich, ev.sich[method]);
  add('reocclusion', s.rows.reocclusion, ev.reocclusion[method]);
  if (method !== 'ivt') add('distal', s.rows.distal, ev.distalEmbolization);
  add('noReflow', s.rows.noReflow, ev.noReflow);
  return rows;
}

/** large-vessel sites where thrombolysis alone is known to reopen poorly */
const LARGE_VESSEL: SiteGroup[] = ['ica', 'm1', 'basilar'];
const representative = (r: EvidenceRange) => r.typical ?? (r.low + r.high) / 2;

export interface TreatmentWarning {
  key: 'ivtWindow' | 'evtWindow' | 'ivtLargeVessel';
  text: string;
}

/** warnings about the chosen method at this delay and site */
export function treatmentWarnings(
  t: TreatmentOptions,
  delayH: number,
  sites: readonly SiteGroup[],
  ev: RecanalisationEvidence,
  lang: Lang,
): TreatmentWarning[] {
  const s = TREATMENT_UI[lang];
  const out: TreatmentWarning[] = [];
  const delay = formatClock(delayH, lang);
  const eps = 1e-6;
  if (t.method !== 'evt' && delayH > ev.ivtWindowH + eps)
    out.push({ key: 'ivtWindow', text: s.warnIvtWindow(formatHours(ev.ivtWindowH, lang), delay) });
  if (t.method !== 'ivt' && delayH > ev.evtWindowH + eps)
    out.push({ key: 'evtWindow', text: s.warnEvtWindow(formatHours(ev.evtWindowH, lang), delay) });
  if (t.method === 'ivt') {
    for (const g of sites) {
      const r = ev.success[g]?.ivt;
      if (LARGE_VESSEL.includes(g) && r && representative(r) < 0.5) {
        out.push({ key: 'ivtLargeVessel', text: s.warnIvtLargeVessel(s.sites[g], fmtRange(r, lang)) });
        break;
      }
    }
  }
  return out;
}

/** "取栓 · eTICI 2b67 · 6 小時後再阻塞", or null for the default (complete, lasting reperfusion) */
export function treatmentSummary(t: TreatmentOptions, lang: Lang): string | null {
  if (isDefaultTreatment(t)) return null;
  const s = TREATMENT_UI[lang];
  const parts = [s.methodShort[t.method], s.summaryGrade(t.grade)];
  if (t.reocclusionAfterH !== null) parts.push(s.summaryReocclusion(formatHours(t.reocclusionAfterH, lang)));
  if (t.distalEmbolus) {
    const v = VESSEL_BY_ID[t.distalEmbolus];
    parts.push(s.summaryDistal(v ? vesselName(v, lang) : t.distalEmbolus));
  }
  if (t.noReflow > 0) parts.push(s.summaryNoReflow(fmtShare(t.noReflow)));
  return parts.join(' · ');
}
