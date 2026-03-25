# Phase 3: Fix Critical Issues (If Needed) - Research

**Researched:** 2026-03-25
**Domain:** Critical issue verification & serial fix execution in monorepos
**Confidence:** HIGH

## Summary

Phase 3 conditionally fixes all Critical priority issues identified in Phase 1 or Phase 2 execution. This research establishes verification patterns for stable fix validation, discovery timing to detect new Critical issues, serial execution workflow to prevent cascading failures, and rollback decision frameworks to maintain framework stability.

**Primary recommendation:** Implement continuous verification gates (typecheck + full test suite after every fix) with explicit rollback thresholds to prevent fix-induced regressions. Use sequential bundling pattern from Phase 2 (one fix at a time) for complete traceability and root cause isolation.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Fix by Impact Scope**
- Prioritize fixes by widest impact first (issues affecting most packages)
- Single-package problems fixed after broad-impact issues
- Rationale: Build stable foundation, prevent cascading failures
- Source: ISSUES_PRIORITIZED.md will contain impact scope data

**D-02: Full Verification After Each Fix**
- After each Critical fix: `bun run typecheck` (must be 0 errors) + `bun test` (full suite)
- No shortened verification — 30+ min execution acceptable
- Rationale: Avoid modification-induced regressions before moving to next fix
- Checklist: typecheck pass → fix-related tests pass → full test suite pass

**D-03: Fix ALL Critical Issues**
- Regardless of count (1 to 5+), fix all to zero Critical issues
- Extend timeline rather than skip issues
- Rationale: Stable foundation before Hono Phase 4-5
- Time budget: 2-3 days if 5+ Critical issues found

**D-04: Rollback on New Failures**
- If fix introduces 1+ new test failures → rollback fix
- Document as "failed fix, defer to Phase 4+"
- Exception: Environmental issues (confirmed with additional testing) can be retained
- Rationale: Avoid masking pre-existing issues
- Decision point: Full test suite run post-fix shows increase in fail count

**D-05: Serial Fix Execution**
- One Critical issue at a time (no parallel fixing)
- Rationale: Complete traceability, prevents mutual interference
- Time per issue: 45 min average (fix + verification)
- Sequence: Issue N → Fix → Verify → Commit → Move to Issue N+1

**D-06: Document Each Fix**
- Required: Problem description + root cause analysis + fix description + verification results
- Output format: Update ISSUES_PRIORITIZED.md with fix details per issue
- Rationale: Traceability for future debugging
- Optional: Preventative measures (what check should catch this next time)

**D-07: Serial with Phase 4 Planning**
- Phase 3 must complete before Phase 4 planning starts
- Phase 3 gate: FIXES_VERIFIED.md generated, all Critical issues resolved
- Rationale: Ensure stable baseline before major migrations
- Timeline impact: Phase 3 delay → Phase 4 delay

**D-08: Claude's Repair Approach Discretion**
- Claude has freedom to select specific repair strategy per Critical issue
- E.g., implicit dependency fix may be: add to package.json vs restructure vs event decoupling
- Constraint: All approaches must pass D-02 verification (full test + typecheck)
- Recommendation: Choose simplest/safest approach when multiple exist

### Claude's Discretion

None additional beyond D-08.

### Deferred Ideas (OUT OF SCOPE)

- High priority issues (if any remain after Phase 2B) → Phase 4+ backlog
- Performance optimization → Phase 5+
- Code restructuring beyond issue-critical changes → Phase 5+

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CRIT-FIX-01** | All Phase 1 Critical issues resolved OR verified as non-Critical | Discovery + verification protocols included |
| **CRIT-FIX-02** | All Phase 2A/2B emergent Critical issues detected and scheduled | Continuous discovery timing defined |
| **CRIT-FIX-03** | Each fix passes serial verification gates (typecheck + test + no regression) | Verification workflow documented with thresholds |
| **CRIT-FIX-04** | Complete documentation of each fix (root cause + decision) | Documentation template provided |
| **CRIT-FIX-05** | Rollback capability if fix introduces new failures | Rollback decision framework specified |
| **CRIT-FIX-06** | Generate FIXES_VERIFIED.md with final status | Output format documented |

