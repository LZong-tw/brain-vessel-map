import { describe, expect, it } from 'vitest';
import { VESSEL_BY_ID, vesselName } from '../anatomy';
import type { Lang } from '../anatomy/types';
import type { Occlusion } from '../engine/hemodynamics';
import { DEFAULT_TREATMENT, angiographicGrade } from '../engine/treatment';
import { caseSummary, conditionsSummary, eventsSummary, hasCase, severityTag, treatmentLine, vesselSummary, type CaseState } from './caseSummary';

/**
 * The one-line summaries of the case (card headers in the case tab and the line above the
 * timeline) must say what is actually set: which arteries, how and when, the conditions and the
 * treatment.
 */

const name = (id: string, lang: Lang = 'zh-TW') => vesselName(VESSEL_BY_ID[id], lang);
const BA = name('basilar_mid');
const PICA = name('pica_r');

const base: CaseState = {
  occlusions: [],
  variants: [],
  map: 93,
  collateral: 'good',
  reperfusionH: null,
  treatment: DEFAULT_TREATMENT,
  decompression: false,
};
const stacked: Occlusion[] = [
  { vessel: 'basilar_mid', severity: 1 },
  { vessel: 'pica_r', severity: 1 },
];
const ev = (occlusions: Occlusion[], lang: Lang = 'zh-TW', map = 93) => eventsSummary({ occlusions, map }, lang);

describe('conditionsSummary', () => {
  it('names the collateral grade, the mean arterial pressure and the variants', () => {
    expect(conditionsSummary(base, 'zh-TW')).toBe('側枝良好 · 平均動脈壓 93 · 無解剖變異');
    expect(conditionsSummary({ collateral: 'poor', map: 124, variants: ['acomm_absent'] }, 'zh-TW')).toBe('側枝差 · 平均動脈壓 124 · 1 項變異');
    expect(conditionsSummary({ collateral: 'moderate', map: 60, variants: ['a', 'b'] }, 'zh-TW')).toBe('側枝中等 · 平均動脈壓 60 · 2 項變異');
  });

  it('in English', () => {
    expect(conditionsSummary(base, 'en')).toBe('Good collaterals · MAP 93 · no variants');
    expect(conditionsSummary({ collateral: 'poor', map: 124, variants: ['x'] }, 'en')).toBe('Poor collaterals · MAP 124 · 1 variant');
    expect(conditionsSummary({ collateral: 'moderate', map: 80, variants: ['x', 'y'] }, 'en')).toBe('Moderate collaterals · MAP 80 · 2 variants');
  });
});

