# Gravito Photon 架構技術規格與審查報告

## 1. 模組概覽

**模組名稱**：`@gravito/photon`
**定位**：Gravito 框架的高效能 HTTP 核心引擎
**核心職責**：
- 包裝並擴展 Hono 做為基礎路由與中介軟體系統。
- 提供針對框架特定需求優化的中介軟體（如：HTMX 支援、CBOR 二進位壓縮、速率限制）。
- 提供 JWT 認證、開放 API（OpenAPI）與錯誤處理的標準化出口。

---

## 2. 技術規格

### 2.1 API Signature 與核心層次
Photon 的核心為 `Photon` 類別，直接繼承自 `Hono`。並透過不同的模組切割匯出特定功能：

- **核心服務** (`src/index.ts`)：匯出 `Photon` 類別與內建的 `binary`、`htmx`、`ratelimit` 中介軟體。
- **認證機制** (`src/jwt.ts`)：對 `hono/jwt` 進行延遲載入（Proxy via Require），提供 `sign`, `verify`, `decode`, `jwt` 介面。
- **OpenAPI 支援** (`src/openapi.ts`)：擴展 `@hono/zod-openapi`，提供強型別的 API 路由驗證 (`PhotonOpenAPI`)。

### 2.2 資料流向
1. **Request 進入**：由 Bun 的 HTTP 伺服器接收，經由 Photon (Hono) 路由。
2. **Middleware 攔截**：
   - `htmxMiddleware`：檢查標頭 `HX-Request`，將解析出的 HTMX 狀態注入 `c.set('htmx', ...)`，供下游控制器使用以簡化依賴。
   - `rateLimit`：計算客戶端 IP 金鑰，向儲存層 (`MemoryStore`) 查詢並遞增計數。若超越 `maxRequests`，中斷流程回傳 429。
   - 下游控制器執行並產出 `Response`。
3. **Response 處理** (`binaryMiddleware`)：
   - 若客戶端要求 `Accept: application/cbor` 且伺服器回傳 JSON，於後置階段（`await next()` 後）攔截 Response。
   - 提取並序列化回 `CBOR` 二進位格式，替換原有 Response。

---

## 3. 關鍵設計決策

### 3.1 採用 Hono 為底層架構而非直接開發
- **決策**：在 `index.ts` 將 `Hono` 重命名為 `Photon` 匯出，而不是從零撰寫路由樹（Trie/RegExp）。
- **優勢**：保留 Hono 在 Bun/Edge runtime 上的極致效能基準，直接獲得完整的中介軟體生態與強大的 TypeScript 推斷能力。
- **劣勢**：與 Hono 的耦合度極高，未來若需替換底層引擎將產生破壞性更新。

### 3.2 中介軟體後處理 (Post-processing) 實作 CBOR
- **決策**：在 `binary.ts` 採用 `await c.res.json()` 來讀取 JSON，並將回傳型態轉換成 `application/cbor`。
- **優勢**：開發者在撰寫 API 邏輯時無需意識到 CBOR 的存在，可無縫支援高頻交易或大型 payload 的壓縮，相比 `JSON.stringify` 帶來 2-3x 的效能提升。
- **缺點 / 潛在問題**：可能會阻斷 Response Body 為不可反序列化格式的操作。

---

## 4. 效能與擴展性（深度分析與隱患揭示）

⚠️ 本次 Code Review 揭露了幾個影響擴展性與穩定性的潛在風險：

### 4.1. 【效能與記憶體風險】`MemoryStore` 的 O(N) 定期清理機制
- **位置**：`packages/photon/src/middleware/ratelimit.ts:122`
- **問題分析**：`setInterval` 每 60 秒會對 `this.store.entries()` 進行完整的迴圈迭代 (`for (const [key, value] of ...)` )。若在遭遇 DDoS 或超高併發（例如百萬次不同 IP 請求）的情境下，Map 會變得非常大，造成事件迴圈 (Event Loop) 嚴重的 CPU 阻塞。
- **記憶體洩漏風險**：使用 `setInterval` 若未在應用程式關閉時觸發 `destroy()`，會阻斷 Node/Bun 進程自然退出。

### 4.2. 【執行時期錯誤風險】`binary.ts` 中竄改 Response Headers
- **位置**：`packages/photon/src/middleware/binary.ts:46`
- **問題分析**：程式碼中 `const headers = c.res.headers; headers.set('Content-Type', ...)` 嘗試直接 mutate 已存在的 Headers 物件。在某些邊緣情境（例如從 `fetch` Proxy 或是特定 Adapter 產生的 Response），`Headers` 是不可變的 (Immutable)，嘗試 `.set` 將拋出例外，進而導致 500 Internal Server Error。

### 4.3. 【併發設計】`ratelimit` 的 Store 介面約定
- **位置**：`packages/photon/src/middleware/ratelimit.ts:77`
- **分析**：`increment` 回傳 `Promise<RateLimitState>`，目前的 `MemoryStore` 使用無異步等待的實作，因此在單執行緒的 Javascript 中不存在 Race Condition。但當外部開發者實作 Redis 等外部儲存（RedisStore）時，若未實作原子的遞增與過期指派（例如未使用 Lua 腳本或 `INCR` 配合 `EXPIRE` 管道），可能產生計數覆蓋的併發問題。

---

## 5. 邊際案例與限制

- **CBOR 轉換失敗**：若 API 拋出了 `c.json()` 以外的 JSON 但結構有異常，`await c.res.json()` 可能拋出解析錯誤，導致後續錯誤處理被覆蓋。
- **型別安全性弱化**：在 `src/jwt.ts` 中，`JwtPayload` 被指定為 `any`（`export type JwtPayload = any`），導致依賴 JwtPayload 的業務端無法享有原本的型別守衛。

---

## 6. 後續優化建議與實作計畫

### 短期修正 (Hotfixes)
1. **修復 Binary Middleware 的 Headers 覆寫問題**：
   在 `binary.ts` 改為 `const headers = new Headers(c.res.headers); headers.set(...)` 避免 Immutable Headers 的錯誤。
2. **保護 JSON 解析階段**：
   在 `binary.ts` 使用 `try-catch` 包覆 `c.res.json()`，並在解析失敗時提前放行，不進行 CBOR 轉換。

### 中期改良
1. **重構 Rate Limit 的 MemoryStore**：
   將 O(N) 的定時清理迴圈移除。改為**雙向鏈結串列搭配 Map** 實作，或引進微型且具 Time-to-Live (TTL) 的 LRU Cache 庫，降低高併發下對 Event Loop 的阻塞。同時加入 `this.cleanupInterval.unref?.()` 防止阻斷系統退出。
2. **增強 JWT 型別安全**：
   將 `jwt.ts` 中的 `any` 移出，使用通用型別 `Record<string, unknown>` 或 `unknown`，迫使下游在取用 `sub` 等資訊時進行安全的屬性斷言 (Zod)。

### 長期規劃
1. **內建分佈式 Store 支持**：針對 `ratelimit` 提供官方維護的 `@gravito/photon/redis-store`，實作原子層級的 Lua Rate Limiting 邏輯。
2. **HTTP/3 與 WebSocket (Bun Native)**：深化 Photon 對 Bun 原生 WebSocket 及未來新協定的封裝支援，更緊密地結合 Gravito 的即時通訊服務。
