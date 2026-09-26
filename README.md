# 腦血管互動地圖 · Brain Vessel Interactive Map

[![CI](https://github.com/LZong-tw/brain-vessel-map/actions/workflows/ci.yml/badge.svg)](https://github.com/LZong-tw/brain-vessel-map/actions/workflows/ci.yml)
[![Deploy](https://github.com/LZong-tw/brain-vessel-map/actions/workflows/deploy.yml/badge.svg)](https://github.com/LZong-tw/brain-vessel-map/actions/workflows/deploy.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-yellow.svg)](LICENSE)
[![Data: CC BY-SA 4.0](https://img.shields.io/badge/data-CC%20BY--SA%204.0-lightgrey.svg)](public/data/LICENSE.txt)

在真實的 MNI 標準腦上看大腦、小腦與腦幹的動脈，點任一條血管或放出一顆栓子，看它塞住後
**幾分鐘到幾個月內**會怎麼影響「其他」腦區：缺血半影區變成梗塞、腦水腫擠壓、腦疝脫、水腦、遠端退化……

Arteries of the cerebrum, cerebellum and brainstem on a real MNI template brain. Block any vessel
(or release an embolus) and follow what happens to **other** brain regions from minutes to months.

**線上版 / Live:** <https://lzong-tw.github.io/brain-vessel-map/> （需先啟用 GitHub Pages，見下方〈部署〉）

![3D view — left M1 embolism at 24 h](docs/screenshot-3d.jpg)

> ⚠️ **教育用途，不能用於診斷。** 模型用的是「標準腦」和簡化的規則，不是任何一個人的腦。
> 懷疑中風請立刻撥 **119**（臉歪、手垂、說話不清楚——記下發作時間）。
>
> **Educational only — not a diagnostic tool.** Suspected stroke: call emergency services now.

---

## 功能 / Features

| | |
|---|---|
| **真實解剖幾何** | 大腦半球、小腦、腦幹、視丘、基底核、內囊、胼胝體、齒狀核、腦室——由 MNI ICBM152 2009c 模板產生的 3D 表面，不是手捏的形狀。 |
| **176 段動脈** | 主動脈弓 → 頸動脈／椎動脈 → Willis 環 → 皮質分支、豆紋動脈、脈絡叢動脈、腦幹穿通支、PICA／AICA／SCA，另有 38 段軟腦膜／顱外側枝；主幹位置校正到多中心 MRA 統計圖譜。125 個功能腦區、268 個「腦區 × 供應區」單位。 |
| **血流模擬** | 以 Poiseuille 阻力網路解每條血管的流量與方向：Willis 環逆流代償、鎖骨下動脈竊血、自動調節、低血壓時的分水嶺缺血、胚胎型 PCA、缺 AComm/PComm 等變異。 |
| **時間軸** | 發生時 → 15 分 → 1、3、4.5、6、12 小時 → 1、2、3、5 天 → 1、2 週 → 1、3、6 個月；可設定取栓／溶栓時間、減壓手術。 |
| **連鎖反應（對其他部位的影響）** | 惡性 MCA 水腫 → 大腦鐮下疝脫（壓 ACA）與鉤迴疝脫（壓中腦、PCA）；小腦水腫 → 阻塞性水腦；出血轉化風險；交叉性小腦失聯（CCD）；錐體徑 Wallerian 退化；下橄欖核肥大退化與軟顎顫抖；視丘萎縮；吸入性肺炎、心律不整、癲癇、憂鬱…… |
| **臨床輸出** | 預期症狀（依系統分組、左右側）、具名症候群（Wallenberg、Weber／Benedikt、Foville、閉鎖症候群、Percheron、Gerstmann、腔隙性……共 39 條規則）、NIHSS 估計（並提醒後循環常被低估）。 |
| **三種視圖** | 3D（可切面、調透明度、只看單側）、Willis 環示意圖（即時流量與方向，可直接點擊阻塞）、腦幹四個層面的血管分區切面。 |
| **栓子模擬** | 選來源（心臟、左右頸動脈、椎動脈）與大小，依各分支流量隨機漂流，卡在比它窄的血管——大栓子多卡在 ICA 末端或 M1，小栓子進到皮質分支。 |
| **27 個教學情境** | 左 M1、取栓對照、惡性水腫與減壓、T 型栓塞、Broca／Wernicke、ACA、AChA、腔隙、視丘、Percheron、PCA、基底動脈頂端、閉鎖症候群、Wallenberg、PICA 水腦、AICA、SCA → 軟顎顫抖、Dejerine、頸動脈狹窄、分水嶺、竊血、一過性黑矇…… |
| **其他** | 繁中／英文、可分享的網址（狀態存在 `#` 後面）、手機版面、BE-FAST 衛教。 |

## 這個模型「怎麼算」的 / How the simulation works

1. **幾何**：`tools/build_assets.py` 從 TemplateFlow 下載 MNI152NLin2009cAsym 的分割與機率圖，用 marching cubes 產生網格；每個表面點被標上「功能腦區 × 動脈供應區」（床，bed），供應區來自 Liu 等人的動脈分區圖譜，重疊處即分水嶺。
2. **血流**：每條血管是一個 Poiseuille 阻力；每個床由一條或多條供應動脈分攤；側枝依等級（好／中／差）有不同導通度；小動脈在灌流壓下降時擴張（自動調節，上限 1.8 倍）。解線性方程得到各點壓力與流量。
3. **組織命運**：相對血流 < 30% 為核心梗塞（幾分鐘內），30–55% 為缺血半影區（越低越快死、未治療時一部分會存活），55–85% 為輕度低灌流。再灌流會「凍結」當下的梗塞範圍。
4. **連鎖反應**：用文獻中的簡化門檻（例如 14 小時內梗塞 > 145 mL → 惡性水腫；小腦梗塞 > 25 mL → 水腦風險），把後果投射到**沒有被阻塞**的腦區。
5. **症狀與症候群**：每個腦區列出受損時的症狀（同側／對側），聚合後再用規則比對具名症候群。

程式碼：`src/engine/`（hemodynamics → tissue → cascade → clinical），解剖資料：`src/anatomy/`。

## 老實說：限制 / Honest limitations

- **不是病人專屬的模型。** 用的是平均的標準腦與平均的血管位置；真實的人血管變異很大（Willis 環完整的人不到一半）。
- **血流是 0 維的集總模型**，沒有脈動、沒有血液黏滯度變化、沒有真實的 3D 流體力學。數字（mL/分）只在「數量級」與「方向」上有意義。
- **閾值與時間常數是從文獻簡化、再手動校正**，目的是呈現正確的「趨勢」（側枝越差梗塞越大、越早再通救越多、後循環 NIHSS 偏低……），不是預測某個病人會有幾 mL 梗塞。
- 小血管（皮質穿通支、腦幹小分支）的位置是**示意**，只有主幹有統計圖譜校正。
- 症狀、症候群、NIHSS 都是「由受損腦區推估」，實際臨床表現差異很大；出血性中風、靜脈竇血栓、血管炎等**都沒有**模擬。
- 醫學內容由開發者依教科書與文獻整理，**尚未經過臨床醫師正式審閱**。發現錯誤請開 issue。

## 開發 / Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 87 個測試：血流、組織、症候群、連鎖反應、栓子
npm run lint && npm run typecheck
npm run build      # 輸出到 dist/，相對路徑，可放在任何子目錄
```

### 重新產生解剖資產 / Regenerating the anatomy assets

`public/data/brain.{json,bin}` 與 `src/anatomy/generated/*.json` 已放在 repo 裡，一般開發不需重建。
若修改了 `src/anatomy/`（血管、腦區）想重建：

```bash
python3 -m pip install -r tools/requirements.txt
npm run assets:build    # = vite-node tools/export-anatomy.ts && python3 tools/build_assets.py
```

第一次會下載約 80 MB 的公開圖譜到 `tools/.cache/`（已 gitignore），全程約 1 分鐘。

## 部署到 GitHub Pages / Deploying

1. 到 repo 的 **Settings → Pages → Build and deployment → Source** 選 **GitHub Actions**（只需做一次）。
2. 合併到 `main`（或在 Actions 分頁手動執行 *Deploy to GitHub Pages*）。
3. `.github/workflows/deploy.yml` 會跑測試、建置並發佈 `dist/`。網址為 `https://<帳號>.github.io/<repo>/`。

Vite 的 `base` 設為 `'./'`，所有資源都是相對路徑，repo 改名或使用自訂網域都不需要改設定；
狀態存在網址 `#` 後面，不需要伺服器路由。

## 專案結構 / Project layout

```
src/
  anatomy/     血管、腦區、症狀、症候群、變異、情境、時間軸、資料來源（sources.ts）
    generated/ 由 tools/build_assets.py 產生（床的體積、校正後的血管路徑）
  engine/      solver → hemodynamics → tissue → cascade → clinical → simulate；embolus
  scene/       react-three-fiber 3D 場景
  components/  面板、時間軸、Willis 環與腦幹切面示意圖
  state/       zustand store、網址同步
  i18n/        介面字串（繁中／英文）
tools/         資產管線（Python）與解剖資料匯出
public/data/   大腦網格（二進位）
```

## 資料來源與授權 / Sources & licences

- **程式碼**：MIT（[`LICENSE`](LICENSE)）。
- **衍生資料**（`public/data/`、`src/anatomy/generated/`）：**CC BY-SA 4.0**（[`public/data/LICENSE.txt`](public/data/LICENSE.txt)），因為其中包含由 CC BY-SA 4.0 的動脈分區圖譜衍生的內容。
- 使用的公開資料：MNI ICBM152 2009c 模板（McGill 版權聲明）、Mindboggle DKT31 皮質分區（CC BY 4.0）、MIAL67 視丘核圖譜（CC BY 4.0）、Liu 等人動脈分區圖譜（CC BY-SA 4.0）、Mouches & Forkert 腦動脈統計圖譜（CC0）。
- 參考但**未複製程式碼**的開源專案：openBF、WillisWorks（GPL-3.0，只參考概念）、neuroaxis-atlas、brain-game。

完整聲明、引用格式與修改說明見 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)，文獻見 [`REFERENCES.md`](REFERENCES.md)。
App 內的「資料來源與授權」視窗也列出同樣的內容。

---

## English summary

An educational, browser-only (static, GitHub Pages) app built with React, three.js / react-three-fiber and zustand.
The brain surfaces come from the MNI ICBM152 2009c template; every surface point is labelled with a functional
region and its arterial territory (Liu et al. atlas). 176 arterial segments — from the aortic arch to brainstem
perforators, plus leptomeningeal collaterals — form a Poiseuille resistance network with autoregulation and
collateral grades. Tissue fate uses relative-CBF thresholds (core < 30 %, penumbra < 55 %) with flow-dependent
time constants and reperfusion. A rule-based cascade projects consequences onto *other* regions over time
(malignant oedema → subfalcine/uncal herniation, cerebellar swelling → hydrocephalus, haemorrhagic
transformation risk, crossed cerebellar diaschisis, Wallerian and olivary degeneration, systemic complications),
and a clinical layer derives symptoms, 39 named-syndrome rules and an NIHSS estimate.

It is **not** patient-specific and has **not** been clinically validated: numbers illustrate trends, not predictions.
Code is MIT; derived data files are CC BY-SA 4.0 — see `THIRD_PARTY_NOTICES.md`.
