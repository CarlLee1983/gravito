# Advanced DDD Module Guide - Event Sourcing

## Overview

**Advanced Module Template** implements complete **Event Sourcing** with DDD best practices.

Unlike Simple modules (basic CRUD), Advanced modules use **events as the source of truth**:
- Domain state is reconstructed from event stream
- All changes captured as immutable events
- Complete audit trail built-in
- Supports temporal queries (state at any point in time)

---

## 🚀 Quick Start: 5 Minutes

### 1️⃣ Generate Advanced Module

```bash
# Create new project with Advanced modules
bun run scaffold Payment --type advanced

# Or add to existing DDD project
# Edit config to enable: moduleType: 'advanced'
```

### 2️⃣ Module Structure

```
src/Modules/Payment/
├── Domain/
│   ├── AggregateRoots/
│   │   └── Payment.ts                    # Aggregate root with event sourcing
│   ├── Events/
│   │   ├── PaymentCreatedEvent.ts
│   │   ├── PaymentConfirmedEvent.ts
│   │   └── PaymentFailedEvent.ts
│   ├── Services/
│   │   └── PaymentEventApplier.ts        # Pure function state machine
│   ├── Repositories/
│   │   └── IPaymentEventStore.ts         # Event store interface
│   └── ValueObjects/
│       └── PaymentStatus.ts
├── Application/
│   ├── Services/
│   │   └── CreatePaymentService.ts       # Use case service
│   └── DTOs/
│       └── PaymentDTO.ts
├── Infrastructure/
│   ├── EventStore/
│   │   ├── InMemoryPaymentEventStore.ts  # Testing
│   │   ├── DatabasePaymentEventStore.ts  # Production
│   │   └── PaymentEventDeserializer.ts   # Event reconstruction
│   └── Repositories/
│       └── PaymentRepository.ts
├── Presentation/
│   ├── Controllers/
│   │   └── PaymentController.ts
│   └── Routes/
│       └── payment.routes.ts
└── index.ts                              # Public API
```

### 3️⃣ Fill Business Logic (3 Steps)

#### Step 1: Domain Events

```typescript
// src/Modules/Payment/Domain/Events/PaymentCreatedEvent.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export interface PaymentCreatedData {
  paymentId: string
  amount: number
  currency: 'USD' | 'EUR' | 'TWD'
  customerId: string
  description: string
}

export class PaymentCreatedEvent extends DomainEvent {
  readonly data: PaymentCreatedData

  constructor(data: PaymentCreatedData) {
    super('PaymentCreatedEvent')
    this.data = data
  }

  getSchemaVersion(): string {
    return '1.0.0'
  }
}
```

#### Step 2: EventApplier (Pure Function)

```typescript
// src/Modules/Payment/Domain/Services/PaymentEventApplier.ts
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import type { PaymentCreatedEvent } from '../Events/PaymentCreatedEvent'

interface PaymentState {
  id: string
  customerId: string
  amount: number
  currency: string
  status: 'pending' | 'confirmed' | 'failed'
  createdAt: Date
  confirmedAt?: Date
  failureReason?: string
}

export class PaymentEventApplier {
  /**
   * Pure function: applies event to state, returns new state
   * No side effects, easy to test, supports event replay
   */
  static apply(state: PaymentState | null, event: DomainEvent): PaymentState {
    // Handle PaymentCreatedEvent
    if (event instanceof PaymentCreatedEvent) {
      return {
        id: event.data.paymentId,
        customerId: event.data.customerId,
        amount: event.data.amount,
        currency: event.data.currency,
        status: 'pending',
        createdAt: new Date(),
      }
    }

    // Handle PaymentConfirmedEvent
    if (event instanceof PaymentConfirmedEvent) {
      if (!state || state.status !== 'pending') {
        throw new Error('Can only confirm pending payments')
      }
      return {
        ...state,
        status: 'confirmed',
        confirmedAt: new Date(),
      }
    }

    // Handle PaymentFailedEvent
    if (event instanceof PaymentFailedEvent) {
      if (!state || state.status === 'confirmed') {
        throw new Error('Cannot fail confirmed payment')
      }
      return {
        ...state,
        status: 'failed',
        failureReason: event.data.reason,
      }
    }

    throw new Error(`Unknown event: ${event.constructor.name}`)
  }
}
```

