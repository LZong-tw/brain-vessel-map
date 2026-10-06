# 路線圖 · Roadmap

## 已完成 · Done

- 由 MNI ICBM152 2009c 模板產生的真實大腦／小腦／腦幹／深部核團網格，每個表面點標上「功能腦區 × 動脈供應區」
  · Real cerebrum / cerebellum / brainstem / deep-nuclei meshes from the MNI ICBM152 2009c template, every surface point labelled with a functional region and an arterial territory
- 180 段動脈（含腦幹穿通支、小腦動脈、38 段側枝），主幹位置校正到 MRA 統計圖譜
  · 180 arterial segments (brainstem perforators, cerebellar arteries, 38 collaterals), main trunks fitted to an MRA statistical atlas
- Poiseuille 血流網路：Willis 環代償、竊血、自動調節、分水嶺、21 種解剖變異、側枝分級、腦幹軟腦膜側枝
  · Poiseuille flow network: circle-of-Willis compensation, steal, autoregulation, watershed, 21 anatomical variants, collateral grades, brainstem leptomeningeal collaterals
- 組織命運隨時間演變（核心／半影區／低灌流），壞死速度依缺血深度與時間、依大血管阻塞實測的梗塞擴大速度校正；內囊與放射冠比旁邊的紋狀體晚幾小時才壞死（依取栓後內囊梗塞的影像研究校正）；再通救回的組織要幾小時到幾天才恢復功能；後循環時間窗依基底動脈取栓試驗校正
  · Tissue fate over time (core / penumbra / oligaemia), lost by how deep and how long the ischaemia is, calibrated to the measured growth of the core in large-vessel occlusion; the internal capsule and corona radiata lost hours after the striatum beside them (calibrated to imaging of the capsule after thrombectomy); rescued tissue regaining its function over hours to days; posterior-circulation time window calibrated to the basilar thrombectomy trials
- 分段病程：TIA、狹窄後才完全阻塞、自行再通，可在任一時間點治療
  · Staged course: TIAs, stenosis progressing to occlusion, spontaneous reopening, treatment at any point
- 再通細節：治療方式、eTICI 再灌流程度、再阻塞、遠端栓塞、無再流，並附已發表數據
  · Recanalisation details: method, eTICI grade, reocclusion, distal embolus, no-reflow, with published figures
- 水腫與腫脹（細胞毒性 → 離子性 → 血管性 → 消退 → 萎縮）、3D 變形、中線偏移
  · Oedema and swelling (cytotoxic → ionic → vasogenic → resolution → atrophy), 3D deformation, midline shift
- 連鎖反應：腦疝脫、水腦、出血轉化、CCD、Wallerian 與下橄欖核退化、全身併發症
  · Cascade: herniation, hydrocephalus, haemorrhagic transformation, CCD, Wallerian and olivary degeneration, systemic complications
