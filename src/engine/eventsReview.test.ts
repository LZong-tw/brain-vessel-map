/**
 * Review round 3, group R3: the aspiration warning follows the swallowing and consciousness
 * deficits the case actually lists (R3-1 … R3-3), the cardiac warning calls a comatose stroke
 * severe (R3-4), and the breathing texts after a lateral medullary infarct give their rates as
 * the sources do (R3-5, R3-6).
 */
import { describe, expect, it } from 'vitest';
import { canBeLacunar, lacuneSitesOf } from '../anatomy/lacunes';
import { SCENARIOS } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES } from '../anatomy/syndromes';
import { TIME_STOPS } from '../anatomy/timeline';
import { VESSELS } from '../anatomy';
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
const occInput = (occlusions: Occlusion[], collateral: CollateralGrade = 'good'): SimInput => ({
  occlusions,
  variants: [],
  collateral,
  map: 93,
  tH: 24,
  reperfusionH: null,
  decompression: false,
});
const at = (input: SimInput, tH: number) => simulate({ ...input, tH });
const aspiration = (r: SimResult) => r.cascade.events.find((e) => e.id === 'aspiration');
const DYSPHAGIA_TITLE = 'Dysphagia → aspiration pneumonia';
const SCREEN_TITLE = 'Aspiration risk: swallow screen before oral intake';
/** what makes swallowing unsafe: dysphagia, or a reduced level of consciousness */
const UNSAFE = ['dysphagia', 'coma', 'somnolence', 'disorder_of_consciousness'];
const unsafe = (r: SimResult) => r.symptoms.some((s) => UNSAFE.includes(s.id));
/** the time stops of the first two weeks, on the simulation clock */
const STOPS = TIME_STOPS.map((s) => s.h).filter((h) => h < 336);

/**
 * The aspiration event names dysphagia (or reduced consciousness) exactly when the case lists one
 * of them while the event runs, and it is running whenever they are listed (a TIA excepted: its
 * deficit clears with the flow).
 */
function checkFollows(name: string, input: SimInput) {
  const first = at(input, STOPS[0]);
  const onset = first.schedule.onsetH;
  const runs = STOPS.map((h) => onset + h).map((h) => [h, at(input, h)] as const);
  const asp = aspiration(first);
  // the index attack left no infarct and its flow came back
  const tia = first.volumes.finalInfarct < 0.05 && (input.reperfusionH != null || input.occlusions.every((o) => o.toH != null));
  const listedAt = runs.filter(([, r]) => unsafe(r)).map(([h]) => h);
  if (tia) {
    expect(asp, `${name}: a TIA carries no aspiration warning`).toBeUndefined();
    return;
  }
  if (listedAt.length === 0) {
    if (asp) expect(asp.title.en, `${name}: no dysphagia or reduced consciousness is listed`).toBe(SCREEN_TITLE);
    return;
  }
  expect(asp, `${name}: dysphagia listed at ${listedAt.join(', ')} h without the aspiration warning`).toBeDefined();
  expect(asp!.title.en, name).not.toBe(SCREEN_TITLE);
  for (const h of listedAt) expect(asp!.onsetH <= h + 1e-9 && h < (asp!.endH ?? Infinity), `${name}: listed at ${h} h, event not running`).toBe(true);
}

