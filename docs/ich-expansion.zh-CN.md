[繁體中文](ich-expansion.zh-TW.md) · [简体中文](ich-expansion.zh-CN.md) · [English](ich-expansion.md) · [Deutsch](ich-expansion.de.md) · [日本語](ich-expansion.ja.md)

<!-- source-doc: docs/ich-expansion.md; sha256: 6ae6e4bffde2e867fabff79d3bfdf546f13652f2dc46d03bf51cae51cf75bddc -->

<a id="intracerebral-hemorrhage-expansion-risk"></a>
# 脑内出血血肿扩大风险

此独立教学计算器重现 Al-Shahi Salman et al. 在 *Lancet Neurology*（2018）发表的四预测因子模型，[DOI 10.1016/S1474-4422(18)30253-9](https://doi.org/10.1016/S1474-4422(18)30253-9)。[出版方 PDF](https://www.pure.ed.ac.uk/ws/portalfiles/portal/74826881/PIIS1474442218302539.pdf)第 3 页提供纳入条件，第 7 页提供公式及验证。它独立于动脉梗死模拟。

<a id="published-equation"></a>
## 已发表公式

```text
PI = -4.426 - 0.230 * t - 0.0776 * V
     + 1.196 * sqrt(V) + 0.310 * A + 1.065 * C
p = 1 / (1 + exp(-PI))
```

`t` 为症状起病至基线影像的时间，以小时计。`V` 为基线影像中的血肿体积，以 mL 计。`A` 和 `C` 分别记录症状起病时的抗血小板和抗凝治疗，彼此独立：是为 1，否为 0。不记录之后给予或停用的药物。未知输入不等于零，不添加临床默认值或风险类别截止值。

来源将扩大定义为基线与复查影像之间增加“超过 6 mL”。复查在起病后不足六天进行；超过 80% 的患者在 48 小时内复查。因此，输出不是固定 24 小时概率。

<a id="population-and-input-domain"></a>
## 人群和输入范围

来源纳入年龄至少 18 岁、自发性非创伤性脑内出血成人，出血可能源于脑小血管病，影像未发现基础结构性病因。基线影像时间为起病后 0.5 至 24 小时，基线血肿体积小于 150 mL。计算器要求正的实测体积且低于 150 mL，并要求已知影像时间处于上述包含端点的窗口内。

接受可能减小血肿体积的急性治疗者被排除：手术清除、止血治疗或降压。公式不能估计这些治疗的效果，也不能类推用于创伤性出血、结构性血管病灶、出血性转化、静脉出血或 Duret 出血。

药物预测因子是原文发表的二元指示变量。模型不提供药物特异性系数，也不建立 DOAC 特异性校准。

<a id="validation-and-interpretation"></a>
## 验证和解释

四预测因子模型使用十个队列的 2,381 名患者建立，C-index 为 0.75（95% CI 0.73–0.78）；使用五个队列的 895 名患者验证，C-index 为 0.74（0.71–0.78）。作者报告校准良好。完整符合条件的荟萃分析包含 36 个队列的 5,435 名患者；该较大人数不是模型开发样本。

这是来源人群中的扩大风险估计。不预测体积增长量、病灶位置或边界、症状、mRS 或治疗获益。不向 3D 或切片视图添加血液或组织损伤。重现公式与验证应用作为临床决策工具是不同的工作。

<a id="remaining-source-checks-for-the-roadmap"></a>
## 路线图仍需核查的来源

- **静脉压力／流出：**[Marcotti 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4476203/)提供稳态 Poiseuille 网络及已发表几何。旧版几何补充材料现已获取并转录，用于缩减的八条边计算器。流入、深部引流比例及出口压力由用户输入，不指定未经验证的默认值。[静脉和出血压力模型](venous-hemorrhage.zh-CN.md)说明来源及剩余限制。不生成静脉病灶。
- **脊髓恢复：**[Robertson 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3466672/)通过队列结局记录长期功能恢复，但不提供连续的 C1–C3 缺损恢复曲线。这些结局至本模型的定量映射仍未规定。
- **校准：**[DEFUSE 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC6628906/)提供侧支组梗死分布，[Wilson 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10169426/)描述病灶组语言轨迹。将这些经筛选队列及实测结局映射到模型导流系数或病灶比例参数仍未经验证；汇总统计不能直接替换这些参数。
- **中央型脑疝：**[Ropper 1993](https://pmc.ncbi.nlm.nih.gov/articles/PMC1015157/)及 [Wijdicks 1997](https://pubmed.ncbi.nlm.nih.gov/9153493/)描述继发损伤，但不提供由位移和持续时间计算组织损伤比例的公式。自动生成该比例会添加缺乏依据的校准。
- **MRA 血管替换：**已验证 TopCoW MRA008 来源条目及 CC BY-NC 4.0 许可，用于三条交通动脉显示形状。位置仍未经验证；远端分支仍为人工绘制。[来源专属证据与假设](mra-communicating-shapes.zh-CN.md)区分实测形状、人工连接段及模拟几何。
