---
title: Migrations & Seeding
---

# Migrations & Seeding

> Operational helpers for migrations, seeding, and deployment.

## Migrations

```ts
const result = await db.migrate()
if (!result.success) throw new Error(result.error)
```

```ts
await db.migrateTo('2024_01_01_000001_init')
```

## Seeding

```ts
await db.seed(async (raw) => {
  // Use the raw Drizzle instance for seeding.
}, 'users')
```

```ts
await db.seedMany([
  { name: 'users', seed: usersSeed },
  { name: 'posts', seed: postsSeed },
])
```

## Deployment Helper

```ts
const result = await db.deploy({
  runMigrations: true,
  runSeeds: false,
  skipHealthCheck: false,
  validateBeforeDeploy: true,
})
```

## Hooks

- `db:migrate:start | complete | error`
- `db:seed:start | complete | error`
- `db:deploy:start | complete | error`
