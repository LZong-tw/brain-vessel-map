// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Lang } from '../anatomy/types';
import { MRA_GEOMETRY } from '../i18n/mraGeometry';
import { useApp } from '../state/store';
import { Legend } from './Legend';

afterEach(cleanup);
it.each(['en', 'zh-TW', 'zh-CN', 'de', 'ja'] as Lang[])('labels MRA placement limits even in the folded phone legend in %s', lang => {
  useApp.setState({ lang });
  render(<Legend />);
  const s = MRA_GEOMETRY[lang];
  expect(Object.keys(s).sort()).toEqual(Object.keys(MRA_GEOMETRY.en).sort());
  for (const key of Object.keys(s) as (keyof typeof s)[]) {
    expect(s[key].trim()).not.toBe('');
    if (lang !== 'en') expect(s[key]).not.toBe(MRA_GEOMETRY.en[key]);
  }
  const toggle = screen.getByRole('button');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByText(s.notice)).toBeTruthy();
  fireEvent.click(toggle);
  expect(screen.getByRole('link', { name: s.source }).getAttribute('href')).toBe('https://zenodo.org/records/17358162');
  fireEvent.click(toggle);
  expect(screen.getByText(s.notice)).toBeTruthy();
});
