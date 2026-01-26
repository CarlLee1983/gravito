# Phase 2：功能擴展

> 狀態：✅ 已完成
> 優先級：中
> 預估工作量：大
> 前置條件：Phase 1 完成

## 目標

擴展 Quasar 的佇列系統支援範圍，新增更多實用功能。

## 2.1 新增 Bridge 支援

### 現況分析

目前 Bridges 僅支援：
- BullMQ
- Bee-Queue

缺少對其他常見佇列系統的即時追蹤支援。

### 改進項目

#### 2.1.1 Bull v3/v4 Bridge

- [x] 實作 `BullBridge` 類別
- [x] 支援 `completed`、`failed`、`progress` 事件
- [x] 處理 Bull 與 BullMQ 事件 API 差異

```typescript
// bridges/BullBridge.ts
export class BullBridge extends BaseZenithBridge {
  attach(queue: any): void {
    // Bull v3/v4 使用 queue.process() 而非 Worker
    queue.on('completed', (job: any, result: any) => { ... })
    queue.on('failed', (job: any, error: Error) => { ... })
    queue.on('progress', (job: any, progress: number) => { ... })
  }
}
```

#### 2.1.2 Agenda Bridge

- [x] 實作 `AgendaBridge` 類別
- [x] 支援 MongoDB-based 任務排程
- [x] 處理 Agenda 特有的任務生命週期事件

```typescript
// bridges/AgendaBridge.ts
export class AgendaBridge extends BaseZenithBridge {
  attach(agenda: any): void {
    agenda.on('start', (job: any) => { ... })
    agenda.on('complete', (job: any) => { ... })
    agenda.on('fail', (job: any, error: Error) => { ... })
  }
}
```

#### 2.1.3 Generic EventEmitter Bridge

- [x] 實作通用 Bridge 基底類別
- [x] 支援自訂事件映射配置
- [x] 便於使用者快速整合自訂佇列系統

```typescript
// bridges/GenericBridge.ts
interface EventMapping {
  started?: string
  completed?: string
  failed?: string
  progress?: string
}

export class GenericBridge extends BaseZenithBridge {
  constructor(
    redis: Redis,
    prefix: string,
    workerId: string,
    private eventMapping: EventMapping
  ) {
    super(redis, prefix, workerId)
  }
}
```

### 預期效益

- 擴大 Quasar 適用範圍
- 降低使用者整合成本
- 提供更完整的監控生態系統

---

## 2.2 新增 Probe 支援

### 現況分析

目前 Probes 支援：
- BullMQ、Bull、Bee-Queue
- Laravel Queues
- Redis List

### 改進項目

#### 2.2.1 RabbitMQ Probe

- [x] 實作 `RabbitMQProbe` 類別
- [x] 透過 Management API 取得佇列統計
- [x] 支援多個 vhost 監控

```typescript
// probes/RabbitMQProbe.ts
export class RabbitMQProbe implements QueueProbe {
  constructor(
    private managementUrl: string,
    private credentials: { username: string; password: string },
    private queueName: string,
    private vhost = '/'
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    // 使用 RabbitMQ Management HTTP API
    const response = await fetch(
      `${this.managementUrl}/api/queues/${encodeURIComponent(this.vhost)}/${this.queueName}`,
      { headers: { Authorization: `Basic ${btoa(...)}` } }
    )
    // ...
  }
}
```

#### 2.2.2 SQS Probe

- [x] 實作 `SQSProbe` 類別
- [x] 使用 AWS SDK v3
- [x] 支援多區域監控

```typescript
// probes/SQSProbe.ts
import { SQSClient, GetQueueAttributesCommand } from '@aws-sdk/client-sqs'

export class SQSProbe implements QueueProbe {
  constructor(
    private client: SQSClient,
    private queueUrl: string
  ) {}

  async getSnapshot(): Promise<QueueSnapshot> {
    const command = new GetQueueAttributesCommand({
      QueueUrl: this.queueUrl,
      AttributeNames: [
        'ApproximateNumberOfMessages',
        'ApproximateNumberOfMessagesNotVisible',
        'ApproximateNumberOfMessagesDelayed',
      ],
    })
    // ...
  }
}
```

#### 2.2.3 Kafka Consumer Group Probe

- [x] 實作 `KafkaProbe` 類別
- [x] 監控 Consumer Group Lag
- [x] 支援多主題監控

### 預期效益

- 支援更多主流佇列系統
- 提升跨平台監控能力
- 滿足企業級使用場景

---

## 2.3 新增 Executor 支援

### 現況分析

目前 Executors 僅支援：
- RetryJobExecutor
- DeleteJobExecutor

### 改進項目

- [x] 實作 `PauseQueueExecutor` - 暫停佇列處理
- [x] 實作 `ResumeQueueExecutor` - 恢復佇列處理
- [x] 實作 `CleanQueueExecutor` - 清理特定狀態的任務
- [x] 實作 `PrioritizeJobExecutor` - 調整任務優先級

