# 🎯 領域驅動設計 (DDD) 完全指南

本指南詳細介紹如何在銀行系統中應用 DDD 核心概念，包括聚合根、實體、值對象、領域事件等，並提供實戰代碼示例。

## 📚 DDD 核心概念速查

| 概念 | 定義 | 示例 |
|------|------|------|
| **有界上下文** | 領域模型的邊界 | 「帳戶上下文」只管帳戶相關邏輯 |
| **聚合根** | 事務邊界內的數據和行為 | `Account` 聚合根 |
| **實體** | 具有標識的對象 | Account（有 ID） |
| **值對象** | 無標識、不可變的對象 | `Money` 值對象 |
| **領域事件** | 業務中發生的重要事件 | `AccountOpened`, `MoneyDeposited` |
| **倉庫** | 聚合根集合的抽象 | `IAccountRepository` |
| **領域服務** | 跨多個聚合根的業務邏輯 | `TransferSaga` |

## 🏛️ 有界上下文 (Bounded Context)

### 定義與目的

有界上下文是 DDD 中最重要的概念，定義了領域模型的邊界。在本系統中：

```typescript
// 文件：src/domain/account/

// 「帳戶上下文」的核心模型

┌─────────────────────────────────────────────────────────┐
│               帳戶有界上下文 (Account BC)               │
│                                                         │
│  核心概念：帳戶、餘額、轉帳                            │
│                                                         │
│  ├─ Aggregate Root: Account                            │
│  │  ├─ Value Object: Money                             │
│  │  ├─ Domain Event: AccountOpened                     │
│  │  ├─ Domain Event: MoneyDeposited                    │
│  │  ├─ Domain Event: TransferInitiated                 │
│  │  └─ ...                                             │
│  │                                                      │
│  ├─ Repository: IAccountRepository                     │
│  └─ Domain Service: TransferSaga                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 上下文邊界

```typescript
// 在帳戶上下文中，我們使用「帳戶 ID」引用其他聚合根，而非直接依賴
export class Account extends AggregateRoot<string> {
  // ✅ 正確：只通過 ID 引用其他上下文的聚合根
  initiateTransfer(toAccountId: string, amountCents: number): void {
    // 不能直接訪問 toAccount.balance
    // 而是發出事件，讓 Saga 處理
    this.addDomainEvent(
      new TransferInitiated(this.id, {
        fromAccountId: this.id,
        toAccountId,  // ← 只是 ID
        amountCents
      })
    )
  }

  // ❌ 錯誤：跨上下文直接依賴
  // initiateTransfer(toAccount: Account) { ... }
}
```

## 👑 聚合根 (Aggregate Root)

### 定義

聚合根是一個邊界內所有數據一致性的保障者。在本系統中，`Account` 是唯一的聚合根。

### 設計原則

#### 1️⃣ 單一責任

聚合根應該只管理一個業務概念的完整生命周期：

```typescript
// 文件：src/domain/account/Account.ts
export class Account extends AggregateRoot<string> {
  private _ownerId: string              // 所有者
  private _ownerName: string
  private _balance: Money              // 餘額（值對象）
  private _status: AccountStatus       // 狀態
  private _currency: string
  private _createdAt: Date
  private _updatedAt: Date

  // ✅ 所有與「帳戶」相關的狀態都在這裡
  // 不應該有「貸款」或「卡片」相關狀態
}
```

#### 2️⃣ 工廠方法

使用工廠方法確保聚合根創建時的一致性：

```typescript
// ✅ 工廠方法：確保創建時發出正確的事件
static open(
  id: string,
  ownerId: string,
  ownerName: string,
  currency: string,
  initialDepositCents: number
): Account {
  const now = new Date()
  const account = new Account(
    id,
    ownerId,
    ownerName,
    Money.of(initialDepositCents),
    'active',  // 新帳戶必須是 active
    currency,
    now,
    now
  )

  // 發出對應的領域事件
  account.addDomainEvent(
    new AccountOpened(id, {
      ownerId,
      ownerName,
      currency,
      initialBalanceCents: initialDepositCents
    })
  )

  return account
}