</phase_requirements>

---

## Critical Issue Verification Patterns

### Pattern 1: Pre-Fix Baseline Capture

**When:** Before attempting any Critical fix

**Steps:**
1. Run `bun test` and capture full output (count pass/fail/skip)
2. Run `bun run typecheck` and verify 0 errors
3. Record dependency graph: `bun run scripts/generate-dependency-graph.ts` (verify 0 circular deps)
4. Store in `.planning/phases/03-fix-critical-issues-if-needed/baseline-before-fix-N.txt`

**Why:** Establish clear reference point to detect regressions

**Example output to capture:**
```
Test Summary: 11,925 tests | 11,656 pass | 163 fail | 207 skip
TypeCheck: 0 errors (83/83 packages)
Circular Dependencies: 0
```

### Pattern 2: Post-Fix Verification

**When:** Immediately after code change (before commit)

**Steps:**
1. Run `bun install` — verify no new dependency conflicts
2. Run `bun run typecheck` — verify still 0 errors
3. Run specific package tests (if fix is localized)
   ```bash
   cd packages/[affected-package]
   bun test --filters [package-name]
   ```
4. Run full test suite `bun test` — compare to baseline
5. Check for new circular dependencies

**Acceptance criteria:**
- Typecheck: Still 0 errors
- Test count: Pass count same or higher, fail count same or lower
- Circular deps: Still 0
- No new @ts-expect-error suppressions needed

### Pattern 3: Regression Detection

**When:** After full test suite completes

**Decision point:**
```
IF (fail_count_new > fail_count_baseline) THEN
  Rollback fix
  Document: "Fix X introduced Y new failures"
  Mark for Phase 4+ backlog
ELSE
  Commit fix
  Document root cause analysis
  Proceed to next Critical issue
```

**Example scenarios:**
- Baseline: 163 failures → Post-fix: 165 failures → **Rollback**
- Baseline: 163 failures → Post-fix: 160 failures → **Commit** (improvement)
- Baseline: 163 failures → Post-fix: 163 failures → **Commit** (neutral)

### Pattern 4: Package-Specific Verification (for localized fixes)

**When:** Fix affects single package (e.g., ESM/CJS build issue)

**Steps:**
1. Fix code in affected package
2. Rebuild package: `bun run build` (from repo root)
3. Test package in isolation:
   ```bash
   cd packages/[name]
   bun test --run
   ```
4. Verify build artifacts exist and are importable
5. Run full test suite (to detect indirect impact)

**Example:** photon dist bundle fix in Phase 2A
- Fix: Post-build patch to dist/index.js
- Package test: Verify Photon class exports from dist/
- Full suite: Ensure no packages that depend on photon broke

---

## Issue Discovery Timing

### Decision: Continuous Discovery with Phase Checkpoints

**Rationale:** New Critical issues may emerge during Phase 2B execution (middleware/launchpad/monolith fixes). Phase 3 must handle both Phase 1 residual issues AND emergent issues.

### Discovery Protocol

**Trigger Point 1: Phase 3 Kickoff** (After Phase 2B completes)
- Review Phase 1 `ISSUES_PRIORITIZED.md`
- Identify all issues marked as "Critical"
- Check if any Phase 2B work introduced new Critical issues
- If none found: Skip Phase 3, proceed to Phase 4 planning

**Trigger Point 2: During Phase 3 Execution** (Between fixes)
- After each fix commit, scan for newly-introduced issues
- Use same tools as Phase 1: `bun test`, `bun run typecheck`, dependency graph
- If new Critical emerges: Add to fix queue, re-prioritize by impact scope (D-01)

**Detection approach:**
```
Phase 1 identified issues:
  - photon dist bundles (CRIT-01) → Fixed Phase 2A ✓
  - signal dist bundles (CRIT-02) → Fixed Phase 2A ✓
  - implicit atlas deps (HIGH not CRITICAL) → Fixed Phase 2A ✓

Phase 2B identified issues:
  - Any new Critical issues? → Scan before Phase 3 starts

During Phase 3 execution:
  - After each fix commit, run full test suite
  - New failures suggest potential new issue
  - Investigate and classify severity
```

