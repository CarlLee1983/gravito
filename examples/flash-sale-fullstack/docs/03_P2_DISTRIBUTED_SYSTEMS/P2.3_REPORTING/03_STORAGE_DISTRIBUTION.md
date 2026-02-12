# P2.3.3 報表存儲和分發
# Report Storage and Distribution System

## 概述

報表存儲和分發系統提供完整的報表生命週期管理，包括長期存儲、版本控制、多渠道分發（郵件、Webhook、推送通知），以及自動清理過期報表。

## 核心概念

### 報表存儲和分發架構

```
報表生成引擎 (ReportGenerationEngine)
  ↓
報表存儲管理器 (ReportStorageManager)
  ├─ 報表持久化存儲
  ├─ 版本控制
  ├─ 元數據管理
  └─ 自動清理
  ↓
報表分發管理器 (ReportDistributionManager)
  ├─ 多渠道分發（Email、Webhook、Push、Download）
  ├─ 收件人管理
  ├─ 分發失敗重試
  └─ 分發記錄和審計
  ↓
最終交付
  ├─ 郵件通知
  ├─ Webhook 回調
  ├─ 推送通知
  └─ 文件下載
```

## 核心組件

### 1. ReportStorageManager（報表存儲管理器）

管理報表的存儲、檢索、版本控制和清理。

```typescript
export interface StoredReport {
  reportId: string              // 報表唯一識別符
  templateId: string            // 使用的模板 ID
  name: string                  // 報表名稱
  description: string           // 報表描述
  format: 'csv' | 'excel' | 'json'
  content: string               // 報表內容
  fileSize: number              // 文件大小（字節）
  totalRecords: number          // 記錄數
  createdAt: Date               // 創建時間
  expiresAt?: Date              // 過期時間
  tags: string[]                // 標籤
  metadata: Record<string, unknown>  // 元數據
  storagePath: string           // 存儲路徑
  checksum: string              // 內容校驗和
}

export interface ReportQuery {
  templateId?: string           // 按模板篩選
  startDate?: Date              // 開始日期
  endDate?: Date                // 結束日期
  tags?: string[]               // 按標籤篩選
  format?: 'csv' | 'excel' | 'json'
  limit?: number                // 返回限制
  offset?: number               // 分頁偏移
}
```

### 2. ReportDistributionManager（報表分發管理器）

管理報表的多渠道分發、收件人和重試機制。

```typescript
export interface Recipient {
  id: string
  type: 'email' | 'webhook' | 'user' | 'team'
  destination: string           // 郵箱、Webhook URL 或用戶 ID
  name: string                  // 收件人名稱
  enabled: boolean
  preferences: DistributionPreferences
}

export interface DistributionJob {
  jobId: string
  reportId: string
  recipients: Recipient[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  results: DistributionResult[]  // 各收件人的分發結果
  attempts: number
  maxAttempts: number
  nextRetryAt?: Date
  error?: string
}

export interface DistributionResult {
  recipientId: string
  recipientName: string
  channel: 'email' | 'webhook' | 'download' | 'push'
  status: 'success' | 'failed' | 'pending'
  sentAt?: Date
  deliveredAt?: Date
  error?: string
  metadata: Record<string, unknown>
}
```

## API 參考

### 1. 報表存儲管理

#### 初始化

```typescript
import { ReportStorageManager } from './src/reporting'

const storage = new ReportStorageManager({
  maxReportAge: 90 * 24 * 60 * 60 * 1000, // 90 天
  maxStorageSize: 10 * 1024 * 1024 * 1024, // 10GB
  cleanupInterval: 24 * 60 * 60 * 1000, // 每天清理一次
  enableVersioning: true,
  compressionEnabled: false,
})
```

#### 存儲報表

