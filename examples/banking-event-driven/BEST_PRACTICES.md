# ⭐ 最佳實踐與常見問題

本文檔提供開發和維護銀行事件驅動系統的最佳實踐、常見陷阱和故障排除指南。

## 🎯 架構最佳實踐

### 1. 聚合根設計

#### ✅ DO: 聚合根應該小而專注

```typescript
// ✅ 正確：Account 聚合根專注於帳戶業務
export class Account extends AggregateRoot<string> {
  private _ownerId: string
  private _balance: Money
  private _status: AccountStatus

  // 清晰的業務方法
  deposit(amountCents: number): void { ... }
  withdraw(amountCents: number): void { ... }
  applyTransferDebit(amountCents: number, transferId: string): void { ... }
}

// ❌ 錯誤：包含所有業務邏輯的巨型聚合根
export class GigantAggregateRoot {
  // 帳戶數據
  // 貸款數據
  // 卡片數據
  // 保險數據
  // ... 1000+ 行代碼
}
```

#### ✅ DO: 使用工廠方法和私有構造函數

```typescript
// ✅ 正確：確保一致的初始化
export class Account extends AggregateRoot<string> {
  private constructor(...) { }

  static open(id, ownerId, ownerName, currency, initialDeposit) {
    const account = new Account(...)
    account.addDomainEvent(new AccountOpened(...))
    return account
  }

  // 負載重建（如果從事件存儲加載）
  static from(id, ownerId, balance, status) {
    return new Account(id, ownerId, balance, status)
  }
}

// ❌ 錯誤：公開構造函數，無法保證一致性
export class Account {
  public constructor(ownerId, balance, status) { }
  // 任何地方都可以創建部分初始化的對象
}
```

#### ✅ DO: 業務規則應該在聚合根中驗證

```typescript
// ✅ 正確：業務規則在聚合根中
withdraw(amountCents: number): void {
  // 規則 1：帳戶必須 active
  this.assertActive()

  // 規則 2：餘額必須充足
  const amount = Money.of(amountCents)
  if (!this._balance.isGreaterThanOrEqual(amount)) {
    throw new Error('Insufficient funds')
  }

  this._balance = this._balance.subtract(amount)
}

// ❌ 錯誤：業務規則在應用層
class WithdrawCommandHandler {
  async handle(command) {
    const account = await repository.findById(...)
    // ❌ 規則檢查在這裡
    if (account.status !== 'active') throw new Error(...)
    if (account.balance < command.amount) throw new Error(...)
    account.balance -= command.amount
  }
}
```

### 2. 事件設計

#### ✅ DO: 事件應該包含完整的上下文

```typescript
// ✅ 正確：包含所有必要信息
export class MoneyDeposited extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly payload: {
      amountCents: number
      newBalanceCents: number  // 包含新狀態
      depositType: 'manual' | 'transfer'
      timestamp: string
    }
  ) {
    super(aggregateId)
  }
}

// ❌ 錯誤：信息不足
export class MoneyDeposited extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly payload: {
      amountCents: number  // 缺少新餘額，訂閱者無法更新讀取模型
    }
  ) { }
}
```

#### ✅ DO: 事件應該是不可變的

```typescript
// ✅ 正確：所有字段都是 readonly
export class MoneyDeposited extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly payload: {
      readonly amountCents: number
      readonly newBalanceCents: number
    }
  ) { }
}

// ❌ 錯誤：可變的事件
export class MoneyDeposited {
  amountCents: number  // ❌ 可以被修改
  constructor(amount) {
    this.amountCents = amount
  }
}
```

#### ✅ DO: 事件應該記錄「已發生的事實」

```typescript
// ✅ 正確：過去式，不可反駁的事實
class MoneyDeposited { }       // 錢已存入（已發生）
class AccountFrozen { }         // 帳戶已凍結（已發生）
class TransferCompleted { }     // 轉帳已完成（已發生）

// ❌ 錯誤：命令式或進行式
class DepositMoney { }          // 請存入（命令）
class FreezeAccount { }         // 正在凍結帳戶（進行式）
class CompleteTransfer { }      // 完成轉帳（命令）
```

### 3. Saga 編排

#### ✅ DO: Saga 應該是無狀態的（除了 saga 狀態本身）

