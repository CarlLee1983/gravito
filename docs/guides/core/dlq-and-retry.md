# 死信隊列 (DLQ) 與重試機制指南

**版本**: 1.0
**最後更新**: 2026-02-23
**狀態**: ✅ 完成

## 目錄

- [概述](#概述)
- [核心概念](#核心概念)
- [快速開始](#快速開始)
- [重試策略](#重試策略)
- [死信隊列管理](#死信隊列管理)
- [最佳實踐](#最佳實踐)
- [故障排除](#故障排除)
- [API 參考](#api-參考)

---

## 概述

Gravito 框架提供了完整的**重試機制**和**死信隊列 (DLQ)** 支持，用於處理異步事件的失敗情況。

### 主要特性

- ✅ **智能重試** - 支持指數和線性退避算法
- ✅ **持久化 DLQ** - 失敗事件自動保存到數據庫
- ✅ **可配置策略** - 每個事件都可定義獨特的重試規則
- ✅ **手動干預** - 支持重新入隊、解決或放棄失敗事件
- ✅ **可觀測性** - 完整的統計和查詢功能

### 典型流程

```
事件派發 (doActionAsync)
    ↓
執行失敗 ❌
    ↓
自動重試 (指數/線性退避)
    ↓
    ├─ 成功 ✅ → 完成
    │
    └─ 超出最大重試次數
            ↓
        進入 DLQ
            ↓
        手動干預或自動恢復
```

---

## 核心概念

### 1. 重試策略 (RetryPolicy)

定義失敗事件如何重試：

```typescript
interface RetryPolicy {
  maxRetries: number              // 最大重試次數，默認 3
  backoff: 'exponential' | 'linear' // 退避算法
  initialDelayMs: number          // 初始延遲（ms），默認 1000
  maxDelayMs: number              // 最大延遲（ms），默認 30000
  dlqAfterMaxRetries?: boolean    // 超過重試後進入 DLQ，默認 true
}
```

#### 退避算法

**指數退避**（推薦）：
```
第 1 次重試：1秒
第 2 次重試：2秒
第 3 次重試：4秒
第 4 次重試：8秒（最多 30 秒）
```

優勢：快速增加延遲，減少對故障服務的壓力

**線性退避**：
```
第 1 次重試：1秒
第 2 次重試：2秒
第 3 次重試：3秒
第 4 次重試：4秒（最多 30 秒）
```

優勢：更可預測的延遲時間

### 2. 死信隊列 (DLQ)

存儲失敗事件的隊列，支持兩種級別：

**內存級 DLQ**：
- 應用運行期間存儲
- 重啟後丟失
- 輕量級，無持久化開銷

**持久化 DLQ**：
- 保存到數據庫
- 永久存儲，支持查詢和統計
- 適合生產環境

### 3. 事件選項 (EventOptions)

```typescript
interface EventOptions {
  async?: boolean                 // 異步派發
  priority?: 'high' | 'normal' | 'low' // 優先級
  timeout?: number                // 執行超時（ms）
  retry?: {
    maxRetries?: number
    backoff?: 'exponential' | 'linear'
    initialDelayMs?: number
    maxDelayMs?: number
    dlqAfterMaxRetries?: boolean
  }
}
```

---

## 快速開始

### 基本配置

```typescript
import { HookManager } from '@gravito/core'

// 創建管理器（內存級 DLQ）
const manager = new HookManager({
  enableDLQ: true,                    // 啟用 DLQ
  migrationMode: 'async',             // 使用異步模式
})

// 配置持久化 DLQ（需要數據庫）
import { DB } from '@gravito/atlas'

const manager = new HookManager({
  enableDLQ: true,
  enablePersistentDLQ: true,
  db: DB,                             // 傳入數據庫連接
})
```

### 簡單重試例子

```typescript
// 註冊事件處理器
manager.addAction('order:created', async (order) => {
  await processOrder(order)
})

// 派發事件（啟用重試）
await manager.doActionAsync('order:created', order, {
  async: true,
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,
    dlqAfterMaxRetries: true,
  },
})
```

### 查詢 DLQ

```typescript
// 獲取內存級 DLQ
const dlq = manager.getDLQ()
const failedEvents = dlq?.list({ eventName: 'order:created' })

// 獲取持久化 DLQ
const dlqManager = manager.getPersistentDLQManager()
const stats = await dlqManager.getStats()
// 輸出：{ total: 42, byEvent: {...}, byStatus: {...} }
```

---

## 重試策略

### 預設策略

Gravito 提供了常見場景的預設策略：

```typescript
import { getPresetRetryPolicy } from '@gravito/core'

// 外部 API 調用
const apiPolicy = getPresetRetryPolicy('external-api')
// { maxRetries: 5, backoff: 'exponential', ... }

// 數據庫操作
const dbPolicy = getPresetRetryPolicy('database')
// { maxRetries: 2, backoff: 'linear', dlqAfterMaxRetries: false, ... }

// 消息隊列
const mqPolicy = getPresetRetryPolicy('message-queue')
// { maxRetries: 3, backoff: 'exponential', ... }
```

### 自定義策略

```typescript
// 保守策略（少重試）
const conservativePolicy = {
  maxRetries: 1,
  backoff: 'linear',
  initialDelayMs: 500,
  maxDelayMs: 5000,
  dlqAfterMaxRetries: true,
}

// 激進策略（多重試）
const aggressivePolicy = {
  maxRetries: 10,
  backoff: 'exponential',
  initialDelayMs: 100,
  maxDelayMs: 60000,
  dlqAfterMaxRetries: true,
}
```

### 動態策略選擇

```typescript
// 根據事件類型選擇不同策略
function getRetryPolicy(eventName: string) {
  switch (eventName) {
    case 'payment:processed':
      return getPresetRetryPolicy('external-api')
    case 'cache:invalidate':
      return { maxRetries: 1, backoff: 'linear', ... }
    default:
      return getDefaultRetryPolicy()
  }
}

await manager.doActionAsync(eventName, data, {
  async: true,
  retry: getRetryPolicy(eventName),
})
```

---

## 死信隊列管理

### 內存級 DLQ 操作

```typescript
const dlq = manager.getDLQ()

// 列表查詢
const events = dlq?.list({
  eventName: 'order:created',
  limit: 50,
})

// 統計
const total = dlq?.getCount()
const orderCount = dlq?.getCountByEvent('order:created')

// 刪除
const deleted = manager.deleteDLQEntry(entryId)

// 重新入隊
const success = await manager.requeueDLQEntry(entryId)

// 批量重新入隊
const requeuedCount = await manager.requeueDLQBatch('order:created')

// 清空
dlq?.clear()
```

### 持久化 DLQ 操作

```typescript
const dlqManager = manager.getPersistentDLQManager()

// 查詢單個事件
const event = await dlqManager.getById(dlqId)

// 列表查詢
const events = await dlqManager.list({
  eventName: 'order:created',
  status: 'pending',
  limit: 100,
  offset: 0,
})

// 統計
const stats = await dlqManager.getStats()
// {
//   total: 42,
//   byEvent: { 'order:created': 30, 'payment:processed': 12 },
//   byStatus: { pending: 40, requeued: 2, resolved: 0, abandoned: 0 }
// }

// 重新入隊
await dlqManager.requeue(dlqId)

// 批量重新入隊
const result = await dlqManager.retryBatch({ eventName: 'order:created' })
// { total: 30, succeeded: 28, failed: 2 }

// 標記為已解決
await dlqManager.resolve(dlqId, '已手動修復')

// 放棄事件
await dlqManager.abandon(dlqId, '數據損壞，無法恢復')

// 刪除
await dlqManager.deleteEntry(dlqId)

// 批量刪除
await dlqManager.deleteEntries([id1, id2, id3])
```

---

## 最佳實踐

### 1. 選擇合適的重試策略

```typescript
// ❌ 不推薦：所有事件使用相同策略
await manager.doActionAsync(eventName, data, {
  retry: { maxRetries: 3 }
})

// ✅ 推薦：根據事件類型選擇策略
if (isExternalApiCall) {
  options.retry = getPresetRetryPolicy('external-api')
} else if (isDatabaseOperation) {
  options.retry = getPresetRetryPolicy('database')
}
```

### 2. 監控 DLQ 大小

```typescript
// 定期檢查 DLQ 統計
setInterval(async () => {
  const stats = await dlqManager.getStats()

  if (stats.total > 1000) {
    console.warn('DLQ 事件過多，可能存在系統問題')
    notifyOps()
  }

  // 記錄指標
  metrics.gauge('dlq.total_events', stats.total)
  metrics.gauge('dlq.pending_events', stats.byStatus.pending)
}, 60000) // 每分鐘檢查一次
```

### 3. 自動恢復失敗事件

```typescript
// 每小時自動重試 pending 事件
setInterval(async () => {
  const result = await dlqManager.retryBatch({ status: 'pending' })

  console.info(
    `自動重試完成：${result.succeeded} 成功，${result.failed} 失敗`
  )
}, 3600000) // 每小時執行一次
```

### 4. 實施告警

```typescript
// 監控特定事件的失敗率
manager.addAction('critical:operation', async (data) => {
  try {
    await performCriticalOperation(data)
  } catch (error) {
    // 立即告警（不等待重試）
    alerting.critical(
      `關鍵操作失敗：${error.message}`,
      { eventName: 'critical:operation', data }
    )
    throw error // 繼續重試
  }
})
```

### 5. DLQ 清理策略

```typescript
// 定期清理已解決的舊事件
setInterval(async () => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // 刪除一周前已解決的事件
  const resolved = await dlqManager.list({
    status: 'resolved',
    to: oneWeekAgo,
  })

  for (const event of resolved) {
    await dlqManager.deleteEntry(event.dlq_id)
  }

  console.info(`清理了 ${resolved.length} 個已解決的 DLQ 事件`)
}, 7 * 24 * 60 * 60 * 1000) // 每週執行一次
```

---

## 故障排除

### 問題 1：事件無限重試

**症狀**：事件不斷重試，從不進入 DLQ

**原因**：可能 `maxRetries` 設置過高或未啟用 `dlqAfterMaxRetries`

**解決方案**：

```typescript
// ❌ 會導致無限重試
await manager.doActionAsync(eventName, data, {
  retry: { maxRetries: Infinity }  // 不要這樣做
})

// ✅ 設置合理的最大重試次數
await manager.doActionAsync(eventName, data, {
  retry: {
    maxRetries: 5,
    dlqAfterMaxRetries: true,  // 確保啟用
  }
})
```

### 問題 2：DLQ 持續增長

**症狀**：DLQ 中的事件數量不斷增加

**原因**：系統存在持續性問題，或未實施恢復策略

**解決方案**：

```typescript
// 1. 檢查最近的 DLQ 事件
const recent = await dlqManager.list({
  limit: 10,
  offset: 0,
})

// 2. 分析錯誤信息
for (const event of recent) {
  console.log(`事件: ${event.event_name}`)
  console.log(`錯誤: ${event.last_error.message}`)
  console.log(`時間: ${new Date(event.failed_at)}`)
}

// 3. 修復根本原因，然後重試
const result = await dlqManager.retryBatch({
  eventName: 'problematic:event',
})
```

### 問題 3：重試延遲過長

**症狀**：事件需要很長時間才能重試

**原因**：退避延遲設置過大

**解決方案**：

```typescript
// ❌ 延遲太長
const policy = {
  initialDelayMs: 60000,   // 60 秒
  maxDelayMs: 600000,      // 10 分鐘
}

// ✅ 更合理的設置
const policy = {
  initialDelayMs: 1000,    // 1 秒
  maxDelayMs: 30000,       // 30 秒
}
```

---

## API 參考

### RetryEngine

```typescript
class RetryEngine {
  // 計算重試延遲
  calculateDelay(attemptCount: number, policy: RetryPolicy): number

  // 判斷是否應該重試
  shouldRetry(attemptCount: number, policy: RetryPolicy): boolean

  // 計算下次重試時間
  getNextRetryTime(
    retryCount: number,
    policy: RetryPolicy,
    baseTime?: number
  ): number

  // 驗證策略
  isValidPolicy(policy: RetryPolicy): boolean
}
```

### DeadLetterQueueManager

```typescript
class DeadLetterQueueManager {
  // 移至 DLQ
  async moveToDlq(
    eventName: string,
    payload: unknown,
    options: EventOptions,
    error: Error,
    attemptCount: number,
    retryPolicy?: RetryPolicy
  ): Promise<string>

  // 查詢
  async list(filter?: DLQManagerFilter): Promise<DLQRecord[]>
  async getById(dlqId: string): Promise<DLQRecord | undefined>

  // 操作
  async requeue(dlqId: string): Promise<void>
  async retryBatch(filter?: DLQManagerFilter): Promise<{
    total: number
    succeeded: number
    failed: number
  }>
  async resolve(dlqId: string, notes?: string): Promise<void>
  async abandon(dlqId: string, reason?: string): Promise<void>

  // 管理
  async deleteEntry(dlqId: string): Promise<boolean>
  async deleteEntries(dlqIds: string[]): Promise<number>
  async clear(includeResolved?: boolean): Promise<number>

  // 統計
  async getStats(): Promise<DLQStats>
  async getCountByEvent(eventName: string): Promise<number>
}
```

### HookManager DLQ 方法

```typescript
class HookManager {
  // 獲取 DLQ 管理器
  getPersistentDLQManager(): DeadLetterQueueManager | undefined

  // DLQ 操作
  async requeuePersistentDLQEntry(dlqId: string): Promise<boolean>
  async requeuePersistentDLQBatch(filter?: {
    eventName?: string
    status?: DLQStatus
  }): Promise<{ total: number; succeeded: number; failed: number }>

  // 統計
  async getPersistentDLQStats(): Promise<DLQStats | undefined>
}
```

---

## 總結

| 功能 | 內存級 DLQ | 持久化 DLQ |
|------|-----------|----------|
| 存儲位置 | 應用內存 | 數據庫 |
| 重啟後保留 | ❌ | ✅ |
| 查詢能力 | 基礎 | 完整 |
| 持久化成本 | 無 | 有 |
| 推薦場景 | 開發、測試 | 生產環境 |

---

## 相關文檔

- [異步事件系統遷移指南](../../operations/migration/async-events.md)
- [可觀測性指南](./observability.md)
- [任務實施詳情紀錄](../../archive/tasks/TASK_IMPLEMENTATION_RECORDS.md)

---

**版本歷史**

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.0 | 2026-02-03 | 初始版本，包含完整的 DLQ 和重試指南 |
