# @gravito/forge

File Processing Orbit for Gravito - Video and Image Processing with Real-time Status Tracking

## Overview

`@gravito/forge` is a high-performance file processing module for the Gravito framework. It provides video and image processing capabilities (resize, rotate, transcode) with real-time status tracking via Server-Sent Events (SSE).

## Features

- **Video Processing**: Resize, rotate, transcode using FFmpeg
- **Image Processing**: Resize, rotate, format conversion using ImageMagick
- **Synchronous & Asynchronous Processing**: Support both sync and async modes
- **Real-time Status Tracking**: SSE-based progress updates
- **Storage Integration**: Automatic upload to Nebula storage
- **Queue Integration**: Async processing via Stream
- **Frontend Components**: React and Vue components for displaying processing status

## Installation

```bash
bun add @gravito/forge
```

## Prerequisites

- **FFmpeg**: Required for video processing
  ```bash
  # macOS
  brew install ffmpeg
  
  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  ```

- **ImageMagick**: Required for image processing
  ```bash
  # macOS
  brew install imagemagick
  
  # Ubuntu/Debian
  sudo apt-get install imagemagick
  ```

## Quick Start

### 1. Install Orbit

```typescript
import { PlanetCore } from 'gravito-core'
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

### 2. Synchronous Processing

```typescript
app.post('/upload', async (c) => {
  const forge = c.get('forge')
  const file = await c.req.file()
  
  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  const result = await forge.process(
    {
      source: file,
      filename: file.name,
      mimeType: file.type,
    },
    {
      width: 1920,
      height: 1080,
      format: 'mp4',
    }
  )

  return c.json({ url: result.url })
})
```

### 3. Asynchronous Processing

```typescript
app.post('/upload', async (c) => {
  const forge = c.get('forge')
  const queue = c.get('queue')
  const file = await c.req.file()
  
  if (!file) {
    return c.json({ error: 'No file uploaded' }, 400)
  }

  // Start async processing
  const job = await forge.processAsync(
    {
      source: file,
      filename: file.name,
      mimeType: file.type,
    },
    {
      width: 1920,
      height: 1080,
      format: 'mp4',
    }
  )

  // Push to queue
  await queue.push(new ProcessFileJob({
    jobId: job.id,
    input: {
      source: file,
      filename: file.name,
      mimeType: file.type,
    },
    options: {
      width: 1920,
      height: 1080,
      format: 'mp4',
    },
    forgeService: forge,
    statusStore: forge.getStatusStore(),
    storage: c.get('storage'),
  }))

  return c.json({ jobId: job.id })
})
```

### 4. Using Processing Pipelines

```typescript
const forge = c.get('forge')

// Video pipeline
const videoPipeline = forge.createVideoPipeline()
  .resize(1920, 1080)
  .rotate(90)
  .transcode('mp4', 'h264', 23)

const results = await videoPipeline.execute({
  source: file,
  filename: file.name,
  mimeType: 'video/mp4',
})

// Image pipeline
const imagePipeline = forge.createImagePipeline()
  .resize(800, 600)
  .rotate(90)
  .format('webp', 85)

const imageResults = await imagePipeline.execute({
  source: imageFile,
  filename: imageFile.name,
  mimeType: 'image/jpeg',
})
```

## Frontend Components

### React

```tsx
import { ProcessingImage, ProcessingVideo } from '@gravito/forge/react'

function MyComponent() {
  const [jobId, setJobId] = useState<string | null>(null)

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const res = await fetch('/upload', {
      method: 'POST',
      body: formData,
    })
    
    const { jobId } = await res.json()
    setJobId(jobId)
  }

  return (
    <div>
      {jobId && (
        <ProcessingImage
          jobId={jobId}
          placeholder="/placeholder.jpg"
          onComplete={(result) => {
            console.log('Processing complete:', result.url)
          }}
          onError={(error) => {
            console.error('Processing failed:', error)
          }}
        />
      )}
    </div>
  )
}
```

### Vue

```vue
<template>
  <div>
    <ProcessingImage
      v-if="jobId"
      :job-id="jobId"
      placeholder="/placeholder.jpg"
      @complete="handleComplete"
      @error="handleError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ProcessingImage } from '@gravito/forge/vue'

const jobId = ref<string | null>(null)

const handleComplete = (result: FileOutput) => {
  console.log('Processing complete:', result.url)
}

const handleError = (error: Error) => {
  console.error('Processing failed:', error)
}
</script>
```

## Configuration

```typescript
interface ForgeConfig {
  // Storage configuration (from Nebula)
  storage?: {
    provider?: StorageProvider
    local?: { root: string; baseUrl?: string }
  }
  
  // Processor configuration
  processors?: {
    video?: {
      ffmpegPath?: string
      maxConcurrent?: number
      tempDir?: string
    }
    image?: {
      imagemagickPath?: string
      maxConcurrent?: number
      tempDir?: string
    }
  }
  
  // Status tracking configuration
  status?: {
    store?: 'memory' | 'redis'
    ttl?: number
  }
  
  // SSE configuration
  sse?: {
    enabled?: boolean
    path?: string // Default: /forge/status/:jobId/stream
  }
}
```

## API Reference

### ForgeService

#### `process(input, options)`

Process a file synchronously.

**Parameters:**
- `input: FileInput` - File to process
- `options: ProcessOptions` - Processing options

**Returns:** `Promise<FileOutput>`

#### `processAsync(input, options)`

Start asynchronous processing.

**Parameters:**
- `input: FileInput` - File to process
- `options: ProcessOptions` - Processing options

**Returns:** `Promise<ProcessingJob>`

#### `createVideoPipeline()`

Create a video processing pipeline.

**Returns:** `VideoPipeline`

#### `createImagePipeline()`

Create an image processing pipeline.

**Returns:** `ImagePipeline`

## License

MIT
