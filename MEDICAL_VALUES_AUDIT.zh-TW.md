[繁體中文](MEDICAL_VALUES_AUDIT.zh-TW.md) · [简体中文](MEDICAL_VALUES_AUDIT.zh-CN.md) · [English](MEDICAL_VALUES_AUDIT.md) · [Deutsch](MEDICAL_VALUES_AUDIT.de.md) · [日本語](MEDICAL_VALUES_AUDIT.ja.md)

<!-- source-doc: MEDICAL_VALUES_AUDIT.md; sha256: 3c76b816b6798f01cca289388fd0a2e5027e9e27f83324b21846253cad32cbd5 -->

<a id="engine-medical-values-audit"></a>
# 引擎醫學數值稽核

於 2026-10-08 對照提交 `9fcab3287f9881f4f82309410631ce7feaef2a80`、其母提交差異及引用原始來源（網路搜尋、摘要與可取得全文）獨立重新查核。範圍是正式 `src/engine/*.ts`，包括註解與兩種敘述語言中的數值。測試是固定資料／斷言，不是額外臨床證據；追溯引擎匯入的解剖常數。意義相同的重複值合併。數學恆等式、迴圈索引、浮點 epsilon 與採樣解析度排除，除非可能被誤認為臨床閾值。

**OK（有支持）**表示來源支持指定族群與量測，不表示模擬器已經臨床驗證。**Questionable（存疑）**表示未驗證校正、外推、證據衝突或未完整查證引文。**Wrong（錯誤）**表示特定數字、分母、邊界或解釋與證據矛盾。引用另一種量的文獻，不能使缺乏支持的參數變正確。

位置是原稽核的近似來源錨點，編輯可使行號移動。「修正」表保留提交前的值並記錄已審查與後續修正；其餘表描述模型與獨立重查判定。重查引用結果不等於獨立重現原始臨床資料。

<a id="corrections"></a>
## 修正

