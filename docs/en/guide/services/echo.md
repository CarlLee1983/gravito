---
title: Webhooks (Echo)
description: Learn how to safely receive and send Webhooks with Gravito Echo.
---

# Webhooks (Echo)

> `@gravito/echo` provides a beautiful and secure Webhook solution, featuring signature verification, automatic retries, and multiple providers.

## Receiving Webhooks

Safely receive events from Stripe, GitHub, or custom services.

```typescript
import { Echo } from '@gravito/echo'

core.app.post('/webhooks/stripe', async (c) => {
  const echo = c.get('echo')
  
  // Verify signature and process event automatically
  const event = await echo.receive('stripe', c.req)
  
  if (event.type === 'checkout.session.completed') {
    // Process order...
  }

  return c.json({ received: true })
})
```

## Sending Webhooks

Send notifications to external services with built-in reliable retries.

```typescript
const echo = c.get('echo')

await echo.send('https://example.com/callback', {
  event: 'order.created',
  data: { id: 123 }
}, {
  secret: 'your_signing_secret'
})
```

## Supported Providers

- Stripe
- GitHub
- Shopify
- Slack
- Custom (Hmac)

---

## Next Steps
Learn how to notify users with the [Notification System](./notifications.md).
