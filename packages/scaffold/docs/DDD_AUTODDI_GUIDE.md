# AutoDiBootstrap - DDD 自動 DI 實施指南

## 概述

**AutoDiBootstrap** 是 Gravito-Core DDD Scaffolder 的核心功能，實現了**「約定優於配置」**的自動依賴注入。

開發者無需手動修改：
- ❌ routes.ts（路由註冊）
- ❌ providers.ts（服務註冊）
- ❌ container 配置

只需遵循簡單的**目錄約定和命名規範**，所有服務都會被自動發現和註冊。

---

## 快速開始

### 1️⃣ 安裝依賴

```bash
cd my-app
bun install
```

### 2️⃣ 生成模組

```bash
bun run scaffold Order
```

生成結構：
```
src/Modules/Order/
├── Domain/
│   ├── Entities/Order.ts
│   ├── ValueObjects/OrderStatus.ts
│   ├── Repositories/IOrderRepository.ts
│   └── Services/OrderDomainService.ts
├── Application/
│   ├── Services/CreateOrderService.ts
│   └── DTOs/OrderDTO.ts
├── Presentation/
│   ├── Controllers/OrderController.ts
│   └── Routes/order.routes.ts
├── Infrastructure/
│   └── Repositories/OrderRepository.ts
└── index.ts
```

### 3️⃣ 填充業務邏輯

編輯以下 3 個檔案：

```typescript
// 1️⃣ src/Modules/Order/Domain/Entities/Order.ts
export class Order {
  constructor(
    readonly id: string,
    readonly customerId: string,
    readonly status: OrderStatus
  ) {}

  // TODO: 新增業務方法
  confirm(): void {
    if (this.status.value !== 'pending') {
      throw new Error('Order must be pending')
    }
    this.status = new OrderStatus('confirmed')
  }
}

// 2️⃣ src/Modules/Order/Application/Services/CreateOrderService.ts
export class CreateOrderService {
  constructor(
    private orderRepository: IOrderRepository,
    private domainService: OrderDomainService
  ) {}

  async execute(dto: CreateOrderDTO): Promise<OrderDTO> {
    // TODO: 實作業務邏輯
    const order = Order.create(dto.customerId)
    await this.orderRepository.save(order)
    return OrderDTO.fromEntity(order)
  }
}

// 3️⃣ src/Modules/Order/Infrastructure/Repositories/OrderRepository.ts
export class OrderRepository implements IOrderRepository {
  async save(order: Order): Promise<void> {
    // TODO: 實作資料庫儲存
    // await db.table('orders').insert({ ... })
  }

  async findById(id: string): Promise<Order | null> {
    // TODO: 實作資料庫查詢
    // const row = await db.table('orders').where('id', id).first()
    // return row ? Order.fromDB(row) : null
  }
}
```

### 4️⃣ 驗證自動註冊

無需任何修改，執行：

```bash
# 啟動應用
bun run dev

# 應該看到
# 🔍 發現 3 個服務
# ✓ order-domain-service
# ✓ create-order-service
# ✓ order-repository
# ✅ 已註冊 3 個服務到 DI 容器
# 🛣️  發現 1 個路由模組
# ✓ Order 路由已註冊
# ✅ 已註冊 1 個路由
```

### 5️⃣ 測試模組

```bash
# 單元測試
bun test tests/Unit/Order

# 整合測試
bun test tests/Integration/Order

# 功能測試
bun test tests/Feature/Order
```

---

## 架構約定

### 目錄結構約定

```
src/Modules/{ModuleName}/
├── Domain/
│   ├── Services/*Service.ts              ← 域服務（自動發現）
│   ├── Repositories/I*Repository.ts     ← 倉庫介面（無需發現）
│   └── Entities/*.ts                    ← 實體（無需發現）
├── Application/
│   ├── Services/*Service.ts              ← 應用服務（自動發現）
│   └── DTOs/*.ts                        ← 資料傳輸對象（無需發現）
├── Presentation/
│   ├── Controllers/*Controller.ts       ← 控制器（無需發現）
│   └── Routes/*.routes.ts                ← 路由（自動發現）
├── Infrastructure/
│   ├── Repositories/*Repository.ts       ← 倉庫實作（自動發現）
│   └── Subscribers/*Subscriber.ts        ← 事件訂閱（自動發現）
└── index.ts                              ← 模組導出（自動生成）
```

