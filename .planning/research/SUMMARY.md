# Project Research Summary

**Project:** Gravito v2.0.0 — Unified Error Handling & Resilience
**Domain:** TypeScript/Bun monorepo framework hardening (brownfield, ~50 Orbit packages)
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

Gravito is a mature Galaxy Architecture TypeScript framework with solid resilience primitives already in place — `CircuitBreaker`, `RetryScheduler`, `BackpressureManager`, `DeadLetterQueue`, and `HealthRegistry` all exist. The problem is scope: these tools are scoped exclusively to the event-bus system and are not wired into the 50 Orbit packages that interact with external services (databases, Redis, HTTP, SMTP, queues). In parallel, each Orbit package invents its own error types extending plain `Error`, creating ~10 incompatible error hierarchies that `@gravito/photon`'s `ErrorHandler` can only partially handle via duck-typing — producing generic 500 responses where structured 404/422/503 responses should appear.

The recommended approach is **extend and unify, not replace**. `GravitoException` already has the right shape (`status`, `code`, `i18nKey`, `cause`); the work is migrating all Orbit error classes to extend it, adding a centralized `ErrorCode` registry, and wrapping external I/O calls in a `ResiliencePolicy` facade backed by `cockatiel` (the one new dependency recommended — zero-dep, ESM+CJS, MIT, verified Bun-compatible). The build order is non-negotiable: core error model first, then resilience infrastructure, then high-blast-radius Orbits (atlas, plasma), then secondary Orbits in batches.

The critical risks are: (1) `instanceof` breaking silently across ESM/CJS boundaries if `Object.setPrototypeOf` is omitted from new error constructors; (2) existing tests passing while structural contracts are broken because they assert on `.message` strings rather than `.code`/`.status`; (3) retry logic applied to non-idempotent DB operations causing duplicate writes. All three must be mitigated at Phase 1 with contract test scaffolding, prototype chain enforcement, and idempotency gates — before any per-package migration begins.

---

## Key Findings

### Recommended Stack

The framework already has everything needed except a general-purpose synchronous retry utility for DB/HTTP/Redis calls. The strategy is to add exactly one new dependency and extend existing code for the rest.

**Core technologies:**
- `@gravito/core` `GravitoException` — unified error base; extend to add `InfrastructureException` and domain subclasses rather than importing any new error library
- `@gravito/resilience` `CircuitBreaker` — reuse the existing full implementation; expose via a new `ResiliencePolicy` facade so Orbit packages don't call it directly
- `@gravito/monitor` `HealthRegistry` — already supports `healthy`/`degraded`/`unhealthy` Kubernetes probes; wire Orbit packages into it via `registerOrbit()`
- `cockatiel@^3.2.1` — the only new dependency; provides synchronous retry + timeout + bulkhead composition for DB/HTTP/Redis calls; zero dependencies, ESM+CJS, MIT
- `@opentelemetry/api@^1.9.1` — already a peer dependency in 6 packages; extend usage to error span recording and trace ID propagation in error responses

**What NOT to use:** `neverthrow`/`ts-results` would require rewriting 50 package call sites; Effect-TS is 18 MB with production-reported interop friction; `opossum` requires Node-specific `EventEmitter` and is heavier than needed.

### Expected Features

**Must have (table stakes — v2.0.0):**
- Unified error base class — all Orbit errors extend `GravitoException` hierarchy; `DatabaseError`, `RedisError`, `MassValidationError` etc. stop extending plain `Error`
- Structured error code namespaces per Orbit — following `@gravito/fortify`'s `ErrorCodes` pattern (`db.*`, `redis.*`, `stream.*`)
- General-purpose async retry utility — `withRetry(fn, options)` with exponential backoff + jitter, distinct from the BullMQ-based `RetryScheduler`
- Circuit breaker wired to atlas (DB) and plasma (Redis) — the two highest-impact external dependencies
- Graceful shutdown with deadline — atlas, plasma, stream, signal, beam all register `core:shutdown` handlers with configurable deadline enforcement
- Orbit health check registration — structural wiring of all major Orbits into `@gravito/monitor`

**Should have (v2.1.0):**
- Circuit breaker for beam (HTTP client)
- `withResilience()` composition API — convenience wrapper combining retry + circuit breaker in correct order
- Graceful degradation with fallback values — `OrbitDegradationManager` returning typed fallback data when circuit is open
- Request-scoped error context enrichment — automatic trace ID and user context in every Orbit error

**Defer (v2.x+):**
- Per-Orbit error namespace registry for documentation generation
- Idempotency key propagation for HTTP retries (belongs in commerce Satellite, not framework layer)
- Distributed tracing integration for circuit breaker events

### Architecture Approach

