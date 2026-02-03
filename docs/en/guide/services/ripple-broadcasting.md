---
title: Ripple Broadcasting
description: WebSocket broadcasting and realtime communication (Server + Client).
---

# Ripple Broadcasting

Ripple (`@gravito/ripple` / `@gravito/ripple-client`) provides a Laravel Echo-like experience with Public, Private, and Presence channels.

## Highlights

- Bun-native WebSocket
- Public / Private / Presence channels
- Integrates with Sentinel auth
- Frontend clients (React / Vue / Vanilla)

## Installation

```bash
bun add @gravito/ripple @gravito/ripple-client
```

## Server Setup

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

## Broadcast Events

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

## Client Usage

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

## Presence Channels

```ts
client
  .join('chat.lobby')
  .here((users) => console.log('Online:', users))
  .joining((user) => console.log('Join:', user))
  .leaving((user) => console.log('Leave:', user))
```

## Next Steps

- Auth integration: [Sentinel Auth](./sentinel-auth.md)
