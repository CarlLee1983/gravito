---
title: Forge 媒體處理
description: 影像與影片處理管線，支援狀態追蹤與儲存整合。
---

# Forge 媒體處理

Forge 提供 Gravito 的影像與影片處理管線，整合儲存、佇列與即時狀態追蹤。

## 適用情境

適合需要上傳轉檔、縮圖或轉碼並回饋進度的場景。

## 安裝

```bash
bun add @gravito/forge
```

## 先決條件

- FFmpeg（影片處理）
- ImageMagick（影像處理）

## 快速開始

```ts
import { PlanetCore } from 'gravito-core'
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

## 下一步

- 影像最佳化：[圖片最佳化](./image-optimization.md)
- 使用背景佇列：[佇列](./queues.md)
