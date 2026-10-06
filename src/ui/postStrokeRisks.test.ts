import { beforeEach, describe, expect, it } from 'vitest';
import { POST_STROKE_RISKS, type PostStrokeRisk } from '../anatomy/postStrokeRisks';
import { simulate, type SimResult } from '../engine/simulate';
import { useApp } from '../state/store';
import { systemOf, SYSTEM_ORDER } from './format';
import {
  brainInfarctMl,
  caseNotes,
  formatPrevalence,
  groupRisks,
  leavesBrainInfarct,
  pctText,
  postStrokeRisksFor,
  RISK_GROUP_ORDER,
} from './postStrokeRisks';

/** a scenario (or the current store state) simulated at the 6-month stop */
function at6m(scenario?: string): SimResult {
  const st = useApp.getState();
  st.resetAll();
  if (scenario) st.loadScenario(scenario);
  const s = useApp.getState();
  return simulate({
    occlusions: s.occlusions,
    variants: s.variants,
    map: s.map,
    collateral: s.collateral,
    tH: 4320,
    reperfusionH: s.reperfusionH,
    decompression: s.decompression,
    treatment: s.treatment,
  });
}

const ids = (m6: SimResult) => postStrokeRisksFor(m6).flatMap((g) => g.items.map((i) => i.risk.id));
const risk = (id: string) => POST_STROKE_RISKS.find((r) => r.id === id)!;

beforeEach(() => useApp.getState().resetAll());

describe('when the list is shown', () => {
  it('for an infarct (left M1 at 6 months): every risk, grouped by system', () => {
    const m6 = at6m('l_m1');
    expect(brainInfarctMl(m6)).toBeGreaterThan(10);
    expect(ids(m6).sort()).toEqual(POST_STROKE_RISKS.map((r) => r.id).sort());
  });

  it('for a small infarct too (a lacune is still a stroke)', () => {
    const m6 = at6m('l_lacune');
    expect(leavesBrainInfarct(m6)).toBe(true);
    expect(ids(m6).length).toBe(POST_STROKE_RISKS.length);
  });

  it('not for a TIA that leaves nothing', () => {
    const m6 = at6m('tia_l_mca');
    expect(m6.symptoms).toHaveLength(0);
    expect(brainInfarctMl(m6)).toBeLessThan(0.05);
    expect(postStrokeRisksFor(m6)).toEqual([]);
  });

  it('not for an occlusion without any infarct (silent carotid occlusion)', () => {
    expect(postStrokeRisksFor(at6m('ica_silent'))).toEqual([]);
  });

  it('not for an infarct of the retina alone: the figures come from cerebral strokes', () => {
    const m6 = at6m('amaurosis');
    expect(m6.symptoms.map((s) => s.id)).toContain('monocular_blind');
    expect(postStrokeRisksFor(m6)).toEqual([]);
  });
});

describe('grouping', () => {
  it('follows the order of the systems and keeps every risk once', () => {
    const groups = groupRisks(POST_STROKE_RISKS);
    const order = groups.map((g) => RISK_GROUP_ORDER.indexOf(g.system));
    // the systems of the case's symptoms first, then what belongs to none of them (C10-F4)
    expect(RISK_GROUP_ORDER).toEqual([...SYSTEM_ORDER, 'general']);
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    for (const g of groups) for (const i of g.items) expect(i.risk.system).toBe(g.system);
    expect(groups.flatMap((g) => g.items.map((i) => i.risk.id))).toHaveLength(POST_STROKE_RISKS.length);
  });
});

