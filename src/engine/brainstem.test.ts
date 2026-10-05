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
import type { Occlusion } from './hemodynamics';
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

  it('the locked-in event is titled by its course: a passing risk when reopened in time, incomplete when the infarct is partial', () => {
    expect(event(one('basilar_mid', 4320, { reperfusionH: 1 }), 'locked_in')!.title.en).toMatch(/risk of locked-in/);
    expect(event(scenario('basilar_mid', 24), 'locked_in')!.title.en).toBe('Bilateral ventral pons: locked-in syndrome');
    const lower = event(one('basilar_lower', 24), 'locked_in')!;
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

describe('C3-F3 (S1): a one-sided upper pontine tegmental lesion lowers arousal when it is extensive', () => {
  it('an extensive one-sided rostral pontine tegmental infarct: drowsiness (NIHSS 1a 1), not coma', () => {
    const r = one('pontine_paramedian_rostral_l', 24);
    expect(r.regions.pons_rostral_tegmentum_l.dys).toBeGreaterThan(0.5);
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
        expect(e!.endH).toBeLessThanOrEqual(72);
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
    const r = one('pontine_paramedian_rostral_l', 24);
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