// ❌ 避免公開構造函數，防止部分初始化
// public constructor(...) { }
```

#### 3️⃣ 私有構造函數

只有通過工廠方法才能創建聚合根實例：

```typescript
// ✅ 私有構造函數
private constructor(
  id: string,
  ownerId: string,
  ownerName: string,
  balance: Money,
  status: AccountStatus,
  currency: string,
  createdAt: Date,
  updatedAt: Date
) {
  super(id)
  this._ownerId = ownerId
  // ... 初始化其他字段
}

// ✅ 只能通過工廠方法創建
const account = Account.open(...)
```

#### 4️⃣ 業務方法

聚合根的方法應該代表真實的業務操作：

```typescript
// ✅ 業務方法：代表業務操作
deposit(amountCents: number): void {
  this.assertActive()
  this._balance = this._balance.add(Money.of(amountCents))
  this._updatedAt = new Date()

  this.addDomainEvent(
    new MoneyDeposited(this.id, {
      amountCents,
      newBalanceCents: this._balance.cents
    })
  )
}

// ❌ 避免 getter/setter：直接暴露狀態
// get balance() { return this._balance }
// set balance(value) { this._balance = value }
```

#### 5️⃣ 業務規則驗證

聚合根應該驗證所有業務規則，確保不變量 (Invariants) 不被破壞：

```typescript
// ✅ 在聚合根中驗證業務規則
withdraw(amountCents: number): void {
  this.assertActive()  // 規則1：帳戶必須 active

  const amount = Money.of(amountCents)
  if (!this._balance.isGreaterThanOrEqual(amount)) {
    // 規則2：餘額不能為負
    throw new Error(`Insufficient funds: ...`)
  }

  this._balance = this._balance.subtract(amount)
  // ...
}

private assertActive(): void {
  if (this._status !== 'active') {
    throw new Error('Account is frozen, operation not allowed')
  }
}

// ❌ 避免在應用層進行業務規則驗證
// if (repository.getBalance(id) >= amount) {
//   repository.updateBalance(id, ...)
// }
```

#### 6️⃣ 事件生成

狀態改變時，聚合根應該生成對應的領域事件：

```typescript
// ✅ 每個狀態改變都對應一個事件
freeze(reason?: string): void {
  if (this._status === 'frozen') {
    throw new Error('Account is already frozen')
  }

  this._status = 'frozen'
  this._updatedAt = new Date()

  // 發出對應的領域事件
  this.addDomainEvent(new AccountFrozen(this.id, { reason }))
}

// 事件被應用層使用，發送到事件總線
// 事件監聽器根據事件更新讀取模型
```

#### 7️⃣ 聚合根邊界

聚合根應該是事務的邊界。在本系統中，轉帳涉及兩個帳戶，但每個帳戶是獨立的聚合根：

```typescript
// ✅ 正確：聚合根間通過事件通信
class Account {
  // 步驟1：源帳戶發起轉帳
  initiateTransfer(transferId: string, toAccountId: string, amountCents: number) {
    this.addDomainEvent(new TransferInitiated(...))
  }

  // 步驟2：（由 Saga 調用）源帳戶應用扣款
  applyTransferDebit(amountCents: number, transferId: string) {
    this._balance = this._balance.subtract(Money.of(amountCents))
    this.addDomainEvent(new TransferDebitApplied(...))
  }
}

// ❌ 錯誤：聚合根間直接調用
// account1.transfer(account2, amount)
```

## 💎 實體 (Entities)

實體是具有標識和生命周期的對象。在本系統中，`Account` 是主要的實體。

### 實體 vs 值對象

| 特性 | 實體 | 值對象 |
|------|------|--------|
| 標識 | 有 ID | 無 ID（按值比較） |
| 可變性 | 可變 | 不可變 |
| 生命周期 | 有生命周期 | 無生命周期 |
| 示例 | Account | Money |

```typescript
// 實體：Account
const account1 = new Account('id-123', ...)
const account2 = new Account('id-123', ...)
account1 === account2  // false（不同對象）
account1.id === account2.id  // true（相同標識）

