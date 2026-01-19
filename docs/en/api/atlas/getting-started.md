---
title: Getting Started
---

# Getting Started

> Atlas is a database toolkit for Gravito that provides a Laravel-style Query Builder and ORM.

## Installation

```bash
bun add @gravito/atlas
```

## Basic Configuration

You should configure Atlas during your application's bootstrap phase (e.g., `bootstrap.ts`). Atlas v2.0 supports multiple configuration methods:

### Option 1: Programmatic Configuration

```ts
import { DB } from '@gravito/atlas'

DB.configure({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: 'localhost',
      database: 'gravito',
      username: 'user',
      password: 'password'
    },
    sqlite: {
      driver: 'sqlite',
      database: 'database.sqlite'
    }
  }
})
```

### Option 2: Environment Variables (New in v2.0)

```ts
import { DB } from '@gravito/atlas'

// Using DATABASE_URL
// DATABASE_URL=postgres://user:password@localhost:5432/gravito
DB.configureFromEnv()

// Or using individual variables
// DB_DRIVER=postgres
// DB_HOST=localhost
// DB_DATABASE=gravito
// DB_USERNAME=user
// DB_PASSWORD=password
DB.configureFromEnv()
```

### Option 3: Configuration File (New in v2.0)

```ts
// config/database.ts
import { defineConfig } from '@gravito/atlas'

export default defineConfig({
  default: 'postgres',
  connections: {
    postgres: {
      driver: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_DATABASE || 'gravito',
      username: process.env.DB_USERNAME || 'user',
      password: process.env.DB_PASSWORD || 'password'
    }
  }
})

// Then in your bootstrap.ts
import { DB } from '@gravito/atlas'
await DB.configureFromFile()
```

## Basic Usage

You can use the `DB` facade to start building queries from any table.

```ts
// Fetching all records
const users = await DB.table('users').get()

// Fetching a single record
const user = await DB.table('users').where('id', 1).first()

// Advanced query
const activeAdmins = await DB.table('users')
  .where('active', true)
  .where('role', 'admin')
  .orderBy('created_at', 'desc')
  .get()
```

## Multi-Database Support

If you have configured multiple connections, you can switch between them using `DB.connection()`.

```ts
// Use the 'sqlite' connection
const logs = await DB.connection('sqlite').table('logs').get()
```

## Using in Routes

Since `DB` is a static facade, you don't need to inject it into the context to use it, though you can still do so if preferred.

```ts
core.app.get('/users', async (c) => {
  const users = await DB.table('users').get()
  return c.json({ users })
})
```

## What's New in v2.0

Atlas v2.0 includes significant performance improvements and developer experience enhancements:

- **Performance Optimizations**: ↑300-500% faster model hydration, ↑50-100% faster query compilation
- **Better Error Messages**: "Did you mean?" suggestions for typos
- **Debug Tools**: `DB.debug()`, `DB.getQueryLog()`, `DB.getLastQuery()`
- **Environment Variable Support**: Configure via `DATABASE_URL` or individual `DB_*` variables
- **Configuration File Support**: Use `defineConfig()` and `DB.configureFromFile()`
- **Query Caching**: LRU cache for compiled SQL queries (80%+ hit rate)

See the [upgrade guide](../../../../packages/atlas/IMPLEMENTATION_PLAN/10-upgrade-guide.md) for migration details.

## Next Steps

- Explore the [Query Builder](./query-builder.md) for more complex query features.
- Learn about [Models](./models.md) for an Active Record experience.
- Set up [Migrations & Seeding](./migrations-seeding.md) for database maintenance.

