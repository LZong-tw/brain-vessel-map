import { Suspense, lazy, useEffect } from 'react';
import { Legend } from './components/Legend';
import { LeftPanel } from './components/LeftPanel';
import { Modals } from './components/Modals';
import { RightPanel } from './components/RightPanel';
import { Timeline } from './components/Timeline';
import { TopBar } from './components/TopBar';
import { BrainstemSections } from './components/diagrams/BrainstemSections';
import { WillisDiagram } from './components/diagrams/WillisDiagram';
import { REGION_BY_ID, VESSEL_BY_ID, regionName, vesselName } from './anatomy';
import { useSimulation, useT } from './state/hooks';
import { useApp, type ViewMode } from './state/store';

const Scene3D = lazy(() => import('./scene/Scene3D').then((m) => ({ default: m.Scene3D })));

function HoverTip() {
  const hovered = useApp((s) => s.hovered);
  const lang = useApp((s) => s.lang);
  const view = useApp((s) => s.view);
  if (!hovered || view !== '3d') return null;
  const label =
    hovered.kind === 'vessel'
      ? VESSEL_BY_ID[hovered.id] && vesselName(VESSEL_BY_ID[hovered.id], lang)
      : REGION_BY_ID[hovered.id] && regionName(REGION_BY_ID[hovered.id], lang);
  if (!label) return null;
  return (
    <div className="hover-tip" role="status">
      {label}
    </div>
  );
}

export default function App() {
  const t = useT();
  const sim = useSimulation();
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);
  const mobilePanel = useApp((s) => s.mobilePanel);
  const setMobilePanel = useApp((s) => s.setMobilePanel);
  const lang = useApp((s) => s.lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${t.appTitle} · ${lang === 'en' ? 'Brain Vessel Map' : 'Brain Vessel Map'}`;
  }, [lang, t.appTitle]);

  const views: [ViewMode, string][] = [
    ['3d', t.view3d],
    ['willis', t.viewWillis],
    ['brainstem', t.viewBrainstem],
  ];

  return (
    <div className={`app mobile-${mobilePanel}`}>
      <TopBar />
      <div className="main">
        <LeftPanel sim={sim} />
        <main className="center">
          <nav className="view-tabs" role="tablist">
            {views.map(([k, label]) => (
              <button key={k} role="tab" aria-selected={view === k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="stage">
            {view === '3d' && (
              <Suspense fallback={<div className="scene-message loading">{t.loading}</div>}>
                <Scene3D sim={sim} />
              </Suspense>
            )}
            {view === 'willis' && <WillisDiagram sim={sim} />}
            {view === 'brainstem' && <BrainstemSections sim={sim} />}
            <HoverTip />
            <Legend />
          </div>
          <Timeline sim={sim} />
        </main>
        <RightPanel sim={sim} />
      </div>
      <nav className="mobile-nav" aria-label="panels">
        <button className={mobilePanel === 'left' ? 'active' : ''} onClick={() => setMobilePanel(mobilePanel === 'left' ? 'none' : 'left')}>
          {t.controls}
        </button>
        <button className={mobilePanel === 'none' ? 'active' : ''} onClick={() => setMobilePanel('none')}>
          {t.view3d}
        </button>
        <button className={mobilePanel === 'right' ? 'active' : ''} onClick={() => setMobilePanel(mobilePanel === 'right' ? 'none' : 'right')}>
          {t.results}
        </button>
      </nav>
      <Modals />
    </div>
  );
}
