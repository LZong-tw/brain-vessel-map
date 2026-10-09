/* eslint-disable react-refresh/only-export-components -- camera and visibility helpers share this scene's keyboard contract. */
import { useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Spherical, Vector3 } from 'three';
import type { OrbitControls } from 'three-stdlib';
import { BED_BY_ID, REGION_BY_ID, VESSELS, regionName, vesselName } from '../anatomy';
import { absentVessels } from '../engine/hemodynamics';
import type { SimResult } from '../engine/simulate';
import { useApp, type AppState, type Selection } from '../state/store';
import { vesselVisual } from '../ui/vesselState';
import type { BrainData } from './brainData';
import { toThree, vesselCurve } from './coords';
import { visibleWithNeck } from './neckVisibility';
import { inlineText } from '../i18n/content';

type Target = { selection: NonNullable<Selection>; label: string; position: Vector3 };

type SceneState = Pick<AppState, 'layers' | 'hemis' | 'lang' | 'clip' | 'colorMode' | 'variants'>;
export function keyboardTargets(data: BrainData | null, sim: SimResult, state: SceneState): Target[] {
  const { layers, hemis, lang, clip } = state;
  const targets: Target[] = [];
  const seen = new Set<string>();
  const addRegion = (id: string, position: Vector3) => {
    if (seen.has(id) || !REGION_BY_ID[id]) return;
    seen.add(id);
    targets.push({ selection: { kind: 'region', id }, label: regionName(REGION_BY_ID[id], lang), position });
  };
  const unclipped = (p: Vector3) => clip.axis === 'none' ||
    (clip.axis === 'x' ? p.x : clip.axis === 'y' ? -p.z : -p.y) + clip.pos * 0.1 >= 0;
  for (const m of data?.meshes ?? []) {
    const visible = m.kind === 'cortex' ? layers.cortex && hemis[m.name.endsWith('_r') ? 'r' : 'l'] :
      m.kind === 'ventricle' ? layers.ventricles || sim.hydrocephalus || (state.colorMode === 'edema' && sim.edema.phase !== 'none') : layers[m.kind];
    if (!visible) continue;
    const positions = m.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const p = new Vector3().fromBufferAttribute(positions, i);
      if (!unclipped(p)) continue;
      if (m.kind === 'ventricle') {
        if (!seen.has('ventricles')) {
          seen.add('ventricles');
          targets.push({ selection: { kind: 'structure', id: 'ventricles' }, label: inlineText(lang, '腦室', 'Ventricles', '脑室', 'Ventrikel', '脳室'), position: p });
        }
        break;
      }
      const bed = m.bed && BED_BY_ID[data!.beds[m.bed[i]]];
      if (bed) addRegion(bed.region, p);
    }
  }
  for (const side of ['r', 'l'] as const) {
    const k = side === 'r' ? 1 : -1;
    addRegion(`retina_${side}`, toThree([31 * k, 58, -37]));
    addRegion(`inner_ear_${side}`, toThree([35 * k, -17, -38]));
    if (layers.deep) addRegion(`optic_tract_${side}`, toThree([11 * k, -5, -14]));
  }
  const absent = absentVessels(state.variants);
  if (layers.vessels) for (const v of VESSELS) {
    if (v.visualOnly || absent.has(v.id) || !visibleWithNeck(v, layers.neck)) continue;
    if (v.kind === 'collateral' && !layers.collaterals && vesselVisual(v.id, sim).state !== 'collateral_active') continue;
    if (v.pathMode === 'surface' && ['ACA', 'MCA', 'PCA', 'COLL'].includes(v.family) && !/pica|aica|sca/.test(v.baseId) && v.side !== 'm' && !hemis[v.side]) continue;
    const curve = vesselCurve(v);
    const position = curve.getPoints(80).find(unclipped);
    if (position) targets.push({ selection: { kind: 'vessel', id: v.id }, label: vesselName(v, lang), position });
  }
  return targets;
}

export function moveCamera(position: Vector3, target: Vector3, key: string): boolean {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(key)) return false;
  const s = new Spherical().setFromVector3(position.clone().sub(target));
  if (key === 'ArrowLeft') s.theta -= 0.12;
  if (key === 'ArrowRight') s.theta += 0.12;
  if (key === 'ArrowUp') s.phi -= 0.12;
  if (key === 'ArrowDown') s.phi += 0.12;
  if (key === '+' || key === '=') s.radius *= 0.9;
  if (key === '-') s.radius /= 0.9;
  s.radius = Math.max(4, Math.min(70, s.radius));
  s.makeSafe();
  position.setFromSpherical(s).add(target);
  return true;
}

