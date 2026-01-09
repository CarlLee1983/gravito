# @gravito/radiance

> Gravito 的廣播模組，支援 Pusher、Ably、Redis、WebSocket 等驅動。

## 安裝

```bash
bun add @gravito/radiance
```

## 快速開始

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitRadiance } from '@gravito/radiance'

const core = await PlanetCore.boot({
  orbits: [
    OrbitRadiance.configure({
      driver: 'pusher',
      config: {
        appId: 'your-app-id',
        key: 'your-key',
        secret: 'your-secret',
        cluster: 'mt1',
      },
    }),
  ],
})
```
