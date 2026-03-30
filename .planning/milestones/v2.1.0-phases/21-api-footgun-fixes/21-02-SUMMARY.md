---
phase: 21-api-footgun-fixes
plan: 02
subsystem: api
tags: [router, exceptions, console.log, ModelNotFoundException, typescript]

requires:
  - phase: 21-01
    provides: "Skipped router console.log test unblocked, FIX-05 guard removed"

provides:
  - "Router.req() no longer logs to stdout during route registration (FIX-01)"
  - "Router.model() throws ModelNotFoundException directly instead of string sentinel (FIX-02)"
  - "Two new tests confirming silence and instanceof behavior"

affects: [22-exception-hierarchy, 23-star-export-cleanup]

tech-stack:
  added: []
  patterns:
    - "Direct typed throw pattern: throw typed exception from resolver, not string sentinel caught upstream"
    - "Console spy test pattern: spyOn(console, 'log') with try/finally for cleanup"

key-files:
  created: []
  modified:
    - packages/core/src/Router.ts
    - packages/core/tests/router.test.ts

key-decisions:
  - "Removed console.log('[Router] Registering...') entirely — debug output has no place in library stdout"
  - "Simplified catch block to bare re-throw — ModelNotFoundException propagates from resolver, no interception needed"
  - "Test 2 uses HTTP response status 404 as the observable assertion since ModelNotFoundException maps to HTTP 404"

patterns-established:
  - "Typed exception throw from resolver: throw new ModelNotFoundException(param, String(id))"
  - "Console spy cleanup: spyOn with try/finally to guarantee mockRestore even on assertion failure"

requirements-completed: [FIX-01, FIX-02]

duration: 8min
completed: 2026-03-29
---

# Phase 21 Plan 02: API Footgun Fixes — Router Cleanup Summary

**Router stdout silenced and string sentinel replaced with direct ModelNotFoundException throw, enabling typed instanceof exception handling in user code**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-29T14:55:00Z
- **Completed:** 2026-03-29T15:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Removed `console.log('[Router] Registering...')` from `Router.req()` — library code no longer pollutes stdout on startup
- Replaced `throw new Error('ModelNotFound')` string sentinel with `throw new ModelNotFoundException(param, String(id))` in the model() resolver — catch blocks can now use `instanceof` instead of string comparison
- Simplified middleware catch block to a bare re-throw (removed `const message` variable that satisfied `noUnusedLocals`)
- Added two new tests: console spy test and ModelNotFoundException instanceof/404 test

## Task Commits

1. **Task 1: Remove console.log and fix ModelNotFoundException in Router.ts** - `d30859ec` (fix)
2. **Task 2: Add tests for console.log silence and ModelNotFoundException instanceof** - `b8eebe2e` (test)

## Files Created/Modified

- `packages/core/src/Router.ts` — Removed console.log (line 610), replaced string sentinel throw, simplified catch block
- `packages/core/tests/router.test.ts` — Added `describe('API Footgun Fixes')` with 2 new tests, added `spyOn` to imports

## Decisions Made

- Used bare `throw err` in the catch block after removing the string sentinel check — the exception now originates in the resolver and propagates naturally without interception
- Test 2 asserts HTTP 404 status (observable via `core.adapter.fetch`) rather than catching the exception directly, since the framework's error handler translates GravitoException.status to HTTP status codes

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- FIX-01 and FIX-02 are complete; user code can now import `@gravito/core`, register routes, and catch `ModelNotFoundException` with `instanceof` cleanly
- No console output leaks during route registration
- Ready for Phase 22 (exception hierarchy) and Phase 23 (star export cleanup)

---
*Phase: 21-api-footgun-fixes*
*Completed: 2026-03-29*

## Self-Check: PASSED

- `packages/core/src/Router.ts` — FOUND (modified, verified via grep)
- `packages/core/tests/router.test.ts` — FOUND (modified, 24 tests pass)
- Task 1 commit `d30859ec` — FOUND
- Task 2 commit `b8eebe2e` — FOUND
