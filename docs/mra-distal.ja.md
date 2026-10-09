[繁體中文](mra-distal.zh-TW.md) · [简体中文](mra-distal.zh-CN.md) · [English](mra-distal.md) · [Deutsch](mra-distal.de.md) · [日本語](mra-distal.ja.md)

<!-- source-doc: docs/mra-distal.md; sha256: 0d90349629731f2d16e164fcaecdf044aec8c7e3592fe4507a479a3fac629ad8 -->

<a id="individual-mra-distal-vessel-reference"></a>
# 個別MRAの遠位血管参照

この参照は集団確率アトラスではなく、**Bravissima BG0001**の実際の個別MRA由来動脈形状です。出典はBraVa再構成を個別NIfTI体積へ変換し、SPM8でMNI152へ正規化します。[プロジェクトとAttributionライセンス](https://www.nitrc.org/projects/bravissima/)、[原データREADME](https://www.nitrc.org/docman/view.php/1266/78741/Readme43)を参照してください。

Willis輪より近位・CoWの中央群と、左右のACA、MCA、PCA計六系列すべてを含みます。出典は角回動脈や鳥距動脈などの個別遠位枝を命名していません。対応を創作せず、参照点には模擬した枝灌流や閉塞状態を付けません。生理学的経路、トポロジー、半径、モデルパラメータは変更しません。

任意の3D参照モードでは原データ形状が手作成血管表示を置き換えます。具名枝との対応がないため、シミュレーション血管のヒット対象、血栓マーカー、血流粒子を非表示にします。塞栓のライフサイクルは見えないまま継続し、解剖表示の切替は症例を停止しません。脳の色は現在の動脈シミュレーションを表し、参照被験者の予測病変ではありません。モードは初期状態で無効、必要時に読み込みます。読込失敗時はシミュレーション表示を維持して再試行できます。症例パラメータや変異を原被験者に合わせて変更しません。

系列選択とカメラ移動にキーボード操作、可視フォーカス、五言語ラベルがあります。非表示半球の系列とクリッピング面の完全に外側にある系列はフォーカス対象から除きます。操作部を折り畳んでも配置制限の説明は表示します。

<a id="geometry-and-limitations"></a>
## 形状と制限

原データの系列ラベル1–7を持つ有限ボクセルをすべて保持し、孤立ボクセルや非連結成分も含めます。ゼロ、NaN、無限値は除外します。座標はゼロ始まりのボクセル中心を原NIfTIアフィンで変換します。1 mm原体積はLASボクセル軸を持ち、アフィンがインデックスを世界座標へ変換し、正のxが右です。追加配置変換はありません。本プロジェクトのMNI152NLin2009cAsym脳への位置合わせは**未検証**です。

線分は直接の26近傍に既存のラベル付きボクセルがある場合だけ接続します。これは原SWC親グラフではなく、明示的な**描画上の隣接仮定**です。隣接血管に追加の辺や循環が生じ得ます。隙間を埋めず、点の平滑化、細線化、再サンプリング、移動をしません。実測ボクセル形状を保持しますが、正確な連結解剖樹や検証済み小枝IDを主張しません。

`public/data/mra-distal.json`は点、点ごとの系列ラベル、隣接点インデックス対、系列数、成分統計を含みます。線分に含まれない孤立点も点配列に残ります。付属の来歴JSONは元のアフィン、復号規則、原README、ライセンス、ハッシュ、出典固有の仮定を記録します。

<a id="reproduction"></a>
## 再現

Python、NumPy、nibabelを導入し、リポジトリルートから実行します。

```sh
python tools/build_bravissima.py
```

生成器は完全な12 MB原アーカイブの固定SHA256、外側ZIPのCRC、選択した入れ子ZIPエントリのCRCと固定SHA256を確認します。平均群アトラスではなく個別の`srcgBG0001.nii`群体積を用います。出力は決定論的で、非有限JSON数値を含みません。原ファイルのキャッシュは無視対象の`tools/.cache/bravissima/`に残します。

<a id="attribution"></a>
## 帰属表示

Herron TJ, Dronkers N, Turken AU. *BraVa cerebral artery database converted to NIFTI MRI format*（2017年ポスター、査読なし）。[DOI10.7490/f1000research.1114378.1](https://doi.org/10.7490/f1000research.1114378.1)。

原BraVa：Wright et al. *Digital reconstruction and morphometric analysis of human brain arterial vasculature from magnetic resonance angiography*. NeuroImage82 (2013), 170–181。[DOI10.1016/j.neuroimage.2013.05.089](https://doi.org/10.1016/j.neuroimage.2013.05.089)、[BraVa](http://cng.gmu.edu/brava)。

出典はCreative Commonsの版を指定せず**Attribution**と記しています。正確な原条件を`public/data/MRA_DISTAL_LICENSE.txt`に保持してください。データはアプリのソフトウェアライセンスおよびTopCoW CC-BY-NCデータとは別です。原著者による推奨を意味しません。
