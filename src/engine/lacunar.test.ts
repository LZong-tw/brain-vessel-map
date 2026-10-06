/**
 * Lacunar and deep (capsule, basal ganglia, anterior choroidal) syndromes: how severe a single
 * lacune is, which presentation a branch gives depending on where it lands, capsular TIAs and the
 * capsular warning syndrome, post-stroke movement disorders, and the striatocapsular, thalamic,
 * genu and caudate pictures. Sources are next to the data (src/anatomy/lacunes.ts, regions.ts,
 * syndromes.ts, scenarios.ts, postStrokeRisks.ts) and in REFERENCES.md.
 */
import { describe, expect, it } from 'vitest';
import { POST_STROKE_RISKS } from '../anatomy/postStrokeRisks';
import { REGION_DEFS } from '../anatomy/regions';
import { SCENARIOS, SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { caseNotes } from '../ui/postStrokeRisks';
import { aggregateSymptoms, type SymptomItem } from './clinical';
import type { CollateralGrade, Occlusion } from './hemodynamics';
import { simulate, type SimInput, type SimResult } from './simulate';

const inputOf = (id: string, over: Partial<SimInput> = {}): SimInput => {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc) throw new Error(`no scenario ${id}`);
  return {
    occlusions: sc.occlusions,
    variants: sc.variants ?? [],
    collateral: sc.collateral ?? 'good',
    map: sc.map ?? 93,
    tH: sc.tH ?? 24,
    reperfusionH: sc.reperfusionH ?? null,
    decompression: sc.decompression ?? false,
    ...over,
  };
};
const scenario = (id: string, tH: number) => simulate(inputOf(id, { tH }));
const occl = (...ids: string[]): Occlusion[] => ids.map((vessel) => ({ vessel, severity: 1 }));
const sim = (occlusions: Occlusion[], tH: number, over: Partial<SimInput> = {}) =>
  simulate({ occlusions, variants: [], collateral: 'good' as CollateralGrade, map: 93, tH, reperfusionH: null, decompression: false, ...over });
/** one branch of a perforator bundle, optionally at a given lacune site */
const lacune = (vessel: string, lacuneSite?: string, window: Partial<Occlusion> = {}): Occlusion => ({
  vessel,
  severity: 1,
  branch: true,
  ...(lacuneSite ? { lacuneSite } : {}),
  ...window,
});
const sym = (r: SimResult | SymptomItem[]) => (Array.isArray(r) ? r : r.symptoms).map((s) => `${s.id}(${s.side ?? '-'})`);
const has = (r: SimResult, id: string) => r.symptoms.some((s) => s.id === id);
const get = (r: SimResult, id: string, side?: SymptomItem['side']) =>
  r.symptoms.find((s) => s.id === id && (side === undefined || s.side === side));
const labels = (r: SimResult) => r.syndromes.map((m) => m.def.id + (m.side ? `_${m.side}` : ''));
const item = (r: SimResult, k: string) => r.nihss.items[k] ?? 0;

