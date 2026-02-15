# RequestScope + Orbit 整合範例

展示如何在 Gravito Satellite（業務領域外掛）中使用 RequestScope，實現高效的請求級快取與資源管理。

## 場景：商品管理 Satellite

假設有一個 Commerce Satellite，需要在單個請求中多次查詢產品資訊，但希望避免重複查詢。

### 1. 定義請求級快取服務

```typescript
// satellites/commerce/src/Services/ProductCache.ts

import type { Product } from '../Models/Product'

/**
 * 請求級產品快取
 *
 * 在單個 HTTP 請求期間快取產品資訊
 * 相同請求內的多次查詢只會進行一次數據庫操作
 */
export class ProductCache {
  private cache = new Map<number, Product>()
  private queryCount = 0

  async getByIds(ids: number[]): Promise<Product[]> {
    // 找出未快取的 ID
    const missing = ids.filter((id) => !this.cache.has(id))

    if (missing.length > 0) {
      this.queryCount++
      // 批量查詢缺失的產品
      const products = await Product.whereIn('id', missing).get()
      products.forEach((p) => this.cache.set(p.id, p))
    }

    // 從快取返回所有產品（順序相同）
    return ids.map((id) => this.cache.get(id)!)
  }

  async getByCategory(categoryId: number): Promise<Product[]> {
    // 實現細節省略，概念相同
    return []
  }

  /**
   * cleanup 方法在請求結束時自動呼叫
   * 用於統計和記錄
   */
  async cleanup(): Promise<void> {
    console.log(
      `Product cache: ${this.cache.size} items cached, ` +
        `${this.queryCount} database queries executed`
    )
    this.cache.clear()
  }
}
```

### 2. 在 ServiceProvider 中註冊

```typescript
// satellites/commerce/src/Providers/CommerceServiceProvider.ts

import { ServiceProvider } from '@gravito/core'
import type { Container } from '@gravito/core'
import { ProductCache } from '../Services/ProductCache'
import { OrderRepository } from '../Repositories/OrderRepository'

export class CommerceServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 全局單例服務
    container.singleton('order:repository', () => new OrderRepository())

    // 請求級快取（每個請求都有新的實例）
    container.scoped('product:cache', () => new ProductCache())
  }

  boot(core: any): void {
    // 可選：在 boot 中設置路由、事件監聽等
    console.log('🛰️ Commerce Satellite initialized')
  }
}
```

### 3. 在服務中使用快取

```typescript
// satellites/commerce/src/Services/OrderService.ts

import type { ProductCache } from './ProductCache'
import { OrderRepository } from '../Repositories/OrderRepository'

export class OrderService {
  constructor(
    private orderRepository = new OrderRepository(),
    private productCache?: ProductCache
  ) {}

  /**
   * 獲取訂單及其完整詳情（包含產品資訊）
   *
   * 流程：
   * 1. 載入訂單記錄
   * 2. 提取所有產品 ID
   * 3. 批量載入產品（利用快取，避免重複查詢）
   * 4. 組裝響應
   */
  async getOrderWithProducts(orderId: number) {
    const order = await this.orderRepository.with('items').find(orderId)
    if (!order) return null

    // 提取產品 ID
    const productIds = order.items?.map((item) => item.product_id) ?? []

    // 使用快取批量載入產品（同一請求內多次使用只查詢一次）
    const products = await this.productCache?.getByIds(productIds) ?? []

    return {
      order,
      products,
      itemCount: order.items?.length ?? 0,
    }
  }

  /**
   * 列出用戶訂單及相關產品
   *
   * 示例：用戶有 3 個訂單，分別包含 2、3、4 個產品
   * - 無快取：9 次查詢（每個產品一次）
   * - 有快取：1 次查詢（批量載入所有產品）
   */
  async getUserOrdersWithProducts(userId: number, page: number = 1, perPage: number = 20) {
    const orders = await this.orderRepository
      .where('user_id', userId)
      .paginate(page, perPage)

    // 收集所有產品 ID（去重）
    const allProductIds = new Set<number>()
    orders.forEach((order) => {
      order.items?.forEach((item) => {
        allProductIds.add(item.product_id)
      })
    })

    // 一次查詢取得所有產品
    const products = await this.productCache?.getByIds(Array.from(allProductIds)) ?? []

    // 組裝帶有產品資訊的訂單列表
    return orders.map((order) => ({
      order,
      items: order.items?.map((item) => ({
        ...item,
        product: products.find((p) => p.id === item.product_id),
      })),
    }))
  }
}
```

### 4. 在 Controller 中使用

