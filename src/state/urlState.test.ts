import { beforeEach, describe, expect, it } from 'vitest';
import { useApp } from './store';
import { applyHash, encodeState } from './urlState';
import { __setWebGLForTests } from './webgl';

describe('shareable URL state', () => {
  // these tests are about hash parsing, not the WebGL fallback (covered below) — assume WebGL works
  beforeEach(() => __setWebGLForTests(true));

  it('ignores ids that only exist on Object.prototype', () => {
    for (const h of ['#o=constructor', '#s=constructor', '#o=__proto__,toString', '#v=hasOwnProperty']) {
      expect(() => applyHash(h)).not.toThrow();
      expect(useApp.getState().occlusions).toEqual([]);
      expect(useApp.getState().variants).toEqual([]);
    }
  });

  it('drops malformed values and duplicates', () => {
    applyHash('#o=mca_m1_l:abc,aca_a1_r,aca_a1_r,basilar_mid:0.7&r=-5&p=NaN');
    const s = useApp.getState();
    expect(s.occlusions).toEqual([
      { vessel: 'aca_a1_r', severity: 1 },
      { vessel: 'basilar_mid', severity: 0.7 },
    ]);
    expect(s.reperfusionH).toBeNull();
    expect(s.map).toBe(93);
  });

  it('a new link replaces the previous state instead of merging with it', () => {
    applyHash('#o=mca_m1_l&c=poor&v=acomm_absent&d=1&view=willis');
    expect(useApp.getState().collateral).toBe('poor');
    applyHash('#o=aca_a1_r');
    const s = useApp.getState();
    expect(s.collateral).toBe('good');
    expect(s.variants).toEqual([]);
    expect(s.decompression).toBe(false);
    expect(s.view).toBe('3d');
  });

  it('round-trips through encodeState', () => {
    applyHash('#o=mca_m1_l,ica_cervical_r:0.7,lenticulostriate_r:b&c=moderate&t=24&r=2');
    expect(useApp.getState().occlusions).toContainEqual({ vessel: 'lenticulostriate_r', severity: 1, branch: true });
    const enc = encodeState(useApp.getState());
    applyHash('#o=aca_a1_r');
    applyHash(`#${enc}`);
    expect(encodeState(useApp.getState())).toBe(enc);
  });
});

describe('the 3D view falls back to Willis when WebGL is unavailable', () => {
  it('honours an explicit view=willis/brainstem regardless of WebGL', () => {
    __setWebGLForTests(false);
    applyHash('#view=brainstem');
    expect(useApp.getState().view).toBe('brainstem');
  });

  it('falls back to willis when the link explicitly asks for 3d but WebGL is unavailable', () => {
    __setWebGLForTests(false);
    applyHash('#view=3d');
    expect(useApp.getState().view).toBe('willis');
  });

  it('honours an explicit view=3d when WebGL is available', () => {
    __setWebGLForTests(true);
    applyHash('#view=willis');
    applyHash('#view=3d');
    expect(useApp.getState().view).toBe('3d');
  });

  it('a link with no view falls back to willis (not a blank 3D canvas) when WebGL is unavailable', () => {
    __setWebGLForTests(false);
    applyHash('#o=mca_m1_l');
    expect(useApp.getState().view).toBe('willis');
  });
});
