/**
 * W3-8: an infarct of the upper cervical cord (anterior spinal artery territory, C1–C3) is part of
 * what the case shows: it is counted in the infarct volumes (and named apart there), it has its own
 * story in the course of events (not the brain's, nor none at all) and its own label.
 */
import { describe, expect, it } from 'vitest';
import { TIME_STOPS } from '../anatomy/timeline';
import { finalOutcome } from '../ui/finalOutcome';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';
import { NEURONS_PER_ML } from './tissue';

const STOPS = TIME_STOPS.map((s) => s.h);
const input = (occlusions: Occlusion[], collateral: CollateralGrade = 'good'): Omit<SimInput, 'tH'> => ({
  occlusions,
  variants: [],
  collateral,
  map: 93,
  reperfusionH: null,
  decompression: false,
});
const run = (occlusions: Occlusion[], tH: number, collateral: CollateralGrade = 'good') => simulate({ ...input(occlusions, collateral), tH });
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const labels = (r: SimResult) => r.syndromes.map((s) => s.def.id + (s.side ? `_${s.side}` : ''));
const events = (r: SimResult) => r.cascade.events.map((e) => e.id);

describe('W3-8: an anterior spinal artery occlusion', () => {
  it('counts the cord infarct in the infarct volumes, and names it apart', () => {
    const onset = run(occl('asa'), 0);
    expect(onset.volumes.cord.penumbra).toBeCloseTo(2, 1);
    expect(onset.volumes.penumbra).toBeCloseTo(onset.volumes.cord.penumbra, 6);
    for (const tH of [24, 2160]) {
      const r = run(occl('asa'), tH);
      expect(r.volumes.cord.core, `${tH} h`).toBeCloseTo(2, 1);
      expect(r.volumes.core, `${tH} h`).toBeCloseTo(r.volumes.cord.core, 6);
      expect(r.volumes.cord.final, `${tH} h`).toBeCloseTo(2, 1);
      expect(r.volumes.finalInfarct, `${tH} h`).toBeCloseTo(r.volumes.cord.final, 6);
      // the neuron estimate (Saver 2006) is the brain's: no brain tissue has died
      expect(r.neuronsLost, `${tH} h`).toBe(0);
    }
    const out = finalOutcome(input(occl('asa')));
    expect(out.course.finalInfarct).toBeCloseTo(2, 1);
    expect(out.regions.map((r) => r.id)).toEqual(['cervical_cord']);
  });

  it('tells the story of a spinal cord infarct, not that of a brain infarct, and its course after the first week', () => {
    const r = run(occl('asa'), 24);
    expect(events(r)).toEqual(expect.arrayContaining(['spinal_cord_infarction', 'imaging_spine', 'spinal_cord_course']));
    for (const id of ['ischemic_cascade', 'imaging_dwi', 'treatment_window', 'tia_urgent', 'ischemia_no_infarct']) expect(events(r)).not.toContain(id);
    const course = r.cascade.events.find((e) => e.id === 'spinal_cord_course')!;
    expect(course.onsetH).toBeGreaterThanOrEqual(168);
    expect(finalOutcome(input(occl('asa'))).late.map((e) => e.id)).toContain('spinal_cord_course');
    const story = r.cascade.events.find((e) => e.id === 'spinal_cord_infarction')!;
    expect(story.desc.en).toMatch(/anterior spinal artery/);
    expect(story.desc.zh).toMatch(/前脊髓動脈/);
  });

  it('is labelled the anterior spinal artery syndrome while the cord is damaged', () => {
    for (const tH of STOPS) expect(labels(run(occl('asa'), tH)), `${tH} h`).toContain('anterior_spinal');
  });
});

describe('W3-8: both vertebral arteries beyond their spinal roots', () => {
  it.each(['good', 'moderate', 'poor'] as const)('%s collaterals: the medulla and the cord, each with its story and label', (collateral) => {
    const r = run(occl('va_v4_dist_r', 'va_v4_dist_l'), 2160, collateral);
    expect(r.volumes.cord.final).toBeGreaterThan(0.05);
    expect(r.volumes.finalInfarct).toBeGreaterThan(r.volumes.cord.final + 1);
    expect(labels(r)).toEqual(expect.arrayContaining(['bilateral_medial_medullary', 'anterior_spinal']));
    expect(events(r)).toEqual(expect.arrayContaining(['ischemic_cascade', 'spinal_cord_infarction']));
    const out = finalOutcome(input(occl('va_v4_dist_r', 'va_v4_dist_l'), collateral));
    expect(out.regions.reduce((a, x) => a + x.ml, 0)).toBeCloseTo(out.course.finalInfarct, 1);
    // the neurons lost are the brain's
    expect(r.neuronsLost).toBeCloseTo((r.volumes.core - r.volumes.cord.core) * NEURONS_PER_ML, -3);
  });
});

describe('W3-8: no cord, no cord story', () => {
  it('a left M1 occlusion has no spinal volume, event or label', () => {
    for (const tH of [0, 24, 2160]) {
      const r = run(occl('mca_m1_l'), tH);
      expect(r.volumes.cord, `${tH} h`).toEqual({ core: 0, penumbra: 0, final: 0 });
      expect(events(r).filter((id) => id.startsWith('spinal') || id === 'imaging_spine'), `${tH} h`).toEqual([]);
      expect(labels(r), `${tH} h`).not.toContain('anterior_spinal');
    }
  });
});
