# Phase 17: Resilience Infrastructure - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Build composable resilience primitives: `withRetry`, consolidated `CircuitBreaker`, and `withResilience` composition API. All live in `@gravito/resilience`. Echo's duplicate CB is removed. cockatiel is the single new dependency. This phase does NOT wire resilience into Orbit packages (that's Phase 18-19).

</domain>

<decisions>
## Implementation Decisions

### CB Consolidation Strategy
- **D-01:** `@gravito/resilience` CircuitBreaker is the canonical implementation. Echo's duplicate (`echo/src/resilience/CircuitBreaker.ts`) is deleted; echo re-exports from `@gravito/resilience` if needed for backward compat.
- **D-02:** `core/events/CircuitBreaker.ts` is the event-system-specific CB (used by HookManager, EventPriorityQueue, MessageQueueBridge). It stays in core but should delegate to or re-export `@gravito/resilience` CB to avoid divergence. If the APIs are identical, replace with a re-export.

### withRetry Error Classification
- **D-03:** `withRetry` classifies errors via dual check: (1) `error instanceof InfrastructureException && error.retryable === true`, OR (2) explicit `retryOn: (error) => boolean` predicate in options. This allows retrying non-GravitoException errors (e.g., raw driver errors during migration).
- **D-04:** `withRetry` requires explicit `idempotent: true` in options. Calls without it are rejected at runtime (not just compile-time) to prevent accidental retry of non-idempotent operations.
- **D-05:** `withRetry` throws `RetryExhaustedException` (a `GravitoException` subclass extending `InfrastructureException`) after all attempts fail. The original last error is preserved as `.cause`.

### withResilience Composition API
- **D-06:** `withResilience<T>(fn: () => Promise<T>, policy: ResiliencePolicy): Promise<T>` — single function with a policy object.
- **D-07:** `ResiliencePolicy` shape:
  ```typescript
  interface ResiliencePolicy {
    retry?: RetryOptions       // Optional retry config
    circuitBreaker?: string | CircuitBreakerOptions  // CB name (shared) or inline config
    timeout?: number           // Optional timeout in ms
  }
  ```
- **D-08:** Execution order is retry-inside-circuit-breaker: CB wraps the retry loop. If CB is open, `CircuitOpenException` thrown immediately (no retries attempted).

### cockatiel Integration
- **D-09:** cockatiel is an internal implementation detail. Gravito wraps cockatiel's retry and CB behind its own interfaces (`withRetry`, `CircuitBreaker`). cockatiel types are NOT part of the public API.
- **D-10:** cockatiel's `Policy.handleAll()` and `Policy.wrap()` used internally for composition. Gravito's `withResilience` delegates to cockatiel's policy wrapping under the hood.

### Test Environment Behavior
- **D-11:** In `NODE_ENV=test`, `withResilience` throws on circuit-open rather than returning fallback values. This prevents tests from silently passing with degraded results.

### Claude's Discretion
- Exact cockatiel policy configuration defaults (backoff base, jitter strategy)
- Whether `RetryExhaustedException` and `CircuitOpenException` extend InfrastructureException or SystemException
- Internal module organization within `packages/resilience/src/`
- Whether to keep the existing `RetryScheduler` (Bull Queue-based async retry) alongside the new synchronous `withRetry`
- Timer/timeout implementation details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing CircuitBreaker implementations (consolidation targets)
- `packages/resilience/src/circuit-breaker/CircuitBreaker.ts` — Primary CB in @gravito/resilience (metrics, state machine)
- `packages/echo/src/resilience/CircuitBreaker.ts` — Duplicate CB in echo (to be deleted/replaced)
- `packages/core/src/events/CircuitBreaker.ts` — Event-system CB in core (evaluate re-export)
- `packages/echo/src/types.ts` — CircuitBreakerConfig/Metrics/State types for echo's CB

### Existing retry infrastructure
- `packages/resilience/src/retry/RetryScheduler.ts` — Async Bull Queue retry (different from withRetry)

### Error hierarchy (from Phase 16)
- `packages/core/src/exceptions/GravitoException.ts` — Base class
- `packages/core/src/exceptions/InfrastructureException.ts` — Has `retryable: boolean` field
- `packages/core/src/exceptions/index.ts` — All exception exports

### Integration points (consumers of resilience primitives)
- `packages/photon/src/middleware/circuit-breaker.ts` — Photon CB middleware (will consume new CB in Phase 18)
- `packages/atlas/src/DB.ts` — `transactionWithRetry` (DO NOT wrap externally)
- `packages/stream/src/StreamEventBackend.ts` — Uses CB from core/events
- `packages/stasis/src/stores/CircuitBreakerStore.ts` — Persistent CB state store

### CB usage across codebase
- `packages/core/src/HookManager.ts` — Uses core/events CB
- `packages/core/src/events/MessageQueueBridge.ts` — Uses core/events CB
- `packages/core/src/events/task-executor.ts` — Uses core/events CB
- `packages/echo/src/send/WebhookDispatcher.ts` — Uses echo CB

### Architecture
- `docs/claude/design.md` — Galaxy Architecture design principles
- `docs/claude/constraints.md` — Monorepo constraints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `@gravito/resilience` package: Already has CB, backpressure, aggregation, worker pool — natural home for withRetry and withResilience
- `CircuitBreakerState` enum: Identical in resilience and core/events (CLOSED/OPEN/HALF_OPEN) — unify
- `CircuitBreakerMetrics` interface: Similar across implementations — standardize
- Echo CB has state hooks (onOpen/onHalfOpen/onClose) — keep this pattern in unified CB

### Established Patterns
- `resilience()` middleware in `packages/resilience/src/bridge/photon.ts` — Photon integration pattern
- Event-driven CB metrics via `EventMetrics` and `OTelEventMetrics` — preserve observability
- `CircuitBreakerStore` in stasis for persistent CB state across restarts

### Integration Points
- `packages/resilience/src/index.ts` — Add withRetry, withResilience, new exception exports
- `packages/resilience/src/circuit-breaker/` — Consolidation target
- Core/events consumers (HookManager, MessageQueueBridge, task-executor) — verify they work with consolidated CB

</code_context>

<specifics>
## Specific Ideas

- cockatiel chosen specifically because: zero deps, ESM+CJS, MIT, Bun-compatible (from STATE.md research decision)
- `InfrastructureException.retryable` field already exists from Phase 16 — withRetry must consume it
- atlas `transactionWithRetry` handles deadlock retry internally — NEVER wrap with external withRetry (double-retry = quadratic retries)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 17-resilience-infrastructure*
*Context gathered: 2026-03-28*