```typescript
// ✅ 正確：Saga 不依賴全局狀態
export class TransferSaga {
  private sagaStates = new Map<string, SagaState>()

  async handleTransferInitiated(event: TransferInitiated) {
    const state: SagaState = {
      transferId: event.payload.transferId,
      fromAccountId: event.payload.fromAccountId,
      // ... 記錄 saga 進度
    }
    this.sagaStates.set(state.transferId, state)

    // 操作聚合根和倉庫，不依賴其他全局狀態
    const account = await this.repository.findById(...)
  }
}

// ❌ 錯誤：Saga 依賴全局狀態
export class TransferSaga {
  private currentUser: User  // ❌ 全局狀態
  private cache: Map         // ❌ 全局狀態

  async handle(event) {
    // 依賴全局狀態，難以測試和調試
  }
}
```

#### ✅ DO: 補償應該是冪等的

```typescript
// ✅ 正確：多次執行結果相同
private async compensateWithRefund(transferId, state) {
  // 檢查是否已補償
  if (state.status === 'failed') return  // 已補償，不重複

  // 執行補償
  const account = await this.repository.findById(state.fromAccountId)
  account.deposit(state.amountCents)
  await this.repository.save(account)

  // 標記為已補償
  state.status = 'failed'
}

// ❌ 錯誤：非冪等的補償
private async compensate(transferId) {
  const account = await this.repository.findById(...)
  account.balance += amount  // 如果執行兩次，金額會翻倍！
}
```

#### ✅ DO: 避免無限事件循環

```typescript
// ✅ 正確：補償後清除事件
private async compensateWithRefund(transferId, state) {
  try {
    const account = await this.repository.findById(...)
    account.deposit(state.amountCents)  // 這會產生 MoneyDeposited 事件
    await this.repository.save(account)

    // 清除事件，防止重新觸發
    account.pullDomainEvents()
  } catch (error) {
    // 處理異常
  }
}

// ❌ 錯誤：導致無限循環
private async compensateWithRefund(transferId, state) {
  const account = await this.repository.findById(...)
  account.deposit(state.amountCents)  // 產生 MoneyDeposited 事件
  await this.repository.save(account)
  // ❌ 沒有清除事件，MoneyDeposited 會再次觸發其他 Saga！
}
```

### 4. 讀取模型

#### ✅ DO: 讀取模型應該針對查詢優化

```typescript
// ✅ 正確：優化的讀取模型
export class AccountReadModel {
  // 按帳戶 ID 快速查詢（O(1)）
  private accounts = new Map<string, AccountData>()

  // 按帳戶所有者查詢（如需要，添加索引）
  private ownerIndex = new Map<string, string[]>()

  // 投影更新
  addAccount(data) {
    this.accounts.set(data.id, data)
    if (!this.ownerIndex.has(data.ownerId)) {
      this.ownerIndex.set(data.ownerId, [])
    }
    this.ownerIndex.get(data.ownerId).push(data.id)
  }

  // 快速查詢
  getAccount(id): AccountData { }
  getAccountsByOwner(ownerId): AccountData[] { }
}

// ❌ 錯誤：讀取模型執行複雜計算
export class AccountReadModel {
  getAverageBalance() {
    // ❌ 每次查詢都要遍歷所有帳戶
    return this.accounts.reduce((sum, a) => sum + a.balance) / this.accounts.size
  }
}
```

#### ✅ DO: 讀取模型應該獨立於寫模型

```typescript
// ✅ 正確：完全分離
// 寫模型：Account 聚合根（規範化）
class Account {
  id: string
  balance: Money
  status: AccountStatus
}

// 讀取模型：AccountReadModel（可能去規範化）
class AccountReadModel {
  id: string
  ownerName: string
  balanceCents: number    // 直接存儲，不需要 Money 值對象
  status: string
  transactionCount: number
  lastTransaction: Date
}

// ❌ 錯誤：讀取模型依賴寫模型
// class AccountReadModel extends Account { }
// // 讀取模型變成了聚合根的複製，無法優化查詢
```

## 🔍 常見陷阱與解決方案

### 陷阱 1️⃣：事件丟失

**症狀**：某些事件沒有被訂閱者處理

**原因**：
- 事件發佈時訂閱者還未就位
- 訂閱者拋出異常後沒有重試
- 同步事件總線，訂閱者失敗導致事件丟失

**解決方案**：

