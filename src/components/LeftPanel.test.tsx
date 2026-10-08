// @vitest-environment jsdom
/**
 * Component test for the vessel search empty state (does not mount the 3D scene).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { LeftPanel } from './LeftPanel';

afterEach(() => {
  cleanup();
});

const sim = simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 24, reperfusionH: null, decompression: false });

describe('vessel search with no match', () => {
  it('shows a "no vessels match" message with a clear button, and restores the list on clear', () => {
    useApp.setState({ leftTab: 'vessels', lang: 'zh-TW' });
    render(<LeftPanel sim={sim} />);

    // the full list is showing before any search (throws if not found)
    screen.getByText('Willis 環');

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'zzzxxy' } });

    screen.getByText('找不到符合「zzzxxy」的血管');
    expect(screen.queryByText('Willis 環')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '清除搜尋' }));

    expect(screen.queryByText('找不到符合「zzzxxy」的血管')).toBeNull();
    expect((input as HTMLInputElement).value).toBe('');
    screen.getByText('Willis 環');
  });

  it('shows nothing extra while there is a match', () => {
    useApp.setState({ leftTab: 'vessels', lang: 'zh-TW' });
    render(<LeftPanel sim={sim} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'MCA' } });
    expect(screen.queryByText(/找不到符合/)).toBeNull();
  });
});

describe('vessels this anatomy does not have (C8-F7)', () => {
  it('lists the persistent trigeminal artery only when its variant is chosen, and drops an absent AComm', () => {
    useApp.setState({ leftTab: 'vessels', lang: 'en', variants: [] });
    const { unmount } = render(<LeftPanel sim={sim} />);
    expect(screen.queryByText(/persistent trigeminal artery/i)).toBeNull();
    screen.getByText('Anterior communicating artery');
    unmount();
    useApp.setState({ variants: ['persistent_trigeminal_r', 'acomm_absent'] });
    render(<LeftPanel sim={sim} />);
    screen.getByText(/persistent trigeminal artery/i);
    expect(screen.queryByText('Anterior communicating artery')).toBeNull();
    useApp.setState({ variants: [] });
  });
});
