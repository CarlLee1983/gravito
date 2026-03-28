---
milestone: v2.0.0
version: 1.0
created: 2026-03-28
status: approved
---

# Gravito-Core v2.0.0 Roadmap

**Milestone:** v2.0.0 — Core & Orbit Resilience
**Phase numbering:** Continues from v1.5.1 (last phase: 15)
**Requirements:** 14 total across Error Model, Resilience Primitives, Orbit Integration, Full Migration, Release
**Coverage:** 14/14 requirements mapped

---

## Phases

- [x] **Phase 16: Core Error Model Foundation** — Establish unified GravitoException hierarchy, ErrorCode registry, and contract test scaffolding (completed 2026-03-28)
- [x] **Phase 17: Resilience Infrastructure** — Build withRetry, consolidate CircuitBreaker, implement withResilience composition API (completed 2026-03-28)
- [x] **Phase 18: Foundation Orbit Migration** — Migrate atlas, plasma, photon, signal to new error model with resilience wiring (completed 2026-03-28)
- [ ] **Phase 19: Secondary Orbit Migration** — Migrate remaining ~40 Orbit packages in batches; register shutdown handlers and health checks
- [ ] **Phase 20: Integration Verification & Graceful Degradation** — Satellite canary tests, OrbitDegradationManager, version bumps, migration guide

---

## Phase Details

### Phase 16: Core Error Model Foundation
**Goal**: Framework consumers can catch structured, typed errors with consistent fields across all Orbit packages
**Depends on**: Nothing (first v2.0.0 phase)
**Requirements**: ERRM-01, ERRM-02, ERRM-03
**Success Criteria** (what must be TRUE):
  1. `catch (e)` on any Orbit error yields `e instanceof GravitoException` as true, with `.code`, `.status`, and `.cause` fields populated
  2. Every Orbit error has a namespaced code string (e.g. `db.connection_failed`, `redis.timeout`) accessible without inspecting `.message`
  3. Error chains are preserved end-to-end: wrapping a driver error in a `DatabaseException` retains the original `cause` at `e.cause`
  4. Cross-boundary `instanceof` test passes: error classes loaded via both ESM and CJS formats remain instanceof-compatible
  5. Contract test scaffolding exists and runs for every Orbit package, asserting `.code`, `.status`, and `instanceof` — not `.message` strings
**Plans:** 3/3 plans complete
Plans:
- [x] 16-01-PLAN.md — Exception hierarchy: GravitoException setPrototypeOf + intermediate layers + re-parent existing exceptions
- [x] 16-02-PLAN.md — ErrorCodes const objects for atlas, plasma, signal, quasar
- [x] 16-03-PLAN.md — Contract test scaffolding with assertGravitoException helper

### Phase 17: Resilience Infrastructure
**Goal**: Orbit packages have a single, composable API to add retry, circuit breaker, and timeout to any external I/O call
**Depends on**: Phase 16
**Requirements**: RESL-01, RESL-02, RESL-03
**Success Criteria** (what must be TRUE):
  1. `withRetry(fn, { idempotent: true, maxAttempts: 3 })` retries with exponential backoff + jitter and throws `RetryExhaustedException` (a `GravitoException`) after exhaustion
  2. Calling `withRetry` without `idempotent: true` on a non-idempotent operation is a compile-time or runtime error — it cannot be silently ignored
  3. All CircuitBreaker usage in the codebase points to a single `@gravito/resilience` implementation; `echo`'s duplicate CB is removed or re-exports from `@gravito/resilience`
  4. `withResilience(fn, policy)` correctly applies retry-inside-circuit-breaker order, throwing `CircuitOpenException` when the breaker is open
  5. In test environments (`NODE_ENV=test`), degraded state throws rather than returning silent fallback values
**Plans:** 3/3 plans complete
Plans:
- [x] 17-01-PLAN.md — Install cockatiel, create exception classes, implement withRetry with TDD
- [x] 17-02-PLAN.md — Consolidate echo and core/events CircuitBreaker duplicates
- [ ] 17-03-PLAN.md — Implement withResilience composition API + update barrel exports

### Phase 18: Foundation Orbit Migration
**Goal**: The four highest-blast-radius Orbits (atlas, plasma, photon, signal) fully adopt the unified error model and resilience wiring
**Depends on**: Phase 17
**Requirements**: INTG-01, INTG-02, INTG-03
**Success Criteria** (what must be TRUE):
  1. An atlas DB connection failure surfaces as `DatabaseException` (a `GravitoException`) with code `db.*`; photon's ErrorHandler returns HTTP 503 for circuit-open states instead of a generic 500
  2. A plasma Redis timeout surfaces as `CacheException` with code `redis.*`; the circuit breaker opens after the configured threshold and stops hitting the Redis server
  3. atlas and plasma both have a `ResiliencePolicy` configured with appropriate defaults (atlas: retry 3x + CB; plasma: CB only, fast-fail)
  4. atlas, plasma, and signal register `core:shutdown` handlers with a configurable deadline; the process does not hang indefinitely on graceful shutdown
  5. Contract tests for atlas and plasma assert on `.code` and `.status` fields and pass before and after migration
