import { describe, expect, it } from 'vitest';
import { SCENARIO_BY_ID, SCENARIOS } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import { NEEDS_AWAKE, type SymptomItem } from '../engine/clinical';
import { simulate, type SimResult } from '../engine/simulate';
import { improvedSince, noBackupNow, unexaminableHeading } from './recoveryFormat';

const item = (id: string, sev: 1 | 2 | 3, side: SymptomItem['side'] = null): SymptomItem => ({ id, side, sev, sources: ['x'], delayed: false });

describe('improvedSince', () => {
  it('reports continuous improvement within an unchanged ordinal category', () => {
    const before = { ...item('hiccups', 2), continuousSeverity: 2.49 };
    const after = { ...item('hiccups', 2), continuousSeverity: 2.01 };
    expect(improvedSince([before], [after]).map((s) => [s.from, s.to])).toEqual([[2.49, 2.01]]);
  });
  it('does not call a deficit fixed by dead tissue when continuous passing dysfunction remains', () => {
    const symptom = { ...item('hemianopia', 2), continuousSeverity: 2.49, deadSev: 2 as const, deadContinuousSeverity: 2.01 };
    const sim = { symptoms: [symptom], unexaminable: [] } as unknown as SimResult;
    expect(noBackupNow(sim, null)).toEqual([]);
  });
  it('reports a symptom that is gone as improved', () => {
    expect(improvedSince([item('hiccups', 2)], []).map((x) => [x.s.id, x.to])).toEqual([['hiccups', 0]]);
  });

  // a symptom absorbed into a larger one has not improved: the patient got worse
  it.each([
    ['central_sleep_apnoea', 'respiratory'],
    ['hypersomnia', 'coma'],
    ['somnolence', 'coma'],
    // C3-F2: from two weeks on, drowsiness is listed as persistent hypersomnia and coma after
    // extensive tegmental damage as a disorder of consciousness — neither is an improvement
    ['somnolence', 'hypersomnia'],
    ['coma', 'disorder_of_consciousness'],
    // Y2-13: both frontal eye fields
    ['gaze_deviation', 'gaze_paresis_bilateral'],
  ])('%s replaced by %s is not an improvement', (from, into) => {
    expect(improvedSince([item(from, 1)], [item(into, 3)])).toEqual([]);
  });

  // one aphasia type at a time (C1-F1): a global aphasia that has become a Broca aphasia has not
  // "gone"; one that has left no aphasia behind has
  it('an aphasia that changes type is not listed as gone', () => {
    expect(improvedSince([item('aphasia_global', 2)], [item('aphasia_broca', 1)])).toEqual([]);
    expect(improvedSince([item('aphasia_global', 2)], []).map((x) => [x.s.id, x.to])).toEqual([['aphasia_global', 0]]);
  });
});

// X1-2: a sign that cannot be examined at the patient's level of consciousness is left out of the
// list (R5-7, X1-12); that is not an improvement — the patient has got worse
describe('improvedSince and signs that cannot be examined now', () => {
  it('does not report as gone a sign that the engine says cannot be examined now', () => {
    const before = [item('executive', 2), item('alexia', 2)];
    const now = [item('coma', 3)];
    expect(improvedSince(before, now, [item('executive', 2), item('alexia', 2)])).toEqual([]);
    // one that has really gone still counts
    expect(improvedSince(before, now, [item('alexia', 2)]).map((x) => [x.s.id, x.to])).toEqual([['executive', 0]]);
  });

  /** stuporous or comatose (coma at least 2), or in a disorder of consciousness */
  const unaware = (r: SimResult) => r.symptoms.some((s) => (s.id === 'coma' && s.sev >= 2) || s.id === 'disorder_of_consciousness');
  it.each(SCENARIOS.map((s) => [s.id]))('%s: no awake-only sign is "better" or "gone" when the patient falls into stupor or coma', (id) => {
    const sc = SCENARIO_BY_ID[id];
    for (const collateral of ['good', 'moderate', 'poor'] as const) {
      const runs = TIME_STOPS.map((st) =>
        simulate({
          occlusions: sc.occlusions,
          variants: sc.variants ?? [],
          collateral,
          map: sc.map ?? 93,
          tH: st.h,
          reperfusionH: sc.reperfusionH ?? null,
          decompression: sc.decompression ?? false,
        }),
      );
      for (let i = 1; i < runs.length; i++) {
        const now = runs[i];
        for (const x of improvedSince(runs[i - 1].symptoms, now.symptoms, now.unexaminable)) {
          const where = `${id} ${collateral} ${TIME_STOPS[i].h} h: ${x.s.id} ${x.from}→${x.to}`;
          expect(NEEDS_AWAKE.includes(x.s.id) && unaware(now), where).toBe(false);
          expect(now.unexaminable.some((u) => u.id === x.s.id && u.side === x.s.side), where).toBe(false);
        }
      }
    }
  });
});

