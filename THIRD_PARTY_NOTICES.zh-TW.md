[繁體中文](THIRD_PARTY_NOTICES.zh-TW.md) · [简体中文](THIRD_PARTY_NOTICES.zh-CN.md) · [English](THIRD_PARTY_NOTICES.md) · [Deutsch](THIRD_PARTY_NOTICES.de.md) · [日本語](THIRD_PARTY_NOTICES.ja.md)

<!-- source-doc: THIRD_PARTY_NOTICES.md; sha256: 4099e9c0792f13faafa0657b11ca785fbdff57f2d0939615c5b999cbf40f7851 -->

<a id="third-party-notices--第三方授權聲明"></a>
# 第三方許可宣告

專案**原始碼**以 MIT 許可證釋出（見 `LICENSE`）。另包含**第三方圖譜派生資料**，並依賴開源庫。以下列出各許可證及必要宣告；應用“來源及許可”顯示相同列表，維護於 `src/anatomy/sources.ts`。

---

<a id="1-licence-of-the-derived-data--衍生資料的授權"></a>
## 1. 派生資料許可

檔案：`public/data/brain.json`、`public/data/brain.bin`、`src/anatomy/generated/beds.json`、`src/anatomy/generated/vesselPaths.json`（以及構建時打包進 `dist/` 的副本）。

T1 切片資料及取樣動脈標籤（`public/data/slices.json` 和 `public/data/slices.bin.gz`）使用相同資料許可和宣告。T1 強度經量化用於顯示；Liu 標籤採用專案近似圖譜至模板對映。見[切片來源和限制](docs/slices.zh-TW.md)。標籤描述參考供血區域，不定位個體模擬病灶。

這些檔案是第 2 節圖譜的**改編材料**，尤其是以 CC BY-SA 4.0 授權的 *Digital 3D Brain MRI Arterial Territories Atlas*。因此以 **Creative Commons Attribution-ShareAlike 4.0 International** 許可證（<https://creativecommons.org/licenses/by-sa/4.0/>）分發，同時受第 2.1 節原文 MNI／McGill 版權宣告約束。再分發或改編須保留下列署名，派生作品須依 CC BY-SA 4.0 或相容許可證分享。

**所作修改（適用於以下各來源）：**必要時重取樣／配準體積至 MNI152NLin2009cAsym；以 marching cubes 提取表面，簡化並平滑；標籤合併為功能區域 × 動脈供血區域；血管中心線吸附到血管機率脊線，並鋪設於腦表面。不分發原始資料，`tools/build_assets.py` 從下列官方 URL 下載。

應用程式碼（倉庫其餘內容）仍採用 MIT；資料檔案是與程式碼彙集的獨立作品。

---

<a id="2-data-sources--資料來源"></a>
## 2. 資料來源

<a id="21-mni-icbm-152-nonlinear-asymmetric-2009c-template-via-templateflow"></a>
### 2.1 MNI ICBM 152 Nonlinear Asymmetric 2009c template（經 TemplateFlow）

用途：腦、小腦、腦幹和深部核團表面（來自 T1w 影象、GM／WM 機率圖及模板附帶的 FreeSurfer `aseg` 分割）；整個專案的座標空間。

來源：<https://www.templateflow.org/>（`tpl-MNI152NLin2009cAsym`），原始來源 <http://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/>。NLin6Asym T1w 模板（相同許可）僅用於將血管圖譜（2.5）配準至 2009c 空間。

必要宣告（從模板 `LICENSE` 檔案逐字保留；以下英文為原始法律宣告，中文說明不替代原文）：

> Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute,
> McGill University.
> Permission to use, copy, modify, and distribute this software and its documentation for any purpose and
> without fee is hereby granted, provided that the above copyright notice appear in all copies. The authors
> and McGill University make no representations about the suitability of this software for any purpose. It is
> provided "as is" without express or implied warranty. The authors are not responsible for any data loss,
> equipment damage, property loss, or injury to subjects or patients resulting from the use or misuse of this
> software package.

引用（保留原始作者、標題及書目資訊）：

- Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. Unbiased average age-appropriate atlases for pediatric studies. *NeuroImage* 2011;54(1):313–327.
- Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear average age-appropriate brain templates from birth to adulthood. *NeuroImage* 2009;47:S102.
- Ciric R, Thompson WH, Lorenz R, et al. TemplateFlow: FAIR-sharing of multi-scale, multi-species brain models. *Nat Methods* 2022;19:1568–1571.
- Fischl B, et al. Whole brain segmentation: automated labeling of neuroanatomical structures in the human brain. *Neuron* 2002;33:341–355（FreeSurfer `aseg`）。

<a id="22-dkt31-cortical-parcellation-mindboggle"></a>
### 2.2 DKT31 cortical parcellation（Mindboggle）

用途：將各皮質表面點分配到腦回／功能區域。檔案：`tpl-MNI152NLin2009cAsym_res-02_desc-DKT31_dseg.nii.gz`（TemplateFlow）。許可：**CC BY 4.0**，<https://creativecommons.org/licenses/by/4.0/>（Mindboggle 資料，<https://mindboggle.info/data>）。

- Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol. *Front Neurosci* 2012;6:171.

<a id="23-mial67-probabilistic-atlas-of-the-thalamic-nuclei"></a>
### 2.3 MIAL67 probabilistic atlas of the thalamic nuclei

用途：將視丘劃分為前、旁正中、腹外側及後部動脈分割槽。檔案：`tpl-MNI152NLin2009cAsym_res-01_atlas-MIAL67ThalamicNuclei_dseg.nii.gz`（TemplateFlow）。許可：**CC BY 4.0**（TemplateFlow sidecar 宣告；原始資料 <https://doi.org/10.5281/zenodo.1241074>）。

- Najdenovska E, Alemán-Gómez Y, Battistella G, et al. In-vivo probabilistic atlas of human thalamic nuclei based on diffusion-weighted magnetic resonance imaging. *Sci Data* 2018;5:180270.

<a id="24-digital-3d-brain-mri-arterial-territories-atlas"></a>
### 2.4 Digital 3D Brain MRI Arterial Territories Atlas

用途：所有組織體素的動脈供血區域（ACA、MCA、PCA 分割槽，豆紋、脈絡叢、椎基底／小腦）及其邊界區；`beds.json` 供血床體積和 `brain.bin` 逐頂點供血標籤由此派生。檔案：<https://github.com/Chin-Fu-Liu/Arterial_Atlas> 的 `data/Atlas/ArterialAtlas.nii`（也在 NITRC）。許可：**CC BY-SA 4.0**，<https://creativecommons.org/licenses/by-sa/4.0/>。

- Digital 3D Brain MRI Arterial Territories Atlas © 2021 The Johns Hopkins University.
- Liu CF, Hsu J, Xu X, et al. Digital 3D brain MRI arterial territories atlas. *Sci Data* 2023;10:74.

<a id="25-statistical-atlas-of-cerebral-arteries-mouches--forkert"></a>
### 2.5 Statistical atlas of cerebral arteries（Mouches & Forkert）

用途：將人工動脈中心線吸附至統計真實位置，檢查半徑（Willis 環、基底、椎動脈、M1/M2、A1/A2、P1/P2 等）。檔案：*Vessel Occurrence Probability Atlas*（figshare 7026179）及 *Average vessel radius atlas*（figshare 7026185），集合 <https://doi.org/10.6084/m9.figshare.c.4215089>。許可：**CC0 1.0**（公共領域貢獻），禮貌保留署名：

- Mouches P, Forkert ND. A statistical atlas of cerebral arteries generated using multi-center MRA datasets from healthy subjects. *Sci Data* 2019;6:29.

---

<a id="3-open-source-projects-consulted-no-code-copied--參考的開源專案未複製程式碼"></a>
## 3. 參考的開源專案（未複製程式碼）

