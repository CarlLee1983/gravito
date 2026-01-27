# @gravito/flare

> Lightweight, high-performance notifications for Gravito with multi-channel delivery (mail, database, broadcast, Slack, SMS).

**Status**: v3.3.0 - Production ready with advanced features (Retries, Metrics, Batching).

## Features

- **Zero runtime overhead**: Pure type wrappers that delegate to channel drivers
- **Multi-channel delivery**: Mail, database, broadcast, Slack, SMS (Twilio & AWS SNS)
- **High Performance**: Parallel channel execution and batch sending capabilities
- **Reliability**: Built-in retry mechanism with exponential backoff
- **Observability**: Comprehensive metrics with Prometheus support
- **Developer Experience**: Strong typing, lifecycle hooks, and template system
- **Queue support**: Works with `@gravito/stream` for async delivery

## Installation

```bash
bun add @gravito/flare
```

## Quick Start

### 1. Configure OrbitFlare

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitFlare } from '@gravito/flare'

const core = await PlanetCore.boot({
  orbits: [
    OrbitFlare.configure({
      enableMail: true,
      enableDatabase: true,
      channels: {
        slack: { webhookUrl: process.env.SLACK_WEBHOOK_URL },
        sms: {
          provider: 'aws-sns', // or 'twilio'
          region: 'us-east-1'
        }
      },
      // Optional: Global retry policy
      retry: {
        maxAttempts: 3,
        backoff: 'exponential',
        baseDelay: 1000
      }
    }),
  ],
})
```

### 2. Create a notification

```typescript
import { Notification } from '@gravito/flare'
import type { MailMessage, Notifiable } from '@gravito/flare'

class WelcomeNotification extends Notification {
  constructor(private name: string) {
    super()
  }

  via(user: Notifiable): string[] {
    return ['mail', 'database']
  }

  toMail(user: Notifiable): MailMessage {
    return {
      subject: 'Welcome!',
      view: 'emails.welcome',
      data: { name: this.name },
      to: user.email,
    }
  }

  // Define per-notification retry logic
  retry = {
    maxAttempts: 5,
    backoff: 'linear' as const
  }
}
```

### 3. Send a notification

```typescript
const notifications = c.get('notifications') as NotificationManager

// Simple send
const result = await notifications.send(user, new WelcomeNotification('Alice'))

if (result.failed.length > 0) {
  console.error('Some channels failed:', result.failed)
}

// Batch send (high performance)
await notifications.sendBatch(users, new SystemUpdateNotification())
```

## Advanced Features

### Retries
Configure retries globally or per-notification:

```typescript
// Per-notification
class CriticalAlert extends Notification {
  shouldRetry(attempt: number, error: Error): boolean {
    return attempt < 5 && isRetryable(error)
  }
}
```

### Metrics
Enable metrics to track success rates and latency:

```typescript
const metrics = new NotificationMetricsCollector()
notifications.setMetricsCollector(metrics)

// Export to Prometheus
const promData = toPrometheusFormat(metrics.getSummary())
```

### Hooks
Listen to lifecycle events:

```typescript
notifications.on('notification:failed', ({ notification, error }) => {
  logger.error('Notification failed completely', error)
})
```

### Templates
Use `TemplatedNotification` for consistent messaging:

```typescript
class OrderShipped extends TemplatedNotification {
  constructor(order: Order) {
    super('order-shipped', { orderId: order.id })
  }
}
```

## API Reference

### NotificationManager

#### Methods

- `send(notifiable: Notifiable, notification: Notification, options?: SendOptions): Promise<NotificationResult>`
- `sendBatch(notifiables: Notifiable[], notification: Notification): Promise<BatchResult>`
- `sendBatchStream(iterator: AsyncIterator<Notifiable>, notification: Notification): Promise<BatchResult>`

### Notification

#### Methods

- `via(notifiable: Notifiable): string[]` - Choose delivery channels
- `toMail`, `toDatabase`, `toBroadcast`, `toSlack`, `toSms` - Channel payloads
- `shouldRetry(attempt: number, error: Error): boolean` - Custom retry logic

## License

MIT © Carl Lee
