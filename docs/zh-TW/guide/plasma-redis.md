---
title: Plasma Redis
description: Gravito 的 Redis 用戶端與 Orbit，提供 Laravel 風格 API 與多連線管理。
---

# Plasma Redis

Plasma（`@gravito/plasma`）是 Gravito 的 Redis 用戶端，提供簡潔的 Facade API 與多連線管理，也能以 Orbit 方式注入到應用中。

## 特色

- Laravel 風格的 `Redis` Facade
- 多連線管理與 `Redis.connection()`
- OrbitPlasma 可直接注入 `redis` 服務
- 支援 TLS、key prefix 與重試設定

## 安裝

```bash
bun add @gravito/plasma ioredis
```

## 基本設定（Facade）

```ts
import { Redis } from '@gravito/plasma'

Redis.configure({
  default: 'main',
  connections: {
    main: { host: '127.0.0.1', port: 6379 },
  },
})

await Redis.connect()

await Redis.set('user:1', JSON.stringify({ id: 1, name: 'Nova' }), { ex: 3600 })
const payload = await Redis.get('user:1')

await Redis.disconnect()
```

## 多連線

```ts
Redis.configure({
  default: 'cache',
  connections: {
    cache: { host: '127.0.0.1', port: 6379, db: 0 },
    analytics: { host: '127.0.0.1', port: 6380, db: 1 },
  },
})

const cache = Redis.connection('cache')
const analytics = Redis.connection('analytics')

await cache.set('cache:ping', 'ok')
await analytics.incr('metrics:pageviews')
```

## 常用 Redis 操作

```ts
const redis = Redis.connection()

// 字串 (String)
await redis.set('status', 'ok', { ex: 60 })
const status = await redis.get('status')

// 哈希 (Hash)
await redis.hset('user:1', { name: 'Nova', role: 'admin' })
const user = await redis.hgetall('user:1')

// 列表 (List)
await redis.lpush('jobs', 'job:1', 'job:2')
const jobs = await redis.lrange('jobs', 0, -1)

// 集合 (Set)
await redis.sadd('tags', 'gravito', 'plasma')
const tags = await redis.smembers('tags')

// 有序集合 (Sorted Set)
await redis.zadd('leaderboard', { score: 120, member: 'user:1' })
const top = await redis.zrevrange('leaderboard', 0, 10)

// TTL 與過期控制
await redis.expire('status', 120)
const ttl = await redis.ttl('status')
```

## Pipeline（批次指令）

```ts
const pipeline = redis.pipeline()
pipeline.set('a', '1').incr('counter').hset('user:1', 'name', 'Nova')
const results = await pipeline.exec()
```

## Redis Lock（簡易分散式鎖）

Plasma 可利用 Redis `SET NX PX` 建立簡單鎖機制。以下為常見用法：

```ts
const redis = Redis.connection()
const lockKey = 'lock:billing:sync'
const lockTtl = 10_000
const lockToken = crypto.randomUUID()

const acquired = await redis.set(lockKey, lockToken, { nx: true, px: lockTtl })

if (!acquired) {
  throw new Error('Lock already held')
}

try {
  // Critical section
} finally {
  const current = await redis.get(lockKey)
  if (current === lockToken) {
    await redis.del(lockKey)
  }
}
```

## Pub/Sub

```ts
await redis.subscribe('events', (message) => {
  console.log('[event]', message)
})

await redis.publish('events', 'workflow:done')
```

## 以 Orbit 注入（應用內使用）

```ts
import { PlanetCore } from 'gravito-core'
import { OrbitPlasma } from '@gravito/plasma'

const core = await PlanetCore.boot({
  orbits: [
    new OrbitPlasma({
      autoConnect: true,
      exposeAs: 'redis',
      connections: {
        default: {
          host: '127.0.0.1',
          port: 6379,
          password: process.env.REDIS_PASSWORD,
          tls: true,
        },
      },
    }),
  ],
})
```

在路由中使用：

```ts
app.get('/health/redis', async (c) => {
  const redis = c.get('redis')
  const pong = await redis?.ping()
  return c.json({ status: pong })
})
```

## 連線參數

- `host` / `port`
- `password`
- `db`
- `connectTimeout` / `commandTimeout`
- `tls`
- `keyPrefix`
- `maxRetries` / `retryDelay`

## 完整設定範例

```ts
import { Redis } from '@gravito/plasma'

Redis.configure({
  default: 'primary',
  connections: {
    primary: {
      host: 'redis.internal',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      db: 0,
      keyPrefix: 'gravito:',
      connectTimeout: 10_000,
      commandTimeout: 5_000,
      maxRetries: 3,
      retryDelay: 500,
      tls: {
        rejectUnauthorized: false,
      },
    },
    cache: {
      host: 'redis-cache.internal',
      port: 6380,
      db: 1,
    },
  },
})
```

## 多環境設定（示意）

```ts
const redisHost = process.env.NODE_ENV === 'production' ? 'redis.prod' : '127.0.0.1'

Redis.configure({
  default: 'default',
  connections: {
    default: {
      host: redisHost,
      port: 6379,
      password: process.env.REDIS_PASSWORD,
    },
  },
})
```

## 與其他模組整合

- 快取系統：`@gravito/stasis` 可直接指定 `redis` store

## 注意事項

- Plasma 依賴 `ioredis`，請確認已安裝。
- 若需要 Redis Cluster / Sentinel 等進階架構，建議自行建立客製 Redis client 再對接你的 store 或應用層。
