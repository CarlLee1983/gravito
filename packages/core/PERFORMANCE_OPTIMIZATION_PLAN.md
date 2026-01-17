# @gravito/core 效能優化計劃

> **版本**: 2.0.0
> **日期**: 2026-01-17
> **最後更新**: 2026-01-17
> **目標**: 提升框架整體吞吐量 30-50%

---

## 執行摘要

本計劃針對 `@gravito/core` 的**實際效能瓶頸**進行分析和優化。與 `@gravito/photon`（純別名層）不同，core 包含真正的業務邏輯和效能敏感代碼。

### 效能影響分級

| 優先級 | 優化項目 | 預估提升 | 複雜度 | 風險 | 適用範圍 |
|-------|---------|---------|-------|-----|---------|
| P0 | 基準測試基線建立 | - | 低 | 無 | 全局 |
| P1 | 中間件鏈預編譯 | 10-15% | 中 | 低 | Gravito Engine |
| P2 | MinimalContext Query 快取 | 5-8% | 低 | 低 | Gravito Engine |
| P3 | PhotonAdapter Proxy 消除 | 15-25% | 高 | 中 | PhotonAdapter |
| P4 | AOTRouter 中間件快取 | 5-10% | 低 | 低 | Gravito Engine |
| P5 | FastContext Headers 池化 | 待驗證 | 低 | 低 | Gravito Engine |
| P6 | Container Symbol Key | 2-3% | 低 | 低 | 全局 |

**總計預估**: 35-58% 效能提升（需基準測試驗證）

---

## 架構說明

> **重要**: 本計劃的優化項目針對不同的執行路徑，理解架構是正確實施的前提。

### 雙執行路徑架構

`@gravito/core` 存在**兩條獨立的執行路徑**：

```
┌─────────────────────────────────────────────────────────────────┐
│                        @gravito/core                            │
├─────────────────────────────┬───────────────────────────────────┤
│     Gravito Engine          │        PhotonAdapter              │
│     (原生高效能引擎)          │        (Hono/Photon 相容層)        │
├─────────────────────────────┼───────────────────────────────────┤
│ • FastContext (無 Proxy)    │ • PhotonContextWrapper (Proxy)    │
│ • MinimalContext (超輕量)    │ • PhotonRequestWrapper (Proxy)    │
│ • ObjectPool (物件池化)      │ • 無池化，每次創建新實例            │
│ • AOTRouter (O(1) 靜態路由)  │ • 委託 Photon 路由                 │
├─────────────────────────────┼───────────────────────────────────┤
│ 適用場景:                    │ 適用場景:                         │
│ • 新專案，追求極致效能         │ • 需要 Hono API 相容性             │
│ • 不需要 Hono 生態系統        │ • 使用 Hono 中間件生態系統          │
│ • 直接使用 Bun.serve         │ • 漸進式遷移                       │
└─────────────────────────────┴───────────────────────────────────┘
```

### 現有優化狀態

| 優化技術 | Gravito Engine | PhotonAdapter |
|---------|---------------|---------------|
| Object Pool | ✅ 已實現 (`pool.ts`) | ❌ 無 |
| 無 Proxy Context | ✅ `FastContext` | ❌ 使用 Proxy |
| 超輕量 Context | ✅ `MinimalContext` | ❌ 無 |
| O(1) 靜態路由 | ✅ `AOTRouter` | 透過 Photon |
| 路徑快速提取 | ✅ `extractPath()` | N/A |
| Handler 分析優化 | ✅ `analyzer.ts` | ❌ 無 |

### 關鍵文件對照

```
Gravito Engine:
├── src/engine/Gravito.ts        # 主引擎
├── src/engine/FastContext.ts    # 池化 Context
├── src/engine/MinimalContext.ts # 超輕量 Context
├── src/engine/AOTRouter.ts      # AOT 路由器
├── src/engine/pool.ts           # 物件池
├── src/engine/path.ts           # 路徑提取
└── src/engine/analyzer.ts       # Handler 分析

PhotonAdapter:
└── src/adapters/PhotonAdapter.ts # Photon 適配器（使用 Proxy）
```

---

## Phase 0: 基準測試基線建立（最高優先級）

> **原則**: 沒有數據支撐的優化是盲目的。

### 目的

在進行任何優化之前，建立完整的效能基線數據，用於：
1. 驗證問題假設是否正確
2. 量化每個優化的實際收益
3. 避免過早優化和過度工程

### 基準測試套件設計

