import type { Lang } from '../anatomy/types';
import { MRA_DISTAL } from '../i18n/mraDistal';

const groups = ['central', 'leftACA', 'leftMCA', 'rightMCA', 'rightACA', 'leftPCA', 'rightPCA'] as const;
export function MraDistalControls({ lang, enabled, active, error, selected, change, choose, retry, cameraKey, focus, allowedFamilies = [1, 2, 3, 4, 5, 6, 7] }: {
  lang: Lang; enabled: boolean; active: boolean; error: boolean; selected: number | null;
  change: (enabled: boolean) => void; choose: (id: number | null) => void; retry: () => void;
  cameraKey: (key: string) => void; focus: (id: number | null) => void;
  allowedFamilies?: number[];
}) {
  const s = MRA_DISTAL[lang];
  const visibleGroups = groups.map((key, index) => ({ key, id: index + 1 })).filter(group => allowedFamilies.includes(group.id));
  return <details className="mra-distal-controls" open={enabled} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); choose(null); focus(null); }
  }}>
    <summary>{s.mode}</summary>
    <label><input type="checkbox" checked={enabled} onChange={event => change(event.target.checked)} />{s.mode}</label>
    {enabled && <>
      <p className="rec-caveat small">{s.notice}</p>
      {!active && <p role={error ? 'alert' : 'status'}>{error ? s.error : s.loading}</p>}
      {error && <button onClick={retry}>{s.retry}</button>}
      {active && <>
        <p className="small">{s.cameraHelp}</p>
        <button onFocus={() => focus(null)} onKeyDown={event => {
          if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-'].includes(event.key)) { event.preventDefault(); cameraKey(event.key); }
        }}>{s.camera}</button>
        <div role="group" aria-label={s.families} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focus(null); }}>
          {visibleGroups.map(({ key, id }, index) => <button key={key} aria-pressed={selected === id} onFocus={() => focus(id)} onClick={() => choose(id)} onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); choose(id); }
            const delta = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : ['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 0;
            if (delta || event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              const next = event.key === 'Home' ? 0 : event.key === 'End' ? visibleGroups.length - 1 : (index + delta + visibleGroups.length) % visibleGroups.length;
              (event.currentTarget.parentElement!.children[next] as HTMLElement).focus();
            }
          }}>{s[key]}</button>)}
        </div>
        <button onClick={() => { choose(null); focus(null); }}>{s.clear}</button>
        <p role="status">{selected ? s[groups[selected - 1]] : ''}</p>
      </>}
      <p><a href="https://www.nitrc.org/projects/bravissima/" target="_blank" rel="noreferrer">{s.source}</a></p>
    </>}
  </details>;
}
