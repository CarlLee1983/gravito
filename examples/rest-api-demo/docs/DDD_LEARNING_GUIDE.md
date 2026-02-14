# 🏛️ DDD 領域驅動設計完全學習指南

**從零開始理解 Domain-Driven Design，用 REST API Demo 專案作為實踐案例**

---

## 📖 目錄

1. [序章：為什麼選擇 DDD？](#序章)
2. [第一部分：DDD 核心概念](#第一部分)
3. [第二部分：Clean Architecture 四層設計](#第二部分)
4. [第三部分：實踐指南 - 用戶模塊案例](#第三部分)
5. [第四部分：進階設計模式](#第四部分)
6. [第五部分：學習路線圖](#第五部分)

---

## 序章：為什麼選擇 DDD？

### 傳統開發的痛點

```typescript
// ❌ 傳統開發（業務邏輯散落各處）
export class UserService {
  async register(body: any) {
    // 驗證邏輯
    if (!body.email.includes('@')) throw new Error('Invalid email')

    // 業務規則
    const user = { ...body, role: 'customer', createdAt: new Date() }

    // 資料庫操作
    const sql = `INSERT INTO users VALUES (${user.id}, '${user.email}', ...)`
    await db.execute(sql)

    // 發送郵件
    await sendEmail(user.email)

    return user
  }
}
```

### DDD 的解決方案

```typescript
// ✅ DDD 開發（職責分明）
export class RegisterUserUseCase {
  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // 1. 驗證（領域層）
    this.validateInput(request)

    // 2. 檢查業務規則（領域層）
    const existingUser = await this.userRepository.findByEmail(request.email)
    if (existingUser) throw new Error('Email already registered')

    // 3. 建立實體（領域層）
    const user = User.create(request)

    // 4. 持久化（基礎設施層）
    await this.userRepository.create(user)

    // 5. 發送事件（應用層）
    await this.eventManager.dispatch(new UserCreated(user))

    return user
  }
}
```

**DDD 的優勢**：
- 🎯 **業務邏輯集中**：領域層包含所有業務規則
- 🔌 **易於測試**：各層職責清晰，易於單元測試
- 📈 **易於擴展**：新增功能時影響範圍小
- 🤝 **便於溝通**：使用統一的業務語言

---

## 第一部分：DDD 核心概念

### 1. Entity（實體）

#### 定義

實體是具有**唯一身份**的領域對象。兩個實體即使所有屬性相同，如果身份不同，它們也是不同的實體。

#### 特徵

```typescript
// Entity：
// - 有唯一標識符（ID）
// - 生命週期會改變
// - 身份而非屬性定義相等性
export interface User {
  id: string                    // ⭐ 唯一標識
  email: string
  name: string
  password: string              // ⭐ 雜湊值（敏感信息）
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### 實例對比

```typescript
// ❌ 兩個 User 相等？- 否（身份不同）
const user1: User = { id: '1', email: 'user@example.com', ... }
const user2: User = { id: '2', email: 'user@example.com', ... }
console.log(user1.id === user2.id)  // false

// ✅ 同一用戶對比 - 是（身份相同）
const userA = await userRepository.findById('1')
const userB = await userRepository.findById('1')
console.log(userA.id === userB.id)  // true（同一用戶）
```

### 2. Value Object（值對象）

#### 定義

值對象是沒有身份的領域對象。兩個值對象的相等性由其**屬性值**決定。

#### 特徵

```typescript
// Value Object：
// - 無唯一標識符
// - 不可變（Immutable）
// - 屬性值決定相等性

// ✅ Email 是 Value Object
class Email {
  constructor(readonly value: string) {
    if (!this.isValid(value)) throw new Error('Invalid email')
  }

  private isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  equals(other: Email): boolean {
    return this.value === other.value  // 值相等
  }
}

// ✅ Money 是 Value Object
class Money {
  constructor(
    readonly amount: number,
    readonly currency: string
  ) {}

  equals(other: Money): boolean {
    return this.amount === other.amount &&
           this.currency === other.currency
  }

  add(other: Money): Money {
    if (this.currency !== other.currency)
      throw new Error('Cannot add different currencies')
    return new Money(this.amount + other.amount, this.currency)
  }
}
```

#### 使用方式

```typescript
// Value Object 在實體中的應用
interface UserEmail extends Email {
  verificationToken?: string
  verifiedAt?: Date
}

// ✅ Email 值對象強制驗證
const email = new Email('user@example.com')  // 有效
const invalidEmail = new Email('invalid')    // 拋出異常

// ✅ Money 值對象支持運算
const price1 = new Money(10, 'USD')
const price2 = new Money(5, 'USD')
const total = price1.add(price2)  // Money { amount: 15, currency: 'USD' }
```

### 3. Aggregate（聚合根）

#### 定義

聚合根是實體的分組，用於簡化複雜的領域模型。聚合根保證了其內部的一致性。

#### 特徵

```typescript
// Aggregate 結構：
// - 聚合根（Aggregate Root）是實體，有身份
// - 內部實體和值對象由聚合根管理
// - 外部只能通過聚合根訪問內部對象

// ✅ Order（訂單）是聚合根
interface Order {
  id: string                    // ⭐ Aggregate Root
  userId: string
  status: OrderStatus
  items: OrderItem[]            // ⭐ 內部實體（由 Order 管理）
  totalPrice: Money             // ⭐ 值對象
  createdAt: Date
  updatedAt: Date
}

// ✅ OrderItem 是內部實體（不能單獨存在）
interface OrderItem {
  id: string                    // 有 ID 但不是聚合根
  productId: string
  quantity: number
  price: Money                  // 值對象
}

// ❌ 反例：外部直接修改 OrderItem
// 這違反了聚合根的邊界
const order = await orderRepository.findById('order-1')
order.items[0].quantity = 100   // ❌ 破壞聚合根的一致性

// ✅ 正確：通過聚合根修改
const order = await orderRepository.findById('order-1')
await order.updateItemQuantity('item-1', 100)  // ✅ 聚合根負責一致性
await orderRepository.save(order)
```

### 4. Repository（倉儲）

#### 定義

Repository 是資料訪問的抽象，使領域層不依賴具體的資料庫技術。

#### 特徵

```typescript
// ✅ Repository 是領域層的 Contract（介面）
export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(user: User): Promise<User>
  update(user: User): Promise<User>
  delete(id: string): Promise<boolean>
}

// ✅ 實現在基礎設施層（隱藏資料庫細節）
export class DatabaseUserRepository implements UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    )
    return row ? this.toDomain(row) : null
  }

  async create(user: User): Promise<User> {
    const result = await this.db.query(
      'INSERT INTO users (id, email, ...) VALUES (?, ?, ...)',
      [user.id, user.email, ...]
    )
    return user
  }

  // 將資料庫記錄轉換為領域對象
  private toDomain(row: any): User {
    return {
      id: row.id,
      email: row.email,
      // ...
    }
  }
}

// ✅ Repository 可以有多個實現
export class CachedUserRepository implements UserRepository {
  constructor(
    private delegate: UserRepository,
    private cache: Cache
  ) {}

  async findById(id: string): Promise<User | null> {
    const cached = await this.cache.get(`user:${id}`)
    if (cached) return JSON.parse(cached)

    const user = await this.delegate.findById(id)
    if (user) {
      await this.cache.set(`user:${id}`, JSON.stringify(user), 3600)
    }
    return user
  }
}
```

### 5. Domain Service（領域服務）

#### 定義

領域服務封裝不適合放在單個實體或值對象中的業務邏輯。

#### 特徵

```typescript
// ✅ UserDomainService：不變的領域驗證規則
export class UserDomainService {
  // 驗證電子郵件格式（業務規則，不依賴資料庫）
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 驗證密碼強度（業務規則）
  static isStrongPassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    const isLongEnough = password.length >= 8

    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough
  }

  // 檢查用戶狀態（業務規則）
  static isActive(user: User): boolean {
    return user.status === 'active'
  }
}

// ✅ 使用領域服務
if (!UserDomainService.isValidEmail(email)) {
  throw new Error('Invalid email format')
}

if (!UserDomainService.isStrongPassword(password)) {
  throw new Error('Password too weak')
}
```

### 6. Domain Event（領域事件）

#### 定義

領域事件記錄業務領域中發生的重要事件。用於實現業務流程的異步協調。

#### 特徵

```typescript
// ✅ Domain Event：記錄發生的事實
export interface UserCreatedPayload {
  userId: string
  email: string
  name: string
  role: string
  createdAt: Date
}

export class UserCreated extends Event {
  readonly eventName = 'user:created'

  constructor(public readonly payload: UserCreatedPayload) {
    super()
  }
}

// ✅ 在領域模型中發送事件
export class RegisterUserUseCase {
  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // ... 業務邏輯 ...

    // 發送事件（解耦其他業務流程）
    await this.eventManager.dispatch(
      new UserCreated({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })
    )
  }
}

