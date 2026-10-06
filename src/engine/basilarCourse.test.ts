/**
 * The basilar course and its events (third review round, group X2): a deficit that cleared when
 * blood returned is not brought back by the swelling of the following days (X2-9); the brainstem
 * consciousness events follow the state the symptom list shows at each time, on the clock of the
 * lesion that causes it (X2-7, X2-8, X2-10, X2-11, X2-15); a basilar occlusion over two segments
 * that include the lower basilar is a stated limitation of the collateral calibration (X2-17).
 */
import { describe, expect, it } from 'vitest';
import README_ZH from '../../README.md?raw';
import README_EN from '../../README.en.md?raw';
import { TIME_STOPS } from '../anatomy/timeline';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const base: SimInput = { occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false };
const occ = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) => simulate({ ...base, occlusions, tH, ...over });
const one = (vessel: string, tH: number, over: Partial<SimInput> = {}) => occ([{ vessel, severity: 1 }], tH, over);
const STOPS = TIME_STOPS.map((s) => s.h);
const labels = (r: SimResult) => r.syndromes.map((m) => m.def.id);
const keys = (r: SimResult) => r.symptoms.map((s) => `${s.id}|${s.side}`);
const pattern = (runs: SimResult[], key: string) => runs.map((r) => (keys(r).includes(key) ? '■' : '□')).join('');

describe('X2-9: the swelling of the first days does not bring back a deficit that cleared when blood returned', () => {
  const COURSES: [string, CollateralGrade, number][] = [
    ['basilar_upper', 'poor', 1],
    ['basilar_upper', 'moderate', 1.5],
    ['basilar_mid', 'good', 12],
    ['basilar_mid', 'poor', 2],
    ['basilar_tip', 'good', 2],
  ];
  it.each(COURSES)('%s, %s collaterals, reopened at %s h: no sign goes and comes back', (vessel, collateral, reperfusionH) => {
    const runs = STOPS.map((tH) => one(vessel, tH, { collateral, reperfusionH }));
    for (const key of new Set(runs.flatMap(keys))) {
      const on = runs.map((r) => keys(r).includes(key));
      const first = on.indexOf(true);
      const last = on.lastIndexOf(true);
      for (let i = first + 1; i < last; i++)
        if (!on[i]) expect(runs[i].unexaminable.some((s) => `${s.id}|${s.side}` === key), `${key}: ${pattern(runs, key)}`).toBe(true);
    }
  });

  // Y1-12: the rescued tissue regains its function over hours to days after the reopening, not at
  // the instant blood returns; once a deficit has cleared, the swelling does not bring it back
  // Z2-8: a fifth of both rostral pontine bases infarcted is a small bilateral pontine infarct, and
  // it leaves what such an infarct gives (a mild weakness of both sides, a dysarthria: Kumral 2002),
  // graded by its size; was: free of deficits once the region fell below the symptom threshold
  it('a rescued upper basilar occlusion (poor collaterals, 1 h) recovers within a day to the mild deficit of its small infarcts, without a locked-in label, and is not worse again', () => {
    expect(one('basilar_upper', 12, { collateral: 'poor', reperfusionH: 1 }).nihss.total).toBeLessThan(one('basilar_upper', 1, { collateral: 'poor', reperfusionH: 1 }).nihss.total);
    let prev = Infinity;
    for (const tH of STOPS.filter((h) => h >= 24)) {
      const r = one('basilar_upper', tH, { collateral: 'poor', reperfusionH: 1 });
      expect(r.nihss.total, `${tH} h`).toBeLessThanOrEqual(Math.min(prev, 10));
      prev = r.nihss.total;
      expect(labels(r).filter((id) => id.startsWith('locked_in')), `${tH} h`).toEqual([]);
    }
    const end = one('basilar_upper', 2160, { collateral: 'poor', reperfusionH: 1 });
    expect(end.regions.pons_rostral_basis_r.infarct).toBeLessThan(0.25);
    expect(end.nihss.total).toBeGreaterThan(0);
    expect(end.nihss.total).toBeLessThanOrEqual(4);
  });

  it('with moderate collaterals reopened at 1.5 h the same within about 3 days: no incomplete locked-in syndrome on days 3–14', () => {
    let prev = Infinity;
    for (const tH of [72, 120, 168, 240, 336]) {
      const r = one('basilar_upper', tH, { collateral: 'moderate', reperfusionH: 1.5 });
      expect(r.nihss.total, `${tH} h`).toBeLessThanOrEqual(Math.min(prev, 8));
      prev = r.nihss.total;
      expect(labels(r), `${tH} h`).not.toContain('locked_in_incomplete');
      expect(keys(r), `${tH} h`).not.toContain('anarthria|null');
    }
  });

  it('upper basilar occlusion reopened at 6 h (good collaterals): the coma lightens, the patient wakes within days and is not comatose again', () => {
    const comaSev = (tH: number) => one('basilar_upper', tH, { reperfusionH: 6 }).symptoms.find((s) => s.id === 'coma')?.sev ?? 0;
    let prev = 3;
    for (const tH of [6, 12, 24, 48, 72, 120, 168, 336, 720]) {
      expect(comaSev(tH), `${tH} h`).toBeLessThanOrEqual(prev);
      prev = comaSev(tH);
    }
    for (const tH of [168, 336, 720]) {
      const r = one('basilar_upper', tH, { reperfusionH: 6 });
      expect(r.symptoms.some((s) => s.id === 'coma'), `${tH} h`).toBe(false);
      expect(labels(r), `${tH} h`).toContain('locked_in_incomplete');
    }
  });

  it('a deficit still present when blood returns can be held and worsened by the swelling, and then eases (first worse, then better)', () => {
    // reopened late: the mid-basilar locked-in picture is there at the reopening and stays
    const at = (tH: number) => one('basilar_mid', tH, { reperfusionH: 24 });
    expect(labels(at(24)).some((id) => id.startsWith('locked_in'))).toBe(true);
    expect(labels(at(120)).some((id) => id.startsWith('locked_in'))).toBe(true);
    // the hemispheric case: a late-reopened M1 keeps its hemiparesis through the oedema peak
    const m1 = (tH: number) => one('mca_m1_l', tH, { reperfusionH: 6 });
    for (const tH of [6, 24, 72, 120]) expect(keys(m1(tH)), `${tH} h`).toContain('arm_weak|r');
  });
});

