# @gravito/dark-matter

> MongoDB client for Gravito - Bun native, Laravel-style API

## Installation

```bash
bun add @gravito/dark-matter mongodb
```

## Quick Start

```typescript
import { Mongo } from '@gravito/dark-matter'

// Configure
Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017', database: 'myapp' }
  }
})

// Connect
await Mongo.connect()

// Use
const users = await Mongo.collection('users')
  .where('status', 'active')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get()

// Disconnect
await Mongo.disconnect()
```

## Features

- 🚀 **Bun Native** - Optimized for Bun runtime
- 🎯 **Laravel-style API** - Familiar fluent interface
- 🔍 **Query Builder** - Type-safe query building
- 📊 **Aggregation Pipeline** - Fluent aggregation API
- 🔌 **Multi-connection** - Named connections support
- 🛡️ **Transactions** - ACID transactions with convenient API
- 🗑️ **Soft Deletes** - Built-in soft delete support with restore capability
- 📦 **GridFS** - Handle large file uploads/downloads
- ⚡ **Change Streams** - Real-time database event listening
- ✅ **Schema Validation** - Type-safe Schema Builder API for MongoDB validation

## API Reference

### Query Builder

```typescript
// Basic queries
const users = await Mongo.collection('users')
  .where('status', 'active')
  .where('age', '>', 18)
  .whereIn('role', ['admin', 'editor'])
  .get()

// Sorting & Pagination
const latest = await Mongo.collection('posts')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .skip(20)
  .get()

// Select specific fields
const names = await Mongo.collection('users')
  .select('name', 'email')
  .get()

// Find by ID
const user = await Mongo.collection('users').find('507f1f77bcf86cd799439011')

// Count & Exists
const count = await Mongo.collection('users').where('status', 'active').count()
const exists = await Mongo.collection('users').where('email', 'john@example.com').exists()
```

### CRUD Operations

```typescript
// Insert
const result = await Mongo.collection('users').insert({
  name: 'John',
  email: 'john@example.com',
  createdAt: new Date()
})
console.log(result.insertedId)

// Insert Many
const results = await Mongo.collection('users').insertMany([
  { name: 'Alice' },
  { name: 'Bob' }
])

// Update
await Mongo.collection('users')
  .where('_id', userId)
  .update({ status: 'inactive' })

// Update Many
await Mongo.collection('users')
  .where('status', 'pending')
  .updateMany({ status: 'active' })

// Delete
await Mongo.collection('users')
  .where('_id', userId)
  .delete()

// Delete Many
await Mongo.collection('users')
  .where('status', 'deleted')
  .deleteMany()

// Bulk Write
await Mongo.collection('logs').bulkWrite([
  { insertOne: { document: { event: 'login' } } },
  { deleteOne: { filter: { status: 'old' } } }
])
```

### Soft Deletes

Dark Matter 支援開箱即用的軟刪除功能：

```typescript
// 軟刪除一筆記錄（設置 deletedAt）
await Mongo.collection('users')
  .where('_id', userId)
  .softDelete()

// 查詢時自動排除已軟刪除的記錄
const activeUsers = await Mongo.collection('users').get()

// 包含已軟刪除的記錄
const allUsers = await Mongo.collection('users')
  .withTrashed()
  .get()

// 只查詢已軟刪除的記錄
const trashedUsers = await Mongo.collection('users')
  .onlyTrashed()
  .get()

// 恢復軟刪除的記錄
await Mongo.collection('users')
  .where('_id', userId)
  .restore()

// 批次軟刪除
await Mongo.collection('users')
  .where('status', 'inactive')
  .softDeleteMany()

// 批次恢復
await Mongo.collection('users')
  .onlyTrashed()
  .restoreMany()

// 永久刪除記錄
await Mongo.collection('users')
  .where('_id', userId)
  .forceDelete()
```

**注意**：軟刪除使用 `deletedAt` 欄位（`Date | null`）。請確保在文檔中加入此欄位。

### Aggregation Pipeline

```typescript
// Group and count
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

// Lookup (JOIN)
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

### Schema Validation

使用友善的 Schema Builder API 建立型別安全的 MongoDB Schema 驗證：

```typescript
import { schema } from '@gravito/dark-matter'

// 建構 Schema
const userSchema = schema()
  .required('username', 'email', 'createdAt')
  .string('username', { minLength: 3, maxLength: 50 })
  .string('email', { pattern: '^.+@.+$' })
  .integer('age', { minimum: 0, maximum: 150 })
  .boolean('isActive')
  .date('createdAt')
  .array('roles', 'string', { minItems: 1 })
  .object('profile', (s) =>
    s
      .string('bio', { maxLength: 500 })
      .string('avatar')
      .integer('followers')
  )

// 建立帶有 Schema 驗證的 Collection
await Mongo.database().createCollectionWithSchema('users', userSchema)

// 或使用原生 API
await Mongo.database().createCollection('users', {
  schema: userSchema.toValidationOptions({
    validationLevel: 'strict',
    validationAction: 'error'
  })
})
```

#### 支援的欄位類型

```typescript
schema()
  .string('field', { minLength, maxLength, pattern, enum })
  .number('field', { minimum, maximum, exclusiveMinimum, exclusiveMaximum })
  .integer('field', { minimum, maximum })
  .boolean('field')
  .date('field')
  .array('field', 'string', { minItems, maxItems, uniqueItems })
  .object('field', (s) => s.string('nested'))
```

### Advanced Features

#### Transactions

```typescript
await Mongo.connection().withTransaction(async (session) => {
  // Deduct from sender
  await session.collection('accounts')
    .where('_id', senderId)
    .update({ $inc: { balance: -100 } })

  // Add to receiver
  await session.collection('accounts')
    .where('_id', receiverId)
    .update({ $inc: { balance: 100 } })
})
```

#### Change Streams

```typescript
const stream = Mongo.collection('orders').watch(
  [{ $match: { 'fullDocument.amount': { $gt: 1000 } } }]
)

for await (const event of stream) {
  console.log('High value order:', event.fullDocument)
}
```

#### GridFS (File Storage)

```typescript
const grid = new MongoGridFS(Mongo.database())

// Upload
const fileId = await grid.upload(Buffer.from('Hello'), { filename: 'hello.txt' })

// Download
const content = await grid.download(fileId)
```

#### Schema Validation

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

### Connection Management

```typescript
// Configure multiple connections
Mongo.configure({
  default: 'main',
  connections: {
    main: { uri: 'mongodb://localhost:27017/app' },
    analytics: { uri: 'mongodb://stats-db:27017/stats' }
  }
})

// Check health
const health = await Mongo.connection().getHealthStatus()
console.log(health.latencyMs) // e.g. 15
```

## Roadmap

- [x] Connection retry & health check
- [x] Transactions
- [x] Schema validation
- [x] Change streams
- [x] GridFS support

## License

MIT
