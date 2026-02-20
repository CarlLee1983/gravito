# 📡 事件驅動架構完全指南

本指南詳細介紹事件驅動架構 (Event-Driven Architecture, EDA) 的核心概念、實現模式、Saga 補償機制和故障處理。

## 🎯 事件驅動架構概念

### 什麼是事件驅動架構？

事件驅動架構是一種計算機架構模式，其中應用和系統通過生成、捕捉、處理和響應事件來進行通信。

```
傳統架構（同步調用）
┌──────────┐       ┌──────────┐       ┌──────────┐
│ Service A├──────▶│ Service B├──────▶│ Service C│
└──────────┘       └──────────┘       └──────────┘
   (等待)            (等待)            (等待)
   ↓ (阻塞)         ↓ (阻塞)           ↓ (阻塞)
   耦合度高、性能低、容易失敗


事件驅動架構（非同步事件推送）
┌──────────┐         ┌──────────────┐
│ Service A├────────▶│  Event Bus   │
└──────────┘         └──┬───────┬───┘
   (發出事件)           │       │
                    ┌───▼─┐  ┌─▼───┐
                    │ServiceB│ │ServiceC│  (異步監聽)
                    └───────┘  └───────┘
   解耦、高性能、容錯好
```

### 核心特點

| 特點 | 描述 |
|------|------|
| **異步性** | 事件發佈者不需要等待訂閱者響應 |
| **解耦** | 組件之間通過事件間接通信，降低耦合度 |
| **可擴展性** | 易於添加新的事件訂閱者 |
| **容錯性** | 訂閱者失敗不影響發佈者 |
| **實時性** | 事件實時推送，近即時反應 |

## 🔄 事件流生命周期

```
┌─────────────────────────────────────────────────────────────┐
│  1. 事件發起                                                │
│     domain object 執行操作 → 產生領域事件                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  2. 事件收集                                                │
│     事件累積在 Aggregate 中，不立即分發                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  3. 事件持久化                                              │
│     Repository.save() 保存 Aggregate 狀態                  │
│     （事件與命令一起原子化存儲）                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  4. 事件分發                                                │
│     dispatchAggregateEvents() 將事件發送到事件總線         │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│  5. 事件發佈                                                │
│     事件總線 (EventManager) 廣播事件到所有訂閱者           │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴─────────┬──────────┐
        │                    │          │
┌───────▼────────┐  ┌────────▼──┐  ┌───▼──────────┐
│ Saga 監聽      │  │ ReadModel  │  │ SSE 監聽     │
│ 編排下一步     │  │ 更新投影   │  │ 推送到前端   │
└────────────────┘  └────────────┘  └──────────────┘
        │
        └──────────▶ 触发新的事件或命令
                     (事件驅動的連鎖反應)
```

## 📝 領域事件 (Domain Events)

### 事件結構

```typescript
// 文件：src/domain/account/events/MoneyDeposited.ts

// 所有事件都繼承自 DomainEvent
export class MoneyDeposited extends DomainEvent {
  constructor(
    aggregateId: string,  // 發生事件的聚合根 ID
    public readonly payload: {  // 事件數據
      amountCents: number       // 存款金額
      newBalanceCents: number   // 新餘額
    }
  ) {
    super(aggregateId)
  }
}

// DomainEvent 基類自動提供：
// - eventId: 唯一事件 ID
// - aggregateId: 聚合根 ID
// - timestamp: 事件發生時間
// - occurredOn: 別名 timestamp
```

### 事件命名規範

```typescript
// ✅ 過去式（已發生）
AccountOpened           // 帳戶已打開
MoneyDeposited         // 金錢已存入
TransferDebitApplied   // 轉帳扣款已應用
TransferCompleted      // 轉帳已完成

// ❌ 避免現在式或命令式
// OpenAccount          // ❌ 命令式
// DepositMoney        // ❌ 命令式
// DebitApplying       // ❌ 進行式
```

### 事件的語義

