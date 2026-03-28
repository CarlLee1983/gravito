---
gsd_state_version: 1.0
milestone: v2.0.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-28T14:05:37.854Z"
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 12
  completed_plans: 7
---

# STATE: Gravito-Core v2.0.0

## Project Reference

**Core Value:** 穩定可靠的核心基礎設施 — core 及所有 Orbit 包必須具備 production-ready 的錯誤處理與韌性機制
**Milestone Goal:** 建立統一的錯誤處理模型與韌性機制，讓 core 及全部 Orbit 包達到 production-ready 成熟度
**Roadmap:** `.planning/ROADMAP-v2.0.0.md`

---

## Current Position

Phase: 18 (foundation-orbit-migration) — EXECUTING
Plan: 2 of 6

## Performance Metrics

| Metric | Baseline (v1.5.1) | Target (v2.0.0) | Current |
|--------|-------------------|-----------------|---------|
| Health Score | 100/100 | 100/100 | 100/100 |
| Test Pass Rate | 100% | 100% | 100% |
| TypeScript Errors | 0 | 0 | 0 |
| Circular Dependencies | 0 | 0 | 0 |
| Orbit packages with GravitoException | 0/~50 | ~50/~50 | 0/~50 |
| Bare `throw new Error()` in Orbits | unknown | 0 | unknown |

---
| Phase 16 P01 | 8 | 2 tasks | 10 files |
| Phase 16-core-error-model-foundation P02 | 7 | 2 tasks | 9 files |
| Phase 16 P03 | 3 | 2 tasks | 4 files |
| Phase 17-resilience-infrastructure P01 | 5 | 1 tasks | 7 files |
| Phase 17-resilience-infrastructure P02 | 20 | 2 tasks | 7 files |
| Phase 17 P03 | 30min | 2 tasks | 4 files |
| Phase 18-foundation-orbit-migration P01 | 20min | 1 tasks | 4 files |

## Accumulated Context

### Key Decisions

| Decision | Rationale | Made |
|----------|-----------|------|
| Phase 16 first: error model before resilience | ErrorCode registry and InfrastructureException are compile-time deps for all downstream work | 2026-03-28 |
| Contract tests before any migration | Existing tests assert .message strings, not .code/.status — migration without contracts would give false greens | 2026-03-28 |
| Object.setPrototypeOf in all error constructors | ESM/CJS boundary instanceof breakage confirmed in atlas/src/errors | 2026-03-28 |
| cockatiel as the single new dependency | Zero deps, ESM+CJS, MIT, Bun-compatible; avoids neverthrow/Effect-TS rewrite | 2026-03-28 |
| withRetry requires explicit idempotent:true | atlas.transactionWithRetry already handles deadlock retry; double-wrapping = quadratic retries | 2026-03-28 |
| Phase 18 validates pattern before Phase 19 batch | atlas+plasma are highest blast-radius; design flaws found here don't cascade to 40+ packages | 2026-03-28 |
| OrbitDegradationManager in Phase 20 | Requires unified errors (P16) + wired CB (P18) + health reporting (P19); premature in P17 leads to silent failure anti-patterns | 2026-03-28 |

### Blockers

None currently.

### Open Questions

| Question | Phase to Resolve | Notes |
|----------|-----------------|-------|
| Exact layer for ResiliencePolicy in atlas pool | Phase 18 planning | PoolHealthChecker, transactionWithRetry, connection acquire — which layer? |
| FortifyError httpStatus vs status field | Phase 19 batch 4c planning | Breaking rename or duck-typing during transition window? |
| GracefulDegradationManager fallback API shape | Phase 20 planning | DegradedResult<T> vs callback vs Result<T> monad |

### Architectural Notes

- `@gravito/echo` has a duplicate `CircuitBreaker` — must be consolidated in Phase 17 before any new CB code is written
- `@gravito/fortify` has the reference `ErrorCodes` pattern — use it as the model for all Orbit namespace definitions in Phase 16
- `RippleError` already has correct `Object.setPrototypeOf` — use it as the reference implementation for Phase 16 error constructors
- `atlas.transactionWithRetry` internally handles deadlock retry — NEVER wrap it with external `withRetry`
- In test environments, `OrbitDegradationManager` must throw, not return fallback (NODE_ENV=test gate)

---

## Session Continuity

### To resume this milestone:

1. Check current phase: `cat .planning/STATE-v2.0.0.md`
2. Review phase details: `cat .planning/ROADMAP-v2.0.0.md`
3. Run: `/gsd:plan-phase 16`

### Phase completion order:

16 → 17 → 18 → 19 → 20

No phase can begin until the previous is complete (hard dependency chain).

---
*State initialized: 2026-03-28*
*Next action: /gsd:plan-phase 16*
