/**
 * Bilateral expansion of vessel / region definitions.
 */

import type { RegionDef, Side, SideOrMid, SupplyDef, Vec3, Vessel, VesselDef } from './types';

export const SIDES: Side[] = ['r', 'l'];

export const opposite = (s: Side): Side => (s === 'r' ? 'l' : 'r');

/** Mirror an MNI coordinate across the midsagittal plane. */
export const mirror = (p: Vec3): Vec3 => [-p[0], p[1], p[2]];

/** Replace `{s}` / `{o}` placeholders. */
export function sub(template: string, side: SideOrMid): string {
  if (side === 'm') return template;
  return template.replace(/\{s\}/g, side).replace(/\{o\}/g, opposite(side));
}

/** Vessel id for a base id and side. */
export const vid = (base: string, side: SideOrMid): string => (side === 'm' ? base : `${base}_${side}`);

export function expandVessels(defs: VesselDef[]): Vessel[] {
  const out: Vessel[] = [];
  for (const d of defs) {
    const sides: SideOrMid[] = d.bilateral ? SIDES : ['m'];
    for (const side of sides) {
      const { bilateral: _b, id: baseId, from, to, parent, path, ...rest } = d;
      void _b;
      out.push({
        ...rest,
        id: vid(baseId, side),
        baseId,
        side,
        from: sub(from, side),
        to: sub(to, side),
        parent: parent ? sub(parent, side) : undefined,
        path: side === 'l' ? path.map(mirror) : path.map((p) => [...p] as Vec3),
        children: [],
      });
    }
  }
  const byId = new Map(out.map((v) => [v.id, v]));
  for (const v of out) {
    if (v.parent && byId.has(v.parent)) byId.get(v.parent)!.children.push(v.id);
  }
  return out;
}

export function expandSupply(supply: SupplyDef[], side: SideOrMid): SupplyDef[] {
  return supply.map((s) => ({ ...s, v: sub(s.v, side) }));
}

export function regionSides(def: RegionDef): SideOrMid[] {
  return def.bilateral ? SIDES : ['m'];
}