```typescript
// benchmarks/baseline.ts
import { bench, group, run } from 'mitata'
import { Gravito } from '../src/engine/Gravito'
import { FastContext } from '../src/engine/FastContext'
import { MinimalContext } from '../src/engine/MinimalContext'
import { PhotonAdapter, PhotonContextWrapper } from '../src/adapters/PhotonAdapter'
import { ObjectPool } from '../src/engine/pool'

// ═══════════════════════════════════════════════════════════════════
// 1. Context 創建基準
// ═══════════════════════════════════════════════════════════════════

group('Context Creation', () => {
  const mockRequest = new Request('http://localhost:3000/api/users?id=123')
  
  bench('FastContext (pooled)', () => {
    const pool = new ObjectPool(() => new FastContext(), (ctx) => ctx.reset(mockRequest), 256)
    const ctx = pool.acquire()
    ctx.reset(mockRequest, {})
    pool.release(ctx)
  })
  
  bench('MinimalContext (new)', () => {
    new MinimalContext(mockRequest, {}, '/api/users')
  })
  
  bench('PhotonContextWrapper.create() [with Proxy]', () => {
    // 需要模擬 Photon Context
    // PhotonContextWrapper.create(mockPhotonCtx)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2. Proxy 開銷基準
// ═══════════════════════════════════════════════════════════════════

group('Proxy Overhead', () => {
  const target = { value: 42, method: () => 'result' }
  const proxied = new Proxy(target, {
    get(t, p) { return Reflect.get(t, p) }
  })
  
  bench('Direct property access', () => {
    return target.value
  })
  
  bench('Proxy property access', () => {
    return proxied.value
  })
  
  bench('Direct method call', () => {
    return target.method()
  })
  
  bench('Proxy method call', () => {
    return proxied.method()
  })
})

// ═══════════════════════════════════════════════════════════════════
// 3. 中間件執行基準
// ═══════════════════════════════════════════════════════════════════

group('Middleware Execution', () => {
  const mockCtx = {} as any
  const mockHandler = async () => new Response('ok')
  
  // 當前實現：運行時創建閉包
  const executeCurrentMiddleware = async (
    middleware: any[],
    handler: any
  ) => {
    let index = 0
    const next = async () => {
      if (index < middleware.length) {
        return await middleware[index++](mockCtx, next)
      }
      return undefined
    }
    const result = await next()
    return result ?? await handler(mockCtx)
  }
  
  // 預編譯版本（待實現）
  const compileMiddlewareChain = (middleware: any[], handler: any) => {
    // TODO: 實現預編譯
    return handler
  }
  
  const middleware3 = [
    async (_c: any, next: any) => { await next() },
    async (_c: any, next: any) => { await next() },
    async (_c: any, next: any) => { await next() },
  ]
  
  bench('3 middleware (current)', async () => {
    await executeCurrentMiddleware(middleware3, mockHandler)
  })
  
  bench('3 middleware (precompiled)', async () => {
    const compiled = compileMiddlewareChain(middleware3, mockHandler)
    await compiled(mockCtx)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 4. Headers 創建基準
// ═══════════════════════════════════════════════════════════════════

group('Headers Management', () => {
  bench('new Headers()', () => {
    return new Headers()
  })
  
  const reusableHeaders = new Headers()
  const trackedKeys: string[] = []
  
  bench('Headers reuse + delete (2 keys)', () => {
    reusableHeaders.set('Content-Type', 'application/json')
    reusableHeaders.set('X-Request-ID', '123')
    trackedKeys.push('Content-Type', 'X-Request-ID')
    
    for (const key of trackedKeys) {
      reusableHeaders.delete(key)
    }
    trackedKeys.length = 0
  })
})

// ═══════════════════════════════════════════════════════════════════
// 5. URL 解析基準
// ═══════════════════════════════════════════════════════════════════

group('URL Parsing', () => {
  const url = 'http://localhost:3000/api/users/123?sort=name&limit=10'
  
  bench('new URL()', () => {
    return new URL(url).pathname
  })
  
  bench('extractPath() [optimized]', () => {
    // 現有實現
    const protocolEnd = url.indexOf('://')
    const searchStart = protocolEnd === -1 ? 0 : protocolEnd + 3
    const pathStart = url.indexOf('/', searchStart)
    if (pathStart === -1) return '/'
    const queryStart = url.indexOf('?', pathStart)
    return queryStart === -1 ? url.slice(pathStart) : url.slice(pathStart, queryStart)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 6. Map 查找基準（Symbol vs String）
// ═══════════════════════════════════════════════════════════════════

group('Map Lookup', () => {
  const stringMap = new Map<string, number>()
  const symbolMap = new Map<symbol, number>()
  const key = 'UserService'
  const symKey = Symbol('UserService')
  
  stringMap.set(key, 42)
  symbolMap.set(symKey, 42)
  
  bench('Map.get(string)', () => {
    return stringMap.get(key)
  })
  
  bench('Map.get(symbol)', () => {
    return symbolMap.get(symKey)
  })
})

await run()
```

### HTTP 負載測試腳本

```bash
#!/bin/bash
# benchmarks/http-load-test.sh

# 確保伺服器運行中
# bun run examples/benchmark-server.ts &

echo "=== HTTP Load Test ==="
echo ""

# 測試 1: 空路由（最快路徑）
echo "1. Empty route (no middleware, MinimalContext)"
oha -n 100000 -c 100 http://localhost:3000/health

# 測試 2: 靜態路由 + FastContext
echo "2. Static route with FastContext"
oha -n 100000 -c 100 http://localhost:3000/api/status

# 測試 3: 動態路由
echo "3. Dynamic route with params"
oha -n 100000 -c 100 http://localhost:3000/api/users/123

# 測試 4: 3 個中間件
echo "4. Route with 3 middleware"
oha -n 100000 -c 100 http://localhost:3000/api/protected/resource

# 測試 5: PhotonAdapter 路徑（如果有）
echo "5. PhotonAdapter path"
oha -n 100000 -c 100 http://localhost:3000/photon/users
```

### 基線數據模板

| 測試場景 | 指標 | 當前值 | 記錄日期 |
|---------|-----|-------|---------|
| 空路由 RPS | requests/sec | _待測量_ | - |
| 空路由 p50 | latency | _待測量_ | - |
| 空路由 p99 | latency | _待測量_ | - |
| 3 中間件路由 RPS | requests/sec | _待測量_ | - |
| 動態路由 RPS | requests/sec | _待測量_ | - |
| Context 創建 (pooled) | ns/op | _待測量_ | - |
| Context 創建 (Proxy) | ns/op | _待測量_ | - |
| Proxy 屬性存取 | ns/op | _待測量_ | - |
| new Headers() | ns/op | _待測量_ | - |

### 實施步驟

1. 創建 `benchmarks/` 目錄結構
2. 實現基準測試套件
3. 創建基準測試伺服器 (`benchmark-server.ts`)
4. 運行基準測試並記錄結果
5. 將結果存入 `benchmarks/results/baseline-YYYY-MM-DD.json`
6. 依據實際數據調整後續 Phase 的優先級

---

## Phase 1: 中間件鏈預編譯

> **適用範圍**: Gravito Engine
> **優先級**: P1（影響所有路徑，風險低）

### 問題分析

**文件**: `packages/core/src/engine/Gravito.ts:499-522`

**現狀**: 每次請求都創建新的 `next` 閉包