```typescript
// ✅ 事件代表「已發生的事實」
const event = new MoneyDeposited('account-123', {
  amountCents: 5000,
  newBalanceCents: 15000
})

// 事件說的是：
// 「帳戶 account-123 已存入 5000 分，新餘額是 15000 分」

// 這是一個「事實」，它已經發生了，無法改變
// 你可以根據這個事實採取行動，但不能改變這個事實本身
```

### 事件的不可變性

```typescript
// ✅ 事件類中所有字段都是 readonly
export class MoneyDeposited extends DomainEvent {
  constructor(
    aggregateId: string,
    public readonly payload: {  // ← readonly
      readonly amountCents: number  // ← readonly
      readonly newBalanceCents: number  // ← readonly
    }
  ) { }
}

// ✅ 編譯時保護
const event = new MoneyDeposited('account-123', {
  amountCents: 5000,
  newBalanceCents: 15000
})

// event.payload.amountCents = 6000  // ✅ 編譯時錯誤

// ✅ 如需修改，創建新事件
const correctedEvent = new MoneyDeposited('account-123', {
  amountCents: 6000,
  newBalanceCents: 16000
})
```

## 🎪 事件發佈 (Publishing)

### 在聚合根中發出事件

```typescript
// 文件：src/domain/account/Account.ts

export class Account extends AggregateRoot<string> {
  private _balance: Money

  // ✅ 業務操作同時產生事件
  deposit(amountCents: number): void {
    // 1. 驗證業務規則
    this.assertActive()

    // 2. 改變狀態
    this._balance = this._balance.add(Money.of(amountCents))
    this._updatedAt = new Date()

    // 3. 添加事件（未分發）
    this.addDomainEvent(
      new MoneyDeposited(this.id, {
        amountCents,
        newBalanceCents: this._balance.cents
      })
    )
  }

  // 4️⃣ 事件由應用層分發（見下面）
}
```

### 在應用層分發事件

```typescript
// 文件：src/application/commands/DepositMoneyCommand.ts

export class DepositMoneyCommandHandler {
  async handle(command: DepositMoneyCommand): Promise<void> {
    // 1️⃣ 加載聚合根
    const account = await this.repository.findById(command.accountId)
    if (!account) throw new Error('Account not found')

    // 2️⃣ 執行業務操作（在聚合根中發出事件）
    account.deposit(command.amountCents)

    // 3️⃣ 保存聚合根（原子化存儲）
    await this.repository.save(account)

    // 4️⃣ 分發累積的事件到事件總線
    await dispatchAggregateEvents(account, this.eventManager)
  }
}

// 文件：src/application/utils/EventDispatcher.ts
export async function dispatchAggregateEvents(
  aggregate: AggregateRoot,
  eventManager: EventManager
): Promise<void> {
  // 提取所有未分發的事件
  const events = aggregate.pullDomainEvents()

  // 逐個分發每個事件
  for (const event of events) {
    await eventManager.dispatch(event as any)
  }
}
```

## 🎧 事件訂閱 (Subscribing)

### 基於 Hook 的訂閱

```typescript
// 文件：src/providers/EventServiceProvider.ts

export class EventServiceProvider extends ServiceProvider {
  async boot(core: PlanetCore): Promise<void> {
    // ✅ 訂閱特定事件
    core.hooks.addAction('event:MoneyDeposited', async (event: MoneyDeposited) => {
      // 當 MoneyDeposited 事件發佈時執行此回調
      console.log(`Money deposited: ${event.payload.amountCents}`)
    })

    // ✅ 多個訂閱者可以監聽同一個事件
    core.hooks.addAction('event:MoneyDeposited', async (event: MoneyDeposited) => {
      // 訂閱者 2：更新讀取模型
      await readModelListener.handleMoneyDeposited(event)
    })

    core.hooks.addAction('event:MoneyDeposited', async (event: MoneyDeposited) => {
      // 訂閱者 3：推送到 SSE
      sseManager.broadcast('MoneyDeposited', event)
    })
  }
}
```

### 事件訂閱者的責任

