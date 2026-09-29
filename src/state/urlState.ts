/**
 * Shareable state in the URL hash, e.g.
 *   #o=mca_m1_l,ica_cervical_r:0.7&t=24&c=poor&v=acomm_absent&p=80&r=2&d=1
 * Hash-based so it works on GitHub Pages without server routing.
 *
 * An occlusion with a schedule carries its window in hours after the vessel id:
 *   basilar_mid:0.9@0-72,basilar_mid@72   (90 % stenosis over 0–72 h, then occluded from 72 h)
 *   mca_m2_sup_l@0-0.0833                 (reopens by itself after 5 min)
 * No "@" means from 0 and never reopening, so older links read exactly as before. Treatment
 * (`r`) may also be given relative to a later occlusion start (start + one of the usual delays).
 *
 * Treatment details go with a treatment time and are written only when they differ from the
 * default (complete, lasting reperfusion by thrombectomy):
 *   tm=ivt|bridging   method      tg=2b67   eTICI grade      ro=6     reoccludes 6 h later
 *   de=<vessel id>    distal embolus                          nr=0.15  no-reflow share
 */

import { VESSEL_BY_ID } from '../anatomy';
import { canBeLacunar } from '../anatomy/lacunes';
import { REPERFUSION_STOPS, TIME_STOPS } from '../anatomy/timeline';
import { VARIANT_BY_ID } from '../anatomy/variants';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import type { CollateralGrade, Occlusion } from '../engine/hemodynamics';
import { endOf, isTreatable, overlap, startOf, tidy } from '../engine/schedule';
import { DEFAULT_TREATMENT, REPERFUSION_GRADES, downstreamBranches, type ReperfusionGrade, type TreatmentMethod, type TreatmentOptions } from '../engine/treatment';
import { isOccludable } from '../engine/simulate';
import { NO_REFLOW_OPTIONS, REOCCLUSION_OPTIONS } from '../ui/treatment';
import { useApp, type AppState } from './store';
import { hasWebGL } from './webgl';

/** hours in a link: at most 4 decimals (5 min = 0.0833) */
const fmtH = (h: number) => String(+h.toFixed(4));

/** undo the rounding of fmtH for times on the 5-minute grid (every time the app offers) */
function snapH(h: number): number {
  const g = Math.round(h * 12) / 12;
  return Math.abs(g - h) < 5e-4 ? g : h;
}

function encodeOcclusion(o: Occlusion): string {
  const head = o.branch ? `${o.vessel}:b` : o.severity >= 1 ? o.vessel : `${o.vessel}:${o.severity}`;
  const from = startOf(o);
  const to = endOf(o);
  if (from === 0 && to === null) return head;
  return `${head}@${fmtH(from)}${to !== null ? `-${fmtH(to)}` : ''}`;
}

const WINDOW = /^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/;

/** treatment times a link may use: the usual delays after onset or after a later occlusion start */
export function treatmentTimes(occlusions: readonly Occlusion[]): number[] {
  const starts = [...new Set(occlusions.map(startOf).filter((s) => s > 0))];
  const out = new Set<number>(REPERFUSION_STOPS);
  for (const s of starts) for (const d of REPERFUSION_STOPS) out.add(s + d);
  return [...out].sort((a, b) => a - b);
}

export function encodeState(s: AppState): string {
  const q = new URLSearchParams();
  if (s.scenario) q.set('s', s.scenario);
  if (s.occlusions.length) q.set('o', s.occlusions.map(encodeOcclusion).join(','));
  if (s.variants.length) q.set('v', s.variants.join(','));
  if (s.collateral !== 'good') q.set('c', s.collateral);
  if (s.map !== 93) q.set('p', String(s.map));
  q.set('t', String(TIME_STOPS[s.tIndex].h));
  if (s.reperfusionH !== null) {
    q.set('r', fmtH(s.reperfusionH));
    const tx = s.treatment;
    if (tx.method !== DEFAULT_TREATMENT.method) q.set('tm', tx.method);
    if (tx.grade !== DEFAULT_TREATMENT.grade) q.set('tg', tx.grade);
    if (tx.reocclusionAfterH !== null) q.set('ro', fmtH(tx.reocclusionAfterH));
    if (tx.distalEmbolus) q.set('de', tx.distalEmbolus);
    if (tx.noReflow > 0) q.set('nr', String(tx.noReflow));
  }
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
  treatment: DEFAULT_TREATMENT,
  decompression: false,
  scenario: null,
  view: '3d',
} satisfies Partial<AppState>;

