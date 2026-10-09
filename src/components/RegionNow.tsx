import { usesLatinSpacing } from '../i18n/locales';
import { useMemo } from 'react';
import { formatHours } from '../anatomy/timeline';
import type { SymptomItem } from '../engine/clinical';
import type { SimResult } from '../engine/simulate';
import type { TissueState } from '../engine/tissue';
import { RECOVERY_UI, type RecoveryStrings } from '../i18n/uiRecovery';
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
import {
  COMPENSATED_FILL,
  COMPENSATION_SHOWN,
  SILENCED_FILL,
  SILENCED_SHOWN,
  UNEXAMINABLE_FILL,
  bottleneckSites,
  compensatedShare,
  foldedInto,
  hasNoBackup,
  peakSeverity,
  regionFunctionGroup,
  regionRecovery,
  shareLevel,
  symptomBackup,
  unexaminableHeading,
  withHatch,
  type RegionFunctionGroup,
  type RegionRecovery,
} from '../ui/recoveryFormat';
import type { BottleneckSite } from '../anatomy/redundancy';
import { StopGrid, type StopRow } from './StopGrid';
import { useSimSeries } from './useSimSeries';

const COMP_ORDER: TissueState[] = ['core', 'penumbra', 'oligemia', 'salvaged', 'normal'];
const SHRINK_FILL = 'rgba(143, 184, 232, 0.55)';
const DWI_COLOR = '#d6ecff';
const T2_COLOR = '#a08cff';
/** share of a region's function lost to dead tissue above which a vanished deficit counts as compensated rather than recovered */
const DEAD_FOR_COMPENSATION = 0.2;
/** the function lost exceeds the dead share by this much only for a lacune (W3-5) */
const LACUNE_NOTE_FROM = 0.1;

const fromRegion = (sim: SimResult, id: string) => sim.symptoms.filter((s) => s.sources.includes(id));
/** what the region gives but cannot be examined at the patient's level of consciousness (X1-2) */
const hiddenFromRegion = (sim: SimResult, id: string) => sim.unexaminable.filter((s) => s.sources.includes(id));

interface Tag {
  cls: string;
  text: string;
  title: string;
  /** e.g. "eased since its worst 3→1" */
  note: string;
}

/**
 * The selected region at the displayed time: tissue make-up, swelling, which of its functions
 * are dead / temporarily silenced / compensated / without backup, how long its penumbra may last,
 * and a strip over all time stops.
 */
