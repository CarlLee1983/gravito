---
phase: 04B-hono-migration-pending
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/phases/04B-hono-migration-pending/04B-1-EXECUTION-PLAN.md
autonomous: true
requirements:
  - MIGRATE-06

must_haves:
  truths:
    - "Phase 4B-1 execution plan has concrete tasks with file paths, actions, and verification commands"
    - "Each compat shim replacement has a before/after code example"
    - "Test verification commands are specified for every task"
    - "Dependency order within Phase 4B-1 is explicit (which shims can be done in parallel)"
  artifacts:
    - path: ".planning/phases/04B-hono-migration-pending/04B-1-EXECUTION-PLAN.md"
      provides: "Ready-to-execute plan for Phase 4B-1 (easy compat shim replacements)"
      min_lines: 150
  key_links:
    - from: "04B-1-EXECUTION-PLAN.md"
      to: "MIGRATION_ROADMAP.md"
      via: "Implements Phase 4B-1 from the roadmap"
      pattern: "Phase 4B-1"
---

<objective>
Create the detailed execution plan for Phase 4B-1 — the first migration step replacing 5 low-risk photon compat shims with native implementations.

Purpose: This plan will be directly consumed by an executor agent to implement the first batch of Hono removals. It must contain exact file paths, code patterns, before/after examples, and verification commands — no ambiguity.

