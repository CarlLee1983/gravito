# @gravito/forge

File Processing Orbit for Gravito - Video and Image Processing with Real-time Status Tracking.

## Overview

`@gravito/forge` is a high-performance file processing module for the Gravito framework. It provides video and image processing capabilities (resize, rotate, transcode) with real-time status tracking via Server-Sent Events (SSE). It's designed to be used as an "Orbit" within the Gravito Galaxy Architecture.

## Features

- **Video Processing**: Resize, rotate, transcode using FFmpeg.
- **Image Processing**: Resize, rotate, format conversion using ImageMagick.
- **Fluent Pipeline API**: Chain processing operations with ease.
- **Synchronous & Asynchronous Processing**: 
  - **Synchronous**: Immediate processing for small files or blocking operations.
  - **Asynchronous**: Offload heavy tasks to a background queue (integration with `@gravito/stream`).
- **Real-time Status Tracking**: Built-in SSE (Server-Sent Events) support for tracking processing progress.
- **Storage Integration**: Automatic upload of processed files to `@gravito/nebula` storage.
- **Framework Components**: First-class React and Vue components to display processing status out-of-the-box.

## Installation

```bash
bun add @gravito/forge
```

## Prerequisites

- **FFmpeg**: Required for video processing.
  ```bash
  # macOS
  brew install ffmpeg
  
  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  ```

- **ImageMagick**: Required for image processing.
  ```bash
  # macOS
  brew install imagemagick
  
  # Ubuntu/Debian
  sudo apt-get install imagemagick
  ```

## Quick Start

### 1. Install Orbit

Configure `OrbitForge` within your `PlanetCore` boot process.

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitForge } from '@gravito/forge'
import { OrbitStorage } from '@gravito/nebula'
import { OrbitStream } from '@gravito/stream'

const core = await PlanetCore.boot({
  orbits: [
    OrbitStorage.configure({
      local: { root: './storage', baseUrl: '/storage' }
    }),
    OrbitStream.configure({
      default: 'memory',
      connections: { memory: { driver: 'memory' } }
    }),
    OrbitForge.configure({
      video: { ffmpegPath: 'ffmpeg', tempDir: '/tmp/forge-video' },
      image: { imagemagickPath: 'magick', tempDir: '/tmp/forge-image' },
      sse: { enabled: true }
    })
  ]
})
```

### 2. Basic Processing

#### Synchronous Processing
Ideal for simple operations that can complete within an HTTP request lifecycle.

```typescript
app.post('/upload', async (c) => {
  const forge = c.get('forge')
  const file = await c.req.file()
  
  const result = await forge.process(
    { source: file, filename: file.name, mimeType: file.type },
    { width: 1920, height: 1080, format: 'mp4' }
  )

  return c.json({ url: result.url })
})
```

#### Asynchronous Processing with Progress
Best for long-running video transcoding or batch image resizing.

```typescript
app.post('/upload-async', async (c) => {
  const forge = c.get('forge')
  const file = await c.req.file()
  
  // 1. Create a job ID and initial status
  const job = await forge.processAsync(
    { source: file, filename: file.name, mimeType: file.type },
    { width: 1920, height: 1080, format: 'mp4' }
  )

  // 2. Dispatch the actual work to a queue
  const queue = c.get('queue')
  await queue.push(new ProcessFileJob({
    jobId: job.id,
    // ... input and options
  }))

  return c.json({ jobId: job.id })
})
```

### 3. Using Pipelines

Pipelines provide a fluent API for complex processing chains.

```typescript
// Video: Resize -> Rotate -> Transcode
const results = await forge.createVideoPipeline()
  .resize(1280, 720)
  .rotate(90)
  .transcode('mp4')
  .execute(fileInput)

// Image: Resize -> Format
const imageResults = await forge.createImagePipeline()
  .resize(400, 400)
  .format('webp')
  .execute(imageInput)
```

## Frontend Components

Forge includes components for popular frameworks to handle status polling and SSE updates automatically.

### React
```tsx
import { ProcessingImage } from '@gravito/forge/react'

<ProcessingImage
  jobId={jobId}
  placeholder="/loading.gif"
  onComplete={(res) => console.log(res.url)}
/>
```

### Vue
```vue
<template>
  <ProcessingVideo :job-id="jobId" @complete="onComplete" />
</template>

<script setup>
import { ProcessingVideo } from '@gravito/forge/vue'
const onComplete = (res) => console.log(res.url)
</script>
```

## API Architecture

### `ForgeService`
The main entry point. Orchestrates processors, pipelines, and storage.

- `process()`: Sync processing.
- `processAsync()`: Prepares a job for async execution.
- `createVideoPipeline()` / `createImagePipeline()`: Returns a pipeline builder.

### `Pipelines`
Abstraction layer for chaining commands.
- `VideoPipeline`: Supports `resize`, `rotate`, `transcode`, `bitrate`, `fps`.
- `ImagePipeline`: Supports `resize`, `rotate`, `format`, `quality`, `crop`.

### `Processors`
Low-level adapters for external tools.
- `VideoProcessor`: Interface for FFmpeg.
- `ImageProcessor`: Interface for ImageMagick.

## Configuration

```typescript
interface ForgeConfig {
  processors?: {
    video?: { ffmpegPath?: string; tempDir?: string }
    image?: { imagemagickPath?: string; tempDir?: string }
  }
  status?: {
    store?: 'memory' | 'redis'
    ttl?: number // TTL for job status (default 24h)
  }
  sse?: {
    enabled?: boolean
    path?: string // Route for SSE stream (default: /forge/status/:jobId/stream)
  }
}
```

## License

MIT © Gravito Team
