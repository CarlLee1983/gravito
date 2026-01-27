# WebhookDispatcher

The `WebhookDispatcher` class is responsible for sending signed webhooks to external services with a reliable delivery mechanism.

## Overview

- **Reliable Sending**: Built-in exponential backoff retry logic.
- **Signed Payloads**: Automatically signs outgoing requests using HMAC-SHA256.
- **Batch Processing**: Send multiple webhooks concurrently with concurrency control.
- **Dead Letter Queue (DLQ)**: Automatically routes permanently failed webhooks to a DLQ for later inspection or manual retry.
- **Observability**: Instrumented with metrics and distributed tracing.

## Constructor

```typescript
constructor(config: WebhookDispatcherConfig)
```

Creates a new dispatcher instance.

### WebhookDispatcherConfig

| Property | Type | Description |
|---|---|---|
| `secret` | `string` | Secret key for signing outgoing webhooks. |
| `retry` | `RetryConfig?` | Optional retry strategy. |
| `timeout` | `number?` | Request timeout in ms (default: 30,000). |
| `userAgent` | `string?` | Custom User-Agent header. |

### RetryConfig

| Property | Type | Default | Description |
|---|---|---|---|
| `maxAttempts` | `number` | `3` | Maximum number of delivery attempts. |
| `initialDelay` | `number` | `1000` | Initial delay before the first retry (ms). |
| `backoffMultiplier`| `number` | `2` | Multiplier for subsequent retry delays. |
| `maxDelay` | `number` | `300,000` | Upper bound for the retry delay (ms). |
| `retryableStatuses`| `number[]` | `[408, 429, 500, 502, 503, 504]` | HTTP codes that trigger a retry. |

## Methods

### `dispatch(payload)`

Sends a single webhook with automatic retries.

- `payload` (`WebhookPayload`):
    - `url` (`string`): Destination URL.
    - `event` (`string`): Event name.
    - `data` (`any`): Data payload to be JSON-encoded.
    - `id` (`string?`): Optional unique identifier.

**Returns**: `Promise<WebhookDeliveryResult>`

### `dispatchBatch(payloads, options?)`

Sends a batch of webhooks concurrently.

- `options` (`BatchDispatchOptions`):
    - `concurrency`: Max concurrent requests (default: 5).
    - `stopOnFirstFailure`: Stop the batch if any request fails (default: false).

### `retryFromDlq(id)`

Attempts to redeliver a failed event from the configured Dead Letter Queue.

### `setDeadLetterQueue(dlq)` / `setMetrics(metrics)` / `setTracer(tracer)`

Configures the dispatcher's dependencies.

## WebhookDeliveryResult Interface

| Property | Type | Description |
|---|---|---|
| `success` | `boolean` | True if status code was 2xx. |
| `statusCode`| `number?` | HTTP status code from the server. |
| `body` | `string?` | Response body from the server. |
| `error` | `string?` | Error message (e.g., "HTTP 500" or network error). |
| `attempt` | `number` | Which attempt succeeded or finally failed. |
| `duration` | `number` | Time elapsed for the final request in ms. |
| `deliveredAt`| `Date` | Timestamp of completion. |

## Examples

### Sending with Retry

```typescript
const result = await dispatcher.dispatch({
  url: 'https://api.partner.com/webhook',
  event: 'order.fulfilled',
  data: { orderId: 'ORD-123' }
})

if (result.success) {
  console.log('Delivered in', result.duration, 'ms')
}
```

### Concurrent Batch Dispatch

```typescript
await dispatcher.dispatchBatch([
  { url: 'https://a.com', event: 'ping', data: {} },
  { url: 'https://b.com', event: 'ping', data: {} }
], { concurrency: 10 })
```
