/**
 * Z4-14: the ACA label names an infarct of the ACA territory also when collaterals save the
 * paracentral lobule (the medial frontal and cingulate cortex with the corpus callosum: abulia,
 * incontinence, alien hand, a transcortical motor aphasia); and the watershed label, whose text
 * attributes the border-zone picture to a carotid stenosis or occlusion with low blood pressure
 * (Bogousslavsky J, Regli F. Neurology 1986;36:373–377), or to a tight MCA stenosis (Wong KS et al.
 * Ann Neurol 2002;52:74–81), needs such a haemodynamic setting: a single distal branch occluded by an
 * embolus is a branch-territory infarct, not a watershed infarct.
 */
import { describe, expect, it } from 'vitest';
import { VESSELS } from '../anatomy';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { isOccludable, simulate, type SimInput, type SimResult } from './simulate';

const run = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'good', map: 93, tH, reperfusionH: null, decompression: false, ...over });
const labels = (r: SimResult) => r.syndromes.map((m) => m.def.id + (m.side ? `/${m.side}` : ''));
const STOPS = TIME_STOPS.map((s) => s.h);
const GRADES: CollateralGrade[] = ['good', 'moderate', 'poor'];

describe('Z4-14: the ACA label without the paracentral lobule', () => {
  it.each(['r', 'l'] as const)('an A2 occlusion (%s) carries the ACA label with any collaterals, early and at 3 months', (side) => {
    for (const collateral of GRADES)
      for (const t of [24, 2160]) {
        const r = run([{ vessel: `aca_a2_${side}`, severity: 1 }], t, { collateral });
        expect(labels(r), `${collateral} ${t} h`).toContain(`aca/${side}`);
        expect(labels(r), `${collateral} ${t} h`).not.toContain(`watershed/${side}`);
      }
  });

  it('the moderate-collateral A2 picture it names: abulia, alien hand, incontinence, a transcortical motor aphasia, the paracentral lobule spared', () => {
    const r = run([{ vessel: 'aca_a2_l', severity: 1 }], 24, { collateral: 'moderate' });
    expect(r.regions.paracentral_l.infarct).toBeLessThan(0.3);
    for (const id of ['abulia', 'alien_hand', 'incontinence', 'aphasia_tc_motor']) expect(r.symptoms.map((s) => s.id), id).toContain(id);
    expect(labels(r)).toContain('aca/l');
  });

  it('the label text says that a spared paracentral lobule spares the leg', () => {
    const r = run([{ vessel: 'aca_a2_l', severity: 1 }], 24, { collateral: 'moderate' });
    const aca = r.syndromes.find((m) => m.def.id === 'aca')!;
    expect(aca.def.desc.en).toMatch(/paracentral lobule/);
    expect(aca.def.desc.zh).toContain('旁中央小葉');
  });
});

describe('Z4-14: the watershed label needs a haemodynamic setting', () => {
  it('a single distal branch (pericallosal, prefrontal, posterior parietal, temporal) is never labelled watershed', () => {
    for (const vessel of ['aca_pericallosal_l', 'aca_pericallosal_r', 'mca_prefrontal_l', 'mca_post_parietal_r', 'mca_temporooccipital_r', 'pca_temporal_r'])
      for (const collateral of GRADES)
        for (const t of STOPS) {
          const got = labels(run([{ vessel, severity: 1 }], t, { collateral }));
          expect(got.filter((l) => l.startsWith('watershed') || l === 'man_in_barrel'), `${vessel} ${collateral} ${t} h`).toEqual([]);
        }
  });

  it('a stenosis of a distal branch is not a haemodynamic setting either', () => {
    for (const vessel of ['aca_a2_r', 'mca_m2_sup_l', 'mca_m2_inf_r'])
      for (const t of [24, 120, 336]) {
        const got = labels(run([{ vessel, severity: 0.85 }], t));
        expect(got.some((l) => l.startsWith('watershed')), `${vessel} 85 % ${t} h`).toBe(false);
      }
  });

  it('carotid stenosis with low blood pressure keeps its watershed label; so do both carotids narrowed at a mean pressure of 70', () => {
    const sc = SCENARIO_BY_ID.watershed;
    for (const t of [24, 336]) expect(labels(run(sc.occlusions, t, { map: sc.map }))).toContain('watershed/r');
    const both: Occlusion[] = [
      { vessel: 'ica_cervical_l', severity: 0.85 },
      { vessel: 'ica_cervical_r', severity: 0.85 },
    ];
    expect(labels(run(both, 24, { map: 70 }))).toContain('man_in_barrel');
    expect(labels(run(both, 336, { map: 70 }))).toEqual(expect.arrayContaining(['watershed/r', 'watershed/l']));
  });

  // the class: over every single occlusion and grade, a watershed label only with a proximal tight
  // stenosis or occlusion on its side or a low blood pressure
  it('no single occlusion of a vessel beyond the carotid and M1 gets the watershed label at a normal pressure', () => {
    const proximal = /^(aortic_arch|brachiocephalic|cca_|ica_|mca_m1_)/;
    for (const v of VESSELS) {
      if (!isOccludable(v.id) || proximal.test(v.id)) continue;
      for (const collateral of GRADES)
        for (const t of [24, 336]) {
          const got = labels(run([{ vessel: v.id, severity: 1 }], t, { collateral }));
          expect(got.some((l) => l.startsWith('watershed') || l === 'man_in_barrel'), `${v.id} ${collateral} ${t} h`).toBe(false);
        }
    }
  });
});
