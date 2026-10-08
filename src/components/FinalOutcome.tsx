import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { REGION_BY_ID, regionName, tr } from '../anatomy';
import { SYMPTOM_BY_ID, isQualifier } from '../anatomy/symptoms';
import { formatHours } from '../anatomy/timeline';
import type { FatalRisk } from '../engine/cascade';
import type { NihssResult, SymptomItem } from '../engine/clinical';
import type { SimResult } from '../engine/simulate';
import { OUTCOME_UI } from '../i18n/uiOutcome';
import { RECOVERY_UI } from '../i18n/uiRecovery';
import { RISKS_UI } from '../i18n/uiRisks';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { STATE_COLORS } from '../ui/colors';
import { DEFICIT_GROUPS, H_6M, I_3M, I_6M, UNSETTLED_SLACK_H, finalOutcome } from '../ui/finalOutcome';
import { SYSTEM_LABEL, SYSTEM_ORDER, fmtMl, fmtNeurons, pct, pctShare, stopIndexAtOrAfter, symptomLabel, systemOf } from '../ui/format';
import { COMPENSATION_SHOWN, bottleneckSites, compensatedShare, hasNoBackup, symptomBackup, unexaminableHeading } from '../ui/recoveryFormat';
import { formatPrevalence, postStrokeRisksFor } from '../ui/postStrokeRisks';
import { formatClock } from '../ui/scheduleFormat';
import { treatmentLine } from '../ui/caseSummary';
import { EventItem } from './EventItem';
import { useSimSeries } from './useSimSeries';

/** the risks the comparison can show, in this order */
const FATAL_RISKS: FatalRisk[] = ['herniation', 'posterior_fossa', 'basilar'];

/** regions listed before "+ n more" */
const REGIONS_SHOWN = 12;

/**
 * The end of the course (the Outcome tab), independent of the displayed time: final infarct,
 * treated vs untreated, NIHSS and lasting deficits at 3 and 6 months, the late course and the
 * regions left infarcted. Everything comes from ui/finalOutcome.ts.
 */
