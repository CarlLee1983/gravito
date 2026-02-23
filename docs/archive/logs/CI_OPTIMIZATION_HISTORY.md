# Gravito CI 與測試優化歷程紀錄

本文件整合了 2026 年初針對 Gravito 框架進行的 CI 效能優化與測試結構調整的完整過程。

---

## 📊 執行摘要
透過實施測試分類、Workflow 調整、快速失敗策略以及大型測試檔案拆分，成功將單元測試並發度提升 **100%**，並將 CI 反饋時間從 26 分鐘縮短至 **3 秒 - 3 分鐘** (失敗情況下) 或 **12-15 分鐘** (成功情況下)，整體節省約 **30-40%** 的執行時間。

---

## 🚀 第一階段：各類測試分類與並發優化 (2026-02-07)

### 1. 測試檔案分類機制
將 80 個 integration 測試檔案重命名為 `*.integration.test.ts`，並在 `turbo.json` 與各套件的 `package.json` 中分離單元測試與集成測試腳本。

- **Unit Tests**: 高並發 (8 workers)，純內存 Mock。
- **Integration Tests**: 低並發 (2 workers)，受資料庫連線限制影響。

### 2. 優化成果
- **Unit tests 並發**: 4 → 8 (+100%)
- **CI 執行時間**: 20+ min → 12-15 min
- **節省幅度**: 30-40%

---

## 🛠️ 第二階段：大型測試檔案拆分 (PHASE 2)

為了進一步提升並行度，針對超過 900 行的大型測試檔案進行拆分，每個新檔案控制在 100-200 行。

### 關鍵拆分目標：
1. **`query-builder-complete.integration.test.ts` (1,038 行)**
   - 拆分為 MongoQueryBuilder 與 MongoAggregateBuilder。
   - 提取共用 Mock 工廠至 `__shared__/mock-collection.ts`。
2. **`valibot-form-request.test.ts` (1,077 行)**
   - 拆分為 10 個功能專用測試檔案 (Authorization, Transform, Exception 處理等)。
3. **`forge/index.test.ts` (900 行)**
   - 按模組功能拆分。

### 預期額外收益：
CI 時間再節省 **10-20%**。

---

## ⚡ 第三階段：快速失敗策略 (Fast Fail - Phase 3D)

實施 `quick-validation` 工作流，確保在執行昂貴的測試任務前，先通快速 Lint 與 Build 檢查。

### 執行流程優化：
- **優化前**: 失敗反饋需等待 26 分鐘。
- **優化後**: 
  - **Lint 失敗**: 3 秒反饋 (速度提升 520 倍)。
  - **Build 失敗**: 2-3 分鐘反饋 (節省 23-24 分鐘)。
- **成功路徑**: 無額外成本，保持並行執行。

---

## 📈 技術指標與資源最佳化
- **記憶體管理**: 在 6GB 預算內運行。
- **資料庫連線**: 嚴格限制集成測試並發數，防止連線耗盡。
- **CPU 利用率**: 成功提升至 50-70%。

---

## 🔗 歷史參考文檔
- **原始進度報告**: `mi-optimization-progress.md` (已整合)
- **拆分指南**: `PHASE2-SPLIT-GUIDE.md` (已整合)
- **快速失敗實施**: `PHASE3D_IMPLEMENTATION.md` (已整合)