// 值對象：Money
const money1 = Money.of(1000)
const money2 = Money.of(1000)
money1 === money2  // false（不同對象，但我們不在乎）
money1.isEqual(money2)  // true（相同值）
```

## 💰 值對象 (Value Objects)

值對象是不可變的、無標識的對象，只按其值進行比較。

### Money 值對象示例

```typescript
// 文件：src/domain/shared/Money.ts
export class Money {
  private constructor(private readonly _cents: number) {}

  // ✅ 工廠方法
  static of(cents: number): Money {
    if (cents < 0) throw new Error('Money cannot be negative')
    if (!Number.isInteger(cents)) throw new Error('Money must be integer cents')
    return new Money(cents)
  }

  // ✅ 只提供計算方法，返回新的 Money 對象（不可變）
  add(other: Money): Money {
    return Money.of(this._cents + other._cents)
  }

  subtract(other: Money): Money {
    return Money.of(this._cents - other._cents)
  }

  // ✅ 只提供查詢方法（無副作用）
  isGreaterThanOrEqual(other: Money): boolean {
    return this._cents >= other._cents
  }

  get cents(): number {
    return this._cents
  }

  // ✅ 值對象的等值比較
  isEqual(other: Money): boolean {
    return this._cents === other._cents
  }
}
```

### 使用值對象的優勢

```typescript
// ❌ 不用值對象的危險
class Account {
  balance: number = 1000  // 容易被誤操作

  deposit(amount: number) {
    this.balance = this.balance + amount  // 沒有驗證
  }

  badCode() {
    this.balance = -500  // 可能導致負數！
  }
}

// ✅ 使用值對象的安全性
class Account {
  private _balance: Money = Money.of(1000)

  deposit(amountCents: number) {
    const amount = Money.of(amountCents)  // 驗證發生在這裡
    this._balance = this._balance.add(amount)  // 新對象
  }

  badCode() {
    // this._balance = Money.of(-500)  // 直接創建會拋出異常！
  }
}
```

### 值對象設計原則

1. **不可變**：一旦創建不能改變
2. **自驗證**：工廠方法驗證有效性
3. **無副作用**：方法調用不改變狀態
4. **按值比較**：相同值 = 相同對象

## 📢 領域事件 (Domain Events)

領域事件代表已發生的重要業務事件。

### 領域事件特點

```typescript
// ✅ 領域事件特點
export class MoneyDeposited extends DomainEvent {
  // 1. 過去式命名
  // 2. 包含完整上下文
  // 3. 不可變（所有屬性 readonly）
  // 4. 包含聚合根 ID 和事件數據

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

// ✅ 使用
const event = new MoneyDeposited('account-123', {
  amountCents: 5000,
  newBalanceCents: 15000
})

// event.payload.amountCents = 6000  // ❌ 編譯時錯誤
```

### 領域事件的層次

```
DomainEvent (基類)
    ├── AccountOpened       // 帳戶相關事件
    ├── MoneyDeposited
    ├── MoneyWithdrawn
    ├── AccountFrozen
    ├── AccountUnfrozen
    └── TransferXxxx        // 轉帳相關事件
         ├── TransferInitiated
         ├── TransferDebitApplied
         ├── TransferCreditApplied
         ├── TransferCompleted
         └── TransferFailed
```

### 事件發出與分發

```typescript
// 步驟 1：聚合根發出事件
class Account {
  deposit(amountCents: number) {
    this._balance = this._balance.add(Money.of(amountCents))
    this.addDomainEvent(new MoneyDeposited(this.id, { ... }))
  }
}

// 步驟 2：應用層分發事件
class DepositMoneyCommandHandler {
  async handle(command) {
    const account = await repository.findById(...)
    account.deposit(command.amountCents)
    await repository.save(account)

    // 關鍵：從聚合根中提取事件並分發
    await dispatchAggregateEvents(account, this.eventManager)
  }
}

// 步驟 3：事件監聽器響應
core.hooks.addAction('event:MoneyDeposited', (event: MoneyDeposited) => {
  readModelListener.handleMoneyDeposited(event)
  sseManager.broadcast('MoneyDeposited', event)
})
```

## 🏛️ 倉庫模式 (Repository Pattern)

倉庫提供聚合根集合的抽象，隱藏持久化細節。

### 接口設計

```typescript
// 文件：src/infrastructure/repositories/IAccountRepository.ts
export interface IAccountRepository {
  findById(id: string): Promise<Account | null>
  save(account: Account): Promise<void>
  delete(id: string): Promise<void>
}
```

### 實現

```typescript
// 文件：src/infrastructure/repositories/InMemoryAccountRepository.ts
export class InMemoryAccountRepository implements IAccountRepository {
  private accounts = new Map<string, Account>()

