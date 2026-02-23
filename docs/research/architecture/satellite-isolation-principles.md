# Satellite 隔離原則 - 開發實踐指南

## 1. 概述 (Overview)

Satellite 隔離原則是 Galaxy Architecture 中最核心的約束。它確保：
- ✅ 衛星間零耦合（互不依賴）
- ✅ 獨立開發與部署
- ✅ 易於新增或移除衛星
- ✅ 清晰的通訊邊界

```
❌ 反面例子（禁止）
satellite-commerce → satellite-catalog
     ↑
 直接 import

✅ 正確做法（推薦）
satellite-commerce  ←事件→  satellite-catalog
       via Signal (Event Bus)
```

---

## 2. 隔離原則的核心規則 (Core Rules)

### 2.1 禁止直接導入

```typescript
// ❌ 禁止：跨衛星直接 import
import { CatalogService } from '@gravito/satellite-catalog'
import { ProductRepository } from '@gravito/satellite-catalog/dist/Infrastructure'

// ✅ 正確：每個衛星只導入基礎層
import { Container, ServiceProvider } from '@gravito/core'
import { Atlas } from '@gravito/atlas'
import { Signal } from '@gravito/signal'
```

**為什麼禁止？**
- 形成循環依賴風險
- 衛星版本綁定
- 無法獨立部署
- 難以單獨測試

### 2.2 跨衛星通訊必須透過 Hooks（事件系統）

```typescript
// ❌ 錯誤：直接調用
const catalogService = container.make('catalog.service')
await catalogService.getProducts()

// ✅ 正確：透過 Hooks 事件
core.hooks.doAction('commerce:request:products', {
  categoryId: '123'
})
```

### 2.3 衛星內部自由組織，無外部約束

```typescript
// 衛星內部可隨意設計
satellite-catalog/
├── Domain/
│   ├── Entities/
│   │   └── Product.ts
│   └── Contracts/
│       └── IProductRepository.ts
├── Application/
│   ├── DTOs/
│   ├── UseCases/
│   └── Subscribers/
├── Infrastructure/
│   ├── Persistence/
│   ├── Gateways/
│   └── Repositories/
└── Interface/
    └── Http/

// 重點是：對外只暴露必要的 API，所有通訊透過 Hooks
```

---

## 3. 衛星依賴關係 (Satellite Dependencies)

### 3.1 允許的依賴

```json
{
  "dependencies": {
    "@gravito/core": "workspace:*",       // ✅ 必需
    "@gravito/atlas": "workspace:*",      // ✅ 可選（數據庫）
    "@gravito/signal": "workspace:*",     // ✅ 可選（事件）
    "@gravito/enterprise": "workspace:*", // ✅ 可選（DDD）
    "@gravito/photon": "workspace:*"      // ✅ 可選（HTTP）
  }
}
```

**說明**：
- `@gravito/core` - 必須依賴（IoC、Hooks、生命週期）
- 其他基礎層包 - 按需依賴（無硬性要求）
- **絕對禁止** - 依賴其他衛星（@gravito/satellite-*）

### 3.2 典型衛星依賴配置

```typescript
// catalog 衛星
{
  "@gravito/core": "workspace:*",        // 生命週期、容器
  "@gravito/atlas": "workspace:*",       // ORM、資料庫
  "@gravito/signal": "workspace:*",      // 雖然用 Hooks，但可選
  "@gravito/enterprise": "workspace:*"   // DDD 支援
}

// payment 衛星
{
  "@gravito/core": "workspace:*",        // 生命週期、容器
  "@gravito/atlas": "workspace:*",       // ORM、資料庫
  // 不依賴 signal，只透過 Hooks 通訊
}

// analytics 衛星
{
  "@gravito/core": "workspace:*",        // 生命週期、容器
  "@gravito/atlas": "workspace:*"        // ORM、資料庫
}
```

---

## 4. 跨衛星通訊模式 (Communication Patterns)

### 4.1 Hooks 事件流（最常見）

```typescript
// 發佈端：Commerce 衛星
// File: satellites/commerce/src/Application/UseCases/PlaceOrder.ts
export class PlaceOrder {
  async execute(input: PlaceOrderInput): Promise<Order> {
    // 1. 建立訂單
    const order = await this.repository.create(input)

    // 2. 通知其他衛星
    await this.core.hooks.doAction('commerce:order:created', {
      orderId: order.id,
      items: order.items,
      totalAmount: order.totalAmount
    })

    return order
  }
}
```

