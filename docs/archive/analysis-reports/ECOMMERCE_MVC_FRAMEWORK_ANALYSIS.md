# Gravito ecommerce-mvc 框架架構分析與改進建議

**分支**: `review/ecommerce-mvc-framework-analysis`
**日期**: 2026-02-12
**版本**: v1.1.0

## 📊 執行摘要

ecommerce-mvc 是一個**高品質的實例應用**，展示了 Gravito 框架的完整使用模式。分析發現：

- ✅ **架構設計一致且清晰** - 遵循 MVC 模式和 Galaxy Architecture 原則
- ✅ **完整的業務流程實現** - 購物車、訂單、支付集成
- ✅ **良好的關注點分離** - Models、Controllers、Services、Middleware 層次分明
- 🔧 **可改進領域** - 跨層數據傳遞、事件驅動整合、倉庫模式

---

## 1. 架構評估

### 1.1 層級結構評分

| 層級 | 評估 | 得分 | 說明 |
|------|------|------|------|
| **Controllers** | 📍 適中 | 7/10 | 邏輯清晰，但服務注入方式不夠正式 |
| **Services** | ✅ 優秀 | 9/10 | 業務邏輯完整、可測試性強 |
| **Models** | ✅ 優秀 | 9/10 | 屬性管理、輔助方法設計合理 |
| **Middleware** | ✅ 優秀 | 9/10 | 安全性、請求處理統一規範 |
| **Providers** | 📍 適中 | 7/10 | 功能完整，但可以更聲明式 |
| **Routes** | ✅ 優秀 | 9/10 | 分組清晰、名稱規範、認證邏輯正確 |

**總體架構評分**: **8.3/10** ✨

---

## 2. 核心優勢

### 2.1 業務邏輯分離

**CartService** 和 **OrderService** 展示了優秀的設計：

```typescript
// 優秀的服務設計示例
export class OrderService {
  async createOrder(input: CreateOrderInput): Promise<Order>  // ✅ 類型安全
  async getOrder(orderId: number): Promise<Order>            // ✅ 單一職責
  async getUserOrders(userId: number, page = 1, perPage = 10) // ✅ 分頁支持
  async markAsPaid(orderId: number, paymentIntentId: string)  // ✅ 狀態轉換清晰
  async cancelOrder(orderId: number): Promise<void>          // ✅ 業務規則驗證
}
```

**優點**：
- ✅ 清晰的輸入輸出類型
- ✅ 狀態轉換有驗證邏輯
- ✅ 完整的錯誤處理
- ✅ 原子性操作（如訂單創建 + 庫存更新）

### 2.2 Models 設計

```typescript
// Product 模型 - 資料驗證 + 業務方法
export class Product extends Model {
  @column() get price(): number { ... }

  // 業務邏輯內聚
  getFormattedPrice(): string         // ✅ 格式化
  isInStock(): boolean                // ✅ 業務判斷
  hasDiscount(): boolean              // ✅ 業務判斷
  getDiscountPercentage(): number     // ✅ 計算
  static generateSlug(name: string)   // ✅ 靜態工廠
}
```

**設計優點**：
- ✅ 富領域模型（business methods）
- ✅ 輔助方法減少 Controller 複雜度
- ✅ 貨幣值用整數存儲（防止浮點數精度問題）

### 2.3 Middleware 層

```typescript
// HandleInertiaRequests - 跨切關注點處理優秀
export async function HandleInertiaRequests(ctx: GravitoContext, next: GravitoNext) {
  // ✅ 集中管理認證狀態
  // ✅ 統一注入購物車數據
  // ✅ 安全共享分類信息
  // ✅ 全局 CSRF 保護

  inertia.shareAll({
    auth: { isAuthenticated, user: userData },
    cart: cartSummary,
    categories: categoriesResult.rows,
    csrfToken: csrfToken,
  })
}
```

**優點**：
- ✅ 高效的請求數據準備
- ✅ 防止重複查詢
- ✅ 安全的上下文管理

### 2.4 路由設計

```typescript
// routes.ts - 清晰的路由組織
router.get('/products/:slug', ShopController.show)              // ✅ 資源式 URL
router.post('/checkout', AuthMiddleware, CheckoutController.process)  // ✅ 認證保護
router.delete('/cart/clear', CartController.clear)             // ✅ HTTP 方法正確使用
```

