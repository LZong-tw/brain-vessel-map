/**
 * WebGL capability detection, kept free of any three.js import so the state store can use it
 * (deciding the default view, whether to switch to 3D for the embolus animation) without pulling
 * the 3D engine into every bundle. The 3D scene itself (src/scene/Scene3D.tsx) uses the same
 * probe so there is exactly one answer for "can we show 3D right now?".
 */

let cached: boolean | null = null;

/** Probe once per page load and remember the answer; SSR/test-safe (no `document` → false). */
export function hasWebGL(): boolean {
  if (cached !== null) return cached;
  cached = probe();
  return cached;
}

function probe(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

/** Test-only: force the memoised result, or pass `null` to clear it and re-probe next call. */
export function __setWebGLForTests(v: boolean | null): void {
  cached = v;
}

/** The view to land on when nothing else says otherwise: 3D if we can render it, else a view that works everywhere. */
export function defaultView(): 'willis' | '3d' {
  return hasWebGL() ? '3d' : 'willis';
}
