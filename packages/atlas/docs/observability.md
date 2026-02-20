# Observability

Atlas is built for production monitoring. It includes first-class support for **OpenTelemetry (OTel)**, allowing you to trace every database interaction across your microservices.

## 📊 Distributed Tracing

Atlas automatically creates spans for the following operations:
- `db.query`: Raw query execution.
- `orm.save`: Model persistence.
- `orm.delete`: Model removal.
- `db.transaction`: Transaction lifecycles.

### Span Attributes
Spans include standard semantic conventions:
- `db.system`: The database type (e.g., `postgresql`).
- `db.operation`: The command type (e.g., `SELECT`, `INSERT`).
- `db.sql.table`: The primary table being accessed.
- `db.statement`: The compiled SQL string (obfuscated by default).

## 🚀 Setup

Ensure you have initialized your OpenTelemetry SDK before using Atlas. Atlas will detect the global tracer and start emitting spans.

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  // ...
})

sdk.start()
```

## 🏥 Orbit Doctor

Use the CLI to check connection health and performance statistics.

```bash
bun orbit doctor
```

This command reports:
- Connection latency.
- Pool utilization.
- Cache hit/miss ratios for grammars and metadata.
- Pending migrations.
