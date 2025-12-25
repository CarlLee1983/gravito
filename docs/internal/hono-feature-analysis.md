# Gravito HTTP 引擎需求分析

> 此文檔整理了 Gravito 框架對 HTTP 引擎的核心需求，用於指導未來的 Bun Native 實現或其他替代方案。
> **Legacy Note**: Photon 已成為預設引擎，此文檔保留作為歷史規劃參考。

## 已抽象功能 [Complete]

這些功能已通過 `GravitoContext` 和 `GravitoRequest` 介面進行抽象。

### Request 處理

| 功能 | 抽象方法 | Photon 對應 | 狀態 |
|------|----------|-----------|------|
| 獲取請求 URL | `ctx.req.url` | `c.req.url` | [Complete] |
| 獲取 HTTP 方法 | `ctx.req.method` | `c.req.method` | [Complete] |
| 獲取路徑 | `ctx.req.path` | `c.req.path` | [Complete] |
| 路由參數 | `ctx.req.param(name)` | `c.req.param(name)` | [Complete] |
| 查詢參數 | `ctx.req.query(name)` | `c.req.query(name)` | [Complete] |
| 請求頭 | `ctx.req.header(name)` | `c.req.header(name)` | [Complete] |
| JSON 解析 | `ctx.req.json<T>()` | `c.req.json<T>()` | [Complete] |
| Text 解析 | `ctx.req.text()` | `c.req.text()` | [Complete] |
| FormData 解析 | `ctx.req.formData()` | `c.req.formData()` | [Complete] |
| ArrayBuffer | `ctx.req.arrayBuffer()` | `c.req.arrayBuffer()` | [Complete] |
| 驗證數據 | `ctx.req.valid(target)` | `c.req.valid(target)` | [Complete] |
| 原始 Request | `ctx.req.raw` | `c.req.raw` | [Complete] |

### Response 建構

| 功能 | 抽象方法 | Photon 對應 | 狀態 |
|------|----------|-----------|------|
| JSON 響應 | `ctx.json(data, status?)` | `c.json(data, status?)` | [Complete] |
| Text 響應 | `ctx.text(text, status?)` | `c.text(text, status?)` | [Complete] |
| HTML 響應 | `ctx.html(html, status?)` | `c.html(html, status?)` | [Complete] |
| 重定向 | `ctx.redirect(url, status?)` | `c.redirect(url, status?)` | [Complete] |
| 任意 Body | `ctx.body(data, status?)` | `c.body(data, status?)` | [Complete] |
| 串流響應 | `ctx.stream(stream, status?)` | 自訂實現 | [Complete] |
| 設置頭 | `ctx.header(name, value)` | `c.header(name, value)` | [Complete] |
| 設置狀態 | `ctx.status(code)` | `c.status(code)` | [Complete] |

### Context Variables (依賴注入)

| 功能 | 抽象方法 | Photon 對應 | 狀態 |
|------|----------|-----------|------|
| 獲取變數 | `ctx.get<K>(key)` | `c.get(key)` | [Complete] |
| 設置變數 | `ctx.set<K>(key, value)` | `c.set(key, value)` | [Complete] |

### 執行環境

| 功能 | 抽象方法 | Photon 對應 | 狀態 |
|------|----------|-----------|------|
| ExecutionContext | `ctx.executionCtx` | `c.executionCtx` | [Complete] |
| 環境變數 | `ctx.env` | `c.env` | [Complete] |
| 原生存取 | `ctx.native` | N/A (逃生艙口) | [Complete] |

---

## 待抽象功能 

這些功能目前仍直接使用 Photon，需要在未來版本中進行抽象。

### Cookie 管理

| 功能 | 目前使用 | 需要實現 |
|------|----------|----------|
| 設置 Cookie | `c.res.headers.append('Set-Cookie', ...)` | `ctx.setCookie(name, value, options)` |
| 獲取 Cookie | `c.req.header('Cookie')` 手動解析 | `ctx.getCookie(name)` |
| 已簽名 Cookie | `CookieJar` + `Encrypter` | 同上，整合到抽象層 |

### Response 操作

| 功能 | 目前使用 | 需要實現 |
|------|----------|----------|
| 直接修改響應頭 | `c.res.headers.append/set` | `ctx.response.headers.set()` |
| 獲取響應對象 | `c.res` | `ctx.response` |

### 進階路由

| 功能 | 目前使用 | 需要實現 |
|------|----------|----------|
| 子路由掛載 | `app.route(path, subApp)` | `adapter.mount(path, handler)` |
| 路由分組 | `app.basePath(path)` | `adapter.group(path, routes)` |

---

## 核心 Photon 依賴點

以下是 Gravito Core 中仍直接依賴 Photon 的位置：

### 1. PlanetCore.ts
- `import { Photon } from '@gravito/photon'` - 創建 Photon 實例
- `app.use('*', middleware)` - 全局中介軟體
- `app.onError()` - 錯誤處理
- `app.notFound()` - 404 處理
- `app.fetch` - 請求處理入口

### 2. GravitoRouter.ts
- `Handler, MiddlewareHandler from '@gravito/photon'` - 類型定義
- 路由註冊邏輯 (get, post, etc.)

### 3. CookieJar.ts
- `c.res.headers.append('Set-Cookie', ...)` - 設置響應 Cookie

### 4. helpers/errors.ts
- `Context from '@gravito/photon'` - 錯誤處理上下文

### 5. helpers/response.ts
- `Context from '@gravito/photon'` - 響應輔助函數

### 6. ThrottleRequests.ts
- `MiddlewareHandler from '@gravito/photon'` - 節流中介軟體

---

## HttpAdapter 介面需求

未來的自訂 HTTP 引擎需要實現以下 `HttpAdapter` 介面：

```typescript
interface HttpAdapter<V extends GravitoVariables = GravitoVariables> {
  // 元數據
  readonly name: string
  readonly version: string
  readonly native: unknown

  // 路由註冊
  route(method: HttpMethod, path: string, ...handlers: GravitoHandler<V>[]): void
  routes(routes: RouteDefinition[]): void

  // 中介軟體
  use(path: string, ...middleware: GravitoMiddleware<V>[]): void
  useGlobal(...middleware: GravitoMiddleware<V>[]): void

  // 錯誤處理
  onError(handler: GravitoErrorHandler<V>): void
  onNotFound(handler: GravitoNotFoundHandler<V>): void

  // 請求處理
  fetch(request: Request, server?: unknown): Response | Promise<Response>

  // 生命週期
  shutdown?(): Promise<void>
}
```

---

## Bun Native 實現路線圖

### Phase 4.1: 基礎路由
- Trie-based 路由器
- 參數解析 (`:id`, `*wildcard`)
- 查詢字串解析

### Phase 4.2: 中介軟體系統
- 中介軟體鏈執行
- 錯誤邊界
- Next 函數實現

### Phase 4.3: Context 實現
- `BunContext` 實現 `GravitoContext`
- `BunRequest` 實現 `GravitoRequest`
- Response 建構器

### Phase 4.4: Cookie 抽象
- 將 `CookieJar` 從 PhotonContext 解耦
- 實現通用 Cookie 介面

### Phase 4.5: 完整遷移
- 更新所有 Orbit 模組
- 效能基準測試
- 文檔更新

---

## 效能考量

在實現 Bun Native 引擎時，需要關注：

1. **路由匹配效能** - 使用 Radix Trie 或類似結構
2. **記憶體分配** - 最小化每請求分配
3. **串流處理** - 高效的 ReadableStream 處理
4. **並發處理** - 利用 Bun 的原生非同步特性

---

*最後更新: 2025-12-21*
