import { useState } from 'react';
import { VESSEL_BY_ID } from '../anatomy';
import { canBeLacunar } from '../anatomy/lacunes';
import { TIME_STOPS } from '../anatomy/timeline';
import { endOf, isTreatable, phasesOf, progressed, startOf } from '../engine/schedule';
import type { SimResult } from '../engine/simulate';
import { SCHEDULE_UI } from '../i18n/uiSchedule';
import { useT } from '../state/hooks';
import { useApp } from '../state/store';
import { REOPEN_AFTER_H, formatClock } from '../ui/scheduleFormat';

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const uniqSorted = (xs: number[]) => [...new Set(xs)].sort((a, b) => a - b);
const SEVERITIES = [0.5, 0.7, 0.9, 1] as const;

/**
 * When a vessel's occlusion begins, whether it reopens by itself, and later phases (a stenosis
 * that becomes an occlusion). Times are on the timeline clock.
 */
export function ScheduleEditor({ vessel, sim }: { vessel: string; sim: SimResult }) {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const occlusions = useApp((s) => s.occlusions);
  const update = useApp((s) => s.updateOcclusion);
  const remove = useApp((s) => s.removeOcclusionAt);
  const addPhase = useApp((s) => s.addOcclusionPhase);
  const [laterAt, setLaterAt] = useState<number | null>(null);
  const s = SCHEDULE_UI[lang];
  const idx = phasesOf(occlusions, vessel);
  if (!idx.length) return null;
  const v = VESSEL_BY_ID[vessel];
  const lacunar = !!v && canBeLacunar(v.baseId, v.n);
  const multi = idx.length > 1;
  const last = occlusions[idx[idx.length - 1]];
  // a later complete occlusion makes sense after a stenosis or after a transient occlusion
  const canAdd = !(isTreatable(last) && endOf(last) === null);
  const laterOptions = TIME_STOPS.map((x) => x.h).filter((h) => h > startOf(last));
  const laterDefault = laterOptions.find((h) => h >= Math.max(72, endOf(last) ?? 0)) ?? laterOptions[laterOptions.length - 1];
  const later = laterAt !== null && laterOptions.includes(laterAt) ? laterAt : laterDefault;
  return (
    <div className="sched">
      <div className="sched-title">{s.timing}</div>
      {idx.map((i, k) => {
        const o = occlusions[i];
        const prev = k > 0 ? occlusions[idx[k - 1]] : null;
        const next = k + 1 < idx.length ? occlusions[idx[k + 1]] : null;
        const from = startOf(o);
        const to = endOf(o);
        const nextFrom = next ? startOf(next) : Infinity;
        const startOpts = uniqSorted([...TIME_STOPS.map((x) => x.h), from]).filter((h) => (!prev || h > startOf(prev)) && h < nextFrom);
        const endOpts = REOPEN_AFTER_H.filter((d) => from + d < nextFrom - 1e-9);
        const endValue = to === null ? 'never' : next && near(to, nextFrom) ? 'next' : String(to - from);
        const custom = endValue !== 'never' && endValue !== 'next' && !endOpts.some((d) => String(d) === endValue);
        const status = sim.schedule.status[i] ?? 'active';
        return (
          <div className="sched-row" key={i}>
            <div className="sched-row-head">
              {multi && <span className="sched-k">{s.phase(k + 1)}</span>}
              {multi && (
                <select
                  className="sched-sev"
                  aria-label={s.severity}
                  value={o.branch ? 'b' : String(o.severity)}
                  onChange={(e) =>
                    update(i, e.target.value === 'b' ? { severity: 1, branch: true } : { severity: Number(e.target.value), branch: undefined })
                  }
                >
                  {SEVERITIES.map((sv) => (
                    <option key={sv} value={String(sv)}>
                      {t.stenosisOptions[sv]}
                    </option>
                  ))}
                  {lacunar && <option value="b">{t.lacuneTag}</option>}
                </select>
              )}
              {status === 'reopened' && progressed(occlusions, o) ? (
                <span className="sched-status">{s.progressed}</span>
              ) : (
                <span className={`sched-status st-${status}`}>{s.status[status]}</span>
              )}
              {multi && (
                <button className="x" aria-label={s.removePhase} title={s.removePhase} onClick={() => remove(i)}>
                  ×
                </button>
              )}
            </div>
            <div className="sched-fields">
              <label className="sched-field">
                <span>{s.starts}</span>
                <select value={String(from)} onChange={(e) => update(i, { fromH: Number(e.target.value) })}>
                  {startOpts.map((h) => (
                    <option key={h} value={String(h)}>
                      {formatClock(h, lang)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sched-field">
                <span>{s.reopens}</span>
                <select
                  value={endValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    update(i, { toH: val === 'never' ? null : val === 'next' ? nextFrom : from + Number(val) });
                  }}
                >
                  {!next && <option value="never">{s.never}</option>}
                  {endOpts.map((d) => (
                    <option key={d} value={String(d)}>
                      {s.after(formatClock(d, lang))}
                    </option>
                  ))}
                  {custom && <option value={endValue}>{s.after(formatClock(Number(endValue), lang))}</option>}
                  {next && <option value="next">{s.untilNext}</option>}
                </select>
              </label>
            </div>
          </div>
        );
      })}
      {canAdd && laterOptions.length > 0 && (
        <div className="sched-add">
          <label className="sched-field">
            <span>{s.laterOcclusion}</span>
            <select value={String(later)} onChange={(e) => setLaterAt(Number(e.target.value))}>
              {laterOptions.map((h) => (
                <option key={h} value={String(h)}>
                  {formatClock(h, lang)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn small" onClick={() => addPhase(vessel, later)}>
            {s.add}
          </button>
        </div>
      )}
      <p className="muted small">{s.timingHint}</p>
    </div>
  );
}