describe('eventsSummary', () => {
  it('says nothing is set without occlusions', () => {
    expect(ev([])).toBe('尚未設定');
    expect(ev([], 'en')).toBe('Not set');
  });

  it('treats a low pressure without occlusion as global hypoperfusion (a case of its own)', () => {
    expect(ev([], 'zh-TW', 60)).toBe('無阻塞（全腦低灌流）');
    expect(ev([], 'en', 69)).toBe('No occlusion (global hypoperfusion)');
    expect(ev([], 'zh-TW', 70)).toBe('尚未設定');
  });

  it('joins the vessels of a stacked case', () => {
    expect(ev(stacked)).toBe(`${BA} + ${PICA}`);
    expect(ev(stacked, 'en')).toBe(`${name('basilar_mid', 'en')} + ${name('pica_r', 'en')}`);
  });

  it('lists a vessel once however many phases it has, and marks it staged', () => {
    const phases: Occlusion[] = [
      { vessel: 'basilar_mid', severity: 0.9, toH: 72 },
      { vessel: 'basilar_mid', severity: 1, fromH: 72 },
      { vessel: 'pica_r', severity: 1 },
    ];
    expect(ev(phases)).toBe(`${BA}（分段） + ${PICA}`);
    expect(ev(phases, 'en')).toBe(`${name('basilar_mid', 'en')} (staged) + ${name('pica_r', 'en')}`);
  });

  it('shows a partial stenosis in percent, rounded', () => {
    expect(ev([{ vessel: 'basilar_mid', severity: 0.7 }])).toBe(`${BA}（狹窄 70%）`);
    expect(ev([{ vessel: 'basilar_mid', severity: 0.856 }])).toBe(`${BA}（狹窄 86%）`);
    expect(ev([{ vessel: 'basilar_mid', severity: 0.5 }], 'en')).toBe(`${name('basilar_mid', 'en')} (50% stenosis)`);
  });

  it('marks a lacunar (single-branch) occlusion', () => {
    const o: Occlusion[] = [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }];
    expect(ev(o)).toBe(`${name('lenticulostriate_l')}（單一分支）`);
    expect(ev(o, 'en')).toBe(`${name('lenticulostriate_l', 'en')} (one branch)`);
  });

  it('gives the start of a later occlusion and the reopening of a transient one (TIA)', () => {
    expect(ev([{ vessel: 'basilar_mid', severity: 1, fromH: 72 }])).toBe(`${BA}（3 天起）`);
    expect(ev([{ vessel: 'basilar_mid', severity: 1, toH: 1 / 12 }])).toBe(`${BA}（5 分鐘後自行再通）`);
    expect(ev([{ vessel: 'basilar_mid', severity: 1, toH: 1 / 12 }], 'en')).toBe(`${name('basilar_mid', 'en')} (reopens after 5 min)`);
    // a stenosis that starts later and lasts a day
    expect(ev([{ vessel: 'basilar_mid', severity: 0.9, fromH: 72, toH: 96 }])).toBe(`${BA}（狹窄 90%，3 天起，1 天後自行再通）`);
  });

  it('shortens more than three vessels to the first two and the total', () => {
    const four: Occlusion[] = ['basilar_mid', 'pica_r', 'mca_m1_l', 'ica_cervical_r'].map((vessel) => ({ vessel, severity: 1 }));
    expect(ev(four)).toBe(`${BA} + ${PICA} 等 4 條`);
    expect(ev(four, 'en')).toBe(`${name('basilar_mid', 'en')} + ${name('pica_r', 'en')} + 2 more`);
    expect(ev(four.slice(0, 3))).toBe(`${BA} + ${PICA} + ${name('mca_m1_l')}`);
  });
});

describe('severityTag and vesselSummary', () => {
  it('tags the degree of one vessel, or its number of phases', () => {
    expect(severityTag(stacked, 'pica_r', 'zh-TW')).toBe('完全阻塞');
    expect(severityTag([{ vessel: 'pica_r', severity: 0.7 }], 'pica_r', 'zh-TW')).toBe('狹窄 70%');
    expect(severityTag([{ vessel: 'lenticulostriate_l', severity: 1, branch: true }], 'lenticulostriate_l', 'en')).toBe('one branch');
    // a lacune at another site of its bundle says where (C6-F5)
    const cr = [{ vessel: 'lenticulostriate_l', severity: 1, branch: true, lacuneSite: 'ataxic' }];
    expect(severityTag(cr, 'lenticulostriate_l', 'en')).toBe('one branch · Corona radiata: ataxic hemiparesis');
    expect(severityTag(cr, 'lenticulostriate_l', 'zh-TW')).toBe('單一分支 · 放射冠：運動失調性偏癱');
    const phases: Occlusion[] = [
      { vessel: 'basilar_mid', severity: 1, toH: 1 / 12 },
      { vessel: 'basilar_mid', severity: 0.9, fromH: 1 / 12, toH: 72 },
      { vessel: 'basilar_mid', severity: 1, fromH: 72 },
    ];
    expect(severityTag(phases, 'basilar_mid', 'zh-TW')).toBe('分段：3 個階段');
    expect(severityTag(phases, 'basilar_mid', 'en')).toBe('staged: 3 phases');
    expect(severityTag(phases, 'pica_r', 'zh-TW')).toBe('');
  });

  it('a complete occlusion from onset needs no qualifier', () => {
    expect(vesselSummary(stacked, 'basilar_mid', 'zh-TW')).toBe(BA);
  });
});

