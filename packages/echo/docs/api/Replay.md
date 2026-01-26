# Webhook Replay Service

The `WebhookReplayService` allows you to resend historical outgoing events. This is useful for recovering from destination downtime or re-syncing data.

## Overview

The replay service uses the `WebhookStore` to find historical events and the `WebhookDispatcher` to resend them.

## Constructor

```typescript
constructor(store: WebhookStore, dispatcher: WebhookDispatcher)
```

## Methods

### `replay(options)`

Triggers the replay of one or more events based on the provided filters.

- `options` (`ReplayOptions`):
    - `eventIds` (`string[]?`): Specific event IDs to replay.
    - `timeRange` (`{ from: Date; to: Date }?`): Filter events by a time window.
    - `provider` (`string?`): Filter by provider name.
    - `eventType` (`string?`): Filter by event type.
    - `targetUrl` (`string?`): Override the destination URL (useful for testing).
    - `dryRun` (`boolean?`): If true, simulates the replay without actually sending requests.

**Returns**: `Promise<ReplayResult>`

## ReplayResult Interface

| Property | Type | Description |
|---|---|---|
| `total` | `number` | Total events matched. |
| `replayed` | `number` | Successfully replayed events. |
| `skipped` | `number` | Events skipped (e.g., non-outgoing events). |
| `failed` | `number` | Events that failed during redelivery. |
| `events` | `Array` | Individual results per event ID. |

## Example

```typescript
import { WebhookReplayService } from '@gravito/echo'

const replayService = new WebhookReplayService(store, dispatcher)

const result = await replayService.replay({
  timeRange: {
    from: new Date('2023-01-01'),
    to: new Date('2023-01-02')
  },
  provider: 'stripe'
})

console.log(`Replayed ${result.replayed} events.`)
```
