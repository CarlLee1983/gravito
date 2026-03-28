---
phase: 16-core-error-model-foundation
plan: "03"
subsystem: testing
tags: [typescript, exceptions, contract-tests, error-codes, errm-02, errm-03]

# Dependency graph
requires:
  - phase: 16-core-error-model-foundation
    plan: "01"
    provides: "Three-layer exception hierarchy with Object.setPrototypeOf"
  - phase: 16-core-error-model-foundation
    plan: "02"
    provides: "Orbit ErrorCodes const objects (DatabaseErrorCodes, CacheErrorCodes, MailErrorCodes, QueueErrorCodes)"
provides:
  - "assertGravitoException reusable contract helper in packages/core/tests/contract/helpers.ts"
  - "Contract tests for all 7 concrete core exceptions verifying instanceof at all hierarchy levels"
  - "ErrorCodes contract tests verifying ERRM-02 runtime accessibility for all 4 Orbit packages"
  - "Cause chain preservation tests (ERRM-03)"
  - "Bug fix: ModelNotFoundException now sets this.name correctly"
affects:
  - "18-orbit-atlas-plasma-migration"
  - "19-orbit-batch-migration"
  - "All future Orbit package tests that will import assertGravitoException"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Contract test helper pattern: assertGravitoException validates instanceof chain, .code, .status, .name, .cause, .retryable"
    - "ErrorCodes namespace convention: db.*, redis.*, mail.*, queue.* dot-separated strings accessible without inspecting .message"
    - "Cross-package import pattern from core/tests/contract to sibling package source files"

key-files:
  created:
    - packages/core/tests/contract/helpers.ts
    - packages/core/tests/contract/core-exceptions.contract.test.ts
    - packages/core/tests/contract/error-codes.contract.test.ts
  modified:
    - packages/core/src/exceptions/ModelNotFoundException.ts

key-decisions:
  - "assertGravitoException helper is generic and reusable — Orbit packages import it in Phase 18-19 without duplicating assertion logic"
  - "Contract tests do NOT assert on .message strings (except CircularDependencyException path format which is structural)"
  - "Cross-package imports in tests (../../../atlas/src/errors/codes) are deliberate — tests verify ERRM-02 compliance at runtime"

patterns-established:
  - "Contract tests assert: instanceof chain, .code value, .status value, .name != 'Error' — never assert .message text"
  - "ErrorCodes objects verified with two invariants: (1) all values match namespace regex, (2) specific known values match expected strings"

requirements-completed:
  - ERRM-01
  - ERRM-02
  - ERRM-03

# Metrics
duration: 3min
completed: "2026-03-28"
---

# Phase 16 Plan 03: Contract Tests Summary

**Contract test scaffolding for ERRM-01/02/03: assertGravitoException helper + 52 passing tests covering all core exception classes, instanceof chains, cause chain preservation, and 4 Orbit ErrorCodes registries at runtime**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T11:56:54Z
- **Completed:** 2026-03-28T11:59:25Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `assertGravitoException` reusable helper in `packages/core/tests/contract/helpers.ts` — verifies instanceof at all layers, .code, .status, .name, .cause, .retryable
- Created core exceptions contract tests (34 tests) covering all 7 concrete classes with instanceof checks at every hierarchy level (concrete -> intermediate -> GravitoException -> Error)
- Created ErrorCodes contract tests (18 tests) verifying all 4 Orbit packages' error code registries at runtime: namespace convention, specific values, cross-package uniqueness
- Fixed ModelNotFoundException missing `this.name = 'ModelNotFoundException'` assignment (Rule 1 bug fix)

## Task Commits

1. **Task 1: Contract test helper and core exceptions contract tests** - `ad892f05` (test)
2. **Task 2: ErrorCodes contract tests for ERRM-02 compliance** - `2ab6482f` (test)

## Files Created/Modified

- `packages/core/tests/contract/helpers.ts` - Reusable assertGravitoException helper with ContractAssertOptions interface
- `packages/core/tests/contract/core-exceptions.contract.test.ts` - 34 contract tests covering all 7 core exception classes
- `packages/core/tests/contract/error-codes.contract.test.ts` - 18 contract tests for ERRM-02 compliance across 4 Orbit packages
- `packages/core/src/exceptions/ModelNotFoundException.ts` - Added missing this.name assignment

## Decisions Made

- Contract tests use relative cross-package imports (`../../../atlas/src/errors/codes`) to verify ERRM-02 at runtime — this is deliberate and acceptable in test code
- Tests do NOT assert on `.message` strings (anti-pattern per research) except CircularDependencyException's path format which is structural behavior
- assertGravitoException helper is designed to be re-imported by Orbit package tests in Phases 18-19

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed missing this.name in ModelNotFoundException**
- **Found during:** Task 1 (running core exceptions contract tests)
- **Issue:** ModelNotFoundException constructor did not set `this.name = 'ModelNotFoundException'`. Base GravitoException sets `this.name = 'GravitoException'`, so without override the name was stuck at 'GravitoException'
- **Fix:** Added `this.name = 'ModelNotFoundException'` as first line after `super()` call in ModelNotFoundException constructor
- **Files modified:** packages/core/src/exceptions/ModelNotFoundException.ts
- **Verification:** Test `all exception names are set to specific class names (not generic Error)` now passes
- **Committed in:** ad892f05 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Bug fix was necessary for contract test correctness. No scope creep.

## Issues Encountered

- Worktree was behind main branch and missing Wave 1 files. Resolved by merging main into the worktree branch (`git merge main`) before starting.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Contract test infrastructure is complete and reusable for Phase 18-19 Orbit migration
- `assertGravitoException` helper in `packages/core/tests/contract/helpers.ts` can be imported directly by Orbit package tests
- All 52 contract tests pass; test patterns established
- No blockers

---
*Phase: 16-core-error-model-foundation*
*Completed: 2026-03-28*

## Self-Check: PASSED

- FOUND: packages/core/tests/contract/helpers.ts
- FOUND: packages/core/tests/contract/core-exceptions.contract.test.ts
- FOUND: packages/core/tests/contract/error-codes.contract.test.ts
- FOUND: .planning/phases/16-core-error-model-foundation/16-03-SUMMARY.md
- FOUND commit: ad892f05 (Task 1)
- FOUND commit: 2ab6482f (Task 2)