```typescript
const report = storage.storeReport(
  'report-001',
  'daily-sales',
  'Daily Sales Report',
  'Daily sales summary for 2026-01-15',
  'csv',
  csvContent,
  1000,
  ['finance', 'daily'],
  { period: '2026-01-15', region: 'APAC' }
)

console.log(`報表已存儲: ${report.reportId}`)
console.log(`存儲路徑: ${report.storagePath}`)
console.log(`文件大小: ${(report.fileSize / 1024).toFixed(2)}KB`)
```

#### 檢索報表

```typescript
// 按 ID 檢索
const report = storage.retrieveReport('report-001')

// 高級查詢
const results = storage.queryReports({
  templateId: 'daily-sales',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-01-31'),
  tags: ['finance'],
  format: 'csv',
  limit: 50,
  offset: 0,
})

console.log(`找到 ${results.length} 個報表`)
```

#### 標籤管理

```typescript
// 添加標籤
storage.addReportTag('report-001', 'archived')
storage.addReportTag('report-001', 'verified')

// 移除標籤
storage.removeReportTag('report-001', 'archived')

// 查詢帶特定標籤的報表
const archivedReports = storage.queryReports({
  tags: ['archived']
})
```

#### 元數據管理

```typescript
// 更新元數據
storage.updateReportMetadata('report-001', {
  reviewed: true,
  reviewedBy: 'manager@example.com',
  reviewDate: new Date().toISOString(),
})

// 查詢報表，元數據會被包含
const report = storage.retrieveReport('report-001')
console.log(report?.metadata.reviewed) // true
```

#### 版本控制

```typescript
// 系統自動維護版本歷史
// 存儲第一個版本
storage.storeReport('report-v1', 'sales', 'Sales', '', 'csv', 'data v1', 10)

// 存儲第二個版本
storage.storeReport('report-v1', 'sales', 'Sales', '', 'csv', 'data v2', 12)

// 檢索所有版本
const versions = storage.getReportVersions('report-v1')
console.log(`總共 ${versions.length} 個版本`)
```

#### 報表過期

```typescript
// 設置報表過期時間
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 天後
storage.setReportExpiration('report-001', expiresAt)

// 過期報表會在下次清理時自動刪除
```

#### 存儲統計

```typescript
const stats = storage.getStats()

console.log(`總報表數: ${stats.totalReports}`)
console.log(`總存儲大小: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`)
console.log(`平均報表大小: ${(stats.averageReportSize / 1024).toFixed(2)}KB`)
console.log(`CSV 報表: ${stats.reportsByFormat.csv}`)
console.log(`Excel 報表: ${stats.reportsByFormat.excel}`)
console.log(`銷售報表: ${stats.reportsByTemplate['daily-sales']}`)
```

### 2. 報表分發管理

#### 初始化

```typescript
import { ReportDistributionManager } from './src/reporting'

const distribution = new ReportDistributionManager({
  maxRetries: 3,
  baseRetryDelay: 5000,
  maxRetryDelay: 300000,
  emailEnabled: true,
  webhookEnabled: true,
  pushNotificationEnabled: true,
})
```

#### 註冊收件人

```typescript
// 郵件收件人
distribution.registerRecipient({
  id: 'user@example.com',
  type: 'email',
  destination: 'user@example.com',
  name: 'John Doe',
  enabled: true,
  preferences: {
    formats: ['csv', 'excel'],
    frequency: 'daily',
    includeMetadata: true,
    notificationOnly: false,
  },
})

// Webhook 收件人
distribution.registerRecipient({
  id: 'webhook-api',
  type: 'webhook',
  destination: 'https://api.example.com/reports/notify',
  name: 'API Webhook',
  enabled: true,
  preferences: {
    formats: ['json'],
    frequency: 'immediate',
    includeMetadata: true,
    notificationOnly: false,
  },
})

// 用戶推送通知
distribution.registerRecipient({
  id: 'user-123',
  type: 'user',
  destination: 'user-123',
  name: 'Mobile User',
  enabled: true,
  preferences: {
    formats: ['json'],
    frequency: 'weekly',
    includeMetadata: false,
    notificationOnly: true,
  },
})
```

