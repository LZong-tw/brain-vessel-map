/**
 * Global application state (zustand).
 */

import { create } from 'zustand';
import type { CameraView } from '../anatomy/scenarios';
import { SCENARIO_BY_ID } from '../anatomy/scenarios';
import { TIME_STOPS } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import { VARIANT_BY_ID } from '../anatomy/variants';
import type { EmbolusResult, EmbolusSource } from '../engine/embolus';
import type { CollateralGrade, Occlusion } from '../engine/hemodynamics';
import { endOf, fitSchedule, startOf, tidy } from '../engine/schedule';
import { DEFAULT_TREATMENT, type TreatmentOptions } from '../engine/treatment';
import { defaultView, hasWebGL } from './webgl';
import { preferredLanguage } from '../i18n/locales';

/** 'structure' = non-perfused anatomy shown for orientation (currently the ventricles) */
export type Selection = { kind: 'vessel' | 'region' | 'structure'; id: string } | null;
export type ViewMode = '3d' | 'willis' | 'brainstem' | 'slices';
export type ColorMode = 'state' | 'territory' | 'anatomy' | 'edema';
/** display multiplier for swelling / midline shift in 3D: 1 = true scale, 3 and 5 exaggerate for teaching */
export type EdemaScale = 1 | 3 | 5;
/** 'case' = the case being simulated (conditions, events, treatment); 'scenarios' = templates */
export type LeftTab = 'case' | 'scenarios' | 'vessels' | 'view';
/** 'now' = at the displayed time; 'final' = the end of the course; 'details' = the selected region or vessel */
export type RightTab = 'now' | 'final' | 'details';

export interface Layers {
  cortex: boolean;
  deep: boolean;
  cerebellum: boolean;
  brainstem: boolean;
  ventricles: boolean;
  vessels: boolean;
  neck: boolean;
  collaterals: boolean;
  flow: boolean;
  labels: boolean;
}

export interface EmbolusRun {
  source: EmbolusSource;
  size: 'large' | 'medium' | 'small' | 'tiny';
  seed: number;
  result: EmbolusResult;
  /** animation finished */
  done: boolean;
}

export interface AppState {
  lang: Lang;
  occlusions: Occlusion[];
  variants: string[];
  map: number;
  collateral: CollateralGrade;
  tIndex: number;
  reperfusionH: number | null;
  /** how and how well the treatment at reperfusionH reopens the artery (default: completely, for good) */
  treatment: TreatmentOptions;
  decompression: boolean;
  scenario: string | null;

  selected: Selection;
  hovered: Selection;

  view: ViewMode;
  colorMode: ColorMode;
  edemaScale: EdemaScale;
  layers: Layers;
  hemis: { r: boolean; l: boolean };
  cortexOpacity: number;
  clip: { axis: 'none' | 'x' | 'y' | 'z'; pos: number };
  camera: { view: CameraView; nonce: number };
  leftTab: LeftTab;
  rightTab: RightTab;
  mobilePanel: 'none' | 'left' | 'right';
  embolus: EmbolusRun | null;
  playing: boolean;
  modal: 'none' | 'disclaimer' | 'befast' | 'about';

