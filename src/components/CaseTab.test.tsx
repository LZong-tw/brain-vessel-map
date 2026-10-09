// @vitest-environment jsdom
/**
 * The case tab gathers what used to be scattered over three tabs: the conditions before onset,
 * the occlusion events (with their timing) and the treatment, each a card whose header says
 * what is set even while it is closed.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { VESSEL_BY_ID, vesselName } from '../anatomy';
import { lacuneSitesOf } from '../anatomy/lacunes';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { LeftPanel } from './LeftPanel';

const simOf = () => {
  const s = useApp.getState();
  return simulate({ occlusions: s.occlusions, variants: s.variants, map: s.map, collateral: s.collateral, tH: 24, reperfusionH: s.reperfusionH, decompression: s.decompression });
};
const renderPanel = () => render(<LeftPanel sim={simOf()} />);
const BA = vesselName(VESSEL_BY_ID.basilar_mid, 'zh-TW');
const PICA = vesselName(VESSEL_BY_ID.pica_r, 'zh-TW');
const vessels = () => useApp.getState().occlusions.map((o) => o.vessel);

const card = (title: string) => screen.getByRole('region', { name: title });
/** a card's (or sub-section's) header button */
const header = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title.replace(/[()（）]/g, '.')}`) });
const summaryOf = (title: string) => header(title).querySelector('.case-toggle-summary')?.textContent;
const bodyOf = (button: HTMLElement) => document.getElementById(button.getAttribute('aria-controls')!)!;

const stack = () => {
  useApp.getState().loadScenario('basilar_mid');
  useApp.getState().addScenario('r_pica');
  useApp.setState({ leftTab: 'case' });
};

beforeEach(() => {
  useApp.getState().resetAll();
  useApp.setState({ lang: 'zh-TW', leftTab: 'case' });
});
afterEach(() => {
  cleanup();
});

describe('left tabs', () => {
  it('are 病例 · 範本 · 血管 · 顯示, in that order, and the case tab shows three cards', () => {
    const { container } = renderPanel();
    const labels = [...container.querySelectorAll('nav.tabs button')].map((b) => b.textContent);
    expect(labels).toEqual(['病例', '範本', '血管', '顯示']);
    for (const title of ['發病前條件', '阻塞事件', '治療']) card(title);
    screen.getByRole('button', { name: '全部重設' });
  });

  it('in English', () => {
    useApp.setState({ lang: 'en' });
    const { container } = renderPanel();
    expect([...container.querySelectorAll('nav.tabs button')].map((b) => b.textContent)).toEqual(['Case', 'Templates', 'Vessels', 'View']);
    for (const title of ['Before onset', 'Occlusion events', 'Treatment']) card(title);
  });

  it('the templates tab explains loading versus stacking', () => {
    useApp.setState({ leftTab: 'scenarios' });
    renderPanel();
    screen.getByText('點範本會取代目前的病例；按「疊加」則把範本的阻塞加到目前的病例上。');
    // the embolus moved to the case tab
    expect(screen.queryByRole('button', { name: '釋放栓子' })).toBeNull();
  });
});

describe('card headers', () => {
  it('summarise the current case', () => {
    stack();
    useApp.getState().setCollateral('poor');
    useApp.getState().setMap(124);
    useApp.getState().setReperfusion(24);
    useApp.getState().setTreatment({ grade: '2b67' });
    renderPanel();
    expect(summaryOf('發病前條件')).toBe('側枝差 · 平均動脈壓 124 · 無解剖變異');
    expect(summaryOf('阻塞事件')).toBe(`${BA} + ${PICA}`);
    expect(summaryOf('治療')).toBe('24 小時再通 · 取栓 · eTICI 2b67');
  });

  it('say when nothing is set', () => {
    renderPanel();
    expect(summaryOf('發病前條件')).toBe('側枝良好 · 平均動脈壓 93 · 無解剖變異');
    expect(summaryOf('阻塞事件')).toBe('尚未設定');
    expect(summaryOf('治療')).toBe('未治療');
  });

  it('collapse and expand their card', () => {
    renderPanel();
    for (const title of ['發病前條件', '阻塞事件', '治療']) expect(header(title).getAttribute('aria-expanded')).toBe('true');
    const h = header('發病前條件');
    const body = bodyOf(h);
    expect(body.hidden).toBe(false);
    expect(screen.getByRole('radiogroup', { name: '側枝循環' })).toBeTruthy();

    fireEvent.click(h);
    expect(h.getAttribute('aria-expanded')).toBe('false');
    expect(body.hidden).toBe(true);
    expect(screen.queryByRole('radiogroup', { name: '側枝循環' })).toBeNull();
    // the summary stays in view
    expect(summaryOf('發病前條件')).toBe('側枝良好 · 平均動脈壓 93 · 無解剖變異');

    fireEvent.click(h);
    expect(h.getAttribute('aria-expanded')).toBe('true');
    expect(body.hidden).toBe(false);
  });
});

describe('conditions card', () => {
  it('collateral grade and blood pressure update the store and the summary', () => {
    renderPanel();
    fireEvent.click(within(card('發病前條件')).getByRole('radio', { name: '不良' }));
    expect(useApp.getState().collateral).toBe('poor');
    fireEvent.change(screen.getByRole('slider', { name: '平均動脈壓' }), { target: { value: '124' } });
    expect(useApp.getState().map).toBe(124);
    expect(summaryOf('發病前條件')).toBe('側枝差 · 平均動脈壓 124 · 無解剖變異');
  });

  it('keeps the variants in a closed sub-list that shows how many are chosen', () => {
    renderPanel();
    const sub = header('解剖變異');
    expect(sub.textContent).toContain('解剖變異（未選）');
    expect(sub.getAttribute('aria-expanded')).toBe('false');
    expect(within(card('發病前條件')).queryAllByRole('checkbox')).toHaveLength(0);

    fireEvent.click(sub);
    const boxes = within(card('發病前條件')).getAllByRole('checkbox');
    expect(boxes.length).toBeGreaterThan(1);
    fireEvent.click(boxes[0]);
    expect(useApp.getState().variants).toHaveLength(1);
    expect(header('解剖變異').textContent).toContain('解剖變異（已選 1 項）');
    expect(summaryOf('發病前條件')).toBe('側枝良好 · 平均動脈壓 93 · 1 項變異');
  });
});

describe('events card', () => {
  it('lists every vessel of a stacked case with its timing, and removes one', () => {
    stack();
    renderPanel();
    const events = card('阻塞事件');
    const items = within(events).getAllByRole('listitem');
    expect(items.map((li) => within(li).getAllByRole('button')[0].textContent)).toEqual([BA, PICA]);
    within(items[1]).getByText('完全阻塞', { selector: '.badge' });
    // each vessel has its own timing editor
    expect(within(events).getAllByLabelText('開始')).toHaveLength(2);

    fireEvent.click(within(events).getByRole('button', { name: PICA }));
    expect(useApp.getState().selected).toEqual({ kind: 'vessel', id: 'pica_r' });

    fireEvent.click(within(events).getByRole('button', { name: `移除${PICA}的阻塞` }));
    expect(vessels()).toEqual(['basilar_mid']);
    expect(summaryOf('阻塞事件')).toBe(BA);
  });

  it('removes every phase of a vessel at once', () => {
    useApp.setState({
      occlusions: [
        { vessel: 'basilar_mid', severity: 0.9, toH: 72 },
        { vessel: 'basilar_mid', severity: 1, fromH: 72 },
        { vessel: 'pica_r', severity: 1 },
      ],
    });
    renderPanel();
    const events = card('阻塞事件');
    within(events).getByText('分段：2 個階段');
    expect(summaryOf('阻塞事件')).toBe(`${BA}（分段） + ${PICA}`);
    fireEvent.click(within(events).getByRole('button', { name: `移除${BA}的阻塞` }));
    expect(vessels()).toEqual(['pica_r']);
  });

  it('the timing editor changes when an occlusion begins', () => {
    useApp.setState({ occlusions: [{ vessel: 'pica_r', severity: 1 }] });
    renderPanel();
    fireEvent.change(within(card('阻塞事件')).getByLabelText('開始'), { target: { value: '72' } });
    expect(useApp.getState().occlusions).toEqual([{ vessel: 'pica_r', severity: 1, fromH: 72 }]);
    expect(summaryOf('阻塞事件')).toBe(`${PICA}（3 天起）`);
  });

  it('edits a single-phase degree without changing another vessel', () => {
    stack();
    renderPanel();
    const items = within(card('阻塞事件')).getAllByRole('listitem');
    const degree = within(items[0]).getByRole('combobox', { name: '程度' });
    fireEvent.change(degree, { target: { value: '0.7' } });
    expect(useApp.getState().occlusions).toEqual([
      { vessel: 'basilar_mid', severity: 0.7 },
      { vessel: 'pica_r', severity: 1 },
    ]);
    expect(summaryOf('阻塞事件')).toContain('70%');
    fireEvent.change(degree, { target: { value: '1' } });
    expect(summaryOf('阻塞事件')).toBe(`${BA} + ${PICA}`);
  });

  it('preserves a single phase timing and displays a custom degree', () => {
    useApp.setState({ occlusions: [{ vessel: 'pica_r', severity: 0.75, fromH: 72, toH: 73 }] });
    renderPanel();
    const degree = within(card('阻塞事件')).getByRole('combobox', { name: '程度' }) as HTMLSelectElement;
    expect(degree.value).toBe('0.75');
    fireEvent.change(degree, { target: { value: '0.9' } });
    expect(useApp.getState().occlusions).toEqual([{ vessel: 'pica_r', severity: 0.9, fromH: 72, toH: 73 }]);
    expect(summaryOf('阻塞事件')).toContain('90%');
  });

  it('converts a lacunar branch to a whole-vessel stenosis without retaining its site', () => {
    const lacuneSite = lacuneSitesOf('lenticulostriate')[1].id;
    useApp.setState({ occlusions: [{ vessel: 'lenticulostriate_l', severity: 1, branch: true, lacuneSite }] });
    renderPanel();
    const degree = within(card('阻塞事件')).getByRole('combobox', { name: '程度' }) as HTMLSelectElement;
    expect(degree.value).toBe('b');
    fireEvent.change(degree, { target: { value: '0.7' } });
    expect(useApp.getState().occlusions).toEqual([{ vessel: 'lenticulostriate_l', severity: 0.7 }]);
    fireEvent.change(degree, { target: { value: 'b' } });
    expect(useApp.getState().occlusions).toEqual([{ vessel: 'lenticulostriate_l', severity: 1, branch: true }]);
  });

  it('continues to edit only the chosen stage of a staged vessel', () => {
    useApp.setState({ occlusions: [
      { vessel: 'basilar_mid', severity: 0.9, toH: 72 },
      { vessel: 'basilar_mid', severity: 1, fromH: 72 },
    ] });
    renderPanel();
    const degrees = within(card('阻塞事件')).getAllByRole('combobox', { name: '程度' });
    fireEvent.change(degrees[1], { target: { value: '0.7' } });
    expect(useApp.getState().occlusions).toEqual([
      { vessel: 'basilar_mid', severity: 0.9, toH: 72 },
      { vessel: 'basilar_mid', severity: 0.7, fromH: 72 },
    ]);
  });

  it('offers single-phase degree editing in English without a lacunar option for a large artery', () => {
    useApp.setState({ lang: 'en', occlusions: [{ vessel: 'basilar_mid', severity: 1 }] });
    renderPanel();
    const degree = within(card('Occlusion events')).getByRole('combobox', { name: 'Degree' }) as HTMLSelectElement;
    expect([...degree.options].map((o) => o.value)).toEqual(['0.5', '0.7', '0.9', '1']);
    fireEvent.change(degree, { target: { value: '0.5' } });
    expect(useApp.getState().occlusions).toEqual([{ vessel: 'basilar_mid', severity: 0.5 }]);
  });

  it('empty: offers to start from a template or from the vessel list', () => {
    renderPanel();
    const events = card('阻塞事件');
    within(events).getByText('還沒有阻塞的血管。');
    expect(within(events).queryByRole('button', { name: '清除所有阻塞' })).toBeNull();
    fireEvent.click(within(events).getByRole('button', { name: '從範本開始' }));
    expect(useApp.getState().leftTab).toBe('scenarios');
    cleanup();

    useApp.setState({ leftTab: 'case' });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '在血管列表加入' }));
    expect(useApp.getState().leftTab).toBe('vessels');
    // the panel now shows the vessel list
    screen.getByRole('searchbox');
  });

  it('with occlusions: the same actions read as stacking, and everything can be cleared', () => {
    stack();
    renderPanel();
    const events = card('阻塞事件');
    expect(within(events).queryByRole('button', { name: '從範本開始' })).toBeNull();
    fireEvent.click(within(events).getByRole('button', { name: '疊加範本' }));
    expect(useApp.getState().leftTab).toBe('scenarios');
    cleanup();

    useApp.setState({ leftTab: 'case' });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '加入血管' }));
    expect(useApp.getState().leftTab).toBe('vessels');
    cleanup();

    useApp.setState({ leftTab: 'case' });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '清除所有阻塞' }));
    expect(vessels()).toEqual([]);
    expect(summaryOf('阻塞事件')).toBe('尚未設定');
  });

  it('holds the embolus in a sub-section that is closed by default', () => {
    renderPanel();
    const sub = header('放一顆栓子（隨機）');
    expect(within(card('阻塞事件')).getByRole('button', { name: '放一顆栓子（隨機）' })).toBe(sub);
    expect(sub.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('button', { name: '釋放栓子' })).toBeNull();
    fireEvent.click(sub);
    expect(sub.getAttribute('aria-expanded')).toBe('true');
    screen.getByRole('button', { name: '釋放栓子' });
  });
});

describe('treatment card', () => {
  const details = () => screen.queryByRole('group', { name: '治療細節' });

  it('shows the treatment details only once a reperfusion time is chosen', () => {
    useApp.setState({ occlusions: [{ vessel: 'mca_m1_l', severity: 1 }] });
    renderPanel();
    expect(details()).toBeNull();
    fireEvent.change(within(card('治療')).getByDisplayValue('未再通'), { target: { value: '24' } });
    expect(useApp.getState().reperfusionH).toBe(24);
    expect(details()).not.toBeNull();
    expect(summaryOf('治療')).toBe('24 小時再通');
    fireEvent.click(within(details()!).getByRole('radio', { name: '靜脈血栓溶解' }));
    expect(summaryOf('治療')).toBe('24 小時再通 · 靜脈血栓溶解 · eTICI 3');
  });

  it('toggles decompression', () => {
    renderPanel();
    const box = within(card('治療')).getByRole('checkbox', { name: '減壓手術（出現致命腫脹時）' });
    fireEvent.click(box);
    expect(useApp.getState().decompression).toBe(true);
    expect(summaryOf('治療')).toBe('未再通 · 必要時減壓手術');
    fireEvent.click(box);
    expect(useApp.getState().decompression).toBe(false);
    expect(summaryOf('治療')).toBe('未治療');
  });
});

describe('reset', () => {
  it('全部重設 clears the case', () => {
    stack();
    useApp.getState().setMap(124);
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: '全部重設' }));
    expect(vessels()).toEqual([]);
    expect(useApp.getState().map).toBe(93);
  });
});
