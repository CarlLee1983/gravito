# Webhook Reliability Guide

In a distributed **Galaxy**, webhooks are often the bridge between your system and the outside world. `@gravito/echo` ensures this bridge is secure and never collapses.

## 1. Outgoing Webhooks: The Reliability Stack

Sending a webhook is more than just a `fetch` call. Echo uses a tiered approach:

1. **Retry Scheduler**: If the target server is temporarily down, Echo retries with exponential backoff.
2. **Circuit Breaker**: If a target server fails consistently, Echo opens the circuit to prevent wasting resources and potentially overwhelming the target once it recovers.
3. **Dead Letter Queue (DLQ)**: Failed webhooks that exhaust all retries are saved for manual inspection and replay.

```typescript
const result = await dispatcher.dispatch({
  url: 'https://3rdparty.com/webhook',
  event: 'shipment.ready',
  data: { id: 123 }
})
```

## 2. Secure Key Rotation

Never let your secrets grow stale. Use the `KeyRotation` feature to update your signing keys without dropping valid webhooks.

```typescript
await echo.rotateProviderKey('stripe', {
  key: 'new_secret_key',
  version: 'v2',
  activeFrom: new Date()
})
```
*Echo will accept both the old and new keys during the configured grace period.*

## 3. Handling Large Payloads

For incoming webhooks with large bodies (e.g., Shopify batch updates), Echo's **Request Buffer** ensures the raw body is preserved for signature verification, even if your global middleware attempts to parse it as JSON.

```typescript
requestBuffer: {
  enabled: true,
  maxBodySize: 50 * 1024 * 1024 // Allow up to 50MB
}
```

## 4. Observability Integration

Echo integrates with `@gravito/monitor` to expose:
- `echo_webhook_delivered_total`: Counter of successful deliveries.
- `echo_webhook_failed_total`: Counter of failed deliveries.
- `echo_circuit_state`: Gauge of circuit breaker status per host.