describe('C6-F1: a single lacune is mild to moderate, not a complete hemiplegia', () => {
  it('capsular pure motor lacune: NIHSS 3–6, face, arm and leg weak to a similar degree, no sensory loss', () => {
    for (const tH of [3, 24, 72]) {
      const r = scenario('l_lacune', tH);
      expect(r.nihss.total, `${tH} h`).toBeGreaterThanOrEqual(3);
      expect(r.nihss.total, `${tH} h`).toBeLessThanOrEqual(6);
      const sevs = ['face_weak', 'arm_weak', 'leg_weak'].map((id) => get(r, id, 'r')?.sev ?? 0);
      for (const s of sevs) expect(s).toBeGreaterThanOrEqual(1);
      for (const s of sevs) expect(s).toBeLessThanOrEqual(2);
      expect(Math.max(...sevs) - Math.min(...sevs)).toBeLessThanOrEqual(1);
      expect(r.symptoms.some((s) => s.id.startsWith('sens_'))).toBe(false);
      expect(labels(r)).toContain('lacunar_pure_motor_l');
    }
    // an AChA branch in the posterior limb is the same lacune
    const acha = sim([lacune('acha_l')], 24);
    expect(acha.nihss.total).toBeGreaterThanOrEqual(3);
    expect(acha.nihss.total).toBeLessThanOrEqual(6);
  });

  it('a larger (non-lacunar) capsular infarct keeps the region\'s own, denser weakness', () => {
    // most of the posterior limb dead, not one compact lacune: the region's severities
    const lvl = { ic_posterior_limb_l: 0.9 };
    expect(aggregateSymptoms(lvl, lvl, 24).find((s) => s.id === 'arm_weak')?.sev).toBe(3);
    // the whole AChA is weaker than one of its branches
    expect(get(scenario('l_acha', 24), 'arm_weak', 'r')!.sev).toBeGreaterThan(get(scenario('l_lacune', 24), 'arm_weak', 'r')!.sev);
  });

  it('the teaching texts say "to a similar degree" and keep the dense-hemiplegia caveat', () => {
    const sc = SCENARIO_BY_ID.l_lacune;
    expect(sc.summary.en).toMatch(/similar degree/);
    expect(sc.summary.en).not.toMatch(/equally weak/);
    expect(sc.summary.zh).toMatch(/程度相近/);
    expect(sc.summary.zh).not.toMatch(/同等無力/);
    const pm = SYNDROMES.find((d) => d.id === 'lacunar_pure_motor')!;
    expect(pm.desc.en).toMatch(/similar degree/);
    expect(pm.desc.en).toMatch(/lowest part of the internal capsule/);
    expect(pm.desc.zh).toMatch(/內囊最下方/);
  });

  it('pontine ataxic hemiparesis: the weakness is mild enough for the ataxia to be scored', () => {
    for (const tH of [24, 72]) {
      const r = scenario('r_pontine_lacune', tH);
      const arm = get(r, 'arm_weak', 'l');
      expect(arm?.sev, `${tH} h`).toBeLessThanOrEqual(2);
      expect(get(r, 'ataxia_limb', 'l')?.sev, `${tH} h`).toBeGreaterThanOrEqual(2);
      expect(item(r, '7'), `${tH} h`).toBeGreaterThanOrEqual(1);
      expect(labels(r)).toContain('pontine_lacunar_r');
    }
  });

  it('pure motor, ataxic hemiparesis and dysarthria–clumsy hand are alternative pontine presentations', () => {
    const pm = sim([lacune('pontine_paramedian_rostral_r', 'pure_motor')], 24);
    const ah = sim([lacune('pontine_paramedian_rostral_r', 'ataxic')], 24);
    const dch = sim([lacune('pontine_paramedian_rostral_r', 'dch')], 24);
    expect(has(pm, 'arm_weak') && has(pm, 'leg_weak')).toBe(true);
    expect(has(pm, 'ataxia_limb') || has(pm, 'hand_clumsy')).toBe(false);
    expect(has(ah, 'ataxia_limb') && has(ah, 'arm_weak')).toBe(true);
    expect(has(ah, 'hand_clumsy')).toBe(false);
    expect(has(dch, 'dysarthria') && has(dch, 'hand_clumsy')).toBe(true);
    expect(has(dch, 'arm_weak') || has(dch, 'leg_weak') || has(dch, 'ataxia_limb')).toBe(false);
    for (const r of [pm, ah, dch]) {
      expect(r.nihss.total).toBeLessThanOrEqual(6);
      expect(labels(r)).toContain('pontine_lacunar_r');
    }
    // a plain branch is the commonest picture: pure motor
    expect(sym(sim([lacune('pontine_paramedian_rostral_r')], 24))).toEqual(sym(pm));
  });

  it('two pontine lacunes, one on each side, with mild weakness are not a locked-in syndrome', () => {
    const r = sim([lacune('pontine_paramedian_rostral_r', 'ataxic'), lacune('pontine_paramedian_rostral_l', 'ataxic')], 24);
    expect(r.symptoms.filter((s) => s.id === 'arm_weak').every((s) => s.sev <= 2)).toBe(true);
    expect(labels(r).some((l) => l.startsWith('locked_in'))).toBe(false);
    expect(has(r, 'anarthria')).toBe(false);
  });
});

