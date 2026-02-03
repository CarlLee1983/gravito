---
title: Forge Media Processing
description: Image and video pipelines with status tracking and storage integration.
---

# Forge Media Processing

Forge provides Gravito's media pipeline for images and video, integrating storage, queues, and realtime status tracking.

## When to use Forge

Ideal for uploads that need transcoding, thumbnailing, or progress feedback.

## Highlights

- Image and video processing (Resize/Rotate/Transcode)
- Sync and async modes
- SSE progress tracking
- Storage / Queue integration
- Frontend components (React / Vue)

## Installation

```bash
bun add @gravito/forge
```

## Prerequisites

- FFmpeg (video)
- ImageMagick (image)

```bash
# macOS
brew install ffmpeg imagemagick
```

## Quick Start

```ts
import { PlanetCore } from '@gravito/core'
import { OrbitForge } from '@gravito/forge'
import { OrbitStorage } from '@gravito/nebula'
import { OrbitStream } from '@gravito/stream'

const core = await PlanetCore.boot({
  orbits: [
    OrbitStorage.configure({ local: { root: './storage', baseUrl: '/storage' } }),
    OrbitStream.configure({ default: 'memory', connections: { memory: { driver: 'memory' } } }),
    OrbitForge.configure({
      video: { ffmpegPath: 'ffmpeg', tempDir: '/tmp/forge-video' },
      image: { imagemagickPath: 'magick', tempDir: '/tmp/forge-image' },
      sse: { enabled: true },
    }),
  ],
})
```

## Synchronous Processing

```ts
app.post('/upload', async (c) => {
  const forge = c.get('forge')
  const file = await c.req.file()
  if (!file) return c.json({ error: 'No file uploaded' }, 400)

  const result = await forge.process(
    { source: file, filename: file.name, mimeType: file.type },
    { width: 1920, height: 1080, format: 'mp4' }
  )

  return c.json({ url: result.url })
})
```

## Async Processing (Queue)

```ts
app.post('/upload', async (c) => {
  const forge = c.get('forge')
  const queue = c.get('queue')
  const file = await c.req.file()
  if (!file) return c.json({ error: 'No file uploaded' }, 400)

  const job = await forge.processAsync(
    { source: file, filename: file.name, mimeType: file.type },
    { width: 1920, height: 1080, format: 'mp4' }
  )

  await queue.push(
    new ProcessFileJob({
      jobId: job.id,
      input: { source: file, filename: file.name, mimeType: file.type },
      options: { width: 1920, height: 1080, format: 'mp4' },
      forgeService: forge,
      statusStore: forge.getStatusStore(),
      storage: c.get('storage'),
    })
  )

  return c.json({ jobId: job.id })
})
```

## Pipeline Usage

```ts
const forge = c.get('forge')

const videoPipeline = forge
  .createVideoPipeline()
  .resize(1920, 1080)
  .rotate(90)
  .transcode('mp4', 'h264', 23)

const result = await videoPipeline.execute({
  source: file,
  filename: file.name,
  mimeType: 'video/mp4',
})
```

```ts
const imagePipeline = forge.createImagePipeline().resize(800, 600).format('webp', 85)

const imageResult = await imagePipeline.execute({
  source: imageFile,
  filename: imageFile.name,
  mimeType: 'image/jpeg',
})
```

## Frontend Components (Progress)

React:

```tsx
import { ProcessingImage } from '@gravito/forge/react'

<ProcessingImage
  jobId={jobId}
  placeholder="/placeholder.jpg"
  onComplete={(result) => console.log(result.url)}
  onError={(error) => console.error(error)}
/>
```

Vue:

```vue
<template>
  <ProcessingImage
    v-if="jobId"
    :job-id="jobId"
    placeholder="/placeholder.jpg"
    @complete="handleComplete"
    @error="handleError"
  />
</template>
```

## Configuration Notes

- `video.ffmpegPath` / `image.imagemagickPath`
- `status.store` (memory / redis)
- `sse.enabled` and `sse.path`

## Next Steps

- Image optimization: [Image Optimization](./image-optimization.md)
- Background jobs: [Queues](./queues.md)
