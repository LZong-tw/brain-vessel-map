import { useMemo } from 'react';
import { tr } from '../anatomy';
import type { SimResult } from '../engine/simulate';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { SEV_FILL, SWELL_FILL, SYSTEM_LABEL, SYSTEM_ORDER, fmtMl, midlineShiftOf, severityBySystem, swellingLevel, swellingVolumeOf } from '../ui/format';
import { StopGrid, type StopRow } from './StopGrid';

/**
 * Heat-map of the functions (symptom systems) affected at every time stop, plus whole-brain
 * swelling, so the course of the stroke can be read at a glance.
 */
export function FunctionTimeline({ series }: { series: SimResult[] }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const rows = useMemo(() => {
    const perStop = series.map((s) => severityBySystem(s.symptoms));
    const out: StopRow[] = [];
    for (const sys of SYSTEM_ORDER) {
      const levels = perStop.map((m) => m[sys] ?? 0);
      if (!levels.some((x) => x > 0)) continue;
      out.push({
        key: sys,
        label: t.systemShort[sys],
        title: tr(SYSTEM_LABEL[sys], lang),
        cells: levels.map((lv) => ({
          color: SEV_FILL[lv] ?? null,
          title: `${tr(SYSTEM_LABEL[sys], lang)} — ${t.sevWords[lv]}${lv > 0 ? ` (${lv}/3)` : ''}`,
        })),
      });
    }
    const swell = series.map((s) => {
      const mm = midlineShiftOf(s);
      const ml = swellingVolumeOf(s.edema);
      return { mm, ml, level: swellingLevel(mm, ml) };
    });
    if (swell.some((x) => x.level > 0)) {
      out.push({
        key: 'swelling',
        label: t.rowShift,
        title: `${t.swelling} / ${t.midlineShift}`,
        cells: swell.map((x) => ({
          color: SWELL_FILL[x.level] ?? null,
          title:
            [x.mm >= 0.5 ? t.shiftCell(x.mm.toFixed(1)) : '', x.ml >= 1 ? t.swellCell(fmtMl(x.ml)) : ''].filter(Boolean).join(' · ') ||
            t.sevWords[0],
        })),
      });
    }
    return out;
  }, [series, t, lang]);

  return (
    <section className="func-timeline">
      <h3>{t.funcTimeline}</h3>
      {rows.length === 0 ? (
        <p className="muted small">{t.noSymptoms}</p>
      ) : (
        <>
          <StopGrid rows={rows} label={t.funcTimeline} />
          <div className="sg-legend small muted">
            {[1, 2, 3].map((lv) => (
              <span key={lv}>
                <span className="sw" style={{ background: SEV_FILL[lv] ?? undefined }} />
                {t.sevWords[lv]}
              </span>
            ))}
            {rows.some((r) => r.key === 'swelling') && (
              <span>
                <span className="sw" style={{ background: SWELL_FILL[2] ?? undefined }} />
                {t.rowShift}
              </span>
            )}
          </div>
          <p className="muted small">{t.funcTimelineHint}</p>
        </>
      )}
    </section>
  );
}
