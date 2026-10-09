// @vitest-environment jsdom
/**
 * "What is happening now" when the patient becomes stuporous or comatose (does not mount the 3D
 * scene): the signs that cannot be examined then are not reported as improved or gone (X1-2), and
 * the summary says that they cannot be examined.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BED_BY_ID, tr } from '../anatomy';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { TIME_STOPS } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import type { SymptomItem } from '../engine/clinical';
import type { Occlusion } from '../engine/hemodynamics';
import { simulate, type SimResult } from '../engine/simulate';
import type { TreatmentOptions } from '../engine/treatment';
import { useApp } from '../state/store';
import { UI } from '../i18n/ui';
import { symptomLabel } from '../ui/format';
import { unexaminableNow } from '../ui/recoveryFormat';
import { NowSummary } from './NowSummary';

afterEach(() => {
  cleanup();
});

const seriesOf = (id: string, collateral: 'good' | 'moderate' | 'poor'): SimResult[] => {
  const sc = SCENARIO_BY_ID[id];
  return TIME_STOPS.map((st) =>
    simulate({
      occlusions: sc.occlusions,
      variants: sc.variants ?? [],
      collateral,
      map: sc.map ?? 93,
      tH: st.h,
      reperfusionH: sc.reperfusionH ?? null,
      decompression: sc.decompression ?? false,
    }),
  );
};
const at = (h: number) => TIME_STOPS.findIndex((s) => s.h === h);
const name = (id: string, lang: Lang) => tr(SYMPTOM_BY_ID[id].name, lang);

describe('"what is happening now" when the patient falls into a coma (X1-2)', () => {
  // the left M1 infarct of the template, with moderate collaterals: awake at 1 day, comatose from
  // the herniation at 2 days (NIHSS 24 → 37)
  const series = seriesOf('l_m1', 'moderate');
  const i = at(48);

  it.each(['zh-TW', 'en'] as Lang[])('%s: executive function, reading and writing are not "better than at 1 day"; they cannot be examined', (lang) => {
    // (at 1 day reading and writing are already named apart, as tested through language beside
    // the global aphasia: Z3-16)
    expect(series[i - 1].symptoms.map((s) => s.id)).toContain('executive');
    expect(series[i - 1].unexaminable.filter((s) => s.why === 'aphasia').map((s) => s.id)).toEqual(expect.arrayContaining(['alexia', 'agraphia']));
    expect(series[i].nihss.items['1a']).toBe(3);
    useApp.setState({ lang, tIndex: i });
    const { container } = render(<NowSummary sim={series[i]} series={series} />);
    const improved = container.querySelector('.now-symptoms.improved')?.textContent ?? '';
    for (const id of ['executive', 'alexia', 'agraphia', 'acalculia', 'finger_agnosia', 'disinhibition', 'aphasia_global'])
      expect(improved, id).not.toContain(name(id, lang));
    const line = container.querySelector('.now-symptoms.unexaminable');
    expect(line).not.toBeNull();
    // the deficits it names are those of the lesion, worst first and in the order of the systems,
    // the first five and the number of the others
    const hidden = unexaminableNow(series[i]);
    expect(hidden.map((s) => s.id)).toEqual(expect.arrayContaining(['aphasia_global', 'executive', 'alexia', 'agraphia']));
    for (const s of hidden.slice(0, 5)) expect(line!.textContent).toContain(symptomLabel(s, lang, UI[lang]));
    expect(line!.textContent).toContain(`+${hidden.length - 5}`);
  });

  // Z3-16: awake, what the coma hid is listed again, except what is tested through language while
  // the global aphasia leaves too little comprehension: the line now gives that reason
  it('awake again two weeks later, the line no longer names the level of consciousness', () => {
    useApp.setState({ lang: 'en', tIndex: at(336) });
    const { container } = render(<NowSummary sim={series[at(336)]} series={series} />);
    expect(series[at(336)].symptoms.map((s) => s.id)).toContain('executive');
    // (what the aphasia hides, and the clumsy hand of an arm that cannot move against gravity: V2-10)
    expect(series[at(336)].unexaminable.every((s) => s.why === 'aphasia' || s.why === 'paralysed')).toBe(true);
    const line = container.querySelector('.now-symptoms.unexaminable');
    expect(line?.textContent ?? '').not.toMatch(/level of consciousness/);
  });
});

describe('"what is happening now" after a reopening: the rescued tissue regains its function over time (Y1-12)', () => {
  // the thrombectomy template: the left M1 reopened at 2 h
  const series = seriesOf('l_m1_thrombectomy', 'good');

  it.each(['zh-TW', 'en'] as Lang[])('%s: at 6 h the summary says how much rescued tissue is still regaining its function, and that it takes hours to days', (lang) => {
    useApp.setState({ lang, tIndex: at(6) });
    const { container } = render(<NowSummary sim={series[at(6)]} series={series} />);
    const text = container.textContent ?? '';
    expect(text).toMatch(lang === 'en' ? /About \d+ mL of tissue that survived is still regaining its function/ : /約 \d+ mL 存活下來的組織仍在恢復功能/);
    expect(text).toMatch(lang === 'en' ? /over hours to days rather than at once/ : /要幾小時到幾天才重新運作/);
  });

  it('three months later the rescued tissue works again and the line is gone', () => {
    useApp.setState({ lang: 'en', tIndex: at(2160) });
    const { container } = render(<NowSummary sim={series[at(2160)]} series={series} />);
    expect(container.textContent).not.toMatch(/still regaining its function/);
  });
});

/**
 * Z2-10: the bottleneck sentence names where both sides' main motor pathways and their backups were
 * cut together: the cerebral peduncles of the midbrain (top of the basilar, or a herniation) or the
 * ventral pons (a locked-in syndrome), from the regions that make the deficit.
 */