// Y2-14, Y2-15: the heading of what cannot be examined names the reason
describe('unexaminableHeading', () => {
  const why = (w?: SymptomItem['why']) => ({ ...item('prosopagnosia', 2), why: w });
  it('one reason: its own heading, no tag', () => {
    expect(unexaminableHeading([why('blind')], 'en').label).toBe('Cannot be tested: the patient cannot see');
    expect(unexaminableHeading([why('akinetic')], 'zh-TW').label).toBe('無動性緘默，目前無法檢查');
    // the level of consciousness when no reason is given (X1)
    const c = unexaminableHeading([why()], 'en');
    expect(c.label).toBe('Cannot be examined at this level of consciousness');
    expect(c.tag(why())).toBe('');
  });
  it('several reasons: a general heading, every reason explained, and a tag on each sign', () => {
    const h = unexaminableHeading([why('blind'), why('consciousness')], 'en');
    expect(h.label).toBe('Cannot be examined now');
    expect(h.title).toMatch(/blind: .*reduced consciousness: /);
    expect(h.tag(why('blind'))).toBe('blind');
    const zh = unexaminableHeading([why('blind'), why('akinetic')], 'zh-TW');
    expect(zh.label).toBe('目前無法檢查');
    expect(zh.tag(why('akinetic'))).toBe('無動性緘默');
  });
});

describe('improvedSince: a deficit of both sides now listed per side has not gone (Y2-17)', () => {
  it('arm weakness of both sides, then of each side', () => {
    expect(improvedSince([item('arm_weak', 2, 'both')], [item('arm_weak', 3, 'r'), item('arm_weak', 2, 'l')])).toEqual([]);
  });
});

// V2-9: macular sparing is the central vision a hemianopia keeps, a qualifier of it and not a
// deficit: losing it (the occipital pole silenced too) is no improvement
describe('macular sparing is not a deficit (V2-9)', () => {
  it('losing the macular sparing is not an improvement', () => {
    expect(improvedSince([item('hemianopia', 2, 'l'), item('macular_sparing', 1)], [item('hemianopia', 2, 'l')])).toEqual([]);
  });
  it.each(SCENARIOS.map((s) => [s.id]))('%s: never "better" for losing the macular sparing', (id) => {
    const sc = SCENARIO_BY_ID[id];
    for (const collateral of ['good', 'moderate', 'poor'] as const) {
      const runs = TIME_STOPS.map((st) => simulate({ occlusions: sc.occlusions, variants: sc.variants ?? [], collateral, map: sc.map ?? 93, tH: st.h, reperfusionH: sc.reperfusionH ?? null, decompression: sc.decompression ?? false }));
      for (let i = 1; i < runs.length; i++)
        expect(improvedSince(runs[i - 1].symptoms, runs[i].symptoms, runs[i].unexaminable).map((x) => x.s.id), `${collateral} ${TIME_STOPS[i].h} h`).not.toContain('macular_sparing');
    }
  });
});

