# @gravito/forge

> Gravito 的檔案處理模組，支援影片與圖片轉檔並提供即時狀態追蹤。

## 安裝

```bash
bun add @gravito/forge
```

## 快速開始

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
