---
title: DBService
---

# DBService

> A request-scoped database service injected into Hono `Context`.

## Access

```ts
core.app.get('/example', async (c) => {
  const db = c.get('db') // DBService
  return c.json({ ok: true, hasRaw: !!db.raw })
})
```

## Transactions

```ts
await db.transaction(async (tx) => {
  // Use `tx` with Drizzle if your driver supports it.
})
```

## Query Helpers

- `findById(table, id)`
- `findOne(table, where)`
- `findAll(table, where?, options?)`
- `paginate(table, { page, limit, orderBy?, orderDirection? })`
- `count(table, where?)`
- `exists(table, where)`

## CRUD and Bulk Operations

- `create(table, data)`
- `insert(table, data | data[])`
- `update(table, where, data)`
- `delete(table, where)`
- `bulkInsert(table, data[])`
- `bulkUpdate(table, [{ where, data }])`
- `bulkDelete(table, where[])`

## Relations

Orbit DB provides relation helpers that rely on Drizzle `db.raw.query.*`:

- `findByIdWith(tableName, id, relations)`
- `findOneWith(tableName, where, relations)`
- `findAllWith(tableName, relations, options?)`

See [Relations](./relations.md) for how to define Drizzle relations.

## Operational APIs

- Health: `healthCheck()`
- Migrations: `migrate()`, `migrateTo(target?)`
- Seeding: `seed(fn, name?)`, `seedMany([{ name, seed }])`
- Deployment: `deploy(options?)`

## Hooks

- `db:transaction:start | commit | rollback | error`
- `db:health-check`
- `db:migrate:start | complete | error`
- `db:seed:start | complete | error`
- `db:deploy:start | complete | error`
- `db:query` (when query logging is enabled)
