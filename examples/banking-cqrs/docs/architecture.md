# 銀行 CQRS 專案架構

## 專案結構概覽

```
examples/banking-cqrs/
├── src/
│   ├── Domain/                     # 領域層（業務規則）
│   │   ├── Account/
│   │   │   ├── Account.ts          # Aggregate Root
│   │   │   ├── AccountStatus.ts
│   │   │   ├── IAccountRepository.ts
│   │   │   └── Events/             # 領域事件
│   │   ├── Transaction/
│   │   │   ├── Transaction.ts      # Entity
│   │   │   ├── TransactionType.ts
│   │   │   └── ITransactionRepository.ts
│   │   └── Shared/
│   │       └── Money.ts            # Value Object
│   │
│   ├── Application/                # 應用層（協調）
│   │   ├── Bus/
│   │   │   ├── CommandBus.ts
│   │   │   └── QueryBus.ts
│   │   ├── Commands/               # 寫操作
│   │   │   ├── CreateAccount/
│   │   │   ├── DepositFunds/
│   │   │   ├── WithdrawFunds/
│   │   │   └── TransferFunds/
│   │   └── Queries/                # 讀操作
│   │       ├── GetAccountBalance/
│   │       ├── GetAccountDetails/
│   │       └── GetTransactionHistory/
│   │
│   ├── Infrastructure/             # 基礎設施層（外部依賴）
│   │   ├── Persistence/
│   │   │   ├── AtlasAccountRepository.ts
│   │   │   └── AtlasTransactionRepository.ts
│   │   └── EventPublisher/
│   │       └── GravitoEventPublisher.ts
│   │
│   ├── Providers/
│   │   └── CqrsProvider.ts         # 容器綁定
│   │
│   ├── routes.ts                   # HTTP 路由
│   ├── bootstrap.ts                # 應用啟動
│   └── index.ts                    # 入口點
│
├── database/
│   └── migrations/index.ts         # 資料庫遷移
│
├── tests/
│   ├── Domain/                     # 領域層單元測試
│   │   ├── Account.test.ts
│   │   └── Money.test.ts
│   └── setup.ts                    # 測試工具函數
│
└── docs/
    ├── CQRS-overview.md            # CQRS 理論
    ├── CQRS-quick-start.md         # 快速入門
    └── architecture.md             # 本文件
```

## 各層職責

### 1. Domain Layer（領域層）

**職責**：封裝業務邏輯和規則。

**主要類別**：

#### Account (AggregateRoot)
- 管理帳戶狀態（餘額、狀態、時間戳）
- 實施業務規則（餘額檢查、轉帳限制）
- 發出領域事件（FundsDeposited, FundsWithdrawn 等）

#### Money (ValueObject)
- 表示貨幣金額（避免浮點誤差）
- 提供金額操作（add, subtract, compare）
- 強制貨幣一致性

#### Transaction (Entity)
- 記錄單一交易操作
- 不可變（created after account operation）
- 支持不同類型（deposit, withdrawal, transfer）

#### Domain Events
- `AccountCreated` - 帳戶建立
- `FundsDeposited` - 存款
- `FundsWithdrawn` - 提款
- `FundsTransferred` - 轉帳

**特點**：
- ✅ 零框架依賴
- ✅ 完全可測試（無 I/O）
- ✅ 單元測試快速

**範例**：

```typescript
// 領域層完全獨立
const account = Account.create('acc-1', '王小明', 'TWD')
account.deposit(new Money(10000, 'TWD'))  // ✅ 存款
account.deposit(new Money(-100, 'TWD'))   // ❌ 拒絕負數

// 領域事件自動記錄
const events = account.pullDomainEvents()
// [AccountCreated, FundsDeposited]
```

### 2. Application Layer（應用層）

**職責**：協調 Domain 對象和 Infrastructure 完成用例。

#### CommandBus & QueryBus

```typescript
// Container 中的 Handler 解析
class CommandBus {
  async dispatch<TResult>(command: Command): Promise<TResult> {
    const handlerKey = `cqrs.command.${command.constructor.name}`
    const handler = container.make(handlerKey)
    return handler.handle(command)
  }
}
```

#### Handlers（Command）

流程：
1. 接收 Command
2. 從 Repository 加載 AggregateRoot
3. 調用業務方法
4. 保存修改
5. 發布領域事件

```typescript
class DepositFundsHandler implements CommandHandler {
  async handle(command: DepositFundsCommand): Promise<void> {
    const account = await this.repository.findById(command.accountId)
    account.deposit(new Money(command.amountCents, command.currency))
    await this.repository.save(account)

    for (const event of account.pullDomainEvents()) {
      this.core.hooks.doAction('cqrs:domain-event', event)
    }
  }
}
```

#### Handlers（Query）

流程：
1. 接收 Query
2. 從 Repository 讀取資料（不修改）
3. 構建 DTO
4. 返回結果

```typescript
class GetAccountBalanceHandler implements QueryHandler {
  async handle(query: GetAccountBalanceQuery): Promise<AccountBalanceDTO> {
    const account = await this.repository.findById(query.accountId)
    return {
      accountId: account.id,
      balanceCents: account.balance.cents,
      // ...
    }
  }
}
```

### 3. Infrastructure Layer（基礎設施層）

**職責**：實現 Domain 的 Repository 介面，實現外部依賴。

#### Repositories

