# @gravito/flare

> Lightweight, high-performance notifications for Gravito with multi-channel delivery (mail, database, broadcast, Slack, SMS).

**Status**: v0.1.0 - core features complete with multiple channel support.

## Features

- **Zero runtime overhead**: Pure type wrappers that delegate to channel drivers
- **Multi-channel delivery**: Mail, database, broadcast, Slack, SMS
- **Modular by design**: Install only the channels you need
- **Queue support**: Works with `@gravito/stream` for async delivery
- **AI-friendly**: Strong typing, clear JSDoc, and predictable APIs

## Installation

```bash
bun add @gravito/flare
```

## Quick Start

### 1. Create a notification

```typescript
import { Notification } from '@gravito/flare'
import type { MailMessage, DatabaseNotification, Notifiable } from '@gravito/flare'

class InvoicePaid extends Notification {
  constructor(private invoice: Invoice) {
    super()
  }

  via(user: Notifiable): string[] {
    return ['mail', 'database']
  }

  toMail(user: Notifiable): MailMessage {
    return {
      subject: 'Invoice Paid',
      view: 'emails.invoice-paid',
      data: { invoice: this.invoice },
      to: user.email,
    }
  }

  toDatabase(user: Notifiable): DatabaseNotification {
    return {
      type: 'invoice-paid',
      data: {
        invoice_id: this.invoice.id,
        amount: this.invoice.amount,
      },
    }
  }
}
```

### 2. Configure OrbitFlare

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitFlare } from '@gravito/flare'
import { OrbitSignal } from '@gravito/signal'
import { OrbitStream } from '@gravito/stream'

const core = await PlanetCore.boot({
  orbits: [
    OrbitSignal.configure({ /* ... */ }),
    OrbitStream.configure({ /* ... */ }),
    OrbitFlare.configure({
      enableMail: true,
      enableDatabase: true,
      enableBroadcast: true,
      channels: {
        slack: {
          webhookUrl: 'https://hooks.slack.com/services/...',
        },
      },
    }),
  ],
})
```

### 3. Send a notification

```typescript
// In a controller
const notifications = c.get('notifications') as NotificationManager

await notifications.send(user, new InvoicePaid(invoice))
```

## Queueing Notifications

```typescript
import { Notification, ShouldQueue } from '@gravito/flare'

class SendEmailNotification extends Notification implements ShouldQueue {
  queue = 'notifications'
  delay = 60 // delay by 60 seconds

  via(user: Notifiable): string[] {
    return ['mail']
  }

  toMail(user: Notifiable): MailMessage {
    return {
      subject: 'Welcome!',
      to: user.email,
      view: 'emails.welcome',
    }
  }
}

await notifications.send(user, new SendEmailNotification())
```

## Channels

### Mail

Requires `@gravito/signal`:

```typescript
via(user: Notifiable): string[] {
  return ['mail']
}

toMail(user: Notifiable): MailMessage {
  return {
    subject: 'Subject',
    view: 'emails.template',
    data: { /* ... */ },
    to: user.email,
  }
}
```

### Database

Requires database support:

```typescript
via(user: Notifiable): string[] {
  return ['database']
}

toDatabase(user: Notifiable): DatabaseNotification {
  return {
    type: 'notification-type',
    data: { /* ... */ },
  }
}
```

### Broadcast

Requires `@gravito/radiance`:

```typescript
via(user: Notifiable): string[] {
  return ['broadcast']
}

toBroadcast(user: Notifiable): BroadcastNotification {
  return {
    type: 'notification-type',
    data: { /* ... */ },
  }
}
```

### Slack

```typescript
via(user: Notifiable): string[] {
  return ['slack']
}

toSlack(user: Notifiable): SlackMessage {
  return {
    text: 'Notification message',
    channel: '#notifications',
  }
}
```

### SMS

```typescript
via(user: Notifiable): string[] {
  return ['sms']
}

toSms(user: Notifiable): SmsMessage {
  return {
    to: user.phone,
    message: 'Notification message',
  }
}
```

## API Reference

### Notification

Every notification should extend `Notification`.

#### Methods

- `via(notifiable: Notifiable): string[]` - Choose delivery channels (required)
- `toMail(notifiable: Notifiable): MailMessage` - Mail payload (optional)
- `toDatabase(notifiable: Notifiable): DatabaseNotification` - Database payload (optional)
- `toBroadcast(notifiable: Notifiable): BroadcastNotification` - Broadcast payload (optional)
- `toSlack(notifiable: Notifiable): SlackMessage` - Slack payload (optional)
- `toSms(notifiable: Notifiable): SmsMessage` - SMS payload (optional)

### NotificationManager

#### Methods

- `send(notifiable: Notifiable, notification: Notification): Promise<void>` - Send notification
- `channel(name: string, channel: NotificationChannel): void` - Register a custom channel

## License

MIT © Carl Lee
