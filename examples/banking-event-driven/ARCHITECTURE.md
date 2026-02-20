# 🏗️ 系統架構設計文檔

本文詳細介紹銀行事件驅動系統的架構設計，包括分層設計、數據流、事件流和組件交互。

## 📐 架構概覽

本系統採用 **清潔架構 (Clean Architecture)** + **事件驅動架構 (Event-Driven Architecture)** 的混合模式：

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         📱 Presentation Layer                            │
│                  HTTP Controllers, Routes, Request/Response              │
│                         (Route Handlers, SSE)                            │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                      🔧 Application Layer                                │
│            Commands, Queries, Command Handlers, Query Handlers           │
│              (Use Cases, Application Services, DTOs)                     │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                      🎯 Domain Layer (DDD)                               │
│    Aggregate Roots, Entities, Value Objects, Domain Events, Services    │
│                  (Pure Business Logic, No Frameworks)                    │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                    🔗 Infrastructure Layer                               │
│       Repositories, Event Store, Read Models, Event Listeners            │
│                    (Database Access, External Systems)                   │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔀 分層責任矩陣

| 層級 | 責任 | 示例類 | 不能做什麼 |
|-----|------|--------|----------|
| **Presentation** | HTTP 請求/響應 | AccountController | 業務邏輯、數據訪問 |
| **Application** | 用例協調 | OpenAccountCommandHandler | 直接業務規則、外部調用 |
| **Domain** | 業務規則 | Account, Money | 框架使用、數據訪問 |
| **Infrastructure** | 技術細節 | Repository, ReadModel | 業務邏輯決策 |

## 📊 詳細架構分解

### 1. 表現層 (Presentation Layer)

**職責**：處理 HTTP 請求/響應、驗證、路由

**關鍵組件**：

```typescript
// 文件：src/presentation/http/routes.ts
router.post('/api/accounts', (c) => accountController.openAccount(c))
router.get('/api/accounts/:id/balance', (c) => accountController.getBalance(c))
router.post('/api/transfers', (c) => transferController.initiateTransfer(c))
```

**數據流**：
```
HTTP Request
    ↓
Request Handler (Path, Method 匹配)
    ↓
Request Validation (Zod Schema)
    ↓
Controller (準備 Command 或 Query)
    ↓
Application Layer
```

**示例：存款流程**

```typescript
// 文件：src/presentation/http/controllers/AccountController.ts
async depositMoney(c: GravitoContext) {
  // 1. 驗證請求
  const { amountCents } = DepositMoneyRequest.parse(c.req.body)
  const accountId = c.req.param('id')

  // 2. 創建命令
  const command = new DepositMoneyCommand(accountId, amountCents)

  // 3. 分發命令到應用層
  const result = await c.app.bus.dispatch(command)

  // 4. 返回響應
  return c.json({ success: true, data: result })
}
```

### 2. 應用層 (Application Layer)

**職責**：協調業務用例、命令分發、查詢執行

**主要模式**：
- **CQRS**：命令和查詢完全分離
- **Command Bus**：所有寫操作通過命令總線
- **Event Dispatcher**：事件發送到事件總線

**命令處理流程**：

```
Command (OpenAccountCommand)
    ↓
Command Handler (OpenAccountCommandHandler)
    ↓
Domain Aggregate 操作 (Account.open())
    ↓
Domain Events 生成 (AccountOpened)
    ↓
Repository 持久化 (save)
    ↓
Dispatch Domain Events (eventManager.dispatch)
    ↓
Event Listeners 觸發 (UpdateReadModelListener)
    ↓
Command Response
```

**代碼示例**：

```typescript
// 文件：src/application/commands/DepositMoneyCommand.ts
export class DepositMoneyCommand extends Command {
  constructor(
    public readonly accountId: string,
    public readonly amountCents: number
  ) {
    super()
  }
}

// 文件：src/application/commands/DepositMoneyCommand.ts (Handler)
export class DepositMoneyCommandHandler implements CommandHandler<DepositMoneyCommand> {
  constructor(
    private readonly repository: IAccountRepository,
    private readonly eventManager: EventManager
  ) {}

  async handle(command: DepositMoneyCommand): Promise<void> {
    // 1. 從倉庫加載聚合根
    const account = await this.repository.findById(command.accountId)
    if (!account) throw new Error('Account not found')

    // 2. 執行業務操作（產生事件）
    account.deposit(command.amountCents)

    // 3. 持久化聚合根
    await this.repository.save(account)

    // 4. 分發領域事件到事件總線
    await dispatchAggregateEvents(account, this.eventManager)
  }
}
```