describe('"what is happening now" names the bottleneck where it is (Z2-10)', () => {
  const sentence = (id: string, h: number, lang: Lang) => {
    const series = seriesOf(id, SCENARIO_BY_ID[id].collateral ?? 'good');
    useApp.setState({ lang, tIndex: at(h) });
    const { container } = render(<NowSummary sim={series[at(h)]} series={series} />);
    const text = container.querySelector('p')?.textContent ?? '';
    cleanup();
    return text;
  };

  it.each([168, 720, 2160])('top of the basilar at %s h: the cerebral peduncles of the midbrain, not the ventral pons', (h) => {
    const en = sentence('basilar_tip', h, 'en');
    expect(en).toMatch(/cut together in the cerebral peduncles of the midbrain/);
    expect(en).not.toMatch(/ventral pons/);
    const zh = sentence('basilar_tip', h, 'zh-TW');
    expect(zh).toMatch(/在中腦的大腦腳一起被截斷/);
    expect(zh).not.toMatch(/腹側橋腦/);
  });

  it('a locked-in syndrome: the ventral pons', () => {
    expect(sentence('basilar_mid', 720, 'en')).toMatch(/cut together in the ventral pons/);
    expect(sentence('basilar_mid', 720, 'zh-TW')).toMatch(/在腹側橋腦一起被截斷/);
  });

  // W1-7: a quarter of both peduncles infarcted after a bridged reopening (0.8 mL) is not the
  // bottleneck of a locked-in syndrome: the sentence is not shown
  it.each([720, 2160])('the top of the basilar bridged at 4.5 h (eTICI 2c) at %s h: no bottleneck sentence', (h) => {
    const series = TIME_STOPS.map((st) =>
      simulate({
        occlusions: [{ vessel: 'basilar_tip', severity: 1 }],
        variants: [],
        collateral: 'moderate',
        map: 93,
        tH: st.h,
        reperfusionH: 4.5,
        decompression: false,
        treatment: { method: 'bridging', grade: '2c', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0 },
      }),
    );
    for (const lang of ['en', 'zh-TW'] as Lang[]) {
      useApp.setState({ lang, tIndex: at(h) });
      const { container } = render(<NowSummary sim={series[at(h)]} series={series} />);
      const text = container.querySelector('p')?.textContent ?? '';
      cleanup();
      expect(text, lang).not.toMatch(/cut together|一起被截斷/);
    }
  });
});

