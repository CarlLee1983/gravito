# @gravito/resilience

Event system resilience layer for Gravito framework - providing Circuit Breaker, Dead Letter Queue, Backpressure management, Worker Pool, and other reliability patterns.

## Features

- **Circuit Breaker**: Prevent cascading failures with circuit breaker pattern
- **Dead Letter Queue**: Handle failed events with DLQ and retry logic
- **Backpressure Management**: Flow control and queue depth management
- **Worker Pool**: Multi-threaded event processing
- **Priority Queue**: Event prioritization and escalation
- **Aggregation**: Event batching and windowing
- **Retry & Idempotency**: Reliable event delivery
- **Observability**: OpenTelemetry integration and event metrics
- **Message Queue Bridge**: Multi-backend queue support

## Installation

```bash
bun add @gravito/resilience
```

## Usage

```typescript
import { CircuitBreaker, DeadLetterQueue, WorkerPool } from '@gravito/resilience'

// Use resilience components
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 60000,
})
```

## Architecture

- `circuit-breaker/`: Circuit breaker pattern implementation
- `dead-letter-queue/`: DLQ and message routing
- `backpressure/`: Flow control and backpressure management
- `worker/`: Worker pool and task scheduling
- `priority/`: Priority queue and escalation
- `aggregation/`: Event batching and deduplication
- `retry/`: Retry scheduling and idempotency
- `observability/`: Metrics and tracing
- `bridge/`: Message queue abstraction

## Peer Dependencies

- `@gravito/core`: ^1.7.0
- `@opentelemetry/api`: ^1.9.0 (optional)

## License

MIT
