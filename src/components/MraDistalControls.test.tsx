// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { Lang } from '../anatomy/types';
import { MRA_DISTAL } from '../i18n/mraDistal';
import { MraDistalControls } from './MraDistalControls';

afterEach(cleanup);
const props = { enabled: true, active: true, error: false, selected: null, change: vi.fn(), choose: vi.fn(), retry: vi.fn(), cameraKey: vi.fn(), focus: vi.fn() };
it.each(['en', 'zh-TW', 'zh-CN', 'de', 'ja'] as Lang[])('translates every key and labels unmapped anatomy in %s', lang => {
  const s = MRA_DISTAL[lang];
  expect(Object.keys(s).sort()).toEqual(Object.keys(MRA_DISTAL.en).sort());
  for (const key of Object.keys(s) as (keyof typeof s)[]) { expect(s[key].trim()).not.toBe(''); if (lang !== 'en') expect(s[key]).not.toBe(MRA_DISTAL.en[key]); }
  render(<MraDistalControls {...props} lang={lang} />);
  expect(screen.getByText(s.notice)).toBeTruthy();
  expect(within(screen.getByRole('group', { name: s.families })).getAllByRole('button')).toHaveLength(7);
  expect(screen.getByRole('link', { name: s.source }).getAttribute('href')).toContain('bravissima');
});
it('supports family focus, selection, clearing, and independent camera keys', () => {
  const choose = vi.fn(), focus = vi.fn(), cameraKey = vi.fn();
  render(<MraDistalControls {...props} lang="en" choose={choose} focus={focus} cameraKey={cameraKey} />);
  const buttons = within(screen.getByRole('group', { name: MRA_DISTAL.en.families })).getAllByRole('button');
  buttons[0].focus(); fireEvent.keyDown(buttons[0], { key: 'ArrowDown' });
  expect(document.activeElement).toBe(buttons[1]); expect(focus).toHaveBeenLastCalledWith(2);
  fireEvent.keyDown(buttons[1], { key: 'Enter' }); expect(choose).toHaveBeenLastCalledWith(2);
  fireEvent.keyDown(buttons[1], { key: 'Escape' }); expect(choose).toHaveBeenLastCalledWith(null);
  fireEvent.keyDown(screen.getByRole('button', { name: MRA_DISTAL.en.camera }), { key: 'ArrowLeft' });
  expect(cameraKey).toHaveBeenCalledWith('ArrowLeft');
  choose.mockClear(); focus.mockClear();
  fireEvent.keyDown(screen.getByRole('button', { name: MRA_DISTAL.en.camera }), { key: 'Escape' });
  expect(choose).toHaveBeenCalledWith(null); expect(focus).toHaveBeenCalledWith(null);
});
it('omits hidden source families and keeps arrow navigation on the displayed buttons', () => {
  const focus = vi.fn();
  render(<MraDistalControls {...props} lang="en" allowedFamilies={[1, 4, 5, 7]} focus={focus} />);
  expect(screen.queryByRole('button', { name: MRA_DISTAL.en.leftMCA })).toBeNull();
  const buttons = within(screen.getByRole('group', { name: MRA_DISTAL.en.families })).getAllByRole('button');
  expect(buttons).toHaveLength(4);
  buttons[0].focus(); fireEvent.keyDown(buttons[0], { key: 'ArrowDown' });
  expect(document.activeElement).toBe(buttons[1]); expect(focus).toHaveBeenLastCalledWith(4);
});
it('reports loading and retryable errors while retaining the simulation display', () => {
  const retry = vi.fn(), change = vi.fn();
  const view = render(<MraDistalControls {...props} lang="en" active={false} retry={retry} change={change} />);
  expect(screen.getByRole('status').textContent).toBe(MRA_DISTAL.en.loading);
  expect(screen.queryByRole('group', { name: MRA_DISTAL.en.families })).toBeNull();
  view.rerender(<MraDistalControls {...props} lang="en" active={false} error retry={retry} change={change} />);
  expect(screen.getByRole('alert').textContent).toBe(MRA_DISTAL.en.error);
  fireEvent.click(screen.getByRole('button', { name: MRA_DISTAL.en.retry })); expect(retry).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole('checkbox')); expect(change).toHaveBeenCalledWith(false);
});
