---
title: Orbit Cache
---

# Orbit Cache

> 以 Gravito Orbit 形式提供快取功能。

套件：`@gravito/orbit-cache`

提供簡單的快取抽象層，內建記憶體 (LRU-like) 提供者。

## 安裝

```bash
bun add @gravito/orbit-cache
```

## 用法

```typescript
import { PlanetCore } from 'gravito-core';
import orbitCache from '@gravito/orbit-cache';

const core = new PlanetCore();

// 初始化 Cache Orbit
const cache = orbitCache(core, {
  defaultTTL: 60, // 預設 TTL (秒)
  exposeAs: 'cache' // 可透過 c.get('cache') 存取
});

// 在路由中使用
core.app.get('/heavy-data', async (c) => {
  const data = await cache.remember('heavy_key', 300, async () => {
    // 耗時運算...
    return { result: 42 };
  });

  return c.json(data);
});
```

## Hooks

- `cache:init` - 當快取 Orbit 初始化時觸發。
- `cache:hit` - 當快取命中時觸發。
- `cache:miss` - 當快取未命中時觸發。
