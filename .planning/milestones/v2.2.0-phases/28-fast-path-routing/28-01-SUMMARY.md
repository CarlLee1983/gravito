---
phase: 28-fast-path-routing
plan: "01"
subsystem: photon, core
tags: [fast-path, performance, bun-native, routing]
dependency_graph:
  requires: [BunNativeAdapter, RadixRouter, BunContext]
  provides: [FastPathRegistry, photon.fast(), photon.serveConfig()]
  affects: [packages/core, packages/photon]
tech_stack:
  added: [FastPathRegistry, FastPathProxy, NativeFastHandler]
  patterns: [bypass-pattern, proxy-pattern, context-free-handler]
key_files:
  created:
    - packages/core/src/adapters/bun/FastPathRegistry.ts
    - packages/photon/tests/photon-fast-path.test.ts
    - packages/photon/tests/performance-fast-path.bench.ts
  modified:
    - packages/core/src/adapters/bun/BunNativeAdapter.ts
    - packages/core/src/adapters/types.ts
    - packages/core/tests/adapters-bun-native.test.ts
    - packages/photon/src/photon.ts
decisions:
  - FastPathProxy uses callable-with-properties pattern (function + method props) for clean API
  - serveConfig only offloads GET routes to Bun.serve routes map (Bun limitation)
  - Fast-path bypass placed before WebSocket upgrade check in fetch() for max performance
  - bench() not available in Bun 1.3.10 — used it() with performance.now() instead
metrics:
  duration_minutes: 15
  completed: "2026-03-30"
  tasks_completed: 3
  tasks_total: 3
  files_created: 3
  files_modified: 4
  tests_added: 46
---

# Phase 28 Plan 01: Fast-Path Routing Summary

**One-liner:** FastPathRegistry + photon.fast() proxy bypass DI/context/middleware with 250%+ speedup for health checks and static endpoints.

## What Was Built

### Task 1: FastPathRegistry and registerFastPath() in core

- Created `FastPathRegistry` class with `Map<method, Map<path, handler>>` structure using exact string matching
- Added `registerFastPath?()` and `serveConfig?()` as optional methods on `HttpAdapter` interface
- Integrated fast-path bypass at the top of `BunNativeAdapter.fetch()` — before context pool acquisition and WebSocket handling
- Added 3 fast-path tests to `adapters-bun-native.test.ts` (20 tests total, all pass)

### Task 2: photon.fast() and FastPathProxy

- Added `NativeFastHandler` type: `(req: Request) => Response | Promise<Response>`
- Added `FastPathProxy` interface: callable function + HTTP method shorthands (get/post/put/delete/patch/head/options)
- Implemented `_buildFastProxy()` private method building the proxy with all method shorthands
- Exposed `serveConfig()` on Photon delegating to `adapter.serveConfig!()`
- Created `photon-fast-path.test.ts` with 19 tests covering all HTTP methods, chaining, priority, and raw Request

### Task 3: Benchmark and serveConfig verification

- Created `performance-fast-path.bench.ts` with 7 tests measuring latency
- **Benchmark result: fast-path is ~250-270% faster** than standard routes
- Verified `serveConfig()` returns valid Bun.serve-compatible config with `routes`, `fetch`, and `websocket`
- Verified fast-path handler does NOT trigger `acquireContext()` (bypasses context pool)

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| FastPathProxy callable-with-properties pattern | Clean ergonomics: `app.fast.get('/health', ...)` and `app.fast('GET', '/health', ...)` both work |
| serveConfig offloads GET-only to native routes | Bun's native `routes` map only supports GET by convention; other methods use fetch fallback |
| Fast-path before WebSocket check in fetch() | Maximum performance — even before upgrade detection |
| Use `it()` with performance.now() instead of `bench()` | `bench()` not exported from `bun:test` in Bun 1.3.10 |

## Verification Results

```
photon.fast('GET', '/health', () => new Response('OK')) → 'OK'
app.serveConfig().routes → ['/health']
fetch fallback for /api → 'normal'
```

All 3 plan verification criteria pass.

## Test Results

| File | Tests | Pass | Fail |
|------|-------|------|------|
| adapters-bun-native.test.ts | 20 | 20 | 0 |
| photon-fast-path.test.ts | 19 | 19 | 0 |
| performance-fast-path.bench.ts | 7 | 7 | 0 |
| **Total** | **46** | **46** | **0** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] bench() not available in Bun 1.3.10**
- **Found during:** Task 3
- **Issue:** `bun:test` in Bun 1.3.10 does not export `bench` function
- **Fix:** Replaced `bench()` calls with `it()` + `performance.now()` manual measurement
- **Files modified:** `packages/photon/tests/performance-fast-path.bench.ts`
- **Impact:** Same performance validation, different API

**2. [Continuation] Task 1 commit 4dc6d64e from main repo applied via cherry-pick**
- **Found during:** Task 1 start
- **Issue:** Commit existed in main repo but not in this worktree
- **Fix:** Cherry-picked 4dc6d64e without commit, then committed with plan-specific message

## Performance Metrics

From benchmark test output:
- Standard route avg: ~0.004–0.006ms per request
- Fast-path route avg: ~0.001–0.002ms per request
- **Speedup: 250–270% faster** (well above the 20-30% target in plan)

## Known Stubs

None — all functionality is wired and tested.

## Self-Check: PASSED
