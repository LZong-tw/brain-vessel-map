import { describe, expect, it } from 'vitest';
import type { CollateralGrade } from './hemodynamics';
import { simulate, type SimInput } from './simulate';
import { DEFAULT_TREATMENT } from './treatment';

/**
 * The mid-basilar scenario teaches the classic locked-in syndrome: its symptom list must agree
 * with the syndrome description (awake, quadriplegic, anarthric, vertical gaze and blinking
 * preserved, horizontal gaze usually lost, lateral pons spared while AICA and SCA are open). Once
 * some limb movement returns it is incomplete locked-in syndrome (Bauer et al. 1979; C3-F1).
 */
const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false, ...over });
const ids = (r: ReturnType<typeof simulate>) => r.symptoms.map((s) => `${s.id}(${s.side ?? '-'})`);
const BASILAR_MID = [{ vessel: 'basilar_mid', severity: 1 }];

/** signs of the lateral pontine tegmentum (AICA/SCA territory) that classic locked-in spares */
const LATERAL_SIGNS = ['hearing_loss', 'pain_temp_body', 'pain_temp_face', 'sens_face_all', 'horner', 'jaw_weak'];

describe('mid-basilar occlusion: classic locked-in syndrome', () => {
  for (const collateral of ['good', 'moderate', 'poor'] as CollateralGrade[]) {
    for (const tH of [24, 2160]) {
      it(`${collateral} collaterals, ${tH} h: the symptoms match the locked-in description`, () => {
        const r = sim({ occlusions: BASILAR_MID, collateral, tH });
        // classical while no limb moves, incomplete once some movement has returned (C3-F1)
        const limbsParalysed = r.symptoms.filter((s) => s.id === 'arm_weak' || s.id === 'leg_weak').every((s) => s.sev === 3);
        expect(r.syndromes.map((m) => m.def.id)).toContain(limbsParalysed ? 'locked_in' : 'locked_in_incomplete');
        if (tH === 24) expect(limbsParalysed).toBe(true);
        const got = ids(r);
        // awake: no coma or drowsiness from the pons itself
        expect(got.some((x) => x.startsWith('coma') || x.startsWith('somnolence'))).toBe(false);
        // quadriplegia, no speech, no swallowing, no horizontal gaze
        expect(got).toEqual(expect.arrayContaining(['arm_weak(r)', 'arm_weak(l)', 'leg_weak(r)', 'leg_weak(l)', 'anarthria(-)', 'dysphagia(-)']));
        expect(got).toEqual(expect.arrayContaining(['gaze_palsy_horizontal(r)', 'gaze_palsy_horizontal(l)']));
        // the lateral pons is spared: no hearing loss, no facial or body pain/temperature loss, no Horner
        for (const id of LATERAL_SIGNS) expect(got.some((x) => x.startsWith(`${id}(`)), id).toBe(false);
        // no horizontal movement is left, so abducens palsies and INOs are not listed separately
        expect(got.some((x) => x.startsWith('cn6_palsy') || x.startsWith('ino'))).toBe(false);
        // vertical gaze is a midbrain function and stays intact
        expect(got.some((x) => x.startsWith('vertical_gaze_palsy') || x.startsWith('upgaze_palsy'))).toBe(false);
      });
    }
  }

  it('lateral pontine signs still appear when the long circumferential artery itself is blocked', () => {
    const r = sim({ occlusions: [{ vessel: 'aica_l', severity: 1 }], collateral: 'moderate' });
    expect(ids(r)).toContain('hearing_loss(l)');
  });

  it('a one-sided pontine lesion keeps its separate abducens sign (Foville)', () => {
    const r = sim({ occlusions: [{ vessel: 'pontine_paramedian_caudal_l', severity: 1 }] });
    expect(ids(r)).toEqual(expect.arrayContaining(['cn6_palsy(l)', 'gaze_palsy_horizontal(l)']));
  });
});

describe('the locked-in risk ends when blood returns before the pons dies', () => {

  // reported: after reopening at 1 h there was no infarct and no deficit, yet the acute
  // "risk of locked-in syndrome" never ended and showed as a lasting state. Y1-12: the rescued pons
  // regains its function over hours to days, so the state ends some hours after the treatment, as
  // the symptoms do
  const lockedInLabel = (r: ReturnType<typeof simulate>) => r.syndromes.some((m) => m.def.id.startsWith('locked_in'));
  it.each([1, 3, 6])('treatment at %s h: the events end after the treatment, when the symptoms do', (reperfusionH) => {
    const r = sim({ occlusions: BASILAR_MID, reperfusionH, tH: 4320 });
    const course = r.cascade.events.filter((e) => e.id.startsWith('locked_in'));
    const last = course[course.length - 1];
    expect(course[0].onsetH).toBe(0);
    expect(last.endH).toBeGreaterThan(reperfusionH);
    expect(last.endH).toBeLessThan(48);
    expect(last.desc['zh']).toContain('救回的組織在之後幾小時到幾天內逐漸恢復功能');
    // the symptom model agrees: locked-in before the treatment and until the events end, gone after
    expect(lockedInLabel(sim({ occlusions: BASILAR_MID, reperfusionH, tH: reperfusionH / 2 }))).toBe(true);
    expect(lockedInLabel(sim({ occlusions: BASILAR_MID, reperfusionH, tH: last.endH! - 0.05 }))).toBe(true);
    expect(lockedInLabel(sim({ occlusions: BASILAR_MID, reperfusionH, tH: last.endH! + 0.05 }))).toBe(false);
  });

  it('a spontaneous reopening ends it too', () => {
    const r = sim({ occlusions: [{ vessel: 'basilar_mid', severity: 1, toH: 2 }], tH: 4320 });
    const course = r.cascade.events.filter((e) => e.id.startsWith('locked_in'));
    expect(course[course.length - 1].endH).toBeGreaterThan(2);
    expect(course[course.length - 1].endH).toBeLessThan(24);
  });

  // the locked-in state is told by its own course (X2-15): classical while nothing moves, then an
  // open-ended incomplete locked-in event once some movement returns
  const lockedInEvents = (r: ReturnType<typeof simulate>) => r.cascade.events.filter((e) => e.id.startsWith('locked_in'));
  it('stays open-ended when nothing reopens the artery, when the pons dies anyway, or when it closes again', () => {
    for (const r of [sim({ occlusions: BASILAR_MID, tH: 4320 }), sim({ occlusions: BASILAR_MID, collateral: 'poor', reperfusionH: 24, tH: 4320 })]) {
      const course = lockedInEvents(r);
      expect(course.map((e) => e.id)).toEqual(['locked_in', 'locked_in_incomplete']);
      expect(course[0].endH).toBe(course[1].onsetH);
      expect(course[1].endH).toBeUndefined();
    }
    // reopened at 1 h, closed again at 7 h: it resolves after the reopening (incomplete for a few
    // hours as the pons recovers, Y1-12) and returns with the reocclusion
    const reoccluded = lockedInEvents(sim({ occlusions: BASILAR_MID, reperfusionH: 1, tH: 4320, treatment: { ...DEFAULT_TREATMENT, reocclusionAfterH: 6 } }));
    expect(reoccluded.map((e) => [e.id, e.onsetH])).toEqual([
      ['locked_in', 0],
      ['locked_in_incomplete', 1],
      ['locked_in_2', 7],
      ['locked_in_incomplete_2', reoccluded[3].onsetH],
    ]);
    expect(reoccluded[1].endH).toBeLessThan(7);
    expect(reoccluded[3].endH).toBeUndefined();
  });
});