| 專案 | 許可 | 參考內容 |
|---|---|---|
| [openBF](https://github.com/INSIGNEO/openBF)（INSIGNEO） | Apache-2.0 | 其 Alastruey 2007 Willis 環模型的血管半徑／長度作為參考值，屬於發表論文的事實；未複製程式碼或檔案。 |
| [WillisWorks](https://github.com/abhogal-lab/WillisWorks) | GPL-3.0 | 只參考自動調節、盜血及側支血流的呈現思路。未使用程式碼；GPL-3.0 與專案 MIT 許可不相容。 |
| [neuroaxis-atlas](https://github.com/linkbag/neuroaxis-atlas) | MIT | 腦幹綜合徵卡片及署名實踐啟發了呈現。 |
| [brain-game](https://github.com/Rickaym/brain-game) | MIT（程式碼）；模型 CC BY-SA 2.1 JP | 區域–動脈對應及中風模擬思路。**未使用**其 3D 模型。 |

人工解剖定義、規則及應用程式碼專為本專案編寫；生成圖譜資料及下述 MRA 交通動脈形狀屬於第三方例外。

<a id="topcow-mra-derived-communicating-vessel-shapes"></a>
### TopCoW MRA 交通動脈形狀

`src/anatomy/generated/mraCommunicatingPaths.json` 和 `mraCommunicatingAudit.json` 包含 Musio et al., *Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm*（2025 年預印本，arXiv:2510.13720）的來源及修改資料。TopCoW 資料集釋出於 2025-10-15，MRA 病例 008。來源：<https://zenodo.org/records/17358162>。

來源及派生資料適用 **CC BY-NC 4.0**，與 MIT 軟體及 CC BY-SA 圖譜資源分開：<https://creativecommons.org/licenses/by-nc/4.0/>。須署名；商業用途需另獲許可。不暗示來源作者認可。原始來源圖及節點後設資料保留於審閱檔案。

修改：提取左右 PCom 和主 ACom 路徑，排除第三 A2 側支；透過正旋轉、平移和均勻縮放放置到現有模型連線點。所含視丘結節動脈連線段是人工顯示幾何，更新初始點。位置未經驗證，遠端分支仍為人工繪製，模擬幾何及引數不變。見[來源專屬假設](docs/mra-communicating-shapes.zh-TW.md)和 `src/anatomy/generated/MRA_LICENSE.txt`。

---

<a id="4-runtime-libraries-bundled-into-the-site--打包進網站的函式庫"></a>
## 4. 打包進網站的執行庫

<a id="additional-individual-distal-mra-reference-data"></a>
### 額外個體遠端 MRA 參考資料

`public/data/mra-distal.json` 派生自 Bravissima BG0001，即 SPM 歸一化的個體 BraVa 動脈資料。[來源 README](https://www.nitrc.org/docman/view.php/1266/78741/Readme43)指定 Attribution，未標明 Creative Commons 版本；原始條款保留於 `public/data/MRA_DISTAL_LICENSE.txt`。資料許可與 MIT 程式碼分開。

Herron TJ, Dronkers N, Turken AU, *BraVa cerebral artery database converted to NIFTI MRI format*，2017 年海報，[DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1)。原始 BraVa：Wright et al., *Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography*, NeuroImage82，170–181（2013），[DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089)，[BraVa](http://cng.gmu.edu/brava)，[Bravissima](https://www.nitrc.org/projects/bravissima/)。

修改：保留所有有限且帶血管組標籤的來源體素中心，應用來源仿射，為顯示連線直接 26 鄰域。這種鄰接假設不是原始父節點圖。保留間隙；不推斷具名遠端分支對應或生理引數變化。與本腦模板配準未經驗證。見[來源專屬假設](docs/mra-distal.zh-TW.md)。

| 軟體包 | 許可 |
|---|---|
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber | MIT |
| @react-three/drei | MIT |
| three-stdlib（透過 drei） | MIT |
| zustand | MIT |
| react-reconciler, scheduler, its-fine, suspend-react, react-use-measure, use-sync-external-store（上述依賴） | MIT |

MIT 要求副本附帶版權宣告：完整文字位於各軟體包 `LICENSE` 檔案（`node_modules/<package>/LICENSE`），打包內容保留各包自身的 `@license` 註釋。構建／測試工具（Vite、Vitest、TypeScript、ESLint、jsdom、Testing Library）不交付使用者。

僅用於重新生成資源的 Python 工具（不交付使用者）：NumPy、SciPy、nibabel、scikit-image、trimesh、fast-simplification、SimpleITK；各自採用開源許可（BSD／MIT／Apache-2.0）。
