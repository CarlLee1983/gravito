# DDD Scaffolder Guides - Complete Index

Welcome to Gravito's **Domain-Driven Design (DDD) Scaffolder** documentation. This guide helps you choose the right template and implement your architecture effectively.

---

## 📚 Guide Selection

### I'm Starting New

```
↓
Would you like automatic DI with zero configuration?
├─ Yes → Go to **AutoDiBootstrap Guide** (5 min read)
└─ No  → Continue below

Would you need Event Sourcing (complete event history)?
├─ Yes → Go to **Advanced Guide** (Event Sourcing)
└─ No  → Go to **Simple Guide** (Basic CRUD)
```

### I'm Adding Modules to Existing Project

```
Do you want automatic service discovery?
├─ Yes → Use **AutoDiBootstrap** (zero manual registration)
└─ No  → Manual registration in providers.ts

Do your modules need event history?
├─ Yes → Generate with **Advanced Template** (--type advanced)
└─ No  → Generate with **Simple Template** (default)
```

---

## 🎯 Quick Navigation

### Phase 1: Automatic DI (Foundation)
**File**: [`DDD_AUTODDI_GUIDE.md`](./DDD_AUTODDI_GUIDE.md)
**Duration**: 5 min quick-start | 20 min full guide
**What You'll Learn**:
- Zero-configuration DI system
- Automatic service discovery
- Convention-over-configuration patterns
- Best practices for module organization

**For You If**:
- ✅ You want to focus on business logic, not wiring
- ✅ You're generating multiple modules
- ✅ You want DX-first architecture

**CLI Usage**:
```bash
bun run scaffold MyProject
# AutoDiBootstrap automatically discovers and registers services
```

---

### Phase 2a: Event Sourcing (Advanced Domain Logic)
**File**: [`DDD_ADVANCED_GUIDE.md`](./DDD_ADVANCED_GUIDE.md)
**Duration**: 10 min quick-start | 30 min full guide
**What You'll Learn**:
- Event Sourcing pattern (events as source of truth)
- Aggregate Roots with event sourcing
- Pure function EventApplier for state machines
- Dual EventStore (InMemory for tests, Database for production)
- Complete audit trail and temporal queries

**For You If**:
- ✅ You need complete audit history
- ✅ Your domain requires complex state machines
- ✅ You want to replay events for debugging
- ✅ You're building financial/payment systems

**CLI Usage**:
```bash
bun run scaffold Payment --type advanced
# Generates complete Event Sourcing module with:
# - Aggregate Root + Domain Events
# - EventApplier (pure function state machine)
# - InMemory + Database EventStore
```

---

## 📖 Full Documentation

### Module Templates

#### Simple (Default)
- Basic CRUD structure
- Repository pattern
- Aggregate entities
- Optional domain events
- Best for: MVP, CRUD-heavy apps

#### Advanced (Event Sourcing)
- Complete event history
- Aggregate Roots with events
- Pure function EventApplier
- Dual EventStore (test & prod)
- Best for: Complex domains, financial systems

---

## 🏗️ Architecture Comparison

### Simple Template Structure
```
Module/
├── Domain/
│   ├── Entities/        # Business objects
│   ├── ValueObjects/    # Immutable values
│   ├── Repositories/    # Data access interfaces
│   └── Services/        # Domain logic
├── Application/         # Use cases
├── Infrastructure/      # Repository implementations
└── Presentation/        # HTTP controllers
```

### Advanced Template Structure
```
Module/
├── Domain/
│   ├── AggregateRoots/  # Event-sourced aggregates
│   ├── Events/          # Immutable domain events
│   ├── Services/        # EventApplier (pure functions)
│   ├── Repositories/    # Event store interfaces
│   └── ValueObjects/    # Immutable domain values
├── Application/         # Use cases, DTOs
├── Infrastructure/
│   ├── Repositories/    # ORM implementations
│   └── EventStore/      # InMemory + Database
└── Presentation/        # HTTP controllers
```

---

## 🔄 Workflow Examples

### Example 1: E-Commerce Platform (Simple)

```bash
# 1. Create project
bun run scaffold ecommerce

# 2. Generate modules
bun run scaffold Product
bun run scaffold Order
bun run scaffold Inventory

# 3. Implement business logic
# Edit Domain/Entities, Application/Services, Infrastructure/Repositories

# 4. Test
bun test
```

**AutoDiBootstrap Benefit**: No manual provider registration. Just implement and go.

---

### Example 2: Payment System (Advanced + Event Sourcing)

```bash
# 1. Create project
bun run scaffold payment-system

# 2. Generate Advanced modules
bun run scaffold Payment --type advanced
bun run scaffold Settlement --type advanced
bun run scaffold Refund --type advanced

# 3. Event Sourcing Features:
# - Payment module emits PaymentCreatedEvent, PaymentConfirmedEvent
# - Settlement module subscribes and processes events
# - Complete audit trail of all payment state changes
# - Can replay events to debug or export reports

# 4. Event Subscribers for cross-module communication
# - PaymentConfirmedEvent → Triggers Settlement
# - SettlementCompletedEvent → Triggers Notification
```

