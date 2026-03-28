---
phase: 18-foundation-orbit-migration
plan: "02"
subsystem: plasma
tags: [error-model, resilience, redis, plasma, circuit-breaker, shutdown]
dependency_graph:
  requires: [18-01]
  provides: [plasma-error-model, plasma-resilience-wiring, plasma-shutdown-deadline]
  affects: [packages/plasma]
tech_stack:
  added: ["@gravito/resilience workspace:*"]
  patterns: [CacheException-hierarchy, withResilience-CB-only, Promise.race-deadline]
key_files:
  created:
    - packages/plasma/tests/contract/plasma-errors.contract.test.ts
    - packages/plasma/tests/contract/plasma-shutdown.contract.test.ts
  modified:
    - packages/plasma/src/errors.ts
    - packages/plasma/src/clients/BunRedisClient.ts
    - packages/plasma/src/OrbitPlasma.ts
    - packages/plasma/package.json
    - packages/plasma/tests/error-handling.integration.test.ts
decisions:
  - "RedisError extends CacheException (not Error) with redis.* error codes"
  - "CB-only policy for plasma (D-04): no retry, failureThreshold=3, resetTimeout=15s, timeout=2s"
  - "retryWithBackoff deleted entirely, no dual retry paths (D-05)"
  - "maxRetries=0 in buildClientOptions to disable Bun native retry"
  - "Shutdown deadline 3s via Promise.race (D-09)"
metrics:
  duration: "~8 minutes"
  completed: "2026-03-28"
  tasks: 2
  files_modified: 6
  files_created: 2
requirements: [INTG-02, INTG-03]
---

# Phase 18 Plan 02: Plasma Error Model + Resilience Wiring Summary

**One-liner:** RedisError extends CacheException with redis.* codes, withResilience CB-only (threshold=3, reset=15s), retryWithBackoff deleted, 3s shutdown deadline via Promise.race.

## What Was Built

### Task 1: Migrate RedisError to CacheException

- `RedisError extends CacheException` (previously extended bare `Error`)
- Constructor signature updated: `(message, code?, command?, originalError?)`
- Retryable flag: `CONNECTION_FAILED` and `CONNECTION_TIMEOUT` are retryable; others are not
- Factory methods added: `connectionFailed()`, `commandFailed()`, `timeout()`
- `Object.setPrototypeOf` for correct `instanceof` across ESM/CJS boundaries
- `BunRedisClient.handleException` updated to pass `CacheErrorCodes.COMMAND_FAILED`
- 6 contract tests verify: hierarchy (instanceof chain), retryability, cause preservation, command field, name field

### Task 2: Wire CB Policy + Shutdown Deadline + Remove retryWithBackoff

- Added `@gravito/resilience: workspace:*` to plasma dependencies
- Module-level `plasmaPolicy` constant: CB-only (name=`plasma-redis`, failureThreshold=3, resetTimeout=15s, timeout=2s)
- `connect()` now calls `withResilience(fn, plasmaPolicy)` instead of `retryWithBackoff(fn)`
- `retryWithBackoff` private method deleted entirely
- `maxRetries: 0` in `buildClientOptions()` to eliminate Bun's internal retry path
- Shutdown hook enhanced with `Promise.race([this.disconnect(), deadline])` where DEADLINE_MS=3000
- Warning logged on deadline exceeded: `[OrbitPlasma] Forced shutdown: Error: [OrbitPlasma] Shutdown deadline exceeded (3s)`
- 3 contract tests: fast shutdown (no warning), deadline exceeded (warning logged, ~300ms), hook registration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @gravito/resilience dist not present — built package**
- **Found during:** Task 2 execution (integration tests failing)
- **Issue:** `Cannot find module '@gravito/resilience'` because resilience package `dist/` was not built (workspace symlink points to source directory)
- **Fix:** Ran `bun run build` in `packages/resilience` to generate `dist/index.js` and `dist/index.cjs`
- **Files modified:** `packages/resilience/dist/*` (generated, not committed — build output)
- **Note:** This is expected in local dev when resilience was recently committed; CI runs full monorepo build

**2. [Rule 1 - Bug] Integration tests testing removed retryWithBackoff behavior**
- **Found during:** Task 2 — `bun test` showed 2 integration test failures
- **Issue:** `error-handling.integration.test.ts` had `should retry connection with backoff` and `should unref backoff timer during retries` tests that specifically tested `retryWithBackoff` logic which was intentionally deleted
- **Fix:** Removed the 2 obsolete tests and replaced with 1 test verifying the new `withResilience`-based error wrapping behavior
- **Files modified:** `packages/plasma/tests/error-handling.integration.test.ts`
- **Commit:** 0ff09b72 (included in Task 2 commit)

## Test Results

| Suite | Tests | Status |
|-------|-------|--------|
| `plasma-errors.contract.test.ts` | 6 | PASS |
| `plasma-shutdown.contract.test.ts` | 3 | PASS |
| All plasma tests | 79 | PASS |
| Plasma typecheck | 0 errors | PASS |
| Monorepo typecheck | 84 tasks | PASS |

## Key Links Verified

| From | To | Via | Present |
|------|----|-----|---------|
| `packages/plasma/src/errors.ts` | `CacheException` in core | `extends CacheException` | YES |
| `packages/plasma/src/clients/BunRedisClient.ts` | `@gravito/resilience` | `import { withResilience` | YES |
| `packages/plasma/src/OrbitPlasma.ts` | core shutdown hook | `Promise.race` | YES |

## Commits

- `5d9d2c57` — Task 1: migrate RedisError to extend CacheException + contract tests
- `0ff09b72` — Task 2: wire plasma CB policy, remove retryWithBackoff, add shutdown deadline

## Known Stubs

None — all functionality is fully wired.

## Self-Check: PASSED

- packages/plasma/src/errors.ts: FOUND
- packages/plasma/src/clients/BunRedisClient.ts: FOUND
- packages/plasma/src/OrbitPlasma.ts: FOUND
- packages/plasma/tests/contract/plasma-errors.contract.test.ts: FOUND
- packages/plasma/tests/contract/plasma-shutdown.contract.test.ts: FOUND
- Commit 5d9d2c57: FOUND
- Commit 0ff09b72: FOUND
