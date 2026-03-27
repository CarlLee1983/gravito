---
phase_number: 2
phase_name: External Package Type Cleanup (v1.5.0)
milestone: v1.5.0
phase_type: implementation
duration: 2-3 days (2026-04-01 to 2026-04-03)
status: ready_for_planning
depends_on: Phase 1 (JWT native complete)
---

# Phase 2: External Package Type Cleanup

**Milestone:** v1.5.0 - Hono Dependency Removal & Type System Enhancement
**Focus:** Remove type-only Hono references from @gravito/mass, @gravito/beam, @gravito/zenith
**Target:** Zero Hono type imports from source code (except strategic type-only peerDeps)

## Overview

Complete type system cleanup in 3 external packages that still carry type-only Hono imports. Replace HonoContext with GravitoContext, evaluate hono/client dependency strategy, and audit zenith's Hono usage.

## Scope

**Sub-Phases:**

### 2A: @gravito/mass (1 day)
- Replace `HonoContext` type import with `GravitoContext`
- Update type casting in coercion.ts
- Verify all tests pass (mass package tests)
- Zero regressions in downstream dependents

### 2B: @gravito/beam (1 day)
- Audit hono/client usage patterns
- Decide: keep as type-only peerDep or remove entirely
- Document decision in ROADMAP
- Update package.json if needed
- Verify all tests pass

### 2C: @gravito/zenith (0.5-1 day)
- Audit actual Hono imports/usage in source
- Determine: remove or document strategic use
- Update package.json dependencies
- Verify all tests pass

## Success Criteria

1. ✅ mass: HonoContext → GravitoContext (tests passing)
2. ✅ beam: hono/client strategy documented + implemented
3. ✅ zenith: Hono usage audited and documented
4. ✅ All three packages' test suites pass
5. ✅ Zero regressions in downstream dependents
6. ✅ TypeCheck: 0 errors (83/83 packages)
7. ✅ Test pass rate: ≥99.6%
8. ✅ Health score: ≥93/100 maintained

## Dependencies

**Blocked By:**
- ✅ Phase 1 complete (JWT native)

**Blocks:**
- Phase 3 (can start in parallel with 2B/2C research)

## Related Plans

- `08-01-PLAN.md` — Detailed Phase 2 execution plan
- `08-02-PLAN.md` — (if needed) Additional implementation plans
- `08-01-SUMMARY.md` — Completion summary (after execution)

## Next Phase

Phase 3 (2026-04-02): Platform Adapters Review (can run in parallel)
