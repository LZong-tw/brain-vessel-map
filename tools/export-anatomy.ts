/**
 * Exports the authored vessel waypoints and region list for the Python asset pipeline.
 * Usage: npx vite-node tools/export-anatomy.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VESSEL_DEFS } from '../src/anatomy/vessels';
import { REGION_DEFS } from '../src/anatomy/regions';
import { expandVessels } from '../src/anatomy/expand';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '.cache/anatomy-export.json');
mkdirSync(dirname(out), { recursive: true });

const vessels = expandVessels(VESSEL_DEFS).map((v) => ({
  id: v.id,
  side: v.side,
  kind: v.kind,
  from: v.from,
  to: v.to,
  r: v.r,
  pathMode: v.pathMode,
  surfaceFrom: v.surfaceFrom ?? 0,
  visualOnly: !!v.visualOnly,
  path: v.path,
}));

const regions = REGION_DEFS.map((r) => ({ id: r.id, bilateral: r.bilateral, category: r.category }));

writeFileSync(out, JSON.stringify({ vessels, regions }, null, 1));
console.log(`wrote ${vessels.length} vessels, ${regions.length} regions → ${out}`);
