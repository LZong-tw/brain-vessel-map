import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { REPERFUSION_STOPS } from '../anatomy/timeline';
import { simulate } from '../engine/simulate';
import { RECANALISATION_EVIDENCE, type SiteGroup } from '../anatomy/recanalisation';
import { DEFAULT_TREATMENT, type TreatmentOptions } from '../engine/treatment';
import { distalOptions, evidenceRows, reopenedVesselIds, treatmentWarnings } from './treatment';

/**
 * The settings panel works out which arteries a treatment reopens from the store alone; the
 * engine decides the same thing when it simulates. The two must never disagree, or the panel
 * would offer distal-embolus choices and evidence for the wrong artery.
 */
describe('the settings panel and the engine agree on what treatment reopens', () => {
  it.each(SCENARIOS.map((s) => [s.id, s] as const))('%s', (_id, sc) => {
    const times = [...REPERFUSION_STOPS, ...(sc.reperfusionH != null ? [sc.reperfusionH] : [])];
    for (const reperfusionH of times) {
      const r = simulate({
        occlusions: sc.occlusions,
        variants: sc.variants ?? [],
        collateral: sc.collateral ?? 'good',
        map: sc.map ?? 93,
        tH: 24,
        reperfusionH,
        decompression: false,
        // a non-default treatment, so that the engine reports what it reopened
        treatment: { ...DEFAULT_TREATMENT, grade: '2b67' },
      });
      expect([...reopenedVesselIds(sc.occlusions, reperfusionH)].sort(), `reperfusion ${reperfusionH} h`).toEqual([...(r.treatment?.reopened ?? [])].sort());
    }
  });
});

// ── cluster C2 of the clinical-detail audit: warnings, published figures and embolus choices ──

const evRows = (sites: SiteGroup[], method: TreatmentOptions['method'], lang: 'en' | 'zh-TW' = 'en', delayH?: number) =>
  evidenceRows(RECANALISATION_EVIDENCE, sites, method, lang, delayH === undefined ? {} : { delayH });
const warn = (method: TreatmentOptions['method'], delayH: number, sites: SiteGroup[], lang: 'en' | 'zh-TW' = 'en') =>
  treatmentWarnings({ ...DEFAULT_TREATMENT, method }, delayH, sites, RECANALISATION_EVIDENCE, lang);
const keys = (w: { key: string }[]) => w.map((x) => x.key);

describe('C2-F1: windows and warnings by site', () => {
  it('basilar IV thrombolysis beyond 4.5 h is flagged as expert consensus, not as outside every window', () => {
    const w = warn('ivt', 8, ['basilar']);
    expect(keys(w)).toContain('ivtWindowConsensus');
    expect(keys(w)).not.toContain('ivtWindow');
    const t = w.find((x) => x.key === 'ivtWindowConsensus')!.text;
    expect(t).toMatch(/expert consensus/);
    expect(t).toMatch(/24 h/);
    expect(t).toMatch(/very low certainty/);
    expect(warn('ivt', 8, ['basilar'], 'zh-TW').find((x) => x.key === 'ivtWindowConsensus')!.text).toMatch(/專家共識/);
    // beyond 24 h, or at another site, the ordinary warning
    expect(keys(warn('ivt', 30, ['basilar']))).toContain('ivtWindow');
    expect(keys(warn('ivt', 8, ['m1']))).toContain('ivtWindow');
    expect(keys(warn('ivt', 8, ['basilar', 'm1']))).toContain('ivtWindow');
  });

  it('thrombectomy at a site no trial tested gets a warning; a tandem lesion with an M1 does not', () => {
    for (const sites of [['other'], ['vertebral']] as SiteGroup[][]) {
      const w = warn('evt', 3, sites);
      expect(keys(w), sites.join()).toContain('evtNoTrial');
      expect(w.find((x) => x.key === 'evtNoTrial')!.text).toMatch(/not been tested in randomised trials/);
      expect(keys(warn('bridging', 3, sites))).toContain('evtNoTrial');
      expect(keys(warn('ivt', 3, sites))).not.toContain('evtNoTrial');
    }
    expect(keys(warn('evt', 3, ['other', 'm1']))).not.toContain('evtNoTrial');
    expect(keys(warn('evt', 3, ['basilar', 'vertebral']))).not.toContain('evtNoTrial');
    expect(keys(warn('evt', 3, ['m1']))).toEqual([]);
  });

  it('the evidence keeps the standard windows and adds the basilar consensus window', () => {
    expect(RECANALISATION_EVIDENCE.ivtConsensusWindowH).toEqual({ basilar: 24 });
  });
});

