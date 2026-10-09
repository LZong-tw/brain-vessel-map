import { BED_BY_ID, REGION_BY_ID, VESSEL_BY_ID, tr } from '../anatomy';
import type { L, Lang, Region, SymptomSystem } from '../anatomy';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { TIME_STOPS, formatHours } from '../anatomy/timeline';
import type { BedEffectKind } from '../engine/cascade';
import type { SymptomItem } from '../engine/clinical';
import type { EdemaState } from '../engine/edemaTypes';
import { getUnits } from '../engine/hemodynamics';
import type { SimResult } from '../engine/simulate';
import { finalInfarctProb, infarctFraction, penumbraDecidedH, type TissueState } from '../engine/tissue';
import { tissueParamsForUnit } from '../engine/tissueParams';
import type { Strings } from '../i18n/ui';
import { STATE_COLORS } from './colors';
import { inlineText } from '../i18n/content';
import { usesLatinSpacing } from '../i18n/locales';

export function symptomLabel(s: SymptomItem, lang: Lang, t: Strings): string {
  const def = SYMPTOM_BY_ID[s.id];
  if (!def) return s.id;
  const name = tr(def.name, lang);
  const side = s.side;
  if (!def.lateralised || !side) return name;
  const en = usesLatinSpacing(lang);
  const lowerName = lang === 'en' ? name.charAt(0).toLowerCase() + name.slice(1) : name;
  switch (def.sideWord) {
    case 'eye':
      return en ? `${t.eyeSide[side]}: ${lowerName}` : `${t.eyeSide[side]}${name}`;
    case 'field':
      return en ? `${name} (${t.fieldSide[side].toLowerCase()})` : `${name}（${t.fieldSide[side]}）`;
    case 'gaze':
      if (s.id === 'gaze_deviation') {
        if (side === 'both') return name;
        return inlineText(lang, `雙眼偏向${side === 'r' ? '右' : '左'}側（看向病灶）`, `Eyes deviate to the ${side === 'r' ? 'right' : 'left'} (towards the lesion)`, `双眼偏向${side === 'r' ? '右' : '左'}侧（朝向病灶）`, `Blickdeviation nach ${side === 'r' ? 'rechts' : 'links'} (zur Läsion)`, `両眼が${side === 'r' ? '右' : '左'}へ偏倚（病変側）`);
      }
      if (side === 'both') return inlineText(lang, '雙向水平凝視麻痺', 'Horizontal gaze palsy (both directions)', '双向水平凝视麻痹', 'Horizontale Blickparese (beide Richtungen)', '両方向の水平注視麻痺');
      return inlineText(lang, `無法向${side === 'r' ? '右' : '左'}側看`, `Cannot look to the ${side === 'r' ? 'right' : 'left'}`, `无法向${side === 'r' ? '右' : '左'}侧注视`, `Blick nach ${side === 'r' ? 'rechts' : 'links'} nicht möglich`, `${side === 'r' ? '右' : '左'}への注視不能`);
    default:
      return en ? `${t.bodySide[side]}: ${lowerName}` : `${t.bodySide[side]}${name}`;
  }
}

export function fmtMl(v: number): string {
  if (v < 1) return v < 0.05 ? '0' : v.toFixed(1);
  return v < 10 ? v.toFixed(1) : Math.round(v).toString();
}

export function fmtFlow(v: number): string {
  const a = Math.abs(v);
  return a < 10 ? a.toFixed(1) : Math.round(a).toString();
}

export function fmtNeurons(n: number, lang: Lang): string {
  if (n <= 0) return '0';
  if (lang === 'de') return n >= 1e9 ? `${(n / 1e9).toFixed(1)} Milliarden` : `${Math.round(n / 1e6)} Millionen`;
  if (lang === 'ja') return n >= 1e8 ? `${(n / 1e8).toFixed(1)} 億` : `${Math.round(n / 1e4).toLocaleString('ja-JP')} 万`;
  if (lang === 'zh-CN') return n >= 1e8 ? `${(n / 1e8).toFixed(1)} 亿` : `${Math.round(n / 1e4).toLocaleString('zh-CN')} 万`;
  if (lang === 'en') {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)} billion`;
    return `${Math.round(n / 1e6)} million`;
  }
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)} 億`;
  return `${Math.round(n / 1e4).toLocaleString()} 萬`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;