#### Step 3: Aggregate Root (Commands)

```typescript
// src/Modules/Payment/Domain/AggregateRoots/Payment.ts
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { PaymentCreatedEvent } from '../Events/PaymentCreatedEvent'
import { PaymentConfirmedEvent } from '../Events/PaymentConfirmedEvent'
import { PaymentEventApplier } from '../Services/PaymentEventApplier'

export class Payment {
  private events: DomainEvent[] = []
  private state: PaymentState | null = null

  constructor(id: string, customerId: string) {
    this.state = { id, customerId } as PaymentState
  }

  /**
   * Factory method: Create new payment
   */
  static create(id: string, customerId: string, amount: number, currency: string): Payment {
    const payment = new Payment(id, customerId)

    const event = new PaymentCreatedEvent({
      paymentId: id,
      customerId,
      amount,
      currency,
      description: '',
    })

    payment.events.push(event)
    payment.state = PaymentEventApplier.apply(payment.state, event)

    return payment
  }

  /**
   * Reconstruct from event stream
   */
  static fromEvents(events: DomainEvent[]): Payment {
    const payment = new Payment('', '')
    payment.events = events
    payment.state = events.reduce((state, event) => PaymentEventApplier.apply(state, event), null)
    return payment
  }

  /**
   * Command: Confirm payment
   */
  confirm(): void {
    if (!this.state || this.state.status !== 'pending') {
      throw new Error('Can only confirm pending payments')
    }

    const event = new PaymentConfirmedEvent({
      paymentId: this.state.id,
      confirmedAt: new Date(),
    })

    this.events.push(event)
    this.state = PaymentEventApplier.apply(this.state, event)
  }

  /**
   * Get uncommitted events
   */
  getUncommittedEvents(): DomainEvent[] {
    return this.events
  }

  /**
   * Read methods (queries)
   */
  getId(): string {
    return this.state?.id || ''
  }

  getStatus(): string {
    return this.state?.status || 'unknown'
  }

  getAmount(): number {
    return this.state?.amount || 0
  }
}
```

### 4️⃣ EventStore Implementation (InMemory for Testing)

```typescript
// src/Modules/Payment/Infrastructure/EventStore/InMemoryPaymentEventStore.ts
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import type { IPaymentEventStore } from '../../Domain/Repositories/IPaymentEventStore'
import { Payment } from '../../Domain/AggregateRoots/Payment'

export class InMemoryPaymentEventStore implements IPaymentEventStore {
  private events: Map<string, DomainEvent[]> = new Map()

  async save(aggregate: Payment): Promise<void> {
    const paymentId = aggregate.getId()
    const events = aggregate.getUncommittedEvents()

    if (!this.events.has(paymentId)) {
      this.events.set(paymentId, [])
    }

    this.events.get(paymentId)!.push(...events)
  }

  async findById(id: string): Promise<Payment | null> {
    const events = this.events.get(id)
    if (!events) return null

    return Payment.fromEvents(events)
  }

  async findAll(): Promise<Payment[]> {
    const payments: Payment[] = []
    for (const events of this.events.values()) {
      payments.push(Payment.fromEvents(events))
    }
    return payments
  }
}
```

### 5️⃣ Test Module

```typescript
// tests/Unit/Payment/PaymentEventApplier.test.ts
import { describe, it, expect } from 'bun:test'
import { PaymentCreatedEvent } from '../../../src/Modules/Payment/Domain/Events/PaymentCreatedEvent'
import { PaymentEventApplier } from '../../../src/Modules/Payment/Domain/Services/PaymentEventApplier'

describe('PaymentEventApplier', () => {
  it('should apply PaymentCreatedEvent', () => {
    const event = new PaymentCreatedEvent({
      paymentId: 'pay-123',
      customerId: 'cust-456',
      amount: 100,
      currency: 'USD',
      description: 'Order #123',
    })

    const state = PaymentEventApplier.apply(null, event)

    expect(state.id).toBe('pay-123')
    expect(state.amount).toBe(100)
    expect(state.status).toBe('pending')
  })

  it('should apply PaymentConfirmedEvent', () => {
    // Start with created state
    const createdEvent = new PaymentCreatedEvent({...})
    const createdState = PaymentEventApplier.apply(null, createdEvent)

    // Apply confirmed event
    const confirmedEvent = new PaymentConfirmedEvent({...})
    const confirmedState = PaymentEventApplier.apply(createdState, confirmedEvent)

    expect(confirmedState.status).toBe('confirmed')
    expect(confirmedState.confirmedAt).toBeDefined()
  })

  it('should reject invalid state transitions', () => {
    const state = { ...createdState, status: 'confirmed' as const }
    const failEvent = new PaymentFailedEvent({...})

    expect(() => {
      PaymentEventApplier.apply(state, failEvent)
    }).toThrow('Cannot fail confirmed payment')
  })
})
```

