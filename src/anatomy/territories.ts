/**
 * Mapping from (functional region × arterial territory) to the supplying vessel.
 *
 * Territory codes come from the Liu et al. (2023) "Digital 3D Brain MRI Arterial
 * Territories Atlas" (level 1). Every cortical voxel carries a DKT gyral label and a
 * territory label; the asset pipeline groups voxels into perfusion beds keyed by both.
 * This table decides which branch of the vessel tree feeds each bed.
 */

import type { L, SupplyDef, TerritoryCode } from './types';

export const TERRITORY_INFO: Record<TerritoryCode, { name: L; color: string }> = {
  ACA: { name: { zh: '前大腦動脈', en: 'ACA' }, color: '#5b8def' },
  MLS: { name: { zh: '內側豆紋動脈', en: 'Medial lenticulostriate' }, color: '#8fb3ff' },
  LLS: { name: { zh: '外側豆紋動脈', en: 'Lateral lenticulostriate' }, color: '#f2a541' },
  MCAF: { name: { zh: '中大腦動脈（額葉部）', en: 'MCA frontal' }, color: '#3fb68b' },
  MCAP: { name: { zh: '中大腦動脈（頂葉部）', en: 'MCA parietal' }, color: '#2f9e75' },
  MCAT: { name: { zh: '中大腦動脈（顳葉部）', en: 'MCA temporal' }, color: '#57c79c' },
  MCAO: { name: { zh: '中大腦動脈（枕葉部）', en: 'MCA occipital' }, color: '#79d4b0' },
  MCAI: { name: { zh: '中大腦動脈（島葉部）', en: 'MCA insular' }, color: '#26876a' },
  PCAT: { name: { zh: '後大腦動脈（顳葉部）', en: 'PCA temporal' }, color: '#b07ad8' },
  PCAO: { name: { zh: '後大腦動脈（枕葉部）', en: 'PCA occipital' }, color: '#9c5fcf' },
  PCTP: { name: { zh: '後脈絡叢與視丘穿通動脈', en: 'Posterior choroidal & thalamoperforators' }, color: '#e377c2' },
  ACTP: { name: { zh: '前脈絡叢動脈', en: 'Anterior choroidal' }, color: '#f5d547' },
  BA: { name: { zh: '基底動脈穿通支', en: 'Basilar perforators' }, color: '#c49a6c' },
  SC: { name: { zh: '小腦上動脈', en: 'Superior cerebellar' }, color: '#4fb3bf' },
  IC: { name: { zh: '小腦下動脈（PICA／AICA）', en: 'Inferior cerebellar (PICA/AICA)' }, color: '#e8736c' },
  NONE: { name: { zh: '未分類', en: 'Unassigned' }, color: '#9aa0a6' },
};

type Rule = Partial<Record<string, string>> & { default: string };

/** territory → region base id → vessel base id (side added later) */
const MAP: Partial<Record<TerritoryCode, Rule>> = {
  ACA: {
    frontopolar_orbital_medial: 'aca_frontopolar',
    orbitofrontal_lateral: 'aca_frontopolar',
    medial_frontal: 'aca_callosomarginal',
    prefrontal_dorsolateral: 'aca_callosomarginal',
    broca: 'aca_callosomarginal',
    cingulate: 'aca_callosomarginal',
    paracentral: 'aca_paracentral',
    precentral_face_arm: 'aca_paracentral',
    postcentral_face_arm: 'aca_paracentral',
    precuneus: 'aca_pericallosal',
    superior_parietal: 'aca_pericallosal',
    supramarginal: 'aca_pericallosal',
    angular: 'aca_pericallosal',
    corpus_callosum: 'aca_pericallosal',
    corona_radiata: 'aca_callosomarginal',
    default: 'aca_callosomarginal',
  },
  MLS: { default: 'heubner' },
  LLS: { default: 'lenticulostriate' },
  MCAF: {
    orbitofrontal_lateral: 'mca_orbitofrontal',
    frontopolar_orbital_medial: 'mca_orbitofrontal',
    prefrontal_dorsolateral: 'mca_prefrontal',
    broca: 'mca_prefrontal',
    medial_frontal: 'mca_prefrontal',
    precentral_face_arm: 'mca_precentral',
    paracentral: 'mca_precentral',
    postcentral_face_arm: 'mca_central',
    insula: 'mca_m2_sup',
    temporal_pole: 'mca_temporal_anterior',
    corona_radiata: 'mca_precentral',
    default: 'mca_prefrontal',
  },
  MCAP: {
    postcentral_face_arm: 'mca_central',
    precentral_face_arm: 'mca_central',
    paracentral: 'mca_central',
    supramarginal: 'mca_ant_parietal',
    superior_parietal: 'mca_post_parietal',
    precuneus: 'mca_post_parietal',
    angular: 'mca_angular',
    lateral_occipital: 'mca_angular',
    superior_temporal_posterior: 'mca_temporal_posterior',
    corona_radiata: 'mca_central',
    default: 'mca_ant_parietal',
  },
  MCAT: {
    temporal_pole: 'mca_temporal_anterior',
    parahippocampal: 'mca_temporal_anterior',
    superior_temporal_posterior: 'mca_temporal_posterior',
    supramarginal: 'mca_temporal_posterior',
    angular: 'mca_temporal_posterior',
    default: 'mca_temporal_middle',
  },
  MCAO: {
    angular: 'mca_angular',
    superior_parietal: 'mca_angular',
    default: 'mca_temporooccipital',
  },
  MCAI: { default: 'mca_m2_sup' },
  PCAT: { default: 'pca_temporal' },
  PCAO: {
    precuneus: 'pca_parietooccipital',
    superior_parietal: 'pca_parietooccipital',
    angular: 'pca_parietooccipital',
    cuneus: 'pca_parietooccipital',
    lateral_occipital: 'pca_parietooccipital',
    cingulate: 'pca_splenial',
    splenium: 'pca_splenial',
    default: 'pca_calcarine',
  },
  PCTP: { default: 'posterior_choroidal' },
  ACTP: { default: 'acha' },
  BA: { default: 'mesencephalic_perf' },
  SC: { default: 'sca_lateral' },
  IC: { default: 'pica_lateral' },
};

/** Supply for one cortical bed (single territory). */
export function territorySupply(regionBase: string, terr: TerritoryCode): SupplyDef[] {
  if (terr === 'MCAI') {
    // insular cortex is fed by short branches of both M2 trunks
    return [
      { v: 'mca_m2_sup_{s}', share: 0.5, at: 'mid' },
      { v: 'mca_m2_inf_{s}', share: 0.5, at: 'mid' },
    ];
  }
  const rule = MAP[terr] ?? MAP.MCAF!;
  const vessel = rule[regionBase] ?? rule.default;
  const at = vessel === 'mca_m2_sup' ? 'mid' : undefined;
  return [{ v: `${vessel}_{s}`, share: 1, ...(at ? { at } : {}) }];
}

/**
 * Supply for a bed. Border-zone beds (two territories) are fed half by each,
 * through "distal" links that model the low perfusion pressure at the ends of
 * both arterial trees — the reason watershed zones fail first when blood pressure drops.
 */
export function bedSupply(regionBase: string, terr: TerritoryCode[]): SupplyDef[] {
  if (terr.length === 1) return territorySupply(regionBase, terr[0]);
  const out: SupplyDef[] = [];
  for (const t of terr) {
    for (const s of territorySupply(regionBase, t)) {
      out.push({ ...s, share: s.share / terr.length, distal: true });
    }
  }
  return out;
}
