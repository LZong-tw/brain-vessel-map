import { REGION_BY_ID, regionName, tr } from '../anatomy';
import { PHASE_LABEL, REPERFUSION_STOPS, TIME_STOPS, formatHours, phaseOf } from '../anatomy/timeline';
import type { CascadeEvent, EventSeverity } from '../engine/cascade';
import type { SymptomItem } from '../engine/clinical';
import { startOf } from '../engine/schedule';
import type { SimResult } from '../engine/simulate';
import { RECOVERY_UI } from '../i18n/uiRecovery';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { fmtMl, midlineShiftOf, pct, shortTitle, stopIndexAtOrAfter, stopTime, symptomLabel } from '../ui/format';
import {
  COMPENSATION_SHOWN,
  bottleneckSites,
  compensatedShare,
  hasNoBackup,
  improvedSince,
  noBackupNow,
  regainingVolume,
  silencedVolume,
  unexaminableHeading,
  unexaminableNow,
} from '../ui/recoveryFormat';

const SEV_RANK: Record<EventSeverity, number> = { danger: 0, warn: 1, good: 2, info: 3 };
const bySeverity = (a: CascadeEvent, b: CascadeEvent) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || a.onsetH - b.onsetH;
/** show silenced tissue from this volume (mL) */
const SILENCED_ML = 1;
/** mention compensation once its typical course is this far along (≈ 1 week) */
const COMPENSATING_FROM = 0.15;
/** name deficits without backup from this time (h), once compensation of the others is under way */
const NO_BACKUP_FROM_H = 168;
/** a volume shows as more than 0 mL from here (fmtMl) */
const SHOWN_ML = 0.05;
/**
 * a change of the core, or a penumbra, is worth a sentence from 0.5 mL, or from a tenth of the
 * core when that is smaller (a brainstem infarct of a few millilitres that doubles in a few hours
 * is growing: Z4-13), as long as it shows as more than 0 mL
 */
const NOTABLE_ML = 0.5;
const NOTABLE_SHARE = 0.1;
const notable = (v: number, core: number) => v >= NOTABLE_ML || (v >= SHOWN_ML && v >= NOTABLE_SHARE * core);
/** the model offers a reopening up to this long after an occlusion starts (h) */
const REOPENING_OFFERED_H = Math.max(...REPERFUSION_STOPS);

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
  // the brain's volumes: the upper cervical cord, counted in the infarct volumes, has its own
  // sentence (W3-8)
  const cord = sim.volumes.cord;
  const core = sim.volumes.core - cord.core;
  const pen = sim.volumes.penumbra - cord.penumbra;
  const saved = sim.volumes.saved;
  const reperf = sim.input.reperfusionH;
  const spontaneous = sim.cascade.spontaneous;
  const cordShown = cord.core + cord.penumbra >= SHOWN_ML;

  // ── what the tissue is doing ──
  const sentences: string[] = [];
  const grew = prev ? core - (prev.volumes.core - prev.volumes.cord.core) : 0;
  // the penumbra "can still be saved" while a reopening is still offered: within a day of the
  // start of an occlusion still in effect, before any reopening (Z4-13); after it, it may still be lost
  const lastStart = Math.max(-Infinity, ...sim.activeOcclusions.map(startOf));
  const penNote = sim.recanalized ? 'atRisk' : tH - lastStart <= REOPENING_OFFERED_H + 1e-9 ? 'saved' : 'late';
  if (core < SHOWN_ML && !notable(pen, core)) {
    const oligemia = Object.values(sim.regions).some((r) => r.dominant === 'oligemia');
    sentences.push(oligemia ? t.nowOligemia : cordShown ? t.nowCordOnly : t.nowNothing);
  } else if (tH === 0) {
    sentences.push(t.nowOnset(fmtMl(core + pen)));
  } else if (tH >= 720) {
    // the oedema model's "atrophy" sentence already describes the clearing and shrinking
    sentences.push(sim.edema.phase === 'atrophy' ? t.nowChronicLoss(fmtMl(core)) : t.nowChronic(fmtMl(core)));
  } else if (sim.recanalized && reperf !== null && saved >= 0.5 && tH < 168) {
    sentences.push(
      t.nowRecanalized({
        at: formatHours(reperf, lang),
        saved: fmtMl(saved),
        ...(sim.volumes.savedSecondary >= 0.5 ? { secondary: fmtMl(sim.volumes.savedSecondary) } : {}),
      }),
    );
  } else if (spontaneous && sim.recanalized && tH >= spontaneous.atH - 1e-9 && spontaneous.saved >= 0.5 && tH < 168) {
    // an artery that reopened by itself: the same as after a treated reopening, said to be without treatment (U2-10)
    sentences.push(
      t.nowRecanalizedSelf({
        at: formatHours(spontaneous.atH - sim.schedule.onsetH, lang),
        saved: fmtMl(spontaneous.saved),
        ...(spontaneous.savedSecondary >= 0.5 ? { secondary: fmtMl(spontaneous.savedSecondary) } : {}),
      }),
    );
  } else if (notable(grew, core) && notable(pen, core)) {
    sentences.push(t.nowCoreGrowing({ grew: fmtMl(grew), since: formatHours(tH - prevH, lang), core: fmtMl(core), pen: fmtMl(pen), penNote }));
  } else if (notable(pen, core)) {
    // most of it is the deep white matter behind a perforating end artery (a lacune, or the whole
    // bundle), alive with no flow at all: it lasts because white matter dies slowly, not on
    // collaterals, which do not reach it (V2-8)
    const noFlow = sim.volumes.noFlow >= 0.5 * pen;
    sentences.push(
      core < SHOWN_ML
        ? (noFlow ? t.nowHoldingNoFlowNoCore : t.nowHoldingNoCore)(fmtMl(pen))
        : (noFlow ? t.nowHoldingNoFlow : t.nowHolding)({ core: fmtMl(core), pen: fmtMl(pen) }),
    );
  } else {
    sentences.push(t.nowSettled(fmtMl(core)));
  }
  if (cordShown)
    sentences.push(
      cord.core < SHOWN_ML
        ? t.nowCordIschaemic(fmtMl(cord.penumbra))
        : cord.penumbra >= SHOWN_ML
          ? t.nowCordDying({ core: fmtMl(cord.core), pen: fmtMl(cord.penumbra) })
          : t.nowCordDead(fmtMl(cord.core)),
    );

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
  // only what the dead tissue alone gives, and not beside its own improvement (V2-5)
  const noBackup = tH >= NO_BACKUP_FROM_H ? noBackupNow(sim, prev) : [];
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
          <span key={`${e.id}@${e.onsetH}`} className={`now-event ev-${e.severity}`} title={tr(e.desc, lang)}>
            {shortTitle(tr(e.title, lang))}
          </span>
        ))}
        {events.length > 5 && <span className="muted">+{events.length - 5}</span>}
      </span>
    </div>
  );
}
