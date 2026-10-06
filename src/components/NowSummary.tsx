import { REGION_BY_ID, regionName, tr } from '../anatomy';
import { PHASE_LABEL, TIME_STOPS, formatHours, phaseOf } from '../anatomy/timeline';
import type { CascadeEvent, EventSeverity } from '../engine/cascade';
import type { SymptomItem } from '../engine/clinical';
import type { SimResult } from '../engine/simulate';
import { RECOVERY_UI } from '../i18n/uiRecovery';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { fmtMl, midlineShiftOf, pct, shortTitle, stopIndexAtOrAfter, stopTime, symptomLabel } from '../ui/format';
import { COMPENSATION_SHOWN, bottleneckSites, compensatedShare, hasNoBackup, improvedSince, regainingVolume, silencedVolume, unexaminableHeading, unexaminableNow } from '../ui/recoveryFormat';

const SEV_RANK: Record<EventSeverity, number> = { danger: 0, warn: 1, good: 2, info: 3 };
const bySeverity = (a: CascadeEvent, b: CascadeEvent) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.onsetH - b.onsetH;
/** show silenced tissue from this volume (mL) */
const SILENCED_ML = 1;
/** mention compensation once its typical course is this far along (≈ 1 week) */
const COMPENSATING_FROM = 0.15;
/** name deficits without backup from this time (h), once compensation of the others is under way */
const NO_BACKUP_FROM_H = 168;

/**
 * "What is happening now": the phase, what the tissue is doing, swelling, temporary silencing and
 * compensation, what has improved, and the cascade events active at the displayed time, in plain
 * language. Rebuilt whenever the timeline moves.
 */
