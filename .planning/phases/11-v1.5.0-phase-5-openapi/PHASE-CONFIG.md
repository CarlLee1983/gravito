---
phase_number: 5
phase_name: OpenAPI Cleanup (v1.5.0)
milestone: v1.5.0
phase_type: implementation
duration: 1-2 days (2026-04-05 to 2026-04-06)
status: ready_for_planning
depends_on: Phase 4 (RPC strategy complete)
---

# Phase 5: OpenAPI Cleanup

**Milestone:** v1.5.0 - Hono Dependency Removal & Type System Enhancement
**Focus:** Scope and finalize @hono/zod-openapi usage
**Target:** Keep, remove, or relocate to adapter package

## Overview

Audit @hono/zod-openapi usage in photon, determine if it's essential or optional, and implement appropriate strategy.

## Scope

**Questions to Answer:**
1. Is @hono/zod-openapi actually used in production code?
2. Can it be replaced with alternative solution?
3. Should it be kept, removed, or moved to adapter?
4. What's the user impact if removed?

**Packages Affected:**
- @gravito/photon (likely only consumer)

## Success Criteria

1. ✅ @hono/zod-openapi usage audited
2. ✅ Strategy decided and documented
3. ✅ Implementation complete
4. ✅ All tests pass
5. ✅ TypeCheck: 0 errors
6. ✅ Test pass rate: ≥99.6%
7. ✅ Health score: ≥93/100

## Related Plans

- `11-01-PLAN.md` — Detailed Phase 5 execution plan

## Completion

This is the final phase of v1.5.0 milestone.
