# CQRS 模式概述

## 什麼是 CQRS？

CQRS（Command Query Responsibility Segregation）是一種架構模式，將應用程式分為兩個獨立的部分：

- **Command（命令）**：負責改變應用狀態的操作
- **Query（查詢）**：負責讀取應用狀態的操作

### 核心理念

傳統 CRUD 模型將讀寫混合在同一個模型中，而 CQRS 將讀寫職責完全分離：

```
傳統 MVC:
Request → Controller → Model → Database
                    ↓
                Response

CQRS:
Command Request → CommandBus → CommandHandler → Repository → Database
Query Request → QueryBus → QueryHandler → Repository → Database
```

## Command vs Query

### Command（命令）

- **目的**：改變系統狀態
- **副作用**：通常會修改資料庫
- **返回值**：通常為 void 或確認信息
- **幂等性**：通常不幂等（多次執行產生不同結果）
- **例子**：
  - `CreateAccountCommand` - 建立帳戶
  - `DepositFundsCommand` - 存款
  - `TransferFundsCommand` - 轉帳

### Query（查詢）

- **目的**：讀取系統狀態
- **副作用**：不應修改任何資料
- **返回值**：返回查詢結果 DTO
- **幂等性**：完全幂等（多次執行相同結果）
- **例子**：
  - `GetAccountBalanceQuery` - 查詢餘額
  - `GetAccountDetailsQuery` - 取得帳戶詳情
  - `GetTransactionHistoryQuery` - 交易記錄

## 執行流程

### Command 流程

```
┌─────────────────────────────────────────────────────┐
│ 1. HTTP POST /api/accounts/:id/deposit              │
├─────────────────────────────────────────────────────┤
│ 2. 建立 DepositFundsCommand(accountId, amount)      │
├─────────────────────────────────────────────────────┤
│ 3. CommandBus.dispatch(command)                     │
├─────────────────────────────────────────────────────┤
│ 4. Container 解析對應的 Handler                      │
│    (cqrs.command.DepositFundsCommand)               │
├─────────────────────────────────────────────────────┤
│ 5. Handler.handle(command)                          │
│    - 從 Repository 加載 Account AggregateRoot       │
│    - 調用 account.deposit(money)                    │
│    - 驗證業務規則（餘額、狀態等）                    │
│    - 保存修改到 Repository                          │
│    - 記錄交易記錄                                   │
├─────────────────────────────────────────────────────┤
│ 6. 發布領域事件 (FundsDeposited)                     │
├─────────────────────────────────────────────────────┤
│ 7. 返回成功響應                                     │
└─────────────────────────────────────────────────────┘
```

### Query 流程

```
┌─────────────────────────────────────────────────────┐
│ 1. HTTP GET /api/accounts/:id/balance               │
├─────────────────────────────────────────────────────┤
│ 2. 建立 GetAccountBalanceQuery(accountId)            │
├─────────────────────────────────────────────────────┤
│ 3. QueryBus.execute(query)                          │
├─────────────────────────────────────────────────────┤
│ 4. Container 解析對應的 Handler                      │
│    (cqrs.query.GetAccountBalanceQuery)              │
├─────────────────────────────────────────────────────┤
│ 5. Handler.handle(query)                            │
│    - 從 Repository 讀取 Account                     │
│    - 不修改任何資料                                 │
│    - 構建 DTO 返回給客戶端                           │
├─────────────────────────────────────────────────────┤
│ 6. 返回查詢結果                                     │
└─────────────────────────────────────────────────────┘
```

## 架構層次

### 1. Domain Layer（領域層）

純業務邏輯，零框架依賴：

```typescript
// AggregateRoot - 聚合根
class Account {
  deposit(amount: Money): void
  withdraw(amount: Money): void
  transferTo(toAccountId: string, amount: Money): void
}

// ValueObject - 值對象
class Money {
  constructor(cents: number, currency: string)
  add(other: Money): Money
  subtract(other: Money): Money
}

// Entity - 實體
class Transaction {
  id: string
  accountId: string
  type: TransactionType
}

// DomainEvent - 領域事件
class AccountCreated implements DomainEvent { }
class FundsDeposited implements DomainEvent { }
```

### 2. Application Layer（應用層）

協調領域對象和基礎設施：

```typescript
// CommandBus & QueryBus - 協調器
class CommandBus {
  dispatch<TResult>(command: Command): Promise<TResult>
}

class QueryBus {
  execute<TResult>(query: Query): Promise<TResult>
}

// Handlers - 處理器
class DepositFundsHandler implements CommandHandler {
  handle(command: DepositFundsCommand): Promise<void>
}

class GetAccountBalanceHandler implements QueryHandler {
  handle(query: GetAccountBalanceQuery): Promise<AccountBalanceDTO>
}
```

### 3. Infrastructure Layer（基礎設施層）

外部依賴實現：

```typescript
// Repository 實現
class AtlasAccountRepository implements IAccountRepository {
  save(account: Account): Promise<void>
  findById(id: string): Promise<Account | null>
}

// 事件發布
class GravitoEventPublisher {
  publish(event: DomainEvent): Promise<void>
}
```

### 4. Interface Layer（介面層）

HTTP 端點和轉換：

```typescript
router.post('/api/accounts/:id/deposit', async (ctx) => {
  const command = new DepositFundsCommand(...)
  await commandBus.dispatch(command)
  return ctx.json({ success: true })
})
```

## CQRS vs MVC

| 特性 | MVC | CQRS |
|------|-----|------|
| 讀寫分離 | ❌ 混合 | ✅ 完全分離 |
| 複雜度 | 低 | 高 |
| 規模 | 小-中 | 中-大 |
| 性能優化 | 困難 | 容易 |
| 事件驅動 | ⚠️ 困難 | ✅ 自然 |
| 測試難度 | 中 | 低 |

## 何時使用 CQRS？

### ✅ 適合使用

- 複雜業務規則（如銀行、金融系統）
- 讀寫比例不平衡（如社交媒體：90% 讀，10% 寫）
- 需要事件溯源（Event Sourcing）
- 多個讀模型（如儀表板、報表、搜索）
- 高並發讀寫操作

### ❌ 不適合

- 簡單 CRUD 應用
- 小型專案
- 讀寫比例平衡
- 團隊缺乏 CQRS 經驗

## 進階主題：Event Sourcing

Event Sourcing 與 CQRS 經常搭配使用，表示不存儲當前狀態，而是存儲所有事件：

```
不使用 Event Sourcing:
帳戶表: { id, balance, status }

使用 Event Sourcing:
事件日誌表:
- AccountCreated(id, owner)
- FundsDeposited(id, amount)
- FundsDeposited(id, amount)
- FundsWithdrawn(id, amount)

當前狀態 = 重放所有事件
```

### 優點

- 完整審計日誌
- 時間旅行（查看任何時間點的狀態）
- 彼此不同的系統可以訂閱事件

### 缺點

- 複雜度增加
- 存儲空間增加
- 事件遷移困難

## 本專案展示

此銀行 CQRS 範例展示：

✅ 命令與查詢的清晰分離
✅ 領域驅動設計（Domain-Driven Design）
✅ 值對象和聚合根的使用
✅ 領域事件發布
✅ 完整的應用、領域和基礎設施層
✅ 單元測試和集成測試

## 參考資源

- [Martin Fowler - CQRS](https://martinfowler.com/bliki/CQRS.html)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Domain-Driven Design](https://en.wikipedia.org/wiki/Domain-driven_design)
