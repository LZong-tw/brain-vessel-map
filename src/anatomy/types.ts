/**
 * Core anatomical data types.
 *
 * Coordinates are MNI152 (ICBM 2009c) millimetres, RAS convention:
 *   x+ = patient's right, y+ = anterior, z+ = superior.
 * Bilateral structures are authored once for the RIGHT side and mirrored.
 */

export type Vec3 = [number, number, number];

/** Localised string. zh = Traditional Chinese (zh-TW), en = English. */
export interface L {
  zh: string;
  en: string;
}

export type Lang = 'zh-TW' | 'en';

export type Side = 'r' | 'l';
/** 'm' = midline / unpaired structure */
export type SideOrMid = Side | 'm';

export type VesselKind =
  /** great vessels & named trunks */
  | 'trunk'
  /** cortical / cerebellar branches */
  | 'branch'
  /** deep penetrating arteries (end arteries) */
  | 'perforator'
  /** Circle of Willis communicating arteries */
  | 'communicating'
  /** leptomeningeal / extracranial anastomoses (strength scales with collateral grade) */
  | 'collateral';

export type VesselGroup =
  | 'extracranial'
  | 'anterior'
  | 'posterior'
  | 'willis'
  | 'collateral';

/** Arterial family used for territory colouring. */
export type Family =
  | 'ICA'
  | 'ECA'
  | 'ACA'
  | 'MCA'
  | 'LSA'
  | 'AChA'
  | 'PCA'
  | 'THAL'
  | 'VA'
  | 'BA'
  | 'SCA'
  | 'AICA'
  | 'PICA'
  | 'ASA'
  | 'OPH'
  | 'SUB'
  | 'COLL';

/** How the asset pipeline treats the centreline of a vessel. */
export type PathMode =
  /** keep authored course, push out of parenchyma if it cuts through tissue (cisternal vessels) */
  | 'cistern'
  /** drape over the cortical / cerebellar surface */
  | 'surface'
  /** penetrates parenchyma: keep as authored */
  | 'deep'
  /** outside the brain (neck, scalp): keep as authored */
  | 'free';

export interface VesselDef {
  /** base id; bilateral ids get `_r` / `_l` appended */
  id: string;
  bilateral: boolean;
  name: L;
  /** short abbreviation shown on labels, e.g. "M1" */
  abbr?: string;
  desc: L;
  kind: VesselKind;
  group: VesselGroup;
  family: Family;
  /**
   * Graph nodes. `{s}` is replaced with the side, `{o}` with the opposite side.
   * `<vesselId>@mid` refers to the midpoint node of another vessel (branch arising mid-segment).
   */
  from: string;
  to: string;
  /** parent vessel id (with `{s}`) for the hierarchy / UI tree */
  parent?: string;
  /** lumen radius, mm */
  r: number;
  /** number of parallel vessels represented (perforator bundles) */
  n?: number;
  /** hemodynamic length override in mm (default: centreline length) */
  len?: number;
  /** waypoints (right side for bilateral vessels) */
  path: Vec3[];
  pathMode: PathMode;
  /** for 'surface' vessels: fraction of the path (0–1) after which draping starts */
  surfaceFrom?: number;
  /** only used for collaterals: relative strength before grade scaling */
  collStrength?: number;
  /** not part of the flow network (drawing only), e.g. aortic arch */
  visualOnly?: boolean;
  /** cannot be selected as an occlusion target */
  notOccludable?: boolean;
  /** an occluding clot here also covers the distal bifurcation (e.g. carotid-T, basilar tip) */
  occludesDistalJunction?: boolean;
}

/** Fully expanded vessel (after bilateral expansion). */
export interface Vessel extends Omit<VesselDef, 'id' | 'bilateral' | 'from' | 'to' | 'parent' | 'path'> {
  id: string;
  baseId: string;
  side: SideOrMid;
  from: string;
  to: string;
  parent?: string;
  path: Vec3[];
  /**
   * where the 3D view draws the vessel, if not along `path`: surface vessels lifted onto their
   * sulci-closed surface so they don't dip under the cortex (generated/vesselRenderPaths.json).
   * Drawing only — the flow model uses the length of `path`.
   */
  renderPath?: Vec3[];
  children: string[];
}

export type RegionCategory =
  | 'cortex'
  | 'deep'
  | 'brainstem'
  | 'cerebellum'
  | 'eye'
  | 'ear'
  | 'spinal'
  | 'extracranial';

export interface SupplyDef {
  /** vessel id (with `{s}` / `{o}` placeholders) */
  v: string;
  share: number;
  /** attach to the vessel's midpoint node instead of its distal end */
  at?: 'mid' | 'to';
  /** border-zone link (distal field, lower perfusion pressure) */
  distal?: boolean;
}

export type Laterality =
  /** body side opposite the lesion */
  | 'contra'
  /** same side as the lesion */
  | 'ipsi'
  /** bilateral / non-lateralised */
  | 'none';

