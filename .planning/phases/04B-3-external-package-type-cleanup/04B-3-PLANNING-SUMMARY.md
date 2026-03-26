# Phase 04B-3 Planning Summary

**Planning Date:** 2026-03-26
**Phase:** 04B-3-external-package-type-cleanup
**Status:** ✅ PLANNING COMPLETE

---

## Executive Summary

Three executable phase plans created for Phase 04B-3 (External Package Type Cleanup), the third sub-phase of the Hono migration roadmap. This phase eliminates type-only Hono references from three external packages: @gravito/mass, @gravito/beam, and @gravito/zenith.

**Timeline:** 0.5 week execution (2-3 days)
**Baseline:** Health 93/100 | 99.7% test pass | 0 TypeScript errors
**Wave Structure:** All 3 plans parallel (Wave 1, no dependencies)

---

## Phase Context

### Phase Goal (from 04B-3-CONTEXT.md)

Eliminate type-only Hono references from @gravito/mass, @gravito/beam, and @gravito/zenith packages to complete Phase 4B Hono migration prep.

### Decisions Locked (from MIGRATION_ROADMAP.md)

| Decision | Scope | Status |
|----------|-------|--------|
| **D-01** | Replace HonoContext type import with GravitoContext in mass/coercion.ts | LOCKED |
| **D-02** | Keep hono/client as type-only peerDependency in @gravito/photon | LOCKED |
| **D-03** | Verify zenith Hono usage and remove if unused | LOCKED |

---

## Plans Created

### Plan 04B-3-01: @gravito/mass HonoContext Type Replacement

**File:** `.planning/phases/04B-3-external-package-type-cleanup/04B-3-01-PLAN.md`
**Wave:** 1
**Depends On:** 04B-2-01
**Autonomous:** Yes

#### Objective
Replace type-only HonoContext import with GravitoContext in mass/coercion.ts, eliminating Hono type dependency from external package.

#### Scope
- **Files Modified:** packages/mass/src/coercion.ts, packages/mass/tests/coercion.test.ts
- **Lines Changed:** ~12 references (honoCtx → nativeCtx, HonoContext → GravitoContext)
- **Imports Removed:** `import type { Context as HonoContext } from 'hono'` (line 5)

#### Implementation Details

**Task 1: Replace HonoContext type import**
1. Remove line 5 import of HonoContext from hono
2. Verify GravitoContext/GravitoMiddleware import from @gravito/core already present (line 1)
3. Locate validateWithCoercion function (line 297-375)
4. Replace line 304: `const honoCtx = (ctx.native || ctx) as HonoContext`
   - With: `const nativeCtx = ctx as GravitoContext`
5. Replace all ~12 references to `honoCtx`:
   - `honoCtx.req.json()` → `nativeCtx.req.json()`
   - `honoCtx.req.query()` → `nativeCtx.req.query()`
   - `honoCtx.req.param()` → `nativeCtx.req.param()`
   - `honoCtx.req.parseBody()` → `nativeCtx.req.parseBody()`
   - `honoCtx.json(...)` → `nativeCtx.json(...)` (3x occurrences)
   - `(honoCtx.req as any).valid` → `(nativeCtx.req as any).valid`

**Task 2: Verify tests pass**
1. Run: `bun test packages/mass --timeout=10000`
2. Run: `bun run typecheck` (full monorepo)
3. Verify 0 TypeScript errors in mass and downstream packages

#### Verification Criteria
- [ ] HonoContext import removed (grep returns nothing)
- [ ] All references replaced with GravitoContext
- [ ] All mass tests pass (100% success rate, baseline 40+ tests)
- [ ] TypeScript typecheck passes (0 errors in mass, 0 errors monorepo-wide)
- [ ] No downstream type errors in 21 packages that depend on @gravito/photon

#### Success Criteria
- HonoContext completely removed from mass/coercion.ts
- GravitoContext successfully handles all context operations
- All mass coercion tests pass
- Zero TypeScript errors
- Changes committed

