# P2.3.2 報表生成引擎
# Report Generation Engine

## 概述

報表生成引擎提供靈活、可擴展的異步報表生成能力，支持多種報表模板、多種輸出格式、以及流式處理大規模數據集。

## 核心概念

### 報表架構

```
應用層
  ↓
報表生成請求 (generateReport)
  ↓
報表引擎 (ReportGenerationEngine)
  ├─ 模板管理 (Template Management)
  ├─ 數據提供器 (Data Providers)
  ├─ 格式化引擎 (Formatting Engine)
  └─ 流式處理 (Stream Processing)
  ↓
輸出格式
  ├─ CSV (逗號分隔值)
  ├─ Excel (JSON 結構)
  └─ JSON (結構化數據)
```

### 報表流程

```
模板註冊 → 數據提供器 → 數據抓取 → 格式化 → 輸出生成
   ↓          ↓             ↓          ↓
定義字段    實現邏輯     應用篩選    類型轉換
      ↓
    流式輸出（大數據量）
```

## 核心組件

### 1. ReportTemplate（報表模板）

定義報表的結構和字段配置。

```typescript
export interface ReportTemplate {
  templateId: string                           // 模板唯一識別符
  name: string                                 // 模板名稱
  description: string                          // 模板描述
  type: 'daily' | 'weekly' | 'sales' | 'inventory' | 'custom'
  fields: ReportField[]                        // 報表字段列表
  filters?: ReportFilter[]                     // 可選篩選條件
  pageSize?: number                            // 流式生成的頁大小
}

export interface ReportField {
  fieldId: string                              // 字段唯一識別符
  name: string                                 // 字段名稱
  label: string                                // 中文標籤
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage'
  width?: number                               // CSV/Excel 列寬
  format?: string                              // 格式化字符串
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface ReportFilter {
  field: string                                // 篩選字段
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'between'
  value: unknown                               // 篩選值
}
```

### 2. ReportGenerationConfig（報表生成配置）

```typescript
export interface ReportGenerationConfig {
  templateId: string                           // 模板 ID
  filters?: ReportFilter[]                     // 運行時篩選
  format: 'csv' | 'excel' | 'json'             // 輸出格式
  batchSize?: number                           // 流式生成的批大小（默認 1000）
  includeHeader?: boolean                      // 是否包含標題（默認 true）
  encoding?: string                            // CSV 編碼（默認 utf-8）
}
```

### 3. ReportGenerationResult（報表生成結果）

```typescript
export interface ReportGenerationResult {
  reportId: string                             // 生成的報表 ID
  templateId: string                           // 使用的模板 ID
  format: string                               // 輸出格式
  totalRecords: number                         // 生成的記錄數
  processingTime: number                       // 處理耗時（毫秒）
  fileName: string                             // 生成的文件名
  fileSize: number                             // 文件大小（字節）
  success: boolean                             // 是否成功
  error?: string                               // 錯誤信息
}
```

## API 參考

### 1. 初始化

```typescript
import { ReportGenerationEngine } from './src/reporting'

const engine = new ReportGenerationEngine()
```

### 2. 註冊報表模板

```typescript
const salesTemplate: ReportTemplate = {
  templateId: 'daily-sales',
  name: 'Daily Sales Report',
  description: '每日銷售報表',
  type: 'daily',
  fields: [
    {
      fieldId: 'date',
      name: 'date',
      label: '日期',
      type: 'date',
    },
    {
      fieldId: 'totalSales',
      name: 'totalSales',
      label: '總銷售額',
      type: 'currency',
    },
    {
      fieldId: 'transactionCount',
      name: 'transactionCount',
      label: '交易數',
      type: 'number',
    },
  ],
}

engine.registerTemplate(salesTemplate)
```

### 3. 註冊數據提供器

```typescript
// 基礎數據提供器
engine.registerDataProvider('daily-sales', async () => {
  const data = await fetchSalesData()
  return data
})

// 支持篩選的數據提供器
engine.registerDataProvider('sales-filtered', async (filters) => {
  let query = 'SELECT * FROM sales'

  if (filters) {
    for (const filter of filters) {
      if (filter.field === 'startDate' && filter.operator === 'gte') {
        query += ` AND date >= '${filter.value}'`
      }
      if (filter.field === 'endDate' && filter.operator === 'lte') {
        query += ` AND date <= '${filter.value}'`
      }
    }
  }

  return db.query(query)
})
```

