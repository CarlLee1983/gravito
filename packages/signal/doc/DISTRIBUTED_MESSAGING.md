# Distributed Messaging Guide

`@gravito/signal` is built to be the communication layer of the Gravito ecosystem. This guide explains how to integrate it with other orbits for asynchronous and distributed messaging.

## 1. Queue Integration (OrbitStream)

For maximum performance, you should send emails in the background. `OrbitSignal` automatically uses `@gravito/stream` if it's installed in the container.

### Asynchronous Sending

```typescript
// Inside your route handler
const email = new WelcomeEmail(user)
  .onQueue('notifications') // Specify a custom queue name
  .delay(300)                // Send in 5 minutes (300 seconds)

await email.queue()
```

### Queue Configuration

Ensure your `OrbitStream` is configured correctly:

```typescript
import { OrbitStream, RedisDriver } from '@gravito/stream'

const stream = new OrbitStream({
  driver: new RedisDriver({ host: 'localhost' }),
  queues: ['notifications']
})
```

## 2. Webhook Handling & Feedback Loops

Handling inbound delivery events (bounces, clicks, opens) is crucial for maintaining your email reputation and updating system state.

### Configuring Webhook Drivers

```typescript
import { OrbitSignal, SesWebhookDriver } from '@gravito/signal'

const mail = new OrbitSignal({
  // ... configuration
  webhookPrefix: '/api/v1/mail-events',
  webhookDrivers: {
    ses: new SesWebhookDriver()
  }
})
```

### Listening to Webhook Events

Use `OrbitSignal`'s built-in event bus to respond to delivery status updates:

```typescript
mail.on('webhookReceived', async (event) => {
  const { driver, event: type, payload } = event.webhook

  if (driver === 'ses' && type === 'Bounce') {
    // 1. Update Membership Satellite state
    await userService.markEmailAsInvalid(payload.mail.destination[0])
    
    // 2. Log for auditing
    core.logger.warn(`Email bounce detected for ${payload.mail.destination[0]}`)
  }
})
```

## 3. Distributed Tracing

Every `Signal` event is automatically linked to the Gravito request trace ID. You can track an email from the moment it was triggered by a user's web request to its delivery in the background worker.

- **Trace ID**: Automatically injected into the message metadata.
- **Log Correlation**: All email-related logs include the trace context.

## 4. Resilience Patterns

- **Automatic Retries**: `BaseTransport` provides built-in retry logic with exponential backoff for network-related failures.
- **Dead Letter Queue (DLQ)**: Failed emails in the queue can be automatically moved to a DLQ for manual inspection and re-queueing.
