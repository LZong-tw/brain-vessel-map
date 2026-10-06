/**
 * Brainstem (pons and midbrain) findings of the clinical-detail audit, cluster C3: consciousness
 * and locked-in syndrome, the pontine syndromes, tegmental signs (skew deviation, Holmes tremor,
 * peduncular hallucinosis), the prodrome of basilar thrombosis, central hyperthermia and
 * hypertrophic olivary degeneration. Each block names the finding it covers; the citations are next
 * to the code (regions.ts, symptoms.ts, syndromes.ts, cascade.ts) and in REFERENCES.md.
 */
import { describe, expect, it } from 'vitest';
import README_ZH from '../../README.md?raw';
import README_EN from '../../README.en.md?raw';
import REFERENCES_MD from '../../REFERENCES.md?raw';
import REDUNDANCY_SRC from '../anatomy/redundancy.ts?raw';
import SYMPTOMS_SRC from '../anatomy/symptoms.ts?raw';
import CASCADE_SRC from './cascade.ts?raw';
import { REGION_DEFS } from '../anatomy/regions';
import { REDUNDANCY } from '../anatomy/redundancy';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SCIENTIFIC_REFERENCES } from '../anatomy/sources';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { aggregateSymptoms, type SymptomItem } from './clinical';
import type { Side } from '../anatomy';
import type { CascadeEvent } from './cascade';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const base: SimInput = { occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false };
const occ = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) => simulate({ ...base, occlusions, tH, ...over });
const one = (vessel: string, tH: number, over: Partial<SimInput> = {}) => occ([{ vessel, severity: 1 }], tH, over);
const scenario = (id: string, tH: number) => {
  const sc = SCENARIO_BY_ID[id];
  return simulate({
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
  });
};
/** the paramedian and the SCA branches of one side: nearly the whole upper pontine tegmentum (R5-6) */
const ROSTRAL_TEGMENTUM_L: Occlusion[] = [
  { vessel: 'pontine_paramedian_rostral_l', severity: 1 },
  { vessel: 'sca_l', severity: 1 },
];
const BOTH_ROSTRAL: Occlusion[] = [
  { vessel: 'pontine_paramedian_rostral_r', severity: 1 },
  { vessel: 'pontine_paramedian_rostral_l', severity: 1 },
];
const syn = (r: SimResult) => r.syndromes.map((m) => m.def.id + (m.side ? `_${m.side}` : ''));
const ids = (r: SimResult) => r.symptoms.map((s) => s.id);
const sym = (r: SimResult, id: string) => r.symptoms.filter((s) => s.id === id);
const event = (r: SimResult, id: string) => r.cascade.events.find((e) => e.id === id);
const desc = (id: string) => SYNDROMES.find((s) => s.id === id)!.desc;
const ref = (needle: string) => SCIENTIFIC_REFERENCES.filter((r) => r.includes(needle));
const LOCKED_IN_FAMILY = ['locked_in', 'locked_in_incomplete', 'basilar_coma', 'pontine_doc'];

describe('C3-F1: locked-in syndrome is not labelled during coma; incomplete and total forms', () => {
  it('upper basilar occlusion (pontine tegmentum on both sides): basilar coma with quadriplegia, not locked-in, while comatose', () => {
    const r = one('basilar_upper', 24);
    expect(ids(r)).toContain('coma');
    expect(syn(r)).toContain('basilar_coma');
    expect(syn(r)).not.toContain('locked_in');
    expect(syn(r)).not.toContain('locked_in_incomplete');
    // the cascade tells the same story: comatose now, may wake up locked-in over days to weeks
    expect(event(r, 'locked_in')).toBeUndefined();
    const e = event(r, 'basilar_coma');
    expect(e).toBeDefined();
    expect(e!.desc.en).toMatch(/days to weeks/);
    expect(e!.desc.en).not.toMatch(/fully conscious/);
    expect(e!.desc.zh).toContain('數天到數週');
  });

  it('mid-basilar occlusion: classical locked-in while nothing moves, incomplete once some limb movement returns', () => {
    const acute = scenario('basilar_mid', 24);
    expect(syn(acute)).toContain('locked_in');
    expect(syn(acute)).not.toContain('locked_in_incomplete');
    for (const tH of [2160, 4320]) {
      const r = scenario('basilar_mid', tH);
      // arms and legs are no longer completely paralysed (sev 2)
      expect(sym(r, 'arm_weak').every((s) => s.sev < 3), `${tH} h`).toBe(true);
      expect(syn(r), `${tH} h`).toContain('locked_in_incomplete');
      expect(syn(r), `${tH} h`).not.toContain('locked_in');
      // still awake
      expect(ids(r)).not.toContain('coma');
    }
  });

  it('lower basilar occlusion (both caudal bases partly): one bilateral label, not two one-sided Raymond syndromes, and it persists', () => {
    for (const tH of [24, 4320]) {
      const r = one('basilar_lower', tH);
      expect(syn(r), `${tH} h`).toEqual(['locked_in_incomplete']);
    }
  });

  it('the locked-in event no longer promises total paralysis and full consciousness for every case', () => {
    const e = event(scenario('basilar_mid', 24), 'locked_in');
    expect(e).toBeDefined();
    expect(e!.desc.en).toMatch(/incomplete/i);
    expect(e!.desc.zh).toContain('不完全');
  });

  // X2-15: titled by the picture the labels show at the time (classical, incomplete), no longer by
  // the final infarct; reopened in time, the locked-in picture shown resolves with the reopening
  it('the locked-in event is titled by the picture shown: classical while nothing moves, incomplete with movement left, resolving when reopened in time', () => {
    const r = one('basilar_mid', 4320, { reperfusionH: 1 });
    const early = event(r, 'locked_in')!;
    expect(early.title.en).toBe('Bilateral ventral pons: locked-in syndrome');
    expect(early.endH).toBe(1);
    // some movement returns at once, the rest as the rescued pons recovers (Y1-12)
    expect(event(r, 'locked_in_incomplete')!.desc.en).toMatch(/resolves as the rescued tissue regains its function/);
    expect(event(scenario('basilar_mid', 24), 'locked_in')!.title.en).toBe('Bilateral ventral pons: locked-in syndrome');
    const lower = event(one('basilar_lower', 24), 'locked_in_incomplete')!;
    expect(lower.title.en).toMatch(/incomplete locked-in/);
    expect(lower.title.zh).toContain('不完全閉鎖');
  });

  it('total locked-in (both cerebral peduncles, no eye movement either) is described', () => {
    expect(desc('locked_in').en).toMatch(/total/i);
    expect(desc('locked_in').en).toMatch(/peduncles/);
    expect(desc('locked_in').zh).toContain('大腦腳');
    expect(desc('locked_in_incomplete').en).toMatch(/Bauer/);
  });
});

