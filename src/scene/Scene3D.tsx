import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Plane, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraView } from '../anatomy/scenarios';
import type { SimResult } from '../engine/simulate';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { hasWebGL } from '../state/webgl';
import { BrainMeshes } from './BrainMeshes';
import { useBrainData } from './brainData';
import { BRAIN_CENTER, toThree } from './coords';
import { EmbolusAnimation } from './EmbolusAnimation';
import { FlowParticles } from './FlowParticles';
import { ClotMarkers, ExtraStructures } from './Markers';
import { Vessels } from './Vessels';
import { KeyboardCamera, KeyboardFocus, SceneKeyboard } from './SceneKeyboard';
import { loadMraDistal, type MraDistalData, type MraFamilyId } from './mraDistalData';
import { MraDistalVessels } from './MraDistalVessels';
import { MraDistalControls } from '../components/MraDistalControls';
import { MRA_DISTAL } from '../i18n/mraDistal';

const PRESETS: Record<CameraView, { pos: Vector3; target: Vector3 }> = {
  left: { pos: new Vector3(30, 3, -1.8), target: BRAIN_CENTER },
  right: { pos: new Vector3(-30, 3, -1.8), target: BRAIN_CENTER },
  front: { pos: new Vector3(0, 2, 26), target: BRAIN_CENTER },
  back: { pos: new Vector3(0, 2, -30), target: BRAIN_CENTER },
  // slightly posterior so the frontal pole is at the top of the screen
  top: { pos: new Vector3(0.01, 30, -4.5), target: BRAIN_CENTER },
  bottom: { pos: new Vector3(0.01, -27, 5.5), target: toThree([0, -10, -15]) },
  // antero-inferior, below the temporal pole: the ventral pons/medulla with the basilar artery
  brainstem: { pos: toThree([-25, 70, -100]), target: toThree([0, -26, -30]) },
};

function CameraRig({ events }: { events: EventTarget }) {
  const req = useApp((s) => s.camera);
  const { camera, controls, invalidate } = useThree();
  const anim = useRef<{ t: number; fromP: Vector3; fromT: Vector3; toP: Vector3; toT: Vector3 } | null>(null);
  useEffect(() => {
    const cancel = () => { anim.current = null; };
    events.addEventListener('camera-key', cancel);
    return () => events.removeEventListener('camera-key', cancel);
  }, [events]);
  useEffect(() => {
    const ctl = controls as unknown as OrbitControlsImpl | null;
    const p = PRESETS[req.view];
    if (!ctl || !p) return;
    anim.current = { t: 0, fromP: camera.position.clone(), fromT: ctl.target.clone(), toP: p.pos, toT: p.target };
    invalidate();
  }, [req, camera, controls, invalidate]);
  useFrame((_, dt) => {
    const a = anim.current;
    const ctl = controls as unknown as OrbitControlsImpl | null;
    if (!a || !ctl) return;
    a.t = Math.min(1, a.t + dt / 0.8);
    const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - (-2 * a.t + 2) ** 2 / 2;
    camera.position.lerpVectors(a.fromP, a.toP, e);
    ctl.target.lerpVectors(a.fromT, a.toT, e);
    ctl.update();
    if (a.t >= 1) anim.current = null;
    else invalidate();
  });
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#fff6ec', '#2a2f45', 0.55]} />
      <directionalLight position={[10, 18, 14]} intensity={1.35} />
      <directionalLight position={[-14, -6, -12]} intensity={0.55} color="#b8c8ff" />
    </>
  );
}

