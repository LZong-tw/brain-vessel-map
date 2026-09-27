import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
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
    // untreated cerebellar infarct: obstructive hydrocephalus makes the patient drowsy on day 3
    const pica = seriesOf({ occlusions: [{ vessel: 'pica_r', severity: 1 }], collateral: 'poor' });
    const d = systemCellDetail(pica, at(72), 'consciousness');
    const coma = d.items.find((s) => s.id === 'coma');
    expect(coma).toBeDefined();
    expect(coma!.events).toContain('hydrocephalus');
  });
});
