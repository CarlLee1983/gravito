# @gravito/orbit-cache

> Gravito Galaxy 架構的標準快取軌道。

提供簡單的快取抽象層，內建記憶體 (LRU-like) 提供者。

## 📦 安裝

```bash
bun add @gravito/orbit-cache
```

## 🚀 用法

```typescript
import { PlanetCore } from 'gravito-core';
import orbitCache from '@gravito/orbit-cache';

const core = new PlanetCore();

// 初始化 Cache Orbit
const cache = orbitCache(core, {
  ttl: 60, // 預設 TTL (秒)
  exposeAs: 'cache' // 可透過 c.get('cache') 存取
});

// 在路由中使用
core.app.get('/cached-data', async (c) => {
  const cache = c.get('cache');
  
  // 嘗試從快取獲取
  const cached = await cache.get('my-key');
  if (cached) return c.json(cached);

  // 若無，則計算並儲存
  const data = { value: Math.random() };
  await cache.set('my-key', data);
  
  return c.json(data);
});
```

## 🪝 Hooks

- `cache:init` - 當模組初始化時觸發。
- `cache:hit` - (Action) 當快取命中時觸發。
- `cache:miss` - (Action) 當快取未命中時觸發。
 retrieved from cache.
