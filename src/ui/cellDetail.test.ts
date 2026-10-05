import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import type { CascadeEvent } from '../engine/cascade';
import type { Occlusion } from '../engine/hemodynamics';
import { simulate, type SimInput } from '../engine/simulate';
import { systemCellDetail } from './cellDetail';

const seriesOf = (over: Partial<SimInput> & { occlusions: Occlusion[] }) =>
  TIME_STOPS.map((s) =>
    simulate({ variants: [], map: 93, collateral: 'good', reperfusionH: null, decompression: false, ...over, tH: s.h }),
  );
const at = (h: number) => TIME_STOPS.findIndex((s) => s.h === h);

describe('function heat-map cell detail', () => {
  const lm1 = seriesOf({ occlusions: [{ vessel: 'mca_m1_l', severity: 1 }] });

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
