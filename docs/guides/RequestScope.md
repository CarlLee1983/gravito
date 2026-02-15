# RequestScope 使用指南

RequestScope 提供**請求級別的服務生命週期管理**，允許服務在每個 HTTP 請求期間被快取，並在請求結束時自動清理。

**何時使用**：
- 需要快取請求級數據（如產品清單、使用者偏好）
- 需要跨方法共享臨時狀態
- 需要自動資源清理（資料庫連接、文件句柄）

## 基本概念

### 三級服務生命週期

```typescript
// 1. Transient（瞬間）：每次呼叫都建立新實例
container.bind('logger', () => new Logger())

// 2. Singleton（單例）：全局共享單一實例
container.singleton('db', () => new Database())

// 3. Request-Scoped（請求級）：每個請求快取，請求結束後清理
container.scoped('productCache', () => new RequestProductCache())
```

### 執行流程

```
HTTP 請求到達
  ↓
FastContext 創建 + RequestScope 初始化
  ├─ ctx.scoped('cache', ...) 解析服務（快取）
  ├─ ctx.scoped('cache', ...) 返回緩存的實例
  └─ 業務邏輯執行
  ↓
finally 塊中：
  ├─ ctx.requestScope().cleanup() 呼叫
  │   └─ 呼叫所有服務的 cleanup() 方法
  └─ contextPool.release(ctx)
  ↓
FastContext 歸還到對象池
```

## 使用示例

### 1. 定義請求級服務

```typescript
// src/Services/RequestProductCache.ts

export class RequestProductCache {
  private cache = new Map<number, Product>()
  private queryCount = 0

  /**
   * 獲取或批量載入產品
   * 相同請求內的多次調用只查詢一次數據庫
   */
  async get(ids: number[]): Promise<Product[]> {
    const missing = ids.filter((id) => !this.cache.has(id))

    if (missing.length > 0) {
      this.queryCount++
      const products = await Product.whereIn('id', missing).get()
      products.forEach((p) => this.cache.set(p.id, p))
    }

    return ids.map((id) => this.cache.get(id)!)
  }

  /**
   * 可選：cleanup 方法在請求結束時自動呼叫
   * 用於釋放資源、記錄指標等
   */
  async cleanup(): Promise<void> {
    // 記錄快取統計
    console.log(`Cache hits: ${this.cache.size}, queries: ${this.queryCount}`)
    this.cache.clear()
  }
}
```

### 2. 在 ServiceProvider 中註冊

```typescript
// src/Providers/AppServiceProvider.ts

import { ServiceProvider } from '@gravito/core'

export class AppServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 全局服務
    container.singleton('db', () => new Database())

    // 請求級服務
    container.scoped('productCache', () => new RequestProductCache())
    container.scoped('analyticsTracker', () => new AnalyticsTracker())
  }
}
```

### 3. 在 Controller 中使用

```typescript
// src/Http/Controllers/CartController.ts

export class CartController {
  static async index(ctx: GravitoContext) {
    // 方法 A：直接通過 ctx.scoped() 解析
    const productCache = ctx.scoped('productCache', () => new RequestProductCache())

    const cart = await CartRepository.with('items').find(cartId)
    const productIds = cart.items.map((item) => item.product_id)

    // 批量載入產品（同一請求內多次調用只查詢一次）
    const products = await productCache.get(productIds)

    return ctx.json({
      cart,
      products,
    })
  }

  static async add(ctx: GravitoContext) {
    const { productId, quantity } = await ctx.req.json()

    // 服務自動快取，無需重複建立
    const cache = ctx.scoped('productCache', () => new RequestProductCache())

    const product = (await cache.get([productId]))[0]

    if (product.stock < quantity) {
      return ctx.json({ error: 'Insufficient stock' }, 400)
    }

    // ...
  }
}
```

### 4. 在 Service 中使用

