---
title: Ripple Broadcasting
description: WebSocket 廣播服務與即時通訊（Server + Client）。
---

# Ripple Broadcasting

Ripple（`@gravito/ripple` / `@gravito/ripple-client`）提供類 Laravel Echo 的廣播體驗，支援 Public / Private / Presence channels。

## 特色

- Bun 原生 WebSocket
- 公開 / 私有 / Presence 頻道
- 與 Sentinel 驗證整合
- 前端客戶端（React / Vue / Vanilla）

## 安裝

```bash
bun add @gravito/ripple @gravito/ripple-client
```

## Server 端設定

```ts
import { PlanetCore } from '@gravito/core'
import { OrbitRipple } from '@gravito/ripple'

const core = new PlanetCore()

core.install(
  new OrbitRipple({
    path: '/ws',
    authorizer: async (channel, userId) => {
      if (channel.startsWith('private-orders.')) {
        return Boolean(userId)
      }
      return true
    },
  })
)
```

## 廣播事件

```ts
import { broadcast, PrivateChannel, BroadcastEvent } from '@gravito/ripple'

class OrderShipped extends BroadcastEvent {
  constructor(public order: { id: number; userId: number }) {
    super()
  }

  broadcastOn() {
    return new PrivateChannel(`orders.${this.order.userId}`)
  }
}

broadcast(new OrderShipped({ id: 1, userId: 2 }))
```

## Client 端使用

```ts
import { createRippleClient } from '@gravito/ripple-client'

const client = createRippleClient({
  host: 'ws://localhost:3000/ws',
  authEndpoint: '/broadcasting/auth',
})

await client.connect()

client.channel('news').listen('ArticlePublished', (data) => {
  console.log(data.title)
})
```

## Presence Channel

```ts
client
  .join('chat.lobby')
  .here((users) => console.log('Online:', users))
  .joining((user) => console.log('Join:', user))
  .leaving((user) => console.log('Leave:', user))
```

## 下一步

- 認證與授權：[Sentinel Auth](./sentinel-auth.md)
