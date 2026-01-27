# Dead Letter Queue (DLQ)

The Dead Letter Queue (DLQ) is a specialized storage mechanism for events that have permanently failed after all retry attempts have been exhausted.

## Overview

When the `WebhookDispatcher` fails to deliver a webhook after `maxAttempts`, it automatically enqueues the failure into the configured DLQ. This allows developers to:
1. Inspect the reason for failure (e.g., specific HTTP 4xx errors).
2. Manually trigger a redelivery once the destination service is fixed.
3. Monitor system reliability and partner uptime.

## DeadLetterQueue Interface

```typescript
export interface DeadLetterQueue {
  /** Add a failed event to the queue */
  enqueue(event: DeadLetterEvent): Promise<string>

  /** Get a list of failed events for inspection */
  peek(limit?: number): Promise<DeadLetterEvent[]>

  /** Remove an event after successful manual redelivery */
  dequeue(id: string): Promise<void>

  /** Get the current count of failed events */
  size(): Promise<number>

  /** Clear all events from the queue */
  clear(): Promise<void>
}
```

## DeadLetterEvent Structure

| Property | Type | Description |
|---|---|---|
| `type` | `'incoming' \| 'outgoing'` | Direction of the failed event. |
| `originalEvent` | `WebhookRecord` | The full event data that failed. |
| `failureReason` | `string` | Error message or HTTP status. |
| `failedAt` | `Date` | Timestamp of the final failure. |
| `retryCount` | `number` | Number of attempts made. |

## Built-in Implementations

### MemoryDeadLetterQueue

An in-memory queue. Best for small-scale apps or testing.

```typescript
import { MemoryDeadLetterQueue, OrbitEcho } from '@gravito/echo'

const echo = new OrbitEcho({
  deadLetterQueue: new MemoryDeadLetterQueue()
})
```

## Integration with Dispatcher

The `WebhookDispatcher` integrates with the DLQ automatically if one is provided in the configuration.

```typescript
const dispatcher = echo.getDispatcher()

// Attempt manual retry from DLQ
const result = await dispatcher.retryFromDlq('event-id-123')
if (result?.success) {
  console.log('Successfully redelivered from DLQ')
}
```
