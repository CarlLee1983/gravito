# @gravito/core 效能優化計劃

> **版本**: 1.0.0
> **日期**: 2026-01-17
> **目標**: 提升框架整體吞吐量 30-50%

---

## 執行摘要

本計劃針對 `@gravito/core` 的**實際效能瓶頸**進行分析和優化。與 `@gravito/photon`（純別名層）不同，core 包含真正的業務邏輯和效能敏感代碼。

### 效能影響分級

| 優化項目 | 預估提升 | 複雜度 | 風險 |
|---------|---------|-------|-----|
| PhotonAdapter Proxy 消除 | 15-25% | 高 | 中 |
| 中間件鏈預編譯 | 10-15% | 中 | 低 |
| AOTRouter 中間件快取 | 5-10% | 低 | 低 |
| FastContext Headers 池化 | 3-5% | 低 | 低 |
| Container Symbol Key | 2-3% | 低 | 低 |

**總計預估**: 35-58% 效能提升

---

## Phase 1: PhotonAdapter Proxy 消除（最高優先級）

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

### 優化方案 A: 直接映射（推薦）

將所有屬性直接映射到原生 Photon Context，消除 Proxy：

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
  
  // 預定義所有可能的 context 變數為 getter
  // 這避免了 Proxy 的動態屬性查找
  
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
  
  // 對於 context.get('variable') 的訪問
  // 直接委託到 photonCtx.get()
  get<K extends keyof V>(key: K): V[K] {
    return this.photonCtx.get(key as string) as V[K]
  }
  
  // 對於解構訪問 ({ userService }: Context)
  // 使用 Object.defineProperty 在 reset() 時動態添加
}
```

### 優化方案 B: Context Pool + 重用

結合 Object Pooling 和直接映射：

```typescript
class ContextPool {
  private pool: OptimizedContextWrapper[] = []
  private maxSize = 256
  
  acquire(photonCtx: Context): OptimizedContextWrapper {
    const ctx = this.pool.pop() ?? new OptimizedContextWrapper()
    return ctx.reset(photonCtx)
  }
  
  release(ctx: OptimizedContextWrapper): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(ctx)
    }
  }
}
```

### 實施步驟

1. 創建 `OptimizedContextWrapper` 類別
2. 創建 `OptimizedRequestWrapper` 類別
3. 創建 `ContextPool` 單例
4. 修改 `toPhotonMiddleware` 和 `toPhotonHandler` 使用 pool
5. 添加 `finally` 區塊確保 context 被釋放
6. 基準測試驗證效能提升

### 預估影響

```
當前（每請求）:
  - 2x new Proxy()           ~500ns
  - 2x new Wrapper()         ~100ns  
  - Proxy trap 調用          ~200ns/次
  - 總計: ~1-2µs 額外開銷

優化後（每請求）:
  - pool.acquire()           ~20ns
  - pool.release()           ~10ns
  - 直接方法調用             ~5ns/次
  - 總計: ~50-100ns
```

**預估效能提升**: 15-25%（取決於請求複雜度）

---

## Phase 2: 中間件鏈預編譯

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

### 優化方案: 預編譯中間件鏈

在路由註冊時預編譯中間件執行器：

```typescript
/**
 * 預編譯的中間件執行器
 * 
 * 核心思想：將中間件陣列轉換為鏈式函數，
 * 避免運行時的閉包創建和索引操作。
 */
function compileMiddlewareChain(
  middleware: Middleware[],
  handler: Handler
): CompiledHandler {
  if (middleware.length === 0) {
    return handler
  }
  
  if (middleware.length === 1) {
    const mw = middleware[0]!
    return async (ctx) => {
      let handlerCalled = false
      const result = await mw(ctx, async () => {
        handlerCalled = true
        return undefined
      })
      return result ?? (handlerCalled ? await handler(ctx) : ctx.json({ error: 'No response' }, 500))
    }
  }
  
  // 多個中間件：從後往前編譯
  let compiled: Handler = handler
  
  for (let i = middleware.length - 1; i >= 0; i--) {
    const mw = middleware[i]!
    const next = compiled
    compiled = async (ctx) => {
      let nextCalled = false
      const result = await mw(ctx, async () => {
        nextCalled = true
        return undefined
      })
      return result ?? (nextCalled ? await next(ctx) : ctx.json({ error: 'No response' }, 500))
    }
  }
  
  return compiled
}
```

### AOTRouter 整合

```typescript
// 在 AOTRouter.add() 時預編譯
add(method: HttpMethod, path: string, handler: Handler, middleware: Middleware[] = []): void {
  const compiled = compileMiddlewareChain(middleware, handler)
  
  if (this.isStaticPath(path)) {
    const key = `${normalizedMethod}:${path}`
    this.staticRoutes.set(key, { 
      handler,
      middleware,
      compiled  // ✅ 預編譯版本
    })
  }
  // ...
}
```

### 預估影響

```
當前（每請求，3 個中間件）:
  - 創建 next 閉包        ~50ns
  - 索引檢查 x3           ~15ns
  - 閉包調用開銷          ~30ns
  