  setLang: (l: Lang) => void;
  toggleOcclusion: (vessel: string, severity?: number) => void;
  /** set a vessel's occlusion (null removes every phase of it); a single phase keeps its timing */
  setOcclusion: (vessel: string, severity: number | null, branch?: boolean) => void;
  /** change one occlusion (phase) of the list; ignored if its vessel's windows would overlap */
  updateOcclusion: (index: number, patch: Partial<Occlusion>) => void;
  removeOcclusionAt: (index: number) => void;
  /** a later phase of a vessel: a complete occlusion from `fromH` (the previous phase ends then) */
  addOcclusionPhase: (vessel: string, fromH: number) => void;
  clearOcclusions: () => void;
  toggleVariant: (id: string) => void;
  setMap: (v: number) => void;
  setCollateral: (c: CollateralGrade) => void;
  setTIndex: (i: number) => void;
  /** clearing the reperfusion time also resets the treatment details */
  setReperfusion: (h: number | null) => void;
  /** change some treatment details, keeping the others */
  setTreatment: (patch: Partial<TreatmentOptions>) => void;
  setDecompression: (v: boolean) => void;
  loadScenario: (id: string) => void;
  /** add a scenario's occlusions to the current ones (vessels already occluded are kept as they are); settings stay */
  addScenario: (id: string) => void;
  select: (s: Selection) => void;
  hover: (s: Selection) => void;
  setView: (v: ViewMode) => void;
  setColorMode: (m: ColorMode) => void;
  setEdemaScale: (k: EdemaScale) => void;
  toggleLayer: (k: keyof Layers) => void;
  toggleHemi: (s: 'r' | 'l') => void;
  setCortexOpacity: (v: number) => void;
  setClip: (c: Partial<AppState['clip']>) => void;
  requestCamera: (v: CameraView) => void;
  setLeftTab: (t: LeftTab) => void;
  setRightTab: (t: RightTab) => void;
  setMobilePanel: (p: AppState['mobilePanel']) => void;
  startEmbolus: (run: Omit<EmbolusRun, 'done'>) => void;
  finishEmbolus: () => void;
  setPlaying: (p: boolean) => void;
  setModal: (m: AppState['modal']) => void;
  resetAll: () => void;
}

const DEFAULT_LAYERS: Layers = {
  cortex: true,
  deep: true,
  cerebellum: true,
  brainstem: true,
  ventricles: false,
  vessels: true,
  neck: false,
  collaterals: false,
  flow: false,
  labels: false,
};

const tIndexFor = (h: number) => {
  let best = 0;
  TIME_STOPS.forEach((s, i) => {
    if (Math.abs(s.h - h) < Math.abs(TIME_STOPS[best].h - h)) best = i;
  });
  return best;
};

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function initialLayers(): Layers {
  try {
    const saved = JSON.parse(safeGet('bvm.layers') ?? 'null') as Partial<Layers> | null;
    if (!saved || typeof saved !== 'object') return DEFAULT_LAYERS;
    const out = { ...DEFAULT_LAYERS };
    for (const k of Object.keys(DEFAULT_LAYERS) as (keyof Layers)[]) if (typeof saved[k] === 'boolean') out[k] = saved[k]!;
    return out;
  } catch {
    return DEFAULT_LAYERS;
  }
}

function safeSet(key: string, v: string) {
  try {
    window.localStorage.setItem(key, v);
  } catch {
    /* storage unavailable (private mode) */
  }
}

const initialLang = (): Lang => {
  return preferredLanguage(safeGet('bvm.lang'), typeof navigator === 'undefined' ? 'zh-TW' : navigator.language);
};

