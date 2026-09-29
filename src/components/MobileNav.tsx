import { useT } from '../state/hooks';
import { useApp } from '../state/store';

/**
 * The phone layout's bottom bar: the controls panel, the picture (whichever view is open) and
 * the results panel. Tapping the open panel's button again closes it.
 */
export function MobileNav() {
  const t = useT();
  const mobilePanel = useApp((s) => s.mobilePanel);
  const setMobilePanel = useApp((s) => s.setMobilePanel);
  const view = useApp((s) => s.view);
  const viewLabel = view === 'willis' ? t.viewWillis : view === 'brainstem' ? t.viewBrainstem : t.view3d;
  return (
    <nav className="mobile-nav" aria-label={t.panelsNav}>
      <button className={mobilePanel === 'left' ? 'active' : ''} aria-pressed={mobilePanel === 'left'} onClick={() => setMobilePanel(mobilePanel === 'left' ? 'none' : 'left')}>
        {t.controls}
      </button>
      <button className={mobilePanel === 'none' ? 'active' : ''} aria-pressed={mobilePanel === 'none'} onClick={() => setMobilePanel('none')}>
        {viewLabel}
      </button>
      <button className={mobilePanel === 'right' ? 'active' : ''} aria-pressed={mobilePanel === 'right'} onClick={() => setMobilePanel(mobilePanel === 'right' ? 'none' : 'right')}>
        {t.results}
      </button>
    </nav>
  );
}
