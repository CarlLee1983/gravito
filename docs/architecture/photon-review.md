---
title: Photon HTTP Engine 架構技術審查與優化報告
version: 1.0.0
status: Stable
tier: B
last_updated: 2026-02-21
dependencies:
  bun: ">=1.0.0"
  hono: "^4.0.0"
related_orbits:
  - core
  - atlas
---

# Gravito Photon 架構技術規格與審查報告

## 📖 目錄

1. [快速開始](#快速開始)
2. [模組概覽](#模組概覽)
3. [架構設計](#架構設計)
4. [API 參考](#api-參考)
5. [關鍵設計決策](#關鍵設計決策)
6. [效能與擴展性分析](#效能與擴展性分析)
7. [邊際案例與限制](#邊際案例與限制)
8. [實作計畫與優化成果](#實作計畫與優化成果)

---

## 快速開始

Photon 是 Gravito 框架的高效能 HTTP 核心引擎。以下是快速上手的範例：

```typescript
import { Photon } from '@gravito/photon'
import { binaryMiddleware, htmxMiddleware, rateLimit } from '@gravito/photon'

const app = new Photon()

// 使用內建優化中介軟體
app.use(htmxMiddleware())
app.use(binaryMiddleware())
app.use(rateLimit({ maxRequests: 100, windowMs: 60000 }))

app.get('/api/data', (c) => {
  return c.json({ status: 'ok', data: [1, 2, 3] })
})

export default app
```

---

## 模組概覽

**模組名稱**：`@gravito/photon`
**定位**：Gravito 框架的高效能 HTTP 核心引擎
**核心職責**：
- 包裝並擴展 Hono 做為基礎路由與中介軟體系統。
- 提供針對框架特定需求優化的中介軟體（如：HTMX 支援、CBOR 二進位壓縮、速率限制）。
- 提供 JWT 認證、開放 API（OpenAPI）與錯誤處理的標準化出口。

---

## 架構設計

### 1. API Signature 與核心層次
Photon 的核心為 `Photon` 類別，直接繼承自 `Hono`。並透過不同的模組切割匯出特定功能：

- **核心服務** (`src/index.ts`)：匯出 `Photon` 類別與內建的 `binary`、`htmx`、`ratelimit` 中介軟體。
- **認證機制** (`src/jwt.ts`)：對 `hono/jwt` 進行延遲載入（Proxy via Require），提供 `sign`, `verify`, `decode`, `jwt` 介面。
- **OpenAPI 支援** (`src/openapi.ts`)：擴展 `@hono/zod-openapi`，提供強型別的 API 路由驗證 (`PhotonOpenAPI`)。

### 2. 資料流向
1. **Request 進入**：由 Bun 的 HTTP 伺服器接收，經由 Photon (Hono) 路由。
2. **Middleware 攔截**：
   - `htmxMiddleware`：檢查標頭 `HX-Request`，將解析出的 HTMX 狀態注入 `c.set('htmx', ...)`，供下游控制器使用以簡化依賴。
   - `rateLimit`：計算客戶端 IP 金鑰，向儲存層 (`MemoryStore` 或 `RedisStore`) 查詢並遞增計數。
   - 下游控制器執行並產出 `Response`。
3. **Response 處理** (`binaryMiddleware`)：
   - 若客戶端要求 `Accept: application/cbor` 且伺服器回傳 JSON，於後置階段（`await next()` 後）攔截 Response。
   - 提取並序列化回 `CBOR` 二進位格式，替換原有 Response。

---

## API 參考

### 核心中介軟體

#### `rateLimit(config: RateLimitConfig)`
提供高效能的流量限制功能。支援記憶體與 Redis 儲存。

```typescript
import { rateLimit, RedisStore } from '@gravito/photon'

app.use(rateLimit({
  maxRequests: 50,
  windowMs: 60000,
  store: new RedisStore(redisClient, { maxRequests: 50, windowMs: 60000 })
}))
```

#### `binaryMiddleware()`
自動將 JSON 回應轉換為 CBOR 二進位格式。

```typescript
app.use(binaryMiddleware())
```

#### `jwt(options: JwtOptions)`
JWT 驗證中介軟體。

```typescript
import { jwt } from '@gravito/photon/jwt'
app.use('/auth/*', jwt({ secret: 'shhhh' }))
```

---

## 關鍵設計決策

### 採用 Hono 為底層架構而非直接開發
- **決策**：在 `index.ts` 將 `Hono` 重命名為 `Photon` 匯出，而不是從零撰寫路由樹（Trie/RegExp）。
- **優勢**：保留 Hono 在 Bun/Edge runtime 上的極致效能基準，直接獲得完整的中介軟體生態與強大的 TypeScript 推斷能力。
- **劣勢**：與 Hono 的耦合度極高，未來若需替換底層引擎將產生破壞性更新。

### 中介軟體後處理 (Post-processing) 實作 CBOR
- **決策**：在 `binary.ts` 採用 `await c.res.json()` 來讀取 JSON，並將回傳型態轉換成 `application/cbor`。
- **優勢**：開發者在撰寫 API 邏輯時無需意識到 CBOR 的存在，可無縫支援高頻交易或大型 payload 的壓縮，相比 `JSON.stringify` 帶來 2-3x 的效能提升。

---

## 效能與擴展性分析

⚠️ 本次 Code Review 揭露並已修復的關鍵風險：

### 1. `MemoryStore` 的 O(N) 定期清理機制
- **問題**：`setInterval` 每 60 秒會對 Map 進行完整的迴圈迭代。
- **修正**：改為**雙向鏈結串列搭配 Map** 實作，將過期清理優化為 O(M)（M 為過期項目數），並對 Interval 使用 `unref()`。

### 2. `binary.ts` 中不可變 Headers 處理
- **問題**：直接對 `c.res.headers` 進行 `.set()` 可能因 Immutable Headers 拋出錯誤。
- **修正**：改為 `new Headers(c.res.headers)` 建立新物件。

---

## 邊際案例與限制

- **CBOR 轉換失敗**：若回應非有效 JSON，`binaryMiddleware` 現已增加 `try-catch` 保護，會自動跳過轉換而非拋出 500。
- **型別安全性**：已將 `JwtPayload` 等型別從 `any` 提升至 `Record<string, unknown>`。

---

## 實作計畫與優化成果

### 已完成優化 (Done)
1. **修復 Binary Middleware**：解決 Headers 覆寫與 JSON 解析崩潰問題。
2. **重構 Rate Limit Store**：實現高效能 MemoryStore 與支援原子操作的 RedisStore。
3. **強化型別守衛**：JWT 相關型別現在更加嚴謹，減少 `any` 帶來的潛在風險。

```typescript
// 優化後的 MemoryStore 結構示意
class MemoryStore {
  private store = new Map<string, { count: number; node: ExpiryNode }>()
  private head?: ExpiryNode // 鏈表頭部（最先過期）
  private tail?: ExpiryNode // 鏈表尾部
}
```