export function FinalOutcome() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const o = OUTCOME_UI[lang];
  const st = useApp(
    useShallow((s) => ({
      occlusions: s.occlusions,
      variants: s.variants,
      map: s.map,
      collateral: s.collateral,
      reperfusionH: s.reperfusionH,
      decompression: s.decompression,
      treatment: s.treatment,
    })),
  );
  const select = useApp((s) => s.select);
  const setTIndex = useApp((s) => s.setTIndex);
  const setRightTab = useApp((s) => s.setRightTab);
  const [at, setAt] = useState<'m3' | 'm6'>('m6');
  // the case's own 3- and 6-month simulations are already in the (shared, memoised) series
  const series = useSimSeries();
  // `st` keeps its identity while these fields do (useShallow), like the series
  const out = useMemo(() => finalOutcome(st, { m3: series[I_3M], m6: series[I_6M] }), [st, series]);
  const bothDestroyed = out.caveats.includes('bilateral_hemispheres');
  if (!st.occlusions.length && st.map >= 70) return <p className="muted">{t.noOcclusion}</p>;

  const { course, untreated } = out;
  const m6 = course.m6;
  const jumpTo = (i: number) => {
    setTIndex(i);
    setRightTab('now');
  };
  const openTreatment = () => {
    const s = useApp.getState();
    s.setLeftTab('case');
    // on a phone the right panel is an overlay: show the left one instead
    if (s.mobilePanel === 'right') s.setMobilePanel('left');
  };
  const deficits = out.deficits[at];
  const shown = at === 'm3' ? course.m3 : m6;
  // a finding that describes a deficit (macular sparing) is named with it, not as a deficit (V2-9)
  const hiddenDeficits = shown.unexaminable.filter((s) => !isQualifier(s.id));
  const qualifiersOf = (s: SymptomItem) =>
    shown.symptoms.filter((q) => SYMPTOM_BY_ID[q.id]?.qualifies?.includes(s.id)).map((q) => tr(SYMPTOM_BY_ID[q.id].name, lang));
  const unexaminableHead = unexaminableHeading(hiddenDeficits, lang);

  return (
    <div className="results outcome">
      <div className="outcome-head">
        <p className="muted small">
          {o.when}
          {out.onsetH > 0 && ` ${o.whenOnset(formatClock(out.onsetH, lang), formatHours(H_6M - out.onsetH, lang))}`}
        </p>
        <button className="btn small" onClick={() => jumpTo(I_6M)}>
          {o.jump6m}
        </button>
      </div>
      {/* the final evaluation after the 6-month stop: warned of only when something shown still changes by then (V3-13) */}
      {out.unsettled ? (
        <p className="callout warn">{o.unsettled(formatClock(out.lateBy, lang), out.changesAfter)}</p>
      ) : (
        out.lateBy > UNSETTLED_SLACK_H && <p className="muted small">{o.settledLate(formatClock(out.lateBy, lang))}</p>
      )}

      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">{o.finalInfarct}</div>
          <div className="stat-value" style={{ color: STATE_COLORS.core }}>
            {fmtMl(course.finalInfarct)} <small>{t.ml}</small>
          </div>
          {/* the upper cervical cord's part, named apart (W3-8) */}
          {m6.volumes.cord.final >= 0.05 && <div className="muted small">{o.finalCordNote(fmtMl(m6.volumes.cord.final))}</div>}
        </div>
        <div className="stat">
          <div className="stat-label">{m6.volumes.cord.core >= 0.05 ? o.neuronsLostBrain : o.neuronsLost}</div>
          <div className="stat-value small">{fmtNeurons(m6.neuronsLost, lang)}</div>
        </div>
        {/* (only a treatment that reopens something saves tissue: U2-8) */}
        {untreated && (
          <div className="stat" title={o.savedNote}>
            <div className="stat-label">{o.saved}</div>
            <div className="stat-value" style={{ color: STATE_COLORS.salvaged }}>
              {fmtMl(m6.volumes.saved)} <small>{t.ml}</small>
            </div>
          </div>
        )}
      </div>

      {untreated ? (
        <section className="outcome-compare">
          <h3>{o.compareTitle}</h3>
          <table>
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">{o.colTreated}</th>
                <th scope="col">{o.colUntreated}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{o.rowFinal}</th>
                <td>
                  {fmtMl(course.finalInfarct)} {t.ml}
                </td>
                <td>
                  {fmtMl(untreated.finalInfarct)} {t.ml}
                </td>
              </tr>
              {/* a course that usually or often ends in death: its NIHSS is a survivor's (Z2-3) */}
              <tr>
                <th scope="row">{o.rowNihss3}</th>
                <td>
                  {course.m3.nihss.total}
                  {course.fatal.length > 0 && o.ifSurvivesCell}
                </td>
                <td>
                  {untreated.m3.nihss.total}
                  {untreated.fatal.length > 0 && o.ifSurvivesCell}
                </td>
              </tr>
              <tr>
                <th scope="row">{o.rowNihss6}</th>
                <td>
                  {m6.nihss.total}
                  {course.fatal.length > 0 && o.ifSurvivesCell}
                </td>
                <td>
                  {untreated.m6.nihss.total}
                  {untreated.fatal.length > 0 && o.ifSurvivesCell}
                </td>
              </tr>
              <tr>
                <th scope="row" title={o.rowLastingNote}>
                  {o.rowLasting}
                </th>
                <td>{o.items(course.lasting)}</td>
                <td>{o.items(untreated.lasting)}</td>
              </tr>
              {/* one row per risk, labelled by what it means (R6-8, R6-13) */}
              {FATAL_RISKS.filter((k) => course.fatal.includes(k) || untreated.fatal.includes(k)).map((k) => (
                <tr key={k}>
                  <th scope="row">{o.rowFatal[k]}</th>
                  <td>{course.fatal.includes(k) ? o.fatalYes[k] : o.fatalNo}</td>
                  <td>{untreated.fatal.includes(k) ? o.fatalYes[k] : o.fatalNo}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">
            {o.treatmentLabel}
            {lang === 'en' ? ': ' : '：'}
            {treatmentLine(st, lang, true)}
            {lang === 'en' ? '. ' : '。'}
            {o.compareNote} {o.savedNote}
          </p>
        </section>
      ) : st.reperfusionH !== null ? (
        // a treatment that reopens nothing (a lacunar occlusion, which the model does not reopen,
        // or nothing complete occluded then): no treated course to compare (U2-8)
        <p className="muted small outcome-treatment">
          {o.treatmentLabel}
          {lang === 'en' ? ': ' : '：'}
          {treatmentLine(st, lang, true)}
          {lang === 'en' ? '.' : '。'}
        </p>
      ) : (
        <div className="outcome-hint">
          <p className="muted small">{o.noTreatmentHint}</p>
          <button className="btn small" onClick={openTreatment}>
            {o.setTreatment} →
          </button>
        </div>
      )}

      <section className="nihss outcome-nihss">
        <h3>{o.nihssTitle}</h3>
        {/* the course usually or often ends in death, which the model does not represent (C4-F1, Y3-11) */}
        {/* (both hemispheres destroyed: not the figures of one hemisphere, and who survives: Z3-12; nor
            for two hemispheres herniating downward together: V1-4) */}
        {out.fatal.map((k) => (
          <p key={k} className="callout danger">
            {k === 'herniation' && bothDestroyed ? o.fatalBilateral : k === 'herniation' && out.centralHerniation ? o.fatalCentral : o.fatal[k]}
          </p>
        ))}
        {/* a state with a substantial mortality of its own: the figures are a survivor's (Y3-11) */}
        {out.caveats.filter((k) => !(k === 'bilateral_hemispheres' && out.fatal.includes('herniation'))).map((k) => (
          <p key={k} className="callout warn">
            {o.survival[k]}
          </p>
        ))}
        <NihssLine label={out.fatal.length || out.caveats.length ? o.at3mIfSurvives : o.at3m} n={course.m3.nihss} />
        <NihssLine label={out.fatal.length || out.caveats.length ? o.at6mIfSurvives : o.at6m} n={m6.nihss} />
        <p className="muted small">{t.nihssNote}</p>
        {(course.m3.nihss.uncaptured || m6.nihss.uncaptured) && <p className="callout warn">{t.nihssUncaptured}</p>}
        {(course.m3.nihss.posteriorCaveat || m6.nihss.posteriorCaveat) && <p className="callout warn">{t.posteriorCaveat}</p>}
      </section>

      <section className="outcome-deficits">
        <div className="outcome-deficits-head">
          <h3>{o.deficitsTitle}</h3>
          <div className="seg small" role="group" aria-label={o.deficitsAt}>
            {(['m3', 'm6'] as const).map((k) => (
              <button key={k} aria-pressed={at === k} className={at === k ? 'active' : ''} onClick={() => setAt(k)}>
                {k === 'm3' ? o.at3m : o.at6m}
              </button>
            ))}
          </div>
        </div>
        {shown.symptoms.length === 0 && <p className="muted">{o.noDeficits}</p>}
        {shown.syndromes.length > 0 && (
          <p className="outcome-syndromes small">
            {t.syndromes}
            {lang === 'en' ? ': ' : '：'}
            {shown.syndromes
              .map((s) => tr(s.def.name, lang) + (s.silent ? (lang === 'en' ? ` (${t.syndromeSilent})` : `（${t.syndromeSilent}）`) : ''))
              .join(lang === 'en' ? '; ' : '、')}
          </p>
        )}
        {DEFICIT_GROUPS.filter((g) => deficits[g].length > 0).map((g) => (
          <div key={g} className={`sym-group outcome-group og-${g}`}>
            <h4>
              {o.groups[g]} <span className="num">{deficits[g].length}</span>
            </h4>
            <p className="muted small">{o.groupNotes[g]}</p>
            <ul className="bullets">
              {bySystem(deficits[g]).map((s) => (
                <DeficitItem key={s.id + s.side} s={s} qualifiers={qualifiersOf(s)} />
              ))}
            </ul>
          </div>
        ))}
        {hiddenDeficits.length > 0 && (
          <div className="sym-group outcome-unexaminable">
            <h4 title={unexaminableHead.title}>
              {unexaminableHead.label} <span className="num">{hiddenDeficits.length}</span>
            </h4>
            <p className="muted small">{unexaminableHead.title}</p>
            <ul className="bullets">
              {bySystem(hiddenDeficits).map((s) => (
                <li key={s.id + s.side}>
                  <span className={`sev sev${s.sev}`} aria-hidden="true" />
                  {symptomLabel(s, lang, t)}
                  <span className="muted small"> · {tr(SYSTEM_LABEL[systemOf(s.id)], lang)}</span>
                  {unexaminableHead.tag(s) && <span className="muted small"> · {unexaminableHead.tag(s)}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="muted small">{RECOVERY_UI[lang].caveat}</p>
      </section>

      <PostStrokeRisks m6={m6} />

      <section>
        <h3>{o.lateTitle}</h3>
        <p className="muted small">{o.lateNote}</p>
        {m6.hydrocephalus && <p className="callout warn">{o.hydrocephalus}</p>}
        {out.late.length === 0 ? (
          <p className="muted">{o.lateNone}</p>
        ) : (
          <ol className="events">
            {out.late.map((e) => (
              <EventItem key={`${e.id}@${e.onsetH}`} e={e} tH={H_6M} onJump={() => jumpTo(stopIndexAtOrAfter(e.onsetH))} onRegion={(id) => select({ kind: 'region', id })} />
            ))}
          </ol>
        )}
      </section>

      <section>
        <h3>{o.regionsTitle}</h3>
        {out.regions.length === 0 ? (
          <p className="muted">{o.regionsNone}</p>
        ) : (
          <ul className="region-list">
            {out.regions.slice(0, REGIONS_SHOWN).map((r) => (
              <li key={r.id}>
                <button onClick={() => select({ kind: 'region', id: r.id })}>
                  <span className="grow">{regionName(REGION_BY_ID[r.id], lang)}</span>
                  {r.ml >= 0.05 && (
                    <span className="muted small">
                      {fmtMl(r.ml)} {t.ml}
                    </span>
                  )}
                  <span className="num">{pctShare(r.infarct)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {out.regions.length > REGIONS_SHOWN && <p className="muted small">{o.more(out.regions.length - REGIONS_SHOWN)}</p>}
      </section>

      <p className="callout outcome-caveat">{o.caveat}</p>
    </div>
  );
}

/**
 * Common problems after stroke that the lesion site does not determine: population figures from
 * systematic reviews, shown only when the case leaves a brain infarct (ui/postStrokeRisks.ts).
 * Not symptoms of the case, never in the NIHSS or the deficit counts above.
 */
function PostStrokeRisks({ m6 }: { m6: SimResult }) {
  const lang = useApp((s) => s.lang);
  const r = RISKS_UI[lang];
  const groups = useMemo(() => postStrokeRisksFor(m6), [m6]);
  if (!groups.length) return null;
  const en = lang === 'en';
  return (
    <section className="outcome-risks" aria-label={r.title}>
      <h3>{r.title}</h3>
      <p className="muted small">{r.intro}</p>
      {groups.map((g) => (
        <div key={g.system} className={`risk-group rg-${g.system}`}>
          <h4>{r.groups[g.system] ?? (g.system === 'general' ? r.groups.general : tr(SYSTEM_LABEL[g.system], lang))}</h4>
          <ul className="risk-list">
            {g.items.map(({ risk, notes }) => (
              <li key={risk.id} className="risk-item" data-risk={risk.id}>
                <div className="risk-name">{tr(risk.name, lang)}</div>
                <div className="risk-prev">
                  <strong className="num">{formatPrevalence(risk.prevalence, lang)}</strong>
                  {en ? ' ' : ''}
                  {risk.population ? tr(risk.population, lang) : r.ofSurvivors}
                  <span className="muted"> · {tr(risk.window, lang)}</span>
                </div>
                <p className="risk-desc">{tr(risk.desc, lang)}</p>
                {notes.map((n) => (
                  <p key={n.en} className="risk-note">
                    {tr(n, lang)}
                  </p>
                ))}
                <details className="risk-factors">
                  <summary>{r.factors}</summary>
                  <p>{tr(risk.factors, lang)}</p>
                </details>
                <cite className="risk-source">
                  {r.sources}
                  {en ? ': ' : '：'}
                  {risk.sources.join(' · ')}
                </cite>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** symptoms in the order of the systems (motor before cognition …), worst first within one */
function bySystem(list: SymptomItem[]): SymptomItem[] {
  const rank = (s: SymptomItem) => SYSTEM_ORDER.indexOf(systemOf(s.id));
  return [...list].sort((a, b) => rank(a) - rank(b) || b.sev - a.sev);
}

function NihssLine({ label, n }: { label: string; n: NihssResult }) {
  const t = useT();
  return (
    <div className="outcome-nihss-line">
      <span className="outcome-nihss-at">{label}</span>
      <span className="num big">{n.total}</span>
      {/* 0 with deficits the scale does not score is "not captured", never "no deficit" */}
      <span className={`badge sev-${n.category}`}>{n.uncaptured ? t.nihssNotCaptured : t.nihssCategory[n.category]}</span>
    </div>
  );
}

/** one lasting deficit, with what describes it (`qualifiers`: macular sparing beside a hemianopia, V2-9) */
function DeficitItem({ s, qualifiers = [] }: { s: SymptomItem; qualifiers?: string[] }) {
  const t = useT();
  const lang = useApp((st) => st.lang);
  const o = OUTCOME_UI[lang];
  const rt = RECOVERY_UI[lang];
  const sys = SYSTEM_LABEL[systemOf(s.id)];
  const kind = symptomBackup(s);
  const note = s.recovery?.bottleneck ? rt.bottleneckNote(bottleneckSites([s])) : s.recovery?.bilateral ? rt.bilateralNote : '';
  return (
    <li title={[tr(SYMPTOM_BY_ID[s.id]?.desc ?? { zh: '', en: '' }, lang), rt.kindExplain[kind], note].filter(Boolean).join('\n')}>
      <span className={`sev sev${s.sev}`} aria-hidden="true" />
      {symptomLabel(s, lang, t)}
      {qualifiers.map((q) => (
        <span key={q} className="muted small">
          {lang === 'en' ? ` (${q})` : `（${q}）`}
        </span>
      ))}
      <span className="muted small"> · {tr(sys, lang)}</span>
      {s.delayed && <span className="tag">{t.delayedTag}</span>}
      {hasNoBackup(s) ? (
        <span className="rec-tag nobackup">{rt.tagNoBackup}</span>
      ) : (
        compensatedShare(s) >= COMPENSATION_SHOWN && <span className="rec-tag comp">{rt.tagCompensated(pct(compensatedShare(s)))}</span>
      )}
      {s.recovery?.bottleneck ? (
        <span className="rec-tag">{o.tagBottleneck(bottleneckSites([s]))}</span>
      ) : (
        s.recovery?.bilateral && kind !== 'exempt' && <span className="rec-tag">{o.tagBilateral}</span>
      )}
    </li>
  );
}