```typescript
private async executeMiddleware(
  ctx: FastContext,
  middleware: Middleware[],
  handler: Handler
): Promise<Response> {
  let index = 0

  const next = async (): Promise<Response | undefined> => {  // ❌ 每次請求創建
    if (index < middleware.length) {
      const mw = middleware[index++]!
      return await mw(ctx, next)
    }
    return undefined
  }

  const result = await next()
  // ...
}
```

**問題**:
1. 每次請求都創建新的 `next` 閉包
2. 閉包捕獲 `index` 變數，增加記憶體壓力
3. 運行時的索引檢查和遞增操作

### 優化方案: 預編譯中間件鏈

在路由註冊時（`compileRoutes()`）預編譯中間件執行器：

```typescript
/**
 * 預編譯的中間件執行器
 * 
 * 核心思想：將中間件陣列轉換為鏈式函數，
 * 避免運行時的閉包創建和索引操作。
 */
type CompiledHandler = (ctx: FastContext) => Promise<Response>

function compileMiddlewareChain(
  middleware: Middleware[],
  handler: Handler
): CompiledHandler {
  // 快速路徑：無中間件
  if (middleware.length === 0) {
    return handler as CompiledHandler
  }
  
  // 單一中間件特化
  if (middleware.length === 1) {
    const mw = middleware[0]!
    return async (ctx) => {
      let handlerCalled = false
      const result = await mw(ctx, async () => {
        handlerCalled = true
        return undefined
      })
      if (result instanceof Response) {
        return result
      }
      if (handlerCalled) {
        return await handler(ctx)
      }
      return ctx.json({ error: 'Middleware did not call next or return response' }, 500)
    }
  }
  
  // 多個中間件：從後往前編譯成鏈式調用
  let compiled: CompiledHandler = handler as CompiledHandler
  
  for (let i = middleware.length - 1; i >= 0; i--) {
    const mw = middleware[i]!
    const nextHandler = compiled
    compiled = async (ctx) => {
      let nextCalled = false
      const result = await mw(ctx, async () => {
        nextCalled = true
        return undefined
      })
      if (result instanceof Response) {
        return result
      }
      if (nextCalled) {
        return await nextHandler(ctx)
      }
      return ctx.json({ error: 'Middleware did not call next or return response' }, 500)
    }
  }
  
  return compiled
}
```

### 整合到 Gravito Engine

```typescript
// src/engine/Gravito.ts

interface RouteMetadata {
  handler: Handler
  middleware: Middleware[]
  compiled?: CompiledHandler  // 新增：預編譯版本
  useMinimal?: boolean
}

private compileRoutes(): void {
  this.staticRoutes = this.router.staticRoutes
  
  // ...existing code...
  
  // 預編譯所有路由的中間件鏈
  for (const [_key, route] of this.staticRoutes) {
    // 收集該路由的所有中間件（全局 + 路徑 + 路由級）
    const allMiddleware = this.collectMiddlewareForPath(
      _key.split(':')[1]!, // 提取 path
      route.middleware
    )
    
    // 預編譯
    route.compiled = compileMiddlewareChain(allMiddleware, route.handler)
    
    // ...existing analysis code...
  }
}

// 使用預編譯版本
private async handleWithMiddleware(
  request: Request,
  path: string,
  route: RouteMetadata
): Promise<Response> {
  const ctx = this.contextPool.acquire()

  try {
    ctx.reset(request, {})
    
    // 使用預編譯版本（如果存在）
    if (route.compiled) {
      return await route.compiled(ctx)
    }
    
    // 回退到原始實現
    const middleware = this.collectMiddlewareForPath(path, route.middleware)
    if (middleware.length === 0) {
      return await route.handler(ctx)
    }
    return await this.executeMiddleware(ctx, middleware, route.handler)
  } catch (error) {
    return await this.handleError(error as Error, ctx)
  } finally {
    this.contextPool.release(ctx)
  }
}
```

### 動態路由支援

對於動態路由，需要在首次匹配時進行編譯並快取：

```typescript
private compiledDynamicRoutes = new Map<string, CompiledHandler>()

private handleDynamicRoute(
  request: Request,
  method: string,
  path: string
): Response | Promise<Response> {
  const match = this.router.match(method.toUpperCase(), path)

  if (!match.handler) {
    return this.handleNotFoundSync(request, path)
  }

  // 檢查是否有預編譯版本
  const cacheKey = `${method}:${match.routePattern ?? path}`
  let compiled = this.compiledDynamicRoutes.get(cacheKey)
  
  if (!compiled) {
    compiled = compileMiddlewareChain(match.middleware, match.handler)
    this.compiledDynamicRoutes.set(cacheKey, compiled)
  }

  const ctx = this.contextPool.acquire()
  
  const execute = async (): Promise<Response> => {
    try {
      ctx.reset(request, match.params)
      return await compiled!(ctx)
    } catch (error) {
      return await this.handleError(error as Error, ctx)
    } finally {
      this.contextPool.release(ctx)
    }
  }

  return execute()
}
```

### 預估影響

```
當前（每請求，3 個中間件）:
  - 創建 next 閉包        ~50ns
  - 索引檢查 x3           ~15ns
  - 閉包調用開銷          ~30ns
  - 總計: ~95ns
  
優化後:
  - 預編譯函數直接調用    ~10ns
  - 省去索引操作          ~0ns
  - 總計: ~10ns
```

**預估效能提升**: 10-15%（對於有多個中間件的路由）

### 注意事項

1. **編譯時機**: 在 `compileRoutes()` 中進行，而非 `add()` 時
2. **動態中間件**: 如果中間件在運行時動態變更，需要重新編譯
3. **錯誤處理**: 預編譯版本需要正確傳遞錯誤到 error handler

---

## Phase 2: MinimalContext Query 快取

> **適用範圍**: Gravito Engine (MinimalContext)
> **優先級**: P2（計劃遺漏但影響顯著）

