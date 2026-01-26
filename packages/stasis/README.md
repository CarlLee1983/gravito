# @gravito/stasis 🧊

> High-performance caching and rate-limiting Orbit for Gravito.

`@gravito/stasis` provides a robust, developer-friendly caching layer for the Gravito framework. Inspired by Laravel's cache system, it offers a unified API for multiple storage backends, distributed locking, and integrated rate limiting.

## 🌟 Key Features

- **🚀 Unified Cache API**: Simple `get`, `put`, `remember`, and `forever` methods across all drivers.
- **💾 Multiple Storage Drivers**: Native support for Memory, Redis, File-based, and Null storage.
- **🔒 Distributed Locks**: Prevent race conditions with atomic, cross-process locks.
- **⚡ Flexible Caching (SWR)**: Stale-While-Revalidate support to serve data fast while refreshing in the background.
- **🚦 Integrated Rate Limiting**: Throttling mechanism built directly on top of your cache infrastructure.
- **🏷️ Cache Tagging**: Group related items for bulk invalidation (supported in Memory driver).
- **🪝 Hook System**: Lifecycle events for monitoring cache hits, misses, and writes.

## 📦 Installation

```bash
bun add @gravito/stasis
```

## 🚀 Quick Start

### 1. Register the Orbit

```typescript
import { PlanetCore, defineConfig } from '@gravito/core'
import { OrbitStasis } from '@gravito/stasis'

const config = defineConfig({
  config: {
    cache: {
      default: 'memory',
      stores: {
        memory: { driver: 'memory', maxItems: 5000 },
        redis: { driver: 'redis', connection: 'default' }
      }
    }
  },
  orbits: [new OrbitStasis()]
})

const core = await PlanetCore.boot(config)
```

### 2. Basic Caching

```typescript
const cache = core.container.make('cache')

// Simple storage
await cache.put('stats:total', 100, 3600) // Store for 1 hour

// "Remember" pattern (Get or Set)
const users = await cache.remember('users:all', 300, async () => {
  return await db.users.findMany()
})
```

### 3. Distributed Locking

```typescript
const lock = cache.lock('process-invoice:123', 10)

if (await lock.get()) {
  try {
    // Perform critical task...
  } finally {
    await lock.release()
  }
}
```

## 🚦 Rate Limiting

Easily throttle requests or actions using your cache backend.

```typescript
const limiter = cache.limiter()

if (await limiter.tooManyAttempts('login:127.0.0.1', 5)) {
  const seconds = await limiter.availableIn('login:127.0.0.1')
  throw new Error(`Too many attempts. Try again in ${seconds}s.`)
}

await limiter.hit('login:127.0.0.1', 60) // Decay in 60s
```

## 🛠️ Supported Drivers

| Driver | Best For | Features |
|---|---|---|
| **Memory** | Local dev & Small apps | Fast, Tags, LRU |
| **Redis** | Distributed production | Multi-node, Locks, Persistent |
| **File** | Simple persistence | No external deps |
| **Null** | Testing / Disabling cache | No-op |

## 🧩 API Reference

### `CacheManager`
- `cache.get(key, default?)`: Retrieve an item.
- `cache.put(key, value, ttl?)`: Store an item.
- `cache.remember(key, ttl, callback)`: Get or execute callback and store.
- `cache.flexible(key, ttl, stale, callback)`: Stale-While-Revalidate.
- `cache.increment / decrement`: Atomic numeric updates.
- `cache.tags(['tag1']).flush()`: Invalidate by tag.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT © Carl Lee
