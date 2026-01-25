# @gravito/atlas

> The Standard Database Orbit - Custom Query Builder & ORM for Gravito

**@gravito/atlas** is a high-performance, developer-centric database toolkit for the Gravito ecosystem. It provides a fluent Query Builder, a robust Active Record ORM, and database versioning tools inspired by the best patterns of Laravel and Drizzle.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-40k--models/sec-brightgreen)](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 📦 Installation

```bash
bun add @gravito/atlas

# ⚠️ Important: You must install the driver for your database manually
# Atlas 1.1+ does not bundle drivers to keep installation size small.

# PostgreSQL
bun add pg

# MySQL / MariaDB
bun add mysql2

# SQLite
# No install needed if using Bun runtime!
# For Node.js:
bun add better-sqlite3

# MongoDB
bun add mongodb

# Redis
bun add ioredis
```

## 🚀 Quick Start

### 1. Configuration

**Option 1: Programmatic Configuration**
```typescript
import { DB } from '@gravito/atlas'

DB.configure({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: 'localhost',
      database: 'myapp',
      username: 'postgres',
      password: 'password'
    }
  }
})
```

**Option 2: Environment Variables (New in v2.0)**
```typescript
import { DB } from '@gravito/atlas'

// Using DATABASE_URL
// DATABASE_URL=postgres://user:password@localhost:5432/myapp
DB.configureFromEnv()

// Or using individual variables
// DB_DRIVER=postgres
// DB_HOST=localhost
// DB_DATABASE=myapp
// DB_USERNAME=postgres
// DB_PASSWORD=password
DB.configureFromEnv()
```

**Option 3: Configuration File (New in v2.0)**
```typescript
// config/database.ts
import { defineConfig } from '@gravito/atlas'

export default defineConfig({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'myapp',
      // ...
    }
  }
})

// Then in your app
import { DB } from '@gravito/atlas'
await DB.configureFromFile()
```

### 2. Using Query Builder

```typescript
const users = await DB.table('users')
  .where('status', 'active')
  .where('age', '>', 18)
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()

// Raw expressions
const stats = await DB.table('orders')
  .select(DB.raw('count(*) as total, sum(amount) as revenue'))
  .groupBy('status')
  .get()
```

### 3. Using Active Record ORM

```typescript
import { Model, column, HasMany, BelongsTo } from '@gravito/atlas'

class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  // Relationships
  @HasMany(() => Post)
  declare posts: Post[]
}

class Post extends Model {
  @BelongsTo(() => User)
  declare user: User
}

// Find and Update
const user = await User.find(1)
user.email = 'new@example.com'
await user.save()

// Eager Loading
const usersWithPosts = await User.with('posts').get()

// Pagination
const { data, pagination } = await User.query()
  .where('status', 'active')
  .paginate(15, 1)

// Transactions
await DB.transaction(async (trx) => {
  await trx.table('accounts').where('id', 1).decrement('balance', 100)
  await trx.table('accounts').where('id', 2).increment('balance', 100)
})

// Soft Deletes (if enabled via trait)
await user.delete() // soft delete
await user.forceDelete() // hard delete
```

## ✨ Core Features

### 🏢 Galaxy Architecture Integration
As a core **Orbit** in the Gravito ecosystem, Atlas integrates seamlessly with PlanetCore's lifecycle hooks and IoC container.

### 🚀 High-Performance ORM
- **Model Hydration**: Extremely fast hydration using optimized Proxy caching.
- **Dirty Tracking**: Efficiently track modified fields with shallow and deep comparison options.
- **Eager Loading**: Prevent N+1 query problems with sophisticated relation loading.
- **Polymorphic Relationships**: Support for `morphOne`, `morphMany`, and `morphTo` associations.

### 🛡️ Type Safety & DX
- **Full TypeScript Support**: Leverages decorators and advanced types for a superior developer experience.
- **Detailed Error Messages**: "Did you mean?" suggestions and descriptive error types.
- **Debug Tools**: Built-in query logging, execution time monitoring, and cache statistics.

### 🔄 Database Versioning
- **Fluent Schema Builder**: Expressive syntax for creating and altering tables.
- **Robust Migrator**: Track and manage database changes across different environments.
- **Seeds & Factories**: Easily generate test data with integrated faker support.

### 🗄️ Multi-Driver Support
Native support for major databases with unified API:
- **PostgreSQL**: Native `pg` and `Bun.sql` support.
- **MySQL/MariaDB**: High-performance `mysql2` driver.
- **SQLite**: Lightning-fast `bun:sqlite` and `better-sqlite3`.
- **MongoDB & Redis**: Strategic support for NoSQL and caching layers.

## 🧠 Advanced Module Functionality

### 📡 Event System & Observers
Listen to model lifecycle events to implement cross-cutting concerns.
```typescript
User.observe({
  creating: (user) => {
    user.api_token = Str.random(40)
  },
  saved: (user) => {
    Signal.emit('user.updated', user)
  }
})
```

### 🧬 Dynamic Attribute Casting
Automatically transform database values to JavaScript types and back.
```typescript
class User extends Model {
  static casts = {
    settings: 'json',
    is_admin: 'boolean',
    last_login: 'datetime'
  }
}
```

### 🔍 Advanced Query Builder
- **Nested Where Clauses**: Complex logical grouping.
- **Join Management**: Fluent inner, left, and right joins.
- **Subqueries**: Use query builders as expressions within other queries.
- **Raw Expressions**: Drop down to raw SQL when needed safely via `DB.raw()`.

### 🧠 Memory Safe Streams
Handle millions of records without heap overflows using cursor-based streaming.
```typescript
for await (const users of User.cursor(500)) {
  for (const user of users) {
    await process(user)
  }
}
```

## 📊 Performance Benchmark

| Operation | Performance |
|-----------|-------------|
| Raw Query Reads | 1.1M+ rows/sec |
| Model Hydration | 42k+ models/sec |
| Dirty Tracking | ↑50x faster (v2.0) |
| Memory Overhead | ↓40-60% (v2.0) |

## 📄 License

MIT © Gravito Framework
