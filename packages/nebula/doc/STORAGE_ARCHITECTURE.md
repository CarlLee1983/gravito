# Storage Architecture Guide

In the **Gravito Galaxy Architecture**, storage must be treated as a pluggable infrastructure component. Satellites shouldn't care *where* a file is stored (Local vs. S3); they should only care about *how to store and retrieve* it. `@gravito/nebula` provides this abstraction.

## 1. Storage Disks Concept

A "Disk" is a named configuration that pairs a storage driver with specific settings. An application can have multiple disks:

- `local`: Files stored on the same machine running the server.
- `s3`: Files stored in an AWS S3 bucket.
- `public`: A disk meant for public assets (images, CSS).
- `private`: A disk meant for secure documents (invoices, PDFs).

## 2. Satellite File Management

When a Satellite handles file uploads, it uses the injected `storage` manager from the Gravito context.

```typescript
// satellites/media/src/handlers/upload.ts
export const handleUpload = async (c) => {
  const body = await c.req.parseBody()
  const file = body['image']

  const storage = c.get('storage')

  // Generate a unique path
  const key = `avatars/${crypto.randomUUID()}.png`

  // Store on the default disk (configured by the environment)
  await storage.put(key, file)

  // Get the public URL to save in the database
  const url = storage.getUrl(key)
  await userService.updateAvatar(c.get('user').id, url)

  return c.json({ url })
}
```

## 3. Storage Hooks (Middleware)

`@gravito/nebula` emits lifecycle hooks using PlanetCore's hook system. You can intercept file operations globally.

### Image Optimization Hook

```typescript
// Orbits/ImageProcessor.ts
import { PlanetCore } from '@gravito/core'
import sharp from 'sharp'

export const registerHooks = (core: PlanetCore) => {
  core.hooks.addFilter('storage:upload', async (data, context) => {
    // Only optimize image files
    if (context.key.match(/\.(jpg|jpeg|png)$/i)) {
      const buffer = data instanceof Buffer ? data : await data.arrayBuffer()
      // Resize to 800px width and compress
      return await sharp(buffer)
        .resize({ width: 800, withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()
    }
    
    return data
  })
}
```

## 4. Temporary and Signed URLs

For secure files (e.g., in a `private` disk like S3), you should generate short-lived signed URLs instead of public URLs.

```typescript
// Generate a URL that expires in 15 minutes (900 seconds)
const signedUrl = await storage.disk('s3-private').getSignedUrl('invoices/2026-02.pdf', 900)
```

## 5. Streaming Large Files

For large files, prefer streaming over loading the entire file into memory:

```typescript
// Using Hono/Photon stream middleware
import { stream } from '@gravito/photon/middleware/streaming'

app.get('/download/:fileId', stream(async (c) => {
  const storage = c.get('storage')
  const fileBlob = await storage.get(c.req.param('fileId'))
  
  if (!fileBlob) return c.notFound()

  c.header('Content-Type', fileBlob.type)
  const reader = fileBlob.stream().getReader()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    await c.get('stream').write(value)
  }
}))
```
