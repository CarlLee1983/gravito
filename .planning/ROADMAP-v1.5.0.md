# Gravito-Core v1.5.0 — Roadmap

**Milestone:** v1.5.0 - Hono Dependency Removal & Type System Enhancement
**Duration:** 1.5–2 weeks (2026-03-27 to 2026-04-09)
**Current Phase:** Planning (ready for Phase 1 execution)

---

## Phase Structure

### Phase 1: JWT Native Implementation (3–4 days)
**Timeline:** 2026-03-27 to 2026-03-31
**Complexity:** MEDIUM
**Blockers:** None (independent)
**Parallel:** Can run in parallel with research for Phases 3–5

#### Objective
Replace `packages/photon/src/jwt.ts` re-export from `hono/jwt` with native implementation using `jose@^5.0.0`

#### Key Deliverables
- ✅ jwt.ts implements 5 functions natively: sign(), verify(), decode(), jwt(), verifyWithJwks()
- ✅ native-jwt.test.ts with 12–15 comprehensive tests
- ✅ 100% backwards compatibility (all existing JWT tests pass)
- ✅ TypeCheck: 0 errors (83/83 packages)
- ✅ Test pass rate: ≥99.6%
- ✅ Health score: ≥93/100

#### Verification
- TypeScript type checking: `bun run typecheck`
- JWT tests: `bun test packages/photon/tests/native/native-jwt.test.ts`
- All photon tests: `bun test packages/photon`
- Full suite: `bun test` (≥11,703 pass, ≤44 fail)

#### Success Metrics
| Metric | Target |
|--------|--------|
| Functions implemented | 5/5 |
| Tests created | 12–15 |
| Tests passing | 100% |
| Type errors | 0 |
| Backwards compat | 100% |
| Health score | ≥93/100 |

---

### Phase 2: External Package Type Cleanup (2–3 days)
**Timeline:** 2026-04-01 to 2026-04-03
**Complexity:** LOW
**Blockers:** Phase 1 (JWT native complete)
**Dependencies:** Requires JWT Phase 1 complete to ensure no regressions

#### Objective
Remove type-only Hono references from @gravito/mass, @gravito/beam, @gravito/zenith packages

#### Scope

**2A: @gravito/mass**
- Replace `HonoContext` type import with `GravitoContext`
- Update type casting in coercion.ts
- Verify all tests pass
- No breaking API changes

**2B: @gravito/beam**
- Audit hono/client usage
- Determine: keep as type-only peerDep or remove
- Document decision
- Update package.json if needed
- Verify tests pass

**2C: @gravito/zenith**
- Audit actual Hono imports/usage
- Determine: remove or document strategic use
- Update package.json
- Verify tests pass

#### Key Deliverables
- ✅ mass: HonoContext → GravitoContext (tests passing)
- ✅ beam: hono/client strategy documented
- ✅ zenith: Hono usage audited + documented
- ✅ All three packages' test suites pass
- ✅ No regressions in downstream dependents
- ✅ Zero type errors

#### Verification
- TypeScript: `bun run typecheck`
- Package-level tests: `bun test packages/{mass,beam,zenith}`
- Full suite: `bun test` (≥99.6% pass rate)

#### Success Metrics
| Metric | Target |
|--------|--------|
| Type-only Hono refs (mass) | 0 |
| Type-only Hono refs (beam) | Strategy documented |
| Type-only Hono refs (zenith) | 0 or documented |
| Tests passing (mass) | 100% |
| Tests passing (beam) | 100% |
| Tests passing (zenith) | 100% |
| Type errors | 0 |

---

### Phase 3: Platform Adapters Review (2–3 days)
**Timeline:** 2026-04-02 to 2026-04-04 (parallel with Phase 2B/C)
**Complexity:** LOW
**Blockers:** None (research phase, implementation after Phase 2)
**Parallel:** Can research in parallel with Phase 2

#### Objective
Audit and decide on cloudflare, deno, vercel adapters in packages/photon

#### Scope