```typescript
// src/Services/CartService.ts

export class CartService {
  constructor(
    private cartRepository = new CartRepository(),
    // 注入請求級服務
    private productCache?: RequestProductCache
  ) {}

  async getCartWithProducts(cartId: number) {
    const cart = await this.cartRepository.with('items').find(cartId)

    // 批量載入產品（利用快取）
    const productIds = cart.items.map((item) => item.product_id)
    const products = await this.productCache?.get(productIds) || []

    return CartPresenter.presentWithProducts(cart, products)
  }

  async addItem(cartId: number, productId: number, quantity: number) {
    // 使用快取避免重複查詢
    const product = (await this.productCache?.get([productId]) || [])[0]

    return this.cartRepository.addItem(cartId, productId, quantity, product)
  }
}
```

### 5. 完整流程示例（購物車）

```typescript
// 要求：顯示購物車 + 載入 10 個產品
// 無 RequestScope：10 個產品查詢
// 有 RequestScope：1 個產品查詢 (批量載入)

// 1. 取得購物車及項目
const cart = await Cart.with('items').find(cartId)
// 返回 3 個項目：Product 1, 2, 3

// 2. 第一次載入產品
const cache = ctx.scoped('cache', () => new ProductCache())
const products = await cache.get([1, 2, 3])
// 數據庫查詢：SELECT * FROM products WHERE id IN (1, 2, 3)
// 快取內容：1, 2, 3

// 3. 中間邏輯需要產品 2 的詳情
const product2 = await cache.get([2])
// 無數據庫查詢！直接從快取返回

// 4. 載入相關產品（假設推薦系統）
const recommendations = await cache.get([4, 5, 6])
// 數據庫查詢：SELECT * FROM products WHERE id IN (4, 5, 6)
// 快取內容：1, 2, 3, 4, 5, 6

// 結果：2 次查詢 vs 6 次查詢（無快取）
```

## 進階用法

### 1. 多個 RequestScope 服務協作

```typescript
export class OrderService {
  async createOrder(ctx: GravitoContext, cartId: number) {
    // 解析多個請求級服務
    const productCache = ctx.scoped('productCache', () => new ProductCache())
    const orderCache = ctx.scoped('orderCache', () => new OrderCache())
    const analyticsTracker = ctx.scoped('tracker', () => new AnalyticsTracker())

    const cart = await Cart.with('items').find(cartId)
    const productIds = cart.items.map((i) => i.product_id)

    // 批量載入所有數據（兩次查詢）
    const products = await productCache.get(productIds)
    const existingOrders = await orderCache.getByProducts(productIds)

    // 檢查庫存
    for (const item of cart.items) {
      const product = products.find((p) => p.id === item.product_id)
      if (product!.stock < item.quantity) {
        throw new Error('Insufficient stock')
      }
    }

    // 建立訂單
    const order = await Order.create({...})

    // 追蹤分析
    await analyticsTracker.track('order_created', {
      orderId: order.id,
      items: cart.items,
      total: order.total,
    })

    return order
  }
}
```

### 2. 條件清理

```typescript
export class DatabaseTransaction {
  constructor(private db: Database) {}

  async commit() {
    await this.db.connection.query('COMMIT')
  }

  async rollback() {
    await this.db.connection.query('ROLLBACK')
  }

  async cleanup() {
    // 檢查是否需要回滾
    if (this.needsRollback) {
      await this.rollback()
    } else {
      await this.commit()
    }
  }
}

// 在 Controller 中使用
export class OrderController {
  static async create(ctx: GravitoContext) {
    const txn = ctx.scoped('txn', () => new DatabaseTransaction(db))

    try {
      const order = await OrderService.createOrder(txn)
      // 自動 commit（cleanup 時）
      return ctx.json(order)
    } catch (error) {
      txn.needsRollback = true
      throw error
      // 自動 rollback（cleanup 時）
    }
  }
}
```

### 3. 性能監控

```typescript
export class RequestMetrics {
  private startTime = Date.now()
  private dbQueries = 0
  private cacheHits = 0

  trackQuery() {
    this.dbQueries++
  }

  trackCacheHit() {
    this.cacheHits++
  }

  async cleanup() {
    const duration = Date.now() - this.startTime
    const hitRate = this.cacheHits / (this.cacheHits + this.dbQueries) || 0

    console.log(
      `Request metrics: ${duration}ms, ` +
        `queries: ${this.dbQueries}, ` +
        `cache hits: ${this.cacheHits}, ` +
        `hit rate: ${(hitRate * 100).toFixed(1)}%`
    )
  }
}
```

