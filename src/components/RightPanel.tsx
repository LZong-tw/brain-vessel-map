import { useMemo, useState } from 'react';
import { REGION_BY_ID, VESSEL_BY_ID, regionName, tr, vesselName } from '../anatomy';
import { canBeLacunar } from '../anatomy/lacunes';
import type { SymptomSystem } from '../anatomy/types';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { TIME_STOPS, formatHours } from '../anatomy/timeline';
import { REGION_DEFS } from '../anatomy/regions';
import type { CascadeEvent } from '../engine/cascade';
import { simulateHemodynamics, type Occlusion } from '../engine/hemodynamics';
import { endOf, isTreatable, phasesOf, progressed, startOf } from '../engine/schedule';
import { isOccludable, simulate, type SimResult } from '../engine/simulate';
import type { Strings } from '../i18n/ui';
import { SCHEDULE_UI } from '../i18n/uiSchedule';
import { REOPEN_AFTER_H, formatClock, occlusionWindow } from '../ui/scheduleFormat';
import { useT } from '../state/hooks';
import { useApp, type RightTab } from '../state/store';
import { STATE_COLORS } from '../ui/colors';
import {
  SYSTEM_LABEL,
  SYSTEM_ORDER,
  fmtFlow,
  fmtMl,
  fmtNeurons,
  midlineShiftOf,
  pct,
  regionSupply,
  signedPct,
  stopTime,
  symptomLabel,
  vesselTerritory,
} from '../ui/format';
import { regionAffectedPct } from '../ui/regionLabel';
import { vesselVisual, type VesselVisual } from '../ui/vesselState';
import { FunctionTimeline } from './FunctionTimeline';
import { NowSummary } from './NowSummary';
import { RegionNow } from './RegionNow';
import { useSimSeries } from './useSimSeries';
import { OccludeToggle } from './OccludeToggle';
import { STACK_UI } from '../i18n/uiStack';
import { TREATMENT_UI } from '../i18n/uiTreatment';
import { treatmentSummary } from '../ui/treatment';