```
┌──────────────────────────────────────────────┐
│          事件訂閱者責任分類                  │
├──────────────────────────────────────────────┤
│ 1. Saga 訂閱者 (協調者)                     │
│    └─ 監聽事件，協調下一步操作             │
│    └─ 可能觸發新的命令或補償機制            │
│                                             │
│ 2. ReadModel 訂閱者 (投影)                  │
│    └─ 監聽事件，更新查詢優化的讀取模型     │
│    └─ 不修改寫模型                          │
│                                             │
│ 3. SSE 訂閱者 (通知)                        │
│    └─ 監聽事件，將其推送到客戶端           │
│    └─ 不執行業務邏輯                        │
│                                             │
│ 4. DLQ 訂閱者 (監控)                        │
│    └─ 監聽失敗事件，記錄到死信隊列         │
│    └─ 用於監控和告警                        │
└──────────────────────────────────────────────┘
```

## ⚙️ Saga 模式

### 什麼是 Saga？

Saga 是一種管理長期運行的業務流程（Long-Running Business Process）並在失敗時補償的模式。

### Saga 的兩種風格

#### 1️⃣ 編排型 Saga (Orchestration)

中央協調器主動控制流程：

```
┌────────────────────────────────────────────────────────┐
│             Saga Orchestrator                         │
│          (TransferSaga - 中央協調器)                  │
│                                                        │
│  Step 1: 等待 TransferInitiated                       │
│          ↓ 調用 Service A (apply debit)              │
│                                                        │
│  Step 2: 等待 TransferDebitApplied                    │
│          ↓ 調用 Service B (apply credit)             │
│                                                        │
│  Step 3: 等待 TransferCreditApplied                   │
│          ↓ 發出 TransferCompleted                    │
│                                                        │
│  失敗時：調用補償方法 (compensation)                 │
└────────────────────────────────────────────────────────┘
```

#### 2️⃣ 編舞型 Saga (Choreography)

各服務通過事件相互通信（本系統使用）：

```
┌──────────┐                ┌──────────┐
│ Service A│ TransferInitiated
└────┬─────┘ ─────────────▶ │Saga Step1 │
     │                       └────┬─────┘
     │                             │
     │ TransferDebitApplied        │
     │ ◀─────────────────────────┐ │
     │                           │ │
     │                       ┌───▼─┴───┐
     │                       │Saga Step2 │
     │                       └───┬─────┬┘
     │                           │     │
     │       TransferCreditApplied│     │
     │◀──────────────────────────┘     │
     │                                 │
     └────────────────────────────────▶│
         TransferCompleted/Failed
```

### 本系統的 Saga 實現（編舞型）

```typescript
// 文件：src/application/sagas/TransferSaga.ts

export class TransferSaga {
  // ┌─────────────────────────────────────────────┐
  // │ Step 1: 初始化轉帳                         │
  // └─────────────────────────────────────────────┘
  async handleTransferInitiated(event: TransferInitiated): Promise<void> {
    const { transferId, fromAccountId, toAccountId, amountCents } = event.payload

    // 記錄 Saga 狀態
    this.sagaStates.set(transferId, {
      transferId,
      fromAccountId,
      toAccountId,
      amountCents,
      status: 'initiated'
    })

    try {
      // 加載並修改源帳戶
      const fromAccount = await this.repository.findById(fromAccountId)
      fromAccount.applyTransferDebit(amountCents, transferId)
      await this.repository.save(fromAccount)

      // 更新 Saga 狀態
      const state = this.sagaStates.get(transferId)!
      this.sagaStates.set(transferId, { ...state, status: 'debit_applied' })

      // 分發事件，觸發下一步
      await dispatchAggregateEvents(fromAccount, this.eventManager)
    } catch (error) {
      // 失敗補償
      await this.compensate(transferId, error.message)
    }
  }

  // ┌─────────────────────────────────────────────┐
  // │ Step 2: 應用扣款後，應用入款               │
  // └─────────────────────────────────────────────┘
  async handleTransferDebitApplied(event: TransferDebitApplied): Promise<void> {
    const { transferId } = event.payload
    const state = this.sagaStates.get(transferId)
    if (!state) return

    try {
      // 加載並修改目標帳戶
      const toAccount = await this.repository.findById(state.toAccountId)
      toAccount.applyTransferCredit(state.amountCents, transferId)
      await this.repository.save(toAccount)

      // 更新 Saga 狀態
      this.sagaStates.set(transferId, { ...state, status: 'credit_applied' })

      // 分發事件，觸發下一步
      await dispatchAggregateEvents(toAccount, this.eventManager)
    } catch (error) {
      // 失敗補償：需要退款
      await this.compensateWithRefund(transferId, state, error.message)
    }
  }

  // ┌─────────────────────────────────────────────┐
  // │ Step 3: 完成轉帳                           │
  // └─────────────────────────────────────────────┘
  async handleTransferCreditApplied(event: TransferCreditApplied): Promise<void> {
    const { transferId } = event.payload
    const state = this.sagaStates.get(transferId)
    if (!state) return

    // 更新 Saga 狀態為完成
    this.sagaStates.set(transferId, { ...state, status: 'completed' })

    // 發出完成事件
    const completedEvent = new TransferCompleted(state.fromAccountId, {
      transferId,
      fromAccountId: state.fromAccountId,
      toAccountId: state.toAccountId,
      amountCents: state.amountCents
    })

    await this.eventManager.dispatch(completedEvent as any)
  }
}
```

