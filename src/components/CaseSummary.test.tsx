// @vitest-environment jsdom
/**
 * The case in one line above the timeline: what is being simulated is always in view, and
 * pressing it opens the case tab (on a phone, the controls panel too).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VESSEL_BY_ID, vesselName } from '../anatomy';
import { useApp } from '../state/store';
import { CaseSummary } from './CaseSummary';

const BA = vesselName(VESSEL_BY_ID.basilar_mid, 'zh-TW');
const PICA = vesselName(VESSEL_BY_ID.pica_r, 'zh-TW');
const line = () => document.querySelector('.case-line-text')!.textContent;

beforeEach(() => {
  useApp.getState().resetAll();
  useApp.setState({ lang: 'zh-TW', leftTab: 'scenarios', mobilePanel: 'none' });
});
afterEach(() => {
  cleanup();
});

describe('case summary line', () => {
  it('says when no occlusion is set', () => {
    render(<CaseSummary />);
    expect(line()).toBe('尚未設定阻塞 — 從範本開始');
  });

  it('a stacked, treated case, in full in the tooltip', () => {
    useApp.getState().loadScenario('basilar_mid');
    useApp.getState().addScenario('r_pica');
    useApp.getState().setMap(124);
    useApp.getState().setReperfusion(24);
    useApp.getState().setTreatment({ grade: '2b67' });
    render(<CaseSummary />);
    const text = `${BA} + ${PICA} 阻塞 · 側枝良好 · 平均動脈壓 124 · 24 小時再通（取栓 · eTICI 2b67）`;
    expect(line()).toBe(text);
    expect(screen.getByRole('button').getAttribute('title')).toBe(text);
  });

  it('follows the store and the language', () => {
    render(<CaseSummary />);
    act(() => useApp.setState({ lang: 'en', occlusions: [{ vessel: 'pica_r', severity: 0.7 }] }));
    expect(line()).toBe(`Occluded: ${vesselName(VESSEL_BY_ID.pica_r, 'en')} (70% stenosis) · good collaterals · MAP 93 · untreated`);
    screen.getByText('Case');
  });

  it('opens the case tab and, on a phone, the controls panel', () => {
    render(<CaseSummary />);
    fireEvent.click(screen.getByRole('button', { name: /尚未設定阻塞/ }));
    expect(useApp.getState().leftTab).toBe('case');
    expect(useApp.getState().mobilePanel).toBe('left');
  });
});