---

### Plan 04B-3-02: @gravito/beam RPC Type System Assessment

**File:** `.planning/phases/04B-3-external-package-type-cleanup/04B-3-02-PLAN.md`
**Wave:** 1
**Depends On:** 04B-2-01
**Autonomous:** Yes

#### Objective
Assess and document @gravito/beam's RPC type system, implementing strategic decision D-02 (keep hono/client as type-only peerDependency).

#### Scope
- **Files Modified:** packages/beam/src/index.ts, packages/beam/src/helpers.ts
- **Changes:** JSDoc @deprecated notices only (no source code changes)
- **Hono Usage:** Type-only generics (`<T extends Hono<any, any, any>>`)

#### Implementation Details

**Task 1: Review beam RPC type system**
1. Verify Hono imports are type-only in both files:
   - `import type { Hono } from 'hono'` ✓
2. Confirm createBeam generic constraint (line 49):
   - `<T extends Hono<any, any, any> = Hono<any, any, any>>` ✓
3. Confirm createAuthenticatedBeam generic constraint (line 45):
   - `<T extends Hono<any, any, any>>` ✓
4. Document findings: Beam is correctly using Hono types without production dependency

**Task 2: Add @deprecated JSDoc notices**
1. Add deprecation notice to createBeam JSDoc:
   ```
   * @deprecated v3.0 — Beam's RPC type system will migrate to native implementation.
   * Currently uses Hono's type inference. For v3.0, a native RPC type system will replace this dependency.
   ```
2. Add deprecation notice to createAuthenticatedBeam JSDoc:
   ```
   * @deprecated v3.0 — Part of Beam's RPC type system.
   * Will be updated to use native RPC types when available in v3.0+.
   ```
3. Run: `bun run typecheck -- packages/beam` (verify 0 errors)

**Task 3: Verify tests pass**
1. Run: `bun test packages/beam --timeout=10000`
2. Run: `bun run typecheck` (full monorepo)
3. Verify 0 TypeScript errors

#### Verification Criteria
- [ ] Hono type-only imports confirmed in both files
- [ ] @deprecated JSDoc notices added targeting v3.0
- [ ] All beam tests pass (100% success rate, baseline 40+ tests)
- [ ] TypeScript typecheck passes (0 errors in beam, 0 errors monorepo-wide)
- [ ] No code changes to beam source (only JSDoc)

#### Success Criteria
- Hono type-only usage confirmed and documented
- @deprecated JSDoc notices targeting v3.0 native RPC system
- All beam RPC tests pass
- Zero TypeScript errors
- Changes committed

---

### Plan 04B-3-03: @gravito/zenith Hono Dependency Verification

**File:** `.planning/phases/04B-3-external-package-type-cleanup/04B-3-03-PLAN.md`
**Wave:** 1
**Depends On:** 04B-2-01
**Autonomous:** Yes

#### Objective
Verify and resolve @gravito/zenith's Hono dependency status. Audit source code to determine actual usage; remove if unused per D-03.

#### Scope
- **Files Modified:** packages/zenith/package.json
- **Dependency Status:** hono ^4.12.2 in production dependencies (line 37)
- **Expected Finding:** Unused leftover from initialization

#### Implementation Details

**Task 1: Audit zenith source for Hono imports**
1. Grep zenith source for all Hono imports:
   ```bash
   grep -r "from ['\"]hono" packages/zenith/src/ --include="*.ts" --include="*.tsx"
   grep -r "import.*Hono" packages/zenith/src/ --include="*.ts" --include="*.tsx"
   grep -r "Hono\|HonoRequest\|HonoContext" packages/zenith/src/ --include="*.ts" --include="*.tsx"
   ```
2. Expected result: NO matches (Hono confirmed as unused)
3. Verify photon dependency exists: `grep "@gravito/photon" packages/zenith/package.json`
4. Document findings: Hono is unused leftover; safe to remove

