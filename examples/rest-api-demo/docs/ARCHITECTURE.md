# 系統架構詳細設計

## 概述

REST API Demo 採用 **DDD（領域驅動設計）+ Clean Architecture（清潔架構）** 的四層設計模式，確保高內聚、低耦合的代碼結構。

## 四層架構

### 1. 領域層（Domain Layer）

**責任**：定義業務規則、實體、值對象、領域事件

```
domain/
├── user/
│   ├── User.ts                    # 用戶實體
│   ├── UserDomainService.ts       # 用戶領域服務
│   └── events/
│       ├── UserCreated.ts
│       ├── UserLoggedIn.ts
│       └── ...
├── product/
│   ├── Product.ts                 # 產品實體
│   ├── Category.ts                # 分類實體
│   └── events/
│       └── ProductUpdated.ts
├── order/
│   ├── Order.ts                   # 訂單實體
│   ├── OrderItem.ts               # 訂單項目
│   ├── OrderDomainService.ts
│   └── events/
│       ├── OrderCreated.ts
│       └── OrderStatusChanged.ts
└── payment/
    ├── Payment.ts                 # 支付實體
    └── events/
        ├── PaymentCompleted.ts
        └── PaymentRefunded.ts
```

**特點**：
- ✅ 與框架無關（pure business logic）
- ✅ 包含驗證規則和業務邏輯
- ✅ 定義領域事件

### 2. 應用層（Application Layer）

**責任**：協調領域對象實現 Use Cases，處理事務

```
application/
├── user/
│   ├── RegisterUser.ts            # 用戶註冊 Use Case
│   ├── LoginUser.ts               # 用戶登入 Use Case
│   ├── GetUserProfile.ts
│   └── UpdateUser.ts
├── product/
│   ├── GetProduct.ts              # 單個產品（帶快取）
│   ├── ListProducts.ts            # 產品列表（帶遊標分頁）
│   ├── SearchProducts.ts
│   └── UpdateStock.ts
├── order/
│   ├── CreateOrder.ts             # 建立訂單
│   ├── GetOrder.ts
│   ├── UpdateOrderStatus.ts
│   └── CancelOrder.ts
└── payment/
    ├── InitiatePayment.ts
    ├── CompletePayment.ts
    └── RefundPayment.ts
```

**特點**：
- ✅ 依賴注入（Repository、Services、EventManager）
- ✅ 事務管理
- ✅ 快取管理
- ✅ 事件發送

### 3. 基礎設施層（Infrastructure Layer）

**責任**：技術實現細節（資料庫、快取、認證等）

```
infrastructure/
├── repositories/
│   ├── UserRepository.ts          # Contract
│   ├── DatabaseUserRepository.ts  # 實現
│   ├── ProductRepository.ts
│   └── OrderRepository.ts
├── cache/
│   ├── LayeredCacheService.ts     # 分層快取（L1+L2）
│   └── CacheInvalidationHandler.ts
├── pool/
│   └── ConnectionPoolManager.ts   # 連接池管理
├── query/
│   └── QueryOptimizer.ts          # 查詢優化
├── auth/
│   ├── TokenService.ts
│   └── TokenBlacklist.ts
└── listeners/
    ├── SendWelcomeEmailListener.ts
    ├── UpdateStockListener.ts
    ├── ProcessPaymentListener.ts
    └── InvalidateCacheListener.ts
```

**特點**：
- ✅ Repository 模式（資料訪問抽象）
- ✅ 多層快取實現
- ✅ 事件監聽器
- ✅ 連接池管理

### 4. 表現層（Presentation Layer）

**責任**：HTTP 請求/響應、路由、中間件、驗證

```
presentation/
├── controllers/
│   ├── AuthController.ts
│   ├── UserController.ts
│   ├── ProductController.ts
│   ├── OrderController.ts
│   └── PaymentController.ts
├── middleware/
│   ├── authenticate.ts            # JWT/Session 驗證
│   ├── authorize.ts               # RBAC 授權
│   ├── rateLimit.ts               # 速率限制
│   ├── csrf.ts                    # CSRF 保護
│   └── securityHeaders.ts         # 安全頭部
├── requests/
│   ├── auth/
│   │   ├── LoginRequest.ts
│   │   └── RegisterRequest.ts
│   ├── product/
│   │   └── CreateProductRequest.ts
│   └── order/
│       └── CreateOrderRequest.ts
└── routes/
    └── api.ts                     # API 路由定義
```

**特點**：
- ✅ Zod Schema 驗證
- ✅ 輸入淨化和 CSRF 保護
- ✅ 速率限制和安全頭部
- ✅ 異常處理

## 數據流

### 完整的 Request/Response 流程

```
HTTP Request
    ↓
Route Handler
    ↓
Middleware (Auth, Rate Limit, CSRF)
    ↓
Request Validation (Zod Schema)
    ↓
Controller
    ↓
Use Case (Application Layer)
    ├─ 檢查快取 (LayeredCacheService)
    ├─ 調用 Repository
    ├─ 執行業務邏輯
    ├─ 發送領域事件
    └─ 更新快取
    ↓
Event Dispatch
    ├─ SendWelcomeEmailListener
    ├─ UpdateStockListener
    ├─ ProcessPaymentListener
    └─ InvalidateCacheListener
    ↓
HTTP Response (JSON)
```

## 關鍵設計模式

### 1. Repository 模式

**目的**：資料訪問抽象，降低耦合

```typescript
// Contract（interface）
interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(input: CreateUserInput): Promise<User>
  update(id: string, input: UpdateUserInput): Promise<User>
}

// 實現
class DatabaseUserRepository implements UserRepository {
  // 實際資料庫操作
}
```

### 2. Dependency Injection（DI）

