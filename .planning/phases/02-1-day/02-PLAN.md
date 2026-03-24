---
phase: 02-1-day
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/DECISION_SUMMARY.md
  - .planning/STATE.md
  - packages/fortify/package.json
  - packages/graphql/package.json
  - packages/pulse/package.json
  - packages/spectrum/package.json
autonomous: false
requirements: []

must_haves:
  truths:
    - "Phase 1 results are triaged and impact assessed"
    - "Photon and Signal dist bundles verified importable"
    - "4 implicit atlas dependencies are declared and resolved"
    - "Strategic decision on Phase 2B/2C sequencing is locked"
    - "Health score improvement path is clear (78/100 → ≥90/100)"

  artifacts:
    - path: ".planning/DECISION_SUMMARY.md"
      provides: "Executive summary of Phase 1 findings and Phase 2 strategy"
      must_contain: "Health score baseline | Fix strategy selection | Hono Phase 4-5 readiness assessment"

    - path: ".planning/phases/01-1-2-days/HEALTH_CHECK_REPORT.md"
      provides: "Detailed Phase 1 results"
      must_exist: true

    - path: "packages/fortify/package.json"
      provides: "Explicit @gravito/atlas dependency"
      must_contain: '"@gravito/atlas": "workspace:*"'

    - path: "packages/graphql/package.json"
      provides: "Explicit @gravito/atlas dependency"
      must_contain: '"@gravito/atlas": "workspace:*"'

    - path: "packages/pulse/package.json"
      provides: "Explicit @gravito/atlas dependency"
      must_contain: '"@gravito/atlas": "workspace:*"'

    - path: "packages/spectrum/package.json"
      provides: "Explicit @gravito/atlas dependency"
      must_contain: '"@gravito/atlas": "workspace:*"'

  key_links:
    - from: ".planning/DECISION_SUMMARY.md"
      to: ".planning/phases/01-1-2-days/HEALTH_CHECK_REPORT.md"
      via: "strategic assessment based on Phase 1 data"
      pattern: "Health score 78/100 analysis"

    - from: "packages/*/package.json"
      to: "bun.lock"
      via: "dependency resolution"
      pattern: "@gravito/atlas.*workspace"

    - from: ".planning/STATE.md"
      to: ".planning/DECISION_SUMMARY.md"
      via: "decision logging"
      pattern: "Phase 2 strategy locked"

---

<objective>
Evaluate Phase 1 health check results and lock in strategic direction for Phase 2B/2C execution.

Purpose: Phase 1 identified critical issues (photon/signal dist - now fixed) and 9 high-priority items. Phase 2 assesses impact, validates fixes, addresses quick wins (implicit deps), and decides on full repair sequence before proceeding to Hono Phase 4-5.

Output: DECISION_SUMMARY.md + validated fix for implicit dependencies + verification that critical issues are resolved
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/02-1-day/02-CONTEXT.md
@.planning/phases/02-1-day/02-RESEARCH.md
@.planning/phases/01-1-2-days/HEALTH_CHECK_REPORT.md
@.planning/phases/01-1-2-days/ISSUES_PRIORITIZED.md
@.planning/codebase/CONCERNS.md
@.planning/codebase/STACK.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Assess Phase 1 Results & Create Decision Summary</name>
  <files>.planning/DECISION_SUMMARY.md</files>
  <read_first>
    - .planning/phases/01-1-2-days/HEALTH_CHECK_REPORT.md
    - .planning/phases/01-1-2-days/ISSUES_PRIORITIZED.md
    - .planning/phases/01-1-2-days/NEXT_STEPS.md
    - .planning/phases/02-1-day/02-CONTEXT.md
  </read_first>
  <action>
Create DECISION_SUMMARY.md documenting Phase 1 results and Phase 2 strategy.

Structure:
1. **Executive Summary** — Health score 78/100, baseline metrics (11,556 pass / 162 fail / 0 type errors / 0 circular deps)
2. **Critical Issues Assessment** — photon/signal dist bundles: Issue identified in Phase 1, fixed in commit e3a182f6, NOW: Verify imports work cleanly
3. **High-Priority Issues Breakdown** — 9 high-priority items:
   - Implicit dependencies (4 packages: fortify/graphql/pulse/spectrum missing @gravito/atlas) → Phase 2 Batch 1 (30 min estimated)
   - Middleware isolation tests (core package) → Phase 2 Batch 2 (2-4h estimated)
   - Test failures: launchpad (35), monolith (21), scaffold (15) → Phase 2 Batch 2 (investigation required)
4. **Strategic Decision** — Sequential bundles approach (D-01):
   - Phase 2A: Fix Critical + implicit deps (THIS PLAN)
   - Phase 2B: Fix High-priority test failures + middleware (NEXT PLAN)
   - Phase 2C: Defer Medium/Low to backlog
