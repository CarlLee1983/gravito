# 測試最佳實踐與模式

此文檔提供 Gravito monorepo 中常見的測試模式與最佳實踐，使用 **Bun Test** 框架。

## 目錄

1. [測試設定與執行](#測試設定與執行)
2. [單元測試](#單元測試)
3. [服務與 Repository 測試](#服務與-repository-測試)
4. [控制器與中間件測試](#控制器與中間件測試)
5. [事件系統測試](#事件系統測試)
6. [跨模組整合測試](#跨模組整合測試)
7. [覆蓋率與質量指標](#覆蓋率與質量指標)

---

## 測試設定與執行

### 基本命令

```bash
# 執行所有測試
bun test

# 執行特定檔案
bun test src/utils.test.ts

# 運行含覆蓋率報告
bun test --coverage

# 設定覆蓋率門檻（例如 75%）
bun test --coverage --coverage-threshold=75

# Watch 模式（檔案變更時自動執行）
bun test --watch

# 詳細輸出
bun test --verbose
```

### 單一包的測試

```bash
# 進入特定包目錄
cd packages/core

# 執行此包的所有測試
bun test

# 執行特定測試
bun test tests/logger.test.ts
```

### Bun 測試框架基礎

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test'

describe('MyComponent', () => {
  let instance: MyComponent

  beforeEach(() => {
    // 每個測試前執行
    instance = new MyComponent()
  })

  afterEach(() => {
    // 每個測試後執行
    instance = null
  })

  it('should do something', () => {
    expect(instance.getValue()).toBe(42)
  })

  it.skip('should skip this test', () => {
    // 此測試將被跳過
  })

  it.todo('should implement this later', () => {
    // 標記為待實作
  })
})
```

---

## 單元測試

### 場景：測試工具函數

```typescript
// src/utils/stringHelper.ts
export function capitalizeFirstLetter(str: string): string {
  if (str.length === 0) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
}
```

```typescript
// tests/stringHelper.test.ts
import { describe, it, expect } from 'bun:test'
import { capitalizeFirstLetter, slugify } from '../src/utils/stringHelper'

describe('String Helpers', () => {
  describe('capitalizeFirstLetter', () => {
    it('should capitalize the first letter', () => {
      expect(capitalizeFirstLetter('hello')).toBe('Hello')
    })

    it('should handle empty strings', () => {
      expect(capitalizeFirstLetter('')).toBe('')
    })

    it('should handle already capitalized strings', () => {
      expect(capitalizeFirstLetter('Hello')).toBe('Hello')
    })

    it('should handle single character', () => {
      expect(capitalizeFirstLetter('a')).toBe('A')
    })
  })

  describe('slugify', () => {
    it('should convert to lowercase and replace spaces with hyphens', () => {
      expect(slugify('Hello World')).toBe('hello-world')
    })

    it('should remove special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world')
    })

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world')
    })

    it('should trim leading/trailing spaces', () => {
      expect(slugify('  hello world  ')).toBe('hello-world')
    })
  })
})
```

### 場景：測試日期處理

```typescript
// src/utils/dateHelper.ts
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export function getDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}
```

```typescript
// tests/dateHelper.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { isToday, getDaysAgo } from '../src/utils/dateHelper'

describe('Date Helpers', () => {
  let originalDate: Date

  beforeEach(() => {
    originalDate = new Date()
  })

  describe('isToday', () => {
    it('should return true for today', () => {
      expect(isToday(new Date())).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })

    it('should return false for future dates', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isToday(tomorrow)).toBe(false)
    })
  })

  describe('getDaysAgo', () => {
    it('should return date from 7 days ago', () => {
      const sevenDaysAgo = getDaysAgo(7)
      const expected = new Date()
      expected.setDate(expected.getDate() - 7)

      expect(sevenDaysAgo.getDate()).toBe(expected.getDate())
      expect(sevenDaysAgo.getMonth()).toBe(expected.getMonth())
    })

    it('should return today for 0 days ago', () => {
      const today = getDaysAgo(0)
      expect(isToday(today)).toBe(true)
    })
  })
})
```

---

## 服務與 Repository 測試

### 場景：測試 UserService

```typescript
// src/Services/UserService.ts
import type { IUserRepository } from '../Contracts/IUserRepository'

export interface User {
  id: string
  name: string
  email: string
}

export class UserService {
  constructor(private repository: IUserRepository) {}

  async getUser(id: string): Promise<User | null> {
    return this.repository.findById(id)
  }

  async createUser(name: string, email: string): Promise<User> {
    // 驗證
    if (!email.includes('@')) {
      throw new Error('Invalid email')
    }

    const existingUser = await this.repository.findByEmail(email)
    if (existingUser) {
      throw new Error('Email already exists')
    }

    return this.repository.create({ name, email })
  }

