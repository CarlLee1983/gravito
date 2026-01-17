# Phase 3: PhotonAdapter Proxy 消除

> **適用範圍**: 僅 PhotonAdapter 路徑  
> **優先級**: P3（高影響但複雜度高，需要 API 相容方案）

## 重要說明

⚠️ **此優化僅影響使用 `PhotonAdapter` 的應用**。如果應用直接使用 `Gravito` 引擎，則不受此影響，因為 `Gravito` 已使用無 Proxy 的 `FastContext`/`MinimalContext`。

## 問題分析

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

## 為什麼需要 Proxy？

Proxy 的存在是為了支援**解構賦值訪問 context 變數**：

```typescript
// 這種用法需要 Proxy 的動態屬性查找
app.get('/users', async ({ userService, db }: GravitoContext) => {
  const users = await userService.findAll()
  return db.json(users)
})
```

如果消除 Proxy，需要提供替代方案。

## 優化方案 A: 直接映射 + 顯式存取

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

## 優化方案 B: 編譯時注入（進階）

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

## 優化方案 C: Context Pool（推薦）

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

## 推薦策略

| 方案 | 效能提升 | API 相容性 | 複雜度 | 推薦度 |
|-----|---------|-----------|-------|-------|
| A: 直接映射 | 最高 | ❌ 破壞性 | 中 | ⭐⭐ |
| B: 編譯注入 | 最高 | ✅ 保持 | 高 | ⭐ |
| C: Pool | 中等 | ✅ 保持 | 低 | ⭐⭐⭐ |

**建議**: 先實施方案 C（Pool），在不破壞 API 的前提下獲得部分效能提升。未來版本可考慮方案 A 作為「嚴格模式」選項。

## 實施步驟（方案 C）

1. 修改 `PhotonContextWrapper`，添加 `reset()` 方法支援重用
2. 創建 `PhotonAdapterContextPool` 類別
3. 修改 `toPhotonMiddleware` 和 `toPhotonHandler` 使用 pool
4. 添加 `finally` 區塊確保 context 被釋放
5. 基準測試驗證效能提升

## 預估影響

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

## 修正版建議

1. **Proxy 重用安全性**
   - `reset()` 必須完全清除與請求綁定的狀態
   - 文件中新增「禁止持有 ctx 參考」的規範
2. **釋放時機**
   - 需強制在 `finally` 中釋放，避免異常路徑漏釋放
