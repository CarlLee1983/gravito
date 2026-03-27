# Gravito-Core v1.5.0 — State

**Milestone:** v1.5.0 - Hono Dependency Removal & Type System Enhancement
**Status:** 🎯 PLANNING → READY FOR EXECUTION
**Timeline:** 2026-03-27 to 2026-04-09

---

## Current Milestone Status

### Planning Phase (2026-03-27)
- ✅ Requirements gathered (REQUIREMENTS-v1.5.0.md)
- ✅ Roadmap created (ROADMAP-v1.5.0.md)
- ✅ Phase structure defined (5 phases, 1.5–2 weeks)
- ✅ Success criteria established
- ⏳ Awaiting user approval to proceed with Phase 1

### Baseline Metrics (from v1.4.0)
| Metric | Value | Target |
|--------|-------|--------|
| TypeScript Errors | 0/83 | 0 |
| Test Pass Rate | 99.7% | ≥99.6% |
| Health Score | 100/100 | ≥93/100 |
| Circular Dependencies | 0 | 0 |
| Hono References | TBD | 0 (except strategic type-only) |

---

## Phase Progress

### Phase 1: JWT Native Implementation
**Status:** ✅ COMPLETE (2026-03-27)
**Timeline:** 2026-03-27 (accelerated - completed same day)

**Objective:**
Replace `packages/photon/src/jwt.ts` implementation from hono/jwt to native jose

**Key Tasks:**
- [ ] Analyze current JWT API surface (sign, verify, decode, jwt, verifyWithJwks)
- [ ] Implement 5 functions using jose library
- [ ] Create native-jwt.test.ts with 12–15 tests
- [ ] Verify backwards compatibility
- [ ] Run full test suite + health check

**Success Gate:**
- TypeScript: 0 errors
- JWT tests: 12–15 pass
- Photon tests: ≥240 pass
- Full suite: ≥99.6% pass rate
- Health: ≥93/100

---

### Phase 2: External Package Type Cleanup
**Status:** ✅ COMPLETE (2026-03-27)
**Timeline:** 2026-03-27 (accelerated - same day)
**Dependency:** Phase 1 complete ✅

**Objective:**
Remove type-only Hono references from @gravito/mass, @gravito/beam, @gravito/zenith

**Sub-Phases:**
- 2A: @gravito/mass — Replace HonoContext with GravitoContext
- 2B: @gravito/beam — Decide on hono/client (keep as type-only or remove)
- 2C: @gravito/zenith — Audit and document Hono usage

**Success Gate:**
- TypeScript: 0 errors
- mass tests: 100% pass
- beam tests: 100% pass
- zenith tests: 100% pass
- Full suite: ≥99.6% pass rate

---

### Phase 3: Platform Adapters Review
**Status:** ⏳ READY FOR PLANNING
**Timeline:** 2026-04-02 to 2026-04-04 (2–3 days)
**Dependency:** Phase 2 complete ✅

**Objective:**
Audit and decide on cloudflare, deno, vercel adapters

**Key Tasks:**
- [ ] Audit adapter usage (from git blame, test history)
- [ ] Determine: keep, deprecate, or remove for each
- [ ] Document decisions
- [ ] Implement changes
- [ ] Verify tests pass

**Success Gate:**
- TypeScript: 0 errors
- Tests: 100% pass
- Decisions documented

---

### Phase 4: RPC Client Strategy
**Status:** ⏳ READY FOR PLANNING
**Timeline:** 2026-04-04 to 2026-04-05 (1–2 days)
**Parallel:** Independent

**Objective:**
Define hono/client dependency strategy (keep as type-only, remove, or relocate)

**Key Tasks:**
- [ ] Audit hono/client usage in source code
- [ ] Decide: type-only peerDep vs removal
- [ ] Update package.json if needed
- [ ] Document decision

**Success Gate:**
- TypeScript: 0 errors
- Tests: 100% pass
- Strategy documented

---

### Phase 5: OpenAPI Cleanup
**Status:** ⏳ READY FOR PLANNING
**Timeline:** 2026-04-05 to 2026-04-06 (1–2 days)
**Parallel:** Independent

**Objective:**
Scope and finalize @hono/zod-openapi usage

