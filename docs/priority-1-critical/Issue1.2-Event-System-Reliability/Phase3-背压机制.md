# Phase 3: Backpressure 背壓機制

**週期**：Week 11-12
**任務數**：5 個
**技術棧**：Event Loop + Memory Management + Worker Pool
**預期交付物**：完整的背壓管理系統 + Worker 線程池 + 自動擴展

---

## 📋 任務清單

### ✅ Task 1.2.3.1: BackpressureManager 實現

**檔案**：`packages/core/src/events/BackpressureManager.ts`

**目標**：
實現智慧型背壓管理，在資源受限時進行流量控制，防止優先級飢餓。

**核心設計**：

#### 背壓狀態轉移
```
NORMAL (正常) → WARNING (警告) → CRITICAL (危急) → OVERFLOW (溢位)
                 ↑ 恢復（遲滯設計）
```

**狀態轉移邏輯**：
- **NORMAL → WARNING**：隊列深度 > 60% 時觸發
- **WARNING → CRITICAL**：隊列深度 > 85% 時觸發
- **CRITICAL → OVERFLOW**：隊列深度 > 100% 時觸發
- **恢復**：遲滯設計，需降至觸發閾值的 80%

#### 配置選項（BackpressureConfig）

```typescript
interface BackpressureConfig {
  // 啟用背壓（預設 true）
  enabled?: boolean

  // 隊列深度限制
  maxQueueSize?: number
  maxSizeByPriority?: {
    high?: number
    normal?: number
    low?: number
  }

  // 速率限制
  maxEnqueueRate?: number           // events/sec
  rateLimitWindowMs?: number        // 滑動視窗（ms）

  // 狀態閾值（百分比）
  thresholds?: {
    warning?: number      // 預設 0.6 (60%)
    critical?: number     // 預設 0.85 (85%)
    overflow?: number     // 預設 1.0 (100%)
  }

  // 拒絕策略
  rejectionPolicy?: 'throw' | 'drop-silent' | 'drop-with-callback'
  onRejected?: (eventName: string, priority: string, reason: string) => void
  onStateChange?: (from: BackpressureState, to: BackpressureState) => void

  // 優先級飢餓保護
  enableStarvationProtection?: boolean
  lowPriorityDelayMs?: number       // WARNING 狀態延遲（ms）
  starvationTimeoutMs?: number      // 最大等待時間（ms）
}
```

#### 功能實現

**BackpressureManager 類方法**：
- `constructor(config: BackpressureConfig)` - 初始化
- `canEnqueue(priority: string): boolean` - 檢查是否可入隊
- `enqueue(event: Event, priority: string): boolean` - 入隊
- `dequeue(priority?: string): Event | null` - 出隊
- `getState(): BackpressureState` - 獲取當前狀態
- `getQueueSize(priority?: string): number` - 獲取隊列大小
- `getStats(): BackpressureStats` - 獲取統計信息
- `reset(): void` - 重置狀態

**驗收標準**：
- [x] 背壓狀態轉移邏輯正確
- [x] 優先級飢餓保護有效
- [x] 速率限制正確實施
- [x] 遲滯設計防止狀態振盪
- [x] 單元測試覆蓋 > 90%

**測試覆蓋**：
- [x] `tests/EventBackpressure.test.ts` - 20+ 個測試

**狀態**：✅ 已完成

---

### ✅ Task 1.2.3.2: WorkerPoolConfig 設計

**檔案**：`packages/core/src/events/WorkerPoolConfig.ts`

**目標**：
定義 Worker 線程池的配置結構和類型

**配置結構**：

```typescript
interface WorkerPoolConfig {
  // 基本設置
  concurrency?: number              // 併發度（預設 4）
  workerThreads?: number            // Worker 線程數（預設 CPU 核心數）
  taskTimeout?: number              // 任務超時（ms，預設 30000）

  // 自動擴展
  enableAutoScaling?: boolean        // 啟用自動擴展（預設 true）
  minWorkers?: number               // 最小 Worker 數（預設 1）
  maxWorkers?: number               // 最大 Worker 數（預設 CPU 核心 * 2）
  scaleUpThreshold?: number         // 擴展閾值（預設 0.8）
  scaleDownThreshold?: number       // 縮減閾值（預設 0.2）

  // 重試
  maxRetries?: number               // 最大重試次數（預設 3）
  retryDelay?: number               // 重試延遲（ms，預設 100）

  // 監控
  metricsInterval?: number          // 指標報告間隔（ms，預設 5000）
  enableHealthCheck?: boolean       // 啟用健康檢查（預設 true）

  // 事件源
  taskSource?: TaskSource           // 任務源（可選）
}

interface TaskSource {
  getNextTask(): Promise<EventTask | null>
  acknowledgeTask(taskId: string): Promise<void>
  nackTask(taskId: string, error: Error): Promise<void>
}

interface WorkerPoolStats {
  activeWorkers: number
  idleWorkers: number
  totalWorkers: number
  queueSize: number
  taskProcessed: number
  taskFailed: number
  avgProcessingTime: number
}

interface WorkerStats {
  id: string
  state: 'idle' | 'busy' | 'terminated'
  tasksProcessed: number
  tasksSuccess: number
  tasksFailed: number
  avgDuration: number
}
```

