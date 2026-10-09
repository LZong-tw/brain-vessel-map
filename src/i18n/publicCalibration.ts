import type { Lang } from '../anatomy/types';

interface CalibrationStrings {
  title: string; intro: string; run: string; warning: string; timing: string;
  both: string; one: string; neither: string; factor: string; target: string;
  growth: string; residual: string; baseline: string; reference: string;
  source: string; trial: string; running: string; error: string; rejected: string;
}
export const PUBLIC_CALIBRATION: Record<Lang, CalibrationStrings> = {
  en: {
    running: 'Fitting the model in a background worker…', error: 'The diagnostic could not be calculated.', rejected: 'Calibration rejected: the highest growth target is not reached and baseline cores disagree with the trial reference. Do not use these factors as clinical collateral grades.',
    title: 'Experimental public-data calibration', intro: 'Fit the named-collateral conductance factor in a controlled right M1 occlusion model to three published median growth values. Existing tissue time constants stay fixed; this does not change the current case.', run: 'Run the reproducible fit',
    warning: 'Unvalidated aggregate fit, not a clinical prediction. Perfusion profiles are not the good/moderate/poor collateral grades. Posterior circulation, cerebellum, medulla, lacunes, the 48-hour penumbra limit and arterial symmetry have not been recalibrated.',
    timing: 'Assumed representative clock: baseline imaging 9:55 after onset; follow-up 34:44 (24 hours after randomization at 10:44). These timings come from the whole medical arm, not the fitted subgroups.',
    both: 'HIR and CBV both favorable', one: 'One perfusion marker favorable', neither: 'Neither perfusion marker favorable', factor: 'Fitted conductance factor (model units)', target: 'Published median growth', growth: 'Model growth', residual: 'Model minus published growth', baseline: 'Model baseline core', reference: 'Whole medical-arm baseline core reference: 10.1 mL. This is a separate comparison, not a subgroup fitting target.', source: 'Growth targets: MacLellan et al. (2022)', trial: 'Clock and baseline reference: DEFUSE 3 (2018)',
  },
  'zh-TW': {
    running: '正在背景執行模型擬合…', error: '無法計算此診斷。', rejected: '校正未通過：最高擴大目標無法達到，且基線核心與試驗參考值不符。請勿把這些係數當作臨床側枝分級。',
    title: '實驗性公開資料校正', intro: '以受控的右側 M1 阻塞模型，將具名側枝傳導係數擬合到三個已發表的梗塞擴大中位數。保留現有組織時間常數；不改變目前病例。', run: '執行可重現的擬合',
    warning: '未經驗證的彙總資料擬合，不是臨床預測。灌流型態不等同於良好／中等／差的側枝分級。後循環、小腦、延髓、腔隙性梗塞、48 小時半影區上限與動脈對稱性尚未重新校正。',
    timing: '假設的代表性時程：發病後 9:55 取得基線影像，34:44 複查（10:44 隨機分派後 24 小時）。時間來自整個藥物治療組，不是擬合的子群。',
    both: 'HIR 與 CBV 均有利', one: '一項灌流指標有利', neither: '兩項灌流指標均不利', factor: '擬合傳導係數（模型單位）', target: '已發表的擴大中位數', growth: '模型擴大量', residual: '模型與已發表擴大量之差', baseline: '模型基線核心', reference: '整個藥物治療組的基線核心參考值：10.1 mL。此為獨立比較，不是子群擬合目標。', source: '擴大目標：MacLellan 等（2022）', trial: '時程與基線參考：DEFUSE 3（2018）',
  },
  'zh-CN': {
    running: '正在后台执行模型拟合…', error: '无法计算此诊断。', rejected: '校准未通过：最高增长目标无法达到，且基线核心与试验参考值不符。请勿把这些系数当作临床侧支分级。',
    title: '实验性公开数据校准', intro: '以受控的右侧 M1 闭塞模型，将具名侧支传导系数拟合到三个已发表的梗死增长中位数。保留现有组织时间常数；不改变当前病例。', run: '执行可复现的拟合',
    warning: '未经验证的汇总数据拟合，不是临床预测。灌注类型不等同于良好／中等／差的侧支分级。后循环、小脑、延髓、腔隙性梗死、48 小时半暗带上限与动脉对称性尚未重新校准。',
    timing: '假设的代表性时程：发病后 9:55 获取基线影像，34:44 复查（10:44 随机分组后 24 小时）。时间来自整个药物治疗组，不是拟合的亚组。',
    both: 'HIR 与 CBV 均有利', one: '一项灌注指标有利', neither: '两项灌注指标均不利', factor: '拟合传导系数（模型单位）', target: '已发表的增长中位数', growth: '模型增长量', residual: '模型与已发表增长量之差', baseline: '模型基线核心', reference: '整个药物治疗组的基线核心参考值：10.1 mL。此为独立比较，不是亚组拟合目标。', source: '增长目标：MacLellan 等（2022）', trial: '时程与基线参考：DEFUSE 3（2018）',
  },
  de: {
    running: 'Das Modell wird im Hintergrund angepasst…', error: 'Die Diagnose konnte nicht berechnet werden.', rejected: 'Kalibrierung verworfen: Das höchste Wachstumsziel wird nicht erreicht, und die Ausgangskerne weichen von der Studienreferenz ab. Diese Faktoren dürfen nicht als klinische Kollateralgrade verwendet werden.',
    title: 'Experimentelle Kalibrierung mit öffentlichen Daten', intro: 'Der Leitfähigkeitsfaktor der benannten Kollateralen eines kontrollierten Modells mit rechtem M1-Verschluss wird an drei publizierte mediane Infarktzunahmen angepasst. Die Gewebezeitkonstanten bleiben fest; der aktuelle Fall wird nicht verändert.', run: 'Reproduzierbare Anpassung starten',
    warning: 'Unvalidierte Anpassung an aggregierte Daten, keine klinische Vorhersage. Die Perfusionsprofile entsprechen nicht den Kollateralgraden gut/mittel/schlecht. Hinterer Kreislauf, Kleinhirn, Medulla oblongata, lakunäre Infarkte, die 48-Stunden-Penumbragrenze und arterielle Symmetrie wurden nicht neu kalibriert.',
    timing: 'Angenommener repräsentativer Zeitablauf: Ausgangsbildgebung 9:55 nach Beginn, Kontrolle 34:44 (24 Stunden nach Randomisierung um 10:44). Diese Zeiten stammen aus dem gesamten medikamentösen Arm, nicht aus den angepassten Untergruppen.',
    both: 'HIR und CBV günstig', one: 'Ein Perfusionsmarker günstig', neither: 'Kein Perfusionsmarker günstig', factor: 'Angepasster Leitfähigkeitsfaktor (Modelleinheiten)', target: 'Publizierte mediane Zunahme', growth: 'Modellierte Zunahme', residual: 'Modellierte minus publizierte Zunahme', baseline: 'Modellierter Ausgangskern', reference: 'Referenzkern des gesamten medikamentösen Arms: 10,1 mL. Separater Vergleich, kein Anpassungsziel der Untergruppen.', source: 'Wachstumsziele: MacLellan et al. (2022)', trial: 'Zeitablauf und Ausgangsreferenz: DEFUSE 3 (2018)',
  },
  ja: {
    running: 'バックグラウンドでモデルの適合計算中…', error: '診断計算を実行できませんでした。', rejected: '較正は不成立：最大の増大目標に到達せず、初期コアも試験の参考値と一致しません。この係数を臨床的な側副血行の区分として使用しないでください。',
    title: '公開データによる実験的な較正', intro: '右 M1 閉塞を設定したモデル内で名称を付けた側副血管のコンダクタンス係数を、報告された 3 つの梗塞増大中央値に適合させます。既存の組織時定数は固定し、現在の症例は変更しません。', run: '再現可能な適合計算を実行',
    warning: '未検証の集計データへの適合であり、臨床予測ではありません。灌流プロファイルは側副血行の良好／中等度／不良の区分と同じではありません。後方循環、小脳、延髄、ラクナ梗塞、48 時間のペナンブラ上限、動脈の対称性は再較正されていません。',
    timing: '代表的と仮定した時程：発症後 9:55 に初回画像、34:44 に再検査（10:44 の無作為割付から 24 時間後）。時刻は内科治療群全体の値で、適合対象の部分群の値ではありません。',
    both: 'HIR と CBV の両方が良好', one: '一方の灌流指標が良好', neither: '両方の灌流指標が不良', factor: '適合したコンダクタンス係数（モデル単位）', target: '報告された増大中央値', growth: 'モデルの増大量', residual: 'モデルと報告値の増大量の差', baseline: 'モデルの初期コア', reference: '内科治療群全体の初期コア参考値：10.1 mL。これは独立した比較であり、部分群の適合目標ではありません。', source: '増大目標：MacLellan ら（2022）', trial: '時程と初期参考値：DEFUSE 3（2018）',
  },
};
