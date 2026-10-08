import { describe, expect, it } from 'vitest';
import { BEDS, BED_BY_ID, REGION_BY_ID } from '../anatomy';
import { TIME_STOPS } from '../anatomy/timeline';
import { consciousnessFromShift } from './cascade';
import { NO_EDEMA } from './edemaTypes';
import type { Occlusion } from './hemodynamics';
import { simulate, type SimInput } from './simulate';

const base: SimInput = {
  occlusions: [],
  variants: [],
  collateral: 'good',
  map: 93,
  reperfusionH: null,
  decompression: false,
  tH: 24,
};
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (over: Partial<SimInput>) => simulate({ ...base, ...over });
const edemaAt = (over: Partial<SimInput>) => sim(over).edema;

const MCA_TERR = new Set(['MCAF', 'MCAP', 'MCAT', 'MCAO', 'MCAI']);
const mcaBeds = (side: 'r' | 'l') => BEDS.filter((b) => b.region.endsWith(`_${side}`) && b.terr.some((c) => MCA_TERR.has(c))).map((b) => b.id);
const values = (m: Record<string, number>, ids?: string[]) => (ids ?? Object.keys(m)).map((id) => m[id] ?? 0);
const max = (xs: number[]) => xs.reduce((a, x) => Math.max(a, x), 0);

const L_M1 = { occlusions: occl('mca_m1_l'), collateral: 'good' as const };
const R_M1_POOR = { occlusions: occl('mca_m1_r'), collateral: 'poor' as const };
// a cerebellar infarct large enough (≥ 38 mL) to swell malignantly (C4-F3)
const PICA_POOR = { occlusions: occl('pica_r', 'sca_r'), collateral: 'poor' as const };

