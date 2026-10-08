import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { REPERFUSION_STOPS } from '../anatomy/timeline';
import { simulate } from '../engine/simulate';
import { RECANALISATION_EVIDENCE, siteGroupOf, type SiteGroup } from '../anatomy/recanalisation';
import { DEFAULT_TREATMENT, type TreatmentOptions } from '../engine/treatment';
import { distalOptions, evidenceRows, isThrombectomyTarget, reopenedVesselIds, sitesOf, treatmentWarnings } from './treatment';

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
    const t = warn('ivt', 8, ['m1']).find((x) => x.key === 'ivtWindow')!.text;
    expect(t).toMatch(/WAKE-UP/);
    expect(t).toMatch(/EXTEND/);
    expect(t).toMatch(/TRACE-III/);
    const zh = warn('ivt', 8, ['m1'], 'zh-TW').find((x) => x.key === 'ivtWindow')!.text;
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
    const t = warn('ivt', 8, ['m1']).find((x) => x.key === 'ivtWindow')!.text;
    expect(t).toMatch(/started within 4\.5 h/);
    expect(t).toMatch(/1–3 h/);
    expect(t).toMatch(/8 h after onset/);
    const zh = warn('ivt', 8, ['m1'], 'zh-TW').find((x) => x.key === 'ivtWindow')!.text;
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

// ── review of the audit fixes (group R4): timing, scope and wording of the treatment warnings ──

const warnFor = (method: TreatmentOptions['method'], delayH: number, reopened: string[], lang: 'en' | 'zh-TW' = 'en') =>
  treatmentWarnings({ ...DEFAULT_TREATMENT, method }, delayH, sitesOf(reopened, siteGroupOf), RECANALISATION_EVIDENCE, lang, reopened);

describe('R4-2: IV thrombolysis that reopens the artery within 1 h of onset', () => {
  it('is flagged as faster than thrombolysis usually achieves', () => {
    for (const h of [0.25, 0.5, 1]) {
      expect(keys(warn('ivt', h, ['m1'])), `${h} h`).toContain('ivtTooEarly');
      expect(keys(warn('ivt', h, ['other'])), `${h} h other`).toContain('ivtTooEarly');
    }
    const t = warn('ivt', 0.5, ['m1']).find((x) => x.key === 'ivtTooEarly')!.text;
    expect(t).toMatch(/30 min after onset/);
    expect(t).toMatch(/faster than IV thrombolysis usually achieves/);
    expect(t).toMatch(/1–3 h/);
    expect(warn('ivt', 0.5, ['m1'], 'zh-TW').find((x) => x.key === 'ivtTooEarly')!.text).toMatch(/比靜脈血栓溶解通常能做到的更快/);
  });

  it('is not raised later, nor for thrombectomy or bridging (thrombectomy reopens the artery)', () => {
    expect(keys(warn('ivt', 2, ['m1']))).not.toContain('ivtTooEarly');
    for (const method of ['evt', 'bridging'] as const) expect(keys(warn(method, 0.5, ['m1'])), method).not.toContain('ivtTooEarly');
  });
});

describe('R4-4: the MeVO warning does not call DISTAL’s haemorrhage higher', () => {
  it('attributes the haemorrhage figures and says DISTAL’s authors judged them similar', () => {
    const en = warn('evt', 3, ['m2']).find((x) => x.key === 'evtMevo')!.text;
    expect(en).not.toMatch(/more symptomatic haemorrhage/);
    expect(en).toMatch(/5\.4% vs 2\.2% in ESCAPE-MeVO/);
    expect(en).toMatch(/judged similar by its authors/);
    expect(en).toMatch(/higher mortality only in ESCAPE-MeVO/);
    const zh = warn('evt', 3, ['m2'], 'zh-TW').find((x) => x.key === 'evtMevo')!.text;
    expect(zh).not.toMatch(/症狀性出血較多/);
    expect(zh).toMatch(/作者認為相近/);
  });
});

