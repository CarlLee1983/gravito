---
title: Stasis
---

# Stasis

> 以 Gravito Orbit 形式提供快取功能。

套件：`@gravito/stasis`

提供簡單的快取抽象層，內建記憶體 (LRU-like) 提供者。

## 安裝

```bash
bun add @gravito/stasis
```

## 用法

```typescript
import { PlanetCore } from '@gravito/core';
import orbitCache from '@gravito/stasis';

const core = new PlanetCore();

// 初始化 Cache 動力模組
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

- `cache:init` - 當 Stasis module 初始化時觸發。
- `cache:miss` - 當資料在快取中未找到時觸發。
- `cache:hit` - 當資料從快取中讀取時觸發。

## 流量限制 (Rate Limiting)

Cache 提供了一個 Rate Limiter 驅動器，利用您的快取儲存空間來計數並限制操作。

```typescript
import { CacheManager } from '@gravito/stasis';

core.app.post('/send-email', async (c) => {
  const cache = c.get('cache') as CacheManager
  const limiter = cache.limiter()

  // Key, 最大嘗試次數, 衰減秒數 (Decay Seconds)
  const result = await limiter.attempt('send-email:123', 5, 60)

  if (!result.allowed) {
    const seconds = result.reset - Math.floor(Date.now() / 1000)
    return c.text(`嘗試次數過多。請在 ${seconds} 秒後重試。`, 429)
  }

  // 允許操作...
  return c.text('OK')
})
```
