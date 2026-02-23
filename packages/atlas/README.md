# @gravito/atlas

> The Standard Database Orbit - Custom Query Builder & ORM for Gravito

**@gravito/atlas** is a high-performance, developer-centric database toolkit. It provides a fluent Query Builder, a robust Active Record ORM, and advanced sharding capabilities inspired by the best patterns of Laravel and Drizzle.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.6.0-orange)](package.json)
[![Performance](https://img.shields.io/badge/performance-extreme-brightgreen)](docs/architecture.md)

---

## ✨ Features

- 🚀 **High Performance**: zero-cost Query Cloning (CoW) and optimized Model Hydration.
- 🧩 **Horizontal Sharding**: Scale your database horizontally with simple decorators.
- 🛡️ **Type-Safe ORM**: Comprehensive Active Record implementation with relationship support.
- 🛡️ **SQL Injection Protection**: Tagged template literals with automatic parameter binding (SafeQueryBuilder).
- 🔌 **Multi-Driver**: Native support for PostgreSQL, MySQL, SQLite, MongoDB, and Redis.
- 📊 **Observability**: Built-in OpenTelemetry integration for distributed tracing.
- 🛠️ **Developer Experience**: "Smart Guard" error suggestions and N+1 detection.

---

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [Architecture Overview](docs/architecture.md) - Understanding the Orbit Engine.
- [Safe Queries](docs/safe-queries.md) - SQL injection-proof queries with tagged templates.
- [Active Record ORM](docs/orm.md) - Models, hydration, and persistence.
- [Database Sharding](docs/sharding.md) - Scaling horizontally with `@sharded`.
- [Fluent Query Builder](docs/query-builder.md) - Advanced query construction.
- [Database Drivers](docs/drivers.md) - Connectivity and platform support.
- [Observability](docs/observability.md) - Tracing and performance monitoring.
- [Performance Results](docs/BUN_SQL_OPTIMIZATION_RESULTS.md) - Optimization metrics and benchmarks.

---

## 📦 Installation

```bash
bun add @gravito/atlas
```

> **Note**: Drivers must be installed separately. See [Drivers Documentation](docs/drivers.md).

---

## 🚀 Quick Start

### 1. Define your Model

```typescript
import { Model, column, HasMany } from '@gravito/atlas'

export class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @HasMany(() => Post)
  declare posts: Post[]
}
```

### 2. Query and Save

```typescript
// Find a user and their posts
const user = await User.with('posts').find(1)

// Update and save
user.email = 'orbit@gravito.dev'
await user.save()

// Fluent queries
const activeUsers = await User.where('status', 'active')
  .orderBy('created_at', 'desc')
  .limit(10)
  .get()

// Safe queries with SQL injection protection
const userId = 123
const safeUser = await User.connection().sql`
  SELECT * FROM users WHERE id = ${userId}
`.first()
```

---

## 🛡️ Safe Queries - SQL Injection Protection

The **SafeQueryBuilder** provides SQL injection-proof queries through tagged template literals. Parameters are automatically bound, never concatenated into SQL.

### Basic Safe Query

```typescript
const userId = 123
const users = await db.sql`SELECT * FROM users WHERE id = ${userId}`.all()
// Generated SQL: SELECT * FROM users WHERE id = $1
// Bindings: [123]
// ✅ SAFE - Parameters never in SQL string
```

### Safe Identifiers (Table/Column Names)

For dynamic table or column names, use `identifier()` for whitelist-validated names:

```typescript
import { identifier } from '@gravito/atlas'

const tableName = identifier('users')
const columnName = identifier('email')

const data = await db.sql`
  SELECT ${columnName} FROM ${tableName} WHERE active = ${true}
`.all()

// Rejects invalid names:
identifier("users'; DROP TABLE--")  // ❌ Throws error
```

### Complex Queries

```typescript
const authorId = 123
const status = 'published'
const createdAfter = new Date('2024-01-01')

const posts = await db.sql`
  SELECT p.*, u.name as author_name
  FROM posts p
  JOIN users u ON p.author_id = u.id
  WHERE p.author_id = ${authorId}
    AND p.status = ${status}
    AND p.created_at > ${createdAfter}
  ORDER BY p.created_at DESC
  LIMIT 10
`.all()
```

### Type Safety with Generics

```typescript
interface User {
  id: number
  email: string
  name: string
}

const user = await db.sql<User>`
  SELECT * FROM users WHERE id = ${userId}
`.first()
// ✅ user is typed as User | null
```

### Result Methods

```typescript
// Get all rows
const users = await db.sql`SELECT * FROM users`.all()

// Get first row (or null)
const user = await db.sql`SELECT * FROM users WHERE id = ${id}`.first()

// Get full result object
const result = await db.sql`SELECT * FROM users`.execute()
console.log(result.rowCount, result.rows)
```

---

## 🛠️ Command Line Interface (Orbit)

Accelerate development with built-in scaffolding.

```bash
# Generate a model
bun orbit make:model User

# Run migrations
bun orbit migrate

# Heal check
bun orbit doctor
```

---

## 📄 License

MIT © Gravito Framework