describe('R4-5: thrombectomy for a perforator, the ophthalmic or a communicating artery', () => {
  it('is said not to apply, instead of being "an individual decision"', () => {
    for (const vessel of ['lenticulostriate_l', 'ophthalmic_r', 'acha_l', 'thalamogeniculate_l', 'pontine_paramedian_caudal_l', 'acomm', 'pcomm_r']) {
      for (const method of ['evt', 'bridging'] as const) {
        const w = warnFor(method, 3, [vessel]);
        expect(keys(w), `${vessel} ${method}`).toContain('evtNotApplicable');
        expect(keys(w), `${vessel} ${method}`).not.toContain('evtNoTrial');
      }
      expect(keys(warnFor('ivt', 3, [vessel])), vessel).not.toContain('evtNotApplicable');
    }
    const en = warnFor('evt', 3, ['lenticulostriate_l']).find((x) => x.key === 'evtNotApplicable')!.text;
    expect(en).toMatch(/Thrombectomy does not treat this kind of artery/);
    expect(en).toMatch(/IV thrombolysis/);
    expect(en).not.toMatch(/individual decision/);
    expect(warnFor('evt', 3, ['ophthalmic_r'], 'zh-TW').find((x) => x.key === 'evtNotApplicable')!.text).toMatch(/取栓不處理這類動脈/);
  });

  it('the cerebellar trunks, the cervical ICA and V4 keep the "not tested in trials" warning', () => {
    for (const vessel of ['pica_r', 'aica_l', 'sca_r', 'ica_cervical_r', 'va_v4_prox_r']) {
      const w = warnFor('evt', 3, [vessel]);
      expect(keys(w), vessel).toContain('evtNoTrial');
      expect(keys(w), vessel).not.toContain('evtNotApplicable');
    }
    // a trial site reopened as well: neither
    expect(keys(warnFor('evt', 3, ['mca_m1_l', 'lenticulostriate_l']))).toEqual([]);
  });

  it('the settings panel passes the reopened arteries', () => {
    expect(isThrombectomyTarget('lenticulostriate_l')).toBe(false);
    expect(isThrombectomyTarget('ophthalmic_r')).toBe(false);
    expect(isThrombectomyTarget('pica_r')).toBe(true);
    expect(isThrombectomyTarget('mca_m1_l')).toBe(true);
  });
});

describe('R4-7: the late-thrombolysis trials are not shown as basilar data', () => {
  it('basilar IV thrombolysis late in the day gets no late-thrombolysis row', () => {
    expect(evRows(['basilar'], 'ivt', 'en', 8).some((r) => r.key === 'lateIvt')).toBe(false);
    expect(evRows(['basilar'], 'ivt', 'zh-TW', 8).some((r) => r.key === 'lateIvt')).toBe(false);
    // an anterior site reopened as well keeps it
    expect(evRows(['basilar', 'm1'], 'ivt', 'en', 8).some((r) => r.key === 'lateIvt')).toBe(true);
    expect(evRows(['m1'], 'ivt', 'en', 8).some((r) => r.key === 'lateIvt')).toBe(true);
  });
});

describe('R4-8: the 4.5 h window is about the drug start, which comes 1–3 h before flow returns', () => {
  it('IV thrombolysis with flow back at up to 5.5 h fits a drug start within 4.5 h: a note, no warning, no late-trial row', () => {
    for (const h of [4.6, 5, 5.5]) {
      const w = warn('ivt', h, ['m1']);
      expect(keys(w), `${h} h`).not.toContain('ivtWindow');
      expect(keys(w), `${h} h`).toContain('ivtWindowFits');
      expect(w.find((x) => x.key === 'ivtWindowFits')!.level, `${h} h`).toBe('note');
      expect(evRows(['m1'], 'ivt', 'en', h).some((r) => r.key === 'lateIvt'), `${h} h`).toBe(false);
    }
    const t = warn('ivt', 5, ['m1']).find((x) => x.key === 'ivtWindowFits')!.text;
    expect(t).toMatch(/5 h after onset/);
    expect(t).toMatch(/within 4\.5 h/);
    expect(warn('ivt', 5, ['m1'], 'zh-TW').find((x) => x.key === 'ivtWindowFits')!.text).toMatch(/4\.5 小時內開始用藥相符/);
    // later, the warning and the late trials (X3-6: once the drug was most likely started late)
    for (const h of [7, 8]) {
      expect(keys(warn('ivt', h, ['m1'])), `${h} h`).toContain('ivtWindow');
      expect(evRows(['m1'], 'ivt', 'en', h).some((r) => r.key === 'lateIvt'), `${h} h`).toBe(true);
    }
    // within 4.5 h nothing about the window
    expect(keys(warn('ivt', 4, ['m1']))).toEqual(['ivtLargeVessel']);
  });

  it('the warning gives the drug start implied by the flow-return time', () => {
    expect(warn('ivt', 8, ['m1']).find((x) => x.key === 'ivtWindow')!.text).toMatch(/about 5–7 h after onset/);
    expect(warn('ivt', 8, ['m1'], 'zh-TW').find((x) => x.key === 'ivtWindow')!.text).toMatch(/發作後約 5–7 小時/);
  });

  it('bridging: thrombectomy sets the time, so no window warning and no late-trial row, only a neutral note', () => {
    for (const h of [5, 6, 8]) {
      const w = warn('bridging', h, ['m1']);
      expect(keys(w), `${h} h`).not.toContain('ivtWindow');
      expect(keys(w), `${h} h`).not.toContain('ivtWindowConsensus');
      expect(keys(w), `${h} h`).toContain('bridgingDrugStart');
      expect(w.find((x) => x.key === 'bridgingDrugStart')!.level).toBe('note');
      expect(evRows(['m1'], 'bridging', 'en', h).some((r) => r.key === 'lateIvt'), `${h} h`).toBe(false);
    }
    const t = warn('bridging', 6, ['m1']).find((x) => x.key === 'bridgingDrugStart')!.text;
    expect(t).toMatch(/within 4\.5 h of onset/);
    expect(t).toMatch(/when thrombectomy restores flow/);
    expect(warn('bridging', 6, ['m1'], 'zh-TW').find((x) => x.key === 'bridgingDrugStart')!.text).toMatch(/取栓恢復血流的時間/);
    // a basilar bridging case names the consensus window, other sites do not
    expect(warn('bridging', 8, ['basilar']).find((x) => x.key === 'bridgingDrugStart')!.text).toMatch(/ESO\/ESMINT.*24 h/);
    expect(t).not.toMatch(/ESO|consensus/);
    expect(warn('bridging', 8, ['basilar', 'm1']).find((x) => x.key === 'bridgingDrugStart')!.text).not.toMatch(/ESO|consensus/);
    // within 4.5 h, nothing
    expect(keys(warn('bridging', 3, ['m1']))).toEqual([]);
  });

  it('warnings are warnings unless marked as notes', () => {
    expect(warn('ivt', 8, ['m1']).find((x) => x.key === 'ivtWindow')!.level).toBeUndefined();
  });
});

