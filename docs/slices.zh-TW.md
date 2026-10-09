[繁體中文](slices.zh-TW.md) · [简体中文](slices.zh-CN.md) · [English](slices.md) · [Deutsch](slices.de.md) · [日本語](slices.ja.md)

<!-- source-doc: docs/slices.md; sha256: 37bb92d75e33cf151acbdf7addf21d125076a6336b19d260ba45380f9bc2e387 -->

<a id="mri-slices-and-territory-references"></a>
# MRI 切片與供血區參考

切片背景是真實 1 mm ICBM 152 nonlinear asymmetric 2009c T1 模板，由 [TemplateFlow](https://github.com/templateflow/tpl-MNI152NLin2009cAsym)發布。[模板中繼資料](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/template_description.json)指定 193 × 229 × 193 網格、1 mm 間距與 (-96, -132, -78) mm 原點。匯出器對照該 RAS 網格檢查下載的 NIfTI 仿射轉換。顯示強度以來源最大值線性量化為八位元。

供血區輪廓來自 [Liu et al. 動脈圖譜](https://github.com/Chin-Fu-Liu/Arterial_Atlas)，由 1,298 位病人的病灶分布衍生；見[原 Scientific Data 論文](https://doi.org/10.1038/s41597-022-01923-0)。出版者資料庫列出 30 個動脈分區及腦室標籤，只顯示 30 個動脈標籤，非動脈標籤映射為零。匯出器固定來源修訂，每個下載輸入的 SHA-256 都記錄於產生的資訊清單。最近鄰採樣保留動脈標籤 ID。

<a id="alignment-and-interpretation"></a>
## 對齊與解釋

Liu 來源把空間描述為 MNI，未特別指定 MNI2009c。此檢視沿用專案既有近似圖譜至模板映射：`atlas voxel = (89 - RAS x, RAS y + 126, RAS z + 72)`。不宣稱新增、經驗證的臨床配準。匯出器報告左右標籤質心、圖譜與模板 aseg 分割重疊、模板涵蓋率，供審查此近似。

輪廓是**族群圖譜的參考供血區**，不是預測的病人病灶邊界。獨立熱圖把模型目前每個灌流單元的梗塞比例，重複至所有歸屬該單元的體素；不定位單元內受損比例的位置，也不套用病灶閾值。體素灌流單元用既有資產建置器重建，對照所有已提交的單元 ID 與體積檢查，並依既有網格單元列表重排。這是專案的功能單元分配，包括解剖啟發式，不是新實測的體素病灶遮罩。不重寫既有網格、產生的灌流單元或醫學參數。

<a id="rebuilding-and-binary-layout"></a>
## 重建與二進位格式

安裝 `tools/requirements.txt`，再執行 `python tools/build_slices.py`。來源 NIfTI 快取於 `tools/.cache`，下載經驗證後以原子方式發布；損壞快取項目會重新下載。若灌流單元 ID、體積或模板仿射轉換不同於既有資產，重建失敗。

`public/data/slices.bin.gz` 是 gzip 串流，在相同完整解析度網格上串接三個陣列：T1 uint8、供血區 uint8、接著 little-endian 灌流單元 uint16。陣列 x 軸最快：`x + nx * (y + ny * z)`。資訊清單位移指解壓縮後位元組。單元零表示未分配；單元 n 索引 `beds[n - 1]`。資訊清單記錄壓縮檔 SHA-256、長度、來源與驗證。瀏覽器載入需要 gzip 解壓縮支援，明確回報不支援的瀏覽器。

<a id="attribution-and-license"></a>
## 署名與授權

衍生 `slices.json` 與 `slices.bin.gz` 以 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)發布，包括 Liu 圖譜署名：Digital 3D Brain MRI Arterial Territories Atlas，© 2021 The Johns Hopkins University；Liu CF et al., Scientific Data 2023;10:74。灌流單元映射也衍生自 DKT31（Klein & Tourville 2012, CC BY 4.0）與 MIAL67（Najdenovska et al. 2018, CC BY 4.0）。見 `public/data/LICENSE.txt`。

模板 [MNI 授權](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/LICENSE)要求以下聲明（原文保留）：

Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre,
Montreal Neurological Institute, McGill University. Permission to use, copy,
modify, and distribute this software and its documentation for any purpose and
without fee is hereby granted, provided that the above copyright notice appear
in all copies. The authors and McGill University make no representations about
the suitability of this software for any purpose. It is provided “as is” without
express or implied warranty. The authors are not responsible for any data loss,
equipment damage, property loss, or injury to subjects or patients resulting
from the use or misuse of this software package.