```typescript
// executors/PauseQueueExecutor.ts
export class PauseQueueExecutor extends BaseExecutor {
  readonly supportedType = 'PAUSE_QUEUE' as CommandType

  async execute(command: QuasarCommand, redis: Redis): Promise<CommandResult> {
    const { queue, driver } = command.payload

    if (driver === 'bullmq') {
      // BullMQ: 設定 paused 標記
      await redis.set(`bull:${queue}:meta:paused`, '1')
    }

    return this.success(command.id, `Queue ${queue} paused`)
  }
}
```

### 預期效益

- 提供更完整的遠端控制能力
- 支援緊急狀況處理（暫停/恢復）
- 便於維護作業

---

## 2.4 指標聚合功能

### 現況分析

目前僅提供原始指標，缺乏聚合與趨勢分析。

### 改進項目

- [x] 實作滾動視窗指標聚合
- [x] 支援自訂聚合週期
- [x] 提供吞吐量計算（jobs/min）
- [x] 支援告警閾值配置

```typescript
// metrics/MetricsAggregator.ts
export interface AggregatedMetrics {
  queue: string
  period: '1m' | '5m' | '15m'
  throughput: {
    in: number   // 進入速率
    out: number  // 完成速率
  }
  latency: {
    avg: number
    p50: number
    p95: number
    p99: number
  }
  errorRate: number
}

export class MetricsAggregator {
  constructor(
    private redis: Redis,
    private options: AggregatorOptions
  ) {}

  async aggregate(queueName: string): Promise<AggregatedMetrics> {
    // 從 Redis 時序資料計算聚合指標
  }
}
```

### 預期效益

- 提供更有意義的監控數據
- 支援趨勢分析與預測
- 便於設定告警規則

---

## 2.5 批次日誌發送

### 現況分析

目前每個事件都會即時發送至 Redis：

```typescript
// BaseZenithBridge.ts
await this.redis.publish(`${this.prefix}logs`, JSON.stringify(fullPayload))
```

高流量時可能造成效能問題。

### 改進項目

- [x] 實作日誌批次緩衝
- [x] 支援配置批次大小與發送間隔
- [x] 實作優雅關閉時的緩衝區清空

```typescript
// bridges/LogBuffer.ts
export class LogBuffer {
  private buffer: ZenithLogPayload[] = []
  private timer: Timer | null = null

  constructor(
    private redis: Redis,
    private prefix: string,
    private options: {
      batchSize: number      // 預設 100
      flushInterval: number  // 預設 1000ms
    }
  ) {}

  add(log: ZenithLogPayload): void {
    this.buffer.push(log)
    if (this.buffer.length >= this.options.batchSize) {
      this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const logs = this.buffer.splice(0)
    const pipeline = this.redis.pipeline()

    for (const log of logs) {
      pipeline.publish(`${this.prefix}logs`, JSON.stringify(log))
    }

    await pipeline.exec()
  }
}
```

### 預期效益

- 減少 Redis 操作頻率
- 提升高流量場景下的效能
- 降低網路開銷

---

## 2.6 健康檢查端點

### 現況分析

目前缺乏標準化的健康檢查機制。

### 改進項目

- [x] 提供可選的 HTTP 健康檢查端點
- [x] 報告 Agent 狀態與連線狀態
- [x] 支援 Kubernetes Liveness/Readiness 探針

```typescript
// health/HealthServer.ts
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  connections: {
    transport: 'connected' | 'disconnected'
    monitor: 'connected' | 'disconnected' | 'not_configured'
  }
  lastHeartbeat: number
  probes: Array<{ name: string; status: 'ok' | 'error' }>
}

export class HealthServer {
  constructor(
    private agent: QuasarAgent,
    private port: number = 9999
  ) {}

  async start(): Promise<void> {
    // 使用 Bun.serve 或 Node http 模組
  }

  getStatus(): HealthStatus {
    // 收集各元件狀態
  }
}
```

### 預期效益

- 支援容器化部署監控
- 便於負載均衡器健康檢查
- 提供標準化狀態報告

---

## 驗收標準

- [x] 至少新增 2 種 Bridge 支援
- [x] 至少新增 1 種 Probe 支援
- [x] 批次日誌功能實作並通過效能測試
- [x] 健康檢查端點可正常運作
- [x] 所有新功能具備完整測試
- [x] 更新文件與範例程式

## 相依性

- Phase 1 完成（錯誤處理與日誌系統）

## 風險評估

| 風險項目 | 等級 | 緩解措施 |
|---------|------|---------|
| 新 Probe 需要額外依賴 | 中 | 使用 peerDependencies，保持可選性 |
| RabbitMQ/SQS 測試環境設置複雜 | 中 | 使用模擬伺服器或條件跳過 |
| 批次日誌可能造成資料遺失 | 低 | 實作優雅關閉與持久化緩衝 |
