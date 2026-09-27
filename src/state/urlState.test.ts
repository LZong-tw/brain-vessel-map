import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_TREATMENT, downstreamBranches } from '../engine/treatment';
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

  it('reads occlusion schedules: start, spontaneous reopening, later phases', () => {
    applyHash('#o=basilar_mid:0.9@0-72,basilar_mid@72,mca_m2_sup_l@0-0.0833,lenticulostriate_r:b@24&t=120');
    expect(useApp.getState().occlusions).toEqual([
      { vessel: 'basilar_mid', severity: 0.9, toH: 72 },
      { vessel: 'basilar_mid', severity: 1, fromH: 72 },
      // 5 minutes, although the link only carries 4 decimals
      { vessel: 'mca_m2_sup_l', severity: 1, toH: 1 / 12 },
      { vessel: 'lenticulostriate_r', severity: 1, branch: true, fromH: 24 },
    ]);
    const enc = encodeState(useApp.getState());
    expect(enc).toContain(`o=${encodeURIComponent('basilar_mid:0.9@0-72,basilar_mid@72,mca_m2_sup_l@0-0.0833,lenticulostriate_r:b@24')}`);
    applyHash('#o=aca_a1_r');
    applyHash(`#${enc}`);
    expect(encodeState(useApp.getState())).toBe(enc);
  });

  it('drops overlapping phases and malformed windows', () => {
    applyHash('#o=basilar_mid@0-80,basilar_mid@72,basilar_mid:0.7@90,mca_m1_l@x,mca_m1_r@5-2,aca_a1_r@-1');
    expect(useApp.getState().occlusions).toEqual([
      { vessel: 'basilar_mid', severity: 1, toH: 80 },
      { vessel: 'basilar_mid', severity: 0.7, fromH: 90 },
    ]);
  });

  it('accepts treatment after a later occlusion start, and only then', () => {
    applyHash('#o=basilar_mid:0.9@0-72,basilar_mid@72&r=78');
    expect(useApp.getState().reperfusionH).toBe(78);
    applyHash('#o=basilar_mid&r=78');
    expect(useApp.getState().reperfusionH).toBeNull();
    applyHash('#o=basilar_mid&r=4.5');
    expect(useApp.getState().reperfusionH).toBe(4.5);
  });

  it('reads links without timing exactly as before', () => {
    applyHash('#o=mca_m1_l,ica_cervical_r:0.7,lenticulostriate_r:b&t=24&r=2');
    const s = useApp.getState();
    expect(s.occlusions).toEqual([
      { vessel: 'mca_m1_l', severity: 1 },
      { vessel: 'ica_cervical_r', severity: 0.7 },
      { vessel: 'lenticulostriate_r', severity: 1, branch: true },
    ]);
    for (const o of s.occlusions) expect(Object.keys(o).sort()).toEqual(o.branch ? ['branch', 'severity', 'vessel'] : ['severity', 'vessel']);
    expect(s.reperfusionH).toBe(2);
    expect(encodeState(s)).toBe('o=mca_m1_l%2Cica_cervical_r%3A0.7%2Clenticulostriate_r%3Ab&t=24&r=2');
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

describe('treatment details in the link', () => {
  beforeEach(() => __setWebGLForTests(true));

  it('old links (and links without treatment) read as the default treatment', () => {
    applyHash('#o=mca_m1_l&c=poor&t=24&r=2');
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);
    applyHash('#o=mca_m1_l&t=24');
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);
    expect(encodeState(useApp.getState())).not.toMatch(/(^|&)(tm|tg|ro|de|nr)=/);
  });

  it('writes nothing for the default treatment', () => {
    applyHash('#o=mca_m1_l&t=24&r=4.5');
    useApp.getState().setTreatment({ ...DEFAULT_TREATMENT });
    expect(encodeState(useApp.getState())).toBe('o=mca_m1_l&t=24&r=4.5');
  });

  it('round-trips every detail', () => {
    const branch = downstreamBranches('mca_m1_l')[0];
    applyHash(`#o=mca_m1_l&t=24&r=6&tm=bridging&tg=2b67&ro=6&de=${branch}&nr=0.15`);
    expect(useApp.getState().treatment).toEqual({ method: 'bridging', grade: '2b67', reocclusionAfterH: 6, distalEmbolus: branch, noReflow: 0.15 });
    const enc = encodeState(useApp.getState());
    expect(enc).toBe(`o=mca_m1_l&t=24&r=6&tm=bridging&tg=2b67&ro=6&de=${branch}&nr=0.15`);
    applyHash('#o=aca_a1_r');
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);
    applyHash(`#${enc}`);
    expect(encodeState(useApp.getState())).toBe(enc);
  });

  it('round-trips single details set from the store', () => {
    for (const patch of [{ method: 'ivt' as const }, { grade: '0' as const }, { grade: '2b50' as const }, { reocclusionAfterH: 24 }, { noReflow: 0.3 }]) {
      applyHash('#o=basilar_mid&t=24&r=3');
      useApp.getState().setTreatment(patch);
      const enc = encodeState(useApp.getState());
      applyHash('#o=aca_a1_r');
      applyHash(`#${enc}`);
      expect(useApp.getState().treatment).toEqual({ ...DEFAULT_TREATMENT, ...patch });
      expect(encodeState(useApp.getState())).toBe(enc);
    }
  });

  it('ignores invalid values one by one', () => {
    applyHash('#o=mca_m1_l&t=24&r=6&tm=laser&tg=2b&ro=5&de=basilar_mid&nr=0.9');
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);
    applyHash('#o=mca_m1_l&t=24&r=6&tm=ivt&tg=__proto__&ro=abc&de=constructor&nr=-1');
    expect(useApp.getState().treatment).toEqual({ ...DEFAULT_TREATMENT, method: 'ivt' });
  });

  it('ignores treatment details without a treatment time', () => {
    applyHash('#o=mca_m1_l&t=24&tm=ivt&tg=2a');
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);
    expect(encodeState(useApp.getState())).toBe('o=mca_m1_l&t=24');
  });

  it('a new link without details resets them', () => {
    applyHash('#o=mca_m1_l&t=24&r=6&tg=2a');
    expect(useApp.getState().treatment.grade).toBe('2a');
    applyHash('#o=mca_m1_l&t=24&r=6');
    expect(useApp.getState().treatment).toEqual(DEFAULT_TREATMENT);
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
