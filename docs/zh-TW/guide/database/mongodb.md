# MongoDB

Atlas 原生支援 MongoDB，讓您可以在 NoSQL 集合中使用與 SQL 資料庫相同的 Model 與查詢建構器語法。

## 配置

將 MongoDB 連線新增至您的配置中：

```typescript
export default {
  connections: {
    mongodb: {
      driver: 'mongodb',
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
      database: 'gravito_app',
    }
  }
}
```

## 模型定義

使用 MongoDB 時，您應該在模型中指定連線：

```typescript
import { Model, column } from '@gravito/atlas';

export default class Log extends Model {
  static override connection = 'mongodb';
  static override tableName = 'logs';
  static override primaryKey = '_id'; // MongoDB 使用 _id

  @column({ isPrimary: true })
  declare _id: string;

  @column()
  declare level: string;

  @column()
  declare message: string;
}
```

## 查詢 MongoDB

查詢建構器會自動將其操作翻譯為 MongoDB 命令。

### 簡單查詢
```typescript
const logs = await Log.where('level', 'error').get();
```

### 全文檢索與正規表示式 (Regex)
您可以使用正規運算子進行靈活搜索：
```typescript
const users = await User
  .where('name', 'like', 'John%')
  .get();
// 翻譯為: { name: { $regex: /^John/i } }
```

## 進階查詢

### 聚合管道 (Aggregation Pipeline)

Atlas 為 MongoDB 的聚合管道提供了流暢的抽象：

```typescript
const stats = await Log.query().aggregate([
  { $match: { level: 'error' } },
  { $group: { _id: '$channel', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

### 欄位投影 (Projections)

使用 `select` 方法精確指定要返回的欄位，這會被翻譯為 MongoDB 的投影 (projections)：

```typescript
const users = await User.select('name', 'email').get();
// 翻譯為: collection.find({}, { projection: { name: 1, email: 1 } })
```

## 事務 (Transactions)

Atlas 支援 MongoDB 的多文檔事務（需要副本集或分片集群）：

```typescript
const connection = DB.connection('mongodb');

await connection.transaction(async (session) => {
  await User.create({ name: 'Alice' }, { session });
  await Profile.create({ user_id: '...', bio: 'Hello' }, { session });
});
```

注意：`Model.create()` 是非同步且會立即寫入資料庫。若只需要記憶體中的實例，請使用 `Model.make()`，再自行呼叫 `save()`。

## 進階索引

您可以使用 Atlas 遷移定義複雜的索引：

```typescript
import { Schema } from '@gravito/atlas';

await Schema.connection('mongodb').table('products', (table) => {
  // 簡單索引
  table.index('sku', { unique: true });
  
  // 複合索引
  table.index({ category: 1, price: -1 });
  
  // TTL 索引 (30 天後自動刪除日誌)
  table.index('created_at', { expireAfterSeconds: 3600 * 24 * 30 });
});
```

## 地理空間查詢 (Geospatial Queries)

Atlas 支援 MongoDB 的地理空間索引與查詢：

```typescript
const nearPlaces = await Place
  .where('location', 'near', {
    $geometry: { type: 'Point', coordinates: [ -73.9667, 40.78 ] },
    $maxDistance: 1000
  })
  .get();
```

### 原始集合存取
有時您需要存取底層 MongoDB 集合物件（來自 `mongodb` npm 套件）來進行進階操作：

```typescript
const collection = await DB
  .connection('mongodb')
  .getDriver()
  .collection('logs');
const result = await collection.aggregate([...]).toArray();
```

## 索引管理

雖然 MongoDB 是無模式 (Schema-less) 的，但索引對於效能至關重要。您仍然可以使用遷移來管理 MongoDB 索引：

```typescript
await Schema.connection('mongodb').table('users', (table) => {
  table.index({ email: 1 }, { unique: true });
});
```
