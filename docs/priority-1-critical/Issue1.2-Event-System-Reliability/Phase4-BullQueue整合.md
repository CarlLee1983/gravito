# Phase 4: Bull Queue 整合與分佈式事件處理

**週期**：Week 11-12
**任務數**：5 個
**技術棧**：Bull Queue + Redis + Worker Threads + Message Queue Pattern
**預期交付物**：分佈式事件處理系統 + Worker 管理 + 監控儀表板

---

## 📋 任務清單

### ⏳ Task 1.2.4.1: Bull Queue 核心集成

**檔案**：
- 新增：`packages/core/src/events/BullQueueAdapter.ts`
- 新增：`packages/core/src/events/BullQueueConfig.ts`
- 修改：`packages/core/src/events/EventPriorityQueue.ts`

**目標**：
實現 Bull Queue 與 EventPriorityQueue 的無縫集成，支持持久化事件隊列和分佈式處理

**功能實現**：
- [ ] **BullQueueAdapter 類**：Redis-backed 隊列適配器
  - `constructor(config: BullQueueAdapterConfig)` - 初始化
  - `enqueue(task: EventTask): Promise<string>` - 入隊事件任務
  - `dequeue(): Promise<EventTask | undefined>` - 出隊下一個任務
  - `acknowledgeCompletion(jobId: string): Promise<void>` - 確認完成
  - `acknowledgeFailure(jobId: string, error: Error): Promise<void>` - 確認失敗
  - `getQueueStats(): Promise<QueueStats>` - 獲取隊列統計
  - `getPendingJobs(): Promise<BulkJobInfo[]>` - 獲取待處理任務

- [ ] **BullQueueConfig 介面**：配置選項
```typescript
interface BullQueueAdapterConfig {
  // Redis 連接
  redis: {
    host: string
    port: number
    password?: string
    db?: number
  }

  // 隊列配置
  queueName: string
  jobPrefix?: string // 任務 ID 前綴

  // 性能設置
  concurrency?: number // 默認 1
  defaultJobOptions?: {
    attempts?: number // 重試次數
    backoff?: { type: 'exponential'; delay: number }
    removeOnComplete?: boolean
    removeOnFail?: boolean
  }

  // 監聽器配置
  enableMetrics?: boolean
  enableLogging?: boolean
}
```

- [ ] **EventPriorityQueue 擴展**：支持 Bull Queue 後端
  - `useBullQueueBackend(config: BullQueueAdapterConfig): void` - 啟用 Bull 後端
  - `isBullQueueEnabled(): boolean` - 檢查 Bull 是否啟用
  - `switchBackend(backend: 'memory' | 'bull'): Promise<void>` - 切換後端

**驗收標準**：
- [ ] Bull Queue 初始化正確
- [ ] 事件入隊/出隊功能完整
- [ ] Redis 連接管理正確
- [ ] 與 DLQ/CircuitBreaker 兼容
- [ ] 15 個單元測試全部通過

**測試覆蓋**：
- [ ] `tests/events/BullQueueAdapter.test.ts` - 15 個測試

**預計完成**：2026-02-14

---

### ⏳ Task 1.2.4.2: Worker 線程池管理

**檔案**：
- 新增：`packages/core/src/events/WorkerPool.ts`
- 新增：`packages/core/src/events/WorkerPoolConfig.ts`
- 新增：`packages/core/src/events/WorkerPoolMetrics.ts`

**目標**：
實現分佈式 Worker 線程池，支持多進程事件處理

**功能實現**：
- [ ] **WorkerPool 類**：線程池管理
  - `constructor(config: WorkerPoolConfig)` - 初始化
  - `start(): Promise<void>` - 啟動 Worker 線程
  - `stop(): Promise<void>` - 優雅停止
  - `getWorkerStats(): WorkerStats[]` - 獲取 Worker 統計
  - `addWorker(): Promise<void>` - 動態添加 Worker
  - `removeWorker(id: string): Promise<void>` - 移除 Worker

- [ ] **WorkerPoolConfig 介面**：配置選項
```typescript
interface WorkerPoolConfig {
  // Worker 配置
  concurrency: number // 同時處理的任務數
  workerThreads: number // Worker 線程數（默認 CPU 核心數）

  // 任務處理
  taskTimeout: number // 任務超時時間（ms）
  maxRetries: number // 最大重試次數

  // 自適應擴容
  enableAutoScaling?: boolean
  minWorkers?: number
  maxWorkers?: number
  scaleUpThreshold?: number // 負載閾值
  scaleDownThreshold?: number

  // 監控
  metricsInterval?: number // 指標收集間隔（ms）
}
```

