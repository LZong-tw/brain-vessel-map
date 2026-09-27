import { useMemo } from 'react';
import { formatHours } from '../anatomy/timeline';
import type { SymptomItem } from '../engine/clinical';
import type { SimResult } from '../engine/simulate';
import type { TissueState } from '../engine/tissue';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import {
  SEV_FILL,
  SWELL_FILL,
  pct,
  penumbraEstimate,
  regionComposition,
  regionEdema,
  regionSwellLevel,
  signedPct,
  stateFill,
  stopIndexAtOrAfter,
  stopTime,
  symptomKey,
  symptomLabel,
} from '../ui/format';
import { StopGrid, type StopRow } from './StopGrid';
import { useSimSeries } from './useSimSeries';

const COMP_ORDER: TissueState[] = ['core', 'penumbra', 'oligemia', 'salvaged', 'normal'];
const SHRINK_FILL = 'rgba(143, 184, 232, 0.55)';
const DWI_COLOR = '#d6ecff';
const T2_COLOR = '#a08cff';

const fromRegion = (sim: SimResult, id: string) => sim.symptoms.filter((s) => s.sources.includes(id));

/**
 * The selected region at the displayed time: tissue make-up, swelling, which of its functions
 * are lost / on hold / recovered, how long its penumbra may last, and a strip over all time stops.
 */
