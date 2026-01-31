# 效能調優實踐指南

本指南基於 **Dark Matter v1.1.0** 的基準測試結果，提供實用的效能優化建議。

## 索引策略

### 何時建立索引

建立索引的判斷標準：
- 查詢頻率高（每秒 > 10 次）
- Collection 大小 > 1000 筆記錄
- 查詢欄位經常用於 where、sort、join

```typescript
// 單欄位索引
await Mongo.database().collection('users').createIndex({ email: 1 })

// 複合索引（注意欄位順序）
await Mongo.database().collection('orders').createIndex({
  userId: 1,
  status: 1,
  createdAt: -1
})

// 唯一索引
await Mongo.database().collection('users').createIndex(
  { email: 1 },
  { unique: true }
)
```

### 複合索引設計

**最左前綴原則：** 複合索引 `{ a: 1, b: 1, c: 1 }` 可以支援：
- `{ a: 1 }`
- `{ a: 1, b: 1 }`
- `{ a: 1, b: 1, c: 1 }`

但**不支援** `{ b: 1 }` 或 `{ c: 1 }`

```typescript
// ✅ 好的複合索引設計
await Mongo.database().collection('orders').createIndex({
  userId: 1,      // 高選擇性（equality）
  status: 1,      // 中選擇性（equality）
  createdAt: -1   // 排序欄位放最後
})

// 可以支援的查詢：
// 1. where('userId', 'user123')
// 2. where('userId', 'user123').where('status', 'pending')
// 3. where('userId', 'user123').where('status', 'pending').orderBy('createdAt', 'desc')
```

### 軟刪除索引

**基準測試結果：** 有 `deletedAt` 索引的查詢效能提升 3-5 倍

```typescript
// 為軟刪除欄位建立索引
await Mongo.database().collection('users').createIndex({ deletedAt: 1 })

// 複合索引（包含軟刪除）
await Mongo.database().collection('users').createIndex({
  deletedAt: 1,
  status: 1,
  createdAt: -1
})
```

**效能數據（10K 記錄，30% 已刪除）：**
- 無索引：~50ms
- 有 deletedAt 索引：~10ms
- 複合索引：~5ms

### 索引監控

```typescript
// 查看索引使用情況
const stats = await Mongo.database().collection('users').stats()
console.log('索引數量：', stats.nindexes)

// 分析查詢計劃
const explain = await Mongo.collection('users')
  .where('email', 'test@example.com')
  .explain()

console.log('使用的索引：', explain.queryPlanner.winningPlan)
```

## 查詢優化

### 避免全表掃描

```typescript
// ❌ 不好：全表掃描
const users = await Mongo.collection('users')
  .where('age', '>', 18)
  .get()

// ✅ 好：使用索引
await Mongo.database().collection('users').createIndex({ age: 1 })
const users = await Mongo.collection('users')
  .where('age', '>', 18)
  .get()
```

### 投影（Projection）

只查詢需要的欄位，減少網路傳輸和記憶體使用：

```typescript
// ❌ 不好：查詢所有欄位
const users = await Mongo.collection('users').get()

// ✅ 好：只查詢需要的欄位
const users = await Mongo.collection('users')
  .select('name', 'email', 'avatar')
  .get()

// ❌ 不好：排除單一欄位仍傳輸大量資料
const users = await Mongo.collection('users')
  .exclude('password')
  .get()
```

**基準測試結果（1000 筆記錄）：**
- 查詢所有欄位：~100ms
- 投影 3 個欄位：~30ms（提升 70%）

### 分頁優化

```typescript
// ✅ 好：使用 limit + skip
const page = 1
const pageSize = 20

const users = await Mongo.collection('users')
  .orderBy('createdAt', 'desc')
  .skip((page - 1) * pageSize)
  .limit(pageSize)
  .get()

// ✅ 更好：使用游標分頁（大數據集）
const lastId = '507f1f77bcf86cd799439011'

const users = await Mongo.collection('users')
  .where('_id', '>', lastId)
  .orderBy('_id', 'asc')
  .limit(20)
  .get()
```

**skip 效能注意事項：**
- skip(100)：快速
- skip(10000)：較慢（需要掃描前 10000 筆）
- skip(100000)：非常慢（避免使用）

## 連線池調優

### Pool 大小配置

**基準測試結果（100 並發查詢）：**

| maxPoolSize | 延遲 (ms) | CPU 使用 |
|-------------|----------|----------|
| 10          | ~200ms   | 40%      |
| 50          | ~80ms    | 60%      |
| 100         | ~70ms    | 65%      |

