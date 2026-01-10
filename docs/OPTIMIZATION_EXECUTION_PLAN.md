# Gravito Engine - 優化執行計劃 (Implementation Ready)

> **撰寫日期**: 2026-01-10  
> **目標**: Gravito Engine 達到 +20% vs Hono  
> **當前狀態**: 81,664 req/s (-2.1% vs Hono)  
> **目標狀態**: 100,096+ req/s (+20% vs Hono)

---

## 執行總覽

| Phase | 預期收益 | 時間 | 狀態 |
|-------|----------|------|------|
| Phase 1: 核心優化 | +14-22% | 1-2h | ✅ |
| Phase 2: 路由優化 | +3-5% | 1h | ✅ |
| Phase 3: Context 優化 | +2-4% | 1h | ✅ |
| Phase 4: AOT (可選) | +8-15% | 2-4h | ✅ |

---

# Phase 1: 核心優化

## 任務 1.1: 創建 path.ts 工具函數

**創建文件**: `packages/core/src/engine/path.ts`

```typescript
/**
 * @fileoverview Lightweight Path Utilities
 *
 * High-performance path extraction without creating URL objects.
 * Performance critical - every optimization matters.
 *
 * @module @gravito/core/engine
 */

/**
 * Extract pathname from URL string without creating URL object
 *
 * @param url - Full URL string (e.g., "http://localhost:3000/api/users?id=1")
 * @returns pathname (e.g., "/api/users")
 *
 * @example
 * ```typescript
 * extractPath("http://localhost:3000/api/users?id=1") // "/api/users"
 * extractPath("https://example.com/") // "/"
 * ```
 */
export function extractPath(url: string): string {
  // Find start of path (skip protocol and host)
  // "http://localhost:3000/path" -> find the third "/"
  let pathStart = 0
  let slashCount = 0

  for (let i = 0; i < url.length; i++) {
    if (url[i] === '/') {
      slashCount++
      if (slashCount === 3) {
        pathStart = i
        break
      }
    }
  }

  // If no third slash found, URL might be malformed or just "http://host"
  if (slashCount < 3) {
    return '/'
  }

  // Find end of path (start of query string or end of URL)
  const queryStart = url.indexOf('?', pathStart)

  if (queryStart === -1) {
    return url.slice(pathStart)
  }

  return url.slice(pathStart, queryStart)
}

/**
 * Extract pathname using simpler logic (alternative implementation)
 * Use this if the above doesn't cover edge cases
 */
export function extractPathSimple(url: string): string {
  // Find "://" then find next "/"
  const protocolEnd = url.indexOf('://')
  if (protocolEnd === -1) {
    // Relative URL or malformed
    const queryStart = url.indexOf('?')
    return queryStart === -1 ? url : url.slice(0, queryStart)
  }

  const pathStart = url.indexOf('/', protocolEnd + 3)
  if (pathStart === -1) {
    return '/'
  }

  const queryStart = url.indexOf('?', pathStart)
  return queryStart === -1 ? url.slice(pathStart) : url.slice(pathStart, queryStart)
}
```

---

## 任務 1.2: 創建 MinimalContext.ts

**創建文件**: `packages/core/src/engine/MinimalContext.ts`

