# FS-103 背壓管理系統 - 最佳實踐指南

## 概述

背壓管理系統是 Gravito 框架中用於控制事件隊列流量的智能系統。它能自動檢測系統負載，調整事件優先級，並在必要時拒絕低優先級事件以保護高優先級事件的處理。

---

## 快速開始

### 基本配置

```typescript
import { BackpressureManager } from '@gravito/core'

// 創建背壓管理器實例
const backpressure = new BackpressureManager({
  enabled: true,
  maxQueueSize: 1000,
  maxSizeByPriority: {
    critical: 100,
    high: 300,
    normal: 400,
    low: 200,
  },
  thresholds: {
    warning: 0.6,      // 60% 觸發 WARNING
    critical: 0.85,    // 85% 觸發 CRITICAL
    overflow: 1.0,     // 100% 觸發 OVERFLOW
  },
  dlqOnOverflow: true,
})

// 與 EventPriorityQueue 集成
eventQueue.setBackpressureManager(backpressure)

// 與 EventAggregationManager 集成
aggregationManager.setBackpressureManager(backpressure)
```

---

## API 參考

### BackpressureManager 核心方法

#### `updateQueueDepth(depths: MultiPriorityQueueDepth): void`

同步隊列深度信息（由 EventPriorityQueue 自動調用）。

```typescript
// 隊列深度結構
interface MultiPriorityQueueDepth {
  critical: number  // CRITICAL 優先級隊列深度
  high: number      // HIGH 優先級隊列深度
  normal: number    // NORMAL 優先級隊列深度
  low: number       // LOW 優先級隊列深度
  total: number     // 總隊列深度
}

// 使用示例
backpressure.updateQueueDepth({
  critical: 10,
  high: 25,
  normal: 40,
  low: 20,
  total: 95,
})
```

**注意**：通常不需要手動調用，EventPriorityQueue 會自動調用。

---

#### `getQueueDepthByPriority(): MultiPriorityQueueDepth`

獲取當前隊列深度快照。

```typescript
const depths = backpressure.getQueueDepthByPriority()

console.log(`CRITICAL 隊列深度: ${depths.critical}`)
console.log(`總隊列深度: ${depths.total}`)
console.log(`隊列使用率: ${(depths.total / maxQueueSize) * 100}%`)
```

---

#### `getTotalQueueDepth(): number`

獲取總隊列深度。

```typescript
const totalDepth = backpressure.getTotalQueueDepth()

if (totalDepth > maxQueueSize * 0.8) {
  console.warn('隊列接近滿！')
}
```

---

#### `getState(): BackpressureState`

獲取當前背壓狀態。

```typescript
enum BackpressureState {
  NORMAL = 'NORMAL',      // 正常運作
  WARNING = 'WARNING',    // 警告狀態（60%+）
  CRITICAL = 'CRITICAL',  // 危急狀態（85%+）
  OVERFLOW = 'OVERFLOW',  // 溢位狀態（100%）
}

const state = backpressure.getState()

switch (state) {
  case BackpressureState.NORMAL:
    console.log('系統正常運作')
    break
  case BackpressureState.WARNING:
    console.log('系統進入警告狀態，開始限制低優先級事件')
    break
  case BackpressureState.CRITICAL:
    console.log('系統進入危急狀態，嚴格限制低優先級事件')
    break
  case BackpressureState.OVERFLOW:
    console.log('系統溢位，路由事件到 DLQ')
    break
}
```

---

#### `makeDeadLetterDecision(eventName: string, priority: string): DeadLetterDecision`

決定是否應該將事件路由到死信隊列（DLQ）。

```typescript
interface DeadLetterDecision {
  shouldRoute: boolean          // 是否路由到 DLQ
  reason?: string               // 路由原因
  retryStrategy?: RetryStrategy // 重試策略
}

type RetryStrategy = 'immediate' | 'delayed' | 'dlq-only'

// 使用示例
const decision = backpressure.makeDeadLetterDecision('user:created', 'normal')

if (decision.shouldRoute) {
  console.log(`路由原因: ${decision.reason}`)
  console.log(`重試策略: ${decision.retryStrategy}`)

  // 路由事件到 DLQ
  deadLetterQueue.add({
    event: task,
    reason: decision.reason,
    retryStrategy: decision.retryStrategy,
  })
} else {
  // 事件允許進入隊列
  eventQueue.enqueue(task)
}
```