// Z4-13: the tissue sentence says the penumbra "can still be saved" only while a reopening is still
// offered (within a day of the occlusion: REPERFUSION_STOPS), and calls a small infarct that keeps
// growing — such as one in the brainstem — growing, not "not growing for now"
describe('"what is happening now": the penumbra after the treatment window, and a small growing core (Z4-13)', () => {
  const tissue = (id: string, collateral: 'good' | 'moderate' | 'poor', h: number, lang: Lang) => {
    const series = seriesOf(id, collateral);
    useApp.setState({ lang, tIndex: at(h) });
    const { container } = render(<NowSummary sim={series[at(h)]} series={series} />);
    const text = container.querySelector('p')?.textContent ?? '';
    cleanup();
    return text;
  };

  it('a reopening is still offered at 1 day: the penumbra can still be saved', () => {
    expect(tissue('l_m1', 'good', 24, 'en')).toMatch(/can still be saved/);
    expect(tissue('l_m1', 'good', 24, 'zh-TW')).toContain('可救');
  });

  it.each([48, 72])('after the treatment window (%s h) the penumbra may still be lost, not "saved"', (h) => {
    // (the left PCA template has moderate collaterals; by 3 days less than half a millilitre of it
    // is still to die, and the infarct has settled: W2-10)
    for (const [id, collateral] of [['l_m1', 'good'], ['l_pca', 'moderate']] as const) {
      const sc = SCENARIO_BY_ID[id];
      const r = simulate({ occlusions: sc.occlusions, variants: sc.variants ?? [], collateral, map: sc.map ?? 93, tH: h, reperfusionH: null, decompression: false });
      const stillLost = r.volumes.finalInfarct - r.volumes.core >= 0.5;
      expect(stillLost, `${id} ${h} h`).toBe(!(id === 'l_pca' && h === 72));
      const en = tissue(id, collateral, h, 'en');
      expect(en, `${id} ${h} h`).not.toMatch(/can still be saved/);
      expect(en, `${id} ${h} h`).toMatch(stillLost ? /still growing.*may still be lost/ : /largely settled/);
      const zh = tissue(id, collateral, h, 'zh-TW');
      expect(zh, `${id} ${h} h`).not.toContain('可救');
      if (stillLost) expect(zh, `${id} ${h} h`).toContain('仍可能壞死');
    }
  });

  it.each([1, 6, 12])('a mid-basilar infarct of a few millilitres that keeps growing is "still growing" at %s h', (h) => {
    const en = tissue('basilar_mid', 'good', h, 'en');
    expect(en).toMatch(/still growing/);
    expect(en).not.toMatch(/not growing/);
    expect(tissue('basilar_mid', 'good', h, 'zh-TW')).toContain('正在擴大');
  });
});

describe('W2-10: from day 2, the penumbra the summary names is what the course may still lose', () => {
  // the left M1 template (good collaterals): at 2 days about 10 mL is still to die, while about
  // 135 mL counted as penumbra before the at-risk window was capped
  const series = seriesOf('l_m1', 'good');
  const i = at(48);
  const r = series[i];

  it.each(['zh-TW', 'en'] as Lang[])('%s: the penumbra quoted is about what is still lost, and the surviving tissue is named as regaining', (lang) => {
    const still = r.volumes.finalInfarct - r.volumes.core;
    expect(still).toBeGreaterThan(1);
    useApp.setState({ lang, tIndex: i });
    const { container } = render(<NowSummary sim={r} series={series} />);
    const text = container.querySelector('.now-summary p')?.textContent ?? '';
    const quoted = lang === 'en' ? text.match(/about ([\d.]+) mL of penumbra may still be lost/) : text.match(/約 ([\d.]+) mL 的半影區仍可能壞死/);
    expect(quoted, text).not.toBeNull();
    expect(Math.abs(Number(quoted![1]) - still)).toBeLessThan(1);
    // the tissue that survives is still silent: the summary says it is regaining its function
    expect(text).toContain(lang === 'en' ? 'of tissue that survived is still regaining its function' : '存活下來的組織仍在恢復功能');
  });
});

