# Phase 0: 基準測試基線建立（最高優先級）

> **原則**: 沒有數據支撐的優化是盲目的。

## 目的

在進行任何優化之前，建立完整的效能基線數據，用於：
1. 驗證問題假設是否正確
2. 量化每個優化的實際收益
3. 避免過早優化和過度工程

## 基準測試套件設計

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

## HTTP 負載測試腳本

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

## 基線數據模板

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

## 實施步驟

1. 創建 `benchmarks/` 目錄結構
2. 實現基準測試套件
3. 創建基準測試伺服器 (`benchmark-server.ts`)
4. 運行基準測試並記錄結果
5. 將結果存入 `benchmarks/results/baseline-YYYY-MM-DD.json`
6. 依據實際數據調整後續 Phase 的優先級