/** a share of a region: "<1%" for a small part that is there but rounds to 0 % (W3-5) */
export const pctShare = (x: number) => (x > 0 && Math.round(x * 100) === 0 ? '<1%' : pct(x));

/** Arterial supply of a region: vessel → share (volume-weighted over its beds). */
export function regionSupply(r: Region): { vessel: string; share: number }[] {
  const acc = new Map<string, number>();
  let tot = 0;
  for (const bid of r.beds) {
    const b = BED_BY_ID[bid];
    const w = b.volume > 0 ? b.volume : 1;
    const sum = b.supply.reduce((a, s) => a + s.share, 0) || 1;
    for (const s of b.supply) acc.set(s.v, (acc.get(s.v) ?? 0) + (w * s.share) / sum);
    tot += w;
  }
  return [...acc.entries()]
    .map(([vessel, v]) => ({ vessel, share: v / (tot || 1) }))
    .filter((x) => VESSEL_BY_ID[x.vessel])
    .sort((a, b) => b.share - a.share);
}

/**
 * Regions fed by a vessel, with the share of each region it feeds. Trunks (e.g. M1, ICA)
 * feed no tissue directly, so their territory is the sum of everything downstream of them.
 */
export function vesselTerritory(vesselId: string): { region: string; share: number }[] {
  const vessels = new Set<string>();
  const walk = (id: string) => {
    if (vessels.has(id) || !VESSEL_BY_ID[id]) return;
    vessels.add(id);
    for (const c of VESSEL_BY_ID[id].children) walk(c);
  };
  walk(vesselId);
  const acc = new Map<string, number>();
  for (const bid of Object.keys(BED_BY_ID)) {
    const b = BED_BY_ID[bid];
    if (acc.has(b.region) || !b.supply.some((s) => vessels.has(s.v))) continue;
    const share = regionSupply(REGION_BY_ID[b.region])
      .filter((x) => vessels.has(x.vessel))
      .reduce((a, x) => a + x.share, 0);
    acc.set(b.region, Math.min(1, share));
  }
  return [...acc.entries()]
    .filter(([, share]) => share > 0.02)
    .map(([region, share]) => ({ region, share }))
    .sort((a, b) => b.share - a.share);
}

// ─────────────────────────── time-aware panel helpers ───────────────────────────

/** Order in which symptom systems are listed (most life-relevant first). */
export const SYSTEM_ORDER: SymptomSystem[] = [
  'consciousness',
  'motor',
  'sensory',
  'language',
  'vision',
  'eye',
  'cranial',
  'balance',
  'cognition',
  'mood',
  'sleep',
  'autonomic',
  'thermo',
  'limb',
];

export const SYSTEM_LABEL: Record<SymptomSystem, L> = {
  consciousness: { zh: '意識', en: 'Consciousness' },
  motor: { zh: '運動', en: 'Motor' },
  sensory: { zh: '感覺', en: 'Sensation' },
  language: { zh: '語言', en: 'Language' },
  vision: { zh: '視覺', en: 'Vision' },
  eye: { zh: '眼球運動', en: 'Eye movements' },
  cranial: { zh: '腦神經（臉、吞嚥、聽覺）', en: 'Cranial nerves (face, swallowing, hearing)' },
  balance: { zh: '平衡與協調', en: 'Balance & coordination' },
  cognition: { zh: '認知與行為', en: 'Cognition & behaviour' },
  mood: { zh: '情緒與情感表達', en: 'Mood & emotional expression' },
  sleep: { zh: '睡眠與睡眠中的呼吸', en: 'Sleep & breathing in sleep' },
  autonomic: { zh: '自主神經', en: 'Autonomic' },
  thermo: { zh: '體溫調節與出汗', en: 'Temperature regulation & sweating' },
  limb: { zh: '肢體血流', en: 'Limb circulation' },
};

export const systemOf = (symptomId: string): SymptomSystem => SYMPTOM_BY_ID[symptomId]?.system ?? 'cognition';

/** Highest symptom severity (0–3) per system. */
export function severityBySystem(symptoms: SymptomItem[]): Partial<Record<SymptomSystem, number>> {
  const out: Partial<Record<SymptomSystem, number>> = {};
  for (const s of symptoms) {
    const sys = systemOf(s.id);
    out[sys] = Math.max(out[sys] ?? 0, s.sev);
  }
  return out;
}

