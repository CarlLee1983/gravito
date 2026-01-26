# Observability

Echo is built with observability as a first-class citizen. It provides structured logging, granular metrics, and distributed tracing to help you monitor the health of your webhook ecosystem.

## Logging

Echo uses a structured logger to provide context-rich logs for every significant event (verification, delivery attempts, retries).

### EchoLogger Interface

```typescript
export interface EchoLogger {
  debug(message: string, context?: Record<string, unknown>): void
  info(message: string, context?: Record<string, unknown>): void
  warn(message: string, context?: Record<string, unknown>): void
  error(message: string, context?: Record<string, unknown>): void
}
```

### Built-in: ConsoleEchoLogger

A default implementation that logs to the console in a structured JSON-like format.

## Metrics

Echo exposes several metrics to track throughput, latency, and error rates.

### EchoMetrics Constants

| Metric Name | Type | Description |
|---|---|---|
| `echo_incoming_webhooks_total` | Counter | Total incoming webhooks received. |
| `echo_incoming_duration_seconds`| Histogram | Latency of webhook processing. |
| `echo_incoming_verification_failures_total` | Counter | Total signature verification failures. |
| `echo_outgoing_webhooks_total` | Counter | Total outgoing webhook attempts. |
| `echo_outgoing_duration_seconds`| Histogram | Latency of external delivery. |
| `echo_outgoing_retries_total` | Counter | Total number of retry attempts. |
| `echo_outgoing_failures_total` | Counter | Total permanent delivery failures. |

### Built-in: PrometheusMetricsProvider

Integrates with Prometheus-style metrics collectors.

## Tracing

Echo supports distributed tracing with an interface compatible with OpenTelemetry.

### Tracer & Span

- **`Tracer`**: Used to start spans and wrap operations in `withSpan`.
- **`Span`**: Allows setting attributes (like `http.status_code`, `echo.provider`) and recording events (`verification_start`, `handlers_complete`).

### Span Attributes

Echo automatically populates spans with useful attributes:
- `echo.direction`: `incoming` or `outgoing`.
- `echo.provider`: The name of the provider (Stripe, GitHub, etc.).
- `echo.event_type`: The normalized event name.
- `http.status_code`: For outgoing requests.

## Setup Example

```typescript
import { 
  OrbitEcho, 
  ConsoleEchoLogger, 
  PrometheusMetricsProvider 
} from '@gravito/echo'

const echo = new OrbitEcho({
  observability: {
    logger: new ConsoleEchoLogger(),
    metrics: new PrometheusMetricsProvider(),
    // tracer: myOpenTelemetryTracer
  }
})
```
