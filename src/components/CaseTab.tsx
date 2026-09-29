import { useId, useState, type ReactNode } from 'react';
import { VESSELS, VESSEL_BY_ID, tr, vesselName } from '../anatomy';
import { TIME_STOPS } from '../anatomy/timeline';
import { VARIANTS } from '../anatomy/variants';
import { EMBOLUS_SIZES, dropEmbolus, type EmbolusSource } from '../engine/embolus';
import { simulateHemodynamics } from '../engine/hemodynamics';
import { activeAt } from '../engine/schedule';
import type { SimResult } from '../engine/simulate';
import { CASE_UI } from '../i18n/uiCase';
import { STACK_UI } from '../i18n/uiStack';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { conditionsSummary, eventsSummary, occludedVessels, severityTag, treatmentLine } from '../ui/caseSummary';
import { ScheduleEditor } from './ScheduleEditor';
import { ReperfusionTimeOptions, TreatmentDetails } from './TreatmentDetails';

/**
 * A collapsible section: a header button (title and, for the case cards, a one-line summary of
 * the current values, so a closed card still tells the state) over its editor.
 */
function Collapsible({
  title,
  summary,
  defaultOpen,
  className,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen: boolean;
  className: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <section className={`${className}${open ? ' open' : ''}`} aria-label={title}>
      <button type="button" className="case-toggle" aria-expanded={open} aria-controls={bodyId} onClick={() => setOpen(!open)}>
        <span className="case-toggle-text">
          <span className="case-toggle-title">{title}</span>
          {summary !== undefined && (
            <span className="case-toggle-summary" title={summary}>
              {summary}
            </span>
          )}
        </span>
        <span className="case-chevron" aria-hidden="true" />
      </button>
      <div id={bodyId} className="case-body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}

/**
 * The case being simulated, in the order it happens: the conditions before onset, the occlusion
 * events and the treatment. Each card's header summarises it.
 */
export function CaseTab({ sim }: { sim: SimResult }) {
  const t = useT();
  const resetAll = useApp((s) => s.resetAll);
  return (
    <div className="case-tab">
      <ConditionsCard />
      <EventsCard sim={sim} />
      <TreatmentCard />
      <div className="row gap">
        <button className="btn ghost" onClick={resetAll}>
          {t.resetAll}
        </button>
      </div>
    </div>
  );
}

function ConditionsCard() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const collateral = useApp((s) => s.collateral);
  const setCollateral = useApp((s) => s.setCollateral);
  const map = useApp((s) => s.map);
  const setMap = useApp((s) => s.setMap);
  const variants = useApp((s) => s.variants);
  const toggleVariant = useApp((s) => s.toggleVariant);
  const c = CASE_UI[lang];
  return (
    <Collapsible className="case-card" title={c.conditionsTitle} summary={conditionsSummary({ collateral, map, variants }, lang)} defaultOpen>
      <div className="case-label">{t.collateralGrade}</div>
      <div className="seg" role="radiogroup" aria-label={t.collateralGrade}>
        {(['good', 'moderate', 'poor'] as const).map((g) => (
          <button key={g} role="radio" aria-checked={collateral === g} className={collateral === g ? 'active' : ''} onClick={() => setCollateral(g)}>
            {t.collateral[g]}
          </button>
        ))}
      </div>
      <p className="muted small">{t.collateralHint}</p>
      <label className="field">
        <span>
          {t.bloodPressure}: <span className="num">{map}</span> {t.mmHg}
        </span>
        <input type="range" min={40} max={160} step={1} value={map} onChange={(e) => setMap(Number(e.target.value))} aria-label={t.bloodPressure} />
      </label>
      <p className="muted small">{t.mapHint}</p>
      <Collapsible className="case-sub" title={c.variantsToggle(variants.length)} defaultOpen={false}>
        <p className="muted small">{t.variantsHint}</p>
        {VARIANTS.map((v) => (
          <label key={v.id} className="check variant">
            <input type="checkbox" checked={variants.includes(v.id)} onChange={() => toggleVariant(v.id)} />
            <span>
              <span className="v-name">{tr(v.name, lang)}</span> <span className="badge">{tr(v.prevalence, lang)}</span>
              <span className="v-desc">{tr(v.desc, lang)}</span>
            </span>
          </label>
        ))}
      </Collapsible>
    </Collapsible>
  );
}

function EventsCard({ sim }: { sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const map = useApp((s) => s.map);
  const selected = useApp((s) => s.selected);
  const select = useApp((s) => s.select);
  const setOcclusion = useApp((s) => s.setOcclusion);
  const clearOcclusions = useApp((s) => s.clearOcclusions);
  const setLeftTab = useApp((s) => s.setLeftTab);
  const c = CASE_UI[lang];
  const st = STACK_UI[lang];
  const vessels = occludedVessels(occlusions);
  const empty = vessels.length === 0;
  return (
    <Collapsible className="case-card" title={c.eventsTitle} summary={eventsSummary({ occlusions, map }, lang)} defaultOpen>
      {empty ? (
        <p className="muted small">{c.emptyEvents}</p>
      ) : (
        <ul className="case-events">
          {vessels.map((id) => {
            const v = VESSEL_BY_ID[id];
            const name = v ? vesselName(v, lang) : id;
            return (
              <li key={id} className="case-event">
                <div className="case-event-head">
                  <button
                    type="button"
                    className={`case-event-name${selected?.kind === 'vessel' && selected.id === id ? ' active' : ''}`}
                    onClick={() => select({ kind: 'vessel', id })}
                  >
                    {name}
                  </button>
                  <span className="badge">{severityTag(occlusions, id, lang)}</span>
                  <button type="button" className="x" aria-label={st.remove(name)} title={st.remove(name)} onClick={() => setOcclusion(id, null)}>
                    ×
                  </button>
                </div>
                <ScheduleEditor vessel={id} sim={sim} />
              </li>
            );
          })}
        </ul>
      )}
      <div className="case-actions">
        <button type="button" className="btn small" onClick={() => setLeftTab('scenarios')}>
          {empty ? c.startFromTemplate : c.stackTemplate}
        </button>
        <button type="button" className="btn small" onClick={() => setLeftTab('vessels')}>
          {empty ? c.addFromVessels : c.addVessel}
        </button>
      </div>
      {!empty && <p className="muted small">{c.combineHint}</p>}
      <Collapsible className="case-sub" title={c.embolusToggle} defaultOpen={false}>
        <EmbolusBox />
      </Collapsible>
      {!empty && (
        <button type="button" className="btn small case-clear" onClick={clearOcclusions}>
          {t.clearOcclusions}
        </button>
      )}
    </Collapsible>
  );
}

/** release an embolus from a chosen source and see where the flow carries it */
function EmbolusBox() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const start = useApp((s) => s.startEmbolus);
  const embolus = useApp((s) => s.embolus);
  const variants = useApp((s) => s.variants);
  const map = useApp((s) => s.map);
  const collateral = useApp((s) => s.collateral);
  const occlusions = useApp((s) => s.occlusions);
  const tIndex = useApp((s) => s.tIndex);
  const reperfusionH = useApp((s) => s.reperfusionH);
  const [source, setSource] = useState<EmbolusSource>('heart');
  const [size, setSize] = useState<(typeof EMBOLUS_SIZES)[number]['id']>('medium');
  const release = () => {
    // the embolus travels through the vessels as they are at the displayed time
    const hemo = simulateHemodynamics({ occlusions: activeAt(occlusions, TIME_STOPS[tIndex].h, reperfusionH), variants, map, collateral });
    const seed = Math.floor(Math.random() * 1e9);
    const mm = EMBOLUS_SIZES.find((x) => x.id === size)!.mm;
    start({ source, size, seed, result: dropEmbolus(source, mm, hemo, seed) });
  };
  const lodged = embolus?.done ? VESSELS.find((v) => v.id === embolus.result.lodged) : null;
  return (
    <div className="embolus-box">
      <p className="muted small">{t.embolusHint}</p>
      <label className="field">
        <span>{t.embolusSource}</span>
        <select value={source} onChange={(e) => setSource(e.target.value as EmbolusSource)}>
          {(Object.keys(t.embolusSources) as EmbolusSource[]).map((k) => (
            <option key={k} value={k}>
              {t.embolusSources[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t.embolusSize}</span>
        <select value={size} onChange={(e) => setSize(e.target.value as typeof size)}>
          {EMBOLUS_SIZES.map((s) => (
            <option key={s.id} value={s.id}>
              {t.embolusSizes[s.id]}
            </option>
          ))}
        </select>
      </label>
      <button className="btn primary block" onClick={release} disabled={!!embolus && !embolus.done}>
        {t.releaseEmbolus}
      </button>
      {lodged && (
        <p className="embolus-result" role="status">
          {embolus!.result.systemic ? t.embolusSystemic : `${t.embolusLodged}：${vesselName(lodged, lang)}`}
        </p>
      )}
    </div>
  );
}

function TreatmentCard() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const reperfusionH = useApp((s) => s.reperfusionH);
  const setReperfusion = useApp((s) => s.setReperfusion);
  const treatment = useApp((s) => s.treatment);
  const decompression = useApp((s) => s.decompression);
  const setDecompression = useApp((s) => s.setDecompression);
  const c = CASE_UI[lang];
  return (
    <Collapsible className="case-card" title={c.treatmentTitle} summary={treatmentLine({ reperfusionH, treatment, decompression }, lang)} defaultOpen>
      <label className="field">
        <span>{t.reperfusion}</span>
        <select value={reperfusionH ?? ''} onChange={(e) => setReperfusion(e.target.value === '' ? null : Number(e.target.value))}>
          <option value="">{t.reperfusionNone}</option>
          <ReperfusionTimeOptions occlusions={occlusions} lang={lang} reperfusionAt={t.reperfusionAt} />
        </select>
      </label>
      <p className="muted small">{t.reperfusionHint}</p>
      {reperfusionH !== null && <TreatmentDetails />}
      <label className="check">
        <input type="checkbox" checked={decompression} onChange={(e) => setDecompression(e.target.checked)} />
        {t.decompression}
      </label>
    </Collapsible>
  );
}