5. **Success Metrics** — Health score ≥90/100 target, test pass rate targets per bundle
6. **Hono Phase 4-5 Readiness** — Blocks until Phase 2B complete (per D-05)
7. **Next Steps** — Execute Phase 2A validation, then Phase 2B investigations

Per D-01 through D-06 from 02-CONTEXT.md, lock in decisions in this document.
  </action>
  <verify>
    <automated>grep -l "Health score" .planning/DECISION_SUMMARY.md && grep -l "Sequential bundles" .planning/DECISION_SUMMARY.md && grep -l "Phase 2A:" .planning/DECISION_SUMMARY.md</automated>
  </verify>
  <acceptance_criteria>
    - File .planning/DECISION_SUMMARY.md exists with ≥500 words
    - Contains "78/100" (baseline health score)
    - Contains explicit Phase 2A/2B/2C sequencing
    - Contains Hono Phase 4-5 readiness assessment
    - Lists all 9 high-priority items and their categories
    - All D-01 through D-06 decisions referenced
  </acceptance_criteria>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Verify Phase 1 Photon/Signal Dist Bundle Fixes</name>
  <what-built>
Photon and Signal dist bundles were rebuilt in Phase 2A (commit e3a182f6):
- photon: Fixed via post-build patch to dist/index.js (addressing Bun v1.3.10 bundler bug)
- signal: Switched to tsup for ESM/CJS generation with proper lazy-load handling

This task verifies the fixes are actually working in isolation before proceeding to implicit dependency fixes.
  </what-built>
  <how-to-verify>
Run these verification steps:

1. **Photon import test:**
   ```bash
   cd /Users/carl/Dev/Carl/gravito-core
   node -e "const p = require('./packages/photon/dist/index.js'); console.log('Photon exports:', Object.keys(p).length); console.log('Photon class exists:', !!p.Photon);"
   ```
   Expected: "Photon exports: 20" and "Photon class exists: true"

2. **Signal ESM import test:**
   ```bash
   node --input-type=module -e "import('./packages/signal/dist/index.mjs').then(m => console.log('Signal ESM exports:', Object.keys(m).length, 'OrbitSignal exists:', !!m.OrbitSignal));"
   ```
   Expected: "Signal ESM exports: 20" and "OrbitSignal exists: true"

3. **Signal CJS import test:**
   ```bash
   node -e "const s = require('./packages/signal/dist/index.cjs'); console.log('Signal CJS exports:', Object.keys(s).length); console.log('OrbitSignal exists:', !!s.OrbitSignal);"
   ```
   Expected: "Signal CJS exports: 20" and "OrbitSignal exists: true"

4. **Dependency verification (photon):**
   ```bash
   grep -A 5 '"dependencies"' packages/photon/package.json | head -10
   ```
   Should show photon has proper dependencies declared

All three imports must work cleanly without errors. If any fail, the dist bundles are not properly fixed.
  </how-to-verify>
  <resume-signal>
Type "verified" if all 4 checks pass cleanly, or describe any errors found (e.g., "Signal CJS import failed: OrbitSignal is undefined")
  </resume-signal>
</task>

<task type="auto">
  <name>Task 2: Fix 4 Implicit Atlas Dependencies</name>
  <files>
    - packages/fortify/package.json
    - packages/graphql/package.json
    - packages/pulse/package.json
    - packages/spectrum/package.json
  </files>
  <read_first>
    - packages/fortify/package.json
    - packages/graphql/package.json
    - packages/pulse/package.json
    - packages/spectrum/package.json
    - .planning/codebase/CONCERNS.md
  </read_first>
  <action>
Add explicit `@gravito/atlas` dependency to 4 packages that import it but don't declare it.

For each of fortify, graphql, pulse, spectrum:
1. Read the current package.json
2. Locate the "dependencies" section
3. Add line (if not already present): `"@gravito/atlas": "workspace:*",`
4. Ensure JSON is valid (proper comma placement)
5. Save file

These packages are identified in .planning/codebase/CONCERNS.md as having implicit (undeclared) dependencies on @gravito/atlas, which causes workspace resolution issues.

After edits, run:
```bash
bun install
```

Verify no errors appear in bun output.
  </action>
  <verify>
    <automated>for pkg in fortify graphql pulse spectrum; do grep -q '"@gravito/atlas": "workspace:\*"' packages/$pkg/package.json && echo "$pkg: OK" || echo "$pkg: MISSING"; done</automated>
  </verify>
  <acceptance_criteria>
    - All 4 package.json files contain `"@gravito/atlas": "workspace:*"` in dependencies
    - bun install completes without errors
    - No new circular dependencies introduced (verified by running dependency graph check)
    - Implicit dependency issue resolved for these 4 packages
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: Verify Full Test Suite & TypeCheck After Fixes</name>
  <files>.planning/STATE.md</files>
  <read_first>
    - .planning/STATE.md
    - .planning/ROADMAP.md
  </read_first>
  <action>
Run Phase 2A verification gates to confirm critical fixes are stable:

