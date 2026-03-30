---
phase: 26-documentation-and-tooling
plan: "04"
subsystem: packages/core
tags: [documentation, jsdoc, readme, api-correctness, english-only]
dependency_graph:
  requires: []
  provides: [DOC-04, DOC-05, DOC-06, DOC-07]
  affects: [packages/core/README.md, packages/core/src/HookManager.ts, packages/core/src/GravitoServer.ts]
tech_stack:
  added: []
  patterns: [jsdoc-english-only, api-correctness]
key_files:
  modified:
    - packages/core/README.md
    - packages/core/src/HookManager.ts
    - packages/core/src/GravitoServer.ts
decisions:
  - "Translate all JSDoc @example inline comments within /** */ blocks even though they use // syntax, because they are part of the JSDoc block content"
  - "nebula-s3 typecheck failure is pre-existing and out of scope for this plan"
metrics:
  duration: 3 min
  completed: "2026-03-30"
  tasks_completed: 2
  files_modified: 3
---

# Phase 26 Plan 04: README API Fixes and JSDoc Unification Summary

Correct README API documentation for EventManager and HookManager, add orbit/register/use decision guide, and translate all Chinese JSDoc blocks in core/src to English.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix README EventManager/HookManager sections and add orbit/register/use guide | 6e615457 | packages/core/README.md |
| 2 | Translate Chinese JSDoc blocks to English in core/src | b98860a9 | packages/core/src/HookManager.ts, packages/core/src/GravitoServer.ts |

## What Was Done

### Task 1: README API Documentation Fixes (DOC-04, DOC-05, DOC-06)

**DOC-04 — EventManager API sync:**
- Replaced `emit(event, ...args)` / `on(event, callback)` / `off(event, callback)` with actual API: `dispatch(event)` / `listen(event, listener, options?)` / `unlisten(event, listener)` / `clear()` / `getListeners(event?)`
- Removed incorrect Quick Start section "5. Reliability & Distributed Retries" which referenced non-existent `core.hooks.setRetryScheduler()` — this method lives on `EventPriorityQueue` (internal), not on `HookManager`

**DOC-05 — HookManager setRetryScheduler removal:**
- Removed the entire "Reliability & Distributed Retries" subsection with `RetryScheduler` import and `setRetryScheduler()` call
- Updated HookManager API reference to include all actual public methods: `doActionSync`, `doActionAsync` (previously missing)

**DOC-06 — orbit/register/use decision guide:**
- Added new section `## When to use orbit() vs register() vs use()` at the end of the API Reference
- Each method documented with: purpose, typical use case, TypeScript code example
- Decision tree provided with three clear rules

### Task 2: JSDoc English Unification (DOC-07)

**HookManager.ts — 5 JSDoc blocks translated:**
- Class-level JSDoc: facade description with component list (FilterManager, ActionManager, AsyncDetector, MigrationWarner)
- `doAction()` JSDoc: dispatch mode note explaining polymorphic override behavior
- `dispatchQueued()` JSDoc: distributed processing description, @template/@param/@returns/@throws annotations
- `dispatchDeferredQueued()` JSDoc: deferred dispatch description, inline `@example` comment translated
- `getEventStatus()` JSDoc: query description and @param/@returns/@throws annotations

**GravitoServer.ts — 2 JSDoc blocks translated:**
- Class-level JSDoc: "Gravito core boot engine (decoupled)"
- `create()` JSDoc: method description and @param descriptions for manifest, resolvers, baseOrbits

## Verification Results

| Check | Result |
|-------|--------|
| `grep 'setRetryScheduler' packages/core/README.md` | 0 matches ✅ |
| `grep 'emit\b' packages/core/README.md` (EventManager section) | 0 matches ✅ |
| README contains `dispatch`, `listen`, `unlisten` | ✅ |
| README contains `addFilter`, `applyFilters`, `addAction`, `doAction` | ✅ |
| README has "When to use orbit" section | ✅ |
| Chinese in HookManager.ts JSDoc blocks | 0 ✅ |
| Chinese in GravitoServer.ts JSDoc blocks | 0 ✅ |
| `packages/core` typecheck | 0 errors ✅ |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] Translated @example inline comments inside JSDoc blocks**
- **Found during:** Task 2
- **Issue:** The plan scope mentioned JSDoc `/** */` blocks. The `dispatchDeferredQueued()` method had a `// 延遲 5 秒後處理` comment inside an `@example` code block within the JSDoc — technically within `/** */` scope
- **Fix:** Translated to `// Delay processing by 5 seconds`
- **Files modified:** packages/core/src/HookManager.ts

### Out-of-Scope Items

**Pre-existing nebula-s3 typecheck failure:**
- `@gravito/nebula-s3` has pre-existing TypeScript errors referencing `StorageException` and `InfrastructureExceptionOptions` that don't exist on `@gravito/core`
- This failure exists before our changes (confirmed via git stash test)
- Logged to deferred-items tracking — not fixed in this plan

## Known Stubs

None. All documented APIs match actual implementation.

## Self-Check: PASSED

- packages/core/README.md: exists ✅
- packages/core/src/HookManager.ts: exists ✅
- packages/core/src/GravitoServer.ts: exists ✅
- Commit 6e615457: exists ✅
- Commit b98860a9: exists ✅