// V2-5: "no backup — will not improve" is said of a deficit only once all of it comes from dead
// tissue, and never beside its own improvement: a deficit still deepened by the oedema of the first
// weeks, or caused by the compression of a swollen neighbour, does improve
describe('noBackupNow: what will not improve (V2-5)', () => {
  const runsOf = (id: string, collateral: 'good' | 'moderate' | 'poor') => {
    const sc = SCENARIO_BY_ID[id];
    return TIME_STOPS.map((st) =>
      simulate({ occlusions: sc.occlusions, variants: sc.variants ?? [], collateral, map: sc.map ?? 93, tH: st.h, reperfusionH: sc.reperfusionH ?? null, decompression: sc.decompression ?? false }),
    );
  };
  const at = (h: number) => TIME_STOPS.findIndex((s) => s.h === h);
  const ids = (xs: SymptomItem[]) => xs.map((s) => `${s.id}/${s.side ?? ''}`);
  it('the Foville template: the gaze palsy and the facial palsy are not said to stay while the oedema still lifts them', () => {
    const runs = runsOf('l_pontine', 'good');
    expect(ids(noBackupNow(runs[at(168)], runs[at(120)]))).not.toContain('gaze_palsy_horizontal/l');
    expect(ids(noBackupNow(runs[at(336)], runs[at(168)]))).not.toContain('face_weak_peripheral/l');
    // Its generic category is unchanged, but passing dysfunction still adds to the CN VI deficit.
    const cn6 = runs[at(168)].symptoms.find((s) => s.id === 'cn6_palsy' && s.side === 'l')!;
    expect(cn6.deadSev).toBe(cn6.sev);
    expect(cn6.deadContinuousSeverity).toBeLessThan(cn6.continuousSeverity!);
    expect(ids(noBackupNow(runs[at(168)], runs[at(120)]))).not.toContain('cn6_palsy/l');
  });
  it('a gaze palsy from the compression by a swollen cerebellum is not said to stay', () => {
    const runs = runsOf('cerebellar_swelling', SCENARIO_BY_ID.cerebellar_swelling.collateral ?? 'good');
    expect(ids(noBackupNow(runs[at(168)], runs[at(120)]))).not.toContain('gaze_palsy_horizontal/r');
  });
  it('a quadrantanopia from the calcarine cortex silenced around an infarct below the threshold is not said to stay', () => {
    const runs = runsOf('basilar_tip', SCENARIO_BY_ID.basilar_tip.collateral ?? 'good');
    for (const h of [168, 336]) expect(ids(noBackupNow(runs[at(h)], runs[at(h) - 1])), `${h} h`).not.toContain('quadrant_sup/r');
  });
  it.each(SCENARIOS.map((s) => [s.id]))('%s: a deficit said not to improve is not better at that stop, nor milder at any later one', (id) => {
    for (const collateral of ['good', 'moderate', 'poor'] as const) {
      const runs = runsOf(id, collateral);
      for (let i = 1; i < runs.length; i++) {
        const stay = noBackupNow(runs[i], runs[i - 1]);
        const better = improvedSince(runs[i - 1].symptoms, runs[i].symptoms, runs[i].unexaminable).map((x) => `${x.s.id}/${x.s.side ?? ''}`);
        for (const k of ids(stay)) expect(better, `${id} ${collateral}: ${k} at ${TIME_STOPS[i].h} h`).not.toContain(k);
        // later: as severe, or merged into a larger deficit, or not examinable then
        for (let j = i + 1; j < runs.length; j++)
          for (const s of stay)
            expect(improvedSince([s], runs[j].symptoms, runs[j].unexaminable), `${id} ${collateral}: ${s.id}/${s.side ?? ''} said to stay at ${TIME_STOPS[i].h} h, milder at ${TIME_STOPS[j].h} h`).toEqual([]);
      }
    }
  });
});

// U3-7: a part of a broader deficit of the same side (one modality of an all-modality hemisensory
// loss, the shoulder of a weak arm) is listed as that deficit while no more severe: it has not gone
describe('improvedSince: a part now listed as the broader deficit of its side has not gone (U3-7)', () => {
  it('the pain and temperature loss of a side, then the hemisensory loss of all modalities alone', () => {
    expect(improvedSince([item('pain_temp_body', 1, 'r'), item('sens_hemibody', 3, 'r')], [item('sens_hemibody', 3, 'r')])).toEqual([]);
    expect(improvedSince([item('arm_weak_proximal', 1, 'l'), item('arm_weak', 3, 'l')], [item('arm_weak', 3, 'l')])).toEqual([]);
  });
  it('… but a part gone beside the broader deficit of the other side has gone', () => {
    expect(improvedSince([item('pain_temp_body', 1, 'r')], [item('sens_hemibody', 2, 'l')]).map((x) => [x.s.id, x.to])).toEqual([['pain_temp_body', 0]]);
  });
});