describe('treatmentLine', () => {
  // (a treatment reopens what is occluded then: a complete left M1 from onset)
  const m1: CaseState = { ...base, occlusions: [{ vessel: 'mca_m1_l', severity: 1 }] };
  it('untreated', () => {
    expect(treatmentLine(m1, 'zh-TW')).toBe('未治療');
    expect(treatmentLine(m1, 'en')).toBe('Untreated');
  });

  it('a treatment time with the default (complete, lasting) result', () => {
    expect(treatmentLine({ ...m1, reperfusionH: 24 }, 'zh-TW')).toBe('24 小時再通');
    expect(treatmentLine({ ...m1, reperfusionH: 4.5 }, 'en')).toBe('Reopened at 4.5 h');
    // relative to a later occlusion: the absolute clock
    expect(treatmentLine({ ...m1, reperfusionH: 78 }, 'zh-TW')).toBe('3 天 6 小時再通');
  });

  it('with treatment details, after the time or (compact) in brackets', () => {
    const s = { ...m1, reperfusionH: 24, treatment: { ...DEFAULT_TREATMENT, grade: '2b67' as const } };
    expect(treatmentLine(s, 'zh-TW')).toBe('24 小時再通 · 取栓 · eTICI 2b67');
    expect(treatmentLine(s, 'zh-TW', true)).toBe('24 小時再通（取栓 · eTICI 2b67）');
    expect(treatmentLine({ ...s, treatment: { ...s.treatment, method: 'ivt' } }, 'en', true)).toBe('reopened at 24 h (IV thrombolysis · eTICI 2b67)');
  });

  // V1-12: an attempt that reopens nothing is not a reopening (the event says "Recanalisation failed")
  it('a failed attempt (eTICI 0) is an attempt at that time, not a reopening', () => {
    const s = { ...m1, reperfusionH: 3, treatment: { ...DEFAULT_TREATMENT, grade: '0' as const } };
    expect(treatmentLine(s, 'zh-TW')).toBe('3 小時嘗試、未再通 · 取栓 · eTICI 0');
    expect(treatmentLine(s, 'zh-TW', true)).toBe('3 小時嘗試、未再通（取栓 · eTICI 0）');
    expect(treatmentLine(s, 'en')).toBe('Attempted at 3 h, not reopened · Thrombectomy · eTICI 0');
    expect(treatmentLine(s, 'en', true)).toBe('attempted at 3 h, not reopened (Thrombectomy · eTICI 0)');
    expect(treatmentLine({ ...s, treatment: { ...s.treatment, method: 'ivt' } }, 'en', true)).toBe('attempted at 3 h, not reopened (IV thrombolysis · eTICI 0)');
  });

  it('adds decompression, with or without recanalisation', () => {
    expect(treatmentLine({ ...m1, decompression: true }, 'zh-TW')).toBe('未再通 · 必要時減壓手術');
    expect(treatmentLine({ ...m1, reperfusionH: 6, decompression: true }, 'zh-TW')).toBe('6 小時再通 · 必要時減壓手術');
    expect(treatmentLine({ ...m1, decompression: true }, 'en')).toBe('No recanalisation · decompression if needed');
  });

  // U2-8: a treatment that finds nothing it can reopen is not a reopening, and has no eTICI grade
  it('IV thrombolysis for a lacunar occlusion: given at that time, its effect not simulated', () => {
    const s: CaseState = { ...base, occlusions: [{ vessel: 'lenticulostriate_l', severity: 1, branch: true }], reperfusionH: 2, treatment: { ...DEFAULT_TREATMENT, method: 'ivt' } };
    expect(treatmentLine(s, 'en', true)).toBe('IV thrombolysis at 2 h (not simulated for a lacunar occlusion)');
    expect(treatmentLine(s, 'zh-TW', true)).toBe('2 小時靜脈血栓溶解（模型不模擬它對腔隙性阻塞的效果）');
    expect(treatmentLine(s, 'en')).toBe('IV thrombolysis at 2 h (not simulated for a lacunar occlusion)');
    for (const lang of ['en', 'zh-TW'] as const) {
      expect(treatmentLine(s, lang, true)).not.toMatch(/eTICI|reopened|再通/);
      expect(caseSummary(s, lang).join(' · ')).not.toMatch(/eTICI|reopened|再通/);
    }
  });

  it('a treatment time when nothing complete is occluded (a stenosis, or before the occlusion begins): nothing to reopen', () => {
    const sten: CaseState = { ...base, occlusions: [{ vessel: 'basilar_mid', severity: 0.7 }], reperfusionH: 2, treatment: { ...DEFAULT_TREATMENT, method: 'ivt' } };
    expect(treatmentLine(sten, 'en', true)).toBe('treatment at 2 h: nothing to reopen');
    expect(treatmentLine(sten, 'zh-TW', true)).toBe('2 小時治療：沒有可打通的阻塞');
    const before: CaseState = { ...base, occlusions: [{ vessel: 'mca_m1_l', severity: 1, fromH: 24 }], reperfusionH: 4.5, treatment: { ...DEFAULT_TREATMENT, grade: '2b67' } };
    expect(treatmentLine(before, 'en')).toBe('Treatment at 4.5 h: nothing to reopen');
  });

  // U2-9: eTICI grades the whole downstream territory, so a branch a fragment blocks lowers it
  it('a distal embolus downstream: the eTICI grade the angiogram shows, not 3', () => {
    const s: CaseState = { ...m1, reperfusionH: 2, treatment: { ...DEFAULT_TREATMENT, distalEmbolus: 'mca_m2_inf_l' } };
    const shown = angiographicGrade(s.treatment, ['mca_m1_l']);
    expect(shown).not.toBe('3');
    const inf = (lang: Lang) => vesselName(VESSEL_BY_ID['mca_m2_inf_l'], lang);
    expect(treatmentLine(s, 'en', true)).toBe(`reopened at 2 h (Thrombectomy · eTICI ${shown} (3 apart from the blocked branch) · distal embolus: ${inf('en')})`);
    expect(treatmentLine(s, 'zh-TW', true)).toBe(`2 小時再通（取栓 · eTICI ${shown}（栓塞分支以外為 3） · 遠端栓塞：${inf('zh-TW')}）`);
    // a new territory leaves the grade of the target territory as chosen
    const aca = { ...s, treatment: { ...s.treatment, distalEmbolus: 'aca_a2_l' } };
    expect(treatmentLine(aca, 'en', true)).toContain('Thrombectomy · eTICI 3 · ');
  });
});

