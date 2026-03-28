# Feature Research

**Domain:** TypeScript framework error handling & resilience (brownfield, ~50 Orbit packages)
**Researched:** 2026-03-28
**Confidence:** HIGH — based on direct codebase audit + verified production patterns

---

## Current State Audit

Before mapping features, what already exists in `@gravito/resilience` and `@gravito/core`:

| Component | Exists | Location | Gap |
|-----------|--------|----------|-----|
| `CircuitBreaker` | YES — full implementation | `resilience/src/circuit-breaker/` | Not wired to Orbit packages (atlas, plasma, beam, etc.) |
| `RetryScheduler` | YES — BullMQ-based distributed retry | `resilience/src/retry/` | Only works for event bus retries, not general-purpose |
| `GravitoException` | YES — base class with `status`, `code`, `i18nKey` | `core/src/exceptions/` | Missing numeric error codes; no `cause` chain standard |
| `ErrorHandler` | YES — HTTP error handler with hook integration | `core/src/ErrorHandler.ts` | Handles HTTP layer only; Orbit-level errors not unified |
| `DatabaseError` hierarchy | YES — atlas-specific, `DatabaseError` → `ConnectionError`, `ConstraintViolationError` | `atlas/src/errors/` | Not derived from `GravitoException`; no error codes |
| `FortifyError` + `ErrorCodes` | YES — auth-domain specific, excellent pattern | `fortify/src/errors/` | Isolated to fortify; pattern not applied to other Orbits |
| `BackpressureManager`, `DeadLetterQueue` | YES — for event bus | `resilience/src/` | Event-bus scoped; not generalized |
| Graceful shutdown hooks | PARTIAL — plasma registers `core:shutdown` | `plasma/src/OrbitPlasma.ts` | Inconsistent; atlas, beam, stream lack timeout-guarded shutdown |
| Timeout handling | PARTIAL — beam has `BeamTimeoutError`, stasis has `LockTimeoutError` | Per-package | No framework-level timeout wrapper; inconsistent error types |
| Fallback / degradation | MINIMAL — comments only in plasma | `plasma/src/OrbitPlasma.ts` | No structural fallback mechanism; no `OrbitUnavailableError` |

**The core gap:** 50 packages each invent their own `throw new Error(...)` patterns. There is no shared error taxonomy, no standard error code namespace, and no framework-level way to say "this Orbit is degraded, here is a fallback value."

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that framework users (Satellite authors, app developers) assume exist in any production-grade TypeScript framework. Missing these makes the framework feel unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Unified error base class** — all Orbit errors extend a common `GravitoException`-derived class | Every mature framework (NestJS, Laravel, Spring) provides this; package authors cannot safely catch "Gravito errors" without it | LOW | `GravitoException` exists in core; work is migrating `DatabaseError`, `RedisError`, `MassValidationError`, etc. to extend it |
| **Structured error codes** — machine-readable namespace:code strings on every error | Required for client-side error handling, logging, monitoring dashboards, and i18n; `fortify` already does this right | LOW | Fortify's `ErrorCodes` pattern (`auth.invalid_credentials`) is the model; needs framework-wide adoption with per-package namespaces (`db.*`, `redis.*`, `stream.*`) |
| **Error cause chaining** — `cause` field propagated correctly | Node.js `Error` supports `cause` since v16.9; TypeScript consumers rely on it for root cause analysis | LOW | `GravitoException` constructor accepts `cause`; individual packages don't populate it consistently |
| **General-purpose sync/async retry** — `withRetry(fn, options)` utility wrapping any operation | Production apps retry DB queries, HTTP calls, Redis ops; existing `RetryScheduler` is event-bus-only and requires BullMQ | MEDIUM | Needs a lightweight synchronous retry with exponential backoff that works without BullMQ; the `RetryScheduler` handles distributed retries separately |
| **Circuit breaker wired to Orbit packages** — atlas, plasma, beam, signal use circuit breakers | Framework users expect DB and Redis calls to fail fast when those services are down, not hang indefinitely | MEDIUM | `CircuitBreaker` class is complete; work is integrating it into atlas pool, plasma Redis client, beam HTTP client |
| **Timeout on all external I/O** — DB queries, Redis ops, HTTP requests have configurable timeouts | Production systems must bound latency; partial implementations in beam/stasis but inconsistent | MEDIUM | Requires per-package timeout wrapping; beam and atlas pool already handle some of this |
| **Graceful shutdown with timeout** — all Orbits respond to `core:shutdown` within a deadline | Standard in any framework that manages connections; data corruption risk without it | MEDIUM | plasma has it; atlas, stream, signal, beam, monitor need to register shutdown handlers with deadline enforcement |
| **Orbit health status reporting** — whether an Orbit is HEALTHY / DEGRADED / UNAVAILABLE | `@gravito/monitor` exists; Orbits need to publish health into it consistently | MEDIUM | Monitor package exists; the feature is wiring Orbit packages to register health checks |

