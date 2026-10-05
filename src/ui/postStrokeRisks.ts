/**
 * The common problems after stroke that the lesion site does not determine (depression, anxiety,
 * fatigue, insomnia, sleep apnoea, apathy, emotionalism, dementia), and the uncommon movement
 * disorders, as the Outcome tab shows them. Pure (no React, no store).
 *
 * They are population figures from systematic reviews, never a prediction for the simulated case:
 * nothing here computes a probability for the case, and every figure shown is the review's own,
 * identical for every case. What may depend on the case:
 *   • whether the list is shown at all — only when the case leaves a brain infarct at the 6-month
 *     stop. The figures come from cohorts of people who had a stroke; a TIA that leaves nothing
 *     (or a course that treatment fully reverses) would get a list that implies a stroke it did
 *     not have. An infarct confined to the retina (central retinal artery occlusion) does not
 *     count either: the reviews studied cerebral strokes. A small infarct without lasting
 *     deficits still counts — it is a stroke;
 *   • a short note that the case has a factor the cited review associates with the problem
 *     (e.g. a moderate-or-worse deficit at 6 months and depression, Ayerbe 2013) — worded as
 *     "is associated with a higher risk", without a number — or, for the movement disorders,
 *     that its infarct involves the sites they arise from.
 */

import { REGION_BY_ID } from '../anatomy';
import type { L, Lang, RegionCategory, SymptomSystem } from '../anatomy';
import { POST_STROKE_RISKS, type PostStrokeRisk } from '../anatomy/postStrokeRisks';
import type { NihssResult } from '../engine/clinical';
import type { SimResult } from '../engine/simulate';
import { FINAL_REGION_MIN } from './finalOutcome';
import { SYSTEM_ORDER, systemOf } from './format';

/** region categories that are brain (not retina, labyrinth, spinal cord or extracranial beds) */
export const BRAIN_CATEGORIES: ReadonlySet<RegionCategory> = new Set<RegionCategory>(['cortex', 'deep', 'brainstem', 'cerebellum']);

/** an infarct of at least this volume (mL) in brain regions counts (the Outcome tab's 0.1-mL display step) */
export const MIN_BRAIN_INFARCT_ML = 0.05;

/** infarcted brain volume (mL) in a simulation */
export function brainInfarctMl(sim: SimResult): number {
  let ml = 0;
  for (const [id, r] of Object.entries(sim.regions)) {
    const reg = REGION_BY_ID[id];
    if (reg && BRAIN_CATEGORIES.has(reg.category)) ml += r.infarct * reg.volume;
  }
  return ml;
}

/** the case leaves a brain infarct at the 6-month stop (see the module comment) */
export function leavesBrainInfarct(m6: SimResult): boolean {
  if (brainInfarctMl(m6) >= MIN_BRAIN_INFARCT_ML) return true;
  return Object.entries(m6.regions).some(([id, r]) => {
    const reg = REGION_BY_ID[id];
    return !!reg && BRAIN_CATEGORIES.has(reg.category) && r.infarct >= FINAL_REGION_MIN;
  });
}

/** "31", "36.3", "4.8": a share as a percentage, at most one decimal, as the sources report it */
export function pctText(v: number): string {
  return (Math.round(v * 1000) / 10).toFixed(1).replace(/\.0$/, '');
}

/** 約 31%（95% CI 28–35%） · about 31 % (95% CI 28–35 %) */
export function formatPrevalence(p: PostStrokeRisk['prevalence'], lang: Lang): string {
  const v = pctText(p.value);
  const ci = p.low !== undefined && p.high !== undefined ? `${pctText(p.low)}–${pctText(p.high)}` : null;
  if (lang === 'en') return ci ? `about ${v} % (95% CI ${ci} %)` : `about ${v} %`;
  return ci ? `約 ${v}%（95% CI ${ci}%）` : `約 ${v}%`;
}

