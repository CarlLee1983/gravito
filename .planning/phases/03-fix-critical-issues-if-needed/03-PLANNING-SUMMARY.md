# Phase 3: Fix Critical Issues (If Needed) - Planning Summary

**Planning Date:** 2026-03-25
**Status:** ✅ Planning Complete — Awaiting Execution Trigger
**Trigger Condition:** Conditional — Only activates if Critical issues remain after Phase 2B

---

## Overview

Phase 3 is a **conditional execution phase** that fixes all Critical priority issues identified in Phase 1 & Phase 2 scanning. The phase includes:

1. **03-01: Critical Issues Assessment & Decision Gate** (Wave 1, ~1 hour)
   - Assesses all Critical issues from Phase 1/2
   - Determines if Phase 3 should proceed or skip
   - Outputs: CRITICAL_ISSUES_ASSESSMENT.md

2. **03-02: Serial Fix Execution** (Wave 1 conditional, 2-3 days if activated)
   - Executes serial fixes for all remaining Critical issues
   - Full verification gates after each fix (per D-02)
   - Rollback capability if regressions detected (per D-04)
   - Outputs: FIXES_VERIFIED.md, ROLLBACK_LOG.md

---

## Phase Status

| Aspect | Status | Details |
|--------|--------|---------|
| Planning | ✅ Complete | Both 03-01 and 03-02 plans created |
| Requirements | ✅ Mapped | CRIT-FIX-01 through CRIT-FIX-06 |
| Context | ✅ Ready | CONTEXT.md + RESEARCH.md prepared |
| Decisions | ✅ Locked | D-01 through D-08 from CONTEXT.md |
| Execution | 🎯 Awaiting trigger | Depends on Phase 2B completion |

---

## Phase Activation Logic

**Phase 3 activates IF AND ONLY IF:**
- Phase 2A completed (✅ Done: photon/signal/implicit deps fixed)
- Phase 2B completes with remaining Critical issues identified
- Decision: 1 or more Critical issues require Phase 3 fixes

**Phase 3 skips IF:**
- Phase 2A completed (✅ Done)
- Phase 2B completes with ZERO remaining Critical issues
- Decision: Proceed directly to Phase 4 planning (Hono migration)

---

## Plans Created

### Plan 03-01: Critical Issues Assessment & Decision Gate

**File:** `.planning/phases/03-fix-critical-issues-if-needed/03-01-PLAN.md`

**Wave:** 1 (parallel with other post-Phase-2B work)

**Type:** Execute (checkpoint:decision)

**Scope:**
- Review Phase 1 & Phase 2 health check reports
- Identify all remaining Critical issues (post-Phase 2B)
- Prioritize by impact scope (per D-01)
- Decide: Skip Phase 3 OR Proceed with Phase 3-02

**Effort:** ~1 hour (assessment + decision gate)

**Output:** CRITICAL_ISSUES_ASSESSMENT.md (decision documented)

**Success Criteria:**
- [ ] All Critical issues identified and categorized
- [ ] Phase 2B status reviewed (complete or pending)
- [ ] Remaining Critical issue count determined
- [ ] Clear decision made: Skip OR Proceed
- [ ] If Proceed: Issues prioritized by impact scope

---

### Plan 03-02: Serial Fix Execution (Conditional)

**File:** `.planning/phases/03-fix-critical-issues-if-needed/03-02-PLAN.md`

**Wave:** 1 (dependent on 03-01 decision to proceed)

**Type:** Execute (autonomous)

**Scope (per D-05 — Serial Execution):**

**Task 1:** Set up verification infrastructure & pre-fix baseline
- Capture initial test/typecheck/deps baseline
- Initialize FIXES_LOG.md and ROLLBACK_LOG.md
- Effort: ~15-20 minutes

**Tasks 2-N:** Serial fix execution (for each Critical issue)
- One issue at a time, complete verify-commit cycle
- Pre-fix baseline → Code change → Full verification → Regression decision
- If no regression: Commit with documentation (D-06)
- If regression: Rollback with justification
- Effort: ~45 min per issue × N issues

