import { beforeEach, describe, expect, it } from 'vitest';
import { dropEmbolus } from '../engine/embolus';
import { simulateHemodynamics } from '../engine/hemodynamics';
import { useApp } from './store';
import { __setWebGLForTests } from './webgl';

const hemo = simulateHemodynamics({ occlusions: [], variants: [], map: 93, collateral: 'good' });
const embolusRun = () => ({
  source: 'heart' as const,
  size: 'medium' as const,
  seed: 7,
  result: dropEmbolus('heart', 2.9, hemo, 7),
});

describe('startEmbolus and the 3D view', () => {
  beforeEach(() => {
    useApp.setState({ view: 'willis', embolus: null, occlusions: [] });
  });

  it('switches to the 3D view to animate the embolus when WebGL is available', () => {
    __setWebGLForTests(true);
    useApp.getState().startEmbolus(embolusRun());
    expect(useApp.getState().view).toBe('3d');
    expect(useApp.getState().embolus?.done).toBe(false);
  });

  it('stays on the current (working) view when WebGL is unavailable, and resolves the result at once (there is no 3D scene to animate it in)', () => {
    __setWebGLForTests(false);
    useApp.getState().startEmbolus(embolusRun());
    expect(useApp.getState().view).toBe('willis');
    expect(useApp.getState().embolus?.done).toBe(true);
    // the result is already applied — an occlusion exists, unless the embolus left the head
    const e = useApp.getState().embolus!;
    expect(useApp.getState().occlusions.length > 0).toBe(!e.result.systemic);
  });

  it('never leaves the user on a blank 3D view: releasing an embolus from the Willis view without WebGL keeps it', () => {
    __setWebGLForTests(false);
    useApp.setState({ view: 'willis' });
    useApp.getState().startEmbolus(embolusRun());
    expect(useApp.getState().view).not.toBe('3d');
  });
});
