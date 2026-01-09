---
title: Nebula Storage
description: Gravito's storage orbit (local storage and custom providers).
---

# Nebula Storage

Nebula (`@gravito/nebula`) provides a storage abstraction with a local provider by default and custom providers for expansion.

## Highlights

- Unified `put/get/delete/getUrl` API
- Built-in LocalStorageProvider
- Custom StorageProvider support
- Hooks: `storage:init` / `storage:upload` / `storage:uploaded`

## Installation

```bash
bun add @gravito/nebula
```

## Local Storage Setup

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

## Usage

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

## Custom Providers

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

- `storage:init`: after initialization
- `storage:upload`: filter before write
- `storage:uploaded`: after successful write

## Next Steps

- Media pipeline: [Forge Media](./forge-media.md)
- Static assets: [Static Site Development](./static-site-development.md)
