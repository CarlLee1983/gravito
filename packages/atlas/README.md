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
- 🔌 **Multi-Driver**: Native support for PostgreSQL, MySQL, SQLite, MongoDB, and Redis.
- 📊 **Observability**: Built-in OpenTelemetry integration for distributed tracing.
- 🛠️ **Developer Experience**: "Smart Guard" error suggestions and N+1 detection.

---

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

- [Architecture Overview](docs/architecture.md) - Understanding the Orbit Engine.
- [Active Record ORM](docs/orm.md) - Models, hydration, and persistence.
- [Database Sharding](docs/sharding.md) - Scaling horizontally with `@sharded`.
- [Fluent Query Builder](docs/query-builder.md) - Advanced query construction.
- [Database Drivers](docs/drivers.md) - Connectivity and platform support.
- [Observability](docs/observability.md) - Tracing and performance monitoring.

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
