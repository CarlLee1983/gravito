# DDD Scaffolder - Quick Reference

## Module Templates

### Simple (Default)
```bash
bun run scaffold Payment
# CRUD structure with Repository pattern
```

**Use when**: Building standard CRUD apps, quick prototypes

**Generated Structure**:
```
Payment/
├── Domain/Entities/Payment.ts
├── Domain/ValueObjects/PaymentStatus.ts
├── Application/Services/CreatePaymentService.ts
├── Infrastructure/Repositories/PaymentRepository.ts
└── Presentation/Controllers/PaymentController.ts
```

---

### Advanced (Event Sourcing)
```bash
bun run scaffold Payment --type advanced
# Complete Event Sourcing with Aggregate Roots
```

**Use when**: Complex domains, need audit trail, financial systems

**Generated Structure**:
```
Payment/
├── Domain/AggregateRoots/Payment.ts
├── Domain/Events/PaymentCreatedEvent.ts
├── Domain/Services/PaymentEventApplier.ts
├── Infrastructure/EventStore/InMemoryPaymentEventStore.ts
├── Infrastructure/EventStore/DatabasePaymentEventStore.ts
└── Presentation/Controllers/PaymentController.ts
```

---

## AutoDiBootstrap (Automatic DI)

### Enable Automatic Service Discovery

```typescript
// src/Bootstrap/app.ts
import { AutoDiBootstrap } from '@gravito/scaffold'

export async function createApp(): Promise<PlanetCore> {
  const core = new PlanetCore()

  // Automatic service discovery and registration
  await AutoDiBootstrap.scanAndRegisterServices(core.container)

  // Automatic route registration
  await AutoDiBootstrap.scanAndRegisterRoutes(core)

  return core
}
```

### Service Naming Conventions

| File Pattern | Service Key | Auto-discovered |
|------|---------|---------|
| `OrderDomainService.ts` | `order-domain-service` | ✓ |
| `CreateOrderService.ts` | `create-order-service` | ✓ |
| `OrderRepository.ts` | `order-repository` | ✓ |
| `OrderEventSubscriber.ts` | `order-event-subscriber` | ✓ |
| `order.routes.ts` | Auto-calls `registerOrderRoutes()` | ✓ |

---

## Simple Template Implementation (3 files)

### 1. Domain Entity

```typescript
// src/Modules/Payment/Domain/Entities/Payment.ts
export class Payment {
  constructor(
    readonly id: string,
    readonly amount: number,
    readonly status: PaymentStatus
  ) {}

  confirm(): void {
    if (this.status.value !== 'pending') {
      throw new Error('Only pending payments can be confirmed')
    }
    // Update status
  }
}
```

### 2. Application Service

```typescript
// src/Modules/Payment/Application/Services/CreatePaymentService.ts
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'

export class CreatePaymentService {
  constructor(private repository: IPaymentRepository) {}

  async execute(amount: number): Promise<Payment> {
    const payment = new Payment(generateId(), amount, new PaymentStatus('pending'))
    await this.repository.save(payment)
    return payment
  }
}
```

### 3. Repository

```typescript
// src/Modules/Payment/Infrastructure/Repositories/PaymentRepository.ts
import type { IPaymentRepository } from '../../Domain/Repositories/IPaymentRepository'

export class PaymentRepository implements IPaymentRepository {
  async save(payment: Payment): Promise<void> {
    // Persist to database
  }

  async findById(id: string): Promise<Payment | null> {
    // Query database
    return null
  }
}
```

**AutoDiBootstrap automatically discovers and wires all three! ✨**

---

## Advanced Template Implementation (5 files)

### 1. Domain Event

```typescript
// src/Modules/Payment/Domain/Events/PaymentCreatedEvent.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class PaymentCreatedEvent extends DomainEvent {
  constructor(
    readonly paymentId: string,
    readonly amount: number,
    readonly customerId: string
  ) {
    super('PaymentCreatedEvent')
  }

  getSchemaVersion(): string {
    return '1.0.0'
  }
}
```

### 2. Aggregate Root (Commands)

```typescript
// src/Modules/Payment/Domain/AggregateRoots/Payment.ts
export class Payment {
  private events: DomainEvent[] = []
  private state: PaymentState | null = null

  static create(id: string, amount: number): Payment {
    const payment = new Payment(id)
    const event = new PaymentCreatedEvent(id, amount, customerId)
    payment.events.push(event)
    payment.state = PaymentEventApplier.apply(null, event)
    return payment
  }

  getUncommittedEvents(): DomainEvent[] {
    return this.events
  }

  getStatus(): string {
    return this.state?.status || 'unknown'
  }
}
```

