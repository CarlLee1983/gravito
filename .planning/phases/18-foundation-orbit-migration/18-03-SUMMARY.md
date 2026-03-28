---
phase: 18-foundation-orbit-migration
plan: "03"
subsystem: infra
tags: [signal, mail, error-model, resilience, shutdown, InfrastructureException, withRetry]

# Dependency graph
requires:
  - phase: 18-01
    provides: "InfrastructureException base class and withRetry from @gravito/resilience"

provides:
  - "MailTransportError extending InfrastructureException with mail.* codes"
  - "BaseTransport.send() using withRetry from @gravito/resilience (3x, idempotent)"
  - "OrbitSignal core:shutdown handler with 5s deadline and type-safe transport cleanup"
  - "Contract tests for MailTransportError hierarchy and shutdown pattern"

affects:
  - "18-04 (atlas migration — same pattern: error model + resilience + shutdown)"
  - "Phase 19 batch migration — validated signal pattern is the template"
  - "any consumer of @gravito/signal MailTransportError (instanceof InfrastructureException)"

# Tech tracking
tech-stack:
  added:
    - "@gravito/resilience workspace:* added as dependency to @gravito/signal"
  patterns:
    - "Backward compat via legacyCode field: new error class supports both old MailErrorCode enum and new mail.* strings"
    - "Closeable interface + isCloseable() type guard: detects transport.close() without as any"
    - "Promise.race shutdown pattern with configurable deadline (5s for signal)"
    - "RETRYABLE_CODES Set<string> determines which mail errors are retried automatically"

key-files:
  created:
    - packages/signal/tests/contract/signal-errors.contract.test.ts
    - packages/signal/tests/contract/signal-shutdown.contract.test.ts
  modified:
    - packages/signal/src/errors.ts
    - packages/signal/src/transports/BaseTransport.ts
    - packages/signal/src/OrbitSignal.ts
    - packages/signal/package.json
    - packages/signal/tests/OrbitSignalWebhook.test.ts

key-decisions:
  - "MailErrorCode enum preserved for backward compat — consumers using enum values still work, legacyCode field provides round-trip"
  - "BaseTransport maxRetries maps to withRetry maxAttempts — existing subclass options honored"
  - "Only CONNECTION_FAILED and RATE_LIMIT are retryable (transient); AUTH_FAILED etc. are not"
  - "Closeable interface uses type narrowing not as any — TypeScript strict compliance maintained"
  - "Deadline set to 5s for signal per D-09 (plasma=3s, signal=5s)"

patterns-established:
  - "Signal error migration pattern: extend InfrastructureException, keep legacy enum, add legacyCode field"
  - "Shutdown hook pattern: Promise.race([cleanup(), deadline]) with logger.warn on force-close"
  - "Contract test structure for shutdown: fast path + deadline exceeded + hook registration"

requirements-completed: [INTG-03]

# Metrics
duration: 25min
completed: 2026-03-28
---

# Phase 18 Plan 03: Signal Migration Summary

**MailTransportError extends InfrastructureException with mail.* codes, BaseTransport retry replaced by withRetry, and OrbitSignal registers core:shutdown with 5s deadline**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-03-28T14:10:00Z
- **Completed:** 2026-03-28T14:35:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- MailTransportError now extends InfrastructureException with 502 HTTP status and mail.* namespaced codes
- BaseTransport hand-rolled retry loop replaced with `withRetry` from `@gravito/resilience` (3x, idempotent:true)
- OrbitSignal.install() registers `core:shutdown` handler with 5s Promise.race deadline enforcement
- Transport cleanup uses type-safe `Closeable` interface and `isCloseable()` guard (no `as any`)
- SmtpTransport.close() will be called during graceful shutdown via the type guard
- All 52 signal tests pass (7 errors contract + 3 shutdown contract + 42 existing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate MailTransportError to InfrastructureException + replace BaseTransport retry** - `bc90105c` (feat)
2. **Task 2: Add signal shutdown handler with 5s deadline** - `f4f726d3` (feat)

## Files Created/Modified

- `packages/signal/src/errors.ts` - MailTransportError now extends InfrastructureException; legacyCode field for backward compat; RETRYABLE_CODES Set
- `packages/signal/src/transports/BaseTransport.ts` - send() uses withRetry; hand-rolled for/sleep loop removed
- `packages/signal/src/OrbitSignal.ts` - Closeable interface, isCloseable() type guard, cleanup() method, core:shutdown handler with 5s deadline
- `packages/signal/package.json` - Added @gravito/resilience workspace:* dependency
- `packages/signal/tests/contract/signal-errors.contract.test.ts` - Contract tests: instanceof chain, retryable flags, backward compat
- `packages/signal/tests/contract/signal-shutdown.contract.test.ts` - Contract tests: fast path, deadline exceeded, hook registration
- `packages/signal/tests/OrbitSignalWebhook.test.ts` - Fixed mock to include hooks.doAction

## Decisions Made

- Preserved MailErrorCode enum for backward compat — existing callers that `switch` on enum values continue to work
- legacyCode field provides round-trip from new mail.* code back to legacy enum value
- Only CONNECTION_FAILED and RATE_LIMIT are retryable (transient failures); auth/recipient errors are non-retryable
- baseDelayMs maps to the existing `retryDelay` option so subclass configuration is honored

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed OrbitSignalWebhook test mock missing hooks.doAction**
- **Found during:** Task 2 (shutdown hook registration)
- **Issue:** OrbitSignalWebhook.test.ts created a mock PlanetCore without `hooks` property — when OrbitSignal.install() called `core.hooks.doAction(...)`, it threw "undefined is not an object"
- **Fix:** Added `hooks: { doAction: mock(() => {}) }` and `logger.warn` to the existing webhook test mock
- **Files modified:** packages/signal/tests/OrbitSignalWebhook.test.ts
- **Verification:** `bun test tests/OrbitSignalWebhook.test.ts` → 1 pass, 0 fail
- **Committed in:** f4f726d3 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - pre-existing test mock incompatible with new shutdown hook)
**Impact on plan:** Necessary fix for test correctness. No scope creep.

## Issues Encountered

- TypeScript strict typing on `Set` with literal types required `Set<string>` annotation for `RETRYABLE_CODES.has(newCode)` call — fixed immediately

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Signal migration complete and validated — pattern confirmed for Phase 18 Plan 04 (atlas migration)
- atlas is highest blast-radius package; signal pattern serves as the validated template
- `@gravito/resilience` dependency is now proven working in an orbit package (signal as pilot)

---
*Phase: 18-foundation-orbit-migration*
*Completed: 2026-03-28*
