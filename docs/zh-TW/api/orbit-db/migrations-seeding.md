---
title: 遷移與 Seed
---

# 遷移與 Seed

> 提供遷移、Seed 與部署輔助方法。

## 遷移

```ts
const result = await db.migrate()
if (!result.success) throw new Error(result.error)
```

```ts
await db.migrateTo('2024_01_01_000001_init')
```

## Seed

```ts
await db.seed(async (raw) => {
  // Seed 時建議直接使用 raw Drizzle 實例。
}, 'users')
```

```ts
await db.seedMany([
  { name: 'users', seed: usersSeed },
  { name: 'posts', seed: postsSeed },
])
```

## 部署輔助

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