export function RegionNow({ id, sim }: { id: string; sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const rt = RECOVERY_UI[lang];
  const sep = usesLatinSpacing(lang) ? ' ' : '';
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
    // not examinable now is neither recovered nor taken over (X1-2)
    const unexaminable = hiddenFromRegion(sim, id).sort((a, b) => b.sev - a.sev);
    const nowKeys = new Set([...now, ...unexaminable].map(symptomKey));
    const earlier = new Map<string, SymptomItem>();
    const later = new Map<string, { s: SymptomItem; i: number }>();
    series.forEach((s, i) => {
      if (i === tIndex) return;
      for (const sy of fromRegion(s, id)) {
        const k = symptomKey(sy);
        // (a part now listed as the broader deficit of the same side has not gone: U3-7)
        if (nowKeys.has(k) || foldedInto(sy, [...now, ...unexaminable])) continue;
        if (i < tIndex) earlier.set(k, sy);
        else if (!earlier.has(k) && !later.has(k)) later.set(k, { s: sy, i });
      }
    });
    // a deficit of dead tissue that has gone was taken over by other pathways, not recovered (a
    // lacune, small as it is, costs most of its tract's function: W3-5)
    const deadNow = (sim.regions[id]?.lost ?? 0) >= DEAD_FOR_COMPENSATION && sim.recovery.progress > 0;
    const takenOver = (s: SymptomItem) => deadNow && !hasNoBackup(s) && symptomBackup(s) !== 'exempt';
    const gone = [...earlier.values()];
    return {
      now,
      unexaminable,
      recovered: gone.filter((s) => !takenOver(s)),
      compensated: gone.filter(takenOver),
      later: [...later.values()],
      peak: peakSeverity(series.slice(0, tIndex + 1)),
    };
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
          const sep = usesLatinSpacing(lang) ? '; ' : '、';
          const names = syms
            .sort((a, b) => b.sev - a.sev)
            .slice(0, 4)
            .map((x) => symptomLabel(x, lang, t));
          const fill = SEV_FILL[lv] ?? null;
          const comp = fill !== null && syms.some((x) => compensatedShare(x) >= COMPENSATION_SHOWN);
          // a stop at which the region's deficits cannot be examined does not read "no loss" (X1-2)
          const hiddenItems = hiddenFromRegion(s, id);
          const hidden = hiddenItems.map((x) => symptomLabel(x, lang, t));
          const hiddenText = hidden.length ? `${unexaminableHeading(hiddenItems, lang).label}${usesLatinSpacing(lang) ? ': ' : '：'}${hidden.join(sep)}` : '';
          const title = [names.join(sep), hiddenText].filter(Boolean).join(sep) || t.funcNone;
          const color = fill ? (comp ? withHatch(fill) : fill) : hidden.length ? UNEXAMINABLE_FILL : null;
          return { color, title: comp ? (usesLatinSpacing(lang) ? `${title} (${rt.hatchCell})` : `${title}（${rt.hatchCell}）`) : title };
        }),
      },
    ];
    const rec = series.map((s) => regionRecovery(s, id));
    if (rec.some((r) => r.silenced >= SILENCED_SHOWN)) {
      out.push({
        key: 'silenced',
        label: rt.rowSilenced,
        title: rt.rowSilencedTitle,
        cells: rec.map((r) => ({ color: SILENCED_FILL[shareLevel(r.silenced)] ?? null, title: rt.silencedCell(pct(r.silenced)) })),
      });
    }
    if (rec.some((r) => r.compensated >= SILENCED_SHOWN)) {
      out.push({
        key: 'compensated',
        label: rt.rowCompensated,
        title: rt.rowCompensatedTitle,
        cells: rec.map((r) => ({ color: COMPENSATED_FILL[shareLevel(r.compensated)] ?? null, title: rt.compensatedCell(pct(r.compensated)) })),
      });
    }
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
  }, [series, id, t, rt, lang]);

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
  const rr = regionRecovery(sim, id);
  // how reversible the region's current deficits are, from what its tissue is made of now (tissue
  // that survived and is still regaining its function is alive, not dead: Y1-12, W2-10)
  const groups: Record<RegionFunctionGroup, [string, string]> = {
    mixed: ['mixed', t.funcMixed],
    'at-risk': ['at-risk', t.funcAtRisk],
    'dead-regaining': ['mixed silenced', rt.funcDeadAndRegaining],
    regaining: ['silenced', rt.funcRegaining],
    'dead-silenced': ['mixed silenced', rt.funcDeadAndSilenced],
    silenced: ['silenced', rt.funcSilenced],
    'lost-compensating': ['lost compensating', rt.funcLostCompensating],
    lost: ['lost', t.funcLost],
  };
  const nowGroup = groups[regionFunctionGroup(comp, rr)];
  const noBackupNow = funcs.now.filter(hasNoBackup);
  const bilateral = funcs.now.some((s) => s.recovery?.bilateral && symptomBackup(s) !== 'exempt' && !hasNoBackup(s));
  const bottleneck = funcs.now.some((s) => s.recovery?.bottleneck && !hasNoBackup(s));
  // where both sides were cut together (Z2-10)
  const sites = bottleneckSites(funcs.now.filter((s) => !hasNoBackup(s)));
  // compensation line: how much has been taken over, or — when both sides are cut at the ventral
  // pons — that little will be
  const compLine: 'comp' | 'little' | null =
    rr.compensated >= COMPENSATION_SHOWN
      ? 'comp'
      : bottleneck && rr.dead >= 0.1 && tH >= 24
        ? 'little'
        : rr.compensated >= SILENCED_SHOWN
          ? 'comp'
          : null;
  const showStatus = rr.dead >= 0.02 || rr.silenced >= SILENCED_SHOWN || rr.regaining >= SILENCED_SHOWN || compLine !== null;
  const tagOf = (s: SymptomItem): Tag | null => {
    const kind = symptomBackup(s);
    const peak = funcs.peak.get(symptomKey(s)) ?? s.sev;
    const eased = peak > s.sev ? rt.tagEased(peak, s.sev) : '';
    if (hasNoBackup(s) && rr.dead >= 0.1)
      return { cls: 'nobackup', text: rt.tagNoBackup, title: rt.kindExplain[kind], note: eased && rt.tagEasedNoBackup(peak, s.sev) };
    if (compensatedShare(s) >= COMPENSATION_SHOWN) {
      const why = s.recovery?.bottleneck ? sep + rt.bottleneckNote(bottleneckSites([s])) : s.recovery?.bilateral ? sep + rt.bilateralNote : '';
      return { cls: 'comp', text: rt.tagCompensated(pct(compensatedShare(s))), title: `${rt.kindExplain[kind]}${why}`, note: eased };
    }
    return eased ? { cls: '', text: '', title: '', note: eased } : null;
  };
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

        {showStatus && (
          <RecoveryStatus
            rr={rr}
            rt={rt}
            noBackup={noBackupNow.map((s) => symptomLabel(s, lang, t))}
            compLine={compLine}
            bilateral={bilateral}
            bottleneck={bottleneck}
            sites={sites}
          />
        )}

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
        {funcs.now.length === 0 && funcs.unexaminable.length === 0 && <p className="muted small">{t.funcNone}</p>}
        {funcs.now.length > 0 && <FuncGroup cls={nowGroup[0]} title={nowGroup[1]} items={funcs.now} tags={funcs.now.map(tagOf)} />}
        {funcs.unexaminable.length > 0 && (
          <FuncGroup
            cls="unexaminable"
            title={unexaminableHeading(funcs.unexaminable, lang).label}
            titleHint={unexaminableHeading(funcs.unexaminable, lang).title}
            items={funcs.unexaminable}
          />
        )}
        {funcs.compensated.length > 0 && <FuncGroup cls="compensated" title={rt.funcCompensatedGone} items={funcs.compensated} />}
        {funcs.recovered.length > 0 && <FuncGroup cls="recovered" title={t.funcRecovered} items={funcs.recovered} />}
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
        <StopGrid rows={rows} label={t.regionOverTime} labelWidth={usesLatinSpacing(lang) ? 64 : 44} />
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

