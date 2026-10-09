import { usesLatinSpacing } from '../i18n/locales';
import { useMemo, useState } from 'react';
import { REGION_BY_ID, regionName, tr } from '../anatomy';
import type { SymptomSystem } from '../anatomy';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { TIME_STOPS } from '../anatomy/timeline';
import type { SymptomItem } from '../engine/clinical';
import type { SimResult } from '../engine/simulate';
import { CELL_DETAIL_UI } from '../i18n/uiCellDetail';
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
  symptomLabel,
  systemOf,
} from '../ui/format';
import { systemCellDetail } from '../ui/cellDetail';
import { COMPENSATION_SHOWN, UNEXAMINABLE_FILL, compensatedShare, nihssFill, unexaminableHeading, withHatch } from '../ui/recoveryFormat';
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
  const [picked, setPicked] = useState<string | null>(null);
  const { rows, hatched, unexaminable } = useMemo(() => {
    const perStop = series.map((s) => severityBySystem(s.symptoms));
    const compStop = series.map(compensatedSystems);
    const out: StopRow[] = [];
    let anyHatch = false;
    /** the signs that cannot be examined, at the stops where a whole system is drawn as such */
    const anyUnexaminable: SymptomItem[] = [];
    for (const sys of SYSTEM_ORDER) {
      const levels = perStop.map((m) => m[sys] ?? 0);
      // what the lesion gives in this system but cannot be examined at that stop (X1-2)
      const hidden = series.map((s) => s.unexaminable.filter((x) => systemOf(x.id) === sys));
      if (!levels.some((x) => x > 0) && !hidden.some((h) => h.length > 0)) continue;
      out.push({
        key: sys,
        label: t.systemShort[sys],
        title: tr(SYSTEM_LABEL[sys], lang),
        cells: levels.map((lv, i) => {
          const fill = SEV_FILL[lv] ?? null;
          const comp = fill !== null && compStop[i].has(sys);
          anyHatch ||= comp;
          const level = lv > 0 || !hidden[i].length ? `${t.sevWords[lv]}${lv > 0 ? ` (${lv}/3)` : ''}` : '';
          const notExamined = hidden[i].length
            ? `${unexaminableHeading(hidden[i], lang).label}${usesLatinSpacing(lang) ? ': ' : '：'}${hidden[i].map((x) => symptomLabel(x, lang, t)).join(usesLatinSpacing(lang) ? '; ' : '、')}`
            : '';
          const title = `${tr(SYSTEM_LABEL[sys], lang)} — ${[level, notExamined].filter(Boolean).join(' · ')}`;
          // a stop at which every deficit of the system cannot be examined is not drawn as "none"
          const color = fill ? (comp ? withHatch(fill) : fill) : hidden[i].length ? UNEXAMINABLE_FILL : null;
          if (!fill) anyUnexaminable.push(...hidden[i]);
          return { color, title: comp ? `${title} · ${rt.hatchCell}` : title };
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
    return { rows: out, hatched: anyHatch, unexaminable: anyUnexaminable.length ? unexaminableHeading(anyUnexaminable, lang) : null };
  }, [series, t, rt, lang]);

  return (
    <section className="func-timeline">
      <h3>{t.funcTimeline}</h3>
      {rows.length === 0 ? (
        <p className="muted small">{t.noSymptoms}</p>
      ) : (
        <>
          <StopGrid rows={rows} label={t.funcTimeline} onPickCell={(key) => setPicked(key)} selectedRow={picked} />
          {picked && rows.some((r) => r.key === picked) && <CellDetailBox rowKey={picked} series={series} onClose={() => setPicked(null)} />}
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
            {unexaminable && (
              <span title={unexaminable.title}>
                <span className="sw" style={{ background: UNEXAMINABLE_FILL }} />
                {unexaminable.label}
              </span>
            )}
            {rows.some((r) => r.key === 'swelling') && (
              <span>
                <span className="sw" style={{ background: SWELL_FILL[2] ?? undefined }} />
                {t.rowShift}
              </span>
            )}
          </div>
          <p className="muted small">{picked ? t.funcTimelineHint : CELL_DETAIL_UI[lang].hint}</p>
          {hatched && <p className="rec-caveat small">{rt.caveat}</p>}
        </>
      )}
    </section>
  );
}

/** What lies behind the selected heat-map cell (row = a function system, column = the current time). */
function CellDetailBox({ rowKey, series, onClose }: { rowKey: string; series: SimResult[]; onClose: () => void }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const index = useApp((s) => s.tIndex);
  const select = useApp((s) => s.select);
  const setRightTab = useApp((s) => s.setRightTab);
  const ct = CELL_DETAIL_UI[lang];
  const sim = series[index];
  const time = tr(TIME_STOPS[index].label, lang);
  const sideWord = (side: 'r' | 'l' | 'both' | null) => (side ? t.bodySide[side] : '');
  const openRegion = (id: string) => {
    select({ kind: 'region', id });
    setRightTab('details');
  };
  let heading: string;
  let body: JSX.Element;
  if (rowKey === 'swelling') {
    heading = `${t.swelling} / ${t.midlineShift}`;
    body = <p className="small">{ct.swelling(midlineShiftOf(sim).toFixed(1), fmtMl(swellingVolumeOf(sim.edema)))}</p>;
  } else if (rowKey === 'nihss') {
    heading = RECOVERY_UI[lang].rowNihss;
    body = <p className="small">{ct.nihss(sim.nihss.total)}</p>;
  } else {
    const system = rowKey as SymptomSystem;
    const d = systemCellDetail(series, index, system);
    heading = tr(SYSTEM_LABEL[system], lang);
    body = (
      <>
        {d.items.length === 0 ? (
          d.unexaminable.length === 0 && <p className="small muted">{ct.none}</p>
        ) : (
          <ul className="cd-list">
            {d.items.map((s) => {
              const sym = SYMPTOM_BY_ID[s.id];
              return (
                <li key={`${s.id}|${s.side ?? ''}`}>
                  <span className="sw" style={{ background: SEV_FILL[s.sev] ?? undefined }} />
                  <span className="cd-name">
                    {sym ? tr(sym.name, lang) : s.id}
                    {s.side && `（${sideWord(s.side)}）`}
                  </span>{' '}
                  <span className="muted small">{t.sevWords[s.sev]}</span>{' '}
                  {index > 0 && s.change !== 'same' && <span className={`badge cd-${s.change}`}>{ct.change[s.change]}</span>}
                  {s.compensated >= COMPENSATION_SHOWN && <span className="badge">{ct.compensated(Math.round(s.compensated * 100))}</span>}
                  {(s.regions.length > 0 || s.events.length > 0) && (
                    <div className="small muted cd-src">
                      {s.regions.length > 0 && (
                        <>
                          {ct.from}{' '}
                          <span className="chips small">
                            {s.regions.map((rid) =>
                              REGION_BY_ID[rid] ? (
                                <button key={rid} type="button" className="chip" onClick={() => openRegion(rid)}>
                                  {regionName(REGION_BY_ID[rid], lang)}
                                </button>
                              ) : null,
                            )}
                          </span>
                        </>
                      )}
                      {s.events.length > 0 && (
                        <>
                          {' '}
                          {ct.fromEvent}：
                          {s.events
                            .map((id) => sim.cascade.events.find((e) => e.id === id))
                            .filter((e) => !!e)
                            .map((e) => tr(e!.title, lang))
                            .join('、')}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {d.unexaminable.length > 0 && (
          <p className="small muted cd-unexaminable" title={unexaminableHeading(d.unexaminable, lang).title}>
            {ct.unexaminable(unexaminableHeading(d.unexaminable, lang).label)}：
            {d.unexaminable.map((s) => `${SYMPTOM_BY_ID[s.id] ? tr(SYMPTOM_BY_ID[s.id].name, lang) : s.id}${s.side ? `（${sideWord(s.side)}）` : ''}`).join('、')}
          </p>
        )}
        {d.resolved.length > 0 && (
          <p className="small muted">
            {ct.resolved}：
            {d.resolved.map((s) => `${SYMPTOM_BY_ID[s.id] ? tr(SYMPTOM_BY_ID[s.id].name, lang) : s.id}${s.side ? `（${sideWord(s.side)}）` : ''}`).join('、')}
          </p>
        )}
      </>
    );
  }
  return (
    <div className="cell-detail" role="region" aria-live="polite" aria-label={`${heading} · ${time}`}>
      <div className="cd-head">
        <strong>
          {heading} · {time}
        </strong>
        <button type="button" className="btn-icon" aria-label={ct.close} title={ct.close} onClick={onClose}>
          ×
        </button>
      </div>
      {body}
    </div>
  );
}