describe('C6-F2: capsular TIAs and the capsular / pontine warning syndrome', () => {
  it('a branch occlusion causes its deficit from the start, before any tissue has died', () => {
    for (const tH of [0, 0.02, 0.05, 0.1]) {
      const r = sim([lacune('lenticulostriate_l')], tH);
      expect(get(r, 'arm_weak', 'r'), `${tH} h`).toBeDefined();
      expect(r.nihss.total, `${tH} h`).toBeGreaterThanOrEqual(3);
    }
    // nothing has died yet at 3 minutes
    expect(sim([lacune('lenticulostriate_l')], 0.05).volumes.core).toBeLessThan(0.05);
  });

  it('a 5-minute branch occlusion is a fully reversible capsular TIA, with the TIA events', () => {
    const tia = [lacune('lenticulostriate_l', undefined, { fromH: 0, toH: 1 / 12 })];
    const during = sim(tia, 0);
    expect(get(during, 'arm_weak', 'r')).toBeDefined();
    for (const tH of [0.25, 24, 2160]) {
      const r = sim(tia, tH);
      expect(r.symptoms, `${tH} h`).toEqual([]);
      expect(r.nihss.total, `${tH} h`).toBe(0);
    }
    expect(during.volumes.finalInfarct).toBeLessThan(0.05);
    const ids = during.cascade.events.map((e) => e.id);
    expect(ids).toEqual(expect.arrayContaining(['ischemia_no_infarct', 'tia_urgent']));
  });

  it('a lacunar stroke gets the ischaemia events, but treatment does not "recanalise" a branch', () => {
    const r = sim([lacune('lenticulostriate_l')], 24);
    expect(r.cascade.events.map((e) => e.id)).toContain('ischemic_cascade');
    const treated = sim([lacune('lenticulostriate_l')], 24, { reperfusionH: 1 });
    expect(treated.cascade.events.map((e) => e.id)).not.toContain('reperfusion');
  });

  it('teaching scenario: crescendo capsular attacks that clear, then a lacunar stroke', () => {
    const sc = SCENARIO_BY_ID.capsular_warning;
    expect(sc).toBeDefined();
    // the attacks: deficit at each start, none in between
    for (const tH of [0, 1, 3]) expect(get(scenario('capsular_warning', tH), 'arm_weak', 'r'), `${tH} h`).toBeDefined();
    for (const tH of [0.25, 2, 4.5]) expect(scenario('capsular_warning', tH).symptoms, `${tH} h`).toEqual([]);
    // the warning label from the second attack within 24 h
    expect(labels(scenario('capsular_warning', 0))).not.toContain('capsular_warning_l');
    for (const tH of [1, 2, 3, 6, 24]) expect(labels(scenario('capsular_warning', tH)), `${tH} h`).toContain('capsular_warning_l');
    // the stroke that follows: a lacune, from the moment of the last occlusion
    const stroke = scenario('capsular_warning', 24);
    expect(labels(stroke)).toContain('lacunar_pure_motor_l');
    expect(stroke.volumes.finalInfarct).toBeLessThan(2);
    // a course label for the days of high risk, not for months later
    expect(labels(scenario('capsular_warning', 2160))).not.toContain('capsular_warning_l');
  });

  it('one attack, attacks more than a day apart, or a whole-bundle occlusion are not a warning syndrome', () => {
    const one = sim([lacune('lenticulostriate_l', undefined, { toH: 1 / 12 })], 1);
    expect(labels(one).some((l) => l.startsWith('capsular_warning'))).toBe(false);
    const apart = sim(
      [lacune('lenticulostriate_l', undefined, { toH: 1 / 12 }), lacune('lenticulostriate_l', undefined, { fromH: 48, toH: 48 + 1 / 12 })],
      48,
    );
    expect(labels(apart).some((l) => l.startsWith('capsular_warning'))).toBe(false);
    const bundle = sim(
      [
        { vessel: 'lenticulostriate_l', severity: 1, toH: 1 / 12 },
        { vessel: 'lenticulostriate_l', severity: 1, fromH: 1, toH: 1 + 1 / 12 },
      ],
      1,
    );
    expect(labels(bundle).some((l) => l.startsWith('capsular_warning'))).toBe(false);
  });

  it('the same crescendo pattern from a pontine paramedian branch (pontine warning syndrome)', () => {
    const r = sim(
      [
        lacune('pontine_paramedian_rostral_r', undefined, { toH: 1 / 12 }),
        lacune('pontine_paramedian_rostral_r', undefined, { fromH: 2, toH: 2 + 1 / 12 }),
      ],
      2,
    );
    expect(labels(r)).toContain('capsular_warning_r');
  });

  it('the label text gives the risk figures with their sources', () => {
    const d = SYNDROMES.find((x) => x.id === 'capsular_warning')!;
    expect(d.desc.en).toMatch(/42 %/);
    expect(d.desc.en).toMatch(/60 %/);
    expect(d.desc.zh).toMatch(/42%/);
    expect(d.desc.zh).toMatch(/60%/);
  });
});