### 問題分析

**文件**: `packages/core/src/engine/MinimalContext.ts:47-67`

**現狀**: 每次調用 `query()` 都創建新的 `URL` 物件

```typescript
class MinimalRequest implements FastRequest {
  query(name: string): string | undefined {
    // ❌ 每次調用都創建 new URL()
    const url = new URL(this._request.url)
    return url.searchParams.get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    // ❌ 同樣的問題
    const url = new URL(this._request.url)
    const result: Record<string, string | string[]> = {}
    // ...
  }
}
```

**問題**:
1. `new URL()` 是相對昂貴的操作
2. 同一請求多次調用 `query()` 會重複創建
3. `MinimalContext` 是為「超輕量」設計的，但這個問題違反了設計意圖

### 優化方案: 延遲初始化 + 快取

```typescript
class MinimalRequest implements FastRequest {
  private _searchParams: URLSearchParams | null = null
  
  constructor(
    private readonly _request: Request,
    private readonly _params: Record<string, string>,
    private readonly _path: string
  ) {}
  
  /**
   * 延遲初始化 searchParams，只在首次訪問時解析
   */
  private getSearchParams(): URLSearchParams {
    if (this._searchParams === null) {
      // 方案 A: 使用 URL（完整解析）
      // this._searchParams = new URL(this._request.url).searchParams
      
      // 方案 B: 直接解析 query string（更快）
      const url = this._request.url
      const queryStart = url.indexOf('?')
      if (queryStart === -1) {
        this._searchParams = new URLSearchParams()
      } else {
        const hashStart = url.indexOf('#', queryStart)
        const queryString = hashStart === -1 
          ? url.slice(queryStart + 1)
          : url.slice(queryStart + 1, hashStart)
        this._searchParams = new URLSearchParams(queryString)
      }
    }
    return this._searchParams
  }

  query(name: string): string | undefined {
    return this.getSearchParams().get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    const params = this.getSearchParams()
    const result: Record<string, string | string[]> = {}
    
    for (const [key, value] of params.entries()) {
      const existing = result[key]
      if (existing === undefined) {
        result[key] = value
      } else if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        result[key] = [existing, value]
      }
    }
    return result
  }
}
```

### FastContext 同步優化

檢查 `FastContext` 是否有類似問題：

```typescript
// src/engine/FastContext.ts - FastRequestImpl

class FastRequestImpl implements FastRequest {
  private _url: URL = new URL('http://localhost') // ✅ 已重用
  private _query: URLSearchParams | null = null   // ✅ 已延遲初始化
  
  // 現有實現已經正確，無需修改
}
```

**結論**: `FastContext` 已正確實現延遲初始化，只需修復 `MinimalContext`。

### 預估影響

```
當前（每次 query() 調用）:
  - new URL()             ~200ns
  - searchParams.get()    ~20ns
  - 總計: ~220ns/次
  
優化後（首次調用）:
  - 直接解析 query string ~50ns
  - 快取 searchParams     ~10ns
  - 總計: ~60ns（首次）
  
優化後（後續調用）:
  - 讀取快取              ~5ns
  - searchParams.get()    ~20ns
  - 總計: ~25ns
```

**預估效能提升**: 5-8%（對於頻繁存取查詢參數的路由）

---

## Phase 3: PhotonAdapter Proxy 消除

> **適用範圍**: 僅 PhotonAdapter 路徑
> **優先級**: P3（高影響但複雜度高，需要 API 相容方案）

### 重要說明

⚠️ **此優化僅影響使用 `PhotonAdapter` 的應用**。如果應用直接使用 `Gravito` 引擎，則不受此影響，因為 `Gravito` 已使用無 Proxy 的 `FastContext`/`MinimalContext`。

### 問題分析

**文件**: `packages/core/src/adapters/PhotonAdapter.ts`

**現狀**: 每次請求創建 2 個 Proxy 物件

```typescript
// PhotonRequestWrapper.create() - 第 46-79 行
static create(photonCtx: Context): PhotonRequestWrapper {
  const instance = new PhotonRequestWrapper(photonCtx)
  return new Proxy(instance, {  // ❌ 每次請求創建 Proxy
    get(target, prop, receiver) {
      // 複雜的屬性查找邏輯
    },
    set(target, prop, value) {
      // ...
    },
  })
}

// PhotonContextWrapper.create() - 第 177-199 行
static create<V>(photonCtx: Context): GravitoContext<V> {
  const instance = new PhotonContextWrapper<V>(photonCtx)
  return new Proxy(instance, {  // ❌ 每次請求創建 Proxy
    get(target, prop, receiver) {
      // ...
    },
  })
}
```

**問題**:
1. `Proxy` 是 JavaScript 中最慢的元操作之一
2. 每次請求都要創建 2 個 Proxy + 2 個 Wrapper 實例
3. Proxy 的 trap 函數無法被 JIT 內聯優化

### 為什麼需要 Proxy？

Proxy 的存在是為了支援**解構賦值訪問 context 變數**：

```typescript
// 這種用法需要 Proxy 的動態屬性查找
app.get('/users', async ({ userService, db }: GravitoContext) => {
  const users = await userService.findAll()
  return db.json(users)
})
```

如果消除 Proxy，需要提供替代方案。

### 優化方案 A: 直接映射 + 顯式存取

放棄解構賦值，改用顯式方法存取：

