---
title: Spectrum Architecture 技術架構規格書
version: 1.0.0
status: Stable
tier: C
last_updated: 2026-01-29
---

# 🌌 Spectrum Architecture 技術架構規格書 (v1.0)

本文件詳述 `@gravito/spectrum` 的內部架構、即時除錯儀表板 (Telescope) 實作以及零配置監控機制。

---

## 1. 核心哲學：Zero-Config Telescoping

Spectrum 是 Gravito 生態系的「望遠鏡」模組，專為本地開發除錯 (Local Debugging) 設計。
- **Zero Config**：安裝即用，無需設置資料庫或第三方服務。
- **Real-Time**：透過 Server-Sent Events (SSE) 即時推送請求、日誌與資料庫查詢。
- **Ephemeral Storage**：預設使用記憶體儲存，不污染開發環境，亦支援檔案持久化。

---

## 2. 模組組件分析

### 2.1 SpectrumOrbit (Core)
- **職責**：攔截 HTTP 請求、日誌與資料庫查詢，並提供儀表板 API。
- **位置**：`src/SpectrumOrbit.ts`
- **機制**：
  - **Hooking**：
    - `logger`: 覆寫 `core.logger` 實例，攔截所有日誌輸出。
    - `http`: 註冊全域中介軟體，攔截所有路由請求。
    - `database`: 動態檢測 `@gravito/atlas`，注入查詢監聽器。
  - **Dashboard**：內建基於 Vue.js + Tailwind 的單頁應用 (SPA)，直接由 `bun:html` 渲染。

### 2.2 Storage Engine
- **職責**：暫存捕獲的遙測數據。
- **位置**：`src/storage/`
- **策略**：
  - `MemoryStorage`: 基於 Ring Buffer (Circular Array) 的高效能實作，自動淘汰舊數據。
  - `FileStorage`: 基於 JSONL (Newline Delimited JSON) 的持久化存儲，支援追加寫入。

### 2.3 Real-Time Pipeline (SSE)
- **職責**：將後端事件推送到前端儀表板。
- **位置**：`src/SpectrumOrbit.ts` -> `/events` route
- **實作**：
  - 使用 `TransformStream` 建立長連接。
  - 維護 `Set<Writer>` 連接池，當捕獲到新數據時廣播給所有連線。
  - 內建 30s 心跳機制，防止連接超時。

### 2.4 Correlation Tracking
- **職責**：將日誌與 SQL 查詢關聯到特定的 HTTP 請求。
- **機制**：
  - 在請求開始時生成 `requestId`。
  - 利用 JavaScript 的單執行緒特性 (在 `await` 之前) 或 `AsyncLocalStorage` (未來優化) 傳遞上下文。
  - 目前實作依賴 `currentRequestId` 變數 (注意：在並發請求下可能會有競態條件，需評估 `AsyncLocalStorage` 遷移)。

---

## 3. 技術規格與設計決策

### 3.1 零依賴前端 (Zero-Dependency Frontend)
為了保持套件輕量且易於分發，Spectrum 的儀表板不包含任何編譯步驟。
- **Vue.js**: 使用 CDN 版 (或內聯) Vue 3。
- **Tailwind**: 使用 CDN 版 Tailwind Play (開發模式)。
- **單檔分發**：HTML/CSS/JS 全部內聯在 `SpectrumOrbit.ts` 中，安裝 `npm` 包即可直接運作。

### 3.2 安全性設計 (Security Gate)
Spectrum 雖然主要用於開發，但也支援生產環境除錯。
- **Gate**：提供 `gate(ctx)` 回調，開發者可自定義授權邏輯 (如檢查 Admin Role)。
- **Production Warning**：若在生產環境 (`NODE_ENV=production`) 且未配置 Gate，會強制阻擋存取並發出警告。

### 3.3 請求重播 (Replay)
儀表板提供「重播」功能，直接在伺服器端重新執行捕獲的請求。
- **實作**：
  1. 前端發送 POST `/replay/:id`。
  2. 後端從 Storage 取出原始 Request 資訊 (Method, URL, Headers)。
  3. 構造新的 `Request` 物件，並呼叫 `core.adapter.fetch(req)`。
- **優點**：能夠重現包含 Session/Auth 狀態的請求，無需手動複製 cURL。

---

## 4. 潛在風險與效能評估

### 4.1 記憶體洩漏
在高流量下，若 SSE 客戶端斷線未被偵測，`listeners` Set 可能無限增長。
- **優化**：目前的實作會在 `write` 失敗時自動清理，但對於「半開」連接 (Half-Open) 仍需依賴心跳檢測。

### 4.2 並發上下文丟失
目前使用 `currentRequestId` 類別屬性來追蹤上下文。
- **風險**：在 Node.js/Bun 的異步模型中，若多個請求同時處理，`currentRequestId` 會被覆蓋，導致日誌歸屬錯誤。
- **解決**：**必須** 遷移至 `AsyncLocalStorage` 來確保請求上下文的隔離性 (Critical Fix)。

---

## 5. 後續優化建議

### 短期 (v1.1)
1. **AsyncLocalStorage**：全面重構上下文追蹤機制，解決並發請求下的關聯錯誤。
2. **Body Capture**：支援捕獲 Request/Response Body (需注意大小限制與串流問題)。

### 中期 (v1.2)
1. **Sanitization**：自動過濾敏感標頭 (Authorization, Cookie) 與 Body 欄位 (password)。
2. **Search & Filter**：在儀表板新增全文檢索與狀態碼過濾功能。

### 長期 (v2.0)
1. **Standalone Mode**：允許 Spectrum 作為獨立的微服務運行，收集多個 Gravito 實例的遙測數據。

---
*Created by Gravito Architect.*
