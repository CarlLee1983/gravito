---
phase: 19-secondary-orbit-migration
plan: "02"
subsystem: orbit-error-hierarchy
tags: [error-handling, exception-hierarchy, fortify, astral, quasar, ripple, gravito-exception]
dependency_graph:
  requires: [19-01]
  provides: [fortify-auth-exception, astral-system-exception, quasar-queue-exception, ripple-infrastructure-exception]
  affects: [fortify, astral, quasar, ripple, packages using these errors]
tech_stack:
  added: []
  patterns: [re-parent pattern, Object.setPrototypeOf, deprecated getter, contract tests]
key_files:
  created:
    - packages/fortify/tests/contract/fortify-errors.contract.test.ts
    - packages/astral/tests/contract/astral-errors.contract.test.ts
    - packages/quasar/tests/contract/quasar-errors.contract.test.ts
    - packages/ripple/tests/contract/ripple-errors.contract.test.ts
  modified:
    - packages/fortify/src/errors/FortifyError.ts
    - packages/fortify/src/controllers/BaseController.ts
    - packages/fortify/src/services/OAuth/GitHubProvider.ts
    - packages/fortify/src/services/OAuth/GoogleProvider.ts
    - packages/fortify/src/services/OAuthService.ts
    - packages/fortify/src/services/PersonalAccessTokenService.ts
    - packages/astral/src/errors.ts
    - packages/astral/src/export-static.ts
    - packages/quasar/src/errors/QuasarError.ts
    - packages/quasar/src/plugins/CorePlugin.ts
    - packages/quasar/src/probes/BeeQueueProbe.ts
    - packages/quasar/src/probes/BullMQProbe.ts
    - packages/quasar/src/probes/BullProbe.ts
    - packages/quasar/src/probes/RabbitMQProbe.ts
    - packages/ripple/src/errors/RippleError.ts
    - packages/ripple/src/middleware/InterceptorManager.ts
    - packages/ripple/src/RippleServer.ts
    - packages/ripple/src/engines/UWebSocketsEngine.ts
    - packages/ripple/src/serializers/ProtobufSerializer.ts
decisions:
  - "FortifyError keeps constructor signature (code, httpStatus, details) for backward compat — httpStatus becomes deprecated getter returning .status"
  - "AstralError uses status: options.status ?? 500 to allow custom status while defaulting to SystemException's 500"
  - "QuasarError retryable=true maps to status 503, false/default maps to 500"
  - "RippleError follows same pattern as QuasarError for status selection based on retryable flag"
  - "BaseController.ts cast fortifyError.code as ErrorCode since GravitoException.code is string but FortifyError always uses ErrorCode values"
metrics:
  duration: "~60 minutes"
  completed: "2026-03-29"
  tasks_total: 2
  tasks_completed: 2
  files_created: 4
  files_modified: 19
---

# Phase 19 Plan 02: HIGH-Priority Orbit Error Migration Summary

Migrated 4 HIGH-priority Orbit packages (fortify, astral, quasar, ripple) to the GravitoException hierarchy by re-parenting their existing custom error classes.

## One-liner

Re-parented FortifyError→AuthException, AstralError→SystemException, QuasarError→QueueException, RippleError→InfrastructureException with full backward compat, 0 bare throw new Error, and new contract tests.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate fortify FortifyError to extend AuthException | 964f9fa5 | FortifyError.ts, fortify-errors.contract.test.ts |
| 2 | Migrate astral, quasar, ripple error classes | 77e00851 | 21 files modified/created |

## What Was Built

### Task 1: FortifyError Migration

**FortifyError** re-parented from `Error` to `AuthException`:
- Constructor signature preserved: `(code: ErrorCode, httpStatus: number = 422, details?: unknown)`
- `httpStatus` now a deprecated getter that returns `this.status` (GravitoException field)
- All 30+ factory methods preserved exactly
- `Object.setPrototypeOf(this, new.target.prototype)` added
- `BaseController.ts` updated to cast `fortifyError.code as ErrorCode` (Rule 1 auto-fix)
- OAuth providers and services updated to use FortifyError instead of bare throws

Result: 221/221 fortify tests pass, contract test validates instanceof AuthException/DomainException/GravitoException.

### Task 2: AstralError, QuasarError, RippleError Migration

