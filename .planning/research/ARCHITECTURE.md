# Architecture Research

**Domain:** Error handling & resilience integration in Galaxy Architecture framework (v2.0.0)
**Researched:** 2026-03-28
**Confidence:** HIGH (based on direct codebase inspection)

---

## System Overview

### Current State: Galaxy Architecture Error Layers

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Satellites (15 business modules)                   │
│  satellite-rbac  satellite-catalog  satellite-commerce  ...           │
│  (NO direct changes — inherit benefits via event isolation)           │
├──────────────────────────────────────────────────────────────────────┤
│                    Orbit Packages (~50 packages)                      │
│  ┌─────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ photon  │ │  atlas  │ │signal  │ │fortify │ │ echo   │           │
│  │ HTTP    │ │  ORM    │ │events  │ │  auth  │ │webhook │           │
│  │         │ │         │ │        │ │        │ │        │           │
│  │HttpExc  │ │DatabaseE│ │raw     │ │Fortify │ │own CB  │           │
│  │GravitoE │ │Connectio│ │throws  │ │Error   │ │own     │           │
│  └────┬────┘ └────┬────┘ └───┬────┘ └───┬────┘ └───┬────┘           │
│       │           │          │          │          │                 │
│  plasma   stream  stasis  sentinel  flare  ripple  nova  ...         │
│  RedisErr KafkaErr own CB  raw       raw    raw     NovaErr  ...      │
│                                                                      │
│  PROBLEM: ~10 incompatible error hierarchies, no unified interface   │
├──────────────────────────────────────────────────────────────────────┤
│                    PlanetCore (@gravito/core)                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  GravitoException (abstract)                                  │    │
│  │    ├─ HttpException        ├─ ValidationException             │    │
│  │    ├─ AuthenticationExc    └─ AuthorizationException          │    │
│  │  ErrorHandler (HTTP layer only, not shared to Orbits)         │    │
│  │  GlobalErrorHandlers (process-level: unhandledRejection etc)  │    │
│  │  Hooks: error:context / error:report / error:render           │    │
│  └──────────────────────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────────────────────┤
│  @gravito/resilience (parallel, standalone package)                  │
│    CircuitBreaker  BackpressureManager  DeadLetterQueue               │
│    RetryScheduler  WorkerPool  EventBatcher  ObservableHookManager   │
│  (currently: event-system focused, NOT integrated into Orbit errors) │
└──────────────────────────────────────────────────────────────────────┘
```

### Target State: v2.0.0 Unified Error & Resilience Integration

```
┌──────────────────────────────────────────────────────────────────────┐
│                    Satellites (unchanged)                             │
│  (benefit automatically: consistent errors from Orbits via events)   │
├──────────────────────────────────────────────────────────────────────┤
│                    Orbit Packages (~50 packages)                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Each Orbit wraps external calls with ResiliencePolicy          │  │
│  │  Each Orbit extends GravitoException hierarchy                  │  │
│  │  atlas: DatabaseException(GravitoException) + retry + CB        │  │
│  │  plasma: RedisException(GravitoException) + CB                  │  │
│  │  signal: EventException(GravitoException)                       │  │
│  │  photon: already uses GravitoException hierarchy                │  │
│  └────────────────────┬───────────────────────────────────────────┘  │
│                        │ throws GravitoException subclasses only      │
├────────────────────────┼─────────────────────────────────────────────┤
│                    PlanetCore (@gravito/core)                         │
│  ┌─────────────────────┴──────────────────────────────────────────┐  │
│  │  GravitoException (abstract) ← NEW domain subclasses added     │  │
│  │    ├─ HttpException       ├─ ValidationException                │  │
│  │    ├─ DatabaseException   ├─ InfrastructureException [NEW]      │  │
│  │    ├─ AuthException       └─ CircuitOpenException [NEW]         │  │
│  │  ErrorCode enum (centralized across all Orbits) [NEW]           │  │
│  │  ResiliencePolicy interface (standard contract) [NEW]           │  │
│  └──────────────────────────────────────────────────────────────  ┘  │
├──────────────────────────────────────────────────────────────────────┤
│  @gravito/resilience (enhanced — new policy facade)                  │
│    ResiliencePolicy (wraps: CB + Retry + Timeout + Fallback) [NEW]   │
│    CircuitBreaker (existing — needs GravitoException integration)    │
│    RetryScheduler (existing — needs GravitoException integration)    │
│    GracefulDegradationManager [NEW]                                  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Existing Component Inventory

