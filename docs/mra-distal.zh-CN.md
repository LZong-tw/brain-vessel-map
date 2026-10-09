[繁體中文](mra-distal.zh-TW.md) · [简体中文](mra-distal.zh-CN.md) · [English](mra-distal.md) · [Deutsch](mra-distal.de.md) · [日本語](mra-distal.ja.md)

<!-- source-doc: docs/mra-distal.md; sha256: 0d90349629731f2d16e164fcaecdf044aec8c7e3592fe4507a479a3fac629ad8 -->

<a id="individual-mra-distal-vessel-reference"></a>
# 个体 MRA 远端血管参考

此参考包含来自 **Bravissima BG0001** 的真实个体 MRA 动脉几何，不是群体概率图谱。来源将 BraVa 重建转换为个体 NIfTI 体积，并通过 SPM8 归一化至 MNI152。[项目及 Attribution 许可证](https://www.nitrc.org/projects/bravissima/)；[来源 README](https://www.nitrc.org/docman/view.php/1266/78741/Readme43)。

包含中央 Willis 环前／CoW 组及左右 ACA、MCA、PCA 全部六组。来源没有标注角回动脉或距状沟动脉等个别远端分支。本项目不虚构这种对应，这些参考点也没有模拟分支灌注或阻塞状态。生理路径、拓扑、半径和模型参数不变。

在可选 3D 参考模式中，来源几何替代人工绘制的血管显示。由于不存在具名分支对应，隐藏模拟血管点击目标、血栓标记和血流粒子。栓子生命周期继续运行但不可见，因此切换解剖视图不会暂停现有病例。脑颜色仍描述当前动脉模拟，不是此参考受试者的预测病灶。模式默认关闭，按需加载；加载失败时保留模拟显示并提供重试。不改变病例参数或变异来匹配来源受试者。

血管组选择和相机导航支持键盘、可见焦点指示及五种语言标签。隐藏半球的血管组和完全位于裁剪平面外的组不纳入焦点目标。即使控件折叠，来源位置限制仍保持可见。

<a id="geometry-and-limitations"></a>
## 几何和限制

保留所有带来源组标签 1–7 的有限值体素，包括孤立体素及不连通分量。排除零、NaN 和无穷值。坐标是以零为起点的体素中心，经来源 NIfTI 仿射变换。1 mm 来源体积采用 LAS 体素轴；仿射将索引转换为世界坐标，正 x 位于右侧。不施加额外位置变换。与项目 MNI152NLin2009cAsym 脑模板的配准**未经验证**。

提供的线段只连接直接 26 邻域中已有标签的体素。这是明确的**显示邻接假设**，不是原始 SWC 父节点图。邻近血管可产生额外边或环。不跨越间隙连接，不平滑、细化、重采样或移动点。因此，该资源保留实测来源体素几何，不宣称是精确连通的解剖树或经过验证的小分支身份。

`public/data/mra-distal.json` 包含点、逐点血管组标签、相邻点索引对、组计数和连通分量统计。孤立点即使没有线段也保留在点数组中。附带来源 JSON 记录原始仿射、解码规则、来源 README、许可证、哈希和来源特有假设。

<a id="reproduction"></a>
## 重现

安装 Python、NumPy 和 nibabel 后，从仓库根目录运行：

```sh
python tools/build_bravissima.py
```

生成器检查完整 12 MB 来源压缩包的固定 SHA256、外层 ZIP CRC、选定内层 ZIP 条目 CRC 及其固定 SHA256。使用个体 `srcgBG0001.nii` 组体积，不使用平均组图谱。输出确定且不包含非有限 JSON 数值。来源文件缓存于忽略目录 `tools/.cache/bravissima/`。

<a id="attribution"></a>
## 署名

Herron TJ, Dronkers N, Turken AU. *BraVa cerebral artery database converted to NIFTI MRI format*（2017 年海报，未经同行评审）。[DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1)。

原始 BraVa：Wright et al. *Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography*. NeuroImage82（2013），170–181。[DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089)；[BraVa](http://cng.gmu.edu/brava)。

来源指定 **Attribution**，未标明 Creative Commons 版本。在 `public/data/MRA_DISTAL_LICENSE.txt` 中保留来源原始条款；这些数据与应用软件许可证及 TopCoW CC-BY-NC 数据分开。不暗示来源作者认可本项目。
