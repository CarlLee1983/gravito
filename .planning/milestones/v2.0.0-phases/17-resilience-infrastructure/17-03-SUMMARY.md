---
phase: "17"
plan: "03"
subsystem: resilience
tags: [resilience, circuit-breaker, retry, timeout, composition, cockatiel]
dependency_graph:
  requires: ["17-01", "17-02"]
  provides: ["withResilience composition API", "ResiliencePolicy interface", "complete @gravito/resilience barrel"]
  affects: ["@gravito/resilience", "Phase 18 Orbit migration"]
tech_stack:
  added: ["cockatiel (BrokenCircuitError, IsolatedCircuitError, wrap, circuitBreaker, ConsecutiveBreaker, timeout/Aggressive)"]
  patterns: ["Named CB registry (Map<string, CircuitBreakerPolicy>)", "TDD (RED-GREEN)", "Policy composition (timeout→CB→retry)"]
key_files:
  created:
    - packages/resilience/src/resilience/ResiliencePolicy.ts
    - packages/resilience/src/resilience/withResilience.ts
    - packages/resilience/tests/core-modules/withResilience.test.ts
  modified:
    - packages/resilience/src/index.ts
decisions:
  - "InlineCBOptions uses its own interface (not CircuitBreakerOptions) because CircuitBreakerOptions lacks 'name' field"
  - "TimeoutStrategy.Aggressive used instead of Cooperative — cooperative timeouts do not cancel async operations reliably"
  - "withResilience always throws, never returns fallback — D-11 satisfied by design (fallback is Phase 20 concern)"
  - "cbRegistry is module-level Map for named CB sharing; _resetCBRegistry() exported for test isolation"
metrics:
  duration: "~30 minutes"
  completed: "2026-03-28"
  tasks_completed: 2
  files_changed: 4
---

# Phase 17 Plan 03: withResilience Composition API Summary

One-liner: withResilience composes timeout + circuit breaker + retry with correct D-08 ordering via cockatiel, with named CB registry for shared state across call sites.

## What Was Built

### Task 1: ResiliencePolicy + withResilience (TDD)

**ResiliencePolicy interface** (`src/resilience/ResiliencePolicy.ts`):
- `retry?: RetryOptions` — retry with idempotency guard
- `circuitBreaker?: string | InlineCBOptions` — string = named registry lookup; object = named inline options
- `timeout?: number` — millisecond timeout using Aggressive strategy
- Separate `InlineCBOptions` type (with `name`, `failureThreshold`, `resetTimeout`) since `CircuitBreakerOptions` lacks `name`

**withResilience implementation** (`src/resilience/withResilience.ts`):
- Policy ordering per D-08: timeout (outermost) → CB (middle) → retry (innermost)
- Uses cockatiel's `wrap()` to compose multiple policies
- Named CB registry (`Map<string, CircuitBreakerPolicy>`) shared across all calls with same name
- Maps `BrokenCircuitError` and `IsolatedCircuitError` → `CircuitOpenException` (D-11)
- Maps retry exhaustion → `RetryExhaustedException` with last error as cause
- `_resetCBRegistry()` exported for test isolation
- Always throws, never returns fallback values (D-11 design)

**Tests** (`tests/core-modules/withResilience.test.ts`):
- 16 tests across 8 describe blocks
- RED→GREEN TDD flow confirmed

### Task 2: Barrel Exports + Full Verification

Updated `packages/resilience/src/index.ts`:
- Added `withResilience` export
- Added `ResiliencePolicy` type export
- Added `InlineCBOptions` type export
- Retained `RetryScheduler`, `withRetry`, `RetryOptions`, `CircuitOpenException`, `RetryExhaustedException` (already present from 17-01)

## Verification Results

| Check | Result |
|-------|--------|
| withResilience tests | 16/16 pass |
| Full resilience suite | 229/229 pass |
| Resilience typecheck | Clean (0 errors) |
| Resilience build | Success (145 KB ESM, 147 KB CJS) |
| Monorepo typecheck | 84/84 tasks successful |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Type Safety] InlineCBOptions replaces CircuitBreakerOptions reference**

- **Found during:** Task 1 typecheck
- **Issue:** Plan specified `circuitBreaker?: string | CircuitBreakerOptions` but `CircuitBreakerOptions` has no `name` field, causing 4 TypeScript errors
- **Fix:** Created `InlineCBOptions` interface with `name` (required), `failureThreshold`, `resetTimeout`
- **Files modified:** `ResiliencePolicy.ts`, `withResilience.ts`, `index.ts`

**2. [Rule 1 - Bug] TimeoutStrategy.Aggressive replaces Cooperative**

- **Found during:** Task 1 GREEN phase
- **Issue:** `TimeoutStrategy.Cooperative` does not forcibly cancel async operations — timeout test passed as "too slow" resolving before the timeout error could propagate
- **Fix:** Changed to `TimeoutStrategy.Aggressive` which throws `TaskCancelledError` at timeout
- **Files modified:** `withResilience.ts`

## Self-Check: PASSED

- packages/resilience/src/resilience/ResiliencePolicy.ts: FOUND
- packages/resilience/src/resilience/withResilience.ts: FOUND
- packages/resilience/tests/core-modules/withResilience.test.ts: FOUND
- packages/resilience/src/index.ts (withResilience export): FOUND
- Commit c3a32845: FOUND (test RED/GREEN + implementation)
- Commit 465681e4: FOUND (barrel exports)