### What Already Exists (Do Not Duplicate)

| Component | Location | Status |
|-----------|----------|--------|
| `GravitoException` (abstract, HTTP-focused) | `core/src/exceptions/GravitoException.ts` | EXISTS — extend, not replace |
| `HttpException`, `ValidationException` | `core/src/exceptions/` | EXISTS |
| `AuthenticationException`, `AuthorizationException` | `core/src/exceptions/` | EXISTS |
| `ModelNotFoundException` | `core/src/exceptions/` | EXISTS |
| `ErrorHandler` (HTTP layer error rendering) | `core/src/ErrorHandler.ts` | EXISTS — keep as-is |
| `GlobalErrorHandlers` (process-level) | `core/src/GlobalErrorHandlers.ts` | EXISTS — keep as-is |
| `CircuitBreaker` (full implementation) | `resilience/src/circuit-breaker/CircuitBreaker.ts` | EXISTS — reuse |
| `CircuitBreaker` (duplicate) | `core/src/events/CircuitBreaker.ts` | EXISTS — legacy, consolidate |
| `RetryScheduler` (BullMQ-based, event-system) | `resilience/src/retry/RetryScheduler.ts` | EXISTS — narrow scope (events only) |
| `BackpressureManager`, `DeadLetterQueue` | `resilience/src/` | EXISTS — event-system only |
| `DatabaseError`, `ConnectionError` | `atlas/src/errors/index.ts` | EXISTS — needs to wrap into GravitoException |
| `RedisError` | `plasma/src/errors.ts` | EXISTS — needs to wrap into GravitoException |
| `FortifyError` + ErrorCodes | `fortify/src/errors/` | EXISTS — domain-specific, parallel hierarchy |
| `ErrorCategorizer`, `ErrorRecoveryManager` | `stream/src/drivers/kafka/` | EXISTS — Kafka-specific, keep |
| Echo's `CircuitBreaker` | `echo/src/resilience/CircuitBreaker.ts` | EXISTS — duplicate, consolidate |
| Health checks (`createDatabaseCheck` etc) | `monitor/src/health/index.ts` | EXISTS — keep, integrate |

### What Is Missing (Must Build)

| Component | Purpose | New Package |
|-----------|---------|-------------|
| `InfrastructureException` | Base for all Orbit infrastructure failures (DB, Redis, cache, queue) | `@gravito/core` |
| `CircuitOpenException` | Specific error when circuit breaker rejects call | `@gravito/core` |
| `ErrorCode` registry (centralized enum/namespace) | Unified error codes across all Orbits | `@gravito/core` |
| `ResiliencePolicy` interface | Standard contract for wrapping any operation | `@gravito/resilience` |
| `ResiliencePolicyBuilder` | Fluent API: `.withRetry().withCircuitBreaker().withFallback()` | `@gravito/resilience` |
| `GracefulDegradationManager` | Coordinate Orbit fallback strategies | `@gravito/resilience` |
| Orbit-level error wrappers | Map raw driver errors → GravitoException subclasses | Each Orbit package |

---

## Component Boundaries

| Component | Responsibility | Package | Communicates With |
|-----------|---------------|---------|-------------------|
| `GravitoException` (extended) | Base error contract: status + code + cause + i18n | `@gravito/core` | All packages (throw/catch) |
| `InfrastructureException` | Root for DB/Redis/cache/queue failures | `@gravito/core` | Orbit packages |
| `CircuitOpenException` | Signals circuit is OPEN, carry circuit name + metrics | `@gravito/core` | Resilience consumers |
| `ErrorCode` namespace | Centralized codes: `DB_CONNECTION_FAILED`, `REDIS_TIMEOUT`, etc. | `@gravito/core` | All Orbit error constructors |
| `ResiliencePolicy` interface | Contract: `execute<T>(op, options) => Promise<T>` | `@gravito/resilience` | Orbit packages |
| `ResiliencePolicyBuilder` | Fluent composition: retry + CB + timeout + fallback | `@gravito/resilience` | Application config layer |
| `CircuitBreaker` (existing) | CLOSED/OPEN/HALF_OPEN state machine | `@gravito/resilience` | Via `ResiliencePolicy` |
| `GracefulDegradationManager` | Track which Orbits are degraded; broadcast via hooks | `@gravito/resilience` | `@gravito/core` hooks |
| Orbit error adapters | Convert raw driver errors to GravitoException subclasses | Each Orbit | `@gravito/core` |
| Orbit `ResiliencePolicy` wrappers | Wrap all external I/O with retry + CB | Each Orbit | `@gravito/resilience` |

