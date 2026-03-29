---
phase: 21-api-footgun-fixes
plan: 01
subsystem: api
tags: [bun, http-adapter, middleware, routing, testing]

# Dependency graph
requires: []
provides:
  - BunNativeAdapter.matchesPath treats '/' as global wildcard (HTTP convention)
  - orbit-middleware-isolation tests fully passing (0 skips)
affects: [21-02, 21-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HTTP convention: use('/') is semantically equivalent to use('*') — match all paths"

key-files:
  created: []
  modified:
    - packages/core/src/adapters/bun/BunNativeAdapter.ts
    - packages/core/tests/orbit-middleware-isolation.test.ts

key-decisions:
  - "Treat pattern === '/' as global wildcard in matchesPath, consistent with Express/Hono/Koa conventions"
  - "Pre-existing 6 test failures in unrelated suites are not regressions from this fix"

patterns-established:
  - "matchesPath: check '*' then '/' early return for global middleware patterns"

requirements-completed: [FIX-05]

# Metrics
duration: 6min
completed: 2026-03-29
---

# Phase 21 Plan 01: BunNativeAdapter matchesPath '/' Global Wildcard Fix Summary

**BunNativeAdapter.matchesPath now treats '/' as global wildcard, unblocking two orbit-middleware-isolation tests that were previously skipped due to this bug**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-29T14:46:57Z
- **Completed:** 2026-03-29T14:52:30Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Fixed `BunNativeAdapter.matchesPath()` to treat `'/'` as a global wildcard (matches all paths), consistent with HTTP framework conventions (Express, Hono, Koa)
- Unskipped both `PlanetCore.mountOrbit()` tests in `orbit-middleware-isolation.test.ts` — they now pass
- Removed `KNOWN LIMITATION` JSDoc blocks from the test file (bug is resolved)
- Full core test suite: 1601 pass, 1 skip, 6 fail (6 failures are pre-existing unrelated to this fix, confirmed via git stash comparison)

## Task Commits

1. **Task 1: Fix BunNativeAdapter.matchesPath to treat '/' as global wildcard** - `a285cfa7` (fix)
2. **Task 2: Unskip orbit-middleware-isolation tests** - `39210034` (test)

## Files Created/Modified

- `packages/core/src/adapters/bun/BunNativeAdapter.ts` - Added `if (pattern === '/') { return true }` block after the `pattern === '*'` check in `matchesPath()`
- `packages/core/tests/orbit-middleware-isolation.test.ts` - Changed `it.skip` to `it` for both mountOrbit tests, replaced KNOWN LIMITATION blocks with brief comments

## Decisions Made

- Placed `'/'` check immediately after `'*'` check (both are "match-all" cases) for clarity
- Did not touch any other matchesPath logic — minimal, surgical change
- Confirmed 6 pre-existing failures are not caused by this fix (verified via git stash baseline comparison)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the fix was straightforward. The `'/'` wildcard check was clearly missing, adding it made both orbit tests pass immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- FIX-05 is complete; FIX-01 (router console.log fix) can now proceed in Phase 21-02
- The two orbit-middleware-isolation tests now serve as regression guards for router behavior
- No blockers for 21-02 or 21-03

---
*Phase: 21-api-footgun-fixes*
*Completed: 2026-03-29*