**Plans:** 6/6 plans complete
Plans:
- [x] 18-01-PLAN.md — Core prerequisites: DatabaseException + CacheException abstract classes
- [x] 18-02-PLAN.md — Plasma migration: RedisError -> CacheException, CB wiring, shutdown deadline
- [x] 18-03-PLAN.md — Signal migration: MailTransportError -> InfrastructureException, withRetry, shutdown
- [x] 18-04-PLAN.md — Photon CB swap: internal CB replaced with @gravito/resilience, Retry-After header
- [x] 18-05-PLAN.md — Atlas migration: error hierarchy, ORM errors, shutdown handler, resilience wiring
- [x] 18-06-PLAN.md — Global 10s shutdown timeout in PlanetCore (D-10)

### Phase 19: Secondary Orbit Migration
**Goal**: All remaining Orbit packages throw from the GravitoException hierarchy, register health checks, and complete graceful shutdown wiring
**Depends on**: Phase 18
**Requirements**: MIGR-01, MIGR-02, INTG-04, INTG-03 (stream, beam remaining)
**Success Criteria** (what must be TRUE):
  1. Every Orbit package that interacts with an external service throws a `GravitoException` subclass with a namespaced code — no bare `throw new Error()` remains in storage, communication, auth/security, or stream packages
  2. Contract tests for all migrated packages pass asserting `.code`, `.status`, and `instanceof` — the test suite does not regress (all tests that passed before migration still pass after)
  3. stream and beam register `core:shutdown` handlers with deadline enforcement alongside atlas, plasma, and signal
  4. All major Orbit packages appear in `@gravito/monitor` health registry — a health check request returns per-Orbit `healthy`/`degraded`/`unhealthy` status
**Plans:** 9 plans
Plans:
- [ ] 19-01-PLAN.md — Core intermediate exception classes (AuthException, QueueException, StorageException, StreamException)
- [ ] 19-02-PLAN.md — Batch 1a: fortify, astral, quasar, ripple error class re-parenting
- [ ] 19-03-PLAN.md — Batch 1b: flux + beam migration with shutdown handler
- [ ] 19-04-PLAN.md — Batch 1c: stream migration (81 throws, ErrorCategorizer, shutdown)
- [ ] 19-05-PLAN.md — Batch 2: Storage packages (constellation, nebula, nebula-s3, stasis, freeze, dark-matter, pulsar, forge)
- [ ] 19-06-PLAN.md — Batch 3: Communication packages (echo, flare, radiance, quark, graphql, impulse, impulse-bridge, monolith)
- [ ] 19-07-PLAN.md — Batch 4: DevOps packages (horizon, monitor, zenith, launchpad, cli, luminosity, prism)
- [ ] 19-08-PLAN.md — Batch 5: LOW packages (cosmos, sentinel + 5 exempt)
- [ ] 19-09-PLAN.md — Health check registration for all I/O Orbits (INTG-04)

### Phase 20: Integration Verification & Graceful Degradation
**Goal**: The full system — Orbits plus Satellites — behaves correctly under the new error model, and the circuit-open path returns typed fallbacks instead of throwing
**Depends on**: Phase 19
**Requirements**: INTG-05, RELS-01
**Success Criteria** (what must be TRUE):
  1. Satellite integration tests (RBAC, Catalog, Commerce) pass without modification after the full Orbit migration — no Satellite behavior changed as a side effect
  2. When an Orbit circuit breaker is open, `OrbitDegradationManager.execute()` returns a `DegradedResult<T>` typed fallback value rather than throwing, and the Satellite consuming it can distinguish degraded from nominal results
  3. Every modified Orbit package has its `package.json` version updated to 2.0.0 and published; a `bun run version:check` confirms all workspace versions are internally consistent
  4. A migration guide documents the breaking changes (error class hierarchy, error code fields, removed bare Error throws) with before/after examples for framework consumers
**Plans**: TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 16. Core Error Model Foundation | 3/3 | Complete    | 2026-03-28 |
| 17. Resilience Infrastructure | 2/3 | Complete    | 2026-03-28 |
| 18. Foundation Orbit Migration | 6/6 | Complete    | 2026-03-28 |
| 19. Secondary Orbit Migration | 0/9 | Planned     | - |
| 20. Integration Verification & Graceful Degradation | 0/? | Not started | - |

---

## Requirement Coverage

| Requirement | Phase | Description |
|-------------|-------|-------------|
| ERRM-01 | Phase 16 | All Orbit errors extend GravitoException |
| ERRM-02 | Phase 16 | Structured error code namespaces per Orbit |
| ERRM-03 | Phase 16 | Error cause chain preserved end-to-end |
| RESL-01 | Phase 17 | withRetry with backoff, jitter, idempotency gate |
| RESL-02 | Phase 17 | Consolidate 3 CircuitBreaker implementations |
| RESL-03 | Phase 17 | withResilience composition API |
| INTG-01 | Phase 18 | Circuit breaker wired to atlas DB pool |
| INTG-02 | Phase 18 | Circuit breaker wired to plasma Redis client |
| INTG-03 | Phase 18 | Shutdown handlers (atlas, plasma, signal in P18; stream, beam in P19) |
| MIGR-01 | Phase 19 | ~50 Orbit packages adopt new error model (batched) |
| MIGR-02 | Phase 19 | All existing tests adapted to new error types |
| INTG-04 | Phase 19 | All Orbit packages register monitor health checks |
| INTG-05 | Phase 20 | OrbitDegradationManager typed fallback on CB open |
| RELS-01 | Phase 20 | Version bumps to 2.0.0 for all modified packages |

**Coverage: 14/14 requirements mapped**

---
*Roadmap created: 2026-03-28*
*Milestone: v2.0.0*