---

## Error Propagation Flow

### Current (Broken) Flow

```
atlas PostgreSQL driver fails
    ↓
throws ConnectionError (extends Error, not GravitoException)
    ↓
ErrorHandler in photon catches unknown
    ↓
duck-types: checks for `.status` property
    ↓
falls through to generic 500 — code is 'INTERNAL_ERROR', no context
```

### Target (v2.0.0) Flow

```
atlas PostgreSQL driver fails
    ↓
ResiliencePolicy wraps the call:
  1. Retry: 3 attempts with exponential backoff
  2. CircuitBreaker: opens after 5 consecutive failures
  3. Fallback: returns cached result if available
    ↓
If all retry attempts fail:
  throws DatabaseException(
    code: ErrorCode.DB_CONNECTION_FAILED,
    status: 503,
    cause: original ConnectionError
  )
    ↓
ErrorHandler in photon catches GravitoException
    ↓
Renders structured 503 with { code: 'DB_CONNECTION_FAILED', ... }
    ↓
hooks.doAction('error:report', ctx) → triggers monitoring/alerting
```

### Circuit Open Flow

```
CircuitBreaker detects 5 consecutive failures → opens circuit
    ↓
GracefulDegradationManager notified via hook
    ↓
All subsequent calls to that Orbit:
  throw CircuitOpenException(
    code: ErrorCode.CIRCUIT_OPEN,
    status: 503,
    circuitName: 'atlas-postgres',
    metrics: { failures: 5, openedAt: ... }
  )
    ↓
ErrorHandler responds 503 immediately (no retry, no wait)
    ↓
GracefulDegradationManager triggers fallback strategy:
  - atlas: return cached data from stasis
  - plasma: use in-memory fallback
  - signal: queue events to dead-letter queue
```

---

## Recommended Project Structure (New Files Only)

```
packages/core/src/
├── exceptions/
│   ├── GravitoException.ts        # EXISTS — add errorCategory field
│   ├── InfrastructureException.ts # NEW — base for all Orbit failures
│   ├── DatabaseException.ts       # NEW — wraps atlas/dark-matter errors
│   ├── CacheException.ts          # NEW — wraps plasma/stasis errors
│   ├── QueueException.ts          # NEW — wraps stream/signal errors
│   ├── CircuitOpenException.ts    # NEW — circuit breaker rejection
│   └── index.ts                   # RE-EXPORT all
└── errors/
    └── ErrorCode.ts               # NEW — centralized error code registry

packages/resilience/src/
├── policy/
│   ├── ResiliencePolicy.ts        # NEW — interface + default impl
│   ├── ResiliencePolicyBuilder.ts # NEW — fluent builder
│   └── index.ts
├── degradation/
│   ├── GracefulDegradationManager.ts # NEW
│   └── index.ts
├── circuit-breaker/
│   └── CircuitBreaker.ts          # EXISTS — minor: throw CircuitOpenException
└── retry/
    └── RetryPolicy.ts             # NEW — synchronous retry (not BullMQ-based)
                                   # RetryScheduler stays for async event retries

packages/atlas/src/
├── errors/
│   └── index.ts                   # MODIFY — DatabaseException wraps DatabaseError
└── resilience/
    └── AtlasResiliencePolicy.ts   # NEW — default policy for DB operations

packages/plasma/src/
├── errors.ts                      # MODIFY — CacheException wraps RedisError
└── resilience/
    └── PlasmaResiliencePolicy.ts  # NEW — default policy for Redis operations

packages/signal/src/ (and other Orbit packages)
├── errors.ts                      # NEW per package — QueueException etc.
└── resilience/
    └── [Package]ResiliencePolicy.ts # NEW per package
```

---

## Architectural Patterns

### Pattern 1: GravitoException Hierarchy Extension

**What:** Add infrastructure-layer exception classes to `@gravito/core`, preserving the existing HTTP-status + code + i18n structure. All Orbit packages throw only from this hierarchy.

**When to use:** Any Orbit package that interacts with external systems (database, cache, queue, HTTP external).

