/**
 * Turns regional dysfunction into symptoms, an educational NIHSS estimate and named syndromes.
 */

import { REGIONS, REGION_BY_ID } from '../anatomy';
import type { NihssItem, Side } from '../anatomy';
import { REGION_DEFS } from '../anatomy/regions';
import { SYMPTOM_BY_ID } from '../anatomy/symptoms';
import { SYNDROMES, type SyndromeCtx, type SyndromeDef } from '../anatomy/syndromes';
import { indexById } from '../anatomy/indexById';
import { lesionSides, symptomCompensation } from './recovery';
import type { SymptomRecovery } from './recoveryTypes';

export interface SymptomItem {
  id: string;
  /** body side ('r'/'l'), both sides, or null for non-lateralised symptoms */
  side: Side | 'both' | null;
  sev: 1 | 2 | 3;
  sources: string[];
  delayed: boolean;
  /** how far spared pathways have taken this deficit over (from its dominant source), if it comes from a region */
  recovery?: SymptomRecovery;
}

export interface NihssResult {
  total: number;
  items: Partial<Record<string, number>>;
  category: 'none' | 'minor' | 'moderate' | 'moderate_severe' | 'severe';
  posteriorCaveat: boolean;
}

export interface SyndromeMatch {
  def: SyndromeDef;
  side: Side | null;
}

const DEF_BY_BASE = indexById(REGION_DEFS, (d) => d.id);
const opp = (s: Side): Side => (s === 'r' ? 'l' : 'r');
const DYS_THR = 0.25;
/** a region counts as affected at DYS_THR; fractions are sums of exponentials, so a region that
 * is exactly at the threshold (e.g. one quarter-share artery lost) must not flicker on and off
 * with floating-point rounding */
const reaches = (x: number | undefined, thr = DYS_THR) => (x ?? 0) >= thr - 1e-6;
const DELAY_H = 336;
/** a deficit compensated below this (continuous) severity is no longer noticeable */
const COMPENSATED_OUT = 0.35;

