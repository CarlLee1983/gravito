---
title: Plasma Redis
description: Gravito's Redis client and Orbit with a Laravel-style API and multi-connection support.
---

# Plasma Redis

Plasma (`@gravito/plasma`) is Gravito's Redis client. It provides a simple Facade API, multi-connection management, and an Orbit integration for `PlanetCore`.

## Features

- Laravel-style `Redis` Facade
- Multi-connection management via `Redis.connection()`
- OrbitPlasma injects a `redis` service
- TLS, key prefix, and retry options

## Install

```bash
bun add @gravito/plasma ioredis
```

## Basic Setup (Facade)

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

## Multiple Connections

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

## Common Redis Operations

```ts
const redis = Redis.connection()

// Strings
await redis.set('status', 'ok', { ex: 60 })
const status = await redis.get('status')

// Hashes
await redis.hset('user:1', { name: 'Nova', role: 'admin' })
const user = await redis.hgetall('user:1')

// Lists
await redis.lpush('jobs', 'job:1', 'job:2')
const jobs = await redis.lrange('jobs', 0, -1)

// Sets
await redis.sadd('tags', 'gravito', 'plasma')
const tags = await redis.smembers('tags')

// Sorted sets
await redis.zadd('leaderboard', { score: 120, member: 'user:1' })
const top = await redis.zrevrange('leaderboard', 0, 10)

// TTL
await redis.expire('status', 120)
const ttl = await redis.ttl('status')
```

## Pipeline (Batch Commands)

```ts
const pipeline = redis.pipeline()
pipeline.set('a', '1').incr('counter').hset('user:1', 'name', 'Nova')
const results = await pipeline.exec()
```

## Redis Lock (Simple Distributed Lock)

Plasma can use Redis `SET NX PX` to create a simple lock:

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

## Orbit Integration

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

Use in a route:

```ts
app.get('/health/redis', async (c) => {
  const redis = c.get('redis')
  const pong = await redis?.ping()
  return c.json({ status: pong })
})
```

## Connection Options

- `host` / `port`
- `password`
- `db`
- `connectTimeout` / `commandTimeout`
- `tls`
- `keyPrefix`
- `maxRetries` / `retryDelay`

## Full Configuration Example

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

## Environment-Based Setup (Example)

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

## Integrations

- Cache layer: `@gravito/stasis` can use a `redis` store

## Notes

- Plasma depends on `ioredis`; make sure it is installed.
- For Redis Cluster / Sentinel, create your own client and integrate at the store or app layer.