**Trade-offs:** Single hierarchy means all errors are expressible as HTTP responses, which is correct for Photon's `ErrorHandler`. The `status: 503` on infrastructure errors is semantically correct.

```typescript
// packages/core/src/exceptions/InfrastructureException.ts
export abstract class InfrastructureException extends GravitoException {
  constructor(
    code: string,
    options: ExceptionOptions & { retryable?: boolean } = {}
  ) {
    super(503, code, options)
    this.name = 'InfrastructureException'
    this.retryable = options.retryable ?? false
  }
  public readonly retryable: boolean
}

// packages/core/src/exceptions/DatabaseException.ts
export class DatabaseException extends InfrastructureException {
  constructor(options: ExceptionOptions & { query?: string } = {}) {
    super(ErrorCode.DB_QUERY_FAILED, { retryable: false, ...options })
    this.name = 'DatabaseException'
  }
}

export class DatabaseConnectionException extends InfrastructureException {
  constructor(options: ExceptionOptions = {}) {
    super(ErrorCode.DB_CONNECTION_FAILED, { retryable: true, ...options })
    this.name = 'DatabaseConnectionException'
  }
}
```

### Pattern 2: ResiliencePolicy Wrapper (Orbit Layer)

**What:** Each Orbit wraps all external I/O calls in a `ResiliencePolicy`. The policy is configured once at package initialization and injected via IoC. Retry and circuit breaker run transparently.

**When to use:** Any call that crosses a network boundary (DB, Redis, HTTP, Kafka, SMTP).

**Trade-offs:** Adds ~2ms overhead per call in the happy path. Worth it because retry + CB remove the category of "cascade failure brings down the app" from production incidents.

```typescript
// packages/resilience/src/policy/ResiliencePolicy.ts
export interface ResiliencePolicy {
  execute<T>(
    operation: () => Promise<T>,
    options?: PolicyExecuteOptions
  ): Promise<T>
}

export interface PolicyExecuteOptions {
  fallback?: () => Promise<unknown>
  retryable?: boolean      // Override per-call retryability
  circuitName?: string     // Override which circuit to use
}

// Usage in atlas PostgresDriver:
class PostgresDriver {
  constructor(
    private config: PostgresConfig,
    private policy: ResiliencePolicy = defaultAtlasPolicy()
  ) {}

  async query(sql: string, bindings: unknown[]): Promise<QueryResult> {
    return this.policy.execute(
      () => this.pool.query(sql, bindings),
      { retryable: sql.startsWith('SELECT') }
    )
  }
}
```

### Pattern 3: Error Code Registry (Central Namespace)

**What:** A single `ErrorCode` namespace in `@gravito/core` defines all machine-readable codes for all Orbit packages. No package invents its own codes outside this registry.

**When to use:** Constructing any `GravitoException` subclass.

**Trade-offs:** All packages depend on core for error codes (they already do). Adding codes requires a `@gravito/core` change, which is the right signal that a new infrastructure failure mode is being formalized.

```typescript
// packages/core/src/errors/ErrorCode.ts
export const ErrorCode = {
  // HTTP layer (existing)
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Database (atlas, dark-matter)
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_TRANSACTION_FAILED: 'DB_TRANSACTION_FAILED',
  DB_UNIQUE_VIOLATION: 'DB_UNIQUE_VIOLATION',

  // Cache/Storage (plasma, stasis, nebula)
  CACHE_CONNECTION_FAILED: 'CACHE_CONNECTION_FAILED',
  CACHE_OPERATION_FAILED: 'CACHE_OPERATION_FAILED',

  // Queue/Events (stream, signal)
  QUEUE_UNAVAILABLE: 'QUEUE_UNAVAILABLE',
  EVENT_DISPATCH_FAILED: 'EVENT_DISPATCH_FAILED',

  // Resilience
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
} as const

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode]
```

### Pattern 4: GracefulDegradationManager (Coordination Layer)

**What:** A singleton-per-app manager that tracks Orbit health state. When a circuit opens, the manager records the degraded state and emits a core hook. Consumers (other Orbits, application code) can query which Orbits are degraded and select fallback paths.

**When to use:** Applications where some Orbits depend on others (e.g., stasis can cache atlas results during DB outage).

**Trade-offs:** Requires coordination between Orbits without introducing direct coupling. Uses the existing hooks system — no new inter-package dependencies.

