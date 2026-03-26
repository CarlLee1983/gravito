---
phase: 04B-hono-migration-pending
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md
autonomous: true
requirements:
  - MIGRATE-01
  - MIGRATE-02
  - MIGRATE-03
  - MIGRATE-04
  - MIGRATE-05

must_haves:
  truths:
    - "Migration roadmap exists with 6 phases clearly sequenced (4B-1 through 4B-6)"
    - "Package migration order is determined based on dependency analysis"
    - "Backwards compatibility strategy documented with dual-API pattern"
    - "Test strategy for old+new APIs defined with parallel test approach"
    - "Risk assessment identifies blocking issues and mitigation strategies"
  artifacts:
    - path: ".planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md"
      provides: "Complete migration roadmap with phases, sequencing, risks, compatibility strategy"
      min_lines: 200
  key_links:
    - from: "MIGRATION_ROADMAP.md"
      to: "04B-RESEARCH.md"
      via: "References research findings for compat shim inventory"
      pattern: "4B-1.*4B-2.*4B-3"
---

<objective>
Create the comprehensive Hono migration roadmap document that charts the 2-3 week execution path for removing Hono compat shims from photon and fixing type dependencies in beam/mass.

Purpose: This is the strategic planning document that all Phase 4B-N execution plans will reference. It captures the sequencing logic, dependency analysis, backwards compatibility patterns, test strategy, and risk assessment in one canonical document.

