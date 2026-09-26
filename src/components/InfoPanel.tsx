/**
 * 資訊面板元件
 * Info Panel Component
 */

import { useAppStore } from '../store/appStore';
import { translations } from '../i18n/translations';
import { vessels } from '../data/vessels';
import { brainRegions } from '../data/regions';

export function InfoPanel() {
  const language = useAppStore((state) => state.language);
  const blockedVessels = useAppStore((state) => state.blockedVessels);
  const occlusionResult = useAppStore((state) => state.occlusionResult);

  const t = translations[language].info;

  if (blockedVessels.size === 0) {
    return (
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          maxWidth: '350px',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>{t.title}</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          {t.clickVessel}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        maxWidth: '400px',
        maxHeight: '80vh',
        overflow: 'auto',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>{t.title}</h3>

      <div style={{ marginBottom: '12px' }}>
        <strong style={{ fontSize: '14px' }}>{t.blockedVessels}:</strong>
        <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '13px' }}>
          {Array.from(blockedVessels).map((vesselId) => {
            const vessel = vessels[vesselId];
            return (
              <li key={vesselId}>
                {language === 'zh-TW' ? vessel.nameZh : vessel.nameEn}
              </li>
            );
          })}
        </ul>
      </div>

      {occlusionResult && (
        <>
          {occlusionResult.affectedRegionsFull.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '14px', color: '#d32f2f' }}>
                {t.affectedRegionsFull}:
              </strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '13px' }}>
                {occlusionResult.affectedRegionsFull.map((regionId) => {
                  const region = brainRegions[regionId];
                  return (
                    <li key={regionId}>
                      {language === 'zh-TW' ? region.nameZh : region.nameEn}
                      {language === 'zh-TW' && (
                        <span style={{ color: '#666', fontSize: '12px' }}>
                          {' '}
                          - {region.descriptionZh}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {occlusionResult.affectedRegionsPartial.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '14px', color: '#f57c00' }}>
                {t.affectedRegionsPartial}:
              </strong>
              <ul style={{ margin: '4px 0', paddingLeft: '20px', fontSize: '13px' }}>
                {occlusionResult.affectedRegionsPartial.map((regionId) => {
                  const region = brainRegions[regionId];
                  return (
                    <li key={regionId}>
                      {language === 'zh-TW' ? region.nameZh : region.nameEn}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div style={{ marginBottom: '12px' }}>
            <strong style={{ fontSize: '14px' }}>{t.consequences}:</strong>
            <div
              style={{
                marginTop: '8px',
                padding: '12px',
                background: '#fff3e0',
                borderLeft: '4px solid #ff9800',
                borderRadius: '4px',
                fontSize: '13px',
                whiteSpace: 'pre-line',
              }}
            >
              {occlusionResult.consequencesZh}
            </div>
          </div>

          {occlusionResult.syndrome && (
            <div>
              <strong style={{ fontSize: '14px' }}>{t.syndrome}:</strong>
              <div
                style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: '#ffebee',
                  borderLeft: '4px solid #f44336',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <strong>{occlusionResult.syndrome.nameZh}</strong>
                <br />
                <span style={{ fontSize: '12px', color: '#666' }}>
                  {occlusionResult.syndrome.nameEn}
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
