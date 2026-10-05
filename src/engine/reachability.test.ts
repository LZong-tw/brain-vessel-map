/**
 * Guards against rules that exist but can never be triggered: every named syndrome, every
 * symptom and every brain region must be reachable by some combination of the inputs the
 * app offers (single occlusions, lacunes, variants, blood pressure, treatment, time).
 */
import { describe, expect, it } from 'vitest';
import { REGIONS, VESSELS } from '../anatomy';
import { SYMPTOMS } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { VARIANTS } from '../anatomy/variants';
import type { Occlusion } from './hemodynamics';
import { isOccludable, simulate } from './simulate';

type Run = { o: Occlusion[]; c: 'good' | 'moderate' | 'poor'; v: string[]; map: number };

function runs(): Run[] {
  const out: Run[] = [];
  for (const v of VESSELS.filter((x) => isOccludable(x.id)))
    for (const c of ['good', 'moderate', 'poor'] as const) out.push({ o: [{ vessel: v.id, severity: 1 }], c, v: [], map: 93 });
  for (const v of VESSELS.filter((x) => x.kind === 'perforator' && (x.n ?? 1) > 1))
    out.push({ o: [{ vessel: v.id, severity: 1, branch: true }], c: 'good', v: [], map: 93 });
  out.push({
    o: [
      { vessel: 'thalamogeniculate_l', severity: 1, branch: true },
      { vessel: 'lenticulostriate_l', severity: 1, branch: true },
    ],
    c: 'good',
    v: [],
    map: 93,
  });
  for (const va of VARIANTS)
    for (const v of ['ica_cervical_r', 'basilar_mid', 'pca_p1_r', 'aca_a1_r', 'va_v4_dist_r', 'va_v4_dist_l', 'subclavian_prox_l'])
      out.push({ o: [{ vessel: v, severity: 1 }], c: 'moderate', v: [va.id], map: 93 });
  for (const map of [45, 60]) out.push({ o: [{ vessel: 'ica_cervical_r', severity: 0.85 }], c: 'good', v: [], map });
  for (const pair of [
    ['pca_p2_r', 'pca_p2_l'],
    ['thalamoperforator_r', 'thalamoperforator_l'],
    ['va_v4_dist_r', 'va_v4_dist_l'],
  ])
    out.push({ o: pair.map((vessel) => ({ vessel, severity: 1 })), c: 'moderate', v: [], map: 93 });
  return out;
}

describe('reachability', () => {
  it('every syndrome, symptom and region can be produced', () => {
    const syn = new Set<string>();
    const sym = new Set<string>();
    const reg = new Set<string>();
    for (const r of runs()) {
      for (const [tH, reperfusionH, decompression] of [
        [24, null, false],
        [2160, null, false],
        [72, null, true],
      ] as const) {
        const s = simulate({ occlusions: r.o, variants: r.v, collateral: r.c, map: r.map, reperfusionH, decompression, tH });
        s.syndromes.forEach((x) => syn.add(x.def.id));
        s.symptoms.forEach((x) => sym.add(x.id));
        for (const [id, st] of Object.entries(s.regions)) if (st.dys >= 0.25 || st.infarct >= 0.25) reg.add(id);
      }
    }
    // a swollen cerebellum compressing the brainstem (C4-F3): PICA + SCA, day 3, untreated
    const cb = simulate({ occlusions: [{ vessel: 'pica_r', severity: 1 }, { vessel: 'sca_r', severity: 1 }], variants: [], collateral: 'poor', map: 93, reperfusionH: null, decompression: false, tH: 72 });
    cb.symptoms.forEach((x) => sym.add(x.id));
    expect(SYNDROMES.map((s) => s.id).filter((id) => !syn.has(id))).toEqual([]);
    expect(SYMPTOMS.map((s) => s.id).filter((id) => !sym.has(id))).toEqual([]);
    expect(REGIONS.map((r) => r.id).filter((id) => !reg.has(id))).toEqual([]);
  }, 120000);
});