describe('C6-F3: post-stroke movement disorders are uncommon, not a symptom of every deep infarct', () => {
  it('no deep or MCA infarct lists involuntary movements as a present symptom', () => {
    expect(SYMPTOM_BY_ID.movement_disorder).toBeUndefined();
    expect(REGION_DEFS.flatMap((d) => d.deficits).some((d) => d.s === 'movement_disorder')).toBe(false);
    for (const id of ['l_m1', 'l_lsa', 'l_acha', 'l_thalamic', 'l_pca', 'basilar_tip'])
      for (const tH of [24, 2160]) expect(scenario(id, tH).symptoms.map((s) => s.id).some((s) => /movement|chorea|dystonia/.test(s)), `${id} ${tH}`).toBe(false);
  });

  it('listed among the problems after stroke as uncommon (~1 %), with lesion sites and their delayed thalamic form', () => {
    const md = POST_STROKE_RISKS.find((r) => r.id === 'movement_disorders');
    expect(md).toBeDefined();
    expect(md!.system).toBe('motor');
    expect(md!.prevalence.value).toBeGreaterThan(0.005);
    expect(md!.prevalence.value).toBeLessThan(0.02);
    expect(md!.sources.some((s) => s.startsWith('Ghika-Schmid F'))).toBe(true);
    expect(md!.factors.en).toMatch(/thalam/);
    expect(md!.factors.zh).toMatch(/視丘/);
  });

  it('a case whose infarct involves the basal ganglia or the lateral thalamus gets a note; others do not', () => {
    const md = POST_STROKE_RISKS.find((r) => r.id === 'movement_disorders')!;
    expect(caseNotes(md, scenario('l_lsa', 4320)).length).toBe(1);
    expect(caseNotes(md, scenario('l_thalamic', 4320)).length).toBe(1);
    expect(caseNotes(md, scenario('r_wallenberg', 4320))).toEqual([]);
  });
});

describe('C6-F4: the anterior choroidal artery syndrome as it usually presents', () => {
  it('the texts say most present with a lacunar syndrome and the full triad is uncommon', () => {
    const d = SYNDROMES.find((x) => x.id === 'acha')!;
    expect(d.desc.en).toMatch(/83 %/);
    expect(d.desc.zh).toMatch(/83%/);
    expect(d.desc.en).toMatch(/uncommon/);
    const sc = SCENARIO_BY_ID.l_acha;
    expect(sc.summary.en).toMatch(/lacunar/);
    expect(sc.summary.zh).toMatch(/腔隙/);
  });
});