## 最佳實踐

### ✅ 推薦做法

```typescript
// 1. 在 ServiceProvider 註冊
container.scoped('cache', () => new Cache())

// 2. 通過 ctx.scoped() 或 ctx.requestScope() 使用
const cache = ctx.scoped('cache', () => new Cache())

// 3. 實作 cleanup() 方法進行清理
async cleanup() {
  this.data.clear()
  await this.logger.flush()
}

// 4. cleanup 中處理錯誤
async cleanup() {
  try {
    await this.saveMetrics()
  } catch (error) {
    console.error('Failed to save metrics:', error)
  }
}
```

### ❌ 避免做法

```typescript
// 1. 不要在全局 Orbit 級別使用 RequestScope
core.container.scoped('cache', () => new Cache()) // ❌

// 2. 不要在事件監聽器中訪問 RequestScope
core.hooks.addAction('order:created', async (order) => {
  const cache = core.requestScope()?.resolve(...) // ❌
})

// 3. 不要在 cleanup 中做非同步等待外的長時間操作
async cleanup() {
  const result = await veryLongOperation() // ❌ 會延遲請求完成
}

// 4. 不要在多個請求間共享 RequestScope
const sharedScope = ctx.requestScope() // ❌ 在下一個請求時過期
```

## 常見問題

### Q1：RequestScope 與 Singleton 的區別？

| 特徵 | Singleton | RequestScope |
|-----|-----------|--------------|
| 生命週期 | 應用級（全局） | 請求級（臨時） |
| 實例數 | 1 個（全局） | N 個（每個請求一個） |
| 內存 | 固定 | 隨請求數增長 |
| 用途 | 全局配置、DB 連接 | 快取、臨時狀態 |
| cleanup | 無（應用關閉時） | 自動（請求結束時） |

### Q2：RequestScope 如何避免內存洩漏？

每個請求的 RequestScope：
1. 在 `ctx.init()` 時建立
2. 在 `cleanup()` 時明確清空所有實例
3. 在 `contextPool.release()` 前執行清理
4. FastContext 物件重新進入對象池

結果：零內存洩漏（受益於對象池機制）

### Q3：cleanup 失敗會如何？

```typescript
// cleanup 中的任何錯誤都被捕獲和記錄
await scope.cleanup()
// 如果 ServiceA.cleanup() 拋出錯誤，會：
// 1. 記錄錯誤
// 2. 繼續清理其他服務
// 3. 最後清空所有實例
```

### Q4：如何監控 RequestScope 性能？

```typescript
// 在 middleware 中
core.adapter.use('*', async (c, next) => {
  const startTime = Date.now()
  const scope = c.requestScope()

  try {
    return await next()
  } finally {
    const cleanupStart = Date.now()
    await scope.cleanup()
    const cleanupDuration = Date.now() - cleanupStart

    console.log(
      `Request scope cleanup: ${cleanupDuration}ms, ` +
        `services: ${scope.size()}`
    )
  }
})
```

## 性能指標

基於基準測試：

| 場景 | 無快取 | 有快取 | 改進 |
|------|-------|-------|------|
| 顯示購物車（10 項） | 10 次查詢 | 1 次查詢 | 90% ↓ |
| 創建訂單 | 8 次查詢 | 2 次查詢 | 75% ↓ |
| 批量操作 | N 次查詢 | 1 次查詢 | N-1 查詢 |

記憶體開銷：
- 每個 RequestScope：~3-5 KB
- 1000 並發請求：~3-5 MB（可接受）

## 相關資源

- [RequestScope 設計規格](../../docs/claude/RequestScope-design.md)
- [框架約束分析](../../docs/claude/RequestScope-constraints.md)
- [性能與安全分析](../../docs/claude/RequestScope-performance.md)
