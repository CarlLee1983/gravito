---
phase: 16-core-error-model-foundation
plan: "01"
subsystem: infra
tags: [typescript, exceptions, error-model, instanceof, esm-cjs]

# Dependency graph
requires: []
provides:
  - "Three-layer exception hierarchy: InfrastructureException, DomainException, SystemException abstract base classes in @gravito/core"
  - "ConfigurationException concrete class extending SystemException"
  - "Object.setPrototypeOf(this, new.target.prototype) in GravitoException and all new constructors for ESM/CJS instanceof compatibility"
  - "Existing exceptions re-parented: AuthenticationException/AuthorizationException/ValidationException -> DomainException; CircularDependencyException -> SystemException"
  - "Updated barrel exports in packages/core/src/exceptions/index.ts"
affects:
  - "17-error-codes-registry"
  - "18-orbit-atlas-plasma-migration"
  - "19-orbit-batch-migration"
  - "All Orbit packages that will extend InfrastructureException"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Object.setPrototypeOf(this, new.target.prototype) in every error constructor for ESM/CJS instanceof correctness"
    - "Three-layer exception hierarchy: GravitoException -> [InfrastructureException | DomainException | SystemException] -> concrete classes"
    - "Leaf exceptions set this.name explicitly after super() call"

key-files:
  created:
    - packages/core/src/exceptions/InfrastructureException.ts
    - packages/core/src/exceptions/DomainException.ts
    - packages/core/src/exceptions/SystemException.ts
    - packages/core/src/exceptions/ConfigurationException.ts
  modified:
    - packages/core/src/exceptions/GravitoException.ts
    - packages/core/src/exceptions/AuthenticationException.ts
    - packages/core/src/exceptions/AuthorizationException.ts
    - packages/core/src/exceptions/ValidationException.ts
    - packages/core/src/exceptions/CircularDependencyException.ts
    - packages/core/src/exceptions/index.ts

key-decisions:
  - "Object.setPrototypeOf in all constructors per D-04: ESM/CJS instanceof breakage confirmed, new.target.prototype form used so subclass checks work"
  - "InfrastructureException carries retryable: boolean field — callers inspect this before deciding to retry"
  - "CircularDependencyException migrated from bare Error to SystemException hierarchy — now carries status/code/i18n fields"
  - "ConfigurationException uses fixed code 'system.configuration_error' — consistent with registry naming convention in Phase 17"

patterns-established:
  - "Every intermediate and concrete exception constructor calls Object.setPrototypeOf(this, new.target.prototype) as last line"
  - "Abstract intermediate classes (Domain/Infrastructure/System) set this.name to their own class name; concrete leaf classes override with their own name"

requirements-completed:
  - ERRM-01
  - ERRM-03

# Metrics
duration: 8min
completed: "2026-03-28"
---

# Phase 16 Plan 01: Core Exception Hierarchy Summary

**Three-layer exception hierarchy (InfrastructureException, DomainException, SystemException) added to @gravito/core with Object.setPrototypeOf in all constructors, existing exceptions re-parented, zero test regressions (1922 pass)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-28T11:44:54Z
- **Completed:** 2026-03-28T11:52:25Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added `Object.setPrototypeOf(this, new.target.prototype)` to GravitoException constructor — all subclasses now have correct instanceof behavior across ESM/CJS boundaries
- Created three abstract intermediate layers: InfrastructureException (with `retryable: boolean`), DomainException, SystemException — each with their own Object.setPrototypeOf call
- Created ConfigurationException (concrete, extends SystemException, code `system.configuration_error`)
- Re-parented AuthenticationException, AuthorizationException, ValidationException to DomainException; CircularDependencyException migrated from bare Error to SystemException
- Updated barrel exports to include all four new classes
- All 1922 existing core tests continue to pass with 0 failures

## Task Commits

1. **Task 1: Add Object.setPrototypeOf and create three-layer hierarchy** - `c5aa447c` (feat)
2. **Task 2: Re-parent existing exceptions and update barrel exports** - `e6555f14` (feat)

## Files Created/Modified

- `packages/core/src/exceptions/GravitoException.ts` - Added Object.setPrototypeOf as last line of constructor
- `packages/core/src/exceptions/InfrastructureException.ts` - New abstract base for I/O errors with retryable field
- `packages/core/src/exceptions/DomainException.ts` - New abstract base for business logic errors
- `packages/core/src/exceptions/SystemException.ts` - New abstract base for internal framework errors
- `packages/core/src/exceptions/ConfigurationException.ts` - New concrete SystemException for config errors
- `packages/core/src/exceptions/AuthenticationException.ts` - Changed extends target from GravitoException to DomainException
- `packages/core/src/exceptions/AuthorizationException.ts` - Changed extends target from GravitoException to DomainException
- `packages/core/src/exceptions/ValidationException.ts` - Changed extends target from GravitoException to DomainException; added this.name assignment
- `packages/core/src/exceptions/CircularDependencyException.ts` - Migrated from Error to SystemException; uses system.circular_dependency code
- `packages/core/src/exceptions/index.ts` - Added exports for ConfigurationException, DomainException, InfrastructureException, SystemException

## Decisions Made

- Object.setPrototypeOf with `new.target.prototype` (not static class reference) ensures every concrete subclass has correct prototype chain regardless of how deep the hierarchy goes
- CircularDependencyException now uses status 500 and code `system.circular_dependency` — aligns with Phase 17 error code registry naming convention
- All leaf exception constructors explicitly set `this.name` after super() so stack traces remain readable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Three-layer hierarchy is in place as the compile-time foundation for Phase 17 (error codes registry)
- InfrastructureException is ready for Orbit packages (atlas, plasma, etc.) to extend in Phases 18-19
- ConfigurationException is ready to replace ad-hoc config error throws across Orbit packages
- No blockers

---
*Phase: 16-core-error-model-foundation*
*Completed: 2026-03-28*