### 4. 生成報表

```typescript
// 簡單報表生成
const result = await engine.generateReport({
  templateId: 'daily-sales',
  format: 'csv',
})

console.log(`報表已生成: ${result.fileName}`)
console.log(`記錄數: ${result.totalRecords}`)
console.log(`耗時: ${result.processingTime}ms`)

// 帶篩選的報表生成
const filteredResult = await engine.generateReport({
  templateId: 'sales-filtered',
  format: 'excel',
  filters: [
    { field: 'startDate', operator: 'gte', value: '2026-01-01' },
    { field: 'endDate', operator: 'lte', value: '2026-01-31' },
  ],
})

// 帶編碼的報表生成
const csvResult = await engine.generateReport({
  templateId: 'daily-sales',
  format: 'csv',
  encoding: 'utf-8',
})
```

### 5. 流式報表生成（大數據量）

```typescript
// 適用於百萬級別記錄
const config: ReportGenerationConfig = {
  templateId: 'large-dataset',
  format: 'csv',
  batchSize: 1000,  // 每批 1000 條記錄
  includeHeader: true,
}

let totalSize = 0
for await (const chunk of engine.generateReportStream(config)) {
  // 可以直接寫入文件流
  fileStream.write(chunk)
  totalSize += chunk.length
}

console.log(`總大小: ${(totalSize / 1024 / 1024).toFixed(2)}MB`)
```

### 6. 查詢模板

```typescript
// 獲取單個模板
const template = engine.getTemplate('daily-sales')

// 獲取所有模板
const templates = engine.getTemplates()

// 獲取模板字段
const fields = engine.getTemplateFields('daily-sales')
```

### 7. 狀態報告

```typescript
const report = engine.generateStatusReport()
console.log(report)

// 輸出範例：
// ========== REPORT ENGINE STATUS ==========
//
// --- REGISTERED TEMPLATES ---
// 總模板數: 5
//   daily-sales
//     名稱: Daily Sales Report
//     類型: daily
//     欄位數: 3
//   ...
//
// --- DATA PROVIDERS ---
// 已註冊提供器: 5
```

## 數據類型和格式化

### 支持的字段類型

#### 1. String（字符串）

```typescript
{
  fieldId: 'productName',
  type: 'string',
  label: '商品名稱',
}
```

#### 2. Number（數字）

```typescript
{
  fieldId: 'quantity',
  type: 'number',
  label: '數量',
}
```

#### 3. Date（日期）

```typescript
{
  fieldId: 'orderDate',
  type: 'date',
  label: '訂單日期',
}
```

自動轉換為 ISO 格式：`YYYY-MM-DD`

#### 4. Currency（貨幣）

```typescript
{
  fieldId: 'totalAmount',
  type: 'currency',
  label: '總金額',
}
```

自動格式化為 2 位小數：`1234.56`

#### 5. Percentage（百分比）

```typescript
{
  fieldId: 'conversionRate',
  type: 'percentage',
  label: '轉化率',
}
```

自動乘以 100 並添加 % 符號：`85.60%`

## 輸出格式

### 1. CSV（逗號分隔值）

```typescript
const result = await engine.generateReport({
  templateId: 'sales',
  format: 'csv',
  encoding: 'utf-8',
})

// 輸出示例：
// 日期,總銷售額,交易數
// 2026-01-01,5000.00,50
// 2026-01-02,6500.50,75
```

**特性**：
- 自動轉義包含逗號、引號、換行符的值
- 支持自定義編碼（默認 UTF-8）
- 可選標題行

### 2. Excel（JSON 結構）

```typescript
const result = await engine.generateReport({
  templateId: 'sales',
  format: 'excel',
})

// 結果包含可轉換為 .xlsx 的 JSON 結構：
// {
//   "sheets": [
//     {
//       "name": "Report",
//       "data": [
//         ["日期", "總銷售額", "交易數"],
//         ["2026-01-01", "5000.00", "50"],
//         ...
//       ]
//     }
//   ]
// }
```

### 3. JSON（結構化數據）