The architecture change is layered: `@gravito/core` grows a new `InfrastructureException` branch in the exception hierarchy and a centralized `ErrorCode` namespace; `@gravito/resilience` gains a `ResiliencePolicy` interface + `ResiliencePolicyBuilder` + `GracefulDegradationManager` + a synchronous `RetryPolicy`; each Orbit package wraps its external I/O calls in its own `ResiliencePolicyDefaults` configuration and maps raw driver errors to the unified hierarchy at the Orbit boundary. Satellite packages require zero direct changes — they inherit better error behavior automatically via the event isolation already in place.

**Major components:**
1. `ErrorCode` namespace + `InfrastructureException` branch (`@gravito/core`) — centralized type registry; all Orbit errors resolve here
2. `ResiliencePolicy` interface + `ResiliencePolicyBuilder` + synchronous `RetryPolicy` (`@gravito/resilience`) — standard contract for wrapping any external I/O call; cockatiel backs the implementation
3. `GracefulDegradationManager` (`@gravito/resilience`) — tracks Orbit health state, fires `orbit:degraded` hooks, coordinates fallback strategies via IoC injection
4. Per-Orbit error adapters and resilience defaults (each Orbit package) — map raw driver exceptions to the unified hierarchy; configure default retry + circuit breaker policy for that service type

### Critical Pitfalls

1. **Dual circuit breaker fragmentation** — `@gravito/resilience` and `@gravito/echo` each have independent `CircuitBreaker` implementations with incompatible config APIs. Phase 1 must include a consolidation audit; `echo`'s implementation must be deprecated and re-exported from `@gravito/resilience` before any new resilience code is written.

2. **`instanceof` breaks across ESM/CJS boundaries** — TypeScript error subclasses targeting ES5 silently break `instanceof` checks when the same class is loaded via both module formats. Every new error class constructor must call `Object.setPrototypeOf(this, ClassName.prototype)`. Reference implementation: `RippleError` already does this correctly. Add a cross-boundary integration test in Phase 1 before any package migration begins.

3. **Tests pass while structural contracts are broken** — Existing tests assert on `.message` strings, not `.code`/`.status`/`instanceof`. A package can pass all its tests while producing the wrong HTTP status code for downstream consumers. Write contract tests asserting structured fields before migrating each package; run Satellite integration tests as the canary.

4. **Non-idempotent retry causing duplicate writes** — The new `withRetry` utility must require callers to declare `idempotent: true` explicitly. DB transaction retries must not be wrapped externally — `atlas.transactionWithRetry` already handles deadlock retry internally; double-wrapping produces quadratic retry attempts.

5. **Silent graceful degradation masking real bugs** — Returning empty fallback data instead of throwing makes integration tests produce false greens. In test environments, degradation must throw instead of returning fallback values (`process.env.NODE_ENV === 'test'` gate). All degraded fallbacks must produce `DegradedResult<T>` typed responses, not silent empty values.

---

## Implications for Roadmap

Based on combined research, the dependency graph drives a 5-phase structure. Each phase is a prerequisite for the next; parallelization is possible within a phase but not across phases.

### Phase 1: Core Error Model Foundation

**Rationale:** The `GravitoException` hierarchy is the prerequisite for everything else — error codes, resilience policies, and the degradation manager all assume a common base type. The consolidation audit must also eliminate `echo`'s duplicate `CircuitBreaker` before new code is written. This phase must be completed before any per-package migration begins.

**Delivers:** A unified error type system in `@gravito/core`; centralized `ErrorCode` registry; `InfrastructureException` + domain subclasses (`DatabaseException`, `CacheException`, `QueueException`, `CircuitOpenException`); consolidation of duplicate `CircuitBreaker` implementations; cross-boundary `instanceof` test harness; contract test scaffolding for all migrated packages.

**Addresses:** Unified error base class (P1), structured error codes (P1)

**Avoids:** Pitfalls 1 (dual circuit breaker), 2 (instanceof breakage), 3 (structural contract regressions), 6 (stale IoC error handler)

### Phase 2: Resilience Infrastructure

**Rationale:** Orbit packages cannot adopt resilience wrapping until the `ResiliencePolicy` interface and synchronous `RetryPolicy` exist. Circuit breaker must throw `CircuitOpenException` (defined in Phase 1) before it can integrate correctly. This phase builds the tools; Phase 3 uses them.

**Delivers:** Synchronous `RetryPolicy` with exponential backoff + jitter + idempotency gate; `ResiliencePolicy` interface + `ResiliencePolicyBuilder` fluent API; `CircuitBreaker.execute()` throwing typed `CircuitOpenException`; `GracefulDegradationManager` registered as IoC singleton; `cockatiel` added as single new dependency.