### 6️⃣ Run Tests

```bash
# Unit tests (fast, no setup)
bun test tests/Unit/Payment

# Integration tests
bun test tests/Integration/Payment

# All tests
bun test
```

---

## Core Concepts

### Event Sourcing

**Event Sourcing** stores state changes as immutable events:

```
Time:  t0        t1        t2        t3
State: ∅ ──→ Created ──→ Confirmed ──→ Refunded

Events: [PaymentCreatedEvent, PaymentConfirmedEvent, PaymentRefundedEvent]
```

**Benefits**:
- ✅ Complete audit trail (who changed what, when)
- ✅ Temporal queries (state at any point in time)
- ✅ Easy debugging (replay events to debug)
- ✅ Scalability (events are immutable, cache-friendly)

### Aggregate Root

**Aggregate Root** manages a consistency boundary:

```typescript
// Commands (state-changing operations)
payment.confirm()    // ✅ Valid if status === 'pending'
payment.refund()     // ❌ Error if already refunded

// Queries (read operations)
payment.getStatus()  // Returns current status
payment.getEvents()  // Returns event history
```

### Event Applier (Pure Function)

**EventApplier** is a **pure function** that reconstructs state:

```typescript
// Same input → Same output (always)
const state1 = PaymentEventApplier.apply(null, createdEvent)
const state2 = PaymentEventApplier.apply(null, createdEvent)
// state1 === state2 ✓ (same structure)

// No side effects (no DB calls, no mutations)
apply(state, event) {
  return { ...state, status: 'confirmed' } // New object!
}
```

**Why pure functions?**
- 📝 Easy to test (no mocks needed)
- ⚡ Easy to parallelize (no shared state)
- 🔄 Easy to replay (deterministic)

### EventStore (Dual Implementation)

Two implementations for different use cases:

#### InMemory (Testing)
```typescript
// Fast, no I/O, perfect for unit tests
const store = new InMemoryPaymentEventStore()
const payment = await store.findById('pay-123')
```

#### Database (Production)
```typescript
// Persistent storage using Atlas ORM
const store = new DatabasePaymentEventStore(db)
const payment = await store.findById('pay-123')
// Events persisted to database table
```

---

## Best Practices

### ✅ Good Patterns

```typescript
// 1. Immutable state
apply(state, event) {
  return { ...state, status: 'new' }  // New object
}

// 2. Explicit state transitions
if (state.status !== 'pending') {
  throw new Error('Invalid state transition')
}

// 3. Rich events with context
class PaymentConfirmedEvent {
  readonly data = {
    paymentId: string
    confirmedAt: Date
    confirmedBy: string  // Who confirmed?
    ipAddress: string    // From where?
  }
}

// 4. Event versioning for future changes
getSchemaVersion(): '1.0.0' | '2.0.0'
```

### ❌ Anti-patterns

```typescript
// ❌ Mutation
apply(state, event) {
  state.status = 'new'  // BAD! Mutates original
  return state
}

// ❌ Side effects in EventApplier
apply(state, event) {
  await db.save(state)  // BAD! Can't replay events
  return state
}

// ❌ Vague events
class PaymentEvent {
  readonly data = { value: 'something' }  // What is value?
}

// ❌ Lost events
events = []
save(aggregate) {
  // Never append to events! Loses data
  this.events = aggregate.getUncommittedEvents()
}
```

---

## Common Patterns

### Event Subscription (React to Events)

```typescript
// src/Modules/Payment/Infrastructure/Subscribers/PaymentEventSubscriber.ts
import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { PaymentConfirmedEvent } from '../../Domain/Events/PaymentConfirmedEvent'

export class PaymentEventSubscriber {
  async handle(event: DomainEvent): Promise<void> {
    // React to PaymentConfirmedEvent
    if (event instanceof PaymentConfirmedEvent) {
      // Send email confirmation
      // Update wallet balance
      // Record analytics
    }
  }
}
```

