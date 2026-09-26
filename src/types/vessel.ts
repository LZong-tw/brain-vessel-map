/**
 * 腦血管資料模型
 * Brain vessel data model
 */

export interface Vessel {
  id: string;
  nameZh: string;
  nameEn: string;
  /** 供應的腦區 ID 列表 */
  suppliesRegions: string[];
  /** 父血管 ID */
  parentId?: string;
  /** 子血管 ID 列表 */
  childIds: string[];
  /** 側枝循環連結（例如 AComm, PComm） */
  collateralIds: string[];
}

export interface BrainRegion {
  id: string;
  nameZh: string;
  nameEn: string;
  /** 一般人能理解的功能說明（繁體中文） */
  descriptionZh: string;
  /** 所屬大區（如大腦、小腦、腦幹） */
  category: 'cerebrum' | 'cerebellum' | 'brainstem' | 'other';
}

export interface OcclusionResult {
  /** 完全受影響的腦區 */
  affectedRegionsFull: string[];
  /** 部分受影響的腦區（有側枝循環救援） */
  affectedRegionsPartial: string[];
  /** 一般人能理解的後果說明（繁體中文） */
  consequencesZh: string;
  /** 具名症候群（如適用） */
  syndrome?: {
    nameZh: string;
    nameEn: string;
    descriptionZh: string;
  };
}

/** TODO(medical-review): All vessel paths are placeholder approximations */
export interface VesselGeometry {
  /** 血管路徑的三維點 */
  points: [number, number, number][];
  /** 血管半徑（單位：任意，保持一致） */
  radius: number;
}