```typescript
// ✅ 確保訂閱者在啟動時設定
export class EventServiceProvider extends ServiceProvider {
  async boot(core: PlanetCore) {
    // 在應用啟動時註冊所有監聽器
    core.hooks.addAction('event:AccountOpened', async (event) => {
      await this.handleEvent(event)
    })
  }
}

// ✅ 添加錯誤處理和重試
core.hooks.addAction('event:MoneyDeposited', async (event) => {
  for (let i = 0; i < 3; i++) {  // 重試 3 次
    try {
      await listener.handleMoneyDeposited(event)
      return
    } catch (error) {
      if (i === 2) throw error  // 最後一次失敗拋出
      await sleep(100 * (i + 1))  // 指數退避
    }
  }
})

// ✅ 使用死信隊列捕捉失敗事件
try {
  await listener.handle(event)
} catch (error) {
  dlqListener.recordFailure(event, error)
}
```

### 陷阱 2️⃣：無限事件循環

**症狀**：事件不斷重複產生，系統不斷處理相同的事件

**原因**：
- 補償操作產生的事件被相同的 Saga 監聽
- 讀取模型更新後發出事件，再次觸發相同邏輯

**解決方案**：

```typescript
// ✅ 在補償後清除事件
private async compensateWithRefund(transferId, state) {
  const account = await this.repository.findById(state.fromAccountId)
  account.deposit(state.amountCents)
  await this.repository.save(account)

  // 關鍵：清除事件，防止重新觸發
  account.pullDomainEvents()

  // 手動發出失敗事件
  const failedEvent = new TransferFailed(...)
  await this.eventManager.dispatch(failedEvent)
}

// ✅ 在讀取模型更新中添加冪等檢查
handleMoneyDeposited(event) {
  const existing = this.transactions.find(t => t.eventId === event.eventId)
  if (existing) return  // 已處理，不重複

  this.accountReadModel.updateBalance(event.aggregateId, ...)
  this.transactionReadModel.addTransaction(...)
}
```

### 陷阱 3️⃣：讀取模型不一致

**症狀**：查詢返回的數據與實際狀態不符

**原因**：
- 投影失敗導致數據未更新
- 事件監聽器異常終止
- 讀取模型和寫模型的邏輯不匹配

**解決方案**：

```typescript
// ✅ 添加詳細的日誌
handleMoneyDeposited(event) {
  console.log(`[ReadModel] Updating account ${event.aggregateId}`)
  console.log(`  Old balance: ${this.accountReadModel.getBalance(event.aggregateId)}`)

  this.accountReadModel.updateBalance(
    event.aggregateId,
    event.payload.newBalanceCents
  )

  console.log(`  New balance: ${this.accountReadModel.getBalance(event.aggregateId)}`)
}

// ✅ 實現讀取模型重建
async rebuildReadModel() {
  // 從事件存儲重新加載所有事件
  const events = await eventStore.getAllEvents()

  // 清空讀取模型
  this.accountReadModel.clear()

  // 重新應用所有事件
  for (const event of events) {
    this.listener.handle(event)
  }

  console.log('ReadModel rebuilt successfully')
}

// ✅ 在應用啟動時驗證一致性
async verifyConsistency() {
  const writeModel = await this.repository.findAll()
  const readModel = this.accountReadModel.getAll()

  for (const account of writeModel) {
    const readAccount = readModel.find(a => a.id === account.id)
    if (readAccount.balanceCents !== account.balance.cents) {
      throw new Error(`Inconsistency detected for account ${account.id}`)
    }
  }
}
```

### 陷阱 4️⃣：轉帳失敗不補償

**症狀**：轉帳失敗但金錢沒有退回

**原因**：
- Saga 補償邏輯不完整
- 補償異常未被處理

**解決方案**：

```typescript
// ✅ 完整的補償邏輯
private async compensateWithRefund(transferId, state, reason) {
  try {
    // 嘗試退款
    const fromAccount = await this.repository.findById(state.fromAccountId)
    fromAccount.deposit(state.amountCents)
    await this.repository.save(fromAccount)
    fromAccount.pullDomainEvents()

    console.log(`Refund successful for transfer ${transferId}`)
  } catch (refundError) {
    // 退款失敗：記錄到 DLQ，需要人工處理
    console.error(`Refund failed for transfer ${transferId}`, refundError)
    this.deadLetterListener.recordRefundFailure(transferId, refundError)

    // 發出告警
    alert(`CRITICAL: Refund failed for ${transferId}. Manual intervention required.`)
  }

  // 無論補償是否成功，都要發出失敗事件
  const failedEvent = new TransferFailed(state.fromAccountId, {
    transferId,
    reason: reason
  })

  this.deadLetterListener.handleTransferFailed(failedEvent)
  await this.eventManager.dispatch(failedEvent)
}
```

