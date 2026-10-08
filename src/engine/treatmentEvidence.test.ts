/**
 * What the course tells about treatment (cluster C2 of the clinical-detail audit): which
 * treatment-window story fits the occlusion site, the large-core thrombectomy trials, when and
 * how a thrombolytic raises the bleeding risk, lacunar strokes, the medium-vessel trials and the
 * basilar prognosis. Everything here is text and timing: NIHSS, syndromes and volumes must not
 * move.
 */
import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../anatomy/scenarios';
import { simulate, type SimInput, type SimResult } from './simulate';
import { DEFAULT_TREATMENT, type TreatmentOptions } from './treatment';

const scenario = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id)!;
  return {
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH: 1,
    reperfusionH: null,
    decompression: false,
    ...over,
  };
};
const run = (id: string, over: Partial<SimInput> = {}) => simulate(scenario(id, over));
const custom = (occlusions: SimInput['occlusions'], over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'good', map: 93, tH: 1, reperfusionH: null, decompression: false, ...over });
const withT = (input: SimInput, t: Partial<TreatmentOptions>) => simulate({ ...input, treatment: { ...DEFAULT_TREATMENT, ...t } });
const eventOf = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
const windowText = (r: SimResult) => {
  const e = eventOf(r, 'treatment_window');
  expect(e, 'treatment_window event').toBeDefined();
  return e!.desc;
};

const ANTERIOR_EN = 'suited to mechanical thrombectomy';
const ANTERIOR_ZH = '適合動脈取栓';

describe('C2-F1: the treatment-window story follows the occlusion site', () => {
  // (Y2-8: its moderate hemiataxia now scores two limbs on item 7, so the NIHSS is 5, not 4)
  it('a low-NIHSS Wallenberg (V4 occlusion) is not called a thrombectomy target', () => {
    const r = run('r_wallenberg');
    expect(r.nihss.total).toBeLessThanOrEqual(5);
    const d = windowText(r);
    expect(d.en).not.toContain(ANTERIOR_EN);
    expect(d.zh).not.toContain(ANTERIOR_ZH);
    expect(d.en).toMatch(/vertebral artery \(V4\)/);
    expect(d.en).toMatch(/no randomised trial/i);
    expect(d.en).toMatch(/extends into the basilar/);
    expect(d.zh).toMatch(/椎動脈（V4）/);
    expect(d.zh).toMatch(/沒有隨機試驗/);
  });

  it('an isolated cervical ICA occlusion is an individual decision, not a trial-proven target', () => {
    const d = windowText(run('ica_isolated'));
    expect(d.en).not.toContain(ANTERIOR_EN);
    expect(d.en).toMatch(/isolated cervical ICA occlusion/i);
    expect(d.en).toMatch(/not tested in the randomised thrombectomy trials/);
    expect(d.en).toMatch(/1\.22.*0\.82–1\.82/);
    expect(d.en).toMatch(/individual decision/);
    expect(d.zh).toMatch(/單純頸部內頸動脈阻塞/);
    expect(d.zh).toMatch(/個別決定/);
    // a large early core in this case: benefit is even less certain, but thrombectomy is not ruled out
    expect(d.en).toMatch(/large established core/);
    expect(d.en).not.toMatch(/no thrombectomy/i);
    // the large-core trials were anterior intracranial LVO: not quoted here
    expect(d.en).not.toContain('SELECT2');
  });

  it('a tandem lesion (cervical ICA + M1) keeps the anterior large-vessel story', () => {
    const d = windowText(custom([{ vessel: 'ica_cervical_l', severity: 1 }, { vessel: 'mca_m1_l', severity: 1 }]));
    expect(d.en).toContain(ANTERIOR_EN);
    expect(d.zh).toContain(ANTERIOR_ZH);
    expect(d.en).not.toMatch(/isolated cervical ICA/i);
  });

  it('the anterior large-vessel occlusions keep their story', () => {
    for (const id of ['l_m1', 'r_ica_t', 'r_m1_malignant']) expect(windowText(run(id)).en, id).toContain(ANTERIOR_EN);
  });

  it('a basilar occlusion gets the basilar trials and the ESO guideline, not the anterior windows', () => {
    for (const id of ['basilar_tip', 'basilar_mid']) {
      const d = windowText(run(id));
      expect(d.en, id).not.toContain(ANTERIOR_EN);
      expect(d.en, id).not.toContain('extendable to 24 h when imaging shows salvageable tissue');
      expect(d.en, id).toMatch(/ATTENTION.*within 12 h/);
      expect(d.en, id).toMatch(/BAOCHE.*6–24 h/);
      expect(d.en, id).toMatch(/NIHSS ≥ 10/);
      expect(d.en, id).toMatch(/up to 24 h.*expert consensus.*very low certainty/);
      expect(d.en, id).toMatch(/IV thrombolysis plus thrombectomy over direct thrombectomy/);
      expect(d.en, id).toMatch(/weaker for distal/);
      expect(d.zh, id).toMatch(/ATTENTION/);
      expect(d.zh, id).toMatch(/專家共識/);
      expect(d.zh, id).not.toContain(ANTERIOR_ZH);
    }
    // the tip is the distal location
    expect(windowText(run('basilar_tip')).en).toMatch(/this is a distal \(tip\) occlusion/);
    expect(windowText(run('basilar_mid')).en).not.toMatch(/this is a distal \(tip\) occlusion/);
  });

  it('text only: NIHSS and syndromes of these cases do not change', () => {
    // the values of nonMotor.test.ts PINNED at 24 h, which the window text does not move (the
    // Wallenberg 5 includes the facial weakness and dysarthria of C7-F4 and, Y2-8, the ataxia of
    // the arm and the leg as two limbs; the basilar tip 37 the hemianopia of C1-F3)
    expect(run('r_wallenberg').nihss.total).toBe(5);
    expect(run('ica_isolated').nihss.total).toBe(18);
    expect(run('basilar_tip').nihss.total).toBe(37);
  });
});

