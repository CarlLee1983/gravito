# Gravito-Core v1.5.0 — Requirements

**Milestone:** v1.5.0 - Hono Dependency Removal & Type System Enhancement
**Duration:** 1.5–2 weeks (2026-03-27 to 2026-04-09)
**Focus:** Complete remaining Hono migration work, finalize type system, verify satellite stability

---

## Executive Summary

After v1.4.0 (JSDoc coverage completion), v1.5.0 focuses on **finalizing the Hono dependency removal** that was partially completed in v1.3.10. The remaining work includes:

1. **JWT Native Implementation** (Phase 1) — Replace hono/jwt with jose library
2. **External Package Type Cleanup** (Phase 2) — Remove type-only Hono references from mass/beam/zenith
3. **Platform Adapters Review** (Phase 3) — Deprecate/remove cloudflare/deno/vercel adapters
4. **RPC Client Strategy** (Phase 4) — Finalize hono/client as type-only peerDep
5. **OpenAPI Cleanup** (Phase 5) — Scope @hono/zod-openapi or remove

---

## Business Drivers

### Pain Points (from v1.3.10 Audit)

1. **Incomplete Hono Removal** — While runtime dependencies were removed, type-only references remain scattered
2. **Type System Clarity** — Mixed Hono/Gravito context types create confusion
3. **External Package Bloat** — mass/beam/zenith carry unnecessary Hono imports
4. **RPC Client Uncertainty** — hono/client dependency model unclear (keep as type-only vs remove?)

### Desired Outcome

- ✅ Zero Hono references in source code (except type-only peerDeps where strategically needed)
- ✅ All JWT operations use native jose implementation
- ✅ Type system unified around GravitoContext (no HonoContext imports)
- ✅ External packages (mass/beam/zenith) clean and self-contained
- ✅ RPC client strategy documented and implemented
- ✅ Framework health score maintained ≥93/100
- ✅ Test pass rate ≥99.6%

---

## Scope

### In Scope

#### Phase 1: JWT Native Implementation
- Replace `packages/photon/src/jwt.ts` implementation (currently re-exports from hono/jwt)
- Implement 5 functions: `sign()`, `verify()`, `decode()`, `jwt()`, `verifyWithJwks()`
- Use `jose@^5.0.0` library
- Create comprehensive test suite (12–15 tests)
- Maintain 100% API compatibility with current Hono JWT

#### Phase 2: External Package Type Cleanup
- **@gravito/mass** — Replace `HonoContext` type import with `GravitoContext`
- **@gravito/beam** — Evaluate hono/client; keep as type-only peerDep if strategically valuable
- **@gravito/zenith** — Audit for actual Hono usage; document or remove

#### Phase 3: Platform Adapters Decision
- Review cloudflare, deno, vercel adapters in photon
- Determine: keep as type-only, deprecate, or remove entirely
- Update documentation if retained

#### Phase 4: RPC Client Strategy
- Define hono/client status: type-only peerDep vs removal candidate
- Document usage patterns
- Update package.json dependencies

#### Phase 5: OpenAPI Cleanup
- Scope `@hono/zod-openapi` usage in photon
- Options: keep (type-only), remove, or move to separate adapter package

### Out of Scope

- ❌ New features (focus on cleanup/migration only)
- ❌ Performance optimization (that's Phase 6+)
- ❌ Satellite module enhancements (v1.5.1+)
- ❌ Obsidian vault setup (deferred to v1.5.1+)
- ❌ Full bundle size audit (separate optimization phase)

---

## Success Criteria

### Quality Gates

| Gate | Target | Baseline |
|------|--------|----------|
| TypeScript Errors | 0/83 packages | 0 (maintained) |
| Test Pass Rate | ≥99.6% | 99.7% (v1.4.0) |
| Framework Health | ≥93/100 | 93/100 (v1.3.10) |
| Circular Dependencies | 0 | 0 (maintained) |
| Hono References | 0 in src, type-only only | TBD (audit in Phase 3) |

### Completion Checklist

#### Phase 1 (JWT)
- [ ] jwt.ts implements 5 functions natively (jose)
- [ ] native-jwt.test.ts has 12–15 tests, all passing
- [ ] All existing JWT tests still pass
- [ ] Backwards compatibility verified (100%)
- [ ] Health score ≥93/100

#### Phase 2 (External Package Type Cleanup)
- [ ] mass: HonoContext → GravitoContext (tests passing)
- [ ] beam: hono/client strategy documented
- [ ] zenith: Hono usage audited and documented
- [ ] All three packages' tests passing
- [ ] No regressions in downstream dependents

#### Phase 3 (Platform Adapters)
- [ ] cloudflare, deno, vercel adapters status decided
- [ ] Documentation updated (if retained)
- [ ] Tests passing

#### Phase 4 (RPC Client)
- [ ] hono/client strategy documented
- [ ] package.json dependencies updated
- [ ] Type system reviewed and validated

#### Phase 5 (OpenAPI)
- [ ] @hono/zod-openapi usage scoped
- [ ] Decision made (keep / remove / relocate)
- [ ] Implementation updated

### Final Milestone Criteria

✅ All phases complete
✅ TypeCheck: 0 errors (83/83)
✅ Test pass rate: ≥99.6%
✅ Health score: ≥93/100 (no regression)
✅ All Hono references removed from source (except strategic type-only)
✅ Zero breaking changes (API compatibility 100%)

---

## Constraints & Risks

### Constraints

1. **Time:** 1.5–2 weeks max (resource capacity)
2. **Stability:** Must maintain 93/100 health score; no breaking changes
3. **Scope:** Cleanup/migration only; no new features
4. **Type Safety:** Zero type errors after refactoring

### Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| JWT signature validation fails | 🔴 CRITICAL | Comprehensive sign/verify tests + round-trip validation |
| External packages break | 🔴 CRITICAL | Run all package-level tests before committing |
| Type system inconsistency | 🟡 HIGH | Audit all GravitoContext vs HonoContext usage |
| Health score drops below 93 | 🟡 HIGH | Run full test suite after each phase; quick rollback if needed |
| Breaking API changes | 🟡 HIGH | Backwards compat tests for jwt(), verify(), etc. |
| hono/client removal blocks downstream | 🟢 MEDIUM | Document decision + provide migration guide if needed |

---

## Dependencies

### External

- `jose@^5.0.0` — For native JWT implementation (already in photon or add via bun add)

### Internal

- **Phase 1 → Phase 2** — JWT implementation should complete before type cleanup
- **Phase 3–5** — Independent, can run in parallel after Phase 2

### Blocked By

- ✅ v1.4.0 completion (JSDoc coverage)

---

## Success Metrics (Post-Completion)

| Metric | Target |
|--------|--------|
| **Hono References in Source** | 0 (except strategic type-only imports) |
| **JWT Tests** | 12–15 tests, 100% pass |
| **External Packages (mass/beam/zenith)** | All tests pass, zero regressions |
| **Type System** | 100% GravitoContext (no HonoContext imports from source) |
| **Framework Health** | ≥93/100 |
| **Test Pass Rate** | ≥99.6% |
| **Build Time** | <5 min (full monorepo) |
| **Documentation** | Decisions documented in ROADMAP.md + phase summaries |

---

## Next Steps (Post-v1.5.0)

1. **v1.5.1** — Satellite verification & optimization (RBAC/Catalog/Commerce deep audit)
2. **v1.6.0** — Obsidian vault setup + API reference generation
3. **v1.7.0** — Bundle optimization + performance audit

---

**Created:** 2026-03-27
**Last Updated:** 2026-03-27
**Status:** Ready for Phase Planning
