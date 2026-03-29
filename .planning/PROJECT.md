# Gravito-Core Framework

## What This Is

Gravito 是一個模組化、高效能的 TypeScript 框架，基於 Galaxy Architecture 建構。包含 PlanetCore 微核心、50+ Orbit 基礎設施包、15 個 Satellite 業務領域外掛。目標是為 Bun runtime 上的 TypeScript 應用提供 production-ready 的全棧解決方案。

## Core Value

**穩定可靠的核心基礎設施** — core 及所有 Orbit 包必須具備 production-ready 的錯誤處理、韌性機制和一致的 API 行為，讓下游 Satellite 和應用能安心依賴。

## Current Milestone: v2.0.0 Core & Orbit Resilience

**Goal:** 建立統一的錯誤處理模型與韌性機制，讓 core 及全部 Orbit 包達到 production-ready 成熟度

**Target features:**
- 統一錯誤模型 — 一致的錯誤類型、錯誤碼、錯誤傳播機制（跨所有 Orbit 包）
- Graceful Degradation — Orbit 包失敗時系統優雅降級，不崩潰
- Retry + Circuit Breaker — 外部依賴（DB、Redis、HTTP）的重試、斷路器、超時機制
- 全量 Orbit 包改造 — core + ~50 個 Orbit 包統一採用新錯誤模型

## Requirements

### Validated

- ✓ **Framework Health Stabilization** (v1.3.10) — Health score 78→93, test failures 162→41, Hono fully removed
- ✓ **JSDoc Coverage** (v1.4.0) — Core 100%, Signal 100%, quality 98.8/100
- ✓ **Hono Dependency Removal** (v1.5.0) — JWT native, type system unified, 3000+ tests passing
- ✓ **Satellite Verification** (v1.5.1) — RBAC/Catalog/Commerce all 100% pass, integration verified

### Active

(None — all v2.0.0 requirements validated)

### Validated in v2.0.0

- ✓ **統一錯誤模型** — GravitoException 三層階層 + ErrorCodes 命名空間 + contract tests（Phase 16-19）
- ✓ **Graceful Degradation** — OrbitDegradationManager + DegradedResult<T> typed fallback（Phase 20）
- ✓ **Retry + Circuit Breaker** — withRetry + withResilience + cockatiel CB（Phase 17-18）
- ✓ **全量 Orbit 包改造** — 38 packages 遷移至 GravitoException，health check 註冊完成（Phase 19-20）

### Out of Scope

- 性能優化 — 留給後續 milestone（v1.5.2 optimization roadmap 已規劃）
- Obsidian 文檔庫 — 文檔工作暫緩，優先處理核心穩定性
- Satellite 業務邏輯改造 — 本次僅改造 Orbit 層，Satellite 層後續跟進
- UI/前端改造 — 不涉及前端包

## Context

**Brownfield 環境：** gravito-core 已運作多年，66 個核心包 + 15 個衛星模組。

**當前狀態：**
- Framework health: 100/100
- Test pass rate: 99.7%+, 3000+ tests
- TypeScript strict mode, 0 errors
- 已有 @gravito/resilience 包（可能包含部分基礎）
- Phase 16 完成 — 統一錯誤模型基礎已建立（GravitoException 三層階層 + 4 Orbit ErrorCodes + 52 contract tests）
- Phase 17 完成 — 韌性基礎設施已建立（withRetry + CB 整合 + withResilience 組合 API，cockatiel 為底層實作）
- Phase 18 完成 — 四大 Orbit 包（atlas, plasma, photon, signal）全面採用統一錯誤模型 + 韌性原語 + shutdown handler
- Phase 19 完成 — 全部剩餘 Orbit 包（~40 個）遷移至 GravitoException 階層，健康檢查註冊完成，stream/beam shutdown handler 已連線
- Phase 20 完成 — OrbitDegradationManager + Satellite contract tests + 38 packages version bump + migration guide

**v2.0.0 決策：**
- 允許 breaking changes — 重新設計錯誤處理
- Major version bump 明確標示不向後相容
- 涵蓋 core + 全部 Orbit 包