export function Scene3D({ sim }: { sim: SimResult }) {
  const t = useT();
  const { data, error } = useBrainData();
  const clip = useApp((s) => s.clip);
  const select = useApp((s) => s.select);
  const hover = useApp((s) => s.hover);
  const embolusRunning = useApp((s) => !!s.embolus && !s.embolus.done);
  const finishEmbolus = useApp((s) => s.finishEmbolus);
  const [webgl] = useState(hasWebGL);
  const [keyboardEvents] = useState(() => new EventTarget());
  const [focusPosition, setFocusPosition] = useState<Vector3 | null>(null);
  const lang = useApp((s) => s.lang);
  const layers = useApp((s) => s.layers);
  const hemis = useApp((s) => s.hemis);
  const [mraEnabled, setMraEnabled] = useState(false);
  const [mraData, setMraData] = useState<MraDistalData | null>(null);
  const [mraError, setMraError] = useState(false);
  const [mraAttempt, setMraAttempt] = useState(0);
  const [mraFamily, setMraFamily] = useState<MraFamilyId | null>(null);
  const mraActive = mraEnabled && mraData !== null;
  useEffect(() => {
    if (!mraEnabled || mraData) return;
    let active = true;
    setMraError(false);
    loadMraDistal().then(value => { if (active) setMraData(value); }).catch(() => { if (active) setMraError(true); });
    return () => { active = false; };
  }, [mraEnabled, mraData, mraAttempt]);
  const focusMra = (id: number | null) => {
    const index = id && mraData && allowedMraFamilies.includes(id as MraFamilyId) ? mraData.labels.findIndex((label, i) => label === id && clipPlanes.every(plane => plane.distanceToPoint(toThree(mraData.points[i])) >= 0)) : -1;
    setFocusPosition(index >= 0 && mraData ? toThree(mraData.points[index]) : null);
  };
  // without WebGL the embolus cannot be animated: apply its result straight away
  useEffect(() => {
    if (!webgl && embolusRunning) finishEmbolus();
  }, [webgl, embolusRunning, finishEmbolus]);
  // a hovered mesh that unmounts never fires pointer-out
  useEffect(() => () => hover(null), [hover]);
  const clipPlanes = useMemo(() => {
    if (clip.axis === 'none') return [];
    const c = clip.pos * 0.1;
    if (clip.axis === 'x') return [new Plane(new Vector3(1, 0, 0), c)];
    if (clip.axis === 'y') return [new Plane(new Vector3(0, 0, -1), c)];
    return [new Plane(new Vector3(0, -1, 0), c)];
  }, [clip]);
  const allowedMraFamilies = useMemo(() => {
    if (!mraData || !layers.vessels) return [];
    const sideVisible = new Set(mraData.groups.filter(group => group.side === 'm' || hemis[group.side]).map(group => group.id));
    const visible = new Set<MraFamilyId>();
    mraData.labels.forEach((id, index) => {
      if (sideVisible.has(id) && clipPlanes.every(plane => plane.distanceToPoint(toThree(mraData.points[index])) >= 0)) visible.add(id);
    });
    return mraData.groups.map(group => group.id).filter(id => visible.has(id));
  }, [mraData, layers.vessels, hemis, clipPlanes]);
  useEffect(() => {
    if (!mraActive) return;
    setFocusPosition(null);
    setMraFamily(family => family && !allowedMraFamilies.includes(family) ? null : family);
  }, [mraActive, allowedMraFamilies]);

  if (!webgl) return <div className="scene-message">{t.webglUnavailable}</div>;
  return (
    <div className={`scene-wrap${mraActive ? ' mra-reference-active' : ''}`}>
      <Canvas
        camera={{ position: PRESETS.left.pos.toArray(), fov: 38, near: 0.1, far: 400 }}
        // render only when something changes (camera, state, animations call invalidate())
        frameloop="demand"
        gl={{ antialias: true, localClippingEnabled: true, preserveDrawingBuffer: false }}
        dpr={[1, 2]}
        onPointerMissed={() => select(null)}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
      >
        <color attach="background" args={['#0d1017']} />
        <Lights />
        <OrbitControls makeDefault target={BRAIN_CENTER} enableDamping dampingFactor={0.08} minDistance={4} maxDistance={70} />
        <CameraRig events={keyboardEvents} />
        <KeyboardCamera events={keyboardEvents} />
        <KeyboardFocus position={focusPosition} />
        {data && <BrainMeshes data={data} sim={sim} clipPlanes={clipPlanes} />}
        {mraActive && mraData ? layers.vessels && <MraDistalVessels data={mraData} clipPlanes={clipPlanes} hemis={hemis} selectedFamily={mraFamily} /> : <Vessels sim={sim} clipPlanes={clipPlanes} />}
        <ExtraStructures sim={sim} />
        {!mraActive && <><ClotMarkers sim={sim} /><FlowParticles sim={sim} /></>}
        <group visible={!mraActive}><EmbolusAnimation /></group>
      </Canvas>
      <MraDistalControls lang={lang} enabled={mraEnabled} active={mraActive} error={mraError} selected={mraFamily}
        allowedFamilies={allowedMraFamilies}
        change={enabled => { setMraEnabled(enabled); setMraFamily(null); setFocusPosition(null); hover(null); }}
        choose={id => setMraFamily(id as MraFamilyId | null)} focus={focusMra}
        retry={() => setMraAttempt(value => value + 1)} cameraKey={key => keyboardEvents.dispatchEvent(new CustomEvent('camera-key', { detail: key }))} />
      {mraActive && <p className="mra-distal-badge" role="note">{MRA_DISTAL[lang].badge}</p>}
      <SceneKeyboard data={data} sim={sim} events={keyboardEvents} onFocus={setFocusPosition} includeVessels={!mraActive} />
      {!data && !error && <div className="scene-message loading">{t.loading}</div>}
      {error && (
        <div className="scene-message error">
          {t.loadError}: {error}
        </div>
      )}
    </div>
  );
}
