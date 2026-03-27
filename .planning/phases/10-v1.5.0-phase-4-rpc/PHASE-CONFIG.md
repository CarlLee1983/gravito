---
phase_number: 4
phase_name: RPC Client Strategy (v1.5.0)
milestone: v1.5.0
phase_type: implementation
duration: 1-2 days (2026-04-04 to 2026-04-05)
status: ready_for_planning
depends_on: Phase 2 (beam optimized)
---

# Phase 4: RPC Client Strategy

**Milestone:** v1.5.0 - Hono Dependency Removal & Type System Enhancement
**Focus:** Define and implement hono/client dependency strategy
**Target:** Clear strategy (type-only peerDep, remove, or relocate)

## Overview

Determine how hono/client should be handled across the framework. Is it strategically valuable as type-only, or should it be removed/relocated?

## Scope

**Questions to Answer:**
1. Is hono/client actually used at runtime or just for types?
2. What strategic value does it provide?
3. Should it be type-only peerDependency, remove, or move to adapter?
4. What's the migration path for v2.0/v3.0?

**Packages Affected:**
- @gravito/photon (if it imports hono/client)
- @gravito/beam (already optimized in Phase 2)

## Success Criteria

1. ✅ hono/client usage audited
2. ✅ Strategy decided and documented
3. ✅ Implementation complete
4. ✅ package.json updated
5. ✅ All tests pass
6. ✅ TypeCheck: 0 errors
7. ✅ Test pass rate: ≥99.6%
8. ✅ Health score: ≥93/100

## Related Plans

- `10-01-PLAN.md` — Detailed Phase 4 execution plan

## Next Phase

Phase 5 (2026-04-05): OpenAPI Cleanup
