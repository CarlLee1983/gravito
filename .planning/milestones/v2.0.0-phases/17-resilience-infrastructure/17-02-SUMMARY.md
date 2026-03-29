---
phase: 17-resilience-infrastructure
plan: "02"
subsystem: infra
tags: [circuit-breaker, resilience, webhook, echo, consolidation]

# Dependency graph
requires:
  - phase: 17-resilience-infrastructure/17-01
    provides: "@gravito/resilience package with canonical CircuitBreaker implementation"
provides:
  - "Echo package CB replaced with re-export shim from @gravito/resilience"
  - "core/events CB documented as intentional standalone due to circular dependency"
  - "WebhookDispatcher updated to map openTimeout -> resetTimeout for resilience CB"
affects: [echo, core, resilience]

# Tech tracking
tech-stack:
  added: ["@gravito/resilience added as peerDependency and devDependency to echo"]
  patterns:
    - "Re-export shim pattern: thin module re-exports canonical implementation without code duplication"
    - "Circular dependency guard: document standalone copies with JSDoc explaining why re-export is not possible"
    - "Config field mapping: adapter pattern when consumer config names differ from canonical names (openTimeout -> resetTimeout)"

key-files:
  created: []
  modified:
    - packages/echo/src/resilience/CircuitBreaker.ts
    - packages/echo/src/resilience/index.ts
    - packages/echo/src/types.ts
    - packages/echo/src/send/WebhookDispatcher.ts
    - packages/echo/package.json
    - packages/core/src/events/CircuitBreaker.ts
    - packages/echo/tests/unit/resilience/CircuitBreaker.test.ts

key-decisions:
  - "echo CB replaced with re-export shim from @gravito/resilience — eliminates 250+ lines of duplicate implementation"
  - "core/events CB kept standalone to avoid circular dependency (core -> resilience -> core)"
  - "openTimeout field in echo CircuitBreakerConfig is preserved for API backwards compatibility; mapped to resetTimeout internally in WebhookDispatcher"
  - "echo CB tests updated to use resetTimeout and match resilience CB error messages"

patterns-established:
  - "Re-export shim: export { X } from '@gravito/resilience' as canonical source"
  - "Circular dep avoidance: JSDoc comment documents intentional standalone copy"

requirements-completed: [RESL-02]

# Metrics
duration: 20min
completed: 2026-03-28
---

# Phase 17 Plan 02: CB Consolidation Summary

**Echo duplicate CircuitBreaker eliminated via re-export shim from @gravito/resilience; core/events CB documented as intentional standalone due to circular dependency**

## Performance

- **Duration:** 20 min
- **Started:** 2026-03-28T12:15:00Z
- **Completed:** 2026-03-28T12:35:10Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Replaced echo's 250-line duplicate CB implementation with a 12-line re-export shim pointing to `@gravito/resilience`
- Updated `WebhookDispatcher` to map echo's `openTimeout` config field to resilience's `resetTimeout` when constructing CB instances
- Replaced echo's `CircuitBreakerState` string union type with a re-export from `@gravito/resilience` (canonical enum)
- Documented `core/events/CircuitBreaker.ts` as intentional standalone with JSDoc explaining the circular dependency rationale
- All 195 echo tests pass, 35 resilience CB tests pass, 1974 core tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace echo CB with re-export shim + fix WebhookDispatcher** - `d5cc5880` (feat)
2. **Task 2: Evaluate and consolidate core/events CB** - `93bc04b9` (docs)

**Plan metadata:** (TBD — docs commit after SUMMARY)

## Files Created/Modified

- `packages/echo/src/resilience/CircuitBreaker.ts` - Replaced 254-line implementation with 12-line re-export shim from @gravito/resilience
- `packages/echo/src/resilience/index.ts` - Updated re-exports to use resilience's CircuitBreakerState
- `packages/echo/src/types.ts` - Replaced local CircuitBreakerState type union with re-export from @gravito/resilience; added import
- `packages/echo/src/send/WebhookDispatcher.ts` - Maps openTimeout -> resetTimeout when building resilience CB; fixes callback name handling
- `packages/echo/package.json` - Added @gravito/resilience to peerDependencies and devDependencies
- `packages/core/src/events/CircuitBreaker.ts` - Added JSDoc documenting intentional standalone (circular dep guard)
- `packages/echo/tests/unit/resilience/CircuitBreaker.test.ts` - Updated openTimeout -> resetTimeout, fixed error message to match resilience CB

## Decisions Made

- **D-01 (confirmed):** Echo CB is replaced with re-export shim — no custom logic needed in echo; all CB behavior comes from canonical resilience implementation
- **D-02 (confirmed):** Core/events CB stays as standalone — adding `@gravito/resilience` to core would create `core -> resilience -> core` cycle since resilience already declares `@gravito/core` as peerDependency
- **openTimeout backwards compat:** Echo's `CircuitBreakerConfig` keeps `openTimeout` field for API backwards compatibility; mapping to `resetTimeout` happens internally in WebhookDispatcher
- **Test updates:** Echo CB tests updated to use `resetTimeout` and match resilience CB error message (`'Circuit is OPEN'` not `'Circuit breaker is OPEN'`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated echo CB tests to match resilience CB behavior**
- **Found during:** Task 1 (Replace echo CB with re-export shim)
- **Issue:** Echo CB tests used `openTimeout` config field (echo-specific) and checked for `'Circuit breaker is OPEN'` error message. After replacing with resilience CB, tests failed because resilience CB expects `resetTimeout` and throws `'Circuit is OPEN'`
- **Fix:** Replaced all `openTimeout` occurrences with `resetTimeout` in test file; updated error message expectation to `'Circuit is OPEN for test-service'`
- **Files modified:** `packages/echo/tests/unit/resilience/CircuitBreaker.test.ts`
- **Verification:** All 195 echo tests pass after fix
- **Committed in:** d5cc5880 (Task 1 commit)

**2. [Rule 1 - Bug] Added import for CircuitBreakerState in echo/src/types.ts**
- **Found during:** Task 1 (Replace echo CB with re-export shim)
- **Issue:** After changing `CircuitBreakerState` from a local type to a re-export, the `CircuitBreakerMetrics` interface in the same file still referenced `CircuitBreakerState` but it was no longer in local scope
- **Fix:** Added `import type { CircuitBreakerState } from '@gravito/resilience'` at the top of types.ts
- **Files modified:** `packages/echo/src/types.ts`
- **Verification:** `bun run typecheck` exits 0
- **Committed in:** d5cc5880 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs — test/type mismatches from implementation swap)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

- Resilience CB callbacks (`onOpen/onHalfOpen/onClose`) accept `(name?: string) => void` (optional name), but echo's `CircuitBreakerConfig` callbacks require `(target: string) => void` (required string). Fixed by using `name ?? host` fallback in WebhookDispatcher callback wrappers.

## Known Stubs

None — all wired to production implementation.

## Next Phase Readiness

- Echo CB consolidation complete: single canonical CB in @gravito/resilience
- Core/events CB documents why it's standalone — future refactoring can revisit if dependency graph changes
- 17-03 (Retry consolidation) can proceed

---
*Phase: 17-resilience-infrastructure*
*Completed: 2026-03-28*
