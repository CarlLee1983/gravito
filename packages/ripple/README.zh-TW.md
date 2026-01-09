# @gravito/ripple

> Gravito 的 Bun 原生 WebSocket 廣播模組，支援頻道式即時通訊。

## 安裝

```bash
bun add @gravito/ripple
```

## 快速開始

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitRipple } from '@gravito/ripple'

const core = new PlanetCore()

core.install(new OrbitRipple({
  path: '/ws',
  authorizer: async (channel, userId, socketId) => {
    if (channel.startsWith('private-orders.')) {
      return userId !== undefined
    }
    return true
  }
}))
```