```typescript
/**
 * 優化版 PhotonContextWrapper
 * 
 * 設計原則：
 * 1. 不使用 Proxy - 所有屬性直接定義
 * 2. 延遲初始化 - 只在訪問時創建
 * 3. 重用實例 - 配合 Object Pool
 */
class OptimizedContextWrapper<V extends GravitoVariables = GravitoVariables>
  implements GravitoContext<V>
{
  private photonCtx!: Context
  private _req!: OptimizedRequestWrapper
  
  constructor() {
    this._req = new OptimizedRequestWrapper()
  }
  
  reset(photonCtx: Context): this {
    this.photonCtx = photonCtx
    this._req.reset(photonCtx)
    return this
  }
  
  // 直接實現所有方法，無 Proxy 開銷
  get req(): GravitoRequest {
    return this._req
  }
  
  json<T>(data: T, status?: number): Response {
    return status !== undefined 
      ? this.photonCtx.json(data as object, status as 200)
      : this.photonCtx.json(data as object)
  }
  
  // 顯式存取 context 變數
  get<K extends keyof V>(key: K): V[K] {
    return this.photonCtx.get(key as string) as V[K]
  }
  
  set<K extends keyof V>(key: K, value: V[K]): void {
    this.photonCtx.set(key as string, value)
  }
  
  // ...其他方法直接委託
}
```

**API 變更影響**:

```typescript
// 之前（需要 Proxy）
app.get('/users', async ({ userService }: Context) => {
  // ...
})

// 之後（顯式存取）
app.get('/users', async (c) => {
  const userService = c.get('userService')
  // ...
})
```

### 優化方案 B: 編譯時注入（進階）

透過 TypeScript transformer 在編譯時將解構轉換為顯式存取：

```typescript
// 原始碼
app.get('/users', async ({ userService }: Context) => {
  return userService.findAll()
})

// 編譯後
app.get('/users', async (__ctx__) => {
  const userService = __ctx__.get('userService')
  return userService.findAll()
})
```

**優點**: 保持 API 相容性
**缺點**: 需要額外的編譯步驟，增加複雜度

### 優化方案 C: Context Pool（推薦）

保留 Proxy，但加入 Object Pool 減少創建開銷：

```typescript
class PhotonAdapterContextPool {
  private pool: PhotonContextWrapper[] = []
  private maxSize = 256
  
  acquire<V>(photonCtx: Context): GravitoContext<V> {
    const wrapper = this.pool.pop()
    if (wrapper) {
      // 重用現有實例
      wrapper.reset(photonCtx)
      return wrapper as GravitoContext<V>
    }
    // 創建新實例（仍使用 Proxy，但減少創建頻率）
    return PhotonContextWrapper.create<V>(photonCtx)
  }
  
  release(wrapper: PhotonContextWrapper): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(wrapper)
    }
  }
}

// 全局單例
const contextPool = new PhotonAdapterContextPool()

function toPhotonHandler<V extends GravitoVariables>(handler: GravitoHandler<V>): Handler {
  return async (c: Context): Promise<Response> => {
    const ctx = contextPool.acquire<V>(c)
    try {
      return await handler(ctx)
    } finally {
      contextPool.release(ctx as PhotonContextWrapper)
    }
  }
}
```

### 推薦策略

| 方案 | 效能提升 | API 相容性 | 複雜度 | 推薦度 |
|-----|---------|-----------|-------|-------|
| A: 直接映射 | 最高 | ❌ 破壞性 | 中 | ⭐⭐ |
| B: 編譯注入 | 最高 | ✅ 保持 | 高 | ⭐ |
| C: Pool | 中等 | ✅ 保持 | 低 | ⭐⭐⭐ |

**建議**: 先實施方案 C（Pool），在不破壞 API 的前提下獲得部分效能提升。未來版本可考慮方案 A 作為「嚴格模式」選項。

### 實施步驟（方案 C）

1. 修改 `PhotonContextWrapper`，添加 `reset()` 方法支援重用
2. 創建 `PhotonAdapterContextPool` 類別
3. 修改 `toPhotonMiddleware` 和 `toPhotonHandler` 使用 pool
4. 添加 `finally` 區塊確保 context 被釋放
5. 基準測試驗證效能提升

### 預估影響

```
當前（每請求）:
  - 2x new Proxy()           ~500ns
  - 2x new Wrapper()         ~100ns  
  - Proxy trap 調用          ~200ns/次
  - 總計: ~1-2µs 額外開銷

方案 C 優化後（每請求）:
  - pool.acquire()           ~30ns
  - pool.release()           ~20ns
  - Proxy trap 調用          ~200ns/次（仍存在）
  - 總計: ~300-500ns

方案 A 優化後（每請求）:
  - pool.acquire()           ~20ns
  - pool.release()           ~10ns
  - 直接方法調用             ~5ns/次
  - 總計: ~50-100ns
```

**預估效能提升**: 
- 方案 C: 5-10%
- 方案 A: 15-25%

---

## Phase 4: AOTRouter 中間件快取

> **適用範圍**: Gravito Engine
> **優先級**: P4

### 問題分析

**文件**: `packages/core/src/engine/AOTRouter.ts:166-203`

**現狀**: 每次請求都遍歷 `pathMiddleware` Map

```typescript
private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
  // 快速路徑已存在 ✅
  if (
    this.globalMiddleware.length === 0 &&
    this.pathMiddleware.size === 0 &&
    routeMiddleware.length === 0
  ) {
    return []
  }

  const middleware: Middleware[] = []

  // 1. Global middleware
  if (this.globalMiddleware.length > 0) {
    middleware.push(...this.globalMiddleware)
  }

  // 2. Pattern-based middleware - ❌ 每次請求迭代
  if (this.pathMiddleware.size > 0) {
    for (const [pattern, mw] of this.pathMiddleware) {
      if (pattern.includes(':')) {
        continue
      }
      if (this.matchPattern(pattern, path)) {
        middleware.push(...mw)
      }
    }
  }

  // 3. Route-specific middleware
  if (routeMiddleware.length > 0) {
    middleware.push(...routeMiddleware)
  }

  return middleware
}
```

**現有優化**: 已有快速路徑（無中間件時直接返回空陣列）

**剩餘問題**: 當有路徑中間件時，每次請求都需要迭代匹配

### 優化方案: 中間件匹配快取