  async updateUser(id: string, name: string): Promise<User> {
    const user = await this.repository.findById(id)
    if (!user) {
      throw new Error('User not found')
    }

    return this.repository.update(id, { name })
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.repository.findById(id)
    if (!user) {
      throw new Error('User not found')
    }

    await this.repository.delete(id)
  }
}
```

```typescript
// tests/UserService.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { UserService, type User } from '../src/Services/UserService'
import type { IUserRepository } from '../src/Contracts/IUserRepository'

// Mock Repository
class MockUserRepository implements IUserRepository {
  private users = new Map<string, User>()
  private nextId = 1

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user
      }
    }
    return null
  }

  async create(data: Omit<User, 'id'>): Promise<User> {
    const user: User = {
      id: String(this.nextId++),
      ...data,
    }
    this.users.set(user.id, user)
    return user
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = this.users.get(id)
    if (!user) {
      throw new Error('Not found')
    }
    const updated = { ...user, ...data }
    this.users.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    this.users.delete(id)
  }

  // 測試輔助方法
  getAllUsers(): User[] {
    return Array.from(this.users.values())
  }

  clear(): void {
    this.users.clear()
  }
}

describe('UserService', () => {
  let service: UserService
  let repository: MockUserRepository

  beforeEach(() => {
    repository = new MockUserRepository()
    service = new UserService(repository)
  })

  describe('getUser', () => {
    it('should return user by id', async () => {
      const user = await service.createUser('John', 'john@example.com')
      const retrieved = await service.getUser(user.id)

      expect(retrieved).toBeTruthy()
      expect(retrieved?.email).toBe('john@example.com')
    })

    it('should return null if user does not exist', async () => {
      const user = await service.getUser('non-existent')
      expect(user).toBeNull()
    })
  })

  describe('createUser', () => {
    it('should create a new user', async () => {
      const user = await service.createUser('Alice', 'alice@example.com')

      expect(user.id).toBeTruthy()
      expect(user.name).toBe('Alice')
      expect(user.email).toBe('alice@example.com')
    })

    it('should reject invalid email', async () => {
      try {
        await service.createUser('Bob', 'invalid-email')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect(String(error)).toContain('Invalid email')
      }
    })

    it('should reject duplicate email', async () => {
      await service.createUser('Alice', 'alice@example.com')

      try {
        await service.createUser('Alice2', 'alice@example.com')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect(String(error)).toContain('already exists')
      }
    })
  })

  describe('updateUser', () => {
    it('should update user name', async () => {
      const user = await service.createUser('John', 'john@example.com')
      const updated = await service.updateUser(user.id, 'John Updated')

      expect(updated.name).toBe('John Updated')
      expect(updated.email).toBe('john@example.com')
    })

    it('should throw if user not found', async () => {
      try {
        await service.updateUser('non-existent', 'New Name')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect(String(error)).toContain('not found')
      }
    })
  })

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const user = await service.createUser('Alice', 'alice@example.com')
      await service.deleteUser(user.id)

      const retrieved = await service.getUser(user.id)
      expect(retrieved).toBeNull()
    })

    it('should throw if user not found', async () => {
      try {
        await service.deleteUser('non-existent')
        expect.unreachable('Should have thrown')
      } catch (error) {
        expect(String(error)).toContain('not found')
      }
    })
  })
})
```

---

## 控制器與中間件測試

### 場景：測試 HTTP 控制器

```typescript
// src/Controllers/UserController.ts
import type { GravitoContext } from '@gravito/core'
import type { UserService } from '../Services/UserService'

export class UserController {
  constructor(private userService: UserService) {}

  async show(ctx: GravitoContext): Promise<void> {
    const { id } = ctx.req.param()

    const user = await this.userService.getUser(id)
    if (!user) {
      ctx.status(404)
      ctx.json({ success: false, error: 'User not found' })
      return
    }

    ctx.json({ success: true, data: user })
  }

  async store(ctx: GravitoContext): Promise<void> {
    const body = await ctx.req.json()
    const { name, email } = body

    if (!name || !email) {
      ctx.status(400)
      ctx.json({ success: false, error: 'Name and email are required' })
      return
    }

    try {
      const user = await this.userService.createUser(name, email)
      ctx.status(201)
      ctx.json({ success: true, data: user })
    } catch (error) {
      ctx.status(400)
      ctx.json({ success: false, error: String(error) })
    }
  }
}
```

```typescript
// tests/UserController.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { UserController } from '../src/Controllers/UserController'
import type { UserService } from '../src/Services/UserService'

// Mock Context
class MockContext {
  private responseStatus = 200
  private responseBody: any = null

  status(code: number) {
    this.responseStatus = code
    return this
  }

  json(data: any) {
    this.responseBody = data
    return this
  }

  req = {
    param: () => ({ id: '1' }),
    json: async () => ({ name: 'John', email: 'john@example.com' }),
  }

