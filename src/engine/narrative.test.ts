import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { simulate, type SimInput } from './simulate';

/**
 * The course narrative must fit what is being simulated: an eye stroke is not told as a brain
 * infarct, and ischaemia that leaves no infarct (a TIA) is not told as a dying core.
 */
const run = (id: string, over: Partial<SimInput> = {}) => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return simulate({
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH: 1,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: false,
    ...over,
  });
};
const eventIds = (r: ReturnType<typeof simulate>) => r.cascade.events.map((e) => e.id);
const BRAIN_STORY = ['ischemic_cascade', 'imaging_dwi', 'treatment_window'];

describe('course narrative', () => {
  it('an ophthalmic embolus is told as an eye stroke, not as a brain infarct', () => {
    for (const reperfusionH of [null, 1]) {
      const ids = eventIds(run('amaurosis', { reperfusionH }));
      expect(ids).toEqual(expect.arrayContaining(['retinal_ischaemia', 'eye_stroke_workup', 'imaging_retina']));
      for (const id of [...BRAIN_STORY, 'reperfusion']) expect(ids, `${id} (reperfusion ${reperfusionH})`).not.toContain(id);
    }
  });

  it('a TIA is told as ischaemia without infarction', () => {
    const r = run('tia_l_mca');
    expect(r.volumes.finalInfarct).toBe(0);
    const ids = eventIds(r);
    expect(ids).toEqual(expect.arrayContaining(['ischemia_no_infarct', 'imaging_no_infarct', 'tia_urgent']));
    for (const id of ['ischemic_cascade', 'imaging_dwi']) expect(ids).not.toContain(id);
    // Z4-11: the treatment windows only while the attack's deficit lasts (5 minutes)
    expect(r.cascade.events.find((e) => e.id === 'treatment_window')!.endH).toBeLessThanOrEqual(0.25);
  });

  it('a brain infarct keeps the brain-stroke story', () => {
    const ids = eventIds(run('l_m1'));
    expect(ids).toEqual(expect.arrayContaining(BRAIN_STORY));
    for (const id of ['retinal_ischaemia', 'ischemia_no_infarct']) expect(ids).not.toContain(id);
  });

  it('when the eye and the brain are both ischaemic, the brain story is told', () => {
    // a cervical ICA occlusion without AComm or PComm starves both the ophthalmic artery and the
    // hemisphere
    const r = simulate({
      occlusions: [{ vessel: 'ica_cervical_r', severity: 1 }],
      variants: ['acomm_absent', 'pcomm_absent_r'],
      collateral: 'poor',
      map: 93,
      tH: 1,
      reperfusionH: null,
      decompression: false,
    });
    expect(r.regions.retina_r.dys).toBeGreaterThan(0.5);
    expect(r.volumes.core).toBeGreaterThan(50);
    const ids = eventIds(r);
    expect(ids).toContain('ischemic_cascade');
    expect(ids).not.toContain('retinal_ischaemia');
  });
});