describe('C3-F2: coma and drowsiness have their own time course', () => {
  it('Percheron: no coma at 3 and 6 months (NIHSS 1a 0), persistent hypersomnia instead', () => {
    for (const tH of [2160, 4320]) {
      const r = scenario('percheron', tH);
      expect(ids(r), `${tH} h`).not.toContain('coma');
      expect(r.nihss.items['1a'] ?? 0, `${tH} h`).toBe(0);
      expect(ids(r), `${tH} h`).toContain('hypersomnia');
    }
    // the acute phase still has reduced consciousness
    expect(ids(scenario('percheron', 24))).toContain('coma');
  });

  it('one paramedian thalamus: no drowsiness item (NIHSS 1a) left at 6 months', () => {
    const r = one('thalamoperforator_l', 4320);
    expect(ids(r)).not.toContain('somnolence');
    expect(r.nihss.items['1a'] ?? 0).toBe(0);
  });

  it('upper basilar occlusion at 3 and 6 months: not coma but a disorder of consciousness (or hidden awareness), scored by NIHSS 1a', () => {
    for (const tH of [2160, 4320]) {
      const r = one('basilar_upper', tH);
      expect(ids(r), `${tH} h`).not.toContain('coma');
      expect(ids(r), `${tH} h`).toContain('disorder_of_consciousness');
      expect(r.nihss.items['1a'] ?? 0, `${tH} h`).toBeGreaterThan(0);
      expect(syn(r), `${tH} h`).toContain('pontine_doc');
      expect(syn(r), `${tH} h`).not.toContain('basilar_coma');
    }
  });

  it('never lists coma together with hypersomnia', () => {
    const inf = { thalamus_paramedian_r: 1, thalamus_paramedian_l: 1 };
    for (const sev of [1, 2, 3] as const) {
      const coma: SymptomItem = { id: 'coma', side: null, sev, sources: ['herniation'], delayed: false };
      const got = aggregateSymptoms(inf, inf, 720, [coma]).map((s) => s.id);
      expect(got, `coma ${sev}`).toContain('coma');
      expect(got, `coma ${sev}`).not.toContain('hypersomnia');
    }
    for (const id of ['basilar_tip', 'percheron'])
      for (const tH of [720, 2160, 4320]) {
        const got = ids(scenario(id, tH));
        expect(got.includes('coma') && got.includes('hypersomnia'), `${id} ${tH} h`).toBe(false);
      }
  });

  it('the disorder of consciousness is a consciousness item with an NIHSS 1a mapping and a recovery entry', () => {
    const def = SYMPTOM_BY_ID.disorder_of_consciousness;
    expect(def.system).toBe('consciousness');
    expect(def.nihss?.item).toBe('1a');
    expect(REDUNDANCY.disorder_of_consciousness).toBeDefined();
  });
});

describe('C3-F3 (S1): a one-sided upper pontine tegmental lesion lowers arousal only when nearly complete (a model assumption, R5-6)', () => {
  it('nearly the whole upper pontine tegmentum of one side: drowsiness (NIHSS 1a 1), not coma', () => {
    const r = occ(ROSTRAL_TEGMENTUM_L, 24);
    expect(r.regions.pons_rostral_tegmentum_l.dys).toBeGreaterThan(0.85);
    expect(ids(r)).toContain('somnolence');
    expect(ids(r)).not.toContain('coma');
    expect(r.nihss.items['1a']).toBe(1);
  });

  it('a small one-sided tegmental lesion leaves arousal intact', () => {
    const r = scenario('r_sca', 24);
    expect(r.regions.pons_rostral_tegmentum_r.dys).toBeLessThan(0.5);
    expect(ids(r)).not.toContain('somnolence');
    expect(ids(r)).not.toContain('coma');
  });

  it('both sides still give coma', () => {
    expect(ids(occ(BOTH_ROSTRAL, 24))).toContain('coma');
  });

  it('the coma and top-of-the-basilar texts say that a one-sided lesion occasionally causes coma', () => {
    expect(SYMPTOM_BY_ID.coma.desc.en).toMatch(/2 of 9/);
    expect(SYMPTOM_BY_ID.coma.desc.zh).toContain('9 位中有 2 位');
    expect(desc('top_of_basilar').en).toMatch(/one-sided/);
    expect(desc('top_of_basilar').zh).toContain('單側');
  });
});