describe('W3-8: an infarct of the upper cervical cord is told on Now', () => {
  // the anterior spinal artery alone: no brain tissue is ischaemic, but the cord is, then has died
  const series = TIME_STOPS.map((st) =>
    simulate({ occlusions: [{ vessel: 'asa', severity: 1 }], variants: [], collateral: 'good', map: 93, tH: st.h, reperfusionH: null, decompression: false }),
  );
  const textAt = (h: number, lang: Lang) => {
    const i = at(h);
    useApp.setState({ lang, tIndex: i });
    const { container } = render(<NowSummary sim={series[i]} series={series} />);
    const text = container.querySelector('.now-summary p')?.textContent ?? '';
    cleanup();
    return text;
  };
  it.each(['zh-TW', 'en'] as Lang[])('%s: the cord is named, at onset and once it has died', (lang) => {
    const cord = lang === 'en' ? 'upper cervical cord' : '上段頸髓';
    for (const h of [0, 24, 2160]) {
      const text = textAt(h, lang);
      expect(text, `${h} h`).toContain(cord);
      // never "nothing is ischaemic" without the cord beside it
      expect(text, `${h} h`).not.toMatch(lang === 'en' ? /^No brain tissue is ischaemic right now\.$/ : /^此刻沒有腦組織缺血。$/);
    }
    expect(textAt(0, lang)).toMatch(lang === 'en' ? /about 2(\.0)? mL/i : /約 2(\.0)? mL/);
  });
});

describe('V1-6: what a reopening saves names the herniation it prevents', () => {
  // the malignant right M1 of the template reopened at 2 h: without treatment it would herniate
  const sc = SCENARIO_BY_ID['r_m1_malignant'];
  const series = TIME_STOPS.map((st) =>
    simulate({ occlusions: sc.occlusions, variants: [], collateral: sc.collateral ?? 'good', map: 93, tH: st.h, reperfusionH: 2, decompression: false }),
  );
  it.each(['zh-TW', 'en'] as Lang[])('%s: the saved volume, and the part a herniation of the untreated swelling would have infarcted', (lang) => {
    const i = at(24);
    const r = series[i];
    expect(r.volumes.savedSecondary).toBeGreaterThan(50);
    useApp.setState({ lang, tIndex: i });
    const { container } = render(<NowSummary sim={r} series={series} />);
    const text = container.textContent ?? '';
    expect(text).toContain(UI[lang].nowRecanalized({ at: lang === 'en' ? '2 h' : '2 小時', saved: r.volumes.saved.toFixed(0), secondary: r.volumes.savedSecondary.toFixed(0) }));
  });
});

