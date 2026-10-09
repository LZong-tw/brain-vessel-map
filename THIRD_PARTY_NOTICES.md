# Third-party notices · 第三方授權聲明

This project's **source code** is released under the MIT licence (see `LICENSE`).
It also contains **data derived from third-party atlases** and depends on open-source libraries.
Their licences and required notices are listed below. The same list is shown in the app
("Sources & licences" / 「資料來源與授權」) and kept in `src/anatomy/sources.ts`.

本專案的**程式碼**採 MIT 授權。專案中另含**由第三方圖譜衍生的資料**，並使用多個開源函式庫；
其授權與必要聲明如下，App 內「資料來源與授權」視窗顯示相同內容。

---

## 1. Licence of the derived data · 衍生資料的授權

Files: `public/data/brain.json`, `public/data/brain.bin`, `src/anatomy/generated/beds.json`,
`src/anatomy/generated/vesselPaths.json` (and the copies bundled into `dist/` at build time).

The T1 slice data and sampled arterial labels (`public/data/slices.json` and
`public/data/slices.bin.gz`) use the same data licence and notices. T1 intensities are
quantized for display; Liu labels use the project's approximate atlas-to-template mapping.
See [slice provenance and limitations](docs/slices.md). These labels describe reference
territories; they do not locate an individual simulated lesion.

