// @vitest-environment jsdom
/**
 * The right panel answers two questions on two tabs: 此刻 (what is happening at the displayed
 * time) and 最終 (how the course ends). Does not mount the 3D scene.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { REGION_BY_ID, regionName } from '../anatomy';
import { TIME_STOPS } from '../anatomy/timeline';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { treatmentLine } from '../ui/caseSummary';
import { fmtMl } from '../ui/format';
import { RightPanel } from './RightPanel';

const simOf = () => {
  const s = useApp.getState();
  return simulate({
    occlusions: s.occlusions,
    variants: s.variants,
    map: s.map,
    collateral: s.collateral,
    tH: TIME_STOPS[s.tIndex].h,
    reperfusionH: s.reperfusionH,
    decompression: s.decompression,
    treatment: s.treatment,
  });
};
const at6m = () => simulate({ ...simOf().input, tH: 4320 });
const untreatedAt6m = () => simulate({ ...simOf().input, tH: 4320, reperfusionH: null, treatment: undefined });
const tabLabels = (c: HTMLElement) => [...c.querySelectorAll('.tabs button')].map((b) => b.textContent);
const CAVEAT_START = '這些數字來自依組織與神經路徑推算的示意模型，不是預後';

beforeEach(() => {
  useApp.getState().resetAll();
  useApp.setState({ lang: 'zh-TW', rightTab: 'now', leftTab: 'scenarios', mobilePanel: 'none' });
});
afterEach(() => {
  cleanup();
});

describe('tabs', () => {
  it('are 此刻 · 最終 · 詳細 in this order, with the pip on 此刻 when there is something to simulate', () => {
    const { container } = render(<RightPanel sim={simOf()} />);
    expect(tabLabels(container)).toEqual(['此刻', '最終', '詳細']);
    expect(container.querySelector('.tabs .pip')).toBeNull();
    cleanup();

    useApp.getState().loadScenario('l_m1');
    const again = render(<RightPanel sim={simOf()} />);
    const pip = again.container.querySelector('.tabs .pip');
    expect(pip).not.toBeNull();
    expect(pip!.closest('button')!.textContent).toBe('此刻');
  });

  it('are Now · Outcome · Details in English', () => {
    useApp.setState({ lang: 'en' });
    const { container } = render(<RightPanel sim={simOf()} />);
    expect(tabLabels(container)).toEqual(['Now', 'Outcome', 'Details']);
  });

  it('shows the same empty message on 此刻 and 最終 when nothing is simulated', () => {
    render(<RightPanel sim={simOf()} />);
    screen.getByText('目前沒有任何阻塞。');
    fireEvent.click(screen.getByRole('button', { name: '最終' }));
    screen.getByText('目前沒有任何阻塞。');
    expect(screen.queryByText(new RegExp(CAVEAT_START))).toBeNull();
  });
});

describe('此刻 tab', () => {
  it('no longer shows end-of-course stat boxes, but links to the outcome', () => {
    useApp.getState().loadScenario('l_m1_thrombectomy');
    const sim = simOf();
    expect(sim.volumes.saved).toBeGreaterThan(0.5);
    const { container } = render(<RightPanel sim={sim} />);
    const labels = [...container.querySelectorAll('.stat-label')].map((l) => l.textContent);
    expect(labels).not.toContain('最終梗塞（預估）');
    expect(labels).not.toContain('治療救回');
    // the stats tied to the displayed time are still there
    expect(labels).toContain('梗塞核心 · 24 小時');

    const link = screen.getByRole('button', { name: `最終梗塞 ${fmtMl(sim.volumes.finalInfarct)} mL · 看最終結果 →` });
    fireEvent.click(link);
    expect(useApp.getState().rightTab).toBe('final');
  });
});

describe('最終 tab', () => {
  it('shows the final infarct, the neurons lost and the uncertainty caveat', () => {
    useApp.getState().loadScenario('l_m1');
    const { container, rerender } = render(<RightPanel sim={simOf()} />);
    fireEvent.click(screen.getByRole('button', { name: '最終' }));
    rerender(<RightPanel sim={simOf()} />);
    const stat = [...container.querySelectorAll('.stat')].find((s) => s.querySelector('.stat-label')?.textContent === '最終梗塞') as HTMLElement;
    expect(stat).toBeDefined();
    expect(stat.querySelector('.stat-value')!.textContent).toBe(`${fmtMl(at6m().volumes.finalInfarct)} mL`);
    screen.getByText('損失神經元（6 個月）');
    // no treatment → no "saved" box
    expect(screen.queryByText('治療救回')).toBeNull();
    screen.getByText(new RegExp(CAVEAT_START));
    // independent of the displayed time: the same numbers at 3 h and at 1 month
    const before = container.querySelector('.results')!.textContent;
    useApp.setState({ tIndex: TIME_STOPS.findIndex((s) => s.h === 720) });
    rerender(<RightPanel sim={simOf()} />);
    expect(container.querySelector('.results')!.textContent).toBe(before);
  });

  it('compares treated and untreated only when a treatment is set', () => {
    useApp.getState().loadScenario('l_m1_thrombectomy');
    useApp.setState({ rightTab: 'final' });
    render(<RightPanel sim={simOf()} />);
    const table = screen.getByRole('table');
    const head = within(table).getAllByRole('columnheader').map((h) => h.textContent);
    expect(head).toEqual(['', '治療後', '未治療']);
    const row = (name: string) => within(within(table).getByRole('rowheader', { name }).closest('tr')!).getAllByRole('cell').map((c) => c.textContent);
    const treated = at6m();
    const untreated = untreatedAt6m();
    expect(row('最終梗塞')).toEqual([`${fmtMl(treated.volumes.finalInfarct)} mL`, `${fmtMl(untreated.volumes.finalInfarct)} mL`]);
    expect(row('NIHSS（6 個月）')).toEqual([String(treated.nihss.total), String(untreated.nihss.total)]);
    expect(row('6 個月時的缺損')).toEqual([`${treated.symptoms.length} 項`, `${untreated.symptoms.length} 項`]);
    within(table).getByRole('rowheader', { name: 'NIHSS（3 個月）' });
    // the treated course saved tissue, shown next to the final infarct
    screen.getByText('治療救回');
    expect(screen.queryByRole('button', { name: '設定治療 →' })).toBeNull();
    // the treatment is named as on the case summary line (24 h reads "24 小時", not "1 天")
    useApp.setState({ reperfusionH: 24, treatment: { ...useApp.getState().treatment, method: 'evt', grade: '2b67' } });
    cleanup();
    render(<RightPanel sim={simOf()} />);
    const caption = screen.getByText(/^治療：/);
    expect(caption.textContent).toContain(treatmentLine(useApp.getState(), 'zh-TW', true));
    expect(caption.textContent).toContain('24 小時再通');
    cleanup();

    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final' });
    render(<RightPanel sim={simOf()} />);
    expect(screen.queryByRole('table')).toBeNull();
    screen.getByText(/在「病例 → 治療」設定再通時間/);
  });

  it('the hint opens the case tab (and the left panel on a phone)', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final', mobilePanel: 'right' });
    render(<RightPanel sim={simOf()} />);
    fireEvent.click(screen.getByRole('button', { name: '設定治療 →' }));
    expect(useApp.getState().leftTab).toBe('case');
    expect(useApp.getState().mobilePanel).toBe('left');
  });

  it('the hint leaves the desktop layout alone', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final', mobilePanel: 'none' });
    render(<RightPanel sim={simOf()} />);
    fireEvent.click(screen.getByRole('button', { name: '設定治療 →' }));
    expect(useApp.getState().leftTab).toBe('case');
    expect(useApp.getState().mobilePanel).toBe('none');
  });

  it('「跳到 6 個月」 moves the timeline to its last stop and shows 此刻', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final' });
    expect(useApp.getState().tIndex).not.toBe(TIME_STOPS.length - 1);
    render(<RightPanel sim={simOf()} />);
    fireEvent.click(screen.getByRole('button', { name: '跳到 6 個月' }));
    expect(useApp.getState().tIndex).toBe(TIME_STOPS.length - 1);
    expect(useApp.getState().rightTab).toBe('now');
  });

  it('lists lasting deficits by group, at 6 months by default and at 3 months on request', () => {
    useApp.setState({ occlusions: [{ vessel: 'pica_r', severity: 1 }], rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const box = container.querySelector('.outcome-deficits') as HTMLElement;
    const groups = () => [...box.querySelectorAll('.outcome-group h4')].map((h) => h.textContent);
    // vertigo after a one-sided PICA is largely compensated by 6 months (see finalOutcome.test.ts)
    expect(groups().some((g) => g!.startsWith('大致代償'))).toBe(true);
    const largely = box.querySelector('.og-largely') as HTMLElement;
    within(largely).getByText(/眩暈/);
    const count = (sel: string) => box.querySelectorAll(sel).length;
    expect(count('.outcome-group li')).toBe(at6m().symptoms.length);
    fireEvent.click(within(box).getByRole('button', { name: '3 個月' }));
    expect(within(box).getByRole('button', { name: '3 個月' }).getAttribute('aria-pressed')).toBe('true');
    expect(count('.outcome-group li')).toBe(simulate({ ...simOf().input, tH: 2160 }).symptoms.length);
  });

  it('names the syndrome that remains at 6 months (locked-in after a mid-basilar occlusion)', () => {
    useApp.getState().loadScenario('basilar_mid');
    useApp.setState({ rightTab: 'final' });
    const lockedIn = at6m().syndromes.find((s) => s.def.id === 'locked_in');
    expect(lockedIn).toBeDefined();
    const { container } = render(<RightPanel sim={simOf()} />);
    const line = container.querySelector('.outcome-syndromes') as HTMLElement;
    expect(line.textContent).toContain(`可能的症候群：`);
    expect(line.textContent).toContain(lockedIn!.def.name.zh);
  });

  it('says so when a TIA leaves nothing behind', () => {
    useApp.getState().loadScenario('tia_l_mca');
    useApp.setState({ rightTab: 'final' });
    render(<RightPanel sim={simOf()} />);
    screen.getByText('沒有留下症狀。');
    screen.getByText('沒有腦區留下梗塞。');
    // the 5-minute reopening does not make the course "unsettled"
    expect(screen.queryByText(/病程還沒有完全穩定/)).toBeNull();
  });

  it('warns that a late event has not settled by 6 months', () => {
    useApp.setState({ occlusions: [{ vessel: 'mca_m1_l', severity: 1, fromH: 720 }], rightTab: 'final' });
    render(<RightPanel sim={simOf()} />);
    screen.getByText(/最後一次血管變化在 1 個月，最終梗塞要到 7 個月 .*病程還沒有完全穩定/);
    screen.getByText(/主要發作在 1 個月/);
  });

  it('lists late events and final regions; a region opens its details', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const events = container.querySelector('.events') as HTMLElement;
    const titles = [...events.querySelectorAll('.ev-title')].map((e) => e.textContent);
    const six = at6m();
    const title = (id: string) => six.cascade.events.find((e) => e.id === id)!.title.zh;
    expect(titles).toContain(title('wallerian_l'));
    expect(titles).not.toContain(title('ischemic_cascade'));

    const insula = regionName(REGION_BY_ID.insula_l, 'zh-TW');
    const list = container.querySelector('.region-list') as HTMLElement;
    fireEvent.click(within(list).getByText(insula));
    expect(useApp.getState().selected).toEqual({ kind: 'region', id: 'insula_l' });
    expect(useApp.getState().rightTab).toBe('details');
  });

  it('never calls an NIHSS of 0 with uncaptured deficits "no symptoms" (monocular blindness)', () => {
    useApp.getState().loadScenario('amaurosis');
    useApp.setState({ rightTab: 'final' });
    const six = at6m();
    expect(six.nihss.total).toBe(0);
    expect(six.nihss.uncaptured).toBe(true);
    const { container } = render(<RightPanel sim={simOf()} />);
    const nihss = container.querySelector('.outcome-nihss') as HTMLElement;
    expect(within(nihss).getAllByText('量表未涵蓋')).toHaveLength(2);
    expect(screen.queryByText('無症狀')).toBeNull();
    within(nihss).getByText('NIHSS 未涵蓋這些症狀（例如單眼視力喪失）：分數 0 不代表沒有症狀。');
    // and the deficit itself is listed as lasting
    const marked = container.querySelector('.og-marked') as HTMLElement;
    within(marked).getByText(/單眼/);
  });
});