/** the events of the brainstem consciousness course and the labels they go with */
const FAMILY = ['basilar_coma', 'pontine_doc', 'locked_in', 'locked_in_incomplete'];
const activeFamily = (r: SimResult) =>
  r.cascade.events
    .filter((e) => e.onsetH <= r.input.tH && r.input.tH < (e.endH ?? Infinity))
    .map((e) => e.id.replace(/_\d+$/, ''))
    .filter((id) => FAMILY.includes(id))
    .sort();
const shownFamily = (r: SimResult) => labels(r).filter((id) => FAMILY.includes(id)).sort();
const event = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
const comatose = (r: SimResult) => r.symptoms.some((s) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness');

describe('X2-7, X2-10: after an early reopening the coma event ends when the patient wakes', () => {
  // Y1-12: the tegmentum rescued at 6 h regains its function over days (was: the coma lifted at the
  // instant of the reopening)
  it('upper basilar occlusion reopened at 6 h (good collaterals): coma until the tegmentum works again, then an incomplete locked-in event, never "comatose now" while awake', () => {
    const late = one('basilar_upper', 4320, { reperfusionH: 6 });
    const coma = event(late, 'basilar_coma')!;
    expect(coma.onsetH).toBe(0);
    expect(coma.endH).toBeGreaterThan(24);
    expect(coma.endH).toBeLessThan(168);
    expect(coma.desc.en).toMatch(/Blood returned 6 h after onset before the tegmentum of both sides infarcted, so the coma lifts as it regains its function, by about/);
    expect(coma.desc.en).toMatch(/wakes up incompletely locked-in/);
    expect(coma.desc.zh).toContain('昏迷隨著被蓋恢復功能而解除');
    const lis = event(late, 'locked_in_incomplete')!;
    expect([lis.onsetH, lis.endH]).toEqual([coma.endH, undefined]);
    expect(lis.desc.en).toMatch(/The coma has lifted/);
    for (const tH of [6, 12, 24, 48, 168, 336, 720]) {
      const r = one('basilar_upper', tH, { reperfusionH: 6 });
      const awake = tH > coma.endH!;
      expect((r.nihss.items['1a'] ?? 0) === 0, `${tH} h`).toBe(awake);
      expect(activeFamily(r), `${tH} h`).toEqual([awake ? 'locked_in_incomplete' : 'basilar_coma']);
    }
  });

  it.each([
    ['moderate', 2],
    ['poor', 2],
    ['good', 6],
    ['moderate', 6],
    ['good', 8],
    ['good', 24],
  ] as [CollateralGrade, number][])('upper basilar occlusion, %s collaterals, reopened at %s h: the coma event runs only while the patient is stuporous or comatose', (collateral, reperfusionH) => {
    for (const tH of STOPS) {
      const r = one('basilar_upper', tH, { collateral, reperfusionH });
      const where = `${tH} h`;
      expect(activeFamily(r), where).toEqual(shownFamily(r));
      if (activeFamily(r).includes('basilar_coma')) expect(comatose(r), where).toBe(true);
    }
  });
});

describe('X2-8, X2-11: with stacked occlusions the brainstem events run on the basilar lesion’s own clock', () => {
  const BA_THEN_M1: Occlusion[] = [
    { vessel: 'basilar_upper', severity: 1, fromH: 0 },
    { vessel: 'mca_m1_l', severity: 1, fromH: 720 },
  ];
  const M1_THEN_BA: Occlusion[] = [
    { vessel: 'mca_m1_l', severity: 1, fromH: 0 },
    { vessel: 'basilar_upper', severity: 1, fromH: 720 },
  ];
  it('basilar occlusion first, a left M1 a month later (the M1 is the index event): coma, then a disorder of consciousness, from the basilar onset', () => {
    const at = (tH: number) => occ(BA_THEN_M1, tH, { collateral: 'poor' });
    expect(at(744).schedule.onsetH).toBe(720);
    expect(activeFamily(at(24))).toEqual(['basilar_coma']);
    for (const tH of [336, 720, 721, 744]) {
      const r = at(tH);
      expect(r.symptoms.some((s) => s.id === 'disorder_of_consciousness'), `${tH} h`).toBe(true);
      expect(activeFamily(r), `${tH} h`).toEqual(['pontine_doc']);
    }
    const coma = event(at(744), 'basilar_coma')!;
    expect([coma.onsetH, coma.endH]).toEqual([0, 336]);
    expect(event(at(744), 'pontine_doc')!.onsetH).toBe(336);
  });

  it('a left M1 first, the basilar occlusion a month later: the coma has its event from the basilar onset, the disorder of consciousness from two weeks after it', () => {
    const at = (tH: number) => occ(M1_THEN_BA, tH, { collateral: 'poor' });
    for (const tH of [720, 721, 744, 800, 1000]) expect(activeFamily(at(tH)), `${tH} h`).toEqual(['basilar_coma']);
    for (const tH of [1056, 1100, 1440, 4320]) expect(activeFamily(at(tH)), `${tH} h`).toEqual(['pontine_doc']);
    const coma = event(at(4320), 'basilar_coma')!;
    expect([coma.onsetH, coma.endH]).toEqual([720, 1056]);
  });

  it('every stop of both stacks: the events match the labels', () => {
    for (const stack of [BA_THEN_M1, M1_THEN_BA])
      for (const tH of [...STOPS, 721, 744, 800, 1000, 1056, 1100, 1440])
        for (const collateral of ['good', 'poor'] as const) {
          const r = occ(stack, tH, { collateral });
          expect(activeFamily(r), `${stack[0].vessel} first, ${collateral}, ${tH} h`).toEqual(shownFamily(r));
        }
  });
});

describe('X2-15: the locked-in event is titled by the picture at the time, not by the final infarct', () => {
  // Y1-12: the part of the ventral pons rescued at 24 h regains its function over the following
  // days (was: at the instant of the reopening)
  it('mid-basilar occlusion reopened at 24 h: classical locked-in until the rescued pons works again, incomplete after it', () => {
    const r = one('basilar_mid', 4320, { reperfusionH: 24 });
    const classical = event(r, 'locked_in')!;
    expect(classical.onsetH).toBe(0);
    expect(classical.endH).toBeGreaterThan(24);
    expect(classical.endH).toBeLessThan(168);
    expect(classical.title.en).toBe('Bilateral ventral pons: locked-in syndrome');
    const incomplete = event(r, 'locked_in_incomplete')!;
    expect([incomplete.onsetH, incomplete.endH]).toEqual([classical.endH, undefined]);
    expect(incomplete.title.en).toMatch(/incomplete locked-in/);
    expect(incomplete.desc.en).toMatch(/Blood returned 24 h after onset and saved part of the ventral pons/);
    expect(incomplete.desc.zh).toContain('救回部分橋腦腹側');
    for (const tH of [1, 6, 12]) expect(shownFamily(one('basilar_mid', tH, { reperfusionH: 24 })), `${tH} h`).toEqual(['locked_in']);
  });

  it('reopened in time: the events name the locked-in picture shown and say it resolves as the rescued pons works again', () => {
    const r = one('basilar_mid', 4320, { reperfusionH: 1 });
    const e = event(r, 'locked_in')!;
    expect([e.onsetH, e.endH]).toEqual([0, 1]);
    expect(e.title.en).toBe('Bilateral ventral pons: locked-in syndrome');
    // some movement returns at once, the rest within hours
    const last = event(r, 'locked_in_incomplete')!;
    expect(last.onsetH).toBe(1);
    expect(last.endH).toBeLessThan(24);
    expect(last.desc.en).toMatch(/Blood returned 1 h after onset before both sides infarcted, so the state resolves as the rescued tissue regains its function over the following hours to days/);
    expect(last.desc.zh).toContain('救回的組織在之後幾小時到幾天內逐漸恢復功能');
  });
});

describe('X2-17: a basilar occlusion over two segments with the lower basilar is a stated limitation', () => {
  const LONG_CLOT: Occlusion[][] = [
    [
      { vessel: 'basilar_lower', severity: 1 },
      { vessel: 'basilar_mid', severity: 1 },
    ],
    [
      { vessel: 'basilar_lower', severity: 1 },
      { vessel: 'basilar_upper', severity: 1 },
    ],
  ];
  // Y1-0: the AICA territories of the cerebellum, which collaterals reach, are now lost over hours
  // and so saved by an early reopening; the paramedian pons, below the core threshold, is not
  const PONS = ['pons_rostral_basis_r', 'pons_rostral_basis_l', 'pons_caudal_basis_r', 'pons_caudal_basis_l'];
  const ponsInfarct = (r: SimResult) => PONS.reduce((a, id) => a + r.regions[id].infarct, 0);
  it('with moderate or poor collaterals reopening at 30 min saves almost nothing of the pons in the model; good collaterals still benefit', () => {
    for (const clot of LONG_CLOT) {
      for (const collateral of ['moderate', 'poor'] as const) {
        const where = `${clot.map((o) => o.vessel).join('+')} ${collateral}`;
        const untreated = occ(clot, 4320, { collateral });
        const reopened = occ(clot, 4320, { collateral, reperfusionH: 0.5 });
        expect(ponsInfarct(reopened), where).toBeGreaterThan(0.95 * ponsInfarct(untreated));
        // the same brainstem picture (a locked-in syndrome, or a disorder of consciousness)
        expect(reopened.syndromes.map((m) => m.def.id), where).toEqual(untreated.syndromes.map((m) => m.def.id));
        expect(reopened.nihss.total, where).toBe(untreated.nihss.total);
      }
      const good = occ(clot, 4320).volumes.finalInfarct;
      expect(occ(clot, 4320, { reperfusionH: 1 }).volumes.finalInfarct).toBeLessThan(0.6 * good);
    }
    // the single-segment calibration is not affected: the mid basilar alone is saved early
    const mid = occ([{ vessel: 'basilar_mid', severity: 1 }], 4320, { collateral: 'poor' }).volumes.finalInfarct;
    expect(occ([{ vessel: 'basilar_mid', severity: 1 }], 4320, { collateral: 'poor', reperfusionH: 1 }).volumes.finalInfarct).toBeLessThan(0.75 * mid);
  });

  it('both READMEs say so, with the evidence that it is a disadvantage, not futility', () => {
    expect(README_EN).toMatch(/lower basilar artery is blocked together with another segment/);
    expect(README_EN).toMatch(/BATMAN stratum/);
    expect(README_EN).toMatch(/a disadvantage, not futility/);
    expect(README_ZH).toContain('下段基底動脈連同另一段一起阻塞');
    expect(README_ZH).toContain('BATMAN 分層');
    expect(README_ZH).toContain('不利因素、不是無效');
  });
});