**3A: Adapter Status Audit**
- Identify all adapter files in photon (src/adapters or similar)
- Check which adapters actually use Hono APIs
- Review test coverage for each adapter
- Document usage frequency (from git blame / test history)

**3B: Decision for Each Adapter**
- **Cloudflare:** Remove (no usage) or keep as type-only?
- **Deno:** Remove (no usage) or keep as type-only?
- **Vercel:** Remove (no usage) or keep as type-only?

**3C: Implementation**
- Update package.json dependencies if removing
- Update documentation
- Update/remove tests if needed
- Verify no regressions

#### Key Deliverables
- ✅ Adapter audit report (usage frequency, test coverage)
- ✅ Decision documented for each adapter
- ✅ Implementation complete (remove or retain)
- ✅ Tests passing
- ✅ Type errors: 0

#### Success Metrics
| Metric | Target |
|--------|--------|
| Adapters audited | 3/3 (cloudflare, deno, vercel) |
| Decisions documented | 3/3 |
| Implementation complete | 3/3 |
| Tests passing | 100% |
| Type errors | 0 |

---

### Phase 4: RPC Client Strategy (1–2 days)
**Timeline:** 2026-04-04 to 2026-04-05
**Complexity:** LOW
**Blockers:** None
**Parallel:** Independent, can run in parallel

#### Objective
Define and implement hono/client dependency strategy

#### Scope

**4A: Usage Audit**
- Grep for hono/client imports in source code
- Check if actually used at runtime or just types
- Review package.json (is it in dependencies or peerDependencies?)

**4B: Strategy Decision**
- Option 1: Keep as type-only peerDependency (strategic choice)
- Option 2: Remove entirely (if unused)
- Option 3: Move to separate adapter package

**4C: Implementation**
- Update package.json if needed
- Add @ts-ignore or type-only comments if keeping
- Document decision in ROADMAP.md
- Verify tests pass

#### Key Deliverables
- ✅ hono/client usage audit report
- ✅ Strategy decision documented
- ✅ package.json updated
- ✅ Tests passing
- ✅ Documentation updated

#### Success Metrics
| Metric | Target |
|--------|--------|
| Usage audit complete | Yes |
| Strategy documented | Yes |
| Implementation done | Yes |
| Tests passing | 100% |
| Type errors | 0 |

---

### Phase 5: OpenAPI Cleanup (1–2 days)
**Timeline:** 2026-04-05 to 2026-04-06
**Complexity:** LOW
**Blockers:** None
**Parallel:** Independent, can run in parallel

#### Objective
Scope and finalize @hono/zod-openapi usage

#### Scope

**5A: Usage Audit**
- Identify all @hono/zod-openapi imports
- Check if actually used at runtime
- Review test coverage

**5B: Strategy Decision**
- Option 1: Keep as dependency (if used)
- Option 2: Move to separate adapter (if optional)
- Option 3: Remove (if unused)

**5C: Implementation**
- Update package.json if needed
- Update imports/exports
- Verify tests pass
- Document decision

#### Key Deliverables
- ✅ @hono/zod-openapi usage audit
- ✅ Strategy decision documented
- ✅ Implementation complete
- ✅ Tests passing
- ✅ Documentation updated

#### Success Metrics
| Metric | Target |
|--------|--------|
| Usage audit complete | Yes |
| Strategy documented | Yes |
| Implementation done | Yes |
| Tests passing | 100% |
| Type errors | 0 |

---

## Execution Timeline

```
Week 1
------
Mar 27: Phase 1 START (JWT Native)
        └─ Parallel: Phase 3A research (Adapter Audit)
Mar 28-29: Phase 1 CONTINUE
Mar 30: Phase 1 COMPLETE + Phase 2A START (mass cleanup)
        └─ Parallel: Phase 3B (Adapter Decision)
Mar 31: Phase 2A COMPLETE + Phase 2B START (beam)

Week 2
------
Apr 01: Phase 2B CONTINUE
Apr 02: Phase 2C START (zenith)
        └─ Parallel: Phase 4A (RPC Audit)
Apr 03: Phase 2C CONTINUE + Phase 3C START (Adapter Implementation)
        └─ Parallel: Phase 4B (RPC Strategy)
Apr 04: Phase 3C CONTINUE
Apr 05: Phase 4C + Phase 5A START (OpenAPI Audit)
Apr 06: Phase 5B + 5C (OpenAPI Decision + Implementation)

Final
-----
Apr 07-08: Verification & QA
Apr 09: Milestone v1.5.0 COMPLETE
```