### Differentiators (Competitive Advantage)

Features that go beyond what users expect and distinguish the framework's resilience model.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Graceful degradation with fallback values** — Orbit operations return a typed fallback instead of throwing when degraded | NestJS/Express give you circuit breakers that throw; Gravito can offer `orbit.withFallback(operation, fallbackFn)` that never propagates to the HTTP layer | HIGH | Requires a degradation context: "Is this Orbit currently degraded? If yes, use cache/default/null instead of throwing." Interaction with circuit breaker state. |
| **Per-Orbit error namespace registry** — each Orbit registers its error codes; framework can enumerate all possible errors | Enables generated API documentation that lists every error code, monitoring alert templates per error domain | MEDIUM | Lightweight registry: `ErrorRegistry.register('atlas', AtlasErrorCodes)`. No runtime overhead. |
| **Retry + circuit breaker composition** — `withResilience(fn, { retry, circuitBreaker })` wraps both together in the right order | Forces correct ordering (retry inside circuit breaker, not the other way); prevents the common mistake of retrying an open circuit | MEDIUM | The composition layer. Retry wraps the inner fn; circuit breaker wraps the retry. Needs to be explicit in API. |
| **Request-scoped error context** — errors carry the active request trace ID, user context, and Orbit source | `RequestScopeErrorContext` already exists in core; extending it to carry Orbit-level diagnostics | LOW-MEDIUM | Partial infrastructure exists; the differentiator is making this automatic for every Orbit, not opt-in |
| **Idempotency key propagation** — retried operations carry the same idempotency key, preventing double-writes | Critical for commerce/payment Satellites; `IdempotencyCache` in resilience exists for events | HIGH | Event idempotency exists; generalizing to HTTP retries and DB operations is the complex part |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Global try/catch wrapper around all Orbit calls** | Seems easy to add "error safety" everywhere | Swallows errors silently; hides real failures; defeats TypeScript's type narrowing | Explicit error types per operation; consumers handle known failure modes |
| **Automatic retry on ALL errors** | Reducing manual retry logic | Retrying non-transient errors (validation, auth, constraint violations) causes infinite loops and wasted resources | Classify errors as `Retryable` vs `Terminal` at error definition time; retry only `Retryable` |
| **Single global circuit breaker** | Simpler to configure | One slow service trips the breaker for all services; unrelated features fail together | Per-dependency named circuit breakers (one for atlas-postgres, one for plasma-redis, one for beam-payments-api) |
| **Synchronous blocking retry** | Familiar pattern | Blocks event loop; degrades throughput for all requests during retry wait | Async retry with `await`; or BullMQ-based distributed retry for long waits |
| **Hiding errors from Satellite consumers** | "Better DX" — consumers don't need to handle errors | Removes Satellite authors' ability to apply domain-specific error handling; business errors need domain context | Propagate typed errors; let Satellite authors catch and transform as needed |
| **Error swallowing in degraded mode** | Seems like graceful degradation | Silent failures are harder to debug than loud ones | Log + metric every degraded fallback; make fallback explicit in return type (use `Result<T>` or callback) |

---

## Feature Dependencies

```
[Unified error base class (GravitoException migration)]
    └──required-by──> [Structured error codes (per-package namespaces)]
    └──required-by──> [Error cause chaining]
    └──required-by──> [Per-Orbit error namespace registry]

[General-purpose async retry utility]
    └──required-by──> [Retry + circuit breaker composition]
    └──uses-existing──> [CircuitBreaker (already built)]

[Retry + circuit breaker composition]
    └──required-by──> [Circuit breaker wired to Orbit packages]

[Circuit breaker wired to Orbit packages]
    └──required-by──> [Graceful degradation with fallback values]

[Orbit health status reporting]
    └──uses-existing──> [@gravito/monitor (already built)]
    └──required-by──> [Graceful degradation with fallback values]

[Graceful shutdown with timeout]
    └──independent──> can be done in parallel with error model work

[Request-scoped error context enrichment]
    └──uses-existing──> [RequestScopeErrorContext (already built)]
    └──requires──> [Unified error base class]
```

