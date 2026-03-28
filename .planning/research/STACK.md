# Stack Research

**Domain:** TypeScript/Bun monorepo framework — unified error handling & resilience
**Researched:** 2026-03-28
**Confidence:** HIGH (most findings verified against npm registry and codebase audit)

## Current State Audit

Before recommending additions, what already exists in Gravito:

| Capability | Location | Status |
|------------|----------|--------|
| Base exception hierarchy | `@gravito/core` — `GravitoException`, `HttpException`, `ValidationException`, `AuthenticationException`, `AuthorizationException`, `ModelNotFoundException` | Exists, partial coverage |
| Circuit Breaker | `@gravito/resilience` — `CircuitBreaker` (CLOSED/OPEN/HALF_OPEN states, metrics) | Exists, event-system scoped only |
| Retry Scheduler | `@gravito/resilience` — `RetryScheduler` (BullMQ-based, distributed) | Exists, event-system scoped only |
| Backpressure | `@gravito/resilience` — `BackpressureManager`, `FlowControlStrategy` | Exists, event-system scoped only |
| Dead Letter Queue | `@gravito/resilience` — `DeadLetterQueue` | Exists, event-system scoped only |
| Health Checks | `@gravito/monitor` — `HealthRegistry`, `HealthController` (liveness/readiness/degraded) | Exists, solid |
| Pool Health | `@gravito/atlas` — `PoolHealthChecker` (warning/critical thresholds) | Exists, DB-scoped |
| Observability | `@opentelemetry/api` ^1.9.0 (optional peer in resilience, atlas, photon) | Exists |
| Per-package error classes | `atlas` (`DatabaseError` hierarchy), `signal` (`MailTransportError`), `fortify` (`FortifyError`) — all extend plain `Error` independently | Fragmented, not unified |

**The core problem:** `@gravito/resilience` has solid circuit breaker + retry primitives but they are scoped to the event bus system, not usable as general-purpose infrastructure for DB/HTTP/cache calls. Per-package error classes don't extend `GravitoException`, creating inconsistent error shapes across ~50 Orbit packages.

---

## Recommended Stack

### Core Technologies (No New Dependencies Needed)

These come from what already exists in the monorepo — the strategy is **extend and unify, not replace**.

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@gravito/core` exceptions | current | Base for unified error model | `GravitoException` already has `status`, `code`, `cause`, `i18nKey` — extend it rather than adding new error libraries |
| `@gravito/resilience` CircuitBreaker | current | General-purpose circuit breaking | Already production-ready with metrics; needs facade exposing it beyond event-system |
| `@gravito/monitor` HealthRegistry | current | Graceful degradation signals | Already supports `healthy`/`degraded`/`unhealthy` states with Kubernetes probes |
| `@opentelemetry/api` | ^1.9.1 | Error span recording, trace correlation | Already a peer dependency in 6 packages; use existing integration |

### New Dependencies (Minimal — Only What's Missing)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `cockatiel` | ^3.2.1 | General-purpose retry + timeout + bulkhead for HTTP/DB/Redis calls | Zero dependencies, dual ESM/CJS, zero-dependency, policy composition (wrap CircuitBreaker with Timeout with Retry), MIT. Bun compatible (ESM module output at `dist/esm/index.js`). The existing `RetryScheduler` uses BullMQ for async event retries — a different use-case. For synchronous/in-process retry of DB queries and HTTP calls, cockatiel is the right tool. |

**That's the only new external dependency recommended.** Everything else is built in-house by extending existing primitives.

### Supporting Libraries (Already Present — Use More)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@opentelemetry/api` | ^1.9.1 | Span attributes for error details, trace_id correlation in error responses | Add to any Orbit package that doesn't yet record error spans |
| `zod` | ^4.3.6 | Runtime validation of error metadata shapes (already in root devDeps) | Validate structured error payloads at Orbit boundaries |
| `p-limit` | ^7.2.0 | Bulkhead-style concurrency limits (already in root deps) | Rate-limit concurrent external calls when cockatiel bulkhead is too heavy |

### Development Tools (No Changes Needed)

