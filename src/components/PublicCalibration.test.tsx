// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { Lang } from '../anatomy/types';
import { PUBLIC_CALIBRATION } from '../i18n/publicCalibration';
import { PublicCalibration } from './PublicCalibration';

class FakeWorker {
  static last: FakeWorker;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.last = this; }
}
beforeEach(() => { vi.stubGlobal('Worker', FakeWorker); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('public calibration diagnostic', () => {
  it.each(['en', 'zh-TW', 'zh-CN', 'de', 'ja'] as Lang[])('translates every label and caveat in %s', lang => {
    expect(Object.keys(PUBLIC_CALIBRATION[lang]).sort()).toEqual(Object.keys(PUBLIC_CALIBRATION.en).sort());
    for (const key of Object.keys(PUBLIC_CALIBRATION.en) as (keyof typeof PUBLIC_CALIBRATION.en)[]) {
      expect(PUBLIC_CALIBRATION[lang][key].trim()).not.toBe('');
      if (lang !== 'en') expect(PUBLIC_CALIBRATION[lang][key]).not.toBe(PUBLIC_CALIBRATION.en[key]);
    }
    render(<PublicCalibration lang={lang} />);
    expect(screen.getByText(PUBLIC_CALIBRATION[lang].title).closest('details')?.open).toBe(false);
    fireEvent.click(screen.getByText(PUBLIC_CALIBRATION[lang].title));
    expect(screen.getByText(PUBLIC_CALIBRATION[lang].warning)).toBeTruthy();
    expect(screen.getByText(PUBLIC_CALIBRATION[lang].earlyRejection)).toBeTruthy();
    expect(screen.getByRole('link', { name: PUBLIC_CALIBRATION[lang].earlySource }).getAttribute('href')).toContain('PMC4478123');
    expect(screen.getByRole('link', { name: PUBLIC_CALIBRATION[lang].source }).getAttribute('href')).toContain('106208');
  });
  it('runs outside the UI thread and reports failed fit and baseline mismatch without promoting factors', () => {
    render(<PublicCalibration lang="en" />);
    fireEvent.click(screen.getByText(PUBLIC_CALIBRATION.en.title));
    const button = screen.getByRole('button', { name: PUBLIC_CALIBRATION.en.run });
    fireEvent.click(button);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe(PUBLIC_CALIBRATION.en.running);
    expect(FakeWorker.last.postMessage).toHaveBeenCalledTimes(1);
    act(() => FakeWorker.last.onmessage?.({ data: { result: {
      fits: [{ id: 'neither', targetGrowthMl: 108.2, collateralFactor: 0.819374, growthMl: 81.916233, residualMl: -26.283767, baselineCoreMl: 172.04 }],
      baselineImagingH: 9 + 55 / 60, followupH: 10 + 44 / 60 + 24, referenceBaselineCoreMl: 10.1,
    } } } as MessageEvent));
    expect(screen.getByRole('status').textContent).toBe(PUBLIC_CALIBRATION.en.rejected);
    expect(screen.getByText('-26.284 mL')).toBeTruthy();
    expect(screen.getByText('172.040 mL')).toBeTruthy();
    expect(screen.getByText(PUBLIC_CALIBRATION.en.reference)).toBeTruthy();
    expect(FakeWorker.last.terminate).toHaveBeenCalled();
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });
  it('reports worker errors and terminates on unmount', () => {
    const view = render(<PublicCalibration lang="en" />);
    fireEvent.click(screen.getByText(PUBLIC_CALIBRATION.en.title));
    fireEvent.click(screen.getByRole('button'));
    act(() => FakeWorker.last.onerror?.());
    expect(screen.getByRole('status').textContent).toBe(PUBLIC_CALIBRATION.en.error);
    view.unmount();
    expect(FakeWorker.last.terminate).toHaveBeenCalledTimes(2);
  });
});
