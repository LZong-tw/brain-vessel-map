// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Lang } from '../anatomy/types';
import { SCENARIOS } from '../anatomy/scenarios';
import { tr } from '../anatomy';
import { simulate } from '../engine/simulate';
import { CASE_UI } from '../i18n/uiCase';
import { OUTCOME_UI } from '../i18n/uiOutcome';
import { LANGUAGE_LABELS } from '../i18n/locales';
import { useApp } from '../state/store';
import { TopBar } from './TopBar';
import { LeftPanel } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { Modals } from './Modals';
import { WillisDiagram } from './diagrams/WillisDiagram';
import { BrainstemSections } from './diagrams/BrainstemSections';

const sim = simulate({ occlusions: [], variants: [], map: 90, collateral: 'moderate', tH: 0, reperfusionH: null, decompression: false });
const languages: { lang: Lang; title: string; ventricle: string; about: string; midbrain: string; tract: string }[] = [
  { lang: 'zh-CN', title: '脑血管互动地图', ventricle: '脑室系统', about: '模型如何运作', midbrain: '中脑（上丘平面）', tract: '皮质脊髓束' },
  { lang: 'de', title: 'Interaktive Hirngefäßkarte', ventricle: 'Ventrikelsystem', about: 'Wie das Modell funktioniert', midbrain: 'Mittelhirn (Höhe des Colliculus superior)', tract: 'Tractus corticospinalis' },
  { lang: 'ja', title: '脳血管インタラクティブマップ', ventricle: '脳室系', about: 'モデルの仕組み', midbrain: '中脳（上丘の高さ）', tract: '皮質脊髄路' },
];

beforeEach(() => {
  useApp.getState().resetAll();
  useApp.setState({ lang: 'en', modal: 'none', selected: null, leftTab: 'case', rightTab: 'details' });
  localStorage.removeItem('bvm.lang');
});
afterEach(cleanup);

describe.each(languages)('$lang interface', ({ lang, title, ventricle, about, midbrain, tract }) => {
  it('selects and persists the language through the accessible menu', () => {
    render(<TopBar />);
    const menu = screen.getByRole('combobox', { name: 'Language' });
    expect(within(menu).getAllByRole('option').map((o) => (o as HTMLOptionElement).value)).toEqual(['zh-TW', 'zh-CN', 'en', 'de', 'ja']);
    fireEvent.change(menu, { target: { value: lang } });
    expect(useApp.getState().lang).toBe(lang);
    expect(localStorage.getItem('bvm.lang')).toBe(lang);
    screen.getByRole('heading', { name: title });
    screen.getByRole('combobox', { name: LANGUAGE_LABELS[lang] });
  });

  it('renders all three case cards in the selected language', () => {
    useApp.setState({ lang });
    render(<LeftPanel sim={sim} />);
    for (const name of [CASE_UI[lang].conditionsTitle, CASE_UI[lang].eventsTitle, CASE_UI[lang].treatmentTitle]) {
      screen.getByRole('region', { name });
    }
    expect(screen.queryByRole('region', { name: CASE_UI.en.eventsTitle })).toBeNull();
  });

  it('renders every template title and description without a content fallback', () => {
    useApp.setState({ lang, leftTab: 'scenarios' });
    const { container } = render(<LeftPanel sim={sim} />);
    const cards = [...container.querySelectorAll('.scenario-card')];
    expect(cards).toHaveLength(SCENARIOS.length);
    for (const scenario of SCENARIOS) {
      screen.getByText(tr(scenario.title, lang));
      screen.getByText(tr(scenario.summary, lang));
    }
  });

  it('localizes non-perfused anatomical structure details and panel tabs', () => {
    useApp.setState({ lang, selected: { kind: 'structure', id: 'ventricles' } });
    render(<RightPanel sim={sim} />);
    screen.getByRole('heading', { name: ventricle });
    for (const name of [OUTCOME_UI[lang].tabNow, OUTCOME_UI[lang].tabFinal, OUTCOME_UI[lang].tabDetails]) screen.getByRole('button', { name });
    expect(screen.queryByRole('heading', { name: 'Ventricles' })).toBeNull();
  });

  it('localizes the methods modal while preserving data licence identifiers', () => {
    useApp.setState({ lang, modal: 'about' });
    render(<Modals />);
    const dialog = screen.getByRole('dialog');
    within(dialog).getByRole('heading', { name: about });
    expect(dialog.textContent).toContain('CC BY-SA 4.0');
    expect(dialog.textContent).toMatch(/MNI[ -]ICBM152/);
    expect(within(dialog).queryByRole('heading', { name: 'How the model works' })).toBeNull();
  });

  it('does not infer an emergency telephone number from the language', () => {
    useApp.setState({ lang, modal: 'disclaimer' });
    const { container } = render(<Modals />);
    expect(container.querySelector('.emergency-box strong')?.textContent).toBe(lang === 'zh-CN' ? '急救' : lang === 'de' ? 'Notruf' : '救急');
    expect(container.querySelector('.emergency-box')?.textContent).not.toContain('119');
  });

  it('localizes diagrams and hover anatomy while preserving conventional abbreviations', () => {
    useApp.setState({ lang });
    const { container } = render(<><WillisDiagram sim={sim} /><BrainstemSections sim={sim} /></>);
    screen.getByRole('img', { name: midbrain });
    expect(container.textContent).toContain('AComm');
    expect(container.textContent).toContain('CST');
    fireEvent.mouseEnter(container.querySelector('g.struct')!);
    expect(container.querySelector('.diagram-tip')?.textContent).toContain(tract);
    expect(container.querySelectorAll('text.dir')[0]?.textContent).toBe(lang === 'de' ? 'R' : '右');
  });
});