### 3. Event Applier (Pure Function)

```typescript
// src/Modules/Payment/Domain/Services/PaymentEventApplier.ts
export class PaymentEventApplier {
  static apply(state: PaymentState | null, event: DomainEvent): PaymentState {
    // Handle PaymentCreatedEvent
    if (event instanceof PaymentCreatedEvent) {
      return {
        id: event.paymentId,
        amount: event.amount,
        status: 'pending',
        createdAt: new Date()
      }
    }

    throw new Error(`Unknown event: ${event.constructor.name}`)
  }
}
```

### 4. Event Store

```typescript
// src/Modules/Payment/Infrastructure/EventStore/InMemoryPaymentEventStore.ts
export class InMemoryPaymentEventStore implements IPaymentEventStore {
  private events: Map<string, DomainEvent[]> = new Map()

  async save(aggregate: Payment): Promise<void> {
    const id = aggregate.getId()
    this.events.set(id, aggregate.getUncommittedEvents())
  }

  async findById(id: string): Promise<Payment | null> {
    const events = this.events.get(id)
    return events ? Payment.fromEvents(events) : null
  }
}
```

### 5. Application Service

```typescript
// src/Modules/Payment/Application/Services/CreatePaymentService.ts
export class CreatePaymentService {
  constructor(private eventStore: IPaymentEventStore) {}

  async execute(amount: number): Promise<void> {
    const payment = Payment.create(generateId(), amount)
    await this.eventStore.save(payment)
  }
}
```

**Result**: Complete audit trail, temporal queries, event replay! 🚀

---

## Testing

### Simple Template
```typescript
// tests/Unit/Payment/CreatePaymentService.test.ts
const mockRepository = { save: () => {}, findById: () => null }
const service = new CreatePaymentService(mockRepository as any)
const result = await service.execute(100)
expect(result.amount).toBe(100)
```

### Advanced Template
```typescript
// tests/Unit/Payment/PaymentEventApplier.test.ts
const event = new PaymentCreatedEvent('p-1', 100, 'c-1')
const state = PaymentEventApplier.apply(null, event)
expect(state.amount).toBe(100)
expect(state.status).toBe('pending')
```

---

## Decision Matrix

| Requirement | Simple | Advanced |
|------|------|---------|
| CRUD operations | ✅ | ✅ |
| Audit trail | ❌ | ✅ |
| Complex state machines | ❌ | ✅ |
| Event replay | ❌ | ✅ |
| Temporal queries | ❌ | ✅ |
| Quick to implement | ✅ | ❌ |
| Best for financial systems | ❌ | ✅ |
| Best for learning DDD | ✅ | ✅ |

---

## Architecture Guides

### For AutoDiBootstrap
📖 `DDD_AUTODDI_GUIDE.md`
- Zero-configuration dependency injection
- Automatic service discovery
- Convention-over-configuration

### For Advanced/Event Sourcing
📖 `DDD_ADVANCED_GUIDE.md`
- Event Sourcing patterns
- Aggregate Root design
- Pure function EventApplier
- Testing event-sourced modules

### Navigation
📖 `DDD_GUIDES_INDEX.md`
- Choose between templates
- Learning path (Beginner → Advanced)
- Real-world examples

---

## Common Commands

```bash
# Create new project
bun run scaffold my-app

# Generate Simple module
bun run scaffold Order

# Generate Advanced module (Event Sourcing)
bun run scaffold Payment --type advanced

# Run tests
bun test

# Type check
bun run typecheck

# Format code
bun run format
```

---

## Key Concepts

### Simple Template
- **Repository Pattern**: Abstraction over data access
- **Entity**: Business object with identity
- **Value Object**: Immutable domain value
- **Service**: Business logic orchestration

### Advanced Template
- **Event Sourcing**: Events as source of truth
- **Aggregate Root**: Consistency boundary
- **Domain Event**: Immutable business fact
- **Event Applier**: Pure function for state transition
- **Event Store**: Persistent event log

---

## Performance

### Development
```
AutoDiBootstrap auto-scan: ~100-150ms
Simple module generate: ~50ms
Advanced module generate: ~100ms
```

### Production
```
Manual registration: ~10-20ms
Cold start Simple: ~1-2s
Cold start Advanced: ~1-2s
```

---

## When to Upgrade Simple → Advanced

✅ **Upgrade When**:
- Need audit trail requirement added
- Complex state transitions emerge
- Multiple aggregates interact
- Temporal queries needed
- Compliance/regulatory requirements

❌ **Don't Upgrade If**:
- Still in fast iteration mode
- CRUD operations sufficient
- No audit requirements
- Small team, simple domain

---

**📖 For more details, see the full guides in `docs/`**
