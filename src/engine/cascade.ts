/**
 * Downstream consequences of an infarct over time — including effects on brain regions
 * OUTSIDE the occluded artery's territory (mass effect, herniation, hydrocephalus,
 * diaschisis, Wallerian and trans-synaptic degeneration) and systemic complications.
 *
 * Rule thresholds are simplified from the literature:
 *   • malignant MCA infarction: DWI volume > 145 mL (Oppenheim et al., Stroke 2000);
 *     deterioration within 24–48 h in most, deaths peaking on day 3 (Qureshi et al., Crit Care Med
 *     2003); herniation death in 78% of complete MCA infarcts (Hacke et al., Arch Neurol 1996);
 *     decompressive hemicraniectomy pooled analysis (Vahedi et al., Lancet Neurol 2007);
 *     consciousness and midline shift (Ropper, N Engl J Med 1986)
 *   • space-occupying cerebellar infarction (Wijdicks et al., AHA/ASA statement, Stroke 2014;
 *     Jauss et al., J Neurol 1999; Baki et al., Stroke Vasc Neurol 2025; Amarenco & Hauw, Neurology
 *     1990; Ayling et al., World Neurosurg 2018)
 *   • early and late seizures (Kilpatrick et al. 1990; Labovitz et al. 2001; Szaflarski et al.
 *     2008; Beghi et al. 2011; Bladin et al. 2000; Galovic et al., Lancet Neurol 2018)
 *   • ischaemic cascade: energy failure, excitotoxicity, peri-infarct depolarisations,
 *     inflammation (Dirnagl, Iadecola & Moskowitz, Trends Neurosci 1999)
 *   • crossed cerebellar diaschisis (Pantano, Baron et al., Brain 1986; after thalamic infarcts:
 *     Förster et al., PLoS One 2014)
 *   • Wallerian degeneration on MRI (Kuhn et al., Radiology 1989; Thomalla et al., NeuroImage 2004);
 *     the infarct on MRI after the oedema (Lansberg et al., AJNR 2001; Schlaug et al., Neurology 1997)
 *   • hypertrophic olivary degeneration (Goto & Kaneko 1981; Kitajima et al., Radiology 1994;
 *     Goyal et al., AJNR 2000)
 *   • locked-in syndrome and basilar coma (Bauer et al., J Neurol 1979; Laureys et al., Prog Brain
 *     Res 2005; Patterson & Grabois, Stroke 1986)
 *   • central hyperthermia as a risk after brainstem coma (Parvizi & Damasio, Brain 2003; Sung et
 *     al., Eur Neurol 2009)
 * TODO(medical-review): thresholds and timings are educational approximations.
 */

import { BEDS, BED_BY_ID, REGIONS, REGION_BY_ID, VESSEL_BY_ID, vesselName } from '../anatomy';
import type { Bed, DeficitRef, Family, L, Region, Side } from '../anatomy';
import { DELAYED_ONSET_H, SYMPTOM_BY_ID, symptomOnsetH } from '../anatomy/symptoms';
import { MCA_CORTEX } from '../anatomy/syndromes';
import { formatHours } from '../anatomy/timeline';
import { resolveCurve, vasoRise } from './edema';
import { circleRoutes, type CircleRoute, type HemoResult, type Occlusion } from './hemodynamics';
import type { ReperfusionGrade, TreatmentMethod } from './treatment';
import { isTreatable, reopenedByTreatment, startOf } from './schedule';
import { NOTICEABLE, gradeFactor, tapers } from './recovery';
import { regainedAfterH } from './tissue';
import { PERFORATOR_TISSUE } from './tissueParams';

export type EventKind = 'mechanism' | 'imaging' | 'treatment' | 'secondary' | 'complication' | 'recovery';
export type EventSeverity = 'info' | 'warn' | 'danger' | 'good';

export interface CascadeEvent {
  id: string;
  kind: EventKind;
  severity: EventSeverity;
  onsetH: number;
  peakH?: number;
  endH?: number;
  title: L;
  desc: L;
  /** regions involved (ids) */
  regions: string[];
  /** symptoms produced by this event while active (e.g. coma from brainstem compression) */
  symptoms?: EventSymptom[];
  /**
   * the symptoms apply only while the midline shift (engine/edema.ts) is at least this many mm:
   * the coma of a transtentorial herniation lifts as the swelling subsides (C4-F1), and none comes
   * with a smaller shift, before the oedema peak either (R6-5)
   */
  symptomsWhileShiftMm?: number;
  /**
   * while active, the swelling it describes sets the level of consciousness through the midline
   * shift (consciousnessFromShift; C4-F2): the event that explains a shift-derived drowsiness or coma
   */
  shiftSymptoms?: boolean;
}

/**
 * A symptom an event produces; with `fromH`/`untilH` only for that part of the event (clinical
 * clock), e.g. the level of consciousness that follows a swelling as it grows and subsides (R6-1).
 */
export interface EventSymptom {
  id: string;
  side: Side | 'both' | null;
  sev: 1 | 2 | 3;
  fromH?: number;
  untilH?: number;
}

/**
 * A course that usually or often ends in death, which the model does not represent: a
 * transtentorial herniation without decompression, coma from a swollen cerebellum without
 * suboccipital decompression, or a basilar occlusion that is not reopened, with stupor, coma or a
 * disorder of consciousness (Y3-11).
 */
export type FatalRisk = 'herniation' | 'posterior_fossa' | 'basilar';

/**
 * A lighter caveat: a state with a substantial mortality in its own series, whose 3- and 6-month
 * picture is that of a survivor (Y3-11): a locked-in syndrome that does not clear when blood
 * returns (about 60 % in an early review: Patterson & Grabois 1986), and a bilateral medial
 * medullary infarct (in-hospital mortality 23.8 %: Pongmoragot 2013).
 */
export type SurvivalCaveat = 'locked_in' | 'bilateral_medulla' | 'bilateral_hemispheres';
/**
 * the caveat that both hemispheres are destroyed is kept beside a fatal risk (Z3-12): it says who
 * the survivor is (one in a disorder of consciousness), which the herniation's figures for one
 * hemisphere do not
 */
const KEPT_WITH_FATAL: SurvivalCaveat[] = ['bilateral_hemispheres'];

export type BedEffectKind = 'secondary' | 'compressed' | 'diaschisis' | 'degeneration';

/** an index occlusion that reopens by itself (CascadeInput.spontaneous; U2-10) */
export interface SpontaneousReopening {
  /** when (clinical clock) */
  atH: number;
  /** the arteries that reopen then */
  vessels: string[];
  /** the final infarct (mL) of the same case had they stayed closed: arterial, and with its herniation's secondary infarcts */
  stayedClosed: { total: number; withSecondary: number };
}

export interface BedEffect {
  kind: BedEffectKind;
  onsetH: number;
  /** effect disappears after this time (compression resolves as oedema subsides — if survived) */
  endH?: number;
  event: string;
}

/**
 * All times in and out of the cascade are hours after the onset of ONE ischaemic event. With an
 * occlusion schedule, simulate() passes the index event's clock (t − onset) and shifts the
 * output onto the timeline for display.
 */
export interface CascadeInput {
  /** recanalisation, hours after onset (null: never, or treatment before this event) */
  reperfusionH: number | null;
  decompression: boolean;
  occlusions: Occlusion[];
  hemo: HemoResult;
  /** eventual infarcted fraction per bed (with the chosen treatment) */
  bedFinal: Record<string, number>;
  /** eventual infarcted fraction per bed if nothing were done */
  bedFinalUntreated: Record<string, number>;
  /**
   * the final infarct (mL) if nothing were done, with the secondary infarcts of its own herniation
   * (that course's withSecondary); given when there is a treatment. What the treatment saves is
   * counted against it, so the herniation infarcts it prevents count as saved too (V1-6)
   */
  untreatedWithSecondary?: number;
  /** infarcted fraction per bed at 14 h (≈ the early DWI lesion used to predict malignant oedema) */
  bedEarly: Record<string, number>;
  /** fraction of each region that is dysfunctional in the first hours (core + penumbra) */
  regionAcute: Record<string, number>;
  /**
   * regions hit by a lacunar (single-branch) occlusion in effect at onset: ischaemic although the
   * flow the model sees is unchanged (C6-F2); when nothing else is ischaemic the course is told
   * as a lacunar stroke (C2-F7)
   */
  lacuneIschaemia?: string[];
  /**
   * regions whose final damage is a lacune alone: the infarct level the symptoms see there and the
   * lacune site's own deficit list, if it has one — so a late event follows its late symptom
   * exactly, small infarcts and lacunes included (C10-F2)
   */
  lacuneFinal?: Record<string, { level: number; deficits?: DeficitRef[] }>;
  /**
   * when blood returns to the index territory (hours after onset): treatment that reopened the
   * artery, or an occlusion reopening by itself; null or left out when it never does
   */
  flowReturnsH?: number | null;
  /**
   * when the index occlusion is first reopened (hours after onset): by treatment, or by itself,
   * even if it closes again later; null or left out when it never is. The treatment windows end
   * then (V1-11)
   */
  reopensH?: number | null;
  /**
   * a complete occlusion of the index episode that reopens by itself, before any treatment reopens
   * it, leaving an infarct (U2-10): told at its reopening, with what it saved against the final
   * infarct of the same case had it stayed closed. Left out, none
   */
  spontaneous?: SpontaneousReopening;
  /**
   * how the treatment at reperfusionH went (engine/treatment.ts); left out for the default
   * treatment (complete, lasting reperfusion), which keeps the general event texts
   */
  treatment?: CascadeTreatment;
  /**
   * infarcted fraction per bed when treatment is decided: at reperfusionH, or 6 h after onset
   * without treatment (the large-core thrombectomy trials select on the core at that point)
   */
  bedAtDecision?: Record<string, number>;
  /**
   * how long before the index onset (h) the latest earlier lesion that leaves an infarct of its own
   * began, when that was a day to 3 months before (T2-8): an ischaemic stroke within 3 months counts
   * against IV thrombolysis. Left out, none
   */
  priorInfarctH?: number;
  /** mean arterial pressure (mmHg); left out, no blood-pressure note */
  map?: number;
  /**
   * what the case's symptom list shows in the first two weeks of each lesion (R3-1, Y3-19), from
   * day 2 to day 30 of each lesion (Y3-7), and the brainstem labels over the whole course (X2-10):
   * simulate() samples it in a second pass, so the aspiration, cardiac and venous-thrombosis
   * warnings and the brainstem consciousness events follow the listed deficits and labels exactly
   * (lacunes and deficits that appear later included). Left out (the first pass), there is no
   * aspiration or venous-thrombosis warning and no brainstem consciousness event, and the cardiac
   * warning runs for the index lesion without calling it severe.
   */
  listed?: ListedCourse;
  /**
   * per region, when it first became ischaemic (clinical clock; before the index onset for an
   * earlier lesion): the central-fever risk of the brainstem tegmentum starts with its own lesion
   * (Y3-19). Left out, every lesion dates from the index onset.
   */
  regionOnsetH?: Record<string, number>;
  /**
   * a complete basilar occlusion of the case is never reopened lastingly (no treatment, a failed
   * one, a reocclusion, and no reopening by itself): with stupor or coma listed, the course is
   * often fatal (Y3-11)
   */
  basilarNotReopened?: boolean;
  /**
   * the NIHSS 3 months after the onset with the treatment given and without it, and the fatal
   * risks of the untreated course, worked out by simulate() in the second pass: the recanalisation
   * event is graded by the deficit, the fatal course and the volume it avoids (Y1-12, Z2-3). Left
   * out (the first pass, or no treatment), it is graded by the volume saved.
   */
  reperfusionOutcome?: ReperfusionOutcome;
  /**
   * whether the same case without the reopening at `reopenH` (the treatment's: untreated; an
   * artery's own: had it stayed closed) still shows the classical locked-in state `h` h after the
   * onset (both on the clinical clock), worked out by simulate() in the second pass (T3-11): a
   * locked-in state that turns incomplete credits the reopening only when, without it, it would not
   * have by then. Left out, the reopening is not checked against that course
   */
  lockedInWithout?: (reopenH: number, h: number) => boolean;
  /**
   * the midline shift the oedema model (engine/edema.ts) gives a hemispheric oedema, per side of
   * the swelling (a malignant one, or one with a moderate mass effect), worked out by simulate():
   * an uncal herniation follows only a shift into the coma range, from when it gets there until it
   * falls below it again (R6-5, R6-2), and a swelling that gets there takes the malignant course
   * whatever the infarct's size (W2-1). Left out, the herniation follows the volume rule with its
   * default timing (day 3 to two weeks).
   */
  shift?: Partial<Record<Side, HerniationShift>>;
  /**
   * the swelling of both hemispheres together when both swell (the mass effect from whichever side,
   * or both; clinical clock), worked out by simulate(): when it reaches the coma range while the
   * midline shift of neither side does, the brain herniates downward, centrally (V1-4)
   */
  centralShift?: HerniationShift;
  /**
   * the largest midline shift (mm) over the course, from either side, as the oedema model shows it:
   * with the secondary infarcts of the herniations it decides on (simulate). The text of two
   * hemispheres swelling unequally quotes it; `shift`'s lateral peaks, which leave those infarcts
   * out, decide how they herniate (T1-1: "at most about 7.5 mm" beside a midline shift of 9.35 mm
   * on the Now tab). Left out, the largest of `shift`'s lateral peaks
   */
  shownLateralPeakMm?: number;
  /**
   * when each hemisphere's and the posterior fossa's own lesion began (clinical clock; before the
   * index onset for an earlier lesion): the occlusion start credited with most of its infarct. Its
   * swelling, herniation and oedema events run on that clock (V1-1). Left out, every lesion dates
   * from the index onset.
   */
  hemiOnsetH?: Partial<Record<Side | 'infra', number>>;
  /**
   * what the untreated course infarcts of each bed in the end from the occlusions begun by `h`
   * (clinical clock), worked out by simulate(): a herniation that strikes at `h` compresses the beds
   * still alive then into a secondary infarct, which a later occlusion does not bring back (U1-3).
   * Left out, the untreated final infarct of every occlusion (bedFinalUntreated)
   */
  untreatedFinalBy?: (h: number) => Record<string, number>;
  /**
   * the same for the beds a herniation compresses, when an index artery reopened by itself: the
   * course of the same case had it stayed closed, as a treated reopening is judged on the untreated
   * course (T2-2: judged on the reopened course, the border zones the reopening had partly saved
   * fell under half infarcted, and the herniation killed them whole, more than the closed artery
   * left). Left out, untreatedFinalBy
   */
  compressibleBy?: (h: number) => Record<string, number>;
  /**
   * when each bed's lesion began (clinical clock; lesionOnsetsOf): a hemisphere's swelling is
   * classified by its own lesion, the beds that began within a day of it (U1-2). Left out, every
   * bed dates from the index onset
   */
  bedOnsetH?: Record<string, number>;
  /**
   * the swelling course as the schedule known before its last occlusion showed it, worked out by
   * simulate(): from `startH` (clinical clock), when that occlusion begins, the events of the
   * swelling begun by then are kept as they were — not removed, retitled or ended before then
   * (U1-2, U1-14)
   */
  prior?: { startH: number; events: CascadeEvent[] };
}

/**
 * The events of the swelling course: each hemisphere's oedema (a malignant oedema or a moderate
 * mass effect, and the later ones of the same hemisphere), its herniation, the fatal event of the
 * first herniation, and the cerebellar swelling.
 */
export const SWELLING_EVENT = /^(malignant_edema|mass_effect)_[rl](_\d+)?$|^(subfalcine|uncal)_[rl]$|^central_herniation$|^herniation_fatal_(r|l|central)$|^cerebellar_edema(_\d+)?$/;
/**
 * The events of a treatment or a reopening and of what the course decided at them: the treatment
 * windows, the recanalisation and what followed it (a reocclusion, a distal embolus), an artery
 * reopening by itself, the circle of Willis switched on and the cortical signs of a striatocapsular
 * infarct. Once begun they stay as a later occlusion begins, as the swelling course does (U2: a
 * larger occlusion that became the index event took them away).
 */
export const STORY_EVENT = /^(treatment_window|reperfusion|reocclusion|distal_embolus|spontaneous_recanalisation|willis_compensation|striatocapsular_cortical_[rl])$/;
/** the compartment of a swelling event that classifies a compartment's oedema, or null */
const oedemaKey = (id: string): Side | 'infra' | null => {
  const m = /^(?:malignant_edema|mass_effect)_([rl])(?:_\d+)?$/.exec(id);
  return m ? (m[1] as Side) : /^cerebellar_edema(_\d+)?$/.test(id) ? 'infra' : null;
};

/**
 * Keep the swelling course a later occlusion found begun (U1-2, U1-14): an event of it that had
 * begun is not removed, retitled or ended before the occlusion began. The same event told the same
 * keeps its onset and ends when the newer course ends it, or later; a compartment's oedema told
 * otherwise now (a moderate mass effect becoming a malignant course, a later lesion of the same
 * hemisphere taking over its clock) ends, if it was still running, on the first day of the newer
 * lesion, when the newer one begins; the fatal event stays that of the first herniation.
 */
function keepTheBegun(events: CascadeEvent[], prior: { startH: number; events: CascadeEvent[] }): CascadeEvent[] {
  const { startH } = prior;
  const from = startH + OEDEMA_ONSET_H;
  const begun = prior.events.filter((e) => SWELLING_EVENT.test(e.id) && e.onsetH < startH - 1e-9);
  const out = keepTheBegunStory(events, prior);
  // a compartment's swelling warning due after the occlusion began, but before the newer course
  // tells that compartment's oedema, stays until then
  for (const p of prior.events) {
    const key = oedemaKey(p.id);
    if (!key || !SWELLING_EVENT.test(p.id) || p.onsetH < startH - 1e-9) continue;
    const newer = out.filter((e) => oedemaKey(e.id) === key);
    const next = Math.min(...newer.map((e) => e.onsetH));
    if (!(next > p.onsetH + 1e-9) || newer.some((e) => e.title.en === p.title.en && Math.abs(e.onsetH - p.onsetH) < 1e-6)) continue;
    for (const e of newer.filter((x) => x.id === p.id)) {
      let n = 2;
      while (out.some((x) => x.id === `${p.id}_${n}`)) n++;
      e.id = `${p.id}_${n}`;
    }
    out.push({ ...p, endH: Math.min(p.endH ?? Infinity, next) });
  }
  if (!begun.length) return out;
  const endOf = (p: CascadeEvent, f: CascadeEvent) => {
    const pe = p.endH ?? Infinity;
    return pe <= startH ? pe : Math.max(f.endH ?? Infinity, startH);
  };
  const setEnd = (e: CascadeEvent, h: number) => {
    if (h === Infinity) delete e.endH;
    else e.endH = h;
  };
  for (const p of begun) {
    const key = oedemaKey(p.id);
    const same = out.find((e) => e.id === p.id);
    // (a compartment's oedema that had ended before the occlusion, and one told the same that begins
    // after it, are two swellings: the newer is kept apart, below)
    if (same && same.title.en === p.title.en && (!key || same.onsetH < startH - 1e-9 || (p.endH ?? Infinity) > startH)) {
      same.onsetH = p.onsetH;
      if (p.peakH !== undefined) same.peakH = p.peakH;
      setEnd(same, endOf(p, same));
      continue;
    }
    if (/^herniation_fatal_/.test(p.id)) {
      // (one row, the first herniation's: Y2-13, U1-14)
      const i = out.findIndex((e) => /^herniation_fatal_/.test(e.id));
      if (i >= 0) out.splice(i, 1);
      out.push({ ...p });
      continue;
    }
    const kept: CascadeEvent = { ...p };
    if (key) {
      // the compartment's oedema as it is told now, from the newer lesion's first day
      for (const e of out.filter((x) => oedemaKey(x.id) === key && !begun.includes(x))) {
        if (e.onsetH < from) {
          e.onsetH = from;
          if (e.peakH !== undefined) e.peakH = Math.max(e.peakH, from);
        }
        if (e.id === p.id) {
          let n = 2;
          while (out.some((x) => x.id === `${p.id}_${n}`)) n++;
          e.id = `${p.id}_${n}`;
        }
      }
      if ((kept.endH ?? Infinity) > startH) kept.endH = Math.max(startH, Math.min(kept.endH ?? Infinity, from));
    }
    const i = out.findIndex((e) => e.id === p.id);
    if (i >= 0) out.splice(i, 1, kept);
    else out.push(kept);
  }
  return out;
}

/**
 * Keep the treatment and reopening events (STORY_EVENT) a later occlusion found begun: each stays,
 * with its onset, and does not end before the occlusion began. When the later occlusion becomes the
 * index event, the cascade is told for it and these events of the earlier lesion were gone.
 */
function keepTheBegunStory(events: CascadeEvent[], prior: { startH: number; events: CascadeEvent[] }): CascadeEvent[] {
  const { startH } = prior;
  const out = [...events];
  for (const p of prior.events) {
    if (!STORY_EVENT.test(p.id) || p.onsetH >= startH - 1e-9) continue;
    // (the circle of Willis switched on is one state of the circle, told as it stands now, from
    // when it began)
    const circle = p.id === 'willis_compensation' ? out.find((e) => e.id === p.id && e.onsetH > p.onsetH) : undefined;
    if (circle) circle.onsetH = p.onsetH;
    const same = out.find((e) => e.id === p.id && Math.abs(e.onsetH - p.onsetH) < 1e-6);
    if (!same) {
      out.push({ ...p });
      continue;
    }
    const until = Math.min(p.endH ?? Infinity, startH);
    if ((same.endH ?? Infinity) < until - 1e-9) {
      if (p.endH === undefined) delete same.endH;
      else same.endH = Math.max(until, same.endH ?? -Infinity);
    }
  }
  return out;
}

/**
 * One stretch of a lesion's first two weeks in which the symptom list shows what makes swallowing
 * unsafe (clinical clock): dysphagia, or else a reduced level of consciousness (somnolence, stupor
 * or coma, a disorder of consciousness).
 */
export interface SwallowStretch {
  kind: 'dysphagia' | 'drowsy';
  fromH: number;
  /** when the list first shows something else, or the end of the lesion's two weeks */
  untilH: number;
  /** the regions the listed dysphagia comes from */
  regions: string[];
}

/**
 * The first two weeks of a lesion (clinical clock; those of lesions less than two weeks apart
 * merged), in which the aspiration and cardiac warnings run (Y3-19). A lesion is the index onset,
 * or another occlusion start that leaves an infarct of its own.
 */
export interface ListedWindow {
  fromH: number;
  untilH: number;
  /** when stupor or coma (NIHSS 1a ≥ 2), or a disorder of consciousness, is first listed, or null */
  comaFromH: number | null;
  /**
   * when the stroke is first severe (Prosser 2007's predictor is clinical severity; Y3-5): an
   * NIHSS of 16 or more, or stupor, coma or a disorder of consciousness listed; null: never
   */
  severeFromH: number | null;
  /** it became severe by stupor or coma (not by the NIHSS alone) */
  severeByComa: boolean;
  /** when it stops being severe for the rest of the window (a deficit cleared by a reopening), or null */
  severeEndH: number | null;
  /** the insular cortex acutely ischaemic (≥ 30 %) at a lesion onset in the window */
  insula: string[];
}

/** what the symptom list shows after each lesion (clinical clock) */
export interface ListedCourse {
  /** the stretches with dysphagia or reduced consciousness, in time order, none overlapping (X3-1, X3-3, Y3-19) */
  swallow: SwallowStretch[];
  /** the first two weeks of each lesion, in time order, none overlapping */
  windows: ListedWindow[];
  /**
   * the stretches from day 2 to day 30 of a lesion in which the patient is immobile (Y3-7): a leg
   * that is barely or not at all lifted against gravity (leg weakness of severity 2 or more), stupor
   * or coma, a disorder of consciousness, or a moderate or severe akinetic mutism — the patients who
   * cannot walk to the toilet unaided (CLOTS 3)
   */
  immobile: { fromH: number; untilH: number }[];
  /**
   * the brainstem consciousness course the labels show (X2-7, X2-10, X2-11, X2-15): coma with
   * quadriplegia, a disorder of consciousness after it, classical or incomplete locked-in syndrome,
   * each from when the labels first show it to when they first show something else, on the clock
   * of the lesion that causes it. Null or left out: no bilateral ventral pontine lesion in the
   * case, and no such event.
   */
  brainstem?: BrainstemCourse | null;
  /**
   * when a stupor, coma or disorder of consciousness that the basilar lesion itself causes is
   * first listed, or null: one from a region of the brainstem or the thalamus that its own tissue
   * makes dysfunctional (not one the swelling of a herniation compresses), from when the basilar
   * occlusion that is not reopened begins (Z3-2). Left out: no such occlusion.
   */
  basilarComaFromH?: number | null;
  /**
   * when, after the index onset, no deficit of the brain or the inner ear is listed any more, or
   * null: not within the first two weeks, or not before the next occlusion begins (Z4-11). The TIA
   * story of brain ischaemia that leaves no infarct starts then. Left out: from when the flow
   * comes back.
   */
  deficitClearsH?: number | null;
}

/** what the bilateral ventral pontine labels show (syndromes.ts): basilar_coma, pontine_doc, locked_in, locked_in_incomplete */
export type BrainstemState = 'coma' | 'doc' | 'classical' | 'incomplete';

/** one stretch of the brainstem consciousness course (clinical clock) */
export interface BrainstemSegment {
  state: BrainstemState;
  fromH: number;
  /** when the labels first show something else, or null: to the end */
  untilH: number | null;
  /** when the lesion that causes it began (the bilateral ventral pons became ischaemic) */
  lesionOnsetH: number;
}

export interface BrainstemCourse {
  /** in time order, none overlapping */
  segments: BrainstemSegment[];
  /** when blood returned (clinical clock): a stretch that ends then ends with the reopening */
  reopenH: number[];
}

/** what the oedema model's midline shift does on one side (clinical clock; see CascadeInput.shift) */
export interface HerniationShift {
  /** the largest shift (mm) */
  peakMm: number;
  /** when the shift first reaches the coma range (COMA_SHIFT_MM), or null if it never does */
  comaFromH: number | null;
  /** when, after the herniation began, it falls below the coma range again (null: not within the horizon) */
  comaUntilH: number | null;
  /**
   * the largest midline shift (mm) pushing from this side: the horizontal displacement itself, which
   * only differs from the mass effect when both hemispheres swell (V1-4)
   */
  lateralPeakMm?: number;
  /**
   * the largest shift (mm) this hemisphere's own swelling would give alone: with a side's course,
   * `comaFromH` and `comaUntilH` are those of its own swelling, which decides whether it herniates
   * and when, whatever the other hemisphere does (U1-0)
   */
  ownPeakMm?: number;
  /**
   * the midline shift (mm) pushing from this side when its herniation begins (the subfalcine
   * herniation's onset): with the other hemisphere swelling too, a side pushed across by less than
   * LATERAL_MM herniates downward with it, centrally, keeping its secondary infarcts (U1-0, V1-4)
   */
  acrossMm?: number;
  /**
   * with a side's course, the herniation told as this hemisphere's alone, the other hemisphere's
   * swelling too small to be told: when its own swelling, or the swelling of both together pushing
   * from this side (or from both), first reaches the coma range, and when, after the herniation
   * began, both have fallen below it (null: not within the horizon). That small swelling adds to the
   * mass that herniates it and keeps it in coma, so the herniation comes and goes with the coma, as
   * the text says (and as before U1-0, which only had a swelling of the other hemisphere that is told
   * take a herniation away)
   */
  alone?: { comaFromH: number | null; comaUntilH: number | null };
}

/**
 * Whether an event adds its symptoms at `tH` (on the event's own clock), given the midline shift
 * then: from its onset until its end, and for a herniation coma only while the midline is shifted
 * into the coma range, at any time (C4-F1, R6-5). simulate(), the function heat-map's cell detail
 * (ui/cellDetail.ts) and the checks that the symptom list carries what the active events add use
 * this one rule (R6-9).
 */
export function eventAddsSymptoms(e: CascadeEvent, tH: number, shiftMm: number): boolean {
  if (!e.symptoms || e.onsetH > tH || tH >= (e.endH ?? Infinity)) return false;
  return !(e.symptomsWhileShiftMm !== undefined && shiftMm < e.symptomsWhileShiftMm);
}

/** the symptoms an event adds at `tH` (see eventAddsSymptoms), each within its own part of the event */
export function symptomsAddedAt(e: CascadeEvent, tH: number, shiftMm: number): EventSymptom[] {
  if (!eventAddsSymptoms(e, tH, shiftMm)) return [];
  return e.symptoms!.filter((x) => (x.fromH ?? -Infinity) <= tH && tH < (x.untilH ?? Infinity));
}

/** mean arterial pressure from which the high-blood-pressure note is shown (≈ 170/95 mmHg) */
export const HIGH_MAP = 120;

/**
 * Level of consciousness from the horizontal midline shift (mm) of an acute hemispheric mass:
 * pineal shift 0–3 mm alert, 3–4 mm drowsy, 6–8.5 mm stupor, 8–13 mm coma (Ropper AH. N Engl J
 * Med 1986;314:953–958; 24 patients, mostly haematomas, so the bands are approximate). The model
 * starts drowsiness at the upper end of Ropper's band (4 mm) and counts 4–6 mm as drowsy.
 */
export const DROWSY_SHIFT_MM = 4;
export const STUPOR_SHIFT_MM = 6;
export const COMA_SHIFT_MM = 8;

/**
 * The uncal herniation of a malignant hemispheric oedema without decompression begins on day 3
 * (deaths peak then: Qureshi AI et al. Crit Care Med 2003;31:272–277), or later when the midline
 * shift reaches the coma range only later (R6-5); the subfalcine herniation comes half a day
 * before it and the compression of the rostral pons half a day after.
 */
export const UNCAL_ONSET_H = 72;
export const SUBFALCINE_LEAD_H = 12;
/** the bed effects of a herniation, which the swelling that decides whether it happens leaves out */
export const HERNIATION_EVENT = /^(uncal|subfalcine)_|^central_herniation$/;
/**
 * the midline shift (mm) from which a herniating hemisphere is told as pushed across to the other
 * side as its herniation begins (a subfalcine herniation, then an uncal one), where Ropper's
 * drowsiness band begins; with the other hemisphere swelling so much that the midline moves less,
 * both are pushed down together (central herniation; V1-4, U1-0)
 */
const LATERAL_MM = 4;
const PONS_COMPRESSION_LAG_H = 12;
/** the herniation's end when the oedema model's shift is not known */
const HERNIATION_END_H = 336;
/** a hemisphere's swelling events (a malignant oedema, a moderate mass effect): from day 1 of its lesion to two weeks */
const OEDEMA_ONSET_H = 24;
const OEDEMA_END_H = 336;

/**
 * a hemisphere's final infarct from which its swelling gives mass effect (the moderate-mass-effect
 * event), and the sizes of the malignant course: an early (≤ 14 h) lesion > 145 mL (Oppenheim C et
 * al. Stroke 2000;31:2175–2181) or a very large final infarct
 */
/** the share of each hemisphere infarcted from which both count as destroyed (Z3-12; a model choice) */
const HEMISPHERES_DESTROYED = 2 / 3;
const MASS_EFFECT_ML = 70;
const MALIGNANT_EARLY_ML = 145;
const MALIGNANT_FINAL_ML = 250;
/** the share of a bed that the MCA supplies (its cortical branches and the lenticulostriate arteries) */
const mcaShareOf = (b: Bed) => b.supply.reduce((a, x) => a + (/^(mca_|lenticulostriate_)/.test(x.v) ? x.share : 0), 0);

/** what the shift does to consciousness: drowsy (NIHSS 1a = 1), stupor (2) or coma (3), or nothing (C4-F2) */
export function consciousnessFromShift(mm: number): { id: 'somnolence' | 'coma'; sev: 1 | 2 | 3 } | null {
  if (mm >= COMA_SHIFT_MM) return { id: 'coma', sev: 3 };
  if (mm >= STUPOR_SHIFT_MM) return { id: 'coma', sev: 2 };
  if (mm >= DROWSY_SHIFT_MM) return { id: 'somnolence', sev: 1 };
  return null;
}

/**
 * cerebellar infarct volume (mL) from which it counts as space-occupying and gets the warning to
 * watch for swelling: illustrative, set so that a complete SCA-territory infarct (about 24 mL of
 * cerebellum here) qualifies — SCA infarcts swell too, with delayed coma in 6 of 9 with cerebellar
 * and vestibular signs in an autopsy series (Amarenco & Hauw 1990; R6-3)
 */
export const CEREBELLAR_SPACE_ML = 20;
/** … and from which malignant swelling is more likely than not (Baki 2025: 38 cm³, > 50%) */
export const CEREBELLAR_MALIGNANT_ML = 38;
/** when a malignant cerebellar swelling brings hydrocephalus and brainstem compression (h): the
 * start of day 3, the day deterioration is most frequent (Jauss 1999: days 2–4, most on day 3) */
const CEREBELLAR_DETERIORATION_H = 48;

/**
 * Consciousness under a malignant cerebellar swelling without surgery follows the swelling (R6-1):
 * it falls on day 3, deepens to coma around the swelling peak — delayed coma from cerebellar
 * swelling: 6 of 9 SCA infarcts with cerebellar and vestibular signs in an autopsy series
 * (Amarenco P, Hauw JJ. Neurology 1990;40:1383–1390); patients deteriorating to coma in Jauss
 * 1999 — and, if the patient survives, lightens as the swelling subsides. The swelling's course
 * is the oedema model's (edema.vasoRise × resolveCurve, as a share of its peak). The level at each
 * share is a model choice with no measured equivalent in the posterior fossa: coma from 90% of
 * the peak, and stupor and drowsiness at the same ratios as the midline-shift bands of a swollen
 * hemisphere (8 : 6 : 4 mm, Ropper 1986).
 */
const CB_COMA_SHARE = 0.9;
const CB_STUPOR_SHARE = (CB_COMA_SHARE * STUPOR_SHIFT_MM) / COMA_SHIFT_MM;
const CB_DROWSY_SHARE = (CB_COMA_SHARE * DROWSY_SHIFT_MM) / COMA_SHIFT_MM;
/** when (h after onset) the untreated malignant cerebellar course becomes comatose, and when it is lighter again */
export const CEREBELLAR_COURSE = (() => {
  const raw = (t: number) => vasoRise(t) * resolveCurve(t);
  let peakT = 0;
  let peak = 0;
  for (let t = 0; t <= 400; t += 0.25) if (raw(t) > peak) [peak, peakT] = [raw(t), t];
  const share = (t: number) => raw(t) / peak;
  /** the first time from `from` (in 0.25 h steps) at which `cond` holds */
  const first = (from: number, cond: (t: number) => boolean) => {
    let t = from;
    while (t < 2000 && !cond(t)) t += 0.25;
    return t;
  };
  return {
    comaFromH: first(CEREBELLAR_DETERIORATION_H, (t) => share(t) >= CB_COMA_SHARE),
    comaUntilH: first(peakT, (t) => share(t) < CB_COMA_SHARE),
    stuporUntilH: first(peakT, (t) => share(t) < CB_STUPOR_SHARE),
    drowsyUntilH: first(peakT, (t) => share(t) < CB_DROWSY_SHARE),
  };
})();

/**
 * when a palatal tremor may be listed after a clear trigger (h): weeks to months after the lesion
 * (Tilikete C, Desestret V. Front Neurol 2017;8:302; 1 and 3 months in Chang YY et al. Gaoxiong
 * Yi Xue Ke Xue Za Zhi 1993;9:371–376)
 */
const PALATAL_TREMOR_H = 2160;

/** The treatment details the event texts need (times on the clinical clock, like reperfusionH). */
export interface CascadeTreatment {
  method: TreatmentMethod;
  grade: ReperfusionGrade;
  /** share of the reperfused territory whose microcirculation still does not reperfuse */
  noReflow: number;
  /** share of the territory that gets its flow back (grade less no-reflow) */
  reperfusedFraction: number;
  /** eTICI 0: the attempt reopened nothing */
  failed: boolean;
  /** when the reopened artery closes again (h after onset), or null */
  reocclusionH: number | null;
  /** the branch a clot fragment blocked during the treatment (vessel id), or null */
  distalEmbolus: string | null;
  /** regions supplied by that branch */
  embolusRegions: string[];
  /** the branch lies outside the reopened artery's own tree (a new territory, e.g. the ACA for an M1) */
  embolusNewTerritory?: boolean;
  /**
   * the eTICI grade the final angiogram shows (treatment.angiographicGrade): `grade` lowered by the
   * share of the territory a downstream branch blocked by the clot fragment supplies (U2-9); left
   * out, `grade`
   */
  angioGrade?: ReperfusionGrade;
  /** that branch's share of the reopened arteries' territory (treatment.embolusShare; 0 for a new territory) */
  embolusShare?: number;
}

const METHOD_NAME: Record<TreatmentMethod, L> = {
  evt: { zh: '動脈取栓', en: 'thrombectomy' },
  ivt: { zh: '靜脈血栓溶解', en: 'IV thrombolysis' },
  bridging: { zh: '靜脈血栓溶解＋動脈取栓', en: 'IV thrombolysis + thrombectomy' },
};

/** what each expanded-TICI grade means (the ranges of treatment.GRADE_REPERFUSED) */
const GRADE_MEANING: Record<ReperfusionGrade, L> = {
  '0': { zh: '沒有再灌流', en: 'no reperfusion' },
  '1': { zh: '血流通過血栓，但遠端幾乎沒有灌流', en: 'flow past the clot, but hardly any distal filling' },
  '2a': { zh: '下游區域有 1–49 % 恢復灌流', en: '1–49 % of the downstream territory reperfused' },
  '2b50': { zh: '下游區域有 50–66 % 恢復灌流', en: '50–66 % of the downstream territory reperfused' },
  '2b67': { zh: '下游區域有 67–89 % 恢復灌流', en: '67–89 % of the downstream territory reperfused' },
  '2c': { zh: '下游區域有 90–99 % 恢復灌流', en: '90–99 % of the downstream territory reperfused' },
  '3': { zh: '完全再灌流', en: 'complete reperfusion' },
};

const pct = (x: number) => `${Math.round(x * 100)} %`;
const hoursZh = (h: number) => `${+h.toFixed(1)} 小時`;
const hoursEn = (h: number) => `${+h.toFixed(1)} h`;
/** "Left MCA …" → "left MCA …" inside a sentence (acronyms stay) */
const lowerFirst = (n: string) => (/^[A-Z][a-z]/.test(n) ? n.charAt(0).toLowerCase() + n.slice(1) : n);

/**
 * What the chosen time means after IV thrombolysis alone: it is when flow returns, and the artery
 * usually reopens gradually over 1–3 h after the drug is started (INTERRSeCT: recanalisation
 * assessed a median of 132.5 min after alteplase was started, Menon BK et al. JAMA
 * 2018;320:1017–1026; Seners P et al. Stroke 2016;47:2409–2412). So the drug was started about
 * t − 3 to t − 1 h after onset; flow back within 1 h of onset would put the drug start at or
 * before the onset, which thrombolysis does not achieve (R4-2).
 */