describe('caseSummary', () => {
  it('an empty case says so, whatever the conditions', () => {
    expect(hasCase(base)).toBe(false);
    expect(caseSummary(base, 'zh-TW')).toEqual(['尚未設定阻塞 — 從範本開始']);
    expect(caseSummary({ ...base, collateral: 'poor', variants: ['x'] }, 'en')).toEqual(['No occlusion set — start from a template']);
  });

  it('a stacked, treated case', () => {
    const s: CaseState = { ...base, occlusions: stacked, map: 124, reperfusionH: 24, treatment: { ...DEFAULT_TREATMENT, grade: '2b67' } };
    expect(caseSummary(s, 'zh-TW').join(' · ')).toBe(`${BA} + ${PICA} 阻塞 · 側枝良好 · 平均動脈壓 124 · 24 小時再通（取栓 · eTICI 2b67）`);
    expect(caseSummary(s, 'en').join(' · ')).toBe(
      `Occluded: ${name('basilar_mid', 'en')} + ${name('pica_r', 'en')} · good collaterals · MAP 124 · reopened at 24 h (Thrombectomy · eTICI 2b67)`,
    );
  });

  it('lists variants only when there are some, and says when nothing is treated', () => {
    const s: CaseState = { ...base, occlusions: [{ vessel: 'pica_r', severity: 1 }], collateral: 'poor', variants: ['a', 'b'], decompression: true };
    expect(caseSummary(s, 'zh-TW')).toEqual([`${PICA} 阻塞`, '側枝差', '平均動脈壓 93', '2 項變異', '未再通 · 必要時減壓手術']);
    expect(caseSummary({ ...s, variants: [], decompression: false }, 'zh-TW')).toEqual([`${PICA} 阻塞`, '側枝差', '平均動脈壓 93', '未治療']);
  });

  it('global hypoperfusion without occlusion is a case', () => {
    const s = { ...base, map: 55 };
    expect(hasCase(s)).toBe(true);
    expect(caseSummary(s, 'zh-TW')).toEqual(['無阻塞（全腦低灌流）', '側枝良好', '平均動脈壓 55', '未治療']);
  });
});
