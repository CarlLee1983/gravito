# 架構模式與最佳實踐

> **用途**：常見架構模式、禁止模式、跨包修改指南、新功能開發流程
> **何時查閱**：實戰開發、設計特性、解決架構問題時
> **返回**：[CLAUDE.md](../../CLAUDE.md)

---

## 常見架構模式（推薦）

### 模式 1：事件驅動通訊（推薦 ⭐）

**適用場景**：Satellite 間協調、非同步操作

#### 實現示例

```typescript
// 1. 定義事件（在發佈方）
// satellite-inventory/src/events/InventoryLowEvent.ts
export class InventoryLowEvent {
  constructor(
    public productId: string,
    public quantity: number,
    public timestamp: Date = new Date()
  ) {}
}

// 2. 發佈事件（在發佈方）
// satellite-inventory/src/services/InventoryService.ts
import { signal } from '@gravito/signal'
import { InventoryLowEvent } from '../events/InventoryLowEvent'

export class InventoryService {
  async checkAndNotify() {
    const lowItems = await this.repository.findLowQuantityItems()
    for (const item of lowItems) {
      // 發佈事件
      await signal.emit(new InventoryLowEvent(item.id, item.quantity))
    }
  }
}

// 3. 監聽事件（在訂閱方）
// satellite-notification/src/index.ts
import { signal } from '@gravito/signal'
import { InventoryLowEvent } from '@gravito/satellite-inventory'

export function bootstrapNotificationModule() {
  // 在應用啟動時註冊事件監聽
  signal.on(InventoryLowEvent, async (event) => {
    await notifyAdmin(`Product ${event.productId} is running low (${event.quantity} units)`)
  })
}
```

#### 優點

- ✅ **完全解耦**：衛星間無直接依賴
- ✅ **易於測試**：模擬事件即可測試
- ✅ **易於擴展**：新增訂閱者無需修改發佈方
- ✅ **非同步友好**：自然支援異步操作
- ✅ **可獨立部署**：衛星無版本依賴

#### 缺點

- ⚠️ **難以追蹤**：事件流程不如直接呼叫明顯
- ⚠️ **潛在延遲**：事件傳遞有延遲（需容忍）
- ⚠️ **錯誤處理複雜**：多個訂閱者的錯誤需要協調

---

### 模式 2：共享模型與驗證（基礎層）

**適用場景**：多個衛星使用相同驗證邏輯或資料模型

#### 實現示例

```typescript
// 1. 定義共享值對象（在基礎層）
// packages/mass/src/ValueObjects.ts
import { z } from 'zod'

export const EmailSchema = z.string().email('Invalid email format')
export const PhoneSchema = z.string().regex(/^\d{10,}$/, 'Invalid phone format')
export const URLSchema = z.string().url('Invalid URL format')

export type Email = z.infer<typeof EmailSchema>
export type Phone = z.infer<typeof PhoneSchema>

// 2. 衛星中使用共享驗證
// satellite-membership/src/models/User.ts
import { EmailSchema, PhoneSchema } from '@gravito/mass'

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: EmailSchema,
  phone: PhoneSchema.optional(),
  createdAt: z.date()
})

export type User = z.infer<typeof UserSchema>

// 3. 另一個衛星也使用相同驗證
// satellite-support/src/models/Contact.ts
import { EmailSchema } from '@gravito/mass'

export const ContactSchema = z.object({
  email: EmailSchema,
  supportedChannels: z.array(z.enum(['email', 'phone', 'chat']))
})
```

#### 優點

- ✅ **Single Source of Truth**：驗證邏輯在一處
- ✅ **一致性**：所有衛星使用相同規則
- ✅ **易於維護**：更新驗證只需修改一個地方
- ✅ **防止不同步**：衛星不會有不同的驗證邏輯

#### 注意事項

```typescript
// ✅ 好：衛星使用共享模型進行驗證
const user = UserSchema.parse(data)

// ❌ 避免：衛星依賴其他衛星的模型
import { User } from '@gravito/satellite-membership'  // 禁止！

// ✅ 好：如果需要共享，放在基礎層
import { User } from '@gravito/mass'  // 允許
```

---

### 模式 3：倉庫模式（Satellite 內部）

**適用場景**：Satellite 內的資料訪問層

#### 實現示例