describe('oedema model — basics', () => {
  it('no occlusion → no oedema', () => {
    for (const tH of [0, 1, 72, 2160]) expect(edemaAt({ tH })).toEqual(NO_EDEMA);
  });

  it('nothing is visible at the moment of onset', () => {
    expect(edemaAt({ ...L_M1, tH: 0 })).toEqual(NO_EDEMA);
  });

  it('is deterministic and internally consistent', () => {
    const a = edemaAt({ ...R_M1_POOR, tH: 72 });
    expect(edemaAt({ ...R_M1_POOR, tH: 72 })).toEqual(a);
    for (const m of [a.cytotoxic, a.vasogenic]) {
      for (const v of Object.values(m)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
    // extra volume is the sum of the per-bed swelling
    let r = 0;
    let l = 0;
    let infra = 0;
    for (const [id, sw] of Object.entries(a.swelling)) {
      expect(Number.isFinite(sw)).toBe(true);
      const b = BED_BY_ID[id];
      const reg = REGION_BY_ID[b.region];
      expect(reg.compartment).not.toBe('none');
      if (reg.compartment === 'infra') infra += sw * b.volume;
      else if (reg.side === 'r') r += sw * b.volume;
      else l += sw * b.volume;
    }
    expect(a.extraVolume.supra.r).toBeCloseTo(r, 6);
    expect(a.extraVolume.supra.l).toBeCloseTo(l, 6);
    expect(a.extraVolume.infra).toBeCloseTo(infra, 6);
  });
});

describe('oedema model — time course (left M1, good collaterals)', () => {
  const at = (tH: number) => edemaAt({ ...L_M1, tH });

  it('15 min: DWI already restricted in the MCA territory, but hardly any swelling', () => {
    const e = at(0.25);
    expect(e.phase).toBe('cytotoxic');
    expect(max(values(e.cytotoxic, mcaBeds('l')))).toBeGreaterThan(0.3);
    expect(max(values(e.cytotoxic, mcaBeds('r')))).toBe(0);
    expect(max(values(e.swelling).map(Math.abs))).toBeLessThan(0.01);
    expect(max(values(e.vasogenic))).toBeLessThan(0.01);
    expect(e.midlineShiftMm).toBe(0);
    expect(e.shiftFrom).toBeNull();
  });

  it('goes through cytotoxic → ionic → vasogenic → resolving → atrophy', () => {
    expect(at(0.5).phase).toBe('cytotoxic');
    expect(at(3).phase).toBe('ionic');
    expect(at(72).phase).toBe('vasogenic');
    expect(at(336).phase).toBe('resolving');
    expect(at(2160).phase).toBe('atrophy');
  });

  it('swelling rises from 1 h to ~3 days and falls by 2 weeks', () => {
    const vol = (tH: number) => at(tH).extraVolume.supra.l;
    expect(vol(1)).toBeLessThan(vol(6));
    expect(vol(6)).toBeLessThan(vol(24));
    expect(vol(24)).toBeLessThan(vol(72));
    expect(vol(336)).toBeLessThan(vol(72) / 2);
    // ionic oedema: a few per cent within the first hours
    const early = max(values(at(6).swelling, mcaBeds('l')));
    expect(early).toBeGreaterThan(0.01);
    expect(early).toBeLessThan(0.06);
    // vasogenic peak: clearly swollen, but not a malignant course
    const peak = max(values(at(72).swelling, mcaBeds('l')));
    expect(peak).toBeGreaterThan(0.1);
    expect(peak).toBeLessThan(0.3);
    expect(max(values(at(336).swelling, mcaBeds('l')))).toBeLessThan(peak / 2);
  });

  it('DWI is maximal over the first days and pseudonormalises by 2 weeks', () => {
    const dwi = (tH: number) => max(values(at(tH).cytotoxic, mcaBeds('l')));
    expect(dwi(72)).toBeGreaterThan(dwi(0.25));
    expect(dwi(72)).toBeGreaterThan(0.9);
    expect(dwi(336)).toBeLessThan(0.2);
    expect(dwi(2160)).toBe(0);
    // vasogenic oedema (T2/FLAIR) appears after the barrier breaks down
    const vg = (tH: number) => max(values(at(tH).vasogenic, mcaBeds('l')));
    expect(vg(2)).toBeLessThan(0.05);
    expect(vg(72)).toBeGreaterThan(0.8);
    expect(vg(720)).toBeLessThan(0.1);
  });

  it('shifts the midline only a few mm and compresses the left lateral ventricle', () => {
    const e = at(72);
    expect(e.shiftFrom).toBe('l');
    expect(e.midlineShiftMm).toBeGreaterThan(1);
    expect(e.midlineShiftMm).toBeLessThan(6);
    expect(e.ventricleChange).toBeLessThan(0);
  });

  it('chronic (3 months): infarcted tissue has shrunk and the ventricles enlarge ex vacuo', () => {
    const s = sim({ ...L_M1, tH: 2160 });
    const e = s.edema;
    const infarcted = BEDS.filter((b) => s.beds[b.id].infarct > 0.5).map((b) => b.id);
    expect(infarcted.length).toBeGreaterThan(0);
    for (const id of infarcted) expect(e.swelling[id], id).toBeLessThan(-0.15);
    const full = BEDS.filter((b) => s.beds[b.id].infarct > 0.95).map((b) => e.swelling[b.id]);
    for (const sw of full) {
      expect(sw).toBeLessThanOrEqual(-0.3);
      expect(sw).toBeGreaterThanOrEqual(-0.6);
    }
    expect(e.extraVolume.supra.l).toBeLessThan(0);
    expect(e.midlineShiftMm).toBe(0);
    expect(e.ventricleChange).toBeGreaterThan(0);
  });
});

describe('oedema model — malignant MCA infarction (right M1, poor collaterals)', () => {
  const shift = (tH: number, decompression = false) => edemaAt({ ...R_M1_POOR, tH, decompression }).midlineShiftMm;

  it('swells by 20 %+ and shifts the midline 10–15 mm around day 3', () => {
    const e = edemaAt({ ...R_M1_POOR, tH: 72 });
    expect(e.shiftFrom).toBe('r');
    expect(e.midlineShiftMm).toBeGreaterThan(10);
    expect(e.midlineShiftMm).toBeLessThan(15);
    expect(max(values(e.swelling, mcaBeds('r')))).toBeGreaterThan(0.2);
    expect(e.extraVolume.supra.r).toBeGreaterThan(60);
    expect(e.ventricleChange).toBeLessThan(-0.5);
    expect(shift(12)).toBeLessThan(3);
    // peaks around day 3 (days 2–5), gone after a month
    const series = TIME_STOPS.map((s) => ({ h: s.h, mm: shift(s.h) }));
    const top = series.reduce((a, x) => (x.mm > a.mm ? x : a));
    expect(top.h).toBeGreaterThanOrEqual(48);
    expect(top.h).toBeLessThanOrEqual(120);
    expect(shift(72)).toBeGreaterThan(0.85 * top.mm);
    expect(shift(720)).toBe(0);
  });

  it('sets the level of consciousness through its midline shift (C4-F2)', () => {
    for (const tH of [24, 36, 48, 72, 168, 335, 400]) {
      const s = sim({ ...R_M1_POOR, tH });
      const want = consciousnessFromShift(s.edema.midlineShiftMm);
      const got = s.symptoms.filter((x) => x.id === 'coma' || x.id === 'somnolence');
      if (want) expect(got.some((x) => x.id === want.id && x.sev >= want.sev), `${tH} h`).toBe(true);
    }
  });

  it('decompressive craniectomy removes most of the shift but not the swelling', () => {
    const open = edemaAt({ ...R_M1_POOR, tH: 72, decompression: true });
    const closed = edemaAt({ ...R_M1_POOR, tH: 72 });
    expect(open.midlineShiftMm).toBeLessThan(closed.midlineShiftMm / 2);
    expect(open.midlineShiftMm).toBeGreaterThan(0);
    // the MCA territory is just as swollen — it bulges outwards instead
    const mca = mcaBeds('r');
    expect(max(values(open.swelling, mca))).toBeCloseTo(max(values(closed.swelling, mca)), 6);
    expect(open.extraVolume.supra.r).toBeGreaterThan(60);
    expect(open.ventricleChange).toBeGreaterThan(closed.ventricleChange);
    // before the operation (~36 h) it makes no difference
    expect(shift(24, true)).toBeCloseTo(shift(24), 6);
  });
});

describe('oedema model — treatment and other territories', () => {
  it('early reperfusion gives less day-3 swelling than none', () => {
    const none = edemaAt({ ...L_M1, tH: 72 });
    const early = edemaAt({ ...L_M1, tH: 72, reperfusionH: 1 });
    expect(early.extraVolume.supra.l).toBeLessThan(none.extraVolume.supra.l / 2);
    expect(early.midlineShiftMm).toBeLessThan(none.midlineShiftMm);
  });

  // Y1-0: with good collaterals a reopening at 12 h still saves part of the territory (the infarct
  // grows over a day), so the extra water of reperfusion shows where little is left to save: poor
  // collaterals, reopened at 18 h
  it('late reperfusion of dead tissue transiently adds oedema', () => {
    const none = edemaAt({ ...L_M1, collateral: 'poor', tH: 24 });
    const late = edemaAt({ ...L_M1, collateral: 'poor', tH: 24, reperfusionH: 18 });
    expect(late.extraVolume.supra.l).toBeGreaterThan(none.extraVolume.supra.l);
  });

  it('cerebellar infarct swells in the posterior fossa and causes hydrocephalus', () => {
    // the swelling turns malignant on day 3 (from 48 h, C4-F3); the ventricles take ~12 h to balloon
    const before = sim({ ...PICA_POOR, tH: 36 });
    const s = sim({ ...PICA_POOR, tH: 60 });
    const e = s.edema;
    expect(e.extraVolume.infra).toBeGreaterThan(2);
    expect(Math.abs(e.extraVolume.supra.r) + Math.abs(e.extraVolume.supra.l)).toBeLessThan(0.5);
    expect(e.midlineShiftMm).toBe(0);
    expect(s.hydrocephalus).toBe(true);
    expect(e.ventricleChange).toBeGreaterThan(0.3);
    expect(before.hydrocephalus).toBe(false);
    expect(before.edema.ventricleChange).toBeLessThanOrEqual(0);
    // suboccipital decompression: no obstructive hydrocephalus
    expect(edemaAt({ ...PICA_POOR, tH: 60, decompression: true }).ventricleChange).toBeCloseTo(0, 6);
  });
});
