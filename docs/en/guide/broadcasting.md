---
title: Broadcasting
description: Learn how to broadcast server-side events in real-time to the browser.
---

# Broadcasting

> Gravito `@gravito/radiance` allows you to easily implement real-time features like chat, live notifications, or data dashboards.

## Core Workflow

1.  **Server-side**: Dispatch an event that implements `ShouldBroadcast`.
2.  **Broadcast Layer**: The event is serialized and pushed to a driver (e.g., Redis, Pusher).
3.  **Client-side**: The browser listens and responds via WebSockets.

## Defining a Broadcast Event

```typescript
import { Event } from '@gravito/core'
import { ShouldBroadcast, PrivateChannel } from '@gravito/radiance'

export class MessageSent extends Event implements ShouldBroadcast {
  constructor(public message: string, public userId: string) {
    super()
  }

  // Specify the broadcast channel
  broadcastOn() {
    return new PrivateChannel(`user.${this.userId}`)
  }

  // Customize broadcast data
  broadcastWith() {
    return {
      message: this.message,
      sent_at: new Date().toISOString()
    }
  }
}
```

## Dispatching a Broadcast

When you dispatch an event that supports broadcasting in `PlanetCore`, it is automatically pushed to the broadcast driver:

```typescript
await core.events.dispatch(new MessageSent('Hello!', '123'))
```

## Client-side Listening

Gravito provides a lightweight client SDK called `@gravito/ripple-client`:

```typescript
import { Ripple } from '@gravito/ripple-client'

const ripple = new Ripple({
  driver: 'pusher',
  key: 'your-key'
})

ripple.private(`user.123`)
  .listen('MessageSent', (data) => {
    console.log('Received new message:', data.message)
  })
```

---

## Next Steps
Check the [CLI Tools](./pulse-cli.md) to learn how to manage your application.