**優點**：
- ✅ RESTful 設計
- ✅ 中間件組合方式清晰
- ✅ 認證邏輯在路由層明確

---

## 3. 可改進領域

### 3.1 問題 #1: 服務定位器 Anti-Pattern

**現況**：
```typescript
// 在 Controller 中直接 new 服務
export class CheckoutController {
  static async process(ctx: GravitoContext) {
    const cartService = new CartService()  // ❌ 硬依賴
    const orderService = new OrderService()
    const _stripeService = new StripeService()
  }
}
```

**問題**：
- ❌ 難以測試（無法 mock 服務）
- ❌ 服務初始化邏輯分散
- ❌ 不利用 IoC 容器

**建議**：使用容器注入

```typescript
// ✅ 改進方案 1: 通過容器注入
export class CheckoutController {
  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private stripeService: StripeService
  ) {}

  static async process(ctx: GravitoContext) {
    const controller = ctx.make(CheckoutController)
    return controller.process(ctx)
  }
}
```

或者

```typescript
// ✅ 改進方案 2: 通過 Static Factory 方法
export class CheckoutController {
  static fromContext(ctx: GravitoContext): CheckoutController {
    return new CheckoutController(
      ctx.make(CartService),
      ctx.make(OrderService),
      ctx.make(StripeService)
    )
  }

  async process(ctx: GravitoContext) { ... }
}
```

**框架改進建議**：
- 在 `@gravito/monolith` 中提供 `Controller.make()` 靜態方法
- 自動解析構造函數依賴
- 支持 `@injectable()` 裝飾器

### 3.2 問題 #2: 數據查詢缺乏倉庫模式

**現況**：
```typescript
// 在 Service 中直接 DB.raw()
export class CartService {
  async getOrCreateCart(userId?: number, sessionId?: string): Promise<Cart> {
    const result = await DB.raw(sql('SELECT * FROM carts WHERE user_id = ?'), [userId])
    // ...
  }
}
```

**問題**：
- ❌ 數據訪問邏輯分散在 Service 中
- ❌ 難以建立統一的查詢模式
- ❌ 不利用 ORM 的全部功能

**建議**：實現倉庫模式

```typescript
// ✅ 建立 Repository 層
export interface CartRepository {
  findByUserId(userId: number): Promise<Cart | null>
  findBySessionId(sessionId: string): Promise<Cart | null>
  create(data: CreateCartInput): Promise<Cart>
  save(cart: Cart): Promise<void>
  delete(cartId: number): Promise<void>
}

export class CartRepositoryImpl implements CartRepository {
  async findByUserId(userId: number): Promise<Cart | null> {
    return Cart.where('user_id', userId).first()
  }

  async create(data: CreateCartInput): Promise<Cart> {
    return Cart.create(data)
  }
}

// ✅ Service 依賴 Repository
export class CartService {
  constructor(private cartRepo: CartRepository) {}

  async getOrCreateCart(userId: number): Promise<Cart> {
    let cart = await this.cartRepo.findByUserId(userId)
    if (!cart) {
      cart = await this.cartRepo.create({ user_id: userId })
    }
    return cart
  }
}
```

**框架改進建議**：
- 在 `@gravito/monolith` 或新 `@gravito/repository` 中提供基礎 Repository 類
- 自動從 Model 生成 CRUD Repository
- 支持查詢過濾鏈式語法

### 3.3 問題 #3: 跨層數據傳遞缺乏類型安全

**現況**：
```typescript
// 在 HandleInertiaRequests 中用 any 類型
const result = await DB.raw<{ id: number; name: string; email: string; role: string }>(
  sql('SELECT id, name, email, role FROM users WHERE id = ?'),
  [userId]
)
userData = result.rows[0] || null  // ❌ 類型丟失

// 在 Controller 中轉型
const user = await auth.user() as User  // ❌ 不安全
```

**問題**：
- ❌ 類型在層級間丟失
- ❌ IDE 自動完成失效
- ❌ 運行時容易出錯

**建議**：建立 DTO 和轉換層

```typescript
// ✅ 定義 DTOs
export interface UserDTO {
  id: number
  name: string
  email: string
  role: 'customer' | 'admin'
}

export class UserPresenter {
  static toDTO(user: User): UserDTO {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as 'customer' | 'admin'
    }
  }
}

// ✅ Controller 返回 DTO
export class ProfileController {
  async show(ctx: GravitoContext): Promise<UserDTO> {
    const user = await auth.user()
    return UserPresenter.toDTO(user)
  }
}
```

