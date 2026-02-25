# Phase 6B 實作計畫：Kafka Push/Pop 核心驅動程式

**狀態**: 規劃完成
**日期**: 2026-02-25
**預估工作量**: 3-4 小時
**代碼行數**: ~420 行（KafkaDriver） + ~550 行（測試）

---

## 執行摘要

Phase 6B 建立完整的 `KafkaDriver` 類別，實作 `QueueDriver` 介面的所有 20+ 方法。此驅動程式將利用 Phase 6A 的三大基礎元件（MessageBuffer、OffsetTracker、KafkaNotifier）橋接 Kafka 的 push 模型與 QueueDriver 的 pull 模型，提供 at-least-once 語意保證。

---

## 架構設計

```
KafkaDriver (implements QueueDriver)
├── Producer (Lazy Singleton)
│   ├── 首次 push 時初始化
│   ├── 自動重連機制
│   └── 批次發送最佳化
├── Consumer (Per-Topic Dynamic)
│   ├── 首次 pop 時初始化
│   ├── eachMessage → MessageBuffer (Phase 6A)
│   └── 動態訂閱新 topic
├── Admin (Lazy Singleton)
│   ├── Topic 管理
│   ├── Offset 查詢
│   └── 列表操作
└── 三大整合元件
    ├── MessageBuffer - Kafka push → pull 橋接
    ├── OffsetTracker - 連續確認 at-least-once
    └── KafkaNotifier - ReactiveStrategy 事件橋接
```

---

## 核心方法實作 (20+ 個)

### P0 必要方法（10 個）

| # | 方法 | 複雜度 | 優先級 |
|---|------|--------|--------|
| 1 | `push(queue, job, options?)` | 中 | P0 |
| 2 | `pop(queue)` | 中 | P0 |
| 3 | `popBlocking(queues, timeout)` | 中 | P0 |
| 4 | `popMany(queue, count)` | 低 | P0 |
| 5 | `complete(queue, job)` | 低 | P0 |
| 6 | `acknowledge(messageId)` | 低 | P0 |
| 7 | `fail(queue, job)` | 中 | P0 |
| 8 | `size(queue)` | 低 | P0 |
| 9 | `clear(queue)` | 低 | P0 |
| 10 | `createTopic(topic, options?)` | 低 | P0 |

### P1 重要選用方法（8 個）

| # | 方法 | 複雜度 | 依賴 |
|---|------|--------|------|
| 11 | `pushMany(queue, jobs)` | 低 | push |
| 12 | `stats(queue)` | 低 | buffer |
| 13 | `deleteTopic(topic)` | 低 | admin |
| 14 | `getQueues()` | 低 | admin |
| 15 | `getFailed(queue, start?, end?)` | 低 | DLQ buffer |
| 16 | `clearFailed(queue)` | 低 | DLQ buffer |
| 17 | `retryFailed(queue, count?)` | 中 | push + DLQ |
| 18 | `onNotify(queues, callback)` | 低 | notifier |

### P0 Reactive 通知方法（3 個）

| # | 方法 | 實作 |
|---|------|------|
| 19 | `enableNotifications()` | 委派 notifier.enable() |
| 20 | `disableNotifications()` | 委派 notifier.disable() |
| 21 | `subscribe?(queue, callback)` | 選用（Phase 6C） |

---

## 實作步驟 (9 階段)

### 階段 6B-1: Constructor 與設定 (~15 分鐘)

**檔案**: `packages/stream/src/drivers/kafka/KafkaDriver.ts`

```typescript
export class KafkaDriver implements QueueDriver {
  // 懶初始化單例
  private producer: KafkaProducerClient | null = null
  private consumer: KafkaConsumerClient | null = null
  private admin: KafkaAdminClient | null = null

  // Phase 6A 元件
  private readonly buffer: MessageBuffer
  private readonly offsetTracker: OffsetTracker
  private readonly notifier: KafkaNotifier

  // 內部狀態
  private readonly subscribedTopics = new Set<string>()
  private readonly knownQueues = new Set<string>()
  private readonly dlqBuffer = new Map<string, SerializedJob[]>()
  private readonly messageIdToMeta = new Map<string, {
    topic: string
    partition: number
    offset: string
  }>()
  private consumerRunning = false
  private offsetCommitTimer: ReturnType<typeof setInterval> | null = null

  constructor(config: KafkaDriverFullConfig) {
    // 驗證必要欄位
    // 合併預設值（不可變模式）
    // 初始化 Phase 6A 元件
  }
}
```