describe('C2-F2: tenecteplase and thrombolysis beyond 4.5 h', () => {
  it('IV thrombolysis and bridging show the tenecteplase figures; thrombectomy alone does not', () => {
    const ivt = evRows(['m1'], 'ivt');
    const tnk = ivt.find((r) => r.key === 'tnk-sich')!;
    expect(tnk.value).toBe('3.4%');
    expect(tnk.note).toMatch(/AcT/);
    expect(tnk.note).toMatch(/3\.2%/);
    expect(tnk.source).toContain('Menon BK et al. Lancet 2022;400:161–169 (AcT)');
    const pre = evRows(['m1'], 'bridging').find((r) => r.key === 'tnk-reperfusion')!;
    expect(pre.value).toBe('22%');
    expect(pre.note).toMatch(/10%/);
    expect(pre.source).toContain('Campbell BCV et al. N Engl J Med 2018;378:1573–1582 (EXTEND-IA TNK)');
    expect(evRows(['m1'], 'evt').some((r) => r.key.startsWith('tnk'))).toBe(false);
    // no large-vessel site, no EXTEND-IA TNK row
    expect(evRows(['other'], 'ivt').some((r) => r.key === 'tnk-reperfusion')).toBe(false);
  });

  it('beyond 4.5 h the imaging-selected late-thrombolysis trials are shown', () => {
    expect(evRows(['m1'], 'ivt', 'en', 3).some((r) => r.key === 'lateIvt')).toBe(false);
    const late = evRows(['m1'], 'ivt', 'en', 8).find((r) => r.key === 'lateIvt')!;
    for (const s of ['WAKE-UP', 'EXTEND', 'TRACE-III', '53.3%', '41.8%', '35.4%', '29.5%', '33.0%', '24.2%', '6.2% vs 0.9%', '3.0% vs 0.8%'])
      expect(late.note, s).toContain(s);
    expect(late.note).toMatch(/non-contrast CT/);
    expect(evRows(['m1'], 'evt', 'en', 8).some((r) => r.key === 'lateIvt')).toBe(false);
  });

  it('the IV thrombolysis window warning names imaging selection and tenecteplase up to 24 h', () => {
    const t = warn('ivt', 6, ['m1']).find((x) => x.key === 'ivtWindow')!.text;
    expect(t).toMatch(/WAKE-UP/);
    expect(t).toMatch(/EXTEND/);
    expect(t).toMatch(/TRACE-III/);
    const zh = warn('ivt', 6, ['m1'], 'zh-TW').find((x) => x.key === 'ivtWindow')!.text;
    expect(zh).toMatch(/WAKE-UP/);
  });
});

describe('C2-F3: large-core thrombectomy figures', () => {
  it('thrombectomy for an ICA/M1 occlusion shows the large-core haemorrhage row', () => {
    const r = evRows(['m1'], 'evt').find((x) => x.key === 'sich-largeCore')!;
    expect(r.note).toMatch(/6\.1%.*2\.7%/);
    expect(r.note).toMatch(/9\.6%.*5\.7%/);
    expect(r.note).toMatch(/SELECT2/);
    expect(r.note).toMatch(/TENSION/);
    expect(r.source).toContain('Costalat V');
    expect(evRows(['m1'], 'ivt').some((x) => x.key === 'sich-largeCore')).toBe(false);
    expect(evRows(['m2'], 'evt').some((x) => x.key === 'sich-largeCore')).toBe(false);
  });
});

describe('C2-F5: the IV thrombolysis window refers to drug start', () => {
  it('the warning says the drug must be started within 4.5 h and that reopening comes 1–3 h later', () => {
    const t = warn('ivt', 6, ['m1']).find((x) => x.key === 'ivtWindow')!.text;
    expect(t).toMatch(/started within 4\.5 h/);
    expect(t).toMatch(/1–3 h/);
    expect(t).toMatch(/6 h after onset/);
    const zh = warn('ivt', 6, ['m1'], 'zh-TW').find((x) => x.key === 'ivtWindow')!.text;
    expect(zh).toMatch(/4\.5 小時內開始/);
    expect(zh).toMatch(/1–3 小時/);
  });
});