### Idempotent Operations

```typescript
// Generate deterministic ID based on source
interface EventSourceId {
  sourceModule: string
  sourceEventId: string
  // Prevents duplicate processing
}

async save(payment: Payment): Promise<void> {
  const sourceId = `${payment.getSourceModule()}-${payment.getSourceEventId()}`
  const existing = await this.findBySourceId(sourceId)

  // Idempotent: returning existing if already processed
  if (existing) return existing

  // First time: persist events
  this.events.set(payment.getId(), payment.getUncommittedEvents())
}
```

### Temporal Queries (State at Point in Time)

```typescript
// Get payment state as it was 1 day ago
const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
const allEvents = await store.findById(paymentId)
const recentEvents = allEvents.filter(e => e.timestamp <= oneDayAgo)
const pastState = recentEvents.reduce((s, e) => applier.apply(s, e), null)
```

---

## Migration from Simple to Advanced

If you have existing Simple modules, gradually upgrade:

```typescript
// Phase 1: Add Event Sourcing alongside
// Keep existing Repository implementation
// Add EventStore implementation

// Phase 2: Redirect writes to EventStore
// Application layer publishes events
// EventStore persists and rebuilds state

// Phase 3: Use EventApplier for all queries
// Queries read from EventStore
// Cache state in read model (CQRS)
```

---

## TypeScript Strict Mode

All Event Sourcing modules use strict TypeScript:

```typescript
// ✅ Required: Event data must be fully typed
export interface PaymentCreatedData {
  paymentId: string      // ← exact type
  amount: number         // ← exact type
  currency: 'USD' | 'EUR'  // ← literal union
}

// ❌ Avoid: Any types
export interface PaymentData {
  [key: string]: any  // BAD: allows anything
}
```

---

## Recommended Reading

1. **Event Sourcing** - Martin Fowler
   https://martinfowler.com/eaaDev/EventSourcing.html

2. **Domain Events** - Eric Evans
   Domain-Driven Design: Tackling Complexity (Chapter 10)

3. **Event Sourcing in Practice** - Greg Young
   https://www.youtube.com/watch?v=LDW0QWie21s

---

## Troubleshooting

### Events Not Being Applied

```typescript
// ❌ Problem: Forgot to register event class
if (event instanceof PaymentCreatedEvent) { ... }

// ✅ Solution: Make sure event is properly instantiated
const createdEvent = new PaymentCreatedEvent(data)
state = PaymentEventApplier.apply(state, createdEvent)
```

### State Mutation Errors

```typescript
// ❌ Problem: Mutating original state
apply(state, event) {
  state.status = 'new'  // Modifies original!
  return state
}

// ✅ Solution: Return new object
apply(state, event) {
  return { ...state, status: 'new' }  // Creates copy
}
```

### Event Versioning

```typescript
// When changing event schema, bump version
class PaymentCreatedEvent {
  getSchemaVersion(): string {
    return '2.0.0'  // Was 1.0.0
  }

  migrate(oldEvent: any): PaymentCreatedData {
    // Convert old format to new format
    return {
      ...oldEvent.data,
      amount: oldEvent.data.price // Renamed field
    }
  }
}
```

---

## Next Steps

### Phase 1: Single Aggregate
✅ Payment module with events and EventStore

### Phase 2: Event Subscribers
Add event subscribers for cross-module communication:
```bash
# Listener reacts to PaymentConfirmedEvent
# Updates wallet balance in another context
```

### Phase 3: CQRS Query Side
Add read-side projections for performance:
```typescript
// Cache read model updated by PaymentConfirmedEvent
// Queries hit cache instead of replaying all events
```

### Phase 4: Saga Pattern
Orchestrate multi-module workflows:
```typescript
// PaymentSaga listens to events
// Coordinates Payment → Fulfillment → Notification
```

---

## Support

Questions or issues?
1. Check this guide's troubleshooting section
2. Review test examples in `tests/Unit/`
3. See production examples in `src/Modules/`
4. Open issue on GitHub

---

**Happy Event Sourcing! 🎉**

Built with ❤️ using Gravito Framework
