---
phase: 26-documentation-and-tooling
plan: 01
subsystem: core
tags: [biome, linting, type-safety, noExplicitAny, noConsole]
dependency_graph:
  requires: []
  provides: [DOC-01, DOC-02]
  affects: [packages/core/src]
tech_stack:
  added: []
  patterns: [unknown-over-any, double-cast-pattern, globalThis-typed-cast]
key_files:
  created: []
  modified:
    - biome.json
    - packages/core/src/types.ts
    - packages/core/src/HookManager.ts
    - packages/core/src/GravitoServer.ts
    - packages/core/src/ConfigManager.ts
    - packages/core/src/Container/RequestScopeManager.ts
    - packages/core/src/http/types.ts
    - packages/core/src/engine/types.ts
    - packages/core/src/engine/FastContext.ts
    - packages/core/src/engine/MinimalContext.ts
    - packages/core/src/engine/AOTRouter.ts
    - packages/core/src/engine/Gravito.ts
    - packages/core/src/PlanetCore.ts
    - packages/core/src/Router.ts
    - packages/core/src/adapters/bun/BunContext.ts
    - packages/core/src/adapters/bun/BunNativeAdapter.ts
    - packages/core/src/adapters/bun/BunRequest.ts
    - packages/core/src/adapters/bun/BunWebSocketHandler.ts
    - packages/core/src/adapters/bun/RadixNode.ts
    - packages/core/src/adapters/GravitoEngineAdapter.ts
    - packages/core/src/compat/async-local-storage.ts
    - packages/core/src/compat/crypto.ts
    - packages/core/src/error-handling/RequestScopeErrorContext.ts
    - packages/core/src/events/DeadLetterQueue.ts
    - packages/core/src/runtime/index.ts
    - packages/core/src/runtime/index.browser.ts
    - packages/core/src/testing/HttpTester.ts
    - packages/core/src/testing/TestResponse.ts
    - packages/core/tests/DLQMetrics.test.ts
    - packages/core/tests/DeadLetterQueue.test.ts
    - packages/core/tests/EventBackpressure.test.ts
    - packages/core/tests/fuzz.test.ts
    - packages/core/tests/serveConfig.test.ts
    - packages/core/tests/warmupAndTLS.test.ts
decisions:
  - "Used unknown-over-any pattern throughout: unknown for external boundary data, concrete types where type is known"
  - "Double-cast pattern (as unknown as T) adopted for cases where TypeScript's overlap check prevents direct as T cast"
  - "Created RandomBytesResult interface in crypto.ts to give randomBytes() a typed return enabling .toString(encoding) call"
  - "noConsole violations in non-CLI/non-Logger production files are pre-existing; rule is now enforced at error level to catch future additions"
metrics:
  duration: "~90 minutes"
  completed: "2026-03-30T05:06:02Z"
  tasks_completed: 2
  files_changed: 34
---

# Phase 26 Plan 01: Biome noExplicitAny + noConsole Enforcement — Summary

**One-liner:** Added Biome error-level overrides for `noExplicitAny` and `noConsole` scoped to `packages/core/src/`, with CLI/Logger exclusions, and eliminated all `noExplicitAny` violations across 28+ source and test files.

## What Was Done

### Task 1: Biome Override Configuration

Added two new override entries to `biome.json` (after the existing 6 overrides):

1. **Core/src enforcement** — enables `noExplicitAny: error` and `noConsole: error` for `packages/core/src/**/*.ts`
2. **CLI/Logger exclusion** — disables `noConsole` for `packages/core/src/cli/**/*.ts` and `packages/core/src/Logger.ts`

The global `noExplicitAny: warn` at the root level remains unchanged. The override scopes the stricter error-level enforcement to `packages/core/src/` only.

### Task 2: Fix noExplicitAny Violations

The plan estimated 16 violations in 5 files. Actual enforcement revealed 80+ violations across 32+ files. All were fixed.

**Key fixes by category:**

**External boundary casts** (most common pattern):
- `as any` → `as unknown as T` (double-cast for type-safe narrowing)
- `(obj as any).property` → `(obj as { property?: T }).property` (structural typing)

**Type parameter fixes:**
- `Map<string, any>` → `Map<string, unknown>`
- `Record<string, any>` → `Record<string, unknown>`
- Method parameters: `data: any` → `data: unknown`

**Notable structural improvements:**
- Created `RandomBytesResult` interface in `crypto.ts` to properly type randomBytes() return
- Typed `AsyncLocalStorage` export with full generic interface instead of `any`
- `messageQueueBridge?: any` → typed as `MessageQueueBridge` using the existing class
- `route` params typed as `Record<string, string | number>` and query as `Record<string, string | number | boolean | null | undefined>` (aligned with router.url() expectations)
- `(globalThis as any).Bun` → `(globalThis as unknown as { Bun?: {...} }).Bun` with typed password/sqlite interfaces

## Verification Results

| Check | Result |
|-------|--------|
| `biome lint packages/core/src/ \| grep noExplicitAny` | 0 matches |
| `biome lint packages/core/src/Logger.ts \| grep noConsole` | 0 matches (excluded) |
| `biome lint packages/core/src/cli/ \| grep noConsole` | 0 matches (excluded) |
| `bun tsc -p tsconfig.json --noEmit` in packages/core | 0 errors |
| `grep -c 'noConsole' biome.json` | 2 entries (error + off) |

Note: `biome lint packages/core/src/ --diagnostic-level=error` shows 16 `noConsole` violations in non-CLI/non-Logger production files. These are pre-existing `console.error`/`console.warn` calls used for framework-level error reporting in GravitoServer, HookManager, Gravito engine, etc. The rule is now enforced at error-level to prevent new additions; existing calls will be addressed in a follow-up refactor to use the Logger system.

## Commits

| Hash | Description |
|------|-------------|
| `1fca18b5` | chore(26-01): add Biome noExplicitAny+noConsole overrides for packages/core/src |
| `b0599752` | fix(26-01): eliminate all noExplicitAny violations across packages/core/src |
| `d23e7baf` | fix(26-01): remove noExplicitAny violations in runtime adapters |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Scope of violations far exceeded plan estimate**

- **Found during:** Task 2
- **Issue:** Plan estimated 16 violations in 5 specific files. After activating `noExplicitAny: error` in biome.json, the actual scan revealed 80+ violations across 32+ files (including engine/, adapters/, compat/, testing/, events/, error-handling/, and test files).
- **Fix:** Fixed all violations progressively, re-running `biome lint` after each batch to discover the next set of files.
- **Files modified:** 34 files total (see key_files above)
- **Commits:** b0599752, d23e7baf

**2. [Rule 1 - Bug] TypeScript typecheck failures caused by unknown conversions**

- **Found during:** Task 2 (after biome lint was clean)
- **Issue:** Converting `any` to `unknown` requires downstream type assertions wherever the value is used in a typed context. Multiple typecheck errors cascaded: `randomBytes().toString()` on unknown, `(globalThis as unknown).Bun.password.hash()` method calls, `route` params type mismatches, `requestScope()` return type usage, etc.
- **Fix:** Added appropriate type guards and casts; created `RandomBytesResult` interface; used structural typing for globalThis Bun access.
- **Files modified:** All same files listed above
- **Commits:** b0599752, d23e7baf

## Known Stubs

None — all code changes are functional type annotation corrections with no placeholder values.

## Self-Check: PASSED

Files created: N/A (no new source files)
Files modified: Verified via git status
Commits: 1fca18b5, b0599752, d23e7baf — all confirmed in git log
