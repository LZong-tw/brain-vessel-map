import { Suspense, lazy, useEffect, useState } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
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
      : hovered.kind === 'structure'
        ? lang === 'en'
          ? 'Ventricles (cerebrospinal fluid)'
          : '腦室（腦脊髓液）'
        : REGION_BY_ID[hovered.id] && regionName(REGION_BY_ID[hovered.id], lang);
  if (!label) return null;
  return (
    <div className="hover-tip" aria-hidden="true">
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
  // keep the WebGL canvas alive once opened: switching views must not rebuild the scene
  const [scene3dMounted, setScene3dMounted] = useState(view === '3d');
  useEffect(() => {
    if (view === '3d') setScene3dMounted(true);
  }, [view]);

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
          <nav className="view-tabs">
            {views.map(([k, label]) => (
              <button key={k} aria-pressed={view === k} className={view === k ? 'active' : ''} onClick={() => setView(k)}>
                {label}
              </button>
            ))}
          </nav>
          <div className="stage">
            {scene3dMounted && (
              <div className="scene-slot" hidden={view !== '3d'}>
                <ErrorBoundary
                  onError={() => useApp.getState().finishEmbolus()}
                  fallback={() => (
                    <div className="scene-message error">
                      {t.webglUnavailable}{' '}
                      <button className="btn small" onClick={() => window.location.reload()}>
                        {lang === 'en' ? 'Reload' : '重新載入'}
                      </button>
                    </div>
                  )}
                >
                  <Suspense fallback={<div className="scene-message loading">{t.loading}</div>}>
                    <Scene3D sim={sim} />
                  </Suspense>
                </ErrorBoundary>
              </div>
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