describe('C6-F5: ataxic hemiparesis and dysarthria–clumsy hand above the tentorium', () => {
  it('a lenticulostriate branch in the corona radiata: ataxic hemiparesis, labelled as such', () => {
    const r = sim([lacune('lenticulostriate_l', 'ataxic')], 24);
    expect(sym(r)).toEqual(expect.arrayContaining(['arm_weak(r)', 'leg_weak(r)', 'ataxia_limb(r)']));
    expect(get(r, 'arm_weak', 'r')!.sev).toBeLessThanOrEqual(2);
    expect(r.symptoms.some((s) => s.id.startsWith('sens_'))).toBe(false);
    expect(item(r, '7')).toBeGreaterThanOrEqual(1);
    expect(r.regions.corona_radiata_l.infarct).toBeGreaterThan(0);
    expect(labels(r)).toContain('lacunar_ataxic_hemiparesis_l');
    expect(labels(r)).not.toContain('lacunar_pure_motor_l');
    // the AChA reaches the posterior paraventricular corona radiata too
    expect(labels(sim([lacune('acha_r', 'ataxic')], 24))).toContain('lacunar_ataxic_hemiparesis_r');
  });

  it('a capsular branch at the genu: dysarthria–clumsy hand without a hemiparesis', () => {
    const r = sim([lacune('lenticulostriate_l', 'dch')], 24);
    expect(sym(r)).toEqual(expect.arrayContaining(['dysarthria(-)', 'hand_clumsy(r)']));
    expect(has(r, 'arm_weak') || has(r, 'leg_weak') || has(r, 'ataxia_limb')).toBe(false);
    expect(labels(r)).toContain('lacunar_dysarthria_clumsy_hand_l');
    expect(labels(r)).not.toContain('lacunar_pure_motor_l');
  });

  it('a teaching scenario for the supratentorial form', () => {
    const r = scenario('l_cr_lacune', 24);
    expect(labels(r)).toContain('lacunar_ataxic_hemiparesis_l');
  });

  it('larger capsular or MCA infarcts do not all become ataxic hemiparesis', () => {
    for (const id of ['l_lsa', 'l_acha', 'l_m1', 'l_lacune'])
      for (const tH of [24, 2160]) {
        const r = scenario(id, tH);
        expect(labels(r).some((l) => l.startsWith('lacunar_ataxic') || l.startsWith('lacunar_dysarthria')), `${id} ${tH}`).toBe(false);
        expect(r.symptoms.some((s) => s.id === 'ataxia_limb'), `${id} ${tH}`).toBe(false);
      }
  });
});

describe('C6-F6: striatocapsular infarction', () => {
  it('arm-predominant weakness, not face-predominant', () => {
    for (const tH of [24, 72, 720]) {
      const r = scenario('l_lsa', tH);
      expect(get(r, 'arm_weak', 'r')!.sev, `${tH} h`).toBeGreaterThanOrEqual(get(r, 'face_weak', 'r')?.sev ?? 0);
    }
  });

  it('left: a subcortical (transcortical motor) aphasia from cortical hypoperfusion; right: neglect; the label stays', () => {
    const l = scenario('l_lsa', 24);
    expect(get(l, 'aphasia_tc_motor')?.sev).toBe(1);
    expect(labels(l)).toContain('striatocapsular_l');
    const ev = l.cascade.events.find((e) => e.id === 'striatocapsular_cortical_l');
    expect(ev).toBeDefined();
    expect(ev!.desc.en).toMatch(/hypoperfusion/);
    expect(ev!.desc.zh).toMatch(/灌流/);
    const r = sim(occl('lenticulostriate_r'), 24);
    expect(get(r, 'neglect', 'l')).toBeDefined();
    expect(labels(r)).toContain('striatocapsular_r');
    expect(has(r, 'aphasia_tc_motor')).toBe(false);
  });

  it('a lacune confined to the caudate or putamen region gives no aphasia', () => {
    expect(sim([lacune('heubner_l')], 24).symptoms.some((s) => s.id.startsWith('aphasia'))).toBe(false);
    expect(scenario('l_lacune', 24).symptoms.some((s) => s.id.startsWith('aphasia'))).toBe(false);
  });
});