function FuncGroup({
  cls,
  title,
  titleHint,
  items,
  notes,
  tags,
}: {
  cls: string;
  title: string;
  titleHint?: string;
  items: SymptomItem[];
  notes?: string[];
  tags?: (Tag | null)[];
}) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  return (
    <div className={`func-group ${cls}`}>
      <div className="func-title small" title={titleHint}>
        {title}
      </div>
      <ul className="bullets">
        {items.map((s, i) => {
          const tag = tags?.[i];
          return (
            <li key={symptomKey(s)}>
              <span className={`sev sev${s.sev}`} aria-hidden="true" />
              {symptomLabel(s, lang, t)}
              {tag?.text && (
                <span className={`rec-tag ${tag.cls}`} title={tag.title}>
                  {tag.text}
                </span>
              )}
              {tag?.note && <span className="muted small"> · {tag.note}</span>}
              {notes?.[i] && <span className="muted small"> · {notes[i]}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Dead / temporarily silenced / partly compensated / no backup, for the selected region now. */
function RecoveryStatus({
  rr,
  rt,
  noBackup,
  compLine,
  bilateral,
  bottleneck,
  sites,
}: {
  rr: RegionRecovery;
  rt: RecoveryStrings;
  noBackup: string[];
  compLine: 'comp' | 'little' | null;
  bilateral: boolean;
  bottleneck: boolean;
  /** where both sides were cut together (Z2-10) */
  sites: BottleneckSite[];
}) {
  const lang = useApp((s) => s.lang);
  const edema = rr.silenced - rr.remote >= 0.005;
  const remote = rr.remote >= 0.005;
  const sep = usesLatinSpacing(lang) ? ' ' : '';
  return (
    <div className="rec-status">
      <div className="now-label small muted">{rt.statusTitle}</div>
      <ul>
        {rr.dead >= 0.02 && (
          <li className="dead">
            <span className="rec-dot" aria-hidden="true" />
            <div>
              <span className="rec-head">
                {rt.dead} <span className="num">{pct(rr.dead)}</span>
              </span>
              {/* a lacune costs the structure much more of its function than its share of it (W3-5) */}
              <span className="muted small"> — {rr.lost >= rr.dead + LACUNE_NOTE_FROM ? rt.deadLacuneNote(pct(rr.lost)) : rt.deadNote}</span>
            </div>
          </li>
        )}
        {rr.silenced >= SILENCED_SHOWN && (
          <li className="silenced">
            <span className="rec-dot" aria-hidden="true" />
            <div>
              <span className="rec-head">
                {rt.silenced} <span className="num">{pct(rr.silenced)}</span>
              </span>
              <span className="muted small"> — {rt.silencedNote(edema, remote)}</span>
            </div>
          </li>
        )}
        {rr.regaining >= SILENCED_SHOWN && (
          <li className="silenced">
            <span className="rec-dot" aria-hidden="true" />
            <div>
              <span className="rec-head">
                {rt.regaining} <span className="num">{pct(rr.regaining)}</span>
              </span>
              <span className="muted small"> — {rt.regainingNote}</span>
            </div>
          </li>
        )}
        {compLine === 'comp' && (
          <li className="comp">
            <span className="rec-dot" aria-hidden="true" />
            <div>
              <span className="rec-head">
                {rt.compensated} <span className="num">{pct(rr.compensated)}</span>
              </span>
              <span className="muted small">
                {' — '}
                {rt.compensatedNote(pct(rr.compensated))}
                {bottleneck ? sep + rt.bottleneckNote(sites) : bilateral ? sep + rt.bilateralNote : ''}
              </span>
            </div>
          </li>
        )}
        {compLine === 'little' && (
          <li className="little">
            <span className="rec-dot" aria-hidden="true" />
            <div>
              <span className="rec-head">{rt.compensatedLittle}</span>
              <span className="muted small">
                {' — '}
                {[rt.compensatedLittleNote(rr.compensated >= 0.005 ? pct(rr.compensated) : null), rt.bottleneckNote(sites)].filter(Boolean).join(sep)}
              </span>
            </div>
          </li>
        )}
        {noBackup.length > 0 && rr.dead >= 0.1 && (
          <li className="nobackup">
            <span className="rec-dot" aria-hidden="true" />
            <div>
              <span className="rec-head">{rt.noBackup}</span>
              <span className="small">{usesLatinSpacing(lang) ? ': ' : '：'}{noBackup.join(usesLatinSpacing(lang) ? '; ' : '、')}</span>
              <div className="muted small">{rt.noBackupNote}</div>
            </div>
          </li>
        )}
      </ul>
      {(rr.silenced >= SILENCED_SHOWN || compLine !== null || (noBackup.length > 0 && rr.dead >= 0.1)) && <p className="rec-caveat small">{rt.caveat}</p>}
    </div>
  );
}