/**
 * X3-6: the warning and the note follow the drug start the flow-return time implies. With the
 * artery reopening 1–3 h after the drug (about 2 h in the middle: INTERRSeCT assessed it a median
 * of about 2 h after the drug), flow back at 6 h means a start at about 3–5 h, mostly within the
 * 4.5 h window: that fits standard thrombolysis and is a note, not a warning that contradicts its
 * own figures. The warning (and the late-thrombolysis trials) come once the start was most likely
 * after the window; where the start range straddles the window, both texts say how long the
 * reopening must have taken for the start to fall within it.
 */
describe('X3-6: IV thrombolysis with flow back at 6 h is not called late', () => {
  it('6 h: a note that the start fits the window if the artery took 1.5 h or more, no warning, no late-trial row', () => {
    const w = warn('ivt', 6, ['m1']);
    expect(keys(w)).not.toContain('ivtWindow');
    const note = w.find((x) => x.key === 'ivtWindowFits')!;
    expect(note.level).toBe('note');
    expect(note.text).toMatch(/about 3–5 h after onset/);
    expect(note.text).toMatch(/within 4\.5 h if the artery took 1\.5 h or longer to reopen, later if it reopened faster/);
    const zh = warn('ivt', 6, ['m1'], 'zh-TW').find((x) => x.key === 'ivtWindowFits')!.text;
    expect(zh).toMatch(/發作後約 3–5 小時/);
    expect(zh).toMatch(/動脈在用藥後 1\.5 小時以上才打通時，是在 4\.5 小時內開始；打通得更快，就是超過時限才用藥/);
    expect(evRows(['m1'], 'ivt', 'en', 6).some((r) => r.key === 'lateIvt')).toBe(false);
  });

  it('7 h: the warning, which says the start was most likely late and when it would still fit', () => {
    const t = warn('ivt', 7, ['m1']).find((x) => x.key === 'ivtWindow')!.text;
    expect(t).toMatch(/about 4–6 h after onset, most likely after the window: within 4\.5 h only if the artery took 2\.5 h or longer to reopen/);
    expect(warn('ivt', 7, ['m1'], 'zh-TW').find((x) => x.key === 'ivtWindow')!.text).toMatch(
      /發作後約 4–6 小時開始的，多半已超過時限：只有動脈在用藥後 2\.5 小時以上才打通，才可能是在 4\.5 小時內開始/,
    );
    // 8 h: the whole range is late, no condition
    expect(warn('ivt', 8, ['m1']).find((x) => x.key === 'ivtWindow')!.text).not.toMatch(/only if/);
  });

  it('at every delay the level agrees with the start it gives: a warning only when the middle of the range is past the window', () => {
    for (let h = 4.75; h <= 30; h += 0.25) {
      const w = warn('ivt', h, ['m1']);
      const start = h - 2;
      const late = start > RECANALISATION_EVIDENCE.ivtWindowH + 1e-9;
      expect(keys(w).includes('ivtWindow'), `${h} h`).toBe(late);
      expect(keys(w).includes('ivtWindowFits'), `${h} h`).toBe(!late);
      expect(evRows(['m1'], 'ivt', 'en', h).some((r) => r.key === 'lateIvt'), `${h} h`).toBe(late);
    }
  });
});
