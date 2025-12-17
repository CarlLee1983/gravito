# @gravito/orbit-cache

> The Standard Cache Orbit for Galaxy Architecture.

Provides a Laravel-like cache layer with:

- `CacheManager` + `CacheRepository` API (`get/put/add/remember/forever/increment/decrement/pull`)
- Multiple stores (`memory`, `file`, `null`, `custom`)
- Tags (memory store) and Locks (`lock().block()`)
- Hook events (`cache:hit`, `cache:miss`, `cache:write`, `cache:forget`, `cache:flush`, `cache:init`)

## 📦 Installation

```bash
bun add @gravito/orbit-cache
```

## 🚀 Usage

```typescript
import { PlanetCore } from 'gravito-core';
import orbitCache from '@gravito/orbit-cache';

const core = new PlanetCore();

// Initialize Cache Orbit (Laravel-like config)
const cache = orbitCache(core, {
  exposeAs: 'cache',
  default: 'memory',
  prefix: 'app_cache:',
  defaultTtl: 60, // seconds
  stores: {
    memory: { driver: 'memory', maxItems: 10_000 },
    file: { driver: 'file', directory: './tmp/cache' },
    null: { driver: 'null' },
  },
});

// Use in routes
core.app.get('/heavy-data', async (c) => {
  // Either use the manager returned from orbitCache(...) or request-scoped access:
  // const cache = c.get('cache');

  const data = await cache.remember('heavy_key', 300, async () => {
    // Expensive computation...
    return { result: 42 };
  });
  
  return c.json(data);
});
```

### Tags (memory store)

```ts
const cache = c.get('cache');
await cache.tags(['users']).set('user:1', { id: 1 }, 60);
await cache.tags(['users']).clear(); // flush only tagged keys
```

### Locks

```ts
const cache = c.get('cache');
await cache.lock('jobs:rebuild', 10).block(5, async () => {
  // exclusive section
});
```

## 🪝 Hooks

- `cache:miss` - Fired when data is not found in cache.
- `cache:hit` - Fired when data is retrieved from cache.
- `cache:write` - Fired when writing cache.
- `cache:forget` - Fired when forgetting cache.
- `cache:flush` - Fired when flushing cache.
- `cache:init` - Fired when the orbit is installed.
