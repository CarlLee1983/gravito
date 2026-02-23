# BunNativeAdapter 缺陷報告與修復方案

**分支**：feat/bun-http-perf-analysis
**日期**：2026-02-23
**發現方式**：單元測試（packages/core/tests/adapters-bun-native.test.ts）

## 測試結果摘要

```
✓ 14 pass
✗ 3 fail
```

### 失敗測試
1. **應該處理 POST 請求** - Status 代碼驗證失敗
2. **應該執行路徑特定中間件** - 中間件變數傳遞失敗
3. **應該支持自定義 notFound handler** - notFound 處理邏輯缺陷

---

## 缺陷詳解

### 缺陷 #1：Context 狀態污染

**症狀**：
```
RangeError: The status provided (0) must be 101 or in the range of [200, 599]
at json (/packages/core/src/adapters/bun/BunContext.ts:88:16)
```

**根因**：
Context 物件在多次請求中重複使用時，`_status` 欄位沒有被正確重置。

```typescript
// BunContext.ts 初始化
export class BunContext<V extends GravitoVariables = GravitoVariables> {
  private _status: StatusCode = 200  // 初始化為 200
  private _headers: Headers = new Headers()

  // 但創建後，若第一個請求失敗拋出錯誤，
  // _status 可能被設置為不合法的值（0），
  // 後續請求重複使用此物件會導致問題
}
```

**修復方案**：

在 BunContext 中添加 reset 方法：

```typescript
export class BunContext<V extends GravitoVariables = GravitoVariables>
  implements GravitoContext<V>
{
  // ...

  /**
   * Reset context state for reuse in pooling scenarios
   */
  reset(request: Request): void {
    this.req = new BunRequest(request)
    this._status = 200
    this._headers = new Headers()
    this._variables.clear()
    this.res = undefined
  }
}
```

在 BunNativeAdapter 中添加 Context 對象池：

```typescript
export class BunNativeAdapter implements HttpAdapter {
  private contextPool: BunContext[] = []

  private acquireContext(request: Request): BunContext {
    const ctx = this.contextPool.pop()
    if (ctx) {
      ctx.reset(request)
      return ctx
    }
    return BunContext.create(request) as any
  }

  private releaseContext(ctx: BunContext): void {
    ctx.reset(new Request('http://localhost'))  // 清空狀態
    this.contextPool.push(ctx)
  }

  async fetch(request: Request): Promise<Response> {
    const ctx = this.acquireContext(request)

    try {
      // ... 處理邏輯
      return response
    } finally {
      this.releaseContext(ctx)
    }
  }
}
```

**預期效果**：消除狀態污染，減少 GC 壓力 (+8-12%)

---

### 缺陷 #2：路徑特定中間件匹配不精確

**症狀**：
```
expect(data.isApi).toBe(true)
Expected: true
Received: false
```

**測試代碼**：
```typescript
adapter.use('/api/*', async (ctx, next) => {
  ctx.set('x-api', 'true')
  await next()
})

adapter.route('GET', '/api/test', (ctx) => {
  return ctx.json({ isApi: ctx.get('x-api') === 'true' })
})

const req = new Request('http://localhost/api/test')
const res = await adapter.fetch(req)
// 結果：ctx.get('x-api') 返回 undefined，不是 'true'
```

**根因**：
路徑匹配邏輯有缺陷。查看 BunNativeAdapter.fetch():

```typescript
async fetch(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  const match = this.router.match(method, path)

  const handlers: Function[] = []

  for (const mw of this.middlewares) {
    // ❌ 問題：這裡的匹配邏輯不夠精確
    if (mw.path === '*' || path.startsWith(mw.path)) {
      handlers.push(...mw.handlers)
    }
  }

  // ...
}
```

問題在於：
- `/api/*` 應該匹配 `/api/test`
- 但 `path.startsWith('/api/*')` 會檢查字符串 `/api/*` 是否是 `/api/test` 的前綴（不匹配）

**修復方案**：

實現正確的路徑通配符匹配：

```typescript
private matchesPath(pattern: string, path: string): boolean {
  if (pattern === '*') {
    return true  // 全局通配
  }

  if (!pattern.includes('*')) {
    return path === pattern  // 精確匹配
  }

  // 處理 /api/* 格式
  const basePattern = pattern.replace('*', '').replace(/\/$/, '')
  if (pattern.endsWith('/*')) {
    return path === basePattern || path.startsWith(`${basePattern}/`)
  }

  // 處理 /api* 格式（無斜線）
  if (pattern.endsWith('*')) {
    return path.startsWith(basePattern)
  }

  return false
}

async fetch(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method

  const handlers: Function[] = []

  for (const mw of this.middlewares) {
    if (this.matchesPath(mw.path, path)) {  // ✅ 使用正確的匹配函數
      handlers.push(...mw.handlers)
    }
  }

  // ...
}
```

**測試驗證**：
```typescript
const adapter = new BunNativeAdapter()

// 這些應該全部通過
expect(adapter['matchesPath']('/api/*', '/api/test')).toBe(true)
expect(adapter['matchesPath']('/api/*', '/api/users/123')).toBe(true)
expect(adapter['matchesPath']('/api/*', '/other')).toBe(false)
expect(adapter['matchesPath']('*', '/anything')).toBe(true)
expect(adapter['matchesPath']('/exact', '/exact')).toBe(true)
expect(adapter['matchesPath']('/exact', '/exact/nested')).toBe(false)
```