### Dependency Notes

- **Unified error base class is the blocker for everything else.** Error codes, registries, and fallback logic all assume a common base type. This must be Phase 1.
- **General-purpose retry does NOT require circuit breaker.** They can be built independently and composed later. Build retry first (simpler, immediately useful), then compose.
- **Circuit breaker integration into Orbit packages requires the circuit breaker class to be stable.** It already is. The work is configuration and wiring, not reimplementation.
- **Graceful degradation is a late Phase feature.** It builds on: unified errors + circuit breaker wired + health reporting. Attempting it first leads to the anti-pattern of silent failure.
- **Graceful shutdown is independent.** It does not depend on the error model. Can be parallelized.

---

## MVP Definition (for this milestone)

This is a brownfield feature addition to an existing framework. "MVP" means: the minimum to make the v2.0.0 claim true — "core + all Orbit packages have production-ready error handling and resilience."

### Launch With (v2.0.0 — this milestone)

- [ ] **Unified error taxonomy** — `DatabaseError`, `RedisError`, `MassValidationError`, `FluxError`, `BeamError`, etc. all extend `GravitoException` with structured `code` fields. Bare `throw new Error(...)` eliminated from all Orbit packages. Every atlas grammar error, connection error, and driver error has a typed class.
- [ ] **Error code namespaces for all Orbit packages** — following fortify's `ErrorCodes` pattern: `AtlasErrorCodes` (`db.connection_failed`, `db.query_timeout`, `db.unique_constraint`), `PlasmaErrorCodes` (`redis.unavailable`, `redis.timeout`), `BeamErrorCodes` (`http.timeout`, `http.circuit_open`), etc.
- [ ] **General-purpose async retry utility** — `withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T>` with exponential backoff, jitter, max attempts, error classification (`Retryable | Terminal`). Lives in `@gravito/resilience` alongside `CircuitBreaker`.
- [ ] **Circuit breaker wired to atlas (DB) and plasma (Redis)** — the two highest-impact integrations. atlas connection pool wraps driver calls through a named circuit breaker. plasma Redis client wraps operations through a named circuit breaker.
- [ ] **Graceful shutdown with deadline** — atlas, plasma, stream, signal, and beam all register `core:shutdown` handlers with a configurable timeout. If shutdown exceeds deadline, force-close with a logged warning.
- [ ] **Orbit health check registration** — atlas, plasma, stream, signal, beam each register a health check with `@gravito/monitor`. This is structural (defines the interface), not necessarily real-time probing.

### Add After Validation (v2.1.0)

- [ ] **Circuit breaker for beam (HTTP client)** — wires the existing circuit breaker into beam's HTTP connection pool; lower urgency than DB/Redis
- [ ] **Retry + circuit breaker composition API** — the `withResilience()` convenience wrapper; can be assembled manually in v2.0.0
- [ ] **Graceful degradation with fallback values** — `OrbitDegradationManager` that returns fallback data when a circuit is open; requires v2.0.0 circuit breaker integrations to be stable first
- [ ] **Request-scoped error context enrichment** — automatic trace ID / user context propagation into every Orbit error; nice-to-have for v2.0

### Future Consideration (v2.x+)

- [ ] **Per-Orbit error namespace registry** — `ErrorRegistry.register(namespace, codes)` for documentation generation; low operational value, high DX value
- [ ] **Idempotency key propagation for HTTP retries** — critical for payment flows but belongs in the commerce Satellite layer, not the framework layer
- [ ] **Distributed tracing integration** — OTel span enrichment for circuit breaker and retry events; `@gravito/monitor` already has tracing infrastructure

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Unified error base class migration (~50 packages) | HIGH — type safety, consistent catch | MEDIUM — mechanical but broad | P1 |
| Error code namespaces per Orbit | HIGH — machine-readable errors | LOW — pattern established by fortify | P1 |
| General-purpose async retry utility | HIGH — every Orbit needs this | LOW — ~100 lines, no new deps | P1 |
| Circuit breaker wired to atlas + plasma | HIGH — protects most critical dependencies | MEDIUM — integration work | P1 |
| Graceful shutdown with deadline | HIGH — prevents data corruption | LOW-MEDIUM — hook registration | P1 |
| Orbit health check registration | MEDIUM — observability | LOW — interface only | P1 |
| Circuit breaker for beam | MEDIUM — HTTP is less critical than DB/Redis | LOW | P2 |
| `withResilience()` composition | MEDIUM — DX | LOW | P2 |
| Graceful degradation with fallback | HIGH — differentiator | HIGH — complex state machine | P2 |
| Request-scoped error enrichment | MEDIUM — debugging | MEDIUM | P2 |
| Error namespace registry | LOW — documentation | LOW | P3 |
| Idempotency for HTTP retries | HIGH (for commerce) | HIGH — cross-cutting | P3 |

