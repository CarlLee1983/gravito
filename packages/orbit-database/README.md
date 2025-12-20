# @gravito/orbit-database

> The Standard Database Orbit - Custom Query Builder & ORM for Gravito

**完全自主開發的資料庫查詢建構器**，對標 Laravel 的 DB Facade，提供流暢的查詢語法。

## 📦 Installation

```bash
bun add @gravito/orbit-database

# 安裝對應的資料庫驅動 (按需)
bun add pg          # PostgreSQL
# bun add mysql2    # MySQL/MariaDB (coming soon)
# bun add better-sqlite3  # SQLite (coming soon)
```

## 🚀 Quick Start

```typescript
import { DB } from '@gravito/orbit-database'

// 1. 配置連線
DB.addConnection('default', {
  driver: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'myapp',
  username: 'postgres',
  password: 'secret'
})

// 2. 查詢資料
const users = await DB.table('users')
  .where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()
```

## ✨ Features

### Query Builder

```typescript
// SELECT with conditions
const users = await DB.table('users')
  .where('status', 'active')
  .where('age', '>', 18)
  .whereIn('role', ['admin', 'moderator'])
  .whereNull('deleted_at')
  .get()

// INSERT
await DB.table('users').insert({
  name: 'John Doe',
  email: 'john@example.com'
})

// UPDATE
await DB.table('users')
  .where('id', 1)
  .update({ name: 'Jane Doe' })

// DELETE
await DB.table('users')
  .where('id', 1)
  .delete()
```

### JOINs

```typescript
const posts = await DB.table('posts')
  .join('users', 'posts.user_id', '=', 'users.id')
  .select('posts.title', 'users.name as author')
  .get()
```

### Aggregates

```typescript
const count = await DB.table('users').count()
const total = await DB.table('orders').sum('amount')
const avg = await DB.table('products').avg('price')
```

### Pagination

```typescript
const result = await DB.table('users').paginate(10, 1)
// { data: [...], pagination: { page, perPage, total, totalPages, hasNext, hasPrev } }
```

### Transactions

```typescript
await DB.transaction(async (db) => {
  await db.table('accounts').where('id', 1).decrement('balance', 100)
  await db.table('accounts').where('id', 2).increment('balance', 100)
})
```

### Raw SQL

```typescript
const results = await DB.raw('SELECT * FROM users WHERE id = $1', [1])
```

## 🗄️ Supported Databases

| Database | Status |
|----------|--------|
| PostgreSQL | ✅ Supported |
| MySQL | 🔜 Coming Soon |
| MariaDB | 🔜 Coming Soon |
| SQLite | 🔜 Coming Soon |

## 📚 API Reference

### DB Facade

| Method | Description |
|--------|-------------|
| `DB.addConnection(name, config)` | 添加資料庫連線 |
| `DB.table(name)` | 取得 Query Builder |
| `DB.raw(sql, bindings)` | 執行原生 SQL |
| `DB.transaction(callback)` | 執行事務 |
| `DB.connection(name)` | 取得指定連線 |

### Query Builder

| Method | Description |
|--------|-------------|
| `select(...columns)` | 選擇欄位 |
| `where(column, operator?, value)` | WHERE 條件 |
| `whereIn(column, values)` | WHERE IN |
| `whereNull(column)` | WHERE IS NULL |
| `join(table, first, operator, second)` | INNER JOIN |
| `orderBy(column, direction?)` | ORDER BY |
| `groupBy(...columns)` | GROUP BY |
| `limit(n)` | LIMIT |
| `offset(n)` | OFFSET |
| `get()` | 執行並取得結果 |
| `first()` | 取得第一筆 |
| `find(id)` | 依 ID 查詢 |
| `count()` | 計數 |
| `insert(data)` | 插入資料 |
| `update(data)` | 更新資料 |
| `delete()` | 刪除資料 |
| `paginate(perPage, page)` | 分頁 |

## 🛠️ Development

```bash
# Build
bun run build

# Test
bun test

# Type check
bun run typecheck
```

## 📄 License

MIT