```typescript
class AtlasAccountRepository implements IAccountRepository {
  async save(account: Account): Promise<void> {
    // 將 Account Aggregate 持久化到資料庫
  }

  async findById(id: string): Promise<Account | null> {
    // 從資料庫讀取並重建 Account Aggregate
  }
}
```

**重要**：Repository 只知道 Domain 層的介面，不知道實現細節。

#### Database Schema

```sql
-- Write Model（命令寫入）
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  owner_name TEXT NOT NULL,
  balance INTEGER NOT NULL,        -- 分為單位
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)

-- Event Log（交易記錄）
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  type TEXT NOT NULL,              -- deposit/withdrawal/transfer_in/transfer_out
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  currency TEXT NOT NULL,
  reference_id TEXT,               -- 轉帳對方帳號
  description TEXT,
  created_at TEXT NOT NULL
)
```

### 4. Interface Layer（介面層）

**職責**：HTTP 端點和請求/響應轉換。

```typescript
router.post('/api/accounts/:id/deposit', async (ctx) => {
  const body = await ctx.req.json()

  // 1. 建立 Command
  const command = new DepositFundsCommand(
    ctx.req.param('id'),
    Math.round(body.amount * 100),
    body.currency || 'TWD'
  )

  // 2. 透過 CommandBus 執行
  await commandBus.dispatch(command)

  // 3. 返回響應
  return ctx.json({ success: true })
})
```

## 數據流向

### Command 流程

```
HTTP Request
    ↓
Controller (routes.ts)
    ↓
建立 Command 對象
    ↓
CommandBus.dispatch(command)
    ↓
Container 解析 Handler
    ↓
Handler.handle()
    ├─ 從 Repository 加載 Account
    ├─ 調用業務方法（account.deposit）
    ├─ 保存 Account 到 Repository
    ├─ 保存 Transaction 記錄
    └─ 發布領域事件
    ↓
返回 HTTP 響應
```

### Query 流程

```
HTTP Request
    ↓
Controller (routes.ts)
    ↓
建立 Query 對象
    ↓
QueryBus.execute(query)
    ↓
Container 解析 Handler
    ↓
Handler.handle()
    ├─ 從 Repository 讀取資料
    ├─ 無修改操作
    └─ 構建 DTO
    ↓
返回 HTTP 響應（含 DTO）
```

## 容器綁定命名規範

Container 中的綁定鍵遵循命名規範：

| 類型 | 格式 | 範例 |
|------|------|------|
| Command Handler | `cqrs.command.{CommandClassName}` | `cqrs.command.DepositFundsCommand` |
| Query Handler | `cqrs.query.{QueryClassName}` | `cqrs.query.GetAccountBalanceQuery` |
| Repository | `banking.repository.{name}` | `banking.repository.account` |
| Bus | `cqrs.{busName}Bus` | `cqrs.commandBus`, `cqrs.queryBus` |

這確保了自動解析和一致性。

## 測試策略

### 單元測試（Domain Layer）

```typescript
describe('Account', () => {
  it('應該拒絕負數存款', () => {
    const account = Account.create('acc-1', 'John', 'TWD')
    expect(() => account.deposit(new Money(-100, 'TWD'))).toThrow()
  })
})
```

**優點**：
- ✅ 無數據庫依賴（快速）
- ✅ 測試業務規則
- ✅ 易於維護

### 集成測試（Full CQRS Flow）

```typescript
describe('DepositFunds CQRS', () => {
  it('應該從命令到查詢完成流程', async () => {
    // 1. 建立帳戶
    await commandBus.dispatch(new CreateAccountCommand(...))

    // 2. 存款
    await commandBus.dispatch(new DepositFundsCommand(...))

    // 3. 查詢
    const result = await queryBus.execute(new GetAccountBalanceQuery(...))
    expect(result.balanceCents).toBe(10000)
  })
})
```

**優點**：
- ✅ 端到端驗證
- ✅ 測試 Repository 和 Database

## 擴展機制

### 新增 Command

1. 定義 `Command` 類
2. 實現 `CommandHandler`
3. 在 `CqrsProvider` 中註冊
4. 在 `routes.ts` 中添加端點

### 新增 Query

1. 定義 `Query` 類和 `DTO`
2. 實現 `QueryHandler`
3. 在 `CqrsProvider` 中註冊
4. 在 `routes.ts` 中添加端點

### 新增領域事件監聽

```typescript
core.hooks.addAction('cqrs:domain-event', (event: DomainEvent) => {
  if (event instanceof FundsDeposited) {
    // 處理存款事件
  }
})
```

## 性能考量

### 讀/寫分離

- **寫操作**：精確性優先（1 個規範化模型）
- **讀操作**：性能優先（可使用非規範化視圖）

### 未來優化

1. **讀模型快取**：使用 Redis 快取常用查詢
2. **事件溯源**：存儲所有事件而非當前狀態
3. **CQRS 完全分離**：讀寫資料庫分離
4. **異步命令處理**：使用隊列延遲處理

## 最佳實踐

✅ **Domain 層保持純淨** - 零框架依賴
✅ **Handler 保持薄** - 協調而不是業務邏輯
✅ **Query 完全唯讀** - 不修改任何資料
✅ **發布領域事件** - 完整的事件記錄
✅ **DTO 用於查詢** - 不暴露 Domain 對象
✅ **充分測試** - 特別是領域層

## 參考資源

- [Gravito Core 文檔](https://github.com/gravito-framework/gravito)
- [CQRS 模式概述](./CQRS-overview.md)
- [快速入門指南](./CQRS-quick-start.md)
