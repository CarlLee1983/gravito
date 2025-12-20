---
title: Orbit Storage
---

# Orbit Storage

> 以 Gravito Orbit 形式提供檔案儲存抽象層。

套件：`@gravito/orbit-storage`

提供檔案儲存的抽象層，內建本地磁碟提供者 (Local Disk Provider)。

## 安裝

```bash
bun add @gravito/orbit-storage
```

## 用法

```typescript
import { PlanetCore } from 'gravito-core';
import { OrbitStorage } from '@gravito/orbit-storage';

const core = await PlanetCore.boot({
  config: {
    storage: {
      exposeAs: 'storage',
      local: {
        root: './uploads',
        baseUrl: '/uploads',
      },
    }
  },
  orbits: [OrbitStorage]
});

// 在路由中使用
core.app.post('/upload', async (c) => {
  const storage = c.get('storage');
  const body = await c.req.parseBody();
  const file = body['file'];

  if (file instanceof File) {
    // 上傳檔案
    await storage.put(file.name, file);

    // 取得 URL
    return c.json({ url: storage.getUrl(file.name) });
  }
  return c.text('未上傳檔案', 400);
});
```

## Hooks

- `storage:init` - 當模組初始化時觸發。
- `storage:upload` - (Filter) 上傳前修改資料。
- `storage:uploaded` - (Action) 上傳成功後觸發。