**查詢處理流程**：

```
Query (GetAccountBalanceQuery)
    ↓
Query Handler (GetAccountBalanceQueryHandler)
    ↓
Read Model Repository (查詢優化的數據)
    ↓
Query Response
```

### 3. 領域層 (Domain Layer)

**職責**：純業務邏輯、業務規則、不依賴框架

**核心概念**：

#### 3.1 聚合根 (Aggregate Root)

```typescript
// 文件：src/domain/account/Account.ts
export class Account extends AggregateRoot<string> {
  private _balance: Money
  private _status: AccountStatus

  // 工廠方法：創建新聚合根
  static open(id, ownerId, ownerName, currency, initialDepositCents) {
    const account = new Account(...)
    account.addDomainEvent(new AccountOpened(...))
    return account
  }

  // 業務方法：改變聚合根狀態
  deposit(amountCents: number): void {
    this._balance = this._balance.add(Money.of(amountCents))
    this.addDomainEvent(new MoneyDeposited(...))
  }

  // 業務規則驗證
  private assertActive(): void {
    if (this._status !== 'active') {
      throw new Error('Account is frozen')
    }
  }
}
```

**聚合根設計原則**：

1. **完整性**：聚合根中的所有數據必須在邊界內
2. **一致性**：聚合根負責維護內部不變量
3. **隔離性**：聚合根之間只能通過 ID 引用，不能直接引用
4. **事件驅動**：每個狀態改變都發出領域事件

#### 3.2 值對象 (Value Objects)

```typescript
// 文件：src/domain/shared/Money.ts
export class Money {
  private constructor(private readonly _cents: number) {}

  // 工廠方法
  static of(cents: number): Money {
    if (cents < 0) throw new Error('Money cannot be negative')
    return new Money(cents)
  }

  // 值對象操作（不改變原對象）
  add(other: Money): Money {
    return Money.of(this._cents + other._cents)
  }

  subtract(other: Money): Money {
    return Money.of(this._cents - other._cents)
  }

  isGreaterThanOrEqual(other: Money): boolean {
    return this._cents >= other._cents
  }
}
```

**值對象特點**：
- 不可變（Immutable）
- 無標識（No Identity）
- 等值比較（Equality by Value）
- 操作返回新對象

#### 3.3 領域事件 (Domain Events)

```typescript
// 文件：src/domain/account/events/AccountOpened.ts
export class AccountOpened extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly payload: {
      ownerId: string
      ownerName: string
      currency: string
      initialBalanceCents: number
    }
  ) {
    super(aggregateId)
  }
}

// 文件：src/domain/account/events/MoneyDeposited.ts
export class MoneyDeposited extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly payload: {
      amountCents: number
      newBalanceCents: number
    }
  ) {
    super(aggregateId)
  }
}
```

**領域事件特點**：
- 過去式命名（Deposited, Opened, Applied）
- 包含完整上下文（aggregateId, payload）
- 不可變
- 發生在聚合根狀態改變後

### 4. 基礎設施層 (Infrastructure Layer)

**職責**：技術細節實現、持久化、外部系統集成

#### 4.1 倉庫模式 (Repository Pattern)

```typescript
// 文件：src/infrastructure/repositories/IAccountRepository.ts
export interface IAccountRepository {
  findById(id: string): Promise<Account | null>
  save(account: Account): Promise<void>
  delete(id: string): Promise<void>
}

// 文件：src/infrastructure/repositories/InMemoryAccountRepository.ts
export class InMemoryAccountRepository implements IAccountRepository {
  private accounts = new Map<string, Account>()

  async findById(id: string): Promise<Account | null> {
    return this.accounts.get(id) ?? null
  }

  async save(account: Account): Promise<void> {
    this.accounts.set(account.id, account)
  }
}
```

**倉庫模式優勢**：
- 解耦領域層和技術實現
- 便於測試（Mock 倉庫）
- 支持多個實現（內存、數據庫等）

#### 4.2 讀取模型 (Projections / Read Models)

