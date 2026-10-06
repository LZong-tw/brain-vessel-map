/**
 * Helpers for the treatment details UI: which occlusions the treatment reopens, the branches a
 * clot fragment could block, the published figures to show and the warnings, and the one-line
 * summary for the results.
 */

import { VESSEL_BY_ID, tr, vesselName } from '../anatomy';
import { formatHours } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import { siteGroupOf as defaultSiteGroupOf, type EvidenceRange, type RecanalisationEvidence, type SiteGroup } from '../anatomy/recanalisation';
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

/**
 * After IV thrombolysis the artery usually reopens gradually over the next 1–3 h (in INTERRSeCT
 * recanalisation was assessed a median of 132.5 min after alteplase was started: Menon BK et al.
 * JAMA 2018;320:1017–1026). The time chosen in the app is when flow returns, so for IV
 * thrombolysis alone the drug was started about 1–3 h before it. With bridging the time is set by
 * thrombectomy and says nothing about when the drug was given.
 */
export const IVT_LAG_H = { min: 1, max: 3 };
/**
 * The middle of that range (close to the INTERRSeCT median): the drug start it implies decides
 * whether IV thrombolysis alone was most likely started within the window (a note) or after it (a
 * warning, with the late-thrombolysis trials). Flow back at 6 h means a start at about 3–5 h,
 * mostly within 4.5 h, so it is no longer called late (X3-6).
 */
const IVT_LAG_MID_H = (IVT_LAG_H.min + IVT_LAG_H.max) / 2;

/** IV thrombolysis alone with flow back `delayH` after onset was most likely started after the window */
export const ivtStartLate = (delayH: number, windowH: number) => delayH - IVT_LAG_MID_H > windowH + 1e-6;

/**
 * When the drug-start range straddles the window: how long the artery must have taken to reopen
 * for the drug to have been started within it ("1.5 h"), else null.
 */
export function ivtLagForWindow(delayH: number, windowH: number, lang: Lang): string | null {
  const eps = 1e-6;
  return delayH - IVT_LAG_H.max <= windowH + eps && delayH - IVT_LAG_H.min > windowH + eps ? formatHours(delayH - windowH, lang) : null;
}

/** "3–5 h" / "3–5 小時": the drug start implied by flow returning `delayH` after onset */
export function ivtStartRange(delayH: number, lang: Lang): string {
  const n = (h: number) => `${+Math.max(0, h).toFixed(1)}`;
  return `${n(delayH - IVT_LAG_H.max)}–${n(delayH - IVT_LAG_H.min)}${lang === 'en' ? ' h' : ' 小時'}`;
}

/** medium/distal vessel sites: their own haemorrhage figures and the 2025 trials' warning */
const MEVO_SITES: SiteGroup[] = ['m2', 'distal'];
/** anterior large-vessel sites of the large-core thrombectomy trials */
const LARGE_CORE_SITES: SiteGroup[] = ['ica', 'm1'];
/** sites of EXTEND-IA TNK (ICA, MCA, basilar) */
const TNK_SITES: SiteGroup[] = ['ica', 'm1', 'm2', 'basilar'];

/**
 * The published figures for these sites and this method; entries the evidence lacks are left
 * out. `delayH` (hours from onset to the treatment) adds the late-thrombolysis trials when IV
 * thrombolysis alone puts the drug start beyond the standard window (flow returning more than
 * 1 h after the window ends), unless every reopened site is the basilar artery: those trials
 * enrolled no basilar occlusions as such (TRACE-III: ICA/MCA), and the basilar consensus window
 * has its own warning. With bridging, thrombectomy sets the time, so nothing is inferred.
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
    const allBasilar = sites.length > 0 && sites.every((g) => g === 'basilar');
    if (method === 'ivt' && delayH !== undefined && ivtStartLate(delayH, ev.ivtWindowH) && !allBasilar) add('lateIvt', s.rows.lateIvt, ev.lateIvt);
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
/** sites no thrombectomy trial randomised (cervical ICA, V4, the cerebellar artery trunks …) */
const NO_TRIAL: SiteGroup[] = ['other', 'vertebral'];
const representative = (r: EvidenceRange) => r.typical ?? (r.low + r.high) / 2;

/**
 * Whether thrombectomy treats an occlusion of this artery at all. Perforators, the ophthalmic
 * artery and the communicating arteries are not thrombectomy targets: for them the course says
 * that thrombectomy is not usually done, and the settings panel says it does not apply rather
 * than calling it an untested individual decision (R4-5).
 */
