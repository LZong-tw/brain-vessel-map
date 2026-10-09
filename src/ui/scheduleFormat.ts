/**
 * Formatting helpers for occlusion schedules (times on the simulation clock, durations,
 * positions on the stepped timeline).
 */

import { tr } from '../anatomy';
import { TIME_STOPS } from '../anatomy/timeline';
import type { Lang } from '../anatomy/types';
import type { Occlusion } from '../engine/hemodynamics';
import { endOf, startOf } from '../engine/schedule';
import type { ScheduleStrings } from '../i18n/uiSchedule';
import { inlineText } from '../i18n/content';

/** how long a transient occlusion may last before it reopens by itself (h) */
export const REOPEN_AFTER_H = [1 / 12, 1 / 6, 0.25, 0.5, 1, 2, 6, 12, 24, 72, 168];

const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

/**
 * A time or a duration, exact enough to tell 72 h from 78 h: "5 分鐘", "4.5 小時",
 * "1 小時 5 分鐘", "3 天", "3 天 6 小時", "1 週". Times that are timeline stops use its labels.
 */
export function formatClock(h: number, lang: Lang): string {
  if (h <= 0) return '0';
  const stop = TIME_STOPS.find((s) => near(s.h, h));
  if (stop && stop.h >= 1) return tr(stop.label, lang);
  const totalMin = Math.round(h * 60);
  if (totalMin < 60) return inlineText(lang, `${totalMin} 分鐘`, `${totalMin} min`, `${totalMin} 分钟`, `${totalMin} min`, `${totalMin} 分`);
  if (h < 24) {
    if (near(h * 2, Math.round(h * 2))) return inlineText(lang, `${+h.toFixed(1)} 小時`, `${+h.toFixed(1)} h`, `${+h.toFixed(1)} 小时`, `${+h.toFixed(1)} h`, `${+h.toFixed(1)} 時間`);
    const hh = Math.floor(totalMin / 60);
    const mm = totalMin - hh * 60;
    return inlineText(lang, `${hh} 小時 ${mm} 分鐘`, `${hh} h ${mm} min`, `${hh} 小时 ${mm} 分钟`, `${hh} h ${mm} min`, `${hh} 時間 ${mm} 分`);
  }
  const d = Math.floor((totalMin + 0.5) / 1440);
  const restMin = totalMin - d * 1440;
  const days = inlineText(lang, `${d} 天`, `${d} ${d === 1 ? 'day' : 'days'}`, `${d} 天`, `${d} ${d === 1 ? 'Tag' : 'Tage'}`, `${d} 日`);
  return restMin < 1 ? days : `${days} ${formatClock(restMin / 60, lang)}`;
}

/** the time window of an occlusion for its chip ("3 天起", "0–5 分鐘"), or '' when it simply starts at 0 and lasts */
export function occlusionWindow(o: Occlusion, lang: Lang, s: ScheduleStrings): string {
  const from = startOf(o);
  const to = endOf(o);
  if (from === 0 && to === null) return '';
  return to === null ? s.chipFrom(formatClock(from, lang)) : s.chipRange(formatClock(from, lang), formatClock(to, lang));
}

/** position of time h on the stepped timeline, in stops (fractional between two stops) */
export function stopPosition(h: number): number {
  const n = TIME_STOPS.length - 1;
  if (h <= 0) return 0;
  if (h >= TIME_STOPS[n].h) return n;
  let i = 0;
  while (TIME_STOPS[i + 1].h <= h) i++;
  return i + (h - TIME_STOPS[i].h) / (TIME_STOPS[i + 1].h - TIME_STOPS[i].h);
}
