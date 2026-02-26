# Fault Tolerance Guide

The `@gravito/resilience` module provides a comprehensive suite of fault tolerance patterns to protect your **Gravito Galaxy** from cascading failures and intermittent errors.

## 1. Circuit Breaker (Isolation Pattern)

A **Circuit Breaker** acts as a safety switch that stops calls to a failing service (Satellite or Orbit) once it reaches a certain error threshold.

### Basic Configuration

```typescript
import { CircuitBreaker } from '@gravito/resilience'

const cb = new CircuitBreaker({
  failureThreshold: 5,  // Open the circuit after 5 failures
  resetTimeout: 30000,   // Try again after 30 seconds
  successThreshold: 2,  // Close the circuit after 2 successful calls
})

// Wrap a flaky call in the circuit breaker
try {
  const result = await cb.execute(async () => {
    return await catalogService.fetchProducts()
  })
} catch (error) {
  if (cb.isOpen()) {
    // Handle fallback response
    return fallbackData
  }
}
```

## 2. Distributed Retry Scheduler (Bull-backed)

For intermittent failures (e.g., network timeouts), use the **Retry Scheduler**. Unlike a simple retry loop, it uses **Bull Queue** to handle persistence and delayed retries across process boundaries.

```typescript
import { RetryScheduler } from '@gravito/resilience'

const scheduler = new RetryScheduler({
  maxRetries: 3,
  retryDelay: 1000,
  retryMultiplier: 2, // Exponential backoff
})

await scheduler.schedule(async () => {
  await mailer.send(welcomeEmail)
})
```

## 3. Dead Letter Queue (DLQ)

When a task fails persistently after all retries, it is moved to a **Dead Letter Queue (DLQ)** for manual inspection.

```typescript
import { DeadLetterQueue } from '@gravito/resilience'

const dlq = new DeadLetterQueue({
  storage: new RedisStorage(),
  maxDepth: 1000,
})

// Add a permanently failing task to the DLQ
await dlq.push(failedTask, error)
```

## 4. Idempotency Support

When retrying tasks, it's crucial to ensure that the same operation is not executed multiple times with unintended side effects (e.g., double charging a customer).

```typescript
import { IdempotencyGuard } from '@gravito/resilience'

const guard = new IdempotencyGuard(redisClient)

const requestId = 'order-123'
const isDuplicate = await guard.isDuplicate(requestId)

if (!isDuplicate) {
  await processOrder(order)
  await guard.markProcessed(requestId)
}
```

## 5. Summary of Resilience Patterns

| Pattern | Best For | Benefit |
|---------|----------|---------|
| **Circuit Breaker** | Cascading failures | Failure isolation |
| **Retry** | Intermittent errors | Self-healing |
| **DLQ** | Persistent failures | Manual intervention |
| **Idempotency** | Duplicate requests | Data consistency |
| **Backpressure** | High traffic | System protection |