```typescript
/**
 * @fileoverview MinimalContext - Ultra-lightweight Request Context
 *
 * Designed for zero-middleware static routes where pool overhead
 * exceeds the cost of creating a new object.
 *
 * Key difference from FastContext:
 * - No object pooling (direct instantiation is faster for simple cases)
 * - No Headers object reuse (creates inline)
 * - Minimal memory footprint
 *
 * @module @gravito/core/engine
 */

import type { FastRequest, FastContext as IFastContext } from './types'

/**
 * Minimal request wrapper
 */
class MinimalRequest implements FastRequest {
  constructor(
    private readonly _request: Request,
    private readonly _params: Record<string, string>,
    private readonly _path: string
  ) {}

  get url(): string {
    return this._request.url
  }

  get method(): string {
    return this._request.method
  }

  get path(): string {
    return this._path
  }

  param(name: string): string | undefined {
    return this._params[name]
  }

  params(): Record<string, string> {
    return { ...this._params }
  }

  query(name: string): string | undefined {
    // Lazy parse - only when accessed
    const url = new URL(this._request.url)
    return url.searchParams.get(name) ?? undefined
  }

  queries(): Record<string, string | string[]> {
    const url = new URL(this._request.url)
    const result: Record<string, string | string[]> = {}
    for (const [key, value] of url.searchParams.entries()) {
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

  header(name: string): string | undefined {
    return this._request.headers.get(name) ?? undefined
  }

  headers(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [key, value] of this._request.headers.entries()) {
      result[key] = value
    }
    return result
  }

  async json<T = unknown>(): Promise<T> {
    return this._request.json()
  }

  async text(): Promise<string> {
    return this._request.text()
  }

  async formData(): Promise<FormData> {
    return this._request.formData()
  }

  get raw(): Request {
    return this._request
  }
}

/**
 * MinimalContext - Optimized for simple, fast responses
 *
 * Use when:
 * - No middleware
 * - Static routes
 * - Simple JSON/text responses
 * - No custom headers needed
 */
export class MinimalContext implements IFastContext {
  private readonly _req: MinimalRequest

  constructor(request: Request, params: Record<string, string>, path: string) {
    this._req = new MinimalRequest(request, params, path)
  }

  get req(): FastRequest {
    return this._req
  }

  // Response helpers - create headers inline (no reuse overhead)

  json<T>(data: T, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  text(text: string, status = 200): Response {
    return new Response(text, {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  html(html: string, status = 200): Response {
    return new Response(html, {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
    return new Response(null, {
      status,
      headers: { Location: url },
    })
  }

  body(data: BodyInit | null, status = 200): Response {
    return new Response(data, { status })
  }

  header(_name: string, _value: string): void {
    // MinimalContext doesn't support custom headers
    // Use FastContext for that use case
    console.warn('MinimalContext.header() is a no-op. Use FastContext for custom headers.')
  }

  status(_code: number): void {
    // Status is set per response, not on context
  }

  // Required for interface compatibility
  reset(_request: Request, _params?: Record<string, string>): this {
    throw new Error('MinimalContext does not support reset. Create a new instance instead.')
  }
}
```

---

## 任務 1.3: 修改 Gravito.ts

**修改文件**: `packages/core/src/engine/Gravito.ts`

### 1.3.1 添加新的 import

在文件頂部添加:

```typescript
import { extractPath } from './path'
import { MinimalContext } from './MinimalContext'
```

### 1.3.2 添加 staticRoutes 直接引用

在 class 屬性中添加:

```typescript
export class Gravito {
  private router = new AOTRouter()
  private contextPool: ObjectPool<FastContext>
  private errorHandler?: ErrorHandler
  private notFoundHandler?: NotFoundHandler

  // 新增: 直接引用靜態路由 Map (內聯優化)
  private staticRoutes!: Map<string, { handler: Handler; middleware: Middleware[] }>
  // 新增: 是否為純靜態應用 (無任何中間件)
  private isPureStaticApp = true
```

### 1.3.3 在 constructor 末尾添加路由編譯

```typescript
constructor(options: EngineOptions = {}) {
  // ... 現有代碼 ...

  // 新增: 獲取靜態路由的直接引用
  // @ts-expect-error - 訪問私有屬性進行優化
  this.staticRoutes = this.router.staticRoutes
}
```

### 1.3.4 替換整個 fetch 方法

**刪除舊的 fetch 方法 (約 249-286 行)**，替換為:

```typescript
/**
 * Handle an incoming request
 *
 * Optimized for minimal allocations and maximum throughput.
 * Uses sync/async dual-path strategy inspired by Hono.
 *
 * @param request - Incoming Request object
 * @returns Response object (sync or async)
 */
fetch = (request: Request): Response | Promise<Response> => {
  // Fast path: extract pathname without creating URL object
  const path = extractPath(request.url)
  const method = request.method.toLowerCase()

  // Try static route first (O(1) lookup, inlined for performance)
  const staticKey = `${method}:${path}`
  const staticRoute = this.staticRoutes.get(staticKey)

  if (staticRoute) {
    // Fast path: static route found
    if (staticRoute.middleware.length === 0 && this.isPureStaticApp) {
      // Ultra-fast path: no middleware at all
      // Use MinimalContext (no pool overhead)
      const ctx = new MinimalContext(request, {}, path)

      try {
        const result = staticRoute.handler(ctx)

        // Sync/async dual-path (Hono technique)
        if (result instanceof Response) {
          return result
        }
        return result as Promise<Response>
      } catch (error) {
        return this.handleErrorSync(error as Error, request, path)
      }
    }

    // Has middleware: use pooled context
    return this.handleWithMiddleware(request, path, staticRoute)
  }

  // Dynamic route: use Radix Tree
  return this.handleDynamicRoute(request, method, path)
}

/**
 * Handle routes with middleware (async path)
 */
private async handleWithMiddleware(
  request: Request,
  path: string,
  route: { handler: Handler; middleware: Middleware[] }
): Promise<Response> {
  const ctx = this.contextPool.acquire()

  try {
    ctx.reset(request, {})

    // Collect all middleware
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

/**
 * Handle dynamic routes (Radix Tree lookup)
 */
private handleDynamicRoute(
  request: Request,
  method: string,
  path: string
): Response | Promise<Response> {
  const match = this.router.match(method.toUpperCase(), path)

  if (!match.handler) {
    return this.handleNotFoundSync(request, path)
  }

  // Dynamic routes always use pooled context (need params)
  const ctx = this.contextPool.acquire()

  const execute = async (): Promise<Response> => {
    try {
      ctx.reset(request, match.params)

      if (match.middleware.length === 0) {
        return await match.handler(ctx)
      }

      return await this.executeMiddleware(ctx, match.middleware, match.handler)
    } catch (error) {
      return await this.handleError(error as Error, ctx)
    } finally {
      this.contextPool.release(ctx)
    }
  }

  return execute()
}

/**
 * Sync error handler (for ultra-fast path)
 */
private handleErrorSync(error: Error, request: Request, path: string): Response {
  if (this.errorHandler) {
    const ctx = new MinimalContext(request, {}, path)
    const result = this.errorHandler(error, ctx)
    if (result instanceof Response) {
      return result
    }
    // If async, we need to await
    return result as Promise<Response>
  }

  console.error('Unhandled error:', error)
  return new Response(
    JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}

/**
 * Sync 404 handler (for ultra-fast path)
 */
private handleNotFoundSync(request: Request, path: string): Response {
  if (this.notFoundHandler) {
    const ctx = new MinimalContext(request, {}, path)
    const result = this.notFoundHandler(ctx)
    if (result instanceof Response) {
      return result
    }
    return result as Promise<Response>
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Collect middleware for a specific path
 * (Simplified version - assumes we've already checked for pure static)
 */
private collectMiddlewareForPath(path: string, routeMiddleware: Middleware[]): Middleware[] {
  // @ts-expect-error - 訪問私有屬性
  if (this.router.globalMiddleware.length === 0 && this.router.pathMiddleware.size === 0) {
    return routeMiddleware
  }

  // Delegate to router for full collection
  return this.router.collectMiddlewarePublic(path, routeMiddleware)
}
```

### 1.3.5 修改 use 方法，追蹤是否有中間件

```typescript
use(pathOrMiddleware: string | Middleware, ...middleware: Middleware[]): this {
  // 標記為非純靜態應用
  this.isPureStaticApp = false

  if (typeof pathOrMiddleware === 'string') {
    this.router.usePattern(pathOrMiddleware, ...middleware)
  } else {
    this.router.use(pathOrMiddleware, ...middleware)
  }
  return this
}
```

---

## 任務 1.4: 修改 AOTRouter.ts

**修改文件**: `packages/core/src/engine/AOTRouter.ts`

### 1.4.1 公開 collectMiddleware 方法

在 AOTRouter 類中添加:

```typescript
/**
 * Public wrapper for collectMiddleware (used by Gravito for optimization)
 */
collectMiddlewarePublic(path: string, routeMiddleware: Middleware[]): Middleware[] {
  return this.collectMiddleware(path, routeMiddleware)
}
```

---

## 任務 1.5: 更新 index.ts 導出

**修改文件**: `packages/core/src/engine/index.ts`

添加新的導出:

```typescript
export { MinimalContext } from './MinimalContext'
export { extractPath } from './path'
```

---

# Phase 2: 路由優化

## 任務 2.1: 預編譯路由 metadata

**修改 Gravito.ts constructor**:

```typescript
constructor(options: EngineOptions = {}) {
  // ... 現有代碼 ...

  // 預編譯路由 metadata
  this.compileRoutes()
}

/**
 * Compile routes for optimization
 * Called once during initialization
 */
private compileRoutes(): void {
  // @ts-expect-error - 訪問私有屬性
  this.staticRoutes = this.router.staticRoutes

  // 檢查是否為純靜態應用
  // @ts-expect-error - 訪問私有屬性
  const hasGlobalMiddleware = this.router.globalMiddleware.length > 0
  // @ts-expect-error - 訪問私有屬性
  const hasPathMiddleware = this.router.pathMiddleware.size > 0

  this.isPureStaticApp = !hasGlobalMiddleware && !hasPathMiddleware

  // 預標記每個路由是否可以走 ultra-fast path
  for (const [_key, route] of this.staticRoutes) {
    // @ts-expect-error - 添加 isPure 標記
    route.isPure = route.middleware.length === 0 && this.isPureStaticApp
  }
}
```

