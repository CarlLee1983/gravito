# Storage

The `WebhookStore` interface defines the contract for persisting both incoming and outgoing webhook events. This is essential for audit logging, debugging, and event replaying.

## WebhookStore Interface

To implement a custom storage backend (e.g., PostgreSQL, MongoDB, Redis), you must fulfill the following contract:

```typescript
export interface WebhookStore {
  /** Save a record of an incoming webhook from a provider */
  saveIncomingEvent(event: IncomingWebhookRecord): Promise<string>

  /** Save a record of an outgoing webhook attempt */
  saveOutgoingEvent(event: OutgoingWebhookRecord): Promise<string>

  /** Update the delivery attempts for an outgoing webhook */
  updateDeliveryAttempt(id: string, attempt: DeliveryAttempt): Promise<void>

  /** Retrieve a specific event by ID */
  getEvent(id: string): Promise<WebhookRecord | null>

  /** Query events with filters */
  queryEvents(filter: EventQueryFilter): Promise<WebhookRecord[]>

  /** Mark an incoming event as successfully processed */
  markProcessed(id: string): Promise<void>

  /** Mark an incoming event as failed during processing */
  markFailed(id: string, error: string): Promise<void>
}
```

## Record Types

### IncomingWebhookRecord

Represents a webhook received from an external service.

| Property | Type | Description |
|---|---|---|
| `provider` | `string` | The provider name (e.g., 'stripe'). |
| `eventType`| `string` | The type of event. |
| `payload` | `any` | The parsed JSON payload. |
| `headers` | `Record<string, string>` | Filtered HTTP headers. |
| `rawBody` | `string` | The raw request body string. |
| `status` | `'pending' \| 'processed' \| 'failed'` | Current processing state. |

### OutgoingWebhookRecord

Represents a webhook sent by Echo to an external service.

| Property | Type | Description |
|---|---|---|
| `url` | `string` | Destination URL. |
| `event` | `string` | Event name. |
| `payload` | `any` | Data sent in the body. |
| `status` | `'pending' \| 'delivered' \| 'failed'` | Delivery state. |
| `attempts` | `DeliveryAttempt[]` | History of retry attempts. |

## Built-in Implementations

### MemoryWebhookStore

A simple in-memory implementation useful for testing and local development. **Note: Data is lost when the process restarts.**

```typescript
import { MemoryWebhookStore, OrbitEcho } from '@gravito/echo'

const echo = new OrbitEcho({
  store: new MemoryWebhookStore()
})
```

## Custom Implementation Example

```typescript
import { WebhookStore, IncomingWebhookRecord } from '@gravito/echo'

class PrismaWebhookStore implements WebhookStore {
  async saveIncomingEvent(event: IncomingWebhookRecord) {
    const record = await prisma.webhookLog.create({
      data: { ...event, direction: 'INCOMING' }
    })
    return record.id
  }
  // ... implement other methods
}
```