// ✅ 事件監聽器（異步處理業務流程）
eventManager.listen('user:created', async (event: UserCreated) => {
  // 發送歡迎郵件
  await sendWelcomeEmail(event.payload.email)

  // 初始化用戶配置
  await initializeUserSettings(event.payload.userId)

  // 記錄審計日誌
  await auditLog.record('user_registration', event.payload)
})
```

---

## 第二部分：Clean Architecture 四層設計

### 架構概述

```
┌─────────────────────────────────────────────┐
│          Presentation Layer                 │ ← HTTP、路由、控制器
│    (HTTP Controllers, Routes, Middleware)   │
├─────────────────────────────────────────────┤
│          Application Layer                  │ ← Use Cases、業務流程
│    (Use Cases, Application Services)        │
├─────────────────────────────────────────────┤
│          Domain Layer                       │ ← 實體、業務規則、事件
│    (Entities, Value Objects, Services)      │
├─────────────────────────────────────────────┤
│          Infrastructure Layer               │ ← 資料庫、框架、實現
│    (Repositories, Cache, External Services) │
└─────────────────────────────────────────────┘

依賴流向：Presentation → Application → Domain ← Infrastructure
          (單向依賴，不會逆向依賴)
```

### 第 1 層：Domain Layer（領域層）

#### 職責

- ✅ 定義業務規則和實體
- ✅ 無任何框架依賴（Pure Business Logic）
- ✅ 定義領域服務和領域事件
- ✅ 定義 Repository 的介面（不實現）

#### 目錄結構

```
src/domain/
├── user/
│   ├── User.ts                      # 用戶實體和值對象
│   ├── UserDomainService.ts         # 用戶領域服務
│   └── events/
│       ├── UserCreated.ts           # 用戶建立事件
│       └── UserLoggedIn.ts          # 用戶登入事件
├── order/
│   ├── Order.ts                     # 訂單實體
│   ├── OrderItem.ts                 # 訂單項目（內部實體）
│   ├── OrderDomainService.ts
│   └── events/
│       ├── OrderCreated.ts
│       └── OrderStatusChanged.ts
└── product/
    ├── Product.ts                   # 產品實體
    ├── Category.ts                  # 分類（值對象）
    └── events/
        └── ProductUpdated.ts
