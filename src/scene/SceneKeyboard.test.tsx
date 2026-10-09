// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { VESSEL_BY_ID, vesselName } from '../anatomy';
import { simulate } from '../engine/simulate';
import { useApp } from '../state/store';
import { NowSummary } from '../components/NowSummary';
import { keyboardTargets, moveCamera, SceneKeyboard } from './SceneKeyboard';

const sim = simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 3, reperfusionH: null, decompression: false });
const initial = useApp.getState();
beforeEach(() => useApp.setState({ ...initial, lang: 'en', selected: null, hovered: null }));
afterEach(cleanup);

describe('3D keyboard navigation', () => {
  it('focuses labeled structures with arrows, selects and clears without changing the simulation', () => {
    const focus = vi.fn();
    render(<SceneKeyboard data={null} sim={sim} events={new EventTarget()} onFocus={focus} />);
    fireEvent.click(screen.getByText('Keyboard navigation'));
    const buttons = within(screen.getByRole('group', { name: 'Anatomical structures' })).getAllByRole('button');
    act(() => buttons[0].focus());
    expect(useApp.getState().hovered).toEqual({ kind: 'region', id: 'retina_r' });
    expect(focus.mock.lastCall?.[0]).toBeInstanceOf(Vector3);
    fireEvent.keyDown(buttons[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(buttons[1]);
    fireEvent.keyDown(buttons[1], { key: 'Enter' });
    expect(useApp.getState().selected).toEqual({ kind: 'region', id: 'inner_ear_r' });
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    fireEvent.keyDown(buttons[1], { key: 'Escape' });
    expect(useApp.getState().selected).toBeNull();
    expect(useApp.getState().occlusions).toEqual(initial.occlusions);
    expect(buttons.every((b) => b.tabIndex === 0)).toBe(true);
    fireEvent.keyDown(buttons[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(buttons[buttons.length - 1]);
    fireEvent.keyDown(buttons[buttons.length - 1], { key: 'Home' });
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('dispatches camera keys only from the camera control and clears focus on departure', () => {
    const events = new EventTarget();
    const move = vi.fn();
    const focus = vi.fn();
    events.addEventListener('camera-key', move);
    render(<SceneKeyboard data={null} sim={sim} events={events} onFocus={focus} />);
    fireEvent.click(screen.getByText('Keyboard navigation'));
    const camera = screen.getByRole('button', { name: '3D camera' });
    fireEvent.keyDown(camera, { key: 'ArrowLeft' });
    expect(move).toHaveBeenCalledOnce();
    expect((move.mock.calls[0][0] as CustomEvent).detail).toBe('ArrowLeft');
    const vessel = screen.getByRole('button', { name: vesselName(VESSEL_BY_ID.basilar_mid, 'en') });
    act(() => vessel.focus());
    fireEvent.keyDown(vessel, { key: 'ArrowLeft' });
    expect(move).toHaveBeenCalledOnce();
    act(() => camera.focus());
    expect(focus.mock.lastCall?.[0]).toBeNull();
    expect(useApp.getState().hovered).toBeNull();
  });

  it('excludes hidden neck anatomy, absent variants and hidden hemispheres', () => {
    const s = useApp.getState();
    const targets = keyboardTargets(null, sim, { ...s, layers: { ...s.layers, neck: false }, hemis: { l: false, r: false } });
    const ids = targets.map((t) => t.selection.id);
    expect(ids).not.toContain('coll_occipital_va_r');
    expect(ids).not.toContain('ica_cervical_r');
    expect(ids).toContain('basilar_mid');
    expect(ids).not.toContain('mca_m4_r');
    expect(keyboardTargets(null, sim, { ...s, layers: { ...s.layers, vessels: false } }).every((t) => t.selection.kind !== 'vessel')).toBe(true);
  });

  it('uses real visible mesh vertices and omits clipped structures', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-2, 1, 3, 2, 1, 3]), 3));
    const data = { meshes: [{ name: 'ventricles', kind: 'ventricle' as const, geometry, bed: null }], beds: [] };
    const s = useApp.getState();
    const t = keyboardTargets(data, sim, { ...s, layers: { ...s.layers, ventricles: true }, clip: { axis: 'x', pos: 0 } }).find((t) => t.selection.id === 'ventricles');
    expect(t?.position.toArray()).toEqual([2, 1, 3]);
    expect(keyboardTargets(data, sim, { ...s, layers: { ...s.layers, ventricles: true }, clip: { axis: 'x', pos: -30 } }).some((t) => t.selection.id === 'ventricles')).toBe(false);
  });

  it('rotates and zooms within OrbitControls limits without changing the target', () => {
    const position = new Vector3(20, 0, 0);
    const target = new Vector3();
    expect(moveCamera(position, target, 'ArrowLeft')).toBe(true);
    expect(position.z).not.toBe(0);
    for (let i = 0; i < 100; i++) moveCamera(position, target, '+');
    expect(position.length()).toBeCloseTo(4);
    for (let i = 0; i < 100; i++) moveCamera(position, target, '-');
    expect(position.length()).toBeCloseTo(70);
    expect(target.toArray()).toEqual([0, 0, 0]);
    expect(moveCamera(position, target, 'Tab')).toBe(false);
  });

  it('exposes the current results as a polite live summary for screen readers', () => {
    const { container } = render(<NowSummary sim={sim} series={[sim]} />);
    const summary = container.querySelector('[aria-live="polite"]');
    expect(summary?.textContent?.length).toBeGreaterThan(20);
  });
});
