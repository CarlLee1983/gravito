# @gravito/nebula

> The Standard Storage Orbit for Galaxy Architecture.

Provides a unified file storage abstraction layer with multi-disk support and pluggable backends.

## 📦 Installation

```bash
bun add @gravito/nebula
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { PlanetCore } from '@gravito/core'
import orbitStorage from '@gravito/nebula'

const core = new PlanetCore()

const storage = orbitStorage(core, {
  default: 'local',
  disks: {
    local: {
      driver: 'local',
      root: './uploads',
      baseUrl: '/uploads'
    }
  }
})

// Use in routes
core.app.post('/upload', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']
  
  if (file instanceof File) {
    const storage = c.get('storage')
    await storage.put(file.name, file)
    return c.json({ url: storage.getUrl(file.name) })
  }
  
  return c.text('No file uploaded', 400)
})
```

---

## 🔧 Multi-Disk Configuration

```typescript
const storage = orbitStorage(core, {
  default: 'local',
  disks: {
    // Local disk
    local: {
      driver: 'local',
      root: './uploads',
      baseUrl: '/uploads'
    },
    
    // Memory disk (for testing)
    temp: {
      driver: 'memory'
    },
    
    // Null disk (no-op)
    null: {
      driver: 'null'
    },
    
    // Custom disk (e.g., S3)
    s3: {
      driver: 'custom',
      store: new S3Store({
        bucket: 'my-bucket',
        region: 'us-east-1'
      })
    }
  }
})

// Use default disk
await storage.put('file.txt', 'content')

// Use specific disk
await storage.disk('s3').put('important.pdf', pdfData)
await storage.disk('temp').put('cache.json', jsonData)
```

---

## 📖 API Reference

### StorageManager

The main storage manager returned by `orbitStorage()` or `c.get('storage')`.

#### Methods

##### `disk(name?: string): StorageRepository`

Get a specific disk repository. If `name` is not provided, returns the default disk.

```typescript
const local = storage.disk('local')
const s3 = storage.disk('s3')
```

##### `put(key: string, data: Blob | Buffer | string): Promise<void>`

Store a file (using default disk).

```typescript
await storage.put('file.txt', 'Hello World')
await storage.put('image.png', imageBlob)
```

##### `get(key: string): Promise<Blob | null>`

Retrieve a file (using default disk).

```typescript
const data = await storage.get('file.txt')
if (data) {
  console.log(await data.text())
}
```

##### `delete(key: string): Promise<boolean>`

Delete a file (using default disk). Returns `true` if deleted, `false` if file didn't exist.

```typescript
const deleted = await storage.delete('old-file.txt')
```

##### `exists(key: string): Promise<boolean>` 🆕

Check if a file exists (using default disk).

```typescript
if (await storage.exists('config.json')) {
  // File exists
}
```

##### `copy(from: string, to: string): Promise<void>` 🆕

Copy a file (using default disk).

```typescript
await storage.copy('original.txt', 'backup.txt')
```

##### `move(from: string, to: string): Promise<void>` 🆕

Move/rename a file (using default disk).

```typescript
await storage.move('temp.txt', 'final.txt')
```

##### `getMetadata(key: string): Promise<StorageMetadata | null>` 🆕

Get file metadata (using default disk).

```typescript
const meta = await storage.getMetadata('file.pdf')
if (meta) {
  console.log(meta.size, meta.mimeType, meta.lastModified)
}
```

##### `getUrl(key: string): string`

Get the public URL for a file (using default disk).

```typescript
const url = storage.getUrl('avatar.jpg')
// "/uploads/avatar.jpg"
```

##### `getSignedUrl(key: string, expiresIn: number): Promise<string>` 🆕

Get a signed URL with expiration (if supported by the driver).

```typescript
// Generate a URL that expires in 1 hour
const signedUrl = await storage.disk('s3').getSignedUrl('private.pdf', 3600)
```

##### `list(prefix?: string): AsyncIterable<StorageItem>` 🆕

List files in a directory (if supported by the driver).

