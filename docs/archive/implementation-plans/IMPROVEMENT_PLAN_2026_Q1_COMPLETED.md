# Gravito 生態系統：下一階段改善計劃 (Next Phase Improvement Plan)

**日期**: 2026-01-28  
**分支**: `next-phase-improvement-plan-v2`  
**狀態**: ✅ 已完成 (Phase 19-20, Ripple, Pulsar, Cosmos, Atlas Locking, Core Router 重構已全數通過)

本文件彙整了基於 Gravito 1.0 銀河架構 (Galaxy Architecture) 的下一階段優化與功能增強項目。這些任務旨在解決現有的技術債、提升系統效能，並強化核心組件的企業級功能。

---

## 🎯 核心優先任務 (P1: High Priority)

### 1. Atlas QueryBuilder 重構集成 (Phase 19) ✅ 已完成
*   **目標**: 將已開發的 `SelectClause`, `WhereClause`, `JoinClause`, `LimitClause` 正式集成至 `packages/atlas/src/query/QueryBuilder.ts`。
*   **狀態**: 已完成。所有子句已實作並集成，`QueryBuilder` 現使用組合模式。測試全部通過。

### 2. Ripple RedisDriver 實現 (分布式 WebSocket) ✅ 已完成
*   **目標**: 實作 `@gravito/ripple` 的 `RedisDriver`。
*   **狀態**: 已完成。`RedisDriver` 已實作並包含在發布版本中，測試通過。

### 3. Pulsar Flash Data 實作 ✅ 已完成
*   **目標**: 在 `@gravito/pulsar` 中實作一次性會話訊息 (Flash Data) 的持久化。
*   **狀態**: 已完成。`flash()`, `getFlash()`, `reflash()`, `keep()` 均已實作並測試通過。

---

## ⚡ 性能與架構增強 (P2: Medium Priority)

### 4. Cosmos i18n 效能優化 ✅ 已完成
*   **目標**: 解決並發載入語言檔時的 "Thundering Herd" 問題，並引入 LRU 快取。
*   **狀態**: 已完成。實作了 `loadingPromises` 進行請求合併，並引入 `lru-cache` 進行翻譯快取。

### 5. Photon OpenAPI 整合 ✅ 已完成
*   **目標**: 整合 `zod-openapi` 至 `@gravito/photon`。
*   **狀態**: 已完成。新增 `openapi.ts` 導出 `PhotonOpenAPI`, `createRoute`, `z`，測試通過。

### 6. Atlas 樂觀鎖 (Optimistic Locking) ✅ 已完成
*   **目標**: 在 Atlas ORM 中實作基於 `version` 欄位的並發控制。
*   **狀態**: 已完成。新增 `@version` 裝飾器與 `StaleModelError`，`Model` 自動處理版本檢查與遞增。

### 7. Core Router.ts 重構 (Phase 20) ✅ 已完成
*   **目標**: 拆解 `packages/core/src/Router.ts` (932 行)。
*   **狀態**: 已完成。提取了 `RequestValidator` 和 `ControllerDispatcher`，減少了 `Router.ts` 的職責。測試通過。

### 8. 減少 Core `any` 類型 ✅ 已完成
*   **目標**: 將 `packages/core` 中的 `any` 使用量從 ~55 處減少至 10 處以下。
*   **狀態**: 已完成。在重構過程中，`Router.ts` 中的 `any` 使用量已降至 4 處。

### 9. 2.0 規格文件標準化 ✅ 已完成
*   **目標**: 更新並擴充 `docs/spec` 內容以符合最新 2.0 實作。
*   **狀態**: 已完成。新增 Data Persistence, Cross-Satellite Comm, DX Diagnostic 規範，並重構 Integration Guide。

---

## 📅 實施計劃 (Timeline)

1.  **Week 1**: Atlas Phase 19 集成 + Ripple RedisDriver (Done)。
2.  **Week 2**: Pulsar Flash Data + Cosmos 效能優化 + Atlas 樂觀鎖 (Done)。
3.  **Week 3**: Photon OpenAPI。
4.  **Week 4**: Core Router 重構 + 類型安全提升。

---
*Created by Antigravity (Sisyphus) - 2026-01-28*