#### 註冊分發處理器

```typescript
// 郵件分發處理器
distribution.registerDistributionHandler('email', async (recipient, content, fileName) => {
  await sendEmail({
    to: recipient.destination,
    subject: `Report: ${fileName}`,
    body: `Please find attached the report: ${fileName}`,
    attachment: {
      filename: fileName,
      content: content,
    },
  })
})

// Webhook 分發處理器
distribution.registerDistributionHandler('webhook', async (recipient, content, fileName) => {
  await fetch(recipient.destination, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName,
      content,
      timestamp: new Date(),
    }),
  })
})

// 推送通知處理器
distribution.registerDistributionHandler('push', async (recipient, _content, fileName) => {
  await sendPushNotification({
    userId: recipient.destination,
    title: 'Report Ready',
    message: `Your report ${fileName} is ready for download`,
    action: `open_report/${fileName}`,
  })
})
```

#### 提交分發任務

```typescript
// 提交分發任務到所有啟用的收件人
const jobId = distribution.submitDistributionJob(
  'report-001',
  reportContent,
  'daily-sales.csv'
)

console.log(`分發任務已提交: ${jobId}`)

// 提交到特定收件人
const specificJobId = distribution.submitDistributionJob(
  'report-002',
  reportContent,
  'daily-sales.xlsx',
  ['user@example.com', 'webhook-api'] // 特定收件人
)
```

#### 監控分發任務

```typescript
// 獲取任務狀態
const job = distribution.getDistributionJobStatus(jobId)

if (job?.status === 'completed') {
  console.log('✅ 分發已完成')
  for (const result of job.results) {
    if (result.status === 'success') {
      console.log(`✅ ${result.recipientName} - 成功`)
    } else {
      console.log(`❌ ${result.recipientName} - 失敗: ${result.error}`)
    }
  }
} else if (job?.status === 'failed') {
  console.log(`❌ 分發失敗: ${job.error}`)
} else if (job?.status === 'retrying') {
  console.log(`🔄 重試中...（下一次嘗試時間: ${job.nextRetryAt}）`)
}

// 查詢特定報表的所有分發任務
const jobs = distribution.queryDistributionJobs('report-001')
console.log(`找到 ${jobs.length} 個分發任務`)
```

#### 收件人管理

```typescript
// 禁用收件人
distribution.setRecipientEnabled('user@example.com', false)

// 重新啟用
distribution.setRecipientEnabled('user@example.com', true)

// 獲取分發統計
const stats = distribution.getStats()
console.log(`總任務數: ${stats.totalJobs}`)
console.log(`待處理: ${stats.pendingJobs}`)
console.log(`已完成: ${stats.completedJobs}`)
console.log(`成功率: ${stats.successRate.toFixed(2)}%`)
console.log(`總收件人數: ${stats.totalRecipients}`)
console.log(`已啟用: ${stats.enabledRecipients}`)
```

## 與其他系統的集成

### 與 ReportGenerationEngine 的集成

```typescript
import { ReportGenerationEngine } from './src/reporting'
import { ReportStorageManager } from './src/reporting'
import { ReportDistributionManager } from './src/reporting'

const generator = new ReportGenerationEngine()
const storage = new ReportStorageManager()
const distribution = new ReportDistributionManager()

// 完整工作流
async function generateAndDistributeReport() {
  // 1. 生成報表
  const result = await generator.generateReport({
    templateId: 'daily-sales',
    format: 'csv',
  })

  if (!result.success) {
    console.error('報表生成失敗:', result.error)
    return
  }

  // 2. 存儲報表
  const storedReport = storage.storeReport(
    result.reportId,
    result.templateId,
    'Daily Sales Report',
    'Daily sales summary',
    result.format as any,
    '', // 在實際應用中應該有內容
    result.totalRecords,
    ['automatic'],
    { generatedAt: new Date().toISOString() }
  )

  // 3. 分發報表
  const jobId = distribution.submitDistributionJob(
    result.reportId,
    '', // 報表內容
    result.fileName
  )

  console.log(`報表流程完成: 存儲 ID=${storedReport.reportId}, 分發 ID=${jobId}`)
}

await generateAndDistributeReport()
```