function ivtTimingNote(t: number): L {
  // t: hours from the onset of the reopened occlusion to the return of flow
  const head = {
    zh: '（eTICI 是血管攝影的分級；只打靜脈血栓溶解時，這裡代表下游區域恢復灌流的比例。',
    en: ' (eTICI is graded on angiography; after IV thrombolysis alone it stands for how much of the territory is reperfused. ',
  };
  const latest = t - 1;
  if (latest <= 1e-6)
    return {
      zh: `${head.zh}這個時間是血流恢復的時間，發作後才 ${t < 1 ? `${Math.round(t * 60)} 分鐘` : hoursZh(t)}：比靜脈血栓溶解通常能做到的更快，因為用藥後動脈通常在 1–3 小時內才逐漸打通；一個大型世代研究中，從開始用藥到評估再通的中位數約 2 小時）`,
      en: `${head.en}This is when flow returns, only ${t < 1 ? `${Math.round(t * 60)} min` : hoursEn(t)} after onset: faster than IV thrombolysis usually achieves, since after the drug the artery usually reopens gradually over 1–3 h; in one large cohort recanalisation was assessed a median of about 2 h after the drug was started)`,
    };
  const earliest = Math.max(0, t - 3);
  const n = (h: number) => `${+h.toFixed(1)}`;
  return earliest <= 1e-6
    ? {
        zh: `${head.zh}這個時間是血流恢復的時間：用藥後動脈通常在 1–3 小時內才逐漸打通，所以是在發作後約 ${n(latest)} 小時內就開始用藥）`,
        en: `${head.en}This is when flow returns: after the drug the artery usually reopens gradually over 1–3 h, so the drug was started within about ${n(latest)} h of onset)`,
      }
    : {
        zh: `${head.zh}這個時間是血流恢復的時間：用藥後動脈通常在 1–3 小時內才逐漸打通，所以是在發作後約 ${n(earliest)}–${n(latest)} 小時開始用藥）`,
        en: `${head.en}This is when flow returns: after the drug the artery usually reopens gradually over 1–3 h, so the drug was started about ${n(earliest)}–${n(latest)} h after onset)`,
      };
}

/**
 * The rescued tissue does not work again at the instant blood returns (simulate.ts, Y1-12): only
 * about 1 in 4 thrombectomy patients has an NIHSS below 6 within 30 min of recanalisation (Desai SM
 * et al. Stroke Vasc Interv Neurol 2022;2:e000138); about half of the benefit shows in the NIHSS at
 * 24 h and three quarters at discharge (Kniep H et al. Stroke 2022;53:2828–2837).
 */
const REGAIN_NOTE: L = {
  zh: '救回的組織不會在血流恢復的那一刻就立刻恢復功能：取栓後 30 分鐘內 NIHSS 降到 6 分以下的約只有四分之一；治療帶來的進步約一半在 24 小時的 NIHSS 看得到、四分之三在出院時看得到；缺血越久越深，恢復越慢。',
  en: ' The rescued tissue does not work again the moment blood returns: only about 1 in 4 patients has an NIHSS below 6 within 30 min of thrombectomy; about half of the benefit shows in the NIHSS at 24 h and three quarters at discharge, more slowly after longer or deeper ischaemia.',
};

/** the outcome 3 months after onset with and without the treatment (CascadeInput.reperfusionOutcome) */
export interface ReperfusionOutcome {
  treatedNihss: number;
  untreatedNihss: number;
  /** what usually or often ends the course in death without the treatment (its fatalRisk, Z2-3) */
  untreatedFatal: FatalRisk[];
}

/**
 * A recanalisation is shown as a benefit when it avoids a deficit, a fatal course or a large
 * infarct (Y1-12, Z2-3): an NIHSS at 3 months at least AVOIDED_NIHSS lower than without
 * treatment; a herniation, a brainstem compression or an unreopened basilar occlusion with coma
 * that the untreated course would bring and the treated one does not; or at least SAVED_ML of brain
 * spared. The NIHSS alone misses the last two: the model's 3-month NIHSS of an untreated fatal course
 * is that of a survivor, and the scale rates a right-hemisphere infarct lower than a left one of the
 * same size (for an NIHSS of 16–20 at 24 h the median infarct was 133 mL on the right against 48 mL
 * on the left: Woo D et al. Stroke 1999;30:2355–2359), while the final infarct volume predicts the
 * functional outcome on its own (odds of a better modified Rankin score 0.88 per 10 mL in 1665
 * patients of seven thrombectomy trials: Boers AMM et al. J Neurointerv Surg 2018;10:1137–1142).
 * Rescuing tissue whose loss changes no deficit, course or much volume is told, but not as a
 * benefit. Without the outcome (the first pass), more than 5 mL saved.
 */
const AVOIDED_NIHSS = 2;
/** TODO(medical-review): a round figure, about a third of a large territorial infarct; 50 mL ≈ odds 0.53 by Boers 2018 */
const SAVED_ML = 50;
/**
 * A sliver of tissue saved (T3-11). Deficits are graded in whole steps, so a sliver of tissue at the
 * edge between two grades can tip one: a mid-basilar occlusion with poor collaterals has infarcted
 * the ventral pons by 12 h, and a thrombectomy then saved 0.2 mL of an infarct of 3.8 mL (63 % of the
 * caudal basis infarcted without it, 59 % with it), yet the four limbs moved a little at 3 months
 * instead of not at all (NIHSS 20 against 24): the event said "~0 mL less infarct", credited the
 * reopening with the difference and graded it a benefit, and the incomplete locked-in event said the
 * reopening "saved part of the ventral pons". The model cannot remove such thresholds (a known
 * limitation); a reopening that saves less than SLIVER_ML, the figure the event would round to
 * nothing, and less than SLIVER_SHARE of the infarct the course would leave without it is not
 * credited with the grade it tips: the 3-month NIHSS does not make it a benefit, the event says why,
 * and no locked-in text says it saved the pons. A small brainstem infarct is not a sliver: a
 * reopening that saves 0.4 mL of a 1.5 mL lower-basilar infarct keeps its credit (NIHSS 5 against 17).
 * TODO(medical-review): both limits are a model choice
 */
const SLIVER_ML = 0.5;
const SLIVER_SHARE = 0.1;
/**
 * a locked-in state that turns incomplete credits the reopening before it only when, without that
 * reopening, the state would still be classical this long after (h): the limb movement came back at
 * least a day sooner for it (T3-11). TODO(medical-review): a model choice
 */
const LIS_SOONER_H = 24;
/** a reopening saved a sliver: `saved` mL of an infarct of `without` mL without it (see SLIVER_ML) */
export const savedSliver = (saved: number, without: number) => saved < SLIVER_ML && saved < SLIVER_SHARE * without;
const reperfusionSeverity = (outcome: ReperfusionOutcome | undefined, savedVolume: number, avoided: FatalRisk[] = [], sliver = false): CascadeEvent['severity'] =>
  (outcome ? (!sliver && outcome.untreatedNihss - outcome.treatedNihss >= AVOIDED_NIHSS) || avoided.length > 0 || savedVolume >= SAVED_ML : savedVolume > 5)
    ? 'good'
    : 'info';
/**
 * the saved volume as the recanalisation event quotes it: to a tenth of a millilitre from 0.05 mL
 * to half a millilitre, where the whole figure was "~0 mL" beside a sliver of the brainstem that
 * decided a deficit (T3-11)
 */
const savedPhrase = (v: number): L => {
  const n = v >= SLIVER_ML || v < 0.05 ? v.toFixed(0) : v.toFixed(1);
  return { zh: `約 ${n} mL`, en: `~${n} mL` };
};
/** what the untreated course would have brought that the treated one does not (Z2-3) */
const FATAL_AVOIDED: Record<FatalRisk, L> = {
  herniation: {
    zh: '不治療時，梗塞的水腫很可能造成疝脫，常會致命；治療後模型預期不會發生。',
    en: ' Without treatment the swelling of the infarct would probably cause a herniation, which is often fatal; with it the model does not expect one.',
  },
  posterior_fossa: {
    zh: '不治療時，腫脹的小腦很可能壓迫腦幹，會危及生命；治療後模型預期不會發生。',
    en: ' Without treatment the swollen cerebellum would probably compress the brainstem, which is life-threatening; with it the model does not expect this.',
  },
  basilar: {
    zh: '不治療時，基底動脈沒有打通又昏迷，常會致命；治療後不再是這種情況。',
    en: ' Without treatment the basilar occlusion, not reopened, with coma, would often be fatal; with it this is no longer the case.',
  },
};
/**
 * The sentences that give the NIHSS at 3 months with and without the treatment, what the treatment
 * avoided, and why the scale can show little of it (Z2-3): the same NIHSS is never written as a
 * difference ("about 13 instead of 13"), and an untreated course that is usually fatal is a
 * survivor's score.
 */
function outcomeSentence(
  outcome: ReperfusionOutcome | undefined,
  savedVolume = 0,
  avoided: FatalRisk[] = [],
  treatedFatal = false,
  rightSided = false,
  /** the reopening saved a sliver of tissue (savedSliver, T3-11) */
  sliver = false,
): L {
  if (!outcome) return { zh: '', en: '' };
  const { treatedNihss: t, untreatedNihss: u } = outcome;
  // whose score is a survivor's: the model does not represent death (C4-F1, Y3-11)
  const uf = outcome.untreatedFatal.length > 0;
  const tf = treatedFatal;
  let nihss: L;
  if (uf && tf)
    nihss =
      t === u
        ? { zh: `模型估計 3 個月時，假如病人存活，不論治療與否 NIHSS 都約 ${t} 分。`, en: ` Model estimate: NIHSS at 3 months about ${t} with or without treatment, if the patient survives.` }
        : { zh: `模型估計 3 個月時，假如病人存活，NIHSS 治療後約 ${t} 分、不治療約 ${u} 分。`, en: ` Model estimate: if the patient survives, NIHSS at 3 months about ${t} with treatment and ${u} without.` };
  else if (uf)
    nihss =
      t === u
        ? { zh: `模型估計 3 個月時 NIHSS 約 ${t} 分；不治療時假如病人存活，也約 ${t} 分。`, en: ` Model estimate: NIHSS at 3 months about ${t}; without treatment the same, if the patient survives.` }
        : { zh: `模型估計 3 個月時 NIHSS 約 ${t} 分；不治療時假如病人存活，約 ${u} 分。`, en: ` Model estimate: NIHSS at 3 months about ${t}; without treatment about ${u}, if the patient survives.` };
  else if (tf)
    nihss = { zh: `模型估計 3 個月時 NIHSS 假如病人存活約 ${t} 分（不治療約 ${u} 分）。`, en: ` Model estimate: NIHSS at 3 months about ${t} if the patient survives, and about ${u} without treatment.` };
  else
    nihss =
      t < u && !sliver
        ? { zh: `模型估計 3 個月時 NIHSS 約 ${t} 分（不治療約 ${u} 分）。`, en: ` Model estimate: NIHSS at 3 months about ${t} instead of ${u} without treatment.` }
        : t === u
          ? { zh: `模型估計 3 個月時 NIHSS 不論治療與否都約 ${t} 分。`, en: ` Model estimate: NIHSS at 3 months about ${t} with or without treatment.` }
          : { zh: `模型估計 3 個月時 NIHSS 約 ${t} 分，不治療約 ${u} 分。`, en: ` Model estimate: NIHSS at 3 months about ${t}, and about ${u} without treatment.` };
  const fatal = avoided.map((k) => FATAL_AVOIDED[k]);
  // the scale shows little of a large saving (Boers 2018), and less still on the right (Woo 1999)
  const scale: L =
    u - t < AVOIDED_NIHSS && savedVolume >= SAVED_ML
      ? {
          zh: `NIHSS 看不太出差別，但治療保住了約 ${savedVolume.toFixed(0)} mL 的腦組織，而最終梗塞體積本身就預測日後的功能${rightSided ? '；NIHSS 對右半球梗塞的計分也比同樣大小的左半球梗塞低' : ''}。`,
          en: ` The scale shows little of the difference, but the treatment spared about ${savedVolume.toFixed(0)} mL of brain, and the final infarct volume predicts the functional outcome on its own${rightSided ? '; the NIHSS also scores a right-hemisphere infarct lower than a left one of the same size' : ''}.`,
        }
      : { zh: '', en: '' };
  // a sliver saved does not earn the grade it tips (T3-11); a higher score with the treatment is no
  // benefit to disown
  const tipped: L =
    sliver && t < u
      ? {
          zh: '這次再通救回的組織不到 0.5 mL，模型不把這個差距算作治療的效果：剩下的組織剛好落在模型兩個嚴重度等級的交界，極少量的組織就會讓它落到其中一邊（模型的已知限制）。',
          en: " With less than 0.5 mL saved, the model does not count this gap as the treatment's benefit: the tissue left lies at the edge between two of its grades of severity, which a sliver of tissue tips one way or the other (a known limitation of the model).",
        }
      : { zh: '', en: '' };
  return {
    zh: nihss.zh + tipped.zh + fatal.map((x) => x.zh).join('') + scale.zh,
    en: nihss.en + tipped.en + fatal.map((x) => x.en).join('') + scale.en,
  };
}

/**
 * what the treatment spares, split when part of it is the infarct a herniation of the untreated
 * swelling would have added (the territories it compresses; V1-6): "~382 mL less infarct: ~193 mL
 * of penumbra, and ~189 mL …"
 */
function savedSplit(saved: number, secondary: number): L {
  if (secondary < 0.5) return { zh: '', en: '' };
  const pen = (saved - secondary).toFixed(0);
  const sec = secondary.toFixed(0);
  return {
    zh: `：約 ${pen} mL 是救回的半影區，約 ${sec} mL 是不治療時腫脹造成疝脫、壓迫而梗塞的其他區域`,
    en: `: ~${pen} mL of penumbra, and ~${sec} mL of the territories that the herniation of the untreated swelling would have infarcted`,
  };
}

/**
 * An artery that reopens by itself, leaving an infarct (U2-10): the course is that of a treated
 * reopening at that time, and was told by nothing. Spontaneous recanalisation in about a quarter of
 * occlusions (24.1 %, against 46.2 % after IV thrombolysis), and recanalisation linked to a good
 * outcome at 3 months (odds ratio 4.43): Rha JH, Saver JL. Stroke 2007;38:967–973 (53 studies,
 * 1985–2002), PMID 17272772.
 */
function spontaneousEvent(sp: SpontaneousReopening, saved: number, savedSecondary: number): CascadeEvent {
  const names = sp.vessels.map((id) => VESSEL_BY_ID[id]).filter((v) => !!v);
  const zh = names.map((v) => vesselName(v, 'zh-TW')).join('；');
  const en = names.map((v) => lowerFirst(vesselName(v, 'en'))).join('; ');
  const pen = (saved - savedSecondary).toFixed(0);
  const sec = savedSecondary.toFixed(0);
  const split: L =
    savedSecondary < 0.5
      ? { zh: '', en: '' }
      : {
          zh: `：約 ${pen} mL 是救回的半影區，約 ${sec} mL 是血管一直阻塞時腫脹造成疝脫、壓迫而梗塞的其他區域`,
          en: `: ~${pen} mL of penumbra, and ~${sec} mL of the territories that the herniation of the swelling would have infarcted had it stayed closed`,
        };
  return {
    id: 'spontaneous_recanalisation',
    kind: 'mechanism',
    severity: saved > 5 ? 'good' : 'info',
    onsetH: sp.atH,
    title: { zh: '血管自行再通', en: 'The artery reopens by itself' },
    desc: {
      zh: `發作後約 ${hoursZh(sp.atH)}，阻塞的血管（${zh}）在沒有任何治療下自行再通（自發性再通：血栓碎裂，或被身體自己的纖維蛋白溶解作用溶掉）。血流恢復時尚未壞死的半影區被救回，${
        saved < 1 ? '但這裡比血管一直阻塞少不到 1 mL 的梗塞' : `模型估計比血管一直阻塞少了約 ${saved.toFixed(0)} mL 的梗塞${split.zh}`
      }。和治療打通時一樣，救回的組織要數小時到數天才逐漸恢復功能，已經壞死的核心不會恢復。血管確實會自行打開：一項 53 個研究（1985–2002 年）的統合分析中，約四分之一的阻塞（24%）沒有治療就再通，靜脈血栓溶解後約 46%；再通與 3 個月時預後良好有關（勝算比 4.4）。`,
      en: `About ${hoursEn(sp.atH)} after onset the occluded artery (${en}) reopens without any treatment (spontaneous recanalisation: the clot breaks up or is dissolved by the body's own fibrinolysis). Restored flow rescues penumbra that has not yet died — ${
        saved < 1 ? 'here less than 1 mL, against an artery that stayed closed' : `the model estimates ~${saved.toFixed(0)} mL less infarct than if it had stayed closed${split.en}`
      }. As after a treated reopening, the rescued tissue works again only over hours to days, and the dead core does not recover. Arteries do reopen by themselves: in a meta-analysis of 53 studies (1985–2002) about a quarter of occlusions (24 %) reopened without treatment, against 46 % after IV thrombolysis; recanalisation was linked to a good outcome at 3 months (odds ratio 4.4).`,
    },
    regions: [],
  };
}

/**
 * The recanalisation event when the treatment details differ from the default: it names the
 * method and the eTICI grade, says how much of the territory got its flow back, and says so when
 * the attempt failed.
 */
function reperfusionEvent(
  t: CascadeTreatment,
  reperfusionH: number,
  savedVolume: number,
  delayH: number,
  outcome?: ReperfusionOutcome,
  avoided: FatalRisk[] = [],
  treatedFatal = false,
  rightSided = false,
  savedSecondary = 0,
  sliver = false,
): CascadeEvent {
  const m = METHOD_NAME[t.method];
  const g = GRADE_MEANING[t.grade];
  // eTICI is read on an angiogram; after IV thrombolysis alone it stands for the reperfused share
  const ivtNote: L = t.method === 'ivt' ? ivtTimingNote(delayH) : { zh: '', en: '' };
  // the grade the angiogram shows: a downstream branch that a clot fragment blocks counts as not
  // reperfused, so eTICI 3 is never shown beside it (U2-9)
  const shown = t.angioGrade ?? t.grade;
  const gs = GRADE_MEANING[shown];
  const ev = t.distalEmbolus !== null ? VESSEL_BY_ID[t.distalEmbolus] : undefined;
  const cutBranch: L =
    shown !== t.grade && ev
      ? {
          zh: `血栓碎片塞住了${vesselName(ev, 'zh-TW')}，約占這區的 ${pct(t.embolusShare ?? 0)}，最後的血管攝影把它算成沒有再灌流；其餘區域的再灌流相當於 eTICI ${t.grade}（${g.zh}）。`,
          en: ` A clot fragment blocks the ${lowerFirst(vesselName(ev, 'en'))}, about ${pct(t.embolusShare ?? 0)} of the territory, which the final angiogram counts as not reperfused; the rest of the territory was reperfused as with eTICI ${t.grade} (${g.en}).`,
        }
      : { zh: '', en: '' };
  if (t.failed) {
    return {
      id: 'reperfusion',
      kind: 'treatment',
      severity: 'warn',
      onsetH: reperfusionH,
      title: { zh: `再通失敗：${m.zh}（eTICI 0）`, en: `Recanalisation failed: ${m.en} (eTICI 0)` },
      desc: {
        zh: `${m.zh}沒有打通阻塞的血管（eTICI 0，${g.zh}）：血栓留在原處，組織的結果和沒有治療時一樣。這次嘗試本身仍可能帶來出血等併發症。`,
        en: `${m.en.charAt(0).toUpperCase()}${m.en.slice(1)} did not reopen the occluded artery (eTICI 0, ${g.en}): the clot stays, and the tissue fares as it would without treatment. The attempt itself can still bring complications such as bleeding.`,
      },
      regions: [],
    };
  }
  const late = reperfusionH > 6;
  const partial = t.reperfusedFraction < 1;
  const noReflowZh = t.noReflow > 0 ? `其中約 ${pct(t.noReflow)} 的組織大血管雖通、微血管仍不通（無再流現象）。` : '';
  const noReflowEn = t.noReflow > 0 ? ` In about ${pct(t.noReflow)} of it the microcirculation stays shut although the artery is open (no-reflow).` : '';
  const shareZh = partial ? `模型讓約 ${pct(t.reperfusedFraction)} 的下游區域恢復血流，其餘仍照未治療的病程。` : '';
  const shareEn = partial ? ` The model gives about ${pct(t.reperfusedFraction)} of the downstream territory its flow back; the rest follows the untreated course.` : '';
  const reclosesZh = t.reocclusionH !== null ? '（血管之後又再阻塞，見「再阻塞」）' : '';
  const reclosesEn = t.reocclusionH !== null ? ' in the end (the artery later closes again: see "Reocclusion")' : '';
  const o = outcomeSentence(outcome, savedVolume, avoided, treatedFatal, rightSided, sliver);
  const sp = savedPhrase(savedVolume);
  return {
    id: 'reperfusion',
    kind: 'treatment',
    severity: reperfusionSeverity(outcome, savedVolume, avoided, sliver),
    onsetH: reperfusionH,
    title: { zh: `血管再通：${m.zh}，eTICI ${shown}`, en: `Recanalisation: ${m.en}, eTICI ${shown}` },
    desc: {
      zh: `eTICI ${shown}：${gs.zh}${ivtNote.zh}。${cutBranch.zh}${noReflowZh}${shareZh}血流恢復時尚未壞死的半影區被救回，模型估計少了${sp.zh} 的梗塞${reclosesZh}${savedSplit(savedVolume, savedSecondary).zh}。${o.zh}${REGAIN_NOTE.zh}已經壞死的核心不會恢復；${late ? '較晚再通時，' : ''}再灌流也可能帶來出血轉化與再灌流傷害。`,
      en: `eTICI ${shown}: ${gs.en}${ivtNote.en}.${cutBranch.en}${noReflowEn}${shareEn} Restored flow rescues penumbra that has not yet died — the model estimates ${sp.en} less infarct${reclosesEn}${savedSplit(savedVolume, savedSecondary).en}.${o.en}${REGAIN_NOTE.en} The dead core does not recover; ${late ? 'with late recanalisation ' : ''}reperfusion can also bring haemorrhagic transformation and reperfusion injury.`,
    },
    regions: [],
  };
}

/** The complications the treatment itself caused: the artery closing again, a clot fragment in a branch. */
function pushTreatmentComplications(events: CascadeEvent[], t: CascadeTreatment, reperfusionH: number): void {
  if (t.reocclusionH !== null) {
    const after = t.reocclusionH - reperfusionH;
    events.push({
      id: 'reocclusion',
      kind: 'complication',
      severity: 'danger',
      onsetH: t.reocclusionH,
      title: { zh: '再阻塞：打通的血管又塞住了', en: 'Reocclusion: the reopened artery closes again' },
      desc: {
        zh: `再通約 ${hoursZh(after)}後，同一條血管又完全阻塞（例如在殘餘狹窄或受損的血管壁上再形成血栓）。這區組織再度缺血，症狀常再次惡化。在模型裡，側枝撐不住的組織最後仍會壞死，和從未打通時差不多：再通只是把損失延後。越晚再阻塞，梗塞長得越慢；但只要血管沒有再打開，最終梗塞就和沒有治療時相當。`,
        en: `About ${hoursEn(after)} after reperfusion the same artery occludes completely again (e.g. new thrombus on a residual stenosis or a damaged vessel wall). Its territory becomes ischaemic again and the deficit often worsens again. In the model, tissue that collaterals cannot sustain is still lost in the end, about as much as if the artery had never been opened: reopening only postponed the loss. The later it recloses, the more slowly the infarct grows, but unless the artery is opened again the final infarct is about that of no treatment.`,
      },
      regions: [],
    });
  }
  if (t.distalEmbolus !== null && VESSEL_BY_ID[t.distalEmbolus]) {
    const v = VESSEL_BY_ID[t.distalEmbolus];
    const zh = vesselName(v, 'zh-TW');
    const en = vesselName(v, 'en');
    // a fragment reaching a previously unaffected territory (most often the ACA during MCA
    // thrombectomy: Singh N et al. Stroke 2023;54:1477–1483; Beyeler M et al. J Neurointerv Surg 2022)
    if (t.embolusNewTerritory) {
      events.push({
        id: 'distal_embolus',
        kind: 'complication',
        severity: 'warn',
        onsetH: reperfusionH,
        title: { zh: `新區域栓塞：${zh}`, en: `Embolus to a new territory: ${en}` },
        desc: {
          zh: `治療時一小塊血栓碎片跑到原本沒有受影響的區域，塞住了${zh}。這是另一條動脈的供血區，原本的阻塞打通了，這裡卻出現新的缺血，側枝循環補不上的部分會梗塞。取栓研究中這類新區域栓塞約 5–9%（最常見於前大腦動脈區），多半在血管攝影上看不到阻塞，並與較差的預後與較高的死亡率有關。`,
          en: `During the treatment a fragment of the clot reached a previously unaffected territory and blocked the ${lowerFirst(en)}. This is another artery's territory: the original occlusion is open, but new ischaemia appears here, and what collaterals cannot make up for infarcts. In thrombectomy studies such new-territory emboli occur in about 5–9% (most often in the ACA territory); most show no visible occlusion on angiography, and they are associated with worse outcome and higher mortality.`,
        },
        regions: t.embolusRegions,
      });
      return;
    }
    events.push({
      id: 'distal_embolus',
      kind: 'complication',
      severity: 'warn',
      onsetH: reperfusionH,
      title: { zh: `遠端栓塞：${zh}`, en: `Distal embolus: ${en}` },
      desc: {
        zh: `血栓被取出或溶解時，一小塊碎片被沖到下游，塞住了${zh}。主幹雖然打通，這條分支供應的區域仍然缺血，側枝循環補不上的部分會梗塞（血管攝影上這常是只達 eTICI 2b、而非 3 的原因）。有時還能再取出，但細小的遠端分支常只能靠側枝循環。`,
        en: `While the clot was retrieved or dissolved, a fragment was carried downstream and blocked the ${lowerFirst(en)}. The main artery is open, but the territory of this branch stays ischaemic, and what collaterals cannot make up for infarcts (on angiography such a cut-off branch is often why the result is eTICI 2b rather than 3). It can sometimes be retrieved too, but small distal branches often have to rely on collaterals.`,
      },
      regions: t.embolusRegions,
    });
  }
}

export interface CascadeOutput {
  events: CascadeEvent[];
  bedEffects: Record<string, BedEffect[]>;
  /** mL, eventual infarct volume per compartment */
  /** eventual infarct volumes of the arterial occlusion itself (mL); `withSecondary` adds tissue lost to herniation etc. */
  volumes: { supra: Record<Side, number>; cerebellum: Record<Side, number>; brainstem: number; total: number; withSecondary: number };
  /**
   * mL the treatment spares in the end: the untreated final infarct with its herniation's secondary
   * infarcts less this course's (V1-6); without the untreated course's figure, of the primary
   * infarct only
   */
  savedVolume: number;
  /** … of which the infarcts a herniation of the untreated swelling would have added (V1-6) */
  savedSecondary: number;
  /**
   * an index occlusion that reopened by itself, leaving an infarct (U2-10): when, and what it saved
   * against the same case had it stayed closed (mL; of which the infarcts of that course's herniation)
   */
  spontaneous: { atH: number; saved: number; savedSecondary: number } | null;
  hydrocephalusOnsetH: number | null;
  /** when the acute obstructive episode is over (the 'hydrocephalus' event's endH) */
  hydrocephalusEndH: number | null;
  /**
   * courses that usually or often end in death, which the model does not represent: a
   * transtentorial herniation without decompression, brainstem compression with coma from a
   * swollen cerebellum without suboccipital decompression (C4-F1), or a basilar occlusion that is
   * not reopened, with stupor or coma (Y3-11). The late course then assumes survival.
   */
  fatalRisk: FatalRisk[];
  /**
   * states with a substantial mortality of their own, not usually fatal (Y3-11): the late course
   * is that of a survivor. Left empty when a fatal risk already says so.
   */
  survivalCaveat: SurvivalCaveat[];
  /**
   * the hemispheres that herniate, to their own side or downward with the other one, with the
   * secondary infarcts of their herniation (simulate() times them with those infarcts' swelling)
   */
  herniated?: Side[];
  /**
   * from when a palatal tremor may be listed (h), or null: only after a clear infarct of the
   * dentate nucleus, the red nucleus region or the pontine tegmentum (C3-F11)
   */
  palatalTremorFromH: number | null;
}

/**
 * Only the retina is ischaemic (an ophthalmic or central retinal artery embolus): the brain-stroke
 * story (brain DWI, thrombolysis windows for brain tissue) does not apply as such.
 * Retinal survival time: Hayreh SS et al. Exp Eye Res 2004;78:723–736 (no detectable damage after
 * 97 min, massive damage after about 240 min, in old hypertensive monkeys); Tobalem S et al. BMC
 * Ophthalmol 2018;18:101 (in people probably about 12–15 min of complete occlusion; the shorter
 * estimate is the one the model uses, see RETINA_TISSUE in tissueParams.ts).
 * Management as a stroke equivalent: Mac Grory B et al. Stroke 2021;52:e282–e294 (AHA scientific
 * statement on central retinal artery occlusion).
 */
function pushEyeEvents(events: CascadeEvent[]): void {
  events.push({
    id: 'retinal_ischaemia',
    kind: 'mechanism',
    severity: 'danger',
    onsetH: 0,
    endH: 6,
    title: { zh: '視網膜缺血（數秒內失明）', en: 'Retinal ischaemia (vision lost within seconds)' },
    desc: {
      zh: '視網膜是中樞神經的一部分，由眼動脈分出的視網膜中央動脈單獨供應，沒有側枝。血流一中斷，數秒內那隻眼睛就看不見。若栓子在幾分鐘內被沖走，視力恢復，稱為「一過性黑矇」；若持續阻塞，視網膜內層會不可逆壞死，但多快並不確定：在年老、有動脈硬化與高血壓的猴子，完全阻塞 97 分鐘幾乎看不到損傷、約 4 小時則大範圍壞死；一篇回顧認為這些實驗有重要缺陷，人類完全阻塞約 12–15 分鐘後就可能開始梗塞，而許多阻塞並不完全，所以較晚治療仍偶有效果。模型採用較短的估計：完全阻塞約 12 分鐘後視網膜開始壞死；部分阻塞（程度 < 100%）撐得較久。這裡沒有腦組織缺血。',
      en: 'The retina is part of the central nervous system and is fed by the central retinal artery, a branch of the ophthalmic artery with no collaterals. When flow stops, that eye goes blind within seconds. If the embolus clears within minutes, vision returns (amaurosis fugax); if it stays, the inner retina dies irreversibly, but how fast is uncertain: in old, atherosclerotic, hypertensive monkeys 97 min of complete occlusion left practically no detectable damage and about 4 h massive damage, while a review argues that these experiments are flawed, that in people the inner retina probably starts to infarct after about 12–15 min of complete occlusion, and that many occlusions are incomplete, which is why later treatment sometimes still helps. The model follows the shorter estimate: the retina starts to die after about 12 min of complete occlusion; a partial occlusion (severity < 100%) lasts longer. No brain tissue is ischaemic here.',
    },
    regions: [],
  });
  events.push({
    id: 'eye_stroke_workup',
    kind: 'treatment',
    severity: 'warn',
    onsetH: 0,
    endH: 24,
    title: { zh: '眼中風是腦中風的警訊', en: 'An eye stroke is a brain-stroke warning' },
    desc: {
      zh: '一過性黑矇與視網膜中央動脈阻塞都應視同中風急症：立即送有中風團隊的急診，而不是只看眼科門診。要找栓子來源（頸動脈狹窄、心房顫動等），並做腦部 MRI——部分病人會發現同時發生、沒有症狀的腦梗塞；接下來數週腦中風的風險最高。靜脈血栓溶解對視網膜中央動脈阻塞的效益仍在臨床試驗中。',
      en: 'Amaurosis fugax and central retinal artery occlusion should be treated as stroke emergencies: go straight to an emergency department with a stroke team, not only to an eye clinic. The source of the embolus must be found (carotid stenosis, atrial fibrillation …) and a brain MRI done — some patients have silent brain infarcts at the same time, and the risk of a brain stroke is highest in the following weeks. Whether IV thrombolysis helps central retinal artery occlusion is still being tested in trials.',
    },
    regions: [],
  });
  events.push({
    id: 'imaging_retina',
    kind: 'imaging',
    severity: 'info',
    onsetH: 0.1,
    endH: 336,
    title: { zh: '檢查：看眼底，不是腦部 DWI', en: 'Examination: the fundus, not brain DWI' },
    desc: {
      zh: '腦部 DWI 看不到視網膜的缺血（它只用來找同時發生的腦梗塞）。持續阻塞時，眼底鏡在數小時內可見視網膜變白與黃斑「櫻桃紅斑」，光學同調斷層掃描（OCT）可見內層視網膜水腫增厚；栓子本身有時也看得到。',
      en: 'Brain DWI does not show retinal ischaemia (it is used to look for concurrent brain infarcts). With a persistent occlusion the fundus shows a whitened retina and a macular "cherry-red spot" within hours, and optical coherence tomography (OCT) shows a swollen, thickened inner retina; sometimes the embolus itself is visible.',
    },
    regions: [],
  });
}

/**
 * Only the inner ear is infarcted (a labyrinthine artery occlusion): an end-organ infarct that
 * brain DWI does not show, and a warning of AICA or basilar stroke — not a TIA, although no brain
 * tissue dies (C7-F7). A vascular cause usually takes hearing and the vestibule together (49 of
 * 82 AICA infarcts), and 13 of those 82 had transient vertigo or hearing episodes within the month
 * before (Lee H et al. Stroke 2009;40:3745–3751, PMID 19797177); 9 of 29 people with sudden
 * deafness from vertebrobasilar ischaemia first had only the ear symptoms, the brain signs coming
 * later (Lee H, Baloh RW. J Neurol Sci 2005;228:99–104, PMID 15607217); a unilateral canal paresis
 * on the deaf side in 56 of 62 (Kim HA et al. J Neurol Sci 2014;339:176–182, PMID 24581671); an
 * abnormal head-impulse test wrongly suggested a peripheral cause in lateral pontine strokes, and
 * the first DWI missed 12 % of strokes within 48 h (Kattah JC et al. Stroke 2009;40:3504–3510,
 * PMID 19762709).
 */
/** sudden deafness with vertigo is a stroke emergency (the inner-ear story, and an inner-ear attack while it lasts: Z4-11) */
const EAR_WORKUP: L = {
  zh: '突發單側耳聾合併眩暈，可能是小腦前下動脈或基底動脈中風的第一個徵兆：82 例 AICA 梗塞中，有 13 例在之前一個月內出現過短暫的眩暈或聽覺症狀；另一系列 29 位椎基底動脈缺血造成突發耳聾的人中，9 位一開始只有耳朵的症狀，腦部的徵象之後才出現。要當成中風急症處理：盡快做腦部與血管影像，並開始中風預防。床邊的甩頭測試在這類中風也可能異常、看起來像內耳炎，所以不能只靠它排除中風。',
  en: 'Sudden one-sided deafness with vertigo can be the first sign of an AICA or basilar stroke: 13 of 82 AICA infarcts were preceded by transient vertigo or hearing episodes within the month before, and of 29 people with sudden deafness from vertebrobasilar ischaemia, 9 first had only the ear symptoms and the brain signs came later. Treat it as a stroke emergency: urgent imaging of the brain and its arteries, and stroke prevention. The bedside head-impulse test can be abnormal in such strokes and look like vestibular neuritis, so it cannot rule a stroke out on its own.',
};

function pushEarEvents(events: CascadeEvent[]): void {
  events.push({
    id: 'labyrinthine_infarction',
    kind: 'mechanism',
    severity: 'warn',
    onsetH: 0,
    endH: 6,
    title: { zh: '內耳梗塞（數分鐘內失去聽覺與平衡）', en: 'Inner-ear infarction (hearing and balance lost within minutes)' },
    desc: {
      zh: '迷路動脈是供應耳蝸與前庭的終末動脈，通常由小腦前下動脈（AICA）分出。阻塞時，這一側的聽覺與平衡器官一起失去功能——血管性的原因通常兩者都受影響，和病毒性的不同（82 例 AICA 梗塞中 60% 聽覺與前庭功能一起喪失）。內耳不是腦組織：壞死的是器官本身，所以耳聾可能留下來。完全聽不見（極重度）時約 40% 會在幾個月內改善，模型顯示較常見、不再改善的病程（見「突發性聽力喪失」）。這裡沒有腦組織缺血。',
      en: 'The labyrinthine artery is an end artery to the cochlea and the vestibule, usually a branch of the AICA. When it closes, hearing and the balance organ on that side fail together — a vascular cause usually takes both, unlike a viral one (combined loss in 60 % of 82 AICA infarcts). The inner ear is not brain tissue: what dies is the organ itself, so the deafness can last. A profound loss improves over months in about 40 %, and the model shows the commoner course, in which it does not (see sudden hearing loss). No brain tissue is ischaemic here.',
    },
    regions: [],
  });
  events.push({
    id: 'ear_stroke_workup',
    kind: 'treatment',
    severity: 'warn',
    onsetH: 0,
    endH: 168,
    title: { zh: '內耳中風是腦中風的警訊', en: 'An inner-ear stroke is a brain-stroke warning' },
    desc: EAR_WORKUP,
    regions: [],
  });
  events.push({
    id: 'imaging_labyrinth',
    kind: 'imaging',
    severity: 'info',
    onsetH: 0.1,
    endH: 336,
    title: { zh: '檢查：聽力與前庭功能，腦部 DWI 看不到內耳', en: 'Examination: hearing and balance tests; brain DWI does not show the inner ear' },
    desc: {
      zh: '腦部擴散加權 MRI 看不到內耳本身；它用來找腦幹與小腦的梗塞，而早期掃描可能漏掉小病灶（發病 48 小時內約 12% 為假陰性）。聽力的喪失用純音聽力檢查記錄，前庭功能用溫差測試等檢查——血管性的突發耳聾，同側前庭功能也常變弱（62 人中 56 人）。',
      en: 'Brain diffusion MRI does not show the inner ear itself; it is used to look for infarcts in the brainstem and cerebellum, and an early scan can miss small ones (about 12 % false negatives within 48 h). The hearing loss is documented with a pure-tone audiogram and the vestibule with caloric and similar tests — with sudden deafness of vascular cause the vestibule on the same side is usually weak too (56 of 62).',
    },
    regions: [],
  });
}

