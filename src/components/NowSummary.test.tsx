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
    expect(series[i - 1].symptoms.map((s) => s.id)).toEqual(expect.arrayContaining(['executive', 'alexia', 'agraphia']));
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

  it('awake again two weeks later, the line is gone', () => {
    useApp.setState({ lang: 'en', tIndex: at(336) });
    const { container } = render(<NowSummary sim={series[at(336)]} series={series} />);
    expect(series[at(336)].symptoms.map((s) => s.id)).toContain('executive');
    expect(container.querySelector('.now-symptoms.unexaminable')).toBeNull();
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
