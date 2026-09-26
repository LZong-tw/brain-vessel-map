import { useEffect } from 'react';
import { tr } from '../anatomy';
import { PHASE_LABEL, TIME_STOPS, formatHours, phaseOf } from '../anatomy/timeline';
import type { SimResult } from '../engine/simulate';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';

export function Timeline({ sim }: { sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const tIndex = useApp((s) => s.tIndex);
  const setTIndex = useApp((s) => s.setTIndex);
  const playing = useApp((s) => s.playing);
  const setPlaying = useApp((s) => s.setPlaying);
  const reperfusionH = useApp((s) => s.reperfusionH);
  const active = useApp((s) => s.occlusions.length > 0 || s.map < 70);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      const i = useApp.getState().tIndex;
      if (i >= TIME_STOPS.length - 1) {
        useApp.getState().setPlaying(false);
        return;
      }
      useApp.getState().setTIndex(i + 1);
    }, 1300);
    return () => window.clearInterval(id);
  }, [playing]);

  if (!active) return null;
  const h = TIME_STOPS[tIndex].h;
  const n = TIME_STOPS.length - 1;
  const eventMarks = sim.cascade.events
    .filter((e) => e.kind === 'secondary' || e.severity === 'danger')
    .map((e) => {
      let i = 0;
      TIME_STOPS.forEach((s, k) => {
        if (s.h <= e.onsetH) i = k;
      });
      return { i, id: e.id, sev: e.severity };
    });
  const repIdx = reperfusionH === null ? null : TIME_STOPS.findIndex((s) => s.h >= reperfusionH);
  return (
    <div className="timeline" role="group" aria-label={t.time}>
      <button
        className="btn play"
        onClick={() => {
          if (!playing && tIndex >= n) setTIndex(0);
          setPlaying(!playing);
        }}
        aria-label={playing ? t.pause : t.play}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="tl-main">
        <div className="tl-head">
          <strong>{formatHours(h, lang)}</strong>
          <span className="muted">{tr(PHASE_LABEL[phaseOf(h)], lang)}</span>
        </div>
        <div className="tl-track">
          <input
            type="range"
            min={0}
            max={n}
            step={1}
            value={tIndex}
            onChange={(e) => {
              setPlaying(false);
              setTIndex(Number(e.target.value));
            }}
            aria-label={t.time}
            aria-valuetext={formatHours(h, lang)}
          />
          <div className="tl-marks" aria-hidden="true">
            {eventMarks.map((m) => (
              <span key={m.id} className={`tl-mark ${m.sev}`} style={{ left: `${(m.i / n) * 100}%` }} />
            ))}
            {repIdx !== null && repIdx >= 0 && <span className="tl-mark reperf" style={{ left: `${(repIdx / n) * 100}%` }} />}
          </div>
          <div className="tl-labels" aria-hidden="true">
            {TIME_STOPS.map((s, i) =>
              (i % 2 === 0 && i < n - 1) || i === n ? (
                <span
                  key={s.h}
                  className={i === 0 ? 'first' : i === n ? 'last' : i % 4 !== 0 ? 'minor' : undefined}
                  style={{ left: `${(i / n) * 100}%` }}
                >
                  {tr(s.label, lang)}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
