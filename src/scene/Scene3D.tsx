import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Plane, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { CameraView } from '../anatomy/scenarios';
import type { SimResult } from '../engine/simulate';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { BrainMeshes } from './BrainMeshes';
import { useBrainData } from './brainData';
import { BRAIN_CENTER, toThree } from './coords';
import { EmbolusAnimation } from './EmbolusAnimation';
import { FlowParticles } from './FlowParticles';
import { ClotMarkers, ExtraStructures } from './Markers';
import { Vessels } from './Vessels';

const PRESETS: Record<CameraView, { pos: Vector3; target: Vector3 }> = {
  left: { pos: new Vector3(30, 3, -1.8), target: BRAIN_CENTER },
  right: { pos: new Vector3(-30, 3, -1.8), target: BRAIN_CENTER },
  front: { pos: new Vector3(0, 2, 26), target: BRAIN_CENTER },
  back: { pos: new Vector3(0, 2, -30), target: BRAIN_CENTER },
  // slightly posterior so the frontal pole is at the top of the screen
  top: { pos: new Vector3(0.01, 30, -4.5), target: BRAIN_CENTER },
  bottom: { pos: new Vector3(0.01, -27, 5.5), target: toThree([0, -10, -15]) },
  // antero-inferior, below the temporal pole: the ventral pons/medulla with the basilar artery
  brainstem: { pos: toThree([-45, 55, -85]), target: toThree([0, -26, -30]) },
};

function CameraRig() {
  const req = useApp((s) => s.camera);
  const { camera, controls } = useThree();
  const anim = useRef<{ t: number; fromP: Vector3; fromT: Vector3; toP: Vector3; toT: Vector3 } | null>(null);
  useEffect(() => {
    const ctl = controls as unknown as OrbitControlsImpl | null;
    const p = PRESETS[req.view];
    if (!ctl || !p) return;
    anim.current = { t: 0, fromP: camera.position.clone(), fromT: ctl.target.clone(), toP: p.pos, toT: p.target };
  }, [req, camera, controls]);
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

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Scene3D({ sim }: { sim: SimResult }) {
  const t = useT();
  const { data, error } = useBrainData();
  const clip = useApp((s) => s.clip);
  const select = useApp((s) => s.select);
  const [webgl] = useState(hasWebGL);
  const clipPlanes = useMemo(() => {
    if (clip.axis === 'none') return [];
    const c = clip.pos * 0.1;
    if (clip.axis === 'x') return [new Plane(new Vector3(1, 0, 0), c)];
    if (clip.axis === 'y') return [new Plane(new Vector3(0, 0, -1), c)];
    return [new Plane(new Vector3(0, -1, 0), c)];
  }, [clip]);

  if (!webgl) return <div className="scene-message">{t.webglUnavailable}</div>;
  return (
    <div className="scene-wrap">
      <Canvas
        camera={{ position: PRESETS.left.pos.toArray(), fov: 38, near: 0.1, far: 400 }}
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
        <CameraRig />
        {data && <BrainMeshes data={data} sim={sim} clipPlanes={clipPlanes} />}
        <Vessels sim={sim} />
        <ExtraStructures sim={sim} />
        <ClotMarkers />
        <FlowParticles sim={sim} />
        <EmbolusAnimation />
      </Canvas>
      {!data && !error && <div className="scene-message loading">{t.loading}</div>}
      {error && (
        <div className="scene-message error">
          {t.loadError}: {error}
        </div>
      )}
    </div>
  );
}