1. **Full test suite (from repo root):**
   ```bash
   cd /Users/carl/Dev/Carl/gravito-core
   bun test 2>&1 | tee test-results-phase2a.log
   ```

   Extract summary:
   - Total tests run
   - Pass count
   - Fail count
   - Skip count
   - Report if fail count is LOWER than Phase 1 baseline (162)

2. **TypeScript check:**
   ```bash
   bun run typecheck 2>&1 | tee typecheck-results-phase2a.log
   ```

   Extract summary:
   - Error count (must be 0)
   - Warning count

3. **Implicit dependency verification:**
   ```bash
   bun install --frozen-lockfile 2>&1 | tee install-results-phase2a.log
   ```

   Must complete without errors.

4. **Update STATE.md** — Record Phase 2A progress:
   - Test pass/fail counts
   - TypeCheck status (errors: 0?)
   - Implicit dependency fix status: COMPLETE
   - Photon/Signal dist status: VERIFIED
   - Next phase readiness assessment

Store logs in `.planning/phases/02-1-day/` for reference.

Expected outcome: Same or better than Phase 1 baseline (11,556 pass / 162 fail / 0 type errors). If fail count increased, investigate and fix before proceeding.
  </action>
  <verify>
    <automated>test -f test-results-phase2a.log && grep -q "tests" test-results-phase2a.log && grep -q "failed\|passed" test-results-phase2a.log</automated>
  </verify>
  <acceptance_criteria>
    - test-results-phase2a.log exists and contains test summary
    - typecheck-results-phase2a.log exists and shows "0 errors" (or "no errors")
    - install-results-phase2a.log exists and shows successful install
    - STATE.md updated with Phase 2A results and assessment
    - Test fail count is ≤162 (not increased from Phase 1)
    - No new type errors introduced
  </acceptance_criteria>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Review Phase 2A Completion & Decide on Phase 2B</name>
  <what-built>
Phase 2A execution complete:
- DECISION_SUMMARY.md created with strategic assessment
- Phase 1 Photon/Signal fixes verified importable
- 4 implicit atlas dependencies fixed in fortify/graphql/pulse/spectrum
- Full test suite re-run, typecheck verified
- STATE.md updated with Phase 2A results

This checkpoint verifies the Phase 2A work is stable before proceeding to Phase 2B (middleware/launchpad/monolith/scaffold investigations).
  </what-built>
  <how-to-verify>
Review these artifacts:

1. **DECISION_SUMMARY.md** exists and contains:
   - Health score baseline (78/100)
   - Phase 2A/2B/2C sequencing strategy
   - Hono Phase 4-5 readiness assessment (blocked until 2B)

2. **Test results** (Phase 2A):
   - Test suite: Same or better than Phase 1 (11,556 pass / 162 fail / 207 skip)
   - TypeCheck: 0 errors
   - Implicit deps fixed: 4 packages now have @gravito/atlas declared

3. **STATE.md** updated with:
   - "Phase 2A: COMPLETE"
   - New test baseline numbers (should be ≤162 failures)
   - Implicit dependency status: RESOLVED (4/4 packages fixed)
   - Next: "Phase 2B investigations ready"

4. **No regressions:**
   - Type errors: still 0
   - Circular dependencies: still 0
   - Test failures not increased

If Phase 2A is stable (all checks pass), Phase 2B planning can proceed with confidence.
  </how-to-verify>
  <resume-signal>
Type "phase-2a-approved" to proceed with Phase 2B planning, or describe any issues found (e.g., "test count increased to 170 failures", "typecheck now shows 3 errors")
  </resume-signal>
</task>

</tasks>

<verification>
Phase 2A completion verified when:
1. DECISION_SUMMARY.md created with strategic assessment
2. All 3 dist bundle imports verified (photon ESM, signal ESM, signal CJS)
3. 4 implicit dependencies fixed and dependencies resolved
4. Test suite and typecheck re-run with no regressions
5. STATE.md reflects Phase 2A completion
6. Human confirms Phase 2A is stable before Phase 2B
</verification>

<success_criteria>
- [x] Phase 1 results assessed and documented in DECISION_SUMMARY.md
- [x] Critical dist bundle fixes verified working
- [x] 4 implicit atlas dependencies declared and resolved
- [x] Full test/typecheck pass with no new failures
- [x] Health score improvement path clear (78/100 baseline → ≥90/100 target)
- [x] Phase 2B investigations roadmap established
- [x] Hono Phase 4-5 readiness assessment locked (blocked until 2B complete)
</success_criteria>

<output>
After completion, create `.planning/phases/02-1-day/02-01-SUMMARY.md` documenting:
- Phase 2A execution results (dist fixes verified, implicit deps fixed)
- Test baseline after Phase 2A (should match or improve from Phase 1)
- Strategic decisions locked (sequential bundles strategy)
- Readiness for Phase 2B (investigations on middleware/launchpad/monolith/scaffold)
</output>
