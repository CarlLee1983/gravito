---
title: Nebula Storage
description: Gravito 的檔案儲存 Orbit（本地儲存與自訂 Provider）。
---

# Nebula Storage

Nebula（`@gravito/nebula`）提供 Gravito 的儲存抽象層，預設內建本地儲存，並可透過自訂 Provider 擴充。

## 特色

- 統一的 `put/get/delete/getUrl` API
- 內建 LocalStorageProvider
- 可自訂 StorageProvider
- 提供 hooks：`storage:init` / `storage:upload` / `storage:uploaded`

## 安裝

```bash
bun add @gravito/nebula
```

## 基本設定（本地儲存）

```ts
import { PlanetCore } from '@gravito/core'
import { OrbitStorage } from '@gravito/nebula'

const core = await PlanetCore.boot({
  orbits: [
    new OrbitStorage({
      local: { root: './uploads', baseUrl: '/uploads' },
      exposeAs: 'storage',
    }),
  ],
})
```

## 使用方式

```ts
app.post('/upload', async (c) => {
  const storage = c.get('storage')
  const body = await c.req.parseBody()
  const file = body['file']

  if (file instanceof File) {
    await storage.put(file.name, file)
    return c.json({ url: storage.getUrl(file.name) })
  }

  return c.json({ error: 'No file uploaded' }, 400)
})
```

## 自訂 Provider

```ts
import { OrbitStorage, type StorageProvider } from '@gravito/nebula'

class MyStorageProvider implements StorageProvider {
  async put(key: string, data: Blob | Buffer | string) {}
  async get(key: string) {
    return null
  }
  async delete(key: string) {}
  getUrl(key: string) {
    return `https://cdn.example.com/${key}`
  }
}

new OrbitStorage({
  provider: new MyStorageProvider(),
  exposeAs: 'storage',
})
```

## Hooks

- `storage:init`：初始化完成時觸發
- `storage:upload`：寫入前的 filter，可修改 data
- `storage:uploaded`：成功寫入後觸發

## 下一步

- 影像處理整合：[Forge 媒體處理](./forge-media.md)
- 生成靜態資源：[靜態網站開發](./static-site-development.md)