```typescript
// 訂閱端：Payment 衛星
// File: satellites/payment/src/index.ts (PaymentServiceProvider.boot())
override boot(): void {
  const core = this.core

  // 監聽訂單建立事件
  core.hooks.addAction('commerce:order:created', async (payload: any) => {
    const processPayment = core.container.make<ProcessPayment>('payment.process')
    try {
      const intent = await processPayment.execute({
        orderId: payload.orderId,
        amount: payload.totalAmount
      })
      // 反過來通知其他衛星
      await core.hooks.doAction('payment:intent:ready', {
        orderId: payload.orderId,
        intent
      })
    } catch (error: any) {
      core.logger.error(`[Payment] Error: ${error.message}`)
    }
  })
}
```

```typescript
// 訂閱端：Catalog 衛星
// File: satellites/catalog/src/index.ts (CatalogServiceProvider.boot())
override boot(): void {
  const core = this.core

  // 監聽退款成功事件，恢復庫存
  core.hooks.addAction('payment:refund:succeeded', async (payload: any) => {
    const recoverStock = core.container.make<RecoverStock>('catalog.stock.recover')
    try {
      for (const item of payload.items) {
        await recoverStock.execute({
          variantId: item.variantId,
          quantity: item.quantity
        })
      }
    } catch (error: any) {
      core.logger.error(`[Catalog] Failed to recover stock: ${error.message}`)
    }
  })
}
```

**典型流程圖**：
```
Commerce           Payment           Catalog
   │                 │                 │
   ├─ order:created ─>│                 │
   │                 │                 │
   │                 ├─ intent:ready ──>│
   │                 │                 │
   │<─ refund:succeeded ───────────────┤
   │                 │                 │
   └─ order:refunded >├─ stock:recovered│
                     │                 │
```

### 4.2 Query-Response 模式（點對點）

某些場景需要同步回應：

```typescript
// 請求端：Commerce 衛星
// 需要取得商品資訊來驗證訂單
async validateOrder(items: OrderItem[]): Promise<boolean> {
  const productDetails = await this.core.hooks.applyFilters(
    'catalog:query:products',
    [],  // 默認值
    { productIds: items.map(i => i.productId) }
  )

  // 驗證庫存充足
  return productDetails.every(p => p.stock >= requiredQty)
}
```

```typescript
// 應答端：Catalog 衛星
override boot(): void {
  const core = this.core

  core.hooks.addFilter('catalog:query:products', async (products, args) => {
    const { productIds } = args
    const found = await this.repository.findByIds(productIds)
    return [...products, ...found]
  })
}
```

**注意**：
- 應盡量避免同步 Query-Response（易形成瓶頸）
- 優先使用異步事件模式
- 如必須同步，確保回應時間 <100ms

### 4.3 事件驅動的 Saga 模式（複雜流程）

```typescript
// 訂單結賬 Saga（跨多個衛星）
// commerce 衛星發起
async checkout() {
  // 1. 下單
  const order = await orderRepository.create(input)
  await core.hooks.doAction('commerce:order:created', { orderId: order.id })

  // 2. 等待支付完成（透過事件回調）
  const paymentResult = await new Promise((resolve) => {
    const handler = (payload: any) => {
      if (payload.orderId === order.id) {
        core.hooks.removeAction('payment:succeeded', handler)
        resolve(payload)
      }
    }
    core.hooks.addAction('payment:succeeded', handler)
    setTimeout(() => resolve(null), 30000) // 30s 超時
  })

  if (!paymentResult) {
    throw new Error('Payment timeout')
  }

  // 3. 發送物流請求
  await core.hooks.doAction('logistics:request:shipping', { orderId: order.id })
}
```

### 4.4 UI 渲染與 Ion (Inertia) 集成

在現代 Gravito 應用中，衛星常需要渲染 UI。透過 `@gravito/ion`，衛星可以在保持隔離的同時，直接傳遞 Props 給前端組件。

```typescript
// File: satellites/catalog/src/Interface/Http/ProductController.ts
export class ProductController {
  async show(ctx: GravitoContext) {
    const inertia = ctx.get('inertia')
    const product = await this.service.getById(ctx.param('id'))

    // 衛星定義組件路徑與資料，不需關心前端如何實作
    return inertia.render('Catalog/Product/Show', {
      product
    })
  }
}
```

**關鍵點**：
- 衛星僅依賴 `Context` 中注入的 `inertia` 服務。
- 組件路徑（如 `Catalog/Product/Show`）由衛星定義，並預期前端專案中存在對應的頁面組件。

---

## 5. ServiceProvider 模式 (ServiceProvider Pattern)

每個衛星透過 `ServiceProvider` 進行註冊與初始化：

