[繁體中文](deficit-grading.zh-TW.md) · [简体中文](deficit-grading.zh-CN.md) · [English](deficit-grading.md) · [Deutsch](deficit-grading.de.md) · [日本語](deficit-grading.ja.md)

<!-- source-doc: docs/deficit-grading.md; sha256: abaf3ee34ec2fa622ca6010924de0c11853b99e25079eb0a80c20061fb01f173 -->

<a id="continuous-model-deficits-and-ordinal-examination-grades"></a>
# 连续模型缺损与序位检查分级

模型将代偿后的缺损程度保留为 `SymptomItem.continuousSeverity`，范围为 0 至 3。这是内部教学模型数值，不是实测临床量表或概率。`deadContinuousSeverity` 保留归因于永久组织损伤的相应程度，供比较使用。现有组织、代偿、可察觉程度及症状阈值不变。旧有 `sev` 值（所列症状为 1、2 或 3）仍供现有症状规则使用。不添加迟滞或随时间变化的分级状态。

<a id="nihss-is-an-ordinal-bedside-examination"></a>
## NIHSS 是床旁检查的序位量表

[NINDS NIH Stroke Scale](https://www.ninds.nih.gov/sites/default/files/2025-03/KnowStroke_NIHStrokeScale_March2025_508c.pdf)定义检查类别。已查阅的[美国卒中协会 NIHSS 指南副本](https://www.stroke.org/-/media/Data-Import/downloadables/5/2/3/NIH-Stroke-Scale-UCM_490144.pdf?rev=c72312713d574cf494fc406be288c3f6)要求根据检查中观察到的患者表现评分。运动项目依次为维持肢体且无下落（0）、下落（1）、有限的抗重力运动（2）、无抗重力运动（3）、无运动（4）。感觉项目区分正常（0）、部分障碍（1）和严重或完全障碍（2）。

来源中的运动标签包括“No drift”（无下落）、“Some effort against gravity”（部分抗重力运动）、“No effort against gravity”（无抗重力运动）和“No movement”（无运动）。这些描述检查表现，不是梗死体积截止值。

这些有序类别不代表级别之间距离相等：相差一分不对应固定的力量或感觉差。因此，算术插值是模型的呈现选择，不是 NIHSS 指南提供的临床解释。不能仅凭梗死图、组织体积或动脉阻塞计算患者 NIHSS。评分由床旁表现和规定检查决定。

<a id="motor-presentation-uses-existing-anchors"></a>
## 运动呈现使用现有锚点

对上肢和下肢无力，呈现方式将连续模型严重度映射至 `src/anatomy/symptoms.ts` 中现有的 `nihss.pts` 锚点：

| 模型程度 | 运动映射锚点 |
| --- | --- |
| 0 | 0 |
| 1 | 现有轻度项目分数，`pts[0]` |
| 2 | 现有中度项目分数，`pts[1]` |
| 3 | 现有重度项目分数，`pts[2]` |

相邻锚点之间线性插值。所显示运动级别四舍五入到最近整数。已列出且大于零的运动缺损至少保留现有轻度锚点 `pts[0]`。现有常见无力锚点 `[1, 3, 4]` 可在轻度和中度之间显示中间级别 2。具有其他现有运动锚点的症状保留那些锚点，不重新校准。最高级别不要求模型程度恰好达到 3，也不意味着相关纤维束组织全部受损。

此量化方式保留现有病灶校准，不会仅因仍有组织存留就重新分类已确立的经典综合征。它不验证该类别能预测床旁表现。尤其是，显示最高运动级别只是示意性模型估计，并不证明某个患者没有自主运动。连续程度可以变化，而估计整数级别保持不变。

锚点和映射属于启发式方法。不引入实证病灶至力量阈值、新病灶边界、治疗效应量或患者校准。微小解剖变化可以改变连续模型值，仅凭这一点不能确定患者获得类别层面的获益。

<a id="other-examination-items-and-limits"></a>
## 其他检查项目及限制

其他项目保留现有 NIHSS 序位规则。官方范围包括感觉 0–2、面部运动 0–3、语言 0–3、构音 0–2、视野 0–3、水平凝视 0–2、肢体协调 0–2、消退／忽视 0–2。目录中现有 `pts` 数组是与这些类别的教学性对应，不是经过临床校准的病灶阈值。意识及无法完成所要求动作等检查依赖关系，仍是现有估算器的一部分。

估计 NIHSS 仍为整数，所以类别及总分变化仍可呈阶梯状，包括舍入边界两侧相邻模型值。现有评分保护继续避免将微小双侧变化当成巨大的合计运动评分获益。未折叠的连续程度独立于序位量化，支持恢复比较和缺损显示。它单独保存，不作为小数 NIHSS 报告。两者都不能提供改良 Rankin 量表换算、个体预后或实测治疗获益。