```typescript
// 文件：src/infrastructure/projections/AccountReadModel.ts
export class AccountReadModel {
  private accounts = new Map<string, {
    id: string
    ownerName: string
    balanceCents: number
    status: AccountStatus
  }>()

  // 投影：根據領域事件更新讀取模型
  addAccount(data: AccountData): void {
    this.accounts.set(data.id, {
      id: data.id,
      ownerName: data.ownerName,
      balanceCents: data.balanceCents,
      status: data.status
    })
  }

  updateBalance(accountId: string, newBalance: number): void {
    const account = this.accounts.get(accountId)
    if (account) {
      account.balanceCents = newBalance
    }
  }

  // 查詢接口（快速讀取）
  getAccount(id: string) {
    return this.accounts.get(id)
  }

  getBalance(id: string): number {
    return this.accounts.get(id)?.balanceCents ?? 0
  }
}
```

**讀取模型與寫模型的分離**：

```
寫操作                      讀操作
    ↓                          ↓
Account.deposit()          Query Handler
    ↓                          ↓
MoneyDeposited Event        ReadModel.getBalance()
    ↓                          ↓
UpdateReadModelListener     Quick Response
    ↓
AccountReadModel.updateBalance()
```

#### 4.3 事件監聽器 (Event Listeners)

```typescript
// 文件：src/infrastructure/listeners/UpdateReadModelListener.ts
export class UpdateReadModelListener {
  constructor(
    private readonly accountReadModel: AccountReadModel,
    private readonly transactionReadModel: TransactionReadModel
  ) {}

  // 對應每個領域事件的處理方法
  handleAccountOpened(event: AccountOpened): void {
    this.accountReadModel.addAccount({
      id: event.aggregateId,
      ownerName: event.payload.ownerName,
      balanceCents: event.payload.initialBalanceCents,
      status: 'active'
    })
  }

  handleMoneyDeposited(event: MoneyDeposited): void {
    // 1. 更新帳戶餘額投影
    this.accountReadModel.updateBalance(
      event.aggregateId,
      event.payload.newBalanceCents
    )

    // 2. 記錄交易事件
    this.transactionReadModel.addTransaction({
      id: event.eventId,
      accountId: event.aggregateId,
      type: 'deposit',
      amountCents: event.payload.amountCents,
      timestamp: event.timestamp
    })
  }
}
```

## 🔄 事件流與數據流

### 完整轉帳流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. HTTP 請求：POST /api/transfers                              │
│    { fromAccountId, toAccountId, amountCents }                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ 2. TransferController 驗證並創建 InitiateTransferCommand        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ 3. InitiateTransferCommandHandler 執行                          │
│    - 加載源帳戶                                                  │
│    - 調用 account.initiateTransfer()                           │
│    - 發出 TransferInitiated 事件                               │
│    - 保存帳戶到倉庫                                             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│ 4. EventManager 分發 TransferInitiated 事件                     │
│    分支 1：Saga 監聽 → TransferSaga.handleTransferInitiated()   │
│    分支 2：SSE 監聽 → SSEManager.broadcast()                    │
│    分支 3：ReadModel 監聽 → UpdateReadModelListener             │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┬──────────────────┐
        │                             │                  │
┌───────▼──────────┐   ┌──────────────▼──────┐   ┌──────▼──────────┐
│ Saga Step 1      │   │ SSE: Broadcast      │   │ ReadModel       │
│ 應用源帳戶扣款    │   │ 事件推送到前端      │   │ 更新投影        │
│ 發出:            │   │                     │   │                 │
│ TransferDebit    │   │ {                   │   │ (非同步，無    │
│ Applied          │   │   aggregateId,      │   │  阻塞)         │
└────────┬─────────┘   │   payload,          │   └─────────────────┘
         │             │   timestamp         │
         │             │ }                   │
         │             └─────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────┐
