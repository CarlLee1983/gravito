---
title: Notifications
description: Learn how to send notifications via multiple channels (Mail, Database, Slack, SMS).
---

# Notifications

> With `@gravito/flare`, you can easily send notifications to multiple channels, such as email, database storage, Slack channels, or SMS.

## Creating a Notification

The notification class defines how the notification is delivered and the content for each channel.

```typescript
import { Notification } from '@gravito/flare'
import type { Notifiable, MailMessage, DatabaseNotification } from '@gravito/flare'

export class OrderShipped extends Notification {
  constructor(private order: any) {
    super()
  }

  // Define channels to send via
  via(user: Notifiable): string[] {
    return ['mail', 'database']
  }

  // Email content
  toMail(user: Notifiable): MailMessage {
    return {
      subject: `Your Order #${this.order.id} has Shipped`,
      view: 'emails/shipped',
      data: { order: this.order }
    }
  }

  // Database storage content
  toDatabase(user: Notifiable): DatabaseNotification {
    return {
      type: 'order_shipped',
      data: { order_id: this.order.id }
    }
  }
}
```

## Sending a Notification

You can use the `NotificationManager` to send notifications:

```typescript
import { NotificationManager } from '@gravito/flare'

core.app.post('/orders/:id/ship', async (c) => {
  const notifications = c.get('notifications') as NotificationManager
  const user = await User.find(1)

  // Send the notification
  const result = await notifications.send(user, new OrderShipped(order))

  // Check results
  if (result.failed.length > 0) {
    console.warn('Some channels failed:', result.failed)
  }

  return c.json({ message: 'Notification sent' })
})
```

## Advanced Features

### Retries

You can configure automatic retries for notifications that fail. This can be set globally or per-notification.

```typescript
// Per-notification retry configuration
export class CriticalAlert extends Notification {
  // Retry up to 5 times with linear backoff
  retry = {
    maxAttempts: 5,
    backoff: 'linear',
    baseDelay: 1000
  }

  // Or use a method for dynamic logic
  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < 3 && error.message.includes('Network')
  }
}
```

### Metrics

`@gravito/flare` provides built-in metrics collection for monitoring success rates and latency.

```typescript
import { NotificationMetricsCollector, toPrometheusFormat } from '@gravito/flare'

const metrics = new NotificationMetricsCollector()
// Attach metrics to the manager
notifications.setMetricsCollector(metrics)

// Export metrics endpoint
app.get('/metrics', (c) => {
  return c.text(toPrometheusFormat(metrics.getSummary()))
})
```

### Batch Sending

For high-performance scenarios, use `sendBatch` to send notifications to multiple users efficiently.

```typescript
const users = await User.all()
// Sends notifications in parallel with concurrency control
await notifications.sendBatch(users, new SystemUpdateNotification())
```

### Templates

Use `TemplatedNotification` to maintain consistent messaging across your application.

```typescript
import { TemplatedNotification } from '@gravito/flare'

class OrderShipped extends TemplatedNotification {
  constructor(order: Order) {
    super('order-shipped', { orderId: order.id })
  }
}
```

## Background Processing

Notifications are sent immediately by default. To send them asynchronously, have the notification class implement `ShouldQueue`:

```typescript
import { ShouldQueue } from '@gravito/flare'

export class OrderShipped extends Notification implements ShouldQueue {
  queue = 'notifications'
  delay = 60 // delay by 60 seconds

  // ...
}
```

---

## Next Steps
Learn how to implement real-time interactions with the [Broadcasting System](./broadcasting.md).