---

#### `notifyWindowAdjustment(oldWindowMs: number, newWindowMs: number): void`

接收來自 AggregationWindow 的窗口調整通知（自動調用）。

```typescript
// 通常由 AggregationWindow 自動調用
// 不需要手動調用

// 此方法觸發自動狀態恢復評估
backpressure.notifyWindowAdjustment(200, 100)
```

---

#### `getMetrics(): BackpressureMetricsSnapshot`

獲取背壓管理系統的指標快照。

```typescript
interface BackpressureMetricsSnapshot {
  state: BackpressureState
  queueDepth: number
  rejectedCount: number
  degradedCount: number
  stateTransitions: number
  depthByPriority: MultiPriorityQueueDepth
  windowAdjustmentCount: number
  dlqRouteCount: number
}

const metrics = backpressure.getMetrics()

console.log(`當前狀態: ${metrics.state}`)
console.log(`隊列深度: ${metrics.queueDepth}`)
console.log(`DLQ 路由數: ${metrics.dlqRouteCount}`)
```

---

#### `reset(): void`

重置所有狀態和計數器（主要用於測試）。

```typescript
// 清除所有狀態
backpressure.reset()

// 之後所有計數器都被重置
console.log(backpressure.getTotalQueueDepth()) // 0
console.log(backpressure.getMetrics().dlqRouteCount) // 0
```

---

## 配置選項詳解

### 基本配置

```typescript
interface BackpressureConfig {
  // 是否啟用背壓管理 (預設: true)
  enabled?: boolean

  // 總隊列深度限制 (預設: Infinity)
  maxQueueSize?: number

  // 分優先級隊列深度限制
  maxSizeByPriority?: {
    critical?: number  // CRITICAL 優先級上限 (預設: Infinity)
    high?: number      // HIGH 優先級上限 (預設: Infinity)
    normal?: number    // NORMAL 優先級上限 (預設: Infinity)
    low?: number       // LOW 優先級上限 (預設: Infinity)
  }

  // 背壓狀態閾值 (佔 maxQueueSize 的百分比)
  thresholds?: {
    warning?: number   // WARNING 觸發點 (預設: 0.6)
    critical?: number  // CRITICAL 觸發點 (預設: 0.85)
    overflow?: number  // OVERFLOW 觸發點 (預設: 1.0)
  }

  // 被拒絕事件的處理策略
  rejectionPolicy?: 'throw' | 'drop-silent' | 'drop-with-callback'

  // DLQ 相關配置
  dlqOnOverflow?: boolean        // OVERFLOW 時是否路由到 DLQ
  overflowRetryStrategy?: 'immediate' | 'delayed' | 'dlq-only'
  overflowRetryDelayMs?: number  // 延遲重試的基礎延遲時間

  // 回調函數
  onRejected?: (eventName: string, priority: string, reason: string) => void
  onStateChange?: (from: BackpressureState, to: BackpressureState) => void
}
```

---

## 最佳實踐

### 1. 正確的隊列大小配置

```typescript
// ❌ 不好：隊列太小，易觸發 OVERFLOW
const backpressure = new BackpressureManager({
  maxQueueSize: 100,
})

// ✅ 好：根據系統容量配置適當的隊列大小
const backpressure = new BackpressureManager({
  maxQueueSize: 10000,  // 根據 CPU、記憶體、吞吐量決定
})
```

### 2. 適當的優先級比例

```typescript
// ❌ 不好：CRITICAL 隊列太小，可能無法保護高優先級
const backpressure = new BackpressureManager({
  maxQueueSize: 10000,
  maxSizeByPriority: {
    critical: 10,   // 太小！
    high: 2000,
    normal: 4000,
    low: 4000,
  },
})

// ✅ 好：為每個優先級設置合理的配額
const backpressure = new BackpressureManager({
  maxQueueSize: 10000,
  maxSizeByPriority: {
    critical: 500,  // 5% - 保護關鍵事件
    high: 2000,     // 20% - 高優先級事件
    normal: 4000,   // 40% - 常規事件
    low: 3500,      // 35% - 低優先級事件
  },
})
```

