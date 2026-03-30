---
phase: 28-fast-path-routing
plan: 02
subsystem: api
tags: [middleware, security, bun, cvs-prevention]

requires:
  - phase: 28-01
    provides: FastPathRegistry, registerFastPath(), serveConfig()
provides:
  - Per-route middleware opt-out via BunRouteOptions.excludeMiddleware
  - CVE-2025-29927 security contract test for fast-path auth
  - MiddlewareDriftException for post-serveConfig() modification detection
affects: [photon-middleware, security-audit]

tech-stack:
  added: []
  patterns: [name-based-middleware-exclusion, snapshot-lock-pattern]

key-files:
  created:
    - packages/core/src/exceptions/MiddlewareDriftException.ts
    - packages/core/tests/security-fast-path.test.ts
    - packages/core/tests/middleware-drift.test.ts
    - packages/photon/tests/middleware-opt-out.test.ts
  modified:
    - packages/core/src/adapters/bun/BunNativeAdapter.ts
    - packages/core/src/adapters/bun/RadixNode.ts
    - packages/core/src/adapters/bun/RadixRouter.ts
    - packages/core/src/adapters/bun/types.ts
    - packages/core/src/exceptions/index.ts
    - packages/photon/src/photon.ts

key-decisions:
  - "Middleware exclusion uses function.name matching — simple, no extra registry needed"
  - "serveConfig() sets isSnapshotLocked flag — any post-snapshot mutation throws in dev mode"

patterns-established:
  - "Snapshot lock pattern: boolean flag set on config generation, checked on mutation"
  - "Name-based middleware filtering: exclude by handler.name or .middlewareName"

requirements-completed: [PERF-02]

duration: 5min
completed: 2026-03-30
---

# Plan 28-02: Middleware Opt-Out & Security Contracts Summary

**Per-route middleware exclusion via BunRouteOptions, CVE-2025-29927 security test, and serveConfig() drift detection**

## Performance

- **Duration:** 5 min (pre-existing implementation verified and committed)
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments
- Routes can opt out of specific global middleware by name via `excludeMiddleware` option
- Fast-path auth security test verifies 401 on protected routes without credentials
- `MiddlewareDriftException` thrown when modifying routes/middleware after `serveConfig()` snapshot
- 8 new tests passing across 3 test files

## Task Commits

Each task was committed atomically:

1. **Task 1: Per-route middleware opt-out** - `d25a170a` (feat)
2. **Task 2: Security and opt-out tests** - `4719efa3` (test)
3. **Task 3: Drift detection** - `a020f732` (feat)

## Files Created/Modified
- `packages/core/src/adapters/bun/types.ts` - BunRouteOptions with excludeMiddleware
- `packages/core/src/adapters/bun/BunNativeAdapter.ts` - checkLock(), middleware filtering
- `packages/core/src/adapters/bun/RadixNode.ts` - Route options metadata storage
- `packages/core/src/adapters/bun/RadixRouter.ts` - Options pass-through
- `packages/core/src/exceptions/MiddlewareDriftException.ts` - New exception class
- `packages/core/tests/security-fast-path.test.ts` - CVE-2025-29927 prevention test
- `packages/core/tests/middleware-drift.test.ts` - Snapshot lock verification
- `packages/photon/tests/middleware-opt-out.test.ts` - Middleware exclusion test

## Decisions Made
- Used function name-based middleware exclusion (simple, no extra registry)
- Drift detection only throws in non-production (avoids breaking production deploys)

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## Next Phase Readiness
- Fast-path routing system complete with security contracts
- Ready for Phase 29 (Lite Satellite)

---
*Phase: 28-fast-path-routing*
*Completed: 2026-03-30*