describe('C6-F7: a pure sensory lacune is not also the thalamic (Dejerine–Roussy) syndrome', () => {
  it('one thalamogeniculate branch: pure sensory lacunar stroke only', () => {
    for (const tH of [24, 2160]) {
      const r = sim([lacune('thalamogeniculate_l')], tH);
      expect(labels(r), `${tH} h`).toContain('lacunar_pure_sensory_l');
      expect(labels(r), `${tH} h`).not.toContain('thalamic_sensory_l');
    }
  });

  it('the whole inferolateral territory: the thalamic syndrome only', () => {
    const r = scenario('l_thalamic', 24);
    expect(labels(r)).toContain('thalamic_sensory_l');
    expect(labels(r)).not.toContain('lacunar_pure_sensory_l');
  });
});

describe('C6-F8: the capsular genu', () => {
  it('the genu itself is a milder source of facial weakness', () => {
    const genu = REGION_DEFS.find((d) => d.id === 'ic_genu')!;
    expect(genu.deficits.find((d) => d.s === 'face_weak')?.sev).toBe(2);
  });

  it('a lower-genu lacune: confusion, apathy and memory loss with mild weakness (worse memory on the left)', () => {
    const l = sim([lacune('lenticulostriate_l', 'genu')], 24);
    expect(get(l, 'amnesia')?.sev).toBe(2);
    expect(has(l, 'abulia') && has(l, 'executive')).toBe(true);
    expect(get(l, 'arm_weak', 'r')?.sev ?? 0).toBeLessThanOrEqual(1);
    expect(labels(l)).toContain('capsular_genu_l');
    expect(labels(l)).not.toContain('lacunar_pure_motor_l');
    const r = sim([lacune('lenticulostriate_r', 'genu')], 24);
    expect(get(r, 'amnesia')?.sev).toBe(1);
  });

  it('the cognitive syndrome belongs to the genu lacune, not to every infarct that reaches the genu', () => {
    for (const id of ['l_lsa', 'l_lacune']) expect(has(scenario(id, 24), 'amnesia'), id).toBe(false);
  });
});

describe('C6-F9: caudate infarcts', () => {
  it('a caudate (Heubner branch) lacune: abulia, dysarthria and disinhibition, no movement disorder', () => {
    const r = sim([lacune('heubner_l')], 24);
    expect(r.symptoms.map((s) => s.id)).toEqual(expect.arrayContaining(['abulia', 'executive', 'dysarthria', 'disinhibition']));
    expect(r.nihss.total).toBe(1);
  });

  it('the disinhibition text no longer ties it to the orbitofrontal cortex alone', () => {
    expect(SYMPTOM_BY_ID.disinhibition.desc.en).toMatch(/caudate/);
    expect(SYMPTOM_BY_ID.disinhibition.desc.zh).toMatch(/尾狀核/);
  });
});

