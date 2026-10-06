// @vitest-environment jsdom
/**
 * "What is happening now" when the patient becomes stuporous or comatose (does not mount the 3D
 * scene): the signs that cannot be examined then are not reported as improved or gone (X1-2), and
 * the summary says that they cannot be examined.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { tr } from '../anatomy';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { TIME_STOPS } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import { simulate, type SimResult } from '../engine/simulate';
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
    expect(series[at(336)].unexaminable.every((s) => s.why === 'aphasia')).toBe(true);
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
