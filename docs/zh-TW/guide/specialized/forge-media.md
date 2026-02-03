---
title: Forge 媒體處理
description: 影像與影片處理管線，支援狀態追蹤與儲存整合。
---

# Forge 媒體處理

Forge 提供 Gravito 的影像與影片處理管線，整合儲存、佇列與即時狀態追蹤。

## 適用情境

適合需要上傳轉檔、縮圖或轉碼並回饋進度的場景。

## 特色

- 影像與影片處理（Resize/Rotate/Transcode）
- 同步與非同步處理模式
- SSE 進度追蹤（即時狀態）
- Storage / Queue 整合
- 前端元件支援（React / Vue）

## 安裝

```bash
bun add @gravito/forge
```

## 先決條件

- FFmpeg（影片處理）
- ImageMagick（影像處理）

```bash
# macOS
brew install ffmpeg imagemagick
```

## 快速開始

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

## 同步處理

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

## 非同步處理（佇列）

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

## Pipeline 用法

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

## 前端元件（進度追蹤）

React：

```tsx
import { ProcessingImage } from '@gravito/forge/react'

<ProcessingImage
  jobId={jobId}
  placeholder="/placeholder.jpg"
  onComplete={(result) => console.log(result.url)}
  onError={(error) => console.error(error)}
/>
```

Vue：

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

## 設定重點

- `video.ffmpegPath` / `image.imagemagickPath`
- `status.store`（memory / redis）
- `sse.enabled` 與 `sse.path`

## 下一步

- 影像最佳化：[圖片最佳化](./image-optimization.md)
- 使用背景佇列：[佇列](./queues.md)
