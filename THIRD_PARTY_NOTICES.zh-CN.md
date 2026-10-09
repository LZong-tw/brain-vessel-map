[繁體中文](THIRD_PARTY_NOTICES.zh-TW.md) · [简体中文](THIRD_PARTY_NOTICES.zh-CN.md) · [English](THIRD_PARTY_NOTICES.md) · [Deutsch](THIRD_PARTY_NOTICES.de.md) · [日本語](THIRD_PARTY_NOTICES.ja.md)

<!-- source-doc: THIRD_PARTY_NOTICES.md; sha256: 4099e9c0792f13faafa0657b11ca785fbdff57f2d0939615c5b999cbf40f7851 -->

<a id="third-party-notices--第三方授權聲明"></a>
# 第三方许可声明

项目**源代码**以 MIT 许可证发布（见 `LICENSE`）。另包含**第三方图谱派生数据**，并依赖开源库。以下列出各许可证及必要声明；应用“来源及许可”显示相同列表，维护于 `src/anatomy/sources.ts`。

---

<a id="1-licence-of-the-derived-data--衍生資料的授權"></a>
## 1. 派生数据许可

文件：`public/data/brain.json`、`public/data/brain.bin`、`src/anatomy/generated/beds.json`、`src/anatomy/generated/vesselPaths.json`（以及构建时打包进 `dist/` 的副本）。

T1 切片数据及采样动脉标签（`public/data/slices.json` 和 `public/data/slices.bin.gz`）使用相同数据许可和声明。T1 强度经量化用于显示；Liu 标签采用项目近似图谱至模板映射。见[切片来源和限制](docs/slices.zh-CN.md)。标签描述参考供血区域，不定位个体模拟病灶。

这些文件是第 2 节图谱的**改编材料**，尤其是以 CC BY-SA 4.0 授权的 *Digital 3D Brain MRI Arterial Territories Atlas*。因此以 **Creative Commons Attribution-ShareAlike 4.0 International** 许可证（<https://creativecommons.org/licenses/by-sa/4.0/>）分发，同时受第 2.1 节原文 MNI／McGill 版权声明约束。再分发或改编须保留下列署名，派生作品须依 CC BY-SA 4.0 或兼容许可证分享。

**所作修改（适用于以下各来源）：**必要时重采样／配准体积至 MNI152NLin2009cAsym；以 marching cubes 提取表面，简化并平滑；标签合并为功能区域 × 动脉供血区域；血管中心线吸附到血管概率脊线，并铺设于脑表面。不分发原始数据，`tools/build_assets.py` 从下列官方 URL 下载。

应用代码（仓库其余内容）仍采用 MIT；数据文件是与代码汇集的独立作品。

---

<a id="2-data-sources--資料來源"></a>
## 2. 数据来源

<a id="21-mni-icbm-152-nonlinear-asymmetric-2009c-template-via-templateflow"></a>
### 2.1 MNI ICBM 152 Nonlinear Asymmetric 2009c template（经 TemplateFlow）

用途：脑、小脑、脑干和深部核团表面（来自 T1w 图像、GM／WM 概率图及模板附带的 FreeSurfer `aseg` 分割）；整个项目的坐标空间。

来源：<https://www.templateflow.org/>（`tpl-MNI152NLin2009cAsym`），原始来源 <http://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/>。NLin6Asym T1w 模板（相同许可）仅用于将血管图谱（2.5）配准至 2009c 空间。

必要声明（从模板 `LICENSE` 文件逐字保留；以下英文为原始法律声明，中文说明不替代原文）：

> Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute,
> McGill University.
> Permission to use, copy, modify, and distribute this software and its documentation for any purpose and
> without fee is hereby granted, provided that the above copyright notice appear in all copies. The authors
> and McGill University make no representations about the suitability of this software for any purpose. It is
> provided "as is" without express or implied warranty. The authors are not responsible for any data loss,
> equipment damage, property loss, or injury to subjects or patients resulting from the use or misuse of this
> software package.

引用（保留原始作者、标题及书目信息）：

- Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. Unbiased average age-appropriate atlases for pediatric studies. *NeuroImage* 2011;54(1):313–327.
- Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear average age-appropriate brain templates from birth to adulthood. *NeuroImage* 2009;47:S102.
- Ciric R, Thompson WH, Lorenz R, et al. TemplateFlow: FAIR-sharing of multi-scale, multi-species brain models. *Nat Methods* 2022;19:1568–1571.
- Fischl B, et al. Whole brain segmentation: automated labeling of neuroanatomical structures in the human brain. *Neuron* 2002;33:341–355（FreeSurfer `aseg`）。

<a id="22-dkt31-cortical-parcellation-mindboggle"></a>
### 2.2 DKT31 cortical parcellation（Mindboggle）

用途：将各皮质表面点分配到脑回／功能区域。文件：`tpl-MNI152NLin2009cAsym_res-02_desc-DKT31_dseg.nii.gz`（TemplateFlow）。许可：**CC BY 4.0**，<https://creativecommons.org/licenses/by/4.0/>（Mindboggle 数据，<https://mindboggle.info/data>）。

- Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol. *Front Neurosci* 2012;6:171.

<a id="23-mial67-probabilistic-atlas-of-the-thalamic-nuclei"></a>
### 2.3 MIAL67 probabilistic atlas of the thalamic nuclei

用途：将丘脑划分为前、旁正中、腹外侧及后部动脉分区。文件：`tpl-MNI152NLin2009cAsym_res-01_atlas-MIAL67ThalamicNuclei_dseg.nii.gz`（TemplateFlow）。许可：**CC BY 4.0**（TemplateFlow sidecar 声明；原始数据 <https://doi.org/10.5281/zenodo.1241074>）。

- Najdenovska E, Alemán-Gómez Y, Battistella G, et al. In-vivo probabilistic atlas of human thalamic nuclei based on diffusion-weighted magnetic resonance imaging. *Sci Data* 2018;5:180270.

<a id="24-digital-3d-brain-mri-arterial-territories-atlas"></a>
### 2.4 Digital 3D Brain MRI Arterial Territories Atlas

用途：所有组织体素的动脉供血区域（ACA、MCA、PCA 分区，豆纹、脉络丛、椎基底／小脑）及其边界区；`beds.json` 供血床体积和 `brain.bin` 逐顶点供血标签由此派生。文件：<https://github.com/Chin-Fu-Liu/Arterial_Atlas> 的 `data/Atlas/ArterialAtlas.nii`（也在 NITRC）。许可：**CC BY-SA 4.0**，<https://creativecommons.org/licenses/by-sa/4.0/>。

- Digital 3D Brain MRI Arterial Territories Atlas © 2021 The Johns Hopkins University.
- Liu CF, Hsu J, Xu X, et al. Digital 3D brain MRI arterial territories atlas. *Sci Data* 2023;10:74.

<a id="25-statistical-atlas-of-cerebral-arteries-mouches--forkert"></a>
### 2.5 Statistical atlas of cerebral arteries（Mouches & Forkert）

用途：将人工动脉中心线吸附至统计真实位置，检查半径（Willis 环、基底、椎动脉、M1/M2、A1/A2、P1/P2 等）。文件：*Vessel Occurrence Probability Atlas*（figshare 7026179）及 *Average vessel radius atlas*（figshare 7026185），集合 <https://doi.org/10.6084/m9.figshare.c.4215089>。许可：**CC0 1.0**（公共领域贡献），礼貌保留署名：

- Mouches P, Forkert ND. A statistical atlas of cerebral arteries generated using multi-center MRA datasets from healthy subjects. *Sci Data* 2019;6:29.

---

<a id="3-open-source-projects-consulted-no-code-copied--參考的開源專案未複製程式碼"></a>
## 3. 参考的开源项目（未复制代码）

