# @gravito/core 現代化升級與功能補全計畫

> **目標**: 補全 `@gravito/core` 核心模組的文檔涵蓋率，並升級現有架構以對齊現代化開源與企業級框架標準，提升開發者體驗 (DX)。
> **受眾**: 準備進行底層架構實作的開發者。

---

## 階段一： 核心功能文檔補全 (README.md)

當前 `packages/core/src` 中的進階功能均未在 `README.md` 中體現。在進行新功能開發前，或並行作業中，需將下列模組的核心 API 編入官方文檔以供查閱。

### 1. 增補領域文檔
- **Observability (可觀測性)**:
  - 說明內建的 OpenTelemetry 追蹤 (Tracing) 與指標 (Metrics) 機制。
  - 撰寫如 `TracingProvider` 或相關 Logger 的使用範例。
- **Security (安全防護)**:
  - 說明如何在 `PlanetCore` 或 `Application` 配置 CSRF、CORS 及 HSTS 等安全中介軟體。
- **CLI (命令列工具)**:
  - 介紹 `CommandKernel` 模組，引導開發者如何創建專案級、可重用的 Terminal CLI (類似 Laravel Artisan)。
- **Reliability (可靠性)**:
  - 介紹內建的斷路器 (Circuit Breaker)、重試 (Retry) 及其他故障保護機制的使用方法與場景。
- **Error Handling (例外處理)**:
  - 說明例外處理生命週期，包含如何自訂 JSON Error Response 及 Process 級的 Global Error Handlers。

---

## 階段二： 架構現代化升級實作 (Architectural Enhancements)

此階段將專注於補強框架競爭力的功能實作，這也是本次重構與擴建的核心任務。請按以下優先級陸續實作：

### 優先級 1: Request Context (AsyncLocalStorage)

**問題描述**：目前傳遞 Request 的狀態（如 `user_id`, `trace_id` `tenant_id`）必須透過函數參數逐層傳遞 (Prop Drilling) 或嚴重依賴 `c.get()`。
**實作方案**：
1. 在 Core 引入 `node:async_hooks` 的 `AsyncLocalStorage`（Bun 內建支援）。
2. 在 `PlanetCore` 啟動階段或 Request 最前端 Middleware 創建一個 Context Scope。
3. 建立 `RequestContext.ts` 導出 `const reqCtx = new AsyncLocalStorage<ContextPayload>()` 供全域存取。
4. **驗證**：確保在不傳遞 `Context` 參數的情況下，框架內深層次的 Service 也能抓到當前 Req 的資訊（如 Logger 能自動附帶當前的 `requestId`）。

---

### 優先級 2: Native Dependency Injection 作用域 (Scopes)

**問題描述**：目前的 DI 容器 (`Container.ts`) 僅有 `bind` (每次產生新實例) 與 `singleton` (全域單一實例)。這兩者無法滿足當我們需要**「在同一個 Request 內共用同個實例，但在跨 Request 時保持獨立」**的需求（例如 Request-scoped DB Transaction 或 UserSession）。
**實作方案**：
1. 修改 `Container.ts` 實作邏輯，新增 `container.scoped('key', factory)`。
2. 結合優先級 1 的 `AsyncLocalStorage`。當呼叫 `make('key')` 且該 key 是 `scoped` 時：
   - 如果當前有 ALS Request Context，去 Context 的內部快取找，若無則透過 factory 實例化並存入當前 Request Context。
   - 確保 Request 結束時記憶體安全釋放。
3. **驗證**：對同一個 Request 發出兩次 `make('session')`，得到相同實體；平行發送兩個獨立 Request，得到兩個不同實體。

---

### 優先級 3: 進階 Provider 生命週期，平滑啟動與關閉 (Lifecycle Hooks)

**問題描述**：`ServiceProvider.ts` 缺少夠細緻的管控節點，在需要依賴其他 Provider 的非同步操作（如等待 DB 連線池準備完畢才啟動 HTTP 伺服器）或是 Graceful Shutdown (清理資源) 時稍顯吃力。
**實作方案**：
1. 擴展 `ServiceProvider` 界面，支援以下節點：
   - `onRegister(container)`: 專注於依賴綁定 (同步)。
   - `onBoot(core)`: 基礎資源與路由初始化 (非同步)。
   - `onReady(core)`: 所有 Provider 都 `onBoot` 完畢後的觸發點（適合依賴其他 Provider 的操作）。
   - `onShutdown(core)`: 提供 Graceful Shutdown 切入點（自動清理資料庫、終止定時任務）。
