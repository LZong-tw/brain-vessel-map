// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Lang } from '../anatomy/types';
import { ichExpansionRisk } from '../engine/ichExpansion';
import { simulate } from '../engine/simulate';
import { ICH_EXPANSION } from '../i18n/ichExpansion';
import { useApp } from '../state/store';
import { HemorrhageRisk, ICH_EXPANSION_SOURCE } from './HemorrhageRisk';
import { RightPanel } from './RightPanel';

afterEach(cleanup);
const open = (lang: Lang = 'en') => {
  const view = render(<HemorrhageRisk lang={lang} />);
  fireEvent.click(screen.getByText(ICH_EXPANSION[lang].title));
  return view;
};
const fill = () => {
  fireEvent.change(screen.getByLabelText(ICH_EXPANSION.en.volume), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText(ICH_EXPANSION.en.time), { target: { value: '2' } });
  fireEvent.change(screen.getByLabelText(ICH_EXPANSION.en.antiplatelet), { target: { value: 'no' } });
  fireEvent.change(screen.getByLabelText(ICH_EXPANSION.en.anticoagulant), { target: { value: 'no' } });
  fireEvent.click(screen.getByLabelText(ICH_EXPANSION.en.eligible));
};

describe('separate educational ICH expansion calculator', () => {
  it.each(['zh-TW', 'en', 'zh-CN', 'de', 'ja'] as Lang[])('%s: every UI key is translated and inputs have no default measurements', (lang) => {
    open(lang);
    expect(Object.keys(ICH_EXPANSION[lang]).sort()).toEqual(Object.keys(ICH_EXPANSION.en).sort());
    for (const key of Object.keys(ICH_EXPANSION.en) as (keyof typeof ICH_EXPANSION.en)[]) {
      expect(ICH_EXPANSION[lang][key].trim()).not.toBe('');
      if (lang !== 'en') expect(ICH_EXPANSION[lang][key]).not.toBe(ICH_EXPANSION.en[key]);
    }
    for (const input of screen.getAllByRole('spinbutton')) expect((input as HTMLInputElement).value).toBe('');
    for (const select of screen.getAllByRole('combobox')) expect((select as HTMLSelectElement).value).toBe('');
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('button', { name: ICH_EXPANSION[lang].calculate }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('link', { name: ICH_EXPANSION[lang].source }).getAttribute('href')).toBe(ICH_EXPANSION_SOURCE);
  });
  it('shows the four-predictor probability only after explicit complete eligible input', () => {
    open(); fill();
    fireEvent.click(screen.getByRole('button', { name: ICH_EXPANSION.en.calculate }));
    const expected = ichExpansionRisk({ baselineVolumeMl: 10, onsetToImagingHours: 2, antiplatelet: false, anticoagulant: false, eligiblePopulation: true })!;
    expect(screen.getByRole('status').textContent).toContain(`${(expected * 100).toFixed(1)}%`);
    expect(screen.getByRole('status').textContent).toContain(ICH_EXPANSION.en.result);
    expect(screen.getByText(ICH_EXPANSION.en.limitation)).toBeTruthy();
    expect(screen.getByRole('status').textContent).not.toMatch(/24.hour/i);
  });
  it.each(['antiplatelet', 'anticoagulant'] as const)('unknown %s history clears the estimate and disables calculation', (key) => {
    open(); fill(); fireEvent.click(screen.getByRole('button', { name: ICH_EXPANSION.en.calculate }));
    fireEvent.change(screen.getByLabelText(ICH_EXPANSION.en[key]), { target: { value: '' } });
    expect(screen.getByRole('status').textContent).toBe('');
    expect((screen.getByRole('button', { name: ICH_EXPANSION.en.calculate }) as HTMLButtonElement).disabled).toBe(true);
  });
  it.each([['volume', '0'], ['volume', '150'], ['volume', '-1'], ['time', '0.49'], ['time', '24.01']] as const)('rejects %s = %s without a probability', (key, value) => {
    open(); fill(); fireEvent.change(screen.getByLabelText(ICH_EXPANSION.en[key]), { target: { value } });
    expect((screen.getByRole('button', { name: ICH_EXPANSION.en.calculate }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.submit(screen.getByRole('form'));
    expect(screen.getByRole('status').textContent).toBe('');
  });
  it.each(['0.5', '24'])('accepts the source imaging-window endpoint %s hours', (value) => {
    open(); fill(); fireEvent.change(screen.getByLabelText(ICH_EXPANSION.en.time), { target: { value } });
    expect((screen.getByRole('button', { name: ICH_EXPANSION.en.calculate }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('requires population eligibility and clears a previous estimate on any input change', () => {
    open(); fill(); fireEvent.click(screen.getByRole('button', { name: ICH_EXPANSION.en.calculate }));
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('status').textContent).toBe('');
    expect((screen.getByRole('button', { name: ICH_EXPANSION.en.calculate }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('is collapsed in Details, absent from Now, and does not change simulation state', () => {
    useApp.setState({ lang: 'en', rightTab: 'details', selected: null });
    const sim = simulate({ occlusions: [], variants: [], collateral: 'good', map: 93, tH: 0, reperfusionH: null, decompression: false });
    const view = render(<RightPanel sim={sim} />);
    const summary = screen.getByText(ICH_EXPANSION.en.title);
    expect(summary.closest('details')?.hasAttribute('open')).toBe(false);
    const before = JSON.stringify(useApp.getState());
    fireEvent.click(summary); fill(); fireEvent.click(screen.getByRole('button', { name: ICH_EXPANSION.en.calculate }));
    expect(JSON.stringify(useApp.getState())).toBe(before);
    act(() => useApp.setState({ rightTab: 'now' }));
    view.rerender(<RightPanel sim={sim} />);
    expect(screen.queryByText(ICH_EXPANSION.en.title)).toBeNull();
  });
});
