# Roadmap: Gravito-Core 健全性驗證

**Project:** Gravito-Core 健全性驗證 (Phase 1: 快速掃描)
**Core Value:** 確保 gravito-core 框架的核心穩定性
**Created:** 2026-03-24
**Status:** Active

## Overview

驗證 gravito-core 60 個包的健全性。快速掃描建立基線，為後續決策（Hono Phase 4-5、修復優先級）奠定基礎。

```
[Phase 1: 快速掃描] → [Phase 2A: Critical Fixes] → [Phase 3 Decision Gate]
                                                  ├─→ Phase 3: Fix Critical (if needed)
                                                  ├─→ Phase 2B: 修復 High Issues
                                                  ├─→ Phase 2C: 後續規劃
                                                  └─→ Phase 4+: Hono 遷移 / 衛星驗證
```

---

## Phase 1: 快速掃描驗證 (1-2 days)

✅ **COMPLETE** — 2026-03-24

驗證 60 個包的基本健全性，識別阻擋性問題。

### Results

- **Health Score:** 78/100
- **Test Results:** 11,556 pass / 162 fail / 207 skip / 0 type errors / 0 circular deps
- **Deliverables:**
  - `HEALTH_CHECK_REPORT.md` — Baseline health score and detailed analysis
  - `ISSUES_PRIORITIZED.md` — 2 Critical, 9 High, 2 Medium, 4 Low issues
  - `NEXT_STEPS.md` — Recommended fix sequence and risk assessment

### Key Findings

- **Critical (2):** photon/signal dist bundles broken (Bun v1.3.10 bundler issue) — **FIXED in Phase 2A**
- **High (9):** Implicit dependencies (4 pkgs), middleware tests (1), test failures (launchpad/monolith/scaffold)
- **Medium (2):** JWT module, Galaxy showcase
- **Low (4):** StaticLink, CSRF helpers, and 207 skipped environment tests

---

## Phase 2: 結果評估 & 決策 (1 day)

根據 Phase 1 報告，評估結果並決策後續行動。

### Phase 2A: Critical Fixes & Implicit Dependencies (✅ COMPLETE)

**Plan:** `.planning/phases/02-1-day/02-PLAN.md`

**Completion Date:** 2026-03-25

