import { useMemo } from 'react';
import { VESSEL_BY_ID, vesselName } from '../anatomy';
import { RECANALISATION_EVIDENCE, siteGroupOf as defaultSiteGroupOf, type RecanalisationEvidence, type SiteGroup } from '../anatomy/recanalisation';
import { REPERFUSION_STOPS, formatHours } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import type { Occlusion } from '../engine/hemodynamics';
import { inWindow, isTreatable, startOf } from '../engine/schedule';
import { angiographicGrade, type ReperfusionGrade, type TreatmentMethod } from '../engine/treatment';
import { SCHEDULE_UI } from '../i18n/uiSchedule';
import { TREATMENT_UI } from '../i18n/uiTreatment';
import { useApp } from '../state/store';
import { formatClock } from '../ui/scheduleFormat';
import {
  NO_REFLOW_OPTIONS,
  REOCCLUSION_OPTIONS,
  distalOptions,
  evidenceRows,
  fmtShare,
  reopenedVesselIds,
  sitesOf,
  treatmentDelayH,
  treatmentWarnings,
} from '../ui/treatment';

/**
 * Treatment times: the usual delays after onset and, when complete occlusions begin later, the
 * same delays after each of those starts (treatment reopens whatever is occluded at that time).
 */
export function ReperfusionTimeOptions({ occlusions, lang, reperfusionAt }: { occlusions: readonly Occlusion[]; lang: Lang; reperfusionAt: string }) {
  const s = SCHEDULE_UI[lang];
  const later = [...new Set(occlusions.filter(isTreatable).map(startOf))].filter((h) => h > 0).sort((a, b) => a - b);
  const first = REPERFUSION_STOPS.map((h) => (
    <option key={h} value={h}>
      {reperfusionAt} {formatHours(h, lang)}
    </option>
  ));
  if (!later.length) return <>{first}</>;
  return (
    <>
      <optgroup label={s.treatAfterFirst}>{first}</optgroup>
      {later.map((at) => {
        const names = occlusions
          .filter((o) => isTreatable(o) && startOf(o) === at)
          .map((o) => vesselName(VESSEL_BY_ID[o.vessel], lang))
          .join(lang === 'en' ? ', ' : '、');
        return (
          <optgroup key={at} label={s.treatAfter(names, formatClock(at, lang))}>
            {REPERFUSION_STOPS.map((d) => (
              <option key={d} value={at + d}>
                {s.plus(formatClock(d, lang))}
              </option>
            ))}
          </optgroup>
        );
      })}
    </>
  );
}

/**
 * How and how well the treatment reopens the artery (shown once a treatment time is chosen),
 * with the published figures for the reopened site and the chosen method, and warnings when the
 * method is used outside its usual time window. `evidence` and `siteGroupOf` default to the
 * app's evidence module (tests pass their own).
 */
