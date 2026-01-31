# API 參考文檔

## Mongo (Facade)

### 配置與連線

- `Mongo.configure(config)` - 配置連線
- `Mongo.connect(name?)` - 建立連線
- `Mongo.disconnect(name?)` - 斷開連線
- `Mongo.isConnected(name?)` - 檢查連線狀態
- `Mongo.connection(name?)` - 取得連線實例
- `Mongo.addConnection(name, config)` - 動態添加連線

### 資料庫操作

- `Mongo.database(name?)` - 取得資料庫實例
- `Mongo.collection(name)` - 取得 collection（返回 MongoQueryBuilder）
- `Mongo.schema(name)` - 取得 Schema Builder
- `Mongo.gridfs(bucketName?)` - 取得 GridFS 實例
- `Mongo.transaction(callback)` - 執行交易

## MongoQueryBuilder

### 查詢條件

- `where(field, operator?, value?)` - WHERE 條件
- `orWhere(field, operator?, value?)` - OR WHERE
- `whereIn(field, values)` - WHERE IN
- `whereNotIn(field, values)` - WHERE NOT IN
- `whereNull(field)` - WHERE NULL
- `whereNotNull(field)` - WHERE NOT NULL
- `whereExists(field, exists?)` - WHERE EXISTS
- `whereRegex(field, pattern)` - 正規表達式查詢

### 投影與排序

- `select(...fields)` - 選擇欄位
- `exclude(...fields)` - 排除欄位
- `orderBy(field, direction)` - 排序
- `latest(field?)` - 最新記錄
- `oldest(field?)` - 最舊記錄

### 分頁

- `limit(count)` - 限制數量
- `skip(count)` - 跳過記錄
- `offset(count)` - 別名 skip

### 執行查詢

- `get()` - 取得所有結果
- `first()` - 取得第一筆
- `find(id)` - 依 ID 查找
- `count()` - 計數
- `exists()` - 檢查是否存在

### 寫入操作

- `insert(data)` - 插入單筆
- `insertMany(docs)` - 批次插入
- `update(data)` - 更新
- `updateMany(data)` - 批次更新
- `delete()` - 刪除
- `deleteMany()` - 批次刪除

### 軟刪除

- `withTrashed()` - 包含已刪除記錄
- `onlyTrashed()` - 只查詢已刪除記錄
- `softDelete()` - 軟刪除
- `softDeleteMany()` - 批次軟刪除
- `restore()` - 恢復
- `restoreMany()` - 批次恢復
- `forceDelete()` - 強制刪除
- `forceDeleteMany()` - 批次強制刪除

### 聚合與其他

- `aggregate()` - 開始 Aggregation Pipeline
- `bulkWrite(operations)` - 批次寫入
- `watch(pipeline?, options?)` - Change Streams
- `clone()` - 克隆 Builder
- `toFilter()` - 轉換為 MongoDB filter

## MongoGridFS

- `uploadFromBuffer(buffer, filename, options?)` - 上傳檔案
- `downloadAsBuffer(id)` - 下載檔案
- `openUploadStream(filename, options?)` - 開啟上傳串流
- `openDownloadStream(id)` - 開啟下載串流
- `delete(id)` - 刪除檔案
- `find()` - 列出檔案
- `findByFilename(filename)` - 依檔名查找

## MongoPoolMonitor

- `getMetrics()` - 取得連線池指標
  - `totalConnections` - 總連線數
  - `availableConnections` - 可用連線數
  - `waitQueueSize` - 等待佇列大小
  - `currentCheckedOutCount` - 當前使用中連線數

## 型別定義

```typescript
interface MongoConfig {
  uri: string
  database?: string
  maxPoolSize?: number
  minPoolSize?: number
  connectTimeoutMS?: number
  socketTimeoutMS?: number
}

type FilterOperator = '=' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'nin' | 'exists'
type SortDirection = 'asc' | 'desc' | 1 | -1
```

完整型別定義請參考：[src/types.ts](../src/types.ts)