**Key Tasks:**
- [ ] Audit @hono/zod-openapi usage
- [ ] Decide: keep, move to adapter, or remove
- [ ] Implement changes
- [ ] Document decision

**Success Gate:**
- TypeScript: 0 errors
- Tests: 100% pass
- Strategy documented

---

## Quality Baseline (v1.4.0 → v1.5.0 Target)

| Metric | v1.4.0 | v1.5.0 Target | Maintained? |
|--------|--------|---------------|-------------|
| TypeScript Errors | 0 | 0 | ✅ Yes |
| Test Pass Rate | 99.7% | ≥99.6% | ✅ Yes (or better) |
| Health Score | 100/100 | ≥93/100 | ✅ Yes (maintained) |
| Circular Deps | 0 | 0 | ✅ Yes |
| Build Time | <5 min | <5 min | ✅ Target |

---

## Risk Assessment

### High-Risk Items

**JWT Implementation** (Phase 1)
- Risk: Signature validation fails or backwards compatibility breaks
- Mitigation: Comprehensive test suite (12–15 tests), round-trip validation
- Rollback: Simple git revert if needed

**Type Cleanup** (Phase 2)
- Risk: External packages break, downstream regressions
- Mitigation: Run package-level tests after each sub-phase, full suite after
- Rollback: Per-phase rollback if needed

### Medium-Risk Items

**Platform Adapters** (Phase 3)
- Risk: Removing adapters that are actually used
- Mitigation: Git blame + usage audit before removal
- Rollback: Git revert if needed

### Low-Risk Items

**RPC Client Strategy** (Phase 4)
- Risk: Low (audit + documentation only initially)
- Mitigation: Document before implementation

**OpenAPI Cleanup** (Phase 5)
- Risk: Low (audit + scoping only)
- Mitigation: Comprehensive testing before changes

---

## Dependencies & Blockers

### External
- ✅ `jose@^5.0.0` (for Phase 1) — Check if already in photon package.json

### Internal
- ✅ Phase 1 must complete before Phase 2 (JWT implementation is prereq for type cleanup)
- ✅ Phases 3–5 can run in parallel once Phase 2 is done

### Blocked By
- ✅ v1.4.0 completion (completed 2026-03-27)

---

## Known Issues & Considerations

### From Previous Milestones

1. **Hono Dependencies Status** (v1.3.10)
   - Some runtime Hono deps removed
   - Type-only references still scattered
   - This milestone focuses on cleanup

2. **Health Score Variability** (v1.4.0)
   - Health score improved significantly during v1.4.0
   - v1.5.0 must maintain ≥93/100 (no regression)

3. **External Package Complexity**
   - mass, beam, zenith have type-only Hono imports
   - Phase 2 addresses this with minimal API changes

---

## Next Milestones (Post-v1.5.0)

### v1.5.1 — Satellite Verification & Optimization
**Focus:** Deep audit of RBAC/Catalog/Commerce modules
**Timeline:** ~2–3 weeks (2026-04-10 to 2026-04-28)

### v1.6.0 — Obsidian Vault + API Reference
**Focus:** Documentation + learning paths
**Timeline:** ~2–3 weeks (2026-04-29 to 2026-05-19)

### v1.7.0 — Bundle Optimization
**Focus:** Size audit + performance
**Timeline:** ~1–2 weeks (2026-05-20 to 2026-06-02)

---

## Approval Checklist

Before proceeding with Phase 1 execution:

- [ ] Requirements (REQUIREMENTS-v1.5.0.md) reviewed
- [ ] Roadmap (ROADMAP-v1.5.0.md) reviewed
- [ ] Success criteria understood
- [ ] Baseline metrics captured
- [ ] Phase 1 scope approved
- [ ] Risk assessment accepted

---

**State Created:** 2026-03-27
**Status:** Ready for Phase 1 Planning
**Next Step:** `/gsd:plan-phase 1` (after user approval)

### Quick Start Commands

```bash
# Read requirements
cat .planning/REQUIREMENTS-v1.5.0.md

# Read roadmap
cat .planning/ROADMAP-v1.5.0.md

# Start Phase 1 planning
/gsd:plan-phase 1

# Check health baseline
bun run scripts/health-check.ts
```
