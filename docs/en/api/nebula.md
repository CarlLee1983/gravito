---
title: Nebula
---

# Nebula

> File storage abstraction as a Gravito Orbit.

Package: `@gravito/nebula`

Provides an abstraction layer for file storage, with a built-in Local Disk provider.

## Installation

```bash
bun add @gravito/nebula
```

## Usage

```typescript
import { PlanetCore } from '@gravito/core';
import { OrbitStorage } from '@gravito/nebula';

const core = await PlanetCore.boot({
  config: {
    storage: {
      exposeAs: 'storage',
      local: {
        root: './uploads',
        baseUrl: '/uploads',
      },
    },
  },
  orbits: [OrbitStorage],
})

// Use in routes
core.app.post('/upload', async (c) => {
  const storage = c.get('storage')
  const body = await c.req.parseBody();
  const file = body['file'];
  
  if (file instanceof File) {
    await storage.put(file.name, file);
    
    return c.json({ url: storage.getUrl(file.name) });
  }
  return c.text('No file uploaded', 400);
});
```

## Hooks

- `storage:init` - Fired when initialized.
- `storage:upload` - (Filter) Modify data before upload.
- `storage:uploaded` - (Action) Triggered after successful upload.
