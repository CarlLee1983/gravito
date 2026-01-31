# @gravito/flare

> Lightweight, high-performance notifications for Gravito with multi-channel delivery (mail, database, broadcast, Slack, SMS).

**Status**: v3.4.0 - Production ready with advanced features (Retries, Metrics, Batching, Timeout, Rate Limiting, Preference Driver).

## Features

- **Zero runtime overhead**: Pure type wrappers that delegate to channel drivers
- **Multi-channel delivery**: Mail, database, broadcast, Slack, SMS (Twilio & AWS SNS)
- **High Performance**: Parallel channel execution and batch sending capabilities
- **Reliability**: Built-in retry mechanism with exponential backoff and timeout protection
- **Observability**: Comprehensive metrics with Prometheus support
- **Developer Experience**: Strong typing, lifecycle hooks, and template system
- **Queue support**: Works with `@gravito/stream` for async delivery with Lazy Loading
- **Rate Limiting**: Channel-level rate limiting with Token Bucket algorithm
- **Preference Driver**: User notification preferences with automatic channel filtering
- **Middleware System**: Extensible middleware chain for custom notification processing

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

### Timeout Protection (v3.4.0)
All channels support timeout configuration to prevent slow responses from blocking notifications:

```typescript
OrbitFlare.configure({
  channels: {
    slack: {
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      timeout: 5000, // 5 秒超時
      onTimeout: (channel, notification) => {
        console.error(`Timeout: ${channel}`)
      }
    }
  }
})
```

### Rate Limiting (v3.4.0)
Protect downstream services with channel-level rate limiting:

```typescript
import { RateLimitMiddleware } from '@gravito/flare'

const rateLimiter = new RateLimitMiddleware({
  email: {
    maxPerSecond: 10,
    maxPerMinute: 100,
    maxPerHour: 1000
  },
  sms: {
    maxPerSecond: 5
  }
})

notifications.use(rateLimiter)

// 檢查狀態
const status = rateLimiter.getStatus('email')
console.log(`剩餘: ${status.second}/10`)
```

### Lazy Loading for Queue (v3.4.0)
Optimize queue serialization with Lazy Loading pattern:

```typescript
import { LazyNotification } from '@gravito/flare'

class OrderConfirmation extends LazyNotification<Order> {
  constructor(private orderId: string) {
    super()
  }

  protected async loadData(notifiable: Notifiable): Promise<Order> {
    return await db.orders.find(this.orderId)
  }

  via(user: Notifiable): string[] {
    return ['mail', 'database']
  }

  async toMail(user: Notifiable): Promise<MailMessage> {
    const order = await this.ensureLoaded(user)
    return {
      subject: `訂單確認 #${order.id}`,
      view: 'emails.order-confirmation',
      data: { order },
      to: user.email,
    }
  }
}
```

### User Preferences (v3.4.0)
Respect user notification preferences automatically:

```typescript
import { PreferenceMiddleware } from '@gravito/flare'

// 方式 1: 在 OrbitFlare 配置中啟用
OrbitFlare.configure({
  enablePreference: true
})

// 方式 2: 使用自定義偏好提供者
const preferenceMiddleware = new PreferenceMiddleware({
  async getUserPreferences(notifiable) {
    const prefs = await db.userPreferences.find(notifiable.id)
    return {
      enabledChannels: prefs.enabledChannels,
      disabledChannels: prefs.disabledChannels,
      disabledNotifications: prefs.disabledNotifications
    }
  }
})

notifications.use(preferenceMiddleware)

// 方式 3: 在 Notifiable 物件中實作
class User implements Notifiable {
  async getNotificationPreferences() {
    return {
      enabledChannels: ['email', 'slack'],
      disabledChannels: ['sms']
    }
  }
}
```

### Middleware Chain (v3.4.0)
Combine multiple middleware for powerful notification processing:

```typescript
import { RateLimitMiddleware, PreferenceMiddleware } from '@gravito/flare'

// 建立中介層
const rateLimiter = new RateLimitMiddleware({ /* ... */ })
const preferenceFilter = new PreferenceMiddleware({ /* ... */ })

// 註冊中介層（執行順序：由內而外）
notifications
  .use(rateLimiter)      // 先限流
  .use(preferenceFilter) // 後過濾

// 或在 OrbitFlare 配置中一次註冊
OrbitFlare.configure({
  middleware: [rateLimiter, preferenceFilter]
})
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
