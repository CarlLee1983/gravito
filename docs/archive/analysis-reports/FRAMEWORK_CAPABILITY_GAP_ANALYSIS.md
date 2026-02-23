# Gravito 框架功能 vs ecommerce-mvc 實例 - 根本原因分析

**分支**: `review/ecommerce-mvc-framework-analysis`
**日期**: 2026-02-12
**深度分析**: 框架能力缺陷 vs 範例實現缺陷

---

## 📊 核心發現

### 四大類問題的真實原因

| 問題 | 根本原因 | 類型 | 解決者 |
|------|---------|------|--------|
| **DI 容器集成** | 🟡 **混合** - 框架有支持，範例沒用 | 架構 + DX | 優化 framework + 更新範例 |
| **Repository 模式** | 🔴 **框架缺陷** - 沒有生成工具 | 框架 | 在 @gravito/atlas 添加基類 |
| **DTO 類型安全** | 🟢 **完全是範例問題** | 實作 | 更新 ecommerce-mvc |
| **事件驅動** | 🟡 **混合** - 框架有 Model Events，但文檔不清 | 文檔 + 範例 | 加強教程 |

---

## 1. DI 容器集成

### 框架現況 ✅ 能力存在

**位置**: `packages/core/src/router/ControllerDispatcher.ts`

```typescript
export class ControllerDispatcher {
  private controllers = new Map<ControllerClass, unknown>()

  resolve(CtrlClass: ControllerClass, methodName: string): GravitoHandler {
    // ✅ 框架已經支持 IoC 注入！
    let instance = this.controllers.get(CtrlClass)
    if (!instance) {
      instance = new CtrlClass(this.core)  // ← 傳遞 PlanetCore
      this.controllers.set(CtrlClass, instance)
    }
    return handler.bind(instance)
  }
}
```

**框架能力**：
- ✅ Container 類 (`packages/core/src/Container.ts`)
  - `bind(key, factory)` - 綁定服務
  - `singleton(key, factory)` - 單例
  - `make<T>(key)` - 解析服務
- ✅ ControllerDispatcher 傳遞 `this.core` 到 Controller
- ✅ 類型安全通過 `ServiceMap` module augmentation

### ecommerce-mvc 現況 ❌ 未充分利用

**位置**: `examples/ecommerce-mvc/src/Http/Controllers/CheckoutController.ts`

```typescript
export class CheckoutController {
  // ❌ PROBLEM 1: 使用 static 方法，無法接收依賴
  static async process(ctx: GravitoContext) {
    const cartService = new CartService()         // ❌ 硬依賴
    const orderService = new OrderService()       // ❌ 硬依賴
  }

  // ❌ PROBLEM 2: 沒有 constructor，無法注入服務
  constructor() {}
}
```

### 問題根源

| 方面 | 框架端 | 範例端 |
|------|--------|--------|
| 是否有 IoC 容器？ | ✅ 有 | ✅ 可用 |
| 是否傳遞 PlanetCore？ | ✅ 自動傳遞 | ❌ 沒接收 |
| 是否有文檔示例？ | ❓ 不清楚 | ❌ 沒示例 |
| **根本原因** | **DX 缺陷** | **範例缺陷** |

### 建議修復

**✅ 馬上可做**（無需框架改動）：

```typescript
// packages/monolith/src/Controller.ts - 增強版本
export abstract class Controller {
  protected services: Map<string, any> = new Map()

  constructor(protected core: PlanetCore) {
    // ✅ 接收 core，可從中解析服務
  }

  protected resolve<T>(key: string): T {
    return this.core.container.make(key)
  }

  // ✅ 靜態工廠方法
  static invoke(method: string): GravitoHandler {
    return (ctx: GravitoContext) => {
      const instance = new this(ctx.make(PlanetCore))
      return (instance as any)[method](ctx)
    }
  }
}
```

**使用範例**：

