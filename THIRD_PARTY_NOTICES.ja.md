[繁體中文](THIRD_PARTY_NOTICES.zh-TW.md) · [简体中文](THIRD_PARTY_NOTICES.zh-CN.md) · [English](THIRD_PARTY_NOTICES.md) · [Deutsch](THIRD_PARTY_NOTICES.de.md) · [日本語](THIRD_PARTY_NOTICES.ja.md)

<!-- source-doc: THIRD_PARTY_NOTICES.md; sha256: 4099e9c0792f13faafa0657b11ca785fbdff57f2d0939615c5b999cbf40f7851 -->

<a id="third-party-notices--第三方授權聲明"></a>
# 第三者のライセンス告知

本プロジェクトの**ソースコード**はMITライセンスです（`LICENSE`参照）。**第三者アトラス由来のデータ**を含み、オープンソースライブラリに依存します。ライセンスと必須告知を以下に示します。同じ一覧はアプリの「出典とライセンス」に表示し、`src/anatomy/sources.ts`で管理します。

---

<a id="1-licence-of-the-derived-data--衍生資料的授權"></a>
## 1. 派生データのライセンス

対象：`public/data/brain.json`、`public/data/brain.bin`、`src/anatomy/generated/beds.json`、`src/anatomy/generated/vesselPaths.json`およびビルド時に`dist/`へ含めるコピー。

T1切片データと標本化動脈ラベル（`public/data/slices.json`、`public/data/slices.bin.gz`）も同じデータライセンス・告知を使用します。T1強度は表示用に量子化し、Liuラベルはプロジェクトの概略アトラス・テンプレート対応を用います。[切片の来歴と制限](docs/slices.ja.md)を参照してください。ラベルは参照領域であり、個別模擬病変を局在化しません。

これらは第2節のアトラス、特にCC BY-SA 4.0の*Digital 3D Brain MRI Arterial Territories Atlas*の**改変物**です。そのため**Creative Commons Attribution-ShareAlike 4.0 International**（<https://creativecommons.org/licenses/by-sa/4.0/>）で配布し、第2.1節のMNI/McGill著作権告知も適用します。再配布・改変時は以下の帰属を維持し、改変物をCC BY-SA 4.0または互換ライセンスで共有する必要があります。

**変更内容（以下の全出典に適用）：** 必要に応じ体積をMNI152NLin2009cAsymへ再サンプリング・位置合わせし、marching cubesで表面を抽出、簡略化・平滑化しました。ラベルを機能領域×動脈領域へ結合し、血管中心線を血管確率の稜線へ合わせ脳表へ配置しました。原アトラスは再配布せず、`tools/build_assets.py`が以下の公式URLから取得します。

他のリポジトリ内容であるアプリコードはMITのままです。データファイルは集積した別著作物です。

---

<a id="2-data-sources--資料來源"></a>
## 2. データ出典

<a id="21-mni-icbm-152-nonlinear-asymmetric-2009c-template-via-templateflow"></a>
### 2.1 MNI ICBM 152 Nonlinear Asymmetric 2009c template（TemplateFlow経由）

用途：テンプレートのT1w画像、GM/WM確率マップ、FreeSurfer `aseg`分割から脳・小脳・脳幹・深部核表面を生成し、全プロジェクトの座標空間に使用。

出典：<https://www.templateflow.org/>（`tpl-MNI152NLin2009cAsym`）、原出典<http://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/>。同じライセンスのNLin6Asym T1wは血管アトラス（2.5）を2009cへ位置合わせするためだけに使用しました。

必須告知（テンプレートの`LICENSE`から逐語複製。以下は説明の翻訳とは別の原文法的告知）：

> Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute,
> McGill University.
> Permission to use, copy, modify, and distribute this software and its documentation for any purpose and
> without fee is hereby granted, provided that the above copyright notice appear in all copies. The authors
> and McGill University make no representations about the suitability of this software for any purpose. It is
> provided "as is" without express or implied warranty. The authors are not responsible for any data loss,
> equipment damage, property loss, or injury to subjects or patients resulting from the use or misuse of this
> software package.

引用文献：

- Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. Unbiased average age-appropriate atlases for pediatric studies. *NeuroImage* 2011;54(1):313–327.
- Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear average age-appropriate brain templates from birth to adulthood. *NeuroImage* 2009;47:S102.
- Ciric R, Thompson WH, Lorenz R, et al. TemplateFlow: FAIR-sharing of multi-scale, multi-species brain models. *Nat Methods* 2022;19:1568–1571.
- Fischl B, et al. Whole brain segmentation: automated labeling of neuroanatomical structures in the human brain. *Neuron* 2002;33:341–355（FreeSurfer `aseg`）。

<a id="22-dkt31-cortical-parcellation-mindboggle"></a>
### 2.2 DKT31 cortical parcellation（Mindboggle）

用途：皮質表面点を脳回・機能領域へ割当。
ファイル：`tpl-MNI152NLin2009cAsym_res-02_desc-DKT31_dseg.nii.gz`（TemplateFlow）。
ライセンス：**CC BY 4.0**、<https://creativecommons.org/licenses/by/4.0/>（Mindboggleデータ、<https://mindboggle.info/data>）。

- Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol. *Front Neurosci* 2012;6:171.

<a id="23-mial67-probabilistic-atlas-of-the-thalamic-nuclei"></a>
### 2.3 MIAL67 probabilistic atlas of the thalamic nuclei

用途：視床を前部・傍正中・腹外側・後部の動脈区画へ分割。
ファイル：`tpl-MNI152NLin2009cAsym_res-01_atlas-MIAL67ThalamicNuclei_dseg.nii.gz`（TemplateFlow）。
ライセンス：**CC BY 4.0**（TemplateFlow sidecar記載、原データ<https://doi.org/10.5281/zenodo.1241074>）。

- Najdenovska E, Alemán-Gómez Y, Battistella G, et al. In-vivo probabilistic atlas of human thalamic nuclei based on diffusion-weighted magnetic resonance imaging. *Sci Data* 2018;5:180270.

<a id="24-digital-3d-brain-mri-arterial-territories-atlas"></a>
### 2.4 Digital 3D Brain MRI Arterial Territories Atlas

用途：全組織ボクセルの動脈領域（ACA、MCA、PCAの細区分、レンズ核線条体・脈絡叢・椎骨脳底／小脳）と境界領域。`beds.json`の床体積と`brain.bin`の頂点ごとの領域ラベルはこれに由来します。
ファイル：<https://github.com/Chin-Fu-Liu/Arterial_Atlas>の`data/Atlas/ArterialAtlas.nii`（NITRCにも公開）。
ライセンス：**CC BY-SA 4.0**、<https://creativecommons.org/licenses/by-sa/4.0/>。

- Digital 3D Brain MRI Arterial Territories Atlas © 2021 The Johns Hopkins University.
- Liu CF, Hsu J, Xu X, et al. Digital 3D brain MRI arterial territories atlas. *Sci Data* 2023;10:74.

<a id="25-statistical-atlas-of-cerebral-arteries-mouches--forkert"></a>
### 2.5 Statistical atlas of cerebral arteries（Mouches & Forkert）

用途：手作成動脈中心線を統計的に実在する位置へ合わせ、半径を確認（Willis輪、脳底・椎骨、M1/M2、A1/A2、P1/P2…）。
ファイル：*Vessel Occurrence Probability Atlas*（figshare 7026179）、*Average vessel radius atlas*（figshare 7026185）、コレクション<https://doi.org/10.6084/m9.figshare.c.4215089>。
ライセンス：**CC0 1.0**（パブリックドメイン提供）。任意の帰属表示：

- Mouches P, Forkert ND. A statistical atlas of cerebral arteries generated using multi-center MRA datasets from healthy subjects. *Sci Data* 2019;6:29.

---

<a id="3-open-source-projects-consulted-no-code-copied--參考的開源專案未複製程式碼"></a>
## 3. 参照したオープンソースプロジェクト（コード複製なし）

