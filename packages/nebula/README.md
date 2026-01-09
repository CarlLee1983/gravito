# @gravito/nebula

> The Standard Storage Orbit for Galaxy Architecture.

Provides an abstraction layer for file storage, with a built-in Local Disk provider.

## 📦 Installation

```bash
bun add @gravito/nebula
```

## 🚀 Usage

```typescript
import { PlanetCore } from '@gravito/core';
import orbitStorage from '@gravito/nebula';

const core = new PlanetCore();

// Initialize Storage Orbit (Local)
const storage = orbitStorage(core, {
  local: {
    root: './uploads',
    baseUrl: '/uploads'
  },
  exposeAs: 'storage' // Access via c.get('storage')
});

// Use in routes
core.app.post('/upload', async (c) => {
  const body = await c.req.parseBody();
  const file = body['file'];
  
  if (file instanceof File) {
    await storage.put(file.name, file);
    return c.json({ url: storage.getUrl(file.name) });
  }
  return c.text('No file uploaded', 400);
});
```

## 🪝 Hooks

- `storage:init` - Fired when initialized.
- `storage:upload` - (Filter) Modify data before upload.
- `storage:uploaded` - (Action) Triggered after successful upload.
