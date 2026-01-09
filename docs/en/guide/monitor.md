---
title: Monitoring (Monitor)
description: Learn how to perform health checks, metrics collection, and tracing with Gravito Monitor.
---

# Monitoring (Monitor)

> `@gravito/monitor` provides comprehensive observability for your application, supporting Prometheus, OpenTelemetry, and Kubernetes-style health checks.

## Beta Notes

For 1.0.0-beta, observability focuses on fast startup and low-overhead runtime metrics in Bun. Health checks, metrics, and tracing are enabled as opt-in features so production setups can stay lean.

## Health Checks

Built-in `/healthz` and `/readyz` endpoints, perfect for cloud-native environments.

```typescript
import { PlanetCore } from '@gravito/core'
import { OrbitMonitor } from '@gravito/monitor'

export default PlanetCore.configure({
  orbits: [
    OrbitMonitor.configure({
      health: {
        path: '/healthz',
        checks: [
          async () => ({ name: 'db', status: 'up' })
        ]
      }
    })
  ]
})
```

## Metrics

Built-in Prometheus-compatible `/metrics` endpoint.

```typescript
const monitor = c.get('monitor')
monitor.counter('requests_total').inc()
```

## Tracing

Integrated with OpenTelemetry, automatically tracing HTTP requests and database operations.

```typescript
OrbitMonitor.configure({
  tracing: {
    serviceName: 'my-service',
    exporter: 'otlp'
  }
})
```

---

## Next Steps
Learn how to track errors with the [Logging System](./logging.md).
