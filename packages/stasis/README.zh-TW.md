# @gravito/stasis

> Gravito 的快取 Orbit，提供類 Laravel 的 Cache API。

## 安裝

```bash
bun add @gravito/stasis
```

## 快速開始

```typescript
import { PlanetCore } from '@gravito/core'
import orbitCache from '@gravito/stasis'

const core = new PlanetCore()

const cache = orbitCache(core, {
  exposeAs: 'cache',
  default: 'memory',
  prefix: 'app_cache:',
  defaultTtl: 60,
  stores: {
    memory: { driver: 'memory', maxItems: 10_000 },
    file: { driver: 'file', directory: './tmp/cache' },
    null: { driver: 'null' },
  },
})

core.app.get('/heavy-data', async (c) => {
  const data = await cache.remember('heavy_key', 300, async () => {
    return { result: 42 }
  })

  return c.json(data)
})
```