**建議配置：**
```typescript
Mongo.configure({
  default: 'main',
  connections: {
    main: {
      uri: 'mongodb://localhost:27017',
      database: 'myapp',
      maxPoolSize: 50,    // 根據並發量調整
      minPoolSize: 10,    // 保持最小連線數
      connectTimeoutMS: 5000,
      socketTimeoutMS: 30000
    }
  }
})
```

**公式：** `maxPoolSize = 並發請求數 * 1.2`

### 連線池監控

```typescript
import { MongoPoolMonitor } from '@gravito/dark-matter'

const client = Mongo.connection()
const monitor = new MongoPoolMonitor(client as any)

setInterval(() => {
  const metrics = monitor.getMetrics()

  if (metrics) {
    console.log('連線池狀態：', {
      總連線: metrics.totalConnections,
      可用: metrics.availableConnections,
      使用中: metrics.currentCheckedOutCount,
      等待中: metrics.waitQueueSize
    })

    // 警告：連線池接近耗盡
    if (metrics.availableConnections < metrics.totalConnections * 0.2) {
      console.warn('⚠️ 連線池使用率 > 80%，建議增加 maxPoolSize')
    }
  }
}, 5000)
```

### 連線洩漏檢測

```typescript
// 每 10 秒檢查一次
setInterval(() => {
  const metrics = monitor.getMetrics()

  if (metrics && metrics.currentCheckedOutCount > 0) {
    console.log(`檢測到 ${metrics.currentCheckedOutCount} 個連線未釋放`)

    // 如果持續增長，可能有連線洩漏
    if (metrics.currentCheckedOutCount > metrics.totalConnections * 0.8) {
      console.error('🚨 可能發生連線洩漏！')
    }
  }
}, 10000)
```

## Aggregation Pipeline 優化

### Pipeline 順序

**基準測試結果（10K 訂單）：**
- 未優化（先 JOIN 後過濾）：~800ms
- 已優化（先過濾後 JOIN）：~200ms（提升 75%）

```typescript
// ❌ 不好：先 JOIN 後過濾
const orders = await Mongo.collection('orders')
  .aggregate()
  .lookup({
    from: 'products',
    localField: 'productId',
    foreignField: 'productId',
    as: 'product'
  })
  .match({ status: 'delivered' })  // 晚過濾
  .get()

// ✅ 好：先過濾後 JOIN
const orders = await Mongo.collection('orders')
  .aggregate()
  .match({ status: 'delivered' })  // 早過濾
  .lookup({
    from: 'products',
    localField: 'productId',
    foreignField: 'productId',
    as: 'product'
  })
  .get()
```

### $match 前置

盡可能將 `$match` 放在 pipeline 前面：

```typescript
// ✅ 最佳實踐
const result = await Mongo.collection('orders')
  .aggregate()
  .match({ status: 'delivered', amount: { $gt: 100 } })  // 1. 過濾
  .lookup({ ... })                                        // 2. JOIN
  .group({ ... })                                         // 3. 分組
  .sort({ total: -1 })                                    // 4. 排序
  .limit(10)                                              // 5. 限制結果
  .get()
```

### 索引支援

Aggregation Pipeline 的前幾個階段可以使用索引：

```typescript
// 建立索引
await Mongo.database().collection('orders').createIndex({
  status: 1,
  createdAt: -1
})

// Pipeline 可以使用索引
const orders = await Mongo.collection('orders')
  .aggregate()
  .match({ status: 'delivered' })           // 使用索引
  .sort({ createdAt: -1 })                  // 使用索引
  .limit(100)
  .get()
```

### 記憶體限制

Aggregation 預設記憶體限制 100MB，處理大數據時使用 `allowDiskUse`：

```typescript
// 處理大數據集
const result = await Mongo.database()
  .collection('orders')
  .aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: '$userId', total: { $sum: '$amount' } } },
    { $sort: { total: -1 } }
  ], {
    allowDiskUse: true  // 允許使用磁碟暫存
  })
  .toArray()
```

## 大數據處理

### 批次處理

```typescript
// ✅ 好：批次處理
const batchSize = 1000

async function processBatch(skip: number) {
  const users = await Mongo.collection('users')
    .skip(skip)
    .limit(batchSize)
    .get()

  for (const user of users) {
    await processUser(user)
  }

  if (users.length === batchSize) {
    // 還有更多資料
    await processBatch(skip + batchSize)
  }
}

await processBatch(0)
```

### 使用游標