**驗收標準**：
- [x] 配置結構完整
- [x] 類型定義清晰
- [x] 預設值合理

**狀態**：✅ 已完成

---

### ✅ Task 1.2.3.3: WorkerPool 實現

**檔案**：`packages/core/src/events/WorkerPool.ts`

**目標**：
實現 Worker 線程池，支持並發任務處理、自動擴展、健康檢查

**功能實現**：

#### Worker 生命週期管理
```
Created → Idle ↔ Busy → Terminated
```

#### WorkerPool 類方法

- **初始化與生命週期**：
  - `constructor(config: WorkerPoolConfig, meter?: Meter)` - 初始化
  - `start(): Promise<void>` - 啟動線程池
  - `stop(): Promise<void>` - 停止線程池
  - `isRunning(): boolean` - 檢查運行狀態

- **任務管理**：
  - `submit(task: EventTask): Promise<void>` - 提交任務
  - `getQueueSize(): number` - 獲取隊列大小
  - `getStats(): WorkerPoolStats` - 獲取統計信息
  - `getWorkerStats(workerId: string): WorkerStats` - 獲取 Worker 統計

- **自動擴展**：
  - `createWorker(): void` - 創建新 Worker
  - `terminateWorker(workerId: string): void` - 終止 Worker
  - `performHealthCheck(): void` - 執行健康檢查
  - `autoScale(): void` - 自動擴展邏輯

#### 自動擴展策略

**擴展觸發條件**：
- 隊列深度 > `maxQueueSize * scaleUpThreshold`（預設 80%）
- Worker 利用率 > 80%

**縮減觸發條件**：
- 隊列深度 < `maxQueueSize * scaleDownThreshold`（預設 20%）
- Worker 利用率 < 20%（連續 3 個週期）

**限制**：
- Worker 數量範圍：[minWorkers, maxWorkers]
- 避免頻繁擴縮

#### 健康檢查

```typescript
performHealthCheck(): void {
  // 1. 檢查超時任務（TaskTimeout 過期）
  // 2. 檢查卡住的 Worker（無進度）
  // 3. 檢查隊列堆積
  // 4. 觸發自動擴展邏輯
}
```

**驗收標準**：
- [x] Worker 生命週期正確
- [x] 任務執行正確
- [x] 自動擴展有效
- [x] 健康檢查完整
- [x] 17 個單元測試全部通過

**測試覆蓋**：
- [x] `tests/WorkerPool.test.ts` - 17 個測試

**狀態**：✅ 已完成

---

### ✅ Task 1.2.3.4: WorkerPoolMetrics 整合

**檔案**：`packages/core/src/events/WorkerPoolMetrics.ts`

**目標**：
集成 OpenTelemetry Metrics 監控 Worker 線程池狀態

**指標實現**：

#### Observable Metrics（實時查詢）

```typescript
// 線程池大小（Worker 數）
poolSizeGauge: ObservableGauge

// 利用率（0-100%）
utilizationGauge: ObservableGauge

// 隊列深度
queueDepthGauge: ObservableGauge
```

#### Counter Metrics（累計）

```typescript
// 已處理任務數
tasksProcessedCounter: Counter

// 成功任務數
tasksSuccessfulCounter: Counter

// 失敗任務數
tasksFailedCounter: Counter
```

#### Histogram Metrics（分佈）

```typescript
// 任務處理時間分佈
processingTimeHistogram: Histogram
buckets: [10, 50, 100, 500, 1000, 5000, 10000]ms
```

**功能實現**：

```typescript
class WorkerPoolMetrics {
  // 提供數據源
  setPoolSizeProvider(fn: () => number)
  setUtilizationProvider(fn: () => number)
  setQueueDepthProvider(fn: () => number)

  // 記錄事件
  recordTaskCompleted(durationMs: number)
  recordTaskFailed(durationMs: number)
  recordWorkerCreated()
  recordWorkerTerminated()
}
```

**Prometheus 查詢範例**：

```promql
# 線程池平均大小
avg(pool_size)

# 利用率趨勢
rate(tasks_processed_total[5m])

# 隊列深度告警
queue_depth > 100
```

**驗收標準**：
- [x] 所有指標正確記錄
- [x] OpenTelemetry 集成完整
- [x] Prometheus 導出正確
- [x] 20 個指標測試全部通過

**測試覆蓋**：
- [x] `tests/WorkerPoolMetrics.test.ts` - 20 個測試

**狀態**：✅ 已完成

---

### ✅ Task 1.2.3.5: 集成測試與文檔

**檔案**：
- 新增：`tests/BackpressureDLQ.test.ts` - 背壓 + DLQ 集成測試
- 新增：`docs/BACKPRESSURE_GUIDE.md` - 背壓機制使用指南

**目標**：
驗證背壓機制與現有系統的協作，提供完整文檔

**集成測試場景**：