```typescript
const result = await engine.generateReport({
  templateId: 'sales',
  format: 'json',
})

// 輸出示例：
// [
//   {
//     "date": "2026-01-01",
//     "totalSales": "5000.00",
//     "transactionCount": 50
//   },
//   {
//     "date": "2026-01-02",
//     "totalSales": "6500.50",
//     "transactionCount": 75
//   }
// ]
```

## 流式處理和大數據量支持

### 流式生成的優點

1. **記憶體效率**：無需在內存中加載整個數據集
2. **實時響應**：可以在數據生成時立即開始輸出
3. **支持百萬級數據**：輕鬆處理超大報表
4. **背景處理**：可用於長期運行的報表生成

### 實現示例

```typescript
async function generateLargeReportToFile(
  fileName: string,
  templateId: string
) {
  const file = fs.createWriteStream(fileName)

  try {
    const config: ReportGenerationConfig = {
      templateId,
      format: 'csv',
      batchSize: 1000,  // 每批 1000 條
      includeHeader: true,
    }

    for await (const chunk of engine.generateReportStream(config)) {
      file.write(chunk)
    }

    file.end()
    console.log(`報表已生成: ${fileName}`)
  } catch (error) {
    console.error('報表生成失敗:', error)
    file.destroy()
    throw error
  }
}

// 使用
await generateLargeReportToFile('sales-report.csv', 'daily-sales')
```

### 批大小配置

```typescript
// 小批大小（適合記憶體有限的環境）
const config1: ReportGenerationConfig = {
  templateId: 'large-data',
  format: 'csv',
  batchSize: 100,  // 小批量，更頻繁的 I/O
}

// 大批大小（更好的效能）
const config2: ReportGenerationConfig = {
  templateId: 'large-data',
  format: 'csv',
  batchSize: 5000,  // 大批量，更高的效能
}
```

**建議**：
- 普通環境：1000-2000
- 記憶體有限：100-500
- 高性能環境：5000-10000

## 錯誤處理

### 常見錯誤場景

#### 1. 模板不存在

```typescript
const result = await engine.generateReport({
  templateId: 'non-existent',
  format: 'csv',
})

if (!result.success) {
  console.error(`錯誤: ${result.error}`)
  // 錯誤: 模板不存在: non-existent
}
```

#### 2. 數據提供器未註冊

```typescript
// 未註冊數據提供器
const result = await engine.generateReport({
  templateId: 'sales',
  format: 'csv',
})

if (!result.success) {
  console.error(`錯誤: ${result.error}`)
  // 錯誤: 數據提供器未註冊: sales
}
```

#### 3. 數據提供器異常

```typescript
engine.registerDataProvider('sales', async () => {
  throw new Error('數據庫連接失敗')
})

const result = await engine.generateReport({
  templateId: 'sales',
  format: 'csv',
})

// result.success === false
// result.error === '數據庫連接失敗'
```

### 錯誤恢復模式

```typescript
async function safeGenerateReport(
  templateId: string,
  format: 'csv' | 'excel' | 'json'
) {
  try {
    const result = await engine.generateReport({
      templateId,
      format,
    })

    if (!result.success) {
      // 記錄錯誤
      console.error(`報表生成失敗: ${result.error}`)

      // 返回回退數據
      return {
        success: false,
        fallback: true,
        message: '報表生成失敗，請稍後重試',
      }
    }

    return { success: true, result }
  } catch (error) {
    console.error('未預期的錯誤:', error)
    throw error
  }
}
```

## 與 ReportQueueManager 的集成

### 異步隊列中的報表生成

```typescript
import { ReportQueueManager } from './src/reporting'
import { ReportGenerationEngine } from './src/reporting'

const queue = new ReportQueueManager()
const engine = new ReportGenerationEngine()

// 設置報表模板
const template: ReportTemplate = {
  templateId: 'sales-monthly',
  name: 'Monthly Sales Report',
  description: 'Monthly sales summary',
  type: 'sales',
  fields: [
    { fieldId: 'month', name: 'month', label: 'Month', type: 'string' },
    { fieldId: 'sales', name: 'sales', label: 'Sales', type: 'currency' },
  ],
}

engine.registerTemplate(template)

// 隊列中的報表處理器
queue.registerProcessor('sales', async (job) => {
  const config: ReportGenerationConfig = {
    templateId: 'sales-monthly',
    format: job.data.format || 'csv',
    filters: job.data.filters,
  }

  return await engine.generateReport(config)
})

// 提交高優先級報表任務
const jobId = queue.submitJob(
  'sales',
  {
    format: 'excel',
    filters: [
      { field: 'month', operator: 'eq', value: '2026-01' },
    ],
  },
  'high'
)
```

