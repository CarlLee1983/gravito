---
phase_number: 3
phase_name: Platform Adapters Review (v1.5.0)
milestone: v1.5.0
phase_type: implementation
duration: 2-3 days (2026-04-02 to 2026-04-04)
status: ready_for_planning
depends_on: Phase 2 (type cleanup complete)
---

# Phase 3: Platform Adapters Review

**Milestone:** v1.5.0 - Hono Dependency Removal & Type System Enhancement
**Focus:** Audit and decide on cloudflare, deno, vercel adapters in photon
**Target:** Keep, deprecate, or remove platform-specific adapters

## Overview

Review all platform adapters (cloudflare, deno, vercel) in packages/photon, determine strategic value, and implement removal/retention decisions.

## Scope

**Adapters to Review:**
1. **Cloudflare adapter** — Usage frequency, test coverage, strategic value
2. **Deno adapter** — Usage frequency, test coverage, strategic value
3. **Vercel adapter** — Usage frequency, test coverage, strategic value

**Decisions:**
- Keep as part of core photon
- Deprecate with migration guide
- Remove entirely

## Success Criteria

1. ✅ All 3 adapters audited (usage, tests, dependencies)
2. ✅ Decision made for each adapter (keep/deprecate/remove)
3. ✅ Decisions documented in ROADMAP
4. ✅ Implementation complete (changes or documentation)
5. ✅ All photon tests pass (≥294 tests)
6. ✅ TypeCheck: 0 errors
7. ✅ Test pass rate: ≥99.6%
8. ✅ Health score: ≥93/100

## Phase Structure

**Single Wave: Audit + Decision + Implementation**
- Task 1: Audit all 3 adapters
- Task 2: Make strategic decisions
- Task 3: Implement changes
- Task 4: Verify tests pass

## Related Plans

- `09-01-PLAN.md` — Detailed Phase 3 execution plan

## Next Phase

Phase 4 (2026-04-04): RPC Client Strategy