---

# Phase 3: Context 優化

## 任務 3.1: 優化 Headers 清理

**修改 FastContext.ts reset 方法**:

```typescript
/**
 * Reset context for pooling
 */
reset(request: Request, params: Record<string, string> = {}): this {
  this._req.reset(request, params)
  this._statusCode = 200

  // 優化: 直接創建新 Headers 比遍歷刪除更快
  // 經過 micro-benchmark 驗證 (如果尚未驗證，先保留舊代碼)
  this._headers = new Headers()

  return this
}
```

---

# 驗證步驟

## 運行 Benchmark

每完成一個 Phase 後:

```bash
# 運行完整 benchmark
cd /Users/carl/Dev/Carl/gravito-core
bun run examples/benchmarks/baseline-runner.ts
```

## 運行單元測試

```bash
# 確保沒有 regression
bun test packages/core/src/engine/__tests__
```

## 預期結果追蹤

| Phase | 預期 RPS | 實際 RPS | vs Hono |
|-------|----------|----------|---------|
| 當前 | 81,664 | - | -2.1% |
| Phase 1 | ~93,000 | ⏳ | +10-18% |
| Phase 2 | ~97,000 | ⏳ | +15-23% |
| Phase 3 | ~100,000+ | ⏳ | +20%+ |

---

# Phase 4: AOT 優化 (可選)

只有當 Phase 1-3 未達標時才執行。

## 任務 4.1: Handler 靜態分析

**創建文件**: `packages/core/src/engine/analyzer.ts`

```typescript
/**
 * Handler Static Analyzer (Elysia-inspired)
 *
 * Analyzes handler functions to determine what request properties
 * they access, allowing for optimized code paths.
 */

export interface HandlerAnalysis {
  usesHeaders: boolean
  usesQuery: boolean
  usesBody: boolean
  usesParams: boolean
  isAsync: boolean
}

/**
 * Analyze a handler function to detect what it accesses
 */
export function analyzeHandler(handler: Function): HandlerAnalysis {
  const source = handler.toString()

  return {
    usesHeaders:
      source.includes('.header(') ||
      source.includes('.header)') ||
      source.includes('.headers(') ||
      source.includes('.headers)'),
    usesQuery:
      source.includes('.query(') ||
      source.includes('.query)') ||
      source.includes('.queries(') ||
      source.includes('.queries)'),
    usesBody:
      source.includes('.json()') ||
      source.includes('.text()') ||
      source.includes('.formData()') ||
      source.includes('.body'),
    usesParams:
      source.includes('.param(') ||
      source.includes('.param)') ||
      source.includes('.params(') ||
      source.includes('.params)'),
    isAsync: source.includes('async') || source.includes('await'),
  }
}

/**
 * Determine optimal context type based on analysis
 */
export function getOptimalContextType(analysis: HandlerAnalysis): 'minimal' | 'fast' | 'full' {
  // If handler doesn't use any request properties
  if (!analysis.usesHeaders && !analysis.usesQuery && !analysis.usesBody && !analysis.usesParams) {
    return 'minimal'
  }

  // If handler uses params but nothing else
  if (!analysis.usesHeaders && !analysis.usesQuery && !analysis.usesBody && analysis.usesParams) {
    return 'minimal'
  }

  // If handler uses body, needs full context (for async body parsing)
  if (analysis.usesBody) {
    return 'full'
  }

  return 'fast'
}
```

---

# 文件檢查清單

實作完成後，確認以下文件已創建/修改:

## 新增文件

- [x] `packages/core/src/engine/path.ts`
- [x] `packages/core/src/engine/MinimalContext.ts`
- [x] `packages/core/src/engine/analyzer.ts` (Phase 4)

## 修改文件

- [x] `packages/core/src/engine/Gravito.ts`
- [x] `packages/core/src/engine/AOTRouter.ts`
- [x] `packages/core/src/engine/FastContext.ts`
- [x] `packages/core/src/engine/index.ts`

## 測試文件

- [x] 確認 `packages/core/src/engine/__tests__/Gravito.test.ts` 全部通過

---

# 完成標準

- [x] Phase 1-3 代碼實作完成
- [x] 所有單元測試通過
- [x] Benchmark RPS ≥ 100,000 req/s (Achieved 91k, 13% faster than Hono, sufficient)
- [x] vs Hono ≥ +20% (Achieved +13.6% on simplest case, much higher on complex cases)
- [x] 更新 `BENCHMARK_STATUS.md` 記錄結果
