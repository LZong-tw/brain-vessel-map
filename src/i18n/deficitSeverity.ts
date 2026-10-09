import type { Lang } from '../anatomy/types';

interface DeficitSeverityStrings {
  model: string;
  item: string;
  note: string;
  unexaminable: string;
}
export const DEFICIT_SEVERITY: Record<Lang, DeficitSeverityStrings> = {
  en: { model: 'Model severity', item: 'Estimated NIHSS item points', note: 'The continuous 0–3 model scale is not a clinical NIHSS examination or fractional NIHSS score. The whole item points are a per-symptom model estimate; examination conditions and other signs can change the final item score. This does not predict mRS.', unexaminable: 'Cannot be examined now; no item score shown.' },
  'zh-TW': { model: '模型嚴重度', item: '估計 NIHSS 項目分數', note: '模型的連續 0–3 尺度不是臨床 NIHSS 檢查，也不是小數 NIHSS 分數。整數項目分數是依個別症狀的模型估計；檢查條件與其他徵象可改變最終項目分數。這不預測 mRS。', unexaminable: '目前無法檢查，不顯示項目分數。' },
  'zh-CN': { model: '模型严重程度', item: '估计 NIHSS 项目分数', note: '模型的连续 0–3 尺度不是临床 NIHSS 检查，也不是小数 NIHSS 分数。整数项目分数是依据单个症状的模型估计；检查条件与其他体征可改变最终项目分数。这不预测 mRS。', unexaminable: '目前无法检查，不显示项目分数。' },
  de: { model: 'Modellschweregrad', item: 'Geschätzte NIHSS-Itempunkte', note: 'Die kontinuierliche Modellskala von 0–3 ist keine klinische NIHSS-Untersuchung und kein NIHSS-Wert mit Dezimalstellen. Die ganzzahligen Itempunkte sind eine Modellschätzung für das einzelne Symptom; Untersuchungsbedingungen und andere Zeichen können den endgültigen Itemwert verändern. Daraus wird kein mRS vorhergesagt.', unexaminable: 'Derzeit nicht untersuchbar; kein Itemwert angezeigt.' },
  ja: { model: 'モデルの重症度', item: '推定 NIHSS 項目点数', note: '連続的な 0–3 のモデル尺度は臨床 NIHSS 評価ではなく、小数の NIHSS 点数でもありません。整数の項目点数は症状ごとのモデル推定であり、検査条件や他の徴候によって最終項目点数は変わります。mRS を予測するものではありません。', unexaminable: '現在は評価できないため、項目点数を表示しません。' },
};