These files are **adapted material** of the atlases in section 2 — in particular of the
*Digital 3D Brain MRI Arterial Territories Atlas*, which is licensed CC BY-SA 4.0. They are therefore
distributed under the **Creative Commons Attribution-ShareAlike 4.0 International** licence
(<https://creativecommons.org/licenses/by-sa/4.0/>), subject additionally to the MNI/McGill copyright notice
reproduced in section 2.1. Anyone redistributing or adapting these files must keep the attributions below and
share adaptations under CC BY-SA 4.0 (or a compatible licence).

**Changes made (applies to every source below):** volumes were resampled/registered to MNI152NLin2009cAsym
where needed; surfaces were extracted with marching cubes, decimated and smoothed; labels were combined into
functional regions × arterial territories; vessel centrelines were snapped to vessel-probability ridges and
draped on the brain surface. The originals are not redistributed — `tools/build_assets.py` downloads them
from the URLs below.

The application code (everything else in this repository) remains MIT-licensed; the data files are separate
works aggregated with it.

這些檔案是第 2 節各圖譜的**改作物**，其中動脈分區圖譜採 CC BY-SA 4.0，因此衍生資料以
**CC BY-SA 4.0** 釋出，並同時適用 2.1 節的 MNI／McGill 版權聲明。散布或改作時須保留下列標示，
改作物須以 CC BY-SA 4.0（或相容授權）釋出。原始圖譜不隨本專案散布，由 `tools/build_assets.py` 自官方網址下載。

---

## 2. Data sources · 資料來源

### 2.1 MNI ICBM 152 Nonlinear Asymmetric 2009c template (via TemplateFlow)

Used for: brain, cerebellum, brainstem and deep-nuclei surfaces (from the T1w image, GM/WM probability maps and
the FreeSurfer `aseg` segmentation distributed with the template); coordinate space of the whole project.

Source: <https://www.templateflow.org/> (`tpl-MNI152NLin2009cAsym`), originally
<http://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/>. The NLin6Asym T1w template (same licence) was used
only to register the vessel atlas (2.5) into 2009c space.

Required notice (reproduced verbatim from the template's `LICENSE` file):

> Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute,
> McGill University.
> Permission to use, copy, modify, and distribute this software and its documentation for any purpose and
> without fee is hereby granted, provided that the above copyright notice appear in all copies. The authors
> and McGill University make no representations about the suitability of this software for any purpose. It is
> provided "as is" without express or implied warranty. The authors are not responsible for any data loss,
> equipment damage, property loss, or injury to subjects or patients resulting from the use or misuse of this
> software package.

Citations:
- Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. Unbiased average age-appropriate atlases for
  pediatric studies. *NeuroImage* 2011;54(1):313–327.
- Fonov VS, Evans AC, McKinstry RC, Almli CR, Collins DL. Unbiased nonlinear average age-appropriate brain
  templates from birth to adulthood. *NeuroImage* 2009;47:S102.
- Ciric R, Thompson WH, Lorenz R, et al. TemplateFlow: FAIR-sharing of multi-scale, multi-species brain models.
  *Nat Methods* 2022;19:1568–1571.
- Fischl B, et al. Whole brain segmentation: automated labeling of neuroanatomical structures in the human brain.
  *Neuron* 2002;33:341–355 (FreeSurfer `aseg`).

### 2.2 DKT31 cortical parcellation (Mindboggle)

Used for: assigning each cortical surface point to a gyrus / functional region.
File: `tpl-MNI152NLin2009cAsym_res-02_desc-DKT31_dseg.nii.gz` (TemplateFlow).
Licence: **CC BY 4.0** — <https://creativecommons.org/licenses/by/4.0/> (Mindboggle data, <https://mindboggle.info/data>).

- Klein A, Tourville J. 101 labeled brain images and a consistent human cortical labeling protocol.
  *Front Neurosci* 2012;6:171.

### 2.3 MIAL67 probabilistic atlas of the thalamic nuclei

Used for: splitting the thalamus into anterior, paramedian, ventrolateral and posterior (arterial) sectors.
File: `tpl-MNI152NLin2009cAsym_res-01_atlas-MIAL67ThalamicNuclei_dseg.nii.gz` (TemplateFlow).
Licence: **CC BY 4.0** (as stated in the TemplateFlow sidecar; original data <https://doi.org/10.5281/zenodo.1241074>).

- Najdenovska E, Alemán-Gómez Y, Battistella G, et al. In-vivo probabilistic atlas of human thalamic nuclei based
  on diffusion-weighted magnetic resonance imaging. *Sci Data* 2018;5:180270.

### 2.4 Digital 3D Brain MRI Arterial Territories Atlas

Used for: the arterial territory of every tissue voxel (ACA, MCA, PCA subdivisions, lenticulostriate, choroidal,
vertebrobasilar/cerebellar) and the border zones between them; the bed volumes in `beds.json` and the per-vertex
territory labels in `brain.bin` are derived from it.
File: `data/Atlas/ArterialAtlas.nii` from <https://github.com/Chin-Fu-Liu/Arterial_Atlas> (also on NITRC).
Licence: **CC BY-SA 4.0** — <https://creativecommons.org/licenses/by-sa/4.0/>.

- Digital 3D Brain MRI Arterial Territories Atlas © 2021 The Johns Hopkins University.
- Liu CF, Hsu J, Xu X, et al. Digital 3D brain MRI arterial territories atlas. *Sci Data* 2023;10:74.

### 2.5 Statistical atlas of cerebral arteries (Mouches & Forkert)

Used for: snapping the hand-authored artery centrelines to statistically real positions and checking radii
(circle of Willis, basilar, vertebral, M1/M2, A1/A2, P1/P2 …).
Files: *Vessel Occurrence Probability Atlas* (figshare 7026179) and *Average vessel radius atlas* (figshare 7026185),
collection <https://doi.org/10.6084/m9.figshare.c.4215089>.
Licence: **CC0 1.0** (public domain dedication). Attribution given as a courtesy:

- Mouches P, Forkert ND. A statistical atlas of cerebral arteries generated using multi-center MRA datasets from
  healthy subjects. *Sci Data* 2019;6:29.

---

## 3. Open-source projects consulted (no code copied) · 參考的開源專案（未複製程式碼）

| Project | Licence | What we took |
|---|---|---|
| [openBF](https://github.com/INSIGNEO/openBF) (INSIGNEO) | Apache-2.0 | Vessel radii/lengths of its Alastruey 2007 circle-of-Willis model used as reference values (facts from the published paper; no code or files copied). |
| [WillisWorks](https://github.com/abhogal-lab/WillisWorks) | GPL-3.0 | Ideas only: how to present autoregulation, steal and collateral flow. No code was used — GPL-3.0 is not compatible with this project's MIT licence. |
| [neuroaxis-atlas](https://github.com/linkbag/neuroaxis-atlas) | MIT | Its brainstem-syndrome cards and attribution practice informed our presentation. |
| [brain-game](https://github.com/Rickaym/brain-game) | MIT (code); model CC BY-SA 2.1 JP | Region–artery mapping and stroke-simulator ideas. Its 3D model is **not** used here. |

The authored anatomy definitions, rules and application code were written for this project;
generated atlas data and the MRA-derived communicating vessel shapes below are third-party exceptions.

### TopCoW MRA-derived communicating vessel shapes

`src/anatomy/generated/mraCommunicatingPaths.json` and `mraCommunicatingAudit.json`
contain source and modified data from Musio et al., *Circle of Willis Centerline Graphs:
A Dataset and Baseline Algorithm* (2025 preprint, arXiv:2510.13720),
TopCoW dataset released 2025-10-15, MRA case 008.
Source: <https://zenodo.org/records/17358162>.

These source and derivative data are **CC BY-NC 4.0**, separately from the MIT software
and the CC BY-SA atlas assets: <https://creativecommons.org/licenses/by-nc/4.0/>.
Attribution is required; commercial use needs separate permission. No endorsement is implied.
The original source graph and node metadata are retained in the audit file.

Changes: extracted right/left PCom and the main ACom path; excluded the third-A2 side branch;
applied proper rotations, translations and uniform scales to existing model attachment points.
The included tuberothalamic connectors are authored render geometry with updated initial points.
Placement is unvalidated, distal branches remain authored, and simulation geometry and parameters
are unchanged. See [source-specific assumptions](docs/mra-communicating-shapes.md) and
`src/anatomy/generated/MRA_LICENSE.txt`.

---

## 4. Runtime libraries bundled into the site · 打包進網站的函式庫

| Package | Licence |
|---|---|
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber | MIT |
| @react-three/drei | MIT |
| three-stdlib (via drei) | MIT |
| zustand | MIT |
| react-reconciler, scheduler, its-fine, suspend-react, react-use-measure, use-sync-external-store (dependencies of the above) | MIT |

The MIT licence requires the copyright notice to accompany copies: the full texts are in each package's
`LICENSE` file (`node_modules/<package>/LICENSE`), and the bundles keep the packages' own `@license` comments. Build/test tooling (Vite, Vitest, TypeScript, ESLint, jsdom, Testing Library) is not shipped to users.

Python tooling used only to regenerate the assets (not shipped): NumPy, SciPy, nibabel, scikit-image, trimesh,
fast-simplification, SimpleITK — each under its own open-source licence (BSD/MIT/Apache-2.0).