  async findById(id: string): Promise<Account | null> {
    return this.accounts.get(id) ?? null
  }

  async save(account: Account): Promise<void> {
    this.accounts.set(account.id, account)
  }

  async delete(id: string): Promise<void> {
    this.accounts.delete(id)
  }
}
```

### 倉庫的關鍵責任

1. **聚合根的檢索和存儲**
2. **隐藏持久化細節**
3. **確保領域不依賴持久化技術**

```typescript
// ✅ 倉庫在應用層使用
class DepositMoneyCommandHandler {
  async handle(command) {
    // 應用層不知道帳戶存在哪裡（內存、數據庫等）
    const account = await repository.findById(command.accountId)
    account.deposit(command.amountCents)
    await repository.save(account)  // 保存聚合根
  }
}

// ❌ 避免：直接訪問持久化層
// const account = db.query('SELECT * FROM accounts WHERE id = ...')
```

## 🎯 領域服務 (Domain Services)

領域服務實現跨越多個聚合根的業務邏輯，特別是分佈式事務（Saga）。

### TransferSaga：跨聚合根的業務流程

```typescript
// 文件：src/application/sagas/TransferSaga.ts
export class TransferSaga {
  // ✅ 領域服務：協調多個聚合根間的轉帳流程
  // 它不是聚合根，而是一個無狀態的協調服務

  async handleTransferInitiated(event: TransferInitiated): Promise<void> {
    const { fromAccountId, toAccountId, amountCents, transferId } = event.payload

    try {
      // 第 1 步：加載源帳戶聚合根
      const fromAccount = await this.repository.findById(fromAccountId)
      if (!fromAccount) throw new Error('Source account not found')

      // 第 2 步：執行業務操作（產生事件）
      fromAccount.applyTransferDebit(amountCents, transferId)

      // 第 3 步：保存聚合根
      await this.repository.save(fromAccount)

      // 第 4 步：分發事件
      await dispatchAggregateEvents(fromAccount, this.eventManager)
    } catch (error) {
      // 第 5 步：失敗補償
      await this.compensate(transferId, error)
    }
  }
}
```

### 為什麼需要領域服務？

```
情況 1：單個聚合根內的業務邏輯
  ✅ 在聚合根中實現（如 Account.deposit）

情況 2：多個聚合根間的業務流程
  ✅ 使用領域服務（如 TransferSaga）

情況 3：複雜的業務規則涉及多個概念
  ✅ 領域服務 + 多個聚合根
```

## 🔄 完整的 DDD 流程示例

### 轉帳業務流程（一個完整的 DDD 應用示例）

```typescript
// ═══════════════════════════════════════════════════════════════════════

// 第一層：表現層 - HTTP 請求
// 文件：src/presentation/http/controllers/TransferController.ts

async initiateTransfer(c: GravitoContext) {
  // 1️⃣ 驗證外部輸入
  const { fromAccountId, toAccountId, amountCents } =
    InitiateTransferRequest.parse(c.req.body)

  // 2️⃣ 創建命令
  const command = new InitiateTransferCommand(
    fromAccountId,
    toAccountId,
    amountCents
  )

  // 3️⃣ 分發到應用層
  const result = await c.app.bus.dispatch(command)
  return c.json({ success: true, transferId: result })
}

// ═══════════════════════════════════════════════════════════════════════

// 第二層：應用層 - 命令處理
// 文件：src/application/commands/InitiateTransferCommand.ts

export class InitiateTransferCommandHandler
  implements CommandHandler<InitiateTransferCommand> {

  async handle(command: InitiateTransferCommand): Promise<string> {
    // 1️⃣ 加載聚合根（通過倉庫）
    const fromAccount = await this.repository.findById(command.fromAccountId)
    if (!fromAccount) {
      throw new Error('Source account not found')
    }

    // 生成 transfer ID
    const transferId = uuid()

    // 2️⃣ 執行業務操作（調用聚合根方法）
    // 這裡不直接執行扣款，而只是發起轉帳請求
    fromAccount.initiateTransfer(
      transferId,
      command.toAccountId,
      command.amountCents
    )

    // 3️⃣ 保存聚合根狀態
    await this.repository.save(fromAccount)

    // 4️⃣ 分發領域事件到事件總線
    await dispatchAggregateEvents(fromAccount, this.eventManager)

    return transferId
  }
}

// ═══════════════════════════════════════════════════════════════════════

// 第三層：領域層 - 業務邏輯
// 文件：src/domain/account/Account.ts

export class Account extends AggregateRoot<string> {
  initiateTransfer(transferId: string, toAccountId: string, amountCents: number) {
    // 1️⃣ 驗證業務規則
    this.assertActive()

    // 2️⃣ 改變聚合根狀態（不直接扣款，只發起請求）
    // 實際扣款由 Saga 在後續步驟執行

    // 3️⃣ 生成領域事件
    this.addDomainEvent(
      new TransferInitiated(this.id, {
        transferId,
        fromAccountId: this.id,
        toAccountId,
        amountCents
      })
    )
  }