/** NIHSS categories counted as a "moderate or worse" deficit (NIHSS ≥ 5) */
const MODERATE_OR_WORSE: ReadonlySet<NihssResult['category']> = new Set(['moderate', 'moderate_severe', 'severe']);

const hasLastingCognitive = (m6: SimResult) => m6.symptoms.some((s) => systemOf(s.id) === 'cognition');

/** basal ganglia and lateral thalamus (base ids), the sites of post-stroke movement disorders */
const MOVEMENT_SITES = ['putamen', 'globus_pallidus', 'caudate_head', 'caudate_body', 'thalamus_ventrolateral', 'thalamus_posterior'];
/** an infarcted share at which a region counts as part of the infarct (the symptom threshold) */
const DEAD = 0.25;

/**
 * Factors of the case that the risk's own sources associate with it, as sentences without numbers.
 * Only factors a cited source reports are used:
 *   • depression — stroke severity / disability and cognitive impairment (Ayerbe 2013);
 *   • apathy — cognitive impairment, more frequent in people with apathy (Caeiro 2013);
 *   • movement disorders — an infarct of the basal ganglia (Ghika-Schmid 1997) or of the lateral
 *     thalamus (Kim 2001).
 */
export function caseNotes(risk: PostStrokeRisk, m6: SimResult): L[] {
  const out: L[] = [];
  if (risk.id === 'depression') {
    if (MODERATE_OR_WORSE.has(m6.nihss.category))
      out.push({
        zh: '此病例最後仍留有中度以上的神經缺損；中風較嚴重、失能較多，都與較高的中風後憂鬱風險相關。',
        en: 'This case is left with a moderate or worse neurological deficit; greater stroke severity and disability are associated with a higher risk of depression.',
      });
    if (hasLastingCognitive(m6))
      out.push({
        zh: '此病例留下認知方面的缺損；認知障礙與較高的中風後憂鬱風險相關。',
        en: 'This case leaves a cognitive deficit; cognitive impairment is associated with a higher risk of depression.',
      });
  }
  // the lesion sites the movement-disorder sources describe (basal ganglia and adjacent white
  // matter: Ghika-Schmid 1997; the lateral thalamus: Kim 2001)
  if (risk.id === 'movement_disorders' && MOVEMENT_SITES.some((b) => (['r', 'l'] as const).some((s) => (m6.regions[`${b}_${s}`]?.infarct ?? 0) >= DEAD)))
    out.push({
      zh: '此病例的梗塞涉及基底核或外側視丘；這些部位的梗塞與較高的中風後不自主運動風險相關，但它仍不常見，多半會消退。',
      en: 'This case’s infarct involves the basal ganglia or the lateral thalamus; infarcts there are associated with a higher risk of post-stroke movement disorders, which still remain uncommon and mostly regress.',
    });
  if (risk.id === 'apathy' && hasLastingCognitive(m6))
    out.push({
      zh: '此病例留下認知方面的缺損；中風後有冷漠的人較常合併認知障礙。',
      en: 'This case leaves a cognitive deficit; cognitive impairment is more common in people with apathy after stroke.',
    });
  return out;
}

export interface RiskItem {
  risk: PostStrokeRisk;
  notes: L[];
}

export interface RiskGroup {
  system: SymptomSystem;
  items: RiskItem[];
}

/** risks by system in the order the case's symptoms use (SYSTEM_ORDER), in data order within one */
export function groupRisks(risks: PostStrokeRisk[], m6?: SimResult): RiskGroup[] {
  return SYSTEM_ORDER.map((system) => ({
    system,
    items: risks.filter((r) => r.system === system).map((risk) => ({ risk, notes: m6 ? caseNotes(risk, m6) : [] })),
  })).filter((g) => g.items.length > 0);
}

/** What the Outcome tab lists for a case (its simulation at the 6-month stop); [] when not shown. */
export function postStrokeRisksFor(m6: SimResult): RiskGroup[] {
  return leavesBrainInfarct(m6) ? groupRisks(POST_STROKE_RISKS, m6) : [];
}