/**
 * The spinal cord is ischaemic: the upper cervical cord, in the territory of the anterior spinal
 * artery (W3-8). Neither the brain-stroke story nor none: an anterior spinal artery occlusion left a
 * tetraparesis with only a venous-thrombosis warning beside it. The features and course of spinal
 * cord infarction: 115 patients followed for a mean of 3 years (Robertson CE et al. Neurology
 * 2012;78:114–121, PMID 22205760), 133 spontaneous infarcts and their MRI (Zalewski NL et al. JAMA
 * Neurol 2019;76:56–63, PMID 30264146), 28 patients at 2 months (Masson C et al. J Neurol Neurosurg
 * Psychiatry 2004;75:1431–1435, PMID 15377691).
 */
function pushCordEvents(events: CascadeEvent[], regions: string[], o: { infarct: boolean; brain: boolean }): void {
  const brain = o.brain
    ? { zh: '腦組織也有缺血，另由腦的事件說明。', en: ' Brain tissue is ischaemic as well; its own events tell that part.' }
    : { zh: '這裡沒有腦組織缺血。', en: ' No brain tissue is ischaemic here.' };
  const cleared = o.infarct
    ? { zh: '', en: '' }
    : { zh: '這次血流在脊髓壞死前就回來了，缺損會消失。', en: ' Here the flow came back before the cord died, so the deficit clears.' };
  events.push({
    id: 'spinal_cord_infarction',
    kind: 'mechanism',
    severity: 'danger',
    onsetH: 0,
    endH: 6,
    title: o.infarct
      ? { zh: '脊髓梗塞（前脊髓動脈）', en: 'Spinal cord infarction (anterior spinal artery)' }
      : { zh: '脊髓缺血（前脊髓動脈）', en: 'Spinal cord ischaemia (anterior spinal artery)' },
    desc: {
      zh: `前脊髓動脈沿著脊髓前面往下走，供應脊髓的前三分之二：兩側的運動徑與痛溫覺路徑。它一阻塞，兩側在幾分鐘內一起失去功能：頸髓病灶以下四肢無力、痛覺與溫度覺喪失，而走在脊髓後方、由後脊髓動脈供應的位置覺與振動覺保留；膀胱也常受影響（115 人中 86% 在最嚴重時需要導尿）。多數人在數小時內就到最嚴重：115 人中 68% 在一小時內（Robertson 2012），133 例自發性脊髓梗塞中 77% 在 12 小時內（Zalewski 2019）。模型顯示的是上段頸髓（C1–C3），也就是這條動脈從兩側椎動脈的起始處供應的部分；症狀只列出無力與感覺喪失，沒有列出膀胱與呼吸（病灶延伸到 C3–C5 時可能讓橫膈無力）。打通這條動脈的治療沒有經過試驗；照護以支持性治療（血壓、膀胱、呼吸）與找出原因為主。${cleared.zh}${brain.zh}`,
      en: `The anterior spinal artery runs down the front of the spinal cord and feeds its anterior two-thirds: the motor tracts and the pain and temperature pathways of both sides. When it closes, both sides fail together within minutes: weakness of the limbs below a cervical lesion and loss of pain and temperature sense, while position and vibration sense, carried at the back of the cord and fed by the posterior spinal arteries, are spared; the bladder is often affected too (86 % of 115 patients needed a catheter at their worst). Most patients are at their worst within hours: 68 % of those 115 within an hour (Robertson 2012), 77 % of 133 spontaneous spinal cord infarcts within 12 hours (Zalewski 2019). The model shows the upper cervical cord (C1–C3), the part this artery feeds from its origin at the two vertebral arteries; it lists the weakness and the sensory loss, not the bladder or breathing (a lesion that reaches C3–C5 can weaken the diaphragm). No treatment to reopen the artery has been tested in trials; care is supportive (blood pressure, bladder, breathing) and aimed at the cause.${cleared.en}${brain.en}`,
    },
    regions,
  });
  events.push({
    id: 'imaging_spine',
    kind: 'imaging',
    severity: 'info',
    onsetH: 0.1,
    endH: 336,
    title: { zh: '檢查：頸髓 MRI，腦部影像看不到', en: 'Examination: MRI of the cervical cord; brain imaging does not show it' },
    desc: {
      zh: '腦部影像看不到脊髓梗塞，需要做脊椎 MRI，也藉此排除治療方式不同的脊髓壓迫。T2 影像上，梗塞是沿著脊髓前方的一條亮帶（「鉛筆狀」，133 例自發性脊髓梗塞中 40%），或橫切面上兩個發亮的前角（「貓頭鷹眼」，65%）；有做擴散加權影像的 29 人中 19 人看得到擴散受限；第一次 MRI 有 24% 正常，需要重做；20% 找到旁邊動脈的剝離或阻塞（Zalewski 2019）。',
      en: "Brain imaging does not show a spinal cord infarct: MRI of the spine is needed, also to rule out a compression of the cord, which is treated differently. On T2 the infarct is a bright strip down the front of the cord ('pencil-like', 40 % of 133 spontaneous spinal cord infarcts) or two bright anterior horns on axial images ('owl eyes', 65 %); diffusion imaging showed it in 19 of the 29 who had it, the first MRI was normal in 24 % and is repeated, and a dissection or occlusion of an artery beside it was found in 20 % (Zalewski 2019).",
    },
    regions: [],
  });
  if (!o.infarct) return;
  events.push({
    id: 'spinal_cord_course',
    kind: 'recovery',
    severity: 'info',
    onsetH: 168,
    title: { zh: '脊髓梗塞之後：恢復與留下的問題', en: 'After a spinal cord infarct: recovery and what remains' },
    desc: {
      zh: '恢復很慢、常不完全，出院後仍可能持續進步。115 人平均追蹤 3 年，23% 已過世；出院時坐輪椅的人中，41% 到最後追蹤時能走路，而存活者中仍有 42% 需要輪椅、54% 需要導尿、29% 有疼痛（Robertson 2012）。最嚴重時的缺損越重，結果越差；不過一開始很嚴重的人中，也有少數恢復得不錯，尤其是發病時位置覺正常的人（Masson 2004）。模型的恢復曲線描述的是腦：這裡脊髓造成的無力與感覺喪失到 6 個月改變不多。',
      en: "Recovery is slow, often incomplete, and can go on long after leaving hospital. Of 115 patients followed for a mean of 3 years, 23 % had died; of those who left hospital in a wheelchair, 41 % were walking at the last follow-up, while among the survivors 42 % still used a wheelchair, 54 % a bladder catheter and 29 % had pain (Robertson 2012). The worse the deficit at its worst, the poorer the outcome, yet a few patients who were severely impaired at onset did well, especially those whose position sense was normal at onset (Masson 2004). The model's recovery curves describe the brain: here the cord's weakness and sensory loss change little by 6 months.",
    },
    regions: [],
  });
}

/**
 * Brain ischaemia that leaves no infarct: the flow came back in time (a TIA) or collaterals held.
 * Tissue-based definition of TIA: Easton JD et al. Stroke 2009;40:2276–2293. Short-term dual
 * antiplatelet therapy after a high-risk TIA or minor stroke: CHANCE (Wang Y et al. N Engl J Med
 * 2013;369:11–19) and POINT (Johnston SC et al. N Engl J Med 2018;379:215–225).
 *
 * Z4-11: nobody can tell at the bedside that a deficit will clear. While it lasts it is an acute
 * stroke: brain imaging at once, reperfusion treatment for a disabling deficit (IV thrombolysis is
 * not recommended for a mild deficit that is not disabling), and antiplatelet drugs only once
 * imaging has excluded a haemorrhage; after IV thrombolysis aspirin generally waits 24 h, until a
 * follow-up scan (Powers WJ et al. Stroke 2019;50:e344–e418). So an attack has the treatment
 * windows of its occlusions while its deficit lasts, and the TIA story ("symptoms gone does not
 * mean safe", the antiplatelet advice) from when the deficit has cleared — not from its onset.
 */
export interface AttackStory {
  /**
   * when no deficit of the brain or the inner ear is listed any more, on the clock of the attack's
   * start; null when it has not cleared before the next attack begins (or within two weeks)
   */
  clearsH: number | null;
  /** the treatment windows for the occlusions of the attack */
  window: L;
  /** the flow came back with IV thrombolysis (alone or before thrombectomy) */
  thrombolysed: boolean;
  /**
   * when a treatment reopened the artery, or null: the windows for it end then, whatever the
   * deficit (V1-11)
   */
  treatedH?: number | null;
  /**
   * only the inner ear is ischaemic: while the deafness and vertigo last, the inner-ear stroke
   * emergency instead of the brain's treatment windows
   */
  earOnly?: boolean;
}

/** what the treatment windows say first once the artery a treatment reopened has closed again (U2-1) */
const REOCCLUDED_WINDOW_INTRO: L = {
  zh: '打通的血管又塞住了：在再次打通之前，下列治療時間窗再度適用，仍從中風發作時起算。',
  en: 'The reopened artery has closed again: until it is reopened, the treatment windows below apply again, still counted from the onset of the stroke.',
};

/** what the treatment windows say first while the deficit of an attack lasts (Z4-11) */
const ATTACK_WINDOW_INTRO: L = {
  zh: '此刻還無法知道這個缺損會不會自行消失。只要症狀還在，就是急性中風，不等著看它是不是 TIA：立即做腦部影像，有失能性缺損時考慮下列再通治療；抗血小板藥物要等影像排除出血之後才給。',
  en: 'Nobody can tell yet whether this deficit will clear by itself. While it lasts it is an acute stroke, handled without waiting to see whether it is a TIA: brain imaging at once and, for a disabling deficit, the reperfusion treatments below; antiplatelet drugs only once imaging has excluded a bleed.',
};

/** … and for an attack of the inner ear alone */
const ATTACK_EAR_INTRO: L = {
  zh: '此刻還無法知道耳聾與眩暈會不會自行消失；只要症狀還在，就不等著看它是不是 TIA。',
  en: 'Nobody can tell yet whether the deafness and vertigo will clear by themselves; while they last, nobody waits to see whether it is a TIA.',
};

/**
 * The story of brain ischaemia that began at `fromH` and left no infarct, cut off at `untilH`
 * (when a later occlusion starts a new episode): the treatment windows while its deficit lasts
 * (within a day of its start, and until a treatment reopened the artery: V1-11), and the TIA story
 * from when the deficit has cleared (Z4-11).
 * simulate() also tells it for a reopened phase before the index event, such as the prodromal
 * attack of a progressive basilar thrombosis (C3-F8).
 */
export function noInfarctEvents(fromH: number, untilH: number, attack: AttackStory): CascadeEvent[] {
  const events: CascadeEvent[] = [];
  const clears = attack.clearsH !== null && attack.clearsH < untilH ? Math.max(fromH, attack.clearsH) : null;
  const windowEnd = Math.min(clears ?? Infinity, untilH, fromH + 24, attack.treatedH ?? Infinity);
  if (windowEnd > fromH)
    events.push(
      attack.earOnly
        ? {
            id: 'ear_stroke_workup',
            kind: 'treatment',
            severity: 'warn',
            onsetH: fromH,
            endH: windowEnd,
            title: { zh: '突發耳聾與眩暈：當作中風急症', en: 'Sudden deafness and vertigo: a stroke emergency' },
            desc: { zh: ATTACK_EAR_INTRO.zh + EAR_WORKUP.zh, en: `${ATTACK_EAR_INTRO.en} ${EAR_WORKUP.en}` },
            regions: [],
          }
        : {
            id: 'treatment_window',
            kind: 'treatment',
            severity: 'warn',
            onsetH: fromH,
            endH: windowEnd,
            title: { zh: '治療時間窗', en: 'Treatment windows' },
            desc: { zh: ATTACK_WINDOW_INTRO.zh + attack.window.zh, en: `${ATTACK_WINDOW_INTRO.en} ${attack.window.en}` },
            regions: [],
          },
    );
  // the TIA story only once the deficit has gone
  if (clears === null) return events;
  const until = (h: number) => Math.min(h, untilH);
  events.push({
    id: 'ischemia_no_infarct',
    kind: 'mechanism',
    severity: 'warn',
    onsetH: clears,
    endH: until(clears + 6),
    title: { zh: '缺血但沒有梗塞', en: 'Ischaemia without infarction' },
    desc: {
      zh: '血流中斷約 10 秒內神經元停止放電而出現症狀。這次在組織壞死之前，血流就恢復了（或側枝循環撐住），所以症狀已完全消失、沒有留下梗塞——這就是暫時性腦缺血（TIA）。',
      en: 'Within ~10 s of lost flow neurons stop firing and symptoms begin. This time flow came back (or collaterals held) before tissue died, so the symptoms have cleared completely without an infarct — a transient ischaemic attack (TIA).',
    },
    regions: [],
  });
  events.push({
    id: 'imaging_no_infarct',
    kind: 'imaging',
    severity: 'info',
    onsetH: clears,
    endH: until(Math.max(fromH + 336, clears + 24)),
    title: { zh: '影像：預期 DWI 沒有梗塞', en: 'Imaging: DWI expected to show no infarct' },
    desc: {
      zh: '模型裡沒有組織壞死，所以擴散加權 MRI 預期是陰性。真實世界裡，持續較久的 TIA 常在 DWI 上看得到小病灶——那時依定義就算輕微中風，而不是 TIA。',
      en: 'No tissue died in the model, so diffusion MRI is expected to be negative. In real patients longer attacks often leave a small DWI lesion — by definition that is then a minor stroke, not a TIA.',
    },
    regions: [],
  });
  events.push({
    id: 'tia_urgent',
    kind: 'treatment',
    severity: 'warn',
    onsetH: clears,
    endH: until(Math.max(fromH + 168, clears + 24)),
    title: { zh: '症狀消失不代表沒事', en: 'Symptoms gone does not mean safe' },
    desc: {
      zh: `TIA 後最初幾天發生真正中風的風險最高，應當天就醫、盡快完成腦與血管檢查。腦部影像排除出血後，醫師通常會立即開始抗血小板藥物（高風險者短期併用兩種：CHANCE、POINT 試驗）${attack.thrombolysed ? '；打過靜脈血栓溶解劑時，通常等 24 小時後的追蹤影像沒有出血才開始' : ''}，並找出頸動脈狹窄、心房顫動等原因。反覆、越來越頻繁的發作（尤其後循環）可能是大血管即將完全阻塞的前兆。`,
      en: `The risk of a real stroke is highest in the first days after a TIA: seek care the same day and complete brain and vessel imaging promptly. Once brain imaging has excluded a bleed, antiplatelet treatment is usually started at once (two drugs for a short time in high-risk cases: the CHANCE and POINT trials)${attack.thrombolysed ? '; after thrombolysis it usually waits until a follow-up scan at 24 h shows no bleeding' : ''}, and causes such as carotid stenosis or atrial fibrillation are sought. Repeated, increasingly frequent attacks (especially in the posterior circulation) can herald a complete large-vessel occlusion.`,
    },
    regions: [],
  });
  return events;
}

/**
 * A bed counts as living tissue that a secondary process (herniation, compression) can kill when
 * less than half of it would be infarcted without treatment. Deciding this on the untreated
 * course keeps the targets fixed when treatment saves a sliver of a bed — otherwise saving 1 % of
 * a half-infarcted border-zone bed pushed it under the line and the whole bed died secondarily,
 * so early treatment looked worse than none. The tolerance keeps beds that are exactly half
 * infarcted (one of two supplying arteries lost) from being decided by floating-point rounding.
 */
const stillAlive = (finalFraction: number | undefined) => (finalFraction ?? 0) < 0.5 - 1e-6;

/** the anterior cerebral branches pinched under the falx, and the posterior cerebral ones at the tentorial edge, by a herniation */
const ACA_UNDER_FALX = /^aca_(callosomarginal|pericallosal|paracentral|frontopolar)/;
const PCA_AT_TENTORIUM = /^pca_(temporal|calcarine|parietooccipital|splenial|p2)/;

/**
 * The occlusion sites each treatment-window story is for. The thrombectomy trials enrolled
 * intracranial ICA and M1 (anterior) or basilar occlusions; an isolated cervical ICA occlusion
 * and an intracranial vertebral (V4) occlusion were not randomised (Kargiotis O et al. Ther Adv
 * Neurol Disord 2022;15:17562864221136335; de Bastos Maximiano ML et al. Neuroradiol J
 * 2026;39:557–566).
 */
const ANTERIOR_LVO = ['ica_petrous_cavernous', 'ica_ophthalmic_seg', 'ica_terminal', 'mca_m1'];
const BASILAR = ['basilar_lower', 'basilar_mid', 'basilar_upper', 'basilar_tip'];
const VERTEBRAL_V4 = ['va_v4_prox', 'va_v4_dist'];

/** medium / distal vessel occlusions (MeVO) */
const MEVO = ['mca_m2_sup', 'mca_m2_inf', 'aca_a1', 'aca_a2', 'pca_p1', 'pca_p2'];

/** an anterior large-vessel core from which the large-core thrombectomy trials apply (mL) */
const LARGE_CORE_ML = 70;
/** above this the core is larger than most of those trials enrolled (mL) */
const BEYOND_TRIALS_ML = 100;

/** the tissue whose ischaemia a story is told for: the brain, the inner ear and the retina */
const STORY_TISSUE: ReadonlySet<string | undefined> = new Set(['cortex', 'deep', 'brainstem', 'cerebellum', 'ear', 'eye']);

/** which treatment-window story fits the complete occlusions in effect, with the core when treatment is decided (mL), if known */
function windowStoryOf(occlusions: readonly Occlusion[], coreMl: number | null, priorInfarctH: number | null = null): WindowStory {
  const occluded = occlusions.filter((o) => o.severity >= 1);
  const occludedBases = new Set(occluded.map((o) => baseOf(o.vessel)));
  const anteriorSides = new Set(occluded.filter((o) => ANTERIOR_LVO.includes(baseOf(o.vessel))).map((o) => sideOf(o.vessel)));
  const basilar = BASILAR.some((b) => occludedBases.has(b));
  const anterior = anteriorSides.size > 0;
  return {
    anterior,
    basilar,
    basilarTip: occludedBases.has('basilar_tip'),
    cervicalIsolated: occluded.some((o) => baseOf(o.vessel) === 'ica_cervical' && !anteriorSides.has(sideOf(o.vessel))),
    v4: !basilar && VERTEBRAL_V4.some((b) => occludedBases.has(b)),
    mevo: !anterior && !basilar && MEVO.some((b) => occludedBases.has(b)),
    coreMl,
    priorInfarctH,
  };
}

/**
 * The treatment windows for an attack before the index event (simulate's prodromal attacks,
 * Z4-11): those of its complete occlusions, or of a lacunar stroke when only single branches are
 * shut.
 */
export function attackWindow(occlusions: readonly Occlusion[]): L {
  const vessels = occlusions.filter((o) => !o.branch);
  return vessels.length ? treatmentWindowDesc(windowStoryOf(vessels, null)) : LACUNAR_WINDOW;
}

interface WindowStory {
  /** intracranial ICA or M1 occluded (with or without a cervical ICA occlusion: a tandem lesion) */
  anterior: boolean;
  basilar: boolean;
  /** the top of the basilar: the distal location of the ESO guideline */
  basilarTip: boolean;
  /** a cervical ICA occlusion without an intracranial anterior occlusion on its side */
  cervicalIsolated: boolean;
  /** an intracranial vertebral occlusion without a basilar occlusion */
  v4: boolean;
  /** a medium/distal vessel occlusion without an anterior or basilar large-vessel occlusion */
  mevo: boolean;
  /** largest supratentorial core of one side when treatment is decided (mL), if known */
  coreMl: number | null;
  /** an earlier infarct began this long before (h), within 3 months: it counts against IV thrombolysis (T2-8) */
  priorInfarctH: number | null;
}

const IVT_INTRO: L = {
  // alteplase within 4.5 h (ECASS III); tenecteplase as an alternative (AcT; ESO 2023); beyond
  // 4.5 h only after imaging selection (WAKE-UP; EXTEND)
  zh: '靜脈血栓溶解（alteplase，或以 tenecteplase 替代）：標準是發作 4.5 小時內開始用藥；更晚或醒來才發現時，只在 MRI 或灌流影像篩選後使用（WAKE-UP、EXTEND 試驗）。',
  en: 'IV thrombolysis (alteplase, or tenecteplase as an alternative): standard when started within 4.5 h of onset; later, or on waking with symptoms, only after MRI or perfusion imaging selects the patient (WAKE-UP, EXTEND trials).',
};
// the range of the rate: Desai SM et al. Stroke 2019;50:34–37 (415 ICA or M1 occlusions); with poor
// collaterals the model's infarct grows at the fast end of it (tissueParams.ts, Y1-0)
const SAVER: L = {
  zh: '每延遲一分鐘，典型大血管中風約多死亡 190 萬個神經元（Saver 2006）；實際速度因人而異，從每分鐘不到 3.5 萬到超過 2700 萬個（Desai 2019），側枝越差越快。',
  en: 'Each minute of delay in a typical large-vessel stroke costs ~1.9 million neurons (Saver 2006); the actual rate varies from under 35,000 to over 27 million a minute (Desai 2019), faster the poorer the collaterals.',
};

/**
 * IV thrombolysis after an ischaemic stroke in the previous 3 months (T2-8): the second occlusion of
 * a case was offered it as "standard within 4.5 h" a month after a large infarct. Guidelines
 * recommend against IV thrombolysis within 3 months of an ischaemic stroke; in 293 patients aged 66
 * or older thrombolysed within 3 months of one, symptomatic haemorrhage was more frequent only when
 * that stroke was within the previous 14 days (16.3 % vs 4.8 %; Shah S et al. Circ Cardiovasc Qual
 * Outcomes 2020;13:e006031). It is a relative contraindication resting largely on expert consensus,
 * and repeat thrombolysis within 90 days has been reported in selected patients (63 cases, no
 * symptomatic haemorrhage: Scala I et al. J Neurol 2026;273:607). An earlier lesion that began less
 * than a day before is part of the same presentation, and this is not said then (a model choice).
 */
export const RECENT_INFARCT_MAX_H = 2160;
export const RECENT_INFARCT_MIN_H = 24;
const recentIvtIntro = (h: number): L => {
  const days = Math.max(1, Math.round(h / 24));
  return {
    zh: `靜脈血栓溶解（alteplase 或 tenecteplase）：這裡不是標準治療。過去 3 個月內發生過缺血性中風時，指引建議不要使用（這位病人較早的梗塞約在這次阻塞前 ${days} 天開始）；這是相對禁忌，主要依據專家共識：美國一個登錄研究中，293 位在中風後 3 個月內接受血栓溶解的 66 歲以上病人，只有前一次中風在 14 天內時症狀性腦出血較多（16.3% vs 4.8%）；3 個月內再次血栓溶解只見於經過挑選的病人的報告。適合取栓的阻塞，是否取栓依影像決定。`,
    en: `IV thrombolysis (alteplase or tenecteplase): not standard here. Guidelines advise against it after an ischaemic stroke in the previous 3 months (this patient's earlier infarct began about ${days} day${days === 1 ? '' : 's'} before this occlusion), a relative contraindication resting largely on expert consensus: in a US registry of 293 patients aged 66 or older thrombolysed within 3 months of a stroke, symptomatic haemorrhage was more frequent only when that stroke was within the previous 14 days (16.3% vs 4.8%); repeat thrombolysis within 3 months is reported only in selected patients. Where the occlusion suits thrombectomy, it is decided on imaging.`,
  };
};

/** what fits this occlusion site: thrombolysis, thrombectomy and the trials behind them */
function treatmentWindowDesc(w: WindowStory): L {
  const recent = w.priorInfarctH;
  const intro = recent === null ? IVT_INTRO : recentIvtIntro(recent);
  const zh: string[] = [intro.zh];
  const en: string[] = [intro.en];
  const core = w.coreMl === null ? null : Math.round(w.coreMl);
  if (w.anterior) {
    // TRACE-III: Xiong Y et al. N Engl J Med 2024;391:203–212
    zh.push(
      '這是大血管阻塞，適合動脈取栓：6 小時內效果最明確，影像顯示仍有可救組織時可延長到 24 小時。無法取栓時，TRACE-III 試驗（中國病人、ICA／MCA 阻塞且灌流影像有可救組織）中發作 4.5–24 小時用 tenecteplase 改善了預後。',
    );
    en.push(
      'This is a large-vessel occlusion suited to mechanical thrombectomy: clearest benefit within 6 h, extendable to 24 h when imaging shows salvageable tissue. Without access to thrombectomy, tenecteplase 4.5–24 h after onset improved outcome in TRACE-III (Chinese patients with ICA/MCA occlusion and salvageable tissue on perfusion imaging).',
    );
    // SELECT2, ANGEL-ASPECT, RESCUE-Japan LIMIT, TENSION, LASTE (sources.ts): selected by ASPECTS
    // 3–5, a core ≥ 50 mL (SELECT2) or 70–100 mL (ANGEL-ASPECT), or ASPECTS ≤ 5 of any size (LASTE)
    if (core !== null && core >= LARGE_CORE_ML) {
      zh.push(
        `大核心（決定治療時約 ${core} mL）：五項前循環大血管阻塞大核心隨機試驗（SELECT2、ANGEL-ASPECT、RESCUE-Japan LIMIT、TENSION、LASTE）中取栓仍改善功能，TENSION 與 LASTE 也降低死亡率（SELECT2 沒有）；任何顱內出血與血管併發症較多，症狀性出血在部分試驗較高（ANGEL-ASPECT 6.1% vs 2.7%、LASTE 9.6% vs 5.7%），其他試驗則沒有（SELECT2、TENSION）。` +
          (core > BEYOND_TRIALS_ML ? '這個核心比多數試驗的病人大（ASPECTS 3–5 或核心約 100 mL 以內；只有 LASTE 不設上限）。' : ''),
      );
      en.push(
        `Large core (about ${core} mL when treatment is decided): in five randomised trials of anterior large-vessel occlusion with a large core (SELECT2, ANGEL-ASPECT, RESCUE-Japan LIMIT, TENSION, LASTE) thrombectomy still improved function, with lower mortality in TENSION and LASTE (not in SELECT2); any intracranial haemorrhage and vascular complications were more frequent, and symptomatic haemorrhage was higher in some trials (ANGEL-ASPECT 6.1% vs 2.7%, LASTE 9.6% vs 5.7%) but not in others (SELECT2, TENSION).` +
          (core > BEYOND_TRIALS_ML ? ' This core is larger than in most of these trials (ASPECTS 3–5 or cores up to about 100 mL; only LASTE set no upper limit).' : ''),
      );
    }
  }
  if (w.basilar) {
    // ATTENTION (Tao C et al. 2022), BAOCHE (Jovin TG et al. 2022), ESO/ESMINT (Strbian D et al.
    // 2024), Lindsberg PJ & Mattle HP 2006
    zh.push(
      `基底動脈阻塞：ATTENTION 試驗中發作 12 小時內取栓、BAOCHE 試驗中 6–24 小時取栓都改善了預後；效益見於 NIHSS ≥ 10（ESO/ESMINT 2024 指引：低於 10 分沒有證據），遠端（頂端）阻塞的效果比近端或中段弱${w.basilarTip ? '，這裡正是遠端（頂端）阻塞' : ''}。` +
        `${recent === null ? '' : '沒有禁忌時，'}指引依專家共識（證據確定性非常低）建議靜脈血栓溶解可用到發作後 24 小時，並建議先打靜脈血栓溶解再取栓，而非直接取栓。` +
        '試驗中（多為 NIHSS ≥ 10 的中國病人；對照組 34% 與 21% 也打了靜脈血栓溶解）90 天死亡率：ATTENTION 取栓 37% vs 內科 55%，BAOCHE 31% vs 42%（差異未達統計顯著）。沒有再通時，只有約 2% 預後良好（Lindsberg 與 Mattle 2006，病例系列）。',
    );
    en.push(
      `Basilar-artery occlusion: in ATTENTION thrombectomy within 12 h of onset, and in BAOCHE thrombectomy 6–24 h after onset, improved outcome; the benefit was shown for NIHSS ≥ 10 (ESO/ESMINT 2024: no evidence below 10), and the effect was weaker for distal than for proximal or middle occlusions${w.basilarTip ? '; this is a distal (tip) occlusion' : ''}. ` +
        `${recent === null ? 'The guideline suggests' : 'Without a contraindication, the guideline suggests'} IV thrombolysis up to 24 h after onset, by expert consensus at very low certainty, and IV thrombolysis plus thrombectomy over direct thrombectomy. ` +
        'In the trials (mostly Chinese patients with NIHSS ≥ 10; IV thrombolysis in 34% and 21% of the control arms) 90-day mortality was 37% with thrombectomy vs 55% with medical care (ATTENTION) and 31% vs 42% (BAOCHE; not statistically significant). Without recanalisation only about 2% have a good outcome (Lindsberg & Mattle 2006, case series).',
    );
  }
  if (w.cervicalIsolated) {
    const large = core !== null && core >= LARGE_CORE_ML;
    zh.push(
      '單純頸部內頸動脈阻塞（同側沒有顱內阻塞）：取栓隨機試驗大多排除這類病人，沒有經過驗證；觀察性研究統合分析中血管內治療沒有明顯優於內科治療（調整後 OR 1.22，95% CI 0.82–1.82），因此是個別決定（例如嚴重缺損持續時）。若合併顱內阻塞（串聯病灶），則適用大血管阻塞試驗。' +
        (large ? `已形成的大核心（約 ${core} mL）讓任何效益更不確定。` : ''),
    );
    en.push(
      'Isolated cervical ICA occlusion (no intracranial occlusion on this side): not tested in the randomised thrombectomy trials, which largely excluded it; in an observational meta-analysis endovascular treatment was not clearly better than medical treatment (adjusted OR 1.22, 95% CI 0.82–1.82), so it is an individual decision (e.g. for persisting severe deficits). With a tandem lesion (cervical ICA plus an intracranial occlusion) the large-vessel trials apply.' +
        (large ? ` With a large established core (about ${core} mL) any benefit is even less certain.` : ''),
    );
  }
  if (w.v4) {
    zh.push('顱內椎動脈（V4）阻塞：沒有隨機試驗測試過這裡的取栓；主要在血栓延伸進基底動脈時才考慮。');
    en.push('Intracranial vertebral artery (V4) occlusion: no randomised trial has tested thrombectomy here; it is mainly considered when the clot extends into the basilar artery.');
  }
  if (w.mevo) {
    // ESCAPE-MeVO (Goyal M et al. 2025), DISTAL (Psychogios M et al. 2025)
    zh.push(
      `這是中型／遠端血管阻塞：${recent === null ? '' : '沒有禁忌時，'}靜脈血栓溶解是標準治療。` +
        '2025 年 ESCAPE-MeVO 與 DISTAL 試驗中常規取栓沒有改善預後；症狀性出血 ESCAPE-MeVO 5.4% vs 2.2%、DISTAL 5.9% vs 2.6%（作者認為相近），只有 ESCAPE-MeVO 的死亡率較高（13.3% vs 8.4%）；近端、優勢側的 M2（DISTAL 未納入）仍不確定，個別考慮。',
    );
    en.push(
      `This is a medium/distal vessel occlusion: ${recent === null ? 'IV thrombolysis is standard.' : 'without a contraindication, IV thrombolysis is the standard treatment.'} ` +
        'Routine thrombectomy did not improve outcome in the 2025 ESCAPE-MeVO and DISTAL trials; symptomatic haemorrhage was 5.4% vs 2.2% in ESCAPE-MeVO and 5.9% vs 2.6% in DISTAL (judged similar by its authors), and mortality higher only in ESCAPE-MeVO (13.3% vs 8.4%); a proximal, dominant M2 (excluded from DISTAL) remains uncertain and is considered case by case.',
    );
  }
  if (!w.anterior && !w.basilar && !w.cervicalIsolated && !w.v4 && !w.mevo) {
    zh.push('此處不是大血管阻塞，一般不做取栓。');
    en.push('This is not a large-vessel occlusion; thrombectomy is not usually done.');
  }
  zh.push(SAVER.zh);
  en.push(SAVER.en);
  return { zh: zh.join(''), en: en.join(' ') };
}

/**
 * A lacunar (single-perforator) occlusion: IV thrombolysis applies as in other ischaemic strokes
 * (Barow E et al. JAMA Neurol 2019;76:641–649, post hoc WAKE-UP: 59% vs 46%, aOR 1.67,
 * 0.77–3.64); the model does not reopen lacunar occlusions (engine/schedule.ts isTreatable).
 */
const LACUNAR_WINDOW: L = {
  zh: '小血管（腔隙性）阻塞：和其他缺血性中風一樣，發作 4.5 小時內開始的靜脈血栓溶解適用；WAKE-UP 試驗的事後分析中，alteplase 對腔隙性梗塞的效果與其他中風沒有差別（無失能 59% vs 46%，信賴區間跨過 1）。單一穿通支阻塞不做取栓。模型沒有模擬血栓溶解打通腔隙性阻塞。',
  en: 'Small-vessel (lacunar) occlusion: IV thrombolysis started within 4.5 h of onset applies as in other ischaemic strokes; in a post hoc analysis of the WAKE-UP trial the effect of alteplase did not differ for lacunar infarcts (no disability 59% vs 46%, confidence interval crossing 1), and thrombectomy does not apply to a single perforator. The model does not simulate thrombolysis reopening a lacunar occlusion.',
};

const baseOf = (id: string) => id.replace(/_(r|l)$/, '');
const sideOf = (id: string): Side | 'm' => (id.endsWith('_r') ? 'r' : id.endsWith('_l') ? 'l' : 'm');
const opp = (s: Side): Side => (s === 'r' ? 'l' : 'r');

const MOTOR_SUPRA = ['precentral_face_arm', 'paracentral', 'ic_posterior_limb', 'ic_genu'];
const FRONTO_MOTOR = [...MOTOR_SUPRA, 'medial_frontal', 'prefrontal_dorsolateral', 'thalamus_ventrolateral', 'ic_anterior_limb'];
/** vessel families of the carotid territory (Pantano 1986 studied carotid-territory strokes) */
const CAROTID_FAMILIES: Family[] = ['ICA', 'MCA', 'ACA', 'AChA', 'LSA'];
/** the middle cerebral artery and its deep branches (SeLECT: MCA territory) */
const MCA_FAMILIES: Family[] = ['MCA', 'LSA'];
/** an extensive cortical infarct for crossed cerebellar diaschisis (mL, illustrative) */
const CCD_CORTEX_ML = 30;
/** crossed cerebellar diaschisis can be seen within hours (Pantano 1986) */
const CCD_ONSET_H = 6;

/** share of a bed's supply that comes from vessels of these families */
function familyShare(b: Bed, families: Family[]): number {
  let x = 0;
  for (const s of b.supply) {
    const v = VESSEL_BY_ID[s.v];
    if (v && families.includes(v.family)) x += s.share;
  }
  return x;
}

function regionFinal(bedFinal: Record<string, number>): Record<string, number> {
  const acc: Record<string, [number, number]> = {};
  for (const b of BEDS) {
    const a = (acc[b.region] ??= [0, 0]);
    a[0] += (bedFinal[b.id] ?? 0) * b.volume;
    a[1] += b.volume;
  }
  const out: Record<string, number> = {};
  for (const [r, [v, t]] of Object.entries(acc)) out[r] = t > 0 ? v / t : bedFinal[r] ?? 0;
  return out;
}

/** the event of each brainstem state, and its title */
const BRAINSTEM_EVENT: Record<BrainstemState, { id: string; title: L }> = {
  coma: { id: 'basilar_coma', title: { zh: '雙側橋腦腹側與被蓋受損：昏迷合併四肢癱瘓', en: 'Bilateral ventral pons and tegmentum: coma with quadriplegia' } },
  doc: { id: 'pontine_doc', title: { zh: '基底動脈昏迷之後：意識障礙或閉鎖', en: 'After basilar coma: disorder of consciousness or locked-in' } },
  classical: { id: 'locked_in', title: { zh: '雙側橋腦腹側受損：閉鎖症候群', en: 'Bilateral ventral pons: locked-in syndrome' } },
  incomplete: {
    id: 'locked_in_incomplete',
    title: { zh: '雙側橋腦腹側部分受損：不完全閉鎖（雙側橋腦症候群）', en: 'Bilateral ventral pons, partly: incomplete locked-in (bilateral pontine syndrome)' },
  },
};

/**
 * the start of the run of brainstem stretches that follow one another without a gap up to stretch
 * `i` (one course: a classical locked-in state that turns incomplete as the pons recovers)
 */
function runStartOf(course: BrainstemCourse, i: number): number {
  const segs = course.segments;
  let start = segs[i].fromH;
  for (let j = i - 1; j >= 0 && segs[j].untilH !== null && Math.abs(segs[j].untilH! - start) < 1e-6; j--) start = segs[j].fromH;
  return start;
}

/** the latest reopening in the run up to the end of stretch `i`, when that stretch ends (null otherwise) */
function reopeningOf(course: BrainstemCourse, i: number): number | null {
  const end = course.segments[i].untilH;
  if (end === null) return null;
  const start = runStartOf(course, i);
  return course.reopenH.filter((r) => r >= start - 1e-6 && r <= end + 1e-6).pop() ?? null;
}

/** stretch `i` ends after blood returned during its run: it clears with the reopening (Y1-12) */
const endsAfterReopening = (course: BrainstemCourse, i: number) => reopeningOf(course, i) !== null;

/**
 * a state that clears after blood returned before the tissue of both sides died: at once (`atOnce`,
 * when nothing had begun to die), or as the rescued tissue regains its function over the following
 * hours to days (tissue.silentAfterReflow, Y1-12), by `end`
 */
const resolvesZh = (back: string, end: string, atOnce: boolean) =>
  `血流在發作後 ${back}恢復，兩側沒有形成梗塞：${atOnce ? '這個狀態隨之解除。' : `救回的組織在之後幾小時到幾天內逐漸恢復功能，這個狀態約在發作後 ${end}解除。`}`;
const resolvesEn = (back: string, end: string, atOnce: boolean) =>
  ` Blood returned ${back} after onset before both sides infarcted, so the state ${atOnce ? 'resolves then' : `resolves as the rescued tissue regains its function over the following hours to days, by about ${end} after onset`}.`;

/**
 * The events of the brainstem consciousness course (X2-7, X2-10, X2-11, X2-15): one per stretch
 * of the course the labels show, titled by what they show then and told from what came before
 * and what follows. A stretch that ends when blood returns says so; the times in the texts count
 * from the lesion's own onset. A state that comes back gets a numbered id (locked_in_2 …). A
 * classical locked-in state that turns incomplete credits a reopening before it with saving part of
 * the ventral pons only when `credit` says that the reopening saved more than a sliver and that the
 * movement came back sooner for it (T3-11).
 */
