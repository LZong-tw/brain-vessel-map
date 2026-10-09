import type { Lang } from '../anatomy/types';

interface IchExpansionStrings { title: string; intro: string; volume: string; time: string; antiplatelet: string; anticoagulant: string; unknown: string; yes: string; no: string; eligible: string; calculate: string; incomplete: string; result: string; limitation: string; source: string }
export const ICH_EXPANSION: Record<Lang, IchExpansionStrings> = {
  en: {
    title: 'ICH expansion probability calculator', intro: 'Separate educational calculator. Enter observed baseline data; it does not change the vessel simulation.',
    volume: 'Baseline intracerebral haemorrhage volume (mL; greater than 0, less than 150)', time: 'Symptom onset to baseline imaging (hours; 0.5–24)', antiplatelet: 'Antiplatelet use at symptom onset', anticoagulant: 'Anticoagulant use at symptom onset', unknown: 'Unknown', yes: 'Yes', no: 'No',
    eligible: 'Confirm source-population eligibility: adult aged ≥18 with spontaneous, nontraumatic small-vessel ICH; no structural cause and no acute surgical evacuation, haemostatic treatment or blood-pressure-lowering treatment.',
    calculate: 'Calculate probability', incomplete: 'Complete all inputs within the stated bounds, confirm eligibility, and specify both medication histories. Unknown history gives no estimate.',
    result: 'Estimated probability of >6 mL growth on protocol repeat imaging fewer than 6 days after symptom onset (most repeat imaging was within 48 hours)',
    limitation: 'This is a population model, not a predicted lesion or a fixed 24-hour outcome. It does not estimate treatment effects or predict an individual clinical course. Research eligibility restrictions are not treatment recommendations.', source: 'Source: Al-Shahi Salman et al., Lancet Neurology (2018)',
  },
  'zh-TW': {
    title: 'ICH 血腫擴大機率計算器', intro: '獨立的教學計算器。請輸入實際觀察的基線資料；不會改變血管模擬。', volume: '基線腦內出血體積（mL；大於 0、小於 150）', time: '症狀發作至基線影像的時間（小時；0.5–24）', antiplatelet: '症狀發作時使用抗血小板藥物', anticoagulant: '症狀發作時使用抗凝血藥物', unknown: '未知', yes: '是', no: '否',
    eligible: '確認符合來源族群：年齡 ≥18 歲、自發性非外傷性小血管性 ICH；無結構性病因，且未接受急性手術清除血腫、止血治療或降血壓治療。', calculate: '計算機率', incomplete: '請填完所有符合範圍的資料、確認適用族群，並填寫兩種用藥史。用藥史未知時不提供估計。', result: '症狀發作後未滿 6 天依研究流程複查影像時，出血體積增加 >6 mL 的估計機率（多數在 48 小時內複查）', limitation: '這是族群模型，不是預測病灶或固定 24 小時的結果。不估計治療效果，也不預測個人的臨床病程。研究的適用條件不是治療建議。', source: '來源：Al-Shahi Salman 等，Lancet Neurology（2018）',
  },
  'zh-CN': {
    title: 'ICH 血肿扩大概率计算器', intro: '独立的教学计算器。请输入实际观察的基线数据；不会改变血管模拟。', volume: '基线脑内出血体积（mL；大于 0、小于 150）', time: '症状发作至基线影像的时间（小时；0.5–24）', antiplatelet: '症状发作时使用抗血小板药物', anticoagulant: '症状发作时使用抗凝药物', unknown: '未知', yes: '是', no: '否',
    eligible: '确认符合来源人群：年龄 ≥18 岁、自发性非外伤性小血管性 ICH；无结构性病因，且未接受急性手术清除血肿、止血治疗或降压治疗。', calculate: '计算概率', incomplete: '请填完所有符合范围的数据、确认适用人群，并填写两种用药史。用药史未知时不提供估计。', result: '症状发作后不足 6 天依研究流程复查影像时，出血体积增加 >6 mL 的估计概率（多数在 48 小时内复查）', limitation: '这是人群模型，不是预测病灶或固定 24 小时的结果。不估计治疗效果，也不预测个人的临床病程。研究的适用条件不是治疗建议。', source: '来源：Al-Shahi Salman 等，Lancet Neurology（2018）',
  },
  de: {
    title: 'Rechner für die Wahrscheinlichkeit einer ICH-Ausdehnung', intro: 'Separater Lehrrechner. Geben Sie beobachtete Ausgangsdaten ein; die Gefäßsimulation wird nicht verändert.', volume: 'Initiales intrazerebrales Blutungsvolumen (mL; größer als 0, kleiner als 150)', time: 'Symptombeginn bis zur initialen Bildgebung (Stunden; 0,5–24)', antiplatelet: 'Thrombozytenaggregationshemmung bei Symptombeginn', anticoagulant: 'Antikoagulation bei Symptombeginn', unknown: 'Unbekannt', yes: 'Ja', no: 'Nein',
    eligible: 'Eignung für die Quellpopulation bestätigen: Alter ≥18 Jahre, spontane nichttraumatische ICH durch Kleingefäßerkrankung; keine strukturelle Ursache und keine akute operative Hämatomausräumung, hämostatische oder blutdrucksenkende Behandlung.', calculate: 'Wahrscheinlichkeit berechnen', incomplete: 'Füllen Sie alle Angaben innerhalb der Grenzen aus, bestätigen Sie die Eignung und geben Sie beide Medikamentenanamnesen an. Bei unbekannter Anamnese erfolgt keine Schätzung.', result: 'Geschätzte Wahrscheinlichkeit einer Zunahme um >6 mL bei der protokollgemäßen Kontrollbildgebung weniger als 6 Tage nach Symptombeginn (meist innerhalb von 48 Stunden)', limitation: 'Dies ist ein Populationsmodell, keine vorhergesagte Läsion oder ein festes 24-Stunden-Ergebnis. Es schätzt keine Behandlungseffekte und sagt keinen individuellen klinischen Verlauf voraus. Die Einschlusskriterien der Forschung sind keine Behandlungsempfehlungen.', source: 'Quelle: Al-Shahi Salman et al., Lancet Neurology (2018)',
  },
  ja: {
    title: 'ICH 血腫拡大確率計算', intro: '独立した教育用計算です。観察された初期データを入力してください。血管シミュレーションは変更されません。', volume: '初期脳内出血体積（mL；0 より大きく、150 未満）', time: '症状発現から初回画像検査まで（時間；0.5–24）', antiplatelet: '症状発現時の抗血小板薬使用', anticoagulant: '症状発現時の抗凝固薬使用', unknown: '不明', yes: 'あり', no: 'なし',
    eligible: '原著の対象集団への適合を確認：18 歳以上の成人で、小血管病による自発性・非外傷性 ICH。構造的原因がなく、急性期の外科的血腫除去、止血治療、降圧治療を受けていない。', calculate: '確率を計算', incomplete: '範囲内の全項目を入力し、適用条件と両方の服薬歴を確認してください。服薬歴が不明な場合は推定しません。', result: '症状発現後 6 日未満の研究計画に沿った再検査で、出血体積が >6 mL 増加する推定確率（再検査の多くは 48 時間以内）', limitation: '集団に基づくモデルであり、予測病変や固定された 24 時間後の結果ではありません。治療効果や個人の臨床経過は推定しません。研究の適用条件は治療の推奨ではありません。', source: '出典：Al-Shahi Salman ら、Lancet Neurology（2018）',
  },
};
