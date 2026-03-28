# Pitfalls Research

**Domain:** Error handling & resilience migration — adding unified error model, graceful degradation, retry/circuit breaker to an existing TypeScript monorepo (~50 packages)
**Researched:** 2026-03-28
**Confidence:** HIGH (based on direct codebase analysis + verified external sources)

---

## Critical Pitfalls

### Pitfall 1: Dual Circuit Breaker Fragmentation

**What goes wrong:**
`@gravito/resilience` already has a `CircuitBreaker` class. `@gravito/echo` has a *different, independent* `CircuitBreaker` class with a different config API (`openTimeout` vs `resetTimeout`, string-literal state vs enum state). If the unified migration adds a *third* location (e.g., `@gravito/core`) without consolidating the existing two, you end up with three incompatible implementations that operators must understand separately, and tests that pass for one variant may not cover the others.

**Why it happens:**
Packages grow organically. The echo HTTP client needed circuit breaking before the event-bus resilience package was mature, so it got its own copy. The migration then adds a unified version without auditing and retiring the old ones.

**How to avoid:**
Before writing any new error/resilience code, inventory every location where circuit breakers and retry logic already live. Explicitly deprecate `@gravito/echo`'s internal `CircuitBreaker` and migrate it to re-export from `@gravito/resilience`. The unified model phase must include a consolidation audit as a gate, not an afterthought.

**Warning signs:**
- `packages/echo/src/resilience/CircuitBreaker.ts` still exists after migration
- `CircuitBreakerState` is a TypeScript enum in one place and a string union in another
- `resetTimeout` and `openTimeout` config keys both appear across different packages

**Phase to address:** Phase 1 — Unified error model foundation (before any per-package migration work begins)

---

### Pitfall 2: `instanceof` Breaks Across ESM/CJS Package Boundaries

**What goes wrong:**
When a new base error class (e.g., `GravitoError`) is defined in `@gravito/core` and consumed by 50 packages, `instanceof GravitoError` checks in error handlers can silently return `false` at runtime. This happens when the same package is loaded twice into memory — once via ESM and once via CJS — which produces two distinct class objects. The `ErrorHandler` in `@gravito/core` dispatches on `instanceof GravitoException`; if a downstream package's error fails that check, the handler falls through to generic 500 handling and loses all structured error metadata (code, status, i18nKey).

**Why it happens:**
The monorepo builds both ESM (.mjs) and CJS stubs. During test runs or in mixed-mode consumers, both module formats get loaded. Without `Object.setPrototypeOf(this, ClassName.prototype)` in the constructor, TypeScript-compiled custom errors targeting ES5 break the prototype chain silently.

**How to avoid:**
- Every custom error class **must** call `Object.setPrototypeOf(this, XxxError.prototype)` in its constructor (note: `RippleError` and `RippleDriverError` already do this correctly — use as the reference implementation)
- Add a cross-boundary `instanceof` integration test that loads the package via both ESM and CJS paths and checks the chain
- `GravitoException` (the new unified base) must be in a single canonical package that never gets bundled twice; confirm with `bun run scripts/generate-dependency-graph.ts` after each migration batch

**Warning signs:**
- `catch(err) { if (err instanceof GravitoException)` blocks not matching in integration tests
- HTTP responses for domain errors returning generic `INTERNAL_ERROR` instead of domain-specific codes
- `atlas/errors` classes (`DatabaseError`, `ConnectionError`) are plain `extends Error` without `Object.setPrototypeOf` — these will break `instanceof` in the unified handler

**Phase to address:** Phase 1 — Unified error model foundation (establish the base class pattern before any package adopts it)

---

### Pitfall 3: Test Suite Passes While Structural Contract Is Broken

**What goes wrong:**
With 3000+ existing tests, the temptation is to declare a package "migrated" once all its tests pass. But those tests were written against the old error types. They may assert on `message` strings rather than `code` or `status`, which means the unified model can be structurally wrong while all tests green. Error codes that downstream Satellites rely on (e.g., `CATALOG_NOT_FOUND` → HTTP 404) can silently change to `INTERNAL_ERROR` → HTTP 500 without any test failing.

