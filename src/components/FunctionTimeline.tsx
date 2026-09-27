import { useMemo } from 'react';
import { tr } from '../anatomy';
import type { SymptomSystem } from '../anatomy';
import type { SimResult } from '../engine/simulate';
import { RECOVERY_UI } from '../i18n/uiRecovery';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import {
  SEV_FILL,
  SWELL_FILL,
  SYSTEM_LABEL,
  SYSTEM_ORDER,
  fmtMl,
  midlineShiftOf,
  severityBySystem,
  swellingLevel,
  swellingVolumeOf,
  systemOf,
} from '../ui/format';
import { COMPENSATION_SHOWN, compensatedShare, nihssFill, withHatch } from '../ui/recoveryFormat';
import { StopGrid, type StopRow } from './StopGrid';

/** systems in which some deficit is partly compensated by other pathways */
function compensatedSystems(s: SimResult): Set<SymptomSystem> {
  const out = new Set<SymptomSystem>();
  for (const sy of s.symptoms) if (compensatedShare(sy) >= COMPENSATION_SHOWN) out.add(systemOf(sy.id));
  return out;
}

/**
 * Heat-map of the functions (symptom systems) affected at every time stop, plus whole-brain
 * swelling and the NIHSS estimate, so the course of the stroke — including recovery — can be read
 * at a glance. Hatched cells: part of that system's deficit has been taken over by other pathways.
 */
export function FunctionTimeline({ series }: { series: SimResult[] }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const rt = RECOVERY_UI[lang];
  const { rows, hatched } = useMemo(() => {
    const perStop = series.map((s) => severityBySystem(s.symptoms));
    const compStop = series.map(compensatedSystems);
    const out: StopRow[] = [];
    let anyHatch = false;
    for (const sys of SYSTEM_ORDER) {
      const levels = perStop.map((m) => m[sys] ?? 0);
      if (!levels.some((x) => x > 0)) continue;
      out.push({
        key: sys,
        label: t.systemShort[sys],
        title: tr(SYSTEM_LABEL[sys], lang),
        cells: levels.map((lv, i) => {
          const fill = SEV_FILL[lv] ?? null;
          const comp = fill !== null && compStop[i].has(sys);
          anyHatch ||= comp;
          const title = `${tr(SYSTEM_LABEL[sys], lang)} — ${t.sevWords[lv]}${lv > 0 ? ` (${lv}/3)` : ''}`;
          return { color: fill && comp ? withHatch(fill) : fill, title: comp ? `${title} · ${rt.hatchCell}` : title };
        }),
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
    if (out.length && series.some((s) => s.nihss.total > 0)) {
      out.push({
        key: 'nihss',
        label: rt.rowNihss,
        title: rt.rowNihss,
        cells: series.map((s) => ({ color: nihssFill(s.nihss), title: rt.nihssCell(s.nihss.total) })),
      });
    }
    return { rows: out, hatched: anyHatch };
  }, [series, t, rt, lang]);

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
            {hatched && (
              <span>
                <span className="sw" style={{ background: withHatch(SEV_FILL[2] ?? 'transparent') }} />
                {rt.hatchLegend}
              </span>
            )}
            {rows.some((r) => r.key === 'swelling') && (
              <span>
                <span className="sw" style={{ background: SWELL_FILL[2] ?? undefined }} />
                {t.rowShift}
              </span>
            )}
          </div>
          <p className="muted small">{t.funcTimelineHint}</p>
          {hatched && <p className="rec-caveat small">{rt.caveat}</p>}
        </>
      )}
    </section>
  );
}