```typescript
// File: satellites/catalog/src/index.ts
import { ServiceProvider } from '@gravito/core'

export class CatalogServiceProvider extends ServiceProvider {
  /**
   * register 階段：註冊所有服務
   * 在容器中綁定服務，但不執行初始化邏輯
   */
  register(container: Container): void {
    // 單例服務（全應用共享）
    container.singleton('catalog.repository.product', () =>
      new AtlasProductRepository()
    )

    // 工廠服務（每次獲取時創建新實例）
    container.bind('catalog.usecase.createProduct', () =>
      new CreateProduct(container.make('catalog.repository.product'))
    )

    // 註冊控制器
    container.singleton('catalog.controller.product', () =>
      new ProductController(this.core!)
    )
  }

  /**
   * boot 階段：初始化服務、註冊路由、監聽事件
   * 此時所有衛星都已完成 register，可安全地監聽事件
   */
  override boot(): void {
    const core = this.core
    if (!core) return

    // 1. 取得服務
    const controller = core.container.make<ProductController>(
      'catalog.controller.product'
    )

    // 2. 註冊 HTTP 路由
    core.router.prefix('/api/v1/catalog').group((router) => {
      router.get('/products', (ctx) => controller.list(ctx))
      router.post('/products', (ctx) => controller.create(ctx))
    })

    // 3. 監聽其他衛星的事件
    core.hooks.addAction('payment:refund:succeeded', async (payload) => {
      // 恢復庫存
    })

    core.logger.info('🛰️ Catalog Satellite is operational')
  }
}
```

**lifecycle 說明**：
```
應用啟動
  ↓
所有衛星 register() → 註冊服務到容器
  ↓
所有衛星 boot() → 初始化、路由、事件監聽
  ↓
應用運行 → 處理請求
  ↓
應用關閉 → 清理資源
```

---

## 6. 事件契約與版本管理 (Event Contracts)

### 6.1 定義事件契約

```typescript
// File: satellites/catalog/src/Domain/Events/CatalogEvents.ts
export interface ProductCreatedEvent {
  productId: string
  name: string
  price: number
  stock: number
  categories: string[]
}

export interface InventoryDepletedEvent {
  productId: string
  variantId: string
  requiredQuantity: number
  availableQuantity: number
}
```

### 6.2 文檔化事件

```typescript
/**
 * 事件：產品已建立
 * @event commerce:product:created
 *
 * 發佈者：Catalog 衛星
 * 訂閱者：
 *   - Marketing 衛星（發送推廣）
 *   - Analytics 衛星（追蹤指標）
 *
 * Payload:
 *   - productId: string (必需)
 *   - name: string (必需)
 *   - price: number (必需)
 *   - stock: number (必需)
 *
 * 備註：此事件是原子操作，保證 productId 唯一
 */
core.hooks.doAction('commerce:product:created', {
  productId: 'prod-123',
  name: 'iPhone 15',
  price: 999,
  stock: 100
})
```

### 6.3 向後相容性

```typescript
// v1.0：EventV1
interface ProductCreatedEventV1 {
  productId: string
  name: string
}

// v1.1：新增字段（向後相容）
interface ProductCreatedEventV1_1 {
  productId: string
  name: string
  price?: number  // 可選新字段
}

// v2.0：刪除字段（破壞性變更）
interface ProductCreatedEventV2 {
  id: string      // 改名
  title: string   // 改名
  amount: number
}

// 實踐：使用適配器模式
core.hooks.addAction('commerce:product:created', async (event) => {
  // 相容 v1.0 和 v1.1
  const productId = event.productId
  const price = event.price || 0

  // 安全地處理
  if (!productId) {
    logger.warn('Missing productId in event')
    return
  }
})
```

---

## 7. 測試隔離的衛星 (Testing Isolated Satellites)

### 7.1 單元測試（衛星內部）

```typescript
// File: satellites/catalog/tests/CreateProduct.test.ts
import { describe, it, expect } from 'bun:test'
import { CreateProduct } from '../src/Application/UseCases/CreateProduct'

describe('CreateProduct UseCase', () => {
  it('should create product with valid input', async () => {
    // 1. 準備 Mock 倉庫
    const mockRepository = {
      create: async (data: any) => ({
        id: 'prod-123',
        ...data
      })
    }

    // 2. 建立 UseCase
    const useCase = new CreateProduct(mockRepository)

    // 3. 執行
    const result = await useCase.execute({
      name: 'iPhone 15',
      price: 999
    })

    // 4. 驗證
    expect(result.id).toBe('prod-123')
    expect(result.name).toBe('iPhone 15')
  })
})
```

### 7.2 集成測試（衛星通訊）

