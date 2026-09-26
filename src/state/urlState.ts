/**
 * Shareable state in the URL hash, e.g.
 *   #o=mca_m1_l,ica_cervical_r:0.7&t=24&c=poor&v=acomm_absent&p=80&r=2&d=1
 * Hash-based so it works on GitHub Pages without server routing.
 */

import { VESSEL_BY_ID } from '../anatomy';
import { canBeLacunar } from '../anatomy/lacunes';
import { REPERFUSION_STOPS, TIME_STOPS } from '../anatomy/timeline';
import { VARIANT_BY_ID } from '../anatomy/variants';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import type { CollateralGrade } from '../engine/hemodynamics';
import { isOccludable } from '../engine/simulate';
import { useApp, type AppState } from './store';

export function encodeState(s: AppState): string {
  const q = new URLSearchParams();
  if (s.scenario) q.set('s', s.scenario);
  if (s.occlusions.length)
    q.set('o', s.occlusions.map((o) => (o.branch ? `${o.vessel}:b` : o.severity >= 1 ? o.vessel : `${o.vessel}:${o.severity}`)).join(','));
  if (s.variants.length) q.set('v', s.variants.join(','));
  if (s.collateral !== 'good') q.set('c', s.collateral);
  if (s.map !== 93) q.set('p', String(s.map));
  q.set('t', String(TIME_STOPS[s.tIndex].h));
  if (s.reperfusionH !== null) q.set('r', String(s.reperfusionH));
  if (s.decompression) q.set('d', '1');
  if (s.view !== '3d') q.set('view', s.view);
  return q.toString();
}

/** State that a link fully determines; anything the hash leaves out falls back to these. */
const LINK_DEFAULTS = {
  occlusions: [],
  variants: [],
  collateral: 'good',
  map: 93,
  reperfusionH: null,
  decompression: false,
  scenario: null,
  view: '3d',
} satisfies Partial<AppState>;

function nearestStop(h: number): number {
  let best = 0;
  TIME_STOPS.forEach((stop, i) => {
    if (Math.abs(stop.h - h) < Math.abs(TIME_STOPS[best].h - h)) best = i;
  });
  return best;
}

/**
 * Replace the simulation state with what the hash describes. Unknown ids and malformed
 * values are ignored, so a hand-edited or truncated link can never break the page.
 */
export function applyHash(hash: string) {
  const raw = hash.replace(/^#/, '');
  const q = new URLSearchParams(raw);
  if (![...q.keys()].length) return;
  const st = useApp.getState();
  if (raw === encodeState(st)) return;

  const s = q.get('s');
  const scenario = s && SCENARIO_BY_ID[s] ? s : null;
  let patch: Partial<AppState> = { ...LINK_DEFAULTS };
  if (scenario && !q.get('o')) {
    // a bare scenario link: load it, then let the other parameters (time, view) override
    st.loadScenario(scenario);
    const n = useApp.getState();
    patch = {
      occlusions: n.occlusions,
      variants: n.variants,
      collateral: n.collateral,
      map: n.map,
      reperfusionH: n.reperfusionH,
      decompression: n.decompression,
      scenario,
      view: '3d',
      tIndex: n.tIndex,
    };
  }
  const o = q.get('o');
  if (o) {
    const seen = new Set<string>();
    patch.occlusions = [];
    for (const part of o.split(',')) {
      const [vessel, sevRaw] = part.split(':');
      if (!isOccludable(vessel) || seen.has(vessel)) continue;
      if (sevRaw === 'b') {
        const v = VESSEL_BY_ID[vessel];
        if (!canBeLacunar(v.baseId, v.n)) continue;
        seen.add(vessel);
        patch.occlusions.push({ vessel, severity: 1, branch: true });
        continue;
      }
      const sev = sevRaw === undefined ? 1 : Number(sevRaw);
      if (!Number.isFinite(sev)) continue;
      seen.add(vessel);
      patch.occlusions.push({ vessel, severity: Math.min(1, Math.max(0.3, sev)) });
    }
    patch.scenario = scenario;
  }
  const v = q.get('v');
  if (v) patch.variants = [...new Set(v.split(',').filter((x) => VARIANT_BY_ID[x]))];
  const c = q.get('c') as CollateralGrade | null;
  if (c && ['good', 'moderate', 'poor'].includes(c)) patch.collateral = c;
  const p = Number(q.get('p'));
  if (Number.isFinite(p) && p >= 30 && p <= 180) patch.map = p;
  const t = Number(q.get('t'));
  if (q.get('t') !== null && Number.isFinite(t)) patch.tIndex = nearestStop(t);
  const r = Number(q.get('r'));
  if (q.get('r') !== null && REPERFUSION_STOPS.includes(r)) patch.reperfusionH = r;
  if (q.get('d') === '1') patch.decompression = true;
  const view = q.get('view');
  if (view === 'willis' || view === 'brainstem') patch.view = view;
  if (patch.occlusions?.length) patch.rightTab = 'results';
  useApp.setState(patch);
}

function applyHashSafely(hash: string) {
  try {
    applyHash(hash);
  } catch (e) {
    console.warn('Ignoring unreadable link state', e);
  }
}

/** Keep the hash in sync with the state (debounced, no history spam). */
export function startUrlSync() {
  applyHashSafely(window.location.hash);
  let timer: number | undefined;
  let last = '';
  useApp.subscribe((s) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      const enc = encodeState(s);
      if (enc === last) return;
      last = enc;
      const url = `${window.location.pathname}${window.location.search}${enc ? `#${enc}` : ''}`;
      window.history.replaceState(null, '', url);
    }, 250);
  });
  window.addEventListener('hashchange', () => applyHashSafely(window.location.hash));
}