```typescript
// satellite-catalog/src/repositories/ProductRepository.ts
import { atlas } from '@gravito/atlas'

export interface ProductRepository {
  findAll(filters?: ProductFilters): Promise<Product[]>
  findById(id: string): Promise<Product | null>
  findByCategory(categoryId: string): Promise<Product[]>
  create(data: CreateProductDto): Promise<Product>
  update(id: string, data: UpdateProductDto): Promise<Product>
  delete(id: string): Promise<void>
}

export class ProductRepositoryImpl implements ProductRepository {
  async findAll(filters?: ProductFilters): Promise<Product[]> {
    let query = atlas.query('products')

    if (filters?.categoryId) {
      query = query.where('categoryId', filters.categoryId)
    }

    if (filters?.priceRange) {
      query = query
        .whereBetween('price', [filters.priceRange.min, filters.priceRange.max])
    }

    return query.get()
  }

  async findById(id: string): Promise<Product | null> {
    return atlas.query('products').where('id', id).first()
  }

  async create(data: CreateProductDto): Promise<Product> {
    const product = { id: uuid(), ...data, createdAt: new Date() }
    await atlas.query('products').insert(product)
    return product
  }

  // ... 其他方法
}

// satellite-catalog/src/index.ts
export { ProductRepository, ProductRepositoryImpl }

// 衛星內的 Use Case
// satellite-catalog/src/use-cases/GetProducts.ts
export class GetProductsUseCase {
  constructor(private repository: ProductRepository) {}

  async execute(filters?: ProductFilters): Promise<Product[]> {
    return this.repository.findAll(filters)
  }
}
```

#### 優點

- ✅ **職責分離**：資料訪問與業務邏輯分開
- ✅ **易於測試**：可 mock Repository
- ✅ **易於修改**：資料庫變更只需修改 Repository
- ✅ **代碼復用**：多個 Use Case 共用一個 Repository

---

## 禁止模式（Anti-Pattern）

### ❌ 反模式 1：直接衛星間導入

```typescript
// 錯誤的做法
// satellite-commerce/src/OrderService.ts
import { InventoryService } from '@gravito/satellite-inventory'

export class OrderService {
  async createOrder(productId: string) {
    // 直接調用其他衛星
    const available = await InventoryService.checkAvailability(productId)
    if (!available) throw new Error('Out of stock')

    // 直接修改庫存
    await InventoryService.deduct(productId)
  }
}
```

**為什麼禁止**：
- 🔴 建立循環依賴風險（inventory 若需要調用 commerce）
- 🔴 衛星無法獨立部署（耦合版本號）
- 🔴 Pre-push hook 會失敗
- 🔴 難以獨立測試

**正確的做法**：透過事件通訊

```typescript
// ✅ 正確的做法
// satellite-commerce/src/OrderService.ts
import { signal } from '@gravito/signal'

export class OrderService {
  async createOrder(productId: string) {
    // 發佈事件，讓 inventory 衛星監聽
    await signal.emit(new OrderCreatedEvent(productId))
  }
}

// satellite-inventory/src/index.ts
signal.on(OrderCreatedEvent, async (event) => {
  await InventoryService.deduct(event.productId)
})
```

---

### ❌ 反模式 2：跨包直接導入內部模組

```typescript
// 錯誤的做法
import { HookManager } from '@gravito/core/container/HookManager'
import { QueryBuilder } from '@gravito/atlas/orm/QueryBuilder'
import { EventQueue } from '@gravito/stream/queue/EventQueue'

// 這些都是內部實作，不穩定，可能隨時改變
```

**為什麼禁止**：
- 🔴 內部 API 不穩定，版本升級可能破壞
- 🔴 跨越了包的邊界，違反封裝
- 🔴 Biome lint 會強制執行此規則

**正確的做法**：使用公開 API

```typescript
// ✅ 正確的做法
import { HookManager, EventBus, createApplication } from '@gravito/core'
import { query, createRepository } from '@gravito/atlas'
import { processEventQueue } from '@gravito/stream'

// 這些都是穩定的公開 API
```

---

### ❌ 反模式 3：在衛星中嵌入業務邏輯於 Repository

```typescript
// 錯誤的做法
// satellite-membership/src/repositories/UserRepository.ts
export class UserRepository {
  async create(data: CreateUserDto): Promise<User> {
    // ❌ 業務邏輯在 Repository（應在 Use Case）
    const hashedPassword = await hashPassword(data.password)
    const user = await this.validate(data)  // 業務驗證
    const defaultRoleId = await this.getDefaultRole()  // 業務邏輯

    return this.insert({ ...user, hashedPassword, roleId: defaultRoleId })
  }
}
```

**為什麼禁止**：
- 🔴 Repository 應只處理資料訪問
- 🔴 業務邏輯難以復用
- 🔴 難以測試

**正確的做法**：業務邏輯在 Use Case

```typescript
// ✅ 正確的做法
// satellite-membership/src/use-cases/CreateUser.ts
export class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private passwordService: PasswordService,
    private roleService: RoleService
  ) {}

  async execute(data: CreateUserDto): Promise<User> {
    // 業務邏輯在這裡
    const validatedData = UserSchema.parse(data)
    const hashedPassword = await this.passwordService.hash(data.password)
    const defaultRole = await this.roleService.getDefault()

    return this.userRepository.create({
      ...validatedData,
      hashedPassword,
      roleId: defaultRole.id
    })
  }
}

// satellite-membership/src/repositories/UserRepository.ts
export class UserRepository {
  // 只處理資料訪問
  async create(user: User): Promise<User> {
    return this.insert(user)
  }
}
```

