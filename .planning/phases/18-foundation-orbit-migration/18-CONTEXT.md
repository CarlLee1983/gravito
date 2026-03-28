# Phase 18: Foundation Orbit Migration - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate atlas, plasma, photon, signal to the unified error model (GravitoException hierarchy from Phase 16) and wire resilience primitives (withRetry, CircuitBreaker, withResilience from Phase 17). Each package gets: re-parented error classes with ErrorCodes, ResiliencePolicy configuration, and `core:shutdown` handler with deadline enforcement.

This phase covers the 4 highest-blast-radius Orbit packages only. Remaining ~40 packages are Phase 19.

</domain>

<decisions>
## Implementation Decisions

### Migration Order & Strategy
- **D-01:** Migration order is plasma -> signal -> photon -> atlas (easy to hard). Plasma is simplest (1 error class, shutdown exists); atlas is most complex (6+ error classes, connection pooling).
- **D-02:** Each package is verified independently after migration: typecheck + test + contract test must all pass before moving to the next package. No batch migration.
- **D-03:** Error class migration strategy is "re-inherit + preserve factory methods": existing error classes change their parent to the new GravitoException hierarchy (e.g., `DatabaseError extends DatabaseException`), retaining all existing fields and factory methods. Old names preserved as exports for backward compat.

### ResiliencePolicy Configuration
- **D-04:** Default resilience policies per package:
  | Package | Retry | Circuit Breaker | Timeout |
  |---------|-------|-----------------|---------|
  | atlas (DB) | 3x, idempotent:true | threshold 5, reset 30s | 5000ms |
  | plasma (Redis) | none | threshold 3, reset 15s | 2000ms |
  | signal (SMTP) | 3x, idempotent:true | none | 10000ms |
  | photon (HTTP) | none | threshold 10, reset 60s | none |
- **D-05:** Existing custom retry logic in packages (plasma's `retryWithBackoff()`, signal's `BaseTransport` retry) is replaced by `@gravito/resilience` `withRetry`. No dual retry paths — unified implementation only.
- **D-06:** atlas `transactionWithRetry` is NEVER wrapped with external `withRetry` (from STATE.md — double-retry = quadratic retries). Resilience wrapping applies to connection-level operations, not transaction-level.

### Photon CB Integration
- **D-07:** Photon's `middleware/circuit-breaker.ts` keeps its public middleware API unchanged, but internal implementation is replaced with `@gravito/resilience` `CircuitBreaker`. Downstream users experience zero breaking change at the middleware level.
- **D-08:** Photon ErrorHandler returns HTTP 503 Service Unavailable with `Retry-After` header when CircuitBreaker is open. This applies regardless of which backend service triggered the CB open state.

### Shutdown Handler Design
- **D-09:** All 4 packages register `core:shutdown` handlers with individual deadlines. Shutdown order:
  1. photon — stop accepting requests (2s deadline)
  2. signal — drain SMTP pool (5s deadline)
  3. plasma — flush + disconnect Redis (3s deadline)
  4. atlas — drain connections + close pool (5s deadline)
- **D-10:** Global shutdown timeout of 10s. If any individual handler exceeds its deadline, force-close and log warning. Process must not hang indefinitely.
- **D-11:** Plasma's existing `core:shutdown` hook is enhanced with deadline enforcement (currently has hook but no timeout).

