# Distributed Caching & Shared State

In a **Galaxy Architecture**, multiple Satellite instances must act as one. `@gravito/plasma` provides the "Instant Memory" needed for this coordination.

## 1. Global Cache Sharing

Instead of each Satellite having its own local memory cache, use a shared Plasma connection.

```typescript
// All instances of the 'Product' Satellite will see the same data
const redis = c.get('redis')
await redis.set('active_promos', JSON.stringify(promos), { ex: 3600 })
```

## 2. Distributed Locking (Synchronization)

When multiple Satellites attempt to modify the same resource simultaneously (e.g., updating a balance), use a lock.

```typescript
import { createLock } from '@gravito/plasma'

const lock = await createLock(redis, 'balance_update_user_123', 5000)
if (lock) {
  try {
    // Critical Section
  } finally {
    await lock.release()
  }
}
```

## 3. Rate Limiting across the Galaxy

Protect your system from global traffic spikes by centralizing rate limit counters.

```typescript
const count = await redis.incr(`rate_limit:${ip}`)
if (count === 1) {
  await redis.expire(`rate_limit:${ip}`, 60)
}

if (count > 100) return c.text('Too many requests', 429)
```

## 4. Event Streams (The Energy Flow)

Plasma supports **Redis Streams**, which are ideal for high-throughput messaging where multiple Satellites need to "tap in" to the data flow.

```typescript
// Producer (Satellite: Telemetry)
await redis.xadd('sensor_flow', { sensor: 'temp', val: '25' })

// Consumer (Satellite: Analytics)
const entries = await redis.xreadgroup('analytics_group', 'worker_1', { sensor_flow: '>' })
```

## 5. Multi-Node Session Store

When using `Sentinel` with `SessionGuard`, configure it to use Plasma as the backend. This allows a user to stay logged in even if their request is routed to a different Satellite instance.

```typescript
new SessionGuard(new RedisSessionStorage(redis))
```

## 6. Performance: Pipeline & Lua

For complex operations, use **Pipelining** to reduce the number of network round-trips.

```typescript
const results = await redis.pipeline()
  .get('foo')
  .set('bar', 'baz')
  .incr('counter')
  .exec()
```