## Constraints

- **Breaking Changes**：v2.0.0 允許 breaking，但需提供遷移指南
- **TypeScript Strict**：維持 noUnusedLocals/Parameters，零 as any
- **測試覆蓋**：新錯誤模型需 80%+ 測試覆蓋率
- **Satellite 隔離**：不直接修改 Satellite，Satellite 透過事件機制自然受益
- **Runtime**：Bun 為主要目標 runtime

## Key Decisions

| 決策 | 理由 | 結果 |
|------|------|------|
| v2.0.0 major version | 錯誤模型重新設計需要 breaking changes | ✓ 已確認 |
| 全量 Orbit 包改造 | 局部改造會導致不一致，全量確保品質統一 | ✓ 已確認 |
| 錯誤處理為最高優先 | Production 穩定性是下游所有功能的基礎 | ✓ 已確認 |
| 統一錯誤模型先行 | 先建立標準，再逐步改造各包 | ✓ Phase 16 完成 |

---

## Milestone: v1.3.10 (COMPLETE)

**Status:** ✅ **COMPLETE** — 2026-03-26
**Duration:** 3 days (2026-03-24 to 2026-03-26)
**Phases:** 6 + 4B sub-phases (10 phases total, all complete)

### Achievements

**Health Stabilization:**
- Phase 1: Baseline audit → 78/100 (identified 17 issues: 2 critical, 9 high, 2 medium, 4 low)
- Phase 2A-C: Critical & high-priority fixes → 90/100 (implicit deps fixed, test failures reduced from 162→43)
- Phase 4A: Intermittent test elimination → 93/100 (3x stable runs, variance ±1, 99.7% pass rate)

**Hono Migration (Phases 4B-1 through 4B-6):**
- Phase 4B-1: Easy compat shims (http-exception, routers, logger, websocket)
- Phase 4B-2: JWT native implementation (jose library)
- Phase 4B-3: External package cleanup (mass, beam, zenith)
- Phase 4B-4: Platform adapters deprecation (cloudflare, deno, vercel)
- Phase 4B-5: RPC client strategy (hono/client type-only)
- Phase 4B-6: OpenAPI scoping & final cleanup (removed bun.ts, scoped @hono/zod-openapi)
- **Result:** Hono fully removed from dependencies; backwards compatibility maintained

**Satellite Verification (Phase 5):**
- RBAC: 110/110 tests PASS ✅
- Catalog: 183/183 tests PASS ✅
- Commerce: 71/71 tests PASS ✅

**Full Framework Audit (Phase 6):**
- Performance: ✅ HTTP p99=72.6μs, 67k req/s throughput, 55.66MB memory
- Documentation: ⚠️ JSDoc 38% (Core 27%, Signal 60%, Photon 100%)
- Security: ✅ 0 production vulnerabilities, 0 hardcoded secrets

### Final Metrics

| Metric | Baseline | Final | Status |
|--------|----------|-------|--------|
| Health Score | 78/100 | 93/100 | ✅ +15 improvement |
| Test Pass Rate | 96.9% | 99.7% | ✅ Stable |
| Failed Tests | 162 | 40–41 | ✅ 75% reduction |
| TypeScript Errors | 0 | 0 | ✅ Maintained |
| Circular Dependencies | 0 | 0 | ✅ Maintained |
| Hono References | 12 compat shims + 3 external | 0 | ✅ Complete removal |

### Archived Files

- [`v1.3.10-ROADMAP.md`](./milestones/v1.3.10-ROADMAP.md) — Full phase details (835+ lines)
- [`v1.3.10-REQUIREMENTS.md`](./milestones/v1.3.10-REQUIREMENTS.md) — Requirements & outcomes

---

## Milestone: v1.4.0 (COMPLETE)

**Status:** ✅ **COMPLETE** — 2026-03-27
**Duration:** 4 hours (planned: 1 week, actual: accelerated 6x)
**Focus:** JSDoc Coverage Enhancement