優化後:
  - 直接函數調用          ~10ns
```

**預估效能提升**: 10-15%（對於有多個中間件的路由）

---

## Phase 3: AOTRouter 中間件快取

### 問題分析

**文件**: `packages/core/src/engine/AOTRouter.ts:166-203`

**現狀**: 每次請求都遍歷 `pathMiddleware` Map

```typescript
private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
  // ...
  
  // 2. Pattern-based middleware
  if (this.pathMiddleware.size > 0) {
    for (const [pattern, mw] of this.pathMiddleware) {  // ❌ 每次請求迭代
      if (pattern.includes(':')) {
        continue
      }
      if (this.matchPattern(pattern, path)) {
        middleware.push(...mw)
      }
    }
  }
  // ...
}
```

### 優化方案: 中間件匹配快取

```typescript
class AOTRouter {
  // 新增：路徑 -> 匹配的中間件快取
  private middlewareCache = new Map<string, Middleware[]>()
  
  private collectMiddleware(path: string, routeMiddleware: Middleware[]): Middleware[] {
    // 快取 key: 結合 path 和 routeMiddleware 長度
    const cacheKey = `${path}:${routeMiddleware.length}`
    
    const cached = this.middlewareCache.get(cacheKey)
    if (cached !== undefined) {
      return cached  // ✅ O(1) 快取命中
    }
    
    // 首次計算...
    const result = this.collectMiddlewareUncached(path, routeMiddleware)
    
    // 快取大小限制（LRU 或固定大小）
    if (this.middlewareCache.size < 1000) {
      this.middlewareCache.set(cacheKey, result)
    }
    
    return result
  }
}
```

### Trie 結構優化（進階）

對於大量路徑模式匹配，可以使用 Trie 結構：

```typescript
class PathMiddlewareTrie {
  private root: TrieNode = { children: new Map(), middleware: [] }
  
