# 開發範例指南

此文檔包含實務上常見的開發任務完整範例。

## 目錄

1. [建立新 Satellite（業務模組）](#建立新-satellite)
2. [創建可注入的服務](#創建可注入的服務)
3. [事件驅動通訊](#事件驅動通訊)
4. [跨 Satellite 協作](#跨-satellite-協作)
5. [Hook 系統使用](#hook-系統使用)
6. [ORM 與資料庫操作](#orm-與資料庫操作)

---

## 建立新 Satellite

### 場景：新增「推薦商品」模組

#### 第 1 步：建立目錄結構

```bash
mkdir -p satellites/recommendation
cd satellites/recommendation
```

#### 第 2 步：初始化 package.json

```json
{
  "name": "@gravito/satellite-recommendation",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean --external @gravito/core --external @gravito/atlas --external @gravito/signal",
    "test": "bun test",
    "typecheck": "bun tsc -p tsconfig.json --noEmit --skipLibCheck"
  },
  "dependencies": {
    "@gravito/atlas": "workspace:*",
    "@gravito/core": "workspace:*",
    "@gravito/signal": "workspace:*"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.9.3"
  }
}
```

#### 第 3 步：建立 TypeScript 配置

```json
// tsconfig.json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "baseUrl": ".",
    "skipLibCheck": true,
    "paths": {
      "@gravito/core": ["../../packages/core/src/index.ts"],
      "@gravito/*": ["../../packages/*/src/index.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### 第 4 步：建立核心領域模型

```typescript
// src/Domain/Recommendation.ts
export interface ProductRecommendation {
  id: string
  userId: string
  productId: string
  score: number
  reason: string
  createdAt: Date
}

export class CreateRecommendationRequest {
  constructor(
    public userId: string,
    public productId: string,
    public score: number,
    public reason: string
  ) {}
}
```

#### 第 5 步：建立應用層 Use Case

```typescript
// src/Application/UseCases/GetUserRecommendations.ts
import type { RecommendationRepository } from '../Contracts/RecommendationRepository'

export class GetUserRecommendations {
  constructor(private repository: RecommendationRepository) {}

  async execute(userId: string): Promise<ProductRecommendation[]> {
    return this.repository.findByUserId(userId)
  }
}
```

#### 第 6 步：建立 Service Provider（啟動點）

```typescript
// src/RecommendationServiceProvider.ts
import { type Container, ServiceProvider } from '@gravito/core'
import { AtlasRecommendationRepository } from './Infrastructure/Persistence/AtlasRecommendationRepository'
import { GetUserRecommendations } from './Application/UseCases/GetUserRecommendations'
import { RecommendationController } from './Interface/Http/Controllers/RecommendationController'

export class RecommendationServiceProvider extends ServiceProvider {
  /**
   * 註冊服務到容器（依賴注入）
   */
  register(container: Container): void {
    // Singleton：只建立一次的共享實例
    container.singleton('recommendation.repository', () => new AtlasRecommendationRepository())

    // Bind：每次解析時建立新實例
    container.bind('recommendation.usecase.getRecommendations', () => {
      const repository = container.make('recommendation.repository')
      return new GetUserRecommendations(repository)
    })

    container.singleton('recommendation.controller', () => {
      return new RecommendationController(this.core!)
    })
  }

  /**
   * 啟動模組（註冊路由、監聽事件等）
   */
  override boot(): void {
    const core = this.core
    if (!core) {
      return
    }

    core.logger.info('🛰️ Satellite Recommendation is operational')

    // 取得已註冊的控制器
    const controller = core.container.make<RecommendationController>(
      'recommendation.controller'
    )

    // 註冊 API 路由
    core.router.prefix('/api/v1/recommendations').group((router) => {
      router.get('/user/:userId', (ctx) => controller.getUserRecommendations(ctx))
      router.post('/', (ctx) => controller.create(ctx))
    })

    // 監聽其他模組的事件
    core.hooks.addAction('product:viewed', async (productId: string, userId: string) => {
      // 當用戶瀏覽商品時，更新推薦演算法
      core.logger.debug(`Recommendation: User ${userId} viewed product ${productId}`)
    })
  }
}
```

#### 第 7 步：建立控制器

```typescript
// src/Interface/Http/Controllers/RecommendationController.ts
import type { GravitoContext } from '@gravito/core'
import { GetUserRecommendations } from '../../Application/UseCases/GetUserRecommendations'

export class RecommendationController {
  constructor(private core: PlanetCore) {}

  async getUserRecommendations(ctx: GravitoContext): Promise<void> {
    const { userId } = ctx.req.param()

    const useCase = this.core.container.make<GetUserRecommendations>(
      'recommendation.usecase.getRecommendations'
    )

    const recommendations = await useCase.execute(userId)

    ctx.json({
      success: true,
      data: recommendations,
    })
  }

  async create(ctx: GravitoContext): Promise<void> {
    // POST 邏輯...
  }
}
```

#### 第 8 步：建立 index.ts 入口

```typescript
// src/index.ts
/**
 * @gravito/satellite-recommendation
 *
 * 推薦系統模組 - 基於用戶行為與商品特性的推薦演算法
 *
 * @packageDocumentation
 */

export { RecommendationServiceProvider } from './RecommendationServiceProvider'
export type { ProductRecommendation } from './Domain/Recommendation'
export { CreateRecommendationRequest } from './Domain/Recommendation'
export { GetUserRecommendations } from './Application/UseCases/GetUserRecommendations'
```

#### 第 9 步：在主應用註冊

```typescript
// gravito.config.ts 或 app.ts
import { RecommendationServiceProvider } from '@gravito/satellite-recommendation'

export default {
  // ...
  providers: [
    // 其他 providers...
    RecommendationServiceProvider,
  ],
}
```

---

## 創建可注入的服務

### 場景：建立 EmailService

```typescript
// src/Services/EmailService.ts
import type { PlanetCore } from '@gravito/core'

/**
 * 郵件服務合約（介面）
 */
export interface IEmailService {
  send(to: string, subject: string, body: string): Promise<void>
  sendBatch(recipients: string[], subject: string, body: string): Promise<void>
}

/**
 * 具體實作
 */
export class EmailService implements IEmailService {
  constructor(
    private core: PlanetCore,
    private smtpHost: string = process.env.SMTP_HOST || 'localhost',
    private smtpPort: number = parseInt(process.env.SMTP_PORT || '587')
  ) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    try {
      // 實際的 SMTP 發送邏輯...
      this.core.logger.info(`📧 Email sent to ${to}`)
    } catch (error) {
      this.core.logger.error(`Failed to send email: ${String(error)}`)
      throw error
    }
  }

  async sendBatch(recipients: string[], subject: string, body: string): Promise<void> {
    const results = await Promise.allSettled(
      recipients.map((to) => this.send(to, subject, body))
    )

    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      this.core.logger.warn(`Batch send: ${failed} email(s) failed`)
    }
  }
}
```

### 在 ServiceProvider 註冊

```typescript
export class MyServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // Singleton：整個應用生命週期只需一個實例
    container.singleton<IEmailService>('email', (c) => {
      return new EmailService(this.core!)
    })
  }
}
```

### 在其他地方使用

```typescript
// 在控制器中
export class UserController {
  constructor(private core: PlanetCore) {}

  async register(ctx: GravitoContext): Promise<void> {
    const emailService = this.core.container.make<IEmailService>('email')

    // 建立用戶...
    await emailService.send(
      user.email,
      '歡迎註冊！',
      'Welcome to our platform!'
    )
  }
}
```

---

## 事件驅動通訊

### 場景：訂單完成後自動更新推薦

#### 定義事件

```typescript
// src/Events/OrderCompleted.ts
import { Event } from '@gravito/core'

export class OrderCompleted extends Event {
  constructor(
    public orderId: string,
    public userId: string,
    public items: Array<{ productId: string; quantity: number }>
  ) {
    super()
  }
}
```

#### 定義監聽器

```typescript
// src/Listeners/UpdateRecommendationsOnOrderCompleted.ts
import { Listener } from '@gravito/core'
import type { OrderCompleted } from '../Events/OrderCompleted'
import type { RecommendationService } from '../Services/RecommendationService'

export class UpdateRecommendationsOnOrderCompleted implements Listener<OrderCompleted> {
  constructor(private recommendationService: RecommendationService) {}

  async handle(event: OrderCompleted): Promise<void> {
    // 根據購買記錄更新推薦
    for (const item of event.items) {
      await this.recommendationService.updateScore(event.userId, item.productId, {
        reason: 'Purchased before',
        boost: 5,
      })
    }
  }
}
```

#### 在 boot 註冊監聽

```typescript
export class RecommendationServiceProvider extends ServiceProvider {
  override boot(): void {
    const core = this.core
    if (!core) return

    // 監聽訂單完成事件
    core.events.listen(OrderCompleted, UpdateRecommendationsOnOrderCompleted)
  }
}
```

#### 在其他模組發出事件

```typescript
// 在 Order Satellite 中
core.events.dispatch(
  new OrderCompleted('ORDER-123', 'USER-456', [
    { productId: 'PROD-1', quantity: 2 },
    { productId: 'PROD-2', quantity: 1 },
  ])
)
```

---

## 跨 Satellite 協作

### 場景：支付完成後自動恢復庫存（Catalog ← Payment）

#### Payment Satellite 發出事件

```typescript
// satellites/payment/src/Events/PaymentRefunded.ts
import { Event } from '@gravito/core'

export class PaymentRefunded extends Event {
  constructor(
    public paymentId: string,
    public orderId: string,
    public items: Array<{ variantId: string; quantity: number }>
  ) {
    super()
  }
}
```

#### Catalog Satellite 監聽事件

```typescript
// satellites/catalog/src/CatalogServiceProvider.ts
import { ServiceProvider } from '@gravito/core'
import { PaymentRefunded } from '@gravito/satellite-payment'
import { RestoreInventory } from './Application/UseCases/RestoreInventory'

export class CatalogServiceProvider extends ServiceProvider {
  override boot(): void {
    const core = this.core
    if (!core) return

    // 監聽支付模組的退款事件
    core.events.listen(PaymentRefunded, (event: PaymentRefunded) => {
      const useCase = core.container.make<RestoreInventory>('catalog.usecase.restore')
      return useCase.execute(event.items, event.orderId)
    })

    core.logger.info('Catalog listening to payment refunds')
  }
}
```

**重要**：Satellites 不應相互依賴，只透過事件通訊。

---

## Hook 系統使用

### 場景：在訂單狀態變更時執行外部整合

```typescript
// satellites/commerce/src/CommerceServiceProvider.ts
export class CommerceServiceProvider extends ServiceProvider {
  override boot(): void {
    const core = this.core
    if (!core) return

    // Action Hook：在訂單狀態更新前執行
    core.hooks.addAction(
      'order:status:updating',
      async (orderId: string, newStatus: string) => {
        if (newStatus === 'shipped') {
          core.logger.info(`📦 Order ${orderId} marked as shipped`)
          // 可在此呼叫外部物流 API
        }
      }
    )

    // Filter Hook：修改訂單資料
    core.hooks.addFilter('order:before:save', (orderData) => {
      return {
        ...orderData,
        updatedAt: new Date(),
      }
    })

    // 多個 Hook 監聽同一事件
    core.hooks.addAction('order:created', async (orderId: string) => {
      // 操作 1：發送確認郵件
      const emailService = core.container.make('email')
      await emailService.send(/* ... */)
    })

    core.hooks.addAction('order:created', async (orderId: string) => {
      // 操作 2：記錄分析
      core.logger.info(`Order created: ${orderId}`)
    })
  }
}
```

### Hook 的執行流程

```typescript
// 執行 Action Hook（順序執行，結果被忽略）
await core.hooks.executeAction('order:created', orderId)

// 執行 Filter Hook（有返回值的修改）
const modifiedData = core.hooks.applyFilters('order:before:save', orderData)
```

---

## ORM 與資料庫操作

### 場景：使用 Atlas ORM 建立 Repository

#### 定義資料庫模型

```typescript
// src/Infrastructure/Database/Models/Product.ts
import { Model } from '@gravito/atlas'

export class Product extends Model {
  static tableName = 'products'

  id!: string
  name!: string
  sku!: string
  price!: number
  stock!: number
  createdAt!: Date
  updatedAt!: Date
}
```

#### 建立 Repository

```typescript
// src/Infrastructure/Persistence/ProductRepository.ts
import { Product } from '../Database/Models/Product'

export interface IProductRepository {
  findById(id: string): Promise<Product | null>
  findAll(filters?: Record<string, any>): Promise<Product[]>
  create(data: Partial<Product>): Promise<Product>
  update(id: string, data: Partial<Product>): Promise<Product>
  delete(id: string): Promise<void>
}

export class ProductRepository implements IProductRepository {
  async findById(id: string): Promise<Product | null> {
    return Product.query().where('id', id).first()
  }

  async findAll(filters?: Record<string, any>): Promise<Product[]> {
    let query = Product.query()

    if (filters?.name) {
      query = query.where('name', 'like', `%${filters.name}%`)
    }

    if (filters?.minPrice) {
      query = query.where('price', '>=', filters.minPrice)
    }

    return query.orderBy('created_at', 'desc')
  }

  async create(data: Partial<Product>): Promise<Product> {
    const product = new Product()
    Object.assign(product, data)
    await product.save()
    return product
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.findById(id)
    if (!product) {
      throw new Error(`Product ${id} not found`)
    }

    Object.assign(product, data)
    await product.save()
    return product
  }

  async delete(id: string): Promise<void> {
    await Product.query().where('id', id).delete()
  }
}
```

#### 在 ServiceProvider 註冊

```typescript
register(container: Container): void {
  container.singleton<IProductRepository>('product.repository', () => {
    return new ProductRepository()
  })
}
```

#### 建立資料庫遷移

```typescript
// migrations/2024_01_15_create_products.ts
import { Migration } from '@gravito/atlas'

export default class CreateProducts extends Migration {
  async up(): Promise<void> {
    await this.schema.createTable('products', (table) => {
      table.uuid('id').primary()
      table.string('name')
      table.string('sku').unique()
      table.decimal('price', 10, 2)
      table.integer('stock').default(0)
      table.timestamps()
    })
  }

  async down(): Promise<void> {
    await this.schema.dropTable('products')
  }
}
```

### 執行遷移

```bash
# 執行待執行的遷移
bun run db:migrate

# 回滾最後一個批次
bun run db:rollback

# 重新執行所有遷移
bun run db:fresh
```

---

## 最佳實踐總結

| 概念 | 做法 | 不要做 |
|------|------|--------|
| **Service 註冊** | 使用 `container.singleton()` 以共享實例 | 在每個地方 `new Service()` |
| **跨模組通訊** | 透過 Events 或 Hooks | Satellites 相互 import |
| **資料訪問** | Repository Pattern | 直接在控制器查詢資料庫 |
| **相依性注入** | 透過容器 `make()` | 在構造器中硬編碼 |
| **錯誤處理** | 使用 logger，提供有意義的訊息 | 默默失敗或洩露系統細節 |
| **測試** | Mock Repository，測試 Use Case | 測試時連接真實資料庫 |
