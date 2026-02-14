# 🎯 REST API Demo 設計模式集合

**掌握在生產級應用中使用的設計模式**

---

## 目錄

1. [創建型模式](#創建型模式)
   - Factory Pattern（工廠模式）
   - Builder Pattern（構造器模式）
   - Singleton Pattern（單例模式）

2. [結構型模式](#結構型模式)
   - Adapter Pattern（適配器模式）
   - Decorator Pattern（裝飾器模式）
   - Proxy Pattern（代理模式）

3. [行為型模式](#行為型模式)
   - Strategy Pattern（策略模式）
   - Observer Pattern（觀察者模式）
   - State Pattern（狀態模式）
   - Command Pattern（命令模式）
   - Specification Pattern（規格模式）

4. [架構模式](#架構模式)
   - Repository Pattern（倉儲模式）
   - Dependency Injection（依賴注入）
   - Service Locator
   - Domain Events

---

## 創建型模式

### 1. Factory Pattern（工廠模式）

#### 用途

封裝複雜的對象建立邏輯，使調用者無需了解建立細節。

#### 實現

```typescript
/**
 * 工廠模式：用於建立不同類型的用戶
 */
export class UserFactory {
  /**
   * 建立客戶用戶
   */
  static createCustomer(data: CreateUserInput): User {
    return {
      id: generateUUID(),
      ...data,
      role: 'customer',
      status: 'active',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  /**
   * 建立管理員用戶
   */
  static createAdmin(data: CreateUserInput): User {
    return {
      ...this.createCustomer(data),
      role: 'admin',
    }
  }

  /**
   * 從資料庫記錄建立用戶
   */
  static fromDatabase(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      password: row.password,
      role: row.role,
      status: row.status,
      emailVerified: row.email_verified,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * 工廠方法：根據角色建立用戶
   */
  static createByRole(role: UserRole, data: CreateUserInput): User {
    switch (role) {
      case 'admin':
        return this.createAdmin(data)
      case 'customer':
        return this.createCustomer(data)
      case 'guest':
        return this.createCustomer({ ...data, role: 'guest' })
      default:
        throw new Error(`Unknown role: ${role}`)
    }
  }
}

// 使用
const customer = UserFactory.createCustomer({
  email: 'customer@example.com',
  name: 'John Doe',
  password: 'hashed_password',
})

const admin = UserFactory.createAdmin({
  email: 'admin@example.com',
  name: 'Admin User',
  password: 'hashed_password',
})
```

#### 優勢

✅ 封裝建立邏輯
✅ 易於維護和擴展
✅ 支持多種建立方式

#### 何時使用

- 對象建立複雜
- 需要支持多種變體
- 建立邏輯經常變化

---

### 2. Builder Pattern（構造器模式）

#### 用途

分步構建複雜對象，特別適合有多個可選參數的場景。

#### 實現

```typescript
/**
 * 構造器模式：用於構建複雜的查詢條件
 */
export class QueryBuilder {
  private conditions: { field: string; operator: string; value: any }[] = []
  private limit: number = 10
  private offset: number = 0
  private orderBy: { field: string; direction: 'ASC' | 'DESC' } | null = null

  /**
   * 添加 WHERE 條件
   */
  where(field: string, operator: '=' | '>' | '<' | 'LIKE', value: any): this {
    this.conditions.push({ field, operator, value })
    return this
  }

  /**
   * 設置 LIMIT
   */
  limit(limit: number): this {
    this.limit = limit
    return this
  }

  /**
   * 設置 OFFSET
   */
  offset(offset: number): this {
    this.offset = offset
    return this
  }

  /**
   * 設置 ORDER BY
   */
  orderBy(
    field: string,
    direction: 'ASC' | 'DESC' = 'ASC'
  ): this {
    this.orderBy = { field, direction }
    return this
  }

  /**
   * 構建 SQL 查詢
   */
  build(): string {
    let query = 'SELECT * FROM users'

    if (this.conditions.length > 0) {
      const where = this.conditions
        .map(
          (cond) => `${cond.field} ${cond.operator} '${cond.value}'`
        )
        .join(' AND ')
      query += ` WHERE ${where}`
    }

    if (this.orderBy) {
      query += ` ORDER BY ${this.orderBy.field} ${this.orderBy.direction}`
    }

    if (this.limit) {
      query += ` LIMIT ${this.limit}`
    }

    if (this.offset) {
      query += ` OFFSET ${this.offset}`
    }

    return query
  }
}

// 使用
const query = new QueryBuilder()
  .where('status', '=', 'active')
  .where('role', '=', 'customer')
  .orderBy('createdAt', 'DESC')
  .limit(20)
  .offset(40)
  .build()

// SELECT * FROM users WHERE status = 'active' AND role = 'customer'
// ORDER BY createdAt DESC LIMIT 20 OFFSET 40
```

#### 優勢

✅ 清晰的鏈式調用
✅ 可選參數易於管理
✅ 易於測試和理解

#### 何時使用

- 對象有多個可選參數
- 需要靈活的組合方式
- 構建過程較複雜

---

### 3. Singleton Pattern（單例模式）

#### 用途

確保一個類只有一個實例，並提供全局訪問點。

#### 實現

```typescript
/**
 * 單例模式：全局配置管理
 */
export class ConfigManager {
  private static instance: ConfigManager | null = null
  private config: Map<string, any> = new Map()

  /**
   * 私有構造函數，防止直接實例化
   */
  private constructor() {
    this.loadConfig()
  }

  /**
   * 獲取單例實例
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /**
   * 加載配置
   */
  private loadConfig(): void {
    this.config.set('DB_HOST', process.env.DB_HOST || 'localhost')
    this.config.set('DB_PORT', process.env.DB_PORT || 5432)
    this.config.set('JWT_SECRET', process.env.JWT_SECRET)
    this.config.set('LOG_LEVEL', process.env.LOG_LEVEL || 'info')
  }

  /**
   * 獲取配置值
   */
  get<T>(key: string): T | undefined {
    return this.config.get(key) as T
  }

  /**
   * 設置配置值
   */
  set(key: string, value: any): void {
    this.config.set(key, value)
  }
}

// 使用
const config1 = ConfigManager.getInstance()
const config2 = ConfigManager.getInstance()

console.log(config1 === config2) // true（同一實例）

const dbHost = config1.get<string>('DB_HOST')
```

#### 優勢

✅ 全局訪問點
✅ 延遲初始化
✅ 節省資源

#### 何時使用

- 需要全局共享資源
- 只需要一個實例
- 需要集中管理

⚠️ **注意**：過度使用單例會使代碼難以測試，建議在 IoC 容器中管理單例。

---

## 結構型模式

### 4. Adapter Pattern（適配器模式）

#### 用途

將不相容的接口轉換為相容的接口，使現有代碼能夠協同工作。

#### 實現

```typescript
/**
 * 適配器模式：適配不同的支付提供商
 */

// 目標接口（我們定義的標準支付接口）
export interface PaymentProcessor {
  processPayment(amount: number, currency: string): Promise<{
    success: boolean
    transactionId: string
  }>
}

// 第三方支付提供商 A 的接口
export class StripePaymentProvider {
  async charge(amount_cents: number, currency_code: string): Promise<{
    ok: boolean
    tx_id: string
  }> {
    // 調用 Stripe API
    return {
      ok: true,
      tx_id: `stripe_${Date.now()}`,
    }
  }
}

// 第三方支付提供商 B 的接口
export class PayPalPaymentProvider {
  async executePayment(paymentAmount: number, currencyCode: string): Promise<{
    isSuccessful: boolean
    transactionIdentifier: string
  }> {
    // 調用 PayPal API
    return {
      isSuccessful: true,
      transactionIdentifier: `paypal_${Date.now()}`,
    }
  }
}

// 適配器：將 Stripe 適配為標準接口
export class StripeAdapter implements PaymentProcessor {
  constructor(private stripe: StripePaymentProvider) {}

  async processPayment(amount: number, currency: string): Promise<{
    success: boolean
    transactionId: string
  }> {
    const result = await this.stripe.charge(amount * 100, currency)
    return {
      success: result.ok,
      transactionId: result.tx_id,
    }
  }
}

// 適配器：將 PayPal 適配為標準接口
export class PayPalAdapter implements PaymentProcessor {
  constructor(private paypal: PayPalPaymentProvider) {}

  async processPayment(amount: number, currency: string): Promise<{
    success: boolean
    transactionId: string
  }> {
    const result = await this.paypal.executePayment(amount, currency)
    return {
      success: result.isSuccessful,
      transactionId: result.transactionIdentifier,
    }
  }
}

// 使用
async function processOrder(
  processor: PaymentProcessor,
  amount: number
): Promise<void> {
  const result = await processor.processPayment(amount, 'USD')
  console.log(`Payment ${result.success ? 'succeeded' : 'failed'}`)
}

// 使用 Stripe
const stripe = new StripePaymentProvider()
const stripeAdapter = new StripeAdapter(stripe)
await processOrder(stripeAdapter, 99.99)

// 使用 PayPal，代碼完全相同
const paypal = new PayPalPaymentProvider()
const paypalAdapter = new PayPalAdapter(paypal)
await processOrder(paypalAdapter, 99.99)
```

#### 優勢

✅ 消除接口不相容
✅ 易於集成第三方服務
✅ 解耦代碼

#### 何時使用

- 集成第三方庫
- 接口不相容
- 需要統一多個實現

---

### 5. Decorator Pattern（裝飾器模式）

#### 用途

動態添加新功能到對象，無需修改原對象。

#### 實現

```typescript
/**
 * 裝飾器模式：為緩存服務添加日誌和監控
 */

// 基礎接口
export interface CacheService {
  get(key: string): Promise<any>
  set(key: string, value: any, ttl: number): Promise<void>
}

// 原始實現
export class BasicCacheService implements CacheService {
  private cache: Map<string, any> = new Map()

  async get(key: string): Promise<any> {
    return this.cache.get(key)
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    this.cache.set(key, value)
    // 簡略實現，忽略 TTL
  }
}

// 裝飾器 1：添加日誌
export class LoggingCacheDecorator implements CacheService {
  constructor(private cache: CacheService) {}

  async get(key: string): Promise<any> {
    console.log(`[CACHE] Getting key: ${key}`)
    const value = await this.cache.get(key)
    console.log(`[CACHE] Result: ${value ? 'HIT' : 'MISS'}`)
    return value
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    console.log(`[CACHE] Setting key: ${key} with TTL: ${ttl}`)
    await this.cache.set(key, value, ttl)
  }
}

// 裝飾器 2：添加性能監控
export class MetricsDecorator implements CacheService {
  constructor(private cache: CacheService) {}

  async get(key: string): Promise<any> {
    const start = Date.now()
    const value = await this.cache.get(key)
    const duration = Date.now() - start
    console.log(`[METRICS] Cache GET took ${duration}ms`)
    return value
  }

  async set(key: string, value: any, ttl: number): Promise<void> {
    const start = Date.now()
    await this.cache.set(key, value, ttl)
    const duration = Date.now() - start
    console.log(`[METRICS] Cache SET took ${duration}ms`)
  }
}

// 使用：疊加多個裝飾器
const basicCache = new BasicCacheService()
const withLogging = new LoggingCacheDecorator(basicCache)
const withMetrics = new MetricsDecorator(withLogging)

await withMetrics.set('user:123', { id: 123, name: 'John' }, 3600)
// [CACHE] Setting key: user:123 with TTL: 3600
// [METRICS] Cache SET took 1ms

const user = await withMetrics.get('user:123')
// [CACHE] Getting key: user:123
// [CACHE] Result: HIT
// [METRICS] Cache GET took 0ms
```

#### 優勢

✅ 動態添加功能
✅ 無需修改原類
✅ 可組合多個裝飾器

#### 何時使用

- 需要動態添加功能
- 不想修改原類
- 需要功能組合

---

### 6. Proxy Pattern（代理模式）

#### 用途

為另一個對象提供代理，以控制對它的訪問。

#### 實現

```typescript
/**
 * 代理模式：提供數據庫訪問代理，支持日誌和權限檢查
 */

// 目標接口
export interface UserDataAccess {
  getUserById(id: string): Promise<User | null>
  updateUser(id: string, data: any): Promise<User>
  deleteUser(id: string): Promise<boolean>
}

// 實現
export class UserRepository implements UserDataAccess {
  async getUserById(id: string): Promise<User | null> {
    // 實際資料庫查詢
    return null
  }

  async updateUser(id: string, data: any): Promise<User> {
    // 實際更新邏輯
    throw new Error('Not implemented')
  }

  async deleteUser(id: string): Promise<boolean> {
    // 實際刪除邏輯
    return false
  }
}

// 代理：添加權限檢查和日誌
export class UserRepositoryProxy implements UserDataAccess {
  constructor(
    private repository: UserRepository,
    private currentUser: User
  ) {}

  async getUserById(id: string): Promise<User | null> {
    // 檢查權限
    if (this.currentUser.role === 'customer' && this.currentUser.id !== id) {
      throw new Error('Unauthorized: Cannot access other user data')
    }

    // 記錄日誌
    console.log(`[AUDIT] User ${this.currentUser.id} accessed user ${id}`)

    return this.repository.getUserById(id)
  }

  async updateUser(id: string, data: any): Promise<User> {
    // 檢查權限
    if (this.currentUser.role !== 'admin' && this.currentUser.id !== id) {
      throw new Error('Unauthorized: Cannot update other user')
    }

    // 記錄日誌
    console.log(
      `[AUDIT] User ${this.currentUser.id} updated user ${id}: ${JSON.stringify(data)}`
    )

    return this.repository.updateUser(id, data)
  }

  async deleteUser(id: string): Promise<boolean> {
    // 只有管理員可以刪除用戶
    if (this.currentUser.role !== 'admin') {
      throw new Error('Unauthorized: Only admins can delete users')
    }

    console.log(`[AUDIT] Admin ${this.currentUser.id} deleted user ${id}`)

    return this.repository.deleteUser(id)
  }
}

// 使用
const repository = new UserRepository()
const currentUser: User = {
  id: 'customer-1',
  role: 'customer',
  // ...其他字段
}

const proxy = new UserRepositoryProxy(repository, currentUser)

// ✅ 可以訪問自己的數據
await proxy.getUserById('customer-1')

// ❌ 無法訪問他人數據（拋出異常）
try {
  await proxy.getUserById('customer-2')
} catch (error) {
  console.error(error.message) // "Unauthorized: Cannot access other user data"
}
```

#### 優勢

✅ 控制對象訪問
✅ 添加安全檢查
✅ 實現權限管理

#### 何時使用

- 需要訪問控制
- 需要添加審計日誌
- 需要延遲初始化

---

## 行為型模式

### 7. Strategy Pattern（策略模式）

#### 用途

定義一系列算法，將它們封裝起來，使它們可互換。

#### 實現

```typescript
/**
 * 策略模式：支持多種用戶搜索策略
 */

// 策略接口
export interface SearchStrategy {
  search(query: string, limit: number): Promise<User[]>
}

// 策略 1：數據庫搜索
export class DatabaseSearchStrategy implements SearchStrategy {
  constructor(private db: Database) {}

  async search(query: string, limit: number): Promise<User[]> {
    const rows = await this.db.query(
      `SELECT * FROM users WHERE email LIKE ? OR name LIKE ? LIMIT ?`,
      [`%${query}%`, `%${query}%`, limit]
    )
    return rows.map((row) => this.mapToUser(row))
  }

  private mapToUser(row: any): User {
    // 轉換邏輯
    return {} as User
  }
}

// 策略 2：Elasticsearch 搜索
export class ElasticsearchSearchStrategy implements SearchStrategy {
  constructor(private es: ElasticsearchClient) {}

  async search(query: string, limit: number): Promise<User[]> {
    const results = await this.es.search({
      index: 'users',
      body: {
        query: {
          multi_match: {
            query: query,
            fields: ['email', 'name'],
          },
        },
        size: limit,
      },
    })

    return results.hits.hits.map((hit: any) => hit._source)
  }
}

// 策略 3：Meilisearch 搜索
export class MeilisearchStrategy implements SearchStrategy {
  constructor(private ms: MeilisearchClient) {}

  async search(query: string, limit: number): Promise<User[]> {
    const results = await this.ms.index('users').search(query, {
      limit,
      attributesToRetrieve: ['*'],
    })

    return results.hits as User[]
  }
}

// Use Case：使用策略
export class SearchUserUseCase {
  constructor(private strategy: SearchStrategy) {}

  async execute(query: string): Promise<User[]> {
    return this.strategy.search(query, 20)
  }
}

// IoC 容器中選擇策略
if (process.env.SEARCH_ENGINE === 'elasticsearch') {
  container.bind('SearchStrategy', () => new ElasticsearchSearchStrategy(es))
} else if (process.env.SEARCH_ENGINE === 'meilisearch') {
  container.bind('SearchStrategy', () => new MeilisearchStrategy(ms))
} else {
  container.bind('SearchStrategy', () => new DatabaseSearchStrategy(db))
}

// 使用：不需要改代碼，只需改配置
const useCase = container.make('SearchUserUseCase')
const results = await useCase.execute('john')
```

#### 優勢

✅ 易於切換算法
✅ 遵循開閉原則
✅ 易於測試

#### 何時使用

- 多種算法實現
- 算法經常變化
- 需要運行時選擇

---

### 8. Observer Pattern（觀察者模式）

#### 用途

定義一對多的依賴關係，使多個觀察者能監聽一個主體的變化。

#### 實現

```typescript
/**
 * 觀察者模式：實現事件監聽系統
 */

// 觀察者接口
export interface Observer<T> {
  update(data: T): void
}

// 主體（發布者）
export class EventEmitter<T> {
  private observers: Observer<T>[] = []

  /**
   * 添加觀察者
   */
  subscribe(observer: Observer<T>): () => void {
    this.observers.push(observer)

    // 返回退訂函數
    return () => {
      this.observers = this.observers.filter((obs) => obs !== observer)
    }
  }

  /**
   * 通知所有觀察者
   */
  emit(data: T): void {
    for (const observer of this.observers) {
      observer.update(data)
    }
  }

  /**
   * 獲取觀察者數量
   */
  getObserverCount(): number {
    return this.observers.length
  }
}

// 具體觀察者 1：日誌觀察者
export class LoggerObserver implements Observer<UserCreatedEvent> {
  update(event: UserCreatedEvent): void {
    console.log(
      `[LOG] User created: ${event.email} at ${event.createdAt.toISOString()}`
    )
  }
}

// 具體觀察者 2：郵件觀察者
export class EmailObserver implements Observer<UserCreatedEvent> {
  constructor(private emailService: EmailService) {}

  update(event: UserCreatedEvent): void {
    this.emailService.send({
      to: event.email,
      subject: 'Welcome!',
      template: 'welcome',
    })
  }
}

// 具體觀察者 3：分析觀察者
export class AnalyticsObserver implements Observer<UserCreatedEvent> {
  update(event: UserCreatedEvent): void {
    analytics.track('user_created', {
      userId: event.userId,
      email: event.email,
    })
  }
}

// 使用
const userCreatedEmitter = new EventEmitter<UserCreatedEvent>()

// 添加觀察者
const unsubscribeLogger = userCreatedEmitter.subscribe(
  new LoggerObserver()
)
userCreatedEmitter.subscribe(
  new EmailObserver(emailService)
)
userCreatedEmitter.subscribe(
  new AnalyticsObserver()
)

// 發送事件，所有觀察者都會被通知
userCreatedEmitter.emit({
  userId: '123',
  email: 'user@example.com',
  createdAt: new Date(),
})

// 退訂
unsubscribeLogger()
```

#### 優勢

✅ 解耦發布者和訂閱者
✅ 動態添加/移除觀察者
✅ 支持多個觀察者

#### 何時使用

- 事件驅動架構
- 一對多關係
- 需要動態訂閱

---

### 9. State Pattern（狀態模式）

#### 用途

允許對象在其內部狀態改變時改變其行為。

#### 實現

```typescript
/**
 * 狀態模式：訂單狀態機
 */

// 狀態接口
export interface OrderState {
  approve(): void
  reject(): void
  ship(): void
  deliver(): void
}

// 訂單上下文
export class Order {
  private state: OrderState

  constructor() {
    this.state = new PendingState(this)
  }

  /**
   * 轉換狀態
   */
  setState(state: OrderState): void {
    this.state = state
  }

  /**
   * 代理狀態的操作
   */
  approve(): void {
    this.state.approve()
  }

  reject(): void {
    this.state.reject()
  }

  ship(): void {
    this.state.ship()
  }

  deliver(): void {
    this.state.deliver()
  }
}

// 待批准狀態
export class PendingState implements OrderState {
  constructor(private order: Order) {}

  approve(): void {
    console.log('✅ Order approved, transitioning to Approved state')
    this.order.setState(new ApprovedState(this.order))
  }

  reject(): void {
    console.log('❌ Order rejected, transitioning to Rejected state')
    this.order.setState(new RejectedState(this.order))
  }

  ship(): void {
    console.log('❌ Cannot ship: Order not yet approved')
  }

  deliver(): void {
    console.log('❌ Cannot deliver: Order not yet approved')
  }
}

// 已批准狀態
export class ApprovedState implements OrderState {
  constructor(private order: Order) {}

  approve(): void {
    console.log('❌ Already approved')
  }

  reject(): void {
    console.log('❌ Cannot reject approved order')
  }

  ship(): void {
    console.log('✅ Order shipped, transitioning to Shipped state')
    this.order.setState(new ShippedState(this.order))
  }

  deliver(): void {
    console.log('❌ Cannot deliver: Order not yet shipped')
  }
}

// 已發貨狀態
export class ShippedState implements OrderState {
  constructor(private order: Order) {}

  approve(): void {
    console.log('❌ Cannot approve shipped order')
  }

  reject(): void {
    console.log('❌ Cannot reject shipped order')
  }

  ship(): void {
    console.log('❌ Already shipped')
  }

  deliver(): void {
    console.log('✅ Order delivered, transitioning to Delivered state')
    this.order.setState(new DeliveredState(this.order))
  }
}

// 已送達狀態
export class DeliveredState implements OrderState {
  constructor(private order: Order) {}

  approve(): void {
    console.log('❌ Cannot modify delivered order')
  }

  reject(): void {
    console.log('❌ Cannot modify delivered order')
  }

  ship(): void {
    console.log('❌ Cannot modify delivered order')
  }

  deliver(): void {
    console.log('✅ Order already delivered')
  }
}

// 已拒絕狀態
export class RejectedState implements OrderState {
  constructor(private order: Order) {}

  approve(): void {
    console.log('❌ Cannot approve rejected order')
  }

  reject(): void {
    console.log('✅ Already rejected')
  }

  ship(): void {
    console.log('❌ Cannot ship rejected order')
  }

  deliver(): void {
    console.log('❌ Cannot deliver rejected order')
  }
}

// 使用
const order = new Order()

order.approve()      // ✅ Order approved
order.ship()         // ✅ Order shipped
order.deliver()      // ✅ Order delivered
order.ship()         // ❌ Cannot modify delivered order
```

#### 優勢

✅ 清晰的狀態轉換
✅ 易於添加新狀態
✅ 避免複雜的 if-else

#### 何時使用

- 有明確的狀態轉換
- 狀態行為不同
- 需要狀態機

---

### 10. Command Pattern（命令模式）

#### 用途

將請求封裝為對象，允許參數化客戶端、隊列請求、和記錄請求。

#### 實現

```typescript
/**
 * 命令模式：實現可撤銷的操作
 */

// 命令接口
export interface Command {
  execute(): Promise<void>
  undo(): Promise<void>
}

// 具體命令：轉賬
export class TransferMoneyCommand implements Command {
  private originalBalance: number = 0

  constructor(
    private fromAccount: Account,
    private toAccount: Account,
    private amount: number
  ) {}

  async execute(): Promise<void> {
    // 保存原始狀態用於撤銷
    this.originalBalance = this.fromAccount.getBalance()

    // 執行轉賬
    this.fromAccount.debit(this.amount)
    this.toAccount.credit(this.amount)

    console.log(`✅ Transferred $${this.amount} from ${this.fromAccount.id} to ${this.toAccount.id}`)
  }

  async undo(): Promise<void> {
    // 撤銷轉賬
    this.fromAccount.credit(this.amount)
    this.toAccount.debit(this.amount)

    console.log(`↩️ Undone transfer of $${this.amount}`)
  }
}

// 命令歷史記錄器
export class CommandHistory {
  private history: Command[] = []

  /**
   * 執行命令並記錄
   */
  async execute(command: Command): Promise<void> {
    await command.execute()
    this.history.push(command)
  }

  /**
   * 撤銷最後一個命令
   */
  async undo(): Promise<void> {
    const command = this.history.pop()
    if (command) {
      await command.undo()
    }
  }

  /**
   * 撤銷全部命令
   */
  async undoAll(): Promise<void> {
    while (this.history.length > 0) {
      await this.undo()
    }
  }

  /**
   * 獲取歷史記錄
   */
  getHistory(): Command[] {
    return [...this.history]
  }
}

// Account 類
class Account {
  private balance: number = 1000

  constructor(readonly id: string) {}

  debit(amount: number): void {
    this.balance -= amount
  }

  credit(amount: number): void {
    this.balance += amount
  }

  getBalance(): number {
    return this.balance
  }
}

// 使用
const accountA = new Account('A')
const accountB = new Account('B')
const history = new CommandHistory()

// 執行命令
const transfer1 = new TransferMoneyCommand(accountA, accountB, 100)
await history.execute(transfer1)
console.log(`A: $${accountA.getBalance()}, B: $${accountB.getBalance()}`) // A: $900, B: $1100

// 撤銷命令
await history.undo()
console.log(`A: $${accountA.getBalance()}, B: $${accountB.getBalance()}`) // A: $1000, B: $1000
```

#### 優勢

✅ 支持撤銷/重做
✅ 支持命令隊列
✅ 易於記錄和審計

#### 何時使用

- 需要撤銷功能
- 需要命令隊列
- 需要請求日誌

---

### 11. Specification Pattern（規格模式）

#### 用途

將複雜的業務規則封裝為可重用的對象。

#### 實現

```typescript
/**
 * 規格模式：複雜的用戶查詢規則
 */

// 規格基類
export abstract class Specification<T> {
  abstract isSatisfiedBy(obj: T): boolean

  and(spec: Specification<T>): Specification<T> {
    return new CompositeSpecification(this, spec, 'AND')
  }

  or(spec: Specification<T>): Specification<T> {
    return new CompositeSpecification(this, spec, 'OR')
  }

  not(): Specification<T> {
    return new NotSpecification(this)
  }
}

// 規格 1：用戶必須活躍
export class ActiveUserSpecification extends Specification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.status === 'active'
  }
}

// 規格 2：用戶必須已驗證郵箱
export class VerifiedEmailSpecification extends Specification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.emailVerified === true
  }
}

// 規格 3：用戶必須是管理員
export class AdminSpecification extends Specification<User> {
  isSatisfiedBy(user: User): boolean {
    return user.role === 'admin'
  }
}

// 規格組合：AND
export class CompositeSpecification<T> extends Specification<T> {
  constructor(
    private spec1: Specification<T>,
    private spec2: Specification<T>,
    private operator: 'AND' | 'OR'
  ) {
    super()
  }

  isSatisfiedBy(obj: T): boolean {
    if (this.operator === 'AND') {
      return this.spec1.isSatisfiedBy(obj) && this.spec2.isSatisfiedBy(obj)
    } else {
      return this.spec1.isSatisfiedBy(obj) || this.spec2.isSatisfiedBy(obj)
    }
  }
}

// 規格組合：NOT
export class NotSpecification<T> extends Specification<T> {
  constructor(private spec: Specification<T>) {
    super()
  }

  isSatisfiedBy(obj: T): boolean {
    return !this.spec.isSatisfiedBy(obj)
  }
}

// 使用：複雜的業務規則
const activeAndVerified = new ActiveUserSpecification()
  .and(new VerifiedEmailSpecification())

const adminOrVerified = new AdminSpecification()
  .or(new VerifiedEmailSpecification())

const inactiveUsers = new ActiveUserSpecification().not()

// 篩選用戶
function filterUsers(users: User[], spec: Specification<User>): User[] {
  return users.filter((user) => spec.isSatisfiedBy(user))
}

const users: User[] = [
  { id: '1', status: 'active', emailVerified: true, role: 'customer' },
  { id: '2', status: 'active', emailVerified: false, role: 'customer' },
  { id: '3', status: 'inactive', emailVerified: true, role: 'admin' },
]

// 查詢活躍且已驗證的用戶
const activeVerified = filterUsers(users, activeAndVerified)
// 結果：[user1]

// 查詢管理員或已驗證的用戶
const adminsOrVerified = filterUsers(users, adminOrVerified)
// 結果：[user1, user3]

// 查詢非活躍用戶
const inactive = filterUsers(users, inactiveUsers)
// 結果：[user3]
```

#### 優勢

✅ 複雜規則清晰
✅ 規則可重用
✅ 規則易於組合

#### 何時使用

- 複雜的業務規則
- 規則經常組合
- 規則需要重用

---

## 架構模式

### 12. Repository Pattern（倉儲模式）

📖 詳見 [DDD_LEARNING_GUIDE.md](./DDD_LEARNING_GUIDE.md#4-repository倉儲)

### 13. Dependency Injection（依賴注入）

📖 詳見 [DDD_LEARNING_GUIDE.md](./DDD_LEARNING_GUIDE.md#2-依賴注入di)

### 14. Domain Events（領域事件）

📖 詳見 [DDD_LEARNING_GUIDE.md](./DDD_LEARNING_GUIDE.md#6-domain-event領域事件)

---

## 模式速查表

| 模式 | 分類 | 用途 | 複雜度 |
|------|------|------|--------|
| **Factory** | 創建 | 複雜對象建立 | ⭐⭐ |
| **Builder** | 創建 | 多參數對象構建 | ⭐⭐ |
| **Singleton** | 創建 | 全局單一實例 | ⭐ |
| **Adapter** | 結構 | 接口適配 | ⭐⭐ |
| **Decorator** | 結構 | 動態添加功能 | ⭐⭐⭐ |
| **Proxy** | 結構 | 訪問控制 | ⭐⭐ |
| **Strategy** | 行為 | 算法選擇 | ⭐⭐ |
| **Observer** | 行為 | 事件監聽 | ⭐⭐ |
| **State** | 行為 | 狀態機 | ⭐⭐⭐ |
| **Command** | 行為 | 可撤銷操作 | ⭐⭐ |
| **Specification** | 行為 | 複雜規則 | ⭐⭐⭐ |
| **Repository** | 架構 | 數據訪問 | ⭐⭐ |
| **DI** | 架構 | 依賴管理 | ⭐⭐ |

---

## 何時使用設計模式

### ✅ 應該使用

- 解決真實問題
- 簡化複雜代碼
- 提高代碼可維護性
- 促進代碼重用

### ❌ 不應該使用

- 過度設計
- 沒有真實需求
- 增加不必要的複雜度
- 為了使用模式而使用

---

## 推薦閱讀

- 📖 **《Design Patterns: Elements of Reusable Object-Oriented Software》** - Gang of Four
- 📖 **《Head First Design Patterns》** - Freeman & Freeman
- 🌐 **Refactoring.guru** - https://refactoring.guru/design-patterns

---

**最後更新**：2026-02-14
**版本**：1.0
**作者**：Gravito Team

相關文檔：
- 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md)
- 🎓 [DDD_LEARNING_GUIDE.md](./DDD_LEARNING_GUIDE.md)
- 📊 [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)
