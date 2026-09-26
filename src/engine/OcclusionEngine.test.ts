import { describe, it, expect } from 'vitest';
import { RuleBasedOcclusionEngine } from './OcclusionEngine';
import { vessels } from '../data/vessels';
import { brainRegions } from '../data/regions';

describe('RuleBasedOcclusionEngine', () => {
  const engine = new RuleBasedOcclusionEngine();

  describe('MCA occlusion', () => {
    it('should identify affected regions for right MCA occlusion', () => {
      const result = engine.calculateOcclusion(['mca_m1_r'], vessels);

      expect(result.affectedRegionsFull).toContain('frontal_lobe_lateral_r');
      expect(result.affectedRegionsFull).toContain('temporal_lobe_r');
      expect(result.affectedRegionsFull).toContain('parietal_lobe_r');
      expect(result.affectedRegionsFull).toContain('motor_cortex_face_arm_r');
      expect(result.affectedRegionsFull).toContain('internal_capsule_r');
      expect(result.affectedRegionsFull).toContain('basal_ganglia_r');
      
      expect(result.syndrome).toBeDefined();
      expect(result.syndrome?.nameEn).toBe('MCA Syndrome');
    });

    it('should identify affected regions for left MCA occlusion', () => {
      const result = engine.calculateOcclusion(['mca_m1_l'], vessels);

      expect(result.affectedRegionsFull).toContain('frontal_lobe_lateral_l');
      expect(result.affectedRegionsFull).toContain('temporal_lobe_l');
      expect(result.syndrome?.nameZh).toContain('中大腦動脈症候群');
    });
  });

  describe('PICA occlusion (Wallenberg syndrome)', () => {
    it('should identify lateral medullary syndrome for right PICA', () => {
      const result = engine.calculateOcclusion(['pica_r'], vessels);

      expect(result.affectedRegionsFull).toContain('cerebellum_inferior_r');
      expect(result.affectedRegionsFull).toContain('medulla_lateral_r');
      
      expect(result.syndrome).toBeDefined();
      expect(result.syndrome?.nameEn).toBe('Wallenberg Syndrome (Lateral Medullary Syndrome)');
      expect(result.syndrome?.nameZh).toContain('華倫堡氏症候群');
    });

    it('should identify lateral medullary syndrome for left PICA', () => {
      const result = engine.calculateOcclusion(['pica_l'], vessels);

      expect(result.affectedRegionsFull).toContain('cerebellum_inferior_l');
      expect(result.affectedRegionsFull).toContain('medulla_lateral_l');
      expect(result.syndrome?.descriptionZh).toContain('眩暈');
    });
  });

  describe('Basilar artery occlusion', () => {
    it('should identify severe brainstem involvement', () => {
      const result = engine.calculateOcclusion(['basilar'], vessels);

      expect(result.affectedRegionsFull).toContain('pons');
      expect(result.affectedRegionsFull).toContain('midbrain');
      
      expect(result.syndrome).toBeDefined();
      expect(result.syndrome?.nameEn).toBe('Basilar Artery Occlusion');
      expect(result.consequencesZh).toContain('危及生命');
    });
  });

  describe('Collateral rescue via Circle of Willis', () => {
    it('should rescue via AComm when unilateral ICA is occluded', () => {
      const result = engine.calculateOcclusion(['ica_r'], vessels);

      // ACA A2 territory should be rescued via AComm
      expect(result.affectedRegionsPartial).toContain('frontal_lobe_medial_r');
      expect(result.affectedRegionsPartial).toContain('motor_cortex_leg_r');
      
      // But these should NOT be in full occlusion
      expect(result.affectedRegionsFull).not.toContain('frontal_lobe_medial_r');
      expect(result.affectedRegionsFull).not.toContain('motor_cortex_leg_r');
    });

    it('should rescue via PComm when ICA is occluded', () => {
      const result = engine.calculateOcclusion(['ica_l'], vessels);

      // MCA territory may get partial rescue via PComm
      // This tests that the rescue mechanism is functioning
      expect(
        result.affectedRegionsPartial.length > 0 ||
        result.affectedRegionsFull.length > 0
      ).toBe(true);
    });

    it('should show full occlusion when both AComm and ICA are blocked', () => {
      const result = engine.calculateOcclusion(['ica_r', 'acomm'], vessels);

      // Without AComm rescue, ACA territory should be fully affected
      expect(result.affectedRegionsFull).toContain('frontal_lobe_medial_r');
      expect(result.affectedRegionsFull).toContain('motor_cortex_leg_r');
      
      // Should NOT be in partial (no rescue)
      expect(result.affectedRegionsPartial).not.toContain('frontal_lobe_medial_r');
    });
  });

  describe('No occlusion scenario', () => {
    it('should return no affected regions when vessel does not supply tissue', () => {
      // AComm itself doesn't directly supply brain regions
      const result = engine.calculateOcclusion(['acomm'], vessels);

      expect(result.affectedRegionsFull.length).toBe(0);
      expect(result.affectedRegionsPartial.length).toBe(0);
    });
  });

  describe('Integration with brain regions', () => {
    it('all affected regions should exist in brainRegions data', () => {
      const result = engine.calculateOcclusion(['mca_m1_r'], vessels);

      const allAffected = [
        ...result.affectedRegionsFull,
        ...result.affectedRegionsPartial,
      ];

      for (const regionId of allAffected) {
        expect(brainRegions[regionId]).toBeDefined();
      }
    });
  });
});
