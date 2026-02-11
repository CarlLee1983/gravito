# P2.3.1 報表隊列設計
# Report Queue Management System

## 概述

報表隊列管理系統提供非阻塞的異步報表生成能力，支持優先級、重試機制、死信隊列（DLQ）和完整的監控功能。

## 核心概念

### 隊列架構

```
應用層
  ↓
提交任務 (submitJob)
  ↓
隊列管理器 (ReportQueueManager)
  ├─ 待處理隊列 (Pending Queue)
  ├─ 處理中隊列 (Processing Queue)
  ├─ 完成隊列 (Completed Queue)
  └─ 死信隊列 (DLQ)
  ↓
處理器 (Processor)
  ├─ Sales Report
  ├─ Inventory Report
  ├─ Customer Report
  ├─ Revenue Report
  └─ Custom Report
  ↓
結果存儲
```

### 任務生命周期

```
提交 → 待處理 → 處理中 → 完成
         ↓        ↓
       [重試] ← [失敗]
         ↓
       DLQ ← [重新提交]
```

### 優先級系統

任務支持三個優先級：

- **高 (High)**：立即處理，用於關鍵報表
- **中 (Medium)**：正常處理，默認優先級
- **低 (Low)**：空閒時處理，用於背景任務

優先級隊列確保高優先級任務先於低優先級任務執行。

### 重試機制（指數退避）

失敗的任務會自動重試，使用指數退避算法：

```
第 1 次重試延遲：1s × 基礎延遲
第 2 次重試延遲：2s × 基礎延遲
第 3 次重試延遲：4s × 基礎延遲
...

最大延遲：不超過 maxRetryDelay (默認 60s)
```

**配置示例**：

```typescript
const manager = new ReportQueueManager({
  maxRetries: 3,              // 最多重試 3 次
  baseRetryDelay: 1000,       // 基礎延遲 1s
  maxRetryDelay: 60000,       // 最大延遲 60s
})
```

### 死信隊列（DLQ）

超過最大重試次數的失敗任務會被移到死信隊列，等待進一步處理：

- **隔離失敗任務**：防止無限重試
- **人工審查**：允許管理員檢查失敗原因
- **重新提交**：修復原因後重新提交任務

## API 參考

### 1. 初始化

```typescript
import { ReportQueueManager } from './src/reporting'

const manager = new ReportQueueManager({
  maxRetries: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 60000,
  concurrency: 5,
  timeout: 300000, // 5 分鐘
})
```

**配置參數**：

| 參數 | 類型 | 默認值 | 說明 |
|------|------|--------|------|
| `maxRetries` | number | 3 | 最大重試次數 |
| `baseRetryDelay` | number | 1000 | 基礎重試延遲（毫秒） |
| `maxRetryDelay` | number | 60000 | 最大重試延遲（毫秒） |
| `concurrency` | number | 5 | 並發處理數 |
| `timeout` | number | 300000 | 任務超時（毫秒） |

### 2. 註冊處理器

```typescript
// 註冊銷售報表處理器
manager.registerProcessor('sales', async (job) => {
  const data = await fetchSalesData(job.data)
  return generateSalesReport(data)
})

// 註冊庫存報表處理器
manager.registerProcessor('inventory', async (job) => {
  const inventory = await getInventoryData(job.data)
  return generateInventoryReport(inventory)
})
```

### 3. 提交任務

```typescript
// 提交高優先級銷售報表
const jobId = manager.submitJob(
  'sales',
  { startDate: '2026-01-01', endDate: '2026-01-31' },
  'high'
)

console.log(`任務已提交: ${jobId}`)
```

**報表類型**：

- `'sales'` - 銷售報表
- `'inventory'` - 庫存報表
- `'customer'` - 客戶報表
- `'revenue'` - 收入報表
- `'custom'` - 自定義報表

### 4. 查詢任務狀態

```typescript
// 獲取任務狀態
const job = manager.getJobStatus(jobId)

if (job?.status === 'completed') {
  console.log('報表已生成:', job.result)
} else if (job?.status === 'failed') {
  console.log('報表生成失敗:', job.error)
} else if (job?.status === 'retrying') {
  console.log('正在重試...')
}
```

### 5. 隊列統計