### Claude's Discretion
- Exact ErrorCodes namespace values for each package (following `db.*`, `redis.*`, `mail.*` convention from Phase 16)
- Internal module organization within each package's error files
- Whether to add `Error.captureStackTrace()` alongside `Object.setPrototypeOf`
- Shutdown handler implementation details (how to enforce deadline — Promise.race vs AbortController)
- How to handle plasma's `BunRedisClient.retryWithBackoff()` removal (inline replacement vs separate commit)
- Contract test structure for each package (follow Phase 16 scaffolding pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Error Model Foundation (Phase 16 output — the hierarchy to extend)
- `packages/core/src/exceptions/GravitoException.ts` — Base abstract class with status, code, i18nKey, cause
- `packages/core/src/exceptions/InfrastructureException.ts` — Intermediate layer with `retryable: boolean`
- `packages/core/src/exceptions/DatabaseException.ts` — atlas target parent class (if exists, or create)
- `packages/core/src/exceptions/index.ts` — All exception exports from core
- `packages/fortify/src/errors/codes.ts` — Reference ErrorCodes registry pattern

### Resilience Infrastructure (Phase 17 output — the APIs to wire)
- `packages/resilience/src/index.ts` — Barrel exports: withRetry, withResilience, CircuitBreaker, exceptions
- `packages/resilience/src/circuit-breaker/CircuitBreaker.ts` — Canonical CB implementation
- `packages/resilience/src/retry/` — withRetry implementation and RetryOptions

### Migration Targets (current error implementations to transform)
- `packages/atlas/src/errors/index.ts` — DatabaseError hierarchy (6+ classes)
- `packages/atlas/src/orm/model/errors.ts` — ORM-specific errors (ColumnNotFound, TypeMismatch, etc.)
- `packages/atlas/src/DB.ts` — transactionWithRetry (DO NOT wrap externally)
- `packages/plasma/src/errors.ts` — RedisError with command + originalError
- `packages/plasma/src/OrbitPlasma.ts` — Existing shutdown hook pattern (reference for others)
- `packages/plasma/src/clients/BunRedisClient.ts` — retryWithBackoff() to be replaced
- `packages/signal/src/errors.ts` — MailTransportError + MailErrorCode enum
- `packages/signal/src/transports/BaseTransport.ts` — Existing retry logic to be replaced
- `packages/photon/src/middleware/circuit-breaker.ts` — Custom CB to be replaced with resilience CB
- `packages/photon/src/http-exception.ts` — Already re-exports HttpException from core

### Architecture
- `docs/claude/design.md` — Galaxy Architecture design principles
- `docs/claude/constraints.md` — Monorepo constraints and conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OrbitPlasma.ts` shutdown hook pattern: `core.hooks.doAction('core:shutdown', async () => { await this.disconnect() })` — template for atlas and signal
- Phase 16 contract test scaffolding (`assertGravitoException` helper) — reuse for all 4 packages
- `FortifyError.ErrorCodes` pattern — template for all package-specific ErrorCodes registries
- `@gravito/resilience` full API (withRetry, withResilience, CircuitBreaker) — ready to consume

### Established Patterns
- `Object.setPrototypeOf(this, ClassName.prototype)` in every error constructor (from Phase 16)
- Dot-separated error code namespaces (`db.*`, `redis.*`, `mail.*`, `http.*`)
- Factory methods on error classes (FortifyError pattern) — adopt for migrated errors
- Photon middleware signature: `(ctx, next) => Promise<void>` — CB middleware must conform

### Integration Points
- `packages/*/src/errors/` or `packages/*/src/errors.ts` — Error class location per package
- `packages/*/src/Orbit*.ts` — Where shutdown hooks are registered
- `packages/photon/src/middleware/` — Where CB middleware lives
- `packages/resilience/src/index.ts` — May need new exports if shared CB registries are needed

</code_context>

<specifics>
## Specific Ideas

- atlas `transactionWithRetry` already handles deadlock retry internally — withRetry wrapping must ONLY apply to connection-level operations (acquire, query), never transaction-level
- Photon CB middleware API stays stable — users import `circuitBreaker()` middleware the same way, only internal implementation changes
- plasma shutdown enhancement: add deadline enforcement to existing hook (currently just `await this.disconnect()` with no timeout)
- cockatiel remains internal implementation detail — no cockatiel types exposed in any migrated package's public API

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 18-foundation-orbit-migration*
*Context gathered: 2026-03-28*