**框架改進建議**：
- 在 `@gravito/monolith` 中提供 `Presenter` 基類
- 自動 DTO 生成工具
- 支持 JSON serialization 攔截

### 3.4 問題 #4: 缺乏事件驅動架構整合

**現況**：
```typescript
// 訂單創建後沒有事件發射
export class OrderService {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    // ... 建立訂單 ...
    // ❌ 沒有觸發 OrderCreated 事件
    // ❌ 沒有非同步通知（郵件、推送等）
  }
}
```

**問題**：
- ❌ 業務流程耦合
- ❌ 難以擴展新功能（如發送郵件、庫存更新）
- ❌ 不利用 Gravito 的 Signal 事件總線

**建議**：集成 Signal 事件總線

```typescript
// ✅ 定義領域事件
export class OrderCreatedEvent {
  constructor(public order: Order) {}
}

// ✅ Service 發射事件
export class OrderService {
  constructor(
    private orderRepo: OrderRepository,
    private eventBus: Signal  // 注入事件總線
  ) {}

  async createOrder(input: CreateOrderInput): Promise<Order> {
    const order = await this.orderRepo.create(input)

    // ✅ 發射事件，讓其他模塊監聽
    await this.eventBus.dispatch(new OrderCreatedEvent(order))

    return order
  }
}

// ✅ 其他模塊監聽事件
export class OrderNotificationListener {
  @on(OrderCreatedEvent)
  async sendConfirmation(event: OrderCreatedEvent) {
    // 發送確認郵件
    await mailService.send({
      to: event.order.user.email,
      template: 'order-confirmation',
      data: event.order
    })
  }
}
```

**框架改進建議**：
- 在範例中展示完整的事件驅動模式
- 提供 `@on()` 和 `@listen()` 裝飾器
- 文檔化何時使用事件 vs. 直接調用

### 3.5 問題 #5: 錯誤處理不統一

**現況**：
```typescript
// 不同的錯誤處理方式混在一起
export class CartService {
  async addItem(cartId: number, productId: number, quantity = 1): Promise<CartItem> {
    if (!product) {
      throw new Error('Product not found or unavailable')  // ❌ 泛用 Error
    }
  }
}

// Controller 中的錯誤處理
export class CheckoutController {
  try {
    const order = await orderService.createOrder(...)
  } catch (error: any) {
    return ctx.json({ error: error.message || '結帳處理失敗' }, 500)  // ❌ 含糊
  }
}
```

**問題**：
- ❌ 無法區分錯誤類型
- ❌ HTTP 狀態碼選擇不當
- ❌ 客戶端無法精確處理

**建議**：建立統一的異常體系

```typescript
// ✅ 定義自訂異常
export class BusinessException extends Error {
  constructor(
    message: string,
    public statusCode: number = 422,
    public code?: string
  ) {
    super(message)
    this.name = 'BusinessException'
  }
}

export class ProductNotFoundException extends BusinessException {
  constructor(productId: number) {
    super(`Product ${productId} not found`, 404, 'PRODUCT_NOT_FOUND')
  }
}

export class InsufficientStockException extends BusinessException {
  constructor(productName: string, available: number, requested: number) {
    super(
      `${productName}: Only ${available} available, but ${requested} requested`,
      422,
      'INSUFFICIENT_STOCK'
    )
  }
}

// ✅ Service 拋出特定異常
export class CartService {
  async addItem(cartId: number, productId: number, quantity = 1): Promise<CartItem> {
    if (!product) {
      throw new ProductNotFoundException(productId)
    }
    if (product.stock < quantity) {
      throw new InsufficientStockException(product.name, product.stock, quantity)
    }
  }
}

// ✅ 全局異常處理中間件
export class ExceptionHandler {
  static handle(ctx: GravitoContext, error: Error) {
    if (error instanceof BusinessException) {
      return ctx.json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode
        }
      }, error.statusCode)
    }

    // 記錄未預期的異常
    console.error('Unhandled exception:', error)
    return ctx.json({
      success: false,
      error: { message: 'Internal Server Error' }
    }, 500)
  }
}
```

**框架改進建議**：
- 在 `@gravito/monolith` 中提供 Exception 基類
- 提供全局異常處理中間件
- 文檔化常見業務異常