describe('C3-F4: the commonest pontine pattern has a label; eponyms only with their signs', () => {
  it('a one-sided paramedian upper pontine infarct with tegmental spread is an anteromedial pontine syndrome', () => {
    for (const tH of [24, 4320]) expect(syn(one('pontine_paramedian_rostral_l', tH)), `${tH} h`).toEqual(['pontine_anteromedial_l']);
  });

  it('Raymond (ventral caudal pons) needs the other side to be spared; it is no longer called Millard–Gubler', () => {
    expect(syn(one('pontine_paramedian_inferior_l', 24))).toEqual(['pontine_ventral_l']);
    const raymond = SYNDROMES.find((s) => s.id === 'pontine_ventral')!;
    expect(raymond.name.en).toMatch(/^Raymond/);
    expect(raymond.name.en).not.toMatch(/Millard/);
  });

  it('the teaching scenarios keep their labels (Foville, pontine lacune, locked-in)', () => {
    expect(syn(scenario('l_pontine', 24))).toEqual(['foville_l']);
    expect(syn(scenario('r_pontine_lacune', 24))).toEqual(['pontine_lacunar_r']);
    expect(syn(scenario('basilar_mid', 24))).toEqual(['locked_in']);
  });

  it('the anteromedial syndrome gives its frequency and the eponym texts say classic syndromes are uncommon on MRI', () => {
    expect(desc('pontine_anteromedial').en).toMatch(/58%/);
    expect(desc('foville').en).toMatch(/4 of 36/);
    expect(desc('foville').zh).toContain('36 位中只有 4 位');
    expect(SCENARIO_BY_ID.l_pontine.summary.en).toMatch(/uncommon/);
  });
});

describe('C3-F5: skew deviation, the S of HINTS', () => {
  it('lateral medulla: ipsiversive (the lesion-side eye lower), with vertical double vision', () => {
    const r = scenario('r_wallenberg', 24);
    expect(sym(r, 'skew_deviation').map((s) => s.side)).toEqual(['r']);
    expect(ids(r)).toContain('diplopia');
  });

  it('lateral caudal pons (AICA): ipsiversive; upper pons and midbrain: contraversive', () => {
    expect(sym(scenario('l_aica', 24), 'skew_deviation').map((s) => s.side)).toEqual(['l']);
    expect(sym(one('pontine_paramedian_rostral_l', 24), 'skew_deviation').map((s) => s.side)).toEqual(['r']);
    expect(sym(one('mesencephalic_perf_l', 24), 'skew_deviation').map((s) => s.side)).toEqual(['r']);
  });

  it('lesions of both sides have no single lower eye: not listed then', () => {
    for (const r of [scenario('percheron', 24), scenario('basilar_tip', 24), one('basilar_upper', 24)]) expect(ids(r)).not.toContain('skew_deviation');
  });

  it('is an eye sign the NIHSS does not score, and the Wallenberg, AICA and INO texts name it as the S of HINTS', () => {
    const def = SYMPTOM_BY_ID.skew_deviation;
    expect(def.system).toBe('eye');
    expect(def.nihss).toBeUndefined();
    expect(REDUNDANCY.skew_deviation).toBeDefined();
    for (const text of [desc('wallenberg'), desc('aica'), SYMPTOM_BY_ID.ino.desc]) {
      expect(text.en).toMatch(/HINTS/);
      expect(text.zh).toMatch(/HINTS/);
    }
    // Sacco 1993: ocular symptoms in 11 of 33, not necessarily beyond the lateral medulla
    expect(desc('wallenberg').en).toMatch(/11 of 33/);
  });
});

describe('C3-F6: locked-in prognosis and care', () => {
  it('the redundancy comment no longer attributes a comparison with hemispheric stroke to Patterson & Grabois', () => {
    expect(REDUNDANCY_SRC).not.toMatch(/far less than a hemispheric stroke/);
    expect(REDUNDANCY_SRC).toMatch(/vascular with non-vascular/);
  });

  it('the locked-in event and syndrome mention mortality, lung care and a communication system', () => {
    const e = event(scenario('basilar_mid', 24), 'locked_in')!;
    for (const text of [e.desc, desc('locked_in')]) {
      expect(text.en).toMatch(/60%/);
      expect(text.en).toMatch(/communication/);
      expect(text.en).toMatch(/lung|pulmonary/);
      expect(text.zh).toContain('60%');
      expect(text.zh).toContain('溝通');
    }
  });
});

describe('C3-F7: Holmes (rubral) tremor is delayed', () => {
  it('midbrain infarct: no tremor in the first day, a Holmes tremor of the opposite arm at 3 months', () => {
    const acute = one('mesencephalic_perf_l', 24);
    expect(ids(acute)).not.toContain('tremor');
    expect(ids(acute)).not.toContain('holmes_tremor');
    expect(sym(one('mesencephalic_perf_l', 2160), 'holmes_tremor').map((s) => s.side)).toEqual(['r']);
  });

  it('the cerebellar intention tremor (dentate) is unchanged and acute', () => {
    expect(sym(scenario('r_sca', 24), 'tremor').map((s) => s.side)).toEqual(['r']);
    const mid = REGION_DEFS.find((d) => d.id === 'midbrain_paramedian')!;
    expect(mid.deficits.some((d) => d.s === 'tremor')).toBe(false);
    expect(SYMPTOM_BY_ID.holmes_tremor.delayed).toBe(true);
  });

  it('the Weber/Benedikt and Claude texts say the involuntary movements come weeks to months later', () => {
    for (const id of ['weber_benedikt', 'claude']) {
      expect(desc(id).en, id).toMatch(/weeks to months/);
      expect(desc(id).zh, id).toContain('數週到數月');
    }
  });
});