### Decision: When to Schedule Phase 3

**If Phase 1 shows 0 Critical issues:**
- Skip Phase 3 entirely
- Proceed directly to Phase 4 planning (Hono migration)

**If Phase 1 shows 1+ Critical issues:**
- Activate Phase 3 immediately after Phase 2B completes
- Timeline: Phase 2 complete → Phase 3 starts

**If Phase 2B discovers new Critical issues:**
- Defer Phase 3 start until Phase 2B fully completes
- Integrate new Critical issues into Phase 3 fix queue

---

## Serial Fix Execution Workflow

### Workflow Structure

Each Critical issue follows this atomic sequence:

```
[Issue identified] → [Fix proposed] → [Pre-fix baseline] → [Code change] →
[Typecheck + local test] → [Full test suite] → [Regression check] →
{Decision: Commit or Rollback} → [Documentation] → [Next issue]
```

### Step 1: Issue Prioritization

**Input:** ISSUES_PRIORITIZED.md from Phase 1/2

**Action:** Sort all Critical issues by impact scope (D-01)
- Impact scope = "number of packages affected by this issue"
- Example: implicit dependency affecting 4 packages → 4 packages impacted
- Single-package issues (e.g., one package's build failure) → lower priority

**Output:** Ordered list of Critical issues with fix sequence

### Step 2: Issue Selection & Analysis

**For each Critical issue (in order):**

1. **Document current state:**
   - Issue ID (e.g., CRIT-01)
   - Problem description (1-2 sentences)
   - Affected packages (list)
   - Impact scope (X packages)
   - Symptom (test failure, build error, type error, circular dep)

2. **Identify root cause:**
   - Read related test failures
   - Check package structure/dependencies
   - Look for similar patterns in other packages
   - Document hypothesis

3. **Brainstorm fix approaches** (D-08 discretion):
   - List 2-3 possible fixes
   - Evaluate simplicity/safety/side effects
   - Select safest approach

### Step 3: Pre-Fix Baseline

**Run before any code changes:**

```bash
cd /Users/carl/Dev/Carl/gravito-core

# Capture baseline test state
bun test 2>&1 | tee .planning/phases/03-fix-critical-issues-if-needed/baseline-before-fix-[ID].log

# Typecheck
bun run typecheck 2>&1 | tee .planning/phases/03-fix-critical-issues-if-needed/typecheck-baseline-[ID].log

# Dependency check
bun run scripts/generate-dependency-graph.ts 2>&1 | tee .planning/phases/03-fix-critical-issues-if-needed/deps-baseline-[ID].log
```

**Extract metrics:**
- Total tests, pass, fail, skip counts
- Error count (should be 0)
- Circular dependency count (should be 0)

### Step 4: Code Change

**Implement the fix:**
- Apply changes only to files necessary for this issue
- Keep change minimal and focused
- Add comments explaining why if non-obvious

**Validation:**
```bash
# Quick syntax check
bun run typecheck

# Build affected packages (if applicable)
cd packages/[affected-name]
bun run build
```

### Step 5: Post-Fix Verification (Local)

**Verify fix doesn't break immediately:**

```bash
# Typecheck again (must still be 0 errors)
bun run typecheck 2>&1 | tee .planning/phases/03-fix-critical-issues-if-needed/typecheck-after-fix-[ID].log

# Test affected package only
cd packages/[affected-name]
bun test --run 2>&1 | tee ../../.planning/phases/03-fix-critical-issues-if-needed/test-affected-after-fix-[ID].log
```

**If typecheck shows new errors:** Stop, revert, document issue, move to rollback decision

### Step 6: Full Verification Suite

**Run complete validation (per D-02):**

```bash
cd /Users/carl/Dev/Carl/gravito-core

# Full test suite
bun test 2>&1 | tee .planning/phases/03-fix-critical-issues-if-needed/test-full-after-fix-[ID].log

# Dependency check
bun run scripts/generate-dependency-graph.ts 2>&1 | tee .planning/phases/03-fix-critical-issues-if-needed/deps-after-fix-[ID].log

# bun install (verify dependencies still resolve cleanly)
bun install 2>&1 | tee .planning/phases/03-fix-critical-issues-if-needed/install-after-fix-[ID].log
```

**Compare to baseline:**
- Pass count: Same or higher ✓
- Fail count: Same or lower ✓
- Error count: Still 0 ✓
- Circular deps: Still 0 ✓

### Step 7: Regression Decision (D-04 Gate)

**Decision logic:**

```
IF fail_count_after > fail_count_before THEN
  ROLLBACK_FIX()
ELSE IF typecheck_errors > 0 THEN
  ROLLBACK_FIX()
ELSE IF new_circular_dependencies > 0 THEN
  ROLLBACK_FIX()
ELSE
  COMMIT_FIX()
  DOCUMENT_FIX()
```

### Step 8: Commit & Document

**If fix passes verification:**

```bash
# Stage changes
git add packages/*/package.json [other files]

# Commit with detailed message
git commit -m "fix: [phase-03] Critical issue CRIT-[ID] — [brief description]

Root cause: [1-2 sentence explanation]
Changes: [list of files changed]
Verification: bun test $(final_pass_count), typecheck 0 errors, no circular deps
Impact scope: [X packages affected by this issue]"
```

**If fix fails verification:**

```bash
# Revert all changes
git checkout .

# Document failure
echo "CRIT-[ID]: Fix attempt introduced regressions. Deferred to Phase 4+" >> .planning/phases/03-fix-critical-issues-if-needed/ROLLBACK_LOG.md
```

### Step 9: Loop to Next Issue

Return to Step 2 for next Critical issue in prioritized list.

### Execution Timeline per Issue

| Activity | Duration | Notes |
|----------|----------|-------|
| Analysis + brainstorm | 5-10 min | Quick identification |
| Pre-fix baseline capture | 10-15 min | Run test + typecheck |
| Code change | 5-15 min | Implementation |
| Local verification | 5-10 min | typecheck + package tests |
| Full verification | 20-30 min | bun test suite |
| Regression decision | 2-5 min | Compare baselines |
| Commit + document | 5 min | Git commit |
| **Total per fix** | **45-60 min** | Average across issues |

**N issues × 45 min = Total Phase 3 duration** (e.g., 3 issues = 2.25 hours base time + overhead)

---

## Rollback Decision Framework

### Rollback Trigger

**Automatic rollback if ANY of these conditions occur after fix:**

1. **Test regression:** `fail_count_after > fail_count_before`
   - Example: Fix intended to resolve CRIT-01 but breaks CRIT-05 test
   - Action: Rollback, document, defer both issues

2. **Type errors introduced:** `typecheck_after shows errors > typecheck_before`
   - Example: Fix adds use of undefined variable
   - Action: Rollback, fix error, retry

3. **New circular dependencies:** `circular_deps_after > 0`
   - Example: Fix reorganizes imports in a way that creates cycle
   - Action: Rollback, try alternative fix approach

4. **Build/install failure:** `bun install` or `bun run build` errors
   - Example: Fix adds syntax error
   - Action: Rollback, fix syntax, retry

### Rollback Exception: Environmental Issues

**If regression is confirmed as environmental (not code-related):**

Example: Test fails due to missing external service, not code change
- Verify with: Run same test on baseline code → still fails
- Decision: Retain fix, skip the environmental test
- Document: "Fix X retained; environmental test Y skipped"

### Rollback Procedure

```bash
# 1. Verify we're on the right branch
git status

# 2. Revert all changes in affected packages
git checkout .

# 3. Verify revert works
bun run typecheck
bun test [quick sanity check]

# 4. Document rollback
cat >> .planning/phases/03-fix-critical-issues-if-needed/ROLLBACK_LOG.md <<EOF
## Issue: CRIT-[ID]
- Attempted fix: [brief description]
- Rollback reason: [reason from above]
- Regression count: [+X failures detected]
- Status: Deferred to Phase 4+
EOF

# 5. Move to next issue
```

### Rollback Decision Log

**Maintain file:** `.planning/phases/03-fix-critical-issues-if-needed/ROLLBACK_LOG.md`

**Format:**
```markdown
## Rollback History

### CRIT-02 (Rollback)
- Issue: Signal dist CJS import broken
- Attempted fix: [description]
- Reason: Fix introduced 5 new test failures in unrelated packages
- Alternative approaches: [list]
- Status: Defer to Phase 4+ with higher priority

### CRIT-05 (Committed)
- Issue: Implicit dependency in package X
- Fix applied: Added @gravito/atlas to package.json
- Verification: All tests pass, no regression
- Status: Complete
```

---

## Verification Documentation Standards

### Template: Per-Issue Fix Report

**Location:** Update ISSUES_PRIORITIZED.md with this section for each fixed Critical issue:

```markdown
## CRIT-[ID]: [Problem Title]

### Status
- [ ] Identified (Phase 1)
- [x] Fixed (Phase 3)
- [x] Verified
- [x] Documented

### Problem Description
[What is broken, symptoms, impact]

### Root Cause Analysis
[Why did this happen, technical explanation, code references]

### Fix Applied
**Files changed:**
- packages/X/package.json
- packages/Y/src/file.ts

**Change summary:**
[Describe what was changed and why]

### Verification Results

**Before fix:**
```
Tests: 11,925 total | 11,656 pass | 163 fail
TypeCheck: 0 errors
Circular deps: 0
```

**After fix:**
```
Tests: 11,925 total | 11,658 pass | 161 fail ✓ (2 improvements)
TypeCheck: 0 errors ✓
Circular deps: 0 ✓
```

**Regression check:** No new failures detected ✓

### Commit Hash
[abc123def]

### Preventative Measures (Optional)
[What check should prevent this issue next time?]
- Example: "Add lint rule to detect undeclared workspace dependencies"
- Example: "Require @ts-check in files importing atlas"
```

### Template: Phase 3 Summary (FIXES_VERIFIED.md)

**Location:** `.planning/phases/03-fix-critical-issues-if-needed/FIXES_VERIFIED.md`

**When created:** After ALL Critical issues are processed

**Structure:**

```markdown
# Phase 3: Critical Issues Fixed & Verified

**Date Completed:** 2026-03-25 (example)
**Total Critical Issues Identified:** N
**Fixed:** X
**Deferred to Phase 4+:** Y
**Status:** Complete

---

## Executive Summary

Phase 3 completed [X] Critical issue fixes with [Z]% success rate. Health score improved from [before] to [after]. Framework ready for Phase 4 planning.

---

## Critical Issues Status

| ID | Issue | Status | Commit | Effort |
|----|-------|--------|--------|--------|
| CRIT-01 | photon dist bundles | ✓ Fixed | abc123 | 1h |
| CRIT-02 | signal dist bundles | ✓ Fixed | def456 | 1.5h |
| CRIT-03 | [if any remained] | ⏸ Deferred | — | — |

---

## Verification Summary

**Final baseline (all Critical issues resolved):**
- Tests: 11,925 | Pass: 11,660 | Fail: 163 | Skip: 207
- TypeCheck: 0 errors (83/83 packages) ✓
- Circular dependencies: 0 ✓
- Health score: ~90/100

---

## Known Issues Deferred to Phase 4+

[List any rollback decisions and next steps]

---

## Readiness for Phase 4 (Hono Migration Planning)

✓ Critical issues eliminated
✓ Framework stable (97.0%+ test pass rate)
✓ Type system clean (0 errors)
✓ No circular dependencies
✓ Ready to proceed with Phase 4 planning
```

---

## Validation Architecture

### Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest (via Bun test runner, v1.3.10) |
| Config file | `vitest.config.ts` at repo root |
| Quick run command | `bun test --run` (single pass, <2 min) |
| Full suite command | `bun test` (all tests with caching, ~5 min) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **CRIT-FIX-01** | All Phase 1 Critical issues resolved | smoke | `bun test [package-name]` (per affected package) | ✅ Per-package tests |
| **CRIT-FIX-02** | New Critical issues detected early | integration | `bun test` (full suite after each fix) | ✅ Full test suite |
| **CRIT-FIX-03** | No regression from fix (typecheck clean) | unit | `bun run typecheck` | ✅ tsconfig.json |
| **CRIT-FIX-04** | Documentation complete (root cause recorded) | manual | Review ISSUES_PRIORITIZED.md + commit message | ✅ Git history |
| **CRIT-FIX-05** | Rollback capability works (revert clean) | smoke | `git checkout .` + `bun test` (sanity) | ✅ git |
| **CRIT-FIX-06** | Final verification report generated | manual | Check FIXES_VERIFIED.md exists | ✅ Markdown template |

### Sampling Rate

- **Per fix commit:** `bun run typecheck` (0 errors required)
- **After each fix:** `bun test` (full suite, compare to baseline)
- **Phase gate (before Phase 4 planning):** Full suite green + FIXES_VERIFIED.md generated

### Wave 0 Gaps

None — Phase 3 relies entirely on existing test infrastructure from Phase 1 & 2. All 11,925 tests already written and passing in Phase 2A baseline.

---

## Common Pitfalls

### Pitfall 1: Incomplete Verification After Quick Fix

**What goes wrong:** Fix looks simple (one-liner), so skipping full test suite. Fix introduces subtle regression in unrelated package, discovered 2 weeks later during Phase 4 migration.

**Why it happens:** Pressure to move quickly, underestimating interdependencies in monorepo

**How to avoid:** Enforce D-02 rigorously — always run full `bun test` + `bun run typecheck` after EVERY fix, no exceptions

**Warning signs:** "I only changed one file, tests should still pass" → Run full suite anyway. "Typecheck is fast, tests take 30 min" → Run both every time.

### Pitfall 2: Parallel Fixing Causes Mutual Interference

**What goes wrong:** Try to fix CRIT-01 and CRIT-02 simultaneously. Both pass tests in isolation, but together introduce circular dependency or conflicting changes

**Why it happens:** Impatience to fix multiple issues at once to save time

**How to avoid:** Enforce D-05 strictly — one issue at a time, complete verify-commit cycle before moving to next

**Warning signs:** "Both fixes are independent" → Still do serial. "We can merge both PRs at once" → No, one at a time.

### Pitfall 3: Rollback Decision Delayed

**What goes wrong:** Fix introduces 2 new test failures, but instead of rolling back immediately, spend 2 hours debugging the failures. Could have rolled back in 5 minutes and tried alternative approach.

**Why it happens:** Sunk cost fallacy ("I've already spent time on this")

**How to avoid:** Implement automatic rollback threshold (D-04) — if fail count increases, rollback within 10 minutes, don't investigate

**Warning signs:** "Let me just check if these failures are related to my fix" → No. If fail count increased, rollback first. Debug failures later if needed.

### Pitfall 4: Missing Implicit Dependencies After Fix

**What goes wrong:** Fix adds explicit dependency to package.json but forgets to `bun install`. Deployment fails because dependency isn't in bun.lock

**Why it happens:** Focus on code change, skip dependency installation step

**How to avoid:** Include `bun install` in post-fix verification step (Part of Step 6 workflow)

**Warning signs:** "I only added one line to package.json" → Still run bun install. "Lock file didn't change" → It should have.

### Pitfall 5: Documentation Deferred Until "Later"

**What goes wrong:** Fix 3 Critical issues, forget to document last one. Later during Phase 4, bug reappears because root cause wasn't recorded

**Why it happens:** Fatigue after multiple fixes, thinking "I'll document later"

**How to avoid:** Document immediately after each fix commits (part of Step 8). Make it non-negotiable

**Warning signs:** "I'll document all fixes at the end" → No, do immediately. "Root cause is obvious" → Still document it.

---

## State of the Art

### Current Approach (Phase 3)

| Aspect | Approach | When Adopted |
|--------|----------|--------------|
| **Serial verification** | One fix at a time with full test suite | Phase 2A research (2026-03-24) |
| **Regression detection** | Compare before/after test counts | Phase 1 (2026-03-24) |
| **Rollback automation** | Explicit threshold-based decision | Phase 3 research (2026-03-25) |
| **Documentation** | Per-issue root cause + verification log | Phase 3 research (2026-03-25) |

### Deprecated/Outdated Practices (NOT used in Phase 3)

- **Parallel fixing:** Monorepo complexity too high, mutual interference risk
- **Deferred verification:** Regression discovered too late (→ use full verification instead)
- **Silent rollbacks:** Always document rollback decisions (→ use ROLLBACK_LOG.md)
- **"Will fix later" patterns:** Enforce immediate documentation per Step 8

---

## Open Questions

1. **How many Critical issues will Phase 3 encounter?**
   - What we know: Phase 1 found photon/signal dist issues (both fixed in Phase 2A), 1 implicit dep issue (3 packages, fixed in Phase 2A)
   - What's unclear: If Phase 2B discovers additional Critical issues during middleware/launchpad/monolith investigations
   - Recommendation: Don't assume zero; scope Phase 3 with estimated 2-3 day budget. Adjust when Phase 2B completes.

2. **Should Phase 3 fix only Phase 1 issues or also Phase 2-discovered issues?**
   - What we know: CONTEXT.md says Phase 3 handles "Critical priority issues from Phase 1 scan"
   - What's unclear: If Phase 2B investigations reveal new Critical issues, should they be fixed in Phase 3 or deferred?
   - Recommendation: Include any Critical issues discovered through Phase 2B completion. Phase 3 activates only if Critical issues exist at decision point.

3. **What if rollback fails (revert doesn't clean up)?**
   - What we know: Git checkout should always work
   - What's unclear: Rare case where stray build artifacts or generated files prevent clean revert
   - Recommendation: If rollback fails, document exact state and escalate to Phase 4+ with "requires manual intervention" flag

---

## Environment Availability

**Step 2.6: SKIPPED** — Phase 3 has no external dependencies beyond those verified in Phase 1 & 2.

All required tools already confirmed available:
- Bun 1.3.10 (package manager + test runner)
- Turbo (build orchestration)
- Node.js (runtime)
- TypeScript (type checking)
- Git (version control)

Phase 3 is purely code-and-verify; no external services required.

---

## Sources

### Primary (HIGH confidence)
- **03-CONTEXT.md** — Locked decisions D-01 through D-08 for Phase 3 execution strategy
- **02-PLAN.md & 02-01-SUMMARY.md** — Phase 2A execution patterns (verification gates, serial execution) that Phase 3 inherits
- **02-RESEARCH.md** — Sequential bundling strategy + regression detection patterns from Phase 2
- **STACK.md & TESTING.md** — Test infrastructure (Vitest, Bun test runner) confirmed

### Secondary (MEDIUM confidence)
- **Phase 1 health check report** — Baseline metrics (163 failures, 0 type errors) for regression detection
- **Existing codebase patterns** — Monorepo dependencies (60 packages) from STRUCTURE.md inform serialization need

---

## Metadata

**Confidence breakdown:**
- Verification patterns: **HIGH** — Derived directly from Phase 2A execution + locked D-02 decision
- Serial execution workflow: **HIGH** — Validated pattern in Phase 2 (3 task sequence), extended with detailed steps
- Rollback framework: **MEDIUM** — Inferred from D-04 decision; no prior Phase 3 execution to validate
- Documentation standards: **MEDIUM** — Template-based; adjusted per actual Phase 3 execution
- Validation architecture: **HIGH** — Reuses Phase 1 & 2 test infrastructure with no new tools needed

**Research date:** 2026-03-25
**Valid until:** 2026-04-05 (10 days) or until Phase 3 execution begins, whichever is sooner. Will require adjustment based on actual issues discovered in Phase 2B.

**Note:** Phase 3 is conditional. This research activates only if Phase 2B identifies Critical issues requiring fix. If Phase 2B completes with zero Critical issues, Phase 3 is skipped entirely and Phase 4 planning proceeds directly.