describe('formatting', () => {
  it('gives the pooled figure and its interval in both languages', () => {
    const p = { value: 0.31, low: 0.28, high: 0.35 };
    expect(formatPrevalence(p, 'zh-TW')).toBe('約 31%（95% CI 28–35%）');
    expect(formatPrevalence(p, 'en')).toBe('about 31 % (95% CI 28–35 %)');
  });

  it('keeps one decimal where the source has one, and no interval when none is given', () => {
    expect(pctText(0.187)).toBe('18.7');
    expect(pctText(0.074)).toBe('7.4');
    expect(pctText(0.1)).toBe('10');
    expect(formatPrevalence({ value: 0.5 }, 'zh-TW')).toBe('約 50%');
    expect(formatPrevalence({ value: 0.5 }, 'en')).toBe('about 50 %');
  });

  it('shows depression as Hackett & Pickles 2014 report it', () => {
    expect(formatPrevalence(risk('depression').prevalence, 'zh-TW')).toBe('約 31%（95% CI 28–35%）');
  });
});

describe('no personalised number', () => {
  it('the figures are the same for every case that shows them', () => {
    const figures = (m6: SimResult) =>
      postStrokeRisksFor(m6).flatMap((g) => g.items.map((i) => [i.risk.id, formatPrevalence(i.risk.prevalence, 'en'), i.risk.prevalence] as const));
    const big = figures(at6m('r_m1_malignant'));
    const small = figures(at6m('l_lacune'));
    expect(big.length).toBeGreaterThan(0);
    expect(big).toEqual(small);
    // and they are the data's own objects, not copies scaled for the case
    for (const g of postStrokeRisksFor(at6m('l_m1'))) for (const i of g.items) expect(i.risk).toBe(risk(i.risk.id));
  });

  it('case notes name a factor from the cited review, never a number', () => {
    const m6 = at6m('l_m1');
    const all = postStrokeRisksFor(m6).flatMap((g) => g.items.flatMap((i) => i.notes));
    expect(all.length).toBeGreaterThan(0);
    for (const n of all) {
      expect(n.zh).not.toMatch(/\d|%/);
      expect(n.en).not.toMatch(/\d|%/);
      expect(n.en).toMatch(/associated with a higher risk|more common in people with/);
    }
  });

  it('notes follow the case: a moderate deficit and a cognitive deficit for depression', () => {
    const m6 = at6m('l_m1');
    expect(['moderate', 'moderate_severe', 'severe']).toContain(m6.nihss.category);
    expect(m6.symptoms.some((s) => systemOf(s.id) === 'cognition')).toBe(true);
    const dep = caseNotes(risk('depression'), m6).map((n) => n.en);
    expect(dep.some((t) => /moderate or worse/.test(t))).toBe(true);
    expect(dep.some((t) => /cognitive deficit/.test(t))).toBe(true);
    // a minor, purely sensory thalamic stroke has neither
    const thal = at6m('l_thalamic');
    expect(thal.nihss.category).toBe('minor');
    expect(caseNotes(risk('depression'), thal)).toEqual([]);
    // risks whose sources name no factor the model has get no note
    for (const id of ['anxiety', 'fatigue', 'insomnia', 'sleep_apnoea', 'dementia'])
      expect(caseNotes(risk(id) as PostStrokeRisk, m6)).toEqual([]);
    // Y3-9: emotionalism gets one when the case lists it as possible, from a site linked to it
    // (the frontal lobe here), so the population figure does not stand beside it unexplained
    expect(m6.symptoms.map((s) => s.id)).toContain('emotionalism');
    expect(caseNotes(risk('emotionalism'), m6).map((n) => n.en)).toEqual([expect.stringMatching(/names it as possible; lesions there are associated with a higher risk/)]);
  });

  // X1-12: memory and initiative cannot be examined in a disorder of consciousness and are not
  // listed then; the cognitive deficit is still there
  it('a disorder of consciousness at 6 months still counts as a lasting cognitive deficit', () => {
    const m6 = at6m('basilar_tip');
    expect(m6.symptoms.map((s) => s.id)).toContain('disorder_of_consciousness');
    for (const id of ['depression', 'apathy'])
      expect(caseNotes(risk(id), m6).some((n) => /cognitive deficit/.test(n.en)), id).toBe(true);
  });
});
