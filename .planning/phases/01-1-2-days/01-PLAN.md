# Phase 1: 快速掃描驗證 - Implementation Plan

**Phase:** 1 (快速掃描驗證)
**Duration:** 1-2 days
**Created:** 2026-03-24
**Status:** Ready for Execution

---

## 🎯 Mission

驗證 gravito-core 60 個包的基本健全性，建立驗證基線，識別阻擋性問題。

**Success:** 所有測試通過、類型檢查無誤、依賴圖潔淨、核心模組可用、E2E 流程正常運作。

---

## 📋 Execution Checklist

### ✅ Pre-Flight (30 min)

- [ ] **Setup-01**: 驗證環境 — Bun、npm、git 可用
  - Command: `bun --version && npm --version && git --version`

- [ ] **Setup-02**: 驗證構建工具 — Turbo、TypeScript、Vitest 可用
  - Command: `bun run --version && npx tsc --version && npx vitest --version`

- [ ] **Setup-03**: 檢查磁盤空間 — 至少 10GB 可用
  - Command: `df -h .`

### 🧪 Test Suite Execution (1-2 hours)

- [ ] **Test-01**: 執行全量測試
  - Command: `bun test 2>&1 | tee test-results.log`
  - Record: 總測試數、通過數、失敗數、跳過數
  - Expected: 0 failures (或明確記錄失敗包名稱)

- [ ] **Test-02**: 統計測試覆蓋率
  - Command: `bun test --coverage 2>&1 | tee coverage-results.log`
  - Record: 整體覆蓋率百分比

- [ ] **Test-03**: 識別 flaky 和跳過的測試
  - Parse: `test-results.log` 中的 `skip` 或 `todo` 標記
  - Record: 跳過的測試列表和原因
  - Files: 記錄至 `FLAKY_TESTS.md`

### 🔧 Type Checking (30 min)

- [ ] **Type-01**: 執行 TypeScript 完整類型檢查
  - Command: `bun run typecheck 2>&1 | tee typecheck-results.log`
  - Expected: 0 errors

- [ ] **Type-02**: 統計 @ts-ignore 抑制數量
  - Command: `grep -r "@ts-ignore" packages --include="*.ts" --include="*.tsx" | wc -l`
  - Record: 總數及按包的分佈
  - Files: 記錄至 `TYPECHECK_BASELINE.md`

- [ ] **Type-03**: 識別新增的類型安全警告
  - Parse: `typecheck-results.log` 中的警告
  - Record: 按嚴重性分類
  - Compare: 與 CONCERNS.md 中的已知問題對比

### 🔗 Dependency Verification (30 min)

- [ ] **Deps-01**: 執行依賴圖驗證
  - Command: `bun run scripts/generate-dependency-graph.ts 2>&1 | tee deps-graph.log`
  - Expected: 無循環依賴報告

- [ ] **Deps-02**: 驗證隱式依賴（來自 CONCERNS.md）
  - Check 4 packages: [具體包名稱根據 CONCERNS.md]
  - Verify: 是否能正常初始化
  - Record: 發現結果至 `DEPS_VALIDATION.md`

- [ ] **Deps-03**: 檢查 workspace 依賴解析
  - Command: `bun install --check 2>&1`
  - Expected: 0 errors or warnings

### 🏗️ Core Modules Validation (1 hour)

四個核心模組的初始化驗證

- [ ] **Core-01**: @gravito/core 初始化
  - Test: 建立簡單初始化腳本測試
  - Script: `node -e "const c = require('@gravito/core'); console.log('✓ Core initialized')"`
  - Record: 成功/失敗

- [ ] **Core-02**: @gravito/photon (HTTP 引擎)
  - Test: 啟動 HTTP 服務器，接收請求
  - Script: 建立 test-photon.mjs，驗證能啟動和接收 GET 請求
  - Record: 啟動時間、回應狀態

- [ ] **Core-03**: @gravito/atlas (ORM)
  - Test: 連接數據庫（若有測試 DB）、執行基本查詢
  - Script: 驗證 query builder、connection pool
  - Record: 連接狀態、查詢性能

- [ ] **Core-04**: @gravito/signal (事件總線)
  - Test: 發佈/訂閱事件
  - Script: 建立發佈者和訂閱者，驗證消息傳遞
  - Record: 事件延遲、消息完整性

### 🔄 End-to-End Path Verification (1 hour)

兩個關鍵路徑的端到端驗證

- [ ] **E2E-01**: 框架初始化 + HTTP 請求
  - Scenario: 初始化框架 → 啟動 HTTP 服務 → 發送請求 → 驗證響應
  - Test: `npm run test:e2e:basic-http`
  - Record: 響應時間、狀態碼、內容

- [ ] **E2E-02**: 數據庫查詢 + 事件發佈
  - Scenario: 初始化 ORM → 執行查詢 → 發佈事件 → 驗證訂閱者收到
  - Test: `npm run test:e2e:db-event`
  - Record: 查詢執行時間、事件延遲

### 📊 Report Generation (1 hour)

