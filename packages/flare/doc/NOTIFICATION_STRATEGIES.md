# Notification Strategies Guide

In a **Galaxy Architecture**, notifications are the primary way to keep users informed about domain events. `@gravito/flare` provides a flexible framework for managing these communications across multiple channels.

## 1. Multi-Channel Routing

A single notification can be delivered through multiple channels simultaneously. You define this in the `via()` method.

```typescript
class OrderUpdate extends Notification {
  via(user: Notifiable) {
    // Logic based on urgency or user data
    return ['mail', 'database', 'slack']
  }
}
```

## 2. Global User Preferences

Users often want to opt-out of certain channels. Flare's `PreferenceMiddleware` handles this automatically across the entire Galaxy.

```typescript
// Satellite A: Settings
app.patch('/settings/notifications', async (c) => {
  const user = c.get('user');
  await user.updatePreferences({
    disabledChannels: ['sms'],
    disabledNotifications: ['marketing']
  });
});

// Satellite B: Marketing (Auto-filtered by Flare)
await notifications.send(user, new MarketingNotification());
```

## 3. Asynchronous Delivery (Queue)

For high-volume notifications, always use the queue. Flare integrates with `@gravito/stream` to process delivery in the background.

```typescript
const notification = new WelcomeEmail(user)
  .onQueue('notifications')
  .delay(60);

await notifications.send(user, notification);
```

## 4. Templating with Localized Content

Flare supports localized templates through integration with `@gravito/cosmos`.

```typescript
class InvoiceReady extends Notification {
  toMail(user: Notifiable) {
    return {
      subject: this.t('notifications.invoice_ready_subject'),
      view: 'emails.invoice',
      data: { invoiceId: this.id }
    }
  }
}
```

## 5. Channel-Level Rate Limiting

Protect your quotas and your users from spam by implementing rate limits per channel.

```typescript
const rateLimiter = new RateLimitMiddleware({
  email: { maxPerMinute: 50 },
  sms: { maxPerHour: 5 }
});

notifications.use(rateLimiter);
```

## 6. Real-time Feedback (Broadcasting)

Use the `broadcast` channel to push notifications directly to the user's browser in real-time via `@gravito/radiance`.

```typescript
via(user) {
  return ['broadcast']
}

toBroadcast(user) {
  return { message: 'New message received!', type: 'info' }
}
```
