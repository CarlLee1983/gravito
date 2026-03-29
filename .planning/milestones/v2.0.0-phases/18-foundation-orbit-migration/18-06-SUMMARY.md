---
phase: 18-foundation-orbit-migration
plan: "06"
subsystem: core
tags: [shutdown, resilience, timeout, planet-core, D-10]
dependency_graph:
  requires: [18-02, 18-03, 18-04, 18-05]
  provides: [global-shutdown-timeout]
  affects: [packages/core/src/PlanetCore.ts]
tech_stack:
  added: []
  patterns: [Promise.race, global-timeout, LIFO-shutdown]
key_files:
  created:
    - packages/core/tests/shutdown-global-timeout.test.ts
  modified:
    - packages/core/src/PlanetCore.ts
decisions:
  - "Move app:shutdown hook to after Promise.race so it always fires even on timeout"
  - "GLOBAL_SHUTDOWN_TIMEOUT as private static readonly — compile-time constant"
metrics:
  duration_minutes: 6
  completed_date: "2026-03-28"
  tasks_completed: 1
  files_changed: 2
---

# Phase 18 Plan 06: Global Shutdown Timeout Summary

**One-liner:** Global 10s shutdown ceiling via Promise.race added to PlanetCore.shutdown() so hanging orbit handlers cannot block process exit indefinitely (D-10).

## Objective

Add a hard global timeout to `PlanetCore.shutdown()` that ensures the entire shutdown sequence completes within 10 seconds, regardless of individual provider behavior. Individual orbits already have per-package deadlines (2-5s), but without a global ceiling multiple simultaneous hangers could block the process forever.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add global 10s shutdown timeout to PlanetCore.shutdown() | 78f165f5 | packages/core/src/PlanetCore.ts, packages/core/tests/shutdown-global-timeout.test.ts |

## Implementation

### What Was Done

Added `GLOBAL_SHUTDOWN_TIMEOUT = 10_000` as a `private static readonly` constant to `PlanetCore`, and refactored `shutdown()` to:

1. Extract the provider loop into `shutdownSequence()` async function
2. Create `globalDeadline` Promise that rejects after 10s with a descriptive error message
3. `await Promise.race([shutdownSequence(), globalDeadline])` — whichever resolves/rejects first wins
4. If globalDeadline wins: catch the rejection and call `this.logger.warn('[PlanetCore] Forced shutdown after global timeout:', err)`
5. Fire `app:shutdown` hook **after** the race (outside try/catch) so it always fires even on timeout

### Key Design Decision

The `app:shutdown` hook was moved **outside** the `shutdownSequence()` function and placed after the `Promise.race`. This ensures the hook fires unconditionally — even if the global timeout fires and some providers are still hanging. This is the safest design: consumers of `app:shutdown` can still do final cleanup.

## Test Results

**New tests (4):**
- "should resolve within ~10.5s even when a provider onShutdown hangs indefinitely" — PASS
- "should complete quickly and fire app:shutdown hook for normal (fast) providers" — PASS
- "should log a warning message when the global timeout fires" — PASS
- "should call all providers onShutdown in LIFO order for normal cases (no regression)" — PASS

**Core suite:** 1823 pass, 3 skip, 6 fail (pre-existing failures, not caused by this change — baseline before change was 8 fail, improved to 6 fail with 4 new passes added).

**TypeScript:** Clean (0 errors).

## Verification

```
grep 'GLOBAL_SHUTDOWN_TIMEOUT' packages/core/src/PlanetCore.ts  # Match found
grep 'Promise.race' packages/core/src/PlanetCore.ts             # Match found in shutdown()
grep '10_000' packages/core/src/PlanetCore.ts                   # Match found
```

All plan verification criteria satisfied.

## Deviations from Plan

None — plan executed exactly as written.

The only micro-decision was confirming the "ALTERNATIVE" approach (moving `app:shutdown` outside the race) rather than the primary approach. The plan explicitly documented both options and recommended choosing based on convention. Existing behavior fired the hook inside the sequence, but always-firing makes for more predictable behavior, which matches the spirit of D-10.

## Known Stubs

None.

## Self-Check: PASSED

- [x] `packages/core/src/PlanetCore.ts` — FOUND (modified)
- [x] `packages/core/tests/shutdown-global-timeout.test.ts` — FOUND (created)
- [x] Commit `78f165f5` — FOUND
- [x] `GLOBAL_SHUTDOWN_TIMEOUT` constant — present in PlanetCore.ts
- [x] `Promise.race` — present in shutdown() method
- [x] All 4 new tests pass
- [x] TypeScript clean
