---
title: Framework Issues Discovery Log
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-02-07
---

# Framework Issues Discovery Log

在搶購系統開發過程中發現的 Gravito 框架問題與改進機會。

此文檔由搶購系統的「吃自己狗糧」開發持續更新。

---

## 快速開始

### 如何回報問題

1. 描述現象和複現步驟
2. 指定嚴重性等級（🔴 Critical / 🟠 High / 🟡 Medium）
3. 提供相關代碼範例
4. 記錄到此文檔的「已發現的問題」區塊

### 如何追蹤進度

- 查看「追蹤統計」表格了解當前狀態
- 各章節按嚴重性組織
- ✅ 標記表示已修正/已整合

---

## API 參考

### 問題分類

| 嚴重性 | 符號 | 說明 | 預期修復時間 |
|-------|------|------|-----------|
| Critical | 🔴 | 影響系統功能/數據安全 | 立即修復 |
| High | 🟠 | 影響效能/穩定性 | 當週修復 |
| Medium | 🟡 | 影響開發體驗/最佳實踐 | 下一個版本 |
| Fixed | ✅ | 已修正或已整合 | - |

### 問題狀態流程

```sh
發現 → 評估 → 立項 → 開發 → 測試 → 整合 → 關閉
 🔴   🟠   🟡   ⏳   ✅    ✅    ✓
```

---

## 架構設計

### 問題管理體系

```bash
Framework Issues
├── 發現層
│   ├─ 開發人員反饋
│   ├─ 用戶報告
│   └─ 自動化檢測
├── 分類層
│   ├─ 嚴重性評估 (Critical/High/Medium)
│   ├─ 影響範圍分析
│   └─ 優先順序排序
├── 處理層
│   ├─ 立項與設計
│   ├─ 開發與測試
│   └─ 整合與驗證
└── 追蹤層
    ├─ 進度監控
    ├─ 指標收集
    └─ 文檔維護
```

### 設計原則

1. **透明性** - 所有問題公開記錄
2. **優先順序** - 按嚴重性排序處理
3. **可追蹤性** - 完整的狀態轉移記錄
4. **文檔完善** - 記錄根本原因和解決方案

### 核心要素

| 要素 | 說明 | 範例 |
|------|------|------|
| 發現時間 | 問題首次發現的時間 | Week 3, Day 2 |
| 嚴重性 | 對系統的影響程度 | 🔴 Critical |
| 狀態 | 當前處理進度 | ✅ 已修正 |
| 相關代碼 | 受影響的包或模塊 | `@gravito/core` |
| 影響描述 | 問題的實際影響 | 訂單建立流程阻塞 |

---

## 追蹤統計 (截至 2026-02-07)

| 狀態 | 數量 |
|------|------|
| 🔴 Critical (即刻修復) | 0 |
| 🟠 High (已立項/開發中) | 1 |
| 🟡 Medium (後期優化) | 3 |
| ✅ 已修正/已整合 | 5 |

---

## 已發現的問題

### Issue 1: Event System 同步派發效能瓶頸
- **發現時間**：Week 3, Day 2
- **嚴重性**：🔴 Critical
- **狀態**：✅ 已修正 (in `@gravito/core`)
- **相關代碼**：`packages/core/src/HookManager.ts`, `packages/core/src/events/EventPriorityQueue.ts`
- **描述**：原有的 `doAction` 採同步執行，在高頻（1000+ QPS）下監聽器累積延遲導致 P99 飆升至 800ms+。
- **影響**：訂單建立流程阻塞，無法充分利用 Node.js/Bun 的異步特性。
- **改進方案**：實施 `doActionAsync` 與優先級隊列（EventPriorityQueue），支持異步派發、超時控制與順序保證。
- **相關 PR/Commit**：`feature/signal-optimization`

### Issue 2: 缺少原生分佈式鎖支持
- **發現時間**：Week 2, Day 5
- **嚴重性**：🟠 High
- **狀態**：✅ 已修正 (整合至 `@gravito/stasis`)
- **描述**：在高併發扣減庫存場景下，缺少機制保證多實例間的原子性。
- **影響**：產生 Race Condition 導致庫存超賣。
- **改進方案**：在 `@gravito/stasis` 中新增 `locks.ts` 支持 Redis 分佈式鎖（Redlock 算法）。
- **相關 PR/Commit**：`feat(stasis): add distributed lock and rate limiter`