describe('R2-1: the clumsy hand of a dysarthria–clumsy hand lacune recovers, as its label text says', () => {
  it('capsular and pontine: moderate at first, milder within two weeks, gone by one month', () => {
    for (const v of ['lenticulostriate_l', 'pontine_paramedian_rostral_r']) {
      const hand = (tH: number) => sim([lacune(v, 'dch')], tH).symptoms.find((s) => s.id === 'hand_clumsy')?.sev ?? 0;
      expect(hand(24), v).toBe(2);
      expect(hand(336), v).toBe(1);
      for (const tH of [720, 2160, 4320]) expect(hand(tH), `${v} ${tH} h`).toBe(0);
    }
  });

  it('taken over by the spared fibres, not as a lost fractionated finger movement; a larger infarct keeps that', () => {
    const r = sim([lacune('lenticulostriate_l', 'dch')], 168);
    expect(get(r, 'hand_clumsy', 'r')?.recovery?.kind).toBe('partial');
    const big = { pons_rostral_basis_r: 0.9 };
    const hand = aggregateSymptoms(big, big, 4320).find((s) => s.id === 'hand_clumsy');
    expect(hand?.recovery?.kind).toBe('fine');
  });

  it('the label is shown while the hand is clumsy and its text keeps the good outlook', () => {
    expect(labels(sim([lacune('lenticulostriate_l', 'dch')], 24))).toContain('lacunar_dysarthria_clumsy_hand_l');
    expect(labels(sim([lacune('lenticulostriate_l', 'dch')], 2160))).not.toContain('lacunar_dysarthria_clumsy_hand_l');
    const d = SYNDROMES.find((x) => x.id === 'lacunar_dysarthria_clumsy_hand')!;
    expect(d.desc.en).toMatch(/symptom-free at discharge/);
    expect(d.desc.zh).toMatch(/出院時已無症狀/);
  });
});

describe('R2-2: the warning syndrome needs at least two attacks that cleared without an infarct', () => {
  const warned = (r: SimResult) => labels(r).some((l) => l.startsWith('capsular_warning'));

  it('one TIA followed by a lasting occlusion is not a crescendo', () => {
    const occ = [lacune('lenticulostriate_l', undefined, { toH: 1 / 12 }), lacune('lenticulostriate_l', undefined, { fromH: 2 })];
    for (const tH of [2, 3, 24]) expect(warned(sim(occ, tH)), `${tH} h`).toBe(false);
  });

  // (the capsule's white matter dies from about 2½ h of ischaemia on, behind one branch as behind
  // the whole bundle: W2-2, Z1-7; so attacks that infarct it last hours)
  it('two attacks that each leave an infarct are not crescendo TIAs', () => {
    const occ = [lacune('lenticulostriate_l', undefined, { toH: 4 }), lacune('lenticulostriate_l', undefined, { fromH: 6, toH: 10 })];
    expect(sim(occ, 5).volumes.core).toBeGreaterThan(0.3);
    for (const tH of [6, 12, 24]) expect(warned(sim(occ, tH)), `${tH} h`).toBe(false);
  });

  it('a TIA and then an infarcting attack within the day: no crescendo of TIAs either', () => {
    const occ = [lacune('lenticulostriate_l', undefined, { toH: 1 / 12 }), lacune('lenticulostriate_l', undefined, { fromH: 2, toH: 6 })];
    expect(sim(occ, 24).volumes.core).toBeGreaterThan(0.3);
    for (const tH of [2, 3, 24]) expect(warned(sim(occ, tH)), `${tH} h`).toBe(false);
  });

  it('two TIAs within a day: from the second one, and carried on by the lasting occlusion after them', () => {
    expect(warned(scenario('capsular_warning', 0.5))).toBe(false);
    for (const tH of [1, 6, 24, 168]) expect(warned(scenario('capsular_warning', tH)), `${tH} h`).toBe(true);
    const two = [lacune('lenticulostriate_l', undefined, { toH: 1 / 12 }), lacune('lenticulostriate_l', undefined, { fromH: 2, toH: 2 + 1 / 12 })];
    expect(warned(sim(two, 2))).toBe(true);
    expect(warned(sim([...two, lacune('lenticulostriate_l', undefined, { fromH: 5 })], 24))).toBe(true);
  });
});