```typescript
// packages/resilience/src/degradation/GracefulDegradationManager.ts
export class GracefulDegradationManager {
  private degradedOrbits = new Map<string, DegradationState>()

  onCircuitOpen(orbitName: string, metrics: CircuitBreakerMetrics): void {
    this.degradedOrbits.set(orbitName, { since: new Date(), metrics })
    // Fire core hook so app can react
    this.hooks.doAction('orbit:degraded', { orbit: orbitName, metrics })
  }

  isDegraded(orbitName: string): boolean {
    return this.degradedOrbits.has(orbitName)
  }

  getFallbackStrategy(orbitName: string): FallbackStrategy | undefined {
    return this.fallbackStrategies.get(orbitName)
  }
}
```

---

## Integration Points: New vs Modified

### New Components (build from scratch)

| Component | Package | Why New |
|-----------|---------|---------|
| `InfrastructureException` | `@gravito/core` | No base class for infrastructure failures exists |
| `DatabaseException`, `DatabaseConnectionException` | `@gravito/core` | Atlas errors don't extend GravitoException |
| `CacheException` | `@gravito/core` | Plasma/stasis errors don't extend GravitoException |
| `QueueException` | `@gravito/core` | Signal/stream errors don't extend GravitoException |
| `CircuitOpenException` | `@gravito/core` | No typed exception for circuit-open rejection |
| `ErrorCode` namespace | `@gravito/core` | Codes are fragmented (HTTP codes in ErrorHandler, fortify codes in fortify) |
| `ResiliencePolicy` interface | `@gravito/resilience` | No unified policy abstraction; CB and retry are used separately |
| `ResiliencePolicyBuilder` | `@gravito/resilience` | No composition API |
| `GracefulDegradationManager` | `@gravito/resilience` | No coordination layer exists |
| `RetryPolicy` (sync, in-process) | `@gravito/resilience` | `RetryScheduler` is async+BullMQ; need sync retry for DB calls |
| Per-Orbit `ResiliencePolicy` defaults | Each Orbit | No Orbits have resilience integration today |

### Modified Components (existing, targeted changes)

| Component | Package | Change |
|-----------|---------|--------|
| `GravitoException` | `@gravito/core` | Add `errorCategory` field (`client` | `infrastructure` | `transient`) |
| `atlas DatabaseError`, `ConnectionError` | `@gravito/atlas` | Wrap in `DatabaseException` at driver boundary |
| `plasma RedisError` | `@gravito/plasma` | Wrap in `CacheException` at client boundary |
| `CircuitBreaker.execute()` | `@gravito/resilience` | Throw `CircuitOpenException` instead of raw `Error` |
| `core/src/events/CircuitBreaker.ts` | `@gravito/core` | Deprecate, re-export from `@gravito/resilience` |
| `echo` local `CircuitBreaker` | `@gravito/echo` | Replace with `@gravito/resilience` `CircuitBreaker` |
| `ErrorHandler.handleError()` | `@gravito/core` | Handle `CircuitOpenException` as structured 503 |

---

## Data Flow Changes

### Error Propagation (Before vs After)

```
BEFORE:
  atlas driver → throws ConnectionError (raw Error)
  photon ErrorHandler → duck-types, falls to generic 500
  Response: { error: { message: "Internal Server Error", code: "INTERNAL_ERROR" } }

AFTER:
  atlas driver → ResiliencePolicy wraps call
  ResiliencePolicy (retry 3x) → all fail
  ResiliencePolicy converts → throws DatabaseConnectionException(status=503, code="DB_CONNECTION_FAILED")
  photon ErrorHandler → instanceof GravitoException, structured handler
  Response: { error: { message: "Database unavailable", code: "DB_CONNECTION_FAILED" } }
  Side effect: hooks.doAction("error:report") → monitor/alerting notified
```

### Graceful Degradation Flow

```
1. atlas ResiliencePolicy: 5 consecutive DB failures
2. CircuitBreaker transitions CLOSED → OPEN
3. CircuitBreaker calls: GracefulDegradationManager.onCircuitOpen("atlas-postgres", metrics)
4. GracefulDegradationManager: hooks.doAction("orbit:degraded", { orbit: "atlas-postgres" })
5. stasis Orbit (if configured): activates fallback read-through cache mode
6. Subsequent atlas calls: CircuitBreaker throws CircuitOpenException immediately (no wait)
7. Application layer (configured): catches CircuitOpenException → calls stasis cache instead
8. After resetTimeout: CircuitBreaker → HALF_OPEN → test request allowed
9. On success: GracefulDegradationManager.onCircuitClosed("atlas-postgres")
10. stasis returns to write-through mode
```