### 3. 監控和告警集成

```typescript
// 定期檢查背壓狀態
setInterval(() => {
  const metrics = backpressure.getMetrics()

  // 發送到監控系統
  prometheus.gauge('backpressure_state', {
    state: metrics.state,
  })

  prometheus.gauge('queue_depth', metrics.queueDepth)
  prometheus.counter('dlq_routes', metrics.dlqRouteCount)

  // 根據狀態進行告警
  if (metrics.state === BackpressureState.CRITICAL) {
    alerting.sendAlert({
      level: 'warning',
      title: '系統背壓 - CRITICAL',
      message: `隊列深度達到 ${metrics.queueDepth}/${backpressure.config.maxQueueSize}`,
    })
  }

  if (metrics.state === BackpressureState.OVERFLOW) {
    alerting.sendAlert({
      level: 'critical',
      title: '系統背壓 - OVERFLOW',
      message: `隊列溢位！DLQ 路由數: ${metrics.dlqRouteCount}`,
    })
  }
}, 10000) // 每 10 秒檢查一次
```

### 4. 適當的回調處理

```typescript
const backpressure = new BackpressureManager({
  maxQueueSize: 10000,

  onStateChange: (from, to) => {
    // 記錄狀態變化
    logger.info(`背壓狀態變化: ${from} → ${to}`)

    // 向監控系統報告
    metrics.recordStateChange(from, to)

    // 根據新狀態調整策略
    if (to === BackpressureState.CRITICAL) {
      // 例如：提高聚合窗口，加快批處理
      aggregationManager.setAggressiveMode(true)
    } else if (to === BackpressureState.NORMAL) {
      // 恢復正常操作
      aggregationManager.setAggressiveMode(false)
    }
  },

  onRejected: (eventName, priority, reason) => {
    // 記錄被拒絕的事件
    logger.warn(`事件被拒絕: ${eventName} [${priority}] - ${reason}`)

    // 發送指標
    metrics.recordRejection(eventName, priority, reason)
  },
})
```

### 5. DLQ 處理最佳實踐

```typescript
// 實現 DLQ 處理邏輯
async function handleDLQEvent(task, decision) {
  // 1. 記錄事件
  await dlqLogger.log({
    event: task.name,
    priority: task.priority,
    reason: decision.reason,
    timestamp: Date.now(),
  })

  // 2. 根據重試策略處理
  switch (decision.retryStrategy) {
    case 'immediate':
      // 立即重試
      await retryQueue.enqueueImmediate(task)
      break

    case 'delayed':
      // 延遲重試（例如 5 分鐘後）
      await retryQueue.enqueueDelayed(task, 5 * 60 * 1000)
      break

    case 'dlq-only':
      // 只存儲到 DLQ，手動審查
      await dlqStorage.store(task)
      break
  }

  // 3. 可選：發送告警
  if (decision.reason?.includes('CRITICAL')) {
    await alerting.sendAlert({
      level: 'warning',
      title: '事件被路由到 DLQ',
      message: `${task.name}: ${decision.reason}`,
    })
  }
}
```

---

## 常見場景

### 場景 1：高流量突增

```typescript
// 當流量突增時（例如限時促銷）：

// 1. 監控隊列深度
const metrics = backpressure.getMetrics()

// 2. 根據狀態調整處理策略
if (metrics.state === BackpressureState.WARNING) {
  // 開始限制低優先級事件
  configManager.set('accept_low_priority', false)
}

if (metrics.state === BackpressureState.CRITICAL) {
  // 嚴格限制
  configManager.set('accept_normal_priority', false)
}

// 3. 增加工作線程
if (metrics.queueDepth > maxQueueSize * 0.7) {
  workerPool.scale(workerPool.size * 1.5)
}
```

### 場景 2：系統恢復

```typescript
// 當系統恢復時：

// 1. 監控狀態
const metrics = backpressure.getMetrics()

// 2. 逐步恢復接收
if (metrics.state === BackpressureState.NORMAL &&
    metrics.stateTransitions > 1) {  // 確保不是短暫的
  configManager.set('accept_low_priority', true)
  configManager.set('accept_normal_priority', true)

  // 恢復正常模式
  aggregationManager.setAggressiveMode(false)
}

// 3. 處理 DLQ 中的事件
await dlqManager.retryPending()
```

