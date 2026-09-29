import { useMemo, useState } from 'react';
import { REGIONS, VESSELS, regionName, tr, vesselName } from '../anatomy';
import type { VesselGroup } from '../anatomy';
import { SCENARIOS, type CameraView } from '../anatomy/scenarios';
import type { SimResult } from '../engine/simulate';
import { useT } from '../state/hooks';
import { EDEMA_UI } from '../i18n/uiEdema';
import { CASE_UI } from '../i18n/uiCase';
import { STACK_UI } from '../i18n/uiStack';
import { CurrentOcclusions, OccludeToggle } from './OccludeToggle';
import { CaseTab } from './CaseTab';
import { useApp, type ColorMode, type EdemaScale, type Layers, type LeftTab } from '../state/store';
import { vesselVisual } from '../ui/vesselState';

// the treatment details moved next to the case tab; tests and callers still import them from here
export { EvidenceBox, TreatmentDetails } from './TreatmentDetails';

export function LeftPanel({ sim }: { sim: SimResult }) {
  const t = useT();
  const tab = useApp((s) => s.leftTab);
  const setTab = useApp((s) => s.setLeftTab);
  const tabs: [LeftTab, string][] = [
    ['case', t.tabSettings],
    ['scenarios', t.tabScenarios],
    ['vessels', t.tabVessels],
    ['view', t.tabView],
  ];
  return (
    <aside className="panel left-panel">
      <nav className="tabs">
        {tabs.map(([k, label]) => (
          <button key={k} aria-pressed={tab === k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="panel-body">
        {tab === 'case' && <CaseTab sim={sim} />}
        {tab === 'scenarios' && <ScenariosTab />}
        {tab === 'vessels' && <VesselsTab sim={sim} />}
        {tab === 'view' && <ViewTab />}
      </div>
    </aside>
  );
}

/** Templates: loading one replaces the case, 「疊加」 adds its occlusions to the case. */
function ScenariosTab() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const current = useApp((s) => s.scenario);
  const load = useApp((s) => s.loadScenario);
  const addScenario = useApp((s) => s.addScenario);
  const hasOcclusions = useApp((s) => s.occlusions.length > 0);
  const st = STACK_UI[lang];
  const groups = ['anterior', 'deep', 'posterior', 'haemodynamic'] as const;
  return (
    <div>
      <p className="muted small case-hint">{CASE_UI[lang].templatesHint}</p>
      {groups.map((g) => (
        <section key={g} className="group">
          <h3>{t.scenarioGroups[g]}</h3>
          {SCENARIOS.filter((s) => s.group === g).map((s) => (
            <div key={s.id} className="scenario-row">
              <button className={`scenario-card${current === s.id ? ' active' : ''}`} onClick={() => load(s.id)}>
                <span className="sc-title">{tr(s.title, lang)}</span>
                <span className="sc-summary">{tr(s.summary, lang)}</span>
              </button>
              {hasOcclusions && current !== s.id && (
                <button
                  type="button"
                  className="sc-stack"
                  title={st.stackTitle}
                  aria-label={st.stackAria(tr(s.title, lang))}
                  onClick={() => addScenario(s.id)}
                >
                  {st.stack}
                </button>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

const GROUP_ORDER: VesselGroup[] = ['anterior', 'willis', 'posterior', 'extracranial', 'collateral'];

function VesselsTab({ sim }: { sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const selected = useApp((s) => s.selected);
  const select = useApp((s) => s.select);
  const hover = useApp((s) => s.hover);
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const match = (s: string) => !query || s.toLowerCase().includes(query);
  const regionHits = useMemo(
    () => (query ? REGIONS.filter((r) => match(regionName(r, 'zh-TW')) || match(regionName(r, 'en')) || match(r.id)).slice(0, 30) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query],
  );
  const anyVesselHit = useMemo(
    () => VESSELS.some((v) => !v.visualOnly && (match(vesselName(v, 'zh-TW')) || match(vesselName(v, 'en')) || match(v.abbr ?? '') || match(v.id))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query],
  );
  const noMatches = query !== '' && regionHits.length === 0 && !anyVesselHit;
  return (
    <div>
      <CurrentOcclusions />
      <input
        className="search"
        type="search"
        placeholder={t.searchVessels}
        value={q}
        onChange={(e) => {
          // the hovered row may disappear from the filtered list without a mouseleave
          hover(null);
          setQ(e.target.value);
        }}
        aria-label={t.searchVessels}
      />
      {noMatches && (
        <div className="empty-state">
          <p className="muted">{t.noVesselMatches(q.trim())}</p>
          <button className="btn small" onClick={() => setQ('')}>
            {t.clearSearch}
          </button>
        </div>
      )}
      {regionHits.length > 0 && (
        <section className="group">
          <h3>{t.region}</h3>
          <ul className="list">
            {regionHits.map((r) => (
              <li key={r.id}>
                <button
                  className={selected?.id === r.id ? 'active' : ''}
                  onClick={() => select({ kind: 'region', id: r.id })}
                  onMouseEnter={() => hover({ kind: 'region', id: r.id })}
                  onMouseLeave={() => hover(null)}
                >
                  {regionName(r, lang)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {GROUP_ORDER.map((g) => {
        const vs = VESSELS.filter(
          (v) => v.group === g && !v.visualOnly && (match(vesselName(v, 'zh-TW')) || match(vesselName(v, 'en')) || match(v.abbr ?? '') || match(v.id)),
        );
        if (!vs.length) return null;
        return (
          <section key={g} className="group">
            <h3>{t.vesselGroups[g]}</h3>
            <ul className="list">
              {vs.map((v) => {
                const vis = vesselVisual(v.id, sim);
                return (
                  <li key={v.id} className="row-with-action">
                    <button
                      className={selected?.id === v.id ? 'active' : ''}
                      onClick={() => select({ kind: 'vessel', id: v.id })}
                      onMouseEnter={() => hover({ kind: 'vessel', id: v.id })}
                      onMouseLeave={() => hover(null)}
                    >
                      <span className="dot" style={{ background: vis.color }} aria-hidden="true" />
                      <span className="grow">{vesselName(v, lang)}</span>
                      {v.abbr && <span className="abbr">{v.abbr}</span>}
                    </button>
                    <OccludeToggle vessel={v.id} />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

const COLOR_MODES: ColorMode[] = ['state', 'territory', 'anatomy', 'edema'];
const EDEMA_SCALES: EdemaScale[] = [1, 3, 5];

function ViewTab() {
  const t = useT();
  const st = useApp();
  const et = EDEMA_UI[st.lang];
  const layerKeys = Object.keys(t.layerNames) as (keyof Layers)[];
  const views: CameraView[] = ['left', 'right', 'front', 'back', 'top', 'bottom', 'brainstem'];
  return (
    <div>
      <section className="group">
        <h3>{t.colorMode}</h3>
        <div className="seg">
          {COLOR_MODES.map((m) => (
            <button key={m} aria-pressed={st.colorMode === m} className={st.colorMode === m ? 'active' : ''} onClick={() => st.setColorMode(m)}>
              {m === 'edema' ? et.colorMode : t.colorModes[m]}
            </button>
          ))}
        </div>
      </section>
      <section className="group">
        <h3>{et.scaleTitle}</h3>
        <div className="seg" role="radiogroup" aria-label={et.scaleTitle}>
          {EDEMA_SCALES.map((k) => (
            <button key={k} role="radio" aria-checked={st.edemaScale === k} className={st.edemaScale === k ? 'active' : ''} onClick={() => st.setEdemaScale(k)}>
              {et.scaleOption(k)}
            </button>
          ))}
        </div>
        {st.edemaScale > 1 && (
          <p className="callout warn" role="status">
            {et.exaggerated(st.edemaScale)}
          </p>
        )}
        <p className="muted small">{et.scaleHint}</p>
      </section>
      <section className="group">
        <h3>{t.layers}</h3>
        {layerKeys.map((k) => (
          <label key={k} className="check">
            <input type="checkbox" checked={st.layers[k]} onChange={() => st.toggleLayer(k)} />
            {t.layerNames[k]}
          </label>
        ))}
      </section>
      <section className="group">
        <h3>{t.hemispheres}</h3>
        <label className="check">
          <input type="checkbox" checked={st.hemis.r} onChange={() => st.toggleHemi('r')} />
          {t.hemiRight}
        </label>
        <label className="check">
          <input type="checkbox" checked={st.hemis.l} onChange={() => st.toggleHemi('l')} />
          {t.hemiLeft}
        </label>
        <label className="field">
          <span>
            {t.opacity}: {Math.round(st.cortexOpacity * 100)}%
          </span>
          <input type="range" min={0.1} max={1} step={0.05} value={st.cortexOpacity} onChange={(e) => st.setCortexOpacity(Number(e.target.value))} />
        </label>
      </section>
      <section className="group">
        <h3>{t.clipping}</h3>
        <div className="seg">
          {(['none', 'x', 'y', 'z'] as const).map((a) => (
            <button key={a} aria-pressed={st.clip.axis === a} className={st.clip.axis === a ? 'active' : ''} onClick={() => st.setClip({ axis: a, pos: a === 'y' ? -20 : a === 'z' ? 0 : 0 })}>
              {t.clipAxis[a]}
            </button>
          ))}
        </div>
        {st.clip.axis !== 'none' && (
          <input
            type="range"
            min={st.clip.axis === 'y' ? -105 : st.clip.axis === 'z' ? -75 : -72}
            max={st.clip.axis === 'y' ? 72 : st.clip.axis === 'z' ? 80 : 72}
            step={1}
            value={st.clip.pos}
            onChange={(e) => st.setClip({ pos: Number(e.target.value) })}
            aria-label={t.clipping}
          />
        )}
      </section>
      <section className="group">
        <h3>{t.tabView}</h3>
        <div className="view-grid">
          {views.map((v) => (
            <button key={v} className="btn small" onClick={() => st.requestCamera(v)}>
              {t.cameraViews[v]}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
