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

### 4. Debugging & Monitoring (New in v2.0)

```typescript
import { DB, Grammar } from '@gravito/atlas'

// Enable debug mode
DB.debug(true)

// View query log
const logs = DB.getQueryLog()
console.log(`Total queries: ${logs.length}`)

// Get last query
const lastQuery = DB.getLastQuery()
console.log(lastQuery.sql, lastQuery.bindings)

// Monitor cache performance
const cacheStats = Grammar.getCacheStats()
console.log(`Cache hit rate: ${(cacheStats.hitRate * 100).toFixed(2)}%`)
```

### 5. Advanced Features

```typescript
// Prepared Statements (PostgreSQL)
const prepared = await User.query()
  .where('status', 'active')
  .getPrepared()

// Batch Operations
const users = await User.hydrateMany([
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
  // ... 1000+ records
])

// Dirty Tracking with Deep Comparison
const user = await User.find(1)
user.getDirtyTracker().setDeepComparison(true)
user.settings.theme = 'dark' // Now tracked as dirty

// Query Builder Clone
const baseQuery = User.query().where('status', 'active')
const activeUsers = await baseQuery.clone().get()
const activeCount = await baseQuery.clone().count()
```

## ✨ Core Features

### 🚀 Native Bun.sql Support (New!)
Atlas now natively supports Bun 1.3's `Bun.sql` unified API. By leveraging the native driver, you can achieve even higher throughput and lower latency.

Simply enable `useNativeDriver` in your configuration:
```typescript
DB.configure({
  connections: {
    postgres: {
      driver: 'postgres',
      useNativeDriver: true, // Enable native Bun.sql driver
      // ...other config
    }
  }
})
```

### 🛡️ Secure by Default
Built-in protection against SQL injection via **Auto-Parameterization**. All user inputs are treated as bindings, never interpolated.

### 🎯 Enhanced Developer Experience (v2.0)
- **Better Error Messages**: "Did you mean?" suggestions for typos
- **Debug Tools**: `DB.debug()`, `DB.getQueryLog()`, `DB.getLastQuery()`
- **Type Safety**: Improved TypeScript types, reduced `any` usage
- **Query Cache Monitoring**: `Grammar.getCacheStats()` for cache performance insights

### 🔗 Rich Relationships
Atlas supports a comprehensive set of relationships:
- **HasOne** / **BelongsTo**: One-to-one connections.
- **HasMany** / **BelongsTo**: One-to-many lists.
- **BelongsToMany**: Many-to-many with pivot tables.
- **MorphOne** / **MorphMany** / **MorphTo**: Polymorphic associations.

### 🌱 Seeding & Factories
Generate dummy data for testing with ease.

```typescript
import { Factory } from '@gravito/atlas'

const userFactory = Factory.define(User, ({ faker }) => ({
  name: faker.person.fullName(),
  email: faker.internet.email(),
}))

// Create 10 users
await userFactory.createMany(10)
```

### 🧠 Memory Safe Streams
Handle millions of records without heap overflows using our cursor-based streaming API.
```typescript
for await (const users of User.cursor(500)) {
  for (const user of users) {
    await process(user)
  }
}
```

### 🛠️ Schema & Migrations
Manage your database versioning with a familiar, expressive syntax.
```typescript
import { Schema } from '@gravito/atlas'

await Schema.create('users', (table) => {
  table.id()
  table.string('email').unique()
  table.json('settings').nullable()
  table.softDeletes() // Adds deleted_at
  table.timestamps()
})
```

### 💻 Command Line Interface (Orbit)
Accelerate development with built-in scaffolding.
```bash
# Generate a model
bun orbit make:model User

# Generate a migration
bun orbit make:migration create_users_table

# Run migrations
bun orbit migrate
```

### 🔧 Configuration Options (v2.0)

```typescript
import { Grammar, DB } from '@gravito/atlas'

// Configure cache size
Grammar.setCacheSize(1000) // Increase for query-heavy apps

// Set cache scope (for multi-tenant)
Grammar.cacheScope = 'instance' // or 'global' (default)

// Configure eager loading chunking
import { setEagerLoadChunking } from '@gravito/atlas'
setEagerLoadChunking(false) // Disable chunking if needed

// Clear caches (useful for testing)
Grammar.clearCache()
Model.clearProxyCache()
```

## 🗄️ Supported Databases

| Database | Status | Driver |
|----------|--------|--------|
| **PostgreSQL** | ✅ Supported | `pg` / `Bun.sql` (Native) |
| **MySQL** | ✅ Supported | `mysql2` / `Bun.sql` (Native) |
| **MariaDB** | ✅ Supported | `mysql2` / `Bun.sql` (Native) |
| **SQLite** | ✅ Supported | `bun:sqlite` / `Bun.sql` |

## 📊 Performance

Atlas is designed for the edge. In our benchmarks, it achieves:
*   **1.1M+** Raw reads per second.
*   **42,000+** Full Active Record hydrations per second.
*   **Constant memory profile** during massive data streams.

### 🚀 Performance Optimizations (v2.0)

Version 2.0 includes significant performance improvements:

- **Model Hydration**: ↑300-500% faster with optimized Proxy caching
- **DirtyTracker**: ↑50x faster with shallow comparison optimization
- **Query Compilation**: ↑50-100% faster with LRU cache (80%+ hit rate)
- **Memory Usage**: ↓40-60% reduction for large datasets
- **QueryBuilder Clone**: Optimized for independent query building

[Read the full Performance Whitepaper](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 🔄 Upgrading from v1.x

See the [Upgrade Guide](./IMPLEMENTATION_PLAN/10-upgrade-guide.md) for detailed migration instructions.

**Key Changes:**
- DirtyTracker now uses shallow comparison by default (use `setDeepComparison(true)` for deep comparison)
- Grammar cache is now global by default (set `Grammar.cacheScope = 'instance'` for multi-tenant)
- Eager loading uses chunking by default (use `setEagerLoadChunking(false)` to disable)

## 📄 License

MIT © Gravito Framework