describe('C2-F2: thrombolysis beyond alteplase within 4.5 h', () => {
  it('the window text names tenecteplase, starting the drug within 4.5 h, and imaging-selected late thrombolysis', () => {
    const d = windowText(run('l_m1'));
    expect(d.en).toMatch(/tenecteplase/);
    expect(d.en).toMatch(/started within 4\.5 h/);
    expect(d.en).toMatch(/WAKE-UP/);
    expect(d.en).toMatch(/EXTEND/);
    expect(d.zh).toMatch(/tenecteplase/);
    expect(d.zh).toMatch(/4\.5 小時內開始/);
    expect(d.zh).toMatch(/WAKE-UP/);
    // the anterior large-vessel story adds TRACE-III (no thrombectomy access)
    expect(d.en).toMatch(/TRACE-III/);
    expect(d.en).toMatch(/without access to thrombectomy/i);
    expect(d.en).not.toContain('generally within 4.5 h');
  });
});

describe('C2-F3: large-core thrombectomy', () => {
  it('an anterior LVO with a large core at the decision names the large-core trials, their benefit and their haemorrhage', () => {
    // Y1-0: the infarct now grows over hours, so untreated l_m1 has about 62 mL of core at 6 h
    // (was 92); reopened at 12 h it has about 88 mL then; r_ica_t (moderate collaterals) about 177
    // mL at 6 h (was 300)
    const CASES: [string, SimResult][] = [
      ['l_m1 at 12 h', run('l_m1', { reperfusionH: 12 })],
      ['r_ica_t', run('r_ica_t')],
    ];
    for (const [id, r] of CASES) {
      const d = windowText(r);
      for (const trial of ['SELECT2', 'ANGEL-ASPECT', 'RESCUE-Japan LIMIT', 'TENSION', 'LASTE']) expect(d.en, `${id} ${trial}`).toContain(trial);
      expect(d.en, id).toMatch(/lower mortality in TENSION and LASTE/);
      expect(d.en, id).toMatch(/6\.1% vs 2\.7%/);
      expect(d.en, id).toMatch(/9\.6% vs 5\.7%/);
      expect(d.zh, id).toMatch(/大核心/);
    }
    // a core beyond most trial populations says so
    expect(windowText(run('r_ica_t')).en).toMatch(/larger than in most of these trials/);
    expect(windowText(run('l_m1', { reperfusionH: 12 })).en).not.toMatch(/larger than in most of these trials/);
    // and a core under 70 mL at the decision does not get the large-core sentence at all
    expect(windowText(run('l_m1')).en).not.toContain('SELECT2');
  });

  it('a small core at the time of treatment does not get the large-core sentence', () => {
    // l_m1 reopened at 1 h: about 25 mL of core then (Y1-0; was 45)
    const d = windowText(run('l_m1', { reperfusionH: 1 }));
    expect(d.en).not.toContain('SELECT2');
  });
});

