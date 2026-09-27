import { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../anatomy';
import type { Lang } from '../anatomy/types';
import { PHASE_LABEL, TIME_STOPS, formatHours, phaseOf } from '../anatomy/timeline';
import type { SimResult } from '../engine/simulate';
import { SCHEDULE_UI } from '../i18n/uiSchedule';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { formatClock, stopPosition } from '../ui/scheduleFormat';

/** the range thumb's half-width: stop i sits at 8px + i/n of the remaining width */
const INSET = 8;
/** labels are placed in this order while they fit, so landmarks win over in-between stops */
const LABEL_PRIORITY_H = [0, 4320, 1, 6, 24, 168, 720, 3, 72, 336, 12, 2160, 0.5, 2, 4.5, 48, 120, 0.25];
/** index of the first stop of the acute phase (end of the hyperacute section) */
const HYPER_END = Math.max(1, TIME_STOPS.findIndex((s) => phaseOf(s.h) !== 'hyperacute'));

/** rough width (px) of a label at the 10.5px label size */
const labelWidth = (s: string) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 10.6 : ch === ' ' ? 3 : 6.2), 0);

/** Choose which stop labels to show at this track width so that none overlap. */
function pickLabels(trackWidth: number, lang: Lang): Set<number> {
  const n = TIME_STOPS.length - 1;
  const usable = Math.max(0, trackWidth - 2 * INSET);
  const chosen: [number, number][] = [];
  const out = new Set<number>();
  const gap = 8;
  for (const h of LABEL_PRIORITY_H) {
    const i = TIME_STOPS.findIndex((s) => s.h === h);
    if (i < 0 || out.has(i)) continue;
    const w = labelWidth(tr(TIME_STOPS[i].label, lang));
    const x = (i / n) * usable;
    const span: [number, number] = i === 0 ? [0, w] : i === n ? [usable - w, usable] : [x - w / 2, x + w / 2];
    if (chosen.some(([a, b]) => span[0] < b + gap && span[1] + gap > a)) continue;
    chosen.push(span);
    out.add(i);
  }
  return out;
}

export function Timeline({ sim }: { sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const tIndex = useApp((s) => s.tIndex);
  const setTIndex = useApp((s) => s.setTIndex);
  const playing = useApp((s) => s.playing);
  const setPlaying = useApp((s) => s.setPlaying);
  const reperfusionH = useApp((s) => s.reperfusionH);
  const active = useApp((s) => s.occlusions.length > 0 || s.map < 70);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(0);

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

  // measure the track so the stop labels can be thinned out to what fits
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setTrackW(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => setTrackW(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  const shown = useMemo(() => pickLabels(trackW, lang), [trackW, lang]);

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
  // occlusions that begin later (▼) or reopen by themselves (▲), placed between the stops
  const schedMarks = sim.schedule.events
    .filter((e) => e.h > 0 && e.kind !== 'treatment')
    .map((e) => ({ key: `${e.kind}${e.index}`, kind: e.kind === 'reopen' ? 'off' : 'on', pos: stopPosition(e.h), h: e.h }));
  const sched = SCHEDULE_UI[lang];
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
        <div className="tl-track" ref={trackRef}>
          <div className="tl-bands" aria-hidden="true">
            <span
              className={`tl-band hyper${phaseOf(h) === 'hyperacute' ? ' cur' : ''}`}
              style={{ width: `calc(${(HYPER_END / n) * 100}% + 6px)` }}
              title={tr(PHASE_LABEL.hyperacute, lang)}
            />
          </div>
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
            {schedMarks.map((m) => (
              <span key={m.key} className={`tl-sched ${m.kind}`} style={{ left: `${(m.pos / n) * 100}%` }} />
            ))}
          </div>
          {schedMarks.length > 0 && (
            <span className="tl-sr">
              {schedMarks.map((m) => `${m.kind === 'on' ? sched.markOnset : sched.markReopen} ${formatClock(m.h, lang)}`).join('; ')}
            </span>
          )}
          <div className="tl-labels" aria-hidden="true">
            {TIME_STOPS.map((s, i) =>
              shown.has(i) ? (
                <span
                  key={s.h}
                  className={`${i === 0 ? 'first' : i === n ? 'last' : ''}${i === tIndex ? ' cur' : ''}`}
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