```typescript
class AOTRouter {
  // 新增：路徑 -> 匹配的中間件快取
  private middlewareCache = new Map<string, Middleware[]>()
  private cacheMaxSize = 1000
  
  /**
   * 收集中間件（帶快取）
   */
  private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
    // 快速路徑：無任何中間件
    if (
      this.globalMiddleware.length === 0 &&
      this.pathMiddleware.size === 0 &&
      routeMiddleware.length === 0
    ) {
      return []
    }
    
    // 快取 key: 結合 path 和 routeMiddleware 的身份
    // 使用 routeMiddleware.length 作為簡化的身份標識
    const cacheKey = `${path}:${routeMiddleware.length}`
    
    const cached = this.middlewareCache.get(cacheKey)
    if (cached !== undefined) {
      return cached  // ✅ O(1) 快取命中
    }
    
    // 首次計算
    const result = this.collectMiddlewareUncached(path, routeMiddleware)
    
    // 快取（帶大小限制）
    if (this.middlewareCache.size < this.cacheMaxSize) {
      this.middlewareCache.set(cacheKey, result)
    }
    
    return result
  }
  
  /**
   * 原始的中間件收集邏輯
   */
  private collectMiddlewareUncached(path: string, routeMiddleware: Middleware[]): Middleware[] {
    const middleware: Middleware[] = []

    if (this.globalMiddleware.length > 0) {
      middleware.push(...this.globalMiddleware)
    }

    if (this.pathMiddleware.size > 0) {
      for (const [pattern, mw] of this.pathMiddleware) {
        if (pattern.includes(':')) {
          continue
        }
        if (this.matchPattern(pattern, path)) {
          middleware.push(...mw)
        }
      }
    }

    if (routeMiddleware.length > 0) {
      middleware.push(...routeMiddleware)
    }

    return middleware
  }
  
  /**
   * 新增路由或中間件時清除快取
   */
  private invalidateCache(): void {
    this.middlewareCache.clear()
  }
  
  // 修改 add() 和 usePattern() 以在變更時清除快取
  add(method: HttpMethod, path: string, handler: Handler, middleware: Middleware[] = []): void {
    // ...existing code...
    this.invalidateCache()
  }
  
  usePattern(pattern: string, ...middleware: Middleware[]): void {
    // ...existing code...
    this.invalidateCache()
  }
}
```

### Trie 結構優化（進階，可選）

> **注意**: 對於大多數應用（< 50 個路徑中間件規則），簡單快取已足夠。Trie 結構是**過度工程**，僅在有大量路徑中間件規則時才考慮。

```typescript
// 僅供參考，不建議在初期實施
interface TrieNode {
  children: Map<string, TrieNode>
  middleware: Middleware[]
}

class PathMiddlewareTrie {
  private root: TrieNode = { children: new Map(), middleware: [] }
  
  add(pattern: string, middleware: Middleware[]): void {
    const parts = pattern.split('/').filter(Boolean)
    let node = this.root
    
    for (const part of parts) {
      if (!node.children.has(part)) {
        node.children.set(part, { children: new Map(), middleware: [] })
      }
      node = node.children.get(part)!
    }
    
    node.middleware.push(...middleware)
  }
  
  match(path: string): Middleware[] {
    const parts = path.split('/').filter(Boolean)
    const result: Middleware[] = []
    
    let node = this.root
    for (const part of parts) {
      if (node.children.has('*')) {
        result.push(...node.children.get('*')!.middleware)
      }
      
      if (node.children.has(part)) {
        node = node.children.get(part)!
        result.push(...node.middleware)
      } else {
        break
      }
    }
    
    return result
  }
}
```

### 預估影響

```
當前（每請求，10 個路徑中間件規則）:
  - Map 迭代 x10           ~100ns
  - matchPattern() x10     ~200ns
  - 總計: ~300ns
  
優化後（快取命中）:
  - Map.get()              ~10ns
  - 總計: ~10ns
```

**預估效能提升**: 5-10%（對於有多個路徑中間件的應用）

---

## Phase 5: FastContext Headers 池化

> **適用範圍**: Gravito Engine
> **優先級**: P5（需要基準測試驗證）

### 問題分析

**文件**: `packages/core/src/engine/FastContext.ts:131-137`

```typescript
reset(request: Request, params: Record<string, string> = {}): this {
  this._req.reset(request, params)
  // Optimization: Creating new Headers is faster than iterating to delete
  this._headers = new Headers()  // ← 原註解聲稱 new Headers() 更快
  return this
}
```

### 重要警告

⚠️ **源碼註解與優化方案矛盾**

現有註解說「Creating new Headers is faster than iterating to delete」。這可能是基於特定基準測試的結論。

**在實施此優化之前，必須先進行基準測試驗證**。

### 基準測試設計

```typescript
import { bench, group, run } from 'mitata'

group('Headers Reset Strategy', () => {
  // 策略 1: 每次創建新 Headers
  bench('new Headers()', () => {
    const h = new Headers()
    h.set('Content-Type', 'application/json')
    h.set('X-Request-ID', '123')
  })
  
  // 策略 2: 重用並追蹤刪除（1 個 header）
  const h1 = new Headers()
  const keys1: string[] = []
  bench('reuse + tracked delete (1 key)', () => {
    h1.set('Content-Type', 'application/json')
    keys1.push('Content-Type')
    for (const k of keys1) h1.delete(k)
    keys1.length = 0
  })
  
  // 策略 3: 重用並追蹤刪除（3 個 headers）
  const h3 = new Headers()
  const keys3: string[] = []
  bench('reuse + tracked delete (3 keys)', () => {
    h3.set('Content-Type', 'application/json')
    h3.set('X-Request-ID', '123')
    h3.set('Cache-Control', 'no-cache')
    keys3.push('Content-Type', 'X-Request-ID', 'Cache-Control')
    for (const k of keys3) h3.delete(k)
    keys3.length = 0
  })
  
  // 策略 4: 使用普通物件替代 Headers
  bench('plain object', () => {
    const h: Record<string, string> = {}
    h['Content-Type'] = 'application/json'
    h['X-Request-ID'] = '123'
  })
})

await run()
```

