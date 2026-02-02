# Dead Letter Queue (DLQ) - Usage Guide

This document demonstrates how to use the Dead Letter Queue system for handling failed events with retry logic.

## Table of Contents

- [Overview](#overview)
- [Basic Usage](#basic-usage)
- [Retry Strategies](#retry-strategies)
- [DLQ Management](#dlq-management)
- [Requeue Failed Events](#requeue-failed-events)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

---

## Overview

The Dead Letter Queue (DLQ) system provides:
- **Automatic retry** with exponential or linear backoff
- **Failed event storage** for manual inspection and reprocessing
- **Requeue capabilities** for single or batch events
- **Comprehensive tracking** of retry attempts and failure timestamps

---

## Basic Usage

### Enable DLQ (Default)

```typescript
import { HookManager } from '@gravito/core'

// DLQ is enabled by default
const hooks = new HookManager()

// Or explicitly enable/disable
const hooks = new HookManager({
  enableDLQ: true, // default: true
})
```

### Dispatch with Retry

```typescript
// Register a listener that might fail
hooks.addAction('order:created', async (order) => {
  await externalAPI.createOrder(order) // Might fail
})

// Dispatch with retry configuration
await hooks.doActionAsync('order:created', order, {
  priority: 'high',
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    dlqAfterMaxRetries: true,
  },
})
```

---

## Retry Strategies

### Exponential Backoff (Recommended)

Delays double with each retry: 1s → 2s → 4s → 8s...

```typescript
await hooks.doActionAsync('payment:process', payment, {
  retry: {
    maxRetries: 5,
    backoff: 'exponential',
    initialDelayMs: 1000, // 1 second
    maxDelayMs: 60000, // Cap at 60 seconds
    dlqAfterMaxRetries: true,
  },
})
```

**Retry Timeline:**
- Attempt 1: Immediate
- Attempt 2: After 1s
- Attempt 3: After 2s
- Attempt 4: After 4s
- Attempt 5: After 8s
- Attempt 6: After 16s
- → DLQ (if all fail)

### Linear Backoff

Fixed delay multiplied by retry count: 1s → 2s → 3s → 4s...

```typescript
await hooks.doActionAsync('email:send', email, {
  retry: {
    maxRetries: 3,
    backoff: 'linear',
    initialDelayMs: 2000, // 2 seconds
    maxDelayMs: 10000, // Cap at 10 seconds
    dlqAfterMaxRetries: true,
  },
})
```

**Retry Timeline:**
- Attempt 1: Immediate
- Attempt 2: After 2s
- Attempt 3: After 4s
- Attempt 4: After 6s
- → DLQ (if all fail)

### No Retry (Immediate Failure)

```typescript
await hooks.doActionAsync('analytics:track', event, {
  retry: {
    maxRetries: 0, // No retries
    dlqAfterMaxRetries: true, // Still send to DLQ
  },
})
```

---

## DLQ Management

### Access the DLQ

```typescript
const dlq = hooks.getDLQ()
```

### List Failed Events

```typescript
// List all failed events
const allFailures = dlq.list()

// Filter by event name
const orderFailures = dlq.list({
  eventName: 'order:created',
})

// Filter by time range
const recentFailures = dlq.list({
  from: Date.now() - 3600000, // Last hour
  to: Date.now(),
})

// Limit results
const latestFailures = dlq.list({
  limit: 10,
})

// Combined filters
const criticalFailures = dlq.list({
  eventName: 'payment:process',
  from: Date.now() - 86400000, // Last 24 hours
  limit: 50,
})
```

### Get Specific Entry

```typescript
const entry = dlq.get('dlq-123-1234567890')

if (entry) {
  console.log('Event:', entry.eventName)
  console.log('Payload:', entry.payload)
  console.log('Error:', entry.error.message)
  console.log('Retry Count:', entry.retryCount)
  console.log('Failed At:', new Date(entry.failedAt))
}
```

### Delete Entries

```typescript
// Delete single entry
dlq.delete('dlq-123-1234567890')

// Delete all entries for an event
const deletedCount = dlq.deleteAll({
  eventName: 'order:created',
})

// Clear all DLQ entries
dlq.clear()
```

### Get Statistics

```typescript
// Total DLQ entries
const totalCount = dlq.getCount()

// Count by event name
const orderFailureCount = dlq.getCountByEvent('order:created')
const paymentFailureCount = dlq.getCountByEvent('payment:process')
```

---

## Requeue Failed Events

### Requeue Single Event

```typescript
const entries = dlq.list({ eventName: 'order:created' })

for (const entry of entries) {
  console.log(`Requeuing order ${entry.id}...`)

  const success = await hooks.requeueDLQEntry(entry.id)

  if (success) {
    console.log('✓ Requeued successfully')
  } else {
    console.log('✗ Entry not found')
  }
}
```

### Requeue Batch

```typescript
// Requeue all failed events for a specific hook
const requeuedCount = await hooks.requeueDLQBatch('order:created')

console.log(`Requeued ${requeuedCount} events`)
```

### Conditional Requeue

```typescript
const entries = dlq.list({ eventName: 'payment:process' })

for (const entry of entries) {
  // Only requeue if failed less than 1 hour ago
  const hourAgo = Date.now() - 3600000

  if (entry.failedAt > hourAgo) {
    await hooks.requeueDLQEntry(entry.id)
  }
}
```

---

## Monitoring

### DLQ Depth Monitoring

```typescript
// Check DLQ depth periodically
setInterval(() => {
  const dlq = hooks.getDLQ()
  const count = dlq.getCount()

  if (count > 100) {
    console.warn(`⚠️ DLQ depth high: ${count} events`)
    // Send alert
  }
}, 60000) // Every minute
```

### Event-Specific Monitoring

```typescript
// Monitor critical events
const criticalEvents = ['payment:process', 'order:confirmed', 'inventory:deduct']

for (const eventName of criticalEvents) {
  const count = dlq.getCountByEvent(eventName)

  if (count > 0) {
    console.error(`❌ ${count} failed ${eventName} events in DLQ`)
    // Send alert
  }
}
```

### Failure Rate Tracking

```typescript
interface FailureStats {
  eventName: string
  totalAttempts: number
  failureCount: number
  failureRate: number
}

function calculateFailureRate(eventName: string): FailureStats {
  const dlq = hooks.getDLQ()
  const failures = dlq.list({ eventName })

  const totalAttempts = failures.reduce((sum, entry) => sum + entry.retryCount, 0)
  const failureCount = failures.length

  return {
    eventName,
    totalAttempts,
    failureCount,
    failureRate: failureCount / (totalAttempts || 1),
  }
}

// Usage
const stats = calculateFailureRate('order:created')
console.log(`Failure rate: ${(stats.failureRate * 100).toFixed(2)}%`)
```

---

## Best Practices

### 1. Configure Retry Based on Event Criticality

```typescript
// High priority: Aggressive retry
await hooks.doActionAsync('payment:process', payment, {
  priority: 'high',
  retry: {
    maxRetries: 5,
    backoff: 'exponential',
    initialDelayMs: 500,
    maxDelayMs: 30000,
    dlqAfterMaxRetries: true,
  },
})

// Normal priority: Moderate retry
await hooks.doActionAsync('order:confirmed', order, {
  priority: 'normal',
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 60000,
    dlqAfterMaxRetries: true,
  },
})

// Low priority: Minimal retry
await hooks.doActionAsync('analytics:track', event, {
  priority: 'low',
  retry: {
    maxRetries: 1,
    backoff: 'linear',
    initialDelayMs: 2000,
    dlqAfterMaxRetries: false, // Don't clog DLQ
  },
})
```

### 2. Regular DLQ Cleanup

```typescript
// Clean up old DLQ entries daily
setInterval(() => {
  const dlq = hooks.getDLQ()
  const weekAgo = Date.now() - 7 * 24 * 3600000

  const oldEntries = dlq.list({
    to: weekAgo,
  })

  for (const entry of oldEntries) {
    dlq.delete(entry.id)
  }

  console.log(`Cleaned up ${oldEntries.length} old DLQ entries`)
}, 86400000) // Daily
```

### 3. Automated Requeue for Transient Failures

```typescript
// Automatically requeue events that failed due to transient errors
setInterval(async () => {
  const dlq = hooks.getDLQ()
  const entries = dlq.list()

  for (const entry of entries) {
    // Check if error is transient (e.g., network timeout)
    if (entry.error.message.includes('ETIMEDOUT') || entry.error.message.includes('ECONNREFUSED')) {
      console.log(`Auto-requeuing transient failure: ${entry.id}`)
      await hooks.requeueDLQEntry(entry.id)
    }
  }
}, 300000) // Every 5 minutes
```

### 4. DLQ Alerting

```typescript
// Send alerts for critical DLQ events
async function checkDLQAlerts() {
  const dlq = hooks.getDLQ()

  // Alert on high DLQ depth
  const totalCount = dlq.getCount()
  if (totalCount > 500) {
    await sendAlert({
      severity: 'critical',
      message: `DLQ depth critical: ${totalCount} events`,
    })
  }

  // Alert on critical event failures
  const paymentFailures = dlq.getCountByEvent('payment:process')
  if (paymentFailures > 10) {
    await sendAlert({
      severity: 'high',
      message: `${paymentFailures} payment processing failures`,
    })
  }
}

setInterval(checkDLQAlerts, 60000) // Every minute
```

### 5. Idempotent Event Handlers

```typescript
// Ensure handlers are idempotent for safe requeue
hooks.addAction('order:confirmed', async (order) => {
  // Check if already processed (idempotency)
  const existing = await db.orders.findOne({ id: order.id, status: 'confirmed' })

  if (existing) {
    console.log(`Order ${order.id} already confirmed, skipping`)
    return
  }

  // Process order
  await db.orders.update({ id: order.id }, { status: 'confirmed' })
  await sendConfirmationEmail(order)
})
```

---

## Complete Example: Flash Sale Order Processing

```typescript
import { HookManager } from '@gravito/core'

const hooks = new HookManager({
  migrationMode: 'hybrid',
  enableDLQ: true,
})

// Register listeners with retry
hooks.addAction('order:created', async (order) => {
  await inventoryService.lock(order.items)
})

hooks.addAction('payment:succeeded', async (payment) => {
  await inventoryService.deduct(payment.orderId)
})

// Dispatch with retry
await hooks.doActionAsync(
  'order:created',
  { id: '123', items: [{ productId: 'ABC', quantity: 1 }] },
  {
    priority: 'high',
    retry: {
      maxRetries: 3,
      backoff: 'exponential',
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      dlqAfterMaxRetries: true,
    },
  }
)

// Monitor DLQ
setInterval(() => {
  const dlq = hooks.getDLQ()
  const count = dlq.getCount()

  if (count > 0) {
    console.warn(`⚠️ ${count} events in DLQ`)

    // List failures
    const failures = dlq.list({ limit: 10 })
    for (const failure of failures) {
      console.error(`- ${failure.eventName}: ${failure.error.message}`)
    }
  }
}, 60000)

// Auto-requeue transient failures
setInterval(async () => {
  const dlq = hooks.getDLQ()
  const entries = dlq.list()

  for (const entry of entries) {
    if (entry.error.message.includes('ETIMEDOUT')) {
      await hooks.requeueDLQEntry(entry.id)
    }
  }
}, 300000)
```

---

## Next Steps

- **Issue 1.2 Phase 2:** Circuit Breaker integration
- **Issue 1.2 Phase 3:** Backpressure mechanisms
- **Issue 1.2 Phase 4:** Bull Queue integration

For more details, see `FRAMEWORK_IMPROVEMENTS.md`.
