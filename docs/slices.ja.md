[繁體中文](slices.zh-TW.md) · [简体中文](slices.zh-CN.md) · [English](slices.md) · [Deutsch](slices.de.md) · [日本語](slices.ja.md)

<!-- source-doc: docs/slices.md; sha256: 37bb92d75e33cf151acbdf7addf21d125076a6336b19d260ba45380f9bc2e387 -->

<a id="mri-slices-and-territory-references"></a>
# MRI切片と供血領域参照

切片背景は[TemplateFlow](https://github.com/templateflow/tpl-MNI152NLin2009cAsym)が配布する実際の1 mm ICBM 152 nonlinear asymmetric 2009c T1テンプレートです。[テンプレートメタデータ](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/template_description.json)は193 × 229 × 193グリッド、1 mm間隔、原点(-96, -132, -78) mmを指定します。書出し器は取得NIfTIアフィンがそのRASグリッドと一致するか確認します。表示強度は原データ最大値を用いて線形に八ビットへ量子化します。

領域輪郭は1,298患者の病変分布から作られた[Liu et al.の動脈アトラス](https://github.com/Chin-Fu-Liu/Arterial_Atlas)です。[原Scientific Data論文](https://doi.org/10.1038/s41597-022-01923-0)を参照してください。公開リポジトリは30動脈区画と脳室ラベルを識別します。30動脈ラベルだけ表示し、非動脈ラベルはゼロへ写像します。原版を書出し器に固定し、取得入力ごとのSHA-256を生成マニフェストに記録します。最近傍サンプリングで動脈ラベルIDを維持します。

<a id="alignment-and-interpretation"></a>
## 位置合わせと解釈

Liuの出典は空間をMNIと記し、特にMNI2009cとは指定していません。この表示は既存の概略アトラス・テンプレート対応を再利用します：`atlas voxel = (89 - RAS x, RAS y + 126, RAS z + 72)`。新たに臨床位置合わせを検証したとは主張しません。書出し器は左右ラベル重心、テンプレートaseg分割とのアトラス重複、テンプレート被覆を報告し、この近似を確認できます。

輪郭は**集団アトラスの参照供血領域**であり、患者の予測病変境界ではありません。別のヒートマップは、現在のモデルの灌流床単位の梗塞割合を、その床に割り当てた全ボクセルに繰り返します。床内で損傷部分を局在化せず、病変閾値も適用しません。既存アセット生成器でボクセル灌流床を再構成し、コミット済み床IDと体積すべてを確認し、既存メッシュ床リストの順に並べます。解剖学的経験則を含むプロジェクトの機能的床割当であり、新しい実測ボクセル病変マスクではありません。既存メッシュ、生成床、医学的パラメータは書き換えません。

<a id="rebuilding-and-binary-layout"></a>
## 再構築とバイナリ配置

`tools/requirements.txt`を導入後、`python tools/build_slices.py`を実行します。原NIfTIファイルは`tools/.cache`にキャッシュし、取得を検証して原子的に公開します。破損キャッシュは再取得します。床ID、体積、テンプレートアフィンが既存アセットと異なる場合、再構築は失敗します。

`public/data/slices.bin.gz`は同じフル解像度グリッドの三配列を連結したgzipストリームです。T1 uint8、領域uint8、little-endian床uint16の順です。配列はxが最速：`x + nx * (y + ny * z)`。マニフェストのオフセットは解凍後バイトを指します。床ゼロは未割当、床nは`beds[n - 1]`を指します。マニフェストは圧縮SHA-256、長さ、来歴、検証を記録します。ブラウザ読込はgzip解凍対応を必要とし、非対応ブラウザを明示します。

<a id="attribution-and-license"></a>
## 帰属とライセンス

派生`slices.json`と`slices.bin.gz`は[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)で配布し、Liuアトラス帰属を含みます：Digital 3D Brain MRI Arterial Territories Atlas, © 2021 The Johns Hopkins University; Liu CF et al., Scientific Data 2023;10:74。床割当はDKT31（Klein & Tourville 2012、CC BY 4.0）とMIAL67（Najdenovska et al. 2018、CC BY 4.0）にも由来します。`public/data/LICENSE.txt`を参照してください。

テンプレートの[MNIライセンス](https://github.com/templateflow/tpl-MNI152NLin2009cAsym/blob/master/LICENSE)は以下の告知を要求します。以下は翻訳した説明とは別の**原文の法的告知**です。

Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre,
Montreal Neurological Institute, McGill University. Permission to use, copy,
modify, and distribute this software and its documentation for any purpose and
without fee is hereby granted, provided that the above copyright notice appear
in all copies. The authors and McGill University make no representations about
the suitability of this software for any purpose. It is provided “as is” without
express or implied warranty. The authors are not responsible for any data loss,
equipment damage, property loss, or injury to subjects or patients resulting
from the use or misuse of this software package.
