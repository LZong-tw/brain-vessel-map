// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SimResult } from '../engine/simulate';
import { SLICES } from '../i18n/slices';
import type { Lang } from '../anatomy/types';
import { loadSlices, type SliceData } from '../scene/sliceData';
import { SliceView } from './SliceView';

vi.mock('../scene/sliceData', async (original) => ({ ...await original<typeof import('../scene/sliceData')>(), loadSlices: vi.fn() }));
const data: SliceData = {
  manifest: { version: 1, dimensions: [2, 3, 4], spacingMm: [1, 1, 1], originMm: [0, 0, 0], ordering: 'x-fastest',
    t1: { offset: 0, type: 'u8' }, territory: { offset: 24, type: 'u8' }, bed: { offset: 48, type: 'u16' },
    beds: ['fixture'], territories: [{ id: 1, name: 'Left MCA frontal', code: 'MCAF', side: 'l', color: [0, 180, 255] }], sources: [{ title: 'Liu atlas', url: 'https://example.com/atlas-fixture' }], bedMapping: 'existing-voxel-bed-assignment' },
  t1: new Uint8Array(24).fill(100), territory: new Uint8Array(24).fill(1), bed: new Uint16Array(24).fill(1),
};
const sim = { beds: { fixture: { infarct: 0.25 } } } as Pick<SimResult, 'beds'>;
const putImageData = vi.fn();
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData } as unknown as CanvasRenderingContext2D);
  vi.mocked(loadSlices).mockResolvedValue(data);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); putImageData.mockClear(); });

describe('accessible reference slice view', () => {
  it.each(['zh-TW', 'en', 'zh-CN', 'de', 'ja'] as Lang[])('renders every UI key and spatial limitations in %s', (lang) => {
    expect(Object.keys(SLICES[lang]).sort()).toEqual(Object.keys(SLICES.en).sort());
    expect(Object.values(SLICES[lang]).every((value) => value.trim().length > 0)).toBe(true);
    render(<SliceView lang={lang} sim={sim} data={data} />);
    expect(screen.getByText(SLICES[lang].limitation)).toBeTruthy();
    expect(screen.getByText(SLICES[lang].fallback)).toBeTruthy();
    expect(screen.getByRole('img', { name: SLICES[lang].image }).tabIndex).toBe(0);
    expect(screen.getByText('25.0%')).toBeTruthy();
    expect(screen.getByText(`${SLICES[lang].left} MCAF`)).toBeTruthy();
    expect(screen.queryByText('Left MCA frontal')).toBeNull();
  });
  it('supports plane selection, slice slider, canvas keyboard navigation and bounded Home/End', () => {
    render(<SliceView lang="en" sim={sim} data={data} />);
    const image = screen.getByRole('img'); const slider = screen.getByRole('slider') as HTMLInputElement;
    fireEvent.keyDown(image, { key: 'Home' }); expect(slider.value).toBe('0');
    fireEvent.keyDown(image, { key: 'ArrowUp' }); expect(slider.value).toBe('1');
    fireEvent.keyDown(image, { key: 'End' }); expect(slider.value).toBe('3');
    fireEvent.keyDown(image, { key: 'ArrowRight' }); expect(slider.value).toBe('3');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'coronal' } }); expect(slider.max).toBe('2');
    fireEvent.change(slider, { target: { value: '0' } }); expect(slider.value).toBe('0');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'sagittal' } }); expect(slider.max).toBe('1');
  });
  it('toggles outlines independently from the continuous fraction heatmap and responds to new simulation fractions', () => {
    const view = render(<SliceView lang="en" sim={sim} data={data} />);
    fireEvent.click(screen.getByRole('checkbox', { name: SLICES.en.outlines }));
    view.rerender(<SliceView lang="en" sim={{ beds: { fixture: { infarct: 0.01 } } } as Pick<SimResult, 'beds'>} data={data} />);
    expect(screen.getByText('1.0%')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: SLICES.en.heatmap }));
    expect(putImageData).toHaveBeenCalled();
  });
  it('loads assets, reports failure and retries', async () => {
    vi.mocked(loadSlices).mockRejectedValueOnce(new Error('network'));
    render(<SliceView lang="en" sim={sim} />);
    expect(screen.getByRole('status')).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(SLICES.en.error));
    fireEvent.click(screen.getByRole('button', { name: SLICES.en.retry }));
    await waitFor(() => expect(screen.getByRole('img')).toBeTruthy());
  });
  it('explains missing browser gzip support explicitly', async () => {
    vi.mocked(loadSlices).mockRejectedValueOnce(new Error('Slice decompression unsupported'));
    render(<SliceView lang="ja" sim={sim} />);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(SLICES.ja.unsupported));
  });
});
