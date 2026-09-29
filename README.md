# 腦血管互動地圖 · Brain Vessel Interactive Map

[![CI](https://github.com/LZong-tw/brain-vessel-map/actions/workflows/ci.yml/badge.svg)](https://github.com/LZong-tw/brain-vessel-map/actions/workflows/ci.yml)
[![Deploy](https://github.com/LZong-tw/brain-vessel-map/actions/workflows/deploy.yml/badge.svg)](https://github.com/LZong-tw/brain-vessel-map/actions/workflows/deploy.yml)
[![Code: MIT](https://img.shields.io/badge/code-MIT-yellow.svg)](LICENSE)
[![Data: CC BY-SA 4.0](https://img.shields.io/badge/data-CC%20BY--SA%204.0-lightgrey.svg)](public/data/LICENSE.txt)

在真實的 MNI 標準腦上看大腦、小腦與腦幹的動脈，點任一條血管或放出一顆栓子，看它塞住後
**幾分鐘到幾個月內**會怎麼影響「其他」腦區：缺血半影區變成梗塞、腦水腫與腫脹擠壓、腦疝脫、水腦、遠端退化……
以及每個時間點**哪些腦區、哪些功能**正在受損、還救得回來、或已經恢復。

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
| **178 段動脈** | 主動脈弓 → 頸動脈／椎動脈 → Willis 環 → 皮質分支、豆紋動脈、脈絡叢動脈、腦幹穿通支、PICA／AICA／SCA，另有 38 段軟腦膜／顱外側枝；主幹位置校正到多中心 MRA 統計圖譜。125 個功能腦區、268 個「腦區 × 供應區」單位。 |
| **血流模擬** | 以 Poiseuille 阻力網路解每條血管的流量與方向：Willis 環逆流代償、鎖骨下動脈竊血、自動調節、低血壓時的分水嶺缺血、胚胎型 PCA、缺 AComm/PComm 等變異。 |
| **病例 → 此刻 → 最終** | 左側「病例」把一個病例集中在三張卡片：發病前條件（側枝循環、血壓、Willis 環變異）、阻塞事件（每條血管的程度與時程，可疊加多條，例如基底動脈中段 + 右 PICA；也可放一顆隨機栓子）、治療（再通時間與細節、減壓手術）；每張卡片收合時仍顯示一行摘要。「範本」可直接載入或疊加到目前的病例。時間軸上方有一行病例摘要，點了就回到病例。右側分成「此刻」（顯示時間當下）、「最終」（病程結束時：最終梗塞、3／6 個月的 NIHSS 與留下的缺損和代償程度、晚期併發症、有治療時和「同樣阻塞但沒再通」的對照）與「詳細」（選取的血管或腦區）。 |
| **時間軸** | 發生時 → 15、30 分 → 1、2、3、4.5、6、12 小時 → 1、2、3、5 天 → 1、2 週 → 1、3、6 個月；可設定取栓／溶栓時間、減壓手術。「此刻」與「詳細」都跟著時間軸變：此刻的組織狀態、還剩多久會失去半影區、哪些功能受損／瀕危／已恢復，以及整段病程的「功能受影響時間軸」熱圖（點任一格可看那個時間點的症狀、來源腦區與變化）。 |
| **分段病程** | 每條血管可設定開始與自行再通的時間，也可「之後變成完全阻塞」：模擬短暫性腦缺血（TIA）、狹窄後才完全阻塞（例如前驅 TIA → 數天後基底動脈閉塞），以及在任一時間點治療。 |
| **再通細節** | 治療方式（取栓／靜脈溶栓／橋接）、再灌流程度（eTICI 0–3）、再阻塞、取栓時碎片栓到遠端分支、無再流（證據有限）。模擬的是你選的結果；旁邊附上依阻塞位置整理的已發表數據（再通率、有症狀出血、再阻塞、遠端栓塞、無再流），每個數字都有出處，並提醒溶栓／取栓時間窗。「已救回」只算「不治療會死、治療後活下來」的組織。 |
| **恢復** | 早期的缺損比梗塞大（水腫與遠端功能抑制讓活著的組織暫時停擺），之後依備援路徑部分代償：單側病灶、有雙側支配或平行路徑的功能代償較多；腦神經核這類「最終共同通路」沒有備援；橋腦腹側兩側受損時主路徑與備援一起中斷，恢復很有限。只是示意的群體平均，不是預後。 |
| **水腫與腫脹** | 細胞毒性水腫（DWI，幾分鐘內）→ 離子性水腫（CT 低密度，數小時）→ 血管性水腫（第 3–5 天最腫）→ 消退 → 萎縮（數月後）；3D 腦會依各區腫脹量變形（可放大 1×／3×／5× 以便看清楚），另有「水腫／影像」著色模式；中線偏移、腦室受壓或擴大隨時間計算。 |
| **連鎖反應（對其他部位的影響）** | 惡性 MCA 水腫 → 大腦鐮下疝脫（壓 ACA）與鉤迴疝脫（壓中腦、PCA）；小腦水腫 → 阻塞性水腦；出血轉化風險；交叉性小腦失聯（CCD）；錐體徑 Wallerian 退化；下橄欖核肥大退化與軟顎顫抖；視丘萎縮；吸入性肺炎、心律不整、癲癇、憂鬱…… |
| **臨床輸出** | 預期症狀（依系統分組、左右側）、具名症候群（Wallenberg、Weber／Benedikt、Foville、閉鎖症候群、Percheron、Gerstmann、腔隙性……共 39 條規則）、NIHSS 估計（並提醒後循環常被低估）。 |
| **三種視圖** | 3D（可切面、調透明度、只看單側）、Willis 環示意圖（即時流量與方向，可直接點擊阻塞）、腦幹四個層面的血管分區切面。 |
| **栓子模擬** | 選來源（心臟、左右頸動脈、椎動脈）與大小，依各分支流量隨機漂流，卡在比它窄的血管——大栓子多卡在 ICA 末端或 M1，小栓子進到皮質分支。 |
| **31 個教學範本** | 左 M1、取栓對照、惡性水腫與減壓、T 型栓塞、Broca／Wernicke、ACA、AChA、紋狀體內囊梗塞、內囊與橋腦腔隙、視丘、Percheron、PCA、基底動脈頂端、閉鎖症候群、Wallenberg、PICA 水腦、AICA、SCA → 軟顎顫抖、Dejerine、頸動脈狹窄、分水嶺、竊血、一過性黑矇、TIA、進展性基底動脈血栓…… |
| **其他** | 繁中／英文、可分享的網址（狀態存在 `#` 後面）、手機版面、BE-FAST 衛教。 |

## 這個模型「怎麼算」的 / How the simulation works

1. **幾何**：`tools/build_assets.py` 從 TemplateFlow 下載 MNI152NLin2009cAsym 的分割與機率圖，用 marching cubes 產生網格；每個表面點被標上「功能腦區 × 動脈供應區」（床，bed），供應區來自 Liu 等人的動脈分區圖譜，重疊處即分水嶺。
2. **血流**：每條血管是一個 Poiseuille 阻力；每個床由一條或多條供應動脈分攤；側枝依等級（好／中／差）有不同導通度；小動脈在灌流壓下降時擴張（自動調節，上限 1.8 倍）。解線性方程得到各點壓力與流量。
3. **組織命運**：相對血流 < 30% 為核心梗塞（幾分鐘內），30–55% 為缺血半影區（越低越快死、未治療時一部分會存活），55–85% 為輕度低灌流。再灌流會「凍結」當下的梗塞範圍。
4. **水腫**：依各床的核心、半影區與再灌流狀態，分別累積細胞毒性、離子性、血管性水腫與後期萎縮；腫脹體積換算成中線偏移（減壓手術後大部分往顱外擴張）。
5. **連鎖反應**：用文獻中的簡化門檻（例如 14 小時內梗塞 > 145 mL → 惡性水腫；小腦梗塞 > 25 mL → 水腦風險），把後果投射到**沒有被阻塞**的腦區。
6. **症狀與症候群**：每個腦區列出受損時的症狀（同側／對側），聚合後再用規則比對具名症候群。

程式碼：`src/engine/`（hemodynamics → tissue → edema／cascade → clinical），解剖資料：`src/anatomy/`。

## 老實說：限制 / Honest limitations

- **不是病人專屬的模型。** 用的是平均的標準腦與平均的血管位置；真實的人血管變異很大（Willis 環完整的人不到一半）。
- **血流是 0 維的集總模型**，沒有脈動、沒有血液黏滯度變化、沒有真實的 3D 流體力學。數字（mL/分）只在「數量級」與「方向」上有意義。
- **閾值與時間常數是從文獻簡化、再手動校正**，目的是呈現正確的「趨勢」（側枝越差梗塞越大、越早再通救越多、後循環 NIHSS 偏低……），不是預測某個病人會有幾 mL 梗塞。
- **水腫的幅度與時程是教學用的近似**：每個床用同一組曲線，實際上個體差異極大；3D 變形只沿表面法線推出，不是真正的組織力學，放大倍率只為了看得見。
- 小血管（皮質穿通支、腦幹小分支）的位置是**示意**，只有主幹有統計圖譜校正。
- 症狀、症候群、NIHSS 都是「由受損腦區推估」，實際臨床表現差異很大；出血性中風、靜脈竇血栓、血管炎等**都沒有**模擬。
- **後循環的時間窗是校正出來的**：腦幹軟腦膜側枝與較慢的腦幹半影區，是為了符合基底動脈取栓試驗（ATTENTION、BAOCHE）的趨勢而設定，吻合路徑與參數是模型假設，不是測量值。
- **恢復與代償是示意**：只依「哪種功能、單側或雙側」給群體平均的曲線，沒有復健強度、年齡、共病等因素，不能拿來推估任何人的恢復。
- **再通細節是示意**：部分再灌流以「該比例的供血區恢復血流」近似，沒有真正的微血管模型；永久的再阻塞最終梗塞會回到不治療的結果（只是延後），無再流的比例證據有限；已發表數據只供參考，不會決定模擬結果。
- **「最終」頁是同一個模型的兩次計算**：「未治療」是同樣的阻塞但沒有再通，不是真實世界的對照組；3／6 個月取時間軸上那兩站（從第一個事件起算），很晚才發生的阻塞會標示「6 個月時尚未穩定」，但晚期事件與最終腦區不會另外延後重算。缺損分「仍明顯／部分代償／大致代償」的門檻（25%、60%）是為了閱讀方便而定的。
- **不適合拿來回頭評斷真實病例**：例如「如果當時取栓會不會不同」——模型是標準腦加平均參數，答案只反映模型假設。
- 醫學內容由開發者依教科書與文獻整理，**尚未經過臨床醫師正式審閱**。發現錯誤請開 issue。

## 開發 / Development

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 引擎、介面元件（jsdom）與輸出不變量的測試：每條規則都能被觸發、治療不會讓梗塞變大、症狀不會閃爍……
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
region and its arterial territory (Liu et al. atlas). 178 arterial segments — from the aortic arch to brainstem
perforators, plus leptomeningeal collaterals — form a Poiseuille resistance network with autoregulation and
collateral grades. Tissue fate uses relative-CBF thresholds (core < 30 %, penumbra < 55 %) with flow-dependent
time constants and reperfusion; an oedema model (cytotoxic → ionic → vasogenic → resolution → atrophy) swells or
shrinks each bed over time, deforms the 3D brain and drives the midline shift. A rule-based cascade projects consequences onto *other* regions over time
(malignant oedema → subfalcine/uncal herniation, cerebellar swelling → hydrocephalus, haemorrhagic
transformation risk, crossed cerebellar diaschisis, Wallerian and olivary degeneration, systemic complications),
and a clinical layer derives symptoms, 39 named-syndrome rules and an NIHSS estimate.

It is **not** patient-specific and has **not** been clinically validated: numbers illustrate trends, not predictions.
Code is MIT; derived data files are CC BY-SA 4.0 — see `THIRD_PARTY_NOTICES.md`.
