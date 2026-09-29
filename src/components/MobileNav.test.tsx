/**
 * The phone layout's bottom bar is labelled in the chosen language (it used to be announced as
 * "panels" in both), names the view that is open, and toggles the side panels.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useApp } from '../state/store';
import { MobileNav } from './MobileNav';

beforeEach(() => {
  useApp.getState().resetAll();
  useApp.setState({ lang: 'zh-TW', mobilePanel: 'none', view: '3d' });
});
afterEach(() => {
  cleanup();
});

describe('mobile navigation', () => {
  it('is labelled in Chinese and in English', () => {
    render(<MobileNav />);
    screen.getByRole('navigation', { name: '切換面板' });
    cleanup();
    useApp.setState({ lang: 'en' });
    render(<MobileNav />);
    screen.getByRole('navigation', { name: 'Switch panel' });
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Controls', '3D', 'Results']);
  });

  it('names the view that is open', () => {
    useApp.setState({ view: 'willis' });
    render(<MobileNav />);
    expect(screen.getAllByRole('button')[1].textContent).toBe('Willis 環');
  });

  it('opens and closes the side panels', () => {
    render(<MobileNav />);
    fireEvent.click(screen.getByRole('button', { name: '控制' }));
    expect(useApp.getState().mobilePanel).toBe('left');
    fireEvent.click(screen.getByRole('button', { name: '控制' }));
    expect(useApp.getState().mobilePanel).toBe('none');
    fireEvent.click(screen.getByRole('button', { name: '結果' }));
    expect(useApp.getState().mobilePanel).toBe('right');
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(useApp.getState().mobilePanel).toBe('none');
  });
});
