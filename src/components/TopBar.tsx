import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { LANGUAGES, LANGUAGE_LABELS, LANGUAGE_NAMES } from '../i18n/locales';
import type { Lang } from '../anatomy/types';

export function TopBar() {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const setLang = useApp((s) => s.setLang);
  const setModal = useApp((s) => s.setModal);
  return (
    <header className="topbar">
      <div className="brand">
        <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 4c-5 0-9 3.6-9 8.4 0 2 .7 3.7 2 5-1 1-1.6 2.4-1.6 3.9C7.4 25 10 27.6 13.4 27.6c1 0 1.9-.2 2.6-.6.7.4 1.6.6 2.6.6 3.4 0 6-2.6 6-5.9 0-1.5-.6-2.9-1.6-3.9 1.3-1.3 2-3 2-5C25 7.6 21 4 16 4z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M16 6v21M11 12c2 1 3 3 5 3M21 12c-2 1-3 3-5 3M10 20c2 0 4 1 6 3M22 20c-2 0-4 1-6 3" fill="none" stroke="#e0473f" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <div>
          <h1>{t.appTitle}</h1>
          <p className="subtitle">{t.appSubtitle}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <button className="btn warn" onClick={() => setModal('befast')}>
          {t.befast}
        </button>
        <button className="btn ghost" onClick={() => setModal('about')}>
          {t.about}
        </button>
        <select className="btn ghost" aria-label={LANGUAGE_LABELS[lang]} value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          {LANGUAGES.map((code) => <option key={code} value={code} lang={code}>{LANGUAGE_NAMES[code]}</option>)}
        </select>
      </div>
      <div className="disclaimer-strip" role="note">
        {t.disclaimerShort}
      </div>
    </header>
  );
}
