import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import type { CascadeEvent } from '../engine/cascade';
import type { Occlusion } from '../engine/hemodynamics';
import { simulate, type SimInput } from '../engine/simulate';
import { systemCellDetail } from './cellDetail';
import { severityBySystem } from './format';

const seriesOf = (over: Partial<SimInput> & { occlusions: Occlusion[] }) =>
  TIME_STOPS.map((s) =>
    simulate({ variants: [], map: 93, collateral: 'good', reperfusionH: null, decompression: false, ...over, tH: s.h }),
  );
const at = (h: number) => TIME_STOPS.findIndex((s) => s.h === h);

describe('function heat-map cell detail', () => {
  const lm1 = seriesOf({ occlusions: [{ vessel: 'mca_m1_l', severity: 1 }] });
  it('compares continuous deficits within an unchanged ordinal category and keeps colour indices ordinal', () => {
    const symptom = { id: 'arm_weak', side: 'r' as const, sev: 2 as const, sources: [], delayed: false, continuousSeverity: 1.25 };
    const baseline = { ...lm1[0], symptoms: [symptom], unexaminable: [] };
    const changed = (strength: number) => ({ ...baseline, symptoms: [{ ...symptom, continuousSeverity: strength }] });
    const worse = systemCellDetail([baseline, changed(1.5)], 1, 'motor').items[0];
    expect(worse.change).toBe('worse'); expect(worse.sev).toBe(2); expect(worse.prevSev).toBe(2);
    expect(worse.continuousSeverity).toBe(1.5); expect(worse.prevContinuousSeverity).toBe(1.25);
    expect(systemCellDetail([baseline, changed(1.1)], 1, 'motor').items[0].change).toBe('better');
    expect(systemCellDetail([baseline, changed(1.25)], 1, 'motor').items[0].change).toBe('same');
    expect(severityBySystem(changed(1.5).symptoms).motor).toBe(1.5);
    expect(severityBySystem(changed(1.5).symptoms, 'ordinal').motor).toBe(2);
    expect(severityBySystem([{ ...symptom, continuousSeverity: undefined }]).motor).toBe(2);
  });

  it('lists the symptoms of the system with their side, severity and source regions', () => {
    const d = systemCellDetail(lm1, at(24), 'motor');
    const arm = d.items.find((s) => s.id === 'arm_weak' && s.side === 'r');
    expect(arm).toBeDefined();
    expect(arm!.sev).toBeGreaterThan(0);
    expect(arm!.regions.length).toBeGreaterThan(0);
    for (const r of arm!.regions) expect(r.endsWith('_l')).toBe(true); // a left lesion weakens the right arm
    // every listed symptom is in the motor system and the list is sorted by severity
    for (let i = 1; i < d.items.length; i++) expect(d.items[i - 1].sev).toBeGreaterThanOrEqual(d.items[i].sev);
  });

  it('marks everything as new at onset and compares later cells with the previous stop', () => {
    expect(systemCellDetail(lm1, 0, 'motor').items.every((s) => s.change === 'new' && s.prevSev === 0)).toBe(true);
    const d = systemCellDetail(lm1, at(24), 'motor');
    const prev = lm1[at(24) - 1].symptoms;
    for (const s of d.items) {
      const before = prev.find((p) => p.id === s.id && p.side === s.side)?.sev ?? 0;
      expect(s.prevSev).toBe(before);
    }
  });

  it('shows what resolved after a TIA', () => {
    const sc = SCENARIOS.find((s) => s.id === 'tia_l_mca')!;
    const tia = seriesOf({ occlusions: sc.occlusions });
    const d = systemCellDetail(tia, at(0.25), 'language');
    expect(d.items).toHaveLength(0);
    expect(d.resolved.length).toBeGreaterThan(0);
  });

  it('names the course event behind a symptom that no region explains', () => {
    // untreated large cerebellar infarct (PICA + SCA, C4-F3): obstructive hydrocephalus makes the patient drowsy on day 3
    const pica = seriesOf({ occlusions: [{ vessel: 'pica_r', severity: 1 }, { vessel: 'sca_r', severity: 1 }], collateral: 'poor' });
    const d = systemCellDetail(pica, at(72), 'consciousness');
    const coma = d.items.find((s) => s.id === 'coma');
    expect(coma).toBeDefined();
    expect(coma!.events).toContain('hydrocephalus');
  });

  it('traces reduced consciousness to the swelling that shifts the midline, and drops a herniation coma once it has lifted (C4-F1, C4-F2)', () => {
    const malignant = seriesOf({ occlusions: [{ vessel: 'mca_m1_r', severity: 1 }], collateral: 'poor' });
    // 48 h: comatose from a ~10 mm shift, a day before the uncal herniation
    const coma48 = systemCellDetail(malignant, at(48), 'consciousness').items.find((s) => s.id === 'coma');
    expect(coma48).toBeDefined();
    expect(coma48!.events).toContain('malignant_edema_r');
    expect(coma48!.events).not.toContain('uncal_r');
    // 2 weeks: the survivor is drowsy from the remaining shift; the herniation no longer explains it
    const drowsy = systemCellDetail(malignant, at(336), 'consciousness').items.find((s) => s.id === 'somnolence');
    expect(drowsy).toBeDefined();
    expect(drowsy!.events).toContain('vasogenic_edema');
    expect(drowsy!.events).not.toContain('uncal_r');
  });

  it('attributes a symptom to an event by the one rule simulate uses: a shift-gated event explains nothing while the shift is under its threshold, before its peak too (R6-9, R6-5)', () => {
    const malignant = seriesOf({ occlusions: [{ vessel: 'mca_m1_r', severity: 1 }], collateral: 'poor' });
    const i = at(24);
    expect(malignant[i].edema.midlineShiftMm).toBeLessThan(8);
    const gated: CascadeEvent = {
      id: 'gated_test',
      kind: 'secondary',
      severity: 'danger',
      onsetH: 12,
      peakH: 120,
      title: { zh: '', en: '' },
      desc: { zh: '', en: '' },
      regions: [],
      symptoms: [{ id: 'arm_weak', side: 'l', sev: 2 }],
      symptomsWhileShiftMm: 8,
    };
    const series = malignant.map((r, k) => (k === i ? { ...r, cascade: { ...r.cascade, events: [...r.cascade.events, gated] } } : r));
    const arm = systemCellDetail(series, i, 'motor').items.find((s) => s.id === 'arm_weak' && s.side === 'l');
    expect(arm).toBeDefined();
    expect(arm!.events).not.toContain('gated_test');
  });
});

