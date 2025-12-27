---
title: Stasis Cache
description: Gravito 的快取系統（Cache Manager / Stores / Tags / Locks）。
---

# Stasis Cache

Stasis（`@gravito/stasis`）提供類 Laravel 的快取層，支援多種 store、tags 與 locks。

## 特色

- 多種 Store（memory / file / null / custom）
- 常用 API：`get/put/add/remember/forever`
- Tags（memory store）與 Locks
- Hooks：`cache:hit` / `cache:miss` / `cache:write` 等

## 安裝

```bash
bun add @gravito/stasis
```

## 基本設定

```ts
import { PlanetCore } from 'gravito-core'
import orbitCache from '@gravito/stasis'

const core = new PlanetCore()

const cache = orbitCache(core, {
  exposeAs: 'cache',
  default: 'memory',
  prefix: 'app_cache:',
  defaultTtl: 60,
  eventsMode: 'async',
  stores: {
    memory: { driver: 'memory', maxItems: 10_000 },
    file: { driver: 'file', directory: './tmp/cache' },
    redis: { driver: 'redis', connection: 'default' },
    null: { driver: 'null' },
  },
})
```

## Redis 搭配（Plasma）

若要使用 Redis 作為快取 store，請搭配 `@gravito/plasma` 建立連線：

```ts
import { OrbitRedis } from '@gravito/plasma'

const core = new PlanetCore()

new OrbitRedis({
  connections: {
    default: {
      host: '127.0.0.1',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      tls: { enabled: true },
    },
  },
}).install(core)
```

叢集範例（Cluster）：

```ts
new OrbitRedis({
  connections: {
    cluster: {
      driver: 'cluster',
      nodes: [
        { host: '10.0.0.1', port: 6379 },
        { host: '10.0.0.2', port: 6379 },
      ],
      password: process.env.REDIS_PASSWORD,
    },
  },
}).install(core)
```

之後在 Stasis 設定中使用 `redis` store：

```ts
orbitCache(core, {
  default: 'redis',
  stores: {
    redis: { driver: 'redis', connection: 'default' },
  },
})
```

## 使用範例

```ts
app.get('/heavy-data', async (c) => {
  const cache = c.get('cache')
  const data = await cache.remember('heavy_key', 300, async () => {
    return { result: 42 }
  })
  return c.json(data)
})
```

## Tags

```ts
const cache = c.get('cache')
await cache.tags(['users']).set('user:1', { id: 1 }, 60)
await cache.tags(['users']).clear()
```

## Locks

```ts
const cache = c.get('cache')
await cache.lock('jobs:rebuild', 10).block(5, async () => {
  // exclusive section
})
```

## Hooks

- `cache:miss`
- `cache:hit`
- `cache:write`
- `cache:forget`
- `cache:flush`
- `cache:init`

## 下一步

- 佇列與背景任務：[佇列](./queues.md)
