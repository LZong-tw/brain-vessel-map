import { describe, expect, it } from 'vitest';
import { __setWebGLForTests, defaultView, hasWebGL } from './webgl';

describe('WebGL detection', () => {
  it('is memoised: forcing a value makes hasWebGL return it without re-probing', () => {
    __setWebGLForTests(true);
    expect(hasWebGL()).toBe(true);
    __setWebGLForTests(false);
    expect(hasWebGL()).toBe(false);
  });

  it('is SSR/test-safe: with no document it reports unavailable instead of throwing', () => {
    __setWebGLForTests(null); // clear the memoised value so hasWebGL() actually probes
    expect(() => hasWebGL()).not.toThrow();
    // this test file runs in the 'node' environment (no `document`), so the probe fails safely
    expect(hasWebGL()).toBe(false);
  });

  it('defaultView is 3D only when WebGL is available', () => {
    __setWebGLForTests(true);
    expect(defaultView()).toBe('3d');
    __setWebGLForTests(false);
    expect(defaultView()).toBe('willis');
  });
});