export function TreatmentDetails({
  evidence = RECANALISATION_EVIDENCE,
  siteGroupOf = defaultSiteGroupOf,
}: {
  evidence?: RecanalisationEvidence;
  siteGroupOf?: (baseId: string) => SiteGroup;
}) {
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const reperfusionH = useApp((s) => s.reperfusionH);
  const tx = useApp((s) => s.treatment);
  const setTreatment = useApp((s) => s.setTreatment);
  const s = TREATMENT_UI[lang];
  const reopened = useMemo(() => reopenedVesselIds(occlusions, reperfusionH), [occlusions, reperfusionH]);
  const distal = useMemo(() => distalOptions(reopened), [reopened]);
  if (reperfusionH === null) return null;
  const sites = sitesOf(reopened, siteGroupOf);
  const delayH = treatmentDelayH(occlusions, reperfusionH, reopened);
  const warnings = treatmentWarnings(tx, delayH, sites, evidence, lang, reopened, siteGroupOf);
  // a lacunar (single-branch) occlusion in effect then: thrombolysis applies, the model does not reopen it
  const lacunar = occlusions.some((o) => o.branch && o.severity >= 1 && inWindow(o, reperfusionH));
  const listed = [...distal.downstream, ...distal.newTerritory];
  const shownGrade = angiographicGrade(tx, reopened);
  const kept = tx.distalEmbolus && !listed.includes(tx.distalEmbolus) ? [tx.distalEmbolus] : [];
  const name = (id: string) => (VESSEL_BY_ID[id] ? vesselName(VESSEL_BY_ID[id], lang) : id);
  const gradeOption = (g: ReperfusionGrade) => (
    <option key={g} value={g}>
      {s.grades[g]}
    </option>
  );
  return (
    <div className="tx-details" role="group" aria-label={s.title}>
      <div className="tx-title">{s.title}</div>
      {!reopened.length && <p className="muted small">{s.nothingReopened}</p>}
      {lacunar && <p className="muted small">{s.lacunarNote}</p>}
      <div className="tx-label" id="tx-method">
        {s.method}
      </div>
      <div className="seg small" role="radiogroup" aria-labelledby="tx-method">
        {TREATMENT_METHODS.map((m) => (
          <button key={m} role="radio" aria-checked={tx.method === m} className={tx.method === m ? 'active' : ''} onClick={() => setTreatment({ method: m })}>
            {s.methods[m]}
          </button>
        ))}
      </div>
      <label className="field">
        <span>{s.grade}</span>
        <select value={tx.grade} onChange={(e) => setTreatment({ grade: e.target.value as ReperfusionGrade })}>
          {gradeOption('3')}
          {gradeOption('2c')}
          <optgroup label={s.grades['2b']}>
            {gradeOption('2b67')}
            {gradeOption('2b50')}
          </optgroup>
          {gradeOption('2a')}
          {gradeOption('1')}
          {gradeOption('0')}
        </select>
      </label>
      <div className="tx-label" id="tx-reocclusion">
        {s.reocclusion}
      </div>
      <div className="seg small" role="radiogroup" aria-labelledby="tx-reocclusion">
        {REOCCLUSION_OPTIONS.map((h) => (
          <button
            key={String(h)}
            role="radio"
            aria-checked={tx.reocclusionAfterH === h}
            className={tx.reocclusionAfterH === h ? 'active' : ''}
            onClick={() => setTreatment({ reocclusionAfterH: h })}
          >
            {h === null ? s.reocclusionNever : s.reocclusionAfter(formatHours(h, lang))}
          </button>
        ))}
      </div>
      <label className="field">
        <span>{s.distal}</span>
        <select value={tx.distalEmbolus ?? ''} onChange={(e) => setTreatment({ distalEmbolus: e.target.value || null })}>
          <option value="">{s.distalNone}</option>
          {kept.map((id) => (
            <option key={id} value={id}>
              {name(id)}
            </option>
          ))}
          {distal.newTerritory.length ? (
            <>
              <optgroup label={s.distalDownstream}>
                {distal.downstream.map((id) => (
                  <option key={id} value={id}>
                    {name(id)}
                  </option>
                ))}
              </optgroup>
              <optgroup label={s.distalNewTerritory}>
                {distal.newTerritory.map((id) => (
                  <option key={id} value={id}>
                    {name(id)}
                  </option>
                ))}
              </optgroup>
            </>
          ) : (
            distal.downstream.map((id) => (
              <option key={id} value={id}>
                {name(id)}
              </option>
            ))
          )}
        </select>
      </label>
      <p className="muted small">{tx.method === 'ivt' ? s.distalHintIvt : s.distalHint}</p>
      {/* a downstream branch blocked by the fragment counts as not reperfused on the final angiogram (U2-9) */}
      {shownGrade !== tx.grade && <p className="callout note">{s.distalGradeNote(shownGrade, tx.grade)}</p>}
      <div className="tx-label" id="tx-noreflow">
        {s.noReflow} <span className="badge tx-limited">{s.limitedEvidence}</span>
      </div>
      <div className="seg small" role="radiogroup" aria-labelledby="tx-noreflow">
        {NO_REFLOW_OPTIONS.map((x) => (
          <button key={x} role="radio" aria-checked={tx.noReflow === x} className={tx.noReflow === x ? 'active' : ''} onClick={() => setTreatment({ noReflow: x })}>
            {x === 0 ? '0' : fmtShare(x)}
          </button>
        ))}
      </div>
      <p className="muted small">{s.noReflowHint}</p>
      {warnings.map((w) => (
        <p key={w.key} className={w.level === 'note' ? 'callout note' : 'callout warn'} role="status">
          {w.text}
        </p>
      ))}
      <EvidenceBox sites={sites} method={tx.method} evidence={evidence} delayH={delayH} />
    </div>
  );
}

/** published figures for the reopened site(s) and the chosen method, in small print */
export function EvidenceBox({
  sites,
  method,
  evidence,
  delayH,
}: {
  sites: SiteGroup[];
  method: TreatmentMethod;
  evidence: RecanalisationEvidence;
  /** hours from onset to the treatment (adds the late-thrombolysis trials beyond the window) */
  delayH?: number;
}) {
  const lang = useApp((s) => s.lang);
  const s = TREATMENT_UI[lang];
  const rows = evidenceRows(evidence, sites, method, lang, { delayH });
  const colon = lang === 'en' ? ': ' : '：';
  return (
    <section className="tx-evidence" aria-label={s.evidenceTitle}>
      <div className="tx-label">{s.evidenceTitle}</div>
      <p className="tx-choice">{s.evidenceChoice}</p>
      {rows.length ? (
        <ul>
          {rows.map((r) => (
            <li key={r.key}>
              <span className="tx-ev-head">
                {r.label}
                {colon}
                <strong className="num">{r.value}</strong>
              </span>
              {r.note && <span className="tx-ev-note">{r.note}</span>}
              <cite className="tx-ev-source">
                {s.source}
                {colon}
                {r.source}
              </cite>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{s.evidenceNone}</p>
      )}
    </section>
  );
}

const TREATMENT_METHODS: TreatmentMethod[] = ['evt', 'ivt', 'bridging'];