2. 更新 `Application.ts` / `PlanetCore.ts` 內的 Orchestrator，去正確使用新的 Hooks 順序。
3. **驗證**：透過掛載多個延遲的 Provider，確認載入順序與生命週期的保證。送出 `SIGTERM` 時能觸發 `onShutdown` 進行清除。

---

### 優先級 4: 型別安全的組態管理 (Type-Safe Configuration)

**問題描述**：`ConfigManager.ts` 是基礎的 Getter/Setter，對於錯誤的環境變數 (`env`) 無法在 Boot 時期提前報錯，只能在 Runtime 使用時引發例外。
**實作方案**：
1. 導入輕量級 Schema Validation 機制（可考慮使用 `@sinclair/typebox`，因其運行極快且適用於 JIT，或 zod）。
2. 在 `ConfigManager` 初始化時，允許傳入一份 Schema 定義及 `process.env` 來源。如果缺少必填的配置（如 `DATABASE_URL`），系統應立即在中斷啟動並在終端機漂亮地拋出缺少哪些項目。
3. `config.get('PORT')` 透過 Schema 自動推導其回傳值是 `number` 還是 `string`。
4. **驗證**：將必填 `env` 清空並執行 `bun run start`，確認 Boot 被攔截。

---

### 優先級 5: 內建 Health & Liveness Probes

**問題描述**：針對 Cloud Native 部屬 (Kubernetes/Docker)，當前每個專案都要自己刻一版 `/health` 路由。
**實作方案**：
1. 在 `PlanetCore` 或獨立 `HealthProvider` 中預設注入路由：
   - `/health/liveness`：檢查系統是否存活 (200 OK)。
   - `/health/readiness`：檢查各外部附屬組件（透過與 Reliability 結合，檢查資料庫連線、Redis狀態）。
2. 建立機制讓其他 `ServiceProvider` 可以註冊自己的 Health Check 條件。
3. **驗證**：請求 `/health/readiness` 回傳詳細組件健康狀態與時間戳記的 JSON。

---

### 優先級 6: Bun 1.39+ 原生引擎與極限優化 (已完成) ✅

**問題描述**：通用 Web 引擎 (如 Hono) 為了跨平台而犧牲了 Bun 的底層潛力。在大規模、高併發的 Galaxy 架構下，JS 路由層與微任務開銷成為了新的效能瓶頸。
**實作方案**：
1. **Native Offloading**: 透過 `serveConfig()` 自動將靜態路由與 AOT 中介軟體鏈注入 Bun 的 SIMD 加速路由器。
2. **AOT Middleware Injection**: 將複雜的中介軟體鏈「拍平」並預編譯，徹底消除運行時的遍歷開銷。
3. **Object Pooling (Zero-allocation)**: 利用 `FastContext` 池化技術，將請求處理過程中的記憶體分配降至近乎零。
4. **Deferred Stream Release**: 實作串流安全生命週期，確保 SSE/WebSocket 在極限負載下仍能 100% 回收 IoC 資源。
5. **Microtask Elimination**: 整合 `Bun.peek()` 繞過同步處理器的事件循環隊列。
**驗證**：在極速基準測試中，靜態路由達到純 `Bun.serve` 速度，動態路由比 Hono 快 25% 以上。

---

## 實作建議與要求

1. **漸進式重構**: 在每個優先級實作完成後，請立即撰寫 / 更新相應的 `tests/**/*.test.ts` 以確保涵蓋率。
2. **遵守性能紅線**: 本次 `@gravito/core` 先前已做了許多極端優化 (如 FastContext, compiledRouter)。新增的機制（特別是 ALS 取值與 Scope DI）應維持極低延遲，並運行基準測試 (`bun run benchmark:event-system`) 對比效能波動。
3. **保持相容性**: 若實作對既有的 `PlanetCore` 或 `Container` 有破壞性 API 變更，請務必更新 `README.md`。

> 準備好後即可由第一項實作（ALS 與 RequestContext）開始動手。