export function isThrombectomyTarget(vesselId: string): boolean {
  const v = VESSEL_BY_ID[vesselId];
  if (!v) return true;
  return !(v.kind === 'perforator' || v.kind === 'communicating' || v.kind === 'collateral' || v.baseId === 'ophthalmic');
}

export interface TreatmentWarning {
  key:
    | 'ivtWindow'
    | 'ivtWindowConsensus'
    | 'ivtWindowFits'
    | 'ivtTooEarly'
    | 'bridgingDrugStart'
    | 'evtWindow'
    | 'ivtLargeVessel'
    | 'evtNoTrial'
    | 'evtNotApplicable'
    | 'evtMevo';
  /** 'note': a neutral explanation, not a warning */
  level?: 'note';
  text: string;
}

/**
 * Warnings about the chosen method at this delay and site. `reopened` (the reopened arteries)
 * tells arteries thrombectomy does not treat from those no trial tested; `siteGroupOf` must be
 * the one that gave `sites`.
 */
export function treatmentWarnings(
  t: TreatmentOptions,
  delayH: number,
  sites: readonly SiteGroup[],
  ev: RecanalisationEvidence,
  lang: Lang,
  reopened: readonly string[] = [],
  siteGroupOf: (baseId: string) => SiteGroup = defaultSiteGroupOf,
): TreatmentWarning[] {
  const s = TREATMENT_UI[lang];
  const out: TreatmentWarning[] = [];
  const delay = formatClock(delayH, lang);
  const ivtWindow = formatHours(ev.ivtWindowH, lang);
  const eps = 1e-6;
  /** the guideline consensus window (basilar) when every reopened site has one that reaches `h` */
  const consensusUpTo = (h: number) => {
    const windows = sites.map((g) => ev.ivtConsensusWindowH[g]);
    if (!windows.length || windows.some((w) => w === undefined || w + eps < h)) return null;
    return formatHours(Math.min(...(windows as number[])), lang);
  };
  if (t.method === 'ivt') {
    // the window refers to when the drug is started; the time chosen here is when flow returns,
    // usually 1–3 h after the drug: the latest plausible drug start is 1 h before it, and the
    // drug was most likely started 2 h before it (ivtStartLate, X3-6)
    const latestStart = delayH - IVT_LAG_H.min;
    const lag = ivtLagForWindow(delayH, ev.ivtWindowH, lang);
    if (latestStart <= eps) out.push({ key: 'ivtTooEarly', text: s.warnIvtTooEarly(delay) });
    else if (ivtStartLate(delayH, ev.ivtWindowH)) {
      // a guideline consensus window (basilar) keeps a warning, worded as consensus
      const cw = consensusUpTo(latestStart);
      out.push(
        cw
          ? { key: 'ivtWindowConsensus', text: s.warnIvtWindowConsensus(ivtWindow, cw, delay) }
          : { key: 'ivtWindow', text: s.warnIvtWindow(ivtWindow, delay, ivtStartRange(delayH, lang), lag) },
      );
    } else if (delayH > ev.ivtWindowH + eps)
      out.push({ key: 'ivtWindowFits', level: 'note', text: s.noteIvtWindowFits(ivtWindow, delay, ivtStartRange(delayH, lang), lag) });
  }
  // bridging: thrombectomy restores flow, so its time says nothing about when the drug was given
  if (t.method === 'bridging' && delayH > ev.ivtWindowH + eps)
    out.push({ key: 'bridgingDrugStart', level: 'note', text: s.noteBridgingDrugStart(ivtWindow, consensusUpTo(0), delay) });
  if (t.method !== 'ivt' && delayH > ev.evtWindowH + eps)
    out.push({ key: 'evtWindow', text: s.warnEvtWindow(formatHours(ev.evtWindowH, lang), delay) });
  if (t.method !== 'ivt' && sites.length && !sites.some((g) => TRIAL_LVO.includes(g))) {
    const targets = reopened.filter(isThrombectomyTarget);
    // the sites of the arteries thrombectomy treats (all sites when the arteries are not given)
    const evtSites = reopened.length ? sitesOf(targets, siteGroupOf) : sites;
    if (evtSites.some((g) => MEVO_SITES.includes(g))) out.push({ key: 'evtMevo', text: s.warnEvtMevo });
    if (evtSites.some((g) => NO_TRIAL.includes(g))) out.push({ key: 'evtNoTrial', text: s.warnEvtNoTrial });
    if (targets.length < reopened.length) out.push({ key: 'evtNotApplicable', text: s.warnEvtNotApplicable });
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