export function NowSummary({ sim, series }: { sim: SimResult; series: SimResult[] }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const rt = RECOVERY_UI[lang];
  const select = useApp((s) => s.select);
  const tH = sim.input.tH;
  const tIndex = stopIndexAtOrAfter(tH);
  const prev = tIndex > 0 ? series[tIndex - 1] : null;
  const next = tIndex < series.length - 1 ? series[tIndex + 1] : null;
  const prevH = tIndex > 0 ? TIME_STOPS[tIndex - 1].h : -Infinity;
  const { core, penumbra: pen, saved } = sim.volumes;
  const reperf = sim.input.reperfusionH;

  // ── what the tissue is doing ──
  const sentences: string[] = [];
  if (core < 0.5 && pen < 0.5) {
    sentences.push(Object.values(sim.regions).some((r) => r.dominant === 'oligemia') ? t.nowOligemia : t.nowNothing);
  } else if (tH === 0) {
    sentences.push(t.nowOnset(fmtMl(core + pen)));
  } else if (tH >= 720) {
    // the oedema model's "atrophy" sentence already describes the clearing and shrinking
    sentences.push(sim.edema.phase === 'atrophy' ? t.nowChronicLoss(fmtMl(core)) : t.nowChronic(fmtMl(core)));
  } else if (sim.recanalized && reperf !== null && saved >= 0.5 && tH < 168) {
    sentences.push(t.nowRecanalized({ at: formatHours(reperf, lang), saved: fmtMl(saved) }));
  } else if (prev && core - prev.volumes.core >= 0.5 && pen >= 0.5) {
    sentences.push(
      t.nowCoreGrowing({ grew: fmtMl(core - prev.volumes.core), since: formatHours(tH - prevH, lang), core: fmtMl(core), pen: fmtMl(pen) }),
    );
  } else if (pen >= 0.5) {
    sentences.push(t.nowHolding({ core: fmtMl(core), pen: fmtMl(pen) }));
  } else {
    sentences.push(t.nowSettled(fmtMl(core)));
  }

  // ── swelling ──
  const edemaText = t.edemaNow[sim.edema.phase];
  if (edemaText) sentences.push(edemaText);
  const mm = midlineShiftOf(sim);
  if (mm >= 0.5) {
    const nextMm = next ? midlineShiftOf(next) : mm;
    const prevMm = prev ? midlineShiftOf(prev) : 0;
    const trend = nextMm > mm + 0.1 ? 'rising' : prevMm > mm + 0.1 ? 'falling' : 'peak';
    sentences.push(t.nowShift(mm.toFixed(1), t.edemaTrend[trend]));
  }

  // ── temporary silencing and compensation ──
  let recoveryShown = false;
  const silenced = silencedVolume(sim);
  if (silenced.edemaMl >= SILENCED_ML) {
    sentences.push(rt.nowSilenced(fmtMl(silenced.edemaMl)));
    recoveryShown = true;
  }
  // the tissue that survived works again over hours to days, not at once (Y1-12)
  const regaining = regainingVolume(sim);
  if (regaining >= SILENCED_ML) {
    sentences.push(rt.nowRegaining(fmtMl(regaining)));
    recoveryShown = true;
  }
  if (silenced.remoteMl >= SILENCED_ML) {
    sentences.push(rt.nowRemote);
    recoveryShown = true;
  }
  if (sim.recovery.progress >= COMPENSATING_FROM) {
    // both sides cut where the main pathways and their backups run together (locked-in)
    const cut = sim.symptoms.filter((s) => s.recovery?.bottleneck && s.sev >= 2 && !hasNoBackup(s));
    if (cut.length) {
      // named where it is: the cerebral peduncles or the ventral pons (Z2-10)
      sentences.push(rt.nowCompensatingLittle(pct(sim.recovery.progress), bottleneckSites(cut)));
      recoveryShown = true;
    } else if (sim.symptoms.some((s) => compensatedShare(s) >= COMPENSATION_SHOWN)) {
      sentences.push(rt.nowCompensating(pct(sim.recovery.progress)));
      recoveryShown = true;
    }
  }
  const upTo = series.slice(0, tIndex + 1);
  const peakAt = upTo.reduce((best, s, i) => (s.nihss.total > upTo[best].nihss.total ? i : best), 0);
  if (tH >= NO_BACKUP_FROM_H && upTo.length && upTo[peakAt].nihss.total > sim.nihss.total) {
    sentences.push(rt.nowNihssTrend(upTo[peakAt].nihss.total, stopTime(peakAt, lang), sim.nihss.total));
  }
  // what cannot be examined at this level of consciousness has not improved; it is named apart (X1-2)
  const improved = prev ? improvedSince(prev.symptoms, sim.symptoms, sim.unexaminable) : [];
  const unexaminable = unexaminableNow(sim);
  // why they cannot be examined: the level of consciousness, blindness or akinetic mutism (Y2-14, Y2-15)
  const unexaminableHead = unexaminableHeading(unexaminable, lang);
  const noBackup = tH >= NO_BACKUP_FROM_H ? sim.symptoms.filter((s) => !s.delayed && hasNoBackup(s)).sort((a, b) => b.sev - a.sev) : [];
  recoveryShown ||= noBackup.length > 0;

  // ── cascade events: those that began since the previous stop, and those still running ──
  const events = sim.cascade.events;
  const started = events.filter((e) => e.onsetH > prevH && e.onsetH <= tH).sort(bySeverity);
  const ongoing = events.filter((e) => e.onsetH <= prevH && e.endH !== undefined && tH < e.endH).sort(bySeverity);

  const top = Object.entries(sim.regions)
    .filter(([, r]) => Math.max(r.dys, r.infarct) >= 0.2 || r.effect === 'secondary' || r.effect === 'compressed')
    .sort((a, b) => Math.max(b[1].dys, b[1].infarct) - Math.max(a[1].dys, a[1].infarct))
    .slice(0, 4);

  return (
    <section className={`now-summary ph-${phaseOf(tH)}`} aria-live="polite">
      <div className="kicker">{t.nowTitle}</div>
      <div className="now-phase">{t.nowPhase(tH === 0 ? null : stopTime(tIndex, lang), tr(PHASE_LABEL[phaseOf(tH)], lang))}</div>
      <p>{sentences.join(lang === 'en' ? ' ' : '')}</p>
      {improved.length > 0 && (
        <SymptomLine
          label={rt.improvedLabel(stopTime(tIndex - 1, lang))}
          cls="improved"
          items={improved.map((x) => ({ s: x.s, text: `${x.from}→${x.to === 0 ? rt.goneWord : x.to}` }))}
        />
      )}
      {unexaminable.length > 0 && (
        <SymptomLine
          label={unexaminableHead.label}
          title={unexaminableHead.title}
          cls="unexaminable"
          items={unexaminable.map((s) => ({ s, text: unexaminableHead.tag(s) }))}
        />
      )}
      {noBackup.length > 0 && <SymptomLine label={rt.noBackupLabel} cls="nobackup" items={noBackup.map((s) => ({ s, text: '' }))} />}
      {started.length > 0 && <EventLine label={t.nowStarted} events={started} />}
      {ongoing.length > 0 && <EventLine label={t.nowOngoing} events={ongoing} />}
      {top.length > 0 && (
        <div className="now-line">
          <span className="now-line-label">{t.nowRegions}</span>
          <span className="chips small">
            {top.map(([id]) => (
              <button key={id} className="chip" onClick={() => select({ kind: 'region', id })}>
                {regionName(REGION_BY_ID[id], lang)}
              </button>
            ))}
          </span>
        </div>
      )}
      {recoveryShown && <p className="rec-caveat small">{rt.caveat}</p>}
    </section>
  );
}

function SymptomLine({ label, title, cls, items }: { label: string; title?: string; cls: string; items: { s: SymptomItem; text: string }[] }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  return (
    <div className="now-line">
      <span className="now-line-label" title={title}>
        {label}
      </span>
      <span className={`now-events now-symptoms ${cls}`}>
        {items.slice(0, 5).map(({ s, text }) => (
          <span key={`${s.id}|${s.side ?? ''}`} className="now-event">
            {symptomLabel(s, lang, t)}
            {text && <span className="num muted"> {text}</span>}
          </span>
        ))}
        {items.length > 5 && <span className="muted">+{items.length - 5}</span>}
      </span>
    </div>
  );
}

function EventLine({ label, events }: { label: string; events: CascadeEvent[] }) {
  const lang = useApp((s) => s.lang);
  return (
    <div className="now-line">
      <span className="now-line-label">{label}</span>
      <span className="now-events">
        {events.slice(0, 5).map((e) => (
          <span key={e.id} className={`now-event ev-${e.severity}`} title={tr(e.desc, lang)}>
            {shortTitle(tr(e.title, lang))}
          </span>
        ))}
        {events.length > 5 && <span className="muted">+{events.length - 5}</span>}
      </span>
    </div>
  );
}
