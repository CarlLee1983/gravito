---
phase: 28-fast-path-routing
verified: 2026-03-30T00:00:00Z
status: gaps_found
score: 3/4 success criteria verified
gaps:
  - truth: "serveConfig() snapshot semantics documented — calling use() after serveConfig() emits SystemException('FAST_PATH_MIDDLEWARE_DRIFT')"
    status: partial
    reason: "MiddlewareDriftException is thrown correctly at runtime and tests pass, but BunRouteOptions is not exported from @gravito/core main index — photon.ts import fails TypeScript strict typecheck. Also REQUIREMENTS.md still shows PERF-02 as unchecked '[ ]' after phase completion."
    artifacts:
      - path: "packages/photon/src/photon.ts"
        issue: "Imports 'BunRouteOptions' from '@gravito/core' but that symbol is not in the explicit export list of core/src/index.ts — tsc reports TS2724 error"
      - path: "packages/core/src/index.ts"
        issue: "Bun barrel export (lines 906-915) lists specific names but omits BunRouteOptions — must add 'type BunRouteOptions' to the export block"
      - path: ".planning/REQUIREMENTS.md"
        issue: "PERF-02 still shows '[ ]' (pending) despite implementation being complete — traceability table says 'Pending'"
    missing:
      - "Add 'type BunRouteOptions' to the explicit export block in packages/core/src/index.ts (lines 906-915)"
      - "Update REQUIREMENTS.md line 13 from '[ ] **PERF-02**' to '[x] **PERF-02**' and line 67 traceability row from 'Pending' to 'Complete'"
human_verification:
  - test: "Visual inspection of drift warning message clarity"
    expected: "Developer sees a clear, actionable error when calling use() after serveConfig()"
    why_human: "Message clarity and developer experience cannot be assessed programmatically"
---

# Phase 28: Fast-Path Routing Verification Report

**Phase Goal:** Developer can register fast-path routes that bypass DI context construction and lifecycle hooks, and can opt specific routes out of global middleware, with a security contract guaranteeing auth middleware still fires
**Verified:** 2026-03-30
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `photon.fast('GET', '/health', handler)` serves directly without DI context or lifecycle hooks | VERIFIED | FastPathRegistry bypasses `acquireContext()` in BunNativeAdapter.fetch() at line 331-334; 19 tests in photon-fast-path.test.ts all pass |
| 2 | Route with explicit opt-out flag bypasses the named global middleware — test asserts callback not invoked | VERIFIED | `excludeMiddleware` in BunRouteOptions filtered in `getCompiledMiddlewareChain()`; middleware-opt-out.test.ts 2 tests pass |
| 3 | Protected fast-path returns 401 (not 200) without valid credentials — CVE-2025-29927 class prevention | VERIFIED | security-fast-path.test.ts 2 tests pass: 401 without auth, 200 with valid token |
| 4 | `serveConfig()` snapshot: calling `use()` after `serveConfig()` emits `SystemException('FAST_PATH_MIDDLEWARE_DRIFT')` warning | PARTIAL | Runtime behavior correct (middleware-drift.test.ts 4 tests pass), but `BunRouteOptions` not exported from `@gravito/core` main index — photon.ts has TS2724 compile error; REQUIREMENTS.md PERF-02 not marked complete |

