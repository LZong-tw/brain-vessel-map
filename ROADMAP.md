# 開發路線圖
# Development Roadmap

## 目前狀態 / Current Status

✅ **v0.1.0 - 初始樣板 / Initial Boilerplate**
- 基礎專案架構設置完成
- 簡化的血管圖譜和腦區
- 基於規則的阻塞引擎
- 程序化的佔位幾何
- 繁體中文和英文 UI
- 基礎單元測試

## 短期目標 / Short-term Goals

### 🔄 v0.2.0 - 增強內容 / Enhanced Content
- [ ] 新增更多血管（表淺血管系統、硬膜動脈）
- [ ] 擴展腦區細節（Brodmann 分區）
- [ ] 更詳細的症候群資料
- [ ] 改進側枝循環規則（軟腦膜吻合）
- [ ] 新增測試案例覆蓋率到 >80%

### 🔄 v0.3.0 - 視覺改進 / Visual Improvements
- [ ] 整合真實 3D 模型（BodyParts3D 或類似）
- [ ] 改進血管渲染（更平滑的曲線）
- [ ] 新增腦切面視圖（軸位、冠狀位、矢狀位）
- [ ] 動畫過渡效果
- [ ] 暗色模式支援

### 🔄 v0.4.0 - 互動增強 / Interaction Enhancements
- [ ] 時間軸功能（顯示缺血進展）
- [ ] 比較模式（並排顯示多個情境）
- [ ] 匯出功能（截圖、報告）
- [ ] 導覽模式（預設的教學場景）
- [ ] 搜尋功能（快速找到血管/腦區）

## 中期目標 / Mid-term Goals

### 🔄 v0.5.0 - 教育功能 / Educational Features
- [ ] 互動式教學課程
- [ ] 測驗模式
- [ ] 學習進度追蹤
- [ ] 案例研究庫
- [ ] 教師模式（建立自訂場景）

### 🔄 v0.6.0 - 醫學準確性 / Medical Accuracy
- [ ] 醫療專業人員審查所有內容
- [ ] 基於文獻的側枝循環機率
- [ ] 區域特定的缺血時間窗
- [ ] NIHSS（美國國立衛生院中風量表）模擬
- [ ] 影像學表現模擬（CT、MRI 外觀）

### 🔄 v0.7.0 - 進階引擎 / Advanced Engine
- [ ] 替換為基於圖論的血流模擬
- [ ] 考慮側枝循環變異（Fetal PCA 等）
- [ ] 整合血壓因素
- [ ] 時間依賴的缺血進展
- [ ] 機器學習輔助的預測（可選）

## 長期願景 / Long-term Vision

### 🔄 v1.0.0 - 生產就緒 / Production Ready
- [ ] 完整的醫學審查和認證
- [ ] 多語言支援（簡體中文、日文、韓文等）
- [ ] 無障礙功能（螢幕閱讀器、鍵盤導覽）
- [ ] 效能最佳化（大型模型載入）
- [ ] 完整的文件和 API 指南

### 🌟 v2.0.0 - 社群與整合 / Community & Integration
- [ ] 使用者生成內容（自訂案例）
- [ ] 社群貢獻的翻譯
- [ ] LTI（學習工具互通性）整合
- [ ] VR/AR 支援
- [ ] 行動 App（React Native 移植）

## 架構改進 / Architecture Improvements

### 可替換元件的優先順序 / Priority for Replaceable Components

1. **幾何提供者 / Geometry Provider** (v0.3.0)
   - 目前：程序化佔位符
   - 目標：真實解剖網格（GLB/GLTF）
   - 介面：保持不變

2. **阻塞引擎 / Occlusion Engine** (v0.7.0)
   - 目前：基於規則
   - 目標：圖論/流體力學模擬
   - 介面：`IOcclusionEngine`

3. **資料來源 / Data Source** (v0.6.0+)
   - 目前：靜態 TypeScript 檔案
   - 目標：可載入的 JSON，後端 API
   - 介面：待設計的儲存庫模式

## 貢獻區域 / Contribution Areas

歡迎在以下領域貢獻：

We welcome contributions in:

- 🩺 醫學內容審查 / Medical content review
- 🎨 3D 模型建立 / 3D modeling
- 🌐 翻譯 / Translations
- 🧪 測試與 QA / Testing & QA
- 📚 文件改進 / Documentation
- ♿ 無障礙功能 / Accessibility
- 🎓 教學內容 / Educational content

請先開啟 issue 討論重大變更！

Please open an issue to discuss major changes first!

## 非目標 / Non-Goals

本專案**不打算**成為：
- 臨床決策工具
- 醫療診斷系統
- 真實的血流動力學模擬器（需要 CFD）

This project is **not intended** to be:
- A clinical decision tool
- A medical diagnostic system
- A realistic hemodynamic simulator (requires CFD)

它的目標是成為教育和學習的輔助工具。

It aims to be an educational and learning aid.
