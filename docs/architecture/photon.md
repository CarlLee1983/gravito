# Photon HTTP Engine 架構技術規格書

## 1. 模組概覽

**Photon** (`@gravito/photon`) 是 Gravito 框架的高效能 HTTP 引擎層，負責底層請求處理、路由分發與中介軟體執行。它基於 Hono 構建，提供了極致的效能與 Web 標準相容性。

### 核心職責
- **HTTP Engine**：基於 Web Standards (Request/Response) 的高效能伺服器封裝。
- **Routing System**：支援參數化路徑、巢狀路由與路由分組（Trie/RegExp Router）。
- **Middleware Pipeline**：洋蔥式（Onion Model）中介軟體執行機制。
- **Type-Safe RPC**：提供端到端（End-to-End）型別安全的客戶端生成能力 (`hc`)。

---

## 2. 技術規格與架構設計

### 2.1 核心架構：Hono 的擴展與封裝

Photon 採取「巨人的肩膀」策略，基於 **Hono** 進行擴展：

1.  **Photon Facade** (`src/index.ts`)
    -   直接匯出 `Hono` 為 `Photon`，保持 API 100% 相容。
    -   開發者可以使用熟悉的 Hono 語法 (`app.get`, `c.json`) 開發 Gravito 應用。
    -   **優勢**：
        -   **Ultrafast**：針對 Bun 優化的路由匹配演算法。
        -   **Web Standards**：原生使用 `Request`/`Response` 物件。
        -   **Type Inference**：業界領先的 TypeScript 泛型推導。

2.  **Middleware Extensions**
    -   Gravito 專屬增強中介軟體：
        -   `binaryMiddleware` (`src/middleware/binary.ts`)：支援 CBOR (Concise Binary Object Representation) 高效二進位傳輸，自動處理 `application/cbor` 內容協商。
        -   `htmxMiddleware` (`src/middleware/htmx.ts`)：針對 HTMX 請求的 `HX-Request` 偵測與 Header 輔助方法。

### 2.2 RPC 架構 (Client-Server Type Safety)

Photon 提供輕量級 RPC 機制 (`src/client.ts`)，允許前端直接使用後端 API 定義，實現「無代碼生成」的型別安全。

```typescript
// Backend
const app = new Photon()
const route = app.get('/hello', (c) => c.json({ message: 'world' }))
export type AppType = typeof route

// Frontend
import { hc } from '@gravito/photon/client'
const client = hc<AppType>('http://localhost:3000')
const res = await client.hello.$get() // Fully Typed!
```

---

## 3. 關鍵設計決策

### 3.1 採用 Hono 作為底層
**決策**：不自研 HTTP Router，而是 wrapper Hono。
**原因**：
-   **效能**：Hono 是目前 JS 生態中最快的 Router 之一。
-   **標準化**：完全符合 Web Standards，與 Gravito "Modern" 目標一致。
-   **生態系**：可直接使用 Hono 的豐富中介軟體生態。

### 3.2 顯式 Context 傳遞 (Explicit Context)
**決策**：所有 Request 狀態掛載在 `c` (Context) 物件傳遞，而非 `this`。
**原因**：
-   **Functional Style**：便於測試與組合。
-   **型別推導**：TypeScript 可精確推導 `c.req.param()` 與 `c.req.json()` 的型別。

### 3.3 內建 CBOR 支援
**決策**：提供 `binaryMiddleware` 自動處理 CBOR。
**原因**：
-   **效能**：在數據密集場景（如電商列表），CBOR 比 JSON 體積更小、解析更快。
-   **透明性**：透過 Content Negotiation 自動切換，業務邏輯無需修改。

---

## 4. 風險分析與潛在問題

### 4.1 對 Hono 的依賴風險
-   **問題**：核心能力綁定 Hono，若 Hono 有重大 Breaking Change 需跟隨。
-   **緩解**：`@gravito/core` 透過 `HttpAdapter` 抽象層隔離了具體引擎，且 Core 內部已開始實驗自研的 `Gravito Engine` (`src/engine/Gravito.ts`) 作為未來備案。

### 4.2 中介軟體順序敏感性
-   **問題**：執行順序嚴格依賴註冊順序。
-   **風險**：在多 Orbit 掛載的大型應用中，全域 Middleware (如 `*`) 可能意外影響其他 Orbit。
-   **建議**：PlanetCore 層級應限制 Orbit 只能註冊在自己的 Path Scope 下。

---

## 5. 效能與擴展性

### 5.1 路由演算法優化
-   **RegExpRouter**：用於扁平路由，速度極快。
-   **TrieRouter**：用於巢狀與參數路由，確保 Gravito 的 Orbit 掛載模式 (`/api/orbit/*`) 效能不隨路由數量線性下降。

### 5.2 Zero-Copy Response
-   **機制**：盡可能直接回傳 `Response` 物件。
-   **優化**：在 Bun Runtime 下，Photon 利用 Bun 原生 API 減少序列化與記憶體複製開銷。

---

## 6. 後續優化建議

1.  **增強 OpenAPI 整合** (Priority: High)
    -   整合 `hono-openapi` 或 `zod-openapi`，從型別定義自動生成 Swagger 文檔。

2.  **Orbit 級別的 Middleware 隔離** (Priority: Medium)
    -   實作輔助函數，確保中介軟體只作用於特定 Orbit 子樹。

3.  **HTTP/3 QUIC 支援** (Priority: Low)
    -   評估 Bun 的 HTTP/3 支援進度，適時暴露相關配置。