export const useApp = create<AppState>((set, get) => ({
  lang: typeof window !== 'undefined' ? initialLang() : 'zh-TW',
  occlusions: [],
  variants: [],
  map: 93,
  collateral: 'good',
  tIndex: tIndexFor(3),
  reperfusionH: null,
  treatment: DEFAULT_TREATMENT,
  decompression: false,
  scenario: null,

  selected: null,
  hovered: null,

  // first visit: default to a view that works even where WebGL is unavailable
  view: defaultView(),
  colorMode: 'state',
  edemaScale: 1,
  layers: typeof window !== 'undefined' ? initialLayers() : DEFAULT_LAYERS,
  hemis: { r: true, l: true },
  cortexOpacity: 1,
  clip: { axis: 'none', pos: 0 },
  camera: { view: 'left', nonce: 0 },
  leftTab: 'scenarios',
  rightTab: 'details',
  mobilePanel: 'none',
  embolus: null,
  playing: false,
  modal: typeof window !== 'undefined' && safeGet('bvm.disclaimer') === '1' ? 'none' : 'disclaimer',

  setLang: (lang) => {
    safeSet('bvm.lang', lang);
    document.documentElement.lang = lang;
    set({ lang });
  },
  toggleOcclusion: (vessel, severity = 1) => {
    const exists = get().occlusions.some((o) => o.vessel === vessel);
    get().setOcclusion(vessel, exists ? null : severity);
  },
  setOcclusion: (vessel, severity, branch) => {
    const cur = get().occlusions;
    const rest = cur.filter((o) => o.vessel !== vessel);
    let occlusions = rest;
    if (severity !== null) {
      const next: Occlusion = branch ? { vessel, severity: 1, branch: true } : { vessel, severity };
      const phases = cur.filter((o) => o.vessel === vessel);
      if (phases.length) {
        // keep the vessel's place in the list and the window it covers
        const from = Math.min(...phases.map(startOf));
        const ends = phases.map(endOf);
        const to = ends.includes(null) ? null : Math.max(...(ends as number[]));
        if (from > 0) next.fromH = from;
        if (to !== null) next.toH = to;
        const at = cur.findIndex((o) => o.vessel === vessel);
        occlusions = [...cur.slice(0, at).filter((o) => o.vessel !== vessel), next, ...cur.slice(at).filter((o) => o.vessel !== vessel)];
      } else occlusions = [...rest, next];
    }
    set({ occlusions, scenario: null, rightTab: occlusions.length ? get().rightTab : 'details' });
  },
  updateOcclusion: (index, patch) => {
    const cur = get().occlusions;
    const old = cur[index];
    if (!old) return;
    const o: Occlusion = { ...old, ...patch };
    // moving the start keeps the duration
    if ('fromH' in patch && !('toH' in patch) && endOf(old) !== null) o.toH = (endOf(old) as number) + startOf(o) - startOf(old);
    const occlusions = fitSchedule(
      cur.map((x, i) => (i === index ? tidy(o) : x)),
      o.vessel,
    );
    if (occlusions) set({ occlusions, scenario: null });
  },
  removeOcclusionAt: (index) => {
    const occlusions = get().occlusions.filter((_, i) => i !== index);
    set({ occlusions, scenario: null, rightTab: occlusions.length ? get().rightTab : 'details' });
  },
  addOcclusionPhase: (vessel, fromH) => {
    const cur = get().occlusions;
    const last = cur.map((o, i) => [o, i] as const).filter(([o]) => o.vessel === vessel).pop();
    if (!last) return;
    const occlusions = [...cur.slice(0, last[1] + 1), tidy({ vessel, severity: 1, fromH }), ...cur.slice(last[1] + 1)];
    const fitted = fitSchedule(occlusions, vessel);
    if (fitted) set({ occlusions: fitted, scenario: null });
  },
  clearOcclusions: () => set({ occlusions: [], scenario: null, reperfusionH: null, treatment: DEFAULT_TREATMENT, decompression: false, embolus: null }),
  toggleVariant: (id) => {
    const v = VARIANT_BY_ID[id];
    let variants = get().variants.includes(id) ? get().variants.filter((x) => x !== id) : [...get().variants, id];
    if (v?.excludes && variants.includes(id)) variants = variants.filter((x) => !v.excludes!.includes(x));
    set({ variants, scenario: null });
  },
  setMap: (map) => set({ map, scenario: null }),
  setCollateral: (collateral) => set({ collateral, scenario: null }),
  setTIndex: (tIndex) => set({ tIndex: Math.max(0, Math.min(TIME_STOPS.length - 1, tIndex)) }),
  setReperfusion: (reperfusionH) => set(reperfusionH === null ? { reperfusionH, treatment: DEFAULT_TREATMENT } : { reperfusionH }),
  setTreatment: (patch) => set({ treatment: { ...get().treatment, ...patch } }),
  setDecompression: (decompression) => set({ decompression }),
  loadScenario: (id) => {
    const s = SCENARIO_BY_ID[id];
    if (!s) return;
    set({
      scenario: id,
      occlusions: s.occlusions.map((o) => tidy({ ...o })),
      variants: s.variants ?? [],
      collateral: s.collateral ?? 'good',
      map: s.map ?? 93,
      tIndex: tIndexFor(s.tH ?? 24),
      reperfusionH: s.reperfusionH ?? null,
      treatment: DEFAULT_TREATMENT,
      decompression: s.decompression ?? false,
      embolus: null,
      rightTab: 'now',
      selected: null,
      mobilePanel: 'none',
    });
    get().requestCamera(s.view ?? get().camera.view);
  },
  addScenario: (id) => {
    const s = SCENARIO_BY_ID[id];
    if (!s) return;
    const cur = get().occlusions;
    const taken = new Set(cur.map((o) => o.vessel));
    const added = s.occlusions.filter((o) => !taken.has(o.vessel)).map((o) => tidy({ ...o }));
    if (!added.length) return;
    set({ occlusions: [...cur, ...added], scenario: null, embolus: null });
  },
  select: (selected) => set({ selected, rightTab: selected ? 'details' : get().rightTab }),
  hover: (hovered) => {
    const h = get().hovered;
    if (h?.id === hovered?.id && h?.kind === hovered?.kind) return;
    set({ hovered });
  },
  setView: (view) => {
    set({ view });
    // the embolus is animated in the 3D view only; elsewhere apply its result at once
    if (view !== '3d') get().finishEmbolus();
  },
  setColorMode: (colorMode) => set({ colorMode }),
  setEdemaScale: (edemaScale) => set({ edemaScale }),
  toggleLayer: (k) => {
    const layers = { ...get().layers, [k]: !get().layers[k] };
    // remembered per browser: which layers someone likes to see is a viewing preference
    safeSet('bvm.layers', JSON.stringify(layers));
    set({ layers });
  },
  toggleHemi: (s) => set({ hemis: { ...get().hemis, [s]: !get().hemis[s] } }),
  setCortexOpacity: (cortexOpacity) => set({ cortexOpacity }),
  setClip: (c) => set({ clip: { ...get().clip, ...c } }),
  requestCamera: (view) =>
    set({
      camera: { view, nonce: get().camera.nonce + 1 },
      // the brainstem sits between the temporal lobes — fade the cortex so it is actually visible
      ...(view === 'brainstem' && get().cortexOpacity > 0.5 ? { cortexOpacity: 0.35 } : {}),
    }),
  setLeftTab: (leftTab) => set({ leftTab }),
  setRightTab: (rightTab) => set({ rightTab }),
  setMobilePanel: (mobilePanel) => set({ mobilePanel }),
  startEmbolus: (run) => {
    // the embolus is only animated in the 3D view; without WebGL there is nothing to switch to
    // (and the 3D scene, which normally resolves the animation, may never even mount), so stay
    // on whatever view works and apply the result immediately instead of animating it
    set({ embolus: { ...run, done: false }, mobilePanel: 'none', ...(hasWebGL() ? { view: '3d' } : {}) });
    if (!hasWebGL()) get().finishEmbolus();
  },
  finishEmbolus: () => {
    const e = get().embolus;
    if (!e || e.done) return;
    const occlusions = e.result.systemic
      ? get().occlusions
      : [...get().occlusions.filter((o) => o.vessel !== e.result.lodged), { vessel: e.result.lodged, severity: 1 }];
    set({ embolus: { ...e, done: true }, occlusions, tIndex: tIndexFor(1), rightTab: 'now', scenario: null });
  },
  setPlaying: (playing) => set({ playing }),
  setModal: (modal) => {
    if (get().modal === 'disclaimer' && modal === 'none') safeSet('bvm.disclaimer', '1');
    set({ modal });
  },
  resetAll: () => {
    safeSet('bvm.layers', JSON.stringify(DEFAULT_LAYERS));
    set({
      occlusions: [],
      variants: [],
      map: 93,
      collateral: 'good',
      tIndex: tIndexFor(3),
      reperfusionH: null,
      treatment: DEFAULT_TREATMENT,
      decompression: false,
      scenario: null,
      selected: null,
      embolus: null,
      colorMode: 'state',
      edemaScale: 1,
      layers: DEFAULT_LAYERS,
      hemis: { r: true, l: true },
      cortexOpacity: 1,
      clip: { axis: 'none', pos: 0 },
    });
  },
}));

export const currentHours = (s: Pick<AppState, 'tIndex'>) => TIME_STOPS[s.tIndex].h;
