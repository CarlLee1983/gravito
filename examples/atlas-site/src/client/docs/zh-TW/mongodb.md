# 軌道連線：MongoDB 協定 (MongoDB Protocol)

> **當前狀態：** 行星級文件通量 (Document Flux) 已啟動。
> Atlas 為 MongoDB 提供了一個高性能、流暢的介面，完全繼承了我們 SQL 核心的開發者體驗。

## 連線藍圖 (The Connection Blueprint)

在 Atlas 中，NoSQL 並非次等公民。它是我們資料治理哲學的延伸。

```typescript
// atlas.config.ts
export default defineConfig({
  connections: {
    mongodb: {
      driver: 'mongodb',
      uri: process.env.MONGO_URI,
      database: 'gravito_flux',
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    }
  }
})
```

## MongoDB：宇宙級文件儲存

將您的 Atlas 應用程式與 MongoDB 叢集連結，實現高性能的文件操作。

## 配置 (Configuration)

將您的 MongoDB 連線設定加入 `DB` 配置中：

```typescript
DB.configure({
  connections: {
    mongodb: {
      driver: 'mongodb',
      uri: 'mongodb://localhost:27017',
      database: 'atlas_site'
    }
  }
})
```

## ORM 模型 (ORM Models)

Atlas 將其 ORM 功能擴展到了 MongoDB。您可以定義直接與 MongoDB 集合交互的模型：

```typescript
import { Model } from '@gravito/atlas'

export default class Log extends Model {
    static connection = 'mongodb'
    static tableName = 'logs'
}
```

### CRUD 操作 (CRUD Operations)

使用 MongoDB 模型的操作感與 SQL 模型完全一致：

```typescript
// 建立新文件
const log = await Log.create({
    level: 'info',
    message: '宇宙軌道已建立',
    context: { orbit: 'low_earth' }
})

// 查詢文件
const errors = await Log.query()
    .where('level', 'error')
    .orderBy('created_at', 'desc')
    .limit(10)
    .get()

// 更新
await log.save({
    resolved: true
})

// 刪除
await log.delete()
```

## 集合代理 (Collection Proxy)

您也可以存取原生的集合代理以進行進階操作：

```typescript
const collection = await DB.connection('mongodb').collection('logs')
const result = await collection.aggregate([
  { $match: { level: 'error' } },
  { $group: { _id: '$message', count: { $sum: 1 } } }
]).toArray()
```

## 流暢的文件存取 (Fluent Document Access)

使用與 SQL 資料表相同的表達力來存取您的集合 (Collections)。

```typescript
import { DB } from '@gravito/atlas'

// 檢索關鍵系統日誌
const criticalLogs = await DB.connection('mongodb')
  .collection('system_logs')
  .where('status', 'critical')
  .limit(50)
  .get()

// 深度文件過濾
const deepSearch = await DB.connection('mongodb')
  .collection('users')
  .where('profile.metrics.score', '>', 9000)
  .first()
```

## 為什麼在 Atlas 中選用 MongoDB？

Atlas 將原生 MongoDB 驅動程式封裝在 **Laravel 風格的代理層 (Proxy)** 中。在需要時，您依然可以發揮原始聚合 (Aggregation) 的所有威力，但在大多數情況下，您將處於我們流暢 API 的保護之下。

- **統一錯誤處理：** 使用單一模式捕獲資料庫異常。
- **連線韌性：** 自動重新連線與連線池管理。
- **BSON 到 JSON 的精準轉換：** 內建針對邊緣運算優化的序列化技術。