describe('R2-3: a right capsular genu lacune leaves only a transient memory problem', () => {
  it('right: amnesia at first, gone within weeks; left: the verbal memory loss stays', () => {
    const r = (tH: number) => sim([lacune('lenticulostriate_r', 'genu')], tH);
    expect(get(r(24), 'amnesia')?.sev).toBe(1);
    expect(labels(r(24))).toContain('capsular_genu_r');
    for (const tH of [720, 2160, 4320]) {
      expect(has(r(tH), 'amnesia'), `${tH} h`).toBe(false);
      // the apathy stays, and the genu label with it: not a "pure" motor syndrome
      expect(has(r(tH), 'abulia'), `${tH} h`).toBe(true);
      expect(labels(r(tH)), `${tH} h`).toContain('capsular_genu_r');
      expect(labels(r(tH)), `${tH} h`).not.toContain('lacunar_pure_motor_r');
    }
    const l = sim([lacune('lenticulostriate_l', 'genu')], 2160);
    expect(get(l, 'amnesia')?.sev).toBeGreaterThanOrEqual(1);
    expect(labels(l)).toContain('capsular_genu_l');
  });
});

describe('R2-4: right deep neglect comes from the cortical hypoperfusion of a striatocapsular infarct, for three months', () => {
  it('the caudate head and putamen carry no neglect of their own', () => {
    for (const id of ['caudate_head', 'putamen'])
      expect(REGION_DEFS.find((d) => d.id === id)!.deficits.some((d) => d.s === 'neglect'), id).toBe(false);
  });

  it('a whole right lenticulostriate occlusion: neglect while the event shows it, none at 6 months', () => {
    const at = (tH: number) => sim(occl('lenticulostriate_r'), tH);
    const acute = at(24);
    expect(get(acute, 'neglect', 'l')).toBeDefined();
    expect(acute.cascade.events.find((e) => e.id === 'striatocapsular_cortical_r')?.endH).toBe(2160);
    for (const tH of [2160, 4320]) {
      expect(has(at(tH), 'neglect'), `${tH} h`).toBe(false);
      expect(item(at(tH), '11'), `${tH} h`).toBe(0);
    }
  });

  it('a right caudate (Heubner branch) lacune gives no neglect', () => {
    for (const tH of [0.05, 24, 4320]) {
      const r = sim([lacune('heubner_r')], tH);
      expect(has(r, 'neglect'), `${tH} h`).toBe(false);
      expect(item(r, '11'), `${tH} h`).toBe(0);
    }
  });
});

describe('R2-5: a lacunar label shown during a branch TIA does not call it an infarct', () => {
  it('every lacunar label seen during a 5-minute attack is named as a syndrome and says it can be a TIA', () => {
    const seen = new Set<string>();
    for (const [vessel, site] of [
      ['lenticulostriate_l', 'pure_motor'],
      ['lenticulostriate_r', 'ataxic'],
      ['lenticulostriate_l', 'dch'],
      ['lenticulostriate_r', 'genu'],
      ['acha_l', 'pure_motor'],
      ['thalamogeniculate_r', 'pure_sensory'],
      ['pontine_paramedian_rostral_r', 'pure_motor'],
      ['pontine_paramedian_rostral_l', 'dch'],
    ]) {
      const r = sim([lacune(vessel, site, { toH: 1 / 12 })], 0.05);
      expect(r.cascade.events.map((e) => e.id), `${vessel}:${site}`).toContain('ischemia_no_infarct');
      for (const m of r.syndromes) if (m.def.group === 'lacunar') seen.add(m.def.id);
    }
    for (const m of scenario('capsular_warning', 1).syndromes) if (m.def.group === 'lacunar') seen.add(m.def.id);
    expect([...seen]).toEqual(
      expect.arrayContaining([
        'lacunar_pure_motor',
        'lacunar_ataxic_hemiparesis',
        'lacunar_dysarthria_clumsy_hand',
        'capsular_genu',
        'lacunar_pure_sensory',
        'pontine_lacunar',
      ]),
    );
    for (const id of seen) {
      const d = SYNDROMES.find((x) => x.id === id)!;
      expect(d.name.en, id).not.toMatch(/stroke|infarct/i);
      expect(d.name.zh, id).not.toMatch(/中風|梗塞/);
      expect(d.desc.en, id).toMatch(/TIA/);
      expect(d.desc.zh, id).toMatch(/TIA/);
      expect(d.desc.en, id).not.toMatch(/^(A )?[Ss]mall infarct/);
    }
  });
});