```typescript
const stats = manager.getStats()

console.log(`待處理: ${stats.pendingJobs}`)
console.log(`處理中: ${stats.processingJobs}`)
console.log(`已完成: ${stats.completedJobs}`)
console.log(`已失敗: ${stats.failedJobs}`)
console.log(`DLQ 任務: ${stats.dlqJobs}`)
console.log(`成功率: ${stats.successRate.toFixed(2)}%`)
console.log(`平均處理時間: ${(stats.averageProcessingTime / 1000).toFixed(2)}s`)
```

### 6. 死信隊列管理

```typescript
// 獲取 DLQ 中的所有任務
const dlqJobs = manager.getDLQJobs()

// 重新提交 DLQ 任務
const success = manager.resubmitDLQJob(jobId)

if (success) {
  console.log('DLQ 任務已重新提交')
}

// 清空 DLQ
const count = manager.clearDLQ()
console.log(`已清除 ${count} 個 DLQ 任務`)
```

### 7. 事件監聽

```typescript
// 監聽任務提交
manager.on('job:submitted', (data: unknown) => {
  const event = data as { jobId: string; reportType: string }
  console.log(`任務已提交: ${event.jobId}`)
})

// 監聽任務完成
manager.on('job:completed', (data: unknown) => {
  const event = data as { jobId: string; processingTime: number }
  console.log(`任務完成，耗時 ${event.processingTime}ms`)
})

// 監聽任務失敗
manager.on('job:dlq', (data: unknown) => {
  const event = data as { jobId: string; error: string }
  console.log(`任務移至 DLQ: ${event.error}`)
})

// 監聽重試
manager.on('job:retry', (data: unknown) => {
  const event = data as { jobId: string; delay: number }
  console.log(`${event.delay}ms 後重試`)
})
```

### 8. 狀態報告

```typescript
const report = manager.generateStatusReport()
console.log(report)

// 輸出範例：
// ========== REPORT QUEUE STATUS ==========
//
// --- QUEUE STATISTICS ---
// 總任務數: 10
// 待處理: 2
// 處理中: 1
// 已完成: 6
// 已失敗: 1
// DLQ 任務: 0
//
// --- PERFORMANCE ---
// 平均處理時間: 2.50s
// 成功率: 85.71%
```

## 使用示例

### 完整工作流程

```typescript
import { ReportQueueManager } from './src/reporting'

// 1. 初始化隊列管理器
const manager = new ReportQueueManager({
  maxRetries: 3,
  baseRetryDelay: 1000,
  concurrency: 5,
})

// 2. 註冊報表處理器
manager.registerProcessor('sales', async (job) => {
  // 獲取銷售數據
  const data = {
    totalSales: 100000,
    transactionCount: 1000,
    averageOrderValue: 100,
  }
  return data
})

// 3. 監聽事件
manager.on('job:completed', (data) => {
  console.log('報表已生成！')
})

manager.on('job:dlq', (data) => {
  console.log('報表生成失敗，已移至 DLQ')
})

// 4. 提交任務
const jobId = manager.submitJob(
  'sales',
  { period: 'monthly' },
  'high'
)

console.log(`任務 ${jobId} 已提交`)

// 5. 等待完成
setTimeout(() => {
  const job = manager.getJobStatus(jobId)
  if (job?.status === 'completed') {
    console.log('銷售報表:', job.result)
  }
}, 5000)
```

### 批量提交任務

```typescript
// 提交多個報表任務
const reports = ['sales', 'inventory', 'customer']
const jobIds: string[] = []

for (const report of reports) {
  const jobId = manager.submitJob(
    report as any,
    { period: 'monthly' },
    'medium'
  )
  jobIds.push(jobId)
}

console.log(`已提交 ${jobIds.length} 個任務`)
```

### 優先級分配

```typescript
// 緊急報表 - 高優先級
manager.submitJob('sales', { period: 'daily' }, 'high')

// 常規報表 - 中優先級
manager.submitJob('inventory', { location: 'all' }, 'medium')

// 背景報表 - 低優先級
manager.submitJob('custom', { complex: true }, 'low')

// 隊列會按優先級順序處理這些任務
```

## 性能最佳實踐

### 1. 並發數配置

```typescript
// 根據系統資源調整
const manager = new ReportQueueManager({
  concurrency: 5, // 一次最多並發 5 個任務
})

// 建議：
// • CPU 核心數 × 2：IO 密集型任務
// • CPU 核心數：CPU 密集型任務
```