describe('C2-F4: haemorrhagic transformation after a thrombolytic', () => {
  const M1 = scenario('l_m1', { reperfusionH: 2, tH: 8 });
  it('with IV thrombolysis the risk window starts at the treatment and peaks early', () => {
    for (const method of ['ivt', 'bridging'] as const) {
      const e = eventOf(withT(M1, { method }), 'hemorrhagic_transformation')!;
      expect(e.onsetH, method).toBe(2);
      expect(e.peakH!, method).toBeLessThanOrEqual(2 + 12);
      expect(e.symptoms ?? [], method).toEqual([]);
    }
    // thrombectomy alone and no treatment keep the 1–7 day course
    for (const r of [withT(M1, { method: 'evt', grade: '2b67' }), run('l_m1', { tH: 8 })]) {
      const e = eventOf(r, 'hemorrhagic_transformation')!;
      expect(e.onsetH).toBe(24);
      expect(e.peakH).toBe(72);
    }
  });

  it('the text separates IV thrombolysis alone from bridging, and says what is counted when', () => {
    const ivt = eventOf(withT(M1, { method: 'ivt' }), 'hemorrhagic_transformation')!.desc;
    expect(ivt.en).toMatch(/several-fold/);
    expect(ivt.en).toMatch(/6\.4% vs 0\.6%/);
    expect(ivt.en).toMatch(/2\.4% vs 0\.2%/);
    expect(ivt.en).not.toMatch(/difference from thrombectomy alone is small/);
    expect(ivt.en).toMatch(/median of about 8 h/);
    expect(ivt.en).toMatch(/about half/);
    expect(ivt.zh).toMatch(/數倍/);
    const bridging = eventOf(withT(M1, { method: 'bridging' }), 'hemorrhagic_transformation')!.desc;
    expect(bridging.en).toMatch(/SWIFT DIRECT.*3\.5% vs 2\.5%/);
    expect(bridging.en).not.toMatch(/several-fold/);
    const plain = eventOf(run('l_m1', { tH: 8 }), 'hemorrhagic_transformation')!.desc;
    for (const d of [plain, ivt, bridging]) {
      expect(d.en).toMatch(/first 24–36 h/);
      expect(d.en).toMatch(/27\.0% vs 17\.6%/);
      expect(d.en).toMatch(/parenchymal haematoma type 2/);
      expect(d.en).toMatch(/32\.3/);
      expect(d.en).toMatch(/18\.0/);
      expect(d.zh).toMatch(/第 2 型實質血腫/);
    }
  });

  it('timing only: NIHSS and volumes are the same as before', () => {
    const r = withT({ ...M1, tH: 72 }, { method: 'ivt' });
    const e = withT({ ...M1, tH: 72 }, { method: 'evt', noReflow: 0 });
    expect(r.nihss.total).toBe(e.nihss.total);
    expect(r.volumes.finalInfarct).toBe(e.volumes.finalInfarct);
  });
});