  getResponseStatus() {
    return this.responseStatus
  }

  getResponseBody() {
    return this.responseBody
  }
}

// Mock Service
class MockUserService implements Partial<UserService> {
  async getUser(id: string): Promise<any> {
    if (id === '1') {
      return { id: '1', name: 'John', email: 'john@example.com' }
    }
    return null
  }

  async createUser(name: string, email: string): Promise<any> {
    if (email === 'duplicate@example.com') {
      throw new Error('Email already exists')
    }
    return { id: '2', name, email }
  }
}

describe('UserController', () => {
  let controller: UserController
  let service: MockUserService
  let context: MockContext

  beforeEach(() => {
    service = new MockUserService()
    controller = new UserController(service as any)
    context = new MockContext()
  })

  describe('show', () => {
    it('should return user if found', async () => {
      await controller.show(context as any)

      expect(context.getResponseStatus()).toBe(200)
      const body = context.getResponseBody()
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('John')
    })

    it('should return 404 if user not found', async () => {
      context.req.param = () => ({ id: 'non-existent' })

      await controller.show(context as any)

      expect(context.getResponseStatus()).toBe(404)
      const body = context.getResponseBody()
      expect(body.success).toBe(false)
      expect(body.error).toContain('not found')
    })
  })

  describe('store', () => {
    it('should create user and return 201', async () => {
      context.req.json = async () => ({ name: 'Alice', email: 'alice@example.com' })

      await controller.store(context as any)

      expect(context.getResponseStatus()).toBe(201)
      const body = context.getResponseBody()
      expect(body.success).toBe(true)
      expect(body.data.name).toBe('Alice')
    })

    it('should return 400 if missing fields', async () => {
      context.req.json = async () => ({ name: 'Bob' })

      await controller.store(context as any)

      expect(context.getResponseStatus()).toBe(400)
      expect(context.getResponseBody().success).toBe(false)
    })

    it('should handle service errors', async () => {
      context.req.json = async () => ({
        name: 'Charlie',
        email: 'duplicate@example.com',
      })

      await controller.store(context as any)

      expect(context.getResponseStatus()).toBe(400)
      expect(context.getResponseBody().error).toContain('already exists')
    })
  })
})
```

---

## 事件系統測試

### 場景：測試事件發布/訂閱

```typescript
// src/Events/UserCreated.ts
import { Event } from '@gravito/core'

export class UserCreated extends Event {
  constructor(
    public userId: string,
    public email: string
  ) {
    super()
  }
}
```

```typescript
// src/Listeners/SendWelcomeEmail.ts
import { Listener } from '@gravito/core'
import type { UserCreated } from '../Events/UserCreated'

export class SendWelcomeEmail implements Listener<UserCreated> {
  public sentTo: string[] = []

  async handle(event: UserCreated): Promise<void> {
    // 記錄已發送（用於測試）
    this.sentTo.push(event.email)
  }
}
```

```typescript
// tests/Events.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { EventManager } from '@gravito/core'
import { UserCreated } from '../src/Events/UserCreated'
import { SendWelcomeEmail } from '../src/Listeners/SendWelcomeEmail'

describe('Event System', () => {
  let eventManager: EventManager
  let emailListener: SendWelcomeEmail

  beforeEach(() => {
    // 簡化版本（實際應使用完整的 PlanetCore）
    emailListener = new SendWelcomeEmail()
  })

  it('should dispatch event to listeners', async () => {
    const event = new UserCreated('user-123', 'john@example.com')

    await emailListener.handle(event)

    expect(emailListener.sentTo).toContain('john@example.com')
  })

  it('should handle multiple events', async () => {
    const event1 = new UserCreated('user-1', 'alice@example.com')
    const event2 = new UserCreated('user-2', 'bob@example.com')

    await emailListener.handle(event1)
    await emailListener.handle(event2)

    expect(emailListener.sentTo.length).toBe(2)
    expect(emailListener.sentTo).toContain('alice@example.com')
    expect(emailListener.sentTo).toContain('bob@example.com')
  })
})
```

---

## 跨模組整合測試

### 場景：測試 Satellite 整合

```typescript
// tests/integration/CatalogIntegration.test.ts
import { describe, it, expect, beforeEach } from 'bun:test'
import { Application } from '@gravito/core'
import { CatalogServiceProvider } from '@gravito/satellite-catalog'
import type { ProductRepository } from '../src/Repositories/ProductRepository'

