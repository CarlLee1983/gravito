---
title: Cache
---

# Cache

> Caching utilities as a Gravito Orbit.

Package: `@gravito/stasis`

Provides a unified caching interface with a built-in Memory (LRU-like) provider, extensible for Redis.

## Installation

```bash
bun add @gravito/stasis
```

## Usage

```typescript
import { PlanetCore } from '@gravito/core';
import orbitCache from '@gravito/stasis';

const core = new PlanetCore();

// Initialize Cache Gravito (Memory)
const cache = orbitCache(core, {
  defaultTTL: 60, // seconds
  exposeAs: 'cache' 
});

// Use in routes
core.app.get('/heavy-data', async (c) => {
  const data = await cache.remember('heavy_key', 300, async () => {
    // Expensive computation...
    return { result: 42 };
  });
  
  return c.json(data);
});
```

## Hooks

- `cache:init` - Fired when the Stasis module initializes.
- `cache:miss` - Fired when data is not found in cache.
- `cache:hit` - Fired when data is retrieved from cache.

## Rate Limiting

Cache provides a Rate Limiter driver that utilizes your cache store to count and limit actions.

```typescript
import { CacheManager } from '@gravito/stasis';

core.app.post('/send-email', async (c) => {
  const cache = c.get('cache') as CacheManager
  const limiter = cache.limiter()

  // Key, Max Attempts, Decay Seconds
  const result = await limiter.attempt('send-email:123', 5, 60)

  if (!result.allowed) {
    const seconds = result.reset - Math.floor(Date.now() / 1000)
    return c.text(`Too many attempts. Retry in ${seconds} seconds.`, 429)
  }

  // Action allowed...
  return c.text('OK')
})
```