### Achievements

**Primary Goal:** Improve JSDoc documentation coverage in Core + Signal packages

| Package | Baseline | Target | Final | Status |
|---------|----------|--------|-------|--------|
| **Core** | 27% | 90%+ | 100% | ✅ +73 pp |
| **Signal** | 60% | 90%+ | 100% | ✅ +40 pp |
| **Photon** | 100% | 100% | 100% | ✅ Benchmark |

### Execution Results

- **Phase 1** (1.5 hours): Core package JSDoc coverage (27% → 100%, 59/59 exports)
- **Phase 2** (2.5 hours): Signal package JSDoc coverage (60% → 100%, 23/23 exports)
- **Phase 3** (1 hour): Verification & quality audit (✅ All checks passed)

### Key Metrics

| Metric | Baseline | Final | Status |
|--------|----------|-------|--------|
| Health Score | 93/100 | 100/100 | ✅ +7 improvement |
| JSDoc Coverage | 40% | 100% | ✅ +60 pp |
| Quality Score | N/A | 98.8/100 | ✅ Exceeds Photon |
| Test Pass Rate | 99.7% | 99.7% | ✅ Maintained |
| TypeScript Errors | 0 | 0 | ✅ Maintained |

### Documents

- **Roadmap Archive:** `.planning/milestones/v1.4.0-ROADMAP.md`
- **Requirements Archive:** `.planning/milestones/v1.4.0-REQUIREMENTS.md`

### Why This Focus (from v1.3.10 audit)

✅ **Highest impact improvement** for developer experience
✅ **Clear measurement criteria** (JSDoc coverage tool)
✅ **No framework changes** (documentation-only)
✅ **Unblocks next priorities:** Obsidian vault, API reference generation

### Deferred to v1.5.0
- Security pattern documentation (Priority 2 from v1.3.10)
- Obsidian vault setup
- Example improvements
- API reference generation
- Bundle optimization (Optional)

---

## Milestone: v1.5.0 (COMPLETE)

**Status:** ✅ **COMPLETE** — 2026-03-27
**Duration:** 1 day (2026-03-27, accelerated 13 days early!)
**Focus:** Hono Dependency Removal & Type System Enhancement

### Achievements

**All 5 Phases Completed Successfully**

| Phase | Focus | Status |
|-------|-------|--------|
| **1** | JWT Native Implementation (jose) | ✅ Complete — 42 tests, 100% API compat |
| **2** | External Type Cleanup (mass/beam/zenith) | ✅ Complete — 639 tests pass, 0 regressions |
| **3** | Platform Adapters Audit | ✅ Complete — 3 adapters retained, v3.0 removal planned |
| **4** | RPC Client Strategy | ✅ Complete — hono/client confirmed optional peerDep |
| **5** | OpenAPI Cleanup | ✅ Complete — @hono/zod-openapi removed |

### Final Quality Metrics

| Metric | Baseline | Final | Status |
|--------|----------|-------|--------|
| **TypeScript Errors** | 0 | 0 | ✅ Maintained |
| **Test Pass Rate** | 99.7% | 99.9%+ | ✅ Improved |
| **Health Score** | 100/100 | 100/100 | ✅ Maintained |
| **Circular Dependencies** | 0 | 0 | ✅ Maintained |
| **Breaking Changes** | 0 | 0 | ✅ Zero impact |
| **Regressions** | 0 | 0 | ✅ Zero impact |

### Key Deliverables

✅ 5 phase execution reports
✅ JWT native implementation (42 comprehensive tests)
✅ Type system unification (GravitoContext)
✅ Platform adapters retention strategy
✅ RPC client strategy (type-only optional peerDep)
✅ OpenAPI cleanup documentation
✅ 3000+ tests passing with 100/100 health

### Documents

- **Completion Status:** `.planning/STATE-v1.5.0.md`
- **Requirements:** `.planning/REQUIREMENTS-v1.5.0.md`
- **Roadmap:** `.planning/ROADMAP-v1.5.0.md`

---

