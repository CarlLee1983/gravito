---
phase: 04B-1
title: Phase 4B-1 - Easy Compat Shim Replacements
status: executing
created: 2026-03-26
---

# Phase 4B-1 Execution Configuration

**Baseline Health:** 93/100 | 99.7% pass rate | 0 TypeErrors | 0 circular deps

## Wave 1: Parallel Compat Shim Replacements (5 tasks)

All 5 tasks are independent and execute in parallel.

### Task Distribution

| Task | File | Type | Risk | Est. Time |
|------|------|------|------|-----------|
| 1 | packages/photon/src/http-exception.ts | Re-export bridge | LOW | 15min |
| 2 | packages/photon/src/router/reg-exp-router.ts | Deprecation stub | LOW | 10min |
| 3 | packages/photon/src/router/trie-router.ts | Deprecation stub | LOW | 10min |
| 4 | packages/photon/src/logger.ts | Native impl (~20L) | LOW | 30min |
| 5 | packages/photon/src/middleware/websocket.ts | Type upgrade | LOW | 30min |

**Total parallel time:** ~30min (all 5 concurrent)
**Sequential fallback:** ~95min (if parallelization not feasible)

## Verification Gates

After all 5 tasks complete:
1. `bun run typecheck` → 0 errors
2. `bun test packages/photon` → no regressions
3. `bun test` full suite → ≥11,666 pass, ≤40 fail (99.7%+)
4. Health score maintained ≥90/100

## Rollback Strategy

Each task is independent → revert by commit if needed. No cascading failures.