## 🔄 補償機制 (Compensation)

### 補償的必要性

```
成功路徑：
Step 1 (扣款) ✅
    ↓
Step 2 (入款) ✅
    ↓
成功完成 ✅

失敗路徑：
Step 1 (扣款) ✅
    ↓
Step 2 (入款) ❌ 失敗！
    ↓
補償：Step 1 inverse (退款)
    ↓
整個事務回滾到初始狀態
```

### 補償實現

```typescript
// 文件：src/application/sagas/TransferSaga.ts

// ─────────────────────────────────────────────────────
// 情況 1：扣款失敗（無需補償）
// ─────────────────────────────────────────────────────
private async compensate(transferId: string, reason: string): Promise<void> {
  const state = this.sagaStates.get(transferId)
  if (!state) return

  // 標記為失敗
  this.sagaStates.set(transferId, { ...state, status: 'failed' })

  // 發出失敗事件
  const failedEvent = new TransferFailed(state.fromAccountId, {
    transferId,
    fromAccountId: state.fromAccountId,
    toAccountId: state.toAccountId,
    amountCents: state.amountCents,
    reason
  })

  // 記錄到死信隊列
  this.deadLetterListener.handleTransferFailed(failedEvent)

  // 分發失敗事件
  await this.eventManager.dispatch(failedEvent as any)
}

// ─────────────────────────────────────────────────────
// 情況 2：入款失敗（需要補償扣款）
// ─────────────────────────────────────────────────────
private async compensateWithRefund(
  transferId: string,
  state: SagaState,
  reason: string
): Promise<void> {
  // 標記為失敗
  this.sagaStates.set(transferId, { ...state, status: 'failed' })

  try {
    // 補償：將錢退回源帳戶
    const fromAccount = await this.repository.findById(state.fromAccountId)
    if (fromAccount) {
      fromAccount.deposit(state.amountCents)
      await this.repository.save(fromAccount)

      // ⚠️ 重要：清除退款事件，防止無限循環
      // 否則 MoneyDeposited 事件會再次觸發這個 Saga
      fromAccount.pullDomainEvents()
    }
  } catch (refundError) {
    // 退款失敗：這是一個嚴重的問題，需要人工介入
    console.error('Refund failed, manual intervention required', refundError)
    // 記錄到死信隊列以供監控
  }

  // 發出失敗事件
  const failedEvent = new TransferFailed(state.fromAccountId, {
    transferId,
    fromAccountId: state.fromAccountId,
    toAccountId: state.toAccountId,
    amountCents: state.amountCents,
    reason
  })

  this.deadLetterListener.handleTransferFailed(failedEvent)
  await this.eventManager.dispatch(failedEvent as any)
}
```

## 🎯 補償規則

| 操作 | 失敗時的補償 |
|------|------------|
| 扣款 | 無（還未發生） |
| 入款 | 執行相反的扣款（退款） |
| 凍結帳戶 | 解凍帳戶 |
| 發出折扣 | 撤銷折扣 |