export const symptomKey = (s: Pick<SymptomItem, 'id' | 'side'>) => `${s.id}|${s.side ?? ''}`;

const bedWeight = (bid: string) => BED_BY_ID[bid]?.volume || 1;

/** Volume-weighted tissue composition of a region at the simulated time (fractions summing to 1). */
export function regionComposition(sim: SimResult, regionId: string): Record<TissueState, number> {
  const acc: Record<TissueState, number> = { core: 0, penumbra: 0, oligemia: 0, salvaged: 0, normal: 0 };
  const r = REGION_BY_ID[regionId];
  if (!r) return { ...acc, normal: 1 };
  let tot = 0;
  for (const bid of r.beds) {
    const bs = sim.beds[bid];
    if (!bs) continue;
    const w = bedWeight(bid);
    for (const k of Object.keys(acc) as TissueState[]) acc[k] += (bs.frac[k] ?? 0) * w;
    tot += w;
  }
  if (tot <= 0) return { ...acc, normal: 1 };
  for (const k of Object.keys(acc) as TissueState[]) acc[k] /= tot;
  return acc;
}

export interface RegionEdema {
  /** fractional volume change (+0.12 = swollen by 12 %, −0.3 = shrunk) */
  swelling: number;
  /** 0–1 diffusion restriction (cytotoxic oedema) */
  cytotoxic: number;
  /** 0–1 vasogenic oedema */
  vasogenic: number;
  /** the oedema model reports anything noticeable for this region */
  any: boolean;
}

/** Oedema of a region at the simulated time, aggregated over its beds by volume. */
export function regionEdema(edema: EdemaState, regionId: string): RegionEdema {
  const r = REGION_BY_ID[regionId];
  const out: RegionEdema = { swelling: 0, cytotoxic: 0, vasogenic: 0, any: false };
  if (!r) return out;
  let tot = 0;
  for (const bid of r.beds) {
    const w = bedWeight(bid);
    out.swelling += (edema.swelling[bid] ?? 0) * w;
    out.cytotoxic += (edema.cytotoxic[bid] ?? 0) * w;
    out.vasogenic += (edema.vasogenic[bid] ?? 0) * w;
    tot += w;
  }
  if (tot > 0) {
    out.swelling /= tot;
    out.cytotoxic /= tot;
    out.vasogenic /= tot;
  }
  out.any = Math.abs(out.swelling) >= 0.005 || out.cytotoxic >= 0.02 || out.vasogenic >= 0.02;
  return out;
}

/** Midline shift (mm) at the simulated time, from the oedema model — the same number that moves the 3D brain. */
export function midlineShiftOf(sim: SimResult): number {
  return sim.edema.midlineShiftMm;
}

/** Net extra volume (mL) from swelling, summed over compartments (tissue loss is ignored). */
export function swellingVolumeOf(edema: EdemaState): number {
  const v = edema.extraVolume;
  return Math.max(0, v.supra.r) + Math.max(0, v.supra.l) + Math.max(0, v.infra);
}

/** Signed percentage, e.g. "+12%" / "−30%" / "+0.3%" (one decimal below 10 %). */
export function signedPct(x: number): string {
  const a = Math.abs(x) * 100;
  return `${x >= 0 ? '+' : '−'}${a < 9.95 ? +a.toFixed(1) : Math.round(a)}%`;
}

/** Index of the time stop at or just after `h`. */
export function stopIndexAtOrAfter(h: number): number {
  const i = TIME_STOPS.findIndex((s) => s.h >= h - 1e-6);
  return i < 0 ? TIME_STOPS.length - 1 : i;
}

/** Display time of a stop: minutes spelled out below 1 h ("15 分鐘"), otherwise the stop's own label ("1 天"). */
export function stopTime(i: number, lang: Lang): string {
  const s = TIME_STOPS[i];
  return s.h < 1 ? formatHours(s.h, lang) : tr(s.label, lang);
}

/** Drop a parenthetical from a title ("Vasogenic oedema (peaks day 2–5)" → "Vasogenic oedema"). */
export const shortTitle = (s: string) => s.replace(/\s*[（(][^）)]*[）)]\s*/g, '').trim() || s;