// X1-2: what cannot be examined at the patient's level of consciousness has not resolved, and when
// the patient can be examined again it is not new
describe('function heat-map cell detail under reduced consciousness', () => {
  const sc = SCENARIOS.find((s) => s.id === 'l_m1')!;
  const lm1 = seriesOf({ occlusions: sc.occlusions, collateral: 'moderate' });

  it('lists the signs that cannot be examined in coma apart, not as resolved', () => {
    const d = systemCellDetail(lm1, at(48), 'cognition');
    expect(lm1[at(48)].nihss.items['1a']).toBe(3);
    expect(d.resolved.map((s) => s.id)).not.toContain('executive');
    expect(d.unexaminable.map((s) => s.id)).toContain('executive');
    const lang = systemCellDetail(lm1, at(48), 'language');
    for (const id of ['aphasia_global', 'alexia', 'agraphia']) {
      expect(lang.resolved.map((s) => s.id), id).not.toContain(id);
      expect(lang.unexaminable.map((s) => s.id), id).toContain(id);
    }
  });

  it('marks them as examinable again, not new, once the patient is awake', () => {
    const d = systemCellDetail(lm1, at(336), 'cognition');
    expect(lm1[at(336) - 1].nihss.items['1a']).toBe(3);
    const ex = d.items.find((s) => s.id === 'executive');
    expect(ex?.change).toBe('again');
    expect(ex?.prevSev).toBeGreaterThan(0);
    // (what is tested through language stays apart while the global aphasia leaves too little
    // comprehension: Z3-16)
    expect(d.unexaminable.every((s) => s.why === 'aphasia')).toBe(true);
    expect(d.unexaminable.map((s) => s.id)).not.toContain('executive');
  });
});

// U3-7: a part of a broader deficit of the same side is listed as that deficit while no more severe
describe('function heat-map cell detail: a part taken in by the broader deficit of its side (U3-7)', () => {
  const lm1 = seriesOf({ occlusions: [{ vessel: 'mca_m1_l', severity: 1 }] });
  it('the face and arm sensory loss of a left M1, taken in by the hemisensory loss at 3 months, is not resolved', () => {
    const i = at(2160);
    const listed = (k: number, id: string) => lm1[k].symptoms.some((s) => s.id === id && s.side === 'r');
    expect(listed(i - 1, 'sens_face_arm')).toBe(true);
    expect(listed(i, 'sens_face_arm')).toBe(false);
    expect(listed(i, 'sens_hemibody')).toBe(true);
    expect(systemCellDetail(lm1, i, 'sensory').resolved.map((s) => s.id)).not.toContain('sens_face_arm');
  });
});
