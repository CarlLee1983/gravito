# Atlas

> Standardized Database Orbit for Gravito —— Featuring a Laravel-style Query Builder & ORM.

Package: `@gravito/atlas`

This module provides standardized database connection management, a fluent Query Builder, transaction support, model relationships, migrations, and data seeding.

## Reading Guide

This page is an overview. Detailed documentation is grouped by topic:

| Topic | Page |
|------|------|
| Getting Started | [Getting Started](./atlas/getting-started.md) |
| Query Builder | [Query Builder](./atlas/query-builder.md) |
| Models (ORM) | [Models](./atlas/models.md) |
| Relations | [Relations](./atlas/relations.md) |
| Serialization | [Serialization](./atlas/serialization.md) |
| Pagination | [Pagination](./atlas/pagination.md) |
| Migrations & Seeding | [Migrations & Seeding](./atlas/migrations-seeding.md) |

## Features Overview

- **Multi-driver Support**: Full support for PostgreSQL, MySQL, SQLite, MongoDB, and Redis.
  - **SQL Databases** (PostgreSQL, MySQL, SQLite): Full ORM support including Models, Relationships, Migrations, and all Query Builder features.
  - **MongoDB**: Query Builder support with document-based operations. Limited ORM features (Models and Relationships may have restrictions).
  - **Redis**: Key-value operations via Query Builder. Primarily designed for caching and simple data storage.
- **Fluent Queries**: Laravel-like API for building complex `where`, `join`, and JSON queries.
- **Connection Management**: Easily switch and manage multiple database connections.
- **Eloquent-style Models**: Define Model classes and use relationships (HasMany, BelongsTo, etc.) - **Full support for SQL databases only**.
- **Maintenance Tools**: Built-in Migrations, Factories, and Seeders - **SQL databases only**.
- **Performance Optimized (v2.0)**: ↑300-500% faster model hydration, ↑50-100% faster query compilation.
- **Enhanced DX (v2.0)**: Better error messages, debug tools, environment variable support.

## Installation

```bash
bun add @gravito/atlas
```

## Quick Start

See [Getting Started](./atlas/getting-started.md) for full examples.

**Option 1: Programmatic Configuration**
```ts
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
```ts
import { DB } from '@gravito/atlas'

// Using DATABASE_URL
// DATABASE_URL=postgres://user:password@localhost:5432/myapp
DB.configureFromEnv()

// Or using individual variables
// DB_DRIVER=postgres
// DB_HOST=localhost
// DB_DATABASE=myapp
DB.configureFromEnv()
```

**Option 3: Configuration File (New in v2.0)**
```ts
// config/database.ts
import { defineConfig } from '@gravito/atlas'

export default defineConfig({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      // ...
    }
  }
})

// Then in your app
import { DB } from '@gravito/atlas'
await DB.configureFromFile()
```

**Using the Database**
```ts
// Access in application
const users = await DB.table('users').get()
```

## Usage Guides

- [ORM Usage Guide (English)](../guide/orm-usage.md)
- [ORM 使用指南（繁體中文）](../../../zh-TW/guide/orm-usage.md)