describe('C3-F8: the prodrome of basilar thrombosis', () => {
  const TIA = ['ischemia_no_infarct', 'imaging_no_infarct', 'tia_urgent'];
  it('the prodromal TIA gets the TIA events, which end when the artery occludes on day 3', () => {
    for (const tH of [0, 24, 120]) {
      const r = scenario('basilar_stuttering', tH);
      for (const id of TIA) {
        const e = event(r, id);
        expect(e, `${id} @${tH}`).toBeDefined();
        expect(e!.onsetH).toBeLessThan(1);
        // before day 3 nobody knows the artery will occlude: the story runs on as a TIA's (W2-3)
        if (tH >= 72) expect(e!.endH).toBeLessThanOrEqual(72);
        else expect(e!.endH ?? Infinity).toBeGreaterThan(Math.min(tH, 6));
      }
    }
    // a plain basilar stroke has none of them
    for (const id of TIA) expect(event(scenario('basilar_mid', 24), id)).toBeUndefined();
  });

  it('the pontine tegmentum near the floor of the fourth ventricle contributes vertigo and nystagmus', () => {
    for (const r of [scenario('basilar_mid', 24), scenario('l_pontine', 24)]) {
      expect(ids(r)).toContain('vertigo');
      expect(ids(r)).toContain('nystagmus');
    }
  });

  it('the scenario text matches the model and the cited series; sudden onset stays for embolic mid/top basilar occlusions', () => {
    const s = SCENARIO_BY_ID.basilar_stuttering.summary;
    expect(s.en).toMatch(/54 of 85/);
    expect(s.zh).toContain('85 位中有 54 位');
    for (const id of ['basilar_mid', 'basilar_tip']) expect(SCENARIO_BY_ID[id].summary.en).not.toMatch(/progressive/i);
  });
});

describe('C3-F9 (S2): central hyperthermia risk after extensive bilateral pontine tegmental damage with coma', () => {
  it('both upper pontine tegmenta infarcted, with coma: the risk event appears', () => {
    for (const r of [occ(BOTH_ROSTRAL, 24), one('basilar_upper', 24)]) {
      expect(ids(r)).toContain('coma');
      const e = event(r, 'central_hyperthermia');
      expect(e).toBeDefined();
      expect(e!.kind).toBe('complication');
      // a risk, not a fixed symptom
      expect(e!.symptoms ?? []).toEqual([]);
    }
  });

  it('one side: no event, but drowsiness', () => {
    const r = occ(ROSTRAL_TEGMENTUM_L, 24);
    expect(event(r, 'central_hyperthermia')).toBeUndefined();
    expect(ids(r)).toContain('somnolence');
  });

  it('the locked-in scenario (ventral pons, no upper tegmental damage) has no such event', () => {
    for (const tH of [24, 2160]) expect(event(scenario('basilar_mid', tH), 'central_hyperthermia')).toBeUndefined();
  });

  it('says it is rare after ischaemia, a diagnosis of exclusion after infection, with a poor prognosis', () => {
    const e = event(occ(BOTH_ROSTRAL, 24), 'central_hyperthermia')!;
    expect(e.desc.en).toMatch(/rare/);
    expect(e.desc.en).toMatch(/infection/);
    expect(e.desc.en).toMatch(/prognosis/);
    expect(e.desc.zh).toContain('少見');
    expect(e.desc.zh).toContain('感染');
    expect(e.desc.zh).toContain('預後');
  });

  it('cites the case reports and the series, each checked against PubMed', () => {
    expect(ref('Alemdar M')).toEqual([
      'Alemdar M. Hyperthermia associated with bilateral mesencephalothalamic infarction. J Stroke Cerebrovasc Dis 2012;21:907.e13–907.e15. (Ischaemic, bilateral paramedian midbrain–thalamus; 39.3 °C without infection.)',
    ]);
    expect(ref('Huang YS')).toHaveLength(1);
    expect(ref('Huang YS')[0]).toContain('Acta Neurol Taiwan 2009;18:118–122');
    const at = CASCADE_SRC.indexOf("id: 'central_hyperthermia'");
    expect(CASCADE_SRC.slice(at - 1200, at)).toMatch(/Parvizi/);
  });

  it('no statement says any longer that central fever is not modelled', () => {
    for (const r of [...ref('Grau AJ'), ...ref('Sung CY')]) expect(r).not.toMatch(/not modelled/);
    expect(REFERENCES_MD).not.toMatch(/Why central fever is not modelled/);
    expect(README_ZH).not.toMatch(/中樞性發燒也沒有/);
    expect(README_EN).not.toMatch(/nor is central fever/);
    expect(SYMPTOMS_SRC).not.toMatch(/Central \("neurogenic"\) fever is left out/);
    const asp = CASCADE_SRC.indexOf("id: 'aspiration'");
    expect(CASCADE_SRC.slice(asp, asp + 1600)).not.toMatch(/not a symptom\s+\/\/ of this model/);
  });
});