**Score:** 3/4 success criteria fully verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/adapters/bun/FastPathRegistry.ts` | Fast-path route registry with exact string matching | VERIFIED | 58 lines, fully substantive — register/match/getAll methods, Map<method, Map<path, handler>> |
| `packages/core/src/adapters/bun/BunNativeAdapter.ts` | Adapter with fast-path bypass, checkLock(), middleware filtering | VERIFIED | Fully wired: fastPathRegistry checked first in fetch(), checkLock() on all mutation methods, getCompiledMiddlewareChain filters by excludeMiddleware |
| `packages/photon/src/photon.ts` | photon.fast() proxy API and serveConfig() | VERIFIED (runtime) / PARTIAL (types) | FastPathProxy with 7 HTTP method shorthands fully wired; BunRouteOptions import fails tsc strict typecheck |
| `packages/core/src/exceptions/MiddlewareDriftException.ts` | Exception thrown on post-snapshot mutation | VERIFIED | Subclass of SystemException, exported from exceptions/index.ts |
| `packages/core/tests/security-fast-path.test.ts` | CVE-2025-29927 prevention test | VERIFIED | 2 tests: 401 without auth, middleware bypass confirmed |
| `packages/core/tests/middleware-drift.test.ts` | Snapshot lock verification | VERIFIED | 4 tests: route/middleware/fast-path throw after serveConfig(), silent in production |
| `packages/photon/tests/middleware-opt-out.test.ts` | Middleware exclusion test | VERIFIED | 2 tests: single and partial middleware opt-out |
| `packages/photon/tests/photon-fast-path.test.ts` | Fast-path API tests | VERIFIED | 19 tests: all HTTP methods, chaining, priority, raw Request |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `BunNativeAdapter.fetch()` | `FastPathRegistry.match()` | Line 331-334, before acquireContext() | WIRED | Fast-path checked first; DI context never acquired for fast routes |
| `Photon.fast` | `BunNativeAdapter.registerFastPath()` | `_buildFastProxy()` private method | WIRED | All 7 method shorthands delegate via register() |
| `Photon.serveConfig()` | `BunNativeAdapter.serveConfig!()` | Direct delegation line 200 | WIRED | Sets isSnapshotLocked, populates routes map with GET fast-paths |
| `BunNativeAdapter.checkLock()` | `MiddlewareDriftException` | Called in route/use/useGlobal/registerFastPath | WIRED | All mutation methods call checkLock() |
| `BunNativeAdapter.getCompiledMiddlewareChain()` | `RadixNode.options` | `match?.options` passed into chain builder | WIRED | excludeMiddleware filters by handler.name or .middlewareName |
| `packages/core/src/index.ts` | `BunRouteOptions` type | Missing from explicit export block | NOT_WIRED | tsc error TS2724 in photon.ts — BunRouteOptions not in named export list |

### Data-Flow Trace (Level 4)

Fast-path routes are infrastructure (no dynamic data rendering); data-flow trace not applicable.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| photon.fast() route serves without DI context | `bun test packages/photon/tests/photon-fast-path.test.ts` | 19 pass, 0 fail | PASS |
| 401 returned on unprotected fast-path | `bun test packages/core/tests/security-fast-path.test.ts` | 2 pass, 0 fail | PASS |
| MiddlewareDriftException thrown post-snapshot | `bun test packages/core/tests/middleware-drift.test.ts` | 4 pass, 0 fail | PASS |
| Middleware opt-out via excludeMiddleware | `bun test packages/photon/tests/middleware-opt-out.test.ts` | 2 pass, 0 fail | PASS |
| TypeScript strict typecheck — photon package | `bun tsc -p packages/photon/tsconfig.json --noEmit --skipLibCheck` | TS2724: BunRouteOptions not exported from @gravito/core | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PERF-01 | 28-01-PLAN.md | Fast-path routes bypass DI context and lifecycle hooks | SATISFIED | FastPathRegistry + photon.fast() fully wired; 46 tests pass; REQUIREMENTS.md marks PERF-01 as `[x]` |
| PERF-02 | 28-02-PLAN.md | Per-route middleware opt-out via typed flag at registration | SATISFIED (impl) / BLOCKED (types) | Implementation works at runtime; excludeMiddleware filtering verified; but BunRouteOptions export gap means strict compilation fails; REQUIREMENTS.md still shows PERF-02 as `[ ]` (pending) |

**Orphaned Requirements:** None — both PERF-01 and PERF-02 are claimed by plan frontmatter.

**REQUIREMENTS.md discrepancy:** Line 13 shows `[ ] **PERF-02**` and traceability row shows `Pending` — these were not updated after phase completion.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/photon/src/photon.ts` | 17 | `import { ..., type BunRouteOptions } from '@gravito/core'` — type not in core's named export list | Blocker | TypeScript strict typecheck fails with TS2724; any consumer of photon that runs tsc will see this error |
| `packages/photon/tests/performance-fast-path.bench.ts` | 37, 40, 55, 67, 73, 78, 132 | Implicit `any` type params and `Promise<Response>` assigned to `Promise<void>` | Warning | Test-only; does not affect runtime behavior but fails strict typecheck |
| `packages/photon/tests/middleware-opt-out.test.ts` | 10, 19, 20, 60 | Implicit `any` in test callbacks | Warning | Test-only; minor type safety issue |
| `.planning/REQUIREMENTS.md` | 13, 67 | PERF-02 marked `[ ]` Pending after implementation complete | Info | Traceability record inaccurate; affects roadmap status tracking |

### Human Verification Required

#### 1. MiddlewareDriftException Message Clarity

**Test:** After calling `app.serveConfig()`, attempt to add middleware with `app.use(...)` and inspect the thrown exception message.
**Expected:** Message should clearly tell the developer what happened, what they should not do, and how to fix it (e.g., "register all middleware before calling serveConfig()").
**Why human:** Message clarity and developer experience quality cannot be assessed programmatically.

### Gaps Summary

The phase implementation is functionally complete and all 27 runtime tests pass. The single blocking gap is a **missing type export**: `BunRouteOptions` is defined in `packages/core/src/adapters/bun/types.ts` and exported via the bun barrel (`export * from './types'`), but the main `packages/core/src/index.ts` uses an explicit named export list for the bun adapter (lines 906-915) that does not include `BunRouteOptions`. This causes a TypeScript strict typecheck failure (TS2724) in `packages/photon/src/photon.ts`.

The fix is a one-line addition to `packages/core/src/index.ts`: add `type BunRouteOptions` to the export block. Additionally, `REQUIREMENTS.md` needs PERF-02 updated from pending to complete.

---

_Verified: 2026-03-30_
_Verifier: Claude (gsd-verifier)_
