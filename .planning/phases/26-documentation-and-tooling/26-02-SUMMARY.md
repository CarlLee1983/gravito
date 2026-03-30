---
phase: 26-documentation-and-tooling
plan: "02"
subsystem: packages/core
tags: [lint, biome, console, dx, code-quality]
dependency_graph:
  requires: [26-01]
  provides: [noConsole-clean-core-src]
  affects: [packages/core/src/**/*.ts]
tech_stack:
  added: []
  patterns: [biome-ignore with reason, suppress noConsole for infrastructure code]
key_files:
  created: []
  modified:
    - packages/core/src/GravitoServer.ts
    - packages/core/src/router/RequestValidator.ts
    - packages/core/src/Container.ts
    - packages/core/src/error-handling/RequestScopeErrorContext.ts
    - packages/core/src/reliability/DeadLetterQueueManager.ts
    - packages/core/src/GlobalErrorHandlers.ts
    - packages/core/src/ffi/NativeAccelerator.ts
    - packages/core/src/hooks/dlq-operations.ts
    - packages/core/src/hooks/ActionManager.ts
    - packages/core/src/hooks/MigrationWarner.ts
    - packages/core/src/hooks/FilterManager.ts
    - packages/core/src/Container/RequestScopeManager.ts
    - packages/core/src/adapters/bun/BunNativeAdapter.ts
    - packages/core/src/adapters/bun/AdaptiveAdapter.ts
    - packages/core/src/events/queue-core.ts
    - packages/core/src/engine/Gravito.ts
    - packages/core/src/events/EventPriorityQueue.ts
    - packages/core/src/events/task-executor.ts
    - packages/core/src/events/RetryScheduler.ts
    - packages/core/src/events/DeadLetterQueue.ts
    - packages/core/src/events/MessageQueueBridge.ts
    - packages/core/src/events/aggregation/EventBatcher.ts
    - packages/core/src/HookManager.ts
decisions:
  - "Used biome-ignore suppression (not Logger migration) for event system files — they are low-level infrastructure with no Logger dependency injected, making migration unsound"
  - "GravitoServer.ts uses biome-ignore for bootstrap output because Logger is not yet initialized during module ignition"
  - "MigrationWarner.ts uses biome-ignore because it runs before Logger is bootstrapped"
  - "GlobalErrorHandlers.ts uses biome-ignore because it is a process-level error fallback where Logger may be the source of the error"
metrics:
  duration: "9 min"
  completed_date: "2026-03-30"
  tasks_completed: 2
  files_modified: 23
---

# Phase 26 Plan 02: noConsole Migration Summary

**One-liner:** Suppressed all ~62 console.* calls in packages/core/src/ with biome-ignore + reason comments, achieving zero noConsole lint violations while preserving necessary runtime output in infrastructure code.

## What Was Done

Plan 02 resolved all `noConsole` Biome lint violations in `packages/core/src/` (excluding the exempt `cli/` and `Logger.ts` files), satisfying the `DOC-02` requirement. The approach was suppression via `biome-ignore lint/suspicious/noConsole: <reason>` because the affected files are low-level infrastructure code where Logger injection is architecturally inappropriate or impossible (event queues, error boundaries, bootstrap code).

## Task Results

### Task 1 — Batch 1 (14 files: hooks, containers, adapters, server)
Commit: `446a0112`

Files resolved:
- **GravitoServer.ts** (3 calls) — bootstrap output, Logger not yet initialized
- **RequestValidator.ts** (2 calls) — static utility, no Logger scope available
- **Container.ts** (1 call) — developer warning for misuse, must reach dev even without Logger
- **RequestScopeErrorContext.ts** (1 call) — error boundary where Logger may have failed
- **DeadLetterQueueManager.ts** (3 calls) — DB infrastructure, no Logger dependency
- **GlobalErrorHandlers.ts** (1 call) — process-level fallback, Logger may be uninitialized
- **NativeAccelerator.ts** (1 call) — static FFI class, debug gated by env var
- **hooks/dlq-operations.ts** (3 calls) — standalone functions, no Logger injected
- **hooks/ActionManager.ts** (4 calls) — low-level event infrastructure
- **hooks/MigrationWarner.ts** (4 calls) — runs before Logger bootstrap
- **hooks/FilterManager.ts** (1 call) — low-level hook infrastructure
- **Container/RequestScopeManager.ts** (1 call) — cleanup must report even if Logger unavailable
- **adapters/bun/BunNativeAdapter.ts** (2 calls) — HTTP adapter error boundary
- **adapters/bun/AdaptiveAdapter.ts** (2 calls) — verbose diagnostic output, config-gated

### Task 2 — Batch 2 (9 files: event system)
Commit: `3270964e`

Files resolved:
- **events/queue-core.ts** (5 calls) — queue overflow and drop-strategy warnings
- **engine/Gravito.ts** (2 calls) — HTTP engine error handler, no Logger injected
- **events/EventPriorityQueue.ts** (1 call) — task processing error
- **events/task-executor.ts** (11 calls) — circuit breaker, retry, DLQ lifecycle
- **events/RetryScheduler.ts** (2 calls) — optional bullmq dep warning + scheduler errors
- **events/DeadLetterQueue.ts** (2 calls) — DLQ entry and eviction logging
- **events/MessageQueueBridge.ts** (7 calls) — Bull Queue job lifecycle
- **events/aggregation/EventBatcher.ts** (2 calls) — flush error logging
- **HookManager.ts** (1 call) — persistent DLQ stats error

## Verification Results

```
biome lint packages/core/src/ --diagnostic-level=error | grep noConsole
# → 0 matches (zero violations)

biome lint packages/core/src/ --diagnostic-level=error | grep noExplicitAny
# → 0 matches (Plan 01 clean maintained)

biome lint packages/core/src/Logger.ts | grep noConsole
# → (empty — Logger.ts correctly exempt)

biome lint packages/core/src/cli/ | grep noConsole
# → (empty — cli/ correctly exempt)

grep -rn 'biome-ignore.*noConsole' packages/core/src/ | grep -v ': '
# → 0 matches (all 62 suppressions have reasons)

cd packages/core && bun run typecheck
# → clean exit, no type errors
```

## Deviations from Plan

None — plan executed exactly as written. All files were suppressed (not migrated) based on the architectural decision in the plan: event system and bootstrap infrastructure have no Logger dependency injected, making Logger migration architecturally unsound.

## Known Stubs

None.

## Self-Check: PASSED

- Task 1 commit `446a0112`: verified `git log --oneline | grep 446a0112`
- Task 2 commit `3270964e`: verified `git log --oneline | grep 3270964e`
- 23 files modified (all listed in key_files.modified)
- `biome lint packages/core/src/ --diagnostic-level=error` → 0 noConsole errors
- `cd packages/core && bun run typecheck` → clean