| Tool | Purpose | Notes |
|------|---------|-------|
| Bun test | Test harness for all error paths | No change — already `bun test` |
| Biome | Lint error class patterns | Already configured at root |
| TypeScript strict | Catch unchecked error propagation at compile time | Already `noUnusedLocals`/`noUnusedParameters` |

---

## Installation

```bash
# Only one new dependency at the resilience package level
bun add cockatiel --filter @gravito/resilience
```

cockatiel is zero-dependency, ESM+CJS dual output, MIT, 0.47 MB unpacked.

---

## Architecture: What to Build vs What to Extend

### Build: Unified Error Base (`@gravito/core`)

Extend `GravitoException` to become the single root for all Orbit error classes. Key additions needed:

1. **`OrbitException` abstract class** — extends `GravitoException`, adds `orbit: string` (package name) and `retryable: boolean` fields. All Orbit-level errors extend this.
2. **Error code registry** — shared `const` object in `@gravito/core` with prefixed codes (`ATLAS_CONNECTION_FAILED`, `SIGNAL_SEND_FAILED`, `STREAM_QUEUE_FULL`) so consumers can catch by code without importing each Orbit package.
3. **`toJSON()` method on `GravitoException`** — serialize to RFC 9457 Problem Details shape for HTTP error responses. No external library needed; this is 10 lines of code.

Current fragmented state (all extend plain `Error`):
- `atlas`: `DatabaseError` hierarchy
- `signal`: `MailTransportError`
- `fortify`: `FortifyError`

Target state: all extend `OrbitException extends GravitoException`.

### Build: General-Purpose Resilience Facade (`@gravito/resilience`)

The existing `CircuitBreaker` class in `@gravito/resilience` works well for event-bus use. The gap is a **general-purpose facade** that Orbit packages (atlas, signal, stream, photon) can use for their external calls.

Design: `withResilience(fn, options)` factory that wraps cockatiel policies. This isolates Orbit packages from cockatiel's API and lets the facade evolve independently.

```typescript
// Orbit packages call this, not cockatiel directly:
const result = await withResilience(() => pool.query(sql), {
  retry: { attempts: 3, backoff: 'exponential' },
  circuitBreaker: { threshold: 5, halfOpenAfter: 10_000 },
  timeout: 5_000,
})
```

### Extend: `@gravito/resilience` CircuitBreaker

Add a `timeout` policy wrapping using cockatiel `TimeoutPolicy`. The existing `CircuitBreaker` does not handle timeouts — this is a real gap for DB and HTTP calls.

### Extend: `@gravito/monitor` HealthRegistry

Add `registerOrbit(name, orbitInstance)` that auto-registers a health check from any Orbit instance that implements the `HealthCheckable` interface. This connects circuit breaker state to the degraded/unhealthy health reporting already in place.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Extend `GravitoException` | `neverthrow` (Result type) | If starting fresh with functional-style error handling. For Gravito, Result types would require rewriting all 50 Orbit packages' call sites — too disruptive for v2.0.0. May be worth adding as optional pattern in v3.0. |
| Extend `GravitoException` | Effect-TS | Only if willing to adopt full functional programming paradigm. Harbor's production report (Nov 2025) recommends avoiding Effect-TS in most production apps due to steep learning curve and thin ecosystem. Not appropriate here. |
| `cockatiel` for general retry | `p-retry` ^8.0.0 | `p-retry` requires Node >=22 and is ESM-only (fine for Bun), but it does only retry — no circuit breaker, no timeout, no bulkhead composition. Use `p-retry` only if cockatiel dependency is unacceptable for some reason. |
| `cockatiel` | Extend existing `RetryScheduler` | `RetryScheduler` is BullMQ-backed async distributed retry — the right tool for event-bus reliability. Wrong tool for synchronous DB queries where you need immediate in-process retry with circuit breaking. Keep both, different concerns. |
| `cockatiel` | Implement circuit breaker from scratch | The existing `CircuitBreaker` in `@gravito/resilience` is already good for event bus use. But adding timeout/bulkhead from scratch adds testing burden. cockatiel provides these composed and tested. |
| `@opentelemetry/api` (existing) | New dedicated error tracking library | OpenTelemetry is already a peer dep in 6 packages. Adding Sentry or Datadog-specific SDKs is downstream concern for application layer, not framework. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `neverthrow` / `ts-results` for existing Orbit packages | Would require rewriting all 50 package call sites from `throw` to `Result.err()`. Massive churn for marginal gain in a throw-based ecosystem. | Extend `GravitoException` with structured `code`/`retryable`/`orbit` fields |
| `effect` (Effect-TS) | 18+ MB, full paradigm shift, thin ecosystem. Production users report significant interop friction (Harbor, Nov 2025). | `GravitoException` hierarchy + `cockatiel` covers the needed resilience surface |
| `serialize-error` npm package | Adds a dependency (`non-error`, `type-fest`) for something a 15-line `toJSON()` method handles. | Implement `toJSON()` on `GravitoException` directly |
| `opossum` (circuit breaker) | Requires Node-specific `EventEmitter`, older API style, not zero-dependency. Heavier than needed. | Use existing `@gravito/resilience` `CircuitBreaker` + `cockatiel` for composition |
| `async-retry` | Minimal API, no TypeScript types, no circuit breaker. Dead relative to `cockatiel`. | `cockatiel` |
| Replacing `@gravito/resilience` | Already has production-tested `CircuitBreaker`, `BackpressureManager`, `DeadLetterQueue`. Rewriting loses test coverage (100s of passing tests). | Extend with general-purpose facade, don't replace |

