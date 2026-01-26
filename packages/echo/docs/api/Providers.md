# Webhook Providers

Providers are the heart of Echo's receiving logic. They handle service-specific details like signature header names, HMAC algorithms, and event type extraction.

## Built-in Providers

Echo comes with several pre-configured providers for popular services:

| Provider | Type Key | Verification Logic | Default Header |
|---|---|---|---|
| **Stripe** | `stripe` | HMAC-SHA256 + Timestamp (`t=`, `v1=`) | `Stripe-Signature` |
| **GitHub** | `github` | HMAC-SHA256 | `X-Hub-Signature-256` |
| **Shopify** | `shopify` | HMAC-SHA256 (Base64) | `X-Shopify-Hmac-Sha256` |
| **Twilio** | `twilio` | HMAC-SHA1 (Base64) | `X-Twilio-Signature` |
| **Slack** | `slack` | HMAC-SHA256 + Timestamp (`v0=`) | `X-Slack-Signature` |
| **Paddle** | `paddle` | HMAC-SHA256 + Timestamp | `Paddle-Signature` |
| **Linear** | `linear` | HMAC-SHA256 | `Linear-Signature` |
| **Generic** | `generic` | HMAC-SHA256 | `X-Webhook-Signature` |

## BaseProvider Class

All providers should extend `BaseProvider` to inherit common utilities for header handling, JSON parsing, and result formatting.

### Protected Methods

- `getHeader(headers, name)`: Case-insensitive header retrieval.
- `safeParseJson(str)`: Safely parses JSON body with error handling.
- `payloadToString(payload)`: Normalizes `string | Buffer` to `string`.
- `createSuccess(payload, options)`: Returns a valid `WebhookVerificationResult`.
- `createFailure(error)`: Returns an invalid `WebhookVerificationResult`.

## Custom Provider Implementation

To support a custom service, implement the `WebhookProvider` interface (or extend `BaseProvider`).

### Step 1: Create the Provider

```typescript
import { BaseProvider, WebhookVerificationResult } from '@gravito/echo'
import { computeHmacSha256 } from './utils'

export class MyCustomProvider extends BaseProvider {
  readonly name = 'my-custom'

  async verify(payload: string | Buffer, headers: any, secret: string): Promise<WebhookVerificationResult> {
    const signature = this.getHeader(headers, 'x-my-signature')
    const body = this.payloadToString(payload)

    if (!signature) return this.createFailure('Missing signature')

    const expected = await computeHmacSha256(body, secret)
    if (signature !== expected) return this.createFailure('Invalid signature')

    const json = this.safeParseJson(body)
    if (!json.success) return this.createFailure(json.error)

    return this.createSuccess(json.data, {
      eventType: (json.data as any).type,
      webhookId: (json.data as any).id
    })
  }
}
```

### Step 2: Register with Receiver

```typescript
const receiver = new WebhookReceiver()
receiver.registerProviderType('my-custom', MyCustomProvider)
receiver.registerProvider('production', 'secret_key', { type: 'my-custom' })
```