  add(pattern: string, middleware: Middleware[]): void {
    // 將 /api/* 拆分為 ['api', '*']
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
      // 檢查萬用字元
      if (node.children.has('*')) {
        result.push(...node.children.get('*')!.middleware)
      }
      
      // 檢查精確匹配
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

**預估效能提升**: 5-10%（對於有多個路徑中間件的應用）

---

## Phase 4: FastContext Headers 池化

### 問題分析

**文件**: `packages/core/src/engine/FastContext.ts:131-137`

```typescript
reset(request: Request, params: Record<string, string> = {}): this {
  this._req.reset(request, params)
  // Optimization: Creating new Headers is faster than iterating to delete
  this._headers = new Headers()  // ❌ 每次創建新 Headers
  return this
}
```

### 優化方案: Headers 重用

```typescript
class FastContext implements IFastContext {
  private _headers = new Headers()
  private _headerKeys: string[] = []  // 追蹤設置過的 key
  
  reset(request: Request, params: Record<string, string> = {}): this {
    this._req.reset(request, params)
    
    // 只刪除實際設置過的 headers（通常 < 5 個）
    for (const key of this._headerKeys) {
      this._headers.delete(key)
    }
    this._headerKeys.length = 0  // 清空追蹤陣列
    
    return this
  }
  
  header(name: string, value: string): void {
    this._headers.set(name, value)
    this._headerKeys.push(name)  // 追蹤 key
  }
}
```

### 基準測試數據

```javascript
// 基準測試：new Headers() vs delete
const iterations = 1_000_000

// 方案 1: 每次創建新 Headers
console.time('new Headers()')
for (let i = 0; i < iterations; i++) {
  const h = new Headers()
}
console.timeEnd('new Headers()')  // ~150ms

// 方案 2: 重用並刪除 (5 keys)
const h = new Headers()
console.time('reuse + delete')
for (let i = 0; i < iterations; i++) {
  h.set('Content-Type', 'application/json')
  h.set('X-Request-ID', '123')
  h.delete('Content-Type')
  h.delete('X-Request-ID')
}
console.timeEnd('reuse + delete')  // ~80ms
```

**預估效能提升**: 3-5%

---

## Phase 5: Container Symbol Key

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

### 優化方案: Symbol 或數字索引

```typescript
// 服務定義時
export const SERVICE_KEYS = {
  UserService: Symbol('UserService'),
  CacheService: Symbol('CacheService'),
  // ...
} as const

// Container 實現
class Container {
  private bindings = new Map<symbol, Binding>()
  private instances = new Map<symbol, unknown>()
  
  make<T>(key: symbol): T {
    // Symbol 比較比字符串快
    if (this.instances.has(key)) {
      return this.instances.get(key) as T
    }
    // ...
  }
}
```

**預估效能提升**: 2-3%（主要影響 DI 密集的應用）

---

## Phase 6: 其他微優化

### 6.1 路徑提取優化

**文件**: `packages/core/src/engine/path.ts`

```typescript
// 當前可能的實現
export function extractPath(url: string): string {
  return new URL(url).pathname  // ❌ 創建 URL 物件
}

// 優化版
export function extractPath(url: string): string {
  // 找到 scheme 結束位置
  const schemeEnd = url.indexOf('://')
  if (schemeEnd === -1) return url
  
  // 找到 path 開始位置（跳過 host）
  const pathStart = url.indexOf('/', schemeEnd + 3)
  if (pathStart === -1) return '/'
  
  // 找到 query/hash 開始位置
  const queryStart = url.indexOf('?', pathStart)
  const hashStart = url.indexOf('#', pathStart)
  
  const end = Math.min(
    queryStart === -1 ? url.length : queryStart,
    hashStart === -1 ? url.length : hashStart
  )
  
  return url.slice(pathStart, end)
}
```

### 6.2 JSON 序列化快取

對於靜態響應，可以預序列化：

```typescript
// 對於健康檢查等靜態響應
const healthResponse = JSON.stringify({ status: 'ok' })
const healthBuffer = new TextEncoder().encode(healthResponse)

app.get('/health', (c) => {
  return new Response(healthBuffer, {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

### 6.3 ThrottleRequests 優化

```typescript
// 當前：每次請求都計算 key
const key = `throttle:${ip}:${c.req.path}`

// 優化：使用 WeakMap 快取
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

---

## 驗證計劃

### 基準測試套件

```typescript
// benchmarks/core-performance.ts
import { bench, run } from 'mitata'
import { Gravito } from '../src/engine/Gravito'
import { PhotonAdapter } from '../src/adapters/PhotonAdapter'

// 1. Context 創建基準
bench('PhotonAdapter Context (current)', async () => {
  const adapter = new PhotonAdapter()
  // 模擬請求處理
})

bench('PhotonAdapter Context (optimized)', async () => {
  const adapter = new OptimizedPhotonAdapter()
  // 模擬請求處理
})

// 2. 中間件執行基準
bench('Middleware chain (current)', async () => {
  // 3 個中間件 + handler
})

bench('Middleware chain (precompiled)', async () => {
  // 預編譯版本
})

// 3. 路由匹配基準
bench('Static route match', async () => {
  router.match('GET', '/api/users')
})

bench('Dynamic route match', async () => {
  router.match('GET', '/api/users/123')
})

await run()
```

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
| Context 創建時間 | ~2µs | ~100ns | mitata bench |
| 記憶體/請求 | ~8KB | ~4KB | heaptrack |
| p99 延遲 | ~1ms | ~0.5ms | oha benchmark |

---

## 實施優先級

### 第一階段（高影響，1-2 週）

1. **Phase 1**: PhotonAdapter Proxy 消除
   - 創建 OptimizedContextWrapper
   - 實現 Context Pool
   - 基準測試驗證

### 第二階段（中影響，1 週）

2. **Phase 2**: 中間件鏈預編譯
   - 實現 compileMiddlewareChain
   - 整合到 AOTRouter

3. **Phase 3**: AOTRouter 中間件快取
   - 實現簡單快取
   - 評估 Trie 結構需求

### 第三階段（低影響，可選）

4. **Phase 4-6**: 微優化
   - Headers 池化
   - Container Symbol Key
   - 其他微優化

---

## 風險評估

### 高風險

1. **Proxy 消除可能破壞現有功能**
   - 某些代碼可能依賴 Proxy 的動態屬性訪問
   - 緩解：完整的回歸測試套件

2. **中間件預編譯可能改變執行語義**
   - 錯誤處理行為可能不同
   - 緩解：詳細的單元測試覆蓋

### 中風險

3. **快取可能導致記憶體洩漏**
   - 緩解：設置快取大小限制，使用 LRU

### 低風險

4. **微優化可能被 JIT 抵消**
   - 現代 JS 引擎可能已經優化了這些操作
   - 緩解：先基準測試，確認有實際收益再實施

---

## 結論

本計劃聚焦於 `@gravito/core` 中**真正影響效能**的代碼路徑：

1. **每請求的物件創建**（Proxy、閉包、Headers）
2. **路由匹配和中間件收集**的迭代開銷
3. **中間件執行**的運行時開銷

與 `@gravito/photon` 的優化計劃（主要是代碼質量）不同，這份計劃的每個項目都有**可測量的效能影響**。

建議採用漸進式實施，每個 Phase 完成後進行基準測試驗證，確保優化真正帶來收益。
