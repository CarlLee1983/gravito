# Roadmap: Gravito-Core 健全性驗證

**Project:** Gravito-Core 健全性驗證 (Phase 1: 快速掃描)
**Core Value:** 確保 gravito-core 框架的核心穩定性
**Created:** 2026-03-24
**Status:** Active

## Overview

驗證 gravito-core 60 個包的健全性。快速掃描建立基線，為後續決策（Hono Phase 4-5、修復優先級）奠定基礎。

```
[Phase 1: 快速掃描] → [Phase 2: 結果評估] → [Decision Point]
                                            ├─→ Phase 2B: 修復 High Issues
                                            ├─→ Phase 2C: 後續規劃
                                            └─→ Phase 3+: Hono 遷移 / 衛星驗證
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

### Phase 2A: Critical Fixes & Implicit Dependencies (IN PROGRESS)

**Plan:** `.planning/phases/02-1-day/02-PLAN.md`

**Scope:**
- Verify photon/signal dist bundles fixed (commit e3a182f6)
- Fix 4 implicit atlas dependencies (fortify, graphql, pulse, spectrum)
- Re-run full test suite + typecheck verification
- Create DECISION_SUMMARY.md with strategic assessment

**Timeline:** 1-2 hours (automation + verification)

**Success Criteria:**
- [ ] Photon/Signal dist imports verified (all exports accessible)
- [ ] 4 implicit dependencies fixed and resolved
- [ ] Test suite: No new failures introduced
- [ ] TypeCheck: 0 errors
- [ ] DECISION_SUMMARY.md created with Phase 2B/2C sequencing

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

## Future Phases (Post-Phase 2 Decision)

根據 Phase 2 結果，決定後續優先級：

### Phase 3: Continue Hono Migration Phase 4-5 (CONDITIONAL)

**Condition:** Phase 2B complete and test baseline ≥90/100 health score

**Scope:** Execute remaining Hono Phase 4-5 dependency removal (if Phase 2B succeeds)

### Phase 4: Satellite Verification (OPTIONAL)

**Scope:** Full validation of Satellite modules (RBAC, Catalog, Commerce)

### Phase 5: Full Audit (OPTIONAL)

**Scope:** Performance, documentation, security audit (if resources permit)

---

## Timeline

| Phase | Duration | Status | Completion |
|-------|----------|--------|------------|
| 1. 快速掃描 | 1-2 days | ✅ Complete | 2026-03-24 |
| 2A. Critical Fixes | 1-2 hours | 🔄 In Progress | TBD |
| 2B. High Fixes | 1-2 weeks | ⏳ Planned | TBD |
| 2C. Backlog | Deferred | ⏳ Deferred | TBD |
| 3+. Hono/Satellites | TBD | 🎯 Conditional | TBD |

---

## Key Metrics

驗證工作的成功指標：

| 指標 | Phase 1 Baseline | Phase 2 Target | 說明 |
|------|-----------------|----------------|------|
| 測試通過率 | 96.9% (11,556/11,925) | ≥99% (11,750+/11,925) | Phase 2A: 162 failures → 50 failures → Phase 2B: ≤20 (env-only) |
| 類型檢查錯誤 | 0 (83/83 pkgs) | 0 (maintain) | TypeScript strict mode maintained |
| 循環依賴 | 0 | 0 (maintain) | No new circular dependencies |
| Health Score | 78/100 | ≥90/100 | Incremental improvement per phase |
| 隱式依賴 | 4 | 0 | Fixed in Phase 2A |

---

## Dependencies & Assumptions

**已完成：**
- ✓ 代碼庫映射（CODEBASE MAP）
- ✓ 項目上下文（PROJECT.md）
- ✓ 需求定義（REQUIREMENTS.md）
- ✓ Phase 1 掃描 & 初步修復

**假設：**
- Bun、npm、Git 已安裝並可用
- 當前環境可執行測試和編譯
- 無環境變數或密鑰問題

**風險：**
- Phase 2B 調查可能需要深度架構分析（middleware 隔離、異步上下文）
- 某些失敗可能需要設計變更（非單純 bug 修復）

---

## Decision Gates

**Before Phase 2B:** Confirm Phase 2A complete (dist bundles working, implicit deps fixed)

**Before Phase 3:** Confirm Phase 2B complete (health score ≥90/100) OR explicit decision to defer High issues

**Before Hono Phase 4-5:** Must complete Phase 2A + Phase 2B (stable baseline required)

---

**Last updated:** 2026-03-24 after Phase 2 planning
**Next review:** After Phase 2A execution completion