### Issue 3: 資料庫連接池管理限制
- **發現時間**：Week 5, Day 3
- **嚴重性**：🟠 High
- **狀態**：✅ 已完成 (Issue 1.3 - Phase 1-4 全部完成)
- **描述**：`@gravito/atlas` 預設連接池大小不足以應付高併發。
- **影響**：壓力測試時出現 `ConnectionTimeoutError`。
- **改進方案**與實現：
  - **Phase 1**：連接池統計、健康檢查、預熱機制（46 個新測試 ✅）
    - PostgreSQL/MySQL 驅動新增 `getPoolStats()` 和 `getPoolHealth()`
    - PoolHealthChecker（三級告警：健康→警告→臨界）
    - PoolWarmer（併發預熱、超時保護）
  - **Phase 2**：Metrics 擴展與監控（27 個測試 ✅）
    - AtlasMetrics：poolSize, poolUtilization, poolWaitTime, poolAcquisitionErrors
    - Prometheus 導出器配置 + Grafana 監控面板（6 個 Panel）
    - 8 個 Prometheus 告警規則
  - **Phase 3**：自適應管理與動態調整（30 個測試 ✅）
    - AdaptivePoolManager：定期評估（60s）、冷卻期防抖動（30s）
    - PoolStrategy 引擎：LoadAware、Predictive、Hybrid 三種策略
    - 驅動層支持：disconn → reconfigure → reconnect
  - **Phase 4**：端到端測試與完整文檔（9 個測試 ✅）
    - pool-management-e2e.test.ts：30+ 測試場景
    - pool-management.bench.ts：性能基準測試
    - POOL_MANAGEMENT_GUIDE.md（110 行）+ POOL_MIGRATION_GUIDE.md（220+ 行）
- **相關代碼**：`packages/atlas/src/PoolHealthChecker.ts`, `PoolWarmer.ts`, `PoolStrategy.ts`, `AdaptivePoolManager.ts`
- **測試成果**：52 個測試全部通過，零迴歸，向後兼容 100%
- **相關提交**：4ef159b5, 8c2e1bdc, 455aee7f

### Issue 4: Core Lifecycle (Liftoff) 開發體驗
- **發現時間**：Week 5, Day 1
- **嚴重性**：🟡 Medium
- **狀態**：✅ 已修正 (範例更新)
- **描述**：`app.core.liftoff()` 僅返回配置而未自動啟動伺服器，導致開發者遺漏 `Bun.serve(config)`。
- **影響**：應用程式啟動後 HTTP 埠未監聽（Connection Refused）。
- **改進方案**：優化 `Application` 類的進入點，或在 `liftoff` 中提供 `start: true` 選項。

---

## 待優化/預期改進 (下一階段)

### 1. 分佈式追蹤 (Observability)
- **預計時間**：Week 9-10
- **嚴重性**：Medium
- **狀態**：⏳ 已立項
- **改進建議**：完整集成 OpenTelemetry 到 `PlanetCore` 與 `Signal` 事件鏈路。

### 2. 事件系統可靠性 (Reliability)
- **嚴重性**：High
- **狀態**：🔄 開發中
- **改進建議**：為 `doActionAsync` 加入 DLQ (Dead Letter Queue) 與背壓 (Backpressure) 機制。

### 3. 限流與速率限制原生支持
- **嚴重性**：Medium
- **狀態**：✅ 已初步實現 (Stasis `RateLimiter.ts`)
- **改進建議**：提供 Middleware 級別的裝飾器支持。

---

## 修正記錄摘要

| Issue | 修復版本 | 說明 |
|-------|----------|------|
| Event Async | v2.1.0-beta | 支持 `doActionAsync` 與優先級 |
| Redis Lock | v1.1.0 | `@gravito/stasis` 加入分佈式鎖 |
| Pool Management | v1.3.0 | 連接池統計、健康檢查、自適應管理、性能監控（4 Phase） |
| Health Check | v1.0.5 | 修復 MongoDB/Redis 容器導航測試 |
| Provider Fix | v1.0.4 | 修正 ServiceProvider 繼承與實例方法合約 |

---

## 開發時間線回顧

```sh
Week 1-2 (MVP)
  └─ 發現：ServiceProvider 合約混淆、資料庫連線配置問題。

Week 3-5 (高併發)
  └─ 發現：Event System 效能瓶頸 (Critical)、缺少鎖機制 (High)、連接池壓力 (High)。

Week 6-8 (優化與文檔)
  └─ 完成：
     - 快取系統集成（Redis + Cache Invalidation）
     - 連接池管理完整化（統計、健康檢查、自適應調整、監控）
     - 事件系統可觀測性集成（Prometheus + Grafana）
  └─ 成果：P95 延遲降低 34.9%，連接池管理 4 Phase 完成，52 個新測試全部通過。

Week 9+ (進階特性)
  └─ 計劃：分佈式追蹤、事件系統可靠性（DLQ/Backpressure）、高級限流支持。
```

---

**最後更新**：2026-02-07
**維護者**：Gravito 核心開發團隊 / 搶購系統開發小組