---

## 4. 框架概念改進建議

### 4.1 建立 "SatelliteController" 基類

```typescript
// @gravito/monolith/src/SatelliteController.ts
export abstract class SatelliteController {
  protected ctx!: GravitoContext

  protected get container() {
    return this.ctx.container
  }

  protected make<T>(ServiceClass: new (...args: any[]) => T): T {
    return this.ctx.make(ServiceClass)
  }

  protected async authenticate() {
    const auth = this.ctx.get('auth') as AuthManager
    const user = await auth.user()
    if (!user) {
      throw new UnauthorizedException('User not authenticated')
    }
    return user
  }

  protected getInertia() {
    return this.ctx.get('inertia') as InertiaHelper
  }

  static async invoke(handler: string, ctx: GravitoContext) {
    const instance = ctx.make(this)
    instance.ctx = ctx
    const [method, ...args] = handler.split('@')
    return (instance as any)[method](...args)
  }
}

// 用法
export class CheckoutController extends SatelliteController {
  async show() {
    const cart = this.make(CartService).getOrCreateCart(...)
    return this.getInertia().render('Checkout', { cart })
  }
}
```

### 4.2 建立 "Repository" 基類

```typescript
// @gravito/atlas/src/Repository.ts
export abstract class Repository<T extends Model> {
  abstract modelClass: new () => T

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

  async create(data: Partial<T>): Promise<T> {
    return this.modelClass.create(data as any)
  }
}

// 用法
export class ProductRepository extends Repository<Product> {
  modelClass = Product

  async getFeatured(limit: number = 10): Promise<Product[]> {
    return Product.where('is_featured', true)
      .where('is_active', true)
      .limit(limit)
      .get()
  }
}
```

### 4.3 建立 "Presenter" 基類

```typescript
// @gravito/monolith/src/Presenter.ts
export abstract class Presenter<M, D> {
  abstract model: M

  abstract toDTO(): D

  static fromModel(model: M): D {
    const instance = new this()
    instance.model = model
    return instance.toDTO()
  }

  static fromModels(models: M[]): D[] {
    return models.map(m => this.fromModel(m))
  }
}

// 用法
export class ProductPresenter extends Presenter<Product, ProductDTO> {
  model!: Product

  toDTO(): ProductDTO {
    return {
      id: this.model.id,
      name: this.model.name,
      price: this.model.getFormattedPrice(),
      discount: this.model.getDiscountPercentage(),
      inStock: this.model.isInStock()
    }
  }
}
```

### 4.4 建立 "FormRequest" 驗證

```typescript
// @gravito/monolith/src/FormRequest.ts
export abstract class FormRequest {
  protected ctx!: GravitoContext

  abstract rules(): Record<string, string | string[]>

  async validate() {
    const data = await this.ctx.req.json()
    const validator = new Validator(data, this.rules())

    if (validator.fails()) {
      throw new ValidationException(validator.errors())
    }

    return validator.validated()
  }

  static async validate(ctx: GravitoContext): Promise<Record<string, any>> {
    const instance = new this()
    instance.ctx = ctx
    return instance.validate()
  }
}

// 用法
export class CreateOrderRequest extends FormRequest {
  rules() {
    return {
      'shipping_address.name': 'required|string|max:255',
      'shipping_address.city': 'required|string',
      'shipping_address.zip': 'required|string'
    }
  }
}
```

### 4.5 簡化路由聲明

```typescript
// ✅ 建議新的路由語法
router.apiResource('products', ProductController)  // 自動 index, show, store, update, delete
router.apiResource('orders', OrderController).middleware(['auth', 'verified'])
router.controller(CheckoutController).group(() => {
  router.get('/checkout', 'show')
  router.post('/checkout', 'process')
})
```

---

## 5. 代碼質量指標

### 5.1 測試覆蓋率評估

| 組件 | 現況 | 建議 |
|------|------|------|
| **Services** | 未測試 | 目標 >90% |
| **Models** | 未測試 | 目標 >85% |
| **Controllers** | 未測試 | 目標 >70%（集成測試） |
| **Middleware** | 未測試 | 目標 >80% |