### 條件實施方案

**只有在基準測試證明「追蹤刪除」比「new Headers()」更快時，才實施以下方案**：

```typescript
class FastContext implements IFastContext {
  private _headers = new Headers()
  private _headerKeys: string[] = []
  
  reset(request: Request, params: Record<string, string> = {}): this {
    this._req.reset(request, params)
    
    // 只刪除實際設置過的 headers
    for (const key of this._headerKeys) {
      this._headers.delete(key)
    }
    this._headerKeys.length = 0
    
    return this
  }
  
  header(name: string, value: string): void {
    this._headers.set(name, value)
    this._headerKeys.push(name)
  }
}
```

### 替代方案: 使用普通物件

如果基準測試顯示普通物件更快，考慮：

```typescript
class FastContext implements IFastContext {
  private _headerObj: Record<string, string> = {}
  
  reset(request: Request, params: Record<string, string> = {}): this {
    this._req.reset(request, params)
    // 重置為空物件
    this._headerObj = {}
    return this
  }
  
  header(name: string, value: string): void {
    this._headerObj[name] = value
  }
  
  json<T>(data: T, status = 200): Response {
    this._headerObj['Content-Type'] = 'application/json; charset=utf-8'
    return new Response(JSON.stringify(data), {
      status,
      headers: this._headerObj,
    })
  }
}
```

### 預估影響

**待基準測試驗證**

如果優化有效: 3-5%
如果現有實現已最優: 0%

---

## Phase 6: Container Symbol Key

> **適用範圍**: 全局
> **優先級**: P6（低影響，可選）

### 問題分析

**文件**: `packages/core/src/Container.ts`

```typescript
// 當前：使用字符串 key
private bindings = new Map<string, Binding>()
private instances = new Map<string, unknown>()

make<T>(key: string): T {
  if (this.instances.has(key)) {  // 字符串比較
    return this.instances.get(key) as T
  }
  // ...
}
```

### 優化方案: Symbol Key

```typescript
// 服務定義時創建 Symbol（應用啟動時一次性操作）
export const SERVICE_KEYS = {
  UserService: Symbol('UserService'),
  CacheService: Symbol('CacheService'),
  DatabaseService: Symbol('DatabaseService'),
} as const

export type ServiceKey = (typeof SERVICE_KEYS)[keyof typeof SERVICE_KEYS]

// Container 實現
class Container {
  private bindings = new Map<symbol | string, Binding>()
  private instances = new Map<symbol | string, unknown>()
  
  // 支援 Symbol 和 string（向後相容）
  bind<T>(key: symbol | string, factory: Factory<T>): void {
    this.bindings.set(key, { factory: factory as Factory<unknown>, shared: false })
  }
  
  singleton<T>(key: symbol | string, factory: Factory<T>): void {
    this.bindings.set(key, { factory: factory as Factory<unknown>, shared: true })
  }
  
  make<T>(key: symbol | string): T {
    // Symbol 比較比字符串稍快
    if (this.instances.has(key)) {
      return this.instances.get(key) as T
    }
    // ...
  }
}

// 使用方式
container.singleton(SERVICE_KEYS.UserService, (c) => new UserService(c))
const userService = container.make<UserService>(SERVICE_KEYS.UserService)
```

### 預估影響

```
當前:
  - Map.has(string)    ~15ns
  - Map.get(string)    ~15ns
  
優化後:
  - Map.has(symbol)    ~10ns
  - Map.get(symbol)    ~10ns
```

**預估效能提升**: 2-3%（主要影響 DI 密集的應用）

### 實施建議

由於影響較小，建議：
1. 在 Container API 中支援 Symbol（向後相容）
2. 在文件中推薦使用 Symbol 作為最佳實踐
3. 不強制遷移現有代碼

---

## Phase 7: 其他微優化

### 7.1 路徑提取優化 ✅ 已實現

**文件**: `packages/core/src/engine/path.ts`

**狀態**: 已經使用無 URL 物件的優化實現

```typescript
// 現有實現已最優化
export function extractPath(url: string): string {
  const protocolEnd = url.indexOf('://')
  const searchStart = protocolEnd === -1 ? 0 : protocolEnd + 3
  const pathStart = url.indexOf('/', searchStart)
  if (pathStart === -1) return '/'
  const queryStart = url.indexOf('?', pathStart)
  return queryStart === -1 ? url.slice(pathStart) : url.slice(pathStart, queryStart)
}
```

**無需額外優化**。

### 7.2 JSON 序列化快取（靜態響應）

對於健康檢查等靜態響應，可以預序列化：

```typescript
// 預序列化靜態響應
const healthResponse = JSON.stringify({ status: 'ok' })
const healthHeaders = { 'Content-Type': 'application/json' }

app.get('/health', (c) => {
  return new Response(healthResponse, { headers: healthHeaders })
})

// 更進階：預編碼為 Uint8Array
const healthBuffer = new TextEncoder().encode(healthResponse)

app.get('/health', (c) => {
  return new Response(healthBuffer, { headers: healthHeaders })
})
```

**適用場景**: 健康檢查、版本資訊等不變的響應

### 7.3 ThrottleRequests 優化

```typescript
// 當前：每次請求都計算 key
const key = `throttle:${ip}:${c.req.path}`

// 優化：使用 WeakMap 快取（自動 GC）
const keyCache = new WeakMap<Request, string>()

function getThrottleKey(c: GravitoContext): string {
  const raw = c.req.raw
  let key = keyCache.get(raw)
  if (!key) {
    const ip = resolveIp(c)
    key = `throttle:${ip}:${c.req.path}`
    keyCache.set(raw, key)
  }
  return key
}
```

### 7.4 Request Body 快取（FastContext）

`PhotonAdapter` 已有 `_cachedJsonBody` 快取，但 `FastContext` 沒有：

