import { VESSEL_BY_ID, vesselName } from '../anatomy';
import { isOccludable } from '../engine/simulate';
import { STACK_UI } from '../i18n/uiStack';
import { useApp } from '../state/store';

/**
 * Block or unblock one artery in place, adding it to (or removing it from) the current
 * occlusions — so several arteries can be combined without leaving the list you are in.
 */
export function OccludeToggle({ vessel }: { vessel: string }) {
  const lang = useApp((s) => s.lang);
  const on = useApp((s) => s.occlusions.some((o) => o.vessel === vessel));
  const toggle = useApp((s) => s.toggleOcclusion);
  const v = VESSEL_BY_ID[vessel];
  if (!v || !isOccludable(vessel)) return null;
  const st = STACK_UI[lang];
  const name = vesselName(v, lang);
  return (
    <button
      type="button"
      className={`occ-toggle${on ? ' on' : ''}`}
      aria-pressed={on}
      aria-label={on ? st.unoccludeAria(name) : st.occludeAria(name)}
      title={on ? st.unoccludeAria(name) : st.occludeAria(name)}
      onClick={() => toggle(vessel)}
    >
      {on ? st.occluded : st.occlude}
    </button>
  );
}

/** The occlusions in effect now, each removable, with a note that they can be combined. */
export function CurrentOcclusions() {
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const removeAt = useApp((s) => s.removeOcclusionAt);
  const select = useApp((s) => s.select);
  const st = STACK_UI[lang];
  return (
    <section className="group current-occ" aria-label={st.currentTitle}>
      <h3>{st.currentTitle}</h3>
      {occlusions.length === 0 ? (
        <p className="muted small">{st.none}</p>
      ) : (
        <div className="chips">
          {occlusions.map((o, i) => {
            const v = VESSEL_BY_ID[o.vessel];
            const name = v ? vesselName(v, lang) : o.vessel;
            const extra = o.branch ? st.branch : o.severity < 1 ? st.partial(Math.round(o.severity * 100)) : '';
            return (
              <span key={`${o.vessel}-${i}`} className="chip occ-chip">
                <button type="button" className="occ-name" onClick={() => select({ kind: 'vessel', id: o.vessel })}>
                  {name}
                  {extra && <span className="muted small"> · {extra}</span>}
                </button>
                <button type="button" className="x" aria-label={st.remove(name)} title={st.remove(name)} onClick={() => removeAt(i)}>
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
      <p className="muted small">{st.hint}</p>
    </section>
  );
}