// V2-8: the deep white matter behind a single perforating branch (a lacune), or behind the whole
// bundle, gets no collateral flow: it is still alive in the first hours because white matter takes
// hours to die, and the summary says so instead of crediting collaterals
describe('"what is happening now": tissue behind a perforating end artery does not live on collaterals (V2-8)', () => {
  const tissue = (id: string, h: number, lang: Lang) => {
    const series = seriesOf(id, SCENARIO_BY_ID[id].collateral ?? 'good');
    useApp.setState({ lang, tIndex: at(h) });
    const { container } = render(<NowSummary sim={series[at(h)]} series={series} />);
    const text = container.querySelector('p')?.textContent ?? '';
    cleanup();
    return text;
  };
  it.each([
    ['l_lacune', 0.25],
    ['l_lacune', 1],
    ['l_lacune', 2],
    ['capsular_warning', 1],
    ['capsular_warning', 3],
    ['capsular_warning', 6],
    ['l_cr_lacune', 1],
    ['l_lsa', 1],
    ['l_lsa', 2],
  ] as [string, number][])('%s at %s h', (id, h) => {
    const en = tissue(id, h, 'en');
    expect(en).not.toMatch(/collateral flow for now|through collaterals/);
    expect(en).toMatch(/end artery/);
    expect(en).toMatch(/white matter/);
    const zh = tissue(id, h, 'zh-TW');
    expect(zh).not.toMatch(/靠側枝/);
    expect(zh).toMatch(/終末動脈/);
    expect(zh).toMatch(/白質/);
  });
  // every white-matter lacune site, closed for good or for 2 h: no stop credits collaterals
  it.each([
    ['lenticulostriate_l', 'pure_motor'],
    ['lenticulostriate_l', 'ataxic'],
    ['lenticulostriate_l', 'dch'],
    ['lenticulostriate_l', 'genu'],
    ['acha_l', 'pure_motor'],
    ['acha_l', 'ataxic'],
  ])('a %s branch (%s): no stop says that collaterals keep it alive', (vessel, lacuneSite) => {
    for (const toH of [2, undefined]) {
      const occ = [{ vessel, severity: 1, branch: true, lacuneSite, ...(toH ? { toH } : {}) }];
      const series = TIME_STOPS.map((st) => simulate({ occlusions: occ, variants: [], collateral: 'good', map: 93, tH: st.h, reperfusionH: null, decompression: false }));
      TIME_STOPS.forEach((st, i) => {
        if (st.h > 24) return;
        for (const lang of ['en', 'zh-TW'] as Lang[]) {
          useApp.setState({ lang, tIndex: i });
          const { container } = render(<NowSummary sim={series[i]} series={series} />);
          const text = container.querySelector('p')?.textContent ?? '';
          cleanup();
          expect(text, `${toH ?? 'for good'} ${st.h} h ${lang}`).not.toMatch(/survives on collateral|through collaterals|靠側枝/);
        }
      });
    }
  });

  it('a territory that collaterals reach keeps the collateral sentence', () => {
    expect(tissue('l_m2_sup', 0.25, 'en')).toMatch(/survives on collateral flow for now/);
    expect(tissue('l_m2_sup', 0.25, 'zh-TW')).toMatch(/暫時靠側枝血流撐著/);
  });
});

// V2-5: "no backup — will not improve" only once the deficit is all from dead tissue, never beside
// its own improvement, and not for a deficit from the compression by a swollen neighbour
describe('"what is happening now": what will not improve (V2-5)', () => {
  const lines = (id: string, h: number, lang: Lang) => {
    const series = seriesOf(id, SCENARIO_BY_ID[id].collateral ?? 'good');
    useApp.setState({ lang, tIndex: at(h) });
    const { container } = render(<NowSummary sim={series[at(h)]} series={series} />);
    const out = {
      improved: container.querySelector('.now-symptoms.improved')?.textContent ?? '',
      noBackup: container.querySelector('.now-symptoms.nobackup')?.textContent ?? '',
    };
    cleanup();
    return out;
  };
  const label = (id: string, side: SymptomItem['side'], lang: Lang) => symptomLabel({ id, side, sev: 1, sources: [], delayed: false }, lang, UI[lang]);
  it.each([
    [336, 'gaze_palsy_horizontal'],
    [720, 'face_weak_peripheral'],
  ] as [number, string][])('the Foville template at %s h: %s is better, and not said not to improve', (h, id) => {
    for (const lang of ['en', 'zh-TW'] as Lang[]) {
      const { improved, noBackup } = lines('l_pontine', h, lang);
      expect(improved, lang).toContain(label(id, 'l', lang));
      expect(noBackup, lang).not.toContain(label(id, 'l', lang));
    }
  });
  it('the Foville template at 1 week: continuous passing dysfunction is not called fixed within an unchanged ordinal grade', () => {
    const { noBackup } = lines('l_pontine', 168, 'en');
    expect(noBackup).not.toContain(label('gaze_palsy_horizontal', 'l', 'en'));
    expect(noBackup).not.toContain(label('cn6_palsy', 'l', 'en'));
  });
  it('the swollen cerebellum at 1 week: the gaze palsy from the compression of the brainstem is not said not to improve', () => {
    expect(lines('cerebellar_swelling', 168, 'en').noBackup).not.toContain(label('gaze_palsy_horizontal', 'r', 'en'));
  });
  it('the top of the basilar at 1 week: the quadrantanopia from calcarine cortex silenced around a small infarct is not said not to improve', () => {
    expect(lines('basilar_tip', 168, 'en').noBackup).not.toContain(label('quadrant_sup', 'r', 'en'));
  });
});