```

#### 實體設計示例

```typescript
// src/domain/user/User.ts

/**
 * User 實體定義
 * 包含用戶的業務規則和驗證邏輯
 */
export type UserRole = 'admin' | 'customer' | 'guest'
export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface User {
  id: string                        // 聚合根 ID
  email: string
  name: string
  phone?: string
  password: string                  // Bcrypt 雜湊值
  role: UserRole
  status: UserStatus
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * 用戶領域服務
 * 包含不變的業務規則（不依賴資料庫）
 */
export class UserDomainService {
  // 業務規則 1：驗證電子郵件
  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  // 業務規則 2：驗證密碼強度
  static isStrongPassword(password: string): boolean {
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && password.length >= 8
  }

  // 業務規則 3：檢查用戶是否為管理員
  static isAdmin(user: User): boolean {
    return user.role === 'admin'
  }

  // 業務規則 4：檢查用戶是否活躍
  static isActive(user: User): boolean {
    return user.status === 'active'
  }
}
```

### 第 2 層：Application Layer（應用層）

#### 職責

- ✅ 協調領域對象實現 Use Cases
- ✅ 管理事務
- ✅ 依賴注入（Repository、Services、EventManager）
- ✅ 使用領域服務進行驗證

#### Use Case 設計模式

```typescript
// src/application/user/RegisterUser.ts

/**
 * RegisterUser Use Case（應用層）
 *
 * 流程：
 * 1. 驗證輸入（使用領域服務）
 * 2. 檢查業務規則（查詢 Repository）
 * 3. 建立實體
 * 4. 持久化實體（Repository）
 * 5. 發送事件（EventManager）
 * 6. 返回結果
 */

export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,        // 注入 Repository
    private eventManager: EventManager             // 注入事件管理器
  ) {}

  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // ================== 第 1 步：驗證輸入 ==================
    // 使用領域服務驗證（業務規則）
    if (!UserDomainService.isValidEmail(request.email)) {
      throw new Error('Invalid email format')
    }

    if (!UserDomainService.isStrongPassword(request.password)) {
      throw new Error('Password not strong enough')
    }

    if (!request.name || request.name.length < 2) {
      throw new Error('Name too short')
    }

    // ================== 第 2 步：檢查業務規則 ==================
    // 檢查郵箱是否已被註冊
    const existingUser = await this.userRepository.findByEmail(request.email)
    if (existingUser) {
      throw new Error(`Email ${request.email} is already registered`)
    }

    // 檢查電話是否已被註冊（如果提供）
    if (request.phone) {
      const existingPhone = await this.userRepository.findByPhone(request.phone)
      if (existingPhone) {
        throw new Error(`Phone ${request.phone} is already registered`)
      }
    }

    // ================== 第 3 步：建立實體 ==================
    // 雜湊密碼（應用層職責）
    const hashedPassword = await bcrypt.hash(request.password, 10)

    // 準備建立用戶的輸入
    const createUserInput: CreateUserInput = {
      email: request.email,
      name: request.name,
      phone: request.phone,
      password: hashedPassword,
      role: 'customer',                // 默認角色
    }

    // ================== 第 4 步：持久化實體 ==================
    const user = await this.userRepository.create(createUserInput)

    // ================== 第 5 步：發送領域事件 ==================
    // 事件被異步監聽，不阻塞主流程
    await this.eventManager.dispatch(
      new UserCreated({
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      })
    )

    // ================== 第 6 步：返回結果 ==================
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    }
  }
}
```

### 第 3 層：Infrastructure Layer（基礎設施層）

#### 職責

- ✅ 實現 Repository 介面（資料庫訪問）
- ✅ 實現快取、連接池等技術細節
- ✅ 實現事件監聽器
- ✅ 與外部服務整合

#### Repository 實現

```typescript
// src/infrastructure/repositories/UserRepository.ts