```typescript
// ✅ 更好：使用游標（記憶體友善）
const cursor = Mongo.collection('users').cursor()

for await (const user of cursor) {
  await processUser(user)
}
```

### 記憶體管理

```typescript
// 監控記憶體使用
setInterval(() => {
  const used = process.memoryUsage()
  console.log('記憶體使用：', {
    RSS: `${Math.round(used.rss / 1024 / 1024)}MB`,
    Heap: `${Math.round(used.heapUsed / 1024 / 1024)}MB`
  })

  // 警告：記憶體使用過高
  if (used.heapUsed > 500 * 1024 * 1024) {
    console.warn('⚠️ Heap 使用超過 500MB')
  }
}, 10000)
```

## 監控與診斷

### 慢查詢日誌

在 MongoDB 設定檔啟用慢查詢日誌：

```yaml
# mongod.conf
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100  # 超過 100ms 記錄
```

查詢慢查詢日誌：

```typescript
const slowQueries = await Mongo.database()
  .collection('system.profile')
  .find({ millis: { $gt: 100 } })
  .sort({ ts: -1 })
  .limit(10)
  .toArray()

console.log('最慢的 10 個查詢：', slowQueries)
```

### 連線池指標

使用 `MongoPoolMonitor` 持續監控：

```typescript
import { MongoPoolMonitor } from '@gravito/dark-matter'

const monitor = new MongoPoolMonitor(Mongo.connection() as any)

// 每分鐘記錄一次
setInterval(() => {
  const metrics = monitor.getMetrics()
  if (metrics) {
    logMetrics('pool_metrics', {
      total: metrics.totalConnections,
      available: metrics.availableConnections,
      checkedOut: metrics.currentCheckedOutCount,
      waiting: metrics.waitQueueSize,
      utilization: (metrics.currentCheckedOutCount / metrics.totalConnections) * 100
    })
  }
}, 60000)
```

### 分析工具

使用 `explain()` 分析查詢：

```typescript
const explanation = await Mongo.collection('users')
  .where('email', 'test@example.com')
  .explain()

console.log('查詢計劃：', explanation.queryPlanner)
console.log('執行統計：', explanation.executionStats)
```

## 基準測試結果摘要

### GridFS 效能

| 操作 | 檔案大小 | 平均時間 |
|------|---------|---------|
| 上傳 | 1MB     | ~50ms   |
| 上傳 | 10MB    | ~400ms  |
| 下載 | 1MB     | ~30ms   |
| 下載 | 10MB    | ~250ms  |

### Soft Delete 效能

| 查詢模式 | 10K 記錄（30% 刪除） |
|---------|-------------------|
| 無過濾（withTrashed） | ~20ms |
| 自動過濾（預設） | ~25ms |
| 只刪除（onlyTrashed） | ~15ms |

### Aggregation 效能

| Pipeline 複雜度 | 10K 記錄 |
|----------------|---------|
| 簡單 ($match + $group) | ~30ms |
| 中等 ($match + $lookup + $group) | ~150ms |
| 複雜 (多層 $lookup + $facet) | ~500ms |

## 最佳實踐清單

### 查詢優化
- ✅ 為常用查詢欄位建立索引
- ✅ 使用投影減少資料傳輸
- ✅ 使用 limit 限制結果數量
- ✅ 避免大 skip 值（使用游標分頁）
- ✅ 軟刪除欄位建立索引

### 連線池
- ✅ 根據並發量配置 maxPoolSize
- ✅ 設定 minPoolSize 保持最小連線
- ✅ 監控連線池使用率
- ✅ 檢測連線洩漏

### Aggregation
- ✅ $match 盡可能前置
- ✅ 先過濾後 JOIN
- ✅ 大數據使用 allowDiskUse
- ✅ 為 pipeline 使用的欄位建立索引

### 記憶體管理
- ✅ 大數據使用批次處理或游標
- ✅ 監控記憶體使用
- ✅ 設定適當的 limit

### 監控
- ✅ 啟用慢查詢日誌
- ✅ 定期檢查索引使用情況
- ✅ 監控連線池指標
- ✅ 使用 explain() 分析查詢

## 相關資源

- [GridFS 基準測試](../benchmarks/gridfs.bench.ts)
- [Soft Delete 基準測試](../benchmarks/soft-delete.bench.ts)
- [Aggregation 基準測試](../benchmarks/aggregation.bench.ts)
- [Connection Pool 基準測試](../benchmarks/connection-pool.bench.ts)
- [MongoDB Performance Best Practices](https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/)