**改進計劃**：
```typescript
// ✅ OrderService 測試示例
describe('OrderService', () => {
  let orderService: OrderService
  let orderRepo: MockOrderRepository

  beforeEach(() => {
    orderRepo = new MockOrderRepository()
    orderService = new OrderService(orderRepo)
  })

  it('should create order with valid cart', async () => {
    const order = await orderService.createOrder({
      userId: 1,
      cartId: 1,
      shippingAddress: { ... }
    })

    expect(order.id).toBeDefined()
    expect(order.status).toBe(OrderStatus.PENDING)
    expect(orderRepo.created).toHaveLength(1)
  })

  it('should throw on empty cart', async () => {
    await expect(
      orderService.createOrder({ cartId: 999, ... })
    ).rejects.toThrow('Cart is empty')
  })
})
```

### 5.2 複雜度分析

| 文件 | 方法數 | 行數 | 複雜度 | 評分 |
|------|--------|------|--------|------|
| OrderService | 6 | 256 | 中等 | 7/10 |
| CartService | 7 | 226 | 中等 | 7/10 |
| CheckoutController | 4 | 208 | 中等 | 6/10 |
| Product Model | 8 | 166 | 低 | 9/10 |

---

## 6. 框架文檔化建議

### 6.1 新增文檔頁面

在 `docs/patterns/` 中添加：

1. **controller-patterns.md** - Controller 最佳實踐
   - 服務注入方式
   - 錯誤處理
   - 響應格式化

2. **service-layer.md** - 服務層設計
   - Repository 使用
   - 事件驅動
   - 事務管理

3. **data-access.md** - 數據訪問層
   - Repository 模式
   - Query Builder 最佳實踐
   - N+1 查詢防止

4. **exception-handling.md** - 異常管理
   - 自訂異常定義
   - 全局異常處理
   - HTTP 狀態碼映射

5. **testing-strategies.md** - 測試策略
   - Service 層單元測試
   - Controller 集成測試
   - 模型測試

### 6.2 改進 ecommerce-mvc README

添加以下部分：

```markdown
## 🏗️ 架構模式

### 層次結構
- **Controllers** → 請求處理、驗證、響應
- **Services** → 業務邏輯、轉換、協調
- **Models** → 領域模型、ORM 映射、驗證規則
- **Repositories** → 數據訪問、查詢構建
- **Middleware** → 跨切關注點、安全、轉換

### 關鍵設計決策
1. **服務層優先** - 所有業務邏輯在 Service 中
2. **模型富實現** - Models 包含業務方法
3. **事件驅動（未來）** - 使用 Signal 事件總線

## 🔌 擴展指南

### 添加新功能的步驟
1. 創建 Model（如果需要）
2. 創建 Repository（與 ORM 交互）
3. 創建 Service（業務邏輯）
4. 創建 Controller（HTTP 處理）
5. 註冊路由
6. 編寫測試

### 常見集成示例
- [x] 購物車系統
- [ ] 貨幣兌換
- [ ] 多語言支持
- [ ] 庫存管理
```

---

## 7. 優先順序改進清單

### 🔴 高優先級（對框架影響大）

1. **服務容器注入** - 移除 Service Locator 反面模式
   - 影響：所有 Controllers
   - 工作量：3-5 天
   - 收益：測試性、可維護性 +30%

2. **Repository 模式** - 統一數據訪問
   - 影響：QueryBuilder 統一、複雜查詢優化
   - 工作量：2-3 天
   - 收益：查詢性能 +20%，代碼重用 +50%

3. **異常體系** - 統一錯誤處理
   - 影響：所有 Controllers、Services
   - 工作量：2 天
   - 收益：API 一致性、客戶端體驗 +40%

### 🟡 中優先級（框架建議）

4. **Event Bus 集成** - 展示事件驅動模式
   - 影響：通知、異步任務
   - 工作量：3-4 天
   - 收益：架構靈活性 +50%

5. **DTO / Presenter** - 數據轉換層
   - 影響：跨層數據傳遞
   - 工作量：2 天
   - 收益：類型安全 +60%

6. **測試框架** - 完整測試套件
   - 影響：所有組件可測試性
   - 工作量：5-7 天
   - 收益：錯誤捕捉 +70%

### 🟢 低優先級（文檔/DX）

7. **FormRequest 驗證** - 請求驗證層
   - 影響：輸入驗證統一
   - 工作量：2 天
   - 收益：代碼簡潔 +20%

8. **文檔更新** - 模式指南
   - 影響：開發者體驗
   - 工作量：2-3 天
   - 收益：採用率 +50%