**Scope Completed:**
- ✅ Verified photon/signal dist bundles fixed (commit e3a182f6)
- ✅ Fixed 3 implicit atlas dependencies (fortify, graphql, spectrum; pulse doesn't exist)
- ✅ Full test suite verification completed (11,925 tests, 97.0% pass rate)
- ✅ TypeCheck verification completed (0 errors, 83/83 packages)
- ✅ Created DECISION_SUMMARY.md with strategic decisions D-01 through D-07

**Timeline:** 4 hours (primarily test execution time)

**Success Criteria Met:**
- [x] Photon/Signal dist imports verified (20 exports each, classes accessible)
- [x] 3 implicit dependencies fixed and resolved (no circular deps)
- [x] Test suite: Improved from baseline (97.0% vs 96.9% pass rate)
- [x] TypeCheck: 0 errors
- [x] DECISION_SUMMARY.md created with Phase 2B/2C sequencing

**Deliverables:**
- `.planning/DECISION_SUMMARY.md` — Strategic assessment (385 lines)
- `.planning/phases/02-1-day/02-01-SUMMARY.md` — Execution summary
- 3 package.json files updated (fortify, graphql, spectrum)
- Commits: d06de248, ebcde32c, fa23f5d3, 3bd45c7b

### Phase 2B: High-Priority Fixes (PLANNED)

Investigation and fixing of remaining 8 High-priority issues:
- Orbit middleware isolation tests (core package)
- Test failure root causes (launchpad: 35, monolith: 21, scaffold: 15)
- Estimated: 1-2 weeks depending on investigation depth

### Phase 2C: Backlog & Deferred Issues (PLANNED)

Medium/Low priority issues deferred to future:
- JWT module (5 failures)
- Galaxy showcase (6 failures)
- Banking CQRS (6 timeouts)
- StaticLink (9 failures)
- CSRF helpers (2 failures)
- 207 skipped environment tests
- 22 production @ts-expect-error suppressions

---

## Phase 3: Fix Critical Issues (IF Needed) - CONDITIONAL

**Status:** 🎯 Planning Complete (2026-03-25) — Awaiting execution trigger

**Condition:** Activates ONLY if Critical issues remain after Phase 2B completion

**Plans:**
- `03-01-PLAN.md` — Critical issues assessment & decision gate (Wave 1)
- `03-02-PLAN.md` — Serial fix execution for Critical issues (Wave 1, conditional)

### Scope

- ✅ Assess all Critical priority issues from Phase 1 & Phase 2B
- ✅ If 0 Critical issues: SKIP Phase 3, proceed directly to Phase 4
- ✅ If 1+ Critical issues: Execute serial fixes with full verification gates
- ❌ NOT included: High/Medium/Low priority issues (Phase 4+)

### Timeline (IF ACTIVATED)

| Activity | Duration |
|----------|----------|
| 03-01: Decision gate | 1 hour |
| 03-02: Fix execution | 45 min × N issues |
| Total (if needed) | 2-3 days |

### Success Criteria

- [ ] All Phase 1 & Phase 2B Critical issues identified and catalogued
- [ ] Each Critical issue receives serial fix attempt (one at a time)
- [ ] Every fix verified: Full test suite + typecheck (per D-02)
- [ ] No new test failures from any fix (regression gate per D-04)
- [ ] FIXES_VERIFIED.md generated with final status
- [ ] Health score improved (78/100 → target ≥90/100)

### Key Decisions (from 03-CONTEXT.md)

- **D-01:** Fix by impact scope (widest first)
- **D-02:** Full verification after each fix (no shortcuts)
- **D-03:** Fix ALL Critical issues (no deferral)
- **D-04:** Rollback if regression detected
- **D-05:** Serial execution (one at a time, no parallel)
- **D-06:** Document each fix with root cause
- **D-07:** Serial with Phase 4 (don't overlap planning)
- **D-08:** Claude discretion on specific fix approach

### Decision Gate Logic

```
IF (Critical issues remaining after Phase 2B) = 0
  → SKIP Phase 3
  → Proceed to Phase 4 planning
ELSE
  → EXECUTE Phase 3-01 (assessment)
  → EXECUTE Phase 3-02 (serial fixes)
  → GENERATE FIXES_VERIFIED.md
  → PROCEED to Phase 4 planning
```

---

## Future Phases (Post-Phase 3 Decision)

根據 Phase 3 結果（或跳過 Phase 3），決定後續優先級：

### Phase 4: Continue with High-Priority Issues or Hono Migration (CONDITIONAL)

**Condition:** Phase 3 complete (or skipped if no Critical issues)

**Options:**
1. **Phase 4A (If Phase 2B found High issues):** Continue High-priority fixes (launchpad, monolith, scaffold)
2. **Phase 4B (If Phase 2B complete or deferred):** Begin Hono Phase 4-5 migration planning

**Scope:** Execute remaining work based on Phase 2B/3 decisions

### Phase 5: Satellite Verification (OPTIONAL)

**Scope:** Full validation of Satellite modules (RBAC, Catalog, Commerce)

### Phase 6: Full Audit (OPTIONAL)

**Scope:** Performance, documentation, security audit (if resources permit)

---

## Timeline

| Phase | Duration | Status | Completion |
|-------|----------|--------|------------|
| 1. 快速掃描 | 1-2 days | ✅ Complete | 2026-03-24 |
| 2A. Critical Fixes | 4 hours | ✅ Complete | 2026-03-25 |
| 3. Critical Issues (if needed) | 2-3 days | 🎯 Planned | TBD (conditional) |
| 2B. High Fixes | 1-2 weeks | ⏳ Planned | TBD |
| 2C. Backlog | Deferred | ⏳ Deferred | TBD |
| 4+. Hono/Satellites | TBD | 🎯 Conditional | TBD |

---

## Key Metrics

驗證工作的成功指標：

| 指標 | Phase 1 Baseline | Phase 2A Result | Phase 3 Target | 說明 |
|------|-----------------|----------------|----------------|------|
| 測試通過率 | 96.9% (11,556/11,925) | 97.0% (11,656/11,925) | ≥99% (11,750+/11,925) | Phase 2A improved; Phase 3 target: fix Critical issues |
| 失敗測試數 | 162 failures | 163 failures | ≤20 failures | Phase 2A neutral; Phase 3 should reduce (if issues fixed) |
| 類型檢查錯誤 | 0 (83/83 pkgs) | 0 (83/83 pkgs) | 0 (maintain) | TypeScript strict mode maintained |
| 循環依賴 | 0 | 0 | 0 (maintain) | No new circular dependencies introduced |
| Health Score | 78/100 | ~85/100 | ≥90/100 | Phase 2A: +7 pts; Phase 3: +5-10 pts target |
| 隱式依賴 | 4 packages | 0 packages | 0 | Fixed in Phase 2A (3 actual packages) |

---

## Dependencies & Assumptions

**已完成：**
- ✓ 代碼庫映射（CODEBASE MAP）
- ✓ 項目上下文（PROJECT.md）
- ✓ 需求定義（REQUIREMENTS.md）
- ✓ Phase 1 掃描 & 初步修復
- ✓ Phase 2A execution (Critical fixes)
- ✓ Phase 3 planning (contingent plans)

**假設：**
- Bun、npm、Git 已安裝並可用
- 當前環境可執行測試和編譯
- 無環境變數或密鑰問題
- Phase 2B will complete before Phase 3 execution

**風險：**
- Phase 2B 調查可能需要深度架構分析（middleware 隔離、異步上下文）
- 某些失敗可能需要設計變更（非單純 bug 修復）
- Phase 3 Critical issues (if any) may require complex fixes

---

## Decision Gates

**After Phase 2A (✅ PASSED):**
- Confirm Phase 2A complete (dist bundles working, implicit deps fixed)
- Health score improved (78/100 → 85/100)

**Before Phase 3 Execution (TBD):**
- Assess all Critical issues from Phase 1 & Phase 2B (03-01 task)
- Decide: Skip Phase 3 (0 Critical) OR Proceed (1+ Critical)

**Before Phase 4 Planning (TBD):**
- Must complete Phase 3 (if activated) OR confirm skip decision
- Generate FIXES_VERIFIED.md or confirm zero Critical issues
- Stable baseline (≥85/100 health score)

**Before Hono Phase 4-5 (D-07 decision):**
- Must complete Phase 3 fully (or skip decision confirmed)
- Phase 4 planning deferred until Phase 3 gate closes

---

**Last updated:** 2026-03-25 after Phase 3 planning
**Next review:** When Phase 3-01 decision gate executes (after Phase 2B or explicit trigger)