- 症狀、54 條具名症候群規則、NIHSS 估計、功能恢復與代償（示意；皮質脊髓徑匯集處被切斷的肢體恢復較少；失語與忽略的代償隨同一半球的中大腦動脈皮質剩下多少而定；腦幹缺損依受損比例分級，不在門檻上一起出現或消失）
  · Symptoms, 54 named-syndrome rules, NIHSS estimate, recovery and compensation (illustrative; a limb whose corticospinal tract is cut where it converges recovers less; an aphasia or a neglect is taken over by what is left of that hemisphere's MCA cortex; brainstem deficits are graded by the share lost rather than all switching at a threshold)
- 「血管再通」事件依避免的缺損、避免的致命病程或保住的組織量評等，NIHSS 一樣時不寫成差異；不治療時致命的那一欄註明「假如存活」
  · The recanalisation event graded by the deficit, the fatal course or the volume it avoids, never writing the same NIHSS as a difference; the column of a course that is usually fatal marked "if the patient survives"
- 意識與兩側的病程：基底動脈「常會死亡」只算基底動脈病灶本身造成的昏迷，從那條動脈阻塞後才算；兩側半球合計的惡性水腫只算兩側的中大腦動脈區梗塞；兩側大腦半球都被破壞的存活者列為意識障礙，「最終」頁有兩側自己的說明；被疝脫梗塞的大腦腳留下動眼神經麻痺；病人聽不懂話時，靠語言檢查的項目另外標出；NIHSS 的 1b 與 1c 彼此一致
  · Consciousness and courses of both hemispheres: the basilar "often fatal" risk counts only a coma the basilar lesion itself causes, from when that artery closes; the joint malignant course of two hemispheres counts their MCA infarcts; a survivor of the destruction of both hemispheres is listed in a disorder of consciousness, with a note of its own on the *Outcome* tab; a cerebral peduncle the herniation infarcted keeps the third-nerve palsy; what is tested through language is named apart in a patient who does not understand speech; NIHSS items 1b and 1c agree
- 病例介面：發病前條件／阻塞事件／治療三張卡片，範本可載入或疊加多條血管；右側「此刻／最終／詳細」，最終頁有治療與未治療對照
  · Case interface: before-onset / occlusion-event / treatment cards, templates that load or add up several arteries; *Now / Outcome / Details* on the right, with treated vs untreated in *Outcome*
- 35 個教學範本、單一穿通支阻塞（腔隙性中風，可選落點；內囊警訊症候群）、栓子漂流模擬
  · 35 teaching templates, single-perforator (lacunar) occlusions (with a choice of site; the capsular warning syndrome), embolus drift simulation
- 3D、Willis 環、腦幹切面三種視圖；繁中／英文；可分享網址；手機版面
  · 3D, circle-of-Willis and brainstem-section views; Traditional Chinese / English; shareable URLs; phone layout
- GitHub Pages 自動部署、CI（lint、型別、單元與元件測試、建置）、完整資料來源與授權聲明
  · GitHub Pages deployment, CI (lint, types, unit and component tests, build), full source and licence notices

### 各次合併 · Merged pull requests

| PR | 內容 · Contents |
|---|---|
| #1 | 專案骨架 · Project boilerplate |
| #2 | 真實解剖網格、血流與組織引擎、介面、部署與授權聲明、醫學內容審查修正 · Real anatomy meshes, flow and tissue engine, interface, deployment and notices, medical-content corrections |
| #3 | 再通時血管真的在血流模型中打通 · Recanalisation reopens the vessel in the flow model |
| #4 | 接上已存在但從未使用的規則、輸出與輸入 · Rules, outputs and inputs that existed but were never used |
| #5–#6 | 皮質透明度修正、腦室可點選且保持可見 · See-through cortex fix, clickable and persistent ventricles |
| #7 | 水腫模型、隨時間變化的面板、功能受影響時間軸 · Oedema model, time-aware panels, function heat-map |
| #8 | 分段病程、後循環時間窗、恢復模型、熱圖格子詳細資料、測試者回報修正 · Staged course, posterior time window, recovery model, heat-map cell details, tester fixes |
| #9 | 再通細節與已發表數據、「已救回」只算治療救回的組織 · Recanalisation details and evidence, "saved" counts only what treatment saved |
| #10 | 疊加阻塞、病例／此刻／最終介面、閉鎖症候群事件結束時間 · Combining occlusions, Case / Now / Outcome interface, locked-in event end |

## 接下來 · Next (ideas, not promises)

- [ ] **臨床審閱**：請神經科／神經放射科醫師審閱腦區—症狀對應、症候群規則與時間軸（最重要）
  · **Clinical review** of the region–symptom mapping, syndrome rules and time courses by a neurologist / neuroradiologist (most important)
- [ ] 以公開資料（例如取栓試驗的最終梗塞體積分佈）做更系統的參數校正，並把校正結果寫進測試；包括跨越兩段的基底動脈阻塞（目前側枝中等或差時再通幾乎救不回橋腦）、側枝中等與差時的血流（讓早期梗塞擴大速度不必靠時間常數來符合實測），以及讓 Willis 環與後顱窩的動脈也左右對稱（目前只有大腦半球表面的動脈對稱，後循環的校正要跟著重做）；還有小腦與延髓的壞死時程（目前沿用側枝供應組織的一般時程）、腔隙自己的時程，以及頂後、顳枕、顳前與顳後動脈的軟腦膜側枝
  · Systematic calibration against public data (e.g. final infarct volumes in thrombectomy trials), encoded as tests, including basilar occlusions over two segments (with moderate or poor collaterals reopening them saves hardly any of the pons in the model now), the flow of moderate and poor collaterals (so that the early growth of the infarct matches the measured rates without the time constants carrying it), and making the circle of Willis and the posterior-fossa arteries mirror images too (only the arteries over the hemispheres are now; the posterior calibration would have to be redone with them); also the time course of the cerebellum and the medulla (now the general course of tissue that collaterals reach) and of lacunes, and the leptomeningeal anastomoses of the posterior parietal, temporo-occipital and temporal arteries
- [ ] 失語與忽略的代償隨病灶範圍下降的比例、腦幹分級的下限（15%）與「保住 50 mL 算有益」的門檻，以病灶負荷研究（例如 PLORAS、Wilson 2023 的分組資料）校正
  · Calibrate the fall of aphasia and neglect recovery with lesion extent, the brainstem's lower grading limit (15 %) and the 50 mL benefit threshold against lesion-load data (e.g. PLORAS, the groups of Wilson 2023)
- [ ] 兩側半球都腫脹時的中央型（經天幕）疝脫：目前把兩側合計的腫脹當成單側的中線偏移，並以兩側各自的鉤迴疝脫呈現
  · A central (transtentorial) herniation of its own when both hemispheres swell: their swelling is now counted together as one side's midline shift and told as an uncal herniation on each side
- [ ] 病例卡片可直接改單一階段血管的阻塞程度（目前要到血管詳細資料改）
  · Change a single-phase vessel's degree of occlusion in the case card (currently only in the vessel details)
- [ ] 靜脈系統與靜脈竇血栓；出血性中風（目前完全沒有模擬）
  · Venous system and venous sinus thrombosis; haemorrhagic stroke (not simulated at all yet)
- [ ] 以 MRA 分割的真實血管樹取代部分手繪的小分支路徑
  · Replace hand-drawn small-branch paths with vessel trees segmented from MRA
- [ ] 2D 切片檢視（在 T1 影像上疊加梗塞區，像看 MRI 一樣）
  · 2D slice view (infarct overlaid on T1 images, like reading an MRI)
- [ ] 無障礙：鍵盤操作 3D 場景、螢幕報讀的結果摘要
  · Accessibility: keyboard control of the 3D scene, a screen-reader summary of the results
- [ ] 更多語言 · More languages

歡迎開 issue 指出醫學內容的錯誤——請附上文獻來源。
Issues pointing out medical errors are welcome — please include a reference.