- [ ] **Report-01**: 編譯 HEALTH_CHECK_REPORT.md
  - Include: 所有檢查結果總結
  - Format: 表格 + 詳細說明
  - Structure:
    ```
    # Gravito-Core 健全性檢查報告

    ## 概要
    - 測試: ✅/❌ (通過/失敗)
    - 類型: ✅/❌
    - 依賴: ✅/❌
    - 模組: ✅/❌ (4/4)
    - E2E: ✅/❌ (2/2)

    ## 詳細結果
    [各檢查詳細結果]
    ```

- [ ] **Report-02**: 編譯 ISSUES_PRIORITIZED.md
  - List: 所有發現的問題
  - Priority: Critical, High, Medium
  - Format: 表格，包括包名稱、描述、建議修復

  ```
  | 優先級 | 包名稱 | 問題 | 影響 |
  |--------|--------|------|------|
  | 🔴 C | core | ... | 框架無法啟動 |
  | 🟡 H | photon | ... | HTTP 處理異常 |
  ```

- [ ] **Report-03**: 編譯 NEXT_STEPS.md
  - Analysis: 分析發現的問題
  - Recommendations: 建議修復順序或後續行動
  - Decision Points:
    - 修復 Critical 問題後再進行遷移？
    - 並行修復 High 問題？
    - 何時進入 Phase 2（結果評估）？

---

## 🔧 Technical Approach

### 工具與命令

```bash
# 全量測試
bun test

# 類型檢查
bun run typecheck

# 依賴分析
bun run scripts/generate-dependency-graph.ts

# 覆蓋率統計
bun test --coverage

# 依賴驗證
bun install --check
```

### 數據收集

所有結果保存至 `.planning/phases/01-1-2-days/`:
- `test-results.log` — 測試輸出
- `coverage-results.log` — 覆蓋率數據
- `typecheck-results.log` — 類型檢查輸出
- `deps-graph.log` — 依賴圖輸出
- `FLAKY_TESTS.md` — 跳過的測試
- `TYPECHECK_BASELINE.md` — 類型檢查基線
- `DEPS_VALIDATION.md` — 依賴驗證結果
- `CORE_MODULES_TEST.md` — 模組初始化結果
- `E2E_RESULTS.md` — E2E 流程結果

### 異常處理

- **測試失敗**：記錄失敗包名稱、失敗原因、是否為已知問題
- **類型錯誤**：分類為新增錯誤 vs 已知抑制
- **依賴問題**：具體記錄循環依賴包名稱
- **模組初始化失敗**：記錄錯誤棧跡、依賴鏈
- **E2E 失敗**：識別失敗點（初始化、請求、響應）

---

## 📈 Success Metrics

完成條件：

| 指標 | 目標 | 檢查方式 |
|------|------|---------|
| 測試覆蓋 | 100% 通過 | test-results.log |
| 類型檢查 | 0 errors | typecheck-results.log |
| 循環依賴 | 0 | deps-graph.log |
| 核心模組 | 4/4 可初始化 | CORE_MODULES_TEST.md |
| E2E 流程 | 2/2 可執行 | E2E_RESULTS.md |
| 報告完整 | HEALTH_CHECK_REPORT.md 生成 | 檔案存在 |

---

## 🎯 Deliverables

**Primary Deliverables:**
1. `HEALTH_CHECK_REPORT.md` — 驗證結果總結
2. `ISSUES_PRIORITIZED.md` — 問題清單（優先級排序）
3. `NEXT_STEPS.md` — 建議的後續行動

**Supporting Artifacts:**
- `test-results.log`
- `typecheck-results.log`
- `deps-graph.log`
- `coverage-results.log`
- `FLAKY_TESTS.md`
- `TYPECHECK_BASELINE.md`
- `DEPS_VALIDATION.md`
- `CORE_MODULES_TEST.md`
- `E2E_RESULTS.md`

---

## ⏱️ Timeline

| 任務 | 預計時間 | 狀態 |
|------|----------|------|
| Pre-Flight | 30 min | ⏳ Pending |
| 測試執行 | 1-2 hours | ⏳ Pending |
| 類型檢查 | 30 min | ⏳ Pending |
| 依賴驗證 | 30 min | ⏳ Pending |
| 模組驗證 | 1 hour | ⏳ Pending |
| E2E 驗證 | 1 hour | ⏳ Pending |
| 報告生成 | 1 hour | ⏳ Pending |
| **Total** | **5-7 hours** | ⏳ Pending |

> 實際時間可能因環境、機器性能、問題數量而異。預留 1-2 天緩衝。

---

## 🚧 Dependencies & Risks

**Dependencies:**
- ✅ Bun、npm、git 可用
- ✅ 所有構建工具已安裝
- ✅ 網絡連接（若需下載依賴）

**Risks:**
- **環境問題**：若依賴未正確安裝
  - Mitigation: 先執行 `bun install`
- **超時問題**：若測試執行時間過長
  - Mitigation: 優先執行快速測試，後續深入診斷
- **數據庫問題**：若 Atlas 需要實際 DB 連接
  - Mitigation: 使用 mock/in-memory DB 或跳過 Atlas 測試

---

## ✅ Sign-Off

**Plan Created:** 2026-03-24
**Plan Status:** Ready for Execution
**Next Step:** `/gsd:execute-phase 1`

---

*This plan is executable and ready for Phase 1 implementation.*