export function RightPanel({ sim }: { sim: SimResult }) {
  const t = useT();
  const tab = useApp((s) => s.rightTab);
  const setTab = useApp((s) => s.setRightTab);
  const hasOcc = useApp((s) => s.occlusions.length > 0 || s.map < 70);
  const tabs: [RightTab, string][] = [
    ['details', t.tabDetails],
    ['results', t.tabResults],
  ];
  return (
    <aside className="panel right-panel">
      <nav className="tabs">
        {tabs.map(([k, label]) => (
          <button key={k} aria-pressed={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
            {k === 'results' && hasOcc && <span className="pip" aria-hidden="true" />}
          </button>
        ))}
      </nav>
      <div className="panel-body">{tab === 'details' ? <Details sim={sim} /> : <Results sim={sim} />}</div>
    </aside>
  );
}

// ─────────────────────────── details ───────────────────────────
function Details({ sim }: { sim: SimResult }) {
  const t = useT();
  const sel = useApp((s) => s.selected);
  if (!sel)
    return (
      <div className="welcome">
        <h3>{t.welcomeTitle}</h3>
        <ol>
          {t.welcomeSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="muted">{t.select}</p>
      </div>
    );
  if (sel.kind === 'structure') return <VentricleDetails sim={sim} />;
  return sel.kind === 'vessel' ? <VesselDetails id={sel.id} sim={sim} /> : <RegionDetails id={sel.id} sim={sim} />;
}

function VentricleDetails({ sim }: { sim: SimResult }) {
  const lang = useApp((s) => s.lang);
  const en = lang === 'en';
  const t = useT();
  const onset = sim.cascade.hydrocephalusOnsetH;
  const event = sim.cascade.events.find((e) => e.id === 'hydrocephalus');
  const vc = sim.edema.ventricleChange;
  return (
    <div className="details">
      <div className="kicker">{en ? 'Structure' : '構造'}</div>
      <h2>{en ? 'Ventricles' : '腦室系統'}</h2>
      <p>
        {en
          ? 'Fluid-filled cavities (two lateral ventricles, third and fourth ventricle) that make and drain cerebrospinal fluid. They have no arterial territory of their own, so they are shown for orientation only; the fluid leaves through the narrow aqueduct and the 4th ventricle, which a swollen cerebellum can block.'
          : '充滿腦脊髓液的腔室（左右側腦室、第三與第四腦室），負責製造與引流腦脊髓液。它們本身沒有動脈供血區，這裡只作為定位參考；腦脊髓液要經過狹窄的中腦導水管與第四腦室流出，小腦腫脹時可能被堵住。'}
      </p>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">{en ? 'State' : '狀態'}</div>
          <div className="stat-value small" style={{ color: sim.hydrocephalus ? STATE_COLORS.core : undefined }}>
            {sim.hydrocephalus
              ? en
                ? 'Enlarged (obstructive hydrocephalus)'
                : '擴大（阻塞性水腦）'
              : onset !== null
                ? en
                  ? `Expected to enlarge from ${formatHours(onset, lang)}`
                  : `預計 ${formatHours(onset, lang)} 起擴大`
                : en
                  ? 'Normal'
                  : '正常'}
          </div>
        </div>
        {Math.abs(vc) >= 0.01 && (
          <div className="stat">
            <div className="stat-label">{t.ventricleSize}</div>
            <div className="stat-value">{signedPct(vc)}</div>
            <div className="stat-sub">{vc < 0 ? t.ventricleCompressed : t.ventricleEnlarged}</div>
          </div>
        )}
      </div>
      {event && <p className="callout warn">{tr(event.desc, lang)}</p>}
    </div>
  );
}

function Chip({ label, onClick, color }: { label: string; onClick?: () => void; color?: string }) {
  return (
    <button className="chip" onClick={onClick}>
      {color && <span className="dot" style={{ background: color }} />}
      {label}
    </button>
  );
}

function VesselDetails({ id, sim }: { id: string; sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const st = useApp();
  const v = VESSEL_BY_ID[id];
  const occ = st.occlusions.find((o) => o.vessel === id);
  // the phase in effect at the displayed time (a vessel may have several over time)
  const occNow = sim.activeOcclusions.find((o) => o.vessel === id);
  const phaseCount = st.occlusions.filter((o) => o.vessel === id).length;
  const vis = vesselVisual(id, sim);
  const territory = useMemo(() => vesselTerritory(id), [id]);
  const baselinePressure = useMemo(
    () => simulateHemodynamics({ occlusions: [], variants: st.variants, map: st.map, collateral: st.collateral }).vesselPressure[id],
    [id, st.variants, st.map, st.collateral],
  );
  const pressure = sim.hemo.vesselPressure[id];
  // "what if this vessel were blocked?" — alone, untreated, at the time shown on the timeline
  const tH = TIME_STOPS[st.tIndex].h;
  const preview = useMemo(
    () =>
      isOccludable(id) && !occ
        ? simulate({
            occlusions: [{ vessel: id, severity: 1 }],
            variants: st.variants,
            map: st.map,
            collateral: st.collateral,
            tH,
            reperfusionH: null,
            decompression: false,
          })
        : null,
    [id, occ, st.variants, st.map, st.collateral, tH],
  );
  if (!v) return null;
  const parent = v.parent ? VESSEL_BY_ID[v.parent] : null;
  return (
    <div className="details">
      <div className="kicker">{t.vessel}</div>
      <h2>
        {vesselName(v, lang)} {v.abbr && <span className="abbr">{v.abbr}</span>}
      </h2>
      <p>{tr(v.desc, lang)}</p>
      {!v.visualOnly && (
        <div className="stat-row">
          <div className="stat">
            <div className="stat-label">{t.currentFlow}</div>
            <div className="stat-value">
              {fmtFlow(vis.flow)} <small>{t.mlMin}</small>
            </div>
            <div className="stat-sub">
              {t.baseline} {fmtFlow(vis.baseline)} {t.mlMin}
            </div>
          </div>
          {pressure !== undefined && (
            <div className="stat">
              <div className="stat-label">{t.pressure}</div>
              <div className="stat-value">
                {Math.round(pressure)} <small>{t.mmHg}</small>
              </div>
              {baselinePressure !== undefined && (
                <div className="stat-sub">
                  {t.baseline} {Math.round(baselinePressure)} {t.mmHg}
                </div>
              )}
            </div>
          )}
          <div className="stat">
            <div className="stat-label">{t.state}</div>
            <div className="stat-value small" style={{ color: vis.color === '#1c1c1c' ? '#ff6b7d' : vis.color }}>
              {vesselStateLabel(vis, occNow, t)}
            </div>
          </div>
        </div>
      )}
      {isOccludable(id) && (
        <div className="actions">
          <button className={`btn ${occ ? '' : 'danger'} block`} onClick={() => st.toggleOcclusion(id)}>
            {occ ? t.unocclude : t.occlude}
          </button>
          {phaseCount <= 1 && (
            <div className="seg small" role="group" aria-label={t.stenosis}>
              {([0.5, 0.7, 0.9, 1] as const).map((sv) => {
                const on = !!occ && !occ.branch && occ.severity === sv;
                return (
                  <button key={sv} aria-pressed={on} className={on ? 'active' : ''} onClick={() => st.setOcclusion(id, on ? null : sv)}>
                    {t.stenosisOptions[sv]}
                  </button>
                );
              })}
            </div>
          )}
          {phaseCount <= 1 && canBeLacunar(v.baseId, v.n) && (
            <>
              <button
                className={`btn block${occ?.branch ? ' active' : ''}`}
                aria-pressed={!!occ?.branch}
                onClick={() => st.setOcclusion(id, occ?.branch ? null : 1, true)}
              >
                {t.lacuneOption}
              </button>
              <p className="muted small">{t.lacuneHint}</p>
            </>
          )}
          {occ && <ScheduleEditor vessel={id} sim={sim} />}
        </div>
      )}
      {preview && (
        <section className="whatif">
          <h3>{t.whatIfAt(tH === 0 ? null : stopTime(st.tIndex, lang))}</h3>
          {preview.volumes.core < 0.5 &&
          preview.volumes.finalInfarct < 0.5 &&
          preview.syndromes.length === 0 &&
          !preview.symptoms.some((s) => !s.delayed) ? (
            <p className="muted">{t.whatIfNone}</p>
          ) : (
            <>
              <div className="stat-row">
                <div className="stat">
                  <div className="stat-label">{t.infarct}</div>
                  <div className="stat-value" style={{ color: STATE_COLORS.core }}>
                    {fmtMl(preview.volumes.core)} <small>{t.ml}</small>
                  </div>
                </div>
                {preview.volumes.penumbra >= 0.5 && (
                  <div className="stat">
                    <div className="stat-label">{t.penumbra}</div>
                    <div className="stat-value" style={{ color: STATE_COLORS.penumbra }}>
                      {fmtMl(preview.volumes.penumbra)} <small>{t.ml}</small>
                    </div>
                  </div>
                )}
                <div className="stat">
                  <div className="stat-label">{t.nihss}</div>
                  <div className="stat-value">{preview.nihss.total}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t.finalInfarct}</div>
                  <div className="stat-value small">
                    {fmtMl(preview.volumes.finalInfarct)} <small>{t.ml}</small>
                  </div>
                </div>
              </div>
              <p className="muted small">{t.whatIfTimeNote}</p>
              {preview.syndromes.slice(0, 3).map((s) => (
                <div key={s.def.id + s.side} className="syndrome-mini">
                  {tr(s.def.name, lang)}
                </div>
              ))}
              <ul className="bullets">
                {preview.symptoms
                  .filter((s) => !s.delayed)
                  .sort((a, b) => b.sev - a.sev)
                  .slice(0, 6)
                  .map((s) => (
                    <li key={s.id + s.side}>{symptomLabel(s, lang, t)}</li>
                  ))}
              </ul>
              <button className="btn block" onClick={() => st.toggleOcclusion(id)}>
                {t.occlude} →
              </button>
            </>
          )}
        </section>
      )}
      {territory.length > 0 && (
        <section>
          <h3>{t.supplies}</h3>
          <div className="chips">
            {territory.slice(0, 18).map((x) => (
              <Chip
                key={x.region}
                label={`${regionName(REGION_BY_ID[x.region], lang)} ${x.share < 0.95 ? pct(x.share) : ''}`}
                onClick={() => st.select({ kind: 'region', id: x.region })}
              />
            ))}
          </div>
        </section>
      )}
      {(parent || v.children.length > 0) && (
        <section>
          {parent && (
            <>
              <h3>{t.parentVessel}</h3>
              <div className="chips">
                <Chip label={vesselName(parent, lang)} onClick={() => st.select({ kind: 'vessel', id: parent.id })} />
              </div>
            </>
          )}
          {v.children.length > 0 && (
            <>
              <h3>{t.branches}</h3>
              <div className="chips">
                {v.children.map((c) => (
                  <Chip key={c} label={vesselName(VESSEL_BY_ID[c], lang)} onClick={() => st.select({ kind: 'vessel', id: c })} />
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const uniqSorted = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);
const SEVERITIES = [0.5, 0.7, 0.9, 1] as const;

/**
 * When a vessel's occlusion begins, whether it reopens by itself, and later phases (a stenosis
 * that becomes an occlusion). Times are on the timeline clock.
 */
function ScheduleEditor({ vessel, sim }: { vessel: string; sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const update = useApp((s) => s.updateOcclusion);
  const remove = useApp((s) => s.removeOcclusionAt);
  const addPhase = useApp((s) => s.addOcclusionPhase);
  const [laterAt, setLaterAt] = useState<number | null>(null);
  const s = SCHEDULE_UI[lang];
  const idx = phasesOf(occlusions, vessel);
  if (!idx.length) return null;
  const v = VESSEL_BY_ID[vessel];
  const lacunar = !!v && canBeLacunar(v.baseId, v.n);
  const multi = idx.length > 1;
  const last = occlusions[idx[idx.length - 1]];
  // a later complete occlusion makes sense after a stenosis or after a transient occlusion
  const canAdd = !(isTreatable(last) && endOf(last) === null);
  const laterOptions = TIME_STOPS.map((x) => x.h).filter((h) => h > startOf(last));
  const laterDefault = laterOptions.find((h) => h >= Math.max(72, endOf(last) ?? 0)) ?? laterOptions[laterOptions.length - 1];
  const later = laterAt !== null && laterOptions.includes(laterAt) ? laterAt : laterDefault;
  return (
    <div className="sched">
      <div className="sched-title">{s.timing}</div>
      {idx.map((i, k) => {
        const o = occlusions[i];
        const prev = k > 0 ? occlusions[idx[k - 1]] : null;
        const next = k + 1 < idx.length ? occlusions[idx[k + 1]] : null;
        const from = startOf(o);
        const to = endOf(o);
        const nextFrom = next ? startOf(next) : Infinity;
        const startOpts = uniqSorted([...TIME_STOPS.map((x) => x.h), from]).filter((h) => (!prev || h > startOf(prev)) && h < nextFrom);
        const endOpts = REOPEN_AFTER_H.filter((d) => from + d < nextFrom - 1e-9);
        const endValue = to === null ? 'never' : next && near(to, nextFrom) ? 'next' : String(to - from);
        const custom = endValue !== 'never' && endValue !== 'next' && !endOpts.some((d) => String(d) === endValue);
        const status = sim.schedule.status[i] ?? 'active';
        return (
          <div className="sched-row" key={i}>
            <div className="sched-row-head">
              {multi && <span className="sched-k">{s.phase(k + 1)}</span>}
              {multi && (
                <select
                  className="sched-sev"
                  aria-label={s.severity}
                  value={o.branch ? 'b' : String(o.severity)}
                  onChange={(e) =>
                    update(i, e.target.value === 'b' ? { severity: 1, branch: true } : { severity: Number(e.target.value), branch: undefined })
                  }
                >
                  {SEVERITIES.map((sv) => (
                    <option key={sv} value={String(sv)}>
                      {t.stenosisOptions[sv]}
                    </option>
                  ))}
                  {lacunar && <option value="b">{t.lacuneTag}</option>}
                </select>
              )}
              {status === 'reopened' && progressed(occlusions, o) ? (
                <span className="sched-status">{s.progressed}</span>
              ) : (
                <span className={`sched-status st-${status}`}>{s.status[status]}</span>
              )}
              {multi && (
                <button className="x" aria-label={s.removePhase} title={s.removePhase} onClick={() => remove(i)}>
                  ×
                </button>
              )}
            </div>
            <div className="sched-fields">
              <label className="sched-field">
                <span>{s.starts}</span>
                <select value={String(from)} onChange={(e) => update(i, { fromH: Number(e.target.value) })}>
                  {startOpts.map((h) => (
                    <option key={h} value={String(h)}>
                      {formatClock(h, lang)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sched-field">
                <span>{s.reopens}</span>
                <select
                  value={endValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    update(i, { toH: val === 'never' ? null : val === 'next' ? nextFrom : from + Number(val) });
                  }}
                >
                  {!next && <option value="never">{s.never}</option>}
                  {endOpts.map((d) => (
                    <option key={d} value={String(d)}>
                      {s.after(formatClock(d, lang))}
                    </option>
                  ))}
                  {custom && <option value={endValue}>{s.after(formatClock(Number(endValue), lang))}</option>}
                  {next && <option value="next">{s.untilNext}</option>}
                </select>
              </label>
            </div>
          </div>
        );
      })}
      {canAdd && laterOptions.length > 0 && (
        <div className="sched-add">
          <label className="sched-field">
            <span>{s.laterOcclusion}</span>
            <select value={String(later)} onChange={(e) => setLaterAt(Number(e.target.value))}>
              {laterOptions.map((h) => (
                <option key={h} value={String(h)}>
                  {formatClock(h, lang)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn small" onClick={() => addPhase(vessel, later)}>
            {s.add}
          </button>
        </div>
      )}
      <p className="muted small">{s.timingHint}</p>
    </div>
  );
}

/** the parent arteries of a region's suppliers (e.g. the PICA trunk for its lateral branch), not already in the list */
function upstreamOf(suppliers: string[]): string[] {
  const out: string[] = [];
  for (const id of suppliers) {
    const parent = VESSEL_BY_ID[id]?.parent;
    if (parent && !suppliers.includes(parent) && !out.includes(parent) && isOccludable(parent)) out.push(parent);
  }
  return out;
}

function RegionDetails({ id, sim }: { id: string; sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const select = useApp((s) => s.select);
  const r = REGION_BY_ID[id];
  const def = REGION_DEFS.find((d) => d.id === r?.baseId);
  const supply = useMemo(() => (r ? regionSupply(r) : []), [r]);
  if (!r || !def) return null;
  const rs = sim.regions[id];
  const stateKey = rs?.dominant ?? 'normal';
  const tH = sim.input.tH;
  // cascade events responsible for secondary effects (compression, degeneration …) here
  const causes = [
    ...new Set(
      r.beds.flatMap((b) =>
        (sim.cascade.bedEffects[b] ?? []).filter((e) => e.onsetH <= tH && tH < (e.endH ?? Infinity)).map((e) => e.event),
      ),
    ),
  ]
    .map((eid) => sim.cascade.events.find((e) => e.id === eid))
    .filter((e): e is CascadeEvent => !!e);
  const deficits = def.deficits.filter((d) => !d.only || d.only === r.side);
  return (
    <div className="details">
      <div className="kicker">{t.region}</div>
      <h2>{regionName(r, lang)}</h2>
      <p>{tr(r.func, lang)}</p>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">{t.perfusion}</div>
          <div className="stat-value">{pct(rs?.rel ?? 1)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t.state}</div>
          <div className="stat-value small">{t.states[stateKey as keyof typeof t.states] ?? stateKey}</div>
        </div>
        {rs && rs.infarct >= 0.01 && (
          <div className="stat">
            <div className="stat-label">{t.infarctShare}</div>
            <div className="stat-value">{pct(rs.infarct)}</div>
          </div>
        )}
        {r.volume > 0.05 && (
          <div className="stat">
            <div className="stat-label">{t.volume}</div>
            <div className="stat-value">
              {fmtMl(r.volume)} <small>{t.ml}</small>
            </div>
          </div>
        )}
      </div>
      {causes.length > 0 && (
        <p className="callout warn">
          {t.cause}: {causes.map((e) => tr(e.title, lang)).join('；')}
        </p>
      )}
      <RegionNow id={id} sim={sim} />
      <section>
        <h3>{t.suppliedBy}</h3>
        <ul className="supply-list">
          {supply.map((s) => (
            <li key={s.vessel}>
              <Chip label={`${vesselName(VESSEL_BY_ID[s.vessel], lang)} ${pct(s.share)}`} onClick={() => select({ kind: 'vessel', id: s.vessel })} />
              <OccludeToggle vessel={s.vessel} />
            </li>
          ))}
          {upstreamOf(supply.map((s) => s.vessel)).map((vid) => (
            <li key={vid} className="upstream">
              <Chip label={`${STACK_UI[lang].upstream} ${vesselName(VESSEL_BY_ID[vid], lang)}`} onClick={() => select({ kind: 'vessel', id: vid })} />
              <OccludeToggle vessel={vid} />
            </li>
          ))}
        </ul>
        <p className="muted small">{STACK_UI[lang].supplyHint}</p>
      </section>
      {deficits.length > 0 && (
        <section>
          <h3>{t.ifDamaged}</h3>
          <ul className="bullets">
            {deficits.map((d, i) => {
              const sym = SYMPTOM_BY_ID[d.s];
              const side = d.lat === 'none' || r.side === 'm' ? null : d.lat === 'contra' ? (r.side === 'r' ? 'l' : 'r') : r.side;
              return (
                <li key={d.s + i}>
                  {symptomLabel({ id: d.s, side, sev: d.sev ?? 2, sources: [], delayed: !!sym?.delayed }, lang, t)}
                  {d.bilateralOnly && <span className="muted"> {lang === 'en' ? '(if both sides)' : '（雙側受損時）'}</span>}
                  {sym?.delayed && <span className="tag">{t.delayedTag}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {r.structures && r.structures.length > 0 && (
        <section>
          <h3>{t.structures}</h3>
          <dl className="structures">
            {r.structures.map((s) => (
              <div key={s.name.en}>
                <dt>{tr(s.name, lang)}</dt>
                <dd>{tr(s.role, lang)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────── results ───────────────────────────
function Results({ sim }: { sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const tIndex = useApp((s) => s.tIndex);
  const setTIndex = useApp((s) => s.setTIndex);
  const select = useApp((s) => s.select);
  const removeOcclusionAt = useApp((s) => s.removeOcclusionAt);
  const map = useApp((s) => s.map);
  const reperfusionH = useApp((s) => s.reperfusionH);
  const treatment = useApp((s) => s.treatment);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const sched = SCHEDULE_UI[lang];
  const series = useSimSeries();
  const tH = TIME_STOPS[tIndex].h;
  const txSummary = reperfusionH !== null ? treatmentSummary(treatment, lang) : null;
  if (!occlusions.length && map >= 70) return <p className="muted">{t.noOcclusion}</p>;
  // the oedema model's shift when it reports one, else the cascade's estimate
  const shift = midlineShiftOf(sim);
  const nihssItems = NIHSS_ORDER.filter((k) => (sim.nihss.items[k] ?? 0) > 0);

  const bySystem = new Map<SymptomSystem, typeof sim.symptoms>();
  for (const s of sim.symptoms) {
    const sys = SYMPTOM_BY_ID[s.id]?.system ?? 'cognition';
    if (!bySystem.has(sys)) bySystem.set(sys, []);
    bySystem.get(sys)!.push(s);
  }
  const events = sim.cascade.events;
  const visibleEvents = showAllEvents ? events : events.filter((e) => e.onsetH <= tH + 1e-6 || e.onsetH <= 24);
  const affected = Object.entries(sim.regions)
    .filter(([, r]) => r.dys >= 0.2 || r.infarct >= 0.2 || r.effect)
    .sort((a, b) => Math.max(b[1].dys, b[1].infarct) - Math.max(a[1].dys, a[1].infarct))
    .slice(0, 40);
  const flowChanges = Object.keys(sim.hemo.vesselFlow)
    .map((id) => ({ id, vis: vesselVisual(id, sim) }))
    .filter((x) => x.vis.state === 'reversed' || x.vis.state === 'noflow' || (x.vis.state === 'reduced' && Math.abs(x.vis.baseline) > 2) || x.vis.state === 'collateral_active')
    .sort((a, b) => Math.abs(b.vis.flow - b.vis.baseline) - Math.abs(a.vis.flow - a.vis.baseline))
    .slice(0, 14);

  return (
    <div className="results">
      <div className="chips occ-list">
        {occlusions.map((o, i) => {
          const status = sim.schedule.status[i] ?? 'active';
          const when = occlusionWindow(o, lang, sched);
          // a phase that ended because the vessel's next phase began (e.g. stenosis → occlusion)
          const worse = status === 'reopened' && progressed(occlusions, o);
          return (
            <span key={i} className={`chip occ${status === 'active' ? '' : ' occ-inactive'}`}>
              <span className="dot" style={{ background: o.severity >= 1 && !o.branch ? STATE_COLORS.core : '#f28c28' }} />
              {vesselName(VESSEL_BY_ID[o.vessel], lang)}
              {o.severity < 1 && ` ${Math.round(o.severity * 100)}%`}
              {o.branch && ` · ${t.lacuneTag}`}
              {when && <span className="occ-when">{when}</span>}
              {status === 'treated' && <span className="badge good">{t.recanalized}</span>}
              {status === 'reopened' && <span className={`badge${worse ? '' : ' good'}`}>{worse ? sched.progressed : sched.status.reopened}</span>}
              {status === 'pending' && <span className="badge">{sched.status.pending}</span>}
              <button
                className="x"
                aria-label={`${lang === 'en' ? 'Remove' : '移除'} ${vesselName(VESSEL_BY_ID[o.vessel], lang)}`}
                onClick={() => removeOcclusionAt(i)}
              >
                ×
              </button>
            </span>
          );
        })}
      </div>
      {txSummary && (
        <p className="tx-summary small">
          {TREATMENT_UI[lang].summaryLabel}
          {lang === 'en' ? ': ' : '：'}
          {txSummary}
        </p>
      )}
      {sim.schedule.onsetH > 0 && <p className="muted small">{sched.indexOnset(formatClock(sim.schedule.onsetH, lang))}</p>}
      <NowSummary sim={sim} series={series} />
      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">
            {t.infarct} · {formatHours(tH, lang)}
          </div>
          <div className="stat-value" style={{ color: STATE_COLORS.core }}>
            {fmtMl(sim.volumes.core)} <small>{t.ml}</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">{t.penumbra}</div>
          <div className="stat-value" style={{ color: STATE_COLORS.penumbra }}>
            {fmtMl(sim.volumes.penumbra)} <small>{t.ml}</small>
          </div>
        </div>
        <div className="stat">
          <div className="stat-label">{t.finalInfarct}</div>
          <div className="stat-value">
            {fmtMl(sim.volumes.finalInfarct)} <small>{t.ml}</small>
          </div>
        </div>
        {sim.volumes.saved > 0.5 && (
          <div className="stat">
            <div className="stat-label">{t.saved}</div>
            <div className="stat-value" style={{ color: STATE_COLORS.salvaged }}>
              {fmtMl(sim.volumes.saved)} <small>{t.ml}</small>
            </div>
          </div>
        )}
      </div>
      <div className="stat-row">
        <div className="stat">
          <div className="stat-label">{t.neuronsLost}</div>
          <div className="stat-value small">{fmtNeurons(sim.neuronsLost, lang)}</div>
        </div>
        <div className="stat">
          <div className="stat-label">{t.cbf}</div>
          <div className="stat-value small">
            {Math.round(sim.hemo.totalCbf)} / {Math.round(sim.hemo.baselineCbf)} {t.mlMin}
          </div>
        </div>
        {shift >= 0.5 && (
          <div className="stat" title={t.midlineShiftNote}>
            <div className="stat-label">{t.midlineShift}</div>
            <div className="stat-value small" style={{ color: shift >= 5 ? STATE_COLORS.core : undefined }}>
              {shift.toFixed(1)} mm{sim.input.decompression && tH >= 36 ? ` · ${t.decompressed}` : ''}
            </div>
          </div>
        )}
      </div>

      <FunctionTimeline series={series} />

      <section className="nihss">
        <h3>
          {t.nihss}: <span className="num big">{sim.nihss.total}</span> <span className={`badge sev-${sim.nihss.category}`}>{sim.nihss.uncaptured ? t.nihssNotCaptured : t.nihssCategory[sim.nihss.category]}</span>
        </h3>
        {nihssItems.length > 0 && (
          <details className="nihss-items">
            <summary>{t.nihssBreakdown}</summary>
            <ul>
              {nihssItems.map((k) => (
                <li key={k}>
                  <span>{t.nihssItems[k] ?? k}</span>
                  <span className="num">{sim.nihss.items[k]}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
        <p className="muted small">{t.nihssNote}</p>
        {sim.nihss.uncaptured && <p className="callout warn">{t.nihssUncaptured}</p>}
        {sim.nihss.posteriorCaveat && <p className="callout warn">{t.posteriorCaveat}</p>}
      </section>

      {sim.syndromes.length > 0 && (
        <section>
          <h3>{t.syndromes}</h3>
          {sim.syndromes.map((s) => (
            <details key={s.def.id + (s.side ?? '')} className="syndrome" open={sim.syndromes.length <= 2}>
              <summary>
                {s.side && <span className="side-tag">{s.side === 'r' ? (lang === 'en' ? 'R' : '右') : lang === 'en' ? 'L' : '左'}</span>}
                {tr(s.def.name, lang)}
              </summary>
              <p>{tr(s.def.desc, lang)}</p>
            </details>
          ))}
        </section>
      )}

      <section>
        <h3>{t.symptoms}</h3>
        {sim.symptoms.length === 0 && <p className="muted">{t.noSymptoms}</p>}
        {SYSTEM_ORDER.filter((s) => bySystem.has(s)).map((sys) => (
          <div key={sys} className="sym-group">
            <h4>{lang === 'en' ? SYSTEM_LABEL[sys].en : SYSTEM_LABEL[sys].zh}</h4>
            <ul className="bullets">
              {bySystem
                .get(sys)!
                .sort((a, b) => b.sev - a.sev)
                .map((s) => (
                  <li key={s.id + s.side} title={tr(SYMPTOM_BY_ID[s.id].desc, lang)}>
                    <span className={`sev sev${s.sev}`} aria-hidden="true" />
                    {symptomLabel(s, lang, t)}
                    {s.delayed && <span className="tag">{t.delayedTag}</span>}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      <section>
        <h3>{t.timeline}</h3>
        <ol className="events">
          {visibleEvents.map((e) => (
            <EventItem key={e.id} e={e} tH={tH} onJump={() => setTIndex(nearestStop(e.onsetH))} onRegion={(id) => select({ kind: 'region', id })} />
          ))}
        </ol>
        {events.length > visibleEvents.length || showAllEvents ? (
          <button className="btn small ghost" onClick={() => setShowAllEvents(!showAllEvents)}>
            {showAllEvents ? t.showLess : `${t.showMore} (${events.length - visibleEvents.length})`}
          </button>
        ) : null}
      </section>

      {flowChanges.length > 0 && (
        <section>
          <h3>{t.flowChanges}</h3>
          <ul className="flow-list">
            {flowChanges.map(({ id, vis }) => (
              <li key={id}>
                <button onClick={() => select({ kind: 'vessel', id })}>
                  <span className="dot" style={{ background: vis.color }} />
                  <span className="grow">{vesselName(VESSEL_BY_ID[id], lang)}</span>
                  <span className="num">
                    {fmtFlow(vis.baseline)} → {vis.state === 'reversed' ? '↺ ' : ''}
                    {fmtFlow(vis.flow)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3>{t.affectedRegions}</h3>
        <ul className="region-list">
          {affected.map(([id, r]) => {
            const pctLabel = regionAffectedPct(r);
            return (
              <li key={id}>
                <button onClick={() => select({ kind: 'region', id })}>
                  <span className="grow">{regionName(REGION_BY_ID[id], lang)}</span>
                  <span className={`state-tag st-${r.dominant}`}>{t.states[r.dominant as keyof typeof t.states]}</span>
                  {pctLabel && <span className="num">{pctLabel}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function vesselStateLabel(vis: VesselVisual, occ: Occlusion | undefined, t: Strings): string {
  if (vis.state === 'occluded') return t.states.occluded;
  if (occ?.branch) return t.states.branchOccluded;
  if (vis.state === 'stenosed') return `${t.states.stenosed} ${Math.round((occ?.severity ?? 0) * 100)}%`;
  if (vis.state === 'reversed') return t.reversedFlow;
  if (vis.state === 'noflow') return t.noFlow;
  if (vis.state === 'reduced') return `${t.states.reduced} (${pct(vis.ratio)})`;
  return t.states.normal;
}

const NIHSS_ORDER = ['1a', '1b', '1c', '2', '3', '4', '5l', '5r', '6l', '6r', '7', '8', '9', '10', '11'];

function nearestStop(h: number) {
  let best = 0;
  TIME_STOPS.forEach((s, i) => {
    if (s.h <= h + 1e-6) best = i;
  });
  if (TIME_STOPS[best].h < h && best < TIME_STOPS.length - 1) best++;
  return best;
}

function EventItem({ e, tH, onJump, onRegion }: { e: CascadeEvent; tH: number; onJump: () => void; onRegion: (id: string) => void }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const active = e.onsetH <= tH && tH < (e.endH ?? Infinity);
  const past = (e.endH ?? Infinity) <= tH;
  return (
    <li className={`event ev-${e.severity}${active ? ' active' : past ? ' past' : ' future'}`}>
      <button className="ev-time" onClick={onJump} title={lang === 'en' ? 'Jump to this time' : '跳到這個時間'}>
        {formatHours(e.onsetH, lang)}
      </button>
      <div className="ev-body">
        <div className="ev-kind">
          {t.eventKinds[e.kind]}
          {e.peakH !== undefined && ` · ${t.peakAt} ${formatHours(e.peakH, lang)}`}
        </div>
        <div className="ev-title">{tr(e.title, lang)}</div>
        <p>{tr(e.desc, lang)}</p>
        {e.regions.length > 0 && (
          <div className="chips small">
            {e.regions.slice(0, 8).map((r) => (
              <button key={r} className="chip" onClick={() => onRegion(r)}>
                {regionName(REGION_BY_ID[r], lang)}
              </button>
            ))}
            {e.regions.length > 8 && <span className="muted small">+{e.regions.length - 8}</span>}
          </div>
        )}
      </div>
    </li>
  );
}