// ── heat-map fills ──
/** fill of a 0–3 symptom-severity cell (index = severity) */
export const SEV_FILL: (string | null)[] = [null, 'rgba(245, 213, 138, 0.62)', 'rgba(240, 161, 50, 0.9)', 'rgba(229, 72, 77, 0.98)'];
/** fill of a 0–3 swelling cell */
export const SWELL_FILL: (string | null)[] = [null, 'rgba(124, 92, 255, 0.4)', 'rgba(124, 92, 255, 0.72)', 'rgba(160, 132, 255, 1)'];
/** "normal" tissue in the time strips (dark neutral so abnormal states stand out) */
export const NORMAL_FILL = '#3a4252';

/** Colour of a region's dominant state in the time strips (matches the 3D colouring). */
export function stateFill(state: TissueState | BedEffectKind, tH: number): string {
  if (state === 'normal') return NORMAL_FILL;
  if (state === 'core') return tH >= 720 ? STATE_COLORS.coreChronic : STATE_COLORS.core;
  return STATE_COLORS[state];
}

/** 0–3 intensity of whole-brain swelling: midline shift when there is one, else the extra volume. */
export function swellingLevel(shiftMm: number, extraMl: number): number {
  if (shiftMm >= 0.5) return shiftMm >= 5 ? 3 : shiftMm >= 2 ? 2 : 1;
  if (extraMl >= 1) return extraMl >= 40 ? 3 : extraMl >= 10 ? 2 : 1;
  return 0;
}

/** 0–3 intensity of a region's swelling (fractional volume change, either sign). */
export const regionSwellLevel = (x: number) => {
  const a = Math.abs(x);
  return a >= 0.1 ? 3 : a >= 0.04 ? 2 : a >= 0.005 ? 1 : 0;
};

export interface PenumbraEstimate {
  /** mean relative perfusion of the still-undecided penumbra */
  rel: number;
  /** hours after onset by which the faster / slower part of it is likely decided (10th / 90th centile) */
  soonestH: number;
  latestH: number;
  /** fraction of the penumbra still alive now that would eventually die without reperfusion */
  lost: number;
}

/**
 * How long the penumbra of a region is likely to last without reperfusion, from the perfusion of
 * each of its supply units (educational: uses the illustrative per-bed time constants of
 * engine/tissueParams.ts).
 */
export function penumbraEstimate(sim: SimResult, regionId: string): PenumbraEstimate | null {
  const r = REGION_BY_ID[regionId];
  if (!r || sim.recanalized) return null;
  const beds = new Set(r.beds);
  const tH = sim.input.tH;
  const parts: { resolve: number; alive: number }[] = [];
  let aliveW = 0;
  let relW = 0;
  let lostW = 0;
  for (const u of getUnits(sim.input.variants, sim.input.collateral)) {
    if (!beds.has(u.bed)) continue;
    const rel = sim.hemo.unitRel[u.id] ?? 1;
    const tp = tissueParamsForUnit(u);
    // tissue below the core threshold that is still alive counts too: fed by collaterals, it can
    // last for hours (Y1-0)
    if (rel >= tp.penumbraRel) continue;
    // (decided: dead, or past the time it is at risk and surviving: W2-10)
    const resolve = penumbraDecidedH(rel, tp);
    if (resolve <= tH) continue;
    const p = finalInfarctProb(rel, tp);
    const dead = infarctFraction(rel, tH, null, 1, tp);
    const alive = (1 - dead) * u.frac * bedWeight(u.bed);
    if (alive <= 0) continue;
    parts.push({ resolve, alive });
    aliveW += alive;
    relW += rel * alive;
    lostW += ((p - dead) / (1 - dead)) * alive;
  }
  if (aliveW <= 0) return null;
  parts.sort((a, b) => a.resolve - b.resolve);
  const centile = (q: number) => {
    let acc = 0;
    for (const x of parts) {
      acc += x.alive;
      if (acc >= q * aliveW) return x.resolve;
    }
    return parts[parts.length - 1].resolve;
  };
  return { rel: relW / aliveW, soonestH: centile(0.1), latestH: centile(0.9), lost: lostW / aliveW };
}