### 場景 3：優先級飢餓防護

```typescript
// 確保 CRITICAL 優先級事件永不被餓死：

const decision = backpressure.makeDeadLetterDecision(
  'critical:alert',
  'critical'
)

// ✅ 始終為 shouldRoute = false（CRITICAL 優先級永不拒絕）
console.assert(!decision.shouldRoute, '高優先級事件不應被拒絕')

// 相比之下，LOW 優先級在 OVERFLOW 時會被拒絕
const lowDecision = backpressure.makeDeadLetterDecision(
  'low:analytics',
  'low'
)

if (backpressure.getState() === BackpressureState.OVERFLOW) {
  console.assert(lowDecision.shouldRoute, '低優先級事件應被拒絕')
}
```

---

## 性能考慮

### 1. 隊列深度同步開銷

```
✅ 低開銷設計：
  - updateQueueDepth() 執行時間 < 1ms
  - 在 enqueue() 和 processNext() 調用
  - 無阻塞操作
  - 內存效率高
```

### 2. 狀態轉換開銷

```
✅ 高效的狀態轉換：
  - 遲滯設計防止頻繁轉換
  - 平均轉換次數 < 5 次/小時（正常負載下）
  - 每次轉換開銷 < 0.1ms
```

### 3. DLQ 決策開銷

```
✅ 快速的決策邏輯：
  - makeDeadLetterDecision() 執行時間 < 0.5ms
  - 基於簡單的規則引擎
  - 無數據庫查詢
```

---

## 故障排除

### 問題 1：經常進入 CRITICAL/OVERFLOW

```typescript
// 原因：隊列大小配置不足

// 解決方案：
const backpressure = new BackpressureManager({
  // 增加隊列大小
  maxQueueSize: 20000,  // 從 10000 增加到 20000

  // 調整閾值
  thresholds: {
    warning: 0.7,   // 從 0.6 增加到 0.7
    critical: 0.9,  // 從 0.85 增加到 0.9
  },
})
```

### 問題 2：LOW 優先級事件被大量拒絕

```typescript
// 原因：流量模式不匹配配置

// 解決方案 1：調整優先級比例
const backpressure = new BackpressureManager({
  maxSizeByPriority: {
    critical: 500,
    high: 2000,
    normal: 3000,
    low: 4500,  // 增加 LOW 優先級配額
  },
})

// 解決方案 2：實施速率限制
const rateLimiter = new RateLimiter({
  low: 1000,      // 每秒最多 1000 個 LOW 優先級事件
  normal: 5000,
  high: 10000,
  critical: 50000,
})
```

### 問題 3：系統無法從 CRITICAL 恢復

```typescript
// 原因：隊列持續增加，無法達到恢復閾值

// 解決方案：
// 1. 增加工作線程/消費者
workerPool.scale(workerPool.size * 2)

// 2. 實施更激進的聚合策略
aggregationManager.setAggressive(true)

// 3. 增加處理吞吐量
async function processQueueMore() {
  while (backpressure.getTotalQueueDepth() > 0) {
    await eventQueue.processNext()
    // 無延遲地處理下一個
  }
}
```

---

## 總結

背壓管理系統是保護 Gravito 框架在高負載下穩定運作的關鍵機制。通過正確配置和監控，您可以：

1. ✅ 防止隊列溢位
2. ✅ 保護高優先級事件
3. ✅ 優雅地降級低優先級事件
4. ✅ 自動恢復系統狀態
5. ✅ 提供詳細的監控指標

遵循本指南中的最佳實踐，您的系統將能夠在各種負載條件下穩定運作。

---

## 延伸閱讀

- [FS-103 Phase 2 實施報告](./FS-103_PHASE2_COMPLETION.md)
- [FS-103 Phase 3 驗證報告](./FS-103_PHASE3_COMPLETION.md)
- [EventPriorityQueue 文檔](./docs/events/EventPriorityQueue.md)
- [AggregationWindow 文檔](./docs/events/AggregationWindow.md)