## Milestone: v1.5.1 (COMPLETE)

**Status:** ✅ **COMPLETE** — 2026-03-27
**Duration:** 1 day (2026-03-27, expedited 1–3 weeks early!)
**Focus:** Satellite Verification & Optimization

### Achievements

**All 4 Audit Dimensions Complete (3 modules):**
- ✅ **RBAC:** 110 tests (100% pass), 4 audits complete, 2 optimizations implemented
- ✅ **Catalog:** 191 tests (100% pass), 4 audits complete, performance baselines established
- ✅ **Commerce:** 71 tests (100% pass), 4 audits complete, transaction safety verified

**Framework-Level Gates (ALL PASSED):**
- ✅ TypeScript strict: 0 errors (83 successful tasks)
- ✅ Build: 59/59 packages successful
- ✅ Health score: 100/100 (vs. target ≥93/100)
- ✅ Circular dependencies: 0
- ✅ Breaking changes: 0 (100% backwards compatible)
- ✅ Regressions: 0 (zero deviations from v1.5.0)

**Integration Verification (ALL PASSED):**
- ✅ RBAC ↔ Catalog: Product access control verified
- ✅ Catalog ↔ Commerce: Order creation & pricing verified
- ✅ Commerce ↔ RBAC: Permission enforcement verified

**Final Metrics:**
- ✅ Satellite tests: 372/372 pass (110+191+71)
- ✅ Framework tests: 3000+ pass (≥99.6%)
- ✅ Security audit: 0 critical issues
- ✅ Performance baselines: Established for all modules
- ✅ Optimization roadmap: 20+ opportunities identified and prioritized

### Deliverables

- ✅ Integration Report (60+ lines)
- ✅ Optimization Roadmap (466+ lines, v1.5.2+)
- ✅ Milestone Completion Summary (250+ lines)
- ✅ Dependency check script
- ✅ Integration test suite
- ✅ Health check script
- ✅ PROJECT.md updated (this milestone)

### Key Metrics

| Metric | v1.5.0 | v1.5.1 | Status |
|--------|--------|--------|--------|
| **TypeScript Errors** | 0 | 0 | ✅ Maintained |
| **Test Pass Rate** | 99.9%+ | 100% | ✅ Improved |
| **Health Score** | 100/100 | 100/100 | ✅ Maintained |
| **Circular Deps** | 0 | 0 | ✅ Maintained |
| **Build Success** | 59/59 | 59/59 | ✅ Maintained |
| **Satellite Tests** | 364 | 372 | ✅ Improved (+8) |

### Production Readiness

🟢 **v1.5.1 is PRODUCTION READY**

- ✅ All success criteria met
- ✅ Zero critical issues
- ✅ Zero breaking changes
- ✅ Zero regressions
- ✅ Full backwards compatibility
- ✅ Ready for immediate deployment

### Next Milestone: v1.5.2

**Focus:** Strategic optimizations (20+ hours, +50-150% performance)
- RBAC: Permission caching (+200-300%)
- Catalog: Product query caching (+400%)
- Commerce: Order state optimization (+30-40%)
- Cross-module: Event bus optimization (+400%)

**Roadmap:** See `.planning/phases/15-v1.5.1-phase-4-integration/reports/Optimization-Roadmap.md`

### Documents

- **Integration Report:** `.planning/phases/15-v1.5.1-phase-4-integration/reports/Integration-Report.md`
- **Optimization Roadmap:** `.planning/phases/15-v1.5.1-phase-4-integration/reports/Optimization-Roadmap.md`
- **Milestone Summary:** `.planning/phases/15-v1.5.1-phase-4-integration/reports/Milestone-Completion-Summary.md`
- **Requirements:** `.planning/REQUIREMENTS-v1.5.1.md`
- **Roadmap:** `.planning/ROADMAP-v1.5.1.md`
- **State:** `.planning/STATE-v1.5.1.md`

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-29 after Phase 20 (Integration Verification & Graceful Degradation) complete — v2.0.0 milestone fully delivered*
