[繁體中文](MEDICAL_VALUES_AUDIT.zh-TW.md) · [简体中文](MEDICAL_VALUES_AUDIT.zh-CN.md) · [English](MEDICAL_VALUES_AUDIT.md) · [Deutsch](MEDICAL_VALUES_AUDIT.de.md) · [日本語](MEDICAL_VALUES_AUDIT.ja.md)

<!-- source-doc: MEDICAL_VALUES_AUDIT.md; sha256: 3c76b816b6798f01cca289388fd0a2e5027e9e27f83324b21846253cad32cbd5 -->

<a id="engine-medical-values-audit"></a>
# 引擎医学数值稽核

于 2026-10-08 对照提交 `9fcab3287f9881f4f82309410631ce7feaef2a80`、其母提交差异及引用原始来源（网路搜寻、摘要与可取得全文）独立重新查核。范围是正式 `src/engine/*.ts`，包括注解与两种叙述语言中的数值。测试是固定数据／断言，不是额外临床证据；追溯引擎汇入的解剖常数。意义相同的重复值合并。数学恒等式、回圈索引、浮点 epsilon 与采样解析度排除，除非可能被误认为临床阈值。

**OK（有支持）**表示来源支持指定族群与量测，不表示模拟器已经临床验证。**Questionable（存疑）**表示未验证校正、外推、证据冲突或未完整查证引文。**Wrong（错误）**表示特定数字、分母、边界或解释与证据矛盾。引用另一种量的文献，不能使缺乏支持的参数变正确。

位置是原稽核的近似来源锚点，编辑可使行号移动。「修正」表保留提交前的值并记录已审查与后续修正；其余表描述模型与独立重查判定。重查引用结果不等于独立重现原始临床数据。

<a id="corrections"></a>
## 修正

