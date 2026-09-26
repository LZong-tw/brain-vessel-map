import { CatmullRomCurve3, Vector3 } from 'three';
import type { Vec3, Vessel } from '../anatomy/types';

/** scene units per mm (1 unit = 1 cm) */
export const SCALE = 0.1;

/**
 * MNI (RAS: +x right, +y anterior, +z superior) → three.js (+y up, camera looks down −z).
 * three.x = −mni.x so that the patient's right appears on the viewer's left in a frontal
 * view (as when facing a person); the mapping is a proper rotation (no mirroring).
 */
export const toThree = (p: Vec3 | number[]): Vector3 => new Vector3(-p[0] * SCALE, p[2] * SCALE, p[1] * SCALE);

export const toThreeArr = (p: Vec3 | number[]): [number, number, number] => [-p[0] * SCALE, p[2] * SCALE, p[1] * SCALE];

/** brain centre used as the orbit target */
export const BRAIN_CENTER = toThree([0, -18, 8]);

const curveCache = new Map<string, CatmullRomCurve3>();
export function vesselCurve(v: Vessel): CatmullRomCurve3 {
  let c = curveCache.get(v.id);
  if (!c) {
    c = new CatmullRomCurve3(v.path.map(toThree), false, 'centripetal', 0.5);
    curveCache.set(v.id, c);
  }
  return c;
}
