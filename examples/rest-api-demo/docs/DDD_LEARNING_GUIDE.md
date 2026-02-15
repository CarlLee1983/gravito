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
7. [深度學習資源](#深度學習資源)

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

本部分介紹 DDD 的六大核心構建塊。為了深入理解每個概念，我們將其拆分為獨立的文檔，請點擊連結閱讀更多細節。

### 1. [Entity（實體）](./concepts/ENTITY.md)

**定義**：具有唯一身份的領域對象。即使屬性相同，只要 ID 不同就是不同的實體。

*   **關鍵特徵**：唯一 ID、生命週期可變 (Mutable)。
*   **範例**：`User`, `Order`。
*   **[👉 深入閱讀：ID 生成策略與驗證時機](./concepts/ENTITY.md)**

### 2. [Value Object（值對象）](./concepts/VALUE_OBJECT.md)

**定義**：沒有身份的領域對象，其相等性由屬性值決定。

*   **關鍵特徵**：無 ID、不可變 (Immutable)、副作用封裝。
*   **範例**：`Email`, `Address`, `Money`。
*   **[👉 深入閱讀：如何實現不可變性與複合值對象](./concepts/VALUE_OBJECT.md)**

### 3. [Aggregate（聚合根）](./concepts/AGGREGATE.md)

**定義**：一組相關聯對象的集合，作為數據修改的單元。聚合根負責維護內部的一致性。

*   **關鍵特徵**：交易邊界、一致性保證。
*   **範例**：`Order` (Root) 包含 `OrderItem`。
*   **[👉 深入閱讀：聚合根參照規則與並發控制](./concepts/AGGREGATE.md)**

### 4. [Repository（倉儲）](./concepts/REPOSITORY.md)

**定義**：領域層與數據持久化層之間的抽象介面。

*   **關鍵特徵**：隱藏資料庫細節、模擬集合操作。
*   **範例**：`UserRepository`。
*   **[👉 深入閱讀：Collection vs Persistence 模式](./concepts/REPOSITORY.md)**

### 5. [Domain Service（領域服務）](./concepts/DOMAIN_SERVICE.md)

**定義**：封裝不屬於單一實體的業務邏輯的無狀態服務。

*   **關鍵特徵**：無狀態、協調多個領域對象。
*   **範例**：`UserDomainService` (驗證複雜規則)。
*   **[👉 深入閱讀：與應用服務的區別](./concepts/DOMAIN_SERVICE.md)**

### 6. [Domain Event（領域事件）](./concepts/DOMAIN_EVENT.md)

**定義**：描述領域中發生的重要事實，用於觸發副作用或通知其他系統。

*   **關鍵特徵**：不可變、過去式命名、最終一致性。
*   **範例**：`UserCreated`, `OrderShipped`。
*   **[👉 深入閱讀：最終一致性與事件結構](./concepts/DOMAIN_EVENT.md)**

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

    // ================== 第 2 步：檢查業務規則 ==================
    // 檢查郵箱是否已被註冊
    const existingUser = await this.userRepository.findByEmail(request.email)
    if (existingUser) {
      throw new Error(`Email ${request.email} is already registered`)
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

### 第 4 層：Presentation Layer（表現層）

#### 職責

- ✅ HTTP 路由和控制器
- ✅ 輸入驗證（Zod Schema）
- ✅ HTTP 中間件（認證、授權、速率限制）
- ✅ 異常處理
- ✅ HTTP 響應格式

#### 層之間的數據流

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
  
  // ... 其他方法
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
}
```

---

## 第四部分：進階設計模式

### 1. Specification Pattern（規格模式）

用於複雜的業務規則。

### 2. Strategy Pattern（策略模式）

用於不同的實現策略。

### 3. Factory Pattern（工廠模式）

用於複雜對象的建立。

---

## 第五部分：學習路線圖

### 學習階段

#### 🟢 第 1 週：基礎概念
- [ ] 理解 DDD 的核心概念（Entity、Value Object、Aggregate）
- [ ] 理解 Clean Architecture 四層設計

#### 🟡 第 2 週：應用層
- [ ] 理解 Use Case 的設計
- [ ] 理解依賴注入的重要性

#### 🟠 第 3 週：基礎設施層
- [ ] 理解 Repository 模式
- [ ] 理解事件監聽器的作用

#### 🔴 第 4 週：表現層 + 整合
- [ ] 理解 HTTP 控制器的設計
- [ ] 理解輸入驗證的重要性

---

## 🎓 深度學習資源

### 推薦閱讀

1. **《Domain-Driven Design: Tackling Complexity in the Heart of Software》** - Eric Evans
   - DDD 聖經，深入理解核心概念

2. **《Implementing Domain-Driven Design》** - Vaughn Vernon
   - 實踐指南，展示如何在真實項目中應用 DDD

3. **《Clean Architecture: A Craftsman's Guide to Software Structure and Design》** - Robert C. Martin
   - Clean Architecture 的完整指南
