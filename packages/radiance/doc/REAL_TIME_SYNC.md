# Real-time State Synchronization Guide

`@gravito/radiance` is the primary tool for keeping your distributed **Galaxy** in sync. This guide covers how to use broadcasting for state synchronization across Satellites and Clients.

## 1. Broadcasting Satellite Events

Any class extending `Event` (from `@gravito/core`) can be broadcasted by implementing the `ShouldBroadcast` interface.

```typescript
// satellites/catalog/src/events/StockUpdated.ts
import { Event, ShouldBroadcast } from '@gravito/core'
import { PublicChannel } from '@gravito/radiance'

export class StockUpdated extends Event implements ShouldBroadcast {
  constructor(public readonly productId: string, public readonly stock: number) {
    super()
  }

  broadcastOn() {
    return new PublicChannel('catalog.inventory')
  }
}
```

## 2. Private & Presence Channels

Use **Private** channels for user-specific data and **Presence** channels for collaborative data (e.g., "3 users are viewing this item").

```typescript
// Private Channel
broadcastOn() {
  return new PrivateChannel(`user.${this.userId}`)
}

// Presence Channel
broadcastOn() {
  return new PresenceChannel(`room.${this.roomId}`)
}
```

## 3. Client-Side Subscription

The client (e.g., using `@gravito/astral` or standard React) subscribes to these channels to update its local state.

```typescript
import { Echo } from '@gravito/radiance-client'

const echo = new Echo({ driver: 'websocket', ... })

echo.channel('catalog.inventory')
  .listen('StockUpdated', (e) => {
    updateUI(e.productId, e.stock)
  })
```

## 4. Cross-Satellite Synchronization

One Satellite can listen to another Satellite's broadcasts to maintain a local cache or trigger background logic.

- **Scenario**: When `Membership` Satellite updates a user's role, `Billing` Satellite needs to update the active subscription limit.
- **Implementation**: `Membership` broadcasts `UserRoleUpdated`. `Billing` (via a backend Worker) listens to the Redis broadcast stream and updates its local `atlas` database.

## 5. Performance: Driver Selection

- **Pusher/Ably**: Best for ease of use and zero server maintenance.
- **Redis Driver**: Best for internal backend-to-backend synchronization.
- **WebSocket Driver**: Best for extreme low-latency and custom control on Bun.
