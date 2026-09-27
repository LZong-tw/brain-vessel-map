import { Fragment } from 'react';
import { tr } from '../anatomy';
import { PHASE_LABEL, TIME_STOPS, phaseOf, type Phase } from '../anatomy/timeline';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';

export interface StopCell {
  /** fill colour, or null for "nothing" */
  color: string | null;
  /** what the cell means (the time is prepended) */
  title: string;
}

export interface StopRow {
  key: string;
  label: string;
  /** full label for the tooltip when `label` is abbreviated */
  title?: string;
  cells: StopCell[];
}

/** time stops labelled under the grid (a few landmarks, so the labels never collide) */
const AXIS_H = [0, 1, 6, 24, 168, 4320];

/**
 * A compact rows × time-stops grid: phase band on top, one row per series, clickable columns
 * (jump the timeline) and landmark time labels underneath. The current stop is outlined.
 */
export function StopGrid({ rows, label, labelWidth = 74 }: { rows: StopRow[]; label: string; labelWidth?: number }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const current = useApp((s) => s.tIndex);
  const setTIndex = useApp((s) => s.setTIndex);
  const setPlaying = useApp((s) => s.setPlaying);
  const n = TIME_STOPS.length;
  const pick = (i: number) => {
    setPlaying(false);
    setTIndex(i);
  };
  const sep = lang === 'en' ? ': ' : '：';
  const phases: { phase: Phase; from: number; to: number }[] = [];
  TIME_STOPS.forEach((s, i) => {
    const p = phaseOf(s.h);
    const last = phases[phases.length - 1];
    if (last && last.phase === p) last.to = i;
    else phases.push({ phase: p, from: i, to: i });
  });
  return (
    <div className="stop-grid" role="group" aria-label={label} style={{ gridTemplateColumns: `${labelWidth}px repeat(${n}, minmax(0, 1fr))` }}>
      <span className="sg-label" />
      {phases.map((p) => (
        <span
          key={p.phase}
          className={`sg-phase ph-${p.phase}${current >= p.from && current <= p.to ? ' cur' : ''}`}
          style={{ gridColumn: `${p.from + 2} / ${p.to + 3}` }}
          title={tr(PHASE_LABEL[p.phase], lang)}
        >
          {t.phaseShort[p.phase]}
        </span>
      ))}
      {rows.map((r) => (
        <Fragment key={r.key}>
          <span className="sg-label" title={r.title ?? r.label}>
            {r.label}
          </span>
          {r.cells.map((c, i) => (
            <span
              key={i}
              className={`sg-cell${i === current ? ' cur' : ''}${c.color ? '' : ' empty'}`}
              style={c.color ? { background: c.color } : undefined}
              title={`${tr(TIME_STOPS[i].label, lang)}${sep}${c.title}`}
              onClick={() => pick(i)}
            />
          ))}
        </Fragment>
      ))}
      <span className="sg-label" />
      {TIME_STOPS.map((s, i) => (
        <button
          key={s.h}
          className={`sg-tick${i === current ? ' cur' : ''}`}
          aria-pressed={i === current}
          aria-label={t.jumpTo(tr(s.label, lang))}
          title={tr(s.label, lang)}
          onClick={() => pick(i)}
        />
      ))}
      <span className="sg-label" />
      <div className="sg-axis" aria-hidden="true" style={{ gridColumn: `2 / ${n + 2}` }}>
        {AXIS_H.map((h) => {
          const i = TIME_STOPS.findIndex((s) => s.h === h);
          if (i < 0) return null;
          return (
            <span
              key={h}
              className={i === 0 ? 'first' : i === n - 1 ? 'last' : undefined}
              style={i === 0 ? { left: 0 } : i === n - 1 ? { right: 0 } : { left: `${((i + 0.5) / n) * 100}%` }}
            >
              {i === 0 ? '0' : tr(TIME_STOPS[i].label, lang)}
            </span>
          );
        })}
      </div>
    </div>
  );
}