- [ ] **WorkerPoolMetrics 類**：性能指標
  - 活躍 Worker 數
  - 處理中的任務數
  - 平均處理時間
  - 任務成功率
  - 錯誤率

**驗收標準**：
- [ ] Worker 線程池正確啟動/停止
- [ ] 多線程事件處理功能完整
- [ ] 自適應擴容工作正常
- [ ] 性能指標收集準確
- [ ] 12 個單元測試全部通過

**測試覆蓋**：
- [ ] `tests/events/WorkerPool.test.ts` - 12 個測試

**預計完成**：2026-02-15

---

### ⏳ Task 1.2.4.3: 消息隊列流程整合

**檔案**：
- 新增：`packages/core/src/events/MessageQueueBridge.ts`
- 修改：`packages/core/src/HookManager.ts` - 支持 Bull Queue 後端
- 修改：`packages/core/src/reliability/DeadLetterQueueManager.ts` - Bull Queue 兼容

**目標**：
實現 HookManager、CircuitBreaker、DLQ 與 Bull Queue 的完整整合

**功能實現**：
- [ ] **MessageQueueBridge 類**：消息隊列橋接
  - `constructor(hookManager: HookManager, workerPool: WorkerPool)` - 初始化
  - `dispatchWithQueue(eventName: string, args: any[]): Promise<string>` - 通過隊列分發
  - `processQueuedEvent(jobId: string, task: EventTask): Promise<void>` - 處理隊列事件
  - `handleJobFailure(jobId: string, task: EventTask, error: Error): Promise<void>` - 失敗處理
  - `getEventStatus(eventId: string): Promise<EventStatus>` - 查詢事件狀態

- [ ] **HookManager 擴展**：Queue 模式支持
  - `dispatchAsync(event, args, options)` - 原有同步分發
  - `dispatchQueued(event, args, options)` - 新增隊列分發
  - `dispatchDeferredQueued(event, args, delay, options)` - 延遲隊列分發

- [ ] **DLQ 整合**：死信隊列支持 Bull Queue
  - 失敗事件自動流向 Bull DLQ
  - 支持延遲重試
  - 重試失敗後進入永久死信隊列

**驗收標準**：
- [ ] HookManager/CircuitBreaker/DLQ 完整整合
- [ ] 事件流向正確（HookManager → Bull Queue → Worker → 完成/DLQ）
- [ ] 重試機制與 Bull Queue 協調
- [ ] 8 個集成測試全部通過

**測試覆蓋**：
- [ ] `tests/events/MessageQueueBridge.test.ts` - 8 個測試

**預計完成**：2026-02-16

---

### ⏳ Task 1.2.4.4: 監控儀表板與 CLI 工具

**檔案**：
- 新增：`packages/core/src/observability/QueueDashboard.ts`
- 新增：`packages/core/src/cli/queue-commands.ts`
- 新增：`templates/queue-monitoring-dashboard.html` - Grafana 儀表板

**目標**：
提供實時監控和管理 Bull Queue 的工具

**功能實現**：
- [ ] **QueueDashboard 類**：監控數據聚合
  - `getQueueMetrics(): QueueMetrics` - 隊列指標
  - `getWorkerMetrics(): WorkerMetrics` - Worker 指標
  - `getJobTimeline(): JobEvent[]` - 任務時間線
  - `getErrorBreakdown(): ErrorStats` - 錯誤分類統計
  - `exportMetrics(format: 'json' | 'prometheus'): string` - 導出指標

- [ ] **Queue CLI 命令**：
```bash
# 查看隊列狀態
gravito queue status

# 查看待處理任務
gravito queue pending [--limit 20]

# 查看正在處理的任務
gravito queue active [--worker-id xxx]

# 查看失敗的任務
gravito queue failed [--limit 20]

# 查看特定任務詳情
gravito queue job <job-id>

# 查看 Worker 狀態
gravito queue workers

# 清空隊列
gravito queue flush [--confirm]

# 重試失敗的任務
gravito queue retry <job-id>

# 監控實時指標
gravito queue monitor [--interval 5s]

# 導出指標
gravito queue export [--format json|prometheus]
```

- [ ] **Grafana 儀表板**：
  - 隊列深度趨勢
  - Worker CPU/Memory 使用率
  - 任務處理時間分佈
  - 成功率/失敗率時序圖
  - 優先級分佈
  - 告警規則配置

**驗收標準**：
- [ ] QueueDashboard 功能完整
- [ ] CLI 命令可用且用戶友好
- [ ] Grafana 儀表板配置正確
- [ ] 6 個功能測試全部通過

