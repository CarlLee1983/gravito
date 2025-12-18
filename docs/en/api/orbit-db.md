---
title: Orbit DB
---

# Orbit DB

> Database integration as a Gravito Orbit with **full PostgreSQL support and performance optimizations**.

Package: `@gravito/orbit-db`

This Orbit integrates **Drizzle ORM**, providing standardized database connection, request-context injection, transactions, query helpers, health checks, migrations/seeding, and hooks.

## Reading Guide

This page is an overview. Detailed docs are grouped by topic:

| Topic | Page |
|------|------|
| Getting started | [Getting Started](./orbit-db/getting-started.md) |
| DBService (query helpers) | [DBService](./orbit-db/dbservice.md) |
| Models (Eloquent-like API) | [Models](./orbit-db/models.md) |
| Relations | [Relations](./orbit-db/relations.md) |
| Migrations & seeding | [Migrations & Seeding](./orbit-db/migrations-seeding.md) |

## What You Get

- A `DBService` injected into the Hono `Context`
- `db.raw` access to the underlying Drizzle instance
- Transactions, CRUD helpers, pagination, bulk operations, aggregates
- Relation queries backed by Drizzle `db.raw.query.*`
- Optional query logging + hooks (`db:query`, `db:transaction:*`, `db:migrate:*`, etc.)

## Installation

```bash
bun add @gravito/orbit-db drizzle-orm
```

## Quick Start

See [Getting Started](./orbit-db/getting-started.md) for full examples (PostgreSQL/SQLite, injection, config).

```ts
import { PlanetCore } from 'gravito-core'
import orbitDB from '@gravito/orbit-db'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const core = new PlanetCore()
const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

orbitDB(core, { db, databaseType: 'postgresql', exposeAs: 'db' })

core.app.get('/users/:id', async (c) => {
  const db = c.get('db')
  const user = await db.findById({ _: { name: 'users' } }, c.req.param('id'))
  return c.json({ user })
})
```

## ORM Guide

- [ORM Usage Guide (English)](../guide/orm-usage.md)
- [ORM Usage Guide (zh-TW)](../../zh-TW/guide/orm-usage.md)