---

## Stack Patterns by Scenario

**If adding resilience to an Orbit package (DB, Redis, HTTP):**
- Import `withResilience` from `@gravito/resilience`
- Throw `OrbitException` subclass with `retryable: true/false`
- Register health check via `HealthRegistry.registerOrbit()`

**If adding a new error type for a specific Orbit:**
- Create `XxxOrbitException extends OrbitException` in the Orbit package
- Add error code to the central registry in `@gravito/core`
- Do NOT extend plain `Error`

**If handling errors in `@gravito/photon` middleware:**
- `instanceof GravitoException` check gives structured JSON response via `toJSON()`
- Passes `trace_id` from OpenTelemetry span context into the error response

**If circuit breaker opens for a critical Orbit (e.g., database):**
- The `withResilience` facade updates a shared `CircuitBreakerState`
- `HealthRegistry` detects the open circuit via `registerOrbit()` callback
- Health endpoint returns `503` with `status: "degraded"` — no crash

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| `cockatiel@^3.2.1` | Bun 1.3.10+, Node >=16 | ESM output at `dist/esm/index.js`, zero dependencies, verified |
| `@opentelemetry/api@^1.9.1` | `@gravito/monitor@^3.1.2`, `@gravito/resilience@^1.0.2` | Already peer dep in both; no version conflict |
| `p-retry@^8.0.0` | Node >=22, Bun 1.3.10+ | ESM-only, requires Node 22 — avoid; cockatiel preferred |

---

## Sources

- npm registry direct query — `cockatiel@3.2.1`: zero deps, ESM+CJS, MIT (verified 2026-03-28)
- npm registry direct query — `p-retry@8.0.0`: ESM-only, Node >=22, single dep `is-network-error` (verified 2026-03-28)
- npm registry direct query — `neverthrow@8.2.0`: zero deps, CJS only (verified 2026-03-28)
- Codebase audit — `@gravito/resilience/src/`: CircuitBreaker, RetryScheduler, BackpressureManager, DeadLetterQueue confirmed (2026-03-28)
- Codebase audit — `@gravito/core/src/exceptions/`: GravitoException hierarchy confirmed (2026-03-28)
- Codebase audit — `@gravito/monitor/src/health/`: HealthRegistry with degraded state confirmed (2026-03-28)
- Harbor Engineering blog — "Why We Love Functional Programming but Don't Use Effect-TS" (Nov 2025): MEDIUM confidence — recommends against Effect-TS in production
- WebSearch — cockatiel, p-retry, neverthrow comparison (2026-03-28): MEDIUM confidence for ecosystem standing

---
*Stack research for: Gravito v2.0.0 unified error handling & resilience*
*Researched: 2026-03-28*