export interface DeficitRef {
  /** symptom id from the symptom catalogue */
  s: string;
  lat: Laterality;
  /** only for lesions on this hemisphere side (e.g. language → 'l') */
  only?: Side;
  /** 1 = mild, 2 = moderate, 3 = severe; default 2 */
  sev?: 1 | 2 | 3;
  /** requires bilateral involvement of this region to appear */
  bilateralOnly?: boolean;
  /** a lacune in this structure usually spares this function (e.g. sensation in a capsular pure motor lacune) */
  spareInLacune?: boolean;
  /**
   * needs at least this much of the region affected (default: the symptom threshold, 0.25): for
   * a function that only a large lesion reaches, e.g. a tract running deep to part of the region
   */
  minLevel?: number;
  /** the compensation of this source settles within ~1–2 weeks (overrides the symptom's own pace) */
  fast?: boolean;
}

export interface StructureInfo {
  name: L;
  role: L;
}

export interface RegionDef {
  id: string;
  bilateral: boolean;
  name: L;
  /** optional side-specific name (e.g. Broca vs its right homologue) */
  nameBySide?: Partial<Record<Side, L>>;
  func: L;
  category: RegionCategory;
  /** baseline blood flow density, mL/100 g/min */
  cbf: number;
  /**
   * Arterial supply. Omitted for cortical regions, whose supply is derived per
   * vascular territory from the arterial territory atlas (see territories.ts).
   */
  supply?: SupplyDef[];
  /** volume (mL) for structures not measured by the asset pipeline */
  fixedVolume?: number;
  /** explicit baseline flow (mL/min) for non-brain beds */
  flow?: number;
  deficits: DeficitRef[];
  /**
   * what the region does when its dysfunction lies mainly in its ACA–MCA border-zone beds (the
   * part of the motor strip next to the vertex): these replace `deficits` then (see
   * clinical.aggregateSymptoms)
   */
  borderDeficits?: DeficitRef[];
  structures?: StructureInfo[];
  /** supratentorial / infratentorial compartment (mass effect) */
  compartment: 'supra' | 'infra' | 'none';
}

export interface Region extends Omit<RegionDef, 'id' | 'bilateral' | 'supply' | 'nameBySide' | 'fixedVolume'> {
  id: string;
  baseId: string;
  side: SideOrMid;
  /** tissue volume in mL */
  volume: number;
  /** the localised name already contains the side (e.g. "左額下迴") */
  sideInName: boolean;
  /** ids of the perfusion beds that make up this region */
  beds: string[];
}

/** Liu et al. 2023 arterial territory codes (level 1, side-less). */
export type TerritoryCode =
  | 'ACA'
  | 'MLS'
  | 'LLS'
  | 'MCAF'
  | 'MCAP'
  | 'MCAT'
  | 'MCAO'
  | 'MCAI'
  | 'PCAT'
  | 'PCAO'
  | 'PCTP'
  | 'ACTP'
  | 'BA'
  | 'SC'
  | 'IC'
  | 'NONE';

/**
 * A perfusion bed: the unit that receives blood in the flow model.
 * Cortical regions are split into one bed per arterial territory (+ border zones);
 * other regions have a single bed.
 */
export interface Bed {
  id: string;
  region: string;
  /** territory code(s); two codes = border zone between them */
  terr: TerritoryCode[];
  volume: number;
  supply: SupplyDef[];
  /** baseline flow, mL/min */
  baseFlow: number;
}

export type SymptomSystem =
  | 'consciousness'
  | 'motor'
  | 'sensory'
  | 'vision'
  | 'eye'
  | 'cranial'
  | 'balance'
  | 'language'
  | 'cognition'
  /** emotional expression and mood that a lesion site produces (pathological crying/laughing …) */
  | 'mood'
  /** sleep and breathing during sleep */
  | 'sleep'
  | 'autonomic'
  /** temperature regulation and sweating (the hypothalamus itself is not modelled) */
  | 'thermo'
  | 'limb';

export type NihssItem =
  | '1a'
  | '1b'
  | '1c'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11';

export interface SymptomDef {
  id: string;
  name: L;
  /** what the person experiences, plain language */
  desc: L;
  system: SymptomSystem;
  /** whether text should mention a body side */
  lateralised: boolean;
  /** body-part wording for the side prefix: 'body' → 左側/右側, 'eye' → 左眼/右眼, 'field' → 左側視野 */
  sideWord?: 'body' | 'eye' | 'field' | 'gaze';
  nihss?: { item: NihssItem; pts: [number, number, number] };
  /** appears only in the chronic phase */
  delayed?: boolean;
  /**
   * appears only where tissue has died (from the start, not only in the chronic phase): for a
   * deficit described after infarcts but not during passing ischaemia
   */
  fromInfarct?: boolean;
  /** appears only this many hours after onset (a latent period), not from the start */
  onsetH?: number;
  /**
   * worst between these hours after onset [from, to): one severity step more than the lesion
   * alone gives, before compensation (e.g. central sleep apnoea, which peaks around day 7)
   */
  peakH?: [number, number];
}