## 使用示例

### 完整工作流程

```typescript
import { ReportGenerationEngine } from './src/reporting'
import type { ReportTemplate, ReportGenerationConfig } from './src/reporting'

// 1. 初始化引擎
const engine = new ReportGenerationEngine()

// 2. 定義報表模板
const dailySalesTemplate: ReportTemplate = {
  templateId: 'daily-sales',
  name: 'Daily Sales Report',
  description: '每日銷售報表',
  type: 'daily',
  fields: [
    {
      fieldId: 'date',
      name: 'date',
      label: '日期',
      type: 'date',
    },
    {
      fieldId: 'totalSales',
      name: 'totalSales',
      label: '總銷售額',
      type: 'currency',
    },
    {
      fieldId: 'transactionCount',
      name: 'transactionCount',
      label: '交易數',
      type: 'number',
    },
    {
      fieldId: 'avgOrderValue',
      name: 'avgOrderValue',
      label: '平均訂單金額',
      type: 'currency',
    },
  ],
}

// 3. 註冊模板
engine.registerTemplate(dailySalesTemplate)

// 4. 註冊數據提供器
engine.registerDataProvider('daily-sales', async (filters) => {
  // 從數據庫查詢數據
  const data = await database.query(`
    SELECT
      DATE(created_at) as date,
      SUM(amount) as totalSales,
      COUNT(*) as transactionCount,
      AVG(amount) as avgOrderValue
    FROM orders
    WHERE 1=1
  `)

  return data
})

// 5. 生成報表
async function generateAndSaveReport() {
  const config: ReportGenerationConfig = {
    templateId: 'daily-sales',
    format: 'csv',
  }

  const result = await engine.generateReport(config)

  if (result.success) {
    console.log(`✅ 報表已生成`)
    console.log(`   文件: ${result.fileName}`)
    console.log(`   記錄: ${result.totalRecords}`)
    console.log(`   耗時: ${result.processingTime}ms`)

    // 保存到文件系統或上傳到雲存儲
    return result.fileName
  } else {
    console.error(`❌ 報表生成失敗: ${result.error}`)
    throw new Error(result.error)
  }
}

// 6. 執行
await generateAndSaveReport()
```

### 多模板報表生成

```typescript
async function generateAllReports() {
  const reportTypes = [
    { templateId: 'daily-sales', format: 'csv' as const },
    { templateId: 'inventory-status', format: 'excel' as const },
    { templateId: 'customer-analysis', format: 'json' as const },
  ]

  const results = []

  for (const report of reportTypes) {
    const result = await engine.generateReport({
      templateId: report.templateId,
      format: report.format,
    })

    results.push({
      type: report.templateId,
      success: result.success,
      file: result.fileName,
      size: result.fileSize,
    })
  }

  return results
}
```

## 性能優化建議

### 1. 數據提供器優化

```typescript
// ❌ 不推薦：N+1 查詢
engine.registerDataProvider('orders', async () => {
  const orders = await db.query('SELECT * FROM orders')
  const detailedOrders = await Promise.all(
    orders.map(async (order) => {
      const items = await db.query(
        'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      )
      return { ...order, items }
    })
  )
  return detailedOrders
})

// ✅ 推薦：使用 JOIN
engine.registerDataProvider('orders', async () => {
  return await db.query(`
    SELECT
      o.*,
      JSON_ARRAYAGG(
        JSON_OBJECT('id', oi.id, 'quantity', oi.quantity)
      ) as items
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
  `)
})
```

### 2. 流式處理大規模數據

