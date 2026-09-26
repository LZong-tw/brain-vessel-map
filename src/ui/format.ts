import { BED_BY_ID, REGION_BY_ID, VESSEL_BY_ID, tr } from '../anatomy';
import type { Lang, Region } from '../anatomy';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import type { SymptomItem } from '../engine/clinical';
import type { Strings } from '../i18n/ui';

export function symptomLabel(s: SymptomItem, lang: Lang, t: Strings): string {
  const def = SYMPTOM_BY_ID[s.id];
  if (!def) return s.id;
  const name = tr(def.name, lang);
  const side = s.side;
  if (!def.lateralised || !side) return name;
  const en = lang === 'en';
  switch (def.sideWord) {
    case 'eye':
      return en ? `${t.eyeSide[side]}: ${name.charAt(0).toLowerCase()}${name.slice(1)}` : `${t.eyeSide[side]}${name}`;
    case 'field':
      return en ? `${name} (${t.fieldSide[side].toLowerCase()})` : `${name}（${t.fieldSide[side]}）`;
    case 'gaze':
      if (s.id === 'gaze_deviation') {
        if (side === 'both') return name;
        return en ? `Eyes deviate to the ${side === 'r' ? 'right' : 'left'} (towards the lesion)` : `雙眼偏向${side === 'r' ? '右' : '左'}側（看向病灶）`;
      }
      if (side === 'both') return en ? 'Horizontal gaze palsy (both directions)' : '雙向水平凝視麻痺';
      return en ? `Cannot look to the ${side === 'r' ? 'right' : 'left'}` : `無法向${side === 'r' ? '右' : '左'}側看`;
    default:
      return en ? `${t.bodySide[side]}: ${name.charAt(0).toLowerCase()}${name.slice(1)}` : `${t.bodySide[side]}${name}`;
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
  if (lang === 'en') {
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)} billion`;
    return `${Math.round(n / 1e6)} million`;
  }
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)} 億`;
  return `${Math.round(n / 1e4).toLocaleString()} 萬`;
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

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

/** Regions supplied (directly) by a vessel, with the share of each region it feeds. */
export function vesselTerritory(vesselId: string): { region: string; share: number }[] {
  const out: { region: string; share: number }[] = [];
  const seen = new Set<string>();
  for (const bid of Object.keys(BED_BY_ID)) {
    const b = BED_BY_ID[bid];
    if (!b.supply.some((s) => s.v === vesselId)) continue;
    if (seen.has(b.region)) continue;
    seen.add(b.region);
    const share = regionSupply(REGION_BY_ID[b.region]).find((x) => x.vessel === vesselId)?.share ?? 0;
    if (share > 0.02) out.push({ region: b.region, share });
  }
  return out.sort((a, b) => b.share - a.share);
}