## 🧪 測試最佳實踐

### ✅ DO: 測試業務規則在聚合根中

```typescript
// ✅ 單元測試
describe('Account', () => {
  it('should not allow withdrawal from frozen account', () => {
    const account = Account.open(...)
    account.freeze()

    expect(() => account.withdraw(5000)).toThrow('Account is frozen')
  })

  it('should not allow withdrawal with insufficient funds', () => {
    const account = Account.open('id', 'owner', 'Alice', 'TWD', 10000)

    expect(() => account.withdraw(20000)).toThrow('Insufficient funds')
  })

  it('should generate MoneyDeposited event on deposit', () => {
    const account = Account.open('id', 'owner', 'Alice', 'TWD', 0)
    account.deposit(5000)

    const events = account.pullDomainEvents()
    expect(events).toHaveLength(2)  // AccountOpened + MoneyDeposited
    expect(events[1]).toBeInstanceOf(MoneyDeposited)
    expect(events[1].payload.amountCents).toBe(5000)
  })
})
```

### ✅ DO: 測試 Saga 的成功和失敗路徑

```typescript
// ✅ Saga 集成測試
describe('TransferSaga', () => {
  it('should complete transfer successfully', async () => {
    // 設定
    const fromAccount = Account.open(...)
    const toAccount = Account.open(...)
    await repository.save(fromAccount)
    await repository.save(toAccount)

    const saga = new TransferSaga(repository, eventManager, dlqListener)

    // 執行
    const event = new TransferInitiated('transfer-1', {
      fromAccountId: fromAccount.id,
      toAccountId: toAccount.id,
      amountCents: 5000
    })

    await saga.handleTransferInitiated(event)

    // 驗證
    const savedFrom = await repository.findById(fromAccount.id)
    expect(savedFrom.balance.cents).toBe(5000)  // 扣款成功

    // 繼續下一步...
  })

  it('should compensate when credit fails', async () => {
    // 設定：目標帳戶不存在
    const fromAccount = Account.open(...)
    await repository.save(fromAccount)

    const saga = new TransferSaga(repository, eventManager, dlqListener)

    const debitEvent = new TransferDebitApplied('transfer-1', {
      transferId: 'transfer-1',
      fromAccountId: fromAccount.id,
      toAccountId: 'nonexistent-account',
      amountCents: 5000
    })

    // 執行
    await saga.handleTransferDebitApplied(debitEvent)

    // 驗證：自動退款
    const refundedAccount = await repository.findById(fromAccount.id)
    expect(refundedAccount.balance.cents).toBe(10000)  // 退款成功

    // 驗證：失敗事件記錄
    const dlqRecords = dlqListener.getDLQRecords()
    expect(dlqRecords).toHaveLength(1)
    expect(dlqRecords[0].eventType).toBe('TransferFailed')
  })
})
```

## 📊 性能優化

### ✅ DO: 使用讀取模型進行查詢

```typescript
// ❌ 慢（O(n)）：遍歷所有帳戶
async getAllAccounts() {
  return Array.from(this.accounts.values())
}

// ✅ 快（O(1)）：直接從讀取模型查詢
async getAllAccounts() {
  return this.accountReadModel.getAll()
}
```

### ✅ DO: 批量事件分發

```typescript
// ❌ 慢：逐個分發事件
const events = aggregate.pullDomainEvents()
for (const event of events) {
  await eventManager.dispatch(event)
}

// ✅ 快：批量分發
const events = aggregate.pullDomainEvents()
await eventManager.dispatchBatch(events)
```

### ✅ DO: 緩存經常查詢的數據

```typescript
// ✅ 使用 LRU 緩存
export class CachedAccountRepository implements IAccountRepository {
  private cache = new LRUCache<string, Account>(maxSize: 1000)

  async findById(id: string): Promise<Account | null> {
    // 先查緩存
    if (this.cache.has(id)) {
      return this.cache.get(id)
    }

    // 再查數據庫
    const account = await this.database.findById(id)
    if (account) {
      this.cache.set(id, account)
    }

    return account
  }
}
```

