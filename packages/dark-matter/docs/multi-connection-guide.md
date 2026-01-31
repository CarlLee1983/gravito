# 多連線與多資料庫指南

## 配置多連線

```typescript
import { Mongo } from '@gravito/dark-matter'

Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017', database: 'app_db' },
    analytics: { uri: 'mongodb://analytics-server:27017', database: 'analytics' },
    cache: { uri: 'mongodb://cache-server:27017', database: 'cache' }
  }
})

await Mongo.connect()
await Mongo.connect('analytics')
await Mongo.connect('cache')
```

## 使用場景

### 1. 讀寫分離

```typescript
// 寫入主資料庫
await Mongo.connection('main')
  .collection('users')
  .insert({ name: 'Alice' })

// 從唯讀副本讀取
const users = await Mongo.connection('readonly')
  .collection('users')
  .get()
```

### 2. 資料分片

```typescript
// 按使用者 ID 分片
const shard = userId % 3 === 0 ? 'shard0' : userId % 3 === 1 ? 'shard1' : 'shard2'

await Mongo.connection(shard)
  .collection('user_data')
  .insert({ userId, data })
```

### 3. 多租戶架構

```typescript
// 每個租戶一個資料庫
const tenantDb = `tenant_${tenantId}`

Mongo.addConnection(tenantDb, {
  uri: 'mongodb://localhost:27017',
  database: tenantDb
})

await Mongo.connect(tenantDb)

// 使用租戶專屬資料庫
await Mongo.connection(tenantDb)
  .collection('users')
  .get()
```

## 跨資料庫操作

```typescript
// 跨資料庫查詢
const users = await Mongo.connection('main').collection('users').get()
const logs = await Mongo.connection('logs').collection('access_logs').get()

// 跨資料庫交易（需要 MongoDB 4.2+）
await Mongo.transaction(async (session) => {
  await Mongo.connection('main')
    .collection('users')
    .insert({ name: 'Bob' }, { session })

  await Mongo.connection('logs')
    .collection('audit_logs')
    .insert({ action: 'user_created' }, { session })
})
```

## 最佳實踐

1. **連線池隔離**：不同連線使用獨立的連線池
2. **錯誤處理**：每個連線獨立處理錯誤
3. **命名規範**：使用有意義的連線名稱
4. **監控**：分別監控各連線的效能

參考：[多連線測試](../tests/manager-multi-connection.test.ts)