```typescript
export class CheckoutController extends Controller {
  constructor(
    core: PlanetCore,
    private cartService?: CartService,
    private orderService?: OrderService
  ) {
    super(core)
    // ✅ 或者延遲解析
    this.cartService ??= core.container.make(CartService)
    this.orderService ??= core.container.make(OrderService)
  }

  async process() {
    const order = await this.orderService.createOrder(...)
  }

  // 路由中
  static invoke = Controller.invoke.bind(this)
}

// 在路由中
router.post('/checkout', CheckoutController.invoke('process'))
```

**成本**：⏱️ **0.5 天**（無框架改動，僅增強 @gravito/monolith 文檔示例）

---

## 2. Repository 模式

### 框架現況 ⚠️ 部分能力

**位置**: `packages/enterprise/src/Domain/Repository.ts`

```typescript
// ✅ 框架定義了 Repository 接口
export interface Repository<TEntity extends Entity<TId>, TId> {
  save(entity: TEntity): Promise<void>
  findById(id: TId): Promise<TEntity | null>
  findAll(): Promise<TEntity[]>
  delete(id: TId): Promise<void>
  exists(id: TId): Promise<boolean>
}
```

**但缺失**：
- ❌ 沒有基於 Model 的實現基類
- ❌ 沒有 CRUD 生成工具
- ❌ 沒有與 Atlas ORM 的集成

### ecommerce-mvc 現況 ❌ 沒使用 Repository

**位置**: `examples/ecommerce-mvc/src/Services/CartService.ts`

```typescript
export class CartService {
  async getOrCreateCart(userId?: number, sessionId?: string): Promise<Cart> {
    // ❌ 直接使用 DB.raw()，不經過 Repository
    const result = await DB.raw(sql('SELECT * FROM carts WHERE user_id = ?'), [userId])
    // ...
  }
}
```

### 問題根源

| 方面 | 框架端 | 範例端 |
|------|--------|--------|
| 有無接口定義？ | ✅ @gravito/enterprise | ❌ 沒使用 |
| 有無生成工具？ | ❌ 沒有 | N/A |
| 有無文檔示例？ | ❌ 沒有 | N/A |
| **根本原因** | **框架缺陷** | **缺乏文檔和範例** |

### 建議改進

**🔴 需要框架改動** - 在 `@gravito/atlas` 中添加：

```typescript
// packages/atlas/src/orm/Repository.ts (新建)
import type { Model } from './model/Model'

/**
 * Base Repository for Active Record Models
 *
 * Provides convenient methods for common repository operations.
 * Unlike Enterprise Repository (DDD), this uses Active Record patterns.
 */
export abstract class ModelRepository<T extends Model> {
  protected abstract modelClass: new () => T

  async all(): Promise<T[]> {
    return this.modelClass.all()
  }

  async find(id: any): Promise<T | null> {
    return this.modelClass.find(id)
  }

  async findWhere(key: string, value: any): Promise<T | null> {
    return this.modelClass.where(key, value).first()
  }

  async findManyWhere(key: string, value: any): Promise<T[]> {
    return this.modelClass.where(key, value).get()
  }

  async create(attributes: Partial<T>): Promise<T> {
    return this.modelClass.create(attributes as any)
  }

  async update(id: any, attributes: Partial<T>): Promise<void> {
    const model = await this.find(id)
    if (!model) throw new Error(`${this.modelClass.name} not found`)
    Object.assign(model, attributes)
    await model.save()
  }

  async delete(id: any): Promise<void> {
    const model = await this.find(id)
    if (model) await model.delete()
  }
}
```

**ecommerce-mvc 使用**：

```typescript
// src/Repositories/CartRepository.ts
import { ModelRepository } from '@gravito/atlas'
import { Cart } from '../models/Cart'

export class CartRepository extends ModelRepository<Cart> {
  protected modelClass = Cart

  async getOrCreateForUser(userId: number): Promise<Cart> {
    let cart = await this.findWhere('user_id', userId)
    if (!cart) {
      cart = await this.create({ user_id: userId })
    }
    return cart
  }

  async getBySession(sessionId: string): Promise<Cart | null> {
    return this.findWhere('session_id', sessionId)
  }
}

// src/Services/CartService.ts
export class CartService {
  constructor(private cartRepository = new CartRepository()) {}

  async getOrCreateCart(userId?: number, sessionId?: string): Promise<Cart> {
    // ✅ 使用 Repository，不直接用 DB.raw
    if (userId) {
      return this.cartRepository.getOrCreateForUser(userId)
    }
    if (sessionId) {
      return this.cartRepository.getBySession(sessionId) ||
             await this.cartRepository.create({ session_id: sessionId })
    }
    return this.cartRepository.create({})
  }
}
```