Output: `04B-1-EXECUTION-PLAN.md` — ready for `/gsd:execute-phase 4B-1`
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/04B-hono-migration-pending/04B-CONTEXT.md
@.planning/phases/04B-hono-migration-pending/04B-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Phase 4B-1 execution plan with concrete implementation details</name>
  <files>.planning/phases/04B-hono-migration-pending/04B-1-EXECUTION-PLAN.md</files>
  <read_first>
    - .planning/phases/04B-hono-migration-pending/04B-RESEARCH.md (compat shim details, code examples, target patterns)
    - .planning/phases/04B-hono-migration-pending/04B-CONTEXT.md (D-02 backwards compat, D-04 test strategy)
    - packages/photon/src/http-exception.ts (current compat shim — see actual code)
    - packages/photon/src/logger.ts (current compat shim — see actual code)
    - packages/photon/src/router/reg-exp-router.ts (current compat shim)
    - packages/photon/src/router/trie-router.ts (current compat shim)
    - packages/photon/src/middleware/websocket.ts (current compat shim)
    - packages/photon/tests/exports.test.ts (existing test — understand what's tested)
    - packages/core/src/index.ts (verify HTTPException is exported from core)
    - packages/core/src/adapters/bun/radix-router.ts (verify RadixRouter exists)
    - packages/photon/src/middleware/websocket-native.ts (verify native WS types exist)
  </read_first>
  <action>
    Create `.planning/phases/04B-hono-migration-pending/04B-1-EXECUTION-PLAN.md` with the following structure:

    **Header:**
    - Title: "Phase 4B-1: Easy Compat Shim Replacements — Execution Plan"
    - Timeline: ~1 week
    - Scope: 5 compat shim files in packages/photon/src/
    - Preconditions: Phase 4A complete, health 93/100, typecheck 0 errors

    **For each of the 5 shims, create a task block containing:**

    ---

    **Task 1: Replace http-exception.ts**
    - File: `packages/photon/src/http-exception.ts`
    - Current code: Read the actual file and include current content
    - Target code: Re-export HTTPException from @gravito/core (verify the exact export path by reading core's index.ts)
    - Pattern: Pattern C (Re-export bridge) per D-02
    - Backwards compat: `import { HTTPException } from '@gravito/photon'` must still work
    - Verify: `bun test packages/photon/tests/exports.test.ts` — grep for HTTPException test
    - Risk: LOW

    **Task 2: Deprecate router/reg-exp-router.ts**
    - File: `packages/photon/src/router/reg-exp-router.ts`
    - Current code: Read actual file
    - Target code: Add @deprecated JSDoc, re-export as type-only or bridge to RadixRouter
    - Note: RadixRouter location from core — verify exact import path
    - Verify: `bun run typecheck` — no new errors
    - Risk: LOW

    **Task 3: Deprecate router/trie-router.ts**
    - File: `packages/photon/src/router/trie-router.ts`
    - Current code: Read actual file
    - Target code: Same pattern as reg-exp-router — add @deprecated, bridge or remove
    - Verify: `bun run typecheck` — no new errors
    - Risk: LOW

    **Task 4: Replace logger.ts**
    - File: `packages/photon/src/logger.ts`
    - Current code: Read actual file
    - Target code: Native request logger (~20 lines) that logs method, path, status, duration
    - Function signature must match hono/logger: `logger()` returns middleware
    - Implementation: Use `GravitoMiddleware` type, measure `Date.now()` before/after `await next()`
    - Verify: `bun test packages/photon` — ensure no test regression
    - Risk: LOW

    **Task 5: Update middleware/websocket.ts**
    - File: `packages/photon/src/middleware/websocket.ts`
    - Current code: Read actual file (imports from hono/ws)
    - Target code: Use websocket-native.ts types exclusively
    - Reference: `packages/photon/src/middleware/websocket-native.ts` — read to understand native types
    - Verify: `bun test packages/photon` — ensure no WS test regression
    - Risk: LOW

    ---

    **Dependency Analysis within Phase 4B-1:**
    - All 5 tasks are independent (different files, no cross-references)
    - Can be executed in any order or in parallel
    - Recommended order: http-exception first (simplest), then routers, then logger, then websocket

    **Verification Gates:**
    After all 5 tasks:
    1. `bun test packages/photon --timeout=10000` — all existing tests pass
    2. `bun run typecheck` — 0 errors (83/83 packages)
    3. `bun test --timeout=10000` — full suite, no new regressions (fail count <= 40)
    4. Verify exports: `bun -e "const p = require('./packages/photon/dist/index.js'); console.log(Object.keys(p).length)"` — same export count as before

    **Rollback Strategy:**
    - Each task is a single file change — revert individual commits if needed
    - No cross-file dependencies within Phase 4B-1
    - If any gate fails, revert the specific task that broke it

    **New Test Files to Create (per D-04):**
    For each replaced shim, add a test in `packages/photon/tests/native/`:
    - `native-http-exception.test.ts` — verify HTTPException from core matches old behavior
    - `native-logger.test.ts` — verify native logger middleware works
    - No new tests needed for router deprecations or websocket (existing tests sufficient)

    Include the complete test file content for each new test file.
  </action>
  <verify>
    <automated>test -f .planning/phases/04B-hono-migration-pending/04B-1-EXECUTION-PLAN.md && wc -l .planning/phases/04B-hono-migration-pending/04B-1-EXECUTION-PLAN.md | awk '{if ($1 >= 150) print "PASS: " $1 " lines"; else print "FAIL: only " $1 " lines"}'</automated>
  </verify>
  <acceptance_criteria>
    - File exists at `.planning/phases/04B-hono-migration-pending/04B-1-EXECUTION-PLAN.md`
    - Contains 5 task blocks (http-exception, reg-exp-router, trie-router, logger, websocket)
    - Each task block has: current code, target code, verification command
    - Contains "Verification Gates" section with 4 automated commands
    - Contains "Rollback Strategy" section
    - Contains new test file content for native-http-exception.test.ts and native-logger.test.ts
    - File is >= 150 lines
  </acceptance_criteria>
  <done>
    04B-1-EXECUTION-PLAN.md exists with 5 concrete task blocks, each containing current code, target code, and verification commands. Verification gates defined. New test files specified. Plan is ready for direct execution by `/gsd:execute-phase`.
  </done>
</task>

</tasks>

<verification>
1. 04B-1-EXECUTION-PLAN.md exists and is >= 150 lines
2. Contains all 5 compat shim replacement tasks with before/after code
3. Verification gates are automated commands (not manual checks)
4. New test files are specified with complete content
</verification>

<success_criteria>
- Phase 4B-1 execution plan is concrete enough for a Claude executor to implement without interpretation
- All 5 compat shim tasks have exact file paths, current code, target code, and verification
- Test strategy follows D-04 (no test removal, parallel new tests added)
- Backwards compatibility maintained per D-02 (old import paths still work)
</success_criteria>

<output>
After completion, create `.planning/phases/04B-hono-migration-pending/04B-02-SUMMARY.md`
</output>
