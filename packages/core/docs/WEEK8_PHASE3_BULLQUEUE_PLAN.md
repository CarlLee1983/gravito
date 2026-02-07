# Week 8 Phase 3: scheduleRetry Bull Queue 整合計劃

> 🎯 **目標**：整合 Bull Queue 處理延遲重試，實現分佈式可靠的事件重試機制
>
> 📊 **範圍**：110+ 行代碼、12-15 個新測試、380+ 行文檔
>
> ⏱️ **預計時間**：Phase 3-5 階段實現（依序進行）

---

## 📋 Phase 3 概述

### 目標
將現有的同步重試機制升級為異步分佈式重試，利用 Bull Queue 進行：
- **延遲重試**：配置化延遲時間
- **指數回退**：重試次數越多，間隔越長
- **持久化**：重試任務持久化到 Redis
- **監控**：完整的重試事件追蹤與指標

### 整合點
1. **EventPriorityQueue** → scheduleRetry() 方法更新
2. **BackpressureManager** → OVERFLOW 時可選延遲重試
3. **OTelEventMetrics** → 重試指標記錄（Phase 1 已實現）
4. **DeadLetterQueue** → 最終重試失敗進入 DLQ

### 關鍵設計決策

| 決策項 | 值 | 理由 |
|--------|-----|------|
| 重試隊列名稱 | `gravito:event:retries:{eventName}` | 按事件名分隔，便於監控 |
| 最大重試次數 | 5（可配置） | 常見業務場景 |
| 初始延遲 | 1000ms | 防止立即重試 |
| 回退倍數 | 2.0 | 指數增長：1s→2s→4s→8s→16s |
| 最大延遲 | 3600000ms (1h) | 防止過度延遲 |
| 持久化存儲 | Redis（配置）| 與系統整體設計一致 |

---

## 🔧 Phase 3 技術實現

### Task 3.1: RetryScheduler 核心實現

**檔案**：`packages/core/src/events/RetryScheduler.ts`

```typescript
/**
 * 重試排程器配置
 */
export interface RetrySchedulerConfig {
  /** 是否啟用 Bull Queue 重試（預設 true） */
  enabled?: boolean

  /** Redis 連接配置（可選，使用全域 Redis） */
  redisUrl?: string

  /** 預設最大重試次數 */
  maxRetries?: number

  /** 初始延遲時間（ms） */
  initialDelayMs?: number

  /** 指數回退倍數 */
  backoffMultiplier?: number

  /** 最大延遲時間（ms） */
  maxDelayMs?: number

  /** 重試失敗回調 */
  onRetryFailed?: (eventName: string, error: Error, retryCount: number) => void
}

export class RetryScheduler {
  private enabled: boolean
  private queues: Map<string, Queue> = new Map()
  private config: Required<RetrySchedulerConfig>

  constructor(config: RetrySchedulerConfig = {})

  /**
   * 為特定事件排程重試任務
   */
  scheduleRetry(
    eventName: string,
    payload: unknown,
    options: EventOptions,
    error: Error,
    retryCount: number
  ): Promise<void>

  /**
   * 獲取特定事件的隊列
   */
  getQueue(eventName: string): Queue | undefined

  /**
   * 取得所有隊列統計
   */
  getStats(): Map<string, QueueStats>

  /**
   * 關閉所有隊列
   */
  shutdown(): Promise<void>
}

export interface QueueStats {
  name: string
  jobCounts: { waiting: number; active: number; delayed: number; failed: number }
  completedCount: number
  failedCount: number
}
```

**實現要點**：
1. ✅ 使用 Bull Queue v4/v5 API
2. ✅ 按事件名動態創建隊列
3. ✅ 計算指數回退延遲時間
4. ✅ 實現 Job 失敗回呼
5. ✅ 支持關閉時清理資源

**測試**：`RetryScheduler.test.ts` (6 個測試)
- 配置初始化
- 排程重試任務
- 指數回退計算
- 隊列統計
- 錯誤處理
- 關閉清理

---

### Task 3.2: EventPriorityQueue scheduleRetry 集成

**檔案**：`packages/core/src/events/EventPriorityQueue.ts`（修改）

```typescript
export class EventPriorityQueue {
  private retryScheduler?: RetryScheduler

  /**
   * 設置重試排程器
   */
  setRetryScheduler(scheduler: RetryScheduler): void

  /**
   * 原始 scheduleRetry 升級為使用 Bull Queue
   */
  private async scheduleRetry(
    hook: string,
    task: EventTask,
    error: Error
  ): Promise<void> {
    if (this.retryScheduler && this.retryScheduler.isEnabled()) {
      // 使用 Bull Queue 進行異步延遲重試
      await this.retryScheduler.scheduleRetry(
        hook,
        task.payload,
        task.options,
        error,
        task.retryCount
      )

      // 記錄重試排程指標
      this.otelEventMetrics?.recordRetryAttempt(hook, task.retryCount)
    } else {
      // Fallback：同步重試（保持向後相容）
      this.enqueue(hook, task.payload, { ...task.options, retryCount: task.retryCount + 1 })
    }
  }
}
```

**修改要點**：
1. ✅ 新增 retryScheduler 屬性
2. ✅ 新增 setRetryScheduler() 方法
3. ✅ scheduleRetry() 改用 Bull Queue（若啟用）
4. ✅ 保持向後相容（無排程器時使用舊邏輯）

**測試**：`EventPriorityQueue-retry.test.ts` (4 個測試)
- 排程器集成
- Bull Queue 重試排程
- Fallback 同步重試
- 錯誤傳播

---

### Task 3.3: BackpressureManager OVERFLOW 延遲重試