│ 5. EventManager 分發 TransferDebitApplied 事件                    │
│    Saga: TransferSaga.handleTransferDebitApplied()               │
│    SSE: 推送事件                                                 │
│    ReadModel: 記錄交易                                           │
└────────┬──────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────┐
│ 6. Saga Step 2：應用目標帳戶入款                                 │
│    - 加載目標帳戶                                                 │
│    - 調用 account.applyTransferCredit()                         │
│    - 發出 TransferCreditApplied 事件                            │
└────────┬──────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────┐
│ 7. EventManager 分發 TransferCreditApplied 事件                   │
│    (同上，更新 ReadModel 和 SSE)                                 │
└────────┬──────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────┐
│ 8. Saga Step 3：完成轉帳                                         │
│    - 發出 TransferCompleted 事件                                │
└────────┬──────────────────────────────────────────────────────────┘
         │
┌────────▼──────────────────────────────────────────────────────────┐
│ 9. HTTP 響應：200 OK                                             │
│    { success: true, transferId, status: 'initiated' }           │
│    (前端通過 SSE 訂閱實時進度)                                   │
└────────────────────────────────────────────────────────────────────┘
```

### 失敗補償流程

```
TransferInitiated 事件
    ↓
Saga 嘗試應用源帳戶扣款
    ↓ (失敗：餘額不足)
    │
    ├─→ 補償：sourceAccount.deposit(amount) [退款]
    │
    └─→ 發出 TransferFailed 事件
         │
         ├─→ DeadLetterListener.handleTransferFailed() [記錄]
         ├─→ SSEManager.broadcast() [通知前端]
         └─→ UpdateReadModelListener [記錄到交易歷史]
```

## 🎯 核心流程圖

### 1. 帳戶開設流程

```mermaid
graph TD
    A[HTTP: POST /accounts] → B[OpenAccountRequest 驗證]
    B → C[OpenAccountCommand]
    C → D[OpenAccountCommandHandler]
    D → E[Account.open 工廠方法]
    E → F[AccountOpened 事件]
    F → G[Repository.save]
    G → H[EventManager.dispatch]
    H → I1[UpdateReadModelListener]
    H → I2[SSEManager]
    I1 → J1[AccountReadModel.addAccount]
    I2 → J2[前端 SSE 推送]
    J1 → K[HTTP: 201 Created]
    J2 → K
```

### 2. 轉帳流程（Saga 編排）

```mermaid
graph TD
    A[TransferInitiated] → B[Saga.Step1: 應用源扣款]
    B → C{扣款成功?}
    C -->|是| D[TransferDebitApplied]
    C -->|否| E[補償 + TransferFailed]
    D → F[Saga.Step2: 應用目標入款]
    F → G{入款成功?}
    G -->|是| H[TransferCreditApplied]
    G -->|否| I[補償退款 + TransferFailed]
    H → J[Saga.Step3: 完成]
    J → K[TransferCompleted]
```

## 📡 事件驅動的訂閱-發佈機制

### 事件發佈方 (Publisher)

```typescript
// 文件：src/domain/account/Account.ts
class Account extends AggregateRoot {
  deposit(amountCents) {
    this._balance = this._balance.add(Money.of(amountCents))
    // 添加事件到未分發列表
    this.addDomainEvent(new MoneyDeposited(...))
  }
}

// 文件：src/application/commands/DepositMoneyCommand.ts
class DepositMoneyCommandHandler {
  async handle(command) {
    const account = await this.repository.findById(...)
    account.deposit(command.amountCents)
    await this.repository.save(account)

    // 分發所有累積的事件
    await dispatchAggregateEvents(account, this.eventManager)
  }
}
```

### 事件訂閱方 (Subscribers)

```typescript
// 文件：src/providers/EventServiceProvider.ts

// 訂閱者 1：Saga 編排
core.hooks.addAction('event:TransferInitiated', async (event) => {
  await transferSaga.handleTransferInitiated(event)
})

// 訂閱者 2：讀取模型更新
core.hooks.addAction('event:MoneyDeposited', (event) => {
  readModelListener.handleMoneyDeposited(event)
})

// 訂閱者 3：實時推送
core.hooks.addAction('event:MoneyDeposited', (event) => {
  sseManager.broadcast('MoneyDeposited', {
    aggregateId: event.aggregateId,
    payload: event.payload
  })
})
```

## 🛡️ 一致性與可靠性

### 強一致性（Write Side）

```
Command 執行
    ↓
Aggregate 驗證業務規則
    ↓
狀態改變 + 事件生成
    ↓
Repository 持久化 (原子操作)
    ↓
✅ 一致性保證
```

### 最終一致性（Read Side）

```
事件發佈
    ↓
