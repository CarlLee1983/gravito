---
phase: 18-foundation-orbit-migration
plan: "04"
subsystem: infra
tags: [circuit-breaker, resilience, photon, middleware, http, fault-tolerance]

requires:
  - phase: 17-resilience-infrastructure
    provides: "@gravito/resilience CircuitBreaker class with execute/isOpen/getMetrics API"
  - phase: 18-02
    provides: "Validated migration pattern for orbit-level CB replacement"
provides:
  - "Photon circuitBreaker() middleware using @gravito/resilience internally"
  - "503 + Retry-After header on open circuit (D-08)"
  - "Contract tests verifying D-07 (public API) and D-08 (Retry-After header)"
affects: [18-05, 18-06, 19-batch-orbit-migration]

tech-stack:
  added:
    - "@gravito/resilience: workspace:* added to packages/photon/dependencies"
  patterns:
    - "CB adapter pattern: wrap resilience CB, map field names (resetTimeoutMs -> resetTimeout)"
    - "Detect open circuit via breaker.isOpen() after execute() throws (not instanceof)"
    - "Translate CircuitBreakerMetrics to photon CircuitBreakerState shape in getPhotonState()"

key-files:
  created:
    - "packages/photon/tests/contract/photon-cb.contract.test.ts"
  modified:
    - "packages/photon/src/middleware/circuit-breaker.ts"
    - "packages/photon/package.json"
    - "packages/resilience/package.json"

key-decisions:
  - "Detect open circuit via breaker.isOpen() not instanceof CircuitOpenException (exception class does not exist in @gravito/resilience)"
  - "Remove @gravito/photon from resilience devDependencies to break circular dependency (photon -> resilience -> photon via devDeps)"
  - "Use named constructor pattern: new ResilienceCB(name, options) not {name, ...options}"
  - "getMetrics() provides failures/successes/lastFailureAt for photon CircuitBreakerState mapping"

patterns-established:
  - "Adapter pattern for CB integration: keep public API, delegate to shared lib internally"
  - "Retry-After header = Math.ceil(resetTimeoutMs / 1000) seconds"
  - "Contract tests with @ts-nocheck for middleware integration tests (context typing)"

requirements-completed: [INTG-01]

duration: 7min
completed: 2026-03-28
---

# Phase 18 Plan 04: Photon CB → @gravito/resilience Migration Summary

**Photon circuitBreaker() middleware now delegates to @gravito/resilience internally with zero public API change, adding Retry-After header on 503 open-circuit responses per D-08**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T14:26:02Z
- **Completed:** 2026-03-28T14:33:00Z
- **Tasks:** 1 of 1
- **Files modified:** 4

## Accomplishments

- Replaced 156-line internal `CircuitBreaker` state machine class with `ResilienceCB` from `@gravito/resilience`
- Added `Retry-After` header to all 503 open-circuit responses (D-08 compliance)
- Public API fully preserved: `CircuitBreakerConfig`, `CircuitBreakerState`, `circuitBreakerPresets` — all unchanged (D-07)
- Added 10 contract tests across 3 test suites verifying D-07 and D-08
- All 7 existing circuit-breaker tests still pass

## Task Commits

1. **Task 1: Replace photon internal CB with @gravito/resilience CB + add Retry-After header** - `7fc246ea` (feat)

## Files Created/Modified

- `packages/photon/src/middleware/circuit-breaker.ts` - Rewrote to use ResilienceCB internally, removed local state machine class, added Retry-After
- `packages/photon/package.json` - Added `@gravito/resilience: workspace:*` to dependencies
- `packages/resilience/package.json` - Removed `@gravito/photon` from devDependencies (cycle break)
- `packages/photon/tests/contract/photon-cb.contract.test.ts` - New: 10 contract tests for D-07/D-08

## Decisions Made

- **`isOpen()` instead of instanceof**: The plan assumed a `CircuitOpenException` class but `@gravito/resilience` throws a generic `Error('Circuit is OPEN for ...')`. Detection via `breaker.isOpen()` after execute() throws is the correct pattern (matches existing bridge/photon.ts).
- **Named constructor**: `new ResilienceCB(name, options)` — the `name` field is a first-arg string, not inside `CircuitBreakerOptions`.
- **Circular dep fix**: `@gravito/resilience` had `@gravito/photon` in devDependencies (unused — tests don't reference it). Removing it broke the turbo cycle `photon -> resilience -> photon`.
- **getMetrics() for state**: ResilienceCB's `getState()` returns the enum value only. `getMetrics()` provides the full snapshot needed to populate photon's `CircuitBreakerState` shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CircuitOpenException does not exist in @gravito/resilience**
- **Found during:** Task 1 (implementation)
- **Issue:** Plan specified `catch (error instanceof CircuitOpenException)` but the class does not exist in `@gravito/resilience`. The CB throws a generic `Error`.
- **Fix:** Use `breaker.isOpen()` after execute() throws to detect open circuit (matches existing `bridge/photon.ts` pattern)
- **Files modified:** packages/photon/src/middleware/circuit-breaker.ts
- **Verification:** All 10 contract tests pass, 7 existing tests pass
- **Committed in:** 7fc246ea

**2. [Rule 3 - Blocking] Circular dependency: photon -> resilience -> photon**
- **Found during:** Task 1 (monorepo typecheck)
- **Issue:** Adding `@gravito/resilience` to photon's dependencies created a cycle because resilience had `@gravito/photon` in devDependencies. Turbo rejected the graph.
- **Fix:** Removed `@gravito/photon` from resilience's devDependencies (verified unused — bridge/photon.ts uses `any` types, tests don't reference photon)
- **Files modified:** packages/resilience/package.json
- **Verification:** `bun run typecheck` (84/84 tasks pass)
- **Committed in:** 7fc246ea

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes essential for correctness and build. No scope creep. Public API contract fully maintained.

## Issues Encountered

- Resilience `dist/` was cleared after `bun install --ignore-scripts` — rebuilt with `bun run build` in packages/resilience. Root cause: bun workspace symlinking behavior with script hooks disabled.

## Next Phase Readiness

- Photon CB middleware is wired to `@gravito/resilience` and validated
- `@gravito/photon` no longer needs devDep on resilience — resilience bridge uses `any` types
- Ready for Plan 05 (next orbit migration wave)

---
*Phase: 18-foundation-orbit-migration*
*Completed: 2026-03-28*