```typescript
// ❌ 不推薦：一次性加載所有數據
const config = {
  templateId: 'large-data',
  format: 'csv',
}
const result = await engine.generateReport(config)
// 需要在內存中存儲數百萬條記錄

// ✅ 推薦：使用流式處理
for await (const chunk of engine.generateReportStream(config)) {
  // 逐塊處理，保持低內存占用
  fileStream.write(chunk)
}
```

### 3. 縮小數據集

```typescript
// ❌ 不推薦：生成完整報表
const result = await engine.generateReport({
  templateId: 'all-sales',
  format: 'csv',
})

// ✅ 推薦：應用篩選
const result = await engine.generateReport({
  templateId: 'sales',
  format: 'csv',
  filters: [
    { field: 'startDate', operator: 'gte', value: '2026-01-01' },
    { field: 'endDate', operator: 'lte', value: '2026-01-31' },
    { field: 'region', operator: 'eq', value: 'APAC' },
  ],
})
```

## 監控和統計

### 報表生成指標

```typescript
interface ReportMetrics {
  totalReports: number          // 生成的總報表數
  successfulReports: number     // 成功的報表數
  failedReports: number         // 失敗的報表數
  averageProcessingTime: number // 平均處理時間
  totalDataProcessed: number    // 處理的總數據量
  successRate: number           // 成功率（百分比）
}
```

### 監控最佳實踐

```typescript
// 定期收集指標
setInterval(() => {
  const metrics = {
    timestamp: new Date(),
    statusReport: engine.generateStatusReport(),
  }

  // 發送到監控系統
  sendToMonitoringService(metrics)
}, 60000) // 每分鐘一次

// 監控異常生成時間
engine.on('report:generated', (result) => {
  if (result.processingTime > 30000) {
    // 超過 30 秒的報表生成
    alert(`報表生成耗時過長: ${result.processingTime}ms`)
  }
})
```

## 故障排除

### 問題 1：報表生成速度慢

**症狀**：報表生成耗時超過預期

**原因**：
- 數據提供器查詢性能差
- 未應用篩選條件
- 非流式處理大數據集

**解決方案**：
```typescript
// 1. 優化數據提供器查詢
engine.registerDataProvider('sales', async () => {
  // 添加索引和優化查詢
  return db.query(`
    SELECT * FROM orders
    WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
    LIMIT 10000
  `)
})

// 2. 使用篩選
const config = {
  templateId: 'sales',
  filters: [
    { field: 'startDate', operator: 'gte', value: '2026-01-01' }
  ]
}

// 3. 使用流式處理
for await (const chunk of engine.generateReportStream(config)) {
  fileStream.write(chunk)
}
```

### 問題 2：內存占用過高

**症狀**：生成報表時內存占用快速增長

**原因**：
- 一次性加載所有數據
- 數據提供器返回超大數據集

**解決方案**：
```typescript
// 使用流式處理而不是 generateReport
const config: ReportGenerationConfig = {
  templateId: 'large-dataset',
  format: 'csv',
  batchSize: 1000,  // 控制批大小
}

for await (const chunk of engine.generateReportStream(config)) {
  // 逐塊處理
}
```

### 問題 3：字符編碼問題

**症狀**：CSV 報表中包含亂碼字符

**原因**：編碼不匹配（例如，期望 UTF-8 但設置為其他編碼）

**解決方案**：
```typescript
const config: ReportGenerationConfig = {
  templateId: 'sales',
  format: 'csv',
  encoding: 'utf-8',  // 顯式設置編碼
}

const result = await engine.generateReport(config)
```

## 相關組件

- **P2.3.1** - 報表隊列管理系統（異步隊列和優先級）
- **P2.3.3** - 報表存儲和分發（長期存儲和訪問）
- **P2.3.4** - 報表 UI 和調度（用戶界面和定時生成）
- **P2.3.5** - 報表系統測試和優化（性能測試）

## 總結

ReportGenerationEngine 提供了完整的報表生成解決方案：

- ✅ 靈活的模板系統，支持多種報表類型
- ✅ 多種輸出格式（CSV、Excel、JSON）
- ✅ 自動數據類型轉換和格式化
- ✅ 流式處理支持百萬級數據集
- ✅ 完整的錯誤處理和回復機制
- ✅ 與報表隊列系統無縫集成
- ✅ 詳細的監控和統計功能

通過這個引擎，可以實現高效、可靠的報表生成能力。
