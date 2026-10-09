import { REGION_BY_ID, regionName, tr } from '../anatomy';
import { formatHours } from '../anatomy/timeline';
import type { CascadeEvent } from '../engine/cascade';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { inlineText } from '../i18n/content';

/** One cascade event: when it starts (a button that jumps there), what it is, the regions involved. */
export function EventItem({ e, tH, onJump, onRegion }: { e: CascadeEvent; tH: number; onJump: () => void; onRegion: (id: string) => void }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const active = e.onsetH <= tH && tH < (e.endH ?? Infinity);
  const past = (e.endH ?? Infinity) <= tH;
  return (
    <li className={`event ev-${e.severity}${active ? ' active' : past ? ' past' : ' future'}`}>
      <button className="ev-time" onClick={onJump} title={inlineText(lang, '跳到這個時間', 'Jump to this time', '跳到此时间', 'Zu diesem Zeitpunkt springen', 'この時点に移動')}>
        {formatHours(e.onsetH, lang)}
      </button>
      <div className="ev-body">
        <div className="ev-kind">
          {t.eventKinds[e.kind]}
          {e.peakH !== undefined && ` · ${t.peakAt} ${formatHours(e.peakH, lang)}`}
        </div>
        <div className="ev-title">{tr(e.title, lang)}</div>
        <p>{tr(e.desc, lang)}</p>
        {e.regions.length > 0 && (
          <div className="chips small">
            {e.regions.slice(0, 8).map((r) => (
              <button key={r} className="chip" onClick={() => onRegion(r)}>
                {regionName(REGION_BY_ID[r], lang)}
              </button>
            ))}
            {e.regions.length > 8 && <span className="muted small">+{e.regions.length - 8}</span>}
          </div>
        )}
      </div>
    </li>
  );
}
