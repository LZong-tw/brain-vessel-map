import { useMemo, useState } from 'react';
import { REGIONS, VESSELS, VESSEL_BY_ID, regionName, tr, vesselName } from '../anatomy';
import type { VesselGroup } from '../anatomy';
import { SCENARIOS, type CameraView } from '../anatomy/scenarios';
import { REPERFUSION_STOPS, TIME_STOPS, formatHours } from '../anatomy/timeline';
import { VARIANTS } from '../anatomy/variants';
import { EMBOLUS_SIZES, dropEmbolus, type EmbolusSource } from '../engine/embolus';
import { simulateHemodynamics, type Occlusion } from '../engine/hemodynamics';
import { activeAt, isTreatable, startOf } from '../engine/schedule';
import type { SimResult } from '../engine/simulate';
import { useT } from '../state/hooks';
import { EDEMA_UI } from '../i18n/uiEdema';
import { SCHEDULE_UI } from '../i18n/uiSchedule';
import type { Lang } from '../anatomy/types';
import { useApp, type ColorMode, type EdemaScale, type Layers, type LeftTab } from '../state/store';
import { formatClock } from '../ui/scheduleFormat';
import { vesselVisual } from '../ui/vesselState';

export function LeftPanel({ sim }: { sim: SimResult }) {
  const t = useT();
  const tab = useApp((s) => s.leftTab);
  const setTab = useApp((s) => s.setLeftTab);
  const tabs: [LeftTab, string][] = [
    ['scenarios', t.tabScenarios],
    ['vessels', t.tabVessels],
    ['settings', t.tabSettings],
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
        {tab === 'scenarios' && <ScenariosTab />}
        {tab === 'vessels' && <VesselsTab sim={sim} />}
        {tab === 'settings' && <SettingsTab />}
        {tab === 'view' && <ViewTab />}
      </div>
    </aside>
  );
}

function ScenariosTab() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const current = useApp((s) => s.scenario);
  const load = useApp((s) => s.loadScenario);
  const groups = ['anterior', 'deep', 'posterior', 'haemodynamic'] as const;
  return (
    <div>
      <EmbolusBox />
      {groups.map((g) => (
        <section key={g} className="group">
          <h3>{t.scenarioGroups[g]}</h3>
          {SCENARIOS.filter((s) => s.group === g).map((s) => (
            <button key={s.id} className={`scenario-card${current === s.id ? ' active' : ''}`} onClick={() => load(s.id)}>
              <span className="sc-title">{tr(s.title, lang)}</span>
              <span className="sc-summary">{tr(s.summary, lang)}</span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

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
    <section className="group embolus-box">
      <h3>{t.embolusTitle}</h3>
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
    </section>
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
                  <li key={v.id}>
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

function SettingsTab() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const st = useApp();
  return (
    <div>
      <section className="group">
        <h3>{t.collateralGrade}</h3>
        <div className="seg" role="radiogroup" aria-label={t.collateralGrade}>
          {(['good', 'moderate', 'poor'] as const).map((c) => (
            <button key={c} role="radio" aria-checked={st.collateral === c} className={st.collateral === c ? 'active' : ''} onClick={() => st.setCollateral(c)}>
              {t.collateral[c]}
            </button>
          ))}
        </div>
        <p className="muted small">{t.collateralHint}</p>
      </section>
      <section className="group">
        <h3>
          {t.bloodPressure}: <span className="num">{st.map}</span> {t.mmHg}
        </h3>
        <input type="range" min={40} max={160} step={1} value={st.map} onChange={(e) => st.setMap(Number(e.target.value))} aria-label={t.bloodPressure} />
        <p className="muted small">{t.mapHint}</p>
      </section>
      <section className="group">
        <h3>{t.treatment}</h3>
        <label className="field">
          <span>{t.reperfusion}</span>
          <select value={st.reperfusionH ?? ''} onChange={(e) => st.setReperfusion(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">{t.reperfusionNone}</option>
            <TreatmentOptions occlusions={st.occlusions} lang={lang} reperfusionAt={t.reperfusionAt} />
          </select>
        </label>
        <p className="muted small">{t.reperfusionHint}</p>
        <label className="check">
          <input type="checkbox" checked={st.decompression} onChange={(e) => st.setDecompression(e.target.checked)} />
          {t.decompression}
        </label>
      </section>
      <section className="group">
        <h3>{t.variants}</h3>
        <p className="muted small">{t.variantsHint}</p>
        {VARIANTS.map((v) => (
          <label key={v.id} className="check variant">
            <input type="checkbox" checked={st.variants.includes(v.id)} onChange={() => st.toggleVariant(v.id)} />
            <span>
              <span className="v-name">{tr(v.name, lang)}</span> <span className="badge">{tr(v.prevalence, lang)}</span>
              <span className="v-desc">{tr(v.desc, lang)}</span>
            </span>
          </label>
        ))}
      </section>
      <div className="row gap">
        <button className="btn" onClick={st.clearOcclusions}>
          {t.clearOcclusions}
        </button>
        <button className="btn ghost" onClick={st.resetAll}>
          {t.resetAll}
        </button>
      </div>
    </div>
  );
}

/**
 * Treatment times: the usual delays after onset and, when complete occlusions begin later, the
 * same delays after each of those starts (treatment reopens whatever is occluded at that time).
 */
function TreatmentOptions({ occlusions, lang, reperfusionAt }: { occlusions: Occlusion[]; lang: Lang; reperfusionAt: string }) {
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
