import { useShallow } from 'zustand/react/shallow';
import { CASE_UI } from '../i18n/uiCase';
import { useApp } from '../state/store';
import { caseSummary } from '../ui/caseSummary';

/**
 * The case in one line above the timeline, so what is being simulated is always in view.
 * Pressing it opens the case tab (and the controls panel on a phone).
 */
export function CaseSummary() {
  const lang = useApp((s) => s.lang);
  const state = useApp(
    useShallow((s) => ({
      occlusions: s.occlusions,
      variants: s.variants,
      map: s.map,
      collateral: s.collateral,
      reperfusionH: s.reperfusionH,
      treatment: s.treatment,
      decompression: s.decompression,
    })),
  );
  const setLeftTab = useApp((s) => s.setLeftTab);
  const setMobilePanel = useApp((s) => s.setMobilePanel);
  const c = CASE_UI[lang];
  const text = caseSummary(state, lang).join(' · ');
  return (
    <div className="case-line">
      <button
        type="button"
        className="case-line-btn"
        title={text}
        onClick={() => {
          setLeftTab('case');
          setMobilePanel('left');
        }}
      >
        <span className="case-line-label">{c.caseLabel}</span>
        <span className="case-line-text">{text}</span>
        <span className="case-chevron" aria-hidden="true" />
      </button>
    </div>
  );
}