  applyTransferDebit(amountCents: number, transferId: string) {
    this.assertActive()
    const amount = Money.of(amountCents)

    // 驗證業務規則：餘額充足
    if (!this._balance.isGreaterThanOrEqual(amount)) {
      throw new Error(`Insufficient funds for transfer`)
    }

    // 執行轉帳扣款
    this._balance = this._balance.subtract(amount)
    this._updatedAt = new Date()

    // 生成對應的事件
    this.addDomainEvent(
      new TransferDebitApplied(this.id, {
        transferId,
        amountCents,
        newBalanceCents: this._balance.cents
      })
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════

// 第四層：基礎設施層 - Saga 編排
// 文件：src/application/sagas/TransferSaga.ts

export class TransferSaga {
  async handleTransferInitiated(event: TransferInitiated) {
    const { transferId, fromAccountId, toAccountId, amountCents } = event.payload

    try {
      // 1️⃣ 加載源帳戶
      const fromAccount = await this.repository.findById(fromAccountId)

      // 2️⃣ 應用扣款
      fromAccount.applyTransferDebit(amountCents, transferId)
      await this.repository.save(fromAccount)

      // 3️⃣ 分發 TransferDebitApplied 事件
      await dispatchAggregateEvents(fromAccount, this.eventManager)

      // 4️⃣ Saga 進入下一步（由 TransferDebitApplied 事件觸發）
    } catch (error) {
      // 補償機制：轉帳失敗
      await this.compensate(transferId, error.message)
    }
  }

  async handleTransferDebitApplied(event: TransferDebitApplied) {
    const { transferId } = event.payload
    const state = this.sagaStates.get(transferId)

    try {
      // 加載目標帳戶
      const toAccount = await this.repository.findById(state.toAccountId)

      // 應用入款
      toAccount.applyTransferCredit(state.amountCents, transferId)
      await this.repository.save(toAccount)

      // 分發 TransferCreditApplied 事件
      await dispatchAggregateEvents(toAccount, this.eventManager)
    } catch (error) {
      // 補償機制：需要退款
      await this.compensateWithRefund(transferId, state, error.message)
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════

// 第五層：基礎設施層 - 讀取模型更新
// 文件：src/infrastructure/listeners/UpdateReadModelListener.ts

export class UpdateReadModelListener {
  handleTransferDebitApplied(event: TransferDebitApplied) {
    // 更新讀取模型
    this.accountReadModel.updateBalance(
      event.aggregateId,
      event.payload.newBalanceCents
    )

    // 記錄交易歷史
    this.transactionReadModel.addTransaction({
      id: event.eventId,
      accountId: event.aggregateId,
      type: 'transfer_debit',
      transferId: event.payload.transferId,
      amountCents: event.payload.amountCents,
      timestamp: event.timestamp
    })
  }
}

// ═══════════════════════════════════════════════════════════════════════
```

## 🎓 DDD 應用步驟清單

### 設計新的聚合根時

- [ ] **識別有界上下文**：這個聚合根屬於哪個業務領域？
- [ ] **定義聚合根核心**：主要職責是什麼？
- [ ] **設計值對象**：有哪些值對象應該內嵌？
- [ ] **定義業務不變量**：必須維護的業務規則有哪些？
- [ ] **定義領域事件**：狀態改變時產生什麼事件？
- [ ] **設計工廠方法**：如何安全地創建聚合根？
- [ ] **實現倉庫接口**：持久化接口是什麼？

### 實現新的業務用例時

- [ ] **創建命令類**：定義用戶的意圖
- [ ] **實現命令處理器**：協調聚合根和倉庫
- [ ] **發出領域事件**：確保每個狀態改變都有事件
- [ ] **創建事件監聽器**：更新讀取模型
- [ ] **設計 Saga 流程**（如涉及多個聚合根）：定義補償邏輯

## 🚨 常見 DDD 反模式

### ❌ 反模式 1：貧血模型

```typescript
// ❌ 錯誤：所有邏輯都在應用層
class Account {
  balance: number
  status: string
  // 只有數據，沒有行為
}

class DepositCommandHandler {
  async handle(command) {
    const account = await repository.findById(...)
    // ❌ 業務邏輯在這裡
    if (account.status !== 'active') throw new Error(...)
    account.balance += command.amount
    await repository.save(account)
  }
}

// ✅ 正確：邏輯在聚合根中
class Account {
  private _balance: number
  private _status: string

  deposit(amount: number) {
    this.assertActive()  // 業務邏輯在這裡
    this._balance += amount
  }
}
```

### ❌ 反模式 2：聚合根太大

```typescript
// ❌ 錯誤：一個聚合根包含所有業務邏輯
class GigantAccount {
  // 帳戶數據
  // 貸款數據
  // 卡片數據
  // 保險數據
  // ... 500+ 行代碼
}

// ✅ 正確：多個聚合根，各自在自己的有界上下文
class Account { /* 只處理帳戶 */ }
class Loan { /* 在貸款上下文中 */ }
class Card { /* 在卡片上下文中 */ }
```

### ❌ 反模式 3：跨聚合根直接引用

```typescript
// ❌ 錯誤：直接引用
class TransferSaga {
  async transfer(fromAccount: Account, toAccount: Account, amount: number) {
    fromAccount.withdraw(amount)
    toAccount.deposit(amount)
  }
}

// ✅ 正確：通過 ID 和事件通信
class TransferSaga {
  async handleTransferInitiated(event) {
    const fromAccount = await repository.findById(event.fromAccountId)
    fromAccount.applyTransferDebit(...)
    // toAccount 由另一個事件處理
  }
}
```

## 🔍 關鍵 DDD 術語參考

| 術語 | 中文 | 作用 |
|------|------|------|
| Entity | 實體 | 有標識和生命周期 |
| Value Object | 值對象 | 無標識、不可變 |
| Aggregate | 聚合 | 一致性邊界 |
| Aggregate Root | 聚合根 | 聚合的入口點 |
| Domain Event | 領域事件 | 記錄重要業務事件 |
| Repository | 倉庫 | 聚合根的持久化抽象 |
| Domain Service | 領域服務 | 跨聚合根的業務邏輯 |
| Bounded Context | 有界上下文 | 模型的邊界 |
| Ubiquitous Language | 通用語言 | 整個團隊的統一術語 |

---

通過應用 DDD，我們確保了系統的業務邏輯是清晰、可測試且可維護的。核心業務規則被封裝在聚合根中，不依賴框架或持久化技術，使得系統具有高度的靈活性和可擴展性。