describe('C3-F10: peduncular hallucinosis', () => {
  it('both paramedian thalamic (or midbrain) sides: possible peduncular hallucinosis once the patient is no longer comatose; one side: not', () => {
    for (const r of [scenario('percheron', 2160), occ([{ vessel: 'thalamoperforator_r', severity: 1 }, { vessel: 'thalamoperforator_l', severity: 1 }], 2160)]) {
      expect(ids(r)).not.toContain('coma');
      expect(ids(r)).toContain('peduncular_hallucinosis');
    }
    // a comatose patient reports no hallucinations
    const comatose = scenario('basilar_tip', 24);
    expect(ids(comatose)).toContain('coma');
    expect(ids(comatose)).not.toContain('peduncular_hallucinosis');
    for (const tH of [24, 2160]) {
      expect(ids(one('thalamoperforator_l', tH))).not.toContain('peduncular_hallucinosis');
      expect(ids(one('mesencephalic_perf_l', tH))).not.toContain('peduncular_hallucinosis');
    }
  });

  it('is labelled as possible, is not scored, and the top-of-the-basilar text mentions it', () => {
    const def = SYMPTOM_BY_ID.peduncular_hallucinosis;
    expect(def.name.en).toMatch(/^Possible/);
    expect(def.nihss).toBeUndefined();
    expect(REDUNDANCY.peduncular_hallucinosis).toBeDefined();
    expect(desc('top_of_basilar').en).toMatch(/hallucinations/);
    expect(desc('top_of_basilar').zh).toContain('幻覺');
    // (Caplan's caudate series and the pontine warning syndrome are separate entries: C6)
    expect(ref('Caplan LR. "Top of the basilar"')).toHaveLength(1);
    expect(ref('Benke T')).toHaveLength(1);
  });
});

describe('C3-F11: palatal tremor and olivary degeneration', () => {
  it('a palatal tremor is shown as possible only after a clear dentate, red-nucleus or tegmental infarct', () => {
    // midbrain under half infarcted (a paramedian artery that also feeds it, C9-F1): olivary
    // degeneration may follow, but no palatal tremor is listed
    for (const r of [one('thalamoperforator_l', 2160, { variants: ['thalamomesencephalic_l'] }), scenario('percheron_midbrain', 2160)]) {
      expect(r.cascade.events.some((e) => e.id.startsWith('hod_'))).toBe(true);
      expect(ids(r)).not.toContain('palatal_tremor');
    }
    // the thalamus alone is outside the dentato-rubro-olivary pathway (C9-F1)
    for (const r of [one('thalamoperforator_l', 2160), scenario('percheron', 2160)]) {
      expect(r.cascade.events.some((e) => e.id.startsWith('hod_'))).toBe(false);
      expect(ids(r)).not.toContain('palatal_tremor');
    }
    // the dentate nucleus is fully infarcted
    expect(ids(scenario('r_sca', 2160))).toContain('palatal_tremor');
    expect(SYMPTOM_BY_ID.palatal_tremor.name.en).toMatch(/possible/i);
  });

  it('the olivary degeneration is a "may develop" event with the MRI time course', () => {
    const e = event(scenario('r_sca', 2160), 'hod_r')!;
    expect(e.peakH).toBeGreaterThanOrEqual(4320);
    expect(e.desc.en).toMatch(/38–67%/);
    expect(e.desc.en).toMatch(/3–4 years/);
    expect(e.desc.zh).toContain('3–4 年');
  });

  it('no ear click for the stroke (symptomatic) form; Wallerian shrinkage takes years', () => {
    const pt = SYMPTOM_BY_ID.palatal_tremor.desc;
    expect(pt.en).not.toMatch(/sometimes an audible ear click/);
    expect(pt.en).toMatch(/no ear click/);
    expect(pt.en).toMatch(/essential palatal tremor/);
    expect(pt.zh).not.toMatch(/有時聽得到耳內喀喀聲/);
    expect(pt.en).toMatch(/nystagmus/);
    const w = event(scenario('l_m1', 2160), 'wallerian_l')!;
    expect(w.desc.en).toMatch(/over years/);
    expect(w.desc.zh).toContain('數年');
  });
});

describe('C3: the new labels are part of the locked-in family everywhere', () => {
  it('only one label of the family at a time', () => {
    for (const r of [one('basilar_upper', 24), one('basilar_upper', 2160), scenario('basilar_mid', 24), scenario('basilar_mid', 2160), one('basilar_lower', 24)])
      expect(syn(r).filter((s) => LOCKED_IN_FAMILY.includes(s))).toHaveLength(1);
  });
});

/**
 * Review of the brainstem outputs (R5): a lesion of both sides is one bilateral picture, not two
 * one-sided crossed syndromes (R5-1, R5-3, R5-10); the delayed Holmes tremor is a possibility (R5-2);
 * the locked-in and basilar-coma events follow what the labels show (R5-4, R5-5); one ordinary
 * paramedian pontine infarct does not lower consciousness (R5-6).
 */
/** an event shown at `tH` */
const activeAt = (e: CascadeEvent, tH: number) => e.onsetH <= tH && tH < (e.endH ?? Infinity);
const crossedMidbrain = (r: SimResult) => syn(r).filter((s) => /^(claude|weber_benedikt)_/.test(s));
const THALAMIC_PIECES = ['thalamic_sensory', 'thalamic_tuberothalamic', 'thalamomesencephalic', 'thalamic_paramedian_unilateral'];

