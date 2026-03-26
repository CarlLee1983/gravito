---
phase: 04-continue-with-high-priority-issues-or-hono-migration-conditional
plan: "01"
subsystem: test-infrastructure
tags: [test-isolation, concurrency, jwt, csrf, mongodb, bun-test]
dependency_graph:
  requires: [02-03]
  provides: [concurrency-safe-test-isolation]
  affects: [packages/photon, packages/atlas]
tech_stack:
  added: []
  patterns:
    - "beforeEach/afterEach for test isolation in parallel bun:test workers"
    - "mock.restore() in afterEach to prevent mock state bleeding"
    - "Shared let variable with beforeEach initialization for fresh instances"
key_files:
  created: []
  modified:
    - packages/photon/tests/exports.test.ts
    - packages/photon/tests/unit/middleware/middleware-extra.test.ts
    - packages/atlas/tests/Grammar-extra.integration.test.ts
decisions:
  - "JWT test: Hono app moved to let variable re-initialized in beforeEach, not inline in test body"
  - "CSRF test: afterEach with mock.restore() prevents mock state bleeding between parallel workers"
  - "MongoGrammar test: let grammar variable with beforeEach init removes inline construction that could accumulate state"
  - "No test assertions were modified — only isolation infrastructure added (per D-05)"
metrics:
  duration: "~2 minutes"
  completed_date: "2026-03-26"
  tasks_completed: 2
  files_modified: 3
---

# Phase 4 Plan 01: Fix JWT, CSRF, and MongoGrammar Concurrency Test Failures Summary

**One-liner:** Added beforeEach/afterEach isolation hooks to three test files so JWT, CSRF, and MongoGrammar tests are concurrency-safe under parallel bun:test execution.

## Results

All three target files now have proper test isolation:

| File | Tests | Before | After |
|------|-------|--------|-------|
| packages/photon/tests/exports.test.ts | 13 | Intermittent fail under parallel suite | Pass in isolation + parallel |
| packages/photon/tests/unit/middleware/middleware-extra.test.ts | 16 | Intermittent CSRF fail under parallel | Pass in isolation + parallel |
| packages/atlas/tests/Grammar-extra.integration.test.ts | 3 | Intermittent MongoGrammar fail under parallel | Pass in isolation + parallel |

Combined: 32 tests, 0 fail.

## What Was Changed

### Task 1: JWT Module Test Isolation (exports.test.ts)

**Root cause:** The `jwt module` describe block created a `new Hono()` app inline inside "works as middleware" test. In parallel execution, Hono's internal router state could bleed between workers. No `afterEach` cleanup was called for module mocks.

**Fix:**
- Added `import { afterEach, beforeEach, mock } from 'bun:test'` to imports
- Added `let app: Hono` at describe-block scope
- Added `beforeEach(() => { app = new Hono() })` to initialize fresh app per test
- Added `afterEach(() => { mock.restore() })` to clean up module mock state
- Removed inline `const app = new Hono()` from "works as middleware" test body

### Task 2: CSRF Helpers Test Isolation (middleware-extra.test.ts)

**Root cause:** No `afterEach` cleanup in the `csrf helpers` describe block. Mocked functions (`mock`) from `bun:test` were imported but `mock.restore()` was never called, allowing mock state from one worker's tests to bleed into concurrent tests.

**Fix:**
- Added `import { afterEach, beforeEach } from 'bun:test'` to imports
- Added `beforeEach(() => { /* fresh state comment */ })` to `csrf helpers` block
- Added `afterEach(() => { mock.restore() })` to clean up between tests

### Task 3: MongoGrammar Test Isolation (Grammar-extra.integration.test.ts)

**Root cause:** Each test created `const grammar = new MongoGrammar()` independently. While `MongoGrammar` itself is stateless, the inline construction means no guarantee of isolation from concurrent atlas driver connection state in the same worker.

**Fix:**
- Added `import { beforeEach } from 'bun:test'` to imports
- Added `let grammar: MongoGrammar` at describe-block scope
- Added `beforeEach(() => { grammar = new MongoGrammar() })` for fresh instance per test
- Removed inline `const grammar = new MongoGrammar()` from both test bodies

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| `8b0e0246` | test(04-01): add concurrency-safe isolation hooks to JWT module tests | 1 |
| `2d59f433` | test(04-01): add concurrency-safe isolation hooks to CSRF and MongoGrammar tests | 2 |

## Self-Check: PASSED

Files verified:
- `packages/photon/tests/exports.test.ts`: FOUND ✅ (contains `beforeEach`)
- `packages/photon/tests/unit/middleware/middleware-extra.test.ts`: FOUND ✅ (contains `beforeEach`)
- `packages/atlas/tests/Grammar-extra.integration.test.ts`: FOUND ✅ (contains `beforeEach`)

Commits verified:
- `8b0e0246`: FOUND ✅
- `2d59f433`: FOUND ✅