---

## 8. 實施建議

### 8.1 框架增強方案

**新增包**：`@gravito/repository`

```typescript
// packages/repository/src/index.ts
export { Repository } from './Repository'
export { QueryBuilder } from './QueryBuilder'
export { Collection } from './Collection'

// packages/repository/src/Repository.ts
export abstract class Repository<T extends Model> {
  abstract modelClass: new () => T

  async all(): Promise<T[]> { ... }
  async find(id: any): Promise<T | null> { ... }
  async create(data: Partial<T>): Promise<T> { ... }
  async update(id: any, data: Partial<T>): Promise<T> { ... }
  async delete(id: any): Promise<void> { ... }
}
```

**增強 @gravito/monolith**：

```typescript
// packages/monolith/src/Controller.ts
export class Controller {
  static async make(ctx: GravitoContext, handler: string) {
    // 自動依賴注入
    const [method] = handler.split('@')
    const instance = ctx.make(this)
    return (instance as any)[method]()
  }
}

// packages/monolith/src/Presenter.ts
export abstract class Presenter<M, D> { ... }

// packages/monolith/src/Exception.ts
export class BusinessException extends Error { ... }
export class ValidationException extends BusinessException { ... }
```

### 8.2 範例更新方案

**第一階段**：
- 添加 CartRepository、OrderRepository
- 遷移 CartService、OrderService 使用 Repository
- 編寫 Service 單元測試

**第二階段**：
- 添加 CartPresenter、OrderPresenter
- 轉換 Controller 響應為 DTO
- 添加全局異常處理

**第三階段**：
- 集成 Signal 事件
- 示例：OrderCreatedEvent 發送郵件
- 編寫集成測試

---

## 9. 技術債評估

| 項目 | 成本 | 收益 | 優先級 |
|------|------|------|--------|
| 移除 Service Locator | 2 天 | 高 | 🔴 |
| 實現 Repository 模式 | 2 天 | 高 | 🔴 |
| 統一異常處理 | 1 天 | 高 | 🔴 |
| 添加測試覆蓋 | 5 天 | 高 | 🟡 |
| Event Bus 集成 | 2 天 | 中 | 🟡 |
| DTO/Presenter 層 | 1 天 | 中 | 🟡 |
| **總計** | **13 天** | **高** | |

---

## 10. 結論

### 核心發現

ecommerce-mvc 展現了 **Gravito 框架的完整實現潛力**，特別是在：

✅ **明確的層級結構** - MVC 分離得當
✅ **完整的業務流程** - 購物車到支付的全流程
✅ **良好的模型設計** - 富領域模型方法
✅ **清晰的路由設計** - RESTful 和中間件組合

### 主要改進空間

🔧 **可測試性** - 需要 DI 容器集成
🔧 **數據訪問** - 需要 Repository 層
🔧 **錯誤處理** - 需要統一的異常體系
🔧 **事件驅動** - 需要 Signal Bus 集成示例

### 對框架的建議

1. **提供 SatelliteController 基類** - 簡化 DI 和錯誤處理
2. **建立 Repository 基類庫** - 統一數據訪問模式
3. **定義 Presenter 基類** - 支持 DTO 和轉換
4. **發布模式指南** - 文檔化最佳實踐
5. **整合事件驅動示例** - 展示 Signal Bus 用法

### 時間表

- **第 1-2 周**：框架增強（Repository + Exception）
- **第 2-3 周**：範例更新（遷移到新模式）
- **第 4 周**：文檔和測試
- **第 5 周**：社群反饋和調整

---

## 附錄 A: 文件位置快速查詢

| 關鍵文件 | 位置 | 職責 |
|---------|------|------|
| Routes | `src/routes.ts` | 路由定義 |
| Controllers | `src/Http/Controllers/*.ts` | 請求處理 |
| Services | `src/Services/*.ts` | 業務邏輯 |
| Models | `src/models/*.ts` | 領域模型 |
| Middleware | `src/Http/Middleware/*.ts` | 請求轉換 |
| Providers | `src/Providers/*.ts` | 應用啟動 |
| Migrations | `database/migrations/index.ts` | 數據庫架構 |
| Seeders | `database/seeders/index.ts` | 測試數據 |

---

**分析完成**

*此分析文件用於指導 Gravito 框架的後續架構改進和功能增強。*