異步事件監聽
    ↓
讀取模型更新
    ↓
可能有短暫延遲（毫秒級）
    ↓
✅ 最終一致
```

### 失敗處理

```
事件監聽失敗
    ↓
重試機制 (Hook 支持)
    ↓
仍然失敗?
    ↓
死信隊列 (DeadLetterListener)
    ↓
監控告警、手動處理
```

## 🔌 提供者與引導 (Service Providers)

### BankingServiceProvider

```typescript
// 文件：src/providers/BankingServiceProvider.ts
export class BankingServiceProvider extends ServiceProvider {
  register(container: Container): void {
    // 註冊倉庫
    container.singleton(IAccountRepository, InMemoryAccountRepository)

    // 註冊讀取模型
    container.singleton(AccountReadModel, AccountReadModel)
    container.singleton(TransactionReadModel, TransactionReadModel)

    // 註冊事件監聽器
    container.singleton(UpdateReadModelListener, UpdateReadModelListener)
    container.singleton(DeadLetterListener, DeadLetterListener)

    // 註冊 Saga
    container.singleton(TransferSaga, TransferSaga)

    // 註冊命令處理器
    container.make(CommandBus).register(OpenAccountCommand, OpenAccountCommandHandler)
    // ... 更多命令
  }
}

// 文件：src/providers/EventServiceProvider.ts
export class EventServiceProvider extends ServiceProvider {
  async boot(core: PlanetCore): Promise<void> {
    // 在應用啟動時設定事件監聽
    core.hooks.addAction('event:TransferInitiated', async (event) => {
      const saga = core.container.make(TransferSaga)
      await saga.handleTransferInitiated(event)
    })
    // ... 更多監聽
  }
}
```

## 🧬 模塊化與邊界

### 有界上下文 (Bounded Contexts)

本系統主要聚焦單一有界上下文「銀行帳戶」，但設計支持擴展：

```
未來擴展可能：

┌──────────────────────┐     ┌──────────────────────┐
│   帳戶上下文         │     │   貸款上下文         │
│  (Account BC)        │────▶│  (Loan BC)           │
│  - 聚合根: Account   │     │  - 聚合根: Loan      │
│  - 事件: *           │     │  - 事件: *           │
└──────────────────────┘     └──────────────────────┘
         │                           │
         └───────────┬───────────────┘
                     │
            ┌────────▼─────────┐
            │  事件總線         │
            │  (Event Bus)      │
            │  (跨BC通信)       │
            └──────────────────┘
```

## 📈 可擴展性考慮

### 橫向擴展

```
多個聚合根可以獨立擴展：
- Account (帳戶)
- Loan (貸款)
- Card (卡片)
- ... 未來的聚合根
```

### 事件溯源準備

當前實現使用內存存儲，但架構支持遷移到事件溯源：

```typescript
// 未來可能的事件存儲
class EventStore {
  async append(event: DomainEvent): Promise<void> {
    // 持久化事件到事件存儲
  }

  async getEvents(aggregateId: string): Promise<DomainEvent[]> {
    // 從事件存儲重新加載歷史
  }
}

// 聚合根重構
class Account {
  static async loadFromHistory(aggregateId: string) {
    const events = await eventStore.getEvents(aggregateId)
    return Account.fromEvents(events)
  }
}
```

## 🔐 安全考慮

### 輸入驗證

```typescript
// 所有外部輸入都通過 Zod 驗證
const schema = z.object({
  amountCents: z.number().int().min(1).max(999999999)
})
const validated = schema.parse(input)
```

### 業務規則驗證

```typescript
// 業務規則在聚合根中實現
account.withdraw(amountCents) {
  if (!this._balance.isGreaterThanOrEqual(Money.of(amountCents))) {
    throw new Error('Insufficient funds')
  }
  // ...
}
```

### 事件不可變性

```typescript
// 事件發出後不能修改
export class MoneyDeposited extends DomainEvent {
  // 所有屬性 readonly
  constructor(
    aggregateId: string,
    public readonly payload: { amountCents: number }
  ) {
    super(aggregateId)
  }
}
```

---

本架構設計確保了系統的 **可維護性**、**可測試性** 和 **可擴展性**。每一層都有清晰的責任邊界，事件驅動的設計使得系統具有高度的解耦和柔性。