**Event Sourcing Benefits**:
- ✅ Complete payment history for auditing
- ✅ Replay events to find where payment got stuck
- ✅ Temporal queries (payment status at any point in time)
- ✅ Easy debugging with full event trail

---

## 📊 When to Use Each Template

### Use Simple Template When:
- Building CRUD-heavy applications
- You're just starting the project
- Domain logic is straightforward
- You don't need audit history

### Use Advanced (Event Sourcing) When:
- Financial/payment systems (compliance required)
- Complex state machines
- Audit trail is business requirement
- You need temporal queries
- Integration with multiple systems

### Use AutoDiBootstrap When:
- You're generating multiple modules
- You want zero manual configuration
- You want DI to "just work"
- You value developer experience

---

## 🚀 Getting Started

### 5-Minute Setup

```bash
# 1. Create project
bun run scaffold my-app

# 2. Read appropriate guide
cat packages/scaffold/docs/DDD_AUTODDI_GUIDE.md

# 3. Generate first module
bun run scaffold User

# 4. Implement business logic
# Domain/Entities/User.ts
# Application/Services/CreateUserService.ts
# Infrastructure/Repositories/UserRepository.ts

# 5. Start coding
bun run dev
# AutoDiBootstrap auto-discovers and registers services
```

---

## 🎓 Learning Path

### Beginner
1. Read **AutoDiBootstrap Guide** - Understand conventions
2. Generate first Simple module - Get hands-on experience
3. Write business logic in 3 files (Entity, Service, Repository)
4. See AutoDiBootstrap auto-wire everything - No manual configuration

### Intermediate
1. Read **Advanced Guide** - Understand Event Sourcing
2. Generate Advanced module for complex domain
3. Implement EventApplier (pure function state machine)
4. Write tests for event transitions
5. See audit trail in action

### Advanced
1. Combine Simple + Advanced modules in single project
2. Implement event subscribers for cross-module communication
3. Build CQRS query side (projections)
4. Implement Saga pattern for multi-step workflows

---

## ⚡ Tips & Tricks

### Tip 1: Progressive Adoption
```bash
# Start simple, upgrade later
bun run scaffold Payment                    # Simple: basic CRUD
# Later when needs change:
bun run scaffold Payment --type advanced    # Advanced: Event Sourcing
```

### Tip 2: Naming Conventions (AutoDiBootstrap)
Services are auto-discovered by filename:
```
OrderDomainService.ts    → auto-discovered ✓
OrderRepository.ts       → auto-discovered ✓
OrderEventSubscriber.ts  → auto-discovered ✓

order.routes.ts          → auto-discovered ✓

handler.ts               → NOT discovered ✗
OrderService.ts          → Ambiguous (Domain vs App?) ✗
```

### Tip 3: Event Versioning
```typescript
// When event schema changes, upgrade version
getSchemaVersion(): string {
  return '2.0.0'  // Was '1.0.0'
}

// Old events can be migrated during deserialization
```

### Tip 4: Testing EventApplier
```typescript
// Pure functions = easy testing
const state1 = PaymentEventApplier.apply(null, event)
const state2 = PaymentEventApplier.apply(null, event)
// state1 === state2 ✓ (deterministic)
```

---

## 📞 Support & FAQ

### Q: Which template should I choose?
**A**: Start with Simple. Upgrade to Advanced when you need event history or complex state machines.

### Q: Can I mix Simple and Advanced modules?
**A**: Yes! Single project can have both. Simple modules use repos, Advanced modules use EventStore.

### Q: Does AutoDiBootstrap affect performance?
**A**:
- Development: ~100-150ms auto-scan (acceptable)
- Production: ~10-20ms manual registration (recommended)

### Q: How do I enable AutoDiBootstrap?
**A**: See `DDD_AUTODDI_GUIDE.md` → Sections "啟用 AutoDiBootstrap"

### Q: How do I write EventApplier tests?
**A**: See `DDD_ADVANCED_GUIDE.md` → Section "Core Concepts: Event Applier"

---

## 🔗 Related Resources

### In This Repository
- [`DDD_AUTODDI_GUIDE.md`](./DDD_AUTODDI_GUIDE.md) - AutoDiBootstrap guide
- [`DDD_ADVANCED_GUIDE.md`](./DDD_ADVANCED_GUIDE.md) - Event Sourcing guide

### External Resources
- [Martin Fowler: Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Event Sourcing Talk by Greg Young](https://www.youtube.com/watch?v=LDW0QWie21s)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)

---

## 🎉 You're Ready!

Pick a guide above and start building your DDD application:

- **Unsure about DI?** → [`DDD_AUTODDI_GUIDE.md`](./DDD_AUTODDI_GUIDE.md)
- **Need Event Sourcing?** → [`DDD_ADVANCED_GUIDE.md`](./DDD_ADVANCED_GUIDE.md)
- **Want both?** → Read both guides!

---

**Created with ❤️ for Gravito Framework developers**

Last Updated: 2026-03-10