---

## Suggested Build Order

The dependency graph drives this ordering. Core changes must land before Orbits can adopt them.

```
Phase 1: Core Error Model Foundation
  1a. @gravito/core — Add ErrorCode registry
  1b. @gravito/core — Add InfrastructureException + domain subclasses
  1c. @gravito/core — Deprecate core/events/CircuitBreaker (re-export from resilience)

Phase 2: Resilience Policy Infrastructure
  2a. @gravito/resilience — RetryPolicy (synchronous, in-process)
  2b. @gravito/resilience — ResiliencePolicy interface + default impl
  2c. @gravito/resilience — ResiliencePolicyBuilder (fluent API)
  2d. @gravito/resilience — CircuitBreaker throws CircuitOpenException
  2e. @gravito/resilience — GracefulDegradationManager

Phase 3: Foundation Orbit Migration (highest blast radius first)
  3a. @gravito/atlas — DatabaseException wraps DatabaseError, add ResiliencePolicy
  3b. @gravito/plasma — CacheException wraps RedisError, add ResiliencePolicy
  3c. @gravito/signal — QueueException, add ResiliencePolicy
  3d. @gravito/photon — handle CircuitOpenException in ErrorHandler

Phase 4: Secondary Orbit Migration (batch, similar patterns)
  4a. Storage: @gravito/stasis, @gravito/nebula, @gravito/nebula-s3
  4b. Communication: @gravito/echo (consolidate local CB), @gravito/flare, @gravito/ripple
  4c. Auth/Security: @gravito/fortify (align FortifyError with GravitoException), @gravito/sentinel
  4d. Stream: @gravito/stream (already has ErrorCategorizer — plug into ResiliencePolicy)

Phase 5: Advanced Orbits + Verification
  5a. Remaining Orbits: @gravito/horizon, @gravito/flux, @gravito/forge, @gravito/nova
  5b. Full integration test: Satellite-level error path verification
  5c. Migration guide: document breaking changes for consumers
```

### Build Order Rationale

- **Phase 1 before 2:** Resilience package needs `CircuitOpenException` from core to throw typed errors.
- **Phase 2 before 3:** Atlas/plasma need `ResiliencePolicy` interface before they can implement it.
- **Atlas before plasma before signal (Phase 3):** These are the most depended-upon Orbits; fixing them first validates the pattern before batch-applying to 40+ others.
- **photon (3d) after atlas/plasma (3a/3b):** `ErrorHandler` must recognize `CircuitOpenException` before the app can render correct 503s for DB/cache failures.
- **Phase 4 in batches:** Storage, communication, and auth packages each follow the same pattern — implement once, verify, then batch the rest.
- **fortify special case:** `FortifyError` has its own domain-specific hierarchy (auth codes). In Phase 4, ensure `FortifyError` is either made to extend `GravitoException` or that `ErrorHandler` recognizes it via duck-typing. The existing `httpStatus` field is compatible.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Replacing Existing Exception Hierarchy

**What people do:** Delete `DatabaseError`/`ConnectionError` and replace with new classes.
**Why it's wrong:** Breaks any code in tests or external consumers that catches these specific types. Causes 40+ rippling test failures.
**Do this instead:** Keep `DatabaseError` as the internal driver representation. Wrap it at the Orbit boundary into `DatabaseException(cause: originalError)`. Callers catching `DatabaseError` still work; callers expecting `GravitoException` now work too.

### Anti-Pattern 2: Adding Circuit Breakers Inside Satellite Code

**What people do:** Copy `CircuitBreaker` into a satellite to protect its calls to an Orbit.
**Why it's wrong:** Violates Satellite isolation — Satellites should not care about Orbit health. Duplicates state. Bypasses GracefulDegradationManager.
**Do this instead:** Let the Orbit package own its own circuit breaker. If the Orbit's circuit is OPEN, it throws `CircuitOpenException`. The Satellite catches it as any other `GravitoException` and decides its business-level response.

### Anti-Pattern 3: Sync Retry in RetryScheduler