export function KeyboardCamera({ events }: { events: EventTarget }) {
  const { camera, controls, invalidate } = useThree();
  useEffect(() => {
    const move = (event: Event) => {
      const ctl = controls as unknown as OrbitControls | undefined;
      if (ctl && moveCamera(camera.position, ctl.target, (event as CustomEvent<string>).detail)) {
        ctl.update();
        invalidate();
      }
    };
    events.addEventListener('camera-key', move);
    return () => events.removeEventListener('camera-key', move);
  }, [events, camera, controls, invalidate]);
  return null;
}

export function KeyboardFocus({ position }: { position: Vector3 | null }) {
  if (!position) return null;
  return <mesh position={position} renderOrder={1000}><sphereGeometry args={[0.35, 16, 12]} /><meshBasicMaterial color="#ffe38a" wireframe depthTest={false} /></mesh>;
}

export function SceneKeyboard({ data, sim, events, onFocus, includeVessels = true }: {
  data: BrainData | null; sim: SimResult; events: EventTarget; onFocus: (position: Vector3 | null) => void; includeVessels?: boolean;
}) {
  const state = useApp();
  const { layers, hemis, lang, clip, colorMode, variants } = state;
  const [open, setOpen] = useState(false);
  const targets = useMemo(() => open ? keyboardTargets(data, sim, { layers: includeVessels ? layers : { ...layers, vessels: false }, hemis, lang, clip, colorMode, variants }) : [], [open, data, sim, layers, hemis, lang, clip, colorMode, variants, includeVessels]);
  const [focused, setFocused] = useState<string | null>(null);
  useEffect(() => {
    if (focused && !targets.some((t) => `${t.selection.kind}:${t.selection.id}` === focused)) {
      setFocused(null);
      onFocus(null);
      state.hover(null);
    }
  }, [focused, targets, onFocus, state.hover]);
  return <details className="scene-keyboard" open={open} onKeyDown={(e) => {
    if (e.key === 'Escape') { e.preventDefault(); state.select(null); }
  }} onBlur={(e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) { setFocused(null); onFocus(null); state.hover(null); }
  }}>
    <summary onClick={(e) => { e.preventDefault(); setOpen(!open); }} onFocus={() => { setFocused(null); onFocus(null); state.hover(null); }}>{inlineText(lang, '鍵盤導覽', 'Keyboard navigation', '键盘导航', 'Tastaturnavigation', 'キーボード操作')}</summary>
    <p>{inlineText(lang, '相機：方向鍵旋轉，+/− 縮放。構造：Tab 或方向鍵移動焦點，Enter 選取，Esc 清除。', 'Camera: arrows rotate, +/− zoom. Structures: Tab or arrows to focus, Enter to select, Esc to clear.', '相机：方向键旋转，+/− 缩放。构造：Tab 或方向键移动焦点，Enter 选择，Esc 清除。', 'Kamera: Pfeile drehen, +/− zoomen. Strukturen: Tab oder Pfeile zum Fokussieren, Enter wählt aus, Esc hebt die Auswahl auf.', 'カメラ：矢印で回転、+/− で拡大・縮小。構造：Tab または矢印でフォーカス移動、Enter で選択、Esc で解除。')}</p>
    <button type="button" aria-label={inlineText(lang, '3D 相機', '3D camera', '3D 相机', '3D-Kamera', '3D カメラ')} onFocus={() => { setFocused(null); onFocus(null); state.hover(null); }} onKeyDown={(e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(e.key)) {
        e.preventDefault(); events.dispatchEvent(new CustomEvent('camera-key', { detail: e.key }));
      }
    }}>{inlineText(lang, '相機', 'Camera', '相机', 'Kamera', 'カメラ')}</button>
    <div className="scene-structure-list" role="group" aria-label={inlineText(lang, '解剖構造', 'Anatomical structures', '解剖构造', 'Anatomische Strukturen', '解剖学的構造')}>
      {targets.map((t, index) => <button type="button" key={`${t.selection.kind}:${t.selection.id}`} aria-pressed={state.selected?.kind === t.selection.kind && state.selected.id === t.selection.id}
        onFocus={() => { setFocused(`${t.selection.kind}:${t.selection.id}`); onFocus(t.position); state.hover(t.selection); }}
        onClick={() => state.select(t.selection)} onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); state.select(t.selection); }
          const delta = ['ArrowDown', 'ArrowRight'].includes(e.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(e.key) ? -1 : 0;
          if (delta || e.key === 'Home' || e.key === 'End') {
            e.preventDefault();
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? targets.length - 1 : (index + delta + targets.length) % targets.length;
            (e.currentTarget.parentElement!.children[next] as HTMLElement).focus();
          }
        }}>{t.label}</button>)}
    </div>
    <p role="status">{focused ? targets.find((t) => `${t.selection.kind}:${t.selection.id}` === focused)?.label : ''}</p>
  </details>;
}
