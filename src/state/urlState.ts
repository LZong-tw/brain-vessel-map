/**
 * Shareable state in the URL hash, e.g.
 *   #o=mca_m1_l,ica_cervical_r:0.7&t=24&c=poor&v=acomm_absent&p=80&r=2&d=1
 * Hash-based so it works on GitHub Pages without server routing.
 */

import { TIME_STOPS } from '../anatomy/timeline';
import { VESSEL_BY_ID } from '../anatomy';
import { VARIANT_BY_ID } from '../anatomy/variants';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import type { CollateralGrade } from '../engine/hemodynamics';
import { useApp, type AppState } from './store';

export function encodeState(s: AppState): string {
  const q = new URLSearchParams();
  if (s.scenario) q.set('s', s.scenario);
  if (s.occlusions.length)
    q.set('o', s.occlusions.map((o) => (o.severity >= 1 ? o.vessel : `${o.vessel}:${o.severity}`)).join(','));
  if (s.variants.length) q.set('v', s.variants.join(','));
  if (s.collateral !== 'good') q.set('c', s.collateral);
  if (s.map !== 93) q.set('p', String(s.map));
  q.set('t', String(TIME_STOPS[s.tIndex].h));
  if (s.reperfusionH !== null) q.set('r', String(s.reperfusionH));
  if (s.decompression) q.set('d', '1');
  if (s.view !== '3d') q.set('view', s.view);
  return q.toString();
}

export function applyHash(hash: string) {
  const q = new URLSearchParams(hash.replace(/^#/, ''));
  if (![...q.keys()].length) return;
  const st = useApp.getState();
  const s = q.get('s');
  if (s && SCENARIO_BY_ID[s] && !q.get('o')) {
    st.loadScenario(s);
  }
  const patch: Partial<AppState> = {};
  const o = q.get('o');
  if (o) {
    patch.occlusions = o
      .split(',')
      .map((x) => {
        const [vessel, sev] = x.split(':');
        return { vessel, severity: sev ? Math.min(1, Math.max(0.3, Number(sev))) : 1 };
      })
      .filter((x) => VESSEL_BY_ID[x.vessel] && !VESSEL_BY_ID[x.vessel].visualOnly);
    patch.scenario = s && SCENARIO_BY_ID[s] ? s : null;
  }
  const v = q.get('v');
  if (v) patch.variants = v.split(',').filter((x) => VARIANT_BY_ID[x]);
  const c = q.get('c') as CollateralGrade | null;
  if (c && ['good', 'moderate', 'poor'].includes(c)) patch.collateral = c;
  const p = Number(q.get('p'));
  if (p >= 30 && p <= 180) patch.map = p;
  const t = q.get('t');
  if (t !== null) {
    const h = Number(t);
    let best = 0;
    TIME_STOPS.forEach((stop, i) => {
      if (Math.abs(stop.h - h) < Math.abs(TIME_STOPS[best].h - h)) best = i;
    });
    patch.tIndex = best;
  }
  const r = q.get('r');
  if (r !== null && Number.isFinite(Number(r))) patch.reperfusionH = Number(r);
  if (q.get('d') === '1') patch.decompression = true;
  const view = q.get('view');
  if (view === 'willis' || view === 'brainstem') patch.view = view;
  if (patch.occlusions?.length) patch.rightTab = 'results';
  useApp.setState(patch);
}

/** Keep the hash in sync with the state (debounced, no history spam). */
export function startUrlSync() {
  applyHash(window.location.hash);
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
  window.addEventListener('hashchange', () => applyHash(window.location.hash));
}
