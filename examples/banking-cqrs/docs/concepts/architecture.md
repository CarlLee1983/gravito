# 銀行 CQRS 專案架構

## 專案結構概覽

```
examples/banking-cqrs/
├── src/
│   ├── Domain/                     # 領域層（純粹業務邏輯）
│   │   ├── Account/                # 帳戶聚合 (Aggregate Root)
│   │   ├── Transaction/            # 交易實體 (Entity)
│   │   └── Shared/                 # 共享值對象 (Value Object)
│   │
│   ├── Application/                # 應用層（任務協調）
│   │   ├── Actions/                # 介面層與 Bus 之間的過渡
│   │   ├── Bus/                    # 命令與查詢匯流排 (Smart Bus)
│   │   ├── Commands/               # 寫操作處理器
│   │   ├── Queries/                # 讀操作處理器
│   │   ├── Validation/             # 命令驗證層 (Smart Validation)
│   │   └── Cache/                  # 查詢快取層 (Memory Cache)
│   │
│   ├── Infrastructure/             # 基礎設施層（外部實現）
│   │   ├── Persistence/            # 資料庫持久化 (Atlas Repositories)
│   │   └── EventPublisher/         # 領域事件發布
│   │
│   ├── Presentation/               # 表現層 (HTTP Controllers)
│   │   └── Controllers/
│   │
│   ├── Providers/                  # Gravito Provider 註冊
│   ├── routes.ts                   # 路由定義
│   └── bootstrap.ts                # 啟動引導
│
└── docs/
    ├── concepts/                   # 核心概念文檔
    ├── guides/                     # 操作指南
    └── reports/                    # 審查報告
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
2. 若有 Validator，進行 **命令驗證 (Smart Validation)**
3. 從 Repository 加載 AggregateRoot
4. 調用業務方法
5. 保存修改
6. 發布領域事件

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
2. 檢查 **查詢快取 (Smart Cache)** 命中
3. 未命中則從 Repository 讀取資料
4. 構建 DTO 並存入快取
5. 返回結果

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

### 4. Presentation Layer（表現層）

**職責**：處理 HTTP 端點、輸入解析與初步驗證。

#### Controllers & Actions
專案採用 **Controller-Action 模式** 將路由邏輯與業務協調分離。

1. **Controller**: 負責解析 HTTP 請求 (Body, Params) 並調用對應的 Action。
2. **Action**: 封裝單個用例的執行邏輯，負責建立 Command/Query 並透過 Bus 發送。

```typescript
// AccountController.ts
async deposit(ctx: HttpContext): Promise<Response> {
  return this.execute(ctx, async () => {
    const body = await ctx.req.json()
    const validated = depositSchema.parse(body) // 初步結構驗證
    
    const action = new DepositFundsAction(this.commandBus)
    await action.execute(ctx.req.param('id'), validated)
    
    return this.success(ctx)
  })
}
```

### 5. Smart Services（智能輔助層）

#### 命令驗證 (Smart Validation)
`CommandBus` 整合了 `ValidatorRegistry`。在 Command 被派發到 Handler 之前，會根據 `Command` 名稱自動查找對應的 `Validator`（基於 Zod 實作）。這確保了 Handler 只處理格式正確且符合業務預設條件的數據。

#### 查詢快取 (Smart Cache)
`QueryBus` 整合了 `QueryCache`。讀取操作會先檢查內存快取，若命中則直接回傳 DTO，避免不必要的資料庫操作。當對應的聚合發生變更（Command 執行後），可呼叫 `invalidateCache()` 確保數據一致性。

## 數據流向

### Command 流程 (寫操作)

```
HTTP POST Request
    ↓
AccountController (解析 Body & 驗證結構)
    ↓
DepositFundsAction (建立 Command)
    ↓
CommandBus.dispatch(command)
    ├─ ValidatorRegistry (自動執行業務規則檢查)
    └─ 解析對應 Handler
        ↓
DepositFundsHandler.handle()
    ├─ 從 Repository 加載 Aggregate
    ├─ 調用領域模型 (account.deposit)
    ├─ 保存聚合導 Repository
    ├─ 保存 Transaction 記錄
    └─ 發布領域事件
    ↓
返回 HTTP 200 OK
```

### Query 流程 (讀操作)

```
HTTP GET Request
    ↓
AccountController (解析 Params)
    ↓
GetAccountDetailsAction (建立 Query)
    ↓
QueryBus.execute(query)
    ├─ QueryCache.get() (檢查快取命中)
    │   ├─ [命中] 直接返回 DTO
    │   └─ [未命中] 解析對應 Handler
    │       ↓
    │   GetAccountDetailsHandler.handle()
    │       ├─ 從 Repository 讀取資料
    │       └─ 構建 DTO
    └─ QueryCache.set() (存入快取)
    ↓
返回 HTTP 200 OK (JSON)
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
- [CQRS 模式概述](./cqrs.md)
- [快速入門指南](../guides/getting-started.md)