describe('R5-1, R5-10: both paramedian midbrain halves are one bilateral picture, not two one-sided crossed syndromes', () => {
  it('basilar tip with good collaterals, with or without the absent left PComm: the top-of-the-basilar label stays and hides the one-sided pieces', () => {
    for (const variants of [[], ['pcomm_absent_l']])
      for (const tH of [24, 48, 336, 720, 2160, 4320]) {
        const r = one('basilar_tip', tH, { variants });
        const where = `${variants.join() || 'no variant'} ${tH} h`;
        expect(crossedMidbrain(r), where).toEqual([]);
        expect(syn(r), where).toContain('top_of_basilar');
        expect(syn(r).filter((s) => THALAMIC_PIECES.some((p) => s.startsWith(p))), where).toEqual([]);
      }
  });

  it('reopened after the midbrain has infarcted on both sides: never a crossed midbrain syndrome on each side', () => {
    for (const collateral of ['good', 'moderate', 'poor'] as const)
      for (const reperfusionH of [2, 4.5, 6, 8, 12, 24])
        for (const tH of [6, 24, 336, 4320]) {
          const sides = new Set(crossedMidbrain(one('basilar_tip', tH, { collateral, reperfusionH })).map((s) => s.slice(-1)));
          expect(sides.size, `${collateral} reopened ${reperfusionH} h, ${tH} h`).toBeLessThan(2);
        }
  });

  it('one paramedian midbrain half keeps its crossed syndrome', () => {
    for (const tH of [24, 4320]) expect(syn(one('mesencephalic_perf_l', tH)), `${tH} h`).toEqual(['weber_benedikt_l']);
  });

  it('a paramedian thalamomesencephalic infarct also hides a Weber label of its side', () => {
    expect(SYNDROMES.find((s) => s.id === 'thalamomesencephalic')!.supersedes).toEqual(expect.arrayContaining(['claude', 'weber_benedikt']));
  });
});

describe('R5-2: the Holmes tremor is a possible, mild late symptom, not listed in a disorder of consciousness', () => {
  it('is named as possible, in a minority, months later', () => {
    const n = SYMPTOM_BY_ID.holmes_tremor.name;
    expect(n.en).toMatch(/^Possible: Holmes \(rubral\) tremor/);
    expect(n.en).toMatch(/months later, a minority/);
    expect(n.zh).toMatch(/^可能出現：/);
    expect(n.zh).toContain('少數人');
  });

  it('the paramedian midbrain gives it at severity 1', () => {
    const d = REGION_DEFS.find((x) => x.id === 'midbrain_paramedian')!.deficits.find((x) => x.s === 'holmes_tremor')!;
    expect(d.sev).toBe(1);
    for (const tH of [2160, 4320]) expect(sym(one('mesencephalic_perf_l', tH), 'holmes_tremor').map((s) => [s.side, s.sev]), `${tH} h`).toEqual([['r', 1]]);
  });

  it('not while the patient is comatose or in a disorder of consciousness after it', () => {
    const both: Occlusion[] = [
      { vessel: 'mesencephalic_perf_r', severity: 1 },
      { vessel: 'mesencephalic_perf_l', severity: 1 },
    ];
    for (const r of [scenario('basilar_tip', 2160), scenario('basilar_tip', 4320), occ(both, 4320), one('basilar_tip', 4320)]) {
      expect(ids(r).some((id) => id === 'coma' || id === 'disorder_of_consciousness')).toBe(true);
      expect(ids(r)).not.toContain('holmes_tremor');
    }
    // awake (hypersomnia after a Percheron infarct with the midbrain): listed, on both sides, mild
    expect(sym(scenario('percheron_midbrain', 4320), 'holmes_tremor').map((s) => [s.side, s.sev])).toEqual([
      ['l', 1],
      ['r', 1],
    ]);
  });
});

describe('R5-3: one-and-a-half only with its signs; both caudal tegmenta are one bilateral picture', () => {
  const REOPENED: [CollateralGrade, number][] = [
    ['poor', 2],
    ['moderate', 6],
    ['good', 18],
  ];
  it('mid-basilar occlusion reopened early: never a one-and-a-half label on each side, never one beside limb weakness', () => {
    for (const [collateral, reperfusionH] of REOPENED)
      for (const tH of [6, 24, 168, 336, 2160, 4320]) {
        const r = one('basilar_mid', tH, { collateral, reperfusionH });
        const where = `${collateral} reopened ${reperfusionH} h, ${tH} h`;
        const oah = syn(r).filter((s) => s.startsWith('one_and_half'));
        expect(oah.length, where).toBeLessThan(2);
        if (oah.length) expect(ids(r).some((id) => id === 'arm_weak' || id === 'leg_weak'), where).toBe(false);
      }
  });

  // X2-9: the ventral pons of both sides was below the symptom threshold once blood returned, so
  // the swelling of the following days no longer brings the weakness of all four limbs and the
  // anarthria back (the R5-3 course showed them, and the incomplete locked-in label, from day 1 to
  // two weeks after a deficit-free first day); the infarcted tegmenta stay one bilateral picture
  // Y1-12: the rescued ventral pons regains its function over days to weeks after the reopening
  // (longer the later it is), so the bilateral signs fade then rather than at the reopening
  it('reopened before both ventral halves infarcted: the bilateral signs fade as the pons recovers and do not come back with the swelling (X2-9)', () => {
    const STOPS = [24, 48, 72, 120, 168, 336, 720, 2160, 4320];
    for (const [collateral, reperfusionH] of REOPENED) {
      const runs = STOPS.map((tH) => one('basilar_mid', tH, { collateral, reperfusionH }));
      const signs = (r: ReturnType<typeof one>) => ids(r).includes('anarthria') || syn(r).some((x) => x.startsWith('locked_in'));
      const gone = runs.findIndex((r) => !signs(r));
      expect(gone, `${collateral} reopened ${reperfusionH} h`).toBeGreaterThanOrEqual(0);
      for (let i = gone; i < runs.length; i++) expect(signs(runs[i]), `${collateral} reopened ${reperfusionH} h, ${STOPS[i]} h`).toBe(false);
      const m3 = runs[STOPS.indexOf(2160)];
      expect(sym(m3, 'gaze_palsy_horizontal').map((x) => x.side).sort(), `${collateral} reopened ${reperfusionH} h`).toEqual(['l', 'r']);
    }
  });

  it('a one-sided lesion of the dorsal caudal pons keeps the label', () => {
    for (const tH of [24, 4320]) expect(syn(one('pontine_circumferential_l', tH)), `${tH} h`).toContain('one_and_half_l');
  });

  it('the label needs the other eye to keep its horizontal movement and no limb weakness', () => {
    const def = SYNDROMES.find((s) => s.id === 'one_and_half')!;
    const q = (list: [string, Side | null][]) => ({
      has: (id: string) => list.some(([x]) => x === id),
      on: (id: string, side: Side) => list.some(([x, s]) => x === id && s === side),
      from: () => false,
    });
    expect(def.requires!(q([['gaze_palsy_horizontal', 'l']]), 'l')).toBe(true);
    expect(def.requires!(q([['gaze_palsy_horizontal', 'l'], ['gaze_palsy_horizontal', 'r']]), 'l')).toBe(false);
    expect(def.requires!(q([['gaze_palsy_horizontal', 'l'], ['arm_weak', 'r']]), 'l')).toBe(false);
    expect(def.requires!(q([['gaze_palsy_horizontal', 'l'], ['leg_weak', 'l']]), 'l')).toBe(false);
  });
});