---

## 跨包修改指南

### 場景 1：修改基礎層包（如 core）

**步驟**：

```bash
# 1. 修改代碼
nano packages/core/src/hooks/Hooks.ts

# 2. 添加或更新測試（目標覆蓋率 ≥ 75%）
nano packages/core/tests/hooks/Hooks.test.ts

# 3. 更新 index.ts（導出新功能）
nano packages/core/src/index.ts

# 4. 本地驗證
cd packages/core && bun test
bun run typecheck

# 5. 驗證依賴此包的所有包
bun run scripts/validate-affected-packages.ts
# 自動檢查：photon, atlas, signal, stream, monolith 等

# 6. 提交
git add packages/core
git commit -m "feat: [core] Add new hook feature"
```

**檢查清單**：
- [ ] 修改在 `src/` 中
- [ ] 測試在 `tests/` 中，覆蓋率 ≥ 75%
- [ ] 新導出加到 `index.ts`
- [ ] 單一包測試通過
- [ ] 完整類型檢查通過
- [ ] 受影響包驗證通過

---

### 場景 2：添加新 Satellite（業務模組）

**步驟**：

```bash
# 1. 創建目錄結構
mkdir -p satellites/my-feature/src/{models,use-cases,repositories,events}
mkdir satellites/my-feature/tests

# 2. 初始化 package.json
cat > satellites/my-feature/package.json << 'EOF'
{
  "name": "@gravito/satellite-my-feature",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@gravito/core": "workspace:*",
    "@gravito/atlas": "workspace:*",
    "@gravito/signal": "workspace:*"
  },
  "devDependencies": { "typescript": "workspace:*" }
}
EOF

# 3. 創建 tsconfig.json
cat > satellites/my-feature/tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist" },
  "include": ["src"]
}
EOF

# 4. 實作衛星
# src/models/MyModel.ts
# src/use-cases/CreateMyModel.ts
# src/repositories/MyRepository.ts
# src/events/MyModelCreatedEvent.ts
# src/index.ts

# 5. 在 gravito.config.ts 註冊（如需要）
nano gravito.config.ts

# 6. 安裝依賴
bun install

# 7. 驗證
bun run typecheck && bun run test

# 8. 提交
git add satellites/my-feature
git commit -m "feat: [satellite-my-feature] Add new business module"
```

---

### 場景 3：修改跨包依賴

**步驟**：

```bash
# 場景：satellite-commerce 需要依賴 @gravito/payment

# 1. 修改 package.json
nano satellites/commerce/package.json
# 添加：依賴 @gravito/payment

# 2. 重新安裝
bun install

# 3. 驗證
bun run typecheck

# 4. 檢查版本一致性
bun run version:check

# 5. 驗證受影響的包
bun run scripts/validate-affected-packages.ts

# 6. 提交
git add satellites/commerce/package.json bun.lockb
git commit -m "chore: [satellite-commerce] Add @gravito/payment dependency"
```

---

## 新功能開發 5 步流程

### 第 1 步：評估位置

**決定：應該在哪個包中實作？**

```
功能類型                    │ 推薦位置
────────────────────────────┼─────────────────────
多個衛星都需要用            │ 基礎層包（core、mass 等）
特定業務領域邏輯            │ 對應 Satellite
跨多個衛星的協調            │ Monolith 或 Signal
HTTP 相關（路由、中介軟體）  │ Photon 或具體 Satellite
資料庫相關（ORM、遷移）      │ Atlas 或具體 Satellite
驗證、型別安全              │ Mass（驗證）或 Core（型別）
```

### 第 2 步：設計接口

**確保**：
- [ ] 新功能的公開 API 清晰
- [ ] 與現有包的依賴關係確定
- [ ] 是否需要跨衛星通訊（用事件總線）
- [ ] 是否破壞 API（需要 major 版本升級）

### 第 3 步：實作 + 測試

```bash
# 添加代碼
nano packages/<name>/src/NewFeature.ts

# 添加測試（覆蓋率優先，TDD 推薦）
nano packages/<name>/tests/NewFeature.test.ts

# 導出公開 API
nano packages/<name>/src/index.ts
```

### 第 4 步：驗證

```bash
# 本地驗證
bun run typecheck && bun run check && bun test

# 跨包驗證
bun run scripts/validate-affected-packages.ts

# 創建 Changeset（記錄此次修改）
bun run changeset
```

### 第 5 步：提交

```bash
git add <modified-files>
git commit -m "feat: [module] Add NewFeature description"
git push  # Pre-push hook 自動驗證
```

---

## 相關文件

- [返回 CLAUDE.md](../../CLAUDE.md)
- [Galaxy Architecture 設計原則](./design.md) - 包分層、架構哲學
- [Monorepo 約束與規範](./constraints.md) - 4 大約束、隔離規則
- [開發工作流程](./development.md) - 完整工作流和常見任務
