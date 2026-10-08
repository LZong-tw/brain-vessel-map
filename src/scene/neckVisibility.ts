import type { Vessel } from '../anatomy/types';

// These collaterals join extracranial arteries hidden by the Neck toggle.
const NECK_COLLATERALS = new Set(['coll_ec_ic_orbital', 'coll_ec_ic_meningeal', 'coll_occipital_va']);

export function visibleWithNeck(v: Vessel, neck: boolean): boolean {
  return neck || (v.group !== 'extracranial' && !NECK_COLLATERALS.has(v.baseId));
}
