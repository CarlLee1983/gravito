# Requirements: Gravito-Core 健全性驗證

**Defined:** 2026-03-24
**Core Value:** 確保 gravito-core 框架的核心穩定性 — 所有包都能通過測試、編譯無誤、無循環依賴

## v1 Requirements

快速掃描階段的核心驗證工作。

### 測試驗證

- [ ] **TEST-01**: 所有 60 個包執行 `bun test` 通過，無 failures
- [ ] **TEST-02**: 總測試覆蓋率統計並記錄基線
- [ ] **TEST-03**: 識別任何 flaky 或被跳過的測試

### 類型檢查

- [ ] **TYPE-01**: 執行 `bun run typecheck` 0 errors
- [ ] **TYPE-02**: 記錄 @ts-ignore 抑制數量和位置
- [ ] **TYPE-03**: 識別新增的類型安全問題

### 依賴驗證

- [ ] **DEPS-01**: 驗證包依賴圖無循環依賴
- [ ] **DEPS-02**: 檢查隱式依賴（來自 CONCERNS.md 識別的 4 個）
- [ ] **DEPS-03**: 驗證 workspace 依賴解析正確

### 核心模組可運作性

- [ ] **CORE-01**: Core 包能初始化、不崩潰
- [x] **CORE-02**: Photon HTTP 引擎能啟動、接收請求
- [ ] **CORE-03**: Atlas ORM 能連接、執行基本查詢
- [x] **CORE-04**: Signal 事件總線能發佈/訂閱

### 端到端流程驗證

- [ ] **E2E-01**: 關鍵路徑 1（框架初始化 + HTTP 請求）可正常執行
- [ ] **E2E-02**: 關鍵路徑 2（數據庫查詢 + 事件發佈）可正常執行

### 驗證報告

- [ ] **REPORT-01**: 生成 `HEALTH_CHECK_REPORT.md` 包含所有檢查結果
- [ ] **REPORT-02**: 問題清單按優先級排序（Critical、High、Medium）
- [ ] **REPORT-03**: 建議後續行動（修復計畫或決策）

## v2 Requirements

驗證後續階段（完整審計、修復執行）。不在快速掃描範圍。

### 深度驗證

- **DEEP-01**: 性能基線測試（響應時間、記憶體使用）
- **DEEP-02**: 文檔完整性審計
- **DEEP-03**: 安全檢查（輸入驗證、認證、secrets）

### 修復執行

- **FIX-01**: 根據報告修復 Critical 問題
- **FIX-02**: 修復 High 優先級問題
- **FIX-03**: 計畫 Medium 優先級修復

## Out of Scope

| 項目 | 理由 |
|------|------|
| 性能優化 | 掃描不包括深度性能審計，僅建立基線 |
| 文檔完整性審計 | API 文檔檢查留待需要時，不在快速掃描範圍 |
| 安全審計 | 不在快速掃描範圍，單獨評估 |
| 衛星模組驗證 | Phase 1 僅驗證 59 核心包 + 1 admin，衛星在後續 |
| Hono Phase 4-5 規劃 | 建立基線後再決策，不在此階段 |
| 新功能開發 | 純驗證工作，無新代碼編寫 |

## Traceability

需求與規劃階段的映射。

| 需求 | 階段 | 狀態 |
|------|------|------|
| TEST-01 | Phase 1 | Pending |
| TEST-02 | Phase 1 | Pending |
| TEST-03 | Phase 1 | Pending |
| TYPE-01 | Phase 1 | Pending |
| TYPE-02 | Phase 1 | Pending |
| TYPE-03 | Phase 1 | Pending |
| DEPS-01 | Phase 1 | Pending |
| DEPS-02 | Phase 1 | Pending |
| DEPS-03 | Phase 1 | Pending |
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Complete |
| CORE-03 | Phase 1 | Pending |
| CORE-04 | Phase 1 | Complete |
| E2E-01 | Phase 1 | Pending |
| E2E-02 | Phase 1 | Pending |
| REPORT-01 | Phase 1 | Pending |
| REPORT-02 | Phase 1 | Pending |
| REPORT-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---

*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after project initialization*
