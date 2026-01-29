# @gravito/atlas

> The Standard Database Orbit - Custom Query Builder & ORM for Gravito

**@gravito/atlas** is a high-performance, developer-centric database toolkit for the Gravito ecosystem. It provides a fluent Query Builder, a robust Active Record ORM, and database versioning tools inspired by the best patterns of Laravel and Drizzle.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.5.0-orange)](package.json)
[![Performance](https://img.shields.io/badge/performance-extreme-brightgreen)](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

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

// Soft Deletes (if enabled via trait)
await user.delete() // soft delete
await user.forceDelete() // hard delete
```

## ✨ New in v1.5.0

### 🚀 Extreme Performance (CoW & Dirty Tracking)
- **Copy-on-Write QueryBuilder**: Cloning a query is now near-instant (~170ns) and memory-efficient. Heavy arrays are only copied when modified.
- **Optimized Dirty Tracking**: Up to 5x faster change detection using structural recursive comparison instead of JSON serialization.
- **Metadata Caching**: Prototypes and string transformations are cached internally to minimize ORM overhead during hydration.

### 🛡️ Smart Guard DX
- **Intelligent Error Messages**: Missing a column? Atlas uses Levenshtein distance to suggest the correct column name (e.g., `Did you mean "email"?`).
- **N+1 Detection**: Automatically warns you during development if it detects repetitive query patterns on the same table.
- **Type-Safe Proxies**: Complete rewrite of the internal Proxy engine for better IDE support and type inference.

### 🏥 Orbit Doctor
A new diagnostic tool to verify your database health:
```bash
bun orbit doctor
```
Checks connectivity, pending migrations, and reports internal cache statistics.

### 📊 Observability
Full **OpenTelemetry** integration. Atlas now provides standard spans for `save`, `delete`, and `select` operations, including `db.system`, `db.operation`, and `db.sql.table` metadata.

---

## 🔗 Core Features

### 🚀 Native Bun.sql Support
Atlas natively supports Bun 1.3's `Bun.sql` unified API. Simply enable `useNativeDriver` in your configuration for even higher throughput.

### 🛡️ Secure by Default
Built-in protection against SQL injection via **Auto-Parameterization**. All user inputs are treated as bindings, never interpolated.

### 🔗 Rich Relationships
Atlas supports a comprehensive set of relationships:
- **HasOne** / **BelongsTo**: One-to-one connections.
- **HasMany** / **BelongsTo**: One-to-many lists.
- **BelongsToMany**: Many-to-many with pivot tables.
- **MorphOne** / **MorphMany** / **MorphTo**: Polymorphic associations.

### 🌱 Seeding & Factories
Generate dummy data for testing with ease.

### 🧠 Memory Safe Streams
Handle millions of records without heap overflows using our cursor-based streaming API.

### 🛠️ Schema & Migrations
Manage your database versioning with a familiar, expressive syntax.

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

## 🗄️ Supported Databases

| Database | Status | Driver |
|----------|--------|--------|
| **PostgreSQL** | ✅ Supported | `pg` / `Bun.sql` (Native) |
| **MySQL** | ✅ Supported | `mysql2` / `Bun.sql` (Native) |
| **MariaDB** | ✅ Supported | `mysql2` / `Bun.sql` (Native) |
| **SQLite** | ✅ Supported | `bun:sqlite` / `Bun.sql` |
| **MongoDB** | ✅ Supported | `mongodb` |
| **Redis** | ✅ Supported | `ioredis` |

## 📊 Performance

Atlas is designed for the edge. In our latest v1.5.0 benchmarks:
*   **Query Cloning**: ~170 ns (Copy-on-Write)
*   **Model Hydration**: ~1.9 µs per instance
*   **Grammar Compilation**: ~800 ns (Cached)

[Read the full Performance Whitepaper](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 📄 License

MIT © Gravito Framework