| 数值 | 位置 | 当时值 | 文献 | 判定 | 处置 |
|---|---|---|---|---|---|
| eTICI 1 再灌注比例 | `src/engine/treatment.ts:47`; `cascade.ts:727`; `src/i18n/uiTreatment.ts:121,213` | 0.05；远端血流「几乎没有」 | 血栓减少但**没有远端再灌注**，[Liebeskind 2019][etici] | Wrong | 设为 0；修正 zh-TW/en 说明与选单标签，引用定义，测试零组织救回及各级范围。 |
| 大核心试验上限 | `cascade.ts:1488,1596,1600` | 超过 100 mL，「只有 LASTE 不设上限」 | SELECT2 也没有核心体积上限，[SELECT2][select2] | Wrong | 修正两语及选择注解。100 mL 保留为警示显示触发值，不是排除条件。 |
| 急性小型皮质下梗死直径 | `cascade.ts:2012–2013` | 约小于 1.5 cm | 近期小型皮质下梗死通常轴向 ≤20 mm；STRIVE-2 也承认 <3 mm 的空洞腔隙，[STRIVE-2][strive] | 惯例 Wrong | 两语改为通常轴向直径 ≤2 cm，新增来源与回归。 |
| 意识预后 | `cascade.ts:3914–3916,3974–3975,3996–3997` | 3 个月后恢复极罕见；寿命 2–5 年；不恢复意识 | 承认晚期恢复；慢性而非永久 VS/UWS，[AAN 2018][aan] | 作为当前确定预后为 Wrong | 移除固定寿命与确定性，承认可能晚期恢复，保留明示的示意模型病程。 |
| 减压年龄边界 | `cascade.ts:2467–2468,2658–2659` | 英文「未满 60 岁」，其他处 ≤60 | 合并试验年龄 18–60，[Vahedi][surgery] | 边界 Wrong／措辞不一致 | 改为 60 岁或以下，zh-TW 明确包含端点。 |
| 脊髓影像分母 | `cascade.ts:1302–1303` | 铅笔样 40% 以全部 133 人为分母；动脉异常 20% 未说子集 | 铅笔50/126、猫头鹰眼82/126、初始正常30/126；动脉征象16/82，[Zalewski][cord2] | 分母 Wrong | 保留百分比，指出影像子集与接受检查的 16/82。 |
| MRI 伪阴性族群 | `cascade.ts:1254–1255` | 48 h 内 12%，看似泛指 | 高风险急性前庭综合征世代的缺血卒中 8/69；所有伪阴性扫描8–48h，[Kattah][hints] | 族群与时间分母 Wrong | 两语明示8/69及伪阴性扫描时间，不是48h内每次扫描的12%。 |
| 听力恢复追踪 | `cascade.ts:1231–1232` | 重度丧失 40%「几个月内」改善 | 长期追踪，至少 1 年，[Lee/Baloh][hearing] | 时间精度 Questionable | 两语改长期追踪，保留 40%。 |
| 早期癫痫／重积分母 | `cascade.ts:3353–3354` | 约 ¼ 皮质梗死癫痫以重积表现 | 所有卒中类型早期癫痫 10/37（27%），[Labovitz][seizure1] | 分母 Wrong | 明示包括出血的全部卒中类型；广泛摘要4–6%改4–7%，涵盖引用6.5%。 |
| 失智盛行率与发生率 | `cascade.ts:3654–3655` | 首次卒中后约7%发生，复发后>⅓ | 排除既有失智的社区首次卒中7.4%；包含既有失智的医院复发世代41.3%，[Pendlebury][dementia] | 分母／解释 Wrong | 列精确估计与族群，不把它们互换解释为新发风险。 |
| 抑郁时间范围 | `cascade.ts:3654–3655` | 31%「任何时点」 | 合并盛行率，分层随追踪不同，[Hackett][depression] | 泛化 Questionable | 标明合并估计与时间变异，保留31%。 |
| AF 监测检出率 | `cascade.ts:3285–3290` | 延长监测约四分之一检出 | 卒中或 TIA 入院 ECG、住院与门诊阶段估计合并检出23.7%，[Sposato](https://pubmed.ncbi.nlm.nih.gov/25748102/) | 若读成仅门诊检出为 Wrong | 两语说明合并估计、卒中或TIA族群与序列阶段。 |
| 恶化分母 | `cascade.ts:2358–2359` |53人中24h内36%／48h内68% | 因恶化而选入的世代，[Qureshi](https://pubmed.ncbi.nlm.nih.gov/12545028/) | 分母 Questionable | 明示筛选的恶化患者。 |
| 发烧边界 | `cascade.ts:3042–3043` | 英文超过39°C，zh-TW39°C以上 | 纳入≥39°C，[Sung](https://pubmed.ncbi.nlm.nih.gov/19521083/) | 严格与含端点边界 Wrong | 英文现为39°C或以上。 |

<a id="perfusion-tissue-fate-and-volumes"></a>
## 灌注、组织命运与体积

| 数值 | 未特别注明则位于 `src/engine` | 当前值 | 文献比较 | 判定 | 处置 |
|---|---|---|---|---|---|
| 操作性核心阈值 | `tissueParams.ts:53,97`; `tissue.ts:5` | rCBF <0.30 | Campbell 最佳<31%；SELECT2采<30%，[Campbell][cbf]、[SELECT2 protocol][selectprotocol] | CTP影像引文OK；扩至全部模型组织存疑 | 保留；测试固定0.30并检查略低／高于它的最终梗死行为。区域模型血流不是实测CTP体素，也不证明不可逆死亡。 |
| 半影／低灌注阈值 | `tissueParams.ts:54–55,98–99`; `tissue.ts:10–19` | rCBF <.55 / <.85；绝对比较20/10 mL/100g/min，猴麻痺约23 | 现代灌注不匹配采Tmax >6 s，[DEFUSE-3][defuse]；绝对阈值依组织、时间、方法而异 | Questionable | 保留明示校正。模拟器不算Tmax；.55不能验证为Tmax >6 s。 |
| 快速核心／穿通支设定 | `tissueParams.ts:46–61,125` | τ .09 h，跨度1，半影τ1.5 h×20，最高存活.85，延迟.1 h；15 min前丧失>80% | 大鼠纹状体30 min梗死不是经验证的人类死亡时程，[Memezawa](https://pubmed.ncbi.nlm.nih.gov/1561688/) | Questionable | 无合理的单独替代值，保留限制声明。 |
| 默认侧支供应设定 | `tissueParams.ts:97–105` | 核心τ3→8 h；半影8→30 h；存活.85；延迟⅓ h | 实测扩大高度异质，[Wheeler][growth1]、[Ospel][growth2] | Questionable | 保留为模型，不是生理常数。 |
| 报告／衍生扩大引文 | `tissueParams.ts:76–84` |3.1 [.7–10.7]、4.74 [1.25–14.84]mL/h；快速≥10；极端约74mL/h | [Wheeler][growth1]中位3.1；[Ospel][growth2]4.74由最终24h梗死／发作至再灌注时间衍生；≥10是[SELECT study][fastgrowth]分类；极端神经元换算为估计，[Desai][neurons2] | 归因估计OK；若全称为序列实测核心扩大则Wrong | 保留数值及方法限制；不是普遍快速扩大截止值或直接细胞计数。 |
| 衍生情境扩大 | `tissueParams.ts:85–90` | M1差侧支1h约60mL／前6h35–55mL/h；ICA1h约70mL；中等20–30／良好10–20 | 比较良好2.93 [1.10–7.94]、中等8.65 [4.53–18.13]、不良25.41 [12.83–45.07]，[collateral study][growth3] | Questionable，偏快速进展 | 不改，模型输出不是族群典型速度。 |
| 深部白质 | `tissueParams.ts:139–161` | 延迟2.5h，τ1.75h；4/5/6h丧失58/76/86% | 世代92人，45（48.9%）内囊梗死；LSA阻塞子集每小时LSA再灌注延迟aOR3.47，[Kaesmacher][capsule] | 世代引文OK，换算存疑 | 跨患者概率不是单一内囊比例，不保证2.5h安全期。 |
| 基底动脉设定 | `tissueParams.ts:175–219` | 沿用快速核心；半影τ3→60h；最高存活.4 | 12h／6–24h内效益不能识别组织动力系数，[ATTENTION][attention]／[BAOCHE][baoche] | Questionable | 保留明示区域校正限制。 |
| 视网膜 | `tissueParams.ts:225–241`; `cascade.ts:1170` | 延迟12min，τ5.4min；猴97/240min，人类综述12–15min | [Hayreh experiment][retina]与[Tobalem](https://doi.org/10.1186/s12886-018-0768-4)争议外推 | 作为人类确定规则Questionable | 保留证据冲突与不确定性，不用猴97min取代12min。 |
| 最终梗死概率 | `tissue.ts:61` | 1−survivalMax×x^1.3 | 无实测普遍指数；[DEFUSE-3][defuse]建立选择条件，不是此定律 | Questionable | 保留校正。 |
| 稳定半影期限 | `tissue.ts:65,81` | lag+3τ，上限48h | 48h内观察到缺氧但存活组织，[Markus](https://pubmed.ncbi.nlm.nih.gov/15130953/)；不证明此时结束 | Questionable | 保留为计算病程限制。 |
| 救回组织恢复 | `tissue.ts:225–238,270–276`; `cascade.ts:778–782` | .5h初始反应；τ2.8×缺血小时；快速比例.75、慢τ×8；30min内约¼ NIHSS<6；24h NIHSS中介估计治疗效益54%／出院75% | 临床反应世代不建立组织比例动力学，[Kniep](https://pubmed.ncbi.nlm.nih.gov/35549377/)、[Desai](https://pmc.ncbi.nlm.nih.gov/articles/PMC12778787/) | 世代数字OK；中介／NIHSS转为组织动力学存疑 | 不改动力参数。 |
| 神经元丧失 | `tissue.ts:325`; `simulate.ts:2811`; `cascade.ts:1550` | 每mL22百万；平均每min1.9百万；范围每min<35000–>27百万 | [Saver][neurons1]是前脑／幕上；[Desai][neurons2]显示变异 | 四舍五入前脑估计OK，后循环套用存疑 | 不替换密度，小脑／脑干需独立模型；全脑总量不是已验证神经元丧失。 |
| 解剖体积正规化 | `src/anatomy/index.ts:30,53,63,70`; `simulate.ts:2771–2811` |1250mL目标；加固定构造后实际脑1250.8mL | [Liu atlas][atlas]支持供应区拓朴，不建立普遍1250mL脑 | 固定成人几何Questionable | 保留，见各血管表。 |
| 基准血流 | `src/anatomy/index.ts:70`; 引擎汇入 | 体积×区域CBF/100；总557.0384mL/min | 合理成人教学基准，不推导个人生理界限 | 作为普遍值Questionable | 保留。 |
| 腔隙体积 | `simulate.ts:201–202`; `src/anatomy/lacunes.ts:45` | .8mL，引用世代中位.73mL | [Barow2020][lacunevolume]：224位WAKE-UP腔隙患者，中位.73mL[IQR.37–1.15]；[STRIVE-2][strive]不指定一致体积 | 固定体积Questionable | 保留为情境。 |
| 「无梗死」／起始阈值 | `simulate.ts:333,620,1296`; `cascade.ts:1969` | .05mL | 组织定义TIA没有公认最小梗死体积，[Easton](https://doi.org/10.1161/STROKEAHA.108.192218) | 若作临床值Questionable | 数值／报告容差，不是诊断最小值；不改。 |
| 恢复／最终显示时钟 | `simulate.ts:325,445,1445,2849` |90/180天，存活半影平滑12h，预览24h |90d为常见试验终点[DEFUSE-3][defuse]，其余为模型期限 | 终点OK，生物解释存疑 | 保留。 |

`tissueParams.ts:77–83` 额外灌注比较：[Seners](https://pmc.ncbi.nlm.nih.gov/articles/PMC10663035/)验证最高HIR四分位约77%快速进展，≥10mL/h定义为基准梗死／发作至影像时间；不是模型侧支分级概率。[d'Esterre](https://pubmed.ncbi.nlm.nih.gov/26514186/)验证早期再灌注（CTP后<90min、发作<180min）的<8.9/<7.4mL/100g/min阈值；这是有条件ROC截止值，不是普遍7–9存活边界。[Boned](https://pubmed.ncbi.nlm.nih.gov/27566491/)建立CTP可能高估核心，不是已证明细胞死亡反转。引文支持谨慎，不支持模型动力学。

<a id="hemodynamics-collaterals-and-emboli"></a>
## 血流动力学、侧支与栓子

下列网路数值系数**作为医学常数存疑**：引用文献支持定性相依关系，不支持精确系数。没有重新校正网路，就没有合理数值替代。

| 数值 | 位置 | 当前值 | 文献／判定 | 处置 |
|---|---|---|---|---|
| 液压导通尺度／分支乘数 | `hemodynamics.ts:98–119` |150，相较物理约900；分支×3；狭窄段4mm | 集中参数Poiseuille近似，不是患者量测 | 保留模型系数。 |
| 参考压力／储备 | `hemodynamics.ts:101–112,780,798` |MAP93、流出10、连结压降12/30mmHg；自动调节.6–1.8；指数.7；相对血流上限2 | 指引规范实测血压，不是这些储备因子，[AHA/ASA][aha] | 保留代表基准。 |
| 侧支等级 | `hemodynamics.ts:113–115` |良好1.5／中等.8／不良.15；尺度1/36 | [Collateral/core growth][growth3]支持顺序，不是ASITN/SIR分级 | 保留，不等同临床分数。 |
| 脑干供应侧比例 | `hemodynamics.ts:153–162` |.6/.4、.7/.3、.5/.5、.7/.3、.5/.5 | 解剖混合假设，不是实测比例 | 保留。 |
| 软脑膜导通度 | `hemodynamics.ts:169,191,208–225` |.02；不良.5、覆写.75；入口.015；压力指数1.4 | [ATTENTION][attention]／[BAOCHE][baoche]不验证这些数值 | 保留校正。 |
| 衍生基底动脉残余血流 | `hemodynamics.ts:165,174,196–204` |50/40/33%；旧不良15%；覆写28→33%；多段6–23% | 网路输出，多段限制已记录 | 保留，不是临床实测范围。 |
| 颅外侧支 | `hemodynamics.ts:244–267` |导通度1.8/1.2；上肢梯度25mmHg；引用76%顺向BA；压力20/40–50mmHg | [Harper](https://pubmed.ncbi.nlm.nih.gov/18692344/)、[Labropoulos](https://pubmed.ncbi.nlm.nih.gov/20531004/)；76%顺向流与>40–50 mmHg关联已验证，导通度未验证 | 保留已查证观察引文与未验证模型系数。 |
| 反转／路径侦测 | `hemodynamics.ts:814–815,852`; `simulate.ts:426` |max(.5mL/min,5%基准)；路径增加5mL/min | 工程分类器，不是诊断条件 | 保留。 |
| 栓子直径默认 | `embolus.ts:35–38` |4.2/2.9/1.6/.9mm | 示意大小，不是临床类别 | 保留。 |
| 栓子路由／嵌顿 | `embolus.ts:67–70,88–103,123` |ACA.3、交通支.5、穿通支.02；直径×1.05；入口<.6×直径→权重.05；血流>.2 | 刚性球体／血流启发式，不是已验证栓塞概率 | 保留。 |
| 排程／代数 | `schedule.ts:158`; `solver.ts` |.9排序探针；代数容差 | 不是90%狭窄阈值，求解器无医学常数 | 不需临床修正。 |

<a id="edema-mass-effect-surgery-and-recovery"></a>
## 水肿、占位效应、手术与恢复

| 数值 | 位置 | 当前值 | 文献 | 判定／处置 |
|---|---|---|---|---|
| ADC 伪正常化 | `edema.ts:11,101–102` |约1–2wk；中点240h、宽30h |27位患者第1周ADC低、第2周伪正常，[Lansberg][adc] | 定性时程OK，中点／宽度存疑。来源不建立5–14d半峰值扩散受限范围；测试明示7–14d半曲线为模型回归，并区分持续DWI透亮效应。 |
| DWI 出现／加深 | `edema.ts:97–99,187` |τ.1h/12h；亮度.65+.35×rise | 序列ADC/DWI病程，[Lansberg][adc]；研究不建立6分钟起始阈值 | 精确曲线与起始引用Questionable，保留为模型。 |
| DWI 透亮效应 | `edema.ts:104–106` |强度.5，τ720h | ADC正常后DWI仍可持续，[Lansberg][adc] | 强度／τ存疑，保留。 |
| 胶质增生／FLAIR | `edema.ts:108–110` |.6，开始120h，完整400h | 无普遍分解，[Lansberg][adc] | Questionable，保留。 |
| 半影／救回组织DWI | `edema.ts:112–114` |.3，衰减3h | 扩散可逆性可变 | Questionable，保留。 |
| CT 水分摄取 | `edema.ts:23` |11.5%区分≤4.5h与更晚 | [Minnerup](https://doi.org/10.1002/ana.24818) | 研究引文OK，不是体积扩大百分比。 |
| 离子性水肿 | `edema.ts:117–121` |体积.04，τ4h；半影×.4，救回τ12h | 密度衍生水分摄取不同，[Minnerup](https://doi.org/10.1002/ana.24818) | 拟合系数存疑，不替换为.115。 |
| 血管性水肿 | `edema.ts:124–132` |体积.26；中点36h、宽10h；续发×.15；72h开始消退、τ260h | 第2–5天广泛峰值合理，精确常数未验证 | Questionable，保留。 |
| 再灌注水肿 | `edema.ts:135–138,341,388` |体积+.05、FLAIR+.5；上升3h／衰减72h；晚期smoothstep.5–6h；血流变化>.05 | 无此大小的普遍实测效应 | Questionable，保留。 |
| 慢性萎缩 | `edema.ts:34,141–143` |50%；开始300h、τ700h；3–6mo体积减半 | 无普遍50%缩小 | Questionable，保留为情境，不是预后。 |
| 偏移体积映射 | `edema.ts:146–148` |.15mm/mL、储备5mL、上限20mm | [Ropper][shift]描述观测位移，不是此换算 | Questionable，保留。 |
| 减压效果 | `edema.ts:150,157–158` |36h；偏移×.3、脑室压迫×.4 | 手术≤48h，[Vahedi][surgery] | 时间作情境OK，效果大小存疑；仅测时间。 |
| 脑室反应 | `edema.ts:161–168,520,522` |压迫.85/45mL；ex-vacuo1/120mL；脑积水.8、上升12h、残余.2、初始.25；边界−.9/+1.5 | 无正规化几何生理边界来源 | Questionable，保留。 |
| 重叠病灶／大小 | `edema.ts:234,237` |312h；大小因子.3+.7×smoothstep(.05,.5,share) | 假设剂量反应 | Questionable，保留。 |
| 阶段标签 | `edema.ts:479,481`; `edemaTypes.ts:14,16` |消退<.95、离子性≥.3；BBB6–12h；消退2–3wk | 近似教学标签，不是生物转换 | Questionable，保留。 |
| 模型例子 | `edema.ts:41–43` |R-M1约300mL→30%/90mL肿胀→第3天12–13mm；L-M1良好约150mL | 情境输出，不是固定血管体积文献 | 作族群主张Questionable，保留明示校正。 |
| 意识偏移带 | `cascade.ts:584–586`; `edema.ts:36` |4/6/8mm来自3–4/6–8.5/8–13mm |24例混合单侧占位病灶，[Ropper][shift] | 引文OK，普遍卒中阈值存疑；新增来源注解，测试仅确认选值位于观测带。 |
| 占位效应／恶性 | `cascade.ts:619–622` |最终70mL；早期≤14h145mL；最终250mL | DWI **>145mL**，28人于≤14h影像，开发世代敏感度100%／特异度94%，[Oppenheim][malignant] | 三处≥145皆修正为严格>145。预测因子引文OK；确定性与双侧外推、70/250截止值仍存疑。 |
| 脑疝时间 | `cascade.ts:594–609` |钩回≥72h；镰下−12h；脑桥+12h；结束336h；侧向4mm | 第3天死亡峰值不是最早脑疝，[Qureshi](https://experts.umn.edu/en/publications/timing-of-neurologic-deterioration-in-massive-middle-cerebral-art/) | 硬性时间Questionable，需要结构校正。 |
| 水肿事件时钟 | `cascade.ts:609–610,2157–2160` |24–336h，峰值2–5d | 恶化可早于24h | 固定显示窗Questionable，保留。 |
| 小脑占位／恶性 | `cascade.ts:640–646,2704–2716` |警示20mL；恶性38mL；总35.5%；第3天后39.4% |93例占位梗死，33恶性；13/33（39.4%）发生在3天后；38mL与>50%风险相关，[Baki][cerebellum] |20为校正；38作预测因子OK，确定触发存疑；新增来源。 |
| 小脑意识 | `cascade.ts:646,659–680` |48h；昏迷峰值90%、昏睡67.5%、嗜睡45% | 后颅窝比例借自幕上偏移，未验证 | Questionable，保留。 |
| 手术结局 | `cascade.ts:2467–2468,2658–2659` |≤48h、年龄≤60；1y存活78对29%；mRS≤4 75对24% | [Pooled DECIMAL/DESTINY/HAMLET][surgery] | 筛选族群OK，引用并修正含端点年龄；不是普遍体积适应症。 |
| 未治疗恶性结局 | `cascade.ts:2658–2659` |43/55=78%死亡，第2–5天；存活者Barthel60 | [Hacke](https://pubmed.ncbi.nlm.nih.gov/8929152/) | 历史世代引文OK，不是个人预后。 |
| 病灶周围功能障碍 | `recovery.ts:97–103` |6h开始／24h完整；边缘.35、增益.7 | 无已验证普遍关系 | Questionable，保留。 |
| 远隔效应 | `recovery.ts:105–108` |深度.2、上升12h、衰减240h | 区域病程可变 | Questionable，保留。 |
| 代偿动力学 | `recovery.ts:113–120` |24h开始；τ720h、慢2880h／比例.15、快168h；90d约90%平台 | 早期改善集中6–10wk，[Kwakkel](https://pubmed.ncbi.nlm.nih.gov/16931787/) | 系数存疑；约88.5%是模型算术，不是临床估计。 |
| 功能阈值 | `recovery.ts:122,142,160–184,301–309` |坏死25%、紧密神经束下限15%、可察觉.35；严重度.35+.65×min(1,level/.8)；CST丧失25–50%、严重度1.5–2.5；摘要5% | 无普遍组织比例至缺损定律 | Questionable，保留。 |
| 临床分级 | `clinical.ts:69,77,79,150,659,713,732,823,841` |显示25%；昏迷14d改标；广泛50%；分水岭⅔；黄斑相对丧失<75%；重度轻瘫2.5 | 量化表型模型 | Questionable，保留。 |
| 双侧伤害 | `clinical.ts:108–120`; `cascade.ts:618,3939–3975` |半球／MCA⅔→2wk意识障碍；ECD77%；49解剖 | LHI≥⅔MCA定义，[Huang](https://pubmed.ncbi.nlm.nih.gov/32705419/)；77%是背景引文，不是其30人EEG世代结果；49解剖为混合外伤／非外伤VS，[Adams](https://pubmed.ncbi.nlm.nih.gov/10869046/)；预后[AAN][aan] | 定义引文OK；77%原分母未独立确立；解剖不能验证确定的梗死范围预后。双语文现把77%列背景，模型规则仍存疑。 |
| 失语转变 | `clinical.ts:159–160` |1y内59%改类型，多在2wk | [Source cited in code](https://pubmed.ncbi.nlm.nih.gov/3191724/) | 研究特定引文OK，保留。 |
| 延髓颜面轻瘫 | `recovery.ts:240–243` |8/33、轻度、出院前消退 | [Kanbayashi/Sonoo](https://d-nb.info/1241917256/34) | 原全文引文OK，保留。 |
| NIHSS 项目上限 | `clinical.ts:1022–1158` |1a3、1b2、1c2、凝视2、视觉3、颜面3、每臂4、每腿4、共济失调2、感觉2、语言3、构音障碍2、忽略2；总42 | [Official NINDS NIHSS][nihss] | 量表最高分OK，推论评分为近似。 |
| NIHSS 类别／限制 | `clinical.ts:1162–1168` |0/1–4/5–15/16–20/>20；后循环旗标≤6；引用后循环≤5／前循环≤8 | [Sato](https://pubmed.ncbi.nlm.nih.gov/18434640/) | 预后截止引文OK；≤6旗标与类别边界是显示选择，不是资格条件。 |

`edemaTypes.ts` 与 `recoveryTypes.ts` 其余内容指定正规化0–1输出范围与例子，不新增实测生理常数。汇入的解剖恢复设定与症状起始表不在仅引擎稽核内。

<a id="treatment-windows-and-other-numerical-narratives"></a>
## 治疗时间窗与其他数值叙述

| 数值 | 位置（未注明则 `cascade.ts`） | 当前值／文献比较 | 判定 | 处置 |
|---|---|---|---|---|
| 标准IVT／筛选EVT | 1541–1544,1584–1587,1659–1660 |4.5h；早期6h；筛选24h，[AHA/ASA2026][aha] | 包含选择限制时OK | 保留，新增双语测试。 |
| DEFUSE-3 基准，未实作门槛 |`tissue.ts:10–19`; 治疗叙述 |6–16h、核心<70mL、不匹配≥15mL、比值≥1.8、Tmax>6s，[DEFUSE-3][defuse] | 引擎无相等门槛 | 不宣称rCBF.55实作试验不匹配。 |
| DAWN 基准，未实作门槛 |治疗叙述 |6–24h；年龄≥80 NIHSS≥10核心<21mL；年龄<80 NIHSS≥10核心<31mL或NIHSS≥20核心31–<51mL，[DAWN][dawn] | 引擎无相等门槛 | 不把历史资格当成现在普遍排除。 |
| 近期卒中IVT旗标 | 1564–1570 |24–2160h≈3mo；登录293，14d内16.3对4.8%，已验证[Shah](https://pubmed.ncbi.nlm.nih.gov/31903770/) | 登录引文OK，简化时钟存疑 | 保留个别化限制；[AHA/ASA][aha]。 |
| 大核心显示 | 1486,1590–1600 |标签≥70mL；SELECT2≥50；ANGEL筛选分层70–100；ASPECTS3–5 | 通用70mL定义存疑，试验值特定，[SELECT2][select2] | 修正上限主张，保留标签启发式。 |
| 大核心出血 | 1595–1599 |ANGEL6.1对2.7%；LASTE9.6对5.7% | [ANGEL](https://doi.org/10.1056/NEJMoa2213379)、[LASTE](https://doi.org/10.1056/NEJMoa2314063) | 比率已验证，暗示已确立症状性出血增加为Wrong | 双语现说数值较高，两差异均无统计定论。任意ICH增加依试验而异；操作性血管并发症与治疗相关。 |
| 基底动脉试验 | 1608–1615,3122 |ATTENTION≤12h、BAOCHE6–24h；ATTENTION NIHSS≥10；BAOCHE原≥10，61人后扩至≥6；IVT34/21%；死亡37对55／31对42%；未再通良好结局约2% | 时窗与引文比率已验证，[ATTENTION][attention]／[BAOCHE][baoche]；勿把≥10误读成修订后全部BAOCHE族群 | 保留，不推导组织τ。 |
| 腔隙IVT | 1660 |WAKE-UP事后31/53(59%)对24/52(46%)，90d mRS0–1；aOR1.67[.77–3.64] | [Barow/WAKE-UP](https://doi.org/10.1001/jamaneurol.2019.0351) | 比率OK；「无失能」夸大mRS0–1，无交互作用不证明疗效相等 | 两语现说无显著失能（mRS0–1），保留探索子集不确定。 |
| IVT 推论开始 | 758–770 |给药后1–3h再通，约2h评估 | 评估时间不识别生物再通延迟 | Questionable | 保留模型假设，不作真实给药时间。 |
| 再灌注类别／无再流 |`treatment.ts:40–56,170–176` |2a.25∈1–49%；2b50.58∈50–66%；2b67.78∈67–89%；2c.95∈90–99%；3=1；noReflow0–.5 | [eTICI][etici]范围OK，代表值／无再流上限为假设 | 保留有效范围；已修grade1；测试固定范围。 |
| 新供应区栓子 |`treatment.ts:96–100`;1080 |新供应区梗死中ACA27.8%；总5–9% | [Singh](https://pubmed.ncbi.nlm.nih.gov/37082967/)：103/1092 INT、报告9.3%；多数91/103与血管摄影可见阻塞无关 | ACA引文OK，通用5–9%近似／依定义而异 | 不是所有EVT患者ACA27.8%，也不是模型可见远端栓子的已验证发生率。 |
| 效益标签 | 807–832 |NIHSS差2、救回50mL、微量.5mL/10%、LIS24h | 无等同指引 | Questionable | 保留UI阈值。 |
| 自行再通 | 971–974 |24%、IVT46%、OR4.4、53研究 | [Rha/Saver](https://pubmed.ncbi.nlm.nih.gov/17272772/) | 四舍五入24.1/46.2% OK；结局OR4.43采33研究／998人，不是全部53 | 保留历史归因。 |
| 内耳前驱 | 1218 |1mo内13/82；延迟CNS征象9/29 | [Lee2009](https://doi.org/10.1161/STROKEAHA.109.564682)、[Lee/Baloh][hearing] | 研究特定OK | 保留。 |
| 内耳合并缺损 | 1232,1255 |82人中60%；温差反应无力56/62 | [Lee2009](https://doi.org/10.1161/STROKEAHA.109.564682)、[Kim](https://pubmed.ncbi.nlm.nih.gov/24581671/) | OK | 保留，听力追踪／MRI族群已于上方修正。 |
| 脊髓起始／恢复 | 1289,1316 |115人；导尿86%；1h内达最严重68%；约3y死亡23%；存活者轮椅42%、导尿54%、痛29%；恢复走路41% | [Robertson][cord1] | 世代OK；走路分母为出院时74轮椅使用者，不是最严重时；平均追踪3年 | 保留世代框架。 |
| 脊髓诊断 | 1289,1303 |133；12h内最严重77%；铅笔40%、猫头鹰眼65%；DWI19/29；初始MRI正常24%；血管发现20% | [Zalewski][cord2] | 数字OK，分母已修正 | 保留百分比。 |
| 神经失效／扩大叙述 | 1424,1999 |10s功能失效；纹状体30min；内囊2–3h；猴皮质15–30min；半影数小时至一天；中位3–5mL/h、不良>10 | 依物种／血流而异；[growth studies][growth1] | 确定时间Questionable | 保留既有限制。 |
| CT／DWI事件时钟 | 2009,2019,3615–3631 |DWI.1h–336h；CT约6h；雾化2–3wk；ADC第1周低／第2周伪正常；空洞1mo | [Lansberg][adc]支持ADC，其余时间可变 | 硬性边界Questionable | 不推导通用6h CT阈值。 |
| 恶化 | 2359 |53人；24h内36%、48h内68%、第3天死亡峰值 | [Qureshi](https://experts.umn.edu/en/publications/timing-of-neurologic-deterioration-in-massive-middle-cerebral-art/) | 数字OK；筛选恶化世代，现两语已说明 | 保留；与普遍最早第3天恶化矛盾。 |
| 出血风险分层 | 2888–2889,2919–2925 |30/70/100mL；晚期6h；IVT sICH2–7%、24–36h／最长7d | 定义可变，[AHA/ASA][aha] | 确定分层Questionable | 只保留教育警示。 |
| 闭锁综合征预后 | 2979–2980 |139人死亡60%；康复14人吞咽42%／说话28% | 小型、历史、筛选世代；[Patterson/Grabois](https://pubmed.ncbi.nlm.nih.gov/3738962/)、[Casanova](https://pubmed.ncbi.nlm.nih.gov/12808539/) | 历史筛选世代OK | 保留归因，不是普遍存活预测。 |
| 中枢发烧 | 3042–3043 |39°C；74人皮质4%／BAO3%；脑干昏迷4/9；1mo死亡70% | [Sung](https://pubmed.ncbi.nlm.nih.gov/19521083/)、[Parvizi](https://pubmed.ncbi.nlm.nih.gov/12805123/) | 研究引文OK | 说明英文39°C边界含端点。 |
| 延髓呼吸衰竭 | 3095 |2–6%；10d内8/102；急性5/43 | [Pavsic](https://pubmed.ncbi.nlm.nih.gov/32064553)2–6%是背景，不是28人睡眠研究结果；[Saito](https://pubmed.ncbi.nlm.nih.gov/35091384/)8/102致命呼吸衰竭；[Norrving](https://doi.org/10.1212/WNL.41.2_Part_1.244)5/43呼吸或心脏死亡 | 区分后的归因比率OK；此处未独立合并2–6% | 保留旧系列归因，原始2–6%系列未全部独立取得。 |
| 吞咽困难警示 | 3161,3191–3211 |幕上>60mL；盛行37–78% | 筛检37–45%、临床51–55%、仪器64–78%，[Martino][dysphagia]；广泛适用筛检[AHA/ASA][aha] | 警示选择截止值Questionable | 低于60mL不是临床免筛检。 |
| 心脏风险 | 3217–3290;`simulate.ts:1473,1695` |岛叶30%、NIHSS≥16；846人19%、4.1%、第2–3天／第2周；AF23.7% | [Prosser](https://pubmed.ncbi.nlm.nih.gov/17569877/)、[Sposato](https://pubmed.ncbi.nlm.nih.gov/25748102/) | 研究比率OK，30%／NIHSS16触发存疑；AF23.7%为卒中或TIA族群住院／追踪序列阶段的合并估计检出率 | 保留警示启发式，两语说明AF监测分母。 |
| DVT | 3301–3318;`simulate.ts:1482–1485` |第2–30天；IPC12.1→8.5%近端DVT30d | [CLOTS3](https://doi.org/10.1016/S0140-6736(13)61050-8) | 不动卒中患者比率OK（每组1438），固定时间窗存疑 | 保留。 |
| 早期癫痫 | 3324–3354 |7d边界；脑叶5.9／深部.6%；皮质6.5%；HT12.5%=4/32 | [Labovitz][seizure1]、[Kilpatrick](https://pubmed.ncbi.nlm.nih.gov/2302087/)、[Beghi](https://pubmed.ncbi.nlm.nih.gov/21975208/) | 研究比率OK | 重积分母已于上方修正。 |
| 晚期癫痫 | 3355–3371 |>7d；1y4%／5y8%；SeLECT1y.7–63% | [Galovic](https://pubmed.ncbi.nlm.nih.gov/29413315/) | 预测模型范围OK，不是所有患者 | 保留。 |
| CCD | 1674–1676,3457–3493 |皮质30mL、开始6h；PET58%；丘脑9/39 | [Pantano](https://pubmed.ncbi.nlm.nih.gov/3488093/)58%扫描；[thalamic MRI](https://pmc.ncbi.nlm.nih.gov/articles/PMC3914872/)9/39 | 引文OK，30mL／6h触发存疑 | 保留校正。 |
| Wallerian／HOD时钟 | 3513–3580,688 |DTI1–2wk、T2暗4wk／亮10–14wk；MCP1mo；HOD T2约1mo、增大6mo；15人38–67%；颚3mo | [Kuhn](https://pubmed.ncbi.nlm.nih.gov/2740501/)验证传统CST MRI时间，不是DTI或MCP；[Goyal](https://pubmed.ncbi.nlm.nih.gov/10871017/)验证HOD T2约1mo且持续≥3–4y，**肥大**于3–4y消退；[Steidl](https://doi.org/10.3389/fneur.2022.950191)验证依序列／评分者而异的38–67% | 部分验证，原一概OK过度宣称 | 保留限定叙述；引用不建立DTI1–2wk、MCP1mo、精确颚3mo时钟。T2讯号不一定与增大同时消退。 |
| 抑郁／认知 | 3649–3655 |31%；5y39–52%；2950人12世代 | [Hackett][depression]、[Ayerbe](https://doi.org/10.1192/bjp.bp.111.107664)、[Weaver](https://pubmed.ncbi.nlm.nih.gov/33901427/) | 抑郁估计OK；Weaver「1y内约一半」是背景，实测1286/2950=43.6%、评估最长15mo | 双语现引用实测43.6%与15mo族群，失智族群仍分开。 |
| 血压 | 575,3683–3684 |MAP120≈170/95；IVT前185/110、后180/10524h；IST17398、最低150、+4.2%/10；升压试验153；EVT后避免SBP<120 | [AHA/ASA][aha]；[IST](https://pubmed.ncbi.nlm.nih.gov/11988609/)；[pressor trial](https://pubmed.ncbi.nlm.nih.gov/31645472/)；[ENCHANTED2/MT](https://pubmed.ncbi.nlm.nih.gov/36341753/)；MAP=(170+2×95)/3=120 | 算术及研究关联OK；2026指引IVT前<185/110、IVT后≥24h<180/105、EVT中／后24h≤180/105；成功前循环EVT后72h也警告避免密集SBP目标<140 | ENCHANTED2/MT<120结果正确，但未涵盖全部当前指引。升压试验也含进展卒中；模型高MAP单调效益仍存疑。 |
| 痉挛 | 3706;`clinical.ts:205–208` |3mo19%；6mo42.6%、严重15.6%；2wk内24.5% | [Sommerfeld](https://pubmed.ncbi.nlm.nih.gov/14684785/)、[Urban](https://pubmed.ncbi.nlm.nih.gov/20705930/)、[Wissel](https://pubmed.ncbi.nlm.nih.gov/20140444/) | 族群特定OK：Urban6mo重评211人起初有中枢轻瘫，不是所有卒中 | 保留四舍五入43/16%与¼。 |
| 中枢疼痛 | 3720–3729 |1y8%；丘脑1/7、膝状1/4、首周⅓；延髓外侧6mo内¼ | [Andersen](https://doi.org/10.1016/0304-3959(94)00144-4)16/207存活≥6mo且能可靠沟通者；[Nasreddine](https://pubmed.ncbi.nlm.nih.gov/9153442/)已发表疼痛病例第1周36%；[MacGowan](https://pubmed.ncbi.nlm.nih.gov/9222179/)16/63 LMI | 数字OK，「所有卒中8%」分母Wrong | 两语修正为16/207筛选存活者，保留病例系列／报告限制。 |
| REM行为 | 3748–3769 |3mo6/27，脑桥腹侧5、延髓1；15 PSG患者无RBD | [Tang](https://doi.org/10.1186/1471-2377-14-88)、[Tellenbach](https://doi.org/10.1111/jsr.13640) | 问卷／PSG区分后OK | 保留；无 RBD 不等于没有伴随肌张力未消失的 REM 睡眠。 |
| 盗血症状 | 3790 |上肢压差40–50mmHg | [Labropoulos](https://pubmed.ncbi.nlm.nih.gov/20531004/) | 概率关联OK，不是硬性诊断边界 | 保留概率措辞。 |
| 区域比例与显示规则 | 1847,2973,3231,3356–3358,3512,3533,3553,3759;`simulate.ts:1264,2241,2699,2710,2745–2752` |区域伤害.25/.3/.4/.5；优势20%；腔隙核心50%；双侧偏移>.05mm | 内部表型／显示规则，不是临床诊断阈值 | 作医学常数Questionable | 无单独替代值；浮点epsilon不赋医学意义。 |

<a id="derived-anatomical-volumes-per-vessel"></a>
## 各血管衍生解剖体积

这些是**供血加权的脑供应区体积**，不是梗死核心预测。任一时间梗死体积为 `sum(bed.volume × infarct fraction)`（`simulate.ts:2771–2811`），依阻塞持续时间、血流、侧支、组织类型及再灌注而异。不能合理指定单一「每条血管的核心mL」。

方法：遍历手绘母边、连续性与中点起始；排除仅视觉、仅变异与侧支路径；不跨交通路径，但保留它直接供应的穿通支。加总 `bed.volume × normalized supply share`。母／子供应区重叠，椎动脉共用基底动脉树；表列不可加总。值四舍五入至0.001mL是为重现，不是临床精度。解剖来源：`anatomy/index.ts:53,63,70`、`anatomy/expand.ts:45`、`anatomy/territories.ts:4`；血管定义ACA`vessels.ts:478`、MCA`:668`、基底动脉`:1274`、PCA`:1592`。

[CT vascular territory mapping][territory]报告**19位没有血管阻塞的患者**（不是全部167纳入者）合并每侧供应区中位数：ACA154[IQR125–193]、MCA350[322–396]、PCA180[151–214]mL。模型ACA≈139–144、MCA≈297–308、PCA≈90–93mL。**Questionable**，尤其PCA：不同图谱、脑正规化与分配方法使世代IQR不能当强制界限。[Liu atlas][atlas]提供拓朴，不验证这些正规化血管体积。所有分支列同此判定；在解剖一致的重新校正前**不改**。

| 血管识别名称 | 右侧 mL | 左侧 mL | 中线／其他 mL |
|---|---:|---:|---|
| brachiocephalic | | |756.730|
| subclavian_prox_r / subclavian_prox_l |305.819|306.784| |
| subclavian_dist |0|0| |
| cca_r / cca_l |450.911|457.034| |
| ica_cervical |450.911|457.034| |
| eca,eca_facial,eca_sta,eca_maxillary,eca_occipital |0|0|排除颅外组织|
| va_extracranial |305.819|306.784| |
| ica_petrous_cavernous |450.911|457.034| |
| ophthalmic |0|0|视网膜不列入脑|
| ica_ophthalmic_seg |450.911|457.034| |
| ica_terminal |449.595|455.873| |
| acha |9.016|8.621| |
| aca_a1 |143.853|138.960| |
| acomm | | |0; 排除交通路径|
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
| pcomm,tuberothalamic |1.316|1.161|仅直接供血|
| trigeminal_persistent |—|—|仅变异，无默认体积|
| va_v4_prox |305.819|306.784| |
| va_v4_dist |271.397|271.572| |
| lat_medullary_perf |.761|.937| |
| asa_root |.755|.754| |
| asa | | |0脑；排除脊髓组织|
| pica |34.422|35.212| |
| pica_medial |4.511|4.577| |
| pica_lateral |29.615|30.271| |
| basilar_lower | | |269.748|
| basilar_mid | | |245.312|
| basilar_upper | | |241.410|
| basilar_tip | | |185.352|
| aica |11.404|11.478| |
| labyrinthine |0|0|排除内耳|
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

侧支路径没有独立固定组织体积：双侧 `lepto_aca_mca_{precentral,central,parietal,frontal,orbital}`、`lepto_pca_mca_{parietal,superior_parietal,occipital,temporal}`、`lepto_aca_pca_callosal`、`lepto_pica_aica`、`lepto_aica_sca`、`lepto_pica_sca_{lateral,vermian}`、`coll_acha_pchor`、`coll_ec_ic_{orbital,meningeal}`、`coll_occipital_va`，另有中线 `lepto_pica_crossed` 与 `lepto_sca_crossed`。

<a id="verification-and-limits"></a>
## 验证与限制

独立涵盖：每个表列皆重新检视。实测引文对照引用原始来源摘要／全文或索引的原始文字；精确、未验证系数保留 Questionable 判定。139项解剖数值从汇入解剖与手绘图边独立重算，139/139皆符合0.00051mL四舍五入容差。脑体积1250.8mL与总血流557.0384059826916mL/min也可重现。这建立模型算术，不是解剖有效性。

测试审查：eTICI边界是原发表百分比；零救回比较治疗与未治疗模拟。新的grade1叙述断言在修正前HEAD失败（1failed/19passed）。30%截止值现检查略低／高于它的行为。偏移带字面值确实来自Ropper，但此检查与默认手术≤48h都不建立临床有效性。ADC半曲线测试曾错误呈现为已发表边界，现明示为示意模型回归，另有DWI透亮效应检查。字串断言防止双语措辞漂移，不验证试验效果。

提交的原始验证历史不是独立证据：9fcab32本身改了codexReview1.test.ts，与原最后一句矛盾。这次重查不改该档，也不提交。修正程式的独立最终验证：`npx tsc --noEmit`结束0；`npx vitest run`结束0，90/90档、10,019/10,019测试通过（507.97s），含20医学数值测试与5个未改codexReview1测试。工作档与HEAD blob杂凑同为 `b8b7762457460d77d240fd9cf1c6becb2aace3cb`。jsdom canvas与React act警告不造成失败。

这是数值来源稽核，不是临床验证。即使动机世代数字已查证，未验证校正仍存疑。支持定性机制不验证本项目精确系数。主要未完成工作是区域动力学、图谱／体积校正、概率性肿胀／脑疝、区域神经元密度；这些改变需在五档限制下另行核准阶段。


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