**Why it happens:**
Existing tests use patterns like:
```typescript
expect(err.message).toContain('not found')
// instead of
expect(err).toBeInstanceOf(GravitoException)
expect(err.code).toBe('CATALOG_NOT_FOUND')
expect(err.status).toBe(404)
```
The migration adds new structure but doesn't update the assertions, so structural regressions are invisible.

**How to avoid:**
- Before migrating each package, write a "contract test" that asserts on `.code`, `.status`, and `instanceof` — not just `.message`
- After migrating, run the Satellite integration tests (RBAC, Catalog, Commerce) as the canary; if Satellite behavior is unaffected, the error contracts are intact
- Add a linting rule or test helper that flags `expect(err.message).toBe(...)` patterns in error-path tests and suggests structured assertions

**Warning signs:**
- All package tests pass but Satellite integration tests (`bun test satellites/`) start returning different HTTP status codes
- `atlas` errors caught by `ErrorHandler` switch from 404/409/422 to 500 after migration

**Phase to address:** Phase 1 (write contract tests before migrating), verified in every per-package phase

---

### Pitfall 4: Retry Logic Applied to Non-Idempotent Operations

**What goes wrong:**
The `RetryScheduler` currently uses BullMQ to retry event dispatches. When the new unified model extends retry to HTTP orbit packages (atlas DB queries, ripple cache ops), retrying a non-idempotent operation (INSERT, payment charge, email send) causes duplicate side effects. The existing `RetryScheduler` has no idempotency enforcement beyond what BullMQ provides — there is an `IdempotencyCache` in `@gravito/resilience` but it is not wired to the scheduler by default.

**Why it happens:**
Retry is easy to add to a generic wrapper. The danger becomes apparent only when the wrapper is applied to operations that were never designed to be retried. Developers adding retry to `atlas` transaction methods may not realize that a failed INSERT with a partial commit has already mutated state.

**How to avoid:**
- The unified retry API must require callers to declare idempotency: `retry(fn, { idempotent: true })` — non-idempotent ops must explicitly use a `once: true` or fallback-only strategy
- Wire `IdempotencyCache` as a mandatory dependency of `RetryScheduler` for any retry that crosses a network boundary
- For atlas/DB retries: only retry at the connection level (reconnect), never at the query level unless the query is explicitly a `SELECT` or uses a SAVEPOINT

**Warning signs:**
- Duplicate rows appearing in tests after retry scenarios
- `RetryScheduler` applied to `atlas.transactionWithRetry` calls (already has its own retry — double retry = quadratic attempts)
- `IdempotencyCache` import count not growing as retry adoption grows

**Phase to address:** Phase 2 — Retry + Circuit Breaker implementation (must be in the design spec before any package integration)

---

### Pitfall 5: Graceful Degradation That Silently Hides Real Failures

**What goes wrong:**
Graceful degradation (returning a default/cached value when a dependency fails) can mask genuine bugs during development and staging. If atlas returns an empty result set instead of propagating a `ConnectionError`, integration tests that expect data will pass with zero results and no exception, producing false green. This is compounded by the fact that circuit breakers suppress errors once open — developers see HTTP 200 with empty data instead of HTTP 503 with a clear diagnostic.

**Why it happens:**
The degradation strategy gets implemented with best intentions ("never crash the system") but without distinguishing between *expected* degradation (cache miss, temporary outage) and *unexpected* degradation (schema error, logic bug). The circuit breaker in `@gravito/resilience` throws `Error("Circuit is OPEN for ...")` — a plain string error with no typed code — which the `ErrorHandler` matches via duck typing and maps to a generic 500.

**How to avoid:**
- Typed degradation responses: distinguish `DegradedResult<T>` (intentional fallback) from thrown `CircuitOpenError` (rejection). Consumers must check `result.degraded` to know they got fallback data
- Circuit-open errors must produce a `GravitoException` subclass with `status: 503` and `code: SERVICE_UNAVAILABLE` — not a plain `new Error()` — so `ErrorHandler` routes them correctly
- In test environments, degrade should throw instead of returning fallback (flip via `process.env.NODE_ENV === 'test'`)

