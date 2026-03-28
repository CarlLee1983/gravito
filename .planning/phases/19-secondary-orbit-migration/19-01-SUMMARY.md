---
phase: 19-secondary-orbit-migration
plan: "01"
subsystem: infra
tags: [exceptions, typescript, abstract-classes, error-handling]

# Dependency graph
requires: []
provides:
  - "AuthException abstract class extending DomainException in @gravito/core"
  - "QueueException abstract class extending InfrastructureException in @gravito/core"
  - "StorageException abstract class extending InfrastructureException in @gravito/core"
  - "StreamException abstract class extending InfrastructureException in @gravito/core"
  - "DomainException abstract class (prerequisite) in @gravito/core"
  - "InfrastructureException abstract class (prerequisite) in @gravito/core"
  - "Contract test helpers for GravitoException subclass validation"
affects:
  - 19-02-batch1-fortify-flux-stream
  - 19-03-batch2-storage-packages
  - All plans that re-parent satellite errors to the 4 new intermediate classes

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Abstract exception class pattern with Object.setPrototypeOf for ESM boundary safety"
    - "Contract test pattern: concrete test subclass + assertGravitoException helper"

key-files:
  created:
    - packages/core/src/exceptions/AuthException.ts
    - packages/core/src/exceptions/DomainException.ts
    - packages/core/src/exceptions/InfrastructureException.ts
    - packages/core/src/exceptions/QueueException.ts
    - packages/core/src/exceptions/StorageException.ts
    - packages/core/src/exceptions/StreamException.ts
    - packages/core/tests/contract/helpers.ts
    - packages/core/tests/contract/intermediate-exceptions.contract.test.ts
  modified:
    - packages/core/src/exceptions/index.ts

key-decisions:
  - "AuthException extends DomainException (not InfrastructureException) per D-04 — auth errors are domain violations, not infra failures"
  - "Also added DomainException and InfrastructureException as prerequisites — they were absent from worktree branch"
  - "Contract test file created from scratch (not extended) since worktree lacked CacheException/DatabaseException"

patterns-established:
  - "Exception template: import from GravitoException for ExceptionOptions, set this.name, call Object.setPrototypeOf"
  - "Test pattern: create minimal concrete subclass, verify instanceof chain + structural fields + ESM safety"

requirements-completed: [MIGR-01]

# Metrics
duration: 3min
completed: 2026-03-28
---

# Phase 19 Plan 01: Intermediate Exception Classes Summary

**4 new abstract exception classes (AuthException, QueueException, StorageException, StreamException) added to @gravito/core as Wave 0 prerequisites for the secondary orbit migration phase**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-28T16:05:33Z
- **Completed:** 2026-03-28T16:08:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Created 4 intermediate abstract exception classes enabling satellite packages to re-parent their errors to domain-appropriate base classes
- Also created DomainException and InfrastructureException (missing from worktree, required as prerequisites)
- Updated barrel exports in alphabetical order
- 16 contract tests pass validating instanceof chain, structural fields, and ESM boundary safety for all 4 classes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 4 intermediate exception classes and update barrel exports** - `b1d08d55` (feat)
2. **Task 2: Add contract tests for all 4 new intermediate exceptions** - `712e456c` (test)

## Files Created/Modified

- `packages/core/src/exceptions/DomainException.ts` - Abstract base for domain/business rule violations (prerequisite)
- `packages/core/src/exceptions/InfrastructureException.ts` - Abstract base for I/O errors with retryable flag (prerequisite)
- `packages/core/src/exceptions/AuthException.ts` - Abstract base for auth domain errors (extends DomainException)
- `packages/core/src/exceptions/QueueException.ts` - Abstract base for queue infra errors (extends InfrastructureException)
- `packages/core/src/exceptions/StorageException.ts` - Abstract base for storage infra errors (extends InfrastructureException)
- `packages/core/src/exceptions/StreamException.ts` - Abstract base for stream infra errors (extends InfrastructureException)
- `packages/core/src/exceptions/index.ts` - Updated with 6 new barrel exports in alphabetical order
- `packages/core/tests/contract/helpers.ts` - assertGravitoException reusable contract helper
- `packages/core/tests/contract/intermediate-exceptions.contract.test.ts` - 16 contract tests for all 4 new classes

## Decisions Made

- AuthException extends DomainException (not InfrastructureException) per design decision D-04 — authentication/authorization failures are domain violations (caller mistakes), not infrastructure problems
- Also added DomainException and InfrastructureException: these were present in main branch but absent from the worktree branch; they are required prerequisites
- Contract test file created fresh (not extended from existing) since the worktree branch lacked DatabaseException and CacheException which the existing tests reference

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing prerequisite DomainException and InfrastructureException**
- **Found during:** Task 1 (creating AuthException which extends DomainException)
- **Issue:** Worktree branch was missing DomainException and InfrastructureException — both are required by the 4 new classes the plan specifies
- **Fix:** Created both files from main branch equivalents (same implementation)
- **Files modified:** packages/core/src/exceptions/DomainException.ts, packages/core/src/exceptions/InfrastructureException.ts
- **Verification:** typecheck passes, 4 new classes compile without errors
- **Committed in:** b1d08d55 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed ExceptionOptions import path in AuthException**
- **Found during:** Task 1 verification (first typecheck run)
- **Issue:** `import { type ExceptionOptions, DomainException } from './DomainException'` — DomainException.ts does not re-export ExceptionOptions (it's in GravitoException)
- **Fix:** Split import: ExceptionOptions from GravitoException, DomainException from DomainException
- **Files modified:** packages/core/src/exceptions/AuthException.ts
- **Verification:** typecheck passes with 0 errors
- **Committed in:** b1d08d55 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking prerequisite, 1 import bug)
**Impact on plan:** Both auto-fixes necessary for compilation. No scope creep.

## Issues Encountered

- Worktree branch was at an earlier revision than main — lacked intermediate classes that were added in prior milestones. Both DomainException and InfrastructureException were recreated from main as blocking prerequisites.
- The import for ExceptionOptions in AuthException needed to come from GravitoException directly since DomainException doesn't re-export it.

## Next Phase Readiness

- All 4 intermediate exception classes are ready in @gravito/core exceptions index
- Batch 1 migration (plans 02-03) can now re-parent: FortifyError → AuthException, FluxError → QueueException, StreamError → StreamException
- Batch 2 migration (plan 04+) can now re-parent storage errors to StorageException
- Contract test infrastructure (helpers.ts + test pattern) ready for reuse in orbit package tests

---
*Phase: 19-secondary-orbit-migration*
*Completed: 2026-03-28*

## Self-Check: PASSED

- FOUND: packages/core/src/exceptions/AuthException.ts
- FOUND: packages/core/src/exceptions/QueueException.ts
- FOUND: packages/core/src/exceptions/StorageException.ts
- FOUND: packages/core/src/exceptions/StreamException.ts
- FOUND: packages/core/tests/contract/intermediate-exceptions.contract.test.ts
- FOUND: .planning/phases/19-secondary-orbit-migration/19-01-SUMMARY.md
- FOUND commit: b1d08d55 (feat: 4 intermediate exception classes)
- FOUND commit: 712e456c (test: contract tests)
