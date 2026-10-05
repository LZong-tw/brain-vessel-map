import { describe, expect, it } from 'vitest';
import { UI } from '../i18n/ui';
import { dropEmbolus } from '../engine/embolus';
import { absentVessels, simulateHemodynamics } from '../engine/hemodynamics';
import { simulate, type SimInput } from '../engine/simulate';
import { VESSEL_BY_ID } from './index';
import { SCENARIO_BY_ID } from './scenarios';
import { VARIANT_BY_ID } from './variants';

/**
 * Anatomical variants (clinical-detail audit, cluster C8): prevalence figures that match the
 * cited MRA series, a default anatomy that says how common it is, and variant texts that say what
 * the model does with them.
 */
const sim = (over: Partial<SimInput>) =>
  simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false, ...over });
const occl = (...ids: string[]) => ids.map((vessel) => ({ vessel, severity: 1 }));

describe('C8-F4: how common an incomplete circle of Willis is', () => {
  it('gives the Tromsø MRA prevalence of a missing or hypoplastic AComm and PComm', () => {
    const acomm = VARIANT_BY_ID.acomm_absent;
    expect(acomm.prevalence.en).toContain('20–25%');
    expect(acomm.prevalence.zh).toContain('20–25%');
    for (const s of ['r', 'l']) {
      const p = VARIANT_BY_ID[`pcomm_absent_${s}`];
      for (const lang of ['zh', 'en'] as const) {
        expect(p.prevalence[lang]).toContain('50–60%');
        expect(p.prevalence[lang]).toContain('28%');
      }
    }
  });

  it('says that "missing" on MRA includes vessels under 1 mm while the model removes the vessel', () => {
    for (const id of ['acomm_absent', 'pcomm_absent_r', 'pcomm_absent_l']) {
      expect(VARIANT_BY_ID[id].desc.en, id).toContain('1 mm');
      expect(VARIANT_BY_ID[id].desc.zh, id).toContain('1 mm');
      expect(VARIANT_BY_ID[id].desc.en, id).toContain('removes');
      expect(VARIANT_BY_ID[id].desc.zh, id).toContain('完全移除');
    }
  });

  it('the PComm itself is described as missing or hypoplastic in more than half of people on each side', () => {
    const d = VESSEL_BY_ID.pcomm_r.desc;
    expect(d.en).toContain('more than half');
    expect(d.zh).toContain('一半以上');
    expect(d.zh).not.toContain('約 1/4');
  });

  it('the case panel and the silent-ICA scenario say that a complete circle is a minority anatomy', () => {
    expect(UI.en.variantsHint).toContain('12–42%');
    expect(UI['zh-TW'].variantsHint).toContain('12–42%');
    const s = SCENARIO_BY_ID.ica_silent.summary;
    expect(s.en).toContain('12–42%');
    expect(s.zh).toContain('12–42%');
    expect(s.en).toContain('AComm');
    expect(s.zh).toContain('前交通動脈');
  });

  it('as the scenario says, without the AComm the same ICA occlusion leaves a large infarct', () => {
    const ica = occl('ica_cervical_r');
    expect(sim({ occlusions: ica }).volumes.finalInfarct).toBe(0);
    expect(sim({ occlusions: ica, variants: ['acomm_absent'] }).volumes.finalInfarct).toBeGreaterThan(50);
  });
});

describe('C8-F6: vertebral hypoplasia', () => {
  it('says that tolerating a dominant-vertebral occlusion depends on the PComms', () => {
    for (const s of ['r', 'l']) {
      const d = VARIANT_BY_ID[`va_hypoplastic_${s}`].desc;
      expect(d.en).not.toContain('poorly tolerated');
      expect(d.en).toContain('PComms');
      expect(d.en).toContain('28%');
      expect(d.zh).toContain('後交通動脈');
      expect(d.zh).toContain('28%');
    }
  });

  it('the model does what the text says: silent with both PComms, severe brainstem ischaemia without them', () => {
    const occlusions = occl('va_extracranial_l');
    expect(sim({ occlusions, variants: ['va_hypoplastic_r'] }).nihss.total).toBe(0);
    const without = sim({ occlusions, variants: ['va_hypoplastic_r', 'pcomm_absent_r', 'pcomm_absent_l'] });
    expect(without.nihss.total).toBeGreaterThan(20);
    expect(without.syndromes.map((m) => m.def.id)).toContain('locked_in');
  });
});

describe('C8-F7: persistent trigeminal artery', () => {
  const PTA = ['persistent_trigeminal_r'];
  const hemo = (variants: string[]) => simulateHemodynamics({ occlusions: [], variants, map: 93, collateral: 'good' });

  it('is a variant with its cited prevalence, one side at a time', () => {
    for (const s of ['r', 'l']) {
      const v = VARIANT_BY_ID[`persistent_trigeminal_${s}`];
      expect(v, s).toBeDefined();
      expect(v.prevalence.en).toContain('0.06–0.2%');
      expect(v.prevalence.zh).toContain('0.06–0.2%');
      expect(v.desc.en).toContain('carotid emboli');
      expect(v.desc.zh).toContain('頸動脈的栓子');
      expect(v.excludes).toContain(`persistent_trigeminal_${s === 'r' ? 'l' : 'r'}`);
    }
  });

  it('does not exist in the default anatomy: no flow, and the views leave it out', () => {
    expect(VESSEL_BY_ID.trigeminal_persistent_r.variantOnly).toBe(true);
    expect(hemo([]).vesselFlow.trigeminal_persistent_r).toBe(0);
    expect(absentVessels([])).toEqual(new Set(['trigeminal_persistent_r', 'trigeminal_persistent_l']));
    expect(absentVessels(PTA).has('trigeminal_persistent_r')).toBe(false);
    expect(absentVessels(PTA).has('trigeminal_persistent_l')).toBe(true);
    // a variant that removes a vessel hides it too
    expect(absentVessels(['acomm_absent']).has('acomm')).toBe(true);
  });

  it('with the variant, the carotid feeds the upper basilar artery through it and the lower basilar artery is smaller', () => {
    const h = hemo(PTA);
    const base = hemo([]);
    expect(h.vesselFlow.trigeminal_persistent_r).toBeGreaterThan(30);
    expect(h.vesselFlow.trigeminal_persistent_r).toBeGreaterThan(h.vesselFlow.basilar_mid);
    expect(h.vesselFlow.basilar_mid).toBeLessThan(0.5 * base.vesselFlow.basilar_mid);
    expect(h.vesselFlow.ica_cervical_r).toBeGreaterThan(base.vesselFlow.ica_cervical_r);
  });

  it('lets carotid emboli reach the brainstem and cerebellar arteries, which they cannot without it', () => {
    const POSTERIOR_FOSSA = new Set(['BA', 'SCA', 'AICA', 'PICA']);
    const lodged = (variants: string[]) => {
      const h = hemo(variants);
      let posterior = 0;
      let through = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const e = dropEmbolus('carotid_r', 1.5, h, seed);
        if (POSTERIOR_FOSSA.has(VESSEL_BY_ID[e.lodged].family)) posterior++;
        if (e.steps.some((st) => st.vessel === 'trigeminal_persistent_r')) through++;
      }
      return { posterior, through };
    };
    expect(lodged([])).toEqual({ posterior: 0, through: 0 });
    const withPta = lodged(PTA);
    expect(withPta.through).toBeGreaterThan(10);
    expect(withPta.posterior).toBeGreaterThan(5);
  });
});
