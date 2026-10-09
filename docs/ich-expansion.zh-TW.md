[繁體中文](ich-expansion.zh-TW.md) · [简体中文](ich-expansion.zh-CN.md) · [English](ich-expansion.md) · [Deutsch](ich-expansion.de.md) · [日本語](ich-expansion.ja.md)

<!-- source-doc: docs/ich-expansion.md; sha256: 6ae6e4bffde2e867fabff79d3bfdf546f13652f2dc46d03bf51cae51cf75bddc -->

<a id="intracerebral-hemorrhage-expansion-risk"></a>
# 腦內出血血腫擴大風險

此獨立教育計算器重現 Al-Shahi Salman et al. 在 *Lancet Neurology*（2018）的四因子模型，[DOI 10.1016/S1474-4422(18)30253-9](https://doi.org/10.1016/S1474-4422(18)30253-9)。[出版者 PDF](https://www.pure.ed.ac.uk/ws/portalfiles/portal/74826881/PIIS1474442218302539.pdf)在第 3 頁列資格條件，第 7 頁列方程式與驗證。它獨立於動脈梗塞模擬。

<a id="published-equation"></a>
## 發表的方程式

```text
PI = -4.426 - 0.230 * t - 0.0776 * V
     + 1.196 * sqrt(V) + 0.310 * A + 1.065 * C
p = 1 / (1 + exp(-PI))
```

`t` 是症狀發作至基準影像的時間，以小時計。`V` 是該基準影像的血腫體積，以 mL 計。`A` 與 `C` 分別記錄症狀發作時的抗血小板與抗凝血治療：有為 1、無為 0；不記錄後續新增或停用藥物。未知輸入不代表零，不新增臨床預設值或風險類別截止值。

來源把擴大定義為基準與重複影像間增加「超過 6 mL」。重複影像在發作後不到六天取得，超過 80% 病人在 48 小時內重複影像。因此輸出不是固定的 24 小時機率。

<a id="population-and-input-domain"></a>
## 族群與輸入範圍

來源納入 18 歲以上成人，為自發性、非外傷性腦內出血，可能源於腦小血管疾病，且影像未發現潛在結構性病因。基準影像於發作後 0.5 至 24 小時取得，基準血腫體積小於 150 mL。計算器要求正值且低於 150 mL 的實測體積，以及已知、位於上述含端點時間窗內的影像時間。

接受可能減少血腫體積的急性治療者被排除，包括外科清除、止血治療或降血壓。方程式不能估計這些治療的效果，也不能類推套用於外傷性出血、結構性血管病灶、出血轉化、靜脈性出血或 Duret 出血。

藥物預測因子依發表內容為二元指標。模型不提供特定藥物係數，也未建立 DOAC 專屬校正。

<a id="validation-and-interpretation"></a>
## 驗證與解釋

四因子模型以十個世代的 2,381 位病人開發，C-index 為 0.75（95% CI 0.73–0.78）；以五個世代的 895 位病人驗證，C-index 為 0.74（0.71–0.78）。作者報告校正良好。符合資格的完整統合分析有 36 個世代、5,435 位病人；較大的數目不是模型開發樣本。

這是來源族群的擴大風險估計，不預測增長體積、病灶位置或邊界、症狀、mRS 或治療效益，也不向 3D 或切片畫面新增血液或組織傷害。重現方程式不同於驗證 App 能作為臨床決策工具。

<a id="remaining-source-checks-for-the-roadmap"></a>
## 路線圖仍須查證的來源

- **靜脈壓力／流出：**[Marcotti 2015](https://pmc.ncbi.nlm.nih.gov/articles/PMC4476203/)提供穩態 Poiseuille 網路與已發表幾何。舊版幾何補充資料現已取得並轉錄為簡化八邊計算器。入口血流、深部引流比例與出口壓力由使用者輸入，不指定未查證預設值。[靜脈與出血壓力模型](venous-hemorrhage.zh-TW.md)記載來源與其餘限制。這不產生靜脈病灶。
- **脊髓恢復：**[Robertson 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3466672/)以世代結局記錄長期功能恢復，不提供連續 C1–C3 缺損恢復曲線。這些結局至本模型的定量對應仍未指定。
- **校正：**[DEFUSE 3](https://pmc.ncbi.nlm.nih.gov/articles/PMC6628906/)提供側枝分組的梗塞分布，[Wilson 2023](https://pmc.ncbi.nlm.nih.gov/articles/PMC10169426/)描述病灶分組的語言軌跡。把這些經篩選世代與實測結局映射至模型導通度或病灶比例參數仍未驗證；摘要統計不是這些參數的直接替代值。
- **中央型疝脫：**[Ropper 1993](https://pmc.ncbi.nlm.nih.gov/articles/PMC1015157/)與 [Wijdicks 1997](https://pubmed.ncbi.nlm.nih.gov/9153493/)描述續發傷害，但沒有位移與持續時間決定受損組織比例的方程式。自動產生該比例會加入缺乏支持的校正。
- **MRA 血管替換：**已驗證 TopCoW MRA008 來源項目與 CC BY-NC 4.0 授權，用於三條交通血管的顯示形狀。放置仍未驗證，遠端分支仍為手繪。[來源特定紀錄與假設](mra-communicating-shapes.zh-TW.md)區分實測形狀、手繪接線及模擬幾何。
