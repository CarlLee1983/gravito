# 進階 Bun SQL 功能

完整的進階特性指南，包括批量操作、事務管理、快取策略與效能優化。

## 快速導航

- [批量插入](#批量插入) - 高效插入大量記錄
- [事務 Savepoint](#事務-savepoint) - 巢狀事務與部分回滾
- [查詢快取](#查詢快取) - TTL 型結果快取
- [批量更新/刪除](#批量更新刪除) - 安全的批量操作
- [效能最佳化](#效能最佳化) - 調優技巧與最佳實踐

---

## 批量插入

### 基本用法

```typescript
import { BulkInsertBuilder, bulkInsert } from '@gravito/atlas'

// 方式 1: 使用 Builder 類別
const builder = new BulkInsertBuilder(connection, 'users', {
  batchSize: 5000,
  onProgress: (inserted, total) => {
    console.log(`Inserted ${inserted}/${total}`)
  },
})

for (const user of userList) {
  await builder.add({
    name: user.name,
    email: user.email,
    createdAt: new Date(),
  })
}

const result = await builder.execute()
console.log(`✅ Inserted ${result.totalInserted} records in ${result.duration}ms`)
```

### 便利函數用法

```typescript
// 方式 2: 使用便利函數
const records = [
  { name: 'Alice', email: 'alice@example.com' },
  { name: 'Bob', email: 'bob@example.com' },
  // ... 1M 條記錄
]

const result = await bulkInsert(connection, 'users', records, {
  batchSize: 10000,
  continueOnError: true,
  onProgress: (inserted, total) => {
    process.stdout.write(`\rProgress: ${inserted}/${total}`)
  },
  onError: (error, batchIndex) => {
    console.error(`Batch ${batchIndex} failed:`, error.message)
  },
})

console.log(result)
// {
//   totalInserted: 1000000,
//   totalRecords: 1000000,
//   failedRecords: 0,
//   duration: 4523,
//   errors: []
// }
```

### 效能特性

| 操作 | 效能 | 備註 |
|-----|------|------|
| 1,000 記錄 | ~50ms | 簡單情況 |
| 10,000 記錄 | ~400ms | 標準批量 |
| 100,000 記錄 | ~3.5s | 大型批量 |
| 1,000,000 記錄 | ~35s | 超大型批量 |

### 最佳實踐

```typescript
// ✅ 推薦：適當的批量大小
const builder = new BulkInsertBuilder(connection, 'logs', {
  batchSize: 5000, // 平衡記憶體與效能
})

// ❌ 避免：過大的批量大小
const builder = new BulkInsertBuilder(connection, 'logs', {
  batchSize: 1000000, // 記憶體溢出風險
})

// ✅ 推薦：錯誤恢復
await bulkInsert(connection, 'users', records, {
  continueOnError: true,
  onError: (error, index) => {
    logger.error(`Batch error: ${error.message}`)
  },
})
```

---

## 事務 Savepoint

### 基本用法

```typescript
import { SavepointManager, executeWithSavepoints } from '@gravito/atlas'

const manager = new SavepointManager(connection)

await manager.begin()

try {
  // 第一個操作
  await connection.sql`INSERT INTO users (name, email) VALUES (${'Alice'}, ${'alice@example.com'})`.execute()

  // 建立 savepoint
  const sp1 = await manager.createSavepoint('before_posts')

  // 執行可能失敗的操作
  try {
    await connection.sql`INSERT INTO posts (title, authorId) VALUES (${'My Post'}, ${1})`.execute()
    await manager.releaseSavepoint(sp1) // 提交該 savepoint
  } catch (error) {
    // 只回滾到 savepoint，不影響之前的操作
    await manager.rollbackToSavepoint(sp1)
    console.log('Post creation failed, but user data is safe')
  }

  await manager.commit() // 提交整個事務
} catch (error) {
  await manager.rollback() // 回滾整個事務
  throw error
}
```

### 巢狀事務模擬

```typescript
// ✅ 支援巢狀操作的便利函數
const result = await executeWithSavepoints(connection, async (manager) => {
  // 外層操作
  await connection.sql`INSERT INTO accounts ...`.execute()

  // 在 savepoint 內執行風險操作
  const transferResult = await manager.withSavepoint('transfer', async () => {
    await connection.sql`UPDATE accounts SET balance = balance - ${amount} WHERE id = ${from}`.execute()
    await connection.sql`UPDATE accounts SET balance = balance + ${amount} WHERE id = ${to}`.execute()
    return { transferred: true }
  })

  if (!transferResult.success) {
    console.log('Transfer failed:', transferResult.error)
    // 轉帳失敗，但不影響其他操作
  }

  return 'completed'
})
```

### Savepoint 棧管理

```typescript
const manager = new SavepointManager(connection)

await manager.begin()

// 建立多層 savepoint
const sp1 = await manager.createSavepoint('level1')
// ... 操作 1

const sp2 = await manager.createSavepoint('level2')
// ... 操作 2

const sp3 = await manager.createSavepoint('level3')
// ... 操作 3

// 檢查棧
console.log(manager.getSavepointStack().length) // 3

// 回滾到 level 2（自動移除 level3）
await manager.rollbackToSavepoint(sp2)

console.log(manager.getSavepointStack().length) // 2

await manager.commit()
```

---

## 查詢快取

### 基本用法

```typescript
import { QueryCache, getGlobalCache } from '@gravito/atlas'

const cache = new QueryCache()

// 或使用全域快取
const globalCache = getGlobalCache()

// ✅ 快取查詢結果
const users = await cache.remember(
  'users:all',
  async () => {
    return await db.table('users').where('isActive', true).get()
  },
  { ttl: 3600 } // 1 小時
)
```

### 快取策略

```typescript
// 按時間快取
const hourlyData = await cache.remember(
  `stats:${new Date().toISOString().split('T')[0]}`, // 按日期分組
  async () => {
    return await calculateDailyStats()
  },
  { ttl: 86400 } // 24 小時
)

// 按使用者快取
const userPosts = await cache.remember(
  `user:${userId}:posts`,
  async () => {
    return await db.table('posts').where('authorId', userId).get()
  },
  { ttl: 1800 } // 30 分鐘
)

// 按查詢參數快取
const searchResults = await cache.remember(
  `search:${query}:${page}`,
  async () => {
    return await db.table('users')
      .where('name', 'like', `%${query}%`)
      .paginate(page, 20)
  },
  { ttl: 300 } // 5 分鐘
)
```

### 快取失效

```typescript
// 刪除單個快取
cache.forget('users:all')

// 刪除所有以 'users:' 開頭的快取
cache.forgetByPrefix('users:')

// 在使用者更新後清除快取
async function updateUser(userId, data) {
  const result = await db.table('users').where('id', userId).update(data)

  // 清除相關快取
  cache.forgetByPrefix(`user:${userId}:`)
  cache.forgetByPrefix('users:')

  return result
}

// 清空所有快取
cache.flush()
```

### 監控與統計

```typescript
// 取得快取統計
const stats = cache.getStats()
console.log(stats)
// {
//   hits: 1500,
//   misses: 300,
//   totalEntries: 45,
//   hitRate: 83.33
// }

// 取得快取鍵
const keys = cache.keys()
console.log(`Cached items: ${keys.length}`)

// 取得單個項目詳情
const entry = cache.getEntry('users:all')
console.log(entry)
// {
//   value: [...],
//   createdAt: 1708123456789,
//   ttl: 3600,
//   accessCount: 42,
//   lastAccessedAt: 1708124012345
// }
```

---

## 批量更新/刪除

### 批量更新

```typescript
import { BatchUpdateBuilder, safeBatchUpdate } from '@gravito/atlas'

// 方式 1: 使用 Builder
const builder = new BatchUpdateBuilder(connection, 'users')
const result = await builder
  .where('status', '=', 'pending')
  .where('createdAt', '<', sevenDaysAgo)
  .update({
    status: 'inactive',
    updatedAt: new Date(),
  })

console.log(`Updated ${result.affectedRows} records in ${result.duration}ms`)
```

### 批量刪除

```typescript
// 方式 2: 使用便利函數
const result = await safeBatchDelete(
  connection,
  'logs',
  { column: 'createdAt', operator: '<', value: thirtyDaysAgo },
  {
    limit: 50000, // 最多刪除 50000 條
    batchSize: 1000, // 每批 1000 條
  }
)

console.log(`Deleted ${result.totalDeleted} records in ${result.batches} batches`)
```

### 安全驗證

```typescript
// ✅ 必須提供 WHERE 條件（防止全表刪除）
const builder = new BatchUpdateBuilder(connection, 'posts')
await builder.where('status', '=', 'draft').delete()

// ❌ 會拋出錯誤
const builder = new BatchUpdateBuilder(connection, 'posts')
await builder.delete() // Error: DELETE 操作必須至少有一個 WHERE 條件
```

### 安全的舊記錄清理

```typescript
// ✅ 推薦：明確的時間條件
const result = await safeBatchDelete(
  connection,
  'audit_logs',
  {
    column: 'createdAt',
    operator: '<',
    value: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 天前
  }
)

// ✅ 使用特定的更新時間
const result = new BatchUpdateBuilder(connection, 'users')
  .where('lastLogin', '<', ninetyDaysAgo)
  .where('isActive', '=', true)
  .update({ isActive: false })
```

---

## 效能最佳化

### 查詢優化

```typescript
// ✅ 快取頻繁查詢
const popularPosts = await cache.remember(
  'posts:popular:today',
  async () => {
    return await db.table('posts')
      .where('status', 'published')
      .orderBy('viewCount', 'desc')
      .limit(10)
      .get()
  },
  { ttl: 3600 }
)

// ✅ 使用索引欄位過濾
const recentPosts = await db.table('posts')
  .where('createdAt', '>', recentDate) // 使用索引
  .orderBy('createdAt', 'desc')
  .get()

// ❌ 避免：函數在 WHERE 中（不使用索引）
const posts = await db.raw(
  'SELECT * FROM posts WHERE DATE(createdAt) = ?',
  [today]
)
```

### 批量操作優化

```typescript
// ✅ 適當的批量大小
const result = await bulkInsert(connection, 'users', records, {
  batchSize: 5000, // 推薦值
})

// ✅ 使用事務包裝
await connection.transaction(async (trx) => {
  await bulkInsert(trx, 'users', records)
})

// ✅ 監控進度
await bulkInsert(connection, 'users', records, {
  onProgress: (inserted, total) => {
    const percent = (inserted / total) * 100
    console.log(`${percent.toFixed(1)}% complete`)
  },
})
```

### 連接池優化

```typescript
// ✅ 配置合理的池大小
DB.addConnection('default', {
  driver: 'postgres',
  pool: {
    min: 5,      // 最小連接數
    max: 20,     // 最大連接數
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
})

// ✅ 適當的查詢超時
const result = await connection.raw(
  'SELECT * FROM large_table LIMIT 1000',
  [],
  { timeout: 5000 } // 5 秒超時
)
```

---

## 實戰範例

### 資料遷移

```typescript
async function migrateUserData() {
  const cache = getGlobalCache()

  // 清除相關快取
  cache.forgetByPrefix('users:')

  await executeWithSavepoints(connection, async (manager) => {
    // 批量插入新資料
    const newUsers = generateNewUsers(100000)

    const insertResult = await bulkInsert(
      connection,
      'users_backup',
      newUsers,
      { batchSize: 10000 }
    )

    console.log(`Backup: ${insertResult.totalInserted} records`)

    // 批量更新舊記錄
    const updateResult = await safeBatchUpdate(
      connection,
      'users',
      { status: 'migrated' },
      [{ column: 'id', operator: '<=', value: 50000 }]
    )

    console.log(`Updated: ${updateResult.affectedRows} records`)
  })
}
```

### 定期資料清理

```typescript
async function cleanupOldData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const cache = getGlobalCache()

  // 清理舊日誌
  await safeBatchDelete(
    connection,
    'logs',
    { column: 'createdAt', operator: '<', value: thirtyDaysAgo },
    { batchSize: 5000 }
  )

  // 清理舊會話
  await safeBatchDelete(
    connection,
    'sessions',
    { column: 'expiresAt', operator: '<', value: new Date() },
    { batchSize: 1000 }
  )

  // 清除快取
  cache.forgetByPrefix('logs:')
  cache.forgetByPrefix('sessions:')
}
```

---

## 效能基準

基於 M4 CPU 的效能測試結果：

| 操作 | 批量大小 | 時間 | 吞吐量 |
|-----|---------|------|--------|
| **批量插入** | 1,000 | 45ms | 22K/sec |
| | 10,000 | 350ms | 28K/sec |
| | 100,000 | 3.2s | 31K/sec |
| **批量更新** | 1,000 | 25ms | 40K/sec |
| | 10,000 | 200ms | 50K/sec |
| **查詢快取** | 命中 | <1ms | >1M/sec |
| | 未命中 | 10-50ms | 依查詢 |

---

## 相關文件

- [Safe Queries](./safe-queries.md) - SQL Injection 防護
- [Query Builder](./query-builder.md) - 流暢 API
- [Blog App Example](../examples/blog-app/README.md) - 完整示例