**目的**：解耦和可測試性

```typescript
class RegisterUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private eventManager: EventManager
  ) {}
}

// 在 AuthServiceProvider 中註冊
container.bind('RegisterUserUseCase', () =>
  new RegisterUserUseCase(
    container.make('UserRepository'),
    container.make('EventManager')
  )
)
```

### 3. 事件驅動架構

**目的**：解耦業務流程，支持異步操作

```typescript
// 1. 在 Use Case 中發送事件
await this.eventManager.dispatch(
  new UserCreated({
    userId: user.id,
    email: user.email,
    // ...
  })
)

// 2. 監聽器處理事件
eventManager.listen('user:created', async (event) => {
  await sendWelcomeEmail(event.payload.email)
})
```

### 4. 分層快取

**目的**：提升性能，減輕資料庫壓力

```
L1 Cache (Memory)
    ↓ Cache Miss
L2 Cache (Redis)
    ↓ Cache Miss
Database
```

### 5. 查詢優化

**Eager Loading**：一次加載所有關聯數據

```typescript
// 不用 Eager Loading（N+1 問題）
const users = await userRepository.findAll()
for (const user of users) {
  user.orders = await orderRepository.findByUserId(user.id) // N+1
}

// 使用 Eager Loading
const users = await userRepository.findAll({
  include: ['orders', 'orders.items'] // 一次查詢
})
```

**遊標分頁**：高效大數據集分頁

```typescript
// 傳統 offset pagination（性能差）
SELECT * FROM products OFFSET 1000000 LIMIT 20

// 遊標分頁（性能好）
SELECT * FROM products WHERE id > :cursor LIMIT 20
```

## 事件流

### 訂單建立流程

```
CreateOrder Use Case
    ↓ 1. 驗證輸入和庫存
    ├─ 2. 建立訂單（資料庫）
    ├─ 3. 更新庫存（資料庫）
    ├─ 4. 發送 OrderCreated 事件
    ↓
Event Dispatch
    ├─ UpdateStockListener
    │   └─ 扣減庫存
    ├─ ProcessPaymentListener
    │   └─ 啟動支付流程
    └─ InvalidateCacheListener
        └─ 清除相關快取
    ↓
HTTP 200 OK
```

### 事件監聽器鏈

| 事件 | 監聽器 | 動作 |
|------|--------|------|
| `user:created` | SendWelcomeEmailListener | 發送歡迎郵件 |
| `order:created` | UpdateStockListener | 扣減庫存 |
| `order:created` | ProcessPaymentListener | 啟動支付 |
| `product:updated` | InvalidateCacheListener | 清除快取 |
| `payment:completed` | InvalidateCacheListener | 清除快取 |

## 連接池管理

### 生命週期

```
應用啟動
    ↓
PoolWarmer：預熱連接
    ├─ 批量建立 minSize 個連接
    └─ 測試連接可用性
    ↓
HealthChecker：定期監控
    ├─ 檢查連接狀態
    └─ 回調告警
    ↓
AdaptivePoolManager：自動調整
    ├─ 高利用率 → 增加連接
    └─ 低利用率 → 減少連接
```

### 連接池參數

```typescript
{
  minSize: 5,           // 最小連接數
  maxSize: 20,          // 最大連接數
  idleTimeout: 30000,   // 閒置超時（毫秒）
  maxWaitTime: 5000,    // 最大等待時間
  healthCheckInterval: 60000, // 健康檢查間隔
  warningThreshold: 75  // 利用率告警閾值（%）
}
```

## 性能優化策略

### 1. 快取策略

```
操作類型          | L1 TTL | L2 TTL | 用途
----------------+--------+--------+-------
產品詳情         | 1 min  | 5 min  | 熱數據
產品列表         | 30 sec | 5 min  | 高頻訪問
用戶個人資料     | 2 min  | 30 min | 中頻訪問
訂單詳情         | 1 min  | 10 min | 低頻訪問
```

### 2. 查詢優化

- ✅ Eager Loading（N+1 預防）
- ✅ 複合索引（查詢加速）
- ✅ Cursor 分頁（大數據集）
- ✅ 查詢計劃分析

### 3. 連接池優化

- ✅ 預熱（避免冷啟動）
- ✅ 健康檢查（自動恢復）
- ✅ 自適應調整（動態應對負載）

## 安全架構

### 認證與授權

```
Request
    ↓
JWT Guard 檢查 Token
    ├─ 簽名驗證
    ├─ 過期檢查
    └─ 黑名單檢查
    ↓
Session Guard 檢查會話
    ├─ Cookie 驗證
    └─ 會話有效性
    ↓
RBAC 權限檢查
    ├─ 角色檢查（admin, customer, guest）
    └─ 權限檢查（action-based）
    ↓
允許或拒絕
```

### 輸入驗證

```
HTTP Body
    ↓
Zod Schema 驗證
    ├─ 類型檢查
    ├─ 格式驗證
    └─ 業務規則檢查
    ↓
Input Sanitization
    ├─ HTML 實體編碼
    ├─ SQL 轉義
    └─ URL 編碼
    ↓
傳遞給 Use Case
```

## 監控和可觀測性

### 關鍵指標

| 指標 | 來源 | 告警閾值 |
|------|------|----------|
| P95 延遲 | Prometheus | > 100ms |
| 快取命中率 | 應用層 | < 80% |
| 連接池利用率 | ConnectionPoolManager | > 75% |
| 事件隊列深度 | EventPriorityQueue | > 100 |
| 錯誤率 | HTTP Middleware | > 1% |

### 追蹤

- ✅ OpenTelemetry 集成
- ✅ Jaeger 分佈式追蹤
- ✅ 完整請求鏈路可視化

---

**更新於**：2026-02-13