**成本**：⏱️ **2 天**
- 1 天：在 @gravito/atlas 添加 ModelRepository 基類
- 1 天：更新 ecommerce-mvc 使用 Repository

---

## 3. DTO / 類型安全數據轉換

### 框架現況 ✅ 原生支持

```typescript
// packages/core/src/Container.ts
export type ServiceMap = {}  // ← Module augmentation support
```

框架已支持：
- ✅ TypeScript 類型檢查
- ✅ Zod/Mass 驗證
- ✅ JSON 序列化

### ecommerce-mvc 現況 ❌ 沒使用類型轉換

**位置**: `src/Http/Middleware/HandleInertiaRequests.ts`

```typescript
// ❌ PROBLEM: 類型丟失
const result = await DB.raw<{ id: number; name: string; email: string; role: string }>(
  sql('SELECT id, name, email, role FROM users WHERE id = ?'),
  [userId]
)
userData = result.rows[0] || null  // ← 類型已丟失

// ❌ PROBLEM: 在 Controller 中不安全
const user = await auth.user()
const userId = user.getAuthIdentifier() as number  // ← 強制轉型
```

### 問題根源

| 方面 | 框架端 | 範例端 |
|------|--------|--------|
| 類型系統支持？ | ✅ 完整 | ✅ TS strict |
| 有無 DTO 工具？ | ❌ 沒有 | ❌ 沒用 |
| **根本原因** | **缺工具** | **實作問題** |

### 建議改進

**✅ 馬上可做** - ecommerce-mvc 自行實現：

```typescript
// src/DTOs/UserDTO.ts
export interface UserDTO {
  id: number
  name: string
  email: string
  role: 'customer' | 'admin'
}

// src/Presenters/UserPresenter.ts
import type { User } from '../models/User'

export class UserPresenter {
  static toDTO(user: User): UserDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'customer' | 'admin'
    }
  }

  static toDTOList(users: User[]): UserDTO[] {
    return users.map(u => this.toDTO(u))
  }
}

// src/Http/Middleware/HandleInertiaRequests.ts
// ✅ 改進版
let userData: UserDTO | null = null
if (isAuthenticated) {
  const user = await auth.user()
  if (user) {
    const result = await DB.raw<{ id: number; name: string; email: string; role: string }>(
      sql('SELECT id, name, email, role FROM users WHERE id = ?'),
      [user.getAuthIdentifier() as number]
    )
    const userRow = result.rows[0]
    if (userRow) {
      const user = User.hydrate(userRow)
      userData = UserPresenter.toDTO(user)  // ✅ 類型安全
    }
  }
}

// 在 Inertia 中
inertia.shareAll({
  auth: {
    isAuthenticated,
    user: userData  // ✅ 現在是 UserDTO | null，類型完整
  }
})
```

**成本**：⏱️ **1 天**（純 ecommerce-mvc 改進）

---

## 4. 事件驅動架構

### 框架現況 ✅ ⭐ 功能豐富

**位置**: `packages/core/src/EventManager.ts` 和 `packages/atlas/src/orm/model/concerns/HasEvents.ts`

框架提供三層事件系統：

#### 第 1 層：Model 生命週期事件 ✅

```typescript
// packages/atlas/src/orm/model/concerns/HasEvents.ts
export class HasEvents {
  // ✅ Model Observer 模式
  static observe<T extends Model>(observer: Partial<ModelObserver<T>>): void { ... }

  // ✅ 支持的事件
  // creating, created, updating, updated, saving, saved, deleting, deleted
}

// 使用示例
Order.observe({
  created: (order) => {
    // 訂單創建後自動觸發
  }
})
```

#### 第 2 層：應用事件 ✅