```typescript
for await (const item of storage.list('uploads/')) {
  console.log(item.key, item.size, item.lastModified)
}
```

---

## 🪝 Hooks

Nebula integrates with Gravito's hook system for extensibility.

| Hook | Type | Parameters | Description |
|------|------|------------|-------------|
| `storage:init` | Action | `{ manager: StorageManager }` | Fired when storage is initialized |
| `storage:upload` | Filter | `data: Blob/Buffer/string, { key: string }` | Modify data before upload |
| `storage:uploaded` | Action | `{ key: string }` | Triggered after successful upload |
| `storage:hit` | Action | `{ key: string }` | File retrieved successfully |
| `storage:miss` | Action | `{ key: string }` | File not found |
| `storage:deleted` | Action | `{ key: string }` | File deleted |
| `storage:copied` 🆕 | Action | `{ from: string, to: string }` | File copied |
| `storage:moved` 🆕 | Action | `{ from: string, to: string }` | File moved |

### Example: Auto-resize Images on Upload

```typescript
core.hooks.addFilter('storage:upload', async (data, context) => {
  if (context.key.endsWith('.jpg') || context.key.endsWith('.png')) {
    // Resize image using sharp, etc.
    return await resizeImage(data, { width: 1920 })
  }
  return data
})
```

### Example: Log All Uploads

```typescript
core.hooks.addAction('storage:uploaded', async (context) => {
  core.logger.info(`File uploaded: ${context.key}`)
})
```

---

## 🔌 Custom Storage Drivers

Implement the `StorageStore` interface to create custom drivers.

```typescript
import type { StorageStore, StorageMetadata } from '@gravito/nebula'

class S3Store implements StorageStore {
  async put(key: string, data: Blob | Buffer | string): Promise<void> {
    // Upload to S3
  }

  async get(key: string): Promise<Blob | null> {
    // Download from S3
  }

  async delete(key: string): Promise<boolean> {
    // Delete from S3
  }

  async exists(key: string): Promise<boolean> {
    // Check if exists in S3
  }

  async copy(from: string, to: string): Promise<void> {
    // S3 copy operation
  }

  async move(from: string, to: string): Promise<void> {
    await this.copy(from, to)
    await this.delete(from)
  }

  async getMetadata(key: string): Promise<StorageMetadata | null> {
    // Get S3 object metadata
  }

  getUrl(key: string): string {
    return `https://my-bucket.s3.amazonaws.com/${key}`
  }

  async getSignedUrl(key: string, expiresIn: number): Promise<string> {
    // Generate pre-signed URL
  }
}

// Use it
const storage = orbitStorage(core, {
  disks: {
    s3: {
      driver: 'custom',
      store: new S3Store({ bucket: 'my-bucket' })
    }
  }
})
```

---

## 🔄 Migration from v3.x

### Configuration Changes

```typescript
// v3.x (Old)
orbitStorage(core, {
  local: { root: './uploads', baseUrl: '/uploads' },
  exposeAs: 'storage'
})

// v4.0 (New)
orbitStorage(core, {
  default: 'local',
  disks: {
    local: { driver: 'local', root: './uploads', baseUrl: '/uploads' }
  },
  exposeAs: 'storage'
})
```

**Note**: The old format is still supported for backward compatibility but is deprecated.

### Return Value Changes

```typescript
// v3.x - Returns wrapped provider
const storage = orbitStorage(core, { ... })
await storage.put('file.txt', data)

// v4.0 - Returns StorageManager
const storage = orbitStorage(core, { ... })
await storage.put('file.txt', data)  // Same API!
await storage.disk('s3').put('file.txt', data)  // New!
```

The API is backward compatible, but v4.0 adds multi-disk support via `disk()`.

### Type Changes

| v3.x | v4.0 |
|------|------|
| `StorageProvider` | `StorageStore` |
| `LocalStorageProvider` | `LocalStore` |
| `OrbitStorageOptions` | `OrbitNebulaOptions` |

Old type names are still exported with `@deprecated` warnings.

---

## 📝 License

MIT © [Carl Lee](https://github.com/gravito-framework/gravito)