Output: `MIGRATION_ROADMAP.md` — the single source of truth for Hono migration execution.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/04B-hono-migration-pending/04B-CONTEXT.md
@.planning/phases/04B-hono-migration-pending/04B-RESEARCH.md
@.planning/DECISION_SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create MIGRATION_ROADMAP.md with full migration sequencing</name>
  <files>.planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md</files>
  <read_first>
    - .planning/phases/04B-hono-migration-pending/04B-RESEARCH.md (compat shim inventory, dependency graph, phase sequencing)
    - .planning/phases/04B-hono-migration-pending/04B-CONTEXT.md (user decisions D-01 through D-04)
    - .planning/DECISION_SUMMARY.md (D-05/D-06 migration readiness)
    - .planning/STATE.md (current health score 93/100, test baseline)
  </read_first>
  <action>
    Create `.planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md` containing the following sections:

    **1. Executive Summary**
    - State: Core packages already Hono-free (core, atlas, signal, stream, luminosity)
    - Scope: 12 compat shim files in photon + 3 external production files (beam, mass, zenith)
    - Timeline: 2-3 weeks (not 2-3 months per D-01 original estimate — research reduced scope)
    - Baseline: Health 93/100, 99.7% test pass, 0 TypeScript errors

    **2. Current Hono Dependency Map**
    Create a table of all 12 photon compat shim files from RESEARCH.md "What Still Has Hono" section:
    - `src/bun.ts` — hono/bun re-export
    - `src/client.ts` — hono/client re-export (RPC)
    - `src/http-exception.ts` — hono/http-exception re-export
    - `src/jwt.ts` — hono/jwt require
    - `src/logger.ts` — hono/logger re-export
    - `src/router/reg-exp-router.ts` — hono/router/reg-exp-router re-export
    - `src/router/trie-router.ts` — hono/router/trie-router re-export
    - `src/adapter/cloudflare.ts` — hono/cloudflare-workers re-export
    - `src/adapter/deno.ts` — hono/deno re-export
    - `src/adapter/vercel.ts` — hono/vercel re-export
    - `src/middleware/websocket.ts` — hono/ws types
    - `src/openapi.ts` — @hono/zod-openapi

    For each, include columns: File | Current Hono Import | Migration Action (Remove/Replace/Isolate/Defer) | Risk Level | Phase

    Also list external packages:
    - `beam/src/index.ts`, `beam/src/helpers.ts` — type Hono (RPC generics) — Phase 4B-3
    - `mass/src/coercion.ts` — type HonoContext (native cast) — Phase 4B-3
    - `zenith/package.json` — hono dependency (possibly unused) — Phase 4B-3

    **3. Migration Phases (6 phases)**

    Phase 4B-1: Easy Compat Shim Replacements (Week 1)
    - http-exception.ts: Re-export from @gravito/core HTTPException
    - router/reg-exp-router.ts: Deprecate, forward to RadixRouter
    - router/trie-router.ts: Deprecate, forward to RadixRouter
    - logger.ts: Native request logger (~20 lines)
    - middleware/websocket.ts: Use websocket-native.ts types only
    - Gate: `bun test packages/photon` passes, `bun run typecheck` 0 errors

    Phase 4B-2: JWT Native Implementation (Week 1-2)
    - jwt.ts: Replace hono/jwt with native implementation using `jose` or Bun crypto
    - Must maintain same function signature: jwt(options), sign(), verify(), decode()
    - Gate: Existing JWT tests pass + new native JWT tests added

    Phase 4B-3: External Package Type Cleanup (Week 2)
    - mass/coercion.ts: Replace `HonoContext` type cast with `GravitoContext`
    - beam: Assess RPC type system — keep hono/client as type-only peerDependency (per research recommendation)
    - zenith: Verify if hono dependency is actually used; remove if unused
    - Gate: `bun test packages/mass` + `bun test packages/beam` pass, typecheck 0 errors

    Phase 4B-4: Platform Adapter Decision (Week 2)
    - cloudflare.ts, deno.ts, vercel.ts — Decision: Keep as @deprecated with Hono re-exports (per research)
    - Scope to optional sub-path `@gravito/photon/adapters/`
    - Mark all 3 as `@deprecated v2.0` with JSDoc
    - Gate: No test regressions

    Phase 4B-5: RPC Client Strategy (Week 2-3)
    - Keep `hono/client` as type-only peerDependency in photon (per research)
    - Move beam's hono/client usage to `@gravito/beam` internal (not re-exported from photon)
    - Add deprecation notice: removal target v3.0
    - Gate: beam tests pass, typecheck 0 errors

    Phase 4B-6: OpenAPI Scoping and Cleanup (Week 3)
    - Keep @hono/zod-openapi as dependency of `/openapi` sub-path only
    - Ensure PhotonOpenAPI only imported via `@gravito/photon/openapi`
    - Update package.json: move @hono/zod-openapi to optional peer dependency
    - Remove `bun.ts` compat shim (replace with native Bun serve helpers)
    - Final: Remove hono from photon's main production dependencies if possible
    - Gate: Full test suite passes, typecheck 0 errors, health score >= 90/100

    **4. Wave Structure for Parallel Execution**

    ```
    Wave 1: Phase 4B-1 (easy shims) — independent
    Wave 2: Phase 4B-2 (JWT) — depends on 4B-1 (shared photon package)
             Phase 4B-3 (mass/beam/zenith) — depends on 4B-1 (photon types may change)
    Wave 3: Phase 4B-4 (platform adapters) — depends on 4B-2, 4B-3
             Phase 4B-5 (RPC client) — depends on 4B-3 (beam assessment)
    Wave 4: Phase 4B-6 (OpenAPI + final cleanup) — depends on all above
    ```

    **5. Backwards Compatibility Strategy (per D-02)**
    - Pattern A: Type alias bridge — for type-only migrations (mass, beam)
    - Pattern B: Function delegation — for runtime migrations (jwt, logger)
    - Pattern C: Re-export bridge — for module re-exports (http-exception)
    - All old import paths continue working during v1.x
    - Deprecation warnings added in v2.x
    - Removal in v3.x

    **6. Test Strategy (per D-04)**
    - Keep ALL existing tests green throughout (no test removal)
    - For each replaced shim: add new test verifying native behavior matches old
    - Test files to create: `packages/photon/tests/native/` directory for new native tests
    - Gate after each phase: `bun test packages/photon --timeout=10000` must pass
    - Full suite gate: `bun test --timeout=10000` after each phase

    **7. Risk Assessment**
    Document these risks with probability/impact/mitigation:
    - Beam RPC type system breakage (HIGH impact, addressed by keeping hono/client)
    - OpenAPI replacement complexity (HIGH effort, addressed by scoping not replacing)
    - Test count regression during migration (MEDIUM, addressed by D-04 no-removal policy)
    - Mass hidden Hono dependency (LOW, type-only change)
    - Health score regression below 90/100 (MEDIUM, gate after each phase)

    **8. Success Criteria**
    - All 12 compat shims addressed (removed, replaced, or explicitly scoped/deferred)
    - 3 external package Hono references resolved (mass, beam, zenith)
    - Health score maintained >= 90/100 throughout
    - Zero breaking changes to public API (per D-02)
    - All existing tests pass after migration complete
    - hono removed from photon's main production dependencies (may remain as peer dep for /openapi and /client paths)

    **9. Open Questions (from research)**
    - Beam RPC native type system — deferred to v3.0
    - Platform adapter Hono dependency — kept as deprecated paths
    - OpenAPI replacement library — deferred, keep @hono/zod-openapi
  </action>
  <verify>
    <automated>test -f .planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md && wc -l .planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md | awk '{if ($1 >= 200) print "PASS: " $1 " lines"; else print "FAIL: only " $1 " lines"}'</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `.planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md`
    - Contains "Phase 4B-1" through "Phase 4B-6" section headers
    - Contains "Backwards Compatibility" section with Pattern A/B/C
    - Contains "Risk Assessment" section
    - Contains "Test Strategy" section referencing D-04
    - Contains wave structure showing parallel execution paths
    - File is >= 200 lines
  </acceptance_criteria>
  <done>
    MIGRATION_ROADMAP.md exists with all 9 sections: executive summary, dependency map, 6 migration phases, wave structure, backwards compat strategy, test strategy, risk assessment, success criteria, open questions. Document is the canonical reference for all Phase 4B-N execution.
  </done>
