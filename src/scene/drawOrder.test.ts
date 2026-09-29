import { describe, expect, it } from 'vitest';
import { CustomBlending, NormalBlending, ShaderLib } from 'three';
import { SCALE } from './coords';
import { liftTowardsCamera, particleLift } from './liftPoints';
import { RENDER_ORDER, VENTRICLE_XRAY_MATERIAL } from './renderOrder';

/**
 * What the 3D view shows through what. Reported: the ventricles showed through the cortex and the
 * cerebellum; checking the rest found the flow particles doing the same.
 */

describe('draw order', () => {
  it('the ventricle x-ray comes after the deep nuclei and before everything further out', () => {
    expect(RENDER_ORDER.deep).toBeLessThan(RENDER_ORDER.ventricleXray);
    expect(RENDER_ORDER.ventricleXray).toBeLessThan(RENDER_ORDER.surface);
    expect(RENDER_ORDER.surface).toBeLessThan(RENDER_ORDER.vessels);
  });

  it('the x-ray is sorted with the opaque objects (renderOrder only orders it among them) yet still blends', () => {
    // three.js draws every transparent object after every opaque one, whatever its renderOrder
    expect(VENTRICLE_XRAY_MATERIAL.transparent).toBe(false);
    // …and switches NormalBlending off for non-transparent materials
    expect(VENTRICLE_XRAY_MATERIAL.blending).toBe(CustomBlending);
    expect(VENTRICLE_XRAY_MATERIAL.blending).not.toBe(NormalBlending);
    expect(VENTRICLE_XRAY_MATERIAL.depthTest).toBe(false);
    expect(VENTRICLE_XRAY_MATERIAL.depthWrite).toBe(false);
  });
});

describe('flow particles', () => {
  it('are lifted towards the camera after projection, in the vertex shader of this three.js version', () => {
    const src = ShaderLib.points.vertexShader;
    const out = liftTowardsCamera(src);
    expect(out).toContain('attribute float lift;');
    const project = out.indexOf('#include <project_vertex>');
    const lift = out.indexOf('mvPosition.xyz += normalize( - mvPosition.xyz ) * lift;');
    expect(project).toBeGreaterThan(-1);
    expect(lift).toBeGreaterThan(project);
    // the point size is attenuated with the lifted position
    expect(out.indexOf('gl_PointSize = size;')).toBeGreaterThan(lift);
  });

  it('refuses a shader it cannot patch rather than drawing unlifted points', () => {
    expect(() => liftTowardsCamera('void main() { gl_Position = vec4(0.0); }')).toThrow();
  });

  it('clear the tube wall', () => {
    for (const r of [0.2, 0.7, 2.5]) expect(particleLift(r, SCALE)).toBeGreaterThan(r * SCALE);
  });
});
