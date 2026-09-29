import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Points } from 'three';
import { VESSELS } from '../anatomy';
import type { SimResult } from '../engine/simulate';
import { useApp } from '../state/store';
import { SCALE, vesselCurve } from './coords';
import { liftOnBeforeCompile, particleLift } from './liftPoints';

interface Track {
  pts: Float32Array; // sampled polyline (xyz …)
  n: number;
  /** vessel radius (mm) */
  r: number;
  lenMm: number;
  speed: number; // fraction of track per second (signed)
}

const SAMPLES = 40;

/**
 * Particles travelling along each artery; speed follows the simulated mean velocity
 * (heavily slowed down so the eye can follow), direction follows the sign of flow.
 */
export function FlowParticles({ sim }: { sim: SimResult }) {
  const layers = useApp((s) => s.layers);
  const ref = useRef<Points>(null);

  const { tracks, owner, phase, geom } = useMemo(() => {
    const tracks: Track[] = [];
    const owner: number[] = [];
    const phase: number[] = [];
    for (const v of VESSELS) {
      if (v.visualOnly) continue;
      if (v.group === 'extracranial' && !layers.neck) continue;
      const q = sim.hemo.vesselFlow[v.id] ?? 0;
      if (Math.abs(q) < 0.3) continue;
      const curve = vesselCurve(v);
      const lenMm = curve.getLength() / SCALE;
      const pts = new Float32Array(SAMPLES * 3);
      for (let i = 0; i < SAMPLES; i++) {
        const p = curve.getPointAt(i / (SAMPLES - 1));
        pts[i * 3] = p.x;
        pts[i * 3 + 1] = p.y;
        pts[i * 3 + 2] = p.z;
      }
      // mean velocity (mm/s) = Q / area; shown ~40x slower and clamped
      const area = Math.PI * v.r * v.r * (v.n ?? 1);
      const vel = ((Math.abs(q) * 1000) / 60 / area) * 0.025;
      const mmps = Math.max(3, Math.min(35, vel));
      const t: Track = { pts, n: SAMPLES, r: v.r, lenMm, speed: (Math.sign(q) * mmps) / lenMm };
      const ti = tracks.push(t) - 1;
      const count = Math.max(1, Math.min(18, Math.round(lenMm / 7)));
      for (let k = 0; k < count; k++) {
        owner.push(ti);
        phase.push((k + Math.random() * 0.5) / count);
      }
    }
    const geom = new BufferGeometry();
    geom.setAttribute('position', new BufferAttribute(new Float32Array(owner.length * 3), 3));
    geom.setAttribute('lift', new BufferAttribute(Float32Array.from(owner, (ti) => particleLift(tracks[ti].r, SCALE)), 1));
    return { tracks, owner, phase, geom };
  }, [sim.hemo, layers.neck]);

  useEffect(() => () => geom.dispose(), [geom]);

  useFrame((state, dt) => {
    if (!ref.current) return;
    state.invalidate();
    const pos = geom.getAttribute('position') as BufferAttribute;
    const arr = pos.array as Float32Array;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < owner.length; i++) {
      const t = tracks[owner[i]];
      let ph = phase[i] + t.speed * d;
      ph -= Math.floor(ph);
      phase[i] = ph;
      const f = ph * (t.n - 1);
      const j = Math.min(t.n - 2, Math.floor(f));
      const a = f - j;
      arr[i * 3] = t.pts[j * 3] + (t.pts[j * 3 + 3] - t.pts[j * 3]) * a;
      arr[i * 3 + 1] = t.pts[j * 3 + 1] + (t.pts[j * 3 + 4] - t.pts[j * 3 + 1]) * a;
      arr[i * 3 + 2] = t.pts[j * 3 + 2] + (t.pts[j * 3 + 5] - t.pts[j * 3 + 2]) * a;
    }
    pos.needsUpdate = true;
  });

  if (!layers.flow || !layers.vessels) return null;
  return (
    <points ref={ref} geometry={geom} renderOrder={3}>
      {/* depth-tested: lifted out of their own tube, hidden behind the brain (liftPoints.ts) */}
      <pointsMaterial
        size={0.11}
        color="#fff3c4"
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={AdditiveBlending}
        sizeAttenuation
        onBeforeCompile={liftOnBeforeCompile}
      />
    </points>
  );
}
