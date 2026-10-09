[繁體中文](mra-communicating-shapes.zh-TW.md) · [简体中文](mra-communicating-shapes.zh-CN.md) · [English](mra-communicating-shapes.md) · [Deutsch](mra-communicating-shapes.de.md) · [日本語](mra-communicating-shapes.ja.md)

<!-- source-doc: docs/mra-communicating-shapes.md; sha256: b5221bd573f65557c3c4049216a9b292f86f3cb7844fd35f33f1e30b9c38588c -->

<a id="mra-derived-communicating-vessel-shapes"></a>
# 源自 MRA 的交通动脉形状

三条交通动脉的显示曲线来自真实分割 MRA 中心线，不是血管概率图谱。来源为 TopCoW MRA 病例 008，由 Musio et al. 的 *Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm*（2025 年预印本，[arXiv:2510.13720](https://arxiv.org/abs/2510.13720)）发表；[数据集发布于 2025-10-15](https://zenodo.org/records/17358162)。来源及派生数据适用 **CC-BY-NC-4.0**，与软件许可证分开；见 `src/anatomy/generated/MRA_LICENSE.txt`。

<a id="scope-and-assumptions"></a>
## 范围和假设

仅生成右 PCom（标签 8）、左 PCom（标签 9）和 ACom（标签 10）的显示形状。远端分支仍为人工绘制。它不是完整患者血管树，也没有经过到 MNI 空间配准的验证。来源物理单位及绝对方向尚未独立确认。不使用来源长度或半径作为生理参数。

每条选取路径在具名来源边界之间连通、无环且唯一。PCom 边界接触侧别正确的 ICA 和 PCA 标签。ACom 沿右至左 ACA 路径；明确排除来源中的第三 A2 侧支，包括两条标签 10 的短残段边。

每条曲线采用一个**正相似变换**：旋转（不反射）、平移和均匀缩放。不单独扭曲任何点。以五个标志点估计的全局旋转初始化轴向方向；来源 MCA 终点与项目 M1 终点只是近似对应。随后对齐每条曲线的端点方向，并均匀缩放至现有模型连接点间距。这是未经验证的显示假设，不是物理解剖测量或来源与模板的配准。

连接锚点优先使用父血管实际显示路径，否则使用其生理路径。目前 ICA 末端、PCA P1 和 ACA A1 锚点没有独立的显示覆写，与现有交通动脉路径端点一致。人工绘制的丘脑结节动脉子分支连接段跟随新 PCom 折线的半弧长点。只改变每个连接段的第一个点，其余点保留。这些连接段明确归类为人工绘制，不是 MRA 实测几何。模拟路径、拓扑、长度、半径及血流参数不变。各曲线均匀缩放系数不同，不能将其理解为实测血管尺寸。

<a id="reproduction-and-verification"></a>
## 重现和验证

安装 Python 和 NumPy 后，从仓库根目录运行：

```sh
python tools/build_mra_communicating.py
```

忽略缓存中缺少来源时，生成器仅通过 HTTP 范围请求获取固定的 ZIP 条目。它检查各解码条目的大小、CRC32 和固定 SHA256。**完整压缩包 MD5 未经验证。**原始图和节点描述、来源哈希、来源点 ID、变换、连接锚点、变异及几何检查保存在 `mraCommunicatingAudit.json`。生成器验证唯一通路、正交且不反射的旋转、精确端点位置及均匀线段缩放。生成坐标保留小数点后十位，不改变生理模型几何。

面向用户的表述：**交通动脉形状源自 MRA；位置未经验证；远端分支为人工绘制。**
