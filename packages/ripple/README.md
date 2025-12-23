# @gravito/ripple

> 🌊 Bun-native WebSocket broadcasting for Gravito. Channel-based real-time communication.

## Features

- **Bun Native WebSocket** - Zero external dependencies, maximum performance
- **Channel-based Broadcasting** - Public, Private, and Presence channels
- **Laravel Echo-style API** - Familiar patterns for Laravel developers
- **Sentinel Integration** - Built-in authentication for private channels
- **Horizontal Scaling** - Redis driver support (coming soon)

## Installation

```bash
bun add @gravito/ripple
```

## Quick Start

### Server Setup

```typescript
import { PlanetCore } from 'gravito-core'
import { OrbitRipple, RippleServer } from '@gravito/ripple'

const core = new PlanetCore()

// Install Ripple WebSocket module
core.install(new OrbitRipple({
  path: '/ws',
  authorizer: async (channel, userId, socketId) => {
    // Return true for authorized, false for denied
    // For presence channels, return { id: userId, info: { name: '...' } }
    if (channel.startsWith('private-orders.')) {
      return userId !== undefined
    }
    return true
  }
}))

// Get the Ripple module
const ripple = core.container.make<OrbitRipple>('ripple')

// Start server with WebSocket support
Bun.serve({
  port: 3000,
  fetch: (req, server) => {
    // Let Ripple handle WebSocket upgrades
    if (ripple.getServer().upgrade(req, server)) return

    // Regular HTTP handling
    return core.adapter.fetch(req, server)
  },
  websocket: ripple.getHandler()
})
```

### Broadcasting Events

```typescript
import { broadcast, PrivateChannel, BroadcastEvent } from '@gravito/ripple'

// Define a broadcast event
class OrderShipped extends BroadcastEvent {
  constructor(public order: { id: number; userId: number }) {
    super()
  }

  broadcastOn() {
    return new PrivateChannel(`orders.${this.order.userId}`)
  }

  broadcastAs() {
    return 'OrderShipped' // Event name
  }
}

// Broadcast from anywhere in your app
broadcast(new OrderShipped({ id: 123, userId: 456 }))
```

### Fluent API

```typescript
import { Broadcaster } from '@gravito/ripple'

// Broadcast to a public channel
Broadcaster.to('news')
  .emit('ArticlePublished', { title: 'Hello World' })

// Broadcast to a private channel
Broadcaster.toPrivate('orders.123')
  .emit('OrderUpdated', { status: 'shipped' })

// Broadcast to a presence channel
Broadcaster.toPresence('chat.lobby')
  .emit('NewMessage', { message: 'Hi!' })
```

## Channel Types

### Public Channel

No authentication required. Anyone can subscribe.

```typescript
import { PublicChannel } from '@gravito/ripple'

const channel = new PublicChannel('news')
// fullName: 'news'
```

### Private Channel

Requires authentication. Only authorized users can subscribe.

```typescript
import { PrivateChannel } from '@gravito/ripple'

const channel = new PrivateChannel('orders.123')
// fullName: 'private-orders.123'
```

### Presence Channel

Requires authentication. Tracks online users in the channel.

```typescript
import { PresenceChannel } from '@gravito/ripple'

const channel = new PresenceChannel('chat.lobby')
// fullName: 'presence-chat.lobby'
```

## Client SDK

For frontend integration, use `@gravito/ripple-client` (coming soon):

```typescript
import { createRippleClient } from '@gravito/ripple-client'

const ripple = createRippleClient({
  host: 'ws://localhost:3000/ws',
  authEndpoint: '/broadcasting/auth',
})

// Subscribe to public channel
ripple.channel('news')
  .listen('ArticlePublished', (event) => {
    console.log('New article:', event.title)
  })

// Subscribe to private channel
ripple.private(`orders.${userId}`)
  .listen('OrderShipped', (event) => {
    toast.success('Your order has shipped!')
  })

// Join presence channel
ripple.join(`chat.${roomId}`)
  .here((users) => console.log('Online:', users))
  .joining((user) => console.log(`${user.name} joined`))
  .leaving((user) => console.log(`${user.name} left`))
```

## Configuration

```typescript
interface RippleConfig {
  /** WebSocket endpoint path (default: '/ws') */
  path?: string

  /** Authentication endpoint for private/presence channels */
  authEndpoint?: string

  /** Driver to use ('local' | 'redis') */
  driver?: 'local' | 'redis'

  /** Channel authorizer function */
  authorizer?: ChannelAuthorizer

  /** Ping interval in milliseconds (default: 30000) */
  pingInterval?: number
}
```

## License

MIT