```typescript
describe('Backpressure + DLQ Integration', () => {
  // 1. 正常流程：事件成功入隊
  test('Normal flow: event enqueued successfully', () => {
    // Backpressure = NORMAL
    // Event 入隊成功
  })

  // 2. 背壓觸發：WARNING 狀態下低優先級延遲入隊
  test('WARNING state: low-priority event delayed', () => {
    // 隊列 > 60%
    // 低優先級事件延遲入隊
    // 高優先級事件直接入隊
  })

  // 3. 臨界狀態：CRITICAL 狀態下低優先級被拒絕
  test('CRITICAL state: low-priority event rejected', () => {
    // 隊列 > 85%
    // 低優先級事件被拒絕
    // 高優先級事件入隊成功
  })

  // 4. 優先級飢餓保護：低優先級超時提升
  test('Starvation protection: promote delayed low-priority', () => {
    // 低優先級事件等待 > 5000ms
    // 自動提升至高優先級
    // 確保不會被永遠延遲
  })

  // 5. DLQ 協作：拒絕事件進入 DLQ
  test('Rejected event handled by DLQ', () => {
    // 事件在 OVERFLOW 時被拒絕
    // 觸發 onRejected 回呼
    // 事件進入 DLQ 等待重試
  })

  // 6. 恢復流程：狀態降級與事件重新入隊
  test('Recovery flow: state downgrade and retry', () => {
    // 隊列深度下降到 50%
    // 背壓狀態從 CRITICAL 降至 WARNING
    // 延遲的事件重新入隊
  })
})
```

**文檔結構（BACKPRESSURE_GUIDE.md）**：

- **背景與動機**：為什麼需要背壓機制
- **概念說明**：背壓狀態、優先級飢餓、遲滯設計
- **配置指南**：各個配置選項的含義與最佳實踐
- **使用範例**：
  - 基本配置
  - 優先級飢餓保護
  - 拒絕策略選擇
  - 監控與告警
- **故障排除**：常見問題與解決方案
- **性能調優**：隊列大小、延遲時間等參數優化
- **與其他機制的協作**：背壓 + DLQ + CircuitBreaker

**驗收標準**：
- [x] 集成測試場景完整
- [x] 文檔清晰實用
- [x] 所有測試通過

**測試覆蓋**：
- [x] `tests/BackpressureDLQ.test.ts` - 10+ 個集成測試

**狀態**：✅ 已完成

---

## 📊 Phase 3 成果統計

| 指標 | 數值 |
|------|------|
| 新增核心類 | 4 個（BackpressureManager、WorkerPool、WorkerPoolConfig、WorkerPoolMetrics） |
| 新增測試 | 67 個 |
| 代碼行數 | ~2,000 行 |
| 測試通過率 | 100% ✅ |
| 文檔完成 | BACKPRESSURE_GUIDE.md |
| 與 Phase 1-2 的協作 | DLQ + CircuitBreaker 無縫集成 |

---

## 🔗 相關設計決策

### 決策 1: 背壓狀態設計

**選擇**：4 層背壓狀態 + 遲滯設計

**理由**：
- 4 層設計可以在不同壓力下採用不同策略
- 遲滯設計（恢復閾值 < 觸發閾值）防止狀態振盪

### 決策 2: 拒絕策略

**選擇**：支持 3 種拒絕策略

```
'throw'              - 拋出異常
'drop-silent'        - 靜默丟棄
'drop-with-callback' - 丟棄並觸發回呼
```

**理由**：
- 不同應用場景有不同需求
- 回呼機制允許應用自定義處理邏輯

### 決策 3: 優先級飢餓保護

**選擇**：超時提升策略

```typescript
// 低優先級事件等待超過 5000ms，自動提升至高優先級
if (event.waitTimeMs > starvationTimeoutMs) {
  event.priority = 'high'
}
```

**理由**：
- 簡單高效，不需要複雜的動態優先級調整
- 保證公平性

---

## 📈 與其他 Phase 的協作

### 與 Phase 1 (DLQ) 的協作

```
事件入隊 → Backpressure 檢查 → 拒絕 → onRejected 回呼 → DLQ
           ↓
         允許 → 正常入隊
```

### 與 Phase 2 (CircuitBreaker) 的協作

```
事件執行 → CircuitBreaker 檢查 → 失敗 → DLQ → Backpressure 檢查 → 重試隊列
         ↓
       成功 → 完成
```

### 與 Phase 4 (Bull Queue) 的協作

```
本地隊列 Backpressure 滿 → 轉移到 Bull Queue (Redis) → Worker 處理
```

---

## ✅ 驗收標準

- [x] BackpressureManager 實現完整
- [x] WorkerPoolConfig 設計完整
- [x] WorkerPool 實現完整
- [x] WorkerPoolMetrics 集成完整
- [x] 67 個測試全部通過
- [x] 集成測試驗證 + DLQ、CircuitBreaker 協作
- [x] 文檔完整實用

---

## 📝 下一步 (Phase 4)

Phase 4 (Bull Queue 整合) 將：
1. 將背壓機制與 Bull Queue 整合
2. 支持分佈式背壓（多 Worker 協調）
3. 實現跨節點隊列深度監控

---

**最後更新**：2026-02-08
**狀態**：✅ 100% 完成