```typescript
// File: tests/integration/catalog-payment-flow.test.ts
import { describe, it, expect } from 'bun:test'
import { createApp } from '@gravito/core'

describe('Catalog <-> Payment Integration', () => {
  it('should recover stock on payment refund', async () => {
    // 1. 初始化應用與衛星
    const app = createApp()
    const container = app.container

    // 模擬 Catalog 衛星
    container.module('catalog').singleton('catalog.stock.recover', () => ({
      execute: async (input: any) => {
        // 記錄調用
        recoveredItems.push(input)
      }
    }))

    // 2. 模擬 Hooks
    const recoveredItems: any[] = []

    // 3. 發出退款事件（模擬 Payment 衛星）
    await app.hooks.doAction('payment:refund:succeeded', {
      orderId: 'order-123',
      items: [
        { variantId: 'var-1', quantity: 2 },
        { variantId: 'var-2', quantity: 1 }
      ]
    })

    // 4. 驗證 Catalog 衛星回應
    expect(recoveredItems.length).toBe(2)
    expect(recoveredItems[0].variantId).toBe('var-1')
  })
})
```

---

## 8. 常見違反隔離的模式及修正 (Anti-patterns & Fixes)

### 反面 1：跨衛星直接 Import

```typescript
// ❌ 錯誤
import { CatalogService } from '@gravito/satellite-catalog'

export class CommerceService {
  constructor(private catalog: CatalogService) {}

  async placeOrder(items: any[]) {
    // 直接調用
    const products = await this.catalog.getProducts(items.map(i => i.id))
  }
}

// ✅ 修正：使用事件
export class CommerceService {
  constructor(private core: GravitoContext) {}

  async placeOrder(items: any[]) {
    // 發佈查詢事件
    const products = await this.core.hooks.applyFilters(
      'catalog:query:products',
      [],
      { productIds: items.map(i => i.id) }
    )
  }
}
```

### 反面 2：衛星之間的循環依賴

```typescript
// ❌ 錯誤的依賴流
Commerce 衛星
  ├─ 依賴 → Catalog 衛星
  └─ 依賴 → Payment 衛星

Catalog 衛星
  └─ 依賴 → Commerce 衛星  // 循環！

// ✅ 正確：透過事件系統
Commerce 衛星 ──[事件]──> Catalog 衛星
    ↑                      ↓
    └──────[事件]──────────┘

Payment 衛星 ──[事件]──> Commerce 衛星
```

### 反面 3：共享數據庫表

```typescript
// ❌ 錯誤：衛星共享資料表
create_products      // 被 Catalog 和 Commerce 共享
create_inventories   // 被 Catalog 和 Analytics 共享

// ✅ 正確：衛星獨立表
Catalog:           Commerce:          Payment:
- products         - orders           - transactions
- categories       - carts            - refunds
- inventory        - order_items      - payment_intents
```

### 反面 4：隱含的依賴（硬編碼）

```typescript
// ❌ 錯誤：衛星名字硬編碼
const result = await fetch('http://catalog-service/api/products')

// ✅ 正確：使用 Discovery 或 Config
const catalogUrl = config.get('services.catalog.url')
// 或者透過事件系統（更好）
await core.hooks.applyFilters('catalog:query:products', [])
```

---

## 9. 檢查清單：確保衛星隔離 (Checklist)

### 新增衛星時

- [ ] package.json 僅依賴 core + 可選基礎包（無其他衛星）
- [ ] 所有跨衛星通訊都透過 Hooks 事件
- [ ] ServiceProvider.boot() 中監聽必要事件
- [ ] 衛星内部有自己的資料庫表
- [ ] 導出一個 main export（通常是 ServiceProvider）
- [ ] 撰寫整合測試驗證衛星通訊

### 修改現有衛星時

- [ ] 檢查是否新增了對其他衛星的直接依賴
- [ ] 新增/修改事件是否文檔化了
- [ ] 既有衛星的事件監聽是否仍有效
- [ ] 循環依賴檢查：`bun run scripts/generate-dependency-graph.ts`

### 跨衛星 Bug 修復時

- [ ] 追蹤事件流（從發佈者到訂閱者）
- [ ] 檢查事件 Payload 格式是否相符
- [ ] 驗證 Hook 監聽是否真的被註冊了（boot() 是否被呼叫）
- [ ] 檢查是否遺漏了 try-catch（事件處理應防守性編程）

---

## 10. 相關文檔與資源

- **[docs/claude/design.md](../../claude/design.md)** - Galaxy Architecture 設計
- **[docs/claude/constraints.md](../../claude/constraints.md)** - 約束與規範
- **[satellites/catalog/src/](../../satellites/catalog/src/)** - 完整衛星實現示例
- **[packages/signal/](../../packages/signal/)** - 事件系統實現

---

**撰寫日期**：2026-02-23
**版本**：1.1 (Added Ion integration)