### 補償的實現約束

```typescript
// ✅ 補償必須是冪等的（多次執行結果相同）
private async compensate(transferId: string) {
  // 第 1 次執行：狀態為 initiated → 轉為 failed
  // 第 2 次執行：狀態已是 failed → 不再改變（冪等）
  const state = this.sagaStates.get(transferId)
  if (state.status === 'failed') return  // 已補償，不重複
}

// ✅ 補償應該儘量簡單
private async compensate(transferId: string) {
  // 只做最小必要的操作
  // 不要在補償中進行複雜的業務邏輯
}

// ❌ 避免：補償也可能失敗
// 如果無法確保補償成功，應該記錄到 DLQ
```

## 💾 讀取模型 (Projections / Read Models)

### 為什麼需要讀取模型？

```
寫模型（聚合根）:
  └─ 針對一致性和業務規則優化
  └─ 查詢涉及複雜的數據組合可能很慢

讀取模型：
  └─ 針對特定查詢優化
  └─ 通過投影，預計算和去規範化
  └─ 查詢快速（通常 O(1) 或 O(log n)）
```

### 讀取模型的實現

```typescript
// 文件：src/infrastructure/projections/AccountReadModel.ts

export class AccountReadModel {
  // 優化的讀取數據結構
  private accounts = new Map<string, {
    id: string
    ownerName: string
    balanceCents: number
    status: AccountStatus
    currency: string
    createdAt: Date
  }>()

  // 投影方法：根據領域事件更新
  addAccount(data: AccountData): void {
    this.accounts.set(data.id, {
      id: data.id,
      ownerName: data.ownerName,
      balanceCents: data.balanceCents,
      status: data.status,
      currency: data.currency,
      createdAt: data.createdAt
    })
  }

  updateBalance(accountId: string, newBalance: number): void {
    const account = this.accounts.get(accountId)
    if (account) {
      account.balanceCents = newBalance
    }
  }

  // 快速查詢
  getBalance(accountId: string): number {
    return this.accounts.get(accountId)?.balanceCents ?? 0
  }

  getAllAccounts() {
    return Array.from(this.accounts.values())
  }
}
```

### 讀取模型的更新流程

```
AccountOpened 事件
    ↓
EventManager 分發
    ↓
UpdateReadModelListener.handleAccountOpened()
    ↓
AccountReadModel.addAccount()
    ↓
讀取模型已更新，查詢立即返回最新數據
```

### 讀取模型的一致性保證

```typescript
// ✅ 最終一致性：事件異步更新讀取模型

// 時間軸：
// T0: 命令執行，聚合根狀態改變
// T1: 事件分發
// T2: 讀取模型監聽器接收事件
// T3: 讀取模型更新完成

// 在 T0 到 T3 之間，讀取模型可能未更新（不一致）
// 但最終（T3）會達成一致

// 在實踐中，T1 到 T3 通常 < 10ms，對用戶不可感知
```

## 🚨 死信隊列 (Dead Letter Queue, DLQ)

### DLQ 的作用

死信隊列用於捕捉和記錄無法成功處理的事件。

```typescript
// 文件：src/infrastructure/listeners/DeadLetterListener.ts

export class DeadLetterListener {
  private dlqRecords: DLQRecord[] = []

  // 記錄轉帳失敗
  handleTransferFailed(event: TransferFailed): void {
    this.dlqRecords.push({
      eventType: 'TransferFailed',
      aggregateId: event.aggregateId,
      payload: event.payload,
      timestamp: new Date(),
      reason: event.payload.reason
    })

    console.error(`[DLQ] Transfer failed: ${event.payload.transferId}`, event.payload)
  }

  // 查詢 DLQ 記錄
  getDLQRecords(): DLQRecord[] {
    return this.dlqRecords
  }
}
```

### API 端點：查詢 DLQ