describe('R5-4: the locked-in event does not say the state resolves while a locked-in label stays', () => {
  it.each([24, 26, 28, 30])('mid-basilar occlusion reopened at %s h: an open-ended "incomplete" event, like the label at 6 months', (reperfusionH) => {
    const r = one('basilar_mid', 4320, { reperfusionH });
    expect(syn(r)).toContain('locked_in_incomplete');
    // (X2-15: the classical picture before the reopening has its own event, which ends then)
    const e = event(r, 'locked_in_incomplete')!;
    expect(e.endH).toBeUndefined();
    expect(e.title.en).toMatch(/incomplete locked-in/);
    for (const x of r.cascade.events.filter((y) => y.id.startsWith('locked_in'))) {
      expect(x.desc.en, x.id).not.toMatch(/resolves then/);
      expect(x.desc.zh, x.id).not.toContain('這個狀態隨之解除');
    }
  });

  // X2-7, X2-10: the coma does not "resolve" (the ventral pons has infarcted), but it does lift when
  // blood returns, and the person wakes up incompletely locked-in then, not two weeks later; the
  // swelling does not make the person comatose again (X2-9)
  // Y1-12: the tegmentum rescued at 6 h regains its function over days, so the coma lifts then (not
  // at the instant of the reopening); the person wakes incompletely locked-in
  it('upper basilar occlusion reopened at 6 h: the coma lifts as the tegmentum recovers and the incomplete locked-in state has its event from then', () => {
    const late = one('basilar_upper', 4320, { reperfusionH: 6 });
    expect(syn(late)).toContain('locked_in_incomplete');
    for (const e of late.cascade.events.filter((x) => x.id === 'basilar_coma' || x.id.startsWith('locked_in'))) {
      expect(e.desc.en, e.id).not.toMatch(/resolves then/);
      expect(e.desc.zh, e.id).not.toContain('這個狀態隨之解除');
    }
    const comaEnd = event(late, 'basilar_coma')!.endH!;
    expect(comaEnd).toBeGreaterThan(6);
    expect(event(late, 'locked_in_incomplete')!.onsetH).toBe(comaEnd);
    const day7 = one('basilar_upper', 168, { reperfusionH: 6 });
    expect(syn(day7)).toEqual(['locked_in_incomplete']);
    expect(activeAt(event(day7, 'basilar_coma')!, 168)).toBe(false);
  });

  it('reopened before the pons infarcts on both sides, it still resolves after the reopening, as the pons recovers', () => {
    for (const reperfusionH of [1, 3]) {
      const r = one('basilar_mid', 4320, { reperfusionH });
      const course = r.cascade.events.filter((x) => x.id.startsWith('locked_in'));
      const last = course[course.length - 1];
      expect(last.endH).toBeGreaterThan(reperfusionH);
      expect(last.endH).toBeLessThan(24);
      expect(last.desc.en).toMatch(/resolves as the rescued tissue regains its function/);
    }
  });

  // X2-9 supersedes R5-3's sentence: the swelling around small infarcts of both halves no longer
  // brings the weakness of all four limbs and the loss of speech back, so the event does not say so
  it('small infarcts left on both sides: the state resolves as the pons recovers and the event promises no return with the swelling (X2-9)', () => {
    const r = one('basilar_mid', 4320, { collateral: 'poor', reperfusionH: 2 });
    const course = r.cascade.events.filter((x) => x.id.startsWith('locked_in'));
    const last = course[course.length - 1];
    expect(last.endH).toBeGreaterThan(2);
    expect(last.endH).toBeLessThan(72);
    expect(last.desc.en).toMatch(/resolves as the rescued tissue regains its function/);
    for (const e of course) {
      expect(e.desc.en).not.toMatch(/swelling around them/);
      expect(e.desc.zh).not.toContain('周圍的水腫');
    }
    for (const tH of [72, 120, 168]) expect(syn(one('basilar_mid', tH, { collateral: 'poor', reperfusionH: 2 })).filter((x) => x.startsWith('locked_in')), `${tH} h`).toEqual([]);
  });
});

