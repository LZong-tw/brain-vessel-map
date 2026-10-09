[繁體中文](mra-communicating-shapes.zh-TW.md) · [简体中文](mra-communicating-shapes.zh-CN.md) · [English](mra-communicating-shapes.md) · [Deutsch](mra-communicating-shapes.de.md) · [日本語](mra-communicating-shapes.ja.md)

<!-- source-doc: docs/mra-communicating-shapes.md; sha256: b5221bd573f65557c3c4049216a9b292f86f3cb7844fd35f33f1e30b9c38588c -->

<a id="mra-derived-communicating-vessel-shapes"></a>
# MRA 衍生的交通血管形狀

三條交通血管顯示曲線源於真實 MRA 分割中心線，不是血管機率圖譜：TopCoW MRA case 008，由 Musio et al. 發表於 *Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm*（2025 預印本，[arXiv:2510.13720](https://arxiv.org/abs/2510.13720)），[資料集於 2025-10-15 發布](https://zenodo.org/records/17358162)。來源與衍生資料採 **CC-BY-NC-4.0**，與軟體授權分開；見 `src/anatomy/generated/MRA_LICENSE.txt`。

<a id="scope-and-assumptions"></a>
## 範圍與假設

只準備右側 PCom（label 8）、左側 PCom（label 9）及 ACom（label 10）的顯示形狀。遠端分支仍為手繪。這不是完整病人血管樹，也不是經驗證的 MNI 空間配準。來源物理單位與絕對方向未經獨立確立，不採來源長度或半徑作生理參數。

每條選取路徑在具名來源邊界間連通、無環且唯一。PCom 邊界接觸側別正確的 ICA 與 PCA 標籤；ACom 沿右至左 ACA 路徑，明確排除來源第三 A2 側分支，包括兩條 label-10 短邊。

放置對每條曲線採一個**正向相似轉換**：旋轉（無反射）、平移及等向縮放，不扭曲個別點。近似的全域五標記點旋轉先設定軸向方向，來源 MCA 端點只是專案 M1 端點的近似對應。每條曲線再對齊端點方向，等向縮放至既有模型的附著點間距。這是未驗證的顯示假設，不是物理解剖測量或來源至模板的配準。

附著錨點優先使用實際母血管顯示路徑，否則使用母血管生理路徑。目前 ICA 末端、PCA P1 與 ACA A1 錨點沒有獨立顯示覆寫，與既有交通路徑端點相符。手繪丘腦結節動脈子分支的顯示接線，跟隨新 PCom 折線的半弧長點；只改每條接線首點，其餘點保留。這些接線明確分類為手繪，不是實測 MRA 幾何。模擬路徑、拓樸、長度、半徑與血流參數不變。各曲線等向縮放比例不同，不可解釋為實測血管尺寸。

<a id="reproduction-and-verification"></a>
## 重現與驗證

在專案根目錄，安裝 Python 與 NumPy 後執行：

```sh
python tools/build_mra_communicating.py
```

產生器只在忽略的快取缺少資料時，用 HTTP range 取得已固定的 ZIP 項目；檢查每個解碼項目的大小、CRC32 與固定 SHA256。**整個壓縮檔的 MD5 尚未驗證。**原始圖與節點說明、來源雜湊、來源點 ID、轉換、附著錨點、變異與幾何檢查保留於 `mraCommunicatingAudit.json`。產生器驗證路徑唯一、旋轉為正向正交、端點位置精確，以及線段等向縮放。產生的座標值取至小數點後十位，不更改生理模型幾何。

對外措辭：**MRA 衍生交通血管形狀；放置未驗證；遠端分支為手繪。**
