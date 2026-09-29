import { CustomBlending } from 'three';

/**
 * The order in which the 3D scene is drawn.
 *
 * three.js draws every opaque object first, sorted by `renderOrder`, and every transparent
 * object after that. Depth testing only hides what is drawn later behind what was drawn before,
 * so a pass without depth testing shows through everything drawn before it and is hidden by
 * everything drawn after it (where that lies in front).
 *
 * The ventricles sit inside the thalami and basal ganglia, which hide them from most angles. A
 * faint "x-ray" of them is therefore drawn without depth testing — but after the deep nuclei
 * only, and before the cortex, cerebellum, brainstem and vessels, which then cover it wherever
 * they lie in front. The ventricles show through the nuclei around them, never through the
 * surface of the brain. (Drawn last, as it once was, the x-ray showed through the cortex and
 * the cerebellum.)
 */
export const RENDER_ORDER = {
  /** deep nuclei (opaque): the only thing the ventricle x-ray may show through */
  deep: -2,
  /** ventricle x-ray (sorted with the opaque objects, see VENTRICLE_XRAY_MATERIAL) */
  ventricleXray: -1,
  /** cortex, cerebellum, brainstem (opaque) */
  surface: 0,
  /** vessel tubes (opaque) */
  vessels: 1,
  /** the ventricles themselves (transparent, depth-tested) */
  ventricles: 2,
  /** depth-only pass of a see-through cortex (transparent list) */
  cortexDepth: 3,
  /** a see-through cortex (transparent list) */
  cortex: 4,
} as const;

/**
 * The ventricle x-ray blends like a transparent material, but `transparent: false` keeps it in
 * the opaque list so that RENDER_ORDER places it between the deep nuclei and the rest (a
 * transparent material would be drawn after every opaque object). NormalBlending would be
 * switched off for a non-transparent material; CustomBlending keeps the usual alpha blend
 * (source alpha, one minus source alpha).
 */
export const VENTRICLE_XRAY_MATERIAL = {
  transparent: false,
  blending: CustomBlending,
  depthTest: false,
  depthWrite: false,
} as const;