### 與 ReportQueueManager 的集成

```typescript
import { ReportQueueManager } from './src/reporting'

const queue = new ReportQueueManager()

// 在隊列中集成存儲和分發
queue.registerProcessor('sales-with-distribution', async (job) => {
  // 1. 生成報表
  const result = await generator.generateReport({
    templateId: 'daily-sales',
    format: job.data.format || 'csv',
  })

  if (result.success) {
    // 2. 存儲報表
    const storedReport = storage.storeReport(
      result.reportId,
      result.templateId,
      'Daily Sales',
      '',
      result.format as any,
      '', // 內容
      result.totalRecords,
      job.data.tags || [],
      job.data.metadata
    )

    // 3. 分發報表
    distribution.submitDistributionJob(
      result.reportId,
      '', // 內容
      result.fileName,
      job.data.recipientIds
    )

    return {
      success: true,
      reportId: result.reportId,
      storagePath: storedReport.storagePath,
    }
  }

  throw new Error(result.error)
})

// 提交高優先級報表任務
const jobId = queue.submitJob(
  'sales-with-distribution',
  {
    format: 'excel',
    tags: ['urgent', 'finance'],
    recipientIds: ['manager@example.com', 'webhook-api'],
  },
  'high'
)
```

## 使用示例

### 完整的報表生命週期

```typescript
// 1. 初始化所有組件
const generator = new ReportGenerationEngine()
const storage = new ReportStorageManager()
const distribution = new ReportDistributionManager()

// 2. 設置報表模板
const template: ReportTemplate = {
  templateId: 'monthly-sales',
  name: 'Monthly Sales Report',
  description: 'Comprehensive monthly sales analysis',
  type: 'sales',
  fields: [
    { fieldId: 'month', name: 'month', label: 'Month', type: 'string' },
    { fieldId: 'revenue', name: 'revenue', label: 'Revenue', type: 'currency' },
    { fieldId: 'growth', name: 'growth', label: 'Growth Rate', type: 'percentage' },
  ],
}

generator.registerTemplate(template)

// 3. 設置數據提供器
generator.registerDataProvider('monthly-sales', async () => {
  return [
    { month: '2026-01', revenue: 100000, growth: 0.15 },
    { month: '2026-02', revenue: 120000, growth: 0.20 },
  ]
})

// 4. 設置收件人
distribution.registerRecipient({
  id: 'finance-team',
  type: 'email',
  destination: 'finance@example.com',
  name: 'Finance Team',
  enabled: true,
  preferences: {
    formats: ['excel'],
    frequency: 'monthly',
    includeMetadata: true,
    notificationOnly: false,
  },
})

// 5. 設置分發處理器
distribution.registerDistributionHandler('email', async (recipient, content, fileName) => {
  console.log(`📧 Sending ${fileName} to ${recipient.destination}`)
})

// 6. 生成、存儲和分發報表
async function monthlyReportWorkflow() {
  // 生成
  const result = await generator.generateReport({
    templateId: 'monthly-sales',
    format: 'excel',
  })

  if (!result.success) throw new Error(result.error)

  // 存儲
  const stored = storage.storeReport(
    result.reportId,
    'monthly-sales',
    'Monthly Sales Report',
    'Monthly sales analysis',
    'excel',
    '', // 內容
    result.totalRecords,
    ['automated', 'finance'],
    { month: '2026-02', runDate: new Date().toISOString() }
  )

  // 分發
  const jobId = distribution.submitDistributionJob(
    result.reportId,
    '', // 內容
    result.fileName
  )

  console.log(`✅ Report complete: ${result.reportId}`)
  console.log(`📦 Stored at: ${stored.storagePath}`)
  console.log(`📤 Distribution job: ${jobId}`)
}

await monthlyReportWorkflow()
```