describe('C2-F6: medium/distal vessel occlusions', () => {
  it('thrombectomy for M2 or distal sites shows the MeVO trials’ haemorrhage instead of the LVO figure', () => {
    for (const g of ['m2', 'distal'] as SiteGroup[]) {
      const rows = evRows([g], 'evt');
      const s = rows.filter((r) => r.key.startsWith('sich'));
      expect(s.map((r) => r.key), g).toEqual(['sich-mevo']);
      expect(s[0].note).toMatch(/5\.4% vs 2\.2%/);
      expect(s[0].note).toMatch(/5\.9% vs 2\.6%/);
      expect(s[0].value).toBe('5.4–5.9%');
    }
    // an M1 keeps the general row
    expect(evRows(['m1'], 'evt').some((r) => r.key === 'sich')).toBe(true);
  });

  it('warns that thrombectomy for a medium/distal vessel did not help in the 2025 trials', () => {
    for (const g of ['m2', 'distal'] as SiteGroup[]) {
      const w = warn('evt', 3, [g]);
      expect(keys(w), g).toContain('evtMevo');
      const t = w.find((x) => x.key === 'evtMevo')!.text;
      expect(t).toMatch(/ESCAPE-MeVO/);
      expect(t).toMatch(/higher mortality/);
      expect(t).toMatch(/dominant/);
      expect(keys(warn('ivt', 3, [g]))).not.toContain('evtMevo');
    }
    expect(keys(warn('evt', 3, ['m1', 'm2']))).not.toContain('evtMevo');
  });

  it('the M2 and distal thrombectomy notes give the negative result and the harm', () => {
    for (const g of ['m2', 'distal'] as const) {
      const n = RECANALISATION_EVIDENCE.success[g]!.evt!.note;
      expect(n.en, g).toMatch(/13\.3% vs 8\.4%/);
      expect(n.en, g).toMatch(/5\.4% vs 2\.2%/);
      expect(n.en, g).toMatch(/5\.9% vs 2\.6%/);
      expect(n.zh, g).toMatch(/13\.3%/);
    }
  });
});

describe('C2-F8: basilar IV thrombolysis', () => {
  it('labels 4–13% as early recanalisation and adds the later case-series figure', () => {
    const r = RECANALISATION_EVIDENCE.success.basilar!.ivt!;
    expect(r.note.en).toMatch(/early/);
    expect(r.note.en).toMatch(/within about 3 h/);
    expect(r.note.en).toMatch(/53% \(40\/76\)/);
    expect(r.note.en).toMatch(/78% vs 76%/);
    expect(r.note.zh).toMatch(/53%（40\/76）/);
    expect(r.source).toContain('Lindsberg PJ, Mattle HP. Stroke 2006;37:922–928');
  });

  it('the basilar warning does not call thrombolysis futile and points to thrombectomy for NIHSS ≥ 10', () => {
    const t = warn('ivt', 3, ['basilar']).find((x) => x.key === 'ivtLargeVessel')!.text;
    expect(t).not.toMatch(/rarely reopens/);
    expect(t).toMatch(/about 50%/);
    expect(t).toMatch(/NIHSS ≥ 10/);
    const m1 = warn('ivt', 3, ['m1']).find((x) => x.key === 'ivtLargeVessel')!.text;
    expect(m1).toMatch(/early reopening/i);
  });
});

describe('C2-F9: distal and new-territory emboli', () => {
  it('every downstream cortical branch stays selectable', () => {
    const t = distalOptions(['ica_terminal_r']).downstream;
    for (const id of ['mca_temporooccipital_r', 'mca_temporal_posterior_r', 'mca_temporal_middle_r', 'aca_paracentral_r']) expect(t, id).toContain(id);
    const b = distalOptions(['basilar_mid']).downstream;
    for (const id of ['pca_calcarine_l', 'pca_parietooccipital_l', 'pca_splenial_r', 'pca_splenial_l']) expect(b, id).toContain(id);
  });

  it('an M1 or M2 target can embolise to the ipsilateral ACA (new territory)', () => {
    for (const target of ['mca_m1_l', 'mca_m2_sup_l']) {
      const o = distalOptions([target]);
      expect(o.newTerritory, target).toEqual(expect.arrayContaining(['aca_a2_l', 'aca_callosomarginal_l', 'aca_pericallosal_l']));
      expect(o.newTerritory.some((id) => o.downstream.includes(id))).toBe(false);
      expect(o.newTerritory.some((id) => id.endsWith('_r'))).toBe(false);
    }
    // for an ICA terminus the ACA is downstream already
    expect(distalOptions(['ica_terminal_r']).newTerritory).toEqual([]);
  });

  it('splits the evidence into downstream and new-territory emboli, for thrombectomy only', () => {
    const rows = evRows(['m1'], 'evt');
    const d = rows.find((r) => r.key === 'distal')!;
    const n = rows.find((r) => r.key === 'newTerritory')!;
    expect(d.note).toMatch(/22%/);
    expect(d.note).toMatch(/5\.54.*0\.94–32\.49/);
    expect(d.note).toMatch(/not statistically significant/);
    expect(n.note).toMatch(/5%/);
    expect(n.note).toMatch(/9\.3%/);
    expect(n.note).toMatch(/ACA/);
    expect(n.note).toMatch(/ICA 5%, MCA 25%, vertebrobasilar 57%/);
    expect(n.note).toMatch(/88\.3%/);
    expect(evRows(['m1'], 'ivt').some((r) => r.key === 'distal' || r.key === 'newTerritory')).toBe(false);
  });
});
