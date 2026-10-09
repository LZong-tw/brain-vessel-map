[繁體中文](mra-distal.zh-TW.md) · [简体中文](mra-distal.zh-CN.md) · [English](mra-distal.md) · [Deutsch](mra-distal.de.md) · [日本語](mra-distal.ja.md)

<!-- source-doc: docs/mra-distal.md; sha256: 0d90349629731f2d16e164fcaecdf044aec8c7e3592fe4507a479a3fac629ad8 -->

<a id="individual-mra-distal-vessel-reference"></a>
# 個別 MRA 遠端血管參考

這份參考包含 **Bravissima BG0001** 真實、個別 MRA 衍生動脈幾何，不是族群機率圖譜。來源把 BraVa 重建轉成個別 NIfTI 體積，以 SPM8 正規化至 MNI152。[專案與 Attribution 授權](https://www.nitrc.org/projects/bravissima/)；[來源 README](https://www.nitrc.org/docman/view.php/1266/78741/Readme43)。

包括中央 pre-Willis/CoW 群及全部六個左右 ACA、MCA、PCA 血管群。來源未命名角回動脈、距狀溝動脈等個別遠端分支，不捏造這種對應，這些參考點也沒有模擬分支灌流或阻塞狀態。生理路徑、拓樸、半徑與模型參數不變。

選用的 3D 參考模式以來源幾何取代手繪血管顯示。由於缺少具名分支對應，隱藏模擬血管點選目標、血栓標記及血流粒子。栓子生命週期在不可見狀態下繼續，因此切換解剖檢視不會暫停既有病例。腦部顏色仍描述目前的動脈模擬，不是參考受試者的預測病灶。模式預設關閉，按需載入；載入失敗保留模擬顯示並提供重試。不改病例參數或變異來符合來源受試者。

血管群選取與相機導航有鍵盤控制、可見焦點指示及五種語言標籤。隱藏半球的血管群、完全位於裁切平面外的血管群，不列入焦點目標。控制區折疊時仍顯示來源放置限制。

<a id="geometry-and-limitations"></a>
## 幾何與限制

保留來源標籤 1–7 的所有有限值體素，包括孤立體素與不連通部分；排除零、NaN 與無限值。座標由從零起算的體素中心經來源 NIfTI 仿射轉換取得。1 mm 來源體積採 LAS 體素軸，其仿射轉換至世界座標，正 x 指向右側。不採額外放置轉換。與專案 MNI152NLin2009cAsym 腦模型的配準**未驗證**。

提供的線段僅連接直接 26 鄰域中現存的帶標籤體素。這是明示的**繪圖相鄰性假設**，不是原始 SWC 母節點圖；相鄰血管可產生額外邊或環。不跨接缺口，不平滑、細化、重採樣或移動任何點。因此保留實測來源體素幾何，但不宣稱精確連通的解剖樹或已驗證的小分支身分。

`public/data/mra-distal.json` 包含點、各點血管群標籤、相鄰點索引對、血管群數量與連通部分統計。孤立點即使不屬於任何線段，仍保留於點陣列。附帶來源 JSON 記錄原始仿射轉換、解碼規則、來源 README、授權、雜湊與來源特定假設。

<a id="reproduction"></a>
## 重現

安裝 Python、NumPy 與 nibabel 後，於專案根目錄執行：

```sh
python tools/build_bravissima.py
```

產生器檢查完整 12 MB 來源壓縮檔的固定 SHA256、外層 ZIP CRC、選定巢狀 ZIP 項目的 CRC 及其固定 SHA256。採個別 `srcgBG0001.nii` 血管群體積，不是平均血管群圖譜。輸出具決定性，不含非有限 JSON 數值。來源快取保留於忽略的 `tools/.cache/bravissima/` 目錄。

<a id="attribution"></a>
## 署名

Herron TJ, Dronkers N, Turken AU. *BraVa cerebral artery database converted to NIFTI MRI format*（2017 海報；未經同儕審查）。[DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1)。

原始 BraVa：Wright et al. *Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography*. NeuroImage82 (2013), 170–181. [DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089)；[BraVa](http://cng.gmu.edu/brava)。

來源指定 **Attribution**，未指明 Creative Commons 版本。精確來源條款保留於 `public/data/MRA_DISTAL_LICENSE.txt`；資料授權與 App 軟體及 TopCoW CC-BY-NC 資料分開。不暗示來源作者背書。
