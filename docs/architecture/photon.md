# Photon HTTP Engine 架構技術規格書

## 1. 模組概覽

**Photon** (`@gravito/photon`) 是 Gravito 框架的高效能 HTTP 引擎，負責底層請求處理、路由分發與中介軟體執行。

### 核心職責
- **HTTP Engine**：基於 Web Standards (Request/Response) 的高效能伺服器封裝。
- **Routing System**：支援參數化路徑、巢狀路由與路由分組。
- **Middleware Pipeline**：洋蔥式（Onion Model）中介軟體執行機制。
- **Type-Safe RPC**：提供端到端（End-to-End）型別安全的客戶端生成能力。

---

## 2. 技術規格與架構設計

### 2.1 核心架構：Hono 的擴展與封裝

Photon 並非從零打造，而是基於 **Hono** 進行擴展與最佳化。這是一個戰略性的「巨人的肩膀」決策。

1.  **Photon (Facade)** (`src/index.ts`)
    -   直接匯出 `Hono` 為 `Photon`，保持 API 相容性。
    -   這意味著 Photon 繼承了 Hono 的所有優勢：
        -   **Ultrafast**：針對 Bun/Cloudflare Workers 優化的 RegExpRouter/TrieRouter。
        -   **Web Standards**：原生使用 `Request` 和 `Response` 物件。
        -   **Type Inference**：強大的泛型推導能力。

2.  **Middleware Extensions**
    -   Gravito 團隊維護了一組專屬的中介軟體，增強與 Gravito 生態系的整合：
        -   `binaryMiddleware` (`src/middleware/binary.ts`)：支援 CBOR 高效二進位傳輸。
        -   `htmxMiddleware` (`src/middleware/htmx.ts`)：針對 HTMX 的 Headers 處理與狀態注入。

### 2.2 RPC 架構 (Client-Server Type Safety)

Photon 提供了一個輕量級的 RPC 機制（`src/client.ts`），允許前端直接使用後端的 API 定義。

```typescript
// Backend
const app = new Photon()
const route = app.get('/hello', (c) => c.json({ message: 'world' }))
export type AppType = typeof route

// Frontend
import { hc } from '@gravito/photon/client'
const client = hc<AppType>('http://localhost:3000')
const res = await client.hello.$get() // Type-safe!
```

---

## 3. 關鍵設計決策

### 3.1 採用 Hono 作為底層引擎
**決策**：不自研 HTTP Router，而是 fork/wrapper Hono。
**原因**：
-   **效能**：Hono 是目前 JS 生態中最快的 Router 之一，特別是在 Bun 上。
-   **標準化**：完全符合 Web Standards，這與 Gravito "Modern" 的目標一致。
-   **維護成本**：將 HTTP 協議解析的複雜度外包，專注於上層架構（Orbit/Satellite）。

### 3.2 顯式 Context 傳遞 (Explicit Context)
**決策**：所有 Request 相關狀態都掛載在 `c` (Context) 物件上傳遞，而非使用 `this` 或全域變數。
**原因**：
-   **Functional Style**：便於測試與組合。
-   **型別推導**：TypeScript 可以精確推導 `c.req.param()` 與 `c.json()` 的型別。

### 3.3 內建 CBOR 支援
**決策**：提供 `binaryMiddleware` 自動處理 CBOR。
**原因**：
-   **效能**：對於 Gravito 預設支援的電商/數據密集場景，JSON 序列化往往是瓶頸。CBOR 可減少 payload 大小並提升解析速度。

---

## 4. 風險分析與潛在問題

### 4.1 對 Hono 的依賴風險
-   **問題**：Photon 的核心能力完全綁定 Hono。若 Hono 發生重大 Breaking Change，Photon 需跟隨升級。
-   **風險**：Gravito 特有的擴展（如 Orbit Mounting）可能與 Hono 未來的改動衝突。
-   **緩解**：`@gravito/core` 中的 `HttpAdapter` 模式提供了一層抽象，理論上可以換掉 Photon，但實務上成本極高。

### 4.2 中介軟體順序敏感性
-   **問題**：Hono 的中介軟體執行順序嚴格依賴註冊順序。
-   **風險**：在大型應用中（多個 Orbit 掛載），若某個 Orbit 註冊了全域 Middleware（如 `*`），可能會意外影響其他 Orbit。
-   **建議**：在 `PlanetCore` 層級加強對 Middleware 註冊範圍的管控，限制 Orbit 只能註冊在自己的 Path Scope 下。

---

## 5. 效能與擴展性

### 5.1 RegExpRouter vs TrieRouter
-   **機制**：Hono 根據路由模式自動選擇 Router 實作。
-   **優勢**：
    -   **RegExpRouter**：對於扁平路由（Flat Routes）極快。
    -   **TrieRouter**：對於複雜的巢狀路由與參數匹配（Parametric Routing）表現優異。
-   **Gravito 應用**：由於 Gravito 採用 Orbit 掛載模式（`/api/orbit-a/*`），TrieRouter 的特性被充分利用，確保了即使掛載數十個微服務，路由匹配速度仍接近 O(1)。

### 5.2 Zero-Copy Response
-   **機制**：Photon 盡可能直接回傳 `Response` 物件，避免不必要的物件複製。
-   **優化**：在 Bun Runtime 下，`c.json()` 與 `c.text()` 會直接使用 Bun 的原生 API，減少序列化開銷。

---

## 6. 後續優化建議

1.  **增強 OpenAPI 整合** (Priority: High)
    -   目前的 RPC 雖然型別安全，但缺乏語言無關的 API 文檔。建議整合 `hono-openapi` 或類似方案，自動生成 Swagger/OpenAPI Spec。

2.  **Orbit 級別的 Middleware 隔離** (Priority: Medium)
    -   實作 `OrbitMiddleware` 裝飾器或輔助函數，確保中介軟體只作用於特定 Orbit 的路由子樹，防止全域污染。

3.  **HTTP/3 QUIC 支援預研** (Priority: Low)
    -   隨著 Bun 對 HTTP/3 的支援成熟，Photon 應評估暴露相關配置，以支援更低延遲的連線。
