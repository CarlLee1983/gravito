---
title: Stasis Cache
description: Gravito caching system (Cache Manager / Stores / Tags / Locks).
---

# Stasis Cache

Stasis (`@gravito/stasis`) is a Laravel-like caching layer with multiple stores, tags, and locks.

## Highlights

- Multiple stores (memory / file / null / custom)
- Common APIs: `get/put/add/remember/forever`
- Tags (memory store) and Locks
- Hooks: `cache:hit` / `cache:miss` / `cache:write`, etc.

## Installation

```bash
bun add @gravito/stasis
```

## Basic Setup

```ts
import { PlanetCore } from '@gravito/core'
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

## Redis with Plasma

```ts
import { OrbitPlasma } from '@gravito/plasma'

const core = new PlanetCore()

new OrbitPlasma({
  connections: {
    default: {
      host: '127.0.0.1',
      port: 6379,
      password: process.env.REDIS_PASSWORD,
      tls: true,
    },
  },
}).install(core)
```

Then use Redis store in Stasis:

```ts
orbitCache(core, {
  default: 'redis',
  stores: {
    redis: { driver: 'redis', connection: 'default' },
  },
})
```

## Usage Example

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

## Next Steps

- Queues & background jobs: [Queues](./queues.md)