## 性能優化建議

### 1. 存儲優化

```typescript
// 啟用壓縮（對大型 CSV 文件有效）
const storage = new ReportStorageManager({
  compressionEnabled: true,
  maxReportAge: 60 * 24 * 60 * 60 * 1000, // 60 天
})

// 定期清理過期報表
setInterval(() => {
  const stats = storage.getStats()
  if (stats.totalSize > 5 * 1024 * 1024 * 1024) {
    // 如果大於 5GB，執行清理
    console.log('執行存儲清理...')
  }
}, 24 * 60 * 60 * 1000) // 每天檢查一次
```

### 2. 分發優化

```typescript
// 並發分發多個報表
async function bulkDistribute(reportIds: string[]) {
  const promises = reportIds.map((id) =>
    distribution.submitDistributionJob(id, '', `${id}.csv`)
  )

  const results = await Promise.allSettled(promises)
  console.log(`已提交 ${results.length} 個分發任務`)
}

// 延遲分發以分散負載
async function distributeLater(reportId: string, delayMs: number) {
  setTimeout(() => {
    distribution.submitDistributionJob(reportId, '', `${reportId}.csv`)
  }, delayMs)
}
```

### 3. 查詢優化

```typescript
// 使用分頁避免加載所有報表
const pageSize = 100
let offset = 0

async function getAllReports() {
  const allReports = []

  while (true) {
    const page = storage.queryReports({
      limit: pageSize,
      offset,
    })

    if (page.length === 0) break

    allReports.push(...page)
    offset += pageSize
  }

  return allReports
}
```

## 故障排除

### 問題 1：存儲空間滿

**症狀**：無法存儲新報表

**原因**：
- 報表未自動清理
- 存儲配置不合理
- 有大量舊報表未刪除

**解決方案**：
```typescript
// 手動觸發清理
const storage = new ReportStorageManager({
  maxReportAge: 30 * 24 * 60 * 60 * 1000, // 降低到 30 天
})

// 檢查並刪除超大報表
const stats = storage.getStats()
const reports = storage.queryReports({})
const largeReports = reports.filter((r) => r.fileSize > 100 * 1024 * 1024)

for (const report of largeReports) {
  storage.deleteReport(report.reportId)
}
```

### 問題 2：分發失敗率高

**症狀**：許多分發任務失敗

**原因**：
- 收件人信息不正確
- 分發處理器有問題
- 網絡不穩定

**解決方案**：
```typescript
// 增加重試次數
const distribution = new ReportDistributionManager({
  maxRetries: 5,
  baseRetryDelay: 10000,
})

// 檢查失敗的分發任務
const jobs = distribution.queryDistributionJobs('report-id')
for (const job of jobs) {
  if (job.status === 'failed') {
    console.log(`分發失敗: ${job.error}`)
    for (const result of job.results) {
      if (result.status === 'failed') {
        console.log(`  ${result.recipientName}: ${result.error}`)
      }
    }
  }
}
```

## 相關組件

- **P2.3.1** - 報表隊列管理系統
- **P2.3.2** - 報表生成引擎
- **P2.3.4** - 報表 UI 和調度
- **P2.3.5** - 報表系統測試和優化

## 總結

ReportStorageManager 和 ReportDistributionManager 提供了完整的報表存儲和分發解決方案：

- ✅ 完整的報表生命週期管理
- ✅ 版本控制和歷史追蹤
- ✅ 靈活的元數據和標籤系統
- ✅ 多渠道分發（郵件、Webhook、推送、下載）
- ✅ 自動重試和故障恢復
- ✅ 自動清理過期報表
- ✅ 詳細的分發審計和統計

通過這兩個系統，可以實現完整、可靠的報表存儲和分發能力。
