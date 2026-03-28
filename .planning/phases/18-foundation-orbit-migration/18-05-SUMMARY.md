---
phase: 18-foundation-orbit-migration
plan: "05"
subsystem: atlas
tags: [error-model, resilience, shutdown, DatabaseException, withResilience]
dependency_graph:
  requires: [18-01]
  provides: [atlas-DatabaseException-hierarchy, atlas-shutdown-hook, atlas-resilience-policy]
  affects: [packages/atlas]
tech_stack:
  added: ["@gravito/resilience workspace:*"]
  patterns: [DatabaseException hierarchy, withResilience, shutdown hooks with deadline]
key_files:
  created:
    - packages/atlas/src/resilience.ts
    - packages/atlas/tests/contract/atlas-errors.contract.test.ts
    - packages/atlas/tests/contract/atlas-shutdown.contract.test.ts
    - packages/atlas/tests/contract/atlas-resilience.contract.test.ts
  modified:
    - packages/atlas/src/errors/index.ts
    - packages/atlas/src/errors/codes.ts
    - packages/atlas/src/orm/model/errors.ts
    - packages/atlas/src/OrbitAtlas.ts
    - packages/atlas/src/connection/ConnectionManager.ts
    - packages/atlas/src/DB.ts
    - packages/atlas/package.json
    - packages/atlas/tests/OrbitAtlas.test.ts
decisions:
  - "DatabaseError accepts retryable and code parameters to allow ConnectionError to set retryable:true and code:db.connection_failed while preserving instanceof DatabaseError"
  - "transactionWithRetry fixed to prefer originalError.code (driver-level) over GravitoException code to detect 40P01/ER_LOCK_DEADLOCK"
  - "withResilience wired in ConnectionManager.reconnect() — the async connection re-establishment path"
metrics:
  duration: "8 minutes"
  completed: "2026-03-28T14:33:41Z"
  tasks: 3
  files_modified: 11
---

# Phase 18 Plan 05: Atlas Error Migration and Resilience Wiring Summary

**One-liner:** Atlas migrated to DatabaseException hierarchy (12 error classes), shutdown hook with 5s deadline, and withResilience wired at connection-reconnect level per INTG-01/D-06.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate atlas errors/index.ts to DatabaseException hierarchy | a754fb44 | errors/index.ts, DB.ts, atlas-errors.contract.test.ts |
| 2 | Migrate ORM model errors + add atlas shutdown handler | d198140e | orm/model/errors.ts, codes.ts, OrbitAtlas.ts, package.json, atlas-shutdown.contract.test.ts |
| 3 | Wire withResilience at atlas connection level | 01875d0a | resilience.ts, ConnectionManager.ts, atlas-resilience.contract.test.ts |

## Verification Results

```
cd packages/atlas && bun test  =>  1027 pass, 0 fail (100 files)
bun run typecheck (monorepo)   =>  84 tasks successful, 84 total (clean)
grep 'extends DatabaseException' packages/atlas/src/errors/index.ts  =>  MATCH
grep 'extends DatabaseException' packages/atlas/src/orm/model/errors.ts  =>  5 MATCHES
grep 'DB.shutdown()' packages/atlas/src/OrbitAtlas.ts  =>  MATCH
grep 'Promise.race' packages/atlas/src/OrbitAtlas.ts  =>  MATCH
grep 'withResilience' packages/atlas/src/connection/ConnectionManager.ts  =>  MATCH
```

## Key Changes

### Task 1: Atlas Error Hierarchy (errors/index.ts)

All 7 classes in `errors/index.ts` now extend `DatabaseException`:

- `DatabaseError` — code `db.query_failed`, status 503, retryable:false (by default)
  - Added optional `retryable` and `code` parameters to allow subclass customization
- `ConstraintViolationError` — extends DatabaseError
- `UniqueConstraintError`, `ForeignKeyConstraintError`, `NotNullConstraintError` — extend ConstraintViolationError
- `TableNotFoundError` — extends DatabaseError
- `ConnectionError` — extends DatabaseError with retryable:true, code:db.connection_failed

All constructors have `Object.setPrototypeOf(this, new.target.prototype)` for ESM/CJS instanceof compat.

### Task 2: ORM Model Errors + Shutdown

All 5 ORM model errors now extend `DatabaseException` (with domain-appropriate status codes):
- `ColumnNotFoundError` (400), `TypeMismatchError` (400), `NullableConstraintError` (400)
- `ModelNotFoundError` (404)
- `StaleModelError` (409, retryable:true — optimistic lock = retry with fresh data)

`OrmErrorCodes` added to `errors/codes.ts` with `db.column_not_found`, `db.type_mismatch`, etc.

`OrbitAtlas.install()` now registers `core:shutdown` hook with 5s deadline calling `DB.shutdown()`.

### Task 3: Resilience Wiring

- `packages/atlas/src/resilience.ts` — `atlasResiliencePolicy` constant: retry 3x, CB 5 failures/30s reset, 5s timeout
- `ConnectionManager.reconnect()` — wrapped with `withResilience(atlasResiliencePolicy)` at connection level
- D-06 honored: `transactionWithRetry` in DB.ts is NOT wrapped with `withResilience`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed transactionWithRetry driver code detection after migration**
- **Found during:** Task 1
- **Issue:** `transactionWithRetry` checked `dbError.code || dbError.originalError?.code` — but after migration, `DatabaseError.code` is now `'db.query_failed'` (truthy GravitoException code), shadowing the driver-level `originalError.code` (e.g., `'40P01'`, `'ER_LOCK_DEADLOCK'`)
- **Fix:** Changed precedence to `originalError.code ?? dbError.code` — driver-level code takes priority for deadlock detection
- **Files modified:** `packages/atlas/src/DB.ts`
- **Commit:** a754fb44

**2. [Rule 1 - Bug] Fixed existing OrbitAtlas test missing hooks mock**
- **Found during:** Task 2
- **Issue:** `tests/OrbitAtlas.test.ts` test 'should install and configure DB' used a mockCore without `hooks` — after adding `core.hooks.doAction(...)` to OrbitAtlas.install(), the test threw "Cannot read properties of undefined (reading 'doAction')"
- **Fix:** Added `hooks: { doAction: mock() }` to the mockCore in the test
- **Files modified:** `packages/atlas/tests/OrbitAtlas.test.ts`
- **Commit:** d198140e

## Known Stubs

None — all functionality is fully wired. The resilience policy is applied in `ConnectionManager.reconnect()` which is the async reconnection path. Initial connection establishment remains lazy (driver-level, triggered on first query).

## Self-Check: PASSED

All files exist and all 3 commits found:
- a754fb44 — Task 1: errors/index.ts migration
- d198140e — Task 2: ORM model errors + shutdown
- 01875d0a — Task 3: withResilience wiring