| 项目 | 许可 | 参考内容 |
|---|---|---|
| [openBF](https://github.com/INSIGNEO/openBF)（INSIGNEO） | Apache-2.0 | 其 Alastruey 2007 Willis 环模型的血管半径／长度作为参考值，属于发表论文的事实；未复制代码或文件。 |
| [WillisWorks](https://github.com/abhogal-lab/WillisWorks) | GPL-3.0 | 只参考自动调节、盗血及侧支血流的呈现思路。未使用代码；GPL-3.0 与项目 MIT 许可不兼容。 |
| [neuroaxis-atlas](https://github.com/linkbag/neuroaxis-atlas) | MIT | 脑干综合征卡片及署名实践启发了呈现。 |
| [brain-game](https://github.com/Rickaym/brain-game) | MIT（代码）；模型 CC BY-SA 2.1 JP | 区域–动脉对应及卒中模拟思路。**未使用**其 3D 模型。 |

人工解剖定义、规则及应用代码专为本项目编写；生成图谱数据及下述 MRA 交通动脉形状属于第三方例外。

<a id="topcow-mra-derived-communicating-vessel-shapes"></a>
### TopCoW MRA 交通动脉形状

`src/anatomy/generated/mraCommunicatingPaths.json` 和 `mraCommunicatingAudit.json` 包含 Musio et al., *Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm*（2025 年预印本，arXiv:2510.13720）的来源及修改数据。TopCoW 数据集发布于 2025-10-15，MRA 病例 008。来源：<https://zenodo.org/records/17358162>。

来源及派生数据适用 **CC BY-NC 4.0**，与 MIT 软件及 CC BY-SA 图谱资源分开：<https://creativecommons.org/licenses/by-nc/4.0/>。须署名；商业用途需另获许可。不暗示来源作者认可。原始来源图及节点元数据保留于审阅文件。

修改：提取左右 PCom 和主 ACom 路径，排除第三 A2 侧支；通过正旋转、平移和均匀缩放放置到现有模型连接点。所含丘脑结节动脉连接段是人工显示几何，更新初始点。位置未经验证，远端分支仍为人工绘制，模拟几何及参数不变。见[来源专属假设](docs/mra-communicating-shapes.zh-CN.md)和 `src/anatomy/generated/MRA_LICENSE.txt`。

---

<a id="4-runtime-libraries-bundled-into-the-site--打包進網站的函式庫"></a>
## 4. 打包进网站的运行库

<a id="additional-individual-distal-mra-reference-data"></a>
### 额外个体远端 MRA 参考数据

`public/data/mra-distal.json` 派生自 Bravissima BG0001，即 SPM 归一化的个体 BraVa 动脉数据。[来源 README](https://www.nitrc.org/docman/view.php/1266/78741/Readme43)指定 Attribution，未标明 Creative Commons 版本；原始条款保留于 `public/data/MRA_DISTAL_LICENSE.txt`。数据许可与 MIT 代码分开。

Herron TJ, Dronkers N, Turken AU, *BraVa cerebral artery database converted to NIFTI MRI format*，2017 年海报，[DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1)。原始 BraVa：Wright et al., *Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography*, NeuroImage82，170–181（2013），[DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089)，[BraVa](http://cng.gmu.edu/brava)，[Bravissima](https://www.nitrc.org/projects/bravissima/)。

修改：保留所有有限且带血管组标签的来源体素中心，应用来源仿射，为显示连接直接 26 邻域。这种邻接假设不是原始父节点图。保留间隙；不推断具名远端分支对应或生理参数变化。与本脑模板配准未经验证。见[来源专属假设](docs/mra-distal.zh-CN.md)。

| 软件包 | 许可 |
|---|---|
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber | MIT |
| @react-three/drei | MIT |
| three-stdlib（通过 drei） | MIT |
| zustand | MIT |
| react-reconciler, scheduler, its-fine, suspend-react, react-use-measure, use-sync-external-store（上述依赖） | MIT |

MIT 要求副本附带版权声明：完整文本位于各软件包 `LICENSE` 文件（`node_modules/<package>/LICENSE`），打包内容保留各包自身的 `@license` 注释。构建／测试工具（Vite、Vitest、TypeScript、ESLint、jsdom、Testing Library）不交付用户。

仅用于重新生成资源的 Python 工具（不交付用户）：NumPy、SciPy、nibabel、scikit-image、trimesh、fast-simplification、SimpleITK；各自采用开源许可（BSD／MIT／Apache-2.0）。
