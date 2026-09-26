import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';
import { Vector3 } from 'three';
import { VESSEL_BY_ID } from '../anatomy';
import { useApp } from '../state/store';
import { vesselCurve } from './coords';

/** Animates the embolus along its computed route, then commits the occlusion. */
export function EmbolusAnimation() {
  const embolus = useApp((s) => s.embolus);
  const finish = useApp((s) => s.finishEmbolus);
  const ref = useRef<Mesh>(null);
  const clock = useRef(0);

  const track = useMemo(() => {
    if (!embolus || embolus.done) return null;
    const pts: Vector3[] = [];
    for (const st of embolus.result.steps) {
      const curve = vesselCurve(VESSEL_BY_ID[st.vessel]);
      const from = st.fromMid ? 0.5 : 0;
      const to = st.upto;
      const n = 16;
      for (let i = 0; i <= n; i++) {
        const u = from + ((to - from) * i) / n;
        pts.push(curve.getPointAt(st.dir === 1 ? u : 1 - u));
      }
    }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + pts[i].distanceTo(pts[i - 1]));
    clock.current = 0;
    return { pts, cum, total: cum[cum.length - 1] };
  }, [embolus]);

  useFrame((_, dt) => {
    if (!track || !ref.current) return;
    // generous clamp so slow (software-rendered) devices still finish in about the same wall time
    clock.current += Math.min(dt, 0.25);
    const duration = Math.min(7, Math.max(2.5, track.total / 5));
    const d = Math.min(1, clock.current / duration) * track.total;
    let i = 1;
    while (i < track.cum.length - 1 && track.cum[i] < d) i++;
    const a = (d - track.cum[i - 1]) / Math.max(1e-6, track.cum[i] - track.cum[i - 1]);
    ref.current.position.copy(track.pts[i - 1]).lerp(track.pts[i], a);
    if (clock.current >= duration + 0.4) finish();
  });

  if (!track || !embolus) return null;
  const size = { large: 0.21, medium: 0.15, small: 0.09, tiny: 0.06 }[embolus.size];
  return (
    <mesh ref={ref} position={track.pts[0]} renderOrder={5}>
      <sphereGeometry args={[size, 16, 12]} />
      <meshStandardMaterial color="#3b0008" emissive="#ff3355" emissiveIntensity={1.2} depthTest={false} />
    </mesh>
  );
}
