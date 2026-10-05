// @vitest-environment jsdom
/**
 * Component tests for the treatment details under the reperfusion select (Settings tab), the
 * published-figures box and the warnings, and the treatment summary in the results.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { VESSEL_BY_ID, vesselName } from '../anatomy';
import type { RecanalisationEvidence } from '../anatomy/recanalisation';
import { SCENARIOS } from '../anatomy/scenarios';
import { simulate } from '../engine/simulate';
import { DEFAULT_TREATMENT, downstreamBranches } from '../engine/treatment';
import { useApp } from '../state/store';
import { LeftPanel, TreatmentDetails } from './LeftPanel';
import { RightPanel } from './RightPanel';

const occlusions = [{ vessel: 'mca_m1_l', severity: 1 }];
const sim = simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false });

const EMPTY: RecanalisationEvidence = {
  success: {},
  sich: {},
  sichMevo: {},
  sichLargeCore: null,
  tenecteplase: { sich: null, reperfusionBeforeEvt: null },
  lateIvt: null,
  reocclusion: {},
  distalEmbolization: null,
  newTerritoryEmbolization: null,
  noReflow: null,
  ivtWindowH: 4.5,
  ivtConsensusWindowH: {},
  evtWindowH: 24,
};

const range = (low: number, high: number, typical: number | undefined, source: string) => ({
  low,
  high,
  typical,
  note: { zh: `${source} 的定義`, en: `definition in ${source}` },
  source,
});

const FAKE: RecanalisationEvidence = {
  success: { m1: { evt: range(0.7, 0.9, 0.8, 'Trial A 2015'), ivt: range(0.1, 0.4, 0.25, 'Cohort B 2010') } },
  sich: { evt: range(0.03, 0.07, 0.045, 'Meta C 2016'), ivt: range(0.02, 0.08, 0.05, 'Trial D 1995') },
  reocclusion: { evt: range(0.02, 0.08, undefined, 'Registry E 2019') },
  sichMevo: {},
  sichLargeCore: null,
  tenecteplase: { sich: null, reperfusionBeforeEvt: null },
  lateIvt: null,
  distalEmbolization: range(0.05, 0.15, 0.09, 'Review F 2020'),
  newTerritoryEmbolization: null,
  noReflow: range(0.1, 0.4, undefined, 'Imaging G 2022'),
  ivtWindowH: 4.5,
  ivtConsensusWindowH: {},
  evtWindowH: 24,
};

beforeEach(() => {
  useApp.getState().resetAll();
  useApp.setState({ lang: 'zh-TW', leftTab: 'case', rightTab: 'now', occlusions });
});

afterEach(() => {
  cleanup();
});

const details = () => screen.queryByRole('group', { name: '治療細節' });

describe('treatment details in the Settings tab', () => {
  it('appear only once a reperfusion time is chosen, and go (and reset) when it is cleared', () => {
    render(<LeftPanel sim={sim} />);
    expect(details()).toBeNull();

    fireEvent.change(screen.getByDisplayValue('未再通'), { target: { value: '6' } });
    expect(useApp.getState().reperfusionH).toBe(6);
    expect(details()).not.toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: '靜脈血栓溶解' }));
    expect(useApp.getState().treatment.method).toBe('ivt');

    fireEvent.change(screen.getByDisplayValue(/^6 小時|發作後 6 小時/), { target: { value: '' } });
    expect(useApp.getState().reperfusionH).toBeNull();
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);
    expect(details()).toBeNull();
  });

  it('grade, reocclusion, no-reflow and distal embolus update the store', () => {
    useApp.setState({ reperfusionH: 3 });
    render(<LeftPanel sim={sim} />);
    const box = details()!;

    fireEvent.change(within(box).getByDisplayValue('3：完全再灌流'), { target: { value: '2b67' } });
    expect(useApp.getState().treatment.grade).toBe('2b67');
    // 2b50 and 2b67 are grouped under one "2b" heading
    expect(within(box).getByRole('group', { name: '2b：一半到九成' })).toBeTruthy();

    fireEvent.click(within(box).getByRole('radio', { name: '6 小時後' }));
    expect(useApp.getState().treatment.reocclusionAfterH).toBe(6);
    expect(within(box).getByRole('radio', { name: '6 小時後' }).getAttribute('aria-checked')).toBe('true');

    within(box).getByText('證據有限');
    fireEvent.click(within(box).getByRole('radio', { name: '15%' }));
    expect(useApp.getState().treatment.noReflow).toBe(0.15);

    const branch = downstreamBranches('mca_m1_l')[0];
    const distal = within(box).getByDisplayValue('無');
    within(distal).getByRole('option', { name: vesselName(VESSEL_BY_ID[branch], 'zh-TW') });
    fireEvent.change(distal, { target: { value: branch } });
    expect(useApp.getState().treatment.distalEmbolus).toBe(branch);

    fireEvent.click(within(box).getByRole('radio', { name: '不會' }));
    expect(useApp.getState().treatment).toEqual({ method: 'evt', grade: '2b67', reocclusionAfterH: null, distalEmbolus: branch, noReflow: 0.15 });
  });

  it('clearing occlusions or resetting restores the default treatment', () => {
    useApp.setState({ reperfusionH: 3 });
    useApp.getState().setTreatment({ grade: '1', noReflow: 0.3 });
    useApp.getState().clearOcclusions();
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);

    useApp.setState({ reperfusionH: 3, occlusions });
    useApp.getState().setTreatment({ method: 'bridging' });
    useApp.getState().resetAll();
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);
  });
});

describe('published figures', () => {
  it('shows each figure with its note and source, and says the simulation is the chosen result', () => {
    useApp.setState({ reperfusionH: 3 });
    render(<TreatmentDetails evidence={FAKE} siteGroupOf={() => 'm1'} />);
    const box = screen.getByRole('region', { name: '文獻數字' });
    within(box).getByText(/模擬顯示的是你選擇的結果，不是機率/);
    for (const src of ['Trial A 2015', 'Meta C 2016', 'Registry E 2019', 'Review F 2020', 'Imaging G 2022'])
      expect(within(box).getAllByText((_, el) => el?.tagName === 'CITE' && !!el.textContent?.includes(src))).toHaveLength(1);
    within(box).getByText('Trial A 2015 的定義');
    within(box).getByText('約 80%（70–90%）');
    within(box).getByText('2–8%');
    // IVT figures only for IVT
    expect(within(box).queryByText('Cohort B 2010 的定義')).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: '靜脈血栓溶解' }));
    within(box).getByText('Cohort B 2010 的定義');
    // no thrombectomy-only figures for IVT alone
    expect(within(box).queryByText('Review F 2020 的定義')).toBeNull();
  });

  it('does not crash without evidence, and says there is none', () => {
    useApp.setState({ reperfusionH: 3 });
    render(<TreatmentDetails evidence={EMPTY} />);
    const box = screen.getByRole('region', { name: '文獻數字' });
    within(box).getByText('App 內沒有這個部位與方式的已發表數據。');
    expect(within(box).queryByRole('listitem')).toBeNull();
  });

  it('renders with the app evidence module as it is', () => {
    useApp.setState({ reperfusionH: 3 });
    render(<TreatmentDetails />);
    expect(screen.getByRole('region', { name: '文獻數字' })).toBeTruthy();
  });
});

describe('warnings', () => {
  it('IV thrombolysis at 6 h is outside its usual window; thrombectomy at 6 h is not', () => {
    useApp.setState({ reperfusionH: 6 });
    render(<TreatmentDetails evidence={EMPTY} />);
    expect(screen.queryByText(/靜脈血栓溶解須在發作後 4.5 小時內開始用藥/)).toBeNull();

    fireEvent.click(screen.getByRole('radio', { name: '靜脈血栓溶解' }));
    // the window refers to drug start; the time chosen is when flow returns (C2-F5)
    screen.getByText(/^靜脈血栓溶解須在發作後 4.5 小時內開始用藥.*這裡選的是血流恢復的時間：發作後 6 小時；用藥後動脈通常在接下來 1–3 小時內才逐漸打通/);

    // bridging: thrombectomy sets the time, so a neutral note instead of the warning (R4-8)
    fireEvent.click(screen.getByRole('radio', { name: '兩者（橋接）' }));
    expect(screen.queryByText(/^靜脈血栓溶解須在發作後 4.5 小時內開始用藥/)).toBeNull();
    const note = screen.getByText(/^橋接治療的靜脈血栓溶解也須在發作後 4.5 小時內開始用藥.*取栓恢復血流的時間/);
    expect(note.className).toBe('callout note');
  });

  it('IV thrombolysis with flow back at 5 h gets a neutral note, not the window warning (R4-8)', () => {
    useApp.setState({ reperfusionH: 5 });
    useApp.getState().setTreatment({ method: 'ivt' });
    render(<TreatmentDetails evidence={EMPTY} />);
    expect(screen.queryByText(/^靜脈血栓溶解須在發作後/)).toBeNull();
    expect(screen.getByText(/和 4.5 小時內開始用藥相符/).className).toBe('callout note');
  });

  it('thrombectomy for a lenticulostriate occlusion is said not to apply (R4-5)', () => {
    useApp.setState({ occlusions: [{ vessel: 'lenticulostriate_l', severity: 1 }], reperfusionH: 3 });
    render(<TreatmentDetails />);
    expect(screen.getByText(/^取栓不處理這類動脈/).className).toBe('callout warn');
    expect(screen.queryByText(/只能個別決定/)).toBeNull();
  });

  it('IV thrombolysis within the window gets no time warning', () => {
    useApp.setState({ reperfusionH: 3 });
    useApp.getState().setTreatment({ method: 'ivt' });
    render(<TreatmentDetails evidence={EMPTY} />);
    expect(screen.queryByText(/須在發作後|通常只在發作後/)).toBeNull();
  });

  it('measures the window from the onset of the occlusion that is treated', () => {
    useApp.setState({ occlusions: [{ vessel: 'mca_m1_l', severity: 1, fromH: 24 }], reperfusionH: 27 });
    useApp.getState().setTreatment({ method: 'ivt' });
    render(<TreatmentDetails evidence={EMPTY} />);
    expect(screen.queryByText(/須在發作後|通常只在發作後/)).toBeNull();
  });

  it('warns about thrombolysis alone for a large-vessel occlusion when the evidence says it rarely works', () => {
    useApp.setState({ reperfusionH: 3 });
    useApp.getState().setTreatment({ method: 'ivt' });
    render(<TreatmentDetails evidence={FAKE} siteGroupOf={() => 'm1'} />);
    screen.getByText(/中大腦動脈 M1這類大血管阻塞，只用靜脈血栓溶解在數小時內早期打通的機會低/);
    cleanup();
    render(<TreatmentDetails evidence={EMPTY} siteGroupOf={() => 'm1'} />);
    expect(screen.queryByText(/大血管阻塞/)).toBeNull();
  });

  it('thrombectomy beyond its window', () => {
    useApp.setState({ occlusions: [{ vessel: 'mca_m1_l', severity: 1 }, { vessel: 'mca_m1_r', severity: 1, fromH: 24 }], reperfusionH: 30 });
    render(<TreatmentDetails evidence={{ ...EMPTY, evtWindowH: 4 }} />);
    screen.getByText(/取栓通常只在發作後 4 小時內/);
  });
});

describe('treatment summary in the results', () => {
  it('appears next to the occlusions when the treatment is not the default', () => {
    useApp.setState({ reperfusionH: 3 });
    const s = simulate({ occlusions, variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: 3, decompression: false });
    const { rerender } = render(<RightPanel sim={s} />);
    expect(screen.queryByText(/^治療：/)).toBeNull();

    useApp.getState().setTreatment({ grade: '2b67', reocclusionAfterH: 6 });
    rerender(<RightPanel sim={s} />);
    screen.getByText('治療：取栓 · eTICI 2b67 · 6 小時後再阻塞');
  });
});

describe('cluster C2 of the clinical-detail audit', () => {
  it('C2-F7: a lacunar occlusion says thrombolysis applies but the model does not simulate it', () => {
    const lacune = SCENARIOS.find((x) => x.id === 'l_lacune')!.occlusions;
    useApp.setState({ occlusions: lacune, reperfusionH: 3 });
    render(<TreatmentDetails />);
    screen.getByText(/腔隙性（單一穿通支）阻塞也用靜脈血栓溶解治療/);
    cleanup();
    useApp.setState({ lang: 'en' });
    render(<TreatmentDetails />);
    screen.getByText(/A lacunar \(single perforator\) occlusion is also treated with IV thrombolysis/);
    // not shown when a complete occlusion is reopened
    cleanup();
    useApp.setState({ occlusions, reperfusionH: 3 });
    render(<TreatmentDetails />);
    expect(screen.queryByText(/lacunar \(single perforator\)/)).toBeNull();
  });

  it('C2-F9: new-territory emboli are offered in their own group, and IV thrombolysis says the figures are thrombectomy data', () => {
    useApp.setState({ reperfusionH: 3 });
    render(<TreatmentDetails />);
    const box = details()!;
    const group = within(box).getByRole('group', { name: '新區域（同側前大腦動脈）' });
    within(group).getByRole('option', { name: vesselName(VESSEL_BY_ID['aca_callosomarginal_l'], 'zh-TW') });
    fireEvent.change(within(box).getByDisplayValue('無'), { target: { value: 'aca_callosomarginal_l' } });
    expect(useApp.getState().treatment.distalEmbolus).toBe('aca_callosomarginal_l');
    expect(within(box).queryByText(/靜脈血栓溶解後血栓也可能碎裂/)).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '靜脈血栓溶解' }));
    within(box).getByText(/靜脈血栓溶解後血栓也可能碎裂/);
  });
});