```typescript
// packages/core/src/EventManager.ts
export class EventManager {
  // ✅ 類型安全的事件系統
  listen(event: EventClass, listener: ListenerClass)
  dispatch(event: Event)

  // ✅ 支持異步監聽（隊列）
}

// 使用示例
class OrderCreated extends Event {
  constructor(public order: Order) { super() }
}

class SendOrderNotification implements Listener<OrderCreated> {
  async handle(event: OrderCreated): Promise<void> { ... }
}

// 監聽
core.events.listen(OrderCreated, SendOrderNotification)

// 發射
await core.events.dispatch(new OrderCreated(order))
```

#### 第 3 層：隊列事件 ✅

```typescript
// packages/stream/src/StreamEventBackend.ts
export class StreamEventBackend {
  // ✅ 支持通過隊列異步執行
  async dispatch(event: Event, shouldQueue?: boolean) { ... }
}
```

### ecommerce-mvc 現況 ❌ 沒有事件集成

**位置**: `src/Services/OrderService.ts`

```typescript
export class OrderService {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    // ... 建立訂單 ...
    // ❌ 沒有發射事件，業務流程只能同步執行
    // ❌ 無法擴展（如：發郵件、通知、庫存更新）
    return order
  }
}
```

### 問題根源

| 方面 | 框架端 | 範例端 |
|------|--------|--------|
| 事件系統？ | ✅ 完整 | ❌ 沒用 |
| Model 觀察者？ | ✅ 有 | ❌ 沒用 |
| 異步隊列？ | ✅ 支持 | ❌ 沒用 |
| 文檔示例？ | ❌ 不充分 | ❌ 沒示例 |
| **根本原因** | **文檔缺陷** | **架構忽視** |

### 建議改進

**✅ 馬上可做** - ecommerce-mvc 集成事件系統：

```typescript
// src/Events/OrderCreated.ts
import { Event } from '@gravito/core'
import type { Order } from '../models/Order'

export class OrderCreated extends Event {
  constructor(public order: Order) {
    super()
  }
}

// src/Listeners/SendOrderConfirmationEmail.ts
import { Listener } from '@gravito/core'
import type { OrderCreated } from '../Events/OrderCreated'
import { MailService } from '@gravito/signal'

export class SendOrderConfirmationEmail implements Listener<OrderCreated> {
  constructor(private mail: MailService) {}

  async handle(event: OrderCreated): Promise<void> {
    const { order } = event
    const user = await order.user().first()  // ← 關係加載

    await this.mail.send({
      to: user.email,
      subject: `訂單 #${order.order_number} 確認`,
      html: `<p>感謝您的訂購！</p>`
    })
  }
}

// src/Services/OrderService.ts
import { EventManager } from '@gravito/core'
import { OrderCreated } from '../Events/OrderCreated'

export class OrderService {
  constructor(private events: EventManager) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    // ... 建立訂單 ...

    // ✅ 發射事件，讓監聽者非同步處理
    await this.events.dispatch(new OrderCreated(order))

    return order
  }
}

// config/events.ts - 註冊監聽者
import { core } from '@gravito/core'
import { OrderCreated } from '../src/Events/OrderCreated'
import { SendOrderConfirmationEmail } from '../src/Listeners/SendOrderConfirmationEmail'

export function registerEventListeners() {
  core.events.listen(OrderCreated, SendOrderConfirmationEmail)
}

// src/Providers/EventProvider.ts
import { ServiceProvider } from '@gravito/core'
import { registerEventListeners } from '../../config/events'

export class EventProvider extends ServiceProvider {
  boot() {
    registerEventListeners()
  }
}
```

**成本**：⏱️ **2 天**
- 1 天：在 ecommerce-mvc 創建事件和監聽者
- 1 天：集成到 OrderService 並測試

---

## 5. 問題分類總結表

### 問題歸屬分析

```
┌─────────────────────────────────────────────────────────────────┐
│                    問題分類                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔴 框架缺陷（需要框架改動）                                    │
│  ├─ Repository 基類 & 生成工具                                 │
│  └─ 位置: @gravito/atlas                                       │
│                                                                 │
│  🟡 混合問題（需要框架改進 + 範例更新）                         │
│  ├─ DI 容器集成                                                │
│  │  └─ 框架有能力，但 DX 不夠好                                │
│  │  └─ 需要：更好的文檔 + 增強 @gravito/monolith              │
│  ├─ 事件驅動                                                   │
│  │  └─ 框架有完整系統，但文檔不夠清                           │
│  │  └─ 需要：教程 + 範例代碼                                   │
│  └─ 位置: 文檔、@gravito/monolith、ecommerce-mvc             │
│                                                                 │
│  🟢 範例缺陷（只需更新 ecommerce-mvc）                         │
│  ├─ DTO/Presenter 層                                          │
│  ├─ 事件監聽者實現                                            │
│  └─ 位置: examples/ecommerce-mvc                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 實施優先級和成本估算