**Uses:** `cockatiel@^3.2.1`; existing `CircuitBreaker` (extended, not replaced)

**Implements:** Architecture components 2 and 3

**Avoids:** Pitfalls 4 (non-idempotent retry), 5 (silent degradation), circuit breaker per-request instantiation

### Phase 3: Foundation Orbit Migration (atlas + plasma + photon)

**Rationale:** Atlas (PostgreSQL/MySQL) and plasma (Redis) are the highest-blast-radius Orbits — virtually every Satellite depends on them. Fixing these first validates the pattern under real complexity before applying it to 40+ other packages. Photon's `ErrorHandler` must recognize `CircuitOpenException` before the app can render correct 503 responses.

**Delivers:** `DatabaseException` wrapping `DatabaseError` at atlas driver boundary; `CacheException` wrapping `RedisError` at plasma boundary; `ResiliencePolicy` defaults for atlas (retry 3× + CB) and plasma (CB only, fast-fail); photon `ErrorHandler` updated to handle `CircuitOpenException` as structured 503; signal `QueueException` migration.

**Implements:** Architecture component 4 (foundation Orbits); error propagation flow (before → after)

**Avoids:** Pitfall 3 (contract tests run for each migrated package); integration gotcha (atlas pool + circuit breaker wrapping strategy)

### Phase 4: Secondary Orbit Migration (batch)

**Rationale:** Once the pattern is validated in Phase 3, the remaining ~40 Orbit packages follow the same mechanical pattern. Batch by category (storage, communication, auth/security, stream) to maintain focus and allow parallel agent execution within each batch.

**Delivers:** All remaining Orbit packages throwing from the `GravitoException` hierarchy with structured error codes; `ResiliencePolicy` defaults for each external boundary (echo, ripple, flare, stasis, nebula, fortify, sentinel, stream, horizon, flux, forge, nova); echo's duplicate `CircuitBreaker` fully retired; graceful shutdown deadline handlers registered for atlas, plasma, stream, signal, beam.

**Batches:**
- 4a: Storage — stasis, nebula, nebula-s3
- 4b: Communication — echo (CB consolidation), flare, ripple
- 4c: Auth/Security — fortify (align `FortifyError` with `GravitoException`), sentinel
- 4d: Stream — stream (plug existing `ErrorCategorizer` into `ResiliencePolicy` adapter), horizon

### Phase 5: Integration Verification + Advanced Features

**Rationale:** Full Satellite-level integration testing is the canary for structural correctness — if Satellite behavior changes after Orbit migration, an error contract was broken. This phase validates the full system and adds v2.1.0 differentiators once the foundation is proven stable.

**Delivers:** Satellite integration test suite verifying error contract integrity; migration guide for framework consumers documenting breaking changes; `withResilience()` convenience composition API; `OrbitDegradationManager` fallback value support (v2.1.0 differentiator); request-scoped error context enrichment.

**Avoids:** Pitfall 3 (satellite integration tests as final canary); security mistakes (verify `cause` chain stripped from production API responses)

### Phase Ordering Rationale

- **Phase 1 must precede all others** because the `ErrorCode` registry and `InfrastructureException` base class are compile-time dependencies for all Orbit error adapters and for the typed `CircuitOpenException` that `ResiliencePolicy` throws.
- **Phase 2 must precede Phase 3** because Orbit packages cannot implement `ResiliencePolicy` until the interface exists; `CircuitBreaker` must throw `CircuitOpenException` before `ErrorHandler` can handle it correctly.
- **Foundation Orbits (Phase 3) before batch migration (Phase 4)** validates the pattern at high complexity before broad rollout; avoids discovering a design flaw after 40 packages have been migrated.
- **Graceful shutdown (Phase 4) can be done in parallel with error model migration within Phase 4** — it is independent of the error hierarchy work and only requires hook registration.
- **Graceful degradation (Phase 5) must come last** — it builds on: unified errors (Phase 1) + circuit breaker wired (Phase 3) + health reporting (Phase 4). Attempting it in Phase 2 leads to silent failure anti-patterns.

### Research Flags

Phases likely needing deeper research during planning:

- **Phase 3 (atlas integration):** Atlas has complex pool management (`PoolHealthChecker`, `transactionWithRetry`, connection acquisition). The exact layer at which to insert `ResiliencePolicy` wrapping (connection acquire vs. query dispatch vs. transaction) needs careful validation against atlas internals to avoid double-retry with `transactionWithRetry`.
- **Phase 4c (fortify alignment):** `FortifyError` has its own domain-specific hierarchy with `httpStatus` field. Whether to make it extend `GravitoException` directly or maintain a parallel hierarchy with duck-typing compatibility needs a compatibility analysis against Satellite RBAC test suite.
- **Phase 5 (`OrbitDegradationManager` design):** The fallback value API (`DegradedResult<T>` vs callback vs `Result<T>`) needs a design decision. Multiple valid patterns exist; the wrong choice here creates the "silent failure" anti-pattern at scale.

