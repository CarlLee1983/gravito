# @gravito/atlas

> The Standard Database Orbit - Custom Query Builder & ORM for Gravito

**@gravito/atlas** is a high-performance, developer-centric database toolkit for the Gravito ecosystem. It provides a fluent Query Builder, a robust Active Record ORM, and database versioning tools inspired by the best patterns of Laravel and Drizzle.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Performance](https://img.shields.io/badge/performance-40k--models/sec-brightgreen)](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 📦 Installation

```bash
bun add @gravito/atlas

# Install the driver for your database
bun add pg              # PostgreSQL
bun add mysql2          # MySQL / MariaDB
bun add better-sqlite3  # SQLite (for non-Bun environments)
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
```

### 3. Using Active Record ORM

```typescript
import { Model, column, HasMany } from '@gravito/atlas'

class User extends Model {
  static table = 'users'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare email: string

  @HasMany(() => Post)
  declare posts: Post[]
}

// Find and Update
const user = await User.find(1)
user.email = 'new@example.com'
await user.save()

// Eager Loading
const usersWithPosts = await User.with('posts').get()
```

## ✨ Core Features

### 🛡️ Secure by Default
Built-in protection against SQL injection via **Auto-Parameterization**. All user inputs are treated as bindings, never interpolated.

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

## 🗄️ Supported Databases

| Database | Status | Driver |
|----------|--------|--------|
| **PostgreSQL** | ✅ Supported | `pg` |
| **MySQL** | ✅ Supported | `mysql2` |
| **MariaDB** | ✅ Supported | `mysql2` |
| **SQLite** | ✅ Supported | `bun:sqlite` / `better-sqlite3` |

## 📊 Performance

Atlas is designed for the edge. In our benchmarks, it achieves:
*   **1.1M+** Raw reads per second.
*   **42,000+** Full Active Record hydrations per second.
*   **Constant memory profile** during massive data streams.

[Read the full Performance Whitepaper](../../docs/ATLAS_PERFORMANCE_WHITEPAPER.md)

## 📄 License

MIT © Gravito Framework