**What people do:** Use `RetryScheduler` (BullMQ-based) for synchronous DB retry logic.
**Why it's wrong:** `RetryScheduler` is designed for async event-system retries with Redis persistence. Using it for DB queries adds a Redis dependency to every DB call and changes a synchronous operation into an async queue operation with unbounded latency.
**Do this instead:** Build a separate `RetryPolicy` for synchronous in-process retries (exponential backoff, max attempts, synchronous). `RetryScheduler` stays for event-system use only.

### Anti-Pattern 4: Centralizing All Resilience State in Core

**What people do:** Put `GracefulDegradationManager` and all circuit breakers into `@gravito/core`.
**Why it's wrong:** Core has zero dependencies. Adding resilience managers would add state management and possibly timers to the microkernel, violating its minimal-footprint design.
**Do this instead:** `@gravito/core` defines interfaces and exception types only. `@gravito/resilience` owns all runtime state (circuit breakers, degradation manager). Orbits depend on `@gravito/resilience` as an optional dependency for wrapping external calls.

### Anti-Pattern 5: Making GracefulDegradationManager a Global Singleton

**What people do:** Export a module-level `degradationManager` instance.
**Why it's wrong:** Makes testing impossible (shared state between tests), and conflicts with IoC container patterns already in core.
**Do this instead:** `GracefulDegradationManager` is instantiated by `PlanetCore` during boot and registered in the IoC container. Orbit packages receive it via constructor injection.

---

## Scaling Considerations

| Scale | Architecture Notes |
|-------|--------------------|
| Single app | `ResiliencePolicy` defaults are adequate; `GracefulDegradationManager` runs in-process |
| Multiple app instances | Each instance has independent circuit breaker state — acceptable for v2.0.0; distributed CB (Redis-backed) is future work |
| High throughput (>10k req/s) | `CircuitBreaker.execute()` uses synchronous state checks — no I/O, negligible overhead |
| Many Orbits degraded simultaneously | `GracefulDegradationManager` fan-out via hooks is synchronous; verify hook chain performance under load |

---

## Integration Points Summary

### External Boundaries (where ResiliencePolicy wraps calls)

| Boundary | Orbit Package | Exception Type | Default Policy |
|----------|---------------|----------------|----------------|
| PostgreSQL / MySQL / SQLite | `@gravito/atlas` | `DatabaseConnectionException`, `DatabaseException` | Retry(3) + CB(5 failures) |
| Redis | `@gravito/plasma` | `CacheException` | CB(5 failures), no retry (Redis failures are fast-fail) |
| MongoDB | `@gravito/dark-matter` | `DatabaseException` | Retry(2) + CB(5 failures) |
| Object Storage (S3/R2) | `@gravito/nebula-s3` | `InfrastructureException` | Retry(3), no CB |
| SMTP / Email | `@gravito/signal` | `QueueException` | Retry(3) + DLQ fallback |
| Outgoing webhooks | `@gravito/echo` | `InfrastructureException` | Retry(4) + per-host CB |
| WebSocket connections | `@gravito/ripple` | `InfrastructureException` | CB(3 failures), reconnect backoff |
| Background jobs / BullMQ | `@gravito/stream` | `QueueException` | Retry handled by BullMQ; stream-level CB |
| Kafka | `@gravito/stream` | `QueueException` | Uses existing `ErrorRecoveryManager` — wrap in `ResiliencePolicy` adapter |

### Internal Boundaries (hook-based, no direct coupling)

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `ResiliencePolicy` → `GracefulDegradationManager` | Callback on CB state change | CB options: `onOpen`, `onHalfOpen`, `onClose` |
| `GracefulDegradationManager` → Application | `orbit:degraded` hook via `PlanetCore.hooks` | App can configure fallback behavior |
| `ErrorHandler` → Monitoring | `error:report` hook (existing) | Unchanged; now receives richer `CircuitOpenException` |
| Satellite → Orbit error | Event-driven (unchanged) | Satellites catch `GravitoException` from Orbit calls |

---

## Sources

- Codebase inspection: `packages/core/src/exceptions/`, `packages/resilience/src/`, `packages/atlas/src/errors/`, `packages/plasma/src/errors.ts`, `packages/echo/src/resilience/`, `packages/stream/src/drivers/kafka/`
- Galaxy Architecture design: `docs/claude/design.md`, `docs/claude/packages.md`
- Project context: `.planning/PROJECT.md`
- Confidence: HIGH — all findings from direct source code inspection, no speculation

---
*Architecture research for: Gravito v2.0.0 Error Handling & Resilience Integration*
*Researched: 2026-03-28*
