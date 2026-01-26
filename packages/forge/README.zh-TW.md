# @gravito/forge

Gravito 檔案處理軌道 (Orbit) - 支援即時狀態追蹤的影片與圖片處理模組。

## 概覽 (Overview)

`@gravito/forge` 是 Gravito 框架中的高性能檔案處理模組。它提供了影片與圖片的處理能力（如調整大小、旋轉、轉碼），並透過 Server-Sent Events (SSE) 提供即時的處理狀態追蹤。本模組被設計為 Gravito 星系架構 (Galaxy Architecture) 中的一個「軌道 (Orbit)」。

## 核心特性 (Features)

- **影片處理**：使用 FFmpeg 進行縮放、旋轉與轉碼。
- **圖片處理**：使用 ImageMagick 進行縮放、旋轉與格式轉換。
- **流暢的 Pipeline API**：鏈式調用處理操作，程式碼更簡潔。
- **同步與非同步處理**：
  - **同步 (Synchronous)**：適用於小型檔案或需要立即獲得結果的操作。
  - **非同步 (Asynchronous)**：將耗時的任務（如大型影片轉碼）交由背景隊列處理（整合 `@gravito/stream`）。
- **即時狀態追蹤**：內建 SSE 支援，可追蹤處理進度與狀態。
- **存儲整合**：自動將處理後的檔案上傳至 `@gravito/nebula` 存儲。
- **前端組件**：提供 React 與 Vue 的組件，開箱即可使用即時狀態追蹤 UI。

## 安裝 (Installation)

```bash
bun add @gravito/forge
```

## 環境需求 (Prerequisites)

- **FFmpeg**：影片處理必備。
  ```bash
  # macOS
  brew install ffmpeg
  
  # Ubuntu/Debian
  sudo apt-get install ffmpeg
  ```

- **ImageMagick**：圖片處理必備。
  ```bash
  # macOS
  brew install imagemagick
  
  # Ubuntu/Debian
  sudo apt-get install imagemagick
  ```

## 快速上手 (Quick Start)

### 1. 安裝軌道 (Install Orbit)

在 `PlanetCore` 的啟動過程中配置 `OrbitForge`。

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

### 2. 基本處理範例

#### 同步處理
適用於簡單的操作，可以在一個 HTTP 請求週期內完成。

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

#### 非同步處理（帶有進度追蹤）
最適合長時間運行的影片轉碼或批量圖片縮放。

```typescript
app.post('/upload-async', async (c) => {
  const forge = c.get('forge')
  const file = await c.req.file()
  
  // 1. 建立任務 ID 與初始狀態
  const job = await forge.processAsync(
    { source: file, filename: file.name, mimeType: file.type },
    { width: 1920, height: 1080, format: 'mp4' }
  )

  // 2. 將實際工作推送到隊列
  const queue = c.get('queue')
  await queue.push(new ProcessFileJob({
    jobId: job.id,
    // ... 輸入與選項
  }))

  return c.json({ jobId: job.id })
})
```

### 3. 使用 Pipeline

Pipeline 提供了更靈活的 API 來鏈接複雜的處理流程。

```typescript
// 影片：縮放 -> 旋轉 -> 轉碼
const results = await forge.createVideoPipeline()
  .resize(1280, 720)
  .rotate(90)
  .transcode('mp4')
  .execute(fileInput)

// 圖片：縮放 -> 格式轉換
const imageResults = await forge.createImagePipeline()
  .resize(400, 400)
  .format('webp')
  .execute(imageInput)
```

## 前端組件 (Frontend Components)

Forge 包含主流框架的組件，可自動處理狀態輪詢與 SSE 更新。

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

## 系統架構 (API Architecture)

### `ForgeService`
主要入口點，負責調度處理器 (Processor)、Pipeline 與存儲。

- `process()`：同步處理。
- `processAsync()`：為非同步執行準備任務。
- `createVideoPipeline()` / `createImagePipeline()`：返回 Pipeline 構建器。

### `Pipelines`
用於鏈式調用命令的抽象層。
- `VideoPipeline`：支援 `resize`, `rotate`, `transcode`, `bitrate`, `fps`。
- `ImagePipeline`：支援 `resize`, `rotate`, `format`, `quality`, `crop`。

### `Processors`
外部工具（如 FFmpeg/ImageMagick）的低階適配器。
- `VideoProcessor`：FFmpeg 的介面。
- `ImageProcessor`：ImageMagick 的介面。

## 配置項 (Configuration)

```typescript
interface ForgeConfig {
  processors?: {
    video?: { ffmpegPath?: string; tempDir?: string }
    image?: { imagemagickPath?: string; tempDir?: string }
  }
  status?: {
    store?: 'memory' | 'redis'
    ttl?: number // 任務狀態保留時間 (預設 24h)
  }
  sse?: {
    enabled?: boolean
    path?: string // SSE 路由路徑 (預設: /forge/status/:jobId/stream)
  }
}
```

## 授權 (License)

MIT © Gravito Team