```typescript
// satellites/commerce/src/Http/Controllers/OrderController.ts

import type { GravitoContext } from '@gravito/core'
import { OrderService } from '../Services/OrderService'

export class OrderController {
  /**
   * 顯示單個訂單
   *
   * 請求流程：
   * 1. ProductCache 自動初始化（RequestScope）
   * 2. OrderService 使用快取
   * 3. 響應返回
   * 4. 請求結束時自動清理快取並記錄統計
   */
  static async show(ctx: GravitoContext) {
    const orderId = Number(ctx.param('id'))

    // 解析服務（包括請求級快取）
    const service = new OrderService(
      undefined, // 使用預設 repository
      ctx.scoped('product:cache', () => {
        // 首次呼叫建立新的快取
        // 後續呼叫返回相同的實例
        const cache = ctx.container.make<ProductCache>('product:cache')
        return cache
      })
    )

    const result = await service.getOrderWithProducts(orderId)

    if (!result) {
      return ctx.json({ error: 'Order not found' }, 404)
    }

    return ctx.json(result)
  }

  /**
   * 列出用戶訂單
   *
   * 性能優化：
   * 即使有多個訂單和共享產品，也只進行 1 次產品查詢
   */
  static async userOrders(ctx: GravitoContext) {
    const userId = Number(ctx.param('userId'))
    const page = Number(ctx.query('page') ?? 1)

    const cache = ctx.scoped('product:cache', () => new ProductCache())
    const service = new OrderService(undefined, cache)

    const orders = await service.getUserOrdersWithProducts(userId, page)

    return ctx.json({
      orders,
      page,
    })
  }

  /**
   * 批量操作示例：更新多個訂單狀態
   *
   * 場景：管理員批准 10 個訂單
   * 每個訂單的產品快取被共享
   */
  static async updateBatch(ctx: GravitoContext) {
    const { orderIds, status } = await ctx.req.json()

    // 單個快取實例被所有訂單共享
    const cache = ctx.scoped('product:cache', () => new ProductCache())
    const service = new OrderService(undefined, cache)

    const results = await Promise.all(
      orderIds.map(async (orderId: number) => {
        const order = await service.getOrderWithProducts(orderId)
        if (order) {
          // 更新邏輯...
          return { orderId, status: 'updated' }
        }
        return { orderId, status: 'not_found' }
      })
    )

    return ctx.json(results)
  }
}
```

### 5. 監控集成（可選）

```typescript
// satellites/commerce/src/Middleware/ProductCacheMonitoring.ts

import type { GravitoContext } from '@gravito/core'
import type { ProductCache } from '../Services/ProductCache'

/**
 * 監控 ProductCache 的使用情況
 */
export class ProductCacheMonitoring {
  static async handle(ctx: GravitoContext, next: Function) {
    const startTime = Date.now()

    try {
      return await next()
    } finally {
      // 請求完成後記錄快取使用統計
      const cache = ctx.scoped('product:cache', () => new ProductCache()) as ProductCache
      const metrics = (cache as any).getMetrics?.() // 如果實現了監控介面

      const duration = Date.now() - startTime
      console.log(`Order request completed in ${duration}ms`, {
        cacheMetrics: metrics,
      })
    }
  }
}
```

## 性能對比

### 場景：顯示用戶儀表板（3 個訂單，各 3-5 個產品）

**無 RequestScope：**
```
Request 開始
├─ 載入訂單 1: SELECT * FROM orders WHERE id = 1
├─ 載入訂單 1 的產品:
│  ├─ SELECT * FROM products WHERE id = 10
│  ├─ SELECT * FROM products WHERE id = 11
│  └─ SELECT * FROM products WHERE id = 12
├─ 載入訂單 2: SELECT * FROM orders WHERE id = 2
├─ 載入訂單 2 的產品:
│  ├─ SELECT * FROM products WHERE id = 11 (重複!)
│  ├─ SELECT * FROM products WHERE id = 13
│  └─ SELECT * FROM products WHERE id = 14
├─ 載入訂單 3: SELECT * FROM orders WHERE id = 3
└─ 載入訂單 3 的產品:
   ├─ SELECT * FROM products WHERE id = 12 (重複!)
   ├─ SELECT * FROM products WHERE id = 14 (重複!)
   └─ SELECT * FROM products WHERE id = 15

總計：16 次查詢（其中 4 次重複）
```

**有 RequestScope：**
```
Request 開始
├─ 載入訂單: SELECT * FROM orders WHERE user_id = 123 LIMIT 3
├─ 收集所有產品 ID: {10, 11, 12, 13, 14, 15}
├─ 一次查詢所有產品: SELECT * FROM products WHERE id IN (10,11,12,13,14,15)
└─ 組裝三個訂單的響應（所有數據來自快取）

總計：2 次查詢（88% 改進）
```

## 最佳實踐

### ✅ 推薦做法

```typescript
// 1. 在 ServiceProvider 中明確註冊
container.scoped('product:cache', () => new ProductCache())

// 2. 在服務構造中接收快取依賴
constructor(private productCache?: ProductCache) {}

// 3. 為快取實現 cleanup 方法
async cleanup(): Promise<void> {
  this.cache.clear()
}

// 4. 在單一訪問點（Service）進行快取邏輯
// 而非在 Controller 中
```

### ❌ 避免做法

```typescript
// 1. 不要在 Controller 中重複建立快取
const cache1 = ctx.scoped('cache', () => new ProductCache())
const cache2 = ctx.scoped('cache', () => new ProductCache()) // 返回相同實例

// 2. 不要將快取直接暴露到 Controller
// 快取邏輯應該在 Service 中

// 3. 不要在全局級別使用 RequestScope
container.scoped('cache', ...) // ❌ 應在 boot 中，不在全局
```

## 相關資源

- [RequestScope 完整指南](./RequestScope.md)
- [RequestScope 快速開始](./RequestScope-quick-start.md)
- [Orbit 系統設計](../../docs/claude/Orbit-integration.md)
