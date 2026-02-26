# Event-Driven Architecture Guide

In a **Galaxy Architecture**, Satellites should be highly decoupled. `@gravito/stream` provides the infrastructure to build Event-Driven Architecture (EDA) by treating Jobs as Domain Events.

## 1. Domain Events vs. Commands

- **Command (Job)**: "Do this specific thing." Ex: `ProcessOrder` -> Executed once.
- **Event**: "This thing happened." Ex: `OrderCreated` -> Can be consumed by multiple Satellites.

### Creating an Event

Define an event as a subclass of `Job`:

```typescript
import { Job } from '@gravito/stream'

export class OrderCreated extends Job {
  constructor(public readonly orderId: string, public readonly amount: number) {
    super()
  }

  // Events typically don't have a 'handle' method themselves if they are 
  // broadcasted. Instead, listeners subscribe to them.
}
```

## 2. Cross-Satellite Communication

Instead of Satellite A calling Satellite B's API (via `Beam`), Satellite A can emit an event to the stream, and Satellite B can independently consume it.

### Publishing (Satellite A: Order)

```typescript
import { OrderCreated } from '@satellites/order/events'

app.post('/checkout', async (c) => {
  const queue = c.get('queue')
  // ... process order logic ...

  // Publish event to the broker (e.g., Kafka/Redis)
  await queue.push(new OrderCreated(order.id, order.amount))
    .onQueue('events.order')

  return c.json({ success: true })
})
```

### Consuming (Satellite B: Notification)

Satellite B sets up a worker pool to listen to the specific queue:

```typescript
// satellites/notification/worker.ts
import { Consumer } from '@gravito/stream'

export const startNotificationWorker = (manager) => {
  const consumer = new Consumer(manager, {
    queues: ['events.order'],
    concurrency: 5
  })

  // Listen for the specific event type
  consumer.on('OrderCreated', async (event: OrderCreated) => {
    await emailService.sendReceipt(event.orderId)
  })

  consumer.start()
}
```

## 3. Reliability & Dead Letter Queues (DLQ)

When building an EDA, it is guaranteed that some events will fail processing.

- **Automatic Retries**: Configure the `Consumer` or the `Job` to retry with exponential backoff.
- **DLQ**: When a job exhausts all retries, `@gravito/stream` moves it to a DLQ queue (e.g., `events.order:failed`). You can monitor this queue and replay jobs once the issue is fixed.

## 4. Selecting the Right Broker

- **Redis**: Best for standard background jobs, delayed tasks, and small-to-medium scale EDAs.
- **Kafka**: Best for massive scale, event sourcing, log compaction, and pub/sub patterns where multiple consumer groups read the same event.
- **RabbitMQ**: Best for complex routing topographies (exchanges/bindings) and traditional AMQP setups.