</task>

<task type="auto">
  <name>Task 2: Update ROADMAP.md and STATE.md with Phase 4B planning results</name>
  <files>.planning/ROADMAP.md, .planning/STATE.md</files>
  <read_first>
    - .planning/ROADMAP.md (current roadmap — update Phase 4B section)
    - .planning/STATE.md (current state — update status and next steps)
    - .planning/phases/04B-hono-migration-pending/MIGRATION_ROADMAP.md (just created — reference for plan count)
  </read_first>
  <action>
    **Update ROADMAP.md:**
    1. Find the "Phase 4B: Hono Migration (PENDING)" section
    2. Update it to:
       - Status: PLANNED (not PENDING)
       - Goal: Execute Hono compat shim migration — remove/replace 12 photon compat shims, fix 3 external type dependencies, maintain health score >= 90/100
       - Plans: 2 plans (04B-01: Migration Roadmap, 04B-02: Phase 4B-1 Execution Plan)
       - Sub-phases: 6 execution phases (4B-1 through 4B-6) over 2-3 weeks
       - Add plan list:
         ```
         Plans:
         - [ ] 04B-01-PLAN.md — Migration roadmap creation
         - [ ] 04B-02-PLAN.md — Phase 4B-1 execution plan (easy compat shim replacements)
         ```
    3. Add Phase 4B timeline row: Duration "2-3 weeks", Status "Planned"

    **Update STATE.md:**
    1. Update `current_phase` to: `04B (Phase 4B PLANNED)`
    2. Update `status` to: `planned`
    3. Update `last_updated` to current date
    4. Add Phase 4B section under Progress Summary:
       - Phase 4B: Hono Migration Planning — PLANNED
       - 2 plans created (roadmap + first execution plan)
       - 6 sub-phases identified (4B-1 through 4B-6)
       - Timeline: 2-3 weeks execution
       - Baseline: Health 93/100, 99.7% test pass rate
    5. Update Next Steps to show Phase 4B-1 execution as next action
  </action>
  <verify>
    <automated>grep -c "PLANNED" .planning/ROADMAP.md && grep -c "04B" .planning/STATE.md</automated>
  </verify>
  <acceptance_criteria>
    - ROADMAP.md contains "PLANNED" for Phase 4B section
    - ROADMAP.md contains "04B-01-PLAN.md" and "04B-02-PLAN.md" in plan list
    - STATE.md contains "04B" in current_phase
    - STATE.md contains Phase 4B progress section
  </acceptance_criteria>
  <done>
    ROADMAP.md updated with Phase 4B plan details and timeline. STATE.md updated with current phase status and next steps pointing to Phase 4B-1 execution.
  </done>
</task>

</tasks>

<verification>
1. MIGRATION_ROADMAP.md exists and is >= 200 lines
2. MIGRATION_ROADMAP.md contains all 6 phase descriptions (4B-1 through 4B-6)
3. ROADMAP.md updated with Phase 4B planned status
4. STATE.md updated with Phase 4B planning results
</verification>

<success_criteria>
- Migration roadmap document created with complete sequencing analysis
- All user decisions (D-01 through D-04) reflected in the roadmap
- No deferred ideas included (E2E expansion, performance optimization, satellite migration)
- ROADMAP.md and STATE.md reflect Phase 4B planning completion
- Phase 4B-1 scope clearly defined for immediate execution
</success_criteria>

<output>
After completion, create `.planning/phases/04B-hono-migration-pending/04B-01-SUMMARY.md`
</output>
