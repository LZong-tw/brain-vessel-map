/**
 * Colour palettes. Tissue-state colours are chosen to stay distinguishable for the common
 * forms of colour-vision deficiency (red vs. amber vs. blue vs. purple differ in lightness).
 */

import { REGION_BY_ID, VESSEL_BY_ID } from '../anatomy';
import type { Bed, Family } from '../anatomy';
import { TERRITORY_INFO } from '../anatomy/territories';
import type { BedTimeState } from '../engine/simulate';

export type RGB = [number, number, number];

export const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
export const toHex = (c: RGB) =>
  '#' + c.map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('');
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export const STATE_COLORS = {
  tissue: '#d9b8a8',
  deep: '#c9a28e',
  cerebellum: '#d4b09c',
  brainstem: '#cfae99',
  oligemia: '#8fb8e8',
  penumbra: '#f0a132',
  core: '#d7263d',
  coreChronic: '#6e3b3b',
  salvaged: '#43b581',
  secondary: '#b5179e',
  compressed: '#7c5cff',
  diaschisis: '#4cc9f0',
  degeneration: '#a3a34a',
} as const;

export const VESSEL_COLORS = {
  artery: '#e0473f',
  arteryDim: '#8a5a58',
  occluded: '#1c1c1c',
  noFlow: '#6f6f78',
  reversed: '#5aa7ff',
  collateral: '#ffd166',
  selected: '#ffffff',
  hovered: '#ffe8a3',
} as const;

const FAMILY_COLORS: Record<Family, string> = {
  ICA: '#e76f51',
  ECA: '#9c6644',
  ACA: TERRITORY_INFO.ACA.color,
  MCA: TERRITORY_INFO.MCAF.color,
  LSA: TERRITORY_INFO.LLS.color,
  AChA: TERRITORY_INFO.ACTP.color,
  PCA: TERRITORY_INFO.PCAO.color,
  THAL: TERRITORY_INFO.PCTP.color,
  VA: '#c77dff',
  BA: TERRITORY_INFO.BA.color,
  SCA: TERRITORY_INFO.SC.color,
  AICA: '#f28482',
  PICA: TERRITORY_INFO.IC.color,
  ASA: '#adb5bd',
  OPH: '#90be6d',
  SUB: '#b08968',
  COLL: '#ffd166',
};

export const familyColor = (f: Family) => FAMILY_COLORS[f];

const baseTissue = (bed: Bed): RGB => {
  const cat = REGION_BY_ID[bed.region].category;
  if (cat === 'deep') return hex(STATE_COLORS.deep);
  if (cat === 'cerebellum') return hex(STATE_COLORS.cerebellum);
  if (cat === 'brainstem') return hex(STATE_COLORS.brainstem);
  return hex(STATE_COLORS.tissue);
};

/** Colour of a bed in "ischaemic state" mode. */
export function stateColor(bed: Bed, st: BedTimeState | undefined, tH: number): RGB {
  const base = baseTissue(bed);
  if (!st) return base;
  if (st.effect === 'secondary') return hex(STATE_COLORS.secondary);
  const coreCol = tH >= 720 ? hex(STATE_COLORS.coreChronic) : hex(STATE_COLORS.core);
  let c = base;
  const f = st.frac;
  c = mix(c, hex(STATE_COLORS.oligemia), Math.min(1, f.oligemia * 0.75));
  c = mix(c, hex(STATE_COLORS.salvaged), Math.min(1, f.salvaged));
  c = mix(c, hex(STATE_COLORS.penumbra), Math.min(1, f.penumbra));
  c = mix(c, coreCol, Math.min(1, f.core));
  if (st.effect === 'compressed') c = mix(c, hex(STATE_COLORS.compressed), 0.75);
  else if (st.effect === 'degeneration') c = mix(c, hex(STATE_COLORS.degeneration), 0.7);
  else if (st.effect === 'diaschisis') c = mix(c, hex(STATE_COLORS.diaschisis), 0.6);
  return c;
}

/**
 * "Oedema / imaging" mode: what MRI would show at this time. DWI-bright only (cytotoxic, the
 * first hours) is cyan, T2/FLAIR-bright only (vasogenic, after DWI has faded) orange, both at
 * once yellow, shrunken chronic tissue near-black. Cyan vs. yellow/orange stays apart with
 * red–green colour-vision deficiency; orange vs. yellow vs. grey differ in lightness.
 */
export const EDEMA_COLORS = {
  normal: '#9aa0a8',
  normalDeep: '#8c929b',
  cytotoxic: '#62dcf7',
  both: '#f5d63d',
  vasogenic: '#f08a24',
  chronic: '#2c2f36',
} as const;

/** swelling (volume fraction) at which shrunk tissue is drawn fully dark */
const CHRONIC_FULL = -0.25;

export function edemaColor(bed: Bed, cytotoxic = 0, vasogenic = 0, swelling = 0): RGB {
  const cat = REGION_BY_ID[bed.region].category;
  const normal = hex(cat === 'deep' || cat === 'brainstem' ? EDEMA_COLORS.normalDeep : EDEMA_COLORS.normal);
  // a gentle curve so that moderate signal is already visible
  const d = Math.pow(Math.max(0, Math.min(1, cytotoxic)), 0.7);
  const f = Math.pow(Math.max(0, Math.min(1, vasogenic)), 0.7);
  const cyto = hex(EDEMA_COLORS.cytotoxic);
  const vaso = hex(EDEMA_COLORS.vasogenic);
  const both = hex(EDEMA_COLORS.both);
  // bilinear over (DWI, FLAIR): normal → DWI only / FLAIR only → both
  let c: RGB = [0, 1, 2].map(
    (k) => normal[k] * (1 - d) * (1 - f) + cyto[k] * d * (1 - f) + vaso[k] * (1 - d) * f + both[k] * d * f,
  ) as RGB;
  if (swelling < 0) c = mix(c, hex(EDEMA_COLORS.chronic), Math.min(1, swelling / CHRONIC_FULL) * (1 - 0.6 * Math.max(d, f)));
  return c;
}

/** Colour of a bed in "territory" mode (by its dominant supplying artery family). */
export function territoryColor(bed: Bed): RGB {
  if (bed.terr.length) {
    const cols = bed.terr.map((t) => hex(TERRITORY_INFO[t].color));
    const c = cols.length === 2 ? mix(cols[0], cols[1], 0.5) : cols[0];
    return bed.terr.length === 2 ? mix(c, [0.95, 0.95, 0.95], 0.35) : c;
  }
  const top = [...bed.supply].sort((a, b) => b.share - a.share)[0];
  const v = top ? VESSEL_BY_ID[top.v] : undefined;
  return v ? hex(familyColor(v.family)) : hex('#999999');
}

/** Stable pastel colour per region for "anatomy" mode. */
export function regionColor(regionId: string): RGB {
  const base = regionId.replace(/_(r|l)$/, '');
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  const hue = (h % 360) / 360;
  const s = 0.45;
  const l = 0.62;
  const f = (n: number) => {
    const k = (n + hue * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}