## 🚀 部署最佳實踐

### ✅ DO: 監控事件處理延遲

```typescript
// 記錄事件處理時間
core.hooks.addAction('event:MoneyDeposited', async (event) => {
  const start = Date.now()

  await listener.handle(event)

  const duration = Date.now() - start
  metrics.recordEventProcessingTime('MoneyDeposited', duration)

  // 警告：如果處理時間過長
  if (duration > 100) {
    logger.warn(`Slow event processing: MoneyDeposited took ${duration}ms`)
  }
})
```

### ✅ DO: 添加健康檢查

```typescript
// 定期驗證一致性
setInterval(async () => {
  try {
    await verifyConsistency()
  } catch (error) {
    logger.error('Consistency check failed', error)
    alert('CRITICAL: Database consistency error')
  }
}, 60000)  // 每分鐘檢查一次
```

### ✅ DO: 備份讀取模型

```typescript
// 定期快照讀取模型，以便快速重建
async backupReadModel() {
  const snapshot = this.accountReadModel.toJSON()
  await storage.save('read-model-snapshot.json', snapshot)
}

// 恢復時
async restoreReadModel() {
  const snapshot = await storage.load('read-model-snapshot.json')
  this.accountReadModel.fromJSON(snapshot)
}
```

## ❓ 常見問題 (FAQ)

### Q1: 事件驅動架構是否意味著最終一致性？

**A**: 是的。寫模型（命令層）是強一致的，但讀模型（查詢層）是最終一致的。這通常不是問題，因為：
- 在實踐中，延遲 < 10ms（對用戶不可感知）
- 用戶看到的事件（SSE）是實時的
- 架構確保了最終的一致性

### Q2: 如果 Saga 補償失敗怎麼辦？

**A**: 補償失敗是一個嚴重的問題，需要人工處理。最佳實踐：
1. 記錄到死信隊列
2. 發出告警
3. 人工檢查並修復
4. 實施監控與告警系統

### Q3: 這個系統支持多少並發用戶？

**A**: 這個演示系統使用內存存儲，不適合生產。在生產環境中：
- 使用數據庫替代內存存儲
- 使用消息隊列替代同步事件總線
- 實施數據分片
- 預期 10,000+ QPS（取決於基礎設施）

### Q4: 如何應對網絡分割？

**A**: 事件驅動架構對網絡分割更具容錯能力：
- 如果訂閱者無法連接，事件進入死信隊列
- 網絡恢復後，可以重新處理事件
- 確保訂閱者是冪等的

### Q5: 如何監控系統健康狀態？

**A**: 實施以下監控：
1. **事件處理延遲**：記錄每個事件的處理時間
2. **死信隊列大小**：監控失敗事件數量
3. **讀取模型一致性**：定期驗證寫模型和讀模型的一致性
4. **SSE 連接數**：監控活躍客戶端
5. **Saga 狀態分佈**：監控 completed/failed 轉帳比例

### Q6: 這個架構支持事件溯源 (Event Sourcing) 嗎？

**A**: 支持。當前實現使用內存存儲，但架構已準備好遷移到完整的事件溯源：

```typescript
// 未來實現
class EventStoreBasedRepository implements IAccountRepository {
  async findById(id: string): Promise<Account> {
    // 從事件存儲加載歷史
    const events = await eventStore.getEvents(id)
    // 重放事件重構聚合根
    return Account.fromEvents(events)
  }
}
```

### Q7: 轉帳涉及兩個帳戶，但每個只能在一個數據庫中？

**A**: 是的，這是分佈式事務的核心挑戰。Saga 模式解決這個問題：
- Saga 是一個長期運行的業務流程
- 每一步都是局部事務（單個帳戶）
- 如果失敗，補償機制撤銷之前的步驟
- 確保了應用級別的一致性（雖然不是 ACID）

## 📚 進階學習資源

- **DDD 書籍**：《Domain-Driven Design》by Eric Evans
- **事件驅動**：《Building Event-Driven Microservices》by Adam Bellemare
- **Saga 模式**：《Microservices Patterns》by Chris Richardson
- **Event Sourcing**：EventStoreDB 官方文檔

---

通過遵循這些最佳實踐，你將能夠構建可維護、可擴展和可靠的事件驅動系統。記住：**簡單性和清晰性比聰明的技巧更重要**。