Phases with standard patterns (skip research-phase):

- **Phase 1 (error hierarchy extension):** `GravitoException` is well-documented; `InfrastructureException` pattern is established; `ErrorCode` registry is a simple `const` object. Pattern is clear from `fortify`'s existing implementation.
- **Phase 2 (resilience infrastructure):** `cockatiel` API is well-documented; `ResiliencePolicyBuilder` is a standard fluent builder; the composition order (retry inside circuit breaker) is established practice.
- **Phase 4a/4b (storage + communication Orbit migration):** These follow the exact same pattern established in Phase 3; no novel design work required.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct npm registry verification + codebase audit; `cockatiel` confirmed Bun-compatible; only one new dependency |
| Features | HIGH | All findings based on direct codebase inspection of ~50 packages; gap analysis confirmed against actual source |
| Architecture | HIGH | All components inventoried from direct source inspection; build order validated against actual dependency graph |
| Pitfalls | HIGH | Dual `CircuitBreaker` confirmed by file inspection; `instanceof` issue confirmed in `atlas/src/errors`; all pitfalls grounded in actual code state |

**Overall confidence:** HIGH

### Gaps to Address

- **Atlas pool integration layer:** The exact wrapping point for `ResiliencePolicy` in atlas is not fully specified. Atlas has `PoolHealthChecker`, `transactionWithRetry`, connection pool management, and multiple drivers. Phase 3 planning should audit atlas internals to define the precise integration boundary before implementation.
- **fortify error hierarchy compatibility:** `FortifyError` uses `httpStatus` (not `status`) and has an independent `ErrorCodes` enum. Phase 4c planning needs to determine whether to rename `httpStatus → status` (breaking for fortify consumers) or add duck-typing to `ErrorHandler` during a transition window.
- **Multi-worker `IdempotencyCache` scope:** Research confirmed that in-memory `IdempotencyCache` is per-process. If Bun cluster mode or multiple workers are used, Redis-backed idempotency is required. This is not blocking for v2.0.0 but must be documented as a known limitation.
- **`GracefulDegradationManager` fallback API shape:** Three options are valid (`DegradedResult<T>`, callback pattern, `Result<T>` monad). This design decision should be made during Phase 5 planning, not during Phase 2 implementation, to avoid premature commitment.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `packages/core/src/exceptions/` — `GravitoException` hierarchy confirmed
- `packages/resilience/src/` — `CircuitBreaker`, `RetryScheduler`, `BackpressureManager`, `DeadLetterQueue` confirmed
- `packages/echo/src/resilience/CircuitBreaker.ts` — duplicate circuit breaker confirmed
- `packages/atlas/src/errors/index.ts` — `DatabaseError` hierarchy outside `GravitoException` confirmed
- `packages/plasma/src/errors.ts` — `RedisError` outside `GravitoException` confirmed
- `packages/fortify/src/errors/` — `FortifyError` + `ErrorCodes` pattern confirmed (reference implementation)
- `packages/monitor/src/health/` — `HealthRegistry` with degraded state confirmed
- npm registry — `cockatiel@3.2.1` zero deps, ESM+CJS, MIT (verified 2026-03-28)

### Secondary (MEDIUM confidence)

- Harbor Engineering blog — "Why We Love Functional Programming but Don't Use Effect-TS" (Nov 2025) — confirms Effect-TS avoidance in production
- [TypeScript `instanceof` with custom errors](https://dev.dev/dguo/how-to-fix-instanceof-not-working-for-custom-errors-in-typescript-4amp) — `Object.setPrototypeOf` requirement
- [ESBuild issue #3333](https://github.com/evanw/esbuild/issues/3333) — `instanceof` breakage with bundled duplicate classes
- [Circuit Breaker Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker) — pattern validation
- [Building Resilient Systems: Circuit Breakers and Retry Patterns](https://dasroot.net/posts/2026/01/building-resilient-systems-circuit-breakers-retry-patterns/)

### Tertiary (LOW confidence — general guidance)

- [Graceful Degradation in Distributed Systems — GeeksforGeeks](https://www.geeksforgeeks.org/system-design/graceful-degradation-in-distributed-systems/)
- [AWS Well-Architected: Graceful Degradation](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_mitigate_interaction_failure_graceful_degradation.html)

---
*Research completed: 2026-03-28*
*Ready for roadmap: yes*
