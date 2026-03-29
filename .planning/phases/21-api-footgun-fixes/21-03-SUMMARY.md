---
phase: 21-api-footgun-fixes
plan: 03
subsystem: api
tags: [observability, jsdoc, deprecated, planetcore, boot]

requires:
  - phase: 21-01
    provides: "Research validating boot() footgun and @deprecated pattern approach"

provides:
  - "PlanetCore.boot() now forwards observabilityProvider to constructor via conditional spread"
  - "Test coverage for observabilityProvider forwarding (FIX-03)"
  - "Test coverage confirming @deprecated services property runtime accessibility (FIX-04)"

affects: [observability-integration, monitor-package, planetcore-users]

tech-stack:
  added: []
  patterns:
    - "Conditional spread pattern in boot(): ...(config.X && { X: config.X }) for optional constructor options"

key-files:
  created: []
  modified:
    - packages/core/src/PlanetCore.ts
    - packages/core/tests/ioc.test.ts

key-decisions:
  - "No code change needed for FIX-04: @deprecated JSDoc is already correctly applied, only test verification required"
  - "observabilityProvider is public on PlanetCore, no (as any) cast needed in tests"

patterns-established:
  - "boot() spread pattern: all optional constructor options follow ...(config.X && { X: config.X }) form"

requirements-completed: [FIX-03, FIX-04]

duration: 5min
completed: 2026-03-29
---

# Phase 21 Plan 03: PlanetCore boot() observabilityProvider Forwarding Summary

**PlanetCore.boot() now forwards observabilityProvider to the constructor via conditional spread, with tests confirming forwarding and @deprecated services accessibility**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T14:54:00Z
- **Completed:** 2026-03-29T14:55:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added single-line conditional spread for `observabilityProvider` in `PlanetCore.boot()` matching existing pattern for logger, config, adapter, container
- Added test confirming boot() forwards observabilityProvider to constructor (not silently dropped to NoOp default)
- Added test confirming @deprecated services property is accessible at runtime without type errors or runtime failures
- All 7 ioc tests pass; TypeScript core package: 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add observabilityProvider to boot() spread** - `7d76023a` (fix)
2. **Task 2: Add tests for FIX-03 and FIX-04** - `e7df2af2` (test)

**Plan metadata:** [pending docs commit]

## Files Created/Modified

- `packages/core/src/PlanetCore.ts` - Added `...(config.observabilityProvider && { observabilityProvider: config.observabilityProvider })` in boot() constructor spread
- `packages/core/tests/ioc.test.ts` - Added 2 new tests: observabilityProvider forwarding and @deprecated services access

## Decisions Made

- No code change needed for FIX-04: the `/** @deprecated Use core.container instead */` annotation at line 202 was already correct and valid TypeScript JSDoc. Only test verification was required.
- `observabilityProvider` is `public` on PlanetCore, so tests access it directly without `(core as any)` cast.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the fix was a single-line addition matching the existing conditional spread pattern. Pre-existing `@gravito/enterprise#build:dts` exit 127 failure is unrelated to these changes (environment issue in turbo cache miss context).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FIX-03 and FIX-04 complete; observability integration through boot() entry point is now functional
- Plan 21-03 closes out all FIX-series requirements for Phase 21
- Ready for any remaining Phase 21 plans or next phase

---
*Phase: 21-api-footgun-fixes*
*Completed: 2026-03-29*