export function aggregateSymptoms(
  regionDys: Record<string, number>,
  regionInf: Record<string, number>,
  tH: number,
  extra: SymptomItem[] = [],
  /** regions damaged only by a lacune (functions marked spareInLacune are kept) */
  lacuneOnly: string[] = [],
): SymptomItem[] {
  const map = new Map<string, SymptomItem>();
  const add = (id: string, side: SymptomItem['side'], sev: number, src: string, delayed: boolean, recovery?: SymptomRecovery) => {
    const key = `${id}|${side ?? ''}`;
    const s = Math.max(1, Math.min(3, Math.round(sev))) as 1 | 2 | 3;
    const prev = map.get(key);
    if (prev) {
      // the outlook follows the source that sets the severity (on a tie, the less compensated one)
      if (recovery && (!prev.recovery || s > prev.sev || (s === prev.sev && recovery.compensated < prev.recovery.compensated)))
        prev.recovery = recovery;
      prev.sev = Math.max(prev.sev, s) as 1 | 2 | 3;
      if (!prev.sources.includes(src)) prev.sources.push(src);
    } else {
      map.set(key, recovery ? { id, side, sev: s, sources: [src], delayed, recovery } : { id, side, sev: s, sources: [src], delayed });
    }
  };
  // which sides have dead tissue serving each function: a one-sided loss compensates better
  const lesions = lesionSides(regionInf);

  for (const r of REGIONS) {
    const dys = regionDys[r.id] ?? 0;
    const inf = regionInf[r.id] ?? 0;
    if (!reaches(dys) && !reaches(inf)) continue;
    const def = DEF_BY_BASE[r.baseId];
    for (const d of def.deficits) {
      const sym = SYMPTOM_BY_ID[d.s];
      if (!sym) continue;
      if (d.only && r.side !== d.only) continue;
      if (d.spareInLacune && lacuneOnly.includes(r.id)) continue;
      const delayed = !!sym.delayed;
      const level = delayed ? inf : dys;
      if (!reaches(level)) continue;
      if (delayed && tH < DELAY_H) continue;
      if (d.bilateralOnly) {
        if (r.side === 'm') continue;
        const other = `${r.baseId}_${opp(r.side)}`;
        const lvl2 = delayed ? regionInf[other] ?? 0 : regionDys[other] ?? 0;
        if (!reaches(lvl2)) continue;
      }
      let side: SymptomItem['side'] = null;
      if (sym.lateralised) {
        if (r.side === 'm' || d.lat === 'none') side = r.side === 'm' ? 'both' : null;
        else side = d.lat === 'contra' ? opp(r.side) : r.side;
      }
      let sevEff = (d.sev ?? 2) * (0.35 + 0.65 * Math.min(1, level / 0.8));
      // weeks–months later, spared pathways take over part of what the dead tissue did
      const rec = symptomCompensation(d.s, r, level, inf, lesions, tH);
      if (rec.compensated > 0) {
        sevEff *= 1 - rec.compensated;
        if (sevEff < COMPENSATED_OUT) continue;
      }
      add(d.s, side, sevEff, r.id, delayed, rec);
    }
  }
  for (const e of extra) add(e.id, e.side, e.sev, e.sources[0] ?? '', e.delayed);

  // merges
  const get = (id: string, side: SymptomItem['side']) => map.get(`${id}|${side ?? ''}`);
  const del = (id: string, side: SymptomItem['side']) => map.delete(`${id}|${side ?? ''}`);
  for (const fs of ['r', 'l'] as Side[]) {
    const sup = get('quadrant_sup', fs);
    const inf = get('quadrant_inf', fs);
    if (sup && inf) {
      add('hemianopia', fs, Math.max(sup.sev, inf.sev, 2), sup.sources[0], false);
      get('hemianopia', fs)!.sources.push(...inf.sources);
      del('quadrant_sup', fs);
      del('quadrant_inf', fs);
    }
    if (get('hemianopia', fs)) {
      del('quadrant_sup', fs);
      del('quadrant_inf', fs);
      // a central scotoma is part of a complete hemianopia
      del('central_scotoma', fs);
    }
  }
  const occip = (h: Side) =>
    reaches(regionDys[`cuneus_${h}`]) || reaches(regionDys[`lingual_${h}`]);
  if (occip('r') && occip('l')) {
    for (const fs of ['r', 'l'] as Side[]) {
      del('hemianopia', fs);
      del('quadrant_sup', fs);
      del('quadrant_inf', fs);
      del('central_scotoma', fs);
    }
    add('cortical_blindness', null, 3, 'cuneus_r', false);
    add('anton', null, 1, 'cuneus_r', false);
  } else {
    for (const h of ['r', 'l'] as Side[]) {
      const fs = opp(h);
      // the pole (central vision) has dual PCA + MCA supply: when it is clearly less damaged
      // than the calcarine cortex, the centre of the field is (at least partly) spared
      const calcarine = Math.min(regionDys[`cuneus_${h}`] ?? 0, regionDys[`lingual_${h}`] ?? 0);
      if (occip(h) && get('hemianopia', fs) && (regionDys[`occipital_pole_${h}`] ?? 0) < 0.75 * calcarine) {
        add('macular_sparing', null, 1, `occipital_pole_${h}`, false);
      }
    }
  }
  if (map.has('aphasia_broca|') && map.has('aphasia_wernicke|')) {
    const s = Math.max(map.get('aphasia_broca|')!.sev, map.get('aphasia_wernicke|')!.sev, 2);
    add('aphasia_global', null, s + 1, map.get('aphasia_broca|')!.sources[0], false);
    del('aphasia_broca', null);
    del('aphasia_wernicke', null);
  }
  // bilateral ventral pons: anarthria (no speech at all) replaces, rather than adds to, the
  // milder unilateral dysarthria picture
  if (map.has('anarthria|')) del('dysarthria', null);
  // with horizontal gaze palsies to both sides no horizontal eye movement is left at all, so a
  // separate abducens palsy or INO can no longer be seen (a one-sided gaze palsy keeps them)
  if (get('gaze_palsy_horizontal', 'r') && get('gaze_palsy_horizontal', 'l')) {
    for (const fs of ['r', 'l'] as Side[]) {
      del('cn6_palsy', fs);
      del('ino', fs);
    }
  }
  if (map.has('coma|')) del('somnolence', null);
  const eye = ['cn3_palsy', 'cn4_palsy', 'cn6_palsy', 'ino'];
  if ([...map.values()].some((s) => eye.includes(s.id)) && !map.has('diplopia|')) {
    add('diplopia', null, 2, [...map.values()].find((s) => eye.includes(s.id))!.sources[0], false);
  }
  return [...map.values()];
}