**Priority key:**
- P1: Must have for v2.0.0 to be "production-ready"
- P2: Should have, add in v2.1.0
- P3: Nice to have, v2.x+

---

## Competitor / Reference Framework Analysis

How comparable frameworks handle these same problems:

| Feature | NestJS | Laravel (PHP reference) | Gravito v1.x | Gravito v2.0 Target |
|---------|--------|------------------------|--------------|---------------------|
| Unified error base | `HttpException` + filters | `Exception` hierarchy | `GravitoException` (partial adoption) | Full adoption across all Orbits |
| Error codes | No built-in standard; community uses string constants | `$code` property on exceptions | `fortify` only | All packages with namespace:code |
| Retry | Manual or `@nestjs/bull`; no framework primitive | Queue-based; no built-in | `RetryScheduler` (BullMQ, event-bus only) | `withRetry()` general-purpose + RetryScheduler |
| Circuit breaker | Not built-in; use `opossum` library | Not built-in | `CircuitBreaker` class (complete, unwired) | Wired to atlas + plasma + beam |
| Graceful shutdown | `enableShutdownHooks()` on AppModule | Laravel Octane handles this | Partial (plasma only) | All Orbits with deadline enforcement |
| Graceful degradation | No framework-level support | Not built-in | Not present | `OrbitDegradationManager` (v2.1) |
| Health checks | `@nestjs/terminus` (separate package) | Pulse (separate package) | `@gravito/monitor` (exists) | Wired to all Orbits |

**Observation:** Gravito has more resilience infrastructure built than NestJS at this layer (circuit breaker, backpressure, DLQ are all present). The gap is breadth of adoption — the tools exist but are not wired into the packages that need them.

---

## Complexity Notes for Roadmap

| Phase Topic | Complexity Driver | Notes |
|-------------|------------------|-------|
| Error base class migration | BREADTH — ~50 packages to touch | Mostly mechanical; each package's work is similar but the total count is high. Parallel agent execution is appropriate. |
| Error code namespaces | LOW — pattern is clear | fortify is the reference; copy and adapt per package |
| General-purpose retry | LOW — algorithm is known | Exponential backoff with jitter is 80 lines; error classification interface adds 20 more |
| Circuit breaker wiring to atlas | MEDIUM — atlas pool is complex | atlas has its own `PoolHealthChecker`, connection management; need to wrap at the right layer |
| Circuit breaker wiring to plasma | LOW-MEDIUM — plasma is simpler | Redis client is more straightforward to wrap |
| Graceful shutdown | LOW-MEDIUM — mostly hook registration | Deadline enforcement is the tricky part; must not hang the process |
| Graceful degradation | HIGH — new design pattern | Requires: circuit state access + health status + fallback interface + consumer API. Do not rush into v2.0. |

---

## Sources

- Codebase audit: `/packages/resilience/src/`, `/packages/core/src/exceptions/`, `/packages/fortify/src/errors/`, `/packages/atlas/src/errors/`, `/packages/plasma/src/`
- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters) — global exception filter pattern
- [Resilience Patterns in TypeScript: Circuit Breaker](https://nobuti.com/thoughts/resilience-patterns-circuit-breaker)
- [Building Resilient Systems: Circuit Breakers and Retry Patterns](https://dasroot.net/posts/2026/01/building-resilient-systems-circuit-breakers-retry-patterns/)
- [API Gateway Resilience and Fault Tolerance](https://zuplo.com/learning-center/api-gateway-resilience-fault-tolerance)
- [Graceful Degradation in Distributed Systems](https://www.geeksforgeeks.org/system-design/graceful-degradation-in-distributed-systems/)
- [The 5 commandments of clean error handling in TypeScript](https://medium.com/with-orus/the-5-commandments-of-clean-error-handling-in-typescript-93a9cbdf1af5)
- [AWS Well-Architected: Graceful Degradation](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_graceful_degradation.html)

---
*Feature research for: Gravito v2.0.0 — Error Handling & Resilience*
*Researched: 2026-03-28*
