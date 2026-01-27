# WebhookReceiver

The `WebhookReceiver` class is responsible for managing webhook providers, verifying incoming signatures, and routing events to their respective handlers.

## Overview

- **Provider Management**: Register and configure multiple providers (Stripe, GitHub, etc.).
- **Signature Verification**: Automatically validates HMAC signatures and timestamps.
- **Event Routing**: Route specific events or all events from a provider to async handlers.
- **Persistence**: Optionally log all incoming events to a persistent store.
- **Observability**: Built-in support for metrics, tracing, and structured logging.

## Constructor

```typescript
constructor()
```

Initializes a new `WebhookReceiver` with all built-in provider types pre-registered.

## Methods

### `registerProvider(name, secret, options?)`

Registers a specific instance of a provider with its secret key.

- `name` (`string`): A unique name for this provider instance (e.g., `'stripe-production'`).
- `secret` (`string`): The secret key for signature verification.
- `options` (`{ type?: string; tolerance?: number }`):
    - `type`: The type of provider (defaults to `name`).
    - `tolerance`: Maximum allowed time drift in seconds (default: 300).

### `on(providerName, eventType, handler)`

Registers a handler for a specific event type from a provider.

```typescript
receiver.on('stripe', 'payment_intent.succeeded', async (event) => {
  // Logic
})
```

### `onAll(providerName, handler)`

Registers a handler that receives all valid events from a specific provider.

### `handle(providerName, body, headers)`

The main entry point for processing an incoming webhook.

- `body` (`string | Buffer`): The raw request body.
- `headers` (`Record<string, string | string[] | undefined>`): The HTTP headers.

**Returns**: `Promise<WebhookVerificationResult & { handled: boolean; eventId?: string }>`

### `registerProviderType(name, ProviderClass)`

Registers a custom provider implementation.

### `setStore(store)` / `setMetrics(metrics)` / `setTracer(tracer)` / `setLogger(logger)`

Configures the receiver's dependencies for storage and observability.

## WebhookEvent Interface

Handlers receive a `WebhookEvent` object:

| Property | Type | Description |
|---|---|---|
| `provider` | `string` | Name of the provider. |
| `type` | `string` | Normalized event type. |
| `payload` | `any` | Parsed JSON body. |
| `headers` | `Record<string, any>` | Original HTTP headers. |
| `rawBody` | `string` | Unmodified request body. |
| `receivedAt` | `Date` | Timestamp of arrival. |
| `id` | `string?` | Source-provided unique ID. |

## Built-in Providers

The following provider types are available out-of-the-box:

| Type | Description |
|---|---|
| `stripe` | Stripe HMAC-SHA256 with timestamp validation. |
| `github` | GitHub X-Hub-Signature-256. |
| `shopify` | Shopify HMAC-SHA256 (Base64). |
| `twilio` | Twilio HMAC-SHA1 signature. |
| `slack` | Slack v0 signature with timestamp. |
| `paddle` | Paddle HMAC-SHA256 signature. |
| `linear` | Linear HMAC-SHA256 signature. |
| `generic` | Generic HMAC-SHA256 signature (`X-Webhook-Signature`). |
