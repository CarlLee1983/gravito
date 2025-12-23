# @gravito/echo

> 📡 Enterprise-grade webhook handling for Gravito. Secure receiving and reliable sending.

## Features

- **Secure Receiving** - HMAC signature verification, timestamp validation
- **Built-in Providers** - Stripe, GitHub, and generic provider support
- **Reliable Sending** - Exponential backoff retry with configurable strategy
- **Gravito Integration** - First-class OrbitEcho module for PlanetCore

## Installation

```bash
bun add @gravito/echo
```

## Quick Start

### Receiving Webhooks

```typescript
import { OrbitEcho, WebhookReceiver } from '@gravito/echo'

const core = new PlanetCore()

// Install Echo module
core.install(new OrbitEcho({
  providers: {
    stripe: { name: 'stripe', secret: process.env.STRIPE_WEBHOOK_SECRET! },
    github: { name: 'github', secret: process.env.GITHUB_WEBHOOK_SECRET! }
  }
}))

// Get receiver and add handlers
const receiver = core.container.make<WebhookReceiver>('echo.receiver')

// Handle specific events
receiver.on('stripe', 'payment_intent.succeeded', async (event) => {
  console.log('Payment received:', event.payload)
})

receiver.on('github', 'push', async (event) => {
  console.log('Push event:', event.payload)
})
```

### Webhook Endpoint

```typescript
app.post('/webhooks/:provider', async (c) => {
  const provider = c.req.param('provider')
  const body = await c.req.text()
  const headers = c.req.raw.headers

  const receiver = c.get('echo.receiver') as WebhookReceiver
  const result = await receiver.handle(provider, body, Object.fromEntries(headers))

  if (!result.valid) {
    return c.json({ error: result.error }, 401)
  }

  return c.json({ received: true })
})
```

### Sending Webhooks

```typescript
import { WebhookDispatcher } from '@gravito/echo'

const dispatcher = new WebhookDispatcher({
  secret: process.env.OUTGOING_WEBHOOK_SECRET!,
  retry: {
    maxAttempts: 5,
    initialDelay: 1000,
    backoffMultiplier: 2
  }
})

// Send webhook with automatic retry
const result = await dispatcher.dispatch({
  url: 'https://example.com/webhook',
  event: 'order.created',
  data: { orderId: 123, total: 99.99 }
})

if (result.success) {
  console.log('Webhook delivered:', result.statusCode)
} else {
  console.error('Delivery failed:', result.error)
}
```

## Providers

### Built-in Providers

| Provider | Signature Method | Header |
|----------|-----------------|--------|
| `stripe` | HMAC-SHA256 + Timestamp | `Stripe-Signature` |
| `github` | HMAC-SHA256 | `X-Hub-Signature-256` |
| `generic` | HMAC-SHA256 | `X-Webhook-Signature` |

### Custom Provider

```typescript
import { WebhookProvider, WebhookReceiver } from '@gravito/echo'

class MyProvider implements WebhookProvider {
  readonly name = 'my-provider'

  async verify(payload, headers, secret) {
    // Custom verification logic
    return { valid: true, payload: JSON.parse(payload) }
  }
}

receiver.registerProviderType('my-provider', MyProvider)
receiver.registerProvider('custom', 'secret', { type: 'my-provider' })
```

## Configuration

### WebhookDispatcher

```typescript
interface WebhookDispatcherConfig {
  /** Secret for signing outgoing webhooks */
  secret: string

  /** Retry configuration */
  retry?: {
    maxAttempts?: number      // default: 3
    initialDelay?: number     // default: 1000ms
    backoffMultiplier?: number // default: 2
    maxDelay?: number         // default: 300000ms (5min)
    retryableStatuses?: number[] // default: [408, 429, 500, 502, 503, 504]
  }

  /** Request timeout in ms */
  timeout?: number  // default: 30000

  /** Custom User-Agent */
  userAgent?: string
}
```

### OrbitEcho

```typescript
interface EchoConfig {
  /** Registered webhook providers */
  providers?: Record<string, {
    name: string
    secret: string
    tolerance?: number  // timestamp tolerance in seconds
  }>

  /** Dispatcher configuration */
  dispatcher?: WebhookDispatcherConfig

  /** Base path for webhook endpoints */
  basePath?: string  // default: '/webhooks'
}
```

## License

MIT
