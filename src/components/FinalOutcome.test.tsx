// @vitest-environment jsdom
/**
 * The right panel answers two questions on two tabs: 此刻 (what is happening at the displayed
 * time) and 最終 (how the course ends). Does not mount the 3D scene.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { REGION_BY_ID, regionName } from '../anatomy';
import { POST_STROKE_RISKS } from '../anatomy/postStrokeRisks';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { TIME_STOPS } from '../anatomy/timeline';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { treatmentLine } from '../ui/caseSummary';
import { fmtMl } from '../ui/format';
import { OUTCOME_UI } from '../i18n/uiOutcome';
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
    // (Y3-9: a late sign listed only as possible, such as pathological crying, is not counted)
    const definite = (r: typeof treated) => [...r.symptoms, ...r.unexaminable].filter((s) => !SYMPTOM_BY_ID[s.id].possible).length;
    expect(treated.symptoms.some((s) => SYMPTOM_BY_ID[s.id].possible)).toBe(true);
    expect(row('6 個月時的缺損')).toEqual([`${definite(treated)} 項`, `${definite(untreated)} 項`]);
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

  // X1-12: memory and initiative cannot be examined in a disorder of consciousness; they are not
  // "no longer there"
  it('names apart the deficits that cannot be examined in a disorder of consciousness (top of the basilar at 6 months)', () => {
    useApp.getState().loadScenario('basilar_tip');
    useApp.setState({ rightTab: 'final' });
    const m6 = at6m();
    expect(m6.symptoms.map((s) => s.id)).toContain('disorder_of_consciousness');
    expect(m6.unexaminable.map((s) => s.id)).toEqual(expect.arrayContaining(['amnesia', 'abulia']));
    const { container } = render(<RightPanel sim={simOf()} />);
    const box = container.querySelector('.outcome-deficits .outcome-unexaminable') as HTMLElement;
    expect(box).not.toBeNull();
    within(box).getByText('意識下降，目前無法檢查');
    within(box).getByText(SYMPTOM_BY_ID.amnesia.name.zh);
    // the lasting-deficit groups list only what is listed
    expect(container.querySelectorAll('.outcome-deficits .outcome-group li').length).toBe(m6.symptoms.length);
  });

  it('names the syndrome that remains at 6 months (locked-in after a mid-basilar occlusion)', () => {
    useApp.getState().loadScenario('basilar_mid');
    useApp.setState({ rightTab: 'final' });
    // incomplete by then: some limb movement has returned (C3-F1)
    const lockedIn = at6m().syndromes.find((s) => s.def.id === 'locked_in_incomplete');
    expect(lockedIn).toBeDefined();
    const { container } = render(<RightPanel sim={simOf()} />);
    const line = container.querySelector('.outcome-syndromes') as HTMLElement;
    expect(line.textContent).toContain(`可能的症候群：`);
    expect(line.textContent).toContain(lockedIn!.def.name.zh);
  });

  it('marks a vascular-pattern label with no symptom left as clinically silent (watershed at 6 months)', () => {
    // right ICA stenosis at a mean pressure of 65 mmHg: a proximal arm weakness that recovers
    // (the teaching scenario at 60 mmHg keeps a mild one, C1-F6)
    useApp.getState().loadScenario('watershed');
    useApp.setState({ map: 65, rightTab: 'final' });
    const ws = at6m().syndromes.find((s) => s.def.id === 'watershed');
    expect(ws?.silent).toBe(true);
    const { container } = render(<RightPanel sim={simOf()} />);
    const line = container.querySelector('.outcome-syndromes') as HTMLElement;
    expect(line.textContent).toContain(`${ws!.def.name.zh}（臨床無症狀）`);
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

  // Z4-18: a loss that lasts months over an infarcted retina is a central retinal artery occlusion;
  // amaurosis fugax is a transient loss by definition
  it.each(['zh-TW', 'en'] as const)('%s: the lasting monocular blindness is not named amaurosis fugax', (lang) => {
    useApp.getState().loadScenario('amaurosis');
    useApp.setState({ rightTab: 'final', lang });
    expect(at6m().regions.retina_r.infarct).toBeGreaterThan(0.9);
    const { container } = render(<RightPanel sim={simOf()} />);
    const marked = (container.querySelector('.og-marked') as HTMLElement).textContent ?? '';
    expect(marked).toMatch(lang === 'en' ? /monocular vision loss/i : /單眼視力喪失/);
    expect(marked).not.toMatch(lang === 'en' ? /amaurosis fugax/i : /一過性黑矇/);
    // the symptom's description gives both names, each for its own course
    const d = SYMPTOM_BY_ID.monocular_blind.desc;
    expect(d.en).toMatch(/amaurosis fugax/);
    expect(d.en).toMatch(/central retinal artery occlusion/);
    expect(d.zh).toContain('一過性黑矇');
    expect(d.zh).toContain('視網膜中央動脈阻塞');
  });
});

describe('最終 tab: a course that usually ends in death (C4-F1)', () => {
  it('shows the mortality next to the NIHSS, and labels the NIHSS as if the patient survives', () => {
    useApp.getState().loadScenario('r_m1_malignant');
    useApp.setState({ rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const nihss = container.querySelector('.outcome-nihss') as HTMLElement;
    const callout = within(nihss).getByText(/78%/);
    expect(callout.className).toContain('callout');
    expect(callout.textContent).toContain('29%');
    within(nihss).getByText('3 個月（假如存活）');
    within(nihss).getByText('6 個月（假如存活）');
    cleanup();

    useApp.setState({ lang: 'en' });
    const en = render(<RightPanel sim={simOf()} />);
    const n2 = en.container.querySelector('.outcome-nihss') as HTMLElement;
    within(n2).getByText(/78%/);
    within(n2).getByText('3 months (if the patient survives)');
  });

  it('says nothing of the kind after decompression or for an ordinary infarct', () => {
    for (const id of ['r_m1_decompression', 'l_m1']) {
      useApp.getState().loadScenario(id);
      useApp.setState({ rightTab: 'final' });
      const { container } = render(<RightPanel sim={simOf()} />);
      const nihss = container.querySelector('.outcome-nihss') as HTMLElement;
      expect(within(nihss).queryByText(/78%/), id).toBeNull();
      within(nihss).getByText('3 個月');
      cleanup();
    }
  });

  it('a swollen cerebellum in coma: life-threatening, with no invented mortality figure', () => {
    useApp.getState().loadScenario('cerebellar_swelling');
    useApp.setState({ rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const nihss = container.querySelector('.outcome-nihss') as HTMLElement;
    const callout = within(nihss).getByText(/枕下減壓/);
    expect(callout.textContent).not.toMatch(/78%/);
  });

  it('adds a row to the treated / untreated comparison', () => {
    // left M1 with moderate collaterals: herniates untreated, not when reopened at 1 h
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final', collateral: 'moderate', reperfusionH: 1 });
    render(<RightPanel sim={simOf()} />);
    const table = screen.getByRole('table');
    // R6-14: 'likely', not 'possible' (可能), as in English and in the callout's 'usually fatal'
    const cells = within(within(table).getByRole('rowheader', { name: '很可能死亡（疝脫）' }).closest('tr')!).getAllByRole('cell').map((c) => c.textContent);
    expect(cells).toEqual(['—', '很可能']);
  });

  it('labels the row by the risk: a swollen cerebellum is life-threatening, not a likely death from herniation (R6-8, R6-13)', () => {
    useApp.getState().loadScenario('cerebellar_swelling');
    useApp.setState({ rightTab: 'final', reperfusionH: 6 });
    render(<RightPanel sim={simOf()} />);
    const row = (name: string) => within(within(screen.getByRole('table')).getByRole('rowheader', { name }).closest('tr')!);
    expect(row('危及生命（腦幹受壓、未手術）').getAllByRole('cell').map((c) => c.textContent)).toEqual(['是', '是']);
    expect(screen.getByRole('table').textContent).not.toMatch(/疝脫|很可能/);
    cleanup();

    useApp.setState({ lang: 'en' });
    render(<RightPanel sim={simOf()} />);
    expect(row('Life-threatening (brainstem compression, no surgery)').getAllByRole('cell').map((c) => c.textContent)).toEqual(['yes', 'yes']);
    expect(screen.getByRole('table').textContent).not.toMatch(/herniation|likely/i);
  });

  // Z2-3, Z2-6: the untreated column's NIHSS is that of a survivor of a course that is usually fatal
  it('marks the NIHSS of a column whose course is usually fatal as a survivor\'s', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final', collateral: 'moderate', reperfusionH: 1 });
    render(<RightPanel sim={simOf()} />);
    const row = (name: RegExp) => within(within(screen.getByRole('table')).getByRole('rowheader', { name }).closest('tr')!).getAllByRole('cell').map((c) => c.textContent ?? '');
    for (const name of [/NIHSS（3 個月）/, /NIHSS（6 個月）/]) {
      const [treated, untreated] = row(name);
      expect(treated).not.toContain('假如存活');
      expect(untreated).toMatch(/^\d+（假如存活）$/);
    }
    cleanup();
    useApp.setState({ lang: 'en' });
    render(<RightPanel sim={simOf()} />);
    const [treated, untreated] = row(/NIHSS \(3 months\)/);
    expect(treated).toMatch(/^\d+$/);
    expect(untreated).toMatch(/^\d+ \(if the patient survives\)$/);
  });

  it('keeps the herniation label in English', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final', collateral: 'moderate', reperfusionH: 1, lang: 'en' });
    render(<RightPanel sim={simOf()} />);
    const tr = within(within(screen.getByRole('table')).getByRole('rowheader', { name: 'Death likely (herniation)' }).closest('tr')!);
    expect(tr.getAllByRole('cell').map((c) => c.textContent)).toEqual(['—', 'likely']);
  });

  // Y3-11: a comatose top-of-the-basilar occlusion that is not reopened is often fatal
  it('a basilar occlusion not reopened, with coma: the trial mortality, and the NIHSS as if the patient survives', () => {
    useApp.getState().loadScenario('basilar_tip');
    useApp.setState({ rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const nihss = container.querySelector('.outcome-nihss') as HTMLElement;
    const callout = within(nihss).getByText(/ATTENTION/);
    expect(callout.className).toContain('danger');
    expect(callout.textContent).toMatch(/55%.*42%/);
    within(nihss).getByText('3 個月（假如存活）');
    cleanup();
    // reopened at 4 h: not for the treated course, still for the untreated one
    useApp.setState({ rightTab: 'final', reperfusionH: 4, lang: 'en' });
    render(<RightPanel sim={simOf()} />);
    const tr = within(within(screen.getByRole('table')).getByRole('rowheader', { name: 'Often fatal (basilar not reopened, coma)' }).closest('tr')!);
    expect(tr.getAllByRole('cell').map((c) => c.textContent)).toEqual(['—', 'often']);
  });

  // Z3-12: both hemispheres destroyed: the herniation figures of one hemisphere do not apply, and the
  // survivor stays in a disorder of consciousness
  it('both hemispheres destroyed: their own note in place of the figures of one hemisphere', () => {
    const both = (a: string, b: string) => [
      { vessel: a, severity: 1 },
      { vessel: b, severity: 1 },
    ];
    // (both carotid T: both MCA infarcts with good collaterals no longer destroy both hemispheres,
    // their herniation being central, with no secondary infarcts: V1-4)
    useApp.setState({ occlusions: both('ica_terminal_r', 'ica_terminal_l'), collateral: 'good', rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const nihss = container.querySelector('.outcome-nihss') as HTMLElement;
    const danger = nihss.querySelector('.callout.danger') as HTMLElement;
    expect(danger.textContent).toBe(OUTCOME_UI['zh-TW'].fatalBilateral);
    expect(nihss.textContent).not.toContain('存活者多數仍可達 mRS 0–4');
    expect(nihss.querySelector('.callout.warn')).toBeNull();
    within(nihss).getByText('3 個月（假如存活）');
    cleanup();
    useApp.setState({ lang: 'en' });
    const en = render(<RightPanel sim={simOf()} />);
    const n2 = en.container.querySelector('.outcome-nihss') as HTMLElement;
    expect(n2.textContent).toContain(OUTCOME_UI.en.fatalBilateral);
    expect(n2.textContent).not.toContain('most survivors still reach mRS 0–4');
    cleanup();
    // decompressed, the two infarcted territories do not herniate: the survivor's note alone
    useApp.setState({ occlusions: both('ica_terminal_r', 'ica_terminal_l'), decompression: true, lang: 'zh-TW' });
    const dec = render(<RightPanel sim={simOf()} />);
    const n3 = dec.container.querySelector('.outcome-nihss') as HTMLElement;
    expect(n3.querySelector('.callout.danger')).toBeNull();
    expect((n3.querySelector('.callout.warn') as HTMLElement).textContent).toBe(OUTCOME_UI['zh-TW'].survival.bilateral_hemispheres);
    within(n3).getByText('6 個月（假如存活）');
  });

  // V1-4: both cervical ICAs swell alike and herniate downward: not the figures and the survivors of one hemisphere
  it('two hemispheres herniating downward together: their own note, not one hemisphere\'s outcome of survivors', () => {
    useApp.setState({
      occlusions: [
        { vessel: 'ica_cervical_r', severity: 1 },
        { vessel: 'ica_cervical_l', severity: 1 },
      ],
      collateral: 'good',
      rightTab: 'final',
    });
    const { container } = render(<RightPanel sim={simOf()} />);
    const nihss = container.querySelector('.outcome-nihss') as HTMLElement;
    expect((nihss.querySelector('.callout.danger') as HTMLElement).textContent).toBe(OUTCOME_UI['zh-TW'].fatalCentral);
    expect(nihss.textContent).not.toContain('存活者多數仍可達 mRS 0–4');
    within(nihss).getByText('3 個月（假如存活）');
    cleanup();
    useApp.setState({ lang: 'en' });
    const en = render(<RightPanel sim={simOf()} />);
    const n2 = en.container.querySelector('.outcome-nihss') as HTMLElement;
    expect(n2.textContent).toContain(OUTCOME_UI.en.fatalCentral);
    expect(n2.textContent).not.toContain('most survivors still reach mRS 0–4');
  });

  // Y3-11: a locked-in syndrome is not "usually fatal", but its 3- and 6-month NIHSS is a survivor's
  it('a locked-in syndrome: a lighter caveat with its own mortality, and the NIHSS as if the patient survives', () => {
    useApp.getState().loadScenario('basilar_mid');
    useApp.setState({ rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const nihss = container.querySelector('.outcome-nihss') as HTMLElement;
    const callout = within(nihss).getByText(/139/);
    expect(callout.className).toContain('warn');
    expect(callout.textContent).toContain('60%');
    expect(nihss.querySelector('.callout.danger')).toBeNull();
    within(nihss).getByText('6 個月（假如存活）');
  });
});

// Z2-10: the bottleneck tag names where both sides were cut together
describe('最終 tab: the bottleneck tag names the site', () => {
  const tags = (id: string, lang: 'zh-TW' | 'en') => {
    useApp.getState().loadScenario(id);
    useApp.setState({ rightTab: 'final', lang });
    const { container } = render(<RightPanel sim={simOf()} />);
    const out = [...container.querySelectorAll('.outcome-deficits .rec-tag')].map((t) => t.textContent ?? '');
    cleanup();
    return out;
  };
  it('top of the basilar: the cerebral peduncles, not the ventral pons', () => {
    expect(tags('basilar_tip', 'en')).toContain('midbrain-peduncle bottleneck');
    expect(tags('basilar_tip', 'en').join(' ')).not.toMatch(/ventral-pons/);
    expect(tags('basilar_tip', 'zh-TW')).toContain('大腦腳瓶頸');
    expect(tags('basilar_tip', 'zh-TW').join(' ')).not.toMatch(/腹側橋腦/);
  });
  it('locked-in: the ventral pons', () => {
    expect(tags('basilar_mid', 'en')).toContain('ventral-pons bottleneck');
    expect(tags('basilar_mid', 'zh-TW')).toContain('腹側橋腦瓶頸');
  });
});

describe('最終 tab: problems after stroke (population figures)', () => {
  const TITLE = '中風後的其他問題';
  const section = (c: HTMLElement) => c.querySelector('.outcome-risks') as HTMLElement | null;
  const riskNames = POST_STROKE_RISKS.map((r) => r.name.zh);

  it('lists every risk for an infarct, with the explanation line, the figure and its sources', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const box = section(container)!;
    expect(box).not.toBeNull();
    within(box).getByRole('heading', { name: TITLE });
    within(box).getByText(/模型無法預測這個病例會不會發生/);
    expect(box.querySelectorAll('.risk-item')).toHaveLength(POST_STROKE_RISKS.length);
    const dep = box.querySelector('[data-risk="depression"]') as HTMLElement;
    within(dep).getByText('中風後憂鬱');
    within(dep).getByText('約 31%（95% CI 28–35%）');
    const cite = dep.querySelector('cite')!;
    expect(cite.textContent).toMatch(/^來源：/);
    for (const s of POST_STROKE_RISKS.find((r) => r.id === 'depression')!.sources) expect(cite.textContent).toContain(s);
    // the factors are behind a disclosure
    expect(within(dep).getByText('相關因素與病灶位置').tagName).toBe('SUMMARY');
    expect(dep.querySelector('details')!.textContent).toMatch(/Carson 2000/);
    // grouped under headings, in the order of the systems
    // (C6-F3: the movement disorders, about 1 %, under their own heading; C10-F4/F6: falls and
    // shoulder pain under movement, incontinence under bladder control, then infections and a
    // recurrent stroke, which belong to no one function)
    expect([...box.querySelectorAll('.risk-group h4')].map((h) => h.textContent)).toEqual([
      '動作',
      '認知',
      '情緒與動機',
      '睡眠、精神與體力',
      '膀胱控制',
      '感染與再次中風',
    ]);
  });

  it('in English too', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final', lang: 'en' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const box = section(container)!;
    within(box).getByRole('heading', { name: 'Other problems after stroke' });
    within(box).getByText('about 31 % (95% CI 28–35 %)');
    within(box).getByText(/cannot predict whether this case will develop them/);
  });

  // R3-7: a figure from one selected cohort is not shown as a rate for all stroke survivors
  it('names the population of a single-cohort figure instead of "of stroke survivors"', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final' });
    const zh = render(<RightPanel sim={simOf()} />);
    let box = section(zh.container)!;
    within(box).getByText(/來自系統性回顧、中風登錄與單一世代研究/);
    const prev = (id: string) => (box.querySelector(`[data-risk="${id}"] .risk-prev`) as HTMLElement).textContent;
    expect(prev('falls')).toContain('的 60 歲以上、出院回家時留有失能的病人（單一世代）');
    expect(prev('falls')).not.toContain('的中風存活者');
    expect(prev('infections')).toContain('的住院病人（單一世代）');
    expect(prev('infections')).not.toContain('的中風存活者');
    expect(prev('depression')).toContain('的中風存活者');
    cleanup();

    useApp.setState({ lang: 'en' });
    const en = render(<RightPanel sim={simOf()} />);
    box = section(en.container)!;
    within(box).getByText(/from systematic reviews, stroke registries and single cohorts/);
    expect(prev('falls')).toContain('of people aged 60 or over who went home with residual disability (one cohort)');
    expect(prev('falls')).not.toContain('of stroke survivors');
    expect(prev('infections')).toContain('of patients in hospital (one cohort)');
    expect(prev('depression')).toContain('of stroke survivors');
  });

  it('does not appear for a TIA that leaves nothing', () => {
    useApp.getState().loadScenario('tia_l_mca');
    useApp.setState({ rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    screen.getByText('沒有留下症狀。');
    expect(section(container)).toBeNull();
    expect(screen.queryByText(TITLE)).toBeNull();
    for (const n of riskNames) expect(screen.queryByText(n)).toBeNull();
  });

  it('never enters the deficit counts, the NIHSS or the 此刻 symptoms', () => {
    useApp.getState().loadScenario('l_m1');
    useApp.setState({ rightTab: 'final' });
    const { container } = render(<RightPanel sim={simOf()} />);
    const six = at6m();
    const deficits = container.querySelector('.outcome-deficits') as HTMLElement;
    expect(deficits.querySelectorAll('.outcome-group li')).toHaveLength(six.symptoms.length);
    const counted = [...deficits.querySelectorAll('.outcome-group h4 .num')].reduce((a, n) => a + Number(n.textContent), 0);
    expect(counted).toBe(six.symptoms.length);
    expect(section(deficits)).toBeNull();
    const nihss = container.querySelector('.outcome-nihss')!.textContent!;
    for (const n of riskNames) {
      expect(deficits.textContent).not.toContain(n);
      expect(nihss).not.toContain(n);
    }
    cleanup();

    // 此刻 at the 6-month stop: the case's symptoms only
    useApp.setState({ rightTab: 'now', tIndex: TIME_STOPS.length - 1 });
    const now = render(<RightPanel sim={simOf()} />);
    expect(section(now.container)).toBeNull();
    expect(now.container.textContent).not.toContain(TITLE);
    // (the signs that cannot be examined are listed apart, W1-6: l_m1 keeps a Wernicke aphasia that
    // leaves too little comprehension to test reading and writing)
    const items = [...now.container.querySelectorAll('.sym-group:not(.unexaminable) li')];
    expect(items).toHaveLength(simOf().symptoms.length);
    const listed = items.map((li) => li.textContent).join('\n');
    for (const n of riskNames) expect(listed).not.toContain(n);
  });
});

// W3-8: an anterior spinal artery occlusion leaves a 2 mL infarct of the upper cervical cord: the
// final infarct counts it and says which part it is, the region list agrees, the neuron estimate
// says it is the brain's, and the late course has the cord's own event
describe('W3-8: the Outcome of a spinal cord infarct', () => {
  it.each(['zh-TW', 'en'] as const)('%s: the final infarct counts the cord and names it, beside the cord in the region list', (lang) => {
    useApp.setState({ occlusions: [{ vessel: 'asa', severity: 1 }], rightTab: 'final', lang });
    const { container } = render(<RightPanel sim={simOf()} />);
    const o = OUTCOME_UI[lang];
    const stats = container.querySelector('.stat-row')!.textContent ?? '';
    expect(stats).toContain(`${fmtMl(2)}`);
    expect(stats).toContain(o.finalCordNote(fmtMl(2)));
    expect(stats).toContain(o.neuronsLostBrain);
    const list = container.querySelector('.region-list')!.textContent ?? '';
    expect(list).toContain(regionName(REGION_BY_ID.cervical_cord, lang));
    expect(container.textContent).not.toContain(o.lateNone);
  });
});