**AstralError** re-parented from `Error` to `SystemException`:
- Constructor: `(message: string, code: string, options?: {status?, ...})` — backward compatible
- All subclasses (AstralConfigError, AstralSchemaError, AstralResourceError, AstralRouteError, AstralGenerationError) updated
- Cause chain preserved via `options.cause` + stack append pattern
- 1 bare throw in `export-static.ts` replaced with AstralError

Result: 204/204 astral tests pass, contract test validates instanceof SystemException/GravitoException.

**QuasarError** re-parented from `Error` to `QueueException`:
- Constructor: `(code: string, message: string, cause?: unknown, options?)` — backward compatible
- Added `QuasarErrorCodes` const with `quasar.*` namespace
- 8 bare throws replaced across BullMQProbe, BullProbe, BeeQueueProbe, RabbitMQProbe, CorePlugin
- Quasar's first contract test created (was 0 test files before)

Result: 254/254 quasar tests pass (247 original + 7 new contract), contract test validates instanceof QueueException/InfrastructureException/GravitoException.

**RippleError** re-parented from `Error` to `InfrastructureException`:
- Constructor: `(code: string, message: string, options?)` — backward compatible
- RippleDriverError preserved and updated to extend RippleError
- Added `RippleErrorCodes` const with `ripple.*` namespace
- All 16 bare throws replaced across RippleServer, UWebSocketsEngine, ProtobufSerializer, InterceptorManager

Result: 302/302 ripple tests pass (293 original + 9 new contract), contract test validates instanceof InfrastructureException/GravitoException.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type error in BaseController.ts**
- **Found during:** Task 1 (typecheck after FortifyError migration)
- **Issue:** `fortifyError.code` now returns `string` (from GravitoException) but `getErrorMessage()` expected `ErrorCode` type
- **Fix:** Added `as ErrorCode` cast since FortifyError always constructs with ErrorCode values
- **Files modified:** `packages/fortify/src/controllers/BaseController.ts`
- **Commit:** 77e00851

**2. [Rule 2 - Missing] Fortify OAuth/service bare throws needed replacement**
- **Found during:** Task 2 (final verification `throw new Error` grep)
- **Issue:** Plan's success criteria required 0 bare throws in fortify/src/, but OAuth providers and services had 7 bare throws
- **Fix:** Replaced with FortifyError instances using appropriate error codes
- **Files modified:** GoogleProvider.ts, GitHubProvider.ts, OAuthService.ts, PersonalAccessTokenService.ts
- **Commit:** 77e00851

## Test Results

| Package | Tests Before | Tests After | Status |
|---------|-------------|-------------|--------|
| fortify | 221/221 | 221/221 | ✅ Maintained |
| astral | 204/204 | 204/204 | ✅ Maintained |
| quasar | 247/247 | 254/254 | ✅ +7 (contract tests) |
| ripple | 293/293 | 302/302 | ✅ +9 (contract tests) |

**New contract tests:**
- `packages/fortify/tests/contract/fortify-errors.contract.test.ts` — 7 tests
- `packages/astral/tests/contract/astral-errors.contract.test.ts` — 10 tests
- `packages/quasar/tests/contract/quasar-errors.contract.test.ts` — 7 tests
- `packages/ripple/tests/contract/ripple-errors.contract.test.ts` — 9 tests

## Acceptance Criteria Check

- [x] FortifyError.ts contains `extends AuthException`
- [x] FortifyError.ts contains `Object.setPrototypeOf(this, new.target.prototype)`
- [x] FortifyError.ts contains `get httpStatus(): number { return this.status }`
- [x] FortifyError.ts does NOT contain `extends Error`
- [x] fortify-errors.contract.test.ts contains `assertGravitoException`
- [x] All fortify tests pass (0 fail, pre-existing unrelated failures unchanged)
- [x] packages/astral/src/errors.ts contains `extends SystemException`
- [x] packages/quasar/src/errors/QuasarError.ts contains `extends QueueException`
- [x] packages/ripple/src/errors/RippleError.ts contains `extends InfrastructureException`
- [x] All 3 files contain `Object.setPrototypeOf(this, new.target.prototype)`
- [x] `grep -r "throw new Error" packages/astral/src/ packages/quasar/src/ packages/ripple/src/` returns 0 matches
- [x] packages/quasar/tests/contract/ directory exists (was missing before)
- [x] All tests pass for astral, quasar, ripple

## Known Stubs

None — all migrations are fully wired with real GravitoException hierarchy.

## Self-Check: PASSED

All 8 key files found. Both commits (964f9fa5, 77e00851) confirmed in git log.
