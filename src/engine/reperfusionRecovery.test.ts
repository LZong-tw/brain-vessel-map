/**
 * Y1-12: tissue rescued by reperfusion regains its function over hours to days, not at the
 * instant blood returns, and the recanalisation event is graded by the deficit it avoids.
 *
 *   • Only about 1 in 4 thrombectomy patients has an NIHSS below 6 within 30 min of successful
 *     recanalisation (Desai SM et al. Stroke Vasc Interv Neurol 2022;2:e000138, PMID 41584773).
 *   • 54 % of the functional benefit of recanalisation is apparent in the NIHSS at 24 h, 75 % at
 *     hospital discharge (German Stroke Registry, 3057 patients: Kniep H et al. Stroke
 *     2022;53:2828–2837, PMID 35549377).
 *   • The benefit falls with every hour of delay to reperfusion (MR CLEAN: Fransen PS et al. JAMA
 *     Neurol 2016;73:190–196, PMID 26716735); recovery can be delayed ("stunned brain": Klapproth S
 *     et al. J Neurol 2025;272:313, PMID 40183971); rescued penumbra loses neurons in proportion to
 *     how deep its hypoperfusion was (Guadagno JV et al. Brain 2008;131:2666–2678, PMID 18678564).
 *   • A TIA of minutes still clears within minutes (Easton JD et al. Stroke 2009;40:2276–2293).
 */
import { describe, expect, it } from 'vitest';
import { BED_BY_ID, BEDS } from '../anatomy';
import { SCENARIOS } from '../anatomy/scenarios';
import { simulate, type SimInput, type SimResult } from './simulate';
import { silentAfterReflow } from './tissue';

const scenario = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return {
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH: sc.tH ?? 24,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  };
};
const nihssAt = (input: SimInput, tH: number) => simulate({ ...input, tH }).nihss.total;
/** mL of tissue still silent while it regains its function */
const regainingMl = (r: SimResult) => BEDS.reduce((a, b) => a + r.beds[b.id].regaining * b.volume, 0);
/** mL of ischaemic tissue still alive (penumbra, and what is below the core threshold but not yet dead) */
const penumbraMl = (r: SimResult) => BEDS.reduce((a, b) => a + r.beds[b.id].frac.penumbra * (BED_BY_ID[b.id]?.volume ?? 0), 0);

describe('after a reopening, function returns over hours to days', () => {
  it.each([
    ['basilar_mid', 2],
    ['basilar_mid', 6],
    ['basilar_mid', 12],
    ['l_m1', 2],
    ['l_m1', 6],
  ] as const)('%s reopened at %s h: at most about a quarter of the deficit goes at the instant of reopening', (id, h) => {
    const input = scenario(id, { reperfusionH: h });
    const before = nihssAt(input, h - 1e-3);
    expect(nihssAt(input, h)).toBeGreaterThanOrEqual(0.7 * before);
  });

  it('a mid-basilar occlusion reopened at 12 h: the locked-in picture outlasts the reopening by days, then most of it recovers', () => {
    const input = scenario('basilar_mid', { reperfusionH: 12 });
    const pre = nihssAt(input, 11.999);
    expect(nihssAt(input, 24)).toBeGreaterThan(0.5 * pre);
    expect(nihssAt(input, 168)).toBeLessThan(nihssAt(input, 24));
    expect(nihssAt(input, 2160)).toBeLessThanOrEqual(4);
  });

  it('after a reopening at 6 h about half of the rescued function is back within a day, three quarters within a week, nearly all by 3 months', () => {
    const input = scenario('l_m1', { reperfusionH: 6 });
    const silent = (tH: number) => regainingMl(simulate({ ...input, tH }));
    const atRisk = penumbraMl(simulate({ ...input, tH: 6 - 1e-3 }));
    const s0 = silent(6);
    expect(s0).toBeGreaterThan(0.6 * atRisk);
    expect(silent(30) / s0).toBeGreaterThan(0.3);
    expect(silent(30) / s0).toBeLessThan(0.7);
    expect(silent(6 + 168) / s0).toBeLessThan(0.35);
    expect(silent(6 + 2160) / s0).toBeLessThan(0.03);
  });

  it('the longer the ischaemia, the slower the return; after short ischaemia only a minority returns at once', () => {
    // hours of ischaemia beyond the lag before blood returned
    for (const s of [1, 6, 24, 168]) {
      expect(silentAfterReflow(s, 0.5), `${s} h`).toBeLessThan(silentAfterReflow(s, 2));
      expect(silentAfterReflow(s, 2), `${s} h`).toBeLessThan(silentAfterReflow(s, 8));
    }
    // an hour of ischaemia (40 min beyond the lag): about a quarter at once, most within hours
    expect(silentAfterReflow(0, 2 / 3)).toBeGreaterThan(0.7);
    expect(silentAfterReflow(0, 2 / 3)).toBeLessThan(0.8);
    expect(silentAfterReflow(6, 2 / 3)).toBeLessThan(0.3);
    // 6 h: about half back within a day, three quarters within a week, all by 3 months
    expect(silentAfterReflow(24, 17 / 3)).toBeGreaterThan(0.35);
    expect(silentAfterReflow(24, 17 / 3)).toBeLessThan(0.6);
    expect(silentAfterReflow(168, 17 / 3)).toBeLessThan(0.25);
    expect(silentAfterReflow(2160, 17 / 3)).toBeLessThan(0.01);
    // nothing lost yet (within the lag): everything returns at once
    expect(silentAfterReflow(0, 0)).toBe(0);
  });

  it('a TIA of minutes still clears within minutes, one of half an hour within hours', () => {
    expect(nihssAt(scenario('tia_l_mca'), 0)).toBeGreaterThan(4);
    expect(nihssAt(scenario('tia_l_mca'), 0.25)).toBe(0);
    const halfHour = scenario('l_m2_sup', { occlusions: [{ vessel: 'mca_m2_sup_l', severity: 1, toH: 0.5 }] });
    expect(nihssAt(halfHour, 0.25)).toBeGreaterThan(4);
    expect(nihssAt(halfHour, 3)).toBe(0);
  });
});

describe('the recanalisation event is graded by the deficit it avoids, not by the mL', () => {
  const reperfusion = (input: SimInput) => simulate({ ...input, tH: 24 }).cascade.events.find((e) => e.id === 'reperfusion')!;

  it.each([2, 6, 12])('a mid-basilar occlusion reopened at %s h avoids a locked-in syndrome: shown as a benefit, with the NIHSS at 3 months', (h) => {
    const input = scenario('basilar_mid', { reperfusionH: h });
    const ev = reperfusion(input);
    expect(ev.severity).toBe('good');
    const treated = nihssAt(input, 2160);
    const untreated = nihssAt({ ...input, reperfusionH: null }, 2160);
    expect(untreated - treated).toBeGreaterThanOrEqual(2);
    expect(ev.desc.en).toContain(`NIHSS at 3 months about ${treated} instead of ${untreated}`);
    expect(ev.desc.zh).toContain(`3 個月時 NIHSS 約 ${treated} 分（不治療約 ${untreated} 分）`);
  });

  it('a late reopening that leaves the same deficit at 3 months is not shown as a benefit', () => {
    const input = scenario('r_m1_malignant', { reperfusionH: 24 });
    expect(nihssAt(input, 2160)).toBeGreaterThan(nihssAt({ ...input, reperfusionH: null }, 2160) - 2);
    expect(reperfusion(input).severity).toBe('info');
  });
});