| 數值 | 位置 | 當時值 | 文獻 | 判定 | 處置 |
|---|---|---|---|---|---|
| eTICI 1 再灌流比例 | `src/engine/treatment.ts:47`; `cascade.ts:727`; `src/i18n/uiTreatment.ts:121,213` | 0.05；遠端血流「幾乎沒有」 | 血栓減少但**沒有遠端再灌流**，[Liebeskind 2019][etici] | Wrong | 設為 0；修正 zh-TW/en 說明與選單標籤，引用定義，測試零組織救回及各級範圍。 |
| 大核心試驗上限 | `cascade.ts:1488,1596,1600` | 超過 100 mL，「只有 LASTE 不設上限」 | SELECT2 也沒有核心體積上限，[SELECT2][select2] | Wrong | 修正兩語及選擇註解。100 mL 保留為警示顯示觸發值，不是排除條件。 |
| 急性小型皮質下梗塞直徑 | `cascade.ts:2012–2013` | 約小於 1.5 cm | 近期小型皮質下梗塞通常軸向 ≤20 mm；STRIVE-2 也承認 <3 mm 的空洞腔隙，[STRIVE-2][strive] | 慣例 Wrong | 兩語改為通常軸向直徑 ≤2 cm，新增來源與回歸。 |
| 意識預後 | `cascade.ts:3914–3916,3974–3975,3996–3997` | 3 個月後恢復極罕見；壽命 2–5 年；不恢復意識 | 承認晚期恢復；慢性而非永久 VS/UWS，[AAN 2018][aan] | 作為當前確定預後為 Wrong | 移除固定壽命與確定性，承認可能晚期恢復，保留明示的示意模型病程。 |
| 減壓年齡邊界 | `cascade.ts:2467–2468,2658–2659` | 英文「未滿 60 歲」，其他處 ≤60 | 合併試驗年齡 18–60，[Vahedi][surgery] | 邊界 Wrong／措辭不一致 | 改為 60 歲或以下，zh-TW 明確包含端點。 |
| 脊髓影像分母 | `cascade.ts:1302–1303` | 鉛筆樣 40% 以全部 133 人為分母；動脈異常 20% 未說子集 | 鉛筆50/126、貓頭鷹眼82/126、初始正常30/126；動脈徵象16/82，[Zalewski][cord2] | 分母 Wrong | 保留百分比，指出影像子集與接受檢查的 16/82。 |
| MRI 偽陰性族群 | `cascade.ts:1254–1255` | 48 h 內 12%，看似泛指 | 高風險急性前庭症候群世代的缺血中風 8/69；所有偽陰性掃描8–48h，[Kattah][hints] | 族群與時間分母 Wrong | 兩語明示8/69及偽陰性掃描時間，不是48h內每次掃描的12%。 |
| 聽力恢復追蹤 | `cascade.ts:1231–1232` | 重度喪失 40%「幾個月內」改善 | 長期追蹤，至少 1 年，[Lee/Baloh][hearing] | 時間精度 Questionable | 兩語改長期追蹤，保留 40%。 |
| 早期癲癇／重積分母 | `cascade.ts:3353–3354` | 約 ¼ 皮質梗塞癲癇以重積表現 | 所有中風類型早期癲癇 10/37（27%），[Labovitz][seizure1] | 分母 Wrong | 明示包括出血的全部中風類型；廣泛摘要4–6%改4–7%，涵蓋引用6.5%。 |
| 失智盛行率與發生率 | `cascade.ts:3654–3655` | 首次中風後約7%發生，復發後>⅓ | 排除既有失智的社區首次中風7.4%；包含既有失智的醫院復發世代41.3%，[Pendlebury][dementia] | 分母／解釋 Wrong | 列精確估計與族群，不把它們互換解釋為新發風險。 |
| 憂鬱時間範圍 | `cascade.ts:3654–3655` | 31%「任何時點」 | 合併盛行率，分層隨追蹤不同，[Hackett][depression] | 泛化 Questionable | 標明合併估計與時間變異，保留31%。 |
| AF 監測檢出率 | `cascade.ts:3285–3290` | 延長監測約四分之一檢出 | 中風或 TIA 入院 ECG、住院與門診階段估計合併檢出23.7%，[Sposato](https://pubmed.ncbi.nlm.nih.gov/25748102/) | 若讀成僅門診檢出為 Wrong | 兩語說明合併估計、中風或TIA族群與序列階段。 |
| 惡化分母 | `cascade.ts:2358–2359` |53人中24h內36%／48h內68% | 因惡化而選入的世代，[Qureshi](https://pubmed.ncbi.nlm.nih.gov/12545028/) | 分母 Questionable | 明示篩選的惡化病人。 |
| 發燒邊界 | `cascade.ts:3042–3043` | 英文超過39°C，zh-TW39°C以上 | 納入≥39°C，[Sung](https://pubmed.ncbi.nlm.nih.gov/19521083/) | 嚴格與含端點邊界 Wrong | 英文現為39°C或以上。 |

<a id="perfusion-tissue-fate-and-volumes"></a>
## 灌流、組織命運與體積

| 數值 | 未特別註明則位於 `src/engine` | 當前值 | 文獻比較 | 判定 | 處置 |
|---|---|---|---|---|---|
| 操作性核心閾值 | `tissueParams.ts:53,97`; `tissue.ts:5` | rCBF <0.30 | Campbell 最佳<31%；SELECT2採<30%，[Campbell][cbf]、[SELECT2 protocol][selectprotocol] | CTP影像引文OK；擴至全部模型組織存疑 | 保留；測試固定0.30並檢查略低／高於它的最終梗塞行為。區域模型血流不是實測CTP體素，也不證明不可逆死亡。 |
| 半影／低灌流閾值 | `tissueParams.ts:54–55,98–99`; `tissue.ts:10–19` | rCBF <.55 / <.85；絕對比較20/10 mL/100g/min，猴麻痺約23 | 現代灌流不匹配採Tmax >6 s，[DEFUSE-3][defuse]；絕對閾值依組織、時間、方法而異 | Questionable | 保留明示校正。模擬器不算Tmax；.55不能驗證為Tmax >6 s。 |
| 快速核心／穿通支設定 | `tissueParams.ts:46–61,125` | τ .09 h，跨度1，半影τ1.5 h×20，最高存活.85，延遲.1 h；15 min前喪失>80% | 大鼠紋狀體30 min梗塞不是經驗證的人類死亡時程，[Memezawa](https://pubmed.ncbi.nlm.nih.gov/1561688/) | Questionable | 無合理的單獨替代值，保留限制聲明。 |
| 預設側枝供應設定 | `tissueParams.ts:97–105` | 核心τ3→8 h；半影8→30 h；存活.85；延遲⅓ h | 實測擴大高度異質，[Wheeler][growth1]、[Ospel][growth2] | Questionable | 保留為模型，不是生理常數。 |
| 報告／衍生擴大引文 | `tissueParams.ts:76–84` |3.1 [.7–10.7]、4.74 [1.25–14.84]mL/h；快速≥10；極端約74mL/h | [Wheeler][growth1]中位3.1；[Ospel][growth2]4.74由最終24h梗塞／發作至再灌流時間衍生；≥10是[SELECT study][fastgrowth]分類；極端神經元換算為估計，[Desai][neurons2] | 歸因估計OK；若全稱為序列實測核心擴大則Wrong | 保留數值及方法限制；不是普遍快速擴大截止值或直接細胞計數。 |
| 衍生情境擴大 | `tissueParams.ts:85–90` | M1差側枝1h約60mL／前6h35–55mL/h；ICA1h約70mL；中等20–30／良好10–20 | 比較良好2.93 [1.10–7.94]、中等8.65 [4.53–18.13]、不良25.41 [12.83–45.07]，[collateral study][growth3] | Questionable，偏快速進展 | 不改，模型輸出不是族群典型速度。 |
| 深部白質 | `tissueParams.ts:139–161` | 延遲2.5h，τ1.75h；4/5/6h喪失58/76/86% | 世代92人，45（48.9%）內囊梗塞；LSA阻塞子集每小時LSA再灌流延遲aOR3.47，[Kaesmacher][capsule] | 世代引文OK，換算存疑 | 跨病人機率不是單一內囊比例，不保證2.5h安全期。 |
| 基底動脈設定 | `tissueParams.ts:175–219` | 沿用快速核心；半影τ3→60h；最高存活.4 | 12h／6–24h內效益不能識別組織動力係數，[ATTENTION][attention]／[BAOCHE][baoche] | Questionable | 保留明示區域校正限制。 |
| 視網膜 | `tissueParams.ts:225–241`; `cascade.ts:1170` | 延遲12min，τ5.4min；猴97/240min，人類綜述12–15min | [Hayreh experiment][retina]與[Tobalem](https://doi.org/10.1186/s12886-018-0768-4)爭議外推 | 作為人類確定規則Questionable | 保留證據衝突與不確定性，不用猴97min取代12min。 |
| 最終梗塞機率 | `tissue.ts:61` | 1−survivalMax×x^1.3 | 無實測普遍指數；[DEFUSE-3][defuse]建立選擇條件，不是此定律 | Questionable | 保留校正。 |
| 穩定半影期限 | `tissue.ts:65,81` | lag+3τ，上限48h | 48h內觀察到缺氧但存活組織，[Markus](https://pubmed.ncbi.nlm.nih.gov/15130953/)；不證明此時結束 | Questionable | 保留為計算病程限制。 |
| 救回組織恢復 | `tissue.ts:225–238,270–276`; `cascade.ts:778–782` | .5h初始反應；τ2.8×缺血小時；快速比例.75、慢τ×8；30min內約¼ NIHSS<6；24h NIHSS中介估計治療效益54%／出院75% | 臨床反應世代不建立組織比例動力學，[Kniep](https://pubmed.ncbi.nlm.nih.gov/35549377/)、[Desai](https://pmc.ncbi.nlm.nih.gov/articles/PMC12778787/) | 世代數字OK；中介／NIHSS轉為組織動力學存疑 | 不改動力參數。 |
| 神經元喪失 | `tissue.ts:325`; `simulate.ts:2811`; `cascade.ts:1550` | 每mL22million；平均每min1.9million；範圍每min<35000–>27million | [Saver][neurons1]是前腦／幕上；[Desai][neurons2]顯示變異 | 四捨五入前腦估計OK，後循環套用存疑 | 不替換密度，小腦／腦幹需獨立模型；全腦總量不是已驗證神經元喪失。 |
| 解剖體積正規化 | `src/anatomy/index.ts:30,53,63,70`; `simulate.ts:2771–2811` |1250mL目標；加固定構造後實際腦1250.8mL | [Liu atlas][atlas]支持供應區拓樸，不建立普遍1250mL腦 | 固定成人幾何Questionable | 保留，見各血管表。 |
| 基準血流 | `src/anatomy/index.ts:70`; 引擎匯入 | 體積×區域CBF/100；總557.0384mL/min | 合理成人教學基準，不推導個人生理界限 | 作為普遍值Questionable | 保留。 |
| 腔隙體積 | `simulate.ts:201–202`; `src/anatomy/lacunes.ts:45` | .8mL，引用世代中位.73mL | [Barow2020][lacunevolume]：224位WAKE-UP腔隙病人，中位.73mL[IQR.37–1.15]；[STRIVE-2][strive]不指定一致體積 | 固定體積Questionable | 保留為情境。 |
| 「無梗塞」／起始閾值 | `simulate.ts:333,620,1296`; `cascade.ts:1969` | .05mL | 組織定義TIA沒有公認最小梗塞體積，[Easton](https://doi.org/10.1161/STROKEAHA.108.192218) | 若作臨床值Questionable | 數值／報告容差，不是診斷最小值；不改。 |
| 恢復／最終顯示時鐘 | `simulate.ts:325,445,1445,2849` |90/180天，存活半影平滑12h，預覽24h |90d為常見試驗終點[DEFUSE-3][defuse]，其餘為模型期限 | 終點OK，生物解釋存疑 | 保留。 |

`tissueParams.ts:77–83` 額外灌流比較：[Seners](https://pmc.ncbi.nlm.nih.gov/articles/PMC10663035/)驗證最高HIR四分位約77%快速進展，≥10mL/h定義為基準梗塞／發作至影像時間；不是模型側枝分級機率。[d'Esterre](https://pubmed.ncbi.nlm.nih.gov/26514186/)驗證早期再灌流（CTP後<90min、發作<180min）的<8.9/<7.4mL/100g/min閾值；這是有條件ROC截止值，不是普遍7–9存活邊界。[Boned](https://pubmed.ncbi.nlm.nih.gov/27566491/)建立CTP可能高估核心，不是已證明細胞死亡反轉。引文支持謹慎，不支持模型動力學。

<a id="hemodynamics-collaterals-and-emboli"></a>
## 血流動力學、側枝與栓子

下列網路數值係數**作為醫學常數存疑**：引用文獻支持定性相依關係，不支持精確係數。沒有重新校正網路，就沒有合理數值替代。

| 數值 | 位置 | 當前值 | 文獻／判定 | 處置 |
|---|---|---|---|---|
| 液壓導通尺度／分支乘數 | `hemodynamics.ts:98–119` |150，相較物理約900；分支×3；狹窄段4mm | 集中參數Poiseuille近似，不是病人量測 | 保留模型係數。 |
| 參考壓力／儲備 | `hemodynamics.ts:101–112,780,798` |MAP93、流出10、連結壓降12/30mmHg；自動調節.6–1.8；指數.7；相對血流上限2 | 指引規範實測血壓，不是這些儲備因子，[AHA/ASA][aha] | 保留代表基準。 |
| 側枝等級 | `hemodynamics.ts:113–115` |良好1.5／中等.8／不良.15；尺度1/36 | [Collateral/core growth][growth3]支持順序，不是ASITN/SIR分級 | 保留，不等同臨床分數。 |
| 腦幹供應側比例 | `hemodynamics.ts:153–162` |.6/.4、.7/.3、.5/.5、.7/.3、.5/.5 | 解剖混合假設，不是實測比例 | 保留。 |
| 軟腦膜導通度 | `hemodynamics.ts:169,191,208–225` |.02；不良.5、覆寫.75；入口.015；壓力指數1.4 | [ATTENTION][attention]／[BAOCHE][baoche]不驗證這些數值 | 保留校正。 |
| 衍生基底動脈殘餘血流 | `hemodynamics.ts:165,174,196–204` |50/40/33%；舊不良15%；覆寫28→33%；多段6–23% | 網路輸出，多段限制已記錄 | 保留，不是臨床實測範圍。 |
| 顱外側枝 | `hemodynamics.ts:244–267` |導通度1.8/1.2；上肢梯度25mmHg；引用76%順向BA；壓力20/40–50mmHg | [Harper](https://pubmed.ncbi.nlm.nih.gov/18692344/)、[Labropoulos](https://pubmed.ncbi.nlm.nih.gov/20531004/)；76%順向流與>40–50 mmHg關聯已驗證，導通度未驗證 | 保留已查證觀察引文與未驗證模型係數。 |
| 反轉／路徑偵測 | `hemodynamics.ts:814–815,852`; `simulate.ts:426` |max(.5mL/min,5%基準)；路徑增加5mL/min | 工程分類器，不是診斷條件 | 保留。 |
| 栓子直徑預設 | `embolus.ts:35–38` |4.2/2.9/1.6/.9mm | 示意大小，不是臨床類別 | 保留。 |
| 栓子路由／嵌頓 | `embolus.ts:67–70,88–103,123` |ACA.3、交通支.5、穿通支.02；直徑×1.05；入口<.6×直徑→權重.05；血流>.2 | 剛性球體／血流啟發式，不是已驗證栓塞機率 | 保留。 |
| 排程／代數 | `schedule.ts:158`; `solver.ts` |.9排序探針；代數容差 | 不是90%狹窄閾值，求解器無醫學常數 | 不需臨床修正。 |

<a id="edema-mass-effect-surgery-and-recovery"></a>
## 水腫、占位效應、手術與恢復

| 數值 | 位置 | 當前值 | 文獻 | 判定／處置 |
|---|---|---|---|---|
| ADC 偽正常化 | `edema.ts:11,101–102` |約1–2wk；中點240h、寬30h |27位病人第1週ADC低、第2週偽正常，[Lansberg][adc] | 定性時程OK，中點／寬度存疑。來源不建立5–14d半峰值擴散受限範圍；測試明示7–14d半曲線為模型回歸，並區分持續DWI透亮效應。 |
| DWI 出現／加深 | `edema.ts:97–99,187` |τ.1h/12h；亮度.65+.35×rise | 序列ADC/DWI病程，[Lansberg][adc]；研究不建立6分鐘起始閾值 | 精確曲線與起始引用Questionable，保留為模型。 |
| DWI 透亮效應 | `edema.ts:104–106` |強度.5，τ720h | ADC正常後DWI仍可持續，[Lansberg][adc] | 強度／τ存疑，保留。 |
| 膠質增生／FLAIR | `edema.ts:108–110` |.6，開始120h，完整400h | 無普遍分解，[Lansberg][adc] | Questionable，保留。 |
| 半影／救回組織DWI | `edema.ts:112–114` |.3，衰減3h | 擴散可逆性可變 | Questionable，保留。 |
| CT 水分攝取 | `edema.ts:23` |11.5%區分≤4.5h與更晚 | [Minnerup](https://doi.org/10.1002/ana.24818) | 研究引文OK，不是體積擴大百分比。 |
| 離子性水腫 | `edema.ts:117–121` |體積.04，τ4h；半影×.4，救回τ12h | 密度衍生水分攝取不同，[Minnerup](https://doi.org/10.1002/ana.24818) | 擬合係數存疑，不替換為.115。 |
| 血管性水腫 | `edema.ts:124–132` |體積.26；中點36h、寬10h；續發×.15；72h開始消退、τ260h | 第2–5天廣泛峰值合理，精確常數未驗證 | Questionable，保留。 |
| 再灌流水腫 | `edema.ts:135–138,341,388` |體積+.05、FLAIR+.5；上升3h／衰減72h；晚期smoothstep.5–6h；血流變化>.05 | 無此大小的普遍實測效應 | Questionable，保留。 |
| 慢性萎縮 | `edema.ts:34,141–143` |50%；開始300h、τ700h；3–6mo體積減半 | 無普遍50%縮小 | Questionable，保留為情境，不是預後。 |
| 偏移體積映射 | `edema.ts:146–148` |.15mm/mL、儲備5mL、上限20mm | [Ropper][shift]描述觀測位移，不是此換算 | Questionable，保留。 |
| 減壓效果 | `edema.ts:150,157–158` |36h；偏移×.3、腦室壓迫×.4 | 手術≤48h，[Vahedi][surgery] | 時間作情境OK，效果大小存疑；僅測時間。 |
| 腦室反應 | `edema.ts:161–168,520,522` |壓迫.85/45mL；ex-vacuo1/120mL；水腦.8、上升12h、殘餘.2、初始.25；邊界−.9/+1.5 | 無正規化幾何生理邊界來源 | Questionable，保留。 |
| 重疊病灶／大小 | `edema.ts:234,237` |312h；大小因子.3+.7×smoothstep(.05,.5,share) | 假設劑量反應 | Questionable，保留。 |
| 階段標籤 | `edema.ts:479,481`; `edemaTypes.ts:14,16` |消退<.95、離子性≥.3；BBB6–12h；消退2–3wk | 近似教學標籤，不是生物轉換 | Questionable，保留。 |
| 模型例子 | `edema.ts:41–43` |R-M1約300mL→30%/90mL腫脹→第3天12–13mm；L-M1良好約150mL | 情境輸出，不是固定血管體積文獻 | 作族群主張Questionable，保留明示校正。 |
| 意識偏移帶 | `cascade.ts:584–586`; `edema.ts:36` |4/6/8mm來自3–4/6–8.5/8–13mm |24例混合單側占位病灶，[Ropper][shift] | 引文OK，普遍中風閾值存疑；新增來源註解，測試僅確認選值位於觀測帶。 |
| 占位效應／惡性 | `cascade.ts:619–622` |最終70mL；早期≤14h145mL；最終250mL | DWI **>145mL**，28人於≤14h影像，開發世代敏感度100%／特異度94%，[Oppenheim][malignant] | 三處≥145皆修正為嚴格>145。預測因子引文OK；確定性與雙側外推、70/250截止值仍存疑。 |
| 疝脫時間 | `cascade.ts:594–609` |鉤回≥72h；鐮下−12h；橋腦+12h；結束336h；側向4mm | 第3天死亡峰值不是最早疝脫，[Qureshi](https://experts.umn.edu/en/publications/timing-of-neurologic-deterioration-in-massive-middle-cerebral-art/) | 硬性時間Questionable，需要結構校正。 |
| 水腫事件時鐘 | `cascade.ts:609–610,2157–2160` |24–336h，峰值2–5d | 惡化可早於24h | 固定顯示窗Questionable，保留。 |
| 小腦占位／惡性 | `cascade.ts:640–646,2704–2716` |警示20mL；惡性38mL；總35.5%；第3天後39.4% |93例占位梗塞，33惡性；13/33（39.4%）發生在3天後；38mL與>50%風險相關，[Baki][cerebellum] |20為校正；38作預測因子OK，確定觸發存疑；新增來源。 |
| 小腦意識 | `cascade.ts:646,659–680` |48h；昏迷峰值90%、木僵67.5%、嗜睡45% | 後顱窩比例借自幕上偏移，未驗證 | Questionable，保留。 |
| 手術結局 | `cascade.ts:2467–2468,2658–2659` |≤48h、年齡≤60；1y存活78對29%；mRS≤4 75對24% | [Pooled DECIMAL/DESTINY/HAMLET][surgery] | 篩選族群OK，引用並修正含端點年齡；不是普遍體積適應症。 |
| 未治療惡性結局 | `cascade.ts:2658–2659` |43/55=78%死亡，第2–5天；存活者Barthel60 | [Hacke](https://pubmed.ncbi.nlm.nih.gov/8929152/) | 歷史世代引文OK，不是個人預後。 |
| 病灶周圍功能障礙 | `recovery.ts:97–103` |6h開始／24h完整；邊緣.35、增益.7 | 無已驗證普遍關係 | Questionable，保留。 |
| 遠隔效應 | `recovery.ts:105–108` |深度.2、上升12h、衰減240h | 區域病程可變 | Questionable，保留。 |
| 代償動力學 | `recovery.ts:113–120` |24h開始；τ720h、慢2880h／比例.15、快168h；90d約90%平台 | 早期改善集中6–10wk，[Kwakkel](https://pubmed.ncbi.nlm.nih.gov/16931787/) | 係數存疑；約88.5%是模型算術，不是臨床估計。 |
| 功能閾值 | `recovery.ts:122,142,160–184,301–309` |壞死25%、緊密神經束下限15%、可察覺.35；嚴重度.35+.65×min(1,level/.8)；CST喪失25–50%、嚴重度1.5–2.5；摘要5% | 無普遍組織比例至缺損定律 | Questionable，保留。 |
| 臨床分級 | `clinical.ts:69,77,79,150,659,713,732,823,841` |顯示25%；昏迷14d改標；廣泛50%；分水嶺⅔；黃斑相對喪失<75%；重度輕癱2.5 | 量化表型模型 | Questionable，保留。 |
| 雙側傷害 | `clinical.ts:108–120`; `cascade.ts:618,3939–3975` |半球／MCA⅔→2wk意識障礙；ECD77%；49解剖 | LHI≥⅔MCA定義，[Huang](https://pubmed.ncbi.nlm.nih.gov/32705419/)；77%是背景引文，不是其30人EEG世代結果；49解剖為混合外傷／非外傷VS，[Adams](https://pubmed.ncbi.nlm.nih.gov/10869046/)；預後[AAN][aan] | 定義引文OK；77%原分母未獨立確立；解剖不能驗證確定的梗塞範圍預後。雙語文現把77%列背景，模型規則仍存疑。 |
| 失語轉變 | `clinical.ts:159–160` |1y內59%改類型，多在2wk | [Source cited in code](https://pubmed.ncbi.nlm.nih.gov/3191724/) | 研究特定引文OK，保留。 |
| 延髓顏面輕癱 | `recovery.ts:240–243` |8/33、輕度、出院前消退 | [Kanbayashi/Sonoo](https://d-nb.info/1241917256/34) | 原全文引文OK，保留。 |
| NIHSS 項目上限 | `clinical.ts:1022–1158` |1a3、1b2、1c2、凝視2、視覺3、顏面3、每臂4、每腿4、共濟失調2、感覺2、語言3、構音障礙2、忽略2；總42 | [Official NINDS NIHSS][nihss] | 量表最高分OK，推論評分為近似。 |
| NIHSS 類別／限制 | `clinical.ts:1162–1168` |0/1–4/5–15/16–20/>20；後循環旗標≤6；引用後循環≤5／前循環≤8 | [Sato](https://pubmed.ncbi.nlm.nih.gov/18434640/) | 預後截止引文OK；≤6旗標與類別邊界是顯示選擇，不是資格條件。 |

`edemaTypes.ts` 與 `recoveryTypes.ts` 其餘內容指定正規化0–1輸出範圍與例子，不新增實測生理常數。匯入的解剖恢復設定與症狀起始表不在僅引擎稽核內。

<a id="treatment-windows-and-other-numerical-narratives"></a>
## 治療時間窗與其他數值敘述

| 數值 | 位置（未註明則 `cascade.ts`） | 當前值／文獻比較 | 判定 | 處置 |
|---|---|---|---|---|
| 標準IVT／篩選EVT | 1541–1544,1584–1587,1659–1660 |4.5h；早期6h；篩選24h，[AHA/ASA2026][aha] | 包含選擇限制時OK | 保留，新增雙語測試。 |
| DEFUSE-3 基準，未實作門檻 |`tissue.ts:10–19`; 治療敘述 |6–16h、核心<70mL、不匹配≥15mL、比值≥1.8、Tmax>6s，[DEFUSE-3][defuse] | 引擎無相等門檻 | 不宣稱rCBF.55實作試驗不匹配。 |
| DAWN 基準，未實作門檻 |治療敘述 |6–24h；年齡≥80 NIHSS≥10核心<21mL；年齡<80 NIHSS≥10核心<31mL或NIHSS≥20核心31–<51mL，[DAWN][dawn] | 引擎無相等門檻 | 不把歷史資格當成現在普遍排除。 |
| 近期中風IVT旗標 | 1564–1570 |24–2160h≈3mo；登錄293，14d內16.3對4.8%，已驗證[Shah](https://pubmed.ncbi.nlm.nih.gov/31903770/) | 登錄引文OK，簡化時鐘存疑 | 保留個別化限制；[AHA/ASA][aha]。 |
| 大核心顯示 | 1486,1590–1600 |標籤≥70mL；SELECT2≥50；ANGEL篩選分層70–100；ASPECTS3–5 | 通用70mL定義存疑，試驗值特定，[SELECT2][select2] | 修正上限主張，保留標籤啟發式。 |
| 大核心出血 | 1595–1599 |ANGEL6.1對2.7%；LASTE9.6對5.7% | [ANGEL](https://doi.org/10.1056/NEJMoa2213379)、[LASTE](https://doi.org/10.1056/NEJMoa2314063) | 比率已驗證，暗示已確立症狀性出血增加為Wrong | 雙語現說數值較高，兩差異均無統計定論。任意ICH增加依試驗而異；操作性血管併發症與治療相關。 |
| 基底動脈試驗 | 1608–1615,3122 |ATTENTION≤12h、BAOCHE6–24h；ATTENTION NIHSS≥10；BAOCHE原≥10，61人後擴至≥6；IVT34/21%；死亡37對55／31對42%；未再通良好結局約2% | 時窗與引文比率已驗證，[ATTENTION][attention]／[BAOCHE][baoche]；勿把≥10誤讀成修訂後全部BAOCHE族群 | 保留，不推導組織τ。 |
| 腔隙IVT | 1660 |WAKE-UP事後31/53(59%)對24/52(46%)，90d mRS0–1；aOR1.67[.77–3.64] | [Barow/WAKE-UP](https://doi.org/10.1001/jamaneurol.2019.0351) | 比率OK；「無失能」誇大mRS0–1，無交互作用不證明療效相等 | 兩語現說無顯著失能（mRS0–1），保留探索子集不確定。 |
| IVT 推論開始 | 758–770 |給藥後1–3h再通，約2h評估 | 評估時間不識別生物再通延遲 | Questionable | 保留模型假設，不作真實給藥時間。 |
| 再灌流類別／無再流 |`treatment.ts:40–56,170–176` |2a.25∈1–49%；2b50.58∈50–66%；2b67.78∈67–89%；2c.95∈90–99%；3=1；noReflow0–.5 | [eTICI][etici]範圍OK，代表值／無再流上限為假設 | 保留有效範圍；已修grade1；測試固定範圍。 |
| 新供應區栓子 |`treatment.ts:96–100`;1080 |新供應區梗塞中ACA27.8%；總5–9% | [Singh](https://pubmed.ncbi.nlm.nih.gov/37082967/)：103/1092 INT、報告9.3%；多數91/103與血管攝影可見阻塞無關 | ACA引文OK，通用5–9%近似／依定義而異 | 不是所有EVT病人ACA27.8%，也不是模型可見遠端栓子的已驗證發生率。 |
| 效益標籤 | 807–832 |NIHSS差2、救回50mL、微量.5mL/10%、LIS24h | 無等同指引 | Questionable | 保留UI閾值。 |
| 自行再通 | 971–974 |24%、IVT46%、OR4.4、53研究 | [Rha/Saver](https://pubmed.ncbi.nlm.nih.gov/17272772/) | 四捨五入24.1/46.2% OK；結局OR4.43採33研究／998人，不是全部53 | 保留歷史歸因。 |
| 內耳前驅 | 1218 |1mo內13/82；延遲CNS徵象9/29 | [Lee2009](https://doi.org/10.1161/STROKEAHA.109.564682)、[Lee/Baloh][hearing] | 研究特定OK | 保留。 |
| 內耳合併缺損 | 1232,1255 |82人中60%；溫差反應無力56/62 | [Lee2009](https://doi.org/10.1161/STROKEAHA.109.564682)、[Kim](https://pubmed.ncbi.nlm.nih.gov/24581671/) | OK | 保留，聽力追蹤／MRI族群已於上方修正。 |
| 脊髓起始／恢復 | 1289,1316 |115人；導尿86%；1h內達最嚴重68%；約3y死亡23%；存活者輪椅42%、導尿54%、痛29%；恢復走路41% | [Robertson][cord1] | 世代OK；走路分母為出院時74輪椅使用者，不是最嚴重時；平均追蹤3年 | 保留世代框架。 |
| 脊髓診斷 | 1289,1303 |133；12h內最嚴重77%；鉛筆40%、貓頭鷹眼65%；DWI19/29；初始MRI正常24%；血管發現20% | [Zalewski][cord2] | 數字OK，分母已修正 | 保留百分比。 |
| 神經失效／擴大敘述 | 1424,1999 |10s功能失效；紋狀體30min；內囊2–3h；猴皮質15–30min；半影數小時至一天；中位3–5mL/h、不良>10 | 依物種／血流而異；[growth studies][growth1] | 確定時間Questionable | 保留既有限制。 |
| CT／DWI事件時鐘 | 2009,2019,3615–3631 |DWI.1h–336h；CT約6h；霧化2–3wk；ADC第1週低／第2週偽正常；空洞1mo | [Lansberg][adc]支持ADC，其餘時間可變 | 硬性邊界Questionable | 不推導通用6h CT閾值。 |
| 惡化 | 2359 |53人；24h內36%、48h內68%、第3天死亡峰值 | [Qureshi](https://experts.umn.edu/en/publications/timing-of-neurologic-deterioration-in-massive-middle-cerebral-art/) | 數字OK；篩選惡化世代，現兩語已說明 | 保留；與普遍最早第3天惡化矛盾。 |
| 出血風險分層 | 2888–2889,2919–2925 |30/70/100mL；晚期6h；IVT sICH2–7%、24–36h／最長7d | 定義可變，[AHA/ASA][aha] | 確定分層Questionable | 只保留教育警示。 |
| 閉鎖症候群預後 | 2979–2980 |139人死亡60%；復健14人吞嚥42%／說話28% | 小型、歷史、篩選世代；[Patterson/Grabois](https://pubmed.ncbi.nlm.nih.gov/3738962/)、[Casanova](https://pubmed.ncbi.nlm.nih.gov/12808539/) | 歷史篩選世代OK | 保留歸因，不是普遍存活預測。 |
| 中樞發燒 | 3042–3043 |39°C；74人皮質4%／BAO3%；腦幹昏迷4/9；1mo死亡70% | [Sung](https://pubmed.ncbi.nlm.nih.gov/19521083/)、[Parvizi](https://pubmed.ncbi.nlm.nih.gov/12805123/) | 研究引文OK | 說明英文39°C邊界含端點。 |
| 延髓呼吸衰竭 | 3095 |2–6%；10d內8/102；急性5/43 | [Pavsic](https://pubmed.ncbi.nlm.nih.gov/32064553)2–6%是背景，不是28人睡眠研究結果；[Saito](https://pubmed.ncbi.nlm.nih.gov/35091384/)8/102致命呼吸衰竭；[Norrving](https://doi.org/10.1212/WNL.41.2_Part_1.244)5/43呼吸或心臟死亡 | 區分後的歸因比率OK；此處未獨立合併2–6% | 保留舊系列歸因，原始2–6%系列未全部獨立取得。 |
| 吞嚥困難警示 | 3161,3191–3211 |幕上>60mL；盛行37–78% | 篩檢37–45%、臨床51–55%、儀器64–78%，[Martino][dysphagia]；廣泛適用篩檢[AHA/ASA][aha] | 警示選擇截止值Questionable | 低於60mL不是臨床免篩檢。 |
| 心臟風險 | 3217–3290;`simulate.ts:1473,1695` |島葉30%、NIHSS≥16；846人19%、4.1%、第2–3天／第2週；AF23.7% | [Prosser](https://pubmed.ncbi.nlm.nih.gov/17569877/)、[Sposato](https://pubmed.ncbi.nlm.nih.gov/25748102/) | 研究比率OK，30%／NIHSS16觸發存疑；AF23.7%為中風或TIA族群住院／追蹤序列階段的合併估計檢出率 | 保留警示啟發式，兩語說明AF監測分母。 |
| DVT | 3301–3318;`simulate.ts:1482–1485` |第2–30天；IPC12.1→8.5%近端DVT30d | [CLOTS3](https://doi.org/10.1016/S0140-6736(13)61050-8) | 不動中風病人比率OK（每組1438），固定時間窗存疑 | 保留。 |
| 早期癲癇 | 3324–3354 |7d邊界；腦葉5.9／深部.6%；皮質6.5%；HT12.5%=4/32 | [Labovitz][seizure1]、[Kilpatrick](https://pubmed.ncbi.nlm.nih.gov/2302087/)、[Beghi](https://pubmed.ncbi.nlm.nih.gov/21975208/) | 研究比率OK | 重積分母已於上方修正。 |
| 晚期癲癇 | 3355–3371 |>7d；1y4%／5y8%；SeLECT1y.7–63% | [Galovic](https://pubmed.ncbi.nlm.nih.gov/29413315/) | 預測模型範圍OK，不是所有病人 | 保留。 |
| CCD | 1674–1676,3457–3493 |皮質30mL、開始6h；PET58%；視丘9/39 | [Pantano](https://pubmed.ncbi.nlm.nih.gov/3488093/)58%掃描；[thalamic MRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC3914872/)9/39 | 引文OK，30mL／6h觸發存疑 | 保留校正。 |
| Wallerian／HOD時鐘 | 3513–3580,688 |DTI1–2wk、T2暗4wk／亮10–14wk；MCP1mo；HOD T2約1mo、增大6mo；15人38–67%；顎3mo | [Kuhn](https://pubmed.ncbi.nlm.nih.gov/2740501/)驗證傳統CST MRI時間，不是DTI或MCP；[Goyal](https://pubmed.ncbi.nlm.nih.gov/10871017/)驗證HOD T2約1mo且持續≥3–4y，**肥大**於3–4y消退；[Steidl](https://doi.org/10.3389/fneur.2022.950191)驗證依序列／評分者而異的38–67% | 部分驗證，原一概OK過度宣稱 | 保留限定敘述；引用不建立DTI1–2wk、MCP1mo、精確顎3mo時鐘。T2訊號不一定與增大同時消退。 |
| 憂鬱／認知 | 3649–3655 |31%；5y39–52%；2950人12世代 | [Hackett][depression]、[Ayerbe](https://doi.org/10.1192/bjp.bp.111.107664)、[Weaver](https://pubmed.ncbi.nlm.nih.gov/33901427/) | 憂鬱估計OK；Weaver「1y內約一半」是背景，實測1286/2950=43.6%、評估最長15mo | 雙語現引用實測43.6%與15mo族群，失智族群仍分開。 |
| 血壓 | 575,3683–3684 |MAP120≈170/95；IVT前185/110、後180/10524h；IST17398、最低150、+4.2%/10；升壓試驗153；EVT後避免SBP<120 | [AHA/ASA][aha]；[IST](https://pubmed.ncbi.nlm.nih.gov/11988609/)；[pressor trial](https://pubmed.ncbi.nlm.nih.gov/31645472/)；[ENCHANTED2/MT](https://pubmed.ncbi.nlm.nih.gov/36341753/)；MAP=(170+2×95)/3=120 | 算術及研究關聯OK；2026指引IVT前<185/110、IVT後≥24h<180/105、EVT中／後24h≤180/105；成功前循環EVT後72h也警告避免密集SBP目標<140 | ENCHANTED2/MT<120結果正確，但未涵蓋全部當前指引。升壓試驗也含進展中風；模型高MAP單調效益仍存疑。 |
| 痙攣 | 3706;`clinical.ts:205–208` |3mo19%；6mo42.6%、嚴重15.6%；2wk內24.5% | [Sommerfeld](https://pubmed.ncbi.nlm.nih.gov/14684785/)、[Urban](https://pubmed.ncbi.nlm.nih.gov/20705930/)、[Wissel](https://pubmed.ncbi.nlm.nih.gov/20140444/) | 族群特定OK：Urban6mo重評211人起初有中樞輕癱，不是所有中風 | 保留四捨五入43/16%與¼。 |
| 中樞疼痛 | 3720–3729 |1y8%；視丘1/7、膝狀1/4、首週⅓；延髓外側6mo內¼ | [Andersen](https://doi.org/10.1016/0304-3959(94)00144-4)16/207存活≥6mo且能可靠溝通者；[Nasreddine](https://pubmed.ncbi.nlm.nih.gov/9153442/)已發表痛病例第1週36%；[MacGowan](https://pubmed.ncbi.nlm.nih.gov/9222179/)16/63 LMI | 數字OK，「所有中風8%」分母Wrong | 兩語修正為16/207篩選存活者，保留病例系列／報告限制。 |
| REM行為 | 3748–3769 |3mo6/27，橋腦腹側5、延髓1；15 PSG病人無RBD | [Tang](https://doi.org/10.1186/1471-2377-14-88)、[Tellenbach](https://doi.org/10.1111/jsr.13640) | 問卷／PSG區分後OK | 保留；無RBD≠沒有伴隨肌張力未消失的REM睡眠。 |
| 竊血症狀 | 3790 |上肢壓差40–50mmHg | [Labropoulos](https://pubmed.ncbi.nlm.nih.gov/20531004/) | 機率關聯OK，不是硬性診斷邊界 | 保留機率措辭。 |
| 區域比例與顯示規則 | 1847,2973,3231,3356–3358,3512,3533,3553,3759;`simulate.ts:1264,2241,2699,2710,2745–2752` |區域傷害.25/.3/.4/.5；優勢20%；腔隙核心50%；雙側偏移>.05mm | 內部表型／顯示規則，不是臨床診斷閾值 | 作醫學常數Questionable | 無單獨替代值；浮點epsilon不賦醫學意義。 |

<a id="derived-anatomical-volumes-per-vessel"></a>
## 各血管衍生解剖體積

這些是**供血加權的腦供應區體積**，不是梗塞核心預測。任一時間梗塞體積為 `sum(bed.volume × infarct fraction)`（`simulate.ts:2771–2811`），依阻塞持續時間、血流、側枝、組織類型及再灌流而異。不能合理指定單一「每條血管的核心mL」。

方法：遍歷手繪母邊、連續性與中點起始；排除僅視覺、僅變異與側枝路徑；不跨交通路徑，但保留它直接供應的穿通支。加總 `bed.volume × normalized supply share`。母／子供應區重疊，椎動脈共用基底動脈樹；表列不可加總。值四捨五入至0.001mL是為重現，不是臨床精度。解剖來源：`anatomy/index.ts:53,63,70`、`anatomy/expand.ts:45`、`anatomy/territories.ts:4`；血管定義ACA`vessels.ts:478`、MCA`:668`、基底動脈`:1274`、PCA`:1592`。

[CT vascular territory mapping][territory]報告**19位沒有血管阻塞的病人**（不是全部167納入者）合併每側供應區中位數：ACA154[IQR125–193]、MCA350[322–396]、PCA180[151–214]mL。模型ACA≈139–144、MCA≈297–308、PCA≈90–93mL。**Questionable**，尤其PCA：不同圖譜、腦正規化與分配方法使世代IQR不能當強制界限。[Liu atlas][atlas]提供拓樸，不驗證這些正規化血管體積。所有分支列同此判定；在解剖一致的重新校正前**不改**。

| 血管識別名稱 | 右側 mL | 左側 mL | 中線／其他 mL |
|---|---:|---:|---|
| brachiocephalic | | |756.730|
| subclavian_prox_r / subclavian_prox_l |305.819|306.784| |
| subclavian_dist |0|0| |
| cca_r / cca_l |450.911|457.034| |
| ica_cervical |450.911|457.034| |
| eca,eca_facial,eca_sta,eca_maxillary,eca_occipital |0|0|排除顱外組織|
| va_extracranial |305.819|306.784| |
| ica_petrous_cavernous |450.911|457.034| |
| ophthalmic |0|0|視網膜不列入腦|
| ica_ophthalmic_seg |450.911|457.034| |
| ica_terminal |449.595|455.873| |
| acha |9.016|8.621| |
| aca_a1 |143.853|138.960| |
| acomm | | |0; 排除交通路徑|
| heubner |7.593|7.360| |
| aca_a2 |136.261|131.601| |
| aca_frontopolar |20.687|18.689| |
| aca_callosomarginal |68.401|67.853| |
| aca_pericallosal |47.173|45.059| |
| aca_paracentral |20.843|20.208| |
| mca_m1 |296.726|308.291| |
| lenticulostriate |17.459|16.581| |
| mca_temporal_anterior |14.932|13.379| |
| mca_m2_sup |147.507|156.353| |
| mca_m2_inf |116.828|121.978| |
| mca_orbitofrontal |16.828|18.853| |
| mca_prefrontal |58.468|63.181| |
| mca_precentral |22.928|22.021| |
| mca_central |19.411|21.015| |
| mca_ant_parietal |23.016|24.369| |
| mca_post_parietal |10.166|10.371| |
| mca_angular |24.112|24.159| |
| mca_temporooccipital |11.587|14.575| |
| mca_temporal_posterior |17.266|19.630| |
| mca_temporal_middle |49.922|49.431| |
| pcomm,tuberothalamic |1.316|1.161|僅直接供血|
| trigeminal_persistent |—|—|僅變異，無預設體積|
| va_v4_prox |305.819|306.784| |
| va_v4_dist |271.397|271.572| |
| lat_medullary_perf |.761|.937| |
| asa_root |.755|.754| |
| asa | | |0腦；排除脊髓組織|
| pica |34.422|35.212| |
| pica_medial |4.511|4.577| |
| pica_lateral |29.615|30.271| |
| basilar_lower | | |269.748|
| basilar_mid | | |245.312|
| basilar_upper | | |241.410|
| basilar_tip | | |185.352|
| aica |11.404|11.478| |
| labyrinthine |0|0|排除內耳|
| pontine_paramedian_inferior |.760|.793| |
| pontine_paramedian_caudal |1.524|1.585| |
| pontine_paramedian_rostral |2.727|2.745| |
| pontine_circumferential |.392|.402| |
| sca |24.917|25.669| |
| sca_medial |4.291|4.889| |
| sca_lateral |19.546|19.694| |
| mesencephalic_perf |.830|.789| |
| pca_p1 |90.377|93.356| |
| thalamoperforator |1.203|1.533| |
| quadrigeminal |.475|.498| |
| pca_p2 |88.700|91.325| |
| thalamogeniculate |3.504|3.431| |
| posterior_choroidal |3.416|3.372| |
| pca_temporal |17.994|17.497| |
| pca_calcarine |32.217|36.497| |
| pca_parietooccipital |31.266|30.239| |
| pca_splenial |3.777|4.539| |

側枝路徑沒有獨立固定組織體積：雙側 `lepto_aca_mca_{precentral,central,parietal,frontal,orbital}`、`lepto_pca_mca_{parietal,superior_parietal,occipital,temporal}`、`lepto_aca_pca_callosal`、`lepto_pica_aica`、`lepto_aica_sca`、`lepto_pica_sca_{lateral,vermian}`、`coll_acha_pchor`、`coll_ec_ic_{orbital,meningeal}`、`coll_occipital_va`，另有中線 `lepto_pica_crossed` 與 `lepto_sca_crossed`。

<a id="verification-and-limits"></a>
## 驗證與限制

獨立涵蓋：每個表列皆重新檢視。實測引文對照引用原始來源摘要／全文或索引的原始文字；精確、未驗證係數保留 Questionable 判定。139項解剖數值從匯入解剖與手繪圖邊獨立重算，139/139皆符合0.00051mL四捨五入容差。腦體積1250.8mL與總血流557.0384059826916mL/min也可重現。這建立模型算術，不是解剖有效性。

測試審查：eTICI邊界是原發表百分比；零救回比較治療與未治療模擬。新的grade1敘述斷言在修正前HEAD失敗（1failed/19passed）。30%截止值現檢查略低／高於它的行為。偏移帶字面值確實來自Ropper，但此檢查與預設手術≤48h都不建立臨床有效性。ADC半曲線測試曾錯誤呈現為已發表邊界，現明示為示意模型回歸，另有DWI透亮效應檢查。字串斷言防止雙語措辭漂移，不驗證試驗效果。

提交的原始驗證歷史不是獨立證據：9fcab32本身改了codexReview1.test.ts，與原最後一句矛盾。這次重查不改該檔，也不提交。修正程式的獨立最終驗證：`npx tsc --noEmit`結束0；`npx vitest run`結束0，90/90檔、10,019/10,019測試通過（507.97s），含20醫學數值測試與5個未改codexReview1測試。工作檔與HEAD blob雜湊同為 `b8b7762457460d77d240fd9cf1c6becb2aace3cb`。jsdom canvas與React act警告不造成失敗。

這是數值來源稽核，不是臨床驗證。即使動機世代數字已查證，未驗證校正仍存疑。支持定性機制不驗證本專案精確係數。主要未完成工作是區域動力學、圖譜／體積校正、機率性腫脹／疝脫、區域神經元密度；這些改變需在五檔限制下另行核准階段。


[etici]: https://doi.org/10.1136/neurintsurg-2018-014127
[select2]: https://www.nejm.org/doi/full/10.1056/NEJMoa2214403
[selectprotocol]: https://pubmed.ncbi.nlm.nih.gov/34282987/
[strive]: https://discovery.ucl.ac.uk/10173196/1/STRIVE-2_Manuscript_accepted.pdf
[aan]: https://pmc.ncbi.nlm.nih.gov/articles/PMC6139814/
[surgery]: https://pubmed.ncbi.nlm.nih.gov/17303527/
[cord1]: https://pubmed.ncbi.nlm.nih.gov/22205760/
[cord2]: https://pubmed.ncbi.nlm.nih.gov/30264146/
[hints]: https://pubmed.ncbi.nlm.nih.gov/19762709/
[hearing]: https://pubmed.ncbi.nlm.nih.gov/15607217/
[seizure1]: https://doi.org/10.1212/WNL.57.2.200
[dementia]: https://pubmed.ncbi.nlm.nih.gov/19782001/
[depression]: https://pubmed.ncbi.nlm.nih.gov/25117911/
[cbf]: https://pubmed.ncbi.nlm.nih.gov/21980202/
[defuse]: https://www.nejm.org/doi/full/10.1056/NEJMoa1713973
[dawn]: https://www.nejm.org/doi/full/10.1056/NEJMoa1706442
[aha]: https://www.ahajournals.org/doi/10.1161/STR.0000000000000513
[growth1]: https://pmc.ncbi.nlm.nih.gov/articles/PMC4478123/
[growth2]: https://pubmed.ncbi.nlm.nih.gov/34493575/
[growth3]: https://pubmed.ncbi.nlm.nih.gov/33262233/
[capsule]: https://pubmed.ncbi.nlm.nih.gov/33827247/
[attention]: https://doi.org/10.1056/NEJMoa2206317
[baoche]: https://doi.org/10.1056/NEJMoa2207576
[retina]: https://pubmed.ncbi.nlm.nih.gov/15106952/
[neurons1]: https://pubmed.ncbi.nlm.nih.gov/16339467/
[neurons2]: https://doi.org/10.1161/STROKEAHA.118.023499
[atlas]: https://www.nature.com/articles/s41597-022-01923-0
[territory]: https://link.springer.com/article/10.1007/s00234-022-03034-4
[adc]: https://pmc.ncbi.nlm.nih.gov/articles/PMC7976036/
[shift]: https://pubmed.ncbi.nlm.nih.gov/3960059/
[malignant]: https://pubmed.ncbi.nlm.nih.gov/10978048/
[cerebellum]: https://doi.org/10.1136/svn-2024-003360
[nihss]: https://www.ninds.nih.gov/sites/default/files/2025-03/KnowStroke_NIHStrokeScale_March2025_508c.pdf

[lacunevolume]: https://pmc.ncbi.nlm.nih.gov/articles/PMC7650076/
[dysphagia]: https://pubmed.ncbi.nlm.nih.gov/16269630/
[fastgrowth]: https://pubmed.ncbi.nlm.nih.gov/33280550/