| プロジェクト | ライセンス | 採用内容 |
|---|---|---|
| [openBF](https://github.com/INSIGNEO/openBF)（INSIGNEO） | Apache-2.0 | Alastruey 2007 Willis輪モデルの半径・長さを参照値に使用（公開論文の事実。コードやファイル複製なし）。 |
| [WillisWorks](https://github.com/abhogal-lab/WillisWorks) | GPL-3.0 | 自動調節・盗血・側副血流の表示の考え方だけ。コード使用なし。GPL-3.0は本MITライセンスと互換でない。 |
| [neuroaxis-atlas](https://github.com/linkbag/neuroaxis-atlas) | MIT | 脳幹症候群カードと帰属表示を参考にした。 |
| [brain-game](https://github.com/Rickaym/brain-game) | MIT（コード）；モデルCC BY-SA 2.1 JP | 領域・動脈対応と脳卒中シミュレーターの考え方。3Dモデルは**使用しない**。 |

作成した解剖定義・規則・アプリコードは本プロジェクト専用です。生成アトラスデータと以下のMRA交通血管形状は第三者由来の例外です。

<a id="topcow-mra-derived-communicating-vessel-shapes"></a>
### TopCoW MRA由来の交通血管形状

`src/anatomy/generated/mraCommunicatingPaths.json`と`mraCommunicatingAudit.json`はMusio et al., *Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm*（2025プレプリント、arXiv:2510.13720）、2025-10-15公開TopCoW MRA症例008の原・改変データを含みます。出典：<https://zenodo.org/records/17358162>。

原・派生データはMITソフトウェアやCC BY-SAアトラスアセットとは別の**CC BY-NC 4.0**：<https://creativecommons.org/licenses/by-nc/4.0/>。帰属が必要で、商用には別許可が必要です。推奨を意味しません。原グラフ・ノードメタデータは監査ファイルに保持します。

変更：左右PComと主要ACom経路を抽出、第3A2側枝を除外、既存モデル接続点へ正の回転・平行移動・一様スケールを適用。含めた視床結節動脈接続線は初期点を更新した手作成描画形状です。配置は未検証、遠位枝は手作成、シミュレーション形状・パラメータは不変です。[出典固有仮定](docs/mra-communicating-shapes.ja.md)と`src/anatomy/generated/MRA_LICENSE.txt`を参照してください。

---

<a id="4-runtime-libraries-bundled-into-the-site--打包進網站的函式庫"></a>
## 4. サイトに含まれる実行時ライブラリ

<a id="additional-individual-distal-mra-reference-data"></a>
### 追加の個別遠位MRA参照データ

`public/data/mra-distal.json`はBravissima BG0001のSPM正規化個別BraVa動脈データ由来です。[原README](https://www.nitrc.org/docman/view.php/1266/78741/Readme43)はCreative Commons版を指定せずAttributionと記し、正確な条件を`public/data/MRA_DISTAL_LICENSE.txt`に保持します。MITコードとは別のデータライセンスです。

Herron TJ, Dronkers N, Turken AU, *BraVa cerebral artery database converted to NIFTI MRI format*, 2017 poster, [DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1)。
原BraVa：Wright et al., *Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography*, NeuroImage82, 170–181 (2013), [DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089)、[BraVa](http://cng.gmu.edu/brava)、[Bravissima](https://www.nitrc.org/projects/bravissima/)。

変更：有限の系列ラベル付き原ボクセル中心をすべて保持し、原アフィンを適用し、表示用に直接26近傍を接続しました。この隣接仮定は元の親グラフではありません。隙間を保持し、具名遠位枝対応や生理パラメータ変更を推定しません。この脳への位置合わせは未検証です。[出典固有仮定](docs/mra-distal.ja.md)を参照してください。

| パッケージ | ライセンス |
|---|---|
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber | MIT |
| @react-three/drei | MIT |
| three-stdlib（drei経由） | MIT |
| zustand | MIT |
| react-reconciler, scheduler, its-fine, suspend-react, react-use-measure, use-sync-external-store（上記の依存関係） | MIT |

MITはコピーへの著作権告知添付を要求します。全文は各パッケージの`LICENSE`（`node_modules/<package>/LICENSE`）にあり、バンドルは各`@license`コメントを保持します。ビルド・テストツール（Vite、Vitest、TypeScript、ESLint、jsdom、Testing Library）はユーザーへ配布しません。

アセット再生成だけに用い、配布しないPythonツール：NumPy、SciPy、nibabel、scikit-image、trimesh、fast-simplification、SimpleITK。それぞれ独自のオープンソースライセンス（BSD/MIT/Apache-2.0）です。
