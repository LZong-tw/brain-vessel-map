// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Lang } from '../anatomy/types';
import { PATHOLOGY_UI } from '../i18n/vascularPathologies';
import { VascularPathologies } from './VascularPathologies';

afterEach(cleanup);
const s = PATHOLOGY_UI.en;
function open() {
  render(<VascularPathologies lang="en" />);
  fireEvent.click(screen.getByText(s.title));
}
function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
it.each(['en', 'zh-TW', 'zh-CN', 'de', 'ja'] as Lang[])('translates every key in %s and displays assumptions', lang => {
  const catalog = PATHOLOGY_UI[lang];
  expect(Object.keys(catalog).sort()).toEqual(Object.keys(s).sort());
  for (const key of Object.keys(s) as (keyof typeof s)[]) {
    expect(catalog[key].trim()).not.toBe('');
    if (lang !== 'en') expect(catalog[key]).not.toBe(s[key]);
  }
  render(<VascularPathologies lang={lang} />);
  expect(screen.getByText(catalog.title).closest('details')?.open).toBe(false);
  fireEvent.click(screen.getByText(catalog.title));
  for (const key of ['caseUnchanged', 'venousCaveat', 'outletNote', 'ratioCaveat', 'caveat', 'pressureNote'] as const) expect(screen.getByText(catalog[key])).toBeTruthy();
  expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['https://doi.org/10.1186/s12883-015-0352-y', 'https://doi.org/10.3171/jns.1978.48.3.0332']);
});
it('starts with no invented clinical inputs and only normalized radius references', () => {
  open();
  const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
  expect(inputs.filter(input => input.value === '')).toHaveLength(7);
  expect(inputs.filter(input => input.value === '1')).toHaveLength(8);
  for (const button of screen.getAllByRole('button')) expect((button as HTMLButtonElement).disabled).toBe(true);
});
it('reroutes flow through an open outlet and refuses a disconnected imposed flow', () => {
  open();
  const form = within(screen.getByRole('form', { name: s.venousTitle }));
  fill(`${s.flow} (mL/min)`, '600'); fill(s.deepFraction, '0.2'); fill(`${s.outletPressure} (mmHg)`, '4');
  fireEvent.click(form.getByRole('button'));
  expect(form.getAllByText('300.000 mL/min')).toHaveLength(2);
  fill(s.tsLeft, '0');
  expect(form.getByRole('status').textContent).toBe('');
  fireEvent.click(form.getByRole('button'));
  expect(form.getByText('0.000 mL/min')).toBeTruthy();
  expect(form.getByText('600.000 mL/min')).toBeTruthy();
  fill(s.tsRight, '0'); fireEvent.click(form.getByRole('button'));
  expect(form.getByRole('status').textContent).toBe(s.disconnected);
  fill(s.tsRight, '');
  expect((form.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  fill(s.tsRight, '0'); fill(`${s.flow} (mL/min)`, '0'); fireEvent.click(form.getByRole('button'));
  expect(form.getByRole('status').textContent).toContain(s.undetermined);
  expect(form.queryByText(/mmHg$/)).toBeNull();
});
it('uses observed volume and explicit PVI, preserves negative CPP, and reports overflow', () => {
  open();
  const form = within(screen.getByRole('form', { name: s.hemorrhageTitle }));
  fill(`${s.addedVolume} (mL)`, '0'); fill(`${s.baselineIcp} (mmHg)`, '10'); fill(`${s.pvi} (mL)`, '20'); fill(`${s.map} (mmHg)`, '90');
  fireEvent.click(form.getByRole('button'));
  expect(form.getByText('10.000 mmHg')).toBeTruthy(); expect(form.getByText('80.000 mmHg')).toBeTruthy();
  fill(`${s.addedVolume} (mL)`, '20'); fireEvent.click(form.getByRole('button'));
  expect(form.getByText('100.000 mmHg')).toBeTruthy(); expect(form.getByText('-10.000 mmHg')).toBeTruthy();
  fill(`${s.pvi} (mL)`, ''); expect(form.getByRole('status').textContent).toBe('');
  expect((form.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  fill(`${s.pvi} (mL)`, '20'); fill(`${s.addedVolume} (mL)`, '100000'); fireEvent.click(form.getByRole('button'));
  expect(form.getByRole('status').textContent).toBe(s.overflow);
});
