---
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

**Plan:** `.planning/phases/02-1-day/02-01-PLAN.md`

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

### Phase 2B: High-Priority Fixes (✅ COMPLETE)

**Plan:** `.planning/phases/02-1-day/02-02-PLAN.md`

**Completion Date:** 2026-03-25

**Scope Completed:**
- ✅ Investigated orbit middleware isolation skipped tests (documented as known limitation)
- ✅ Investigated luminosity SEO route scanners (test infrastructure root cause identified)
- ✅ Investigated luminosity logging infrastructure (file operations root cause identified)
- ✅ Investigated scaffold code generators (path resolution root cause identified)
- ✅ Created comprehensive investigation reports (02-02-INVESTIGATIONS.md)
- ✅ Made strategic decision to defer implementation to Phase 2C (per D-07)

**Key Finding:** Phase 1 assessment contained package misidentification errors. Actual failures in luminosity (not launchpad/monolith). Most failures are TEST INFRASTRUCTURE issues, not production bugs.

**Health Score:** Phase 2B achieved ~88/100 (+3 from Phase 2A baseline of 85/100)

**Timeline:** ~3 hours (investigation and documentation)

**Success Criteria Met:**
- [x] All 8 high-priority issues investigated
- [x] Root causes documented for all issues
- [x] Test infrastructure patterns identified
- [x] Phase 2C backlog prepared with clear fix approaches
- [x] Strategic decision made (investigate-first approach for code quality)

**Deliverables:**
- `.planning/phases/02-1-day/02-02-INVESTIGATIONS.md` — Root cause analysis for all 4 packages
- `.planning/phases/02-1-day/02-02-SUMMARY.md` — Execution summary
- Commit: 6c397e44 (document Orbit middleware isolation known limitation)

### Phase 2C: Fix Medium/Low Priority Issues (✅ COMPLETE)

**Plan:** `.planning/phases/02-1-day/02-03-PLAN.md`

**Completion Date:** 2026-03-26

**Scope Completed:**
- ✅ Luminosity SEO/logging/scaffold tests: Already fixed between Phase 2B and 2C
- ✅ Banking CQRS DB contamination: Fixed with CREATE TABLE IF NOT EXISTS in beforeEach
- ✅ Flash-sale tests: Migrated 14 files from vitest to bun:test
- ✅ Atlas adaptive pool: Added Postgres availability guard
- ✅ StaticLink: Rewrote to bun:test with DOM guard

**Health Score:** Phase 2C achieved ~90/100 (+2 from Phase 2B baseline of 88/100)

**Remaining:** 43 intermittent concurrency-related failures (all pass in isolation)

**Commits:** e127bf00, dd668d8a, e13045da, cfb47e8d

---

## Phase 3: Fix Critical Issues (IF Needed) - CONDITIONAL

**Status:** ✅ SKIPPED (per 03-01-SUMMARY.md — 0 Critical issues remaining)

**Result from Phase 2B:** ✅ NO CRITICAL ISSUES FOUND — Phase 3 SKIPPED

**Decision Made:** SKIP PHASE 3 ✅ (per 03-01-SUMMARY.md)

---

## Phase 4A: Eliminate Intermittent Test Failures (PLANNING)

**Goal:** Eliminate remaining 43 intermittent concurrency-related test failures, achieving stable test suite

**Plans:** 3 plans

Plans:
- [ ] 04-01-PLAN.md — JWT/CSRF/MongoGrammar concurrency isolation fixes
- [ ] 04-02-PLAN.md — Banking DB isolation, WebhookPlugin fetch mock, flash-sale timing
- [ ] 04-03-PLAN.md — Full verification (3x consecutive runs) and health score assessment

**Scope:**
- Fix concurrency-related test failures (JWT, CSRF, MongoGrammar, Banking CQRS, WebhookPlugin)
- Calibrate CI-sensitive timing assertions (flash-sale backpressure)
- Fix module resolution error (workflow-demo)
- Verify stability with 3 consecutive full suite runs
- Update STATE.md and ROADMAP.md with completion

**Success Criteria:**
- [ ] Test failures reduced from 41+18 to <20
- [ ] 3 consecutive full suite runs show stable results
- [ ] Health score >= 90/100 maintained
- [ ] TypeCheck: 0 errors
- [ ] No test assertions modified (only isolation/infrastructure fixes)

### Phase 4B: Hono Migration (PENDING)

**Condition:** Phase 4A complete

**Scope:** Begin Hono Phase 4-5 migration planning

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
| 2B. High Fixes Investigation | ~3 hours | ✅ Complete | 2026-03-25 |
| 3. Critical Issues (if needed) | 2-3 days | ✅ SKIPPED | 2026-03-25 |
| 2C. Medium/Low Fixes | ~4 hours | ✅ Complete | 2026-03-26 |
| 4A. Intermittent Test Fixes | Est. 1-2 days | 🎯 Planning | TBD |
| 4B. Hono Migration | TBD | ⏳ Pending | TBD |

---

## Key Metrics

驗證工作的成功指標：

| 指標 | Phase 1 | Phase 2A | Phase 2B | Phase 2C | Phase 4A Target |
|------|---------|----------|----------|----------|-----------------|
| 測試通過率 | 96.9% | 97.0% | ~97.0% | 97.8% | ≥99% |
| 失敗測試數 | 162 | 163 | ~163 | 43 | ≤20 |
| 類型檢查錯誤 | 0 | 0 | 0 | 0 | 0 |
| 循環依賴 | 0 | 0 | 0 | 0 | 0 |
| Health Score | 78/100 | 85/100 | 88/100 | 90/100 | ≥90/100 |
| 隱式依賴 | 4 | 0 | 0 | 0 | 0 |

---

## Dependencies & Assumptions

**已完成：**
- ✓ 代碼庫映射（CODEBASE MAP）
- ✓ 項目上下文（PROJECT.md）
- ✓ 需求定義（REQUIREMENTS.md）
- ✓ Phase 1 掃描 & 初步修復
- ✓ Phase 2A execution (Critical fixes)
- ✓ Phase 2B execution (High priority investigations)
- ✓ Phase 3 decision gate (SKIP decision made)
- ✓ Phase 2C execution (Medium/Low fixes)
- ✓ Phase 4A planning (3 plans created)

**假設：**
- Bun、npm、Git 已安裝並可用
- 當前環境可執行測試和編譯
- 無環境變數或密鑰問題

**風險：**
- Some concurrency failures may require deeper bun:test configuration changes
- Remaining intermittent failures may not all be fixable without serial test execution

---

## Decision Gates

**After Phase 2A (✅ PASSED):**
- Confirm Phase 2A complete (dist bundles working, implicit deps fixed)
- Health score improved (78/100 → 85/100)

**After Phase 2B (✅ PASSED):**
- Completed high-priority issue investigations
- Identified root causes for all 8 issues
- Prepared Phase 2C backlog with clear fix approaches

**Before Phase 3 Execution (✅ DECISION MADE: SKIP):**
- Assess all Critical issues from Phase 1 & Phase 2B — Result: 0 Critical issues
- Decision: Skip Phase 3 ✅

**After Phase 2C (✅ PASSED):**
- Health score: 90/100 achieved
- 43 intermittent failures documented as concurrency artifacts
- Framework stable for Phase 4A remediation

**After Phase 4A (PENDING):**
- Verify 3 consecutive stable test runs
- Health score >= 90/100 maintained
- Framework ready for Phase 4B Hono migration

---

**Last updated:** 2026-03-26 after Phase 4A planning
**Next review:** When Phase 4A execution completes