### 命名規範

**服務鍵名生成規則**：

| 檔案名稱 | 服務鍵名 | 說明 |
|---------|---------|------|
| OrderDomainService.ts | `order-domain-service` | kebab-case |
| CreateOrderService.ts | `create-order-service` | kebab-case |
| OrderRepository.ts | `order-repository` | kebab-case |
| IOrderRepository.ts | `order-repository` | 去除 I 前綴 |
| OrderEventSubscriber.ts | `order-event-subscriber` | kebab-case |

**路由函式命名規則**：

```typescript
// src/Modules/Order/Presentation/Routes/order.routes.ts

export function registerOrderRoutes(router: IModuleRouter): void {
  //                  ↑↑↑↑↑
  // 必須：register {ModuleName} Routes

  router.get('/orders', handler)
  router.post('/orders', handler)
  // ...
}
```

---

## 依賴注入工作流

### 自動建構子注入

```typescript
// ✅ 支援的模式

// 1. 單一依賴
export class CreateOrderService {
  constructor(private repo: OrderRepository) {}
}

// 2. 多個依賴
export class CreateOrderService {
  constructor(
    private repo: IOrderRepository,      // 自動解析為 order-repository
    private service: OrderDomainService  // 自動解析為 order-domain-service
  ) {}
}

// 3. 無參建構子
export class SimpleService {
  constructor() {}
}
```

### 手動依賴解析（當自動注入失敗時）

如果自動注入失敗，可在 `registerProviders()` 中手動綁定：

```typescript
// src/Bootstrap/providers.ts

export async function registerProviders(core: PlanetCore): Promise<void> {
  // 自動 DI 掃描
  // await AutoDiBootstrap.scanAndRegisterServices(core.container)

  // 手動註冊（當需要特殊邏輯時）
  core.container.singleton('order-service', (container) => {
    const repo = container.make('order-repository')
    const domainService = container.make('order-domain-service')
    return new CreateOrderService(repo, domainService)
  })
}
```

---

## 啟用 AutoDiBootstrap

### 開發環境（推薦自動掃描）

```typescript
// src/Bootstrap/app.ts

export async function createApp(): Promise<PlanetCore> {
  // ...

  // 啟用自動 DI 掃描
  await AutoDiBootstrap.scanAndRegisterServices(core.container)

  // 啟用自動路由註冊
  await AutoDiBootstrap.scanAndRegisterRoutes(core)

  return core
}
```

### 生產環境（推薦手動註冊，更快）

```typescript
// src/Bootstrap/app.ts

export async function createApp(): Promise<PlanetCore> {
  // ...

  // 使用手動註冊（無掃描開銷）
  await registerProviders(core)    // ~10ms
  registerRoutes(core.router)

  return core
}
```

**性能對比**：
- 自動掃描：~100-150ms（N 個模組）
- 手動註冊：~10-20ms

---

## 最佳實踐

### 1️⃣ 遵循命名約定

```typescript
// ✅ 好：遵循約定
export class OrderDomainService { }      // 自動發現
export class CreateOrderService { }      // 自動發現
export class OrderRepository { }          // 自動發現

// ❌ 不好：非標準命名
export class OrderService { }             // 歧義：Domain? Application?
export class Handler { }                  // 無法發現
export class Impl { }                     // 無法發現
```

### 2️⃣ 使用依賴倒置

```typescript
// ✅ 好：依賴介面，不是實現
export class CreateOrderService {
  constructor(private repo: IOrderRepository) {}
}

// ❌ 不好：直接依賴實現
export class CreateOrderService {
  constructor(private repo: OrderRepository) {}
}
```

### 3️⃣ 保持單一職責