describe('R3-1: the aspiration warning follows the listed deficits, in both directions', () => {
  it('a large infarct without dysphagia or reduced consciousness gets the swallow-screen title, not "Dysphagia →"', () => {
    const cases: [string, SimInput][] = [
      ['r_aca', inputOf('r_aca')],
      ['fetal_pca', inputOf('fetal_pca')],
      ['aca_a2_r moderate', occInput([{ vessel: 'aca_a2_r', severity: 1 }], 'moderate')],
      ['mca_m2_inf_r moderate', occInput([{ vessel: 'mca_m2_inf_r', severity: 1 }], 'moderate')],
      ['pca_p2_l poor', occInput([{ vessel: 'pca_p2_l', severity: 1 }], 'poor')],
    ];
    for (const [name, input] of cases) {
      for (const tH of [1, 24, 72]) {
        const r = at(input, tH);
        expect(unsafe(r), `${name} ${tH} h`).toBe(false);
        const asp = aspiration(r);
        expect(asp, name).toBeDefined();
        expect(asp!.title.en, name).toBe(SCREEN_TITLE);
        expect(asp!.title.zh, name).toBe('吸入風險：進食前先做吞嚥篩檢');
        expect(asp!.desc.en, name).toMatch(/lists no swallowing problem/);
        expect(asp!.desc.zh, name).toMatch(/沒有列出吞嚥困難/);
      }
    }
  });

  it('dysphagia that appears later (anterior choroidal oedema) raises the warning from when it appears', () => {
    for (const [name, input] of [
      ['l_acha', inputOf('l_acha')],
      ['acha_r', occInput([{ vessel: 'acha_r', severity: 1 }])],
    ] as [string, SimInput][]) {
      const r = at(input, 72);
      expect(r.symptoms.map((s) => s.id), name).toContain('dysphagia');
      const asp = aspiration(r);
      expect(asp, name).toBeDefined();
      expect(asp!.title.en).toBe(DYSPHAGIA_TITLE);
      // not listed at 24 h, listed at 48 h: the warning starts with it
      expect(at(input, 24).symptoms.map((s) => s.id)).not.toContain('dysphagia');
      expect(asp!.onsetH).toBe(48);
      expect(asp!.regions.some((x) => x.startsWith('ic_genu'))).toBe(true);
    }
  });

  it('coma without dysphagia is named as such', () => {
    const r = at(inputOf('basilar_tip'), 24);
    expect(r.symptoms.map((s) => s.id)).toContain('coma');
    const asp = aspiration(r)!;
    expect(asp.title.en).toBe(r.symptoms.some((s) => s.id === 'dysphagia') ? DYSPHAGIA_TITLE : 'Reduced consciousness → aspiration pneumonia');
  });

  it.each(SCENARIOS.map((s) => [s.id]))('%s: the aspiration warning follows the listed deficits', (id) => {
    checkFollows(id, inputOf(id));
  });

  it.each(['poor', 'moderate', 'good'] as CollateralGrade[])('key single occlusions (%s collaterals)', (c) => {
    for (const v of ['mca_m1_l', 'mca_m2_sup_r', 'mca_m2_inf_r', 'aca_a2_r', 'aca_callosomarginal_l', 'pca_p2_l', 'acha_r', 'basilar_mid', 'pica_r', 'va_v4_prox_r', 'lat_medullary_perf_l'])
      checkFollows(`${v} ${c}`, occInput([{ vessel: v, severity: 1 }], c));
  });

  it('a 5-minute M1 occlusion (TIA) still carries none', () => {
    checkFollows('5-minute M1', occInput([{ vessel: 'mca_m1_l', severity: 1, toH: 1 / 12 }]));
    expect(aspiration(at(occInput([{ vessel: 'mca_m1_l', severity: 1, toH: 1 / 12 }]), 24))).toBeUndefined();
  });
});

describe('R3-2, R3-3: a lacune with dysphagia raises the aspiration warning', () => {
  it('a single lateral medullary perforator (either side) and a dysarthria–clumsy-hand lacune', () => {
    for (const o of [
      { vessel: 'lat_medullary_perf_r', severity: 1, branch: true },
      { vessel: 'lat_medullary_perf_l', severity: 1, branch: true },
      { vessel: 'lenticulostriate_r', severity: 1, branch: true, lacuneSite: 'dch' },
      { vessel: 'lenticulostriate_l', severity: 1, branch: true, lacuneSite: 'dch' },
    ] as Occlusion[]) {
      const r = at(occInput([o]), 24);
      expect(r.symptoms.map((s) => s.id), o.vessel).toContain('dysphagia');
      const asp = aspiration(r);
      expect(asp, `${o.vessel} ${o.lacuneSite ?? ''}`).toBeDefined();
      expect(asp!.title.en).toBe(DYSPHAGIA_TITLE);
      expect(asp!.onsetH).toBe(0);
      expect(asp!.regions.length).toBeGreaterThan(0);
    }
  });

  it('a 5-minute branch occlusion (TIA) carries none', () => {
    const r = at(occInput([{ vessel: 'lat_medullary_perf_r', severity: 1, branch: true, toH: 1 / 12 }]), 24);
    expect(aspiration(r)).toBeUndefined();
  });

  it('every lacune site: dysphagia listed at 24 h implies the warning', () => {
    let seen = 0;
    for (const v of VESSELS) {
      if (!canBeLacunar(v.baseId, v.n) || v.side === 'm') continue;
      for (const site of [undefined, ...lacuneSitesOf(v.baseId).map((s) => s.id)]) {
        const r = at(occInput([{ vessel: v.id, severity: 1, branch: true, ...(site ? { lacuneSite: site } : {}) }]), 24);
        if (!r.symptoms.some((s) => s.id === 'dysphagia')) continue;
        seen++;
        expect(aspiration(r)?.title.en, `${v.id} ${site ?? ''}`).toBe(DYSPHAGIA_TITLE);
      }
    }
    expect(seen).toBeGreaterThanOrEqual(4);
  });
});