**Warning signs:**
- Tests passing with empty arrays where populated arrays are expected
- Circuit-open events producing HTTP 500 instead of 503
- `onOpen` callbacks silently swallowing the open event without emitting a Signal event

**Phase to address:** Phase 3 — Graceful degradation (design must include typed degradation responses before implementation)

---

### Pitfall 6: IoC Container Resolves Stale Error Handler After Migration

**What goes wrong:**
The `ErrorHandler` is registered in the IoC container (`@gravito/core`'s `Container`) and referenced via lazy `getCore()`. If a downstream package registers its own error handler override (via `hooks.applyFilters('error:context', ...)`) before the unified model is installed, the hook-based override may reference old error types. After migration, the hook receives `GravitoException` instances but its type guard checks for the old `HttpException` or `FortifyError` — the guard silently fails and the hook becomes a no-op, without any error or log.

**Why it happens:**
The hook system allows any package to register error transformations. These registrations happen at boot time and are not re-evaluated when a new package is installed. The migration changes what gets thrown but not what gets registered.

**How to avoid:**
- Audit all `hooks.applyFilters('error:*', ...)` and `hooks.doAction('error:*', ...)` registrations across all 50 packages before migrating error types
- After migration, add a type narrowing test for each hook registration: the hook must handle both old and new error types during the transition window
- Post-migration: remove old type guards and add regression tests that confirm the hook still fires for the new error types

**Warning signs:**
- Error hooks registered in `fortify`, `atlas`, `photon` that use `instanceof FortifyError` / `instanceof DatabaseError` without also checking `instanceof GravitoException`
- `error:report` hook action not firing for migrated packages (observable via test spy)
- Custom error responses from Satellites reverting to framework defaults post-migration

**Phase to address:** Phase 1 (audit hooks) + Phase 4 (verification that all hooks still fire after full package migration)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep `atlas/errors` as standalone classes, just add `instanceof GravitoException` check to `ErrorHandler` | No churn in 50 atlas-dependent packages | Two divergent error hierarchies; atlas errors forever outside the unified model | Never — defeats the purpose of v2.0.0 |
| Skip `Object.setPrototypeOf` in new error subclasses | Simpler code | `instanceof` silently fails in ESM/CJS mixed environments | Never — RippleError already shows the correct pattern |
| Add retry wrapper to all orbit methods uniformly | Fast coverage metric | Retries non-idempotent operations, double-retries already-retried ops (atlas `transactionWithRetry`) | Never without idempotency declaration |
| Leave `@gravito/echo`'s `CircuitBreaker` in place as-is | No migration work for echo | Operators configure two different circuit breaker APIs; metrics don't aggregate | Acceptable only as temporary shim with deprecation warning in Phase 1 |
| Apply graceful degradation at the HTTP middleware layer only | Single implementation point | Orbit packages fail hard when called outside HTTP context (CLI, jobs, tests) | Never — degradation must be at the orbit layer, not only HTTP |
| Use string error codes without an enum | Faster to type | Code mismatches undetected at compile time; Satellites use wrong codes | Acceptable only during design spike, not in merged code |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@gravito/core` `ErrorHandler` | Checking `instanceof FortifyError` before `instanceof GravitoException` causes the base handler to never fire for auth errors | Always check subclasses before base: `FortifyError extends GravitoException`, so check base first in generic handler, subclass first in specific handler |
| `@gravito/atlas` + circuit breaker | Wrapping the entire pool connection in a circuit breaker; pool already has internal retry | Wrap only the external health check and the acquire-connection step; do not wrap individual queries |
| `@gravito/signal` event bus + retry | Signal events dispatched inside a retry loop can fire `n×retries` listeners | Use `IdempotencyCache` with event ID before dispatching; check `already processed` before re-emitting |
| `@gravito/resilience` `RetryScheduler` + `atlas.transactionWithRetry` | Double-retry: `transactionWithRetry` already retries on deadlock; wrapping it in `RetryScheduler` multiplies attempts exponentially | Disable `RetryScheduler` for DB transactions; use `transactionWithRetry`'s built-in retry exclusively |
| IoC container + `CircuitBreaker` singletons | Each `resolve()` call creates a new `CircuitBreaker` instance, resetting state on every request | Register circuit breakers as singletons in the container: `container.singleton('db:circuit', () => new CircuitBreaker(...))` |
| `@gravito/photon` HTTP middleware + circuit breaker | Applying circuit breaker as a middleware in the request chain means a slow response (not a timeout) doesn't trip the breaker | Use `AbortSignal` timeout + circuit breaker together; the breaker must observe the timeout error, not just the response time |
| Hook registration order | `fortify` registers `error:context` hook on boot; if `fortify` boots after the request handler, hooks miss early errors | Ensure all hook registrations happen in the application bootstrap phase, before any request processing begins |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Circuit breaker per-request instantiation | Response times degrade; circuit state is never maintained; breakers never open | Register circuit breakers as container singletons scoped to the connection target, not the request | From the first request |
| Sliding window implemented with `Date.now()` on every `.execute()` call | CPU spike under high concurrency; `checkStateTransition()` is called on every call, not on a timer | Replace polling `checkStateTransition()` with a `setInterval` or lazy check with debounce | At ~5k req/s |
| Exponential backoff without jitter | Under load, all clients retry at the same intervals (thundering herd); connection pool saturates in bursts | Add jitter: `delay = base * (0.5 + Math.random() * 0.5)` | At 10+ concurrent failing clients |
| Error serialization in structured logs | Logging the full error object with circular references causes JSON.stringify to throw or produce truncated output | Use a `serializeError(err)` utility that extracts `name`, `message`, `code`, `stack`, `cause` into a plain object | When `cause` is an `Error` object (common with error chaining) |
| `IdempotencyCache` with in-memory storage | Cache is per-process; in multi-worker Bun environments, the same event gets processed multiple times | Use Redis-backed idempotency for any cross-worker deduplication; in-memory only for single-process scenarios | When Bun cluster mode or multiple workers are active |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Error `cause` chain exposed in production API response | Internal stack traces, DB query strings, and connection URLs leak to external clients | `ErrorHandler` already sanitizes 5xx messages in production; verify `cause` is stripped from the serialized `details` field in the unified error response |
| Circuit breaker open-state error message includes target host | `"Circuit is OPEN for db://postgres:5432/production"` leaks infrastructure topology | Circuit breaker `name` should be an abstract service identifier (`"database:primary"`), not a connection string |
| Retry exhaustion logs include payload | Failed event payloads logged after max retries may contain PII or secrets | Sanitize payload before logging in `RetryScheduler.scheduleRetry` — log only event name, error code, and retry count |
| `RequestScopeErrorContext` persists request data beyond request lifetime | If the context object is captured in a closure (e.g., error reporter), request data (including headers, body refs) leaks across requests | Explicitly null out `context` in `RequestScopeCleanupError` after cleanup completes |

---

## "Looks Done But Isn't" Checklist

- [ ] **Error code consolidation:** Every orbit package has a defined `ErrorCodes` enum or constant object — verify there are no raw string codes (`throw new GravitoException(500, 'SOME_STRING', ...)`) without a corresponding constant
- [ ] **Circuit breaker singleton registration:** Confirm circuit breakers are registered as container singletons, not factory functions — check by asserting `container.resolve('db:circuit') === container.resolve('db:circuit')`
- [ ] **`instanceof` cross-boundary test:** A test that loads `@gravito/core` via CJS and throws `GravitoException`, then catches it in an ESM context and asserts `instanceof GravitoException === true`
- [ ] **Graceful degradation in non-HTTP paths:** Orbit packages that are also called from CLI commands or background jobs must degrade correctly outside `GravitoContext` — test without a request scope active
- [ ] **Retry idempotency gate:** Every usage of `RetryScheduler` has an associated `IdempotencyCache` check before re-executing — grep for `scheduleRetry` without nearby `idempotencyCache`
- [ ] **Hook registrations still fire:** After migrating each orbit package, run a test that spies on `hooks.applyFilters('error:context')` and verifies it's called with a `GravitoException` subclass
- [ ] **Atlas errors in unified hierarchy:** `DatabaseError`, `ConnectionError`, `UniqueConstraintError` all extend `GravitoException` (or a domain-appropriate subclass of it) — not standalone plain `Error` subclasses
- [ ] **`Object.setPrototypeOf` present:** Every new error class constructor has `Object.setPrototypeOf(this, XxxError.prototype)` — can be verified with a simple AST grep

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Dual circuit breaker fragmentation discovered mid-migration | MEDIUM | Add re-export shim in echo: `export { CircuitBreaker } from '@gravito/resilience'`, mark old file deprecated, bump echo minor version |
| `instanceof` broken in production | HIGH | Hotfix: add `error.name === 'GravitoException'` string check as fallback in `ErrorHandler`; fix prototype chain in next patch; add cross-boundary test to prevent recurrence |
| Test suite passes but structural contracts broken | HIGH | Write contract tests retroactively for each migrated package; run Satellite integration tests as smoke check; diff HTTP status code distributions before/after migration |
| Non-idempotent operation double-executed via retry | CRITICAL | Disable retry for the affected operation immediately; audit which operations have retry wrappers; add idempotency check to `RetryScheduler` before re-enabling |
| IoC container serving stale error handler | MEDIUM | Restart container registration order; add integration test that boots the full application and verifies hook fire order; add explicit hook version check |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Dual circuit breaker fragmentation | Phase 1: Consolidation audit | `grep -r "class CircuitBreaker"` returns only one result |
| `instanceof` broken across ESM/CJS | Phase 1: Base class design | Cross-boundary `instanceof` integration test passes |
| Tests pass but contracts broken | Phase 1: Contract test scaffolding | Contract tests exist and are run for each migrated package |
| Non-idempotent retry | Phase 2: Retry + Circuit Breaker design | `RetryScheduler` API requires `idempotent` flag; no `scheduleRetry` calls on write operations |
| Silent graceful degradation | Phase 3: Graceful degradation design | `DegradedResult` type exists; test environment throws instead of degrading |
| Stale IoC error handler | Phase 1: Hook audit + Phase 4: Full verification | Hook spy tests confirm `error:context` fires with new types |
| Circuit breaker per-request instantiation | Phase 2: Implementation | Container singleton test: `resolve() === resolve()` |
| Retry without jitter | Phase 2: Implementation | Jitter present in `calculateDelay`; load test shows no thundering herd |

---

## Sources

- Direct codebase analysis: `/packages/resilience/src/circuit-breaker/CircuitBreaker.ts`, `/packages/echo/src/resilience/CircuitBreaker.ts` (confirmed dual implementation)
- Direct codebase analysis: `/packages/core/src/exceptions/GravitoException.ts`, `/packages/atlas/src/errors/index.ts` (confirmed atlas is outside unified hierarchy)
- Direct codebase analysis: `/packages/resilience/src/retry/RetryScheduler.ts` (confirmed no idempotency wiring by default)
- Direct codebase analysis: `/packages/core/src/ErrorHandler.ts` (confirmed duck-typing fallbacks and hook integration points)
- [TypeScript `instanceof` with custom errors — DEV Community](https://dev.dev/dguo/how-to-fix-instanceof-not-working-for-custom-errors-in-typescript-4amp)
- [ESBuild issue #3333 — instanceof breaks with bundled duplicate classes](https://github.com/evanw/esbuild/issues/3333)
- [Building ESM/CJS compatible npm packages 2024 — Snyk](https://snyk.io/blog/building-npm-package-compatible-with-esm-and-cjs-2024/)
- [Circuit Breaker Pattern — Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker)
- [Resilience4j: treating exceptions as success — issue on non-idempotent retry pitfall](https://github.com/resilience4j/resilience4j/issues/568)
- [Circuit breaker configuration patterns — OneUptime](https://oneuptime.com/blog/post/2026-02-02-circuit-breaker-patterns/view)

---
*Pitfalls research for: Error handling & resilience migration — Gravito v2.0.0*
*Researched: 2026-03-28*
