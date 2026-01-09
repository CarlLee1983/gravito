# @gravito/monitor

Lightweight observability module for Gravito - Health Checks, Metrics, and Tracing.

## Features

- 🏥 **Health Checks** - Kubernetes-ready `/health`, `/ready`, `/live` endpoints
- 📊 **Metrics** - Prometheus-compatible `/metrics` endpoint
- 🔍 **Tracing** - OpenTelemetry OTLP support (via external Collector)

## Installation

```bash
bun add @gravito/monitor
```

For OpenTelemetry tracing (optional):

```bash
bun add @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http
```

## Quick Start

```typescript
import { PlanetCore } from '@gravito/core'
import { MonitorOrbit } from '@gravito/monitor'

const core = new PlanetCore()

core.orbit(new MonitorOrbit({
  health: {
    enabled: true,
    path: '/health',
    readyPath: '/ready',
    livePath: '/live',
  },
  metrics: {
    enabled: true,
    path: '/metrics',
    prefix: 'myapp_',
  },
  tracing: {
    enabled: true,
    serviceName: 'my-gravito-app',
    endpoint: 'http://localhost:4318/v1/traces',
  },
}))

await core.liftoff()
```

## Health Checks

### Default Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Full health check with all registered checks |
| `GET /ready` | Kubernetes readiness probe |
| `GET /live` | Kubernetes liveness probe |

### Registering Custom Checks

```typescript
const monitor = core.services.get('monitor')

// Register a database check
monitor.health.register('database', async () => {
  const isConnected = await db.ping()
  return isConnected 
    ? { status: 'healthy' }
    : { status: 'unhealthy', message: 'Database disconnected' }
})

// Register a Redis check
monitor.health.register('redis', async () => {
  const result = await redis.ping()
  return { status: result === 'PONG' ? 'healthy' : 'unhealthy' }
})
```

### Built-in Check Factories

```typescript
import { 
  createDatabaseCheck, 
  createRedisCheck, 
  createMemoryCheck,
  createHttpCheck 
} from '@gravito/monitor'

// Database check
monitor.health.register('db', createDatabaseCheck(() => db.isConnected()))

// Memory check (warns at 90% heap usage)
monitor.health.register('memory', createMemoryCheck({ maxHeapUsedPercent: 90 }))

// External service check
monitor.health.register('api', createHttpCheck('https://api.example.com/health'))
```

### Health Response Format

```json
{
  "status": "healthy",
  "timestamp": "2024-12-25T12:00:00Z",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy", "latency": 5 },
    "redis": { "status": "healthy", "latency": 2 },
    "memory": { 
      "status": "healthy", 
      "details": { "heapUsedPercent": "45.2" } 
    }
  }
}
```

## Metrics

### Prometheus Endpoint

The `/metrics` endpoint exposes metrics in Prometheus text format:

```
# HELP myapp_http_requests_total Total HTTP requests
# TYPE myapp_http_requests_total counter
myapp_http_requests_total{method="GET",path="/api/users",status="200"} 150

# HELP myapp_http_request_duration_seconds HTTP request duration
# TYPE myapp_http_request_duration_seconds histogram
myapp_http_request_duration_seconds_bucket{le="0.01"} 50
myapp_http_request_duration_seconds_bucket{le="0.1"} 120
myapp_http_request_duration_seconds_sum 12.5
myapp_http_request_duration_seconds_count 150
```

### Custom Metrics

```typescript
const monitor = core.services.get('monitor')

// Counter
const requestCounter = monitor.metrics.counter({
  name: 'api_requests_total',
  help: 'Total API requests',
  labels: ['endpoint', 'status'],
})
requestCounter.inc({ endpoint: '/users', status: '200' })

// Gauge
const activeConnections = monitor.metrics.gauge({
  name: 'active_connections',
  help: 'Current active connections',
})
activeConnections.set(42)
activeConnections.inc()
activeConnections.dec()

// Histogram
const responseTime = monitor.metrics.histogram({
  name: 'response_time_seconds',
  help: 'Response time in seconds',
  labels: ['endpoint'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
})
responseTime.observe(0.125, { endpoint: '/users' })

// Timer helper
const stopTimer = responseTime.startTimer({ endpoint: '/users' })
// ... do work ...
stopTimer() // Records duration automatically
```

## Tracing

### OpenTelemetry Integration

@gravito/monitor uses the **OTLP (OpenTelemetry Protocol)** standard. To send traces to different backends:

| Backend | Method |
|---------|--------|
| **Jaeger** | OTLP Collector → Jaeger |
| **Zipkin** | OTLP Collector → Zipkin |
| **AWS X-Ray** | AWS ADOT Collector |
| **Google Cloud Trace** | GCP OTLP Collector |
| **Datadog** | Datadog Agent (OTLP) |

### Configuration

```typescript
new MonitorOrbit({
  tracing: {
    enabled: true,
    serviceName: 'my-app',
    serviceVersion: '1.0.0',
    endpoint: 'http://localhost:4318/v1/traces', // OTLP HTTP
    sampleRate: 1.0, // 100% sampling
    resourceAttributes: {
      'deployment.environment': 'production',
    },
  },
})
```

### Manual Spans

```typescript
const tracer = core.services.get('tracing')

// Start a span
const span = tracer.startSpan('process-order', {
  attributes: { 'order.id': '12345' },
})

try {
  // Do work...
  tracer.addEvent(span, 'payment-processed')
  tracer.setAttribute(span, 'order.total', 99.99)
  tracer.endSpan(span, 'ok')
} catch (error) {
  tracer.endSpan(span, 'error')
  throw error
}
```

### Trace Context Propagation

The tracing middleware automatically:
- Extracts `traceparent` header from incoming requests
- Injects trace context into outgoing requests
- Records HTTP method, path, status code

## Kubernetes Integration

### Deployment Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-gravito-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /live
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### ServiceMonitor for Prometheus

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-gravito-app
spec:
  selector:
    matchLabels:
      app: my-gravito-app
  endpoints:
    - port: http
      path: /metrics
      interval: 15s
```

## Configuration Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `health.enabled` | boolean | `true` | Enable health endpoints |
| `health.path` | string | `/health` | Full health check path |
| `health.readyPath` | string | `/ready` | Readiness probe path |
| `health.livePath` | string | `/live` | Liveness probe path |
| `health.timeout` | number | `5000` | Check timeout (ms) |
| `health.cacheTtl` | number | `0` | Cache duration (ms) |
| `metrics.enabled` | boolean | `true` | Enable metrics endpoint |
| `metrics.path` | string | `/metrics` | Metrics endpoint path |
| `metrics.prefix` | string | `gravito_` | Metric name prefix |
| `metrics.defaultMetrics` | boolean | `true` | Collect default metrics |
| `tracing.enabled` | boolean | `false` | Enable tracing |
| `tracing.serviceName` | string | `gravito-app` | Service name |
| `tracing.endpoint` | string | `http://localhost:4318/v1/traces` | OTLP endpoint |
| `tracing.sampleRate` | number | `1.0` | Sample rate (0.0-1.0) |

## License

MIT
