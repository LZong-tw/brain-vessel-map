[繁體中文](slices.zh-TW.md) · [简体中文](slices.zh-CN.md) · [English](slices.md) · [Deutsch](slices.de.md) · [日本語](slices.ja.md)

<!-- source-doc: docs/slices.md; sha256: 37bb92d75e33cf151acbdf7addf21d125076a6336b19d260ba45380f9bc2e387 -->

<a id="mri-slices-and-territory-references"></a>
# MRI 切片及供血区域参考

切片背景为 [TemplateFlow](https://github.com/templateflow/tpl-MNI152NLin2009cAsym)分发的真实 1 mm ICBM 152 nonlinear asymmetric 2009c T1 模板。[模板元数据](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/template_description.json)规定网格为 193 × 229 × 193、间距 1 mm、原点 (-96, -132, -78) mm。导出器将下载 NIfTI 的仿射与该 RAS 网格核对。显示强度使用来源最大值线性量化为八位。

供血区域轮廓来自 [Liu et al. 动脉图谱](https://github.com/Chin-Fu-Liu/Arterial_Atlas)，根据 1,298 名患者的病灶分布建立；见 [Scientific Data 原始论文](https://doi.org/10.1038/s41597-022-01923-0)。出版方仓库标明 30 个动脉分区及脑室标签。只显示 30 个动脉标签；非动脉标签映射为零。导出器固定来源版本，生成清单记录每个下载输入的 SHA-256。最近邻采样保留动脉标签 ID。

<a id="alignment-and-interpretation"></a>
## 对齐和解释

Liu 来源将空间描述为 MNI，并未具体指定 MNI2009c。此视图复用项目既有的近似图谱至模板映射：`atlas voxel = (89 - RAS x, RAS y + 126, RAS z + 72)`。不宣称新获得了临床配准验证。导出器报告左右标签质心、图谱与模板 aseg 分割的重叠及模板覆盖率，供审阅该近似关系。

这些轮廓是**群体图谱参考供血区域**，不是预测患者病灶边界。独立热图将当前模型的供血床梗死比例重复显示于所有分配给该供血床的体素。它不定位供血床内部受损的部分，也不施加病灶阈值。体素供血床使用既有资源构建器重建，与全部已提交供血床 ID 和体积核对，并按现有网格供血床列表排序。这是项目的功能性供血床分配，包含其解剖启发式方法，不是新测量的体素病灶掩膜。不重写现有网格、生成供血床或医学参数。

<a id="rebuilding-and-binary-layout"></a>
## 重建和二进制布局

安装 `tools/requirements.txt`，运行 `python tools/build_slices.py`。来源 NIfTI 缓存于 `tools/.cache`；下载经过验证并以原子方式写入。损坏缓存会重新下载。如果供血床 ID、体积或模板仿射与现有资源不同，重建失败。

`public/data/slices.bin.gz` 是 gzip 流，在相同完整分辨率网格上依次连接三个数组：T1 uint8、供血区域 uint8、little-endian 供血床 uint16。数组以 x 为最快变化轴：`x + nx * (y + ny * z)`。清单偏移指解压后的字节。供血床零表示未分配；供血床 n 索引 `beds[n - 1]`。清单记录压缩内容 SHA-256、长度、来源和验证。浏览器加载需要 gzip 解压支持，并明确报告不支持的浏览器。

<a id="attribution-and-license"></a>
## 署名和许可

派生的 `slices.json` 和 `slices.bin.gz` 依 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)分发，包括 Liu 图谱署名：Digital 3D Brain MRI Arterial Territories Atlas，© 2021 The Johns Hopkins University；Liu CF et al., Scientific Data 2023;10:74。供血床映射还派生自 DKT31（Klein & Tourville 2012，CC BY 4.0）和 MIAL67（Najdenovska et al. 2018，CC BY 4.0）。见 `public/data/LICENSE.txt`。

模板的 [MNI 许可证](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/LICENSE)要求保留以下声明。以下为原文法律声明，不以中文说明替代：

Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre,
Montreal Neurological Institute, McGill University. Permission to use, copy,
modify, and distribute this software and its documentation for any purpose and
without fee is hereby granted, provided that the above copyright notice appear
in all copies. The authors and McGill University make no representations about
the suitability of this software for any purpose. It is provided “as is” without
express or implied warranty. The authors are not responsible for any data loss,
equipment damage, property loss, or injury to subjects or patients resulting
from the use or misuse of this software package.