---

## Quality Gates

### Per-Phase Gates

**Phase 1 Gate:**
```bash
bun run typecheck                          # 0 errors
bun test packages/photon --timeout=10000  # ≥240 pass
bun test --timeout=10000                  # ≥99.6%
```

**Phase 2 Gate:**
```bash
bun run typecheck                    # 0 errors
bun test packages/mass              # all pass
bun test packages/beam              # all pass
bun test packages/zenith            # all pass
bun test --timeout=10000            # ≥99.6%
```

**Phases 3–5 Gates:**
```bash
bun run typecheck                    # 0 errors
bun test packages/photon             # all pass
bun test --timeout=10000            # ≥99.6%
```

### Milestone Final Gate

```bash
# 1. Type checking
bun run typecheck
# Expected: 0 errors (83/83 packages)

# 2. Full test suite
bun test --timeout=10000
# Expected: ≥11,703 pass, ≤44 fail, ≥99.6% pass rate

# 3. Health score
bun run scripts/health-check.ts
# Expected: ≥93/100

# 4. Hono references audit
grep -r "from 'hono" packages/*/src --include="*.ts" --include="*.tsx"
# Expected: 0 matches (except strategic type-only in .d.ts)

# 5. Build
bun run build
# Expected: All packages build successfully
```

---

## Risk Management

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| JWT signature validation fails | MEDIUM | CRITICAL | Comprehensive test coverage + round-trip validation |
| External package tests break | LOW | HIGH | Run tests after each sub-phase; quick rollback |
| Type system inconsistency | MEDIUM | HIGH | Audit all GravitoContext usage in parallel |
| Health score drops | LOW | HIGH | Run health check after each major phase |
| hono/client removal blocks downstream | LOW | MEDIUM | Document decision in ROADMAP + provide migration guide |

---

## Success Criteria (Final)

### Code Quality
- [ ] TypeScript: 0 errors (83/83 packages)
- [ ] Tests: ≥99.6% pass rate (≥11,703 pass, ≤44 fail)
- [ ] Health: ≥93/100 (no regression from v1.4.0)
- [ ] Circular deps: 0 (maintained)

### Hono Removal
- [ ] Source code: 0 Hono runtime imports (except strategic type-only)
- [ ] JWT: Native jose implementation (sign, verify, decode, jwt, verifyWithJwks)
- [ ] Type system: 100% GravitoContext (no HonoContext from source)
- [ ] External packages: Clean type system (mass/beam/zenith)

### Documentation
- [ ] Phase summaries (5 files: 05-01 through 05-05)
- [ ] Decisions documented (RPC client, OpenAPI, adapters)
- [ ] ROADMAP updated
- [ ] STATE.md finalized

### API Compatibility
- [ ] Backwards compatible: 100% (no breaking changes)
- [ ] JWT API unchanged: sign/verify/decode/jwt match existing signatures
- [ ] GravitoContext replaces HonoContext transparently

---

## Next Steps

After v1.5.0 completion:

1. **v1.5.1** — Satellite verification & optimization (2–3 weeks)
   - Deep audit of RBAC/Catalog/Commerce modules
   - Performance optimization
   - Type system review

2. **v1.6.0** — Obsidian vault + API reference (2–3 weeks)
   - Build Obsidian vault structure
   - Generate API reference documentation
   - Create learning paths

3. **v1.7.0** — Bundle optimization (1–2 weeks)
   - Size audit (gzip, brotli)
   - Tree-shaking improvements
   - Performance benchmarking

---

**Roadmap Created:** 2026-03-27
**Status:** Ready for Phase 1 Planning
**Next Command:** `/gsd:plan-phase 1` (after user approval)
