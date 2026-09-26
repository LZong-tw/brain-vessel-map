/**
 * 控制面板元件
 * Controls Panel Component
 */

import { useAppStore } from '../store/appStore';
import { translations } from '../i18n/translations';

export function Controls() {
  const language = useAppStore((state) => state.language);
  const layers = useAppStore((state) => state.layers);
  const toggleLayer = useAppStore((state) => state.toggleLayer);
  const resetBlocked = useAppStore((state) => state.resetBlocked);

  const t = translations[language].controls;

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        minWidth: '200px',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>{t.title}</h3>
      
      <button
        onClick={resetBlocked}
        style={{
          width: '100%',
          padding: '8px',
          marginBottom: '12px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        {t.reset}
      </button>

      <div style={{ marginTop: '12px' }}>
        <strong style={{ fontSize: '14px' }}>{t.layers}</strong>
        <div style={{ marginTop: '8px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={layers.cerebrum}
              onChange={() => toggleLayer('cerebrum')}
              style={{ marginRight: '8px' }}
            />
            {t.showCerebrum}
          </label>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={layers.cerebellum}
              onChange={() => toggleLayer('cerebellum')}
              style={{ marginRight: '8px' }}
            />
            {t.showCerebellum}
          </label>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={layers.brainstem}
              onChange={() => toggleLayer('brainstem')}
              style={{ marginRight: '8px' }}
            />
            {t.showBrainstem}
          </label>
          <label style={{ display: 'block', fontSize: '13px' }}>
            <input
              type="checkbox"
              checked={layers.vessels}
              onChange={() => toggleLayer('vessels')}
              style={{ marginRight: '8px' }}
            />
            {t.showVessels}
          </label>
        </div>
      </div>
    </div>
  );
}
