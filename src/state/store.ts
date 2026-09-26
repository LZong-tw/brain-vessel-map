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

export type Selection = { kind: 'vessel' | 'region'; id: string } | null;
export type ViewMode = '3d' | 'willis' | 'brainstem';
export type ColorMode = 'state' | 'territory' | 'anatomy';
export type LeftTab = 'scenarios' | 'vessels' | 'settings' | 'view';
export type RightTab = 'details' | 'results';

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
  decompression: boolean;
  scenario: string | null;

  selected: Selection;
  hovered: Selection;

  view: ViewMode;
  colorMode: ColorMode;
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
  setOcclusion: (vessel: string, severity: number | null, branch?: boolean) => void;
  clearOcclusions: () => void;
  toggleVariant: (id: string) => void;
  setMap: (v: number) => void;
  setCollateral: (c: CollateralGrade) => void;
  setTIndex: (i: number) => void;
  setReperfusion: (h: number | null) => void;
  setDecompression: (v: boolean) => void;
  loadScenario: (id: string) => void;
  select: (s: Selection) => void;
  hover: (s: Selection) => void;
  setView: (v: ViewMode) => void;
  setColorMode: (m: ColorMode) => void;
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
function safeSet(key: string, v: string) {
  try {
    window.localStorage.setItem(key, v);
  } catch {
    /* storage unavailable (private mode) */
  }
}

const initialLang = (): Lang => {
  const saved = safeGet('bvm.lang');
  if (saved === 'en' || saved === 'zh-TW') return saved;
  if (typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('zh')) return 'en';
  return 'zh-TW';
};

export const useApp = create<AppState>((set, get) => ({
  lang: typeof window !== 'undefined' ? initialLang() : 'zh-TW',
  occlusions: [],
  variants: [],
  map: 93,
  collateral: 'good',
  tIndex: tIndexFor(3),
  reperfusionH: null,
  decompression: false,
  scenario: null,

  selected: null,
  hovered: null,

  view: '3d',
  colorMode: 'state',
  layers: DEFAULT_LAYERS,
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
    const rest = get().occlusions.filter((o) => o.vessel !== vessel);
    const occlusions = severity === null ? rest : [...rest, branch ? { vessel, severity: 1, branch: true } : { vessel, severity }];
    set({ occlusions, scenario: null, rightTab: occlusions.length ? get().rightTab : 'details' });
  },
  clearOcclusions: () => set({ occlusions: [], scenario: null, reperfusionH: null, decompression: false, embolus: null }),
  toggleVariant: (id) => {
    const v = VARIANT_BY_ID[id];
    let variants = get().variants.includes(id) ? get().variants.filter((x) => x !== id) : [...get().variants, id];
    if (v?.excludes && variants.includes(id)) variants = variants.filter((x) => !v.excludes!.includes(x));
    set({ variants, scenario: null });
  },
  setMap: (map) => set({ map, scenario: null }),
  setCollateral: (collateral) => set({ collateral, scenario: null }),
  setTIndex: (tIndex) => set({ tIndex: Math.max(0, Math.min(TIME_STOPS.length - 1, tIndex)) }),
  setReperfusion: (reperfusionH) => set({ reperfusionH }),
  setDecompression: (decompression) => set({ decompression }),
  loadScenario: (id) => {
    const s = SCENARIO_BY_ID[id];
    if (!s) return;
    set({
      scenario: id,
      occlusions: s.occlusions.map((o) => ({ ...o })),
      variants: s.variants ?? [],
      collateral: s.collateral ?? 'good',
      map: s.map ?? 93,
      tIndex: tIndexFor(s.tH ?? 24),
      reperfusionH: s.reperfusionH ?? null,
      decompression: s.decompression ?? false,
      embolus: null,
      rightTab: 'results',
      selected: null,
      mobilePanel: 'none',
    });
    get().requestCamera(s.view ?? get().camera.view);
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
  toggleLayer: (k) => set({ layers: { ...get().layers, [k]: !get().layers[k] } }),
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
  startEmbolus: (run) => set({ embolus: { ...run, done: false }, mobilePanel: 'none', view: '3d' }),
  finishEmbolus: () => {
    const e = get().embolus;
    if (!e || e.done) return;
    const occlusions = e.result.systemic
      ? get().occlusions
      : [...get().occlusions.filter((o) => o.vessel !== e.result.lodged), { vessel: e.result.lodged, severity: 1 }];
    set({ embolus: { ...e, done: true }, occlusions, tIndex: tIndexFor(1), rightTab: 'results', scenario: null });
  },
  setPlaying: (playing) => set({ playing }),
  setModal: (modal) => {
    if (get().modal === 'disclaimer' && modal === 'none') safeSet('bvm.disclaimer', '1');
    set({ modal });
  },
  resetAll: () =>
    set({
      occlusions: [],
      variants: [],
      map: 93,
      collateral: 'good',
      tIndex: tIndexFor(3),
      reperfusionH: null,
      decompression: false,
      scenario: null,
      selected: null,
      embolus: null,
      colorMode: 'state',
      layers: DEFAULT_LAYERS,
      hemis: { r: true, l: true },
      cortexOpacity: 1,
      clip: { axis: 'none', pos: 0 },
    }),
}));

export const currentHours = (s: Pick<AppState, 'tIndex'>) => TIME_STOPS[s.tIndex].h;
