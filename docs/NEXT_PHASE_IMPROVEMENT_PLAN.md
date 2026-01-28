# Gravito 生態系統：下一階段改善計劃 (Next Phase Improvement Plan)

**日期**: 2026-01-28  
**分支**: `next-phase-improvement-plan-v2`  
**狀態**: 📋 規劃中

本文件彙整了基於 Gravito 1.0 銀河架構 (Galaxy Architecture) 的下一階段優化與功能增強項目。這些任務旨在解決現有的技術債、提升系統效能，並強化核心組件的企業級功能。

---

## 🎯 核心優先任務 (P1: High Priority)

### 1. Atlas QueryBuilder 重構集成 (Phase 19)
*   **目標**: 將已開發的 `SelectClause`, `WhereClause`, `JoinClause`, `LimitClause` 正式集成至 `packages/atlas/src/query/QueryBuilder.ts`。
*   **預期效益**: 
    *   將 `QueryBuilder.ts` 從 1300+ 行減少至 800 行以下。
    *   提升程式碼的可維護性與可測試性。
*   **關鍵行動**:
    *   修復 `JoinClause` 的類型衝突。
    *   實作其餘子句（`GroupBy`, `Having`, `OrderBy`）。
    *   更新 `QueryBuilder` 以使用組合模式 (Composition) 調用這些子句。

### 2. Ripple RedisDriver 實現 (分布式 WebSocket)
*   **目標**: 實作 `@gravito/ripple` 的 `RedisDriver`。
*   **預期效益**: 
    *   支援橫向擴展 (Horizontal Scaling) 的 WebSocket 架構。
    *   實現跨實例的訊息廣播。
*   **關鍵行動**:
    *   基於 Redis Pub/Sub 實作 `RippleDriver` 介面。
    *   在 `RippleServer` 中加入驅動切換邏輯。

### 3. Pulsar Flash Data 實作
*   **目標**: 在 `@gravito/pulsar` 中實作一次性會話訊息 (Flash Data) 的持久化。
*   **預期效益**: 
    *   支援傳統 Web 應用常見的「重定向後顯示成功訊息」模式。
*   **關鍵行動**:
    *   實作 `ctx.session.flash()` 與自動清除機制。
    *   確保 Flash 資料能正確序列化至 Session Store。

---

## ⚡ 性能與架構增強 (P2: Medium Priority)

### 4. Cosmos i18n 效能優化
*   **目標**: 解決並發載入語言檔時的 "Thundering Herd" 問題，並引入 LRU 快取。
*   **預期效益**: 
    *   減少高並發下的檔案系統 I/O 壓力。
    *   降低長期運行應用的記憶體佔用。
*   **關鍵行動**:
    *   實作 `Loading Coalescing` (Promise 鎖)。
    *   為翻譯結果快取加入 LRU 淘汰機制。

### 5. Photon OpenAPI 整合
*   **目標**: 整合 `zod-openapi` 至 `@gravito/photon`。
*   **預期效益**: 
    *   從 TypeScript 型別與 Zod Schema 自動生成 Swagger/OpenAPI 文檔。
    *   提升開發者體驗 (DX)。
*   **關鍵行動**:
    *   實作輔助函數，將 Hono 路由轉換為 OpenAPI 規格。

### 6. Atlas 樂觀鎖 (Optimistic Locking)
*   **目標**: 在 Atlas ORM 中實作基於 `version` 欄位的並發控制。
*   **預期效益**: 
    *   防止分散式環境下的資料覆蓋風險 (Lost Update)。
*   **關鍵行動**:
    *   在 `Model` 中加入 `@version` 裝飾器。
    *   更新時自動檢查並增加版本號。

---

## 🛠️ 技術債與大型文件重構 (P3: Maintenance)

### 7. Core Router.ts 重構 (Phase 20)
*   **目標**: 拆解 `packages/core/src/Router.ts` (932 行)。
*   **關鍵行動**:
    *   將 `FormRequest` 偵測邏輯提取至 `RequestValidator`。
    *   將 `Controller` 解析與調用邏輯提取至 `ControllerDispatcher`。

### 8. 減少 Core `any` 類型
*   **目標**: 將 `packages/core` 中的 `any` 使用量從 ~55 處減少至 10 處以下。
*   **關鍵行動**:
    *   將 `catch (e: any)` 改為 `unknown`。
    *   為 `Route` 與 `Application` 增加更精確的泛型約束。

---

## 📅 實施計劃 (Timeline)

1.  **Week 1**: Atlas Phase 19 集成 + Ripple RedisDriver。
2.  **Week 2**: Pulsar Flash Data + Cosmos 效能優化。
3.  **Week 3**: Photon OpenAPI + Atlas 樂觀鎖。
4.  **Week 4**: Core Router 重構 + 類型安全提升。

---
*Created by Antigravity (Sisyphus) - 2026-01-28*