function brainstemEvents(
  course: BrainstemCourse,
  care: L,
  regions: { coma: string[]; doc: string[]; lis: string[] },
  credit: (reopenH: number, atH: number) => boolean = () => true,
): CascadeEvent[] {
  const out: CascadeEvent[] = [];
  const seen: Record<string, number> = {};
  const segs = course.segments;
  /** the latest reopening in [a, b], or null */
  const reopenedIn = (a: number, b: number) => course.reopenH.filter((r) => r >= a - 1e-6 && r <= b + 1e-6).pop() ?? null;
  segs.forEach((seg, i) => {
    const prev = i > 0 && segs[i - 1].untilH !== null && Math.abs(segs[i - 1].untilH! - seg.fromH) < 1e-6 ? segs[i - 1] : null;
    const next = seg.untilH !== null && i + 1 < segs.length && Math.abs(segs[i + 1].fromH - seg.untilH) < 1e-6 ? segs[i + 1] : null;
    const after = (h: number) => ({ zh: formatHours(h - seg.lesionOnsetH, 'zh-TW'), en: formatHours(h - seg.lesionOnsetH, 'en') });
    const end = seg.untilH === null ? null : after(seg.untilH);
    // blood that returned during this stretch or the ones just before it (one course: a classical
    // locked-in state that turned incomplete as the pons recovered) ends it (Y1-12)
    const reopenH = reopeningOf(course, i);
    // when blood returned, and how the state ends with it: at once, or as the tissue works again
    const back = reopenH === null ? null : after(reopenH);
    const atOnce = reopenH !== null && seg.untilH !== null && Math.abs(seg.untilH - reopenH) < 1e-6;
    const lis = (st: BrainstemState | undefined) => st === 'classical' || st === 'incomplete';
    let zh = '';
    let en = '';
    if (seg.state === 'coma') {
      zh = '四肢與臉部癱瘓，維持清醒的被蓋網狀結構也兩側受損：病人現在昏迷，不是閉鎖症候群，常需要呼吸器。';
      en = 'Limbs and face are paralysed and the arousal network of the tegmentum has failed on both sides as well: the person is comatose now, not locked-in, and often needs ventilation.';
      if (end && back && lis(next?.state)) {
        const part = next!.state === 'incomplete';
        zh += `血流在發作後 ${back.zh}恢復，兩側被蓋還沒有形成梗塞：昏迷${atOnce ? '隨之解除' : `隨著被蓋恢復功能而解除（約在發作後 ${end.zh}）`}；但兩側橋腦腹側已經梗塞，病人醒來是${part ? '不完全' : ''}閉鎖的（清醒、有意識，卻${part ? '幾乎' : ''}不能動也不能說話）。`;
        en += ` Blood returned ${back.en} after onset before the tegmentum of both sides infarcted, so the coma lifts ${atOnce ? 'then' : `as it regains its function, by about ${end.en} after onset`}; but the ventral pons has infarcted on both sides, so the person wakes up ${part ? 'incompletely ' : ''}locked-in (awake and aware, ${part ? 'barely able' : 'unable'} to move or speak).`;
      } else if (end && back && !next) {
        zh += resolvesZh(back.zh, end.zh, atOnce);
        en += resolvesEn(back.en, end.en, atOnce);
      } else {
        zh += '這類病人常昏迷數天到數週後才逐漸醒來：有些人醒來是閉鎖的（清醒但不能動，只能用垂直眼動與眨眼溝通），有些人停在意識障礙（無反應覺醒或最小意識狀態），兩者外觀相近、容易誤判。';
        en += ' Such patients often stay comatose for days to weeks and then gradually wake: some wake up locked-in (aware but unable to move, communicating by vertical eye movements and blinking), others remain in a disorder of consciousness (unresponsive wakefulness or a minimally conscious state); the two look alike and are easily confused.';
        if (end && !next) {
          zh += `這裡昏迷約在發作後 ${end.zh}解除。`;
          en += ` Here the coma lifts about ${end.en} after onset.`;
        }
      }
    } else if (seg.state === 'doc') {
      zh = `昏迷之後眼睛會睜開、恢復睡醒週期，但可能沒有覺察（無反應覺醒症候群）、時有時無（最小意識狀態），也可能其實完全清醒、只是被癱瘓閉鎖住（閉鎖症候群）。這幾種狀態外觀相近、常被誤判；閉鎖症候群平均要 2.5 個月以上才被診斷，常是家屬先發現病人是清醒的：要反覆請病人用上下看或眨眼回答問題。${care.zh}`;
      en = `The coma has given way to eye opening and sleep–wake cycles, but awareness may be absent (unresponsive wakefulness syndrome), may come and go (minimally conscious state), or may be fully present behind the paralysis (locked-in syndrome). The states look alike and are often confused; locked-in syndrome took over 2.5 months to diagnose on average, and it is often the family who first notices that the person is aware: ask repeatedly for answers by looking up or blinking.${care.en}`;
    } else {
      const part = seg.state === 'incomplete';
      if (prev?.state === 'coma') {
        zh = `昏迷已經過去：病人醒著、有意識，但四肢與臉部${part ? '嚴重無力' : '完全癱瘓'}、無法說話吞嚥，用垂直眼動與眨眼溝通（控制垂直眼動的中腦未受損）。因為接在昏迷之後、外觀又像昏迷，很容易被忽略：要反覆請病人用上下看或眨眼回答問題。還能有其他動作時稱為「不完全」閉鎖；典型閉鎖症候群在數週到數月後恢復部分動作時也會變成不完全。`;
        en = `The coma has lifted: the person is awake and aware, but with ${part ? 'severe weakness' : 'total paralysis'} of limbs and face and no speech or swallowing, communicating by vertical eye movements and blinking (the midbrain gaze centres are spared). Because it follows a coma and looks like one, it is easily missed: ask repeatedly for answers by looking up or blinking. With any other movement left it is incomplete locked-in syndrome; classical locked-in syndrome becomes incomplete when some movement returns over weeks to months.`;
      } else if (prev && part) {
        const leadH = reopenedIn(prev.fromH, seg.fromH);
        const lead = leadH === null || !credit(leadH, seg.fromH) ? null : after(leadH);
        zh = `${lead ? `血流在發作後 ${lead.zh}恢復，救回部分橋腦腹側：四肢已能稍微動，閉鎖症候群變成「不完全」。` : '四肢已能稍微動：典型閉鎖症候群已變成「不完全」閉鎖。'}病人仍然意識清楚、幾乎不能說話、吞嚥嚴重困難，用垂直眼動與眨眼溝通。`;
        en = `${lead ? `Blood returned ${lead.en} after onset and saved part of the ventral pons: some limb movement has come back, so the locked-in syndrome is now incomplete.` : 'Some limb movement has come back: classical locked-in syndrome has become incomplete.'} The person is still conscious, with little or no speech and severe difficulty swallowing, communicating by vertical eye movements and blinking.`;
      } else if (prev) {
        zh = '四肢無力加重到完全不能動：典型閉鎖症候群。病人仍然意識清楚，只能用垂直眼動與眨眼溝通（控制垂直眼動的中腦未受損）。';
        en = 'The weakness has deepened until no limb moves: classical locked-in syndrome. The person is still conscious, communicating only by vertical eye movements and blinking (the midbrain gaze centres are spared).';
      } else {
        zh = `${part ? '兩側都受損但不完全：' : '一開始常是'}四肢與臉部${part ? '嚴重' : '完全'}癱瘓、無法說話吞嚥，但意識清楚，用垂直眼動與眨眼溝通（控制垂直眼動的中腦未受損）。還能有其他動作時稱為「不完全」閉鎖；典型閉鎖症候群在數週到數月後恢復部分動作時也會變成不完全。`;
        en = `${part ? 'Both sides, but not completely: severe' : 'Often at first total'} paralysis of limbs and face with no speech or swallowing, yet conscious — communication by vertical eye movements and blinking (the midbrain gaze centres are spared). With any other movement left it is incomplete locked-in syndrome; classical locked-in syndrome becomes incomplete when some movement returns over weeks to months.`;
      }
      zh += care.zh;
      en += care.en;
      if (end && !next && back) {
        zh += resolvesZh(back.zh, end.zh, atOnce);
        en += resolvesEn(back.en, end.en, atOnce);
      } else if (end && !next) {
        zh += `約在發作後 ${end.zh}，四肢無力與無法說話已減輕，不再是這個表現。`;
        en += ` By about ${end.en} after onset the weakness of all four limbs and the loss of speech have eased, and the picture no longer applies.`;
      }
    }
    const { id: baseId, title } = BRAINSTEM_EVENT[seg.state];
    const n = (seen[baseId] = (seen[baseId] ?? 0) + 1);
    out.push({
      id: n === 1 ? baseId : `${baseId}_${n}`,
      kind: 'secondary',
      severity: 'danger',
      onsetH: seg.fromH,
      ...(seg.untilH !== null ? { endH: seg.untilH } : {}),
      title,
      desc: { zh, en },
      regions: seg.state === 'coma' ? regions.coma : seg.state === 'doc' ? regions.doc : regions.lis,
    });
  });
  return out;
}