describe('R5-5: the basilar coma ends when it is relabelled, and the state that follows has its own event', () => {
  it('upper basilar occlusion reopened at 8 or 24 h: awake and locked-in from two weeks, with the locked-in event, not the coma event', () => {
    // reopened at 24 h the tegmentum has infarcted: comatose until the coma is relabelled at two
    // weeks, then classical locked-in; reopened at 8 h it had not, but it regains its function only
    // over the following two weeks (Y1-12; was: awake from the reopening, X2-7): incompletely
    // locked-in from then
    for (const [reperfusionH, id, from] of [
      [8, 'locked_in_incomplete', 336],
      [24, 'locked_in', 336],
    ] as const)
      for (const tH of [336, 720, 4320]) {
        const r = one('basilar_upper', tH, { reperfusionH });
        const where = `reopened ${reperfusionH} h, ${tH} h`;
        expect(ids(r), where).not.toContain('coma');
        expect(syn(r), where).toContain(id);
        expect(activeAt(event(r, 'basilar_coma')!, tH), where).toBe(false);
        expect(event(r, 'basilar_coma')!.endH, where).toBe(from);
        const li = event(r, id)!;
        expect(li.onsetH, where).toBe(from);
        expect(activeAt(li, tH), where).toBe(true);
        expect(li.desc.en, where).toMatch(/The coma has lifted/);
        expect(li.desc.en, where).toMatch(/60%/);
      }
    expect(event(one('basilar_upper', 4320, { reperfusionH: 24 }), 'locked_in')!.title.en).toBe('Bilateral ventral pons: locked-in syndrome');
    expect(event(one('basilar_upper', 4320, { reperfusionH: 8 }), 'locked_in_incomplete')!.title.en).toMatch(/incomplete locked-in/);
  });

  it('untreated: a disorder of consciousness from two weeks, with an event that says so; the coma event has ended', () => {
    for (const tH of [336, 4320]) {
      const r = one('basilar_upper', tH);
      expect(syn(r), `${tH} h`).toContain('pontine_doc');
      expect(activeAt(event(r, 'basilar_coma')!, tH), `${tH} h`).toBe(false);
      const after = event(r, 'pontine_doc')!;
      expect(after.onsetH).toBe(336);
      expect(activeAt(after, tH), `${tH} h`).toBe(true);
      expect(after.title.en).toMatch(/disorder of consciousness or locked-in/);
      expect(after.desc.en).toMatch(/looking up or blinking/);
      expect(after.desc.zh).toContain('眨眼');
      expect(after.desc.en).toMatch(/60%/);
    }
    // while comatose the coma event says so, and what may follow
    const acute = event(one('basilar_upper', 24), 'basilar_coma')!;
    expect(acute.endH).toBe(336);
    expect(acute.desc.en).toMatch(/comatose now/);
  });

  it('no coma event is ever active without coma (or a disorder of consciousness) in the list', () => {
    for (const reperfusionH of [null, 6, 8, 12, 24])
      for (const tH of [24, 48, 168, 336, 720, 2160, 4320]) {
        const r = one('basilar_upper', tH, { reperfusionH });
        const e = event(r, 'basilar_coma');
        if (e && activeAt(e, tH) && tH >= 336) expect(ids(r).some((id) => id === 'coma' || id === 'disorder_of_consciousness'), `${reperfusionH} ${tH}`).toBe(true);
      }
  });
});

describe('R5-6: one paramedian upper pontine perforator does not lower consciousness', () => {
  it('a one-sided rostral paramedian pontine infarct (basilar branch disease): no drowsiness, NIHSS 1a 0, also as a short TIA', () => {
    for (const s of ['l', 'r']) {
      const r = one(`pontine_paramedian_rostral_${s}`, 24);
      expect(syn(r)).toEqual([`pontine_anteromedial_${s}`]);
      expect(ids(r)).not.toContain('somnolence');
      expect(r.nihss.items['1a'] ?? 0).toBe(0);
    }
    const tia = occ([{ vessel: 'pontine_paramedian_rostral_l', severity: 1, toH: 5 / 60 }], 0.05);
    expect(ids(tia)).not.toContain('somnolence');
  });

  it('the whole upper pontine tegmentum of one side (paramedian and SCA branches): drowsiness, as a model assumption', () => {
    const r = occ(
      [
        { vessel: 'pontine_paramedian_rostral_l', severity: 1 },
        { vessel: 'sca_l', severity: 1 },
      ],
      24,
    );
    expect(r.regions.pons_rostral_tegmentum_l.dys).toBeGreaterThan(0.85);
    expect(ids(r)).toContain('somnolence');
    expect(r.nihss.items['1a']).toBe(1);
  });

  it('the coma and drowsiness texts call the one-sided drowsiness a model assumption and keep the 2 of 9', () => {
    const coma = SYMPTOM_BY_ID.coma.desc;
    expect(coma.en).toMatch(/2 of 9/);
    expect(coma.en).toMatch(/model assumption/);
    expect(coma.en).not.toMatch(/when extensive, can cause drowsiness instead/);
    expect(coma.zh).toContain('模型的假設');
    const som = SYMPTOM_BY_ID.somnolence.desc;
    expect(som.en).toMatch(/model assumption/);
    expect(som.en).not.toMatch(/possible with an extensive one-sided upper pontine tegmental infarct/);
    expect(som.zh).toContain('模型的假設');
  });
});