**測試覆蓋**：
- [ ] `tests/observability/QueueDashboard.test.ts` - 6 個測試

**預計完成**：2026-02-17

---

### ⏳ Task 1.2.4.5: 文檔與遷移指南

**檔案**：
- 新增：`docs/BULL_QUEUE_INTEGRATION_GUIDE.md` - 完整使用指南
- 新增：`docs/QUEUE_MIGRATION_GUIDE.md` - 遷移指南
- 新增：`examples/distributed-event-processing-example.ts` - 完整示例
- 新增：`docs/PERFORMANCE_BENCHMARKS_WITH_BULL.md` - 性能基準

**目標**：
提供清晰的文檔和遷移路徑，幫助用戶採用 Bull Queue

**文檔內容**：
- [ ] **BULL_QUEUE_INTEGRATION_GUIDE.md**：
  - 快速開始指南
  - 配置詳解
  - API 參考
  - 故障排除
  - 最佳實踐

- [ ] **QUEUE_MIGRATION_GUIDE.md**：
  - 遷移檢查清單
  - 零停機遷移策略
  - 回滾計劃
  - 實際案例

- [ ] **distributed-event-processing-example.ts**：
  - 基本 Bull Queue 配置
  - Worker 實現
  - 錯誤處理和重試
  - 監控集成示例

- [ ] **PERFORMANCE_BENCHMARKS_WITH_BULL.md**：
  - 記憶體隊列 vs Bull Queue 對比
  - 吞吐量測試結果
  - 延遲測試結果
  - 可擴展性分析

**驗收標準**：
- [ ] 文檔內容完整、準確
- [ ] 示例代碼可運行
- [ ] 遷移指南清晰易懂
- [ ] 4 個文檔全部完成

**預計完成**：2026-02-18

---

## 🎯 成功標準

### 功能完整性
- ✅ Bull Queue 無縫集成
- ✅ 分佈式 Worker 處理正常
- ✅ 與現有系統完全兼容（DLQ、CircuitBreaker、Backpressure）
- ✅ 自動故障轉移工作正常

### 性能目標
- ✅ 相比記憶體隊列，吞吐量提升 3-5 倍
- ✅ P99 延遲 < 100ms
- ✅ 自動擴容/縮容工作正常

### 可靠性
- ✅ 零消息丟失（持久化）
- ✅ 自動重試機制完整
- ✅ 監控告警完善

### 測試覆蓋
- ✅ 53 個新增單元測試
- ✅ 整體覆蓋率 ≥ 80%
- ✅ E2E 集成測試通過

---

## 🚀 交付時間表

| 任務 | 開始日期 | 預計完成 | 負責人 |
|------|--------|--------|------|
| Task 1 (Bull Queue 核心) | 2026-02-11 | 2026-02-14 | - |
| Task 2 (Worker 線程池) | 2026-02-12 | 2026-02-15 | - |
| Task 3 (消息隊列整合) | 2026-02-13 | 2026-02-16 | - |
| Task 4 (監控與 CLI) | 2026-02-14 | 2026-02-17 | - |
| Task 5 (文檔與遷移) | 2026-02-15 | 2026-02-18 | - |
| **Phase 4 完成** | - | **2026-02-18** | - |

---

## 📊 狀態追蹤

```
當前進度：[░░░░░░░░░░░░░░░░░░░░] 0% (規劃完成)

Task 1 (Bull Queue 核心)      [░░░░░░░░░░░░░░░░░░░░] 0% ⏳
Task 2 (Worker 線程池)        [░░░░░░░░░░░░░░░░░░░░] 0% ⏳
Task 3 (消息隊列整合)         [░░░░░░░░░░░░░░░░░░░░] 0% ⏳
Task 4 (監控與 CLI 工具)      [░░░░░░░░░░░░░░░░░░░░] 0% ⏳
Task 5 (文檔與遷移指南)       [░░░░░░░░░░░░░░░░░░░░] 0% ⏳

整體進度：[░░░░░░░░░░░░░░░░░░░░] 0%
```

---

## 🔗 相關文件

- **Phase 1**：[DLQ-And-Retry.md](./Phase1-DLQ-And-Retry.md)
- **Phase 2**：[熔断器.md](./Phase2-熔断器.md)
- **Phase 3**：[背壓機制](../../../packages/core/src/events/BackpressureManager.ts)
- **上級進度**：[TASK_PROGRESS.md](../../TASK_PROGRESS.md)

---

**最後更新**：2026-02-07
**狀態**：🗓️ 規劃完成，待實施
