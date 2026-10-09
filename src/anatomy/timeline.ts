import type { L, Lang } from './types';

export interface TimeStop {
  h: number;
  label: L;
}

/** Discrete time points of the timeline slider (hours after occlusion). */
export const TIME_STOPS: TimeStop[] = [
  { h: 0, label: { zh: '發生時', en: 'Onset' } },
  { h: 0.25, label: { zh: '15 分', en: '15 min' } },
  { h: 0.5, label: { zh: '30 分', en: '30 min' } },
  { h: 1, label: { zh: '1 小時', en: '1 h' } },
  { h: 2, label: { zh: '2 小時', en: '2 h' } },
  { h: 3, label: { zh: '3 小時', en: '3 h' } },
  { h: 4.5, label: { zh: '4.5 小時', en: '4.5 h' } },
  { h: 6, label: { zh: '6 小時', en: '6 h' } },
  { h: 12, label: { zh: '12 小時', en: '12 h' } },
  { h: 24, label: { zh: '1 天', en: '1 day' } },
  { h: 48, label: { zh: '2 天', en: '2 days' } },
  { h: 72, label: { zh: '3 天', en: '3 days' } },
  { h: 120, label: { zh: '5 天', en: '5 days' } },
  { h: 168, label: { zh: '1 週', en: '1 week' } },
  { h: 336, label: { zh: '2 週', en: '2 weeks' } },
  { h: 720, label: { zh: '1 個月', en: '1 month' } },
  { h: 2160, label: { zh: '3 個月', en: '3 months' } },
  { h: 4320, label: { zh: '6 個月', en: '6 months' } },
];

/** Reperfusion (recanalisation) options, hours after onset. */
export const REPERFUSION_STOPS = [0.5, 1, 2, 3, 4.5, 6, 12, 24];

export type Phase = 'hyperacute' | 'acute' | 'subacute' | 'chronic';

export function phaseOf(h: number): Phase {
  if (h < 6) return 'hyperacute';
  if (h < 168) return 'acute';
  if (h < 720) return 'subacute';
  return 'chronic';
}

export const PHASE_LABEL: Record<Phase, L> = {
  hyperacute: { zh: '超急性期（0–6 小時）', en: 'Hyperacute (0–6 h)' },
  acute: { zh: '急性期（6 小時–1 週）', en: 'Acute (6 h–1 week)' },
  subacute: { zh: '亞急性期（1–4 週）', en: 'Subacute (1–4 weeks)' },
  chronic: { zh: '慢性期（1 個月以上）', en: 'Chronic (> 1 month)' },
};

export function formatHours(h: number, lang: Lang): string {
  if (lang === 'de') {
    if (h < 1) return `${Math.round(h * 60)} min`;
    if (h < 48) return `${+h.toFixed(1)} h`;
    if (h < 336) { const n = Math.round(h / 24); return `${n} ${n === 1 ? 'Tag' : 'Tage'}`; }
    if (h < 1440) { const n = Math.round(h / 168); return `${n} ${n === 1 ? 'Woche' : 'Wochen'}`; }
    const n = Math.round(h / 720); return `${n} ${n === 1 ? 'Monat' : 'Monate'}`;
  }
  if (lang === 'ja') {
    if (h < 1) return `${Math.round(h * 60)} 分`;
    if (h < 48) return `${+h.toFixed(1)} 時間`;
    if (h < 336) return `${Math.round(h / 24)} 日`;
    if (h < 1440) return `${Math.round(h / 168)} 週間`;
    return `${Math.round(h / 720)} か月`;
  }
  if (lang === 'zh-CN') {
    if (h < 1) return `${Math.round(h * 60)} 分钟`;
    if (h < 48) return `${+h.toFixed(1)} 小时`;
    if (h < 336) return `${Math.round(h / 24)} 天`;
    if (h < 1440) return `${Math.round(h / 168)} 周`;
    return `${Math.round(h / 720)} 个月`;
  }
  const zh = lang === 'zh-TW';
  if (h < 1) return zh ? `${Math.round(h * 60)} 分鐘` : `${Math.round(h * 60)} min`;
  if (h < 48) return zh ? `${+h.toFixed(1)} 小時` : `${+h.toFixed(1)} h`;
  if (h < 336) return zh ? `${Math.round(h / 24)} 天` : `${Math.round(h / 24)} days`;
  if (h < 1440) return zh ? `${Math.round(h / 168)} 週` : `${Math.round(h / 168)} weeks`;
  return zh ? `${Math.round(h / 720)} 個月` : `${Math.round(h / 720)} months`;
}
