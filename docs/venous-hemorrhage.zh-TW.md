[繁體中文](venous-hemorrhage.zh-TW.md) · [简体中文](venous-hemorrhage.zh-CN.md) · [English](venous-hemorrhage.md) · [Deutsch](venous-hemorrhage.de.md) · [日本語](venous-hemorrhage.ja.md)

<!-- source-doc: docs/venous-hemorrhage.md; sha256: e0922c1f8253a0404e08719c68cbf78f9f92bcb71e85efe5bdc7a99f3a4fc835 -->

<a id="venous-outflow-and-observed-hematoma-pressure"></a>
# 靜脈流出與觀測血腫壓力

這些獨立研究計算器顯示於「詳細資訊」，不改目前的動脈病例、組織傷害、症狀、3D 幾何或切片。所有臨床輸入初始為空；半徑比例初始為 1，代表正規化的開放參考配置，不是病人量測。

<a id="reduced-venous-network"></a>
## 簡化靜脈網路

來源為 Marcotti et al. (2015)，[DOI 10.1186/s12883-015-0352-y](https://doi.org/10.1186/s12883-015-0352-y)。穩態網路使用 Poiseuille 阻力與已發表血管幾何。文章採 CC BY 4.0，資料除另有聲明外採 CC0。取得的舊版幾何 DOCX 的 SHA-256 為 `d9254e9f2a4208fad9ab2261f537502d126607997f544c4d8bae0cdbfb172207`。[舊版補充資料](https://static-content.springer.com/esm/art%3A10.1186%2Fs12883-015-0352-y/MediaObjects/12883_2015_352_MOESM1_ESM.docx)提供以下長度與直徑，單位 cm：

| 血管 | 長度 | 直徑 |
|---|---:|---:|
| 上矢狀竇 | 19.22 | 0.45 |
| 直竇 | 3.96 | 0.17 |
| 每側橫竇 | 5.25 | 0.88 |
| 每側乙狀竇 | 12.25 | 0.53 |
| 每側內頸靜脈 | 15 | 1.7 |

來源黏滯係數為 3 cP（0.003 Pa·s）。阻力為 `128 × viscosity × length / (π × diameter⁴)`，內部採 SI 尺度。直徑除以二得到半徑。來源的零出口壓力是表壓參考，不是病人中心靜脈壓。

App 把網路簡化為八條邊：上矢狀竇與直竇流入竇匯，再經雙側橫竇、乙狀竇與內頸靜脈至共同出口。省略來源額外的脊髓及側枝路徑，不是完整發表網路或其驗證結果的重現。

使用者提供總腦靜脈血流、進入直竇的比例及共同出口壓力。深部比例位於 [0, 1]，每個剩餘管腔半徑比例也位於 [0, 1]。幾何與黏滯係數固定時，導通度隨比例的四次方變化。把輸入比例解釋為血栓作用是建模假設，不是血栓負荷量表。不從論文推導臨床入口血流或出口壓力預設值。

計算施加穩態流入，求解壓力與雙側引流，假設剛性血管、層流與固定黏滯係數。不把靜脈壓回饋耦合至腦動脈灌流，不模擬血管塌陷、順應性、再通、組織傷害或臨床結局。省略的側枝路徑可能改變阻塞反應。

若施加的血流無法離開不連通部分，不存在有限穩態壓力解；回報的是模型不連通，不是病人 ICP 無限大。不連通、零血流部分的壓力未定。數值溢位明確回報，不以封頂壓力替代。

<a id="observed-hematoma-pressure-effect"></a>
## 觀測血腫的壓力效應

壓力–體積關係依 Marmarou et al. (1978)，[DOI 10.3171/jns.1978.48.3.0332](https://doi.org/10.3171/jns.1978.48.3.0332)：

```text
ICP = baselineICP × 10^(observedAddedHematomaVolume / enteredPVI)
CPP = enteredMAP − ICP
```

PVI 是此關係中使壓力增加十倍所需的體積。體積與 PVI 採 mL；ICP 與 MAP 採 mmHg。新增體積必須非負，基準 ICP、PVI 與 MAP 必須為正。輸入的額外體積是觀測值，不是獨立 ICH 擴大風險計算器的預測值。

原模型以貓實驗驗證。後續成人研究在七位無占位性病灶成人報告 PVI 25.9 ± 3.7 mL（[Shapiro et al., 1980](https://doi.org/10.1002/ana.410070603)）；這個小型、不同族群提供背景，不提供預設值或容許範圍。

在固定分室內立即把關係套用至血腫體積，**對腦內出血尚未驗證**。計算器不模擬腦脊髓液位移或儲備、動態代償血流、水腫、病灶邊界、症狀、治療效果或臨床結局。負 CPP 是此純量計算中的負壓力梯度，不預測負血流。溢位是數值狀態，不是臨床壓力估計。

<a id="remaining-work"></a>
## 其餘工作

空間靜脈梗塞、出血病灶、症狀與動態耦合仍不在計算器範圍內。路線圖完成範圍僅為簡化流出與觀測體積壓力計算。

<a id="spatial-coupling-source-audit"></a>
## 空間耦合來源稽核

於 2026-10-09 對照官方來源查核存取條件與標籤意義。單憑流出壓力解不能識別受傷體素：沒有病人靜脈引流區，也沒有灌流、供氧、血栓、側枝招募及組織傷害的歷史。不從網路推導壓力至傷害閾值或病灶邊界。尚未找到供耦合實作用的成對 CVST 壓力／流出量測、病灶遮罩、時程與經驗證模板配準。

- [PhysioNet CT-ICH v1.3.0](https://physionet.org/content/ct-ich/1.3.0/)保留 CC BY 4.0 中繼資料，但明示檔案已不可取得。[v1.3.1](https://physionet.org/content/ct-ich/1.3.1/)要求註冊及受限健康資料協議。不使用受限檔案或非官方鏡像。世代是混合出血亞型的外傷性腦傷，不是自發性 ICH 壓力驗證世代。
- [PHE-SICH-CT-IDS v4](https://doi.org/10.6084/m9.figshare.23957937.v4)可由官方 Figshare 紀錄依 CC BY 4.0 取得。[原發表](https://doi.org/10.1016/j.compbiomed.2024.108342)指定**血腫周圍水腫**標籤，不是血腫分割。以 range 檢視壓縮檔，驗證 case 0001 原生 CT 與二元遮罩的 ZIP CRC。兩者尺寸皆為 512 × 512 × 32、仿射轉換相符，CT 體素間距為 0.5078125 × 0.5078125 × 5 mm。遮罩有 7,962 個正值體素，幾何標籤區體積為 10.265945434570312 mL。這是**水腫區體積，不是血液體積，也不是淨新增水量**；不送入 PVI 計算器，不捏造模板配準或臨床傷害標籤。
- [BHSD 官方資料庫](https://github.com/White65534/BHSD)聲明非商用、禁止衍生限制，並禁止修改後用於另一資料集。這些權限不支持把轉換後遮罩當作 App 新資產發布。
- [INSTANCE 官方參與規則](https://instance.grand-challenge.org/Participation/)要求簽署資料協議，限競賽使用，明確禁止再發布與其他用途。未取得標註。

檢視的 Figshare 壓縮檔項目為 `63081925`、`PHE-SICH-CT-IDS.zip`，1,300,209,108 位元組。出版者報告 MD5 `a2c3f32f11478167b975d5036edbb510`；未下載完整壓縮檔，所以未獨立驗證全檔雜湊。擷取個案雜湊：

| 來源項目 | SHA-256 |
|---|---|
| `SubdatasetA_NIFIT/NIFIT/set/0001.nii.gz` | `152328fd8bcee0467544bc24630decdf0ea3955440e074f98e621aa382825f7d` |
| `SubdatasetA_NIFIT/NIFIT/label/0001.nii.gz` | `287e3622f24195c08baf7f296d0c679402f3e1a6e64912194ef5ec18bbd421c2` |

觀測遮罩視覺化需要明確標籤語義、物理單位及影像／遮罩對齊。把遮罩耦合至解剖缺損規則，還需要經驗證圖譜轉換，以及標籤代表相關傷害的證據。壓力公式不提供這些檢查。
