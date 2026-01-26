# Phase 1: 中間件鏈預編譯

> **適用範圍**: Gravito Engine  
> **優先級**: P1（影響所有路徑，風險低）

## 問題分析

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

## 優化方案: 預編譯中間件鏈

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

## 整合到 Gravito Engine

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

## 動態路由支援

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

## 預估影響

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

## 注意事項

1. **編譯時機**: 在 `compileRoutes()` 中進行，而非 `add()` 時
2. **動態中間件**: 如果中間件在運行時動態變更，需要重新編譯
3. **錯誤處理**: 預編譯版本需要正確傳遞錯誤到 error handler

## 修正版建議

1. **語意對齊原行為**
   - 明確定義：`middleware` 未呼叫 `next()` 且未回傳 `Response` 時的行為
   - 若原行為為「回退到 handler」，預編譯版本需保持一致
2. **避免 handler 重複呼叫**
   - 中間件回傳 `Response` 時**不得**再往下執行
   - 中間件呼叫 `next()` 且回傳 `undefined` 時，應確保僅執行一次 handler
3. **動態路由快取鍵穩定化**
   - 使用穩定且可重現的 key（例如 router 的「路由 ID」或 routePattern 的 canonical 形式）
   - 若只能使用 `path`，需加上「middleware 版本號」以避免錯配
4. **快取大小限制**
   - 為 `compiledDynamicRoutes` 增加 `maxSize` 或簡易 LRU
