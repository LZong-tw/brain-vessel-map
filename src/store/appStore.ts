/**
 * Zustand 全域狀態管理
 * Zustand global state management
 */

import { create } from 'zustand';
import type { OcclusionResult } from '../types/vessel';
import type { Language } from '../i18n/translations';
import { RuleBasedOcclusionEngine } from '../engine/OcclusionEngine';
import { vessels } from '../data/vessels';

interface LayerVisibility {
  cerebrum: boolean;
  cerebellum: boolean;
  brainstem: boolean;
  vessels: boolean;
}

interface AppState {
  // Language
  language: Language;
  setLanguage: (language: Language) => void;

  // Blocked vessels
  blockedVessels: Set<string>;
  toggleVesselBlock: (vesselId: string) => void;
  resetBlocked: () => void;

  // Occlusion results
  occlusionResult: OcclusionResult | null;

  // Layer visibility
  layers: LayerVisibility;
  toggleLayer: (layer: keyof LayerVisibility) => void;

  // Selected vessel for highlighting
  hoveredVessel: string | null;
  setHoveredVessel: (vesselId: string | null) => void;
}

const occlusionEngine = new RuleBasedOcclusionEngine();

export const useAppStore = create<AppState>((set, get) => ({
  language: 'zh-TW',
  setLanguage: (language) => set({ language }),

  blockedVessels: new Set<string>(),
  toggleVesselBlock: (vesselId) => {
    const { blockedVessels } = get();
    const newBlocked = new Set(blockedVessels);
    
    if (newBlocked.has(vesselId)) {
      newBlocked.delete(vesselId);
    } else {
      newBlocked.add(vesselId);
    }

    // Recalculate occlusion
    const occlusionResult =
      newBlocked.size > 0
        ? occlusionEngine.calculateOcclusion(Array.from(newBlocked), vessels)
        : null;

    set({ blockedVessels: newBlocked, occlusionResult });
  },

  resetBlocked: () => set({ blockedVessels: new Set(), occlusionResult: null }),

  occlusionResult: null,

  layers: {
    cerebrum: true,
    cerebellum: true,
    brainstem: true,
    vessels: true,
  },
  toggleLayer: (layer) =>
    set((state) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),

  hoveredVessel: null,
  setHoveredVessel: (vesselId) => set({ hoveredVessel: vesselId }),
}));