export function estimateNihss(symptoms: SymptomItem[], affectedRegions: string[]): NihssResult {
  const items: Record<string, number> = {};
  const set = (k: string, v: number, cap: number) => (items[k] = Math.min(cap, Math.max(items[k] ?? 0, v)));
  const pts = (id: string, sev: number) => {
    const n = SYMPTOM_BY_ID[id]?.nihss;
    return n ? n.pts[sev - 1] : 0;
  };
  const armSide = { r: 0, l: 0 };
  const ataxia = { r: 0, l: 0 };
  for (const s of symptoms) {
    if (s.delayed) continue;
    const n = SYMPTOM_BY_ID[s.id]?.nihss;
    if (!n) continue;
    const p = pts(s.id, s.sev);
    const sides: Side[] = s.side === 'both' ? ['r', 'l'] : s.side === 'r' || s.side === 'l' ? [s.side] : [];
    switch (n.item as NihssItem) {
      case '5':
        for (const sd of sides) {
          set(`5${sd}`, p, 4);
          armSide[sd] = Math.max(armSide[sd], p);
        }
        break;
      case '6':
        for (const sd of sides) set(`6${sd}`, p, 4);
        break;
      case '7':
        // item 7 counts limbs: arm and leg on the same side score 2
        for (const sd of sides) ataxia[sd] = Math.max(ataxia[sd], Math.min(2, p));
        break;
      case '1a':
        set('1a', p, 3);
        break;
      case '2':
        set('2', p, 2);
        break;
      case '3':
        set('3', p, 3);
        break;
      case '4':
        set('4', p, 3);
        break;
      case '8':
        set('8', p, 2);
        break;
      case '9':
        set('9', p, 3);
        break;
      case '10':
        set('10', p, 2);
        break;
      case '11':
        set('11', p, 2);
        break;
      default:
        break;
    }
  }
  // limb ataxia is scored only if out of proportion to weakness
  const ax = (['r', 'l'] as Side[]).reduce((a, sd) => a + (armSide[sd] >= 3 ? 0 : ataxia[sd]), 0);
  if (ax) set('7', ax, 2);
  // hemianopia on both sides without explicit cortical blindness
  if (symptoms.filter((s) => s.id === 'hemianopia').length >= 2) set('3', 3, 3);
  // questions / commands depend on language and consciousness
  const has = (id: string) => symptoms.some((s) => s.id === id && !s.delayed);
  if (has('aphasia_global')) {
    set('1b', 2, 2);
    set('1c', 1, 2);
  } else if (has('aphasia_wernicke')) {
    set('1b', 2, 2);
    set('1c', 1, 2);
  } else if (has('aphasia_broca') || has('aphasia_tc_sensory')) {
    set('1b', 1, 2);
  }
  if ((items['1a'] ?? 0) >= 3) {
    Object.assign(items, { '1b': 2, '1c': 2, '5r': 4, '5l': 4, '6r': 4, '6l': 4, '7': 0, '8': 2, '9': 3, '10': 2, '11': 2 });
  }
  const total = Object.values(items).reduce((a, b) => a + b, 0);
  const category: NihssResult['category'] =
    total === 0 ? 'none' : total <= 4 ? 'minor' : total <= 15 ? 'moderate' : total <= 20 ? 'moderate_severe' : 'severe';
  const posterior = affectedRegions.some((r) => {
    const reg = REGION_BY_ID[r];
    return reg && (reg.category === 'brainstem' || reg.category === 'cerebellum' || /^(cuneus|lingual|occipital_pole)/.test(reg.baseId));
  });
  return { total, items, category, posteriorCaveat: posterior && total <= 6 };
}

export function detectSyndromes(ctx: SyndromeCtx): SyndromeMatch[] {
  const found: SyndromeMatch[] = [];
  for (const def of SYNDROMES) {
    if (def.lateral) {
      for (const s of ['r', 'l'] as Side[]) if (def.test(ctx, s)) found.push({ def, side: s });
    } else if (def.test(ctx, 'r')) {
      found.push({ def, side: null });
    }
  }
  return found.filter(
    (m) =>
      !found.some(
        (o) => o !== m && o.def.supersedes?.includes(m.def.id) && (o.side === m.side || o.side === null || m.side === null),
      ),
  );
}