// V2-9: losing the macular sparing is a worse field defect, not an improvement
describe('"what is happening now": macular sparing is not a deficit (V2-9)', () => {
  it.each(['en', 'zh-TW'] as Lang[])('%s: the fetal PCA template at 2 days does not call the loss of the macular sparing better', (lang) => {
    const series = seriesOf('fetal_pca', SCENARIO_BY_ID.fetal_pca.collateral ?? 'good');
    expect(series[at(24)].symptoms.map((s) => s.id)).toContain('macular_sparing');
    useApp.setState({ lang, tIndex: at(48) });
    const { container } = render(<NowSummary sim={series[at(48)]} series={series} />);
    expect(container.querySelector('.now-symptoms.improved')?.textContent ?? '').not.toContain(name('macular_sparing', lang));
  });
});

// U2-10: an artery that reopens by itself saves the penumbra as a treatment would, and the summary
// says so, and that no treatment was given
describe('"what is happening now" after an artery reopens by itself (U2-10)', () => {
  const input = { occlusions: [{ vessel: 'mca_m1_l', severity: 1, toH: 2 }], variants: [], collateral: 'good' as const, map: 93, reperfusionH: null, decompression: false };
  const series = TIME_STOPS.map((st) => simulate({ ...input, tH: st.h }));
  const closed = simulate({ ...input, occlusions: [{ vessel: 'mca_m1_l', severity: 1 }], tH: 4320 }).volumes.finalInfarct;
  const saved = closed - series[series.length - 1].volumes.finalInfarct;

  it.each(['zh-TW', 'en'] as Lang[])('%s: at 2 h, the reopening without treatment and what it saved', (lang) => {
    useApp.setState({ lang, tIndex: at(2) });
    const { container } = render(<NowSummary sim={series[at(2)]} series={series} />);
    const text = container.textContent ?? '';
    expect(text).toMatch(lang === 'en' ? /reopened by itself 2 h after onset, without treatment/ : /發作後 2 小時自行再通（沒有治療）/);
    const said = Number((lang === 'en' ? /about (\d+) mL saved/ : /約 (\d+) mL/).exec(text)?.[1]);
    expect(Math.abs(said - saved)).toBeLessThanOrEqual(2);
    // not "the infarct has largely settled" with nothing to say why
    expect(text).not.toContain(UI[lang].nowSettled('30').split('30')[0]);
  });

  it('before the reopening it is not told', () => {
    useApp.setState({ lang: 'en', tIndex: at(1) });
    const { container } = render(<NowSummary sim={series[at(1)]} series={series} />);
    expect(container.textContent).not.toMatch(/reopened by itself/);
  });
});

