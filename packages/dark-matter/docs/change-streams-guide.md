# Change Streams 完整指南

## 簡介

Change Streams 是 MongoDB 的實時資料變更通知功能，讓應用程式能夠即時監聽 collection 的變更事件。適用於：
- 實時通知系統
- 資料同步與快取更新
- 審計日誌
- 事件驅動架構

**系統需求：** MongoDB Replica Set 或 Sharded Cluster

## 基本用法

### 監聽所有變更事件

```typescript
import { Mongo } from '@gravito/dark-matter'

// 配置連線
Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017', database: 'myapp' }
  }
})

await Mongo.connect()

// 監聽 users collection 的變更
const stream = Mongo.collection('users').watch()

for await (const change of stream) {
  console.log('變更事件：', change.operationType)
  console.log('文檔資料：', change.fullDocument)
}
```

### 監聽特定事件類型

```typescript
// 只監聽 insert 事件
const stream = Mongo.collection('users').watch([
  { $match: { operationType: 'insert' } }
])

for await (const change of stream) {
  console.log('新增使用者：', change.fullDocument)
}
```

## 進階功能

### 1. 過濾特定欄位變更

```typescript
// 監聽 status 欄位變更為 'active' 的事件
const stream = Mongo.collection('users').watch([
  {
    $match: {
      operationType: 'update',
      'updateDescription.updatedFields.status': 'active'
    }
  }
])

for await (const change of stream) {
  console.log('使用者啟用：', change.documentKey._id)
}
```

### 2. 使用 Resume Token

```typescript
let resumeToken: any = null

const stream = Mongo.collection('orders').watch()

try {
  for await (const change of stream) {
    // 儲存 resume token
    resumeToken = change._id

    // 處理事件
    await processOrder(change.fullDocument)
  }
} catch (error) {
  console.error('Stream 錯誤：', error)

  // 使用 resume token 重新開始
  if (resumeToken) {
    const newStream = Mongo.collection('orders').watch([], {
      resumeAfter: resumeToken
    })

    // 繼續處理...
  }
}
```

### 3. 全文檔更新模式

```typescript
// 預設只包含變更的欄位
const stream = Mongo.collection('users').watch([], {
  fullDocument: 'updateLookup' // 取得完整文檔
})

for await (const change of stream) {
  if (change.operationType === 'update') {
    console.log('完整文檔：', change.fullDocument)
  }
}
```

## 實用範例

### 範例 1：WebSocket 實時通知

```typescript
import { Mongo } from '@gravito/dark-matter'
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })

// 監聽通知 collection
const stream = Mongo.collection('notifications').watch([
  { $match: { operationType: 'insert' } }
])

// 將變更推送給 WebSocket 客戶端
for await (const change of stream) {
  const notification = change.fullDocument

  // 廣播給所有連線的客戶端
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification))
    }
  })
}
```

### 範例 2：資料同步與快取更新

```typescript
import { Mongo } from '@gravito/dark-matter'
import Redis from 'ioredis'

const redis = new Redis()

// 監聽產品資料變更
const stream = Mongo.collection('products').watch()

for await (const change of stream) {
  const productId = change.documentKey._id.toString()

  switch (change.operationType) {
    case 'insert':
    case 'update':
    case 'replace':
      // 更新快取
      await redis.set(
        `product:${productId}`,
        JSON.stringify(change.fullDocument),
        'EX',
        3600 // 1 小時過期
      )
      break

    case 'delete':
      // 刪除快取
      await redis.del(`product:${productId}`)
      break
  }
}
```

### 範例 3：審計日誌

```typescript
const stream = Mongo.collection('users').watch()

for await (const change of stream) {
  // 記錄所有變更到審計日誌
  await Mongo.collection('audit_logs').insert({
    timestamp: new Date(),
    collection: 'users',
    operationType: change.operationType,
    documentId: change.documentKey._id,
    changes: change.updateDescription,
    fullDocument: change.fullDocument
  })
}
```

## 最佳實踐

### 1. 錯誤處理與自動重連

```typescript
async function startChangeStream() {
  let resumeToken: any = null

  while (true) {
    try {
      const options = resumeToken ? { resumeAfter: resumeToken } : {}
      const stream = Mongo.collection('events').watch([], options)

      for await (const change of stream) {
        resumeToken = change._id
        await handleChange(change)
      }
    } catch (error) {
      console.error('Stream 錯誤，5 秒後重試：', error)
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }
}

// 啟動監聽
startChangeStream()
```

### 2. 資源清理

```typescript
const stream = Mongo.collection('events').watch()

// 優雅關閉
process.on('SIGINT', async () => {
  console.log('關閉 Change Stream...')

  // 關閉 stream
  const iterator = stream[Symbol.asyncIterator]()
  if (iterator.return) {
    await iterator.return()
  }

  await Mongo.disconnect()
  process.exit(0)
})
```

### 3. 效能優化

```typescript
// ❌ 不好：監聽所有事件後再過濾
const stream = Mongo.collection('orders').watch()
for await (const change of stream) {
  if (change.fullDocument?.status === 'paid') {
    // 處理付款完成的訂單
  }
}

// ✅ 好：使用 pipeline 在資料庫端過濾
const stream = Mongo.collection('orders').watch([
  {
    $match: {
      operationType: 'update',
      'fullDocument.status': 'paid'
    }
  }
])
for await (const change of stream) {
  // 只接收付款完成的訂單
}
```

### 4. 部署建議

- **Replica Set：** Change Streams 必須在 Replica Set 或 Sharded Cluster 上運行
- **連線穩定性：** 確保網路連線穩定，避免頻繁重連
- **Resume Token：** 生產環境務必儲存 resume token（例如存入 Redis）
- **負載均衡：** 多個應用實例可以共同監聽同一個 collection
- **記憶體管理：** Change Stream 會佔用記憶體，注意監控

## 常見問題

### Q1: Change Stream 會遺漏事件嗎？

不會。使用 resume token 可以確保從上次中斷處繼續，不會遺漏任何事件。

### Q2: 可以監聽多個 collection 嗎？

可以。在資料庫層級監聽即可：

```typescript
// 監聽整個資料庫的變更
const db = Mongo.database()
const stream = db.watch()
```

### Q3: Change Stream 的延遲有多大？

通常在毫秒級別。延遲主要取決於網路和 MongoDB 的負載。

### Q4: 如何限制 Change Stream 的記憶體使用？

```typescript
const stream = Mongo.collection('events').watch([], {
  maxAwaitTimeMS: 1000, // 限制等待時間
  batchSize: 100        // 限制批次大小
})
```

## 相關資源

- [MongoDB Change Streams 官方文檔](https://www.mongodb.com/docs/manual/changeStreams/)
- [基準測試結果](../benchmarks/change-streams.bench.ts)
- [Real-world 範例：即時聊天](../examples/real-world/real-time-chat.ts)
