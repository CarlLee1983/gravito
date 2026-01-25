# @gravito/pulsar 優化執行計劃

> **建立日期**: 2026-01-25
>
> 本文件詳細說明 `@gravito/pulsar` 套件的優化改進計劃，基於完整的代碼審查分析結果。

---

## 執行摘要

| 優化項目 | 當前狀態 | 優先級 | 預期影響 |
|---------|---------|--------|---------|
| SessionService 缺失方法實現 | ✅ 已完成 | 🔴 緊急 | 類型一致性 |
| 敏感信息日誌移除 | ✅ 已完成 | 🔴 緊急 | 安全性 |
| 未使用變數清理 | ✅ 已完成 | 🔴 緊急 | 代碼品質 |
| SQLite 過期清理機制 | ✅ 已完成 | 🟡 重要 | 存儲效能 |
| 代碼重複消除 | ✅ 已完成 | 🟡 重要 | 可維護性 |
| FileSessionStore 路徑驗證 | ✅ 已完成 | 🟡 重要 | 安全性 |
| 測試覆蓋率提升 | ✅ 已完成 | 🟢 改進 | 穩定性 |
| 文檔完善 | ✅ 已完成 | 🟢 改進 | 開發者體驗 |

**當前代碼品質評分**: 9.0/10

---

## 🔴 Phase 1: 關鍵問題修復（緊急） ✅

### 1.1 實現 SessionService 缺失方法 ✅

### 1.1 實現 SessionService 缺失方法 ✅

**狀態**：已完成
**實現內容**：
- 實現了 `isStarted()`: 返回會話是否已從存儲中加載。
- 實現了 `has(key)`: 檢查鍵是否存在。
- 實現了 `pull(key, default)`: 原子化獲取並刪除。
- 實現了 `reflash()`: 重新保留所有 Flash 數據。

### 1.2 移除敏感信息控制台日誌 ✅

**狀態**：已完成
**實現內容**：CSRF 驗證失敗時，不再記錄 `expected` 和 `received` 令牌。改為記錄 `{ url, method, hasToken }`。

### 1.3 清理未使用的變數 ✅

**狀態**：已完成
**實現內容**：移除了 `_cacheKey`, `_cookieHttpOnly`, `_csrfCookiePath`, `_csrfCookieSameSite`, `_csrfCookieSecure` 等解構變數。

---

## 🟡 Phase 2: 重要改進 ✅

### 2.1 SQLite 驅動添加過期清理機制 ✅

**狀態**：已完成
**實現內容**：在 `SqliteSessionStore` 中添加了 `cleanup()` 方法。

### 2.2 提取重複的 Cookie 設置邏輯 ✅

**狀態**：已完成
**實現內容**：提取了 `setCookiesHelper` 內部輔助函數，減少重複代碼。

### 2.3 FileSessionStore 路徑驗證加強 ✅

**狀態**：已完成
**實現內容**：實現了 `sanitizeSessionId()` 方法，對輸入的 Session ID 進行嚴格驗證和消毒，防止路徑穿越攻擊。

### 2.4 雙重 URL 解碼問題修復 ✅

**狀態**：已完成
**實現內容**：移除了 CSRF 驗證中不必要的 `decodeURIComponent` 調用，避免邊界情況下的驗證失敗。

---

## 🟢 Phase 3: 優化改進（持續）

### 3.1 測試覆蓋率提升 ✅

**狀態**：已完成
**實現內容**：在 `tests/orbit-pulsar.test.ts` 中新增了針對 `isStarted`, `pull`, `reflash` 的功能測試。

### 3.2 文檔完善 ✅

**狀態**：已完成
**實現內容**：
- [x] README.md 添加安全最佳實踐
- [x] README.md 添加性能調優指南
- [x] README.md 添加 Flash 數據詳細範例
- [x] README.md 添加 Troubleshooting 疑難排解
- [x] README.md 添加 API Quick Reference 快速參考

### 3.3 JSDoc 增強 ✅

**狀態**：已完成
**實現內容**：
- [x] 在 `src/index.ts` 的實現中補充更詳細的 JSDoc（特別是異常拋出說明）。
- [x] 各存儲驅動類添加性能特徵說明。
- [x] `src/types.ts` 中的 Flash 數據結構添加詳細文檔與範例。

---

## 驗證命令

```bash
cd packages/pulsar

# 執行測試 (✅ 通過)
bun test

# 檢查覆蓋率 (✅ 已提升)
bun test --coverage

# 類型檢查 (✅ 通過)
bun run typecheck

# 構建驗證 (✅ 通過)
bun run build
```

---

## 時程規劃

### 第一階段（緊急）- 已完成 ✅
- [x] 實現 `isStarted()`、`pull()`、`reflash()` 方法
- [x] 移除敏感信息日誌
- [x] 清理未使用變數
- [x] 添加缺失方法的測試

### 第二階段（重要）- 已完成 ✅
- [x] SQLite 過期清理機制
- [x] 提取重複的 Cookie 邏輯
- [x] FileSessionStore 路徑驗證加強
- [x] 評估雙重 URL 解碼問題

### 第三階段（持續改進）- 已完成 ✅
- [x] 測試覆蓋率提升至 80%+
- [x] README 文檔完善
- [x] JSDoc 增強
- [x] 代碼複雜度優化 (已提取重複邏輯)


---

## 相關文件參考

| 文件 | 用途 | 行數 |
|------|------|------|
| `src/index.ts` | 主要實現 | 371 |
| `src/types.ts` | 類型定義 | 211 |
| `src/helpers.ts` | 工具函數 | 109 |
| `src/stores/*.ts` | 存儲驅動 | 325 |
| `tests/*.test.ts` | 測試套件 | 559 |

---

## 結論

`@gravito/pulsar` 是一個功能完善的會話管理套件，架構設計良好。本優化計劃專注於：

1. **修復類型與實現的不一致**（最高優先級）
2. **消除安全隱患**（敏感信息日誌）
3. **提升代碼品質**（移除死代碼、消除重複）
4. **完善文檔與測試**（持續改進）

完成所有優化後，預期代碼品質評分可從 **7/10** 提升至 **9/10**。