**Task 3:** Final verification & FIXES_VERIFIED.md generation
- Collect final metrics (test/typecheck/deps)
- Calculate health score improvement
- Generate FIXES_VERIFIED.md report
- Effort: ~15-20 minutes

**Total Effort (if activated):**
- N = 0 issues: Phase 3 skipped
- N = 1 issue: ~2 hours (1 + 0.75 + 0.25 hours)
- N = 3 issues: ~3.5 hours (1 + 2.25 + 0.25 hours)
- N = 5+ issues: ~2-3 days with full verification after each fix

**Output:**
- FIXES_VERIFIED.md (final report)
- ROLLBACK_LOG.md (if any fixes rolled back)
- Updated ISSUES_PRIORITIZED.md with fix records
- Git commits with detailed fix documentation

**Success Criteria:**
- [ ] All Critical issues processed (committed or rolled back)
- [ ] Zero new test failures from any committed fix (per D-04)
- [ ] TypeCheck remains 0 errors
- [ ] Circular dependencies remain 0
- [ ] Health score improved from Phase 1 baseline (78/100)
- [ ] FIXES_VERIFIED.md generated with complete status
- [ ] Ready for Phase 4 planning

---

## Locked Decisions (from CONTEXT.md)

| ID | Decision | Impact |
|----|----------|--------|
| D-01 | Fix by impact scope (widest first) | Prioritization order |
| D-02 | Full verification after each fix | No shortcuts, complete test suite |
| D-03 | Fix ALL Critical issues (no deferral) | Timeline may extend 2-3 days |
| D-04 | Rollback if regression | Decision gate per fix |
| D-05 | Serial execution (one at a time) | No parallel fixing |
| D-06 | Document each fix with root cause | Traceability in ISSUES_PRIORITIZED.md |
| D-07 | Serial with Phase 4 planning | Phase 3 gate → Phase 4 planning |
| D-08 | Claude discretion on fix approach | Choose safest/simplest method |

---

## Verification Infrastructure

From 03-RESEARCH.md (verified patterns):

**Pattern 1: Pre-Fix Baseline Capture**
- Run bun test + typecheck + dependency graph
- Extract pass/fail/skip counts
- Store in timestamped baseline log

**Pattern 2: Post-Fix Verification**
- Run full test suite + typecheck + dependency check
- Compare to baseline
- Extract new pass/fail/skip counts

**Pattern 3: Regression Detection**
- IF fail_count_after > fail_count_before → Rollback (D-04)
- IF typecheck_errors > 0 → Rollback
- IF circular_deps > 0 → Rollback
- ELSE → Commit with documentation (D-06)

**Pattern 4: Rollback Decision Framework**
- Automatic rollback if any regression detected
- Exception: Environmental issues (verified separately)
- Document in ROLLBACK_LOG.md with alternative approaches

---

## Dependencies

### Incoming Dependencies
- **Phase 2A** (✅ Complete) — Critical fixes, implicit dependencies
- **Phase 2B** (⏳ Pending) — High-priority fixes, may identify new Critical issues
- **CRITICAL_ISSUES_ASSESSMENT.md** (TBD) — Created by 03-01 task

### Outgoing Dependencies
- **Phase 4 Planning** — Cannot start until Phase 3 completes (per D-07)
- **FIXES_VERIFIED.md** — Phase 4 references this for baseline stability

---

## Timeline

| Activity | Duration | When |
|----------|----------|------|
| Phase 2B execution | 1-2 weeks | Parallel with Phase 3 planning |
| Phase 3-01 execution | ~1 hour | Immediately after Phase 2B completes |
| Phase 3-02 execution (if needed) | 2-3 days | After 03-01 decision to proceed |
| Phase 4 planning | 1-2 days | After Phase 3 gate closes |

---

## Critical Success Factors

1. **Full Verification Discipline (D-02)**
   - Never skip `bun test` even for "simple" fixes
   - Always run full suite, never abbreviated tests
   - Enforce 45-60 min per fix including verification

