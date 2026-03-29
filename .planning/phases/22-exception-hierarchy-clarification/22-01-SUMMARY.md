---
phase: 22-exception-hierarchy-clarification
plan: 01
subsystem: auth
tags: [jsdoc, exceptions, auth, documentation]

# Dependency graph
requires: []
provides:
  - AuthException marked @abstract with explicit "do not throw" guidance and @see AuthenticationException
  - AuthenticationException documented as concrete 401 to throw, with sibling relationship clarified
affects: [fortify, sentinel, any package catching AuthException or throwing AuthenticationException]

# Tech tracking
tech-stack:
  added: []
  patterns: ["JSDoc role-separation documentation for abstract base vs concrete exception classes"]

key-files:
  created: []
  modified:
    - packages/core/src/exceptions/AuthException.ts
    - packages/core/src/exceptions/AuthenticationException.ts

key-decisions:
  - "AuthenticationException.d.ts is gitignored (generated during build) — JSDoc update only needed in .ts source"
  - "Pre-existing typecheck failures in @gravito/photon and @gravito/quark are unrelated to this plan"

patterns-established:
  - "Abstract base exception classes: use @abstract + explicit 'Do not throw directly' guidance"
  - "Concrete exceptions: state HTTP status code and relationship to abstract base in JSDoc"

requirements-completed: [EXC-01]

# Metrics
duration: 8min
completed: 2026-03-29
---

# Phase 22 Plan 01: Exception Hierarchy Clarification Summary

**JSDoc role-separation added to AuthException (@abstract base for fortify/sentinel) and AuthenticationException (concrete 401 to throw), resolving naming confusion without any runtime changes**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-29T15:25:42Z
- **Completed:** 2026-03-29T15:33:00Z
- **Tasks:** 1
- **Files modified:** 2 (AuthenticationException.d.ts is gitignored)

## Accomplishments
- AuthException.ts: replaced vague JSDoc with explicit @abstract role, "Do not throw directly" warning, and cross-reference to AuthenticationException
- AuthenticationException.ts: replaced "Exception thrown when authentication fails" with concrete "Concrete 401 Unauthorized exception", documented sibling relationship, added @see AuthException
- 58 contract tests pass confirming no instanceof chain changes

## Task Commits

1. **Task 1: Add role-clarifying JSDoc to AuthException, AuthenticationException, and declaration file** - `5a7a6c2d` (docs)

## Files Created/Modified
- `packages/core/src/exceptions/AuthException.ts` - Added @abstract, "Do not throw directly" warning, fortify/sentinel mention, @see AuthenticationException
- `packages/core/src/exceptions/AuthenticationException.ts` - Added "Concrete 401 Unauthorized" description, sibling clarification, @see AuthException

## Decisions Made
- `AuthenticationException.d.ts` is listed in `.gitignore` as a generated file — it cannot be committed. The `.ts` source is the authoritative location; the `.d.ts` will be regenerated correctly on next build.
- Pre-existing typecheck failures (`@gravito/photon` missing `@gravito/resilience`, `@gravito/quark`) are unrelated to this plan's JSDoc-only changes.

## Deviations from Plan

None — plan executed exactly as written, except `AuthenticationException.d.ts` could not be committed because it is gitignored (generated artifact). The `.ts` source file serves as the authoritative JSDoc source.

## Issues Encountered
- `git add packages/core/src/exceptions/AuthenticationException.d.ts` failed with "paths are ignored by .gitignore". The `.d.ts` is a build artifact regenerated from the `.ts` source. The source file was updated, so on the next build the `.d.ts` will reflect the new JSDoc.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- EXC-01 satisfied: VS Code hover tooltips on AuthException show @abstract + "Do not throw" guidance; AuthenticationException shows "Concrete 401 Unauthorized"
- Ready for Phase 23 (star export cleanup) as planned

---
*Phase: 22-exception-hierarchy-clarification*
*Completed: 2026-03-29*
