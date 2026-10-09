import type { Lang } from '../anatomy/types';

interface CollateralPressureGuardStrings { title: string; body: string }
export const COLLATERAL_PRESSURE_GUARD: Record<Lang, CollateralPressureGuardStrings> = {
  en: { title: 'Collateral pressure safeguard active', body: 'The model has limited collateral pressure gain with a numerical safeguard. This limit is a computational assumption, not a measurement of upstream vascular autoregulation. Interpret the resulting collateral flow with this limitation in mind.' },
  'zh-TW': { title: '側枝壓力數值保護已啟用', body: '模型以數值保護機制限制了側枝壓力增益。此上限是計算假設，不是上游血管自動調節的測量值。解讀所呈現的側枝血流時，須考慮這項限制。' },
  'zh-CN': { title: '侧支压力数值保护已启用', body: '模型以数值保护机制限制了侧支压力增益。此上限是计算假设，不是上游血管自动调节的测量值。解读所呈现的侧支血流时，须考虑这项限制。' },
  de: { title: 'Numerische Sicherung des Kollateraldrucks aktiv', body: 'Das Modell hat die Verstärkung des Kollateraldrucks durch eine numerische Sicherung begrenzt. Diese Grenze ist eine Rechenannahme und keine Messung der Autoregulation vorgeschalteter Gefäße. Berücksichtigen Sie diese Einschränkung bei der Interpretation des dargestellten Kollateralflusses.' },
  ja: { title: '側副血行の圧力に数値的制限が適用されています', body: 'モデルでは数値的な安全策によって側副血行の圧力増幅を制限しています。この上限は計算上の仮定であり、上流血管の自動調節を測定した値ではありません。表示された側副血流は、この制限を考慮して解釈してください。' },
};