/**
 * Repository 介面（定義在 Domain Layer）
 * 領域層只知道這個介面，不知道實現
 */
export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(input: CreateUserInput): Promise<User>
  update(id: string, input: UpdateUserInput): Promise<User | null>
  delete(id: string): Promise<boolean>
}

/**
 * Repository 實現（在 Infrastructure Layer）
 * 隱藏資料庫的具體細節
 */
export class DatabaseUserRepository implements UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    // 使用 ORM 或原生 SQL 查詢
    const row = await this.db.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    )
    return row ? this.mapRowToUser(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    )
    return row ? this.mapRowToUser(row) : null
  }

  async create(input: CreateUserInput): Promise<User> {
    const id = generateUUID()
    const now = new Date()

    await this.db.execute(
      `INSERT INTO users (id, email, name, phone, password, role, status,
        email_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, input.email, input.name, input.phone, input.password,
       input.role || 'customer', 'active', false, now, now]
    )

    return {
      id,
      email: input.email,
      name: input.name,
      phone: input.phone,
      password: input.password,
      role: input.role || 'customer',
      status: 'active',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * 資料庫記錄映射到領域對象
   * 這裡進行資料庫格式到領域格式的轉換
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      phone: row.phone,
      password: row.password,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      emailVerified: row.email_verified,
      verificationToken: row.verification_token,
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }
}
```

#### 事件監聽器實現

```typescript
// src/infrastructure/listeners/SendWelcomeEmailListener.ts

/**
 * 事件監聽器
 * 監聽領域事件，執行異步業務流程
 */
export class SendWelcomeEmailListener {
  constructor(
    private emailService: EmailService,
    private userRepository: UserRepository
  ) {}

  /**
   * 監聽 UserCreated 事件
   * 在用戶建立後發送歡迎郵件
   */
  async handle(event: UserCreated): Promise<void> {
    const { userId, email, name } = event.payload

    // 發送歡迎郵件
    await this.emailService.send({
      to: email,
      subject: 'Welcome to REST API Demo!',
      template: 'welcome',
      variables: {
        name: name,
        loginUrl: 'https://example.com/login',
      },
    })

    // 記錄日誌
    console.log(`Welcome email sent to ${email}`)
  }
}
```

### 第 4 層：Presentation Layer（表現層）

#### 職責

- ✅ HTTP 路由和控制器
- ✅ 輸入驗證（Zod Schema）
- ✅ HTTP 中間件（認證、授權、速率限制）
- ✅ 異常處理
- ✅ HTTP 響應格式

#### 控制器實現

```typescript
// src/presentation/http/controllers/AuthController.ts

/**
 * Auth Controller（表現層）
 * 處理 HTTP 請求，調用 Use Case，返回 HTTP 響應
 */
export class AuthController {
  /**
   * POST /auth/register
   * 用戶註冊
   */
  async register(ctx: GravitoContext) {
    // 1. 解析請求體
    const body = (await ctx.req.json()) as any

    // 2. 取得 Use Case（從 IoC 容器）
    const registerUseCase = resolveService<RegisterUserUseCase>(
      ctx,
      'RegisterUserUseCase'
    )

    try {
      // 3. 驗證輸入（使用 Zod Schema）
      const validation = RegisterRequest.safeValidate(body)
      if (!validation.success) {
        return ctx.json({ success: false, errors: validation.errors }, 422)
      }

      // 4. 執行 Use Case
      const result = await registerUseCase.execute(validation.data!)

      // 5. 返回成功響應
      return ctx.json({ success: true, data: result }, 201)
    } catch (error: any) {
      // 6. 異常處理
      return ctx.json({ success: false, error: error.message }, 400)
    }
  }

  /**
   * POST /auth/login
   * 用戶登入
   */
  async login(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as any

    // 取得 Use Case 和 Token 服務
    const loginUseCase = resolveService<LoginUserUseCase>(
      ctx,
      'LoginUserUseCase'
    )
    const tokenService = resolveService<TokenService>(ctx, 'TokenService')

    try {
      // 驗證輸入
      const validation = LoginRequest.safeValidate(body)
      if (!validation.success) {
        return ctx.json({ success: false, errors: validation.errors }, 422)
      }

      // 執行登入業務邏輯
      const user = await loginUseCase.execute(validation.data!)

      // 生成 Token（應用層職責）
      const accessToken = tokenService.generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      })

      // 返回用戶信息和 Token
      return ctx.json(
        {
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
            tokens: {
              accessToken,
              refreshToken: tokenService.generateRefreshToken({
                userId: user.id,
                email: user.email,
                role: user.role,
              }),
              expiresIn: 3600,
              tokenType: 'Bearer',
            },
          },
        },
        200
      )
    } catch (error: any) {
      return ctx.json(
        { success: false, error: error.message },
        401
      )
    }
  }
}
```

#### 輸入驗證（Zod Schema）

```typescript
// src/presentation/http/requests/auth/RegisterRequest.ts

/**
 * 輸入驗證 Schema（表現層）
 * 在接收 HTTP 請求時進行驗證
 */
export class RegisterRequest {
  static schema = z.object({
    email: z
      .string()
      .email('Invalid email format')
      .min(1, 'Email is required'),

    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name must not exceed 255 characters'),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain uppercase letter')
      .regex(/[a-z]/, 'Password must contain lowercase letter')
      .regex(/\d/, 'Password must contain number')
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Password must contain special character'),

    phone: z
      .string()
      .optional()
      .refine((phone) => !phone || /^\+?[\d\s\-()]{10,}$/.test(phone),
              'Invalid phone format'),
  })

  static validate(data: any) {
    return this.schema.parse(data)
  }

  static safeValidate(data: any) {
    return this.schema.safeParse(data)
  }
}
```

### 層之間的數據流

#### 完整請求流程

```
HTTP Request: POST /auth/register
  ↓
Middleware (Auth, Rate Limit, CSRF)
  ↓
AuthController.register()
  ├─ 解析 Request Body
  ├─ Zod Schema 驗證輸入 ← 表現層
  │
  ├─ 取得 RegisterUserUseCase
  │
  └─ registerUseCase.execute(validatedData)
      ├─ UserDomainService.isValidEmail()      ← 領域層驗證
      ├─ userRepository.findByEmail()           ← 基礎設施層查詢
      ├─ bcrypt.hash(password)                  ← 應用層加密
      ├─ userRepository.create(createInput)     ← 基礎設施層持久化
      ├─ eventManager.dispatch(UserCreated)     ← 發送事件
      │
      └─ return RegisterUserResponse
        ↓
    SendWelcomeEmailListener (異步)
      ├─ emailService.send()                    ← 發送郵件
      └─ auditLog.record()                      ← 記錄日誌
        ↓
  HTTP Response 201 Created
```

---

## 第三部分：實踐指南 - 用戶模塊案例

### 場景：實現用戶註冊和登入

#### Step 1：定義領域層

```typescript
// src/domain/user/User.ts
export interface User {
  id: string
  email: string
  name: string
  password: string           // Bcrypt 雜湊值
  role: 'admin' | 'customer' | 'guest'
  status: 'active' | 'inactive' | 'suspended'
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

export class UserDomainService {
  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  static isStrongPassword(password: string): boolean {
    // 密碼驗證邏輯
    return password.length >= 8
  }

  static isActive(user: User): boolean {
    return user.status === 'active'
  }
}

// src/domain/user/events/UserCreated.ts
export class UserCreated extends Event {
  readonly eventName = 'user:created'
  constructor(public readonly payload: UserCreatedPayload) {
    super()
  }
}
```

#### Step 2：定義 Repository 介面（領域層）

```typescript
// src/infrastructure/repositories/UserRepository.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(input: CreateUserInput): Promise<User>
  update(id: string, input: UpdateUserInput): Promise<User | null>
}
```

#### Step 3：實現 Use Cases（應用層）

```typescript
// src/application/user/RegisterUser.ts
export class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private eventManager: EventManager
  ) {}

  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
    // 驗證輸入
    if (!UserDomainService.isValidEmail(request.email)) {
      throw new Error('Invalid email')
    }

    // 檢查業務規則
    const existing = await this.userRepository.findByEmail(request.email)
    if (existing) {
      throw new Error('Email already registered')
    }

    // 建立用戶
    const user = await this.userRepository.create({
      email: request.email,
      name: request.name,
      password: await bcrypt.hash(request.password, 10),
      role: 'customer',
    })

    // 發送事件
    await this.eventManager.dispatch(new UserCreated({
      userId: user.id,
      email: user.email,
      // ...
    }))

    return { id: user.id, email: user.email, name: user.name }
  }
}

// src/application/user/LoginUser.ts
export class LoginUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private eventManager: EventManager
  ) {}

  async execute(request: LoginUserRequest): Promise<User> {
    // 查找用戶
    const user = await this.userRepository.findByEmail(request.email)
    if (!user) {
      throw new Error('User not found')
    }

    // 檢查用戶狀態
    if (!UserDomainService.isActive(user)) {
      throw new Error('User is not active')
    }

    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(request.password, user.password)
    if (!isPasswordValid) {
      throw new Error('Invalid password')
    }

    // 發送登入事件
    await this.eventManager.dispatch(new UserLoggedIn({
      userId: user.id,
      email: user.email,
      loginAt: new Date(),
    }))

    return user
  }
}
```

#### Step 4：實現 Repository（基礎設施層）

```typescript
// src/infrastructure/repositories/impl/DatabaseUserRepository.ts
export class DatabaseUserRepository implements UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.db.query(
      'SELECT * FROM users WHERE id = ?',
      [id]
    )
    return row ? this.mapToUser(row) : null
  }

  async create(input: CreateUserInput): Promise<User> {
    const id = generateUUID()
    const now = new Date()

    await this.db.execute(
      'INSERT INTO users (...) VALUES (...)',
      [id, input.email, input.name, input.password, ...]
    )

    return {
      id,
      email: input.email,
      name: input.name,
      password: input.password,
      role: 'customer',
      status: 'active',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    }
  }

  private mapToUser(row: any): User {
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
}
```

#### Step 5：建立控制器（表現層）

```typescript
// src/presentation/http/controllers/AuthController.ts
export class AuthController {
  async register(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as any

    // 取得 Use Case
    const registerUseCase = resolveService<RegisterUserUseCase>(
      ctx,
      'RegisterUserUseCase'
    )

    // 驗證輸入
    const validation = RegisterRequest.safeValidate(body)
    if (!validation.success) {
      return ctx.json({ success: false, errors: validation.errors }, 422)
    }

    // 執行 Use Case
    const result = await registerUseCase.execute(validation.data!)

    return ctx.json({ success: true, data: result }, 201)
  }

  async login(ctx: GravitoContext) {
    const body = (await ctx.req.json()) as any
    const loginUseCase = resolveService<LoginUserUseCase>(
      ctx,
      'LoginUserUseCase'
    )

    const validation = LoginRequest.safeValidate(body)
    if (!validation.success) {
      return ctx.json({ success: false, errors: validation.errors }, 422)
    }

    const user = await loginUseCase.execute(validation.data!)
    const tokenService = resolveService<TokenService>(ctx, 'TokenService')

    const accessToken = tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    return ctx.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token: accessToken,
      },
    })
  }
}
```

#### Step 6：綁定 IoC 容器（應用啟動）

```typescript
// src/providers/AuthServiceProvider.ts
export class AuthServiceProvider extends ServiceProvider {
  async register(): Promise<void> {
    // 註冊 Repository
    this.container.bind('UserRepository', () => {
      return new DatabaseUserRepository(this.container.make('Database'))
    })

    // 註冊 Use Cases
    this.container.bind('RegisterUserUseCase', () => {
      return new RegisterUserUseCase(
        this.container.make('UserRepository'),
        this.container.make('EventManager')
      )
    })

    this.container.bind('LoginUserUseCase', () => {
      return new LoginUserUseCase(
        this.container.make('UserRepository'),
        this.container.make('EventManager')
      )
    })
  }

  async boot(): Promise<void> {
    // 註冊事件監聽器
    const eventManager = this.container.make('EventManager')
    const sendEmailListener = new SendWelcomeEmailListener(
      this.container.make('EmailService'),
      this.container.make('UserRepository')
    )

    eventManager.listen('user:created', (event) =>
      sendEmailListener.handle(event)
    )
  }
}
```

---

## 第四部分：進階設計模式

### 1. Specification Pattern（規格模式）

用於複雜的業務規則。

```typescript
// src/domain/user/specifications/UserSpecifications.ts

/**
 * 規格模式：將複雜業務規則封裝為可重用的對象
 */
export abstract class Specification {
  abstract isSatisfiedBy(obj: any): boolean
}

// 規格 1：檢查用戶是否為活躍且已驗證
export class ActiveAndVerifiedUserSpecification extends Specification {
  isSatisfiedBy(user: User): boolean {
    return user.status === 'active' && user.emailVerified
  }
}

// 規格 2：檢查用戶是否為管理員
export class AdminUserSpecification extends Specification {
  isSatisfiedBy(user: User): boolean {
    return user.role === 'admin'
  }
}

// 規格組合（AND）
export class AndSpecification extends Specification {
  constructor(
    private spec1: Specification,
    private spec2: Specification
  ) {
    super()
  }

  isSatisfiedBy(obj: any): boolean {
    return this.spec1.isSatisfiedBy(obj) && this.spec2.isSatisfiedBy(obj)
  }
}

// 使用
const activeAndVerified = new ActiveAndVerifiedUserSpecification()
const adminUser = new AdminUserSpecification()
const adminAndVerified = new AndSpecification(adminUser, activeAndVerified)

if (adminAndVerified.isSatisfiedBy(user)) {
  // 執行管理員操作
}
```

### 2. Strategy Pattern（策略模式）

用於不同的實現策略。

```typescript
// src/infrastructure/repositories/strategies/UserSearchStrategy.ts

/**
 * 策略模式：支持不同的搜索策略
 */
export interface UserSearchStrategy {
  search(query: string, limit: number): Promise<User[]>
}

// 策略 1：資料庫搜索
export class DatabaseSearchStrategy implements UserSearchStrategy {
  constructor(private db: Database) {}

  async search(query: string, limit: number): Promise<User[]> {
    const rows = await this.db.query(
      'SELECT * FROM users WHERE email LIKE ? OR name LIKE ? LIMIT ?',
      [`%${query}%`, `%${query}%`, limit]
    )
    return rows.map((row) => this.mapToUser(row))
  }
}

// 策略 2：Elasticsearch 搜索
export class ElasticsearchSearchStrategy implements UserSearchStrategy {
  constructor(private es: ElasticsearchClient) {}

  async search(query: string, limit: number): Promise<User[]> {
    const results = await this.es.search({
      index: 'users',
      body: { query: { match: { email: query } }, size: limit },
    })

    return results.hits.hits.map((hit) => hit._source as User)
  }
}

// 使用
export class SearchUserUseCase {
  constructor(private strategy: UserSearchStrategy) {}

  async search(query: string): Promise<User[]> {
    return this.strategy.search(query, 20)
  }
}

// 在容器中選擇策略
if (isProduction) {
  container.bind('UserSearchStrategy', () => new ElasticsearchSearchStrategy(es))
} else {
  container.bind('UserSearchStrategy', () => new DatabaseSearchStrategy(db))
}
```

### 3. Factory Pattern（工廠模式）

用於複雜對象的建立。

```typescript
// src/application/factories/UserFactory.ts

/**
 * 工廠模式：封裝複雜的對象建立邏輯
 */
export class UserFactory {
  /**
   * 建立普通客戶用戶
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
   * 從資料庫記錄重建用戶
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

---

## 第五部分：學習路線圖

### 學習階段

#### 🟢 第 1 週：基礎概念

- [ ] 理解 DDD 的核心概念（Entity、Value Object、Aggregate）
- [ ] 理解 Clean Architecture 四層設計
- [ ] 讀懂 Domain Layer 的代碼
  - [ ] 學習 `src/domain/user/User.ts`
  - [ ] 學習 `src/domain/user/UserDomainService.ts`
  - [ ] 學習領域事件設計

**練習**：
```typescript
// 練習 1：擴展 UserDomainService
// 添加新的驗證方法：isValidUsername()

// 練習 2：創建新的領域事件
// 創建 PasswordReset 事件類
```

#### 🟡 第 2 週：應用層

- [ ] 理解 Use Case 的設計
- [ ] 理解依賴注入的重要性
- [ ] 讀懂 Application Layer 的代碼
  - [ ] 學習 `src/application/user/RegisterUser.ts`
  - [ ] 學習 `src/application/user/LoginUser.ts`
  - [ ] 理解 Use Case 的六個步驟

**練習**：
```typescript
// 練習 1：實現新的 Use Case
// 實現 UpdateUserProfileUseCase

// 練習 2：添加業務規則
// 在 RegisterUser 中添加密碼重複檢查
```

#### 🟠 第 3 週：基礎設施層

- [ ] 理解 Repository 模式
- [ ] 理解事件監聽器的作用
- [ ] 讀懂 Infrastructure Layer 的代碼
  - [ ] 學習 `src/infrastructure/repositories/UserRepository.ts`
  - [ ] 學習 `src/infrastructure/listeners/SendWelcomeEmailListener.ts`
  - [ ] 理解資料庫映射邏輯

**練習**：
```typescript
// 練習 1：實現缓存 Repository
// 實現 CachedUserRepository

// 練習 2：實現新的事件監聽器
// 實現 LogUserCreationListener
```

#### 🔴 第 4 週：表現層 + 整合

- [ ] 理解 HTTP 控制器的設計
- [ ] 理解輸入驗證的重要性
- [ ] 讀懂 Presentation Layer 的代碼
  - [ ] 學習 `src/presentation/http/controllers/AuthController.ts`
  - [ ] 學習 Zod Schema 驗證
  - [ ] 理解異常處理流程

**練習**：
```typescript
// 練習 1：實現新的控制器端點
// 實現 DELETE /users/:id 端點

// 練習 2：端到端測試
// 測試完整的用戶註冊流程
```

### 實踐項目

#### 項目 1：實現產品模塊

完整實現一個新的領域模塊（Product）：

1. 定義 Product 實體
2. 實現 ProductRepository
3. 實現 Create/Update/Delete Use Cases
4. 實現 ProductController
5. 編寫測試

#### 項目 2：實現訂單模塊

實現更複雜的聚合根（Order）：

1. 定義 Order 和 OrderItem 實體
2. 實現訂單業務規則
3. 實現訂單建立的完整流程
4. 實現事件驅動的庫存更新

#### 項目 3：性能優化

應用進階模式進行性能優化：

1. 實現分層快取
2. 實現 Specification Pattern 進行複雜查詢
3. 實現 Strategy Pattern 進行不同的搜索策略
4. 添加性能監控

### 檢查清單

使用此清單檢查你的理解程度：

#### Domain Layer 理解

- [ ] 能解釋 Entity 和 Value Object 的區別
- [ ] 能設計複雜的聚合根
- [ ] 能實現領域服務
- [ ] 能設計領域事件
- [ ] 能編寫領域層單元測試（不依賴外部）

#### Application Layer 理解

- [ ] 能設計 Use Case
- [ ] 能正確使用依賴注入
- [ ] 能協調 Repository、Service、EventManager
- [ ] 能處理事務
- [ ] 能編寫應用層測試

#### Infrastructure Layer 理解

- [ ] 能實現 Repository
- [ ] 能實現事件監聽器
- [ ] 能進行資料庫映射
- [ ] 能實現快取策略
- [ ] 能實現連接池管理

#### Presentation Layer 理解

- [ ] 能設計控制器
- [ ] 能實現輸入驗證
- [ ] 能實現異常處理
- [ ] 能設計 HTTP 響應格式
- [ ] 能編寫 E2E 測試

### 常見模式速查表

| 模式 | 用途 | 示例 |
|------|------|------|
| **Repository** | 資料訪問抽象 | UserRepository |
| **Use Case** | 應用業務流程 | RegisterUserUseCase |
| **Domain Service** | 不變的業務規則 | UserDomainService |
| **Domain Event** | 記錄業務事實 | UserCreated |
| **Event Listener** | 非同步業務流程 | SendWelcomeEmailListener |
| **Factory** | 複雜對象建立 | UserFactory |
| **Specification** | 複雜業務規則 | ActiveUserSpecification |
| **Strategy** | 不同實現策略 | ElasticsearchSearchStrategy |

---

## 🎓 深度學習資源

### 推薦閱讀

1. **《Domain-Driven Design: Tackling Complexity in the Heart of Software》** - Eric Evans
   - DDD 聖經，深入理解核心概念

2. **《Implementing Domain-Driven Design》** - Vaughn Vernon
   - 實踐指南，展示如何在真實項目中應用 DDD

3. **《Clean Architecture: A Craftsman's Guide to Software Structure and Design》** - Robert C. Martin
   - Clean Architecture 的完整指南

### 項目中的參考代碼

```
✅ 核心概念示例
├── src/domain/user/User.ts                    # Entity 設計
├── src/domain/user/UserDomainService.ts       # Domain Service
├── src/domain/user/events/UserCreated.ts      # Domain Event
├── src/infrastructure/repositories/          # Repository 實現
└── src/application/user/RegisterUser.ts       # Use Case

✅ 進階模式
├── src/domain/specifications/                 # Specification Pattern
├── src/infrastructure/repositories/strategies/ # Strategy Pattern
├── src/application/factories/                 # Factory Pattern
└── src/infrastructure/listeners/              # Event Listener
```

### 推薦練習

1. **閱讀並理解每一層的代碼**
   - 不要跳過任何細節
   - 理解每個決策的原因

2. **逐步實現新的功能**
   - 從 Domain Layer 開始
   - 然後 Application Layer
   - 再到 Infrastructure Layer
   - 最後 Presentation Layer

3. **編寫測試**
   - 先寫單元測試
   - 再寫集成測試
   - 最後寫 E2E 測試

4. **重構現有代碼**
   - 嘗試應用新學到的模式
   - 改進代碼結構
   - 提高代碼質量

---

## 📝 常見問題

### Q1：Domain Layer 中是否應該有資料庫依賴？

**A**：絕對不應該。Domain Layer 應該是純粹的業務邏輯，不依賴任何框架或技術實現。

```typescript
// ❌ 錯誤：Domain Layer 不應該有資料庫依賴
export class User {
  async save() {
    await db.query('INSERT INTO users ...')
  }
}

// ✅ 正確：Domain Layer 只包含業務邏輯
export interface User {
  id: string
  email: string
  // ...
}

export class UserDomainService {
  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}
```

### Q2：Use Case 應該如何處理多個 Repository？

**A**：通過構造函數注入，讓依賴關係清晰。

```typescript
// ✅ 正確的設計
export class CreateOrderUseCase {
  constructor(
    private orderRepository: OrderRepository,
    private productRepository: ProductRepository,
    private paymentRepository: PaymentRepository,
    private eventManager: EventManager
  ) {}

  async execute(request: CreateOrderRequest): Promise<Order> {
    // ... 使用多個 Repository
  }
}
```

### Q3：如何測試包含資料庫操作的 Repository？

**A**：使用 Mock 或測試資料庫。

```typescript
// 使用 Mock
const mockDatabase = {
  query: vi.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
}
const repository = new DatabaseUserRepository(mockDatabase)

// 或使用測試資料庫
const testDb = await setupTestDatabase()
const repository = new DatabaseUserRepository(testDb)
```

---

## 🎯 總結

### 核心要點

1. **Domain Layer**：純粹業務邏輯，無任何技術依賴
2. **Application Layer**：協調領域對象，實現 Use Cases
3. **Infrastructure Layer**：技術實現細節，實現介面
4. **Presentation Layer**：HTTP 端點和輸入驗證

### 設計原則

- ✅ 單一職責：每層只負責一項職責
- ✅ 依賴反轉：高層模塊不依賴低層模塊
- ✅ 開閉原則：對擴展開放，對修改關閉
- ✅ 介面隔離：依賴具體的介面，不是實現

### 下一步

1. 完整閱讀本項目的源代碼
2. 實現你自己的新功能
3. 學習更多的設計模式
4. 參與實際項目實踐

---

**祝你學習愉快！** 🚀

如有任何問題，歡迎查閱本項目的其他文檔或提交 Issue。