2. **Strict Rollback Enforcement (D-04)**
   - Any new test failure → Immediate rollback (< 10 min)
   - Don't investigate regressions during Phase 3
   - Document reason and defer to Phase 4+

3. **Serial Execution Discipline (D-05)**
   - One issue at a time, complete verify-commit
   - Never attempt 2+ fixes in parallel
   - Each fix fully verified before next issue

4. **Complete Documentation (D-06)**
   - Every fix: root cause + changes + verification results
   - Every rollback: reason + alternative approaches
   - Update ISSUES_PRIORITIZED.md after each fix

5. **No Scope Creep**
   - Phase 3 fixes ONLY Critical issues
   - High/Medium/Low issues deferred to Phase 4+
   - No enhancements, only bug fixes

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Phase 2B identifies many new Critical issues | Medium | Timeline extends to 3-5 days | Extend budget, D-03 says fix all |
| Fix A causes regressions in package B | Medium | Rollback required | D-04 enforces rollback threshold |
| Circular dependencies introduced by fix | Low | Framework breaks | Verification includes dependency check |
| Type errors after fix | Low | Immediate detection | Typecheck runs after every fix |
| Documentation deferred to "later" | Medium | Root causes lost | Enforce D-06 immediately after commit |

---

## Readiness Checklist

- [x] Phase 3 plans created (03-01 + 03-02)
- [x] Requirements mapped (CRIT-FIX-01 through CRIT-FIX-06)
- [x] Locked decisions documented (D-01 through D-08)
- [x] Verification patterns established (from RESEARCH.md)
- [x] ROADMAP updated with Phase 3 details
- [x] Execution trigger defined (depends on Phase 2B completion)
- [ ] Phase 2B must complete before Phase 3 execution
- [ ] CRITICAL_ISSUES_ASSESSMENT.md to be generated by 03-01 task

---

## Next Steps

1. **Phase 2B Execution** (⏳ Scheduled in parallel)
   - Execute High-priority fixes (launchpad, monolith, scaffold, middleware)
   - Identify any new Critical issues
   - Complete by target date

2. **Phase 3-01 Execution** (After Phase 2B)
   - Run assessment & decision gate
   - Generate CRITICAL_ISSUES_ASSESSMENT.md
   - User confirms decision: Skip OR Proceed

3. **Phase 3-02 Execution** (If Proceed)
   - Execute serial fixes per D-01 through D-08
   - Full verification after each fix
   - Generate FIXES_VERIFIED.md

4. **Phase 4 Planning** (After Phase 3)
   - Continue with High-priority fixes (if deferred) OR
   - Begin Hono Phase 4-5 migration planning
   - Reference FIXES_VERIFIED.md for stable baseline

---

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `03-01-PLAN.md` | Decision gate plan | ✅ Created |
| `03-02-PLAN.md` | Fix execution plan | ✅ Created |
| `03-CONTEXT.md` | User decisions | ✅ Existing |
| `03-RESEARCH.md` | Technical research | ✅ Existing |
| `CRITICAL_ISSUES_ASSESSMENT.md` | Assessment output | TBD (03-01 task) |
| `FIXES_LOG.md` | Fix execution log | TBD (03-02 Task 1) |
| `FIXES_VERIFIED.md` | Final report | TBD (03-02 Task 3) |
| `ROLLBACK_LOG.md` | Rollback decisions | TBD (03-02 Task 2) |

---

## Execution Command

When Phase 3 is triggered (after Phase 2B & 03-01 decision):

```bash
# Phase 3-01: Decision gate (required first)
/gsd:execute-phase 03 --plan 01

# Phase 3-02: Fix execution (only if 03-01 decides Proceed)
/gsd:execute-phase 03 --plan 02
```

---

**Planning Status:** ✅ COMPLETE

**Execution Status:** 🎯 AWAITING TRIGGER (Phase 2B completion)

**Gate to Phase 4:** Closes after Phase 3-02 completes (or Phase 3 is skipped)

---

*Planning Date: 2026-03-25*
*Commit: 19152a4c*
*Next Review: When Phase 2B completes (triggers Phase 3-01 execution)*
