import type { WebGLProgramParametersWithUniforms } from 'three';

const PROJECT = '#include <project_vertex>';
const COMMON = '#include <common>';

/**
 * Flow particles run along a vessel's centreline, inside its tube, so with depth testing the tube
 * hides them; without it (as they once were drawn) they showed through the whole brain. Instead,
 * each point is moved towards the camera by its `lift` attribute — the vessel's radius plus a
 * margin, in scene units — after it is projected, and then depth-tested normally: it clears its
 * own tube but stays hidden behind the brain, which lies centimetres further out.
 *
 * Patches the vertex shader of a PointsMaterial (in onBeforeCompile). Throws if three.js no
 * longer has the chunks it hooks into, rather than silently drawing unlifted points.
 */
export function liftTowardsCamera(vertexShader: string): string {
  if (!vertexShader.includes(PROJECT) || !vertexShader.includes(COMMON)) {
    throw new Error('liftTowardsCamera: the points vertex shader no longer has the expected chunks');
  }
  return vertexShader
    .replace(COMMON, `${COMMON}\nattribute float lift;`)
    .replace(PROJECT, `${PROJECT}\n\tmvPosition.xyz += normalize( - mvPosition.xyz ) * lift;\n\tgl_Position = projectionMatrix * mvPosition;`);
}

/** onBeforeCompile for a PointsMaterial whose geometry has a `lift` attribute */
export const liftOnBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
  shader.vertexShader = liftTowardsCamera(shader.vertexShader);
};

/** how far a particle in a vessel of radius `rMm` (mm) is lifted: past the tube wall, by half a millimetre */
export const particleLift = (rMm: number, scale: number) => (rMm + 0.5) * scale;