### 2. 超時設置

```typescript
// 根據報表複雜度設置超時
const manager = new ReportQueueManager({
  timeout: 300000, // 5 分鐘用於複雜報表
})

// 或為不同報表設置不同超時
manager.registerProcessor('simple', async (job) => {
  // 預期 < 30s
  return generateSimpleReport()
}, 30000)

manager.registerProcessor('complex', async (job) => {
  // 預期 < 5 minutes
  return generateComplexReport()
}, 300000)
```

### 3. 重試策略

```typescript
// 保守策略 - 高可靠性
const manager = new ReportQueueManager({
  maxRetries: 5,
  baseRetryDelay: 2000, // 2s
})

// 積極策略 - 快速失敗
const manager = new ReportQueueManager({
  maxRetries: 1,
  baseRetryDelay: 500, // 500ms
})
```

## 監控和告警

### 監控關鍵指標

```typescript
setInterval(() => {
  const stats = manager.getStats()

  // 監控待處理任務堆積
  if (stats.pendingJobs > 100) {
    alert('隊列堆積: 待處理任務 > 100')
  }

  // 監控失敗率
  const failureRate = (stats.failedJobs / stats.totalJobs) * 100
  if (failureRate > 10) {
    alert('失敗率高: > 10%')
  }

  // 監控 DLQ 堆積
  if (stats.dlqJobs > 10) {
    alert('DLQ 堆積: > 10 個任務')
  }
}, 60000) // 每分鐘檢查一次
```

### 自動化告警

```typescript
manager.on('job:dlq', (data) => {
  const event = data as { jobId: string; error: string }

  // 發送告警通知
  alerting.send({
    level: 'warning',
    title: '報表任務失敗',
    message: `任務 ${event.jobId} 已移至 DLQ: ${event.error}`,
    action: 'dlq_job',
  })
})
```

## 故障排除

### 問題 1：任務堆積

**症狀**：待處理任務不斷增加

**原因**：
- 並發數設置過低
- 處理器性能不足
- 超時設置過短

**解決方案**：
```typescript
// 增加並發數
const manager = new ReportQueueManager({
  concurrency: 10, // 從 5 增加到 10
})

// 優化處理器性能
manager.registerProcessor('sales', async (job) => {
  // 使用緩存減少數據庫查詢
  const cache = new Map()
  return optimizedReport(job.data, cache)
})
```

### 問題 2：高失敗率

**症狀**：許多任務移至 DLQ

**原因**：
- 外部服務不可用
- 數據格式錯誤
- 資源耗盡

**解決方案**：
```typescript
// 增加重試次數
const manager = new ReportQueueManager({
  maxRetries: 5,
  baseRetryDelay: 2000,
})

// 改進錯誤處理
manager.registerProcessor('sales', async (job) => {
  try {
    return await generateReport(job.data)
  } catch (error) {
    if (isTemporaryError(error)) {
      throw error // 觸發重試
    } else {
      // 記錄並返回部分結果
      console.error('永久性錯誤:', error)
      return { error: error.message, partial: true }
    }
  }
})
```

### 問題 3：任務超時

**症狀**：任務經常超時失敗

**原因**：
- 超時設置太短
- 報表生成邏輯低效
- 數據量過大

**解決方案**：
```typescript
// 增加超時時間
const manager = new ReportQueueManager({
  timeout: 600000, // 10 分鐘
})

// 優化報表生成
manager.registerProcessor('complex', async (job) => {
  // 使用分頁減少記憶體使用
  return generateReportInBatches(job.data)
})
```

## 相關組件

- **P2.3.2** - 報表生成引擎（處理器實現）
- **P2.3.3** - 報表存儲和分發
- **P2.3.4** - 報表 UI 和調度
- **P2.3.5** - 報表系統測試和優化

## 總結

ReportQueueManager 提供了完整的非阻塞報表隊列解決方案：

- ✅ 優先級隊列管理
- ✅ 指數退避重試機制
- ✅ 死信隊列（DLQ）處理
- ✅ 完整的事件系統
- ✅ 詳細的監控和統計
- ✅ 高度可配置和可擴展

通過這個隊列系統，可以實現可靠、高效的異步報表生成能力。
