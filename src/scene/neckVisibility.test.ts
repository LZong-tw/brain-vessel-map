import { describe, expect, it, vi } from 'vitest';
import { VESSELS } from '../anatomy';
import { simulate } from '../engine/simulate';
import { vesselVisual } from '../ui/vesselState';
import { SCALE, vesselCurve } from './coords';
import { visibleWithNeck } from './neckVisibility';

describe('neck collateral visibility', () => {
  const collaterals = VESSELS.filter((v) => v.kind === 'collateral');
  const extracranial = VESSELS.filter((v) => v.group === 'extracranial');
  const neckNodes = new Set(extracranial.flatMap((v) => [v.from, v.to, `${v.id}@mid`]));
  const attachedToNeck = collaterals.filter((v) => neckNodes.has(v.from) || neckNodes.has(v.to));

  it('hides every collateral whose supporting neck artery is hidden, including recruited paths', () => {
    expect(attachedToNeck).toHaveLength(6);
    for (const v of attachedToNeck) expect(visibleWithNeck(v, false), v.id).toBe(false);
    for (const v of extracranial) expect(visibleWithNeck(v, false), v.id).toBe(false);
  });

  it('restores the connected neck network when enabled', () => {
    for (const v of VESSELS) expect(visibleWithNeck(v, true), v.id).toBe(true);
  });

  it('preserves intracranial and cerebellar collaterals with the neck hidden', () => {
    const intracranial = collaterals.filter((v) => !attachedToNeck.includes(v));
    expect(intracranial.length).toBeGreaterThan(20);
    for (const v of intracranial) expect(visibleWithNeck(v, false), v.id).toBe(true);
  });

  it('identifies the screenshot neck segments in the no-occlusion scene and hides their tubes', () => {
    const sim = simulate({ occlusions: [], variants: [], map: 93, collateral: 'good', tH: 3, reperfusionH: null, decompression: false });
    const detached = collaterals.filter((v) => v.baseId === 'coll_occipital_va');
    expect(detached.map((v) => v.id).sort()).toEqual(['coll_occipital_va_l', 'coll_occipital_va_r']);
    for (const v of detached) {
      expect(vesselVisual(v.id, sim).state, v.id).toBe('collateral_idle');
      expect(vesselVisual(v.id, sim).color, v.id).toBe('#b89b5e');
      // The generated course is genuinely in the neck, even before GPU projection.
      for (const p of vesselCurve(v).getPoints(40)) expect(p.y / SCALE, v.id).toBeLessThan(-80);
      expect(visibleWithNeck(v, false), v.id).toBe(false);
    }
  });

  it('restores a browser opening with collaterals enabled and Neck off without an occlusion', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => key === 'bvm.layers' ? JSON.stringify({ neck: false, collaterals: true }) : null,
      },
    });
    vi.resetModules();
    try {
      const { useApp } = await import('../state/store');
      const state = useApp.getState();
      expect(state.occlusions).toEqual([]);
      expect(state.layers.neck).toBe(false);
      expect(state.layers.collaterals).toBe(true);
      for (const v of attachedToNeck) expect(visibleWithNeck(v, state.layers.neck), v.id).toBe(false);
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });
});