```typescript
// 文件：src/presentation/http/routes.ts

router.get('/api/dlq', (c) => {
  const records = deadLetterListener.getDLQRecords()
  return c.json({
    success: true,
    data: records,
    total: records.length
  })
})

// 示例響應：
// {
//   "success": true,
//   "data": [
//     {
//       "eventType": "TransferFailed",
//       "aggregateId": "account-123",
//       "payload": {
//         "transferId": "transfer-456",
//         "reason": "Insufficient funds for transfer"
//       },
//       "timestamp": "2024-02-21T10:30:00Z"
//     }
//   ],
//   "total": 1
// }
```

## 📡 Server-Sent Events (SSE)

### SSE 的作用

SSE 用於向客戶端實時推送事件。

```typescript
// 文件：src/presentation/http/SSEManager.ts

export class SSEManager {
  private clients: ReadableStreamDefaultController[] = []

  // 客戶端訂閱
  registerClient(controller: ReadableStreamDefaultController): void {
    this.clients.push(controller)
  }

  // 客戶端取消訂閱
  unregisterClient(controller: ReadableStreamDefaultController): void {
    const index = this.clients.indexOf(controller)
    if (index !== -1) {
      this.clients.splice(index, 1)
    }
  }

  // 廣播事件到所有訂閱客戶端
  broadcast(eventName: string, data: any): void {
    const encoder = new TextEncoder()
    const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`

    for (const client of this.clients) {
      try {
        client.enqueue(encoder.encode(message))
      } catch (error) {
        // 如果客戶端斷開連接，移除它
        this.unregisterClient(client)
      }
    }
  }
}
```

### 前端訂閱 SSE

```html
<!-- 文件：public/index.html -->

<script>
  // 連接到 SSE
  const eventSource = new EventSource('http://localhost:3000/api/events/stream')

  // 監聽連接成功
  eventSource.addEventListener('connected', (e) => {
    console.log('Connected to event stream')
  })

  // 監聽 AccountOpened 事件
  eventSource.addEventListener('AccountOpened', (e) => {
    const event = JSON.parse(e.data)
    console.log('Account opened:', event)
  })

  // 監聽 MoneyDeposited 事件
  eventSource.addEventListener('MoneyDeposited', (e) => {
    const event = JSON.parse(e.data)
    console.log('Money deposited:', event)
  })

  // 監聽 TransferCompleted 事件
  eventSource.addEventListener('TransferCompleted', (e) => {
    const event = JSON.parse(e.data)
    console.log('Transfer completed:', event)
  })
