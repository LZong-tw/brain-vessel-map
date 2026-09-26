/**
 * 主應用程式元件
 * Main Application Component
 */

import { Scene } from './components/Scene';
import { Controls } from './components/Controls';
import { InfoPanel } from './components/InfoPanel';
import { useAppStore } from './store/appStore';
import { translations } from './i18n/translations';
import './App.css';

function App() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const t = translations[language];

  return (
    <div className="app">
      {/* Header with disclaimer */}
      <header className="header">
        <div className="header-content">
          <div>
            <h1 className="title">{t.title}</h1>
            <p className="subtitle">{t.subtitle}</p>
          </div>
          <div className="language-selector">
            <button
              className={language === 'zh-TW' ? 'active' : ''}
              onClick={() => setLanguage('zh-TW')}
            >
              繁體中文
            </button>
            <button
              className={language === 'en' ? 'active' : ''}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
          </div>
        </div>
      </header>

      {/* Emergency disclaimer banner */}
      <div className="disclaimer-banner">{t.disclaimer}</div>
      <div className="emergency-banner">{t.emergency}</div>

      {/* 3D Scene */}
      <main className="scene-container">
        <Scene />
        <Controls />
        <InfoPanel />
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>
          Open source educational project •{' '}
          <a
            href="https://github.com/yourusername/brain-vessel-map"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>{' '}
          • MIT License
        </p>
      </footer>
    </div>
  );
}

export default App;
