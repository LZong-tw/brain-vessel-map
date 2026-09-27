import { useMemo, useState } from 'react';
import { REGION_BY_ID, VESSEL_BY_ID, regionName, tr, vesselName } from '../anatomy';
import { canBeLacunar } from '../anatomy/lacunes';
import type { SymptomSystem } from '../anatomy/types';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { TIME_STOPS, formatHours } from '../anatomy/timeline';
import { REGION_DEFS } from '../anatomy/regions';
import { midlineShiftAt, type CascadeEvent } from '../engine/cascade';
import { simulateHemodynamics, type Occlusion } from '../engine/hemodynamics';
import { isOccludable, previewOcclusion, type SimResult } from '../engine/simulate';
import type { Strings } from '../i18n/ui';
import { useT } from '../state/hooks';
import { useApp, type RightTab } from '../state/store';
import { STATE_COLORS } from '../ui/colors';
import { fmtFlow, fmtMl, fmtNeurons, pct, regionSupply, symptomLabel, vesselTerritory } from '../ui/format';
import { vesselVisual, type VesselVisual } from '../ui/vesselState';

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
  const onset = sim.cascade.hydrocephalusOnsetH;
  const event = sim.cascade.events.find((e) => e.id === 'hydrocephalus');
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
  const vis = vesselVisual(id, sim);
  const territory = useMemo(() => vesselTerritory(id), [id]);
  const baselinePressure = useMemo(
    () => simulateHemodynamics({ occlusions: [], variants: st.variants, map: st.map, collateral: st.collateral }).vesselPressure[id],
    [id, st.variants, st.map, st.collateral],
  );
  const pressure = sim.hemo.vesselPressure[id];
  const preview = useMemo(
    () =>
      isOccludable(id) && !occ
        ? previewOcclusion(id, { occlusions: [], variants: st.variants, map: st.map, collateral: st.collateral })
        : null,
    [id, occ, st.variants, st.map, st.collateral],
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
              {vesselStateLabel(vis, occ, t)}
            </div>
          </div>
        </div>
      )}
      {isOccludable(id) && (
        <div className="actions">
          <button className={`btn ${occ ? '' : 'danger'} block`} onClick={() => st.toggleOcclusion(id)}>
            {occ ? t.unocclude : t.occlude}
          </button>
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
          {canBeLacunar(v.baseId, v.n) && (
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
        </div>
      )}
      {preview && (
        <section className="whatif">
          <h3>{t.whatIf}</h3>
          {preview.volumes.core < 0.5 && preview.syndromes.length === 0 ? (
            <p className="muted">{t.whatIfNone}</p>
          ) : (
            <>
              <div className="stat-row">
                <div className="stat">
                  <div className="stat-label">{t.infarct}</div>
                  <div className="stat-value">
                    {fmtMl(preview.volumes.core)} <small>{t.ml}</small>
                  </div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t.nihss}</div>
                  <div className="stat-value">{preview.nihss.total}</div>
                </div>
              </div>
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
      <section>
        <h3>{t.suppliedBy}</h3>
        <div className="chips">
          {supply.map((s) => (
            <Chip
              key={s.vessel}
              label={`${vesselName(VESSEL_BY_ID[s.vessel], lang)} ${pct(s.share)}`}
              onClick={() => select({ kind: 'vessel', id: s.vessel })}
            />
          ))}
        </div>
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
const SYSTEM_ORDER: SymptomSystem[] = [
  'consciousness',
  'motor',
  'sensory',
  'language',
  'vision',
  'eye',
  'cranial',
  'balance',
  'cognition',
  'autonomic',
  'limb',
];
const SYSTEM_LABEL: Record<SymptomSystem, { zh: string; en: string }> = {
  consciousness: { zh: '意識', en: 'Consciousness' },
  motor: { zh: '運動', en: 'Motor' },
  sensory: { zh: '感覺', en: 'Sensation' },
  language: { zh: '語言', en: 'Language' },
  vision: { zh: '視覺', en: 'Vision' },
  eye: { zh: '眼球運動', en: 'Eye movements' },
  cranial: { zh: '腦神經（臉、吞嚥、聽覺）', en: 'Cranial nerves (face, swallowing, hearing)' },
  balance: { zh: '平衡與協調', en: 'Balance & coordination' },
  cognition: { zh: '認知與行為', en: 'Cognition & behaviour' },
  autonomic: { zh: '自主神經', en: 'Autonomic' },
  limb: { zh: '肢體血流', en: 'Limb circulation' },
};

function Results({ sim }: { sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const tIndex = useApp((s) => s.tIndex);
  const setTIndex = useApp((s) => s.setTIndex);
  const select = useApp((s) => s.select);
  const setOcclusion = useApp((s) => s.setOcclusion);
  const map = useApp((s) => s.map);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const tH = TIME_STOPS[tIndex].h;
  if (!occlusions.length && map >= 70) return <p className="muted">{t.noOcclusion}</p>;
  const shift = midlineShiftAt(sim.cascade.midlineShift, tH, sim.input.decompression);
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
        {occlusions.map((o) => (
          <span key={o.vessel} className="chip occ">
            <span className="dot" style={{ background: o.severity >= 1 && !o.branch ? STATE_COLORS.core : '#f28c28' }} />
            {vesselName(VESSEL_BY_ID[o.vessel], lang)}
            {o.severity < 1 && ` ${Math.round(o.severity * 100)}%`}
            {o.branch && ` · ${t.lacuneTag}`}
            {o.severity >= 1 && !o.branch && sim.recanalized && <span className="badge good">{t.recanalized}</span>}
            <button
              className="x"
              aria-label={`${lang === 'en' ? 'Remove' : '移除'} ${vesselName(VESSEL_BY_ID[o.vessel], lang)}`}
              onClick={() => setOcclusion(o.vessel, null)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
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

      <section className="nihss">
        <h3>
          {t.nihss}: <span className="num big">{sim.nihss.total}</span> <span className={`badge sev-${sim.nihss.category}`}>{t.nihssCategory[sim.nihss.category]}</span>
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
          {affected.map(([id, r]) => (
            <li key={id}>
              <button onClick={() => select({ kind: 'region', id })}>
                <span className="grow">{regionName(REGION_BY_ID[id], lang)}</span>
                <span className={`state-tag st-${r.dominant}`}>{t.states[r.dominant as keyof typeof t.states]}</span>
                <span className="num">{pct(Math.max(r.dys, r.infarct))}</span>
              </button>
            </li>
          ))}
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
