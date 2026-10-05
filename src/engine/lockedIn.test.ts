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
  const event = (r: ReturnType<typeof simulate>, id: string) => r.cascade.events.find((e) => e.id === id);

  // reported: after reopening at 1 h there was no infarct and no deficit, yet the acute
  // "risk of locked-in syndrome" never ended and showed as a lasting state
  it.each([1, 3, 6])('treatment at %s h: the event ends at the treatment, like the symptoms', (reperfusionH) => {
    const r = sim({ occlusions: BASILAR_MID, reperfusionH, tH: 4320 });
    const e = event(r, 'locked_in');
    expect(e?.endH).toBe(reperfusionH);
    expect(e?.desc['zh']).toContain('這個狀態隨之解除');
    // the symptom model agrees: locked-in before the treatment, gone after it
    expect(sim({ occlusions: BASILAR_MID, reperfusionH, tH: reperfusionH / 2 }).syndromes.map((m) => m.def.id)).toContain('locked_in');
    expect(sim({ occlusions: BASILAR_MID, reperfusionH, tH: 24 }).syndromes.map((m) => m.def.id)).not.toContain('locked_in');
  });

  it('a spontaneous reopening ends it too', () => {
    const r = sim({ occlusions: [{ vessel: 'basilar_mid', severity: 1, toH: 2 }], tH: 4320 });
    expect(event(r, 'locked_in')?.endH).toBe(2);
  });

  it('stays open-ended when nothing reopens the artery, when the pons dies anyway, or when it closes again', () => {
    expect(event(sim({ occlusions: BASILAR_MID, tH: 4320 }), 'locked_in')?.endH).toBeUndefined();
    expect(event(sim({ occlusions: BASILAR_MID, collateral: 'poor', reperfusionH: 24, tH: 4320 }), 'locked_in')?.endH).toBeUndefined();
    const reoccluded = sim({ occlusions: BASILAR_MID, reperfusionH: 1, tH: 4320, treatment: { ...DEFAULT_TREATMENT, reocclusionAfterH: 6 } });
    expect(event(reoccluded, 'locked_in')?.endH).toBeUndefined();
  });
});