</script>
```

## 🔍 完整的事件驅動流程

### 轉帳流程完整追蹤

```
用戶發送 POST /api/transfers
│
├─ 表現層 (Presentation)
│  └─ TransferController.initiateTransfer()
│     ├─ 驗證請求 (Zod)
│     └─ 創建命令：InitiateTransferCommand
│
├─ 應用層 (Application)
│  └─ InitiateTransferCommandHandler
│     ├─ 加載源帳戶 (Repository)
│     ├─ 調用 account.initiateTransfer()
│     ├─ 保存聚合根 (Repository)
│     └─ 分發事件：TransferInitiated
│
├─ 事件總線 (EventManager)
│  └─ 分發 TransferInitiated
│
├─ 訂閱者 1：Saga
│  └─ TransferSaga.handleTransferInitiated()
│     ├─ 加載源帳戶
│     ├─ 調用 account.applyTransferDebit()
│     ├─ 保存聚合根
│     └─ 分發事件：TransferDebitApplied
│
├─ 訂閱者 2：ReadModel
│  └─ UpdateReadModelListener.handleTransferInitiated()
│     └─ (無相關投影)
│
├─ 訂閱者 3：SSE
│  └─ SSEManager.broadcast('TransferInitiated', ...)
│     └─ 推送到前端
│
├─ 事件總線再次分發 TransferDebitApplied
│  └─ Saga 步驟 2...
│
└─ 最終結果：轉帳完成或失敗
```

## 🛡️ 事件驅動系統的最佳實踐

### ✅ DO (做這些)

1. **事件應該是自描述的**
   ```typescript
   // ✅ 包含完整上下文
   new TransferDebitApplied(aggregateId, {
     transferId,
     amountCents,
     newBalanceCents
   })
   ```

2. **訂閱者應該是冪等的**
   ```typescript
   // ✅ 多次執行結果相同
   handleMoneyDeposited(event) {
     const existing = this.transactions.find(t => t.id === event.eventId)
     if (!existing) {
       this.transactions.add(event)
     }
   }
   ```

3. **事件應該是不可變的**
   ```typescript
   // ✅ readonly 字段
   export class MoneyDeposited extends DomainEvent {
     constructor(
       aggregateId: string,
       public readonly payload: {...}
     ) { }
   }
   ```

4. **錯誤應該被記錄**
   ```typescript
   // ✅ 失敗事件記錄到 DLQ
   try {
     await process()
   } catch (error) {
     dlqListener.record(error)
   }
   ```

### ❌ DONT (避免這些)

1. **❌ 事件命名為現在式或命令式**
   ```typescript
   // ❌ 錯誤
   new Deposit(...)     // 應該是 MoneyDeposited
   new Transfer(...)    // 應該是 TransferInitiated
   ```

2. **❌ 在訂閱者中執行長期操作**
   ```typescript
   // ❌ 錯誤：阻塞事件處理
   handleOrder(event) {
     const result = await externalAPI.call()  // 可能很慢
   }

   // ✅ 正確：使用隊列或異步任務
   handleOrder(event) {
     queue.enqueue({ type: 'process_order', event })
   }
   ```

3. **❌ 訂閱者相互依賴**
   ```typescript
   // ❌ 錯誤
   ListenerA 等待 ListenerB 完成
   ListenerB 等待 ListenerA 完成

   // ✅ 正確：通過事件鏈接
   ListenerA 分發事件 → ListenerB 監聽事件
   ```

4. **❌ 在事件中暴露敏感信息**
   ```typescript
   // ❌ 錯誤
   new PaymentProcessed(id, {
     creditCard: "4111-1111-1111-1111",  // 敏感！
     cvv: "123"
   })

   // ✅ 正確
   new PaymentProcessed(id, {
     maskedCard: "4111-****-****-1111",
     status: "success"
   })
   ```

## 🔧 故障排除

### 問題 1：事件丟失

**症狀**：某些事件沒有被訂閱者處理

**原因**：
- 訂閱者尚未註冊就發佈事件
- 訂閱者崩潰了

**解決方案**：
```typescript
// ✅ 確保訂閱者在啟動時註冊
export class EventServiceProvider {
  async boot(core: PlanetCore) {
    // 在應用啟動時設定所有訂閱者
    core.hooks.addAction('event:AccountOpened', ...)
    core.hooks.addAction('event:MoneyDeposited', ...)
  }
}

// ✅ 添加錯誤處理
core.hooks.addAction('event:MoneyDeposited', async (event) => {
  try {
    await listener.handle(event)
  } catch (error) {
    logger.error('Event handling failed', error)
    dlq.record(event, error)
  }
})
```

### 問題 2：讀取模型不一致

**症狀**：查詢返回的數據與實際狀態不符

**原因**：讀取模型投影失敗或延遲

**解決方案**：
```typescript
// ✅ 添加日誌
handleMoneyDeposited(event) {
  console.log(`[ReadModel] Updating balance for ${event.aggregateId}`)
  this.accountReadModel.updateBalance(event.aggregateId, event.payload.newBalanceCents)
}

// ✅ 實現讀取模型重建
rebuildReadModel() {
  // 從事件存儲重新加載所有事件並重建投影
}
```

### 問題 3：無限補償循環

**症狀**：補償操作觸發相同的失敗事件，導致無限循環

**原因**：補償後的事件被相同的 Saga 監聽

**解決方案**：
```typescript
// ✅ 清除補償後的事件
private async compensateWithRefund() {
  const fromAccount = await this.repository.findById(...)
  fromAccount.deposit(amount)  // 這會產生 MoneyDeposited 事件
  await this.repository.save(fromAccount)

  // 🔑 清除事件，防止重新觸發
  fromAccount.pullDomainEvents()
}
```

---

事件驅動架構通過異步、解耦的方式，使系統具有高度的可擴展性和容錯能力。理解事件、Saga 和補償機制是實施 EDA 的關鍵。