export function RegionNow({ id, sim }: { id: string; sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const active = useApp((s) => s.occlusions.length > 0 || s.map < 70);
  const series = useSimSeries();
  const tH = sim.input.tH;
  const tIndex = stopIndexAtOrAfter(tH);

  const touched = useMemo(
    () =>
      series.some((s) => {
        const r = s.regions[id];
        return (!!r && (r.dominant !== 'normal' || r.dys >= 0.02 || !!r.effect)) || regionEdema(s.edema, id).any || fromRegion(s, id).length > 0;
      }),
    [series, id],
  );

  const funcs = useMemo(() => {
    const now = fromRegion(sim, id);
    const nowKeys = new Set(now.map(symptomKey));
    const earlier = new Map<string, SymptomItem>();
    const later = new Map<string, { s: SymptomItem; i: number }>();
    series.forEach((s, i) => {
      if (i === tIndex) return;
      for (const sy of fromRegion(s, id)) {
        const k = symptomKey(sy);
        if (nowKeys.has(k)) continue;
        if (i < tIndex) earlier.set(k, sy);
        else if (!earlier.has(k) && !later.has(k)) later.set(k, { s: sy, i });
      }
    });
    return { now, earlier: [...earlier.values()], later: [...later.values()] };
  }, [series, sim, id, tIndex]);

  const rows = useMemo<StopRow[]>(() => {
    const out: StopRow[] = [
      {
        key: 'tissue',
        label: t.rowTissue,
        cells: series.map((s) => {
          const st = s.regions[id]?.dominant ?? 'normal';
          return { color: stateFill(st, s.input.tH), title: t.states[st as keyof typeof t.states] ?? st };
        }),
      },
      {
        key: 'function',
        label: t.rowFunction,
        cells: series.map((s) => {
          const syms = fromRegion(s, id);
          const lv = syms.reduce((m, x) => Math.max(m, x.sev), 0);
          const names = syms
            .sort((a, b) => b.sev - a.sev)
            .slice(0, 4)
            .map((x) => symptomLabel(x, lang, t));
          return { color: SEV_FILL[lv] ?? null, title: names.length ? names.join(lang === 'en' ? '; ' : '、') : t.funcNone };
        }),
      },
    ];
    const swell = series.map((s) => regionEdema(s.edema, id));
    if (swell.some((e) => e.any)) {
      out.push({
        key: 'swelling',
        label: t.rowSwelling,
        cells: swell.map((e) => {
          const lv = regionSwellLevel(e.swelling);
          return {
            color: lv === 0 ? null : e.swelling < 0 ? SHRINK_FILL : SWELL_FILL[lv],
            title: e.any ? t.swellingChange(signedPct(e.swelling)) : t.noSwellingNow,
          };
        }),
      });
    }
    return out;
  }, [series, id, t, lang]);

  if (!active) return null;
  if (!touched)
    return (
      <section>
        <h3>{t.nowAt(stopTime(tIndex, lang))}</h3>
        <p className="muted small">{t.regionUntouched}</p>
      </section>
    );

  const comp = regionComposition(sim, id);
  const segs = COMP_ORDER.map((k) => ({ k, v: comp[k], color: stateFill(k, tH) })).filter((x) => x.v >= 0.005);
  const ed = regionEdema(sim.edema, id);
  const est = comp.penumbra >= 0.03 ? penumbraEstimate(sim, id) : null;
  const reperf = sim.input.reperfusionH;
  // how reversible the region's current deficits are, from what its tissue is made of now
  const nowGroup: [string, string] =
    comp.core >= 0.15 && comp.penumbra >= 0.15
      ? ['mixed', t.funcMixed]
      : comp.penumbra > comp.core
        ? ['at-risk', t.funcAtRisk]
        : ['lost', t.funcLost];
  const range =
    est && est.latestH > est.soonestH * 1.3
      ? `${formatHours(est.soonestH, lang)}–${formatHours(est.latestH, lang)}`
      : est
        ? formatHours(est.soonestH, lang)
        : '';

  return (
    <>
      <section className="region-now">
        <h3>{t.nowAt(stopTime(tIndex, lang))}</h3>
        <div className="now-label small muted">{t.composition}</div>
        <div className="comp-bar" role="img" aria-label={segs.map((s) => `${t.compShort[s.k]} ${pct(s.v)}`).join(', ')}>
          {segs.map((s) => (
            <span key={s.k} style={{ width: `${s.v * 100}%`, background: s.color }} title={`${t.compShort[s.k]} ${pct(s.v)}`} />
          ))}
        </div>
        <div className="comp-legend small">
          {segs.map((s) => (
            <span key={s.k}>
              <span className="sw" style={{ background: s.color }} />
              {t.compShort[s.k]} <span className="num">{pct(s.v)}</span>
            </span>
          ))}
        </div>
        {comp.penumbra >= 0.03 && <p className="muted small">{t.compNote}</p>}

        {ed.any ? (
          <div className="edema-now">
            <div className="now-label small muted">
              {t.swelling}: <strong className={ed.swelling < 0 ? 'shrink' : 'swell'}>{t.swellingChange(signedPct(ed.swelling))}</strong>
            </div>
            {ed.cytotoxic >= 0.02 && <Meter label={t.cytotoxicLabel} v={ed.cytotoxic} color={DWI_COLOR} note={t.cytotoxicNote} />}
            {ed.vasogenic >= 0.02 && <Meter label={t.vasogenicLabel} v={ed.vasogenic} color={T2_COLOR} note={t.vasogenicNote} />}
            {ed.swelling <= -0.02 && <p className="muted small">{t.shrinkNote}</p>}
          </div>
        ) : sim.edema.phase !== 'none' ? (
          <p className="muted small">{t.noSwellingNow}</p>
        ) : null}

        {est && (
          <p className="callout eta">
            {t.penumbraEta({
              rel: pct(est.rel),
              by: range,
              left: formatHours(Math.max(0, est.soonestH - tH), lang),
              lost: pct(est.lost),
            })}
            {reperf !== null && reperf > tH && ` ${t.penumbraReperf(formatHours(reperf, lang))}`} <span className="muted">{t.estimateNote}</span>
          </p>
        )}

        <h4>{t.funcNow}</h4>
        {funcs.now.length === 0 && <p className="muted small">{t.funcNone}</p>}
        {funcs.now.length > 0 && <FuncGroup cls={nowGroup[0]} title={nowGroup[1]} items={funcs.now} />}
        {funcs.earlier.length > 0 && <FuncGroup cls="recovered" title={t.funcRecovered} items={funcs.earlier} />}
        {funcs.later.length > 0 && (
          <FuncGroup
            cls="later"
            title={t.funcLater}
            items={funcs.later.map((x) => x.s)}
            notes={funcs.later.map((x) => t.funcFrom(stopTime(x.i, lang)))}
          />
        )}
      </section>
      <section>
        <h3>{t.regionOverTime}</h3>
        <StopGrid rows={rows} label={t.regionOverTime} labelWidth={lang === 'en' ? 64 : 44} />
        <p className="muted small">{t.gridHint}</p>
      </section>
    </>
  );
}

function Meter({ label, v, color, note }: { label: string; v: number; color: string; note: string }) {
  return (
    <div className="meter">
      <div className="meter-head small">
        <span>{label}</span>
        <span className="num">{pct(v)}</span>
      </div>
      <div className="meter-bar">
        <span style={{ width: `${Math.min(1, v) * 100}%`, background: color }} />
      </div>
      <p className="muted small">{note}</p>
    </div>
  );
}

function FuncGroup({ cls, title, items, notes }: { cls: string; title: string; items: SymptomItem[]; notes?: string[] }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  return (
    <div className={`func-group ${cls}`}>
      <div className="func-title small">{title}</div>
      <ul className="bullets">
        {items.map((s, i) => (
          <li key={symptomKey(s)}>
            <span className={`sev sev${s.sev}`} aria-hidden="true" />
            {symptomLabel(s, lang, t)}
            {notes?.[i] && <span className="muted small"> · {notes[i]}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
