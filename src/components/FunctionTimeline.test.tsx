// @vitest-environment jsdom
/**
 * Clicking a cell of the function heat-map shows what lies behind it (does not mount the 3D scene).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { REGION_BY_ID, regionName } from '../anatomy';
import { TIME_STOPS } from '../anatomy/timeline';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { FunctionTimeline } from './FunctionTimeline';

afterEach(() => {
  cleanup();
});

const series = TIME_STOPS.map((s) =>
  simulate({ occlusions: [{ vessel: 'mca_m1_l', severity: 1 }], variants: [], map: 93, collateral: 'good', tH: s.h, reperfusionH: null, decompression: false }),
);
const i24 = TIME_STOPS.findIndex((s) => s.h === 24);

describe('function heat-map cell detail', () => {
  it('shows the symptoms, their side and source regions for the clicked cell, and opens a region', () => {
    useApp.setState({ lang: 'zh-TW', tIndex: 0, selected: null, rightTab: 'results' });
    const { container } = render(<FunctionTimeline series={series} />);
    // the motor row's cell at 24 h
    const cell = screen.getByRole('button', { name: new RegExp(`^運動 · ${TIME_STOPS[i24].label.zh}`) });
    fireEvent.click(cell);
    expect(useApp.getState().tIndex).toBe(i24); // the timeline still jumps there

    const box = container.querySelector('.cell-detail') as HTMLElement;
    expect(box).not.toBeNull();
    within(box).getByText(/運動 · 1 天/);
    within(box).getAllByText(/右側/); // a left M1 weakens the right side
    // only real changes get a badge; "unchanged" on every line would be noise
    expect(within(box).queryByText('與前一時間點相同')).toBeNull();

    // a source region is a link that opens that region's details
    const armSource = series[i24].symptoms.find((s) => s.id === 'arm_weak' && s.side === 'r')!.sources[0];
    fireEvent.click(within(box).getAllByRole('button', { name: regionName(REGION_BY_ID[armSource], 'zh-TW') })[0]);
    expect(useApp.getState().selected).toEqual({ kind: 'region', id: armSource });
    expect(useApp.getState().rightTab).toBe('details');
  });

  it('is keyboard-accessible and can be closed', () => {
    useApp.setState({ lang: 'en', tIndex: 0 });
    const { container } = render(<FunctionTimeline series={series} />);
    const cell = screen.getByRole('button', { name: /^Motor · 1 day/ });
    fireEvent.keyDown(cell, { key: 'Enter' });
    expect(container.querySelector('.cell-detail')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(container.querySelector('.cell-detail')).toBeNull();
  });
});
