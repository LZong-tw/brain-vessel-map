// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { SymptomItem } from '../engine/clinical';
import { symptomNihssPoints } from '../engine/clinical';
import type { Lang } from '../anatomy/types';
import { DEFICIT_SEVERITY } from '../i18n/deficitSeverity';
import { DeficitSeverity } from './DeficitSeverity';

vi.mock('../engine/clinical', async (original) => ({ ...await original<typeof import('../engine/clinical')>(), symptomNihssPoints: vi.fn(() => 1) }));
const symptom: SymptomItem = { id: 'arm_weak', side: 'l', sev: 2, continuousSeverity: 1.25, sources: [], delayed: false };
afterEach(() => { cleanup(); vi.mocked(symptomNihssPoints).mockReset().mockReturnValue(1); });

describe('continuous model deficit severity', () => {
  it.each(['zh-TW', 'en', 'zh-CN', 'de', 'ja'] as Lang[])('localizes all labels and scale caveats in %s', (lang) => {
    expect(Object.keys(DEFICIT_SEVERITY[lang]).sort()).toEqual(Object.keys(DEFICIT_SEVERITY.en).sort());
    expect(Object.values(DEFICIT_SEVERITY[lang]).every((text) => text.length > 0)).toBe(true);
    if (lang !== 'en') for (const key of Object.keys(DEFICIT_SEVERITY.en) as (keyof typeof DEFICIT_SEVERITY.en)[]) expect(DEFICIT_SEVERITY[lang][key]).not.toBe(DEFICIT_SEVERITY.en[key]);
    render(<DeficitSeverity symptom={symptom} lang={lang} />);
    const meter = screen.getByRole('meter', { name: DEFICIT_SEVERITY[lang].model });
    expect(meter.getAttribute('value')).toBe('1.25');
    expect(meter.getAttribute('max')).toBe('3');
    expect(meter.getAttribute('aria-valuetext')).toBe('1.25/3');
    expect(screen.getByText(DEFICIT_SEVERITY[lang].note)).toBeTruthy();
    expect(screen.getByText(`${DEFICIT_SEVERITY[lang].item}:`, { exact: false })).toBeTruthy();
  });
  it('changes continuously while legacy ordinal severity stays the same', () => {
    const view = render(<DeficitSeverity symptom={symptom} lang="en" />);
    view.rerender(<DeficitSeverity symptom={{ ...symptom, continuousSeverity: 1.26 }} lang="en" />);
    expect(screen.getByRole('meter').getAttribute('value')).toBe('1.26');
    expect(screen.getByText('1.26/3')).toBeTruthy();
  });
  it('uses legacy ordinal severity when continuous data is absent or invalid and bounds model values', () => {
    const view = render(<DeficitSeverity symptom={{ ...symptom, continuousSeverity: undefined }} lang="en" />);
    expect(screen.getByRole('meter').getAttribute('value')).toBe('2');
    view.rerender(<DeficitSeverity symptom={{ ...symptom, continuousSeverity: NaN }} lang="en" />);
    expect(screen.getByRole('meter').getAttribute('value')).toBe('2');
    view.rerender(<DeficitSeverity symptom={{ ...symptom, continuousSeverity: 4 }} lang="en" />);
    expect(screen.getByRole('meter').getAttribute('value')).toBe('3');
  });
  it('omits NIHSS points for unexaminable symptoms and symptoms without a scored item', () => {
    const view = render(<DeficitSeverity symptom={symptom} lang="en" unexaminable />);
    expect(screen.queryByText(`${DEFICIT_SEVERITY.en.item}:`, { exact: false })).toBeNull();
    expect(screen.getByText(DEFICIT_SEVERITY.en.unexaminable)).toBeTruthy();
    expect(symptomNihssPoints).not.toHaveBeenCalled();
    vi.mocked(symptomNihssPoints).mockReturnValue(null);
    view.rerender(<DeficitSeverity symptom={symptom} lang="en" />);
    expect(screen.queryByText(`${DEFICIT_SEVERITY.en.item}:`, { exact: false })).toBeNull();
  });
});
