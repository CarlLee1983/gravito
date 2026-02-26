# Hybrid Caching Strategy Guide

In a **Galaxy Architecture**, performance is achieved by minimizing data movement. `@gravito/stasis` provides a tiered caching system that balances speed and consistency.

## 1. The Tiered Caching Concept

Hybrid caching combines multiple storage layers:

- **L1 (Local Memory)**: Fastest access, but data is private to the node and disappears on restart.
- **L2 (Distributed Redis)**: Shared across all Satellite instances, survives restarts, slightly slower than L1.

```typescript
const cache = core.container.make('cache');

// Automated tiered management
const user = await cache.remember('user:123', 3600, () => {
  return await db.users.find(123);
});
```

## 2. Predictive State Warming

Using Markov Chains, Stasis can predict which keys will be accessed next and pre-fetch them into L1 memory.

```typescript
// Enable prediction in config
cache: {
  prediction: {
    enabled: true,
    historySize: 1000
  }
}
```

## 3. Distributed Locks (Stasis Integration)

Use the cache infrastructure to coordinate atomic operations across the Galaxy.

```typescript
const lock = await cache.lock('inventory:sync', 10); // 10s TTL

if (lock) {
  try {
    await performSync();
  } finally {
    await lock.release();
  }
}
```

## 4. Cache Observability

Monitor cache health to prevent OOM (Out of Memory) errors.

```typescript
const stats = cache.getStats();
console.log(`L1 Hit Rate: ${stats.l1.hitRate}%`);
console.log(`L2 Latency: ${stats.l2.avgLatency}ms`);
```

## 5. Security: Serialization Safety

Always ensure your cached data is properly serialized. Stasis uses high-performance binary serialization for L2 storage by default to reduce payload size.