### 優先級排序（影響 + 工作量）

| 優先級 | 項目 | 成本 | 框架 | 範例 | 收益 |
|--------|------|------|------|------|------|
| 🔴 P0 | Repository 基類 | 2d | 1d | 1d | 高 |
| 🟡 P1 | DI 文檔 + 示例 | 1d | 0.5d | 0.5d | 中 |
| 🟡 P1 | 事件教程 | 1.5d | 0.5d | 1d | 高 |
| 🟢 P2 | DTO 實現 | 1d | 0 | 1d | 中 |

**總計**: **5.5 天**

### 分布

- **框架改動**: 2 天
- **範例更新**: 3.5 天
- **文檔優化**: 0.5 天（含在上述中）

---

## 7. 建議行動計劃

### 第 1 週：框架增強

**Day 1: Repository 基類**
```bash
# 新建 packages/atlas/src/orm/Repository.ts
# 添加到 packages/atlas/src/index.ts
# 編寫測試
```

**Day 2: DI 文檔增強**
```bash
# 增強 packages/monolith/src/Controller.ts
# 補充 docs/patterns/dependency-injection.md
```

### 第 2 週：範例更新

**Day 1: 實現 Repository 層**
```bash
# examples/ecommerce-mvc/src/Repositories/CartRepository.ts
# examples/ecommerce-mvc/src/Repositories/OrderRepository.ts
# 更新 Services 使用 Repository
```

**Day 2: 事件系統集成**
```bash
# examples/ecommerce-mvc/src/Events/OrderCreated.ts
# examples/ecommerce-mvc/src/Listeners/SendOrderConfirmationEmail.ts
# examples/ecommerce-mvc/config/events.ts
```

**Day 3: DTO 層實現**
```bash
# examples/ecommerce-mvc/src/DTOs/
# examples/ecommerce-mvc/src/Presenters/
# 更新 Controllers 使用 DTO
```

---

## 8. 結論

### 問題分析結果

| 問題 | 框架 | 範例 | 誰負責修復 |
|------|------|------|-----------|
| 🔴 DI 容器 | 有能力 | 未使用 | 優化 + 範例 |
| 🔴 Repository | 缺工具 | 缺示例 | 框架 + 範例 |
| 🟢 DTO/Presenter | 有工具 | 缺實現 | 範例 |
| 🟡 事件系統 | 完整 | 缺教程 | 文檔 + 範例 |

### 關鍵發現

1. **框架其實很強大** - 大多數功能已存在，問題在於：
   - 文檔不夠清晰
   - 生成工具不完整
   - 範例不夠完善

2. **ecommerce-mvc 沒有充分利用框架**：
   - 使用了 static 方法而不是實例化
   - 直接使用 ORM 而不是 Repository
   - 沒有集成事件系統

3. **改進方向明確**：
   - 框架：添加 Repository 基類 + 生成工具
   - 文檔：補充模式指南和完整示例
   - 範例：展示最佳實踐

### 下一步

✅ **建議立即行動**：

1. **優先級 P0**：實現 Repository 基類（框架 + 範例，2 天）
2. **優先級 P1**：完善 DI 和事件文檔（文檔 + 範例，1.5 天）
3. **優先級 P2**：DTO 實現（範例，1 天）

這樣 ecommerce-mvc 將成為展示 Gravito 最佳實踐的**參考實現**。

---

**分析完成**

*此分析揭示了框架能力與範例實現之間的差距，為後續改進指明方向。*