describe('C2-F5: the time chosen is when flow returns, not when the drug is started', () => {
  it('the IV thrombolysis reperfusion event says the drug was started earlier', () => {
    const e = eventOf(withT(scenario('l_m1', { reperfusionH: 3, tH: 24 }), { method: 'ivt' }), 'reperfusion')!;
    expect(e.desc.en).toMatch(/1–3 h/);
    expect(e.desc.en).toMatch(/started/);
    expect(e.desc.zh).toMatch(/1–3 小時/);
  });
});

describe('C2-F6: medium/distal vessel occlusions', () => {
  it('the window text gives the harm signal of the 2025 trials', () => {
    const d = windowText(run('l_m2_sup'));
    expect(d.en).toMatch(/ESCAPE-MeVO/);
    expect(d.en).toMatch(/DISTAL/);
    expect(d.en).toMatch(/5\.4% vs 2\.2%/);
    expect(d.en).toMatch(/5\.9% vs 2\.6%/);
    // R4-4: mortality was higher in ESCAPE-MeVO only
    expect(d.en).toMatch(/mortality higher only in ESCAPE-MeVO \(13\.3% vs 8\.4%\)/);
    expect(d.en).toMatch(/excluded from DISTAL/);
    expect(d.zh).toMatch(/13\.3%/);
  });
});

describe('C2-F7: lacunar strokes get the hyperacute story', () => {
  it.each([
    // NIHSS as pinned in nonMotor.test.ts (a single lacune is mild to moderate, C6-F1)
    ['l_lacune', 3],
    // Y2-8: the marked ataxia of the arm and the leg is two limbs (was 5)
    ['r_pontine_lacune', 6],
  ])('%s: ischaemic cascade, a small DWI lesion and the IV thrombolysis window', (id, nihss) => {
    const r = run(id);
    const ids = r.cascade.events.map((e) => e.id);
    for (const want of ['ischemic_cascade', 'imaging_dwi', 'treatment_window']) expect(ids, want).toContain(want);
    const d = windowText(r);
    expect(d.en).toMatch(/lacunar/);
    expect(d.en).toMatch(/within 4\.5 h/);
    expect(d.en).toMatch(/59% vs 46%/);
    expect(d.en).toMatch(/thrombectomy does not apply/);
    expect(d.en).toMatch(/does not simulate/);
    expect(d.zh).toMatch(/腔隙/);
    expect(eventOf(r, 'imaging_dwi')!.desc.en).toMatch(/small/);
    // only the events change
    expect(r.nihss.total).toBe(nihss);
  });
});

describe('C2-F9: an embolus to a new territory is told as such', () => {
  it('names the new territory instead of a downstream branch', () => {
    const input = scenario('l_m1', { reperfusionH: 3, tH: 24 });
    const r = withT(input, { distalEmbolus: 'aca_callosomarginal_l' });
    const e = eventOf(r, 'distal_embolus')!;
    expect(e.title.en).toMatch(/new territory/i);
    expect(e.desc.en).toMatch(/previously unaffected territory/);
    expect(e.title.zh).toMatch(/新區域/);
    const d = eventOf(withT(input, { distalEmbolus: 'mca_angular_l' }), 'distal_embolus')!;
    expect(d.title.en).toMatch(/^Distal embolus/);
  });
});

describe('C2-F10: basilar prognosis from the trials', () => {
  it('the basilar story gives trial mortality and the outlook without recanalisation', () => {
    for (const id of ['basilar_mid', 'basilar_tip']) {
      const d = windowText(run(id));
      expect(d.en, id).toMatch(/37% with thrombectomy vs 55%/);
      expect(d.en, id).toMatch(/31% vs 42%.*not statistically significant/);
      expect(d.en, id).toMatch(/34%.*21%/);
      expect(d.en, id).toMatch(/about 2%/);
      expect(d.zh, id).toMatch(/37%/);
      expect(d.zh, id).toMatch(/約 2%/);
    }
  });
});

