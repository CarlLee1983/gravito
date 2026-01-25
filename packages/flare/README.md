# @gravito/flare 🌌

> Lightweight, high-performance notifications for Gravito with multi-channel delivery (Mail, Database, Broadcast, Slack, SMS).

`@gravito/flare` is the official notification engine for the Gravito framework. It provides a clean, expressive API to send notifications across various channels while supporting background queuing out-of-the-box.

**Status**: v1.0.0 - Production ready.

## 🌟 Key Features

- **Zero Runtime Overhead**: Pure TypeScript implementation that delegates to efficient channel drivers.
- **Multi-Channel Support**: Send a single notification via multiple channels (Mail, DB, Slack, etc.) simultaneously.
- **Background Queuing**: Seamlessly integrates with `@gravito/stream` (OrbitStream) to handle high-volume notification delivery without blocking the request.
- **Type-Safe Payloads**: Heavily typed message structures for each channel to ensure data integrity.
- **Extensible Architecture**: Easily register custom notification channels.
- **Galaxy-Ready**: Designed as a standard Gravito Orbit for zero-config integration.

## 📦 Installation

```bash
bun add @gravito/flare
```

## 🚀 Quick Start

### 1. Define Your Notification

Create a notification class that extends `Notification`. Implement the `via` method to specify channels and `to[Channel]` methods for payloads.

```typescript
import { Notification } from '@gravito/flare'
import type { MailMessage, DatabaseNotification, Notifiable } from '@gravito/flare'

class OrderShipped extends Notification {
  constructor(private order: any) {
    super()
  }

  // Determine delivery channels
  via(user: Notifiable): string[] {
    return ['mail', 'database']
  }

  // Mail payload
  toMail(user: Notifiable): MailMessage {
    return {
      subject: `Order #${this.order.id} Shipped!`,
      view: 'emails.order-shipped',
      data: { order: this.order },
      to: user.email,
    }
  }

  // Database payload
  toDatabase(user: Notifiable): DatabaseNotification {
    return {
      type: 'order_shipped',
      data: {
        order_id: this.order.id,
        tracking_number: this.order.tracking,
      },
    }
  }
}
```

### 2. Configure OrbitFlare

Register `OrbitFlare` in your `PlanetCore` boot sequence.

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitFlare } from '@gravito/flare'

const core = await PlanetCore.boot({
  orbits: [
    OrbitFlare.configure({
      enableMail: true,
      enableDatabase: true,
      channels: {
        slack: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
        },
      },
    }),
  ],
})
```

### 3. Send Notifications

Access the `notifications` manager via the core container or context variables.

```typescript
// In your business logic or controller
const notifications = core.container.make('notifications')

await notifications.send(user, new OrderShipped(order))
```

## ⏳ Async Queuing

To send notifications in the background, simply implement the `ShouldQueue` interface in your notification class.

```typescript
import { Notification, ShouldQueue } from '@gravito/flare'

class WeeklyReport extends Notification implements ShouldQueue {
  queue = 'notifications' // Optional: specific queue name
  delay = 3600            // Optional: delay in seconds

  via(user: Notifiable): string[] {
    return ['mail']
  }
  
  // ... toMail implementation
}
```

## 🛠️ Supported Channels

| Channel | Dependency | Description |
|---|---|---|
| **Mail** | `@gravito/signal` | Sends emails via the configured mail driver. |
| **Database** | `@gravito/atlas` | Stores notifications in the `notifications` table. |
| **Broadcast**| `@gravito/radiance`| Pushes real-time updates via WebSockets. |
| **Slack** | None | Sends messages to Slack via Webhooks. |
| **SMS** | Provider Config | Sends text messages via configured SMS providers. |

## 🧩 API Reference

### `Notification` Base Class
- `via(notifiable)`: Returns an array of channel strings.
- `toMail(notifiable)`: Returns `MailMessage`.
- `toDatabase(notifiable)`: Returns `DatabaseNotification`.
- `toBroadcast(notifiable)`: Returns `BroadcastNotification`.
- `toSlack(notifiable)`: Returns `SlackMessage`.
- `toSms(notifiable)`: Returns `SmsMessage`.

### `NotificationManager`
- `send(notifiable, notification)`: Sends the notification to all specified channels.
- `channel(name, implementation)`: Registers a custom delivery channel.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT © Carl Lee
