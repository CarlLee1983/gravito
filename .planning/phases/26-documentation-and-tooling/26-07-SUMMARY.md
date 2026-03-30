---
phase: 26-documentation-and-tooling
plan: "07"
subsystem: core
tags: [lint, noExplicitAny, noConsole, biome, gap-closure]
dependency_graph:
  requires: [26-06]
  provides: [DOC-01-closed, DOC-02-closed]
  affects: [packages/core]
tech_stack:
  added: []
  patterns: [biome-ignore suppression, generic identity function, NodeJS.ErrnoException]
key_files:
  created: []
  modified:
    - packages/core/src/index.browser.ts
    - packages/core/src/observability/QueueDashboard.ts
    - packages/core/src/reliability/DeadLetterQueueManager.ts
    - packages/core/src/helpers.ts
decisions:
  - defineConfig in browser barrel uses generic T extends Record<string,unknown> instead of any
  - DeadLetterQueueManager db param uses biome-ignore (no shared query-builder interface in core)
  - WorkerPool.config access uses biome-ignore (private property, no public accessor)
  - helpers.ts dump() uses biome-ignore (intentional developer stdout utility)
metrics:
  duration: "5m"
  completed: "2026-03-30"
  tasks: 2
  files: 4
---

# Phase 26 Plan 07: Final Lint Violations Gap Closure Summary

**One-liner:** Closed remaining 5 noExplicitAny + 1 noConsole violations in core/src via generics, ErrnoException cast, and biome-ignore suppressions — `biome lint packages/core/src/` now exits clean.

## What Was Done

Fixed the final 6 lint violations across 4 files to fully satisfy DOC-01 and DOC-02 requirements:

### Task 1: 5 noExplicitAny violations (3 files)

| File | Line | Fix Applied |
|------|------|-------------|
| `packages/core/src/index.browser.ts` | 111 | `defineConfig<T extends Record<string, unknown>>(config: T): T` — proper generic identity |
| `packages/core/src/observability/QueueDashboard.ts` | 201 | `biome-ignore` on private `WorkerPool.config` access — no public accessor exists |
| `packages/core/src/reliability/DeadLetterQueueManager.ts` | 111 | `biome-ignore` on injected `db: any` — no shared query-builder interface in core |
| `packages/core/src/reliability/DeadLetterQueueManager.ts` | 165 | `NodeJS.ErrnoException` cast instead of `as any` for `error.code` access |

### Task 2: 1 noConsole violation (1 file)

| File | Line | Fix Applied |
|------|------|-------------|
| `packages/core/src/helpers.ts` | 56 | `biome-ignore lint/suspicious/noConsole` on `console.dir` in `dump()` |

## Verification Results

```
bunx biome lint packages/core/src/ --diagnostic-level=error | grep -E 'noExplicitAny|noConsole'
# (no output — 0 violations)

bun run typecheck (core package)
# 0 errors
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | a0292385 | fix(26-07): resolve 5 noExplicitAny violations in core/src |
| Task 2 | 82423172 | fix(26-07): suppress noConsole in helpers.ts dump() utility |

## Deviations from Plan

None — plan executed exactly as written. The `biome-ignore` approach for `DeadLetterQueueManager.db` was used as directed by the plan's fallback option (simpler than the `query()` helper inline-type approach).

## Known Stubs

None.

## Self-Check: PASSED

- packages/core/src/index.browser.ts — contains `defineConfig<T extends Record<string, unknown>`
- packages/core/src/observability/QueueDashboard.ts — contains `biome-ignore lint/suspicious/noExplicitAny`
- packages/core/src/reliability/DeadLetterQueueManager.ts — contains `biome-ignore` and `NodeJS.ErrnoException`
- packages/core/src/helpers.ts — contains `biome-ignore lint/suspicious/noConsole`
- Commits a0292385 and 82423172 both exist
- `bunx biome lint packages/core/src/` exits with 0 noExplicitAny/noConsole violations