describe('R3-4: the cardiac warning calls a comatose stroke severe', () => {
  it('top of the basilar (coma) and a cerebellar infarct that swells into coma', () => {
    for (const [id, tH] of [
      ['basilar_tip', 24],
      ['cerebellar_swelling', 72],
    ] as const) {
      const r = at(inputOf(id), tH);
      expect(r.symptoms.map((s) => s.id), id).toContain('coma');
      const c = r.cascade.events.find((e) => e.id === 'cardiac')!;
      expect(c.severity, id).toBe('warn');
      expect(c.desc.en, id).toContain('This is a severe stroke');
      expect(c.desc.zh, id).toContain('這是嚴重的中風');
    }
  });

  it('a small stroke without reduced consciousness stays informational', () => {
    const c = at(inputOf('l_lacune'), 24).cascade.events.find((e) => e.id === 'cardiac')!;
    expect(c.severity).toBe('info');
    expect(c.desc.en).not.toContain('This is a severe stroke');
  });
});

describe('R3-5, R3-6: breathing after a lateral medullary infarct, and thalamic pain by side', () => {
  const apnoea = SYMPTOM_BY_ID.central_sleep_apnoea.desc;
  const breathing = at(inputOf('r_wallenberg'), 24).cascade.events.find((e) => e.id === 'lateral_medullary_breathing')!;

  it('2–6 % is overt respiratory failure in older series, not a selective loss of automatic breathing', () => {
    expect(apnoea.en).not.toMatch(/lose automatic breathing outright/);
    expect(apnoea.en).toMatch(/overt respiratory failure was reported in about 2–6 % in older series/);
    expect(apnoea.en).toMatch(/in some of them it is a loss of automatic breathing in sleep \("Ondine's curse"\)/);
    expect(apnoea.zh).not.toMatch(/少數人（約 2–6%）也會連自動呼吸都失去/);
    expect(apnoea.zh).toMatch(/較早的系列中約 2–6% 出現明顯的呼吸衰竭/);
    expect(apnoea.zh).toMatch(/其中一部分是睡眠中失去自動呼吸（「Ondine 詛咒」）/);
  });

  it('the warning gives 2–6 % as an older figure and the recent series as a fatal rate', () => {
    expect(breathing.desc.en).toMatch(
      /overt respiratory failure was reported in about 2–6 % in older series \(of one-sided lateral medullary infarcts\); in one recent hospital series 8 of 102 \(8 %\) died of respiratory failure within 10 days/,
    );
    expect(breathing.desc.en).not.toMatch(/complicates about 2–6 %/);
    expect(breathing.desc.zh).toMatch(/較早的系列中約 2–6% 出現明顯的呼吸衰竭（單側延髓外側梗塞）；一個較新的醫院系列 102 人中有 8 人（8%）在 10 天內死於呼吸衰竭/);
    // the symptom text points to the same figures
    expect(apnoea.en).toMatch(/8 of 102/);
    expect(apnoea.zh).toMatch(/102 人中有 8 人/);
  });

  it('the right-sided excess of thalamic pain is from published cases (possibly reporting bias)', () => {
    const d = SYNDROMES.find((s) => s.id === 'thalamic_sensory')!.desc;
    expect(d.en).toMatch(/more often after right-sided lesions among published cases \(possibly reporting bias\)/);
    expect(d.zh).toMatch(/已發表的病例中右側病灶比較常見（可能有報告偏差）/);
  });
});