const METHODS: TreatmentMethod[] = ['evt', 'ivt', 'bridging'];

/** the treatment details of a link; each malformed or unknown value falls back to its default */
function parseTreatment(q: URLSearchParams, occlusions: readonly Occlusion[]): TreatmentOptions {
  const out: TreatmentOptions = { ...DEFAULT_TREATMENT };
  const tm = q.get('tm') as TreatmentMethod | null;
  if (tm && METHODS.includes(tm)) out.method = tm;
  const tg = q.get('tg') as ReperfusionGrade | null;
  if (tg && REPERFUSION_GRADES.includes(tg)) out.grade = tg;
  const ro = Number(q.get('ro'));
  if (q.get('ro') !== null && REOCCLUSION_OPTIONS.includes(ro)) out.reocclusionAfterH = ro;
  const nr = Number(q.get('nr'));
  if (q.get('nr') !== null && nr > 0 && NO_REFLOW_OPTIONS.includes(nr)) out.noReflow = nr;
  // a distal embolus only in a branch downstream of an occlusion that treatment can reopen
  const de = q.get('de');
  if (de && isOccludable(de) && occlusions.some((o) => isTreatable(o) && downstreamBranches(o.vessel).includes(de))) out.distalEmbolus = de;
  return out;
}

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
      treatment: n.treatment,
      decompression: n.decompression,
      scenario,
      view: '3d',
      tIndex: n.tIndex,
    };
  }
  const o = q.get('o');
  if (o) {
    const list: Occlusion[] = [];
    for (const part of o.split(',')) {
      const at = part.indexOf('@');
      const head = at < 0 ? part : part.slice(0, at);
      const [vessel, sevRaw] = head.split(':');
      if (!isOccludable(vessel)) continue;
      let occ: Occlusion;
      if (sevRaw === 'b') {
        const v = VESSEL_BY_ID[vessel];
        if (!canBeLacunar(v.baseId, v.n)) continue;
        occ = { vessel, severity: 1, branch: true };
      } else {
        const sev = sevRaw === undefined ? 1 : Number(sevRaw);
        if (!Number.isFinite(sev)) continue;
        occ = { vessel, severity: Math.min(1, Math.max(0.3, sev)) };
      }
      if (at >= 0) {
        const m = WINDOW.exec(part.slice(at + 1));
        if (!m) continue;
        const from = snapH(Number(m[1]));
        const to = m[2] === undefined ? null : snapH(Number(m[2]));
        if (!Number.isFinite(from) || (to !== null && !(Number.isFinite(to) && to > from))) continue;
        occ = tidy({ ...occ, fromH: from, toH: to });
      }
      // the same vessel again only in a window that does not overlap its other phases
      if (list.some((x) => overlap(x, occ))) continue;
      list.push(occ);
    }
    patch.occlusions = list;
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
  else if (q.get('r') !== null && Number.isFinite(r)) {
    // treatment some time after a later occlusion start
    const hit = treatmentTimes(patch.occlusions ?? []).find((x) => Math.abs(x - r) < 5e-4);
    if (hit !== undefined) patch.reperfusionH = hit;
  }
  if (patch.reperfusionH !== null && patch.reperfusionH !== undefined) patch.treatment = parseTreatment(q, patch.occlusions ?? []);
  if (q.get('d') === '1') patch.decompression = true;
  const view = q.get('view');
  if (view === '3d' || view === 'willis' || view === 'brainstem') patch.view = view;
  // honour an explicit (or scenario-default) 3D view, but not onto a blank canvas
  if (patch.view === '3d' && !hasWebGL()) patch.view = 'willis';
  // a shared case opens on the case and on what is happening at the linked time
  if (patch.occlusions?.length) {
    patch.leftTab = 'case';
    patch.rightTab = 'now';
  }
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
