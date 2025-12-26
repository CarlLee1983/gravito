---
title: Forge Media
description: Image and video processing with status tracking and storage integration.
---

# Forge Media

Forge provides image and video processing pipelines for Gravito. It integrates with storage, queues, and real-time status tracking.

## When to use Forge

Use Forge when you need upload processing, transcoding, or resizing with progress feedback.

## Installation

```bash
bun add @gravito/forge
```

## Prerequisites

- FFmpeg (video processing)
- ImageMagick (image processing)

## Quick Start

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

## Next Steps

- Serve optimized images with [Image Optimization](./image-optimization.md)
- Use background workers via [Queues](./queues.md)
