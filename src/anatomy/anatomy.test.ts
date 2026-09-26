import { describe, expect, it } from 'vitest';
import brainManifest from '../../public/data/brain.json';
import { BEDS, REGIONS, REGION_BY_ID, TARGET_BRAIN_VOLUME, VESSELS, VESSEL_BY_ID, validateAnatomy } from './index';
import { REGION_DEFS } from './regions';
import { SCENARIOS } from './scenarios';
import { SYMPTOM_BY_ID } from './symptoms';
import { VARIANTS } from './variants';

describe('anatomy data integrity', () => {
  it('has no dangling references', () => {
    expect(validateAnatomy()).toEqual([]);
  });

  it('every deficit points to a known symptom', () => {
    for (const d of REGION_DEFS) for (const x of d.deficits) expect(SYMPTOM_BY_ID[x.s], `${d.id}:${x.s}`).toBeDefined();
  });

  it('expands bilateral vessels with mirrored geometry', () => {
    const r = VESSEL_BY_ID.mca_m1_r;
    const l = VESSEL_BY_ID.mca_m1_l;
    expect(r.path[r.path.length - 1][0]).toBeGreaterThan(20);
    expect(l.path[l.path.length - 1][0]).toBeLessThan(-20);
    expect(VESSELS.filter((v) => v.baseId === 'mca_m1')).toHaveLength(2);
  });

  it('scales measured volumes to a typical adult brain', () => {
    const brain = BEDS.filter((b) => ['cortex', 'deep', 'brainstem', 'cerebellum'].includes(REGION_BY_ID[b.region].category));
    const total = brain.reduce((a, b) => a + b.volume, 0);
    expect(total).toBeGreaterThan(TARGET_BRAIN_VOLUME * 0.98);
    expect(total).toBeLessThan(TARGET_BRAIN_VOLUME * 1.02);
  });

  it('gives every brain region a volume and at least one perfusion bed', () => {
    for (const r of REGIONS) {
      expect(r.beds.length, r.id).toBeGreaterThan(0);
      if (['cortex', 'deep', 'brainstem', 'cerebellum'].includes(r.category) && r.baseId !== 'optic_tract') {
        expect(r.volume, r.id).toBeGreaterThan(0.2);
      }
    }
  });

  it('includes border-zone beds from the territory atlas', () => {
    const border = BEDS.filter((b) => b.terr.length === 2);
    expect(border.length).toBeGreaterThan(40);
    for (const b of border) expect(b.supply.every((s) => s.distal)).toBe(true);
  });

  it('mesh manifest only references known beds', () => {
    for (const id of brainManifest.beds) expect(BEDS.some((b) => b.id === id), id).toBe(true);
    const names = brainManifest.meshes.map((m) => m.name);
    expect(names).toEqual(expect.arrayContaining(['hemi_r', 'hemi_l', 'cerebellum', 'brainstem', 'thalamus_r']));
  });

  it('scenarios and variants reference existing vessels', () => {
    for (const s of SCENARIOS) for (const o of s.occlusions) expect(VESSEL_BY_ID[o.vessel], `${s.id}:${o.vessel}`).toBeDefined();
    for (const v of VARIANTS) for (const id of Object.keys(v.vesselScale ?? {})) expect(VESSEL_BY_ID[id], id).toBeDefined();
  });
});