**檢查清單**:
- [ ] 所有必要屬性初始化
- [ ] 預設值正確設定
- [ ] 缺少 client 時拋出錯誤
- [ ] Phase 6A 元件正確初始化

---

### 階段 6B-2: Producer 與 Push (~25 分鐘)

**關鍵方法**:

```typescript
private async ensureProducer(): Promise<KafkaProducerClient> {
  // 單例懶初始化
}

async push(queue: string, job: SerializedJob, options?: JobPushOptions): Promise<void> {
  // 決定 message key (groupId → job.id)
  // 序列化 job → JSON payload
  // 發送到 topic
  // 記錄 knownQueues
}

async pushMany(queue: string, jobs: SerializedJob[]): Promise<void> {
  // 批次發送，分段以防 memory pressure
}
```

**關鍵設計決策**:
- Producer 使用 **singleton 模式**（全驅動程式共用一個）
- Message key 使用 **groupId 或 job.id** 決定分區
- **批次大小限制** 防止 payload 過大

**風險**:
- Producer.send() 可能失敗 → 需要錯誤處理和重試邏輯（Phase 6D）

**檢查清單**:
- [ ] ensureProducer 首次建立後複用
- [ ] push 正確序列化 job
- [ ] pushMany 分批發送
- [ ] knownQueues 正確更新

---

### 階段 6B-3: Consumer 初始化與 Pop (~45 分鐘)

**這是整個 Phase 6B 最複雜的部分 ⚠️**

**關鍵方法**:

```typescript
private async handleIncomingMessage(
  topic: string,
  partition: number,
  message: KafkaMessage
): Promise<void> {
  // 解析 payload
  // 追蹤 offset (OffsetTracker.track)
  // 建立 messageId → metadata 映射
  // 推入 MessageBuffer
  // 通知 KafkaNotifier
}

private async ensureConsumerForTopic(topic: string): Promise<void> {
  // 如果已訂閱則返回
  // 否則添加到 subscribedTopics
  // 如果 consumer 未運行，啟動它
  // 如果 consumer 已運行，需要重啟以動態訂閱新 topic
}

async pop(queue: string): Promise<SerializedJob | null> {
  await this.ensureConsumerForTopic(queue)
  const message = this.buffer.dequeue(queue)
  return message?.job ?? null
}

async popBlocking(queues: string | string[], timeout: number): Promise<SerializedJob | null> {
  // 確保所有 queue 的 consumer 已啟動
  // 嘗試立即拉取
  // 無則等待或超時
}

async popMany(queue: string, count: number): Promise<SerializedJob[]> {
  await this.ensureConsumerForTopic(queue)
  return this.buffer.dequeueMany(queue, count).map(m => m.job)
}
```

**已知限制** ⚠️ KafkaJS 要求 `subscribe()` 必須在 `run()` 之前呼叫:
- 動態新增 topic 需要 `disconnect()` → `subscribe()` → `run()`
- 實作 `restartConsumer()` 方法
- 在重啟前需 commit offset 防止遺失

**架構決策**:
```typescript
private async restartConsumer(): Promise<void> {
  // 1. 停止 offset commit loop
  // 2. 最後一次手動 commit
  // 3. Disconnect
  // 4. 重新 subscribe + run
}
```

**檢查清單**:
- [ ] handleIncomingMessage 正確解析和追蹤
- [ ] pop 返回正確 SerializedJob
- [ ] popBlocking 實現超時邏輯
- [ ] popMany 批次正確
- [ ] Consumer restart 機制穩定

---

### 階段 6B-4: Complete/Acknowledge/Fail + Offset Commit (~30 分鐘)

**關鍵方法**:

```typescript
async complete(queue: string, job: SerializedJob): Promise<void> {
  const meta = this.messageIdToMeta.get(job.id)
  if (meta) {
    this.offsetTracker.resolve(meta.topic, meta.partition, meta.offset)
    this.messageIdToMeta.delete(job.id)
  }
}

async acknowledge(messageId: string): Promise<void> {
  // 同 complete，但按 messageId
}

async fail(queue: string, job: SerializedJob): Promise<void> {
  // 發送到 DLQ topic ({queue}.dlq)
  // Resolve offset（標記為已處理）
  // 暫存到 dlqBuffer 如果發送失敗
}

private startOffsetCommitLoop(): void {
  // 定期呼叫 commitOffsets()
}

private async commitOffsets(): Promise<void> {
  // 取得可 commit 的 offset (OffsetTracker.getCommittableOffsets)
  // Kafka commit offset 需要 +1 (下一個要讀的位置)
  // 使用 BigInt 處理大 offset
}
```

**at-least-once 保證**:
```
Message arrives → Buffer → pop (application starts processing)
              ↓
         Application succeeds → complete() → offset resolve
              ↓
         Commit loop → commitOffsets() → offset = resolve + 1
```

重啟時，consumer 從 committed offset 開始消費 → at-least-once

**檢查清單**:
- [ ] complete/acknowledge 正確 resolve offset
- [ ] fail 送到 DLQ
- [ ] Offset commit 使用 +1
- [ ] Commit loop 定期執行
- [ ] Offset commit 失敗不致命（下次重試）

---

### 階段 6B-5: Topic 管理 (~15 分鐘)

**關鍵方法**:

```typescript
private async ensureAdmin(): Promise<KafkaAdminClient> {
  // 單例懶初始化
}

async createTopic(topic: string, options?: TopicOptions): Promise<void> {
  // 使用 admin.createTopics
  // 記錄到 knownQueues
}

async deleteTopic(topic: string): Promise<void> {
  // 使用 admin.deleteTopics
  // 清理 buffer、offsetTracker、knownQueues
}

async getQueues(): Promise<string[]> {
  // 優先返回 knownQueues
  // 嘗試從 admin.listTopics() 更新
  // 排除 DLQ topic
}
```

**檢查清單**:
- [ ] createTopic 建立並記錄
- [ ] deleteTopic 完整清理
- [ ] getQueues 排除 DLQ

---

### 階段 6B-6: Stats、Size 與 Notifications (~15 分鐘)

**關鍵方法**:

```typescript
async size(queue: string): Promise<number> {
  return this.buffer.size(queue)
}

async stats(queue: string): Promise<QueueStats> {
  return {
    queue,
    size: bufferSize,
    failed: dlqSize,
    metrics: { bufferSize, pendingAcks, committedPartitions }
  }
}

async clear(queue: string): Promise<void> {
  // 清理 buffer、offsetTracker、dlqBuffer、messageIdToMeta
}

async enableNotifications(): Promise<void> {
  this.notifier.enable()
}

async onNotify(queues: string | string[], callback): Promise<void> {
  this.notifier.registerCallback(queueList, callback)
  // 確保這些 queue 的 consumer 已啟動
}
```

**檢查清單**:
- [ ] size 返回 buffer 大小
- [ ] stats 包含必要指標
- [ ] clear 完整清理
- [ ] onNotify 正確整合 notifier

---

### 階段 6B-7: DLQ 管理 (~10 分鐘)

**關鍵方法**:

```typescript
async getFailed(queue: string, start?: number, end?: number): Promise<SerializedJob[]> {
  // 從 dlqBuffer 切片返回
}

async clearFailed(queue: string): Promise<void> {
  this.dlqBuffer.delete(queue)
}

async retryFailed(queue: string, count?: number): Promise<number> {
  // 從 dlqBuffer 取出失敗 job
  // 清除失敗資訊 (error, failedAt)
  // 呼叫 push 重新推入主 queue
  // 返回重試數
}
```

**檢查清單**:
- [ ] getFailed 正確切片
- [ ] retryFailed 清除失敗資訊並重推

---

### 階段 6B-8: 優雅關閉 (~15 分鐘)

**關鍵方法**:

```typescript
async disconnect(): Promise<void> {
  // 1. 停止 offset commit loop
  // 2. 最後一次手動 commit
  // 3. Destroy buffer（取消所有等待者）
  // 4. 清理 notifier
  // 5. Disconnect consumer
  // 6. Disconnect producer
  // 7. Disconnect admin
  // 8. 清理內部狀態
  // 所有 disconnect 使用 try-catch（失敗不致命）
}
```

**檢查清單**:
- [ ] Commit loop 停止
- [ ] 最後一次 commit 執行
- [ ] Buffer destroy 取消等待者
- [ ] 所有連線 disconnect
- [ ] 錯誤安全（try-catch）

---

### 階段 6B-9: 模組匯出與 QueueManager 整合 (~10 分鐘)

**更新 1**: `/packages/stream/src/drivers/kafka/index.ts`

```typescript
export { KafkaDriver } from './KafkaDriver'
```

**更新 2**: 建立向後相容重新導出

**檔案**: `/packages/stream/src/drivers/KafkaDriver.ts`

```typescript
/**
 * @deprecated 請從 './kafka/KafkaDriver' 導入
 * 保留向後相容性的重新導出。
 */
export { KafkaDriver } from './kafka/KafkaDriver'
export type { KafkaDriverFullConfig as KafkaDriverConfig } from './kafka/types'
```

**更新 3**: QueueManager 路徑確認

檔案: `/packages/stream/src/QueueManager.ts`（第 164-179 行）

確認現有的 kafka case 是否需要路徑調整：
```typescript
case 'kafka': {
  const { KafkaDriver } = require('./drivers/KafkaDriver')
  // ... 使用 new KafkaDriver(config)
}
```

**檢查清單**:
- [ ] kafka/index.ts 匯出 KafkaDriver
- [ ] 創建重新導出橋接檔案
- [ ] QueueManager 可正常載入
- [ ] 向後相容

---

## 測試策略 (55+ 個測試)

**檔案**: `/packages/stream/tests/unit/drivers/kafka/KafkaDriver.test.ts`

### Mock KafkaJS 工廠

```typescript
function createMockKafkaClient(): KafkaClientFactory {
  const sentMessages: Array<{topic: string; messages: any[]}> = []
  const subscriptions: string[] = []
  let eachMessageHandler: Function | null = null

  return {
    producer: () => ({
      connect: async () => {},
      send: async (args) => {
        sentMessages.push(args)
        return args.messages.map((_, i) => ({
          topicName: args.topic,
          partition: 0,
          errorCode: 0,
          offset: String(i),
        }))
      },
      disconnect: async () => {},
    }),
    consumer: ({ groupId }) => ({
      connect: async () => {},
      subscribe: async ({ topics }) => {
        subscriptions.push(...topics)
      },
      run: async ({ eachMessage }) => {
        eachMessageHandler = eachMessage
      },
      commitOffsets: async () => {},
      seek: () => {},
      pause: () => {},
      resume: () => {},
      disconnect: async () => {},
    }),
    admin: () => ({...}),
  }
}
```

### 測試分類

| 分類 | 測試數 | 關鍵場景 |
|------|--------|----------|
| Constructor & Config | 5 | 預設值、驗證、初始化 |
| Producer & Push | 10 | 懶初始化、key 路由、序列化、batch |
| Consumer & Pop | 12 | 懶初始化、FIFO、blocking、batch |
| Complete/Ack/Fail | 8 | Offset resolve、DLQ、清理 |
| Offset Commit | 5 | 定期 commit、+1 邏輯、無可 commit |
| Topic 管理 | 6 | Create、Delete、List |
| Stats/Size | 4 | Size、Stats、Clear |
| Notifications | 4 | Enable/Disable、Register、Notify |
| Disconnect/Lifecycle | 4 | 優雅關閉、重複呼叫安全 |
| 錯誤處理 | 3 | 解析失敗、連線失敗、發送失敗 |
| **總計** | **55+** | |

---

## 實作優先順序

建議按此順序實作（依賴圖）:

```
1. 6B-1 (Constructor) ✓ 依賴少
   ↓
2. 6B-2 (Producer + Push) ✓ 依賴 6B-1
   ↓
3. 6B-3 (Consumer + Pop) ⚠️ 最複雜，專注此
   ↓
4. 6B-4 (Complete/Ack/Fail + Offset Commit) ✓ 依賴 6B-3
   ↓
5. 6B-5 (Topic 管理) ✓ 獨立
   ↓
6. 6B-6 (Stats/Notifications) ✓ 依賴 buffer
   ↓
7. 6B-7 (DLQ 管理) ✓ 依賴 push
   ↓
8. 6B-8 (Disconnect) ✓ 最後
   ↓
9. 6B-9 (匯出與整合) ✓ 最後
   ↓
10. 撰寫測試 (55+ 個)
   ↓
11. 執行測試 & 驗證
```

---

## 風險與緩解

| 風險 | 嚴重度 | 機率 | 緩解措施 |
|------|--------|------|----------|
| KafkaJS 動態 subscribe 限制 | 高 | 確定 | Consumer restart 機制 |
| Offset commit 格式錯誤 | 高 | 中 | 單元測試驗證 +1 |
| Memory leak (messageIdToMeta) | 中 | 中 | complete/ack/fail 時清理 |
| Buffer 滿時訊息丟失 | 中 | 低 | maxSize 檢查 + pause |
| Promise.race 洩漏 | 低 | 中 | 可接受，Phase 6C 改進 |

---

## 成功標準

- [ ] 所有 20+ 方法完整實作
- [ ] 55+ 單元測試通過
- [ ] Producer singleton 正確
- [ ] Consumer 動態訂閱 + restart 穩定
- [ ] At-least-once 語意驗證 ✓
- [ ] Offset commit = resolved + 1 ✓
- [ ] DLQ 機制運作 ✓
- [ ] TypeScript 無錯誤
- [ ] 所有檔案 < 800 行
- [ ] 無 mutation
- [ ] QueueManager 可載入

---

## 工作量估算

| 項目 | 預估時間 |
|------|----------|
| 6B-1 Constructor | 15 分鐘 |
| 6B-2 Producer + Push | 25 分鐘 |
| 6B-3 Consumer + Pop ⚠️ | 45 分鐘 |
| 6B-4 Complete/Ack/Fail/Commit | 30 分鐘 |
| 6B-5 Topic 管理 | 15 分鐘 |
| 6B-6 Stats/Notifications | 15 分鐘 |
| 6B-7 DLQ 管理 | 10 分鐘 |
| 6B-8 Disconnect | 15 分鐘 |
| 6B-9 匯出與整合 | 10 分鐘 |
| 測試撰寫 | 60 分鐘 |
| 驗證 | 15 分鐘 |
| **總計** | **~4 小時** |

---

## 關鍵程式碼參考

| 文件 | 用途 |
|------|------|
| `QueueDriver.ts` | 介面定義（所有方法簽名） |
| `RedisDriver.ts` | 實作參考 |
| `MessageBuffer.ts` | Phase 6A |
| `OffsetTracker.ts` | Phase 6A |
| `KafkaNotifier.ts` | Phase 6A |
| `Consumer.ts` | ReactiveStrategy 整合方式 |
| `ReactiveStrategy.ts` | onNotify 使用方式 |

---

## 快速檢查清單

實作完成前檢查:
- [ ] Constructor 正確合併預設值
- [ ] Producer 首次建立後複用（singleton）
- [ ] Consumer eachMessage 正確追蹤 offset
- [ ] pop 返回正確 SerializedJob
- [ ] complete/ack resolve offset
- [ ] fail 送到 DLQ 並 resolve offset
- [ ] Offset commit 使用 offset + 1
- [ ] disconnect 正確清理所有資源
- [ ] 所有錯誤使用 try-catch
- [ ] 55+ 測試全部通過
- [ ] TypeScript 無錯誤
- [ ] QueueManager 可正常載入

---

## 後續計畫

Phase 6B 完成後:
- **Phase 6C**: Reactive 通知完整整合 + Consumer 生命週期（2-3 小時）
- **Phase 6D**: 進階功能 + E2E 測試 + 效能基準（2-3 小時）