describe('Catalog Integration', () => {
  let app: Application
  let productRepo: ProductRepository

  beforeEach(async () => {
    // 建立測試應用
    app = new Application({
      basePath: process.cwd(),
      env: 'testing',
      providers: [CatalogServiceProvider],
      autoDiscoverProviders: false,
    })

    await app.boot()

    // 取得已註冊的 repository
    productRepo = app.core.container.make('catalog.repository.product')
  })

  it('should register catalog services', async () => {
    const controller = app.core.container.make('catalog.controller.adminProduct')
    expect(controller).toBeTruthy()
  })

  it('should allow creating products', async () => {
    const product = await productRepo.create({
      name: 'Test Product',
      sku: 'TEST-001',
      price: 99.99,
      stock: 10,
    })

    expect(product.id).toBeTruthy()
    expect(product.name).toBe('Test Product')
  })

  it('should listen to payment refunds', async () => {
    // 模擬支付退款事件
    const refundEvent = {
      paymentId: 'PAY-123',
      orderId: 'ORD-456',
      items: [{ variantId: 'VAR-1', quantity: 2 }],
    }

    // 測試事件監聽器是否已註冊
    const listeners = app.core.events.listeners
    expect(listeners.size).toBeGreaterThan(0)
  })
})
```

---

## 覆蓋率與質量指標

### 達成 80%+ 覆蓋率的策略

#### 1. 確保三種測試類型齊全

```
單元測試（40%）+ 整合測試（35%）+ 端點測試（25%）= 80%+
```

#### 2. 避免覆蓋"瑣碎"代碼

❌ **不需要測試**：
- Getter/Setter（除非有邏輯）
- 簡單的資料容器
- 框架自動生成的代碼

✅ **需要測試**：
- 業務邏輯
- 錯誤處理
- 邊界情況

#### 3. 使用覆蓋率報告

```bash
# 生成詳細覆蓋率報告
bun test --coverage --coverage-threshold=75

# 查看未覆蓋的行
# 報告會顯示檔案中哪些行沒有測試覆蓋
```

### 覆蓋率目標

| 類型 | 目標 | 備註 |
|------|------|------|
| **Core** | 80%+ | 微核心需要高可靠性 |
| **Services** | 75%+ | 業務邏輯需要充分測試 |
| **Controllers** | 70%+ | 路由與請求處理 |
| **Utils** | 90%+ | 工具函數應有完整測試 |
| **Satellites** | 75%+ | 領域邏輯與整合 |

### 檢查覆蓋率

```bash
# 在 CI 中強制執行覆蓋率
bun run test:ci

# 本地驗證
bun test --coverage --coverage-threshold=75
```

---

## 常見測試模式

### Pattern 1：Arrange-Act-Assert (AAA)

```typescript
it('should process order correctly', async () => {
  // Arrange：準備測試資料
  const order = new Order({ items: [{ id: 1, qty: 2 }] })
  const service = new OrderService()

  // Act：執行操作
  const result = await service.processOrder(order)

  // Assert：驗證結果
  expect(result.status).toBe('processed')
  expect(result.total).toBeGreaterThan(0)
})
```

### Pattern 2：測試前置/後置

```typescript
describe('Database Operations', () => {
  beforeEach(async () => {
    // 每個測試前連接資料庫
    await db.connect()
  })

  afterEach(async () => {
    // 每個測試後清理
    await db.clear()
    await db.disconnect()
  })

  it('should save and retrieve data', async () => {
    // 測試邏輯...
  })
})
```

### Pattern 3：參數化測試

```typescript
describe('Email Validation', () => {
  const cases = [
    { email: 'valid@example.com', expected: true },
    { email: 'invalid-email', expected: false },
    { email: 'test@domain.co.uk', expected: true },
  ]

  cases.forEach(({ email, expected }) => {
    it(`should validate "${email}" as ${expected}`, () => {
      expect(validateEmail(email)).toBe(expected)
    })
  })
})
```

---

## 測試清單

在提交代碼前，確保：

- [ ] 所有新功能都有對應的測試
- [ ] 所有邊界情況都被測試（空值、null、大數字等）
- [ ] 錯誤情況有測試（異常、驗證失敗等）
- [ ] 運行 `bun run test:coverage` 確認覆蓋率達 75%+
- [ ] 沒有已跳過的測試（.skip 或 .todo）
- [ ] 所有測試都通過，沒有 flaky 測試
- [ ] 測試名稱清晰且可自文檔化

---

## 故障排查

### 測試超時

```typescript
it('should complete in time', async () => {
  // 設定 timeout (ms)
  // bun test 預設為 10 分鐘
}, { timeout: 30000 }) // 30 秒
```

### Mock 不工作

確保：
1. Mock 在真實實作之前定義
2. 類型匹配
3. 所有方法都被 mock

### 測試相互影響

使用 `beforeEach` 和 `afterEach` 隔離測試：

```typescript
beforeEach(() => {
  // 重置全局狀態
  globalState.reset()
})

afterEach(() => {
  // 清理
  cache.clear()
})
```

---

## 參考資源

- [Bun Test Documentation](https://bun.sh/docs/test/overview)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Clean Code: Tests](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-code-blog.html)
