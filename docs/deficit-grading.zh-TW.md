[繁體中文](deficit-grading.zh-TW.md) · [简体中文](deficit-grading.zh-CN.md) · [English](deficit-grading.md) · [Deutsch](deficit-grading.de.md) · [日本語](deficit-grading.ja.md)

<!-- source-doc: docs/deficit-grading.md; sha256: abaf3ee34ec2fa622ca6010924de0c11853b99e25079eb0a80c20061fb01f173 -->

<a id="continuous-model-deficits-and-ordinal-examination-grades"></a>
# 連續模型缺損與序位檢查分級

模型把代償後的缺損量保留為 `SymptomItem.continuousSeverity`，範圍 0 至 3。這是教育模型的內部值，不是實測臨床量表或機率。`deadContinuousSeverity` 保留歸因於永久組織傷害的相應程度，供比較使用。既有組織、代償、可察覺性與症狀閾值不變。舊有 `sev` 值（列出的症狀為 1、2 或 3）仍供既有症狀規則使用。沒有新增遲滯或隨時間變動的分級狀態。

<a id="nihss-is-an-ordinal-bedside-examination"></a>
## NIHSS 是床邊檢查的序位量表

[NINDS NIH Stroke Scale](https://www.ninds.nih.gov/sites/default/files/2025-03/KnowStroke_NIHStrokeScale_March2025_508c.pdf)定義檢查類別。查閱的[美國中風協會 NIHSS 指引副本](https://www.stroke.org/-/media/Data-Import/downloadables/5/2/3/NIH-Stroke-Scale-UCM_490144.pdf?rev=c72312713d574cf494fc406be288c3f6)要求依病人檢查時實際表現評分。運動項目從肢體維持不下垂（0）、下垂（1）、有限的抗重力努力（2）、無抗重力努力（3），到完全沒有動作（4）。感覺項目區分正常（0）、部分受損（1）及嚴重或完全受損（2）。

來源運動標籤包括「No drift」（不下垂）、「Some effort against gravity」（有部分抗重力努力）、「No effort against gravity」（無抗重力努力）及「No movement」（無動作）。它們描述檢查表現，不是梗塞體積截止值。

這些有序類別不表示級別間距相等：一分差異不是固定的肌力或感覺量。因此算術內插是模型呈現選擇，不是 NIHSS 指引提供的臨床解釋。不能單憑梗塞圖、組織體積或動脈阻塞計算病人的 NIHSS；分數由床邊徵象與規定的檢查決定。

<a id="motor-presentation-uses-existing-anchors"></a>
## 運動呈現沿用既有錨點

手臂與腿部無力的呈現，透過 `src/anatomy/symptoms.ts` 既有 `nihss.pts` 錨點投影連續模型嚴重度：

| 模型程度 | 運動投影錨點 |
| --- | --- |
| 0 | 0 |
| 1 | 既有輕度項目分數，`pts[0]` |
| 2 | 既有中度項目分數，`pts[1]` |
| 3 | 既有重度項目分數，`pts[2]` |

相鄰錨點間採線性投影，顯示的運動級別四捨五入至最近整數。正值且列出的運動缺損至少保留既有輕度錨點 `pts[0]`。既有常見無力錨點 `[1, 3, 4]` 中，輕度與中度錨點間可出現中間級別 2。其他運動錨點沿用原值，不重新校正。最高級別不要求模型程度恰好達到 3，也不表示所有相關神經束組織都已受損。

此量化保留既有病灶校正，不因部分組織尚存就單獨重新分類已確立的典型症候群。它不驗證類別能預測床邊徵象。尤其最高運動級別是示意模型估計，不證明特定病人完全沒有自主動作。連續程度可以改變，估計的整數級別卻不變。

錨點與投影皆為啟發式。不引入實證的病灶至肌力閾值、新病灶邊界、治療效果量或病人校正。微小解剖改變可改變連續模型值，單憑此點不能認定病人得到類別上的效益。

<a id="other-examination-items-and-limits"></a>
## 其他檢查項目與限制

其他項目保留既有 NIHSS 序位規則。官方項目範圍包括感覺 0–2、顏面動作 0–3、語言 0–3、構音 0–2、視野 0–3、水平凝視 0–2、肢體協調 0–2，以及消退／注意力缺損 0–2。目錄中的既有 `pts` 陣列是類別的教育性關聯，不是經臨床校正的病灶閾值。意識程度及無法完成指令等檢查相依條件仍屬既有估計器的一部分。

NIHSS 估計仍為整數，因此類別與總分仍會階梯式改變，包括位於四捨五入邊界兩側的相鄰模型值。既有評分保護仍避免把微小雙側改變當成很大的整體運動分數效益。未合併的連續程度獨立於序位量化，支援恢復比較與缺損顯示；另行保留，不報成小數 NIHSS。兩種值都不提供改良 Rankin 量表換算、個人預後或實測治療效益。
