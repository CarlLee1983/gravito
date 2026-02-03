# 🌌 Gravito Galaxy Architecture 技術架構規格書 (v2.0)

本文件詳述 Gravito 框架的核心技術架構、設計決策以及組件互動模式。Gravito 採用 **Galaxy Architecture (銀河架構)**，這是一個受天體力學啟發的模組化系統，旨在實現「核心嚴謹、邊緣靈活」的開發體驗。

---

## 1. 核心哲學：Galaxy Architecture

Gravito 的設計基於三個核心層次，確保了系統的可擴展性與維護性：

1.  **PlanetCore (微核心)**：應用的心臟。處理生命週期管理、依賴注入 (DI) 與掛鉤 (Hooks) 系統。
2.  **Orbits (基礎設施層)**：環繞核心運行的戰略擴展。提供資料庫 (Atlas)、事件總線 (Signal) 與快取等共用資源。
3.  **Satellites (領域模組層)**：獨立的業務單元。實現特定的領域邏輯 (如：Catalog, Cart, Payment)，遵循 Clean Architecture。

---

## 2. PlanetCore 微核心實作

`@gravito/core` 是整個生態系的基礎，其主要組件包括：

### 2.1 IoC 容器 (Container)
Gravito 內建輕量級的依賴注入容器，支援：
- **Transient Bindings**：每次解析時建立新實例。
- **Singleton Bindings**：全域單一實例。
- **Instance Binding**：直接綁定現有物件。

### 2.2 掛鉤系統 (HookManager)
受 WordPress 啟發的非同步掛鉤系統，分為兩類：
- **Filters (過濾器)**：用於修改資料流。例如：`core.hooks.applyFilters('modify_content', data)`。
- **Actions (動作)**：用於觸發副作用。例如：`core.hooks.doAction('user_registered', user)`。

### 2.3 配接器模式 (HttpAdapter)
為了支援多種執行環境 (Bun, Node.js)，Gravito 抽象了 HTTP 引擎：
- **BunNativeAdapter**：利用 Bun 的原生 `fetch` 達成極限效能。
- **PhotonAdapter**：基於 Hono 的高效能配接器。

---

## 3. 應用生命週期 (Lifecycle)

Gravito 的啟動過程分為兩個關鍵階段：

### 3.1 Bootstrap (引導)
1.  **Registration Phase**：呼叫所有 `ServiceProvider` 的 `register()`，將服務綁定至容器。
2.  **Deferred Resolution**：設定延遲加載服務。
3.  **Booting Phase**：呼叫所有 `ServiceProvider` 的 `boot()`，此時所有依賴已就緒。

### 3.2 Liftoff (升空)
這是最終的執行階段，`liftoff()` 會返回一個相容於 `Bun.serve` 的物件，並觸發 `app:liftoff` 動作。在 2.0 中，此階段會執行 AOT 路由優化。

---

## 4. 2.0 效能引擎 (Standalone Engine)

Gravito 2.0 引入了獨立的 Web 引擎，旨在為 Bun 提供極致效能：

1.  **AOT Router (預編譯路由)**：啟動時將路由編譯為最佳化的判斷邏輯。
2.  **FastContext (物件池)**：重複使用 Context 物件，將 GC 壓力降至最低。
3.  **Zero-copy Bridge**：直接處理 Bun 的原始 Request，避免資料拷貝。

---

## 5. 清單驅動開發 (Manifest-Driven Development)

MDD 是 Gravito 1.0 引入的核心特性，透過 `gravito.config.ts` 宣告式地組裝系統：

```typescript
// gravito.config.ts 範例
export default {
  name: 'Gravito Store',
  orbits: [OrbitAtlas, OrbitSignal],
  modules: ['catalog', 'membership'] // 自動掛載衛星
};
```

此模式大幅減少了模板程式碼 (Boilerplate)，讓開發者專注於領域邏輯。

---

## 5. 設計決策與風險評估

### 5.1 為什麼選擇 IoC 而非純函式？
為了在大型企業應用中實現解耦。IoC 允許在測試環境中輕鬆替換 Mock 服務，並支援 Orbit 之間的資源共享。

### 5.2 潛在風險：N+1 查詢
在 Satellite 開發中，若在 `UseCase` 的迴圈內直接調用 Repository 查詢，會導致 N+1 問題。
- **解決方案**：強制要求在 Infrastructure 層實作 `Eager Loading` 或使用 Atlas 的 `with()` 語法。

### 5.3 異步競態條件 (Race Condition)
由於 Gravito 支援高度並發，在處理庫存扣減或訂單狀態更新時，需注意競態條件。
- **設計規範**：在 `OrbitAtlas` 中提供 `transaction()` 封裝，並建議在 Critical Path 使用樂觀鎖 (Optimistic Locking)。

---

## 6. 後續擴展建議

1.  **JIT 路由優化**：利用 `core.warmup()` 在啟動時預熱熱門端點。
2.  **分層日誌**：結合 `Logger` 介面，針對不同 Orbit 設定不同的日誌級別。

---
*Created by Antigravity Architect (SF Bay Area Style).*
