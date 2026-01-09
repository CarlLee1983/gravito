# @gravito/nebula

> Gravito 的標準儲存 Orbit，提供檔案儲存抽象層。

## 安裝

```bash
bun add @gravito/nebula
```

## 快速開始

```typescript
import { PlanetCore } from '@gravito/core'
import orbitStorage from '@gravito/nebula'

const core = new PlanetCore()

const storage = orbitStorage(core, {
  local: {
    root: './uploads',
    baseUrl: '/uploads'
  },
  exposeAs: 'storage'
})

core.app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (file instanceof File) {
    await storage.put(file.name, file)
    return c.json({ url: storage.getUrl(file.name) })
  }
  return c.text('No file uploaded', 400)
})
```