describe('R4-2: IV thrombolysis that reopens the artery very early', () => {
  const M1 = (reperfusionH: number) => withT(scenario('l_m1', { reperfusionH, tH: 24 }), { method: 'ivt' });
  const note = (reperfusionH: number) => eventOf(M1(reperfusionH), 'reperfusion')!.desc;

  it('flow back within 1 h of onset is called faster than thrombolysis usually achieves, not a drug started before the stroke', () => {
    for (const h of [0.5, 1]) {
      const d = note(h);
      expect(d.en, `${h} h`).not.toMatch(/started about 1–3 h earlier/);
      expect(d.en, `${h} h`).toMatch(/faster than IV thrombolysis usually achieves/);
      expect(d.en, `${h} h`).toMatch(/median of about 2 h/);
      expect(d.zh, `${h} h`).not.toMatch(/早 1–3 小時就已開始/);
      expect(d.zh, `${h} h`).toMatch(/比靜脈血栓溶解通常能做到的更快/);
    }
  });

  it('later, the note gives the implied drug start after onset', () => {
    expect(note(2).en).toMatch(/started within about 1 h of onset/);
    expect(note(2).zh).toMatch(/發作後約 1 小時內就開始用藥/);
    expect(note(6).en).toMatch(/started about 3–5 h after onset/);
    expect(note(6).zh).toMatch(/發作後約 3–5 小時開始用藥/);
    for (const h of [2, 6]) expect(note(h).en).not.toMatch(/faster than IV thrombolysis/);
  });

  it('the haemorrhage text says the model starts the risk when flow returns', () => {
    const d = eventOf(M1(0.5), 'hemorrhagic_transformation')!.desc;
    expect(d.en).toMatch(/starts this risk when flow returns/);
    expect(d.en).not.toMatch(/starts this risk at the treatment/);
    expect(d.zh).toMatch(/從血流恢復時（選擇的治療時間）開始算/);
  });
});

describe('R4-4: DISTAL reported similar symptomatic haemorrhage', () => {
  it('the MeVO window text attributes the haemorrhage figures and calls DISTAL’s similar', () => {
    const d = windowText(run('l_m2_sup'));
    expect(d.en).not.toMatch(/more symptomatic haemorrhage/);
    expect(d.en).toMatch(/5\.4% vs 2\.2% in ESCAPE-MeVO/);
    expect(d.en).toMatch(/5\.9% vs 2\.6% in DISTAL \(judged similar by its authors\)/);
    expect(d.en).toMatch(/mortality higher only in ESCAPE-MeVO \(13\.3% vs 8\.4%\)/);
    expect(d.zh).not.toMatch(/症狀性出血較多/);
    expect(d.zh).toMatch(/DISTAL 5\.9% vs 2\.6%（作者認為相近）/);
    expect(d.zh).toMatch(/只有 ESCAPE-MeVO 的死亡率較高（13\.3% vs 8\.4%）/);
  });
});

describe('R4-2: the implied drug start is counted from the onset of the occlusion that is reopened', () => {
  it('an occlusion that begins at 24 h and reopens with IV thrombolysis at 24.5 h is too early, not 21.5–23.5 h', () => {
    const input: SimInput = { ...scenario('l_m1'), occlusions: [{ vessel: 'mca_m1_l', severity: 1, fromH: 24 }], reperfusionH: 24.5, tH: 48 };
    const r = withT(input, { method: 'ivt' });
    const d = eventOf(r, 'reperfusion')!.desc;
    expect(d.en).toMatch(/only 30 min after onset/);
    expect(d.en).not.toMatch(/21\.5/);
  });
});
