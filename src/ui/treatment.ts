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
import { downstreamBranches, isDefaultTreatment, newTerritoryBranches, type TreatmentMethod, type TreatmentOptions } from '../engine/treatment';
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

/**
 * Branches a clot fragment could block: downstream of the reopened occlusions (nearest first,
 * every one of them) and, separately, in a new territory (engine/treatment.ts).
 */
export function distalOptions(reopened: readonly string[]): { downstream: string[]; newTerritory: string[] } {
  const downstream: string[] = [];
  for (const id of reopened) for (const b of downstreamBranches(id)) if (!downstream.includes(b) && !reopened.includes(b)) downstream.push(b);
  const newTerritory: string[] = [];
  for (const id of reopened)
    for (const b of newTerritoryBranches(id)) if (!newTerritory.includes(b) && !downstream.includes(b) && !reopened.includes(b)) newTerritory.push(b);
  return { downstream, newTerritory };
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

/** "about 12% (5–20%)", "5–20%", or "22%" for a single value */
export function fmtRange(r: EvidenceRange, lang: Lang): string {
  if (r.low === r.high) return fmtShare(r.low);
  return TREATMENT_UI[lang].range(r.typical === undefined ? null : fmtShare(r.typical), percent(r.low), fmtShare(r.high));
}

export interface EvidenceRow {
  key: string;
  label: string;
  value: string;
  note: string;
  source: string;
}

/** medium/distal vessel sites: their own haemorrhage figures and the 2025 trials' warning */
const MEVO_SITES: SiteGroup[] = ['m2', 'distal'];
/** anterior large-vessel sites of the large-core thrombectomy trials */
const LARGE_CORE_SITES: SiteGroup[] = ['ica', 'm1'];
/** sites of EXTEND-IA TNK (ICA, MCA, basilar) */
const TNK_SITES: SiteGroup[] = ['ica', 'm1', 'm2', 'basilar'];

/**
 * The published figures for these sites and this method; entries the evidence lacks are left
 * out. `delayH` (hours from onset to the treatment) adds the late-thrombolysis trials beyond the
 * standard window.
 */
export function evidenceRows(
  ev: RecanalisationEvidence,
  sites: readonly SiteGroup[],
  method: TreatmentMethod,
  lang: Lang,
  { delayH }: { delayH?: number } = {},
): EvidenceRow[] {
  const s = TREATMENT_UI[lang];
  const rows: EvidenceRow[] = [];
  const add = (key: string, label: string, r: EvidenceRange | null | undefined) => {
    if (r) rows.push({ key, label, value: fmtRange(r, lang), note: tr(r.note, lang), source: r.source });
  };
  const has = (groups: SiteGroup[]) => sites.some((g) => groups.includes(g));
  for (const g of sites) add(`success-${g}`, s.rows.success(s.sites[g]), ev.success[g]?.[method]);
  // the large-vessel haemorrhage figures do not apply to medium/distal vessels
  const mevo = ev.sichMevo[method];
  if (!(mevo && sites.length && sites.every((g) => MEVO_SITES.includes(g)))) add('sich', s.rows.sich, ev.sich[method]);
  if (has(MEVO_SITES)) add('sich-mevo', s.rows.sichMevo, mevo);
  if (method !== 'ivt' && has(LARGE_CORE_SITES)) add('sich-largeCore', s.rows.sichLargeCore, ev.sichLargeCore);
  if (method !== 'evt') {
    add('tnk-sich', s.rows.tnkSich, ev.tenecteplase.sich);
    if (has(TNK_SITES)) add('tnk-reperfusion', s.rows.tnkReperfusion, ev.tenecteplase.reperfusionBeforeEvt);
    if (delayH !== undefined && delayH > ev.ivtWindowH + 1e-6) add('lateIvt', s.rows.lateIvt, ev.lateIvt);
  }
  add('reocclusion', s.rows.reocclusion, ev.reocclusion[method]);
  // thrombectomy data: not shown for IV thrombolysis alone
  if (method !== 'ivt') {
    add('distal', s.rows.distal, ev.distalEmbolization);
    add('newTerritory', s.rows.newTerritory, ev.newTerritoryEmbolization);
  }
  add('noReflow', s.rows.noReflow, ev.noReflow);
  return rows;
}

/** large-vessel sites where thrombolysis alone is known to reopen poorly early on */
const LARGE_VESSEL: SiteGroup[] = ['ica', 'm1', 'basilar'];
/** sites the thrombectomy trials enrolled (intracranial ICA, M1, basilar) */
const TRIAL_LVO: SiteGroup[] = ['ica', 'm1', 'basilar'];
/** sites no thrombectomy trial randomised (cervical ICA, V4, cerebellar arteries, perforators …) */
const NO_TRIAL: SiteGroup[] = ['other', 'vertebral'];
const representative = (r: EvidenceRange) => r.typical ?? (r.low + r.high) / 2;

export interface TreatmentWarning {
  key: 'ivtWindow' | 'ivtWindowConsensus' | 'evtWindow' | 'ivtLargeVessel' | 'evtNoTrial' | 'evtMevo';
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
  if (t.method !== 'evt' && delayH > ev.ivtWindowH + eps) {
    // the window refers to when the drug is started; the time chosen here is when flow returns.
    // A guideline consensus window (basilar) keeps a warning, worded as consensus.
    const consensus = sites.length > 0 && sites.every((g) => (ev.ivtConsensusWindowH[g] ?? 0) + eps >= delayH);
    out.push(
      consensus
        ? { key: 'ivtWindowConsensus', text: s.warnIvtWindowConsensus(formatHours(ev.ivtWindowH, lang), formatHours(Math.min(...sites.map((g) => ev.ivtConsensusWindowH[g]!)), lang), delay) }
        : { key: 'ivtWindow', text: s.warnIvtWindow(formatHours(ev.ivtWindowH, lang), delay) },
    );
  }
  if (t.method !== 'ivt' && delayH > ev.evtWindowH + eps)
    out.push({ key: 'evtWindow', text: s.warnEvtWindow(formatHours(ev.evtWindowH, lang), delay) });
  if (t.method !== 'ivt' && sites.length && !sites.some((g) => TRIAL_LVO.includes(g))) {
    if (sites.some((g) => MEVO_SITES.includes(g))) out.push({ key: 'evtMevo', text: s.warnEvtMevo });
    if (sites.some((g) => NO_TRIAL.includes(g))) out.push({ key: 'evtNoTrial', text: s.warnEvtNoTrial });
  }
  if (t.method === 'ivt') {
    for (const g of sites) {
      const r = ev.success[g]?.ivt;
      if (LARGE_VESSEL.includes(g) && r && representative(r) < 0.5) {
        const chance = fmtRange(r, lang);
        out.push({ key: 'ivtLargeVessel', text: g === 'basilar' ? s.warnIvtBasilar(chance) : s.warnIvtLargeVessel(s.sites[g], chance) });
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