export function computeCascade(input: CascadeInput): CascadeOutput {
  const { hemo, bedFinal, bedFinalUntreated, regionAcute, decompression, reperfusionH } = input;
  const events: CascadeEvent[] = [];
  const bedEffects: Record<string, BedEffect[]> = {};
  const addEffect = (bedId: string, e: BedEffect) => (bedEffects[bedId] ??= []).push(e);
  const rf = regionFinal(bedFinal);
  const infarcted = (rid: string, thr = 0.3) => (rf[rid] ?? 0) >= thr;
  const infarctedRegions = Object.keys(rf).filter((r) => rf[r] >= 0.2);
  const lacuneFinal = input.lacuneFinal ?? {};
  /** the final infarct level of a region as the symptoms see it (a lacune at its own level) */
  const finalLevel = (rid: string) => Math.max(rf[rid] ?? 0, lacuneFinal[rid]?.level ?? 0);
  /**
   * the regions that will produce the late symptom `id`: its deficit entry (or the lacune site's)
   * at its own threshold, on the final infarct — the same rule as clinical.aggregateSymptoms, so a
   * late event is shown exactly when its symptom is (C10-F2)
   */
  const lateSources = (id: string): Region[] =>
    REGIONS.filter((r) => {
      const lac = lacuneFinal[r.id];
      const list = lac?.deficits ?? r.deficits;
      return list.some(
        (d) =>
          d.s === id &&
          (!d.only || r.side === d.only) &&
          !(lac && d.spareInLacune) &&
          !d.bilateralOnly &&
          (finalLevel(r.id) >= Math.max(0.25, d.minLevel ?? 0) - 1e-6 ||
            // graded below the threshold in a compact region, while still noticeable (Z2-8)
            (!lac && tapers(r, d) && (d.sev ?? 2) * gradeFactor(finalLevel(r.id), true) >= NOTICEABLE)),
      );
    });

  const vol = { supra: { r: 0, l: 0 } as Record<Side, number>, cerebellum: { r: 0, l: 0 } as Record<Side, number>, brainstem: 0, total: 0 };
  let untreatedTotal = 0;
  /**
   * what the treatment spares bed by bed, not offset by what a clot fragment it sent infarcts
   * elsewhere: whether a reopening saved a sliver (T3-11) asks what it saved, not the net change
   */
  let savedGross = 0;
  /** supratentorial infarct per side that only the untreated course has (what treatment spares) */
  const untreatedSupra: Record<Side, number> = { r: 0, l: 0 };
  for (const b of BEDS) {
    const reg = REGION_BY_ID[b.region];
    // the compartment decides where swelling goes: above the tentorium (hemispheric mass
    // effect, herniation) or in the tight posterior fossa (brainstem compression, hydrocephalus)
    if (reg.compartment === 'none') continue;
    const v = (bedFinal[b.id] ?? 0) * b.volume;
    const vu = (bedFinalUntreated[b.id] ?? 0) * b.volume;
    untreatedTotal += vu;
    savedGross += Math.max(0, vu - v);
    vol.total += v;
    const s = reg.side === 'm' ? 'r' : reg.side;
    if (reg.compartment === 'supra') {
      vol.supra[s] += v;
      untreatedSupra[s] += vu - v;
    }
    else if (reg.category === 'brainstem') vol.brainstem += v;
    else vol.cerebellum[s] += v;
  }
  /** what the treatment spares of the primary infarct (the penumbra it rescues) */
  const savedPrimary = Math.max(0, untreatedTotal - vol.total);
  /**
   * what it spares in the end: the untreated final infarct with its herniation's secondary infarcts
   * less this course's, so a herniation infarct it prevents counts as saved (V1-6); the primary
   * part until those are placed (below)
   */
  let savedVolume = savedPrimary;
  /** … of which the infarcts of a herniation that the untreated swelling would have caused */
  let savedSecondary = 0;
  /**
   * the treatment saved a sliver (savedSliver, T3-11), against the infarct the course would leave
   * without it: what it spared bed by bed, with the herniation infarcts it prevents (a reopening
   * that saves the pons is not a sliver because its clot fragment infarcted a P2 territory)
   */
  const sliver = () => savedSliver(savedGross + savedSecondary, input.untreatedWithSecondary ?? untreatedTotal);
  const earlySupra: Record<Side, number> = { r: 0, l: 0 };
  /** the MCA share of each hemisphere's infarct, early (≤ 14 h) and final (Z3-4) … */
  const mcaEarly: Record<Side, number> = { r: 0, l: 0 };
  const mcaFinal: Record<Side, number> = { r: 0, l: 0 };
  /**
   * … and its final infarct, of the hemisphere's own lesion: the beds whose lesion began within a day
   * of it (U1-2). The early lesion is measured within 14 h of one onset: a left M2 infarct of 107 mL
   * was called "≈ 161 mL within 14 h (> 145 mL carries high risk)" and its moderate mass effect, a
   * week old, retitled a malignant oedema, because a left P2 infarct that began a week later was
   * added in. A lesion that begins later swells on its own clock, and its swelling counts where the
   * oedema model adds it up (the shift, the consciousness, a coma from the swelling).
   */
  const mainFinal: Record<Side, number> = { r: 0, l: 0 };
  const inMain = (b: Bed, s: Side) => Math.abs((input.bedOnsetH?.[b.id] ?? 0) - (input.hemiOnsetH?.[s] ?? 0)) <= OEDEMA_ONSET_H;
  for (const b of BEDS) {
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment !== 'supra') continue;
    const s = reg.side === 'm' ? 'r' : reg.side;
    if (!inMain(b, s)) continue;
    earlySupra[s] += (input.bedEarly[b.id] ?? 0) * b.volume;
    mainFinal[s] += (bedFinal[b.id] ?? 0) * b.volume;
    const mca = mcaShareOf(b);
    mcaEarly[s] += mca * (input.bedEarly[b.id] ?? 0) * b.volume;
    mcaFinal[s] += mca * (bedFinal[b.id] ?? 0) * b.volume;
  }
  const lacuneIschaemia = input.lacuneIschaemia ?? [];
  const vesselIschemia = Object.entries(regionAcute).some(([rid, x]) => x >= 0.05 && STORY_TISSUE.has(REGION_BY_ID[rid]?.category));
  // lacunar (single-branch) occlusions do not enter regionAcute; alone they get their own window
  // story (C2-F7)
  const lacunarOnly = !vesselIschemia && lacuneIschaemia.length > 0;
  const decisionSupra: Record<Side, number> = { r: 0, l: 0 };
  if (input.bedAtDecision)
    for (const b of BEDS) {
      const reg = REGION_BY_ID[b.region];
      if (reg.compartment === 'supra') decisionSupra[reg.side === 'm' ? 'r' : reg.side] += (input.bedAtDecision[b.id] ?? 0) * b.volume;
    }
  const story = windowStoryOf(input.occlusions, input.bedAtDecision ? Math.max(decisionSupra.r, decisionSupra.l) : null, input.priorInfarctH ?? null);

  // ── 1–2. hyperacute mechanisms, imaging and treatment windows ──────
  // which story fits: only the retina is ischaemic (eye stroke), brain ischaemia that leaves no
  // infarct (a TIA, or tissue held by collaterals), or a brain infarct. Ischaemia of the spinal
  // cord, an arm or the face alone is none of these (Z4-11: an anterior spinal artery occlusion
  // that infarcts the cord, or an external carotid or distal subclavian occlusion, was told as a
  // TIA of the brain).
  const ischaemicRegions = [...new Set([...Object.keys(regionAcute).filter((rid) => regionAcute[rid] >= 0.05), ...lacuneIschaemia])].filter((rid) =>
    STORY_TISSUE.has(REGION_BY_ID[rid]?.category),
  );
  const eyeOnly = ischaemicRegions.length > 0 && ischaemicRegions.every((rid) => REGION_BY_ID[rid].category === 'eye');
  /** the brain or the inner ear is ischaemic: a brain-stroke, inner-ear or TIA story */
  const brainStory = ischaemicRegions.length > 0 && !eyeOnly;
  // only the inner ear, and it infarcts (C7-F7): an end-organ infarct that the brain volume does
  // not count; a labyrinthine artery that reopens in time stays a TIA
  const earInfarct = brainStory && ischaemicRegions.every((rid) => REGION_BY_ID[rid].category === 'ear') && ischaemicRegions.some((rid) => infarcted(rid, 0.25));
  const noInfarct = brainStory && !earInfarct && vol.total < 0.05;
  /** the event of an artery reopening by itself, made again once what it saved is known (U2-10) */
  let spontaneousEv: CascadeEvent | null = null;
  if (eyeOnly) pushEyeEvents(events);
  else if (earInfarct) pushEarEvents(events);
  else if (noInfarct)
    events.push(
      ...noInfarctEvents(0, Infinity, {
        // when the deficit cleared, as the symptom list shows it (the first pass: when the flow came back)
        clearsH: input.listed?.deficitClearsH !== undefined ? input.listed.deficitClearsH : input.flowReturnsH ?? null,
        window: lacunarOnly ? LACUNAR_WINDOW : treatmentWindowDesc(story),
        earOnly: ischaemicRegions.every((rid) => REGION_BY_ID[rid].category === 'ear'),
        thrombolysed:
          reperfusionH !== null && input.occlusions.some(isTreatable) && !!input.treatment && input.treatment.method !== 'evt' && !input.treatment.failed,
        // (a treatment that reopened the artery has been given: its windows end then, V1-11)
        treatedH: reperfusionH !== null && input.occlusions.some(isTreatable) && !input.treatment?.failed ? reperfusionH : null,
      }),
    );
  else if (brainStory) {
    // energy failure → excitotoxicity → calcium, free radicals, inflammation
    // (Dirnagl, Iadecola & Moskowitz, Trends Neurosci 1999)
    events.push({
      id: 'ischemic_cascade',
      kind: 'mechanism',
      severity: 'danger',
      onsetH: 0,
      endH: 6,
      title: { zh: '缺血連鎖反應（數秒至數分鐘）', en: 'Ischaemic cascade (seconds to minutes)' },
      desc: {
        zh: '血流中斷約 10 秒內神經元停止放電而出現症狀；數分鐘內能量（ATP）耗盡 → 鈉鉀幫浦失效 → 細胞腫脹（細胞毒性水腫）→ 麩胺酸大量釋放造成興奮毒性 → 鈣離子湧入、自由基與發炎反應 → 細胞死亡。組織死得多快，取決於還剩多少血流、缺血多久：終末動脈完全沒有血流的地方，深部穿通支供應的灰質（紋狀體）約半小時內壞死，旁邊內囊的白質較耐缺血，2–3 小時後常常還活著（中大腦動脈近端阻塞取栓越早，內囊越常保住）；側枝還送得到一點血的皮質可以撐幾個小時（清醒猴子的中大腦動脈阻塞 15–30 分鐘只留下顯微鏡下的小梗塞），血流越少死得越快；周邊的「缺血半影區」靠側枝循環可撐數小時到一天。還沒壞死的組織就是治療要搶救的目標；梗塞擴大的速度因人而異，大血管阻塞的中位數每小時約 3–5 mL，側枝差的人常超過每小時 10 mL。',
        en: 'Within ~10 s of lost flow neurons stop firing and symptoms begin. Within minutes ATP runs out → ion pumps fail → cells swell (cytotoxic oedema) → glutamate floods out (excitotoxicity) → calcium overload, free radicals and inflammation → cell death. How fast tissue dies depends on how little blood still reaches it and for how long: where an end artery leaves none at all, the deep grey matter of the perforator territories (the striatum) dies within about half an hour, while the white matter of the internal capsule beside it is often still alive after 2–3 hours (the earlier a proximal MCA occlusion is reopened, the more often the capsule is spared); cortex that collaterals still reach lasts for hours (in awake monkeys 15–30 min of MCA occlusion left only microscopic infarcts), the faster the less flow it gets; and the surrounding penumbra survives on collateral flow for hours to a day. Tissue not yet dead is what treatment tries to rescue; how fast the infarct grows varies widely, with a median of about 3–5 mL/h in large-vessel occlusion and often more than 10 mL/h with poor collaterals.',
      },
      regions: lacunarOnly ? lacuneIschaemia : infarctedRegions,
    });
    events.push({
      id: 'imaging_dwi',
      kind: 'imaging',
      severity: 'info',
      onsetH: 0.1,
      endH: 336,
      title: { zh: '影像：MRI 擴散加權在數分鐘內就看得到', en: 'Imaging: diffusion MRI positive within minutes' },
      desc: lacunarOnly
        ? {
            zh: 'DWI 很早就能顯示小小的腔隙性梗塞（直徑約 1.5 公分以下）；CT 常看不出來（腦幹尤其如此），但能先排除腦出血——這是血栓溶解治療前必做的檢查。',
            en: 'DWI shows the small lacunar infarct (under about 1.5 cm across) early; CT is often normal (especially in the brainstem) but excludes haemorrhage, which is required before thrombolysis.',
          }
        : {
            zh: 'DWI 可在數分鐘內顯示梗塞核心；CT 在最初幾小時常看不出來（約 6 小時後才逐漸變暗），但能先排除腦出血——這是血栓溶解治療前必做的檢查。',
            en: 'DWI shows the core within minutes; CT is often normal for the first hours (hypodensity appears after ~6 h) but excludes haemorrhage, which is required before thrombolysis.',
          },
      regions: [],
    });
    // offered within a day of onset, until the artery is reopened (by treatment or by itself): an
    // artery already open was still offered thrombolysis and thrombectomy for the rest of the day
    // (V1-11), while the TIA story already ended them when the deficit cleared (Z4-11)
    const windowEndH = Math.min(24, input.reopensH ?? Infinity);
    if (windowEndH > 0)
      events.push({
        id: 'treatment_window',
        kind: 'treatment',
        severity: 'warn',
        onsetH: 0,
        endH: windowEndH,
        title: { zh: '治療時間窗', en: 'Treatment windows' },
        desc: lacunarOnly ? LACUNAR_WINDOW : treatmentWindowDesc(story),
        regions: [],
      });
    // an artery that reopens by itself, leaving an infarct, is told then, as a treated reopening is
    // (U2-10); what it saved is known once this course's own secondary infarcts are (below)
    if (input.spontaneous && !earInfarct) {
      spontaneousEv = spontaneousEvent(input.spontaneous, 0, 0);
      events.push(spontaneousEv);
    }
    // … and again once the artery a treatment reopened has closed again, for the rest of the first
    // day: the reopening ended them only while the artery stayed open (U2-1)
    const reclosedH = input.treatment && !input.treatment.failed ? input.treatment.reocclusionH : null;
    if (reclosedH !== null && reclosedH >= windowEndH && reclosedH < 24) {
      const w = treatmentWindowDesc(story);
      events.push({
        id: 'treatment_window',
        kind: 'treatment',
        severity: 'warn',
        onsetH: reclosedH,
        endH: 24,
        title: { zh: '治療時間窗', en: 'Treatment windows' },
        desc: { zh: REOCCLUDED_WINDOW_INTRO.zh + w.zh, en: `${REOCCLUDED_WINDOW_INTRO.en} ${w.en}` },
        regions: [],
      });
    }
  }

  // the spinal cord has a story of its own, beside the brain's when the medulla is ischaemic too (W3-8)
  const cordRegions = Object.keys(regionAcute).filter((rid) => REGION_BY_ID[rid]?.category === 'spinal' && regionAcute[rid] >= 0.05);
  if (cordRegions.length) {
    const cordFinal = BEDS.reduce((a, b) => a + (REGION_BY_ID[b.region].category === 'spinal' ? (bedFinal[b.id] ?? 0) * b.volume : 0), 0);
    pushCordEvents(events, cordRegions, { infarct: cordFinal >= 0.05, brain: brainStory });
  }

  const treatment = input.treatment;
  // only an occlusion that treatment can reopen: a single branch (lacune) or a stenosis stays
  const reopenable = input.occlusions.some(isTreatable);
  // the brain-tissue reperfusion story (penumbra saved, in mL) does not fit an eye or inner-ear
  // infarct, whose end organ the brain volumes do not count
  /**
   * the recanalisation event, made again once the course's own fatal risks are known (below): it
   * is graded and worded by what the untreated course would have brought and this one does not
   * (Z2-3)
   */
  let reperfusion: { at: number; make: (avoided: FatalRisk[], treatedFatal: boolean) => CascadeEvent } | null = null;
  // the infarct the treatment spares lies mostly in the right hemisphere (Woo 1999)
  const rightSided = untreatedSupra.r > untreatedSupra.l;
  if (reperfusionH !== null && brainStory && !earInfarct && reopenable && treatment) {
    // hours from the onset of the (most recent) reopened occlusion, as in the settings panel
    const starts = input.occlusions.filter((o) => reopenedByTreatment(o, reperfusionH)).map(startOf);
    const delayH = starts.length ? reperfusionH - Math.max(...starts) : reperfusionH;
    reperfusion = {
      at: events.length,
      make: (avoided, treatedFatal) =>
        reperfusionEvent(treatment, reperfusionH, savedVolume, delayH, input.reperfusionOutcome, avoided, treatedFatal, rightSided, savedSecondary, sliver()),
    };
    events.push(reperfusion.make([], false));
    pushTreatmentComplications(events, treatment, reperfusionH);
  } else if (reperfusionH !== null && brainStory && !earInfarct && reopenable) {
    const late = reperfusionH > 6;
    const make = (avoided: FatalRisk[], treatedFatal: boolean): CascadeEvent => {
      const o = outcomeSentence(input.reperfusionOutcome, savedVolume, avoided, treatedFatal, rightSided, sliver());
      const sp = savedPhrase(savedVolume);
      return {
        id: 'reperfusion',
        kind: 'treatment',
        severity: reperfusionSeverity(input.reperfusionOutcome, savedVolume, avoided, sliver()),
        onsetH: reperfusionH,
        title: { zh: '血管再通（血栓溶解／取栓）', en: 'Recanalisation (thrombolysis / thrombectomy)' },
        desc: {
          zh: `血流恢復時尚未壞死的半影區被救回，模型估計少了${sp.zh} 的梗塞${savedSplit(savedVolume, savedSecondary).zh}。${o.zh}${REGAIN_NOTE.zh}已經壞死的核心不會恢復；${late ? '較晚再通時，' : ''}再灌流也可能帶來出血轉化與再灌流傷害。`,
          en: `Restored flow rescues penumbra that has not yet died — the model estimates ${sp.en} less infarct${savedSplit(savedVolume, savedSecondary).en}.${o.en}${REGAIN_NOTE.en} The dead core does not recover; ${late ? 'with late recanalisation ' : ''}reperfusion can also bring haemorrhagic transformation and reperfusion injury.`,
        },
        regions: [],
      };
    };
    reperfusion = { at: events.length, make };
    events.push(make([], false));
  }

  // ── 3. oedema & mass effect ────────────────────────────────────
  let hydrocephalusOnsetH: number | null = null;
  let hydrocephalusEndH: number | null = null;
  const fatalRisk = new Set<FatalRisk>();
  let palatalTremorFromH: number | null = null;
  /**
   * when each hemisphere's and the posterior fossa's own lesion began (clinical clock; before the
   * index onset for an earlier lesion): its swelling, its herniation and its oedema events run on
   * that clock. With stacked occlusions the other hemisphere's swelling follows its own lesion
   * (Z3-4: the oedema of a right M1 occluded two days after a left one began on day 1 of the left),
   * and so does an earlier lesion's (V1-1: a malignant right M1 infarct lost its swelling, its
   * herniation infarct and its events for days when a larger left M1 began a week later and became
   * the index event)
   */
  const lesionOnset = (k: Side | 'infra') => input.hemiOnsetH?.[k] ?? 0;
  const sideOnset = (sd: Side) => lesionOnset(sd);
  const infraOnset = lesionOnset('infra');
  if (vol.total >= 3) {
    // the index lesion's, joined with those of the other lesions whose oedema overlaps it: from the
    // first barrier breakdown to the last resolution (V1-1: a malignant right M1 infarct's oedema
    // event vanished for half a day when a larger left M1 began a week later)
    let first = 12;
    let last = 400;
    const others = [
      ...(['r', 'l'] as Side[]).filter((sd) => vol.supra[sd] > 0).map(sideOnset),
      ...(vol.cerebellum.r + vol.cerebellum.l + vol.brainstem > 0 ? [infraOnset] : []),
    ].sort((a, b) => a - b);
    for (let grew = true; grew; ) {
      grew = false;
      for (const o of others)
        if (o + 12 < last && o + 400 > first && (o + 12 < first || o + 400 > last)) {
          [first, last, grew] = [Math.min(first, o + 12), Math.max(last, o + 400), true];
        }
    }
    events.push({
      id: 'vasogenic_edema',
      kind: 'mechanism',
      severity: 'warn',
      onsetH: first,
      peakH: first + 72,
      endH: last,
      shiftSymptoms: true,
      title: { zh: '血管性水腫（第 2–5 天達高峰）', en: 'Vasogenic oedema (peaks day 2–5)' },
      desc: {
        zh: '血腦屏障受損，液體滲入梗塞組織，腦組織腫脹。小梗塞影響不大；大梗塞會擠壓周圍與遠處的腦組織，約 2–3 週後消退。',
        en: 'The blood–brain barrier breaks down and fluid leaks into the infarct, which swells. Small infarcts cope; large ones compress nearby and distant brain. Oedema resolves over ~2–3 weeks.',
      },
      regions: infarctedRegions,
    });
  }
  // Both hemispheres infarcted to a size that gives mass effect (Y2-13): their swelling is counted
  // together (edema.massEffectMm: it pushes the brain down rather than across), so together they
  // can reach the malignant course and the coma range although the midline hardly moves
  /** texts that quote the final volumes, written once the herniations' secondary infarcts are placed (Y3-3) */
  const withVolumes: ((wholeMl: number, secondaryMl: Record<Side, number>) => void)[] = [];
  // (both hemispheres swell together only when their lesions' swellings overlap in time: a lesion
  // whose oedema has resolved by the time the other begins swells apart from it, U1-14)
  const bothSwell = mainFinal.r >= MASS_EFFECT_ML && mainFinal.l >= MASS_EFFECT_ML && Math.abs(sideOnset('r') - sideOnset('l')) < OEDEMA_END_H - OEDEMA_ONSET_H;
  // (and are held together against the sizes of one malignant infarct only when they began within a
  // day of each other, before either's swelling event: the early lesion of one, measured within 14 h,
  // says nothing of a lesion that begins days later, and an event that has begun is not retitled by
  // a later occlusion, U1-14)
  const together = Math.abs(sideOnset('r') - sideOnset('l')) <= OEDEMA_ONSET_H;
  // Together, two hemispheres reach the malignant course only by their MCA infarcts, each of a size
  // that swells (Z3-4): the thresholds come from MCA-territory infarction (Oppenheim 2000; Hacke
  // 1996; Vahedi 2007), and the anterior and posterior cerebral territories do not swell
  // malignantly in those series. Two ACA or PCA infarcts, or one beside an MCA infarct, keep a
  // moderate mass effect, whose swelling still counts together for the level of consciousness.
  const bothMca = mcaFinal.r >= MASS_EFFECT_ML && mcaFinal.l >= MASS_EFFECT_ML;
  const jointMalignant = bothSwell && together && bothMca && (mcaEarly.r + mcaEarly.l >= MALIGNANT_EARLY_ML || mcaFinal.r + mcaFinal.l >= MALIGNANT_FINAL_ML);
  /** at risk by this hemisphere's own infarct, not only with the other's (Z3-4) */
  const ownRiskOf = (sd: Side) => earlySupra[sd] >= MALIGNANT_EARLY_ML || mainFinal[sd] >= MALIGNANT_FINAL_ML;
  /**
   * the course of a hemisphere's swelling that decides its herniation: its own swelling's (U1-0); with
   * the other hemisphere's swelling too small to be told (not both swelling), also the swelling of
   * both together pushing from it, which the coma follows (HerniationShift.alone)
   */
  const courseOf = (sd: Side): HerniationShift | undefined => {
    const sh = input.shift?.[sd];
    return sh?.alone && !bothSwell ? { ...sh, ...sh.alone } : sh;
  };
  /**
   * The herniation of one hemisphere, by its own swelling (U1-0): from day 3 of its own lesion
   * (V1-1), or later when its own swelling reaches the coma range later, until it falls below it
   * again (R6-5, R6-2). The swelling of the other hemisphere pushes back and lessens the midline
   * shift, but it does not take this hemisphere's herniation away, nor its secondary infarcts (a
   * malignant right M1 infarct herniated downward without them beside a left M2 infarct whose
   * swelling brought the net push across under the coma range, and lost 188 mL of infarct).
   *
   * Two hemispheres that swell alike push the brain down, not across (V1-4): transtentorial
   * herniation is lateral or central (Riveros Gilardi 2019), and a herniation to one side, with a
   * subfalcine herniation, a one-sided third-nerve palsy and a Kernohan notch, needs the midline
   * pushed across (both cervical ICAs herniated to the right beside a midline shift of 1.3 mm). So a
   * herniating hemisphere is told as herniating to its side (`lateral`) when, as its herniation
   * begins, the midline is pushed across from it by LATERAL_MM or more; otherwise it herniates
   * downward with the other one, centrally, and keeps the secondary infarcts its own swelling causes
   * (below).
   */
  const herniationOf = (sd: Side) => {
    const sh = courseOf(sd);
    const floor = sideOnset(sd) + UNCAL_ONSET_H;
    const uncalH = Math.max(floor, sh?.comaFromH ?? floor);
    const endH = sh ? sh.comaUntilH : sideOnset(sd) + HERNIATION_END_H;
    const malignant = ownRiskOf(sd) || jointMalignant || (sh?.comaFromH ?? null) !== null;
    const herniates = malignant && !decompression && (!sh || (sh.comaFromH !== null && (endH === null || endH > uncalH)));
    const lateral = herniates && (!bothSwell || sh?.acrossMm === undefined || sh.acrossMm >= LATERAL_MM);
    return { sh, uncalH, endH, herniates, lateral };
  };
  const hern = { r: herniationOf('r'), l: herniationOf('l') };
  // The central herniation (V1-4): of the hemispheres that herniate by their own swelling without
  // the midline pushed across from them, or, when neither herniates by its own swelling, of two
  // that swell together into the coma range (both cervical ICAs), from day 3 of the newer lesion,
  // while their joint swelling stays in the coma range; then with no secondary infarct, as the
  // swelling of neither tells which side or how much.
  const cs = input.centralShift;
  const participants = (['r', 'l'] as Side[]).filter((sd) => hern[sd].herniates && !hern[sd].lateral);
  const centralFromH = cs && cs.comaFromH !== null ? Math.max(Math.max(sideOnset('r'), sideOnset('l')) + UNCAL_ONSET_H, cs.comaFromH) : null;
  const jointOnly =
    !decompression && bothSwell && !!cs && centralFromH !== null && (cs.comaUntilH === null || cs.comaUntilH > centralFromH) && !hern.r.herniates && !hern.l.herniates;
  const central: { fromH: number; untilH: number | null; peakMm: number; sides: Side[] } | null = participants.length
    ? {
        fromH: Math.min(...participants.map((sd) => hern[sd].uncalH)),
        // (while the joint swelling, or the swelling of one of them, stays in the coma range)
        untilH:
          cs && cs.comaFromH !== null
            ? cs.comaUntilH
            : participants.some((sd) => hern[sd].endH === null)
              ? null
              : Math.max(...participants.map((sd) => hern[sd].endH as number)),
        peakMm: cs ? cs.peakMm : Math.max(...participants.map((sd) => hern[sd].sh?.peakMm ?? 0)),
        sides: participants,
      }
    : jointOnly
      ? { fromH: centralFromH!, untilH: cs!.comaUntilH, peakMm: cs!.peakMm, sides: [] }
      : null;
  /** the swelling of this hemisphere reaches the coma range by itself (W2-1), or it herniates downward with the other one */
  const swellsIntoComaOf = (sd: Side) => (courseOf(sd)?.comaFromH ?? null) !== null || (central !== null && vol.supra[sd] >= MASS_EFFECT_ML);
  /** the herniations that begin, to one side or downward: the fatal event follows the first (U1-14) */
  const herniationStarts: { id: string; onsetH: number }[] = [];
  /**
   * the beds a herniation beginning at `h` (clinical clock) compresses into a secondary infarct:
   * those of its side still alive then, which the lesions begun by then do not infarct for the most
   * part. A later occlusion that would infarct them too does not bring back what the herniation
   * killed before it began (U1-3: the ACA territory a subfalcine herniation infarcted on day 3 came
   * back as penumbra when the A2 closed on day 7)
   */
  const compressedBeds = (sd: Side, supply: RegExp, h: number) => {
    const final = input.compressibleBy?.(h) ?? input.untreatedFinalBy?.(h) ?? bedFinalUntreated;
    return BEDS.filter((b) => b.region.endsWith(`_${sd}`) && b.supply.some((x) => supply.test(x.v)) && stillAlive(final[b.id]));
  };
  // (the midline moves little only when the two swell alike; otherwise the larger swelling still
  // pushes it across, by less than alone: U1-0. Both as the Now tab shows the midline shift, with the
  // herniations' own infarcts, T1-1: "at most about 7.5 mm" was quoted beside a shown 9.35 mm)
  /** the largest midline shift while both swell, from either side */
  const across = input.shownLateralPeakMm ?? Math.max(input.shift?.r?.lateralPeakMm ?? 0, input.shift?.l?.lateralPeakMm ?? 0);
  /** whether the midline stays nearly in place while both swell (the shift pushing from either side never reaches LATERAL_MM) */
  const alike = bothSwell && across < LATERAL_MM;
  for (const s of ['r', 'l'] as Side[]) {
    const v = vol.supra[s];
    const sideZh = s === 'r' ? '右' : '左';
    const sideEn = s === 'r' ? 'right' : 'left';
    const o: Side = s === 'r' ? 'l' : 'r';
    const bilateralNote: L = !bothSwell
      ? { zh: '', en: '' }
      : alike
        ? {
            zh: `另一側半球也梗塞了（最終約 ${vol.supra[o].toFixed(0)} mL；兩側在 14 小時內合計約 ${(earlySupra.r + earlySupra.l).toFixed(0)} mL）：兩側一起腫脹，把腦往下擠而不是推向對側，中線移動不多（兩側同時腫脹時最多約 ${across.toFixed(1)} mm）；模型把兩側的腫脹加在一起，視同單側半球的腫脹來決定意識（這是模型的選擇：Ropper 的分級是在單側占位病人測得的）。`,
            en: ` The other hemisphere is infarcted too (≈ ${vol.supra[o].toFixed(0)} mL in the end; ≈ ${(earlySupra.r + earlySupra.l).toFixed(0)} mL in both within 14 h): the two swell together and push the brain down rather than across, so the midline moves little (at most about ${across.toFixed(1)} mm while both swell); the model counts their swelling together, as if it were one hemisphere's, for the level of consciousness (a model choice: Ropper's bands were measured for one-sided masses).`,
          }
        : {
            zh: `另一側半球也梗塞了（最終約 ${vol.supra[o].toFixed(0)} mL；兩側在 14 小時內合計約 ${(earlySupra.r + earlySupra.l).toFixed(0)} mL）：兩側同時腫脹、互相抵銷一部分，中線被推過去的距離比腫得較厲害的一側單獨腫脹時少（這裡最多約 ${across.toFixed(1)} mm）；模型把兩側的腫脹加在一起，視同單側半球的腫脹來決定意識（這是模型的選擇：Ropper 的分級是在單側占位病人測得的）。`,
            en: ` The other hemisphere is infarcted too (≈ ${vol.supra[o].toFixed(0)} mL in the end; ≈ ${(earlySupra.r + earlySupra.l).toFixed(0)} mL in both within 14 h): the two swell at the same time and partly balance each other, so the midline is pushed across less than the larger swelling alone would push it (here at most about ${across.toFixed(1)} mm); the model counts their swelling together, as if it were one hemisphere's, for the level of consciousness (a model choice: Ropper's bands were measured for one-sided masses).`,
          };
    // malignant course: early (≤ 14 h) lesion > 145 mL (Oppenheim 2000) or a very large final infarct.
    // The level of consciousness is not fixed by this event: simulate() takes it from the midline
    // shift the oedema model computes at the displayed time (Ropper AH. N Engl J Med 1986;314:953–958;
    // C4-F2). Timing: of 53 massive MCA infarcts that deteriorated from oedema, 36% did so within
    // 24 h and 68% by 48 h, and deaths peaked on day 3 (Qureshi AI et al. Crit Care Med
    // 2003;31:272–277); deterioration over days 2–5 (Hacke W et al. Arch Neurol 1996;53:309–315).
    const ownRisk = ownRiskOf(s);
    // The swelling the oedema model computes for this hemisphere (alone, or with the other one:
    // Y2-13) reaches the coma range, whatever the size thresholds say (W2-1): a swelling that
    // large is a malignant oedema, and it herniates as the others do (from day 3, while the shift
    // stays in the coma range: R6-5). Two carotid territories (MCA and ACA), each under the
    // malignant sizes, swelled together into coma for a week with no herniation and no fatal risk;
    // so did one hemisphere of 245 mL that shifted the midline by 9 mm. (In Ropper's patients the
    // first fall in consciousness, even coma, came with the horizontal shift before any
    // transtentorial herniation, which is why the coma here comes first and the herniation from
    // day 3: Ropper 1986.)
    const swellsIntoComa = swellsIntoComaOf(s);
    if (ownRisk || jointMalignant || swellsIntoComa) {
      // Without decompression the swelling herniates when the oedema model's midline shift
      // reaches the coma range (≥ 8 mm, Ropper 1986): from day 3, or later when the shift gets
      // there later, until it falls below it again; a shift that stays below it brings
      // drowsiness or stupor, not a herniation (R6-5, R6-2). A large early lesion still carries
      // the risk, which the event names.
      const { sh, uncalH, endH: herniationEndH, herniates, lateral } = hern[s];
      const peakMm = central ? +central.peakMm.toFixed(1) : sh ? +sh.peakMm.toFixed(1) : null;
      const ownPeak = sh?.ownPeakMm !== undefined ? +sh.ownPeakMm.toFixed(1) : peakMm;
      const outlook: L = decompression
        ? { zh: '已施行減壓性顱骨切除，讓腦組織向外膨出而不壓迫腦幹。', en: 'Decompressive craniectomy lets the brain swell outward instead of into the brainstem.' }
        : herniates && lateral
          ? { zh: '若未減壓，大多數會因疝脫死亡（見「疝脫後很可能死亡」）。', en: 'Without decompression most patients die of herniation (see "Death likely after herniation").' }
          : central
            ? {
                zh: '兩側一起腫脹：若未減壓，大多數會因腦向下的中央型疝脫死亡（見「中央型天幕切跡疝脫」與「疝脫後很可能死亡」）。',
                en: 'Swelling together with the other hemisphere, without decompression most patients die of a central herniation, the brain pushed down through the tentorial notch (see "Central transtentorial herniation" and "Death likely after herniation").',
              }
            : bothSwell && (peakMm ?? 0) >= COMA_SHIFT_MM && hern[o].lateral
            ? {
                zh: `與另一側合計的腫脹已達昏迷的範圍（換算約 ${peakMm} mm 的中線偏移），疝脫來自腫得較厲害的另一側半球（見該側的事件）。`,
                en: `Together with the other hemisphere's swelling it reaches the coma range (about ${peakMm} mm, counted as one side's midline shift); the herniation comes from the more swollen other hemisphere (see its events).`,
              }
            : bothSwell && (peakMm ?? 0) >= COMA_SHIFT_MM
            ? {
                zh: `與另一側合計的腫脹已達昏迷的範圍（換算約 ${peakMm} mm 的中線偏移），但在第 3 天之前就降到昏迷的範圍以下，模型沒有讓它疝脫。這麼大的梗塞仍是高風險，實務上要密切觀察。`,
                en: `Together with the other hemisphere's swelling it reaches the coma range (about ${peakMm} mm, counted as one side's midline shift), but falls below it again before day 3, and the model does not let it herniate. Lesions this size are still at high risk and are watched closely.`,
              }
            : bothSwell
              ? {
                  zh: `這裡兩側合計的腫脹最多換算約 ${peakMm} mm 的中線偏移，未達昏迷的範圍（8 mm）${
                    (peakMm ?? 0) >= STUPOR_SHIFT_MM ? '：病人變得木僵' : (peakMm ?? 0) >= DROWSY_SHIFT_MM ? '：病人變得嗜睡' : '，不足以讓意識下降'
                  }，也沒有疝脫。這麼大的梗塞仍是高風險，實務上要密切觀察。`,
                  en: `Here the swelling of both hemispheres together peaks at about ${peakMm} mm, counted as one side's midline shift, short of the coma range (8 mm)${
                    (peakMm ?? 0) >= STUPOR_SHIFT_MM ? ': the patient becomes stuporous' : (peakMm ?? 0) >= DROWSY_SHIFT_MM ? ': the patient becomes drowsy' : ', too little to lower consciousness'
                  }, and does not herniate. Lesions this size are still at high risk and are watched closely.`,
                }
              : {
                  zh: `這裡模型算出的腫脹讓中線偏移最多約 ${peakMm} mm，未達昏迷的範圍（8 mm）${
                    (peakMm ?? 0) >= STUPOR_SHIFT_MM ? '：病人變得木僵' : (peakMm ?? 0) >= DROWSY_SHIFT_MM ? '：病人變得嗜睡' : '，不足以讓意識下降'
                  }，也沒有疝脫。這麼大的梗塞仍是高風險，實務上要密切觀察，並考慮減壓手術（試驗在 48 小時內手術）。`,
                  en: `Here the swelling the model computes peaks at about ${peakMm} mm of midline shift, short of the coma range (8 mm)${
                    (peakMm ?? 0) >= STUPOR_SHIFT_MM ? ': the patient becomes stuporous' : (peakMm ?? 0) >= DROWSY_SHIFT_MM ? ': the patient becomes drowsy' : ', too little to lower consciousness'
                  }, and does not herniate. A lesion this size is still at high risk; in practice it is watched closely and decompression is considered (the trials operated within 48 h).`,
                };
      // The volumes (Y3-3): the early lesion is the risk criterion; "in the end" is the figure the
      // Outcome tab shows as the final infarct — with the infarcts the herniation adds (the ACA and
      // PCA territories it compresses), when it adds any, which are known only once its effects
      // are placed (withVolumes below)
      const early = earlySupra[s].toFixed(0);
      // (when both swell, the push across is the rule for one swollen hemisphere, which the note on
      // the other then qualifies: V1-4)
      const rest = {
        zh: `${bothSwell ? '單側腫脹的半球會把中線推向對側' : '腫脹的半球把中線推向對側'}，意識隨中線偏移變差（Ropper 1986，24 位急性半球占位病人，多為血腫，所以只是大約：松果體偏移 3–4 mm 嗜睡、6–8.5 mm 木僵、8–13 mm 昏迷；模型從 4 mm 起算嗜睡、6 mm 木僵、8 mm 昏迷）。${bilateralNote.zh}惡化多半很早：一個 53 人的系列中 36% 在 24 小時內、68% 在 48 小時內惡化，死亡最常發生在第 3 天；另一系列在第 2–5 天。${outlook.zh}`,
        en: ` ${bothSwell ? 'On its own, a swollen hemisphere pushes' : 'The swollen hemisphere pushes'} the midline across, and consciousness falls with the shift (Ropper 1986, 24 patients with acute hemispheric masses, mostly haematomas, so the bands are approximate: pineal shift 3–4 mm drowsy, 6–8.5 mm stupor, 8–13 mm coma; the model counts drowsiness from 4 mm, stupor from 6 mm and coma from 8 mm).${bilateralNote.en} Deterioration usually comes early: in a series of 53 patients 36% deteriorated within 24 h and 68% by 48 h, and deaths peaked on day 3; another series describes days 2–5. ${outlook.en}`,
      };
      const event: CascadeEvent = {
        id: `malignant_edema_${s}`,
        kind: 'secondary',
        severity: 'danger',
        onsetH: sideOnset(s) + 24,
        peakH: sideOnset(s) + 72,
        endH: sideOnset(s) + 336,
        shiftSymptoms: true,
        title:
          decompression || herniates || central
            ? { zh: `${sideZh}大腦半球惡性腦水腫`, en: `Malignant ${sideEn}-hemisphere oedema` }
            : { zh: `${sideZh}大腦半球：惡性腦水腫高風險`, en: `${sideEn === 'right' ? 'Right' : 'Left'} hemisphere: high risk of malignant oedema` },
        desc: { zh: '', en: '' },
        regions: infarctedRegions.filter((r) => r.endsWith(`_${s}`)),
      };
      withVolumes.push((wholeMl, secondaryMl) => {
        const primary = v.toFixed(0);
        const withSecondary = (v + secondaryMl[s]).toFixed(0);
        const shown = secondaryMl[s] >= 0.5 ? withSecondary : primary;
        // other infarcts (the other hemisphere, the posterior fossa) make the whole brain's figure larger
        const whole = wholeMl.toFixed(0);
        const own = whole !== shown;
        const note = own
          ? { zh: `（全腦合計約 ${whole} mL，即「最終」頁的最終梗塞）`, en: ` (≈ ${whole} mL in the whole brain, the final infarct on the Outcome tab)` }
          : { zh: '', en: '' };
        // (a lesion of this hemisphere that began at another time is not this swelling's, U1-2: the
        // figures are this lesion's, with the hemisphere's beside them)
        const apart = v - mainFinal[s] >= 0.5;
        const here = own || apart ? { zh: '這一側', en: ' in this hemisphere' } : { zh: '', en: '' };
        // (the whole brain's figure, without secondary infarcts, inside the same parentheses)
        const merged = apart && own && secondaryMl[s] < 0.5;
        const end: L = apart
          ? {
              zh: `最終約 ${mainFinal[s].toFixed(0)} mL（加上另一次在不同時間開始的梗塞，這一側合計約 ${primary} mL${merged ? `；全腦合計約 ${whole} mL，即「最終」頁的最終梗塞` : ''}）`,
              en: `≈ ${mainFinal[s].toFixed(0)} mL in the end (≈ ${primary} mL in this hemisphere with an infarct that began at another time${merged ? `; ≈ ${whole} mL in the whole brain, the final infarct on the Outcome tab` : ''})`,
            }
          : { zh: `${here.zh}最終約 ${primary} mL`, en: `≈ ${primary} mL${here.en} in the end` };
        // The 145 mL of the criterion is quoted beside this hemisphere's own early volume only when
        // that volume reaches it (Z3-4): a hemisphere at risk by its final volume alone says so, and
        // one at risk only together with the other says that the model counts the MCA infarcts of
        // both against the thresholds of one
        const prim = secondaryMl[s] >= 0.5;
        const head: L =
          earlySupra[s] >= MALIGNANT_EARLY_ML
            ? {
                zh: `發病 14 小時內的${prim ? '原發' : ''}梗塞已約 ${early} mL（> 145 mL 為惡性水腫高風險），${end.zh}`,
                en: `${prim ? 'Primary infarct' : 'Infarct'} ≈ ${early} mL within 14 h (> 145 mL carries high risk), ${end.en}`,
              }
            : ownRisk
              ? {
                  zh: `發病 14 小時內的${prim ? '原發' : ''}梗塞約 ${early} mL，未達早期判斷高風險的 145 mL，但${end.zh}：模型把最終 ${MALIGNANT_FINAL_ML} mL 以上的梗塞也算作惡性`,
                  en: `${prim ? 'Primary infarct' : 'Infarct'} ≈ ${early} mL within 14 h, under the 145 mL that marks a high risk early on, but ${end.en}, which the model counts as malignant too (${MALIGNANT_FINAL_ML} mL or more)`,
                }
              : {
                  zh: `發病 14 小時內的${prim ? '原發' : ''}梗塞約 ${early} mL，${end.zh}`,
                  en: `${prim ? 'Primary infarct' : 'Infarct'} ≈ ${early} mL within 14 h, ${end.en}`,
                };
        const tail: L = prim
          ? { zh: `；加上疝脫造成的續發梗塞，${here.zh}最終約 ${withSecondary} mL${note.zh}。`, en: `; with the secondary infarcts from the herniation ≈ ${withSecondary} mL${here.en} in the end${note.en}.` }
          : merged
            ? { zh: '。', en: '.' }
            : { zh: `${note.zh}。`, en: `${note.en}.` };
        const joint: L = ownRisk
          ? { zh: '', en: '' }
          : jointMalignant
            ? {
                zh: `單看這一側，早期的梗塞不到惡性梗塞的 145 mL；但兩側的中大腦動脈區梗塞都大到會腫脹，兩側合計 14 小時內約 ${(mcaEarly.r + mcaEarly.l).toFixed(0)} mL、最終約 ${(mcaFinal.r + mcaFinal.l).toFixed(0)} mL：模型把兩側合計，拿來和單側惡性梗塞的標準（14 小時內 > 145 mL，或最終很大的梗塞）比較。`,
                en: ` On its own this hemisphere's early infarct is under the 145 mL that marks a malignant infarct; but the MCA infarcts of both hemispheres are large enough to swell, ≈ ${(mcaEarly.r + mcaEarly.l).toFixed(0)} mL in both hemispheres together within 14 h and ≈ ${(mcaFinal.r + mcaFinal.l).toFixed(0)} mL in the end, and the model holds both hemispheres together against the thresholds of one (> 145 mL within 14 h, or a very large final infarct).`,
              }
            : {
                // (how it herniates: to its own side, downward with the other hemisphere, or not at
                // all, the herniation coming from the other side: V1-4)
                zh: `單看大小，這個梗塞未達惡性梗塞的標準（14 小時內 > 145 mL，或最終很大的梗塞）；但${
                  bothSwell && herniates && lateral
                    ? `模型算出這一側半球本身的腫脹就已達昏迷的範圍（單獨約 ${ownPeak} mm 的中線偏移，模型從 8 mm 起算昏迷）`
                    : `模型算出的腫脹${bothSwell ? '與另一側合計' : ''}已達昏迷的範圍（${bothSwell ? '換算為單側' : ''}約 ${peakMm} mm 的中線偏移，模型從 8 mm 起算昏迷）`
                }${
                  herniates && lateral
                    ? '：腫到讓人昏迷就是惡性腦水腫，模型讓它和其他惡性水腫一樣，從第 3 天起、在中線偏移仍達昏迷範圍時疝脫。'
                    : central
                      ? '：腫到讓人昏迷就是惡性腦水腫。兩側腫得差不多，中線本身沒有被推到昏迷的範圍，模型讓腦向下疝脫（中央型疝脫），從第 3 天起、在兩側合計的腫脹仍達昏迷範圍時。'
                      : '。'
                }`,
                en: ` By its size alone this infarct does not reach the thresholds of a malignant infarct (> 145 mL within 14 h, or a very large final infarct); but ${
                  bothSwell && herniates && lateral
                    ? `the swelling the model computes for this hemisphere reaches the coma range on its own (about ${ownPeak} mm of midline shift alone; the model counts coma from 8 mm)`
                    : `the swelling the model computes${bothSwell ? ' together with the other hemisphere’s' : ''} reaches the coma range (about ${peakMm} mm${bothSwell ? ', counted as one side’s midline shift' : ' of midline shift'}; the model counts coma from 8 mm)`
                }${
                  herniates && lateral
                    ? '. A swelling that puts the patient into a coma is a malignant oedema, and the model lets it herniate as it does the others: from day 3, while the shift stays in the coma range.'
                    : central
                      ? '. A swelling that puts the patient into a coma is a malignant oedema. The two hemispheres swell alike and the midline itself is not pushed into the coma range, so the model lets the brain herniate downward (central herniation): from day 3, while their joint swelling stays in the coma range.'
                      : '.'
                }`,
              };
        event.desc = { zh: `${head.zh}${tail.zh}${joint.zh}${rest.zh}`, en: `${head.en}${tail.en}${joint.en}${rest.en}` };
      });
      events.push(event);
      if (decompression) {
        events.push({
          id: `hemicraniectomy_${s}`,
          kind: 'treatment',
          severity: 'good',
          onsetH: sideOnset(s) + 36,
          title: { zh: '減壓性半側顱骨切除術', en: 'Decompressive hemicraniectomy' },
          desc: {
            zh: '在 48 小時內（60 歲以下證據最強）移除一大片頭骨並擴大硬腦膜。三個隨機試驗的合併分析（60 歲以下、48 小時內）：一年存活 78% vs 未手術 29%，mRS 0–4 的比例 75% vs 24%；但存活者常留下中重度失能（Vahedi 2007）。',
            en: 'Removing a large bone flap and opening the dura within 48 h (strongest evidence under age 60). In the pooled analysis of three randomised trials (age ≤ 60, within 48 h) 1-year survival was 78% vs 29% without surgery and mRS 0–4 75% vs 24%, although survivors often remain moderately–severely disabled (Vahedi 2007).',
          },
          regions: [],
        });
      } else if (herniates && lateral) {
        const subfalcineH = uncalH - SUBFALCINE_LEAD_H;
        // the midbrain and the rostral pons are compressed while the herniation lasts (R6-7)
        const compressionEndH = herniationEndH ?? undefined;
        const aca = compressedBeds(s, ACA_UNDER_FALX, subfalcineH);
        aca.forEach((b) => addEffect(b.id, { kind: 'secondary', onsetH: subfalcineH, event: `subfalcine_${s}` }));
        events.push({
          id: `subfalcine_${s}`,
          kind: 'secondary',
          severity: 'danger',
          onsetH: subfalcineH,
          title: { zh: '大腦鐮下疝脫 → 同側前大腦動脈被壓迫', en: 'Subfalcine herniation → ipsilateral ACA compressed' },
          desc: {
            zh: '扣帶迴被擠到大腦鐮下方，夾住胼胝體周／胼胝體緣動脈，原本沒有阻塞的前大腦動脈區也發生「續發性梗塞」（腿無力加重、意志缺失）。',
            en: 'The cingulate gyrus is pushed under the falx and pinches the pericallosal/callosomarginal arteries, causing a secondary infarct in the previously normal ACA territory (worse leg weakness, abulia).',
          },
          regions: [...new Set(aca.map((b) => b.region))],
        });
        const pca = compressedBeds(s, PCA_AT_TENTORIUM, uncalH);
        pca.forEach((b) => addEffect(b.id, { kind: 'secondary', onsetH: uncalH, event: `uncal_${s}` }));
        const mid = BEDS.filter((b) => /^midbrain_/.test(b.region));
        mid.forEach((b) => addEffect(b.id, { kind: 'compressed', onsetH: uncalH, endH: compressionEndH, event: `uncal_${s}` }));
        const ponsH = uncalH + PONS_COMPRESSION_LAG_H;
        const pons = BEDS.filter((b) => /^pons_rostral_(tegmentum|basis)/.test(b.region));
        if (compressionEndH === undefined || compressionEndH > ponsH)
          pons.forEach((b) => addEffect(b.id, { kind: 'compressed', onsetH: ponsH, endH: compressionEndH, event: `uncal_${s}` }));
        // The coma, the third-nerve palsy and the Kernohan weakness last while the midline shift
        // is in the coma range (≥ 8 mm, Ropper 1986), so a survivor wakes as the swelling subsides
        // instead of at a fixed two weeks (C4-F1); the event itself ends then too, while the
        // secondary occipital infarct stays (R6-2, R6-7).
        // (its end on the clock of this hemisphere's own lesion, named when that is not the index
        // onset: a right herniation that eased 279 h after the right M1 closed was told as "about
        // -441 h after onset" when a left M1 a month later became the index event, T1-3, and moved
        // with when the left M1 closed, T1-12)
        const indexLesion = Math.abs(sideOnset(s)) < 1e-9;
        const endsAt: L =
          herniationEndH === null
            ? { zh: '', en: '' }
            : indexLesion
              ? { zh: `（這裡約在發病後 ${Math.round(herniationEndH)} 小時）`, en: ` (here about ${Math.round(herniationEndH)} h after onset)` }
              : {
                  zh: `（這裡約在這一側梗塞開始後 ${Math.round(herniationEndH - sideOnset(s))} 小時）`,
                  en: ` (here about ${Math.round(herniationEndH - sideOnset(s))} h after this hemisphere's infarct began)`,
                };
        events.push({
          id: `uncal_${s}`,
          kind: 'secondary',
          severity: 'danger',
          onsetH: uncalH,
          peakH: Math.max(120, uncalH),
          ...(herniationEndH === null ? {} : { endH: herniationEndH }),
          title: { zh: '顳葉鉤迴疝脫 → 壓迫中腦與後大腦動脈', en: 'Uncal (transtentorial) herniation → midbrain & PCA compressed' },
          desc: {
            zh: `內側顳葉從小腦天幕切跡擠下去：壓迫同側動眼神經（${sideZh}側瞳孔放大）、壓扁中腦（昏迷、去大腦姿勢）、夾住${sideZh}側後大腦動脈造成枕葉續發梗塞；對側大腦腳被頂到天幕邊緣（Kernohan 切跡）會讓「同側」肢體也無力。腦幹被往下拉扯可撕裂橋腦穿通動脈（Duret 出血），常致命。若病人存活，${
              bothSwell
                ? `疝脫要等這一側的腫脹消退、降到昏迷的範圍以下${endsAt.zh}才緩解，昏迷則要等兩側合計的腫脹降到昏迷範圍（換算 8 mm）以下才逐漸解除`
                : `昏迷要等水腫消退、中線偏移降到 8 mm以下${endsAt.zh}才逐漸解除`
            }；枕葉的續發梗塞會留下來。`,
            en: `The medial temporal lobe slides through the tentorial notch: it compresses the ${sideEn} oculomotor nerve (dilated ${sideEn} pupil), squeezes the midbrain (coma, posturing) and kinks the ${sideEn} PCA causing a secondary occipital infarct; the opposite peduncle pressed on the tentorium (Kernohan notch) weakens the SAME-side limbs. Downward stretch can tear pontine perforators (Duret haemorrhage), often fatal. If the patient survives, ${
              bothSwell
                ? `the herniation eases as this hemisphere's swelling subsides below the coma range${endsAt.en}, and the coma lifts only gradually as the swelling of both hemispheres together falls below it (8 mm, counted as one side’s shift)`
                : `the coma lifts only gradually as the oedema subsides and the midline shift falls below 8 mm${endsAt.en}`
            }; the secondary occipital infarct remains.`,
          },
          regions: [...new Set([...pca.map((b) => b.region), ...mid.map((b) => b.region)])],
          symptoms: [
            { id: 'coma', side: null, sev: 3 },
            { id: 'cn3_palsy', side: s, sev: 3 },
            { id: 'arm_weak', side: s, sev: 2 },
            { id: 'leg_weak', side: s, sev: 2 },
          ],
          symptomsWhileShiftMm: COMA_SHIFT_MM,
        });
        // Death is the usual end point, which the model does not represent (C4-F1): the fatal event
        // follows the first herniation, to either side or downward (below)
        fatalRisk.add('herniation');
        herniationStarts.push({ id: `herniation_fatal_${s}`, onsetH: uncalH });
      }
    } else if (mainFinal[s] >= MASS_EFFECT_ML) {
      events.push({
        id: `mass_effect_${s}`,
        kind: 'secondary',
        severity: 'warn',
        onsetH: sideOnset(s) + 24,
        peakH: sideOnset(s) + 72,
        endH: sideOnset(s) + 336,
        shiftSymptoms: true,
        title: { zh: `${sideZh}半球中度占位效應`, en: `Moderate mass effect (${sideEn} hemisphere)` },
        desc: {
          zh: `梗塞約 ${(v - mainFinal[s] >= 0.5 ? mainFinal[s] : v).toFixed(0)} mL${v - mainFinal[s] >= 0.5 ? `（加上另一次在不同時間開始的梗塞，這一側合計約 ${v.toFixed(0)} mL）` : ''}，水腫可擠壓側腦室並造成數毫米的中線偏移；需密切觀察意識與瞳孔，多數不會形成疝脫。中線偏移達約 4 mm 以上時，模型會讓意識跟著下降（Ropper 1986）。${bilateralNote.zh}`,
          en: `Infarct ≈ ${(v - mainFinal[s] >= 0.5 ? mainFinal[s] : v).toFixed(0)} mL${v - mainFinal[s] >= 0.5 ? ` (≈ ${v.toFixed(0)} mL in this hemisphere with an infarct that began at another time)` : ''}; oedema can compress the lateral ventricle and shift the midline a few millimetres. Consciousness and pupils need close watching; most patients do not herniate. From a shift of about 4 mm the model lowers consciousness with it (Ropper 1986).${bilateralNote.en}`,
        },
        regions: infarctedRegions.filter((r) => r.endsWith(`_${s}`)),
      });
    }
  }

  // The central herniation of two hemispheres swelling alike (V1-4, see `central` above). The
  // diencephalon and then the midbrain and the rostral pons are pressed down through the tentorial
  // notch while the joint swelling stays in the coma range; the signs are those of both sides
  // (Plum and Posner: drowsiness, then small pupils, periodic breathing and posturing, the pupils
  // later fixed in mid-position), not the one-sided dilated pupil and Kernohan weakness of an
  // uncal herniation. The posterior cerebral arteries can be pressed against the tentorial edge in
  // any transtentorial herniation, both of them when both hemispheres swell (Keane JR. Ann Neurol
  // 1980;8:186-190, PMID 7425572: permanent bilateral visual loss after tentorial herniation, from
  // masses on one or both sides, two with occipital infarcts on CT). A hemisphere that herniates by
  // its own swelling keeps the secondary infarcts that swelling causes alone (U1-0), its posterior
  // cerebral territory at the tentorial edge and its anterior cerebral branches against the falx:
  // the other hemisphere's swelling never spares them (a model choice, said in the text). When
  // neither hemisphere would herniate on its own, the model adds no secondary infarct, as it cannot
  // tell which side or how much. Death is the usual end without decompression; the figures of one
  // hemisphere (Hacke 1996; Vahedi 2007) are named as such.
  if (central) {
    const { fromH, untilH, sides: own } = central;
    // (each from its own herniation's onset: U1-0)
    const secondary: string[] = [];
    for (const sd of own) {
      const h = hern[sd].uncalH;
      for (const b of [...compressedBeds(sd, ACA_UNDER_FALX, h), ...compressedBeds(sd, PCA_AT_TENTORIUM, h)]) {
        addEffect(b.id, { kind: 'secondary', onsetH: h, event: 'central_herniation' });
        secondary.push(b.region);
      }
    }
    const both = own.length === 2;
    const sideZh = (sd: Side) => (sd === 'r' ? '右' : '左');
    // (a hemisphere that had herniated to its own side before the other caught up with it: U1-0)
    const first = (['r', 'l'] as Side[]).find((sd) => hern[sd].lateral && hern[sd].uncalH < fromH);
    const after: L = first
      ? {
          zh: `這裡${sideZh(first)}側半球先已向自己那一側疝脫（見該側的事件），另一側較晚開始的腫脹趕上之後，腦被往下擠。`,
          en: ` Here the ${first === 'r' ? 'right' : 'left'} hemisphere had already herniated to its own side (see its events); once the other one's later swelling catches up with it, the brain is pushed down.`,
        }
      : { zh: '', en: '' };
    const keeps: L = !own.length
      ? {
          zh: '任何天幕切跡疝脫都可能把後大腦動脈壓在天幕邊緣而造成枕葉梗塞；模型在這裡沒有加上這種續發梗塞，因為無法從兩側的腫脹判斷是哪一側、多大。',
          en: ' Any transtentorial herniation can press a posterior cerebral artery against the tentorial edge and infarct the occipital lobe; the model adds no such secondary infarct here, since the swelling of both sides does not tell which side or how much.',
        }
      : {
          zh: `${both ? '這裡兩側半球各自的腫脹都已大到足以單獨疝脫' : `這裡${sideZh(own[0])}側半球本身的腫脹就已大到足以單獨疝脫`}，模型保留這種腫脹單獨造成的續發梗塞：後大腦動脈區（壓在天幕邊緣；天幕切跡疝脫可壓住兩側後大腦動脈，疝脫解除後兩眼永久失明、電腦斷層可見枕葉梗塞的病例有記載，包括兩側都有占位病灶時），以及前大腦動脈區（分支壓在大腦鐮上）。後者是模型的選擇：兩側一起腫脹時中線幾乎不動，扣帶迴不會滑到大腦鐮下方，但模型不讓另一側的腫脹替這一側的動脈解圍。`,
          en: ` ${both ? 'Here each hemisphere swells enough to herniate on its own' : `Here the ${own[0] === 'r' ? 'right' : 'left'} hemisphere swells enough to herniate on its own`}, and the model keeps the secondary infarcts that swelling causes alone: the posterior cerebral territory, pressed against the tentorial edge (tentorial herniation can compress both posterior cerebral arteries, and permanent loss of vision in both eyes, with occipital infarcts on CT, is described after it, also with masses on both sides), and the anterior cerebral territory, its branches pressed against the falx. The latter is a model choice: with both hemispheres swelling the midline stays nearly in place and no cingulate gyrus slides under the falx, but the model does not let the other hemisphere's swelling spare this one's arteries.`,
        };
    const compressionEndH = untilH ?? undefined;
    const mid = BEDS.filter((b) => /^midbrain_/.test(b.region));
    mid.forEach((b) => addEffect(b.id, { kind: 'compressed', onsetH: fromH, endH: compressionEndH, event: 'central_herniation' }));
    const ponsH = fromH + PONS_COMPRESSION_LAG_H;
    const pons = BEDS.filter((b) => /^pons_rostral_(tegmentum|basis)/.test(b.region));
    if (compressionEndH === undefined || compressionEndH > ponsH)
      pons.forEach((b) => addEffect(b.id, { kind: 'compressed', onsetH: ponsH, endH: compressionEndH, event: 'central_herniation' }));
    events.push({
      id: 'central_herniation',
      kind: 'secondary',
      severity: 'danger',
      onsetH: fromH,
      peakH: Math.max(120, fromH),
      ...(untilH === null ? {} : { endH: untilH }),
      title: { zh: '中央型天幕切跡疝脫 → 間腦與中腦向下受壓', en: 'Central transtentorial herniation → diencephalon & midbrain pushed down' },
      desc: {
        zh: `兩側大腦半球一起腫脹，把腦往下擠而不是推向一側：間腦、接著中腦與上段橋腦被往下壓進小腦天幕切跡——天幕切跡疝脫分成向一側的（鉤迴）與中央型兩種，這裡是中央型。${after.zh}意識降到昏迷，呼吸可能變成週期性（陳施氏呼吸），瞳孔先是小而有反應、之後固定在中間大小，兩側肢體出現異常姿勢${first ? '' : '；早期不會像鉤迴疝脫那樣一側瞳孔放大，也沒有大腦鐮下疝脫（那需要中線被推向對側）'}。腦幹被往下拉扯可撕裂橋腦穿通動脈（Duret 出血），常致命。${keeps.zh}若病人存活，昏迷要等水腫消退、兩側合計的腫脹降到昏迷範圍（換算 8 mm）以下${untilH === null ? '' : `（這裡約在發病後 ${Math.round(untilH)} 小時）`}才逐漸解除${own.length ? '；續發梗塞會留下來' : ''}。`,
        en: `Both hemispheres swell together and push the brain down rather than to one side: the diencephalon, then the midbrain and the upper pons are pressed down through the tentorial notch. Transtentorial herniation is lateral (uncal) or central, and this is central.${after.en} Consciousness falls into coma, breathing may become periodic (Cheyne–Stokes), the pupils are first small and reactive and later fixed in mid-position, and both sides posture${first ? '' : '; there is no early one-sided dilated pupil as in an uncal herniation, and no subfalcine herniation, which needs the midline pushed across'}. Downward stretch can tear pontine perforators (Duret haemorrhage), often fatal.${keeps.en} If the patient survives, the coma lifts only gradually as the oedema subsides and the swelling of both hemispheres together falls below the coma range (8 mm, counted as one side’s shift)${untilH === null ? '' : ` (here about ${Math.round(untilH)} h after onset)`}${own.length ? '; the secondary infarcts remain' : ''}.`,
      },
      regions: [...new Set([...secondary, ...[...mid, ...pons].map((b) => b.region)])],
      symptoms: [{ id: 'coma', side: null, sev: 3 }],
      symptomsWhileShiftMm: COMA_SHIFT_MM,
    });
    fatalRisk.add('herniation');
    herniationStarts.push({ id: 'herniation_fatal_central', onsetH: fromH });
  }
  // Death is the usual end point of a herniation without decompression, which the model does not
  // represent (C4-F1); one row, that of the first herniation (Y2-13), which a herniation that begins
  // later never replaces (U1-14: the left M1's fatal event of day 3 vanished when the right carotid T
  // closed on day 7 and herniated on day 10). Hacke W et al. Arch Neurol 1996;53:309–315 (complete
  // MCA-territory infarction: 43 of 55, 78%, died of transtentorial herniation and brain death;
  // survivors' mean Barthel index 60); Vahedi K et al. Lancet Neurol 2007;6:215–222 (pooled
  // DECIMAL, DESTINY, HAMLET, age ≤ 60: 1-year survival 29% without vs 78% with early surgery; mRS
  // ≤ 4 24% vs 75%).
  const firstHerniation = [...herniationStarts].sort((a, b) => a.onsetH - b.onsetH)[0];
  if (firstHerniation && firstHerniation.id !== 'herniation_fatal_central')
    events.push({
      id: firstHerniation.id,
      kind: 'secondary',
      severity: 'danger',
      onsetH: firstHerniation.onsetH,
      title: { zh: '疝脫後很可能死亡（未減壓）', en: 'Death likely after herniation (no decompression)' },
      desc: {
        zh: '完整中大腦動脈區梗塞的 55 位病人中，43 位（78%）因天幕切跡疝脫與腦死而死亡，多在第 2–5 天；存活者的平均 Barthel 指數為 60（Hacke 1996）。三個隨機試驗的合併分析（60 歲以下、48 小時內隨機分組）中，沒有手術的一年存活率只有 29%（手術 78%），mRS 0–4 為 24% vs 75%——兩組的主要差別在於能否存活，未手術的存活者多數仍是 mRS 0–4（Vahedi 2007）。模型不模擬死亡：之後的病程、3 個月與 6 個月的 NIHSS，都是「假如病人存活（少數）」的情況。',
        en: 'Of 55 patients with complete MCA-territory infarction, 43 (78%) died of transtentorial herniation and brain death, mostly on days 2–5; the survivors had a mean Barthel index of 60 (Hacke 1996). In the pooled analysis of three randomised trials (age ≤ 60, randomised within 48 h) 1-year survival without surgery was only 29% (78% with it), and mRS 0–4 24% vs 75% — the main difference between the arms is survival, and most untreated survivors were still mRS 0–4 (Vahedi 2007). The model does not represent death: the rest of the course and the 3- and 6-month NIHSS show what happens if the patient survives (a minority).',
      },
      regions: [],
    });
  if (firstHerniation?.id === 'herniation_fatal_central') {
    const fromH = firstHerniation.onsetH;
    events.push({
      id: 'herniation_fatal_central',
      kind: 'secondary',
      severity: 'danger',
      onsetH: fromH,
      title: { zh: '疝脫後很可能死亡（未減壓）', en: 'Death likely after herniation (no decompression)' },
      desc: {
        zh: '兩側大腦半球一起腫脹，腦向下疝脫（中央型）又沒有減壓：死亡很可能是結局。常引用的數字講的是單側：完整中大腦動脈區梗塞的 55 位病人中 43 位（78%）因天幕切跡疝脫與腦死而死亡（Hacke 1996），三個隨機試驗的合併分析中未手術的一年存活率只有 29%（Vahedi 2007）——它們描述的是一側，不是兩側；兩側同時大範圍梗塞通常後果嚴重。模型不模擬死亡：之後的病程、3 個月與 6 個月的 NIHSS，都是「假如病人存活」的情況。',
        en: 'Both hemispheres swell together and the brain herniates downward (central herniation), without decompression: death is the likely end. The figures usually quoted — 43 of 55 patients (78%) with complete MCA-territory infarction died of transtentorial herniation and brain death (Hacke 1996), and 1-year survival without surgery was only 29% in the pooled analysis of three randomised trials (Vahedi 2007) — describe one hemisphere, not both; extensive infarction of both hemispheres at once is usually devastating. The model does not represent death: the rest of the course and the 3- and 6-month NIHSS show what happens if the patient survives.',
      },
      regions: [],
    });
  }

  // Both hemispheres largely out of action from the start (Y2-13): at least two-thirds of the
  // cortical areas of each MCA territory dysfunctional in the first hours (the extent of a large
  // hemispheric infarction). simulate() lists at least drowsiness while that lasts, in the first
  // two weeks (clinical.bilateralHemispheric), and the level of consciousness follows the swelling
  // of both hemispheres together; this event says why. Huang H et al. Neurocrit Care
  // 2020;33:376-388 (the definition); Phuyal S et al. J Neurosci Rural Pract 2024;15:381-383 (both
  // MCAs: usually devastating, a low level of consciousness a clue).
  const largeAcute = (side: Side) => MCA_CORTEX.filter((b) => (regionAcute[`${b}_${side}`] ?? 0) >= 0.25 - 1e-6).length >= (2 / 3) * MCA_CORTEX.length - 1e-9;
  if (largeAcute('r') && largeAcute('l')) {
    events.push({
      id: 'bilateral_hemispheres',
      kind: 'mechanism',
      severity: 'danger',
      onsetH: 0,
      endH: 336,
      shiftSymptoms: true,
      title: { zh: '兩側大腦半球同時大範圍受損', en: 'Both hemispheres largely out of action' },
      desc: {
        zh: '兩側都有至少三分之二的中大腦動脈區失去功能（大範圍半球梗塞的定義）。兩條中大腦動脈同時阻塞很少見，通常後果嚴重；NIHSS 很高又意識下降，是診斷的線索（一篇病例報告與文獻回顧）。一項研究指出，這種範圍的梗塞（大多只在一側）約 77% 早期就有意識障礙。模型在這種情況持續時至少列出嗜睡（前兩週）；意識再往下降多少，跟著兩側合計的腫脹。兩側的額葉眼動區都受損，所以眼睛不會偏向任何一邊，而是兩邊都看不太過去。這是模型的選擇：沒有資料依梗塞範圍給出意識程度。',
        en: 'At least two-thirds of the MCA territory has stopped working on both sides (the extent that defines a large hemispheric infarction). Simultaneous occlusion of both MCAs is rare and usually devastating; a very high NIHSS with a lowered level of consciousness is a clue to it (a case report and a review of the literature). About 77% of patients with an infarct this extensive — most of them on one side only — have an early disorder of consciousness, according to one study. The model lists at least drowsiness while this lasts, in the first two weeks; how much further consciousness falls follows the swelling of both hemispheres together. Both frontal eye fields are lost, so the eyes are not pushed to either side but cannot be turned well to either. A model choice: no series gives the level of consciousness by extent.',
      },
      regions: [],
    });
  }

  // Space-occupying cerebellar infarct (C4-F3). Of 93 space-occupying cerebellar infarcts 33
  // (35.5%) developed malignant swelling; a volume of 38 cm³ marked a swelling rate above 50%;
  // a concomitant brainstem infarct was associated in univariate analysis only (51.5% vs 16.7%);
  // 13 of 33 (39.4%) swelled after more than 3 days (Baki E et al. Stroke Vasc Neurol
  // 2025;10:323–329, one centre, retrospective). Deterioration of consciousness typically on days
  // 2–4, most often day 3; surgery was no better than medical care in awake/drowsy or
  // somnolent/stuporous patients, and half of those operated on in coma recovered meaningfully
  // (Jauss M et al. J Neurol 1999;246:257–264). Brainstem compression lowers consciousness with
  // early corneal-reflex loss and miosis; ventriculostomy should be accompanied by suboccipital
  // craniectomy to avoid upward cerebellar displacement (Wijdicks EF et al. Stroke
  // 2014;45:1222–1238). SCA infarcts swell too: delayed coma from swelling in 6 of 9 (Amarenco P,
  // Hauw JJ. Neurology 1990;40:1383–1390, autopsy series). Pooled mortality after suboccipital
  // decompressive craniectomy 20% (Ayling OGS et al. World Neurosurg 2018;110:450–459).
  const cbTotal = vol.cerebellum.r + vol.cerebellum.l;
  // (classified by the cerebellar infarcts whose swelling overlaps the posterior fossa's own lesion's,
  // earlier or later, whichever is larger: unlike a hemisphere's, whose computed midline shift can
  // still make its swelling malignant, the posterior fossa's course is told by the infarct's volume
  // alone, and the oedema model sizes them together. A right PICA infarct with a left SCA infarct
  // three days later swelled malignantly into coma when the later one was the larger, and not at all
  // the other way round, T1-0)
  /** the cerebellar beds whose lesion's swelling overlaps the posterior fossa's own, and the cerebellar infarct (mL) of each lesion onset */
  const cbBeds: Bed[] = [];
  const cbByOnset = new Map<number, number>();
  for (const b of BEDS) {
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment !== 'infra' || reg.category === 'brainstem') continue;
    const o = input.bedOnsetH?.[b.id] ?? 0;
    if (Math.abs(o - infraOnset) >= OEDEMA_END_H - OEDEMA_ONSET_H) continue;
    cbBeds.push(b);
    cbByOnset.set(o, (cbByOnset.get(o) ?? 0) + (bedFinal[b.id] ?? 0) * b.volume);
  }
  const cbMain = [...cbByOnset.values()].reduce((a, v) => a + v, 0);
  if (cbMain >= CEREBELLAR_SPACE_ML) {
    const bs = BEDS.filter((b) => /^(pons|medulla)_/.test(b.region));
    const malignant = cbMain >= CEREBELLAR_MALIGNANT_ML;
    // The course runs from when the infarcts of the occlusions begun by then reach its size (T1-0):
    // a later infarct that makes the swelling malignant does not date it back to the first one's
    // onset, and one that only adds to a swelling already malignant does not put it off. A course
    // told before the later one began is kept as it was (keepTheBegun: an event that has begun is
    // not retitled).
    const onsets = [...cbByOnset.entries()].filter(([, v]) => v >= 0.5).sort((a, b) => a[0] - b[0]);
    /** the cerebellar infarct (mL) of the occlusions begun by `h`, as far as this course has it */
    const begunBy = (h: number) => {
      const by = input.untreatedFinalBy?.(h) ?? bedFinalUntreated;
      return cbBeds.reduce((a, b) => a + Math.min(bedFinal[b.id] ?? 0, by[b.id] ?? 0) * b.volume, 0);
    };
    const cbOnset = onsets.find(([o]) => begunBy(o) >= (malignant ? CEREBELLAR_MALIGNANT_ML : CEREBELLAR_SPACE_ML) - 1e-9)?.[0] ?? infraOnset;
    /** two infarcts or more, begun at different times, swell together here */
    const joint = onsets.length > 1;
    /** the clock its coma times count from, named when it is not the index onset (T1-3) */
    const cbClock: L =
      Math.abs(cbOnset) < 1e-9
        ? { zh: '發病', en: 'onset' }
        : joint
          ? cbOnset === onsets[onsets.length - 1][0]
            ? { zh: '較晚的小腦梗塞開始', en: 'the later cerebellar infarct began' }
            : { zh: '較早的小腦梗塞開始', en: 'the earlier cerebellar infarct began' }
          : { zh: '小腦梗塞開始', en: 'the cerebellar infarct began' };
    const brainstemToo = vol.brainstem >= 1;
    const sideCb: Side = vol.cerebellum.r >= vol.cerebellum.l ? 'r' : 'l';
    const riskZh = malignant
      ? `達 38 mL 以上：一個單中心系列中，這麼大的占位性小腦梗塞有一半以上發生惡性腫脹，模型讓它發生。`
      : `一個系列中，占位性小腦梗塞約三分之一（35.5%）惡性腫脹，38 mL 以上的超過一半；模型讓這個大小（未達 38 mL）不發生惡性腫脹，但實際上仍要密切觀察數天。`;
    const riskEn = malignant
      ? ` At 38 mL or more, more than half of such space-occupying cerebellar infarcts swelled malignantly in a single-centre series, and the model lets it happen.`
      : ` In one series about a third (35.5%) of space-occupying cerebellar infarcts swelled malignantly, more than half of those of 38 mL or more; the model lets an infarct of this size (under 38 mL) run without malignant swelling, but in reality it needs close watching for days.`;
    const brainstemZh = brainstemToo ? '同時有腦幹梗塞也與惡性腫脹有關（單變項分析）。' : '';
    const brainstemEn = brainstemToo ? ' A brainstem infarct as well was also associated with malignant swelling (univariate analysis).' : '';
    const surgeryZh = decompression
      ? '已施行枕下減壓顱骨切除（± 腦室外引流）：多數功能恢復良好，但合併分析的死亡率仍約 20%。'
      : '意識變差時應做枕下減壓顱骨切除（AHA/ASA 2014）。只放腦室外引流而不減壓，可能讓小腦向上經天幕切跡疝脫（向上疝脫），所以引流應合併枕下減壓；沒有惡化、清醒或只是嗜睡的病人，手術並不比內科治療好。';
    const surgeryEn = decompression
      ? ' Suboccipital decompressive craniectomy (± an external ventricular drain) has been performed: most recover well, but pooled mortality is still about 20%.'
      : ' Suboccipital decompressive craniectomy is indicated when consciousness falls (AHA/ASA 2014). A ventricular drain alone, without decompression, can let the cerebellum herniate upward through the tentorial notch, so drainage should be combined with suboccipital decompression; in patients who are awake or only drowsy, surgery was not better than medical care.';
    // (on the clock of the posterior fossa's own lesion, like its swelling: V1-1; of the infarcts
    // that make it this large: T1-0)
    events.push({
      id: 'cerebellar_edema',
      kind: 'secondary',
      severity: malignant ? 'danger' : 'warn',
      onsetH: cbOnset + 24,
      peakH: cbOnset + 72,
      endH: cbOnset + 336,
      title: malignant
        ? { zh: '占位性小腦梗塞：可能惡性腫脹，壓迫第四腦室與腦幹', en: 'Space-occupying cerebellar infarct: malignant swelling likely, compressing the 4th ventricle and brainstem' }
        : { zh: '占位性小腦梗塞：有腫脹風險，需密切觀察', en: 'Space-occupying cerebellar infarct: risk of swelling, watch closely' },
      desc: {
        zh: `小腦梗塞${joint ? '合計' : ''}約 ${cbMain.toFixed(0)} mL（${joint ? '幾次在不同時間開始、同時腫脹的梗塞；' : ''}${cbTotal >= cbMain + 0.5 ? `加上另一次在不同時間開始的小腦梗塞，合計約 ${cbTotal.toFixed(0)} mL；` : ''}後下與上小腦動脈的梗塞都可能腫脹）。後顱窩空間很小：腫脹會壓住第四腦室造成阻塞性水腦（整個腦室系統擴大、頭痛嘔吐、意識下降），並直接壓迫橋腦與延髓（意識下降、早期角膜反射消失、瞳孔縮小）；嚴重時小腦扁桃體向下疝脫壓迫延髓呼吸中樞。惡化通常在第 2–4 天、第 3 天最多，但一個系列中約 40% 的惡性腫脹發生在第 3 天之後，所以要觀察超過 72 小時。${riskZh}${brainstemZh}${surgeryZh}`,
        en: `${joint ? `Cerebellar infarcts ≈ ${cbMain.toFixed(0)} mL together (begun at different times, swelling at the same time; ` : `Cerebellar infarct ≈ ${cbMain.toFixed(0)} mL (`}${cbTotal >= cbMain + 0.5 ? `≈ ${cbTotal.toFixed(0)} mL with a cerebellar infarct that began at another time; ` : ''}PICA and SCA infarcts can both swell). The posterior fossa is tight: swelling blocks the 4th ventricle, causing obstructive hydrocephalus (all ventricles enlarge; headache, vomiting, drowsiness), and compresses the pons and medulla (falling consciousness, early loss of corneal reflexes, small pupils); tonsillar herniation can then compress the medullary respiratory centre. Deterioration typically comes on days 2–4, most often on day 3, but in one series about 40% of malignant swellings came after day 3, so monitoring has to continue beyond 72 h.${riskEn}${brainstemEn}${surgeryEn}`,
      },
      regions: [...new Set(bs.map((b) => b.region))],
    });
    if (malignant && !decompression) {
      // consciousness follows the swelling (R6-1): stupor from day 3, coma around the peak, then
      // stupor and drowsiness again as it subsides, if the patient survives
      // (the texts give the times on the course's own clock, named when it is not the index onset:
      // T1-3; the events run on the clinical clock)
      const { comaFromH, comaUntilH, stuporUntilH, drowsyUntilH } = CEREBELLAR_COURSE;
      const h = (x: number) => Math.round(x);
      const at = (x: number) => cbOnset + x;
      hydrocephalusOnsetH = at(CEREBELLAR_DETERIORATION_H);
      hydrocephalusEndH = at(stuporUntilH);
      bs.forEach((b) => addEffect(b.id, { kind: 'compressed', onsetH: at(CEREBELLAR_DETERIORATION_H), endH: at(drowsyUntilH), event: 'brainstem_compression' }));
      const compressed = { fromH: at(CEREBELLAR_DETERIORATION_H), untilH: at(stuporUntilH) };
      events.push({
        id: 'brainstem_compression',
        kind: 'secondary',
        severity: 'danger',
        onsetH: at(CEREBELLAR_DETERIORATION_H),
        endH: at(drowsyUntilH),
        title: { zh: '小腦腫脹壓迫腦幹', en: 'Swollen cerebellum compresses the brainstem' },
        desc: {
          zh: `腫脹的小腦直接擠壓橋腦與延髓：意識下降（和水腦無關，即使引流腦脊髓液也會發生）、早期角膜反射消失、兩側瞳孔縮小、同側水平凝視麻痺，並持續嘔吐。未手術時意識隨腫脹變化：第 3 天木僵，腫脹高峰前後（這裡約${cbClock.zh}後 ${h(comaFromH)}–${h(comaUntilH)} 小時）昏迷，之後隨腫脹消退回到木僵、嗜睡，約 ${h(drowsyUntilH)} 小時後清醒（假如病人存活）。小腦腫脹讓病人延遲陷入昏迷是有記載的（一個上小腦動脈梗塞的解剖病理系列中，有小腦與前庭症狀的 9 位中有 6 位）；每個腫脹程度對應哪一種意識程度是模型的選擇，比照大腦半球腫脹時中線偏移的分級。`,
          en: `The swollen cerebellum presses directly on the pons and medulla: consciousness falls (independently of the hydrocephalus, so even when CSF is drained), corneal reflexes are lost early, both pupils become small, horizontal gaze towards the side of the infarct is lost, and vomiting persists. Without surgery consciousness follows the swelling: stupor from day 3, coma around its peak (here about ${h(comaFromH)}–${h(comaUntilH)} h after ${cbClock.en}), then stupor and drowsiness again as it subsides, alert from about ${h(drowsyUntilH)} h if the patient survives. Delayed coma from cerebellar swelling is described (6 of the 9 with cerebellar and vestibular signs in an autopsy series of SCA infarcts); which level goes with how much swelling is a model choice, following the midline-shift bands of a swollen hemisphere.`,
        },
        regions: [...new Set(bs.map((b) => b.region))],
        symptoms: [
          { id: 'coma', side: null, sev: 2, ...compressed },
          { id: 'somnolence', side: null, sev: 1, fromH: at(stuporUntilH), untilH: at(drowsyUntilH) },
          { id: 'miosis', side: null, sev: 1, ...compressed },
          { id: 'corneal_reflex_loss', side: null, sev: 1, ...compressed },
          { id: 'gaze_palsy_horizontal', side: sideCb, sev: 1, ...compressed },
          { id: 'nausea_vomiting', side: null, sev: 2, ...compressed },
        ],
      });
      events.push({
        id: 'hydrocephalus',
        kind: 'secondary',
        severity: 'danger',
        onsetH: at(CEREBELLAR_DETERIORATION_H),
        endH: hydrocephalusEndH,
        symptoms: [
          // raised pressure and a dilated aqueduct: drowsiness and upgaze palsy
          { id: 'coma', side: null, sev: 2 },
          { id: 'upgaze_palsy', side: null, sev: 1 },
        ],
        title: { zh: '阻塞性水腦症', en: 'Obstructive hydrocephalus' },
        desc: {
          zh: '腦脊髓液出不去，側腦室與第三腦室脹大，顱內壓上升——遠離小腦的大腦也因此受影響（頭痛、嘔吐、嗜睡）。小腦腫脹消退後第四腦室重新通暢。',
          en: 'CSF cannot drain, the lateral and third ventricles balloon and intracranial pressure rises — affecting the cerebrum far from the cerebellar infarct (headache, vomiting, drowsiness). The 4th ventricle opens again as the cerebellar swelling subsides.',
        },
        regions: [],
      });
      // coma without decompression: life-threatening; no untreated mortality figure is
      // established, and the flag is set only for a course that reaches coma (R6-1)
      fatalRisk.add('posterior_fossa');
      events.push({
        id: 'posterior_fossa_fatal',
        kind: 'secondary',
        severity: 'danger',
        onsetH: at(comaFromH),
        endH: at(comaUntilH),
        title: { zh: '危及生命：腦幹受壓合併昏迷，未減壓', en: 'Life-threatening: brainstem compression with coma, no decompression' },
        desc: {
          zh: `小腦腫脹讓意識降到昏迷，是後顱窩占位最危險的情況：意識程度是預後最強的預測因子（Jauss 1999）。AHA/ASA 2014 建議對惡化的病人做枕下減壓顱骨切除；昏迷後接受手術的病人約一半有意義地恢復，但沒有未手術的對照組，所以沒有可靠的「不手術死亡率」數字。模型不模擬死亡：之後的病程是「假如病人存活」的情況，昏迷隨腫脹消退而解除（這裡約在${cbClock.zh}後 ${h(comaUntilH)} 小時）。`,
          en: `Swelling of the cerebellum has brought the patient into coma, the most dangerous situation in the posterior fossa: the level of consciousness is the strongest predictor of outcome (Jauss 1999). The AHA/ASA statement (2014) recommends suboccipital decompressive craniectomy for patients who deteriorate; about half of those operated on in coma recovered meaningfully, but there was no untreated control group, so there is no reliable figure for mortality without surgery. The model does not represent death: the rest of the course shows what happens if the patient survives, the coma lifting as the swelling subsides (here about ${h(comaUntilH)} h after ${cbClock.en}).`,
        },
        regions: [],
        symptoms: [{ id: 'coma', side: null, sev: 3 }],
      });
    }
  }

  // ── 4. haemorrhagic transformation ─────────────────────────────
  if (vol.total >= 1) {
    // A thrombolytic drug (IV thrombolysis alone, or before thrombectomy) raises the bleeding
    // risk. Against no thrombolytic the rise is several-fold (NINDS 1995: 6.4% vs 0.6% within
    // 36 h; ECASS III 2008: 2.4% vs 0.2%); against direct thrombectomy, IV thrombolysis first adds
    // little (SWIFT DIRECT 2022: 3.5% vs 2.5%). Conservatively, the drug lowers the infarct-volume
    // thresholds of the risk steps by a quarter: an infarct near a threshold moves up by one step,
    // never more, and one under 22.5 mL does not move at all.
    // Published rates are shown next to the treatment options (anatomy/recanalisation.ts). An
    // attempt that reopened nothing (eTICI 0) brings no blood back into dead tissue, so late or
    // large reperfusion adds nothing then.
    // Timing: bleeding after a thrombolytic comes early, at a median of 470 min after the drug is
    // started (Yaghi S et al. JAMA Neurol 2015;72:1451–1457), and the trial rates are counted in
    // the first 24–36 h, so with a lytic the window starts at the treatment (reperfusionH stands
    // in for the drug start) and peaks within hours. Without a lytic, haemorrhagic transformation
    // follows the 1–7 day course. Only a parenchymal haematoma type 2 clearly changes the course
    // (Fiorelli M et al. Stroke 1999;30:2280–2284), so the event carries no symptom: a risk is not
    // an occurrence.
    const lytic = !!treatment && treatment.method !== 'evt';
    const k = lytic ? 0.75 : 1;
    const reperfused = reperfusionH !== null && !treatment?.failed;
    let level = vol.total > 100 * k ? 2 : vol.total > 30 * k ? 1 : 0;
    if (reperfused && ((reperfusionH as number) > 6 || vol.total > 70 * k)) level = Math.min(2, level + 1);
    const lv = [
      { zh: '低', en: 'low' },
      { zh: '中等', en: 'moderate' },
      { zh: '高', en: 'high' },
    ][level];
    const drugH = reperfusionH ?? 0;
    const methodZh =
      treatment?.method === 'ivt'
        ? '這次只用了靜脈血栓溶解：和沒有用血栓溶解劑相比，症狀性出血多了數倍（NINDS 6.4% vs 0.6%；ECASS III 2.4% vs 0.2%）。'
        : treatment?.method === 'bridging'
          ? '這次在取栓前先打了靜脈血栓溶解：和直接取栓相比差距不大（SWIFT DIRECT 3.5% vs 2.5%）。'
          : '';
    const methodEn =
      treatment?.method === 'ivt'
        ? ' IV thrombolysis alone was given: compared with no thrombolytic it raises symptomatic haemorrhage several-fold (NINDS 6.4% vs 0.6%; ECASS III 2.4% vs 0.2%).'
        : treatment?.method === 'bridging'
          ? ' IV thrombolysis was given before thrombectomy: compared with direct thrombectomy the difference is small (SWIFT DIRECT 3.5% vs 2.5%).'
          : '';
    events.push({
      id: 'hemorrhagic_transformation',
      kind: 'complication',
      severity: level === 2 ? 'danger' : 'warn',
      onsetH: lytic ? drugH : 24,
      peakH: lytic ? drugH + 8 : 72,
      endH: 336,
      title: { zh: `出血轉化風險：${lv.zh}`, en: `Haemorrhagic transformation risk: ${lv.en}` },
      desc: {
        zh:
          `壞死組織裡受損的小血管在血流恢復後可能滲血，多發生在 1–7 天內（用了血栓溶解劑會更早）。梗塞越大、再通越晚、使用血栓溶解劑，風險越高。大多沒有症狀（ECASS III 任何顱內出血 27.0% vs 安慰劑 17.6%）；只有第 2 型實質血腫明顯改變病程（ECASS I：早期惡化 OR 32.3、3 個月死亡 OR 18.0）。` +
          `靜脈血栓溶解後的症狀性出血約 2–7%，是在最初 24–36 小時內計算的（Cochrane 定義算到 7 天）。` +
          (lytic
            ? `${methodZh}血栓溶解後的症狀性出血來得早：從開始用藥算起中位數約 8 小時，症狀性出血的病人約一半死亡。模型把這段風險從血流恢復時（選擇的治療時間）開始算，而不是從開始用藥算，風險等級最多調高一級。`
            : ''),
        en:
          'Damaged small vessels inside dead tissue may bleed once flow returns, usually within 1–7 days (earlier after a thrombolytic). Larger infarcts, late recanalisation and thrombolytics raise the risk. Most of it causes no symptoms (any intracranial haemorrhage in ECASS III: 27.0% vs 17.6% with placebo); only a parenchymal haematoma type 2 clearly changes the course (ECASS I: odds ratio 32.3 for early deterioration, 18.0 for death at 3 months). ' +
          'Symptomatic haemorrhage after IV thrombolysis is roughly 2–7%, counted in the first 24–36 h (up to 7 days with the Cochrane definition).' +
          (lytic
            ? `${methodEn} Symptomatic bleeding after a thrombolytic comes early, at a median of about 8 h after the drug is started, and about half of the patients with a symptomatic bleed die. The model starts this risk when flow returns (the time chosen for the treatment), not when the drug is started, and raises its level by one step at most.`
            : ''),
      },
      regions: infarctedRegions.filter((r) => REGION_BY_ID[r]?.category === 'cortex' || REGION_BY_ID[r]?.category === 'deep'),
    });
  }

  // ── 5. brainstem-specific ──────────────────────────────────────
  const acute = (rid: string, thr = 0.3) => (regionAcute[rid] ?? 0) >= thr;
  const bilateral = (test: (rid: string) => boolean, pairs: [string, string][]) => pairs.some(([r, l]) => test(r) && test(l));
  const PONS_BASIS: [string, string][] = [
    ['pons_rostral_basis_r', 'pons_rostral_basis_l'],
    ['pons_caudal_basis_r', 'pons_caudal_basis_l'],
  ];
  const MEDULLA: [string, string][] = [
    ['medulla_lateral_r', 'medulla_lateral_l'],
    ['medulla_medial_r', 'medulla_medial_l'],
  ];
  // the arousal network of the upper pontine and paramedian midbrain tegmentum (coma when both
  // sides fail: Parvizi J, Damasio AR. Brain 2003;126:1524–1536)
  const PONS_TEG_ROSTRAL: [string, string][] = [['pons_rostral_tegmentum_r', 'pons_rostral_tegmentum_l']];
  const MIDBRAIN_PARAMEDIAN: [string, string][] = [['midbrain_paramedian_r', 'midbrain_paramedian_l']];
  // A bilateral state from the acute dysfunction (the medulla's respiratory failure below): when
  // blood returns before the tissue on both sides dies, it lasts only until then (the symptoms
  // clear with reperfusion); without that, it stays for as long as the dysfunction does. `thr`:
  // the infarcted share from which the tissue counts as dead.
  const transientUntil = (pairs: [string, string][], thr = 0.3) =>
    input.flowReturnsH != null && !bilateral((r) => infarcted(r, thr), pairs) ? input.flowReturnsH : undefined;
  // … and it eases as the rescued tissue regains its function (Y1-12): estimated for tissue that
  // was ischaemic from onset, with the shortest lag (the perforators)
  const regainedBy = (h: number) => h + regainedAfterH(Math.max(0, h - PERFORATOR_TISSUE.lagH));
  const clears = (h: number | undefined) => {
    if (h === undefined) return { zh: '', en: '' };
    const end = regainedBy(h);
    const atOnce = end - h < 1e-6;
    return { zh: resolvesZh(formatHours(h, 'zh-TW'), formatHours(end, 'zh-TW'), atOnce), en: resolvesEn(formatHours(h, 'en'), formatHours(end, 'en'), atOnce) };
  };
  // the tegmentum (arousal) failing on both sides gives coma (C3-F1): acutely ischaemic at the index
  // onset, or at the onset of a lesion of its own before or after it (Y3-19)
  const ischaemicOnBoth = ([r, l]: [string, string]) =>
    (acute(r) || input.regionOnsetH?.[r] !== undefined) && (acute(l) || input.regionOnsetH?.[l] !== undefined);
  // extensive damage to the tegmentum of both sides: a disorder of consciousness follows the coma
  // from two weeks on (clinical.ts comaBecomes, the same threshold; C3-F2)
  const persistentDoc = bilateral((r) => infarcted(r, 0.5), PONS_TEG_ROSTRAL) || bilateral((r) => infarcted(r, 0.5), MIDBRAIN_PARAMEDIAN);
  // the ventral pons and tegmentum count as damaged from the level at which their lasting signs,
  // and the locked-in labels, appear (the symptom threshold, 0.25; R5-4)
  const SIGNS_THR = 0.25 - 1e-6;
  // Locked-in syndrome: Bauer G et al. J Neurol 1979;221:77–91 (classical, incomplete, total);
  // comatose first: Laureys S et al. Prog Brain Res 2005;150:495–511; prognosis and care: Patterson
  // JR, Grabois M. Stroke 1986;17:758–764 (139 cases, mortality 60 %, lung care and a communication
  // system); Casanova E et al. Arch Phys Med Rehabil 2003;84:862–867 (14 selected patients).
  const LIS_CARE: L = {
    zh: '早年 139 例文獻回顧的死亡率約 60%：要積極照護呼吸與肺部（吸入、肺炎），並及早建立溝通方式（眨眼或眼動字母表、眼控電腦）。恢復差異很大：一個早期密集復健的小型選擇性系列（14 人）中，42% 恢復吞嚥、28% 恢復說話；病情穩定後可存活數十年。',
    en: ' Mortality was about 60% in an early review of 139 cases: breathing and lung care (aspiration, pneumonia) and an early communication system (an eye-coded or blink alphabet, eye-controlled computers) are essential. Recovery varies widely: in a small selected series of 14 patients after early intensive rehabilitation 42% regained swallowing and 28% speech; once medically stable, people can live for decades.',
  };
  // The events follow the course the labels show (the second pass reads it from the symptom list,
  // simulate.brainstemCourse): each stretch of coma, disorder of consciousness, classical or
  // incomplete locked-in syndrome has its own event, from when the labels show it to when they
  // show something else, timed from the lesion's own onset (X2-7, X2-10, X2-11, X2-15)
  if (input.listed?.brainstem) {
    const involved = (pairs: [string, string][]) => pairs.flat().filter((r) => acute(r) || infarcted(r, SIGNS_THR));
    // whether the reopening at `h` saved more than a sliver of the infarct (T3-11): the treatment's
    // against the untreated course, an artery's own against the same case had it stayed closed
    const sp = input.spontaneous;
    const savedMore = (h: number) =>
      reperfusionH !== null && Math.abs(h - reperfusionH) < 1e-6
        ? !savedSliver(savedGross, untreatedTotal)
        : sp && Math.abs(h - sp.atH) < 1e-6
          ? !savedSliver(Math.max(0, sp.stayedClosed.total - vol.total), sp.stayedClosed.total)
          : true;
    // … and brought the movement back: without it the state would still be classical a day later
    // (T3-11: a mid-basilar occlusion with good collaterals reopened at 2 days was credited with the
    // limb movement that came back at 9 days, as it did, at the same hour, without the reopening)
    const credit = (reopenH: number, atH: number) => savedMore(reopenH) && (input.lockedInWithout?.(reopenH, atH + LIS_SOONER_H) ?? true);
    events.push(
      ...brainstemEvents(
        input.listed.brainstem,
        LIS_CARE,
        {
          coma: involved([...PONS_BASIS, ...PONS_TEG_ROSTRAL, ...MIDBRAIN_PARAMEDIAN]),
          doc: [...PONS_BASIS, ...PONS_TEG_ROSTRAL, ...MIDBRAIN_PARAMEDIAN].flat().filter((r) => infarcted(r, SIGNS_THR)),
          lis: involved(PONS_BASIS),
        },
        credit,
      ),
    );
  }
  // Central hyperthermia (S2, C3-F9): of 9 brainstem-coma patients, 4 developed hyperthermia and
  // died without infection, the lesions centred on the core of the pontine tegmentum (Parvizi J,
  // Damasio AR. Brain 2003;126:1524–1536; the stroke type is not given in the abstract); ischaemic
  // case reports after bilateral paramedian midbrain–thalamic infarction (Alemdar M. J Stroke
  // Cerebrovasc Dis 2012;21:907.e13–907.e15: 39.3 °C, no infection) and after basilar occlusion
  // (Huang YS et al. Acta Neurol Taiwan 2009;18:118–122: "not uncommon in severe brainstem stroke",
  // poor prognosis); of 74 patients with central hyperthermia in the first 24 h only 4 % had a large
  // cortical infarct and 3 % a basilar occlusion, the rest haemorrhages, all with brainstem
  // involvement; most peaked within 24 h and nearly 70 % died within a month (Sung CY et al. Eur
  // Neurol 2009;62:86–92). A risk, not a symptom: fever after a stroke is mostly infection (Grau AJ
  // et al. J Neurol Sci 1999;171:115–120).
  const extensive = (r: string) => infarcted(r, 0.5);
  // from the onset of the tegmental lesion itself (Y3-19): when the second of its two halves became
  // ischaemic (a stacked basilar occlusion a month before or after the index event has its own),
  // the bilateral tegmental coma of Parvizi & Damasio 2003
  const hotPairs = [...PONS_TEG_ROSTRAL, ...MIDBRAIN_PARAMEDIAN].filter((p) => ischaemicOnBoth(p) && extensive(p[0]) && extensive(p[1]));
  if (hotPairs.length) {
    const lesionH = (rid: string) => input.regionOnsetH?.[rid] ?? 0;
    const fromH = Math.min(...hotPairs.map(([r, l]) => Math.max(lesionH(r), lesionH(l))));
    events.push({
      id: 'central_hyperthermia',
      kind: 'complication',
      severity: 'warn',
      onsetH: fromH,
      peakH: fromH + 24,
      endH: fromH + 336,
      title: { zh: '中樞性高熱的風險（腦幹被蓋兩側受損）', en: 'Risk of central hyperthermia (brainstem tegmentum on both sides)' },
      desc: {
        zh: '上橋腦（或中腦—視丘旁正中）被蓋兩側大範圍受損又昏迷時，體溫調節可能失控：發病頭一天內體溫急升到 39 °C 以上、劇烈起伏，退燒藥可能無效。缺血性中風後這很少見（74 位中樞性高熱病人中只有 4% 是大範圍皮質梗塞、3% 是基底動脈阻塞，其餘是出血），而且是排除診斷：中風後發燒要先找感染（肺炎、尿路感染），找過都沒有才考慮中樞性。預後很差：一項腦幹昏迷研究的 9 位中有 4 位出現高熱、在沒有感染下死亡；另一個系列近 70% 在一個月內死亡。',
        en: 'When the upper pontine (or paramedian midbrain–thalamic) tegmentum is extensively damaged on both sides and the person is comatose, temperature control can fail: within the first day the temperature shoots above 39 °C and swings widely, and antipyretics may not help. This is rare after an ischaemic stroke (of 74 patients with central hyperthermia only 4% had a large cortical infarct and 3% a basilar occlusion, the rest haemorrhages), and it is a diagnosis of exclusion: fever after a stroke means looking for infection first (pneumonia, urinary tract), and only when none is found is a central cause considered. The prognosis is poor: in a study of brainstem coma 4 of 9 patients developed hyperthermia and died without infection; in another series nearly 70% died within a month.',
      },
      regions: [...PONS_TEG_ROSTRAL, ...MIDBRAIN_PARAMEDIAN].flat().filter((r) => extensive(r)),
    });
  }
  if (bilateral(acute, MEDULLA)) {
    const until = transientUntil(MEDULLA);
    const note = clears(until);
    events.push({
      id: 'respiratory_failure',
      kind: 'complication',
      severity: 'danger',
      onsetH: 0,
      endH: Math.min(168, until === undefined ? Infinity : regainedBy(until)),
      title: { zh: '雙側延髓受損：呼吸衰竭風險', en: 'Bilateral medulla: risk of respiratory failure' },
      desc: {
        zh: `延髓的呼吸節律中樞與吞嚥反射受損，可能需要插管與呼吸器。${note.zh}`,
        en: `Medullary respiratory rhythm and airway reflexes fail; intubation and ventilation may be needed.${note.en}`,
      },
      regions: MEDULLA.flat().filter((r) => acute(r)),
    });
  }

  // one lateral medulla (C7-F1): one side of the pontomedullary reticular formation and nucleus
  // ambiguus is enough to lose automatic breathing (Bogousslavsky J et al. Ann Neurol
  // 1990;28:668–673, PMID 2260854). Overt respiratory failure in 2–6 % of one-sided lateral
  // medullary infarcts is an older-literature figure (the background statement of Pavšič K et al.
  // Sleep Breath 2020;24:1557–1563, PMID 32064553, not that study's data), so the texts give it as
  // such (R3-6); in a recent hospital series 8 of 102 died of respiratory failure within 10 days, more often with severe dysphagia,
  // dysarthria, ipsilateral hemiparesis, urinary retention, disability before the stroke or lung
  // disease (Saito T et al. J Neurol Sci 2022;434:120167, PMID 35091384); 5 of 43 died of
  // respiratory or cardiovascular complications in the acute phase of a population series
  // (Norrving B, Cronqvist S. Neurology 1991;41:244–248, PMID 1992369); the ipsilateral
  // hemiparesis comes from the crossed pyramidal tract in the lowest medulla (Uemura M et al. J
  // Neurol Sci 2016;365:40–45, PMID 27206871) and is not reproduced by this model (C7-F11);
  // lost automatic breathing can recover (Mendoza M, Latorre JG. Neurology 2013;80:e13–e16,
  // PMID 23296134). From the threshold at which the region's symptoms appear (or a single
  // lateral medullary perforator closing), for tissue that infarcts (a vertebral TIA carries no
  // such risk); when both medullae are involved the danger event above says it.
  const lateralMedulla = (['r', 'l'] as Side[])
    .map((s) => `medulla_lateral_${s}`)
    .filter((rid) => (acute(rid, 0.25) || lacuneIschaemia.includes(rid)) && infarcted(rid, 0.25));
  if (lateralMedulla.length > 0 && !bilateral(acute, MEDULLA)) {
    events.push({
      id: 'lateral_medullary_breathing',
      kind: 'complication',
      severity: 'warn',
      onsetH: 0,
      endH: 240,
      title: { zh: '延髓外側梗塞：前 10 天呼吸可能衰竭', en: 'Lateral medullary infarct: breathing may fail in the first 10 days' },
      desc: {
        zh: '延髓外側有讓呼吸自動進行的神經網路，以及呼吸道、心跳與血壓的反射；只壞一側就可能失去自動呼吸（睡著就停，「Ondine 詛咒」）。前約 10 天呼吸可能變慢或停止，多半在睡眠中：較早的系列中約 2–6% 出現明顯的呼吸衰竭（單側延髓外側梗塞）；一個較新的醫院系列 102 人中有 8 人（8%）在 10 天內死於呼吸衰竭，一個較早的族群研究 43 人中有 5 人在急性期死於呼吸或心血管併發症。嚴重吞嚥困難、構音障礙、病灶同側的手腳無力、尿液滯留、中風前已失能或有肺病時風險較高——病灶同側的無力（Opalski 變異型，延髓最下段已交叉的錐體徑受損）本模型沒有重現。這段期間要密切觀察呼吸，包括睡眠中；失去的自動呼吸有時會恢復。',
        en: 'The lateral medulla holds the network that keeps breathing going automatically, and the reflexes of the airway, heart rate and blood pressure; losing one side can be enough to lose automatic breathing (breathing stops in sleep: "Ondine\'s curse"). For about the first 10 days breathing can slow or stop, mostly in sleep: overt respiratory failure was reported in about 2–6 % in older series (of one-sided lateral medullary infarcts); in one recent hospital series 8 of 102 (8 %) died of respiratory failure within 10 days, and in an older population series 5 of 43 died of respiratory or cardiovascular complications in the acute phase. The risk is higher with severe dysphagia, dysarthria, weakness of the limbs on the same side as the infarct, urinary retention, disability before the stroke or lung disease — the same-side weakness (Opalski variant, from the crossed pyramidal tract in the lowest medulla) is not reproduced by this model. Breathing is watched closely during this time, including in sleep; lost automatic breathing sometimes recovers.',
      },
      regions: lateralMedulla,
    });
  }

  // A basilar occlusion that is not reopened, with stupor, coma or a disorder of consciousness
  // (Y3-11): 90-day mortality with medical care alone was 55 % in ATTENTION (Tao C et al. N Engl J
  // Med 2022;387:1361-1372, PMID 36239644; within 12 h) and 42 % in BAOCHE (Jovin TG et al. N Engl
  // J Med 2022;387:1373-1384, PMID 36239645; 6-24 h), the control arms; without recanalisation a
  // good outcome was close to nil, about 2 % (Lindsberg PJ, Mattle HP. Stroke 2006;37:922-928, PMID
  // 16439705). The model does not represent death, so the rest of the course is a survivor's.
  // Those trials' patients were comatose from the basilar lesion: only a coma it causes itself
  // counts, from when the artery closes (Z3-2) — the coma of a swollen hemisphere, before or after
  // it, is the herniation's own risk, and a locked-in patient made drowsy by it keeps the
  // locked-in caveat
  const basilarComaFromH = input.listed?.basilarComaFromH ?? null;
  if (input.basilarNotReopened && basilarComaFromH !== null) {
    fatalRisk.add('basilar');
    events.push({
      id: 'basilar_fatal',
      kind: 'secondary',
      severity: 'danger',
      onsetH: basilarComaFromH,
      title: { zh: '基底動脈沒有打通又昏迷：常會致命', en: 'Basilar artery not reopened, with coma: often fatal' },
      desc: {
        zh: '基底動脈阻塞沒有打通、又有木僵、昏迷或意識障礙時，常會致命：兩個取栓試驗中只接受內科治療的對照組，90 天死亡率是 55%（ATTENTION，發作 12 小時內）與 42%（BAOCHE，6–24 小時）；一個病例系列的系統性分析中，沒有再通的病人幾乎沒有好的預後（約 2%）。模型不模擬死亡：之後的病程、3 個月與 6 個月的 NIHSS，都是「假如病人存活」的情況。',
        en: 'A basilar-artery occlusion that is not reopened, with stupor, coma or a disorder of consciousness, is often fatal: in the control arms of two thrombectomy trials, with medical care alone, 90-day mortality was 55% (ATTENTION, within 12 h of onset) and 42% (BAOCHE, 6–24 h); in a systematic analysis of case series a good outcome without recanalisation was close to nil (about 2%). The model does not represent death: the rest of the course and the 3- and 6-month NIHSS show what happens if the patient survives.',
      },
      regions: [],
    });
  }
  // A lighter caveat where the cascade gives no fatal risk (Y3-11): a locked-in syndrome that does
  // not clear when blood returns (mortality about 60 % in an early review of 139 cases: Patterson &
  // Grabois 1986, above) and both medial medullae infarcted (in-hospital mortality 23.8 % in a
  // systematic review of 38 cases: Pongmoragot J et al. J Stroke Cerebrovasc Dis 2013;22:775-780,
  // PMID 22541608) — not "usually fatal", but the 3- and 6-month picture is a survivor's
  const survival = new Set<SurvivalCaveat>();
  const bc = input.listed?.brainstem;
  // (a locked-in stretch that ends after blood returned during it, or during the stretches just
  // before it, clears with the reopening, at once or as the rescued pons regains its function: Y1-12)
  if (bc?.segments.some((g, i) => (g.state === 'classical' || g.state === 'incomplete') && !endsAfterReopening(bc, i))) survival.add('locked_in');
  if (bilateral((r) => finalLevel(r) >= SIGNS_THR, [['medulla_medial_r', 'medulla_medial_l']])) survival.add('bilateral_medulla');

  // ── 6. systemic complications ──────────────────────────────────
  // The aspiration risk follows what the case lists (C1-F4, R3-1 … R3-3): dysphagia (one-sided
  // hemispheric, lacunar and later-appearing ones included) or a reduced level of consciousness,
  // read from the symptom list itself. One warning per stretch in which they are listed (X3-1,
  // X3-3), titled by what is listed then: dysphagia while it is listed, reduced consciousness
  // while that is listed without it, and none once both have cleared (a dysphagia that clears when
  // blood returns ends its warning). Dysphagia roughly triples the risk of pneumonia, and
  // aspiration multiplies it by about 11 (Martino R et al. Stroke 2005;36:2756-2763, PMID
  // 16269630); when it is there from the start, the swallow screen comes before any oral intake
  // (onset 0 h). A large supratentorial infarct keeps a warning from onset that says it lists
  // neither, until one of them is listed: dysphagia was found in 37–78 % of stroke patients
  // depending on how it was tested (Martino 2005), so the swallow is screened anyway — titling it
  // "dysphagia" from onset when the dysphagia appears only on day 3 named a deficit the case did
  // not show (X3-3).
  // With stacked occlusions each lesion that leaves an infarct has its own two weeks, from its own
  // onset (Y3-19): a basilar occlusion a month before the index M1 lists dysphagia and coma from
  // its onset, so its warning runs then, not from the M1.
  // A TIA (blood back before any tissue died) leaves no swallowing problem or immobility behind:
  // its symptoms clear when the flow returns, so the complications of a lasting deficit (aspiration,
  // venous thrombosis) are not told for it; ischaemia that lasts without infarction keeps them
  const tia = noInfarct && input.flowReturnsH != null;
  const listed = input.listed;
  const largeSupra = vol.supra.r + vol.supra.l > 60;
  /** the lesion window that contains the index onset */
  const indexWindow = listed?.windows.find((w) => w.fromH <= 1e-9 && w.untilH > 1e-9);
  if (listed && !tia) {
    // (a locked-in patient's dysphagia is in the list from the start, so it needs no rule of its own)
    const stretches = listed.swallow;
    const phases: { kind: SwallowStretch['kind'] | 'screen'; fromH: number; untilH: number; regions: string[] }[] = [...stretches];
    const covered = stretches.some((st) => st.fromH <= 1e-9 && st.untilH > 1e-9);
    if (largeSupra && indexWindow && !covered) {
      const next = stretches.find((st) => st.fromH > 0 && st.fromH < indexWindow.untilH);
      phases.push({ kind: 'screen', fromH: 0, untilH: next ? next.fromH : indexWindow.untilH, regions: [] });
    }
    phases.sort((a, b) => a.fromH - b.fromH);
    phases.forEach((ph, i) => {
      const { kind } = ph;
      events.push({
        id: i === 0 ? 'aspiration' : `aspiration_${i + 1}`,
        kind: 'complication',
        severity: 'warn',
        onsetH: ph.fromH,
        endH: ph.untilH,
        title:
          kind === 'dysphagia'
            ? { zh: '吞嚥困難 → 吸入性肺炎', en: 'Dysphagia → aspiration pneumonia' }
            : kind === 'drowsy'
              ? { zh: '意識變差 → 吸入性肺炎', en: 'Reduced consciousness → aspiration pneumonia' }
              : { zh: '吸入風險：進食前先做吞嚥篩檢', en: 'Aspiration risk: swallow screen before oral intake' },
        // fever early after an ischaemic stroke is mostly infection or aspiration (Grau AJ et al.,
        // J Neurol Sci 1999;171:115–120); central fever is described mostly with haemorrhage and
        // brainstem involvement (Sung CY et al., Eur Neurol 2009;62:86–92), so it is shown only as a
        // risk after extensive bilateral tegmental infarction with coma ('central_hyperthermia'
        // above; see the temperature section of anatomy/symptoms.ts)
        desc: {
          zh:
            (kind === 'drowsy'
              ? '意識變差的病人無法安全吞嚥、也保護不了呼吸道，容易吸入。'
              : kind === 'screen'
                ? '這個病例沒有列出吞嚥困難或意識變差，但梗塞很大。吞嚥困難在中風後很常見（依檢查方法不同，37–78%），模型沒有列出的也可能存在，所以仍要先做吞嚥篩檢。'
                : '') +
            '吸入性肺炎是中風後最常見的致死併發症之一。進食前需做吞嚥篩檢，必要時暫時以鼻胃管餵食。中風後發燒要先找感染（肺炎、尿路感染）；腦部本身引起的「中樞性發燒」在缺血性中風很少見（主要是兩側腦幹被蓋大範圍受損又昏迷時，見「中樞性高熱的風險」），只有排除感染後才考慮。',
          en:
            (kind === 'drowsy'
              ? 'A patient with reduced consciousness cannot swallow safely or protect the airway, and is prone to aspiration. '
              : kind === 'screen'
                ? 'This case lists no swallowing problem or reduced consciousness, but the infarct is large. Dysphagia is common after stroke (37–78 % depending on how it is tested) and can be present even where the model lists none, so the swallow is still screened. '
                : '') +
            'Aspiration pneumonia is one of the commonest fatal complications after stroke. A swallow screen is needed before eating; temporary tube feeding may be required. Fever after a stroke means looking for infection first (pneumonia, urinary tract); fever caused by the brain injury itself ("central fever") is rare after an ischaemic stroke (mainly with extensive bilateral damage to the brainstem tegmentum and coma: see "Risk of central hyperthermia") and is considered only once infection has been ruled out.',
        },
        regions: kind === 'dysphagia' ? [...new Set(ph.regions)] : [],
      });
    });
  }
  // the heart after any stroke (C10-F5): serious cardiac adverse events in 19 % of 846 ischaemic
  // strokes within 3 months and cardiac death in 4.1 %, the first-event hazard peaking on days 2–3
  // and cardiac death in week 2; predictors heart failure, diabetes, creatinine, stroke severity
  // and QTc — lesion site not analysed (Prosser J et al. Stroke 2007;38:2295-2302, PMID 17569877);
  // the stroke–heart syndrome (Scheitz JF et al. Lancet Neurol 2018;17:1109-1120, PMID 30509695).
  // The insula of either side adds to it, with the same threshold: the evidence on the side is
  // mixed (right dorsal anterior insula and troponin dynamics: Krause T et al. Ann Neurol
  // 2017;81:502-511, PMID 28253544; left insula and adverse cardiac outcome at 1 year: Laowattana S
  // et al. Neurology 2006;66:477-483, PMID 16505298). Prolonged monitoring newly finds atrial
  // fibrillation in 23.7 % (Sposato LA et al. Lancet Neurol 2015;14:377-387, PMID 25748102) —
  // cause-finding, not a complication. "Severe" is Prosser's predictor, the stroke's clinical
  // severity, read from the symptom list (Y3-5): an NIHSS of 16 or more (the scale's
  // moderate-to-severe and severe bands here), or stupor, coma or a disorder of consciousness —
  // not the infarct volume, which the study did not analyse (a 135-mL ACA infarct with an NIHSS of
  // 6 is not a severe stroke; a 58-mL M1 infarct with an NIHSS of 17–23 is). The warning is not
  // called severe before the list shows it (X3-4: a cerebellar infarct that swells into coma on
  // day 2 is an alert, mild stroke before that), and once a reopening has cleared the deficit for
  // the rest of the two weeks it says the stroke was severe, not that it is. One warning per
  // lesion's two weeks (Y3-19), split where these change.
  const brainInfarct = brainStory && !earInfarct && !noInfarct;
  const insulaAcute = (['insula_r', 'insula_l'] as const).filter((r) => acute(r, 0.3));
  const cardiacWindows: ListedWindow[] = listed
    ? listed.windows
    : brainInfarct
      ? [{ fromH: 0, untilH: 336, comaFromH: null, severeFromH: null, severeByComa: false, severeEndH: null, insula: insulaAcute }]
      : [];
  const sideZh = (r: string) => (r.endsWith('_r') ? '右' : '左');
  const sideEn = (r: string) => (r.endsWith('_r') ? 'right' : 'left');
  /** what the warning says about severity, in each stretch of a window */
  const severityText = (w: ListedWindow, state: 'none' | 'now' | 'past'): L => {
    if (state === 'none' || w.severeFromH === null) return { zh: '', en: '' };
    const fromOnset = w.severeFromH <= w.fromH + 1e-6;
    if (state === 'now')
      return fromOnset
        ? {
            zh: `這是嚴重的中風（${w.severeByComa ? '木僵或昏迷' : 'NIHSS 16 分以上'}），風險較高。`,
            en: ` This is a severe stroke (${w.severeByComa ? 'stupor or coma' : 'an NIHSS of 16 or more'}), which carries a higher risk.`,
          }
        : {
            zh: `這是嚴重的中風（${w.severeByComa ? '已出現木僵或昏迷' : 'NIHSS 已達 16 分以上'}），風險較高。`,
            en: ` This is a severe stroke (${w.severeByComa ? 'it has brought stupor or coma' : 'its NIHSS has reached 16 or more'}), which carries a higher risk.`,
          };
    return fromOnset
      ? { zh: '這次中風在發作時很嚴重，風險較高。', en: ' The stroke was severe at onset, which carries a higher risk.' }
      : {
          zh: `這次中風曾經很嚴重（${w.severeByComa ? '出現過木僵或昏迷' : 'NIHSS 曾達 16 分以上'}），風險較高。`,
          en: ` The stroke was severe for a time (${w.severeByComa ? 'stupor or coma' : 'an NIHSS of 16 or more'}), which carries a higher risk.`,
        };
  };
  let cardiacN = 0;
  for (const w of cardiacWindows) {
    // the index lesion's window only for a brain infarct (no eye or inner-ear infarct, no TIA)
    if (w === indexWindow && !brainInfarct) continue;
    const insula = w.insula;
    const stretches: { fromH: number; endH: number; state: 'none' | 'now' | 'past' }[] = [];
    if (w.severeFromH === null) stretches.push({ fromH: w.fromH, endH: w.untilH, state: 'none' });
    else {
      if (w.severeFromH > w.fromH + 1e-9) stretches.push({ fromH: w.fromH, endH: w.severeFromH, state: 'none' });
      stretches.push({ fromH: w.severeFromH, endH: w.severeEndH ?? w.untilH, state: 'now' });
      if (w.severeEndH !== null) stretches.push({ fromH: w.severeEndH, endH: w.untilH, state: 'past' });
    }
    for (const { fromH, endH, state } of stretches) {
      const sev = severityText(w, state);
      cardiacN++;
      events.push({
        id: cardiacN === 1 ? 'cardiac' : `cardiac_${cardiacN}`,
        kind: 'complication',
        severity: state !== 'none' || insula.length > 0 ? 'warn' : 'info',
        onsetH: fromH,
        endH,
        title: { zh: '中風後的心臟：心律不整、心肌受損', en: 'The heart after a stroke: arrhythmia, cardiac injury' },
        desc: {
          zh: `中風後最初幾天常出現心臟併發症（「中風—心臟症候群」）：心律不整、心肌旋轉蛋白（troponin）上升、心臟功能變差。一個 846 人的試驗資料中，19% 在 3 個月內發生嚴重的心臟不良事件、4.1% 死於心臟原因；第一次事件最常在第 2–3 天，心臟死亡最常在第 2 週。預測因子是心衰竭病史、糖尿病、腎功能較差、中風嚴重度與心電圖 QT 延長（該研究沒有分析病灶位置）。所以急性期會監測心電圖；較長時間的心律監測約可新發現四分之一的心房顫動——這是在找中風的原因，不是中風造成的併發症。${sev.zh}${
            insula.length
              ? `梗塞包含${insula.map(sideZh).join('、')}側島葉：島葉參與心臟的自主神經控制，但哪一側比較重要，證據不一致——右側背前島葉與 troponin 上升有關，左側島葉與之後一年的心臟事件有關。`
              : ''
          }`,
          en: `Cardiac complications are common in the first days after a stroke (the "stroke–heart syndrome"): arrhythmias, a troponin rise, reduced cardiac function. In trial data of 846 patients, 19 % had a serious cardiac adverse event within 3 months and 4.1 % died of cardiac causes; first events peaked on days 2–3 and cardiac deaths in the second week. The predictors were heart failure, diabetes, poorer kidney function, stroke severity and a long QT interval on the ECG (lesion site was not analysed). The heart rhythm is therefore monitored in the acute phase; longer rhythm monitoring newly finds atrial fibrillation in about a quarter — a search for the cause of the stroke, not a complication of it.${sev.en}${
            insula.length
              ? ` The infarct involves the ${insula.map(sideEn).join(' and ')} insula, which helps control the heart's autonomic tone; the evidence on the side is mixed — the right dorsal anterior insula is linked to a troponin rise, the left insula to cardiac events over the following year.`
              : ''
          }`,
        },
        regions: [...insula],
      });
    }
  }
  // Venous thrombosis follows immobility (Y3-7): the risk group is the patients who cannot walk to
  // the toilet unaided, those enrolled from day 0 to 3 in CLOTS 3, where intermittent pneumatic
  // compression lowered proximal deep-vein thrombosis within 30 days from 12.1 % to 8.5 % (CLOTS
  // Trials Collaboration. Lancet 2013;382:516-524, PMID 23727163). From the symptom list, from day
  // 2 to day 30 of each lesion: a leg barely or not lifted against gravity, stupor or coma, a
  // disorder of consciousness or akinetic mutism; not after a deficit that cleared before day 2
  // (a basilar occlusion reopened at 2 h), and ending when the patient can move again.
  if (listed && !tia) {
    listed.immobile.forEach((st, i) =>
      events.push({
        id: i === 0 ? 'dvt' : `dvt_${i + 1}`,
        kind: 'complication',
        severity: 'warn',
        onsetH: st.fromH,
        endH: st.untilH,
        title: { zh: '深部靜脈血栓與肺栓塞', en: 'Deep-vein thrombosis & pulmonary embolism' },
        desc: {
          zh: '腿不動（癱瘓，或意識不清、幾乎不動）時，靜脈血流停滯形成血栓，可能流到肺部。高風險的是無法自己走到廁所的病人（CLOTS 3 試驗的收案條件；這個試驗中，間歇性氣動加壓讓 30 天內的近端深部靜脈血栓從 12.1% 降到 8.5%）。需早期活動與間歇性氣動加壓。模型從第 2 天起、在病人無法自己活動的期間顯示這個警示，最多到第 30 天。',
          en: 'A leg that does not move — paralysed, or in a patient who is not awake enough to move — does not pump venous blood; clots can form and travel to the lungs. The patients at risk are those who cannot walk to the toilet unaided (the entry criterion of the CLOTS 3 trial, in which intermittent pneumatic compression lowered proximal deep-vein thrombosis within 30 days from 12.1% to 8.5%). Early mobilisation and intermittent pneumatic compression help. The model shows this warning from day 2 while the patient is immobile, up to day 30.',
        },
        regions: [],
      }),
    );
  }
  // Seizures (C4-F4). Early, acute symptomatic seizures (≤ 7 days): 4.1% after a first stroke,
  // lobar infarct 5.9% vs deep infarct 0.6%, status epilepticus in 27% of them, NIHSS not an
  // independent predictor (Labovitz DL et al. Neurology 2001;57:200–206); 6.5% with cortical
  // infarction, generally within 48 h (Kilpatrick CJ et al. Arch Neurol 1990;47:157–160); 3.1% of
  // all strokes (haemorrhages included) within 24 h (Szaflarski JP et al. Epilepsia
  // 2008;49:974–981); 4.2% after an infarct, 12.5% (4 of 32) with haemorrhagic transformation, not
  // significant (OR 2.7, 0.8–9.6), cortical involvement OR 3.1 (Beghi E et al. Neurology
  // 2011;77:1785–1793). Late seizures (> 7 days): 4% at 1 year and 8% at 5 years; SeLECT (severity,
  // large-artery aetiology, early seizure, cortical involvement, MCA territory) 0.7–63% at 1 year
  // (Galovic M et al. Lancet Neurol 2018;17:143–152); 8.6% after an ischaemic stroke over a mean
  // 9 months, epilepsy in 2.5% of all 1897 strokes, a late first seizure predicting epilepsy
  // (HR 12.37; Bladin CF et al. Arch Neurol 2000;57:1617–1622).
  const corticalRegions = infarctedRegions.filter((r) => REGION_BY_ID[r]?.category === 'cortex');
  if (corticalRegions.length) {
    events.push({
      id: 'seizure_early',
      kind: 'complication',
      severity: 'info',
      onsetH: 0,
      endH: 168,
      title: { zh: '早發性癲癇發作（第一週）', en: 'Early seizures (first week)' },
      desc: {
        zh: '第一週內的發作是急性症狀性的：來自急性缺血對皮質的刺激，不是疤痕。多半在最初 24–48 小時。皮質（腦葉）梗塞約 4–6%（一個社區研究：腦葉梗塞 5.9%、深部梗塞 0.6%；另一研究皮質梗塞 6.5%），其中約四分之一以癲癇重積狀態表現。出血轉化時可能較高（一項研究 12.5%，但只有 32 人、未達統計顯著）。中風嚴重度（NIHSS）不是獨立的預測因子。',
        en: 'Seizures in the first week are acute symptomatic: they come from the acute ischaemic irritation of the cortex, not from a scar. Most occur within the first 24–48 h. About 4–6% after a cortical (lobar) infarct (in one community study 5.9% after a lobar and 0.6% after a deep infarct; in another 6.5% after cortical infarction), and about a quarter of them present as status epilepticus. Haemorrhagic transformation may raise the risk (12.5% in one study, but only 32 patients and not statistically significant). Stroke severity (NIHSS) was not an independent predictor.',
      },
      regions: corticalRegions,
    });
    // the SeLECT predictors this case shows; severity, aetiology and an early seizure are left out
    // (a border-zone bed shared half and half with another artery does not count, and nor does a
    // mostly-MCA bed whose infarct stays within its other artery's share: a PCA occlusion that
    // infarcts the PCA third of the occipital pole's MCA–PCA border bed is not an MCA infarct)
    const mcaTerritory = BEDS.some((b) => {
      const inf = bedFinal[b.id] ?? 0;
      const mca = familyShare(b, MCA_FAMILIES);
      return inf >= 0.3 && mca > 0.5 && inf >= 1 - mca + 0.05;
    });
    const predZh = mcaTerritory ? '皮質受損、中大腦動脈區受損' : '皮質受損';
    const predEn = mcaTerritory ? 'cortical involvement and the territory of the middle cerebral artery' : 'cortical involvement';
    events.push({
      id: 'seizure_late',
      kind: 'complication',
      severity: 'info',
      onsetH: 168,
      title: { zh: '晚發性癲癇與中風後癲癇症', en: 'Late seizures and post-stroke epilepsy' },
      desc: {
        zh: `一週後的發作來自皮質疤痕，較容易反覆（第一次晚發性發作是日後癲癇症的強力預測因子）。缺血性中風後的晚發性發作約 1 年 4%、5 年 8%，風險在 6 個月後仍持續。SeLECT 評分用五個因子估計 1 年風險（0.7% 到 63%）：中風嚴重度、大動脈粥狀硬化的病因、早發性發作、皮質受損、中大腦動脈區受損。這個病例看得到的有：${predZh}；嚴重度、病因與是否有早發性發作，模型不判定，所以這裡不算分數。`,
        en: `Seizures after the first week come from the cortical scar and recur more often (a late first seizure strongly predicts epilepsy). After an ischaemic stroke late seizures occur in about 4% at 1 year and 8% at 5 years, and the risk continues past 6 months. The SeLECT score estimates the 1-year risk (0.7% to 63%) from five predictors: stroke severity, large-artery atherosclerotic cause, early seizures, cortical involvement and the territory of the middle cerebral artery. This case shows ${predEn}; the model does not decide severity, cause or whether an early seizure occurred, so no score is given here.`,
      },
      regions: corticalRegions,
    });
  }

  // ── 7. remote effects: diaschisis & degeneration ──────────────
  // striatocapsular infarction (putamen, caudate and internal capsule, the cortex spared): the
  // commonest presentation has cortical signs — dysphasia, neglect or dyspraxia — acutely from
  // cortical hypoperfusion, chronically attributed to diaschisis (Donnan GA et al. Brain
  // 1991;114:51-70, PMID 1998890); aphasia is extremely rare with lesions confined to the basal
  // ganglia (Bhatia KP, Marsden CD. Brain 1994;117:859-876, PMID 7922471), so these signs come
  // with the whole striatocapsular pattern only, not with a putaminal or caudate lacune. On the
  // left a non-fluent aphasia with preserved repetition (listed as transcortical motor) and limb
  // apraxia, on the right neglect; shown for the first three months (illustrative: the paper gives
  // no time course). C6-F6. The right putamen and caudate carry no neglect of their own: the
  // neglect of an acute subcortical infarct came with cortical hypoperfusion (Hillis AE et al. Brain
  // 2002;125:1094-1104, PMID 11960898), so this event is where it comes from (R2-4).
  for (const s of ['r', 'l'] as Side[]) {
    const deep =
      acute(`putamen_${s}`, 0.4) &&
      (acute(`caudate_body_${s}`) || acute(`caudate_head_${s}`)) &&
      ['ic_posterior_limb', 'ic_genu', 'ic_anterior_limb'].some((b) => acute(`${b}_${s}`)) &&
      infarcted(`putamen_${s}`, 0.3);
    if (!deep || REGIONS.some((r) => r.side === s && r.category === 'cortex' && infarcted(r.id, 0.3))) continue;
    const left = s === 'l';
    // Whether the cortex dies is decided by the course: when it was ischaemic at onset too (an M1
    // occlusion), the picture is that of a striatocapsular infarct only once blood has returned to
    // it, before which the whole territory is out of action (a complete MCA syndrome), and its
    // function then comes back over hours (Y1-12), which the text says; when the occlusion never
    // reached it (the lenticulostriate arteries alone), from onset (U2-6)
    const cortexIschaemic = REGIONS.some((r) => r.side === s && r.category === 'cortex' && acute(r.id));
    const fromH = cortexIschaemic && input.flowReturnsH != null ? input.flowReturnsH : 0;
    // the deep structures that die, named as such (U2-6: the internal capsule, which an early
    // reopening spares, was named beside a putamen, caudate and pallidum infarct)
    const DEEP: [string[], L][] = [
      [['putamen'], { zh: '殼核', en: 'putamen' }],
      [['caudate_head', 'caudate_body'], { zh: '尾狀核', en: 'caudate' }],
      [['globus_pallidus'], { zh: '蒼白球', en: 'globus pallidus' }],
      [['ic_anterior_limb', 'ic_genu', 'ic_posterior_limb'], { zh: '內囊', en: 'internal capsule' }],
    ];
    const dead = DEEP.filter(([ids]) => ids.some((b) => (rf[`${b}_${s}`] ?? 0) >= 0.2));
    const deadZh = dead.map(([, n]) => n.zh).join('、');
    const deadEn = dead.map(([, n]) => n.en).join(', ');
    events.push({
      id: `striatocapsular_cortical_${s}`,
      kind: 'secondary',
      severity: 'warn',
      onsetH: fromH,
      endH: 2160,
      title: { zh: '紋狀體內囊梗塞的皮質徵象', en: 'Cortical signs of a striatocapsular infarct' },
      desc: {
        zh: `${
          fromH > 0
            ? `血流在${left ? '左' : '右'}側大腦皮質壞死之前恢復：梗塞只在深部（${deadZh}）。皮質在接下來數小時逐漸恢復功能，之後留下的仍常是皮質徵象：`
            : `梗塞只在深部（${deadZh}），${left ? '左' : '右'}側大腦皮質沒有壞死，卻常出現皮質徵象：`
        }${left ? '說話少而費力但能複誦的失語（皮質下失語，這裡列為經皮質運動性失語）與失用' : '左側空間忽略'}。${
          fromH > 0
            ? '血流恢復之後，它們歸因於深部與皮質之間的連結中斷（遠隔效應，diaschisis）；動脈阻塞時則是皮質本身缺血。'
            : '急性期歸因於皮質灌流不足（堵住豆紋動脈開口的 M1 起始處血栓或狹窄，也會減少皮質的血流），之後則歸因於深部與皮質之間的連結中斷（遠隔效應，diaschisis）。'
        }常在數週到數月內改善，部分會留下來；模型顯示前三個月。只有手臂或手臂加臉無力、沒有皮質徵象的病人，恢復通常最好。`,
        en: `${
          fromH > 0
            ? `Blood came back before the ${left ? 'left' : 'right'} cortex died: the infarct is deep (${deadEn}). As the cortex regains its function over the following hours, the signs it leaves are often cortical all the same: `
            : `The infarct is deep (${deadEn}) and the ${left ? 'left' : 'right'} cortex has not died, yet cortical signs are common: `
        }${left ? 'an aphasia with sparse, effortful speech but preserved repetition (a subcortical aphasia, listed here as transcortical motor aphasia) and apraxia' : 'neglect of the left side'}. ${
          fromH > 0
            ? 'With the flow back they are attributed to the lost connections between the deep structures and the cortex (diaschisis); while the artery was blocked, the cortex itself was ischaemic.'
            : 'Acutely they are attributed to cortical hypoperfusion (the clot or stenosis at the MCA origin that blocks the lenticulostriate openings can also reduce cortical flow); later to the lost connections between the deep structures and the cortex (diaschisis).'
        } They often improve over weeks to months, and some remain; the model shows them for the first three months. Patients with arm or arm-and-face weakness alone and no cortical signs usually recover best.`,
      },
      regions: REGIONS.filter((r) => r.side === s && DEEP.some(([ids]) => ids.includes(r.baseId)) && (rf[r.id] ?? 0) >= 0.2).map((r) => r.id),
      symptoms: left
        ? [
            { id: 'aphasia_tc_motor', side: null, sev: 1 },
            { id: 'apraxia', side: null, sev: 1 },
          ]
        : [{ id: 'neglect', side: 'l', sev: 1 }],
    });
  }
  for (const s of ['r', 'l'] as Side[]) {
    // Crossed cerebellar diaschisis (C4-F6): in 55 carotid-territory strokes CCD was significant in
    // 58% of PET studies, more prominent with internal-capsule or extensive cortical involvement,
    // pyramidal-tract damage neither necessary nor sufficient; seen within hours, it tended to
    // persist but sometimes disappeared within days (Pantano P et al. Brain 1986;109:677–694).
    // Triggers: fronto-motor or capsular involvement, or an extensive carotid-territory cortical
    // infarct in any of its lobes (illustrative ≥ 30 mL); and the ventrolateral thalamus, for which
    // there is thalamic evidence (below). Not extended to posterior-territory cortex, which that
    // study did not include.
    const drivers = FRONTO_MOTOR.map((b) => `${b}_${s}`).filter((r) => infarcted(r, 0.3));
    // infarcted cortex weighted by the carotid share of its supply (a border-zone bed counts by half)
    const carotidCortex = BEDS.filter((b) => b.region.endsWith(`_${s}`) && REGION_BY_ID[b.region].category === 'cortex').reduce(
      (a, b) => a + (bedFinal[b.id] ?? 0) * b.volume * familyShare(b, CAROTID_FAMILIES),
      0,
    );
    if ((drivers.length && vol.supra[s] >= 8) || carotidCortex >= CCD_CORTEX_ML) {
      const cb = BEDS.filter((b) => /^cerebellum_(superior|posterior_inferior|anterior_inferior)_/.test(b.region) && b.region.endsWith(`_${opp(s)}`));
      // (from that hemisphere's own lesion: V1-1)
      cb.forEach((b) => addEffect(b.id, { kind: 'diaschisis', onsetH: sideOnset(s) + CCD_ONSET_H, event: `ccd_${s}` }));
      // the text names the trigger (R6-4): the carotid-territory evidence for the capsule, the
      // motor and frontal pathways or extensive carotid-territory cortex; the thalamic evidence when
      // only the ventrolateral thalamus (the relay of the cerebellar output to the motor cortex) is
      // hit, as in a PCA infarct (Förster A et al. PLoS One 2014;9:e88044: on perfusion MRI in 9 of
      // 39 acute isolated thalamic infarcts, more often with larger lesions and with dysarthria)
      const carotid = drivers.some((r) => !r.startsWith('thalamus_ventrolateral_')) || carotidCortex >= CCD_CORTEX_ML;
      const sz = s === 'r' ? '右' : '左';
      const oz = s === 'r' ? '左' : '右';
      const se = s === 'r' ? 'right' : 'left';
      const oe = s === 'r' ? 'left' : 'right';
      events.push({
        id: `ccd_${s}`,
        kind: 'secondary',
        severity: 'info',
        onsetH: sideOnset(s) + CCD_ONSET_H,
        title: { zh: '交叉性小腦功能抑制（遠隔效應）', en: 'Crossed cerebellar diaschisis (remote effect)' },
        desc: carotid
          ? {
              zh: `${sz}側大腦的梗塞（內囊，或大範圍的頸動脈供應區的皮質）切斷皮質—橋腦—小腦路徑的輸入，對側（${oz}側）小腦半球的血流與代謝跟著下降。一個頸動脈區中風的 PET 研究中，58% 的檢查看得到；有沒有偏癱都可能出現。小腦本身沒有梗塞、通常沒有症狀。發作後數小時內就可能出現，多半持續數月，有時數天內就消失。`,
              en: `The ${se} cerebral infarct (the internal capsule, or an extensive stretch of carotid-territory cortex) removes input through the cortico-ponto-cerebellar pathway, so blood flow and metabolism fall in the opposite (${oe}) cerebellar hemisphere. In a PET study of carotid-territory strokes it was present in 58% of studies, with or without hemiparesis. The cerebellum is not infarcted and it is usually silent. It can appear within hours of onset and usually persists for months, though sometimes it disappears within days.`,
            }
          : {
              zh: `${sz}側視丘的梗塞（腹外側核，小腦輸出到運動皮質的中繼站）切斷小腦—視丘—皮質的迴路，對側（${oz}側）小腦半球的血流與代謝跟著下降。灌流 MRI 上，急性單純視丘梗塞約五分之一看得到（39 位中 9 位），病灶較大、有構音障礙時較常見。小腦本身沒有梗塞、通常沒有症狀；這個研究在急性期就看到了它。`,
              en: `The ${se} thalamic infarct (the ventrolateral nucleus, which relays the cerebellar output to the motor cortex) interrupts the cerebello-thalamo-cortical loop, so blood flow and metabolism fall in the opposite (${oe}) cerebellar hemisphere. On perfusion MRI it was seen in about a fifth of acute isolated thalamic infarcts (9 of 39), more often with larger lesions and with dysarthria. The cerebellum is not infarcted and it is usually silent; that study found it in the acute phase.`,
            },
        regions: [...new Set(cb.map((b) => b.region))],
      });
    }

    // Wallerian degeneration of the corticospinal tract
    const levels = ['midbrain_peduncle', 'pons_rostral_basis', 'pons_caudal_basis', 'medulla_medial'];
    let startIdx = -1;
    if (MOTOR_SUPRA.some((b) => infarcted(`${b}_${s}`, 0.3))) startIdx = 0;
    else {
      for (let i = 0; i < levels.length - 1; i++) {
        if (infarcted(`${levels[i]}_${s}`, 0.3)) {
          startIdx = i + 1;
          break;
        }
      }
    }
    if (startIdx >= 0) {
      const down = levels.slice(startIdx).map((b) => `${b}_${s}`).filter((r) => !infarcted(r, 0.5));
      down.forEach((rid) =>
        BEDS.filter((b) => b.region === rid).forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 336, event: `wallerian_${s}` })),
      );
      if (down.length) {
        // shrinkage of the brainstem over several years (Kuhn MJ et al. Radiology 1989;172:179–182)
        events.push({
          id: `wallerian_${s}`,
          kind: 'secondary',
          severity: 'info',
          onsetH: 336,
          title: { zh: '皮質脊髓徑的沃勒氏退化', en: 'Wallerian degeneration of the corticospinal tract' },
          desc: {
            zh: '運動神經元的細胞本體或纖維被切斷後，下游的軸突會一路往下退化：大腦腳 → 橋腦 → 延髓錐體（在延髓下端交叉到對側脊髓）。擴散張量影像約 1–2 週可見；傳統 MRI 上這條徑路約 4 週時在 T2 先變暗，10–14 週後變成永久的亮訊號，腦幹在數年間逐漸萎縮。',
            en: 'Once motor neurons or their fibres are cut, the axons below degenerate all the way down: peduncle → pons → medullary pyramid (crossing to the opposite spinal cord at the bottom of the medulla). Diffusion-tensor imaging shows it after ~1–2 weeks; on conventional MRI the tract first turns dark on T2 at about 4 weeks and permanently bright after 10–14 weeks, and the brainstem shrinks over years.',
          },
          regions: down,
        });
      }
    }
    // pontine basis → bilateral middle cerebellar peduncle degeneration
    if (infarcted(`pons_rostral_basis_${s}`, 0.4) || infarcted(`pons_caudal_basis_${s}`, 0.4)) {
      const mcp = BEDS.filter((b) => /^cerebellum_anterior_inferior_/.test(b.region) && stillAlive(bedFinalUntreated[b.id]));
      mcp.forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 720, event: `mcp_${s}` }));
      events.push({
        id: `mcp_${s}`,
        kind: 'secondary',
        severity: 'info',
        onsetH: 720,
        title: { zh: '橋小腦纖維退化（小腦中腳）', en: 'Pontocerebellar fibre degeneration (middle cerebellar peduncles)' },
        desc: {
          zh: '橋核的纖維交叉後經小腦中腳進入小腦；橋腦腹側梗塞數週後，雙側小腦中腳可出現退化訊號，加重協調障礙。',
          en: 'Pontine nuclei send crossing fibres through the middle cerebellar peduncles; weeks after a ventral pontine infarct both peduncles can degenerate, adding to incoordination.',
        },
        regions: [...new Set(mcp.map((b) => b.region))],
      });
    }
    // hypertrophic olivary degeneration (Guillain–Mollaret triangle)
    const hodTargets: string[] = [];
    if (infarcted(`dentate_${s}`, 0.3)) hodTargets.push(`medulla_medial_${opp(s)}`);
    if (infarcted(`midbrain_paramedian_${s}`, 0.3) || infarcted(`pons_rostral_tegmentum_${s}`, 0.3) || infarcted(`pons_caudal_tegmentum_${s}`, 0.3))
      hodTargets.push(`medulla_medial_${s}`);
    const hod = [...new Set(hodTargets)].filter((r) => !infarcted(r, 0.5));
    // a palatal tremor is listed (as possible) only after a clear infarct of a trigger: the dentate
    // nucleus, the red nucleus region or the central tegmental tract in the pontine tegmentum
    const clearTrigger = ['dentate', 'midbrain_paramedian', 'pons_rostral_tegmentum', 'pons_caudal_tegmentum'].some((b) =>
      infarcted(`${b}_${s}`, 0.5),
    );
    if (hod.length && clearTrigger) palatalTremorFromH = PALATAL_TREMOR_H;
    if (hod.length) {
      hod.forEach((rid) =>
        BEDS.filter((b) => b.region === rid).forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 720, event: `hod_${s}` })),
      );
      // how often: unknown (Schaller-Paule MA et al. Front Neurol 2021;12:675123); 38–67 % of 15
      // patients on MRI, by sequence and rater (Steidl E et al. Front Neurol 2022;13:950191). MRI
      // course: T2 signal from 1 month for years, enlargement from 6 months resolving by 3–4 years
      // (Goyal M et al. AJNR Am J Neuroradiol 2000;21:1073–1077; Kitajima et al. 1994: T2 from
      // 3 weeks, enlargement at 5–15 months). Palatal or oculopalatal tremor weeks to months later,
      // more often after haemorrhage (Tilikete C, Desestret V. Front Neurol 2017;8:302).
      events.push({
        id: `hod_${s}`,
        kind: 'secondary',
        severity: 'warn',
        onsetH: 720,
        peakH: 4320,
        title: { zh: '下橄欖核肥大性退化可能發生（遠隔的延髓變化）', en: 'Hypertrophic olivary degeneration may develop (remote medullary change)' },
        desc: {
          zh: '齒狀核—紅核—下橄欖核組成 Guillain–Mollaret 三角。齒狀核（影響對側橄欖核）或紅核／中央被蓋徑（影響同側）受損後，下橄欖核可能失去抑制而退化肥大——多少人會發生並不清楚：一個 15 人的前瞻性 MRI 研究依序列與判讀者不同，在 38–67% 看到它。MRI 上約 1 個月出現 T2 高訊號（持續數年），約 6 個月開始變大，3–4 年內消退，之後萎縮。少數人在數週到數月後出現軟顎顫抖（出血後比梗塞後常見）。',
          en: 'Dentate nucleus, red nucleus and inferior olive form the Guillain–Mollaret triangle. After damage to the dentate (affects the opposite olive) or red nucleus / central tegmental tract (same side), the deafferented olive may degenerate and enlarge — how often is not known: a prospective MRI study of 15 patients saw it in 38–67%, depending on sequence and rater. On MRI the T2 signal rises from about 1 month (and stays for years), the olive enlarges from about 6 months and this resolves by 3–4 years, followed by shrinkage. A minority develop a palatal tremor weeks to months later (more often after haemorrhage than infarction).',
        },
        regions: hod,
      });
    }
    // secondary thalamic degeneration after large cortical infarcts
    const cortexVol = BEDS.filter((b) => b.region.endsWith(`_${s}`) && REGION_BY_ID[b.region].category === 'cortex').reduce(
      (a, b) => a + (bedFinal[b.id] ?? 0) * b.volume,
      0,
    );
    if (cortexVol >= 30) {
      const thal = BEDS.filter((b) => /^thalamus_/.test(b.region) && b.region.endsWith(`_${s}`) && stillAlive(bedFinalUntreated[b.id]));
      thal.forEach((b) => addEffect(b.id, { kind: 'degeneration', onsetH: 1440, event: `thalamic_atrophy_${s}` }));
      events.push({
        id: `thalamic_atrophy_${s}`,
        kind: 'secondary',
        severity: 'info',
        onsetH: 1440,
        title: { zh: '同側視丘的續發性萎縮', en: 'Secondary ipsilateral thalamic atrophy' },
        desc: {
          zh: '視丘與皮質互相連結；大片皮質梗塞後，失去連結的視丘神經元逐漸凋亡，數月後同側視丘縮小，與認知功能下降有關。',
          en: 'The thalamus and cortex are reciprocally connected; after a large cortical infarct the disconnected thalamic neurons gradually die and the same-side thalamus shrinks over months, which is linked to cognitive decline.',
        },
        regions: [...new Set(thal.map((b) => b.region))],
      });
    }
  }

  // ── 8. subacute / chronic course ──────────────────────────────
  if (vol.total >= 1) {
    events.push({
      id: 'subacute_remodelling',
      kind: 'imaging',
      severity: 'info',
      onsetH: 168,
      endH: 720,
      title: { zh: '亞急性期：清除壞死組織', en: 'Subacute phase: clearing dead tissue' },
      desc: {
        zh: '巨噬細胞清除壞死組織，新生血管長入（CT 上梗塞在 2–3 週時可能暫時「變淡」，稱為起霧效應）。水腫消退後，許多功能障礙會部分改善。MRI 上梗塞並不消失：擴散係數（ADC）第一週偏低、第二週「假性正常化」、之後高於正常；DWI 影像因 T2 透射效應仍偏亮、在數週內慢慢變淡，T2／FLAIR 則一直是亮的。',
        en: 'Macrophages clear the necrotic tissue and new vessels grow in (on CT the infarct may transiently fade at 2–3 weeks — the "fogging effect"). As oedema settles many deficits partly improve. On MRI the infarct does not disappear: the apparent diffusion coefficient (ADC) is low in week 1, pseudonormal in week 2 and raised afterwards, while the DWI image stays bright from T2 shine-through and fades only over weeks, and T2/FLAIR stays bright.',
      },
      regions: infarctedRegions,
    });
    events.push({
      id: 'chronic_scar',
      kind: 'imaging',
      severity: 'info',
      onsetH: 720,
      title: { zh: '慢性期：腦軟化與膠質疤痕', en: 'Chronic phase: encephalomalacia & gliosis' },
      desc: {
        zh: '壞死組織被液化吸收，留下充滿腦脊髓液的空腔與膠質疤痕，鄰近腦室會被「拉」大。MRI 上慢性梗塞在 T2 是亮的；FLAIR 上空腔和腦脊髓液一樣暗，周圍膠質增生的邊緣則是亮的。',
        en: 'The necrotic tissue liquefies and is resorbed, leaving a CSF-filled cavity and glial scar; the adjacent ventricle is pulled larger. On MRI the chronic infarct is bright on T2; on FLAIR the cavity is dark like CSF, with a bright rim of gliosis.',
      },
      regions: infarctedRegions,
    });
    events.push({
      id: 'depression_cognition',
      kind: 'complication',
      severity: 'info',
      onsetH: 720,
      title: { zh: '中風後憂鬱與認知障礙', en: 'Post-stroke depression & cognitive impairment' },
      // lesion site: Carson 2000 tested the hemisphere and left-anterior hypotheses only (C10-F10);
      // depressive symptoms and right amygdala / pallidum infarcts (Weaver NA et al. Biol
      // Psychiatry Cogn Neurosci Neuroimaging 2023;8:387-396, PMID 34547548); cognitive impairment
      // and left frontotemporal, left thalamic and right parietal infarcts in 2950 patients from 12
      // cohorts (Weaver NA et al. Lancet Neurol 2021;20:448-459, PMID 33901427) — in place of an
      // uncited list of "strategic" sites (C10-F9)
      desc: {
        zh: '任一時間點約三分之一的中風者有憂鬱（統合分析 31%），5 年內累積有 39–52% 出現過。系統性回顧沒有找到一致的左右半球或左額葉效應（Carson 2000）；一個大型病灶定位研究則發現右側杏仁核與蒼白球的梗塞與憂鬱症狀有關（Weaver 2023）。中風後第一年約一半有某種認知障礙；12 個世代、2950 人的病灶定位分析中，左側額顳葉、左側視丘與右側頂葉的梗塞關聯最強（Weaver 2021）。首次中風後一年內約 7% 出現失智，再次中風後超過三分之一，多發梗塞也會增加風險。這些是族群數字，「最終」頁有出處與相關因素。',
        en: 'At any time about a third of stroke survivors have depression (31 % in a meta-analysis) and 39–52 % have had it within 5 years. A systematic review found no consistent hemispheric or left-frontal effect (Carson 2000); one large lesion-mapping study links depressive symptoms to infarcts of the right amygdala and pallidum (Weaver 2023). About half have some cognitive impairment in the first year; in a lesion-mapping analysis of 2950 patients from 12 cohorts, infarcts of the left frontotemporal lobes, left thalamus and right parietal lobe were the most strongly associated with it (Weaver 2021). About 7 % develop dementia within a year of a first stroke, more than a third after a recurrent one, and multiple infarcts raise the risk. These are population figures — the Outcome tab lists their sources and the factors involved.',
      },
      regions: [],
    });
    events.push({
      id: 'recovery',
      kind: 'recovery',
      severity: 'good',
      onsetH: 168,
      endH: 4320,
      title: { zh: '神經可塑性與復原', en: 'Neuroplasticity & recovery' },
      desc: {
        zh: `${fatalRisk.size || survival.size ? (fatalRisk.has('herniation') ? '假如病人存活（未減壓時是少數）：' : '假如病人存活：') : ''}周圍與對側的腦區會重新分工，大部分自發性恢復發生在前 3 個月，之後仍可透過密集復健緩慢進步。死掉的神經元不會再生，恢復靠的是「重新接線」。`,
        en: `${fatalRisk.size || survival.size ? (fatalRisk.has('herniation') ? 'If the patient survives (a minority without decompression): s' : 'If the patient survives: s') : 'S'}urrounding and opposite-side regions take over functions; most spontaneous recovery happens in the first 3 months, with slower gains from intensive rehabilitation afterwards. Dead neurons do not regrow — recovery is re-wiring.`,
      },
      regions: [],
    });
  }

  // ── 8b. blood pressure ────────────────────────────────────────
  // IST: Leonardi-Bee J et al. Stroke 2002;33:1315–1320 (associations in 17,398 patients);
  // thrombolysis limits: Sandset EC et al. 2025 update to the ESO guideline on blood pressure
  // management, Eur Stroke J 2026;11:aakag004; induced hypertension: Bang OY et al. Neurology
  // 2019;93:e1955–e1963 (n = 153, Class III); ENCHANTED2/MT: Yang P et al. Lancet 2022;400:1585–1596
  if (input.map !== undefined && input.map >= HIGH_MAP && (brainStory || lacunarOnly)) {
    events.push({
      id: 'high_blood_pressure',
      kind: 'treatment',
      severity: 'warn',
      onsetH: 0,
      endH: 336,
      title: { zh: '急性期血壓偏高', en: 'High blood pressure in the acute phase' },
      desc: {
        zh: '平均動脈壓 120 mmHg 以上，約相當於 170/95 mmHg 或更高。國際中風試驗（IST）的 17,398 名病人中，收縮壓與早期死亡呈 U 型關係，約 150 mmHg 時最低：血壓高時，兩週內中風復發（每高 10 mmHg 增加 4.2%）與疑似腦水腫造成的死亡較多，血壓則與症狀性出血無關；血壓低時，嚴重中風與心臟病死亡較多。這些是相關，不能證明降壓有益。血栓溶解前血壓須低於 185/110 mmHg，溶栓或取栓期間與之後 24 小時維持低於 180/105 mmHg（歐洲中風組織 ESO 2025）。本模型裡血壓越高，只會把更多血推過側枝、讓梗塞變小——這是模型的假設：用藥物升壓只在小型試驗中測試過（一個 153 人的隨機試驗，對象是非心因性栓塞、不適合再灌流治療的病人），ESO 也不建議對沒有接受再灌流治療的病人常規使用升壓藥；成功取栓後把收縮壓壓到 120 mmHg 以下，預後反而較差（ENCHANTED2/MT）。',
        en: 'A mean arterial pressure of 120 mmHg or more corresponds to roughly 170/95 mmHg or higher. In 17,398 patients of the International Stroke Trial (IST), the relation of systolic pressure to early death was U-shaped, lowest around 150 mmHg: with high pressure, recurrent stroke within two weeks (+4.2% per 10 mmHg) and death from presumed brain oedema were more common, and the pressure was not related to symptomatic haemorrhage; with low pressure, severe strokes and cardiac deaths were more common. These are associations, not proof that lowering the pressure helps. Before thrombolysis the pressure must be below 185/110 mmHg, and it is kept below 180/105 mmHg during and for 24 h after thrombolysis or thrombectomy (European Stroke Organisation, ESO 2025). In this model a higher pressure only pushes more blood through the collaterals and shrinks the infarct: that is a model assumption. Raising the pressure with drugs has been tested in small trials only (one randomised trial of 153 patients with non-cardioembolic stroke who were not eligible for reperfusion), and the ESO discourages routine vasopressors in patients not treated with reperfusion; after successful thrombectomy, lowering systolic pressure below 120 mmHg led to worse outcome (ENCHANTED2/MT).',
      },
      regions: [],
    });
  }

  // ── 8c. late consequences that follow their symptoms (C10-F1, F2, F3, F7) ───
  // shown exactly when the late symptom is (same regions, thresholds and onset), small brainstem
  // infarcts and lacunes included
  const bodySide = (r: Region, lat: 'ipsi' | 'contra'): Side => (lat === 'ipsi' ? (r.side as Side) : opp(r.side as Side));
  const spast = lateSources('spasticity');
  if (spast.length) {
    events.push({
      id: 'spasticity',
      kind: 'complication',
      severity: 'info',
      onsetH: symptomOnsetH(SYMPTOM_BY_ID.spasticity),
      title: { zh: '痙攣與攣縮', en: 'Spasticity & contractures' },
      // Sommerfeld 2004 (19 % at 3 months), Urban 2010 (42.6 % with a paresis at 6 months, 15.6 %
      // severe; severe paresis and hemihypesthesia predict it), Wissel 2010 (24.5 % within 2 weeks)
      desc: {
        zh: '上運動神經元受損後，脊髓反射失去抑制，數週到數月逐漸出現肌肉僵硬、手肘手腕屈曲、足下垂；復健與肉毒桿菌注射可改善。不是每個人都會：中風後 3 個月約 19%，有肢體無力的人 6 個月時約 43%（嚴重的約 16%）；早期無力嚴重或半身感覺減退時較常見，約四分之一在 2 週內就出現肌張力增加。',
        en: 'Loss of upper-motor-neuron control releases spinal reflexes: over weeks to months stiffness, a flexed elbow/wrist and foot drop develop; rehabilitation and botulinum toxin help. Not everyone gets it: about 19 % of people 3 months after a stroke, and about 43 % of those with a weak limb at 6 months (severe in about 16 %); it is commoner after severe early weakness or loss of sensation, and about a quarter show increased tone within 2 weeks.',
      },
      regions: spast.map((r) => r.id),
    });
  }
  const painBody = lateSources('central_pain');
  const painFace = lateSources('central_pain_face');
  if (painBody.length || painFace.length) {
    const zhSide = (s: Side) => (s === 'r' ? '右' : '左');
    const enSide = (s: Side) => (s === 'r' ? 'right' : 'left');
    const thal = painBody.filter((r) => r.baseId === 'thalamus_ventrolateral');
    const lmi = [...new Set([...painBody, ...painFace].filter((r) => r.baseId === 'medulla_lateral'))];
    const other = painBody.filter((r) => r.baseId !== 'thalamus_ventrolateral' && r.baseId !== 'medulla_lateral');
    const zh: string[] = ['感覺路徑受損後，原本麻木的地方可能出現燒灼、刺痛或一碰就痛的慢性疼痛。這是可能的後果，不是必然：所有中風合計一年內約 8%。'];
    const en: string[] = ['After sensory pathway damage, the numb area can develop burning, lancinating or touch-evoked chronic pain. It is possible, not certain: about 8 % of all strokes within a year.'];
    for (const r of thal) {
      const b = bodySide(r, 'contra');
      zh.push(`視丘中風後約七分之一、視丘膝狀體動脈區中風後約四分之一會出現，在身體的對側（這裡是身體的${zhSide(b)}側）；已發表的病例中右側視丘病灶較多（可能有報告偏差），約三分之一在第一週就開始。`);
      en.push(`After a thalamic stroke about 1 in 7 develop it (about 1 in 4 after the geniculothalamic territory), on the opposite side of the body — here the ${enSide(b)} side of the body; among published cases right-sided thalamic lesions are more frequent (possibly reporting bias), and about a third start in the first week.`);
    }
    for (const r of lmi) {
      const s0 = r.side as Side;
      zh.push(`延髓外側梗塞後約四分之一在 6 個月內出現，最常在病灶同側（這裡是${zhSide(s0)}側）的眼睛周圍，可以單獨出現，也可以合併對側（${zhSide(opp(s0))}側）手腳的疼痛。`);
      en.push(`After a lateral medullary infarct about 1 in 4 develop it within 6 months, most often around the eye on the side of the infarct (here the ${enSide(s0)}), alone or with pain in the opposite (${enSide(opp(s0))}) arm and leg.`);
    }
    for (const r of other) {
      const b = bodySide(r, 'contra');
      zh.push(`這個病灶的疼痛會在身體的對側（這裡是身體的${zhSide(b)}側）。`);
      en.push(`From this lesion it would affect the opposite side of the body — here the ${enSide(b)} side of the body.`);
    }
    zh.push('後島葉與頂葉島蓋內側的病灶也可能造成中樞性疼痛，但很少見（模型沒有把它列為症狀）。');
    en.push('Lesions of the posterior insula and inner parietal operculum can also cause central pain, rarely (not listed as a symptom by the model).');
    events.push({
      id: 'central_pain',
      kind: 'complication',
      severity: 'warn',
      onsetH: symptomOnsetH(SYMPTOM_BY_ID.central_pain),
      title: { zh: '可能出現的中樞性中風後疼痛', en: 'Possible central post-stroke pain' },
      desc: { zh: zh.join(''), en: en.join(' ') },
      regions: [...new Set([...painBody, ...painFace].map((r) => r.id))],
    });
  }
  // REM sleep behaviour disorder (C10-F7): 6 of 27 brainstem infarcts on a questionnaire at 3
  // months, 5 ventral pontine and 1 medullary, none tegmental (Tang WK et al. BMC Neurol 2014;14:88,
  // PMID 24758223); not confirmed on polysomnography in 15 brainstem strokes (Tellenbach N et al. J
  // Sleep Res 2023;32:e13640, PMID 35609965); lesion network mapping: the tract from the locus
  // coeruleus to the medulla (Odd H et al. Neuroimage Clin 2025;45:103751, PMID 39954565); case
  // reports describe pontine lesions (Kimura K et al. Neurology 2000;55:894-895; Xi Z, Luning W.
  // Sleep Med 2009;10:143-146). So any
  // pontine or medullary infarct, as a possibility from about 1 month (the study asked at 3 months).
  // Not after extensive damage to the tegmentum of both sides, which leaves a disorder of
  // consciousness from two weeks on (C3-F2, the same threshold): acting out dreams, and telling of
  // them, needs a person who is awake between them.
  const rbd = REGIONS.filter((r) => /^(pons|medulla)_/.test(r.baseId) && finalLevel(r.id) >= 0.25 - 1e-6);
  if (rbd.length && !persistentDoc) {
    events.push({
      id: 'rbd',
      kind: 'complication',
      severity: 'info',
      onsetH: 720,
      title: { zh: '可能出現：快速動眼期睡眠行為障礙（夢境演出）', en: 'Possible REM sleep behaviour disorder (acting out dreams)' },
      desc: {
        zh: '做夢（快速動眼期）時，肌肉本該被一條從橋腦藍斑核一帶延伸到延髓的路徑關掉；這條路徑受損時，人可能在夢中說話、大叫、揮拳或踢腳，傷到自己或枕邊人。一項問卷研究中，腦幹梗塞的人 3 個月時約五分之一（27 人中 6 人）描述這種情形——5 人是橋腦腹側、1 人是延髓，橋腦被蓋部沒有；但一個小型的睡眠檢查（多項睡眠生理檢查）研究（15 位腦幹中風）沒有證實，反而看到快速動眼期的肌肉活動較少。病灶網路分析指向從藍斑核到延髓的路徑。這裡列出的是可能，不是預測。',
        en: 'During dreaming (REM) sleep the muscles are normally switched off by a pathway that runs from around the locus coeruleus in the pons down to the medulla; when it is damaged the person may talk, shout, punch or kick while dreaming and hurt themselves or a bed partner. In a questionnaire study about 1 in 5 people with a brainstem infarct (6 of 27) reported acting out dreams at 3 months — 5 with a ventral pontine and 1 with a medullary infarct, none in the pontine tegmentum; a small sleep-laboratory (polysomnography) study of 15 brainstem strokes did not confirm it, finding less muscle activity in REM sleep instead. Lesion-network mapping points to the tract from the locus coeruleus to the medulla. Listed as a possibility, not a prediction.',
      },
      regions: rbd.map((r) => r.id),
    });
  }

  // ── 9. flow redistribution notes ──────────────────────────────
  // subclavian steal: basilar flow at rest (Harper C et al. J Vasc Surg 2008;48:859–864) and
  // symptoms by arm pressure difference (Labropoulos N et al. Ann Surg 2010;252:166–170); the
  // phenomenon (reversed vertebral flow) and the syndrome (with symptoms) told apart (Osiro S et al.
  // Med Sci Monit 2012;18:RA57-63; Y3-10)
  const rev = hemo.reversed;
  if (rev.some((v) => v.startsWith('va_'))) {
    events.push({
      id: 'steal',
      kind: 'mechanism',
      severity: 'warn',
      onsetH: 0,
      title: { zh: '血流反轉：竊血現象', en: 'Flow reversal: steal' },
      desc: {
        zh: '椎動脈血流倒流去供應手臂（鎖骨下竊血「現象」；有症狀時才稱為竊血「症候群」）。超音波上很常見，多半沒有症狀：手臂也能經胸壁與頸部的側枝得到血液，基底動脈通常仍由另一側椎動脈供應、維持順向。兩手血壓差超過 40–50 mmHg 時較常出現症狀——手臂用力時後循環血流被「偷走」而頭暈、視力模糊、走不穩，或手臂痠痛無力。',
        en: 'Vertebral flow reverses to feed the arm (the subclavian steal phenomenon; only with symptoms is it called the subclavian steal syndrome). It is common on ultrasound and usually without symptoms: the arm is also fed through chest-wall and neck collaterals, and the basilar artery usually keeps flowing forwards, fed by the other vertebral artery. Symptoms are more frequent when the arm pressures differ by more than 40–50 mmHg: exercising that arm "steals" posterior-circulation blood, causing dizziness, blurred vision or unsteadiness, or the arm itself tires and aches.',
      },
      regions: [],
    });
  }
  // the circle of Willis carries blood into the territory beyond the occlusions (U2-5): only from
  // an occlusion before or within the circle, by the routes that actually carry it, and said to
  // fall short where that territory still infarcts. A reversed communicating artery alone said
  // nothing: on the right it reversed with an M1, M2 or A2 occlusion, beyond the circle, and on
  // the left it never did
  const circle = circleRoutes(hemo, input.occlusions);
  if (circle.routes.length) {
    let shortMl = 0;
    for (const b of BEDS) {
      if (REGION_BY_ID[b.region].compartment === 'none') continue;
      // (a bed that the territory supplies in part counts whole: its infarct comes from what that part lost)
      if (b.supply.some((x) => circle.beyond.has(x.v))) shortMl += (bedFinal[b.id] ?? 0) * b.volume;
    }
    // … and said to fall short where that territory is out of action while the artery is closed,
    // though nothing infarcts (T2-4): a carotid T or a basilar artery closed for five minutes gave a
    // complete MCA syndrome or a locked-in picture beside a green "enough to prevent an infarct ...
    // can cause no symptoms at all"; nothing infarcted because the attack was short, not because of
    // the circle (which cannot reach the MCA behind a carotid T at all). A region of that territory
    // at the symptom threshold at onset (0.25) is out of action
    const failed =
      shortMl < 1 &&
      REGIONS.some(
        (r) =>
          STORY_TISSUE.has(r.category) &&
          (regionAcute[r.id] ?? 0) >= 0.25 - 1e-6 &&
          r.beds.some((bid) => BED_BY_ID[bid]?.supply.some((x) => circle.beyond.has(x.v))),
      );
    // (while it is closed: the event ends when the artery reopens, and the story of the attack, or of
    // the reopening, tells what follows)
    const reopens = failed ? input.reopensH ?? input.flowReturnsH ?? null : null;
    const both = circle.pcommCount > 1;
    const ROUTE: Record<CircleRoute, L> = {
      acomm: { zh: '前交通動脈（從對側）', en: 'through the anterior communicating artery (from the other side)' },
      pcomm: { zh: both ? '兩側後交通動脈' : '後交通動脈', en: both ? 'through both posterior communicating arteries' : 'through the posterior communicating artery' },
      ophthalmic: { zh: '眼動脈逆流（從外頸動脈）', en: 'backwards through the ophthalmic artery (from the external carotid)' },
    };
    const names = circle.routes.map((r) => ROUTE[r]);
    const en = names.length === 1 ? names[0].en : `${names.slice(0, -1).map((x) => x.en).join(', ')} and ${names[names.length - 1].en}`;
    const short = shortMl >= 1;
    const ml = Math.round(shortMl);
    events.push({
      id: 'willis_compensation',
      kind: 'mechanism',
      severity: short || failed ? 'info' : 'good',
      onsetH: 0,
      ...(reopens !== null && reopens > 0 ? { endH: reopens } : {}),
      title: { zh: 'Willis 環側枝代償啟動', en: 'Circle of Willis collaterals switched on' },
      desc: {
        zh:
          `血液改走${names.map((x) => x.zh).join('、')}，送進阻塞之後的血管，從其他動脈「借血」。` +
          (short
            ? `但這裡還不夠：這些血管的供血區仍有約 ${ml} mL 梗塞，是這些通道補不足或到不了的地方。`
            : failed
              ? reopens !== null
                ? '但這裡還不夠讓這些血管的供血區在動脈阻塞時維持運作：症狀就來自那裡，是這些通道補不足或到不了的地方。'
                : '但這裡還不夠讓這些血管的供血區維持運作：症狀就來自那裡，是這些通道補不足或到不了的地方。'
              : '這裡足以避免梗塞：這就是為什麼 Willis 環之前或環上的狹窄或阻塞（甚至整條頸動脈阻塞），可能完全沒有症狀。'),
        en:
          `Blood reroutes ${en} into the arteries beyond the blockage, borrowing from other trunks.` +
          (short
            ? ` Here it is not enough: about ${ml} mL of their territory still infarcts, where these routes fall short or cannot reach.`
            : failed
              ? reopens !== null
                ? ' Here it is not enough to keep their territory working while the artery is closed: the deficits come from there, where these routes fall short or cannot reach.'
                : ' Here it is not enough to keep their territory working: the deficits come from there, where these routes fall short or cannot reach.'
              : ' Here it is enough to prevent an infarct: this is why a narrowing or an occlusion before or within the circle, even of a whole carotid artery, can cause no symptoms at all.'),
      },
      regions: [],
    });
  }

  // tissue that dies later from herniation / compression of other arteries (permanent effects)
  let secondaryLoss = 0;
  // … per side of the herniation that causes it (the event ids end in the side; a central
  // herniation's are those of the hemisphere it compresses)
  const secondaryBySide: Record<Side, number> = { r: 0, l: 0 };
  for (const b of BEDS) {
    if (REGION_BY_ID[b.region].compartment === 'none') continue;
    const lasting = (bedEffects[b.id] ?? []).filter((e) => e.kind === 'secondary' && e.endH === undefined);
    if (!lasting.length) continue;
    const ml = (1 - (bedFinal[b.id] ?? 0)) * b.volume;
    secondaryLoss += ml;
    const side = /_(r|l)$/.exec(lasting[0].event)?.[1] ?? REGION_BY_ID[b.region].side;
    if (side === 'r' || side === 'l') secondaryBySide[side] += ml;
  }
  withVolumes.forEach((write) => write(vol.total + secondaryLoss, secondaryBySide));
  // what had begun of the swelling course when the last occlusion began stays as it was (U1-2, U1-14)
  if (input.prior) events.splice(0, events.length, ...keepTheBegun(events, input.prior));
  // what the treatment spares in the end, the herniation infarcts it prevents included (V1-6)
  if (input.untreatedWithSecondary !== undefined) {
    savedVolume = Math.max(0, input.untreatedWithSecondary - (vol.total + secondaryLoss));
    savedSecondary = Math.max(0, savedVolume - savedPrimary);
  }
  // what an artery reopening by itself saved, against the same case had it stayed closed (U2-10)
  const spontaneousAt = spontaneousEv ? events.indexOf(spontaneousEv) : -1;
  let spontaneousOut: CascadeOutput['spontaneous'] = null;
  if (spontaneousAt >= 0 && input.spontaneous) {
    const sp = input.spontaneous;
    const savedSelf = Math.max(0, sp.stayedClosed.withSecondary - (vol.total + secondaryLoss));
    const savedSelfSecondary = Math.max(0, savedSelf - Math.max(0, sp.stayedClosed.total - vol.total));
    events[spontaneousAt] = spontaneousEvent(sp, savedSelf, savedSelfSecondary);
    spontaneousOut = { atH: sp.atH, saved: savedSelf, savedSecondary: savedSelfSecondary };
  }
  // what the treatment avoided, now that this course's own fatal risks and what it saves are known (Z2-3)
  if (reperfusion)
    events[reperfusion.at] = input.reperfusionOutcome
      ? reperfusion.make(
          input.reperfusionOutcome.untreatedFatal.filter((k) => !fatalRisk.has(k)),
          fatalRisk.size > 0,
        )
      : reperfusion.make([], false);
  events.sort((a, b) => a.onsetH - b.onsetH);

  // Both hemispheres destroyed (Z3-12): two-thirds or more of each hemisphere's supratentorial
  // tissue infarcted in the end, with the secondary infarcts of a herniation. Awareness needs the
  // cerebral hemispheres and their connections with the thalamus: in 49 patients who remained
  // vegetative until death after an acute brain insult, every brain had profound damage to the
  // subcortical white matter or the thalamic relay nuclei, which leaves any intact cortex unable to
  // function (Adams JH, Graham DI, Jennett B. Brain 2000;123:1327-1338, PMID 10869046); recovery
  // from a non-traumatic persistent vegetative state after 3 months is exceedingly rare, and life
  // expectancy is mostly 2-5 years (Multi-Society Task Force on PVS. N Engl J Med
  // 1994;330:1499-1508, PMID 7818633). So a survivor wakes from the coma (eyes open, sleep-wake
  // cycles) into a disorder of consciousness, not into an alert patient: listed from two weeks after
  // the newer of the two hemispheres' lesions, when a coma gives way to what follows it (as the
  // brainstem coma does, clinical.comaBecomes), and scored as unresponsive (NIHSS 1a = 3: "responds
  // only with reflex motor or autonomic effects"). The threshold is a model choice: no series gives
  // the extent.
  // So does a survivor of both MCA territories mostly infarcted, two-thirds or more of each, with or
  // without a herniation's infarcts (U1-4: both M1 arteries infarcted both MCA territories almost
  // entirely, and when their herniation, central, added no secondary infarct, the survivor woke
  // fully alert with both complete MCA syndromes, while one hemisphere herniating to its side added
  // enough to destroy both hemispheres). The MCA supplies much of the deep white matter of the
  // hemisphere (the corona radiata, by its medullary branches) and of the internal capsule (by the
  // lenticulostriate arteries), through which the cortex and the thalamus are connected: the damage
  // Adams found in every vegetative brain. The same two-thirds, a model choice.
  const hemiMl: Record<Side, number> = { r: 0, l: 0 };
  const hemiDead: Record<Side, number> = { r: 0, l: 0 };
  const mcaMl: Record<Side, number> = { r: 0, l: 0 };
  const mcaDead: Record<Side, number> = { r: 0, l: 0 };
  let anySecondary = false;
  for (const b of BEDS) {
    const reg = REGION_BY_ID[b.region];
    if (reg.compartment !== 'supra' || reg.side === 'm') continue;
    hemiMl[reg.side] += b.volume;
    const secondary = (bedEffects[b.id] ?? []).some((e) => e.kind === 'secondary' && e.endH === undefined);
    anySecondary ||= secondary;
    const dead = secondary ? 1 : bedFinal[b.id] ?? 0;
    hemiDead[reg.side] += dead * b.volume;
    const mca = mcaShareOf(b);
    mcaMl[reg.side] += mca * b.volume;
    mcaDead[reg.side] += mca * dead * b.volume;
  }
  const share = (sd: Side) => hemiDead[sd] / (hemiMl[sd] || 1);
  const mcaShare = (sd: Side) => mcaDead[sd] / (mcaMl[sd] || 1);
  const destroyed = (sd: Side) => share(sd) >= HEMISPHERES_DESTROYED || mcaShare(sd) >= HEMISPHERES_DESTROYED;
  if (destroyed('r') && destroyed('l')) {
    survival.add('bilateral_hemispheres');
    const newer = Math.max(sideOnset('r'), sideOnset('l'));
    const pr = Math.round(100 * share('r'));
    const pl = Math.round(100 * share('l'));
    // (both hemispheres two-thirds infarcted, or else both MCA territories: U1-4)
    const whole = share('r') >= HEMISPHERES_DESTROYED && share('l') >= HEMISPHERES_DESTROYED;
    const mr = Math.round(100 * mcaShare('r'));
    const ml = Math.round(100 * mcaShare('l'));
    const mcaNote: L = whole
      ? { zh: '', en: '' }
      : {
          zh: `；兩側的中大腦動脈區分別約 ${mr}% 與 ${ml}% 梗塞，大腦半球深部的白質（放射冠）與內囊有很大一部分由中大腦動脈供應，皮質和視丘之間的連結就經過這裡`,
          en: `, and about ${mr}% and ${ml}% of their MCA territories; the MCA supplies much of the deep white matter of the hemisphere (the corona radiata) and of the internal capsule, through which the cortex and the thalamus are connected`,
        };
    events.push({
      id: 'hemispheres_destroyed',
      kind: 'secondary',
      severity: 'danger',
      onsetH: newer + DELAYED_ONSET_H,
      title: whole
        ? { zh: '兩側大腦半球大多梗塞：意識障礙', en: 'Both hemispheres mostly infarcted: a disorder of consciousness' }
        : { zh: '兩側中大腦動脈區大多梗塞：意識障礙', en: 'Most of both MCA territories infarcted: a disorder of consciousness' },
      desc: {
        zh: `右側大腦半球約 ${pr}%、左側約 ${pl}% 梗塞（有疝脫時包括它造成的續發梗塞）${mcaNote.zh}。覺察需要大腦半球，以及它們和視丘之間的連結：49 位在急性腦損傷後直到死亡都處於植物人狀態的病人，每一位的大腦半球白質或視丘中繼核都嚴重受損，讓仍完好的皮質也無法運作（Adams 2000）。兩側大腦半球都這樣受損的存活者，昏迷結束後會睜眼、有睡醒週期，卻沒有覺察——無反應覺醒症候群（舊稱植物人狀態）——最好也只是最小意識狀態；非外傷造成的植物人狀態超過 3 個月後恢復極為罕見，多數病人的餘命約 2–5 年（Multi-Society Task Force 1994）。模型在兩次病灶中較晚的那次發生兩週後（昏迷通常在這時轉為後續的狀態）列出意識障礙，NIHSS 以只有反射反應的病人計分（1a = 3）。以每側三分之二以上${whole ? '' : '（大腦半球，或中大腦動脈區）'}梗塞為界，是模型的選擇：沒有研究依梗塞範圍給出數字。`,
        en: `About ${pr}% of the right and ${pl}% of the left hemisphere are infarcted (with the secondary infarcts of a herniation, if any)${mcaNote.en}. Awareness needs the cerebral hemispheres and their connections with the thalamus: in 49 patients who remained vegetative until death after an acute brain insult, every brain had profound damage to the white matter of the hemispheres or to the relay nuclei of the thalamus, which leaves any cortex still intact unable to function (Adams 2000). A survivor of such a loss of both hemispheres opens the eyes and has sleep–wake cycles once the coma ends, but stays without awareness — the unresponsive wakefulness (vegetative) state — or at best in a minimally conscious state; recovery from a vegetative state of non-traumatic cause after 3 months is exceedingly rare, and life expectancy is mostly 2–5 years (Multi-Society Task Force 1994). The model lists a disorder of consciousness from two weeks after the newer of the two lesions, when a coma gives way to what follows it, and scores the NIHSS as for a patient who responds only with reflexes (1a = 3). The threshold, two-thirds of each hemisphere${whole ? '' : ' (or of each MCA territory)'} infarcted, is a model choice: no series gives the extent.`,
      },
      regions: [],
      symptoms: [{ id: 'disorder_of_consciousness', side: null, sev: 3 }],
    });
    // the herniation's figures are those of one hemisphere: both get their own note
    const hf = events.find((e) => e.id.startsWith('herniation_fatal_'));
    // (a central herniation adds no secondary infarct when neither hemisphere would herniate on its own: V1-4, U1-0)
    const withSec = anySecondary;
    const extent: L = whole
      ? {
          zh: `兩側大腦半球幾乎整個梗塞（右側約 ${pr}%、左側約 ${pl}%${withSec ? '，包括疝脫造成的續發梗塞' : ''}）`,
          en: `Both hemispheres are infarcted almost entirely (about ${pr}% of the right and ${pl}% of the left${withSec ? ', with the secondary infarcts of the herniation' : ''})`,
        }
      : {
          zh: `兩側中大腦動脈區大多梗塞（右側約 ${mr}%、左側約 ${ml}%；大腦半球分別約 ${pr}% 與 ${pl}%${withSec ? '，包括疝脫造成的續發梗塞' : ''}）`,
          en: `Most of both MCA territories is infarcted (about ${mr}% of the right and ${ml}% of the left; ${pr}% and ${pl}% of the hemispheres${withSec ? ', with the secondary infarcts of the herniation' : ''})`,
        };
    const see: L = whole ? { zh: '兩側大腦半球大多梗塞', en: 'Both hemispheres mostly infarcted' } : { zh: '兩側中大腦動脈區大多梗塞', en: 'Most of both MCA territories infarcted' };
    if (hf)
      hf.desc = {
        zh: `${extent.zh}，又沒有減壓：死亡是通常的結局。單側完整中大腦動脈區梗塞的數字——55 位病人中 78% 因疝脫與腦死而死亡（Hacke 1996）、未手術的一年存活率 29%（Vahedi 2007）——講的是一側，不是兩側；兩側中大腦動脈同時梗塞通常後果嚴重（一篇病例報告與文獻回顧）。兩側大腦半球都被破壞的存活者不會恢復覺察，會停留在植物人狀態，最好也只是最小意識狀態（見「${see.zh}」）。模型不模擬死亡：之後的病程、3 個月與 6 個月的 NIHSS，都是這樣一位存活者的情況。`,
        en: `${extent.en}, without decompression: death is the usual end. The figures for complete MCA-territory infarction of one hemisphere — 43 of 55 patients (78%) died of herniation and brain death (Hacke 1996), and 1-year survival without surgery was 29% (Vahedi 2007) — describe one hemisphere, not both; simultaneous infarction of both MCA territories is usually devastating (a case report and a review of the literature). A survivor of the destruction of both hemispheres does not regain awareness: he or she stays in a vegetative or at best a minimally conscious state (see "${see.en}"). The model does not represent death: the rest of the course and the 3- and 6-month NIHSS show such a survivor.`,
      };
    // the drowsiness of the first two weeks gives way to it
    const bh = events.find((e) => e.id === 'bilateral_hemispheres');
    if (bh)
      bh.desc = {
        zh: `${bh.desc.zh}這裡兩側${whole ? '' : '的中大腦動脈區'}最後都大多梗塞：兩週後改列意識障礙（見「${see.zh}」）。`,
        en: `${bh.desc.en} Here ${whole ? 'both hemispheres end' : 'most of both MCA territories ends'} up ${whole ? 'mostly ' : ''}infarcted: from two weeks on a disorder of consciousness is listed instead (see "${see.en}").`,
      };
    events.sort((a, b) => a.onsetH - b.onsetH);
  }
  return {
    events,
    bedEffects,
    volumes: { ...vol, withSecondary: vol.total + secondaryLoss },
    savedVolume,
    savedSecondary,
    spontaneous: spontaneousOut,
    hydrocephalusOnsetH,
    hydrocephalusEndH,
    fatalRisk: [...fatalRisk],
    survivalCaveat: [...survival].filter((k) => !fatalRisk.size || KEPT_WITH_FATAL.includes(k)),
    herniated: (['r', 'l'] as Side[]).filter((sd) => hern[sd].herniates),
    palatalTremorFromH,
  };
}

export { baseOf, sideOf };