**預期效果**：修復中間件路由匹配，啟用路徑特定中間件功能

---

### 缺陷 #3：notFound Handler 管理邏輯

**症狀**：
```
RangeError: The status provided (0) must be 101 or in the range of [200, 599]
```

**測試代碼**：
```typescript
adapter.onNotFound((ctx) => {
  return ctx.json({ error: 'Custom not found' }, { status: 404 })
})

const req = new Request('http://localhost/notfound')
const res = await adapter.fetch(req)
// 預期：404，實際：500
```

**根因**：
在 BunNativeAdapter.fetch() 中，當路由不匹配時，notFoundHandler 被添加到 handlers，但其狀態管理不當。

```typescript
// 當路由不匹配時
if (!match) {
  if (this.notFoundHandler) {
    handlers.push(this.notFoundHandler)
    // ❌ 但此時 Context 狀態可能已損壞
  }
}
```

結合缺陷 #1（Context 狀態污染），當 notFoundHandler 試圖調用 `ctx.json()` 時，如果 context._status 已被污染為 0，就會拋出錯誤。

**修復方案**：

修復方案同 缺陷 #1（Context 重置）。此外，在 fetch 開始時確保 context 狀態清潔：

```typescript
async fetch(request: Request): Promise<Response> {
  const ctx = BunContext.create(request)  // ✅ 每次都創建新 context

  try {
    const url = new URL(request.url)
    const path = url.pathname
    const method = request.method

    const match = this.router.match(method, path)
    const handlers: Function[] = []

    for (const mw of this.middlewares) {
      if (this.matchesPath(mw.path, path)) {
        handlers.push(...mw.handlers)
      }
    }

    if (match) {
      if (match.params) {
        ;(ctx.req as BunRequest).setParams(match.params)
      }
      handlers.push(...match.handlers)
    } else {
      if (this.notFoundHandler) {
        handlers.push(this.notFoundHandler)
      }
    }

    return await this.executeChain(ctx, handlers)
  } catch (err) {
    // ... 錯誤處理
  }
}
```

**預期效果**：修復 notFound 處理，支持自定義 404 handler

---

## 修復優先級

| 優先級 | 缺陷 | 影響 | 預期時間 |
|--------|------|------|----------|
| **P0** | #1 Context 狀態污染 | 高 - 導致請求失敗 | 30min |
| **P1** | #2 中間件路徑匹配 | 高 - 中間件功能不可用 | 45min |
| **P2** | #3 notFound 管理 | 中 - 邊界情況 | 20min |

**總預計時間**：~1.5 小時

---

## 實施計劃

### Phase 1：Context 重置（30min）

1. 在 BunContext 添加 reset() 方法
2. 在 BunNativeAdapter 添加 Context 對象池
3. 修改 fetch() 以使用對象池
4. 運行測試驗證

### Phase 2：路徑匹配修復（45min）

1. 實現 matchesPath() 方法
2. 修改 fetch() 邏輯使用新方法
3. 添加路徑匹配單元測試
4. 驗證中間件測試通過

### Phase 3：整合與驗證（20min）

1. 完整單元測試套件執行
2. 性能基準測試（確保無迴歸）
3. 文檔更新

---

## 代碼變更概述

### BunContext.ts

```typescript
// 新增方法
reset(request: Request): void {
  this.req = new BunRequest(request)
  this._status = 200
  this._headers = new Headers()
  this._variables.clear()
  this.res = undefined
  this._requestScope = new RequestScopeManager()
}
```

### BunNativeAdapter.ts

```typescript
// 新增欄位
private contextPool: BunContext[] = []

// 新增方法
private matchesPath(pattern: string, path: string): boolean { /* ... */ }

private acquireContext(request: Request): BunContext { /* ... */ }

private releaseContext(ctx: BunContext): void { /* ... */ }

// 修改方法
async fetch(request: Request): Promise<Response> {
  const ctx = this.acquireContext(request)

  try {
    // ... 邏輯保持不變，但路徑匹配更新為使用 matchesPath()
  } finally {
    this.releaseContext(ctx)
  }
}
```

---

## 測試驗證命令

```bash
# 運行 BunNativeAdapter 測試
bun test packages/core/tests/adapters-bun-native.test.ts

# 預期結果（修復後）
# ✓ 17 pass
# ✗ 0 fail

# 效能基準測試
bun test packages/core/tests/adapters-bun-native.test.ts --grep "效能"

# 預期結果
# ✓ Static route average time: 0.0087ms (target: <1ms)
# ✓ Parameterized route (1000 unique) average time: 0.0068ms
```

---

## 後續步驟

1. **立即**（本周）：實施 Phase 1-3 修復
2. **短期**（下週）：運行完整集成測試，確保無隱藏缺陷
3. **中期**（2周內）：實施優化（§6.1 of bun-http-server-analysis.md）
4. **長期**（1月）：考慮自適應適配器選擇（§6.2）

---

**相關文檔**：
- [完整 Bun HTTP 效能分析](./bun-http-server-analysis.md)
- [測試檔案](../packages/core/tests/adapters-bun-native.test.ts)