```typescript
// src/engine/FastContext.ts

class FastRequestImpl implements FastRequest {
  private _cachedJson: unknown = undefined
  private _jsonParsed = false
  
  async json<T = unknown>(): Promise<T> {
    if (!this._jsonParsed) {
      this._cachedJson = await this._request.json()
      this._jsonParsed = true
    }
    return this._cachedJson as T
  }
  
  // reset() 時清除快取
  reset(request: Request, params: Record<string, string> = {}): void {
    this._request = request
    this._params = params
    // ...
    this._cachedJson = undefined
    this._jsonParsed = false
  }
}
```

---

## 驗證計劃

### 基準測試套件

詳見 **Phase 0** 的基準測試設計。

### HTTP 負載測試

```bash
# 使用 oha 或 wrk
oha -n 100000 -c 100 http://localhost:3000/api/health

# 對比指標：
# - Requests/sec
# - Latency p50, p99
# - Memory usage
```

### 成功標準

| 指標 | 當前基準 | 目標 | 驗證方法 |
|-----|---------|-----|---------|
| 空路由 RPS | ~150k | ~200k+ | oha benchmark |
| 3 中間件路由 RPS | ~80k | ~110k+ | oha benchmark |
| Context 創建時間 (pooled) | ~2µs | ~100ns | mitata bench |
| Context 創建時間 (Proxy) | 待測量 | 降低 50%+ | mitata bench |
| 記憶體/請求 | ~8KB | ~4KB | heaptrack |
| p99 延遲 | ~1ms | ~0.5ms | oha benchmark |

---

## 實施優先級（修訂版）

### Phase 0: 基線建立（必須先完成）

- 實現基準測試套件
- 記錄當前效能數據
- 依據數據調整後續優先級

### 第一階段（高影響，P1-P2）

1. **Phase 1**: 中間件鏈預編譯
   - 實現 `compileMiddlewareChain()`
   - 整合到 `Gravito.compileRoutes()`
   - 基準測試驗證

2. **Phase 2**: MinimalContext Query 快取
   - 修復 `MinimalContext.query()` 的重複解析問題
   - 基準測試驗證

### 第二階段（中影響，P3-P4）

3. **Phase 3**: PhotonAdapter 優化（方案 C: Pool）
   - 創建 `PhotonAdapterContextPool`
   - 修改 handler 轉換函數
   - 基準測試驗證

4. **Phase 4**: AOTRouter 中間件快取
   - 實現簡單快取機制
   - 基準測試驗證

### 第三階段（低影響/待驗證，P5-P6）

5. **Phase 5**: Headers 優化（條件實施）
   - 先基準測試驗證假設
   - 依據結果決定是否實施

6. **Phase 6**: Container Symbol Key（可選）
   - 添加 Symbol 支援
   - 更新文件推薦

---

## 風險評估（修訂版）

### 高風險

1. **PhotonAdapter Proxy 消除（方案 A）可能破壞現有功能**
   - 某些代碼依賴解構賦值 `({ userService }: Context)`
   - **緩解**: 先實施方案 C（Pool），保持 API 相容
   - **緩解**: 如實施方案 A，提供遷移指南

2. **中間件預編譯可能改變執行語義**
   - 錯誤處理行為可能不同
   - **緩解**: 詳細的單元測試覆蓋
   - **緩解**: 保留原始實現作為回退

### 中風險

3. **快取可能導致記憶體洩漏**
   - **緩解**: 設置快取大小限制
   - **緩解**: 在 `invalidateCache()` 中主動清除

4. **基準測試結果可能與預期不符**
   - Phase 5 的假設可能錯誤
   - **緩解**: 先測試再實施，避免無效工作

### 低風險

5. **微優化可能被 JIT 抵消**
   - 現代 JS 引擎可能已經優化了這些操作
   - **緩解**: 基準測試驗證實際收益

6. **Symbol Key 需要 API 變更**
   - **緩解**: 向後相容設計，支援 string 和 symbol

---

## 向後相容性指南

### PhotonAdapter API 變更（如實施方案 A）

```typescript
// 舊 API（使用 Proxy，支援解構）
app.get('/users', async ({ userService, db }: GravitoContext) => {
  const users = await userService.findAll()
  return db.json(users)
})

// 新 API（無 Proxy，顯式存取）
app.get('/users', async (c) => {
  const userService = c.get('userService')
  const users = await userService.findAll()
  return c.json(users)
})

// 或使用輔助函數
app.get('/users', async (c) => {
  const { userService } = c.services(['userService'])
  const users = await userService.findAll()
  return c.json(users)
})
```

### Container Symbol Key

```typescript
// 舊 API（仍支援）
container.singleton('UserService', factory)
const service = container.make<UserService>('UserService')

// 新 API（推薦）
container.singleton(SERVICE_KEYS.UserService, factory)
const service = container.make<UserService>(SERVICE_KEYS.UserService)
```

---

## 結論

本計劃聚焦於 `@gravito/core` 中**真正影響效能**的代碼路徑：

1. **每請求的物件創建**（閉包、Proxy、Headers）
2. **路由匹配和中間件收集**的迭代開銷
3. **中間件執行**的運行時開銷

### 關鍵修正

與原計劃相比，本修訂版：

1. ✅ 區分了 Gravito Engine 和 PhotonAdapter 兩條執行路徑
2. ✅ 將「基準測試基線建立」列為最高優先級
3. ✅ 新增「MinimalContext Query 快取」優化項目
4. ✅ 標註「路徑提取優化」已實現，無需重複工作
5. ✅ 標註「Headers 池化」需要先基準測試驗證
6. ✅ 補充了向後相容性指南
7. ✅ 調整了風險評估，增加 API 相容性風險

### 實施原則

1. **數據驅動**: 先建立基線，再進行優化
2. **漸進式**: 每個 Phase 完成後進行驗證
3. **向後相容**: 優先選擇不破壞 API 的方案
4. **避免過早優化**: 基準測試證明有收益再實施