```typescript
// ✅ 好：每個服務一個職責
- OrderDomainService         // Domain 邏輯
- CreateOrderService         // Use Case
- OrderRepository            // Data Access

// ❌ 不好：一個服務做太多
- OrderService               // 包含業務邏輯、資料訪問、驗證...
```

### 4️⃣ 測試隔離

```typescript
// ✅ 好：可以輕鬆 Mock 依賴
test('CreateOrderService', () => {
  const mockRepo = { save: () => {} }
  const service = new CreateOrderService(mockRepo as any)
})

// ❌ 不好：緊耦合，難以測試
export class CreateOrderService {
  constructor() {
    this.repo = new OrderRepository()  // 硬編碼！
  }
}
```

---

## 常見問題

### Q1: 自動掃描如何處理循環依賴？

```typescript
// ❌ 會導致錯誤
export class A {
  constructor(private b: B) {}
}

export class B {
  constructor(private a: A) {}
}

// ✅ 解決方案：使用 Lazy Injection
export class A {
  constructor(private lazyB: () => B) {}

  doSomething() {
    this.lazyB().method()
  }
}
```

### Q2: 如何添加第三方服務（如 Redis）？

```typescript
// src/Bootstrap/providers.ts

export async function registerProviders(core: PlanetCore): Promise<void> {
  // 自動掃描本地服務
  await AutoDiBootstrap.scanAndRegisterServices(core.container)

  // 手動註冊第三方服務
  const redis = new Redis({ host: 'localhost', port: 6379 })
  core.container.singleton('redis', () => redis)

  // 現在服務可以注入 Redis
  // export class MyService {
  //   constructor(private redis: Redis) {}
  // }
}
```

### Q3: 如何在測試時替換服務實現？

```typescript
// tests/Integration/Order/OrderService.test.ts

import { describe, it, beforeEach } from 'bun:test'
import { Container } from '@gravito/core'

describe('CreateOrderService', () => {
  let container: Container

  beforeEach(() => {
    container = new Container()

    // 使用 Mock 實現替換
    const mockRepo = {
      save: () => Promise.resolve(),
      findById: () => Promise.resolve(null),
    }

    container.singleton('order-repository', () => mockRepo)
  })

  it('should create order', async () => {
    const service = container.make(CreateOrderService)
    // 使用 Mock
  })
})
```

### Q4: 如何禁用某個服務的自動註冊？

創建 `.noscaffold` 檔案：

```bash
touch src/Modules/Order/Infrastructure/Repositories/OrderRepository.noscaffold
```

AutoDiBootstrap 會跳過此檔案。

### Q5: 效能：掃描需要多久？

```
掃描時間估算：
- 5 個模組：~50ms
- 10 個模組：~100ms
- 20 個模組：~200ms

建議：
- 開發環境：啟用自動掃描（便利，可接受的速度）
- 生產環境：使用手動註冊（快速啟動）
```

---

## 下一步

### Phase 2: 事件驅動

```bash
# 升級現有模組為事件驅動
bun run scaffold-upgrade Order --add-events

# 自動生成：
# - Domain/Events/OrderCreatedEvent.ts
# - Domain/Events/OrderConfirmedEvent.ts
# - Infrastructure/EventStore/OrderEventStore.ts
```

### Phase 3: DCI 角色

```bash
# 添加 DCI 角色
bun run scaffold-add Order --dci-roles Buyer,Seller

# 自動生成：
# - Domain/Contexts/OrderContext.ts
# - Domain/Roles/Buyer.ts
# - Domain/Roles/Seller.ts
```

### Phase 4: CQRS 查詢側

```bash
# 添加 CQRS 查詢側
bun run scaffold-add Order --cqrs-query

# 自動生成完整的查詢模組並訂閱事件
```

---

## 支援和回饋

遇到問題？

1. 檢查命名約定是否遵循
2. 查看控制台輸出的掃描日誌
3. 嘗試使用手動註冊排除故障
4. 在 Gravito-Core GitHub issue 上報告

