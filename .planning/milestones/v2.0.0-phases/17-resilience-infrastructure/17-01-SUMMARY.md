---
phase: 17-resilience-infrastructure
plan: "01"
subsystem: infra
tags: [resilience, retry, exponential-backoff, cockatiel, exceptions]

# Dependency graph
requires: []
provides:
  - RetryExhaustedException class extending InfrastructureException (status 503, retryable false)
  - CircuitOpenException class extending InfrastructureException (status 503, retryable false)
  - withRetry<T> function with cockatiel exponential backoff + jitter
  - RetryOptions interface with idempotent:true safety guard
affects:
  - 17-02 (withCircuitBreaker — uses CircuitOpenException)
  - 17-03 (withResilience — composes withRetry + withCircuitBreaker)
  - phase-18+ (Orbit resilience wiring)

# Tech tracking
tech-stack:
  added: [cockatiel@3.2.1]
  patterns:
    - "Retry options require idempotent:true to prevent accidental non-idempotent retries"
    - "cockatiel maxAttempts counts retries only (subtract 1 for total-call semantics)"
    - "FailureReason from cockatiel is a union type — use 'error' in reason narrowing"

key-files:
  created:
    - packages/resilience/src/exceptions/RetryExhaustedException.ts
    - packages/resilience/src/exceptions/CircuitOpenException.ts
    - packages/resilience/src/retry/RetryOptions.ts
    - packages/resilience/src/retry/withRetry.ts
    - packages/resilience/tests/core-modules/withRetry.test.ts
  modified:
    - packages/resilience/package.json
    - packages/resilience/src/index.ts

key-decisions:
  - "cockatiel bundled as regular dependency (not external in tsup build) — it's a runtime dep, not a peer dep"
  - "withRetry maxAttempts = total call count (1 initial + N-1 retries), not retries-only — adjusted via Math.max(0, totalAttempts - 1) when passing to cockatiel"
  - "FailureReason union type requires 'error' in reason narrowing in onGiveUp callback"

patterns-established:
  - "Exception pattern: concrete subclass sets name + Object.setPrototypeOf in constructor"
  - "RetryOptions requires idempotent:true literal type — TypeScript enforces this at compile time"

requirements-completed: [RESL-01]

# Metrics
duration: 5min
completed: 2026-03-28
---

# Phase 17 Plan 01: Resilience Foundation Summary

**withRetry function + RetryExhaustedException + CircuitOpenException using cockatiel exponential backoff, with idempotent guard and 29 passing tests**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-28T12:29:24Z
- **Completed:** 2026-03-28T12:34:33Z
- **Tasks:** 1 (TDD: RED + GREEN)
- **Files modified:** 7

## Accomplishments
- Installed cockatiel 3.2.1 as bundled runtime dependency
- Created RetryExhaustedException and CircuitOpenException extending InfrastructureException with correct prototype chain
- Implemented withRetry using cockatiel retry + ExponentialBackoff with idempotent safety guard
- 29 tests cover exception hierarchy, retry semantics, exhaustion, idempotent guard, and custom retryOn predicate
- Exported all new symbols from package index

## Task Commits

TDD tasks have multiple commits (test → feat):

1. **RED phase** - `c12d4c10` (test: add failing tests for withRetry and exception classes)
2. **GREEN phase** - `18fb6545` (feat: implement withRetry with cockatiel exponential backoff)

## Files Created/Modified
- `packages/resilience/package.json` - Added cockatiel@^3.2.1 dependency
- `packages/resilience/src/exceptions/RetryExhaustedException.ts` - Exception class extending InfrastructureException
- `packages/resilience/src/exceptions/CircuitOpenException.ts` - Exception class with optional breakerName
- `packages/resilience/src/retry/RetryOptions.ts` - Interface requiring idempotent:true literal
- `packages/resilience/src/retry/withRetry.ts` - Core retry implementation using cockatiel
- `packages/resilience/tests/core-modules/withRetry.test.ts` - 29 test cases (TDD)
- `packages/resilience/src/index.ts` - Added exports for new symbols

## Decisions Made
- cockatiel's `maxAttempts` counts only retries (not the initial call), so we pass `totalAttempts - 1` to align with the plan's semantic where `maxAttempts` = total calls
- FailureReason from cockatiel is a union `{ error: Error } | { value: T }` — used `'error' in reason` narrowing in onGiveUp callback to satisfy TypeScript strict mode
- cockatiel is bundled (not externalized) since it's a runtime dep, not a peer dep

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed maxAttempts semantics mismatch with cockatiel**
- **Found during:** Task 1 GREEN phase (test run)
- **Issue:** Tests expected `maxAttempts: 3` to result in 3 total calls; cockatiel counts retries only so it produced 4 calls
- **Fix:** Pass `Math.max(0, totalAttempts - 1)` to cockatiel's maxAttempts
- **Files modified:** packages/resilience/src/retry/withRetry.ts
- **Verification:** All 29 tests pass after fix
- **Committed in:** 18fb6545

**2. [Rule 1 - Bug] Fixed TypeScript errors in withRetry implementation**
- **Found during:** Task 1 typecheck
- **Issue 1:** `options as Record<string, unknown>` was rejected — needed double cast via `unknown` first; **Issue 2:** `FailureReason<unknown>` union type — destructuring `{ error }` failed since not all variants have `error`
- **Fix:** Changed to `options as unknown as Record<string, unknown>` and added `'error' in reason` narrowing
- **Files modified:** packages/resilience/src/retry/withRetry.ts
- **Verification:** `bun run typecheck` exits 0
- **Committed in:** 18fb6545

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the two auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- withRetry and exception classes ready for Plan 02 (withCircuitBreaker using CircuitOpenException)
- Plan 03 (withResilience) can compose withRetry + withCircuitBreaker
- All exports available via `@gravito/resilience`

---
*Phase: 17-resilience-infrastructure*
*Completed: 2026-03-28*