**Task 2: Remove unused Hono dependency**
1. Open packages/zenith/package.json
2. Delete line 37: `"hono": "^4.12.2",`
3. Verify no other hono entries (@hono/*)
4. Save file
5. Run: `bun install` (update lockfile)
6. Verify no installation errors
7. Run: `bun run typecheck -- packages/zenith`

**Task 3: Verify tests pass**
1. Run: `bun test packages/zenith --timeout=10000`
2. Run: `bun run typecheck` (full monorepo)
3. Verify 0 TypeScript errors

#### Verification Criteria
- [ ] Zenith source audited (grep confirms no Hono imports)
- [ ] Hono removed from packages/zenith/package.json
- [ ] bun install completes cleanly
- [ ] All zenith tests pass (100% success rate)
- [ ] TypeScript typecheck passes (0 errors in zenith, 0 errors monorepo-wide)

#### Success Criteria
- Zenith source code audited (no Hono usage found)
- Hono dependency successfully removed
- All zenith tests pass
- Zero TypeScript errors
- Changes committed

---

## Wave Structure Analysis

### Wave 1 (Parallel Execution)

All three plans execute in parallel with no dependencies:

```
04B-3-01-PLAN.md (mass)    ─┐
                            ├─→ (parallel, no blocking)
04B-3-02-PLAN.md (beam)    ─┤
                            ├─→
04B-3-03-PLAN.md (zenith)  ─┘
```

**Rationale:**
- Each plan touches different packages (mass, beam, zenith)
- No shared files or dependencies
- Independent test suites
- Parallel execution reduces total phase duration from ~3-4 hours to ~2-3 hours

---

## Plan Quality Checklist

### Plan 04B-3-01 (mass)
- [x] Clear objective and scope
- [x] Specific file paths and line numbers
- [x] Concrete implementation steps (12-step task breakdown)
- [x] Automated verification commands
- [x] Success criteria defined
- [x] Frontmatter complete (phase, plan, wave, depends_on, files_modified, requirements)
- [x] Must-haves defined (truths, artifacts, key_links)
- [x] Context references provided
- [x] Output path specified

### Plan 04B-3-02 (beam)
- [x] Clear objective (assessment + documentation)
- [x] Specific file paths (index.ts, helpers.ts)
- [x] Concrete implementation steps (3-task breakdown)
- [x] Automated verification commands
- [x] Success criteria defined
- [x] Frontmatter complete
- [x] Must-haves defined
- [x] Context references provided
- [x] Output path specified

### Plan 04B-3-03 (zenith)
- [x] Clear objective (audit + removal)
- [x] Specific file paths (package.json)
- [x] Concrete implementation steps (3-task breakdown)
- [x] Automated verification commands
- [x] Success criteria defined
- [x] Frontmatter complete
- [x] Must-haves defined
- [x] Context references provided
- [x] Output path specified

---

## Resource Requirements

### Executors
- **Model:** Sonnet 4.6 (preferred for this complexity level)
- **Alternative:** Haiku 4.5 (acceptable for Plan 04B-3-03, which is simpler)

### Dependencies
- Codebase: gravito-core (available locally)
- Build tools: Bun, TypeScript
- Test framework: bun:test
- External libraries: jose (already present for 04B-2)

### Time Estimates
- **Plan 04B-3-01 (mass):** ~30-45 minutes (code changes + tests + verification)
- **Plan 04B-3-02 (beam):** ~20-30 minutes (JSDoc additions + tests + verification)
- **Plan 04B-3-03 (zenith):** ~15-20 minutes (audit + removal + verification)
- **Total (parallel):** ~45-60 minutes (longest task is critical path)

---

## Risk Assessment

### Risk 1: GravitoContext Type Incompatibility (Plan 04B-3-01)

**Probability:** Low (GravitoContext is a superset of HonoContext)
**Impact:** Medium (validateWithCoercion middleware breaks)
**Mitigation:**
- Verify GravitoContext provides .req.json(), .req.query(), .req.param(), .req.parseBody()
- Run mass tests immediately after type change
- Rollback if tests fail (revert to HonoContext temporarily)

### Risk 2: Beam Type Inference Breakage (Plan 04B-3-02)

**Probability:** Very Low (no code changes, only JSDoc)
**Impact:** Low (JSDoc-only changes don't affect runtime)
**Mitigation:**
- Verify no source code changes made
- Run beam tests to confirm RPC type inference still works

### Risk 3: Zenith Dependency Resolution (Plan 04B-3-03)

**Probability:** Low (hono is not imported in source)
**Impact:** Low (safe to remove if truly unused)
**Mitigation:**
- Thorough grep audit before removal
- Run full test suite after removal
- Verify bun install completes cleanly

### Risk 4: Downstream Package Impact (All Plans)

**Probability:** Very Low (type-only changes, mass is internal)
**Impact:** Medium (cascading type errors in 21+ packages)
**Mitigation:**
- Run full monorepo typecheck after each plan
- Verify no new TypeScript errors introduced
- D-02 keeps hono/client as peer dep (no beam breakage)

### Risk 5: Health Score Regression

**Probability:** Very Low (baseline 93/100, tests should pass)
**Impact:** Medium (signals stability concern)
**Mitigation:**
- Monitor health score after each plan execution
- If health drops below 90/100, investigate root cause
- All plans have automated verification gates

---

## Success Criteria Summary

**After Phase 04B-3 Complete (All 3 Plans):**

- [x] 3 plans created (04B-3-01, 04B-3-02, 04B-3-03)
- [ ] All plans executed successfully (pending execution)
- [ ] HonoContext removed from mass/coercion.ts
- [ ] Beam RPC type system documented with @deprecated notices
- [ ] Zenith Hono dependency audited and removed
- [ ] All tests pass in mass, beam, zenith (100% success rate)
- [ ] TypeScript typecheck passes monorepo-wide (0 errors)
- [ ] Health score maintained ≥90/100 (target: 93/100)
- [ ] All decisions (D-01, D-02, D-03) implemented

---

## Next Steps

### Immediate (After Approval)
1. Review and approve three PLAN.md files
2. Assign executor(s) to Wave 1 tasks (parallel execution)
3. Execute: `/gsd:execute-phase 04B-3`

### Execution Flow
1. Executor reads each PLAN.md independently
2. Each plan creates SUMMARY.md upon completion
3. Three SUMMARY files generated in parallel
4. Consolidate results into 04B-3-VERIFICATION.md
5. Commit all changes

### Post-Execution
1. Verify D-01, D-02, D-03 decisions fully implemented
2. Confirm Phase 4A baseline (93/100) maintained
3. Plan Phase 4B-4 (Platform Adapter Decision)
4. Plan Phase 4B-5 (RPC Client Strategy) — depends on 04B-3-02 results

---

## Appendix: File References

### Phase Context Documents
- `.planning/phases/04B-3-external-package-type-cleanup/04B-3-CONTEXT.md` — Phase context and decisions
- `.planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md` — Migration strategy (6 sub-phases)

### Project Context
- `.planning/PROJECT.md` — Project principles and constraints
- `.planning/STATE.md` — Current project state (Phase 4B planning complete)
- `.planning/REQUIREMENTS.md` — Project requirements

### Code Files
- `packages/mass/src/coercion.ts` — HonoContext usage (line 304)
- `packages/beam/src/index.ts` — Hono generic constraint (line 49)
- `packages/beam/src/helpers.ts` — Hono generic constraint (line 45)
- `packages/zenith/package.json` — Hono dependency (line 37)

### Prior Execution Summaries
- `.planning/phases/04B-2-jwt-native-implementation/04B-2-01-SUMMARY.md` — Phase 04B-2 completion (reference)

---

**Planning Date:** 2026-03-26
**Planner:** Claude Code (Haiku 4.5)
**Status:** ✅ PLANNING COMPLETE — Ready for execution
**Commit:** 4d9fa97d (docs(04B-3): create phase plan for external package type cleanup)

