# @gravito/dark-matter

> Gravito 的 MongoDB 用戶端，Bun 原生、Laravel 風格 API。

## 安裝

```bash
bun add @gravito/dark-matter mongodb
```

## 快速開始

```typescript
import { Mongo } from '@gravito/dark-matter'

// 設定
Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017', database: 'myapp' }
  }
})

// 連線
await Mongo.connect()

// 使用
const users = await Mongo.collection('users')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get()

// 斷線
await Mongo.disconnect()
```

## 功能特色

- 🚀 **Bun 原生** - 針對 Bun runtime 最佳化
- 🎯 **Laravel 風格 API** - 熟悉且直觀的 Fluent Interface
- 🔍 **Query Builder** - 類型安全的查詢建構器
- 📊 **Aggregation Pipeline** - 流暢的聚合管道 API
- 🔌 **多連線支援** - 支援多個具名資料庫連線
- 🛡️ **Transactions** - 支援 ACID 交易與簡便的 API
- 📦 **GridFS** - 支援大檔案上傳與下載
- ⚡ **Change Streams** - 即時監聽資料庫變更事件
- ✅ **Schema Validation** - JSON Schema 資料驗證支援

## API 參考

### 查詢建構器 (Query Builder)

```typescript
// 基本查詢
const users = await Mongo.collection('users')
  .where('status', 'active')
  .where('age', '>', 18)
  .whereIn('role', ['admin', 'editor'])
  .get()

// 排序與分頁
const latest = await Mongo.collection('posts')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .skip(20)
  .get()

// 選擇特定欄位
const names = await Mongo.collection('users')
  .select('name', 'email')
  .get()

// 根據 ID 查詢
const user = await Mongo.collection('users').find('507f1f77bcf86cd799439011')

// 計數與存在檢查
const count = await Mongo.collection('users').where('status', 'active').count()
const exists = await Mongo.collection('users').where('email', 'john@example.com').exists()
```

### CRUD 操作

```typescript
// 新增
const result = await Mongo.collection('users').insert({
  name: 'John',
  email: 'john@example.com',
  createdAt: new Date()
})
console.log(result.insertedId)

// 批次新增
const results = await Mongo.collection('users').insertMany([
  { name: 'Alice' },
  { name: 'Bob' }
])

// 更新
await Mongo.collection('users')
  .where('_id', userId)
  .update({ status: 'inactive' })

// 批次更新
await Mongo.collection('users')
  .where('status', 'pending')
  .updateMany({ status: 'active' })

// 刪除
await Mongo.collection('users')
  .where('_id', userId)
  .delete()

// 批次刪除
await Mongo.collection('users')
  .where('status', 'deleted')
  .deleteMany()

// 批次寫入 (Bulk Write)
await Mongo.collection('logs').bulkWrite([
  { insertOne: { document: { event: 'login' } } },
  { deleteOne: { filter: { status: 'old' } } }
])
```

### 聚合管道 (Aggregation Pipeline)

```typescript
// 分組與統計
const stats = await Mongo.collection('orders')
  .aggregate()
  .match({ status: 'completed' })
  .group({
    _id: '$customerId',
    totalOrders: { $sum: 1 },
    totalAmount: { $sum: '$amount' }
  })
  .sort({ totalAmount: 'desc' })
  .limit(10)
  .get()

// 關聯查詢 (Lookup / JOIN)
const ordersWithCustomers = await Mongo.collection('orders')
  .aggregate()
  .lookup({
    from: 'customers',
    localField: 'customerId',
    foreignField: '_id',
    as: 'customer'
  })
  .unwind('$customer')
  .get()
```

### 進階功能

#### 交易 (Transactions)

```typescript
await Mongo.connection().withTransaction(async (session) => {
  // 從發送者扣款
  await session.collection('accounts')
    .where('_id', senderId)
    .update({ $inc: { balance: -100 } })

  // 增加到接收者
  await session.collection('accounts')
    .where('_id', receiverId)
    .update({ $inc: { balance: 100 } })
})
```

#### Change Streams (即時變更流)

```typescript
const stream = Mongo.collection('orders').watch(
  [{ $match: { 'fullDocument.amount': { $gt: 1000 } } }]
)

for await (const event of stream) {
  console.log('高額訂單:', event.fullDocument)
}
```

#### GridFS (檔案儲存)

```typescript
const grid = new MongoGridFS(Mongo.database())

// 上傳
const fileId = await grid.upload(Buffer.from('Hello'), { filename: 'hello.txt' })

// 下載
const content = await grid.download(fileId)
```

#### Schema Validation (資料驗證)

```typescript
await Mongo.database().createCollection('users', {
  schema: {
    validator: {
      $jsonSchema: {
        required: ['username'],
        properties: { username: { bsonType: 'string' } }
      }
    },
    validationAction: 'error'
  }
})
```

### 連線管理

```typescript
// 設定多重連線
Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017/app' },
    analytics: { uri: 'mongodb://stats-db:27017/stats' }
  }
})

// 檢查連線健康狀態
const health = await Mongo.connection().getHealthStatus()
console.log(health.latencyMs) // 例如: 15
```

## 開發路線圖 (Roadmap)

- [x] 連線重試與健康檢查
- [x] 交易 (Transactions) 支援
- [x] Schema Validation
- [x] Change Streams
- [x] GridFS 支援

## 授權

MIT