// T2-6, T2-7: the penumbra the summary says can still be saved is the tissue that dies unless the
// artery reopens, not the hypoperfused tissue that survives on its collaterals anyway; and after a
// reopening that brings blood back to only part of the territory (eTICI 2a–2c, no-reflow, a clot
// fragment downstream) it does not say that the penumbra stopped dying while the rest still dies
describe('"what is happening now": the penumbra that can be saved, and a reopening that leaves tissue dying (T2-6, T2-7)', () => {
  const tx = (method: TreatmentOptions['method'], over: Partial<TreatmentOptions> = {}): TreatmentOptions => ({ method, grade: '3', reocclusionAfterH: null, distalEmbolus: null, noReflow: 0, ...over });
  const seriesFor = (occlusions: Occlusion[], collateral: 'good' | 'moderate' | 'poor', reperfusionH: number | null = null, treatment?: TreatmentOptions) =>
    TIME_STOPS.map((st) => simulate({ occlusions, variants: [], collateral, map: 93, tH: st.h, reperfusionH, decompression: false, ...(treatment ? { treatment } : {}) }));
  const tissueText = (series: SimResult[], i: number, lang: Lang) => {
    useApp.setState({ lang, tIndex: i });
    const { container } = render(<NowSummary sim={series[i]} series={series} />);
    const text = container.querySelector('.now-summary p')?.textContent ?? '';
    cleanup();
    return text;
  };
  const brain = (r: SimResult) => ({ core: r.volumes.core - r.volumes.cord.core, final: r.volumes.finalInfarct - r.volumes.cord.final });
  /** the primary core: what the arteries have killed, without a herniation's secondary infarcts */
  const primaryCore = (r: SimResult) => Object.entries(r.beds).reduce((a, [id, b]) => (b.effect === 'secondary' ? a : a + b.infarct * (BED_BY_ID[id].volume ?? 0)), 0);

  it.each(['zh-TW', 'en'] as Lang[])('%s: a left M1 at 1 h, before the thrombectomy of the template: what dies unless it reopens, and what survives anyway', (lang) => {
    const series = seriesOf('l_m1_thrombectomy', 'good');
    const r = series[at(1)];
    const untreated = simulate({ ...r.input, reperfusionH: null, treatment: undefined, tH: 4320 });
    const stillDies = brain(untreated).final - brain(r).core;
    const pen = r.volumes.penumbra - r.volumes.cord.penumbra;
    expect(pen - stillDies).toBeGreaterThan(50);
    const text = tissueText(series, at(1), lang);
    const saved = Number((lang === 'en' ? /about ([\d.]+) mL of penumbra can still be saved/ : /半影區還有約 ([\d.]+) mL 可救/).exec(text)?.[1]);
    expect(Math.abs(saved - stillDies), text).toBeLessThan(1);
    const survives = Number((lang === 'en' ? /the other ([\d.]+) mL survives on collaterals/ : /其餘約 ([\d.]+) mL 缺血組織即使血管不通/).exec(text)?.[1]);
    expect(Math.abs(survives - (pen - stillDies)), text).toBeLessThan(1);
  });

  // the reviewer's cases: eTICI 2a at 4.5 h, 2b50 at 1 h, no-reflow of 30 % at 3 h, a fragment in the A2
  const PARTIAL: [string, SimResult[]][] = [
    ['right M1, bridging, eTICI 2a at 4.5 h', seriesFor([{ vessel: 'mca_m1_r', severity: 1 }], 'good', 4.5, tx('bridging', { grade: '2a' }))],
    ['right M1 (moderate), thrombectomy, eTICI 2b50 at 1 h', seriesFor([{ vessel: 'mca_m1_r', severity: 1 }], 'moderate', 1, tx('evt', { grade: '2b50' }))],
    ['right M1 (moderate), thrombectomy at 3 h with 30 % no-reflow', seriesFor([{ vessel: 'mca_m1_r', severity: 1 }], 'moderate', 3, tx('evt', { noReflow: 0.3 }))],
    ['left M1, thrombectomy at 2 h with a fragment in the A2', seriesFor([{ vessel: 'mca_m1_l', severity: 1 }], 'good', 2, tx('evt', { distalEmbolus: 'aca_a2_l' }))],
  ];
  it.each(PARTIAL)('%s: not "the penumbra stopped dying" while the core grows; the rest is still dying', (_name, series) => {
    const reperf = series[0].input.reperfusionH!;
    for (const lang of ['en', 'zh-TW'] as Lang[]) {
      let grown = 0;
      TIME_STOPS.forEach((st, i) => {
        if (st.h < reperf || st.h >= 120) return;
        const text = tissueText(series, i, lang);
        expect(text, `${st.h} h`).not.toMatch(lang === 'en' ? /stopped dying/ : /半影區停止惡化/);
        // still dying while the arteries' infarct grows on to the next time; once it has stopped, died since
        const next = series[i + 1];
        const growsOn = !!next && primaryCore(next) - primaryCore(series[i]) >= Math.max(0.5, 0.1 * primaryCore(series[i]));
        if (growsOn) expect(text, `${st.h} h`).toMatch(lang === 'en' ? /still dying where blood has not come back/ : /血流沒有回來的地方，組織仍在壞死/);
        else expect(text, `${st.h} h`).toMatch(lang === 'en' ? /still dying where blood has not come back|where blood did not come back the tissue has died since/ : /血流沒有回來的地方，組織(仍在壞死|之後仍壞死了)/);
        if (/still growing|正在擴大/.test(text)) grown++;
      });
      expect(grown, lang).toBeGreaterThan(0);
    }
  });

  it('a complete reopening still says that the penumbra stopped dying', () => {
    const series = seriesOf('l_m1_thrombectomy', 'good');
    expect(tissueText(series, at(6), 'en')).toMatch(/the penumbra stopped dying/);
    // … also once a later attack has added an infarct of its own: the reopening left nothing at risk
    const twice = seriesFor([{ vessel: 'mca_m1_l', severity: 1, toH: 0.25 }, { vessel: 'mca_m1_l', severity: 1, fromH: 24, toH: 24.25 }], 'good');
    for (const h of [48, 120]) {
      const text = tissueText(twice, at(h), 'en');
      expect(text, `${h} h`).toMatch(/reopened by itself 15 min after onset, without treatment: the penumbra stopped dying/);
      expect(text, `${h} h`).not.toMatch(/has died since|still dying where/);
    }
  });

  // the classes: "can still be saved" never counts more than the untreated course still kills, and
  // "stopped dying" never stands beside a core that keeps growing
  const CLASS: [string, SimResult[]][] = [
    ...PARTIAL,
    ...(['good', 'moderate', 'poor'] as const).flatMap((c) =>
      ['mca_m1_l', 'mca_m2_inf_l', 'basilar_mid', 'pca_p2_r', 'ica_terminal_r'].flatMap((v) => [
        [`${v} ${c}`, seriesFor([{ vessel: v, severity: 1 }], c)] as [string, SimResult[]],
        [`${v} ${c}, thrombectomy at 4.5 h`, seriesFor([{ vessel: v, severity: 1 }], c, 4.5, tx('evt'))] as [string, SimResult[]],
      ]),
    ),
  ];
  it.each(CLASS)('%s: the penumbra quoted as saveable is what the untreated course still kills; "stopped dying" only when the core stops growing', (_name, series) => {
    const untreated = simulate({ ...series[0].input, reperfusionH: null, treatment: undefined, tH: 4320 });
    TIME_STOPS.forEach((st, i) => {
      if (st.h >= 168) return;
      const text = tissueText(series, i, 'en');
      const saveable = /about ([\d.]+) mL of penumbra can still be saved/.exec(text);
      if (saveable) expect(Number(saveable[1]), `${st.h} h: ${text}`).toBeLessThanOrEqual(brain(untreated).final - brain(series[i]).core + 0.5);
      if (/stopped dying/.test(text) && i + 1 < series.length) {
        const grew = primaryCore(series[i + 1]) - primaryCore(series[i]);
        expect(grew, `${st.h} h: ${text}`).toBeLessThan(Math.max(0.5, 0.1 * primaryCore(series[i])));
      }
    });
  });
});
