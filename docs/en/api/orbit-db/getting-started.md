---
title: Getting Started
---

# Getting Started

> Install Orbit DB, create a Drizzle instance, and inject `DBService` into the request context.

## Installation

```bash
bun add @gravito/orbit-db drizzle-orm
```

## PostgreSQL Example

```ts
import { PlanetCore } from 'gravito-core'
import orbitDB from '@gravito/orbit-db'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const core = new PlanetCore()
const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

orbitDB(core, {
  db,
  databaseType: 'postgresql',
  exposeAs: 'db',
  enableQueryLogging: false,
})
```

## SQLite Example

```ts
import { PlanetCore } from 'gravito-core'
import orbitDB from '@gravito/orbit-db'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'

const core = new PlanetCore()
const sqlite = new Database('sqlite.db')
const db = drizzle(sqlite)

orbitDB(core, { db, databaseType: 'sqlite', exposeAs: 'db' })
```

## Using `DBService` in Routes

```ts
core.app.get('/health/db', async (c) => {
  const db = c.get('db')
  const result = await db.healthCheck()
  return c.json(result)
})
```

## Options (`OrbitDBOptions`)

- `db`: Drizzle instance (required)
- `exposeAs`: context key (default: `db`)
- `databaseType`: `postgresql | sqlite | mysql | auto`
- `enableQueryLogging`: emits `db:query` via hooks
- `queryLogLevel`: `debug | info | warn | error`
- `enableHealthCheck`: enable/disable `DBService.healthCheck()`
- `healthCheckQuery`: custom query string for health checks

## Hooks

- `db:connected`
- `db:query` (when query logging is enabled)

> **Note**: `DBService` also emits lifecycle hooks for transactions, migrations, seeding, and deployment. See [DBService](./dbservice.md).