**檔案**：`packages/core/src/events/BackpressureManager.ts`（修改）

```typescript
export interface BackpressureConfig {
  // ... 現有配置 ...

  /** OVERFLOW 時的重試策略 */
  overflowRetryStrategy?: 'immediate' | 'delayed' | 'dlq-only'

  /** OVERFLOW 延遲重試的基礎延遲（ms） */
  overflowRetryDelayMs?: number
}

export class BackpressureManager {
  /**
   * 決策結果中添加重試策略建議
   */
  evaluate(...): BackpressureDecision {
    // ... OVERFLOW 狀態 ...

    // 根據配置選擇重試策略
    const retryStrategy = this.config.overflowRetryStrategy ?? 'dlq-only'

    return {
      allowed: false,
      reason: 'Backpressure OVERFLOW',
      isOverflow: true,
      retryStrategy, // 建議：延遲重試 or DLQ
      delayMs: this.config.overflowRetryDelayMs ?? 5000
    }
  }
}

export interface BackpressureDecision {
  // ... 現有字段 ...
  retryStrategy?: 'immediate' | 'delayed' | 'dlq-only'
}
```

**修改要點**：
1. ✅ 新增 overflowRetryStrategy 配置
2. ✅ 新增 overflowRetryDelayMs 配置
3. ✅ 決策結果包含重試策略建議
4. ✅ EventPriorityQueue 根據策略選擇操作

**測試**：`BackpressureManager-retry.test.ts` (3 個測試)
- OVERFLOW 時的重試策略
- 延遲時間計算
- 決策建議傳播

---

### Task 3.4: 完整集成與測試

**檔案**：`packages/core/src/__tests__/EventRetryIntegration.test.ts`

```typescript
describe('Event Retry Integration', () => {
  // 場景 1：正常重試流程
  it('should retry failed event via Bull Queue')

  // 場景 2：指數回退
  it('should apply exponential backoff')

  // 場景 3：重試失敗進入 DLQ
  it('should move to DLQ after max retries exhausted')

  // 場景 4：OVERFLOW → 延遲重試
  it('should schedule delayed retry on backpressure OVERFLOW')

  // 場景 5：監控與指標
  it('should record retry metrics')
})
```

**測試**：(4-6 個新測試)
- 完整重試流程
- 指數回退驗證
- DLQ 路由驗證
- OVERFLOW 重試
- 指標記錄

---

## 📊 預期成果

### 代碼
- **RetryScheduler.ts**：~110 行
- **EventPriorityQueue 修改**：~15 行
- **BackpressureManager 修改**：~20 行
- **總計**：~145 行新增代碼

### 測試
- **RetryScheduler.test.ts**：6 個測試
- **EventPriorityQueue-retry.test.ts**：4 個測試
- **BackpressureManager-retry.test.ts**：3 個測試
- **EventRetryIntegration.test.ts**：6 個測試
- **總計**：19 個新增測試

### 驗證檢查清單
- [ ] 所有 19 個新測試通過
- [ ] TypeScript 編譯無誤
- [ ] Biome lint 通過
- [ ] 與現有 87+41=128 個測試無迴歸
- [ ] 向後相容性驗證
- [ ] 性能基準測試（延遲 < 5ms）

---

## 🔗 依賴與前置條件

### 必需的已完成部分
- ✅ Phase 1：OTelEventMetrics 指標實現
- ✅ Phase 2：DLQ + Backpressure 整合

### 外部依賴
- `bull` 包（v4 或 v5）
- Redis 服務器（用於持久化）
- 現有 Redis 配置（從 core.config 取得）

### 系統假設
- Redis 已配置且可用
- EventPriorityQueue 已實現重試邏輯
- BackpressureManager 已支持 OVERFLOW 狀態

---

## ⚠️ 風險與缺陷預防

| 風險 | 影響 | 預防措施 |
|------|------|--------|
| 重試隊列堆積 | 記憶體爆炸 | 設置最大 jobS 限制、自動清理 |
| Redis 連接失敗 | 重試無法進行 | Fallback 至同步重試 |
| 指數回退過長 | 延遲太久 | 設置 maxDelayMs 上限（1h） |
| 重複重試 | 事件重複執行 | 幂等性校驗（應用層責任） |
| 隊列泄漏 | 資源未釋放 | shutdown() 時完全清理 |

---

## 📝 實施順序

1. **Task 3.1** → 實現 RetryScheduler 核心 + 測試
2. **Task 3.2** → EventPriorityQueue 集成
3. **Task 3.3** → BackpressureManager OVERFLOW 策略
4. **Task 3.4** → 完整集成測試

---

## 🎯 成功標準

- ✅ 所有 19 個新測試通過（0 失敗）
- ✅ 零迴歸（舊 128 個測試全部通過）
- ✅ TypeScript 編譯通過
- ✅ Biome lint 檢查通過
- ✅ 向後相容性 100%（disable 時使用舊邏輯）
- ✅ 性能基準：延遲排程 < 5ms
- ✅ 完整文檔與範例

---

## 📚 後續 Phase 4-5

### Phase 4：監控與告警
- Grafana Dashboard（重試隊列深度、成功率等）
- Prometheus 告警（隊列堆積、失敗率）
- K6 性能測試驗證

### Phase 5：文檔與驗證
- RETRY_SCHEDULER_GUIDE.md
- DISTRIBUTED_RETRY_EXAMPLE.ts
- 完整遷移指南

---

## 📞 聯絡與支持

- 文檔參考：Issue 1.2 Phase 4（Bull Queue 集成經驗）
- 測試範例：BackpressureDLQ.test.ts（集成測試風格）
- 指標 API：OTelEventMetrics（Phase 1 實現）
