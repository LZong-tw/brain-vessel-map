[繁體中文](mra-communicating-shapes.zh-TW.md) · [简体中文](mra-communicating-shapes.zh-CN.md) · [English](mra-communicating-shapes.md) · [Deutsch](mra-communicating-shapes.de.md) · [日本語](mra-communicating-shapes.ja.md)

<!-- source-doc: docs/mra-communicating-shapes.md; sha256: b5221bd573f65557c3c4049216a9b292f86f3cb7844fd35f33f1e30b9c38588c -->

<a id="mra-derived-communicating-vessel-shapes"></a>
# MRA由来の交通血管形状

三本の交通血管の描画曲線は血管確率アトラスではなく、実際に分割されたMRA中心線から生成しています。TopCoW MRA症例008、Musio et al., *Circle of Willis Centerline Graphs: A Dataset and Baseline Algorithm*（2025年プレプリント、[arXiv:2510.13720](https://arxiv.org/abs/2510.13720)）、[2025-10-15公開データ](https://zenodo.org/records/17358162)が出典です。原データと派生物はソフトウェアとは別の**CC-BY-NC-4.0**です。`src/anatomy/generated/MRA_LICENSE.txt`を参照してください。

<a id="scope-and-assumptions"></a>
## 範囲と仮定

準備した描画形状は右PCom（ラベル8）、左PCom（ラベル9）、ACom（ラベル10）だけです。遠位枝は手作成のままです。患者の血管樹全体でも、MNI空間への検証済み位置合わせでもありません。原データの物理単位と絶対的な向きは独立に確立していません。原データの長さや半径を生理学的パラメータに使用しません。

各選択経路は具名の原データ境界間で連結し、循環がなく、一意です。PCom境界は左右が正しいICAとPCAラベルに接します。AComは右から左へのACA経路に従い、原データの第三のA2側枝と二本のラベル10の短い辺を明示的に除外します。

配置には曲線ごとに一つの**正の相似変換**（反転しない回転、平行移動、一様スケール）を用います。個別点は変形しません。概略の全体五ランドマーク回転を軸方向の初期値とします。原データのMCA終点とプロジェクトM1終点は概略の対応だけです。各曲線は終点方向を揃え、既存のモデル接続点間距離へ一様に拡大縮小します。これは未検証の表示仮定であり、物理的解剖測定や原データとテンプレートの位置合わせではありません。

接続点は、利用可能なら実際の親の描画経路、それ以外は親の生理学的経路を用います。現在、ICA終末部、PCA P1、ACA A1の接続点には独立した描画上書きがなく、既存交通経路の終点と一致します。手作成の視床結節動脈の子描画接続線は、新しいPCom折れ線の弧長中点に従います。変わるのは各接続線の最初の点だけで、残りは保持します。これらは実測MRA形状ではなく手作成と明記します。シミュレーション経路、トポロジー、長さ、半径、血流パラメータは変更しません。曲線間で一様スケールが異なり、実測血管寸法とは解釈できません。

<a id="reproduction-and-verification"></a>
## 再現と検証

PythonとNumPyを導入し、リポジトリルートから実行します。

```sh
python tools/build_mra_communicating.py
```

生成器は無視対象キャッシュにない場合、固定したZIPエントリだけをHTTP範囲取得します。復号後の各エントリのサイズ、CRC32、固定SHA256を確認します。**アーカイブ全体のMD5は検証していません。** 元のグラフ・ノード記述、原データハッシュ、原データ点ID、変換、接続点、変異・形状チェックを`mraCommunicatingAudit.json`に保持します。一意な経路、正の直交回転、正確な終点配置、一様な線分スケールを検証します。生成座標は小数点以下十桁へ丸めますが、生理学的モデル形状は変更しません。

公開説明：**MRA由来の交通血管形状。配置は未検証。遠位枝は手作成。**
